// 시뮬레이션 코어: planYear / tick / fire / endYear, 이벤트 큐, 초점, 스탯 수렴, pending 결정, HOOK.
// UI 없음. createSim() 이 돌려주는 sim 객체가 콘텐츠 콜백의 ctx 다.
//
// HOOK 인터페이스(전부 no-op 기본):
//   log(entry, sim)       기록 한 줄이 추가될 때 (entry = {a, y, t, k, f?, fx?})
//   change(S, sim)        스탯·돈·상태가 바뀌었을 때(렌더 힌트)
//   decision(pending,sim) 결정 모달을 열어야 할 때 (pending = {id, p, view})
//   death(S, sim)         사망 직후
//   year(S, sim)          연말 정산이 끝나고 다음 해 큐가 짜인 뒤(저장 타이밍)
import { makeRng, clamp } from './rng.js';
import { lifeTable, humanAge } from './lifetable.js';
import { rootOf, resolvePolicy } from './data.js';
import { newLife } from './birth.js';
import { createRegistry, chooseFeed, scheduledDecisions, dueBigEvents, tagsOf, tagsOk } from './content.js';
import { oriYear, campYear, jailYear, STAGE_HL } from './oripathy.js';
import { catYear, conflictYear, hazardYear } from './catastrophe.js';
import { financeYear, jobOffers, takeJob, medianLMD, initPartner } from './finance.js';
import { expHealth, deathCheck, die } from './death.js';
import { BALANCE as B } from './balance.js';
import { makeName, familyNames } from './names.js';
import { wa, ro, eul, iga } from './text.js';
// v1
import { infect, diagnose } from './oripathy.js';
import { capYear, applyLegacyFx, grade, capProfile, CAP_LABEL, CAP_KEYS, addCap } from './caps.js';
import { FOCUS, STAGE_FOCUS, focusDef, isTrackFocus, trackFocusKeys } from './focus.js';
export { FOCUS, STAGE_FOCUS, focusDef, isTrackFocus };
import { refreshRel } from './relations.js';
import { trackYear, trackOf, affOf, trackName, trackTitle, enterTrack, leaveTrack, promote, fall, switchTrack, retireTrack, applyExit, dreamYear } from './track.js';
import { migrateTo, resYear, fleeCheck, migrationSummary } from './migration.js';
import { initHousing, housingYear, setHousing } from './housing.js';
import { normalizeRhodes, joinRhodes, rhodesYear, rhodesCard, operatorProfile, clinical } from './rhodes.js';
import { installEngineDecisions, fillSubs } from './choices.js';
import { healStats, migrateSave } from './save.js';
export { healStats, migrateSave, grade, capProfile, operatorProfile, clinical, rhodesCard, trackName, migrationSummary };
export { dreamStatus, gateHint, koAge } from './track.js';   // W16(D56): 신원 카드 꿈 줄

// 올해의 초점 표(FOCUS·STAGE_FOCUS·진로 전용 초점)는 focus.js(W12 D53a). 연중 시간 비율(focusW)만큼 연말에 적용. 공통 초점의 역량 효과는 caps.js B.cap.focus(§6.2)
export const NOOP_HOOK = { log() {}, change() {}, decision() {}, death() {}, year() {} };

/** D31: 각주는 문장에 숫자(통계처럼 보이는 내용)가 있을 때만 남긴다. 내용 없는 각주("기록된 바 없음")와 관할·메타 각주는 항상 버린다 */
export function keepFootnote(text, f) {
  if (!f) return false;
  if (/기록된 바 없음|기록되지 않았|작성되지 않았|관할|추정|임시|창작/.test(f)) return false;
  return /\d/.test(text);
}

export function stageOf(sim) {
  const { S } = sim;
  if (S.prison) return 'camp';
  if (S.serving) return 'service';
  if (S.age < 6) return 'baby';
  if (S.school) return 'school';
  if (S.retired || humanAge(S.age, sim.race.lifeMul) >= 65) return 'elder';
  return 'adult';
}
/** 올해 고를 수 있는 초점. W12(D53a): 진로가 있으면(성인·노년 단계) 진로 전용 초점 2~3개가 뒤에 붙는다 */
export function focusOptions(sim) {
  const stage = stageOf(sim);
  const base = STAGE_FOCUS[stage];
  if (!sim.S || !sim.S.track || (stage !== 'adult' && stage !== 'elder')) return base;
  const extra = trackFocusKeys(trackOf(sim));
  return extra.length ? base.concat(extra) : base;
}

