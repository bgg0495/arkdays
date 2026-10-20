// W9g 볼리바르 진로 콘텐츠 (D40 국가 전용, 텍스트 공유 0).
// 핵심 6: BOL_SINGAS(의무복무 3년)·BOL_COALITION(연립 징병)·BOL_TRUE(소년 예비팀·게릴라)·BOL_PLANT(플랜테이션)·BOL_CASINO(도솔레스 관광)·BOL_FRANCHISE(A10) — 단계마다 4개.
// 나머지 6: BOL_FACTORY·BOL_CITYHALL·BOL_PMC·BOL_CHAMPION·BOL_STREET·BOL_REFUGEE — 단계마다 2개. 전부 전환 서사·몰락 후일담.
// A4 삼파 분기: 출생 진영(bolFaction)과 소속(aff:)에 따라 같은 복무가 다른 일상·전사 확률. 전시(war) 이벤트는 진영마다 따로.
// 공통 직장 이벤트(승진·과로·상사·회식)는 archetype:A10 에만(도솔레스 프랜차이즈·시정·카지노).
// 대사건(bigevents.js)의 도솔레스 소요·대행진은 여기서 다시 쓰지 않고 S.flags.big_* 로 연동만 한다.
// 결정: 탈영·소년병 거부·징집 면제·챔피언십 참가·공장 범죄 조직·난민 컬럼비아행·시청 뇌물·사냥개 계약 + marry_church/civil/garrison/camp(볼리바르 분기, 타국은 엔진 위임)·home_change·marry_second(sargon.js 공용).
import { ENGINE_DECISIONS } from '../../src/engine/choices.js';
import { eul, iga, eun, wa, ro, ieot, rago } from '../../src/engine/text.js';
import { cul, fest, F, orgF, rhodesF, given, poor, rich, lifeRoll, once, medX } from '../_util.js';
import { sharedDecisions, canonOpen, canonSeen } from './sargon.js';

const T = (id, st) => 'track:' + id + (st ? ':' + st : '');
const E = (id, a, tags, w, gap, run, extra = {}) => ({ id, a, tags, w, gap, run: typeof run === 'function' ? run : () => run, ...extra });
const trk = (s, id) => !!s.S.track && s.S.track.id === id;
const stageId = (s) => (s.stage ? s.stage.id : null);
const stNew = (s) => !!s.S.track && s.S.track.stage > 0 && s.S.age - s.S.track.stageSince <= 1;
const fell = (s, id, within = 2) => !s.S.track && s.S.flags.lastTrack === id && !!s.S.flags.lastFall && s.S.flags.lastFallAt != null && s.S.age - s.S.flags.lastFallAt <= within;
const standing = (s) => (s.S.track ? s.S.track.standing : 0);
const skillZ = (s) => (s.S.cap ? s.S.cap.skill : 0);
/** 출생 진영: singas / coalition / liberated / dossoles. 엔진이 region 을 롤하지 않으면 여기서 한 번 정한다 */
export function bolFaction(s) {
  const S = s.S; S.sub = S.sub || {};
  if (S.sub.region === undefined) {
    const r = s.rng.rnd();
    S.sub.region = S.urban ? (r < 0.45 ? 'dossoles' : r < 0.7 ? 'singas' : r < 0.9 ? 'coalition' : 'liberated') : (r < 0.4 ? 'singas' : r < 0.7 ? 'coalition' : r < 0.9 ? 'liberated' : 'dossoles');
  }
  return S.sub.region;
}
const FACTION_NAME = { singas: '싱가스', coalition: '연립정부', liberated: '해방구', dossoles: '도솔레스' };
const fac = (s) => FACTION_NAME[bolFaction(s)] || '어느 쪽도 아닌 땅';
const GOV = (s) => s.rng.pick(['싱가스 쪽', '연립정부 쪽', '해방구 쪽']);

// ── 핵심 1. BOL_SINGAS 싱가스 왕조군 (A4: school → soldier → career → officer → title) ──
const singas = [
  E('bol_sin_sc_entry', [16, 22], [T('BOL_SINGAS', 'school')], 50, 2, (s) => ({ t: '군사학교에 들어갔습니다. 종족도 성별도 집안도 묻지 않았습니다. 묻는 것은 하나, 세 해를 채울 수 있느냐였습니다.', k: 'ev', fx: { cap: { skill: 0.04 } }, f: F('싱가스 왕조군 입교 명부, ' + s.year + '년') })),
  E('bol_sin_sc_drill', [16, 22], [T('BOL_SINGAS', 'school')], 45, 1, (s) => ({ t: '새벽 훈련이 한 해 내내였습니다. 교관은 라이타니엔에서 온 사람이었고, 명령은 두 나라 말로 떨어졌습니다.', k: 'ev', fx: { hl: 1, cap: { skill: 0.03 } } })),
  E('bol_sin_sc_leave', [16, 22], [T('BOL_SINGAS', 'school')], 35, 2, (s) => ({ t: '휴가에 집에 갔습니다. 어머니가 군복을 빨아 주었고, 아버지는 어느 쪽 사람이냐고 농담했습니다. 농담이 아니었습니다.', k: 'warm', fx: { h: 2 } })),
  E('bol_sin_sc_dropout', [16, 22], [T('BOL_SINGAS', 'school')], 30, 2, (s) => ({ t: '같은 방 하나가 담을 넘었습니다. 사흘 뒤 잡혀 왔고, 다시 담을 넘지 않았습니다. 세 해는 누구에게나 세 해였습니다.', k: 'bad', fx: { h: -2, f: F('군사학교 징계 기록, ' + s.year + '년') } })),
  E('bol_sin_so_post', [18, 30], [T('BOL_SINGAS', 'soldier')], 45, 2, (s) => ({ t: '남쪽 초소에 배치되었습니다. 건너편은 연립정부 초소였고, 양쪽 다 ' + eul(cul(s).drink) + ' 마셨습니다. 서로 보이는 거리였습니다.', k: 'note', fx: { standing: 2 } })),
  E('bol_sin_so_pay', [18, 30], [T('BOL_SINGAS', 'soldier')], 40, 2, (s) => ({ t: '급여가 두카트로 나왔습니다. 플랜테이션에서 일하는 사촌의 넉 달치였습니다. 이 나라에서 가장 벌이가 좋은 직업이 군인이라는 말이 맞았습니다.', k: 'warm', fx: { money: medX(s, 0.15), h: 1, f: F('왕조군 급여표, ' + s.year + '년') } })),
  E('bol_sin_so_skirmish', [18, 30], [T('BOL_SINGAS', 'soldier')], 35, 2, (s) => ({ t: '교전이 있었습니다. 세 시간. 끝나고 세어 보니 우리 쪽 둘이 없었습니다. 보고서는 한 장이었습니다.', k: 'bad', fx: { hl: -4, h: -4, standing: 3, f: F('왕조군 교전 보고, ' + s.year + '년') } })),
  E('bol_sin_so_hound', [18, 30], [T('BOL_SINGAS', 'soldier')], 30, 3, (s) => ({ t: '남부 순찰에서 사냥개 소리를 들었습니다. 소리만 들었습니다. 소리만 들은 날은 좋은 날이었습니다.', k: 'note', fx: { h: -1 } })),
  E('bol_sin_ca_sign', [21, 45], [T('BOL_SINGAS', 'career')], 45, 2, (s) => ({ t: '직업군인으로 서명했습니다. 의무는 끝났고, 선택이 시작되었습니다. 선택지가 둘뿐이라는 것은 서명한 뒤에 알았습니다.', k: 'ev', fx: { standing: 3, money: medX(s, 0.1) } })),
  E('bol_sin_ca_squad', [21, 45], [T('BOL_SINGAS', 'career')], 40, 2, (s) => ({ t: '분대를 맡았습니다. 열 명. 이름을 외웠고, 고향을 외웠고, 고향이 어느 쪽 땅인지는 외우지 않으려 했습니다.', k: 'ev', fx: { cap: { ties: 0.03 }, f: F('분대 편성표, ' + s.year + '년') } })),
  E('bol_sin_ca_leith', [21, 45], [T('BOL_SINGAS', 'career')], 30, 3, (s) => ({ t: '라이타니엔 교환 지휘관이 왔습니다. 명령은 정확했고, 사람 수는 정확히 줄었습니다.', k: 'bad', fx: { h: -3, hl: -2 } })),
  E('bol_sin_ca_fire', [21, 45], [T('BOL_SINGAS', 'career')], 30, 3, (s) => ({ t: '퇴역한 선임이 도솔레스 소방서에 들어갔다고 편지가 왔습니다. 불 끄는 일이 사람 쏘는 일보다 낫다고 적혀 있었습니다.', k: 'note', fx: { h: 1 } })),
  E('bol_sin_of_map', [27, 55], [T('BOL_SINGAS', 'officer')], 45, 2, (s) => ({ t: '장교로서 작전 지도를 받았습니다. 지도에 마을 셋이 있었고, 작전 뒤에는 둘이었습니다.', k: 'bad', fx: { standing: 4, h: -4, f: F('작전 보고서, ' + s.year + '년') } })),
  E('bol_sin_of_court', [27, 55], [T('BOL_SINGAS', 'officer')], 35, 3, (s) => ({ t: '군사재판에 배석했습니다. 탈영병이었습니다. 열아홉. 판결문을 읽는 것이 제 몫이었습니다.', k: 'bad', fx: { h: -3, f: F('군사재판 판결문, ' + s.year + '년') } })),
  E('bol_sin_of_salon', [27, 55], [T('BOL_SINGAS', 'officer')], 30, 3, (s) => ({ t: '왕조 쪽 귀족의 저녁 식사에 불려 갔습니다. 작위 이야기가 나왔습니다. 작위는 공적으로 받는다고 했고, 공적이 무엇인지는 말하지 않았습니다.', k: 'note', fx: { cap: { ties: 0.04 } } })),
  E('bol_sin_of_colombia', [27, 55], [T('BOL_SINGAS', 'officer')], 30, 4, (s) => ({ t: '북쪽에서 컬럼비아 군이 내려왔다는 보고를 받았습니다. 어느 정부를 도우러 왔는지는 보고서에 없었습니다.', k: 'note', fx: { h: -2 } })),
  E('bol_sin_ti_baron', [35, 90], [T('BOL_SINGAS', 'title')], 45, 2, (s) => ({ t: '작위를 받았습니다. 남작. 문서에는 왕의 서명이 있었고, 영지는 지도에 작은 사각형이었습니다.', k: 'big', fx: { standing: 5, money: medX(s, 1) } })),
  E('bol_sin_ti_estate', [35, 90], [T('BOL_SINGAS', 'title')], 35, 3, (s) => ({ t: '영지의 플랜테이션을 돌았습니다. 반장이 수확량을 읽었고, 사람 수는 읽지 않았습니다. 묻지 않았습니다.', k: 'note', fx: { money: medX(s, 0.8), h: -1 } })),
  E('bol_sin_ti_council', [35, 90], [T('BOL_SINGAS', 'title')], 30, 4, (s) => ({ t: '왕조 쪽 귀족 회의에 앉았습니다. 다음 전쟁 이야기였습니다. 전쟁이 끝난 적이 없는데 다음이라는 말을 썼습니다.', k: 'note', fx: { standing: 2, h: -2 } })),
  E('bol_sin_ti_heir', [35, 90], [T('BOL_SINGAS', 'title')], 30, 5, (s) => ({ t: '아이가 군사학교에 들어갔습니다. 작위가 있어도 세 해는 세 해였습니다. 그것만은 공평했습니다.', k: 'warm', fx: { h: 2 } })),
  E('bol_sin_leith_aff', [16, 60], ['aff:BOL_SIN_LEITH', T('BOL_SINGAS')], 40, 2, (s) => ({ t: '라이타니엔이 직접 지휘하는 부대였습니다. 장비는 가장 좋았고, 가장 앞에 섰습니다.', k: 'bad', fx: { standing: 3, hl: -3 } })),
  E('bol_sin_fire_aff', [16, 60], ['aff:BOL_SIN_FIRE', T('BOL_SINGAS')], 40, 3, (s) => ({ t: '퇴역 소방관 출신들이 모인 부대라 불을 끄는 훈련이 총 훈련보다 많았습니다. 전선보다 화재 현장에 자주 갔습니다.', k: 'note', fx: { hl: -1, h: 1 } })),
  E('bol_sin_war', [16, 60], [T('BOL_SINGAS'), 'war'], 70, 1, (s) => { if (s.rng.chance((s.S.track && s.S.track.aff) === 'BOL_SIN_LEITH' ? 0.05 : 0.03)) { s.die('war', '전쟁·내전'); return; } return { t: '전시였습니다. 왕조군은 장비가 가장 좋았고, 그래서 가장 먼저 투입되었습니다.', k: 'bad', fx: { hl: -5, h: -3, standing: 4 } }; }, { rep: true }),
  E('bol_sin_shift', [16, 90], [T('BOL_SINGAS')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'soldier' ? '세 해를 마치고 병사가 되었습니다. 학교 문을 나서는 날 군복은 그대로였습니다.' : id === 'career' ? '직업군인이 되었습니다. 제대하지 않기로 서명했습니다.' : id === 'officer' ? '장교 임관이었습니다. 어깨에 금속이 하나 더 붙었습니다.' : '작위 수여식이었습니다. 왕이 서 있었고, 저는 무릎을 꿇었습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('bol_sin_after', [16, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'desert' ? '탈영한 뒤의 일입니다. 싱가스 땅에서는 이름을 쓸 수 없었고, 다른 땅에서는 싱가스 사람이라 불렸습니다.' : s.S.flags.lastFall === 'courtmartial' ? '군사재판 뒤의 일입니다. 판결문을 읽던 장교의 목소리를 오래 기억했습니다.' : '왕조군을 떠난 뒤의 일입니다. 새벽에 깨는 버릇은 남았습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'BOL_SINGAS') }),
];

