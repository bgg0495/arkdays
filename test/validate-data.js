#!/usr/bin/env node
// data/*.json 검증 스크립트 (W1). 실행: node test/validate-data.js
// 검사: JSON 파싱, 필수 필드, enum, 범위, share 합, 참조 무결성(races/jobs/causes/nations/names/stats)
'use strict';
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

function load(name) {
  const p = path.join(DATA, name);
  let txt;
  try { txt = fs.readFileSync(p, 'utf8'); } catch (e) { err(`${name}: 파일 없음`); return null; }
  try { return JSON.parse(txt); } catch (e) { err(`${name}: JSON 파싱 실패 - ${e.message}`); return null; }
}

const nationsDoc = load('nations.json');
const racesDoc = load('races.json');
const jobsDoc = load('jobs.json');
const causesDoc = load('causes.json');
const namesDoc = load('names.json');
const statsDoc = load('stats1950.json');
if (!fs.existsSync(path.join(DATA, 'README.md'))) err('README.md: 파일 없음');

if (errors.length) { report(); process.exit(1); }

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isStr = (x) => typeof x === 'string' && x.length > 0;
const inRange = (x, a, b) => isNum(x) && x >= a && x <= b;
function need(obj, key, pred, where) { if (!pred(obj[key])) err(`${where}: 필드 '${key}' 누락 또는 형식 오류 (${JSON.stringify(obj[key])})`); }
function uniqueIds(list, where) {
  const seen = new Set();
  for (const x of list) { if (seen.has(x.id)) err(`${where}: id 중복 '${x.id}'`); seen.add(x.id); }
  return seen;
}

// ---------- races ----------
const races = racesDoc.races || [];
const raceIds = uniqueIds(races, 'races');
const GROUPS = ['ancients', 'elders', 'teekaz', 'other'];
const traitKeys = new Set(Object.keys(racesDoc._meta?.traitKeys || {}));
for (const r of races) {
  const w = `races[${r.id}]`;
  need(r, 'id', isStr, w); need(r, 'name', isStr, w);
  if (!GROUPS.includes(r.group)) err(`${w}: group 값 오류 '${r.group}'`);
  need(r, 'lifeMul', (x) => inRange(x, 0.5, 5), w);
  if (!r.oriVuln || !inRange(r.oriVuln.infect, 0, 20) || !inRange(r.oriVuln.progress, 0, 20)) err(`${w}: oriVuln {infect, progress} 오류`);
  need(r, 'artsApt', (x) => inRange(x, -2, 2), w);
  need(r, 'stigma', (x) => inRange(x, 0, 3), w);
  if (!Array.isArray(r.traits)) err(`${w}: traits 배열 아님`);
  else for (const t of r.traits) if (!traitKeys.has(t)) err(`${w}: trait '${t}' 가 _meta.traitKeys 에 없음`);
  if (!Array.isArray(r.home) || r.home.length === 0) err(`${w}: home 비어 있음`);
}
if (races.length < 24) err(`races: 24종 이상이어야 함 (현재 ${races.length})`);
const rareCount = races.filter((r) => r.rare).length;
if (rareCount !== 2) warn(`races: rare 종족 수가 2 가 아님 (${rareCount})`);

// ---------- causes ----------
const causes = causesDoc.causes || [];
const causeIds = uniqueIds(causes, 'causes');
for (const c of causes) {
  const w = `causes[${c.id}]`;
  need(c, 'id', isStr, w); need(c, 'label', isStr, w);
  if (!['real', 'terra'].includes(c.kind)) err(`${w}: kind 오류`);
  if (!Array.isArray(c.w) || c.w.length !== 7 || !c.w.every((x) => inRange(x, 0, 1000))) err(`${w}: w 는 7밴드 숫자 배열이어야 함`);
  else if (c.w.every((x) => x === 0)) err(`${w}: w 가 전부 0`);
  if (!Array.isArray(c.tags)) err(`${w}: tags 배열 아님`);
}
if (causes.length < 25) err(`causes: 25종 이상이어야 함 (현재 ${causes.length})`);

// ---------- jobs ----------
const jobs = jobsDoc.jobs || [];
const jobIds = uniqueIds(jobs, 'jobs');
const SECTORS = ['agr', 'ind', 'ser', 'none'];
for (const j of jobs) {
  const w = `jobs[${j.id}]`;
  need(j, 'id', isStr, w); need(j, 'name', isStr, w);
  if (!SECTORS.includes(j.sector)) err(`${w}: sector 오류 '${j.sector}'`);
  need(j, 'edu', (x) => inRange(x, 0, 5), w);
  need(j, 'lo', (x) => inRange(x, 0, 100), w); need(j, 'hi', (x) => inRange(x, 0, 100), w);
  if (isNum(j.lo) && isNum(j.hi) && j.lo > j.hi) err(`${w}: lo > hi`);
  if (![-1, 0, 1].includes(j.urban)) err(`${w}: urban 은 -1/0/1`);
  need(j, 'oriMul', (x) => inRange(x, 0, 20), w);
  if (j.risk && typeof j.risk === 'object') {
    for (const [k, v] of Object.entries(j.risk)) {
      if (!causeIds.has(k)) err(`${w}: risk 키 '${k}' 가 causes 에 없음`);
      if (!inRange(v, 0, 50)) err(`${w}: risk['${k}'] 값 오류`);
    }
  } else err(`${w}: risk 객체 필요(빈 객체 허용)`);
  if (j.age && (!Array.isArray(j.age) || j.age.length !== 2 || j.age[0] > j.age[1])) err(`${w}: age [min,max] 오류`);
  if (j.req) for (const q of j.req) {
    if (q.startsWith('race:')) { if (!raceIds.has(q.slice(5))) err(`${w}: req 종족 '${q}' 없음`); }
    else if (!['artsTop10', 'infected'].includes(q) && !q.startsWith('sex:')) err(`${w}: req 키 '${q}' 미정의`);
  }
}
const commonJobs = jobs.filter((j) => !j.special && !j.only);
if (commonJobs.length < 30) err(`jobs: 공통 직업 30종 이상이어야 함 (현재 ${commonJobs.length})`);

