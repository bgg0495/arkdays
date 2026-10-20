// W9h 공통 고용주 콘텐츠(COM_*, 국가 횡단). 핵심 4: 펭귄 로지스틱스(용문 거주 조건·사장 호감)·재앙 정보 전달자(itinerant, 예보 실패 비난, 국가별 소속 aff:)·
// 블랙스틸 교환 프로그램(소속 유지 파견·치료 동의서)·용병 시장(소규모 용병 팀 + 계약 4층 구조 프리셋 결정). 나머지 COM_* 6 진로는 단계마다 1개씩 최소 서사.
// 어느 나라에서든 열리므로 국가 문화 치환은 s.nation.name 정도로만. 담백체(D25), 각주는 숫자 있을 때만(D31), 조사는 text.js(D30), 캐논 인물 1회성(D43).
import { eul, iga, eun, wa, ro } from '../../src/engine/text.js';
import { F, medX } from '../_util.js';

const partner = (s) => (s.S.fam.partner && s.S.fam.partner.alive ? s.S.fam.partner : null);
const affIs = (s, ...ids) => !!s.S.track && ids.includes(s.S.track.aff);
const visitName = (s) => { const n = s.S.res && s.S.res.itinerantAt && s.data.nationById[s.S.res.itinerantAt]; return n ? n.name : null; };
const here = (s) => s.nation.name;
function canonOk(s, id) {
  const f = (s.data.canonFigures || []).find((x) => x.id === id);
  if (!f) return false;
  if (s.year < f.years[0] || s.year > f.years[1]) return false;
  return (s.S.flags.canonSeen || 0) < 3;
}
const canonSee = (s) => { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; };
const afterFall = (s, track, outcome) => s.S.flags.lastTrack === track && s.S.flags.lastFallAt != null && s.S.age - s.S.flags.lastFallAt <= 1 && (!outcome || s.S.flags.lastFallOutcome === outcome) && !s.S.track;
const penF = (doc) => F('펭귄 로지스틱스 ' + doc);
const msgF = (doc, year) => F('재앙 정보 전달자 협회 ' + doc + (year == null ? '' : ', ' + year + '년'));
const bswF = (doc) => F('블랙스틸 월드와이드 ' + doc);

