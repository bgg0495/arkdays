// 콘텐츠 공용 도우미(W4a). 국가 문화·기관명 치환, 각주 조립, 조사.
// 모든 함수는 ctx(sim)를 첫 인자로 받는다(D23).
import { eul, iga, eun, wa, ro, ieot, aya, rago } from '../src/engine/text.js';
import { trackName } from '../src/engine/track.js';
export { eul, iga, eun, wa, ro, ieot, aya, rago };

/** 국가 문화 객체(없으면 빈 기본값) */
export function cul(s) {
  return s.nation.culture || { festivals: ['명절'], greet: '안녕하십니까', address: '씨', elder: '어르신', food: '빵', ruler: '정부', rulerTitle: '각하', drink: '물' };
}
/** 세계관 내 기록 기관명 */
export function org(s) { const f = faction(s); return f ? f + ' 등기소' : (s.nation.statOrg || (s.nation.name + ' 기록소')); }   // W12(D51-7): 볼리바르는 출생 진영 등기소
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
/** W12(D51-1): 구 지식·관계 막대(0~100) 대체 — 역량 z 를 50 ± 15·z 로 읽는다. 구 콘텐츠의 st.sm/st.so 식은 전부 이것을 쓴다 */
export const learn100 = (s) => 50 + 15 * (s.S.cap ? s.S.cap.learn : 0);
export const ties100 = (s) => 50 + 15 * (s.S.cap ? s.S.cap.ties : 0);
export const skill100 = (s) => 50 + 15 * (s.S.cap ? s.S.cap.skill : 0);
/** 확률 → "n%" (NaN·범위 밖이면 '—'). 선택지 sub 의 성공 확률 표기는 전부 이것을 쓴다(D53c) */
export const pctText = (p) => (Number.isFinite(p) ? Math.round(Math.max(0, Math.min(1, p)) * 100) + '%' : '—');
/** W12(D51-7): 볼리바르 출생 진영 이름. S.sub.region(birth.js 가 balance.regions 로 롤) → nations.json culture.factions. 타국 출생 이주자는 거주지에서 한 번 롤 */
export function faction(s) {
  const S = s.S; const n = s.nation;
  const tbl = (n.culture && n.culture.factions) || null;
  if (!tbl) return null;
  S.sub = S.sub || {};
  if (!tbl[S.sub.region]) { const keys = Object.keys(tbl); S.sub.region = keys[Math.floor(s.rng.rnd() * keys.length)]; }
  return tbl[S.sub.region];
}
/** 볼리바르 등기소 각주용: "싱가스 왕조 등기소" */
export const factionOrg = (s) => { const f = faction(s); return f ? f + ' 등기소' : org(s); };
/** 아츠 적성 상위 10% */
export const artsTop = (s) => s.S.arts >= 1.28;
/** 아츠 적성 하위 25% */
export const artsLow = (s) => s.S.arts <= -0.67;

/** 형제 이름 목록(동생 탄생 이벤트가 채움) */
export const sibs = (s) => s.S.fam.sibs || [];
/** 가장 최근 동생 */
export const youngest = (s) => { const l = sibs(s); return l.length ? l[l.length - 1] : null; };

/** 직업 이름. W12(D51-8): S.job 이 진로 id(income.job 없는 진로)면 진로 이름(현재 진로면 소속·칭호)으로 — id 를 문장에 내보내지 않는다 */
export const jobName = (s, id) => {
  if (!id) return '일';
  const j = s.data.jobById[id]; if (j) return j.name;
  const t = s.data.trackById && s.data.trackById[id];
  if (t) return (s.S.track && s.S.track.id === id && trackName(s)) || t.name;
  return /^[A-Z][A-Z0-9_]+$/.test(String(id)) ? '일' : String(id);
};
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
