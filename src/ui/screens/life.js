// 인생 화면: 상단 바 / 좌(신원 카드·로도스·스탯·돈·광석병·가족) / 중(올해의 초점·인생 기록) / 우(인생 지도·국가 통계).
// 매 프레임 tickRender 가 나이·진행률만 갱신하고, app.dirty 일 때만 패널을 다시 그린다. 기록은 HOOK.log 로 한 줄씩 앞에 붙인다.
// v1(W10): 상태 막대는 건강·행복 둘. 신원 카드에 진로·소속 지위·역량 4등급·타고남·거주 상태, 그 아래 접이식 로도스 블록(§10.3).
import { $, el, esc, setHtml, lmd, num } from '../dom.js';
import { focusOptions, capProfile, rhodesCard } from '../../engine/sim.js';
import { humanAge } from '../../engine/lifetable.js';
import { SPEEDS } from '../../main.js';
import { STAT_LABEL, STAGE_LABEL, ORI_OUTCOME, POLICY_LABEL, TRAIT_LABEL, SCHOOL_LABEL, EDU_LABEL, SEX, Q_DOTS, RHODES_STATUS, homeWord, jobName, nationName, fxText, focusLabel, focusHint, nationStatRows, MRZ, certNo,
  statusWord, standingOf, residenceLine, housingName, traitWords, dreamLine } from '../text.js';

const LOG_MAX = 1500;
const GRADE_KEY = { '아주 낮음': 'low', '낮음': 'low', '보통': 'mid', '높음': 'high', '뛰어남': 'top', '탁월': 'top' };   // W16: 6등급 → 색 4종
const OP_KEY = { '결함': 'low', '보통': 'mid', '표준': 'mid', '우수': 'high', '뛰어남': 'high', '탁월': 'top' };
let R = null;     // 엘리먼트 참조
let lastBar = '';
let lastMile = '';   // 인생 기록 강조용 상태 스냅샷(진로·단계·거주국·혼인·주거)
let rhodesOpen = null;   // 접이식 로도스 블록 열림 상태(사용자가 건드리면 기억)

export function mount(app) {
  const root = $('#life');
  setHtml(root, `
    <div class="life-bar" id="lf-bar"></div>
    <div class="life-grid">
      <aside class="col col-left">
        <section class="card id-card" id="lf-id"></section>
        <section class="card fold-card" id="lf-rhodes" hidden></section>
        <section class="card" id="lf-stats"></section>
        <section class="card" id="lf-money"></section>
        <section class="card" id="lf-ori" hidden></section>
        <section class="card" id="lf-fam"></section>
      </aside>
      <main class="col col-mid">
        <section class="card" id="lf-focus"></section>
        <section class="card log-card">
          <h2 class="h-small"><span class="en">Life record</span>인생 기록 <span class="muted" id="lf-logcount"></span></h2>
          <div class="log" id="lf-log"></div>
        </section>
      </main>
      <aside class="col col-right">
        <section class="card" id="lf-map"></section>
        <section class="card" id="lf-nation"></section>
      </aside>
    </div>`);
  R = {
    bar: $('#lf-bar', root), id: $('#lf-id', root), rhodes: $('#lf-rhodes', root), stats: $('#lf-stats', root), money: $('#lf-money', root), ori: $('#lf-ori', root),
    fam: $('#lf-fam', root), focus: $('#lf-focus', root), log: $('#lf-log', root), logcount: $('#lf-logcount', root), map: $('#lf-map', root), nation: $('#lf-nation', root),
  };
  lastBar = '';
  lastMile = mileKey(app.S);
  renderAll(app);
  renderLog(app);
}
export function unmount() { R = null; }

export function renderAll(app) {
  if (!R) return;
  renderBar(app);
  renderId(app);
  renderRhodes(app);
  renderStats(app);
  renderMoney(app);
  renderOri(app);
  renderFam(app);
  renderFocus(app);
  renderMap(app);
  renderNation(app);
  lastMile = mileKey(app.S);
  app.dirty = false;
}

