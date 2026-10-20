// W4c 사망 텍스트 데이터. 사망 기록 요약문·사인별 문장·각주·국가 문화별 장례 묘사.
// UI(src/ui/text.js deathSummary / dead.js)는 손대지 않았다. 연결 방법은 docs/설계_명세.md "W4c 메모" 참조.
// 톤(D25): "~했습니다"체, 각주는 세계관 안의 출처만, 죽음은 장면 없이 결과만.
//
// 내보내는 것
//   CAUSE_TEXT   사인 id → { t(p), f(p) }   p = params(sim) 가 만드는 매개변수
//   RITES        장례 관습 id(국가 root id · 'nomadic' · 'rhodes' · 'infected') → { faith, place, line(p), f(p), mourning, prayer }
//   EXTRA_CAUSES 대사건 전용 사인 id(bigevents.js 가 die() 에 넘기는 id) → { label, t, f }
//   params(sim)  템플릿 매개변수
//   riteOf(sim)  현재 생에 맞는 장례 관습(감염자·로도스·이동도시 우선순위 포함)
//   deathTexts(sim) → { line, f, rite, riteF, note }   UI 가 한 번에 가져다 쓰는 묶음
import { ro, eun, iga, eul, wa } from '../src/engine/text.js';

const F = (t) => '(' + t + ')';

/** 템플릿 매개변수 */
export function params(sim) {
  const { S, data } = sim;
  const d = S.deathAt || { age: S.age, year: S.by + S.age, cause: 'unknown', label: '알 수 없는 사유', where: S.cur };
  const nation = data.nationById[d.where] || data.nationById[S.cur];
  const born = data.nationById[S.born] || nation;
  return {
    age: d.age, year: d.year, cause: d.cause, label: d.label,
    nation: nation.name, nationId: nation.id, rootId: rootOf(data, nation.id), bornName: born.name,
    org: (nation.culture && nation.culture.factions && S.sub && nation.culture.factions[S.sub.region]) ? nation.culture.factions[S.sub.region] + ' 등기소' : (nation.statOrg || (nation.name + ' 기록소')), cul: nation.culture || {},
    sex: S.sex, infected: !!S.ori.on, known: !!S.ori.known, rhodes: !!S.rhodes, nomadic: S.home.type === 'nomadic',
    partner: S.fam.partner, kids: S.fam.kids.filter((k) => k.alive).length, retired: !!S.retired, mig: S.mig,
    race: data.raceById[S.race],
    // W12(D51-7): 볼리바르 출생 진영 이름(nations.json culture.factions × S.sub.region). 없으면 null
    faction: (nation.culture && nation.culture.factions && S.sub && nation.culture.factions[S.sub.region]) || null,
  };
}
function rootOf(data, id) { const n = data.nationById[id]; return n && n.parent ? n.parent : id; }