// ── 핵심 2. BOL_COALITION 연립정부군·시민 경비대 (A4: draftee → career → guard → captain) ──
const coalition = [
  E('bol_coa_d_notice', [17, 26], [T('BOL_COALITION', 'draftee')], 50, 2, (s) => ({ t: '징집 통지가 왔습니다. 과두에게 돈을 내면 면제된다는 말도 함께 왔습니다. 돈이 없는 집에만 통지가 먼저 왔습니다.', k: 'bad', fx: { h: -2 } })),
  E('bol_coa_d_gear', [17, 26], [T('BOL_COALITION', 'draftee')], 45, 2, (s) => ({ t: '수입 장비를 받았습니다. 설명서는 세 나라 말이었고, 볼리바르 말은 없었습니다. 교관 일곱이 일곱 가지로 가르쳤습니다.', k: 'note', fx: { cap: { skill: 0.02 }, h: -1, f: F('연립정부군 장비 수령 대장, ' + s.year + '년') } })),
  E('bol_coa_d_lawless', [17, 26], [T('BOL_COALITION', 'draftee')], 35, 2, (s) => ({ t: '마을 하나를 지나며 분대장이 가게 물건을 가져갔습니다. 영수증은 없었습니다. 영수증이라는 말을 아는 사람이 없었습니다.', k: 'bad', fx: { h: -3 } })),
  E('bol_coa_d_contact', [17, 26], [T('BOL_COALITION', 'draftee')], 35, 2, (s) => ({ t: '첫 교전이었습니다. 상대가 누구였는지 끝까지 몰랐습니다. 분대장도 몰랐습니다.', k: 'bad', fx: { hl: -3, h: -3, standing: 2 } })),
  E('bol_coa_c_estate', [19, 45], [T('BOL_COALITION', 'career')], 45, 2, (s) => ({ t: '영지 직업군인으로 고용되었습니다. 급여는 과두의 금고에서 나왔고, 명령도 거기서 나왔습니다.', k: 'ev', fx: { money: medX(s, 0.15), standing: 2 } })),
  E('bol_coa_c_dollar', [19, 45], [T('BOL_COALITION', 'career')], 40, 2, (s) => ({ t: '급여가 컬럼비아 달러로 바뀌었습니다. 솔보다 좋았습니다. 왜 바뀌었는지는 묻지 않는 것이 좋았습니다.', k: 'note', fx: { money: medX(s, 0.1) } })),
  E('bol_coa_c_switch', [19, 45], [T('BOL_COALITION', 'career')], 35, 3, (s) => ({ t: '옆 영지의 군인들이 하룻밤 사이에 다른 과두 밑으로 갔습니다. 급여가 더 좋았다고 했습니다. 이튿날 그들은 적이었습니다.', k: 'bad', fx: { h: -2 } })),
  E('bol_coa_c_advisor', [19, 45], [T('BOL_COALITION', 'career')], 30, 3, (s) => ({ t: '외국 군사고문이 왔습니다. 블랙스틸 출신이라고 했습니다. 고문의 급여는 분대 전체 급여와 같았습니다.', k: 'note', fx: { cap: { skill: 0.03 }, f: F('연립정부군 고문 계약, ' + s.year + '년') } })),
  E('bol_coa_g_border', [25, 55], [T('BOL_COALITION', 'guard')], 45, 2, (s) => ({ t: '시민 경비대로 국경 검문소에 섰습니다. 사람들은 어느 쪽 사람이냐고 묻는 저를 보고, 어느 쪽 사람이냐고 되물었습니다.', k: 'note', fx: { standing: 2 } })),
  E('bol_coa_g_refugee', [25, 55], [T('BOL_COALITION', 'guard')], 40, 2, (s) => ({ t: '남쪽에서 난민 행렬이 올라왔습니다. 검문소는 통과시키라는 명령과 막으라는 명령을 같은 날 받았습니다. 통과시켰습니다.', k: 'ev', fx: { h: 1, standing: -2 } })),
  E('bol_coa_g_bribe', [25, 55], [T('BOL_COALITION', 'guard')], 35, 3, (s) => ({ t: '검문소에서 봉투를 받는 동료가 있었습니다. 받지 않는 동료도 있었습니다. 받지 않는 쪽이 먼저 전근되었습니다.', k: 'bad', fx: { h: -2 } })),
  E('bol_coa_g_street', [25, 55], [T('BOL_COALITION', 'guard')], 30, 3, (s) => ({ t: '거리예술 공동체의 땅을 비우라는 명령이었습니다. 공동체 사람들이 벽에 그림을 그리고 있었습니다. 그날은 비우지 못했습니다.', k: 'note', fx: { h: -1 } })),
  E('bol_coa_cp_embassy', [31, 65], [T('BOL_COALITION', 'captain')], 45, 2, (s) => ({ t: '대위이자 대사였습니다. 아침에는 부대, 오후에는 외국 공관. 두 자리의 급여를 받았고, 두 자리의 적을 가졌습니다.', k: 'big', fx: { standing: 4, money: medX(s, 0.5), f: F('등기소(가까운 정부 쪽) 임명 기록, ' + s.year + '년') } })),
  E('bol_coa_cp_land', [31, 65], [T('BOL_COALITION', 'captain')], 35, 3, (s) => ({ t: '땅 하나를 두고 소송에 걸렸습니다. 공동체가 상대였습니다. 재판은 세 정부 중 어느 쪽 법으로 할지에서 멈췄습니다.', k: 'bad', fx: { h: -3 } })),
  E('bol_coa_cp_oligarch', [31, 65], [T('BOL_COALITION', 'captain')], 35, 3, (s) => ({ t: '과두의 저녁 식사에 앉았습니다. 다음 선거 이야기였습니다. 선거가 있었던 적이 있는지 기억나지 않았습니다.', k: 'note', fx: { cap: { ties: 0.04 } } })),
  E('bol_coa_cp_trial', [31, 65], [T('BOL_COALITION', 'captain')], 30, 4, (s) => ({ t: '부하 하나가 재판을 받았습니다. 증인으로 섰습니다. 무엇을 보았느냐는 질문에 보지 못했다고 했습니다. 사실이었습니다.', k: 'bad', fx: { h: -2, standing: -2 } })),
  E('bol_coa_estate_aff', [17, 65], ['aff:BOL_COA_ESTATE', T('BOL_COALITION')], 40, 2, (s) => ({ t: '과두 영지군이라 과두의 적이 곧 적이었습니다. 과두의 적은 다른 과두였고, 그쪽 군인도 저희와 같은 장비였습니다.', k: 'bad', fx: { money: medX(s, 0.1), h: -2 } })),
  E('bol_coa_guard_aff', [17, 65], ['aff:BOL_COA_GUARD', T('BOL_COALITION')], 40, 3, (s) => ({ t: '시민 경비대 소속이라 전선보다 검문소가 많았습니다. 총을 쏜 날보다 서류를 본 날이 많았습니다.', k: 'note', fx: { hl: 1 } })),
  E('bol_coa_war', [17, 65], [T('BOL_COALITION'), 'war'], 70, 1, (s) => { if (s.rng.chance((s.S.track && s.S.track.aff) === 'BOL_COA_ESTATE' ? 0.06 : 0.04)) { s.die('war', '전쟁·내전'); return; } return { t: '전시였습니다. 연립정부군은 명령이 둘씩 내려왔고, 어느 쪽을 따를지는 분대장이 정했습니다.', k: 'bad', fx: { hl: -5, h: -3, standing: 3 } }; }, { rep: true }),
  E('bol_coa_shift', [17, 70], [T('BOL_COALITION')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'career' ? '징집이 끝나고 영지 직업군인으로 남았습니다. 급여가 있는 쪽을 골랐습니다.' : id === 'guard' ? '시민 경비대로 옮겼습니다. 제복 색이 바뀌었고, 사람들이 보는 눈은 바뀌지 않았습니다.' : '대위가 되었고, 같은 해 대사 임명장도 받았습니다. 연립정부에서는 둘이 한 자리였습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('bol_coa_after', [17, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'desert' ? '부대를 떠난 뒤의 일입니다. 연립정부 땅에서는 수배자였고, 다른 땅에서는 연립정부 사람이었습니다.' : '연립정부군을 떠난 뒤의 일입니다. 어느 쪽 사람이냐는 물음에 이제 아무 쪽도 아니라고 답했습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'BOL_COALITION') }),
];