// ---------- names ----------
const langs = namesDoc.langs || {};
const ORDERS = ['gf', 'fg', 'pat', 'mono'];
for (const [k, L] of Object.entries(langs)) {
  const w = `names.langs[${k}]`;
  if (!ORDERS.includes(L.o)) err(`${w}: o 값 오류 '${L.o}'`);
  if (typeof L.sep !== 'string') err(`${w}: sep 누락`);
  for (const f of ['m', 'f', 's']) {
    if (!Array.isArray(L[f]) || L[f].length < 20) err(`${w}: ${f} 는 20개 이상 (현재 ${L[f]?.length ?? 0})`);
    else {
      const dup = L[f].filter((x, i) => L[f].indexOf(x) !== i);
      if (dup.length) warn(`${w}: ${f} 중복 ${JSON.stringify(dup)}`);
    }
  }
  if (L.raceRule) for (const [rid, o] of Object.entries(L.raceRule)) {
    if (!raceIds.has(rid)) err(`${w}: raceRule 종족 '${rid}' 없음`);
    if (!ORDERS.includes(o)) err(`${w}: raceRule['${rid}'] o 값 오류`);
  }
  if (L.o === 'pat') {
    if (!Array.isArray(L.pat) || L.pat.length < 10) err(`${w}: o=pat 인데 pat 표가 10개 미만`);
    else for (const p of L.pat) { if (!isStr(p.base) || !isStr(p.m) || !isStr(p.f)) err(`${w}: pat 항목 형식 오류`); else if (!L.m.includes(p.base)) warn(`${w}: pat base '${p.base}' 가 m 풀에 없음`); }
  }
  if (L.femSurname) for (const pair of L.femSurname) if (!Array.isArray(pair) || pair.length !== 2) err(`${w}: femSurname 쌍 오류`);
}
// 실제 캐릭터 이름 금지 목록(보고서 A-8 근거 사례 + 잘 알려진 오퍼레이터 본명 일부). 발견 시 오류.
const BANNED = ['좌락', '영사추', '닝쉐추', '웨이 옌우', '웨이옌우', '첸', '린 위샤', '엔시오데스', '실버애쉬', '클레망 뒤부아', '에마누엘', '셰프치크', '티투스 토폴라', '야체크 노바', '마크 맥스', '크리스틴 라이트', '허먼 도이코스', '클레멘티아', '호라티아', '아비투스', '케레세이라', '페이디피데스', '카산드라', '칸델라 산체스', '에르네스토', '테레시아', '네츠살렘', '로흐시니', '에블라나', '아일릴', '라브리타흐', '아델 나우만', '텍사스', '모레티', '라플란드', '엑시아', '아미야'];
for (const [k, L] of Object.entries(langs)) {
  const all = [...(L.m || []), ...(L.f || []), ...(L.s || [])];
  for (const n of all) {
    for (const b of BANNED) if (n === b || n.includes(b) && b.length >= 3) err(`names.langs[${k}]: 실제 캐릭터 이름 의심 '${n}' (금지어 '${b}')`);
  }
}

// ---------- stats1950 ----------
const stats = statsDoc.countries || {};
const STAT_KEYS = ['le', 'leM', 'leF', 'u5', 'imr', 'ppp', 'gini', 'urb', 'tfr'];
function checkStatRow(row, w) {
  for (const k of STAT_KEYS) {
    const cell = row[k];
    if (!cell || !isNum(cell.value)) { err(`${w}: ${k}.value 누락`); continue; }
    if (!isStr(cell.source)) err(`${w}: ${k}.source 누락`);
    if (cell.estimated !== undefined && typeof cell.estimated !== 'boolean') err(`${w}: ${k}.estimated 는 boolean`);
    if (/추정/.test(cell.source) && cell.estimated !== true) err(`${w}: ${k} 출처가 추정인데 estimated:true 표시 없음`);
  }
  if (row.le && row.leM && row.leF && isNum(row.le.value)) {
    const mid = (row.leM.value + row.leF.value) / 2;
    if (Math.abs(mid - row.le.value) > 3) warn(`${w}: le(${row.le.value}) 가 남/여 평균(${mid.toFixed(1)}) 과 3년 이상 차이`);
  }
  if (row.u5 && row.imr && isNum(row.u5.value) && isNum(row.imr.value) && row.imr.value > row.u5.value) err(`${w}: imr > u5`);
  if (row.u5 && !inRange(row.u5.value, 0, 1)) err(`${w}: u5 는 0~1 확률`);
  if (row.gini && !inRange(row.gini.value, 0.15, 0.75)) err(`${w}: gini 범위 이상`);
  if (row.urb && !inRange(row.urb.value, 0, 100)) err(`${w}: urb 는 0~100`);
}
for (const [iso, row] of Object.entries(stats)) {
  if (!/^[A-Z]{3}$/.test(iso)) err(`stats1950.countries: 키 '${iso}' 는 ISO3 아님`);
  checkStatRow(row, `stats1950[${iso}]`);
}
for (const [k, row] of Object.entries(statsDoc.custom || {})) {
  checkStatRow(row, `stats1950.custom[${k}]`);
  if (row.estimated !== true) err(`stats1950.custom[${k}]: estimated:true 필요`);
}

