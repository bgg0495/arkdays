// 돈(§5.5): 지니→로그정규 소득, 백분위 drift, 용문폐(LMD) 환산, 보험료·보호비·억제제.
// S.money / S.income 은 전부 LMD 단위로 저장한다.
import { clamp, invNorm } from './rng.js';
import { rootOf } from './data.js';
import { BALANCE as B } from './balance.js';
import { ro } from './text.js';
import { trackIncomeMul, retireTrack, leaveTrack, trackOf, demote } from './track.js';
import { relIncomeMul } from './relations.js';

export const LMD_PER_PPP = 10;                 // D15: LMD = PPP$ × 10 (창작 환율)
export const toLMD = (ppp) => ppp * LMD_PER_PPP;

export function sigmaOf(gini) {
  return Math.SQRT2 * invNorm((clamp(gini, 0.2, 0.7) + 1) / 2);
}

/** 백분위 pct(0~1)의 연소득, PPP$ */
export function incomeAt(ppp, gini, pct) {
  const s = sigmaOf(gini);
  return ppp * 0.9 * Math.exp(s * invNorm(clamp(pct, 0.001, 0.999)) - s * s / 2);
}

/** 현재 국가 중위소득(LMD) */
export function medianLMD(sim) {
  const st = sim.nation.stats;
  return toLMD(incomeAt(st.ppp, st.gini, 0.5));
}

/** 취업 제안 n개 */
export function jobOffers(sim, n = 3) {
  const { S, data, race, rng } = sim;
  const child = S.age < 15;
  const cands = data.jobs.filter((j) => jobEligible(sim, j, child));
  if (!cands.length) return [];
  const want = (S.q - 0.5) / 5;
  const weighted = cands.map((j) => {
    let w = 1 / (0.15 + Math.abs((j.lo + j.hi) / 2 - want));
    if (sim.nation.jobs.includes(j.id)) w *= 1.5;
    if (j.oriMul >= 3) w *= 0.5;                       // 광산 등 고노출 직업은 기피
    if (j.sector === 'agr') w *= S.urban ? 0.3 : 3;
    if (j.req.includes('artsTop10')) w *= 3;
    return { id: j.id, w };
  });
  const k = Math.max(1, n - (race.stigma >= 2 ? 1 : 0));
  const out = [];
  const pool = weighted.slice();
  while (out.length < k && pool.length) {
    const id = rng.wpick(pool);
    out.push(data.jobById[id]);
    pool.splice(pool.findIndex((p) => p.id === id), 1);
  }
  return out;
}

/** 직업 요구 조건(req): artsTop10 / infected / race:<id> / sex:<m|f> */
export function reqOk(sim, req) {
  const { S } = sim;
  for (const r of req) {
    if (r === 'artsTop10') { if (!(S.arts >= 1.28 || S.flags.casterRoute)) return false; }
    else if (r === 'infected') { if (!S.ori.on) return false; }
    else if (r.startsWith('race:')) { if (S.race !== r.slice(5)) return false; }
    else if (r.startsWith('sex:')) { if (S.sex.toLowerCase() !== r.slice(4).toLowerCase()) return false; }
    else return false;
  }
  return true;
}

/** child=true 면 아동 노동: 직업의 최소 나이를 무시하되 edu 0 의 평범한 직업만 */
export function jobEligible(sim, j, child = false) {
  const { S, data } = sim;
  if (!j) return false;
  const root = rootOf(data, S.cur);
  if (j.sector === 'none') return false;
  if (j.only && !j.only.includes(S.cur) && !j.only.includes(root)) return false;
  if (S.age > j.age[1] + 50 * (sim.race.lifeMul - 1)) return false;
  if (S.age < j.age[0]) {
    if (!child || j.edu > 0 || j.req.length) return false;
    if (j.special && !sim.nation.jobs.includes(j.id)) return false;
  }
  if (j.edu > S.edu + (S.q >= 4 ? 1 : 0)) return false;
  if (!(j.urban === 0 || (j.urban === 1) === !!S.urban)) return false;
  if (!reqOk(sim, j.req)) return false;
  if (j.special && !sim.nation.jobs.includes(j.id) && !(j.req.length && !j.only)) return false;
  return true;
}

export function takeJob(sim, jobId, quiet = false) {
  const { S, rng, race, data } = sim;
  const j = data.jobById[jobId];
  if (!j) return false;
  S.job = j.id; S.jobY = 0; S.school = null; S.retired = false;
  let pct = j.lo + (j.hi - j.lo) * (0.3 * rng.rnd() + 0.7 * (S.q - 1) / 4) + rng.norm(0, 0.05);
  pct -= 0.05 * race.stigma;
  S.pct = clamp(pct, 0.02, 0.98);
  if (!quiet) sim.log(ro(j.name) + ' 일을 시작했습니다.', 'ev');
  return true;
}

