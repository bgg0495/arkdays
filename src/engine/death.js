// 죽음(§9 구조 참고): 연간 사망확률 = 생명표 q × 개인 승수, 사인은 밴드별 가중치 × 태그 배율.
import { clamp } from './rng.js';
import { humanAge } from './lifetable.js';
import { causeBand } from './data.js';
import { tagsOf, tagsOkGrouped } from './content.js';
import { STAGE_MORT } from './oripathy.js';
import { BALANCE as B } from './balance.js';
import { ro } from './text.js';

/** 나이별 기대 건강(인간 척도) */
export function expHealth(sim, ageOffset = 0) {
  const a = humanAge(sim.S.age + ageOffset, sim.race.lifeMul);
  if (a < 1) return 70;
  if (a < 5) return 78;
  if (a < 30) return 88;
  if (a < 60) return 88 - (a - 30) * 0.5;
  return Math.max(25, 73 - (a - 60) * 0.9);
}

export const Q_MORT = [1.3, 1.12, 1, 0.9, 0.8];

export function mortalityMul(sim) {
  const { S, race } = sim;
  let m = Math.max(0.5, Math.exp((expHealth(sim) - S.st.hl) * 0.03));
  m *= Q_MORT[S.q - 1];
  m *= STAGE_MORT[S.ori.stage] || 1;
  if (S.flags.bornInfected && S.age < 5) m *= B.bornInfantMort;
  if (S.prison === 'camp') m *= 2;
  if (S.flags.quarantined) m *= 1.15;
  if (S.serving && S.flags.war) m *= 3;
  m *= 1 + 0.05 * race.stigma;
  if (S.mig) m *= 1.1;
  if (humanAge(S.age, race.lifeMul) >= 85) m = 1 + (m - 1) * 0.5;
  return clamp(m, 0.25, 9);
}

export function deathProb(sim) {
  const q = sim.lt.q[Math.min(sim.S.age, sim.lt.q.length - 1)];
  return 1 - Math.pow(1 - q, mortalityMul(sim));
}

export function causeWeights(sim) {
  const { S, data, job, race } = sim;
  const ha = humanAge(S.age, race.lifeMul);
  const band = causeBand(ha);
  const tags = tagsOf(sim);
  const out = [];
  for (const c of data.causes) {
    if (!tagsOkGrouped(c.tags, tags)) continue;
    let w = c.w[band] || 0;
    if (!w) continue;
    for (const [tg, mul] of Object.entries(c.by || {})) if (tags.has(tg)) w *= mul;
    if (job && job.risk[c.id]) w *= job.risk[c.id];
    if (c.id === 'oldage' && ha >= 85) w *= 3;
    if (c.id === 'oripathy') w *= { 0: 0, 1: 0.5, 2: 2, 3: 5 }[S.ori.stage] || 0;
    if (c.id === 'catastrophe') w *= { 1: 0.5, 2: 1, 3: 2 }[sim.nation.catFreq] * (S.home.type === 'nomadic' ? 0.5 : 1.3);
    if (c.id === 'war') w *= { 1: 0.5, 2: 1, 3: 2.5 }[sim.nation.conflict] * (S.flags.war ? 4 : 1) * (S.serving ? 5 : 1);
    if (c.id === 'camp') w *= S.prison === 'camp' ? 3 : 0.2;
    if (c.id === 'nomadic_accident') w *= S.home.type === 'nomadic' ? 1.5 : 0.1;
    if (c.id === 'mine_accident' && !(job && job.risk.mine_accident)) w *= 0.2;
    out.push([c.id, w]);
  }
  return out;
}

export function pickCause(sim) {
  const w = causeWeights(sim);
  return sim.rng.wpick(w) || (sim.data.causes[0] && sim.data.causes[0].id) || 'unknown';
}

/** 사망 처리. causeId 가 테이블에 없으면 label 을 그대로 쓴다. */
export function die(sim, causeId, label) {
  const { S, data } = sim;
  if (S.phase === 'dead') return;
  const c = data.causeById[causeId];
  S.deathAt = { age: S.age, year: S.by + S.age, cause: causeId, label: c ? c.label : (label || causeId), where: S.cur, infected: S.ori.on };
  if (S.rhodes === true) S.rhodes = { via: S.flags.rhodesVia || 'treatment', status: S.ori.on ? 'patient' : 'operator', dept: S.ori.on ? 'patient' : 'logistics', since: S.flags.rhodesAt ?? S.age };   // 콘텐츠가 같은 해에 true 로 둔 경우
  S.phase = 'dead';
  S.pending = null;
  S.queue = [];
  sim.log(S.age + '세, ' + ro(S.deathAt.label) + ' 사망했습니다.', 'death', '(' + (sim.nation.statOrg || '기록소') + ' 사망 등기)');
  sim.HOOK.death(S, sim);
}

/** 연말 자연사 판정 */
export function deathCheck(sim) {
  const { S, rng } = sim;
  if (S.phase !== 'life') return;
  if (rng.chance(deathProb(sim))) die(sim, pickCause(sim));
}
