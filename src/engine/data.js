// 데이터 테이블 정규화. fetch·fs 없음: 호출자가 JSON 객체를 넘긴다(브라우저는 인라인, Node는 test/sim.js가 읽음).
// 입력 raw = { nations, races, jobs, causes, names, stats1950 }  — 각각 W1 이 만든 data/*.json 을 그대로 파싱한 값.
//   nations.json   { _meta, nations:[…], ethnicFlags:{gaul:{nation,p,nameLang}, …} }   (배열만 와도 됨)
//   races.json     { races:[…] }   oriVuln 은 숫자 또는 {infect, progress}
//   jobs.json      { jobs:[…] }    lo/hi 0~100(또는 0~1), only 배열, age [min,max], req [...], special
//   causes.json    { causes:[…] }  w = 7밴드 배열 [<1,<5,<15,<30,<50,<70,70+], tags = nation:/threat:/infected/female/trait:
//   stats1950.json { countries:{ISO:{le:{value}|number,…}}, custom:{KAZDEL:…} }  u5·imr 0~1, urb %, leM/leF
//   names.json     { lang:{m:[],f:[],s:[]}, _default:{…} }
//   terra_e0.json  { nations:{ id:{ M:{k,e0}, F:{k,e0}, u5k } } }  test/calibrate.js 가 만든 시뮬 기대수명 캐시(D19). 없으면 k=1
// 출력 data = { nations, nationById, topNations, races, raceById, jobs, jobById, causes, causeById, names, stats, ethnicFlags, warnings }
// 엔진 내부 단위: u5·im·urb·gini 는 0~1 분수, lo/hi 는 0~1, 소득은 PPP$(표시는 LMD).

import { ARCHETYPES, ARCHETYPE_IDS } from './archetypes.js';

const NATION_DEFAULTS = {
  share: 0, model: [], statMul: {}, policy: 'ignore', policyVariants: [], oriExp: 2, catFreq: 2, conflict: 2,
  nomadic: 0.3, seaborn: false, collapsal: false, conscript: 'none', conscriptSex: 'M', homemakerP: 0.5, races: {}, jobs: [], threats: [],
  nameLang: null, canon: true, blurb: '', eths: {},
  // v1 §7.3 이주 필드(없으면 기본값)
  mig: {}, refugeeIn: true, naturalize: 'hard', illegalRisk: 0.08, expelsInfected: false, slaveP: 0,
};
const INHERIT = ['model', 'custom', 'statMul', 'policy', 'policyVariants', 'oriExp', 'catFreq', 'conflict', 'nomadic', 'seaborn', 'collapsal',
  'conscript', 'conscriptSex', 'homemakerP', 'races', 'jobs', 'threats', 'nameLang', 'canon', 'stats', 'statOrg', 'culture',
  'mig', 'refugeeIn', 'naturalize', 'illegalRisk', 'expelsInfected', 'slaveP'];
const STAT_FALLBACK = { le: 50, u5: 0.15, im: 0.1, ppp: 2000, gini: 0.4, urb: 0.4, tfr: 4.5, pop: 1 };

export const CAUSE_BANDS = ['<1', '<5', '<15', '<30', '<50', '<70', '70+'];
/** 인간 척도 나이 → 사인 밴드 인덱스 */
export function causeBand(humanAge) {
  if (humanAge < 1) return 0;
  if (humanAge < 5) return 1;
  if (humanAge < 15) return 2;
  if (humanAge < 30) return 3;
  if (humanAge < 50) return 4;
  if (humanAge < 70) return 5;
  return 6;
}

const unwrap = (v) => (v && typeof v === 'object' && 'value' in v ? v.value : v);
const listOf = (raw, key) => (Array.isArray(raw) ? raw : (raw && Array.isArray(raw[key]) ? raw[key] : []));

function normStatsRow(row) {
  if (!row) return null;
  const g = (k) => { const v = unwrap(row[k]); return typeof v === 'number' ? v : undefined; };
  const out = { le: g('le'), leM: g('leM'), leF: g('leF'), u5: g('u5'), im: g('im') ?? g('imr'), ppp: g('ppp'), gini: g('gini'), urb: g('urb'), tfr: g('tfr'), pop: g('pop') };
  if (out.u5 > 1) out.u5 /= 1000;          // ‰ 표기 허용
  if (out.im > 1) out.im /= 1000;
  if (out.urb > 1) out.urb /= 100;         // % 표기
  if (out.gini > 1) out.gini /= 100;
  return out;
}

