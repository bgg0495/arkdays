// W9e 검증: node test/sim-w9e.js [N=500] [seed=w9e]
// 컬럼비아·시라쿠사 진로 콘텐츠(content/tracks/columbia.js·siracusa.js)를 기존 콘텐츠 뒤에 등록하고
//   1) 두 나라 출생으로 N명 자동 시뮬 → 예외 0
//   2) 진로×단계마다 탐침 생(K명, 그 단계로 직접 진입) → 단계별 이벤트 발화 0인 곳이 없는지
//   3) 이 두 파일이 낸 문장의 조사 오류(D30)·금지 문구(D25)·각주 비율(D31)
// 예외·발화 0 단계·조사 오류·금지 문구가 하나라도 있으면 exit 1. 공용 파일은 건드리지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareData } from '../src/engine/data.js';
import { createRegistry } from '../src/engine/content.js';
import { createSim } from '../src/engine/sim.js';
import { hasBatchim, lastJong } from '../src/engine/text.js';
import content from '../content/index.js';
import columbia from '../content/tracks/columbia.js';
import siracusa from '../content/tracks/siracusa.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = parseInt(process.argv[2] || '500', 10);
const SEED = process.argv[3] || 'w9e';
const K = parseInt(process.env.PROBE || '6', 10);
const NATIONS = ['columbia', 'siracusa'];
const PACKS = { columbia, siracusa };

function loadData(root = ROOT) {
  const raw = {};
  const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const f of ['nations', 'races', 'jobs', 'causes', 'names', 'stats1950']) raw[f] = readJson(path.join(root, 'data', f + '.json'));
  const terraFile = path.join(root, 'data', 'terra_e0.json');
  if (fs.existsSync(terraFile)) raw.terra = readJson(terraFile);
  const tracksDir = path.join(root, 'data', 'tracks');
  raw.tracks = fs.readdirSync(tracksDir).filter((f) => f.endsWith('.json')).sort().map((f) => readJson(path.join(tracksDir, f)));
  for (const f of ['affiliations', 'relations', 'marriage', 'housing', 'rhodes', 'canon_figures']) { const p = path.join(root, 'data', f + '.json'); if (fs.existsSync(p)) raw[f] = readJson(p); }
  return { data: prepareData(raw), raw };
}

// ── 발화 집계: 이 두 파일의 이벤트 run / 결정 build·apply 를 감싸 현재 출처를 기록한다(기록은 감싼 쪽에서 바로 남겨 출처가 붙게 한다) ──
const fired = {};           // event id → 횟수
const decFired = {};        // decision id → 횟수
const MINE_EV = new Set(), MINE_DEC = new Set();
let cur = null;
function wrapPack(pack) {
  const events = pack.events.map((e) => { MINE_EV.add(e.id); return { ...e, run: (s) => { cur = 'ev:' + e.id; try { fired[e.id] = (fired[e.id] || 0) + 1; s.logResult(e.run(s), 'ev'); return undefined; } finally { cur = null; } } }; });
  const decisions = {};
  for (const [id, d] of Object.entries(pack.decisions)) {
    MINE_DEC.add(id);
    decisions[id] = { ...d,
      build: (s, p) => { cur = 'dec:' + id; try { return d.build(s, p); } finally { cur = null; } },
      apply: (s, k, p, t) => { cur = 'dec:' + id; try { decFired[id] = (decFired[id] || 0) + 1; s.logResult(d.apply(s, k, p, t), 'ev'); return undefined; } finally { cur = null; } } };
  }
  return { events, decisions };
}

