// W11 검증: node test/sim-nations.js [N=150] [nation,nation…]
// 국가별 강제 출생 N명: 유입 0 자발 진로·발화 0 결정·국가별 계층 유입 이탈을 국가마다 같은 표본으로 본다
import { loadData } from './sim.js';
import { createRegistry } from '../src/engine/content.js';
import { createSim } from '../src/engine/sim.js';
import content from '../content/index.js';
const N = parseInt(process.argv[2] || '150', 10);
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const { data } = loadData();
const registry = content.install(createRegistry());
const nations = data.nations.filter((n) => !n.virtual && n.share > 0 && (!ONLY || ONLY.includes(n.id)));
const spells = {}, dec = {}, byClass = {};
let errors = 0, lives = 0, logs = 0, rh = 0, rhInf = 0, inf = 0, mig = 0, canonMax = 0, canonOver = 0;
for (const n of nations) {
  for (let i = 0; i < N; i++) {
    const sim = createSim({ data, seed: 'nat:' + n.id + ':' + i, content: registry, auto: true });
    try {
      const S = sim.newLife({ nation: n.id }); sim.start();
      let g = 0; while (S.phase === 'life') { sim.runYear(); if (++g > 500) throw new Error('500년'); }
      lives++; logs += S.log.length; const cs = S.flags.canonSeen || 0; canonMax = Math.max(canonMax, cs); if (cs > 3) canonOver++; if (S.ori.on) inf++; if (S.rhodes) { rh++; if (S.ori.on) rhInf++; } if ((S.flags.migHist || []).some((m) => m.reason !== 'rhodes')) mig++;
      let last = null; const sp = [];
      let prevHow = null; for (const h of S.trackHist) { if (h.how === 'promo' || h.how === 'demote') { last = h.id; continue; } if (h.id !== last && prevHow !== 'retire') sp.push(h.id); last = null; prevHow = h.how; }
      if (S.track && S.track.id !== last && prevHow !== 'retire') sp.push(S.track.id);
      for (const id of sp) { spells[id] = (spells[id] || 0) + 1; const t = data.trackById[id]; if (!t) continue; const nb = byClass[t.nation] || (byClass[t.nation] = {}); const qb = nb['q' + S.q] || (nb['q' + S.q] = {}); qb[id] = (qb[id] || 0) + 1; }
      for (const id of Object.keys(S.done)) dec[id] = (dec[id] || 0) + 1;
    } catch (e) { errors++; if (errors <= 5) console.error('[' + n.id + '#' + i + '] ' + (e.stack || e)); }
  }
}
console.log('국가 ' + nations.length + ' × ' + N + ' = ' + lives + '생, 예외 ' + errors + ', 기록/생 ' + (logs / lives).toFixed(1) + ', 로도스 ' + (rh / lives * 100).toFixed(1) + '% / 감염자 중 ' + (rhInf / inf * 100).toFixed(1) + '%, 이주 ' + (mig / lives * 100).toFixed(1) + '%, 캐논 인물 생당 최대 ' + canonMax + ' (3 초과 ' + canonOver + '생)');
const zero = Object.values(data.trackById).filter((t) => !t.forcedEntry && !t.synthetic && !t.noClasses && !t.dept && !spells[t.id] && (!ONLY || ONLY.includes(t.nation) || ONLY.includes(data.nationById[t.nation] && data.nationById[t.nation].parent)));
console.log('유입 0 자발 진로 ' + zero.length + ': ' + zero.map((t) => t.id).join(', '));
const low = Object.values(data.trackById).filter((t) => !t.forcedEntry && !t.synthetic && !t.noClasses && !t.dept && spells[t.id] && spells[t.id] <= 2).map((t) => t.id + ' ' + spells[t.id]);
console.log('유입 ≤2: ' + low.join(', '));
const zd = Object.keys(registry.decisions).filter((id) => !dec[id]);
console.log('발화 0 결정 ' + zd.length + '/' + Object.keys(registry.decisions).length + ': ' + zd.join(', '));
// 계층 유입 이탈(표본 ≥ 30)
for (const n of nations) {
  const nb = byClass[n.id]; if (!nb || n.tracksSynthetic) continue; const offs = [];
  for (const q of ['q1', 'q2', 'q3', 'q4', 'q5']) { const got = nb[q] || {}; const gt = Object.values(got).reduce((a, b) => a + b, 0); if (gt < 30) continue; const exp = {}; let et = 0;
    for (const t of data.tracksByNation[n.id]) { if (t.forcedEntry || t.synthetic) continue; const w = (t.entry.classes || {})[q] || 0; if (w > 0) { exp[t.id] = w; et += w; } }
    for (const [id, w] of Object.entries(exp)) { const d = (got[id] || 0) / gt - w / et; if (Math.abs(d) > 0.1) offs.push(q + ' ' + id + ' ' + (d > 0 ? '+' : '') + (d * 100).toFixed(0) + 'p'); } }
  if (offs.length) console.log('  ' + n.id + ' 이탈: ' + offs.join(', '));
}
