// W9g 검증 시뮬: node test/sim-w9g.js [N=500] [seed=w9g]
// 사르곤·볼리바르·림 빌리턴 출생으로 N명을 돌려(국가 순환) content/tracks/{sargon,bolivar,rim}.js 를 content/index.js 뒤에 등록하고
//   1) 예외 0건  2) 진로·단계마다 track:<ID>:<stage>(또는 track:<ID>) 이벤트 발화 수 — 0인 곳 목록
//   3) 결정 발화 수  4) 문장 검사(조사·금지어·각주 비율; test/check-text.js 와 같은 규칙을 W9g 문장에만 적용)
// 를 출력한다. content/index.js 는 건드리지 않는다(등록은 W11).
// 커버리지 보강: 나라마다 두 명 중 한 명은 20~40세(학교·복무 중이 아닐 때)에 그 나라 진로를 차례로 강제 진입시키고(떠나면 두 번까지 재진입) 단계 최소 연수(최대 3년)마다 강제 승급해 상위 단계·강제 진로까지 밟는다(COVER=0 이면 끔).
// 알려진 엔진 문제 우회: tracksFor() 가 region 이 있는 진로(SAR_TRIBE·BOL_SINGAS 등)를 parent 없는 국가에서 걸러 버리므로, 여기서만 region 을 regionTag 로 옮겨 연다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareData } from '../src/engine/data.js';
import { createRegistry } from '../src/engine/content.js';
import { createSim } from '../src/engine/sim.js';
import { hasBatchim, lastJong } from '../src/engine/text.js';
import content from '../content/index.js';
import sargon, { sarRegion } from '../content/tracks/sargon.js';
import bolivar, { bolFaction } from '../content/tracks/bolivar.js';
import rim from '../content/tracks/rim.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = parseInt(process.argv[2] || '500', 10);
const SEED = process.argv[3] || 'w9g';
const COVER = process.env.COVER !== '0';
const NATIONS = ['sargon', 'bolivar', 'rim'];
const PACKS = { sargon, bolivar, rim };

function loadData() {
  const raw = {};
  const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const f of ['nations', 'races', 'jobs', 'causes', 'names', 'stats1950']) raw[f] = readJson(path.join(ROOT, 'data', f + '.json'));
  const terra = path.join(ROOT, 'data', 'terra_e0.json');
  if (fs.existsSync(terra)) raw.terra = readJson(terra);
  const dir = path.join(ROOT, 'data', 'tracks');
  raw.tracks = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => readJson(path.join(dir, f)));
  for (const f of ['affiliations', 'relations', 'marriage', 'housing', 'rhodes', 'canon_figures']) { const p = path.join(ROOT, 'data', f + '.json'); if (fs.existsSync(p)) raw[f] = readJson(p); }
  const data = prepareData(raw);
  // region 우회(위 주석)
  // (W11: 엔진 tracksFor 가 소지역 region 을 통과시키므로 우회 제거)
  // 알려진 엔진 문제 우회 2: finance.js 가 A11 소득을 income.stage[stage] 로 나누므로 0 이면 NaN(SAR_SLAVE 노예 단계). 여기서만 0.02 로 둔다 — W11 이 엔진 쪽에서 0 가드 필요
  const sl = data.trackById.SAR_SLAVE; if (sl && sl.income.stage[0] === 0) sl.income.stage[0] = 0.02;
  return { data, raw };
}

