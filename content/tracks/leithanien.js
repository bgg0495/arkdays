// W9c 라이타니엔 진로 콘텐츠. 진로 id·단계 id 는 data/tracks/leithanien.json. 태그는 track:<ID>:<stageId>.
// 핵심 5: LEI_MUSIC(궁정 음악가, A12) · LEI_GEND(헌병·게사츠슈베이터) · LEI_COURT(아츠 귀족·선제후령) · LEI_QUAR(격리구역, forced) · LEI_FARM(농민, 생업).
// 나머지: REMNANT · STREET · TUNER · INN · CIVIC · UNIV · ARTS.
// LEI_QUAR 는 엔진이 넣지 않는다(W7 메모 §4-12): 감염 판정 뒤 격리 플래그가 서면 lei_quar_enter 가 enterTrack(how:'forced') 로 넣는다.
// 시대: ~1077 위치킹(공물 할당) / 1077~ 여황 / 1097 월루몽드(bigevents wolumonde_1097) / 1100 속세의 음.
import { orgF, F, fest, cul, medX, lifeRoll, once, eul, iga, eun, wa, ro, rago, artsLow } from '../_util.js';
import { E, T, TR, AF, fresh, stageYears, fell, affIs, affName, standing, trStage, openSwitch, canonOk, canonSeen, marryDecision, homeDecision } from './_w9c_util.js';

const N = 'leithanien';
const MUS = 'LEI_MUSIC', GEND = 'LEI_GEND', COURT = 'LEI_COURT', QUAR = 'LEI_QUAR', FARM = 'LEI_FARM';
const REM = 'LEI_REMNANT', STR = 'LEI_STREET', TUN = 'LEI_TUNER', INN = 'LEI_INN', CIV = 'LEI_CIVIC', UNI = 'LEI_UNIV', ARTS = 'LEI_ARTS';
const witchking = (s) => s.year < 1077;
const empress = (s) => s.year >= 1077;
const artsHigh = (s) => s.S.cap && s.S.cap.arts >= 0.5;

