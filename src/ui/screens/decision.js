// 결정 모달: 종류 태그(중대 결정 DECISION / 작은 선택 QUICK PICK)·나이·제목·본문·각주·선택지(번호·라벨·효과 힌트)·자동으로 맡기기.
// 종류는 view.kind('big'|'small')로 받고, 없으면 small 플래그 → small, 그 외 big. 잠시 멈춤(reflect)은 D34로 없음.
// 작은 선택은 카운트다운 뒤 기본 선택지(view.def 또는 첫 번째)를 고른다. 숫자 키 1~9 로도 고른다.
import { $, el, esc, setHtml, iga } from '../dom.js';

/** v1 내장 결정(track_choose·track_switch·marry_*·rhodes_offer·home_change·naturalize·return_home·contract_end·looks_change)의 선택지 효과 힌트.
 *  엔진이 준 sub 를 앞에 두고, 진로 선택지엔 원형(archetype) 이름을 덧붙인다. 콘텐츠가 같은 id 를 덮어써도 k 규약은 같다(W7 메모 §2). */
export function choiceHint(app, pd, c) {
  const id = pd.id || '';
  const data = app.sim && app.sim.data;
  const t = data && data.trackById && (data.trackById[c.k] || data.trackById[String(c.k).replace(/^closed:/, '')]);   // W16: 닫힌 문 k = closed:<id>
  const parts = c.sub ? [c.sub] : [];
  const add = (x) => { if (x && !parts.includes(x)) parts.push(x); };
  if ((id === 'track_choose' || id === 'track_switch') && t) {
    add(t.A && t.A.name);
    if (id === 'track_switch') add((t.stages[0] && (t.stages[0].title || t.stages[0].name)) + '부터');
    if (t.itinerant) add('떠돌이 길');
    if (t.nation && t.nation !== 'common' && app.S && t.nation !== app.S.cur) add('이주');
  } else if (id === 'track_choose' && c.k === 'wait') add('소득 없음');
  else if (id === 'track_switch' && c.k === 'stay') add('지금 자리 유지');
  else if (id.startsWith('marry_')) { if (c.k === 'accept') add('혼인 · 가계 합산'); }
  else if (id === 'rhodes_offer') { if (c.k === 'join') add('거주지가 로도스 본함으로'); else if (c.k === 'hold') add('다시 제안이 올 수 있음'); }
  else if (id === 'naturalize') { if (c.k === 'yes') add('국적 변경'); }
  else if (id === 'return_home') { if (c.k === 'go') add('진로를 두고 귀향'); }
  else if (id === 'contract_end') { if (c.k === 're') add('같은 조건으로 계속'); else if (c.k === 'leave') add('일을 잃음'); }
  else if (id === 'home_change') { if (c.k === 'no') add('지금 집 그대로'); else add('소유'); }
  else if (id === 'looks_change') { if (c.k === 'go') add('돈이 나감'); }
  return parts.join(' · ');
}

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
  wrap.classList.remove('peek');
  setHtml(wrap, `
    <div class="modal-back"></div>
    <button class="btn tiny ghost peek-btn" id="btn-peek" type="button" title="결정 창을 잠깐 숨기고 뒤 화면을 봅니다 (H 키)">뒤 화면 보기</button>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-id="${esc(pd.id || '')}">
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
        <span class="key-hint mono">1–${v.choices.filter((c) => !c.disabled).length} 숫자 키</span>
      </div>
    </div>`);
  const box = $('#modal-choices', wrap);
  const active = v.choices.filter((c) => !c.disabled);   // W16(D56): 닫힌 문(disabled)은 번호 없이 회색, 누를 수 없다
  v.choices.forEach((c) => {
    const sub = choiceHint(app, pd, c);
    const b = el('button.choice' + (c.disabled ? '.closed' : ''), { type: 'button', dataset: { k: c.k }, disabled: !!c.disabled, 'aria-disabled': c.disabled ? 'true' : null, title: c.disabled ? '아직 닫힌 문입니다' : null },
      el('span.choice-n.mono', {}, c.disabled ? '×' : String(active.indexOf(c) + 1)),
      el('span.choice-label', {}, c.label),
      sub ? el('span.choice-sub', {}, sub) : null);
    if (!c.disabled) b.addEventListener('click', () => pick(app, c.k));
    box.appendChild(b);
  });
  $('#btn-auto', wrap).addEventListener('click', () => { app.actions.toggleAuto(true); });
  $('#btn-peek', wrap).addEventListener('click', () => togglePeek());
  wrap.hidden = false;
  window.addEventListener('keydown', onKey);
  if (kind === 'small') startCountdown(app, v);
  else { const first = box.querySelector('button:not([disabled])'); if (first) first.focus(); }
}

function onKey(ev) {
  if (!current) return;
  if (ev.target && ev.target.matches('textarea, input')) return;
  if (ev.key === 'h' || ev.key === 'H' || (ev.key === 'Escape' && $('#modal').classList.contains('peek'))) { ev.preventDefault(); togglePeek(); return; }
  const n = parseInt(ev.key, 10);
  const active = current.pd.view.choices.filter((c) => !c.disabled);
  if (n >= 1 && n <= active.length) { ev.preventDefault(); pick(current.app, active[n - 1].k); }
  else if (current.kind === 'small' && timer) { stopCountdown(); }
}

/** W12(D51-4): 잠깐 숨기기 — 모달·배경을 투명하게 해 뒤 화면(기록·신원 카드)을 본다. 작은 선택의 카운트다운은 멈춘다 */
export function togglePeek(force) {
  const wrap = $('#modal'); if (!wrap || !current) return;
  const on = typeof force === 'boolean' ? force : !wrap.classList.contains('peek');
  wrap.classList.toggle('peek', on);
  const b = $('#btn-peek', wrap); if (b) b.textContent = on ? '결정으로 돌아가기' : '뒤 화면 보기';
  if (on && timer) stopCountdown();
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
