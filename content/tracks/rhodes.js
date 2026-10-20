// W9h 로도스 아일랜드 내부 콘텐츠(§10·§11, D41·D42·D43). 신분 3종(오퍼레이터·협력 계약자·환자) × 부서(rhodes:<dept>) 일상, RHO_* 9 진로 단계 이벤트,
// 본함 기항지 순회(visit:<port>), 외근 작전 결과(전사·부상·감염 악화는 결과만), 치료비 노동 대체, 정기 심리평가·감염 기록, 1101.7 본함 소실(year), 퇴사·은퇴,
// 국가 횡단 접점 이벤트 4종(S.flags.rhodes_operation|rhodes_legal|rhodes_medical_pact|rhodes_rescue = S.age → 엔진 referral), 결정 rhodes_offer 덮어쓰기(via 9변형, k 는 join/hold/decline 유지).
// 캐논 인물은 1회성·연도 게이트·canonSeen<3, 특히 멀리서 본 수준(D43). 임상 수치(융합률·u/L)는 UI 가 표시하고 여기서는 서사만(D42).
// 각주는 숫자 있을 때만(D31), 출처는 "로도스 아일랜드 의료부 소책자"·"인사부 기록"류. 조사는 text.js(D30).
import { eul, iga, eun, wa, ro, ieot } from '../../src/engine/text.js';
import { F, rhodesF, medX } from '../_util.js';
import { rhodesTrigger, placeRhodes, joinRhodes, DEPT_LABEL } from '../../src/engine/rhodes.js';
import { BALANCE as B } from '../../src/engine/balance.js';

// ── 공용 도우미 ──
const R = (s) => s.rhodes;                        // S.rhodes 객체 또는 null
const onShip = (s) => s.S.cur === 'rhodes';
const partner = (s) => (s.S.fam.partner && s.S.fam.partner.alive ? s.S.fam.partner : null);
const uL = (s) => s.S.ori.uL.toFixed(2);
const yearsIn = (s) => (R(s) ? s.S.age - R(s).since : 0);
const hrF = (doc, year) => F('로도스 아일랜드 인사부 ' + doc + (year == null ? '' : ', ' + year + '년'));
const logF = (doc) => F('로도스 아일랜드 후방지원부 ' + doc);
function canonOk(s, id) {
  const f = (s.data.canonFigures || []).find((x) => x.id === id);
  if (!f) return false;
  if (s.year < f.years[0] || s.year > f.years[1]) return false;
  return (s.S.flags.canonSeen || 0) < 3;
}
const canonSee = (s) => { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; };
const portName = (s) => { const n = s.S.res && s.S.res.itinerantAt && s.data.nationById[s.S.res.itinerantAt]; return n ? n.name : '기항지'; };
const CAP_NAME = { skill: '기량', learn: '학식', arts: '아츠', ties: '연줄' };
const topCap = (s) => Object.entries(s.S.cap || {}).sort((a, b) => b[1] - a[1])[0];
/** 접점 종류(그해·전해 플래그) */
function contactKind(s) {
  const f = s.S.flags; const hit = (k) => typeof f[k] === 'number' && s.S.age - f[k] <= 1 && s.S.age - f[k] >= 0;
  if (hit('rhodes_operation')) return 'operation'; if (hit('rhodes_legal')) return 'legal'; if (hit('rhodes_medical_pact')) return 'pact'; if (hit('rhodes_rescue')) return 'rescue'; return null;
}
function yearly(s, key, fn) { const S = s.S; const k = 'y_' + key; if (S.flags[k] && S.flags[k].age === S.age) return S.flags[k].v; const v = fn(); S.flags[k] = { age: S.age, v }; return v; }
const OFFICE_NATION = { RHO_OFF_KAZIMIERZ: 'kazimierz', RHO_OFF_VICTORIA: 'victoria', RHO_OFF_LEITH: 'leithanien', RHO_OFF_URSUS: 'ursus', RHO_OFF_SIESTA: 'columbia', RHO_OFF_DOSSOLES: 'bolivar', RHO_OFF_KAZDEL: 'kazdel', RHO_OFF_CRADLE: 'iberia', RHO_OFF_HILLOCK: 'tara', RHO_OFF_IBERIA: 'iberia' };

