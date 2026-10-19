// W4b 성인기(19~64세) 직업 콘텐츠: 공통 일터 이벤트 약 40개 · 결정 4개(첫 직업, 이직, 창업, 은퇴 준비).
// 엔진이 이미 하는 것(취업 jobYear, 소득 drift, 3기 직업 상실, 은퇴 retire65)은 다시 만들지 않고 그 결과를 서사로 꾸민다.
// 담백한 "~했습니다"체(D25). 각주 f 는 세계관 안의 출처만. 콜백은 전부 ctx 첫 인자(D23). 공용 파일은 읽기만 한다.
import { jobOffers, jobEligible, takeJob } from '../src/engine/finance.js';
import { makeName, familyNames } from '../src/engine/names.js';
import { humanAge } from '../src/engine/lifetable.js';
import { eul, iga, eun, wa, ro, ieot } from '../src/engine/text.js';
import { cul, org, fest, F, orgF, rhodesF, given, poor, rich, nomadic, upper, under, artsTop, lifeRoll, once, medX, jobName } from './_util.js';

// ────────────────────────────────────────────────────────────────────────────
// W4b 공용 도우미(다른 adult_*.js 가 import 한다)
// ────────────────────────────────────────────────────────────────────────────
/** 그 해 한 번만 굴리는 확률 롤. 결정 ok() 는 planYear 와 openDecision 에서 두 번 평가되므로 결과를 나이와 함께 flags 에 둔다 */
export function yr(s, key, p) {
  const k = 'yr_' + key;
  const v = s.S.flags[k];
  if (v && v.a === s.S.age) return v.ok;
  const ok = s.rng.chance(p);
  s.S.flags[k] = { a: s.S.age, ok };
  return ok;
}
export const hum = (s) => humanAge(s.S.age, s.race.lifeMul);
export const adult = (s) => s.S.age >= 19 && !s.S.school && !s.S.serving && !s.S.prison;
export const working = (s) => adult(s) && !!s.S.job && s.S.job !== 'homemaker' && !s.S.retired;
export const homemaker = (s) => s.S.job === 'homemaker';
export const jobIs = (s, ...ids) => !!s.S.job && ids.includes(s.S.job);
export const partner = (s) => (s.S.fam.partner && s.S.fam.partner.alive ? s.S.fam.partner : null);
export const kids = (s) => s.S.fam.kids.filter((k) => k.alive);
export const kidAge = (s, k) => s.S.age - k.bornAt;
/** 최근 3년 소득 백분위 변화 */
export function pct3(s) {
  const y = s.S.years;
  if (y.length < 4) return 0;
  return y[y.length - 1].pct - y[y.length - 4].pct;
}
/** 진단 시점 정책(없으면 현재 해석 정책) */
export const pol = (s) => s.S.flags.oriPolicy || s.policy;
/** 동료·지인 이름 하나 */
export function someone(s, sex) {
  return makeName(s.data, s.rng, { lang: s.nation.nameLang, sex: sex || (s.rng.chance(0.5) ? 'M' : 'F'), race: s.S.race, avoid: familyNames(s.S) }).given;
}
export const fmtLMD = (n) => Math.round(n).toLocaleString() + ' LMD';
/** 직업 선택지 설명 한 줄 */
export function jobSub(s, j) {
  const parts = [];
  const mid = (j.lo + j.hi) / 2;
  parts.push(mid >= 0.7 ? '벌이 좋음' : mid >= 0.45 ? '벌이 보통' : '벌이 적음');
  if (j.oriMul >= 2.5) parts.push('감염 위험');
  if (j.risk && (j.risk.war || j.risk.violence >= 3 || j.risk.vendetta || j.risk.major_arena)) parts.push('목숨 위험');
  if (j.special) parts.push(s.nation.name + ' 고유');
  return parts.join(', ');
}
/** 국가 특수 직업 후보 1개(D26): 유년기 플래그가 가리키는 길 → 국가 상징 직업 중 자격이 되는 것 */
const FLAG_JOB = {
  conservatory: ['musician'], inquisitionTrainee: ['inquisitor'], lgdCadet: ['lgd_officer'], cadet: ['legionary'], notaryTrainee: ['notary'],
  labIntern: ['rhine_lab', 'engineer'], academy: ['tianshi_official', 'civil_servant'], casterRoute: ['caster', 'arts_knight'], dojo: ['shinobi'],
  knightTrial: ['knight', 'knight_trainee'], snowApprentice: ['snowpriest'], famigliaEye: ['famiglia'], guardianGun: ['gun_knight', 'gunsmith'],
};
export function specialOffer(s, exclude = []) {
  const { S, data } = s;
  for (const [flag, ids] of Object.entries(FLAG_JOB)) {
    if (!S.flags[flag]) continue;
    for (const id of ids) { const j = data.jobById[id]; if (j && !exclude.includes(id) && jobEligible(s, j)) return j; }
  }
  const cands = (s.nation.jobs || []).map((id) => data.jobById[id]).filter((j) => j && !exclude.includes(j.id) && j.sector !== 'none' && jobEligible(s, j));
  if (!cands.length) return null;
  return s.rng.pick(cands);
}

const HAZARD_JOBS = ['miner', 'ori_miner', 'factory_worker', 'construction', 'driver', 'dock_worker', 'laborer', 'platform_builder', 'railway', 'nomad_crew', 'boilerman', 'cat_messenger', 'truck_driver', 'forester', 'pitsinker'];