// ---------- nations ----------
const nations = nationsDoc.nations || [];
const nationIds = uniqueIds(nations, 'nations');
const POLICIES = nationsDoc._meta?.policyEnum || ['persecute', 'quarantine', 'euthanasia', 'neglect', 'insurance', 'expel', 'ignore', 'treat'];
const CONSCRIPT = nationsDoc._meta?.conscriptEnum || ['none', 'draft', 'volunteer', 'mandatory'];
const allThreats = new Set();
let shareSum = 0;
if (nations.length !== 21) err(`nations: 21개여야 함 (현재 ${nations.length})`);
for (const n of nations) {
  const w = `nations[${n.id}]`;
  need(n, 'id', isStr, w); need(n, 'name', isStr, w); need(n, 'blurb', isStr, w); need(n, 'nameLang', isStr, w);
  need(n, 'share', (x) => inRange(x, 0, 100), w);
  shareSum += n.share || 0;
  if (n.parent && !nationIds.has(n.parent)) err(`${w}: parent '${n.parent}' 없음`);
  if (!Array.isArray(n.model)) err(`${w}: model 배열 필요`);
  else {
    for (const iso of n.model) if (!stats[iso]) err(`${w}: model '${iso}' 가 stats1950 에 없음`);
    if (n.model.length === 0) {
      if (!n.custom || !(statsDoc.custom || {})[n.custom]) err(`${w}: model 이 비었는데 custom 통계 키가 없음`);
    }
  }
  if (!n.statMul || !['le', 'u5', 'ppp', 'gini', 'urb'].every((k) => inRange(n.statMul[k], 0.1, 5))) err(`${w}: statMul {le,u5,ppp,gini,urb} 오류`);
  if (!POLICIES.includes(n.policy)) err(`${w}: policy '${n.policy}' enum 아님`);
  if (n.policyVariants) for (const v of n.policyVariants) { if (!POLICIES.includes(v.policy)) err(`${w}: policyVariants policy '${v.policy}' enum 아님`); if (!isStr(v.when)) err(`${w}: policyVariants.when 누락`); }
  for (const k of ['oriExp', 'catFreq', 'conflict']) if (![1, 2, 3].includes(n[k])) err(`${w}: ${k} 는 1~3 정수`);
  need(n, 'nomadic', (x) => inRange(x, 0, 1), w);
  if (typeof n.seaborn !== 'boolean') err(`${w}: seaborn boolean`);
  if (typeof n.collapsal !== 'boolean') err(`${w}: collapsal boolean`);
  if (!CONSCRIPT.includes(n.conscript)) err(`${w}: conscript '${n.conscript}' enum 아님`);
  if (typeof n.canon !== 'boolean') err(`${w}: canon boolean`);
  // races
  if (!n.races || typeof n.races !== 'object' || Object.keys(n.races).length === 0) err(`${w}: races 비어 있음`);
  else {
    let rs = 0;
    for (const [rid, wt] of Object.entries(n.races)) {
      if (!raceIds.has(rid)) err(`${w}: races 종족 '${rid}' 없음`);
      if (!inRange(wt, 0, 100)) err(`${w}: races['${rid}'] 가중치 오류`);
      rs += wt;
      const race = races.find((r) => r.id === rid);
      if (race?.rare && wt > 0.5) err(`${w}: rare 종족 '${rid}' 가중치 ${wt} > 0.5`);
    }
    if (Math.abs(rs - 100) > 3) warn(`${w}: races 가중치 합 ${rs.toFixed(2)} (100 권장)`);
  }
  // jobs
  if (!Array.isArray(n.jobs)) err(`${w}: jobs 배열 필요`);
  else for (const jid of n.jobs) {
    if (!jobIds.has(jid)) { err(`${w}: jobs '${jid}' 가 jobs.json 에 없음`); continue; }
    const j = jobs.find((x) => x.id === jid);
    if (j.only && !j.only.includes(n.id)) err(`${w}: jobs '${jid}' 는 only=${JSON.stringify(j.only)} 라 이 국가에서 제안 불가`);
  }
  // 세계관 내 기록 기관·문화(W4a). 각주와 출생 신고서가 치환해 쓰므로 필수
  need(n, 'statOrg', isStr, w);
  if (!n.culture || typeof n.culture !== 'object') err(`${w}: culture 객체 필요`);
  else {
    if (!Array.isArray(n.culture.festivals) || n.culture.festivals.length < 1 || !n.culture.festivals.every(isStr)) err(`${w}: culture.festivals 는 명절 1개 이상`);
    for (const k of ['greet', 'address', 'elder', 'food', 'ruler', 'rulerTitle', 'drink']) need(n.culture, k, isStr, `${w}.culture`);
  }
  if (/추정|임시|시뮬레이션|1950|신뢰구간/.test(n.blurb)) err(`${w}: blurb 에 D25 금지 문구`);
  if (!Array.isArray(n.threats) || n.threats.length === 0) err(`${w}: threats 비어 있음`);
  else n.threats.forEach((t) => allThreats.add(t));
  if (!langs[n.nameLang]) err(`${w}: nameLang '${n.nameLang}' 가 names.json 에 없음`);
  const mapped = namesDoc._meta?.nationLang?.[n.id];
  if (mapped && mapped !== n.nameLang) err(`${w}: nameLang '${n.nameLang}' 와 names._meta.nationLang '${mapped}' 불일치`);
}
if (Math.abs(shareSum - 100) > 0.5) err(`nations: share 합 ${shareSum.toFixed(2)} (100±0.5 필요)`);
// only 가 걸린 직업은 어느 국가 jobs 에든 등장해야 함(고아 방지)
for (const j of jobs) if (j.only) {
  for (const nid of j.only) if (!nationIds.has(nid)) err(`jobs[${j.id}]: only 국가 '${nid}' 없음`);
  if (!nations.some((n) => n.jobs.includes(j.id))) warn(`jobs[${j.id}]: only 직업인데 어느 국가 jobs 에도 없음`);
}
// races.home 참조
for (const r of races) for (const h of r.home || []) if (!nationIds.has(h)) err(`races[${r.id}]: home '${h}' 국가 없음`);
// causes.tags 참조
for (const c of causes) for (const t of c.tags) {
  if (t.startsWith('nation:')) { if (!nationIds.has(t.slice(7))) err(`causes[${c.id}]: tag '${t}' 국가 없음`); }
  else if (t.startsWith('threat:')) { if (!allThreats.has(t.slice(7))) err(`causes[${c.id}]: tag '${t}' 가 어느 국가 threats 에도 없음`); }
  else if (t.startsWith('trait:')) { if (!traitKeys.has(t.slice(6))) err(`causes[${c.id}]: tag '${t}' trait 없음`); }
  else if (t.startsWith('pos:')) { if (!/^pos:(A([1-9]|1[0-2])|noble|high)$/.test(t)) err(`causes[${c.id}]: tag '${t}' pos: 값 미정의(A1~A12·noble·high)`); }   // W12(D51-6)
  else if (!['infected', 'female', 'male'].includes(t)) err(`causes[${c.id}]: tag '${t}' 형식 미정의`);
}
// ethnicFlags
for (const [k, f] of Object.entries(nationsDoc.ethnicFlags || {})) {
  if (f.nation && !nationIds.has(f.nation)) err(`ethnicFlags[${k}]: nation '${f.nation}' 없음`);
  if (f.nameLang && !langs[f.nameLang]) err(`ethnicFlags[${k}]: nameLang '${f.nameLang}' 없음`);
}