// ────────────────────────────────────────────────────────────────────────────
// 사인별 문장. 형식은 전부 "N세에 ~로 세상을 떠났습니다." 한 문장 + 덧붙이는 짧은 한 문장.
// ────────────────────────────────────────────────────────────────────────────
export const CAUSE_TEXT = {
  neonatal: { t: (p) => p.age + '세에 출생 직후 합병증으로 세상을 떠났습니다. 이름은 호적에 올랐고, 그 아래 칸은 비어 있습니다.', f: (p) => F(p.org + ' 영아 사망 집계, ' + p.year + '년') },
  infection: { t: (p) => p.age + '세에 감염병으로 세상을 떠났습니다. 열은 끝내 내리지 않았습니다.', f: () => F('로도스 아일랜드 의료부 소책자 「열병과 깨끗한 물」') },
  respiratory: { t: (p) => p.age + '세에 폐렴으로 세상을 떠났습니다. 겨울이었습니다.', f: (p) => F(p.org + ' 사망 등기, 사인란 "폐"') },
  cardio: { t: (p) => p.age + '세에 심장과 혈관의 병으로 세상을 떠났습니다. 아침에 일어나지 않았습니다.', f: () => F('로도스 아일랜드 의료부 소책자 「멈추는 심장」') },
  cancer: { t: (p) => p.age + '세에 암으로 세상을 떠났습니다. 마지막 한 해가 가장 길었습니다.', f: (p) => F(p.org + ' 사망 등기, 사인란 "종양"') },
  accident: { t: (p) => p.age + '세에 사고로 세상을 떠났습니다. 여느 날과 다를 것 없는 날이었습니다.', f: (p) => F(p.org + ' 사고 사망 월보') },
  childbirth: { t: (p) => p.age + '세에 아이를 낳다 세상을 떠났습니다.', f: (p) => F(p.org + ' 모성 사망 기록. 산파의 이름만 남아 있습니다') },
  oldage: { t: (p) => p.age + '세에 노환으로 세상을 떠났습니다. 잠든 채였습니다.', f: (p) => F(p.org + ' 사망 등기, 사인란 "고령"') },
  suicide: { t: (p) => p.age + '세에 스스로 선택한 죽음으로 세상을 떠났습니다.', f: () => F('로도스 아일랜드 의료부 상담 창구는 누구에게나 열려 있습니다'), note: '로도스 아일랜드 의료부 상담 창구는 밤에도 불이 켜져 있습니다.' },
  violence: { t: (p) => p.age + '세에 폭력으로 세상을 떠났습니다. 가해자 칸은 비어 있습니다.', f: (p) => F(p.org + ' 치안 월보, 미결 항목') },
  starvation: { t: (p) => p.age + '세에 굶주림으로 세상을 떠났습니다. 그해 배급표는 종이값도 되지 않았습니다.', f: (p) => F(p.org + ' 식량 배급 대장 말미') },

  oripathy: { t: (p) => p.age + '세에 광석병 결정화로 세상을 떠났습니다. 혈중 결정 밀도가 0.80 u/L를 넘긴 날이었습니다.' + (p.rhodes ? ' 로도스 아일랜드 의료부가 곁에 있었습니다.' : ''), f: () => F('로도스 아일랜드 의료부, 「결정화 이후의 절차」') },
  euthanasia: { t: (p) => p.age + '세에 국가 안락사로 세상을 떠났습니다. 통지서에 적힌 날짜 그대로였습니다.', f: () => F('궁정 기록국 보건령 제3조 집행 대장') },
  camp: { t: (p) => p.age + '세에 수용소에서 세상을 떠났습니다. 사유란에는 "재분류"라고 적혔습니다.', f: () => F('제국 내무성 수용소 명부') },
  execution: { t: (p) => p.age + '세에 처형되었습니다. 죄목은 한 줄이었습니다.', f: (p) => F(p.org + ' 집행 기록') },
  catastrophe: { t: (p) => p.age + '세에 재앙으로 세상을 떠났습니다. 경보는 울렸습니다. 조금 늦었을 뿐입니다.', f: () => F('재앙 정보 전달자 협회 사후 보고서, "경로 오차 있음"') },
  mine_accident: { t: (p) => p.age + '세에 광산 사고로 세상을 떠났습니다. 갱도는 이틀 뒤 다시 열렸습니다.', f: (p) => F(p.org + ' 광산 사고 집계, 보상 항목 별지') },
  arts_backlash: { t: (p) => p.age + '세에 아츠 폭주로 세상을 떠났습니다. 유닛은 남지 않았습니다.', f: (p) => F(p.org + ' 아츠 사고 기록') },
  nomadic_accident: { t: (p) => p.age + '세에 이동도시 사고로 세상을 떠났습니다. 도시는 일정대로 떠났습니다.', f: () => F('이동도시 운행 관리국 사고 일지') },
  seaborn: { t: (p) => p.age + '세에 시테러 습격으로 세상을 떠났습니다. 시신은 돌아오지 않았습니다.', f: () => F('재판소 해안 사망 등기, "실종 후 사망 처리"') },
  sacrifice: { t: (p) => p.age + '세에 인신공양으로 세상을 떠났습니다. 제비는 공정했다고 마을은 말합니다.', f: () => F('재판소 해안 교구 기록, 백일 제비뽑기 명단') },
  collapsal: { t: (p) => p.age + '세에 붕괴체 정신오염으로 세상을 떠났습니다. 마지막 며칠은 아무도 알아보지 못했습니다.', f: (p) => F(p.org + ' 북방 사망 등기') },
  war: { t: (p) => p.age + '세에 전쟁으로 세상을 떠났습니다. 어느 쪽 포탄이었는지는 기록에 없습니다.', f: (p) => F(p.org + ' 전몰자 명부') },
  vendetta: { t: (p) => p.age + '세에 벤데타로 세상을 떠났습니다. 집 앞이었습니다.', f: () => F('시청(패밀리 승인) 사망 등기, 사인란 공란') },
  major_arena: { t: (p) => p.age + '세에 경기장에서 세상을 떠났습니다. 중계는 멈추지 않았습니다.', f: () => F('감정회 경기 사망 집계, 스폰서 보상 조항') },
  hound: { t: (p) => p.age + '세에 사냥개에게 물려 세상을 떠났습니다. 블랙 플로우 쪽에서 온 짐승이었습니다.', f: () => F('등기소(가까운 정부 쪽) 남부 사망 집계') },
  experiment: { t: (p) => p.age + '세에 생체 실험으로 세상을 떠났습니다. 서류상으로는 "전출"이었습니다.', f: (p) => F(p.org + ' 인원 이동 대장') },
  feranmut: { t: (p) => p.age + '세에 베헤모스 습격으로 세상을 떠났습니다. 그해 겨울은 짐승도 굶었습니다.', f: (p) => F(p.org + ' 야수 피해 집계') },
  corpse_blast: { t: (p) => p.age + '세에 감염자 시신 폭발의 2차 피해로 세상을 떠났습니다. 곁을 지키던 중이었습니다.', f: () => F('로도스 아일랜드 의료부 소책자 「말기 감염자의 임종」') },
  jungle_fever: { t: (p) => p.age + '세에 정글 풍토병으로 세상을 떠났습니다. 재앙이 없는 땅의 값이었습니다.', f: () => F('파디샤 궁정 서기국 아카후알라 보고') },
  dehydration: { t: (p) => p.age + '세에 탈수로 세상을 떠났습니다. 바다에서 너무 멀었습니다.', f: () => F('집정관 기록원 육지 체류자 사망 집계') },
  dome_collapse: { t: (p) => p.age + '세에 돔 붕괴로 세상을 떠났습니다. 천장은 모두의 천장이었습니다.', f: () => F('돔 공동체 기록소 붕괴 기록') },
  avalanche: { t: (p) => p.age + '세에 눈사태로 세상을 떠났습니다. 봄에 찾았습니다.', f: () => F('삼족 공의회 등기소 설산 사망 등기') },
};