export const events = [
  // ════════════════════════════════════════════════════════════════════
  // COM_PENGUIN 펭귄 로지스틱스 (용문 본부, 사장 직접 심사, 보수 자율)
  // ════════════════════════════════════════════════════════════════════
  { id: 'com_pen_scr_interview', a: [16, 45], tags: ['track:COM_PENGUIN:screened'], w: 60,
    run: (s) => ({ t: '펭귄 로지스틱스 면접을 보았습니다. 사장이 직접 했습니다. ' + s.rng.pick(['질문은 하나도 없었고 커피 취향만 물었습니다.', '사장은 음악을 틀어 놓고 끝까지 듣게 했습니다. 그것이 면접이었습니다.', '사장이 "우리 회사 좋아하나"라고 물었습니다. 좋아한다고 했습니다. 사장은 "진심이군" 했고, 그 말이 합격이었습니다.']), k: 'ev', fx: { standing: 3 } }) },
  { id: 'com_pen_scr_move', a: [16, 45], tags: ['track:COM_PENGUIN:screened'], w: 50, c: (s) => !['lungmen', 'siracusa'].includes(s.S.cur) && s.S.cur !== 'rhodes',
    run: (s) => { if (!s.migrate('work', 'lungmen', { keepTrack: true, quiet: true })) return { t: '본부는 용문이라고 했습니다. 옮기지 못했습니다.', k: 'note' };
      return { t: '본부는 용문이라고 했습니다. 용문으로 옮겼습니다. 사장은 "집은 회사 근처가 좋다"고만 했고, 집세는 묻지 않았습니다.', k: 'ev', fx: { h: 1 } }; } },
  { id: 'com_pen_scr_trial', a: [16, 45], tags: ['track:COM_PENGUIN:screened'], w: 35, gap: 2,
    run: (s) => ({ t: '심사 기간이었습니다. ' + s.rng.pick(['첫 배송은 봉투 하나였습니다. 봉투를 받은 사람이 봉투보다 저를 오래 보았습니다.', '동료가 오토바이 뒤에 태워 주었습니다. 골목을 열 개 지났고, 열 개 다 기억하라고 했습니다.', '회사에 직급이 없다는 것을 알았습니다. 사장과 직원. 직원끼리는 전부 같았습니다.']), k: 'note', fx: { standing: 2, cap: { ties: 0.02 } } }) },
  { id: 'com_pen_staff_job', a: [17, 55], tags: ['track:COM_PENGUIN:staff'], w: 40, gap: 2,
    run: (s) => ({ t: '통상 업무였습니다. ' + s.rng.pick(['통상 업무가 예상 밖이었습니다. 배송지에 받을 사람이 없었고, 대신 다른 사람들이 있었습니다. 짐은 전달했습니다.', '호위 일이었습니다. 호위 대상이 누군지는 끝까지 몰랐고, 무사히 내려 주었습니다.', '근위국 차가 옆을 지나갔습니다. 보지 않았습니다. 저쪽도 보지 않았습니다. 그것이 용문에서 회사가 굴러가는 방식이었습니다.']), k: 'ev', fx: { money: medX(s, 0.3), hl: -1, standing: 2 } }) },
  { id: 'com_pen_staff_pay', a: [17, 55], tags: ['track:COM_PENGUIN:staff'], w: 30, gap: 3,
    run: (s) => ({ t: '월급날이었습니다. ' + s.rng.pick(['"원하는 만큼"이 회사 원칙이었습니다. 적어 냈고, 적어 낸 대로 왔습니다. 다음 달에는 조금 더 적어 냈습니다.', '동료는 돈 대신 오토바이 부품을 받았습니다. 그것도 되는 회사였습니다.']), k: 'note', fx: { money: medX(s, 0.2) } }) },
  { id: 'com_pen_staff_siracusa', a: [17, 55], tags: ['aff:COM_PEN_SIRACUSA'], w: 30, gap: 3,
    run: (s) => ({ t: '시라쿠사 지사 일이었습니다. 배송지에서 누구도 이름을 크게 부르지 않았습니다. 짐을 건네고 이름도 말하지 않고 다음 골목으로 갔습니다.', k: 'note', fx: { standing: 2 } }) },
  { id: 'com_pen_staff_emperor', a: [17, 55], tags: ['track:COM_PENGUIN'], w: 10, c: (s) => !!s.S.track && canonOk(s, 'emperor') && s.S.track.stage >= 1,
    run: (s) => { canonSee(s); return { t: '사장이 사무실에서 음반을 틀어 놓고 아무 말 없이 서류에 서명하는 것을 보았습니다. 서명한 서류가 제 월급이었고, 금액은 제가 적은 것이었습니다.', k: 'note', fx: { h: 1 } }; } },
  { id: 'com_pen_staff_texas', a: [17, 55], tags: ['track:COM_PENGUIN'], w: 8, c: (s) => canonOk(s, 'texas'),
    run: (s) => { canonSee(s); return { t: '오토바이에 기댄 배달원이 짐을 건네고는 이름도 말하지 않은 채 다음 골목으로 사라지는 것을 보았습니다. 같은 회사 사람이었습니다.', k: 'note' }; } },
  { id: 'com_pen_role_split', a: [18, 60], tags: ['track:COM_PENGUIN:role'], w: 40, gap: 2,
    run: (s) => ({ t: '역할이 정해졌습니다. ' + s.rng.pick(['배송과 호위. 둘 다였습니다. 회사가 작아서 둘 다였습니다.', '기술 쪽이었습니다. 오토바이와 단말기. 둘 다 저보다 비쌌습니다.', '정보 쪽이었습니다. 무엇을 아는지보다 누가 아는지를 아는 일이었습니다.']), k: 'ev', fx: { standing: 3, money: medX(s, 0.3) } }) },
  { id: 'com_pen_role_danger', a: [18, 60], tags: ['track:COM_PENGUIN:role'], w: 25, gap: 3,
    run: (s) => ({ t: '쥐왕 쪽 사람들과 부딪혔습니다. 결과만 적습니다. 짐은 전달했고, 오토바이는 수리에 들어갔습니다.', k: 'bad', fx: { hl: -4, standing: 3 } }) },
  { id: 'com_pen_role_honorary', a: [18, 60], tags: ['aff:COM_PEN_HONORARY'], w: 25, gap: 3,
    run: (s) => ({ t: '명예 직원이었습니다. 출근은 자유였고, 월급은 "원하는 만큼"이었고, 원하는 만큼을 적는 것이 제일 어려웠습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'com_pen_role_kazdel', a: [18, 60], tags: ['track:COM_PENGUIN:role', 'visit:kazdel'], w: 30, gap: 3,
    run: (s) => ({ t: '카즈델 배송이었습니다. 외부 행상이 거의 없는 땅이라 회사 짐이 도시 하나의 한 달치였습니다. 값은 파편으로 받았고, 사장은 그것도 받았습니다.', k: 'note', fx: { money: medX(s, 0.2) } }) },
  { id: 'com_pen_after', a: [16, 70], w: 50, c: (s) => afterFall(s, 'COM_PENGUIN', 'expel'),
    run: (s) => ({ t: '회사를 나왔습니다. 사장이 마지막 월급 칸을 비워 두었습니다. 적어 넣지 않고 나왔습니다.', k: 'note', fx: { h: -2 } }) },

  // ── COM_PENGUIN_IDOL 펭귄 보호 아이돌 ──
  { id: 'com_pid_con_sign', a: [14, 30], tags: ['track:COM_PENGUIN_IDOL:contract'], w: 50, gap: 2,
    run: (s) => ({ t: '계약서에 "보호"라는 말이 세 번 들어 있었습니다. 공연보다 보호가 먼저라고 했습니다.', k: 'ev', fx: { standing: 2 } }) },
  { id: 'com_pid_pro_stage', a: [15, 35], tags: ['track:COM_PENGUIN_IDOL:protected'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['공연장 뒷문으로 나왔습니다. 경호가 셋이었고, 팬 한 명에게만 손을 흔들 수 있었습니다.', '무대에 섰습니다. 객석에 배달 회사 사람들이 앉아 있었습니다. 그 사람들이 가장 크게 손뼉을 쳤습니다.']), k: 'ev', fx: { standing: 3, money: medX(s, 0.5) } }) },
  { id: 'com_pid_pro_sora', a: [15, 35], tags: ['track:COM_PENGUIN_IDOL'], w: 8, c: (s) => canonOk(s, 'sora'),
    run: (s) => { canonSee(s); return { t: '같은 소속의 가수가 경호원 셋에 둘러싸여 팬 한 명에게만 손을 흔드는 것을 보았습니다. 그 한 명이 되는 것이 소속의 규칙이었습니다.', k: 'note' }; } },
  { id: 'com_pid_rec_album', a: [16, 40], tags: ['track:COM_PENGUIN_IDOL:record'], w: 50, gap: 2,
    run: (s) => ({ t: '음반이 나왔습니다. 제작자 이름이 배달 회사 사장과 같았습니다. 같은 사람이었습니다.', k: 'big', fx: { standing: 4, money: medX(s, 1) } }) },

  // ════════════════════════════════════════════════════════════════════
  // COM_MESSENGER 재앙 정보 전달자 (itinerant, 국가 공인, 예보 실패 비난)
  // ════════════════════════════════════════════════════════════════════
  { id: 'com_msg_app_notebook', a: [16, 35], tags: ['track:COM_MESSENGER:apprentice'], w: 50, gap: 2,
    run: (s) => ({ t: '수습 전달자가 되었습니다. ' + s.rng.pick(['관측 노트를 받았습니다. 두꺼웠고, 첫 장은 선배 글씨였습니다.', '보호복과 통신기와 관측 장비. 배낭이 몸보다 무거웠습니다.', '첫 관측은 황야였습니다. 이동도시 밖에서 밤을 새운 것이 처음이었습니다.']), k: 'ev', fx: { cap: { arts: 0.03, learn: 0.02 } } }) },
  { id: 'com_msg_app_cost', a: [16, 35], tags: ['track:COM_MESSENGER:apprentice'], w: 30, gap: 3,
    run: (s) => ({ t: '장비 값이 사비였습니다. 보호복 수선비로 한 달 수입의 ' + s.rng.ri(30, 70) + '할이 나갔습니다. 선배는 "원래 그렇다"고 했습니다.', k: 'bad', fx: { money: -medX(s, 0.2) }, f: msgF('수습 장비 지침') }) },
  { id: 'com_msg_app_arts', a: [16, 35], tags: ['track:COM_MESSENGER:apprentice'], w: 25, gap: 3,
    run: (s) => ({ t: '아츠로 데이터 요동을 읽는 훈련이었습니다. 처음에는 바람과 재앙을 구분하지 못했습니다. 반년 뒤에 구분했고, 그것으로 수습 2년차였습니다.', k: 'note', fx: { cap: { arts: 0.04 } } }) },
  { id: 'com_msg_cer_license', a: [18, 45], tags: ['track:COM_MESSENGER:certified'], w: 50, gap: 2,
    run: (s) => ({ t: '공인 전달자가 되었습니다. ' + s.rng.pick(['신분증과 제한구역 통행증이 나왔습니다. 통행증이 신분증보다 두꺼웠습니다.', '첫 경보를 냈습니다. 마을 하나가 하루 비웠습니다. 재앙은 왔고, 마을은 비어 있었습니다.', '예보가 맞았습니다. 아무도 고맙다고 하지 않았습니다. 맞으면 당연하고 틀리면 전달자 탓이었습니다.']), k: 'ev', fx: { standing: 3 } }) },
  { id: 'com_msg_cer_miss', a: [18, 45], tags: ['track:COM_MESSENGER:certified'], w: 30, gap: 3,
    run: (s) => ({ t: '예보가 빗나갔습니다. ' + s.rng.pick(['재앙이 예보보다 하루 일찍 왔습니다. 마을 사람들이 전달자 이름을 외웠습니다. 제 이름이었습니다.', '경보를 냈는데 재앙이 오지 않았습니다. 하루 비운 값을 물어내라는 사람이 있었습니다.', '입성을 거부당했습니다. 이동도시 문 앞에서 "감염자 전달자"라는 말을 들었고, 밖에서 재앙을 재었습니다.']), k: 'bad', fx: { standing: -5, h: -3 } }) },
  { id: 'com_msg_cer_wild', a: [18, 45], tags: ['track:COM_MESSENGER:certified'], w: 30, gap: 2,
    run: (s) => { const v = visitName(s); return { t: (v ? v + ' 쪽 황야에서 ' : '황야에서 ') + s.rng.pick(['사흘을 보냈습니다. 물이 이틀치였습니다.', '관측했습니다. 잔류 오리지늄 농도가 높았고, 보호복이 낡았습니다.', '재앙 꼬리를 쫓았습니다. 꼬리가 방향을 두 번 바꿨고, 노트에 두 번 적었습니다.']), k: 'note', fx: { hl: -2, cap: { arts: 0.02 } } }; } },
  { id: 'com_msg_cer_yan', a: [18, 60], tags: ['aff:COM_MSG_YAN'], w: 30, gap: 3,
    run: (s) => ({ t: '흠천감 소속이었습니다. 예보는 역법과 함께 고시되었고, 역법이 틀리면 전달자가 고쳤고 전달자가 틀리면 역법이 고쳤습니다.', k: 'note', fx: { standing: 2 } }) },
  { id: 'com_msg_cer_higashi', a: [18, 60], tags: ['aff:COM_MSG_HIGASHI'], w: 30, gap: 3,
    run: (s) => ({ t: '신사에서 양성된 전달자였습니다. 경보 전에 참배가 있었고, 참배 뒤에 장비 점검이 있었습니다. 순서는 바꾸지 않았습니다.', k: 'note', fx: { standing: 2 } }) },
  { id: 'com_msg_cer_columbia', a: [18, 60], tags: ['aff:COM_MSG_COLUMBIA'], w: 30, gap: 3,
    run: (s) => ({ t: '기업 제휴 전달자였습니다. 예보에 회사 상표가 붙어 나갔습니다. 틀리면 회사가 사과했고, 사과 다음 날 저에게 통지가 왔습니다.', k: 'note', fx: { money: medX(s, 0.2), standing: 1 } }) },
  { id: 'com_msg_cer_kazimierz', a: [18, 60], tags: ['aff:COM_MSG_KAZIMIERZ'], w: 30, gap: 3,
    run: (s) => ({ t: '월간 예보를 냈습니다. 기술 기업 제휴였고, 예보지는 경기 일정표 옆에 실렸습니다. 사람들은 경기 일정을 먼저 읽었습니다.', k: 'note', fx: { money: medX(s, 0.15) } }) },
  { id: 'com_msg_cer_rim', a: [18, 60], tags: ['aff:COM_MSG_RIM'], w: 30, gap: 3,
    run: (s) => ({ t: '광산팀 컨설턴트였습니다. 재앙이 지나간 발굴 현장에 먼저 들어갔습니다. 광상 조사였고, 조사비는 광산 회사가, 위험은 제가 맡았습니다.', k: 'bad', fx: { money: medX(s, 0.4), hl: -3 } }) },
  { id: 'com_msg_cer_siesta', a: [18, 60], tags: ['aff:COM_MSG_SIESTA'], w: 30, gap: 3,
    run: (s) => ({ t: '시 고용 전달자였습니다. 축제 기간에는 경보를 내지 말라는 말이 돌았습니다. 돌기만 했는지는 그해 축제가 끝나고 알았습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'com_msg_emp_salary', a: [22, 55], tags: ['track:COM_MESSENGER:employed'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['기관 고용이 되었습니다. 월급이 생겼고, 장비는 여전히 사비였습니다.', '경험 많은 전달자 밑에서 분업했습니다. 저는 관측, 그 사람은 판단. 판단이 틀리면 둘 다 책임이었습니다.', '제한구역 통행증이 갱신되었습니다. 갱신 도장이 ' + s.rng.ri(4, 11) + '개였습니다. 도장 수가 경력이었습니다.']), k: 'ev', fx: { money: medX(s, 0.3), standing: 2 }, f: msgF('통행증 갱신 대장', s.year) }) },
  { id: 'com_msg_emp_cc', a: [22, 55], tags: ['track:COM_MESSENGER:employed'], w: 25, gap: 4,
    run: (s) => ({ t: '긴급 계약 플랫폼에 등록했습니다. 전달자들이 세운 통신망이었습니다. 용병 연결 게시판이 있었고, 그 게시판은 보지 않기로 했습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }) },
  { id: 'com_msg_emp_blame', a: [22, 55], tags: ['track:COM_MESSENGER:employed'], w: 25, gap: 3,
    run: (s) => ({ t: '재앙이 예보 구역 밖에 떨어졌습니다. 피해는 그쪽이었고, 비난은 이쪽이었습니다. 기관이 "예측 범위 밖"이라는 문장을 냈고, 저는 그 문장을 받아쓰지 않았습니다.', k: 'bad', fx: { standing: -4, h: -3 } }) },
  { id: 'com_msg_chief_seat', a: [30, 70], tags: ['track:COM_MESSENGER:chief'], w: 50, gap: 2,
    run: (s) => ({ t: '수석 전달자가 되었습니다. ' + s.rng.pick(['예보에 제 서명이 나갔습니다. 틀리면 서명한 사람 이름이 신문에 났습니다.', '수습 셋을 받았습니다. 첫 수업은 관측 노트 첫 장에 제 글씨를 써 주는 것이었습니다.']), k: 'big', fx: { standing: 4 } }) },
  { id: 'com_msg_chief_infected', a: [30, 70], tags: ['track:COM_MESSENGER:chief', 'infected'], w: 25, gap: 3,
    run: (s) => ({ t: '전달자 중에 결정이 없는 사람이 드물었습니다. 황야에서 보낸 해가 손등에 적혀 있었습니다. 제 손등도 그랬습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'com_msg_bridgid', a: [16, 60], tags: ['track:COM_MESSENGER'], w: 6, c: (s) => canonOk(s, 'bridgid'),
    run: (s) => { canonSee(s); return { t: '유목민 소녀 전달자가 장례 행렬 맨 앞에서 편지 꾸러미를 안고 걷는 것을 황야 길에서 보았습니다. 같은 노트를 들고 있었습니다.', k: 'note' }; } },
  { id: 'com_msg_after_disgrace', a: [16, 70], w: 50, c: (s) => afterFall(s, 'COM_MESSENGER', 'disgrace'),
    run: (s) => ({ t: '전달자 자격이 정지되었습니다. 부패 연루라고 했습니다. 노트는 반납하지 않아도 되었고, 통행증은 반납했습니다.', k: 'bad', fx: { h: -4 } }) },

  // ── COM_CC 긴급 계약 플랫폼 ──
  { id: 'com_cc_reg', a: [18, 55], tags: ['track:COM_CC:registered'], w: 50, gap: 2,
    run: (s) => ({ t: '긴급 계약 플랫폼에 등록했습니다. 게시판에 의뢰가 올라왔고, 의뢰 옆에 의뢰인 이름은 없었습니다.', k: 'ev', fx: { cap: { ties: 0.02 } } }) },
  { id: 'com_cc_con', a: [18, 60], tags: ['track:COM_CC:contract'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['계약을 수행했습니다. 재앙 지대 조사였습니다. 보수는 플랫폼이 중개했고, 수수료가 먼저 빠졌습니다.', '계약 하나가 용병 연결이었습니다. 받지 않았습니다. 받은 사람이 평판 순위에서 저를 앞질렀습니다.']), k: 'note', fx: { money: medX(s, 0.4) } }) },
  { id: 'com_cc_rep', a: [20, 65], tags: ['track:COM_CC:reputation'], w: 50, gap: 2,
    run: (s) => ({ t: '플랫폼 평판이 올라갔습니다. 의뢰가 먼저 왔고, 의뢰 중에 "살인청부"라는 말이 돌려 적힌 것이 있었습니다. 신고했습니다. 플랫폼은 "검토"라고 답했습니다.', k: 'note', fx: { standing: 3, h: -1 } }) },
  { id: 'com_cc_coord', a: [25, 70], tags: ['track:COM_CC:coordinator'], w: 50, gap: 2,
    run: (s) => ({ t: '조정 역할을 맡았습니다. 의뢰를 거르는 자리였습니다. 거른 의뢰가 다른 조정자를 거쳐 올라오는 것을 보았고, 그 조정자 이름을 적어 두었습니다.', k: 'big', fx: { standing: 4 } }) },

  // ════════════════════════════════════════════════════════════════════
  // COM_BLACKSTEEL 블랙스틸 월드와이드 + COM_BLACKSTEEL_EXCHANGE 교환 프로그램
  // ════════════════════════════════════════════════════════════════════
  { id: 'com_bsw_tra_center', a: [16, 35], tags: ['track:COM_BLACKSTEEL:trainee'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['훈련생으로 들어갔습니다. 전투 경험이 없는 사람 중심이라고 했고, 저도 없었습니다.', '2년 훈련 중 첫해였습니다. 같은 기수 넷 중 셋이 떨어진다는 말을 첫날 들었습니다.']), k: 'ev', fx: { cap: { skill: 0.04 } } }) },
  { id: 'com_bsw_op_dispatch', a: [18, 50], tags: ['track:COM_BLACKSTEEL:operator'], w: 50, gap: 2,
    run: (s) => { const v = visitName(s); return { t: (v ? v + ' 파견이 ' : '파견이 ') + s.rng.pick(['넉 달이었습니다. 돌아오니 계절이 바뀌어 있었습니다.', '위탁 계약이었습니다. 회사가 중개했고, 실패하면 "비상 계획"이 있다고 했습니다. 비상 계획이 무엇인지는 성공해서 몰랐습니다.']), k: 'ev', fx: { standing: 2, money: medX(s, 0.4) } }; } },
  { id: 'com_bsw_op_rules', a: [18, 50], tags: ['track:COM_BLACKSTEEL:operator', 'infected'], w: 30, gap: 3,
    run: (s) => ({ t: '감염자 규칙 다섯 조항을 다시 읽었습니다. 경증은 팀 작전 제한, 중증은 계약 해지. 제 수치가 어느 조항인지 알고 있었습니다.', k: 'bad', fx: { h: -3 } }) },
  { id: 'com_bsw_op_liskarm', a: [18, 50], tags: ['track:COM_BLACKSTEEL'], w: 8, c: (s) => canonOk(s, 'liskarm'),
    run: (s) => { canonSee(s); return { t: '파견지에서 한 오퍼레이터가 동료 둘의 짐까지 들고 먼저 차에 오르는 것을 보았습니다. 같은 회사였고, 이름은 묻지 않았습니다.', k: 'note', fx: { cap: { skill: 0.01 } } }; } },
  { id: 'com_bsw_lead_team', a: [22, 50], tags: ['track:COM_BLACKSTEEL:lead'], w: 50, gap: 2,
    run: (s) => ({ t: '팀장이 되었습니다. 파견 명단을 짰습니다. 명단에서 빠진 사람이 회계 부서로 갔고, 회계 부서는 "어카운턴트"라고 불렸습니다.', k: 'ev', fx: { standing: 3 } }) },
  { id: 'com_bsw_cadre_desk', a: [28, 55], tags: ['track:COM_BLACKSTEEL:cadre'], w: 50, gap: 2,
    run: (s) => ({ t: '부서 간부가 되었습니다. 고객이 감염자 오퍼레이터를 기피한다는 보고서가 올라왔습니다. 계약이 줄었고, 보고서는 두꺼워졌습니다.', k: 'big', fx: { standing: 4 } }) },
  // ── 교환 프로그램 ──
  { id: 'com_bsx_sig_papers', a: [18, 50], tags: ['track:COM_BLACKSTEEL_EXCHANGE:signed'], w: 50, gap: 2,
    run: (s) => ({ t: '협력 합의서와 치료 동의서에 서명했습니다. ' + s.rng.pick(['두 서류의 서명란이 같은 줄에 있었습니다.', '인사부에서 함께 가겠다는 동료와 다퉜습니다. 결국 같이 갔습니다.', '회사 쪽 서명과 로도스 쪽 서명이 같은 날 찍혔습니다. 도장이 달랐고, 날짜는 같았습니다.']), k: 'ev', fx: { standing: 2 }, f: bswF('교환 프로그램 합의서') }) },
  { id: 'com_bsx_sig_aim', a: [18, 50], tags: ['track:COM_BLACKSTEEL_EXCHANGE:signed'], w: 30, gap: 3,
    run: (s) => ({ t: '프로그램의 조건은 보안·호위 서비스와 치료의 교환이었습니다. 어느 쪽이 더 큰지는 계산하지 않기로 두 회사가 합의했다고 했습니다.', k: 'note' }) },
  { id: 'com_bsx_dis_ship', a: [18, 55], tags: ['track:COM_BLACKSTEEL_EXCHANGE:dispatched'], w: 50, gap: 2,
    run: (s) => ({ t: '로도스 파견이었습니다. ' + s.rng.pick(['협력 계약 카드를 받았습니다. 회사 신분증과 같이 목에 걸었고, 둘이 부딪히는 소리가 났습니다.', '호위 임무에 나갔습니다. 저쪽 팀과 같은 차였고, 무전은 따로였습니다.', '회사 보고서를 썼습니다. 로도스 쪽은 보고서를 요구하지 않았고, 그것이 더 쓰기 어려웠습니다.']), k: 'ev', fx: { standing: 2, hl: -1 } }) },
  { id: 'com_bsx_dis_treat', a: [18, 55], tags: ['track:COM_BLACKSTEEL_EXCHANGE:dispatched', 'infected'], w: 35, gap: 2,
    run: (s) => ({ t: '치료를 받았습니다. 회사 규칙 다섯 조항이 여기서는 적용되지 않았습니다. 밴드가 수치를 읽어 주었고, 읽어 주는 것이 처음이었습니다.', k: 'warm', fx: { h: 3 } }) },
  { id: 'com_bsx_dis_info', a: [18, 55], tags: ['aff:COM_BSX_INFO'], w: 25, gap: 4,
    run: (s) => ({ t: '정보 교환이 제 몫이었습니다. 회사가 아는 것과 로도스가 아는 것을 서로 넘겼습니다. 넘기지 않은 것도 있었고, 양쪽 다 그것을 알고 있었습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }) },
  { id: 'com_bsx_dis_tech', a: [18, 55], tags: ['aff:COM_BSX_TECH'], w: 25, gap: 4,
    run: (s) => ({ t: '기술 고문으로 파견되었습니다. 엔지니어링부가 회사 장비를 뜯어 보았고, 뜯은 것을 더 잘 조립해 돌려주었습니다.', k: 'note', fx: { cap: { learn: 0.03 } } }) },
  { id: 'com_bsx_end_done', a: [18, 60], tags: ['track:COM_BLACKSTEEL_EXCHANGE:ended'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['치료가 끝났습니다. 밴드를 풀었고, 회사로 돌아갈 날짜가 통지되었습니다.', '계약이 만료되었습니다. 협력 계약 카드를 반납했습니다. 회사 신분증만 남았고, 목이 가벼웠습니다.']), k: 'note', fx: { h: 1 } }) },
  { id: 'com_bsx_end_refused', a: [18, 60], tags: ['track:COM_BLACKSTEEL_EXCHANGE:ended'], w: 25, gap: 4,
    run: (s) => ({ t: '퇴사 신청이 회사에서 승인되지 않았습니다. 형식상 회사 소속으로 남았고, 형식상 로도스에 있었습니다. 둘 다 월급을 주지는 않았습니다.', k: 'note', fx: { h: -1 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 용병 시장 — COM_MERC_TEAM 소규모 용병 팀 (핵심) + PMC·세력 고용·현상금
  // ════════════════════════════════════════════════════════════════════
  { id: 'com_mt_mem_join', a: [12, 40], tags: ['track:COM_MERC_TEAM:member'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['소규모 팀에 들어갔습니다. 열 명이 안 되었고, 계약 하나에 한 명씩 줄었습니다.', '첫 계약은 의뢰인 보상형이었습니다. 보상은 의뢰인이 정했고, 의뢰인은 짰습니다.', '장비는 전 팀원 것이었습니다. 이름표는 떼어 두었습니다.']), k: 'ev', fx: { standing: 2 } }) },
  { id: 'com_mt_mem_bereaved', a: [12, 40], tags: ['track:COM_MERC_TEAM:member'], w: 30, gap: 3,
    run: (s) => ({ t: '동료 하나가 돌아오지 않았습니다. 유족 배상 항목은 계약서에 없었습니다. ' + (s.S.race === 'sarkaz' ? '살카즈 팀을 쓰는 이유가 그것이라고 고용주 쪽 사람이 말했습니다.' : '없는 항목은 대장이 제 몫에서 떼어 보냈습니다.'), k: 'bad', fx: { h: -3, money: -medX(s, 0.05) } }) },
  { id: 'com_mt_mem_pay', a: [12, 40], tags: ['track:COM_MERC_TEAM:member'], w: 30, gap: 2,
    run: (s) => ({ t: '보수를 받았습니다. ' + s.rng.pick(['통화였습니다. 처음이었습니다.', '순금 조각이었습니다. 무게를 재는 사람이 따로 있었습니다.', '오리아이언 파편이었습니다. 카즈델 밖에서는 바꿔 주는 데가 드물었습니다.']), k: 'note', fx: { money: medX(s, 0.2) } }) },
  { id: 'com_mt_all_merge', a: [14, 50], tags: ['track:COM_MERC_TEAM:alliance'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['팀끼리 연합했습니다. 대장이 둘이었고, 보수 배분표가 두 장이었습니다.', '연합 계약이 왔습니다. 큰 의뢰였고, 큰 의뢰는 돌아오는 수가 적었습니다.', '다른 팀 사람들과 같은 불 앞에 앉았습니다. 서로 이름을 묻지 않았습니다. 다음 계약에서 적일 수도 있었으니까요.']), k: 'ev', fx: { standing: 2, money: medX(s, 0.3) } }) },
  { id: 'com_mt_all_rhodes_aff', a: [14, 50], tags: ['aff:COM_MT_RHODES'], w: 30, gap: 3,
    run: (s) => { s.S.flags.rhodes_operation = s.S.age; return { t: '로도스 협력형 계약이었습니다. 보수의 반이 치료였습니다. 작전 뒤 저쪽 의무병이 팀원 손을 하나하나 보았고, 이름을 적어 갔습니다.', k: 'note', fx: { h: 1, hl: 1 } }; } },
  { id: 'com_mt_pat_noble', a: [16, 55], tags: ['track:COM_MERC_TEAM:patron'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['귀족 고용이었습니다. 보수는 좋았고, 명령은 설명이 없었습니다.', '외부 후원이 붙었습니다. 후원자 이름은 끝까지 듣지 못했고, 돈은 제때 왔습니다.', '고용주가 계약서에서 유족 배상 항목을 지웠습니다. 지운 자리에 서명했습니다.']), k: 'ev', fx: { money: medX(s, 0.6), standing: 2 } }) },
  { id: 'com_mt_pat_banner', a: [16, 55], tags: ['aff:COM_MT_BANNER'], w: 30, gap: 3,
    run: (s) => ({ t: '깃발 편입형이었습니다. 보급이 왔고 명령도 왔습니다. 보급이 명령보다 늦는 달에는 팀이 흔들렸습니다.', k: 'note', fx: { standing: 1 } }) },
  { id: 'com_mt_fac_absorb', a: [18, 60], tags: ['track:COM_MERC_TEAM:faction'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['세력에 편입되었습니다. 병사가 되었습니다. 계약서 대신 명령서였고, 보수 대신 배급이었습니다.', '팀 이름이 부대 번호로 바뀌었습니다. 대장은 하사가 되었고, 하사는 대장보다 할 수 있는 일이 적었습니다.']), k: 'ev', fx: { standing: 2, money: medX(s, 0.2) } }) },
  { id: 'com_mt_fac_disband', a: [18, 60], tags: ['track:COM_MERC_TEAM:faction'], w: 25, gap: 4,
    run: (s) => ({ t: '세력이 해산했습니다. 부대 번호가 없어졌고, 팀 이름은 돌아오지 않았습니다. 남은 사람끼리 다시 팀을 꾸렸습니다. 셋이었습니다.', k: 'bad', fx: { h: -3, standing: -3 } }) },
  { id: 'com_mt_after_injured', a: [12, 70], w: 50, c: (s) => afterFall(s, 'COM_MERC_TEAM', 'injured'),
    run: (s) => ({ t: '다쳐서 팀을 나왔습니다. 배상은 없었고, 대장이 보수에서 한 몫을 더 쥐여 주었습니다. 배상은 아니라고 했습니다.', k: 'bad', fx: { h: -3 } }) },
  // ── COM_MERC_PMC 기업 PMC ──
  { id: 'com_pmc_tra', a: [16, 35], tags: ['track:COM_MERC_PMC:trainee'], w: 50, gap: 2,
    run: (s) => ({ t: '기업 PMC 연습생이 되었습니다. 회사 이름은 길었고, 훈련장 이름은 번호였습니다. 글을 모르는 연습생이 반이었고, 회사는 상관하지 않았습니다.', k: 'ev', fx: { cap: { skill: 0.03 } } }) },
  { id: 'com_pmc_op', a: [18, 50], tags: ['track:COM_MERC_PMC:operator'], w: 50, gap: 2,
    run: (s) => { const v = visitName(s); return { t: (v ? v + ' 쪽 ' : '') + s.rng.pick(['호위 계약이었습니다. 호위 대상은 트럭 ' + s.rng.ri(3, 12) + '대였고, 트럭 안은 묻지 않았습니다.', '국경 계약이었습니다. 어느 쪽 국경인지는 계약서 첫 줄에만 있었습니다.']), k: 'ev', fx: { money: medX(s, 0.4), hl: -1 }, f: F('기업 PMC 계약 대장, ' + s.year + '년') }; } },
  { id: 'com_pmc_lead', a: [22, 50], tags: ['track:COM_MERC_PMC:lead'], w: 50, gap: 2,
    run: (s) => ({ t: '팀장이 되었습니다. 감염 판정이 난 팀원을 회사 규정대로 해지해야 했습니다. 해지했습니다. 결과만 적습니다.', k: 'bad', fx: { standing: 3, h: -3 } }) },
  { id: 'com_pmc_exec', a: [28, 60], tags: ['track:COM_MERC_PMC:exec'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['임원이 되었습니다. 계약서를 쓰는 쪽이 되었고, 유족 배상 항목을 넣을지 말지를 제가 정했습니다. 넣었습니다. 값은 작게.', '회사를 차렸습니다. 이름은 짧게 지었습니다. 긴 이름은 돈이 든다는 것을 알고 있었습니다.']), k: 'big', fx: { standing: 4, money: medX(s, 1.5) } }) },
  // ── COM_MERC_STATE 세력 고용 용병 ──
  { id: 'com_ms_hired', a: [16, 45], tags: ['track:COM_MERC_STATE:hired'], w: 50, gap: 2,
    run: (s) => ({ t: '세력이 고용했습니다. ' + s.rng.pick(['공작이었습니다. 보수는 공작령 돈이었고, 공작령 밖에서는 쓰기 어려웠습니다.', '반군이었습니다. 보수는 약속이었고, 약속은 이기면 지켜진다고 했습니다.', '어느 영주였습니다. 공식 경비병 제복을 입혔습니다. 경비병이 아니라는 것을 입은 사람만 알았습니다.']), k: 'ev', fx: { money: medX(s, 0.3), standing: 2 } }) },
  { id: 'com_ms_occ', a: [17, 50], tags: ['track:COM_MERC_STATE:occupation'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['점령지에 섰습니다. 점령군 급여가 나왔고, 거리 사람들이 제복을 보고 길을 비켰습니다. 비키는 쪽이 아닌 것이 처음이었습니다.', '위장 경비 일이었습니다. 영주가 시키는 것은 경비가 아니었습니다. 결과만 적습니다.', '반군 편제에 들어갔습니다. 번호 대신 이름으로 불렀고, 이름이 줄었습니다.']), k: 'bad', fx: { money: medX(s, 0.3), h: -2, standing: 2 } }) },
  { id: 'com_ms_abs', a: [18, 55], tags: ['track:COM_MERC_STATE:absorbed'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['해산되었습니다. 급여는 마지막 달 것이 오지 않았습니다. 묻는 사람도 없었습니다.', '정규군에 흡수되었습니다. 계급장을 받았습니다. 계급장은 제일 아래였고, 용병 때보다 월급이 적었습니다.']), k: 'note', fx: { standing: 1, money: -medX(s, 0.1) } }) },
  // ── COM_BOUNTY 현상금 사냥꾼 ──
  { id: 'com_bty_ind', a: [16, 45], tags: ['track:COM_BOUNTY:independent'], w: 50, gap: 2,
    run: (s) => ({ t: '현상금 전단을 모았습니다. 첫 표적은 금액이 제일 작은 사람이었습니다. 작은 금액에도 이유가 있다는 것을 나중에 알았습니다.', k: 'ev', fx: { cap: { skill: 0.02 } } }) },
  { id: 'com_bty_hun', a: [17, 50], tags: ['track:COM_BOUNTY:hunter'], w: 50, gap: 2,
    run: (s) => { const v = visitName(s); return { t: (v ? v + '에서 ' : '') + s.rng.pick(['현상금을 받았습니다. 받는 창구가 세 정부 중 하나였고, 다른 둘은 같은 사람에게 반대 현상금을 걸고 있었습니다.', '표적이 먼저 저를 찾아왔습니다. 결과만 적습니다. 현상금은 받았습니다.']), k: 'bad', fx: { money: medX(s, 0.6), hl: -2 } }; } },
  { id: 'com_bty_fam', a: [20, 55], tags: ['track:COM_BOUNTY:famed'], w: 50, gap: 2,
    run: (s) => ({ t: '이름이 돌기 시작했습니다. 전단에 제 이름이 실리는 날이 올 거라고 동료가 말했습니다. 농담이었고, 반쯤이었습니다.', k: 'ev', fx: { standing: 3, money: medX(s, 0.5) } }) },
  { id: 'com_bty_hir', a: [22, 60], tags: ['track:COM_BOUNTY:hired'], w: 50, gap: 2,
    run: (s) => ({ t: '세력이 고용했습니다. 전단 대신 명단이었고, 명단에는 금액이 없었습니다. 월급이 있었습니다.', k: 'note', fx: { money: medX(s, 0.4), standing: 2 } }) },
  { id: 'com_bty_skadi', a: [18, 55], tags: ['track:COM_BOUNTY'], w: 6, c: (s) => canonOk(s, 'skadi'),
    run: (s) => { canonSee(s); return { t: '붉은 눈의 사냥꾼이 보급품을 받고도 아무 말 없이 바다 쪽으로 돌아서는 것을 보았습니다. 같은 일을 하는 사람이었고, 같은 일은 아닌 것 같았습니다.', k: 'note' }; } },
];