/** 매 프레임: 나이·연도·진행률. dirty 면 패널 전부 */
export function tickRender(app) {
  if (!R) return;
  const S = app.S;
  const key = S.age + '|' + S.paused + '|' + S.speed + '|' + (S.pending ? 1 : 0) + '|' + S.phase;
  if (key !== lastBar) renderBar(app);
  const prog = $('#lf-prog', R.bar);
  if (prog) prog.style.width = (Math.min(1, S.t) * 100).toFixed(1) + '%';
  if (app.dirty) renderAll(app);
}

export function onYear(app) { if (!R) return; renderMap(app); }

// ── 상단 바 ─────────────────────────────────────────────
export function renderBar(app) {
  if (!R) return;
  const S = app.S; const A = app.actions; const p = app.prefs;
  lastBar = S.age + '|' + S.paused + '|' + S.speed + '|' + (S.pending ? 1 : 0) + '|' + S.phase;
  const dead = S.phase === 'dead';
  setHtml(R.bar, `
    <div class="bar-left">
      <span class="bar-title">명생게임</span>
      <span class="bar-age"><span class="en">Age</span><b>${S.age}</b>세</span>
      <span class="bar-year mono">테라력 ${S.by + S.age}년</span>
      <span class="bar-name">${esc(S.name.full)}</span>
      <span class="bar-pace muted">1년 ≈ ${(S.yearSec / S.speed).toFixed(1)}초</span>
    </div>
    <div class="bar-right">
      <div class="speed-group" role="group" aria-label="배속">
        ${SPEEDS.map((v) => `<button class="btn tiny ${v === S.speed ? 'on' : ''}" data-speed="${v}">${v}×</button>`).join('')}
      </div>
      <button class="btn tiny ${S.paused ? 'on' : ''}" id="bar-pause" ${dead ? 'disabled' : ''}>${S.paused ? '▶ 계속' : '∥ 멈춤'}</button>
      <button class="btn tiny" id="bar-skip" ${dead || S.pending ? 'disabled' : ''}>다음 결정까지 »</button>
      <button class="btn tiny toggle ${p.auto ? 'on' : ''}" id="bar-auto" title="결정을 자동으로 맡깁니다">자동 결정 ${p.auto ? '켬' : '끔'}</button>
      <button class="btn tiny ghost" id="bar-theme" title="밝은 화면 / 어두운 화면">${app.actions.themeLabel()}</button>
      <button class="btn tiny ghost" id="bar-exit">나가기</button>
    </div>
    <div class="bar-prog"><div class="bar-prog-fill" id="lf-prog" style="width:${(Math.min(1, S.t) * 100).toFixed(1)}%"></div></div>`);
  R.bar.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => A.setSpeed(+b.dataset.speed)));
  $('#bar-pause', R.bar).addEventListener('click', () => A.togglePause());
  $('#bar-skip', R.bar).addEventListener('click', () => A.skipToDecision());
  $('#bar-auto', R.bar).addEventListener('click', () => A.toggleAuto());
  $('#bar-exit', R.bar).addEventListener('click', () => A.exitToStart());
  $('#bar-theme', R.bar).addEventListener('click', (e) => { A.toggleTheme(); e.currentTarget.textContent = A.themeLabel(); });
}

