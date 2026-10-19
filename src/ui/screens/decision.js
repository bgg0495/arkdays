// 결정 모달: 종류 태그(중대 결정 DECISION / 작은 선택 QUICK PICK)·나이·제목·본문·각주·선택지(번호·라벨·효과 힌트)·자동으로 맡기기.
// 종류는 view.kind('big'|'small')로 받고, 없으면 small 플래그 → small, 그 외 big. 잠시 멈춤(reflect)은 D34로 없음.
// 작은 선택은 카운트다운 뒤 기본 선택지(view.def 또는 첫 번째)를 고른다. 숫자 키 1~9 로도 고른다.
import { $, el, esc, setHtml, iga } from '../dom.js';

const SMALL_SEC = 8;
const KIND = { big: { ko: '중대 결정', en: 'Decision' }, small: { ko: '작은 선택', en: 'Quick pick' } };
let timer = null;
let current = null;

export function kindOf(pd) {
  const v = pd.view || {};
  if (v.kind && KIND[v.kind]) return v.kind;
  if (v.small) return 'small';
  return 'big';
}

export function isOpen() { return !!current; }

export function open(app, pd) {
  close();
  const wrap = $('#modal');
  const S = app.S;
  const v = pd.view;
  const kind = kindOf(pd);
  current = { pd, kind, app };
  setHtml(wrap, `
    <div class="modal-back"></div>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-top">
        <span class="tag tag-${kind}"><span class="tag-en">${KIND[kind].en}</span>${KIND[kind].ko}</span>
        <span class="modal-when mono">${S.age}세 · 테라력 ${S.by + S.age}년</span>
      </div>
      <h2 id="modal-title" class="modal-title">${esc(v.title || '')}</h2>
      <p class="modal-body">${esc(v.body || '')}</p>
      ${v.fact ? `<p class="footnote">${esc(v.fact)}</p>` : ''}
      <div class="choices" id="modal-choices"></div>
      ${kind === 'small' ? `<div class="countdown"><div class="countdown-track"><div class="countdown-bar" id="cd-bar"></div></div><div class="countdown-text" id="cd-text"></div></div>` : ''}
      <div class="modal-foot">
        <button class="btn ghost small" id="btn-auto">이제부터 자동으로 맡기기</button>
        <span class="key-hint mono">1–${v.choices.length} 숫자 키</span>
      </div>
    </div>`);
  const box = $('#modal-choices', wrap);
  v.choices.forEach((c, i) => {
    const b = el('button.choice', { type: 'button', dataset: { k: c.k } },
      el('span.choice-n.mono', {}, String(i + 1)),
      el('span.choice-label', {}, c.label),
      c.sub ? el('span.choice-sub', {}, c.sub) : null);
    b.addEventListener('click', () => pick(app, c.k));
    box.appendChild(b);
  });
  $('#btn-auto', wrap).addEventListener('click', () => { app.actions.toggleAuto(true); });
  wrap.hidden = false;
  window.addEventListener('keydown', onKey);
  if (kind === 'small') startCountdown(app, v);
  else { const first = box.querySelector('button'); if (first) first.focus(); }
}

function onKey(ev) {
  if (!current) return;
  if (ev.target && ev.target.matches('textarea, input')) return;
  const n = parseInt(ev.key, 10);
  if (n >= 1 && n <= current.pd.view.choices.length) { ev.preventDefault(); pick(current.app, current.pd.view.choices[n - 1].k); }
  else if (current.kind === 'small' && timer) { stopCountdown(); }
}

function pick(app, k) {
  if (!current) return;
  app.actions.choose(k);
}

function startCountdown(app, v) {
  const def = v.def || v.choices[0].k;
  const label = (v.choices.find((c) => c.k === def) || v.choices[0]).label;
  const t0 = performance.now();
  const bar = $('#cd-bar'); const text = $('#cd-text');
  const wrap = $('#modal');
  const stop = () => stopCountdown();
  wrap.querySelector('.modal').addEventListener('pointerdown', stop, { once: true });
  const step = () => {
    if (!current) return;
    const left = Math.max(0, SMALL_SEC - (performance.now() - t0) / 1000);
    if (bar) bar.style.width = (left / SMALL_SEC * 100).toFixed(1) + '%';
    if (text) text.textContent = Math.ceil(left) + '초 뒤 ‘' + iga(label) + '’ 자동으로 선택됩니다. 창을 누르면 멈춥니다.';
    if (left <= 0) { timer = null; pick(app, def); return; }
    timer = requestAnimationFrame(step);
  };
  timer = requestAnimationFrame(step);
}
function stopCountdown() {
  if (timer) cancelAnimationFrame(timer);
  timer = null;
  const text = $('#cd-text'); const bar = $('#cd-bar');
  if (text) text.textContent = '카운트다운을 멈췄습니다. 천천히 고르십시오.';
  if (bar) bar.style.width = '0%';
}

export function close() {
  stopCountdown();
  current = null;
  const wrap = $('#modal');
  if (!wrap) return;
  wrap.hidden = true;
  wrap.innerHTML = '';
  window.removeEventListener('keydown', onKey);
}
