// 진로 상태 기계(§3·§4·§5). 진입 후보·가중, 승급·몰락 롤, 소속 배정, 소득, 은퇴·전직, exits.fall 값 사전.
// 상태: S.track = { id, stage, since, stageSince, years, standing, aff, flags } | null, S.trackHist = [{id, from, to, stage, how}]
// 모든 함수는 ctx(=sim) 를 첫 인자로 받는다. 콘텐츠용 헬퍼(sim.promote/fall/switchTrack …)는 sim.js 가 이 모듈을 감싼다.
import { clamp } from './rng.js';
import { humanAge } from './lifetable.js';
import { tracksFor } from './data.js';
import { BALANCE as B } from './balance.js';
import { FALL_CAUSE_TO_DEATH, FALL_CAUSE_LABEL } from './archetypes.js';
import { addCap, fit, mulTies } from './caps.js';
import { relOf, relMul, relGateOk } from './relations.js';
import { evalWhen } from './data.js';
import { ro, eul, iga, eun } from './text.js';

const T = () => B.track;

export function trackOf(sim) { return sim.S.track ? (sim.data.trackById[sim.S.track.id] || null) : null; }
export function affOf(sim) { return sim.S.track && sim.S.track.aff ? (sim.data.affById[sim.S.track.aff] || null) : null; }
export function trackStage(sim) { const t = trackOf(sim); return t ? t.stages[Math.min(sim.S.track.stage, t.stages.length - 1)] : null; }
/** 신원 카드 "진로 · 단계 칭호 · 소속" 문자열 */
export function trackName(sim) {
  const t = trackOf(sim); if (!t) return null;
  const st = trackStage(sim), a = affOf(sim);
  const head = a ? a.name : t.name;
  const tail = st ? (st.title || st.name) : '';
  return tail && tail !== head ? head + ' · ' + tail : head;
}
export function trackTitle(sim) { const st = trackStage(sim); return st ? (st.title || st.name) : null; }

// ── 진입 ─────────────────────────────────────────────────────────────
/** 올해 새 진로를 찾을 수 있는 상태인가 */
export function canSeek(sim) {
  const { S } = sim;
  if (S.phase !== 'life' || S.track || S.school || S.retired || S.serving || S.prison) return false;
  if (S.job === 'homemaker') return false;
  if (S.job && !S.track) return false;                       // 콘텐츠가 직접 준 구 직업(takeJob)
  if (S.ori.stage >= 3 && !S.rhodes) return false;
  if (humanAge(S.age, sim.race.lifeMul) >= 65) return false;
  const minAge = S.flags.noSchool && B.childLaborAge[S.q] ? B.childLaborAge[S.q] : 15;
  return S.age >= minAge;
}
/** W11: 입구 나이가 15세 미만으로 적힌 진로(HIG_NINJA 5~8·VIC_KNIGHT 11~14)는 재학 중에도 그 나이부터 롤한다 */
function childTrackOpen(sim) {
  const { S } = sim;
  if (!T().childTrackSeek || S.phase !== 'life' || S.age >= 15 || S.track || S.prison || S.serving || S.job) return false;
  return tracksFor(sim.data, S.cur).some((t) => t.entry.ages[0] < 15 && S.age >= t.entry.ages[0] && S.age <= t.entry.ages[1] && !t.synthetic && !t.forcedEntry && !t.noClasses && !t.A.flags.childLabor);
}

function zOf(S, key) {
  if (key === 'looks' || key === 'luck') return S.innate ? S.innate[key] : 0;
  return S.cap ? (S.cap[key] ?? 0) : 0;
}