// ── 좌측 ───────────────────────────────────────────────
function renderId(app) {
  const S = app.S; const sim = app.sim;
  const [m1, m2] = MRZ(S, sim);
  const status = statusWord(sim);
  const st = standingOf(sim);
  const arch = sim.track ? sim.track.archetype : null;
  const prof = capProfile(S, arch);
  const traits = traitWords(S, arch);
  const res = residenceLine(sim);
  const housing = housingName(sim);
  const dream = dreamLine(sim);   // W16(D56)
  const f = (k, v, w) => `<div class="f${w ? ' w' : ''}"><dt>${k}</dt><dd>${v}</dd></div>`;
  setHtml(R.id, `
    <div class="id-head"><span class="lbl"><span class="en">Operator file</span>테라 신원 기록</span><span class="mono id-no">${esc(certNo(S))}</span></div>
    <div class="id-body">
      <div class="pixel-slot small" aria-hidden="true"></div>
      <div class="id-main">
        <div class="id-name">${esc(S.name.full)}</div>
        <div class="id-sub">${SEX(S.sex)} · ${esc(sim.race.name)}</div>
        <div class="id-status">${esc(status)}</div>
        ${st ? `<div class="standing" title="${esc(st.name)} ${st.v}"><span class="standing-k">${esc(st.name)}</span><span class="stat-bar"><span class="stat-fill s-standing" style="width:${st.v}%"></span></span></div>` : ''}
      </div>
    </div>
    <div class="caps" aria-label="역량">
      ${prof.caps.map((c) => `<span class="cap g-${GRADE_KEY[c.grade] || 'mid'}" title="${c.delta > 0.005 ? '올해 오름' : c.delta < -0.005 ? '올해 내림' : '변화 없음'}"><i>${esc(c.label)}</i><b>${esc(c.grade)}${c.delta > 0.005 ? '<em class="cap-d up">▲</em>' : c.delta < -0.005 ? '<em class="cap-d dn">▼</em>' : ''}</b><em class="cap-dots" title="다음 등급까지">${'●'.repeat(c.dots ?? 0)}${'○'.repeat(3 - (c.dots ?? 0))}</em></span>`).join('')}
    </div>
    ${traits.length ? `<div class="traits">${traits.map((t) => `<span class="trait">${esc(t)}</span>`).join('')}</div>` : ''}
    <dl class="id-kv">
      ${f('출생', `${esc(nationName(sim, S.born))} · 테라력 ${S.by}년`, true)}
      ${f('거주', `${esc(nationName(sim, S.cur))} · ${esc(housing || homeWord(S))}${S.flags.quarantined ? ' · <b class="stamp-text">격리</b>' : ''}`, true)}
      ${res ? f('거주 상태', esc(res), true) : ''}
      ${dream ? f('꿈', `<span title="${esc(dream.title)}" class="${dream.done ? 'dream-done' : dream.given ? 'dream-given' : ''}">${esc(dream.text)}</span>`, true) : ''}
      ${f('출신 가정', `<span class="dots">${Q_DOTS(S.q)}</span>`)}
      ${f('학력', `${esc(EDU_LABEL[Math.min(4, S.edu || 0)])}${S.flags.casterRoute ? ' · 캐스터' : ''}`)}
      ${S.trait ? f('기질', esc(TRAIT_LABEL[S.trait] || S.trait)) : ''}
      ${S.fam.marriage ? f('혼인', esc(S.fam.marriage.name || '')) : ''}
      ${S.lifeMul !== 1 ? f('인간 척도', `${Math.round(humanAge(S.age, S.lifeMul))}세`) : ''}
    </dl>
    <div class="mrz mono"><div>${esc(m1)}</div><div>${esc(m2)}</div></div>`);
}

/** 로도스 아일랜드 블록(§10.3): 오퍼레이터(외근부)면 캐논 6종 등급, 환자·감염 직원이면 임상 진단 분석. 접이식 */
function renderRhodes(app) {
  const sim = app.sim; const S = app.S;
  const card = S.rhodes ? rhodesCard(sim) : null;
  if (!card) { R.rhodes.hidden = true; return; }
  R.rhodes.hidden = false;
  const open = rhodesOpen == null ? true : rhodesOpen;
  const head = (RHODES_STATUS[card.status] || card.status) + (card.deptLabel && card.status !== 'patient' ? ' · ' + card.deptLabel : '');
  const prof = card.profile ? `
      <div class="op-grid" aria-label="오퍼레이터 능력 평가">
        ${card.profile.map((r) => `<div class="op-row"><span class="op-k">${esc(r.label)}</span><b class="op-v g-${OP_KEY[r.grade] || 'mid'}">${esc(r.grade)}</b></div>`).join('')}
      </div>
      <div class="footnote">(로도스 아일랜드 인사부 · 외근 오퍼레이터 능력 평가표)</div>` : '';
  const cl = card.clinical ? `
      <div class="clinic">
        <div class="clinic-h">임상 진단 분석</div>
        <div class="clinic-row"><span>[체세포와 오리지늄 융합률]</span><b class="mono">${card.clinical.fusion.toFixed(0)}%</b></div>
        <div class="clinic-row"><span>[혈중 오리지늄 결정 밀도]</span><b class="mono">${card.clinical.density.toFixed(2)} u/L</b></div>
        <p class="clinic-line">${esc(card.clinical.line || '')}</p>
      </div>
      <div class="footnote">(로도스 아일랜드 의료부 · 검사 담당의 소견)</div>` : '';
  setHtml(R.rhodes, `
    <details class="fold" ${open ? 'open' : ''}>
      <summary class="fold-head"><span class="lbl"><span class="en">Rhodes Island</span>로도스 아일랜드</span><span class="fold-sub">${esc(head)}</span></summary>
      <div class="fold-body">
        <div class="money-row"><span>합류</span><span>${card.since != null ? card.since + '세' : '—'}${card.viaLine ? ' · ' + esc(card.viaLine) : ''}</span></div>
        ${prof}${cl}
        ${!prof && !cl ? '<p class="muted small">배에서 맡은 일 외에 기록된 평가는 없습니다.</p>' : ''}
      </div>
    </details>`);
  $('details', R.rhodes).addEventListener('toggle', (e) => { rhodesOpen = e.currentTarget.open; });
}

