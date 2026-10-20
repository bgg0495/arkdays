// 재앙(§5.2)·분쟁(§5.4)·시테러/붕괴체 위험 롤. 모두 연말 1회.
import { infect } from './oripathy.js';
import { BALANCE as B } from './balance.js';
import { fleeCheck } from './migration.js';
import { relCrimeMul } from './relations.js';

export const CAT_BASE = B.catBase;

export function catP(sim) {
  const { S, nation } = sim;
  let p = (CAT_BASE[nation.catFreq] ?? 0) * (S.home.type === 'nomadic' ? B.catHome.nomadic : B.catHome.settled);
  if ((S.focusW.survive || 0) > 0.3) p *= 0.7;
  return p;
}

export function catYear(sim) {
  const { S, rng } = sim;
  if (S.phase !== 'life') return;
  const bad = !!S.flags.badForecast;
  S.flags.badForecast = false;                       // 오보 플래그는 그 해만 유효
  if (!rng.chance(catP(sim))) return;
  S.stats.catHits++;
  let r = rng.rnd();
  if (bad) r += B.badForecastShift;                  // 정보 전달자 오보 → 악화
  if (r < B.catCut.evac) {
    S.money = Math.round(S.money * 0.9);
    sim.log('재앙 경보가 울렸습니다. 대피에는 성공했지만 집 안의 것은 두고 왔습니다.', 'bad', '(재앙 정보 전달자 협회 대피 기록)');
  } else if (r < B.catCut.damage) {
    S.money = Math.round(S.money * 0.6);
    sim.eff({ hl: -8 });
    sim.log('재앙이 거주지를 덮쳤습니다. 다쳤고, 많은 것을 잃었습니다.', 'bad');
    S.flags.catastrophe_hit = S.age;                  // §10 구조 입구 후보(그 해·다음 해만 유효)
    fleeCheck(sim, 'catastrophe');                    // §7 피난
  } else if (r < B.catCut.infect) {
    if (S.ori.on) { S.ori.uL = +(S.ori.uL + 0.1).toFixed(3); sim.log('재앙 피폭으로 결정 밀도가 올라갔습니다.', 'bad'); }
    else { infect(sim, 'catastrophe'); sim.log('재앙의 잔류 오리지늄에 노출되었습니다.', 'bad'); }
  } else {
    sim.die('catastrophe', '재앙 피폭');
  }
}

/** 분쟁 피해(§5.4): conflict 3 국가 또는 전시 플래그 */
export function conflictYear(sim) {
  const { S, rng, nation } = sim;
  if (S.phase !== 'life') return;
  const war = !!S.flags.war;
  if (nation.conflict < 3 && !war) return;
  const p = B.conflictP * (war ? 3 : 1) * (S.serving ? 3 : 1) * relCrimeMul(S.rel);   // §9 제도적 차별 ×1.5
  if (!rng.chance(p)) return;
  const r = rng.rnd();
  if (r < B.conflictCut.money) { S.money = Math.round(S.money * 0.85); sim.log('전투가 마을 근처까지 왔습니다. 재산 일부를 잃었습니다.', 'bad'); if (war) fleeCheck(sim, 'war'); }
  else if (r < B.conflictCut.injury) { sim.eff({ hl: -6, h: -3 }); sim.log('분쟁에 휘말려 다쳤습니다.', 'bad'); }
  else sim.die('war', '전쟁·내전');
}

/** 시테러(해안)·붕괴체(북방) 소규모 위험 */
export function hazardYear(sim) {
  const { S, rng, nation } = sim;
  if (S.phase !== 'life') return;
  if (nation.seaborn && rng.chance(B.seabornP)) {
    if (rng.chance(0.5)) { sim.eff({ hl: -10 }); S.money = Math.round(S.money * 0.8); sim.log('시테러가 해안을 습격했습니다. 살아남았습니다.', 'bad'); }
    else sim.die('seaborn', '시테러 습격');
  }
  if (nation.collapsal && rng.chance(B.collapsalP)) {
    if (rng.chance(0.6)) { sim.eff({ hl: -10, h: -5 }); sim.log('붕괴체가 출몰했습니다. 가까스로 피했습니다.', 'bad'); }
    else sim.die('collapsal', '붕괴체');
  }
}