/**
 * createSim({ data, seed?, rng?, hooks?, content?, auto? })
 *  data    prepareData() 결과
 *  content createRegistry() 결과(없으면 빈 레지스트리)
 *  auto    true 면 ensureFocus 가 초점을 무작위로 돌린다(자동 시뮬용)
 */
export function createSim({ data, seed, rng, hooks, content, auto = false, terra = true }) {
  const sim = {
    data,
    terra,                       // false 면 테라 고유 위험(광석병·재앙·분쟁)을 끈다(생명표 보정 확인용)
    rng: rng || makeRng(seed),
    HOOK: { ...NOOP_HOOK, ...(hooks || {}) },
    content: content || createRegistry(),
    auto,
    S: null,
    get nation() { return data.nationById[sim.S.cur]; },
    get race() { return data.raceById[sim.S.race]; },
    get job() {
      const S = sim.S; if (!S.job) return null;
      const j = data.jobById[S.job]; if (j) return j;
      const t = trackOf(sim); if (!t) return null;
      // 진로 기반 가짜 job(구 콘텐츠 호환): jobs.json 필드 모양을 흉내 낸다
      const st = t.stages[Math.min(S.track.stage, t.stages.length - 1)];
      return { id: S.job, name: trackName(sim) || t.name, sector: t.archetype === 'A11' ? 'ser' : 'ser', edu: 0, urban: 0, oriMul: (st && st.oriMul != null ? st.oriMul : t.oriMul) ?? 1, risk: {}, req: [], special: !!t.special, lo: 0.2, hi: 0.8, only: null, age: t.entry.ages, track: t.id, stage: st ? st.id : null };
    },
    get policy() { const t = trackOf(sim); return (t && t.oriPolicyOverride) || resolvePolicy(sim.nation, sim.S); },
    // W14(D54): 징집 제도. nations.json conscriptUntil 이 있으면 그 해까지만(타라는 1098 독립 전까지 빅토리아 징집)
    get conscript() { const n = sim.nation; return n.conscriptUntil != null && sim.year > n.conscriptUntil ? 'none' : n.conscript; },
    get lt() { return lifeTable(sim.nation.stats, sim.S.sex, sim.race.lifeMul); },
    get year() { return sim.S.by + sim.S.age; },
    get med() { return medianLMD(sim); },
    // v1 ctx API(§2·§3): 현재 진로 데이터·소속·거주·관계 등급·로도스 상태
    get track() { return trackOf(sim); },
    get aff() { return affOf(sim); },
    get res() { return sim.S.res; },
    get rel() { return sim.S.rel; },
    get rhodes() { return sim.S.rhodes && sim.S.rhodes !== true ? sim.S.rhodes : null; },
    get stage() { const t = trackOf(sim); return t ? t.stages[Math.min(sim.S.track.stage, t.stages.length - 1)] : null; },
  };
  installEngineDecisions(sim.content, data);

  // ── 기록·효과 ──────────────────────────────────────────
  sim.log = (text, kind = 'ev', f, fx) => {
    const e = { a: sim.S.age, y: sim.year, t: text, k: kind };
    if (f && keepFootnote(text, f)) e.f = f;
    if (fx) e.fx = fx;
    sim.S.log.push(e);
    sim.HOOK.log(e, sim);
    return e;
  };
  /** 스탯 변화. hl/h 막대, money. 구 sm/so 와 cap{…}·standing 은 역량·지위로 흡수(§2) */
  sim.eff = (fx) => {
    const st = sim.S.st;
    for (const k of ['hl', 'h']) if (fx[k]) st[k] = clamp(st[k] + fx[k], 0, 100);
    if (fx.money) sim.S.money = Math.round(sim.S.money + fx.money);
    applyLegacyFx(sim.S, fx);
    sim.HOOK.change(sim.S, sim);
    return fx;
  };
  sim.logResult = (r, defKind = 'ev') => {
    if (!r) return;
    if (typeof r === 'string') return sim.log(r, defKind);
    if (r.fx) sim.eff(r.fx);
    if (r.t) return sim.log(r.t, r.k || defKind, r.f, r.fx);
  };
  sim.die = (causeId, label) => die(sim, causeId, label);
  sim.infect = (how) => infect(sim, how);
  sim.diagnose = (how) => diagnose(sim, how);   // W14: 진로 몰락 사유 infected 가 판정까지 낸다(B8)

  /** 이주 상태 기계(§7): migrate(reason, to?). reason = work|study|marriage|flee|asylum|exile|contract|caravan|rhodes|return|deport (구 expel·insurance_default·voluntary 도 받음) */
  sim.migrate = (reason, to, opts) => migrateTo(sim, reason === 'expel' || reason === 'insurance_default' ? reason : reason, to, opts);
  // 진로 헬퍼(콘텐츠용, §3): 승급·몰락·전직·진입·이탈·로도스 합류·주거 전환
  sim.promote = (opts) => promote(sim, opts);
  sim.fall = (cause) => fall(sim, cause);
  sim.applyExit = (value, cause) => applyExit(sim, value, cause);
  sim.switchTrack = (id, how) => switchTrack(sim, id, how);
  sim.enterTrack = (id, opts) => enterTrack(sim, id, opts);
  sim.leaveTrack = (how, opts) => leaveTrack(sim, how, opts);
  sim.retireTrack = (opts) => retireTrack(sim, opts);
  sim.joinRhodes = (via, opts) => joinRhodes(sim, via, opts);
  sim.setHousing = (typeId, opts) => { const t = (data.housing[sim.S.cur] || data.housing._default).types.find((x) => x.id === typeId); return t ? setHousing(sim, t, opts) : false; };
  sim.heal = () => healStats(sim.S);
  sim.load = (S) => {
    const m = migrateSave(S, data); if (!m) return null;
    sim.S = m;
    // 개편으로 삭제된 결정 창을 그대로 실행하면 apply가 없어 이어하기가 멈춘다.
    if (m.pending && !sim.content.decisions[m.pending.id]) m.pending = null;
    normalizeRhodes(sim); refreshRel(sim); return sim.S;
  };

  // ── 생애 시작 ──────────────────────────────────────────
  sim.newLife = (opts = {}) => { sim.S = newLife(data, sim.rng, { terra: sim.terra, ...opts }); refreshRel(sim); initHousing(sim); return sim.S; };
  sim.start = () => {
    const S = sim.S;
    if (S.phase !== 'birth') return S;
    S.phase = 'life';
    sim.log(S.by + '년, ' + sim.nation.name + '에서 태어났습니다.', 'big');
    if (S.ori.on) S.flags.bornInfected = true;
    sim.planYear();
    return S;
  };

  // ── 초점 ──────────────────────────────────────────────
  sim.ensureFocus = () => {
    const S = sim.S;
    const opts = focusOptions(sim);
    if (!opts.length) { S.focus = null; return; }
    if (!S.focus || !opts.includes(S.focus) || (sim.auto && sim.rng.chance(0.3))) {
      S.focus = sim.auto ? sim.rng.pick(opts) : opts[0];
    }
  };
  sim.setFocus = (k) => {
    if (!focusOptions(sim).includes(k)) return false;
    sim.S.focus = k; sim.S.flags.focusPicked = true;
    return true;
  };

  // ── 한 해 큐 ──────────────────────────────────────────
  sim.planYear = () => {
    const S = sim.S, rng = sim.rng;
    S.queue = []; S.fT = {};
    normalizeRhodes(sim);
    sim.ensureFocus();
    for (const b of dueBigEvents(sim)) S.queue.push({ at: ((b.month || 6) - 0.5) / 12, type: 'big', id: b.id, visit: b.nation && b.nation !== S.cur && b.nation !== S.root ? b.nation : undefined });   // W14: 방문국(순회형·기항지) 대사건은 visit 표시
    // 결정은 한 해 앞 2개. 엔진 내장 결정(installEngineDecisions 가 앞에 둔 것)은 순서대로 먼저, 나머지 콘텐츠 결정은 섞어서 고른다
    // (W11: 레지스트리 등록 순서가 곧 우선순위라 뒤에 등록된 국가 결정이 영영 밀리던 것을 막는다, W9f-6·W9g-5)
    const all = scheduledDecisions(sim);
    const builtin = sim.content.builtinIds || new Set();
    const first = all.filter((d) => builtin.has(d.id));
    const others = all.filter((d) => !builtin.has(d.id));
    for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(rng.rnd() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
    const decs = first.concat(others);
    decs.slice(0, 2).forEach((d, i) => S.queue.push({ at: d.at ?? (0.3 + i * 0.3 + rng.rnd() * 0.15), type: 'dec', id: d.id, p: {} }));
    const n = S.age < 6 ? 2 : 3;
    const used = new Set();
    const visit = S.res && S.res.itinerantAt && data.nationById[S.res.itinerantAt] ? S.res.itinerantAt : null;   // §7.4 순회형: 피드의 20% 는 방문국
    for (let i = 0; i < n; i++) {
      const v = visit && rng.chance(B.mig.visitShare) ? visit : null;
      const e = chooseFeed(sim, used, v);
      if (!e) break;
      used.add(e.id);
      S.queue.push({ at: 0.08 + (i + rng.rnd() * 0.8) / n * 0.86, type: 'ev', id: e.id, visit: v || undefined });
    }
    S.queue.sort((a, b) => a.at - b.at);
  };
  /** W11: 진로 진입 직후 남은 해에 피드 하나를 더 뽑는다(진입 해의 첫 해 진로 이벤트가 나오도록, W9a-5) */
  sim.requeueFeed = () => {
    const S = sim.S, rng = sim.rng;
    if (!S || S.phase !== 'life' || S.t >= 0.9) return false;
    const used = new Set(S.queue.filter((q) => q.type === 'ev').map((q) => q.id));
    for (const id of S.recent) used.add(id);
    const e = chooseFeed(sim, used, null);
    if (!e) return false;
    S.queue.push({ at: Math.min(0.97, S.t + 0.05 + rng.rnd() * (0.95 - S.t)), type: 'ev', id: e.id });
    S.queue.sort((a, b) => a.at - b.at);
    return true;
  };

  sim.fire = (e) => {
    const S = sim.S;
    if (e.type === 'ev') {
      const ev = sim.content.evById[e.id];
      if (!ev) return;
      if (ev.tags.length && !tagsOk(ev.tags, tagsOf(sim, e.visit || null))) return;   // W11: 같은 해 앞선 이벤트로 상태가 바뀌었으면 태그를 다시 본다
      if (ev.c && !ev.c(sim)) return;
      sim.logResult(ev.run(sim), 'ev');
      S.flags['ev_' + ev.id] = S.age;
      S.flags['evn_' + ev.id] = (S.flags['evn_' + ev.id] || 0) + 1;   // W14(A11): 생애 발화 횟수
      S.recent.push(ev.id);
      if (S.recent.length > 14) S.recent.shift();
    } else if (e.type === 'dec') {
      sim.openDecision(e.id, e.p || {});
    } else if (e.type === 'big') {
      const b = sim.content.bigById[e.id];
      if (!b) return;
      // 연초에 예약한 뒤 이주했을 수 있다. 현재 거주국·방문국 사건만 실행한다.
      if (b.nation && b.nation !== S.cur && b.nation !== S.root && b.nation !== S.res?.itinerantAt) return;
      sim.logResult(b.run(sim), 'big');
      S.flags['big_' + b.id] = S.age;
    }
  };

  /** 실시간 dt(초) 만큼 진행. 결정이 열리면 그 시점에서 멈춘다. */
  sim.tick = (dtSec) => {
    const S = sim.S;
    if (!S || S.phase !== 'life' || S.pending || S.paused) return;
    const t0 = S.t;
    const target = Math.min(1, S.t + dtSec * S.speed / S.yearSec);
    while (S.queue.length && S.queue[0].at <= target) {
      const e = S.queue.shift();
      S.t = Math.max(S.t, e.at);
      sim.fire(e);
      if (S.phase !== 'life') return;
      if (S.pending) { if (S.focus) S.fT[S.focus] = (S.fT[S.focus] || 0) + (S.t - t0); return; }
    }
    S.t = target;
    if (S.focus) S.fT[S.focus] = (S.fT[S.focus] || 0) + (S.t - t0);
    if (S.t >= 1) sim.endYear();
  };

  // ── 결정 ──────────────────────────────────────────────
  sim.openDecision = (id, p = {}) => {
    const S = sim.S;
    const d = sim.content.decisions[id];
    if (!d) return false;
    if (d.tags && d.tags.length && !tagsOk(d.tags, tagsOf(sim))) return false;   // W11: 큐에 들어간 뒤 진로·상태가 바뀌었으면 열지 않는다
    if (d.ok && !d.ok(sim, p)) return false;
    const view = d.build(sim, p);
    if (!view || !view.choices || !view.choices.length) return false;
    if (view.fact && !keepFootnote(view.body || '', view.fact)) delete view.fact;
    fillSubs(sim, id, view);   // W14(QA A9·D53c): sub 없는 선택지에 효과 한 줄(돈·역량·지위·위험)을 채운다
    S.pending = { id, p, view };
    S.stats.decisions++;
    sim.HOOK.decision(S.pending, sim);
    return true;
  };
  sim.choose = (k, text = '', auto = false) => {
    const S = sim.S;
    const pd = S.pending;
    if (!pd) return false;
    if (pd.view.choices.some((c) => c.k === k && c.disabled)) return false;
    const d = sim.content.decisions[pd.id];
    S.pending = null;
    S.done[pd.id] = (S.done[pd.id] || 0) + 1;
    S.flags['last_' + pd.id] = S.age;
    if (auto) S.stats.auto++;
    const ch = pd.view.choices.find((c) => c.k === k && !c.disabled) || pd.view.choices.find((c) => !c.disabled) || pd.view.choices[0];   // W16: 닫힌 문(disabled)은 고를 수 없다
    sim.log('결정: ' + ch.label, 'dec');
    sim.logResult(d.apply(sim, ch.k, pd.p, text), 'ev');
    sim.ensureFocus();
    sim.HOOK.change(S, sim);
    return true;
  };
  /** 자동 결정: 선택지 auto 가중치(기본 1)로 무작위 */
  sim.autoChoice = () => {
    const pd = sim.S.pending;
    if (!pd) return false;
    const k = sim.rng.wpick(pd.view.choices.map((c) => [c.k, c.disabled ? 0 : (c.auto ?? 1)]));
    return sim.choose(k, '', true);
  };

  // ── 연말 ──────────────────────────────────────────────
  sim.endYear = () => {
    const S = sim.S;
    if (S.phase !== 'life') return;
    normalizeRhodes(sim);
    // 1. 초점 효과
    const tot = Object.values(S.fT).reduce((a, b) => a + b, 0);
    S.focusW = {};
    if (tot > 0) for (const [k, v] of Object.entries(S.fT)) S.focusW[k] = v / tot;
    else if (S.focus) S.focusW[S.focus] = 1;
    let tfFall = 1;
    for (const [k, w] of Object.entries(S.focusW)) {
      const def = focusDef(k);
      const fx = def && def.fx;
      if (!fx) continue;
      for (const stat of ['hl', 'h']) if (fx[stat]) S.st[stat] = clamp(S.st[stat] + fx[stat] * w, 0, 100);
      // W12(D53a): 진로 전용 초점 — 역량·지위·돈·몰락 배율
      if (isTrackFocus(k) && S.track) {
        for (const [ck, dz] of Object.entries(fx.cap || {})) addCap(S, ck, dz * w);
        if (fx.standing) S.track.standing = clamp(S.track.standing + fx.standing * w, 0, 100);
        if (fx.money) S.money = Math.round(S.money + sim.med * fx.money * w);
        if (def.fall && def.fall !== 1) tfFall *= 1 + (def.fall - 1) * w;
        if (w >= 0.5 && S.flags.lastTf !== k) { S.flags.lastTf = k; sim.log('올해는 ‘' + def.label + '’에 마음을 두었습니다.', 'note', null, fx); }
      }
    }
    S.flags.tfFall = tfFall;
    // 2. 학교·복무 → 진로 상태 기계(§3.3; 진입은 planYear 의 track_choose 결정이 한다)
    schoolYear(sim);
    serviceYear(sim);
    trackYear(sim); if (S.phase !== 'life') return;
    // 3. 돈
    financeYear(sim); if (S.phase !== 'life') return;
    // 4. 테라 위험
    if (sim.terra) {
      oriYear(sim); if (S.phase !== 'life') return;
      campYear(sim); if (S.phase !== 'life') return;
      jailYear(sim);
      catYear(sim); if (S.phase !== 'life') return;
      conflictYear(sim); if (S.phase !== 'life') return;
      hazardYear(sim); if (S.phase !== 'life') return;
    }
    // 5. 역량 성장·스탯 수렴, 6. 가족·주거·거주·로도스
    capYear(sim);
    statYear(sim);
    familyYear(sim); if (S.phase !== 'life') return;
    housingYear(sim);
    resYear(sim); if (S.phase !== 'life') return;
    refreshRel(sim);   // W11: 관계 등급은 연도 조건(since 1098 류)이 있어 매년 다시 본다(W9d-7)
    rhodesYear(sim); if (S.phase !== 'life') return;
    dreamYear(sim);     // W16(D56): 나이·진로·가정 상황에 따른 연간 확률로 꿈을 접는다
    capGradeLog(sim);   // W14(QA B17): 이주·투옥의 mulTies 가 끝난 뒤(스냅샷 직전)에 등급 변화를 적는다
    // 7. 연간 스냅샷
    S.years.push({ a: S.age, y: sim.year, hl: Math.round(S.st.hl), h: Math.round(S.st.h),
      cap: { skill: +S.cap.skill.toFixed(2), learn: +S.cap.learn.toFixed(2), arts: +S.cap.arts.toFixed(2), ties: +S.cap.ties.toFixed(2) },
      money: S.money, inc: S.income, pct: +S.pct.toFixed(2), cur: S.cur, job: S.job, track: S.track ? S.track.id : null, stage: S.track ? S.track.stage : null, standing: S.track ? Math.round(S.track.standing) : null,
      uL: S.ori.on ? S.ori.uL : 0, focus: S.focus });
    // 8. 사망 판정
    deathCheck(sim); if (S.phase !== 'life') return;
    // 9. 다음 해
    S.age++; S.t = 0; S.fT = {};
    if (S.age > sim.lt.maxAge) { sim.die('oldage', '노환'); return; }
    sim.planYear();
    sim.HOOK.year(S, sim);
  };

  /** 테스트용: 결정은 autoChoice 로 처리하며 한 해를 끝까지 돌린다 */
  sim.runYear = () => {
    const S = sim.S;
    const a = S.age;
    let guard = 0;
    while (S.phase === 'life' && S.age === a && guard++ < 200) {
      if (S.pending) sim.autoChoice();
      sim.tick(S.yearSec * 2 / S.speed);
    }
    if (guard >= 200) throw new Error('runYear: 진행 없음 (age ' + a + ', pending ' + (S.pending && S.pending.id) + ')');
  };

  return sim;
}

// ── 연말 하위 처리 ───────────────────────────────────────

/** W12(D51-1): 역량 등급이 바뀐 해에 기록 한 줄("기량이 보통에서 높음으로 올랐습니다"). 마지막으로 기록한 등급을 flags.capGrade 에 두어 경계에서 흔들려도 되풀이하지 않는다 */
function capGradeLog(sim) {
  const { S } = sim;
  if (!S.cap) return;
  const last = S.flags.capGrade || (S.flags.capGrade = {});
  for (const k of CAP_KEYS) {
    const g = grade(S.cap[k]);
    if (last[k] == null) { last[k] = g; continue; }
    if (g === last[k]) continue;
    const up = B.cap.grades.findIndex(([, l]) => l === g) > B.cap.grades.findIndex(([, l]) => l === last[k]);
    sim.log(iga(CAP_LABEL[k]) + ' ' + last[k] + '에서 ' + ro(g) + (up ? ' 올랐습니다.' : ' 내려갔습니다.'), up ? 'warm' : 'loss', null, { cap: { [k]: up ? 1 : -1 } });
    last[k] = g;
  }
}

function schoolYear(sim) {
  const { S, rng } = sim;
  const st = sim.nation.stats;
  if (S.prison || S.serving) return;
  if (S.age === 6 && !S.school && !S.flags.noSchool) {
    if (rng.chance(clamp(0.35 + st.ppp / 8000 + (S.q - 3) * 0.08, 0.1, 0.98))) {
      S.school = 'prim'; S.edu = 1; S.eduEnd = 12; sim.log('학교에 들어갔습니다.', 'ev', '(' + (sim.nation.statOrg || '기록소') + ' 학령 아동 등록 명부)');
    } else { S.flags.noSchool = true; sim.log('학교는 다니지 못했습니다.', 'note', '(' + (sim.nation.statOrg || '기록소') + ' 학령 아동 명부 미등록)'); }
  }
  if (S.age === 12 && S.school === 'prim') {
    if (rng.chance(clamp(0.3 + st.ppp / 6000 + (S.q - 3) * 0.1, 0.05, 0.95))) { S.school = 'lsec'; S.edu = 2; S.eduEnd = 15; }
    else { S.school = null; S.eduEnd = 12; }
  }
  if (S.age === 15 && S.school === 'lsec' && !S.done.school15) { S.school = null; S.eduEnd = 15; }   // 결정이 없었으면 종료
  if (S.age === 18 && S.school === 'usec') {
    S.edu = 3;
    if (S.flags.uniPlanned) { S.school = 'uni'; S.eduEnd = 22; } else { S.school = null; S.eduEnd = 18; }
  }
  if (S.age === 20 && S.school === 'caster') { S.school = null; S.eduEnd = 20; S.flags.casterRoute = true; sim.log('아츠 수련 과정을 마쳤습니다.', 'ev'); }
  if (S.age === 22 && S.school === 'uni') { S.edu = 4; S.school = null; S.eduEnd = 22; sim.log('대학을 마쳤습니다.', 'ev'); }
  if (S.school === 'uni' && S.flags.studyAbroad != null && S.age >= S.eduEnd) { S.edu = 4; S.school = null; sim.log('유학을 마쳤습니다.', 'ev'); S.flags.returnHomeDue = true; }
}

function serviceYear(sim) {
  const { S } = sim;
  const n = sim.nation;
  if (S.serving) {
    S.serving--; S.served++;
    if (S.serving === 0) sim.log('복무를 마쳤습니다.', 'ev');
    return;
  }
  if (sim.conscript === 'mandatory' && S.age === 18 && !S.served && !S.prison && (n.conscriptSex === 'all' || S.sex === 'M')) {   // D33: 기본 남성만. W14: conscriptUntil
    const t = trackOf(sim);
    if (t && t.archetype === 'A4') { S.served = 3; return; }   // W11: 이미 군단·징집 진로(BOL_SINGAS 류)에 있으면 그것이 복무다
    S.serving = 3; S.job = null; S.school = null;
    sim.log('의무 복무가 시작되었습니다. 3년입니다.', 'ev', '(' + n.name + ' 병무 조례)');
  }
}

function statYear(sim) {
  const { S, race } = sim;
  const eh = expHealth(sim, 1);
  const fw = S.focusW;
  const camp = S.prison === 'camp';
  let hlT = eh + (S.q - 3) * 1.5 + (STAGE_HL[S.ori.stage] || 0) + (camp ? -12 : 0) + (S.flags.quarantined ? -4 : 0) + (S.flags.war ? -5 : 0)
    + (fw.health || 0) * 6 - (fw.work || 0) * 2 + (S.money < 0 ? -3 : 0);
  S.st.hl = clamp(S.st.hl + (hlT - S.st.hl) * (S.age < 5 ? 0.4 : 0.25), 0, 100);

  // 구 관계 막대 → 관계(cap.ties): 가족이 곁에 있으면 천천히 오르고, 격리·수용소면 내려간다
  const kidsAlive = S.fam.kids.filter((k) => k.alive).length;
  const partner = S.fam.partner && S.fam.partner.alive;
  const tiesDelta = (partner ? 0.01 : 0) + Math.min(0.02, kidsAlive * 0.005) - (S.flags.quarantined ? 0.02 : 0) - (camp ? 0.04 : 0) + (S.rhodes ? 0.005 : 0) - 0.003 * race.stigma;
  S.cap.ties = clamp(+(S.cap.ties + tiesDelta).toFixed(3), -3, 3);
  const soProxy = 50 + S.cap.ties * 12 + (partner ? 6 : 0) + Math.min(8, kidsAlive * 2);   // 행복 목표식의 옛 '관계' 항

  const adult = S.age >= 18;
  const hm = S.job === 'homemaker';
  const standing = S.track ? (S.track.standing - 50) * 0.08 : 0;
  let hT = 40 + (adult ? (hm ? (S.flags.hhPct - 0.5) * 12 + 1 : (S.pct - 0.5) * 18 * (S.job ? 1 : 0.3)) : (S.q - 3) * 3) + (soProxy - 50) * 0.25 + (S.st.hl - eh) * 0.2 + standing
    - (S.money < 0 ? 6 : 0) - (S.ori.known ? 8 : 0) - (camp ? 15 : 0) - (S.flags.quarantined ? 5 : 0) - (S.res && S.res.phase === 'settling' ? 3 : 0)
    + (fw.rest || 0) * 3 + (fw.play || 0) * 3 + (S.rhodes ? 4 : 0);
  S.st.h = clamp(S.st.h + (hT - S.st.h) * (hT > S.st.h ? 0.35 : 0.2), 0, 100);
}

function familyYear(sim) {
  const { S, rng, race } = sim;
  const st = sim.nation.stats;
  const tfr = st.tfr ?? 4.5;
  // 부모
  for (const key of ['mom', 'dad']) {
    const p = S.fam[key];
    if (!p.alive) continue;
    p.age++;
    const lt = lifeTable(st, p.sex, race.lifeMul);
    const q = lt.q[Math.min(p.age, lt.q.length - 1)] * 1.2 * (p.infected ? 2 : 1);
    if (rng.chance(q)) {
      p.alive = false;
      S.flags.parentDiedAt = S.age;
      sim.eff({ so: -4, h: -5 });
      sim.log(iga(key === 'mom' ? '어머니' : '아버지') + ' 세상을 떠났습니다.', 'loss');
    }
  }
  // 배우자: 결혼 롤·제도 유형·결정은 choices.js 의 marry_<type>(§8). 여기서는 사별·타국 배우자 이주만
  const f = S.fam;
  const camp = S.prison === 'camp';
  if (f.partner && !f.marriage) f.marriage = { type: 'custom', at: f.marriedAt ?? S.age, name: '관습 혼인' };   // 콘텐츠가 직접 배우자를 만든 경우
  if (S.flags.marriageMigrateTo && f.partner && f.partner.alive && !S.prison && !S.flags.noMove) {
    const to = S.flags.marriageMigrateTo; S.flags.marriageMigrateTo = null;
    if (rng.chance(0.5) && sim.data.nationById[to]) { sim.migrate('marriage', to); if (S.phase !== 'life') return; }
  }
  if (f.partner && f.partner.alive) {
    const p = f.partner;
    p.age++;
    const lt = lifeTable(st, p.sex, race.lifeMul);
    const q = lt.q[Math.min(Math.max(0, p.age), lt.q.length - 1)] * 1.2 * (p.infected ? 2 : 1);
    if (rng.chance(q)) { p.alive = false; f.widowed = true; sim.eff({ h: -8, so: -6 }); sim.log('배우자가 세상을 떠났습니다.', 'loss'); }
  }
  // 부모 사망 → 귀향 결정(§7.2) / 고아(15세 전 부모 둘 다 없음, gate status:'orphan')
  if (S.cur !== S.born && S.flags.parentDiedAt === S.age) S.flags.returnHomeDue = true;
  if (S.age < 15 && !S.fam.mom.alive && !S.fam.dad.alive && !S.flags.orphan) S.flags.orphan = S.age;
  // 자녀
  if (f.partner && f.partner.alive && !camp) {
    const motherAge = S.sex === 'F' ? S.age : f.partner.age;
    const hm = humanAge(motherAge, race.lifeMul);
    if (hm >= 18 && hm <= 44 && f.kids.length < tfr + 1 && rng.chance(0.22 * (1 - f.kids.length / (tfr + 1)))) {
      const sex = rng.chance(0.512) ? 'M' : 'F';
      const both = S.ori.on && f.partner.infected, one = S.ori.on || f.partner.infected;
      const kid = { name: makeName(sim.data, rng, { lang: sim.nation.nameLang, sex, race: S.race, avoid: familyNames(S) }).given,
        sex, bornAt: S.age, alive: true, infected: both ? rng.chance(0.9) : one ? rng.chance(0.6) : false };
      f.kids.push(kid); S.stats.kidsBorn++;
      sim.log('아이가 태어났습니다. ' + kid.name + '.', 'warm');
    }
  }
  for (const k of f.kids) {
    if (!k.alive) continue;
    const ka = S.age - k.bornAt;
    const lt = lifeTable(st, k.sex, race.lifeMul);
    const q = lt.q[Math.min(ka, lt.q.length - 1)] * (k.infected ? 1.5 : 1);
    if (rng.chance(q)) { k.alive = false; S.stats.kidsLost++; sim.eff({ h: -12, so: -5 }); sim.log(eul(k.name) + ' 잃었습니다.', 'loss'); }
  }
}
