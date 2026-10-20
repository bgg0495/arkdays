// 국가별 결정 디스패처(W11). 엔진 내장 결정과 같은 id(marry_<type>·marry_second·home_change·track_choose)를 여러 국가 파일이
// 덮어쓰면 레지스트리에는 마지막 등록만 남는다. 그래서 각 국가 파일은 자기 결정을 레지스트리에 직접 넣지 않고
// hoist(decisions, { id: [거주국…] }) 로 여기 맡기고, content/index.js 가 dispatchPack() 하나를 등록한다.
// 디스패치 규칙: 거주국(S.cur)에 등록된 핸들러가 있으면 그쪽 ok/build/apply, 없으면 엔진 기본(ENGINE_DECISIONS)으로 위임.
// (하위 지역은 상위국으로 자동 위임하지 않는다 — 용문·타라처럼 상위국 파일이 맡는 경우는 목록에 명시한다.)
import { ENGINE_DECISIONS } from '../src/engine/choices.js';

const TABLE = {};   // id → { nation → decision }

/** nations(배열 또는 문자열)의 거주자에게 id 결정을 d 로 처리 */
export function regNation(nations, id, d) {
  const m = TABLE[id] || (TABLE[id] = {});
  for (const n of Array.isArray(nations) ? nations : [nations]) {
    if (m[n] && m[n] !== d) console.warn('[dispatch] ' + id + ' 을(를) ' + n + ' 에 두 번 등록했습니다. 뒤의 것을 씁니다.');
    m[n] = d;
  }
}
/** decisions 객체에서 map 의 id 들을 떼어 디스패처로 옮긴다(국가 파일 끝에서 호출) */
export function hoist(decisions, map) {
  for (const [id, ns] of Object.entries(map)) {
    if (!decisions[id]) continue;
    regNation(ns, id, decisions[id]);
    delete decisions[id];
  }
  return decisions;
}
export function dispatchTable() { return TABLE; }

function engineBase(id) {
  if (ENGINE_DECISIONS[id]) return ENGINE_DECISIONS[id];
  if (id.startsWith('marry_')) {
    const type = id.slice(6);
    const base = ENGINE_DECISIONS.marry;
    return { ...base, ok: (s) => base.ok(s) && !!(s.S.flags.y_marry && s.S.flags.y_marry.v && s.S.flags.y_marry.v.type.id === type) };
  }
  return null;
}
const pick = (s, id) => { const m = TABLE[id]; return m ? (m[s.S.cur] || null) : null; };

/** 레지스트리에 넣을 팩 { decisions }. 등록된 id 마다 결정 하나 */
export function dispatchPack() {
  const decisions = {};
  for (const id of Object.keys(TABLE)) {
    const base = engineBase(id);
    const any = Object.values(TABLE[id])[0];
    const src = base || any;
    decisions[id] = {
      tags: [], once: src.once, gap: src.gap, at: src.at,
      ok: (s, p) => { const h = pick(s, id); const f = (h && h.ok) || (base && base.ok); return f ? f(s, p) : true; },
      build: (s, p) => { const h = pick(s, id); const f = (h && h.build) || (base && base.build); return f ? f(s, p) : null; },
      apply: (s, k, p, text) => { const h = pick(s, id); const f = (h && h.apply) || (base && base.apply); return f ? f(s, k, p, text) : false; },
    };
  }
  return { decisions };
}

export default { regNation, hoist, dispatchPack, dispatchTable };