/** gate 하나 평가 → false(불가) | 숫자(가중 배율) */
function gateMul(sim, g) {
  const { S } = sim;
  const w = typeof g.weight === 'number' ? g.weight : null;   // weight 가 있으면 조건이 아니라 가중
  const hit = (ok) => (w == null ? (ok ? 1 : false) : (ok ? w : 1));
  if (g.cap) {
    // W11: 역량 하한은 부드러운 문턱 — 모자란 만큼(z 단위) 가중을 줄이고 softCapGate 만큼 모자라면 0. 데이터 weight 가 있으면 종전처럼 가중만
    const z = zOf(S, g.cap), lo = g.min ?? -9, hi = g.max ?? 9;
    if (w != null) return hit(z >= lo && z <= hi);
    if (z > hi) return false;
    if (z >= lo) return 1;
    const soft = T().softCapGate ?? 0;
    const f = soft > 0 ? 1 - (lo - z) / soft : 0;
    return f > 0 ? f : false;
  }
  if (g.born) return hit(zOf(S, g.born) >= (g.min ?? -9) && zOf(S, g.born) <= (g.max ?? 9));
  if (g.status) {
    const neg = g.status.startsWith('!'); const k = neg ? g.status.slice(1) : g.status;
    const has = k === 'slave' ? !!S.status.slave : k === 'noble' ? !!S.status.noble : k === 'stigma' ? !!S.status.stigma : k === 'prisoner' ? !!S.prison
      : k === 'orphan' ? !!S.flags.orphan : S.status.stigma === k || !!S.flags[k];   // 그 밖의 신분 키(ninja_clan 등)는 플래그
    return hit(neg ? !has : has);
  }
  if (g.rel) return hit(relGateOk(S.rel, g.rel));
  if (g.race) { const list = Array.isArray(g.race) ? g.race : [g.race]; return hit(list.includes(S.race)); }
  if (g.edu != null) return hit(S.edu + (S.q >= 4 ? 1 : 0) >= g.edu);
  if (g.sex) return hit(S.sex === g.sex);
  if (g.year) { const y = S.by + S.age; return hit(Array.isArray(g.year) ? y >= g.year[0] && y <= g.year[1] : evalWhen('year' + g.year, S)); }   // W11: [y0,y1] 배열형
  if (g.urban != null) return hit(!!S.urban === !!g.urban);
  if (g.infected != null) return hit(!!S.ori.on === !!g.infected);
  if (g.known != null) return hit(!!S.ori.known === !!g.known);
  if (g.rhodes != null) return hit(!!S.rhodes === !!g.rhodes);
  if (g.q) return hit(S.q >= g.q[0] && S.q <= g.q[1]);
  if (g.flag) return hit(!!S.flags[g.flag]);
  if (g.region) return hit((S.sub && S.sub.region) === g.region);
  if (g.eth) return hit(S.eth === g.eth);
  if (g.money != null) return hit(S.money >= sim.med * g.money);
  if (g.papers) return hit((Array.isArray(g.papers) ? g.papers : [g.papers]).includes(S.res.papers));
  if (g.newcomer != null) return hit((S.res.phase === 'settling') === !!g.newcomer);
  return 1;
}

/** 진입 후보와 가중(§5). forced 진로는 제외(강제 전환으로만 들어간다) */
export function entryCandidates(sim, opts = {}) {
  const { S, data } = sim;
  const out = [];
  const settling = S.res && S.res.phase === 'settling';
  const child = S.age < 15;
  const laborOk = child && S.flags.noSchool && B.childLaborAge[S.q] && S.age >= B.childLaborAge[S.q];   // 학교 못 간 최하층 아동 노동
  const subRegion = S.sub && S.sub.region;
  for (const t of tracksFor(data, S.cur)) {
    if (t.forcedEntry && !opts.includeForced) continue;
    if (t.noClasses && !opts.includeNoClass && !t.entry.trigger) continue;
    if (opts.exclude && opts.exclude === t.id) continue;
    const ages = t.entry.ages;
    const maxAge = ages[1] + 50 * (sim.race.lifeMul - 1);
    if (S.age < ages[0] || S.age > maxAge) continue;
    if (child && !((laborOk && (t.A.flags.childLabor || t.synthetic)) || (ages[0] < 15 && !t.synthetic && !t.A.flags.childLabor))) continue;   // W11: 입구 나이 < 15 진로는 그 나이부터
    if (settling && !(['A11', 'A5', 'A6'].includes(t.archetype) || t.entry.gates.some((g) => g.newcomer))) continue;
    if (t.dept && !S.rhodes) continue;                       // 로도스 내부 진로는 합류자만
    const classes = t.entry.classes || {};
    let w = t.noClasses ? 1 : (classes['q' + S.q] ?? 0);
    // W11 (g): COM_* 공통 입구 entry.trigger = { nations?:[…], p?:가중, … } — 거주국이 목록에 있으면 그 가중으로 후보에 든다
    if (t.noClasses && t.entry.trigger && !opts.includeNoClass) { const tg = t.entry.trigger; if (tg.nations && !tg.nations.includes(S.cur) && !tg.nations.includes(S.root)) continue; w = tg.p ?? tg.w ?? 0.05; }
    if (!(w > 0)) continue;
    // W11 (b): 하위 지역 거주자에게 상위국 진로는 ×parentNationMul. (a) 소지역 표시 진로는 S.sub.region 이 다르면 ×regionOffMul(데이터에 region 게이트가 있으면 그쪽이 맡는다)
    if (t.nation !== S.cur && t.nation === S.root) w *= T().parentNationMul;
    if (t.region && !data.nationById[t.region] && t.region !== subRegion && !t.entry.gates.some((g) => g.region)) w *= T().regionOffMul;
    let ok = true;
    for (const g of t.entry.gates) { const m = gateMul(sim, g); if (m === false) { ok = false; break; } w *= m; }
    if (!ok) continue;
    const rel = relOf(data, S.cur, S.race, sim.year, { track: t.id, eth: S.eth });
    w *= relMul(rel, data);
    const s0 = t.stages[0];
    const capKey = s0.promo ? s0.promo.cap : t.A.promoCap;
    w *= fit(zOf(S, capKey), T().fitShift);
    const lw = t.A.flags.looksWeight;
    if (lw) w *= clamp(1 + (lw - 1) * 0.5 * S.innate.looks, 0.3, 3);
    if (t.special) w *= T().specialBoost;
    if (settling) w *= T().settlingMul;
    if (S.flags.disgraceAt != null && S.age - S.flags.disgraceAt < 10) w *= T().disgraceMul;
    if (t.A.flags.exam && (S.flags['examFail_' + t.id] || 0) >= t.A.flags.examTries) continue;
    if (w > 0) out.push({ id: t.id, w: +w.toFixed(4), special: t.special, name: t.name });
  }
  return out;
}