export function retire(sim) {
  const { S } = sim;
  if (!S.job) return;
  if (S.track) { retireTrack(sim, { full: true }); return; }
  const st = sim.nation.stats;
  S.pension = st.ppp > 1500 ? Math.round(S.income * 0.3) : 0;
  S.job = null; S.retired = true;
  sim.log('은퇴했습니다.' + (S.pension ? ' 적은 연금이 나옵니다.' : ' 연금 같은 것은 없습니다.'), 'ev');
}

/** 배우자 생성 직후: 소득 백분위와 취업 여부를 정한다(D35). 여성 배우자는 homemakerP 확률로 가사 전담 */
export function initPartner(sim, p) {
  const { S, rng } = sim;
  if (!p) return p;
  const basePct = S.job ? S.pct : (S.q - 0.5) / 5;
  p.pct = clamp(basePct + rng.norm(0, 0.1), 0.02, 0.98);
  const hp = (sim.nation.homemakerP ?? 0.5) * (p.sex === 'F' ? 1 : 0.05);
  p.works = !rng.chance(hp);
  p.inc = 0;
  return p;
}

/** 배우자 연소득(LMD). works=false(가사 전담·실직)면 0 */
export function partnerIncome(sim) {
  const { S, nation } = sim;
  const p = S.fam.partner;
  if (!p || !p.alive || !p.works) return 0;
  if (p.pct == null) initPartner(sim, p);
  if (!p.works) return 0;
  const st = nation.stats;
  const k = (p.sex === 'F' ? 0.8 : 1) * (p.infected ? 0.7 : 1) * 0.9;
  return Math.round(toLMD(incomeAt(st.ppp, st.gini, p.pct)) * k);
}

/** 가사 전담으로 전환(D35): 본인 소득 0, 직업 상태 'homemaker' */
export function becomeHomemaker(sim) {
  const { S } = sim;
  if (S.job && S.job !== 'homemaker') S.flags.jobBeforeHome = S.job;
  if (S.track) leaveTrack(sim, 'homemaker', { quiet: true });
  S.job = 'homemaker'; S.jobY = 0; S.income = 0; S.retired = false;
  S.flags.homemakerAt = S.flags.homemakerAt ?? S.age;
  S.flags.homemakerYears = S.flags.homemakerYears || 0;
}