// ════════════════════════════════════════════════════════════════════
// 입구 트리거 — COM_* 는 classes 가 없어 전환·이벤트로만 들어간다. 거주국·역량·연도 조건 + 낮은 확률.
// ════════════════════════════════════════════════════════════════════
/** 진로가 없으면 enterTrack, 있으면 switchTrack(생업·회사원형에서만) */
function enterCom(s, id, via) {
  if (!s.S.track) return s.enterTrack(id, { via, how: 'enter' });
  if (['A10', 'A11'].includes(s.track.archetype) || (s.track.exits && s.track.exits.switch && s.track.exits.switch.includes(id))) return s.switchTrack(id);
  return false;
}
const canSwitch = (s) => !s.S.school && !s.S.serving && !s.S.prison && !s.S.retired && !s.S.rhodes && (!s.S.track || ['A10', 'A11'].includes(s.track.archetype));
export const entryEvents = [
  { id: 'com_entry_penguin', a: [16, 40], w: 3, gap: 6, c: (s) => s.year >= 1093 && ['lungmen', 'siracusa'].includes(s.S.cur) && canSwitch(s) && s.S.cap.ties >= -0.8 && s.rng.chance(0.3),
    run: (s) => { if (!enterCom(s, 'COM_PENGUIN', 'emperor_interview')) return { t: '배달 회사 모집 전단을 보았습니다. 사장 면접이라고 했습니다. 가지 않았습니다.', k: 'note' }; return { t: '배달 회사 모집 전단을 보고 찾아갔습니다. 사장이 직접 면접을 보았고, 질문은 커피 취향 하나였습니다. 합격이었습니다.', k: 'big', fx: { h: 2 } }; } },
  { id: 'com_entry_messenger', a: [16, 30], w: 3, gap: 6, c: (s) => canSwitch(s) && s.S.cap.arts >= 0.5 && s.S.cap.learn >= -0.8 && s.rng.chance(0.3),
    run: (s) => { if (!enterCom(s, 'COM_MESSENGER', 'certified')) return { t: '재앙 정보 전달자 양성 과정 공고를 보았습니다. 지원하지 않았습니다.', k: 'note' }; return { t: '재앙 정보 전달자 양성 과정에 들어갔습니다. 아츠 적성 검사를 통과했고, 관측 노트를 받았습니다.', k: 'big', fx: { h: 2 } }; } },
  { id: 'com_entry_blacksteel', a: [16, 30], w: 3, gap: 6, c: (s) => ['columbia', 'kazimierz', 'bolivar', 'sargon', 'leithanien'].includes(s.S.cur) && canSwitch(s) && s.S.cap.skill >= -0.8 && s.rng.chance(0.3),
    run: (s) => { if (!enterCom(s, 'COM_BLACKSTEEL', 'trainee')) return { t: '블랙스틸 모집센터 앞을 지났습니다. 전투 경험 없는 사람을 받는다고 했습니다. 들어가지 않았습니다.', k: 'note' }; return { t: '블랙스틸 모집센터에 들어갔습니다. 전투 경험이 없어도 된다고 했고, 2년 훈련이라고 했습니다.', k: 'big', fx: { h: 1 } }; } },
  { id: 'com_entry_merc_team', a: [12, 35], w: 3, gap: 6, c: (s) => ['kazdel', 'victoria', 'leithanien', 'columbia', 'sargon'].includes(s.S.cur) && canSwitch(s) && s.S.cap.skill >= -0.8 && s.S.q <= 2 && s.rng.chance(0.3),
    run: (s) => { if (!enterCom(s, 'COM_MERC_TEAM', 'joined')) return { t: '소규모 용병 팀이 사람을 구했습니다. 가지 않았습니다.', k: 'note' }; return { t: '소규모 용병 팀에 들어갔습니다. 계약 단위로 움직이는 팀이었고, 첫 계약은 다음 주였습니다.', k: 'big', fx: { h: -1 } }; } },
  { id: 'com_entry_bounty', a: [16, 40], w: 2, gap: 8, c: (s) => ['bolivar', 'kazimierz', 'columbia', 'siracusa'].includes(s.S.cur) && canSwitch(s) && s.S.cap.skill >= 0.5 && s.rng.chance(0.3),
    run: (s) => { if (!enterCom(s, 'COM_BOUNTY', 'independent')) return { t: '현상금 전단을 보았습니다. 보기만 했습니다.', k: 'note' }; return { t: '현상금 전단을 떼어 왔습니다. 첫 표적은 금액이 제일 작은 사람이었습니다.', k: 'big', fx: { h: -1 } }; } },
  { id: 'com_entry_merc_state', a: [16, 40], w: 4, gap: 6, tags: ['war'], c: (s) => canSwitch(s) && s.S.cap.skill >= -0.8 && s.rng.chance(0.3),
    run: (s) => { if (!enterCom(s, 'COM_MERC_STATE', 'faction_event')) return { t: '세력이 용병을 모았습니다. 줄에 서지 않았습니다.', k: 'note' }; return { t: '세력이 용병을 모았습니다. 줄에 섰고, 저녁에 제복이 나왔습니다.', k: 'big', fx: { h: -1 } }; } },
  { id: 'com_entry_cc', a: [18, 50], w: 2, gap: 8, c: (s) => !!s.S.track && !s.S.rhodes && !!s.S.track && ['A6', 'A9'].includes(s.track.archetype) && s.S.cap.ties >= -0.8 && s.rng.chance(0.2),
    run: (s) => { if (!s.switchTrack('COM_CC')) return { t: '긴급 계약 플랫폼 등록 안내를 받았습니다. 등록하지 않았습니다.', k: 'note' }; return { t: '긴급 계약 플랫폼에 등록했습니다. 전달자들이 세운 통신망이었고, 첫 의뢰가 그날 밤 올라왔습니다.', k: 'big' }; } },
  { id: 'com_entry_idol', a: [14, 28], w: 2, gap: 8, c: (s) => s.year >= 1093 && ['lungmen', 'higashi'].includes(s.S.cur) && canSwitch(s) && s.S.cap.arts >= -0.8 && s.S.innate && s.S.innate.looks >= 0.8 && s.rng.chance(0.3),
    run: (s) => { if (!enterCom(s, 'COM_PENGUIN_IDOL', 'contract')) return { t: '음반사 사람이 명함을 주었습니다. 연락하지 않았습니다.', k: 'note' }; return { t: '음반사 사람이 명함을 주었습니다. 배달 회사 사장이 운영하는 음반사였고, 계약서에 보호라는 말이 세 번 있었습니다.', k: 'big', fx: { h: 2 } }; } },
  { id: 'com_entry_pmc', a: [16, 35], w: 2, gap: 8, c: (s) => ['columbia', 'sargon', 'bolivar'].includes(s.S.cur) && canSwitch(s) && s.S.cap.skill >= -0.8 && s.S.q <= 3 && s.rng.chance(0.3),
    run: (s) => { if (!enterCom(s, 'COM_MERC_PMC', 'trainee')) return { t: '기업 PMC 연습생 모집 공고를 보았습니다. 지원하지 않았습니다.', k: 'note' }; return { t: '기업 PMC 연습생으로 들어갔습니다. 회사 이름은 길었고, 훈련장 이름은 번호였습니다.', k: 'big' }; } },
];
events.push(...entryEvents);

