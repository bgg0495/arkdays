// W4c 검증용 시뮬: node test/sim-w4c.js [N=500] [seed=w4c]
// test/sim.js 를 복사해 노년(elder.js)·대사건(bigevents.js)·사망 텍스트(death_texts.js)를 여기서만 추가 등록한다.
// content/index.js 는 건드리지 않는다. 더미 big(chernobog)·retire65 는 W4c 가 대체하므로 뺀다.
// 추가 출력: 대사건 발화 표(연도·국가 게이트 검증), 노년 이벤트·결정 발화 수, 사망 텍스트 커버리지, D25 금지 문구 검사.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareData } from '../src/engine/data.js';
import { lifeTable } from '../src/engine/lifetable.js';
import { createRegistry } from '../src/engine/content.js';
import { createSim } from '../src/engine/sim.js';
import childhood from '../content/childhood.js';
import school from '../content/school.js';
import dummy from '../content/dummy.js';
import elder from '../content/elder.js';
import bigevents from '../content/bigevents.js';
import { deathTexts, CAUSE_TEXT, EXTRA_CAUSES, RITES } from '../content/death_texts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = parseInt(process.argv[2] || '500', 10);
const SEED = process.argv[3] || 'w4c';
const TERRA = process.env.TERRA !== '0';
const FORCE_DUMMY = process.env.DATA === 'dummy';

const BANNED = ['추정', '임시', '창작', '신뢰구간', '1950', '시뮬레이션', '지어냄', '지어낸', '테라가 아니었다면', '민감도', '환율은', 'D9', 'D25', '현실'];

export function loadData(root = ROOT) {
  const raw = {};
  const used = {};
  for (const f of ['nations', 'races', 'jobs', 'causes', 'names', 'stats1950']) {
    const real = path.join(root, 'data', f + '.json');
    const dum = path.join(root, 'data', '_dummy', f + '.json');
    const file = !FORCE_DUMMY && fs.existsSync(real) ? real : dum;
    raw[f] = JSON.parse(fs.readFileSync(file, 'utf8'));
    used[f] = file === real ? 'data' : '_dummy';
  }
  const terraFile = path.join(root, 'data', 'terra_e0.json');
  if (!FORCE_DUMMY && fs.existsSync(terraFile)) { raw.terra = JSON.parse(fs.readFileSync(terraFile, 'utf8')); used.terra = 'data'; }
  return { data: prepareData(raw), used };
}

function pad(s, n, right = false) { s = String(s); const w = [...s].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0); const sp = ' '.repeat(Math.max(0, n - w)); return right ? sp + s : s + sp; }
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const pct = (v) => (v * 100).toFixed(1) + '%';

function buildRegistry() {
  const KEEP_DUMMY_EVENTS = new Set(['ori_rumor', 'forecaster_wrong', 'nomad_move', 'overwork', 'rhodes_poster', 'harvest_good']);
  const dummyPart = { events: dummy.events.filter((e) => KEEP_DUMMY_EVENTS.has(e.id)).map((e) => ({ ...e, a: [Math.max(19, e.a[0]), e.a[1]] })) };
  const r = createRegistry();
  for (const p of [childhood, school, dummyPart, elder, bigevents]) r.use(p);
  return r;
}

