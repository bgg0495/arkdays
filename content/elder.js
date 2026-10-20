// W4c 노년 콘텐츠(인간 척도 60세+): 이벤트 36 · 결정 9.
// 톤(D25): 담백한 "~했습니다"체, 각주는 세계관 안의 출처만. 죽음·치매·고독은 장면 없이 결과만.
// 국가 문화(장례 관습·노인 호칭·명절·신앙)는 data/nations.json culture 와 death_texts.js RITES 에서 치환한다(D26).
// 콜백은 전부 ctx 첫 인자(D23). 공용 파일은 읽기만 한다.
//
// 이 모듈이 S.flags 에 두는 것
//   conds: { chronic, dementia, frail }   만성질환·치매·쇠약 (엔진에 conds 가 없어 flags 아래에 둔다)
//   grandkids(수), careHome, withKids, aloneElder, willDone, lastWish, treatQuit, elderNoRetire, memorialKept
import { humanAge } from '../src/engine/lifetable.js';
import { retire } from '../src/engine/finance.js';
import { infect } from '../src/engine/oripathy.js';
import { cul, org, fest, F, orgF, rhodesF, lifeRoll, once, medX, poor, rich, nomadic, jobName, given, learn100 } from './_util.js';
import { eul, iga, eun, wa, ro, ieot } from '../src/engine/text.js';
import { RITES, riteOf } from './death_texts.js';

const hAge = (s) => humanAge(s.S.age, s.race.lifeMul);
const E = (s) => hAge(s) >= 60;
const conds = (s) => (s.S.flags.conds || (s.S.flags.conds = {}));
const kidsAlive = (s) => s.S.fam.kids.filter((k) => k.alive);
const adultKids = (s) => kidsAlive(s).filter((k) => s.S.age - k.bornAt >= 20);
const partnerHere = (s) => !!(s.S.fam.partner && s.S.fam.partner.alive);
const widowed = (s) => !!(s.S.fam.widowed && s.S.fam.partner && !s.S.fam.partner.alive);
const alone = (s) => !partnerHere(s) && !kidsAlive(s).length;
const rite = (s) => RITES[s.S.cur] || RITES[s.S.root] || RITES.yan;
const pick = (s, arr) => s.rng.pick(arr);
const lastJob = (s) => { if (s.S.job) return s.S.job; for (let i = s.S.years.length - 1; i >= 0; i--) if (s.S.years[i].job) return s.S.years[i].job; return null; };

/** 국가별 노령 연금(중위소득 배율). who 는 지급 기관, jobs 가 있으면 그 직업 출신만 */
const PENSION = {
  victoria: { k: 0.35, who: '공작령 등기소 노령 연금' },
  tara: { k: 0.1, who: '성당 호적부 교구 구호금' },
  columbia: { k: 0.3, who: '보험협회 개인연금', needsMoney: true },
  leithanien: { k: 0.35, who: '궁정 기록국 노령 수당' },
  laterano: { k: 0.5, who: '공증소 노령 급여' },
  higashi: { k: 0.3, who: '호적대장소 국민연금' },
  yan: { k: 0.25, who: '호부 퇴직 녹봉', jobs: ['civil_servant', 'tianshi_official', 'teacher', 'clerk', 'scholar', 'soldier'] },
  lungmen: { k: 0.3, who: '근위국 퇴직연금', jobs: ['lgd_officer', 'civil_servant', 'police', 'teacher', 'clerk', 'banker'] },
  ursus: { k: 0.25, who: '제국 내무성 복무 연금', jobs: ['legionary', 'camp_guard', 'soldier', 'civil_servant', 'police'] },
  kazimierz: { k: 0.3, who: '스폰서 은퇴 기사 연금', jobs: ['knight', 'arena_knight', 'commentator', 'knight_trainee'] },
  siracusa: { k: 0.15, who: '패밀리 노인 수당', jobs: ['famiglia', 'cleaner', 'truck_driver'] },
  iberia: { k: 0.3, who: '재판소 봉직 연금', jobs: ['inquisitor', 'penal_battalion', 'lighthouse_keeper', 'civil_servant'] },
  aegir: { k: 0.4, who: '집정관 회의 노령 배급' },
  minos: { k: 0.2, who: '도시국가 평의회 노령 급여' },
  kjerag: { k: 0.2, who: '가문 부양금' },
  sami: { k: 0, who: '공동체 부양' },
  durin: { k: 0.4, who: '돔 공동체 배급' },
  rim: { k: 0.2, who: '광업연합 퇴직 보상', jobs: ['miner', 'ori_miner', 'pitsinker', 'platform_builder'] },
  kazdel: { k: 0, who: '없음' },
  bolivar: { k: 0, who: '없음' },
  sargon: { k: 0.05, who: '셰이크의 자비' },
};
export function pensionOf(s) {
  const p = PENSION[s.S.root] || PENSION[s.S.cur] || { k: 0, who: '없음' };
  const j = lastJob(s);
  if (p.jobs && !p.jobs.includes(j)) return { k: 0, who: p.who, excluded: true };
  if (p.needsMoney && s.S.money < s.med * 2) return { k: 0, who: p.who, excluded: true };
  return p;
}

/** 요양 시설의 국가별 이름 */
const CARE_HOME = {
  yan: '양로원', lungmen: '하층부 안로원', higashi: '개호 시설', ursus: '제국 양로소', sami: '장로의 집', kjerag: '가문 별채', leithanien: '궁정 인가 요양원',
  victoria: '교구 구빈 요양원', tara: '성당 부속 요양원', kazimierz: '스폰서 은퇴 기사 요양소', columbia: '실버 플랜 요양원', siracusa: '패밀리 후원 요양원',
  laterano: '공증소 등록 요양원', iberia: '재판소 인가 요양원', aegir: '집정관 배정 거주 구역', minos: '신전 부속 요양소', sargon: '오아시스 요양소',
  bolivar: '성모회 요양원', rim: '광업연합 퇴직자 숙소', kazdel: '없음', durin: '공동체 돌봄 돔',
};
const careHome = (s) => CARE_HOME[s.S.root] || CARE_HOME[s.S.cur] || '요양원';

