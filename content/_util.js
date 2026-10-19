// 콘텐츠 공용 도우미(W4a). 국가 문화·기관명 치환, 각주 조립, 조사.
// 모든 함수는 ctx(sim)를 첫 인자로 받는다(D23).
import { eul, iga, eun, wa, ro, ieot, aya, rago } from '../src/engine/text.js';
export { eul, iga, eun, wa, ro, ieot, aya, rago };

/** 국가 문화 객체(없으면 빈 기본값) */
export function cul(s) {
  return s.nation.culture || { festivals: ['명절'], greet: '안녕하십니까', address: '씨', elder: '어르신', food: '빵', ruler: '정부', rulerTitle: '각하', drink: '물' };
}
/** 세계관 내 기록 기관명 */
export function org(s) { return s.nation.statOrg || (s.nation.name + ' 기록소'); }
/** 명절 이름. i 를 주면 그 순번, 없으면 무작위 */
export function fest(s, i) {
  const f = cul(s).festivals || ['명절'];
  return i == null ? s.rng.pick(f) : f[i % f.length];
}
/** 각주 괄호 */
export const F = (text) => '(' + text + ')';
/** 기관 각주: "(흠천감 호적 대장, 1093년)" */
export function orgF(s, doc, year) { return F(org(s) + ' ' + doc + (year == null ? '' : ', ' + year + '년')); }
/** 로도스 의료부 각주 */
export function rhodesF(doc) { return F('로도스 아일랜드 의료부 ' + doc); }

export const given = (s) => s.S.name.given;
export const momName = (s) => s.S.fam.mom.name;
export const dadName = (s) => s.S.fam.dad.name;
export const dadHere = (s) => s.S.fam.dad.alive && !s.S.fam.dad.absent;
export const momHere = (s) => s.S.fam.mom.alive;
export const poor = (s) => s.S.q <= 2;
export const rich = (s) => s.S.q >= 4;
export const nomadic = (s) => s.S.home.type === 'nomadic';
export const upper = (s) => nomadic(s) && s.S.home.deck === 'upper';
export const under = (s) => nomadic(s) && s.S.home.deck === 'under';
/** 아츠 적성 상위 10% */
export const artsTop = (s) => s.S.arts >= 1.28;
/** 아츠 적성 하위 25% */
export const artsLow = (s) => s.S.arts <= -0.67;

/** 형제 이름 목록(동생 탄생 이벤트가 채움) */
export const sibs = (s) => s.S.fam.sibs || [];
/** 가장 최근 동생 */
export const youngest = (s) => { const l = sibs(s); return l.length ? l[l.length - 1] : null; };

/** 직업 이름 */
export const jobName = (s, id) => { const j = id && s.data.jobById[id]; return j ? j.name : (id || '일'); };
export const dadJob = (s) => jobName(s, s.S.fam.dad.job);
export const momJob = (s) => jobName(s, s.S.fam.mom.job);

/** 생애 1회 롤: 처음 물을 때 확률 p 로 참/거짓을 정해 flags 에 저장하고 그 뒤로는 같은 답. "모든 생에 다 일어나지는 않는" 이벤트의 c 에 쓴다 */
export function lifeRoll(s, key, p) {
  const k = 'roll_' + key;
  if (s.S.flags[k] === undefined) s.S.flags[k] = s.rng.chance(p);
  return s.S.flags[k];
}
/** 한 번만 세우는 플래그. 이미 있으면 false */
export function once(s, key) { if (s.S.flags[key]) return false; s.S.flags[key] = s.S.age; return true; }
/** 중위소득의 비율을 LMD 정수로 */
export const medX = (s, k) => Math.round(s.med * k);
