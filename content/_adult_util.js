// 성인기 구 팩(adult_family·adult_money·adult_infected·elder)이 쓰는 공용 도우미. W11 에서 폐기한 adult_work.js 에서 옮겨 왔다.
import { makeName, familyNames } from '../src/engine/names.js';
import { humanAge } from '../src/engine/lifetable.js';

/** 그 해 한 번만 굴리는 확률 롤. 결정 ok() 는 planYear 와 openDecision 에서 두 번 평가되므로 결과를 나이와 함께 flags 에 둔다 */
export function yr(s, key, p) {
  const k = 'yr_' + key;
  const v = s.S.flags[k];
  if (v && v.a === s.S.age) return v.ok;
  const ok = s.rng.chance(p);
  s.S.flags[k] = { a: s.S.age, ok };
  return ok;
}
export const hum = (s) => humanAge(s.S.age, s.race.lifeMul);
export const adult = (s) => s.S.age >= 19 && !s.S.school && !s.S.serving && !s.S.prison;
export const working = (s) => adult(s) && !!s.S.job && s.S.job !== 'homemaker' && !s.S.retired;
export const homemaker = (s) => s.S.job === 'homemaker';
export const jobIs = (s, ...ids) => !!s.S.job && ids.includes(s.S.job);
export const partner = (s) => (s.S.fam.partner && s.S.fam.partner.alive ? s.S.fam.partner : null);
export const kids = (s) => s.S.fam.kids.filter((k) => k.alive);
export const kidAge = (s, k) => s.S.age - k.bornAt;
/** 최근 3년 소득 백분위 변화 */
export function pct3(s) {
  const y = s.S.years;
  if (y.length < 4) return 0;
  return y[y.length - 1].pct - y[y.length - 4].pct;
}
/** 진단 시점 정책(없으면 현재 해석 정책) */
export const pol = (s) => s.S.flags.oriPolicy || s.policy;
/** 동료·지인 이름 하나 */
export function someone(s, sex) {
  return makeName(s.data, s.rng, { lang: s.nation.nameLang, sex: sex || (s.rng.chance(0.5) ? 'M' : 'F'), race: s.S.race, avoid: familyNames(s.S) }).given;
}
export const fmtLMD = (n) => Math.round(n).toLocaleString() + ' LMD';
