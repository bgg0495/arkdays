// W9h 검증용 시뮬: node test/sim-w9h.js [N=500] [seed=w9h]
// content/index.js 뒤에 W9h 팩(kazdel·durin·rhodes·common)을 등록하고 N명을 돌린다(더미 진로 팩은 뺀다).
//   1) 예외 0 확인  2) W9h 이벤트·결정 발화 수(0인 id 목록)  3) 로도스 부서×신분 강제 합류 시나리오에서 발화 0인 조합 확인
//   4) W9h 텍스트의 D25 금지 문구·소스 하드코딩 조사 검사
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareData } from '../src/engine/data.js';
import { createRegistry } from '../src/engine/content.js';
import { createSim } from '../src/engine/sim.js';
import { hasBatchim, lastJong } from '../src/engine/text.js';
import content from '../content/index.js';
import kazdel from '../content/tracks/kazdel.js';
import durin from '../content/tracks/durin.js';
import rhodes from '../content/tracks/rhodes.js';
import common from '../content/tracks/common.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadData(root = ROOT) {
  const raw = {}; const used = {};
  const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const f of ['nations', 'races', 'jobs', 'causes', 'names', 'stats1950']) { raw[f] = readJson(path.join(root, 'data', f + '.json')); used[f] = 'data'; }
  const terraFile = path.join(root, 'data', 'terra_e0.json'); if (fs.existsSync(terraFile)) { raw.terra = readJson(terraFile); used.terra = 'data'; }
  const tracksDir = path.join(root, 'data', 'tracks'); const trackFiles = fs.readdirSync(tracksDir).filter((f) => f.endsWith('.json')).sort();
  raw.tracks = trackFiles.map((f) => readJson(path.join(tracksDir, f))); used.tracks = 'data/tracks(' + trackFiles.length + ')';
  for (const f of ['affiliations', 'relations', 'marriage', 'housing', 'rhodes', 'canon_figures']) { const real = path.join(root, 'data', f + '.json'); if (fs.existsSync(real)) { raw[f] = readJson(real); used[f] = 'data'; } }
  return { data: prepareData(raw), used };
}
const N = parseInt(process.argv[2] || '500', 10);
const SEED = process.argv[3] || 'w9h';
const PACKS = { kazdel, durin, rhodes, common };
const FORBIDDEN = ['테라가 아니었다면', '신뢰구간', '민감도', '추정', '임시', '창작', '1950', 'D9', '시뮬', '현실', '환율은', '묻지 마십시오', '§', 'conflict', 'oriExp', 'catFreq', 'threat:', 'nation:', 'canon', '플래그', '가중', '메모', '세션'];

// ── 발화 계수: 이벤트 run / 결정 build·apply 를 감싼다 ──
const fired = {};          // id → 횟수
const texts = [];          // { id, t }
const ownIds = new Set();
function wrapPack(name, pack) {
  for (const e of pack.events) {
    ownIds.add(e.id); fired[e.id] = 0;
    const run = e.run;
    e.run = (s) => { fired[e.id]++; const r = run(s); if (r) { const t = typeof r === 'string' ? r : r.t; if (t) texts.push({ id: e.id, t }); if (r && r.f) texts.push({ id: e.id + ':f', t: r.f }); } return r; };
  }
  for (const [id, d] of Object.entries(pack.decisions)) {
    ownIds.add(id); fired[id] = 0; fired[id + ':apply'] = 0;
    const build = d.build, apply = d.apply;
    d.build = (s, p) => { const v = build(s, p); if (v) { fired[id]++; texts.push({ id, t: v.title }); texts.push({ id, t: v.body }); if (v.fact) texts.push({ id: id + ':f', t: v.fact }); for (const c of v.choices || []) { texts.push({ id, t: c.label }); if (c.sub) texts.push({ id, t: c.sub }); } } return v; };
    d.apply = (s, k, p, text) => { fired[id + ':apply']++; const r = apply(s, k, p, text); if (r) { const t = typeof r === 'string' ? r : r.t; if (t) texts.push({ id: id + ':' + k, t }); } return r; };
  }
}
for (const [name, p] of Object.entries(PACKS)) wrapPack(name, p);