/** 올해 진입 롤(나이당 1회 캐시). 성공하면 {cands} 를 S.flags.trackCands 에 둔다 */
export function rollEntry(sim) {
  const { S, rng } = sim;
  if (S.flags.trackRollAge === S.age) return S.flags.trackCands && S.flags.trackCands.age === S.age ? S.flags.trackCands : null;
  S.flags.trackRollAge = S.age;
  S.flags.trackCands = null;
  if (!canSeek(sim) && !childTrackOpen(sim)) return null;
  const p = S.flags.everWorked ? T().seekPJobless : T().seekP;
  if (!rng.chance(p)) { S.flags.joblessYears = (S.flags.joblessYears || 0) + (S.age >= 15 ? 1 : 0); return null; }
  let cands = entryCandidates(sim);
  // W11: 아동 진입(입구 나이 < 15 진로)은 가중을 제안 확률로 쓴다 — 평범한 아이가 5세에 닌자 가문에 들어가지 않게
  if (S.age < 15 && !canSeek(sim)) cands = cands.filter((c) => rng.chance(Math.min(1, c.w * T().childTrackMul)));
  if (!cands.length) { S.flags.joblessYears = (S.flags.joblessYears || 0) + (S.age >= 15 ? 1 : 0); return null; }
  S.flags.trackCands = { age: S.age, cands };
  return S.flags.trackCands;
}

/** 결정 모달에 보일 후보 2~4개: 가중 상위 + 국가 특수 진로 최소 1개(D26) */
export function choiceSet(sim, cands) {
  const sorted = cands.slice().sort((a, b) => b.w - a.w);
  const pick = sorted.slice(0, 3);
  const special = sorted.find((c) => c.special);
  if (special && !pick.includes(special)) { if (pick.length >= 3) pick.pop(); pick.push(special); }
  return pick.slice(0, 4);
}

/** 소속 배정(weight) */
export function assignAff(sim, t) {
  const { S, rng, data } = sim;
  const list = t.affiliations.map((id) => data.affById[id]).filter(Boolean);
  if (!list.length) return null;
  const id = rng.wpick(list.map((a) => [a.id, a.weight]));
  return id || null;
}

function examRoll(sim, t) {
  const { S, rng } = sim;
  const p = clamp(1 / (1 + Math.exp(-(zOf(S, 'learn') - 0.5))), 0.05, 0.95);
  if (rng.chance(p)) return true;
  S.flags['examFail_' + t.id] = (S.flags['examFail_' + t.id] || 0) + 1;
  sim.log(t.name + ' 시험에 떨어졌습니다.' + (S.flags['examFail_' + t.id] < t.A.flags.examTries ? ' 다시 볼 수 있습니다.' : ' 더는 응시할 수 없습니다.'), 'bad');
  return false;
}

