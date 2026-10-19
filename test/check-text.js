// 문장 검사: node test/check-text.js [N=300] [seed=w6]
// N명을 자동 시뮬로 돌려 기록·결정 모달·출생 신고서·사망 기록·공유문을 전부 모은 뒤
//   1) 조사 오류(D30): 데이터에서 온 낱말(이름·음식·기관·직업·국가·종족 …) 뒤의 은/는·이/가·을/를·과/와·으로/로가 받침과 맞는지
//   2) 소스 하드코딩: "+ '는 " 같은 변수 뒤 고정 조사 패턴
//   3) 금지 문구(D25): 메타·현실·추정 표시
//   4) 각주 비율(D31): 이벤트 기록 중 각주가 붙은 비율(목표 10~20%)
// 조사 오류·하드코딩·금지 문구가 하나라도 있으면 exit 1.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareData } from '../src/engine/data.js';
import { createRegistry } from '../src/engine/content.js';
import { createSim } from '../src/engine/sim.js';
import { hasBatchim, lastJong } from '../src/engine/text.js';
import content from '../content/index.js';
import { birthSummary, deathSummary, deathCompare, reflection, deathRecordText, nationStatRows } from '../src/ui/text.js';
import { deathTexts } from '../content/death_texts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = parseInt(process.argv[2] || '300', 10);
const SEED = process.argv[3] || 'w6';

function loadData() {
  const raw = {};
  for (const f of ['nations', 'races', 'jobs', 'causes', 'names', 'stats1950']) raw[f] = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f + '.json'), 'utf8'));
  const terra = path.join(ROOT, 'data', 'terra_e0.json');
  if (fs.existsSync(terra)) raw.terra = JSON.parse(fs.readFileSync(terra, 'utf8'));
  return { data: prepareData(raw), raw };
}

// ── 어휘: 조사 검사 대상이 되는 데이터 낱말 ──
function vocabulary(data, raw) {
  const V = new Set();
  const add = (w) => { if (typeof w === 'string') { const s = w.trim(); if (s.length >= 2) V.add(s); } };
  for (const n of data.nations) {
    add(n.name); add(n.statOrg);
    const c = n.culture || {};
    for (const k of ['greet', 'address', 'elder', 'food', 'ruler', 'rulerTitle', 'drink']) { add(c[k]); if (c[k]) for (const part of String(c[k]).split(/와 |과 /)) add(part); }
    for (const f of c.festivals || []) add(f);
  }
  for (const r of data.races) add(r.name);
  for (const j of data.jobs) add(j.name);
  for (const c of data.causes) add(c.label);
  const names = raw.names || {};
  for (const [k, pool] of Object.entries(names)) {
    if (!pool || typeof pool !== 'object') continue;
    for (const key of ['m', 'f', 's']) for (const w of pool[key] || []) add(w);
  }
  return [...V].sort((a, b) => b.length - a.length);
}

const PARTICLES = ['으로', '은', '는', '이', '가', '을', '를', '과', '와', '로', '이라고', '라고'];
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
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function buildChecker(vocab) {
  // 공백·문장 시작·여는 괄호/따옴표 뒤의 어휘 + 조사 + 경계
  const alt = vocab.map(escapeRe).join('|');
  const re = new RegExp('(^|[\\s(「"\'‘“])(' + alt + ')(으로|이라고|라고|은|는|이|가|을|를|과|와|로)(?=$|[\\s.,!?)」"\'’”])', 'g');
  return (text) => {
    const out = [];
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      const word = m[2], p = m[3];
      const exp = expectParticle(word, p);
      if (exp !== p) out.push({ word, p, exp, at: m.index, text });
    }
    return out;
  };
}

// ── 금지 문구(D25) ──
const FORBIDDEN = [
  '테라가 아니었다면', '광석병도 재앙도 없는 땅', /이 땅이 [0-9.]+년을 가져갔/, '신뢰구간', '민감도', '추정', '임시', '창작', '1950', 'D9', '시뮬', '현실',
  '환율은', '묻지 마십시오', '§', 'conflict', 'oriExp', 'catFreq', 'threat:', 'nation:', 'canon', '플래그', '가중', '메모', '세션',
];
const FORBIDDEN_ALLOW = ['비공식 팬 창작'];   // 시작 화면 면책 한 줄(D25)만 허용
function forbiddenIn(text) {
  const hits = [];
  for (const f of FORBIDDEN) {
    const m = typeof f === 'string' ? text.includes(f) : f.test(text);
    if (m && !FORBIDDEN_ALLOW.some((a) => text.includes(a) && f === '창작')) hits.push(typeof f === 'string' ? f : f.source);
  }
  return hits;
}

// ── 소스 하드코딩 조사 ──
function scanSource() {
  const files = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js') && e.name !== 'dummy.js') files.push(p); } };
  walk(path.join(ROOT, 'content')); walk(path.join(ROOT, 'src'));
  const re = /\+ '(은|는|이|가|을|를|와|과|로|으로|라고|이라고)[ .,)'!?]/;
  const re2 = /\}(은|는|이|가|을|를|와|과|로|으로)[ .,)'!?<]/;
  const hits = [];
  for (const f of files) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => { if (re.test(l) || re2.test(l)) hits.push(path.relative(ROOT, f) + ':' + (i + 1)); });
  }
  return hits;
}