/** 대사건 전용 사인(bigevents.js 가 die(id, label) 로 넘긴다. causes.json 에 없으므로 label 이 그대로 쓰인다) */
export const EXTRA_CAUSES = {
  chernobog_1096: { label: '체르노보그 재앙', t: (p) => p.age + '세에 체르노보그 재앙으로 세상을 떠났습니다. 도시의 셋 중 하나가 그날 함께 떠났습니다.', f: () => F('제국 내무성 체르노보그 이재민 집계, 1096년 12월') },
  lungmen_1096: { label: '용문 사변', t: (p) => p.age + '세에 용문 사변으로 세상을 떠났습니다. 빈민가 쪽이었습니다.', f: () => F('용문 근위국 치안 백서, 1096년 12월') },
  londinium_1098: { label: '런디니움 전투', t: (p) => p.age + '세에 런디니움 전투로 세상을 떠났습니다. 성벽 안이었습니다.', f: () => F('공작령 등기소 런디니움 사망 등기, 1098년 10월') },
  londinium_escape: { label: '런디니움 탈출 실패', t: (p) => p.age + '세에 런디니움을 벗어나려다 세상을 떠났습니다. 성문까지 삼백 걸음이었습니다.', f: () => F('공작령 등기소 런디니움 봉쇄 기록') },
  hillock_1098: { label: '힐록 참사', t: (p) => p.age + '세에 힐록 참사로 세상을 떠났습니다. 1098년 1월 2일이었습니다.', f: () => F('성당 호적부 힐록 교구 사망 등기') },
  kazimierz_1094: { label: '수도 엔진 테러', t: (p) => p.age + '세에 카봐렐리엘키 엔진 테러로 세상을 떠났습니다. 메이저 중계 중이었습니다.', f: () => F('감정회 23회 메이저 사고 보고서') },
  wolumonde_1097: { label: '월루몽드 봉기', t: (p) => p.age + '세에 월루몽드 봉기로 세상을 떠났습니다. 마을은 그해 가을 지도에서 지워졌습니다.', f: () => F('궁정 기록국 월루몽드 폐쇄 공고, 1097년') },
  kjerag_1101: { label: '쉐라그 첫 재앙', t: (p) => p.age + '세에 쉐라그 첫 재앙으로 세상을 떠났습니다. 한 번도 온 적 없던 것이 왔습니다.', f: () => F('삼족 공의회 등기소 재앙 기록, 1101년 12월') },
  laterano_1101: { label: '라테라노 사변', t: (p) => p.age + '세에 라테라노 사변 중에 세상을 떠났습니다. 종은 울리지 않았습니다.', f: () => F('공증소 사변 사망 등기, 1101년') },
  far_north_1101: { label: '극북 반란', t: (p) => p.age + '세에 극북 반란으로 세상을 떠났습니다. 라디오는 "우르수스가 우리를 버렸다"고 했습니다.', f: () => F('제국 내무성 극북 진압 기록, 1101년') },
  uprising: { label: '봉기', t: (p) => p.age + '세에 봉기 중에 세상을 떠났습니다. 깃발은 이틀을 버텼습니다.', f: (p) => F(p.org + ' 소요 사망 집계') },
  evac_fail: { label: '피난 중 사고', t: (p) => p.age + '세에 피난길에서 세상을 떠났습니다. 길은 하나였고 사람은 많았습니다.', f: () => F('재앙 정보 전달자 협회 대피 경로 사후 보고') },
  dossoles_1101: { label: '도솔레스 소요', t: (p) => p.age + '세에 도솔레스 소요로 세상을 떠났습니다. 인공 바다 옆이었습니다.', f: (p) => F((p.faction || '도솔레스 시정') + ' 등기소 도솔레스 사망 집계, 1101년') },
  iberia_silence2: { label: '두 번째 고요함', t: (p) => p.age + '세에 두 번째 고요함 속에서 세상을 떠났습니다. 등대는 꺼져 있었습니다.', f: () => F('재판소 해안 사망 등기') },
  kazdel_war2: { label: '카즈델 내전 재발', t: (p) => p.age + '세에 다시 시작된 내전으로 세상을 떠났습니다. 카즈델에서 평화는 휴전의 다른 이름이었습니다.', f: () => F('용병 등록부 전시 기록') },
};

