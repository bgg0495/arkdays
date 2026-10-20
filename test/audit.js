// QA 동적 감사(v0.3, 읽기 전용): node test/audit.js [perNation=200] [random=3000] [--seed qa] [--out path.json] [--nations a,b]
// 21개국 × perNation 생(국가 강제 출생) + random 생(자연 출생)을 auto 결정으로 돌리며 HOOK.log/decision/death 와 연말 상태를 전부 모아
//   (a) 텍스트 결함 (b) 국가 데이터와 모순되는 문장 (c) 나이·상태 부적합 (d) 결정 품질 (e) 진로·소속 일관성 (f) 표시·수치
// 를 검출해 "발생 수 · 예시 문장 · 원인 이벤트/결정 id · 파일:줄" 로 출력한다. 소스·데이터·콘텐츠는 읽기만 한다(수정 없음).
// 끝에 요약 표(검사 항목별 건수)와 종료 코드(심각 항목 1건 이상이면 1)를 남겨 회귀 검사로 반복 실행할 수 있다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData } from './sim.js';
import { createRegistry } from '../src/engine/content.js';
import { createSim, keepFootnote, grade } from '../src/engine/sim.js';
import { trackName } from '../src/engine/track.js';
import { humanAge } from '../src/engine/lifetable.js';
import { hasBatchim, lastJong } from '../src/engine/text.js';
import { ARCHETYPES } from '../src/engine/archetypes.js';
import content from '../content/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const PER_NATION = parseInt(pos[0] || '200', 10);
const RANDOM = parseInt(pos[1] || '3000', 10);
const SEED = opt('--seed', 'qa');
const OUT = opt('--out', null);
const ONLY = opt('--nations', null) ? opt('--nations').split(',') : null;
const MAX_EX = 3;   // 항목별 예시 수

// ────────────────────────────────────────────────────────────────────────────
// 소스 인덱스: 이벤트·결정·대사건 id → 파일:줄
// ────────────────────────────────────────────────────────────────────────────
function buildSourceIndex(ids) {
  const idx = {};
  const files = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js') && !/dummy/.test(e.name)) files.push(p); } };
  walk(path.join(ROOT, 'content'));
  files.push(path.join(ROOT, 'src', 'engine', 'choices.js'));
  const want = new Set(ids);
  const quoted = /'([a-z][a-z0-9_]*)'/g;
  const key = /^\s{2,6}([a-z][a-zA-Z0-9_]*)\s*:\s*\{/;
  for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => {
      let m;
      const km = key.exec(l);
      if (km && want.has(km[1]) && !idx[km[1]]) idx[km[1]] = rel + ':' + (i + 1);
      quoted.lastIndex = 0;
      while ((m = quoted.exec(l))) if (want.has(m[1]) && !idx[m[1]] && /(\bid:\s*'|^\s*\w+\(\s*'|^\s*\{\s*id:\s*')/.test(l.slice(Math.max(0, m.index - 12), m.index + 1))) idx[m[1]] = rel + ':' + (i + 1);
    });
  }
  // 2차: 아무 패턴에도 안 잡힌 id 는 처음 나오는 줄
  for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => { let m; quoted.lastIndex = 0; while ((m = quoted.exec(l))) if (want.has(m[1]) && !idx[m[1]]) idx[m[1]] = rel + ':' + (i + 1) + '?'; });
  }
  return idx;
}

