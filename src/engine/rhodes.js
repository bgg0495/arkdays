// 로도스 아일랜드 루트(§10, D14·D41·D42). 9개 입구(via) 트리거 → 결정 rhodes_offer → 합류(joinRhodes) → status·dept 배치 → RHO_* 진로.
// 데이터는 prepareData 가 정규화한 data.rhodes = { entries[], depts{dept→track}, deptList[], statusRules[], patientToOperator, contractorToOperator,
//   ports[[id,w]], offices[], lostYear, closed[{when, rumorOnly}], diagnosis[], opGrades }.
// 접점 이벤트 플래그는 콘텐츠가 세운다(S.flags.<event> = 나이 또는 true; 나이면 그 해·다음 해만 유효, true 면 한 번 쓰고 지운다).
//   referral: rhodes_operation / rhodes_legal / rhodes_medical_pact / rhodes_rescue (또는 구 rhodesContact)
//   rescue:   catastrophe_hit(엔진) / bigevent_survive / fall_experiment_survive / fall_camp_survive (또는 구 rhodesRescue)
//   companion: rhodesCompanion
// volunteer·treatment·agreement·flight·transfer·babel 은 엔진이 상태만 보고 굴린다.
// 캐논 6종 등급 operatorProfile(sim), 임상 진단 수치 clinical(sim) 은 UI 가 호출.
import { clamp } from './rng.js';
import { BALANCE as B } from './balance.js';
import { grade as capGrade } from './caps.js';
import { trackOf, enterTrack, leaveTrack } from './track.js';
import { migrateTo } from './migration.js';
import { expHealth } from './death.js';

const R = () => B.rhodes;
export const VIA_LABEL = { volunteer: '공개 모집 공고를 보고 지원했다', referral: '눈여겨본 덕에 헤드헌팅 제안이 왔다', treatment: '치료를 받으러 갔다', rescue: '작전 지역에서 구조됐다',
  agreement: '협정으로 파견됐다', companion: '가족을 따라 배에 올랐다', flight: '쫓기다가 배에 올랐다', transfer: '소속을 옮겼다', babel: '바벨이 해체되고 배는 남았다' };
export const DEPT_LABEL = { field: '외근부', medical: '의료부', engineer: '엔지니어링부', logistics: '후방지원부', purchase: '구매 및 시장 운영부', office: '주재 사무소', hr: '인사부', patient: '환자' };
const DEFAULT_DEPT_TRACK = { field: 'RHO_OPERATOR', medical: 'RHO_MEDICAL', engineer: 'RHO_ENGINEER', logistics: 'RHO_LOGISTICS', purchase: 'RHO_PURCHASE', office: 'RHO_OFFICE', hr: 'RHO_HR', patient: 'RHO_PATIENT', contractor: 'RHO_CONTRACTOR' };

const rh = (sim) => sim.data.rhodes;
const deptTrack = (sim, dept) => (rh(sim).depts && rh(sim).depts[dept]) || DEFAULT_DEPT_TRACK[dept] || null;
/** 플래그 유효: true 면 소비, 숫자(나이)면 그 해·다음 해 */
function flagHit(S, keys, consume = true) {
  for (const k of keys) {
    const v = S.flags[k];
    if (v === true) { if (consume) S.flags[k] = false; return true; }
    if (typeof v === 'number' && S.age - v <= 1 && S.age - v >= 0) return true;
  }
  return false;
}
const capAnyOk = (S, need) => !need || Object.entries(need).some(([k, v]) => ((S.cap && S.cap[k]) ?? 0) >= v);

/** 콘텐츠·구 코드 호환: S.rhodes === true 를 객체로 */
export function normalizeRhodes(sim) {
  const { S } = sim;
  if (S.rhodes === true) joinRhodes(sim, S.flags.rhodesVia || 'treatment', { quiet: true, legacy: true });
}

