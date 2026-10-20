// W9f 검증용 시뮬: node test/sim-w9f.js [N=500] [seed=w9f] [nations=laterano,iberia,aegir,minos]
// test/sim.js 의 로더를 복사해 content/index.js 뒤에 content/tracks/{laterano,iberia,aegir,minos}.js 를 등록한다(없는 파일은 건너뜀).
// 국가마다 N명을 그 나라 출생으로 돌려(newLife({nation})) 1) 예외 0 2) 진로·단계별 발화 수(0인 곳 표시) 3) 결정 발화 수
// 4) 각주 비율 5) 금지 문구(D25) 를 찍고, 끝에 모든 이벤트·결정을 상태를 꾸며 한 번씩 직접 실행하는 건식 점검(dry run)으로 run() 예외를 잡는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareData } from '../src/engine/data.js';
import { createRegistry, tagsOf, tagsOk } from '../src/engine/content.js';
import { createSim } from '../src/engine/sim.js';
import { hasBatchim, lastJong } from '../src/engine/text.js';
import content from '../content/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = parseInt(process.argv[2] || '500', 10);
const SEED = process.argv[3] || 'w9f';
const NATIONS = (process.argv[4] || 'laterano,iberia,aegir,minos').split(',').filter(Boolean);
const BANNED = ['추정', '임시', '창작', '신뢰구간', '1950', '시뮬', '현실', '민감도', '환율은', 'D9', 'D25', '§', 'canon', 'nation:', 'threat:', '플래그', '가중', '메모', '세션', '해사', '대침묵'];

function loadData() {
  const raw = {};
  const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const f of ['nations', 'races', 'jobs', 'causes', 'names', 'stats1950']) raw[f] = readJson(path.join(ROOT, 'data', f + '.json'));
  const terra = path.join(ROOT, 'data', 'terra_e0.json');
  if (fs.existsSync(terra)) raw.terra = readJson(terra);
  const dir = path.join(ROOT, 'data', 'tracks');
  raw.tracks = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => readJson(path.join(dir, f)));
  for (const f of ['affiliations', 'relations', 'marriage', 'housing', 'rhodes', 'canon_figures']) { const p = path.join(ROOT, 'data', f + '.json'); if (fs.existsSync(p)) raw[f] = readJson(p); }
  return prepareData(raw);
}

async function loadPacks() {
  const packs = {};
  for (const n of NATIONS) {
    const p = path.join(ROOT, 'content', 'tracks', n + '.js');
    if (!fs.existsSync(p)) { console.log('(없음) content/tracks/' + n + '.js'); continue; }
    packs[n] = (await import('../content/tracks/' + n + '.js')).default;
  }
  return packs;
}

const pad = (s, n) => { s = String(s); const w = [...s].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0); return s + ' '.repeat(Math.max(0, n - w)); };
const pct = (v) => (v * 100).toFixed(1) + '%';
const trackTag = (e) => (e.tags || []).find((t) => t.startsWith('track:'));