// ────────────────────────────────────────────────────────────────────────────
// 장례 관습. 국가 root id 로 찾되 감염자·로도스·이동도시는 riteOf() 가 먼저 본다.
//   faith     신앙·의지처 이름(노년 신앙 이벤트가 쓴다)
//   place     기도·추모 장소
//   line(p)   장례 한 줄
//   f(p)      각주
//   mourning  상복·상징
//   prayer    짧은 기원 문구(노년 이벤트·사망 기록 공용)
// ────────────────────────────────────────────────────────────────────────────
export const RITES = {
  yan: { faith: '조상과 하늘', place: '사당', mourning: '흰 상복',
    line: (p) => '흰 상복을 입은 자손이 ' + (p.kids ? p.kids + '명' : '없어 이웃이 대신') + ' 상을 치렀습니다. 향이 사흘 동안 꺼지지 않았고, 위패는 사당 구석 자리에 올랐습니다.',
    f: () => F('흠천감 역법에 따른 장일(葬日) 선정 기록'), prayer: '조상이 길을 아시기를.' },
  lungmen: { faith: '조상', place: '납골당', mourning: '흰 꽃',
    line: (p) => '화장한 뒤 납골당 ' + (p.cul.address === '선생' && p.kids >= 2 ? '위쪽' : '아래쪽') + ' 칸에 모셨습니다. 근위국 호적과가 사망 등기 도장을 찍는 데 일주일이 걸렸습니다.',
    f: () => F('근위국 호적과 사망 등기 및 납골당 배정 통지'), prayer: '다음 생에는 상층부에서.' },
  higashi: { faith: '조상과 신사', place: '절', mourning: '검은 옷',
    line: (p) => '절에서 계명(戒名)을 받았습니다. 글자 수가 값이었고, 가족은 ' + (p.kids ? '형편껏' : '가장 짧은 것으로') + ' 골랐습니다. 유골은 가문 묘에 들어갔습니다.',
    f: () => F('호적대장소 사망 신고 및 계명 등록'), prayer: '좋은 곳으로 가시기를.' },
  ursus: { faith: '성상과 황제', place: '교회', mourning: '검은 머릿수건',
    line: (p) => '성상 앞에 촛불을 켜고 사흘 뒤 땅에 묻었습니다. 겨울이면 땅이 얼어 봄까지 창고에 두는 일도 흔했습니다. 사십 일째 되는 날 ' + eul(p.cul.food || '흑빵') + ' 나눴습니다.',
    f: () => F('제국 내무성 사망 등기, 교구 매장 허가 첨부'), prayer: '황제와 성인들이 지켜 주시기를.' },
  sami: { faith: '숲과 룬', place: '제단', mourning: '순록 가죽',
    line: () => '숲으로 돌려보냈습니다. 눈의 사제가 룬을 새긴 나무판을 세웠고, 장로들은 이름을 세 번 부른 뒤 다시는 부르지 않았습니다.',
    f: () => F('사제단 룬 기록, 귀환 의식 편'), prayer: '숲이 받아 주시기를.' },
  kjerag: { faith: '산신', place: '설산 제단', mourning: '흰 모직 띠',
    line: () => '산신의 사제가 설산 쪽을 향해 기도했습니다. 돌을 쌓아 무덤을 만들었고, 가주 어르신이 첫 돌을 올렸습니다. 눈이 오면 무덤은 봄까지 보이지 않습니다.',
    f: () => F('삼족 공의회 등기소 매장 등기'), prayer: '산이 지켜 주시기를.' },
  leithanien: { faith: '옛 성가', place: '옛 성당', mourning: '검은 장갑',
    line: (p) => '진혼곡이 연주되었습니다. ' + (p.kids >= 2 ? '궁정 음악가를 불렀고' : '동네 합주단이 맡았고') + ', 마지막 음이 끝나기 전에는 아무도 자리를 뜨지 않았습니다.',
    f: () => F('궁정 기록국 장례 음악 허가 대장'), prayer: '마지막 음이 길기를.' },
  victoria: { faith: '교회', place: '교구 교회', mourning: '검은 상장(喪章)',
    line: (p) => '교구 교회 묘지에 묻혔습니다. 장례 행렬에 ' + (p.kids ? '자손과 ' : '') + '이웃이 따랐고, 돌아와서는 홍차와 파이를 냈습니다. 공작령 등기소는 묘지 사용료 영수증을 함께 보관합니다.',
    f: () => F('공작령 등기소 사망 등기, 묘지 사용 허가'), prayer: '평안히 쉬시기를.' },
  tara: { faith: '성당과 옛 신앙', place: '성당', mourning: '검은 숄',
    line: () => '밤새 경야(經夜)를 지냈습니다. 흑맥주가 돌았고, 노래와 울음이 번갈아 났습니다. 성당 묘지에 묻은 뒤 사윈이 오면 문 앞에 불을 켭니다.',
    f: () => F('성당 호적부 사망 등기'), prayer: '길이 평탄하기를.' },
  kazimierz: { faith: '기사의 명예', place: '챔피언 홀', mourning: '기사단 문장 리본',
    line: (p) => '추모제가 열렸습니다. ' + (p.kids ? '가족이' : '이웃이') + ' 비용을 댔고, 명판 아래 작은 글씨로 스폰서 이름이 들어갔습니다. 없으면 명판도 작았습니다.',
    f: () => F('감정회 연감 추모제 편'), prayer: '마지막 경기도 명예롭기를.' },
  columbia: { faith: '교회와 보험', place: '교회', mourning: '검은 정장',
    line: (p) => '장례 보험이 ' + (p.kids >= 1 ? '있어' : '없어') + ' 장례식장 등급이 정해졌습니다. 보험협회는 사망 통지서를 받은 지 열흘 만에 잔여 보험금 안내서를 보냈습니다.',
    f: () => F('보험협회 사망 보험금 지급 명세'), prayer: '좋은 곳으로.' },
  siracusa: { faith: '늑대 어머니', place: '가족 묘', mourning: '검은 베일',
    line: () => '가족 묘에 묻혔습니다. 장례에 어느 패밀리 사람이 왔고 어느 패밀리 사람이 오지 않았는지를 동네는 한 달 동안 이야기했습니다.',
    f: () => F('시청(패밀리 승인) 사망 등기'), prayer: '늑대 어머니의 품으로.' },
  laterano: { faith: '법과 빛', place: '성당', mourning: '흰 옷',
    line: (p) => '성당에서 공증인이 사망을 공증했습니다. ' + (p.race && p.race.id === 'sankta' ? '후광이 꺼진 자리에 흰 천을 덮었고, 이웃들은 말없이 슬픔을 나눴습니다.' : '비산크타 구역 묘지에 묻혔고, 종은 한 번만 울렸습니다.'),
    f: () => F('공증소 사망 공증서'), prayer: '빛이 함께하기를.' },
  iberia: { faith: '등대와 성당', place: '등대 아래 성당', mourning: '검은 숄',
    line: () => '바다를 등지고 묻혔습니다. 재판소 서기가 사인을 확인한 뒤에야 매장이 허락되었습니다. 등대 쪽을 향한 묘는 이 땅에서 허락되지 않습니다.',
    f: () => F('재판소 사망 등기 및 매장 허가'), prayer: '등대가 꺼지지 않기를.' },
  aegir: { faith: '바다', place: '조류 제단', mourning: '발광 해초',
    line: () => '바다로 돌려보냈습니다. 집정관 기록원이 이름을 지웠고, 발광 해초 하나를 조류에 띄웠습니다. 시신이 깊은 곳으로 가지 않도록 끈을 묶는 것이 규정입니다.',
    f: () => F('집정관 기록원 귀해(歸海) 등기'), prayer: '물결이 고요하기를.' },
  minos: { faith: '신전과 영웅', place: '신전', mourning: '올리브 가지',
    line: () => '신전 사제가 영웅 찬가의 한 절을 읊었습니다. 올리브 가지를 관 위에 얹었고, 양젖 치즈와 포도주로 조문객을 대접했습니다.',
    f: () => F('신전 서기관 사망 기록'), prayer: '영웅들 곁으로.' },
  sargon: { faith: '파디샤와 조상', place: '오아시스 묘역', mourning: '흰 천',
    line: () => '해가 지기 전에 묻었습니다. 셰이크가 짧게 기도했고, 묘 위에는 아무것도 세우지 않았습니다. 바람이 사흘이면 자리를 지웁니다.',
    f: () => F('파디샤 궁정 서기국 아미르령 사망 보고'), prayer: '그늘이 함께하기를.' },
  bolivar: { faith: '성모', place: '성당', mourning: '검은 리본',
    line: (p) => '성모 행렬이 지나는 길가에 묻혔습니다. 사망 증명서는 ' + (p.faction || '세 정부 중 가까운 쪽') + ' 등기소에서 받았고, 다른 두 정부 쪽에서는 아직 살아 있는 사람입니다.',
    f: (p) => F((p.faction || '가까운 정부') + ' 등기소 사망 등기'), prayer: '성모께서 거두시기를.' },
  rim: { faith: '없음', place: '광산 묘지', mourning: '작업모',
    line: () => '광산 묘지에 묻혔습니다. 광업연합 인사부가 보상 항목표를 보냈고, 해당 없음에 전부 표시가 되어 있었습니다. 동료들이 맥주 한 캔을 묘 위에 두었습니다.',
    f: () => F('광업연합 인사부 사망 처리 통지'), prayer: '갱도에서 보자.' },
  kazdel: { faith: '조상의 혼', place: '검은 행렬', mourning: '검은 두건',
    line: () => '검은 행렬이 지나갔습니다. 살카즈는 울지 않는 대신 이름을 외웁니다. 용병 등록부에서 이름이 지워졌고, 계약 잔금은 유족에게 가지 않았습니다.',
    f: () => F('용병 등록부 말소 기록'), prayer: '아직 살아 있군, 이라고 더는 말하지 못합니다.' },
  durin: { faith: '공동체', place: '돔 광장', mourning: '없음',
    line: () => '작별 단장식을 했습니다. 이웃들이 집을 깨끗이 닦고 칠했고, 벌꿀주 한 잔을 바닥에 부었습니다. 돔 공동체 기록소는 투표 없이 이름을 옮겨 적었습니다.',
    f: () => F('돔 공동체 기록소 주민 명부 이전 기록'), prayer: '한 잔 하고 가셨습니까.' },
  nomadic: { faith: '없음', place: '무덤길', mourning: '이름판',
    line: () => '이동도시는 무덤을 싣고 다니지 않습니다. 유해는 다음 정박지의 땅에 묻었고, 플레이트 가장자리 무덤길(Tombway)에 이름판 하나를 걸었습니다. 도시가 떠나면 무덤은 좌표로만 남습니다.',
    f: () => F('이동도시 운행 관리국 무덤길 명판 등록'), prayer: '다음 좌표에서.' },
  rhodes: { faith: '없음', place: '본함 추모 벽', mourning: '없음',
    line: () => '로도스 아일랜드 본함 추모 벽에 이름이 새겨졌습니다. 의료부가 마지막 수치를 기록했고, 동료들이 한 줄씩 적어 넣었습니다.',
    f: () => F('로도스 아일랜드 의료부 임종 기록'), prayer: '내일 보자.' },
  infected: { faith: '없음', place: '감염자 구역', mourning: '없음',
    line: (p) => '감염자 규정에 따라 처리되었습니다. ' + (p.nationId === 'ursus' ? '묘는 없고, 제국 내무성 명부에 번호만 남았습니다.' : p.nationId === 'laterano' ? '시신은 도시 밖으로 옮겨졌고, 공증소는 사망 공증서를 발급하지 않았습니다.' : '가족은 유골만 받았고, 장례는 허락되지 않았습니다.'),
    f: (p) => F(p.org + ' 감염자 사망 처리 규정'), prayer: '결정이 더는 자라지 않기를.' },
};