function main() {
  const { data, raw } = loadData();
  const registry = content.install(createRegistry());
  const vocab = vocabulary(data, raw);
  const check = buildChecker(vocab);
  // 자가 점검: 검사기가 오용을 실제로 잡는지
  if (!check('필라인는 흔치 않은 종족입니다. 빵를 먹었다.').length) throw new Error('check-text 자가 점검 실패: 조사 오용을 잡지 못함');
  if (check('필라인은 흔치 않은 종족입니다. 빵을 먹었다.').length) throw new Error('check-text 자가 점검 실패: 올바른 조사를 오용으로 봄');

  const texts = [];           // { src, t }
  const logStat = { ev: 0, evF: 0, dec: 0, decF: 0 };
  const push = (src, t) => { if (t && typeof t === 'string') texts.push({ src, t }); };
  let errors = 0;

  for (let i = 0; i < N; i++) {
    const hooks = {
      log: (e) => {
        push('log:' + e.k, e.t); if (e.f) push('log-f:' + e.k, e.f);
        if (e.k !== 'dec') { logStat.ev++; if (e.f) logStat.evF++; }
      },
      decision: (pd) => {
        const v = pd.view;
        logStat.dec++; if (v.fact) logStat.decF++;
        push('dec:' + pd.id, v.title); push('dec:' + pd.id, v.body); if (v.fact) push('dec-f:' + pd.id, v.fact);
        for (const c of v.choices || []) { push('dec-ch:' + pd.id, c.label); if (c.sub) push('dec-ch:' + pd.id, c.sub); }
      },
    };
    const sim = createSim({ data, seed: SEED + ':' + i, content: registry, auto: true, hooks });
    try {
      const S = sim.newLife();
      push('birth', birthSummary(sim));
      for (const r of nationStatRows(sim, sim.nation)) { push('nation', r[1]); push('nation-f', r[2]); }
      sim.start();
      let guard = 0;
      while (S.phase === 'life') { sim.runYear(); if (++guard > 500) throw new Error('500년 초과'); }
      push('death', deathSummary(sim));
      for (const c of deathCompare(sim)) { push('death-cmp', c.t); push('death-cmp-f', c.f); }
      for (const l of reflection(sim)) push('death-ref', l);
      push('share', deathRecordText(sim));
      const dt = deathTexts(sim);
      push('death-line', dt.line); push('death-line-f', dt.f); push('death-rite', dt.rite); push('death-rite-f', dt.riteF); if (dt.note) push('death-note', dt.note);
    } catch (e) { errors++; if (errors <= 3) console.error('[#' + i + '] ' + (e && e.stack || e)); }
  }

  // 1) 조사
  const bad = [];
  for (const x of texts) for (const h of check(x.t)) bad.push({ ...h, src: x.src });
  const badKey = {};
  for (const b of bad) { const k = b.word + b.p + '→' + b.exp + ' @' + b.src; badKey[k] = (badKey[k] || 0) + 1; }
  console.log('문장 ' + texts.length + '개 검사 (N=' + N + ', seed=' + SEED + ', 어휘 ' + vocab.length + '개, 예외 ' + errors + '건)');
  console.log('조사 오류: ' + bad.length + '건' + (bad.length ? '' : ' ✓'));
  for (const [k, n] of Object.entries(badKey).sort((a, b) => b[1] - a[1]).slice(0, 30)) {
    const ex = bad.find((b) => b.word + b.p + '→' + b.exp + ' @' + b.src === k);
    console.log('  ' + n + '× ' + k + '  예: …' + ex.text.slice(Math.max(0, ex.at - 20), ex.at + ex.word.length + 12).replace(/\n/g, ' ') + '…');
  }
  // 2) 소스
  const src = scanSource();
  console.log('소스 하드코딩 조사: ' + src.length + '곳' + (src.length ? '\n  ' + src.join('\n  ') : ' ✓'));
  // 3) 금지 문구
  const forb = [];
  for (const x of texts) for (const h of forbiddenIn(x.t)) forb.push({ h, src: x.src, t: x.t });
  const forbKey = {};
  for (const f of forb) { const k = f.h + ' @' + f.src; forbKey[k] = (forbKey[k] || 0) + 1; }
  console.log('금지 문구(D25): ' + forb.length + '건' + (forb.length ? '' : ' ✓'));
  for (const [k, n] of Object.entries(forbKey).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    const ex = forb.find((f) => f.h + ' @' + f.src === k);
    console.log('  ' + n + '× ' + k + '  예: ' + ex.t.slice(0, 90).replace(/\n/g, ' '));
  }
  // 4) 각주 비율
  const evR = logStat.ev ? logStat.evF / logStat.ev : 0;
  const decR = logStat.dec ? logStat.decF / logStat.dec : 0;
  console.log('각주 비율(D31): 이벤트 기록 ' + (evR * 100).toFixed(1) + '% (' + logStat.evF + '/' + logStat.ev + ', 목표 10~20%) · 결정 모달 fact ' + (decR * 100).toFixed(1) + '% (' + logStat.decF + '/' + logStat.dec + ')');
  const ok = !bad.length && !src.length && !forb.length && !errors;
  console.log(ok ? '통과' : '실패');
  if (!ok) process.exitCode = 1;
}

main();
