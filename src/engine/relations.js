// 종족 관계 매트릭스(§9, D49). 국가×종족 → 등급 {exclude, institutional, cultural, subtle, neutral, favored}.
// 캐논 근거 있는 조합만 pairs 에 있고, 없으면 default(neutral). 살카즈는 sarkaz_default 로 전 세계 기본 '편견' + 국가별 강도.
import { BALANCE as B } from './balance.js';
import { rootOf } from './data.js';

export const GRADES = ['exclude', 'institutional', 'cultural', 'subtle', 'neutral', 'favored'];
export const GRADE_LABEL = { exclude: '배제', institutional: '제도적 차별', cultural: '문화적 멸시', subtle: '은근한 편견', neutral: '무관', favored: '우대' };
export const gradeRank = (g) => { const i = GRADES.indexOf(g); return i < 0 ? GRADES.indexOf('neutral') : i; };

/**
 * relOf(data, nationId, raceId, year?, opts?) → 등급 문자열.
 * pairs 는 nation(또는 상위 국가), race('!x' 는 x 외 전부), since(연도), scope(null 이면 일반. 'track:ID' 는 opts.track 이 맞을 때만)
 */
export function relOf(data, nationId, raceId, year = 9999, opts = {}) {
  const R = data.relations;
  if (!R || !nationId || !raceId) return 'neutral';
  const root = rootOf(data, nationId);
  let best = null;
  for (const p of R.pairs) {
    if (p.nation !== nationId && p.nation !== root) continue;
    if (p.since != null && year < p.since) continue;
    if (p.until != null && year > p.until) continue;
    if (p.scope) { if (!opts.track || p.scope !== 'track:' + opts.track) continue; }
    let hit;
    const neg = typeof p.race === 'string' && p.race.startsWith('!');
    if (p.eth) hit = opts.eth === p.eth;                        // 민족 플래그(가울 유민 등)
    else {
      const r = neg ? p.race.slice(1) : p.race;
      hit = Array.isArray(p.race) ? p.race.includes(raceId) : (neg ? raceId !== r : raceId === r);
    }
    if (!hit) continue;
    // 더 구체적인(부정 아님·scope 있음·하위 국가) 항목 우선
    const spec = (neg ? 0 : 2) + (p.scope ? 4 : 0) + (p.nation === nationId ? 1 : 0);
    if (!best || spec > best.spec) best = { grade: p.grade, spec };
  }
  if (best) return best.grade;
  if (raceId === 'sarkaz' && R.sarkazDefault) {
    const by = R.sarkazDefault.by || {};
    for (const id of [nationId, root]) {
      if (by[id] != null) {
        const since = by[id + '_since'];
        if (since == null || year >= since) return by[id];
        return R.sarkazDefault.grade || 'subtle';
      }
    }
    return R.sarkazDefault.grade || 'subtle';
  }
  return R.default || 'neutral';
}

/** 현재 거주국×종족 등급을 S.rel 에 캐시(이주·귀화·연도 조건 변화 시 재계산) */
export function refreshRel(sim) {
  const { S, data } = sim;
  S.rel = relOf(data, S.cur, S.race, S.by + S.age, { eth: S.eth });
  return S.rel;
}

/** 진입 가중 배율(§5). 데이터 relations.relMul 이 있으면 그것 */
export function relMul(grade, data) { const m = (data && data.relations && data.relations.relMul) || B.rel.mul; return m[grade] ?? 1; }
/** 소득 배율(§9) */
export function relIncomeMul(grade) { return B.rel.income[grade] ?? 1; }
/** 범죄 피해·분쟁 피해 배율(§9) */
export function relCrimeMul(grade) { return B.rel.crime[grade] ?? 1; }
/** 결혼 반대 롤 대상 등급인가(§8·§9) */
export function relOpposesMarriage(grade) { return B.rel.marriageOppose.includes(grade); }

/** gate { rel: "<=cultural" } 류 비교: 현재 등급이 기준 이상으로 좋아야 통과. "<=x" 는 x 보다 나쁘면 불가(즉 rank ≥ rank(x)) */
export function relGateOk(grade, expr) {
  if (!expr) return true;
  const m = /^(<=|>=|==|!=|<|>)?\s*(\w+)$/.exec(String(expr).trim());
  if (!m) return true;
  const op = m[1] || '>=', ref = gradeRank(m[2]), cur = gradeRank(grade);
  // 의미: "<=cultural" = 문화적 멸시까지는 허용(그보다 나쁜 제도적·배제는 불가) → cur ≥ ref
  switch (op) {
    case '<=': case '>=': return cur >= ref;
    case '<': case '>': return cur > ref;
    case '==': return cur === ref;
    case '!=': return cur !== ref;
  }
  return true;
}

/** 출생 종족 가중: exclude 조합은 0 */
export function raceWeightsFor(data, nation) {
  const w = Object.keys(nation.races).length ? { ...nation.races } : Object.fromEntries(data.races.map((r) => [r.id, 1]));
  for (const rid of Object.keys(w)) if (relOf(data, nation.id, rid, 1080) === 'exclude') w[rid] = 0;
  return w;
}
