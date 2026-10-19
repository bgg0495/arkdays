// 명생게임 UI 진입점: 데이터 로드 → 화면 전환(#start #cert #life #dead) → rAF 루프 → HOOK 바인딩 → 저장/이어하기/설정.
// 엔진(src/engine)은 건드리지 않는다. 상태는 sim.S 하나, UI 설정은 tr1.prefs.
import { loadData } from './data-loader.js';
import { createRegistry } from './engine/content.js';
import { createSim } from './engine/sim.js';
import content from '../content/index.js';
import { $, toast } from './ui/dom.js';
import * as start from './ui/screens/start.js';
import * as cert from './ui/screens/cert.js';
import * as life from './ui/screens/life.js';
import * as decision from './ui/screens/decision.js';
import * as dead from './ui/screens/dead.js';

export const KEY = { save: 'tr1.save', prefs: 'tr1.prefs', past: 'tr1.past', rolls: 'tr1.rolls' };
export const SPEEDS = [1, 2, 4, 8];
const DEFAULT_PREFS = { speed: 2, auto: false, theme: 'auto' };   // theme: auto(기기 설정) | light | dark

/** 테마 적용: 명시 설정이면 data-theme, auto 면 기기 설정을 .sys-light 클래스로 반영(CSS 가 둘 다 읽는다) */
export function applyTheme() {
  const t = app.prefs.theme === 'light' || app.prefs.theme === 'dark' ? app.prefs.theme : 'auto';
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = t;
  const sysLight = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches;
  root.classList.toggle('sys-light', t === 'auto' && sysLight);
}
export function resolvedTheme() {
  const root = document.documentElement;
  return root.dataset.theme === 'light' || (!root.dataset.theme && root.classList.contains('sys-light')) ? 'light' : 'dark';
}
export function toggleTheme() {
  app.prefs.theme = resolvedTheme() === 'dark' ? 'light' : 'dark'; savePrefs(); applyTheme();
  return resolvedTheme();
}
export const themeLabel = () => (resolvedTheme() === 'dark' ? '☀ 밝게' : '☾ 어둡게');

const app = {
  data: null, content: null, sim: null, screen: null,
  prefs: { ...DEFAULT_PREFS },
  dirty: false,
  get S() { return this.sim ? this.sim.S : null; },
};

// ── 저장소 ────────────────────────────────────────────────
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* noop */ } }

export function loadPrefs() {
  try { const p = JSON.parse(lsGet(KEY.prefs) || '{}'); app.prefs = { ...DEFAULT_PREFS, ...p }; } catch (e) { app.prefs = { ...DEFAULT_PREFS }; }
  if (!SPEEDS.includes(app.prefs.speed)) app.prefs.speed = DEFAULT_PREFS.speed;
  applyTheme();
  try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => applyTheme()); } catch (e) { /* 구형 브라우저 */ }
}
export function savePrefs() { lsSet(KEY.prefs, JSON.stringify(app.prefs)); }

export function readSave() {
  const raw = lsGet(KEY.save);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (!o || !o.S || o.S.phase !== 'life') { lsDel(KEY.save); return null; }
    return o;
  } catch (e) { lsDel(KEY.save); return null; }
}
export function save() {
  const S = app.S;
  if (!S || S.phase !== 'life') return false;
  if (!lsSet(KEY.save, JSON.stringify({ S, at: Date.now() }))) { toast('저장하지 못했습니다. 저장 공간을 확인해 주세요.'); return false; }
  return true;
}
export function clearSave() { lsDel(KEY.save); }
export function pastLives() { try { return JSON.parse(lsGet(KEY.past) || '[]'); } catch (e) { return []; } }
function pushPast(S) {
  const list = pastLives();
  list.unshift({ name: S.name.full, born: S.born, by: S.by, age: S.deathAt.age, cause: S.deathAt.label, race: S.race, sex: S.sex, at: Date.now() });
  lsSet(KEY.past, JSON.stringify(list.slice(0, 10)));
}
function nextSerial() {
  const n = (parseInt(lsGet(KEY.rolls) || '0', 10) || 0) + 1;
  lsSet(KEY.rolls, String(n));
  return n;
}

// ── 화면 전환 ─────────────────────────────────────────────
const SCREENS = { start, cert, life, dead };
export function show(name) {
  if (app.screen && SCREENS[app.screen].unmount) SCREENS[app.screen].unmount(app);
  for (const id of Object.keys(SCREENS)) $('#' + id).hidden = id !== name;
  app.screen = name;
  document.body.dataset.screen = name;
  SCREENS[name].mount(app);
  window.scrollTo(0, 0);
}

// ── HOOK ─────────────────────────────────────────────────
const hooks = {
  log: (e) => { if (app.screen === 'life') life.onLog(app, e); },
  change: () => { app.dirty = true; },
  decision: (pd) => onDecision(pd),
  death: () => onDeath(),
  year: () => { app.dirty = true; save(); if (app.screen === 'life') life.onYear(app); },
};

function onDecision(pd) {
  if (app.prefs.auto) { app.sim.autoChoice(); return; }
  save();                       // 모달이 열린 상태(S.pending)를 저장 → 새로고침 후 복원
  decision.open(app, pd);
}