/**
 * 진로 진입. opts: { via, how('enter'|'switch'|'forced'|'rhodes'|'retire'), aff, stage, quiet }
 * A3 는 입구 시험 롤. 실패하면 false.
 */
export function enterTrack(sim, id, opts = {}) {
  const { S, data } = sim;
  const t = data.trackById[id];
  if (!t) return false;
  // 타국 진로로의 전환은 곧 이주(§7): SIR_CLERGY → LAT_FALLEN 류. common·rhodes·거주국(하위 지역 포함) 진로는 제외. opts.noMigrate 면 거주국을 두고 진로만(W11, LAT_FALLEN·AEG_EXPAT)
  if (!opts.noMigrate && t.nation !== 'common' && t.nation !== 'rhodes' && t.nation !== S.cur && t.nation !== S.root && data.nationById[t.nation] && !data.nationById[t.nation].virtual) {
    const dest = data.nationById[t.nation].parent && data.nationById[t.nation].parent !== S.root ? t.nation : t.nation;
    if (S.track) leaveTrack(sim, opts.how || 'switch', { quiet: true });
    if (!sim.migrate(opts.reason || (t.forcedEntry ? 'exile' : 'work'), dest, { keepTrack: true })) return false;
  }
  if (S.track) leaveTrack(sim, opts.how === 'switch' ? 'switch' : (opts.how || 'switch'), { quiet: true });
  if (t.A.flags.exam && opts.how !== 'forced' && opts.how !== 'rhodes' && !opts.skipExam && !examRoll(sim, t)) return false;
  const aff = opts.aff !== undefined ? opts.aff : assignAff(sim, t);
  const a = aff ? data.affById[aff] : null;
  let stage = opts.stage ?? 0;
  if (opts.stage == null && t.entry.startStage) stage = t.entry.startStage['q' + S.q] ?? 0;
  stage = clamp(stage, 0, t.stages.length - 1);
  S.track = { id: t.id, stage, since: S.age, stageSince: S.age, years: 0, standing: clamp((t.standing.start ?? 20) + (a ? a.mods.standingStart : 0), 0, 100), aff: aff || null,
    flags: { via: opts.via || (t.entry.via && t.entry.via[0]) || null } };
  const sc = t.stages[stage].contract;
  if (sc) S.track.flags.contractEnd = S.age + sc; else if (t.contract) S.track.flags.contractEnd = S.age + sim.rng.ri(t.contract[0], t.contract[1]);
  S.job = t.job || t.id; S.jobY = 0; S.school = null; S.retired = false;
  if (t.dept && S.rhodes && S.rhodes !== true) S.rhodes.dept = t.dept;   // W11: RHO_* 진로로 옮기면 부서도 따라간다
  S.flags.everWorked = true; S.flags.joblessYears = 0; S.flags.trackCands = null;
  if (S.age < 15 && S.flags.childLabor == null) { S.flags.childLabor = S.age; if (!opts.quiet) sim.log('아직 아이지만 일을 시작했습니다.', 'bad', '(' + (sim.nation.statOrg || '기록소') + ' 노동 대장에는 나이 칸이 없습니다)'); }
  if (!opts.quiet) {
    const where = a ? a.name : t.name;
    const st = t.stages[stage];
    sim.log(ro(where) + ' 들어갔습니다. ' + (st.title || st.name) + (opts.how === 'forced' ? '. 선택은 없었습니다.' : '.'), opts.how === 'forced' ? 'bad' : 'ev');
  }
  sim.HOOK.change(S, sim);
  return true;
}