// ── 문장 검사(check-text.js 규칙 복제) ──
function vocabulary(data, raw) {
  const V = new Set();
  const add = (w) => { if (typeof w === 'string') { const s = w.trim(); if (s.length >= 2) V.add(s); } };
  for (const n of data.nations) { add(n.name); add(n.statOrg); const c = n.culture || {}; for (const k of ['greet', 'address', 'elder', 'food', 'ruler', 'rulerTitle', 'drink']) { add(c[k]); if (c[k]) for (const part of String(c[k]).split(/와 |과 /)) add(part); } for (const f of c.festivals || []) add(f); }
  for (const r of data.races) add(r.name);
  for (const j of data.jobs) add(j.name);
  for (const c of data.causes) add(c.label);
  for (const [, pool] of Object.entries(raw.names || {})) { if (!pool || typeof pool !== 'object') continue; for (const key of ['m', 'f', 's']) for (const w of pool[key] || []) add(w); }
  return [...V].sort((a, b) => b.length - a.length);
}
function expectParticle(word, p) {
  const b = hasBatchim(word);
  if (p === '은' || p === '는') return b ? '은' : '는';
  if (p === '이' || p === '가') return b ? '이' : '가';
  if (p === '을' || p === '를') return b ? '을' : '를';
  if (p === '과' || p === '와') return b ? '과' : '와';
  if (p === '으로' || p === '로') { const j = lastJong(word); return j !== 0 && j !== 8 ? '으로' : '로'; }
  if (p === '이라고' || p === '라고') return b ? '이라고' : '라고';
  return p;
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function buildChecker(vocab) {
  const re = new RegExp('(^|[\\s(「"\'‘“])(' + vocab.map(escapeRe).join('|') + ')(으로|이라고|라고|은|는|이|가|을|를|과|와|로)(?=$|[\\s.,!?)」"\'’”])', 'g');
  return (text) => { const out = []; let m; re.lastIndex = 0; while ((m = re.exec(text))) { const exp = expectParticle(m[2], m[3]); if (exp !== m[3]) out.push({ word: m[2], p: m[3], exp, at: m.index, text }); } return out; };
}
const FORBIDDEN = ['테라가 아니었다면', '광석병도 재앙도 없는 땅', /이 땅이 [0-9.]+년을 가져갔/, '신뢰구간', '민감도', '추정', '임시', '창작', '1950', 'D9', '시뮬', '현실', '환율은', '묻지 마십시오', '§', 'conflict', 'oriExp', 'catFreq', 'threat:', 'nation:', 'canon', '플래그', '가중', '메모', '세션'];
const forbiddenIn = (t) => FORBIDDEN.filter((f) => (typeof f === 'string' ? t.includes(f) : f.test(t))).map((f) => (typeof f === 'string' ? f : f.source));

const pad = (s, n, right = false) => { s = String(s); const w = [...s].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0); const sp = ' '.repeat(Math.max(0, n - w)); return right ? sp + s : s + sp; };
const pct = (v) => (v * 100).toFixed(1) + '%';