/** §10.4 닫힘 조건. via 를 주면 viaNot 예외를 본다. rumorOnly 도 제안은 닫힌 것으로 본다 */
export function rhodesClosed(sim, via = null) {
  const { S } = sim;
  const t = trackOf(sim);
  for (const c of rh(sim).closed) {
    const w = c.when || c;
    if (w.nation && w.nation !== S.cur && w.nation !== S.root) continue;
    if (w.nationAny && !w.nationAny.includes(S.cur) && !w.nationAny.includes(S.root)) continue;
    if (w.prison && S.prison !== w.prison) continue;
    if (w.race && S.race !== w.race) continue;
    if (w.infected != null && !!S.ori.on !== !!w.infected) continue;
    if (w.tracks && !(t && w.tracks.includes(t.id))) continue;
    if (w.tracksNot && t && w.tracksNot.includes(t.id)) continue;
    if (w.years && (sim.year < w.years[0] || sim.year > w.years[1])) continue;
    if (w.year && (sim.year < w.year[0] || sim.year > w.year[1])) continue;
    if (w.region && (S.sub && S.sub.region) !== w.region) continue;
    if (w.q && (S.q < w.q[0] || S.q > w.q[1])) continue;
    if (w.flag && !S.flags[w.flag]) continue;
    if (w.viaNot && via && w.viaNot.includes(via)) continue;
    return true;
  }
  return false;
}

/** 올해 열리는 입구(via) 또는 null */
export function rhodesTrigger(sim) {
  const { S, rng } = sim;
  if (S.rhodes || S.phase !== 'life' || S.age < 12 || S.cur === 'rhodes') return null;
  if (S.flags.rhodesDeclinedAt != null && S.age - S.flags.rhodesDeclinedAt < (rh(sim).deferGap || 3)) return null;
  const t = trackOf(sim);
  const stage = S.track ? S.track.stage : -1;
  for (const e of rh(sim).entries) {
    if (rhodesClosed(sim, e.via)) continue;
    const p = e.p * (R().pScale ?? 1);
    const trackOk = !e.tracks || (t && e.tracks.includes(t.id));
    const archOk = !e.archetypes || (t && e.archetypes.includes(t.archetype));
    const stageOk = e.stageMin == null || stage >= e.stageMin;
    switch (e.via) {
      case 'volunteer': {
        if (e.infected === 'none' && S.ori.on) break;
        if (e.infected === 'undiagnosed_or_none' && S.ori.on && S.ori.known) break;
        if (e.ages && (S.age < e.ages[0] || S.age > e.ages[1])) break;
        if (S.school || S.prison) break;
        if (!capAnyOk(S, e.capAny)) break;
        if (e.officeNation && rh(sim).offices.length && !rh(sim).offices.includes(S.cur) && !rh(sim).offices.includes(S.root)) break;
        if (e.archetypes && !(archOk && stageOk)) break;
        if (rng.chance(p)) return 'volunteer';
        break;
      }
      case 'referral': {
        if (!flagHit(S, e.flags)) break;
        if (capAnyOk(S, e.capAny) || (e.orFalling && S.flags.lastFallAt === S.age - 1)) { if (rng.chance(Math.max(p, 0.5))) return 'referral'; }
        break;
      }
      case 'treatment': {
        if (!S.ori.on || !S.ori.known || S.flags.rhodesOffer != null || S.prison === 'camp') break;
        const okPol = (e.policies || []).includes(sim.policy) || (e.money != null && S.money >= sim.med * e.money) || (e.forcedTrack && t && t.forced);
        if (!okPol) break;
        if (rng.chance(p)) return 'treatment';
        break;
      }
      case 'rescue': {
        if (!flagHit(S, e.flags)) break;
        if (e.operationArea && rh(sim).ports.length && !rh(sim).ports.some(([id]) => id === S.cur || id === S.root)) break;
        if (rng.chance(p)) return 'rescue';
        break;
      }
      case 'agreement': if (t && trackOk && archOk && stageOk && (e.tracks || e.archetypes) && rng.chance(p)) return 'agreement'; break;
      case 'companion': if (flagHit(S, e.flags) && rng.chance(p)) return 'companion'; break;
      case 'flight': {
        if (e.papers && !(S.res && e.papers.includes(S.res.papers))) break;
        if (e.fallOutcome && !(S.flags.lastFallOutcome && e.fallOutcome.includes(S.flags.lastFallOutcome) && S.age - (S.flags.lastFallAt ?? -99) <= 3)) break;
        if (!capAnyOk(S, e.capAny)) break;
        if (rng.chance(p)) return 'flight';
        break;
      }
      case 'transfer': if (t && trackOk && stageOk && e.tracks && rng.chance(p)) return 'transfer'; break;
      case 'babel': {
        if (e.nation && S.born !== e.nation) break;
        if (e.bornBefore != null && S.by > e.bornBefore) break;
        if (!(t && trackOk)) break;
        if (e.years && (sim.year < e.years[0] || sim.year > e.years[1])) break;
        if (rng.chance(p)) return 'babel';
        break;
      }
    }
  }
  return null;
}

