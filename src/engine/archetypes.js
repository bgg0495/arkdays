// 원형(archetype) 기본값(§4). 원형은 엔진 메커니즘 분류일 뿐 텍스트가 없다. 진로 JSON 에 명시된 값이 항상 우선.
//   promoCap   stages[].promo.cap 기본
//   fallBase   stages[].fall.base 기본
//   causes     stages[].fall.causes 기본
//   exits      exits.fall 기본(cause → 결과). 값 사전은 §3.5: death | prison:jail|camp | exile | demote | expel | injured | infected | disgrace | arena:<ID> | switch:<ID>
//   retireAge  exits.retire.age 기본(없으면 은퇴 없음)
//   oriMul     감염 배율 기본
//   flags      특수 메커니즘 스위치(track.js 가 읽음)
export const ARCHETYPES = {
  A1: { name: '패밀리·범죄', promoCap: 'ties', fallBase: 0.04, causes: ['vendetta', 'arrest'],
    exits: { vendetta: 'death', arrest: 'prison:jail', betrayal: 'exile', purge: 'death', coup: 'death' }, retireAge: 60, oriMul: 1,
    flags: { familyDeath: true, legalExitStanding: 80 } },
  A2: { name: '기사 스포츠', promoCap: 'skill', fallBase: 0.04, causes: ['injury', 'scandal', 'elimination'],
    exits: { injury: 'injured', scandal: 'disgrace', elimination: 'expel' }, retireAge: 38, oriMul: 1,
    flags: { season: true, looksWeight: 1.5, infectedArena: true } },
  A3: { name: '관료·과거', promoCap: 'learn', fallBase: 0.03, causes: ['impeach', 'purge', 'exile'],
    exits: { impeach: 'disgrace', purge: 'death', exile: 'exile' }, retireAge: 65, oriMul: 0.8,
    flags: { exam: true, examTries: 3 } },
  A4: { name: '군단·징집', promoCap: 'skill', fallBase: 0.03, causes: ['kia', 'desert', 'courtmartial'],
    exits: { kia: 'death', desert: 'exile', courtmartial: 'prison:jail' }, retireAge: 55, oriMul: 1.2,
    flags: { capStage: true, warFall: true, term: true } },
  A5: { name: '광산 노역', promoCap: 'skill', fallBase: 0.05, causes: ['accident', 'execution', 'crystallize'],
    exits: { accident: 'death', execution: 'death', crystallize: 'death' }, retireAge: null, oriMul: 8,
    flags: { forced: true } },
  A6: { name: '용병', promoCap: 'skill', fallBase: 0.04, causes: ['kia', 'contract_end'],
    exits: { kia: 'death', contract_end: 'expel' }, retireAge: 45, oriMul: 1.3,
    flags: { contract: [2, 4], itinerantOk: true } },
  A7: { name: '부족·사제', promoCap: 'arts', fallBase: 0.02, causes: ['erosion', 'exile'],
    exits: { erosion: 'death', exile: 'exile' }, retireAge: 70, oriMul: 1.5,
    flags: { omenPromo: true, infectedResign: true } },
  A8: { name: '교단·수도원', promoCap: 'learn', fallBase: 0.02, causes: ['heresy', 'demotion', 'poison'],
    exits: { heresy: 'disgrace', demotion: 'demote', poison: 'death' }, retireAge: 70, oriMul: 0.8,
    flags: { policyFirst: true } },
  A9: { name: '연구·기업', promoCap: 'learn', fallBase: 0.02, causes: ['accident', 'disappear'],
    exits: { accident: 'injured', disappear: 'death' }, retireAge: 65, oriMul: 1.2,
    flags: { noLayoff: true, selfExperiment: true } },
  A10: { name: '회사원', promoCap: 'learn', fallBase: 0.03, causes: ['layoff', 'bankrupt'],
    exits: { layoff: 'expel', bankrupt: 'expel' }, retireAge: 62, oriMul: 1,
    flags: { commonWorkEvents: true } },
  A11: { name: '생업', promoCap: 'skill', fallBase: 0.02, causes: ['ruin'],
    exits: { ruin: 'demote' }, retireAge: 65, oriMul: 1,
    flags: { homeLink: true, childLabor: true } },
  A12: { name: '예인', promoCap: 'arts', fallBase: 0.04, causes: ['scandal', 'fade'],
    exits: { scandal: 'disgrace', fade: 'expel' }, retireAge: 55, oriMul: 1,
    flags: { looksWeight: 2.0, fameStanding: true } },
};
export const ARCHETYPE_IDS = Object.keys(ARCHETYPES);

/** 몰락 cause → causes.json 사인 id (§11.4). 없으면 cause 그대로(die 가 label 로 처리) */
export const FALL_CAUSE_TO_DEATH = {
  vendetta: 'vendetta', kia: 'war', accident: 'mine_accident', execution: 'execution', crystallize: 'oripathy',
  erosion: 'collapsal', purge: 'execution', coup: 'violence', poison: 'violence', disappear: 'experiment', betrayal: 'vendetta',
};
export const FALL_CAUSE_LABEL = {
  vendetta: '벤데타', kia: '전사', accident: '사고', execution: '처형', crystallize: '결정화', erosion: '침식', purge: '숙청',
  coup: '쿠데타', poison: '독살', disappear: '실종', betrayal: '배신', arrest: '체포', desert: '탈영', courtmartial: '군법회의',
  impeach: '탄핵', exile: '추방', injury: '부상', scandal: '스캔들', elimination: '탈락', heresy: '이단 판정', demotion: '좌천',
  layoff: '해고', bankrupt: '파산', ruin: '몰락', fade: '잊힘', contract_end: '계약 해지', washout: '탈락', infected: '감염 판정',
  protection: '보호비', bribed: '매수', arena: '혈투 리그행',
};

export function archetypeOf(id) { return ARCHETYPES[id] || ARCHETYPES.A11; }
