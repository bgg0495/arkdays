// 광석병(§5.1): 연간 감염, 진행(uL), 단계, 진단, 국가 정책 분기.
// 정책 분기 결과는 로그 + S.flags.oriPolicy / S.flags.oriOutcome 로 남긴다. 각주는 nation.statOrg(세계관 내 기관)로 치환.
import { clamp } from './rng.js';
import { BALANCE as B } from './balance.js';

export const ORI_BASE = B.oriBase;                              // 연간 감염 기본 확률(balance.js)
export const RHODES_OFFER_P = B.rhodesOfferP;                   // 모든 분기 공통 "로도스 합류 제안" 확률
export const STAGE_HL = { 0: 0, 1: -3, 2: -12, 3: -25 };        // 건강 목표값 보정
export const STAGE_MORT = { 0: 1, 1: 1.05, 2: 1.4, 3: 2.2 };    // 사망 승수(결정화 사망과 별도)

export function homeOriMul(home, urban) {
  if (home.type === 'nomadic') return home.deck === 'upper' ? 0.7 : 2.0;
  return urban ? 1.0 : 1.5;
}

export function stageOf(uL) {
  if (uL <= 0) return 0;
  if (uL < 0.3) return 1;
  if (uL < 0.5) return 2;
  return 3;
}

/** 부모 세대 감염 유병률(출생 감염 판정용, 추정) */
export function parentPrevalence(nation, race, jobMul, homeMul) {
  return clamp(ORI_BASE[nation.oriExp] * B.parentPrevMul * Math.sqrt(homeMul) * race.oriVuln * Math.sqrt(Math.max(1, jobMul)), 0, 0.6);
}

/** 연간 감염 확률 */
export function infectP(sim) {
  const { S, nation, race, job } = sim;
  const jobMul = job ? job.oriMul : 1;
  const focusArts = S.focusW.arts || 0;
  return clamp(ORI_BASE[nation.oriExp] * jobMul * homeOriMul(S.home, S.urban) * race.oriVuln * (1 + 0.5 * focusArts), 0, 0.6);
}

export function infect(sim, how = 'env') {
  const { S, rng } = sim;
  if (S.ori.on) return;
  S.ori.on = true;
  S.ori.uL = +rng.rf(0.05, 0.2).toFixed(3);
  S.ori.since = S.age;
  S.ori.stage = stageOf(S.ori.uL);
  S.stats.infectedAt = S.age;
  S.flags.oriHow = how;
  S.stats.oriHow = how;
  // 감염 자체는 본인이 모른다(1기). 로그는 'note' 로 조용히.
  sim.log('몸이 자주 피곤했습니다. 원인은 알지 못했습니다.', 'note', '(로도스 아일랜드 의료부, "조기 증상은 대개 무시된다")');
}

/** 진단: known 이 되는 순간. 정책 분기 적용 + 결정 예약 */
export function diagnose(sim, how = 'exam') {
  const { S } = sim;
  if (S.ori.known) return;
  S.ori.known = true;
  S.flags.oriKnownAt = S.age;
  S.flags.oriDiagPending = true;
  const policy = sim.policy;
  S.flags.oriPolicy = policy;
  sim.log('광석병 감염 판정을 받았습니다. 혈중 오리지늄 결정 밀도 ' + S.ori.uL.toFixed(2) + ' u/L.', 'big', '(' + (sim.nation.statOrg || '기록소') + ' 검진 기록)');
  applyPolicy(sim, policy);
  if (sim.rng.chance(RHODES_OFFER_P) && !S.rhodes) {
    S.flags.rhodesOffer = S.age;
    sim.log('로도스 아일랜드라는 제약회사에서 연락이 왔습니다.', 'note', '(로도스 아일랜드 의료부 안내 엽서)');
  }
}

