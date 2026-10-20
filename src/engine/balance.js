// 밸런스 상수 모음. 설계 명세 §5 의 초기값은 주석에 그대로 남기고, 실제 값은 test/sim.js 로 맞춘 것(W2 메모 참조).
// 전부 "추정"이며 W5 밸런스 세션이 다시 조정한다.

export const BALANCE = {
  // §5.1 연간 감염 기본 확률. 명세 초안: {1: 0.002, 2: 0.006, 3: 0.015}
  //  → 그대로 쓰면 평생 감염률이 40~75% 가 되어 기대수명이 20~30년 꺼진다. 1/4 수준으로 낮춤.
  oriBase: { 1: 0.00015, 2: 0.0005, 3: 0.0012 },   // W6: 등급 1<2<3 간격을 넓힘(1·2 가 거의 같게 나오던 것)
  // 부모 세대 감염 유병률(출생 감염 판정용). 명세에 없음 → 추가. oriBase × 이 배율 × home^0.5 × race.oriVuln × sqrt(job.oriMul)
  parentPrevMul: 25,
  // 출생 감염: 부모 한쪽 60%, 양쪽 90% (명세 그대로)
  bornInfectP: { one: 0.6, both: 0.9 },
  // 광산 등 oriMul >= 3 직업 부모의 유병률 추가 배율(광산촌: 분진이 집까지)
  minerParentMul: 2.0,
  // 출생 감염아의 5세 미만 추가 사망 승수(결정화와 별도. 태어나자마자 죽는 광산촌 아이)
  bornInfantMort: 2.5,
  // 아동 노동 시작 나이: 학교 못 간 q1 / q2 (명세 없음 → 추가). 그 외는 15세
  childLaborAge: { 1: 9, 2: 12 },
  // 진행: 연 +0.03~0.08 (명세 그대로), 치료 ×0.5, 아츠 과용 ×1.3, 재앙 피폭 +0.1
  oriProg: [0.03, 0.08],
  // 진단: 2기 이상이면 연 85%, 1기는 5%(치료국 12%)
  diagP: { stage2: 0.85, stage1: 0.05, stage1Treat: 0.12 },
  rhodesOfferP: 0.02,          // 진단 시 '엽서' 플래그(콘텐츠 adult_rhodes_offer 가 읽음). v1 엔진 입구는 B.rhodes
  campDeathP: 0.025,

  // §5.2 재앙이 '나'를 덮칠 연간 확률. 명세 초안: {1: 0.01, 2: 0.03, 3: 0.06} × (이동도시 0.3 / 정주 1.5)
  //  → 정주 catFreq 3 이면 연 9% 피격이라 피폭 감염만으로 평생 25% 가 감염된다. 0.4배로 낮춤(국가 단위 재앙 빈도와 개인 피격은 다르다는 해석)
  catBase: { 1: 0.004, 2: 0.012, 3: 0.025 },
  catHome: { nomadic: 0.3, settled: 1.5 },
  // 결과 누적 경계. 명세 초안: 대피 60% / 피해 30% / 감염 8% / 사망 2%
  //  → 감염 8% 는 재앙 피격 확률과 곱하면 평생 20% 이상 추가 감염이라 3% 로 낮춤(대피 63 / 피해 33 / 감염 3 / 사망 1)
  catCut: { evac: 0.63, damage: 0.96, infect: 0.99 },
  // 정보 전달자 오보 플래그가 있으면 롤에 더하는 값(그 해만 유효). 0.25 는 사망이 27% 가 되어 과함 → 0.06
  badForecastShift: 0.06,

  // §5.4 분쟁: conflict 3 국가 연간 롤. 전시 ×3, 복무 중 ×3. 결과 재산 50% / 부상 43% / 사망 7%
  conflictP: 0.008,
  conflictCut: { money: 0.5, injury: 0.93 },
  seabornP: 0.0015,          // 시테러 습격(해안국). 절반은 사망
  collapsalP: 0.001,         // 붕괴체 조우(북방). 40% 사망

  // §5.5 보험료 15~30% (명세 그대로), 보호비 소득 10%
  premium: [0.15, 0.3],
  neglectFee: 0.1,

  // ── v1 §13 진로·역량·이주·혼인·관계·로도스 (전부 창작, W7) ──────────────────
  track: {
    seekP: 0.6,                 // 진로 없음 → 매년 진입 롤
    seekPJobless: 0.9,          // 이전에 진로가 있었던 실업자
    promoMax: 0.6,              // 승급 확률 상한
    promoStanding: 10,          // 승급 시 standing +
    kRange: [0.01, 0.25],       // 승급 k 허용 범위(validate)
    baseRange: [0, 0.08],       // 몰락 base 허용 범위(validate)
    warFallMul: 3,              // 전시(S.flags.war) 몰락 ×
    conflict3Mul: 1.5,          // 분쟁 3등급 국가 몰락 ×
    luckFall: 0.15,             // 몰락 p × (1 − luckFall·luck)
    fallScale: 0.45,            // 데이터의 fall.base 전체 배율(수명 ±5 유지용. 명세 base 0.01~0.08 을 그대로 쓰면 평생 몰락 60%+)
    deathSoften: 0.35,          // death 결과는 이 확률로만 실제 사망, 아니면 injured(폭력·사고) 또는 expel
    disgraceMul: 0.3,           // disgrace 이후 다음 진로 진입 가중 ×
    settlingMul: 0.5,           // 정착 중 진입 가중 ×
    specialBoost: 1.2,          // 국가 특수 진로(canon && A10/A11 외) ×
    fitShift: 0.3,              // fit = logistic(z − fitShift)
    growCap: 0.04,              // 재직 연 +z(promo.cap)
    growCapMaxPerStage: 0.6,    // 상한 = 단계수×0.6 + 1.0
    growCapBase: 1.0,
    standingDrift: 2.5,         // standing 연간 잡음 sd
    standingWork: 4,            // 초점 '일' standing +
    retireHealth: 40,           // 건강 < 이 값이면 은퇴
    a4TermReenlist: 0.5,        // A4 복무 기간 뒤 재복무 확률
    a2InfectedArena: true,      // A2 감염 판정 시 arena 강제 전환
    a5OriMul: 8,                // A5 기본 감염 배율
    a7PromoMul: 0.3,            // A7 승급은 징조 이벤트 위주 → 기본 롤 ×
    a1FamilyDeathP: 0.3,        // A1 vendetta 사망 시 가족 연좌 사망 롤
    jailYears: [1, 6], campYears: [3, 12],
    skillIncome: 0.1,           // 소득 × (1 + 0.1·z(skill))
    childLaborArch: ['A11', 'A5'],   // 아동 노동이 허용되는 원형
  },
  cap: {
    sd: 0.6,                    // 출생 N(0, 0.6)
    qLearn: 0.25, qTies: 0.35,  // (q−3)× 보정
    trait: { grit: { skill: 0.1 }, cur: { learn: 0.1 }, warm: { ties: 0.1 }, act: { skill: 0.1 } },   // S.trait 키(childhood 결정: cur/act/warm/grit)
    schoolLearn: 0.08,          // 재학 중 learn +z/년
    focus: { study: { learn: 0.05 }, sport: { skill: 0.04 }, arts: { arts: 0.04 }, family: { ties: 0.03 }, play: { ties: 0.03 }, work: { skill: 0.02 }, learn: { learn: 0.03 } },
    legacyFx: 0.01,             // 구 fx sm/so 1점 = z 0.01
    migTies: 0.6,               // 이주 시 ties −60%
    prisonTies: 0.8,            // 투옥·추방 시 ties −80%
    looksTies: 0.01,            // |looks|>1 이면 ties 연 ±0.01
    decayAge: 60, decaySkill: 0.02, dementiaLearn: 0.05,
    looksChange: { money: 3, ok: 0.7, fail: 0.2, hlFail: -15, hlAccident: -40, delta: 1.0, nations: ['leithanien', 'columbia', 'lungmen', 'higashi'] },
    grades: [[-0.8, '낮음'], [0.5, '보통'], [1.4, '높음'], [Infinity, '뛰어남']],
  },
  mig: {
    settling: 3, settlingRefugee: 6,
    illegalRisk: 0.08,          // 불법 체류 발각 연
    naturalizeP: 0.1,           // 10년+ 합법 → 연 귀화 결정
    naturalizeYears: 10,
    returnHomeGap: 10,
    asylumLegalP: 0.15,         // 난민 → 합법 연
    workP: 0.02,                // A10/A11 진로에서 migrate_work 결정 노출 연
    joblessWorkP: 0.06,         // 실업 3년+ 에서 migrate_work 결정 노출 연
    workAutoStay: 6,            // 자동 결정에서 '남는다' 가중(목적지는 각 1)
    joblessYears: 3,
    studyP: 0.02, studyLearn: 0.8, studyNations: ['columbia', 'leithanien', 'yan', 'victoria', 'kjerag'],
    asylumNations: ['columbia', 'victoria', 'lungmen'],
    fleeP: 0.1,                 // 재앙 피격(피해)·전시 피난 롤
    contractAbroadP: 0.3,       // A6 진입 시 해외 계약
    partnerForeignP: 0.05,      // 배우자가 타국 출신
    visitShare: 0.2,            // 순회형: 피드 이벤트 20% 방문국
    stayShare: 0.5,             // 이주민이 귀향 결정에서 남을 기본 가중
    hostile: ['persecute', 'expel', 'euthanasia'],
  },
  marriage: {
    polyIncome: 4,              // poly 두 번째 배우자: 소득 ≥ 중위 ×
    polyP: 0.1,
    crossRaceP: 0.15,           // 배우자가 다른 종족
    opposeBlock: 0.4,           // 관계 등급 문화적 이하에서 가족 반대로 무산
    autoAccept: 0.75, autoHold: 0.1, autoDecline: 0.15,
  },
  housing: { changeGap: 5, buyMoneyMul: 1.5 },
  rel: {
    mul: { favored: 1.3, neutral: 1.0, subtle: 0.8, cultural: 0.6, institutional: 0.2, exclude: 0 },
    income: { institutional: 0.7, cultural: 0.9 },
    crime: { institutional: 1.5, cultural: 1.2 },
    marriageOppose: ['cultural', 'institutional'],
  },
  rhodes: {
    pScale: 0.12,               // 데이터 entries[].pYear 전체 배율(W8 값 그대로면 합류율 9%+. 목표 전체 1~3%, 감염자 중 8~15%)
    contactP: 0.006,            // 접점 이벤트(엔진 자체 volunteer 노출) 연(명세 3% 는 '접점 이벤트' 빈도. 자원 제안은 그중 일부)
    volunteerCap: 1.0,
    referralCap: 1.0,
    treatmentP: 0.015,          // 진단 후 치료 입구 연
    treatmentMoney: 1.0,        // 또는 돈 ≥ 중위 ×
    agreementP: 0.04,
    flightP: 0.05,
    transferP: 0.01,
    rescueP: 0.05,
    companionP: 0.5,
    autoJoin: { treatment: 0.5, rescue: 0.7, companion: 0.6, default: 0.4 },
    fusionMul: 28, fusionSd: 1.5, fusionMax: 60,
    opGrades: [[-1, '결함'], [-0.3, '보통'], [0.4, '표준'], [1.0, '우수'], [1.7, '뛰어남'], [Infinity, '탁월']],
  },
};