function renderStats(app) {
  const S = app.S;
  setHtml(R.stats, `<h2 class="h-small"><span class="en">Status</span>상태</h2>` + ['hl', 'h'].map((k) => {
    const v = Math.round(S.st[k]);
    return `<div class="stat"><span class="stat-k">${STAT_LABEL[k]}</span><span class="stat-bar"><span class="stat-fill s-${k}" style="width:${v}%"></span></span><span class="stat-v mono">${v}</span></div>`;
  }).join(''));
}

function renderMoney(app) {
  const S = app.S; const sim = app.sim;
  const med = sim.med;
  const rel = S.income ? (S.income / med) : 0;
  const extra = [];
  if (S.pension) extra.push('연금 ' + lmd(S.pension) + '/년');
  if (S.flags.oriPremium) extra.push('감염자 보험료 ' + lmd(S.flags.oriPremium) + '/년');
  if (S.flags.oriFees) extra.push('보호비 납부 중');
  if (S.money < 0) extra.push('빚');
  const work = S.track ? statusWord(sim) + ' · ' + Math.max(0, S.age - (S.track.since ?? S.age)) + '년째' : S.job ? jobName(sim, S.job) + ' · ' + S.jobY + '년째' : null;
  setHtml(R.money, `
    <h2 class="h-small"><span class="en">Assets</span>돈 <span class="muted">(용문폐, LMD)</span></h2>
    <div class="money-main"><span class="money-v mono ${S.money < 0 ? 'neg' : ''}">${esc(lmd(S.money))}</span><span class="muted small">순자산</span></div>
    <div class="money-row"><span>연 소득</span><span class="mono">${esc(lmd(S.income))}</span></div>
    <div class="money-row"><span>소득 위치</span><span>${S.income ? esc(nationName(sim, S.cur)) + ' 상위 ' + Math.round((1 - S.pct) * 100) + '%' + (rel ? ' · 중위소득의 ' + rel.toFixed(1) + '배' : '') : '—'}</span></div>
    ${work ? `<div class="money-row"><span>일</span><span>${esc(work)}</span></div>` : ''}
    ${S.home && S.home.owned ? `<div class="money-row"><span>집</span><span>${esc(housingName(sim) || '소유')} · 소유</span></div>` : ''}
    ${S.fam.partner && S.fam.partner.alive && S.fam.partner.inc ? `<div class="money-row"><span>배우자 소득</span><span class="mono">${esc(lmd(S.fam.partner.inc))}</span></div>` : ''}
    ${extra.length ? `<div class="money-row muted small">${esc(extra.join(' · '))}</div>` : ''}
    <div class="footnote">(용문폐 환산, 용문 금융국 고시 환율)</div>`);
}