/** 현재 생에 맞는 장례 관습. 로도스 > 감염자(박해·격리·안락사국) > 이동도시 > 사망지 국가 순 */
export function riteOf(sim) {
  const p = params(sim);
  const nation = sim.data.nationById[p.nationId] || sim.nation;
  const policy = typeof nation.policy === 'string' ? nation.policy : 'ignore';
  if (p.rhodes) return RITES.rhodes;
  if (p.known && ['persecute', 'euthanasia', 'expel', 'quarantine'].includes(policy) && p.cause !== 'suicide') return RITES.infected;
  if (p.nomadic) return RITES.nomadic;
  return RITES[p.nationId] || RITES[p.rootId] || RITES.yan;   // 하위 지역(타라·용문)은 자기 관습이 먼저
}

/** UI 가 한 번에 가져다 쓰는 묶음 */
export function deathTexts(sim) {
  const p = params(sim);
  const c = CAUSE_TEXT[p.cause] || EXTRA_CAUSES[p.cause];
  const rite = riteOf(sim);
  const line = c ? c.t(p) : p.age + '세에 ' + ro(p.label) + ' 세상을 떠났습니다.';
  const f = c ? c.f(p) : F(p.org + ' 사망 등기');
  return { line, f, rite: rite.line(p), riteF: rite.f(p), prayer: rite.prayer, note: c && c.note ? c.note : null };
}

export default { CAUSE_TEXT, EXTRA_CAUSES, RITES, params, riteOf, deathTexts };