// ────────────────────────────────────────────────────────────────────────────
// 이벤트
// ────────────────────────────────────────────────────────────────────────────
export const events = [
  // ── 은퇴·연금 ──
  { id: 'elder_retire_first', a: [60, 999], w: 60, c: (s) => E(s) && s.S.retired && !s.S.flags.elderRetire1,
    run: (s) => { s.S.flags.elderRetire1 = s.S.age;
      return { t: '은퇴하고 처음 맞는 봄이었습니다. 아침에 ' + eul(cul(s).drink) + ' 마시며 창밖을 보는 데 익숙해지기까지 석 달이 걸렸습니다.', k: 'ev', fx: { h: 2, hl: 1 }, f: orgF(s, '퇴직 등기') }; } },
  { id: 'elder_pension_day', a: [60, 999], w: 25, gap: 3, rep: true, c: (s) => E(s) && s.S.retired && s.S.pension > 0,
    run: (s) => ({ t: pick(s, ['연금 수령일이었습니다. 창구 줄에서 같은 또래들과 ' + cul(s).rulerTitle.replace(/님$/, '') + ' 이야기를 했습니다.', '연금이 들어왔습니다. 액수는 작아도 날짜는 정확했습니다.', '연금 창구 직원이 바뀌었습니다. 새 직원은 서류를 두 번 요구했습니다.']), k: 'note', fx: { h: 1 },
      f: F(pensionOf(s).who + ' 지급 대장') }) },
  { id: 'elder_no_pension', a: [60, 999], w: 35, gap: 3, rep: true, c: (s) => E(s) && s.S.retired && !s.S.pension && poor(s),
    run: (s) => ({ t: pick(s, ['연금 같은 것은 없었습니다. 텃밭과 자녀의 송금이 전부였습니다.', '이웃이 노령 수당 이야기를 꺼냈습니다. 이 나라에는 해당 조항이 없었습니다.', '일거리를 찾아 나섰습니다. 아무도 나이를 묻지 않는 대신 아무도 부르지 않았습니다.']), k: 'bad', fx: { money: -medX(s, 0.05), h: -1 },
      f: orgF(s, '노령 급여 규정, 해당 없음') }) },
  { id: 'elder_old_job', a: [60, 999], w: 30, c: (s) => E(s) && s.S.retired && !!lastJob(s) && !s.S.flags.elderOldJob,
    run: (s) => { s.S.flags.elderOldJob = true; const j = jobName(s, lastJob(s));
      return { t: '옛 일터를 찾아갔습니다. ' + ro(j) + ' 보낸 세월이 한 건물에 들어 있었습니다. 문 앞에서 아는 얼굴은 하나뿐이었고, 그 얼굴도 곧 은퇴한다고 했습니다.', k: 'ev', fx: { h: 1, so: 1 }, f: orgF(s, '직업 분류표, ' + j + ' 항목') }; } },
  { id: 'elder_title', a: [60, 999], w: 40, c: (s) => hAge(s) >= 65 && !s.S.flags.elderTitle,
    run: (s) => { s.S.flags.elderTitle = true;
      return { t: '동네에서 "' + cul(s).elder + '"이라고 불리기 시작했습니다. 처음에는 돌아보지 않았습니다.', k: 'note', fx: { so: 1 }, f: orgF(s, '호칭 관행 조사표') }; } },

  // ── 손주·자녀 ──
  { id: 'elder_grandchild', a: [60, 999], w: 45, gap: 3, rep: true, c: (s) => E(s) && adultKids(s).length > 0 && (s.S.flags.grandkids || 0) < 6 && s.rng.chance(0.6),
    run: (s) => { s.S.flags.grandkids = (s.S.flags.grandkids || 0) + 1; const k = pick(s, adultKids(s));
      return { t: k.name + '에게 아이가 태어났습니다. ' + (s.S.flags.grandkids === 1 ? '첫 손주입니다. ' : '손주가 ' + s.S.flags.grandkids + '명이 되었습니다. ') + (poor(s) ? eul(cul(s).food.split('와')[0]) + ' 싸 들고 찾아갔습니다.' : '이름 짓는 데 한몫 끼었습니다.'), k: 'warm', fx: { so: 3, h: 3 }, f: orgF(s, '호적 등기, 신생아 항목') }; } },
  { id: 'elder_grandchild_call', a: [60, 999], w: 35, gap: 4, rep: true, c: (s) => E(s) && (s.S.flags.grandkids || 0) > 0,
    run: (s) => ({ t: pick(s, ['손주가 처음으로 저를 불렀습니다. ' + cul(s).elder + '도 할머니도 아닌, 제 이름 비슷한 소리였습니다.', '손주가 ' + fest(s) + '에 찾아왔습니다. 하루 종일 집이 시끄러웠고, 떠나자 더 조용했습니다.', '손주에게 ' + cul(s).food.split('와')[0] + ' 만드는 법을 가르쳤습니다. 절반은 바닥에 떨어졌습니다.']), k: 'warm', fx: { h: 3, so: 2 },
      f: orgF(s, '명절 귀성 집계') }) },
  { id: 'elder_remit', a: [60, 999], w: 35, gap: 2, rep: true, c: (s) => E(s) && adultKids(s).length > 0 && s.S.q <= 3,
    run: (s) => { const k = pick(s, adultKids(s)); const m = medX(s, 0.08 + 0.04 * adultKids(s).length);
      return { t: pick(s, [iga(k.name) + ' 돈을 보내왔습니다. 봉투에는 "쓰세요"라고만 적혀 있었습니다.', '자녀들이 생활비를 나눠 부쳤습니다. 셈이 맞지 않는 달에는 서로 미뤘습니다.', iga(k.name) + ' 겨울 외투와 돈을 보냈습니다. 외투는 한 치수 컸습니다.']), k: 'ev', fx: { money: m, so: 1 },
        f: orgF(s, '송금 대장') }; } },
  { id: 'elder_kid_far', a: [60, 999], w: 30, c: (s) => E(s) && adultKids(s).length > 0 && lifeRoll(s, 'kidFar', 0.5) && !s.S.flags.kidFar,
    run: (s) => { const k = pick(s, adultKids(s)); s.S.flags.kidFar = k.name;
      return { t: eun(k.name) + ' 먼 도시로 떠났습니다. 편지는 ' + s.rng.ri(2, 5) + '달에 한 번 왔고, 글씨는 점점 짧아졌습니다.', k: 'note', fx: { so: -2, h: -1 }, f: orgF(s, '전출 등기') }; } },
  { id: 'elder_withkids_year', a: [60, 999], w: 30, gap: 3, rep: true, c: (s) => E(s) && !!s.S.flags.withKids,
    run: (s) => ({ t: pick(s, ['자녀 집에서 한 해를 보냈습니다. 아침은 제가 차렸고, 저녁은 며느리가 차렸습니다. 둘 다 말없이 먹었습니다.', '자녀 집 작은 방에 제 물건이 다 들어갔습니다. 들어가지 않은 것은 버렸습니다.', '손주 등교를 맡았습니다. 교문 앞에서 다른 ' + cul(s).elder + '들을 만났습니다.']), k: 'ev', fx: { so: 2, h: 1 },
      f: orgF(s, '동거 가구 등기') }) },
  { id: 'elder_carehome_year', a: [60, 999], w: 30, gap: 2, rep: true, c: (s) => E(s) && !!s.S.flags.careHome,
    run: (s) => ({ t: pick(s, [careHome(s) + '에서 한 해가 갔습니다. 옆 침대 사람이 두 번 바뀌었습니다.', careHome(s) + ' 식당에서 ' + iga(cul(s).food.split('와')[0]) + ' 나오는 날이 제일 좋은 날이었습니다.', '면회 오는 날을 달력에 표시했습니다. 표시가 비는 달도 있었습니다.']), k: 'note', fx: { money: -medX(s, 0.2), so: -1, hl: 1 },
      f: orgF(s, '요양 시설 입소 대장') }) },

  // ── 사별 ──
  { id: 'elder_widow_rite', a: [40, 999], w: 80, c: (s) => widowed(s) && !s.S.flags.widowRite,
    run: (s) => { s.S.flags.widowRite = s.S.age; const r = rite(s); const p = { kids: kidsAlive(s).length, cul: cul(s), race: s.race, nationId: s.S.cur, org: org(s) };
      return { t: wa(s.S.fam.partner.name) + ' 마지막 인사를 했습니다. ' + r.line(p), k: 'loss', fx: { h: -2 }, f: r.f(p) }; } },
  { id: 'elder_widow_year', a: [60, 999], w: 30, gap: 4, rep: true, c: (s) => E(s) && widowed(s),
    run: (s) => ({ t: pick(s, ['식탁에 두 사람 몫을 차렸다가 하나를 치웠습니다.', s.S.fam.partner.name + '의 옷을 정리했습니다. 반은 남겼습니다.', '밤에 이름을 불렀습니다. 대답이 없어도 괜찮은 날이 늘어 갔습니다.']), k: 'note', fx: { h: -1, so: -1 },
      f: F('기록된 바 없음') }) },
  { id: 'elder_memorial_year', a: [60, 999], w: 25, gap: 3, rep: true, c: (s) => E(s) && widowed(s) && !!s.S.flags.memorialKept,
    run: (s) => ({ t: '기일이었습니다. ' + rite(s).place + '에 갔고, "' + rite(s).prayer + '"이라고 했습니다.', k: 'note', fx: { h: 1, so: 1 }, f: orgF(s, '제례 관행 조사표') }) },

  // ── 오랜 친구 ──
  { id: 'elder_friend_death', a: [60, 999], w: 45, c: (s) => hAge(s) >= 62 && lifeRoll(s, 'oldFriend', 0.85) && !s.S.flags.friendDeath1,
    run: (s) => { s.S.flags.friendDeath1 = true;
      return { t: '오랜 친구가 세상을 떠났습니다. 장례에서 아는 얼굴을 세어 보았습니다. 열 손가락이 남았습니다.', k: 'loss', fx: { h: -4, so: -2 }, f: F(rite(s).f({ org: org(s) }).slice(1, -1) + ', 조문객 명부') }; } },
  { id: 'elder_friend_death2', a: [60, 999], w: 40, c: (s) => hAge(s) >= 72 && !!s.S.flags.friendDeath1 && !s.S.flags.friendDeath2 && s.rng.chance(0.5),
    run: (s) => { s.S.flags.friendDeath2 = true;
      return { t: '또 한 사람이 떠났습니다. 이번에는 장례에서 아는 얼굴이 셋이었습니다. 돌아오는 길에 "' + rite(s).prayer + '"을 혼자 말했습니다.', k: 'loss', fx: { h: -3, so: -3 }, f: F('기록된 바 없음') }; } },
  { id: 'elder_friend_visit', a: [60, 999], w: 30, gap: 3, rep: true, c: (s) => E(s) && !s.S.flags.friendDeath2,
    run: (s) => ({ t: pick(s, ['옛 친구와 ' + eul(cul(s).drink) + ' 마셨습니다. 이야기의 절반은 죽은 사람 이야기였습니다.', '동창 모임이 있었습니다. 모일 때마다 의자가 하나씩 줄었습니다.', '친구가 ' + fest(s) + ' 선물로 ' + eul(cul(s).food.split('와')[0]) + ' 보냈습니다. 손글씨가 떨렸습니다.']), k: 'warm', fx: { so: 2, h: 2 },
      f: F('기록된 바 없음') }) },

  // ── 노환·치매·만성질환 ──
  { id: 'elder_chronic', a: [60, 999], w: 50, c: (s) => E(s) && !conds(s).chronic && s.rng.chance(0.18 + (60 - s.S.st.hl) / 200),
    run: (s) => { conds(s).chronic = s.S.age;
      const where = s.S.rhodes ? '로도스 아일랜드 의료부' : s.S.cur === 'columbia' ? '보험협회 지정 병원' : s.S.cur === 'laterano' ? '공증소 등록 진료소' : '동네 의원';
      return { t: where + '에서 오래 가는 병이라는 말을 들었습니다. 약은 평생, 비용은 매달이었습니다.', k: 'bad', fx: { hl: -4, h: -2, money: -medX(s, 0.1) }, f: s.S.rhodes ? rhodesF('만성질환 관리 안내') : orgF(s, '의원 진료 기록') }; } },
  { id: 'elder_chronic_year', a: [60, 999], w: 30, gap: 2, rep: true, c: (s) => E(s) && !!conds(s).chronic,
    run: (s) => ({ t: pick(s, ['약값이 올랐습니다. 하루 두 알을 한 알로 줄였습니다.', '병이 더 나빠지지는 않았습니다. 의사는 그것이 좋은 소식이라고 했습니다.', '아침마다 알약을 세는 일이 하루의 시작이 되었습니다.']), k: 'note', fx: { hl: -1, money: -medX(s, 0.06) },
      f: orgF(s, '의약품 가격 고시') }) },
  { id: 'elder_dementia', a: [60, 999], w: 45, c: (s) => hAge(s) >= 72 && !conds(s).dementia && s.rng.chance(0.1),
    run: (s) => { conds(s).dementia = s.S.age;
      return { t: '길을 잃었습니다. 평생 다닌 길이었습니다. 이웃이 집까지 데려다주었고, 가족은 그날 밤 오래 이야기했습니다.', k: 'bad', fx: { sm: -6, so: -2, h: -3 }, f: orgF(s, '실종 신고 접수부, 당일 해제') }; } },
  { id: 'elder_dementia_year', a: [60, 999], w: 40, gap: 1, rep: true, c: (s) => E(s) && !!conds(s).dementia,
    run: (s) => { const k = kidsAlive(s)[0]; const p = s.S.fam.partner;
      return { t: pick(s, [k ? eul(k.name) + ' 몰라보았습니다. 다음 날은 알아보았습니다.' : '손님이 다녀갔는데 누구였는지 기억나지 않았습니다.', p && p.alive ? p.name + '의 이름이 생각나지 않아 "여보"라고만 했습니다.' : '젊은 날의 집 주소를 대며 집에 가겠다고 했습니다.', '오늘이 ' + fest(s) + '인 줄 알고 아침부터 ' + eul(cul(s).food.split('와')[0]) + ' 만들었습니다. 넉 달 뒤였습니다.']), k: 'note', fx: { sm: -4, so: -2 },
        f: orgF(s, '노인 돌봄 기록') }; } },
  { id: 'elder_frail', a: [60, 999], w: 45, c: (s) => hAge(s) >= 74 && !conds(s).frail && (s.S.st.hl < 50 || s.rng.chance(0.15)),
    run: (s) => { conds(s).frail = s.S.age;
      return { t: '넘어졌습니다. 일어나는 데 한참이 걸렸고, 그 뒤로 계단을 세기 시작했습니다.', k: 'bad', fx: { hl: -5, h: -2 }, f: orgF(s, '낙상 사고 집계') }; } },
  { id: 'elder_winter', a: [60, 999], w: 30, gap: 3, rep: true, c: (s) => hAge(s) >= 68,
    run: (s) => { const cold = ['ursus', 'sami', 'kjerag', 'kazimierz', 'leithanien', 'victoria', 'tara', 'higashi'].includes(s.S.root);
      const hot = ['sargon', 'bolivar', 'rim', 'minos'].includes(s.S.root);
      return { t: cold ? '겨울이 길었습니다. 난방비와 약값 중 하나를 골라야 하는 달이 있었습니다.' : hot ? '열풍이 불었습니다. 사흘을 누워 지냈고, 물은 셈해서 마셨습니다.' : '환절기마다 기침이 길어졌습니다. 예전에는 사흘이면 끝나던 것이었습니다.', k: 'bad', fx: { hl: -2, money: -medX(s, 0.04) }, f: orgF(s, '계절별 노인 사망 집계') }; } },
  { id: 'elder_checkup', a: [60, 999], w: 30, gap: 3, rep: true, c: (s) => E(s) && (s.S.rhodes || s.policy === 'treat'),
    run: (s) => ({ t: (s.S.rhodes ? '로도스 아일랜드 의료부' : '공공 치료소') + '에서 정기 검진을 받았습니다. 수치를 읽어 주는 목소리가 전보다 느렸습니다.', k: 'ev', fx: { hl: 2 }, f: s.S.rhodes ? rhodesF('노년 정기 검진 기록') : orgF(s, '공공 치료소 검진 대장') }) },

  // ── 노년 감염 ──
  { id: 'elder_infect_late', a: [60, 999], w: 45, c: (s) => E(s) && !s.S.ori.on && s.nation.oriExp >= 2 && s.rng.chance(0.06),
    run: (s) => { infect(s, 'elder');
      return { t: '늦은 나이에 손끝에 검은 결정이 비쳤습니다. 평생 피했던 것이었습니다.', k: 'bad', fx: { h: -5, hl: -3 }, f: rhodesF('소책자 「노년의 감염」') }; } },
  { id: 'elder_ori_year', a: [60, 999], w: 35, gap: 3, rep: true, c: (s) => E(s) && s.S.ori.known,
    run: (s) => ({ t: pick(s, ['결정이 자라는 속도보다 몸이 늙는 속도가 빨랐습니다. 의사는 어느 쪽이 먼저일지 말하지 않았습니다.', '관절의 결정 때문에 손가락이 굽지 않았습니다. 단추를 큰 것으로 바꿨습니다.', s.S.flags.treatQuit ? '약을 끊은 뒤로 아침이 가벼웠습니다. 수치는 묻지 않았습니다.' : '억제제 값이 또 올랐습니다. 이번 달도 냈습니다.']), k: 'note', fx: { hl: -2 },
      f: rhodesF('소책자 「노년의 감염」') }) },

  // ── 신앙·명절·공동체 ──
  { id: 'elder_faith', a: [60, 999], w: 35, gap: 3, rep: true, c: (s) => E(s) && rite(s).faith !== '없음',
    run: (s) => { const r = rite(s);
      return { t: pick(s, [r.place + '에 다니기 시작했습니다. 젊어서는 ' + fest(s, 0) + '에만 가던 곳이었습니다.', r.faith + '에 기대는 날이 늘었습니다. "' + r.prayer + '" 하루에 한 번은 말했습니다.', r.place + '에서 또래들을 만났습니다. 기도보다 그 뒤의 ' + cul(s).drink + ' 시간이 길었습니다.']), k: 'warm', fx: { h: 2, so: 1 }, f: orgF(s, '종교 시설 출입 집계') }; } },
  { id: 'elder_no_faith', a: [60, 999], w: 25, gap: 5, c: (s) => E(s) && rite(s).faith === '없음',
    run: (s) => ({ t: s.S.root === 'kazdel' ? '살카즈에게 기도할 곳은 없었습니다. 대신 죽은 이들의 이름을 외웠습니다. 목록은 매년 길어졌습니다.' : s.S.root === 'rim' ? '광업연합은 신을 두지 않았습니다. 사이렌이 하루를 나눴고, 그것으로 충분했습니다.' : '기댈 곳 없이 늙어 갔습니다. 이웃이 그 자리를 채웠습니다.', k: 'note', fx: { so: 1 }, f: orgF(s, '종교 시설 등록, 해당 없음') }) },
  { id: 'elder_festival', a: [60, 999], w: 35, gap: 3, rep: true, c: (s) => E(s),
    run: (s) => { const f = fest(s); const n = kidsAlive(s).length + (s.S.flags.grandkids || 0);
      return { t: ieot(f) + '습니다. ' + (n ? '상에 ' + (n + 1) + '명이 앉았고, ' + eun(cul(s).food) + ' 넉넉했습니다.' : '혼자 ' + eul(cul(s).food.split('와')[0]) + ' 차렸습니다. 남은 것은 이웃에게 돌렸습니다.'), k: n ? 'warm' : 'note', fx: n ? { h: 3, so: 2 } : { h: -1 }, f: orgF(s, '명절 귀성 집계') }; } },
  { id: 'elder_wisdom', a: [60, 999], w: 30, gap: 4, rep: true, c: (s) => E(s) && learn100(s) >= 50,
    run: (s) => ({ t: pick(s, ['동네 젊은이가 ' + jobName(s, lastJob(s) || 'laborer') + ' 일에 관해 물으러 왔습니다. 세 시간을 이야기했고, 그중 세 문장이 쓸모 있었다고 했습니다.', '손주 또래가 옛날이야기를 들으러 왔습니다. 재앙 이야기에서는 조용했고, 전쟁 이야기에서는 더 조용했습니다.']), k: 'warm', fx: { so: 2, h: 2 },
      f: F('기록된 바 없음') }) },
  { id: 'elder_news_young', a: [60, 999], w: 30, c: (s) => E(s) && !s.S.flags.elderTold && Object.keys(s.S.flags).some((k) => k.startsWith('big_') && !k.endsWith('_heard')),
    run: (s) => { s.S.flags.elderTold = true; const n = Object.keys(s.S.flags).filter((k) => k.startsWith('big_') && !k.endsWith('_heard')).length;
      return { t: '젊은 날 겪은 일을 손주에게 이야기했습니다. 교과서에 실린 사건 ' + n + '개를 직접 겪었습니다. 손주는 시험에 나온다고 했습니다.', k: 'note', fx: { so: 1, sm: 1 }, f: orgF(s, '구술 기록 수집 대장') }; } },

  // ── 회고·물건 ──
  { id: 'elder_memoir', a: [60, 999], w: 45, c: (s) => hAge(s) >= 68 && !s.S.flags.elderMemoir,
    run: (s) => { s.S.flags.elderMemoir = true; const lived = [...new Set(s.S.years.map((y) => y.cur))].length;
      let best = null; for (const y of s.S.years) if (!best || y.h > best.h) best = y;
      return { t: '살아온 날을 세어 보았습니다. ' + (lived > 1 ? '나라를 ' + lived + '곳 거쳤고, ' : '') + (best ? '가장 좋았던 해는 ' + best.a + '세였습니다. ' : '') + '종이에 적다가 그만두었습니다. 기억이 종이보다 길었습니다.', k: 'note', fx: { h: 2 }, f: F('기록된 바 없음') }; } },
  { id: 'elder_keepsake', a: [60, 999], w: 30, c: (s) => E(s) && !s.S.flags.elderKeepsake,
    run: (s) => { s.S.flags.elderKeepsake = true;
      const item = { yan: '학궁 시험 때 쓴 붓', lungmen: '근위국 발급 구 거주증', higashi: '가문 도장의 목검', ursus: cul(s).ruler + '의 초상화', sami: '처음 새긴 룬 나무판', kjerag: '카란 광장 축제 때 받은 방울', leithanien: '열 살 아츠 적성 검사 결과지', victoria: '봉쇄 때 쓴 배급표', tara: '사윈 밤에 쓰던 등불', kazimierz: '어릴 적 모은 기사 카드', columbia: '첫 보험증', siracusa: '가문 색 염료 병', laterano: '수호총 수여식 사진', iberia: '등대 점등제 초', aegir: '마른 발광 해초', minos: '올리브 가지 관', sargon: '오아시스 장날에 산 향신료 통', bolivar: '세 종류의 교과서', rim: '첫 작업모', kazdel: '아버지의 뿔 손질 칼', durin: '첫 양조 때 쓴 잔' }[s.S.root] || '오래된 사진 한 장';
      return { t: '서랍에서 ' + eul(item) + ' 찾았습니다. 버리지 않았고, 누구에게 줄지는 정하지 못했습니다.', k: 'note', fx: { h: 1 }, f: F('기록된 바 없음') }; } },

  // ── 고독 ──
  { id: 'elder_lonely', a: [60, 999], w: 40, gap: 3, rep: true, c: (s) => E(s) && alone(s) && !s.S.flags.careHome,
    run: (s) => { s.S.flags.aloneElder = true;
      return { t: pick(s, ['하루 동안 말을 한 번도 하지 않았습니다. 저녁에 알아차렸습니다.', '문 두드리는 소리가 나면 반가웠습니다. 대개 배달이었습니다.', '병원에서 보호자 이름을 물었습니다. 빈칸으로 두었습니다.']), k: 'bad', fx: { h: -3, so: -3 }, f: orgF(s, '독거 노인 등록') }; } },
  { id: 'elder_neighbor', a: [60, 999], w: 35, gap: 3, rep: true, c: (s) => E(s) && (alone(s) || widowed(s)),
    run: (s) => { const communal = ['sami', 'durin', 'kjerag', 'minos', 'tara'].includes(s.S.root);
      return { t: communal ? '이웃이 돌아가며 저녁을 가져왔습니다. 이 땅에서는 ' + eul(cul(s).elder) + ' 혼자 두지 않습니다.' : '옆집 아이가 매일 아침 창문을 두드리고 갔습니다. 살아 있는지 보라고 어머니가 시켰다고 했습니다.', k: 'warm', fx: { so: 3, h: 2 }, f: orgF(s, '이웃 돌봄 관행 조사표') }; } },

  // ── 이동도시 ──
  { id: 'elder_nomad_leaves', a: [60, 999], w: 40, gap: 4, rep: true, tags: ['nomadic'], c: (s) => E(s),
    run: (s) => ({ t: pick(s, ['이동도시가 또 떠났습니다. 창밖 풍경이 바뀌었고, 평생 그랬듯 저는 따라갔습니다. 이번에는 짐이 적었습니다.', '도시가 새 좌표로 떠나는 날이었습니다. 엔진 소리에 잠을 설치는 것은 젊어서나 지금이나 같았습니다.', '정박지에 묻은 사람들의 좌표 목록을 꺼내 보았습니다. 열두 줄이었습니다.']), k: 'note', fx: { h: s.rng.chance(0.5) ? 1 : -1 },
      f: F('이동도시 운행 관리국 이동 공고') }) },
  { id: 'elder_nomad_grave', a: [60, 999], w: 40, tags: ['nomadic'], c: (s) => E(s) && widowed(s) && !s.S.flags.nomadGrave,
    run: (s) => { s.S.flags.nomadGrave = true;
      return { t: s.S.fam.partner.name + '의 무덤은 세 정박지 전의 땅에 있습니다. 무덤길의 이름판 앞에 꽃을 두는 것으로 대신했습니다.', k: 'note', fx: { h: -1, so: 1 }, f: F('이동도시 운행 관리국 무덤길 명판 등록') }; } },

  // ── 로도스 ──
  { id: 'elder_rhodes', a: [60, 999], w: 35, gap: 4, rep: true, tags: ['rhodes'], c: (s) => E(s),
    run: (s) => ({ t: pick(s, ['로도스 아일랜드에서 온 옛 동료가 들렀습니다. 서로 흉터를 세다가 그만두었습니다.', '본함 추모 벽 사진이 왔습니다. 아는 이름이 둘 늘어 있었습니다.', '의료부에서 편지가 왔습니다. 안부와 수치가 같은 줄에 적혀 있었습니다.']), k: 'warm', fx: { so: 2, h: 1 },
      f: rhodesF('퇴직 오퍼레이터 연락망') }) },

  // ── 유언 이후 ──
  { id: 'elder_will_after', a: [60, 999], w: 30, gap: 4, c: (s) => E(s) && !!s.S.flags.willDone && kidsAlive(s).length >= 2,
    run: (s) => ({ t: s.rng.chance(0.5) ? '유언 이야기가 자녀들 사이에 돌았습니다. ' + fest(s) + ' 상에서 한 사람이 일찍 일어났습니다.' : '유언장을 자녀들에게 읽어 주었습니다. 아무도 토를 달지 않았고, 그것이 더 걱정이었습니다.', k: 'note', fx: { so: -1 }, f: orgF(s, '유언 공증 대장') }) },
  { id: 'elder_wish_after', a: [60, 999], w: 40, c: (s) => E(s) && !!s.S.flags.lastWish && !s.S.flags.lastWishTold,
    run: (s) => { s.S.flags.lastWishTold = true; const w = s.S.flags.lastWish;
      return { t: w === 'trip' ? '여행에서 찍은 사진을 벽에 걸었습니다. 그 앞에 앉는 시간이 늘었습니다.' : w === 'home' ? '고향에 다녀온 뒤로 그곳 말투가 돌아왔습니다. 자녀들은 못 알아들었습니다.' : w === 'rhodes' ? '로도스에서 받은 기념품을 머리맡에 두었습니다.' : '집에서 지내기로 한 뒤로 창가 의자가 제 자리가 되었습니다.', k: 'note', fx: { h: 1 }, f: F('기록된 바 없음') }; } },
];