function renderOri(app) {
  const S = app.S;
  if (!(S.ori.on && S.ori.known)) { R.ori.hidden = true; return; }
  R.ori.hidden = false;
  const uL = S.ori.uL;
  const w = Math.min(100, uL / 0.8 * 100);
  setHtml(R.ori, `
    <h2 class="h-small"><span class="en">Oripathy</span>광석병 <span class="stamp-text">${esc(STAGE_LABEL[S.ori.stage])}</span></h2>
    <div class="stat"><span class="stat-k">u/L</span><span class="stat-bar"><span class="stat-fill s-ori" style="width:${w.toFixed(1)}%"></span></span><span class="stat-v mono">${uL.toFixed(2)}</span></div>
    <div class="money-row"><span>감염</span><span>${S.stats.infectedAt != null ? S.stats.infectedAt + '세' : '—'} · 판정 ${S.flags.oriKnownAt != null ? S.flags.oriKnownAt + '세' : '—'}</span></div>
    <div class="money-row"><span>정책 · 처분</span><span>${esc(POLICY_LABEL[S.flags.oriPolicy] || S.flags.oriPolicy || '—')} · ${esc(ORI_OUTCOME[S.flags.oriOutcome] || S.flags.oriOutcome || '—')}</span></div>
    <div class="money-row"><span>치료</span><span>${S.rhodes ? '로도스 아일랜드' : S.ori.treated ? '받는 중' : S.flags.oriHidden ? '숨김' : '없음'}</span></div>
    <div class="footnote">(0.80 u/L 에서 결정화. 치료는 늦출 뿐입니다 — 로도스 아일랜드 의료부)</div>`);
}

function renderFam(app) {
  const S = app.S; const sim = app.sim; const f = S.fam;
  const person = (p, who) => {
    if (!p) return '';
    if (p.absent) return `<li><span class="who">${who}</span> 곁에 없음</li>`;
    return `<li class="${p.alive ? '' : 'gone'}"><span class="who">${who}</span> ${esc(p.name)}${p.age != null ? ' · ' + p.age + '세' : ''}${p.job ? ' · ' + esc(jobName(sim, p.job)) : ''}${p.infected ? ' · 감염자' : ''}${p.alive ? '' : ' · 별세'}</li>`;
  };
  const kids = f.kids.map((k) => `<li class="${k.alive ? '' : 'gone'}"><span class="who">자녀</span> ${esc(k.name)} · ${S.age - k.bornAt}세${k.infected ? ' · 감염' : ''}${k.alive ? '' : ' · 잃음'}</li>`).join('');
  const second = (f.partners || []).map((p) => person(p, '배우자')).join('');
  setHtml(R.fam, `
    <h2 class="h-small"><span class="en">Family</span>가족</h2>
    <ul class="fam">
      ${person(f.mom, '어머니')}
      ${person(f.dad, '아버지')}
      ${f.older || f.younger ? `<li><span class="who">형제</span> 위로 ${f.older}명 · 아래로 ${f.younger}명</li>` : ''}
      ${f.partner ? person(f.partner, '배우자') : (S.age >= 18 ? '<li class="muted"><span class="who">배우자</span> 없음</li>' : '')}
      ${second}
      ${kids}
    </ul>`);
}

// ── 가운데 ─────────────────────────────────────────────
export function renderFocus(app) {
  if (!R) return;
  const S = app.S; const sim = app.sim;
  const opts = focusOptions(sim);
  if (!opts.length) { setHtml(R.focus, `<h2 class="h-small"><span class="en">Focus</span>올해의 초점</h2><p class="muted small">아직 아기입니다. 초점은 6세부터 고릅니다.</p>`); return; }
  setHtml(R.focus, `<h2 class="h-small"><span class="en">Focus</span>올해의 초점 <span class="muted">(연중 비율만큼 연말에 반영)</span></h2><div class="chips" id="focus-chips"></div>`);
  const box = $('#focus-chips', R.focus);
  for (const k of opts) {
    const b = el('button.chip', { type: 'button', class: k === S.focus ? 'on' : '', title: focusHint(k) }, focusLabel(k), el('span.chip-hint', {}, focusHint(k)));
    b.addEventListener('click', () => app.actions.setFocus(k));
    box.appendChild(b);
  }
}