// =====================================================================
// W8 (v0.3 진로·소속): data/tracks/*.json, affiliations, relations, marriage, housing, rhodes, canon_figures
// =====================================================================
const W8 = { tracks: 0, affs: 0, figures: 0, relPairs: 0, marriageTypes: 0, housingTypes: 0 };
(function validateW8() {
  const TRACK_NATIONS = new Set([...nationIds, 'rhodes', 'common']);
  const tracksDir = path.join(DATA, 'tracks');
  if (!fs.existsSync(tracksDir)) { err('tracks/: 폴더 없음'); return; }
  const files = fs.readdirSync(tracksDir).filter((f) => f.endsWith('.json')).sort();
  const expectFiles = [...nationIds].map((n) => `${n}.json`).concat(['rhodes.json', 'common.json']);
  for (const f of expectFiles) if (!files.includes(f)) err(`tracks/${f}: 파일 없음`);
  const tracks = [];
  let fallDeath = null, fallDefault = null;
  for (const f of files) {
    const doc = load(`tracks/${f}`);
    if (!doc) continue;
    if (!doc._meta || !isStr(doc._meta.nation)) err(`tracks/${f}: _meta.nation 누락`);
    if (doc._meta && doc._meta.fallDeathCause) fallDeath = doc._meta.fallDeathCause;
    if (doc._meta && doc._meta.fallDefaultOutcome) fallDefault = doc._meta.fallDefaultOutcome;
    if (!Array.isArray(doc.tracks)) { err(`tracks/${f}: tracks 배열 없음`); continue; }
    for (const t of doc.tracks) tracks.push({ ...t, _file: f });
  }
  if (!fallDeath) err('tracks/common.json: _meta.fallDeathCause 누락(§11.4 사인 매핑)');
  if (!fallDefault) err('tracks/common.json: _meta.fallDefaultOutcome 누락');
  const knownCauses = new Set([...Object.keys(fallDefault || {}), ...Object.keys(fallDeath || {})]);
  for (const [c, cid] of Object.entries(fallDeath || {})) if (!causeIds.has(cid)) err(`tracks/common _meta.fallDeathCause['${c}'] = '${cid}' 가 causes.json 에 없음`);
  const trackIds = uniqueIds(tracks, 'tracks');
  W8.tracks = tracks.length;
  if (tracks.length < 271 || tracks.length > 281) err(`tracks: 276±5 개여야 함 (현재 ${tracks.length})`);

  const affDoc = load('affiliations.json');
  const affs = (affDoc && affDoc.affiliations) || [];
  const affIds = uniqueIds(affs, 'affiliations');
  const affById = Object.fromEntries(affs.map((a) => [a.id, a]));
  const figDoc = load('canon_figures.json');
  const figures = (figDoc && figDoc.figures) || [];
  const figIds = uniqueIds(figures, 'canon_figures');
  const relDoc = load('relations.json');
  const marDoc = load('marriage.json');
  const houDoc = load('housing.json');
  const rhoDoc = load('rhodes.json');

  const EXIT_RE = /^(death(:[a-z_]+)?|prison:(jail|camp)|exile|demote|expel|injured|infected|disgrace|arena:[A-Z0-9_]+)$/;
  const GATE_KEYS = new Set(['cap', 'born', 'min', 'max', 'weight', 'status', 'rel', 'race', 'only', 'sex', 'year', 'urban', 'infected', 'region', 'eth', 'newcomer', 'papers', 'note']);
  const CAPS = ['skill', 'learn', 'arts', 'ties', 'looks'];
  const REL_RE = /^(<=|>=|<|>|=)?(exclude|institutional|cultural|subtle|neutral|favored)$/;
  const classSum = {};  // nation → q → sum
  const regionsByNation = {};
  for (const t of tracks) {
    const w = `tracks/${t._file}[${t.id}]`;
    need(t, 'id', isStr, w); need(t, 'name', isStr, w);
    if (!TRACK_NATIONS.has(t.nation)) err(`${w}: nation '${t.nation}' 없음`);
    if (t._file !== `${t.nation}.json`) err(`${w}: 파일명과 nation 불일치`);
    if (!/^A([1-9]|1[0-2])$/.test(t.archetype)) err(`${w}: archetype '${t.archetype}' (A1~A12)`);
    if (typeof t.canon !== 'boolean') err(`${w}: canon boolean`);
    if (typeof t.itinerant !== 'boolean') err(`${w}: itinerant boolean`);
    if (t.itinerant && t.route != null) { if (!Array.isArray(t.route)) err(`${w}: route 배열`); else for (const r of t.route) if (!TRACK_NATIONS.has(r)) err(`${w}: route '${r}' 국가 없음`); }
    if (t.region != null) { if (!isStr(t.region)) err(`${w}: region 문자열`); else (regionsByNation[t.nation] = regionsByNation[t.nation] || new Set()).add(t.region); }
    if (t.oriPolicyOverride != null && !isStr(t.oriPolicyOverride)) err(`${w}: oriPolicyOverride 문자열|null`);
    // entry
    const e = t.entry || {};
    if (!Array.isArray(e.ages) || e.ages.length !== 2 || !inRange(e.ages[0], 0, 100) || e.ages[0] > e.ages[1]) err(`${w}: entry.ages`);
    const cls = e.classes || {};
    let tsum = 0;
    for (const [q, v] of Object.entries(cls)) {
      if (!/^q[1-5]$/.test(q)) err(`${w}: classes 키 '${q}'`);
      if (!inRange(v, 0, 1)) err(`${w}: classes['${q}'] 범위`);
      tsum += v;
      const cs = (classSum[t.nation] = classSum[t.nation] || {});
      cs[q] = (cs[q] || 0) + v;
    }
    if (tsum > 1 + 1e-6) err(`${w}: 진로 안 classes 합 ${tsum.toFixed(3)} > 1`);
    if (!Object.keys(cls).length && !t.forced && !['rhodes', 'common'].includes(t.nation) && !(t.note || '').includes('classes 없음')) warn(`${w}: classes 비어 있음(전환 전용이면 note 에 'classes 없음' 명시)`);
    if (!Array.isArray(e.gates)) err(`${w}: entry.gates 배열`);
    else for (const g of e.gates) {
      for (const k of Object.keys(g)) if (!GATE_KEYS.has(k)) err(`${w}: gate 키 '${k}' 미정의`);
      if (g.cap && (!CAPS.includes(g.cap) || !isNum(g.min))) err(`${w}: gate cap '${g.cap}' 또는 min 오류`);
      if (g.born && (!['looks', 'luck'].includes(g.born) || !isNum(g.min))) err(`${w}: gate born`);
      if (g.race) { for (const r of g.race) if (!raceIds.has(r)) err(`${w}: gate race '${r}' 없음`); if (!g.only && !isNum(g.weight)) err(`${w}: gate race 는 weight 또는 only:true`); }
      if (g.rel && !REL_RE.test(g.rel)) err(`${w}: gate rel '${g.rel}'`);
      if (g.year && (!Array.isArray(g.year) || g.year.length !== 2 || g.year[0] > g.year[1])) err(`${w}: gate year`);
      if (g.sex && !['M', 'F'].includes(g.sex)) err(`${w}: gate sex`);
      if (g.eth && !(nationsDoc.ethnicFlags || {})[g.eth]) err(`${w}: gate eth '${g.eth}' 가 ethnicFlags 에 없음`);
      if (g.weight != null && !inRange(g.weight, 0, 100)) err(`${w}: gate weight`);
    }
    if (!Array.isArray(e.via) || !e.via.length || !e.via.every(isStr)) err(`${w}: entry.via 문자열 배열(1개 이상)`);
    // stages
    const st = Array.isArray(t.stages) ? t.stages : [];
    if (st.length < 2 || st.length > 6) err(`${w}: stages ${st.length}개 (2~6)`);
    const sids = new Set();
    st.forEach((s, i) => {
      const sw = `${w}:${s.id}`;
      if (!isStr(s.id) || !isStr(s.name)) err(`${sw}: id/name`);
      if (sids.has(s.id)) err(`${sw}: stage id 중복`); sids.add(s.id);
      if (s.title != null && !isStr(s.title)) err(`${sw}: title 문자열|null`);
      if (!inRange(s.minYears, 0, 60)) err(`${sw}: minYears`);
      const last = i === st.length - 1;
      if (last) { if (s.promo !== null) err(`${sw}: 마지막 단계 promo 는 null`); }
      else {
        if (!s.promo || !CAPS.includes(s.promo.cap) || !inRange(s.promo.k, 0.01, 0.25)) err(`${sw}: promo {cap, k 0.01~0.25}`);
        else if (s.promo.requires && typeof s.promo.requires !== 'object') err(`${sw}: promo.requires 객체`);
      }
      if (!s.fall || !inRange(s.fall.base, 0.01, 0.08)) err(`${sw}: fall.base 0.01~0.08`);
      if (!s.fall || !Array.isArray(s.fall.causes) || !s.fall.causes.length) err(`${sw}: fall.causes 1개 이상`);
      else for (const c of s.fall.causes) if (!knownCauses.has(c) && !(t.exits && t.exits.fall && t.exits.fall[c])) err(`${sw}: 몰락 원인 '${c}' 미정의`);
      if (s.canon != null && s.canon !== false) err(`${sw}: canon 은 false 일 때만 적는다`);
      if (s.oriMul != null && !inRange(s.oriMul, 0, 20)) err(`${sw}: oriMul`);
    });
    // income
    if (!t.income || !Array.isArray(t.income.stage)) err(`${w}: income.stage 배열`);
    else {
      if (t.income.stage.length !== st.length) err(`${w}: income.stage 길이 ${t.income.stage.length} ≠ stages ${st.length}`);
      if (!t.income.stage.every((x) => inRange(x, 0, 100))) err(`${w}: income.stage 값 0~100`);
      if (t.income.job != null && !jobIds.has(t.income.job)) err(`${w}: income.job '${t.income.job}' jobs.json 에 없음`);
      if (t.archetype === 'A11' && !t.income.job && t.nation !== 'rhodes') warn(`${w}: A11 생업인데 income.job 없음`);
    }
    if (!t.standing || !isStr(t.standing.name) || !inRange(t.standing.start, 0, 100)) err(`${w}: standing {name, start}`);
    // affiliations
    if (!Array.isArray(t.affiliations)) err(`${w}: affiliations 배열`);
    else {
      for (const a of t.affiliations) { if (!affIds.has(a)) err(`${w}: affiliation '${a}' 없음`); else if (affById[a].track !== t.id) err(`${w}: affiliation '${a}' 의 track 이 ${affById[a].track}`); }
      if (!t.affiliations.length) warn(`${w}: 소속 변주 없음`);
    }
    // exits
    const ex = t.exits || {};
    if (ex.retire != null) { if (!inRange(ex.retire.age, 10, 120) || !isStr(ex.retire.to)) err(`${w}: exits.retire {age, to}`); else if (!trackIds.has(ex.retire.to)) err(`${w}: exits.retire.to '${ex.retire.to}' 없음`); }
    if (!ex.fall || typeof ex.fall !== 'object') err(`${w}: exits.fall 객체`);
    else {
      const used = new Set(st.flatMap((s) => (s.fall && s.fall.causes) || []));
      for (const c of used) if (!ex.fall[c]) err(`${w}: exits.fall['${c}'] 없음(단계 fall.causes 전부 결과 필요)`);
      for (const [c, v] of Object.entries(ex.fall)) {
        if (!isStr(v) || !EXIT_RE.test(v)) err(`${w}: exits.fall['${c}'] = ${JSON.stringify(v)} (§3.5 사전 밖)`);
        else if (v.startsWith('death:') && !causeIds.has(v.slice(6))) err(`${w}: exits.fall['${c}'] 사인 '${v.slice(6)}' 없음`);
        else if (v === 'death' && !(fallDeath || {})[c]) err(`${w}: exits.fall['${c}']=death 인데 fallDeathCause 에 '${c}' 매핑 없음`);
        else if (v.startsWith('arena:') && !trackIds.has(v.slice(6))) err(`${w}: arena 대상 '${v.slice(6)}' 없음`);
      }
    }
    if (!Array.isArray(ex.switch)) err(`${w}: exits.switch 배열`);
    else for (const s of ex.switch) { if (!trackIds.has(s)) err(`${w}: switch '${s}' 없음`); if (s === t.id) err(`${w}: switch 가 자기 자신`); }
    if (!Array.isArray(t.canonFigures)) err(`${w}: canonFigures 배열`);
    else for (const f of t.canonFigures) { if (!figIds.has(f)) err(`${w}: canonFigures '${f}' 없음`); }
    if (t.forced != null && typeof t.forced !== 'object') err(`${w}: forced 객체`);
  }
  for (const [n, cs] of Object.entries(classSum)) for (const [q, s] of Object.entries(cs)) if (s > 1 + 1e-6) err(`tracks/${n}: 계층 ${q} 유입 합 ${s.toFixed(3)} > 1`);
  for (const n of nationIds) {
    const own = tracks.filter((t) => t.nation === n);
    if (own.length < 8) err(`tracks/${n}: 진로 ${own.length}개 (국가당 8개 이상, D40)`);
    if (!own.some((t) => t.archetype === 'A11')) err(`tracks/${n}: A11 생업 진로 없음`);
    const scale = (load(`tracks/${n}.json`) || {})._meta?.classScale;
    for (const q of ['q1', 'q2', 'q3', 'q4', 'q5']) { const s = (classSum[n] || {})[q] || 0; if (s <= 0) err(`tracks/${n}: 계층 ${q} 유입 합 0`); else if (scale && Math.abs(s - scale) > 0.02) warn(`tracks/${n}: 계층 ${q} 유입 합 ${s.toFixed(3)} ≠ classScale ${scale}`); }
  }
  // ---------- affiliations ----------
  W8.affs = affs.length;
  const TAGS = new Set((affDoc && affDoc._meta && affDoc._meta.tagEnum) || ['major', 'minor', 'elite']);
  const affSum = {};
  for (const a of affs) {
    const w = `affiliations[${a.id}]`;
    need(a, 'id', isStr, w); need(a, 'name', isStr, w);
    if (!trackIds.has(a.track)) err(`${w}: track '${a.track}' 없음`);
    if (typeof a.canon !== 'boolean') err(`${w}: canon boolean`);
    if (!inRange(a.weight, 0, 1)) err(`${w}: weight 0~1`);
    affSum[a.track] = (affSum[a.track] || 0) + (a.weight || 0);
    if (!a.mods || typeof a.mods !== 'object') err(`${w}: mods 객체`);
    else {
      for (const k of ['promo', 'fall', 'income']) { if (!isNum(a.mods[k])) err(`${w}: mods.${k} 숫자`); else if (a.mods[k] < 0.5 || a.mods[k] > 2.0) err(`${w}: mods.${k} ${a.mods[k]} (0.5~2.0)`); else if (a.mods[k] < 0.7 || a.mods[k] > 1.3) warn(`${w}: mods.${k} ${a.mods[k]} 가 ±30% 밖`); }
      if (!inRange(a.mods.standingStart, -50, 50)) err(`${w}: mods.standingStart`);
    }
    if (!Array.isArray(a.tags) || !a.tags.length) err(`${w}: tags 1개 이상`); else for (const tg of a.tags) if (!TAGS.has(tg)) err(`${w}: tag '${tg}' enum 아님`);
    if (a.events != null && !isStr(a.events)) err(`${w}: events 문자열`);
  }
  for (const [tid, s] of Object.entries(affSum)) if (Math.abs(s - 1) > 0.02) err(`affiliations: track ${tid} weight 합 ${s.toFixed(2)} (1 필요)`);
  // 단계 requires.aff 태그가 그 진로 소속에 존재하는지
  for (const t of tracks) for (const s of t.stages || []) if (s.promo && s.promo.requires && s.promo.requires.aff) {
    const tag = s.promo.requires.aff;
    if (!(t.affiliations || []).some((a) => affById[a] && affById[a].tags.includes(tag))) err(`tracks/${t._file}[${t.id}]:${s.id}: requires.aff '${tag}' 태그를 가진 소속 없음`);
  }
  // ---------- canon_figures ----------
  W8.figures = figures.length;
  if (figures.length < 40 || figures.length > 80) err(`canon_figures: 40~80명이어야 함 (현재 ${figures.length})`);
  for (const f of figures) {
    const w = `canon_figures[${f.id}]`;
    need(f, 'id', isStr, w); need(f, 'name', isStr, w); need(f, 'line', isStr, w);
    if (!TRACK_NATIONS.has(f.nation)) err(`${w}: nation '${f.nation}' 없음`);
    if (!Array.isArray(f.years) || f.years.length !== 2 || !inRange(f.years[0], 900, 1300) || f.years[0] > f.years[1]) err(`${w}: years [y0, y1]`);
    if (!Array.isArray(f.tracks) || !f.tracks.length) err(`${w}: tracks 1개 이상`); else for (const tid of f.tracks) if (!trackIds.has(tid)) err(`${w}: track '${tid}' 없음`);
    if (isStr(f.line) && isStr(f.name) && f.name.length >= 2 && f.line.includes(f.name)) err(`${w}: line 에 이름이 들어 있음(D43)`);
    if (isStr(f.line) && /추정|임시|시뮬|1950|창작|캐논/.test(f.line)) err(`${w}: line 에 D25 금지 문구`);
    if (f.stage != null && !isStr(f.stage)) err(`${w}: stage 문자열`);
  }
  // ---------- relations ----------
  if (relDoc) {
    const G = relDoc.grades || [];
    if (JSON.stringify(G) !== JSON.stringify(['exclude', 'institutional', 'cultural', 'subtle', 'neutral', 'favored'])) err('relations: grades 가 §9 순서와 다름');
    if (!G.includes(relDoc.default)) err('relations: default 등급 오류');
    const sd = relDoc.sarkaz_default || {};
    if (!G.includes(sd.grade)) err('relations: sarkaz_default.grade');
    for (const [k, v] of Object.entries(sd.by || {})) { if (k.endsWith('_since')) { if (!isNum(v)) err(`relations: sarkaz_default.by.${k} 연도`); continue; } if (!TRACK_NATIONS.has(k)) err(`relations: sarkaz_default.by 국가 '${k}' 없음`); if (!G.includes(v)) err(`relations: sarkaz_default.by.${k} 등급 '${v}'`); }
    const pairs = relDoc.pairs || [];
    W8.relPairs = pairs.length + (relDoc.ethPairs || []).length;
    if (pairs.length < 20 || pairs.length + (relDoc.ethPairs || []).length > 40) err(`relations: 20~40쌍이어야 함 (현재 ${W8.relPairs})`);
    const seenPair = new Set();
    for (const p of pairs.concat(relDoc.ethPairs || [])) {
      const key = `${p.nation}×${p.race || 'eth:' + p.eth}${p.scope ? '@' + p.scope : ''}`;
      const w = `relations[${key}]`;
      if (seenPair.has(key)) err(`${w}: 중복`); seenPair.add(key);
      if (!nationIds.has(p.nation)) err(`${w}: 국가 없음`);
      if (p.race != null) { if (!raceIds.has(String(p.race).replace(/^!/, ''))) err(`${w}: 종족 없음`); }
      else if (p.eth != null) { if (!(nationsDoc.ethnicFlags || {})[p.eth]) err(`${w}: eth '${p.eth}' 없음`); }
      else err(`${w}: race 또는 eth 필요`);
      if (!G.includes(p.grade)) err(`${w}: 등급 '${p.grade}'`);
      if (!(p.canon === true || p.canon === 'partial')) err(`${w}: canon 은 true|'partial'(근거 없는 쌍은 기입 금지, D49)`);
      if (!isStr(p.note)) err(`${w}: note(근거) 필수`);
      if (p.since != null && !isNum(p.since)) err(`${w}: since 연도`);
      if (p.scope != null && !/^track:[A-Z0-9_]+$/.test(p.scope)) err(`${w}: scope 형식`); else if (p.scope && !trackIds.has(p.scope.slice(6))) err(`${w}: scope 진로 없음`);
    }
    const must = [['laterano', 'sarkaz', 'exclude'], ['kazdel', 'sankta', 'exclude'], ['iberia', 'aegir', 'institutional'], ['higashi', 'oni', 'cultural']];
    for (const [n, r, g] of must) if (!pairs.some((p) => p.nation === n && p.race === r && p.grade === g)) err(`relations: D49 필수 쌍 ${n}×${r}=${g} 없음`);
  }
  // ---------- marriage / housing ----------
  const checkTypes = (doc, name, minT, maxT) => {
    if (!doc) return;
    for (const n of nationIds) {
      const sec = doc[n];
      if (!sec || !Array.isArray(sec.types)) { err(`${name}: 국가 '${n}' 없음`); continue; }
      const ids = new Set();
      const nonForced = sec.types.filter((t) => !t.forced && !(t.req && t.req.infected));
      if (nonForced.length < minT || nonForced.length > maxT) err(`${name}[${n}]: 유형 ${nonForced.length}개 (${minT}~${maxT})`);
      let ws = 0;
      for (const t of sec.types) {
        const w = `${name}[${n}:${t.id}]`;
        need(t, 'id', isStr, w); need(t, 'name', isStr, w);
        if (ids.has(t.id)) err(`${w}: id 중복`); ids.add(t.id);
        if (!inRange(t.w, 0, 1)) err(`${w}: w 0~1`); ws += t.w || 0;
        if (t.req) {
          for (const tid of t.req.track || []) if (!trackIds.has(tid)) err(`${w}: req.track '${tid}' 없음`);
          if (t.req.eth && !(nationsDoc.ethnicFlags || {})[t.req.eth]) err(`${w}: req.eth 없음`);
          for (const k of Object.keys(t.req)) if (!['track', 'urban', 'nomadic', 'status', 'infected', 'eth', 'migrant', 'region', 'income', 'money', 'q'].includes(k)) err(`${w}: req 키 '${k}' 미정의`);
        }
        if (t.region != null && !isStr(t.region)) err(`${w}: region 문자열`);
        if (t.since != null && !isNum(t.since)) err(`${w}: since`);
        if (t.until != null && !isNum(t.until)) err(`${w}: until`);
        if (!(t.canon === true || t.canon === false || t.canon === 'partial')) err(`${w}: canon true|false|'partial'`);
        if (name === 'marriage') {
          if (!Array.isArray(t.age) || t.age.length !== 2 || t.age[0] > t.age[1] || !inRange(t.age[0], 12, 60)) err(`${w}: age [min,max]`);
          if (!isNum(t.dowry) || t.dowry < -10 || t.dowry > 10) err(`${w}: dowry 숫자`);
          if (t.poly != null && typeof t.poly !== 'boolean') err(`${w}: poly boolean`);
          if (t.polyReq && !inRange(t.polyReq.income, 0, 100)) err(`${w}: polyReq.income`);
          W8.marriageTypes++;
        } else {
          if (!inRange(t.cost, 0, 2)) err(`${w}: cost 0~2(중위소득 배율)`);
          if (t.own && !inRange(t.price, 0, 100)) err(`${w}: own 이면 price(중위소득 배율) 필요`);
          if (t.forced) {
            for (const k of Object.keys(t.forced)) if (!['oriPolicy', 'known', 'prison', 'res', 'track', 'archetype', 'stageMax', 'stageMin', 'papers'].includes(k)) err(`${w}: forced 키 '${k}' 미정의`);
            for (const tid of t.forced.track || []) if (!trackIds.has(tid)) err(`${w}: forced.track '${tid}' 없음`);
            for (const p of t.forced.oriPolicy || []) if (!POLICIES.includes(p)) err(`${w}: forced.oriPolicy '${p}'`);
          }
          W8.housingTypes++;
        }
      }
      if (Math.abs(ws - 1) > 0.02) warn(`${name}[${n}]: w 합 ${ws.toFixed(2)} (1 권장)`);
      // 감염자 전용 유형은 격리·박해 정책 국가에 있어야 함(marriage)
      if (name === 'marriage') { const nat = nations.find((x) => x.id === n); const pol = [nat.policy].concat((nat.policyVariants || []).map((v) => v.policy)); if (pol.some((p) => ['quarantine', 'euthanasia', 'persecute'].includes(p)) && !sec.types.some((t) => t.req && t.req.infected)) warn(`marriage[${n}]: 격리·박해 정책 국가인데 감염자 전용 유형 없음`); }
    }
    for (const k of Object.keys(doc)) if (!k.startsWith('_') && !nationIds.has(k)) err(`${name}: 알 수 없는 키 '${k}'`);
  };
  checkTypes(marDoc, 'marriage', 2, 4);
  checkTypes(houDoc, 'housing', 2, 5);
  if (houDoc && (!houDoc._default || !Array.isArray(houDoc._default.types))) err('housing: _default.types(공통 강제 유형) 필요');
  else if (houDoc) for (const id of ['quarantine', 'camp', 'ship_cabin']) if (!houDoc._default.types.some((t) => t.id === id)) err(`housing._default: '${id}' 강제 유형 없음`);
  // ---------- rhodes ----------
  if (rhoDoc) {
    const VIA = ['volunteer', 'referral', 'treatment', 'rescue', 'agreement', 'companion', 'flight', 'transfer', 'babel'];
    const entries = rhoDoc.entries || [];
    const vias = entries.map((e) => e.via);
    for (const v of VIA) if (!vias.includes(v)) err(`rhodes.entries: via '${v}' 없음`);
    if (new Set(vias).size !== vias.length) err('rhodes.entries: via 중복');
    for (const e of entries) {
      const w = `rhodes.entries[${e.via}]`;
      if (!VIA.includes(e.via)) err(`${w}: via enum 아님`);
      if (!inRange(e.p, 0, 1)) err(`${w}: p 0~1`);
      if (!['common', 'rare', 'very_rare'].includes(e.rarity)) err(`${w}: rarity`);
      need(e, 'line', isStr, w); need(e, 'tag', isStr, w);
      for (const tid of e.tracks || []) if (!trackIds.has(tid)) err(`${w}: track '${tid}' 없음`);
      if (e.nation && !nationIds.has(e.nation)) err(`${w}: nation 없음`);
      if (e.cap) for (const [k, v] of Object.entries(e.cap)) if (!CAPS.includes(k) || !isNum(v)) err(`${w}: cap`);
      if (e.policies) for (const p of e.policies) if (!POLICIES.includes(p)) err(`${w}: policies '${p}'`);
    }
    const DEPTS = ['field', 'medical', 'engineer', 'logistics', 'hr', 'purchase', 'office'];
    if (!Array.isArray(rhoDoc.depts) || !DEPTS.every((d) => rhoDoc.depts.includes(d))) err('rhodes.depts: 7개 부서 id 배열 필요');
    for (const d of rhoDoc.deptInfo || []) if (!trackIds.has(d.track)) err(`rhodes.deptInfo[${d.id}]: track '${d.track}' 없음`);
    for (const r of (rhoDoc.statusRules || {}).rules || []) { if (!['operator', 'contractor', 'patient'].includes(r.status)) err(`rhodes.statusRules: status '${r.status}'`); if (r.track && !trackIds.has(r.track)) err(`rhodes.statusRules: track '${r.track}' 없음`); if (r.laborFor && !trackIds.has(r.laborFor)) err(`rhodes.statusRules: laborFor 없음`); }
    if (!Array.isArray(rhoDoc.ports) || rhoDoc.ports.length < 8 || rhoDoc.ports.length > 12) err(`rhodes.ports: 8~12개국 (현재 ${(rhoDoc.ports || []).length})`);
    else for (const p of rhoDoc.ports) if (!nationIds.has(p)) err(`rhodes.ports: '${p}' 국가 없음`);
    const pw = (rhoDoc.portWeights || {}).weights || {};
    const pws = Object.values(pw).reduce((a, b) => a + b, 0);
    if (Math.abs(pws - 1) > 0.02) err(`rhodes.portWeights 합 ${pws.toFixed(2)}`);
    for (const k of Object.keys(pw)) if (!(rhoDoc.ports || []).includes(k)) err(`rhodes.portWeights: '${k}' 가 ports 에 없음`);
    for (const n of (rhoDoc.portWeights || {}).offices || []) if (!nationIds.has(n)) err(`rhodes.portWeights.offices '${n}'`);
    for (const c of rhoDoc.closed || []) {
      if (c.nation && !nationIds.has(c.nation)) err(`rhodes.closed: 국가 '${c.nation}' 없음`);
      for (const tid of c.tracks || []) if (!trackIds.has(tid)) err(`rhodes.closed: track '${tid}' 없음`);
      if (c.race && !raceIds.has(c.race)) err(`rhodes.closed: race '${c.race}' 없음`);
      if (c.prison && !['camp', 'jail'].includes(c.prison)) err('rhodes.closed: prison');
      if (!isStr(c.note)) err('rhodes.closed: note 필수');
    }
    const tp = (rhoDoc.diagnosis || {}).templates || [];
    if (tp.length !== 6) err(`rhodes.diagnosis.templates: 6종 (현재 ${tp.length})`);
    for (const t of tp) {
      const w = `rhodes.diagnosis[${t.id}]`;
      need(t, 'text', isStr, w);
      if (![0, 1, 2, 3].includes(t.stage)) err(`${w}: stage 0~3`);
      if (!Array.isArray(t.uL) || t.uL.length !== 2 || t.uL[0] > t.uL[1]) err(`${w}: uL [lo, hi]`);
      if (isStr(t.text) && /추정|임시|시뮬|1950|창작|신뢰구간|플레이어|게임/.test(t.text)) err(`${w}: D25 금지 문구`);
      if (isStr(t.text) && !/방사선 검사 결과/.test(t.text)) warn(`${w}: 캐논 프로필 톤 문두('방사선 검사 결과') 아님`);
    }
    const os = (rhoDoc.operatorStats || {}).stats || [];
    if (os.length !== 6) err(`rhodes.operatorStats.stats: 6종 (현재 ${os.length})`);
    if (JSON.stringify((rhoDoc.operatorStats || {}).grades) !== JSON.stringify(['결함', '보통', '표준', '우수', '뛰어남', '탁월'])) err('rhodes.operatorStats.grades: 캐논 6등급');
  }
  // ---------- nations 추가 필드(§7.3, D26) / races.skillApt ----------
  for (const n of nations) {
    const w = `nations[${n.id}]`;
    if (typeof n.refugeeIn !== 'boolean') err(`${w}: refugeeIn boolean`);
    if (!['open', 'hard', 'never'].includes(n.naturalize)) err(`${w}: naturalize open|hard|never`);
    if (!inRange(n.illegalRisk, 0, 1)) err(`${w}: illegalRisk 0~1`);
    if (typeof n.expelsInfected !== 'boolean') err(`${w}: expelsInfected boolean`);
    if (n.expelsInfected !== (n.policy === 'expel')) warn(`${w}: expelsInfected 와 policy(${n.policy}) 불일치`);
    if (!n.mig || typeof n.mig !== 'object' || !Object.keys(n.mig).length) err(`${w}: mig 비어 있음`);
    else {
      let s = 0;
      for (const [k, v] of Object.entries(n.mig)) { if (!nationIds.has(k)) err(`${w}: mig '${k}' 국가 없음`); if (k === n.id) err(`${w}: mig 에 자기 자신`); if (!inRange(v, 0, 1)) err(`${w}: mig['${k}']`); s += v; }
      if (Math.abs(s - 1) > 0.02) err(`${w}: mig 합 ${s.toFixed(2)}`);
    }
    if (!Array.isArray(n.specialTracks)) err(`${w}: specialTracks 배열`);
    else {
      if (!n.specialTracks.length) err(`${w}: specialTracks 비어 있음(D26: 국가 특수 진로 최소 1개)`);
      for (const tid of n.specialTracks) { if (!trackIds.has(tid)) err(`${w}: specialTracks '${tid}' 없음`); else { const t = tracks.find((x) => x.id === tid); if (t.nation !== n.id) err(`${w}: specialTracks '${tid}' 는 ${t.nation} 진로`); if (['A10', 'A11'].includes(t.archetype) || !t.canon) err(`${w}: specialTracks '${tid}' 는 canon:true && 원형≠A10/A11 이어야`); } }
    }
  }
  for (const r of races) if (!inRange(r.skillApt, -2, 2)) err(`races[${r.id}]: skillApt -2~2 (§6.1)`);
  // 하위 지역: 진로 region 값이 policyVariants 의 region 과 어긋나지 않는지(정보용)
  W8.regions = Object.fromEntries(Object.entries(regionsByNation).map(([n, rs]) => [n, [...rs]]));
})();

report();
process.exit(errors.length ? 1 : 0);

function report() {
  const summary = {
    nations: nations?.length, shareSum: +shareSum?.toFixed(2), races: races?.length, jobs: jobs?.length,
    commonJobs: commonJobs?.length, causes: causes?.length, nameLangs: Object.keys(langs || {}).length,
    statCountries: Object.keys(stats || {}).length, statCustom: Object.keys(statsDoc?.custom || {}).length,
    ...(typeof W8 === 'object' ? W8 : {}),
  };
  console.log('요약:', JSON.stringify(summary));
  for (const w of warns) console.log('경고:', w);
  for (const e of errors) console.log('오류:', e);
  console.log(errors.length ? `실패: 오류 ${errors.length}건, 경고 ${warns.length}건` : `통과 (경고 ${warns.length}건)`);
}
