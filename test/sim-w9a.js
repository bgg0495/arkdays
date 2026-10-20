// W9a 검증 시뮬: node test/sim-w9a.js [N=500] [seed=w9a]
// test/sim.js 와 같은 로더·레지스트리에 content/tracks/yan.js·lungmen.js 를 추가 등록하고,
// 출생 국가를 염국·용문으로 번갈아 강제해 두 나라 콘텐츠가 실제로 발화하는지 본다.
//   1) 예외 0건
//   2) W9a 이벤트 발화 횟수: 진로별·단계별(track:<ID>:<stage> 태그 기준) 0인 곳 목록, 소속·캐논·신참·관계·방문·생활 묶음별 합계
//   3) W9a 결정 열림 횟수(모달 기준)와 선택 분포
//   4) 각주 비율(W9a 이벤트 기록 중 f 가 붙은 비율)
// 다른 세션 콘텐츠 파일(content/tracks/<other>.js)은 등록하지 않는다. 더미 진로 콘텐츠(_dummy_tracks.js)도 뺀다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareData } from '../src/engine/data.js';
import { createRegistry } from '../src/engine/content.js';
import { createSim } from '../src/engine/sim.js';
import content from '../content/index.js';
import yan from '../content/tracks/yan.js';
import lungmen from '../content/tracks/lungmen.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = parseInt(process.argv[2] || '500', 10);
const SEED = process.argv[3] || 'w9a';
const NATIONS = ['yan', 'lungmen'];
// FORCE=1: 생마다 그 나라 진로 하나를 돌아가며 강제 진입시키고(시험 생략) 해마다 30% 로 강제 승급해 모든 단계를 밟게 한다(콘텐츠 커버리지 확인용. 분포는 보지 말 것)
const FORCE = process.env.FORCE === '1';

function loadData(root = ROOT) {
  const raw = {};
  const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const f of ['nations', 'races', 'jobs', 'causes', 'names', 'stats1950']) raw[f] = readJson(path.join(root, 'data', f + '.json'));
  const terraFile = path.join(root, 'data', 'terra_e0.json');
  if (fs.existsSync(terraFile)) raw.terra = readJson(terraFile);
  const tracksDir = path.join(root, 'data', 'tracks');
  raw.tracks = fs.readdirSync(tracksDir).filter((f) => f.endsWith('.json')).sort().map((f) => readJson(path.join(tracksDir, f)));
  for (const f of ['affiliations', 'relations', 'marriage', 'housing', 'rhodes', 'canon_figures']) { const p = path.join(root, 'data', f + '.json'); if (fs.existsSync(p)) raw[f] = readJson(p); }
  return prepareData(raw);
}

function pad(s, n, right = false) { s = String(s); const w = [...s].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0); const sp = ' '.repeat(Math.max(0, n - w)); return right ? sp + s : s + sp; }
const pct = (v) => (v * 100).toFixed(1) + '%';