// ────────────────────────────────────────────────────────────────────────────
// 이벤트
// ────────────────────────────────────────────────────────────────────────────
export const events = [
  { id: 'work_first_day', a: [19, 32], w: 60, c: (s) => working(s) && s.S.jobY <= 1 && !s.S.flags.firstDayTold,
    run: (s) => { s.S.flags.firstDayTold = s.S.age;
      const j = s.job;
      return { t: ro(j.name) + ' 첫 출근을 했습니다. ' + s.rng.pick(['이름을 세 번 잘못 불렸습니다.', '점심은 ' + ieot(cul(s).food) + '고, 혼자 먹었습니다.', '퇴근 시간이 되어도 아무도 일어나지 않아 같이 앉아 있었습니다.', '첫 월급은 ' + ro(fmtLMD(s.S.income / 12)) + ' 적혀 있었습니다.']),
        k: 'ev', fx: { h: 2, so: 1 }, f: orgF(s, '노동 대장 신규 등록', s.year) }; } },
  { id: 'work_commute', a: [19, 64], w: 10, gap: 7, c: (s) => working(s),
    run: (s) => ({ t: nomadic(s) ? (under(s) ? '지하층에서 작업층까지 승강기를 두 번 갈아탔습니다. 아침마다 ' + s.rng.ri(40, 90) + '분이 사라졌습니다.' : '상층 거주구에서 일터까지 걸어서 ' + s.rng.ri(8, 20) + '분이었습니다. 창밖으로 도시가 움직였습니다.')
      : (s.S.urban ? '출근길 전차는 늘 만원이었습니다. 서서 가는 법을 익혔습니다.' : '일터까지 걸어서 한 시간이었습니다. 겨울에는 더 걸렸습니다.'), k: 'note', fx: { hl: nomadic(s) && under(s) ? -1 : 0 },
      f: orgF(s, '교통 이용 집계') }) },
  { id: 'work_coworker', a: [19, 58], w: 25, c: (s) => working(s) && !s.S.flags.coworkerName && lifeRoll(s, 'cow', 0.85),
    run: (s) => { const n = someone(s); s.S.flags.coworkerName = n;
      return { t: wa(n) + ' 같은 조가 되었습니다. ' + s.rng.pick(['점심을 같이 먹기 시작했습니다.', '퇴근 후 ' + cul(s).drink + ' 한 잔을 나누는 사이가 되었습니다.', '일을 가르쳐 주었고, 실수는 대신 덮어 주었습니다.']), k: 'warm', fx: { so: 3, h: 2 },
        f: orgF(s, '근무 편성표') }; } },
  { id: 'work_coworker_leaves', a: [22, 62], w: 12, c: (s) => !!s.S.flags.coworkerName && !s.S.flags.coworkerGone && s.S.age - (s.S.flags.ev_work_coworker || 0) >= 3,
    run: (s) => { s.S.flags.coworkerGone = true; const n = s.S.flags.coworkerName;
      const how = s.rng.pick([iga(n) + ' 다른 도시로 옮겨 갔습니다. 편지는 두 번 왔습니다.', eun(n) + ' 검진 뒤 출근하지 않았습니다. 아무도 이유를 말하지 않았습니다.', iga(n) + ' 결혼해서 일을 그만두었습니다. 잔치에 갔습니다.', eun(n) + ' 해고되었습니다. 짐은 상자 하나였습니다.']);
      return { t: how, k: 'loss', fx: { so: -2, h: -2 }, f: orgF(s, '근무 편성표 변경분') }; } },
  { id: 'work_promotion', a: [22, 62], w: 35, gap: 4, c: (s) => working(s) && s.S.jobY >= 3 && pct3(s) >= 0.035,
    run: (s) => ({ t: s.rng.pick(['직급이 하나 올랐습니다. 명패가 바뀌었고 책상은 그대로였습니다.', '승진했습니다. 월급보다 책임이 먼저 늘었습니다.', '윗사람이 옮겨 가면서 그 자리를 맡게 되었습니다.']) + (s.S.flags.coworkerName && !s.S.flags.coworkerGone ? ' ' + eun(s.S.flags.coworkerName) + ' 축하한다고 했고, 그날 저녁은 조용했습니다.' : ''),
      k: 'warm', fx: { h: 3, so: 1 }, f: orgF(s, '직급 변동 신고', s.year) }) },
  { id: 'work_demotion', a: [22, 62], w: 35, gap: 4, c: (s) => working(s) && s.S.jobY >= 3 && pct3(s) <= -0.035,
    run: (s) => ({ t: s.rng.pick(['자리가 바뀌었습니다. 창가에서 복도 쪽으로. 아무도 설명하지 않았습니다.', '맡고 있던 일이 더 젊은 사람에게 넘어갔습니다.', '월급 봉투가 얇아졌습니다. 봉투에는 사정이 적혀 있지 않았습니다.']), k: 'bad', fx: { h: -3 },
      f: orgF(s, '직급 변동 신고', s.year) }) },
  { id: 'work_overwork', a: [19, 64], w: (s) => ((s.S.focusW.work || 0) >= 0.5 ? 35 : (s.nation.threats || []).includes('overwork') ? 30 : 12), gap: 3, c: (s) => working(s),
    run: (s) => ({ t: s.rng.pick(['올해는 쉬는 날이 손에 꼽혔습니다. ' + fest(s) + '도 일터에서 보냈습니다.', '막차를 놓치는 날이 늘었습니다. 일터 구석에서 자는 법을 배웠습니다.', '손이 떨리기 시작했습니다. 의사는 자라고 했고, 상사는 끝내라고 했습니다.']),
      k: 'bad', fx: { hl: -2, h: -2, money: Math.round(s.S.income * 0.04) }, f: rhodesF('소책자 「과로와 결정 밀도」') }) },
  { id: 'work_accident', a: [19, 64], w: 25, gap: 5, c: (s) => working(s) && HAZARD_JOBS.includes(s.S.job),
    run: (s) => {
      const bad = s.rng.chance(0.35);
      return { t: bad ? '작업장에서 사고가 났습니다. ' + s.rng.pick(['갱도 지지대가 무너졌습니다.', '기계에 손이 끼었습니다.', '적재물이 쏟아졌습니다.','플레이트 이음새가 벌어졌습니다.']) + ' 석 달을 누워 지냈고, 그동안의 임금은 절반이 나왔습니다.'
        : '작업장에서 사고가 났습니다. 옆 사람이 다쳤고, 저는 손가락 하나로 끝났습니다.', k: 'bad', fx: bad ? { hl: -9, h: -4, money: -Math.round(s.S.income * 0.25) } : { hl: -3, h: -2 },
        f: orgF(s, '산업 재해 접수 ' + s.rng.ri(100, 999) + '호') };
    } },
  { id: 'work_dust', a: [19, 64], w: 25, gap: 4, c: (s) => working(s) && s.job.oriMul >= 2.5,
    run: (s) => ({ t: s.rng.pick(['작업복에서 떨어진 가루가 집 안 어디에나 있었습니다. 아이들 손에도.', '마스크는 한 달에 하나였습니다. 두 달째 썼습니다.', '기침이 멎지 않았습니다. 동료들은 다 그렇다고 했습니다.']), k: 'note', fx: { hl: -2 },
      f: rhodesF('광산·공장 분진 조사') }) },
  { id: 'work_layoff', a: [22, 58], w: 40, c: (s) => working(s) && !s.job.special && !['famiglia', 'mercenary', 'knight'].includes(s.S.job) && (s.S.flags.laidOff == null || s.S.age - s.S.flags.laidOff > 8) && yr(s, 'layoff', s.S.flags.recession === s.S.age - 1 ? 0.1 : 0.025),
    run: (s) => { s.S.job = null; s.S.income = 0; s.S.flags.laidOff = s.S.age; s.S.flags.joblessYears = 0;
      return { t: s.rng.pick(['해고되었습니다. 통지서는 한 장이었고, 이유는 "사정"이었습니다.', '일터가 문을 닫았습니다. 마지막 날 다 같이 ' + eul(cul(s).drink) + ' 마셨습니다.', '정리 명단에 이름이 있었습니다. 위에서 셋째 줄이었습니다.']), k: 'bad', fx: { h: -5, so: -2 },
        f: orgF(s, '고용 종료 신고', s.year) }; } },
  { id: 'work_job_search', a: [19, 62], w: 45, gap: 1, rep: true, c: (s) => adult(s) && !s.S.job && !s.S.retired && s.S.flags.everWorked && !(s.S.ori.stage >= 3),
    run: (s) => ({ t: s.rng.pick(['일자리를 찾아다녔습니다. 문 앞에서 돌아오는 날이 많았습니다.', '소개장을 들고 ' + s.rng.ri(3, 9) + '곳을 돌았습니다. 답은 비슷했습니다.', '아는 사람에게 부탁했습니다. 아는 사람도 일을 찾고 있었습니다.']), k: 'note', fx: { h: -2, money: -medX(s, 0.01) },
      f: orgF(s, '구직 등록부') }) },
  { id: 'work_rehired', a: [19, 63], w: 60, c: (s) => working(s) && s.S.flags.laidOff != null && s.S.jobY <= 1 && s.S.flags.rehiredAt !== s.S.flags.laidOff,
    run: (s) => { s.S.flags.rehiredAt = s.S.flags.laidOff;
      return { t: ro(s.job.name) + ' 다시 일을 시작했습니다. ' + (s.S.age - s.S.flags.laidOff <= 1 ? '오래 쉬지는 않았습니다.' : '쉰 햇수만큼 첫 월급이 가벼웠습니다.'), k: 'warm', fx: { h: 4, so: 1 },
        f: orgF(s, '노동 대장 재등록', s.year) }; } },
  { id: 'work_offer_declined', a: [23, 52], w: 10, gap: 6, c: (s) => working(s) && s.S.jobY >= 3,
    run: (s) => ({ t: '다른 곳에서 사람을 보내 왔습니다. 조건은 나았지만 남았습니다. ' + s.rng.pick(['이유는 설명하기 어려웠습니다.', '옮기면 ' + cul(s).food + ' 파는 집이 없었습니다.', '동료들이 아직 여기 있었습니다.']), k: 'note', fx: { so: 1 },
      f: F('기록된 바 없음') }) },
  { id: 'work_bonus', a: [19, 64], w: 18, gap: 3, c: (s) => working(s),
    run: (s) => ({ t: fest(s) + '에 상여가 나왔습니다. ' + fmtLMD(s.S.income * 0.06) + '. ' + s.rng.pick(['절반은 집에, 절반은 ' + cul(s).drink + '값으로 썼습니다.', '봉투째 어머니에게 드렸습니다.', '빚을 조금 갚았습니다.']), k: 'warm', fx: { money: Math.round(s.S.income * 0.06), h: 2 },
      f: orgF(s, '상여 지급 명세') }) },
  { id: 'work_wage_cut', a: [19, 64], w: 12, gap: 5, c: (s) => working(s),
    run: (s) => ({ t: '임금이 깎였습니다. ' + s.rng.pick(['"경기가 어렵다"고 했습니다. 사장의 차는 새것이었습니다.', '대신 ' + cul(s).food + ' 한 상자가 나왔습니다.', '서명란에는 "자발적 동의"라고 인쇄되어 있었습니다.']), k: 'bad', fx: { money: -Math.round(s.S.income * 0.03), h: -2 },
      f: orgF(s, '임금 변동 신고') }) },
  { id: 'work_strike', a: [19, 60], w: 20, c: (s) => working(s) && s.job.sector === 'ind' && s.S.urban && lifeRoll(s, 'strike', 0.45),
    run: (s) => { const win = s.rng.chance(0.4);
      return { t: '일터에서 파업이 있었습니다. ' + (win ? '보름 뒤 임금이 조금 올랐습니다. 주동자 둘은 돌아오지 못했습니다.' : '사흘 만에 끝났습니다. 아무것도 바뀌지 않았고, 사흘치 임금이 빠졌습니다.'), k: win ? 'ev' : 'bad', fx: win ? { so: 3, money: -Math.round(s.S.income * 0.03) } : { so: 1, h: -2, money: -Math.round(s.S.income * 0.03) },
        f: orgF(s, '노동 쟁의 접수 기록', s.year) }; } },
  { id: 'work_training', a: [19, 55], w: 20, gap: 4, c: (s) => working(s) && (s.S.focusW.learn || 0) >= 0.3,
    run: (s) => { s.S.pct = Math.min(0.98, s.S.pct + 0.01);
      return { t: s.rng.pick(['저녁마다 강습을 들었습니다. 수료증은 액자 없이 서랍에 두었습니다.', '새 기계 다루는 법을 배웠습니다. 젊은 축이 묻기 시작했습니다.', '글을 더 배웠습니다. 서류가 읽히기 시작했습니다.']), k: 'ev', fx: { sm: 3, h: 1 },
        f: orgF(s, '직업 강습 수료자 명단') }; } },
  { id: 'work_night_shift', a: [19, 60], w: 20, gap: 5, c: (s) => jobIs(s, 'factory_worker', 'nurse', 'dock_worker', 'police', 'lgd_officer', 'driver', 'truck_driver', 'boilerman', 'nomad_crew', 'camp_guard', 'gendarme'),
    run: (s) => ({ t: '야근 조로 옮겨졌습니다. ' + s.rng.pick(['낮에 자는 법은 끝내 익히지 못했습니다.', '밤 수당이 조금 붙었습니다. 그만큼 잠을 팔았습니다.', '해를 보는 날이 일주일에 하루였습니다.']), k: 'bad', fx: { hl: -2, h: -1, money: Math.round(s.S.income * 0.03) },
      f: orgF(s, '교대 근무 편성') }) },
  { id: 'work_customer', a: [19, 64], w: 18, gap: 4, c: (s) => jobIs(s, 'shopkeeper', 'merchant', 'cook', 'entertainer', 'domestic', 'penguin_courier'),
    run: (s) => ({ t: s.rng.pick(['단골이 생겼습니다. 이름은 모르고 주문만 압니다.', '손님이 ' + cul(s).food + ' 값을 두고 다퉜습니다. 끝내 깎아 주었습니다.', '비 오는 날 손님이 없어 하루 종일 바닥을 닦았습니다.', '손님 하나가 "' + cul(s).greet + '" 하고 들어와 한 시간을 떠들었습니다. 사지는 않았습니다.']), k: 'note', fx: { so: 1 },
      f: orgF(s, '영업 등록 대장') }) },
  { id: 'work_farm_year', a: [19, 64], w: 30, gap: 2, rep: true, c: (s) => jobIs(s, 'farmer', 'herder', 'plantation', 'pioneer', 'forester'),
    run: (s) => { const good = s.rng.chance(0.5);
      return { t: good ? '수확이 좋았습니다. ' + s.rng.pick(['창고가 처음으로 찼습니다.', fest(s) + '에 고기를 올렸습니다.', '빚을 반 갚았습니다.']) : '수확이 나빴습니다. ' + s.rng.pick(['비가 오지 않았습니다.', '재앙 경보로 보름을 비웠다가 돌아오니 밭이 뒤집혀 있었습니다.', '곡식 값이 떨어져서 거둔 만큼 손해였습니다.']),
        k: good ? 'warm' : 'bad', fx: good ? { money: medX(s, 0.12), h: 2 } : { money: -medX(s, 0.08), h: -2 }, f: orgF(s, '농사 작황 보고', s.year) }; } },
  { id: 'work_herd_loss', a: [19, 64], w: 20, gap: 5, c: (s) => jobIs(s, 'herder', 'hunter', 'forester'),
    run: (s) => ({ t: s.rng.pick(['밤에 베헤모스가 지나갔습니다. 가축 ' + s.rng.ri(3, 12) + '마리가 사라졌습니다.', '사냥길에서 큰 짐승을 만났습니다. 총을 쏘지 않고 돌아왔습니다. 그날 저녁은 없었습니다.', '숲에 들어갔던 이웃이 돌아오지 않았습니다. 사흘을 찾았습니다.']), k: 'bad', fx: { money: -medX(s, 0.1), h: -2 },
      f: orgF(s, '야생 짐승 피해 신고') }) },
  { id: 'work_fisher', a: [19, 64], w: 25, gap: 4, c: (s) => jobIs(s, 'fisher'),
    run: (s) => ({ t: s.S.root === 'iberia' ? s.rng.pick(['그물에 걸린 것은 물고기만이 아니었습니다. 재판소에 신고했고, 그 바다에는 다시 나가지 않았습니다.', '해안 봉쇄령으로 한 달을 묶여 있었습니다. 배는 썩지 않았고 빚은 늘었습니다.', '등대가 밤새 켜져 있었습니다. 좋은 신호가 아니었습니다.'])
      : s.rng.pick(['고기가 잘 들었습니다. 시장에서 값이 떨어졌습니다.', '폭풍에 그물을 잃었습니다. 새 그물 값은 한 달치였습니다.', '먼바다에서 이상한 것을 보았다는 이웃이 있었습니다. 더 묻지 않았습니다.']), k: 'note', fx: { money: s.rng.chance(0.5) ? medX(s, 0.05) : -medX(s, 0.06) },
      f: s.S.root === 'iberia' ? F('재판소 해안 조업 허가 대장') : orgF(s, '어획 신고') }) },
  { id: 'work_caravan', a: [19, 64], w: 25, gap: 3, c: (s) => jobIs(s, 'caravan', 'caravan_guard', 'karlan_trader', 'nomad_courier'),
    run: (s) => { const good = s.rng.chance(0.6);
      return { t: good ? '긴 행로를 무사히 마쳤습니다. ' + s.rng.pick(['삯은 넉넉했고 발은 성치 않았습니다.', '돌아오니 집 아이가 한 뼘 자라 있었습니다.', '사막 너머 도시에서 ' + wa(cul(s).food) + ' 다른 것을 먹어 보았습니다.']) : '행로 중에 습격이 있었습니다. ' + s.rng.pick(['짐 절반을 잃었습니다.', '동료 하나를 묻고 왔습니다.', '하늘이 변하는 것을 보고 길을 바꿨습니다. 늦었지만 살았습니다.']),
        k: good ? 'ev' : 'bad', fx: good ? { money: medX(s, 0.15), hl: -1 } : { money: -medX(s, 0.1), hl: -4, h: -3 }, f: orgF(s, '상단 통행 기록') }; } },
  { id: 'work_teacher', a: [22, 64], w: 25, gap: 5, c: (s) => jobIs(s, 'teacher', 'scholar'),
    run: (s) => ({ t: s.rng.pick(['가르친 아이 하나가 편지를 보냈습니다. 글씨가 저보다 나았습니다.', '학생 하나가 검진에 걸려 교실을 떠났습니다. 빈자리를 치우지 않았습니다.', '교과서가 바뀌었습니다. ' + cul(s).ruler + '에 관한 장이 두 배로 늘었습니다.']), k: 'note', fx: { so: 2, sm: 1 },
      f: orgF(s, '학사 보고') }) },
  { id: 'work_medic', a: [22, 64], w: 25, gap: 4, c: (s) => jobIs(s, 'doctor', 'nurse'),
    run: (s) => ({ t: s.rng.pick(['감염 환자가 늘었습니다. 장갑은 줄었습니다.', '진단서에 숫자를 적는 손이 익숙해졌습니다. 환자 얼굴은 익숙해지지 않았습니다.', '밤새 수술실에 있었습니다. 환자는 살았고, 이름은 기억나지 않습니다.']), k: 'note', fx: { h: -2, hl: -1 },
      f: rhodesF('의료인 노출 지침') }) },
  { id: 'work_desk', a: [22, 64], w: 15, gap: 5, c: (s) => jobIs(s, 'clerk', 'civil_servant', 'banker', 'insurance_agent', 'lawyer', 'notary', 'consul_assigned'),
    run: (s) => ({ t: s.rng.pick(['서류 한 상자가 책상에 왔습니다. 전부 도장 자리가 비어 있었습니다.', '감염자 명단을 옮겨 적는 일이 돌아왔습니다. 이름은 읽지 않고 옮겼습니다.', '상급자가 바뀌었습니다. 결재 도장 모양만 달라졌습니다.', cul(s).address + ' 호칭을 잘못 써서 하루 종일 사과했습니다.']), k: 'note', fx: { sm: 1, h: -1 },
      f: orgF(s, '문서 접수 대장') }) },
  { id: 'work_nomad_crew', a: [19, 64], w: 30, gap: 4, c: (s) => jobIs(s, 'nomad_crew', 'railway', 'platform_builder'),
    run: (s) => ({ t: s.rng.pick(['플레이트 이송 작업이 밤새 이어졌습니다. 도시 한 구역이 통째로 자리를 바꿨습니다.', '구동부 점검에서 균열을 찾았습니다. 보고했고, 보고서는 보름 뒤에 읽혔습니다.', '선로 위에서 하늘이 변하는 것을 보았습니다. 열차는 멈추지 않았습니다.']), k: 'note', fx: { hl: -1, sm: 1 },
      f: orgF(s, '이동도시 운행 일지') }) },
  { id: 'work_forecaster', a: [19, 64], w: 35, gap: 3, c: (s) => jobIs(s, 'cat_messenger'),
    run: (s) => { const hit = s.rng.chance(0.75);
      if (!hit) s.S.flags.badForecast = true;
      return { t: hit ? '재앙 경로를 읽어 마을 둘을 비웠습니다. 재앙은 예측대로 왔고, 비운 마을에서는 아무도 죽지 않았습니다.' : '재앙 경로를 잘못 읽었습니다. 비우지 않은 마을이 맞았습니다. 협회는 "오차 범위"라고 적었고, 저는 그렇게 적을 수 없었습니다.',
        k: hit ? 'warm' : 'bad', fx: hit ? { h: 4, so: 2, money: medX(s, 0.1) } : { h: -8, so: -3 }, f: F('재앙 정보 전달자 협회 예보 평가서') }; } },
  { id: 'work_artisan', a: [19, 64], w: 25, gap: 5, c: (s) => jobIs(s, 'artisan', 'brewer', 'gunsmith', 'cook'),
    run: (s) => ({ t: s.rng.pick(['만든 물건 하나가 멀리 팔려 갔습니다. 어디로 갔는지는 모릅니다.', '도제를 받았습니다. 제가 배운 대로 가르쳤고, 제가 맞은 대로는 때리지 않았습니다.', '손에 굳은살 모양이 바뀌었습니다. 그만큼 일이 바뀐 것입니다.']), k: 'warm', fx: { h: 2, money: medX(s, 0.05) },
      f: orgF(s, '장인 등록 대장') }) },
  { id: 'work_stage', a: [19, 60], w: 25, gap: 4, c: (s) => jobIs(s, 'entertainer', 'artist', 'idol'),
    run: (s) => { const hit = s.rng.chance(0.3);
      return { t: hit ? '무대 하나가 소문을 탔습니다. 몇 달 동안 자리가 찼습니다.' : s.rng.pick(['객석이 반도 차지 않았습니다. 끝까지 했습니다.', '그림이 한 점 팔렸습니다. 액자값이 더 들었습니다.', '공연이 취소되었습니다. 재앙 경보였습니다.']),
        k: hit ? 'warm' : 'note', fx: hit ? { money: medX(s, 0.4), h: 5, so: 2 } : { h: -1 }, f: orgF(s, '공연 허가 대장') }; } },
  { id: 'work_startup_year', a: [20, 64], w: 35, gap: 2, rep: true, c: (s) => !!s.S.flags.startup && working(s),
    run: (s) => { const good = s.rng.chance(0.5);
      return { t: good ? '가게가 잘 됐습니다. ' + s.rng.pick(['사람을 하나 썼습니다.', '간판을 새로 달았습니다.', '단골이 외상을 갚았습니다.']) : '가게가 어려웠습니다. ' + s.rng.pick(['월세가 올랐습니다.', '옆에 같은 가게가 생겼습니다.', '물건값이 올라 팔아도 남지 않았습니다.']),
        k: good ? 'warm' : 'bad', fx: good ? { money: medX(s, 0.2), h: 3 } : { money: -medX(s, 0.15), h: -3 }, f: orgF(s, '영업 등록 대장 갱신', s.year) }; } },
  { id: 'work_jobless_long', a: [20, 60], w: 30, gap: 3, c: (s) => adult(s) && !s.S.job && !s.S.retired && (s.S.flags.joblessYears || 0) >= 2,
    run: (s) => ({ t: s.rng.pick(['일 없는 해가 이어졌습니다. 아침에 일어나는 시간이 점점 늦어졌습니다.', '날품을 팔았습니다. 어떤 날은 있고 어떤 날은 없었습니다.', '친척 집에 얹혀 지냈습니다. 밥상에서 눈을 마주치지 않는 법을 배웠습니다.']), k: 'bad', fx: { h: -3, so: -2, money: -medX(s, 0.02) },
      f: orgF(s, '구직 등록부 장기 미취업란') }) },
  { id: 'work_homemaking', a: [19, 60], w: 20, gap: 5, c: (s) => adult(s) && !s.S.job && !s.S.retired && !!partner(s),
    run: (s) => ({ t: '집안일을 맡았습니다. ' + (kids(s).length ? '아이들 ' + kids(s).length + '명의 하루가 제 하루였습니다.' : '하루가 길었고 기록할 것은 없었습니다.'), k: 'note', fx: { so: 1, h: kids(s).length ? 1 : -1 },
      f: orgF(s, '가구 조사표 "무직" 란') }) },
  { id: 'work_second_job', a: [19, 60], w: 25, gap: 4, c: (s) => working(s) && poor(s) && s.S.money < s.med * 0.5,
    run: (s) => ({ t: '저녁에 일을 하나 더 했습니다. ' + s.rng.pick(['잠이 넷 시간이 되었습니다.', '두 번째 일터에서는 이름 대신 번호로 불렸습니다.', '두 달 만에 몸이 먼저 그만두었습니다.']), k: 'bad', fx: { money: medX(s, 0.15), hl: -4, h: -2 },
      f: orgF(s, '겸업 신고 대장') }) },
  { id: 'work_festival_off', a: [19, 64], w: 10, gap: 5, c: (s) => working(s),
    run: (s) => ({ t: fest(s) + '에 하루를 쉬었습니다. ' + s.rng.pick(['아무것도 하지 않았습니다. 오래 기억에 남았습니다.', eul(cul(s).food) + ' 만들어 이웃과 나눴습니다.', '낮잠을 잤습니다. 깨고 나니 해가 지고 있었습니다.']), k: 'warm', fx: { h: 3, hl: 1 },
      f: orgF(s, '공휴일 고시') }) },
  { id: 'work_colleague_infected', a: [19, 64], w: 25, gap: 6, c: (s) => working(s) && s.nation.oriExp >= 2 && !s.S.ori.known,
    run: (s) => ({ t: '정기 검진에서 동료 하나가 걸렸습니다. ' + ({ persecute: '다음 날부터 출근하지 않았습니다. 사물함은 비워져 있었습니다.', quarantine: '격리구역 이주 명령이 나왔습니다. 송별회는 없었습니다.', euthanasia: '서류를 받고 조용히 떠났습니다. 아무도 서류 내용을 묻지 않았습니다.', insurance: '보험료 때문에 야근을 두 배로 늘렸습니다.', neglect: '아무도 뭐라 하지 않았습니다. 보호비 걷는 사람만 한 명 늘었습니다.', expel: '이튿날 성문 밖으로 나갔습니다. 공증인이 서류를 들고 따라갔습니다.', treat: '치료소에 다니기 시작했습니다. 일은 계속했습니다.' }[s.policy] || '아무도 말하지 않았고, 모두가 알았습니다.'),
      k: 'note', fx: { h: -2 }, f: orgF(s, '사업장 정기 검진 결과 통보') }) },
  { id: 'work_boss', a: [19, 62], w: 15, gap: 5, c: (s) => working(s) && !s.S.flags.startup,
    run: (s) => { const good = s.rng.chance(0.5);
      return { t: good ? '상사가 바뀌었습니다. 새 사람은 이름을 외웠고, 점심을 같이 먹었습니다.' : '상사가 바뀌었습니다. 새 사람은 첫날 책상 배치를 바꾸고 둘째 날 사람을 바꿨습니다.', k: good ? 'warm' : 'bad', fx: good ? { so: 2, h: 2 } : { h: -3 },
        f: orgF(s, '관리자 변동 신고') }; } },
  { id: 'work_older', a: [52, 64], w: 25, gap: 4, c: (s) => working(s),
    run: (s) => ({ t: s.rng.pick(['젊은 동료가 "' + cul(s).elder + '" 하고 불렀습니다. 처음에는 누구를 부르는지 몰랐습니다.', '허리가 먼저 퇴근하는 날이 늘었습니다.', '새 장비 교육에서 가장 뒷자리에 앉았습니다.']), k: 'note', fx: { hl: -1, h: -1 },
      f: orgF(s, '연령별 고용 집계') }) },
  { id: 'work_retire_prep', a: [55, 64], w: 30, gap: 4, c: (s) => working(s),
    run: (s) => { const pension = s.nation.stats.ppp > 1500;
      const saved = !!s.S.flags.pensionPlan;
      if (saved) s.S.flags.pensionPlan = false;
      return { t: pension ? '연금 고지서가 왔습니다. 액수는 ' + fmtLMD(s.S.income * 0.3) + '. ' + (saved ? '따로 모아 둔 돈을 꺼냈습니다.' : '그 돈으로 살 수 있는지 계산해 보고 계산을 그만두었습니다.') : '연금이라는 것은 없었습니다. ' + (saved ? '모아 둔 돈이 있었습니다.' : '자식과 몸이 연금이었습니다.'),
        k: 'note', fx: saved ? { money: medX(s, 0.45), h: 2 } : { h: -2 }, f: orgF(s, pension ? '연금 산정 통지' : '노령 부양 실태 조사') }; } },
  { id: 'work_shift_city', a: [19, 64], w: 10, gap: 6, c: (s) => working(s) && nomadic(s),
    run: (s) => ({ t: '이동도시가 새 좌표로 떠났습니다. 일터는 그대로였고, 창밖만 바뀌었습니다. ' + s.rng.pick(['새 땅의 흙 냄새가 사흘쯤 났습니다.', '정박지 상인들이 올라와 ' + cul(s).food + ' 값을 두 배로 불렀습니다.', '멀리 재앙 구름이 보였습니다. 도시는 반대쪽으로 갔습니다.']), k: 'note', fx: { h: 1 },
      f: orgF(s, '이동도시 항로 고시') }) },
];