/** 인생 기록 강조 키: 진로 id·단계·거주국·혼인·주거가 바뀐 직후의 기록은 중대 기록(k-big)처럼 보인다 */
function mileKey(S) {
  if (!S) return '';
  return (S.track ? S.track.id + ':' + S.track.stage : '-') + '|' + S.cur + '|' + (S.fam.marriage ? S.fam.marriage.at : '-') + '|' + (S.home ? S.home.housing : '-');
}
const MILE_RE = /들어갔습니다|옮겨 갔습니다|옮겼습니다|옮겨졌습니다|마련했습니다|돌아갔습니다|결혼했습니다|합류했습니다|떠났습니다|마쳤습니다|되었습니다|올라섰습니다/;

function logNode(e) {
  const n = el('div.log-line.k-' + (e.k || 'ev') + (e.m ? ' k-m' : ''), {},
    el('span.log-a.mono', {}, e.a + '세'),
    el('span.log-t', {}, e.t),
    e.fx && fxText(e.fx) ? el('span.log-fx', {}, fxText(e.fx)) : null,
    e.f ? el('div.log-f', {}, e.f) : null);
  return n;
}
function renderLog(app) {
  const S = app.S;
  R.log.innerHTML = '';
  const frag = document.createDocumentFragment();
  const list = S.log.slice(-LOG_MAX);
  for (let i = list.length - 1; i >= 0; i--) frag.appendChild(logNode(list[i]));
  R.log.appendChild(frag);
  R.logcount.textContent = S.log.length + '줄';
}
export function onLog(app, e) {
  if (!R) return;
  const key = mileKey(app.S);
  if (key !== lastMile && !e.m && ['ev', 'note', 'warm'].includes(e.k || 'ev') && MILE_RE.test(e.t || '')) e.m = 1;   // 저장되는 기록에 표식만 남긴다(k 는 엔진 것 그대로)
  lastMile = key;
  R.log.insertBefore(logNode(e), R.log.firstChild);
  while (R.log.childElementCount > LOG_MAX) R.log.removeChild(R.log.lastChild);
  R.logcount.textContent = app.S.log.length + '줄';
}

// ── 우측 ───────────────────────────────────────────────
function renderMap(app) {
  if (!R) return;
  const S = app.S;
  const e0 = Math.round(S.e0);
  const cells = [];
  const total = Math.max(e0 + 1, S.age + 1, 10);
  const byAge = Object.fromEntries(S.years.map((y) => [y.a, y]));
  for (let a = 0; a < total; a++) {
    const y = byAge[a];
    let cls = 'mc';
    let title = a + '세';
    if (y) {
      cls += ' h' + Math.min(4, Math.floor(y.h / 20));
      title += ' · 테라력 ' + y.y + '년 · 행복 ' + y.h + ' · 건강 ' + y.hl + (y.uL ? ' · ' + y.uL.toFixed(2) + ' u/L' : '');
    } else if (a === S.age && S.phase === 'life') { cls += ' now'; title += ' (지금)'; }
    else cls += ' future';
    if (a === e0) { cls += ' e0'; title += ' · 기대수명'; }
    if (S.deathAt && a === S.deathAt.age) { cls += ' dead'; title += ' · 사망'; }
    cells.push(`<i class="${cls}" title="${esc(title)}"></i>`);
  }
  setHtml(R.map, `<h2 class="h-small"><span class="en">Life map</span>인생 지도 <span class="muted">(1칸 = 1년, 색 = 행복)</span></h2><div class="map">${cells.join('')}</div>
    <div class="map-legend muted small"><i class="mc h0"></i>낮음 <i class="mc h4"></i>높음 <i class="mc e0"></i>기대수명 ${e0}세 <i class="mc now"></i>지금</div>`);
}

function renderNation(app) {
  const sim = app.sim; const n = sim.nation;
  const rows = nationStatRows(sim, n);
  setHtml(R.nation, `
    <h2 class="h-small"><span class="en">Nation</span>${esc(n.name)} <span class="muted">국가 통계</span></h2>
    <table class="kv small">
      <tbody>${rows.map(([k, v, f]) => `<tr><th>${esc(k)}</th><td>${esc(v)}${f ? `<div class="footnote">${esc(f)}</div>` : ''}</td></tr>`).join('')}</tbody>
    </table>
    <p class="footnote">(${esc(n.statOrg)} 집계 · 로도스 아일랜드 의료부 교차 검토)</p>`);
}