async function main() {
  const data = loadData();
  const packs = await loadPacks();
  const mineEv = new Set(), mineDec = new Set();
  const evFired = {}, decFired = {}, stageFired = {}, textsOut = [];
  let evN = 0, evF = 0;
  for (const [nation, p] of Object.entries(packs)) {
    for (const e of p.events) {
      mineEv.add(e.id);
      const orig = e.run;
      e.run = (s) => {
        const r = orig(s);
        evFired[e.id] = (evFired[e.id] || 0) + 1; evN++;
        if (r && typeof r === 'object' && r.f && /\d/.test(r.t || '')) evF++;
        if (s.S.track && s.data.trackById[s.S.track.id]) { const t = s.data.trackById[s.S.track.id]; const st = t.stages[Math.min(s.S.track.stage, t.stages.length - 1)]; const key = t.id + ':' + st.id; if (e.tags.some((tg) => tg === 'track:' + t.id || tg === 'track:' + key)) stageFired[key] = (stageFired[key] || 0) + 1; }
        const txt = typeof r === 'string' ? r : (r && r.t) || '';
        if (txt) textsOut.push({ id: e.id, t: txt + (r && r.f ? ' ' + r.f : '') });
        return r;
      };
    }
    for (const [id, d] of Object.entries(p.decisions)) {
      mineDec.add(id);
      const ob = d.build, oa = d.apply;
      d.build = (s, pp) => { const v = ob(s, pp); if (v) { decFired[id] = (decFired[id] || 0) + 1; textsOut.push({ id, t: [v.title, v.body, v.fact, ...(v.choices || []).map((c) => c.label + ' ' + (c.sub || ''))].join(' ') }); } return v; };
      d.apply = (s, k, pp, t) => { const r = oa(s, k, pp, t); const txt = typeof r === 'string' ? r : (r && r.t) || ''; if (txt) textsOut.push({ id: id + ':' + k, t: txt }); return r; };
    }
  }
  const registry = content.install(createRegistry());   // W11: 래핑 뒤에 index.js 가 등록(addDecisions 가 객체를 복사한다)
  console.log('콘텐츠: 이벤트 ' + registry.events.length + ' / 결정 ' + Object.keys(registry.decisions).length + '  (W9f: ' + Object.entries(packs).map(([n, p]) => n + ' 이벤트 ' + p.events.length + '·결정 ' + Object.keys(p.decisions).length).join(' | ') + ')');

  // ── 정적 커버리지: 진로·단계마다 태그가 붙은 이벤트 수 ──
  console.log('\n[정적] 진로·단계별 태그 이벤트 수 (0 = 빠짐)');
  const zeroStatic = [];
  for (const nation of Object.keys(packs)) {
    const line = [];
    for (const t of data.tracks.filter((t) => t.nation === nation)) {
      const parts = [];
      for (const st of t.stages) {
        const n = packs[nation].events.filter((e) => e.tags.includes('track:' + t.id + ':' + st.id)).length;
        const nAll = packs[nation].events.filter((e) => e.tags.includes('track:' + t.id)).length;
        parts.push(st.id + ' ' + n + (nAll ? '+' + nAll : ''));
        if (n + nAll === 0) zeroStatic.push(t.id + ':' + st.id);
      }
      line.push('  ' + pad(t.id, 16) + parts.join(' · '));
    }
    console.log(nation + '\n' + line.join('\n'));
  }
  console.log(zeroStatic.length ? '정적 빠짐: ' + zeroStatic.join(', ') : '정적 빠짐 없음 ✓');

  // ── 시뮬 ──
  let errors = 0, lives = 0;
  const t0 = Date.now();
  const byNation = {};
  for (const nation of Object.keys(packs)) {
    const row = { n: 0, ageSum: 0, tracks: {}, fallen: 0, mig: 0, rhodes: 0 };
    byNation[nation] = row;
    for (let i = 0; i < N; i++) {
      const sim = createSim({ data, seed: SEED + ':' + nation + ':' + i, content: registry, auto: true });
      try {
        const S = sim.newLife({ nation });
        sim.start();
        let guard = 0;
        while (S.phase === 'life') { sim.runYear(); if (++guard > 500) throw new Error('500년 초과'); }
        lives++; row.n++; row.ageSum += S.deathAt.age;
        for (const h of S.trackHist) row.tracks[h.id] = (row.tracks[h.id] || 0) + 1;
        if (S.track) row.tracks[S.track.id] = (row.tracks[S.track.id] || 0) + 1;
        if ((S.flags.migHist || []).length) row.mig++;
        if (S.rhodes) row.rhodes++;
        if (S.track && (!data.trackById[S.track.id] || !Number.isFinite(S.track.standing))) throw new Error('track 상태 깨짐 ' + JSON.stringify(S.track));
        if (!Number.isFinite(S.money) || !Number.isFinite(S.st.h) || !Number.isFinite(S.st.hl)) throw new Error('NaN 상태');
      } catch (e) { errors++; if (errors <= 5) console.error('[' + nation + ' #' + i + '] ' + (e && e.stack || e)); }
    }
  }
  console.log('\n[시뮬] ' + lives + '명 (' + Object.keys(packs).length + '개국 × ' + N + ', seed ' + SEED + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + 's) 예외 ' + errors + '건' + (errors ? ' ✗' : ' ✓'));
  for (const [n, r] of Object.entries(byNation)) {
    console.log('  ' + pad(n, 10) + '평균 수명 ' + (r.n ? (r.ageSum / r.n).toFixed(1) : '-') + ' | 이주 ' + pct(r.mig / Math.max(1, r.n)) + ' | 로도스 ' + pct(r.rhodes / Math.max(1, r.n)) + ' | 진로 경험: ' + Object.entries(r.tracks).sort((a, b) => b[1] - a[1]).map(([k, v]) => k.replace(/^[A-Z]+_/, '') + ' ' + v).join(', '));
  }

  // ── 진로·단계별 발화 ──
  console.log('\n[동적] 진로·단계별 발화 수 (0 = 표본에서 한 번도 안 나옴)');
  const zeroDyn = [];
  for (const nation of Object.keys(packs)) {
    const line = [];
    for (const t of data.tracks.filter((t) => t.nation === nation)) {
      line.push('  ' + pad(t.id, 16) + t.stages.map((st) => { const n = stageFired[t.id + ':' + st.id] || 0; if (!n) zeroDyn.push(t.id + ':' + st.id); return st.id + ' ' + n; }).join(' · '));
    }
    console.log(nation + '\n' + line.join('\n'));
  }
  console.log(zeroDyn.length ? '동적 0: ' + zeroDyn.join(', ') + '  (표본 부족이면 아래 건식 점검으로 대신 확인)' : '동적 0 없음 ✓');
  const neverEv = [...mineEv].filter((id) => !evFired[id]);
  console.log('이벤트 발화: ' + (mineEv.size - neverEv.length) + '/' + mineEv.size + (neverEv.length ? ' | 미발화: ' + neverEv.join(', ') : ''));
  const neverDec = [...mineDec].filter((id) => !decFired[id]);
  console.log('결정 발화: ' + Object.entries(decFired).map(([k, v]) => k + ' ' + v).join(', ') + (neverDec.length ? ' | 미발화: ' + neverDec.join(', ') : ''));
  console.log('각주 비율(D31): ' + pct(evN ? evF / evN : 0) + ' (' + evF + '/' + evN + ', 목표 10~20%)');

  // ── 조사(D30): check-text.js 와 같은 어휘·규칙으로 내 문장만 검사(진로·단계·소속 이름도 어휘에 넣는다) ──
  const V = new Set(); const addV = (w) => { if (typeof w === 'string' && w.trim().length >= 2) V.add(w.trim()); };
  for (const n of data.nations) { addV(n.name); addV(n.statOrg); const c = n.culture || {}; for (const k of ['greet', 'address', 'elder', 'food', 'ruler', 'rulerTitle', 'drink']) { addV(c[k]); if (c[k]) for (const part of String(c[k]).split(/와 |과 /)) addV(part); } for (const f of c.festivals || []) addV(f); }
  for (const r of data.races) addV(r.name); for (const j of data.jobs) addV(j.name); for (const c of data.causes) addV(c.label);
  for (const t of data.tracks) { addV(t.name); for (const st of t.stages) { addV(st.name); addV(st.title); } }
  for (const a of data.affiliations) addV(a.name);
  const vocab = [...V].sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pre = new RegExp('(^|[\\s(「"\'‘“])(' + vocab.map(esc).join('|') + ')(으로|이라고|라고|은|는|이|가|을|를|과|와|로)(?=$|[\\s.,!?)」"\'’”])', 'g');
  const expect = (w, p) => { const b = hasBatchim(w); if (p === '은' || p === '는') return b ? '은' : '는'; if (p === '이' || p === '가') return b ? '이' : '가'; if (p === '을' || p === '를') return b ? '을' : '를'; if (p === '과' || p === '와') return b ? '과' : '와'; if (p === '으로' || p === '로') { const j = lastJong(w); return j !== 0 && j !== 8 ? '으로' : '로'; } if (p === '이라고' || p === '라고') return b ? '이라고' : '라고'; return p; };
  const badP = {};
  for (const x of textsOut) { let m; pre.lastIndex = 0; while ((m = pre.exec(x.t))) { const ex = expect(m[2], m[3]); if (ex !== m[3]) { const k = m[2] + m[3] + '→' + ex + ' @' + x.id; badP[k] = (badP[k] || 0) + 1; } } }
  const badPK = Object.keys(badP);
  console.log('조사 오류(D30): ' + badPK.length + '종' + (badPK.length ? '\n  ' + badPK.map((k) => badP[k] + '× ' + k).join('\n  ') : ' ✓'));
  const srcRe = /\+ '(은|는|이|가|을|를|와|과|로|으로|라고|이라고)[ .,)'!?]/, srcRe2 = /\}(은|는|이|가|을|를|와|과|로|으로)[ .,)'!?<]/;
  const srcHits = [];
  for (const n of Object.keys(packs)) { const lines = fs.readFileSync(path.join(ROOT, 'content', 'tracks', n + '.js'), 'utf8').split('\n'); lines.forEach((l, i) => { if (srcRe.test(l) || srcRe2.test(l)) srcHits.push(n + '.js:' + (i + 1)); }); }
  console.log('소스 하드코딩 조사: ' + srcHits.length + '곳' + (srcHits.length ? '\n  ' + srcHits.join('\n  ') : ' ✓'));

  // ── 금지 문구 ──
  const forb = [];
  for (const x of textsOut) for (const b of BANNED) if (x.t.includes(b)) forb.push(b + ' @' + x.id);
  const forbU = [...new Set(forb)];
  console.log('금지 문구(D25): ' + forbU.length + '건' + (forbU.length ? '\n  ' + forbU.join('\n  ') : ' ✓'));

  // ── 건식 점검: 이벤트·결정을 상태를 꾸며 한 번씩 직접 실행 ──
  let dryErr = 0, dryRun = 0, dryC = 0;
  const dryFail = [];
  for (const [nation, p] of Object.entries(packs)) {
    const tracks = data.tracks.filter((t) => t.nation === nation);
    const setups = [];   // {track, stage, aff, visit}
    for (const t of tracks) for (let si = 0; si < t.stages.length; si++) { setups.push({ t, si, aff: t.affiliations[0] || null }); for (const a of t.affiliations.slice(1)) setups.push({ t, si, aff: a }); }
    setups.push({ t: null });
    const mk = (seedK, setup, age, visit) => {
      const sim = createSim({ data, seed: 'dry:' + seedK, content: registry, auto: true });
      const S = sim.newLife({ nation }); sim.start();
      S.age = age; S.by = 1096 - age;
      if (setup.t) { S.track = { id: setup.t.id, stage: setup.si, since: Math.max(0, age - 3), stageSince: Math.max(0, age - 1), years: 3, standing: 50, aff: setup.aff, flags: { via: 'dry' } }; S.job = setup.t.job || setup.t.id; }
      if (visit) S.res.itinerantAt = visit;
      return sim;
    };
    for (const e of p.events) {
      const tt = trackTag(e);
      const visit = (e.tags.find((x) => x.startsWith('visit:')) || '').slice(6) || null;
      const cands = setups.filter((su) => tt ? (su.t && ('track:' + su.t.id === tt || tt.startsWith('track:' + su.t.id + ':') && su.t.stages[su.si].id === tt.split(':')[2])) : true);
      const age = Math.max(e.a[0], Math.min(e.a[1], Math.round((e.a[0] + e.a[1]) / 2)));
      let ran = false;
      for (const su of cands.slice(0, 3)) {
        for (let k = 0; k < 3 && !ran; k++) {
          const sim = mk(e.id + ':' + k, su, age, visit);
          try {
            const tags = tagsOf(sim, visit);
            const okTags = tagsOk(e.tags.filter((x) => !x.startsWith('aff:') && !x.startsWith('rel:') && !x.startsWith('race:') && !x.startsWith('!race:') && !x.startsWith('stigma:') && x !== 'migrant' && x !== 'newcomer' && !x.startsWith('cap:') && !x.startsWith('marriage:') && !x.startsWith('home:')), tags);
            if (!okTags) continue;
            if (e.c && !e.c(sim)) { dryC++; continue; }
            const r = e.run(sim); dryRun++; ran = true;
            const txt = typeof r === 'string' ? r : (r && r.t) || '';
            if (!txt && sim.S.phase === 'life') dryFail.push(e.id + ' (빈 결과)');
          } catch (err) { dryErr++; dryFail.push(e.id + ': ' + (err && err.message || err)); ran = true; }
        }
      }
      // 조건이 까다로운 이벤트는 c 를 무시하고 run 만 호출해 문장 생성 예외를 잡는다
      if (!ran && cands.length) {
        const sim = mk(e.id + ':force', cands[0], age, visit);
        try { const r = e.run(sim); dryRun++; const txt = typeof r === 'string' ? r : (r && r.t) || ''; if (!txt && sim.S.phase === 'life') dryFail.push(e.id + ' (빈 결과, 강제)'); }
        catch (err) { dryErr++; dryFail.push(e.id + ': ' + (err && err.message || err)); }
      }
    }
    for (const [id, d] of Object.entries(p.decisions)) {
      const tt = trackTag(d);
      const cands = setups.filter((su) => tt ? (su.t && ('track:' + su.t.id === tt || tt.startsWith('track:' + su.t.id + ':') && su.t.stages[su.si].id === tt.split(':')[2])) : true);
      const su = cands[0] || setups[setups.length - 1];
      for (const ch of ['__build__']) {
        const sim = mk(id, su, 30, null);
        try {
          const pp = {};
          const v = d.build(sim, pp); dryRun++;
          if (v && v.choices) for (const c of v.choices) { const sim2 = mk(id + ':' + c.k, su, 30, null); const pp2 = {}; d.build(sim2, pp2); try { d.apply(sim2, c.k, pp2, ''); dryRun++; } catch (err) { dryErr++; dryFail.push(id + ':' + c.k + ': ' + (err && err.message || err)); } }
        } catch (err) { dryErr++; dryFail.push(id + ': ' + (err && err.message || err)); }
      }
    }
  }
  console.log('\n[건식] 직접 실행 ' + dryRun + '회 (조건 미충족 ' + dryC + ') 예외 ' + dryErr + '건' + (dryFail.length ? '\n  ' + dryFail.join('\n  ') : ' ✓'));
  const ok = !errors && !dryErr && !forbU.length && !zeroStatic.length && !badPK.length && !srcHits.length;
  console.log(ok ? '\n통과' : '\n실패');
  if (!ok) process.exitCode = 1;
}

main();