function normStats(rawStats) {
  const src = rawStats || {};
  const merged = { ...(src.countries || {}), ...(src.custom || {}) };
  if (!src.countries && !src.custom) for (const [k, v] of Object.entries(src)) if (!k.startsWith('_')) merged[k] = v;
  const out = {};
  for (const [iso, row] of Object.entries(merged)) if (!iso.startsWith('_')) out[iso] = normStatsRow(row);
  return out;
}

function statsForNation(nation, statsById) {
  const keys = nation.custom ? [nation.custom] : (nation.model || []);
  const rows = keys.map((k) => statsById[k]).filter(Boolean);
  const out = {};
  const fields = ['le', 'leM', 'leF', 'u5', 'im', 'ppp', 'gini', 'urb', 'tfr'];
  if (rows.length) {
    for (const k of fields) {
      let acc = 0, w = 0;
      for (const r of rows) if (r[k] != null) { acc += r[k] * (r.pop ?? 1); w += (r.pop ?? 1); }
      if (w) out[k] = acc / w;
    }
    out.pop = rows.reduce((s, r) => s + (r.pop ?? 0), 0);
  }
  for (const k of fields) if (out[k] == null && STAT_FALLBACK[k] != null) out[k] = STAT_FALLBACK[k];
  if (nation.stats) Object.assign(out, normStatsRow(nation.stats));     // 국가에 직접 적은 값 우선
  const mul = nation.statMul || {};
  for (const k of ['le', 'u5', 'ppp', 'gini', 'urb', 'tfr']) if (mul[k] != null && mul[k] !== 1) {
    out[k] *= mul[k];
    if (k === 'le') { if (out.leM != null) out.leM *= mul[k]; if (out.leF != null) out.leF *= mul[k]; }
    if (k === 'u5' && out.im != null) out.im *= mul[k];
  }
  if (out.im == null) out.im = out.u5 * 0.7;
  out.u5 = Math.min(0.6, out.u5); out.im = Math.min(out.u5, out.im);
  out.gini = Math.min(0.7, Math.max(0.2, out.gini));
  out.urb = Math.min(0.98, Math.max(0.02, out.urb));
  return out;
}

