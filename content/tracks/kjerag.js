// W9c 쉐라그 진로 콘텐츠. 진로 id·단계 id 는 data/tracks/kjerag.json. 태그는 track:<ID>:<stageId>.
// 핵심 5: KJE_KT(카란 무역, A10) · KJE_CLAN(가문 가신) · KJE_GUIDE(등반 길잡이) · KJE_MINE(광부) · KJE_COURT(만주원). 나머지: EXILE · FACTORY · FOREST · SCHOLAR · TOUR · PARL.
// 시대 분기: 1090 카란 무역·국경 개방 / 1097.12 설산 사변·개방 선언(bigevents kjerag_1097) / 1101.12 첫 재앙(bigevents kjerag_1101) — 여기서는 전후만 가른다.
import { orgF, F, fest, cul, medX, lifeRoll, once, eul, iga, eun, wa, ro, rago } from '../_util.js';
import { E, T, TR, AF, fresh, stageYears, fell, affIs, affName, standing, trStage, openSwitch, canonOk, canonSeen, marryDecision, homeDecision } from './_w9c_util.js';
import { hoist } from '../_dispatch.js';

const N = 'kjerag';
const KT = 'KJE_KT', CLAN = 'KJE_CLAN', GUI = 'KJE_GUIDE', MINE = 'KJE_MINE', COURT = 'KJE_COURT';
const EXI = 'KJE_EXILE', FAC = 'KJE_FACTORY', FOR = 'KJE_FOREST', SCH = 'KJE_SCHOLAR', TOUR = 'KJE_TOUR', PARL = 'KJE_PARL';
const open = (s) => s.year >= 1098;          // 설산 사변 뒤 개방
const closed = (s) => s.year < 1090;         // 카란 무역 전, 국경 닫힘
const after1101 = (s) => s.year >= 1102;
const clanName = (s) => (s.aff ? s.aff.name : '가문');