// ── 핵심 3. BOL_TRUE 진정한 볼리바르인 (A4: reserve → guerrilla → officer → party) ──
const trueB = [
  E('bol_tru_r_drill', [12, 25], [T('BOL_TRUE', 'reserve')], 50, 1, (s) => ({ t: '청년 예비팀 훈련이었습니다. 또래 열둘. 나무 총으로 시작했고, 겨울에는 나무가 아니었습니다.', k: 'bad', fx: { cap: { skill: 0.03 }, h: -1, f: F('예비팀 명부, ' + s.year + '년') } })),
  E('bol_tru_r_speech', [12, 25], [T('BOL_TRUE', 'reserve')], 40, 2, (s) => ({ t: '해방구 노인이 예비팀 앞에서 연설했습니다. 진정한 볼리바르는 어디 있느냐고 물었고, 아이들은 가슴을 가리켰습니다. 그렇게 배웠습니다.', k: 'note', fx: { cap: { ties: 0.03 }, standing: 2 } })),
  E('bol_tru_r_friend', [12, 25], [T('BOL_TRUE', 'reserve')], 35, 2, (s) => ({ t: '예비팀 친구 하나가 밤에 없어졌습니다. 도솔레스로 갔다는 말과 북쪽으로 갔다는 말이 있었습니다. 둘 다 돌아오지 않는 쪽이었습니다.', k: 'loss', fx: { h: -3 } })),
  E('bol_tru_r_curfew', [12, 25], [T('BOL_TRUE', 'reserve')], 35, 2, (s) => ({ t: '해방구는 한 해 내내 계엄이었습니다. 해가 지면 길에 예비팀만 있었습니다. 저희가 그 예비팀이었습니다.', k: 'note', fx: { hl: -1 } })),
  E('bol_tru_g_ambush', [15, 40], [T('BOL_TRUE', 'guerrilla')], 45, 2, (s) => ({ t: '매복이었습니다. 상대는 연립정부 수송대였습니다. 트럭 둘, 사람 일곱. 보급품은 해방구 창고로 갔습니다.', k: 'bad', fx: { standing: 4, h: -3, hl: -2, f: F('해방구 작전 기록, ' + s.year + '년') } })),
  E('bol_tru_g_village', [15, 40], [T('BOL_TRUE', 'guerrilla')], 40, 2, (s) => ({ t: '마을에서 쉬었습니다. 마을 사람들이 ' + eul(cul(s).food) + ' 내왔습니다. 내오지 않으면 어떻게 되는지는 양쪽 다 말하지 않았습니다.', k: 'note', fx: { h: -1, hl: 1 } })),
  E('bol_tru_g_scorched', [15, 40], [T('BOL_TRUE', 'guerrilla')], 30, 3, (s) => ({ t: '지나온 마을에 대한 보고서가 돌았습니다. 초토화라는 말이 있었습니다. 저희가 지나간 뒤의 일이라고 했습니다. 기억과 달랐습니다.', k: 'bad', fx: { h: -5 } })),
  E('bol_tru_g_letter', [15, 40], [T('BOL_TRUE', 'guerrilla')], 30, 3, (s) => ({ t: '집에 편지를 썼습니다. 어디 있는지는 쓰지 못했습니다. 잘 있다고만 썼고, 그것은 반쯤 사실이었습니다.', k: 'warm', fx: { h: 1 } })),
  E('bol_tru_o_law', [20, 55], [T('BOL_TRUE', 'officer')], 45, 2, (s) => ({ t: '장교로서 법을 만들었습니다. 아침에 만들고 오후에 집행했습니다. 해방구에서 입법과 행정은 같은 책상이었습니다.', k: 'ev', fx: { standing: 3, cap: { learn: 0.03 } } })),
  E('bol_tru_o_purge', [20, 55], [T('BOL_TRUE', 'officer')], 35, 3, (s) => ({ t: '동료 장교가 체포되었습니다. 혐의는 배신이었고, 증거는 편지 한 장이었습니다. 제 편지도 어딘가에 있을 것이었습니다.', k: 'bad', fx: { h: -4 } })),
  E('bol_tru_o_ration', [20, 55], [T('BOL_TRUE', 'officer')], 35, 2, (s) => ({ t: '배급을 결정했습니다. 수용 인원 삼십만에 식량은 이십만 몫이었습니다. 종이에 숫자를 썼습니다.', k: 'bad', fx: { h: -3, standing: 2 }, f: F('해방구 계엄 행정 배급 장부, ' + s.year + '년') })),
  E('bol_tru_o_press', [20, 55], [T('BOL_TRUE', 'officer')], 30, 4, (s) => ({ t: '외국 기자가 왔습니다. 학살 보고에 대해 물었습니다. 보고서를 본 적 없다고 했습니다. 사실이었고, 사실이 아니기도 했습니다.', k: 'note', fx: { h: -2 } })),
  E('bol_tru_p_meeting', [28, 80], [T('BOL_TRUE', 'party')], 45, 2, (s) => ({ t: '청년당 간부 회의에 앉았습니다. 청년이라는 말과 나이가 더는 맞지 않았습니다. 아무도 그 말을 바꾸자고 하지 않았습니다.', k: 'note', fx: { standing: 3 } })),
  E('bol_tru_p_dossoles', [28, 80], [T('BOL_TRUE', 'party')], 35, 3, (s) => ({ t: '도솔레스를 기지로 쓰자는 안이 올라왔습니다. 반대했습니다. 반대한 사람이 다음 회의에 없는 일이 전에 있었습니다.', k: 'bad', fx: { h: -2, standing: -2 } })),
  E('bol_tru_p_youth', [28, 80], [T('BOL_TRUE', 'party')], 35, 3, (s) => ({ t: '새 예비팀을 사열했습니다. 열두 살. 제가 선 자리에 섰던 나이였습니다. 사열은 짧게 끝냈습니다.', k: 'loss', fx: { h: -3 } })),
  E('bol_tru_p_refugee', [28, 80], [T('BOL_TRUE', 'party')], 30, 4, (s) => ({ t: '난민 수용 결정에 서명했습니다. 파괴된 영토에서 온 사람들이었습니다. 영토를 파괴한 쪽에 저희도 있었습니다.', k: 'bad', fx: { h: -3, standing: 2 } })),
  E('bol_tru_youth_aff', [12, 80], ['aff:BOL_TRU_YOUTH', T('BOL_TRUE')], 40, 3, (s) => ({ t: '청년당 소속이라 총보다 구호를 먼저 배웠습니다. 승급은 빨랐고, 의심도 빨랐습니다.', k: 'note', fx: { standing: 2, h: -1 } })),
  E('bol_tru_admin_aff', [12, 80], ['aff:BOL_TRU_ADMIN', T('BOL_TRUE')], 40, 3, (s) => ({ t: '계엄 행정 쪽이라 전선보다 도장이 많았습니다. 도장 하나가 사람 하나였습니다.', k: 'note', fx: { h: -2, hl: 1 } })),
  E('bol_tru_war', [12, 80], [T('BOL_TRUE'), 'war'], 70, 1, (s) => { if (s.rng.chance((s.S.track && s.S.track.aff) === 'BOL_TRU_GUERRILLA' ? 0.07 : 0.04)) { s.die('war', '전쟁·내전'); return; } return { t: '전시였습니다. 게릴라에게 전시와 평시의 차이는 상대가 먼저 쏘느냐뿐이었습니다.', k: 'bad', fx: { hl: -5, h: -3, standing: 4 } }; }, { rep: true }),
  E('bol_tru_shift', [12, 90], [T('BOL_TRUE')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'guerrilla' ? '예비팀에서 게릴라 병사가 되었습니다. 나무 총을 반납했습니다.' : id === 'officer' ? '장교가 되었습니다. 책상과 총을 같이 받았습니다.' : '청년당 간부가 되었습니다. 회의실에 의자가 하나 늘었습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('bol_tru_after', [12, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'purge' || s.S.flags.lastFall === 'arrest' ? '해방구에서 끌려간 뒤의 일입니다. 혐의는 들었고, 증거는 듣지 못했습니다.' : '해방구를 떠난 뒤의 일입니다. 진정한 볼리바르인이 어디 있느냐는 물음에 더는 가슴을 가리키지 않았습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'BOL_TRUE') }),
];

// ── 핵심 4. BOL_PLANT 플랜테이션 노동 (A11: child → harvest → foreman → tenant) + 생업 계절 ──
const plant = [
  E('bol_pla_ch_rows', [8, 16], [T('BOL_PLANT', 'child')], 50, 1, (s) => ({ t: '밭고랑 사이를 걸으며 잎을 땄습니다. 키가 작아 고랑 아래가 잘 보인다고 반장이 말했습니다.', k: 'bad', fx: { hl: -2, h: -1 } })),
  E('bol_pla_ch_school', [8, 16], [T('BOL_PLANT', 'child')], 40, 2, (s) => ({ t: '학교에 가는 아이들이 밭 옆길로 지나갔습니다. 손을 흔들었습니다. 아이들은 손을 흔들지 않았습니다.', k: 'loss', fx: { h: -2 } })),
  E('bol_pla_ch_heat', [8, 16], [T('BOL_PLANT', 'child')], 35, 2, (s) => ({ t: '한낮에 쓰러졌습니다. 그늘에 눕혀 놓았고, 해가 기울자 다시 고랑으로 보냈습니다.', k: 'bad', fx: { hl: -4 } })),
  E('bol_pla_ch_pay', [8, 16], [T('BOL_PLANT', 'child')], 35, 2, (s) => ({ t: '첫 품삯을 받았습니다. 어머니에게 드렸습니다. 어머니는 세어 보지 않고 받았습니다.', k: 'warm', fx: { h: 2, money: medX(s, 0.02) } })),
  E('bol_pla_h_harvest', [12, 60], [T('BOL_PLANT', 'harvest')], 50, 1, (s) => ({ t: '수확철이었습니다. 새벽 넷에서 저녁 일곱까지. 품삯은 자루 수로 셌고, 자루는 저울 눈금보다 늘 조금 가벼웠습니다.', k: 'ev', fx: { money: medX(s, 0.08), hl: -2, f: F('플랜테이션 품삯 장부, ' + s.year + '년') } })),
  E('bol_pla_h_export', [12, 60], [T('BOL_PLANT', 'harvest')], 40, 2, (s) => ({ t: '수확물은 트럭에 실려 북쪽으로 갔습니다. 마을 가게에서 같은 것을 사려면 하루 품삯이었습니다.', k: 'note', fx: { h: -1, f: F('플랜테이션 출하 기록, ' + s.year + '년') } })),
  E('bol_pla_h_checkpoint', [12, 60], [T('BOL_PLANT', 'harvest')], 35, 2, (s) => ({ t: '밭으로 가는 길에 검문이 생겼습니다. 어느 쪽 군인인지는 날마다 달랐습니다. 품삯은 날마다 같았습니다.', k: 'bad', fx: { h: -1 } })),
  E('bol_pla_h_landlord', [12, 60], [T('BOL_PLANT', 'harvest')], 30, 3, (s) => ({ t: '땅 주인이 왔습니다. 차에서 내리지 않았습니다. 반장이 차창 앞에서 보고했고, 차는 떠났습니다.', k: 'note', fx: { h: -1 } })),
  E('bol_pla_f_count', [22, 65], [T('BOL_PLANT', 'foreman')], 45, 2, (s) => ({ t: '반장으로서 자루를 셌습니다. 저울을 정확히 맞췄습니다. 땅 주인이 저울을 다시 맞추라고 했습니다.', k: 'bad', fx: { standing: 2, h: -3 } })),
  E('bol_pla_f_kids', [22, 65], [T('BOL_PLANT', 'foreman')], 40, 2, (s) => ({ t: '아이들을 고랑에 넣으라는 지시였습니다. 넣었습니다. 제가 들어갔던 고랑이었습니다.', k: 'bad', fx: { h: -4, standing: 2 } })),
  E('bol_pla_f_soldiers', [22, 65], [T('BOL_PLANT', 'foreman')], 35, 3, (s) => ({ t: '군인들이 와서 트럭 하나를 가져갔습니다. 영수증 대신 종이에 정부 이름을 적어 주었습니다. 세 정부 중 하나였습니다.', k: 'bad', fx: { money: -medX(s, 0.1) } })),
  E('bol_pla_f_strike', [22, 65], [T('BOL_PLANT', 'foreman')], 30, 4, (s) => ({ t: '일꾼들이 하루 일을 멈췄습니다. 품삯 때문이었습니다. 반장이 중간에 섰고, 중간은 양쪽에서 미움받는 자리였습니다.', k: 'bad', fx: { h: -3, cap: { ties: 0.03 } } })),
  E('bol_pla_t_lease', [30, 90], [T('BOL_PLANT', 'tenant')], 45, 2, (s) => ({ t: '소작으로 밭 한 뙈기를 얻었습니다. 커피였습니다. 첫 수확까지 세 해. 세 해 동안은 남의 밭에서 품을 팔았습니다.', k: 'ev', fx: { money: -medX(s, 0.1), h: 2 } })),
  E('bol_pla_t_price', [30, 90], [T('BOL_PLANT', 'tenant')], 40, 2, (s) => ({ t: '커피 값이 떨어졌습니다. 수확은 늘었고, 돈은 줄었습니다. 땅 주인 몫은 줄지 않았습니다.', k: 'bad', fx: { money: -medX(s, 0.12) }, f: F('등기소(가까운 정부 쪽) 작물 시세표, ' + s.year + '년') })),
  E('bol_pla_t_fire', [30, 90], [T('BOL_PLANT', 'tenant')], 30, 4, (s) => ({ t: '옆 밭이 불탔습니다. 초토화라고 했습니다. 어느 쪽이 했는지는 불이 꺼진 뒤에도 알 수 없었습니다.', k: 'bad', fx: { h: -4 } })),
  E('bol_pla_t_son', [30, 90], [T('BOL_PLANT', 'tenant')], 30, 4, (s) => ({ t: '아이가 군대에 갔습니다. 군인이 가장 벌이가 좋다고 했습니다. 밭은 혼자 부쳤습니다.', k: 'loss', fx: { h: -2 } })),
  E('bol_pla_coffee_aff', [8, 90], ['aff:BOL_PLA_COFFEE', T('BOL_PLANT')], 40, 2, (s) => ({ t: '커피 농장이었습니다. 열매는 붉었고, 손은 검었습니다. 마셔 본 것은 한 해에 두 번이었습니다.', k: 'note', fx: { hl: -1 } })),
  E('bol_pla_cane_aff', [8, 90], ['aff:BOL_PLA_CANE', T('BOL_PLANT')], 40, 2, (s) => ({ t: '사탕수수 밭이었습니다. 칼을 썼고, 칼은 수수보다 사람을 자주 베었습니다.', k: 'bad', fx: { hl: -3 } })),
  // 생업 계절·명절·동네
  E('bol_liv_festival', [5, 90], [T('BOL_PLANT')], 40, 2, (s) => ({ t: '독립기념일이었습니다. 세 정부가 각각 다른 날을 쳤고, 마을은 세 번 다 쉬었습니다. 쉬는 날은 품삯이 없었습니다.', k: 'warm', fx: { h: 2, money: -medX(s, 0.02) } })),
  E('bol_liv_procession', [5, 90], [T('BOL_PLANT')], 35, 2, (s) => ({ t: iga(fest(s, 1)) + ' 마을을 지났습니다. 군인들도 모자를 벗었습니다. 그날 하루는 총이 보이지 않았습니다.', k: 'warm', fx: { h: 3 } })),
  E('bol_liv_coffee', [5, 90], [T('BOL_PLANT')], 35, 2, (s) => ({ t: '아침마다 ' + eul(cul(s).drink) + ' 마셨습니다. 밭에서 난 것이 아니라 가게에서 산 것이었습니다. 밭에서 난 것은 북쪽으로 갔습니다.', k: 'note', fx: { h: 1 } })),
  E('bol_liv_checkpoint', [5, 90], [T('BOL_PLANT')], 40, 2, (s) => ({ t: '검문소가 하나 더 생겼습니다. 장에 가려면 서류 둘이 필요했고, 둘은 서로 다른 정부 것이었습니다.', k: 'bad', fx: { h: -1, money: -medX(s, 0.02) } })),
  E('bol_liv_rain', [5, 90], [T('BOL_PLANT')], 35, 2, (s) => ({ t: '우기였습니다. 길이 끊겼고, 트럭이 오지 않았고, 수확물이 창고에서 썩었습니다. 품삯도 창고에 있었습니다.', k: 'bad', fx: { money: -medX(s, 0.05), hl: -1 } })),
  E('bol_liv_wedding', [5, 90], [T('BOL_PLANT')], 25, 4, (s) => ({ t: '이웃집 성당 혼인이었습니다. 신부 쪽이 ' + eul(cul(s).food) + ' 냈고, 신랑 쪽은 군복을 입고 왔습니다. 휴가가 이틀이었습니다.', k: 'warm', fx: { h: 2 } })),
  E('bol_liv_hound_rumor', [5, 90], [T('BOL_PLANT')], 30, 3, (s) => ({ t: '남쪽 마을에 사냥개가 들어왔다는 소문이었습니다. 밤에 문을 두 번 잠갔습니다. 소문은 한 달을 갔습니다.', k: 'bad', fx: { h: -2 } })),
  E('bol_pla_shift', [8, 95], [T('BOL_PLANT')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'harvest' ? '어른 품삯을 받기 시작했습니다. 고랑은 같았고, 자루 값이 달랐습니다.' : id === 'foreman' ? '반장이 되었습니다. 저울과 명부를 받았습니다.' : '소작농이 되었습니다. 남의 땅이지만 제 이름으로 부치는 땅이었습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('bol_pla_after', [8, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'ruin' ? '밭을 잃은 뒤의 일입니다. 북쪽으로 가는 트럭을 오래 보았습니다.' : '플랜테이션을 떠난 뒤의 일입니다. 손가락의 굳은살이 한 해를 더 갔습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'BOL_PLANT') }),
];