export function prepareData(raw) {
  const warnings = [];
  const statsById = normStats(raw.stats1950);

  // ── 국가 ──
  const rawNations = listOf(raw.nations, 'nations');
  const ethnicFlags = (raw.nations && !Array.isArray(raw.nations) && raw.nations.ethnicFlags) || {};
  const rawById = Object.fromEntries(rawNations.map((n) => [n.id, n]));
  const nations = rawNations.map((n) => ({ ...NATION_DEFAULTS, ...n, eths: { ...(n.eths || {}) } }));
  const nationById = Object.fromEntries(nations.map((n) => [n.id, n]));
  for (const n of nations) {
    if (!n.parent) continue;
    const p = nationById[n.parent];
    if (!p) { warnings.push('nation ' + n.id + ': parent ' + n.parent + ' 없음'); continue; }
    for (const k of INHERIT) if (rawById[n.id][k] === undefined && p[k] !== undefined) n[k] = p[k];
  }
  const terra = (raw.terra && raw.terra.nations) || raw.terra || {};
  for (const n of nations) {
    n.terra = terra[n.id] || (n.parent && terra[n.parent]) || null;   // 시뮬 기대수명 배율(없으면 모델값 그대로)
    if (typeof n.policy !== 'string') { warnings.push('nation ' + n.id + ': policy 가 문자열이 아님'); n.policy = 'ignore'; }
    n.stats = statsForNation(n, statsById);
    if (!n.custom && !(n.model || []).some((m) => statsById[m])) warnings.push('nation ' + n.id + ': 모델 통계 없음 → 기본값');
    for (const [flag, cfg] of Object.entries(ethnicFlags)) if (cfg && cfg.nation === n.id && cfg.p) n.eths[flag] = cfg.p * 100;
  }
  const topNations = nations.filter((n) => !n.parent);
  for (const n of topNations) n.children = nations.filter((c) => c.parent === n.id).map((c) => c.id);
  const shareSum = nations.reduce((s, n) => s + (n.share || 0), 0);
  if (Math.abs(shareSum - 100) > 2) warnings.push('출생 비중 합 ' + shareSum.toFixed(1) + ' (100 기대)');

  // ── 종족 ──
  const races = listOf(raw.races, 'races').map((r) => {
    const o = { group: 'other', lifeMul: 1, artsApt: 0, stigma: 0, traits: [], home: [], rare: false, ...r };
    if (r.oriVuln && typeof r.oriVuln === 'object') { o.oriVuln = r.oriVuln.infect ?? 1; o.oriProg = r.oriVuln.progress ?? o.oriVuln; }
    else { o.oriVuln = r.oriVuln ?? 1; o.oriProg = r.oriProg ?? o.oriVuln; }
    return o;
  });
  const raceById = Object.fromEntries(races.map((r) => [r.id, r]));
  for (const n of nations) for (const rid of Object.keys(n.races)) if (!raceById[rid]) warnings.push('nation ' + n.id + ': 종족 ' + rid + ' 없음');

  // ── 직업 ──
  const jobs = listOf(raw.jobs, 'jobs').map((j) => {
    const o = { sector: 'ser', edu: 0, urban: 0, oriMul: 1, risk: {}, req: [], special: false, ...j };
    o.lo = (j.lo ?? 20) > 1 ? j.lo / 100 : (j.lo ?? 0.2);
    o.hi = (j.hi ?? 80) > 1 ? j.hi / 100 : (j.hi ?? 0.8);
    o.only = j.only == null ? null : (Array.isArray(j.only) ? j.only : [j.only]);
    o.age = Array.isArray(j.age) ? j.age : [15, 65];
    o.req = Array.isArray(j.req) ? j.req : (j.req ? [j.req] : []);
    return o;
  });
  const jobById = Object.fromEntries(jobs.map((j) => [j.id, j]));
  for (const n of nations) for (const jid of n.jobs) if (!jobById[jid]) warnings.push('nation ' + n.id + ': 직업 ' + jid + ' 없음');

  // ── 사인 ──
  const causes = listOf(raw.causes, 'causes').map((c) => {
    const o = { kind: 'real', label: c.id, tags: [], by: {}, ...c };
    if (!Array.isArray(o.w)) { warnings.push('cause ' + c.id + ': w 는 7밴드 배열이어야 함'); o.w = [0, 0, 0, 0, 0, 0, 0]; }
    while (o.w.length < 7) o.w.push(0);
    return o;
  });
  const causeById = Object.fromEntries(causes.map((c) => [c.id, c]));
  for (const j of jobs) for (const cid of Object.keys(j.risk)) if (!causeById[cid]) warnings.push('job ' + j.id + ': risk 사인 ' + cid + ' 없음');

  // ── 이름 ──
  const names = {};
  const rawNames = (raw.names && raw.names.langs) || raw.names || {};
  for (const [k, v] of Object.entries(rawNames)) if ((!k.startsWith('_') || k === '_default') && v && typeof v === 'object') names[k] = v;
  const langs = new Set(nations.map((n) => n.nameLang).filter(Boolean));
  const missing = [...langs].filter((l) => !names[l]);
  if (missing.length) warnings.push('names: 언어 풀 없음 → _default 사용: ' + missing.join(','));

  const data = { nations, nationById, topNations, races, raceById, jobs, jobById, causes, causeById, names, stats: statsById, ethnicFlags, warnings };
  prepareV1(raw, data);
  return data;
}

// ───────────────────────────── v1: 진로·소속·관계·혼인·주거·로도스 ─────────────────────────────
// raw.tracks        배열 [{_meta, tracks:[…]}, …](파일마다) | {파일명: {…}} | {tracks:[…]} 하나 | 진로 배열 그대로
// raw.affiliations  { affiliations:[…] } | 배열
// raw.relations     { grades, default, sarkaz_default, pairs }
// raw.marriage      { _default:{types}, <nation>:{types} }
// raw.housing       { _default:{types}, <nation>:{types} }
// raw.rhodes        { nation, ports, entries, closed, depts }
// raw.canon_figures { figures:[…] } | 배열 (없으면 [])
// 실데이터가 없는 국가에는 생업 진로(GEN_<NATION>_LIVING / _FARM)를 합성한다(synthetic:true) — 모두가 진로 상태 기계를 탄다.

function collectTracks(rawTracks) {
  if (!rawTracks) return [];
  const out = [];
  const take = (file) => {
    if (!file) return;
    if (Array.isArray(file)) { for (const x of file) { if (x && Array.isArray(x.tracks)) take(x); else if (x && x.id) out.push(x); } return; }
    if (Array.isArray(file.tracks)) { const meta = file._meta || {}; for (const t of file.tracks) out.push(meta.nation && !t.nation ? { ...t, nation: meta.nation } : t); return; }
    for (const [k, v] of Object.entries(file)) if (!k.startsWith('_')) take(v);
  };
  take(rawTracks);
  return out;
}