export const events = [
  // ════════════════════════════════════════════════════════════════════
  // 신분 × 부서 일상 — 오퍼레이터
  // ════════════════════════════════════════════════════════════════════
  // ── 외근부 ──
  { id: 'rho_f_count', a: [14, 60], tags: ['rhodes:field', 'rhodes_operator'], w: 35, gap: 2,
    run: (s) => ({ t: '작전이 있었습니다. 돌아온 사람 수를 세는 것이 일과의 끝이었습니다. ' + s.rng.pick(['나간 수와 같았습니다.', '하나가 모자랐고, 다음 날 의료부에서 찾았습니다.', '전부 돌아왔고, 아무도 그것을 말하지 않았습니다. 말하면 다음번에 어긋난다고 했습니다.']), k: 'ev', fx: { standing: 2, hl: -1 } }) },
  { id: 'rho_f_training', a: [14, 60], tags: ['rhodes:field', 'rhodes_operator'], w: 30, gap: 3,
    run: (s) => ({ t: '훈련센터에서 능력 평가를 받았습니다. ' + s.rng.pick(['평가표에 여섯 줄이 있었고, 여섯 줄 다 글자로 적혀 있었습니다. 숫자는 없었습니다.', '교관은 "살아서 돌아오는 것이 전부"라고 했습니다. 평가표에는 그런 항목이 없었습니다.']), k: 'note', fx: { cap: { skill: 0.03 } } }) },
  { id: 'rho_f_band', a: [14, 60], tags: ['rhodes:field', 'rhodes_operator'], w: 25, gap: 3,
    run: (s) => ({ t: '감염 모니터 팔찌가 작전 중에 울렸습니다. ' + (s.S.ori.on ? '제 것이었습니다. 수치는 돌아와서 보았습니다.' : '옆 사람 것이었습니다. 그 사람은 다음 작전에 나오지 않았습니다.'), k: 'bad', fx: { h: -2 } }) },
  { id: 'rho_f_cabin', a: [14, 60], tags: ['rhodes:field', 'rhodes_operator'], w: 20, gap: 4,
    run: (s) => ({ t: s.rng.pick(['4인 선실이었습니다. 넷 중 둘이 밤에 깨어 있었고, 아무도 이유를 묻지 않았습니다.', '2인 선실로 옮겼습니다. 인사부 배정이었고, 옮긴 이유는 적혀 있지 않았습니다.', '선실 벽에 귀마개를 걸어 두었습니다. 함선이 움직이는 밤에는 그것이 베개보다 중요했습니다.']), k: 'note', fx: { h: 1 } }) },
  { id: 'rho_f_ideal', a: [14, 60], tags: ['rhodes:field', 'rhodes_operator'], w: 15, gap: 5,
    run: (s) => ({ t: '외근부 지침 첫 줄을 다시 읽었습니다. "감염자를 위해, 광석병을 극복하기 위해." ' + s.rng.pick(['작전 뒤에 읽으면 다르게 읽혔습니다.', '믿는 사람과 믿지 않는 사람이 같은 차에 탔습니다.']), k: 'note', fx: { h: 1 } }) },
  // ── 의료부 ──
  { id: 'rho_m_round', a: [16, 70], tags: ['rhodes:medical', 'rhodes_operator'], w: 35, gap: 2,
    run: (s) => ({ t: s.rng.pick(['회진을 돌았습니다. 병실 이름표에 번호가 아니라 이름이 있었습니다. 적는 것은 제 일이었습니다.', '채혈 줄이 복도까지 섰습니다. 줄 선 사람 반이 동료였습니다.', '억제제 재고를 세었습니다. 모자라는 달은 누구에게 먼저 줄지를 과장이 정했고, 정한 뒤 오래 앉아 있었습니다.']), k: 'note', fx: { standing: 2, cap: { learn: 0.02 } } }) },
  { id: 'rho_m_night', a: [16, 70], tags: ['rhodes:medical', 'rhodes_operator'], w: 25, gap: 3,
    run: (s) => ({ t: '응급 호출이 밤에 왔습니다. ' + s.rng.pick(['외근 작전에서 돌아온 차였습니다. 결과만 적습니다. 둘은 살았습니다.', '환자 하나가 3기로 넘어갔습니다. 서류 한 장이 바뀌었고, 병실이 바뀌었습니다.']), k: 'bad', fx: { hl: -2, h: -2 } }) },
  { id: 'rho_m_booklet', a: [16, 70], tags: ['rhodes:medical', 'rhodes_operator'], w: 20, gap: 4,
    run: (s) => ({ t: '소책자 교정을 보았습니다. 「조기 증상은 대개 무시된다」. ' + s.rng.ri(3, 9) + '쇄째였습니다. 문장은 바뀌지 않았고, 읽는 사람만 바뀌었습니다.', k: 'note', fx: { cap: { learn: 0.02 } }, f: rhodesF('소책자 발행 기록, ' + s.year + '년') }) },
  { id: 'rho_m_patient_face', a: [16, 70], tags: ['rhodes:medical', 'rhodes_operator'], w: 20, gap: 4,
    run: (s) => ({ t: '진료한 환자가 복도에서 인사를 했습니다. ' + s.rng.pick(['이름을 기억하고 있었습니다. 제가 그 사람 이름을 먼저 기억했어야 했습니다.', '후방지원부 작업복을 입고 있었습니다. 치료비를 그렇게 내고 있었습니다.']), k: 'warm', fx: { h: 2 } }) },
  // ── 엔지니어링부 ──
  { id: 'rho_e_boiler', a: [16, 70], tags: ['rhodes:engineer', 'rhodes_operator'], w: 35, gap: 2,
    run: (s) => ({ t: s.rng.pick(['보일러가 또 터졌습니다. 세 번째였습니다. 고쳤고, 네 번째를 기다렸습니다.', '동력부 순환 배관을 교체했습니다. 함선이 하루 멈췄고, 아무도 그것을 좋아하지 않았습니다.', '장비 수리 요청서가 책상 위에 쌓였습니다. 제일 위는 외근부, 제일 아래는 후방지원부였습니다. 순서를 바꿨습니다.']), k: 'note', fx: { standing: 2, cap: { learn: 0.02 } } }) },
  { id: 'rho_e_prts', a: [16, 70], tags: ['rhodes:engineer', 'rhodes_operator'], w: 20, gap: 4,
    run: (s) => ({ t: '함선 제어 계통 점검이 있었습니다. ' + s.rng.pick(['점검표가 두꺼웠고, 끝까지 읽은 사람은 과장뿐이었습니다.', '이상 없음. 이상 없음을 적는 것이 제일 긴장되는 일이었습니다.']), k: 'note', fx: { cap: { learn: 0.02 } } }) },
  { id: 'rho_e_tool', a: [16, 70], tags: ['rhodes:engineer', 'rhodes_operator'], w: 20, gap: 4,
    run: (s) => ({ t: s.rng.pick(['공구함을 새로 받았습니다. 구매부가 깎아 온 값이라고 했습니다. 공구는 좋았습니다.', '외근부가 장비를 부숴 왔습니다. 고치는 동안 그쪽 팀장이 옆에 서 있었습니다. 미안하다는 뜻이었습니다.']), k: 'note', fx: { h: 1 } }) },
  { id: 'rho_e_noise', a: [16, 70], tags: ['rhodes:engineer', 'rhodes_operator'], w: 15, gap: 5,
    run: (s) => ({ t: '함선 소음을 줄이는 과제가 내려왔습니다. 반년 걸렸습니다. 줄었고, 아무도 알아차리지 못했습니다. 그것이 성공이었습니다.', k: 'warm', fx: { standing: 3 } }) },
  // ── 후방지원부 ──
  { id: 'rho_l_kitchen', a: [12, 70], tags: ['rhodes:logistics', 'rhodes_operator'], w: 35, gap: 2,
    run: (s) => ({ t: s.rng.pick(['식당에서 일했습니다. 아무도 제 손을 보지 않았습니다. 다들 비슷한 손이었습니다.', '세탁실 교대였습니다. 작전복에서 나온 것들은 묻지 않고 빨았습니다.', '선실 배정표를 붙였습니다. 붙이자마자 사람들이 몰려와 이름을 찾았습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'rho_l_supply', a: [12, 70], tags: ['rhodes:logistics', 'rhodes_operator'], w: 30, gap: 3,
    run: (s) => ({ t: '물자 배급 날이었습니다. ' + s.rng.pick(['줄이 길었고, 줄 선 사람 중에 과장도 있었습니다. 과장도 줄을 섰습니다.', '억제제 상자는 의료부로, 나머지는 우리 손으로 갔습니다. 나머지가 더 많았습니다.']), k: 'note', fx: { standing: 1 } }) },
  { id: 'rho_l_bar', a: [18, 70], tags: ['aff:RHO_LOG_BAR'], w: 25, gap: 3,
    run: (s) => ({ t: '바에서 일했습니다. 간판은 "한 잔만 더". ' + s.rng.pick(['외근부 사람들이 작전 전날 왔고, 작전 다음 날은 수가 달랐습니다.', '의료부 사람이 와서 물만 마시고 갔습니다. 그런 날이 있었습니다.']), k: 'note', fx: { h: 1, cap: { ties: 0.02 } } }) },
  { id: 'rho_l_line', a: [12, 70], tags: ['aff:RHO_LOG_LINE'], w: 25, gap: 3,
    run: (s) => ({ t: '생산라인에서 일했습니다. 의약품 포장이었습니다. 상자에 찍힌 상표가 제가 먹는 약과 같았습니다.', k: 'note', fx: { standing: 2 } }) },
  // ── 인사부 ──
  { id: 'rho_h_background', a: [18, 65], tags: ['rhodes:hr', 'rhodes_operator'], w: 35, gap: 2,
    run: (s) => ({ t: s.rng.pick(['입사 지원자 배경 조사를 했습니다. 사회관계, 행동 분석. 종이에 적히지 않는 칸이 하나 있었고, 그 칸이 제일 길었습니다.', '신입 교육을 맡았습니다. 첫 시간은 카드 세 종류의 차이였습니다. 둘째 시간은 카드를 잃어버리면 어떻게 되는지였습니다.', '정기 심리평가 일정을 짰습니다. 전원이 대상이었고, 저도 명단에 있었습니다.']), k: 'note', fx: { standing: 2, cap: { ties: 0.02 } } }) },
  { id: 'rho_h_will', a: [18, 65], tags: ['rhodes:hr', 'rhodes_operator'], w: 20, gap: 4,
    run: (s) => ({ t: '작전 중 사망자의 후속 처리를 맡았습니다. 유언대로였습니다. 결과만 적습니다. 서류는 두 장이었고, 두 장이 무거웠습니다.', k: 'bad', fx: { h: -3, standing: 2 } }) },
  { id: 'rho_h_screen', a: [18, 65], tags: ['aff:RHO_HR_SCREEN'], w: 25, gap: 3,
    run: (s) => ({ t: '심사과 일이었습니다. 내부 인원 하나의 보고서를 썼습니다. 그 사람은 제 옆 선실이었습니다. 보고서에는 그 사실을 적지 않았습니다.', k: 'note', fx: { h: -1, standing: 2 } }) },
  // ── 구매 및 시장 운영부 ──
  { id: 'rho_p_negotiate', a: [18, 65], tags: ['rhodes:purchase', 'rhodes_operator'], w: 35, gap: 2,
    run: (s) => ({ t: s.rng.pick(['협력사와 협상했습니다. 상대는 제약회사라는 말에 값을 올렸고, 감염자 회사라는 말에 값을 내렸습니다. 둘 다 맞는 말이었습니다.', '의약품 서비스를 팔았습니다. 산 쪽은 도시 하나였습니다. 계약서 끝에 "감염자에게도 적정 가격"이라는 줄을 넣었고, 상대는 그 줄을 세 번 읽었습니다.', '구매센터 창고를 세었습니다. 모자란 것은 늘 같은 것이었습니다. 억제제 원료.']), k: 'note', fx: { standing: 2, cap: { ties: 0.02 } } }) },
  { id: 'rho_p_port', a: [18, 65], tags: ['rhodes:purchase', 'rhodes_operator'], w: 25, gap: 3,
    run: (s) => ({ t: portName(s) + ' 정박 중에 현지 시장을 돌았습니다. ' + s.rng.pick(['값을 적어 왔습니다. 적어 온 값으로 다음 기항지에서 깎았습니다.', '로도스 이름을 대면 값이 달라지는 가게와 달라지지 않는 가게가 있었습니다. 후자와 거래했습니다.']), k: 'note', fx: { money: medX(s, 0.05) } }) },
  { id: 'rho_p_pharma', a: [18, 65], tags: ['aff:RHO_PUR_PHARMA'], w: 25, gap: 3,
    run: (s) => ({ t: '의약품 판매 수익이 떨어진 분기였습니다. 회의에서 숫자가 돌았고, 숫자 뒤에 환자 수가 있었습니다. 둘 다 올라야 했습니다.', k: 'bad', fx: { standing: -1 } }) },
  // ── 주재 사무소 ──
  { id: 'rho_o_desk', a: [20, 70], tags: ['rhodes:office', 'rhodes_operator'], w: 35, gap: 2,
    run: (s) => ({ t: s.rng.pick(['사무소 책상에 앉았습니다. 본함은 멀었고, 전문은 하루에 두 번 왔습니다.', '현지 환자가 밴드를 차고 왔습니다. 생체 정보를 본함 의료팀으로 보냈고, 답은 이튿날 왔습니다.', '외근 지원 요청이 왔습니다. 차량과 지도와 현지 말을 아는 사람. 셋 중 둘은 저였습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'rho_o_local', a: [20, 70], tags: ['rhodes:office', 'rhodes_operator'], w: 25, gap: 3,
    run: (s) => ({ t: '현지 관청에 서류를 냈습니다. ' + s.rng.pick(['"제약회사"라는 칸에 도장이 찍혔고, 그 옆 칸은 비워 두었습니다.', '담당자가 감염자 회사냐고 물었습니다. 그렇다고 했습니다. 도장은 찍혔습니다.']), k: 'note', fx: { cap: { ties: 0.02 } } }) },
  { id: 'rho_o_raid_near', a: [20, 70], tags: ['rhodes:office', 'rhodes_operator'], w: 15, gap: 5,
    run: (s) => ({ t: '이웃 나라 사무소가 습격당했다는 전문이 왔습니다. 그날 밤 사무소 문을 하나 더 잠갔습니다.', k: 'bad', fx: { h: -2 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 협력 계약자
  // ════════════════════════════════════════════════════════════════════
  { id: 'rho_c_card', a: [14, 65], tags: ['rhodes_contractor'], w: 35, gap: 2,
    run: (s) => ({ t: s.rng.pick(['협력 계약 카드로 함선에 들어갔습니다. 정식 근무 카드와 색이 달랐고, 식당에서는 같았습니다.', '함선에 머문 날이 한 해에 ' + s.rng.ri(10, 90) + '일이었습니다. 나머지는 원래 자리였습니다.', '검사 통지가 왔습니다. 협정에 "검사 불응 가능" 조항이 있었습니다. 갔습니다. 가지 않아도 되는 것이 가는 이유가 되기도 했습니다.']), k: 'note', fx: { standing: 1 } }) },
  { id: 'rho_c_op', a: [14, 65], tags: ['rhodes_contractor'], w: 30, gap: 3,
    run: (s) => ({ t: '로도스 작전에 참여했습니다. ' + s.rng.pick(['우리 쪽 방식과 저쪽 방식이 달랐습니다. 저쪽은 돌아온 수를 셌고, 우리는 세지 않던 사람들이었습니다.', '보수는 치료로 왔습니다. 부대원 하나가 처음으로 억제제를 받았습니다.']), k: 'ev', fx: { standing: 2, hl: -1 } }) },
  { id: 'rho_c_two_pools', a: [14, 65], tags: ['rhodes_contractor'], w: 20, gap: 4,
    run: (s) => ({ t: '원 소속에서 연락이 왔습니다. ' + s.rng.pick(['돌아오라는 것이었습니다. 돌아갈 날짜를 묻지는 않았습니다.', '로도스 쪽 이야기를 묻는 것이었습니다. 말하지 않았습니다. 협정에 그 조항도 있었습니다.']), k: 'note', fx: { h: -1 } }) },
  { id: 'rho_c_mudrock', a: [16, 65], tags: ['rhodes_contractor'], w: 8, c: (s) => canonOk(s, 'mudrock'),
    run: (s) => { canonSee(s); return { t: '거대한 망치를 멘 용병 대장이 치료 동의서에 서명하고는 자기 부대원 명단부터 내미는 것을 접수대 건너편에서 보았습니다.', k: 'note', fx: { h: 1 } }; } },
  { id: 'rho_c_w', a: [16, 65], tags: ['rhodes_contractor'], w: 6, c: (s) => canonOk(s, 'w'),
    run: (s) => { canonSee(s); return { t: '함선에 거의 머물지 않는다는 붉은 머리의 계약자 이야기를 들었습니다. 검사에 한 번도 응하지 않았다고 했습니다. 그래도 카드는 유효했습니다.', k: 'note' }; } },

  // ════════════════════════════════════════════════════════════════════
  // 환자
  // ════════════════════════════════════════════════════════════════════
  { id: 'rho_pt_band', a: [3, 90], tags: ['rhodes_patient'], w: 35, gap: 2,
    run: (s) => ({ t: '디스플레이 밴드가 수치를 읽어 주었습니다. ' + s.rng.pick(['어제보다 조금 낮았습니다.', '어제와 같았습니다. 같은 것이 좋은 것이라고 의사가 말했습니다.', uL(s) + ' u/L. 숫자를 외웠습니다. 외우지 말라고 했지만.']), k: 'note', fx: { h: 1 }, f: rhodesF('환자 모니터 기록') }) },
  { id: 'rho_pt_name', a: [3, 90], tags: ['rhodes_patient'], w: 30, gap: 3,
    run: (s) => ({ t: s.rng.pick(['검진 날 간호사가 이름을 불렀습니다. 번호가 아니었습니다.', '병실 이름표를 제가 직접 썼습니다. 글씨가 서툴렀고, 아무도 고치지 않았습니다.', '옆 침대 사람이 퇴원했습니다. 후방지원부 작업복을 입고 다시 왔습니다. 인사가 달라졌습니다.']), k: 'warm', fx: { h: 2 } }) },
  { id: 'rho_pt_temporary', a: [3, 90], tags: ['rhodes_patient'], w: 25, gap: 3,
    run: (s) => ({ t: s.rng.pick(['"체류는 일시적"이라고 접수 서류에 적었습니다. 다음 해에도 같은 칸에 같은 말을 적었습니다.', '방문 카드였습니다. 정식 카드와 색이 달랐고, 식당에서는 같았습니다.', '함선이 움직이는 밤에 처음 깼습니다. 바닥이 울렸고, 금방 익숙해졌습니다.']), k: 'note', fx: { h: 1 } }) },
  { id: 'rho_pt_suppressant', a: [3, 90], tags: ['rhodes_patient', 'infected'], w: 30, gap: 2,
    run: (s) => ({ t: '억제제를 받았습니다. ' + s.rng.pick(['약은 작았고 상자는 컸습니다. 상자에 제 이름이 있었습니다.', '값은 서류 한 장이었습니다. 서류에는 "노동 대체"라고 적혀 있거나, "지불"이라고 적혀 있었습니다.', '의사가 "느려졌다"고 했습니다. "멎었다"는 아니었습니다. 그래도 느려졌습니다.']), k: 'note', fx: { h: 1 } }) },
  { id: 'rho_pt_stage3', a: [3, 90], tags: ['rhodes_patient', 'ori_stage3'], w: 40, gap: 2, rep: true,
    run: (s) => ({ t: s.rng.pick(['병실이 바뀌었습니다. 창이 없는 쪽이었습니다. 간호사는 매일 왔습니다.', '의사가 서류 한 장을 더 가져왔습니다. 읽어 주겠다고 했고, 읽지 말라고 했습니다.', '누워 있는 날이 많아졌습니다. 밴드는 계속 읽어 주었습니다.']), k: 'bad', fx: { h: -3 } }) },
  // ── 치료비 노동 대체(환자·후방지원부) ──
  { id: 'rho_pt_labor_shift', a: [12, 80], tags: ['rhodes_patient', 'rhodes:logistics'], w: 35, gap: 2,
    run: (s) => ({ t: '치료비 대신 후방지원부에서 일했습니다. ' + s.rng.pick(['식당 설거지였습니다. 손에 결정이 비쳤고, 고무장갑을 끼었습니다. 다들 끼었습니다.', '세탁실이었습니다. 교대가 끝나면 검진이었습니다. 검진이 끝나면 저녁이었습니다.', '선실 안내였습니다. 신입 환자에게 복도를 가르쳐 주었습니다. 제가 배운 지 석 달이었습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'rho_pt_labor_ledger', a: [12, 80], tags: ['rhodes_patient', 'rhodes:logistics'], w: 25, gap: 3,
    run: (s) => ({ t: '노동 대체 장부를 보았습니다. 올해 ' + s.rng.ri(180, 300) + '시간. 억제제 값으로 환산한 칸은 비어 있었습니다. 비워 둔다고 했습니다.', k: 'note', fx: { h: 1 }, f: logF('노동 대체 대장, ' + s.year + '년') }) },
  { id: 'rho_pt_labor_choice', a: [12, 80], tags: ['rhodes_patient', 'rhodes:logistics'], w: 20, gap: 4,
    run: (s) => ({ t: '상급자 밑에서 자원봉사로 돌릴 수 있다는 말을 들었습니다. 일은 같고 이름만 달랐습니다. 이름을 바꿨습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'rho_pt_med_ward', a: [3, 90], tags: ['rhodes_patient', 'rhodes:medical'], w: 35, gap: 2,
    run: (s) => ({ t: s.rng.pick(['의료부 병동이었습니다. 회진이 아침마다 왔고, 회진 뒤에 억제제가 왔습니다. 순서는 바뀌지 않았습니다.', '치료비를 낸 환자 병동이었습니다. 복도 끝 병실은 노동 대체 환자 쪽이었고, 약은 같은 상자에서 나왔습니다.', '재활회복과에서 손을 움직이는 연습을 했습니다. 결정이 덮은 손가락 셋이 조금씩 굽혀졌습니다.']), k: 'note', fx: { h: 1, hl: 1 } }) },
  { id: 'rho_pt_med_scan', a: [3, 90], tags: ['rhodes_patient', 'rhodes:medical'], w: 25, gap: 3,
    run: (s) => ({ t: '분석과에서 표본을 가져갔습니다. 번호표를 받았습니다. 번호표 뒤에 이름을 적어 주는 간호사가 있었고, 그 사람이 담당이었습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'rho_pt_med_bill', a: [12, 90], tags: ['rhodes_patient', 'rhodes:medical'], w: 20, gap: 3,
    run: (s) => ({ t: '의료행정과에서 청구서가 왔습니다. 항목이 ' + s.rng.ri(4, 12) + '줄이었고, 마지막 줄은 비어 있었습니다. 낼 수 없는 사람은 그 줄에 서명하면 된다고 했습니다.', k: 'note', fx: { money: -medX(s, 0.2) }, f: rhodesF('의료행정과 청구 기록') }) },
  { id: 'rho_pt_paying', a: [12, 90], tags: ['aff:RHO_PAT_PAYING'], w: 25, gap: 3,
    run: (s) => ({ t: '치료비를 냈습니다. 영수증에 "환자"라고 적혀 있었습니다. 돈을 내고도 환자였고, 그것이 여기서는 다행이었습니다.', k: 'note', fx: { money: -medX(s, 0.3) } }) },
  { id: 'rho_pt_remote', a: [3, 90], tags: ['aff:RHO_PAT_REMOTE'], w: 25, gap: 3,
    run: (s) => ({ t: '지부 원격 치료였습니다. 밴드가 수치를 보내고, 약이 사무소로 왔습니다. 본함은 한 번도 보지 못했습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'rho_pt_to_operator', a: [12, 80], tags: ['rhodes_operator'], w: 70, c: (s) => (s.S.trackHist || []).some((h) => h.id === 'RHO_PATIENT') && !s.S.flags.rhoP2OTold,
    run: (s) => { s.S.flags.rhoP2OTold = true; return { t: '카드가 바뀌었습니다. 방문 카드에서 정식 근무 카드로. ' + s.rng.pick(['색이 달라졌고, 식당 자리는 그대로였습니다.', '첫 월급이 나왔습니다. 치료비를 빼고도 남았습니다. 남는 것이 처음이었습니다.']), k: 'warm', fx: { h: 4 } }; } },

  // ════════════════════════════════════════════════════════════════════
  // RHO_* 진로 단계 이벤트
  // ════════════════════════════════════════════════════════════════════
  // ── RHO_OPERATOR ──
  { id: 'rho_op_res_gear', a: [14, 50], tags: ['track:RHO_OPERATOR:reserve'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['예비 인원으로 등록되었습니다. 장비를 받았습니다. 전부 새것이었고, 그것이 낯설었습니다.', '첫 훈련은 돌아오는 법이었습니다. 나가는 법은 둘째 주였습니다.']), k: 'ev', fx: { cap: { skill: 0.03 } } }) },
  { id: 'rho_op_res_ace', a: [14, 50], tags: ['track:RHO_OPERATOR:reserve'], w: 10, c: (s) => canonOk(s, 'ace'),
    run: (s) => { canonSee(s); return { t: '작전팀 팀장 하나가 예비 인원 장비를 점검하고 "살아서 돌아오는 게 일"이라고 했습니다. 그 사람은 다음 해 겨울에 돌아오지 않았습니다.', k: 'note', fx: { h: -1, cap: { skill: 0.02 } } }; } },
  { id: 'rho_op_rt_team', a: [15, 55], tags: ['track:RHO_OPERATOR:reserve_team'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['예비작전팀에 들어갔습니다. 팀 번호가 있었고, 팀원 이름을 외우는 데 하루가 걸렸습니다.', '첫 실전이었습니다. 돌아왔습니다. 세는 쪽이 아니라 세어지는 쪽이었습니다.']), k: 'ev', fx: { standing: 2, hl: -1 } }) },
  { id: 'rho_op_rt_a1', a: [15, 55], tags: ['aff:RHO_OP_A1'], w: 25, gap: 4,
    run: (s) => ({ t: '예비작전팀 A1은 치료 목적으로 들어온 사람이 많았습니다. 작전보다 검진 일정이 먼저 짜였습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'rho_op_reg_mission', a: [16, 60], tags: ['track:RHO_OPERATOR:regular'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['정규 작전팀이었습니다. 팀장 하나에 열하나. 열하나 중 제 자리는 뒤에서 셋째였습니다.', '기항지마다 작전이 있었습니다. 작전이 없는 기항지는 휴가였고, 휴가가 더 드물었습니다.']), k: 'ev', fx: { standing: 2 } }) },
  { id: 'rho_op_reg_sweep_rumor', a: [16, 60], tags: ['track:RHO_OPERATOR:regular'], w: 12, gap: 6,
    run: (s) => ({ t: '편제에 없는 팀이 있다는 말이 돌았습니다. 묻지 않았습니다. 묻지 않는 것이 외근부에서도 통했습니다.', k: 'note' }) },
  { id: 'rho_op_vet_a4', a: [20, 60], tags: ['track:RHO_OPERATOR:veteran'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['작전팀 A4로 옮겼습니다. 전원이 오래된 사람들이었고, 작전 전에 말이 적었습니다.', '신입 둘을 받았습니다. 장비를 점검해 주면서 옛날에 들은 말을 그대로 했습니다. "살아서 돌아오는 게 일."']), k: 'ev', fx: { standing: 3 } }) },
  { id: 'rho_op_vet_doctor', a: [20, 60], tags: ['track:RHO_OPERATOR:veteran'], w: 8, c: (s) => s.year >= 1097 && (s.S.flags.canonSeen || 0) < 3 && !s.S.flags.canonDoctor,
    run: (s) => { canonSee(s); s.S.flags.canonDoctor = true; return { t: '작전 지휘석에 "박사"라고 불리는 사람이 앉아 있는 것을 멀리서 보았습니다. 명령은 무전으로 왔고, 목소리는 기억나지 않습니다.', k: 'note' }; } },
  { id: 'rho_op_eli_weapon', a: [22, 60], tags: ['track:RHO_OPERATOR:elite'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['정예 오퍼레이터가 되었습니다. 커스텀 무기 허가가 나왔습니다. 엔지니어링부가 석 달 걸려 만들었고, 손에 맞았습니다.', '고난도 작전 명단에 이름이 올라갔습니다. 명단은 짧았고, 작년 명단과 이름이 셋 달랐습니다.']), k: 'big', fx: { standing: 4 } }) },
  { id: 'rho_op_eli_amiya', a: [22, 60], tags: ['track:RHO_OPERATOR:elite'], w: 8, c: (s) => canonOk(s, 'amiya'),
    run: (s) => { canonSee(s); return { t: '토끼 귀의 소녀가 신입 환자 병실을 하나하나 돌며 이름을 묻는 것을 복도 끝에서 보았습니다. 대표라고 했습니다. 가까이 가지는 않았습니다.', k: 'note', fx: { h: 1 } }; } },
  // ── RHO_MEDICAL ──
  { id: 'rho_med_int_half', a: [18, 45], tags: ['track:RHO_MEDICAL:intern'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['인턴 반년이었습니다. 채혈, 기록, 채혈. 시험은 그 뒤였습니다.', '첫 환자 기록을 썼습니다. 과장이 세 군데를 고쳤고, 네 번째는 고치지 않고 돌려주었습니다.']), k: 'ev', fx: { cap: { learn: 0.04 } } }) },
  { id: 'rho_med_int_ansel', a: [18, 45], tags: ['track:RHO_MEDICAL:intern'], w: 10, c: (s) => canonOk(s, 'ansel'),
    run: (s) => { canonSee(s); return { t: '이력서를 열 군데 넘게 거절당했다는 수련의가 같은 기수였습니다. 시험 성적이 좋았고, 다음 해에 의료팀에 있었습니다.', k: 'note' }; } },
  { id: 'rho_med_team_er', a: [19, 65], tags: ['aff:RHO_MED_ER'], w: 30, gap: 3,
    run: (s) => ({ t: '응급과였습니다. 외근부 차가 돌아오는 시간에 맞춰 교대를 짰습니다. 차가 늦는 날이 제일 길었습니다.', k: 'note', fx: { hl: -1, standing: 2 } }) },
  { id: 'rho_med_team_analysis', a: [19, 65], tags: ['aff:RHO_MED_ANALYSIS'], w: 30, gap: 3,
    run: (s) => ({ t: '분석과였습니다. 혈액 표본에 번호가 있었고, 번호 뒤의 이름은 의도적으로 보지 않았습니다. 가끔 보았습니다.', k: 'note', fx: { cap: { learn: 0.03 } } }) },
  { id: 'rho_med_team_warfarin', a: [19, 65], tags: ['track:RHO_MEDICAL:team'], w: 8, c: (s) => canonOk(s, 'warfarin'),
    run: (s) => { canonSee(s); return { t: '수석 의사가 채혈 바늘을 들고 웃자 대기 줄이 저절로 한 걸음 뒤로 물러나는 것을 보았습니다. 저도 물러났습니다.', k: 'note' }; } },
  { id: 'rho_med_sec_budget', a: [25, 70], tags: ['track:RHO_MEDICAL:section'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['과장이 되었습니다. 억제제 배분표에 서명하는 자리였습니다. 서명 뒤에 오래 앉아 있게 되었습니다.', '장기 의약 프로젝트를 맡았습니다. 회사의 수익원이라고 했고, 환자의 수치라고도 했습니다. 둘은 같은 숫자였습니다.']), k: 'big', fx: { standing: 3 } }) },
  { id: 'rho_med_sec_kaltsit', a: [25, 70], tags: ['track:RHO_MEDICAL:section'], w: 6, c: (s) => canonOk(s, 'kaltsit'),
    run: (s) => { canonSee(s); return { t: '의료부 책임자가 복도 끝에서 차트를 덮고 이쪽을 한 번 보았을 뿐인데 과 전원이 자세를 고쳤습니다. 말은 없었습니다.', k: 'note' }; } },
  { id: 'rho_med_chief_round', a: [30, 80], tags: ['track:RHO_MEDICAL:chief'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['수석 의사가 되었습니다. 회진에 따라오는 사람이 늘었고, 환자가 저를 보는 눈은 같았습니다.', '신입 인턴 시험 문제를 냈습니다. 제가 받았던 문제 하나를 그대로 넣었습니다.']), k: 'big', fx: { standing: 4 } }) },
  // ── RHO_ENGINEER ──
  { id: 'rho_eng_tech_first', a: [16, 45], tags: ['track:RHO_ENGINEER:technician'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['기사로 들어갔습니다. 첫 과제는 선실 환기구였습니다. 함선 전체에 ' + s.rng.ri(800, 1400) + '개라고 했습니다.', '공구함을 받았습니다. 새것이 아니었습니다. 전 주인 이름이 지워져 있었습니다.']), k: 'ev', fx: { cap: { learn: 0.03 } }, f: F('로도스 아일랜드 엔지니어링부 고정자산 대장') }) },
  { id: 'rho_eng_tech_closure', a: [16, 45], tags: ['track:RHO_ENGINEER:technician'], w: 8, c: (s) => canonOk(s, 'closure'),
    run: (s) => { canonSee(s); return { t: '엔지니어링부장이 신입 기사의 공구함을 열어 보고 "이건 내가 더 싸게 산다"고 했습니다. 신입은 저였습니다.', k: 'note', fx: { h: 1 } }; } },
  { id: 'rho_eng_sec_ops', a: [18, 65], tags: ['aff:RHO_ENG_OPS'], w: 30, gap: 3,
    run: (s) => ({ t: '운용정비과였습니다. 함선이 서는 밤이 우리 낮이었습니다. 보일러 세 번째 폭발도 우리 밤이었습니다.', k: 'note', fx: { hl: -1, standing: 2 } }) },
  { id: 'rho_eng_sec_mechanist', a: [18, 65], tags: ['aff:RHO_ENG_MECHANIST'], w: 25, gap: 4,
    run: (s) => ({ t: '메카니스트 연구실 소속이었습니다. 만드는 것은 대부분 외근부가 부숴 왔습니다. 그래서 다시 만들었습니다.', k: 'note', fx: { cap: { learn: 0.03 } } }) },
  { id: 'rho_eng_sec_eunectes', a: [18, 65], tags: ['track:RHO_ENGINEER:section'], w: 6, c: (s) => canonOk(s, 'eunectes'),
    run: (s) => { canonSee(s); return { t: '정글에서 왔다는 족장 하나가 부서를 옮겨 왔습니다. 쇳덩이를 혼자 들었고, 도면은 처음 본다고 했습니다. 반년 뒤에는 도면을 고쳤습니다.', k: 'note' }; } },
  { id: 'rho_eng_sen_project', a: [25, 70], tags: ['track:RHO_ENGINEER:senior'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['수석 연구원이 되었습니다. 단독 과제가 생겼습니다. 과제 이름은 제가 지었고, 예산은 구매부가 지었습니다.', '함선 순환 계통 설계를 다시 그렸습니다. 두 해 걸렸고, 바꾼 뒤 보일러는 한 해 동안 터지지 않았습니다.']), k: 'big', fx: { standing: 3 } }) },
  { id: 'rho_eng_chief_all', a: [30, 80], tags: ['track:RHO_ENGINEER:chief'], w: 40, gap: 2,
    run: (s) => ({ t: '총괄이 되었습니다. 함선 도면 전체가 제 책상에 올라왔습니다. 전부 읽은 사람은 둘뿐이라고 했고, 셋이 되었습니다.', k: 'big', fx: { standing: 4 } }) },
  // ── RHO_LOGISTICS ──
  { id: 'rho_log_help_first', a: [12, 70], tags: ['track:RHO_LOGISTICS:helper'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['후방지원부 보조로 들어갔습니다. 첫날 식당 뒷문을 배웠습니다. 뒷문이 앞문보다 바빴습니다.', '요리사, 운전기사, 재봉사. 전에 하던 일이 있는 사람은 그 일을, 없는 사람은 설거지를 받았습니다. 설거지를 받았습니다.']), k: 'ev', fx: { standing: 2 } }) },
  { id: 'rho_log_help_amiya', a: [12, 70], tags: ['track:RHO_LOGISTICS:helper'], w: 8, c: (s) => canonOk(s, 'amiya'),
    run: (s) => { canonSee(s); return { t: '토끼 귀의 소녀가 식당 뒷문으로 들어와 설거지 줄 끝에 섰습니다. 대표라고 했습니다. 그릇 다섯 개를 닦고 불려 나갔습니다.', k: 'warm', fx: { h: 2 } }; } },
  { id: 'rho_log_mem_living', a: [14, 70], tags: ['aff:RHO_LOG_LIVING'], w: 30, gap: 3,
    run: (s) => ({ t: '복장·식사·거주 팀이었습니다. 작전복 치수를 쟀습니다. 치수가 바뀐 사람은 이유를 말하지 않았고, 묻지 않았습니다.', k: 'note', fx: { standing: 2 } }) },
  { id: 'rho_log_mem_supply', a: [14, 70], tags: ['aff:RHO_LOG_SUPPLY'], w: 30, gap: 3,
    run: (s) => ({ t: '물자 배급 팀이었습니다. 기항지에서 들어온 상자를 세었습니다. 상자 수와 전표 수가 다른 날이 한 달에 한 번은 있었습니다.', k: 'note', fx: { cap: { learn: 0.01 } } }) },
  { id: 'rho_log_lead_shift', a: [20, 70], tags: ['track:RHO_LOGISTICS:lead'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['팀장이 되었습니다. 교대표를 짜는 사람이 되었고, 교대표에 제 이름을 제일 나쁜 자리에 넣었습니다.', '신입 환자 노동 배정을 맡았습니다. 손 상태를 보고 일을 골랐습니다. 제 손을 보던 사람도 그랬을 것입니다.']), k: 'ev', fx: { standing: 3 } }) },
  { id: 'rho_log_line_manage', a: [25, 70], tags: ['track:RHO_LOGISTICS:line'], w: 40, gap: 2,
    run: (s) => ({ t: '생산라인 관리를 맡았습니다. 하루 ' + s.rng.ri(2, 6) + '천 상자. 상자 하나에 억제제 한 달치. 숫자를 사람으로 바꾸면 잠이 안 와서 바꾸지 않았습니다.', k: 'big', fx: { standing: 3 }, f: logF('생산라인 일보, ' + s.year + '년') }) },
  { id: 'rho_log_line_retire_in', a: [25, 80], tags: ['track:RHO_LOGISTICS:line'], w: 20, gap: 5, c: (s) => s.S.age >= 50,
    run: (s) => ({ t: '옛 외근부 사람이 후방지원부로 왔습니다. 은퇴였습니다. 그 사람은 상자를 들었고, 들 수 있는 것을 다행으로 여겼습니다.', k: 'note', fx: { h: 1 } }) },
  // ── RHO_HR ──
  { id: 'rho_hr_rec_poster', a: [18, 55], tags: ['track:RHO_HR:recruit'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['채용과에 들어갔습니다. 공개 모집 공고 문안을 다듬었습니다. "배경·경력·상태 불문." 그 줄은 고치지 못하게 되어 있었습니다.', '지원서가 ' + s.rng.ri(30, 200) + '통 왔습니다. 반은 치료 문의였습니다. 치료 문의도 지원서로 받았습니다.']), k: 'ev', fx: { cap: { ties: 0.03 } }, f: hrF('채용과 접수 대장', s.year) }) },
  { id: 'rho_hr_rec_interview', a: [18, 55], tags: ['track:RHO_HR:recruit'], w: 25, gap: 3,
    run: (s) => ({ t: '면접에 배석했습니다. 지원자가 소매를 걷어 보여 주었습니다. 걷지 않아도 된다고 했습니다. 지원자는 그 말을 믿는 데 시간이 걸렸습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'rho_hr_scr_report', a: [22, 60], tags: ['track:RHO_HR:screening'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['심사과 감찰이 되었습니다. 보고서를 쓰는 사람이 되었고, 제 보고서도 누가 쓴다는 것을 알고 있었습니다.', '검증 불가 전력의 지원자가 있었습니다. 의료부 책임자 승인으로 넘어갔습니다. 서류에는 "승인"만 남았습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'rho_hr_scr_psych', a: [22, 60], tags: ['track:RHO_HR:screening'], w: 25, gap: 3,
    run: (s) => ({ t: '심리평가 결과를 정리했습니다. 관리층 경고 대상이 ' + s.rng.ri(2, 12) + '명이었습니다. 이름을 적는 손이 느려졌습니다.', k: 'bad', fx: { h: -2 }, f: hrF('심리평가 집계', s.year) }) },
  { id: 'rho_hr_sec_training', a: [26, 65], tags: ['track:RHO_HR:section'], w: 40, gap: 2,
    run: (s) => ({ t: '과장이 되었습니다. 입사 교육 교재를 새로 썼습니다. 첫 장은 그대로 두었습니다. 카드 세 종류.', k: 'big', fx: { standing: 3 } }) },
  { id: 'rho_hr_sec_loss', a: [26, 65], tags: ['track:RHO_HR:section'], w: 20, gap: 4,
    run: (s) => ({ t: '작전 사망자 유언 처리를 과 단위로 맡았습니다. 결과만 적습니다. 그달 과 전원이 정시 퇴근을 하지 않았습니다.', k: 'bad', fx: { h: -3, standing: 2 } }) },
  { id: 'rho_hr_head_seat', a: [30, 70], tags: ['track:RHO_HR:head'], w: 40, gap: 2,
    run: (s) => ({ t: '인사부장이 되었습니다. 직원 명부 전체가 제 책상에 있었습니다. 제 이름도 그 안에 있었고, 제 칸에도 비어 있는 줄이 하나 있었습니다.', k: 'big', fx: { standing: 4 } }) },
  { id: 'rho_hr_head_card', a: [30, 70], tags: ['track:RHO_HR:head'], w: 20, gap: 4,
    run: (s) => ({ t: '카드를 잃어버린 직원이 신원 재확인을 기다렸습니다. 사흘이었습니다. 사흘 동안 그 사람은 복도에서 살았고, 규정은 규정이었습니다.', k: 'note', fx: { h: -1 } }) },
  // ── RHO_PURCHASE ──
  { id: 'rho_pur_staff_center', a: [18, 55], tags: ['track:RHO_PURCHASE:staff'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['구매센터 직원이 되었습니다. 전표가 하루 ' + s.rng.ri(40, 120) + '장이었습니다. 반은 억제제 원료였습니다.', '첫 발주를 넣었습니다. 값이 틀렸고, 협상 담당이 고쳐 주었습니다. 고친 값이 더 쌌습니다.']), k: 'ev', fx: { cap: { ties: 0.02 } }, f: F('로도스 아일랜드 구매센터 전표 집계') }) },
  { id: 'rho_pur_staff_market', a: [18, 55], tags: ['track:RHO_PURCHASE:staff'], w: 25, gap: 3,
    run: (s) => ({ t: portName(s) + ' 시장에서 견적을 받아 왔습니다. 로도스라고 하면 값이 두 가지로 나왔습니다. 두 번째 값을 적어 왔습니다.', k: 'note', fx: { money: medX(s, 0.03) } }) },
  { id: 'rho_pur_neg_deal', a: [22, 60], tags: ['track:RHO_PURCHASE:negotiator'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['협상 담당이 되었습니다. 협력사가 "감염자 회사와는"이라고 말을 시작했고, 끝까지 듣고 계약서를 꺼냈습니다. 서명했습니다.', '의약품 서비스 계약을 도시 하나와 맺었습니다. 조건에 "감염자 적정 가격" 줄이 들어갔습니다. 그 줄 때문에 두 달이 걸렸습니다.']), k: 'ev', fx: { standing: 3, money: medX(s, 0.2) } }) },
  { id: 'rho_pur_neg_partner', a: [22, 60], tags: ['aff:RHO_PUR_PARTNER'], w: 25, gap: 3,
    run: (s) => ({ t: '협력사 협상 테이블에 앉았습니다. 저쪽은 변호사 셋, 이쪽은 저와 전표. 전표가 이겼습니다.', k: 'note', fx: { standing: 2 } }) },
  { id: 'rho_pur_head_seat', a: [28, 70], tags: ['track:RHO_PURCHASE:head'], w: 40, gap: 2,
    run: (s) => ({ t: '부장이 되었습니다. 엔지니어링부장이 겸임하던 자리였고, 인수인계는 공구함 영수증 한 다발이었습니다.', k: 'big', fx: { standing: 4 } }) },
  { id: 'rho_pur_head_drop', a: [28, 70], tags: ['track:RHO_PURCHASE:head'], w: 20, gap: 4,
    run: (s) => ({ t: '수익이 급감한 해였습니다. 회의에서 숫자를 읽었고, 읽는 동안 의료부 쪽 사람들이 환자 수를 세고 있었습니다.', k: 'bad', fx: { standing: -2, h: -2 } }) },
  // ── RHO_OFFICE ──
  { id: 'rho_off_staff_arrive', a: [20, 65], tags: ['track:RHO_OFFICE:staff'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['사무소 직원으로 전근했습니다. 땅이 움직이지 않는 곳에서 자는 것이 처음에는 어색했습니다.', '사무소에는 직원 ' + s.rng.ri(3, 12) + '명이 있었습니다. 전원이 서로의 선실 번호를 아직 기억하고 있었습니다.']), k: 'ev', fx: { standing: 2 }, f: hrF('지부 인원 현황', s.year) }) },
  { id: 'rho_off_staff_nearl', a: [20, 65], tags: ['track:RHO_OFFICE:staff'], w: 8, c: (s) => !!s.S.track && canonOk(s, 'nearl') && s.S.track.aff === 'RHO_OFF_KAZIMIERZ',
    run: (s) => { canonSee(s); return { t: '사무소 뒷골목에서 투구를 벗은 기사가 아이들에게 사인 대신 물을 나눠 주고 있었습니다. 사무소 사람이라고 했습니다. 인사만 했습니다.', k: 'note', fx: { h: 1 } }; } },
  { id: 'rho_off_sup_field', a: [22, 70], tags: ['track:RHO_OFFICE:support'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['현지 외근 지원을 맡았습니다. 본함 작전팀이 왔다 갔고, 남은 것은 서류와 수리비 청구서였습니다.', '현지 환자 둘을 본함으로 보냈습니다. 밴드 수치가 기준을 넘었습니다. 둘 다 돌아왔고, 하나는 작업복을 입고 왔습니다.']), k: 'ev', fx: { standing: 3 } }) },
  { id: 'rho_off_sup_kazdel', a: [22, 70], tags: ['aff:RHO_OFF_KAZDEL'], w: 25, gap: 3,
    run: (s) => ({ t: '카즈델 사무소였습니다. 환자 대부분이 용병이었고, 검진 날 아무도 소매를 걷으라는 말을 듣지 않았습니다. 이미 걷고 있었습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'rho_off_head_seat', a: [28, 75], tags: ['track:RHO_OFFICE:head'], w: 40, gap: 2,
    run: (s) => ({ t: '사무소장이 되었습니다. 현지 대표였습니다. 현지 관청이 저를 "회사 사람"이라고 불렀고, 환자들은 "로도스"라고 불렀습니다.', k: 'big', fx: { standing: 4 } }) },
  { id: 'rho_off_head_raid', a: [28, 75], tags: ['track:RHO_OFFICE:head'], w: 15, gap: 5,
    run: (s) => ({ t: '사무소가 습격당했습니다. 결과만 적습니다. 서류는 탔고 사람은 다쳤고, 다음 주에 다른 건물에서 문을 열었습니다.', k: 'bad', fx: { hl: -5, h: -4, standing: 3 } }) },
  // ── RHO_CONTRACTOR(원 소속 없이 들어온 계약자) ──
  { id: 'rho_con_sig_paper', a: [14, 65], tags: ['track:RHO_CONTRACTOR:signed'], w: 40, gap: 2,
    run: (s) => ({ t: '협정에 서명했습니다. 조항이 ' + s.rng.ri(6, 20) + '개였고, 마지막 조항은 해지였습니다. 그 조항을 두 번 읽었습니다.', k: 'ev', fx: { standing: 2 }, f: hrF('협력 협정 등록부', s.year) }) },
  { id: 'rho_con_sig_card', a: [14, 65], tags: ['track:RHO_CONTRACTOR:signed'], w: 25, gap: 3,
    run: (s) => ({ t: '협력 계약 카드를 받았습니다. 정식 카드보다 출입 구역이 적었고, 식당은 같았습니다.', k: 'note' }) },
  { id: 'rho_con_dep_op', a: [15, 65], tags: ['track:RHO_CONTRACTOR:deployed'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['파견 작전에 나갔습니다. 로도스 팀과 같은 차에 탔고, 다른 무전을 들었습니다.', '보수가 치료로 왔습니다. 억제제 한 상자. 돈으로 받았으면 더 적었을 것입니다.']), k: 'ev', fx: { standing: 2, hl: -1 } }) },
  { id: 'rho_con_dep_rainbow', a: [15, 65], tags: ['aff:RHO_CON_RAINBOW'], w: 25, gap: 3,
    run: (s) => ({ t: '보급을 대가로 작전에 나가는 팀이었습니다. 보급은 제때 왔고, 작전도 제때 왔습니다.', k: 'note', fx: { money: medX(s, 0.2) } }) },
  { id: 'rho_con_exp_end', a: [15, 70], tags: ['track:RHO_CONTRACTOR:expired'], w: 50, gap: 3,
    run: (s) => ({ t: s.rng.pick(['계약이 만료되었습니다. 카드를 반납했습니다. 반납하는 창구가 받는 창구와 같았습니다.', '치료가 끝났습니다. 밴드를 풀었고, 손목에 자국이 남았습니다.']), k: 'note', fx: { h: 1 } }) },
  { id: 'rho_con_exp_stay', a: [15, 70], tags: ['track:RHO_CONTRACTOR:expired'], w: 25, gap: 4,
    run: (s) => ({ t: '퇴사 신청이 승인되지 않았다는 통지가 원 소속에서 왔습니다. 형식상 남았습니다. 형식이 하는 일은 많지 않았습니다.', k: 'note', fx: { h: -1 } }) },
  // ── RHO_PATIENT 단계 ──
  { id: 'rho_pat_adm_first', a: [3, 90], tags: ['track:RHO_PATIENT:admit'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['입원했습니다. 첫 검진에서 간호사가 이름을 물었습니다. 번호가 아니라.', '병실은 2인실이었습니다. 옆 침대 사람이 먼저 인사했습니다. 손을 보지 않고.']), k: 'warm', fx: { h: 3 } }) },
  { id: 'rho_pat_adm_minimalist', a: [12, 90], tags: ['track:RHO_PATIENT:admit'], w: 8, c: (s) => canonOk(s, 'minimalist'),
    run: (s) => { canonSee(s); return { t: '옆 병실의 작은 건축가가 "체류는 일시적"이라고 세 번 말하는 것을 들었습니다. 창고 도면을 고치고 있었습니다.', k: 'note', fx: { h: 1 } }; } },
  { id: 'rho_pat_band_wear', a: [3, 90], tags: ['track:RHO_PATIENT:band'], w: 50, gap: 2,
    run: (s) => ({ t: '디스플레이 밴드를 찼습니다. ' + s.rng.pick(['처음 사흘은 자꾸 보았습니다. 나흘째부터는 소리가 날 때만 보았습니다.', '밴드가 읽어 주는 숫자를 간호사가 다시 읽어 주었습니다. 같은 숫자였고, 두 번째가 덜 무서웠습니다.']), k: 'note', fx: { h: 1 } }) },
  { id: 'rho_pat_band_scan', a: [3, 90], tags: ['track:RHO_PATIENT:band'], w: 25, gap: 3,
    run: (s) => ({ t: '생체 정보 스캔이 있었습니다. 기계가 길었고, 안에서 ' + s.rng.ri(10, 40) + '분이었습니다. 나오니 의사가 종이를 들고 있었습니다. 읽어 주겠다고 했습니다.', k: 'note', fx: { h: 1 }, f: rhodesF('정기 스캔 기록') }) },
  { id: 'rho_pat_sup_dose', a: [3, 90], tags: ['track:RHO_PATIENT:suppressant'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['억제제 치료가 시작되었습니다. 투여량이 종이에 적혀 왔고, 종이가 매달 바뀌었습니다.', '약이 바뀌었습니다. 맛은 같았습니다. 수치가 달랐습니다.']), k: 'note', fx: { h: 1 } }) },
  { id: 'rho_pat_sup_volunteer', a: [12, 90], tags: ['aff:RHO_PAT_VOLUNTEER'], w: 25, gap: 3,
    run: (s) => ({ t: '상급자 밑에서 자원봉사를 했습니다. 의료부 복도 청소였습니다. 복도 끝에서 제 담당 의사와 마주쳤고, 둘 다 인사했습니다.', k: 'note', fx: { h: 1, standing: 2 } }) },
  { id: 'rho_pat_sta_stable', a: [3, 90], tags: ['track:RHO_PATIENT:stable'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['수치가 두 해째 같았습니다. 의사는 "유지"라고 적었습니다. 유지라는 말이 이렇게 좋은 말인 줄 몰랐습니다.', '정식 직원 전환 이야기가 나왔습니다. 서류는 인사부에서 왔고, 첫 칸은 희망 부서였습니다.']), k: 'warm', fx: { h: 3 } }) },
  { id: 'rho_pat_sta_leave', a: [3, 90], tags: ['track:RHO_PATIENT:stable'], w: 20, gap: 4,
    run: (s) => ({ t: '체류를 끝내고 돌아가는 사람을 배웅했습니다. "일시적"이라고 처음부터 말하던 사람이었습니다. 정말 돌아갔습니다.', k: 'note', fx: { h: 1 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 외근 작전 결과(결과만)
  // ════════════════════════════════════════════════════════════════════
  { id: 'rho_mission_wound', a: [14, 60], tags: ['rhodes:field', 'rhodes_operator'], w: 15, gap: 3,
    run: (s) => ({ t: '작전에서 다쳤습니다. 결과만 적습니다. 의료부에서 ' + s.rng.ri(2, 8) + '주를 보냈고, 돌아왔을 때 팀 명단에 제 이름이 그대로 있었습니다.', k: 'bad', fx: { hl: -10, standing: 2 }, f: rhodesF('응급과 입원 기록, ' + s.year + '년') }) },
  { id: 'rho_mission_kia', a: [14, 60], tags: ['rhodes:field', 'rhodes_operator'], w: 4, gap: 5, c: (s) => !!s.S.track && s.S.track && s.S.track.id === 'RHO_OPERATOR',
    run: (s) => { if (s.rng.chance(0.3)) { s.fall('kia'); return false; } return { t: '작전에서 팀원 하나를 잃었습니다. 결과만 적습니다. 인사부 사람이 그 사람 선실에서 유언을 찾아 읽었고, 우리는 복도에 서 있었습니다.', k: 'bad', fx: { h: -5 } }; } },
  { id: 'rho_mission_worse', a: [14, 60], tags: ['rhodes:field', 'rhodes_operator', 'infected'], w: 15, gap: 3,
    run: (s) => { s.S.ori.uL = +(s.S.ori.uL + 0.02).toFixed(3); return { t: '작전 지역의 오리지늄 농도가 높았습니다. 돌아와서 밴드가 울렸고, 수치가 올라 있었습니다. ' + uL(s) + ' u/L. 다음 작전에서 빠졌습니다.', k: 'bad', fx: { hl: -3, h: -2 }, f: rhodesF('작전 후 검진 기록') }; } },
  { id: 'rho_mission_rescue_other', a: [14, 60], tags: ['rhodes:field', 'rhodes_operator'], w: 15, gap: 4,
    run: (s) => ({ t: '작전 지역에서 사람 ' + s.rng.ri(2, 15) + '명을 데려왔습니다. 전원 감염자였습니다. 의료부가 받았고, 한 사람은 일주일 뒤 식당에서 설거지를 하고 있었습니다.', k: 'warm', fx: { h: 3, standing: 2 }, f: hrF('구조 인원 등록', s.year) }) },

  // ════════════════════════════════════════════════════════════════════
  // 정기 심리평가·감염 기록·함내 공통
  // ════════════════════════════════════════════════════════════════════
  { id: 'rho_psych_yearly', a: [12, 90], tags: ['rhodes'], w: 20, gap: 3, c: (s) => !!R(s),
    run: (s) => ({ t: '정기 심리평가를 받았습니다. ' + s.rng.pick(['질문지는 두 장이었고, 두 번째 장이 어려웠습니다.', '평가자가 "요즘 잠은"이라고 물었고, 대답을 받아 적지 않았습니다. 그것이 더 신경 쓰였습니다.', '결과는 알려 주지 않았습니다. 다음 해에도 같은 자리에 있었으니 괜찮았던 모양입니다.']), k: 'note', fx: { h: s.rng.pick([1, 0, -1]) } }) },
  { id: 'rho_ori_record', a: [12, 90], tags: ['rhodes', 'infected'], w: 20, gap: 2, c: (s) => !!R(s),
    run: (s) => ({ t: '감염 기록 갱신. ' + uL(s) + ' u/L. ' + s.rng.pick(['수치표를 받아 서랍에 넣었습니다. 서랍이 두꺼워졌습니다.', '지난해와 비교한 선이 평평했습니다. 평평한 것이 좋은 것이었습니다.', '의사가 "느려졌다"고 했습니다. 작년에도 그 말이었고, 작년에도 맞았습니다.']), k: 'note', fx: { h: 1 }, f: rhodesF('환자 경과 기록') }) },
  { id: 'rho_band_all', a: [12, 90], tags: ['rhodes', '!infected'], w: 12, gap: 5, c: (s) => !!R(s),
    run: (s) => ({ t: '감염되지 않았는데도 모니터 팔찌를 찼습니다. 전원이 찼습니다. 팔찌는 한 번도 울리지 않았고, 매일 보았습니다.', k: 'note' }) },
  { id: 'rho_ship_night', a: [5, 90], tags: ['rhodes'], w: 20, gap: 3, c: (s) => onShip(s),
    run: (s) => ({ t: s.rng.pick(['함선이 이동하는 밤에는 바닥이 울렸습니다. 금방 익숙해졌습니다.', '보일러가 터졌다는 방송이 나왔습니다. 세 번째였습니다. 식당은 그대로 열렸습니다.', '카드를 잃어버린 사람이 복도에 앉아 있었습니다. 신원 재확인까지 작업 구역에 못 들어간다고 했습니다. 빵을 가져다주었습니다.']), k: 'note', fx: { h: 1 } }) },
  { id: 'rho_ship_faces', a: [5, 90], tags: ['rhodes'], w: 15, gap: 4, c: (s) => onShip(s),
    run: (s) => ({ t: '복도에서 마주치는 얼굴이 몇 개 늘었습니다. 몇 개는 사라졌습니다. 사라진 쪽은 세지 않는 것이 함내의 예의였습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'rho_family_aboard', a: [16, 80], tags: ['rhodes'], w: 15, gap: 5, c: (s) => onShip(s) && !!partner(s),
    run: (s) => { s.S.flags.rhodesCompanion = true; return { t: partner(s).name + '의 동반 신청 서류를 냈습니다. 인사부가 같은 부서 배치를 원칙으로 한다고 했습니다.', k: 'warm', fx: { h: 2 } }; } },

  // ════════════════════════════════════════════════════════════════════
  // 기항지 순회(visit:<port>) — 본함 거주자
  // ════════════════════════════════════════════════════════════════════
  { id: 'rho_port_lungmen', a: [5, 90], tags: ['visit:lungmen', 'rhodes'], w: 30, gap: 2, c: onShip,
    run: (s) => ({ t: s.rng.pick(['용문에 정박했습니다. 근위국 차가 함선 옆에 하루 서 있다 갔습니다. 아무 일도 없었습니다.', '용문 거리에 내렸습니다. 결정이 비치는 손을 주머니에 넣는 사람이 함선보다 많았습니다.', '용문 빈민가 쪽에서 환자 접수가 길었습니다. 접수 줄이 함선 계단을 내려가 거리까지 닿았습니다.']), k: 'note' }) },
  { id: 'rho_port_lungmen_1096', a: [5, 90], tags: ['visit:lungmen', 'rhodes'], w: 60, c: (s) => onShip(s) && s.year === 1097,
    run: (s) => ({ t: '사변 다음 해의 용문이었습니다. 함선 이름이 신문에 났다고 했습니다. 거리에서 로도스 작업복을 보는 눈이 두 가지였습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'rho_port_victoria', a: [5, 90], tags: ['visit:victoria', 'rhodes'], w: 30, gap: 2, c: onShip,
    run: (s) => ({ t: s.rng.pick(['빅토리아에 정박했습니다. 공작령마다 서류가 달랐고, 사무소 사람이 세 종류를 들고 다녔습니다.', '런디니움 쪽 소식이 함선 안에서 먼저 돌았습니다. ' + (s.year >= 1094 && s.year <= 1098 ? '성문이 닫혀 있었습니다.' : '성문은 열려 있었고, 살카즈 직원은 내리지 않았습니다.')]), k: 'note' }) },
  { id: 'rho_port_columbia', a: [5, 90], tags: ['visit:columbia', 'rhodes'], w: 30, gap: 2, c: onShip,
    run: (s) => ({ t: s.rng.pick(['컬럼비아에 정박했습니다. 보험 설계사가 함선 앞에서 전단을 나눠 주었습니다. 아무도 받지 않았습니다.', '컬럼비아 제약회사 사람이 구매부와 회의를 했습니다. 회의실 문이 하루 종일 닫혀 있었습니다.']), k: 'note' }) },
  { id: 'rho_port_kazimierz', a: [5, 90], tags: ['visit:kazimierz', 'rhodes'], w: 30, gap: 2, c: onShip,
    run: (s) => ({ t: s.rng.pick(['카시미어에 정박했습니다. 경기 중계가 함선 식당 단말기에 틀어졌고, 외근부 사람들이 돈을 걸었습니다.', '카시미어 지하 거주구에서 환자가 올라왔습니다. 올라오는 길이 길었다고 했습니다.']), k: 'note' }) },
  { id: 'rho_port_leithanien', a: [5, 90], tags: ['visit:leithanien', 'rhodes'], w: 30, gap: 2, c: onShip,
    run: (s) => ({ t: s.rng.pick(['라이타니엔에 정박했습니다. 격리구역 쪽에서 밴드 수치가 넘어온 사람이 ' + s.rng.ri(3, 20) + '명이었습니다. 전원 받았습니다.', '라이타니엔 사무소 사람이 "보건령"이라는 말을 하루에 열 번 했습니다.']), k: 'note', f: hrF('기항지 접수 기록', s.year) }) },
  { id: 'rho_port_ursus', a: [5, 90], tags: ['visit:ursus', 'rhodes'], w: 30, gap: 2, c: onShip,
    run: (s) => ({ t: s.rng.pick(['우르수스에 정박했습니다. 내무성 사람이 명부를 요구했고, 사무소가 다른 명부를 내주었습니다.', '우르수스 기항은 짧았습니다. 짧은 이유는 아무도 설명하지 않았습니다.']), k: 'note', fx: { h: -1 } }) },
  { id: 'rho_port_kazdel', a: [5, 90], tags: ['visit:kazdel', 'rhodes'], w: 30, gap: 2, c: onShip,
    run: (s) => ({ t: s.rng.pick(['카즈델에 정박했습니다. 살카즈 직원들이 하선 명단 앞쪽에 섰습니다.', '카즈델 사무소에서 용병 환자가 줄을 섰습니다. 아무도 소매를 걷으라는 말을 듣지 않았습니다. 이미 걷고 있었습니다.', '카즈델 거리에서 함선 쪽을 보는 눈이 있었습니다. 옛 이름을 아는 눈이었습니다.']), k: 'note' }) },
  { id: 'rho_port_bolivar', a: [5, 90], tags: ['visit:bolivar', 'rhodes'], w: 30, gap: 2, c: onShip,
    run: (s) => ({ t: s.rng.pick(['볼리바르에 정박했습니다. 세 정부 중 어느 쪽 서류를 낼지 사무소가 아침마다 정했습니다.', '도솔레스 인공 바다 옆에 섰습니다. 외근부가 휴가를 받았고, 반은 작전으로 바뀌었습니다.']), k: 'note' }) },
  { id: 'rho_port_siracusa', a: [5, 90], tags: ['visit:siracusa', 'rhodes'], w: 30, gap: 2, c: onShip,
    run: (s) => ({ t: '시라쿠사에 정박했습니다. 누구도 누구의 이름을 크게 부르지 않았고, 함선 사람들도 그렇게 했습니다.', k: 'note' }) },
  { id: 'rho_port_sargon', a: [5, 90], tags: ['visit:sargon', 'rhodes'], w: 30, gap: 2, c: onShip,
    run: (s) => ({ t: s.rng.pick(['사르곤에 정박했습니다. 더웠습니다. 함선 환기구가 하루 종일 돌았고, 엔지니어링부가 하루 종일 돌았습니다.', '사르곤 광산 마을에서 환자가 왔습니다. 영주 쪽 서류가 함께 왔습니다. 서류는 사무소가 맡았습니다.']), k: 'note' }) },
  { id: 'rho_port_iberia', a: [5, 90], tags: ['visit:iberia', 'rhodes'], w: 30, gap: 2, c: onShip,
    run: (s) => ({ t: '이베리아 내륙에 정박했습니다. 해안 쪽으로는 가지 않았습니다. 가지 않는 이유를 아는 사람은 사무소 사람뿐이었습니다.', k: 'note' }) },
  { id: 'rho_port_rim', a: [5, 90], tags: ['visit:rim', 'rhodes'], w: 30, gap: 2, c: onShip,
    run: (s) => ({ t: s.rng.pick(['림 빌리턴에 정박했습니다. 광산 회사가 보안 외주를 묻고 갔습니다. 외근부가 받았습니다.', '림 빌리턴의 광산 도시에서 환자가 많이 왔습니다. 전원 광부였고, 전원 "소모품"이라는 말을 알고 있었습니다.']), k: 'note' }) },
  { id: 'rho_port_shore_leave', a: [12, 90], tags: ['rhodes'], w: 15, gap: 4, c: (s) => onShip(s) && !!s.S.res.itinerantAt,
    run: (s) => ({ t: portName(s) + ' 정박 중에 하루 휴가를 받았습니다. 회사 이익 범위 안에서 자유롭게 다니라고 했습니다. 범위가 어디까지인지는 아무도 몰랐습니다.', k: 'warm', fx: { h: 2, money: -medX(s, 0.03) } }) },

  // ════════════════════════════════════════════════════════════════════
  // 1101.7 본함 소실 · 퇴사 · 은퇴
  // ════════════════════════════════════════════════════════════════════
  { id: 'rho_1101_lost', a: [3, 99], tags: ['rhodes'], w: 9999, c: (s) => onShip(s) && s.year === 1101 && !s.S.flags.rho1101,
    run: (s) => { s.S.flags.rho1101 = true; const r = s.rng.rnd();
      if (r < 0.012) { s.die('accident', '본함 소실'); return; }
      if (r < 0.15) return { t: '7월, 본함을 잃었습니다. 대피 중에 다쳤습니다. 결과만 적습니다. 선실에 두고 온 것은 전부 두고 온 채였습니다.', k: 'big', fx: { hl: -12, h: -8, money: -medX(s, 0.5) }, f: hrF('대피 인원 집계', 1101) };
      return { t: '7월, 본함을 잃었습니다. 대피했습니다. 가져온 것은 카드와 밴드뿐이었고, 둘 다 아직 작동했습니다.', k: 'big', fx: { h: -8, money: -medX(s, 0.4) }, f: hrF('대피 인원 집계', 1101) }; } },
  { id: 'rho_1101_after', a: [3, 99], tags: ['rhodes'], w: 60, c: (s) => s.S.flags.rho1101 && s.year === 1102 && !s.S.flags.rho1102,
    run: (s) => { s.S.flags.rho1102 = true; return { t: '본함을 잃은 다음 해였습니다. ' + s.rng.pick(['지부 건물에서 겨울을 났습니다. 땅이 움직이지 않아 잠이 안 왔습니다.', '새 함선 이야기가 돌았습니다. 돌기만 했습니다.', '카드는 그대로 유효했습니다. 열 문이 없어도.']), k: 'note', fx: { h: -2 } }; } },
  { id: 'rho_1101_heard', a: [10, 99], tags: ['!rhodes'], w: 20, c: (s) => s.year === 1101 && s.rng.chance(0.4) && !s.S.flags.rho1101heard,
    run: (s) => { s.S.flags.rho1101heard = true; return { t: '로도스 아일랜드 본함이 소실되었다는 소식이 왔습니다. ' + (s.S.ori.on ? '치료받던 사람들이 어디로 갔는지는 기사에 없었습니다.' : '제약회사 배 하나가 없어진 기사였고, 짧았습니다.'), k: 'note', fx: s.S.ori.on ? { h: -2 } : {} }; } },
  { id: 'rho_retire_office', a: [45, 99], tags: ['rhodes', 'retired'], w: 50, c: (s) => !!R(s) && !s.S.flags.rhoRetireTold,
    run: (s) => { s.S.flags.rhoRetireTold = true; return { t: '은퇴했습니다. ' + s.rng.pick(['고정 지부 전근을 신청했습니다. 땅이 움직이지 않는 곳이었습니다.', '함선에 남았습니다. 후방지원부가 상자 하나를 맡겼습니다. 들 수 있었습니다.', '카드는 반납하지 않아도 된다고 했습니다. 색만 바뀌었습니다.']), k: 'note', fx: { h: 2 } }; } },
  { id: 'rho_left_after', a: [12, 99], tags: ['!rhodes'], w: 60, c: (s) => s.S.flags.rhodesLeftAt != null && s.S.age - s.S.flags.rhodesLeftAt <= 1 && !s.S.flags.rhoLeftTold,
    run: (s) => { s.S.flags.rhoLeftTold = true; return { t: '함선을 떠난 첫해였습니다. ' + s.rng.pick(['밴드 자국이 손목에 남아 있었습니다. 겨울에 없어졌습니다.', '바닥이 울리지 않는 밤에 깼습니다. 몇 달 갔습니다.', '약은 사무소 경유로 왔습니다. 값은 전과 같았고, 줄은 없었습니다.']), k: 'note', fx: { h: -1 } }; } },

  // ════════════════════════════════════════════════════════════════════
  // 국가 횡단 접점 이벤트(referral 입구) + 소문
  // ════════════════════════════════════════════════════════════════════
  { id: 'rho_contact_operation', a: [16, 55], tags: ['!rhodes'], w: 1.5, gap: 10, c: (s) => s.S.cur !== 'rhodes' && !s.S.prison && s.rng.chance(0.08),
    run: (s) => { s.S.flags.rhodes_operation = s.S.age; return { t: '로도스 아일랜드 작전에 휘말렸습니다. ' + s.rng.pick(['작업복 입은 사람들이 거리를 막았고, 끝나고 한 사람이 제 이름을 적어 갔습니다.', '우리 쪽 사람 둘을 그쪽 의무병이 봐 주었습니다. 값은 받지 않았고, 이름은 물었습니다.']), k: 'note', fx: { h: -1 } }; } },
  { id: 'rho_contact_legal', a: [20, 60], tags: ['!rhodes'], w: 1.5, gap: 10, c: (s) => s.S.cur !== 'rhodes' && !!s.S.track && !s.S.prison && s.rng.chance(0.08),
    run: (s) => { s.S.flags.rhodes_legal = s.S.age; return { t: '로도스 아일랜드와 계약 서류를 주고받았습니다. ' + s.rng.pick(['상대 쪽 사람이 조항 하나를 고쳐 왔고, 고친 쪽이 맞았습니다. 그 사람이 제 이름을 적어 갔습니다.', '제약회사라고 했고, 서류는 제약회사보다 두꺼웠습니다.']), k: 'note', fx: { cap: { ties: 0.01 } } }; } },
  { id: 'rho_contact_pact', a: [20, 60], tags: ['!rhodes'], w: 1.5, gap: 10, c: (s) => !!s.S.track && s.S.cur !== 'rhodes' && !!s.S.track && (s.track.archetype === 'A9' || s.S.cap.learn > 0.5) && !s.S.prison && s.rng.chance(0.08),
    run: (s) => { s.S.flags.rhodes_medical_pact = s.S.age; return { t: '로도스 아일랜드와 의료 기술 협약 자리에 앉았습니다. ' + s.rng.pick(['저쪽 의사가 질문을 셋 했고, 셋 다 제가 답했습니다. 끝나고 연락처를 물었습니다.', '협약서에 서명한 사람 중 제 이름이 제일 아래였고, 저쪽은 그 이름을 적어 갔습니다.']), k: 'note', fx: { cap: { learn: 0.01 } } }; } },
  { id: 'rho_contact_rescue', a: [12, 70], tags: ['!rhodes'], w: 1.5, gap: 10, c: (s) => s.S.cur !== 'rhodes' && !s.S.prison && s.rng.chance(0.08),
    run: (s) => { s.S.flags.rhodes_rescue = s.S.age; return { t: '구조 현장에 로도스 아일랜드 사람들이 있었습니다. ' + s.rng.pick(['같이 사람을 파냈습니다. 끝나고 그쪽 사람이 물을 건네며 이름을 물었습니다.', '그쪽 차가 다친 사람을 실었습니다. 제가 안내했고, 안내한 길을 그 사람이 적었습니다.']), k: 'note', fx: { hl: -1, h: 1 } }; } },
  { id: 'rho_rumor_far', a: [12, 80], tags: ['!rhodes', 'known'], w: 10, gap: 6, c: (s) => ['yan', 'sami', 'minos', 'durin'].includes(s.S.cur),
    run: (s) => ({ t: '감염자를 치료해 주는 배가 있다는 말을 들었습니다. 먼 소문이었습니다. 사무소도 없었고, 배가 오는 길도 없었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'rho_poster_seen', a: [16, 50], tags: ['!rhodes'], w: 2, gap: 10, c: (s) => s.S.cur !== 'rhodes' && !s.S.ori.known,
    run: (s) => ({ t: '로도스 아일랜드 공개 모집 공고를 보았습니다. "배경·경력·상태 불문." ' + s.rng.pick(['읽고 지나갔습니다.', '한 번 더 읽었습니다. 그것뿐이었습니다.']), k: 'note' }) },
];

// ────────────────────────────────────────────────────────────────────────────
// 결정 (9) — rhodes_offer 는 엔진 내장 결정을 덮어쓴다(k 유지: join/hold/decline)
// ────────────────────────────────────────────────────────────────────────────
const VIA_BODY = {
  volunteer: (s, place) => '로도스 아일랜드 공개 모집 공고를 보고 지원했습니다. 인사부 채용과에서 답장이 왔습니다. 배경 조사가 있었고, 면접은 짧았습니다. ' + DEPT_LABEL[place.dept] + ' 자리를 제안받았습니다.',
  referral: (s, place) => { const c = contactKind(s); const cap = topCap(s); const capN = cap ? CAP_NAME[cap[0]] : '솜씨';
    const where = c === 'operation' ? '로도스 작전에 휘말렸을 때' : c === 'legal' ? '법률 계약을 체결할 때' : c === 'pact' ? '의료 기술 협약 자리에서' : c === 'rescue' ? '구조 현장에서' : '그때';
    return where + ' ' + eul(capN) + ' 눈여겨본 덕에 헤드헌팅 제안이 왔습니다. 인사부 사람이 직접 찾아왔고, ' + DEPT_LABEL[place.dept] + ' 자리를 말했습니다.'; },
  treatment: (s, place) => '로도스 아일랜드가 환자를 받는다고 했습니다. ' + (place.dept === 'logistics' ? '치료비는 후방지원부 노동으로 대신할 수 있다고 했습니다.' : '치료비는 낼 수 있었습니다.') + ' 함선은 한 곳에 머물지 않는다고 했고, ' + (partner(s) ? '가족 동반란이 있었습니다.' : '짐은 하나면 된다고 했습니다.'),
  rescue: (s) => '작전 지역에서 로도스 아일랜드에 구조되었습니다. 의무병이 밴드를 채워 주었고, 함선으로 가면 치료를 계속할 수 있다고 했습니다.',
  agreement: (s) => '로도스 아일랜드가 협력 협정을 제안했습니다. 원 소속은 그대로 두고, 협력 계약 카드를 받고, 작전과 치료를 나눈다는 조건이었습니다. 검사 불응 조항도 있었습니다.',
  companion: (s) => '가족이 로도스 아일랜드에 합류했습니다. 동반 신청란이 있었고, 같은 부서 배치가 원칙이라고 했습니다.',
  flight: (s) => '쫓기던 길 끝에 로도스 아일랜드 함선이 있었습니다. 받아 줄 수 있지만 의료부 책임자의 승인이 필요하다고 했습니다. 승인은 이튿날 났습니다.',
  transfer: (s) => '로도스 아일랜드에서 소속을 옮기지 않겠느냐고 했습니다. 지금 소속이 승인할지는 모른다고 했고, 승인하지 않아도 오는 사람이 있다고 했습니다.',
  babel: (s) => '바벨이 해체되고 배는 남았습니다. 옛 동료가 갑판에서 이름을 불렀습니다. 배 이름은 바뀌어 있었고, 하는 일은 바뀌지 않았다고 했습니다.',
};

export const decisions = {
  rhodes_offer: {
    once: false, gap: 2, at: 0.55,
    ok: (s) => { if (!s.S.flags.rhodesPending) { const v = yearly(s, 'rhodes', () => rhodesTrigger(s)); if (v) s.S.flags.rhodesPending = v; } return !!s.S.flags.rhodesPending && !s.S.rhodes; },
    build: (s, p) => { const via = s.S.flags.rhodesPending; if (!via) return null; p.via = via;
      const place = placeRhodes(s, via);
      const autoJoin = (B.rhodes.autoJoin && (B.rhodes.autoJoin[via] ?? B.rhodes.autoJoin.default)) ?? 0.4;
      const body = (VIA_BODY[via] || VIA_BODY.treatment)(s, place);
      const tail = place.status === 'patient' ? ' 환자로 등록된다고 했습니다.' : place.status === 'contractor' ? ' 협력 계약자 카드가 나온다고 했습니다.' : ' 정식 근무 카드가 나온다고 했습니다.';
      return { title: '로도스 아일랜드', body: body + tail,
        choices: [
          { k: 'join', label: '합류한다', sub: place.status === 'patient' ? '치료 시작, 함선 거주' : place.status === 'contractor' ? '원 소속 유지' : (s.S.track ? '지금 일은 그만둡니다' : '일자리가 생깁니다'), auto: autoJoin },
          { k: 'hold', label: '보류한다', sub: '제안은 남습니다', auto: (1 - autoJoin) * 0.4 },
          { k: 'decline', label: '거절한다', sub: '한동안 다시 오지 않습니다', auto: (1 - autoJoin) * 0.6 }] }; },
    apply: (s, k, p) => { s.S.flags.y_rhodes = null; s.S.flags.rhodesPending = null;
      if (k === 'join') return joinRhodes(s, p.via) ? false : '합류하지 못했습니다.';
      if (k === 'decline') { s.S.flags.rhodesDeclinedAt = s.S.age; return { t: '거절했습니다. 안내서는 서랍에 넣었습니다.', k: 'note' }; }
      return { t: '대답을 미루었습니다. 안내서는 식탁 위에 두었습니다.', k: 'note' }; },
  },
  /** 환자 — 치료비: 지불/노동 대체 */
  rho_patient_pay: {
    tags: ['rhodes_patient'], once: true, at: 0.5,
    ok: (s) => !!R(s) && yearsIn(s) <= 1,
    build: (s) => ({ title: '치료비', body: '후방지원부에서 서류를 가져왔습니다. 치료비를 내거나, 노동으로 대신하거나, 상급자 밑에서 자원봉사로 돌리거나. 셋 다 같은 억제제가 나온다고 했습니다.',
      choices: [
        { k: 'pay', label: '낸다', sub: Math.round(s.med * 0.8).toLocaleString() + ' LMD, 해마다', auto: s.S.money >= s.med * 2 ? 1.5 : 0.3 },
        { k: 'labor', label: '노동으로 대신한다', sub: '후방지원부 교대', auto: 1.5 },
        { k: 'volunteer', label: '자원봉사로 돌린다', sub: '상급자 지도', auto: 0.8 }] }),
    apply: (s, k) => {
      const tr = s.S.track;
      if (k === 'pay') { if (tr && tr.id === 'RHO_PATIENT') tr.aff = 'RHO_PAT_PAYING'; return { t: '치료비를 냈습니다. 영수증에 "환자"라고 적혀 있었고, 그것으로 충분했습니다.', k: 'note', fx: { money: -medX(s, 0.8) } }; }
      if (k === 'volunteer') { if (tr && tr.id === 'RHO_PATIENT') tr.aff = 'RHO_PAT_VOLUNTEER'; return { t: '자원봉사로 돌렸습니다. 의료부 복도 청소였습니다. 일은 노동과 같았고, 이름만 달랐습니다.', k: 'note', fx: { h: 1 } }; }
      if (tr && tr.id === 'RHO_PATIENT') tr.aff = 'RHO_PAT_LABOR'; if (R(s)) R(s).dept = 'logistics';
      return { t: '노동으로 대신하기로 했습니다. 후방지원부 교대표에 이름이 올라갔습니다. 첫 교대는 설거지였습니다.', k: 'note', fx: { standing: 2 } };
    },
  },
  /** 정기 심리평가 결과 */
  rho_psych: {
    tags: ['rhodes'], gap: 5, once: false, at: 0.5,
    ok: (s) => !!R(s) && R(s).status !== 'patient' && s.S.st.h < 40 && s.rng.chance(0.4),
    build: (s) => ({ title: '심리평가', body: '정기 심리평가 결과가 관리층 경고 기준에 닿았습니다. 인사부가 휴직을 권했습니다. 권고였고, 권고는 기록에 남았습니다.',
      choices: [
        { k: 'rest', label: '휴직한다', sub: '행복 +, 지위 −', auto: 1.2 },
        { k: 'work', label: '계속 일한다', sub: '변화 없음', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'rest') return { t: '석 달 쉬었습니다. 기항지 하나를 통째로 걸어 다녔습니다. 돌아오니 교대표에 이름이 다시 있었습니다.', k: 'warm', fx: { h: 8, standing: -4 } };
      return { t: '계속 일했습니다. 평가자가 다음 해에 같은 질문을 했고, 대답이 조금 달랐습니다.', k: 'note', fx: { h: -1, standing: 1 } };
    },
  },
  /** 퇴사 신청 */
  rho_resign: {
    tags: ['rhodes_operator'], gap: 6, once: false, at: 0.5,
    ok: (s) => !!R(s) && yearsIn(s) >= 3 && s.S.age >= 20 && s.S.age <= 60 && !s.S.retired && s.rng.chance(0.06),
    build: (s) => ({ title: '퇴사', body: '퇴사 신청서가 인사부에 있었습니다. 승인이 필요했습니다. 승인되지 않은 채 남은 사람도 있다고 했고, 승인되어 떠난 사람도 있다고 했습니다.',
      choices: [
        { k: 'file', label: '신청한다', sub: '승인되면 함선을 떠납니다', auto: 0.6 },
        { k: 'stay', label: '남는다', sub: '변화 없음', auto: 1.5 }] }),
    apply: (s, k) => {
      if (k !== 'file') return { t: '신청서를 서랍에 도로 넣었습니다.', k: 'note' };
      if (!s.rng.chance(0.7)) return { t: '승인되지 않았습니다. 사유란에는 "작전 일정"이라고 적혀 있었습니다. 형식상 남았고, 형식은 한 해 더 갔습니다.', k: 'note', fx: { h: -2, standing: -3 } };
      const to = s.S.born && s.data.nationById[s.S.born] && s.S.born !== 'rhodes' ? s.S.born : (s.S.res && s.S.res.itinerantAt) || null;
      s.S.rhodes = false; s.S.flags.rhodesLeftAt = s.S.age; s.S.flags.rhodesDeclinedAt = s.S.age;
      if (s.S.track && s.S.track.id.startsWith('RHO_')) s.leaveTrack('switch', { quiet: true });
      if (to && s.S.cur === 'rhodes') s.migrate('return', to, { quiet: true });
      if (s.S.phase !== 'life') return false;
      return { t: '승인되었습니다. 카드를 반납했고, 밴드는 가져가도 된다고 했습니다. 약은 사무소 경유로 받기로 했습니다.', k: 'big', fx: { h: 2 } };
    },
  },
  /** 고정 지부 전근 */
  rho_office_transfer: {
    tags: ['rhodes_operator'], gap: 6, once: false, at: 0.5,
    ok: (s) => !!R(s) && onShip(s) && yearsIn(s) >= 4 && s.S.age >= 24 && !!s.S.track && s.S.track.id !== 'RHO_OFFICE' && s.S.track.id !== 'RHO_PATIENT' && s.rng.chance(0.08),
    build: (s) => ({ title: '전근', body: '고정 지부 전근을 신청할 수 있는 해였습니다. 땅이 움직이지 않는 곳, 전문이 하루 두 번 오는 곳. 사무소 자리는 늘 비어 있다고 했습니다.',
      choices: [
        { k: 'go', label: '신청한다', sub: '주재 사무소 진로, 거주지 이동', auto: 0.8 },
        { k: 'stay', label: '함선에 남는다', auto: 1.5 }] }),
    apply: (s, k) => {
      if (k !== 'go') return { t: '남았습니다. 바닥이 울리는 밤이 아직 괜찮았습니다.', k: 'note' };
      if (!s.switchTrack('RHO_OFFICE')) return { t: '신청했지만 자리가 나지 않았습니다.', k: 'note' };
      if (R(s)) R(s).dept = 'office';
      const to = OFFICE_NATION[s.S.track.aff] || s.rng.pick(['kazimierz', 'victoria', 'columbia']);
      if (s.data.nationById[to]) s.migrate('work', to, { keepTrack: true, papers: 'agreement', quiet: true });
      if (s.S.phase !== 'life') return false;
      return { t: ro(s.data.nationById[to] ? s.data.nationById[to].name : '지부') + ' 전근했습니다. 첫날 밤 바닥이 울리지 않아 잠을 설쳤습니다.', k: 'big', fx: { h: 1 } };
    },
  },
  /** 후방지원부·환자 → 외근 지원 */
  rho_field_volunteer: {
    tags: ['rhodes'], gap: 5, once: false, at: 0.5,
    ok: (s) => !!R(s) && onShip(s) && !!s.S.track && ['RHO_LOGISTICS', 'RHO_PATIENT'].includes(s.S.track.id) && s.S.age >= 16 && s.S.age <= 45 && s.S.cap.skill > 0 && s.S.ori.stage <= 1 && s.rng.chance(0.1),
    build: (s) => ({ title: '외근부', body: '외근부 훈련센터가 지원을 받았습니다. 지침 첫 줄은 "감염자를 위해, 광석병을 극복하기 위해"였고, 둘째 줄은 사망 시 유언 처리 절차였습니다.',
      choices: [
        { k: 'go', label: '지원한다', sub: '외근 오퍼레이터 진로, 위험 +', auto: 0.7 },
        { k: 'no', label: '지금 자리에 남는다', auto: 1.5 }] }),
    apply: (s, k) => {
      if (k !== 'go') return { t: '남았습니다. 상자는 가벼웠고, 가벼운 것이 좋았습니다.', k: 'note' };
      if (!s.switchTrack('RHO_OPERATOR')) return { t: '지원했지만 능력 평가에서 떨어졌습니다. 다음 해에 다시 받는다고 했습니다.', k: 'note', fx: { h: -1 } };
      if (R(s)) { R(s).dept = 'field'; R(s).status = 'operator'; }
      return { t: '외근부로 옮겼습니다. 첫 훈련은 돌아오는 법이었습니다.', k: 'big', fx: { h: 2 } };
    },
  },
  /** 의료부·엔지니어링부 — 자가 실험 */
  rho_self_experiment: {
    tags: ['rhodes_operator'], gap: 6, once: false, at: 0.5,
    ok: (s) => !!s.S.track && ['RHO_MEDICAL', 'RHO_ENGINEER'].includes(s.S.track.id) && s.S.track.stage >= 1 && s.rng.chance(0.08),
    build: (s) => ({ title: '자가 실험', body: (s.S.track.id === 'RHO_MEDICAL' ? '새 억제제 조성이 동물 단계를 넘었습니다. 사람 단계 첫 피험자 칸이 비어 있었습니다.' : '새 장비 시제품이 시험대에 올랐습니다. 첫 시험자 칸이 비어 있었습니다.') + ' 과장은 아무 말도 하지 않았고, 그 침묵이 허락이었습니다.',
      choices: [
        { k: 'do', label: '제 이름을 적는다', sub: '성공하면 승급, 실패하면 몸이 상함', auto: 0.5 },
        { k: 'no', label: '적지 않는다', auto: 1.5 }] }),
    apply: (s, k) => {
      if (k !== 'do') return { t: '적지 않았습니다. 칸은 다음 달에 다른 이름으로 채워졌습니다.', k: 'note' };
      const r = s.rng.rnd();
      if (r < 0.45) { s.promote({ force: true, quiet: true }); return { t: '이름을 적었습니다. 결과가 좋았습니다. 보고서에 제 이름이 두 번 들어갔습니다. 피험자 칸과 저자 칸에.', k: 'big', fx: { standing: 8, h: 3 } }; }
      if (r < 0.8) return { t: '이름을 적었습니다. 결과는 보통이었고, 몸은 보통이 아니었습니다. 한 달을 누웠습니다.', k: 'bad', fx: { hl: -15, standing: 2 } };
      if (!s.S.ori.on && s.S.track.id === 'RHO_MEDICAL') { s.infect('rhodes_experiment'); return { t: '이름을 적었습니다. 실험 중 사고가 났습니다. 결과만 적습니다. 다음 검진에서 밴드가 처음으로 울렸습니다.', k: 'bad', fx: { hl: -10, h: -5 } }; }
      return { t: '이름을 적었습니다. 사고가 났습니다. 결과만 적습니다. 의료부에서 두 달을 보냈습니다.', k: 'bad', fx: { hl: -25, h: -5 } };
    },
  },
  /** 1101 본함 소실 뒤 — 거취 */
  rho_1101_evac: {
    tags: ['rhodes'], once: true, at: 0.9,
    ok: (s) => !!s.S.flags.rho1101 && s.year === 1102 && !!R(s) && R(s).status !== 'contractor',
    build: (s) => ({ title: '본함을 잃은 뒤', body: '본함을 잃고 한 해가 지났습니다. 대피 인원이 지부로 나뉘었습니다. 인사부가 희망 지부를 물었고, 희망하지 않는 사람은 가까운 지부로 간다고 했습니다.',
      choices: [
        { k: 'office', label: '지부로 간다', sub: '주재 사무소 진로', auto: 1.2 },
        { k: 'wait', label: '본함 재건을 기다린다', sub: '변화 없음', auto: 1 },
        { k: 'leave', label: '이참에 떠난다', sub: '함선을 떠납니다', auto: 0.5 }] }),
    apply: (s, k) => {
      if (k === 'wait') return { t: '기다리기로 했습니다. 기다리는 동안 거처가 세 번 바뀌었고, 카드는 그대로였습니다.', k: 'note', fx: { h: -1 } };
      if (k === 'leave') { const to = s.S.born !== 'rhodes' && s.data.nationById[s.S.born] ? s.S.born : (s.S.res && s.S.res.itinerantAt) || 'lungmen';
        s.S.rhodes = false; s.S.flags.rhodesLeftAt = s.S.age; s.S.flags.rhodesDeclinedAt = s.S.age;
        if (s.S.track && s.S.track.id.startsWith('RHO_')) s.leaveTrack('switch', { quiet: true });
        if (s.S.cur === 'rhodes') s.migrate('return', to, { quiet: true });
        if (s.S.phase !== 'life') return false;
        return { t: '떠났습니다. 떠나는 사람이 많았고, 인사부는 그 수를 세지 않았습니다.', k: 'big', fx: { h: -2 } }; }
      if (s.S.track && s.S.track.id !== 'RHO_OFFICE' && s.S.track.id !== 'RHO_PATIENT' && s.switchTrack('RHO_OFFICE')) { if (R(s)) R(s).dept = 'office'; }
      const to = OFFICE_NATION[s.S.track && s.S.track.aff] || s.rng.pick(['lungmen', 'kazimierz', 'victoria', 'columbia']);
      if (s.S.cur === 'rhodes' && s.data.nationById[to]) s.migrate('work', to, { keepTrack: true, papers: 'agreement', quiet: true });
      if (s.S.phase !== 'life') return false;
      return { t: ro(s.data.nationById[to] ? s.data.nationById[to].name : '지부') + ' 갔습니다. 지부 건물은 작았고, 땅은 움직이지 않았습니다.', k: 'big', fx: { h: -1 } };
    },
  },
  /** 협력 계약자 — 협정 갱신·정식 전환·복귀 */
  rho_contract_renew: {
    tags: ['rhodes_contractor'], gap: 3, once: false, at: 0.5,
    ok: (s) => !!R(s) && yearsIn(s) >= 2 && s.rng.chance(0.3),
    build: (s) => ({ title: '협정', body: '협력 협정 기한이 왔습니다. 갱신할 수도, 정식 근무 카드로 바꿀 수도, 원 소속으로 돌아갈 수도 있다고 했습니다. 세 서류가 같은 봉투에 들어 있었습니다.',
      choices: [
        { k: 're', label: '협정을 갱신한다', sub: '원 소속 유지', auto: 1.5 },
        { k: 'join', label: '정식 직원이 된다', sub: '외근부 배치, 함선 거주', auto: 0.8 },
        { k: 'back', label: '원 소속으로 돌아간다', sub: '로도스 관계 종료', auto: 0.7 }] }),
    apply: (s, k) => {
      if (k === 're') return { t: '갱신했습니다. 카드 색은 그대로였고, 유효 기간만 바뀌었습니다.', k: 'note', fx: { standing: 2 } };
      if (k === 'join') { R(s).status = 'operator'; R(s).dept = 'field';
        if (s.S.cur !== 'rhodes' && s.data.nationById.rhodes) s.migrate('rhodes', 'rhodes', { papers: 'agreement', quiet: true, keepTrack: false });
        if (s.S.phase !== 'life') return false;
        if (!s.S.track || !s.S.track.id.startsWith('RHO_')) s.enterTrack('RHO_OPERATOR', { how: 'rhodes', via: 'agreement', quiet: true });
        return { t: '정식 근무 카드를 받았습니다. 지위를 반납하는 쪽이었고, 부대원 명단은 그대로 가져갔습니다.', k: 'big', fx: { h: 2 } }; }
      s.S.rhodes = false; s.S.flags.rhodesLeftAt = s.S.age; s.S.flags.rhodesDeclinedAt = s.S.age;
      if (s.S.track && s.S.track.id === 'RHO_CONTRACTOR') s.leaveTrack('switch', { quiet: true });
      return { t: '원 소속으로 돌아갔습니다. 카드를 반납했고, 받은 치료는 반납하지 않아도 되었습니다.', k: 'note', fx: { h: 1 } };
    },
  },
};

export default { events, decisions };
