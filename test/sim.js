// 자동 시뮬 테스트: node test/sim.js [N=1000] [seed=w2]
// HOOK no-op + 자동 결정(선택지 auto 가중 랜덤)으로 N명을 돌려 국가별 평균 수명·감염률·사인·평균 자산을 표로 출력한다.
// data/*.json 이 있으면 그것을, 없으면 data/_dummy/*.json 을 파일별로 대체 로드한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareData } from '../src/engine/data.js';
import { lifeTable } from '../src/engine/lifetable.js';
import { createRegistry } from '../src/engine/content.js';
import { createSim } from '../src/engine/sim.js';
import content from '../content/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = parseInt(process.argv[2] || '1000', 10);
const SEED = process.argv[3] || 'w2';
const TERRA = process.env.TERRA !== '0';     // TERRA=0 이면 광석병·재앙·분쟁을 끄고 생명표 보정만 확인
const FORCE_DUMMY = process.env.DATA === 'dummy';   // DATA=dummy 면 data/_dummy 만 쓴다(완료 기준 확인용)

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

function pad(s, n, right = false) { s = String(s); const w = [...s].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0); const sp = ' '.repeat(Math.max(0, n - w)); return right ? sp + s : s + sp; }
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const pct = (v) => (v * 100).toFixed(1) + '%';