function buildRegistry(data) {
  const registry = content.install(createRegistry());
  for (const p of Object.values(PACKS)) registry.use(p);
  return registry;
}

function runLife(data, registry, seed, hook) {
  const sim = createSim({ data, seed, content: registry, auto: true });
  const S = sim.newLife();
  sim.start();
  let guard = 0;
  while (S.phase === 'life') { if (hook) hook(sim); sim.runYear(); if (++guard > 500) throw new Error('500년 초과'); }
  return S;
}

function main() {
  const { data, used } = loadData();
  console.log('데이터:', Object.entries(used).map(([k, v]) => k + '←' + v).join(' '));
  const registry = buildRegistry(data);
  const own = Object.values(PACKS).reduce((a, p) => a + p.events.length, 0);
  const ownDec = Object.values(PACKS).reduce((a, p) => a + Object.keys(p.decisions).length, 0);
  console.log('콘텐츠: 이벤트 ' + registry.events.length + '(W9h ' + own + ') / 결정 ' + Object.keys(registry.decisions).length + '(W9h ' + ownDec + ', rhodes_offer 덮어씀=' + (registry.decisions.rhodes_offer && registry.decisions.rhodes_offer.build === rhodes.decisions.rhodes_offer.build) + ')');
  for (const [k, p] of Object.entries(PACKS)) console.log('  ' + k + ': 이벤트 ' + p.events.length + ' / 결정 ' + Object.keys(p.decisions).length);

  // 1) 일반 시뮬
  let errors = 0; const agg = { lives: 0, kazdel: 0, durin: 0, rhodes: 0, rhodesVia: {}, rhodesStatus: {}, commonTrack: 0, byNationTrack: {} };
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    try {
      const S = runLife(data, registry, SEED + ':' + i);
      agg.lives++;
      if (S.born === 'kazdel') agg.kazdel++;
      if (S.born === 'durin') agg.durin++;
      if (S.rhodes) { agg.rhodes++; agg.rhodesVia[S.rhodes.via] = (agg.rhodesVia[S.rhodes.via] || 0) + 1; agg.rhodesStatus[S.rhodes.status + ':' + S.rhodes.dept] = (agg.rhodesStatus[S.rhodes.status + ':' + S.rhodes.dept] || 0) + 1; }
      for (const h of S.trackHist || []) if (h.id.startsWith('COM_')) { agg.commonTrack++; break; }
      for (const h of (S.trackHist || []).concat(S.track ? [S.track] : [])) { const t = data.trackById[h.id]; if (t && ['kazdel', 'durin', 'rhodes', 'common'].includes(t.nation)) agg.byNationTrack[h.id] = (agg.byNationTrack[h.id] || 0) + 1; }
    } catch (e) { errors++; if (errors <= 5) console.error('[#' + i + '] ' + (e && e.stack || e)); }
  }
  console.log('\n[일반] N=' + N + ' seed=' + SEED + ' 예외 ' + errors + '건 (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
  console.log('  출생 카즈델 ' + agg.kazdel + ' / 두린 ' + agg.durin + ' / 로도스 합류 ' + agg.rhodes + ' (' + (agg.rhodes / Math.max(1, agg.lives) * 100).toFixed(1) + '%) via ' + JSON.stringify(agg.rhodesVia) + ' 신분:부서 ' + JSON.stringify(agg.rhodesStatus));
  console.log('  COM_* 경험 ' + agg.commonTrack + ' / 진로 경험(담당 국가): ' + Object.entries(agg.byNationTrack).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '));

  // 2) 카즈델·두린 집중 시뮬(출생 국가 고정) — 발화 수를 채운다
  const focus = { kazdel: Math.max(60, Math.round(N * 0.4)), durin: Math.max(40, Math.round(N * 0.3)), 'kazdel:1050': Math.max(40, Math.round(N * 0.2)) };
  for (const [nation, n] of Object.entries(focus)) {
    let err = 0;
    for (let i = 0; i < n; i++) {
      try {
        const sim = createSim({ data, seed: SEED + ':' + nation + ':' + i, content: registry, auto: true });
        const [nat, byStr] = nation.split(':'); const S = sim.newLife(byStr ? { nation: nat, by: 1050 + (i % 30) } : { nation: nat });
        sim.start();
        let guard = 0;
        while (S.phase === 'life') { sim.runYear(); if (++guard > 500) throw new Error('500년 초과'); }
      } catch (e) { err++; errors++; if (err <= 3) console.error('[' + nation + ' #' + i + '] ' + (e && e.stack || e)); }
    }
    console.log('[집중 ' + nation + '] ' + n + '명, 예외 ' + err);
  }

  // 2b) 강제 진로 진입 시나리오(출생 연도 범위 밖·classes 없는 진로의 단계 이벤트를 밟아 본다)
  const forced = [['KZD_COMMISSION', 'kazdel', 1062], ['KZD_BABEL', 'kazdel', 1050], ['KZD_SLAVE', 'kazdel', 1065], ['KZD_DIASPORA', 'kazdel', 1085], ['KZD_ASSASSIN', 'kazdel', 1085], ['KZD_FACTORY', 'kazdel', 1085], ['KZD_CONFESSOR', 'kazdel', 1085], ['KZD_CHILD', 'kazdel', 1088], ['DUR_LIFT', 'durin', 1085], ['DUR_SURFACE', 'durin', 1085], ['COM_BLACKSTEEL_EXCHANGE', 'columbia', 1080], ['COM_MERC_STATE', 'victoria', 1085], ['COM_MERC_PMC', 'columbia', 1085], ['COM_BOUNTY', 'bolivar', 1085], ['COM_PENGUIN', 'lungmen', 1085], ['COM_CC', 'columbia', 1085], ['COM_PENGUIN_IDOL', 'lungmen', 1088], ['RHO_CONTRACTOR', 'kazdel', 1085]];
  const forcedRes = {};
  for (const [id, nation, by] of forced) {
    let ent = 0, err = 0; const t = data.trackById[id]; const age0 = Math.max(t.entry.ages[0], id === 'KZD_CHILD' ? 7 : 16);
    for (let i = 0; i < 10; i++) {
      try {
        const sim = createSim({ data, seed: SEED + ':force:' + id + ':' + i, content: registry, auto: true });
        const S = sim.newLife({ nation, by: by + (i % 8), race: nation === 'kazdel' ? 'sarkaz' : undefined });
        sim.start(); let done = false, guard = 0;
        while (S.phase === 'life') { if (!done && S.age === age0 + (i % 3)) { done = true; if (id.startsWith('RHO_')) { sim.joinRhodes('agreement', { quiet: true }); } if (sim.enterTrack(id, { how: 'enter', skipExam: true, quiet: true })) ent++; } sim.runYear(); if (++guard > 500) throw new Error('500년 초과'); }
      } catch (e) { err++; errors++; if (err <= 2) console.error('[force ' + id + ' #' + i + '] ' + (e && e.stack || e)); }
    }
    forcedRes[id] = ent + (err ? '(예외 ' + err + ')' : '');
  }
  console.log('[강제 진로] 진입 성공/10: ' + Object.entries(forcedRes).map(([k, v]) => k + ' ' + v).join(', '));

  // 3) 로도스 부서×신분 강제 합류 시나리오
  const combos = [['operator', 'field', 'RHO_OPERATOR'], ['operator', 'medical', 'RHO_MEDICAL'], ['operator', 'engineer', 'RHO_ENGINEER'], ['operator', 'logistics', 'RHO_LOGISTICS'], ['operator', 'hr', 'RHO_HR'], ['operator', 'purchase', 'RHO_PURCHASE'], ['operator', 'office', 'RHO_OFFICE'], ['contractor', 'field', 'RHO_CONTRACTOR'], ['patient', 'medical', 'RHO_PATIENT'], ['patient', 'logistics', 'RHO_PATIENT']];
  const comboFired = {};
  const rhoEvents = rhodes.events;
  const perLife = 12;
  for (const [status, dept, track] of combos) {
    const key = status + ':' + dept; comboFired[key] = { lives: 0, deptEv: 0, statusEv: 0, trackEv: 0, err: 0 };
    for (let i = 0; i < perLife; i++) {
      const before = {}; for (const e of rhoEvents) before[e.id] = fired[e.id];
      try {
        let joined = false;
        runLife(data, registry, SEED + ':rho:' + key + ':' + i, (sim) => {
          const S = sim.S;
          if (!joined && S.age === 18 + (i % 5) && !S.rhodes) {
            if (status === 'patient' && !S.ori.on) sim.infect('test');
            if (status === 'patient') S.ori.known = true;
            sim.joinRhodes(status === 'contractor' ? 'agreement' : status === 'patient' ? 'treatment' : 'volunteer', { place: { status, dept, track }, quiet: true });
            if (status === 'contractor' && !S.track) sim.enterTrack(track, { how: 'rhodes', via: 'agreement', quiet: true });
            joined = !!S.rhodes;
          }
        });
        comboFired[key].lives++;
      } catch (e) { comboFired[key].err++; errors++; if (comboFired[key].err <= 2) console.error('[rho ' + key + ' #' + i + '] ' + (e && e.stack || e)); }
      for (const e of rhoEvents) { const d = fired[e.id] - before[e.id]; if (!d) continue; if (e.tags.includes('rhodes:' + dept)) comboFired[key].deptEv += d; if (e.tags.includes('rhodes_' + status)) comboFired[key].statusEv += d; if (e.tags.some((t) => t.startsWith('track:' + track))) comboFired[key].trackEv += d; }
    }
  }
  console.log('\n[로도스 강제 합류] 조합당 ' + perLife + '명 — 부서 태그 / 신분 태그 / 진로 태그 발화 수');
  let zeroCombo = 0;
  for (const [k, v] of Object.entries(comboFired)) { const zero = !v.deptEv || !v.statusEv || !v.trackEv; if (zero) zeroCombo++; console.log('  ' + k.padEnd(20) + ' dept ' + String(v.deptEv).padStart(4) + ' status ' + String(v.statusEv).padStart(4) + ' track ' + String(v.trackEv).padStart(4) + (v.err ? ' 예외 ' + v.err : '') + (zero ? '  ← 0 있음' : '')); }

  // 4) 발화 0 id
  const zeroEv = [], zeroDec = [];
  for (const [name, p] of Object.entries(PACKS)) {
    for (const e of p.events) if (!fired[e.id]) zeroEv.push(name + ':' + e.id);
    for (const id of Object.keys(p.decisions)) if (!fired[id]) zeroDec.push(name + ':' + id);
  }
  const total = Object.values(PACKS).reduce((a, p) => a + p.events.length, 0);
  console.log('\n[발화] W9h 이벤트 ' + (total - zeroEv.length) + '/' + total + ' 발화, 결정 ' + (ownDec - zeroDec.length) + '/' + ownDec);
  if (zeroEv.length) console.log('  발화 0 이벤트(' + zeroEv.length + '): ' + zeroEv.join(' '));
  if (zeroDec.length) console.log('  발화 0 결정(' + zeroDec.length + '): ' + zeroDec.join(' '));
  const top = Object.entries(fired).filter(([k]) => ownIds.has(k)).sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log('  상위: ' + top.map(([k, v]) => k + ' ' + v).join(', '));

  // 5) 금지 문구·각주 비율
  const forb = [];
  for (const x of texts) for (const f of FORBIDDEN) if (x.t.includes(f)) forb.push(f + ' @' + x.id + ' : ' + x.t.slice(0, 60));
  const uniq = [...new Set(forb)];
  console.log('\n[텍스트] 수집 ' + texts.length + '건, 금지 문구 ' + uniq.length + '건' + (uniq.length ? '\n  ' + uniq.slice(0, 20).join('\n  ') : ' ✓'));
  const evTexts = texts.filter((x) => !x.id.includes(':f')).length, fTexts = texts.filter((x) => x.id.endsWith(':f')).length;
  console.log('  각주 비율(W9h 기록 기준): ' + (fTexts / Math.max(1, evTexts) * 100).toFixed(1) + '% (' + fTexts + '/' + evTexts + ', 목표 10~20%)');
  // 조사(D30): check-text.js 와 같은 규칙(데이터 어휘 + 조사 + 경계). 어휘에 진로·단계·소속 이름을 더했다.
  const vocab = (() => { const V = new Set(); const addW = (w) => { if (typeof w === 'string') { const x = w.trim(); if (x.length >= 2) V.add(x); } };
    for (const n of data.nations) { addW(n.name); addW(n.statOrg); const c = n.culture || {}; for (const k of ['greet', 'address', 'elder', 'food', 'ruler', 'rulerTitle', 'drink']) { addW(c[k]); if (c[k]) for (const part of String(c[k]).split(/와 |과 /)) addW(part); } for (const f of c.festivals || []) addW(f); }
    for (const r of data.races) addW(r.name); for (const j of data.jobs) addW(j.name); for (const c of data.causes) addW(c.label);
    for (const t of data.tracks || []) { addW(t.name); for (const st of t.stages || []) { addW(st.name); addW(st.title); } }
    for (const a of data.affiliations || []) addW(a.name);
    const names = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'names.json'), 'utf8'));
    for (const pool of Object.values(names)) { if (!pool || typeof pool !== 'object') continue; for (const key of ['m', 'f', 's']) for (const w of pool[key] || []) addW(w); }
    return [...V].sort((x, y) => y.length - x.length); })();
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pre = new RegExp('(^|[\\s(「"\'‘“])(' + vocab.map(esc).join('|') + ')(으로|이라고|라고|은|는|이|가|을|를|과|와|로)(?=$|[\\s.,!?)」"\'’”])', 'g');
  const expectP = (w, p) => { const b = hasBatchim(w); if (p === '은' || p === '는') return b ? '은' : '는'; if (p === '이' || p === '가') return b ? '이' : '가'; if (p === '을' || p === '를') return b ? '을' : '를'; if (p === '과' || p === '와') return b ? '과' : '와'; if (p === '으로' || p === '로') { const j = lastJong(w); return j !== 0 && j !== 8 ? '으로' : '로'; } if (p === '이라고' || p === '라고') return b ? '이라고' : '라고'; return p; };
  const badP = {};
  for (const x of texts) { pre.lastIndex = 0; let m; while ((m = pre.exec(x.t))) { const e = expectP(m[2], m[3]); if (e !== m[3]) { const k = m[2] + m[3] + '→' + e + ' @' + x.id + ' …' + x.t.slice(Math.max(0, m.index - 12), m.index + m[2].length + 8); badP[k] = (badP[k] || 0) + 1; } } }
  const badN = Object.values(badP).reduce((a, b) => a + b, 0);
  console.log('  조사 오류(D30): ' + badN + '건' + (badN ? '\n  ' + Object.entries(badP).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => v + '× ' + k).join('\n  ') : ' ✓'));
  // 소스 하드코딩 조사
  const re = /\+ '(은|는|이|가|을|를|와|과|로|으로|라고|이라고)[ .,)'!?]/, re2 = /\}(은|는|이|가|을|를|와|과|로|으로)[ .,)'!?<]/;
  const srcHits = [];
  for (const f of ['kazdel', 'durin', 'rhodes', 'common']) {
    const lines = fs.readFileSync(path.join(ROOT, 'content', 'tracks', f + '.js'), 'utf8').split('\n');
    lines.forEach((l, i) => { if (re.test(l) || re2.test(l)) srcHits.push(f + '.js:' + (i + 1)); });
  }
  console.log('  소스 하드코딩 조사: ' + srcHits.length + '곳' + (srcHits.length ? ' ' + srcHits.join(' ') : ' ✓'));

  const ok = errors === 0 && uniq.length === 0 && srcHits.length === 0 && zeroCombo === 0 && badN === 0;
  console.log('\n' + (ok ? '통과' : '실패') + ' (예외 ' + errors + ', 금지 ' + uniq.length + ', 하드코딩 ' + srcHits.length + ', 로도스 0 조합 ' + zeroCombo + ', 조사 ' + badN + ')');
  if (!ok) process.exitCode = 1;
}

main();