/** 진로 이탈. how: 'retire'|'expel'|'switch'|'injured'|'infected'|'disgrace'|'prison'|'exile'|'death'|'content'|'homemaker'|'discharged'|'migrate'|'term' */
export function leaveTrack(sim, how = 'expel', opts = {}) {
  const { S } = sim;
  const tr = S.track;
  if (!tr) return false;
  const t = trackOf(sim);
  const st = t ? t.stages[Math.min(tr.stage, t.stages.length - 1)] : null;
  S.trackHist.push({ id: tr.id, from: tr.stageSince, to: S.age, stage: st ? st.id : null, how, aff: tr.aff || null });
  S.flags.lastTrack = tr.id; S.flags.lastTrackStage = st ? st.id : null; S.flags.lastTrackLeftAt = S.age; S.flags.lastTrackHow = how;
  S.track = null;
  if (S.job !== 'homemaker') { S.job = null; S.income = 0; }
  S.jobY = 0;
  if (!opts.quiet && how === 'expel') sim.log((t ? eul(t.name) : '일을') + ' 그만두게 되었습니다.', 'loss');
  sim.HOOK.change(S, sim);
  return true;
}

// ── 승급·몰락 ──────────────────────────────────────────────────────────
function requiresOk(sim, req) {
  if (!req) return true;
  const { S } = sim;
  const a = affOf(sim);
  if (req.aff && !(a && a.tags.includes(req.aff))) return false;
  if (req.standing != null && S.track.standing < req.standing) return false;
  if (req.cap && zOf(S, req.cap) < (req.min ?? 0)) return false;
  if (req.edu != null && S.edu < req.edu) return false;
  if (req.flag && !S.flags[req.flag]) return false;
  if (req.year != null) { const y = sim.year; if (Array.isArray(req.year) ? (y < req.year[0] || y > req.year[1]) : y < req.year) return false; }
  if (req.race && !req.race.includes(S.race)) return false;
  if (req.status) { const k = req.status; if (k === 'noble' ? !S.status.noble : k === 'slave' ? !S.status.slave : !S.flags[k]) return false; }
  return true;
}
/** 평민 상한(A4 capStage): track.capStage[q] 또는 신분 */
function stageCap(sim, t) {
  const { S } = sim;
  let cap = t.stages.length - 1;
  if (S.status.noble) return cap;
  if (t.capStage) {
    const c = t.capStage['q' + S.q];
    if (c != null) cap = Math.min(cap, c);
  } else {
    const i = t.stages.findIndex((s) => s.capStage && s.capStage['q' + S.q]);   // W8: 단계에 capStage:{q1:true} = 그 단계가 상한
    if (i >= 0) cap = Math.min(cap, i);
    else if (t.A.flags.capStage && S.q <= 3) cap = Math.min(cap, Math.max(1, t.stages.length - 2));
  }
  return cap;
}

/** 승급(콘텐츠 헬퍼로도 쓰인다). 성공 true */
export function promote(sim, opts = {}) {
  const { S } = sim;
  const t = trackOf(sim); if (!t) return false;
  const tr = S.track;
  if (tr.stage >= t.stages.length - 1) return false;
  if (!opts.force && tr.stage >= stageCap(sim, t)) return false;
  const next = t.stages[tr.stage + 1];
  if (!opts.force && !requiresOk(sim, t.stages[tr.stage].promo && t.stages[tr.stage].promo.requires)) return false;
  S.trackHist.push({ id: tr.id, from: tr.stageSince, to: S.age, stage: t.stages[tr.stage].id, how: 'promo' });
  tr.stage++; tr.stageSince = S.age;
  if (next.contract) tr.flags.contractEnd = S.age + next.contract;
  tr.standing = clamp(tr.standing + T().promoStanding, 0, 100);
  if (!opts.quiet) {
    const a = affOf(sim);
    sim.log((a ? a.name + '에서 ' : '') + (next.title ? iga(next.title) + ' 되었습니다.' : ro(next.name) + ' 올라섰습니다.'), 'big', null, { h: 4 });
    sim.eff({ h: 4 });
  }
  return true;
}
export function demote(sim, opts = {}) {
  const { S } = sim;
  const t = trackOf(sim); if (!t) return false;
  const tr = S.track;
  if (tr.stage <= 0) { leaveTrack(sim, 'expel'); return true; }
  S.trackHist.push({ id: tr.id, from: tr.stageSince, to: S.age, stage: t.stages[tr.stage].id, how: 'demote' });
  tr.stage--; tr.stageSince = S.age; tr.standing = clamp(tr.standing - 15, 0, 100);
  if (!opts.quiet) sim.log(ro(t.stages[tr.stage].title || t.stages[tr.stage].name) + ' 내려앉았습니다.', 'loss', null, { h: -5 });
  sim.eff({ h: -5 });
  return true;
}