function main() {
  const { data, used } = loadData();
  console.log('데이터:', Object.entries(used).map(([k, v]) => k + '←' + v).join(' '));
  if (data.warnings.length) console.log('경고:', data.warnings.join(' | '));
  const registry = content.install(createRegistry());
  console.log('콘텐츠: 이벤트 ' + registry.events.length + ' / 결정 ' + Object.keys(registry.decisions).length + ' / 대사건 ' + registry.big.length);

  const rows = {};           // nation → 집계
  const causeAll = {};
  const oriHow = {};
  const scen = { bornInf: 0, bornInfU5: 0, minerFam: 0, minerFamBornInf: 0, childLabor: 0, childLaborAgeSum: 0, campChild: 0 };
  const rowOf = (id) => rows[id] || (rows[id] = { n: 0, nHuman: 0, ageSum: 0, ageSumHuman: 0, inf: 0, known: 0, bornInf: 0, money: 0, causes: {}, outcomes: {}, u5: 0, decisions: 0, logs: 0, rhodes: 0, moved: 0, marF: 0, hmF: 0, marM: 0, hmM: 0, servF: 0, specialY: 0, adultY: 0 });
  let errors = 0;
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
      const r = rowOf(S.born);
      r.n++; r.ageSum += S.deathAt.age;
      if (lifeMulByRace[S.race] === 1) { r.nHuman++; r.ageSumHuman += S.deathAt.age; }
      if (S.flags.bornInfected) { scen.bornInf++; if (S.deathAt.age < 5) scen.bornInfU5++; }
      if (S.flags.minerFamily) { scen.minerFam++; if (S.flags.bornInfected) scen.minerFamBornInf++; }
      if (S.flags.childLabor != null) { scen.childLabor++; scen.childLaborAgeSum += S.flags.childLabor; }
      if (S.flags.oriOutcome === 'camp' && S.flags.oriKnownAt < 15) scen.campChild++;
      if (S.ori.on) { r.inf++; oriHow[S.stats.oriHow || '?'] = (oriHow[S.stats.oriHow || '?'] || 0) + 1; }
      if (S.ori.known) r.known++;
      if (S.flags.bornInfected) r.bornInf++;
      if (S.deathAt.age < 5) r.u5++;
      if (S.rhodes) r.rhodes++;
      if (S.mig) r.moved++;
      r.money += S.money;
      if (S.fam.marriedAt != null) { if (S.sex === 'F') { r.marF++; if (S.flags.homemakerAt != null) r.hmF++; } else { r.marM++; if (S.flags.homemakerAt != null) r.hmM++; } }
      if (S.sex === 'F' && S.served) r.servF++;
      for (const y of S.years) if (y.a >= 19 && y.a <= 64) { r.adultY++; const j = y.job && data.jobById[y.job]; if (j && j.special) r.specialY++; }
      r.decisions += S.stats.decisions; r.logs += S.log.length;
      r.causes[S.deathAt.label] = (r.causes[S.deathAt.label] || 0) + 1;
      causeAll[S.deathAt.label] = (causeAll[S.deathAt.label] || 0) + 1;
      if (S.flags.oriOutcome) r.outcomes[S.flags.oriOutcome] = (r.outcomes[S.flags.oriOutcome] || 0) + 1;
      // 상태 무결성
      for (const k of ['hl', 'h', 'sm', 'so']) if (!Number.isFinite(S.st[k])) throw new Error('NaN stat ' + k);
      if (!Number.isFinite(S.money)) throw new Error('NaN money');
    } catch (e) {
      errors++;
      if (errors <= 5) console.error('[#' + i + '] ' + (e && e.stack || e));
    }
  }
  const ms = Date.now() - t0;

  // ── 국가별 표 ──
  console.log('\n국가별 (N=' + N + ', seed=' + SEED + ', ' + ms + 'ms, 예외 ' + errors + '건)');
  console.log(pad('국가', 10) + pad('n', 6, true) + pad('모델e0', 8, true) + pad('시뮬e0', 8, true) + pad('평균수명', 9, true) + pad('Δ', 6, true) + pad('장수종족', 9, true) + pad('감염', 7, true) + pad('출생감염', 9, true) + pad('진단', 7, true) + pad('5세전', 7, true) + pad('로도스', 7, true) + pad('이주', 6, true) + pad('평균자산(LMD)', 14, true) + '  oriExp/policy');
  const checks = [];
  for (const n of data.nations) {
    const r = rows[n.id];
    if (!r) continue;
    const e0Model = (lifeTable(n.stats, 'M').e0 * 0.512 + lifeTable(n.stats, 'F').e0 * 0.488);
    const e0 = n.terra ? (n.terra.M.e0 * 0.512 + n.terra.F.e0 * 0.488) : e0Model;   // D19: 시뮬 기대수명 기준
    const avgH = r.nHuman ? r.ageSumHuman / r.nHuman : NaN;
    const longAvg = r.n - r.nHuman ? (r.ageSum - r.ageSumHuman) / (r.n - r.nHuman) : NaN;
    const d = avgH - e0;
    checks.push({ id: n.id, n: r.n, nHuman: r.nHuman, e0, avgH, d, inf: r.inf / r.n, oriExp: n.oriExp });
    console.log(pad(n.name, 10) + pad(r.n, 6, true) + pad(f1(e0Model), 8, true) + pad(f1(e0), 8, true) + pad(f1(avgH), 9, true) + pad((d >= 0 ? '+' : '') + f1(d), 6, true)
      + pad(Number.isFinite(longAvg) ? f1(longAvg) : '-', 9, true) + pad(pct(r.inf / r.n), 7, true) + pad(pct(r.bornInf / r.n), 9, true) + pad(pct(r.known / r.n), 7, true)
      + pad(pct(r.u5 / r.n), 7, true) + pad(pct(r.rhodes / r.n), 7, true) + pad(pct(r.moved / r.n), 6, true) + pad(Math.round(r.money / r.n).toLocaleString(), 14, true)
      + '  ' + n.oriExp + '/' + (typeof n.policy === 'string' ? n.policy : JSON.stringify(n.policy)));
  }

  // ── 가사 전담(D35)·여성 복무(D33)·국가 특수 직업(D26) ──
  console.log('\n가사 전담·여성 복무·특수 직업 (국가별)');
  let servFAll = 0;
  for (const n of data.nations) { const r = rows[n.id]; if (!r) continue; servFAll += r.servF;
    console.log('  ' + pad(n.name, 10) + '기혼여 ' + pad(r.marF, 4, true) + ' 가사 ' + pad(r.marF ? pct(r.hmF / r.marF) : '-', 7, true) + ' (목표 ' + pct(n.homemakerP ?? 0.5) + ')' + '  기혼남 ' + pad(r.marM, 4, true) + ' 가사 ' + pad(r.marM ? pct(r.hmM / r.marM) : '-', 6, true) + '  여성복무 ' + r.servF + '  특수직업(성인 연수) ' + pad(r.adultY ? pct(r.specialY / r.adultY) : '-', 6, true)); }
  console.log('  여성 복무 합계 ' + servFAll + '건');

  console.log('\n감염 경로: ' + Object.entries(oriHow).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '));

  console.log('장면 통계: 출생 감염아 ' + scen.bornInf + '명(그중 5세 전 사망 ' + pct(scen.bornInf ? scen.bornInfU5 / scen.bornInf : 0) + ') / 광산 가정 출생 ' + scen.minerFam + '명(그중 출생 감염 ' + pct(scen.minerFam ? scen.minerFamBornInf / scen.minerFam : 0) + ') / 아동 노동 ' + scen.childLabor + '명(평균 ' + f1(scen.childLabor ? scen.childLaborAgeSum / scen.childLabor : 0) + '세 시작) / 15세 전 수용소 ' + scen.campChild + '명');

  // ── 사인 분포 ──
  console.log('\n사인 분포 (전체)');
  const total = Object.values(causeAll).reduce((a, b) => a + b, 0);
  for (const [label, c] of Object.entries(causeAll).sort((a, b) => b[1] - a[1])) console.log('  ' + pad(label, 16) + pad(c, 6, true) + pad(pct(c / total), 8, true));
  console.log('\n국가별 상위 사인 / 진단 분기 결과');
  for (const n of data.nations) {
    const r = rows[n.id]; if (!r) continue;
    const top = Object.entries(r.causes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l, c]) => l + ' ' + pct(c / r.n)).join(', ');
    const oc = Object.entries(r.outcomes).sort((a, b) => b[1] - a[1]).map(([l, c]) => l + ' ' + c).join(', ');
    console.log('  ' + pad(n.name, 10) + top + (oc ? '  |  ' + oc : '') + '  | 결정/생 ' + f1(r.decisions / r.n) + ', 기록/생 ' + f1(r.logs / r.n));
  }

  // ── 완료 기준 ──
  const MIN_N = 100;  // 표본이 이보다 작은 국가는 수명 판정에서 제외(사망 나이 표준편차 약 25년 → n=100 이면 표준오차 2.5년)
  const bad = checks.filter((c) => c.nHuman >= MIN_N && Number.isFinite(c.d) && Math.abs(c.d) > 5);
  const grp = {};
  for (const c of checks) { const g = grp[c.oriExp] || (grp[c.oriExp] = { n: 0, inf: 0 }); g.n += c.n; g.inf += c.inf * c.n; }
  const gl = Object.keys(grp).map(Number).sort((a, b) => a - b).map((k) => ({ k, rate: grp[k].inf / grp[k].n }));
  let monotone = true;
  for (let i = 1; i < gl.length; i++) if (gl[i].rate < gl[i - 1].rate) monotone = false;
  const allN = checks.reduce((s, c) => s + c.n, 0);
  const wAvg = checks.reduce((s, c) => s + (Number.isFinite(c.d) ? c.d * c.n : 0), 0) / allN;
  console.log('\n검증(' + (data.nations.some((n) => n.terra) ? '시뮬 e0 기준' : '모델 e0 기준 — data/terra_e0.json 없음, node test/calibrate.js 로 생성') + '): 예외 ' + errors + '건 / 수명 ±5 이탈(n≥' + MIN_N + ') ' + (bad.length ? bad.map((c) => c.id + ' ' + f1(c.d)).join(', ') : '없음')
    + ' / 전체 가중 Δ ' + f1(wAvg) + ' / 감염률 oriExp 등급별 ' + gl.map((g) => g.k + ':' + pct(g.rate)).join(' < ') + ' → ' + (monotone ? 'OK' : '어긋남'));
  if (errors) process.exitCode = 1;                       // 완료 기준의 필수 조건은 예외 0건. 밸런스 이탈은 경고로만 알린다
  else if (bad.length || !monotone) console.log('(밸런스 경고: 완료 기준 ±5 / 등급 순서를 벗어난 항목이 있습니다. docs/설계_명세.md W2 메모 참조)');
}

main();