function onDeath() {
  decision.close();
  clearSave();
  pushPast(app.S);
  app.dirty = true;
  if (app.screen === 'life') life.renderAll(app);
  setTimeout(() => { if (app.S && app.S.phase === 'dead') show('dead'); }, 900);
}

// ── 생애 제어 ─────────────────────────────────────────────
function makeSim(seed) { return createSim({ data: app.data, content: app.content, hooks, seed }); }

export function newLife() {
  const seed = 'ui:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
  const sim = makeSim(seed);
  const S = sim.newLife();
  S.speed = app.prefs.speed;
  S.flags.seed = seed;
  S.flags.serial = nextSerial();
  app.sim = sim;
  show('cert');
}

export function startLife() {
  const S = app.S;
  if (!S || S.phase !== 'birth') return;
  show('life');
  app.sim.start();
  app.dirty = true;
  save();
}

export function resume() {
  const o = readSave();
  if (!o) { toast('이어할 기록이 없습니다.'); show('start'); return false; }
  const S = o.S;
  const sim = makeSim((S.flags.seed || 'ui') + ':r' + Date.now().toString(36));
  sim.S = S;
  S.speed = app.prefs.speed;
  app.sim = sim;
  show('life');
  app.dirty = true;
  if (S.pending) onDecision(S.pending);
  toast(S.name.full + ', ' + S.age + '세에서 이어갑니다.');
  return true;
}

export function setSpeed(v) {
  if (!SPEEDS.includes(v)) return;
  app.prefs.speed = v; savePrefs();
  if (app.S) app.S.speed = v;
  app.dirty = true;
  if (app.screen === 'life') life.renderBar(app);
}
export function togglePause(force) {
  const S = app.S; if (!S) return;
  S.paused = typeof force === 'boolean' ? force : !S.paused;
  if (S.paused) save();
  if (app.screen === 'life') life.renderBar(app);
}
export function toggleAuto(force) {
  app.prefs.auto = typeof force === 'boolean' ? force : !app.prefs.auto; savePrefs();
  if (app.prefs.auto && app.S && app.S.pending) { decision.close(); app.sim.autoChoice(); save(); }
  if (app.screen === 'life') life.renderBar(app);
}
/** 다음 결정이 열릴 때까지(또는 사망까지) 한 번에 진행. 자동 결정 중이면 결정 하나가 처리될 때까지 */
export function skipToDecision() {
  const S = app.S; const sim = app.sim;
  if (!S || S.phase !== 'life' || S.pending) return;
  S.paused = false;
  const before = S.stats.decisions;
  let guard = 0;
  while (S.phase === 'life' && !S.pending && S.stats.decisions === before && guard++ < 400) sim.tick(S.yearSec / S.speed);
  app.dirty = true;
  save();
  if (app.screen === 'life') life.renderAll(app);
}
export function choose(k, text) {
  const S = app.S;
  if (!S || !S.pending) return;
  decision.close();
  app.sim.choose(k, text || '', false);
  app.dirty = true;
  save();
}
export function autoChooseNow() {
  if (!app.S || !app.S.pending) return;
  decision.close();
  app.sim.autoChoice();
  app.dirty = true;
  save();
}
export function setFocus(k) {
  if (!app.sim) return;
  if (app.sim.setFocus(k)) { app.dirty = true; if (app.screen === 'life') life.renderFocus(app); }
}
export function exitToStart() {
  if (app.S && app.S.phase === 'life') { app.S.paused = true; save(); }
  decision.close();
  show('start');
}
export function rebirth() { newLife(); }
export function toStart() { show('start'); }

// ── rAF 루프 ──────────────────────────────────────────────
let last = null;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = last == null ? 0 : Math.min(0.1, (now - last) / 1000);
  last = now;
  const S = app.S;
  if (app.screen !== 'life' || !S || S.phase !== 'life') return;
  if (dt > 0) app.sim.tick(dt);
  life.tickRender(app);
}

// ── 부팅 ─────────────────────────────────────────────────
async function boot() {
  loadPrefs();
  try {
    app.data = await loadData();
  } catch (e) {
    $('#start').hidden = false;
    $('#start').innerHTML = '<div class="boot-error"><h1>데이터를 읽지 못했습니다</h1><p>' + String(e.message || e) + '</p><p>프로젝트 루트에서 <code>python -m http.server 8000</code> 을 띄우고 <code>http://localhost:8000/src/</code> 로 열어 주세요.</p></div>';
    console.error(e);
    return;
  }
  if (app.data.warnings.length) console.warn('데이터 경고:', app.data.warnings);
  app.content = content.install(createRegistry());
  app.actions = { newLife, startLife, resume, setSpeed, togglePause, toggleAuto, skipToDecision, choose, autoChooseNow, setFocus, exitToStart, rebirth, toStart, readSave, pastLives, save, toggleTheme, themeLabel };
  show('start');
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('beforeunload', () => save());
  window.addEventListener('keydown', (ev) => {
    if (app.screen !== 'life' || ev.target.matches('input, textarea')) return;
    if (ev.key === ' ') { ev.preventDefault(); if (!app.S.pending) togglePause(); }
  });
  window.__app = app;    // 디버그용
}

boot();