/** exits.fall 값 사전 적용(§3.5). value: death|prison:jail|prison:camp|exile|demote|expel|injured|infected|disgrace|arena:<ID>|switch:<ID>|{kind,to} */
export function applyExit(sim, value, cause = 'ruin') {
  const { S, rng } = sim;
  const t = trackOf(sim);
  const label = FALL_CAUSE_LABEL[cause] || cause;
  const v = typeof value === 'string' ? value : (value && value.kind ? value.kind + (value.to ? ':' + value.to : '') : 'expel');
  const [kind, arg] = v.split(':');
  const where = affOf(sim) ? affOf(sim).name : (t ? t.name : '');
  switch (kind) {
    case 'death': {
      const cid = arg || (sim.data.fallDeathCause && sim.data.fallDeathCause[cause]) || FALL_CAUSE_TO_DEATH[cause] || cause;
      if (t && t.A.flags.familyDeath && cause === 'vendetta') {
        const f = S.fam;
        if (f.partner && f.partner.alive && rng.chance(T().a1FamilyDeathP)) { f.partner.alive = false; f.widowed = true; }
        for (const k of f.kids) if (k.alive && rng.chance(T().a1FamilyDeathP)) { k.alive = false; S.stats.kidsLost++; }
      }
      leaveTrack(sim, 'death', { quiet: true });
      sim.die(cid, label);
      return 'death';
    }
    case 'prison': {
      const kindP = arg === 'camp' ? 'camp' : 'jail';
      leaveTrack(sim, 'prison', { quiet: true });
      S.prison = kindP; S.prisonLeft = kindP === 'camp' ? rng.ri(...T().campYears) : rng.ri(...T().jailYears);
      mulTies(S, 1 - B.cap.prisonTies);
      S.school = null;
      sim.log(label + '. ' + (kindP === 'camp' ? '수용소로 끌려갔습니다.' : '감옥에 갇혔습니다. ' + S.prisonLeft + '년.'), 'bad');
      return 'prison';
    }
    case 'exile': {
      leaveTrack(sim, 'exile', { quiet: true });
      S.status.stigma = S.status.stigma || 'exile';
      sim.log(label + '. 나라를 떠나야 했습니다.', 'bad');
      sim.migrate(cause === 'purge' || cause === 'impeach' ? 'asylum' : 'exile');
      return 'exile';
    }
    case 'demote': sim.log(label + '.', 'bad'); demote(sim); return 'demote';
    case 'expel': leaveTrack(sim, 'expel', { quiet: true }); sim.log(label + '. ' + (where ? eun(where) + ' 끝났습니다.' : '일자리를 잃었습니다.'), 'loss'); return 'expel';
    case 'injured': leaveTrack(sim, 'injured', { quiet: true }); sim.eff({ hl: -30 }); sim.log(label + '. 크게 다쳤고, 일을 계속할 수 없었습니다.', 'loss'); return 'injured';
    case 'infected': {
      leaveTrack(sim, 'infected', { quiet: true });
      if (!S.ori.on) sim.infect('work');
      sim.log(label + '. 진로가 끝났습니다.', 'loss');
      return 'infected';
    }
    case 'disgrace': {
      if (S.track) S.track.standing = 0;
      leaveTrack(sim, 'disgrace', { quiet: true });
      S.flags.disgraceAt = S.age; S.status.stigma = S.status.stigma || 'disgrace';
      sim.log(label + '. 이름에 금이 갔습니다.', 'loss');
      return 'disgrace';
    }
    case 'arena': case 'switch': {
      const to = arg;
      sim.log(label + '.', 'bad');
      if (to && sim.data.trackById[to]) { enterTrack(sim, to, { how: 'forced', via: cause }); return kind; }
      leaveTrack(sim, 'expel'); return 'expel';
    }
    default:
      leaveTrack(sim, 'expel'); return 'expel';
  }
}

