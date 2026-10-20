#!/usr/bin/env node
// 진로 데이터 검증(설계 명세 v1 §3.1): node test/validate-tracks.js [--dummy]
// 검사: id 유일, nation 존재(common·rhodes 허용), archetype A1~A12, stages 2~6, classes 합 ≤ 1, affiliations id 존재,
//       exits 의 retire.to / switch / arena:·switch: id 존재, income.stage 길이 = stages 길이, promo.k 0.01~0.25, fall.base 0~0.08,
//       exits.fall 값 사전(§3.5), gates 키, 소속의 track 존재·weight 합, 혼인·주거·관계·로도스 파일 참조 무결성.
// data/tracks/*.json 이 있으면 그것을, 없으면(또는 --dummy) data/_dummy/tracks.json 을 본다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARCHETYPE_IDS } from '../src/engine/archetypes.js';
import { BALANCE as B } from '../src/engine/balance.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DUMMY = process.argv.includes('--dummy') || process.env.DATA === 'dummy';
const errors = [], warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const pick = (f) => { const real = path.join(ROOT, 'data', f), dum = path.join(ROOT, 'data', '_dummy', f); return !DUMMY && fs.existsSync(real) ? real : (fs.existsSync(dum) ? dum : null); };

// ── 로드 ──
// --dummy 는 v1 파일(진로·소속·혼인·주거·관계·로도스)만 더미로 본다. 국가·종족·직업·사인은 실데이터가 있으면 그것(엔진의 파일별 대체와 같은 규칙)
const base = (f) => { const real = path.join(ROOT, 'data', f); return fs.existsSync(real) ? real : path.join(ROOT, 'data', '_dummy', f); };
const nationsDoc = readJson(base('nations.json'));
const nationIds = new Set((nationsDoc.nations || nationsDoc).map((n) => n.id));
nationIds.add('common'); nationIds.add('rhodes');
const jobIds = new Set((readJson(base('jobs.json')).jobs || []).map((j) => j.id));
const raceIds = new Set((readJson(base('races.json')).races || []).map((r) => r.id));
const causeIds = new Set((readJson(base('causes.json')).causes || []).map((c) => c.id));
const tracksDir = path.join(ROOT, 'data', 'tracks');
let files = [];
if (!DUMMY && fs.existsSync(tracksDir)) files = fs.readdirSync(tracksDir).filter((f) => f.endsWith('.json')).map((f) => path.join(tracksDir, f));
if (!files.length) files = [pick('tracks.json')].filter(Boolean);
if (!files.length) { console.error('진로 파일 없음'); process.exit(1); }
const tracks = [];
let fallDeathCause = {};
for (const f of files) {
  let doc;
  try { doc = readJson(f); } catch (e) { err(path.basename(f) + ': JSON 파싱 실패 ' + e.message); continue; }
  if (doc._meta && doc._meta.fallDeathCause) fallDeathCause = { ...fallDeathCause, ...doc._meta.fallDeathCause };
  for (const t of doc.tracks || []) tracks.push({ ...t, _file: path.basename(f), nation: t.nation || (doc._meta && doc._meta.nation) });
}
const affDoc = pick('affiliations.json') ? readJson(pick('affiliations.json')) : { affiliations: [] };
const affs = affDoc.affiliations || [];
const affIds = new Set(affs.map((a) => a.id));
const trackIds = new Set();