export function normTrack(t, warnings, affById, fallDefaults = {}) {
  const A = ARCHETYPES[t.archetype] || ARCHETYPES.A11;
  if (!ARCHETYPES[t.archetype]) warnings.push('track ' + t.id + ': archetype ' + t.archetype + ' 없음 → A11');
  const o = { region: null, canon: false, itinerant: false, route: null, forced: false, job: null, dept: null, synthetic: false, capStage: null, term: null, contract: null,
    oriPolicyOverride: null, canonFigures: [], standing: { name: '평판', start: 20 }, affiliations: [], ...t };
  if (!o.job && t.income && t.income.job) o.job = t.income.job;          // W8: income.job
  o.archetype = ARCHETYPES[t.archetype] ? t.archetype : 'A11';
  o.A = A;
  o.entry = { ages: [15, 40], classes: {}, gates: [], via: [], ...(t.entry || {}) };
  if (!Array.isArray(o.entry.ages) || o.entry.ages.length !== 2) o.entry.ages = [15, 40];
  o.entry.gates = Array.isArray(o.entry.gates) ? o.entry.gates : [];
  o.stages = (Array.isArray(t.stages) ? t.stages : []).map((s, i) => {
    const st = { id: s.id || ('s' + i), name: s.name || ('단계 ' + (i + 1)), title: s.title ?? null, minYears: s.minYears ?? 2, owner: !!s.owner, forced: !!s.forced, contract: s.contract ?? null, oriMul: s.oriMul ?? null, capStage: s.capStage ?? null, ...s };
    st.promo = s.promo === null ? null : { cap: A.promoCap, k: 0.05, ...(s.promo || {}) };
    st.fall = { base: A.fallBase, causes: A.causes.slice(), ...(s.fall || {}) };
    if (!Array.isArray(st.fall.causes)) st.fall.causes = A.causes.slice();
    return st;
  });
  if (!o.stages.length) { warnings.push('track ' + o.id + ': stages 없음'); o.stages = [{ id: 's0', name: o.name, title: null, minYears: 2, promo: null, fall: { base: A.fallBase, causes: A.causes.slice() } }]; }
  const inc = t.income && Array.isArray(t.income.stage) ? t.income.stage.slice() : null;
  o.income = { stage: inc || o.stages.map((_, i) => +(0.5 + i * 0.5).toFixed(2)) };
  while (o.income.stage.length < o.stages.length) o.income.stage.push(o.income.stage[o.income.stage.length - 1] * 1.3);
  o.exits = { retire: null, fall: {}, switch: [], ...(t.exits || {}) };
  o.exits.fall = { ...A.exits, ...(o.exits.fall || {}) };
  for (const c of o.stages.flatMap((s) => s.fall.causes)) if (o.exits.fall[c] == null) o.exits.fall[c] = fallDefaults[c] || 'expel';   // W8 _meta.fallDefaultOutcome
  if (o.exits.retire === undefined || (o.exits.retire === null && !('retire' in (t.exits || {})))) o.exits.retire = A.retireAge ? { age: A.retireAge } : null;
  if (o.exits.retire && typeof o.exits.retire === 'number') o.exits.retire = { age: o.exits.retire };
  o.exits.switch = Array.isArray(o.exits.switch) ? o.exits.switch : [];
  if (o.oriMul == null) o.oriMul = A.oriMul;
  if (o.archetype === 'A5' && t.forced === undefined) o.forced = true;
  o.forcedEntry = !!o.forced || !!(o.stages[0] && o.stages[0].forced);   // 자발 진입 불가(강제 전환·이벤트로만)
  o.noClasses = !Object.keys(o.entry.classes || {}).length;             // classes 없음 = switch·이벤트·로도스 배치로만 진입
  if (o.archetype === 'A6' && !o.contract) o.contract = A.flags.contract;
  o.affiliations = (o.affiliations || []).filter((id) => { if (affById && !affById[id]) { warnings.push('track ' + o.id + ': affiliation ' + id + ' 없음'); return false; } return true; });
  o.special = !!o.canon && !['A10', 'A11'].includes(o.archetype) && !o.synthetic;
  return o;
}

