// W9d 검증: node test/sim-w9d.js [N=500] [seed=w9d]
// content/index.js 팩 + content/tracks/{victoria,tara,kazimierz}.js 를 등록하고(더미 진로 콘텐츠는 뺀다) N명을 세 나라에 번갈아 태어나게 돌린다.
//   1) 예외 0건
//   2) 진로·단계별 발화: 세 나라 진로의 단계마다 "그 단계를 지난 생 수"와 "그 단계 태그 이벤트 발화 수"를 찍고, 지난 생은 있는데 발화 0인 곳을 실패로 센다
//   3) 문장 검사(test/check-text.js 와 같은 규칙): 조사 오류·소스 하드코딩 조사(세 파일)·금지 문구·각주 비율
//   4) 결정별 발화 수, 캐논 인물 등장 수, 이주(flee)·자경단·arena 전환 수
// 공용 파일은 건드리지 않는다. 등록은 W11 이 content/index.js 에서 한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareData } from '../src/engine/data.js';
import { createRegistry } from '../src/engine/content.js';
import { createSim } from '../src/engine/sim.js';
import { hasBatchim, lastJong } from '../src/engine/text.js';
import content from '../content/index.js';
import victoria from '../content/tracks/victoria.js';
import tara from '../content/tracks/tara.js';
import kazimierz from '../content/tracks/kazimierz.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = parseInt(process.argv[2] || '500', 10);
const SEED = process.argv[3] || 'w9d';
const NATIONS = ['victoria', 'tara', 'kazimierz'];
const PACKS = { victoria, tara, kazimierz };
const FILES = ['content/tracks/victoria.js', 'content/tracks/tara.js', 'content/tracks/kazimierz.js'];

function loadData() {
  const raw = {};
  const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const f of ['nations', 'races', 'jobs', 'causes', 'names', 'stats1950']) raw[f] = readJson(path.join(ROOT, 'data', f + '.json'));
  const terra = path.join(ROOT, 'data', 'terra_e0.json');
  if (fs.existsSync(terra)) raw.terra = readJson(terra);
  const tracksDir = path.join(ROOT, 'data', 'tracks');
  raw.tracks = fs.readdirSync(tracksDir).filter((f) => f.endsWith('.json')).sort().map((f) => readJson(path.join(tracksDir, f)));
  for (const f of ['affiliations', 'relations', 'marriage', 'housing', 'rhodes', 'canon_figures']) { const p = path.join(ROOT, 'data', f + '.json'); if (fs.existsSync(p)) raw[f] = readJson(p); }
  return { data: prepareData(raw), raw };
}

// ── 문장 검사(check-text.js 규칙 사본) ──
function vocabulary(data, raw) {
  const V = new Set();
  const add = (w) => { if (typeof w === 'string') { const s = w.trim(); if (s.length >= 2 && !/[A-Za-z]/.test(s)) V.add(s); } };
  for (const n of data.nations) {
    add(n.name); add(n.statOrg);
    const c = n.culture || {};
    for (const k of ['greet', 'address', 'elder', 'food', 'ruler', 'rulerTitle', 'drink']) { add(c[k]); if (c[k]) for (const part of String(c[k]).split(/와 |과 /)) add(part); }
    for (const f of c.festivals || []) add(f);
  }
  for (const r of data.races) add(r.name);
  for (const j of data.jobs) add(j.name);
  for (const c of data.causes) add(c.label);
  for (const t of data.tracks || []) { add(t.name); for (const st of t.stages || []) { add(st.name); add(st.title); } }
  for (const a of Object.values(data.affById || {})) add(a.name);
  const names = raw.names || {};
  for (const [, pool] of Object.entries(names)) { if (!pool || typeof pool !== 'object') continue; for (const key of ['m', 'f', 's']) for (const w of pool[key] || []) add(w); }
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
const forbiddenIn = (text) => FORBIDDEN.filter((f) => (typeof f === 'string' ? text.includes(f) : f.test(text))).map((f) => (typeof f === 'string' ? f : f.source));
function scanSource() {
  const re = /\+ '(은|는|이|가|을|를|와|과|로|으로|라고|이라고)[ .,)'!?]/;
  const re2 = /\}(은|는|이|가|을|를|와|과|로|으로)[ .,)'!?<]/;
  const hits = [];
  for (const f of FILES) fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').forEach((l, i) => { if (re.test(l) || re2.test(l)) hits.push(f + ':' + (i + 1)); });
  return hits;
}

