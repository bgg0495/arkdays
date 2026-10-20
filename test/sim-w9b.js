// W9b 검증 시뮬: node test/sim-w9b.js [N=500] [seed=w2]  — test/sim.js 사본 + content/tracks/{ursus,higashi}.js 등록 + 발화 분포.
//   NATION=ursus,higashi 로 출생 국가를 그 국가들로 고정하면 두 팩의 자연 발화 분포가 더 촘촘히 나온다.
//   끝에 [w9b] 블록: 팩별 이벤트 발화 수, 진로·단계별 (체류 연수 / 발화 수 / 0 발화 단계), 결정 발화 수, 강제 진입 커버리지(모든 진로·단계를 억지로 밟아 이벤트가 하나라도 붙는지).
// 원본 주석:
// HOOK no-op + 자동 결정(선택지 auto 가중 랜덤)으로 N명을 돌려 국가별 평균 수명·감염률·사인·평균 자산을 표로 출력한다.
// data/*.json 이 있으면 그것을, 없으면 data/_dummy/*.json 을 파일별로 대체 로드한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareData } from '../src/engine/data.js';
import { lifeTable } from '../src/engine/lifetable.js';
import { createRegistry } from '../src/engine/content.js';
import { createSim } from '../src/engine/sim.js';
import { incomeAt } from '../src/engine/finance.js';
import { hasBatchim, lastJong } from '../src/engine/text.js';
import content from '../content/index.js';
import dummyTracks from '../content/_dummy_tracks.js';
import ursusPack from '../content/tracks/ursus.js';
import higashiPack from '../content/tracks/higashi.js';

const W9B = { ursus: ursusPack, higashi: higashiPack };
const NATIONS = process.env.NATION ? process.env.NATION.split(',') : null;   // 출생 국가 고정(순환)
const fires = {};            // 이벤트 id → 발화 수
const decFires = {};         // 결정 id → 발화 수
const stageYears = {};       // 'TRACK:stage' → 체류 연수
for (const pack of Object.values(W9B)) for (const e of pack.events) { const run = e.run; e.run = (ctx) => { fires[e.id] = (fires[e.id] || 0) + 1; return run(ctx); }; }
const stageTagOf = (e) => (e.tags || []).find((t) => /^track:[A-Z_]+:[a-z_]+$/.test(t));


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = parseInt(process.argv[2] || '500', 10);
const SEED = process.argv[3] || 'w2';
const TERRA = process.env.TERRA !== '0';     // TERRA=0 이면 광석병·재앙·분쟁을 끄고 생명표 보정만 확인
const FORCE_DUMMY = process.env.DATA === 'dummy';   // DATA=dummy 면 data/_dummy 만 쓴다(완료 기준 확인용)

export function loadData(root = ROOT) {
  const raw = {};
  const used = {};
  const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const f of ['nations', 'races', 'jobs', 'causes', 'names', 'stats1950']) {
    const real = path.join(root, 'data', f + '.json');
    const dum = path.join(root, 'data', '_dummy', f + '.json');
    const file = !FORCE_DUMMY && fs.existsSync(real) ? real : dum;
    raw[f] = readJson(file);
    used[f] = file === real ? 'data' : '_dummy';
  }
  const terraFile = path.join(root, 'data', 'terra_e0.json');
  if (!FORCE_DUMMY && fs.existsSync(terraFile)) { raw.terra = readJson(terraFile); used.terra = 'data'; }
  // v1: data/tracks/*.json(폴더 glob) → 없으면 data/_dummy/tracks.json. 나머지는 파일별로 data/ 우선
  const tracksDir = path.join(root, 'data', 'tracks');
  const trackFiles = !FORCE_DUMMY && fs.existsSync(tracksDir) ? fs.readdirSync(tracksDir).filter((f) => f.endsWith('.json')).sort() : [];
  if (trackFiles.length) { raw.tracks = trackFiles.map((f) => readJson(path.join(tracksDir, f))); used.tracks = 'data/tracks(' + trackFiles.length + ')'; }
  else { const dum = path.join(root, 'data', '_dummy', 'tracks.json'); if (fs.existsSync(dum)) { raw.tracks = readJson(dum); used.tracks = '_dummy'; } }
  for (const f of ['affiliations', 'relations', 'marriage', 'housing', 'rhodes', 'canon_figures']) {
    const real = path.join(root, 'data', f + '.json');
    const dum = path.join(root, 'data', '_dummy', f + '.json');
    const file = !FORCE_DUMMY && fs.existsSync(real) ? real : (fs.existsSync(dum) ? dum : null);
    if (!file) { if (f !== 'canon_figures') used[f] = '없음'; continue; }
    raw[f] = readJson(file);
    used[f] = file === real ? 'data' : '_dummy';
  }
  const data = prepareData(raw);
  return { data, used, real: { tracks: used.tracks && used.tracks.startsWith('data') } };
}