// ── 핵심 5. BOL_CASINO 카지노·바·크루즈 (A10: dealer → manager → operator) ──
const casino = [
  E('bol_cas_d_table', [16, 45], [T('BOL_CASINO', 'dealer')], 45, 2, (s) => ({ t: '테이블 뒤에 섰습니다. 손님의 돈이 제 손을 지나 집으로 갔습니다. 제 몫은 팁이었고, 팁은 손님 기분이었습니다.', k: 'ev', fx: { money: medX(s, 0.05), cap: { ties: 0.02 } } })),
  E('bol_cas_d_bar', [16, 45], [T('BOL_CASINO', 'dealer')], 40, 2, (s) => ({ t: '바에서 밤을 새웠습니다. 감염자 손님은 허가 구역 안에서만 받았습니다. 허가 구역이 바 전체였습니다.', k: 'note', fx: { hl: -1, h: 1 } })),
  E('bol_cas_d_fight', [16, 45], [T('BOL_CASINO', 'dealer')], 35, 2, (s) => ({ t: '손님끼리 싸움이 났습니다. 어느 정부 사람인지가 싸움의 이유였습니다. 유리잔 넷, 의자 둘.', k: 'bad', fx: { h: -2 } })),
  E('bol_cas_d_tip', [16, 45], [T('BOL_CASINO', 'dealer')], 35, 2, (s) => ({ t: '외국 손님이 큰 팁을 주었습니다. 한 달치였습니다. 그 손님은 다음 날 테이블에서 한 해치를 잃었습니다.', k: 'warm', fx: { money: medX(s, 0.3), h: 1, f: F('카지노 테이블 장부, ' + s.year + '년') } })),
  E('bol_cas_m_floor', [19, 55], [T('BOL_CASINO', 'manager')], 45, 2, (s) => ({ t: '매니저로서 홀을 돌았습니다. 딜러 열둘, 바텐더 넷, 경비 셋. 경비가 가장 비쌌습니다.', k: 'ev', fx: { standing: 3, f: F('카지노 인력표, ' + s.year + '년') } })),
  E('bol_cas_m_sea', [19, 55], [T('BOL_CASINO', 'manager')], 35, 3, (s) => ({ t: '인공 바다 옆에 새 테이블을 열었습니다. 바닷물은 염분을 넣은 것이었고, 손님은 진짜였습니다.', k: 'note', fx: { money: medX(s, 0.2) } })),
  E('bol_cas_m_bomb', [19, 55], [T('BOL_CASINO', 'manager')], 30, 4, (s) => ({ t: '옆 거리에서 폭발이 있었습니다. 손님을 뒷문으로 내보냈습니다. 다음 날 테이블은 다시 열렸습니다. 도솔레스는 그런 도시였습니다.', k: 'bad', fx: { h: -4 } })),
  E('bol_cas_m_mayor', [19, 55], [T('BOL_CASINO', 'manager')], 30, 4, (s) => ({ t: '시장의 차가 카지노 앞을 지났습니다. 음악이 한 박자 늦게 다시 시작되었습니다. 매니저들은 그 한 박자를 알았습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('bol_cas_o_license', [25, 70], [T('BOL_CASINO', 'operator')], 45, 2, (s) => ({ t: '카지노 허가를 제 이름으로 받았습니다. 시청 서류 열두 장. 열두 장 모두에 다른 사람의 도장이 먼저 있었습니다.', k: 'big', fx: { standing: 4, money: medX(s, 1) }, f: F('도솔레스 시청 영업 허가 대장, ' + s.year + '년') })),
  E('bol_cas_o_cruise', [25, 70], [T('BOL_CASINO', 'operator')], 35, 3, (s) => ({ t: '크루즈선 하나를 임대했습니다. 바다는 인공이었고, 배는 진짜였고, 배 위의 빚도 진짜였습니다.', k: 'note', fx: { money: -medX(s, 0.5), standing: 2 } })),
  E('bol_cas_o_protection', [25, 70], [T('BOL_CASINO', 'operator')], 35, 3, (s) => ({ t: '보호비를 요구하는 사람들이 왔습니다. 어느 정부 쪽인지 물었고, 정부가 아니라고 했습니다. 냈습니다.', k: 'bad', fx: { money: -medX(s, 0.4), h: -2 } })),
  E('bol_cas_o_1101', [25, 70], [T('BOL_CASINO', 'operator')], 60, 1, (s) => ({ t: '소요 뒤의 거리였습니다. 카지노는 사흘 닫았고, 나흘째 열었습니다. 손님이 반이었고, 반은 많은 것이었습니다.', k: 'bad', fx: { money: -medX(s, 0.6) } }), { c: (s) => s.S.flags.big_bolivar_1101_live != null && s.year <= 1102 }),
  E('bol_cas_cruise_aff', [16, 70], ['aff:BOL_CAS_CRUISE', T('BOL_CASINO')], 40, 3, (s) => ({ t: '크루즈선 승무원이라 땅보다 배 위에 있는 날이 많았습니다. 배는 항구를 떠나지 않았습니다. 떠나는 척만 했습니다.', k: 'note', fx: { h: 1 } })),
  E('bol_cas_tour_aff', [16, 70], ['aff:BOL_CAS_TOUR', T('BOL_CASINO')], 40, 3, (s) => ({ t: '관광 쪽이라 손님이 외국인이었습니다. 외국인은 세 정부 이야기를 재미있어했습니다. 재미있는 이야기가 아니라고 말하지 않았습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('bol_cas_shift', [16, 70], [T('BOL_CASINO')], 400, 2, (s) => ({ t: stageId(s) === 'manager' ? '매니저가 되었습니다. 테이블 뒤에서 홀 가운데로 자리가 옮겨졌습니다.' : '카지노 운영자가 되었습니다. 허가증에 제 이름이 있었습니다.', k: 'big', fx: { h: 3 } }), { c: stNew }),
  E('bol_cas_after', [16, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'bankrupt' ? '카지노가 망한 뒤의 일입니다. 테이블은 팔렸고, 빚은 팔리지 않았습니다.' : '카지노를 떠난 뒤의 일입니다. 밤에 깨어 있는 버릇이 남았습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'BOL_CASINO') }),
];

// ── 핵심 6. BOL_FRANCHISE 프랜차이즈 회사원 (A10: clerk → manager → hq → exec) + archetype:A10 공통 직장 ──
const franchise = [
  E('bol_fra_c_counter', [16, 40], [T('BOL_FRANCHISE', 'clerk')], 45, 2, (s) => ({ t: '카운터에 섰습니다. 본사 매뉴얼은 컬럼비아 말이었고, 손님은 볼리바르 말이었습니다. 둘 다 웃는 얼굴을 요구했습니다.', k: 'ev', fx: { cap: { learn: 0.02 } } })),
  E('bol_fra_c_uniform', [16, 40], [T('BOL_FRANCHISE', 'clerk')], 40, 2, (s) => ({ t: '유니폼이 나왔습니다. 세탁은 제 몫이었습니다. 군복보다 자주 빨아야 했습니다.', k: 'note', fx: { money: -medX(s, 0.01) } })),
  E('bol_fra_c_soldier', [16, 40], [T('BOL_FRANCHISE', 'clerk')], 35, 2, (s) => ({ t: '군인 손님이 많았습니다. 세 정부 군복이 한 가게에 있었고, 가게 안에서는 아무도 쏘지 않았습니다.', k: 'note', fx: { h: 1 } })),
  E('bol_fra_c_weapon', [16, 40], [T('BOL_FRANCHISE', 'clerk')], 30, 3, (s) => ({ t: '창고 뒤쪽 상자는 커피가 아니었습니다. 점장이 보지 말라고 했습니다. 보지 않았습니다.', k: 'bad', fx: { h: -2 } })),
  E('bol_fra_m_numbers', [19, 50], [T('BOL_FRANCHISE', 'manager')], 45, 2, (s) => ({ t: '점장으로서 분기 보고를 올렸습니다. 본사는 분기 성장률을 원했습니다. 열다섯. 숫자를 맞췄습니다.', k: 'ev', fx: { standing: 3, h: -1 }, f: F('본사 분기 점포 보고서, ' + s.year + '년') })),
  E('bol_fra_m_hire', [19, 50], [T('BOL_FRANCHISE', 'manager')], 40, 2, (s) => ({ t: '점원을 뽑았습니다. 지원자 스물. 군대 경력이 있는 쪽을 뽑으라는 본사 지침이었습니다.', k: 'note', fx: { cap: { ties: 0.02 }, f: F('본사 채용 지침, ' + s.year + '년') } })),
  E('bol_fra_m_raid', [19, 50], [T('BOL_FRANCHISE', 'manager')], 35, 3, (s) => ({ t: '경비대가 가게를 뒤졌습니다. 창고 뒤쪽 상자였습니다. 본사 변호사가 다음 날 왔고, 가게는 그 다음 날 열었습니다.', k: 'bad', fx: { h: -3, standing: -2 } })),
  E('bol_fra_m_newshop', [19, 50], [T('BOL_FRANCHISE', 'manager')], 30, 3, (s) => ({ t: '두 번째 점포를 냈습니다. 검문소 바로 옆이었습니다. 검문을 기다리는 사람이 손님이었습니다.', k: 'warm', fx: { money: medX(s, 0.3), standing: 2 } })),
  E('bol_fra_h_office', [24, 60], [T('BOL_FRANCHISE', 'hq')], 45, 2, (s) => ({ t: '본사로 올라갔습니다. 책상이 있었고, 창문이 있었고, 창문 밖에 점포가 없었습니다.', k: 'ev', fx: { standing: 2, cap: { learn: 0.03 } } })),
  E('bol_fra_h_expansion', [24, 60], [T('BOL_FRANCHISE', 'hq')], 40, 2, (s) => ({ t: '해방구 쪽 출점 계획을 짰습니다. 지도에 점을 찍었습니다. 점 하나가 그쪽 군대의 허가 하나였습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  E('bol_fra_h_arms', [24, 60], [T('BOL_FRANCHISE', 'hq')], 35, 3, (s) => ({ t: '회계 장부에 커피가 아닌 항목이 있었습니다. 회사의 다른 사업이라고 했습니다. 다른 사업이 본업보다 컸습니다.', k: 'bad', fx: { h: -2 } })),
  E('bol_fra_h_audit', [24, 60], [T('BOL_FRANCHISE', 'hq')], 30, 3, (s) => ({ t: '컬럼비아 본사에서 감사가 왔습니다. 사흘. 사흘 동안 창고 뒤쪽은 잠겨 있었습니다.', k: 'note', fx: { h: -1 } })),
  E('bol_fra_e_board', [30, 70], [T('BOL_FRANCHISE', 'exec')], 45, 2, (s) => ({ t: '임원 회의였습니다. 세 정부 어느 쪽에 세금을 낼지가 안건이었습니다. 셋 다에 내기로 했습니다.', k: 'note', fx: { standing: 3 } })),
  E('bol_fra_e_threat', [30, 70], [T('BOL_FRANCHISE', 'exec')], 35, 3, (s) => ({ t: '협박 편지가 왔습니다. 과두의 이름이었습니다. 경호를 늘렸고, 경호원은 회사 점포에서 뽑았습니다.', k: 'bad', fx: { h: -3, money: -medX(s, 0.3) } })),
  E('bol_fra_e_cruise', [30, 70], [T('BOL_FRANCHISE', 'exec')], 30, 3, (s) => ({ t: '시장의 크루즈선 파티에 초대받았습니다. 임원 자리였습니다. 배 위에서 보는 도솔레스는 조용해 보였습니다.', k: 'warm', fx: { cap: { ties: 0.04 } } })),
  E('bol_fra_e_bankrupt_rumor', [30, 70], [T('BOL_FRANCHISE', 'exec')], 30, 4, (s) => ({ t: '경쟁 프랜차이즈가 석 달 만에 망했습니다. 그 회사 임원이 저희 회사에 이력서를 냈습니다. 받지 않았습니다.', k: 'note', fx: { h: -1 } })),
  E('bol_fra_coffee_aff', [16, 70], ['aff:BOL_FRA_COFFEE', T('BOL_FRANCHISE')], 40, 3, (s) => ({ t: '커피 플레인이었습니다. 분기마다 성장했고, 성장의 반은 커피가 아니었습니다. 급여는 좋았습니다.', k: 'note', fx: { money: medX(s, 0.1), h: -1 } })),
  E('bol_fra_tio_aff', [16, 70], ['aff:BOL_FRA_TIOMARCO', T('BOL_FRANCHISE')], 40, 3, (s) => ({ t: '티오 마르코 점포라 손님은 가족 단위였습니다. 군인 손님도 가족과 왔습니다. 군복은 입고 왔습니다.', k: 'note', fx: { h: 1 } })),
  // 공통 직장 이벤트(archetype:A10 전용)
  E('bol_a10_promo_review', [16, 65], ['bolivar', 'archetype:A10'], 35, 2, (s) => ({ t: '인사 평가였습니다. 평가표는 본사 양식이었고, 칸 하나가 어느 정부 쪽 사람이냐였습니다. 비워 두었습니다.', k: 'note', fx: { standing: standing(s) > 50 ? 3 : -1 } })),
  E('bol_a10_overtime', [16, 65], ['bolivar', 'archetype:A10'], 35, 2, (s) => ({ t: '야근이었습니다. 통행금지 전에 나와야 했고, 나오지 못한 날은 사무실에서 잤습니다.', k: 'bad', fx: { hl: -2, standing: 2 } })),
  E('bol_a10_boss', [16, 65], ['bolivar', 'archetype:A10'], 30, 3, (s) => ({ t: '상사가 바뀌었습니다. 새 상사는 컬럼비아에서 왔고, 볼리바르 말을 배우지 않았습니다.', k: 'note', fx: { h: -1 } })),
  E('bol_a10_drinks', [16, 65], ['bolivar', 'archetype:A10'], 30, 3, (s) => ({ t: '회식이었습니다. 카지노 바였습니다. 상사가 테이블에서 잃은 돈이 부서 회식비였습니다.', k: 'note', fx: { h: 1, cap: { ties: 0.02 } } })),
  E('bol_fra_shift', [16, 70], [T('BOL_FRANCHISE')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'manager' ? '점장이 되었습니다. 열쇠와 매뉴얼 두 권을 받았습니다.' : id === 'hq' ? '본사 직원이 되었습니다. 유니폼을 반납했습니다.' : '임원이 되었습니다. 명함에 회사 이름이 제 이름보다 작아졌습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('bol_fra_after', [16, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'arrest' ? '체포된 뒤의 일입니다. 창고 뒤쪽 상자가 혐의였고, 보지 않았다는 말은 통하지 않았습니다.' : '회사를 나온 뒤의 일입니다. 웃는 얼굴이 한동안 저절로 나왔습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'BOL_FRANCHISE') }),
];

// ── 나머지. BOL_FACTORY 도솔레스 사치품 공장 (A11: worker → skilled → foreman → exit) ──
const factory = [
  E('bol_fac_w_line', [14, 50], [T('BOL_FACTORY', 'worker')], 45, 2, (s) => ({ t: '사치품 공장 라인에 섰습니다. 만드는 것은 제 한 해 급여보다 비쌌고, 손에 들어 본 적은 라인 위뿐이었습니다.', k: 'ev', fx: { cap: { skill: 0.03 } } })),
  E('bol_fac_w_safe', [14, 50], [T('BOL_FACTORY', 'worker')], 40, 2, (s) => ({ t: '싸우는 것보다 안전하고 돈도 된다고 했습니다. 맞는 말이었습니다. 저녁에 공장 뒷문으로 오는 사람들만 빼면.', k: 'note', fx: { h: 1, money: medX(s, 0.05) } })),
  E('bol_fac_s_craft', [18, 60], [T('BOL_FACTORY', 'skilled')], 45, 2, (s) => ({ t: '숙련공이 되어 마무리 공정을 맡았습니다. 손끝으로 흠을 찾았습니다. 찾은 흠은 제 급여에서 나갔습니다.', k: 'ev', fx: { cap: { skill: 0.04 }, money: medX(s, 0.05) } })),
  E('bol_fac_s_offer', [18, 60], [T('BOL_FACTORY', 'skilled')], 35, 3, (s) => ({ t: '뒷문 사람들이 숙련공을 찾았습니다. 같은 기술로 다른 물건을 만들자고 했습니다. 값은 세 배였습니다.', k: 'bad', fx: { h: -1 } })),
  E('bol_fac_f_quota', [24, 65], [T('BOL_FACTORY', 'foreman')], 45, 2, (s) => ({ t: '반장으로서 할당을 받았습니다. 라인 스물넷에 할당은 서른의 몫이었습니다. 야근표를 짰습니다.', k: 'bad', fx: { standing: 3, h: -2, f: F('공장 할당표, ' + s.year + '년') } })),
  E('bol_fac_f_accident', [24, 65], [T('BOL_FACTORY', 'foreman')], 35, 3, (s) => ({ t: '라인에서 사고가 났습니다. 손가락 둘. 보고서는 썼고, 보상 칸은 공장 규정에 없었습니다.', k: 'bad', fx: { h: -4, f: F('공장 사고 보고서, ' + s.year + '년') } })),
  E('bol_fac_x_choice', [26, 70], [T('BOL_FACTORY', 'exit')], 45, 2, (s) => { s.S.flags.switchOpen = true; return { t: '공장 밖의 두 길이 보였습니다. 프랜차이즈 점포의 점원 자리와 뒷문 사람들의 자리. 둘 다 공장보다 돈이 됐습니다.', k: 'note', fx: { h: -1 } }; }),
  E('bol_fac_x_old', [26, 70], [T('BOL_FACTORY', 'exit')], 35, 3, (s) => ({ t: '공장에 남은 옛 동료를 만났습니다. 라인은 그대로였고, 반장만 바뀌어 있었습니다. 반장은 뒷문 쪽 사람이었습니다.', k: 'note', fx: { h: -1 } })),
  E('bol_fac_gang_aff', [14, 70], ['aff:BOL_FAC_GANG', T('BOL_FACTORY')], 40, 3, (s) => ({ t: '뒷문 사람들과 연결된 라인이었습니다. 급여 봉투가 둘이었습니다. 하나는 공장 것, 하나는 이름이 없는 것.', k: 'bad', fx: { money: medX(s, 0.15), h: -2 } })),
  E('bol_fac_shift', [14, 70], [T('BOL_FACTORY')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'skilled' ? '숙련공이 되었습니다. 라인의 끝자리로 옮겼습니다.' : id === 'foreman' ? '반장이 되었습니다. 할당표와 야근표를 받았습니다.' : '공장 밖으로 나갈 때가 되었습니다. 문은 둘이었습니다.', k: 'big', fx: { h: 2 } }; }, { c: stNew }),
  E('bol_fac_after', [14, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'arrest' ? '체포된 뒤의 일입니다. 뒷문 사람들은 공장 정문으로 다니고 있었습니다.' : '공장을 떠난 뒤의 일입니다. 손끝이 흠을 찾는 버릇은 남았습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'BOL_FACTORY') }),
];

// ── BOL_CITYHALL 도솔레스 시정 공무원 (A10: clerk → trade → deputy → mayor) ──
const cityhall = [
  E('bol_cit_c_desk', [18, 45], [T('BOL_CITYHALL', 'clerk')], 45, 2, (s) => ({ t: '시청 창구에 앉았습니다. 서류마다 어느 정부 양식인지 먼저 보았습니다. 도솔레스 양식은 넷 중 하나였습니다.', k: 'ev', fx: { cap: { learn: 0.03 } } })),
  E('bol_cit_c_connection', [18, 45], [T('BOL_CITYHALL', 'clerk')], 35, 3, (s) => ({ t: '옆자리 동료는 시장의 조카였습니다. 조카는 일을 적게 했고, 승진을 먼저 했습니다. 아무도 놀라지 않았습니다.', k: 'note', fx: { h: -1 } })),
  E('bol_cit_t_tariff', [21, 55], [T('BOL_CITYHALL', 'trade')], 45, 2, (s) => ({ t: '무역관리부에서 관세표를 다뤘습니다. 숫자 하나가 컨테이너 백 개였습니다. 숫자를 바꾸자는 사람이 매주 왔습니다.', k: 'ev', fx: { standing: 3, cap: { ties: 0.03 }, f: F('국제무역관리부 관세표, ' + s.year + '년') } })),
  E('bol_cit_t_port', [21, 55], [T('BOL_CITYHALL', 'trade')], 35, 3, (s) => ({ t: '인공 바다 항구를 점검했습니다. 배는 들어왔고, 화물 목록과 화물이 달랐습니다. 목록대로 적었습니다.', k: 'bad', fx: { h: -2, standing: 2 } })),
  E('bol_cit_d_stairs', [28, 65], [T('BOL_CITYHALL', 'deputy')], 45, 2, (s) => ({ t: '부국장으로서 시청 계단에 섰습니다. 아래에 시위대가 있었습니다. 내려가라는 사람과 내려가지 말라는 사람이 있었습니다.', k: 'bad', fx: { h: -3, standing: 3 } })),
  E('bol_cit_d_succession', [28, 65], [T('BOL_CITYHALL', 'deputy')], 35, 3, (s) => ({ t: '시장의 후계 이야기가 돌았습니다. 부국장 셋이 후보였습니다. 셋은 같은 식당에서 다른 시간에 점심을 먹었습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  E('bol_cit_m_office', [35, 80], [T('BOL_CITYHALL', 'mayor')], 45, 2, (s) => ({ t: '시장 집무실이었습니다. 창밖에 인공 바다가 있었습니다. 바다는 시청 예산이었고, 예산은 제 서명이었습니다.', k: 'big', fx: { standing: 4, money: medX(s, 1.5) } })),
  E('bol_cit_m_threeway', [35, 80], [T('BOL_CITYHALL', 'mayor')], 35, 3, (s) => ({ t: '세 정부의 사절을 같은 주에 받았습니다. 셋 다 도솔레스가 자기 쪽이라고 했습니다. 셋 다에게 고개를 끄덕였습니다.', k: 'note', fx: { standing: 2, h: -2 } })),
  E('bol_cit_fire_aff', [18, 80], ['aff:BOL_CIT_FIRE', T('BOL_CITYHALL')], 40, 3, (s) => ({ t: '소방서 쪽이라 불을 끄는 날이 서류를 보는 날보다 많았습니다. 퇴역 군인들이 동료였고, 불 앞에서는 어느 쪽 군인이었는지 묻지 않았습니다.', k: 'note', fx: { hl: -2, h: 2 } })),
  E('bol_cit_shift', [18, 80], [T('BOL_CITYHALL')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'trade' ? '무역관리부로 옮겼습니다. 창구에서 항구가 보이는 방으로.' : id === 'deputy' ? '부국장이 되었습니다. 결재란에 제 칸이 생겼습니다.' : '시장이 되었습니다. 전임자가 왜 떠났는지는 취임식에서 아무도 말하지 않았습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('bol_cit_after', [18, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'impeach' ? '해임된 뒤의 일입니다. 사면 조건에 추방이 있었고, 그 조건을 받았습니다.' : '시청을 떠난 뒤의 일입니다. 인공 바다 옆을 지날 때 예산 숫자가 먼저 떠올랐습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'BOL_CITYHALL') }),
];

// ── BOL_PMC 외국 PMC·현상금 사냥꾼 (A6 순회형: new → hunter → advisor) ──
const pmc = [
  E('bol_pmc_n_training', [18, 40], [T('BOL_PMC', 'new')], 45, 2, (s) => ({ t: '신입 훈련이었습니다. 두 해에 넷 중 셋이 떨어진다고 했습니다. 떨어진 셋은 어디로 가느냐고 묻자 교관이 웃었습니다.', k: 'ev', fx: { cap: { skill: 0.04 }, hl: -2, f: F('훈련 수료 집계, ' + s.year + '년') } })),
  E('bol_pmc_n_veteran', [18, 40], [T('BOL_PMC', 'new')], 35, 3, (s) => ({ t: '퇴역 군인 출신이 우대였습니다. 어느 정부 군인이었느냐는 묻지 않았습니다. 회사에는 정부가 하나였고, 그것은 고객이었습니다.', k: 'note', fx: { standing: 2 } })),
  E('bol_pmc_h_bounty', [20, 50], [T('BOL_PMC', 'hunter')], 45, 2, (s) => ({ t: '현상금 목록을 받았습니다. 이름 다섯, 값 다섯. 가장 비싼 이름은 세 정부 모두가 걸어 놓은 이름이었습니다.', k: 'ev', fx: { money: medX(s, 0.3), h: -2, f: F('현상금 공고, ' + s.year + '년') } })),
  E('bol_pmc_h_tecoma', [20, 50], [T('BOL_PMC', 'hunter')], 35, 3, (s) => ({ t: '남쪽 마을에서 사냥개 함정에 걸릴 뻔했습니다. 앞서 간 팀이 걸렸습니다. 그 팀의 장비를 회수하는 것이 임무가 되었습니다.', k: 'bad', fx: { hl: -5, h: -4 } })),
  E('bol_pmc_a_advise', [28, 60], [T('BOL_PMC', 'advisor')], 45, 2, (s) => ({ t: '군사고문으로 연립정부군 부대에 붙었습니다. 조언은 들었고, 급여는 분대 전체와 같았습니다. 조언대로 하는 날은 드물었습니다.', k: 'ev', fx: { money: medX(s, 0.5), standing: 3 } })),
  E('bol_pmc_a_blacksteel', [28, 60], [T('BOL_PMC', 'advisor')], 35, 3, (s) => ({ t: '블랙스틸 쪽 고문과 같은 회의에 앉았습니다. 그쪽은 규칙이 다섯이었고, 저희는 규칙이 없었습니다. 급여는 그쪽이 두 배였습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),
  E('bol_pmc_hound_aff', [18, 60], ['aff:BOL_PMC_HOUND', T('BOL_PMC')], 40, 3, (s) => ({ t: '사냥개 조련이었습니다. 개는 말을 들었고, 개를 반대하는 동료는 말을 듣지 않았습니다. 페로 동료 둘이 부대를 떠났습니다.', k: 'note', fx: { cap: { skill: 0.03 }, h: -2 } })),
  E('bol_pmc_visit_sargon', [18, 60], [T('BOL_PMC'), 'visit:sargon'], 40, 2, (s) => ({ t: '사르곤 아미르의 계약으로 사막에 있었습니다. 모래와 열. 볼리바르의 우기가 그리운 날이 올 줄 몰랐습니다.', k: 'note', fx: { hl: -2, money: medX(s, 0.2) } })),
  E('bol_pmc_visit_columbia', [18, 60], [T('BOL_PMC'), 'visit:columbia'], 40, 2, (s) => ({ t: '컬럼비아 본사에서 재계약 면담을 했습니다. 면담자는 볼리바르 전선을 지도로만 알았습니다. 지도에는 사냥개가 없었습니다.', k: 'note', fx: { standing: 2 } })),
  E('bol_pmc_shift', [18, 60], [T('BOL_PMC')], 400, 2, (s) => ({ t: stageId(s) === 'hunter' ? '정식 대원이 되었습니다. 번호 대신 이름을 돌려받았습니다.' : '군사고문이 되었습니다. 총 대신 지도를 들었습니다.', k: 'big', fx: { h: 3 } }), { c: stNew }),
  E('bol_pmc_after', [18, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'contract_end' ? '계약이 끝난 뒤의 일입니다. 퇴직금은 장비 반납 영수증이었습니다.' : '회사를 떠난 뒤의 일입니다. 사냥개 소리가 아닌 개 소리에도 몸이 먼저 움직였습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'BOL_PMC') }),
];

// ── BOL_CHAMPION 워리어 챔피언십 (A2 연례: qualifier → forty → rounds → champion) ──
const champion = [
  E('bol_cha_q_eat', [16, 45], [T('BOL_CHAMPION', 'qualifier')], 50, 1, (s) => ({ t: '예선 첫 종목은 먹기였습니다. 열흘 예선의 첫날. 접시 스물을 비웠고, 옆 사람은 스물둘이었습니다.', k: 'ev', fx: { hl: -2, h: 2, f: F('챔피언십 예선 기록, ' + s.year + '년') } })),
  E('bol_cha_q_cycle', [16, 45], [T('BOL_CHAMPION', 'qualifier')], 45, 1, (s) => ({ t: '사이클과 근접전이 같은 날이었습니다. 자전거에서 내려 바로 싸웠습니다. 관객은 그쪽을 더 좋아했습니다.', k: 'ev', fx: { cap: { skill: 0.03 }, hl: -2 } })),
  E('bol_cha_f_vote', [16, 45], [T('BOL_CHAMPION', 'forty')], 50, 1, (s) => ({ t: '마흔 명 안에 들었습니다. 관객 투표가 있었습니다. 표는 얼굴에 붙었고, 실력은 그 다음이었습니다.', k: 'note', fx: { standing: 4, h: 2 } })),
  E('bol_cha_f_treasure', [16, 45], [T('BOL_CHAMPION', 'forty')], 45, 1, (s) => ({ t: '보물찾기 라운드였습니다. 도시 전체가 경기장이었고, 시민들은 창문에서 구경했습니다. 보물은 시장 집무실 근처에 있었습니다.', k: 'ev', fx: { cap: { ties: 0.02 } } })),
  E('bol_cha_r_triathlon', [16, 45], [T('BOL_CHAMPION', 'rounds')], 50, 1, (s) => ({ t: '철인 세 종목이었습니다. 인공 바다를 헤엄쳤습니다. 염분을 넣은 물이라 눈이 아팠습니다.', k: 'ev', fx: { hl: -4, standing: 3 } })),
  E('bol_cha_r_royale', [16, 45], [T('BOL_CHAMPION', 'rounds')], 45, 1, (s) => ({ t: '크루즈선 배틀로얄이었습니다. 배 위에서 마지막 여섯. 바다로 떨어진 사람은 구조선이 건졌습니다. 대부분은.', k: 'bad', fx: { hl: -6, h: -2 } })),
  E('bol_cha_c_button', [16, 45], [T('BOL_CHAMPION', 'champion')], 60, 1, (s) => ({ t: '우승이었습니다. 수문 버튼을 눌렀고, 인공 바다가 열렸습니다. 크루즈선 이틀. 그 이틀 동안 도솔레스가 제 이름을 불렀습니다.', k: 'big', fx: { h: 8, money: medX(s, 3), standing: 10 }, f: F('도솔레스 워리어 챔피언십 공식 기록, ' + s.year + '년') })),
  E('bol_cha_c_after_fame', [16, 45], [T('BOL_CHAMPION', 'champion')], 45, 1, (s) => ({ t: '챔피언의 한 해였습니다. 광고가 둘, 카지노 초대가 셋. 다음 대회가 다가오자 초대는 하나로 줄었습니다.', k: 'note', fx: { money: medX(s, 0.5), h: 1 } })),
  E('bol_cha_army_aff', [16, 45], ['aff:BOL_CHA_ARMY', T('BOL_CHAMPION')], 40, 2, (s) => ({ t: '군인 팀이었습니다. 부대에서 휴가를 주었고, 휴가 조건은 우승이었습니다.', k: 'note', fx: { standing: 2 } })),
  E('bol_cha_shift', [16, 45], [T('BOL_CHAMPION')], 400, 1, (s) => { const id = stageId(s); return { t: id === 'forty' ? '예선을 통과했습니다. 마흔 명 명단에 이름이 올랐습니다.' : id === 'rounds' ? '본선 세 라운드에 들었습니다. 도시 전광판에 얼굴이 나왔습니다.' : '우승했습니다. 챔피언이었습니다.', k: 'big', fx: { h: 4 } }; }, { c: stNew }),
  E('bol_cha_after', [16, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'injury' ? '대회에서 다친 뒤의 일입니다. 전광판에 나온 얼굴을 알아보는 사람이 한 해는 있었습니다.' : '탈락한 뒤의 일입니다. 관객 투표였습니다. 옛 일터로 돌아갔고, 일터는 그대로였습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'BOL_CHAMPION') }),
];

// ── BOL_STREET 거리예술가 (A12: street → community → leader) ──
const street = [
  E('bol_str_s_corner', [10, 40], [T('BOL_STREET', 'street')], 45, 2, (s) => ({ t: '길모퉁이에서 공연했습니다. 모자에 동전. 군인이 지나가면 노래를 바꿨습니다. 어느 쪽 군인이냐에 따라.', k: 'ev', fx: { cap: { arts: 0.03 }, money: medX(s, 0.02) } })),
  E('bol_str_s_techno', [10, 40], [T('BOL_STREET', 'street')], 35, 3, (s) => ({ t: '키 작은 이주민들이 기계 음악을 틀었습니다. 거리가 밤새 흔들렸습니다. 경비대는 소리를 끄러 왔다가 춤을 보고 갔습니다.', k: 'warm', fx: { h: 3 } })),
  E('bol_str_c_wall', [14, 60], [T('BOL_STREET', 'community')], 45, 2, (s) => ({ t: '공동체 벽에 그림을 그렸습니다. 세 정부 깃발을 다 그렸고, 그 위에 사람을 그렸습니다. 벽은 세 번 지워졌습니다.', k: 'ev', fx: { cap: { arts: 0.04 }, standing: 3 } })),
  E('bol_str_c_land', [14, 60], [T('BOL_STREET', 'community')], 35, 3, (s) => ({ t: '공동체 땅을 비우라는 통지가 왔습니다. 대위의 이름이었습니다. 통지서로 종이비행기를 접어 날렸고, 다음 통지서는 더 두꺼웠습니다.', k: 'bad', fx: { h: -3 } })),
  E('bol_str_l_festival', [20, 80], [T('BOL_STREET', 'leader')], 45, 2, (s) => ({ t: '공동체 지도자로 거리 축제를 열었습니다. 사흘. 세 정부 군인이 다 왔고, 사흘 동안 아무도 총을 꺼내지 않았습니다.', k: 'big', fx: { standing: 4, h: 4, f: F('도솔레스 거리 축제 허가, ' + s.year + '년') } })),
  E('bol_str_l_court', [20, 80], [T('BOL_STREET', 'leader')], 35, 3, (s) => ({ t: '토지 재판에 공동체 대표로 섰습니다. 재판은 어느 정부 법으로 할지에서 멈췄습니다. 멈춘 동안 땅은 저희 것이었습니다.', k: 'note', fx: { cap: { ties: 0.04 } } })),
  E('bol_str_durin_aff', [10, 80], ['aff:BOL_STR_DURIN', T('BOL_STREET')], 40, 3, (s) => ({ t: '두린 이주민 공동체였습니다. 기계와 음악이 같은 작업대에 있었습니다. 키는 작았고 소리는 컸습니다.', k: 'warm', fx: { cap: { arts: 0.03 }, h: 1 } })),
  E('bol_str_shift', [10, 80], [T('BOL_STREET')], 400, 2, (s) => ({ t: stageId(s) === 'community' ? '공동체에 들어갔습니다. 모자 대신 벽을 받았습니다.' : '공동체 지도자가 되었습니다. 통지서가 제 이름으로 오기 시작했습니다.', k: 'big', fx: { h: 3 } }), { c: stNew }),
  E('bol_str_after', [10, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'infected' ? '판정을 받은 뒤의 일입니다. 허가 구역 안의 바에서만 노래할 수 있었습니다.' : '거리를 떠난 뒤의 일입니다. 모퉁이를 지날 때 발이 멈췄습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'BOL_STREET') }),
];

// ── BOL_REFUGEE 난민 (A11 붕괴형: flee(forced) → camp → resettle). 진입은 전시·대행진 연동 ──
const refugee = [
  E('bol_ref_enter_war', [0, 90], ['bolivar', 'war', '!track:BOL_REFUGEE'], 50, 2, (s) => { s.enterTrack('BOL_REFUGEE', { how: 'forced', via: 'destroyed_land', quiet: true }); return { t: '마을이 전선이 되었습니다. 밤에 떠났습니다. 가져간 것은 들 수 있는 만큼이었고, 들 수 있는 것은 적었습니다.', k: 'bad', fx: { h: -6, money: -medX(s, 0.3) } }; }, { c: (s) => s.S.q <= 2 && (!s.S.track || trk(s, 'BOL_PLANT') || trk(s, 'BOL_STREET')) && s.rng.chance(0.25) }),
  E('bol_ref_enter_1101', [0, 90], ['bolivar', '!track:BOL_REFUGEE'], 60, 1, (s) => { s.enterTrack('BOL_REFUGEE', { how: 'forced', via: 'march_1101', quiet: true }); return { t: '대행진 뒤에 돌아갈 마을이 없었습니다. 행렬이 그대로 피난 행렬이 되었습니다.', k: 'bad', fx: { h: -5 } }; }, { c: (s) => s.S.flags.big_bolivar_1101_live != null && s.year <= 1102 && s.S.q <= 2 && (!s.S.track || trk(s, 'BOL_PLANT')) && s.rng.chance(0.3) }),
  E('bol_ref_f_road', [0, 90], [T('BOL_REFUGEE', 'flee')], 50, 1, (s) => ({ t: '길 위였습니다. 검문소마다 어느 쪽 사람이냐고 물었고, 아무 쪽도 아니라고 하면 통과시키는 곳과 돌려보내는 곳이 있었습니다.', k: 'bad', fx: { hl: -3, h: -3 } })),
  E('bol_ref_f_hunger', [0, 90], [T('BOL_REFUGEE', 'flee')], 45, 1, (s) => ({ t: '이틀을 굶었습니다. 셋째 날 마을에서 ' + eul(cul(s).food) + ' 나눠 주었습니다. 마을 사람들도 많지 않았습니다.', k: 'bad', fx: { hl: -4 } })),
  E('bol_ref_c_tent', [0, 90], [T('BOL_REFUGEE', 'camp')], 50, 1, (s) => ({ t: '수용소 천막이었습니다. 한 천막에 열둘. 배급은 하루 한 번이었고, 한 번은 한 번이었습니다.', k: 'bad', fx: { hl: -2, h: -2, f: F('수용소 배급 대장, ' + s.year + '년') } })),
  E('bol_ref_c_recruit', [12, 30], [T('BOL_REFUGEE', 'camp')], 40, 2, (s) => ({ t: '수용소에 예비팀 모집이 왔습니다. 열두 살부터. 밥을 준다고 했습니다. 몇은 따라갔습니다.', k: 'bad', fx: { h: -3 } })),
  E('bol_ref_r_dossoles', [0, 90], [T('BOL_REFUGEE', 'resettle')], 50, 1, (s) => { s.S.flags.switchOpen = true; return { t: '도솔레스 변두리에 방을 얻었습니다. 창문은 없었고, 문은 있었습니다. 문이 있는 것이 오랜만이었습니다.', k: 'warm', fx: { h: 4 } }; }),
  E('bol_ref_r_paper', [0, 90], [T('BOL_REFUGEE', 'resettle')], 40, 2, (s) => ({ t: '재정착 서류를 받았습니다. 어느 정부 서류인지 보았습니다. 그 정부가 바뀌면 서류도 바뀐다는 것을 알면서 받았습니다.', k: 'note', fx: { h: 1 } })),
  E('bol_ref_columbia_aff', [0, 90], ['aff:BOL_REF_COLUMBIA', T('BOL_REFUGEE')], 40, 2, (s) => ({ t: '북쪽 국경 가까이에 수용되었습니다. 밤마다 몇 가족이 북쪽으로 사라졌습니다. 돌아온 가족은 없었습니다. 그것이 좋은 소식인지 나쁜 소식인지 몰랐습니다.', k: 'note', fx: { h: -1 } })),
  E('bol_ref_shift', [0, 90], [T('BOL_REFUGEE')], 400, 1, (s) => ({ t: stageId(s) === 'camp' ? '수용소에 들어갔습니다. 번호표를 받았고, 번호표가 이름이었습니다.' : '재정착 허가가 났습니다. 천막에서 방으로.', k: 'ev', fx: { h: 2 } }), { c: stNew }),
  E('bol_ref_after', [0, 95], [], 500, 1, (s) => ({ t: '수용소를 떠난 뒤의 일입니다. 번호표는 버렸고, 번호는 외워져 있었습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'BOL_REFUGEE') }),
];

// ── 신참·관계·방문·전시·캐논 ──────────────────────────────────────────────
const misc = [
  E('bol_newcomer_which', [10, 80], ['bolivar', 'newcomer'], 40, 2, (s) => ({ t: '처음 들은 인사가 ' + cul(s).greet + '였습니다. 대답을 못 하자 상대가 대신 정해 주었습니다.', k: 'note', fx: { h: -1 } })),
  E('bol_newcomer_papers', [10, 80], ['bolivar', 'newcomer'], 35, 3, (s) => ({ t: '서류를 세 정부 등기소 중 어디에 낼지 몰랐습니다. 가장 가까운 곳에 냈고, 그것이 정답이었습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),
  E('bol_newcomer_coffee', [10, 80], ['bolivar', 'newcomer'], 30, 3, (s) => ({ t: '이웃이 ' + eul(cul(s).drink) + ' 내왔습니다. 어느 쪽 사람이든 커피는 같다고 했습니다. 그 말이 이 나라에서 들은 가장 다정한 말이었습니다.', k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } })),
  E('bol_rel_inst', [10, 80], ['bolivar', 'rel:institutional'], 35, 3, (s) => ({ t: '징집 서류에 종족 칸이 있었습니다. 그 칸이 배치를 정했습니다. 앞줄이었습니다.', k: 'bad', fx: { h: -2 } })),
  E('bol_rel_cultural', [10, 80], ['bolivar', 'rel:cultural'], 30, 3, (s) => ({ t: '가게 주인이 값을 말하기 전에 귀를 한 번 보았습니다. 값은 조금 달랐습니다.', k: 'note', fx: { money: -medX(s, 0.02) } })),
  E('bol_rel_favored', [10, 80], ['bolivar', 'rel:favored'], 25, 4, (s) => ({ t: '검문소에서 얼굴만 보고 통과시켰습니다. 뒤에 선 사람은 서류를 두 번 보였습니다.', k: 'note', fx: { h: 1 } })),
  E('bol_visit_in_three', [12, 80], ['visit:bolivar'], 35, 2, (s) => ({ t: '볼리바르에 머무는 동안 어느 쪽 사람이냐는 질문을 하루에 세 번 받았습니다. 외국인이라고 하면 네 번째 질문이 왔습니다.', k: 'note', fx: { h: -1 } })),
  E('bol_visit_in_coffee', [12, 80], ['visit:bolivar'], 35, 2, (s) => ({ t: '볼리바르의 커피는 쌌고 좋았습니다. 그 커피를 만드는 사람들은 마시지 못한다는 것을 떠날 때쯤 알았습니다.', k: 'note', fx: { h: 1 } })),
  E('bol_war_three', [8, 90], ['bolivar', 'war', '!track:BOL_SINGAS', '!track:BOL_COALITION', '!track:BOL_TRUE'], 50, 2, (s) => ({ t: '세 정부가 동시에 싸웠습니다. 마을 길목이 세 번 주인을 바꿨습니다. 집은 그대로였고, 창문은 아니었습니다.', k: 'bad', fx: { h: -3, money: -medX(s, 0.05) } }), { rep: true }),
  E('bol_war_dossoles', [8, 90], ['bolivar', 'war', 'urban'], 35, 3, (s) => ({ t: '도솔레스는 전시에도 카지노를 열었습니다. 군인 손님이 늘었습니다. 세 정부 군복이 같은 테이블에 앉았습니다.', k: 'note', fx: { h: 1 } })),
  E('bol_canon_tequila', [10, 80], ['bolivar'], 60, 1, (s) => { const f = canonOpen(s, 'tequila'); canonSeen(s, f); return { t: '무역관리부 부국장이 시청 계단에서 시위대 쪽으로 혼자 내려가는 것을 보았습니다. 부국장의 이름이 ' + f.name + rago('') + ' 옆 사람이 말했습니다.', k: 'note', fx: { h: 1 } }; }, { c: (s) => (trk(s, 'BOL_CITYHALL') || trk(s, 'BOL_TRUE') || bolFaction(s) === 'dossoles') && !!canonOpen(s, 'tequila') }),
  E('bol_canon_candela', [10, 80], ['bolivar'], 60, 1, (s) => { const f = canonOpen(s, 'candela'); canonSeen(s, f); return { t: '시장이 탄 차가 지나갔습니다. 카지노 거리의 음악이 한 박자 늦게 다시 시작되었습니다. 시장 ' + f.name + '의 얼굴은 차창 너머로만 보았습니다.', k: 'note', fx: { cap: { ties: 0.01 } } }; }, { c: (s) => (trk(s, 'BOL_CITYHALL') || trk(s, 'BOL_CASINO') || bolFaction(s) === 'dossoles') && !!canonOpen(s, 'candela') }),
  E('bol_canon_pancho', [10, 80], ['bolivar'], 60, 1, (s) => { const f = canonOpen(s, 'pancho'); canonSeen(s, f); return { t: '해방구의 노인이 청년 예비팀 앞에서 연설을 끝내고 바로 끌려갔다는 소문이 돌았습니다. ' + f.name + '. 연설을 들은 사람은 많았고, 끌려가는 것을 본 사람은 없었습니다.', k: 'note', fx: { h: -1 } }; }, { c: (s) => (trk(s, 'BOL_TRUE') || bolFaction(s) === 'liberated') && !!canonOpen(s, 'pancho') }),
];

misc.push(E('bol_a4_service', [15, 19], ['bolivar', '!serving'], 500, 1, (s) => { s.S.served = s.S.served || 3; return { t: '입대로 의무복무를 갈음했습니다. 등기소의 복무 명부에 부대 이름이 올랐습니다.', k: 'note' }; }, { c: (s) => !s.S.served && (trk(s, 'BOL_SINGAS') || trk(s, 'BOL_COALITION') || trk(s, 'BOL_TRUE')) }));

export const events = [].concat(singas, coalition, trueB, plant, casino, franchise, factory, cityhall, pmc, champion, street, refugee, misc);

// ── 결정 ─────────────────────────────────────────────────────────────────────
const marryOk = (id) => (s) => ENGINE_DECISIONS.marry.ok(s) && !!s.S.flags.y_marry && !!s.S.flags.y_marry.v && s.S.flags.y_marry.v.type.id === id;
const marryPick = (s, p) => { const r = s.S.flags.y_marry && s.S.flags.y_marry.v; if (!r) return null; Object.assign(p, r); return r; };
const CH = [{ k: 'accept', label: '받아들인다', auto: 1.4 }, { k: 'hold', label: '보류한다', auto: 0.5 }, { k: 'decline', label: '거절한다', auto: 0.4 }];
/** 혼인 유형 id 가 다른 나라에도 있으므로 볼리바르일 때만 문구를 바꾸고, 그 밖은 엔진 결정에 위임한다 */
const marryBol = (id, body) => ({
  once: false, at: 0.45, ok: marryOk(id),
  build: (s, p) => { if (s.S.cur !== 'bolivar') return ENGINE_DECISIONS.marry.build(s, p); const r = marryPick(s, p); if (!r) return null; return { title: r.type.name, body: body(s, r.prospect, r.type), choices: CH }; },
  apply: (s, k, p) => ENGINE_DECISIONS.marry.apply(s, k, p),
});

export const decisions = {
  marry_church: marryBol('church', (s, pr) => wa(pr.name) + ' 성당에서 혼인하자는 말이 나왔습니다. 신부가 어느 정부 쪽 성당인지 먼저 물었고, 가까운 쪽이라고 답했습니다.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람입니다.' : '')),
  marry_civil: marryBol('civil', (s, pr) => wa(pr.name) + ' 도솔레스 시청에 혼인을 올리자는 말이 나왔습니다. 서류 두 장, 도장 하나. 지참금은 없고, 시청 수수료는 있습니다.'),
  marry_garrison: marryBol('garrison', (s, pr) => wa(pr.name) + ' 부대 혼인입니다. 지휘관이 증인이고, 휴가는 이틀입니다. 전시에는 하루가 됩니다.'),
  marry_camp: marryBol('camp', (s, pr) => wa(pr.name) + ' 수용소 천막 사이에서 혼인하자는 말이 나왔습니다. 증인은 같은 천막 사람들이고, 잔치는 배급 두 몫입니다.'),
  // 탈영(싱가스·연립 공통)
  bol_desert: {
    tags: ['bolivar'], once: false, gap: 5, at: 0.5,
    ok: (s) => (trk(s, 'BOL_SINGAS') || trk(s, 'BOL_COALITION')) && s.S.track.stage <= 2 && s.S.age >= 17 && (s.S.flags.war || s.S.st.hl < 45 || s.S.st.h < 35) && s.rng.chance(0.3),
    build: (s) => ({ title: '담', body: '다음 배치는 돌아오는 사람이 반이라는 곳입니다. 담 너머는 ' + (bolFaction(s) === 'singas' ? '연립정부 땅' : '싱가스 땅') + '이고, 그쪽은 탈영병을 돌려보내지 않습니다. 붙잡히면 군사재판입니다.',
      choices: [{ k: 'go', label: '밤에 담을 넘는다', sub: '탈영', auto: 0.5 }, { k: 'stay', label: '배치를 받는다', auto: 1.5 }] }),
    apply: (s, k) => { if (k === 'stay') return { t: '배치를 받았습니다. 돌아왔습니다.', k: 'ev', fx: { hl: -5, standing: 3 } };
      if (s.rng.chance(0.3)) { s.applyExit('prison:jail', 'courtmartial'); return false; }
      s.applyExit('exile', 'desert'); return false; },
  },
  // 소년병 거부(해방구 예비팀)
  bol_child_refuse: {
    tags: ['bolivar', '!track:BOL_TRUE'], once: true, at: 0.4,
    ok: (s) => bolFaction(s) === 'liberated' && s.S.age >= 12 && s.S.age <= 15 && !s.S.track && s.rng.chance(0.5),
    build: (s) => ({ title: '예비팀', body: '청년 예비팀 모집이 집까지 왔습니다. 열두 살부터. 밥과 신발을 준다고 했고, 거부한 집은 배급에서 빠진다고 했습니다.',
      choices: [{ k: 'join', label: '예비팀에 간다', auto: 1 }, { k: 'refuse', label: '거부한다', sub: '배급 제외', auto: 0.6 }, { k: 'flee', label: '밤에 북쪽으로 떠난다', sub: '난민', auto: 0.4 }] }),
    apply: (s, k) => {
      if (k === 'join') return s.enterTrack('BOL_TRUE', { how: 'choose', via: 'youth_reserve', quiet: true }) ? { t: '예비팀에 들어갔습니다. 나무 총을 받았습니다.', k: 'bad', fx: { h: -2 } } : '모집은 지나갔습니다.';
      if (k === 'flee') { s.enterTrack('BOL_REFUGEE', { how: 'forced', via: 'destroyed_land', quiet: true }); return { t: '밤에 떠났습니다. 가족이 함께였고, 집은 아니었습니다.', k: 'bad', fx: { h: -4 } }; }
      return { t: '거부했습니다. 그 해 배급표에 저희 집이 없었습니다. 이웃이 나눠 주었습니다.', k: 'bad', fx: { hl: -4, h: -2, money: -medX(s, 0.1) } }; },
  },
  // 징집 면제(연립 징집병 첫해)
  bol_draft_buyout: {
    tags: [T('BOL_COALITION', 'draftee')], once: true, at: 0.3,
    ok: (s) => trk(s, 'BOL_COALITION') && s.S.track.stage === 0 && s.S.age - s.S.track.since <= 1 && s.S.money >= s.med * 0.8 && s.rng.chance(0.8),
    build: (s) => ({ title: '면제', body: '과두의 사람이 왔습니다. ' + Math.round(s.med * 0.8).toLocaleString() + ' LMD를 내면 징집 명부에서 이름이 빠집니다. 돈이 없는 집은 이 제안을 받지 못합니다.',
      choices: [{ k: 'pay', label: '낸다', auto: 1 }, { k: 'no', label: '복무한다', auto: 1 }] }),
    apply: (s, k) => { if (k === 'no') return '명부에 남았습니다.'; s.S.money -= Math.round(s.med * 0.8); s.leaveTrack('discharged', { quiet: true }); return { t: '냈습니다. 명부에서 이름이 빠졌고, 빠진 자리에 다른 이름이 들어갔습니다.', k: 'note', fx: { h: -1 } }; },
  },
  // 챔피언십 참가(연례 1회성)
  bol_champion_enter: {
    tags: ['bolivar', '!track:BOL_CHAMPION'], once: false, gap: 4, at: 0.35,
    ok: (s) => s.S.age >= 16 && s.S.age <= 40 && skillZ(s) >= 0.5 && !s.S.serving && !s.S.prison && (!s.S.track || ((trk(s, 'BOL_FACTORY') || trk(s, 'BOL_PLANT') || trk(s, 'BOL_SINGAS') || trk(s, 'BOL_COALITION')) && s.S.track.stage <= 1)) && s.rng.chance(0.12),
    build: (s) => ({ title: '워리어 챔피언십', body: '도솔레스에서 일곱 명 팀을 모읍니다. 열흘 예선, 마흔 명, 세 라운드, 우승자는 수문 버튼과 크루즈선 이틀. 나가면 지금 일은 놓아야 합니다.',
      choices: [{ k: 'go', label: '팀에 들어간다', sub: '지금 일을 놓는다', auto: 0.5 }, { k: 'no', label: '구경만 한다', auto: 1.5 }] }),
    apply: (s, k) => { if (k === 'no') return '전광판으로 보았습니다.'; return s.enterTrack('BOL_CHAMPION', { how: 'switch', via: 'team', quiet: true, skipExam: true }) ? { t: '팀에 들어갔습니다. 일곱 명. 이름은 서로 묻지 않았고, 체중은 물었습니다.', k: 'ev', fx: { h: 2 } } : '팀은 이미 차 있었습니다.'; },
  },
  // 공장 범죄 조직
  bol_factory_gang: {
    tags: [T('BOL_FACTORY')], once: false, gap: 5, at: 0.5,
    ok: (s) => trk(s, 'BOL_FACTORY') && s.S.track.stage >= 1 && s.rng.chance(0.25),
    build: (s) => ({ title: '뒷문', body: '뒷문 사람들이 숙련공을 찾습니다. 같은 손으로 다른 물건을 만들면 값은 세 배. 공장 반장도 아는 일이고, 경비대도 아는 일입니다.',
      choices: [{ k: 'yes', label: '뒷문 일을 받는다', auto: 0.6 }, { k: 'no', label: '라인에 남는다', auto: 1.4 }] }),
    apply: (s, k) => { if (k === 'no') return '라인에 남았습니다. 뒷문 사람들은 다른 숙련공을 찾았습니다.';
      if (s.rng.chance(0.3)) { s.fall('arrest'); return false; }
      s.S.track.aff = 'BOL_FAC_GANG'; return { t: '받았습니다. 급여 봉투가 둘이 되었습니다.', k: 'bad', fx: { money: medX(s, 1), h: -2 } }; },
  },
  // 난민 컬럼비아행(수용소 또는 전시)
  bol_flee_columbia: {
    tags: ['bolivar'], once: true, at: 0.5,
    ok: (s) => (trk(s, 'BOL_REFUGEE') || (s.S.flags.war && s.S.q <= 2 && !s.S.serving)) && s.S.age >= 12 && !s.S.prison && s.rng.chance(0.35),
    build: (s) => ({ title: '북쪽', body: '밤마다 몇 가족이 북쪽 국경을 넘습니다. 컬럼비아 쪽은 서류를 묻고, 서류는 없습니다. 돌아온 가족은 없습니다. 그것이 좋은 소식인지 나쁜 소식인지 아무도 모릅니다.',
      choices: [{ k: 'go', label: '국경을 넘는다', sub: '난민', auto: 0.8 }, { k: 'stay', label: '남는다', auto: 1.2 }] }),
    apply: (s, k) => { if (k === 'stay') return '남았습니다. 북쪽으로 간 가족의 천막은 다음 날 다른 가족이 썼습니다.'; return s.migrate('flee', 'columbia') ? false : '국경에서 돌려보내졌습니다.'; },
  },
  // 시청 뇌물
  bol_cityhall_bribe: {
    tags: [T('BOL_CITYHALL')], once: false, gap: 5, at: 0.5,
    ok: (s) => trk(s, 'BOL_CITYHALL') && s.S.track.stage >= 1 && s.rng.chance(0.25),
    build: (s) => ({ title: '봉투', body: '관세표의 숫자 하나를 바꿔 달라는 사람이 봉투를 두고 갔습니다. 봉투는 반년치 급여입니다. 숫자는 컨테이너 백 개입니다.',
      choices: [{ k: 'take', label: '봉투를 받는다', auto: 0.6 }, { k: 'return', label: '돌려준다', auto: 1.2 }, { k: 'report', label: '신고한다', auto: 0.4 }] }),
    apply: (s, k) => { if (k === 'return') return '돌려주었습니다. 다음 달 다른 봉투가 왔습니다.';
      if (k === 'report') { if (s.rng.chance(0.5)) { s.S.track.standing = Math.min(100, s.S.track.standing + 8); return { t: '신고했습니다. 봉투 주인이 아니라 제가 전근되었습니다. 좋은 자리였습니다.', k: 'note', fx: { h: 1 } }; } s.S.track.standing = Math.max(0, s.S.track.standing - 10); return { t: '신고했습니다. 봉투 주인은 시장의 손님이었습니다. 전근은 제가 갔고, 나쁜 자리였습니다.', k: 'bad', fx: { h: -3 } }; }
      if (s.rng.chance(0.25)) { s.fall('impeach'); return false; }
      return { t: '받았습니다. 숫자를 바꿨습니다. 컨테이너 백 개가 서류상 커피가 되었습니다.', k: 'bad', fx: { money: medX(s, 0.9), h: -2 } }; },
  },
  // 사냥개 계약(PMC)
  bol_pmc_hound: {
    tags: [T('BOL_PMC')], once: false, gap: 5, at: 0.5,
    ok: (s) => trk(s, 'BOL_PMC') && s.S.track.stage >= 1 && s.rng.chance(0.3),
    build: (s) => ({ title: '남쪽 계약', body: '남쪽 의료 마을 쪽 계약입니다. 사냥개가 도는 땅이고, 보수는 평소의 세 배입니다. 앞서 간 팀은 장비만 돌아왔습니다.',
      choices: [{ k: 'go', label: '계약을 받는다', sub: '보수 세 배', auto: 0.7 }, { k: 'no', label: '거절한다', auto: 1.3 }] }),
    apply: (s, k) => { if (k === 'no') { s.S.track.standing = Math.max(0, s.S.track.standing - 3); return '거절했습니다. 회사는 거절을 기억했습니다.'; }
      if (s.rng.chance(0.2)) { s.applyExit('death:hound', 'hound'); return false; }
      if (s.rng.chance(0.3)) return { t: '돌아왔습니다. 다리 하나가 전처럼 움직이지 않았습니다. 보수는 세 배였습니다.', k: 'bad', fx: { hl: -15, money: medX(s, 1.5) } };
      return { t: '돌아왔습니다. 사냥개 소리를 밤마다 들었고, 돌아온 뒤에도 들었습니다.', k: 'ev', fx: { money: medX(s, 1.5), h: -3, standing: 5 } }; },
  },
  home_change: sharedDecisions.home_change,
  marry_second: sharedDecisions.marry_second,
};

export default { events, decisions };