// ────────────────────────────────────────────────────────────────────────────
// 사전
// ────────────────────────────────────────────────────────────────────────────
// (b) 국가 데이터 모순: 낱말 → 국가 조건(참이면 모순)
const LANDLOCKED = new Set(['sami', 'kjerag', 'leithanien', 'kazimierz', 'laterano', 'kazdel', 'durin', 'rim', 'ursus']);   // 추정(캐논 지도): 바다 묘사가 이상한 나라. W14: 타라(섬)·용문(항구)은 뺀다
const NATION_RULES = [
  { key: 'nomadic0', label: 'nomadic 0 국가에서 이동도시·플레이트·데크', re: /이동도시|플레이트|지하 데크|상층 데크|하층 데크|도시가 (멈|이동)|이동 도시/, bad: (n, S, policy, t) => n.nomadic === 0 && !/먼 나라|다른 나라|소식|기사|신문|이야기가 반/.test(t) },
  { key: 'settledHome', label: '정주 가정(home.type settled)인데 이동도시·플레이트·데크', re: /이동도시|플레이트|지하 데크|상층 데크|하층 데크/, bad: (n, S, policy, t) => S.home !== 'nomadic' && n.nomadic > 0 && !/먼 나라|다른 나라|소식|기사|신문|이야기가 반|이동도시 (사람|쪽|이야기)|이동도시 민간 고용|이동도시로 (가|올라|떠)/.test(t) },   // W14: 진로명·'이동도시로 간다'(정주민이 도시로 가는 문장)는 모순이 아니다
  { key: 'catFreq1', label: 'catFreq 1 국가에서 재앙 대피·피격(엔진 재앙 롤 catBase[1]=0.004 는 제외)', re: /재앙 대피|재앙 피격|재앙이 (덮|지나|휩)|재앙 경보|재앙 피폭|재앙의 잔류/, bad: (n, S, policy, t, e) => n.catFreq === 1 && !/없었습니다|다른 나라|먼 나라|소식|기사/.test(t) && !!e.src },
  { key: 'policyNoCamp', label: 'policy ignore/treat/favored 국가에서 격리구역·수용소·감염자 노동법', re: /격리구역|감염자 수용소|감염자 노동법|수용소/, bad: (n, S, policy, t, e) => ['ignore', 'treat', 'favored'].includes(policy) && !/폐지|없었습니다|없다|다른 나라|먼 나라|소식|기사|정박|지나쳤|방문|들렀|다녀/.test(t) && !(e.src && e.src.kind === 'big') },   // W14: 기항·방문 문장(로도스 기항지·순회 방문)은 거주국 정책과 무관
  { key: 'conscriptNone', label: 'conscript none 국가에서 징집·입대 통지·의무 복무', re: /징집|입대 통지|의무 복무|입영|병무 조례/, bad: (n) => n.conscript === 'none' },
  { key: 'seabornFalse', label: 'seaborn false 국가에서 시테러', re: /시테러/, bad: (n) => !n.seaborn },
  { key: 'collapsalFalse', label: 'collapsal false 국가에서 붕괴체', re: /붕괴체/, bad: (n) => !n.collapsal },
  { key: 'landlocked', label: '바다 없는 국가(추정)에서 항구·어선·어부·해안', re: /항구|어선|어부|해안|뱃사람|부두/, bad: (n) => LANDLOCKED.has(n.id) },
];
const DISCRIM_RE = /종족 때문에|흔치 않은 종족|흔하지 않은 종족|뿔 때문에|꼬리 때문에|종족을 이유로|종족이 다르다는 이유|종족 (기재|표시)|이방인(이라|으로)|외부인 취급|외지인(이라는 말|이라고 불|으로 취급| 취급)/;
// (c) 나이·상태
const OLD_RE = /성형|시술|구직|입학|첫사랑|첫 월급|면접|입사|신입/;
const SPOUSE_RE = /배우자|아내|남편/;
const KIDS_RE = /자녀|자식|제 아이|우리 아이|아이들이 상을|아들(이|을|은|과|의|에게) |딸(이|을|은|과|의|에게) |손주/;
const MOM_MEMORY_RE = /떠난|돌아가|무덤|기일|생전|기억|유품|장례|제사|사진|묘|세상을 떠|잃었|남긴|물려|이름을 지어|늑대 어머니|어머니의 품|간판|이름이|이름을|제 배|자리였습니다|대원 하나가|아이 어머니|돈의 어머니/;   // W14: '늑대 어머니'(시라쿠사 신앙)·물려받은 간판/배/자리·남의 부모 문장은 회상·타인
const WORK_RE = /직장|상사|동료가|승진|월급|해고|일터에서|회식|출근|퇴근/;
const PRISON_TRAVEL_RE = /여행|여정|출장|국경을 넘|항구에서|방문했|구경/;
const INFECTED_SELF_RE = /감염자 신분|감염자 등록|감염자증|감염자 수첩|감염자라는 이유|감염자로 등록|감염자 명부에 (제|저|당신)|격리구역에서 (살|지)|감염자 특약|감염자 노동(?!법)/;   // W14: '감염자 노동법' 은 법 이름
// (a) 텍스트
const TEXT_RULES = [
  { key: 'NaN', re: /\bNaN\b/ }, { key: 'undefined', re: /\bundefined\b/ }, { key: 'null', re: /\bnull\b/ }, { key: 'object', re: /\[object/ },
  { key: 'idLeak', re: /\b[A-Z]{2,}_[A-Z0-9_]+\b/ }, { key: 'keyLeak', re: /\b(k|sub|label|fx|standing|cap):\s/ }, { key: 'dblSpace', re: /\S {2,}\S/ },
  { key: 'engTail', re: /[가-힣]\s[a-z]{3,}\b(?!\s*LMD)/ }, { key: 'brokenParticle', re: /[가-힣](은는|이가|을를|와과)\b/ },
];
const CANON_NAMES = null;   // 런타임에 채움

// 조사 검사(test/check-text.js 와 같은 규칙)
function buildVocab(data) {
  const V = new Set();
  const add = (w) => { if (typeof w === 'string') { const s = w.trim(); if (s.length >= 2) V.add(s); } };
  for (const n of data.nations) { add(n.name); add(n.statOrg); const c = n.culture || {}; for (const k of ['greet', 'address', 'elder', 'food', 'ruler', 'rulerTitle', 'drink']) { add(c[k]); if (c[k]) for (const part of String(c[k]).split(/와 |과 /)) add(part); } for (const f of c.festivals || []) add(f); }
  for (const r of data.races) add(r.name);
  for (const j of data.jobs) add(j.name);
  for (const c of data.causes) add(c.label);
  for (const t of data.tracks) { add(t.name); for (const st of t.stages) { add(st.name); add(st.title); } }
  for (const a of data.affiliations) add(a.name);
  for (const pool of Object.values(data.names || {})) if (pool && typeof pool === 'object') for (const key of ['m', 'f', 's']) for (const w of pool[key] || []) add(w);
  return [...V].filter((w) => /^[가-힣·\s]+$/.test(w)).sort((a, b) => b.length - a.length);
}
function expectParticle(word, p) {
  const b = hasBatchim(word);
  if (p === '은' || p === '는') return b ? '은' : '는';
  if (p === '이' || p === '가') return b ? '이' : '가';
  if (p === '을' || p === '를') return b ? '을' : '를';
  if (p === '과' || p === '와') return b ? '과' : '와';
  if (p === '으로' || p === '로') { const j = lastJong(word); return j !== 0 && j !== 8 ? '으로' : '로'; }
  if (p === '이라고' || p === '라고') return b ? '이라고' : '라고';
  return p;
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function buildJosaChecker(vocab) {
  const re = new RegExp('(^|[\\s(「"\'‘“])(' + vocab.map(escapeRe).join('|') + ')(으로|이라고|라고|은|는|이|가|을|를|과|와|로)(?=$|[\\s.,!?)」"\'’”])', 'g');
  return (text) => { const out = []; let m; re.lastIndex = 0; while ((m = re.exec(text))) { const exp = expectParticle(m[2], m[3]); if (exp !== m[3]) out.push(m[2] + m[3] + '→' + exp); } return out; };
}

// ────────────────────────────────────────────────────────────────────────────
// 집계기
// ────────────────────────────────────────────────────────────────────────────
class Tally {
  constructor() { this.items = {}; }
  /** section/key 아래 by(원인 id) 별로 센다. ex 는 예시 문장 */
  hit(section, key, by, ex, extra) {
    const s = this.items[section] || (this.items[section] = {});
    const k = s[key] || (s[key] = { n: 0, by: {}, ex: [], extra: {} });
    k.n++;
    k.by[by] = (k.by[by] || 0) + 1;
    if (ex && k.ex.length < MAX_EX && !k.ex.some((e) => e.t === ex)) k.ex.push({ t: String(ex).slice(0, 160), by });
    if (extra) for (const [ek, ev] of Object.entries(extra)) { const m = k.extra[ek] || (k.extra[ek] = {}); m[ev] = (m[ev] || 0) + 1; }
  }
}

function snap(sim) {
  const S = sim.S;
  return {
    age: S.age, ha: humanAge(S.age, sim.race.lifeMul), cur: S.cur, root: S.root, born: S.born, race: S.race, rel: S.rel, policy: sim.policy,
    track: S.track ? S.track.id : null, stage: S.track ? S.track.stage : null, aff: S.track ? S.track.aff : null, standing: S.track ? S.track.standing : null,
    married: !!S.fam.marriedAt || !!S.fam.partner, widowed: !!S.fam.widowed, partnerAlive: !!(S.fam.partner && S.fam.partner.alive), kids: S.fam.kids.length, kidsAlive: S.fam.kids.filter((k) => k.alive).length,
    momAlive: S.fam.mom.alive, dadAlive: S.fam.dad.alive && !S.fam.dad.absent, dadAbsent: !!S.fam.dad.absent, partnerName: S.fam.partner ? S.fam.partner.name : null, oriOn: S.ori.on, known: S.ori.known, prison: S.prison, rhodes: !!S.rhodes, retired: S.retired, job: S.job, school: S.school, serving: S.serving,
    home: S.home.type, urban: S.urban, q: S.q, region: S.sub && S.sub.region, quarantined: !!S.flags.quarantined, eth: S.eth,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 한 생 분석
// ────────────────────────────────────────────────────────────────────────────
function analyzeLife(L, ctx) {
  const { T, data, josa, canonNames, affNames, srcOf } = ctx;
  const S = L.S;
  const byId = (src) => (src ? src.kind + ':' + src.id : 'engine');
  const textCount = {};
  const textAges = {};
  const decCount = {};
  const canonHits = {};   // name → Set(eventId)

  for (const e of L.logs) {
    const t = typeof e.t === 'string' ? e.t : String(e.t ?? '');
    const src = byId(e.src);
    const tf = ctx.stripFest(t);   // 명절 이름('늑대 어머니의 날' 등)을 뺀 문장
    const st = e.st;
    const nation = data.nationById[e.src && e.src.visit ? e.src.visit : st.cur];
    // (a) 텍스트
    if (!t.trim() || t.trim() === '.' ) T.hit('a', 'empty', src, '(빈 문장)');
    for (const r of TEXT_RULES) if (r.re.test(t)) T.hit('a', r.key, src, t);
    if (e.f) for (const r of TEXT_RULES) if (r.re.test(e.f)) T.hit('a', r.key + '(각주)', src, e.f);
    for (const j of josa(t)) T.hit('a', 'josa', src, t, { pair: j });
    if (e.f) for (const j of josa(e.f)) T.hit('a', 'josa(각주)', src, e.f, { pair: j });
    if (e.k !== 'dec') { textCount[t] = (textCount[t] || 0) + 1; (textAges[t] || (textAges[t] = [])).push(e.age); }
    if (e.k !== 'dec' && e.k !== 'death' && /\d/.test(t.replace(/\d{3,4}년/g, '')) && !e.f && !e.fDropped) T.hit('a', 'digitNoFootnote', src, t);
    if (e.fDropped) T.hit('a', 'footnoteNoDigit', src, t + ' ‖ ' + e.fDropped);
    // (b) 출생국 태그 누수: tagsOf 가 S.born 을 태그에 넣어 <nation> 태그 이벤트가 이주 뒤에도 평생 따라온다
    if (e.src && (e.src.kind === 'ev' || e.src.kind === 'dec') && !e.src.visit) {
      const def = e.src.kind === 'ev' ? ctx.registry.evById[e.src.id] : ctx.registry.decisions[e.src.id];
      const nt = def ? (def.tags || []).filter((x) => (ctx.nationIds.has(x) && x !== 'rhodes') || x.startsWith('nation:')).map((x) => x.replace('nation:', '')) : [];   // W14: 'rhodes' 는 상태 태그
      const c0 = e.src.curAt || st.cur, r0 = e.src.rootAt || st.root;   // W14: 발화 시점 거주국(이벤트 자신이 이주시키는 경우)
      if (nt.length && !nt.includes(st.cur) && !nt.includes(st.root) && !nt.includes(c0) && !nt.includes(r0)) T.hit('b', 'bornTagLeak', src, t, { pair: nt.join('/') + '→' + st.cur });
    }
    // (b) 국가 데이터 모순
    if (nation && e.k !== 'dec') {
      for (const r of NATION_RULES) if (r.re.test(t) && r.bad(nation, st, st.policy, t, e)) T.hit('b', r.key, src, t, { nation: nation.id });
      if (DISCRIM_RE.test(t) && (st.rel === 'neutral' || st.rel === 'favored') && !st.eth) { const def = e.src && e.src.kind === 'ev' ? ctx.registry.evById[e.src.id] : null; if (!(def && (def.tags || []).includes('rel:neutral'))) T.hit('b', 'discrimNeutral', src, t, { pair: nation.id + '×' + st.race }); }
    }
    // (c) 나이·상태
    if (e.k !== 'dec') {
      if (st.ha >= 60 && OLD_RE.test(t) && !/자녀|아이|손주|아들|딸/.test(t)) T.hit('c', 'old60', src, t);
      if (!st.married && !st.widowed && SPOUSE_RE.test(t) && !/어머니|아버지|이웃|누구의|남편과 아내|부부|쫓아내|사람의 아내|의 아내|의 남편/.test(t)) T.hit('c', 'spouseUnmarried', src, t);   // W14: '쫓아내는'·남의 배우자
      if (st.kids === 0 && st.age >= 15 && KIDS_RE.test(t) && !/이웃|남의|누구의|어머니|아버지|형제|동생|조카|사장|가주|손주 또래|귀족 자녀|평민|고아|후원자 딸|가문 자제|자제가/.test(t)) T.hit('c', 'kidsNone', src, t);   // W14: 남의 자녀·또래 문장
      if (!st.momAlive && /(?<!할)어머니/.test(tf) && !MOM_MEMORY_RE.test(tf) && !/옆집|이웃|남의|친구|아이가|시켰다고|아내|며느리/.test(tf)) T.hit('c', 'deadMom', src, t);   // W14: '할머니/할아버지' 는 제외
      if (!st.dadAlive && !st.dadAbsent && /(?<!할)아버지/.test(tf) && !MOM_MEMORY_RE.test(tf) && !/없는|안 계|계시지|또래/.test(tf)) T.hit('c', 'deadDad', src, t);
      if (!st.track && !st.job && st.age >= 18 && st.ha < 60 && !st.retired && WORK_RE.test(t) && !(st.partnerName && t.includes(st.partnerName)) && !/배우자|이웃|친구|동생|형이|누나|언니|아들|딸/.test(t)) T.hit('c', 'workNoTrack', src, t);
      if (st.retired && /승진|승급|되었습니다\. 월급/.test(t) && !(st.partnerName && t.includes(st.partnerName))) T.hit('c', 'promoRetired', src, t);
      if (st.prison && PRISON_TRAVEL_RE.test(t) && !/감옥|수용소|석방|출소/.test(t)) T.hit('c', 'prisonTravel', src, t);
      if (st.cur === 'rhodes' && e.src && e.src.kind === 'ev' && !e.src.visit && !/정박|기항/.test(t) && (ctx.nationWords.some((w) => t.includes(w)) || /마을|관청|이웃집|동네/.test(t))) T.hit('c', 'rhodesResidentEvent', src, t);   // W14: 기항지 방문 피드(§7.4)는 의도
      if (!st.known && INFECTED_SELF_RE.test(t)) T.hit('c', 'infectedUnknown', src, t);
      // 진로 단계와 맞지 않는 칭호: 현재 진로의 상위 단계 칭호가 문장에 들어감
      if (st.track && data.trackById[st.track]) {
        const tr = data.trackById[st.track];
        tr.stages.forEach((sg, i) => { const title = sg.title || sg.name; if (i > st.stage && title && title.length >= 2 && new RegExp(title + '(이|가) (되었|됐)|' + title + '(으로|로) (올라|승진|임명|서임)').test(t) && !/다음|언젠가|될 수|되고 싶|되려|꿈|목표|이야기|동료|선배|상관|옆/.test(t)) T.hit('c', 'titleAhead', src, t, { pair: tr.id + ':' + title }); });
      }
    }
    // (e) 소속 이중 표시
    if (e.k !== 'dec') { for (const m of t.matchAll(/([가-힣A-Za-z'’ ]{2,24})·([가-힣A-Za-z'’ ]{2,24})/g)) { const a = ctx.affByName[m[1].trim()], b = ctx.affByName[m[2].trim()]; if (a && b && a.id !== b.id && a.track.some((x) => b.track.includes(x))) T.hit('e', 'twoAffs', src, t, { pair: a.id + '·' + b.id }); } }
    // 캐논 인물
    for (const n of canonNames) { let i = -1, ok = false; while ((i = t.indexOf(n, i + 1)) >= 0) if (!/[가-힣]/.test(i > 0 ? t[i - 1] : ' ')) { ok = true; break; } if (ok) (canonHits[n] || (canonHits[n] = new Set())).add(src); }
  }
  for (const [t, n] of Object.entries(textCount)) if (n >= 4) T.hit('a', 'repeat4', L.textSrc[t] || '?', t, { n });
  for (const [t, ages] of Object.entries(textAges)) { const u = [...new Set(ages)].sort((a, b) => a - b); for (let i = 1; i < u.length; i++) if (u[i] - u[i - 1] === 1) { T.hit('a', 'consecutiveYears', L.textSrc[t] || '?', t); break; } }
  // 캐논 인물: 같은 인물 2회(서로 다른 이벤트) / 생애 3명 초과
  let distinct = 0;
  for (const [n, set] of Object.entries(canonHits)) { distinct++; if (set.size >= 2) T.hit('e', 'canonTwice', [...set].join('+'), n, { name: n }); }
  if (distinct > 3) T.hit('e', 'canonOver3', 'life', Object.keys(canonHits).join(','), { n: distinct });
  if ((S.flags.canonSeen || 0) > 3) T.hit('e', 'canonSeenOver3', 'life', String(S.flags.canonSeen));

  // (d) 결정
  for (const d of L.decisions) {
    const v = d.view;
    const src = 'dec:' + d.id;
    decCount[d.id] = (decCount[d.id] || 0) + 1;
    if ((v.choices || []).length === 1) T.hit('d', 'singleChoice', src, v.title + ' / ' + v.choices[0].label);
    for (const c of v.choices || []) {
      if (c.sub == null || c.sub === '') T.hit('d', 'noSub', src, v.title + ' / ' + c.label, { k: c.k });
      else if (/NaN|undefined|null|—%/.test(String(c.sub))) T.hit('d', 'badSub', src, c.label + ' · ' + c.sub);
      for (const r of TEXT_RULES) { if (r.re.test(String(c.label))) T.hit('a', r.key + '(선택지)', src, c.label); if (c.sub && r.re.test(String(c.sub))) T.hit('a', r.key + '(선택지)', src, c.sub); }
      for (const j of josa(String(c.label) + ' ' + (c.sub || ''))) T.hit('a', 'josa(선택지)', src, c.label + ' · ' + (c.sub || ''), { pair: j });
    }
    for (const r of TEXT_RULES) { if (r.re.test(String(v.title))) T.hit('a', r.key + '(결정)', src, v.title); if (r.re.test(String(v.body || ''))) T.hit('a', r.key + '(결정)', src, v.body); }
    for (const j of josa(String(v.title) + ' ' + (v.body || ''))) T.hit('a', 'josa(결정)', src, v.body || v.title, { pair: j });
    // 성공 확률 표기 vs 결과
    if (d.chosen) { const m = /(\d{1,3})%/.exec(String(d.chosen.sub || '')); if (m && /성공|확률|합격|통과/.test(String(d.chosen.sub))) { const key = d.id + ' / ' + d.chosen.label; const P = ctx.probs[key] || (ctx.probs[key] = { stated: 0, n: 0, ok: 0 }); P.stated += +m[1]; P.n++; if (d.resultKind && !['bad', 'loss'].includes(d.resultKind)) P.ok++; } }
    // track_choose 후보 vs 출생 환경
    if (d.id === 'track_choose' || /track_choose/.test(d.id)) {
      for (const c of v.choices || []) {
        const t = data.trackById[c.k]; if (!t) continue;
        const C = ctx.cands[t.id] || (ctx.cands[t.id] = { n: 0, urban: 0, rural: 0, regionOff: 0, foreign: 0, q: {} });
        C.n++; C[d.st.urban ? 'urban' : 'rural']++; C.q[d.st.q] = (C.q[d.st.q] || 0) + 1;
        if (t.region && !data.nationById[t.region] && d.st.region !== t.region) { C.regionOff++; T.hit('d', 'candRegionOff', 'track:' + t.id, t.name + ' ← 출생 ' + d.st.born + '/' + (d.st.urban ? '도시' : '농촌') + '/region ' + d.st.region, { track: t.id }); }
        if (t.nation !== 'common' && t.nation !== d.st.cur && t.nation !== d.st.root && t.nation !== 'rhodes') { C.foreign++; T.hit('d', 'candForeign', 'track:' + t.id, t.name + '(' + t.nation + ') ← 거주 ' + d.st.cur, { track: t.id }); }
        if (/황야|유목|부족|산지|숲|사막|농/.test(t.name) && d.st.urban) T.hit('d', 'candRuralNameUrban', 'track:' + t.id, t.name + ' ← 도시 출생 ' + d.st.born, { track: t.id });
      }
    }
    if (d.id === 'track_switch' && d.st.track) {
      const from = data.trackById[d.st.track];
      for (const c of v.choices || []) { const to = data.trackById[c.k]; if (!to || !from) continue; ctx.switches[from.archetype + '→' + to.archetype] = (ctx.switches[from.archetype + '→' + to.archetype] || 0) + 1; if (!ADJ[from.archetype].includes(to.archetype)) T.hit('d', 'switchNonAdjacent', from.id + '→' + to.id, from.name + '(' + from.archetype + ') → ' + to.name + '(' + to.archetype + ')'); }
    }
  }
  for (const [id, n] of Object.entries(decCount)) if (n >= 3) { const d = ctx.registry.decisions[id]; T.hit('d', 'decision3x', 'dec:' + id, id + ' ×' + n + (d && d.gap ? ' (gap ' + d.gap + ')' : ' (gap 없음)'), { n }); }

  // (e) 진로 상태
  const hist = S.trackHist;
  for (const h of hist) {
    const t = data.trackById[h.id]; if (!t) continue;
    if (h.how === 'promo') { const st = t.stages.find((x) => x.id === h.stage); if (st && h.to - h.from < (st.minYears ?? 0)) T.hit('e', 'minYearsPromo', 'track:' + t.id + ':' + h.stage, t.name + ' ' + h.stage + ' ' + (h.to - h.from) + '년 < minYears ' + st.minYears); }
  }
  // 단계 역행(강등 기록 없이)
  const years = S.years;
  for (let i = 1; i < years.length; i++) {
    const a = years[i - 1], b = years[i];
    if (a.track && b.track === a.track && b.stage < a.stage && !hist.some((h) => h.id === a.track && (h.how === 'demote' || h.to === b.a))) T.hit('e', 'stageRegress', 'track:' + a.track, a.track + ' ' + a.stage + '→' + b.stage + ' @' + b.a);   // W14: 그 해 떠났다 다시 들어온 것(COM_CC 재진입)은 역행이 아니다
    // (f) 역량 등급 변화인데 로그 없음
    if (b.standing != null && (b.standing < 0 || b.standing > 100)) T.hit('f', 'standingRange', 'track:' + b.track, String(b.standing));
    if (b.hl < 0 || b.hl > 100 || b.h < 0 || b.h > 100) T.hit('f', 'barRange', 'engine', 'hl ' + b.hl + ' h ' + b.h);
    if (!Number.isFinite(b.money)) T.hit('f', 'moneyNaN', 'engine', String(b.money));
  }
  for (let i = 1; i < L.grades.length; i++) { const a = L.grades[i - 1], b = L.grades[i]; for (const k of ['skill', 'learn', 'arts', 'ties']) if (a.g[k] !== b.g[k]) { const logged = L.logs.some((e) => e.age === b.age && /에서 .+(올랐|내려갔)습니다/.test(e.t) && e.t.includes({ skill: '기량', learn: '학식', arts: '아츠', ties: '관계' }[k])); if (!logged) T.hit('f', 'capGradeNoLog', k, k + ' ' + a.g[k] + '→' + b.g[k] + ' @' + b.age); } }
  { let worst = null; for (const y of years) { const m = L.medOf(y.cur) || L.med; if (y.money < -m * 20 && (!worst || y.money / m < worst.r)) worst = { r: y.money / m, y, m }; }   // W14: 그 해 거주국 중위 기준
    if (worst) T.hit('f', 'moneyNegative', worst.y.cur, Math.round(worst.y.money).toLocaleString() + ' LMD (중위 ' + Math.round(worst.m) + ', ' + worst.y.cur + ' @' + worst.y.a + ')'); }
  if (humanAge(S.deathAt.age, S.lifeMul) > 122) T.hit('f', 'ageOver122', S.race, S.deathAt.age + '세(인간 척도 ' + humanAge(S.deathAt.age, S.lifeMul).toFixed(0) + ')');
  // 몰락 사유 vs 원형(연말 기록)
  for (const f of L.falls) {
    const t = data.trackById[f.track]; if (!t) continue;
    const declared = new Set([...t.stages.flatMap((s) => s.fall.causes), ...Object.keys(t.exits.fall)]);
    if (!declared.has(f.cause)) T.hit('e', 'fallCauseUndeclared', 'track:' + t.id, t.name + '(' + t.archetype + ') ← ' + f.cause);
    if (ODD_FALL[t.archetype] && ODD_FALL[t.archetype].includes(f.cause)) T.hit('e', 'fallCauseOddForArchetype', 'track:' + t.id, t.name + '(' + ARCHETYPES[t.archetype].name + ') ← ' + f.cause);
  }
  // 사인 vs 신분·진로
  const D = S.deathAt; const lastT = S.track ? data.trackById[S.track.id] : (S.flags.lastTrack ? data.trackById[S.flags.lastTrack] : null);
  const stHi = S.track ? S.track.standing : 0;
  const deathKey = (k, why) => T.hit('e', 'deathMismatch', k, D.label + ' @' + D.age + '세 ' + S.cur + ' · ' + why, { cause: D.cause });
  if (D.cause === 'assassination' && !(S.status.noble || stHi >= 60 || (lastT && ['A1', 'A3'].includes(lastT.archetype)))) deathKey('assassination', '진로 ' + (lastT ? lastT.id : '없음') + ' 지위 ' + Math.round(stHi) + (S.status.noble ? ' 귀족' : ''));
  if (D.cause === 'arts_backlash' && !(S.flags.casterRoute || S.cap.arts >= 0.5 || (lastT && ['A7', 'A12'].includes(lastT.archetype)) || (S.years.some((y) => y.focus === 'arts')))) deathKey('arts_backlash', '아츠 z ' + S.cap.arts + ' 진로 ' + (lastT ? lastT.id : '없음'));
  if (D.cause === 'oripathy' && !S.ori.on) deathKey('oripathy', '비감염');
  if (D.cause === 'euthanasia' && (!S.ori.on || S.cur !== 'leithanien')) deathKey('euthanasia', (S.ori.on ? '감염' : '비감염') + ' ' + S.cur);
  if (D.cause === 'camp' && S.prison !== 'camp') deathKey('camp', '수용소 아님(prison ' + S.prison + ')');
  if (D.cause === 'mine_accident' && !(lastT && (lastT.archetype === 'A5' || /MINE|MINER|PIT/.test(lastT.id))) && !(S.job && data.jobById[S.job] && data.jobById[S.job].risk.mine_accident)) deathKey('mine_accident', '진로 ' + (lastT ? lastT.id : '없음') + ' job ' + S.job);
  if (D.cause === 'major_arena' && !(lastT && lastT.archetype === 'A2')) deathKey('major_arena', '진로 ' + (lastT ? lastT.id : '없음'));
  if (D.cause === 'vendetta' && !(lastT && lastT.archetype === 'A1') && !['siracusa'].includes(S.root)) deathKey('vendetta', '진로 ' + (lastT ? lastT.id : '없음') + ' ' + S.cur);
  if (D.cause === 'nomadic_accident' && S.home.type !== 'nomadic') deathKey('nomadic_accident', '정주 가정 ' + S.cur);
  if (D.cause === 'seaborn' && !data.nationById[S.cur].seaborn) deathKey('seaborn', S.cur);
  if (D.cause === 'collapsal' && !data.nationById[S.cur].collapsal) deathKey('collapsal', S.cur);
  if (D.cause === 'childbirth' && S.sex === 'M') deathKey('childbirth', '남성');
  if (D.cause === 'war' && !S.flags.war && !S.serving && data.nationById[S.cur].conflict <= 1) deathKey('war', '평시 conflict 1 ' + S.cur);
  if (D.cause === 'execution' && !(lastT && ['A1', 'A3', 'A4'].includes(lastT.archetype)) && !S.ori.on && !S.prison) deathKey('execution', '진로 ' + (lastT ? lastT.id : '없음') + ' 비감염 ' + S.cur);
  if (D.cause === 'catastrophe' && data.nationById[S.cur].catFreq === 1) deathKey('catastrophe', 'catFreq 1 ' + S.cur);
  // 소속 이중 표시(신원 카드 문자열)
  for (const nm of L.trackNames) { const [head, tail] = nm.split(' · '); if (tail && (tail.includes(head) || head.includes(tail))) T.hit('e', 'cardRedundant', nm, nm); for (const m of nm.matchAll(/([가-힣A-Za-z'’ ]{2,24})·([가-힣A-Za-z'’ ]{2,24})/g)) { const a = ctx.affByName[m[1].trim()], b = ctx.affByName[m[2].trim()]; if (a && b && a.id !== b.id) T.hit('e', 'twoAffsCard', nm, nm); } }
}

const ADJ = {
  A1: ['A1', 'A6', 'A10', 'A11'], A2: ['A2', 'A12', 'A4', 'A6', 'A11'], A3: ['A3', 'A8', 'A9', 'A10'], A4: ['A4', 'A6', 'A2', 'A11', 'A1'], A5: ['A5', 'A11'],
  A6: ['A6', 'A4', 'A1', 'A11', 'A2'], A7: ['A7', 'A8', 'A12', 'A11'], A8: ['A8', 'A3', 'A7', 'A9', 'A11'], A9: ['A9', 'A3', 'A10', 'A8'], A10: ['A10', 'A9', 'A3', 'A11', 'A1'],
  A11: ['A11', 'A10', 'A5', 'A4', 'A6', 'A2', 'A1', 'A7', 'A12'], A12: ['A12', 'A2', 'A7', 'A11'],
};
// 원형과 어울리지 않는 몰락 사유(판단 기준: 데이터에 적혀 있어도 서사가 어색한 것)
const ODD_FALL = {
  A11: ['vendetta', 'kia', 'purge', 'coup', 'impeach', 'heresy', 'courtmartial', 'desert', 'scandal', 'elimination', 'mutiny'],
  A10: ['vendetta', 'kia', 'purge', 'coup', 'heresy', 'courtmartial', 'desert', 'execution'],
  A9: ['vendetta', 'kia', 'desert', 'courtmartial', 'elimination'],
  A3: ['kia', 'desert', 'elimination', 'injury', 'contract_end'],
  A8: ['kia', 'desert', 'elimination', 'layoff', 'bankrupt'],
  A2: ['purge', 'impeach', 'heresy', 'layoff', 'courtmartial'],
  A12: ['kia', 'purge', 'impeach', 'courtmartial', 'desert'],
  A7: ['layoff', 'bankrupt', 'courtmartial', 'impeach'],
  A5: ['layoff', 'scandal', 'impeach', 'fade'],
};

// ────────────────────────────────────────────────────────────────────────────
// 실행
// ────────────────────────────────────────────────────────────────────────────
function runLife(ctx, seed, nationId) {
  const { data, registry } = ctx;
  const L = { logs: [], decisions: [], falls: [], trackNames: [], grades: [], textSrc: {}, S: null, med: 0 };
  let cur = null;   // 현재 발화 중인 원인 {kind, id, visit}
  let lastDec = null;
  const hooks = {
    log: (e, sim) => {
      const ent = { t: e.t, k: e.k, f: e.f, age: e.a, src: cur, st: snap(sim), fDropped: e._fDropped || null };
      L.logs.push(ent);
      if (!L.textSrc[e.t]) L.textSrc[e.t] = cur ? cur.kind + ':' + cur.id : 'engine';
      if (lastDec && cur && cur.kind === 'dec' && cur.id === lastDec.id && e.k !== 'dec' && !lastDec.resultKind) lastDec.resultKind = e.k;
    },
    decision: (pd, sim) => { lastDec = { id: pd.id, view: pd.view, st: snap(sim), chosen: null, resultKind: null }; L.decisions.push(lastDec); },
  };
  const sim = createSim({ data, seed, content: registry, auto: true, hooks });
  // 원인 추적: fire/choose 를 감싼다. log 는 각주 탈락(D31 역방향)도 본다
  const fire0 = sim.fire; sim.fire = (e) => { cur = e.type === 'dec' ? null : { kind: e.type, id: e.id, visit: e.visit || null, curAt: sim.S.cur, rootAt: sim.S.root }; try { fire0(e); } finally { cur = null; } };
  const choose0 = sim.choose; sim.choose = (k, text, auto) => { const pd = sim.S.pending; if (pd && lastDec && lastDec.id === pd.id) { lastDec.chosen = pd.view.choices.find((c) => c.k === k) || pd.view.choices[0]; } cur = pd ? { kind: 'dec', id: pd.id, curAt: sim.S.cur, rootAt: sim.S.root } : null; try { return choose0(k, text, auto); } finally { cur = null; } };
  const log0 = sim.log; sim.log = (text, kind, f, fx) => { const e = log0(text, kind, f, fx); if (f && !keepFootnote(text, f) && e) { e._fDropped = f; L.logs[L.logs.length - 1].fDropped = f; } return e; };
  const S = sim.newLife(nationId ? { nation: nationId } : {});
  L.S = S; L.med = sim.med;
  L.medOf = (cur) => { const n = data.nationById[cur]; if (!n || !n.stats) return sim.med; const save = S.cur; S.cur = cur; const m = sim.med; S.cur = save; return m; };
  sim.start();
  let guard = 0;
  while (S.phase === 'life') {
    const age = S.age;
    sim.runYear();
    if (++guard > 500) throw new Error('500년 초과');
    if (S.phase === 'life') {
      if (S.flags.lastFallAt === age) L.falls.push({ track: S.track ? S.track.id : S.flags.lastTrack, cause: S.flags.lastFall, age });
      const nm = trackName(sim); if (nm) L.trackNames.push(nm);
      L.grades.push({ age, g: { skill: grade(S.cap.skill), learn: grade(S.cap.learn), arts: grade(S.cap.arts), ties: grade(S.cap.ties) } });
    }
  }
  if (S.flags.lastFallAt === S.deathAt.age && !L.falls.some((f) => f.age === S.deathAt.age)) L.falls.push({ track: S.track ? S.track.id : S.flags.lastTrack, cause: S.flags.lastFall, age: S.deathAt.age });
  return L;
}

function main() {
  const t0 = Date.now();
  const { data, used } = loadData();
  const registry = content.install(createRegistry());
  const T = new Tally();
  const ids = [...registry.events.map((e) => e.id), ...Object.keys(registry.decisions), ...registry.big.map((b) => b.id)];
  const srcOf = buildSourceIndex(ids);
  const givenPool = new Set(); for (const pool of Object.values(data.names || {})) if (pool && typeof pool === 'object') for (const key of ['m', 'f', 's']) for (const w of pool[key] || []) givenPool.add(w);
  const inData = (n) => data.affiliations.some((a) => a.name.includes(n)) || data.tracks.some((t) => t.name.includes(n) || t.stages.some((s) => (s.title || '').includes(n) || s.name.includes(n)));
  const poolHas = (n) => givenPool.has(n) || [...givenPool].some((g) => g.length > n.length && g.startsWith(n));   // W14: 이름 풀 이름의 앞부분(시즈⊂시즈쿠)도 제외
  const canonNames = (data.canonFigures || []).map((f) => f.name).filter((n) => n && n !== '오로라' && !poolHas(n) && !inData(n) && (n.length >= 3 || ['켈시', '시즈', '니어', '소라', '굴로', '체르니', '텍사스'].includes(n)));   // 이름 풀·소속명과 겹치는 인물명은 제외
  const affNames = [...new Set(data.affiliations.map((a) => a.name).filter((n) => n && n.length >= 3))];
  const affByName = Object.fromEntries(data.affiliations.map((a) => [a.name, a]));
  const josa = buildJosaChecker(buildVocab(data));
  // 국가 고유어(명절·통치자·기록 기관·음식): 로도스 거주 중 거주국 이벤트 판정 / 명절 이름 제거용
  const fests = []; const nationWords = [];
  for (const n of data.nations) { if (n.virtual) continue; const c = n.culture || {}; for (const f of c.festivals || []) { fests.push(f); nationWords.push(f); } for (const k of ['ruler', 'statOrg', 'food']) if (n[k] || c[k]) nationWords.push(n[k] || c[k]); }
  const stripFest = (t) => fests.reduce((acc, f) => acc.split(f).join(' '), t);
  const ctx = { T, data, registry, josa, canonNames, affNames, affByName, srcOf, probs: {}, cands: {}, switches: {}, nationIds: new Set(data.nations.map((n) => n.id)), nationWords: [...new Set(nationWords.filter((w) => w && w.length >= 2))], stripFest };
  console.log('감사 기준 시각 ' + new Date().toISOString() + ' | 데이터: ' + Object.entries(used).map(([k, v]) => k + '←' + v).join(' ') + ' | 콘텐츠 이벤트 ' + registry.events.length + ' / 결정 ' + Object.keys(registry.decisions).length + ' / 대사건 ' + registry.big.length);
  const nations = data.nations.filter((n) => !n.virtual && n.share > 0 && (!ONLY || ONLY.includes(n.id)));
  let lives = 0, errors = 0;
  const errs = {};
  const run = (seed, nid) => { try { const L = runLife(ctx, seed, nid); analyzeLife(L, ctx); lives++; } catch (e) { errors++; const k = String(e && e.message || e).slice(0, 120); errs[k] = (errs[k] || 0) + 1; if (errors <= 5) console.error('[' + seed + '] ' + (e && e.stack || e)); } };
  for (const n of nations) for (let i = 0; i < PER_NATION; i++) run(SEED + ':' + n.id + ':' + i, n.id);
  for (let i = 0; i < RANDOM; i++) run(SEED + ':rnd:' + i, null);
  const ms = Date.now() - t0;

  // ── 출력 ──
  const SECTION = { a: '(a) 텍스트 결함', b: '(b) 국가 데이터 모순', c: '(c) 나이·상태 부적합', d: '(d) 결정 품질', e: '(e) 진로·소속 일관성', f: '(f) 표시·수치' };
  const loc = (by) => { const id = by.replace(/^(ev|dec|big|track):/, '').split(':')[0]; return srcOf[id] ? ' [' + srcOf[id] + ']' : (by.startsWith('track:') ? ' [data/tracks]' : by === 'engine' ? ' [src/engine]' : ''); };
  console.log('\n생 ' + lives + ' (국가 ' + nations.length + '×' + PER_NATION + ' + 자연 ' + RANDOM + '), 예외 ' + errors + ', ' + (ms / 1000).toFixed(0) + 's');
  if (errors) console.log('예외 종류: ' + Object.entries(errs).map(([k, v]) => v + '× ' + k).join(' | '));
  const summary = [];
  for (const sec of ['a', 'b', 'c', 'd', 'e', 'f']) {
    const items = T.items[sec] || {};
    console.log('\n' + '═'.repeat(100) + '\n' + SECTION[sec]);
    for (const [key, v] of Object.entries(items).sort((x, y) => y[1].n - x[1].n)) {
      summary.push({ sec, key, n: v.n, causes: Object.keys(v.by).length });
      console.log('\n▸ ' + key + '  ' + v.n + '건 / 원인 ' + Object.keys(v.by).length + '개');
      const top = Object.entries(v.by).sort((x, y) => y[1] - x[1]).slice(0, 12);
      for (const [by, n] of top) console.log('    ' + String(n).padStart(5) + '  ' + by + loc(by));
      if (Object.keys(v.by).length > 12) console.log('    … 외 ' + (Object.keys(v.by).length - 12) + '개');
      for (const ex of v.ex) console.log('      예) ' + ex.t.replace(/\n/g, ' ') + '  ← ' + ex.by);
      for (const [ek, m] of Object.entries(v.extra)) { const es = Object.entries(m).sort((x, y) => y[1] - x[1]).slice(0, 10); console.log('      ' + ek + ': ' + es.map(([k, n]) => k + ' ' + n).join(', ') + (Object.keys(m).length > 10 ? ' …' : '')); }
    }
  }
  // (d) 확률 표기 vs 실제
  console.log('\n' + '═'.repeat(100) + '\n(d) 성공 확률 표기 vs 실제(결과 로그 kind 가 bad/loss 면 실패로 본 근사치, n≥30)');
  const probRows = Object.entries(ctx.probs).filter(([, p]) => p.n >= 30).map(([k, p]) => ({ k, stated: p.stated / p.n, actual: p.ok / p.n * 100, n: p.n })).sort((a, b) => Math.abs(b.stated - b.actual) - Math.abs(a.stated - a.actual));
  for (const r of probRows.slice(0, 25)) console.log('    ' + (Math.abs(r.stated - r.actual) > 20 ? '!! ' : '   ') + r.k.padEnd(50) + ' 표기 ' + r.stated.toFixed(0) + '% / 실제 ' + r.actual.toFixed(0) + '% (n=' + r.n + ')' + loc('dec:' + r.k.split(' / ')[0]));
  // (d) track_choose 후보 요약
  console.log('\n(d) track_choose 후보 — region 불일치·타국·도시 출생 비율 상위');
  const candRows = Object.entries(ctx.cands).map(([id, c]) => ({ id, ...c })).filter((c) => c.n >= 10);
  for (const c of candRows.filter((c) => c.regionOff || c.foreign).sort((a, b) => (b.regionOff + b.foreign) - (a.regionOff + a.foreign)).slice(0, 15)) console.log('    ' + c.id.padEnd(16) + ' 후보 ' + c.n + '회 · region 불일치 ' + c.regionOff + ' · 타국 ' + c.foreign + ' · 도시 ' + c.urban + '/농촌 ' + c.rural);
  console.log('(d) track_switch 원형 쌍: ' + Object.entries(ctx.switches).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '));

  // 요약
  console.log('\n' + '═'.repeat(100) + '\n요약(항목별 건수)');
  for (const s of summary) console.log('  ' + s.sec + ' ' + s.key.padEnd(28) + String(s.n).padStart(7) + '  원인 ' + s.causes);
  const SEVERE = ['NaN', 'undefined', 'object', 'idLeak', 'keyLeak', 'empty', 'badSub', 'singleChoice', 'nomadic0', 'conscriptNone', 'seabornFalse', 'collapsalFalse', 'moneyNaN', 'barRange', 'standingRange', 'stageRegress'];
  const severe = summary.filter((s) => SEVERE.includes(s.key)).reduce((a, s) => a + s.n, 0);
  console.log('\n심각(즉시 보임) 합계 ' + severe + '건 → ' + (severe || errors ? '실패' : '통과'));
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), lives, errors, items: T.items, probs: ctx.probs, cands: ctx.cands, switches: ctx.switches, srcOf }, null, 1)); console.log('JSON → ' + OUT); }
  if (severe || errors) process.exitCode = 1;
}

main();