function syntheticTracks(nation, data) {
  // 실데이터가 없는 국가용 생업 진로 2개(도시/농촌). jobs.json 의 lo/hi 로 소득 범위를 빌린다.
  const code = nation.id.toUpperCase();
  const mk = (suffix, name, job, urbanReq) => ({
    id: 'GEN_' + code + '_' + suffix, nation: nation.id, name, archetype: 'A11', canon: false, synthetic: true, job,
    entry: { ages: [9, 60], classes: { q1: 0.6, q2: 0.6, q3: 0.5, q4: 0.3, q5: 0.15 }, gates: urbanReq == null ? [] : [{ urban: urbanReq }], via: ['family'] },
    stages: [
      { id: 'apprentice', name: '견습', minYears: 2, promo: { cap: 'skill', k: 0.2 }, fall: { base: 0.01, causes: ['ruin'] } },
      { id: 'worker', name: '일꾼', minYears: 8, promo: { cap: 'ties', k: 0.05 }, fall: { base: 0.015, causes: ['ruin'] } },
      { id: 'owner', name: '자영', title: '주인', minYears: 0, promo: null, fall: { base: 0.02, causes: ['ruin'] }, owner: true }],
    income: { stage: [0.4, 0.8, 1.4] }, standing: { name: '동네 평판', start: 25 }, affiliations: [],
    exits: { retire: { age: 65 }, fall: { ruin: 'demote' }, switch: [] },
  });
  const hasJob = (id) => !!data.jobById[id];
  return [mk('LIVING', '생업', hasJob('shopkeeper') ? 'shopkeeper' : null, true), mk('FARM', '농사', hasJob('farmer') ? 'farmer' : null, false)];
}