// ────────────────────────────────────────────────────────────────────────────
// 결정 (5)
// ────────────────────────────────────────────────────────────────────────────
export const decisions = {
  /** 펭귄 — 보수 자율 */
  com_penguin_pay: {
    tags: ['track:COM_PENGUIN'], gap: 4, once: false, at: 0.5,
    ok: (s) => !!s.S.track && s.S.track.stage >= 1 && s.rng.chance(0.3),
    build: (s) => ({ title: '원하는 만큼', body: '월급 칸이 비어 있었습니다. "원하는 만큼 적어라"가 회사 원칙이었습니다. 사장은 적힌 숫자를 보지 않고 서명한다고 했고, 본다는 말도 있었습니다.',
      choices: [
        { k: 'modest', label: '적당히 적는다', sub: '돈 +, 사장 호감 +', auto: 2 },
        { k: 'big', label: '크게 적는다', sub: '돈 ++, 사장 호감 −?', auto: 0.8 },
        { k: 'blank', label: '비워 둔다', sub: '돈 없음, 사장 호감 ++', auto: 0.6 }] }),
    apply: (s, k) => {
      if (k === 'modest') return { t: '적당히 적었습니다. 적은 대로 왔습니다. 사장은 아무 말도 하지 않았고, 다음 달 커피가 제 취향이었습니다.', k: 'note', fx: { money: medX(s, 0.4), standing: 3 } };
      if (k === 'big') { if (s.rng.chance(0.5)) return { t: '크게 적었습니다. 적은 대로 왔습니다. 사장은 서명하면서 저를 한 번 보았고, 그 뒤로 큰 일이 먼저 왔습니다.', k: 'note', fx: { money: medX(s, 1), standing: -4, hl: -1 } };
        return { t: '크게 적었습니다. 적은 대로 왔습니다. 사장은 서명하면서 웃었습니다. 이유는 모릅니다.', k: 'warm', fx: { money: medX(s, 1), standing: 2 } }; }
      return { t: '비워 두었습니다. 사장이 칸에 음표를 하나 그려 넣었습니다. 그달은 동료들이 밥을 샀습니다.', k: 'warm', fx: { standing: 6, h: 2, money: -medX(s, 0.05) } };
    },
  },
  /** 전달자 — 경보 발령 */
  com_msg_warn: {
    tags: ['track:COM_MESSENGER'], gap: 3, once: false, at: 0.5,
    ok: (s) => !!s.S.track && s.S.track.stage >= 1 && s.rng.chance(0.3),
    build: (s) => ({ title: '경보', body: '관측값이 경계에 걸렸습니다. 경보를 내면 도시가 하루 비고, 내지 않았는데 재앙이 오면 전달자 이름이 남습니다. 노트는 반반이었습니다.',
      choices: [
        { k: 'warn', label: '경보를 낸다', sub: '맞으면 신뢰 +, 틀리면 −', auto: 1.5 },
        { k: 'hold', label: '하루 더 본다', sub: '맞으면 신뢰 ++, 틀리면 −−', auto: 1 }] }),
    apply: (s, k) => {
      const comes = s.rng.chance(0.5);
      if (k === 'warn') return comes ? { t: '경보를 냈습니다. 재앙이 왔습니다. 도시는 비어 있었고, 아무도 고맙다고 하지 않았습니다. 맞으면 당연한 것이었습니다.', k: 'note', fx: { standing: 4 } }
        : { t: '경보를 냈습니다. 재앙은 오지 않았습니다. 하루 비운 값을 물어내라는 공문이 왔고, 협회가 대신 답했습니다.', k: 'bad', fx: { standing: -4, h: -2 } };
      return comes ? { t: '하루 더 보았습니다. 재앙이 왔습니다. 예보 구역 밖이었지만, 이름이 남는 것은 전달자였습니다.', k: 'bad', fx: { standing: -8, h: -4 } }
        : { t: '하루 더 보았습니다. 오지 않았습니다. 노트에 "경계, 발령 안 함"이라고 적었고, 다음 날 그 줄에 동그라미를 쳤습니다.', k: 'note', fx: { standing: 6 } };
    },
  },
  /** 블랙스틸 — 교환 프로그램 서명 */
  com_bsx_sign: {
    tags: ['track:COM_BLACKSTEEL'], once: true, at: 0.5,
    ok: (s) => !!s.S.track && s.year >= 1095 && s.S.track.stage >= 1 && !s.S.rhodes && (s.S.ori.known || s.rng.chance(0.3)) && s.rng.chance(0.4),
    build: (s) => ({ title: '교환 프로그램', body: '회사가 로도스 아일랜드와 교환 프로그램을 시작했습니다. 보안·호위 서비스를 보내고 치료를 받는 조건이었습니다. 파견자 명단에 빈 줄이 있었습니다.' + (s.S.ori.known ? ' 제 수치는 회사 규칙 몇 조항에 걸려 있었습니다.' : ''),
      choices: [
        { k: 'sign', label: '서명한다', sub: '로도스 파견, 소속 유지, 치료', auto: s.S.ori.known ? 2 : 0.8 },
        { k: 'no', label: '회사에 남는다', auto: 1 }] }),
    apply: (s, k) => {
      if (k !== 'sign') return { t: '명단에 이름을 적지 않았습니다. 적은 사람은 다음 달 함선에 올랐습니다.', k: 'note' };
      if (!s.switchTrack('COM_BLACKSTEEL_EXCHANGE')) return { t: '서명했지만 이번 기수 정원이 찼습니다.', k: 'note' };
      s.joinRhodes('agreement', { quiet: true });
      if (s.data.nationById.rhodes && s.S.cur !== 'rhodes') s.migrate('rhodes', 'rhodes', { papers: 'agreement', keepTrack: true, quiet: true });
      if (s.S.phase !== 'life') return false;
      return { t: '협력 합의서와 치료 동의서에 서명했습니다. 함선에 올랐습니다. 회사 신분증과 협력 계약 카드를 같이 목에 걸었습니다.', k: 'big', fx: { h: 2 } };
    },
  },
  /** 용병 시장 — 계약 4층 구조 프리셋 */
  com_merc_contract: {
    tags: ['track:COM_MERC_TEAM'], gap: 4, once: false, at: 0.5,
    ok: (s) => !!s.S.track && s.S.age >= 16 && s.S.track.stage >= 1 && s.rng.chance(0.35),
    build: (s) => ({ title: '다음 계약', body: '팀에 계약서 넷이 들어왔습니다. 기업 PMC 위탁, 의뢰인 보상 단기, 세력 고용, 로도스 협력. 보수 형태가 전부 달랐습니다. 통화, 순금, 배급, 치료.',
      choices: [
        { k: 'reward', label: '의뢰인 보상 단기', sub: '순금, 유족 배상 없음', auto: 1.5 },
        { k: 'pmc', label: '기업 PMC 위탁', sub: '통화, 감염 규칙 적용, PMC 진로로', auto: 0.8 },
        { k: 'state', label: '세력 고용', sub: '배급, 편입 위험, 세력 용병 진로로', auto: 0.8 },
        { k: 'rhodes', label: '로도스 협력', sub: '치료, 접점 생김', auto: s.S.ori.on ? 1.5 : 0.6 }] }),
    apply: (s, k) => {
      if (k === 'reward') { s.S.track.aff = 'COM_MT_REWARD'; return { t: '의뢰인 보상형에 서명했습니다. 순금 조각이 먼저 왔고, 조건은 나중에 왔습니다.', k: 'note', fx: { money: medX(s, 0.5) } }; }
      if (k === 'pmc') return s.switchTrack('COM_MERC_PMC') ? false : { t: '위탁 계약을 받으려 했지만 회사 쪽 심사에서 떨어졌습니다.', k: 'note' };
      if (k === 'state') return s.switchTrack('COM_MERC_STATE') ? false : { t: '세력 쪽 사람이 오지 않았습니다. 계약은 없던 일이 되었습니다.', k: 'note' };
      s.S.track.aff = 'COM_MT_RHODES'; s.S.flags.rhodes_operation = s.S.age;
      return { t: '로도스 협력 계약에 서명했습니다. 보수의 반이 치료였고, 작전 뒤에 저쪽 의무병이 팀원 손을 하나하나 보았습니다.', k: 'note', fx: { h: 1 } };
    },
  },
  /** 전달자 — 긴급 계약 플랫폼 부패 제안 */
  com_cc_corrupt: {
    tags: ['track:COM_CC'], gap: 5, once: false, at: 0.5,
    ok: (s) => !!s.S.track && s.S.track.stage >= 1 && s.rng.chance(0.15),
    build: (s) => ({ title: '게시판', body: '의뢰 하나가 "조사"라고 적혀 있었습니다. 읽어 보면 조사가 아니었습니다. 중개 수수료가 한 해치였습니다.',
      choices: [
        { k: 'no', label: '넘긴다', sub: '평판 +', auto: 2 },
        { k: 'take', label: '중개한다', sub: '돈 +, 발각 위험', auto: 0.5 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '넘겼습니다. 다른 조정자가 받았고, 그 사람 이름을 적어 두었습니다.', k: 'note', fx: { standing: 3 } };
      if (s.rng.chance(0.35)) { s.fall('arrest'); return false; }
      return { t: '중개했습니다. 돈은 한 해를 갔습니다. 게시판에서 그 의뢰는 지워졌고, 제 기억에서는 지워지지 않았습니다.', k: 'bad', fx: { money: medX(s, 1), h: -4 } };
    },
  },
};

export default { events, decisions };
