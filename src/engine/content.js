// 이벤트·결정·대사건 스키마(§3.5)와 레지스트리.
// 원작과 달리 전역 S가 없으므로 모든 콜백은 ctx(=sim)를 첫 인자로 받는다:
//   이벤트  { id, a:[min,max], tags?, c?(ctx)=>bool, w?:number|(ctx)=>number, gap?, rep?, run(ctx)=>string|{t,k,f,fx} }
//   결정    { id, tags?, ok?(ctx,p)=>bool, once?(기본 true), gap?, at?(0~1), build(ctx,p)=>{title,body,fact,choices:[{k,label,sub,auto?}],input?}|null,
//             apply(ctx,k,p,text)=>string|{t,k,f,fx}|false }
//   대사건  { id, nation?, year, month?, a?:[min,max], once?(기본 true), tags?, c?(ctx)=>bool, run(ctx)=>string|{t,k,f,fx} }
// 결정은 매년 planYear 가 ok() 를 평가해 큐에 넣는다(앞 2개). tags 는 전부 S 의 태그 집합에 들어 있어야 한다.

export const KINDS = ['ev', 'bad', 'big', 'warm', 'loss', 'note', 'dec', 'death', 'sys'];

export function createRegistry() {
  const R = { events: [], evById: {}, decisions: {}, big: [], bigById: {} };
  // 같은 id 를 두 번 받으면 경고(W11): 이벤트·대사건은 둘 다 남고(id 조회는 뒤의 것), 결정은 뒤의 것이 앞의 것을 대체한다
  R.dupes = [];
  const dupe = (kind, id) => { R.dupes.push(kind + ':' + id); if (typeof console !== 'undefined' && !R.quiet) console.warn('[registry] ' + kind + ' id 중복: ' + id); };
  R.addEvents = (list) => { for (const e of list) { validateEvent(e); if (R.evById[e.id]) dupe('event', e.id); R.events.push(e); R.evById[e.id] = e; } return R; };
  R.addDecisions = (listOrObj) => {
    const list = Array.isArray(listOrObj) ? listOrObj : Object.entries(listOrObj).map(([id, d]) => ({ id, ...d }));
    for (const d of list) { validateDecision(d); if (R.decisions[d.id]) dupe('decision', d.id); R.decisions[d.id] = d; }
    return R;
  };
  R.addBig = (list) => { for (const b of list) { validateBig(b); if (R.bigById[b.id]) dupe('big', b.id); R.big.push(b); R.bigById[b.id] = b; } return R; };
  R.use = (pack) => {
    if (pack.events) R.addEvents(pack.events);
    if (pack.decisions) R.addDecisions(pack.decisions);
    if (pack.big) R.addBig(pack.big);
    return R;
  };
  return R;
}

function validateEvent(e) {
  if (!e.id || typeof e.run !== 'function') throw new Error('event schema: id/run 필요 (' + (e.id || '?') + ')');
  if (!Array.isArray(e.a) || e.a.length !== 2) throw new Error('event ' + e.id + ': a:[min,max] 필요');
  e.tags = e.tags || [];
}
function validateDecision(d) {
  if (!d.id || typeof d.build !== 'function' || typeof d.apply !== 'function') throw new Error('decision schema: id/build/apply 필요 (' + (d.id || '?') + ')');
  d.tags = d.tags || [];
  if (d.once === undefined) d.once = true;
}
function validateBig(b) {
  if (!b.id || typeof b.run !== 'function' || b.year == null) throw new Error('big event schema: id/year/run 필요 (' + (b.id || '?') + ')');
  b.tags = b.tags || [];
  if (b.once === undefined) b.once = true;
  b.a = b.a || [0, 999];
}

/** S 의 태그 집합: 국가·상위국가·종족·소수민족·감염·직업·거주·성별·정책·위협·등급 + v1(track/aff/archetype/newcomer/rel/rhodes/papers/visit/cap 등급).
 *  visit 을 주면 국가 태그를 그 방문국으로 바꾼 집합(§7.4 순회형 피드) */
