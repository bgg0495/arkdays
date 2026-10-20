// 역량(cap: skill·learn·arts·ties)·타고남(innate: looks·luck·trait) — §6. (명세 §2 의 `born` 은 기존 S.born(출생 국가)과 겹쳐 `innate` 로 둔다)
// 전부 숨은 z값(평균 0, 표준편차 1, −3~+3). 표시는 grade(z) 4등급.
import { clamp } from './rng.js';
import { humanAge } from './lifetable.js';
import { BALANCE as B } from './balance.js';

export const CAP_KEYS = ['skill', 'learn', 'arts', 'ties'];
export const CAP_LABEL = { skill: '기량', learn: '학식', arts: '아츠', ties: '관계', looks: '외모', luck: '운' };
const Z_MIN = -3, Z_MAX = 3;
export const zc = (z) => clamp(+z || 0, Z_MIN, Z_MAX);

/** z → 4등급 라벨(§2): <−0.8 낮음 / <0.5 보통 / <1.4 높음 / 뛰어남 */
export function grade(z) {
  z = +z || 0;
  for (const [cut, label] of B.cap.grades) if (z < cut) return label;
  return B.cap.grades[B.cap.grades.length - 1][1];
}
export function gradeKey(z) { return ['low', 'mid', 'high', 'top'][B.cap.grades.findIndex(([cut]) => (+z || 0) < cut)] || 'top'; }

/** 로지스틱 적합도(§5): logistic(z − shift), 0.2~1.0 로 눌러 쓴다 */
export function fit(z, shift = B.cap.fitShift ?? B.track.fitShift) {
  const p = 1 / (1 + Math.exp(-((+z || 0) - shift)));
  return clamp(0.2 + 0.8 * p, 0.2, 1);
}

/** 출생 롤(§6.1). race.skillApt 없으면 0 */
export function rollCaps(rng, { q, race }) {
  const sd = B.cap.sd;
  const cap = {
    skill: rng.norm(0, sd) + (race.skillApt || 0),
    learn: rng.norm(0, sd) + (q - 3) * B.cap.qLearn,
    arts: rng.norm(0, sd) + (race.artsApt || 0),
    ties: rng.norm(0, sd) + (q - 3) * B.cap.qTies,
  };
  for (const k of CAP_KEYS) cap[k] = +zc(cap[k]).toFixed(3);
  const innate = { looks: +zc(rng.norm(0, 1)).toFixed(3), luck: +zc(rng.norm(0, 1)).toFixed(3), trait: null };
  return { cap, innate };
}

/** 역량 z 증감(상한·하한 clamp). 로그 없음 */
export function addCap(S, k, dz, max = Z_MAX) {
  if (!S.cap || !(k in S.cap) || !dz) return;
  const cur = S.cap[k];
  const next = dz > 0 ? Math.min(Math.max(cur, max), cur + dz) : cur + dz;   // 상한을 이미 넘었으면 유지
  S.cap[k] = +zc(next).toFixed(3);
}
export function mulTies(S, keep) { if (S.cap) S.cap.ties = +zc(S.cap.ties >= 0 ? S.cap.ties * keep : S.cap.ties - (1 - keep) * 0.5).toFixed(3); }

/** 구 fx {sm, so} 호환(§2): sm→learn, so→ties, 1점 = 0.01z */
export function applyLegacyFx(S, fx) {
  if (!fx || !S.cap) return;
  if (fx.sm) addCap(S, 'learn', fx.sm * B.cap.legacyFx);
  if (fx.so) addCap(S, 'ties', fx.so * B.cap.legacyFx);
  if (fx.cap) for (const [k, v] of Object.entries(fx.cap)) addCap(S, k, v);
  if (fx.standing && S.track) S.track.standing = clamp(S.track.standing + fx.standing, 0, 100);
}

/** 기질이 정해진 해(childhood 결정)에 한 번 보정 */
export function applyTrait(S) {
  if (!S.trait || !S.innate || S.innate.trait === S.trait) return;
  S.innate.trait = S.trait;
  const fx = B.cap.trait[S.trait];
  if (fx) for (const [k, v] of Object.entries(fx)) addCap(S, k, v);
}