// ────────────────────────────────────────────────────────────────────────────
// 결정
// ────────────────────────────────────────────────────────────────────────────
export const decisions = {
  /** 첫 직업(D26): 엔진 jobYear 가 학교를 마친 해 끝에 자동으로 잡아 준 직업을, 다음 해 초에 다른 제안과 함께 다시 고르게 한다 */
  adult_firstjob: {
    at: 0.2,
    ok: (s) => s.S.age >= 19 && s.S.age <= 26 && working(s) && s.S.jobY <= 1 && s.S.flags.laidOff == null && !s.S.flags.startup,
    build: (s) => {
      const cur = s.job;
      const sp = cur.special ? null : specialOffer(s, [cur.id]);
      const others = jobOffers(s, 3).filter((j) => j.id !== cur.id && (!sp || j.id !== sp.id)).slice(0, sp ? 1 : 2);
      const offers = [...(sp ? [sp] : []), ...others];
      if (!offers.length) return null;
      // 자동 결정 가중치: 국가 상징 직업은 후보에 늘 있되(D26) 자동 시뮬에서는 소수만 고르게(국가 내 5~15% 목표)
      const ch = [{ k: 'keep', label: cur.name, sub: '지금 자리. ' + jobSub(s, cur), auto: 2.5 }];
      for (const j of offers) ch.push({ k: j.id, label: j.name, sub: jobSub(s, j), auto: j.special ? 0.25 : 0.8 });
      return { title: '첫 직장', body: ro(cur.name) + ' 일을 시작한 지 한 해가 되었습니다. 다른 곳에서도 사람을 찾고 있었습니다.' + (sp && sp.special ? ' ' + eun(sp.name) + ' ' + s.nation.name + '에서 ' + s.rng.pick(['누구나 한 번은 생각해 보는 길입니다.', '집안이 좋아하는 길입니다.', '가장 ' + s.nation.name + '다운 길입니다.']) : ''),
        fact: orgF(s, '구직 알선 대장 ' + s.year + '년분'), choices: ch };
    },
    apply: (s, k) => {
      if (k === 'keep') return { t: '지금 자리에 남았습니다. 한 해 더 해 보기로 했습니다.', k: 'note', f: orgF(s, '노동 대장 계속 기재') };
      const j = s.data.jobById[k];
      if (!j || !takeJob(s, k, true)) return { t: '옮기려던 자리가 사라졌습니다. 그대로 남았습니다.', k: 'note', f: F('기록된 바 없음') };
      s.S.flags.everWorked = true;
      return { t: ro(j.name) + ' 옮겼습니다. ' + (j.special ? s.nation.name + '에서 이 일은 직업이자 소속입니다.' : '첫 직장은 한 해로 끝났습니다.'), k: 'ev', fx: { h: 2 }, f: orgF(s, '노동 대장 직종 변경', s.year) };
    },
  },
  /** 이직 제안 */
  adult_jobchange: {
    gap: 7,
    ok: (s) => working(s) && s.S.jobY >= 3 && s.S.age >= 23 && s.S.age <= 52 && yr(s, 'jc', 0.11),
    build: (s) => {
      const cur = s.job;
      const mid = (j) => (j.lo + j.hi) / 2;
      const offers = jobOffers(s, 4).filter((j) => j.id !== cur.id && mid(j) >= mid(cur) - 0.05).slice(0, 2);
      if (!offers.length) return null;
      const ch = offers.map((j) => ({ k: j.id, label: j.name, sub: jobSub(s, j), auto: 1 }));
      ch.push({ k: 'stay', label: '남는다', sub: '지금 자리. 익숙한 사람들', auto: 2 });
      return { title: '이직 제안', body: s.rng.pick(['아는 사람이 다른 자리를 소개했습니다.', '사람을 찾는다는 쪽지가 ' + cul(s).drink + ' 가게 벽에 붙어 있었습니다.', '옛 동료가 자기 일터로 오라고 했습니다.']) + ' 지금은 ' + ro(cur.name) + ' ' + s.S.jobY + '년째입니다.',
        fact: orgF(s, '구직 알선 대장'), choices: ch };
    },
    apply: (s, k) => {
      if (k === 'stay') return { t: '남기로 했습니다. 소개한 사람에게는 ' + eul(cul(s).drink) + ' 샀습니다.', k: 'note', fx: { so: 1 }, f: F('기록된 바 없음') };
      const j = s.data.jobById[k];
      const oldPct = s.S.pct, oldY = s.S.jobY;
      if (!j || !takeJob(s, k, true)) return { t: '옮기려던 자리가 먼저 채워졌습니다.', k: 'note', f: F('기록된 바 없음') };
      // 경력 이직: 백분위와 근속 일부를 가져간다
      s.S.pct = Math.min(j.hi + 0.1, Math.max(s.S.pct, oldPct - 0.03)); s.S.jobY = Math.floor(oldY / 2);
      return { t: ro(j.name) + ' 옮겼습니다. 첫 달은 다시 신입이었습니다.', k: 'ev', fx: { h: 2, so: -1 }, f: orgF(s, '노동 대장 직종 변경', s.year) };
    },
  },
  /** 창업(소상공) */
  adult_startup: {
    gap: 12,
    ok: (s) => working(s) && !s.S.flags.startup && s.S.age >= 25 && s.S.age <= 50 && s.S.money > s.med * 1.5 && yr(s, 'startup', 0.1),
    build: (s) => {
      const shop = s.rng.pick([cul(s).food.split('와')[0] + ' 가게', cul(s).drink + ' 집', '잡화점', '수리점', '작은 운송업']);
      return { title: '창업', body: '모아 둔 돈이 ' + fmtLMD(s.S.money) + '입니다. ' + eul(shop) + ' 열어 볼 수 있을 것 같았습니다. ' + s.rng.pick(['동네에 비슷한 가게는 없었습니다.', '동네에 비슷한 가게가 둘 있었습니다.', '가족은 반반으로 갈렸습니다.']),
        fact: orgF(s, '영업 허가 신청 안내'), choices: [
          { k: 'go', label: '가게를 연다', sub: '돈 −(중위소득 한 해치 가까이), 그 뒤는 운', auto: 1 },
          { k: 'no', label: '그만둔다', sub: '지금 자리 유지', auto: 1.5 }] };
    },
    apply: (s, k) => {
      if (k !== 'go') return { t: '가게 생각은 접었습니다. 돈은 그대로 두었습니다.', k: 'note', fx: { h: -1 }, f: F('기록된 바 없음') };
      const id = ['merchant', 'shopkeeper', 'cook', 'artisan'].find((j) => jobEligible(s, s.data.jobById[j])) || 'shopkeeper';
      takeJob(s, id, true);
      s.S.flags.startup = s.S.age; s.S.money -= medX(s, 0.8);
      return { t: '가게를 열었습니다. 첫날 손님은 ' + s.rng.ri(2, 9) + '명이었고, 그중 ' + s.rng.ri(1, 2) + '명은 가족이었습니다.', k: 'big', fx: { h: 4, so: 1 }, f: orgF(s, '영업 허가 ' + s.rng.ri(100, 9999) + '호', s.year) };
    },
  },
  /** 은퇴 준비 */
  adult_retire_plan: {
    ok: (s) => working(s) && hum(s) >= 54 && hum(s) <= 60 && !s.S.flags.pensionPlan,
    build: (s) => {
      const pension = s.nation.stats.ppp > 1500;
      const ch = [{ k: 'save', label: '따로 모은다', sub: '지금 돈 −, 몇 해 뒤 돌려받음', auto: s.S.money > s.med ? 1.5 : 0.5 },
        { k: 'none', label: '그때 가서 본다', sub: '변화 없음', auto: 1 }];
      if (kids(s).length) ch.push({ k: 'kids', label: '아이들에게 말한다', sub: '관계 +, 돈은 그대로', auto: 1 });
      return { title: '남은 일의 햇수', body: '일할 수 있는 해가 몇 남지 않았습니다. ' + (pension ? '연금은 지금 벌이의 셋에 하나쯤 된다고 했습니다.' : '이 나라에 연금이라는 것은 없습니다.'), fact: orgF(s, pension ? '연금 산정 기준' : '노령 부양 실태 조사'), choices: ch };
    },
    apply: (s, k) => {
      if (k === 'save') { s.S.flags.pensionPlan = true; s.S.money -= medX(s, 0.3); return { t: '매달 조금씩 떼어 두기로 했습니다. 봉투에는 날짜만 적었습니다.', k: 'note', fx: { h: 1 }, f: orgF(s, '저축 신고') }; }
      if (k === 'kids') return { t: '아이들에게 말했습니다. 큰아이는 고개를 끄덕였고, 작은아이는 농담을 했습니다.', k: 'warm', fx: { so: 3 }, f: F('기록된 바 없음') };
      return { t: '그때 가서 보기로 했습니다.', k: 'note', f: F('기록된 바 없음') };
    },
  },
};

export default { events, decisions };
