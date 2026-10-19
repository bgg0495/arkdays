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
  else if (!['infected', 'female', 'male'].includes(t)) err(`causes[${c.id}]: tag '${t}' 형식 미정의`);
}
// ethnicFlags
for (const [k, f] of Object.entries(nationsDoc.ethnicFlags || {})) {
  if (f.nation && !nationIds.has(f.nation)) err(`ethnicFlags[${k}]: nation '${f.nation}' 없음`);
  if (f.nameLang && !langs[f.nameLang]) err(`ethnicFlags[${k}]: nameLang '${f.nameLang}' 없음`);
}

report();
process.exit(errors.length ? 1 : 0);

function report() {
  const summary = {
    nations: nations?.length, shareSum: +shareSum?.toFixed(2), races: races?.length, jobs: jobs?.length,
    commonJobs: commonJobs?.length, causes: causes?.length, nameLangs: Object.keys(langs || {}).length,
    statCountries: Object.keys(stats || {}).length, statCustom: Object.keys(statsDoc?.custom || {}).length,
  };
  console.log('요약:', JSON.stringify(summary));
  for (const w of warns) console.log('경고:', w);
  for (const e of errors) console.log('오류:', e);
  console.log(errors.length ? `실패: 오류 ${errors.length}건, 경고 ${warns.length}건` : `통과 (경고 ${warns.length}건)`);
}