// ── 배치(§10.2) ──────────────────────────────────────────────────────────
function cmp(expr, v) { const m = /^(<=|>=|<|>|==)?\s*(-?[\d.]+)$/.exec(String(expr)); if (!m) return true; const n = +m[2]; switch (m[1] || '>=') { case '<=': return v <= n; case '<': return v < n; case '>': return v > n; case '==': return v === n; default: return v >= n; } }
function prevArchetypes(sim) {
  const out = new Set();
  const t = trackOf(sim); if (t) out.add(t.archetype);
  for (const h of sim.S.trackHist || []) { const x = sim.data.trackById[h.id]; if (x) out.add(x.archetype); }
  return out;
}
function ruleOk(sim, cond, via) {
  const { S } = sim;
  if (cond.via && cond.via !== via) return false;
  if (cond.infected != null && !!S.ori.on !== !!cond.infected) return false;
  if (cond.money && !cmp(cond.money, S.money / Math.max(1, sim.med))) return false;
  if (cond.cap) for (const [k, ex] of Object.entries(cond.cap)) if (!cmp(ex, (S.cap && S.cap[k]) ?? 0)) return false;
  if (cond.infectedStage && !cmp(cond.infectedStage, S.ori.stage)) return false;
  if (cond.prevArchetypes || cond.prevJobs) {
    const pa = prevArchetypes(sim);
    const jobs = new Set([S.job, S.flags.jobBeforeHome, ...(S.years || []).map((y) => y.job)].filter(Boolean));
    const hitA = cond.prevArchetypes && cond.prevArchetypes.some((a) => pa.has(a));
    const hitJ = cond.prevJobs && cond.prevJobs.some((j) => jobs.has(j));
    if (!hitA && !hitJ) return false;
  }
  if (cond.served && !S.served) return false;
  return true;
}
/** 신분·부서 배치. 데이터 statusRules 가 있으면 첫 일치, 없으면 §10.2 기본 규칙 */
export function placeRhodes(sim, via) {
  const { S } = sim;
  const rules = rh(sim).statusRules;
  if (rules && rules.length) {
    for (const r of rules) if (ruleOk(sim, r.if || {}, via)) {
      const dept = r.dept || (r.deptAny ? sim.rng.pick(r.deptAny) : 'logistics');
      return { status: r.status || 'operator', dept, track: r.track || deptTrack(sim, dept), laborFor: r.laborFor || null };
    }
  }
  const cap = S.cap || {};
  const infected = S.ori.on;
  if (via === 'agreement') return { status: 'contractor', dept: 'field', track: deptTrack(sim, 'contractor') };
  if ((via === 'treatment' || via === 'rescue' || (infected && S.ori.stage >= 2)) && infected) return { status: 'patient', dept: S.money >= sim.med * R().treatmentMoney ? 'medical' : 'logistics', track: deptTrack(sim, 'patient') };
  const pa = prevArchetypes(sim);
  if (((cap.skill ?? 0) >= 0.5 && (!infected || S.ori.stage <= 1)) || ['A4', 'A6', 'A2'].some((a) => pa.has(a)) || S.served) return { status: 'operator', dept: 'field', track: deptTrack(sim, 'field') };
  if ((cap.learn ?? 0) >= 0.5) { const d = pa.has('A9') && S.flags.labIntern ? 'engineer' : (sim.rng.chance(0.5) ? 'medical' : 'engineer'); return { status: 'operator', dept: d, track: deptTrack(sim, d) }; }
  if (['A10', 'A3'].some((a) => pa.has(a))) { const d = sim.rng.pick(['office', 'hr', 'purchase']); return { status: 'operator', dept: d, track: deptTrack(sim, d) }; }
  const d = sim.rng.pick(['logistics', 'purchase', 'office']);
  return { status: 'operator', dept: d, track: deptTrack(sim, d) };
}

