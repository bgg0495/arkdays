// 한국어 조사 유틸. 엔진·콘텐츠·UI 공용(의존성 없음).
// 받침 검사: 한글 음절은 종성 유무, 숫자는 발음(0·1·3·6·7·8 받침 있음), 영문은 자음 끝(단, l/r 은 '로' 처리).
// 괄호·따옴표·공백이 뒤에 붙어 있어도 마지막 글자만 보고 판단한다.

function lastChar(w) {
  const s = String(w ?? '').replace(/[\s)\]}'"’”」』>]+$/g, '');
  return s ? s[s.length - 1] : '';
}

/** 마지막 글자에 받침이 있는가 */
export function hasBatchim(w) {
  const ch = lastChar(w);
  if (!ch) return false;
  const c = ch.charCodeAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 !== 0;
  if (/[0-9]/.test(ch)) return /[0136789]/.test(ch);
  if (/[A-Za-z]/.test(ch)) return /[bcdfgjklmnpqrstvxz]/i.test(ch);
  return false;
}

/** 마지막 글자의 종성 코드(0 = 없음, 8 = ㄹ). 한글이 아니면 받침 유무만 0/1 로 */
export function lastJong(w) {
  const ch = lastChar(w);
  if (!ch) return 0;
  const c = ch.charCodeAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28;
  if (/[lr]/i.test(ch)) return 8;                       // 영문 l/r 끝은 'ㄹ' 받침처럼 '로'
  return hasBatchim(ch) ? 1 : 0;
}

/** 을/를 */
export function eul(w) { return w + (hasBatchim(w) ? '을' : '를'); }
/** 이/가 */
export function iga(w) { return w + (hasBatchim(w) ? '이' : '가'); }
/** 은/는 */
export function eun(w) { return w + (hasBatchim(w) ? '은' : '는'); }
/** 와/과 */
export function wa(w) { return w + (hasBatchim(w) ? '과' : '와'); }
/** 으로/로 (ㄹ 받침은 '로') */
export function ro(w) { const j = lastJong(w); return w + (j !== 0 && j !== 8 ? '으로' : '로'); }
/** 아/야 (호격) */
export function aya(w) { return w + (hasBatchim(w) ? '아' : '야'); }
/** (이)라고 */
export function rago(w) { return w + (hasBatchim(w) ? '이라고' : '라고'); }
/** 이다/다 체의 '이' 삽입 여부: "~이었습니다/~였습니다" */
export function ieot(w) { return w + (hasBatchim(w) ? '이었' : '였'); }

export const euro = ro;   // 구 이름 호환
export default { hasBatchim, lastJong, eul, iga, eun, wa, ro, euro, aya, ieot, rago };