// ── 진로 ──
const EXIT_RE = /^(death(:[a-z_]+)?|prison:(jail|camp)|exile|demote|expel|injured|infected|disgrace|arena:[A-Z0-9_]+|switch:[A-Z0-9_]+)$/;
const GATE_KEYS = new Set(['cap', 'born', 'min', 'max', 'weight', 'status', 'rel', 'race', 'only', 'edu', 'sex', 'year', 'urban', 'infected', 'known', 'rhodes', 'q', 'flag', 'region', 'money', 'papers', 'newcomer', 'eth', 'note']);
for (const t of tracks) {
  const w = t._file + ' ' + (t.id || '?');
  if (!t.id || typeof t.id !== 'string') { err(w + ': id 없음'); continue; }
  if (trackIds.has(t.id)) err(w + ': id 중복');
  trackIds.add(t.id);
  if (!nationIds.has(t.nation)) err(w + ': nation ' + t.nation + ' 없음');
  if (!ARCHETYPE_IDS.includes(t.archetype)) err(w + ': archetype ' + t.archetype + ' (A1~A12 아님)');
  if (!t.name) err(w + ': name 없음');
  const st = Array.isArray(t.stages) ? t.stages : [];
  if (st.length < 2 || st.length > 6) err(w + ': stages ' + st.length + '개 (2~6)');
  const sids = new Set();
  st.forEach((s, i) => {
    if (!s.id) err(w + ': stages[' + i + '] id 없음');
    if (sids.has(s.id)) err(w + ': stage id 중복 ' + s.id);
    sids.add(s.id);
    if (s.promo != null) {
      if (!s.promo.cap || !['skill', 'learn', 'arts', 'ties', 'looks'].includes(s.promo.cap)) err(w + ':' + s.id + ' promo.cap ' + s.promo.cap);
      if (typeof s.promo.k !== 'number' || s.promo.k < B.track.kRange[0] - 1e-9 || s.promo.k > B.track.kRange[1] + 1e-9) err(w + ':' + s.id + ' promo.k ' + s.promo.k + ' (0.01~0.25)');
      if (i === st.length - 1 && s.promo) warn(w + ':' + s.id + ' 마지막 단계에 promo 가 있음(무시됨)');
    } else if (i < st.length - 1 && s.promo === null) warn(w + ':' + s.id + ' promo:null 인데 마지막 단계가 아님(승급 불가 단계)');
    if (s.fall) {
      if (typeof s.fall.base !== 'number' || s.fall.base < B.track.baseRange[0] || s.fall.base > B.track.baseRange[1] + 1e-9) err(w + ':' + s.id + ' fall.base ' + s.fall.base + ' (0~0.08)');
      if (!Array.isArray(s.fall.causes)) err(w + ':' + s.id + ' fall.causes 배열 아님');
    }
    if (s.minYears != null && (typeof s.minYears !== 'number' || s.minYears < 0)) err(w + ':' + s.id + ' minYears');
  });
  const e = t.entry || {};
  if (!Array.isArray(e.ages) || e.ages.length !== 2 || e.ages[0] > e.ages[1]) err(w + ': entry.ages');
  const cls = e.classes || {};
  const sum = Object.values(cls).reduce((a, b) => a + (+b || 0), 0);
  for (const k of Object.keys(cls)) if (!/^q[1-5]$/.test(k)) err(w + ': classes 키 ' + k);
  if (sum > 1 + 1e-9) err(w + ': classes 합 ' + sum.toFixed(2) + ' > 1');
  for (const g of e.gates || []) {
    for (const k of Object.keys(g)) if (!GATE_KEYS.has(k)) warn(w + ': gate 키 ' + k + ' (엔진이 모름)');
    if (g.race) for (const r of (Array.isArray(g.race) ? g.race : [g.race])) if (!raceIds.has(r)) err(w + ': gate race ' + r + ' 없음');
  }
  const inc = t.income && t.income.stage;
  if (!Array.isArray(inc)) err(w + ': income.stage 배열 없음');
  else if (inc.length !== st.length) err(w + ': income.stage 길이 ' + inc.length + ' ≠ stages ' + st.length);
  if (t.income && t.income.job && !jobIds.has(t.income.job)) warn(w + ': income.job ' + t.income.job + ' jobs.json 에 없음');
  if (t.job && !jobIds.has(t.job)) warn(w + ': job ' + t.job + ' jobs.json 에 없음');
  for (const a of t.affiliations || []) if (!affIds.has(a)) err(w + ': affiliation ' + a + ' 없음');
  const ex = t.exits || {};
  for (const [c, v] of Object.entries(ex.fall || {})) {
    if (typeof v !== 'string' || !EXIT_RE.test(v)) err(w + ': exits.fall.' + c + ' = ' + JSON.stringify(v) + ' (값 사전 §3.5 밖)');
    else if (v.startsWith('death:') && !causeIds.has(v.slice(6))) err(w + ': exits.fall.' + c + ' 사인 ' + v.slice(6) + ' causes.json 에 없음');
    else if (v === 'death' && fallDeathCause[c] && !causeIds.has(fallDeathCause[c])) warn(w + ': cause ' + c + ' → ' + fallDeathCause[c] + ' causes.json 에 없음');
  }
  const causes = new Set(st.flatMap((s) => (s.fall && s.fall.causes) || []));
  for (const c of causes) if (!(ex.fall || {})[c] && !fallDeathCause.__default) warn(w + ': cause ' + c + ' 의 exits.fall 값 없음(원형 기본값·_meta.fallDefaultOutcome 사용)');
  if (!Array.isArray(t.stages)) continue;
}
// 참조(id 전부 모은 뒤)
for (const t of tracks) {
  const w = t._file + ' ' + t.id;
  const ex = t.exits || {};
  if (ex.retire && ex.retire.to && !trackIds.has(ex.retire.to)) err(w + ': exits.retire.to ' + ex.retire.to + ' 없음');
  for (const s of ex.switch || []) if (!trackIds.has(s)) err(w + ': exits.switch ' + s + ' 없음');
  for (const [c, v] of Object.entries(ex.fall || {})) if (typeof v === 'string' && /^(arena|switch):/.test(v) && !trackIds.has(v.split(':')[1])) err(w + ': exits.fall.' + c + ' → ' + v + ' 없음');
  if (t.route) for (const r of t.route) if (!nationIds.has(r)) err(w + ': route ' + r + ' 없음');
}
// ── 소속 ──
const affWeight = {};
for (const a of affs) {
  const w = 'affiliations ' + a.id;
  const ts = Array.isArray(a.track) ? a.track : [a.track];
  for (const tid of ts) { if (!trackIds.has(tid)) err(w + ': track ' + tid + ' 없음'); affWeight[tid] = (affWeight[tid] || 0) + (a.weight ?? 1); }
  if (a.mods) for (const k of ['promo', 'fall', 'income']) if (a.mods[k] != null && (a.mods[k] < 0.3 || a.mods[k] > 3)) warn(w + ': mods.' + k + ' ' + a.mods[k]);
}
for (const [tid, s] of Object.entries(affWeight)) if (Math.abs(s - 1) > 0.05 && s !== 0) warn('affiliations: track ' + tid + ' weight 합 ' + s.toFixed(2) + ' (1 권장)');
// ── 혼인·주거·관계·로도스 ──
const m0 = pick('marriage.json') ? readJson(pick('marriage.json')) : null;
const m = m0 && (m0.nations || m0);
if (m) for (const [n, v] of Object.entries(m)) { if (n.startsWith('_') && n !== '_default') continue; if (!nationIds.has(n) && n !== '_default') err('marriage: 국가 ' + n + ' 없음');
  for (const t of (v.types || [])) { if (!t.id) err('marriage ' + n + ': type id 없음'); for (const tid of (t.req && t.req.track) || []) if (!trackIds.has(tid)) err('marriage ' + n + ':' + t.id + ' req.track ' + tid + ' 없음'); } }
