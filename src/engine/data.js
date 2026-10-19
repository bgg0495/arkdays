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

const NATION_DEFAULTS = {
  share: 0, model: [], statMul: {}, policy: 'ignore', policyVariants: [], oriExp: 2, catFreq: 2, conflict: 2,
  nomadic: 0.3, seaborn: false, collapsal: false, conscript: 'none', conscriptSex: 'M', homemakerP: 0.5, races: {}, jobs: [], threats: [],
  nameLang: null, canon: true, blurb: '', eths: {},
};
const INHERIT = ['model', 'custom', 'statMul', 'policy', 'policyVariants', 'oriExp', 'catFreq', 'conflict', 'nomadic', 'seaborn', 'collapsal',
  'conscript', 'conscriptSex', 'homemakerP', 'races', 'jobs', 'threats', 'nameLang', 'canon', 'stats', 'statOrg', 'culture'];
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

  return { nations, nationById, topNations, races, raceById, jobs, jobById, causes, causeById, names, stats: statsById, ethnicFlags, warnings };
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