function medOf(data, nid) { const st = data.nationById[nid].stats; return incomeAt(st.ppp, st.gini, 0.5) * 10; }
function pad(s, n, right = false) { s = String(s); const w = [...s].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0); const sp = ' '.repeat(Math.max(0, n - w)); return right ? sp + s : s + sp; }
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const pct = (v) => (v * 100).toFixed(1) + '%';

function main() {
  const { data, used, real } = loadData();
  console.log('데이터:', Object.entries(used).map(([k, v]) => k + '←' + v).join(' '));
  if (data.warnings.length) console.log('경고:', data.warnings.join(' | '));
  const registry = content.install(createRegistry());
  if (process.env.NO_DUMMY_TRACKS !== '1') registry.use(dummyTracks);   // W7 더미 진로 콘텐츠(태그·ctx API 점검용)
  // W11: 국가 팩은 content/index.js 가 등록한다(중복 등록 방지)
  console.log('콘텐츠: 이벤트 ' + registry.events.length + ' / 결정 ' + Object.keys(registry.decisions).length + ' / 대사건 ' + registry.big.length);

  const rows = {};           // nation → 집계
  const causeAll = {};
  const oriHow = {};
  const scen = { bornInf: 0, bornInfU5: 0, minerFam: 0, minerFamBornInf: 0, childLabor: 0, childLaborAgeSum: 0, campChild: 0 };
  const rowOf = (id) => rows[id] || (rows[id] = { n: 0, nHuman: 0, ageSum: 0, ageSumHuman: 0, inf: 0, known: 0, bornInf: 0, money: 0, causes: {}, outcomes: {}, u5: 0, decisions: 0, logs: 0, rhodes: 0, moved: 0, marF: 0, hmF: 0, marM: 0, hmM: 0, servF: 0, specialY: 0, adultY: 0 });
  const v1 = { lives: 0, infected: 0, rhodes: 0, rhodesInf: 0, via: {}, rstatus: {}, migrated: 0, migReason: {}, marriage: {}, married: 0, trackByNation: {}, entryByClass: {}, everTrack: 0, how: {}, falls: {}, relIncome: {}, housing: {}, promos: 0, disgrace: 0, stigma: {} };
  let errors = 0;
  const t0 = Date.now();
  const lifeMulByRace = Object.fromEntries(data.races.map((r) => [r.id, r.lifeMul]));

  for (let i = 0; i < N; i++) {
    const sim = createSim({ data, seed: SEED + ':' + i, content: registry, auto: true, terra: TERRA, hooks: { log() {}, change() {}, decision(pd) { decFires[pd.id] = (decFires[pd.id] || 0) + 1; }, death() {}, year() {} } });
    try {
      const S = sim.newLife(NATIONS ? { nation: NATIONS[i % NATIONS.length] } : {});
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
      r.decisions += S.stats.decisions; r.logs += S.log.length;
      r.causes[S.deathAt.label] = (r.causes[S.deathAt.label] || 0) + 1;
      causeAll[S.deathAt.label] = (causeAll[S.deathAt.label] || 0) + 1;
      if (S.flags.oriOutcome) r.outcomes[S.flags.oriOutcome] = (r.outcomes[S.flags.oriOutcome] || 0) + 1;
      // 상태 무결성
      for (const k of ['hl', 'h']) if (!Number.isFinite(S.st[k])) throw new Error('NaN stat ' + k);
      for (const k of ['skill', 'learn', 'arts', 'ties']) if (!Number.isFinite(S.cap[k])) throw new Error('NaN cap ' + k);
      for (const k of ['looks', 'luck']) if (!Number.isFinite(S.innate[k])) throw new Error('NaN innate ' + k);
      if (S.track && (!data.trackById[S.track.id] || !Number.isFinite(S.track.standing))) throw new Error('track 상태 깨짐 ' + JSON.stringify(S.track));
      if (S.rhodes === true) throw new Error('S.rhodes 가 정규화되지 않음');
      if (!S.res || !data.nationById[S.res.nation]) throw new Error('res 깨짐 ' + JSON.stringify(S.res));
      if (!Number.isFinite(S.money)) throw new Error('NaN money');
      // v1 집계
      v1.lives++;
      const tr = rowOf(S.born);
      if (S.ori.on) v1.infected++;
      if (S.rhodes) { v1.rhodes++; if (S.ori.on) v1.rhodesInf++; v1.via[S.rhodes.via] = (v1.via[S.rhodes.via] || 0) + 1; v1.rstatus[S.rhodes.status] = (v1.rstatus[S.rhodes.status] || 0) + 1; }
      const mh = S.flags.migHist || [];
      if (mh.some((m) => m.reason !== 'rhodes')) v1.migrated++;
      for (const m of mh) v1.migReason[m.reason] = (v1.migReason[m.reason] || 0) + 1;
      if (S.fam.marriage) v1.marriage[S.cur + ':' + S.fam.marriage.type] = (v1.marriage[S.cur + ':' + S.fam.marriage.type] || 0) + 1;
      if (S.fam.marriedAt != null) v1.married++;
      for (const h of S.trackHist.concat(S.track ? [{ id: S.track.id, how: 'alive' }] : [])) { const t = data.trackById[h.id]; if (!t) continue; const key = t.nation + ':' + t.id; (v1.trackByNation[t.nation] || (v1.trackByNation[t.nation] = {}))[t.id] = (v1.trackByNation[t.nation][t.id] || 0) + 1; if (h.how === 'promo') v1.promos++; }
      const firstTrack = S.trackHist.find((h) => h.how !== 'promo' && h.how !== 'demote') || (S.track ? { id: S.track.id } : null);
      if (firstTrack && data.trackById[firstTrack.id]) { const t = data.trackById[firstTrack.id]; const q = 'q' + S.q; const nb = v1.entryByClass[t.nation] || (v1.entryByClass[t.nation] = {}); const qb = nb[q] || (nb[q] = {}); qb[t.id] = (qb[t.id] || 0) + 1; if (t.special) tr.specialY++; }
      if (S.trackHist.length || S.track) v1.everTrack++;
      for (const h of S.trackHist) v1.how[h.how] = (v1.how[h.how] || 0) + 1;
      if (S.flags.lastFall) v1.falls[S.flags.lastFall] = (v1.falls[S.flags.lastFall] || 0) + 1;
      for (const h of S.trackHist.concat(S.track ? [{ id: S.track.id, stage: data.trackById[S.track.id].stages[Math.min(S.track.stage, data.trackById[S.track.id].stages.length - 1)].id, from: S.track.stageSince, to: S.age }] : [])) { if (!/^(URS|HIG)_/.test(h.id)) continue; const k = h.id + ':' + h.stage; stageYears[k] = (stageYears[k] || 0) + Math.max(1, (h.to ?? S.age) - (h.from ?? 0)); }
      const rg = v1.relIncome[S.rel] || (v1.relIncome[S.rel] = { n: 0, inc: 0 });
      if (S.stats.maxIncome > 0) { rg.n++; rg.inc += S.stats.maxIncome / medOf(data, S.born); }
      if (S.home.housing) v1.housing[S.home.housing] = (v1.housing[S.home.housing] || 0) + 1;
      for (const y of S.years) if (y.a >= 19 && y.a <= 64) { tr.adultY++; }
      if (S.flags.disgraceAt != null) v1.disgrace++;
      if (S.status.stigma) v1.stigma[S.status.stigma] = (v1.stigma[S.status.stigma] || 0) + 1;
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

  // ── v1 집계(§13): 진로 분포 / 로도스 / 이주 / 결혼 유형 / 관계 등급 소득 ──
  console.log('\n[v1] 진로 (국가별 진입 분포 · 계층별 유입 vs 카탈로그 classes 가중' + (real.tracks ? ', 실데이터' : ', 더미') + ')');
  for (const n of data.nations) {
    const byT = v1.trackByNation[n.id]; if (!byT) continue;
    const tot = Object.values(byT).reduce((a, b) => a + b, 0);
    console.log('  ' + pad(n.name, 10) + Object.entries(byT).sort((a, b) => b[1] - a[1]).map(([id, c]) => id + ' ' + pct(c / tot)).join(', '));
    if (n.tracksSynthetic) continue;
    const ebc = v1.entryByClass[n.id] || {};
    const offs = [];
    for (const q of ['q1', 'q2', 'q3', 'q4', 'q5']) {
      const got = ebc[q] || {}; const gt = Object.values(got).reduce((a, b) => a + b, 0); if (gt < 20) continue;
      const exp = {}; let et = 0;
      for (const t of data.tracksByNation[n.id]) { if (t.forced || t.synthetic) continue; const w = (t.entry.classes || {})[q] || 0; if (w > 0) { exp[t.id] = w; et += w; } }
      for (const [id, w] of Object.entries(exp)) { const d = (got[id] || 0) / gt - w / et; if (Math.abs(d) > 0.1) offs.push(q + ' ' + id + ' ' + (d > 0 ? '+' : '') + (d * 100).toFixed(0) + 'p'); }
    }
    if (offs.length) console.log('    ±10%p 이탈: ' + offs.join(', '));
  }
  const fmtObj = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', ');
  console.log('[v1] 진로 이탈 사유: ' + fmtObj(v1.how) + ' | 몰락 cause: ' + fmtObj(v1.falls) + ' | 승급 ' + v1.promos + '회 | 불명예 ' + v1.disgrace + ' | 낙인 ' + fmtObj(v1.stigma));
  console.log('[v1] 로도스 합류율 전체 ' + pct(v1.rhodes / v1.lives) + ' (목표 1~3%) / 감염자 중 ' + pct(v1.infected ? v1.rhodesInf / v1.infected : 0) + ' (목표 8~15%) | via: ' + fmtObj(v1.via) + ' | 신분: ' + fmtObj(v1.rstatus));
  console.log('[v1] 이주 경험률 ' + pct(v1.migrated / v1.lives) + ' (목표 10~20%) | 사유: ' + fmtObj(v1.migReason));
  console.log('[v1] 결혼 유형(거주국:유형): ' + fmtObj(v1.marriage) + ' | 기혼 ' + pct(v1.married / v1.lives));
  console.log('[v1] 관계 등급별 최고소득(중위 배율 평균): ' + Object.entries(v1.relIncome).map(([g, r]) => g + ' ' + (r.n ? f1(r.inc / r.n) : '-') + '×(n=' + r.n + ')').join(', '));
  console.log('[v1] 주거: ' + fmtObj(v1.housing));
  console.log('[v1] 생애 중 진로 경험 ' + pct(v1.everTrack / v1.lives));

  // ── [w9b] 팩 발화 분포 ──
  w9bReport(data, registry);

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

function w9bReport(data, registry) {
  const pad2 = (x, n) => pad(x, n, true);
  for (const [nid, pack] of Object.entries(W9B)) {
    const n = data.nationById[nid];
    const total = pack.events.reduce((a, e) => a + (fires[e.id] || 0), 0);
    const silent = pack.events.filter((e) => !fires[e.id]);
    console.log('\n[w9b] ' + n.name + ': 이벤트 ' + pack.events.length + '개 / 결정 ' + Object.keys(pack.decisions).length + '개 · 발화 ' + total + '회 · 한 번도 안 뜬 이벤트 ' + silent.length + '개' + (silent.length ? ': ' + silent.map((e) => e.id).join(' ') : ''));
    const byStage = {};
    for (const e of pack.events) { const tg = stageTagOf(e); if (!tg) continue; const k = tg.slice(6); byStage[k] = (byStage[k] || 0) + (fires[e.id] || 0); }
    const rows = [];
    for (const t of data.tracksByNation[nid] || []) for (const st of t.stages) { const k = t.id + ':' + st.id; rows.push({ k, years: stageYears[k] || 0, fires: byStage[k] || 0, has: pack.events.some((e) => stageTagOf(e) === 'track:' + k) }); }
    const zero = rows.filter((r) => r.years > 0 && r.fires === 0 && r.has);
    const never = rows.filter((r) => r.years === 0);
    const noEv = rows.filter((r) => !r.has);
    console.log('  진로·단계 ' + rows.length + '곳: 체류 있음 ' + rows.filter((r) => r.years > 0).length + ' · 체류 있는데 발화 0 ' + zero.length + (zero.length ? ' (' + zero.map((r) => r.k).join(' ') + ')' : '') + ' · 아무도 도달 못함 ' + never.length + (never.length ? ' (' + never.map((r) => r.k).join(' ') + ')' : '') + ' · 단계 이벤트 없음 ' + noEv.length + (noEv.length ? ' (' + noEv.map((r) => r.k).join(' ') + ')' : ''));
    console.log('  단계별 체류연수/발화: ' + rows.filter((r) => r.years > 0).map((r) => r.k + ' ' + r.years + '/' + r.fires).join(', '));
    const dec = Object.keys(pack.decisions).map((id) => id + ' ' + (decFires[id] || 0)).join(', ');
    console.log('  결정 발화: ' + dec);
  }
  // 강제 진입 커버리지: 모든 진로·단계를 억지로 밟아 그 단계 이벤트가 붙는지(밸런스와 무관하게 콘텐츠 도달성만)
  const cov = { ok: 0, bad: [] };
  for (const [nid, pack] of Object.entries(W9B)) for (const t of data.tracksByNation[nid] || []) for (let si = 0; si < t.stages.length; si++) {
    const k = t.id + ':' + t.stages[si].id;
    if (!pack.events.some((e) => stageTagOf(e) === 'track:' + k)) continue;
    let hit = 0;
    for (let r = 0; r < 12 && !hit; r++) {
      const sim = createSim({ data, seed: 'w9b-cov:' + k + ':' + r, content: registry, auto: true, terra: false, hooks: { log() {}, change() {}, decision() {}, death() {}, year() {} } });
      const S = sim.newLife({ nation: nid, q: 3 }); sim.start();
      const stEvs = pack.events.filter((e) => stageTagOf(e) === 'track:' + k);
      const minA = Math.max(t.entry.ages[0], Math.min(...stEvs.map((e) => e.a[0]))) + 1;   // 그 단계 이벤트가 열리는 가장 이른 나이
      let g = 0; while (S.phase === 'life' && S.age < minA && ++g < 200) sim.runYear();
      if (S.phase !== 'life') continue;
      S.prison = null; S.school = null; S.serving = false;
      const before = pack.events.reduce((a, e) => a + (stageTagOf(e) === 'track:' + k ? (fires[e.id] || 0) : 0), 0);
      if (!sim.enterTrack(t.id, { how: 'forced', via: 'coverage', stage: si, skipExam: true, quiet: true })) continue;
      for (let y = 0; y < 6 && S.phase === 'life' && S.track && S.track.id === t.id && S.track.stage === si; y++) sim.runYear();
      const after = pack.events.reduce((a, e) => a + (stageTagOf(e) === 'track:' + k ? (fires[e.id] || 0) : 0), 0);
      hit = after - before;
    }
    if (hit) cov.ok++; else cov.bad.push(k);
  }
  console.log('[w9b] 강제 진입 커버리지: 단계 ' + (cov.ok + cov.bad.length) + '곳 중 이벤트 발화 확인 ' + cov.ok + ' · 실패 ' + cov.bad.length + (cov.bad.length ? ' (' + cov.bad.join(' ') + ')' : ' ✓'));
  if (process.env.TEXT === '1') w9bTextCheck(data, registry);
}

/** TEXT=1: check-text.js 와 같은 검사(조사·금지 문구·소스 하드코딩·각주 비율)를 두 팩이 등록된 레지스트리 + 두 나라 고정 출생으로. check-text.js 는 content/index.js 만 보므로 여기서 따로 돈다 */
function w9bTextCheck(data, registry) {
  const names = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'names.json'), 'utf8'));
  const V = new Set(); const add = (w) => { if (typeof w === 'string') { const s = w.trim(); if (s.length >= 2) V.add(s); } };
  for (const n of data.nations) { add(n.name); add(n.statOrg); const c = n.culture || {}; for (const k of ['greet', 'address', 'elder', 'food', 'ruler', 'rulerTitle', 'drink']) { add(c[k]); if (c[k]) for (const part of String(c[k]).split(/와 |과 /)) add(part); } for (const f of c.festivals || []) add(f); }
  for (const r of data.races) add(r.name); for (const j of data.jobs) add(j.name); for (const c of data.causes) add(c.label);
  for (const pool of Object.values(names)) { if (!pool || typeof pool !== 'object') continue; for (const key of ['m', 'f', 's']) for (const w of pool[key] || []) add(w); }
  for (const t of data.tracks) { add(t.name); for (const st of t.stages) { add(st.name); add(st.title); } }
  for (const a of data.affiliations) add(a.name);
  const vocab = [...V].sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(^|[\\s(「"\'‘“])(' + vocab.map(esc).join('|') + ')(으로|이라고|라고|은|는|이|가|을|를|과|와|로)(?=$|[\\s.,!?)」"\'’”])', 'g');
  const expect = (word, p) => { const b = hasBatchim(word); if (p === '은' || p === '는') return b ? '은' : '는'; if (p === '이' || p === '가') return b ? '이' : '가'; if (p === '을' || p === '를') return b ? '을' : '를'; if (p === '과' || p === '와') return b ? '과' : '와'; if (p === '으로' || p === '로') { const j = lastJong(word); return j !== 0 && j !== 8 ? '으로' : '로'; } if (p === '이라고' || p === '라고') return b ? '이라고' : '라고'; return p; };
  const FORBIDDEN = ['테라가 아니었다면', '광석병도 재앙도 없는 땅', /이 땅이 [0-9.]+년을 가져갔/, '신뢰구간', '민감도', '추정', '임시', '창작', '1950', 'D9', '시뮬', '현실', '환율은', '묻지 마십시오', '§', 'conflict', 'oriExp', 'catFreq', 'threat:', 'nation:', 'canon', '플래그', '가중', '메모', '세션'];
  const texts = []; const stat = { ev: 0, evF: 0, w9bEv: 0, w9bF: 0 };
  for (const pack of Object.values(W9B)) for (const e of pack.events) { const run = e.run; e.run = (s) => { const r = run(s); stat.w9bEv++; if (r && r.f) stat.w9bF++; return r; }; }
  let errors = 0; const TN = Math.min(N, 300);
  for (let i = 0; i < TN; i++) {
    const hooks = { log: (e) => { texts.push({ src: 'log:' + e.k, t: e.t }); if (e.f) texts.push({ src: 'log-f', t: e.f }); if (e.k !== 'dec') { stat.ev++; if (e.f) stat.evF++; } }, decision: (pd) => { const v = pd.view; texts.push({ src: 'dec:' + pd.id, t: v.title }); texts.push({ src: 'dec:' + pd.id, t: v.body }); for (const c of v.choices || []) { texts.push({ src: 'dec-ch:' + pd.id, t: c.label }); if (c.sub) texts.push({ src: 'dec-ch:' + pd.id, t: c.sub }); } }, change() {}, death() {}, year() {} };
    const sim = createSim({ data, seed: 'w9bt:' + i, content: registry, auto: true, hooks });
    try { const S = sim.newLife({ nation: i % 2 ? 'higashi' : 'ursus' }); sim.start(); let g = 0; while (S.phase === 'life') { sim.runYear(); if (++g > 500) throw new Error('500년'); } } catch (e) { errors++; if (errors <= 3) console.error(e && e.stack || e); }
  }
  const bad = [], forb = [];
  for (const x of texts) {
    if (!x.t || typeof x.t !== 'string') continue;
    let m; re.lastIndex = 0;
    while ((m = re.exec(x.t))) { const ex = expect(m[2], m[3]); if (ex !== m[3]) bad.push(m[2] + m[3] + '→' + ex + ' @' + x.src + ' …' + x.t.slice(Math.max(0, m.index - 15), m.index + 25)); }
    for (const f of FORBIDDEN) { if (typeof f === 'string' ? x.t.includes(f) : f.test(x.t)) forb.push((typeof f === 'string' ? f : f.source) + ' @' + x.src + ' ' + x.t.slice(0, 80)); }
  }
  const srcRe = /\+ '(은|는|이|가|을|를|와|과|로|으로|라고|이라고)[ .,)'!?]/, srcRe2 = /\}(은|는|이|가|을|를|와|과|로|으로)[ .,)'!?<]/;
  const srcHits = [];
  for (const f of ['content/tracks/ursus.js', 'content/tracks/higashi.js']) fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').forEach((l, i) => { if (srcRe.test(l) || srcRe2.test(l)) srcHits.push(f + ':' + (i + 1)); });
  console.log('\n[w9b 문장] ' + texts.length + '개 (N=' + TN + ', 두 나라 고정, 예외 ' + errors + ')');
  console.log('  조사 오류 ' + bad.length + (bad.length ? '\n  ' + [...new Set(bad)].slice(0, 30).join('\n  ') : ' ✓'));
  console.log('  금지 문구 ' + forb.length + (forb.length ? '\n  ' + [...new Set(forb)].slice(0, 20).join('\n  ') : ' ✓'));
  console.log('  소스 하드코딩 조사 ' + srcHits.length + (srcHits.length ? ' ' + srcHits.join(' ') : ' ✓'));
  console.log('  각주 비율: 전체 이벤트 ' + (stat.ev ? (100 * stat.evF / stat.ev).toFixed(1) : 0) + '% · W9b 팩 이벤트 ' + (stat.w9bEv ? (100 * stat.w9bF / stat.w9bEv).toFixed(1) : 0) + '% (' + stat.w9bF + '/' + stat.w9bEv + ', 목표 10~20%)');
  if (bad.length || forb.length || srcHits.length || errors) process.exitCode = 1;
}

main();
