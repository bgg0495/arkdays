// W4b 검증용 사본: test/sim.js 와 같되 성인기 팩(content/adult_*.js)을 추가 등록하고, 더미 성인 이벤트 6개는 뺀다.
// 사용: node test/sim-w4b.js [N=500] [seed=w4b]   (등록은 나중에 content/index.js 에서 한다 — 이 파일은 공용 파일을 건드리지 않는다)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareData } from '../src/engine/data.js';
import { lifeTable } from '../src/engine/lifetable.js';
import { createRegistry } from '../src/engine/content.js';
import { createSim } from '../src/engine/sim.js';
import content from '../content/index.js';
import adultWork from '../content/adult_work.js';
import adultFamily from '../content/adult_family.js';
import adultMoney from '../content/adult_money.js';
import adultInfected from '../content/adult_infected.js';
import adultNations from '../content/adult_nations.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = parseInt(process.argv[2] || '500', 10);
const SEED = process.argv[3] || 'w4b';
const TERRA = process.env.TERRA !== '0';
const FORCE_DUMMY = process.env.DATA === 'dummy';
const DUMMY_ADULT = new Set(['ori_rumor', 'forecaster_wrong', 'nomad_move', 'overwork', 'rhodes_poster', 'harvest_good']);
export const ADULT_PACKS = [adultWork, adultFamily, adultMoney, adultInfected, adultNations];

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
  const data = prepareData(raw);
  return { data, used };
}

/** W4a 조립 + 성인기 팩. 더미 성인 이벤트는 제외 */
export function buildRegistry() {
  const registry = createRegistry();
  for (const p of content.packs) registry.use({ ...p, events: (p.events || []).filter((e) => !DUMMY_ADULT.has(e.id)) });
  for (const p of ADULT_PACKS) registry.use(p);
  return registry;
}

function pad(s, n, right = false) { s = String(s); const w = [...s].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0); const sp = ' '.repeat(Math.max(0, n - w)); return right ? sp + s : s + sp; }
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const pct = (v) => (v * 100).toFixed(1) + '%';

function main() {
  const { data, used } = loadData();
  console.log('데이터:', Object.entries(used).map(([k, v]) => k + '←' + v).join(' '));
  if (data.warnings.length) console.log('경고:', data.warnings.join(' | '));
  const registry = buildRegistry();
  const adultEv = ADULT_PACKS.reduce((a, p) => a + p.events.length, 0);
  const adultDec = ADULT_PACKS.reduce((a, p) => a + Object.keys(p.decisions || {}).length, 0);
  console.log('콘텐츠: 이벤트 ' + registry.events.length + ' / 결정 ' + Object.keys(registry.decisions).length + ' / 대사건 ' + registry.big.length + '  (W4b 성인기: 이벤트 ' + adultEv + ' / 결정 ' + adultDec + ')');

  const rows = {};
  const causeAll = {};
  let errors = 0;
  let adultLogs = 0, adultLives = 0;
  const t0 = Date.now();
  const lifeMulByRace = Object.fromEntries(data.races.map((r) => [r.id, r.lifeMul]));

  for (let i = 0; i < N; i++) {
    const sim = createSim({ data, seed: SEED + ':' + i, content: registry, auto: true, terra: TERRA });
    try {
      const S = sim.newLife();
      sim.start();
      let guard = 0;
      while (S.phase === 'life') {
        sim.runYear();
        if (++guard > 500) throw new Error('500년 초과: ' + S.race + ' age ' + S.age);
      }
      const r = rows[S.born] || (rows[S.born] = { n: 0, nHuman: 0, ageSum: 0, ageSumHuman: 0, inf: 0, money: 0, causes: {}, decisions: 0, logs: 0 });
      r.n++; r.ageSum += S.deathAt.age;
      if (lifeMulByRace[S.race] === 1) { r.nHuman++; r.ageSumHuman += S.deathAt.age; }
      if (S.ori.on) r.inf++;
      r.money += S.money; r.decisions += S.stats.decisions; r.logs += S.log.length;
      r.causes[S.deathAt.label] = (r.causes[S.deathAt.label] || 0) + 1;
      causeAll[S.deathAt.label] = (causeAll[S.deathAt.label] || 0) + 1;
      if (S.deathAt.age >= 19) { adultLives++; adultLogs += S.log.filter((e) => e.a >= 19 && e.a <= 64).length; }
      for (const k of ['hl', 'h', 'sm', 'so']) if (!Number.isFinite(S.st[k])) throw new Error('NaN stat ' + k);
      if (!Number.isFinite(S.money)) throw new Error('NaN money');
      if (!Number.isFinite(S.pct)) throw new Error('NaN pct');
      if (S.ori.on && !Number.isFinite(S.ori.uL)) throw new Error('NaN uL');
    } catch (e) {
      errors++;
      if (errors <= 5) console.error('[#' + i + '] ' + (e && e.stack || e));
    }
  }
  const ms = Date.now() - t0;

  console.log('\n국가별 (N=' + N + ', seed=' + SEED + ', ' + ms + 'ms, 예외 ' + errors + '건)');
  console.log(pad('국가', 10) + pad('n', 6, true) + pad('시뮬e0', 8, true) + pad('평균수명', 9, true) + pad('Δ', 6, true) + pad('감염', 7, true) + pad('결정/생', 8, true) + pad('기록/생', 8, true) + pad('평균자산(LMD)', 14, true));
  const checks = [];
  for (const n of data.nations) {
    const r = rows[n.id];
    if (!r) continue;
    const e0Model = (lifeTable(n.stats, 'M').e0 * 0.512 + lifeTable(n.stats, 'F').e0 * 0.488);
    const e0 = n.terra ? (n.terra.M.e0 * 0.512 + n.terra.F.e0 * 0.488) : e0Model;
    const avgH = r.nHuman ? r.ageSumHuman / r.nHuman : NaN;
    const d = avgH - e0;
    checks.push({ id: n.id, n: r.n, nHuman: r.nHuman, d });
    console.log(pad(n.name, 10) + pad(r.n, 6, true) + pad(f1(e0), 8, true) + pad(f1(avgH), 9, true) + pad((d >= 0 ? '+' : '') + f1(d), 6, true) + pad(pct(r.inf / r.n), 7, true) + pad(f1(r.decisions / r.n), 8, true) + pad(f1(r.logs / r.n), 8, true) + pad(Math.round(r.money / r.n).toLocaleString(), 14, true));
  }
  console.log('\n사인 분포 (전체)');
  const total = Object.values(causeAll).reduce((a, b) => a + b, 0);
  for (const [label, c] of Object.entries(causeAll).sort((a, b) => b[1] - a[1])) console.log('  ' + pad(label, 16) + pad(c, 6, true) + pad(pct(c / total), 8, true));

  const MIN_N = 100;
  const bad = checks.filter((c) => c.nHuman >= MIN_N && Number.isFinite(c.d) && Math.abs(c.d) > 5);
  const allN = checks.reduce((s, c) => s + c.n, 0);
  const wAvg = checks.reduce((s, c) => s + (Number.isFinite(c.d) ? c.d * c.n : 0), 0) / allN;
  console.log('\n검증: 예외 ' + errors + '건 / 수명 ±5 이탈(n≥' + MIN_N + ') ' + (bad.length ? bad.map((c) => c.id + ' ' + f1(c.d)).join(', ') : '없음') + ' / 전체 가중 Δ ' + f1(wAvg) + ' / 19세 이상 생 ' + adultLives + '명, 성인기(19~64) 기록 평균 ' + f1(adultLives ? adultLogs / adultLives : 0) + '줄');
  if (errors) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