/** 몰락(콘텐츠 헬퍼로도). cause 생략 시 단계 causes 가중 롤 */
export function fall(sim, cause) {
  const { S, rng } = sim;
  const t = trackOf(sim); if (!t) return false;
  const st = t.stages[Math.min(S.track.stage, t.stages.length - 1)];
  const c = cause || rng.pick(st.fall.causes.length ? st.fall.causes : t.A.causes);
  if (!c) return false;
  let v = t.exits.fall[c] ?? t.A.exits[c] ?? 'expel';
  S.flags.lastFall = c; S.flags.lastFallAt = S.age; S.flags.lastFallOutcome = typeof v === 'string' ? v.split(':')[0] : 'expel';
  if (typeof v === 'string' && v.startsWith('death') && !t.forced && !rng.chance(T().deathSoften)) v = ['kia', 'raid', 'vendetta', 'accident', 'injury', 'catastrophe', 'beast', 'seaborn'].includes(c) ? 'injured' : 'expel';
  return applyExit(sim, v, c);
}

/** 자발 전직 */
export function switchTrack(sim, id, how = 'switch') {
  const { S } = sim;
  if (!sim.data.trackById[id]) return false;
  const from = trackOf(sim);
  const ok = enterTrack(sim, id, { how, quiet: true });
  if (ok && from) sim.log(eul(from.name) + ' 떠나 ' + ro(sim.data.trackById[id].name) + ' 옮겼습니다.', 'ev');
  return ok;
}

/** 은퇴(진로 쪽). retire.to 가 있으면 생업으로 옮기고, 없으면 진로 종료 + S.retired */
export function retireTrack(sim, opts = {}) {
  const { S } = sim;
  const t = trackOf(sim); if (!t) return false;
  const r = t.exits.retire;
  // W11: 데이터의 retire.to 가 자기 자신(생업 25개)이면 '그 나이에 은퇴'로 본다(매년 같은 진로로 재진입하던 버그)
  if (r && r.to && !opts.full && r.to !== t.id && sim.data.trackById[r.to]) {
    const name = t.name;
    enterTrack(sim, r.to, { how: 'retire', quiet: true });
    sim.log(eul(name) + ' 그만두고 ' + ro(sim.data.trackById[r.to].name) + ' 돌아갔습니다.', 'ev');
    return true;
  }
  leaveTrack(sim, 'retire', { quiet: true });
  const st = sim.nation.stats;
  S.pension = st.ppp > 1500 ? Math.round(S.income * 0.3) : 0;
  S.retired = true;
  if (!opts.quiet) sim.log('은퇴했습니다.' + (S.pension ? ' 적은 연금이 나옵니다.' : ' 연금 같은 것은 없습니다.'), 'ev');
  return true;
}

// ── 연말 처리(§3.3) ─────────────────────────────────────────────────────
export function fallMul(sim, t) {
  const { S } = sim;
  let m = 1;
  if (S.flags.war) m *= (t.A.flags.warFall || t.archetype === 'A6') ? T().warFallMul : 1.5;
  if (sim.nation.conflict >= 3) m *= T().conflict3Mul;
  if (S.flags.quarantined) m *= 1.3;
  return m;
}