function prepareV1(raw, data) {
  const { nations, nationById, warnings } = data;
  // ── 로도스 가상 국가(본함 거주용, 출생 불가) ──
  const rho = raw.rhodes || {};
  if (!nationById.rhodes) {
    const avg = (k) => { const v = nations.filter((n) => !n.parent).map((n) => n.stats[k]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : STAT_FALLBACK[k]; };
    const rn = { ...NATION_DEFAULTS, id: 'rhodes', name: '로도스 아일랜드', policy: 'treat', oriExp: 1, catFreq: 1, conflict: 2, nomadic: 1.0, statOrg: '로도스 아일랜드 인사부',
      naturalize: 'never', refugeeIn: true, illegalRisk: 0, nameLang: nations[0] && nations[0].nameLang, ...(rho.nation || {}), share: 0, virtual: true, eths: {}, races: {} };
    rn.stats = { le: avg('le'), leM: avg('leM'), leF: avg('leF'), u5: avg('u5'), im: avg('im'), ppp: avg('ppp'), gini: Math.min(0.7, Math.max(0.2, avg('gini'))), urb: 0.98, tfr: avg('tfr'), pop: 0 };
    rn.terra = null; rn.children = [];
    nations.push(rn); nationById.rhodes = rn; data.topNations.push(rn);
  }
  // ── 소속 ──
  const affs = listOf(raw.affiliations, 'affiliations').map((a) => ({ canon: false, weight: 1, tags: [], events: null, ...a,
    track: Array.isArray(a.track) ? a.track : (a.track ? [a.track] : []), mods: { promo: 1, fall: 1, income: 1, standingStart: 0, ...(a.mods || {}) } }));
  const affById = Object.fromEntries(affs.map((a) => [a.id, a]));
  // ── 진로 ──
  // W8 _meta.fallDeathCause / fallDefaultOutcome(파일 어디에 있든 합친다)
  const fallDeathCause = {}, fallDefaultOutcome = {};
  const scanMeta = (file) => { if (!file || typeof file !== 'object') return; if (Array.isArray(file)) { file.forEach(scanMeta); return; }
    if (file._meta) { Object.assign(fallDeathCause, file._meta.fallDeathCause || {}); Object.assign(fallDefaultOutcome, file._meta.fallDefaultOutcome || {}); }
    if (!file.tracks) for (const v of Object.values(file)) if (v && typeof v === 'object' && (v.tracks || Array.isArray(v))) scanMeta(v); };
  scanMeta(raw.tracks);
  let tracks = collectTracks(raw.tracks).map((t) => normTrack(t, warnings, affById, fallDefaultOutcome));
  const seen = new Set();
  tracks = tracks.filter((t) => { if (seen.has(t.id)) { warnings.push('track id 중복 ' + t.id); return false; } seen.add(t.id); return true; });
  for (const t of tracks) if (!nationById[t.nation] && t.nation !== 'common') warnings.push('track ' + t.id + ': nation ' + t.nation + ' 없음');
  const byNation = {};
  for (const t of tracks) (byNation[t.nation] || (byNation[t.nation] = [])).push(t);
  for (const n of nations) {
    if (n.virtual) continue;
    const own = byNation[n.id] || [];
    const hasLiving = own.some((t) => t.archetype === 'A11');
    if (!own.length || !hasLiving) {
      for (const t of syntheticTracks(n, data)) { const nt = normTrack(t, warnings, affById); tracks.push(nt); (byNation[n.id] || (byNation[n.id] = [])).push(nt); }
      if (!own.length) n.tracksSynthetic = true;
    }
  }
  const trackById = Object.fromEntries(tracks.map((t) => [t.id, t]));
  for (const t of tracks) {
    if (t.exits.retire && t.exits.retire.to && !trackById[t.exits.retire.to]) { warnings.push('track ' + t.id + ': retire.to ' + t.exits.retire.to + ' 없음'); delete t.exits.retire.to; }
    t.exits.switch = t.exits.switch.filter((id) => { if (!trackById[id]) { warnings.push('track ' + t.id + ': switch ' + id + ' 없음'); return false; } return true; });
    for (const [c, v] of Object.entries(t.exits.fall)) if (typeof v === 'string' && /^(arena|switch):/.test(v) && !trackById[v.split(':')[1]]) { warnings.push('track ' + t.id + ': fall ' + c + ' → ' + v + ' 없음'); t.exits.fall[c] = 'expel'; }
  }
  for (const a of affs) for (const tid of a.track) if (!trackById[tid]) warnings.push('affiliation ' + a.id + ': track ' + tid + ' 없음');
  // 진로별 소속 역참조(진로 JSON 에 affiliations 가 비어 있어도 소속 쪽 track 으로 묶인다)
  for (const a of affs) for (const tid of a.track) { const t = trackById[tid]; if (t && !t.affiliations.includes(a.id)) t.affiliations.push(a.id); }
  // ── 관계 매트릭스 ──
  const rel = raw.relations || {};
  const relations = {
    grades: rel.grades || ['exclude', 'institutional', 'cultural', 'subtle', 'neutral', 'favored'],
    default: rel.default || 'neutral',
    relMul: rel.relMul || null,
    sarkazDefault: rel.sarkaz_default || rel.sarkazDefault || null,
    pairs: (rel.pairs || []).concat(rel.ethPairs || []).map((p) => ({ canon: true, scope: null, since: null, until: null, eth: null, ...p })),
  };
  // ── 혼인·주거 (W8: {_meta, _common?, nations:{id:{types}}} / 더미: {_default, <id>:{types}}) ──
  const normTypes = (src, kind) => {
    const out = {};
    const body = src && src.nations ? src.nations : (src || {});
    for (const [k, v] of Object.entries(body)) {
      if (k.startsWith('_') && k !== '_default') continue;
      const types = (v && Array.isArray(v.types) ? v.types : Array.isArray(v) ? v : []).map((t) => normType(t, kind));
      out[k] = { types };
    }
    if (src && src._default && !out._default) out._default = { types: (src._default.types || []).map((t) => normType(t, kind)) };
    const common = src && src._common && Array.isArray(src._common.types) ? src._common.types.map((t) => normType(t, kind)) : [];
    if (common.length) for (const v of Object.values(out)) for (const c of common) if (!v.types.some((t) => t.id === c.id)) v.types.push(c);
    if (!out._default) out._default = { types: common.slice() };
    return out;
  };
  const marriage = normTypes(raw.marriage, 'marriage');
  if (!marriage._default.types.length) marriage._default.types.push({ id: 'custom', name: '관습 혼인', w: 1, req: {}, age: [18, 45] });
  const housing = normTypes(raw.housing, 'housing');
  if (!housing._default.types.length) housing._default.types.push(
    { id: 'plate_rent', name: '이동도시 플레이트 임대', w: 1, nomadic: true, req: { urban: true, nomadic: true }, cost: 0.25 },
    { id: 'town_rent', name: '도시 셋방', w: 1, req: { urban: true }, cost: 0.2 },
    { id: 'village_house', name: '마을 집', w: 1, req: { urban: false }, cost: 0.05, buy: 2 },
    { id: 'quarantine', name: '격리구역', forced: { oriPolicy: ['quarantine', 'euthanasia'], known: true }, cost: 0.1 },
    { id: 'camp', name: '수용소 막사', forced: { prison: 'camp' }, cost: 0 },
    { id: 'jail', name: '감옥', forced: { prison: 'jail' }, cost: 0 },
    { id: 'ship_cabin', name: '로도스 선실', forced: { res: 'rhodes' }, cost: 0.05 });
  // ── 로도스 (W8 실데이터·더미 둘 다) ──
  const rhodes = normRhodes(rho, nations);
  const canonFigures = listOf(raw.canon_figures || raw.canonFigures, 'figures');

  Object.assign(data, { tracks, trackById, tracksByNation: byNation, affiliations: affs, affById, relations, marriage, housing, rhodes, canonFigures, fallDeathCause, fallDefaultOutcome });
}

/** 혼인·주거 유형 하나 정규화(W8 키 ↔ 더미 키) */
function normType(t, kind) {
  const o = { w: 1, req: {}, ...t };
  if (kind === 'housing') {
    if (o.own && o.price != null && o.buy == null) o.buy = o.price;        // W8: own+price = 소유형
    if (o.nomadic == null && o.req && o.req.nomadic != null) o.nomadic = !!o.req.nomadic;
    if (o.cost == null) o.cost = 0.1;
  } else if (kind === 'marriage') {
    if (o.infected_only == null && o.req && o.req.infected === true) o.infected_only = true;
  }
  return o;
}

/** 로도스 입구 표 정규화. W8: entries[].pYear + trigger{}, ports{weights, offices}, closed[].when, depts[{id,track}], statusRules{rules}, diagnosis{templates}, operatorStats{bounds} */
function normRhodes(rho, nations) {
  const defaultPorts = nations.filter((n) => !n.parent && !n.virtual && n.share > 0).map((n) => [n.id, n.share]);
  let ports = defaultPorts, offices = [], lostYear = null;
  const pw = (rho.portWeights && rho.portWeights.weights) || (rho.ports && rho.ports.weights) || null;
  if (Array.isArray(rho.ports) && rho.ports.length) ports = rho.ports.map((p) => (Array.isArray(p) ? p : [p, pw && pw[p] != null ? pw[p] : 1]));
  else if (pw) ports = Object.entries(pw);
  offices = (rho.portWeights && rho.portWeights.offices) || (rho.ports && rho.ports.offices) || rho.offices || [];
  lostYear = (rho.portWeights && rho.portWeights.lostYear) ?? (rho.ports && rho.ports.lostYear) ?? rho.lostYear ?? null;
  const RESCUE_FLAGS = ['rhodesRescue', 'catastrophe_hit', 'bigevent_survive', 'fall_experiment_survive', 'fall_camp_survive'];
  const CONTACT_FLAGS = ['rhodesContact', 'rhodes_operation', 'rhodes_legal', 'rhodes_medical_pact', 'rhodes_rescue'];
  const entries = (rho.entries || []).map((e) => {
    const tr = e.trigger || {};
    const inf = tr.infected ?? e.infected;
    const o = { via: e.via, p: e.p ?? e.pYear ?? 0, line: e.line || null, status: e.status || null, keepTrack: !!e.keepTrack, rarity: e.rarity || null,
      infected: typeof inf === 'string' ? inf : (inf === false ? 'none' : (e.known || inf === true) ? 'diagnosed' : null),
      ages: tr.age || e.ages || e.age || null,
      capAny: tr.capAny || e.capAny || e.cap || (e.capMin != null ? { skill: e.capMin, learn: e.capMin, arts: e.capMin, ties: e.capMin } : null),
      officeNation: !!(tr.officeNation ?? e.officeNation), archetypes: tr.archetypes || e.archetypes || null, stageMin: tr.stageMin ?? e.stageMin ?? null,
      policies: tr.policyAny || e.policyAny || e.policies || null, money: tr.orMoney ?? e.orMoney ?? e.money ?? null, forcedTrack: !!(tr.orForcedTrack ?? e.orForcedTrack ?? e.forcedTrack),
      tracks: tr.tracks || e.tracks || null, papers: tr.papers || e.papers || null, fallOutcome: tr.fallOutcome || e.fallOutcome || null, orFalling: !!(tr.orFalling ?? e.orFalling),
      nation: tr.nation || e.nation || null, bornBefore: tr.bornBefore ?? e.bornBefore ?? null, years: tr.year || e.years || e.year || null,
      operationArea: !!(tr.operationArea ?? e.operationArea), flags: [] };
    if (e.via === 'referral') o.flags = (tr.contactEvent || e.contactEvent || []).concat(e.flag ? [e.flag] : []).concat(CONTACT_FLAGS);
    if (e.via === 'rescue') o.flags = (tr.events || e.events || []).concat(e.flag ? [e.flag] : []).concat(RESCUE_FLAGS);
    if (e.via === 'companion') o.flags = [e.flag || 'rhodesCompanion', 'rhodesCompanion'];
    o.flags = [...new Set(o.flags)];
    return o;
  });
  const depts = {};
  const deptList = [];
  if (Array.isArray(rho.depts)) for (const d of rho.depts) { if (typeof d === 'string') deptList.push(d); else if (d && d.id) { deptList.push(d.id); if (d.track) depts[d.id] = d.track; } }
  const sr = rho.statusRules && Array.isArray(rho.statusRules.rules) ? rho.statusRules.rules : (Array.isArray(rho.statusRules) ? rho.statusRules : []);
  const p2o = rho.statusRules && rho.statusRules.patientToOperator ? { afterYears: rho.statusRules.patientToOperator.afterYears ?? 2, pYear: rho.statusRules.patientToOperator.pYear ?? 0.25,
    stageMax: (() => { const m = /(\d)/.exec(String((rho.statusRules.patientToOperator.requires || {}).infectedStage || '<=2')); return m ? +m[1] : 2; })() } : null;
  const c2o = rho.statusRules && rho.statusRules.contractorToOperator ? { afterYears: rho.statusRules.contractorToOperator.afterYears ?? 3 } : null;
  const closed = (rho.closed || []).map((c) => (c.when ? { when: c.when, rumorOnly: !!c.rumorOnly } : { when: c, rumorOnly: !!c.rumorOnly }));
  const diagnosis = rho.diagnosis && Array.isArray(rho.diagnosis.templates) ? rho.diagnosis.templates : [];
  let opGrades = null;
  if (rho.operatorStats && Array.isArray(rho.operatorStats.bounds) && Array.isArray(rho.operatorStats.grades)) {
    opGrades = rho.operatorStats.bounds.map((b, i) => [b, rho.operatorStats.grades[i]]).concat([[Infinity, rho.operatorStats.grades[rho.operatorStats.bounds.length]]]);
  }
  return { entries, ports, offices, lostYear, closed, depts, deptList: deptList.length ? deptList : ['field', 'medical', 'engineer', 'logistics', 'purchase', 'office', 'hr', 'patient'],
    statusRules: sr, patientToOperator: p2o, contractorToOperator: c2o, diagnosis, opGrades, deferGap: rho.decision && rho.decision.deferGapYears || 3 };
}

/** 국가(하위 지역 포함)에서 열리는 진로 목록: 자기 것 + 상위 국가 것(region 이 맞거나 없는 것) */
export function tracksFor(data, nationId) {
  const n = data.nationById[nationId];
  const own = data.tracksByNation[nationId] || [];
  const common = nationId === 'rhodes' ? [] : (data.tracksByNation.common || []);
  if (!n || !n.parent) return own.filter((t) => !t.region || t.region === nationId).concat(common);
  const parent = (data.tracksByNation[n.parent] || []).filter((t) => !t.region || t.region === nationId);
  return own.concat(parent, common);
}

/** 현재 국가의 최상위 국가 id */
export function rootOf(data, id) {
  let n = data.nationById[id];
  while (n && n.parent) n = data.nationById[n.parent];
  return n ? n.id : id;
}

/** policyVariants 의 when 문자열 평가: "year>=1098", "urban==false", "region=='north'", "amir=='mining'" */
const WHEN_RE = /^\s*([A-Za-z_]\w*)\s*(==|!=|>=|<=|>|<)\s*(.+?)\s*$/;
/** 출생 시 보조 변수 롤(D20): 변형마다 p 로 그 값을 받고, 아니면 'other' */
export function rollWhenVars(nation, rng) {
  const sub = {};
  for (const [v, opts] of whenVars(nation)) {
    sub[v] = 'other';
    for (const o of opts) if (rng.chance(o.p)) { sub[v] = o.val; break; }
  }
  return sub;
}

export function whenVars(nation) {
  const out = new Map();
  for (const v of nation.policyVariants || []) {
    const m = WHEN_RE.exec(v.when || '');
    if (!m) continue;
    if (['year', 'age', 'urban'].includes(m[1])) continue;
    const val = parseWhenValue(m[3]);
    if (!out.has(m[1])) out.set(m[1], []);
    out.get(m[1]).push({ val, p: typeof v.p === 'number' ? v.p : 0.5 });   // D20: p 없으면 0.5
  }
  return out;
}
function parseWhenValue(s) {
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s.replace(/^['"]|['"]$/g, '');
}
export function evalWhen(when, S) {
  const m = WHEN_RE.exec(when || '');
  if (!m) return false;
  const [, v, op, rawVal] = m;
  const val = parseWhenValue(rawVal);
  let cur;
  if (v === 'year') cur = S.by + S.age;
  else if (v === 'age') cur = S.age;
  else if (v === 'urban') cur = !!S.urban;
  else cur = S.sub ? S.sub[v] : undefined;
  if (cur === undefined) return false;
  switch (op) {
    case '==': return cur === val;
    case '!=': return cur !== val;
    case '>=': return cur >= val;
    case '<=': return cur <= val;
    case '>': return cur > val;
    case '<': return cur < val;
  }
  return false;
}

/** 감염자 정책 해석: 기본 policy + policyVariants(첫 매치 우선) */
export function resolvePolicy(nation, S) {
  for (const v of nation.policyVariants || []) if (v.policy && evalWhen(v.when, S)) return v.policy;
  return nation.policy || 'ignore';
}
