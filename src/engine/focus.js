// 올해의 초점(W12 D53a): 공통 초점(FOCUS, 단계별 STAGE_FOCUS) + 진로 전용 초점(tf:<원형|진로 id>:<id>).
// 진로 전용 초점은 데이터 tracks/*.json 의 focus:[{id,name,fx:{cap,standing,hl,h,money},fall?}] 가 있으면 그것, 없으면 원형 기본(ARCH_FOCUS).
// 효과는 연말(sim.endYear 1단계)에 연중 비율(focusW)만큼: hl/h 막대, cap z, 소속 standing, money(중위소득 배율), fall(그 해 몰락 확률 배율).
// 키는 저장(S.focus, years[].focus)에 그대로 들어가므로 바꾸지 않는다.

export const FOCUS = {
  study:   { label: '공부',     fx: { h: -1 } },
  play:    { label: '놀기',     fx: { h: 3 } },
  sport:   { label: '운동',     fx: { hl: 3, h: 1 } },
  arts:    { label: '아츠 수련', fx: { h: 1, hl: -1 } },
  work:    { label: '일',       fx: { hl: -2, h: -1 } },
  balance: { label: '균형',     fx: { h: 1, hl: 1 } },
  family:  { label: '가족',     fx: { h: 2 } },
  health:  { label: '건강',     fx: { hl: 4, h: 1 } },
  learn:   { label: '배움',     fx: { h: -1 } },
  rest:    { label: '쉼',       fx: { hl: 2, h: 2 } },
  survive: { label: '재앙 대비', fx: { hl: 1 } },
};
export const STAGE_FOCUS = {
  baby: [],
  school: ['study', 'play', 'sport', 'arts', 'rest'],
  adult: ['work', 'balance', 'family', 'health', 'learn', 'arts', 'survive', 'rest'],
  elder: ['rest', 'health', 'family', 'balance'],
  service: ['survive', 'health', 'rest'],
  camp: ['survive', 'rest'],
};

