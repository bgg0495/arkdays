// 작은 DOM 도우미. 라이브러리 없음.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** el('button.primary', {onclick}, '텍스트', otherEl) */
export function el(spec, attrs = {}, ...children) {
  const [tag, ...classes] = spec.split('.');
  const node = document.createElement(tag || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'class') node.className += (node.className ? ' ' : '') + v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return node;
}

export function setHtml(node, html) { node.innerHTML = html; return node; }

let toastTimer = null;
export function toast(msg, ms = 2200) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

/** 숫자 → 1,234 */
export const num = (n) => Math.round(n).toLocaleString('ko-KR');
/** 돈 표기(D15: 용문폐). */
export const lmd = (n) => (n < 0 ? '−' : '') + num(Math.abs(n)) + ' LMD';
export const pct = (v, d = 1) => (v * 100).toFixed(d) + '%';

/** 조사: 엔진 공용 유틸(src/engine/text.js)을 그대로 내보낸다 */
export { eun, iga, eul, wa, ro, euro, hasBatchim } from '../engine/text.js';