export function trackYear(sim) {
  const { S, rng } = sim;
  if (S.phase !== 'life') return;
  // 콘텐츠가 S.job 을 지웠다면(해고 서사) 진로도 끝난 것으로 본다
  if (S.track && S.job == null) { leaveTrack(sim, 'content', { quiet: true }); }
  const t = trackOf(sim);
  if (!t) return;
  const tr = S.track;
  if (S.prison && !t.forced && !(t.stages[tr.stage] && t.stages[tr.stage].forced)) { leaveTrack(sim, 'prison', { quiet: true }); return; }
  tr.years++; S.jobY = tr.years;
  const st = t.stages[Math.min(tr.stage, t.stages.length - 1)];
  const a = affOf(sim);
  const mods = a ? a.mods : { promo: 1, fall: 1, income: 1 };
  const fw = S.focusW || {};

  // 역량 성장(재직)
  const capKey = st.promo ? st.promo.cap : t.A.promoCap;
  if (capKey !== 'looks' && capKey !== 'luck') addCap(S, capKey, T().growCap, t.stages.length * T().growCapMaxPerStage + T().growCapBase);
  // standing: 초점 '일'·'가족/친구'(ties) + 잡음
  let dS = rng.norm(0, T().standingDrift) + (fw.work || 0) * T().standingWork + (fw.family || 0) * 1;
  if (t.A.flags.season) dS += clamp(rng.norm(2 * zOf(S, 'skill'), 4), -12, 12);      // A2 시즌 롤
  if (t.A.flags.fameStanding) dS += clamp(1.5 * S.innate.looks + rng.norm(0, 3), -8, 8); // A12 명성
  tr.standing = clamp(tr.standing + dS, 0, 100);

  // 승급
  if (st.promo && tr.stage < t.stages.length - 1 && S.age - tr.stageSince >= (st.minYears ?? 0) && tr.stage < stageCap(sim, t) && requiresOk(sim, st.promo.requires)) {
    let p = st.promo.k * (1 + zOf(S, st.promo.cap)) * (0.5 + tr.standing / 100) * mods.promo;
    if (t.A.flags.omenPromo && !S.flags.omen) p *= T().a7PromoMul;
    p = clamp(p, 0, T().promoMax);
    if (rng.chance(p)) { promote(sim); S.flags.omen = false; }
  }
  if (S.phase !== 'life' || !S.track) return;
  // 몰락
  {
    let p = (st.fall.base ?? t.A.fallBase) * T().fallScale * mods.fall * (1 - T().luckFall * S.innate.luck) * fallMul(sim, t);
    if (t.A.flags.season && tr.standing < 10) p = Math.max(p, 0.5);
    if (st.fall.causes.length && rng.chance(clamp(p, 0, 0.9))) {
      const c = rng.pick(st.fall.causes);
      fall(sim, c);
      if (S.phase !== 'life' || !S.track) return;
    }
  }
  // A4 복무 기간·A6 계약 만료
  if (t.A.flags.term && tr.stage === 0 && !st.forced && tr.years >= (t.term || 4) && !(t.term === 0)) {
    if (!rng.chance(T().a4TermReenlist)) { const name = t.name; leaveTrack(sim, 'discharged', { quiet: true }); sim.log(t.A.name === '군단·징집' ? '복무 기간이 끝나 ' + eul(name) + ' 떠났습니다.' : eul(name) + ' 마쳤습니다.', 'ev'); return; }
    tr.years = 0;
  }
  if ((t.contract || st.contract) && tr.flags.contractEnd != null && S.age >= tr.flags.contractEnd) tr.flags.contractDue = true;
  // 은퇴(종족 lifeMul 보정) / 건강. 강제 진로·강제 단계는 떠날 수 없다
  const locked = t.forced || st.forced;
  const r = t.exits.retire;
  if (!locked && r && r.age && humanAge(S.age, sim.race.lifeMul) >= r.age) { retireTrack(sim); return; }
  if (!locked && S.st.hl < T().retireHealth && humanAge(S.age, sim.race.lifeMul) >= 45) { retireTrack(sim, { full: true }); return; }
}

/** 감염 판정 직후 진로 반응(§4 A2 arena / A7 자진 사퇴 / A6 계약 해지). oripathy.diagnose 가 부른다 */
export function onDiagnosed(sim) {
  const { S } = sim;
  const t = trackOf(sim); if (!t) return;
  if (t.A.flags.infectedArena && T().a2InfectedArena) {
    const v = t.exits.fall.infected || (t.exits.arena ? 'arena:' + t.exits.arena : null) || (t.arena ? 'arena:' + t.arena : 'expel');
    applyExit(sim, v, 'infected');
  } else if (t.A.flags.infectedResign) {
    const name = t.name; leaveTrack(sim, 'infected', { quiet: true }); sim.log('감염을 안 뒤 스스로 ' + eul(name) + ' 내려놓았습니다.', 'loss');
  } else if (t.exits.fall.infected && t.archetype === 'A6') {
    applyExit(sim, t.exits.fall.infected, 'infected');
  }
}

/** 소득(§3.3-4). LMD. 생업(job 필드)은 jobs.json lo/hi 백분위를 쓰되 drift 없음 */
export function trackIncomeMul(sim) {
  const { S } = sim;
  const t = trackOf(sim); if (!t) return 0;
  const tr = S.track;
  const a = affOf(sim);
  return (t.income.stage[Math.min(tr.stage, t.income.stage.length - 1)] ?? 1) * (a ? a.mods.income : 1) * (1 + T().skillIncome * zOf(S, 'skill'));
}

/** 전직 후보(exits.switch 중 지금 들어갈 수 있는 것) */
export function switchCandidates(sim) {
  const t = trackOf(sim); if (!t) return [];
  const all = entryCandidates(sim, { exclude: t.id });
  return all.filter((c) => t.exits.switch.includes(c.id));
}