/** 합류. 본함 거주(res.nation='rhodes', papers 'agreement'), 상태 객체, 부서 진로. 협정(contractor)은 원 소속·거주 유지 */
export function joinRhodes(sim, via = 'treatment', opts = {}) {
  const { S, data } = sim;
  if (S.rhodes && S.rhodes !== true) return false;
  const place = opts.place || placeRhodes(sim, via);
  const keep = place.status === 'contractor';
  S.rhodes = { via, status: place.status, dept: place.dept, since: S.age };
  S.ori.treated = true;
  S.flags.rhodesAt = S.flags.rhodesAt ?? S.age; S.flags.rhodesOffer = null; S.flags.rhodesVia = via;
  S.flags.quarantined = false; S.flags.noMove = false; S.flags.oriHidden = false; S.flags.euthTrack = false; S.flags.euthNotice = null; S.flags.oriFees = false; S.flags.oriPremium = 0;
  if (S.prison) { S.prison = null; S.prisonLeft = 0; }
  if (data.nationById.rhodes && !keep) migrateTo(sim, 'rhodes', 'rhodes', { papers: 'agreement', quiet: true, keepTrack: false });
  else if (keep) S.flags.rhodesContractorFrom = S.cur;
  if (!keep) {
    const tid = place.track;
    if (tid && data.trackById[tid]) enterTrack(sim, tid, { how: 'rhodes', via, quiet: true, aff: null });
    else if (S.track) leaveTrack(sim, 'rhodes', { quiet: true });
  } else if (place.track && data.trackById[place.track] && !S.track) enterTrack(sim, place.track, { how: 'rhodes', via, quiet: true, aff: null });
  if (!opts.quiet) sim.log('로도스 아일랜드에 합류했습니다. ' + (VIA_LABEL[via] || '') + (VIA_LABEL[via] ? '. ' : '') + (place.status === 'patient' ? '환자로 등록되었습니다.' : place.status === 'contractor' ? '협력 계약자 카드를 받았습니다.' : DEPT_LABEL[place.dept] + ' 배치.'), 'big', '(로도스 아일랜드 인사부 채용과 기록)');
  else if (opts.legacy) sim.log('로도스 아일랜드 ' + (place.status === 'patient' ? '환자로 등록되었습니다.' : DEPT_LABEL[place.dept] + '에 배치되었습니다.'), 'note');
  sim.HOOK.change(S, sim);
  return true;
}

/** 환자 → 정식 직원 전환, 협력 계약자 → 정식 전환. 연말 */
export function rhodesYear(sim) {
  const { S, rng } = sim;
  if (!S.rhodes || S.rhodes === true || S.phase !== 'life') return;
  const r = S.rhodes;
  const p2o = rh(sim).patientToOperator || { afterYears: 2, pYear: 0.25, stageMax: 2 };
  if (r.status === 'patient' && S.ori.stage <= (p2o.stageMax ?? 2) && S.age - r.since >= (p2o.afterYears ?? 2) && rng.chance(p2o.pYear ?? 0.25)) {
    const place = placeRhodes(sim, 'volunteer');
    r.status = 'operator'; r.dept = place.dept;
    if (place.track && sim.data.trackById[place.track]) enterTrack(sim, place.track, { how: 'rhodes', via: 'patient', quiet: true, aff: null });
    sim.log('치료가 안정되어 정식 직원으로 전환되었습니다. ' + DEPT_LABEL[place.dept] + '.', 'warm');
  }
  const c2o = rh(sim).contractorToOperator || { afterYears: 3 };
  if (r.status === 'contractor' && S.age - r.since >= (c2o.afterYears ?? 3) && rng.chance(0.2)) {
    r.status = 'operator'; r.dept = 'field';
    sim.log('협력 계약이 끝나고 정식 직원이 되었습니다.', 'ev');
    if (sim.data.nationById.rhodes && S.cur !== 'rhodes') migrateTo(sim, 'rhodes', 'rhodes', { papers: 'agreement', quiet: true, keepTrack: false });
    const tid = deptTrack(sim, 'field');
    if (tid && sim.data.trackById[tid]) enterTrack(sim, tid, { how: 'rhodes', via: 'agreement', quiet: true, aff: null });
  }
}