function main() {
  const { data, used } = loadData();
  console.log('데이터:', Object.entries(used).map(([k, v]) => k + '←' + v).join(' '));
  if (data.warnings.length) console.log('경고:', data.warnings.join(' | '));
  const registry = buildRegistry();
  console.log('콘텐츠: 이벤트 ' + registry.events.length + ' / 결정 ' + Object.keys(registry.decisions).length + ' / 대사건 ' + registry.big.length
    + '  (W4c: 노년 이벤트 ' + elder.events.length + ' · 노년 결정 ' + Object.keys(elder.decisions).length + ' · 대사건 ' + bigevents.big.length + ' [캐논 ' + bigevents.big.filter((b) => b.canon !== false).length + ' / 연장 ' + bigevents.big.filter((b) => b.canon === false).length + '] · 대사건 결정 ' + Object.keys(bigevents.decisions).length + ')');

  const rows = {};
  const causeAll = {};
  const rowOf = (id) => rows[id] || (rows[id] = { n: 0, nHuman: 0, ageSum: 0, ageSumHuman: 0, inf: 0, money: 0, u5: 0, decisions: 0, logs: 0 });
  const bigFired = {};        // id → { n, years:Set, nations:Set, badYear, badNation }
  const elderEv = {};         // 노년 이벤트 id → 발화 수
  const elderDec = {};        // 노년/대사건 결정 id → 발화 수
  const elderLogs = [];       // 60세+ 기록 줄(금지 문구 검사·샘플)
  const deathCover = {};      // 사인 id → 사망 텍스트 있음/없음
  let elders = 0, errors = 0, bannedHits = [], noFoot = 0, elderLines = 0;
  const myEv = new Set([...elder.events.map((e) => e.id), ...bigevents.events.map((e) => e.id)]);
  const myDec = new Set([...Object.keys(elder.decisions), ...Object.keys(bigevents.decisions)]);
  const bigById = Object.fromEntries(bigevents.big.map((b) => [b.id, b]));
  const noFootMine = {};
  for (const e of [...elder.events, ...bigevents.events, ...bigevents.big]) { const orig = e.run; e.run = (s) => { const r = orig(s); if (r && (typeof r === 'string' || !r.f)) noFootMine[e.id] = (noFootMine[e.id] || 0) + 1; return r; }; }
  for (const [id, d] of Object.entries({ ...elder.decisions, ...bigevents.decisions })) { const orig = d.apply; d.apply = (s, k, p, t) => { const r = orig(s, k, p, t); if (r && (typeof r === 'string' || !r.f)) noFootMine[id + ':' + k] = (noFootMine[id + ':' + k] || 0) + 1; return r; }; }
  const t0 = Date.now();
  const lifeMulByRace = Object.fromEntries(data.races.map((r) => [r.id, r.lifeMul]));
  let sampleShown = 0;

  for (let i = 0; i < N; i++) {
    const sim = createSim({ data, seed: SEED + ':' + i, content: registry, auto: true, terra: TERRA });
    try {
      const S = sim.newLife();
      sim.start();
      let guard = 0;
      while (S.phase === 'life') { sim.runYear(); if (++guard > 500) throw new Error('500년 초과: ' + S.race + ' age ' + S.age); }
      const r = rowOf(S.born);
      r.n++; r.ageSum += S.deathAt.age;
      if (lifeMulByRace[S.race] === 1) { r.nHuman++; r.ageSumHuman += S.deathAt.age; }
      if (S.ori.on) r.inf++;
      if (S.deathAt.age < 5) r.u5++;
      r.money += S.money; r.decisions += S.stats.decisions; r.logs += S.log.length;
      causeAll[S.deathAt.label] = (causeAll[S.deathAt.label] || 0) + 1;
      for (const k of ['hl', 'h', 'sm', 'so']) if (!Number.isFinite(S.st[k])) throw new Error('NaN stat ' + k);
      if (!Number.isFinite(S.money)) throw new Error('NaN money');

      // ── 대사건 게이트 검증 ──
      for (const [k, age] of Object.entries(S.flags)) {
        if (!k.startsWith('big_')) continue;
        const id = k.slice(4); const b = bigById[id]; if (!b) continue;
        const year = S.by + age;
        const snap = (age > 0 ? S.years[age - 1] : S.years[age]) || { cur: S.born };   // 그해 시작 시점의 거주국(사건 안에서 migrate 하면 연말 스냅샷은 다르다)
        const curAt = snap.cur; const rootAt = data.nationById[curAt] && data.nationById[curAt].parent ? data.nationById[curAt].parent : curAt;
        const e = bigFired[id] || (bigFired[id] = { n: 0, years: new Set(), nations: new Set(), badYear: 0, badNation: 0 });
        e.n++; e.years.add(year); e.nations.add(curAt);
        if (year !== b.year) e.badYear++;
        if (b.nation && b.nation !== curAt && b.nation !== rootAt) e.badNation++;
        if (id.endsWith('_heard') && !b.homeOk) { const live = bigById[id.replace('_heard', '_live')]; if (live && live.nation && (live.nation === curAt || live.nation === rootAt) && !S.mig) e.badNation++; }
      }
      // ── 노년 이벤트·결정 ──
      for (const [k, v] of Object.entries(S.flags)) if (k.startsWith('ev_') && myEv.has(k.slice(3))) elderEv[k.slice(3)] = (elderEv[k.slice(3)] || 0) + 1;
      for (const [k, v] of Object.entries(S.done)) if (myDec.has(k)) elderDec[k] = (elderDec[k] || 0) + v;
      const lm = lifeMulByRace[S.race];
      const elderAge = 15 + 45 * lm;   // 인간 척도 60세
      if (S.deathAt.age >= elderAge) {
        elders++;
        for (const l of S.log) if (l.a >= elderAge && l.k !== 'dec' && l.k !== 'death') { elderLines++; elderLogs.push(l); if (!l.f && l.k !== 'warm' && l.k !== 'loss') noFoot++; }
      }
      for (const l of S.log) for (const w of BANNED) if ((l.t && l.t.includes(w)) || (l.f && l.f.includes(w))) bannedHits.push(w + ' ← ' + (l.t || '') + ' ' + (l.f || ''));
      // ── 사망 텍스트 ──
      const dt = deathTexts(sim);
      deathCover[S.deathAt.cause] = !!(CAUSE_TEXT[S.deathAt.cause] || EXTRA_CAUSES[S.deathAt.cause]);
      if (!dt.line || !dt.f || !dt.rite || !dt.riteF) throw new Error('deathTexts 빈 값: ' + S.deathAt.cause);
      if (sampleShown < 4 && S.deathAt.age >= elderAge) { sampleShown++; console.log('\n[샘플 ' + sampleShown + '] ' + data.nationById[S.born].name + ' ' + S.race + ' ' + S.sex + ' ' + S.by + '년생 → ' + S.deathAt.age + '세 ' + S.deathAt.label);
        console.log('  ' + dt.line + ' ' + dt.f); console.log('  ' + dt.rite + ' ' + dt.riteF);
        for (const l of S.log.filter((l) => l.a >= elderAge).slice(0, 10)) console.log('  ' + l.a + '세 ' + l.t + (l.f ? ' ' + l.f : '')); }
    } catch (e) {
      errors++;
      if (errors <= 5) console.error('[#' + i + '] ' + (e && e.stack || e));
    }
  }
  const ms = Date.now() - t0;

  console.log('\n국가별 (N=' + N + ', seed=' + SEED + ', ' + ms + 'ms, 예외 ' + errors + '건)');
  console.log(pad('국가', 10) + pad('n', 6, true) + pad('시뮬e0', 8, true) + pad('평균수명', 9, true) + pad('Δ', 6, true) + pad('감염', 7, true) + pad('5세전', 7, true) + pad('결정/생', 8, true) + pad('기록/생', 8, true));
  const checks = [];
  for (const n of data.nations) {
    const r = rows[n.id]; if (!r) continue;
    const e0Model = (lifeTable(n.stats, 'M').e0 * 0.512 + lifeTable(n.stats, 'F').e0 * 0.488);
    const e0 = n.terra ? (n.terra.M.e0 * 0.512 + n.terra.F.e0 * 0.488) : e0Model;
    const avgH = r.nHuman ? r.ageSumHuman / r.nHuman : NaN;
    const d = avgH - e0;
    checks.push({ id: n.id, n: r.n, nHuman: r.nHuman, d });
    console.log(pad(n.name, 10) + pad(r.n, 6, true) + pad(f1(e0), 8, true) + pad(f1(avgH), 9, true) + pad((d >= 0 ? '+' : '') + f1(d), 6, true) + pad(pct(r.inf / r.n), 7, true) + pad(pct(r.u5 / r.n), 7, true) + pad(f1(r.decisions / r.n), 8, true) + pad(f1(r.logs / r.n), 8, true));
  }

  console.log('\n사인 분포 (전체, 사망 텍스트 커버리지)');
  const total = Object.values(causeAll).reduce((a, b) => a + b, 0);
  for (const [label, c] of Object.entries(causeAll).sort((a, b) => b[1] - a[1])) console.log('  ' + pad(label, 20) + pad(c, 6, true) + pad(pct(c / total), 8, true));
  const uncovered = Object.entries(deathCover).filter(([, ok]) => !ok).map(([id]) => id);
  const allCauseIds = data.causes.map((c) => c.id);
  const missingTemplate = allCauseIds.filter((id) => !CAUSE_TEXT[id]);
  console.log('사망 텍스트: causes.json ' + allCauseIds.length + '종 중 템플릿 누락 ' + (missingTemplate.length ? missingTemplate.join(',') : '0') + ' / 시뮬에서 나온 사인 중 템플릿 없음 ' + (uncovered.length ? uncovered.join(',') : '0') + ' / 장례 관습 ' + Object.keys(RITES).length + '종');

  console.log('\n대사건 발화 표 (id · 발화 수 · 연도 · 국가 · 게이트 위반)');
  let bigBad = 0;
  for (const b of bigevents.big) {
    const e = bigFired[b.id];
    if (!e) { console.log('  ' + pad(b.id, 28) + '0회'); continue; }
    bigBad += e.badYear + e.badNation;
    console.log('  ' + pad(b.id, 28) + pad(e.n, 5, true) + '회  ' + [...e.years].join(',') + '  ' + [...e.nations].sort().join(',') + (e.badYear || e.badNation ? '  ✗ 연도 ' + e.badYear + ' 국가 ' + e.badNation : ''));
  }
  const neverBig = bigevents.big.filter((b) => !bigFired[b.id]).map((b) => b.id);

  console.log('\n노년 이벤트 발화 (60세+ 도달 ' + elders + '명, 노년 기록 ' + elderLines + '줄, 생당 ' + f1(elders ? elderLines / elders : 0) + '줄)');
  const neverEv = [];
  for (const e of [...elder.events, ...bigevents.events]) { const c = elderEv[e.id] || 0; if (!c) neverEv.push(e.id); }
  console.log('  ' + Object.entries(elderEv).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '));
  console.log('  0회: ' + (neverEv.length ? neverEv.join(', ') : '없음'));
  console.log('노년·대사건 결정 발화');
  const neverDec = [...myDec].filter((k) => !elderDec[k]);
  console.log('  ' + Object.entries(elderDec).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '));
  console.log('  0회: ' + (neverDec.length ? neverDec.join(', ') : '없음'));

  const nf = Object.entries(noFootMine);
  console.log('\n검증: 예외 ' + errors + '건 / 대사건 게이트 위반 ' + bigBad + '건 / 금지 문구 ' + bannedHits.length + '건 / W4c 이벤트·결정 결과에 각주 없음 ' + nf.length + '종' + (nf.length ? ' (' + nf.map(([k, v]) => k + ' ' + v).join(', ') + ')' : '') + ' / 60세+ 전체 기록 중 각주 없음(타 모듈·엔진 줄 포함) ' + noFoot + '줄');
  if (bannedHits.length) for (const h of [...new Set(bannedHits)].slice(0, 20)) console.log('  ✗ ' + h);
  if (errors || bigBad) process.exitCode = 1;
}

main();