const h0 = pick('housing.json') ? readJson(pick('housing.json')) : null;
const h = h0 && (h0.nations ? { ...h0.nations, _common: h0._common } : h0);
if (h) for (const [n, v] of Object.entries(h)) { if (n.startsWith('_') && n !== '_default' && n !== '_common') continue; if (!nationIds.has(n) && n !== '_default' && n !== '_common') err('housing: 국가 ' + n + ' 없음');
  for (const t of (v && v.types) || []) { if (!t.id) err('housing ' + n + ': type id 없음'); for (const tid of ((t.req && t.req.track) || []).concat((t.forced && t.forced.track) || [])) if (!trackIds.has(tid)) err('housing ' + n + ':' + t.id + ' track ' + tid + ' 없음'); } }
const r = pick('relations.json') ? readJson(pick('relations.json')) : null;
if (r) { const G = r.grades || ['exclude', 'institutional', 'cultural', 'subtle', 'neutral', 'favored'];
  for (const p of r.pairs || []) { if (!nationIds.has(p.nation)) err('relations: 국가 ' + p.nation + ' 없음'); const race = String(p.race).replace(/^!/, ''); if (!raceIds.has(race)) err('relations: 종족 ' + p.race + ' 없음'); if (!G.includes(p.grade)) err('relations: 등급 ' + p.grade); if (p.canon === false) warn('relations ' + p.nation + '×' + p.race + ': canon:false 조합(D49: 캐논 근거 없는 조합은 기입하지 않는다)'); } }
