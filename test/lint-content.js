// 콘텐츠·데이터 정적 린트(v0.3 QA, 읽기 전용): node test/lint-content.js [--json path]
// 레지스트리(content/index.js)의 이벤트·결정·대사건을 함수 소스(toString)와 태그로 검사하고, data/*.json 을 교차 검사한다.
//   L1 태그 없는(국가·환경 태그 없는) 이벤트인데 본문에 국가·환경 고유어가 들어간 것(= 새는 후보)
//   L2 존재하지 않는 진로·단계·소속·국가·종족·직업·정책·주거·혼인 id 태그 / 알 수 없는 태그(영원히 안 열림)
//   L3 track: 태그 진로가 그 파일의 나라 것이 아닌 것
//   L4 삭제된 필드 참조(st.sm / st.so / eth === 'outsider' / S.rhodes = true / S.job 직접 대입), fx 의 sm/so 키
//   L5 금지어(D25)·'연줄' 잔존·'카르니발레'·하드코딩 조사
//   L6 캐논 인물 이름이 반복 가능한 이벤트(rep 또는 gap)에 들어간 것
//   L7 연도 고유명(체르노보그 1096 등)이 있는데 연도 게이트(year/Y()/big) 없는 이벤트
//   L8 '각주 없는 숫자 문장 / 각주 있는 비숫자 문장'은 동적 감사(test/audit.js)가 본다
//   D1~D6 데이터 교차 검사: 출생 환경 전용 진로의 하드 게이트, exits.switch 원형 비인접, income.stage 0, 소속 없는 진로의 aff: 이벤트,
//          relations.json 쌍 vs 차별 문장, marriage/housing 유형 참조
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData } from './sim.js';
import { createRegistry } from '../src/engine/content.js';
import { ARCHETYPES } from '../src/engine/archetypes.js';
import content from '../content/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const OUT = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');