export function tagsOf(sim, visit = null) {
  const { S, race } = sim;
  const nation = visit ? sim.data.nationById[visit] : sim.nation;
  const cur = visit || S.cur, root = visit ? (sim.data.nationById[visit].parent || visit) : S.root;
  const t = new Set([cur, root, S.born, 'nation:' + cur, 'nation:' + root, S.race, 'race:' + S.race, S.sex, S.sex === 'F' ? 'female' : 'male',
    S.urban ? 'urban' : 'rural', 'q' + S.q,
    S.home.type, S.home.type + '_' + S.home.deck, 'policy:' + sim.policy,
    'ori' + nation.oriExp, 'cat' + nation.catFreq, 'conflict' + nation.conflict]);
  if (visit) t.add('visit:' + visit);
  // v1
  if (S.track) {
    const tr = sim.data.trackById[S.track.id];
    t.add('track:' + S.track.id);
    if (tr) { const st = tr.stages[Math.min(S.track.stage, tr.stages.length - 1)]; if (st) t.add('track:' + S.track.id + ':' + st.id); if (tr.archetype === 'A10') t.add('archetype:A10'); t.add('arch:' + tr.archetype); if (tr.itinerant) t.add('itinerant'); }
    if (S.track.aff) t.add('aff:' + S.track.aff);
  }
  if (S.res) { if (S.res.phase === 'settling') t.add('newcomer'); if (S.res.papers && S.res.papers !== 'native') t.add('papers:' + S.res.papers); if (S.res.phase === 'naturalized') t.add('naturalized'); if (S.cur !== S.born) t.add('migrant'); }
  if (S.rel) t.add('rel:' + S.rel);
  if (S.rhodes && S.rhodes !== true) { t.add('rhodes:' + S.rhodes.dept); t.add('rhodes_' + S.rhodes.status); }
  if (S.status) { if (S.status.noble) t.add('noble'); if (S.status.slave) t.add('slave'); if (S.status.stigma) t.add('stigma:' + S.status.stigma); }
  if (S.home.housing) t.add('home:' + S.home.housing);
  if (S.home.owned) t.add('homeowner');
  if (S.fam.marriage) t.add('marriage:' + S.fam.marriage.type);
  if (S.cap) for (const k of ['skill', 'learn', 'arts', 'ties']) t.add('cap:' + k + ':' + capKey(S.cap[k]));
  if (S.innate && S.innate.looks > 1.5) t.add('looks:high'); else if (S.innate && S.innate.looks < -1.5) t.add('looks:low');
  if (S.eth) t.add(S.eth);
  if (S.flags.bornInfected) t.add('born_infected');
  if (S.flags.minerFamily) t.add('miner_family');
  if (S.flags.childLabor != null) t.add('child_labor');
  if (S.job && S.age < 15) t.add('working_child');
  for (const key of ['mom', 'dad']) if (S.fam[key] && S.fam[key].job) t.add('parent:' + S.fam[key].job);
  if (S.prison === 'camp') t.add('camp');
  if (S.ori.on) { t.add('infected'); t.add('ori_stage' + S.ori.stage); if (S.ori.known) t.add('known'); }
  if (S.job) t.add('job:' + S.job);
  if (S.serving) t.add('serving');
  if (S.prison) t.add('prison:' + S.prison);
  if (S.rhodes) t.add('rhodes');
  if (S.retired) t.add('retired');
  if (S.school) t.add('school');
  if (S.fam.married) t.add('married');
  if (S.flags.war) t.add('war');
  if (race.group) t.add(race.group);
  for (const th of nation.threats || []) t.add('threat:' + th);
  for (const tr of race.traits || []) t.add('trait:' + tr);
  return t;
}
const capKey = (z) => (z < -0.8 ? 'low' : z < 0.5 ? 'mid' : z < 1.4 ? 'high' : 'top');

/** 사인용 태그 판정: 같은 접두(threat:, nation:)끼리는 OR, 접두 그룹끼리는 AND. '!' 는 부정. */
export function tagsOkGrouped(tags, set) {
  const groups = new Map();
  for (const tg of tags) {
    if (tg.startsWith('!')) { if (set.has(tg.slice(1))) return false; continue; }
    const i = tg.indexOf(':');
    const g = i > 0 ? tg.slice(0, i) : tg;
    if (!groups.has(g)) groups.set(g, false);
    if (set.has(tg)) groups.set(g, true);
  }
  for (const ok of groups.values()) if (!ok) return false;
  return true;
}

export function tagsOk(tags, set) {
  for (const tg of tags) {
    if (tg.startsWith('!')) { if (set.has(tg.slice(1))) return false; }
    else if (!set.has(tg)) return false;
  }
  return true;
}

/** 올해 피드 이벤트 추첨(중복 없이). recent 14개 안에 있으면 ×0.08(rep면 ×0.5), gap 미경과 제외 */
export function chooseFeed(sim, used, visit = null) {
  const { S, rng, content } = sim;
  const tags = tagsOf(sim, visit);
  const cands = [];
  for (const e of content.events) {
    if (used.has(e.id)) continue;
    if (S.age < e.a[0] || S.age > e.a[1]) continue;
    if (!tagsOk(e.tags, tags)) continue;
    const last = S.flags['ev_' + e.id];
    if (last != null) {
      if (!e.rep && !e.gap) continue;
      if (e.gap && S.age - last < e.gap) continue;
    }
    if (e.c && !e.c(sim)) continue;
    let w = typeof e.w === 'function' ? e.w(sim) : (e.w ?? 1);
    if (S.recent.includes(e.id)) w *= e.rep ? 0.5 : 0.08;
    if (w > 0) cands.push([e.id, w]);
  }
  if (!cands.length) return null;
  return content.evById[rng.wpick(cands)];
}

/** 올해 열릴 결정 후보(게이트 통과 순) */
export function scheduledDecisions(sim) {
  const { S, content } = sim;
  const tags = tagsOf(sim);
  const out = [];
  for (const d of Object.values(content.decisions)) {
    if (d.once && S.done[d.id]) continue;
    if (d.gap && S.flags['last_' + d.id] != null && S.age - S.flags['last_' + d.id] < d.gap) continue;
    if (!tagsOk(d.tags, tags)) continue;
    if (d.ok && !d.ok(sim, {})) continue;
    out.push(d);
  }
  return out;
}

/** 올해 발화할 대사건(연도+나이 게이트) */
export function dueBigEvents(sim) {
  const { S, content } = sim;
  const year = S.by + S.age;
  const tags = tagsOf(sim);
  const out = [];
  for (const b of content.big) {
    if (b.year !== year) continue;
    if (b.once && S.flags['big_' + b.id] != null) continue;
    const visit = S.res && S.res.itinerantAt;   // §7.4: 대사건은 거주국과 방문국 둘 다
    if (b.nation && b.nation !== S.cur && b.nation !== S.root && b.nation !== visit) continue;
    if (S.age < b.a[0] || S.age > b.a[1]) continue;
    if (!tagsOk(b.tags, tags)) continue;
    if (b.c && !b.c(sim)) continue;
    out.push(b);
  }
  return out;
}
