// 주거 형태(§8.2, D48). 진로·거주 상태가 후보를 좁히고, forced 가 맞으면 즉시 전환. 결정 home_change 는 후보 안에서만.
// S.home = { type:'nomadic'|'settled'(구 필드, 콘텐츠·광석병 배율이 읽음), deck, housing:<유형 id>, since, owned }
import { BALANCE as B } from './balance.js';

export function housingTypes(sim) {
  const h = sim.data.housing;
  const n = sim.nation;
  const src = h[sim.S.cur] || (n.parent && h[n.parent]) || h._default;
  return src ? src.types : [];
}

function forcedOk(sim, f) {
  const { S } = sim;
  if (!f) return false;
  if (f.oriPolicy) { if (!S.ori.on) return false; if (f.known && !S.ori.known) return false; if (!f.oriPolicy.includes(sim.policy) || !S.flags.quarantined) return false; }
  if (f.prison && S.prison !== f.prison) return false;
  if (f.res && S.cur !== f.res) return false;
  if (f.track && !(S.track && f.track.includes(S.track.id))) return false;
  if (f.archetype) { const t = S.track && sim.data.trackById[S.track.id]; if (!t || !f.archetype.includes(t.archetype)) return false; }
  if (f.stageMin != null && !(S.track && S.track.stage >= f.stageMin)) return false;
  if (f.stageMax != null && !(S.track && S.track.stage <= f.stageMax)) return false;
  if (f.papers && S.res.papers !== f.papers) return false;
  if (f.flag && !S.flags[f.flag]) return false;
  return true;
}
function reqOk(sim, t) {
  const { S } = sim;
  const r = t.req || {};
  if (r.urban != null && !!S.urban !== !!r.urban) return false;
  if (r.nomadic != null && !!r.nomadic !== (S.home.type === 'nomadic' || !!S.flags.nomadicCity)) return false;
  if (r.track && !(S.track && r.track.includes(S.track.id))) return false;
  if (r.money != null && S.money < sim.med * r.money) return false;
  if (r.q && (S.q < r.q[0] || S.q > r.q[1])) return false;
  if (r.papers && !r.papers.includes(S.res.papers)) return false;
  if (r.married != null && !!S.fam.married !== !!r.married) return false;
  if (r.status) { const k = r.status; if (k === 'slave' ? !S.status.slave : k === 'noble' ? !S.status.noble : S.status.stigma !== k) return false; }
  if (r.eth && S.eth !== r.eth) return false;
  if (r.infected != null && !!S.ori.on !== !!r.infected) return false;
  if (t.region && (S.sub && S.sub.region) !== t.region) return false;
  if (t.since != null && sim.year < t.since) return false;
  if (r.owner != null) { const own = !!(S.track && sim.data.trackById[S.track.id] && sim.data.trackById[S.track.id].stages[S.track.stage] && sim.data.trackById[S.track.id].stages[S.track.stage].owner); if (own !== !!r.owner) return false; }
  return true;
}

/** 지금 들어갈 수 있는 주거 후보(forced 제외) */
export function housingCandidates(sim) {
  return housingTypes(sim).filter((t) => !t.forced && reqOk(sim, t));
}
/** 지금 강제되는 주거(첫 매치) */
export function forcedHousing(sim) {
  return housingTypes(sim).find((t) => t.forced && forcedOk(sim, t.forced)) || null;
}

export function setHousing(sim, t, opts = {}) {
  const { S } = sim;
  if (!t) return false;
  if (S.home.housing === t.id) return false;
  const prev = S.home.housing;
  S.home.housing = t.id; S.home.since = S.age; S.home.owned = !!t.buy && !!opts.buy;
  S.home.forced = !!t.forced;
  if (t.nomadic != null) { S.home.type = t.nomadic ? 'nomadic' : 'settled'; if (!t.nomadic) S.home.deck = 'ground'; else if (S.home.deck === 'ground') S.home.deck = S.q >= 4 ? 'upper' : 'under'; }
  if (opts.buy && t.buy) S.money = Math.round(S.money - sim.med * t.buy);
  if (!opts.quiet && prev) sim.log(t.forced ? t.name + '(으)로 옮겨졌습니다.' : (opts.buy ? t.name + '을(를) 마련했습니다.' : t.name + '(으)로 옮겼습니다.'), t.forced ? 'bad' : 'ev');
  sim.HOOK.change(S, sim);
  return true;
}

/** 출생 시 초기 주거: 후보 중 가중 롤(nomadic 플래그를 S.home.type 과 맞춘다) */
export function initHousing(sim) {
  const { S, rng } = sim;
  const cands = housingCandidates(sim).filter((t) => t.nomadic == null || !!t.nomadic === (S.home.type === 'nomadic'));
  const pool = cands.length ? cands : housingCandidates(sim);
  if (!pool.length) return;
  const id = rng.wpick(pool.map((t) => [t.id, t.w ?? 1]));
  const t = pool.find((x) => x.id === id);
  if (t) { S.home.housing = t.id; S.home.since = 0; S.home.owned = !!t.buy && S.q >= 3; S.home.forced = false; }
}

/** 연말: forced 즉시 전환, forced 해제, 현재 주거가 더는 불가능하면 후보로 */
export function housingYear(sim) {
  const { S } = sim;
  if (S.phase !== 'life') return;
  const f = forcedHousing(sim);
  if (f) { setHousing(sim, f); return; }
  const types = housingTypes(sim);
  const cur = types.find((t) => t.id === S.home.housing);
  if (!cur || cur.forced || !reqOk(sim, cur)) {
    const cands = housingCandidates(sim);
    if (cands.length) {
      const same = cands.filter((t) => t.nomadic == null || !!t.nomadic === (S.home.type === 'nomadic'));
      const pool = same.length ? same : cands;
      const id = sim.rng.wpick(pool.map((t) => [t.id, t.w ?? 1]));
      setHousing(sim, pool.find((t) => t.id === id), { quiet: !cur || !!cur.forced });
    }
  }
  // A11 가게 소유 단계 ↔ 소유형 주거
  const t = S.track && sim.data.trackById[S.track.id];
  if (t && t.A.flags.homeLink && t.stages[S.track.stage] && t.stages[S.track.stage].owner && !S.home.owned) {
    const own = housingCandidates(sim).find((h) => h.buy && S.money >= sim.med * h.buy * B.housing.buyMoneyMul);
    if (own && (S.age - (S.home.since || 0)) >= B.housing.changeGap) setHousing(sim, own, { buy: true });
  }
}

/** home_change 결정이 열리는가: 돈이 충분한 소유형 후보가 있고 현재 소유가 아님 */
export function homeChangeOpen(sim) {
  const { S } = sim;
  if (S.home.owned || S.home.forced || S.age < 20) return false;
  if ((S.age - (S.home.since || 0)) < B.housing.changeGap) return false;
  return housingCandidates(sim).some((h) => h.buy && S.money >= sim.med * h.buy * B.housing.buyMoneyMul);
}
export function homeChangeOptions(sim) {
  const { S } = sim;
  return housingCandidates(sim).filter((h) => h.buy && S.money >= sim.med * h.buy * B.housing.buyMoneyMul && h.id !== S.home.housing);
}