function main() {
  const { data, raw } = loadData();
  const registry = content.install(createRegistry());
  // W11: 국가 팩은 content/index.js 가 등록한다(중복 등록 방지)
  const mine = new Set();
  const myDec = new Set();
  for (const n of NATIONS) { for (const e of PACKS[n].events) mine.add(e.id); for (const id of Object.keys(PACKS[n].decisions)) myDec.add(id); }
  const myEvents = registry.events.filter((e) => mine.has(e.id));
  console.log('콘텐츠: 전체 이벤트 ' + registry.events.length + ' / 결정 ' + Object.keys(registry.decisions).length + '  (W9g: ' + NATIONS.map((n) => n + ' 이벤트 ' + PACKS[n].events.length + '·결정 ' + Object.keys(PACKS[n].decisions).length).join(' / ') + ')');

  // 진로·단계 → 그 단계에 열리는 W9g 이벤트 id 집합(track:ID:stage 또는 track:ID)
  const stageEvents = {};   // key 'ID:stage' → Set
  for (const n of NATIONS) for (const t of data.tracksByNation[n]) for (const st of t.stages) {
    const key = t.id + ':' + st.id; const set = new Set();
    for (const e of myEvents) for (const tg of e.tags) if (tg === 'track:' + t.id || tg === 'track:' + key) set.add(e.id);
    stageEvents[key] = set;
  }
  const evFire = {};        // 이벤트 id → 발화 수
  const decFire = {};       // 결정 id → 발화 수
  const stageYears = {};    // 'ID:stage' → 재직 연수
  const stageFire = {};     // 'ID:stage' → 그 단계에서 W9g 이벤트 발화 수
  const texts = [];
  const logStat = { ev: 0, evF: 0 };
  const push = (src, t) => { if (t && typeof t === 'string') texts.push({ src, t }); };
  let errors = 0; let lives = 0; const migr = {}; const rhodesFlags = { rhodes_operation: 0, rhodes_rescue: 0, rhodes_legal: 0, rhodes_medical_pact: 0 }; let forcedEntries = { SAR_SLAVE: 0, RIM_INFECTED: 0, BOL_REFUGEE: 0, RIM_EUREKA: 0 };
  const t0 = Date.now();

  for (let i = 0; i < N; i++) {
    const nation = NATIONS[i % NATIONS.length];
    const cover = COVER && Math.floor(i / 3) % 2 === 1;   // 나라마다 두 명 중 한 명
    let curStage = null; let lastEvMine = false;
    const hooks = {
      log: (e, sim) => {
        if (e.k === 'sys') return;
        const S = sim.S;
        const key = S.track ? S.track.id + ':' + (sim.stage ? sim.stage.id : '?') : null;
        // 발화한 이벤트 id 는 S.queue 처리 뒤 S.recent 끝에 있다 — fire 직전 planYear 가 ev_<id> 를 찍으므로 그것으로 센다
        if (e.f) { push('log-f:' + e.k, e.f); }
        push('log:' + e.k, e.t);
        if (e.k !== 'dec') { logStat.ev++; if (e.f) logStat.evF++; }
        if (key && lastEvMine) stageFire[key] = (stageFire[key] || 0) + 1;
      },
      decision: (pd, sim) => { const v = pd.view; push('dec:' + pd.id, v.title); push('dec:' + pd.id, v.body); if (v.fact) push('dec-f:' + pd.id, v.fact); for (const c of v.choices || []) { push('dec-ch:' + pd.id, c.label); if (c.sub) push('dec-ch:' + pd.id, c.sub); } if (myDec.has(pd.id)) decFire[pd.id] = (decFire[pd.id] || 0) + 1; },
      change() {}, death() {},
      year: (S, sim) => {
        if (S.track) { const k = S.track.id + ':' + (sim.stage ? sim.stage.id : '?'); stageYears[k] = (stageYears[k] || 0) + 1; }
        if (!cover || S.phase !== 'life') return;
        // 커버리지 보강: 18~24세에 그 나라 진로를 순환 강제 진입, 그 뒤 3년마다 강제 승급
        const list = data.tracksByNation[S.born].filter((t) => !t.synthetic);
        // 20세부터(18세 징집·복무 결정과 겹치지 않게), 떠나면 두 번까지 같은 진로에 다시 넣는다
        if (S.age >= 20 && S.age <= 40 && (S.flags.w9gRe || 0) < 3 && !S.track && !S.prison && !S.school && !S.serving) {
          const t = list[Math.floor(i / 6) % list.length];
          if (sim.enterTrack(t.id, { how: t.forcedEntry ? 'forced' : 'choose', skipExam: true, quiet: true })) { S.flags.w9gForced = t.id; S.flags.w9gRe = (S.flags.w9gRe || 0) + 1; }
        }
        if (S.flags.w9gForced && S.track && sim.stage && (S.age - S.track.stageSince) >= Math.min(3, Math.max(1, sim.stage.minYears || 1)) && sim.rng.chance(0.7)) sim.promote({ force: true, quiet: true });
      },
    };
    const sim = createSim({ data, seed: SEED + ':' + i, content: registry, auto: true, hooks });
    // 이벤트 발화 집계: 엔진이 S.flags['ev_'+id] 를 찍는 순간을 잡기 위해 fire 를 감싼다
    const origFire = sim.fire;
    sim.fire = (e) => { if (e && e.type === 'ev') { lastEvMine = mine.has(e.id); if (lastEvMine) evFire[e.id] = (evFire[e.id] || 0) + 1; } else lastEvMine = false; return origFire(e); };
    try {
      const S = sim.newLife({ nation });
      // 출생 지역·진영 롤(엔진이 region 을 롤하지 않으므로 콘텐츠 도우미로)
      if (nation === 'sargon') sarRegion(sim); else if (nation === 'bolivar') bolFaction(sim);
      sim.start();
      let guard = 0;
      while (S.phase === 'life') { sim.runYear(); if (++guard > 500) throw new Error('500년 초과'); }
      lives++;
      for (const m of S.flags.migHist || []) migr[m.reason + '→' + m.to] = (migr[m.reason + '→' + m.to] || 0) + 1;
      for (const k of Object.keys(rhodesFlags)) if (S.flags[k] != null) rhodesFlags[k]++;
      for (const h of S.trackHist.concat(S.track ? [{ id: S.track.id, how: 'alive' }] : [])) if (forcedEntries[h.id] != null && h.how !== 'promo') forcedEntries[h.id]++;
      if (process.env.TRACE && S.trackHist.some((h) => h.id === process.env.TRACE)) console.log('[trace #' + i + '] ' + S.trackHist.map((h) => h.id + '/' + h.stage + ' ' + h.from + '-' + h.to + ' ' + h.how).join(' → ') + ' | 사망 ' + S.deathAt.age + ' ' + S.deathAt.label + ' | lastFall ' + S.flags.lastFall);
      for (const k of ['hl', 'h']) if (!Number.isFinite(S.st[k])) throw new Error('NaN stat ' + k);
      if (S.track && !data.trackById[S.track.id]) throw new Error('track 깨짐');
      if (!Number.isFinite(S.money)) throw new Error('NaN money');
    } catch (e) { errors++; if (errors <= 5) console.error('[#' + i + ' ' + nation + '] ' + (e && e.stack || e)); }
  }
  console.log('N=' + N + ' seed=' + SEED + ' ' + (Date.now() - t0) + 'ms 예외 ' + errors + '건 (생 ' + lives + ', 커버리지 보강 ' + (COVER ? '켬' : '끔') + ')');

  // ── 진로·단계별 발화 ──
  console.log('\n[진로·단계별] 재직연수 / W9g 이벤트 발화 수 / 그 단계에 열린 W9g 이벤트 수 (0 = 문제)');
  const zero = [];
  for (const n of NATIONS) {
    console.log(' ' + data.nationById[n].name);
    for (const t of data.tracksByNation[n]) {
      const row = t.stages.map((st) => { const k = t.id + ':' + st.id; const y = stageYears[k] || 0, f = stageFire[k] || 0, open = stageEvents[k].size; if (f === 0 || open === 0) zero.push(k + (open === 0 ? '(이벤트 없음)' : y === 0 ? '(재직 0년)' : '(발화 0)')); return st.id + ' ' + y + 'y/' + f + '/' + open; });
      console.log('  ' + pad(t.id, 14) + row.join(' · '));
    }
  }
  console.log(zero.length ? '  ✗ 발화 0: ' + zero.join(', ') : '  ✓ 모든 진로·단계에서 발화');
  // 한 번도 발화하지 않은 W9g 이벤트
  const never = myEvents.filter((e) => !evFire[e.id]).map((e) => e.id);
  console.log('\n[이벤트] W9g ' + myEvents.length + '개 중 발화 ' + (myEvents.length - never.length) + '개' + (never.length ? ' / 미발화 ' + never.length + ': ' + never.join(', ') : ' ✓'));
  console.log('[결정] ' + [...myDec].map((id) => id + ' ' + (decFire[id] || 0)).join(', '));
  const decZero = [...myDec].filter((id) => !decFire[id]);
  console.log(decZero.length ? '  △ 결정 미발화(경고, 희귀 조건): ' + decZero.join(', ') : '  ✓ 모든 결정 발화');
  console.log('[강제 진입] ' + Object.entries(forcedEntries).map(([k, v]) => k + ' ' + v).join(', ') + ' | 로도스 접점 ' + Object.entries(rhodesFlags).map(([k, v]) => k + ' ' + v).join(', '));
  console.log('[이주] ' + Object.entries(migr).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => k + ' ' + v).join(', '));

  // ── 문장 검사 ──
  const vocab = vocabulary(data, raw);
  const check = buildChecker(vocab);
  const myTexts = texts.filter((x) => /^(log|dec)/.test(x.src));
  const bad = []; for (const x of myTexts) for (const h of check(x.t)) bad.push({ ...h, src: x.src });
  const badKey = {}; for (const b of bad) { const k = b.word + b.p + '→' + b.exp + ' @' + b.src; badKey[k] = (badKey[k] || 0) + 1; }
  console.log('\n[문장] ' + myTexts.length + '개 검사 — 조사 오류 ' + bad.length + '건' + (bad.length ? '' : ' ✓'));
  for (const [k, n] of Object.entries(badKey).sort((a, b) => b[1] - a[1]).slice(0, 20)) { const ex = bad.find((b) => b.word + b.p + '→' + b.exp + ' @' + b.src === k); console.log('  ' + n + '× ' + k + '  예: …' + ex.text.slice(Math.max(0, ex.at - 20), ex.at + ex.word.length + 12) + '…'); }
  const forb = []; for (const x of myTexts) for (const h of forbiddenIn(x.t)) forb.push({ h, src: x.src, t: x.t });
  console.log('[금지 문구] ' + forb.length + '건' + (forb.length ? '' : ' ✓'));
  const forbKey = {}; for (const f of forb) { const k = f.h + ' @' + f.src; forbKey[k] = (forbKey[k] || 0) + 1; }
  for (const [k, n] of Object.entries(forbKey).sort((a, b) => b[1] - a[1]).slice(0, 20)) { const ex = forb.find((f) => f.h + ' @' + f.src === k); console.log('  ' + n + '× ' + k + '  예: ' + ex.t.slice(0, 90)); }
  // W9g 이벤트만의 각주 비율: 소스에서 f: 가 있는 이벤트 비율로 근사 + 전체 기록 비율
  const withF = myEvents.filter((e) => /\bf: /.test(e.run.toString())).length;
  console.log('[각주] W9g 이벤트 중 각주 있는 것 ' + withF + '/' + myEvents.length + ' (' + pct(withF / myEvents.length) + ', 목표 10~20%) · 전체 기록 각주 비율 ' + pct(logStat.ev ? logStat.evF / logStat.ev : 0));
  // 소스 하드코딩 조사(W9g 파일만)
  const re = /\+ '(은|는|이|가|을|를|와|과|로|으로|라고|이라고)[ .,)'!?]/, re2 = /\}(은|는|이|가|을|를|와|과|로|으로)[ .,)'!?<]/;
  const src = [];
  for (const n of NATIONS) { const f = path.join(ROOT, 'content', 'tracks', n + '.js'); fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (re.test(l) || re2.test(l)) src.push(n + '.js:' + (i + 1)); }); }
  console.log('[소스 하드코딩 조사] ' + (src.length ? src.join(', ') : '0곳 ✓'));

  const ok = !errors && !zero.length && !bad.length && !forb.length && !src.length;   // 결정 미발화는 경고만(희귀 조건·등록 순서에 따라 달라진다)
  console.log('\n' + (ok ? '통과' : '실패'));
  if (!ok) process.exitCode = 1;
}

main();