/** 캐논 6종 등급(§10.3). z → 결함/보통/표준/우수/뛰어남/탁월 */
export function opGrade(z, data) {
  const g = (data && data.rhodes && data.rhodes.opGrades) || R().opGrades;
  for (const [cut, label] of g) if (z < cut) return label;
  return g[g.length - 1][1];
}
export function operatorProfile(sim) {
  const { S } = sim;
  const cap = S.cap || { skill: 0, learn: 0, arts: 0, ties: 0 };
  const hz = clamp((S.st.hl - expHealth(sim)) / 12, -3, 3);
  const active = S.trait === 'act' ? 1 : 0;
  const military = S.served || (S.trackHist || []).some((h) => { const t = sim.data.trackById[h.id]; return t && ['A4', 'A6'].includes(t.archetype); }) || (trackOf(sim) && ['A4', 'A6'].includes(trackOf(sim).archetype));
  const rows = [
    { k: 'strength', label: '물리적 강도', z: 0.6 * cap.skill + 0.4 * hz },
    { k: 'mobility', label: '전장 기동력', z: 0.5 * cap.skill + 0.3 * active + 0.2 * hz },
    { k: 'endurance', label: '생체 인내도', z: hz - S.ori.stage * 0.5 },
    { k: 'tactics', label: '전술 계획력', z: cap.learn },
    { k: 'combat', label: '전투 기술력', z: cap.skill + (military ? 0.3 : 0) },
    { k: 'arts', label: '오리지늄 아츠 적응성', z: cap.arts },
  ];
  for (const r of rows) { r.z = +r.z.toFixed(2); r.grade = opGrade(r.z, sim.data); }
  return rows;
}

const CLINICAL_FALLBACK = [
  { stage: 0, uL: [0, 9], text: '방사선 검사 결과 오리지늄 결정의 흔적은 보이지 않음.' },
  { stage: 1, uL: [0, 0.15], text: '방사선 검사 결과 피부 표면에 미세한 오리지늄 결정이 소량 확인되었으며, 주요 장기에는 침착 소견이 없음.' },
  { stage: 1, uL: [0.15, 0.3], text: '방사선 검사 결과 사지 말단과 피하 조직에서 결정 침착이 관찰됨. 억제제 투여를 권고함.' },
  { stage: 2, uL: [0.3, 0.5], text: '방사선 검사 결과 체표 결정이 넓게 분포하며 순환계 일부에서 결정 밀도 상승이 확인됨.' },
  { stage: 3, uL: [0.5, 9], text: '방사선 검사 결과 주요 장기 표면에 결정 침착이 확인되었으며 융합률이 임계 범위에 근접함.' },
];
/** 임상 진단 분석(§10.3): 융합률 %(창작식), 결정 밀도 u/L, 단계별 템플릿 문장(데이터 diagnosis.templates 우선) */
export function clinical(sim) {
  const { S } = sim;
  const uL = S.ori.on ? S.ori.uL : 0;
  const seed = (S.flags.clinicalNoise ??= +sim.rng.norm(0, R().fusionSd).toFixed(2));
  const fusion = clamp(uL * R().fusionMul + seed, 0, R().fusionMax);
  const templates = (rh(sim).diagnosis && rh(sim).diagnosis.length) ? rh(sim).diagnosis : CLINICAL_FALLBACK;
  const stage = S.ori.on ? S.ori.stage : 0;
  const treatedYears = S.rhodes && S.rhodes !== true ? S.age - S.rhodes.since : 0;
  let line = null;
  const stable = templates.find((t) => t.requires && t.requires.treatedYears != null && treatedYears >= t.requires.treatedYears && S.ori.on && S.flags.uLTrendDown);
  if (stable) line = stable.text;
  else {
    const cand = templates.filter((t) => !t.requires && (t.stage == null || t.stage === stage) && (!t.uL || (uL >= t.uL[0] && uL < t.uL[1])));
    line = (cand[0] || templates.find((t) => !t.requires && t.stage === stage) || CLINICAL_FALLBACK[Math.min(stage, 3) + (stage === 0 ? 0 : 0)] || CLINICAL_FALLBACK[0]).text;
  }
  return { fusion: +fusion.toFixed(1), density: +uL.toFixed(2), line, stage };
}

/** UI 요약: 오퍼레이터면 6종, 환자·감염 직원이면 임상 블록 */
export function rhodesCard(sim) {
  const { S } = sim;
  if (!S.rhodes || S.rhodes === true) return null;
  const r = S.rhodes;
  return { via: r.via, viaLine: VIA_LABEL[r.via], status: r.status, dept: r.dept, deptLabel: DEPT_LABEL[r.dept], since: r.since,
    profile: r.status === 'operator' && r.dept === 'field' ? operatorProfile(sim) : null,
    clinical: r.status === 'patient' || S.ori.on ? clinical(sim) : null,
    capGrades: S.cap ? Object.fromEntries(Object.entries(S.cap).map(([k, v]) => [k, capGrade(v)])) : null };
}
