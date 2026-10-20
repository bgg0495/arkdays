// W9g 림 빌리턴 진로 콘텐츠 (D40 국가 전용, 텍스트 공유 0).
// 핵심 5: RIM_MINER(피트싱커→광부, 감염 위험·노조)·RIM_COMPANY(광산회사 사무직 A10)·RIM_SECURITY(보안 요원)·RIM_BUILDER(플랫폼 기술자)·RIM_INFECTED(감염자 소모품, forced) — 단계마다 4개.
// 나머지 8: RIM_AIRWATCH·RIM_TRANSPORT·RIM_MEDIC·RIM_MSG·RIM_FACTORY·RIM_FAMILY·RIM_UNION·RIM_EUREKA — 단계마다 2개. 전부 전환 서사·몰락 후일담.
// RIM_INFECTED 진입은 엔진이 하지 않으므로(정책 neglect) 여기서 판정(known) 이벤트가 ctx.enterTrack(how:'forced') 로 넣는다. 자발 추방은 ctx.migrate('exile').
// 로도스 접점: RMIA 보안 외주(S.flags.rhodes_operation = S.age)·광산 사고 구조(S.flags.rhodes_rescue = S.age). 대갱도 붕괴(bigevents rim_collapse_1107)는 S.flags.big_* 로 연동만.
// 공통 직장 이벤트(승진·과로·상사·회식)는 archetype:A10 에만(광산회사 사무직).
// 결정: 갱도 최심부 자원·노조 가입·지분 요구·자발 추방·감염 숨김·이력서·구조 자원·광산 폐쇄 전직 + marry_community·marry_company·home_change·marry_second(sargon.js 공용).
import { ENGINE_DECISIONS } from '../../src/engine/choices.js';
import { eul, iga, eun, wa, ro, ieot, rago } from '../../src/engine/text.js';
import { cul, fest, F, orgF, rhodesF, given, poor, rich, lifeRoll, once, medX } from '../_util.js';
import { sharedDecisions, canonOpen, canonSeen } from './sargon.js';
import { hoist } from '../_dispatch.js';

const T = (id, st) => 'track:' + id + (st ? ':' + st : '');
const E = (id, a, tags, w, gap, run, extra = {}) => ({ id, a, tags, w, gap, run: typeof run === 'function' ? run : () => run, ...extra });
const trk = (s, id) => !!s.S.track && s.S.track.id === id;
const stageId = (s) => (s.stage ? s.stage.id : null);
const stNew = (s) => !!s.S.track && s.S.track.stage > 0 && s.S.age - s.S.track.stageSince <= 1;
const fell = (s, id, within = 2) => !s.S.track && s.S.flags.lastTrack === id && !!s.S.flags.lastFall && s.S.flags.lastFallAt != null && s.S.age - s.S.flags.lastFallAt <= within;
const standing = (s) => (s.S.track ? s.S.track.standing : 0);
const skillZ = (s) => (s.S.cap ? s.S.cap.skill : 0);
const known = (s) => s.S.ori.on && s.S.ori.known;
const mineName = (s) => { const a = s.aff; return a && a.name ? a.name.replace(/\(.*\)$/, '') : '광산'; };