// ── 파일 인덱스 ──
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js') && !/dummy/.test(e.name)) files.push(p); } })(path.join(ROOT, 'content'));
const fileText = Object.fromEntries(files.map((f) => [rel(f), fs.readFileSync(f, 'utf8')]));
const idLoc = {};
for (const [f, text] of Object.entries(fileText)) {
  text.split('\n').forEach((l, i) => {
    let m; const q = /'([a-z][a-z0-9_]*)'/g;
    while ((m = q.exec(l))) if (!idLoc[m[1]] && /(\bid:\s*'|^\s*\w+\(\s*'|\{\s*id:\s*')/.test(l.slice(Math.max(0, m.index - 12), m.index + 1))) idLoc[m[1]] = f + ':' + (i + 1);
    const km = /^\s{2,6}([a-z][a-zA-Z0-9_]*)\s*:\s*\{/.exec(l); if (km && !idLoc[km[1]]) idLoc[km[1]] = f + ':' + (i + 1);
  });
}
const locOf = (id) => idLoc[id] || '?';
const fileOf = (id) => (idLoc[id] || '').split(':')[0];
const NATION_OF_FILE = (f) => { const m = /content\/tracks\/([a-z]+)\.js/.exec(f); return m ? m[1] : null; };

const { data } = loadData();
const registry = content.install(createRegistry());

// ── 사전 ──
// 국가·환경 고유어(새는 후보 판정). 값 = 그 낱말이 전제하는 태그/조건(보고용)
const ENV_WORDS = {
  '이동도시': 'nomadic', '플레이트': 'nomadic', '지하 데크': 'nomadic_under', '상층 데크': 'nomadic_upper', '정박지': 'nomadic', '도시가 이동': 'nomadic',
  '격리구역': 'policy:quarantine|euthanasia', '수용소': 'policy:persecute / camp', '감염자 노동법': 'policy', '보험사': 'policy:insurance', '보호비': 'policy:neglect', '안락사': 'policy:euthanasia',
  '징집': 'conscript', '입대': 'conscript', '의무 복무': 'conscript:mandatory', '병무': 'conscript',
  '재앙 대피': 'cat2+', '재앙 경보': 'cat2+', '대피소': 'cat2+', '재앙 정보 전달자': 'cat', '시테러': 'seaborn', '붕괴체': 'collapsal',
  '패밀리': 'siracusa', '벤데타': 'siracusa', '카르네발레': 'siracusa', '기사단': 'kazimierz', '메이저': 'kazimierz', '감정회': 'kazimierz', '스폰서': 'kazimierz',
  '교황청': 'laterano', '공증': 'laterano', '수호총': 'laterano', '산크타': 'race:sankta', '종교재판': 'iberia', '이단심문': 'iberia', '고요함': 'iberia', '깊은 바다': 'aegir|iberia',
  '광산': 'miner_family|rim|ursus', '갱도': 'miner', '광부': 'miner', '피트싱커': 'rim', '라인 랩': 'columbia', '보험': 'columbia|higashi', '개척지': 'columbia', '트리마운츠': 'columbia',
  '흠천감': 'yan', '진룡': 'yan', '과거 시험': 'yan', '관청': 'yan|lungmen', '근위국': 'lungmen', '용문': 'lungmen', '수렵': 'sami|kjerag', '순록': 'sami', '룬': 'sami', '설산': 'kjerag', '카란': 'kjerag', '삼족': 'kjerag', '가주': 'kjerag|yan',
  '궁정': 'leithanien|sargon|victoria', '음악회': 'leithanien', '위치킹': 'leithanien', '공작령': 'victoria', '런디니움': 'victoria', '증기': 'victoria', '더블린': 'tara', '성당 호적부': 'tara',
  '용병': 'kazdel|bolivar', '살카즈': 'race:sarkaz', '바벨': 'kazdel', '군사위원회': 'kazdel', '돔': 'durin', '지하 도시': 'durin', '아미르': 'sargon', '노예': 'sargon|slave', '정글': 'sargon', '싱가스': 'bolivar', '도솔레스': 'bolivar',
  '사제': 'sami|kjerag|laterano', '수도원': 'laterano|kjerag', '신관': 'minos', '신탁': 'minos', '올림': 'minos', '해안': 'coast', '항구': 'coast', '어선': 'coast', '설원': 'sami|kjerag|ursus', '제국 내무성': 'ursus', '황제': 'ursus|leithanien',
};
const NATION_TAGS = new Set(data.nations.map((n) => n.id).concat(['common']));
const ENV_TAG_RE = /^(nation:|born:|track:|aff:|arch:|archetype:|policy:|visit:|rhodes|threat:|home:|nomadic|settled|cat\d|conflict\d|ori\d|camp|prison:|serving|infected|known|ori_stage|born_infected|miner_family|child_labor|working_child|parent:|job:|rel:|race:|papers:|newcomer|migrant|naturalized|itinerant|noble|slave|stigma:|marriage:|homeowner|urban|rural|q\d|school|retired|married|war|trait:|looks:|cap:|M$|F$|female|male|standing:|pos:)/;
const RACE_IDS = new Set(data.races.map((r) => r.id));
const KNOWN_PLAIN = new Set(['infected', 'known', 'camp', 'serving', 'rhodes', 'retired', 'school', 'married', 'war', 'nomadic', 'settled', 'urban', 'rural', 'M', 'F', 'female', 'male', 'born_infected', 'miner_family', 'child_labor', 'working_child', 'itinerant', 'newcomer', 'naturalized', 'migrant', 'noble', 'slave', 'homeowner', 'nomadic_under', 'nomadic_upper', 'settled_ground', 'q1', 'q2', 'q3', 'q4', 'q5', 'ori1', 'ori2', 'ori3', 'cat1', 'cat2', 'cat3', 'conflict1', 'conflict2', 'conflict3', 'ori_stage1', 'ori_stage2', 'ori_stage3', 'rhodes_operator', 'rhodes_contractor', 'rhodes_patient', 'standing:high', ...Object.keys(data.ethnicFlags || {}), ...new Set(data.races.map((r) => r.group).filter(Boolean))]);
const THREATS = new Set(data.nations.flatMap((n) => n.threats || []));
const TRAITS = new Set(data.races.flatMap((r) => r.traits || []));
const POLICIES = new Set(['persecute', 'quarantine', 'euthanasia', 'neglect', 'insurance', 'expel', 'ignore', 'treat', 'favored', ...data.nations.flatMap((n) => (n.policyVariants || []).map((v) => v.policy)), ...data.tracks.map((t) => t.oriPolicyOverride).filter(Boolean)]);
const HOUSING_IDS = new Set(Object.values(data.housing).flatMap((v) => v.types.map((t) => t.id)));
const MARRIAGE_IDS = new Set(Object.values(data.marriage).flatMap((v) => v.types.map((t) => t.id)));
const DEPTS = new Set(data.rhodes.deptList.concat(['patient', 'contractor']));
const PAPERS = new Set(['native', 'legal', 'refugee', 'illegal', 'contract', 'agreement']);
const GRADES = new Set(data.relations.grades);
const STIGMAS = new Set(['infected', 'exile', 'disgrace', 'deserter', 'excommunicated']);
const JOBS = new Set(data.jobs.map((j) => j.id).concat(['homemaker']));
const CANON_NAMES = (data.canonFigures || []).map((f) => f.name).filter((n) => n && n !== '오로라' && (n.length >= 3 || ['켈시', '시즈', '니어', '소라', '굴로', '체르니', '텍사스'].includes(n)));   // '오로라' 는 자연 현상과 동음이라 제외
const hasName = (ko, n) => { let i = -1; while ((i = ko.indexOf(n, i + 1)) >= 0) { const prev = i > 0 ? ko[i - 1] : ' '; if (!/[가-힣]/.test(prev)) return true; } return false; };   // '동굴로' 가 '굴로' 에 걸리지 않게
const YEAR_WORDS = { '체르노보그': 1096, '용문 사변': 1096, '런디니움 (사태|점령|봉쇄|사변|해방)': 1094, '타라 독립': 1098, '힐록 (사태|참사|재앙|봉기)': 1098, '라테라노 사변': 1101, '쉐라그.*(침공|재앙)': 1101, '대분리': 1094, '수도 엔진': 1094, '테레시아': 1094, '트리마운츠 (사건|사태|테러|폭발)': 1096, '바벨.*(해체|붕괴)': 1094, '카즈델 내전': 1090, '1\\d{3}년': 0 };
const FORBIDDEN = ['테라가 아니었다면', '광석병도 재앙도 없는 땅', '신뢰구간', '민감도', '추정', '임시', '1950', 'D9', '시뮬', '현실', '환율은', '묻지 마십시오', '§', 'oriExp', 'catFreq', '플래그', '가중', '메모', '세션', '연줄', '카르니발레'];

// ── 수집 ──
const F = { L1: [], L2: [], L3: [], L4: [], L5: [], L6: [], L7: [], D1: [], D2: [], D3: [], D4: [], D5: [], D6: [] };
const push = (k, id, msg) => F[k].push({ id, loc: locOf(id), msg });
const srcOf = (o) => [o.run, o.build, o.apply, o.c, o.ok, o.w].filter((f) => typeof f === 'function').map((f) => f.toString()).join('\n');
/** 소스 안의 한국어 문자열 리터럴만(코드·식별자 제외) */
const koreanText = (src) => (src.match(/'[^'\n]*[가-힣][^'\n]*'/g) || []).join(' ');

function checkTag(tag, id, kind) {
  const t = tag.startsWith('!') ? tag.slice(1) : tag;
  const [pre, ...rest] = t.split(':'); const val = rest.join(':');
  if (!rest.length) { if (!NATION_TAGS.has(t) && !RACE_IDS.has(t) && !KNOWN_PLAIN.has(t)) push('L2', id, kind + ' 알 수 없는 태그 ' + tag + ' (영원히 열리지 않음)'); return; }
  switch (pre) {
    case 'track': { const [tid, stage] = val.split(':'); const tr = data.trackById[tid]; if (!tr) { push('L2', id, kind + ' 없는 진로 ' + tag); return; } if (stage && !tr.stages.some((s) => s.id === stage)) push('L2', id, kind + ' 없는 단계 ' + tag + ' (단계: ' + tr.stages.map((s) => s.id).join('/') + ')'); return; }
    case 'aff': if (!data.affById[val]) push('L2', id, kind + ' 없는 소속 ' + tag); return;
    case 'nation': case 'visit': case 'born': if (!NATION_TAGS.has(val) && val !== 'rhodes') push('L2', id, kind + ' 없는 국가 ' + tag); return;
    case 'race': if (!RACE_IDS.has(val)) push('L2', id, kind + ' 없는 종족 ' + tag); return;
    case 'arch': if (!ARCHETYPES[val]) push('L2', id, kind + ' 없는 원형 ' + tag); return;
    case 'archetype': if (val !== 'A10') push('L2', id, kind + ' archetype: 는 A10 만 ' + tag); return;
    case 'policy': if (!POLICIES.has(val)) push('L2', id, kind + ' 없는 정책 ' + tag); return;
    case 'home': if (!HOUSING_IDS.has(val)) push('L2', id, kind + ' housing.json 에 없는 주거 ' + tag); return;
    case 'marriage': if (!MARRIAGE_IDS.has(val)) push('L2', id, kind + ' marriage.json 에 없는 혼인 ' + tag); return;
    case 'rhodes': if (!DEPTS.has(val)) push('L2', id, kind + ' 없는 로도스 부서 ' + tag); return;
    case 'papers': if (!PAPERS.has(val)) push('L2', id, kind + ' 없는 papers ' + tag); return;
    case 'rel': if (!GRADES.has(val)) push('L2', id, kind + ' 없는 관계 등급 ' + tag); return;
    case 'stigma': if (!STIGMAS.has(val)) push('L2', id, kind + ' 알 수 없는 낙인 ' + tag); return;
    case 'threat': if (!THREATS.has(val)) push('L2', id, kind + ' 없는 threat ' + tag); return;
    case 'trait': if (!TRAITS.has(val)) push('L2', id, kind + ' 없는 trait ' + tag); return;
    case 'job': case 'parent': if (!JOBS.has(val) && !data.trackById[val]) push('L2', id, kind + ' 없는 직업 ' + tag); return;
    case 'prison': if (!['jail', 'camp'].includes(val)) push('L2', id, kind + ' prison: 은 jail|camp ' + tag); return;
    case 'cap': { const [k, g] = val.split(':'); if (!['skill', 'learn', 'arts', 'ties'].includes(k) || !['low', 'mid', 'high', 'top'].includes(g)) push('L2', id, kind + ' cap 태그 형식 ' + tag); return; }
    case 'looks': if (!['high', 'low'].includes(val)) push('L2', id, kind + ' looks 태그 ' + tag); return;
    case 'standing': case 'pos': return;
    default: push('L2', id, kind + ' 알 수 없는 태그 접두 ' + tag);
  }
}

const all = [...registry.events.map((e) => ({ kind: 'ev', o: e })), ...Object.values(registry.decisions).map((d) => ({ kind: 'dec', o: d })), ...registry.big.map((b) => ({ kind: 'big', o: b }))];
for (const { kind, o } of all) {
  const id = o.id; const tags = o.tags || []; const src = srcOf(o); const ko = koreanText(src);
  for (const tg of tags) checkTag(tg, id, kind);
  // L1: 환경 태그 없음 + 고유어
  const hasEnv = tags.some((t) => ENV_TAG_RE.test(t.replace(/^!/, '')) || NATION_TAGS.has(t.replace(/^!/, '')) || RACE_IDS.has(t.replace(/^!/, ''))) || (kind === 'big' && o.nation);
  const gated = /s\.S\.cur|S\.root|\.nation\.|nomadic\(|under\(|upper\(|home\.type|\.policy|pol\(s\)|conscript|seaborn|collapsal|catFreq|\.rel\b|S\.race|S\.eth|track\b|S\.job|job\.|fellFrom|afterFall|fell\(|lastTrack|S\.flags\.|flags\[|catHits|insuranceLand|canSwitch|enterCom|S\.prison|quarantined|S\.rhodes|S\.ori\./.test(src);   // W14: fell(진로) 후일담도 게이트
  if (!hasEnv && !gated && kind !== 'big') { const hits = Object.keys(ENV_WORDS).filter((w) => ko.includes(w)); if (hits.length) push('L1', id, kind + ' 태그 없음 · 고유어 ' + hits.map((h) => h + '(' + ENV_WORDS[h] + ')').join(', ')); }
  else if (!hasEnv && gated && kind !== 'big') { const hits = Object.keys(ENV_WORDS).filter((w) => ko.includes(w) && ['이동도시', '플레이트', '격리구역', '수용소', '징집', '시테러', '붕괴체'].includes(w) && !new RegExp('(먼 나라|다른 나라|옛|지난) [^\'.]{0,12}' + w).test(ko)); if (hits.length && !/nomadic\(|under\(|upper\(|home\.type|\.policy|pol\(s\)|conscript|seaborn|collapsal|quarantined|oriOutcome|oriPolicy|hidden\(|infCamp|prison/.test(src)) push('L1', id, kind + ' 태그 없음(코드 분기만) · 고유어 ' + hits.join(', ') + ' — 분기가 그 낱말을 가리는지 확인'); }   // W14: 격리·수용소 플래그 분기(quarantined/oriOutcome/oriPolicy)와 '먼 나라 이동도시' 류는 새는 것이 아니다
  // L3: track: 태그 vs 파일 나라
  const fn = NATION_OF_FILE(fileOf(id));
  if (fn && fn !== 'common' && fn !== 'rhodes') for (const tg of tags) { const m = /^track:([A-Z0-9_]+)/.exec(tg); if (m && data.trackById[m[1]]) { const tn = data.trackById[m[1]].nation; const ok = tn === fn || data.nationById[tn] && data.nationById[tn].parent === fn || (fn === 'lungmen' && tn === 'yan') || (fn === 'tara' && tn === 'victoria') || tn === 'common'; if (!ok) push('L3', id, kind + ' ' + tg + ' 진로 나라 ' + tn + ' ≠ 파일 ' + fn); } }
  // L4: 삭제된 필드
  if (/\bst\.sm\b|\bst\.so\b/.test(src)) push('L4', id, kind + ' st.sm/st.so 참조');
  if (/eth\s*===?\s*'outsider'|'outsider'/.test(src) && !/marry_outsider|outsider_/.test(src)) push('L4', id, kind + " eth 'outsider' 참조");
  if (/S\.rhodes\s*=\s*true/.test(src)) push('L4', id, kind + ' S.rhodes = true 직접 합류');
  if (/\bS\.job\s*=(?![=\s]*null)(?!=)/.test(src)) push('L4', id, kind + ' S.job 직접 대입(진로 상태 기계 우회)');   // W14: `= null` 은 아래 규칙이 본다
  if (/\bS\.job\s*=\s*null/.test(src) && !/leaveTrack|S\.track/.test(src)) push('L4', id, kind + ' S.job = null (진로는 다음 연말에 how:content 로 끝남 — 이탈 서사·trackHist 누락)');
  const fxKeys = [...src.matchAll(/fx:\s*\{([^}]*)\}/g)].map((m) => m[1]).join(',');
  if (/\b(sm|so)\s*:/.test(fxKeys)) push('L4', id, kind + ' fx 에 구 sm/so 키(1점=0.01z 로만 흡수, 로그에 표시 안 됨)');
  // L5: 금지어·하드코딩 조사
  for (const f of FORBIDDEN) if (ko.includes(f) && !(f === '임시' && /임시 거처|임시 숙소|임시 막사|임시로/.test(ko)) && !(f === '추정' && /추정 상속|상속 추정/.test(ko)) && !(f === '현실' && /현실적|현실을|현실이|현실은|현실과|비현실/.test(ko)) && !(f === '가중' && /가중 처벌|가중되/.test(ko)) && !(f === '메모' && /메모를|메모가|메모지|메모리|메모장|메모를 남/.test(ko)) && !(f === '세션' && false)) push('L5', id, kind + " 금지어 '" + f + "'");
  if (/\+ '(은|는|이|가|을|를|와|과|로|으로|라고|이라고)[ .,)'!?]/.test(src) || /\}(은|는|이|가|을|를|와|과|로|으로)[ .,)'!?<]/.test(src)) push('L5', id, kind + ' 하드코딩 조사');
  // L6: 캐논 인물 in 반복 이벤트
  if (kind === 'ev' && (o.rep || o.gap)) { const names = CANON_NAMES.filter((n) => hasName(ko, n)); if (names.length) push('L6', id, 'rep/gap 이벤트에 캐논 인물 ' + names.join(',') + (/canonOk|canonSeen/.test(src) ? ' (canonOk 게이트 있음)' : '')); }
  if (kind === 'ev' && !o.rep && !o.gap) { const names = CANON_NAMES.filter((n) => hasName(ko, n)); if (names.length && !/canonOk|canonSeen|year/.test(src)) push('L6', id, '1회성 이벤트에 캐논 인물 ' + names.join(',') + ' — 연도·canonSeen 게이트 없음'); }
  // L7: 연도 고유명 without gate
  if (kind !== 'big') { const yearGate = /\.year\b|Y\(|yr\(s,\s*1\d{3}|year\s*[<>=]|by\s*\+|flags\.(chernobog|londinium|big_)|S\.flags\.war|lifeRoll\(s, '(capital|londinium)/.test(src); for (const [w, y] of Object.entries(YEAR_WORDS)) { if (y === 0) continue; if (new RegExp(w).test(ko) && !yearGate) push('L7', id, kind + " 연도 고유명 '" + w + "'(" + y + ') · 연도 게이트 없음'); } }
}

// ── 파일 수준 L4·L5(함수 바깥 상수·공용 표 포함) ──
for (const [f, text] of Object.entries(fileText)) {
  text.split('\n').forEach((l, i) => {
    const loc = f + ':' + (i + 1);
    if (/\bst\.sm\b|\bst\.so\b/.test(l) && !/^\s*\/\/|\/\*\*/.test(l)) F.L4.push({ id: '(file)', loc, msg: 'st.sm/st.so 참조: ' + l.trim().slice(0, 100) });
    if (/eth\s*===?\s*'outsider'/.test(l)) F.L4.push({ id: '(file)', loc, msg: "eth === 'outsider': " + l.trim().slice(0, 100) });
    if (/S\.rhodes\s*=\s*true/.test(l)) F.L4.push({ id: '(file)', loc, msg: 'S.rhodes = true: ' + l.trim().slice(0, 100) });
    if (/연줄/.test(l) && !/^\s*\/\//.test(l)) F.L5.push({ id: '(file)', loc, msg: "'연줄' 잔존(D52 → 관계): " + l.trim().slice(0, 100) });
    if (/카르니발레/.test(l)) F.L5.push({ id: '(file)', loc, msg: "'카르니발레' → 카르네발레" });
  });
}
// src/ui 도 연줄·sm/so 표시 잔존
for (const f of ['src/ui/text.js', 'src/ui/screens/life.js', 'src/ui/screens/decision.js', 'src/ui/screens/cert.js', 'src/ui/screens/dead.js', 'content/death_texts.js']) {
  const p = path.join(ROOT, f); if (!fs.existsSync(p)) continue;
  fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => { if (/연줄/.test(l) && !/^\s*\/\//.test(l)) F.L5.push({ id: '(ui)', loc: f + ':' + (i + 1), msg: "'연줄' 잔존(D52): " + l.trim().slice(0, 100) }); if (/\bst\.sm\b|\bst\.so\b/.test(l) && !/^\s*\/\//.test(l)) F.L4.push({ id: '(ui)', loc: f + ':' + (i + 1), msg: 'st.sm/st.so: ' + l.trim().slice(0, 100) }); });
}

// ── 데이터 교차 검사 ──
const ADJ = { A1: ['A1', 'A6', 'A10', 'A11'], A2: ['A2', 'A12', 'A4', 'A6', 'A11'], A3: ['A3', 'A8', 'A9', 'A10'], A4: ['A4', 'A6', 'A2', 'A11', 'A1'], A5: ['A5', 'A11'], A6: ['A6', 'A4', 'A1', 'A11', 'A2'], A7: ['A7', 'A8', 'A12', 'A11'], A8: ['A8', 'A3', 'A7', 'A9', 'A11'], A9: ['A9', 'A3', 'A10', 'A8'], A10: ['A10', 'A9', 'A3', 'A11', 'A1'], A11: ['A11', 'A10', 'A5', 'A4', 'A6', 'A2', 'A1', 'A7', 'A12'], A12: ['A12', 'A2', 'A7', 'A11'] };
const ENV_TRACK_RE = /황야|지하|배정|수용소|피트싱커|빈민|슬럼|격리|노예|고아|유목|부족|광산촌|개척|해안|어촌|산지|숲|사막|지하 도시|돔 밖|북조|남조|힐록|아카후알라/;
const HARD_GATE_KEYS = ['region', 'urban', 'status', 'flag', 'infected', 'known', 'prisoner', 'rhodes', 'q', 'eth', 'papers', 'newcomer', 'race', 'sex'];
const affTagEvents = {};
for (const e of registry.events) for (const tg of e.tags || []) { const m = /^aff:([A-Z0-9_]+)/.exec(tg); if (m) { const a = data.affById[m[1]]; if (a) for (const tid of a.track) (affTagEvents[tid] || (affTagEvents[tid] = new Set())).add(e.id); } }
for (const t of data.tracks) {
  if (t.synthetic) continue;
  const loc = 'data/tracks/' + (t.nation === 'common' ? 'common' : t.nation === 'rhodes' ? 'rhodes' : t.nation) + '.json#' + t.id;
  // D1 출생 환경 전용 진로인데 하드 게이트 없음
  if (ENV_TRACK_RE.test(t.name) && !t.forcedEntry && !t.noClasses) {
    const hard = t.entry.gates.filter((g) => g.weight == null && HARD_GATE_KEYS.some((k) => g[k] != null));
    if (!hard.length) F.D1.push({ id: t.id, loc, msg: t.name + '(' + t.archetype + ') 환경 이름인데 하드 게이트 없음 · gates=' + JSON.stringify(t.entry.gates) + (t.region ? ' region=' + t.region + '(가중만)' : '') });
    else if (t.region && !t.entry.gates.some((g) => g.region && g.weight == null)) F.D1.push({ id: t.id, loc, msg: t.name + ' region=' + t.region + ' 인데 region 하드 게이트 없음(×regionOffMul 가중만) · 하드 게이트=' + JSON.stringify(hard) });
  }
  // D2 exits.switch 원형 비인접
  for (const to of t.exits.switch) { const tt = data.trackById[to]; if (tt && !ADJ[t.archetype].includes(tt.archetype)) F.D2.push({ id: t.id, loc, msg: t.name + '(' + t.archetype + ') → ' + tt.name + '(' + tt.archetype + ')' }); if (tt && tt.nation !== t.nation && tt.nation !== 'common' && tt.nation !== 'rhodes' && t.nation !== 'common' && t.nation !== 'rhodes') F.D2.push({ id: t.id, loc, msg: t.name + ' → 타국 진로 ' + tt.id + '(' + tt.nation + ') — switch 가 이주를 일으킴(enterTrack 규칙)' }); }
  // D3 income.stage 0
  t.income.stage.forEach((v, i) => { if (!(v > 0) && !(t.archetype === 'A5' || t.forcedEntry || /PATIENT|STUDENT|SEMINARY|APPRENT|NOVICE|TRAINEE|INFECTED|CAMP|QUAR|PRISON/.test(t.id))) F.D3.push({ id: t.id, loc, msg: t.name + ' income.stage[' + i + '] = ' + v + ' (' + (t.stages[i] ? t.stages[i].id : '?') + ')' }); });
  // D4 소속 없는데 aff 변주 이벤트
  if (!t.affiliations.length && affTagEvents[t.id]) F.D4.push({ id: t.id, loc, msg: t.name + ' affiliations 비어 있는데 aff: 이벤트 ' + [...affTagEvents[t.id]].slice(0, 5).join(',') });
}
// D4b: 콘텐츠가 aff: 로 참조하는 소속의 track 이 그 소속 목록에 없음(= 영원히 안 열림)은 L2 가 잡는다. 소속이 있는데 콘텐츠 변주 0 인 진로
{ const affEv = new Set(registry.events.flatMap((e) => (e.tags || []).filter((t) => t.startsWith('aff:')).map((t) => t.slice(4))));
  const noVar = data.affiliations.filter((a) => !affEv.has(a.id) && !registry.events.some((e) => srcOf(e).includes("'" + a.id + "'")));
  F.D4.push({ id: '(aff)', loc: 'data/affiliations.json', msg: '소속 ' + data.affiliations.length + '개 중 콘텐츠(aff: 태그·소스)가 한 번도 참조하지 않는 소속 ' + noVar.length + '개 (예: ' + noVar.slice(0, 12).map((a) => a.id).join(', ') + '…) — 변주 없음은 결함이 아니라 공백' }); }
// D5 relations.json 쌍 vs 차별 문장: 차별 문장이 있는 이벤트의 국가·종족 태그 조합이 매트릭스에 없거나 neutral
{ const DIS = /종족 때문에|흔치 않은 종족|흔하지 않은 종족|뿔 때문에|꼬리 때문에|종족을 이유로|종족이 다르다는 이유|멸시|차별|편견/;
  for (const e of registry.events) { const ko = koreanText(srcOf(e)); if (!DIS.test(ko)) continue; const tags = e.tags || []; const hasRel = tags.some((t) => /^rel:/.test(t)) || /\.rel\b|relOf|S\.rel/.test(srcOf(e)); const races = tags.filter((t) => RACE_IDS.has(t) || t.startsWith('race:')).map((t) => t.replace('race:', '')); const nats = tags.filter((t) => NATION_TAGS.has(t) || t.startsWith('nation:')).map((t) => t.replace('nation:', ''));
    if (!hasRel && !races.length) F.D5.push({ id: e.id, loc: locOf(e.id), msg: '차별 문장인데 rel:/종족 게이트 없음(태그 ' + tags.join(',') + ')' });
    for (const r of races) for (const n of nats.length ? nats : ['(국가 태그 없음)']) { const pair = data.relations.pairs.find((p) => (p.nation === n) && (p.race === r || (Array.isArray(p.race) && p.race.includes(r)) || (typeof p.race === 'string' && p.race.startsWith('!') && p.race.slice(1) !== r))); if (!pair && !(r === 'sarkaz')) F.D5.push({ id: e.id, loc: locOf(e.id), msg: '차별 문장 ' + n + '×' + r + ' — relations.json 에 쌍 없음(기본 neutral)' }); } } }
// D6 marriage/housing 유형 참조: marry_<type> 결정 id·setHousing('id')·home:/marriage: 태그
{ for (const id of Object.keys(registry.decisions)) { const m = /^marry_(.+)$/.exec(id); if (m && m[1] !== 'second' && !MARRIAGE_IDS.has(m[1])) F.D6.push({ id, loc: locOf(id), msg: '결정 ' + id + ' 유형이 marriage.json 에 없음' }); }
  for (const { o } of all) { const src = srcOf(o); for (const m of src.matchAll(/setHousing\(\s*'([a-z_]+)'/g)) if (!HOUSING_IDS.has(m[1])) F.D6.push({ id: o.id, loc: locOf(o.id), msg: "setHousing('" + m[1] + "') housing.json 에 없음" }); }
  // marriage.json 유형별 '거주국에 그 유형이 없는데 디스패처에 등록' 은 _dispatch 가 거주국만 부르므로 문제 없음. 반대로 유형은 있는데 결정 핸들러가 없는 (국가, 유형) 은 엔진 기본 문구
  const missing = [];
  for (const [nid, v] of Object.entries(data.marriage)) { if (nid.startsWith('_')) continue; for (const t of v.types) if (!registry.decisions['marry_' + t.id]) missing.push(nid + ':' + t.id); }
  if (missing.length) F.D6.push({ id: '(marriage)', loc: 'data/marriage.json', msg: '결정 핸들러(marry_<type>) 없이 엔진 기본 문구로만 뜨는 유형 ' + missing.length + ': ' + missing.join(', ') });
  const hm = [];
  for (const [nid, v] of Object.entries(data.housing)) { if (nid.startsWith('_')) continue; for (const t of v.types) if (!registry.events.some((e) => (e.tags || []).includes('home:' + t.id)) && !Object.values(fileText).some((txt) => txt.includes("'" + t.id + "'"))) hm.push(nid + ':' + t.id); }
  if (hm.length) F.D6.push({ id: '(housing)', loc: 'data/housing.json', msg: '콘텐츠가 어디서도 참조하지 않는 주거 유형 ' + hm.length + ': ' + hm.slice(0, 30).join(', ') + (hm.length > 30 ? '…' : '') }); }

// ── 출력 ──
const TITLE = { L1: 'L1 태그 없는 이벤트의 국가·환경 고유어(새는 후보)', L2: 'L2 존재하지 않는·알 수 없는 태그', L3: 'L3 track: 태그가 파일 나라와 다름', L4: 'L4 삭제된 필드·우회 대입', L5: 'L5 금지어·연줄·카르니발레·하드코딩 조사', L6: 'L6 캐논 인물 게이트', L7: 'L7 연도 고유명 게이트 없음',
  D1: 'D1 출생 환경 전용 진로의 하드 게이트', D2: 'D2 exits.switch 원형 비인접·타국', D3: 'D3 income.stage 0', D4: 'D4 소속 vs 변주 이벤트', D5: 'D5 relations.json vs 차별 문장', D6: 'D6 marriage/housing 참조' };
let total = 0;
for (const k of Object.keys(F)) {
  console.log('\n' + '═'.repeat(100) + '\n' + TITLE[k] + ' — ' + F[k].length + '건');
  const byFile = {};
  for (const x of F[k]) { const f = x.loc.split(':')[0]; byFile[f] = (byFile[f] || 0) + 1; }
  if (F[k].length > 15) console.log('  파일별: ' + Object.entries(byFile).sort((a, b) => b[1] - a[1]).map(([f, n]) => f + ' ' + n).join(', '));
  for (const x of F[k].slice(0, 60)) console.log('  ' + x.loc.padEnd(38) + ' ' + x.id.padEnd(28) + ' ' + x.msg);
  if (F[k].length > 60) console.log('  … 외 ' + (F[k].length - 60) + '건');
  total += F[k].length;
}
console.log('\n합계 ' + total + '건');
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), findings: F }, null, 1));