/** 연말 재정 처리 */
export function financeYear(sim) {
  const { S, rng, race, job, nation } = sim;
  if (S.phase !== 'life') return;
  const st = nation.stats;
  const med = medianLMD(sim);
  const fw = S.focusW;

  // 소득. v1: 진로가 정한다(§3.3-4, drift 없음). 진로 없이 콘텐츠가 준 구 직업(takeJob)은 백분위 고정.
  const kFactors = () => {
    let k = (S.sex === 'F' ? 0.8 : 1) * (1 - 0.08 * race.stigma) * (1 + 0.1 * (fw.work || 0));
    if (S.ori.stage >= 2) k *= 0.7;
    if (S.flags.quarantined) k *= 0.6;
    if (S.flags.oriHidden) k *= 0.85;
    if (S.serving) k *= 0.5;
    if (S.age < 15) k *= 0.5;                   // 아동 노동 임금
    if (S.ori.on && S.arts >= 1.28) k *= 1.15;   // 감염자 아츠 보너스
    k *= relIncomeMul(S.rel);                   // §9 관계 등급 소득 배율
    if (S.res && S.res.phase === 'settling') k *= 0.85;
    if (S.res && S.res.papers === 'illegal') k *= 0.7;
    return k;
  };
  const tr = S.track ? sim.data.trackById[S.track.id] : null;
  if (S.prison === 'camp' && !(tr && tr.forced)) { S.income = 0; }
  else if (S.job === 'homemaker') { S.income = 0; S.jobY++; S.flags.homemakerYears = (S.flags.homemakerYears || 0) + 1; }
  else if (tr && !S.retired) {
    const mul = trackIncomeMul(sim);
    let base;
    if (tr.job && sim.data.jobById[tr.job] && tr.archetype === 'A11') {
      // 생업: jobs.json lo/hi 백분위를 단계 위치로 보간(drift 없음)
      const j = sim.data.jobById[tr.job];
      const n = Math.max(1, tr.stages.length - 1);
      const pct = clamp(j.lo + (j.hi - j.lo) * (S.track.stage / n) + 0.1 * (S.cap ? S.cap.skill : 0) * (j.hi - j.lo), 0.02, 0.98);
      const sm = tr.income.stage[Math.min(S.track.stage, tr.income.stage.length - 1)];   // W11: 단계 소득 배율 0(SAR_SLAVE 노예 단계)이면 소득 0, 나눗셈 NaN 방지
      base = sm > 0 ? toLMD(incomeAt(st.ppp, st.gini, pct)) * (mul / sm) : 0;
    } else base = med * mul;
    S.income = Math.round(base * kFactors());
    S.pct = S.income > 0 ? clamp(0.5 + Math.log(S.income / med) / (2 * sigmaOf(st.gini)) * 0.5, 0.02, 0.98) : 0.02;
  } else if (job && !S.retired) {
    S.jobY++;
    S.income = Math.round(toLMD(incomeAt(st.ppp, st.gini, S.pct)) * kFactors());
  } else if (S.retired) S.income = S.pension;
  else S.income = 0;
  S.stats.maxIncome = Math.max(S.stats.maxIncome, S.income);
  S.stats.maxPct = Math.max(S.stats.maxPct, S.job ? S.pct : 0);

  // 가계: 배우자 소득을 합산한 가계 소득(hh)으로 생활비·저축을 센다(D35)
  const pInc = partnerIncome(sim);
  if (S.fam.partner) S.fam.partner.inc = pInc;
  const hh = S.income + pInc;
  S.flags.hhInc = hh;
  S.flags.hhPct = hh > 0 ? clamp(0.5 + Math.log(hh / med) / (2 * sigmaOf(st.gini)) * 0.5, 0.02, 0.98) : 0.02;
  let net = 0;
  if (hh > 0) net += hh * clamp(0.35 * (1 - 0.6 * med / hh), 0, 0.4) * (pInc > 0 ? 0.85 : 1);   // 두 사람 생활비
  const kidsU16 = S.fam.kids.filter((k) => k.alive && S.age - k.bornAt < 16).length;
  if (kidsU16) net -= kidsU16 * 0.04 * Math.max(hh, med * 0.5);
  const adult = S.age >= 16 && !S.school;
  if (adult && S.prison !== 'camp' && hh < med * 0.3) net -= (med * 0.3 - hh) * 0.5;

  if (S.flags.oriPremium) {
    const prem = S.income * S.flags.oriPremium;
    net -= prem;
    if (S.money + net < 0) {
      S.flags.premiumMissed = (S.flags.premiumMissed || 0) + 1;
      if (S.flags.premiumMissed >= 2) { sim.log('보험료 미납으로 추방 통보를 받았습니다.', 'bad'); S.flags.migReasonDetail = 'insurance_default'; sim.migrate('exile'); if (S.phase !== 'life') return; }
    } else S.flags.premiumMissed = 0;
  }
  if (S.flags.oriFees) net -= Math.max(S.income * B.neglectFee, med * 0.05);
  S.flags.suppressant = false;
  if (S.ori.on && S.ori.known && !S.ori.treated && !S.rhodes && S.money > med * 2) {
    net -= med * 0.4; S.flags.suppressant = true;
  }
  // W14(QA A14): 이자는 원금 상한(중위 ×debtCap)까지만. 상한을 넘긴 빚이 2년 이어지면 채무 정리 — 재산 압류·불명예(stigma)·관계 손실로 끝내고 −1×중위로 돌아간다(복리 폭주 방지)
  const cap = med * (B.debtCap ?? 3);
  if (S.money < 0) net -= Math.min(-S.money, cap) * 0.06;
  S.money = Math.round(S.money + net);
  S.flags.debtYears = S.money < 0 ? (S.flags.debtYears || 0) + 1 : 0;
  if (S.money < -cap) {
    S.flags.debtOver = (S.flags.debtOver || 0) + 1;
    if (S.flags.debtOver >= 2) {
      S.flags.debtOver = 0; S.flags.debtCrisisAt = S.age; S.stats.debtCrises = (S.stats.debtCrises || 0) + 1;
      S.money = -Math.round(med);
      S.home.owned = false; S.flags.homeOwner = false;
      if (!S.status.stigma) S.status.stigma = 'disgrace';
      if (S.track && !trackOf(sim).forced) { const t = trackOf(sim); if (t.A.flags.homeLink && S.track.stage > 0) demote(sim, { quiet: true }); }
      sim.log('빚이 갚을 수 있는 선을 넘었습니다. 집기와 집이 채권자에게 넘어갔고, 이름에 금이 갔습니다. 남은 빚은 ' + Math.round(med).toLocaleString() + ' LMD.', 'bad', '(' + (sim.nation.statOrg || '기록소') + ' 채무 정리 등기, ' + sim.year + '년)', { h: -6, money: 0 });
      sim.eff({ h: -6 });
    }
  } else S.flags.debtOver = 0;
}