// ── 핵심 1. RIM_MINER 광부 (A5 자발형: pitsinker → miner → lead → exit) ──
const miner = [
  E('rim_min_p_deep', [12, 25], [T('RIM_MINER', 'pitsinker')], 50, 1, (s) => ({ t: '갱도 가장 깊은 곳에 먼저 들어갔습니다. 어른은 들어갈 수 없는 틈이었습니다. 틈 너머에 무엇이 있는지 보고 나오는 것이 일이었습니다.', k: 'bad', fx: { hl: -3, cap: { skill: 0.03 } } })),
  E('rim_min_p_helmet', [12, 25], [T('RIM_MINER', 'pitsinker')], 45, 2, (s) => ({ t: '헬멧이 컸습니다. 어른 것이었습니다. 끈을 두 번 감았고, 그래도 돌아갔습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_min_p_school', [12, 25], [T('RIM_MINER', 'pitsinker')], 35, 2, (s) => ({ t: '학교에 다니는 또래가 갱도 입구를 지나갔습니다. 저는 안에 있었고, 그 애는 밖에 있었습니다. 그것뿐이었습니다.', k: 'loss', fx: { h: -2 } })),
  E('rim_min_p_slug', [12, 25], [T('RIM_MINER', 'pitsinker')], 35, 2, (s) => ({ t: '틈 너머에서 슬러그 둥지를 보았습니다. 돌아 나와 보고했고, 그 갱도는 막혔습니다. 보고한 사람에게는 통조림 하나가 왔습니다.', k: 'ev', fx: { standing: 3, hl: -1 } })),
  E('rim_min_m_meal', [15, 60], [T('RIM_MINER', 'miner')], 45, 2, (s) => ({ t: '갱도 안에서 같이 밥을 먹었습니다. ' + cul(s).food + '. 한 사람이 통조림을 따면 모두가 기다렸습니다.', k: 'warm', fx: { cap: { ties: 0.03 }, h: 1 } })),
  E('rim_min_m_dust', [15, 60], [T('RIM_MINER', 'miner')], 45, 2, (s) => ({ t: '가루가 내려앉았습니다. 마스크는 회사 지급이었고, 교체는 사비였습니다. 교체하지 않는 사람이 많았습니다.', k: 'bad', fx: { hl: -3 } })),
  E('rim_min_m_payday', [15, 60], [T('RIM_MINER', 'miner')], 40, 2, (s) => ({ t: '급여일이었습니다. 광산촌 술집에 줄이 섰고, ' + eul(cul(s).drink) + ' 마셨습니다. 급여의 열에 하나가 그 밤에 나갔습니다.', k: 'warm', fx: { h: 2, money: -medX(s, 0.03), f: F('광산촌 급여일 매출 집계, ' + s.year + '년') } })),
  E('rim_min_m_safety', [15, 60], [T('RIM_MINER', 'miner')], 35, 3, (s) => ({ t: fest(s, 0) + '이었습니다. 회사가 포스터를 붙였고, 갱도는 그대로였습니다. 그 주에 사고가 둘 났습니다.', k: 'note', fx: { h: -1 }, f: orgF(s, '안전 주간 사고 집계', s.year) })),
  E('rim_min_l_shift', [21, 65], [T('RIM_MINER', 'lead')], 45, 2, (s) => ({ t: '조장으로 교대표를 짰습니다. 열둘. 가장 깊은 갱도에 누구를 넣을지 매주 정했습니다. 제 이름을 넣은 주가 가장 많았습니다.', k: 'ev', fx: { standing: 3, hl: -2, f: orgF(s, '교대 편성표', s.year) } })),
  E('rim_min_l_quota', [21, 65], [T('RIM_MINER', 'lead')], 40, 2, (s) => ({ t: '회사가 할당을 올렸습니다. 안전 규정은 그대로였습니다. 둘 다 지키는 방법은 교대를 늘리는 것뿐이었습니다.', k: 'bad', fx: { hl: -2, standing: 2 } })),
  E('rim_min_l_kids', [21, 65], [T('RIM_MINER', 'lead')], 35, 3, (s) => ({ t: '새 피트싱커들이 왔습니다. 열셋, 열넷. 헬멧 끈을 하나씩 다시 감아 주었습니다.', k: 'note', fx: { cap: { ties: 0.02 }, h: -1 } })),
  E('rim_min_l_collapse', [21, 65], [T('RIM_MINER', 'lead')], 30, 4, (s) => ({ t: '옆 갱도가 무너졌습니다. 조원 둘을 데리고 들어갔습니다. 셋을 꺼냈고, 둘은 꺼내지 못했습니다.', k: 'bad', fx: { hl: -5, h: -5, standing: 4, f: orgF(s, '갱도 사고 보고', s.year) } })),
  E('rim_min_x_offer', [24, 70], [T('RIM_MINER', 'exit')], 45, 2, (s) => { s.S.flags.switchOpen = true; return { t: '갱도 밖의 자리가 둘 보였습니다. 회사 보안의 경비 자리와 공동체 대표 쪽 자리. 둘 다 갱도보다 공기가 좋았습니다.', k: 'note', fx: { h: 1 } }; }),
  E('rim_min_x_lungs', [24, 70], [T('RIM_MINER', 'exit')], 35, 3, (s) => ({ t: '회사 검진이었습니다. 폐 사진을 보여 주었고, 설명은 해 주지 않았습니다. 사진은 회사가 가졌습니다.', k: 'bad', fx: { hl: -2, h: -2 } })),
  E('rim_min_x_old', [24, 70], [T('RIM_MINER', 'exit')], 35, 3, (s) => ({ t: '갱도 입구에 서서 교대가 들어가는 것을 보았습니다. 아는 얼굴이 반, 모르는 얼굴이 반. 모르는 얼굴이 어렸습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_min_x_union', [24, 70], [T('RIM_MINER', 'exit')], 30, 3, (s) => ({ t: '노조 사람이 찾아왔습니다. 조장 출신이 필요하다고 했습니다. 회사 사람도 찾아왔습니다. 같은 말을 했습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  E('rim_min_ironcarrot_aff', [12, 70], ['aff:RIM_MIN_IRONCARROT', T('RIM_MINER')], 40, 3, (s) => ({ t: '아이언 캐럿은 큰 광산이었습니다. 갱도가 많았고, 사고도 많았고, 사고 뒤에 오는 보안 요원도 많았습니다.', k: 'note', fx: { standing: 1 } })),
  E('rim_min_rustdreg_aff', [12, 70], ['aff:RIM_MIN_RUSTDREG', T('RIM_MINER')], 40, 3, (s) => ({ t: '러스트드레그 갱도는 오래된 곳이었습니다. 버팀목이 저보다 나이가 많았습니다. 버팀목을 믿었습니다.', k: 'bad', fx: { hl: -2 } })),
  E('rim_min_greening_aff', [12, 70], ['aff:RIM_MIN_GREENING', T('RIM_MINER')], 40, 3, (s) => ({ t: '그리닝 밸리는 폐쇄된 광산이었습니다. 폐쇄된 곳에서 캐는 사람이 있었고, 그것이 저희였습니다. 회사 이름은 없었습니다.', k: 'bad', fx: { money: medX(s, 0.1), hl: -3 } })),
  E('rim_min_shift', [12, 70], [T('RIM_MINER')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'miner' ? '광부가 되었습니다. 틈 대신 갱도를 받았고, 어른 헬멧이 맞기 시작했습니다.' : id === 'lead' ? '조장이 되었습니다. 교대표와 램프 열쇠를 받았습니다.' : '갱도 밖으로 나갈 때가 되었습니다. 폐가 먼저 알았습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('rim_min_after', [12, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'mine' || s.S.flags.lastFall === 'catastrophe' ? '사고 뒤의 일입니다. 보상 항목표는 전부 해당 없음이었고, 다리는 전처럼 움직이지 않았습니다.' : '갱도를 떠난 뒤의 일입니다. 어두운 곳에 들어가면 손이 먼저 벽을 찾았습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'RIM_MINER') }),
];

// ── 핵심 2. RIM_COMPANY 광산회사 사무직 (A10: new → middle → manager → exec) + archetype:A10 공통 직장 ──
const company = [
  E('rim_com_n_resume', [18, 35], [T('RIM_COMPANY', 'new')], 45, 2, (s) => ({ t: '이력서가 통했습니다. 자회사 사무실 책상 하나. 창밖으로 갱도 입구가 보였고, 보이지 않는 자리로 옮기는 것이 첫 목표가 되었습니다.', k: 'ev', fx: { cap: { learn: 0.03 } } })),
  E('rim_com_n_ledger', [18, 35], [T('RIM_COMPANY', 'new')], 45, 2, (s) => ({ t: '사고 보고서를 정리했습니다. 보상 항목표에 해당 없음을 적는 것이 일이었습니다. 적는 손은 빨라졌습니다.', k: 'bad', fx: { h: -2, standing: 2 } })),
  E('rim_com_n_dorm', [18, 35], [T('RIM_COMPANY', 'new')], 35, 3, (s) => ({ t: '회사 기숙사였습니다. 광부 기숙사와 벽 하나 차이였습니다. 벽 너머에서 교대 종소리가 들렸습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_com_n_miner_family', [18, 35], [T('RIM_COMPANY', 'new')], 30, 3, (s) => ({ t: '집에서는 사무직이라고 자랑했습니다. 갱도에 들어가는 형제가 있었습니다. 급여일에 같이 ' + eul(cul(s).drink) + ' 마셨고, 제가 냈습니다.', k: 'warm', fx: { money: -medX(s, 0.02), h: 1 } })),
  E('rim_com_m_report', [21, 50], [T('RIM_COMPANY', 'middle')], 45, 2, (s) => ({ t: '중간 직급으로 월간 보고서를 올렸습니다. 숫자 넷. 채굴량, 사고 수, 보상액, 이직률. 보상액은 늘 가장 작은 숫자였습니다.', k: 'ev', fx: { standing: 3, cap: { learn: 0.02 } }, f: orgF(s, '월간 경영 보고 양식', s.year) })),
  E('rim_com_m_sub', [21, 50], [T('RIM_COMPANY', 'middle')], 40, 2, (s) => ({ t: '자회사 하나가 정리되었습니다. 그쪽 사무직 서른이 본사로 이력서를 냈고, 셋이 받아들여졌습니다. 그 셋의 이력서를 제가 골랐습니다.', k: 'bad', fx: { h: -2, f: orgF(s, '자회사 정리 인사 기록', s.year) } })),
  E('rim_com_m_union', [21, 50], [T('RIM_COMPANY', 'middle')], 35, 3, (s) => ({ t: '노조 쪽 요구서가 책상에 왔습니다. 지분이라는 말이 있었습니다. 위에 올렸고, 위는 서랍이었습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_com_m_fence', [21, 50], [T('RIM_COMPANY', 'middle')], 30, 4, (s) => ({ t: '울타리 사건 때 회사가 어느 편이었는지 묻는 신입이 있었습니다. 회사는 회사 편이었다고 대답했습니다. 신입은 다시 묻지 않았습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('rim_com_mg_budget', [26, 60], [T('RIM_COMPANY', 'manager')], 45, 2, (s) => ({ t: '관리자로서 안전 예산을 짰습니다. 예산은 사고 수에 비례해 책정되었습니다. 사고가 줄면 예산도 줄었습니다.', k: 'bad', fx: { standing: 3, h: -2 } })),
  E('rim_com_mg_escort', [26, 60], [T('RIM_COMPANY', 'manager')], 35, 3, (s) => ({ t: '광산촌 방문에 보안 요원이 붙었습니다. 요원은 광부 출신이었고, 광부들은 요원을 알았고, 저는 둘 다 몰랐습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_com_mg_raid', [26, 60], [T('RIM_COMPANY', 'manager')], 30, 4, (s) => ({ t: '수송대가 도적단에 털렸습니다. 보험 서류를 썼습니다. 보험은 화물에만 있었고, 기사에게는 없었습니다.', k: 'bad', fx: { h: -3 } })),
  E('rim_com_mg_catastrophe', [26, 60], [T('RIM_COMPANY', 'manager')], 30, 3, (s) => ({ t: '재앙 예보가 왔습니다. 플레이트 이동 일정과 채굴 일정이 겹쳤습니다. 채굴을 이틀 줄였고, 그 이틀이 분기 보고에 남았습니다.', k: 'note', fx: { standing: -2, h: 1, f: orgF(s, '분기 채굴 보고', s.year) } })),
  E('rim_com_e_board', [32, 70], [T('RIM_COMPANY', 'exec')], 45, 2, (s) => ({ t: '임원 회의였습니다. 광업연합 이사 하나가 배석했습니다. 채굴량 이야기만 했고, 사람 수는 말하지 않았습니다.', k: 'big', fx: { standing: 4, money: medX(s, 1) } })),
  E('rim_com_e_guard', [32, 70], [T('RIM_COMPANY', 'exec')], 40, 2, (s) => ({ t: '경호가 붙었습니다. 둘. 광산촌에서 임원은 환영받는 사람이 아니었습니다. 경호원도 그것을 알았습니다.', k: 'note', fx: { h: -2 } })),
  E('rim_com_e_rhodes_contract', [32, 70], [T('RIM_COMPANY', 'exec')], 30, 4, (s) => { s.S.flags.rhodes_legal = s.S.age; return { t: '로도스 아일랜드와 의료 계약 서류를 주고받았습니다. 광산 감염자 처우 조항이 있었습니다. 상대 쪽 사람이 제 이름을 적어 갔습니다.', k: 'note', fx: { standing: 2 } }; }),
  E('rim_com_e_collapse', [32, 70], [T('RIM_COMPANY', 'exec')], 30, 3, (s) => ({ t: '갱도 붕괴 보고를 받았습니다. 일정 변경 없음이라는 방송 문안에 서명했습니다. 서명하는 데 걸린 시간을 기억합니다.', k: 'bad', fx: { h: -5, standing: 3 } })),
  E('rim_com_hq_aff', [18, 70], ['aff:RIM_COM_HQ', T('RIM_COMPANY')], 40, 3, (s) => ({ t: '본사였습니다. 갱도 입구가 보이지 않는 건물. 급여는 자회사보다 좋았고, 광산촌 사람들은 본사 사람을 다른 이름으로 불렀습니다.', k: 'note', fx: { money: medX(s, 0.1) } })),
  E('rim_com_rmia_aff', [18, 70], ['aff:RIM_COM_RMIA', T('RIM_COMPANY')], 40, 3, (s) => ({ t: '광업연합 보안부 사무였습니다. 보안 요원의 외주 계약서를 다뤘고, 그중 하나가 로도스 아일랜드였습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),
  // 공통 직장 이벤트(archetype:A10 전용)
  E('rim_a10_review', [18, 65], ['rim', 'archetype:A10'], 35, 2, (s) => ({ t: '인사 평가였습니다. 고과표 항목 하나가 갱도 방문 횟수였습니다. 많을수록 점수가 높았고, 아무도 많지 않았습니다.', k: 'note', fx: { standing: standing(s) > 50 ? 3 : -1 } })),
  E('rim_a10_overtime', [18, 65], ['rim', 'archetype:A10'], 35, 2, (s) => ({ t: '야근이었습니다. 분기 말. 사무실 불이 꺼질 때 갱도 교대가 들어갔습니다. 둘 다 밤이었습니다.', k: 'bad', fx: { hl: -2, standing: 2 } })),
  E('rim_a10_boss', [18, 65], ['rim', 'archetype:A10'], 30, 3, (s) => ({ t: '상사가 바뀌었습니다. 새 상사는 빅토리아에서 왔고, 광산에 들어가 본 적이 없다고 자랑처럼 말했습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_a10_drinks', [18, 65], ['rim', 'archetype:A10'], 30, 3, (s) => ({ t: '회식이었습니다. 광산촌 술집. 옆 테이블은 광부 교대였고, 회식비로 그쪽 ' + eul(cul(s).drink) + ' 한 잔씩 돌렸습니다. 상사가 돌리라고 했습니다.', k: 'note', fx: { h: 1, cap: { ties: 0.02 } } })),
  E('rim_com_shift', [18, 70], [T('RIM_COMPANY')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'middle' ? '중간 직급이 되었습니다. 책상이 창가에서 안쪽으로 옮겨졌습니다.' : id === 'manager' ? '관리자가 되었습니다. 방이 생겼고, 방에는 갱도 지도가 걸려 있었습니다.' : '임원이 되었습니다. 경호원이 먼저 인사했습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('rim_com_after', [18, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'bankrupt' ? '자회사가 정리된 뒤의 일입니다. 이력서를 열 군데 냈습니다. 광산회사는 다 같은 회사였습니다.' : '회사를 나온 뒤의 일입니다. 보상 항목표를 더는 적지 않아도 되었습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'RIM_COMPANY') }),
];

// ── 핵심 3. RIM_SECURITY 광산회사 보안 (A6: guard → agent → escort → rmia) ──
const security = [
  E('rim_sec_g_gate', [16, 45], [T('RIM_SECURITY', 'guard')], 45, 2, (s) => ({ t: '갱도 입구 경비였습니다. 들어가는 사람을 세고 나오는 사람을 셌습니다. 숫자가 다른 날이 한 해에 몇 번 있었습니다.', k: 'bad', fx: { h: -2, standing: 2 } })),
  E('rim_sec_g_miner', [16, 45], [T('RIM_SECURITY', 'guard')], 40, 2, (s) => ({ t: '옛 교대 동료들이 경비 앞을 지났습니다. 인사했습니다. 그쪽은 제복을 보았고, 얼굴은 나중에 보았습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_sec_g_strike', [16, 45], [T('RIM_SECURITY', 'guard')], 35, 3, (s) => ({ t: '광부들이 갱도 앞에 앉았습니다. 회사는 치우라고 했습니다. 치우지 않았고, 다음 날 다른 경비가 왔습니다.', k: 'bad', fx: { standing: -3, h: 1 } })),
  E('rim_sec_g_helmet', [16, 45], [T('RIM_SECURITY', 'guard')], 30, 3, (s) => ({ t: '새 피트싱커들이 들어가는 아침이었습니다. 헬멧 끈을 하나씩 고쳐 주었습니다. 경비의 일은 아니었습니다.', k: 'warm', fx: { h: 2 } })),
  E('rim_sec_a_patrol', [19, 55], [T('RIM_SECURITY', 'agent')], 45, 2, (s) => ({ t: '보안 요원으로 수송로를 돌았습니다. 도적단 흔적을 찾았고, 찾은 날은 보고서를, 못 찾은 날은 같은 보고서를 썼습니다.', k: 'ev', fx: { cap: { skill: 0.03 }, standing: 2 } })),
  E('rim_sec_a_bandit', [19, 55], [T('RIM_SECURITY', 'agent')], 40, 2, (s) => ({ t: '도적단과 교전했습니다. 수송대는 지켰고, 요원 하나가 돌아오지 않았습니다. 회사는 화물 목록을 먼저 확인했습니다.', k: 'bad', fx: { hl: -5, h: -4, standing: 4, f: orgF(s, '수송 보안 보고', s.year) } })),
  E('rim_sec_a_rescue', [19, 55], [T('RIM_SECURITY', 'agent')], 35, 3, (s) => ({ t: '갱도 사고 현장에 먼저 들어갔습니다. 보안 요원의 일이 아니었습니다. 광부 출신이라 먼저 들어갔습니다.', k: 'ev', fx: { hl: -3, standing: 3, h: 1 } })),
  E('rim_sec_a_rhodes_op', [19, 55], [T('RIM_SECURITY', 'agent')], 30, 5, (s) => { s.S.flags.rhodes_operation = s.S.age; return { t: '광업연합 보안부가 로도스 아일랜드에 외주를 주었습니다. 같은 작전에 섰습니다. 그쪽 사람 하나가 제 이름을 물어 갔습니다.', k: 'note', fx: { standing: 2 }, f: rhodesF('외주 작전 기록') }; }),
  E('rim_sec_e_exec', [25, 60], [T('RIM_SECURITY', 'escort')], 45, 2, (s) => ({ t: '임원 경호였습니다. 임원이 광산촌에 내리면 사람들의 눈을 먼저 보았습니다. 눈은 임원이 아니라 저를 보았습니다.', k: 'note', fx: { standing: 3, h: -2 } })),
  E('rim_sec_e_threat', [25, 60], [T('RIM_SECURITY', 'escort')], 35, 3, (s) => ({ t: '임원에게 협박 편지가 왔습니다. 노조 이름이었고, 노조는 아니라고 했습니다. 경호가 둘에서 넷이 되었습니다.', k: 'bad', fx: { h: -2, f: orgF(s, '임원 경호 편성', s.year) } })),
  E('rim_sec_e_car', [25, 60], [T('RIM_SECURITY', 'escort')], 30, 3, (s) => ({ t: '임원 차 옆자리에 앉았습니다. 임원은 갱도 이야기를 물었습니다. 처음 묻는 사람이었습니다. 대답은 짧게 했습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  E('rim_sec_e_victoria', [25, 60], [T('RIM_SECURITY', 'escort')], 30, 4, (s) => ({ t: '빅토리아 쪽 손님을 경호했습니다. 유레카 광산회사 사람이었습니다. 그쪽 광부 이야기는 아무도 하지 않았습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_sec_r_dept', [30, 65], [T('RIM_SECURITY', 'rmia')], 45, 2, (s) => ({ t: '광업연합 보안부였습니다. 회사 하나가 아니라 연합 전체. 명령서에 이사회 도장이 찍혀 왔습니다.', k: 'big', fx: { standing: 4, money: medX(s, 0.5) } })),
  E('rim_sec_r_outsource', [30, 65], [T('RIM_SECURITY', 'rmia')], 40, 2, (s) => { s.S.flags.rhodes_operation = s.S.age; return { t: '외주 계약을 관리했습니다. 로도스 아일랜드 쪽 작전 하나를 함께 세웠습니다. 그쪽 책임자가 광부 출신이냐고 물었고, 그렇다고 했습니다.', k: 'note', fx: { cap: { ties: 0.03 } } }; }),
  E('rim_sec_r_eureka', [30, 65], [T('RIM_SECURITY', 'rmia')], 30, 4, (s) => ({ t: '유레카 쪽 우리에 사람이 갇혀 있다는 보고였습니다. 보안부 관할이 아니라고 결론 났습니다. 결론을 적는 것이 제 일이었습니다.', k: 'bad', fx: { h: -4 } })),
  E('rim_sec_r_fence', [30, 65], [T('RIM_SECURITY', 'rmia')], 30, 4, (s) => ({ t: '울타리 사건 기념일이었습니다. 광부 연합 쪽 행사에 보안부가 참관했습니다. 참관은 감시의 다른 말이라고 광부 쪽이 말했습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_sec_escort_aff', [16, 65], ['aff:RIM_SEC_ESCORT', T('RIM_SECURITY')], 40, 3, (s) => ({ t: '임원 경호 전담이었습니다. 급여는 좋았고, 임원이 바뀌면 경호도 바뀌었습니다.', k: 'note', fx: { money: medX(s, 0.15) } })),
  E('rim_sec_rmia_aff', [16, 65], ['aff:RIM_SEC_RMIA', T('RIM_SECURITY')], 40, 3, (s) => ({ t: '연합 보안부 소속이라 회사 하나의 편이 아니었습니다. 모든 회사의 편이었고, 광부의 편은 아니었습니다.', k: 'note', fx: { standing: 2, h: -1 } })),
  E('rim_sec_shift', [16, 65], [T('RIM_SECURITY')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'agent' ? '보안 요원이 되었습니다. 입구 대신 수송로를 받았습니다.' : id === 'escort' ? '임원 경호로 옮겼습니다. 제복이 양복이 되었습니다.' : '광업연합 보안부로 올라갔습니다. 회사 이름이 명찰에서 사라졌습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('rim_sec_after', [16, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'contract_end' ? '계약이 끝난 뒤의 일입니다. 제복 반납 영수증이 퇴직금이었습니다.' : '보안을 떠난 뒤의 일입니다. 들어가는 사람과 나오는 사람을 세는 버릇이 남았습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'RIM_SECURITY') }),
];

// ── 핵심 4. RIM_BUILDER 플랫폼 건설 기술자 (A11 순회형: apprentice → technician → foreman → contract) ──
const builder = [
  E('rim_bui_a_weld', [15, 35], [T('RIM_BUILDER', 'apprentice')], 45, 2, (s) => ({ t: '플레이트 이음새를 용접했습니다. 견습은 이음새만 했습니다. 이음새가 도시 하나의 무게를 받는다는 것은 둘째 해에 알았습니다.', k: 'ev', fx: { cap: { skill: 0.04 }, hl: -1 } })),
  E('rim_bui_a_height', [15, 35], [T('RIM_BUILDER', 'apprentice')], 40, 2, (s) => ({ t: '높은 곳이었습니다. 안전줄은 둘이 하나를 썼습니다. 떨어진 사람은 올해 없었습니다.', k: 'bad', fx: { hl: -2, h: -1, f: F('플랫폼 건설 안전 점검표, ' + s.year + '년') } })),
  E('rim_bui_a_master', [15, 35], [T('RIM_BUILDER', 'apprentice')], 35, 3, (s) => ({ t: '스승 기술자가 도면을 보여 주었습니다. 읽지 못했습니다. 읽는 법을 밤에 가르쳐 주었고, 수업료는 ' + cul(s).drink + ' 한 잔이었습니다.', k: 'warm', fx: { cap: { learn: 0.03 }, h: 2 } })),
  E('rim_bui_a_catastrophe', [15, 35], [T('RIM_BUILDER', 'apprentice')], 30, 3, (s) => ({ t: '재앙이 지나간 뒤 플레이트를 점검했습니다. 이음새 셋이 갈라져 있었습니다. 제 것은 아니었습니다. 그것이 자랑이 되는 일이었습니다.', k: 'note', fx: { standing: 2 } })),
  E('rim_bui_t_plate', [18, 55], [T('RIM_BUILDER', 'technician')], 45, 2, (s) => ({ t: '기술자로서 플레이트 한 구획을 맡았습니다. 도크와 앵커 파이프라인. 연결에 열 시간, 분리에 여섯 시간. 숫자를 외웠습니다.', k: 'ev', fx: { cap: { skill: 0.03 }, standing: 2 }, f: orgF(s, '플랫폼 건설 공정표', s.year) })),
  E('rim_bui_t_foreign', [18, 55], [T('RIM_BUILDER', 'technician')], 40, 2, (s) => ({ t: '타국 주문 현장이었습니다. 도면은 림 빌리턴 것, 날씨는 그 나라 것. 날씨가 도면을 이겼습니다.', k: 'note', fx: { money: medX(s, 0.2), hl: -2 } })),
  E('rim_bui_t_scrap', [18, 55], [T('RIM_BUILDER', 'technician')], 35, 3, (s) => ({ t: '플레이트 하나가 폐기되었습니다. 공업 도시 구획이었습니다. 저희가 세운 것을 저희가 뜯었습니다. 뜯는 값은 세우는 값의 반이었습니다.', k: 'bad', fx: { h: -3 } })),
  E('rim_bui_t_raid', [18, 55], [T('RIM_BUILDER', 'technician')], 30, 3, (s) => ({ t: '현장에 도적단이 왔습니다. 자재를 가져갔습니다. 사람은 건드리지 않았고, 자재는 사람보다 비쌌습니다.', k: 'bad', fx: { money: -medX(s, 0.1), h: -2 } })),
  E('rim_bui_f_crew', [25, 60], [T('RIM_BUILDER', 'foreman')], 45, 2, (s) => ({ t: '현장 반장으로 조 스물을 맡았습니다. 견습 여덟. 안전줄을 하나씩 쓰게 했습니다. 예산이 그만큼 줄었고, 줄인 것을 적었습니다.', k: 'ev', fx: { standing: 3, h: 1, f: F('현장 인력표, ' + s.year + '년') } })),
  E('rim_bui_f_deadline', [25, 60], [T('RIM_BUILDER', 'foreman')], 40, 2, (s) => ({ t: '재앙 예보가 공기보다 빨랐습니다. 사흘 만에 구획 하나를 올렸습니다. 올린 구획은 버텼고, 사람 둘이 앓았습니다.', k: 'bad', fx: { hl: -3, standing: 3, f: F('플랫폼 공정 기록, ' + s.year + '년') } })),
  E('rim_bui_f_accident', [25, 60], [T('RIM_BUILDER', 'foreman')], 35, 3, (s) => ({ t: '견습 하나가 떨어졌습니다. 살았습니다. 다리. 보상 서류를 썼고, 서류의 해당 없음 칸을 비워 두었습니다. 위에서 채웠습니다.', k: 'bad', fx: { h: -4 } })),
  E('rim_bui_f_repair', [25, 60], [T('RIM_BUILDER', 'foreman')], 30, 3, (s) => ({ t: '이동도시 보수였습니다. 도시가 움직이는 동안 밑에서 고쳤습니다. 멈출 수 없다고 했습니다. 멈추면 돈이라고.', k: 'note', fx: { hl: -2, cap: { skill: 0.02 } } })),
  E('rim_bui_c_order', [32, 70], [T('RIM_BUILDER', 'contract')], 45, 2, (s) => ({ t: '타국 플랫폼 수주 책임자가 되었습니다. 계약서 첫 장에 제 이름이 있었습니다. 마지막 장에는 위약금이 있었습니다.', k: 'big', fx: { standing: 4, money: medX(s, 1) } })),
  E('rim_bui_c_abroad', [32, 70], [T('RIM_BUILDER', 'contract')], 40, 2, (s) => ({ t: '한 해의 절반을 다른 나라 현장에서 보냈습니다. 그 나라 말로 안전이라는 단어를 먼저 외웠습니다.', k: 'note', fx: { cap: { ties: 0.03 }, h: -1 } })),
  E('rim_bui_c_bid', [32, 70], [T('RIM_BUILDER', 'contract')], 35, 3, (s) => ({ t: '입찰에서 졌습니다. 이긴 쪽은 안전줄 예산이 없는 회사였습니다. 다음 입찰은 이겼고, 이긴 이유를 묻지 않았습니다.', k: 'note', fx: { h: -2, money: medX(s, 0.5) } })),
  E('rim_bui_c_home', [32, 70], [T('RIM_BUILDER', 'contract')], 30, 4, (s) => ({ t: '돌아오니 광산촌 플레이트가 바뀌어 있었습니다. 제 조가 세운 것이었습니다. 제 이름은 어디에도 없었고, 그것으로 되었습니다.', k: 'warm', fx: { h: 3 } })),
  E('rim_bui_foreign_aff', [15, 70], ['aff:RIM_BUI_FOREIGN', T('RIM_BUILDER')], 40, 3, (s) => ({ t: '타국 주문 현장 전담이었습니다. 급여는 좋았고, 집에 있는 날은 한 해에 두 달이었습니다.', k: 'note', fx: { money: medX(s, 0.2), h: -2 } })),
  E('rim_bui_visit_columbia', [15, 70], [T('RIM_BUILDER'), 'visit:columbia'], 40, 2, (s) => ({ t: '컬럼비아 현장이었습니다. 안전 규정이 책 한 권이었습니다. 책대로 했고, 사고가 없었고, 공기가 두 배였습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),
  E('rim_bui_visit_yan', [15, 70], [T('RIM_BUILDER'), 'visit:yan'], 40, 2, (s) => ({ t: '염국 현장이었습니다. 관청 사람이 매일 왔습니다. 도장이 열두 개였고, 열두 번째 도장이 가장 오래 걸렸습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_bui_visit_kazimierz', [15, 70], [T('RIM_BUILDER'), 'visit:kazimierz'], 40, 2, (s) => ({ t: '카시미어 현장이었습니다. 경기장 플레이트였습니다. 세우는 동안 중계가 흘렀고, 아무도 저희를 찍지 않았습니다.', k: 'note', fx: { h: 1 } })),
  E('rim_bui_shift', [15, 70], [T('RIM_BUILDER')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'technician' ? '기술자가 되었습니다. 도면을 읽을 수 있었고, 도면에 서명도 할 수 있었습니다.' : id === 'foreman' ? '현장 반장이 되었습니다. 안전줄 예산이 제 책상에 왔습니다.' : '타국 수주 책임자가 되었습니다. 여권이 두꺼워졌습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('rim_bui_after', [15, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'accident' ? '현장에서 다친 뒤의 일입니다. 높은 곳을 보면 무릎이 먼저 알았습니다.' : '현장을 떠난 뒤의 일입니다. 도시가 움직일 때 이음새 소리를 혼자 들었습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'RIM_BUILDER') }),
];

// ── 핵심 5. RIM_INFECTED 감염 광부·자발 추방 (A5 forced: diagnosed → expendable → zone). 진입은 판정 이벤트 ──
const infected = [
  E('rim_inf_enter', [0, 90], ['rim', 'known', '!track:RIM_INFECTED', '!rhodes'], 300, 1, (s) => { const was = s.track ? s.track.name : null; s.enterTrack('RIM_INFECTED', { how: 'forced', via: 'diagnosed', quiet: true }); return { t: '판정서가 회사에 먼저 갔습니다. ' + (was ? eun(was) + ' 그날로 끝났고, ' : '') + '소모성 노동 명부에 이름이 올랐습니다. 박해는 없다고 했습니다. 명부가 있을 뿐이었습니다.', k: 'loss', fx: { h: -5 } }; }, { c: (s) => !s.S.prison && s.rng.chance(0.7) }),
  E('rim_inf_d_paper', [0, 90], [T('RIM_INFECTED', 'diagnosed')], 50, 1, (s) => ({ t: '판정서를 가족에게 보였습니다. 아버지가 먼저 읽었고, 다 읽기 전에 접었습니다.', k: 'loss', fx: { h: -4 } })),
  E('rim_inf_d_company', [0, 90], [T('RIM_INFECTED', 'diagnosed')], 45, 1, (s) => ({ t: '회사가 새 계약서를 내밀었습니다. 급여는 반, 배치는 가장 깊은 갱도. 서명하지 않으면 계약이 없었습니다.', k: 'bad', fx: { money: -medX(s, 0.05), h: -2, f: orgF(s, '감염자 재계약 조항', s.year) } })),
  E('rim_inf_d_neighbors', [0, 90], [T('RIM_INFECTED', 'diagnosed')], 40, 1, (s) => ({ t: '이웃은 피하지 않았습니다. 광산촌에 감염자는 흔했습니다. 피하지 않는 것과 가까이 오는 것은 달랐습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_inf_d_children', [0, 90], [T('RIM_INFECTED', 'diagnosed')], 35, 1, (s) => ({ t: '옆집 아이가 부모에게 쫓겨나는 것을 보았습니다. 판정 다음 날이었습니다. 부모는 문을 닫았고, 아이는 광산촌 길을 혼자 걸었습니다.', k: 'bad', fx: { h: -4 } })),
  E('rim_inf_x_deep', [0, 90], [T('RIM_INFECTED', 'expendable')], 50, 1, (s) => ({ t: '소모품 배치였습니다. 슬러그 둥지 쪽 갱도. 감염자만 들어갔고, 들어가는 수와 나오는 수를 세는 사람이 없었습니다.', k: 'bad', fx: { hl: -5, h: -2 } })),
  E('rim_inf_x_mask', [0, 90], [T('RIM_INFECTED', 'expendable')], 45, 1, (s) => ({ t: '마스크 지급이 끊겼습니다. 감염자에게는 의미가 없다는 회사 공문이었습니다. 공문은 한 줄이었습니다.', k: 'bad', fx: { hl: -3 } })),
  E('rim_inf_x_family', [0, 90], [T('RIM_INFECTED', 'expendable')], 40, 2, (s) => ({ t: '가족이 있는 집에 돌아가지 않는 날이 늘었습니다. 기숙사 감염자 동에서 잤습니다. 아이가 보고 싶었고, 보여 주고 싶지 않았습니다.', k: 'loss', fx: { h: -3 } })),
  E('rim_inf_x_exile_talk', [0, 90], [T('RIM_INFECTED', 'expendable')], 40, 2, (s) => ({ t: '옆 침대 사람이 떠났습니다. 스스로. 가족을 지키려면 그것뿐이라고 했습니다. 용문 쪽이라고 했고, 편지는 오지 않았습니다.', k: 'note', fx: { h: -2 } })),
  E('rim_inf_z_wall', [0, 90], [T('RIM_INFECTED', 'zone')], 50, 1, (s) => ({ t: '중앙 격리구역이었습니다. 담은 낮았습니다. 넘을 수 있었고, 넘어가서 갈 곳이 없었습니다.', k: 'note', fx: { h: -2 } })),
  E('rim_inf_z_clinic', [0, 90], [T('RIM_INFECTED', 'zone')], 45, 1, (s) => ({ t: '격리구역 진료소에 로도스 아일랜드 표식이 있었습니다. 약이 왔습니다. 모자랐고, 전에는 아예 없던 것이었습니다.', k: 'warm', fx: { hl: 2, h: 2 }, f: rhodesF('림 빌리턴 격리구역 지원 기록') })),
  E('rim_inf_z_letter', [0, 90], [T('RIM_INFECTED', 'zone')], 40, 2, (s) => ({ t: '가족에게서 편지가 왔습니다. 잘 있다고 했습니다. 잘 있다는 말 밑에 아이의 그림이 있었습니다. 갱도 그림이었습니다.', k: 'warm', fx: { h: 3 } })),
  E('rim_inf_z_abroad', [0, 90], [T('RIM_INFECTED', 'zone')], 35, 2, (s) => ({ t: '국외로 나가는 사람들의 명단이 돌았습니다. 용문 빈민가라고 했습니다. 거기서는 감염자가 광부가 아니라 그냥 감염자라고 했습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_inf_expendable_aff', [0, 90], ['aff:RIM_INF_EXPENDABLE', T('RIM_INFECTED')], 40, 2, (s) => ({ t: '소모성 노동 명부였습니다. 명부의 이름은 매달 바뀌었고, 바뀐 이름이 어디로 갔는지는 적혀 있지 않았습니다.', k: 'bad', fx: { hl: -2 } })),
  E('rim_inf_selfexile_aff', [0, 90], ['aff:RIM_INF_SELFEXILE', T('RIM_INFECTED')], 40, 2, (s) => ({ t: '자발 추방 명단에 이름을 올려 둔 상태였습니다. 떠나는 날짜는 비워 두었습니다. 비워 둔 날짜가 한 해를 갔습니다.', k: 'note', fx: { h: -2 } })),
  E('rim_inf_shift', [0, 90], [T('RIM_INFECTED')], 400, 1, (s) => ({ t: stageId(s) === 'expendable' ? '소모품 배치를 받았습니다. 갱도 이름은 없었고, 번호만 있었습니다.' : '중앙 격리구역으로 들어갔습니다. 회사 명부에서는 빠졌고, 연합 명부에 올랐습니다.', k: 'loss', fx: { h: -2 } }), { c: stNew }),
  E('rim_inf_after', [0, 95], [], 500, 1, (s) => ({ t: '명부에서 빠진 뒤의 일입니다. 어디로 갔든 감염자였고, 광부는 아니었습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'RIM_INFECTED') }),
];

// ── 나머지. RIM_AIRWATCH 공기질 모래짐승 관리 (A11: helper → keeper → replaced) ──
const airwatch = [
  E('rim_air_h_feed', [14, 40], [T('RIM_AIRWATCH', 'helper')], 45, 2, (s) => ({ t: '모래짐승에게 먹이를 주었습니다. 짐승이 먼저 가루를 맡았습니다. 짐승이 움찔하면 교대가 나왔습니다.', k: 'ev', fx: { cap: { skill: 0.03 } } })),
  E('rim_air_h_sick', [14, 40], [T('RIM_AIRWATCH', 'helper')], 35, 3, (s) => ({ t: '짐승 하나가 앓았습니다. 회사는 새 짐승 대신 기계 견적을 받았습니다. 짐승은 제가 돌봤고, 살았습니다.', k: 'warm', fx: { h: 2 } })),
  E('rim_air_k_round', [17, 60], [T('RIM_AIRWATCH', 'keeper')], 45, 2, (s) => ({ t: '관리인으로 갱도마다 짐승을 두고 돌았습니다. 짐승 여섯, 갱도 여섯. 짐승이 저보다 먼저 위험을 알았고, 저는 짐승보다 먼저 사람에게 알렸습니다.', k: 'ev', fx: { standing: 3, f: F('공기질 관리반 일지, ' + s.year + '년') } })),
  E('rim_air_k_machine', [17, 60], [T('RIM_AIRWATCH', 'keeper')], 40, 2, (s) => ({t: '첫 기계가 왔습니다. 한 갱도에 기계, 다섯 갱도에 짐승. 기계는 먹이를 안 먹었고, 틀린 날도 있었습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_air_r_last', [20, 70], [T('RIM_AIRWATCH', 'replaced')], 45, 2, (s) => { s.S.flags.switchOpen = true; return { t: '마지막 짐승이 기계로 바뀌었습니다. 짐승은 회사가 처분했습니다. 어디로 갔는지 묻지 않았습니다. 다른 일을 찾아야 했습니다.', k: 'loss', fx: { h: -3 } }; }),
  E('rim_air_r_training', [20, 70], [T('RIM_AIRWATCH', 'replaced')], 35, 3, (s) => ({ t: '기계 정비 교육을 받았습니다. 짐승을 보던 눈으로 계기판을 보았습니다. 계기판은 움찔하지 않았습니다.', k: 'note', fx: { cap: { learn: 0.03 } } })),
  E('rim_air_shift', [14, 70], [T('RIM_AIRWATCH')], 400, 2, (s) => ({ t: stageId(s) === 'keeper' ? '관리인이 되었습니다. 짐승 여섯의 이름을 지었습니다.' : '짐승이 다 기계로 바뀌었습니다. 관리인 자리도 함께 바뀌었습니다.', k: stageId(s) === 'keeper' ? 'big' : 'loss', fx: { h: stageId(s) === 'keeper' ? 3 : -2 } }), { c: stNew }),
  E('rim_air_after', [14, 95], [], 500, 1, (s) => ({ t: '관리반을 떠난 뒤의 일입니다. 갱도 앞을 지나면 공기를 먼저 맡았습니다. 짐승처럼.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'RIM_AIRWATCH') }),
];

// ── RIM_TRANSPORT 운송 기사 (A11 순회형: assistant → driver → convoy → manager) ──
const transport = [
  E('rim_tra_a_night', [16, 35], [T('RIM_TRANSPORT', 'assistant')], 45, 2, (s) => ({ t: '조수석에서 밤길을 지켰습니다. 기사가 졸면 깨우는 것이 일이었습니다. 기사는 한 번도 졸지 않았다고 했습니다.', k: 'ev', fx: { cap: { skill: 0.02 }, hl: -1 } })),
  E('rim_tra_a_load', [16, 35], [T('RIM_TRANSPORT', 'assistant')], 40, 2, (s) => ({ t: '광석을 실었습니다. 자루 하나가 제 몸무게였습니다. 백 자루. 저녁에 팔이 올라가지 않았습니다.', k: 'bad', fx: { hl: -2, cap: { skill: 0.02 }, f: F('운송 적재 대장, ' + s.year + '년') } })),
  E('rim_tra_d_route', [18, 60], [T('RIM_TRANSPORT', 'driver')], 45, 2, (s) => ({ t: '기사로서 빅토리아 국경 노선을 맡았습니다. 왕복 열흘. 집은 한 달에 엿새였습니다.', k: 'ev', fx: { money: medX(s, 0.1), h: -1, f: F('운송 노선표, ' + s.year + '년') } })),
  E('rim_tra_d_bandit', [18, 60], [T('RIM_TRANSPORT', 'driver')], 35, 3, (s) => ({ t: '도적단이 길을 막았습니다. 화물을 내주었습니다. 회사 규정이었습니다. 규정대로 했고, 규정대로 급여가 깎였습니다.', k: 'bad', fx: { money: -medX(s, 0.15), h: -3 } })),
  E('rim_tra_c_lead', [24, 65], [T('RIM_TRANSPORT', 'convoy')], 45, 2, (s) => ({ t: '수송대장으로 트럭 여덟을 끌었습니다. 보안 요원 둘이 붙었습니다. 요원은 화물을 보았고, 저는 기사들을 보았습니다.', k: 'ev', fx: { standing: 3, f: F('수송대 편성표, ' + s.year + '년') } })),
  E('rim_tra_c_1090', [24, 65], [T('RIM_TRANSPORT', 'convoy')], 30, 4, (s) => ({ t: '옛 수송대 습격 이야기를 신참에게 했습니다. 빅토리아 백작이 고용한 도적단이었다고. 신참은 백작이 누구냐고 물었습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('rim_tra_m_office', [30, 70], [T('RIM_TRANSPORT', 'manager')], 45, 2, (s) => ({ t: '운송회사 관리였습니다. 노선표와 기사 명단. 기사 명단에서 이름이 빠지는 이유는 둘이었고, 둘 다 도로 위에서 일어났습니다.', k: 'note', fx: { standing: 3, h: -2 } })),
  E('rim_tra_m_insurance', [30, 70], [T('RIM_TRANSPORT', 'manager')], 35, 3, (s) => ({ t: '기사 보험을 넣자고 올렸습니다. 화물 보험료의 십분의 일이었습니다. 반려되었고, 다음 해 다시 올렸습니다.', k: 'bad', fx: { h: -2, standing: -1, f: F('운송회사 보험 품의, ' + s.year + '년') } })),
  E('rim_tra_ggf_aff', [16, 70], ['aff:RIM_TRA_GGF', T('RIM_TRANSPORT')], 40, 3, (s) => ({ t: '회사 이름이 빨리 가자는 뜻이었습니다. 빨리 갔습니다. 사고는 회사 이름 탓이 아니라고 회사가 말했습니다.', k: 'note', fx: { money: medX(s, 0.05), hl: -1 } })),
  E('rim_tra_visit_victoria', [16, 70], [T('RIM_TRANSPORT'), 'visit:victoria'], 40, 2, (s) => ({ t: '빅토리아 국경 창고에서 하역했습니다. 창고 사람들은 림 빌리턴 광석을 받으면서 림 빌리턴 사람은 보지 않았습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_tra_shift', [16, 70], [T('RIM_TRANSPORT')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'driver' ? '기사가 되었습니다. 운전석과 노선 하나를 받았습니다.' : id === 'convoy' ? '수송대장이 되었습니다. 트럭 여덟의 무전이 제 것이 되었습니다.' : '운송회사 관리로 올라갔습니다. 도로 대신 노선표를 보았습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('rim_tra_after', [16, 95], [], 500, 1, (s) => ({ t: '운전석을 떠난 뒤의 일입니다. 긴 길을 보면 몸이 먼저 피곤해졌습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'RIM_TRANSPORT') }),
];

// ── RIM_MEDIC 의료·연구 (A9: student → resume → intern → researcher) ──
const medic = [
  E('rim_med_s_fee', [18, 28], [T('RIM_MEDIC', 'student')], 45, 2, (s) => ({ t: '의대 학비였습니다. 가족공동체가 반을 냈고, 반은 빚이었습니다. 추가 학업 비용은 없다는 말을 입학 때 들었습니다.', k: 'bad', fx: { money: -medX(s, 0.4), cap: { learn: 0.04 } } })),
  E('rim_med_s_cadaver', [18, 28], [T('RIM_MEDIC', 'student')], 35, 3, (s) => ({ t: '실습이었습니다. 폐였습니다. 광부의 것이었고, 교수는 전형적이라고 했습니다. 전형적이라는 말을 오래 생각했습니다.', k: 'note', fx: { cap: { learn: 0.03 }, h: -2 } })),
  E('rim_med_r_ten', [22, 32], [T('RIM_MEDIC', 'resume')], 50, 1, (s) => ({ t: '이력서를 열 군데 넘게 냈습니다. 대형 의료회사, 연구소. 답장은 둘이었고, 둘 다 거절이었습니다.', k: 'bad', fx: { h: -4, f: F('의료회사 채용 회신, ' + s.year + '년') } })),
  E('rim_med_r_wait', [22, 32], [T('RIM_MEDIC', 'resume')], 45, 1, (s) => ({ t: '기다리는 동안 광산촌 진료소에서 무급으로 일했습니다. 환자는 광부였고, 급여는 통조림이었습니다.', k: 'note', fx: { cap: { skill: 0.03 }, hl: -1 } })),
  E('rim_med_i_rounds', [23, 36], [T('RIM_MEDIC', 'intern')], 45, 2, (s) => ({ t: '인턴 회진이었습니다. 하루 열여섯 시간. 환자의 폐 사진을 보았고, 회사는 그 사진을 가져갔습니다.', k: 'bad', fx: { hl: -3, cap: { learn: 0.03 }, f: F('인턴 근무 기록, ' + s.year + '년') } })),
  E('rim_med_i_exam', [23, 36], [T('RIM_MEDIC', 'intern')], 40, 2, (s) => ({ t: '반년 뒤 시험이었습니다. 통과했습니다. 통과한 사람 셋 중 하나가 다음 날 로도스 아일랜드 쪽으로 갔다고 들었습니다.', k: 'ev', fx: { standing: 3 } })),
  E('rim_med_rs_lab', [25, 65], [T('RIM_MEDIC', 'researcher')], 45, 2, (s) => ({ t: '의료회사 연구원이었습니다. 연구 주제는 회사가 정했습니다. 광부 폐 질환의 조기 판정. 조기에 판정하면 조기에 명부에 올랐습니다.', k: 'note', fx: { standing: 3, h: -2 } })),
  E('rim_med_rs_paper', [25, 65], [T('RIM_MEDIC', 'researcher')], 35, 3, (s) => ({ t: '논문이 나왔습니다. 저자 다섯. 제 이름은 넷째였고, 첫째는 연구소장이었습니다. 연구소장은 실험실에 오지 않았습니다.', k: 'note', fx: { cap: { learn: 0.03 }, standing: 2, f: F('의료회사 연구 보고, ' + s.year + '년') } })),
  E('rim_med_rhodes_aff', [22, 65], ['aff:RIM_MED_RHODES', T('RIM_MEDIC')], 40, 3, (s) => { s.S.flags.rhodes_medical_pact = s.S.age; return { t: '로도스 인턴 자리였습니다. 봉투 하나가 그쪽에서 온 것이었습니다. 광산 감염자를 보는 눈이 회사와 달랐습니다.', k: 'note', fx: { cap: { learn: 0.03 }, h: 1 } }; }),
  E('rim_med_shift', [18, 70], [T('RIM_MEDIC')], 400, 1, (s) => { const id = stageId(s); return { t: id === 'resume' ? '졸업했습니다. 이력서를 쓰기 시작했습니다.' : id === 'intern' ? '인턴 자리를 얻었습니다. 봉투 둘 중 하나였습니다.' : '연구원이 되었습니다. 흰 가운에 회사 이름이 수놓여 있었습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('rim_med_after', [18, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'ruin' ? '학업을 중단한 뒤의 일입니다. 빚은 남았고, 가운은 반납했습니다.' : '연구소를 나온 뒤의 일입니다. 폐 사진을 보면 이름부터 찾았습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'RIM_MEDIC') }),
];

// ── RIM_MSG 광산팀 컨설턴트 (A9 변형: apprentice → consultant → senior → chief) ──
const msg = [
  E('rim_msg_a_notebook', [16, 30], [T('RIM_MSG', 'apprentice')], 45, 2, (s) => ({ t: '관측 노트를 받았습니다. 선배 컨설턴트는 하늘을 적었고, 저는 선배를 적었습니다.', k: 'ev', fx: { cap: { arts: 0.04 } } })),
  E('rim_msg_a_cost', [16, 30], [T('RIM_MSG', 'apprentice')], 35, 3, (s) => ({ t: '장비는 사비였습니다. 보호복, 통신기. 첫해 급여의 반이 장비로 나갔습니다.', k: 'bad', fx: { money: -medX(s, 0.3), f: F('컨설턴트 장비 구입 영수, ' + s.year + '년') } })),
  E('rim_msg_c_site', [19, 55], [T('RIM_MSG', 'consultant')], 45, 2, (s) => ({ t: '재앙 뒤 발굴 현장에 들어갔습니다. 광상을 조사했습니다. 광산팀이 뒤따랐고, 저보다 먼저 들어가는 사람은 없었습니다.', k: 'ev', fx: { standing: 3, hl: -2 } })),
  E('rim_msg_c_rate', [19, 55], [T('RIM_MSG', 'consultant')], 35, 3, (s) => ({ t: '동료 검진 결과가 돌았습니다. 이 일을 하는 사람 중 감염 안 된 쪽이 드물었습니다. 제 결과는 아직이었습니다.', k: 'bad', fx: { h: -3 } })),
  E('rim_msg_s_forecast', [26, 65], [T('RIM_MSG', 'senior')], 45, 2, (s) => ({ t: '선임으로서 예보를 냈습니다. 광산 셋에 이틀 대피. 둘은 따랐고, 하나는 따르지 않았습니다. 하나는 다음 해 명단에 없었습니다.', k: 'bad', fx: { standing: 4, h: -3, f: F('재앙 예보 발령 기록, ' + s.year + '년') } })),
  E('rim_msg_s_cc', [26, 65], [T('RIM_MSG', 'senior')], 35, 3, (s) => ({ t: '긴급 계약 플랫폼에 이름을 올렸습니다. 의뢰가 왔습니다. 용병도 같은 플랫폼에 있었고, 같은 의뢰에 붙었습니다.', k: 'note', fx: { money: medX(s, 0.5), h: -1 } })),
  E('rim_msg_ch_dig', [33, 70], [T('RIM_MSG', 'chief')], 45, 2, (s) => ({ t: '발굴 현장 총괄이었습니다. 컨설턴트 넷, 광산팀 서른. 들어가는 순서를 정했고, 제 이름은 더는 첫째가 아니었습니다.', k: 'big', fx: { standing: 4 } })),
  E('rim_msg_ch_apprentice', [33, 70], [T('RIM_MSG', 'chief')], 35, 3, (s) => ({ t: '수습 하나가 노트를 들고 왔습니다. 하늘 대신 저를 적어 두었습니다. 제가 그랬듯이.', k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } })),
  E('rim_msg_indep_aff', [16, 70], ['aff:RIM_MSG_INDEP', T('RIM_MSG')], 40, 3, (s) => ({ t: '독립 컨설턴트라 광산팀이 부를 때만 일이 있었습니다. 부르지 않는 달에는 장비 값만 나갔습니다.', k: 'bad', fx: { money: -medX(s, 0.1) } })),
  E('rim_msg_shift', [16, 70], [T('RIM_MSG')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'consultant' ? '컨설턴트가 되었습니다. 신분증과 제한구역 통행증을 받았습니다.' : id === 'senior' ? '선임이 되었습니다. 예보에 제 서명이 들어갔습니다.' : '발굴 현장 총괄이 되었습니다. 들어가는 순서를 정하는 사람이 되었습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('rim_msg_after', [16, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'infected' ? '판정 뒤의 일입니다. 동료들 사이에서 흔한 결과였고, 흔하다고 가벼운 것은 아니었습니다.' : '관측을 그만둔 뒤의 일입니다. 하늘을 보는 버릇은 그만두지 못했습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'RIM_MSG') }),
];

// ── RIM_FACTORY 가공·제조 공장 노동 (A11: worker → skilled → foreman → lead) + 생업 계절 ──
const factory = [
  E('rim_fac_w_line', [14, 50], [T('RIM_FACTORY', 'worker')], 45, 2, (s) => ({ t: '가공 라인에 섰습니다. 광석이 들어오고 가루가 나갔습니다. 갱도보다 낫다고 모두 말했고, 그것은 갱도를 아는 사람들의 말이었습니다.', k: 'ev', fx: { cap: { skill: 0.03 }, hl: -1 } })),
  E('rim_fac_w_shift', [14, 50], [T('RIM_FACTORY', 'worker')], 40, 2, (s) => ({ t: '야간 교대였습니다. 공장은 멈추지 않았습니다. 멈추면 돈이라고, 라인 위의 표어가 말했습니다.', k: 'note', fx: { hl: -2 } })),
  E('rim_fac_s_tool', [18, 60], [T('RIM_FACTORY', 'skilled')], 45, 2, (s) => ({ t: '숙련공이 되어 기계를 맡았습니다. 기계는 모래짐승을 대신하던 것과 같은 회사 것이었습니다. 틀리는 날이 있었고, 그날은 제가 맞아야 했습니다.', k: 'ev', fx: { cap: { skill: 0.04 } } })),
  E('rim_fac_s_dust', [18, 60], [T('RIM_FACTORY', 'skilled')], 35, 3, (s) => ({ t: '가공 공장에도 가루가 있었습니다. 갱도보다 고운 가루였습니다. 고운 것이 더 깊이 들어간다고 진료소가 말했습니다.', k: 'bad', fx: { hl: -3 } })),
  E('rim_fac_f_crew', [24, 65], [T('RIM_FACTORY', 'foreman')], 45, 2, (s) => ({ t: '반장으로 라인 둘을 맡았습니다. 사고 보고서 양식이 책상에 쌓여 있었습니다. 쓰지 않는 달이 좋은 달이었습니다.', k: 'ev', fx: { standing: 3, h: -1 } })),
  E('rim_fac_f_closure', [24, 65], [T('RIM_FACTORY', 'foreman')], 35, 3, (s) => ({ t: '옆 공장이 닫혔습니다. 그쪽 사람들이 이력서를 들고 왔습니다. 자리는 셋이었고, 이력서는 쉰이었습니다.', k: 'bad', fx: { h: -2, f: orgF(s, '공장 채용 집계', s.year) } })),
  E('rim_fac_l_plan', [30, 70], [T('RIM_FACTORY', 'lead')], 45, 2, (s) => ({ t: '생산팀장으로 분기 계획을 짰습니다. 채굴량에 맞춰야 했고, 채굴량은 사고 수에 따라 흔들렸습니다. 계획은 매달 다시 썼습니다.', k: 'note', fx: { standing: 3, cap: { learn: 0.02 } } })),
  E('rim_fac_l_community', [30, 70], [T('RIM_FACTORY', 'lead')], 35, 3, (s) => ({ t: '가족공동체 회의에 생산팀장으로 불려 갔습니다. 공장 일자리 배분이었습니다. 공동체 이름이 이력서보다 먼저였습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  E('rim_fac_sunvalley_aff', [14, 70], ['aff:RIM_FAC_SUNVALLEY', T('RIM_FACTORY')], 40, 3, (s) => ({ t: '선밸리 공업이었습니다. 광산회사 자회사가 아니라 급여가 조금 달랐고, 조금 좋았습니다.', k: 'note', fx: { money: medX(s, 0.08) } })),
  // 생업 계절·명절·동네
  E('rim_liv_payday', [5, 90], [T('RIM_FACTORY')], 40, 2, (s) => ({ t: '광산촌 급여일이었습니다. 술집과 가게가 그날만 밤늦게 열었습니다. 다음 날 아침은 조용했습니다.', k: 'warm', fx: { h: 2, money: -medX(s, 0.02) } })),
  E('rim_liv_cake', [5, 90], [T('RIM_FACTORY')], 40, 2, (s) => ({ t: fest(s, 1) + '였습니다. ' + eul(cul(s).food.split('와 ')[0]) + ' 광장에서 나눴습니다. 회사가 냈다고 회사가 말했습니다.', k: 'warm', fx: { h: 3 } })),
  E('rim_liv_bandits', [5, 90], [T('RIM_FACTORY')], 35, 3, (s) => ({ t: '도적단이 마을 가장자리까지 왔습니다. 보안 요원이 왔고, 도적단은 떠났고, 요원도 떠났습니다. 밤에 문을 두 번 잠갔습니다.', k: 'bad', fx: { h: -2 } })),
  E('rim_liv_platform', [5, 90], [T('RIM_FACTORY')], 35, 2, (s) => ({ t: '마을 옆에 새 플랫폼이 올라갔습니다. 반년. 용접 불빛이 밤마다 창에 비쳤습니다. 다 올라가자 마을이 조금 옮겨졌습니다.', k: 'note', fx: { h: 1 } })),
  E('rim_liv_catastrophe', [5, 90], [T('RIM_FACTORY')], 40, 2, (s) => ({ t: '재앙 예보였습니다. 플레이트가 분리되었고, 마을이 이틀 동안 둘이었습니다. 다시 붙는 데 열 시간이 걸렸습니다.', k: 'bad', fx: { hl: -1, h: -1 } })),
  E('rim_liv_greet', [5, 90], [T('RIM_FACTORY')], 30, 3, (s) => ({ t: '이웃이 ' + cul(s).greet + '고 인사했습니다. 갱도에 안 들어가는 사람에게도 그렇게 인사했습니다. 그것이 이 마을 인사였습니다.', k: 'warm', fx: { cap: { ties: 0.02 } } })),
  E('rim_liv_siren', [5, 90], [T('RIM_FACTORY')], 30, 3, (s) => ({ t: '사이렌이 울렸습니다. 갱도 쪽. 마을 사람들이 입구로 뛰어갔고, 공장 사람들도 뛰어갔습니다. 라인은 혼자 돌았습니다.', k: 'bad', fx: { h: -3 } })),
  E('rim_fac_shift', [14, 70], [T('RIM_FACTORY')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'skilled' ? '숙련공이 되었습니다. 기계 하나가 제 이름으로 배정되었습니다.' : id === 'foreman' ? '반장이 되었습니다. 사고 보고서 양식을 받았습니다.' : '생산팀장이 되었습니다. 분기 계획표가 제 책상에 왔습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('rim_fac_after', [14, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'layoff' ? '공장이 닫힌 뒤의 일입니다. 이력서 쉰 장 중 하나가 제 것이었습니다.' : '공장을 떠난 뒤의 일입니다. 기계 소리가 없는 밤이 낯설었습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'RIM_FACTORY') }),
];

// ── RIM_FAMILY 가족공동체 대표 (A3 변형: member → cadre → rep → rmia) ──
const family = [
  E('rim_fam_m_meeting', [25, 60], [T('RIM_FAMILY', 'member')], 45, 2, (s) => ({ t: '공동체 회의에 성원으로 앉았습니다. 안건은 일자리 배분이었습니다. 광산회사가 자리를 주면 공동체가 사람을 골랐습니다.', k: 'ev', fx: { cap: { ties: 0.04 } } })),
  E('rim_fam_m_kids', [25, 60], [T('RIM_FAMILY', 'member')], 35, 3, (s) => ({ t: '공동체 아이들 열하나를 학교에 보내는 돈을 모았습니다. 보내지 못한 아이 넷은 피트싱커가 되었습니다. 그 넷의 이름을 적어 두었습니다.', k: 'bad', fx: { money: -medX(s, 0.2), h: -2, f: F('가족공동체 취학 기록, ' + s.year + '년') } })),
  E('rim_fam_c_guild', [30, 65], [T('RIM_FAMILY', 'cadre')], 45, 2, (s) => ({ t: '길드 간부로 회사와 협상했습니다. 공동체 사람 몇을 어느 갱도에 넣을지. 회사는 숫자를 말했고, 저는 이름을 말했습니다.', k: 'ev', fx: { standing: 3, cap: { ties: 0.03 } } })),
  E('rim_fam_c_dispute', [30, 65], [T('RIM_FAMILY', 'cadre')], 35, 3, (s) => ({ t: '다른 공동체와 이권 다툼이었습니다. 갱도 하나. 회의가 석 달 갔고, 회사가 갱도를 셋째 공동체에 주면서 끝났습니다.', k: 'bad', fx: { h: -2, f: F('연합 회의 이권 조정 기록, ' + s.year + '년') } })),
  E('rim_fam_r_rep', [38, 75], [T('RIM_FAMILY', 'rep')], 45, 2, (s) => ({ t: '공동체 대표였습니다. 광산회사 임원과 같은 테이블에 앉았습니다. 임원 뒤에 경호가 둘, 제 뒤에는 공동체 전부가 있었습니다. 보이지는 않았습니다.', k: 'big', fx: { standing: 4 } })),
  E('rim_fam_r_fence', [38, 75], [T('RIM_FAMILY', 'rep')], 35, 3, (s) => ({ t: '울타리 사건 때의 연합 이야기를 젊은 간부들에게 했습니다. 지분이 금지되었던 때. 젊은 간부들은 지금도 그렇다고 했습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  E('rim_fam_rm_council', [45, 90], [T('RIM_FAMILY', 'rmia')], 45, 2, (s) => ({ t: '광업연합 연합 회의였습니다. 공동체 대표 자리는 긴 테이블 끝이었습니다. 끝자리에서도 발언은 할 수 있었고, 표결은 회사 수대로였습니다.', k: 'big', fx: { standing: 4, money: medX(s, 0.5) } })),
  E('rim_fam_rm_independence', [45, 90], [T('RIM_FAMILY', 'rmia')], 30, 4, (s) => ({ t: '독립 투쟁 때 연합 회의에 앉았던 노인이 세상을 떠났습니다. 회의는 묵념을 했습니다. 일 분. 회의는 계속되었습니다.', k: 'loss', fx: { h: -2 } })),
  E('rim_fam_miners_aff', [25, 90], ['aff:RIM_FAM_MINERS', T('RIM_FAMILY')], 40, 3, (s) => ({ t: '광부 조직 쪽이라 회사와 가장 자주 부딪혔습니다. 부딪히는 날이 많을수록 공동체 신망은 올랐고, 회사 명단에는 다른 표시가 붙었습니다.', k: 'note', fx: { standing: 2, h: -1 } })),
  E('rim_fam_shift', [25, 90], [T('RIM_FAMILY')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'cadre' ? '길드 간부가 되었습니다. 회사와 마주 앉는 자리였습니다.' : id === 'rep' ? '공동체 대표로 뽑혔습니다. 공동체 전체가 손을 들었습니다.' : '광업연합 연합 회의에 공동체 대표로 들어갔습니다. 긴 테이블 끝자리였습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('rim_fam_after', [25, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'betrayal' || s.S.flags.lastFall === 'purge' ? '대표에서 물러난 뒤의 일입니다. 공동체가 손을 내렸고, 그 손을 다시 올리는 사람은 없었습니다.' : '공동체 일을 놓은 뒤의 일입니다. 회의 시간이 되면 몸이 먼저 일어났습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'RIM_FAMILY') }),
];

// ── RIM_UNION 노조·노동자 연합 (A1 변형: member → cadre → leader → eureka) ──
const union = [
  E('rim_uni_m_card', [18, 55], [T('RIM_UNION', 'member')], 45, 2, (s) => ({ t: '조합원증을 받았습니다. 회사 명부에 다른 표시가 붙었다는 말을 다음 주에 들었습니다.', k: 'ev', fx: { cap: { ties: 0.03 }, standing: 2 } })),
  E('rim_uni_m_meeting', [18, 55], [T('RIM_UNION', 'member')], 40, 2, (s) => ({ t: '조합 모임이었습니다. 광산촌 술집 뒷방. 안건은 마스크 교체비였습니다. 작은 것부터라고 간부가 말했습니다.', k: 'note', fx: { h: 1 } })),
  E('rim_uni_c_negotiate', [21, 60], [T('RIM_UNION', 'cadre')], 45, 2, (s) => ({ t: '간부로 회사와 마주 앉았습니다. 요구서 셋. 회사는 둘을 서랍에 넣고 하나를 들었습니다. 마스크였습니다.', k: 'ev', fx: { standing: 3, f: F('노조 요구서, ' + s.year + '년') } })),
  E('rim_uni_c_raid', [21, 60], [T('RIM_UNION', 'cadre')], 35, 3, (s) => ({ t: '조합 사무실에 도적단이 들었습니다. 서류가 없어졌습니다. 도적단이 서류를 가져가는 일은 없다고 보안 요원이 말했습니다.', k: 'bad', fx: { h: -3 } })),
  E('rim_uni_l_strike', [27, 65], [T('RIM_UNION', 'leader')], 45, 2, (s) => ({ t: '연합 지도자로 작업 중단을 결정했습니다. 사흘. 회사는 넷째 날 협상에 나왔고, 다섯째 날 간부 둘이 체포되었습니다.', k: 'bad', fx: { standing: 5, h: -3 }, f: orgF(s, '작업 중단 손실 집계', s.year) })),
  E('rim_uni_l_fence', [27, 65], [T('RIM_UNION', 'leader')], 35, 3, (s) => ({ t: '울타리 사건 기념 집회였습니다. 광부·노동자 연합이 이겼던 날. 연단에서 그날 이야기를 했고, 아래에서 젊은 광부들이 오늘 이야기를 했습니다.', k: 'warm', fx: { standing: 3, cap: { ties: 0.03 } } })),
  E('rim_uni_e_autonomy', [35, 80], [T('RIM_UNION', 'eureka')], 45, 2, (s) => ({ t: '유레카 자치주 대표였습니다. 광산회사가 없는 광산. 회사 대신 빅토리아 회사가 있었고, 그것이 자치의 값이었습니다.', k: 'big', fx: { standing: 4 } })),
  E('rim_uni_e_cage', [35, 80], [T('RIM_UNION', 'eureka')], 35, 3, (s) => ({ t: '자치주 안에 우리가 있다는 보고를 받았습니다. 사람이 갇힌 우리. 도적단 것이었고, 자치주 보안은 손이 묶여 있었습니다.', k: 'bad', fx: { h: -4 } })),
  E('rim_uni_alliance_aff', [18, 80], ['aff:RIM_UNI_ALLIANCE', T('RIM_UNION')], 40, 3, (s) => ({ t: '광부·노동자 연합 쪽이었습니다. 울타리 사건의 이름을 이어받은 조직. 승급은 빨랐고, 회사 명단의 표시도 빨랐습니다.', k: 'note', fx: { standing: 2, h: -1 } })),
  E('rim_uni_shift', [18, 80], [T('RIM_UNION')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'cadre' ? '조합 간부가 되었습니다. 회사와 마주 앉는 자리였습니다.' : id === 'leader' ? '연합 지도자로 뽑혔습니다. 연단이 생겼습니다.' : '유레카 자치주 대표가 되었습니다. 회사가 없는 광산의 대표였습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('rim_uni_after', [18, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'arrest' ? '체포된 뒤의 일입니다. 조합원증은 압수되었고, 번호는 외워져 있었습니다.' : '조합을 떠난 뒤의 일입니다. 회사 명단의 표시는 떠난 뒤에도 남아 있었습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'RIM_UNION') }),
];

// ── RIM_EUREKA 유레카 죄수 채굴·우리 인질 (A5 강제형: held → illegal → rescued) ──
const eureka = [
  E('rim_eur_enter_captured', [6, 60], ['rim', '!track:RIM_EUREKA', '!prison:jail', '!prison:camp'], 25, 5, (s) => { s.enterTrack('RIM_EUREKA', { how: 'forced', via: 'captured', quiet: true }); return { t: '도적단이 마을 가장자리에서 사람을 끌어갔습니다. 저였습니다. 우리에 넣었고, 우리는 갱도 옆이었습니다.', k: 'bad', fx: { h: -6 } }; }, { c: (s) => s.S.q <= 2 && (!s.S.track || trk(s, 'RIM_MINER') || trk(s, 'RIM_FACTORY')) && s.rng.chance(0.12) }),
  E('rim_eur_h_cage', [6, 70], [T('RIM_EUREKA', 'held')], 50, 1, (s) => ({ t: '우리였습니다. 여자와 아이가 많았습니다. 밤에 자물쇠 소리가 났고, 아침에 사람 수가 달랐습니다.', k: 'bad', fx: { hl: -3, h: -4 } })),
  E('rim_eur_h_count', [6, 70], [T('RIM_EUREKA', 'held')], 45, 1, (s) => ({ t: '갇힌 날을 벽에 그었습니다. 서른 줄에서 그만두었습니다. 세는 것이 더 힘들었습니다.', k: 'note', fx: { h: -2 } })),
  E('rim_eur_i_dig', [8, 70], [T('RIM_EUREKA', 'illegal')], 50, 1, (s) => ({ t: '불법 채굴이었습니다. 빅토리아 광산회사 갱도. 안전 규정은 없었고, 마스크도 없었고, 급여도 없었습니다.', k: 'bad', fx: { hl: -5 } })),
  E('rim_eur_i_convict', [8, 70], [T('RIM_EUREKA', 'illegal')], 40, 2, (s) => ({ t: '옆에서 캐는 사람은 빅토리아 죄수였습니다. 형기가 끝나도 갱도는 끝나지 않는다고 했습니다. 저는 형기도 없었습니다.', k: 'note', fx: { h: -2 } })),
  E('rim_eur_r_out', [8, 80], [T('RIM_EUREKA', 'rescued')], 50, 1, (s) => { s.S.flags.switchOpen = true; return { t: '우리 문이 열렸습니다. 연 사람은 돈을 받지 않았다고 했습니다. 바깥은 밝았고, 눈이 아팠습니다.', k: 'big', fx: { h: 5 } }; }),
  E('rim_eur_r_home', [8, 80], [T('RIM_EUREKA', 'rescued')], 40, 2, (s) => ({ t: '마을로 돌아갔습니다. 집은 그대로였습니다. 그대로가 아닌 것은 저였고, 가족은 그것을 보고도 안아 주었습니다.', k: 'warm', fx: { h: 4 } })),
  E('rim_eur_cage_aff', [6, 80], ['aff:RIM_EUR_CAGE', T('RIM_EUREKA')], 40, 2, (s) => ({ t: '도적단 우리였습니다. 회사 이름도 없었습니다. 이름이 없는 곳은 아무 명부에도 없었습니다.', k: 'bad', fx: { h: -3 } })),
  E('rim_eur_shift', [6, 80], [T('RIM_EUREKA')], 400, 1, (s) => ({ t: stageId(s) === 'illegal' ? '우리에서 갱도로 옮겨졌습니다. 자물쇠가 곡괭이로 바뀌었습니다.' : '구출되었습니다. 우리 밖이었습니다.', k: stageId(s) === 'illegal' ? 'bad' : 'big', fx: { h: stageId(s) === 'illegal' ? -2 : 5 } }), { c: stNew }),
  E('rim_eur_after', [6, 95], [], 500, 1, (s) => ({ t: '우리를 나온 뒤의 일입니다. 자물쇠 소리에 몸이 먼저 굳었습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'RIM_EUREKA') }),
];

// ── 신참·관계·방문·로도스 구조·캐논 ────────────────────────────────────────
const misc = [
  E('rim_newcomer_foreign_miner', [14, 60], ['rim', 'newcomer'], 40, 2, (s) => ({ t: '외국인 광부였습니다. 갱도는 국적을 묻지 않았습니다. 공동체는 물었고, 공동체가 없으면 기숙사 가장 아래층이었습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_newcomer_greet', [10, 80], ['rim', 'newcomer'], 35, 3, (s) => ({ t: '처음 들은 인사가 ' + cul(s).greet + '였습니다. 갱도에 안 들어가는데도 그렇게 인사했습니다. 그것이 인사였습니다.', k: 'warm', fx: { cap: { ties: 0.02 } } })),
  E('rim_newcomer_beer', [10, 80], ['rim', 'newcomer'], 30, 3, (s) => ({ t: '이웃이 ' + eul(cul(s).drink) + ' 한 잔 샀습니다. 급여일이었습니다. 다음 급여일에 한 잔 갚았고, 그것으로 이웃이 되었습니다.', k: 'warm', fx: { h: 2 } })),
  E('rim_rel_inst', [10, 80], ['rim', 'rel:institutional'], 35, 3, (s) => ({ t: '회사 명부에 종족 칸이 있었습니다. 그 칸이 배치를 정했습니다. 깊은 쪽이었습니다.', k: 'bad', fx: { h: -2 } })),
  E('rim_rel_cultural', [10, 80], ['rim', 'rel:cultural'], 30, 3, (s) => ({ t: '공동체 회의에서 발언 순서가 뒤였습니다. 이유는 아무도 말하지 않았고, 순서는 매번 같았습니다.', k: 'note', fx: { h: -1 } })),
  E('rim_rel_favored', [10, 80], ['rim', 'rel:favored'], 25, 4, (s) => ({ t: '회사가 종족을 보고 사무직 쪽을 먼저 권했습니다. 권한 이유는 말하지 않았습니다.', k: 'note', fx: { h: 1 } })),
  E('rim_visit_in_mine', [12, 80], ['visit:rim'], 35, 2, (s) => ({ t: '림 빌리턴에 머무는 동안 갱도에서 보자는 인사를 들었습니다. 갱도에 들어갈 일이 없는 사람에게도.', k: 'note', fx: { cap: { ties: 0.01 } } })),
  E('rim_visit_in_catastrophe', [12, 80], ['visit:rim'], 35, 2, (s) => ({ t: '림 빌리턴의 재앙은 날씨처럼 왔습니다. 사람들은 우산을 챙기듯 플레이트 분리 시간을 외웠습니다.', k: 'note', fx: { hl: -1 } })),
  E('rim_rescue_rhodes', [15, 60], ['rim'], 40, 4, (s) => { s.S.flags.rhodes_rescue = s.S.age; return { t: '갱도 붕괴 구조에 들어갔습니다. 로도스 아일랜드 쪽 구조대가 함께였습니다. 셋을 꺼냈고, 그쪽 사람이 제 이름을 적어 갔습니다.', k: 'ev', fx: { hl: -4, h: 2 }, f: rhodesF('광산 사고 구조 기록') }; }, { c: (s) => (trk(s, 'RIM_MINER') || trk(s, 'RIM_BUILDER') || trk(s, 'RIM_SECURITY')) && s.rng.chance(0.3) }),
  E('rim_rescue_1107', [10, 80], ['rim'], 300, 1, (s) => { s.S.flags.rhodes_rescue = s.S.age; return { t: '대갱도 붕괴 뒤의 일입니다. 사이렌이 그친 뒤에도 구조는 계속되었고, 외국 구조대가 들어왔습니다. 갇혔던 사람 중 하나가 저였습니다.', k: 'big', fx: { hl: -6, h: -3 } }; }, { c: (s) => s.S.flags.big_rim_collapse_1107 != null && s.year <= 1108 && (trk(s, 'RIM_MINER') || trk(s, 'RIM_INFECTED')) }),
  E('rim_canon_savage', [10, 80], ['rim'], 60, 1, (s) => { const f = canonOpen(s, 'savage'); canonSeen(s, f); return { t: '광산회사 보안 요원이 갱도 입구에서 피트싱커 아이들 헬멧을 하나씩 고쳐 씌우는 것을 보았습니다. ' + rago(f.name) + ' 했습니다. 광부 출신이라고.', k: 'note', fx: { h: 1 } }; }, { c: (s) => (trk(s, 'RIM_MINER') || trk(s, 'RIM_SECURITY')) && !!canonOpen(s, 'savage') }),
  E('rim_canon_ansel', [10, 80], ['rim'], 60, 1, (s) => { const f = canonOpen(s, 'ansel'); canonSeen(s, f); return { t: '이력서를 열 군데 넘게 거절당한 의대생이 마지막 봉투를 들고 항구 쪽으로 가는 것을 보았습니다. ' + f.name + '. 봉투에 로도스 아일랜드 표식이 있었다고 나중에 들었습니다.', k: 'note', fx: { cap: { learn: 0.01 } } }; }, { c: (s) => trk(s, 'RIM_MEDIC') && !!canonOpen(s, 'ansel') }),
  E('rim_canon_leonhardt', [10, 80], ['rim'], 60, 1, (s) => { const f = canonOpen(s, 'leonhardt'); canonSeen(s, f); return { t: '광산팀 컨설턴트가 우리 안의 사람들을 풀어 주고 돈은 받지 않았다고 했습니다. ' + f.name + '. 멀리서 보았고, 가까이 가지 않았습니다.', k: 'note', fx: { h: 1 } }; }, { c: (s) => (trk(s, 'RIM_MSG') || trk(s, 'RIM_EUREKA') || trk(s, 'RIM_MINER')) && !!canonOpen(s, 'leonhardt') }),
];

export const events = [].concat(miner, company, security, builder, infected, airwatch, transport, medic, msg, factory, family, union, eureka, misc);

// ── 결정 ─────────────────────────────────────────────────────────────────────
const marryOk = (id) => (s) => ENGINE_DECISIONS.marry.ok(s) && !!s.S.flags.y_marry && !!s.S.flags.y_marry.v && s.S.flags.y_marry.v.type.id === id;
const marryPick = (s, p) => { const r = s.S.flags.y_marry && s.S.flags.y_marry.v; if (!r) return null; Object.assign(p, r); return r; };
const CH = [{ k: 'accept', label: '받아들인다', auto: 1.4 }, { k: 'hold', label: '보류한다', auto: 0.5 }, { k: 'decline', label: '거절한다', auto: 0.4 }];

export const decisions = {
  marry_community: {
    once: false, at: 0.45, ok: marryOk('community'),
    build: (s, p) => { const r = marryPick(s, p); if (!r) return null; const pr = r.prospect;
      return { title: '가족공동체 혼인', body: wa(pr.name) + ' 혼담이 공동체 회의에 올라왔습니다. 두 공동체가 합치는 일이라 어른들이 먼저 앉았습니다. 지참금은 통조림 몇 상자입니다.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람이라 공동체가 없습니다.' : ''), choices: CH }; },
    apply: (s, k, p) => ENGINE_DECISIONS.marry.apply(s, k, p),
  },
  marry_company: {
    once: false, at: 0.45, ok: marryOk('company'),
    build: (s, p) => { const r = marryPick(s, p); if (!r) return null; const pr = r.prospect;
      return { title: '회사 등기 혼인', body: wa(pr.name) + ' 회사 인사부에 혼인을 등기하자는 말이 나왔습니다. 기숙사 가족동으로 옮길 수 있고, 배우자도 회사 명부에 오릅니다. 명부에 오르는 것이 좋은 일인지는 사람마다 달랐습니다.', choices: CH }; },
    apply: (s, k, p) => ENGINE_DECISIONS.marry.apply(s, k, p),
  },
  // 갱도 최심부 자원(피트싱커)
  rim_pitsinker_deep: {
    tags: [T('RIM_MINER', 'pitsinker')], once: false, gap: 2, at: 0.5,
    ok: (s) => trk(s, 'RIM_MINER') && stageId(s) === 'pitsinker' && s.rng.chance(0.5),
    build: (s) => ({ title: '가장 깊은 틈', body: '조장이 가장 깊은 틈에 들어갈 사람을 찾습니다. 들어가면 통조림 셋과 조장의 기억. 틈 너머는 아무도 본 적이 없습니다.',
      choices: [{ k: 'go', label: '자원한다', sub: '통조림 셋', auto: 0.8 }, { k: 'no', label: '뒤에 선다', auto: 1.2 }] }),
    apply: (s, k) => { if (k === 'no') return '뒤에 섰습니다. 앞에 선 아이가 들어갔습니다.';
      if (s.rng.chance(0.15) && !s.S.ori.on) { s.infect('work'); return { t: '들어갔습니다. 틈 너머에 결정이 있었습니다. 만지지 않았고, 숨은 쉬었습니다.', k: 'bad', fx: { standing: 5, hl: -3 } }; }
      if (s.rng.chance(0.4)) { s.promote({ force: true, quiet: true }); return { t: '들어갔다 나왔습니다. 조장이 기억했고, 다음 해 어른 헬멧을 받았습니다.', k: 'warm', fx: { standing: 6, hl: -2, h: 2 } }; }
      return { t: '들어갔다 나왔습니다. 통조림 셋. 틈 너머에는 틈이 더 있었습니다.', k: 'ev', fx: { standing: 4, hl: -2 } }; },
  },
  // 노조 가입(광부 → 노조)
  rim_union_join: {
    tags: [T('RIM_MINER')], once: false, gap: 5, at: 0.5,
    ok: (s) => trk(s, 'RIM_MINER') && s.S.track.stage >= 1 && s.S.age >= 18 && s.rng.chance(0.4),
    build: (s) => ({ title: '조합원증', body: '노조 사람이 조합원증을 내밀었습니다. 마스크 교체비부터 지분까지. 회사 명부에 표시가 붙는다는 것도 함께 말해 주었습니다.',
      choices: [{ k: 'join', label: '노조에 들어간다', sub: '노조·노동자 연합', auto: 0.7 }, { k: 'card', label: '증만 받고 갱도에 남는다', auto: 1 }, { k: 'no', label: '받지 않는다', auto: 1 }] }),
    apply: (s, k) => { if (k === 'no') return '받지 않았습니다. 노조 사람은 다음 급여일에 다시 왔습니다.';
      if (k === 'card') { s.S.flags.rimUnionCard = s.S.age; return { t: '증만 받았습니다. 갱도는 그대로였고, 명부의 표시는 붙었습니다.', k: 'note', fx: { cap: { ties: 0.03 }, standing: -2 } }; }
      return s.switchTrack('RIM_UNION', 'switch') ? false : '자리가 없다고 했습니다. 증만 받았습니다.'; },
  },
  // 지분 요구(노조·공동체)
  rim_share_demand: {
    tags: ['rim'], once: false, gap: 6, at: 0.5,
    ok: (s) => (trk(s, 'RIM_UNION') || trk(s, 'RIM_FAMILY')) && s.S.track.stage >= 1 && s.rng.chance(0.3),
    build: (s) => ({ title: '지분', body: '광산 지분을 요구하는 안이 올라왔습니다. 울타리 사건 때 금지되었던 것. 회사는 지분이라는 말이 나오면 협상을 끝낸다고 했습니다.',
      choices: [{ k: 'demand', label: '지분을 요구한다', auto: 0.8 }, { k: 'wage', label: '임금만 요구한다', auto: 1.2 }] }),
    apply: (s, k) => { if (k === 'wage') { s.S.track.standing = Math.min(100, s.S.track.standing + 3); return { t: '임금만 요구했습니다. 회사는 반을 들어주었고, 지분이라는 말은 서랍에 남았습니다.', k: 'note', fx: { money: medX(s, 0.1) } }; }
      if (s.rng.chance(0.35)) { s.fall(trk(s, 'RIM_UNION') ? 'arrest' : 'purge'); return false; }
      s.S.track.standing = Math.min(100, s.S.track.standing + 12); return { t: '지분을 요구했습니다. 협상은 끝났고, 광산촌에서 제 이름을 아는 사람이 늘었습니다.', k: 'big', fx: { h: 3 } }; },
  },
  // 자발 추방(감염자)
  rim_self_exile: {
    tags: [T('RIM_INFECTED')], once: false, gap: 3, at: 0.5,
    ok: (s) => trk(s, 'RIM_INFECTED') && s.S.track.stage >= 1 && s.S.age >= 14 && !s.S.prison && s.rng.chance(0.35),
    build: (s) => ({ title: '자발 추방', body: '가족을 지키려면 떠나는 것뿐이라고들 합니다. 용문 쪽. 명단에 이름을 올리면 회사가 차비를 줍니다. 돌아올 수 없고, 편지는 오지 않습니다.',
      choices: [{ k: 'go', label: '떠난다', sub: '자발 추방', auto: 0.6 }, { k: 'stay', label: '남는다', auto: 1.4 }] }),
    apply: (s, k) => { if (k === 'stay') return '남았습니다. 옆 침대가 또 비었습니다.';
      s.S.status.stigma = s.S.status.stigma || 'exile'; return s.migrate('exile', 'lungmen') ? false : '명단은 올해 닫혀 있었습니다.'; },
  },
  // 감염 숨김(판정 전)
  rim_infected_hide: {
    tags: ['rim', 'infected', '!known', '!track:RIM_INFECTED'], once: true, at: 0.4,
    ok: (s) => !!s.S.track && s.S.ori.stage >= 1 && s.rng.chance(0.4),
    build: (s) => ({ title: '검진', body: '회사 검진이 다음 주입니다. 결정이 손등에 났습니다. 검진에 가면 명부에 오르고, 가지 않으면 결근입니다. 결근 셋이면 해고입니다.',
      choices: [{ k: 'hide', label: '검진을 피한다', auto: 0.8 }, { k: 'go', label: '검진을 받는다', sub: '명부', auto: 1.2 }] }),
    apply: (s, k) => { if (k === 'go') { s.S.ori.known = true; s.S.flags.oriKnownAt = s.S.age; return { t: '검진을 받았습니다. 판정서가 회사에 먼저 갔습니다.', k: 'loss', fx: { h: -3 } }; }
      s.S.flags.oriHidden = true; return { t: '검진을 피했습니다. 결근 하나. 손등은 장갑으로 가렸고, 장갑은 여름에도 꼈습니다.', k: 'bad', fx: { h: -2, standing: -3 } }; },
  },
  // 이력서(의대 졸업)
  rim_medic_resume: {
    tags: [T('RIM_MEDIC', 'resume')], once: true, at: 0.5,
    ok: (s) => trk(s, 'RIM_MEDIC') && stageId(s) === 'resume' && s.rng.chance(0.7),
    build: (s) => ({ title: '마지막 봉투', body: '봉투가 둘 남았습니다. 광산회사 의료부와 로도스 아일랜드 인턴. 둘 다 받아 주겠다고 합니다. 회사는 급여가 있고, 로도스는 배가 떠납니다.',
      choices: [{ k: 'company', label: '회사 의료부', auto: 1 }, { k: 'rhodes', label: '로도스 인턴', sub: '배', auto: 0.8 }] }),
    apply: (s, k) => { if (k === 'company') { s.promote({ force: true, quiet: true }); return { t: '회사 봉투를 열었습니다. 인턴. 급여는 통조림이 아니라 돈이었습니다.', k: 'ev', fx: { h: 2 } }; }
      s.S.flags.rhodes_medical_pact = s.S.age; s.promote({ force: true, quiet: true }); return { t: '로도스 쪽 봉투를 열었습니다. 항구로 갔습니다. 반년 뒤 시험이 있다고 했습니다.', k: 'ev', fx: { h: 3 } }; },
  },
  // 구조 자원(갱도 붕괴)
  rim_rescue_volunteer: {
    tags: ['rim'], once: false, gap: 5, at: 0.5,
    ok: (s) => (trk(s, 'RIM_MINER') || trk(s, 'RIM_SECURITY') || trk(s, 'RIM_BUILDER') || trk(s, 'RIM_FACTORY')) && s.S.age >= 16 && s.rng.chance(0.2),
    build: (s) => ({ title: '사이렌', body: '갱도가 무너졌습니다. 회사 구조대는 두 시간 뒤에 옵니다. 지금 들어가는 사람은 자원자뿐이고, 안에는 교대 열둘이 있습니다.',
      choices: [{ k: 'go', label: '들어간다', auto: 1 }, { k: 'wait', label: '구조대를 기다린다', auto: 1 }] }),
    apply: (s, k) => { if (k === 'wait') return { t: '기다렸습니다. 구조대가 왔고, 여섯을 꺼냈습니다.', k: 'bad', fx: { h: -3 } };
      if (s.rng.chance(0.1)) { s.die('mine_accident', '광산 사고'); return false; }
      s.S.flags.rhodes_rescue = s.S.age; return { t: '들어갔습니다. 넷을 꺼냈습니다. 나중에 온 구조대에 로도스 아일랜드 사람이 있었고, 제 이름을 물었습니다.', k: 'big', fx: { hl: -6, h: 2, standing: 6 } }; },
  },
  // 광산 폐쇄 전직
  rim_mine_closure: {
    tags: [T('RIM_MINER')], once: true, at: 0.5,
    ok: (s) => trk(s, 'RIM_MINER') && (s.S.track.aff === 'RIM_MIN_GREENING' || (s.S.track.stage >= 1 && s.rng.chance(0.08))),
    build: (s) => ({ title: '폐광', body: mineName(s) + ' 갱도가 닫힙니다. 슬러그 둥지였습니다. 회사는 다른 광산 자리와 가공 공장 자리를 하나씩 내놓았습니다.',
      choices: [{ k: 'mine', label: '다른 광산으로', auto: 1 }, { k: 'factory', label: '가공 공장으로', sub: '가공·제조 공장', auto: 1 }] }),
    apply: (s, k) => { if (k === 'factory') return s.switchTrack('RIM_FACTORY', 'switch') ? false : '공장 자리는 먼저 찼습니다. 다른 광산으로 갔습니다.';
      s.S.track.aff = s.rng.pick(['RIM_MIN_IRONCARROT', 'RIM_MIN_IRONFIST']); return { t: '다른 광산으로 옮겼습니다. 갱도는 비슷했고, 얼굴은 달랐습니다.', k: 'note', fx: { h: -1 } }; },
  },
};

// W11: 엔진 id 와 같은 결정은 국가 디스패처로 옮긴다(여러 파일이 같은 id 를 등록해도 거주국별로 분기)
hoist(decisions, { marry_community: ['rim'], marry_company: ['rim'] });

export default { events, decisions };
