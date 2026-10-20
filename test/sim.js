// 자동 시뮬 테스트: node test/sim.js [N=1000] [seed=w2]
// HOOK no-op + 자동 결정(선택지 auto 가중 랜덤)으로 N명을 돌려 국가별 평균 수명·감염률·사인·평균 자산을 표로 출력한다.
// data/*.json 이 있으면 그것을, 없으면 data/_dummy/*.json 을 파일별로 대체 로드한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prepareData } from '../src/engine/data.js';
import { lifeTable } from '../src/engine/lifetable.js';
import { createRegistry } from '../src/engine/content.js';
import { createSim } from '../src/engine/sim.js';
import { incomeAt } from '../src/engine/finance.js';
import content from '../content/index.js';
import dummyTracks from '../content/_dummy_tracks.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = parseInt(process.argv[2] || '1000', 10);
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
  console.log('콘텐츠: 이벤트 ' + registry.events.length + ' / 결정 ' + Object.keys(registry.decisions).length + ' / 대사건 ' + registry.big.length);

  const rows = {};           // nation → 집계
  const causeAll = {};
  const oriHow = {};
  const scen = { bornInf: 0, bornInfU5: 0, minerFam: 0, minerFamBornInf: 0, childLabor: 0, childLaborAgeSum: 0, campChild: 0 };
  const rowOf = (id) => rows[id] || (rows[id] = { n: 0, nHuman: 0, ageSum: 0, ageSumHuman: 0, inf: 0, known: 0, bornInf: 0, money: 0, causes: {}, outcomes: {}, u5: 0, decisions: 0, logs: 0, rhodes: 0, moved: 0, marF: 0, hmF: 0, marM: 0, hmM: 0, servF: 0, specialY: 0, adultY: 0 });
  const v1 = { spells: {}, decDone: {}, logLines: 0, lives: 0, infected: 0, rhodes: 0, rhodesInf: 0, via: {}, rstatus: {}, migrated: 0, migReason: {}, marriage: {}, married: 0, trackByNation: {}, entryByClass: {}, everTrack: 0, how: {}, falls: {}, relIncome: {}, housing: {}, promos: 0, disgrace: 0, stigma: {} };
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
      // W11: 유입 = 진로 구간(spell)마다 1(첫 진로만이 아니라 전직·재진입도). 승급·강등 항목은 같은 구간이므로 세지 않는다
      { const spells = []; let last = null;
        let prevHow = null; for (const h of S.trackHist) { if (h.how === 'promo' || h.how === 'demote') { last = h.id; continue; } if (h.id !== last && prevHow !== 'retire') spells.push(h.id); last = null; prevHow = h.how; }
        if (S.track && S.track.id !== last && prevHow !== 'retire') spells.push(S.track.id);
        for (const id of spells) { const t = data.trackById[id]; if (!t) continue; const q = 'q' + S.q; const nb = v1.entryByClass[t.nation] || (v1.entryByClass[t.nation] = {}); const qb = nb[q] || (nb[q] = {}); qb[t.id] = (qb[t.id] || 0) + 1; v1.spells[t.id] = (v1.spells[t.id] || 0) + 1; if (t.special) tr.specialY++; } }
      for (const id of Object.keys(S.done)) v1.decDone[id] = (v1.decDone[id] || 0) + 1;
      v1.logLines += S.log.length;
      if (S.trackHist.length || S.track) v1.everTrack++;
      for (const h of S.trackHist) v1.how[h.how] = (v1.how[h.how] || 0) + 1;
      if (S.flags.lastFall) v1.falls[S.flags.lastFall] = (v1.falls[S.flags.lastFall] || 0) + 1;
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
  console.log('[v1] 생애 중 진로 경험 ' + pct(v1.everTrack / v1.lives) + ' | 기록 줄/생 평균 ' + f1(v1.logLines / v1.lives));
  // W11: 자연 시뮬에서 유입 0 인 자발 진로(forced·synthetic·classes 없음 제외)와 한 번도 열리지 않은 결정
  const zeroTracks = Object.values(data.trackById).filter((t) => !t.forcedEntry && !t.synthetic && !t.noClasses && !t.dept && !v1.spells[t.id]).map((t) => t.id);
  console.log('[v1] 유입 0 자발 진로 ' + zeroTracks.length + '개: ' + zeroTracks.join(', '));
  const zeroDec = Object.keys(registry.decisions).filter((id) => !v1.decDone[id]);
  console.log('[v1] 발화 0 결정 ' + zeroDec.length + '/' + Object.keys(registry.decisions).length + '개: ' + zeroDec.join(', '));

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

// 직접 실행할 때만(다른 하네스가 loadData 를 import 할 수 있게, W11)
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