const rh = pick('rhodes.json') ? readJson(pick('rhodes.json')) : null;
if (rh) { const ports = Array.isArray(rh.ports) ? rh.ports : Object.keys((rh.ports && rh.ports.weights) || {}); for (const p of ports) if (!nationIds.has(p)) err('rhodes: 기항지 ' + p + ' 없음');
  for (const p of (rh.ports && rh.ports.offices) || []) if (!nationIds.has(p)) err('rhodes: 주재 사무소 ' + p + ' 없음');
  const VIA = ['volunteer', 'referral', 'treatment', 'rescue', 'agreement', 'companion', 'flight', 'transfer', 'babel'];
  for (const e of rh.entries || []) { if (!VIA.includes(e.via)) err('rhodes: via ' + e.via); if (e.p == null && e.pYear == null) warn('rhodes entries ' + e.via + ': p/pYear 없음'); for (const tid of (e.tracks || (e.trigger && e.trigger.tracks) || [])) if (!trackIds.has(tid)) warn('rhodes entries ' + e.via + ': track ' + tid + ' 없음'); }
  for (const c0 of rh.closed || []) { const c = c0.when || c0; if (c.nation && !nationIds.has(c.nation)) err('rhodes closed: 국가 ' + c.nation); for (const n of c.nationAny || []) if (!nationIds.has(n)) err('rhodes closed: 국가 ' + n); for (const tid of (c.tracks || []).concat(c.tracksNot || [])) if (!trackIds.has(tid)) warn('rhodes closed: track ' + tid + ' 없음'); }
  if (rh.statusRules && Array.isArray(rh.statusRules.rules)) for (const r of rh.statusRules.rules) if (r.track && !trackIds.has(r.track)) warn('rhodes statusRules: track ' + r.track + ' 없음');
  if (Array.isArray(rh.depts)) for (const d of rh.depts) if (d && d.track && !trackIds.has(d.track)) warn('rhodes depts ' + d.id + ': track ' + d.track + ' 없음');
  for (const d of ['field', 'medical', 'logistics', 'patient']) { const id = { field: 'RHO_OPERATOR', medical: 'RHO_MEDICAL', logistics: 'RHO_LOGISTICS', patient: 'RHO_PATIENT' }[d]; if (!trackIds.has(id)) warn('rhodes: 부서 진로 ' + id + ' 없음(합류 시 진로 없이 배치)'); } }

// ── 집계 ──
const byNation = {};
for (const t of tracks) byNation[t.nation] = (byNation[t.nation] || 0) + 1;
const archCount = {};
for (const t of tracks) archCount[t.archetype] = (archCount[t.archetype] || 0) + 1;
for (const [n, c] of Object.entries(byNation)) if (n !== 'common' && n !== 'rhodes' && !tracks.some((t) => t.nation === n && t.archetype === 'A11')) warn('nation ' + n + ': A11 생업 진로 없음(엔진이 GEN_* 합성)');
console.log('진로 ' + tracks.length + '개 / 파일 ' + files.length + ' / 국가 ' + Object.keys(byNation).length + ' / 소속 ' + affs.length);
console.log('원형: ' + Object.entries(archCount).sort().map(([k, v]) => k + ' ' + v).join(', '));
console.log('국가별: ' + Object.entries(byNation).map(([k, v]) => k + ' ' + v).join(', '));
if (warns.length) { console.log('\n경고 ' + warns.length + '건'); for (const w of warns.slice(0, 60)) console.log('  - ' + w); if (warns.length > 60) console.log('  … ' + (warns.length - 60) + '건 더'); }
if (errors.length) { console.log('\n오류 ' + errors.length + '건'); for (const e of errors) console.log('  ✗ ' + e); process.exit(1); }
console.log('\n오류 0건 — OK');