/** 국가 감염자 정책 분기(§5.1). 결과는 S.flags.oriOutcome */
export function applyPolicy(sim, policy) {
  const { S, rng, nation } = sim;
  let outcome = 'none';
  switch (policy) {
    case 'persecute': {
      const r = rng.rnd();
      if (r < 0.35) { outcome = 'camp'; S.prison = 'camp'; S.prisonLeft = rng.ri(3, 12); S.job = null; S.school = null;
        sim.log('감염자 수용소로 이송되었습니다.', 'bad', '(' + (nation.statOrg || nation.name + ' 내무부') + ' 이송 명령서)'); }
      else if (r < 0.6) { outcome = 'expel'; sim.log('국외 추방 명령을 받았습니다.', 'bad'); sim.migrate('expel'); }
      else if (r < 0.68) { outcome = 'execute'; sim.die('execution', '감염자 처형'); }
      else { outcome = 'hidden'; S.flags.oriHidden = true; sim.log('판정 기록을 돈으로 지웠습니다. 이제부터 숨기며 삽니다.', 'bad'); }
      break;
    }
    case 'quarantine':
      outcome = 'quarantine'; S.flags.quarantined = true; S.flags.noMove = true;
      if (S.home.type === 'nomadic') S.home.deck = 'under';
      sim.log('감염자 격리구역으로 이주 명령을 받았습니다. 이동이 제한됩니다.', 'bad');
      break;
    case 'euthanasia':
      outcome = 'quarantine_euth'; S.flags.quarantined = true; S.flags.noMove = true; S.flags.euthTrack = true;
      sim.log('격리구역으로 옮겨졌습니다. 서류에는 "3기 도달 시 국가 조치"라고 적혀 있었습니다.', 'bad');
      break;
    case 'neglect':
      outcome = 'fees'; S.flags.oriFees = true;
      sim.log('아무도 치료를 말하지 않았습니다. 대신 "보호비"를 걷는 사람이 찾아왔습니다.', 'bad');
      break;
    case 'insurance':
      outcome = 'premium'; S.flags.oriPremium = +rng.rf(B.premium[0], B.premium[1]).toFixed(2); S.flags.premiumMissed = 0;
      sim.log('보험사에서 감염자 특약 청구서가 왔습니다. 연 소득의 ' + Math.round(S.flags.oriPremium * 100) + '%입니다.', 'bad');
      break;
    case 'expel':
      outcome = 'expel'; sim.log('즉시 추방되었습니다.', 'bad'); sim.migrate('expel');
      break;
    case 'treat':
      outcome = 'treat'; S.ori.treated = true;
      sim.log('공공 치료소에 등록되었습니다. 진행을 늦추는 약을 받습니다.', 'warm');
      break;
    case 'ignore':
    default:
      outcome = 'ignore'; sim.log('판정은 났지만 달라진 것은 없었습니다. 이곳에서는 흔한 일입니다.', 'note');
  }
  S.flags.oriOutcome = outcome;
  return outcome;
}

/** 연말 광석병 처리 */
export function oriYear(sim) {
  const { S, rng, race } = sim;
  if (S.phase !== 'life') return;
  if (!S.ori.on) {
    if (rng.chance(infectP(sim))) infect(sim, 'env');
    return;
  }
  const o = S.ori;
  const prevStage = o.stage;
  let prog = rng.rf(B.oriProg[0], B.oriProg[1]) * race.oriProg;
  if (o.treated || S.rhodes || S.flags.suppressant) prog *= 0.5;
  if ((S.focusW.arts || 0) > 0.3) prog *= 1.3;
  o.uL = +(o.uL + prog).toFixed(3);
  o.stage = stageOf(o.uL);

  if (o.uL >= 0.8) { sim.die('oripathy', '광석병 결정화'); return; }

  // 진단 확률: 2기 이상이면 거의 확정, 1기는 낮음(치료국·로도스는 조금 높음)
  if (!o.known) {
    const p = o.stage >= 2 ? B.diagP.stage2 : (sim.policy === 'treat' ? B.diagP.stage1Treat : B.diagP.stage1);
    if (rng.chance(p)) diagnose(sim, o.stage >= 2 ? 'crystal' : 'exam');
    if (S.phase !== 'life') return;
  }
  if (o.stage === 3 && prevStage < 3) {
    if (S.job && !S.rhodes) { sim.log('더는 일할 수 없다는 통보를 받았습니다.', 'loss'); S.job = null; S.income = 0; }
    if (S.flags.euthTrack) { S.flags.euthNotice = S.age; sim.log('국가 안락사 통지서가 도착했습니다.', 'bad', '(' + (sim.nation.statOrg || '보건국') + ' 보건령 제3조)'); }
  }
  if (S.flags.euthNotice != null && S.age > S.flags.euthNotice) { sim.die('euthanasia', '제도적 안락사'); return; }
  if (S.flags.oriHidden && rng.chance(0.1)) {
    S.flags.oriHidden = false;
    sim.log('숨겨 온 감염이 드러났습니다.', 'bad');
    applyPolicy(sim, sim.policy);
  }
  if (S.flags.rhodesOffer != null && !S.rhodes && rng.chance(0.3)) {
    S.rhodes = true; o.treated = true; S.flags.rhodesAt = S.age; S.flags.rhodesOffer = null;
    sim.log('로도스 아일랜드에 합류했습니다.', 'warm');
  }
}

/** 수용소 연간 처리(persecute 분기) */
export function campYear(sim) {
  const { S, rng } = sim;
  if (S.prison !== 'camp' || S.phase !== 'life') return;
  if (rng.chance(B.campDeathP)) { sim.die('camp', '수용소'); return; }
  S.prisonLeft--;
  if (S.prisonLeft <= 0) { S.prison = null; sim.log('수용소에서 풀려났습니다. 서류에는 "재분류"라고만 적혀 있었습니다.', 'note'); }
}