// ── 문장 검사(check-text.js 와 같은 규칙) ──
function vocabulary(data, raw) {
  const V = new Set();
  const add = (w) => { if (typeof w === 'string') { const s = w.trim(); if (s.length >= 2) V.add(s); } };
  for (const n of data.nations) { add(n.name); add(n.statOrg); const c = n.culture || {}; for (const k of ['greet', 'address', 'elder', 'food', 'ruler', 'rulerTitle', 'drink']) { add(c[k]); if (c[k]) for (const part of String(c[k]).split(/와 |과 /)) add(part); } for (const f of c.festivals || []) add(f); }
  for (const r of data.races) add(r.name);
  for (const j of data.jobs) add(j.name);
  for (const c of data.causes) add(c.label);
  for (const t of data.tracks) { add(t.name); for (const st of t.stages) { add(st.name); add(st.title); } }
  for (const a of data.affiliations) add(a.name);
  const names = raw.names || {};
  for (const pool of Object.values(names)) { if (!pool || typeof pool !== 'object') continue; for (const key of ['m', 'f', 's']) for (const w of pool[key] || []) add(w); }
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
  return (text) => { const out = []; let m; re.lastIndex = 0; while ((m = re.exec(text))) { const exp = expectParticle(m[2], m[3]); if (exp !== m[3]) out.push({ word: m[2], p: m[3], exp, text }); } return out; };
}
const FORBIDDEN = ['테라가 아니었다면', '광석병도 재앙도 없는 땅', /이 땅이 [0-9.]+년을 가져갔/, '신뢰구간', '민감도', '추정', '임시', '창작', '1950', 'D9', '시뮬', '현실', '환율은', '묻지 마십시오', '§', 'conflict', 'oriExp', 'catFreq', 'threat:', 'nation:', 'canon', '플래그', '가중', '메모', '세션'];
const forbiddenIn = (t) => FORBIDDEN.filter((f) => (typeof f === 'string' ? t.includes(f) : f.test(t))).map((f) => (typeof f === 'string' ? f : f.source));

function runLife(sim, S, onYear) {
  let guard = 0;
  while (S.phase === 'life') { if (onYear && onYear() === false) break; sim.runYear(); if (++guard > 500) throw new Error('500년 초과'); }
}

