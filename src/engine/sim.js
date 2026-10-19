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
import { createRegistry, chooseFeed, scheduledDecisions, dueBigEvents } from './content.js';
import { oriYear, campYear, applyPolicy, STAGE_HL } from './oripathy.js';
import { catYear, conflictYear, hazardYear } from './catastrophe.js';
import { financeYear, jobOffers, takeJob, medianLMD, initPartner } from './finance.js';
import { expHealth, deathCheck, die } from './death.js';
import { BALANCE as B } from './balance.js';
import { makeName, familyNames } from './names.js';
import { wa, ro, eul, iga } from './text.js';

/** 올해의 초점: 연중 시간 비율(focusW)만큼 연말에 스탯 델타로 적용 */
export const FOCUS = {
  study:   { label: '공부',     fx: { sm: 4, h: -1 } },
  play:    { label: '놀기',     fx: { so: 3, h: 3, sm: -1 } },
  sport:   { label: '운동',     fx: { hl: 3, h: 1, so: 1 } },
  arts:    { label: '아츠 수련', fx: { sm: 2, h: 1, hl: -1 } },
  work:    { label: '일',       fx: { hl: -2, h: -1, so: -2 } },
  balance: { label: '균형',     fx: { h: 1, hl: 1, so: 1 } },
  family:  { label: '가족',     fx: { so: 4, h: 2 } },
  health:  { label: '건강',     fx: { hl: 4, h: 1 } },
  learn:   { label: '배움',     fx: { sm: 3, h: -1 } },
  rest:    { label: '쉼',       fx: { hl: 2, h: 2, sm: -1 } },
  survive: { label: '재앙 대비', fx: { hl: 1, so: -1 } },
};
export const STAGE_FOCUS = {
  baby: [],
  school: ['study', 'play', 'sport', 'arts', 'rest'],
  adult: ['work', 'balance', 'family', 'health', 'learn', 'arts', 'survive', 'rest'],
  elder: ['rest', 'health', 'family', 'balance'],
  service: ['survive', 'health', 'rest'],
  camp: ['survive', 'rest'],
};
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
export function focusOptions(sim) { return STAGE_FOCUS[stageOf(sim)]; }

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
    get job() { return sim.S.job ? data.jobById[sim.S.job] : null; },
    get policy() { return resolvePolicy(sim.nation, sim.S); },
    get lt() { return lifeTable(sim.nation.stats, sim.S.sex, sim.race.lifeMul); },
    get year() { return sim.S.by + sim.S.age; },
    get med() { return medianLMD(sim); },
  };

  // ── 기록·효과 ──────────────────────────────────────────
  sim.log = (text, kind = 'ev', f, fx) => {
    const e = { a: sim.S.age, y: sim.year, t: text, k: kind };
    if (f && keepFootnote(text, f)) e.f = f;
    if (fx) e.fx = fx;
    sim.S.log.push(e);
    sim.HOOK.log(e, sim);
    return e;
  };
  sim.eff = (fx) => {
    const st = sim.S.st;
    for (const k of ['hl', 'h', 'sm', 'so']) if (fx[k]) st[k] = clamp(st[k] + fx[k], 0, 100);
    if (fx.money) sim.S.money = Math.round(sim.S.money + fx.money);
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

  /** 타국 이주(추방·보험 미납·자발). 정책이 박해·추방·안락사인 나라는 피한다. */
  sim.migrate = (reason) => {
    const S = sim.S;
    const cands = data.topNations.filter((n) => n.id !== S.root).map((n) => {
      const p = typeof n.policy === 'string' ? n.policy : (n.policy.default || 'ignore');
      return [n.id, Math.max(0.1, n.share) * (['persecute', 'expel', 'euthanasia'].includes(p) ? 0.2 : 1)];
    });
    const id = sim.rng.wpick(cands);
    if (!id) return false;
    const to = data.nationById[id];
    S.cur = id; S.root = rootOf(data, id); S.mig = id; S.stats.moves++;
    S.flags.quarantined = false; S.flags.noMove = false; S.flags.oriFees = false; S.flags.oriPremium = 0; S.flags.euthTrack = false;
    S.flags.migReason = reason;
    if (sim.job && sim.job.only && sim.job.only !== id) { S.job = null; S.income = 0; }
    sim.log(ro(to.name) + ' 옮겨 갔습니다.', reason === 'expel' || reason === 'insurance_default' ? 'bad' : 'ev');
    if (S.ori.on && S.ori.known) {
      const p = sim.policy;
      if (['ignore', 'treat', 'neglect', 'insurance', 'quarantine'].includes(p)) applyPolicy(sim, p);
    }
    return true;
  };

  // ── 생애 시작 ──────────────────────────────────────────
  sim.newLife = (opts = {}) => { sim.S = newLife(data, sim.rng, { terra: sim.terra, ...opts }); return sim.S; };
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
    sim.ensureFocus();
    for (const b of dueBigEvents(sim)) S.queue.push({ at: ((b.month || 6) - 0.5) / 12, type: 'big', id: b.id });
    const decs = scheduledDecisions(sim);
    decs.slice(0, 2).forEach((d, i) => S.queue.push({ at: d.at ?? (0.3 + i * 0.3 + rng.rnd() * 0.15), type: 'dec', id: d.id, p: {} }));
    const n = S.age < 6 ? 2 : 3;
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const e = chooseFeed(sim, used);
      if (!e) break;
      used.add(e.id);
      S.queue.push({ at: 0.08 + (i + rng.rnd() * 0.8) / n * 0.86, type: 'ev', id: e.id });
    }
    S.queue.sort((a, b) => a.at - b.at);
  };

  sim.fire = (e) => {
    const S = sim.S;
    if (e.type === 'ev') {
      const ev = sim.content.evById[e.id];
      if (!ev || (ev.c && !ev.c(sim))) return;
      sim.logResult(ev.run(sim), 'ev');
      S.flags['ev_' + ev.id] = S.age;
      S.recent.push(ev.id);
      if (S.recent.length > 14) S.recent.shift();
    } else if (e.type === 'dec') {
      sim.openDecision(e.id, e.p || {});
    } else if (e.type === 'big') {
      const b = sim.content.bigById[e.id];
      if (!b) return;
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
    if (d.ok && !d.ok(sim, p)) return false;
    const view = d.build(sim, p);
    if (!view || !view.choices || !view.choices.length) return false;
    if (view.fact && !keepFootnote(view.body || '', view.fact)) delete view.fact;
    S.pending = { id, p, view };
    S.stats.decisions++;
    sim.HOOK.decision(S.pending, sim);
    return true;
  };
  sim.choose = (k, text = '', auto = false) => {
    const S = sim.S;
    const pd = S.pending;
    if (!pd) return false;
    const d = sim.content.decisions[pd.id];
    S.pending = null;
    S.done[pd.id] = (S.done[pd.id] || 0) + 1;
    S.flags['last_' + pd.id] = S.age;
    if (auto) S.stats.auto++;
    const ch = pd.view.choices.find((c) => c.k === k) || pd.view.choices[0];
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
    const k = sim.rng.wpick(pd.view.choices.map((c) => [c.k, c.auto ?? 1]));
    return sim.choose(k, '', true);
  };

  // ── 연말 ──────────────────────────────────────────────
  sim.endYear = () => {
    const S = sim.S;
    if (S.phase !== 'life') return;
    // 1. 초점 효과
    const tot = Object.values(S.fT).reduce((a, b) => a + b, 0);
    S.focusW = {};
    if (tot > 0) for (const [k, v] of Object.entries(S.fT)) S.focusW[k] = v / tot;
    else if (S.focus) S.focusW[S.focus] = 1;
    for (const [k, w] of Object.entries(S.focusW)) {
      const fx = FOCUS[k] && FOCUS[k].fx;
      if (!fx) continue;
      for (const [stat, v] of Object.entries(fx)) S.st[stat] = clamp(S.st[stat] + v * w, 0, 100);
    }
    // 2. 학교·취업·복무
    schoolYear(sim);
    jobYear(sim);
    serviceYear(sim);
    // 3. 돈
    financeYear(sim); if (S.phase !== 'life') return;
    // 4. 테라 위험
    if (sim.terra) {
      oriYear(sim); if (S.phase !== 'life') return;
      campYear(sim); if (S.phase !== 'life') return;
      catYear(sim); if (S.phase !== 'life') return;
      conflictYear(sim); if (S.phase !== 'life') return;
      hazardYear(sim); if (S.phase !== 'life') return;
    }
    // 5. 스탯 수렴, 6. 가족
    statYear(sim);
    familyYear(sim);
    // 7. 연간 스냅샷
    S.years.push({ a: S.age, y: sim.year, hl: Math.round(S.st.hl), h: Math.round(S.st.h), sm: Math.round(S.st.sm), so: Math.round(S.st.so),
      money: S.money, inc: S.income, pct: +S.pct.toFixed(2), cur: S.cur, job: S.job, uL: S.ori.on ? S.ori.uL : 0, focus: S.focus });
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
  if (S.school) S.st.sm = clamp(S.st.sm + 2, 0, 100);
}

function jobYear(sim) {
  const { S, rng } = sim;
  if (S.job || S.school || S.retired || S.serving || S.prison) return;
  if (S.ori.stage >= 3 && !S.rhodes) return;
  if (humanAge(S.age, sim.race.lifeMul) >= 65) return;
  const minAge = S.flags.noSchool && B.childLaborAge[S.q] ? B.childLaborAge[S.q] : 15;
  if (S.age < minAge) return;
  const first = !S.flags.everWorked;
  if (!first && !rng.chance(0.45)) { S.flags.joblessYears = (S.flags.joblessYears || 0) + 1; return; }
  const offers = jobOffers(sim, 3);
  if (!offers.length) return;
  const best = offers.reduce((a, b) => ((a.lo + a.hi) >= (b.lo + b.hi) ? a : b));
  const pick = rng.chance(0.7) ? best : rng.pick(offers);
  if (takeJob(sim, pick.id)) {
    S.flags.everWorked = true; S.flags.joblessYears = 0;
    if (S.age < 15) { S.flags.childLabor = S.age; sim.log('아직 아이지만 일을 시작했습니다.', 'bad', '(' + (sim.nation.statOrg || '기록소') + ' 노동 대장에는 나이 칸이 없습니다)'); }
  }
}

function serviceYear(sim) {
  const { S } = sim;
  const n = sim.nation;
  if (S.serving) {
    S.serving--; S.served++;
    if (S.serving === 0) sim.log('복무를 마쳤습니다.', 'ev');
    return;
  }
  if (n.conscript === 'mandatory' && S.age === 18 && !S.served && !S.prison && (n.conscriptSex === 'all' || S.sex === 'M')) {   // D33: 기본 남성만
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

  const kidsAlive = S.fam.kids.filter((k) => k.alive).length;
  const partner = S.fam.partner && S.fam.partner.alive;
  let soT = 45 + (partner ? 12 : 0) + Math.min(15, kidsAlive * 4) + (S.fam.mom.alive ? 2 : 0) + (S.fam.dad.alive && !S.fam.dad.absent ? 2 : 0)
    - 3 * race.stigma - (S.eth === 'outsider' ? 4 : 0) - (S.flags.quarantined ? 8 : 0) - (camp ? 15 : 0)
    + (fw.family || 0) * 6 + (fw.play || 0) * 4 + (S.rhodes ? 5 : 0) + (S.job === 'homemaker' ? (kidsAlive ? 3 : 1) : 0);
  S.st.so = clamp(S.st.so + (soT - S.st.so) * 0.2, 0, 100);

  const adult = S.age >= 18;
  const hm = S.job === 'homemaker';
  let hT = 40 + (adult ? (hm ? (S.flags.hhPct - 0.5) * 12 + 1 : (S.pct - 0.5) * 18 * (S.job ? 1 : 0.3)) : (S.q - 3) * 3) + (S.st.so - 50) * 0.25 + (S.st.hl - eh) * 0.2
    - (S.money < 0 ? 6 : 0) - (S.ori.known ? 8 : 0) - (camp ? 15 : 0) - (S.flags.quarantined ? 5 : 0)
    + (fw.rest || 0) * 3 + (fw.play || 0) * 3 + (S.rhodes ? 4 : 0);
  S.st.h = clamp(S.st.h + (hT - S.st.h) * (hT > S.st.h ? 0.35 : 0.2), 0, 100);

  if (humanAge(S.age, race.lifeMul) >= 30 && !(fw.study || fw.learn)) S.st.sm = clamp(S.st.sm - 0.3, 0, 100);
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
      sim.eff({ so: -4, h: -5 });
      sim.log(iga(key === 'mom' ? '어머니' : '아버지') + ' 세상을 떠났습니다.', 'loss');
    }
  }
  // 배우자
  const f = S.fam;
  const camp = S.prison === 'camp';
  if (!f.partner && S.age >= 18 && humanAge(S.age, race.lifeMul) <= 45 && !camp && !S.serving) {
    let p = 0.12 * clamp(S.st.so / 60, 0.3, 1.5) * (1 - 0.15 * race.stigma) * (S.eth === 'outsider' ? 0.8 : 1);
    if (S.ori.known && !S.rhodes) p *= 0.3;
    if (S.flags.quarantined) p *= 0.3;
    if (rng.chance(p)) {
      const psex = S.sex === 'M' ? 'F' : 'M';
      f.partner = { name: makeName(sim.data, rng, { lang: sim.nation.nameLang, sex: psex, race: S.race, avoid: familyNames(S) }).given,
        sex: psex, age: S.age + rng.ri(-3, 4), alive: true, infected: rng.chance(0.03 * sim.nation.oriExp) };
      initPartner(sim, f.partner);
      f.married = true; f.marriedAt = S.age;
      sim.log(wa(f.partner.name) + ' 결혼했습니다.', 'warm');
    }
  } else if (f.partner && f.partner.alive) {
    const p = f.partner;
    p.age++;
    const lt = lifeTable(st, p.sex, race.lifeMul);
    const q = lt.q[Math.min(Math.max(0, p.age), lt.q.length - 1)] * 1.2 * (p.infected ? 2 : 1);
    if (rng.chance(q)) { p.alive = false; f.widowed = true; sim.eff({ h: -8, so: -6 }); sim.log('배우자가 세상을 떠났습니다.', 'loss'); }
  }
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