function main() {
  const data = loadData();
  if (data.warnings.length) console.log('경고:', data.warnings.join(' | '));
  const registry = content.install(createRegistry());
  const packs = { yan, lungmen };
  const mine = new Map();          // 이벤트 id → { pack, tags, fired, withF }
  const myDec = new Map();         // 결정 id → { pack, opened, picks:{} }
  for (const [name, p] of Object.entries(packs)) {
    for (const e of p.events) {
      const orig = e.run;
      e.run = (s) => { const m = mine.get(e.id); m.fired++; const r = orig(s); if (r && typeof r === 'object' && r.f && /\d/.test(r.t || '')) m.withF++; return r; };
      mine.set(e.id, { pack: name, tags: e.tags, fired: 0, withF: 0 });
    }
    for (const id of Object.keys(p.decisions)) myDec.set(id, { pack: name, opened: 0, picks: {} });
    // W11: 국가 팩은 content/index.js 가 등록한다(중복 등록 방지). 래핑은 같은 객체를 제자리에서 바꾼다
  }
  console.log('콘텐츠: 이벤트 ' + registry.events.length + ' / 결정 ' + Object.keys(registry.decisions).length + ' / 대사건 ' + registry.big.length
    + '  (W9a: 염국 이벤트 ' + yan.events.length + '·결정 ' + Object.keys(yan.decisions).length + ', 용문 이벤트 ' + lungmen.events.length + '·결정 ' + Object.keys(lungmen.decisions).length + ')');

  let errors = 0;
  const rows = {};
  const rowOf = (id) => rows[id] || (rows[id] = { n: 0, ageSum: 0, logs: 0, decisions: 0, myLogs: 0, myLogsF: 0 });
  const trackSeen = {};            // 진로 id → 경험한 생 수
  const stageSeen = {};            // track:ID:stage → 밟은 생 수(연 단위)
  const t0 = Date.now();
  let pendingDec = null;
  for (let i = 0; i < N; i++) {
    const nation = NATIONS[i % NATIONS.length];
    const myIds = new Set();
    const hooks = {
      log: (e) => { if (e.k !== 'dec' && e._w9a) { /* unused */ } },
      decision: (pd) => { const d = myDec.get(pd.id); if (d) { d.opened++; pendingDec = pd.id; } else pendingDec = null; },
    };
    const sim = createSim({ data, seed: SEED + ':' + i, content: registry, auto: true, hooks });
    // 자동 선택 결과를 세기 위해 choose 를 감싼다
    const choose = sim.choose;
    sim.choose = (k, text, auto) => { if (pendingDec && myDec.get(pendingDec)) { const d = myDec.get(pendingDec); d.picks[k] = (d.picks[k] || 0) + 1; } pendingDec = null; return choose(k, text, auto); };
    try {
      const S = sim.newLife({ nation });
      sim.start();
      let guard = 0;
      const list = data.tracksByNation[nation];
      const target = FORCE ? list[Math.floor(i / NATIONS.length) % list.length] : null;
      let forced = false;
      while (S.phase === 'life') {
        if (target && !forced && !S.prison && S.age >= Math.max(15, target.entry.ages[0]) + 1) { forced = true; sim.enterTrack(target.id, { via: target.entry.via[0], skipExam: true, how: 'enter' }); }
        if (FORCE && S.track && S.age - S.track.stageSince >= 1 && sim.rng.chance(0.3)) sim.promote({ force: true });
        // 올해 밟은 단계 기록
        if (S.track) { const t = data.trackById[S.track.id]; if (t) { const st = t.stages[Math.min(S.track.stage, t.stages.length - 1)]; stageSeen['track:' + t.id + ':' + st.id] = (stageSeen['track:' + t.id + ':' + st.id] || 0) + 1; } }
        sim.runYear();
        if (++guard > 500) throw new Error('500년 초과');
      }
      const r = rowOf(nation);
      r.n++; r.ageSum += S.deathAt.age; r.logs += S.log.length; r.decisions += S.stats.decisions;
      for (const h of S.trackHist.concat(S.track ? [{ id: S.track.id }] : [])) if (!myIds.has(h.id)) { myIds.add(h.id); trackSeen[h.id] = (trackSeen[h.id] || 0) + 1; }
      // 각주 비율: W9a 이벤트 기록만 세기 어려우므로 기록 전체에서 'yan_'/'lgm_' 이벤트가 남긴 문장을 플래그(ev_<id>)로 역추적
      for (const [id, info] of mine) if (S.flags['ev_' + id] != null) { r.myLogs++; }
      for (const e of S.log) if (e.f && e.k !== 'dec' && e.k !== 'big') r.myLogsF++;
      // 무결성(test/sim.js 와 동일)
      for (const k of ['hl', 'h']) if (!Number.isFinite(S.st[k])) throw new Error('NaN stat ' + k);
      if (S.track && (!data.trackById[S.track.id] || !Number.isFinite(S.track.standing))) throw new Error('track 상태 깨짐 ' + JSON.stringify(S.track));
      if (!Number.isFinite(S.money)) throw new Error('NaN money');
    } catch (e) {
      errors++;
      if (errors <= 5) console.error('[#' + i + ' ' + nation + '] ' + (e && e.stack || e));
    }
  }
  const ms = Date.now() - t0;
  console.log('\nN=' + N + ', seed=' + SEED + ', ' + ms + 'ms, 예외 ' + errors + '건');
  for (const n of NATIONS) { const r = rows[n]; if (!r) continue; console.log('  ' + pad(data.nationById[n].name, 6) + ' n=' + r.n + ' 평균수명 ' + (r.ageSum / r.n).toFixed(1) + ' 기록/생 ' + (r.logs / r.n).toFixed(1) + ' 결정/생 ' + (r.decisions / r.n).toFixed(1)); }

  // ── 진로별 경험 생 수 ──
  console.log('\n[진로 경험 생 수]');
  for (const n of NATIONS) console.log('  ' + pad(data.nationById[n].name, 6) + data.tracksByNation[n].map((t) => t.id + ' ' + (trackSeen[t.id] || 0)).join(', '));

  // ── 이벤트 발화: 진로·단계별 ──
  console.log('\n[W9a 이벤트 발화 — 진로:단계별 합계 / 0인 곳]');
  const byStage = {};
  const byGroup = { aff: 0, canon: 0, newcomer: 0, rel: 0, visit: 0, promo: 0, after: 0, first: 0, living: 0, other: 0 };
  const zeroEvents = [];
  for (const [id, info] of mine) {
    const st = info.tags.find((t) => /^track:[A-Z_]+:[a-z_]+$/.test(t));
    const tr = info.tags.find((t) => /^track:[A-Z_]+$/.test(t));
    if (st) { byStage[st] = (byStage[st] || 0) + info.fired; }
    const g = id.endsWith('_promo') ? 'promo' : id.endsWith('_after') ? 'after' : id.endsWith('_first') ? 'first' : /_aff_/.test(id) ? 'aff' : /_canon_/.test(id) ? 'canon' : /newcomer/.test(id) ? 'newcomer' : /_rel_/.test(id) ? 'rel' : /_visit_/.test(id) ? 'visit' : /_season_|_life_/.test(id) ? 'living' : st ? null : 'other';
    if (g) byGroup[g] += info.fired;
    if (!info.fired) zeroEvents.push(id);
  }
  for (const n of NATIONS) {
    for (const t of data.tracksByNation[n]) {
      const parts = t.stages.map((s) => { const k = 'track:' + t.id + ':' + s.id; const c = byStage[k]; return s.id + ' ' + (c == null ? '-' : c) + (stageSeen[k] ? '' : '(단계 미경험)'); });
      console.log('  ' + pad(t.id, 16) + parts.join(' · '));
    }
  }
  const zeroStages = Object.keys(byStage).filter((k) => !byStage[k]);
  console.log('  단계 합계 0: ' + (zeroStages.length ? zeroStages.join(', ') : '없음'));
  console.log('  묶음별 발화: ' + Object.entries(byGroup).map(([k, v]) => k + ' ' + v).join(', '));
  console.log('  발화 0 이벤트 ' + zeroEvents.length + '개' + (zeroEvents.length ? ': ' + zeroEvents.join(', ') : ''));

  // ── 결정 ──
  console.log('\n[W9a 결정 열림 횟수·선택 분포]');
  for (const [id, d] of myDec) console.log('  ' + pad(id, 24) + pad(d.opened, 5, true) + '  ' + Object.entries(d.picks).map(([k, v]) => k + ' ' + v).join(', '));
  const zeroDec = [...myDec].filter(([, d]) => !d.opened).map(([id]) => id);
  console.log('  열림 0 결정: ' + (zeroDec.length ? zeroDec.join(', ') : '없음'));

  // ── 각주 비율(D31): W9a 이벤트 발화 중 숫자+각주가 붙은 비율(팩별) ──
  for (const name of Object.keys(packs)) { let f = 0, a = 0; for (const [, m] of mine) if (m.pack === name) { a += m.fired; f += m.withF; } console.log('\n각주(D31) ' + name + ': W9a 이벤트 발화 ' + a + '건 중 각주 ' + f + '건 = ' + pct(a ? f / a : 0) + ' (목표 10~20%)'); }
  for (const n of NATIONS) { const r = rows[n]; if (!r) continue; console.log('각주(참고, 전체 콘텐츠) ' + data.nationById[n].name + ': 기록 중 각주 ' + pct(r.logs ? r.myLogsF / r.logs : 0)); }

  console.log('\n검증: 예외 ' + errors + '건 / 단계 합계 0 ' + zeroStages.length + '곳 / 발화 0 이벤트 ' + zeroEvents.length + '개 / 열림 0 결정 ' + zeroDec.length + '개');
  if (errors) process.exitCode = 1;
}

main();