/** 연말 성장·쇠퇴(§6.2). 재직 성장은 track.js 가 한다 */
export function capYear(sim) {
  const { S, race } = sim;
  if (!S.cap) return;
  applyTrait(S);
  const fw = S.focusW || {};
  for (const [f, w] of Object.entries(fw)) {
    const fx = B.cap.focus[f];
    if (!fx || !w) continue;
    for (const [k, dz] of Object.entries(fx)) addCap(S, k, dz * w);
  }
  if (S.school) addCap(S, 'learn', B.cap.schoolLearn);
  if (Math.abs(S.innate.looks) > 1) addCap(S, 'ties', Math.sign(S.innate.looks) * B.cap.looksTies);
  const ha = humanAge(S.age, race.lifeMul);
  if (ha >= B.cap.decayAge) addCap(S, 'skill', -B.cap.decaySkill);
  if (S.flags.dementia) addCap(S, 'learn', -B.cap.dementiaLearn);
  // 구 지식 막대 대체: 30세+ 에 공부 초점이 없으면 학식이 아주 천천히 식는다
  if (ha >= 30 && !(fw.study || fw.learn) && !S.school) addCap(S, 'learn', -0.003);
  S.arts = S.cap.arts;   // 구 S.arts(artsTop10 판정)와 동기화
}

/** NaN 복구(healStats 확장분) */
export function healCaps(S) {
  if (!S.cap || typeof S.cap !== 'object') S.cap = { skill: 0, learn: 0, arts: 0, ties: 0 };
  for (const k of CAP_KEYS) if (!Number.isFinite(S.cap[k])) S.cap[k] = 0; else S.cap[k] = zc(S.cap[k]);
  if (!S.innate || typeof S.innate !== 'object') S.innate = { looks: 0, luck: 0, trait: null };
  for (const k of ['looks', 'luck']) if (!Number.isFinite(S.innate[k])) S.innate[k] = 0; else S.innate[k] = zc(S.innate[k]);
  if (!Number.isFinite(S.arts)) S.arts = S.cap.arts;
}

/** 신원 카드용: 역량 4종 등급(+ delta: 지난 연말 스냅샷 대비 z 변화, W12 D51-1) + 타고남 특성 줄(극단 외모·작위·낙인).
 *  arch = 현재 진로 원형(A2·A12 면 외모 줄을 늘 보인다, W12 D51-5) */
export function capProfile(S, arch = null) {
  const prev = S.years && S.years.length ? S.years[S.years.length - 1].cap : null;
  const caps = CAP_KEYS.map((k) => ({ k, label: CAP_LABEL[k], z: S.cap ? S.cap[k] : 0, grade: grade(S.cap ? S.cap[k] : 0), delta: prev && S.cap && Number.isFinite(prev[k]) ? +(S.cap[k] - prev[k]).toFixed(3) : 0 }));
  const traits = [];
  const looks = S.innate ? S.innate.looks : 0;
  const lt = B.cap.looksTrait ?? 1.2;
  const looksTrack = arch === 'A2' || arch === 'A12';
  if (looks > lt) traits.push('눈에 띄는 외모');
  else if (looks < -lt) traits.push('잊히기 쉬운 얼굴');
  else if (looksTrack) traits.push(looks >= 0.5 ? '호감 가는 외모' : looks <= -0.5 ? '무대에 묻히는 외모' : '평범한 외모');
  if (S.status && S.status.noble) traits.push('작위: ' + S.status.noble);
  if (S.status && S.status.slave) traits.push('노예 신분');
  if (S.status && S.status.stigma) traits.push({ infected: '감염자 낙인', exile: '추방자', deserter: '탈영병', excommunicated: '파문', disgrace: '불명예' }[S.status.stigma] || S.status.stigma);
  return { caps, traits };
}

/** 외모 변경 결정(§6.3)이 열리는 조건. W12(D51-5): 생애 1회(S.flags.looksAsked), 인간 척도 18~45세, 외모가 낮거나(lowLooks) A2/A12 진로일 때만 */
export function looksChangeOpen(sim) {
  const { S } = sim;
  const c = B.cap.looksChange;
  if (S.flags.looksAsked != null) return false;
  const ha = humanAge(S.age, sim.race.lifeMul);
  if (ha < 18 || ha > (c.ageMax ?? 45)) return false;
  const t = S.track ? sim.data.trackById[S.track.id] : null;
  const uses = t && (t.archetype === 'A2' || t.archetype === 'A12');
  if (!(uses || S.innate.looks < (c.lowLooks ?? -1))) return false;
  return !S.prison && !S.serving && S.money >= sim.med * c.money && c.nations.includes(S.cur);
}
/** 외모 변경 시술 결과 적용. 반환 'ok' | 'fail' | 'accident' */
export function looksChangeApply(sim) {
  const { S, rng } = sim;
  const c = B.cap.looksChange;
  S.money = Math.round(S.money - sim.med * c.money);
  const r = rng.rnd();
  if (r < c.ok) { S.innate.looks = +zc(S.innate.looks + c.delta).toFixed(3); return 'ok'; }
  if (r < c.ok + c.fail) { sim.eff({ hl: c.hlFail }); return 'fail'; }
  sim.eff({ hl: c.hlAccident }); return 'accident';
}