function main() {
  const { data, raw } = loadData();
  if (data.warnings.length) console.log('경고:', data.warnings.join(' | '));
  const registry = content.install(createRegistry());
  // 세 나라 팩: 이벤트 run 을 감싸 발화 수를 센다
  const fired = {}, decFired = {};
  const myTexts = [];   // 내 팩이 낸 문장(금지 문구 검사 범위)
  const myEvents = new Map();
  for (const [nat, pack] of Object.entries(PACKS)) {
    // W11: 국가 팩은 content/index.js 가 등록한다(중복 등록 방지). 래핑은 같은 객체를 제자리에서 바꾼다
    for (const e of pack.events) { myEvents.set(e.id, { nat, tags: e.tags || [] }); const orig = e.run; e.run = (s) => { fired[e.id] = (fired[e.id] || 0) + 1; const r = orig(s); if (r) { if (typeof r === 'string') myTexts.push(r); else { if (r.t) myTexts.push(r.t); if (r.f) myTexts.push(r.f); } logStat.myEv++; if (typeof r === 'object' && r.f && /[0-9]/.test(r.t || '')) logStat.myEvF++; } return r; }; }
  }
  const nEv = Object.values(PACKS).reduce((a, p) => a + p.events.length, 0);
  const nDec = Object.values(PACKS).reduce((a, p) => a + Object.keys(p.decisions).length, 0);
  console.log('콘텐츠: 이벤트 ' + registry.events.length + ' / 결정 ' + Object.keys(registry.decisions).length + '  (W9d: 이벤트 ' + nEv + ' / 결정 ' + nDec + ' — ' + Object.entries(PACKS).map(([k, p]) => k + ' ' + p.events.length + '/' + Object.keys(p.decisions).length).join(', ') + ')');

  // 진로·단계 표
  const myTracks = (data.tracks || []).filter((t) => NATIONS.includes(t.nation));
  const stageVisits = {};   // 'ID:stage' → 지난 생 수
  const noteStage = (id, st) => { if (!st) return; stageVisits[id + ':' + st] = (stageVisits[id + ':' + st] || 0) + 1; };
  const vocab = vocabulary(data, raw);
  const check = buildChecker(vocab);
  if (!check('필라인는 흔치 않은 종족입니다. 빵를 먹었다.').length) throw new Error('자가 점검 실패');

  const texts = [];
  const logStat = { ev: 0, evF: 0, dec: 0, decF: 0, myEv: 0, myEvF: 0 };
  const push = (src, t) => { if (t && typeof t === 'string') texts.push({ src, t }); };
  const stats = { lives: 0, byNation: {}, flee: 0, militia: 0, arena: 0, canon: 0, canonMax: 0, dublinnToRed: 0, infectedTrack: 0, deaths: {}, tavern: 0, hillock: 0, nomad: 0, knightSurvivor: 0 };
  let errors = 0, lastEvId = null;
  const t0 = Date.now();

  for (let i = 0; i < N; i++) {
    const nation = NATIONS[i % NATIONS.length];
    const hooks = {
      log: (e) => { push('log:' + e.k, e.t); if (e.f) push('log-f:' + e.k, e.f); if (e.k !== 'dec') { logStat.ev++; if (e.f) logStat.evF++; } },
      decision: (pd) => { const v = pd.view; logStat.dec++; if (v.fact) logStat.decF++; decFired[pd.id] = (decFired[pd.id] || 0) + 1; if (Object.values(PACKS).some((p) => p.decisions[pd.id])) { myTexts.push(v.title, v.body); if (v.fact) myTexts.push(v.fact); for (const c of v.choices || []) { myTexts.push(c.label); if (c.sub) myTexts.push(c.sub); } }
        push('dec:' + pd.id, v.title); push('dec:' + pd.id, v.body); if (v.fact) push('dec-f:' + pd.id, v.fact);
        for (const c of v.choices || []) { push('dec-ch:' + pd.id, c.label); if (c.sub) push('dec-ch:' + pd.id, c.sub); } },
    };
    const sim = createSim({ data, seed: SEED + ':' + i, content: registry, auto: true, hooks });
    try {
      const S = sim.newLife(Math.floor(i / 3) % 3 === 0 ? { nation, by: 1080 + (Math.floor(i / 9) % 5) } : { nation });   // 1/3 은 1080~84년생: 1091~98 시대 한정 진로(더블린·자경단·탑의 기사)를 지나게
      sim.start();
      let guard = 0;
      const seen = new Set();
      while (S.phase === 'life') {
        if (S.track) { const t = data.trackById[S.track.id]; if (t) { const st = t.stages[Math.min(S.track.stage, t.stages.length - 1)]; const k = S.track.id + ':' + st.id; if (!seen.has(k)) { seen.add(k); noteStage(S.track.id, st.id); } } }
        sim.runYear();
        if (++guard > 500) throw new Error('500년 초과');
      }
      stats.lives++;
      stats.byNation[nation] = (stats.byNation[nation] || 0) + 1;
      if (S.flags.londiniumEscaped && S.cur !== 'victoria') stats.flee++;
      if (S.trackHist.some((h) => h.id === 'VIC_MILITIA') || (S.track && S.track.id === 'VIC_MILITIA')) stats.militia++;
      if (S.trackHist.some((h) => h.id === 'KAZ_INFECTED') || (S.track && S.track.id === 'KAZ_INFECTED')) stats.arena++;
      if (S.trackHist.some((h) => h.id === 'VIC_INFECTED') || (S.track && S.track.id === 'VIC_INFECTED')) stats.infectedTrack++;
      if (S.trackHist.some((h) => h.id === 'TAR_DUBLIN') && (S.trackHist.some((h) => h.id === 'TAR_REDIRON') || (S.track && S.track.id === 'TAR_REDIRON'))) stats.dublinnToRed++;
      if (S.flags.canonSeen) { stats.canon += S.flags.canonSeen; stats.canonMax = Math.max(stats.canonMax, S.flags.canonSeen); }
      if (S.flags.knTavern) stats.tavern++;
      if (S.sub && S.sub.region === 'hillock') stats.hillock++;
      if (S.eth === 'nomad') stats.nomad++;
      if (S.flags.knightSurvivor) stats.knightSurvivor++;
      stats.deaths[S.cause || '?'] = (stats.deaths[S.cause || '?'] || 0) + 1;
    } catch (e) { errors++; if (errors <= 5) console.error('[#' + i + ' ' + nation + '] ' + (e && e.stack || e)); }
  }
  console.log('N=' + N + ' seed=' + SEED + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + 's) 예외 ' + errors + '건' + (errors ? '' : ' ✓'));

  // 2) 진로·단계별 발화
  console.log('\n[진로·단계별 발화] (지난 생 수 / 그 단계 태그 이벤트 발화 수 / 그 진로 전체 태그 발화 수)');
  let gaps = 0, unvisited = 0;
  for (const t of myTracks) {
    const trackFired = [...myEvents.entries()].filter(([id, m]) => m.tags.includes('track:' + t.id)).reduce((a, [id]) => a + (fired[id] || 0), 0);
    const cells = t.stages.map((st) => {
      const k = t.id + ':' + st.id;
      const v = stageVisits[k] || 0;
      const f = [...myEvents.entries()].filter(([id, m]) => m.tags.includes('track:' + k)).reduce((a, [id]) => a + (fired[id] || 0), 0);
      const defined = [...myEvents.values()].filter((m) => m.tags.includes('track:' + k)).length;
      if (v >= 3 && f === 0) gaps++;   // 표본 1~2는 연말 승급 직후 사망·투옥일 수 있어 판정하지 않는다
      if (v === 0) unvisited++;
      return st.id + ' ' + v + '/' + f + (v >= 3 && f === 0 ? ' ✗' : v > 0 && f === 0 ? ' (표본 부족)' : '') + (defined === 0 ? ' (정의 0)' : '');
    });
    console.log('  ' + t.id.padEnd(13) + ' 진로태그 ' + String(trackFired).padStart(4) + ' │ ' + cells.join(' · '));
  }
  console.log('  지난 생 3 이상인데 발화 0인 단계: ' + gaps + (gaps ? ' ✗' : ' ✓') + ' · 이번 실행에서 아무도 지나지 않은 단계: ' + unvisited);
  const never = [...myEvents.keys()].filter((id) => !fired[id]);
  console.log('  이번 실행에서 한 번도 안 나온 이벤트 ' + never.length + '/' + myEvents.size + (never.length ? ': ' + never.join(' ') : ''));
  console.log('  발화 상위 30: ' + Object.entries(fired).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([id, n]) => id + ' ' + n).join(', '));
  console.log('  결정 발화: ' + Object.entries(decFired).filter(([id]) => Object.values(PACKS).some((p) => p.decisions[id])).map(([id, n]) => id + ' ' + n).join(', '));
  console.log('  흐름: 런디니움 국외 피난 ' + stats.flee + ' · 자경단 ' + stats.militia + ' · 카시미어 arena 전환 ' + stats.arena + ' · 빅토리아 감염자 노동 ' + stats.infectedTrack + ' · 더블린→적철 ' + stats.dublinnToRed + ' · 탑의 기사 생존 ' + stats.knightSurvivor + ' · 선술집 ' + stats.tavern + ' · 힐록 출신 ' + stats.hillock + ' · 유목민 ' + stats.nomad + ' · 캐논 등장 ' + stats.canon + '(생애 최대 ' + stats.canonMax + ')');

  // 3) 문장 검사
  const bad = [];
  for (const x of texts) for (const h of check(x.t)) bad.push({ ...h, src: x.src });
  const badKey = {};
  for (const b of bad) { const k = b.word + b.p + '→' + b.exp + ' @' + b.src; badKey[k] = (badKey[k] || 0) + 1; }
  console.log('\n[문장] ' + texts.length + '개 검사 · 조사 오류 ' + bad.length + '건' + (bad.length ? '' : ' ✓'));
  for (const [k, n] of Object.entries(badKey).sort((a, b) => b[1] - a[1]).slice(0, 30)) { const ex = bad.find((b) => b.word + b.p + '→' + b.exp + ' @' + b.src === k); console.log('  ' + n + '× ' + k + '  예: …' + ex.text.slice(Math.max(0, ex.at - 20), ex.at + ex.word.length + 12).replace(/\n/g, ' ') + '…'); }
  const src = scanSource();
  console.log('소스 하드코딩 조사(세 파일): ' + src.length + '곳' + (src.length ? '\n  ' + src.join('\n  ') : ' ✓'));
  const forb = [];
  for (const x of myTexts) for (const h of forbiddenIn(x)) forb.push({ h, src: 'w9d', t: x });
  // 세 파일 소스의 문자열 리터럴도 직접 훑는다(실행에서 안 나온 문장까지)
  const srcForb = [];
  for (const f of FILES) { const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n'); lines.forEach((l, i) => { if (l.trim().startsWith('//')) return; const strs = l.match(/'[^']*'/g) || []; for (const st of strs) { if (/^'!?(nation|track|aff|visit|rel|cap|archetype|papers|home|stigma|rhodes|marriage|trait|threat|policy):/.test(st) || /^'[A-Za-z0-9_:.-]*'$/.test(st)) continue; for (const h of forbiddenIn(st)) srcForb.push(f + ':' + (i + 1) + ' ' + h); } }); }
  console.log('금지 문구(D25): 실행(내 팩 문장 ' + myTexts.length + '개) ' + forb.length + '건, 소스 문자열 ' + srcForb.length + '건' + (forb.length || srcForb.length ? '' : ' ✓'));
  for (const x of forb.slice(0, 10)) console.log('  ' + x.h + ' @' + x.src + '  예: ' + x.t.slice(0, 80));
  for (const x of srcForb.slice(0, 20)) console.log('  ' + x);
  const evR = logStat.ev ? logStat.evF / logStat.ev : 0;
  console.log('각주 비율(D31): 이벤트 기록 전체 ' + (evR * 100).toFixed(1) + '% (' + logStat.evF + '/' + logStat.ev + ') · W9d 이벤트만 ' + (logStat.myEv ? (logStat.myEvF / logStat.myEv * 100).toFixed(1) : 0) + '% (' + logStat.myEvF + '/' + logStat.myEv + ', 목표 10~20%) · 결정 fact ' + (logStat.dec ? (logStat.decF / logStat.dec * 100).toFixed(1) : 0) + '%');
  const ok = !errors && !gaps && !bad.length && !src.length && !forb.length && !srcForb.length;
  console.log(ok ? '\n통과' : '\n실패');
  if (!ok) process.exitCode = 1;
}

main();