/** 원형 기본 진로 초점(D53a). fx: cap z/년(연중 100% 기준), standing 점, hl/h 막대, money 중위소득 배율. fall: 그 해 몰락 확률 배율 */
export const ARCH_FOCUS = {
  A1: [
    { id: 'work', name: '일을 맡는다', fx: { cap: { skill: 0.03 }, standing: 4, hl: -2 }, fall: 1.15 },
    { id: 'boss', name: '윗선과 어울린다', fx: { cap: { ties: 0.04 }, standing: 3, h: -1 } },
    { id: 'low', name: '몸을 사린다', fx: { hl: 2, h: 1, standing: -2 }, fall: 0.6 },
  ],
  A2: [
    { id: 'train', name: '훈련', fx: { cap: { skill: 0.05 }, hl: -2, standing: 1 } },
    { id: 'sponsor', name: '스폰서 행사', fx: { cap: { ties: 0.03 }, standing: 3, h: 1 } },
    { id: 'recover', name: '회복', fx: { hl: 4, standing: -1 }, fall: 0.7 },
  ],
  A3: [
    { id: 'desk', name: '실무', fx: { cap: { learn: 0.03 }, standing: 3, hl: -1 } },
    { id: 'faction', name: '파벌', fx: { cap: { ties: 0.04 }, standing: 3, h: -1 }, fall: 1.3 },
    { id: 'clean', name: '청렴', fx: { h: 2, standing: -1 }, fall: 0.6 },
  ],
  A4: [
    { id: 'drill', name: '훈련', fx: { cap: { skill: 0.04 }, standing: 2, hl: -1 } },
    { id: 'officer', name: '상관 비위', fx: { cap: { ties: 0.03 }, standing: 4, h: -2 } },
    { id: 'low', name: '몸을 사린다', fx: { hl: 2, standing: -2 }, fall: 0.7 },
  ],
  A5: [],
  A6: [
    { id: 'job', name: '계약 수행', fx: { cap: { skill: 0.03 }, standing: 3, hl: -2, money: 0.05 } },
    { id: 'gear', name: '장비', fx: { money: -0.08, hl: 1, standing: 1 }, fall: 0.75 },
    { id: 'rest', name: '휴식', fx: { hl: 3, h: 1, standing: -1 } },
  ],
  A7: [
    { id: 'practice', name: '수련', fx: { cap: { arts: 0.04 }, standing: 2, hl: -1 } },
    { id: 'serve', name: '부족 봉사', fx: { cap: { ties: 0.03 }, standing: 3, h: 1 } },
  ],
  A8: [
    { id: 'practice', name: '수행', fx: { cap: { learn: 0.03 }, standing: 2, h: 1 } },
    { id: 'politics', name: '교단 정치', fx: { cap: { ties: 0.03 }, standing: 3, h: -2 }, fall: 1.2 },
  ],
  A9: [
    { id: 'research', name: '연구', fx: { cap: { learn: 0.04 }, standing: 3, hl: -1 } },
    { id: 'paper', name: '논문', fx: { cap: { learn: 0.02 }, standing: 4, h: -1 } },
    { id: 'safety', name: '안전', fx: { hl: 2, standing: -1 }, fall: 0.6 },
  ],
  A10: [
    { id: 'grind', name: '일에 몰두', fx: { cap: { learn: 0.02 }, standing: 4, hl: -2, h: -1 } },
    { id: 'network', name: '인맥', fx: { cap: { ties: 0.04 }, standing: 2 } },
    { id: 'balance', name: '워라밸', fx: { h: 3, hl: 1, standing: -2 } },
  ],
  A11: [
    { id: 'trade', name: '장사', fx: { cap: { skill: 0.03 }, standing: 3, hl: -1 } },
    { id: 'neighbors', name: '동네', fx: { cap: { ties: 0.03 }, standing: 2, h: 1 } },
    { id: 'rest', name: '쉬어 가는 해', fx: { hl: 2, h: 2, standing: -1 } },
  ],
  A12: [
    { id: 'practice', name: '연습', fx: { cap: { arts: 0.04 }, standing: 2, hl: -1 } },
    { id: 'patron', name: '후원자', fx: { cap: { ties: 0.04 }, standing: 3, h: -1 } },
    { id: 'stage', name: '무대', fx: { cap: { arts: 0.02 }, standing: 4, hl: -2 } },
  ],
};

const TRACK_FOCUS = {};   // 'tf:<A|TRACK_ID>:<id>' → { label, fx, fall }
function norm(f) {
  const fx = f.fx || {};
  return { label: f.name || f.label || f.id, fx: { hl: +fx.hl || 0, h: +fx.h || 0, cap: fx.cap || {}, standing: +fx.standing || 0, money: +fx.money || 0 }, fall: f.fall == null ? 1 : +f.fall, track: true };
}
for (const [A, list] of Object.entries(ARCH_FOCUS)) for (const f of list) TRACK_FOCUS['tf:' + A + ':' + f.id] = norm(f);
/** 데이터 진로의 focus[] 등록(prepareData 가 부른다) */
export function registerTrackFocus(trackId, list) {
  if (!Array.isArray(list)) return;
  for (const f of list) if (f && f.id) TRACK_FOCUS['tf:' + trackId + ':' + f.id] = norm(f);
}
/** 초점 정의(공통·진로 전용 모두). 없으면 null */
export function focusDef(k) { return (k && (FOCUS[k] || TRACK_FOCUS[k])) || null; }
export const isTrackFocus = (k) => typeof k === 'string' && k.startsWith('tf:');
/** 정규화된 진로 객체의 전용 초점 키 목록 */
export function trackFocusKeys(track) {
  if (!track) return [];
  if (Array.isArray(track.focus) && track.focus.length) return track.focus.filter((f) => f && f.id).map((f) => 'tf:' + track.id + ':' + f.id);
  return (ARCH_FOCUS[track.archetype] || []).map((f) => 'tf:' + track.archetype + ':' + f.id);
}