export const events = [
  // ═══════════════════════════════════════ LEI_QUAR 격리구역 (forced) — 진입 ═══════════════════════════════════════
  E('lei_quar_enter', [0, 99], [N, 'known', '!track:' + QUAR], 1000, 0, (s) => {
    const ok = s.enterTrack(QUAR, { how: 'forced', via: 'diagnosed', quiet: true });
    if (!ok) return { t: '격리구역 입소 명령서가 왔습니다. 짐은 가방 하나만 허락되었습니다.', k: 'bad', fx: { h: -5 } };
    const a = s.aff ? s.aff.name : '지정구역';
    return { t: ro(a) + ' 옮겨졌습니다. 짐은 가방 하나, 악기는 그 가방에 들어가는 것만 허락되었습니다. 문은 안에서 열리지 않았습니다.', k: 'bad', fx: { h: -6 } };
  }, { c: (s) => !!s.S.flags.quarantined && !s.S.rhodes && !s.S.prison && s.S.cur === N, rep: true }),
  // ── admit 입소 ──
  E('lei_qua_adm_number', [0, 99], T(QUAR, 'admit'), 30, 2, { t: '번호를 받았습니다. 이름은 서류 둘째 줄로 내려갔습니다.', k: 'bad', fx: { h: -2 } }),
  E('lei_qua_adm_wall', [0, 99], T(QUAR, 'admit'), 25, 2, { t: '담 너머로 도시 소리가 들렸습니다. 연주회가 있는 밤이었습니다. 담 안쪽에서도 누군가 따라 흥얼거렸습니다.', k: 'note', fx: { h: 1 } }),
  E('lei_qua_adm_medicine', [0, 99], T(QUAR, 'admit'), 25, 2, { t: '약값 고지서가 왔습니다. 약은 진행을 늦추는 것이었고, 값은 늦추지 않았습니다.', k: 'bad', fx: { money: (s) => -medX(s, 0.1) }, f: (s) => F('격리구역 약제 배급 고지서, 월 40두카트') }),
  E('lei_qua_adm_family', [0, 99], T(QUAR, 'admit'), 20, 3, { t: '가족 면회는 한 달에 한 번, 유리 너머였습니다. 유리에 손을 대지 말라는 안내문이 있었습니다.', k: 'loss', fx: { h: -3 } }),
  // ── labor 약값 노동 ──
  E('lei_qua_lab_workshop', [8, 99], T(QUAR, 'labor'), 30, 2, { t: '구역 작업장에서 악보를 베꼈습니다. 밖의 악단이 쓸 악보였고, 베낀 사람 이름은 적히지 않았습니다.', fx: { money: (s) => medX(s, 0.05) }, f: (s) => F('격리구역 작업장 임률표, 악보 1장 2두카트') }),
  E('lei_qua_lab_fee', [8, 99], T(QUAR, 'labor'), 25, 2, { t: '한 달 일해 약 한 달치를 샀습니다. 셈이 늘 거기서 끝났습니다.', k: 'bad', fx: { hl: -1 } }),
  E('lei_qua_lab_music', [8, 99], T(QUAR, 'labor'), 25, 3, (s) => (artsHigh(s) ? { t: '구역 안에서 연주했습니다. 담 밖 사람들이 담 가까이 와서 들었고, 그 이름을 입에 올리지는 않았습니다.', k: 'warm', fx: { h: 3, standing: 4 } } : { t: '구역 안 누군가의 피아노 소리가 밤마다 났습니다. 밖에서 듣는 사람이 있다는 말이 돌았습니다.', k: 'note', fx: { h: 1 } })),
  E('lei_qua_lab_patron', [8, 99], T(QUAR, 'labor'), 15, 5, { t: '영주 부인이 구역 연주회를 후원했습니다. 연주회는 좋았고, 부인의 다른 연구 이야기는 아무도 하지 않았습니다.', k: 'note', fx: { money: (s) => medX(s, 0.1), h: -1 } }, { c: artsHigh }),
  // ── severe 중증 ──
  E('lei_qua_sev_bed', [8, 99], T(QUAR, 'severe'), 30, 2, { t: '작업장 대신 병동이었습니다. 창이 있었고, 창은 담 쪽이었습니다.', k: 'bad', fx: { hl: -3 } }),
  E('lei_qua_sev_notice', [8, 99], T(QUAR, 'severe'), 25, 2, { t: '서류에 "3기 도달 시 국가 조치"라는 줄이 있었습니다. 그 줄을 읽고 또 읽었습니다.', k: 'bad', fx: { h: -4 }, f: (s) => F('보건령 제3조 안내문') }),
  E('lei_qua_sev_hide', [8, 99], T(QUAR, 'severe'), 20, 3, { t: '검진 때 기침을 참았습니다. 의사는 알았고, 그날은 적지 않았습니다.', k: 'note', fx: { h: 1 } }),
  E('lei_qua_sev_letter', [8, 99], T(QUAR, 'severe'), 20, 3, { t: '편지를 썼습니다. 받을 사람 이름은 썼고, 부칠지는 정하지 못했습니다.', k: 'loss', fx: { h: -2 } }),
  // ── end 국가 안락사 ──
  E('lei_qua_end_date', [8, 99], T(QUAR, 'end'), 1000, 0, (s) => { s.die('euthanasia', '제도적 안락사'); }, { c: (s) => stageYears(s) >= 1 }),
  E('lei_qua_end_last', [8, 99], T(QUAR, 'end'), 30, 0, { t: '마지막 면회가 허락되었습니다. 유리 없이였습니다.', k: 'loss', fx: { h: 2 } }),
  E('lei_qua_lab_worse', [0, 99], T(QUAR, 'labor'), 800, 0, (s) => { s.promote({ force: true, quiet: true }); return { t: '검진에서 진행이 확인되었습니다. 작업장 번호가 지워지고 병동 번호가 적혔습니다.', k: 'bad', fx: { h: -3 } }; }, { c: (s) => s.S.ori.stage >= 2 }),
  E('lei_qua_sev_final', [0, 99], T(QUAR, 'severe'), 800, 0, (s) => { s.promote({ force: true, quiet: true }); return { t: '통지서가 왔습니다. 날짜가 적혀 있었습니다. 서류는 그것을 "조치"라고 불렀습니다.', k: 'bad', fx: { h: -6 } }; }, { c: (s) => s.S.ori.stage >= 3 }),
  E('lei_qua_adm_worse', [0, 99], T(QUAR, 'admit'), 800, 0, (s) => { s.promote({ force: true, quiet: true }); return { t: '입소 첫해가 지나기 전에 작업 배정표가 왔습니다. 약값은 일로 낸다고 적혀 있었습니다.', k: 'bad', fx: { h: -2 } }; }, { c: (s) => s.S.ori.stage >= 2 }),
  E('lei_qua_aff_afterglow', [0, 99], ['aff:LEI_QUAR_AFTERGLOW'], 20, 4, { t: '애프터글로 구역에는 피아노가 한 대 있었습니다. 조율은 아무도 하지 않았고, 그래도 소리는 났습니다.', k: 'note' }),
  E('lei_qua_aff_wolumonde', [0, 99], ['aff:LEI_QUAR_WOLUMONDE'], 20, 4, (s) => ({ t: s.year >= 1097 ? '월루몽드 지정구역은 봉기 뒤 담이 높아졌습니다. 담 너머에 마을은 없었습니다.' : '월루몽드 지정구역 담 너머로 마을 장날 소리가 들렸습니다. 배급은 장날 다음 날이었습니다.', k: 'note', fx: { h: -1 } })),
  TR('lei_qua_tr_labor', [0, 99], QUAR, 'labor', '약값 노동에 배정되었습니다. 일을 해야 약을 받고, 약을 받아야 일을 했습니다.', 'bad'),
  TR('lei_qua_tr_severe', [0, 99], QUAR, 'severe', '중증 병동으로 옮겨졌습니다. 작업장 번호가 지워지고 병동 번호가 적혔습니다.', 'bad', { h: -3 }),
  TR('lei_qua_tr_end', [0, 99], QUAR, 'end', '통지서가 왔습니다. 날짜가 적혀 있었습니다. 서류는 그것을 "조치"라고 불렀습니다.', 'bad', { h: -6 }),

  // ═══════════════════════════════════════ LEI_MUSIC 음악가 (핵심, A12) ═══════════════════════════════════════
  E('lei_mus_loc_ballroom', [10, 40], T(MUS, 'local'), 30, 2, { t: '지역 무도회장에서 연주했습니다. 춤추는 사람들은 음악을 듣지 않았고, 틀리면 들었습니다.', fx: { cap: { arts: 0.03 }, money: (s) => medX(s, 0.03) }, f: (s) => F('무도회장 악사 급료, 하룻밤 8두카트') }),
  E('lei_mus_loc_record', [10, 40], T(MUS, 'local'), 25, 3, { t: '음반 가게에서 처음 당신 연주가 틀어졌습니다. 가게 주인이 손님에게 이름을 말해 주었습니다.', k: 'warm', fx: { standing: 3, h: 2 } }),
  E('lei_mus_loc_noble', [10, 40], T(MUS, 'local'), 20, 3, { t: '귀족 손님이 연주 뒤 명함을 두고 갔습니다. 명함에는 저택 이름만 있었습니다.', k: 'note', fx: { cap: { ties: 0.03 } } }),
  E('lei_mus_loc_defect', [10, 40], T(MUS, 'local'), 20, 3, { t: '같은 무도회장 악사 하나가 결함품이라는 말을 들었습니다. 그는 그날 밤 악기를 두고 갔습니다.', k: 'bad', fx: { h: -2 } }),
  E('lei_mus_pat_hall', [13, 50], T(MUS, 'patron'), 30, 2, { t: '영주 후원 연주회에 섰습니다. 홀 천장이 높았고, 소리가 돌아오는 데 한 박자가 걸렸습니다.', fx: { cap: { arts: 0.03 }, standing: 3 } }),
  E('lei_mus_pat_charity', [13, 50], T(MUS, 'patron'), 25, 3, { t: '자선곡 수익을 전액 기부했습니다. 신문이 그것을 실었고, 후원자가 그 신문을 액자에 넣었습니다.', k: 'note', fx: { standing: 4, money: (s) => -medX(s, 0.05) } }),
  E('lei_mus_pat_demand', [13, 50], T(MUS, 'patron'), 25, 3, { t: '후원자가 곡을 바꾸라고 했습니다. 후원자 딸의 이름이 들어간 곡이었습니다. 바꿨습니다.', k: 'note', fx: { h: -2, money: (s) => medX(s, 0.08) } }),
  E('lei_mus_pat_infected', [13, 50], T(MUS, 'patron'), 15, 5, { t: '감염자 연주자가 같은 무대에 섰습니다. 후원자는 그를 뒷문으로 들였고, 박수는 앞문 것과 같았습니다.', k: 'note', fx: { h: -1 } }),
  E('lei_mus_roy_rehearsal', [16, 60], T(MUS, 'royal'), 30, 2, { t: '왕실악단 연습실에 앉았습니다. 서른 명이 같은 소절을 백 번 했고, 백한 번째에 악장이 고개를 끄덕였습니다.', fx: { cap: { arts: 0.03 }, standing: 2 }, f: (s) => F('왕실악단 단원 명부, 30인') }),
  E('lei_mus_roy_court', [16, 60], T(MUS, 'royal'), 25, 3, { t: '궁정 연주회에서 여황 쪽을 보지 않고 연주했습니다. 보지 않는 것이 규칙이었습니다.', k: 'note', fx: { standing: 2 } }),
  E('lei_mus_roy_portrait', [16, 60], T(MUS, 'royal'), 15, 5, { t: '궁정에 들어온 초상화 하나가 압수되었습니다. 악단은 그 초상화 앞에서 연주한 적이 있었고, 그 일은 없던 것이 되었습니다.', k: 'bad', fx: { h: -2 } }),
  E('lei_mus_roy_1100', [10, 60], 'track:' + MUS, 200, 0, { t: '여황 축제에서 하늘이 열렸습니다. 악단은 연주를 멈추지 않았습니다. 멈추라는 신호가 없었습니다.', k: 'big', fx: { h: -3, standing: 3 } }, { c: (s) => s.year === 1100 }),
  E('lei_mus_kap_baton', [20, 70], T(MUS, 'kapellmeister'), 30, 2, { t: '지휘봉을 들었습니다. 서른 명이 당신 손을 보았고, 손이 먼저 떨리고 소리가 뒤따랐습니다.', fx: { standing: 3 }, f: (s) => F('왕실악단 연간 연주 일정, 24회') }),
  E('lei_mus_kap_select', [20, 70], T(MUS, 'kapellmeister'), 25, 3, { t: '단원을 뽑았습니다. 적성 서류가 먼저 올라왔고, 연주는 그다음이었습니다. 순서를 바꿨습니다.', k: 'note', fx: { standing: -1, h: 2 } }),
  E('lei_mus_kap_elector', [20, 70], T(MUS, 'kapellmeister'), 20, 4, { t: '선제후가 곡을 청했습니다. 대관식에서 연주될 곡이었고, 헌장 선율을 넣으라고 했습니다. 넣었습니다.', k: 'note', fx: { standing: 4 } }),
  E('lei_mus_kap_rival', [20, 70], T(MUS, 'kapellmeister'), 15, 5, { t: '다른 악장이 당신 곡을 먼저 연주했습니다. 궁정은 누가 먼저 썼는지 묻지 않았습니다.', k: 'bad', fx: { h: -3, standing: -2 } }),
  E('lei_mus_emp_throne', [25, 85], T(MUS, 'empress'), 30, 2, { t: '옥좌에서 선제후들의 보고를 들었습니다. 음악으로 다스리는 나라였고, 보고는 음악이 아니었습니다.', fx: { standing: 2, h: -1 }, f: (s) => orgF(s, '선제후 보고 일지, 9개 선제후령') }),
  E('lei_mus_emp_concert', [25, 85], T(MUS, 'empress'), 25, 3, { t: '여황으로서 연주했습니다. 박수가 길었습니다. 박수의 길이는 더는 연주의 것이 아니었습니다.', k: 'note', fx: { h: -1 } }),
  E('lei_mus_emp_edict', [25, 85], T(MUS, 'empress'), 20, 4, { t: '보건령에 서명했습니다. 격리구역 조항이었습니다. 펜을 놓고 그날 연주를 하지 않았습니다.', k: 'bad', fx: { h: -4 } }),
  E('lei_mus_emp_twin', [25, 85], T(MUS, 'empress'), 15, 5, { t: '선제후 하나가 등을 돌렸습니다. 아홉 중 하나였고, 하나가 둘이 되지 않게 하는 것이 그해의 일이었습니다.', k: 'note', fx: { standing: -2 } }),
  E('lei_mus_aff_orchestra', [10, 80], ['aff:LEI_MUS_ORCHESTRA'], 20, 4, { t: '제국 오케스트라 단원증은 도시 어디서든 통했습니다. 감염 검진소에서도 줄이 달랐습니다.', k: 'note', fx: { standing: 1 } }),
  E('lei_mus_aff_afterglow', [10, 80], ['aff:LEI_MUS_AFTERGLOW'], 20, 4, { t: '애프터글로 작곡가들은 지역 홀에서 서로의 곡을 연주했습니다. 궁정은 그 이름들을 몰랐고, 홀은 알았습니다.', k: 'note', fx: { cap: { arts: 0.02 } } }),
  E('lei_mus_aff_tower', [10, 80], ['aff:LEI_MUS_TOWER'], 20, 4, { t: '고탑 하인 악사는 악기를 개조하는 일도 맡았습니다. 개조된 악기는 소리 말고 다른 것도 냈습니다.', k: 'note', fx: { cap: { arts: 0.03 }, h: -1 } }),
  TR('lei_mus_tr_patron', [12, 50], MUS, 'patron', '영주의 후원을 받게 되었습니다. 무도회장 대신 홀이었고, 홀에서는 춤추는 사람이 없었습니다.'),
  TR('lei_mus_tr_royal', [15, 60], MUS, 'royal', '왕실악단에 들어갔습니다. 단원증을 받았고, 이름 앞에 악단 이름이 붙었습니다.', 'big', { standing: 6 }),
  TR('lei_mus_tr_kapellmeister', [19, 70], MUS, 'kapellmeister', '악장이 되었습니다. 지휘봉과 함께 악단 서른 명의 적성 서류가 책상에 올라왔습니다.', 'big', { standing: 8 }),
  TR('lei_mus_tr_empress', [24, 85], MUS, 'empress', '선제후들이 당신을 선출했습니다. 악장에서 여황으로, 이 나라가 허락하는 가장 긴 사다리의 끝이었습니다.', 'big', { standing: 15, h: 3 }),
  AF('lei_mus_af_scandal', N, MUS, ['scandal'], '추문이었습니다. 무엇이었는지보다 누가 퍼뜨렸는지가 중요했고, 둘 다 알 수 없었습니다. 무대에서 내려왔습니다.', 'loss', { h: -5 }),
  AF('lei_mus_af_fade', N, MUS, ['fade'], '초대장이 줄었고, 어느 해 오지 않았습니다. 악기는 팔지 않았습니다.', 'loss', { h: -3 }),
  AF('lei_mus_af_assassination', N, MUS, ['assassination'], '연주회 뒤 누군가 칼을 들고 왔습니다. 살았고, 손가락 하나는 그 전처럼 움직이지 않았습니다.', 'loss', { hl: -5, h: -3 }),

  // ═══════════════════════════════════════ LEI_GEND 헌병 (핵심, A4) ═══════════════════════════════════════
  E('lei_gen_pri_drill', [17, 40], T(GEND, 'private'), 30, 2, { t: '훈련장에서 아츠 사격을 했습니다. 과녁보다 옆 사람 발밑이 먼저 그을렸습니다.', fx: { cap: { skill: 0.03 }, hl: -1 }, f: (s) => F('헌병대 훈련 규정, 주 3회 사격') }),
  E('lei_gen_pri_test', [17, 40], T(GEND, 'private'), 25, 3, { t: '군사 적응성 테스트를 받았습니다. 결과는 봉투에 담겨 왔고, 봉투는 상관이 먼저 열었습니다.', k: 'note' }),
  E('lei_gen_pri_escort', [17, 40], T(GEND, 'private'), 25, 3, { t: '격리구역 이송 호위를 맡았습니다. 이송자 가방에 악기가 있었습니다. 가방은 통과시켰습니다.', k: 'bad', fx: { h: -2 } }),
  E('lei_gen_pri_wedding', [17, 40], T(GEND, 'private'), 20, 4, { t: '귀족 결혼식 경호에 차출되었습니다. 도시 순찰이 그날 비었고, 빈 도시에서 무슨 일이 났는지는 다음 날 알았습니다.', k: 'note', fx: { h: -1 } }),
  E('lei_gen_tes_gold', [19, 45], T(GEND, 'tested'), 30, 2, { t: '별도 시설에서 훈련받았습니다. 아츠가 금빛으로 보이는 날이 있었고, 그런 날은 다음 날 손이 떨렸습니다.', fx: { cap: { arts: 0.04 }, hl: -2 } }),
  E('lei_gen_tes_charter', [19, 45], T(GEND, 'tested'), 25, 3, { t: '헌장에 충성을 맹세했습니다. 여황도 선제후도 아닌 헌장이었고, 그 차이를 아는 사람은 시설 안에만 있었습니다.', k: 'note', fx: { standing: 3 } }),
  E('lei_gen_tes_jealous', [19, 45], T(GEND, 'tested'), 20, 3, { t: '캐스터 가문 출신 동기가 감염자 재능을 두고 말을 했습니다. 질투였고, 질투는 금빛이 아니었습니다.', k: 'note', fx: { h: -1 } }),
  E('lei_gen_tes_remnant', [19, 45], T(GEND, 'tested'), 20, 4, { t: '잔당 거점 급습에 나갔습니다. 거점에는 악보와 아이들이 있었습니다. 보고서에는 악보만 적었습니다.', k: 'bad', fx: { h: -3, standing: 3 } }),
  E('lei_gen_off_command', [22, 55], T(GEND, 'officer'), 30, 2, { t: '소대를 맡았습니다. 순찰 노선을 짰고, 노선에서 격리구역 담을 뺐습니다. 아무도 묻지 않았습니다.', fx: { standing: 2 }, f: (s) => F('헌병대 소대 편제, 24명') }),
  E('lei_gen_off_civic', [22, 55], T(GEND, 'officer'), 25, 3, { t: '치안관과 관할을 두고 다퉜습니다. 종이 위에서였고, 종이는 헌병대 쪽이 두꺼웠습니다.', k: 'note', fx: { standing: 2 } }),
  E('lei_gen_off_hide', [22, 55], T(GEND, 'officer'), 15, 5, { t: '부하 하나가 감염을 숨기고 있었습니다. 알았습니다. 서류를 쓰지 않았고, 그는 이듬해 스스로 구역으로 갔습니다.', k: 'loss', fx: { h: -3 } }),
  E('lei_gen_off_1097', [17, 55], 'track:' + GEND, 200, 0, { t: '월루몽드 폐쇄에 투입되었습니다. 마을을 지우는 일이었고, 지도에서 지우는 것은 서류가 했습니다.', k: 'big', fx: { h: -4, standing: 3 } }, { c: (s) => s.year === 1097 || s.year === 1098 }),
  E('lei_gen_chi_capital', [30, 60], T(GEND, 'chief'), 30, 2, { t: '수도 헌병대를 맡았습니다. 외국 출신이라는 말이 뒤에서 돌았고, 앞에서는 경례가 돌았습니다.', fx: { standing: 3 } }),
  E('lei_gen_chi_viscount', [30, 60], T(GEND, 'chief'), 25, 3, { t: '작위 수여식에 섰습니다. 자작이었습니다. 헌병대장이 작위를 받는 것은 이 나라에서 드문 일이 아니었습니다.', k: 'big', fx: { standing: 5 } }, { c: (s) => stageYears(s) >= 2 }),
  E('lei_gen_chi_order', [30, 60], T(GEND, 'chief'), 20, 4, { t: '격리구역 확장 명령에 서명했습니다. 담이 한 블록 밖으로 나갔고, 그 블록 사람들은 이사했습니다.', k: 'bad', fx: { h: -3 } }),
  E('lei_gen_chi_stone', [30, 60], T(GEND, 'chief'), 15, 5, { t: '금빛 아츠가 몸에 남기 시작했습니다. 손끝이 굳었습니다. 의무관은 그것을 "직업병"이라고만 적었습니다.', k: 'bad', fx: { hl: -5 } }),
  E('lei_gen_aff_corps', [17, 60], ['aff:LEI_GEND_CORPS'], 20, 4, { t: '헌병대 막사는 도시마다 같은 모양이었습니다. 같은 모양 안에서 같은 순찰을 돌았습니다.', k: 'note' }),
  E('lei_gen_aff_gesetz', [17, 60], ['aff:LEI_GEND_GESETZ'], 20, 4, { t: '게사츠슈베이터의 금빛 제복은 거리에서 사람을 비켜서게 했습니다. 비켜선 사람들은 눈을 맞추지 않았습니다.', k: 'note', fx: { standing: 2, h: -1 } }),
  E('lei_gen_aff_tower', [17, 60], ['aff:LEI_GEND_TOWER'], 20, 4, { t: '고탑 캐스터 부대는 탑 위에서 도시를 내려다보았습니다. 내려다보면 사람은 작았고, 그것이 일을 쉽게 했습니다.', k: 'note', fx: { cap: { arts: 0.03 }, h: -1 } }),
  TR('lei_gen_tr_tested', [18, 45], GEND, 'tested', '적응성 테스트를 통과했습니다. 별도 시설행 명령이 왔고, 가족에게는 "전근"이라고 말했습니다.', 'ev', { standing: 4 }),
  TR('lei_gen_tr_officer', [21, 55], GEND, 'officer', '장교가 되었습니다. 견장이 바뀌었고, 순찰 노선을 짜는 쪽이 되었습니다.', 'big', { standing: 5 }),
  TR('lei_gen_tr_chief', [29, 60], GEND, 'chief', '헌병대장이 되었습니다. 도시 하나의 담과 문이 당신 서명으로 열리고 닫혔습니다.', 'big', { standing: 8 }),
  AF('lei_gen_af_kia', N, GEND, ['kia'], '작전 중 크게 다쳤습니다. 제대 서류에는 "명예"라는 말이 있었고, 연금 액수는 없었습니다.', 'loss', { hl: -4 }),
  AF('lei_gen_af_arrest', N, GEND, ['arrest', 'courtmartial'], '군법 회의였습니다. 죄목은 명령 불이행이었고, 그 명령이 무엇이었는지는 기록에 없습니다.', 'loss', { h: -4 }),

  // ═══════════════════════════════════════ LEI_COURT 선제후령 궁정 (핵심, A3) ═══════════════════════════════════════
  E('lei_cou_pag_door', [16, 40], T(COURT, 'page'), 30, 2, { t: '선제후 집무실 문 앞에 섰습니다. 누가 들어가고 누가 돌아가는지로 그해의 정치를 배웠습니다.', fx: { cap: { ties: 0.03 } }, f: (s) => orgF(s, '궁정 시종 명부, 시종 40인') }),
  E('lei_cou_pag_music', [16, 40], T(COURT, 'page'), 25, 3, { t: '궁정 연주회에서 악보를 넘겼습니다. 한 장을 늦게 넘겼고, 악장은 눈으로만 꾸짖었습니다.', k: 'note', fx: { cap: { arts: 0.02 } } }),
  E('lei_cou_pag_bastard', [16, 40], T(COURT, 'page'), 20, 4, { t: '시종 하나가 선제후의 사생아라는 말이 돌았습니다. 그는 다음 해 카시미어로 갔습니다. 작위는 가지 못했습니다.', k: 'note', fx: { h: -1 } }),
  E('lei_cou_pag_tribute', [16, 40], T(COURT, 'page'), 20, 4, (s) => (witchking(s) ? { t: '공물 장부를 날랐습니다. 숫자 옆에 사람 이름이 있었고, 그 사람들이 어디로 가는지는 장부가 말하지 않았습니다.', k: 'bad', fx: { h: -3 } } : { t: '옛 공물 장부가 서고에서 나왔습니다. 태우라는 명령이었고, 태우기 전에 한 장을 읽었습니다.', k: 'bad', fx: { h: -2 } })),
  E('lei_cou_off_decree', [20, 55], T(COURT, 'official'), 30, 2, { t: '선제후령 포고문을 썼습니다. 두카트 주조량이었고, 숫자 하나로 도시 물가가 달라졌습니다.', fx: { standing: 3 }, f: (s) => orgF(s, '선제후령 주조 포고') }),
  E('lei_cou_off_salon', [20, 55], T(COURT, 'official'), 25, 3, { t: '살롱에 초대받았습니다. 음악 이야기였고, 음악 이야기 사이에 임명 이야기가 끼어 있었습니다.', k: 'note', fx: { cap: { ties: 0.03 } } }),
  E('lei_cou_off_sarkaz', [20, 55], T(COURT, 'official'), 15, 5, { t: '하인 하나가 카프리니 행세를 한 살카즈였습니다. 알았습니다. 서류에 적지 않았고, 그는 다음 해 스스로 떠났습니다.', k: 'note', fx: { h: -1 } }),
  E('lei_cou_off_wolumonde', [16, 55], 'track:' + COURT, 200, 0, { t: '월루몽드 폐쇄 공고에 당신 부서 인장이 찍혔습니다. 감염자 소요라고만 썼고, 더 쓰지 않는 것이 명령이었습니다.', k: 'big', fx: { h: -3, standing: 2 } }, { c: (s) => s.year === 1097 }),
  E('lei_cou_cha_council', [28, 65], T(COURT, 'chancellor'), 30, 2, { t: '선제후령 평의회를 이끌었습니다. 선제후는 앉아 있었고, 말은 당신이 했습니다.', fx: { standing: 3 }, f: (s) => orgF(s, '선제후령 평의회 의사록, 위원 15인') }),
  E('lei_cou_cha_capital', [28, 65], T(COURT, 'chancellor'), 25, 3, { t: '수도에 갔습니다. 다른 선제후령 재상들과 마주 앉았고, 아홉 중 누가 다음 여황을 밀지로 저녁이 길었습니다.', k: 'note', fx: { cap: { ties: 0.03 } } }),
  E('lei_cou_cha_purge', [28, 65], T(COURT, 'chancellor'), 15, 5, { t: '궁정 관리 하나가 하룻밤에 사라졌습니다. 그의 서류는 당신 책상으로 왔고, 서류에는 아무 잘못도 없었습니다.', k: 'bad', fx: { h: -3 } }),
  E('lei_cou_cha_1100', [16, 65], 'track:' + COURT, 200, 0, { t: '여황 축제에서 하늘이 열린 뒤, 리치들이 도시를 떠났습니다. 떠난 자리의 서류 정리가 당신 부서 몫이었습니다.', k: 'big', fx: { h: -2, standing: 3 } }, { c: (s) => s.year === 1100 }),
  E('lei_cou_ele_vote', [35, 80], T(COURT, 'elector'), 30, 2, { t: '선제후로서 여황 선출에 표를 던졌습니다. 아홉 표 중 하나였고, 하나가 결과를 바꾼 적은 당신 대에 없었습니다.', fx: { standing: 3 } }),
  E('lei_cou_ele_mint', [35, 80], T(COURT, 'elector'), 25, 3, { t: '당신 얼굴이 새겨진 두카트가 나왔습니다. 시장에서 그 돈으로 빵을 샀고, 빵 장수는 얼굴을 알아보지 못했습니다.', k: 'note', fx: { h: 1 } }),
  E('lei_cou_ele_heir', [35, 80], T(COURT, 'elector'), 20, 4, { t: '후계를 정했습니다. 적자였고, 다른 아이는 카시미어에서 편지를 보내왔습니다. 답장은 쓰지 않았습니다.', k: 'note', fx: { h: -2 } }),
  E('lei_cou_ele_tribute', [35, 80], T(COURT, 'elector'), 25, 4, { t: '옛 공물 할당 기록을 선제후로서 읽었습니다. 전임자들의 인장이 찍혀 있었고, 당신 인장은 그 옆에 찍히지 않았습니다.', k: 'note', fx: { h: -2 } }, { c: empress }),
  E('lei_cou_aff_elector', [16, 80], ['aff:LEI_COURT_ELECTOR'], 20, 4, { t: '선제후령 궁정은 일곱 곳이 서로 다른 두카트를 썼습니다. 환전상이 궁정 안에 있었습니다.', k: 'note' }),
  E('lei_cou_aff_voice', [16, 80], ['aff:LEI_COURT_VOICE'], 20, 4, { t: '여황의 목소리라는 이름은 서류에 없었습니다. 당신이 하는 일도 서류에 없었습니다.', k: 'note', fx: { standing: 2, h: -1 } }),
  TR('lei_cou_tr_official', [19, 55], COURT, 'official', '궁정 관리가 되었습니다. 문 앞에서 문 안으로 자리가 옮겨졌습니다.', 'ev', { standing: 4 }),
  TR('lei_cou_tr_chancellor', [27, 65], COURT, 'chancellor', '재상이 되었습니다. 선제후령의 일이 당신 책상을 거쳐 선제후에게 갔고, 거치지 않는 것도 있었습니다.', 'big', { standing: 6 }),
  TR('lei_cou_tr_elector', [34, 80], COURT, 'elector', '선제후가 되었습니다. 아홉 명 중 하나였고, 두카트에 얼굴이 새겨졌습니다.', 'big', { standing: 10, h: 2 }),
  AF('lei_cou_af_purge', N, COURT, ['purge'], '숙청이었습니다. 하룻밤에 짐을 쌌고, 국경에서 서류 없이 통과시켜 준 사람이 있었습니다.', 'loss', { h: -5 }),
  AF('lei_cou_af_poison', N, COURT, ['poison'], '살롱에서 마신 것이 문제였습니다. 살았고, 그 뒤로 살롱에는 가지 않았습니다.', 'loss', { hl: -6 }),
  AF('lei_cou_af_scandal', N, COURT, ['scandal'], '사생아라는 말이 돌았습니다. 사실이었습니다. 작위는 거두어졌고, 저택 하나와 가정교사만 남았습니다.', 'loss', { h: -4 }),

  // ═══════════════════════════════════════ LEI_FARM 카프리니 정주민·농민 (핵심, A11 생업) ═══════════════════════════════════════
  E('lei_far_fam_vine', [12, 30], T(FARM, 'family'), 30, 2, { t: '포도밭에서 가지를 쳤습니다. 할아버지가 친 가지와 당신이 친 가지가 달랐고, 가을이 그 차이를 셌습니다.', fx: { cap: { skill: 0.03 } } }),
  E('lei_far_fam_horn', [12, 30], T(FARM, 'family'), 25, 3, { t: '뿔이 자랐습니다. 산중 마을에서는 자랑이었고, 도시에 가면 잘라야 한다는 말을 들었습니다.', k: 'note' }),
  E('lei_far_fam_school', [12, 30], T(FARM, 'family'), 25, 3, { t: '마을 학교에서 아츠 교습이 있었습니다. 선생은 한 달에 한 번 왔고, 한 달에 한 번으로는 모자랐습니다.', k: 'note', fx: { cap: { arts: 0.02 } } }),
  E('lei_far_fam_tribute', [12, 30], T(FARM, 'family'), 20, 4, (s) => (witchking(s) ? { t: '선제후령에서 사람을 뽑아 갔습니다. 공물이라고 했습니다. 마을에서 둘이 갔고, 둘 다 돌아오지 않았습니다.', k: 'bad', fx: { h: -4 } } : { t: '할머니가 옛날 공물 이야기를 했습니다. 마을에서 둘이 갔고, 둘 다 돌아오지 않았다고 했습니다.', k: 'note', fx: { h: -1 } })),
  E('lei_far_far_harvest', [16, 65], T(FARM, 'farmer'), 30, 2, { t: '포도를 땄습니다. 올해는 당도가 좋았고, 좋은 해는 값이 내렸습니다.', fx: { money: (s) => medX(s, 0.05) }, f: (s) => F('산중 마을 수확 장부, 1통당 3두카트') }),
  E('lei_far_far_wine', [16, 65], T(FARM, 'farmer'), 25, 3, (s) => ({ t: fest(s, 1) + '에 마을 포도주를 냈습니다. 상은 못 받았고, 심사위원 하나가 한 병을 사 갔습니다.', k: 'warm', fx: { h: 2, standing: 2 } })),
  E('lei_far_far_winterwisp', [16, 65], T(FARM, 'farmer'), 20, 4, { t: '윈터위스프 사람들이 산 위에서 내려와 소금을 바꿔 갔습니다. 궁정은 그들을 모른다고 했고, 마을은 알았습니다.', k: 'note' }),
  E('lei_far_far_inspection', [16, 65], T(FARM, 'farmer'), 20, 3, { t: '감염 검진반이 마을에 왔습니다. 줄을 섰고, 줄이 끝날 때까지 아무도 집에 가지 않았습니다.', k: 'bad', fx: { h: -2 } }),
  E('lei_far_chi_council', [35, 80], T(FARM, 'chief'), 30, 2, { t: '촌장으로 선제후령 관리를 맞았습니다. 세금 장부를 보였고, 보이지 않은 장부도 있었습니다.', fx: { standing: 3 }, f: (s) => orgF(s, '산중 마을 세금 대장, 가구 45호') }),
  E('lei_far_chi_road', [35, 80], T(FARM, 'chief'), 25, 3, { t: '마을 길을 넓혔습니다. 포도 수레가 둘 지나갈 수 있게 되었고, 그만큼 세금 수레도 지나갔습니다.', k: 'note', fx: { standing: 2 } }),
  E('lei_far_chi_hide', [35, 80], T(FARM, 'chief'), 15, 5, { t: '마을 아이 하나가 감염되었습니다. 촌장인 당신이 먼저 알았습니다. 검진반이 오기 전에 아이는 산 위로 갔습니다.', k: 'loss', fx: { h: -3, standing: 2 } }),
  E('lei_far_chi_1097', [12, 80], 'track:' + FARM, 200, 0, { t: '월루몽드 쪽에서 피난민이 넘어왔습니다. 마을이 들였고, 궁정에는 보고하지 않았습니다.', k: 'big', fx: { h: -2, standing: 3, money: (s) => -medX(s, 0.05) } }, { c: (s) => s.year === 1097 || s.year === 1098 }),
  // 계절·명절·동네(생업 체감)
  E('lei_season_ball', [12, 90], [N], 20, 3, { t: '마을 무도회가 있었습니다. 악사는 둘이었고, 둘 중 하나가 틀리면 다른 하나가 덮었습니다.', k: 'warm', fx: { h: 2 } }),
  E('lei_season_orchestra', [12, 90], [N, 'urban'], 20, 3, { t: '악단 시즌이 열렸습니다. 표는 비쌌고, 연습 소리는 공짜였습니다. 창을 열어 두었습니다.', k: 'warm', fx: { h: 1 } }),
  E('lei_season_harvest', [12, 90], [N, 'rural'], 20, 3, { t: '포도 수확철이었습니다. 마을 전체가 밭에 나갔고, 학교도 쉬었습니다.', k: 'note', fx: { hl: -1, h: 1 } }),
  E('lei_season_empress', [12, 90], [N], 20, 3, (s) => ({ t: fest(s, 0) + ' 날 거리에서 헌장 선율이 연주되었습니다. 모르는 사람도 따라 불렀고, 아는 사람은 울었습니다.', k: 'warm', fx: { h: 2 } }), { c: empress }),
  E('lei_season_wine', [12, 90], [N], 15, 4, (s) => ({ t: fest(s, 1) + ' 결과가 신문에 났습니다. 이웃 마을 포도주가 상을 받았고, 그 마을은 한 해 동안 그 이야기만 했습니다.', k: 'note' })),
  E('lei_season_winter', [12, 90], [N], 15, 3, { t: '겨울 음악회가 있었습니다. 난방이 안 되는 홀이었고, 외투를 입은 채 들었습니다.', k: 'note', fx: { h: 1 } }),
  E('lei_season_cafe', [12, 90], [N, 'urban'], 15, 3, (s) => ({ t: '카페에서 ' + eul(cul(s).drink) + ' 한 잔 시켰습니다. 옆자리에서 누군가 악보에 무언가를 적고 있었습니다.', k: 'note', fx: { h: 1 } })),
  E('lei_far_aff_caprinae', [12, 80], ['aff:LEI_FARM_CAPRINAE'], 15, 4, { t: '산중 카프리니 마을은 뿔을 자르지 않습니다. 도시에서 온 사람이 그것을 사진으로 찍어 갔습니다.', k: 'note' }),
  E('lei_far_aff_winterwisp', [12, 80], ['aff:LEI_FARM_WINTERWISP'], 15, 4, { t: '윈터위스프족 마을은 지도에 없습니다. 지도에 없는 마을의 세금은 걷으러 오지 않았습니다.', k: 'note', fx: { money: (s) => medX(s, 0.02) } }),
  TR('lei_far_tr_farmer', [15, 60], FARM, 'farmer', '자기 밭을 맡았습니다. 포도나무 마흔 그루였고, 그루마다 이름을 붙였습니다.'),
  TR('lei_far_tr_chief', [33, 80], FARM, 'chief', '촌장이 되었습니다. 세금 장부와 검진 명부가 당신 집으로 왔습니다.', 'ev', { standing: 4 }),
  AF('lei_far_af_ruin', N, FARM, ['ruin'], '서리가 한 해 농사를 가져갔습니다. 밭은 팔았고, 나무는 팔지 않았습니다.', 'loss', { h: -3 }),
  AF('lei_far_af_infected', N, FARM, ['infected'], '검진반이 알았습니다. 밭은 그날로 남의 것이 되었습니다.', 'loss', { h: -3 }),
  AF('lei_far_af_catastrophe', N, FARM, ['catastrophe'], '재앙이 산을 지나갔습니다. 마을 절반이 남았고, 당신 밭은 남지 않은 절반이었습니다.', 'loss', { hl: -3, h: -4 }),

  // ═══════════════════════════════════════ 결함품(아츠 적성 낮음) ═══════════════════════════════════════
  E('lei_defect_retest', [15, 45], [N, 'cap:arts:low'], 30, 0, (s) => { s.S.flags.defective = true; s.S.flags.defectiveAdult = true; return { t: '취업 적성 재검사를 받았습니다. 결과지에 "결함"이 다시 찍혔습니다. 열 살 때와 같은 글자였고, 이번에는 아무도 놀리지 않았습니다. 그냥 조용했습니다.', k: 'bad', fx: { h: -4 }, f: orgF(s, '아츠 적성 재검사 통지서, 3등급 중 최하') }; }, { c: (s) => !s.S.flags.defectiveAdult }),
  E('lei_defect_door', [15, 70], [N, 'cap:arts:low'], 25, 4, { t: '연주회 입장이 막혔습니다. 규정은 없었고, 안내원의 눈이 규정이었습니다.', k: 'bad', fx: { h: -2 } }),
  E('lei_defect_resume', [15, 70], [N, 'cap:arts:low'], 25, 4, { t: '이력서의 아츠 적성란이 늘 먼저 읽혔습니다. 그다음 줄은 읽히지 않았습니다.', k: 'bad', fx: { h: -2 } }),
  E('lei_defect_craft', [15, 70], [N, 'cap:arts:low'], 20, 4, { t: '결함품이라고 불리는 사람들끼리 모이는 작업장이 있었습니다. 손으로 하는 일이었고, 손은 적성 검사를 받지 않았습니다.', k: 'warm', fx: { h: 2, cap: { skill: 0.03 } } }),

  // ═══════════════════════════════════════ LEI_REMNANT 위치킹 잔당 (A1) ═══════════════════════════════════════
  E('lei_rem_bel_hymn', [10, 50], T(REM, 'believer'), 30, 2, { t: '지하에서 찬가를 배웠습니다. 위치킹 시대의 곡이었고, 밖에서 부르면 체포되는 곡이었습니다.', fx: { cap: { arts: 0.03 }, standing: 2 } }),
  E('lei_rem_bel_kidnap', [10, 50], T(REM, 'believer'), 25, 3, { t: '혈족이라며 데려온 아이가 있었습니다. 아이는 울었고, 울음이 멎은 뒤 당신 옆자리에 앉았습니다.', k: 'bad', fx: { h: -3 } }),
  E('lei_rem_chi_ritual', [16, 60], T(REM, 'chief'), 30, 2, { t: '의식을 주관했습니다. 평민 하나가 실험체로 왔고, 당신은 눈을 감지 않았습니다.', k: 'bad', fx: { h: -4, standing: 4 } }),
  E('lei_rem_chi_raid', [16, 60], T(REM, 'chief'), 25, 3, { t: '헌병이 거점을 급습했습니다. 뒷문으로 나갔고, 악보는 두고 갔습니다.', k: 'bad', fx: { h: -2 } }),
  E('lei_rem_ves_voice', [18, 60], T(REM, 'vessel'), 30, 2, { t: '그릇이라고 불렸습니다. 무엇을 담는 그릇인지는 알려 주지 않았고, 밤마다 귀에서 소리가 났습니다.', k: 'bad', fx: { hl: -4, cap: { arts: 0.05 } } }),
  E('lei_rem_ves_end', [18, 60], T(REM, 'vessel'), 25, 3, { t: '수석이 당신을 보는 눈이 달라졌습니다. 사람을 보는 눈이 아니었습니다.', k: 'bad', fx: { h: -3 } }),
  E('lei_rem_aff_echo', [10, 60], ['aff:LEI_REM_ECHO'], 20, 4, { t: '헤르쿤프츠호른의 여음은 이름을 부르지 않습니다. 번호도 아니고, 음이었습니다.', k: 'note' }),
  E('lei_rem_aff_mudrock', [10, 60], ['aff:LEI_REM_MUDROCK'], 20, 4, { t: '머드락 부대와 접촉했습니다. 그들은 감염자였고, 잔당이 아니었고, 그 차이를 서로 알았습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }),
  TR('lei_rem_tr_chief', [14, 60], REM, 'chief', '수석이 되었습니다. 지하의 윗자리였고, 윗자리는 땅에 더 가까웠습니다.', 'ev', { standing: 4 }),
  TR('lei_rem_tr_vessel', [17, 60], REM, 'vessel', '그릇으로 지목되었습니다. 영광이라고 했습니다. 영광이라는 말을 하는 사람들의 얼굴이 좋지 않았습니다.', 'bad', { h: -3 }),
  AF('lei_rem_af_arrest', N, REM, ['arrest'], '헌병에 붙잡혔습니다. 살았습니다. 살려 둔 이유는 당신이 아는 것 때문이었고, 그것을 다 말한 뒤에도 살았습니다.', 'loss', { h: -5 }),
  AF('lei_rem_af_experiment', N, REM, ['experiment'], '실험대에 올랐다가 내려왔습니다. 내려온 몸은 올라간 몸과 달랐습니다.', 'loss', { hl: -8, h: -4 }),
  AF('lei_rem_af_kia', N, REM, ['kia'], '급습에서 다쳤습니다. 거점은 사라졌고, 돌아갈 지하가 없었습니다.', 'loss', { hl: -4 }),

  // ═══════════════════════════════════════ LEI_STREET 거리 악사 (A12) ═══════════════════════════════════════
  E('lei_str_str_corner', [8, 45], T(STR, 'street'), 30, 2, { t: '길모퉁이에서 연주했습니다. 모자에 동전이 떨어지는 소리가 박자였습니다.', fx: { money: (s) => medX(s, 0.02), cap: { arts: 0.02 } }, f: (s) => F('거리 연주 허가 수수료, 월 1두카트') }),
  E('lei_str_str_gendarme', [8, 45], T(STR, 'street'), 25, 3, { t: '헌병이 자리를 옮기라고 했습니다. 옮겼습니다. 옮긴 자리에서 다른 헌병이 또 옮기라고 했습니다.', k: 'bad', fx: { h: -1 } }),
  E('lei_str_bal_hire', [10, 50], T(STR, 'ballroom'), 30, 2, { t: '무도회장에서 밤마다 연주했습니다. 급료는 적었고, 지붕이 있었습니다.', fx: { money: (s) => medX(s, 0.04), standing: 2 } }),
  E('lei_str_bal_audition', [10, 50], T(STR, 'ballroom'), 25, 3, { t: '오디션 줄에 섰습니다. 줄이 길었고, 앞에서부터 "결함"이라는 말이 하나씩 들려왔습니다.', k: 'note', fx: { h: -1 } }),
  E('lei_str_pro_letter', [12, 55], T(STR, 'promoted'), 30, 2, (s) => { openSwitch(s); return { t: '오디션 통과 통지가 왔습니다. 봉투를 열고 한참 들고 있었습니다.', k: 'warm', fx: { h: 4 } }; }),
  E('lei_str_pro_wait', [12, 55], T(STR, 'promoted'), 25, 3, { t: '통과는 했는데 자리는 아직이었습니다. 자리가 날 때까지 무도회장에서 연주했습니다.', k: 'note' }),
  E('lei_str_aff_player', [8, 55], ['aff:LEI_STR_PLAYER'], 15, 4, { t: '거리 연주자들은 서로 자리를 지켜 줍니다. 자리를 뺏는 것은 헌병뿐이었습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }),
  E('lei_str_aff_audition', [8, 55], ['aff:LEI_STR_AUDITION'], 15, 4, { t: '오디션 줄에서 알게 된 사람들이 있었습니다. 반은 다음 해에도 줄에 있었고, 반은 없었습니다.', k: 'note' }),
  TR('lei_str_tr_ballroom', [9, 50], STR, 'ballroom', '무도회장에 고용되었습니다. 길모퉁이에서 지붕 아래로, 그 차이는 겨울에 컸습니다.'),
  TR('lei_str_tr_promoted', [11, 55], STR, 'promoted', '오디션을 통과했습니다. 결함이 아니라고 종이가 말했고, 종이가 말하면 사람들도 그렇게 말했습니다.', 'big', { standing: 6, h: 3 }),
  AF('lei_str_af_fade', N, STR, ['fade'], '동전이 줄었고, 어느 날 모자가 비었습니다. 악기는 전당포에 갔습니다.', 'loss', { h: -3 }),
  AF('lei_str_af_arrest', N, STR, ['arrest'], '"소란"으로 구금되었습니다. 죄목은 연주가 아니라 소란이었습니다.', 'loss', { h: -3 }),

  // ═══════════════════════════════════════ LEI_TUNER 조율사·악기점 (A11) ═══════════════════════════════════════
  E('lei_tun_cle_organ', [12, 45], T(TUN, 'cleaner'), 30, 2, { t: '오르간 파이프 속을 닦았습니다. 안에서 들으면 소리는 바깥과 달랐습니다.', fx: { cap: { skill: 0.03 } } }),
  E('lei_tun_cle_ear', [12, 45], T(TUN, 'cleaner'), 25, 3, { t: '조율사가 음 하나를 틀렸다고 했습니다. 당신 귀에도 들렸습니다. 그날부터 조율사가 당신을 다르게 보았습니다.', k: 'warm', fx: { cap: { arts: 0.03 } } }),
  E('lei_tun_tun_house', [15, 60], T(TUN, 'tuner'), 30, 2, { t: '귀족 저택 피아노를 조율했습니다. 저택 아이가 옆에서 보았고, 아이 어머니가 아이를 데려갔습니다.', fx: { money: (s) => medX(s, 0.05), standing: 2 }, f: (s) => F('조율사 조합 요율표, 피아노 1대 5두카트') }),
  E('lei_tun_tun_child', [15, 60], T(TUN, 'tuner'), 25, 3, { t: '일터에 아이를 데리고 다녔습니다. 아이는 조율을 보고 자랐고, 소리를 먼저 배웠습니다.', k: 'warm', fx: { h: 2 } }, { c: (s) => s.S.fam && s.S.fam.kids && s.S.fam.kids.length > 0 }),
  E('lei_tun_sho_shop', [20, 65], T(TUN, 'shop'), 30, 2, { t: '가게를 열었습니다. 악기와 음반이었고, 손님은 둘 다 만져 보고 하나도 사지 않는 날이 많았습니다.', fx: { money: (s) => medX(s, 0.04), standing: 2 } }),
  E('lei_tun_sho_noble', [20, 65], T(TUN, 'shop'), 25, 3, { t: '귀족 손님이 음반을 사 갔습니다. 가게 앞에 마차가 섰고, 그날 하루 동네가 그 이야기를 했습니다.', k: 'note', fx: { money: (s) => medX(s, 0.08), standing: 3 } }),
  E('lei_tun_aff_piano', [12, 65], ['aff:LEI_TUN_PIANO'], 15, 4, { t: '피아노 조율은 한 대에 반나절이었습니다. 반나절 동안 그 집 사람들의 하루가 들렸습니다.', k: 'note' }),
  E('lei_tun_aff_organ', [12, 65], ['aff:LEI_TUN_ORGAN'], 15, 4, { t: '오르간 청소는 연주회 전날 밤이었습니다. 연주회에는 초대받지 않았습니다.', k: 'note', fx: { h: -1 } }),
  E('lei_tun_aff_record', [12, 65], ['aff:LEI_TUN_RECORD'], 15, 4, { t: '음반 가게에는 궁정 악단 음반과 거리 악사 음반이 같은 선반에 있었습니다. 값은 달랐습니다.', k: 'note' }),
  TR('lei_tun_tr_tuner', [14, 60], TUN, 'tuner', '조율사가 되었습니다. 걸레 대신 조율 망치를 받았고, 손이 먼저 알았습니다.'),
  TR('lei_tun_tr_shop', [19, 65], TUN, 'shop', '가게 주인이 되었습니다. 간판에 이름을 걸었고, 간판은 적성을 묻지 않았습니다.', 'ev', { standing: 4 }),
  AF('lei_tun_af_ruin', N, TUN, ['ruin'], '손님이 끊겼습니다. 큰 가게가 옆에 생겼고, 그 가게는 조율도 공짜로 해 주었습니다.', 'loss', { h: -2 }),
  AF('lei_tun_af_infected', N, TUN, ['infected'], '검진에서 드러났습니다. 가게 문에 종이가 붙었고, 열쇠는 다른 사람 손에 갔습니다.', 'loss', { h: -3 }),

  // ═══════════════════════════════════════ LEI_INN 여관·상인·카페 (A11) ═══════════════════════════════════════
  E('lei_inn_cle_counter', [14, 50], T(INN, 'clerk'), 30, 2, { t: '카운터에 섰습니다. 손님 얼굴을 외웠고, 외운 얼굴이 돌아오면 이름 없이 맞았습니다.', fx: { cap: { ties: 0.03 } } }),
  E('lei_inn_cle_gendarme', [14, 50], T(INN, 'clerk'), 25, 3, { t: '헌병이 손님 명부를 보자고 했습니다. 보여 주었습니다. 다음 날 손님 하나가 오지 않았습니다.', k: 'bad', fx: { h: -2 } }),
  E('lei_inn_own_cafe', [18, 65], T(INN, 'owner'), 30, 2, { t: '가게를 맡았습니다. 창가 자리는 악보를 펼치는 손님 것이었고, 그 손님은 오래 앉고 적게 시켰습니다.', fx: { money: (s) => medX(s, 0.05), standing: 2 } }),
  E('lei_inn_own_trade', [18, 65], T(INN, 'owner'), 25, 3, { t: '북부 교역망 상인이 묵었습니다. 그는 월루몽드 이야기를 했고, 이야기는 해마다 짧아졌습니다.', k: 'note' }),
  E('lei_inn_hub_route', [22, 70], T(INN, 'hub'), 30, 2, { t: '기착지가 되었습니다. 북쪽 수레와 남쪽 수레가 당신 마당에서 짐을 바꿨고, 바꿀 때마다 한 몫이 남았습니다.', fx: { money: (s) => medX(s, 0.1), standing: 3 }, f: (s) => F('북부 교역망 기착지 수수료, 짐 1수레에 2두카트') }),
  E('lei_inn_hub_riot', [22, 70], T(INN, 'hub'), 20, 4, { t: '폭동 소식에 교역이 끊겼습니다. 창고가 찼고, 찬 창고는 돈이 아니었습니다.', k: 'bad', fx: { money: (s) => -medX(s, 0.1), h: -2 } }),
  E('lei_inn_aff_wolumonde', [14, 70], ['aff:LEI_INN_WOLUMONDE'], 20, 4, (s) => ({ t: s.year >= 1097 ? '월루몽드 교역망은 봉기 뒤 끊겼습니다. 기착지 간판은 그대로였고, 수레는 오지 않았습니다.' : '월루몽드 북부 교역망 수레가 들렀습니다. 변경 마을 물건이었고, 값은 쌌습니다.', k: 'note', fx: s.year >= 1097 ? { h: -2 } : { money: medX(s, 0.03) } })),
  E('lei_inn_aff_cafe', [14, 70], ['aff:LEI_INN_CAFE'], 15, 4, (s) => ({ t: '카페에는 ' + wa(cul(s).drink) + ' 신문이 있었습니다. 신문보다 악보를 펼치는 손님이 많았습니다.', k: 'note' })),
  TR('lei_inn_tr_owner', [17, 65], INN, 'owner', '주인이 되었습니다. 열쇠 꾸러미와 외상 장부가 같이 왔습니다.'),
  TR('lei_inn_tr_hub', [21, 70], INN, 'hub', '교역 기착지 운영을 맡았습니다. 마당이 창고가 되었고, 장부가 두 권이 되었습니다.', 'ev', { standing: 4 }),
  AF('lei_inn_af_ruin', N, INN, ['ruin'], '외상이 쌓였고, 외상을 준 사람들이 사라졌습니다. 가게 문을 닫았습니다.', 'loss', { h: -3 }),
  AF('lei_inn_af_raid', N, INN, ['raid'], '폭동이 가게를 지나갔습니다. 유리창과 당신 팔이 같은 날 깨졌습니다.', 'loss', { hl: -3 }),

  // ═══════════════════════════════════════ LEI_CIVIC 시 행정 (A3) ═══════════════════════════════════════
  E('lei_civ_scr_file', [18, 50], T(CIV, 'scribe'), 30, 2, { t: '서류를 베꼈습니다. 격리 명부였고, 이름을 베끼는 동안 얼굴은 떠올리지 않기로 했습니다.', fx: { cap: { learn: 0.03 }, h: -1 }, f: (s) => orgF(s, '격리 명부, 올해 120명') }),
  E('lei_civ_scr_stamp', [18, 50], T(CIV, 'scribe'), 25, 3, { t: '도장을 맡았습니다. 도장은 당신 것이 아니었고, 찍는 손은 당신 것이었습니다.', k: 'note' }),
  E('lei_civ_sch_patrol', [21, 60], T(CIV, 'schultz'), 30, 2, { t: '치안관으로 구역을 돌았습니다. 헌병과 관할이 겹쳤고, 겹친 곳에서는 둘 다 책임이 없었습니다.', fx: { standing: 2 } }),
  E('lei_civ_sch_hide', [21, 60], T(CIV, 'schultz'), 20, 4, { t: '동료 치안관이 기침을 숨겼습니다. 알았습니다. 그는 이듬해 구금되었고, 옥에서 나오지 못했습니다.', k: 'loss', fx: { h: -3 } }),
  E('lei_civ_cou_vote', [26, 65], T(CIV, 'council'), 30, 2, { t: '시의회에서 격리구역 예산에 표를 던졌습니다. 늘리는 쪽이 이겼고, 당신 표는 어느 쪽이었는지 기록에 남았습니다.', fx: { standing: 2, h: -1 }, f: (s) => orgF(s, '시의회 표결 기록, 찬성 14 반대 9') }),
  E('lei_civ_cou_plate', [26, 65], T(CIV, 'council'), 25, 3, { t: '플레이트 이동 경로를 의결했습니다. 재앙 전령의 보고서가 두꺼웠고, 의결은 한 줄이었습니다.', k: 'note', fx: { standing: 2 } }),
  E('lei_civ_rat_hall', [30, 70], T(CIV, 'rathaus'), 30, 2, { t: '라트하우스 회의를 주재했습니다. 선제후령 관리가 뒷자리에 앉아 있었고, 회의는 그를 향해 진행되었습니다.', fx: { standing: 3 } }),
  E('lei_civ_rat_1097', [18, 70], 'track:' + CIV, 200, 0, { t: '월루몽드 주민을 흡수하라는 공문이 왔습니다. 받았습니다. 받은 사람들에게 줄 집이 없었고, 집은 공문에 없었습니다.', k: 'big', fx: { h: -3, standing: 2 } }, { c: (s) => s.year === 1097 || s.year === 1098 }),
  E('lei_civ_aff_council', [18, 70], ['aff:LEI_CIV_COUNCIL'], 15, 4, { t: '시의회는 이동도시마다 따로 있었습니다. 도시가 움직이면 의회도 같이 움직였고, 결정은 움직이지 않았습니다.', k: 'note' }),
  E('lei_civ_aff_rathaus', [18, 70], ['aff:LEI_CIV_RATHAUS'], 15, 4, { t: '라트하우스 복도는 길었습니다. 복도 끝 방에 선제후령 관리가 있었고, 거기까지 가는 데 몇 해가 걸렸습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }),
  TR('lei_civ_tr_schultz', [20, 60], CIV, 'schultz', '치안관이 되었습니다. 도장 대신 완장이었고, 완장은 거리에서 사람을 비켜서게 했습니다.', 'ev', { standing: 3 }),
  TR('lei_civ_tr_council', [25, 65], CIV, 'council', '시의원이 되었습니다. 표 하나가 생겼고, 표 하나로 바뀌는 것은 적었습니다.', 'big', { standing: 5 }),
  TR('lei_civ_tr_rathaus', [29, 70], CIV, 'rathaus', '라트하우스 참사가 되었습니다. 도시의 일이 당신 책상에서 선제후령으로 올라갔습니다.', 'big', { standing: 6 }),
  AF('lei_civ_af_impeach', N, CIV, ['impeach', 'scandal'], '탄핵이었습니다. 격리 명부 하나가 문제였고, 명부를 쓴 손은 당신 것이었습니다.', 'loss', { h: -4 }),
  AF('lei_civ_af_arrest', N, CIV, ['arrest'], '구금되었습니다. 죄목은 은폐였고, 무엇을 숨겼는지는 서류가 말하지 않았습니다.', 'loss', { h: -4 }),

  // ═══════════════════════════════════════ LEI_UNIV 대학·학자 (A9) ═══════════════════════════════════════
  E('lei_uni_stu_theory', [17, 30], T(UNI, 'student'), 30, 2, { t: '고전 아츠 이론 강의를 들었습니다. 교수는 칠판에 음표를 그렸고, 음표가 곧 공식이었습니다.', fx: { cap: { learn: 0.05 } }, f: (s) => F('대학 학사 규정, 입문 과정 4학기') }),
  E('lei_uni_stu_madman', [17, 30], T(UNI, 'student'), 25, 3, { t: '대학 건학자가 광인 취급을 받았다는 이야기를 들었습니다. 그의 책은 서고 맨 위 칸에 있었습니다.', k: 'note', fx: { cap: { learn: 0.02 } } }),
  E('lei_uni_ass_lab', [21, 40], T(UNI, 'assistant'), 30, 2, { t: '교수의 실험을 도왔습니다. 결과는 교수 이름으로 나갔고, 각주에 당신 이름이 있었습니다.', fx: { standing: 2, cap: { learn: 0.03 } } }),
  E('lei_uni_ass_remnant', [21, 40], T(UNI, 'assistant'), 20, 4, { t: '교수 하나가 잔당과 닿아 있다는 말이 돌았습니다. 그는 어느 날 탑에서 떨어졌고, 강의는 다른 교수가 이었습니다.', k: 'bad', fx: { h: -3 } }),
  E('lei_uni_pro_lecture', [27, 70], T(UNI, 'professor'), 30, 2, { t: '강의실에 섰습니다. 맨 뒷줄에 앉은 학생이 당신이 앉던 자리에 앉아 있었습니다.', fx: { standing: 3 } }),
  E('lei_uni_pro_1100', [17, 70], 'track:' + UNI, 200, 0, { t: '대학 플레이트가 부서졌습니다. 서고 절반이 사라졌고, 대학은 이름을 바꿔 다시 열었습니다.', k: 'big', fx: { h: -4, standing: -2 } }, { c: (s) => s.year === 1100 && affIs(s, 'LEI_UNI_LUDWIGS') }),
  E('lei_uni_aff_ludwigs', [17, 70], ['aff:LEI_UNI_LUDWIGS'], 15, 4, { t: '루트비히스 대학 서고는 아홉 층이었습니다. 아홉 층 중 한 층은 열쇠가 둘 필요했습니다.', k: 'note' }),
  E('lei_uni_aff_leopold', [17, 70], ['aff:LEI_UNI_LEOPOLD'], 15, 4, { t: '신 레오폴트 대학은 예술 아카데미와 복도를 나눠 썼습니다. 복도에서는 늘 연습 소리가 났습니다.', k: 'note', fx: { h: 1 } }),
  E('lei_uni_aff_gutenberg', [17, 70], ['aff:LEI_UNI_GUTENBERG'], 15, 4, { t: '구텐베르크 대학들은 서로를 빅3라고 불렀고, 나머지 대학은 그 말을 쓰지 않았습니다.', k: 'note' }),
  TR('lei_uni_tr_assistant', [20, 40], UNI, 'assistant', '조교가 되었습니다. 강의실 뒷문으로 들어가는 사람이 되었습니다.'),
  TR('lei_uni_tr_professor', [26, 70], UNI, 'professor', '교수가 되었습니다. 연구실 문패에 이름이 걸렸고, 문패는 적성을 묻지 않았습니다.', 'big', { standing: 6 }),
  AF('lei_uni_af_disappear', N, UNI, ['disappear'], '잔당 연루 의혹이었습니다. 짐을 쌌고, 국경 너머 대학에서 자리를 얻었습니다.', 'loss', { h: -3 }),
  AF('lei_uni_af_scandal', N, UNI, ['scandal', 'arrest'], '연구 하나가 문제였습니다. 무엇이 문제였는지는 교수회가 정했고, 당신은 그 회의에 없었습니다.', 'loss', { h: -4 }),

  // ═══════════════════════════════════════ LEI_ARTS 아츠 유닛 장인·화가 (A11) ═══════════════════════════════════════
  E('lei_art_app_file', [14, 40], T(ARTS, 'apprentice'), 30, 2, { t: '아츠 유닛 부품을 줄로 갈았습니다. 하루 종일 같은 부품이었고, 저녁에 손이 떨렸습니다.', fx: { cap: { skill: 0.03 }, hl: -1 } }),
  E('lei_art_app_paint', [14, 40], ['aff:LEI_ARTS_PAINTER'], 25, 3, { t: '물감을 갰습니다. 화가는 색 이름을 가르쳐 주지 않았고, 색만 가르쳐 주었습니다.', k: 'note', fx: { cap: { arts: 0.03 } } }),
  E('lei_art_mas_order', [18, 60], T(ARTS, 'master'), 30, 2, { t: '헌병대 주문을 받았습니다. 아츠 유닛 쉰 개였고, 어디에 쓰이는지는 주문서에 없었습니다.', fx: { money: (s) => medX(s, 0.1), standing: 3 }, f: (s) => F('헌병대 조달 주문서, 아츠 유닛 50개') }),
  E('lei_art_mas_seize', [18, 60], T(ARTS, 'master'), 20, 4, { t: '작품 하나가 압수되었습니다. 초상화였고, 누구를 그렸는지가 문제였습니다.', k: 'bad', fx: { h: -3 } }),
  E('lei_art_ate_sign', [22, 65], T(ARTS, 'atelier'), 30, 2, { t: '공방 간판을 걸었습니다. 견습 둘을 받았고, 둘 중 하나는 결함품이라고 불리던 아이였습니다. 손은 좋았습니다.', fx: { standing: 3 } }),
  E('lei_art_ate_schmitz', [22, 65], ['aff:LEI_ARTS_SCHMITZ'], 25, 3, { t: '아틀리에 슈미츠 납품 일정이 빡빡했습니다. 그 이름이 붙으면 값이 두 배였고, 검사는 세 배였습니다.', k: 'note', fx: { money: (s) => medX(s, 0.08) } }),
  TR('lei_art_tr_master', [17, 60], ARTS, 'master', '장인이 되었습니다. 자기 도장이 생겼고, 도장은 부품마다 찍혔습니다.'),
  TR('lei_art_tr_atelier', [21, 65], ARTS, 'atelier', '공방주가 되었습니다. 주문서가 당신 이름으로 왔고, 압수 통지도 그랬습니다.', 'ev', { standing: 4 }),
  AF('lei_art_af_ruin', N, ARTS, ['ruin'], '주문이 끊겼습니다. 큰 공방이 값을 반으로 내렸고, 반값으로는 줄 하나도 못 샀습니다.', 'loss', { h: -2 }),
  AF('lei_art_af_arrest', N, ARTS, ['arrest'], '작품이 문제가 되었습니다. 공방은 봉인되었고, 이름은 명단에 올랐습니다.', 'loss', { h: -4 }),

  // ═══════════════════════════════════════ 캐논 인물(1회성, D43) ═══════════════════════════════════════
  E('lei_canon_ebenholz', [10, 90], [N], 40, 0, (s) => { canonSeen(s, 'ebenholz'); return { t: '검은 옷의 젊은 음악가가 연주를 마치고도 박수가 끝날 때까지 고개를 들지 않았습니다. 객석 뒤에서 보았습니다.', k: 'note', fx: { cap: { arts: 0.02 } } }; }, { c: (s) => canonOk(s, 'ebenholz') && !!s.S.track && [MUS, COURT, UNI, STR].includes(s.S.track.id) }),
  E('lei_canon_czerny', [10, 90], [N], 40, 0, (s) => { canonSeen(s, 'czerny'); return { t: '격리구역 안에서도 피아노 소리가 났고, 밖의 사람들은 그 이름을 입에 올리지 않으면서도 들으러 왔습니다. 당신도 담 가까이 섰습니다.', k: 'note', fx: { h: 1 } }; }, { c: (s) => canonOk(s, 'czerny') && !!s.S.track && [TUN, QUAR, MUS, STR].includes(s.S.track.id) }),

  // ═══════════════════════════════════════ 이주·신참·관계·방문 ═══════════════════════════════════════
  E('lei_newcomer_test', [10, 80], [N, 'newcomer'], 30, 2, { t: '거주 서류에 아츠 적성란이 있었습니다. 외국 검사 결과는 인정되지 않았고, 다시 받았습니다.', k: 'note', fx: { h: -1 }, f: (s) => orgF(s, '외국인 거주 등록 규정, 적성 재검사 1회') }),
  E('lei_newcomer_music', [10, 80], [N, 'newcomer'], 30, 2, { t: '이웃이 악기를 하느냐고 물었습니다. 안 한다고 하자 대화가 거기서 끝났습니다.', k: 'note', fx: { h: -1 } }),
  E('lei_newcomer_evening', [10, 80], [N, 'newcomer'], 20, 3, (s) => ({ t: cul(s).greet + '. 그 인사를 아침에도 했다가 웃음을 샀습니다. 저녁에만 하는 인사였습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('lei_rel_institutional', [10, 80], [N, 'rel:institutional'], 30, 3, { t: '서류에 종족 칸이 있었고, 그 칸이 나머지를 정했습니다. 카프리니라고 적는 사람이 있다는 것을 그때 알았습니다.', k: 'bad', fx: { h: -2 } }),
  E('lei_rel_institutional2', [10, 80], [N, 'rel:institutional'], 25, 4, { t: '뿔을 가리는 모자를 샀습니다. 가리는 것이 불법은 아니었고, 들키는 것이 문제였습니다.', k: 'note', fx: { h: -1, money: (s) => -medX(s, 0.01) } }),
  E('lei_rel_institutional3', [10, 80], [N, 'rel:institutional'], 20, 4, { t: '연주회 자리가 늘 옆쪽이었습니다. 누가 정한 것은 아니었습니다.', k: 'note', fx: { h: -1 } }),
  E('lei_rel_lupo', [10, 80], [N, 'race:lupo'], 15, 5, { t: '루푸카른 출신이냐는 질문을 받았습니다. 아니라고 해도 그렇게 들렸습니다.', k: 'note', fx: { h: -1 } }),
  E('lei_visit_1', [10, 80], ['visit:leithanien'], 30, 3, { t: '라이타니엔에 머무는 동안 저녁마다 어디선가 연주 소리가 났습니다. 공짜였고, 그 나라에서 공짜는 그것뿐이었습니다.', k: 'note', fx: { h: 1 } }),
  E('lei_visit_2', [10, 80], ['visit:leithanien'], 25, 3, { t: '라이타니엔 검문소에서 아츠 적성을 물었습니다. 외국인에게도 물었습니다.', k: 'note', fx: { h: -1 }, f: (s) => F('국경 검문 규정, 아츠 적성 3등급 기재') }),
  E('lei_visit_3', [10, 80], ['visit:leithanien'], 20, 4, { t: '라이타니엔 도시에서 격리구역 담을 지나쳤습니다. 담 안에서 피아노 소리가 났습니다.', k: 'note', fx: { h: -1 } }),
];

export const decisions = {
  // ── 음악가: 오디션 ──
  lei_mus_audition: {
    tags: ['track:' + MUS], gap: 4, once: false,
    ok: (s) => trStage(s) <= 1 && s.rng.chance(0.3),
    build: () => ({ title: '오디션', body: '상위 악단 오디션 공고가 났습니다. 곡은 둘 중 하나입니다. 심사위원이 좋아하는 곡과 당신이 잘하는 곡.',
      choices: [{ k: 'theirs', label: '심사위원이 좋아하는 곡', sub: '합격 확률 ↑', auto: 1.2 }, { k: 'mine', label: '내가 잘하는 곡', sub: '명성 · 위험', auto: 1 }, { k: 'skip', label: '올해는 내지 않는다', auto: 0.5 }] }),
    apply: (s, k) => {
      if (k === 'skip') return { t: '올해는 내지 않았습니다. 공고문은 벽에 한 달 더 붙어 있었습니다.', k: 'note' };
      const z = s.S.cap.arts;
      const p = k === 'theirs' ? 0.35 + 0.15 * z : 0.25 + 0.25 * z;
      if (s.rng.chance(Math.max(0.05, Math.min(0.8, p)))) { if (s.promote()) return false; return { t: '통과했습니다. 자리는 다음 해에 난다고 했습니다.', k: 'warm', fx: { standing: 6, h: 3 } }; }
      return { t: k === 'mine' ? '떨어졌습니다. 심사위원 하나가 나중에 복도에서 곡이 좋았다고 했습니다.' : '떨어졌습니다. 같은 곡을 한 사람이 열둘이었습니다.', k: 'bad', fx: { h: -3 } };
    },
  },
  // ── 음악가: 후원자의 조건 ──
  lei_mus_patron_terms: {
    tags: ['track:' + MUS], once: true,
    ok: (s) => trStage(s) >= 1 && trStage(s) <= 2 && s.rng.chance(0.3),
    build: () => ({ title: '후원', body: '영주 부인이 후원을 늘리겠다고 했습니다. 조건은 격리구역 연주회에 서는 것입니다. 구역 안에서 연주한 사람은 밖에서 손가락질을 받기도 합니다.',
      choices: [{ k: 'accept', label: '받아들인다', sub: '돈 + · 명성 ±', auto: 1 }, { k: 'refuse', label: '거절한다', sub: '후원 −', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'refuse') return { t: '거절했습니다. 후원은 줄었고, 부인은 다른 연주자를 찾았습니다.', k: 'note', fx: { money: -medX(s, 0.1) } };
      if (s.rng.chance(0.5)) return { t: '구역 안에서 연주했습니다. 담 너머에서 박수가 났고, 담 이쪽에서는 신문이 작게 썼습니다.', k: 'warm', fx: { money: medX(s, 0.3), standing: 4, h: 2 } };
      return { t: '구역 안에서 연주했습니다. 다음 연주회 초대장 하나가 오지 않았습니다. 이유는 적혀 있지 않았습니다.', k: 'note', fx: { money: medX(s, 0.3), standing: -3 } };
    },
  },
  // ── 헌병: 적응성 테스트 ──
  lei_gen_aptitude_test: {
    tags: [T(GEND, 'private')], once: true,
    ok: (s) => stageYears(s) >= 1,
    build: () => ({ title: '군사 적응성 테스트', body: '테스트 날입니다. 우수자는 별도 시설로 갑니다. 금빛 아츠를 배우고, 헌장에 충성을 맹세하고, 몸은 조금씩 굳습니다.',
      choices: [{ k: 'full', label: '전력으로 본다', sub: '게사츠슈베이터 길', auto: 1 }, { k: 'hold', label: '힘을 뺀다', sub: '헌병대에 남음', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'hold') return { t: '힘을 뺐습니다. 결과는 보통이었고, 보통은 헌병대에 남는다는 뜻이었습니다.', k: 'note', fx: { h: 1 } };
      if (s.S.track && s.S.cap.arts >= 0.3 && s.rng.chance(0.6)) { s.S.track.aff = 'LEI_GEND_GESETZ'; if (s.promote()) return false; return { t: '우수였습니다. 별도 시설행 명단에 이름이 올랐고, 명단은 다음 해 것이었습니다.', k: 'warm', fx: { standing: 5 } }; }
      return { t: '전력으로 봤습니다. 결과는 보통이었습니다. 상관은 어깨를 두드렸고, 그것으로 끝이었습니다.', k: 'note', fx: { hl: -2 } };
    },
  },
  // ── 헌병·치안관: 숨기는 동료 ──
  lei_gen_hidden_colleague: {
    tags: [N], once: true,
    ok: (s) => !!s.S.track && ((s.S.track.id === GEND && trStage(s) === 2) || (s.S.track.id === CIV && trStage(s) === 1)) && s.rng.chance(0.3),
    build: () => ({ title: '기침', body: '동료 하나가 기침을 숨깁니다. 보고하면 그는 구역으로 가고, 보고하지 않으면 당신이 은폐입니다. 은폐한 치안관이 옥에서 나오지 못한 일을 모두가 압니다.',
      choices: [{ k: 'report', label: '보고한다', sub: '안전 · 동료를 잃음', auto: 1.2 }, { k: 'silent', label: '보고하지 않는다', sub: '구금 위험', auto: 1 }, { k: 'warn', label: '먼저 그에게 말한다', sub: '그가 정하게', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'report') return { t: '보고했습니다. 그는 이송되었고, 이송 호위는 다른 사람이 맡았습니다.', k: 'loss', fx: { h: -4, standing: 2 } };
      if (k === 'warn') return { t: '먼저 말했습니다. 그는 다음 날 스스로 구역에 갔습니다. 당신 이름은 어디에도 없었습니다.', k: 'loss', fx: { h: -3 } };
      if (s.rng.chance(0.3)) { s.fall('arrest'); return false; }
      return { t: '보고하지 않았습니다. 그는 반년 뒤 검진에 걸렸고, 당신 이름은 나오지 않았습니다.', k: 'note', fx: { h: -2 } };
    },
  },
  // ── 궁정: 옛 공물 장부 ──
  lei_cou_tribute_ledger: {
    tags: ['track:' + COURT], once: true,
    ok: (s) => trStage(s) >= 1 && empress(s) && s.rng.chance(0.4),
    build: () => ({ title: '옛 장부', body: '서고에서 위치킹 시대의 공물 장부가 나왔습니다. 감염자 할당 명단이고, 모자란 수를 시민으로 채운 기록이 그대로 있습니다. 이름 중에 지금 궁정에 있는 집안이 둘 있습니다.', fact: F('궁정 기록국 서고 목록, 공물 장부 7권'),
      choices: [{ k: 'burn', label: '태운다', sub: '궁정 평판 + · 기록 소실', auto: 1.2 }, { k: 'keep', label: '봉인해 둔다', sub: '언젠가 쓰일 것', auto: 1 }, { k: 'open', label: '공개한다', sub: '숙청 위험 · 양심', auto: 0.5 }] }),
    apply: (s, k) => {
      if (k === 'burn') return { t: '태웠습니다. 두 집안은 그날 밤 당신에게 포도주를 보냈고, 당신은 그것을 마시지 않았습니다.', k: 'note', fx: { standing: 6, h: -3 } };
      if (k === 'keep') return { t: '봉인해 두었습니다. 열쇠는 당신 서랍에 있고, 서랍이 있다는 것을 아는 사람은 둘입니다.', k: 'note', fx: { cap: { ties: 0.05 }, h: -1 } };
      if (s.rng.chance(0.4)) { s.fall('purge'); return false; }
      return { t: '공개했습니다. 두 집안이 궁정을 떠났고, 떠난 자리에 다른 두 집안이 들어왔습니다.', k: 'big', fx: { standing: -4, h: 3 } };
    },
  },
  // ── 격리구역: 연주 ──
  lei_quar_concert: {
    tags: ['track:' + QUAR], gap: 3, once: false,
    ok: (s) => artsHigh(s) && trStage(s) <= 2 && s.rng.chance(0.4),
    build: () => ({ title: '담 안의 연주', body: '구역 안에서 연주회를 열어도 된다는 허가가 났습니다. 담 밖 사람들이 들으러 옵니다. 약값이 나오고, 이름은 밖에서 입에 오르지 않습니다.',
      choices: [{ k: 'play', label: '연주한다', sub: '약값 · 명성', auto: 1.5 }, { k: 'no', label: '하지 않는다', auto: 0.5 }] }),
    apply: (s, k) => (k === 'play' ? { t: '연주했습니다. 담 밖에 사람들이 섰고, 끝나자 박수 대신 발소리가 멀어졌습니다. 약값은 나왔습니다.', k: 'warm', fx: { money: medX(s, 0.2), standing: 6, h: 3 } } : { t: '하지 않았습니다. 피아노는 덮개를 덮은 채였습니다.', k: 'note' }),
  },
  // ── 결함품 판정 숨기기 ──
  lei_defect_forge: {
    tags: [N, 'cap:arts:low'], once: true,
    ok: (s) => s.S.age >= 16 && s.S.age <= 40 && s.S.money >= s.med * 0.5 && s.rng.chance(0.3),
    build: (s) => ({ title: '적성증', body: '적성 검사 결과를 고쳐 주는 사람이 있습니다. 값은 ' + Math.round(s.med * 0.5).toLocaleString() + ' LMD. 들키면 "결함"이 아니라 "위조"가 됩니다.',
      choices: [{ k: 'buy', label: '고친다', sub: '돈 − · 발각 위험', auto: 1 }, { k: 'no', label: '그대로 둔다', auto: 1.2 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '그대로 두었습니다. 결함이라는 글자는 글자였고, 손은 손이었습니다.', k: 'note', fx: { h: 1 } };
      s.S.money -= Math.round(s.med * 0.5);
      if (s.rng.chance(0.25)) { s.S.prison = 'jail'; s.S.prisonLeft = 1; return { t: '고쳤습니다. 반년 뒤 대조에 걸렸습니다. 죄목은 위조였고, 결함은 그대로였습니다.', k: 'bad', fx: { h: -5 } }; }
      s.S.flags.defective = false;
      return { t: '고쳤습니다. 이력서 첫 줄이 바뀌었고, 다음 줄을 읽는 사람이 생겼습니다.', k: 'note', fx: { h: 2, standing: 2 } };
    },
  },
  // ── 농민: 검진반 ──
  lei_far_inspection_child: {
    tags: ['track:' + FARM], once: true,
    ok: (s) => trStage(s) >= 1 && empress(s) && s.rng.chance(0.25),
    build: () => ({ title: '검진반', body: '검진반이 내일 옵니다. 이웃집 아이가 지난주부터 기침을 합니다. 산 위로 보내면 검진은 피하고, 보내지 않으면 아이는 구역으로 갑니다.',
      choices: [{ k: 'hide', label: '산 위로 보낸다', sub: '위험 · 아이를 살림', auto: 1 }, { k: 'leave', label: '모른 척한다', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'leave') return { t: '모른 척했습니다. 아이는 구역으로 갔고, 이웃집은 이듬해 밭을 팔았습니다.', k: 'loss', fx: { h: -4 } };
      if (s.rng.chance(0.2)) return { t: '산 위로 보냈습니다. 검진반이 알았습니다. 마을 전체가 재검진을 받았고, 당신 집이 가장 오래 걸렸습니다.', k: 'bad', fx: { h: -3, standing: -5 } };
      return { t: '산 위로 보냈습니다. 윈터위스프 사람들이 아이를 받았습니다. 검진반은 그 집에 아이가 있었는지 묻지 않았습니다.', k: 'note', fx: { h: 2, standing: 3 } };
    },
  },
  // ── 혼인(국가 전용 문구) ──
  marry_ballroom: marryDecision('ballroom', N, (s, pr, t) => ({
    title: '무도회 혼인', body: '무도회에서 ' + wa(pr.name) + ' 춤을 췄습니다. 세 번째 곡이 끝나자 양가가 날짜 이야기를 했습니다.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람이고, 그쪽 무도회는 곡이 다르다고 했습니다.' : '') + (t.dowry ? ' 혼수는 피아노 한 대 값입니다.' : ''),
    accept: '네 번째 곡을 청한다', acceptSub: '무도회 혼인', hold: '다음 무도회까지 미룬다', decline: '거절한다',
    holdT: '다음 무도회까지 미루었습니다. 다음 무도회에서 그 사람은 다른 사람과 췄습니다.', declineT: '거절했습니다. 곡은 끝났습니다.', opposeT: '가족이 반대했습니다. 뿔 모양이 다르다고 했고, 무도회는 그 뒤로 초대장이 오지 않았습니다.',
  })),
  marry_patron: marryDecision('patron', N, (s, pr, t) => ({
    title: '후원 혼약', body: '후원자가 혼약을 제안했습니다. ' + eun(pr.name) + ' 후원자 집안 사람입니다. 혼약서에 연주회 횟수가 같이 적혀 있습니다.' + (t.dowry ? ' 지참 재산은 ' + Math.round(s.med * t.dowry).toLocaleString() + ' LMD 입니다.' : ''),
    fact: t.dowry ? F('후원 혼약 관례, 지참 재산 중위소득 ' + t.dowry + '배') : undefined,
    accept: '혼약서에 서명한다', acceptSub: '후원 혼약', hold: '한 시즌 미룬다', decline: '거절한다',
    holdT: '한 시즌 미루었습니다. 후원은 그대로였고, 혼약서는 서랍에 들어갔습니다.', declineT: '거절했습니다. 다음 시즌 연주회 수가 줄었습니다.', opposeT: '후원자 집안이 반대했습니다. 종족이 다르다고 했고, 혼약서는 찢겼습니다.',
  })),
  marry_village: marryDecision('village', N, (s, pr, t) => ({
    title: '산중 마을 혼례', body: '마을 혼례입니다. ' + eun(pr.name) + ' 포도밭 두 개 건너 집 사람입니다. 혼례 날 마을 악사 둘이 옵니다.' + (t.dowry ? ' 포도주 열 통이 오갑니다.' : ''),
    accept: '혼례를 올린다', acceptSub: '마을 혼례', hold: '수확 뒤에 정한다', decline: '거절한다',
    holdT: '수확 뒤에 정하기로 했습니다. 수확은 늦었습니다.', declineT: '거절했습니다. 포도밭 두 개 건너는 그 뒤로 멀었습니다.', opposeT: '가족이 반대했습니다. 뿔이 다르다고 했습니다.',
  })),
  marry_infected_only: marryDecision('infected_only', N, (s, pr) => ({
    title: '격리구역 혼인', body: '구역 안 혼인입니다. ' + eun(pr.name) + ' 같은 작업장 사람입니다. 혼인 신고는 구역 사무소에서 받고, 사무소 서류에는 "임차 동거"라고 적힙니다.',
    accept: '혼인한다', acceptSub: '구역 안에서', hold: '미룬다', decline: '하지 않는다',
    holdT: '미루었습니다. 구역에서 미룬다는 말은 다른 뜻이었습니다.', declineT: '하지 않기로 했습니다.', opposeT: '구역 사무소가 서류를 반려했습니다. 이유는 적혀 있지 않았습니다.',
  })),
  home_change: homeDecision(),
};

export default { events, decisions };