function main() {
  const { data, raw } = loadData();
  const registry = content.install(createRegistry());
  for (const n of NATIONS) registry.use(wrapPack(PACKS[n]));
  const mineEv = NATIONS.reduce((a, n) => a + PACKS[n].events.length, 0);
  const mineDec = NATIONS.reduce((a, n) => a + Object.keys(PACKS[n].decisions).length, 0);
  console.log('콘텐츠: 이벤트 ' + registry.events.length + ' / 결정 ' + Object.keys(registry.decisions).length + '  (W9e: 이벤트 ' + mineEv + ' / 결정 ' + mineDec + ' — ' + NATIONS.map((n) => n + ' ' + PACKS[n].events.length + '/' + Object.keys(PACKS[n].decisions).length).join(', ') + ')');

  const texts = [];       // { src, t, f }
  const evLog = { n: 0, f: 0 };
  let errors = 0;
  const hooks = {
    log: (e) => { if (!cur) return; texts.push({ src: cur, t: e.t }); if (e.f) texts.push({ src: cur + ':f', t: e.f }); if (cur.startsWith('ev:')) { evLog.n++; if (e.f) evLog.f++; } },
    decision: (pd) => { if (!MINE_DEC.has(pd.id)) return; const v = pd.view; const src = 'dec:' + pd.id; texts.push({ src, t: v.title }); texts.push({ src, t: v.body }); if (v.fact) texts.push({ src: src + ':f', t: v.fact }); for (const c of v.choices || []) { texts.push({ src, t: c.label }); if (c.sub) texts.push({ src, t: c.sub }); } },
  };
  const stat = { lives: 0, tracks: {}, stages: {}, falls: {}, insurance: 0, exile: 0, rhodesFlags: 0, canon: 0, married: {}, housingDec: 0 };
  const t0 = Date.now();

  // 1) 두 나라 출생 자연 시뮬
  for (let i = 0; i < N; i++) {
    const nation = NATIONS[i % NATIONS.length];
    const sim = createSim({ data, seed: SEED + ':' + i, content: registry, auto: true, hooks });
    try {
      const S = sim.newLife({ nation });
      sim.start();
      runLife(sim, S);
      stat.lives++;
      for (const h of S.trackHist.concat(S.track ? [{ id: S.track.id, how: 'alive' }] : [])) stat.tracks[h.id] = (stat.tracks[h.id] || 0) + 1;
      if (S.flags.lastFall) stat.falls[S.flags.lastFall] = (stat.falls[S.flags.lastFall] || 0) + 1;
      if (S.trackHist.some((h) => h.id === 'COL_INSURANCE') || (S.track && S.track.id === 'COL_INSURANCE')) stat.insurance++;
      if ((S.flags.migHist || []).some((m) => m.reason === 'exile')) stat.exile++;
      if (S.flags.rhodes_medical_pact != null || S.flags.rhodes_operation != null || S.flags.rhodes_legal != null) stat.rhodesFlags++;
      if (S.flags.canonSeen) stat.canon += S.flags.canonSeen;
      if (S.fam.marriage) stat.married[S.cur + ':' + S.fam.marriage.type] = (stat.married[S.cur + ':' + S.fam.marriage.type] || 0) + 1;
      for (const k of ['hl', 'h']) if (!Number.isFinite(S.st[k])) throw new Error('NaN stat ' + k);
      if (!Number.isFinite(S.money)) throw new Error('NaN money');
      if (S.track && !data.trackById[S.track.id]) throw new Error('track 깨짐');
    } catch (e) { errors++; if (errors <= 5) console.error('[자연 #' + i + ' ' + nation + '] ' + (e && e.stack || e)); }
  }

  // 2) 진로×단계 탐침: 그 단계로 직접 넣고 끝까지 산다
  const probeFired = {};   // track:stage → 그 단계 태그 이벤트 발화 수(자연 + 탐침)
  let probes = 0;
  for (const nation of NATIONS) {
    for (const t of data.tracksByNation[nation]) {
      for (let si = 0; si < t.stages.length; si++) {
        for (let k = 0; k < K; k++) {
          const sim = createSim({ data, seed: SEED + ':probe:' + t.id + ':' + si + ':' + k, content: registry, auto: true, hooks });
          try {
            const S = sim.newLife({ nation });
            sim.start();
            const startAge = Math.max(t.entry.ages[0], 10) + si * 2;
            runLife(sim, S, () => S.age < startAge);
            if (S.phase !== 'life') continue;
            if (!sim.enterTrack(t.id, { stage: si, how: 'content', skipExam: true, quiet: true })) continue;
            probes++;
            // 단계가 바뀌면 그만 산다(다른 단계 집계 오염 방지는 하지 않음 — 발화 수만 본다)
            runLife(sim, S);
          } catch (e) { errors++; if (errors <= 5) console.error('[탐침 ' + t.id + ':' + si + ' #' + k + '] ' + (e && e.stack || e)); }
        }
      }
    }
  }
  const ms = Date.now() - t0;

  // ── 집계: 단계 태그별 발화 ──
  const stageTagCount = {};   // 'track:ID:stage' → 발화 합
  const trackTagCount = {};   // 'ID' → track:ID(단계 무관) 이벤트 발화 합
  for (const n of NATIONS) for (const e of PACKS[n].events) {
    const c = fired[e.id] || 0;
    for (const tg of e.tags) {
      const m = /^track:([A-Z_]+)(?::([a-z_]+))?$/.exec(tg);
      if (!m) continue;
      if (m[2]) stageTagCount[tg] = (stageTagCount[tg] || 0) + c; else trackTagCount[m[1]] = (trackTagCount[m[1]] || 0) + c;
    }
  }
  const zeroStages = [], noContentStages = [];
  console.log('\n진로·단계별 발화 (자연 ' + N + '명 + 탐침 ' + probes + '생, ' + ms + 'ms)');
  for (const nation of NATIONS) {
    for (const t of data.tracksByNation[nation]) {
      const parts = t.stages.map((st) => { const tg = 'track:' + t.id + ':' + st.id; const has = PACKS[nation].events.some((e) => e.tags.includes(tg)); const c = stageTagCount[tg] || 0; if (!has) noContentStages.push(tg); else if (!c) zeroStages.push(tg); return st.id + ' ' + (has ? c : '×'); });
      console.log('  ' + t.id.padEnd(14) + ' 공통 ' + String(trackTagCount[t.id] || 0).padStart(4) + ' | ' + parts.join(', '));
    }
  }
  const zeroEvents = [...MINE_EV].filter((id) => !fired[id]);
  const zeroDecs = [...MINE_DEC].filter((id) => !decFired[id]);
  console.log('W9e 이벤트 미발화 ' + zeroEvents.length + '개' + (zeroEvents.length ? ': ' + zeroEvents.join(', ') : ' ✓'));
  console.log('W9e 결정 미발화 ' + zeroDecs.length + '개' + (zeroDecs.length ? ': ' + zeroDecs.join(', ') : ' ✓'));
  console.log('자연 시뮬 집계: 진로 경험 ' + Object.entries(stat.tracks).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '));
  console.log('  몰락 cause: ' + Object.entries(stat.falls).map(([k, v]) => k + ' ' + v).join(', ') + ' | 보험 진로 ' + stat.insurance + ' | 추방 ' + stat.exile + ' | 로도스 접점 ' + stat.rhodesFlags + ' | 캐논 조우 ' + stat.canon);
  console.log('  결혼 유형: ' + Object.entries(stat.married).map(([k, v]) => k + ' ' + v).join(', '));

  // ── 문장 검사 ──
  const check = buildChecker(vocabulary(data, raw));
  const bad = [];
  for (const x of texts) for (const h of check(x.t)) bad.push({ ...h, src: x.src });
  const badKey = {};
  for (const b of bad) { const k = b.word + b.p + '→' + b.exp + ' @' + b.src; badKey[k] = (badKey[k] || 0) + 1; }
  console.log('\n문장 ' + texts.length + '개(W9e 출처만) · 조사 오류 ' + bad.length + '건' + (bad.length ? '' : ' ✓'));
  for (const [k, n] of Object.entries(badKey).sort((a, b) => b[1] - a[1]).slice(0, 30)) { const ex = bad.find((b) => b.word + b.p + '→' + b.exp + ' @' + b.src === k); console.log('  ' + n + '× ' + k + '  예: ' + ex.text.slice(0, 80)); }
  const forb = [];
  for (const x of texts) for (const h of forbiddenIn(x.t)) forb.push({ h, src: x.src, t: x.t });
  console.log('금지 문구(D25): ' + forb.length + '건' + (forb.length ? '' : ' ✓'));
  for (const f of forb.slice(0, 20)) console.log('  ' + f.h + ' @' + f.src + '  예: ' + f.t.slice(0, 80));
  const evR = evLog.n ? evLog.f / evLog.n : 0;
  console.log('각주 비율(D31, W9e 이벤트 기록): ' + (evR * 100).toFixed(1) + '% (' + evLog.f + '/' + evLog.n + ', 목표 10~20%)');

  const ok = !errors && !zeroStages.length && !noContentStages.length && !bad.length && !forb.length;
  console.log('\n검증: 예외 ' + errors + '건 / 단계 이벤트 없음 ' + (noContentStages.length ? noContentStages.join(', ') : '없음') + ' / 단계 발화 0 ' + (zeroStages.length ? zeroStages.join(', ') : '없음') + ' / 조사 ' + bad.length + ' / 금지 ' + forb.length);
  console.log(ok ? '통과' : '실패');
  if (!ok) process.exitCode = 1;
}

main();