export const events = [
  // ═══════════════════════════════════════ KJE_KT 무역회사 집행원 (핵심, A10; W15: 카란 무역은 소속 0.8) ═══════════════════════════════════════
  E('kje_kt_exe_ledger', [18, 60], T(KT, 'executor'), 30, 2, { t: '치즈와 광석의 장부를 맞췄습니다. 산 아래로 내려가는 것과 산 위로 올라오는 것이 처음으로 같은 종이에 적혔습니다.', fx: { cap: { learn: 0.03 }, standing: 2 }, f: (s) => F('카란 무역 연간 교역 보고, 광석 1만 톤') }),
  E('kje_kt_exe_train', [18, 60], T(KT, 'executor'), 25, 3, { t: '열차 적재를 감독했습니다. 상자 하나가 모자랐고, 모자란 상자는 끝내 나오지 않았습니다. 보고서에는 "오차"라고 썼습니다.', k: 'note', fx: { h: -1 } }),
  E('kje_kt_exe_foreign', [18, 60], T(KT, 'executor'), 25, 3, (s) => ({ t: open(s) ? '외국 전문가가 부서에 들어왔습니다. 그는 쉐라그 말을 못 했고, 숫자는 양쪽이 같았습니다.' : '외국 회사 서신을 번역했습니다. 국경은 닫혀 있었고, 서신만 넘어왔습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),
  E('kje_kt_aff_small', [18, 62], ['aff:KJE_KT_SMALL'], 25, 3, { t: '소상단 사무실은 투리쿰 역 뒤 2층이었습니다. 장부는 손으로 썼고, 카란 무역 가격표를 벽에 붙여 두고 그보다 조금 싸게 팔았습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }),
  E('kje_kt_exe_frank', [18, 60], T(KT, 'executor'), 20, 3, { t: '월급이 프랑으로 나왔습니다. 영지 마을에서는 아직 프랑을 세는 사람이 드물었습니다.', k: 'note', fx: { money: (s) => medX(s, 0.04) }, f: (s) => F('카란 무역 급여 대장, 집행원 1급 월 220프랑') }),
  E('kje_kt_man_budget', [21, 62], T(KT, 'manager'), 30, 2, { t: '부서 예산을 짰습니다. 광산 쪽 숫자가 늘 가장 컸고, 그 숫자를 줄이자는 말은 아무도 하지 않았습니다.', fx: { standing: 3 }, f: (s) => F('카란 무역 부서 예산안, 광산 부문 6할') }),
  E('kje_kt_man_fire', [21, 62], T(KT, 'manager'), 25, 3, { t: '집행원 하나를 내보냈습니다. 서류상 이유는 "부서 조정"이었습니다. 그는 이유를 묻지 않았습니다.', k: 'bad', fx: { h: -2, standing: 1 } }),
  E('kje_kt_man_mine', [21, 62], T(KT, 'manager'), 20, 3, { t: '성산 아래 채굴 보고서가 올라왔습니다. 좌표가 만주원 경계 안이었습니다. 보고서는 윗선으로 갔고, 돌아오지 않았습니다.', k: 'note', fx: { h: -1 } }),
  E('kje_kt_man_victoria', [21, 62], T(KT, 'manager'), 20, 4, { t: '빅토리아 쪽 회사가 광산 지분을 물었습니다. 답은 윗선이 했고, 당신은 자리에 앉아 있었습니다.', k: 'note' }),
  E('kje_kt_exe2_vote', [26, 65], T(KT, 'exec'), 30, 2, { t: '이사회에서 처음 손을 들었습니다. 의결권 하나였고, 결과는 손 들기 전에 정해져 있었습니다.', fx: { standing: 2 } }),
  E('kje_kt_exe2_accident', [26, 65], T(KT, 'exec'), 25, 3, { t: '광산 사고 보상안에 서명했습니다. 액수는 등기소 기준의 두 배였고, 그래도 적다는 말이 영지에서 올라왔습니다.', k: 'bad', fx: { h: -2 }, f: (s) => F('카란 무역 산업재해 보상 규정, 등기소 기준 2배') }),
  E('kje_kt_exe2_noble', [26, 65], T(KT, 'exec'), 20, 3, (s) => ({ t: open(s) ? '귀족 가문 사람이 임원으로 들어왔습니다. 사변 뒤 바뀐 것 중 하나였습니다.' : '귀족 가문 사람은 회사에 들어오지 않았습니다. 들어올 필요가 없는 사람들이었습니다.', k: 'note' })),
  E('kje_kt_exe2_spy', [26, 65], T(KT, 'exec'), 15, 5, { t: '부서 하나가 통째로 조사를 받았습니다. 기업 정보가 국경 밖으로 나갔다고 했습니다. 당신 부서는 아니었습니다.', k: 'bad', fx: { h: -2 } }),
  E('kje_kt_cto_rail', [30, 68], T(KT, 'cto'), 30, 2, { t: '고산 철도 노선을 결재했습니다. 지도 위 선 하나가 마을 둘을 지웠고, 마을은 다른 곳에 다시 그려졌습니다.', fx: { standing: 3 }, f: (s) => F('고산 철도 노선 계획서, 연장 80킬로미터') }),
  E('kje_kt_cto_council', [30, 68], T(KT, 'cto'), 25, 3, { t: '삼족 공의회에 회사 대표로 섰습니다. 가주들은 당신 이름이 아니라 회사 이름을 불렀습니다.', k: 'note', fx: { standing: 2 } }),
  E('kje_kt_cto_press', [30, 68], T(KT, 'cto'), 20, 3, { t: '외국 신문이 회사를 "설산의 문지기"라고 썼습니다. 회장은 그 기사를 액자에 넣지 않았습니다.', k: 'note' }),
  E('kje_kt_cto_1101', [30, 68], T(KT, 'cto'), 200, 0, { t: '재앙 뒤 감염 사태를 회사가 맡았습니다. 치료 팀이 외국에서 왔고, 그들의 이름은 어디에도 적히지 않게 했습니다.', k: 'big', fx: { h: -3, standing: 3 } }, { c: after1101 }),
  E('kje_kt_cha_board', [35, 75], T(KT, 'chair'), 30, 2, { t: '이사회를 열었습니다. 열두 명이 앉았고, 당신이 말을 시작하기 전까지 아무도 말하지 않았습니다.', fx: { standing: 2 }, f: (s) => F('카란 무역 이사회 의사록, 이사 12인') }),
  E('kje_kt_cha_valley', [35, 75], T(KT, 'chair'), 25, 3, { t: '계곡 영지를 돌았습니다. 마을마다 회사 간판이 하나씩 있었고, 간판 밑에는 가문 문장이 있었습니다.', k: 'note' }),
  E('kje_kt_cha_resign', [35, 75], T(KT, 'chair'), 15, 5, { t: '사임 요구가 올라왔습니다. 산업재해와 외국 결탁 의혹이었습니다. 이번에는 넘겼습니다.', k: 'bad', fx: { h: -3, standing: -5 } }),
  E('kje_kt_cha_snow', [35, 75], T(KT, 'chair'), 20, 3, { t: '회장실 창에서 성산이 보였습니다. 매일 보았고, 매일 달랐습니다.', k: 'note', fx: { h: 1 } }),
  E('kje_kt_aff_snowdevil', [18, 70], ['aff:KJE_KT_SNOWDEVIL'], 25, 4, { t: '설산귀 훈련장은 지도에 없습니다. 거기서 받은 월급 명세서에는 부서명 대신 숫자만 있었습니다.', k: 'note', fx: { cap: { skill: 0.04 }, h: -1 } }),
  E('kje_kt_aff_dept', [18, 70], ['aff:KJE_KT_DEPT'], 15, 4, { t: '부서 회식은 치즈 국물과 설산 아래 포도주였습니다. 외국 전문가가 포도주 이름을 물었고, 아무도 몰랐습니다.', k: 'warm', fx: { h: 2 } }),
  E('kje_a10_eval', [18, 70], [N, 'archetype:A10'], 20, 3, { t: '연말 평가가 왔습니다. 칸이 다섯이었고, 네 칸이 보통이었습니다.', k: 'note', fx: { standing: 1 } }),
  E('kje_a10_overtime', [18, 70], [N, 'archetype:A10'], 20, 3, { t: '열차 운행표가 바뀌어 야근이 잦았습니다. 창밖은 늘 눈이었고, 눈은 시간을 알려 주지 않았습니다.', k: 'note', fx: { hl: -2, standing: 2 } }),
  TR('kje_kt_tr_manager', [20, 62], KT, 'manager', '매니저가 되었습니다. 부서 하나와 집행원 여섯이 당신 이름 아래 적혔습니다.'),
  TR('kje_kt_tr_exec', [25, 65], KT, 'exec', '임원이 되었습니다. 의결권이 생겼고, 회의실 자리가 창가로 옮겨졌습니다.', 'ev', { standing: 5 }),
  TR('kje_kt_tr_cto', [29, 68], KT, 'cto', '회사의 손이 되었습니다. 가주들이 당신을 부를 때 성이 아니라 직함으로 불렀습니다.', 'big', { standing: 6 }),
  TR('kje_kt_tr_chair', [34, 75], KT, 'chair', '회장이 되었습니다. 쉐라그에서 가주가 아닌 사람이 오를 수 있는 가장 높은 자리였습니다.', 'big', { standing: 10, h: 3 }),
  AF('kje_kt_af_layoff', N, KT, ['layoff'], '구조 조정 명단에 이름이 있었습니다. 상자 하나에 책상이 다 들어갔습니다.', 'loss', { h: -3 }),
  AF('kje_kt_af_arrest', N, KT, ['arrest'], '기업 정보 유출 혐의로 체포되었습니다. 유출한 적은 없었고, 그것을 증명할 서류도 없었습니다.', 'loss', { h: -4 }),
  AF('kje_kt_af_scandal', N, KT, ['scandal'], '외국 결탁 의혹에 이름이 올랐습니다. 사임서를 냈고, 회사는 그것을 받았습니다.', 'loss', { h: -4 }),

  // ═══════════════════════════════════════ KJE_CLAN 가문 가신 (핵심, A4 봉건) ═══════════════════════════════════════
  E('kje_cla_gua_post', [14, 50], T(CLAN, 'guard'), 30, 2, { t: '저택 바깥 초소에서 겨울을 났습니다. 교대는 네 시간마다였고, 네 시간은 눈 속에서 길었습니다.', fx: { hl: -2, standing: 2 }, f: (s) => F('가문 호위 근무 수칙, 교대 4시간') }),
  E('kje_cla_gua_rescue', [14, 50], T(CLAN, 'guard'), 25, 3, { t: '눈에 갇힌 마을 아이를 영주의 명으로 구했습니다. 아이는 그날부터 가문에 빚을 졌고, 당신도 그랬습니다.', k: 'warm', fx: { standing: 3, h: 2 } }),
  E('kje_cla_gua_scar', [14, 50], T(CLAN, 'guard'), 25, 3, { t: '몸의 상처 대부분은 야수가 아니라 사람에게서 얻었습니다. 그것이 호위병의 일이었습니다.', k: 'bad', fx: { hl: -3, cap: { skill: 0.04 } } }),
  E('kje_cla_gua_hunt', [14, 50], T(CLAN, 'guard'), 20, 3, (s) => ({ t: fest(s, 1) + '에 가문 깃발을 들고 따라갔습니다. 세 가문이 서로의 수확을 세었고, 당신 가문은 둘째였습니다.', k: 'note', fx: { standing: 1 } })),
  E('kje_cla_esc_road', [17, 55], T(CLAN, 'escort'), 30, 2, { t: '가문 사람을 산길로 호위했습니다. 눈사태 경보가 났고, 길을 바꿨습니다. 바꾼 길이 맞았습니다.', fx: { standing: 3, cap: { skill: 0.03 } } }),
  E('kje_cla_esc_silence', [17, 55], T(CLAN, 'escort'), 25, 3, { t: '호위하는 사람이 마차 안에서 한 말을 들었습니다. 듣지 않은 것으로 했습니다. 그것도 호위의 일이었습니다.', k: 'note', fx: { standing: 2 } }),
  E('kje_cla_esc_train', [17, 55], T(CLAN, 'escort'), 20, 4, (s) => ({ t: s.year >= 1082 ? '열차 사고 이야기가 돌았습니다. 사고가 아니었다는 말이 뒤에 붙었습니다. 가문 사람들은 그 이야기를 하지 않았습니다.' : '마차가 산길에서 미끄러졌습니다. 붙잡았고, 바퀴 하나를 잃었습니다.', k: 'bad', fx: { h: -1 } })),
  E('kje_cla_esc_hostage', [17, 55], T(CLAN, 'escort'), 15, 5, { t: '인질 구출에 나섰습니다. 돌아온 사람은 전부였고, 다친 사람은 절반이었습니다.', k: 'bad', fx: { hl: -4, standing: 5 } }),
  E('kje_cla_ste_schedule', [22, 60], T(CLAN, 'steward'), 30, 2, { t: '가주의 하루를 짰습니다. 누구를 먼저 만나는지가 영지의 순서였습니다.', fx: { standing: 3, cap: { ties: 0.03 } } }),
  E('kje_cla_ste_letter', [22, 60], T(CLAN, 'steward'), 25, 3, { t: '편지를 먼저 읽고 가주에게 올렸습니다. 올리지 않은 편지도 있었습니다. 그 판단은 당신 것이었습니다.', k: 'note', fx: { standing: 2, h: -1 } }),
  E('kje_cla_ste_kt', [22, 60], T(CLAN, 'steward'), 20, 4, (s) => ({ t: s.year >= 1090 ? '카란 무역 사람이 저택에 왔습니다. 가주는 그를 집사인 당신을 통해서만 만났습니다.' : '외국 상인이 저택 문을 두드렸습니다. 문은 열리지 않았고, 당신이 그 말을 전했습니다.', k: 'note', fx: { standing: 1 } })),
  E('kje_cla_ste_outsider', [22, 60], T(CLAN, 'steward'), 15, 5, { t: '가문 딸이 외지인과 혼인하겠다고 했습니다. 가주는 당신을 불러 어떻게 생각하느냐고 물었고, 대답은 저택 밖으로 나가지 않았습니다.', k: 'note', fx: { h: -1 } }),
  E('kje_cla_ret_land', [28, 65], T(CLAN, 'retainer'), 30, 2, { t: '영지 마을 하나를 맡았습니다. 눈 지붕 수리비를 가문 금고에서 냈고, 마을은 가문 이름을 지붕마다 새겼습니다.', fx: { standing: 3 }, f: (s) => orgF(s, '영지 마을 대장, 가구 60호') }),
  E('kje_cla_ret_council', [28, 65], T(CLAN, 'retainer'), 25, 3, { t: '삼족 공의회에 가주를 따라 들어갔습니다. 자리는 벽 쪽이었고, 벽 쪽에서 더 많이 들렸습니다.', k: 'note', fx: { cap: { ties: 0.03 } } }),
  E('kje_cla_ret_poison', [28, 65], T(CLAN, 'retainer'), 15, 5, { t: '잔 하나가 바뀌어 있었습니다. 마신 사람은 당신이 아니었습니다. 그날 밤 저택은 조용했고, 다음 날도 조용했습니다.', k: 'bad', fx: { h: -3 } }),
  E('kje_cla_ret_1097', [14, 65], 'track:' + CLAN, 200, 0, { t: '설산 사변 때 가문 마을 하나가 종속 협정을 깨려 했습니다. 가주의 명으로 올라갔고, 협정은 남았습니다.', k: 'big', fx: { standing: 4, h: -2 } }, { c: (s) => s.year === 1098 }),
  E('kje_cla_gen_command', [32, 70], T(CLAN, 'general'), 30, 2, { t: '가문 사병을 지휘했습니다. 수는 적었고, 눈 속에서는 수보다 길을 아는 쪽이 이겼습니다.', fx: { standing: 3 }, f: (s) => F('가문 사병 명부, 120명') }),
  E('kje_cla_gen_teach', [32, 70], T(CLAN, 'general'), 25, 3, { t: '신입 호위병의 자세를 고쳐 주었습니다. 춥지, 한마디만 했습니다. 당신도 그 말을 들었던 적이 있었습니다.', k: 'warm', fx: { h: 2 } }),
  E('kje_cla_gen_victoria', [14, 70], 'track:' + CLAN, 200, 0, { t: '빅토리아 군이 국경을 넘었습니다. 가문 사병이 고개에 섰고, 당신도 그 줄에 있었습니다. 그들은 한 달 뒤 돌아갔습니다. 싸움은 없었고, 그것이 전공이었습니다.', k: 'big', fx: { standing: 6, hl: -2 } }, { c: (s) => s.year === 1102 }),
  E('kje_cla_gen_old', [32, 70], T(CLAN, 'general'), 20, 3, { t: '가주가 당신 이름을 부르지 않고 "장군"이라고 불렀습니다. 그 호칭이 가문 안에서 당신의 자리였습니다.', k: 'note', fx: { standing: 2 } }),
  E('kje_cla_aff_silverash', [14, 70], ['aff:KJE_CLAN_SILVERASH'], 20, 4, { t: '실버애쉬 가문 저택에는 외국 책이 많았습니다. 호위병에게도 읽게 했고, 읽지 않으면 눈치가 보였습니다.', k: 'note', fx: { cap: { learn: 0.03 } } }),
  E('kje_cla_aff_paillosh', [14, 70], ['aff:KJE_CLAN_PAILLOSH'], 20, 4, { t: '페일로쉬 가문은 기도로 하루를 열었습니다. 호위병도 같이 무릎을 꿇었고, 무릎은 돌바닥에서 늘 시렸습니다.', k: 'note', fx: { hl: -1, standing: 1 } }),
  E('kje_cla_aff_browntail', [14, 70], ['aff:KJE_CLAN_BROWNTAIL'], 20, 4, { t: '브라운테일 가문은 손님이 많았습니다. 호위병의 일은 막는 것보다 안내하는 것이었습니다.', k: 'note', fx: { cap: { ties: 0.03 } } }),
  TR('kje_cla_tr_escort', [16, 55], CLAN, 'escort', '호위가 되었습니다. 초소 대신 마차 옆자리가 자리였습니다.'),
  TR('kje_cla_tr_steward', [20, 60], CLAN, 'steward', '집사가 되었습니다. 칼 대신 열쇠 꾸러미를 받았고, 열쇠가 더 무거웠습니다.', 'ev', { standing: 4 }),
  TR('kje_cla_tr_retainer', [26, 65], CLAN, 'retainer', '가신이 되었습니다. 가문 회의에 앉는 자리가 생겼고, 그 자리는 가주가 죽어도 남는 자리였습니다.', 'big', { standing: 6 }),
  TR('kje_cla_tr_general', [30, 70], CLAN, 'general', '장군이 되었습니다. 가문 사병의 수는 적었고, 그 수가 전부 당신 책임이었습니다.', 'big', { standing: 8 }),
  AF('kje_cla_af_kia', N, CLAN, ['kia'], '가문 일로 크게 다쳤습니다. 가주는 치료비를 댔고, 자리는 다른 사람이 받았습니다.', 'loss', { hl: -3 }),
  AF('kje_cla_af_betrayal', N, CLAN, ['betrayal'], '누명이었습니다. 누명이라는 것을 아는 사람도 있었지만, 가문은 절연을 택했습니다. 국경을 넘었습니다.', 'loss', { h: -5 }),
  AF('kje_cla_af_poison', N, CLAN, ['poison'], '잔에 든 것을 마셨습니다. 살아났고, 몸의 반은 그 전처럼 돌아오지 않았습니다. 누가 넣었는지는 가문이 알았고, 당신은 몰랐습니다.', 'loss', { hl: -6 }),

  // ═══════════════════════════════════════ KJE_GUIDE 설산 길잡이·짐꾼 (핵심, A11) ═══════════════════════════════════════
  E('kje_gui_por_load', [14, 50], T(GUI, 'porter'), 30, 2, { t: '등반대 짐을 졌습니다. 등에 진 무게보다 발밑 얼음이 먼저 느껴졌습니다.', fx: { hl: -1, cap: { skill: 0.03 } } }),
  E('kje_gui_por_rope', [14, 50], T(GUI, 'porter'), 25, 3, { t: '밧줄 매듭 여섯 가지를 배웠습니다. 틀린 매듭은 한 번만 틀릴 수 있다고 했습니다.', k: 'note', fx: { cap: { skill: 0.03 } }, f: (s) => F('융프라우 길잡이 수칙, 매듭 6종') }),
  E('kje_gui_por_tourist', [14, 50], T(GUI, 'porter'), 25, 3, (s) => ({ t: open(s) ? '관광객이 짐꾼 사진을 찍었습니다. 사진 값은 주지 않았고, 짐 값은 주었습니다.' : '등반객은 한 해에 몇 없었습니다. 짐꾼은 그보다 많았습니다.', k: 'note', fx: open(s) ? { money: medX(s, 0.02) } : {} })),
  E('kje_gui_por_fall', [14, 50], T(GUI, 'porter'), 20, 3, { t: '앞사람이 미끄러졌습니다. 밧줄이 잡았습니다. 매듭은 당신 것이었습니다.', k: 'warm', fx: { standing: 3 } }),
  E('kje_gui_gui_route', [17, 60], T(GUI, 'guide'), 30, 2, { t: '길을 정했습니다. 지도에는 두 길이 있었고, 당신은 세 번째 길로 갔습니다. 돌아와 지도에 그려 넣었습니다.', fx: { standing: 3 } }),
  E('kje_gui_gui_lost', [17, 60], T(GUI, 'guide'), 25, 3, { t: '등반객 하나가 실종되었습니다. 당신 팀이 아니었습니다. 수색에 나갔고, 봄에 찾았습니다.', k: 'loss', fx: { h: -3 } }),
  E('kje_gui_gui_sacred', [17, 60], T(GUI, 'guide'), 20, 3, { t: '성산 쪽 길은 안내하지 않습니다. 돈을 더 주겠다는 사람에게 그렇게 말했습니다. 그는 다른 길잡이를 찾았고, 찾지 못했습니다.', k: 'note', fx: { standing: 2 } }),
  E('kje_gui_gui_observatory', [17, 60], T(GUI, 'guide'), 20, 4, { t: '외국 연구소 사람들을 관측소 자리까지 올렸습니다. 기기가 사람보다 무거웠고, 값도 그랬습니다.', k: 'note', fx: { money: (s) => medX(s, 0.08) } }, { c: (s) => s.year >= 1100 }),
  E('kje_gui_per_office', [20, 65], T(GUI, 'permit'), 30, 2, { t: '허가 서류를 대신 넣었습니다. 등기소 창구 사람이 당신 얼굴을 알았고, 얼굴이 도장보다 빨랐습니다.', fx: { standing: 2, money: (s) => medX(s, 0.05) } }),
  E('kje_gui_per_refuse', [20, 65], T(GUI, 'permit'), 25, 3, { t: '허가가 안 나는 사람에게 안 난다고 말했습니다. 그는 산 밑에서 사흘을 기다리다 돌아갔습니다.', k: 'note' }),
  E('kje_gui_per_season', [20, 65], T(GUI, 'permit'), 20, 3, { t: '등반 철이 끝났습니다. 올해 허가는 마흔 건, 돌아오지 않은 사람은 하나였습니다.', k: 'note', fx: { h: -1 }, f: (s) => orgF(s, '융프라우 등반 허가 대장') }),
  E('kje_gui_per_cable', [20, 65], T(GUI, 'permit'), 15, 4, { t: '케이블카가 생겼습니다. 짐꾼 일이 반으로 줄었고, 허가 일은 두 배가 되었습니다.', k: 'note', fx: { money: (s) => medX(s, 0.05) } }, { c: open }),
  E('kje_gui_aff_jungfrau', [14, 65], ['aff:KJE_GUI_JUNGFRAU'], 20, 4, { t: '융프라우 허가제는 실종 하나마다 조항이 하나씩 늘었습니다. 조항을 전부 외우는 사람은 길잡이뿐이었습니다.', k: 'note' }),
  TR('kje_gui_tr_guide', [16, 60], GUI, 'guide', '길잡이가 되었습니다. 앞에 서는 사람이 되었고, 앞에 선 사람은 뒤를 자주 돌아봐야 했습니다.'),
  TR('kje_gui_tr_permit', [19, 65], GUI, 'permit', '등반 허가를 중개하게 되었습니다. 산에 오르는 날보다 등기소에 가는 날이 많아졌습니다.', 'ev', { standing: 4 }),
  AF('kje_gui_af_avalanche', N, GUI, ['avalanche', 'disappear'], '눈사태에 묻혔다가 파내졌습니다. 숨은 있었고, 다리는 그 전 같지 않았습니다.', 'loss', { hl: -5 }),
  AF('kje_gui_af_ruin', N, GUI, ['ruin'], '등반객이 돌아오지 않았습니다. 당신 길이었습니다. 허가 대장에서 이름이 지워졌습니다.', 'loss', { h: -4 }),

  // ═══════════════════════════════════════ KJE_MINE 산악 광부 (핵심, A5 자발) ═══════════════════════════════════════
  E('kje_min_han_cart', [14, 50], T(MINE, 'hand'), 30, 2, { t: '광차를 밀었습니다. 갱도는 산 안쪽으로 내려갔고, 내려갈수록 따뜻했습니다. 그 따뜻함이 싫었습니다.', fx: { hl: -2 } }),
  E('kje_min_han_lamp', [14, 50], T(MINE, 'hand'), 25, 3, { t: '등불 관리를 맡았습니다. 꺼지면 안 되는 것이 갱도에 하나 있다면 그것이었습니다.', k: 'note', fx: { cap: { skill: 0.02 } } }),
  E('kje_min_han_ice', [14, 50], T(MINE, 'hand'), 20, 3, { t: '고원 마을 아이들은 얼음 위에서 자랍니다. 당신도 그랬고, 이제 얼음 밑으로 내려갑니다.', k: 'note' }),
  E('kje_min_han_pay', [14, 50], T(MINE, 'hand'), 20, 3, { t: '첫 월급을 받았습니다. 반은 집에, 반은 장화에 들어갔습니다.', k: 'note', fx: { money: (s) => medX(s, 0.03) } }),
  E('kje_min_min_vein', [16, 60], T(MINE, 'miner'), 30, 2, { t: '광맥을 찾았습니다. 작업반이 한 달을 거기서 보냈고, 월급이 조금 올랐습니다.', fx: { money: (s) => medX(s, 0.06), standing: 3 }, f: (s) => F('페일로쉬 광산 채굴 일지, 월 300톤') }),
  E('kje_min_min_dust', [16, 60], T(MINE, 'miner'), 25, 2, { t: '가루가 폐까지 내려왔습니다. 기침은 봄에 멎었다가 겨울에 돌아왔습니다.', k: 'bad', fx: { hl: -3 } }),
  E('kje_min_min_scholar', [16, 60], T(MINE, 'miner'), 20, 4, (s) => ({ t: s.year >= 1090 ? '작업반 아이 하나가 장학금을 받아 외국으로 갔습니다. 광부의 딸이었습니다. 마을이 역까지 배웅했습니다.' : '작업반 아이 하나가 산 아래 학교에 갔습니다. 돌아올지는 아무도 몰랐습니다.', k: 'warm', fx: { h: 2 } })),
  E('kje_min_min_collapse', [16, 60], T(MINE, 'miner'), 20, 3, { t: '옆 갱도가 무너졌습니다. 당신 작업반은 아니었습니다. 사흘 동안 파냈고, 둘은 살아 있었습니다.', k: 'bad', fx: { h: -3, hl: -1 } }),
  E('kje_min_for_shift', [22, 65], T(MINE, 'foreman'), 30, 2, { t: '교대표를 짰습니다. 누가 밤에 들어가는지 정하는 것이 감독의 일이었고, 밤이 더 위험했습니다.', fx: { standing: 3 }, f: (s) => F('페일로쉬 광산 교대표, 3교대') }),
  E('kje_min_for_kt', [22, 65], T(MINE, 'foreman'), 25, 3, (s) => ({ t: s.year >= 1090 ? '카란 무역 사람이 생산량 표를 들고 왔습니다. 표의 숫자와 갱도의 숫자가 달랐고, 표가 이겼습니다.' : '가문 집사가 생산량을 물었습니다. 적게 말했고, 적게 말한 만큼 겨울이 수월했습니다.', k: 'note', fx: { h: -1 } })),
  E('kje_min_for_1101', [22, 65], T(MINE, 'foreman'), 200, 0, { t: '재앙 뒤 고원 광산이 가장 많이 다쳤습니다. 작업반 명단을 다시 썼고, 지운 이름이 쓴 이름보다 많았습니다.', k: 'big', fx: { h: -5 } }, { c: after1101 }),
  E('kje_min_for_safety', [22, 65], T(MINE, 'foreman'), 20, 3, { t: '안전 규정을 벽에 붙였습니다. 읽는 사람은 적었고, 지키는 사람은 더 적었습니다. 그래도 붙였습니다.', k: 'note', fx: { standing: 1 } }),
  E('kje_min_aff_paillosh', [14, 65], ['aff:KJE_MINE_PAILLOSH'], 20, 4, { t: '페일로쉬 고원 광산은 가문 기도로 교대를 시작합니다. 기도가 끝나면 등불을 켜고, 등불이 꺼지면 기도를 다시 합니다.', k: 'note' }),
  TR('kje_min_tr_miner', [15, 60], MINE, 'miner', '광부가 되었습니다. 광차 대신 곡괭이를 받았고, 월급은 두 배, 가루도 두 배였습니다.'),
  TR('kje_min_tr_foreman', [20, 65], MINE, 'foreman', '감독이 되었습니다. 갱도에 들어가는 날이 줄었고, 들어간 사람을 세는 날이 늘었습니다.', 'ev', { standing: 4 }),
  AF('kje_min_af_mine', N, MINE, ['mine'], '갱도가 무너졌습니다. 파내졌고, 다시 들어가지는 못했습니다.', 'loss', { hl: -5 }),
  AF('kje_min_af_avalanche', N, MINE, ['avalanche', 'catastrophe'], '산이 내려왔습니다. 갱도 입구가 막혔고, 안에 있던 사람 중 당신은 나온 쪽이었습니다.', 'loss', { hl: -4, h: -3 }),
  AF('kje_min_af_crystal', N, MINE, ['crystallize'], '손등에 결정이 올라왔습니다. 작업반은 모른 척했고, 감독은 다른 일을 주었습니다. 쉐라그에서는 그렇게 됩니다.', 'loss', { hl: -3 }),

  // ═══════════════════════════════════════ KJE_COURT 만주원 (핵심, A8) ═══════════════════════════════════════
  E('kje_cou_nov_prayer', [10, 50], T(COURT, 'novice'), 30, 2, { t: '새벽 기도를 올렸습니다. 돌바닥은 늘 같은 온도였고, 무릎은 그 온도를 기억했습니다.', fx: { cap: { learn: 0.03 }, hl: -1 } }),
  E('kje_cou_nov_scripture', [10, 50], T(COURT, 'novice'), 25, 3, { t: '경전을 베꼈습니다. 한 글자를 틀렸고, 장로는 그 장을 통째로 다시 쓰게 했습니다.', k: 'note', fx: { cap: { learn: 0.03 } }, f: (s) => F('만주원 필사 규정, 하루 12장') }),
  E('kje_cou_nov_maid', [10, 50], ['aff:KJE_COURT_MAIDS'], 25, 3, { t: '성녀의 복도를 닦았습니다. 성녀가 지나갈 때는 숨을 죽였고, 성녀는 창가의 눈을 보았습니다.', k: 'note', fx: { standing: 2 } }),
  E('kje_cou_nov_elder', [10, 50], ['aff:KJE_COURT_ELDERS'], 25, 3, { t: '장로단 회의 뒤 잔을 치웠습니다. 잔이 몇 개였는지, 누가 마시지 않았는지는 세지 않기로 했습니다.', k: 'note', fx: { h: -1 } }),
  E('kje_cou_nov_pilgrim', [10, 50], T(COURT, 'novice'), 20, 3, { t: '순례자들에게 치즈 국물을 나눴습니다. 그들은 산을 보러 왔고, 산은 그날 구름 속이었습니다.', k: 'warm', fx: { h: 1 } }),
  E('kje_cou_eld_council', [20, 70], T(COURT, 'elder'), 30, 2, { t: '장로단 회의에 앉았습니다. 대장로가 말하면 끝이었고, 그 전까지는 누가 먼저 말하느냐의 싸움이었습니다.', fx: { standing: 2, cap: { ties: 0.03 } }, f: (s) => F('만주원 장로단 명부, 장로 9인') }),
  E('kje_cou_eld_village', [20, 70], T(COURT, 'elder'), 25, 3, { t: '영지 마을 축일을 집전했습니다. 가문 가신이 뒤에 서 있었고, 둘 중 누구에게 먼저 인사하는지로 마을의 형편을 읽었습니다.', k: 'note', fx: { standing: 2 } }),
  E('kje_cou_eld_secret', [20, 70], T(COURT, 'elder'), 15, 5, { t: '역대 성녀에 관한 기록을 보았습니다. 보지 말아야 할 장이었습니다. 덮었고, 그날 밤 기도를 두 번 했습니다.', k: 'bad', fx: { h: -4 } }),
  E('kje_cou_eld_1101', [20, 70], T(COURT, 'elder'), 200, 0, { t: '산이 내려온 뒤 수도사 대부분이 좌천되었습니다. 만주원 복도가 반쯤 비었고, 남은 사람은 비운 사람의 몫을 했습니다.', k: 'big', fx: { h: -3, standing: -3 } }, { c: after1101 }),
  E('kje_cou_gra_decide', [30, 85], T(COURT, 'grand'), 30, 2, { t: '산의 뜻을 대신 말했습니다. 가주들이 들었고, 들은 대로 했습니다. 그 말이 정말 산의 것이었는지는 당신만 압니다.', fx: { standing: 3, h: -1 } }),
  E('kje_cou_gra_saint', [30, 85], T(COURT, 'grand'), 25, 3, (s) => ({ t: open(s) ? '성녀가 실권을 쥐었습니다. 만주원은 이제 상징이 되었고, 상징은 할 일이 적었습니다.' : '새 성녀를 세웠습니다. 상징이었고, 실권은 이 방에 있었습니다.', k: 'note', fx: open(s) ? { standing: -2 } : { standing: 3 } })),
  E('kje_cou_gra_secular', [30, 85], T(COURT, 'grand'), 20, 3, { t: '종교의 자유가 선포되었습니다. 만주원 문은 그대로 열려 있었고, 들어오는 사람은 줄었습니다.', k: 'note', fx: { h: -2 } }, { c: open }),
  E('kje_cou_gra_cup', [30, 85], T(COURT, 'grand'), 15, 5, { t: '잔을 바꿔 마시는 버릇이 생겼습니다. 아무도 그것을 이상하게 보지 않았습니다.', k: 'note', fx: { h: -1 } }),
  TR('kje_cou_tr_elder', [16, 70], COURT, 'elder', '장로가 되었습니다. 베끼던 경전을 이제 가르치게 되었고, 회의실 문이 열렸습니다.', 'ev', { standing: 4 }),
  TR('kje_cou_tr_grand', [28, 85], COURT, 'grand', '만주원의 꼭대기에 섰습니다. 산의 뜻을 전하는 자리였고, 산은 말이 없었습니다.', 'big', { standing: 8 }),
  AF('kje_cou_af_demotion', N, COURT, ['demotion'], '좌천되었습니다. 산 아래 작은 예배당으로 보내졌고, 거기서도 기도는 같았습니다.', 'loss', { h: -2 }),
  AF('kje_cou_af_poison', N, COURT, ['poison'], '잔에 든 것을 마셨습니다. 살아났고, 누가 따랐는지는 만주원이 조사하지 않았습니다.', 'loss', { hl: -6, h: -3 }),
  AF('kje_cou_af_arrest', N, COURT, ['arrest'], '투옥되었습니다. 죄목은 성녀를 이용했다는 것이었고, 이용한 사람은 따로 있었습니다.', 'loss', { h: -4 }),

  // ═══════════════════════════════════════ KJE_EXILE 추방자·국외 이주 (A11 순회) ═══════════════════════════════════════
  E('kje_exi_lea_border', [14, 55], T(EXI, 'leave'), 30, 2, { t: '국경을 넘었습니다. 뒤를 돌아보니 산은 그대로였고, 산만 그대로였습니다.', k: 'bad', fx: { h: -3 } }),
  E('kje_exi_lea_mother', [14, 55], T(EXI, 'leave'), 25, 3, { t: '어머니가 외지인이라는 이유였습니다. 가문은 이름을 거두었고, 이름 없이 떠났습니다.', k: 'loss', fx: { h: -3 } }),
  E('kje_exi_lab_shift', [15, 60], T(EXI, 'labor'), 30, 2, { t: '남의 나라 공장에서 교대 근무를 했습니다. 쉐라그 사람이라고 하면 치즈 이야기를 했고, 그게 전부였습니다.', fx: { hl: -2, money: (s) => medX(s, 0.03) }, f: (s) => F('외국인 노동 계약서, 주 60시간') }),
  E('kje_exi_lab_letter', [15, 60], T(EXI, 'labor'), 25, 3, { t: '산에서 편지가 왔습니다. 봉투에 가문 문장은 없었습니다. 그래도 왔습니다.', k: 'warm', fx: { h: 2 } }),
  E('kje_exi_set_home', [18, 70], T(EXI, 'settled'), 30, 2, { t: '타향에 집을 얻었습니다. 창에서 산이 보이지 않는 집이었고, 그것에 익숙해졌습니다.', k: 'note', fx: { h: 1 } }),
  E('kje_exi_set_news', [18, 70], T(EXI, 'settled'), 25, 3, (s) => ({ t: open(s) ? '쉐라그가 문을 열었다는 소식이 왔습니다. 돌아갈 수 있다는 말과 돌아갈 곳이 있다는 말은 달랐습니다.' : '쉐라그 소식은 거의 오지 않았습니다. 오지 않는 것이 소식이었습니다.', k: 'note', fx: { h: -1 } })),
  E('kje_exi_aff_chernobog', [14, 70], ['aff:KJE_EX_CHERNOBOG'], 20, 4, { t: '체르노보그에서는 쉐라그 사람이 드물었습니다. 드문 것은 눈에 띄었고, 눈에 띄는 것은 좋지 않았습니다.', k: 'note', fx: { h: -1 } }),
  E('kje_exi_aff_house', [14, 70], ['aff:KJE_EX_HOUSE'], 20, 4, { t: '몰락한 가문 이름을 꺼내지 않았습니다. 꺼내면 아는 사람이 있었고, 아는 사람은 늘 그쪽 편이었습니다.', k: 'note' }),
  E('kje_exi_visit_ursus', [14, 70], ['track:' + EXI, 'visit:ursus'], 25, 3, { t: '우르수스 공장 마을에 머물렀습니다. 산이 없는 겨울은 더 추웠습니다.', k: 'note', fx: { hl: -1 } }),
  E('kje_exi_visit_lei', [14, 70], ['track:' + EXI, 'visit:leithanien'], 25, 3, { t: '라이타니엔 도시에서 일했습니다. 아츠 적성을 묻는 서류가 있었고, 빈칸으로 냈습니다.', k: 'note', fx: { h: -1 } }),
  TR('kje_exi_tr_labor', [15, 60], EXI, 'labor', '남의 나라에서 일을 얻었습니다. 쉐라그 이름은 서류 한 칸에만 남았습니다.'),
  TR('kje_exi_tr_settled', [18, 70], EXI, 'settled', '타향에 정착했습니다. 돌아간다는 말을 더는 하지 않게 되었습니다.', 'ev', { h: 1 }),
  AF('kje_exi_af_ruin', N, EXI, ['ruin'], '일자리를 잃었습니다. 타향에서 잃은 일자리는 돌아갈 산이 없었습니다.', 'loss', { h: -3 }),
  AF('kje_exi_af_accident', N, EXI, ['accident'], '공장 사고를 당했습니다. 보상은 그 나라 기준이었고, 쉐라그 사람에게는 적용되지 않는 항목이 있었습니다.', 'loss', { hl: -4 }),

  // ═══════════════════════════════════════ KJE_FACTORY 투리쿰 공장·철도 (A11) ═══════════════════════════════════════
  E('kje_fac_wor_line', [15, 55], T(FAC, 'worker'), 30, 2, { t: '공장 선 앞에 섰습니다. 선은 쉬지 않았고, 사람은 교대했습니다.', fx: { hl: -1, cap: { skill: 0.03 } } }),
  E('kje_fac_wor_rail', [15, 55], ['aff:KJE_FAC_RAIL'], 25, 3, (s) => ({ t: open(s) ? '외국 열차가 들어왔습니다. 선로 폭이 달라 환승장을 새로 깔았고, 당신이 그 못을 박았습니다.' : '국경까지만 가는 열차를 탔습니다. 거기서 선로가 끝났습니다.', k: 'note', fx: { money: medX(s, 0.03) } })),
  E('kje_fac_ski_machine', [18, 60], T(FAC, 'skilled'), 30, 2, { t: '기계 하나를 혼자 맡았습니다. 기계는 당신 손을 알았고, 다른 손에는 멈췄습니다.', fx: { standing: 3, cap: { skill: 0.03 } } }),
  E('kje_fac_ski_invest', [18, 60], T(FAC, 'skilled'), 25, 3, { t: '외국 투자로 공장이 늘었습니다. 새 기계 설명서는 외국 글자였고, 숙련공이 먼저 읽는 법을 배웠습니다.', k: 'note', fx: { cap: { learn: 0.03 } } }, { c: open }),
  E('kje_fac_for_crew', [22, 65], T(FAC, 'foreman'), 30, 2, { t: '반을 맡았습니다. 열두 명이었고, 열두 명의 이름과 손버릇을 외웠습니다.', fx: { standing: 3 }, f: (s) => F('투리쿰 공장 작업반 명부, 12명') }),
  E('kje_fac_for_accident', [22, 65], T(FAC, 'foreman'), 20, 3, { t: '반원 하나가 기계에 손을 넣었습니다. 손은 돌아오지 않았고, 서류는 당신이 썼습니다.', k: 'bad', fx: { h: -3 } }),
  E('kje_fac_aff_turicum', [15, 65], ['aff:KJE_FAC_TURICUM'], 15, 4, { t: '투리쿰 공장 굴뚝은 쉐라그에서 유일한 굴뚝입니다. 산 위에서 보면 그것만 검었습니다.', k: 'note' }),
  TR('kje_fac_tr_skilled', [17, 60], FAC, 'skilled', '숙련공이 되었습니다. 기계 하나가 당신 이름으로 불렸습니다.'),
  TR('kje_fac_tr_foreman', [21, 65], FAC, 'foreman', '반장이 되었습니다. 선 앞 대신 선 뒤에 섰고, 뒤에서는 모든 손이 보였습니다.', 'ev', { standing: 4 }),
  AF('kje_fac_af_accident', N, FAC, ['accident'], '기계에 다쳤습니다. 공장은 보상했고, 자리는 비워 두지 않았습니다.', 'loss', { hl: -4 }),
  AF('kje_fac_af_layoff', N, FAC, ['layoff'], '공장이 사람을 줄였습니다. 외국 기계가 들어온 해였습니다.', 'loss', { h: -2 }),

  // ═══════════════════════════════════════ KJE_FOREST 숲 전령·마차 (A11 순회) ═══════════════════════════════════════
  E('kje_for_coa_road', [14, 55], T(FOR, 'coachman'), 30, 2, { t: '숲길로 마차를 몰았습니다. 길은 눈에 묻혔고, 말이 길을 기억했습니다.', fx: { cap: { skill: 0.03 } } }),
  E('kje_for_coa_stuck', [14, 55], T(FOR, 'coachman'), 25, 3, { t: '마차가 눈에 빠졌습니다. 밤을 숲에서 났고, 아침에 지나가던 전령이 끌어냈습니다.', k: 'bad', fx: { hl: -3 } }),
  E('kje_for_cou_letter', [17, 60], T(FOR, 'courier'), 30, 2, { t: '편지 자루를 지고 숲을 건넜습니다. 편지 하나에 겨울 하나가 걸리는 마을도 있었습니다.', fx: { standing: 3 }, f: (s) => F('브라운테일 영지 우편 기록, 월 2회 순회') }),
  E('kje_for_cou_news', [17, 60], T(FOR, 'courier'), 25, 3, (s) => ({ t: s.year >= 1098 ? '사변 소식을 숲 마을에 처음 전한 사람이 당신이었습니다. 마을은 사흘 뒤에야 그 뜻을 알았습니다.' : '산 너머 소식은 당신 입으로 들어갔습니다. 어떤 소식은 가는 길에 바뀌었습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  E('kje_for_sta_radio', [20, 65], T(FOR, 'station'), 30, 2, { t: '기지국에 앉았습니다. 편지 대신 신호였고, 신호는 눈에 빠지지 않았습니다.', fx: { cap: { learn: 0.03 } } }),
  E('kje_for_sta_five', [20, 65], T(FOR, 'station'), 25, 3, { t: '숲 영지 기지국은 다섯이었습니다. 다섯 중 하나가 당신이었고, 나머지 넷의 목소리를 매일 들었습니다.', k: 'note', fx: { h: 1 }, f: (s) => F('브라운테일 영지 통신 기지국 설치 기록, 5개소') }),
  E('kje_for_aff_browntail', [14, 65], ['aff:KJE_FOR_BROWNTAIL'], 15, 4, { t: '브라운테일 숲은 소식이 느린 곳입니다. 느린 소식은 오는 동안 조금 부드러워졌습니다.', k: 'note' }),
  E('kje_for_visit_self', [14, 65], ['track:' + FOR, 'visit:kjerag'], 20, 3, { t: '올해는 호수 쪽 마을 노선이었습니다. 호수는 얼었고, 마차는 그 위로 갔습니다.', k: 'note' }),
  TR('kje_for_tr_courier', [16, 60], FOR, 'courier', '전령이 되었습니다. 마차 대신 자루를 졌고, 자루가 더 멀리 갔습니다.'),
  TR('kje_for_tr_station', [19, 65], FOR, 'station', '기지국 직원이 되었습니다. 숲에 처음 생긴 자리였고, 당신이 처음 앉은 사람이었습니다.', 'ev', { standing: 4 }),
  AF('kje_for_af_freeze', N, FOR, ['freezing', 'avalanche'], '숲에서 눈에 갇혔습니다. 사흘 만에 발견되었고, 발은 반만 돌아왔습니다.', 'loss', { hl: -5 }),
  AF('kje_for_af_ruin', N, FOR, ['ruin'], '편지 자루 하나를 잃었습니다. 안에 가문 편지가 있었고, 그것으로 끝이었습니다.', 'loss', { h: -3 }),

  // ═══════════════════════════════════════ KJE_SCHOLAR 장학 유학생 (A9) ═══════════════════════════════════════
  E('kje_sch_abr_class', [16, 30], T(SCH, 'abroad'), 30, 2, { t: '외국 강의실에 앉았습니다. 설원 방어공학이라는 말을 처음 들었고, 설원은 당신이 더 잘 알았습니다.', fx: { cap: { learn: 0.05 } }, f: (s) => F('카란 무역 장학금 규정, 4년 전액') }),
  E('kje_sch_abr_homesick', [16, 30], T(SCH, 'abroad'), 25, 3, { t: '치즈 냄새가 나는 가게를 찾아 한 시간을 걸었습니다. 맛은 달랐습니다.', k: 'note', fx: { h: -1 } }),
  E('kje_sch_ret_station', [19, 40], T(SCH, 'return'), 30, 2, { t: '돌아왔습니다. 역에 마을 사람이 나와 있었고, 그 자리에서 오래 울었습니다.', k: 'warm', fx: { h: 3 } }),
  E('kje_sch_ret_job', [19, 40], T(SCH, 'return'), 25, 3, { t: '장학금 조건대로 회사에 들어갔습니다. 배운 것의 절반은 쓰였고, 절반은 서랍에 들어갔습니다.', k: 'note', fx: { standing: 2 } }),
  E('kje_sch_pro_observatory', [22, 65], T(SCH, 'professional'), 30, 2, { t: '관측소 기기를 맡았습니다. 기기는 산을 재었고, 산은 재어지는 것을 개의치 않았습니다.', fx: { standing: 3, cap: { learn: 0.03 } } }),
  E('kje_sch_pro_1101', [16, 65], 'track:' + SCH, 200, 0, { t: '관측소가 처음 보는 경보를 냈습니다. 경보는 맞았습니다. 맞은 것이 위로가 되지 않았습니다.', k: 'big', fx: { h: -4 } }, { c: (s) => s.year === 1102 }),
  E('kje_sch_aff_columbia', [16, 65], ['aff:KJE_SCH_COLUMBIA'], 15, 4, { t: '컬럼비아 유학생 모임에서 쉐라그 사람은 당신 하나였습니다. 치즈 퐁듀를 해 주었고, 다들 처음 먹었습니다.', k: 'warm', fx: { h: 1 } }),
  E('kje_sch_aff_rhine', [16, 65], ['aff:KJE_SCH_RHINE'], 15, 4, (s) => { s.S.flags.rhodes_legal = s.S.age; return { t: '라인 랩 관측소에 외부 의료 협력 문서가 왔습니다. 서명란에 로도스 아일랜드라는 이름이 있었습니다.', k: 'note' }; }),
  TR('kje_sch_tr_return', [18, 40], SCH, 'return', '학위를 들고 돌아왔습니다. 산은 그대로였고, 당신이 산을 보는 눈이 달라져 있었습니다.'),
  TR('kje_sch_tr_professional', [21, 65], SCH, 'professional', '전문직이 되었습니다. 쉐라그에서 그 일을 할 수 있는 사람이 손에 꼽혔습니다.', 'ev', { standing: 5 }),
  AF('kje_sch_af_ruin', N, SCH, ['ruin'], '장학금이 끊겼습니다. 학위 없이 돌아왔고, 역에는 아무도 없었습니다.', 'loss', { h: -4 }),
  AF('kje_sch_af_disappear', N, SCH, ['disappear'], '돌아오지 않기로 했습니다. 산은 편지에만 남았습니다.', 'loss', { h: -2 }),

  // ═══════════════════════════════════════ KJE_TOUR 관광업 1097~ (A10) ═══════════════════════════════════════
  E('kje_tou_sta_guest', [16, 55], T(TOUR, 'staff'), 30, 2, { t: '외국 손님이 산 이름을 물었습니다. 가르쳐 주었고, 그는 틀리게 발음했고, 당신은 고치지 않았습니다.', fx: { money: (s) => medX(s, 0.02) } }),
  E('kje_tou_sta_beast', [16, 55], ['aff:KJE_TOUR_BEAST'], 25, 3, { t: '버든비스트에 손님을 태웠습니다. 짐승은 손님보다 길을 잘 알았고, 손님은 그것을 몰랐습니다.', k: 'note', fx: { h: 1 } }),
  E('kje_tou_che_kitchen', [19, 60], T(TOUR, 'chef'), 30, 2, { t: '주방을 맡았습니다. 치즈 국물을 외국 손님 입맛에 맞췄고, 영지 사람들은 그 맛을 치즈 국물이라 부르지 않았습니다.', fx: { standing: 3 }, f: (s) => F('버든피크 호텔 주방 일지, 하루 200인분') }),
  E('kje_tou_che_spring', [19, 60], ['aff:KJE_TOUR_SPRING'], 25, 3, { t: '온천 손님이 겨울마다 늘었습니다. 눈 속에서 뜨거운 물에 들어가는 것이 그들에게는 처음이었습니다.', k: 'note', fx: { money: (s) => medX(s, 0.04) } }),
  E('kje_tou_dir_season', [23, 65], T(TOUR, 'director'), 30, 2, { t: '성수기 예약표를 봤습니다. 외국 글자 이름이 쉐라그 이름보다 많았습니다.', k: 'note', fx: { standing: 2 }, f: (s) => F('버든피크 호텔 겨울 예약 대장, 객실 40실') }),
  E('kje_tou_dir_1101', [23, 65], T(TOUR, 'director'), 200, 0, { t: '재앙 뒤 예약이 전부 취소되었습니다. 호텔은 그해 겨울 구호소가 되었고, 당신이 그 열쇠를 돌렸습니다.', k: 'big', fx: { h: -2, standing: 4 } }, { c: after1101 }),
  E('kje_tou_aff_cable', [16, 65], ['aff:KJE_TOUR_CABLE'], 15, 4, { t: '케이블카는 바람이 불면 멈춥니다. 멈춘 날은 손님에게 치즈 국물을 공짜로 냈습니다.', k: 'note' }),
  E('kje_tou_aff_burdenpeak', [16, 65], ['aff:KJE_TOUR_BURDENPEAK'], 15, 4, { t: '버든피크 호텔 연회장은 가문 결혼식에도 쓰였습니다. 그런 날은 호텔 직원 전부가 가문 하인이 되었습니다.', k: 'note', fx: { standing: 1 } }),
  TR('kje_tou_tr_chef', [18, 60], TOUR, 'chef', '주방장이 되었습니다. 외국 손님 입맛과 영지 사람 입맛 사이에 당신 국자가 있었습니다.'),
  TR('kje_tou_tr_director', [22, 65], TOUR, 'director', '지배인이 되었습니다. 산을 파는 일이었고, 산은 팔려도 줄지 않았습니다.', 'ev', { standing: 4 }),
  AF('kje_tou_af_close', N, TOUR, ['layoff', 'bankrupt', 'catastrophe'], '호텔이 문을 닫았습니다. 재앙 뒤 손님은 오지 않았고, 오지 않는 손님에게 줄 월급은 없었습니다.', 'loss', { h: -3 }),

  // ═══════════════════════════════════════ KJE_PARL 가문 정치·의회 (A3) ═══════════════════════════════════════
  E('kje_par_mem_table', [18, 60], T(PARL, 'member'), 30, 2, { t: '가문 식탁 끝자리에 앉았습니다. 말은 가주가 했고, 끝자리는 듣는 자리였습니다.', fx: { cap: { ties: 0.03 } } }),
  E('kje_par_mem_marriage', [18, 60], T(PARL, 'member'), 25, 3, { t: '혼담이 가문 사이에 오갔습니다. 당신 이름이 그 종이에 있었고, 당신 의견은 없었습니다.', k: 'note', fx: { h: -1 } }),
  E('kje_par_env_road', [22, 65], T(PARL, 'envoy'), 30, 2, { t: '다른 가문 저택에 사절로 갔습니다. 치즈 국물이 나왔고, 국물이 식기 전에 답을 들어야 했습니다.', fx: { standing: 3 } }),
  E('kje_par_env_abroad', [22, 65], T(PARL, 'envoy'), 25, 3, (s) => ({ t: s.year >= 1090 ? '외국에 사절로 갔습니다. 쉐라그를 아는 사람이 적었고, 치즈는 알았습니다.' : '국경 너머로는 가지 않았습니다. 가문 사절은 세 저택 사이만 오갔습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  E('kje_par_hea_decide', [30, 75], T(PARL, 'head'), 30, 2, { t: '가주로서 영지 일을 정했습니다. 광산 하나, 마을 둘, 사병 백 명이 당신 말로 움직였습니다.', fx: { standing: 3 }, f: (s) => orgF(s, '영지 등기, 광산 1·마을 2') }),
  E('kje_par_hea_1097', [18, 75], 'track:' + PARL, 200, 0, { t: '설산 사변의 자리에 있었습니다. 대장로가 죽었고, 개방을 선언하는 문서에 가문 인장이 찍혔습니다. 당신은 그 방에 있었습니다.', k: 'big', fx: { standing: 5, h: -2 } }, { c: (s) => s.year === 1098 }),
  E('kje_par_cou_vote', [35, 80], T(PARL, 'council'), 30, 2, (s) => ({ t: open(s) ? '쉐라그 의회에서 표결했습니다. 세 가문이 아니라 의원 수로 셌고, 그것이 사변 뒤 달라진 점이었습니다.' : '삼족 의회에 앉았습니다. 셋이 모이면 둘이 정했고, 하나는 들었습니다.', k: 'note', fx: { standing: 2 } })),
  E('kje_par_cou_victoria', [18, 80], 'track:' + PARL, 200, 0, { t: '빅토리아 침공 뒤 의회가 열렸습니다. 광산을 지키는 법을 두고 밤을 샜고, 아침에 결론은 "지킨다"였습니다.', k: 'big', fx: { h: -2, standing: 3 } }, { c: (s) => s.year === 1102 }),
  E('kje_par_aff_three', [18, 80], ['aff:KJE_PARL_THREE'], 15, 4, { t: '삼족 의회 회의장에는 의자가 셋뿐이었습니다. 나머지는 섰습니다.', k: 'note' }),
  E('kje_par_aff_new', [18, 80], ['aff:KJE_PARL_NEW'], 15, 4, { t: '새 의회 회의장에는 의자가 많아졌습니다. 앉는 사람도 많아졌고, 말은 길어졌습니다.', k: 'note' }),
  TR('kje_par_tr_envoy', [21, 65], PARL, 'envoy', '사절이 되었습니다. 가문의 말을 들고 다니는 사람이 되었고, 그 말은 당신 것이 아니었습니다.'),
  TR('kje_par_tr_head', [28, 75], PARL, 'head', '가주가 되었습니다. 회의장에 들어서자 사람들이 입을 다물었고, 그 침묵이 자리였습니다.', 'big', { standing: 8 }),
  TR('kje_par_tr_council', [33, 80], PARL, 'council', '의회에 앉았습니다. 나라의 일이 당신 손을 거쳤고, 손은 늘 셋 중 하나였습니다.', 'big', { standing: 5 }),
  AF('kje_par_af_betrayal', N, PARL, ['betrayal'], '가문이 등을 돌렸습니다. 절연이었습니다. 이름은 남았고, 그 이름으로 할 수 있는 일은 없었습니다.', 'loss', { h: -5 }),
  AF('kje_par_af_assassination', N, PARL, ['assassination'], '암살 시도가 있었습니다. 살았고, 사병 둘은 살지 못했습니다.', 'loss', { hl: -5, h: -3 }),
  AF('kje_par_af_purge', N, PARL, ['purge'], '숙청이었습니다. 가문 인장을 두고 국경을 넘었습니다.', 'loss', { h: -4 }),

  // ═══════════════════════════════════════ 계절·명절·동네 (생업 체감) ═══════════════════════════════════════
  E('kje_season_karlan', [10, 90], [N], 20, 8, (s) => ({ t: fest(s, 0) + ' 날 광장에 치즈 솥이 걸렸습니다. 산신상 앞에서 세 가문 깃발이 같은 높이로 섰고, 그것을 재는 사람이 꼭 있었습니다.', k: 'warm', fx: { h: 2 } })),
  E('kje_season_hunt', [10, 90], [N], 20, 8, (s) => ({ t: fest(s, 1) + ' 날 마을 남자들이 산으로 올라갔습니다. 돌아와 수확을 세었고, 세는 동안 여자들이 국물을 끓였습니다.', k: 'note', fx: { h: 1 } })),
  E('kje_season_faith', [10, 90], [N], 20, 8, { t: '산이 지켜 주시길. 인사가 그것이었고, 인사가 곧 기도였습니다. 눈사태 소식이 온 날은 그 말을 두 번 했습니다.', k: 'note' }),
  E('kje_season_thaw', [10, 90], [N], 20, 8, { t: '눈이 녹았습니다. 지붕에서 물이 떨어졌고, 겨울 동안 잃은 것을 세는 철이었습니다.', k: 'note', fx: { h: 1 } }),
  E('kje_season_tourist', [10, 90], [N], 20, 8, { t: '관광객이 마을을 지나갔습니다. 사진을 찍었고, 사진에 찍힌 집 주인은 집을 팔라는 편지를 받았습니다.', k: 'note', fx: { h: -1 } }, { c: open }),
  E('kje_season_closed', [3, 90], [N], 30, 3, { t: '국경은 닫혀 있었습니다. 산 너머 물건은 편지로만 왔고, 편지는 겨울 하나를 걸려 왔습니다.', k: 'note' }, { c: closed }),
  E('kje_season_train', [10, 90], [N], 20, 4, { t: '첫 외국 열차가 들어왔습니다. 마을 아이들이 선로 옆에 줄을 섰고, 열차는 멈추지 않고 지나갔습니다.', k: 'note', fx: { h: 1 } }, { c: (s) => s.year >= 1098 && s.year <= 1100 }),
  E('kje_season_cheese', [10, 90], [N], 15, 8, (s) => ({ t: cul(s).food + ' 냄비가 식탁 가운데 걸렸습니다. 겨울에 집에 손님이 오면 그것부터 올렸습니다.', k: 'warm', fx: { h: 1, hl: 1 } })),

  // ═══════════════════════════════════════ 캐논 인물(1회성, D43) ═══════════════════════════════════════
  E('kje_canon_silverash', [14, 90], [N], 40, 0, (s) => { canonSeen(s, 'silverash'); return { t: '가주가 회의장에 들어서자 열 명 넘는 사람이 동시에 입을 다물었습니다. 당신도 그중 하나였습니다.', k: 'note' }; }, { c: (s) => canonOk(s, 'silverash') && !!s.S.track && [KT, PARL, CLAN].includes(s.S.track.id) }),
  E('kje_canon_gulo', [14, 90], [N], 40, 0, (s) => { canonSeen(s, 'gulo'); return { t: '가문의 늙은 가신이 신입 호위병의 자세를 고쳐 주고는 춥지, 한마디만 남겼습니다. 그 신입이 당신이었습니다.', k: 'warm', fx: { h: 1 } }; }, { c: (s) => canonOk(s, 'gulo') && !!s.S.track && s.S.track.id === CLAN }),
  E('kje_canon_pramanix', [10, 90], [N], 40, 0, (s) => { canonSeen(s, 'pramanix'); return { t: '성녀가 지나가는 복도에서 시녀들이 숨을 죽였고, 성녀는 창가의 눈을 잠깐 쳐다보았습니다. 당신은 복도 끝에 서 있었습니다.', k: 'note' }; }, { c: (s) => canonOk(s, 'pramanix') && !!s.S.track && s.S.track.id === COURT }),
  E('kje_canon_gnosis', [18, 90], [N], 40, 0, (s) => { canonSeen(s, 'gnosis'); return { t: '회장실에서 나온 안경 쓴 남자가 복도의 집행원들 이름을 하나도 틀리지 않고 불렀습니다. 당신 이름도 있었습니다.', k: 'note', fx: { standing: 1 } }; }, { c: (s) => canonOk(s, 'gnosis') && !!s.S.track && s.S.track.id === KT }),
  E('kje_canon_aurora', [14, 90], [N], 40, 0, (s) => { canonSeen(s, 'aurora'); return { t: '장학금으로 유학 갔다 돌아온 광부의 딸이 고원 마을 어귀에 서서 오래 울었습니다. 멀리서 보았고, 다가가지 않았습니다.', k: 'note' }; }, { c: (s) => canonOk(s, 'aurora') && !!s.S.track && [MINE, SCH].includes(s.S.track.id) }),

  // ═══════════════════════════════════════ 이주·신참·관계·방문 ═══════════════════════════════════════
  E('kje_newcomer_papers', [10, 80], [N, 'newcomer'], 30, 2, { t: '등기소에서 서류를 냈습니다. 창구 사람은 외지인 칸에 표시했고, 그 칸은 나머지 칸보다 오래 걸렸습니다.', k: 'note', fx: { h: -1 }, f: (s) => orgF(s, '외지인 거주 등록, 심사 90일') }),
  E('kje_newcomer_cheese', [10, 80], [N, 'newcomer'], 30, 2, { t: '이웃이 치즈 국물을 들고 왔습니다. 외지인에게 그것을 주는 집은 드물었고, 그 집이 그 드문 집이었습니다.', k: 'warm', fx: { h: 2, cap: { ties: 0.03 } } }),
  E('kje_newcomer_faith', [10, 80], [N, 'newcomer'], 20, 3, { t: '산이 지켜 주시길. 그 인사를 따라 했고, 이웃이 처음으로 웃었습니다.', k: 'warm', fx: { h: 1 } }),
  E('kje_rel_outsider', [10, 80], [N, 'migrant', 'rel:neutral'], 20, 4, { t: '외지인이라는 말을 들었습니다. 보수파 쪽 마을에서는 그 말에 거리가 있었고, 투리쿰에서는 없었습니다.', k: 'note', fx: { h: -1 } }),
  E('kje_rel_subtle', [10, 80], [N, 'rel:subtle'], 20, 4, { t: '가문 집에 초대받지 못했습니다. 초대받은 사람이 있다는 것을 나중에 알았습니다.', k: 'note', fx: { h: -1 } }),
  E('kje_rel_sarkaz', [10, 80], [N, 'race:sarkaz'], 15, 5, { t: '뿔 때문에 묻는 사람이 없었습니다. 쉐라그는 그런 것을 묻지 않는 곳이었습니다.', k: 'warm', fx: { h: 1 } }),
  E('kje_visit_1', [10, 80], ['visit:kjerag'], 30, 3, (s) => ({ t: open(s) ? '쉐라그에 머무는 동안 치즈 값이 쌌습니다. 치즈 말고는 전부 비쌌습니다.' : '쉐라그 국경에서 하루를 기다렸습니다. 들어가는 사람보다 나오는 사람이 적었습니다.', k: 'note', fx: { money: -medX(s, 0.02) } })),
  E('kje_visit_2', [10, 80], ['visit:kjerag'], 25, 3, { t: '쉐라그 산길에서 눈사태 경보를 들었습니다. 현지 사람들은 뛰지 않았고, 당신만 뛰었습니다.', k: 'note', fx: { h: -1 }, f: (s) => F('쉐라그 눈사태 경보 기준, 3단계') }),
  E('kje_visit_3', [10, 80], ['visit:kjerag'], 20, 4, { t: '쉐라그 마을 축일에 끼었습니다. 산신상 앞에서 외지인은 뒤에 섰고, 국물은 똑같이 받았습니다.', k: 'warm', fx: { h: 1 } }),
  E('kje_infected_quiet', [10, 80], [N, 'infected', 'known'], 20, 4, { t: '감염을 아는 사람이 생겼습니다. 아무것도 달라지지 않았습니다. 그것이 쉐라그였습니다.', k: 'note', fx: { h: 1 } }),
  E('kje_infected_1101', [10, 80], [N, 'infected', 'known'], 40, 0, { t: '재앙 뒤 감염 사태가 났습니다. 카란 무역이 치료를 맡았고, 치료받은 사실을 말하지 말라고 했습니다. 말하지 않았습니다.', k: 'note', fx: { hl: 2, h: -1 } }, { c: after1101 }),
  // W12(D51-2): 쉐라그 고유 결 — 재앙이 온 적 없음(1101 전), 감염자를 가르는 제도 없음, 외지 문화에 보수적
  E('kje_no_catastrophe', [8, 90], [N], 20, 5, { t: '재앙 정보 전달자가 마을을 지나갔습니다. 할 일이 없어서였습니다. 이 땅에 재앙이 온 적은 한 번도 없었고, 노인들은 그것을 산 덕이라고 했습니다.', k: 'note', fx: { h: 1 } }, { c: (s) => s.year < 1101 }),
  E('kje_no_shelter', [6, 90], [N], 15, 6, { t: '다른 나라에는 재앙 대피소가 있다고 책에 적혀 있었습니다. 마을에는 없었습니다. 필요한 적이 없었기 때문입니다.', k: 'note' }, { c: (s) => s.year < 1101 }),
  E('kje_infected_nolabel', [10, 80], [N, 'infected', 'known'], 20, 4, { t: '감염자 명부 같은 것은 없었습니다. 치료도 없었고, 쫓아내는 사람도 없었습니다. 산 아래 나라들 이야기를 들으면 그것이 드문 일이라는 것을 알았습니다.', k: 'note', fx: { h: 1 } }),
  E('kje_foreign_goods', [10, 90], [N], 20, 8, { t: '외국 물건이 마을에 들어왔습니다. 노인들은 손대지 않았고, 아이들은 숨겨 두었습니다. 가문 집사가 그것을 세었습니다.', k: 'note', fx: { h: -1 } }, { c: (s) => s.year >= 1090 }),
  E('kje_outside_news', [10, 90], [N], 15, 8, { t: '산 아래 나라의 소식이 반년 늦게 왔습니다. 마을은 반년 늦게 놀랐고, 놀란 뒤에는 늘 하던 대로 했습니다.', k: 'note' }),
  E('kje_foreign_manners', [12, 90], [N], 15, 8, { t: '외지 손님이 산신상 앞을 모자 쓴 채 지나갔습니다. 아무도 말하지 않았고, 그 집에는 그해 겨울 아무도 치즈를 들고 가지 않았습니다.', k: 'note' }),
];

export const decisions = {
  // ── 카란 무역: 설산귀 밀반입 목격 ──
  kje_kt_snowdevil_witness: {
    tags: ['track:' + KT], once: true,
    ok: (s) => s.S.age >= 18 && trStage(s) <= 2 && !!s.S.track && s.S.track.aff !== 'KJE_KT_SMALL' && s.rng.chance(0.25),   // W15: 카란 무역 소속만
    build: () => ({ title: '상자', body: '야간 적재 상자에 장부에 없는 것이 들어 있었습니다. 무기였고, 외국 것이었습니다. 적재 책임자는 당신을 보았습니다.',
      choices: [{ k: 'silent', label: '보지 않은 것으로 한다', sub: '평가 + · 공범', auto: 1.5 }, { k: 'report', label: '윗선에 보고한다', sub: '위험', auto: 0.8 }, { k: 'leak', label: '등기소에 알린다', sub: '체포 위험 · 양심', auto: 0.4 }] }),
    apply: (s, k) => {
      if (k === 'silent') return { t: '보지 않은 것으로 했습니다. 다음 분기 평가가 좋았습니다. 이유는 적혀 있지 않았습니다.', k: 'note', fx: { standing: 6, h: -2 } };
      if (k === 'report') { if (s.rng.chance(0.3)) { s.fall('layoff'); return false; } return { t: '보고했습니다. 윗선은 알고 있었습니다. 당신이 안다는 것을 윗선도 알게 되었습니다.', k: 'bad', fx: { standing: -4, h: -2 } }; }
      if (s.rng.chance(0.4)) { s.fall('arrest'); return false; }
      return { t: '등기소에 알렸습니다. 조사가 있었고, 상자는 사라졌고, 당신 이름은 어디에도 적히지 않았습니다.', k: 'note', fx: { h: 2, standing: -3 } };
    },
  },
  // ── 카란 무역: 빅토리아 쪽 서류 ──
  kje_kt_victoria_papers: {
    tags: ['track:' + KT], once: true,
    ok: (s) => trStage(s) >= 1 && trStage(s) <= 2 && !!s.S.track && s.S.track.aff !== 'KJE_KT_SMALL' && s.rng.chance(0.25),   // W15: 카란 무역 소속만
    build: () => ({ title: '서류 한 장', body: '빅토리아 쪽 회사와의 광산 지분 서류가 책상에 올라왔습니다. 서명란이 하나 비어 있고, 그 자리가 당신 자리입니다.',
      choices: [{ k: 'sign', label: '서명한다', sub: '승진 가까움 · 결탁 의혹', auto: 1 }, { k: 'refuse', label: '서명하지 않는다', sub: '평가 −', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'refuse') return { t: '서명하지 않았습니다. 서류는 다른 서명으로 채워졌고, 당신 자리는 창가에서 멀어졌습니다.', k: 'note', fx: { standing: -5, h: 1 } };
      if (s.rng.chance(0.3)) { s.fall('scandal'); return false; }
      return { t: '서명했습니다. 다음 해 승진 명단에 이름이 있었습니다. 서류는 금고에 들어갔습니다.', k: 'ev', fx: { standing: 10, h: -2, money: medX(s, 0.3) } };
    },
  },
  // ── 가신: 잔 ──
  kje_cla_poison_errand: {
    tags: ['track:' + CLAN], once: true,
    ok: (s) => trStage(s) >= 1 && trStage(s) <= 2 && s.rng.chance(0.25),
    build: (s) => ({ title: '잔', body: clanName(s) + '의 윗사람이 잔 하나를 건넸습니다. 저녁 자리에서 특정한 사람 앞에 놓으라고 했습니다. 이유는 말하지 않았고, 묻는 것은 가신의 일이 아니었습니다.',
      choices: [{ k: 'do', label: '놓는다', sub: '충성 · 공범', auto: 1.2 }, { k: 'swap', label: '잔을 바꾼다', sub: '아무도 모르게', auto: 0.8 }, { k: 'refuse', label: '거절한다', sub: '절연 위험', auto: 0.6 }] }),
    apply: (s, k) => {
      if (k === 'do') return { t: '놓았습니다. 그 사람은 다음 달 만주원에서 보이지 않았습니다. 가문은 당신을 더 자주 불렀습니다.', k: 'bad', fx: { standing: 8, h: -4 } };
      if (k === 'swap') return { t: '잔을 바꿨습니다. 아무 일도 일어나지 않았고, 윗사람은 당신을 오래 보았습니다.', k: 'note', fx: { standing: -3, h: 1 } };
      if (s.rng.chance(0.35)) { s.fall('betrayal'); return false; }
      return { t: '거절했습니다. 다른 사람이 놓았고, 당신은 그날부터 저택 바깥 일만 맡았습니다.', k: 'note', fx: { standing: -6, h: 1 } };
    },
  },
  // ── 가신: 외지인 혼인 비호 ──
  kje_cla_outsider_shield: {
    tags: ['track:' + CLAN], once: true,
    ok: (s) => s.S.age >= 20 && s.rng.chance(0.2),
    build: () => ({ title: '외지인', body: '가문 사람 하나가 외지인과 혼인하려 합니다. 보수파 가신들은 가주에게 막으라 하고, 가주는 당신 생각을 물었습니다.',
      choices: [{ k: 'shield', label: '혼인을 두둔한다', sub: '개혁파 · 보수파 적', auto: 1 }, { k: 'block', label: '막자고 한다', sub: '보수파 · 관습', auto: 1 }, { k: 'silent', label: '말하지 않는다', auto: 0.8 }] }),
    apply: (s, k) => {
      if (k === 'shield') return { t: '두둔했습니다. 혼인은 이루어졌고, 보수파 가신 둘이 당신과 말을 끊었습니다.', k: 'note', fx: { standing: (s.year >= 1098 ? 4 : -4), h: 2 } };
      if (k === 'block') return { t: '막자고 했습니다. 혼인은 깨졌고, 그 사람은 겨울에 국경을 넘었습니다.', k: 'bad', fx: { standing: (s.year >= 1098 ? -3 : 4), h: -3 } };
      return { t: '말하지 않았습니다. 가주는 다른 사람에게 물었습니다.', k: 'note', fx: { standing: -1 } };
    },
  },
  // ── 길잡이: 허가 없는 등반 ──
  kje_gui_no_permit: {
    tags: ['track:' + GUI], gap: 5, once: false,
    ok: (s) => s.S.age >= 16 && s.rng.chance(0.25),
    build: (s) => ({ title: '허가', body: '외국 등반가가 허가 없이 올라가겠다고 했습니다. 값은 한 철 벌이입니다. 허가 없는 등반은 실종돼도 수색이 없습니다.', fact: F('융프라우 등반 허가제 시행 규칙, 무허가 등반 수색 제외 조항'),
      choices: [{ k: 'go', label: '안내한다', sub: '돈 ++ · 평판 위험', auto: 0.8 }, { k: 'no', label: '거절한다', auto: 1.2 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '거절했습니다. 그는 혼자 올라갔고, 내려왔습니다. 운이었습니다.', k: 'note', fx: { standing: 1 } };
      const r = s.rng.rnd();
      if (r < 0.1) { s.fall('avalanche'); return false; }
      if (r < 0.35) return { t: '안내했습니다. 등기소가 알았고, 허가 대장에서 당신 이름이 한 해 지워졌습니다.', k: 'bad', fx: { money: medX(s, 0.4), standing: -8 } };
      return { t: '안내했습니다. 올라갔고, 내려왔고, 아무도 몰랐습니다.', k: 'ev', fx: { money: medX(s, 0.4), h: -1 } };
    },
  },
  // ── 길잡이: 눈보라 ──
  kje_gui_turn_back: {
    tags: ['track:' + GUI], gap: 4, once: false,
    ok: (s) => trStage(s) >= 1 && s.rng.chance(0.25),
    build: () => ({ title: '눈보라', body: '정상 두 시간 앞에서 날이 바뀌었습니다. 등반대는 올라가자고 합니다. 길잡이는 돌아가자고 할 권리가 있고, 그 권리를 쓰면 값은 반입니다.',
      choices: [{ k: 'back', label: '돌아간다', sub: '돈 − · 안전', auto: 1.3 }, { k: 'push', label: '올라간다', sub: '돈 · 눈사태 위험', auto: 0.8 }] }),
    apply: (s, k) => {
      if (k === 'back') return { t: '돌아갔습니다. 등반대는 화를 냈고, 다음 해 같은 사람이 다시 당신을 찾았습니다.', k: 'note', fx: { money: -medX(s, 0.05), standing: 3 } };
      if (s.rng.chance(0.2)) { s.fall('avalanche'); return false; }
      return { t: '올라갔습니다. 정상에서 사진을 찍었고, 내려오는 길은 아무도 기억하지 못했습니다.', k: 'ev', fx: { money: medX(s, 0.1), hl: -3, standing: 2 } };
    },
  },
  // ── 광부: 성산 지하 ──
  kje_min_sacred_dig: {
    tags: ['track:' + MINE], once: true,
    ok: (s) => s.S.age >= 16 && s.year >= 1090 && s.rng.chance(0.3),
    build: () => ({ title: '새 갱도', body: '회사가 새 갱도를 팠습니다. 방향이 성산 쪽입니다. 작업반을 뽑고 있고, 월급은 두 배입니다. 만주원은 모른다고 합니다.',
      choices: [{ k: 'join', label: '들어간다', sub: '돈 ++ · 산을 거스름', auto: 1 }, { k: 'no', label: '들어가지 않는다', sub: '평판 유지', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '들어가지 않았습니다. 들어간 사람들의 월급 이야기를 겨울 내내 들었습니다.', k: 'note', fx: { standing: 2 } };
      if (s.rng.chance(0.25)) return { t: '들어갔습니다. 반년 뒤 만주원이 알았고, 갱도는 막혔고, 작업반 명단은 등기소로 갔습니다.', k: 'bad', fx: { money: medX(s, 0.3), standing: -6, h: -2 } };
      return { t: '들어갔습니다. 두 배 월급을 두 해 받았습니다. 산은 아무 말도 하지 않았습니다.', k: 'ev', fx: { money: medX(s, 0.6), h: -1 } };
    },
  },
  // ── 만주원: 성녀 등정 수행 ──
  kje_cou_ascent: {
    tags: ['track:' + COURT], once: true,
    ok: (s) => s.S.age >= 14 && s.rng.chance(0.3),
    build: () => ({ title: '등정', body: '새 성녀가 성산을 도보로 오릅니다. 수행자를 뽑습니다. 오른 사람은 만주원에서 이름이 남고, 다 오르지 못한 사람도 있습니다.',
      choices: [{ k: 'go', label: '수행한다', sub: '신망 ++ · 건강 −', auto: 1 }, { k: 'stay', label: '남는다', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'stay') return { t: '남았습니다. 돌아온 수행자들은 산 이야기를 하지 않았습니다.', k: 'note' };
      if (s.rng.chance(0.1)) { s.fall('demotion'); return false; }
      return { t: '수행했습니다. 정상에서 성녀는 아무 말도 하지 않았고, 내려와서도 그랬습니다. 당신 이름은 기록에 남았습니다.', k: 'big', fx: { standing: 10, hl: -6 } };
    },
  },
  // ── 혼인(국가 전용 문구) ──
  marry_chapel: marryDecision('chapel', N, (s, pr, t) => ({
    title: '만주원 축복 혼인', body: '만주원에서 축복을 받는 혼인입니다. ' + wa(pr.name) + ' 산신상 앞에 섭니다.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람이고, 장로가 눈썹을 올렸습니다.' : '') + (t.dowry ? ' 축복 헌금은 ' + Math.round(s.med * t.dowry).toLocaleString() + ' LMD 입니다.' : ''),
    fact: t.dowry ? F('만주원 혼인 축복 헌금 기준, 중위소득 ' + t.dowry + '배') : undefined,
    accept: '산신상 앞에 선다', acceptSub: '만주원 축복', hold: '한 해 미룬다', decline: '거절한다',
    holdT: '한 해 미루었습니다. 장로는 날짜를 지우고 새 날짜를 적지 않았습니다.', declineT: '거절했습니다. 산신상은 그대로였습니다.', opposeT: '가족이 반대했습니다. 종족이 다르다고 했고, 만주원도 축복을 미뤘습니다.',
  })),
  marry_fief: marryDecision('fief', N, (s, pr, t) => ({
    title: '영지 혼인', body: '같은 영지 마을 사람과의 혼인입니다. ' + eun(pr.name) + ' 세 집 건너 사람입니다. 가문 집사가 명부에 적고, 지붕 수리비를 가문이 댑니다.' + (t.dowry ? ' 순록 대신 치즈 바퀴가 오갑니다.' : ''),
    accept: '명부에 올린다', acceptSub: '영지 혼인', hold: '겨울을 보고 정한다', decline: '거절한다',
    holdT: '겨울을 보고 정하기로 했습니다. 집사는 명부를 덮었습니다.', declineT: '거절했습니다. 세 집 건너는 그 뒤로 멀어졌습니다.', opposeT: '가족이 반대했습니다. 집사는 명부에 적지 않았습니다.',
  })),
  marry_clan_match: marryDecision('clan_match', N, (s, pr, t) => ({
    title: '가문 혼약', body: '가문 사이의 혼약입니다. ' + eun(pr.name) + ' 다른 가문 사람이고, 혼약서에는 광산 하나와 마을 하나가 같이 적혀 있습니다.' + (t.dowry ? ' 오가는 것은 ' + Math.round(s.med * t.dowry).toLocaleString() + ' LMD 어치입니다.' : ''),
    fact: t.dowry ? F('삼족 혼약 관례, 지참 재산 중위소득 ' + t.dowry + '배') : undefined,
    accept: '혼약서에 인장을 찍는다', acceptSub: '가문 동맹', hold: '가주와 더 의논한다', decline: '거절한다',
    holdT: '가주와 더 의논하기로 했습니다. 혼약서는 금고에 들어갔습니다.', declineT: '거절했습니다. 두 가문 사이가 한 해 서늘했습니다.', opposeT: '가주가 반대했습니다. 혈통이 섞인다고 했습니다.',
  })),
  marry_outsider: marryDecision('outsider', N, (s, pr) => ({
    title: '외지인 혼인', body: eun(pr.name) + ' 산 밖에서 온 사람입니다. 보수파 마을에서는 금기이고, 투리쿰에서는 그냥 혼인입니다. 아이는 가문 이름을 받지 못할 수 있습니다.',
    accept: '혼인한다', acceptSub: '외지인 혼인', hold: '미룬다', decline: '거절한다',
    holdT: '미루었습니다. 산 밖 사람은 기다렸습니다.', declineT: '거절했습니다. 마을은 안도했고, 당신은 아니었습니다.', opposeT: '가족이 반대했습니다. 산 밖 사람은 안 된다고 했습니다.',
  })),
  home_change: homeDecision(),
};

// W11: 엔진 id 와 같은 결정은 국가 디스패처로 옮긴다(여러 파일이 같은 id 를 등록해도 거주국별로 분기)
hoist(decisions, { marry_chapel: ['kjerag'], marry_fief: ['kjerag'], marry_clan_match: ['kjerag'], marry_outsider: ['kjerag'], home_change: ['kjerag'] });

export default { events, decisions };