// ────────────────────────────────────────────────────────────────────────────
// 결정
// ────────────────────────────────────────────────────────────────────────────

export const decisions = {
  elder_retire: {
    once: false, gap: 5,
    ok: (s) => E(s) && !!s.S.job && s.S.job !== 'homemaker' && !s.S.retired && !s.S.flags.elderNoRetire && !s.S.done.retire65 && !s.S.serving && !s.S.prison,
    build: (s) => { const p = pensionOf(s);
      return { title: '은퇴', body: '몸이 예전 같지 않습니다. ' + jobName(s, s.S.job) + ' 일을 ' + s.S.jobY + '년째 하고 있습니다.' + (p.k ? ' 은퇴하면 ' + iga(p.who) + ' 나옵니다.' : ' 이 나라에서 은퇴는 소득이 끊긴다는 뜻입니다.'), fact: orgF(s, '퇴직 연령 관행'),
        choices: [
          { k: 'retire', label: '은퇴한다', sub: p.k ? '연금 ' + Math.round(p.k * 100) + '%, 건강 +' : '소득 0, 건강 +', auto: p.k ? 2.5 : 1 },
          { k: 'more', label: '5년 더', sub: '소득 유지, 건강 −', auto: 1.2 },
          { k: 'never', label: '쓰러질 때까지', sub: '다시 묻지 않습니다', auto: p.k ? 0.3 : 0.8 }] }; },
    apply: (s, k) => {
      if (k === 'retire') { retire(s); const p = pensionOf(s); s.S.flags.pensionWho = p.who;
        if (s.S.pension > 0) { s.S.pension = Math.max(s.S.pension, Math.round(s.med * p.k)); return { t: iga(p.who) + ' 책정되었습니다.', k: 'ev', fx: { hl: 2, h: 2 }, f: F(p.who + ' 지급 대장') }; }
        if (p.k) { s.S.flags.pensionPending = true; return { t: '연금은 신청해야 나온다고 했습니다. 서류 안내문을 받았습니다.', k: 'note', fx: { hl: 2 }, f: F(p.who + ' 신청 안내') }; }
        return { t: '연금 해당 조항이 없었습니다. 텃밭과 자녀를 셈에 넣었습니다.', k: 'note', fx: { hl: 2, h: -1 }, f: F(p.who + (p.excluded ? ' 지급 규정, 해당 없음' : ' 지급 대장')) }; }
      if (k === 'never') { s.S.flags.elderNoRetire = true; return { t: '은퇴라는 말을 꺼내지 않기로 했습니다.', k: 'note', fx: { h: 1, hl: -1 }, f: orgF(s, '고령 취업자 집계') }; }
      s.S.flags.workLate = true; return { t: '조금 더 일하기로 했습니다. 같은 자리, 같은 시간이었습니다.', k: 'ev', fx: { hl: -2 }, f: orgF(s, '고령 취업자 집계') };
    },
  },
  elder_pension: {
    ok: (s) => E(s) && s.S.retired && !s.S.pension && !s.S.flags.pensionAsked && pensionOf(s).k > 0,
    build: (s) => { const p = pensionOf(s); s.S.flags.pensionAsked = true;
      return { kind: 'small', title: '연금 신청', body: p.who + ' 신청서가 왔습니다. 서류는 ' + s.rng.ri(3, 9) + '장이고, 창구는 평일 오전에만 엽니다.', fact: F(p.who + ' 신청 안내'), def: 'apply',
        choices: [{ k: 'apply', label: '신청한다', sub: '중위소득의 ' + Math.round(p.k * 100) + '%', auto: 3 }, { k: 'skip', label: '미룬다', sub: '다음 해에도 창구는 같은 시간에 엽니다', auto: 0.5 }] }; },
    apply: (s, k) => { const p = pensionOf(s);
      if (k === 'apply') { s.S.pension = Math.round(s.med * p.k); s.S.flags.pensionWho = p.who; return { t: '신청이 받아들여졌습니다. 첫 지급일에 창구 직원이 이름을 두 번 확인했습니다.', k: 'ev', fx: { h: 2 }, f: F(p.who + ' 지급 대장') }; }
      s.S.flags.pensionAsked = false; return { t: '서류를 서랍에 넣어 두었습니다.', k: 'note', f: F('기록된 바 없음') }; },
  },
  elder_care: {
    ok: (s) => hAge(s) >= 72 && !s.S.flags.careHome && !s.S.flags.withKids && (conds(s).frail || conds(s).dementia || s.S.st.hl < 40) && !s.S.flags.careAsked,
    build: (s) => { s.S.flags.careAsked = true; const kids = adultKids(s); const ch = [];
      if (kids.length) ch.push({ k: 'kids', label: '자녀 집으로', sub: '관계 +, 자녀 부담', auto: 2 });
      if (CARE_HOME[s.S.root] !== '없음') ch.push({ k: 'home', label: ro(careHome(s)), sub: '매년 돈이 듭니다, 건강 +', auto: s.S.money > s.med * 2 ? 2 : 0.7 });
      ch.push({ k: 'stay', label: '집에 남는다', sub: '혼자, 고독 위험', auto: 1 });
      return { title: '돌봄', body: '혼자 지내기 어렵다는 것을 ' + (kids.length ? iga(kids[0].name) + ' 먼저 말했습니다.' : '이웃이 먼저 말했습니다.'), fact: orgF(s, '노인 돌봄 실태 조사'), choices: ch }; },
    apply: (s, k) => {
      if (k === 'kids') { s.S.flags.withKids = true; return { t: '자녀 집으로 들어갔습니다. 짐은 상자 ' + s.rng.ri(3, 8) + '개였습니다.', k: 'ev', fx: { so: 3, h: 1, money: -medX(s, 0.1) }, f: orgF(s, '동거 가구 등기') }; }
      if (k === 'home') { s.S.flags.careHome = true; return { t: careHome(s) + '에 들어갔습니다. 창가 침대였습니다.', k: 'ev', fx: { hl: 3, so: -2, money: -medX(s, 0.3) }, f: orgF(s, '요양 시설 입소 대장') }; }
      return { t: '집에 남기로 했습니다. 열쇠 하나를 이웃에게 맡겼습니다.', k: 'note', fx: { h: 1, hl: -1 }, f: orgF(s, '독거 노인 등록') };
    },
  },
  elder_will: {
    ok: (s) => hAge(s) >= 68 && !s.S.flags.willDone && (s.S.money > s.med * 0.5 || kidsAlive(s).length > 0),
    build: (s) => { const kids = kidsAlive(s); const r = rite(s); const ch = [];
      if (kids.length) ch.push({ k: 'kids', label: '자녀에게 고르게', sub: '관계 +', auto: 3 });
      if (partnerHere(s)) ch.push({ k: 'partner', label: '배우자에게 전부', sub: '관계 +', auto: 2 });
      if (r.faith !== '없음') ch.push({ k: 'faith', label: r.place + '에 기부', sub: '행복 +, 자녀 −', auto: 0.7 });
      ch.push({ k: 'rhodes', label: '로도스 아일랜드에 기부', sub: s.S.rhodes ? '옛 동료들에게' : '감염자 치료에', auto: s.S.rhodes ? 2 : 0.5 });
      ch.push({ k: 'none', label: '쓰지 않는다', sub: '나라 법대로', auto: 0.8 });
      return { title: '유언', body: '유언을 남길 때가 되었습니다. 남긴 것은 ' + (s.S.money > 0 ? '약간의 돈과 집기' : '빚과 집기') + '입니다.', fact: orgF(s, '유언 공증 규정'), choices: ch }; },
    apply: (s, k) => { s.S.flags.willDone = k;
      if (k === 'kids') return { t: '자녀 몫을 고르게 적었습니다. 고르게 적는 데 하루가 걸렸습니다.', k: 'ev', fx: { so: 2, h: 1 }, f: orgF(s, '유언 공증 대장') };
      if (k === 'partner') return { t: wa(s.S.fam.partner.name) + ' 함께 서명했습니다.', k: 'warm', fx: { so: 2, h: 2 }, f: orgF(s, '유언 공증 대장') };
      if (k === 'faith') return { t: rite(s).place + ' 앞으로 남겼습니다. 자녀들은 말이 없었습니다.', k: 'note', fx: { h: 2, so: -2 }, f: orgF(s, '유언 공증 대장, 기부 항목') };
      if (k === 'rhodes') return { t: '로도스 아일랜드 앞으로 남겼습니다. 의료부에서 짧은 감사 편지가 왔습니다.', k: 'warm', fx: { h: 2 }, f: rhodesF('기부자 명부') };
      return { t: '유언장은 쓰지 않았습니다. 나라 법이 알아서 나눌 것입니다.', k: 'note', f: orgF(s, '무유언 상속 규정') }; },
  },
  elder_wish: {
    ok: (s) => hAge(s) >= 70 && !s.S.flags.lastWish && !conds(s).frail && !s.S.flags.careHome,
    build: (s) => { const ch = [];
      if (s.S.money > s.med * 0.5) ch.push({ k: 'trip', label: '마지막 여행', sub: '돈 −, 행복 +, 건강 −', auto: s.S.money > s.med * 2 ? 2 : 1 });
      if (s.S.mig || s.S.cur !== s.S.born || s.S.urban) ch.push({ k: 'home', label: '고향에 다녀온다', sub: '행복 +', auto: 1.5 });
      ch.push({ k: 'rhodes', label: '로도스 아일랜드를 찾아간다', sub: s.S.rhodes ? '옛 동료' : '먼 길, 들여보내 줄지 모릅니다', auto: s.S.rhodes ? 2 : 0.4 });
      ch.push({ k: 'stay', label: '집에 머문다', sub: '변화 없음', auto: 1 });
      return { title: '마지막 소원', body: '아직 걸을 수 있을 때 하고 싶은 것을 하나 고르라고 ' + (kidsAlive(s).length ? '자녀가' : '의사가') + ' 말했습니다.', fact: F('기록된 바 없음'), choices: ch }; },
    apply: (s, k) => { s.S.flags.lastWish = k;
      if (k === 'trip') { const dest = s.rng.pick(s.data.topNations.filter((n) => n.id !== s.S.root)).name;
        return { t: ro(dest) + ' 여행을 다녀왔습니다. 다리는 사흘 아팠고, 사진은 ' + s.rng.ri(20, 80) + '장이었습니다.', k: 'warm', fx: { h: 6, hl: -3, money: -medX(s, 0.6) }, f: F(dest + ' 입국 심사 기록, 고령 방문객 항목') }; }
      if (k === 'home') return { t: '고향에 다녀왔습니다. 집은 없어졌고, 길은 그대로였습니다.', k: 'warm', fx: { h: 4, so: 1, money: -medX(s, 0.1) }, f: F(s.data.nationById[s.S.born].name + ' 출생지 방문 기록') };
      if (k === 'rhodes') { if (s.S.rhodes || s.rng.chance(0.3)) return { t: '로도스 아일랜드에 다녀왔습니다. ' + (s.S.rhodes ? '옛 동료 몇은 그대로였고, 몇은 추모 벽에 있었습니다.' : '정문에서 오래 기다렸고, 의료부 사람이 차 한 잔을 내주었습니다.'), k: 'warm', fx: { h: 4, money: -medX(s, 0.3) }, f: rhodesF('방문자 기록') };
        return { t: '로도스 아일랜드를 찾아 나섰습니다. 본함은 그 좌표에 없었습니다.', k: 'note', fx: { h: -2, money: -medX(s, 0.3) }, f: rhodesF('본함 이동 공고') }; }
      return { t: '집에 머물기로 했습니다. 창가 의자를 조금 옮겼습니다.', k: 'note', fx: { h: 1 }, f: F('기록된 바 없음') }; },
  },
  elder_treat_quit: {
    ok: (s) => hAge(s) >= 65 && s.S.ori.known && !s.S.flags.treatQuit && (s.S.ori.treated || s.S.flags.suppressant) && !s.S.flags.treatAsked,
    build: (s) => { s.S.flags.treatAsked = true;
      return { title: '치료', body: '억제제는 결정이 자라는 속도를 절반으로 늦춥니다. 값은 ' + (s.S.rhodes ? '로도스가 대지만, 부작용은 제 몫입니다.' : '매년 중위소득의 40%입니다.') + ' 의사는 어느 쪽도 권하지 않았습니다.', fact: rhodesF('소책자 「노년의 감염」'),
        choices: [{ k: 'keep', label: '끝까지 치료한다', sub: '진행 ×0.5, 돈 −', auto: 2 }, { k: 'quit', label: '치료를 그만둔다', sub: '진행 그대로, 돈 유지, 행복 +', auto: 1 }] }; },
    apply: (s, k) => {
      if (k === 'quit') { s.S.flags.treatQuit = true; s.S.ori.treated = false; return { t: '약을 끊었습니다. 돈은 남고, 날은 줄었습니다.', k: 'note', fx: { h: 2 }, f: rhodesF('치료 중단 동의서') }; }
      return { t: '치료를 계속하기로 했습니다.', k: 'ev', fx: { h: -1 }, f: rhodesF('치료 지속 기록') }; },
  },
  elder_downsize: {
    ok: (s) => hAge(s) >= 64 && !nomadic(s) && s.S.money < s.med * 0.3 && !s.S.flags.downsized && !s.S.flags.careHome && !s.S.flags.withKids,
    build: (s) => ({ kind: 'small', title: '집', body: '집을 유지할 돈이 부족합니다. 작은 곳으로 옮기면 얼마간 손에 남습니다.', fact: orgF(s, '주택 거래 등기'), def: 'sell',
      choices: [{ k: 'sell', label: '작은 곳으로', sub: '돈 +, 관계 −', auto: 2 }, { k: 'keep', label: '버틴다', sub: '돈 −', auto: 1 }] }),
    apply: (s, k) => { s.S.flags.downsized = true;
      if (k === 'sell') return { t: '집을 팔고 방 하나짜리로 옮겼습니다. 이웃은 바뀌었고, 창은 작아졌습니다.', k: 'ev', fx: { money: medX(s, 0.8), so: -2 }, f: orgF(s, '주택 거래 등기') };
      return { t: '집에 남았습니다. 난방을 방 하나로 줄였습니다.', k: 'note', fx: { hl: -2, money: -medX(s, 0.1) }, f: orgF(s, '주택 거래 등기, 거래 없음') }; },
  },
  elder_grand_raise: {
    ok: (s) => E(s) && (s.S.flags.grandkids || 0) > 0 && !s.S.flags.grandRaiseAsked && s.rng.chance(0.3),
    build: (s) => { s.S.flags.grandRaiseAsked = true; const k = pick(s, adultKids(s)) || { name: '자녀' };
      return { title: '손주', body: eun(k.name) + ' 일 때문에 아이를 맡아 달라고 했습니다. 기간은 "당분간"이었습니다.', fact: orgF(s, '조손 가구 등록'),
        choices: [{ k: 'yes', label: '맡는다', sub: '관계 +, 건강 −, 돈 −', auto: 2 }, { k: 'no', label: '거절한다', sub: '관계 −', auto: 1 }] }; },
    apply: (s, k) => {
      if (k === 'yes') { s.S.flags.raisingGrand = true; return { t: '손주를 맡았습니다. 집이 다시 시끄러워졌고, 허리는 다시 아팠습니다.', k: 'warm', fx: { so: 4, h: 2, hl: -3, money: -medX(s, 0.15) }, f: orgF(s, '조손 가구 등록') }; }
      return { t: '거절했습니다. 전화는 그 뒤로 짧아졌습니다.', k: 'note', fx: { so: -3 }, f: F('기록된 바 없음') }; },
  },
  elder_memorial: {
    ok: (s) => E(s) && widowed(s) && !s.S.flags.memorialAsked && s.S.flags.widowRite != null,
    build: (s) => { s.S.flags.memorialAsked = true; const r = rite(s);
      return { kind: 'small', title: '기일', body: s.S.fam.partner.name + '의 첫 기일입니다. ' + (r.faith === '없음' ? '이 땅에는 정해진 절차가 없습니다.' : r.place + '에서 하는 것이 이 땅의 관례입니다.'), fact: r.f({ org: org(s) }), def: 'keep',
        choices: [{ k: 'keep', label: '매년 지킨다', sub: '관계 +', auto: 2 }, { k: 'stop', label: '마음으로만', sub: '변화 없음', auto: 1 }] }; },
    apply: (s, k) => { if (k === 'keep') { s.S.flags.memorialKept = true; return { t: '기일을 지키기로 했습니다. 달력에 동그라미를 쳤습니다.', k: 'note', fx: { so: 1, h: 1 }, f: orgF(s, '제례 관행 조사표') }; }
      return { t: '마음으로만 기리기로 했습니다.', k: 'note', f: F('기록된 바 없음') }; },
  },
};

export default { events, decisions };
