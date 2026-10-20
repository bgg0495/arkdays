// W9e 컬럼비아 진로 콘텐츠(v0.3 §11). 진로 15개의 단계별 이벤트·전환 서사·몰락 후일담·결정, 생업 계절 이벤트, 소속 변주, 캐논 인물 1회성,
// 이주 신참·방문국·로도스 접점. 태그는 track:<ID>:<stageId> 기준(W7 메모 §3). 공통 직장 이벤트는 archetype:A10 에만(§11.1).
// 톤: 담백한 "~했습니다"체(D25), 각주는 숫자가 있을 때만 세계관 안의 출처(D31), 조사는 text.js 유틸(D30). 무거운 결과는 장면 없이 결과만.
// 혼인·주거 결정 덮어쓰기(marry_<type>·home_change)는 W9E_OVERRIDES(국가별 build/apply)에 모아 두고 결정은 거주국으로 분기한다 — 다른 국가는 엔진 기본 문구.
import { makeName, familyNames } from '../../src/engine/names.js';
import { ENGINE_DECISIONS } from '../../src/engine/choices.js';
import { marry, familyOpposes } from '../../src/engine/marriage.js';
import { homeChangeOptions, setHousing } from '../../src/engine/housing.js';
import { cul, fest, F, orgF, lifeRoll, medX, poor, rich, eul, iga, eun, wa, ro, ieot } from '../_util.js';
import { hoist } from '../_dispatch.js';

// ────────────────────────────────────────────────────────────────────────────
// 도우미
// ────────────────────────────────────────────────────────────────────────────
const tr = (s) => s.S.track;
/** 지금도 그 진로(·단계)에 있는가 — 같은 해 앞선 이벤트로 진로가 끝났을 수 있어 run·ok 앞에서 다시 본다 */
const onT = (s, id, stage) => !!tr(s) && tr(s).id === id && (!stage || (!!s.stage && s.stage.id === stage));
/** 그 해 한 번만 굴리는 롤(결정 ok 는 두 번 평가된다) */
function yr(s, key, p) { const k = 'yr_' + key; const v = s.S.flags[k]; if (v && v.a === s.S.age) return v.ok; const ok = s.rng.chance(p); s.S.flags[k] = { a: s.S.age, ok }; return ok; }
/** 진로에 들어온 다음 해(진입 서사용) */
const entered = (s) => !!tr(s) && s.S.age - tr(s).since === 1 && tr(s).stageSince === tr(s).since;
/** 승급한 다음 해(전환 서사용) */
const promoted = (s) => !!tr(s) && tr(s).stage > 0 && s.S.age - tr(s).stageSince === 1 && tr(s).stageSince !== tr(s).since;
/** 그 진로에서 몰락한 직후(후일담용). 사망·강제 전환이면 진로가 바뀌어 있으므로 진로 없음만 본다 */
const fellFrom = (s, id) => !tr(s) && s.S.flags.lastTrack === id && s.S.flags.lastFallAt != null && s.S.age - s.S.flags.lastFallAt <= 1 && s.S.flags.lastTrackLeftAt === s.S.flags.lastFallAt;
const affName = (s, d) => (s.aff ? s.aff.name : d);
const someone = (s, sex) => makeName(s.data, s.rng, { lang: s.nation.nameLang, sex: sex || (s.rng.chance(0.5) ? 'M' : 'F'), race: s.S.race, avoid: familyNames(s.S) }).given;
const pick = (s, arr) => s.rng.pick(arr);
const fmt = (n) => Math.round(n).toLocaleString() + ' LMD';
const visitName = (s) => (s.res && s.res.itinerantAt && s.data.nationById[s.res.itinerantAt] ? s.data.nationById[s.res.itinerantAt].name : '파견지');
/** 캐논 인물(D43): 연도 범위 안, 생애 3명 이하, 1회 */
function canonOk(s, id) { const f = (s.data.canonFigures || []).find((x) => x.id === id); if (!f) return false; const y = s.year; return y >= f.years[0] && y <= f.years[1] && (s.S.flags.canonSeen || 0) < 3; }
function canonSeen(s) { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; }
/** 단계 이벤트 한 줄 */
const ev = (id, track, stage, a, w, gap, run, extra = {}) => ({ id, a, tags: ['track:' + track + ':' + stage], w, gap, run, ...extra, c: (s) => onT(s, track, stage) && (!extra.c || extra.c(s)) });
/** 단계 전환 서사: 승급 다음 해에 그 단계 문장 */
const transition = (id, track, map) => ({ id, a: [10, 90], tags: ['track:' + track], w: 90, c: (s) => promoted(s) && !!map[s.stage.id], run: (s) => ({ t: map[s.stage.id](s), k: 'ev', fx: { h: 2 } }) });
/** 진입 서사: 들어온 다음 해 */
const entry = (id, track, run) => ({ id, a: [5, 90], tags: ['track:' + track], w: 90, c: entered, run });
/** 몰락 후일담: 원인별 한 문장. 사망이면 오지 않는다 */
const aftermath = (id, track, map) => ({ id, a: [5, 95], tags: [], w: 95, c: (s) => fellFrom(s, track) && !!map[s.S.flags.lastFall], run: (s) => ({ t: map[s.S.flags.lastFall](s), k: 'loss' }) });

// ────────────────────────────────────────────────────────────────────────────
// 이벤트
// ────────────────────────────────────────────────────────────────────────────
export const events = [
  // ══════════════════════════════════════════════════════════════════════════
  // 공통 직장 이벤트 — archetype:A10 에만(회사원·점원·변호사·기업 과두). 다른 원형에 붙이지 않는다
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'col_a10_overtime', a: [18, 64], tags: ['columbia', 'archetype:A10'], w: 30, gap: 2,
    run: (s) => ({ t: pick(s, ['야근이 석 달째였습니다. 사무실 불이 꺼지는 시간이 집 불이 켜지는 시간이 되었습니다.', '분기 마감이었습니다. 주말이 없었고, 월요일에 아무도 그 말을 하지 않았습니다.', '퇴근 카드를 찍고 다시 자리에 앉았습니다. 기록에는 퇴근으로 남았습니다.']), k: 'ev', fx: { hl: -2, standing: 3 } }) },
  { id: 'col_a10_boss', a: [18, 64], tags: ['columbia', 'archetype:A10'], w: 25, gap: 3,
    run: (s) => ({ t: pick(s, ['상사가 바뀌었습니다. 새 상사는 숫자부터 물었고, 이름은 나중에 물었습니다.', '상사가 회의에서 제 안을 자기 안으로 말했습니다. 아무도 바로잡지 않았습니다.', '상사가 금요일마다 "가족 같은 회사"라고 했습니다. 토요일에도 전화가 왔습니다.']), k: 'note', fx: { h: -1 } }) },
  { id: 'col_a10_dinner', a: [18, 64], tags: ['columbia', 'archetype:A10'], w: 25, gap: 2,
    run: (s) => ({ t: pick(s, ['회식이 있었습니다. ' + wa(cul(s).food) + ' 함께 상사의 농담이 나왔고, 다들 같은 박자로 웃었습니다.', '팀 저녁이 있었습니다. 계산은 회사가 했고, 2차는 각자 냈습니다.', '송년회에서 올해의 사원 이름이 불렸습니다. 제 이름은 아니었습니다.']), k: 'ev', fx: { h: 1, cap: { ties: 0.02 } } }) },
  { id: 'col_a10_review', a: [18, 64], tags: ['columbia', 'archetype:A10'], w: 30, gap: 2,
    run: (s) => { const good = (tr(s) ? tr(s).standing : 50) >= 50; return { t: good ? '연말 고과가 나왔습니다. 윗줄이었습니다. 봉투는 얇았습니다.' : '연말 고과가 나왔습니다. 아랫줄이었습니다. 면담은 길지 않았습니다.', k: good ? 'ev' : 'bad', fx: good ? { h: 2, money: medX(s, 0.05) } : { h: -2 } }; } },
  { id: 'col_a10_layoff_rumor', a: [20, 64], tags: ['columbia', 'archetype:A10'], w: 15, gap: 4,
    run: (s) => ({ t: '구조조정 소문이 돌았습니다. 복도에서 말하는 사람은 없었고, 화장실에서는 모두 말했습니다.', k: 'note', fx: { h: -2 } }) },
  { id: 'col_a10_benefit', a: [18, 64], tags: ['columbia', 'archetype:A10'], w: 15, gap: 5,
    run: (s) => ({ t: '복리후생 안내서가 왔습니다. 단체 보험이 있었고, 광석병 조항은 제12조 작은 글씨였습니다.', k: 'note', f: F('보험협회 단체 특약 표준 약관 제12조') }) },

  // ══════════════════════════════════════════════════════════════════════════
  // COL_OFFICE 회사원(A10, 핵심) — staff / senior / manager / exec
  // ══════════════════════════════════════════════════════════════════════════
  entry('col_office_entry', 'COL_OFFICE', (s) => ({ t: ro(affName(s, '회사')) + ' 출근한 첫 주였습니다. 사원증 사진은 하루 전에 찍었고, 사진 속 얼굴이 제일 긴장해 있었습니다.', k: 'ev', fx: { h: 2 } })),
  ev('col_office_staff_badge', 'COL_OFFICE', 'staff', [18, 40], 30, 3, (s) => ({ t: '사원증이 목에 걸렸습니다. 출입문이 열리는 소리가 하루에 열두 번 났습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('col_office_staff_coffee', 'COL_OFFICE', 'staff', [18, 40], 30, 2, (s) => ({ t: ro(cul(s).drink) + ' 하루를 시작했습니다. 넷째 잔부터는 맛이 나지 않았습니다.', k: 'note' })),
  ev('col_office_staff_typo', 'COL_OFFICE', 'staff', [18, 40], 25, 3, (s) => ({ t: '보고서에서 숫자 하나가 틀렸습니다. 고치는 데 한 시간, 사과하는 데 하루가 걸렸습니다.', k: 'bad', fx: { h: -2, cap: { learn: 0.03 } } })),
  ev('col_office_staff_elevator', 'COL_OFFICE', 'staff', [18, 40], 20, 4, (s) => ({ t: '엘리베이터에서 임원과 둘이 탔습니다. 임원은 층 버튼만 보았고, 저는 바닥만 보았습니다.', k: 'note' })),
  ev('col_office_senior_junior', 'COL_OFFICE', 'senior', [21, 50], 30, 3, (s) => ({ t: '후임이 들어왔습니다. 제가 들었던 말을 그대로 했고, 그 말이 그렇게 들렸는지 처음 알았습니다.', k: 'ev', fx: { cap: { ties: 0.03 } } })),
  ev('col_office_senior_pay', 'COL_OFFICE', 'senior', [21, 50], 25, 3, (s) => ({ t: '야근 수당 기준이 바뀌었습니다. 수당은 줄었고, 야근은 그대로였습니다.', k: 'bad', fx: { money: -medX(s, 0.03) } })),
  ev('col_office_senior_project', 'COL_OFFICE', 'senior', [21, 50], 30, 2, (s) => ({ t: '프로젝트 하나를 혼자 맡았습니다. 끝나고 이름은 팀 이름으로 올라갔습니다.', k: 'ev', fx: { standing: 4, cap: { learn: 0.03 } } })),
  ev('col_office_senior_premium', 'COL_OFFICE', 'senior', [21, 50], 20, 4, (s) => ({ t: '급여 명세서에 보험료 공제 줄이 3줄 길어졌습니다. 회사 부담분은 1줄 짧아졌습니다.', k: 'note', f: F('보험협회 직장 가입자 요율표 ' + s.year + '년') })),
  ev('col_office_manager_list', 'COL_OFFICE', 'manager', [26, 60], 25, 4, (s) => ({ t: '감원 명단을 받았습니다. 제가 쓸 차례였습니다. 이름 셋을 적었고, 그날 저녁은 먹지 않았습니다.', k: 'bad', fx: { h: -4, standing: 3 } })),
  ev('col_office_manager_meeting', 'COL_OFFICE', 'manager', [26, 60], 30, 2, (s) => ({ t: '실적 회의였습니다. 그래프가 올라가면 제 덕이 아니었고, 내려가면 제 탓이었습니다.', k: 'ev', fx: { hl: -1, standing: 2 } })),
  ev('col_office_manager_client', 'COL_OFFICE', 'manager', [26, 60], 25, 3, (s) => ({ t: '거래처 접대가 있었습니다. 상대는 ' + eul(cul(s).food) + ' 반만 먹었고, 계약서는 다 읽었습니다.', k: 'ev', fx: { money: -medX(s, 0.04), standing: 2 } })),
  ev('col_office_manager_school', 'COL_OFFICE', 'manager', [30, 60], 20, 5, (s) => ({ t: '아이 학교에서 직업 소개를 해 달라고 했습니다. "매니저"라고 했더니 무엇을 관리하느냐고 물었습니다. 대답이 길어졌습니다.', k: 'warm', fx: { h: 2 } }), { c: (s) => s.S.fam.kids.some((k) => k.alive) }),
  ev('col_office_exec_board', 'COL_OFFICE', 'exec', [32, 70], 30, 2, (s) => ({ t: '이사회에 처음 들어갔습니다. 발언은 두 번, 기록은 한 장도 남기지 말라고 했습니다.', k: 'ev', fx: { standing: 3 } })),
  ev('col_office_exec_stock', 'COL_OFFICE', 'exec', [32, 70], 25, 3, (s) => ({ t: '주식 보상이 들어왔습니다. 월급의 30배였고, 팔 수 있는 날은 멀었습니다.', k: 'ev', fx: { money: medX(s, 0.8) }, f: F('연방 증권위원회 임원 보수 공시, ' + s.year + '년') })),
  ev('col_office_exec_charity', 'COL_OFFICE', 'exec', [32, 70], 20, 4, (s) => ({ t: '회사 이름으로 감염자 지원 기금 행사에 갔습니다. 사진을 찍었고, 기금의 숫자는 사진보다 작았습니다.', k: 'note' })),
  ev('col_office_exec_rival', 'COL_OFFICE', 'exec', [32, 70], 20, 4, (s) => ({ t: '경쟁사에서 자리를 제안했습니다. 거절했고, 거절한 사실을 회사가 알게 했습니다.', k: 'ev', fx: { standing: 5 } })),
  transition('col_office_transition', 'COL_OFFICE', {
    senior: (s) => '주임이 되었습니다. 명함이 바뀌었고, 책상은 그대로였습니다.',
    manager: (s) => '매니저가 되었습니다. 방 대신 칸막이가 높아졌고, 회의가 하루 셋이 되었습니다.',
    exec: (s) => '임원이 되었습니다. 전용 주차 자리와 비서가 생겼고, 집에 가는 시간은 더 늦어졌습니다.',
  }),
  aftermath('col_office_after', 'COL_OFFICE', {
    layoff: (s) => '해고 통지를 받았습니다. 상자 하나에 짐을 담았고, 사원증은 출입문에서 더 열리지 않았습니다.',
    infected: (s) => '판정이 나자 회사는 법대로 했습니다. 자리는 남았고, 일은 사라졌고, 보험료 청구서가 먼저 왔습니다.',
    overwork: (s) => '쓰러져 실려 갔습니다. 돌아왔을 때 책상은 비어 있었습니다.',
  }),
  { id: 'col_off_bank_vault', a: [18, 64], tags: ['aff:COL_OFF_BANK'], w: 20, gap: 4,
    run: (s) => ({ t: '은행 금고 점검 날이었습니다. 금 증서 다발을 세는 동안 제 월급이 몇 장인지 계산하지 않으려 애썼습니다.', k: 'note' }) },
  { id: 'col_off_raythean_oath', a: [18, 64], tags: ['aff:COL_OFF_RAYTHEAN'], w: 20, gap: 5,
    run: (s) => ({ t: '보안 서약서를 다시 썼습니다. 어느 층에 무엇이 있는지 묻지 않는 것이 승진 조건이었습니다.', k: 'note', fx: { standing: 2 } }) },
  { id: 'col_off_tech_launch', a: [18, 64], tags: ['aff:COL_OFF_TECH'], w: 20, gap: 4,
    run: (s) => ({ t: '신제품 발표일이었습니다. 무대 위에서 "미래"라는 말이 아홉 번 나왔고, 무대 뒤에서는 버그 목록이 한 장 더 늘었습니다.', k: 'ev', fx: { hl: -1 } }) },

  // ══════════════════════════════════════════════════════════════════════════
  // COL_RHINE 라인 랩 연구원(A9, 핵심) — intern / researcher / director / board
  // ══════════════════════════════════════════════════════════════════════════
  entry('col_rhine_entry', 'COL_RHINE', (s) => ({ t: ro(affName(s, '라인 랩')) + ' 들어간 첫 해였습니다. 흰색 출입증을 받았고, 복도의 문 절반은 그 색으로 열리지 않았습니다.', k: 'ev', fx: { h: 2 } })),
  ev('col_rhine_intern_badge', 'COL_RHINE', 'intern', [20, 35], 30, 3, (s) => ({ t: '출입증 색으로 사람을 보게 되었습니다. 주황색이 지나가면 길을 비켰습니다.', k: 'note' })),
  ev('col_rhine_intern_dawn', 'COL_RHINE', 'intern', [20, 35], 30, 2, (s) => ({ t: '연구 보조의 하루는 아침 8시에 시작해 다음 날 새벽 3시에 끝났습니다. 그 사이에 식사는 한 번이었습니다.', k: 'bad', fx: { hl: -3, cap: { learn: 0.04 } }, f: F('라인 랩 연구 보조 근무 지침서 제4항') })),
  ev('col_rhine_intern_courier', 'COL_RHINE', 'intern', [20, 35], 20, 4, (s) => ({ t: '보급품은 택배로 왔습니다. 옆 섹션 사람의 얼굴은 한 번도 보지 못했고, 이름은 송장에서만 보았습니다.', k: 'note' })),
  ev('col_rhine_intern_gear', 'COL_RHINE', 'intern', [20, 35], 25, 3, (s) => ({ t: '보호장비 없이 오염 구역에 들어가라는 말을 들었습니다. 들어갔고, 그날은 아무 일도 없었습니다.', k: 'bad', fx: { h: -2, standing: 3 } })),
  ev('col_rhine_res_orange', 'COL_RHINE', 'researcher', [22, 50], 30, 3, (s) => ({ t: '주황색 출입증을 받았습니다. 열리는 문이 늘었고, 묻지 말아야 하는 것도 늘었습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('col_rhine_res_paper', 'COL_RHINE', 'researcher', [22, 50], 30, 2, (s) => ({ t: '논문이 나갔습니다. 저자 줄에서 제 이름은 넷째였고, 셋째는 한 번도 실험실에 오지 않은 사람이었습니다.', k: 'ev', fx: { cap: { learn: 0.05 }, standing: 3 } })),
  ev('col_rhine_res_rivalry', 'COL_RHINE', 'researcher', [22, 50], 25, 3, (s) => ({ t: '섹션 사이 예산 경쟁이 있었습니다. 복도에서 인사는 했고, 자료는 주지 않았습니다.', k: 'note', fx: { h: -1 } })),
  ev('col_rhine_res_missing', 'COL_RHINE', 'researcher', [22, 50], 20, 4, (s) => ({ t: '옆 자리 연구원이 출근하지 않았습니다. 사직이라고 했고, 짐은 그대로였습니다.', k: 'bad', fx: { h: -2 } })),
  ev('col_rhine_dir_budget', 'COL_RHINE', 'director', [28, 65], 30, 2, (s) => ({ t: '섹션 예산을 따냈습니다. 금액은 적지 않았고, 조건은 두 장이었습니다.', k: 'ev', fx: { standing: 3 } })),
  ev('col_rhine_dir_defense', 'COL_RHINE', 'director', [28, 65], 25, 3, (s) => ({ t: '국방부 쪽 손님이 왔습니다. 발표는 삼십 분, 질문은 하나였습니다. "언제 쓸 수 있습니까."', k: 'note', fx: { h: -1 } })),
  ev('col_rhine_dir_ethics', 'COL_RHINE', 'director', [28, 65], 30, 9, (s) => ({ t: '윤리 공동선언에 섹션장 자격으로 서명했습니다. 선언문은 2장이었고, 실험 일정표는 바뀌지 않았습니다.', k: 'note', f: F('라인 랩 윤리 공동선언, 1099년 12월') }), { c: (s) => s.year >= 1099 && s.year <= 1101 }),
  ev('col_rhine_dir_board_call', 'COL_RHINE', 'director', [28, 65], 20, 4, (s) => ({ t: '이사회에 불려 갔습니다. 열두 시간 전에 연락이 왔고, 발표 자료는 세 번 바뀌었습니다.', k: 'ev', fx: { hl: -1, standing: 2 } })),
  ev('col_rhine_board_dinner', 'COL_RHINE', 'board', [35, 75], 30, 3, (s) => ({ t: '열 사람이 앉는 저녁 자리에 갔습니다. 메뉴에 값이 없었고, 이야기에는 전부 값이 있었습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('col_rhine_board_sanction', 'COL_RHINE', 'board', [35, 75], 25, 4, (s) => ({ t: '연방 쪽에서 조용한 제재가 왔습니다. 공고는 없었고, 계좌 하나가 묶였습니다.', k: 'bad', fx: { money: -medX(s, 1.5), h: -2 } })),
  ev('col_rhine_board_share', 'COL_RHINE', 'board', [35, 75], 25, 3, (s) => ({ t: '지분 조정이 있었습니다. 숫자 하나가 바뀌었고, 그 숫자로 집 2채 값이 움직였습니다.', k: 'ev', fx: { money: medX(s, 2) }, f: F('연방 증권위원회 지분 변동 공시, ' + s.year + '년') })),
  ev('col_rhine_board_heir', 'COL_RHINE', 'board', [40, 75], 20, 5, (s) => ({ t: '후임 섹션장을 정하는 자리였습니다. 가장 뛰어난 사람과 가장 말이 없는 사람 중에서 골라야 했습니다.', k: 'note' })),
  transition('col_rhine_transition', 'COL_RHINE', {
    researcher: (s) => '연구원이 되었습니다. 출입증이 주황색으로 바뀌었고, 책상에 이름표가 붙었습니다.',
    director: (s) => '섹션장이 되었습니다. 방이 생겼고, 그 방에 오는 사람은 전부 돈 이야기를 했습니다.',
    board: (s) => '이사가 되었습니다. 실험복은 벽에 걸렸고, 다시 입을 일은 없었습니다.',
  }),
  aftermath('col_rhine_after', 'COL_RHINE', {
    accident: (s) => '실험 사고였습니다. 살아남았고, 보고서에는 "절차상 과실"이라고 적혔습니다. 연구소로는 돌아가지 못했습니다.',
    disappear: (s) => '어느 날부터 연구소 기록에서 제 이름이 지워져 있었습니다. 급여는 두 달 더 들어왔고, 그 뒤로는 아무 연락이 없었습니다.',
    infected: (s) => '판정이 나자 섹션장이 조용히 전출을 권했습니다. 권고였고, 거절할 자리는 없었습니다.',
  }),
  // 소속 변주: 섹션별
  { id: 'col_rhi_control', a: [20, 70], tags: ['aff:COL_RHI_CONTROL'], w: 20, gap: 4,
    run: (s) => ({ t: '통제 섹션 회의에서는 다른 섹션 이름이 먼저 나왔습니다. 모두의 예산이 이 방을 지나갔습니다.', k: 'note', fx: { standing: 2 } }) },
  { id: 'col_rhi_ecology', a: [20, 70], tags: ['aff:COL_RHI_ECOLOGY'], w: 20, gap: 4,
    run: (s) => ({ t: '생태 섹션 온실에서 하루를 보냈습니다. 식물 이름은 외웠고, 어디서 왔는지는 묻지 않았습니다.', k: 'ev', fx: { h: 1 } }) },
  { id: 'col_rhi_energy', a: [20, 70], tags: ['aff:COL_RHI_ENERGY'], w: 20, gap: 4,
    run: (s) => ({ t: '에너지 섹션 실험실에서 경보가 울렸습니다. 두 번 울렸고, 세 번째는 울리지 않게 꺼 두었습니다.', k: 'bad', fx: { hl: -1 } }) },
  { id: 'col_rhi_arts', a: [20, 70], tags: ['aff:COL_RHI_ARTS'], w: 20, gap: 4,
    run: (s) => ({ t: '아츠 섹션 실험대에 피험자가 앉았습니다. 서류상 자원자였습니다. 눈은 그렇게 말하지 않았습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'col_rhi_defense', a: [20, 70], tags: ['aff:COL_RHI_DEFENSE'], w: 20, gap: 4,
    run: (s) => ({ t: '방위 섹션 시험장에 갔습니다. 표적은 사람 모양이었고, 결과표는 숫자 모양이었습니다.', k: 'note', fx: { standing: 2 } }) },
  // 로도스 접점(referral): 의료 협정
  { id: 'col_rhine_rhodes_pact', a: [22, 60], tags: ['track:COL_RHINE', '!rhodes'], w: 8, gap: 8, c: (s) => !!tr(s) && tr(s).stage >= 1,
    run: (s) => { s.S.flags.rhodes_medical_pact = s.S.age; return { t: '로도스 아일랜드 의료부와 공동 연구 협정 서류를 주고받았습니다. 상대 쪽 연구원이 제 이름을 적어 갔습니다.', k: 'note' }; } },
  // 캐논 인물(D43): 1회성, 연도 게이트, 거리감
  { id: 'col_canon_saria', a: [20, 60], tags: ['track:COL_RHINE'], w: 30, c: (s) => canonOk(s, 'saria'),
    run: (s) => { canonSeen(s); return { t: '방위 섹션장이 사직서를 내고 나가던 날이었습니다. 연구동 복도의 불이 평소보다 일찍 꺼졌고, 아무도 이유를 묻지 않았습니다.', k: 'note' }; } },
  { id: 'col_canon_muelsyse', a: [20, 60], tags: ['track:COL_RHINE'], w: 30, c: (s) => canonOk(s, 'muelsyse'),
    run: (s) => { canonSeen(s); return { t: '생태 섹션장이 신입들 앞에서 유리잔의 물을 손으로 들어 올렸습니다. "이건 장난"이라고 했고, 신입들은 웃어야 할지 몰랐습니다.', k: 'note' }; } },
  { id: 'col_canon_dorothy', a: [18, 60], tags: ['columbia'], w: 30, c: (s) => canonOk(s, 'dorothy') && !!tr(s) && ['COL_RHINE', 'COL_UNIV'].includes(tr(s).id),
    run: (s) => { canonSeen(s); return { t: '세미나에서 최연소 입사라는 연구원이 질문을 받았습니다. 대답 대신 칠판을 두 번 채웠고, 질문한 사람은 앉았습니다.', k: 'note', fx: { cap: { learn: 0.02 } } }; } },
  { id: 'col_canon_kristen', a: [20, 65], tags: ['columbia'], w: 30, c: (s) => canonOk(s, 'kristen') && !!tr(s) && ['COL_RHINE', 'COL_EXEC'].includes(tr(s).id),
    run: (s) => { canonSeen(s); return { t: '이사회장에서 나온 여자와 엘리베이터를 같이 탔습니다. 그 사람은 위층 버튼만 보고 있었고, 저는 내릴 층을 지나쳤습니다.', k: 'note' }; } },
  { id: 'col_canon_ifrit', a: [20, 50], tags: ['track:COL_RHINE'], w: 30, c: (s) => canonOk(s, 'ifrit'),
    run: (s) => { canonSeen(s); return { t: '연구동 지하에서 뿔 달린 아이가 끌려 나오는 것을 보았습니다. 같이 본 인턴은 그날로 사직서를 썼고, 저는 쓰지 않았습니다.', k: 'bad', fx: { h: -3 } }; } },

  // ══════════════════════════════════════════════════════════════════════════
  // COL_BSW 블랙스틸(A6 순회형, 핵심) — trainee / operator / elite / exec / ceo
  // ══════════════════════════════════════════════════════════════════════════
  entry('col_bsw_entry', 'COL_BSW', (s) => ({ t: '포트 배런 모집센터에서 연습생 계약서에 서명했습니다. 계약 기간은 두 해, 뒷면에는 탈락 조항이 있었습니다.', k: 'ev', fx: { h: 1 } })),
  ev('col_bsw_trainee_mock', 'COL_BSW', 'trainee', [16, 30], 30, 2, (s) => ({ t: '모조 화기로 하루 열 시간을 훈련했습니다. 진짜 화기는 아직 멀었고, 어깨 멍은 진짜였습니다.', k: 'ev', fx: { hl: -2, cap: { skill: 0.05 } } })),
  ev('col_bsw_trainee_wasteland', 'COL_BSW', 'trainee', [16, 30], 30, 2, (s) => ({ t: '황무지인 축출 훈련이었습니다. 표적은 사람이 아니라고 교관이 세 번 말했습니다.', k: 'bad', fx: { h: -2, standing: 2 } })),
  ev('col_bsw_trainee_half', 'COL_BSW', 'trainee', [16, 30], 25, 3, (s) => ({ t: '동기 40명 중 절반이 짐을 쌌습니다. 침상이 비었고, 식당 줄이 짧아졌습니다.', k: 'note', fx: { h: -1 }, f: F('블랙스틸 포트 배런 모집센터 연습생 명부, 탈락률 76%') })),
  ev('col_bsw_trainee_field', 'COL_BSW', 'trainee', [16, 30], 25, 2, (s) => ({ t: '기초 야전 교육을 마쳤습니다. 비 오는 사흘을 밖에서 났고, 신발은 버려야 했습니다.', k: 'ev', fx: { hl: -2, cap: { skill: 0.04 } } })),
  ev('col_bsw_op_deploy', 'COL_BSW', 'operator', [18, 50], 35, 2, (s) => ({ t: visitName(s) + ' 파견이 4개월이었습니다. 돌아오니 계절이 바뀌어 있었고, 우편함이 넘쳐 있었습니다.', k: 'ev', fx: { standing: 3, money: medX(s, 0.2) }, f: F('블랙스틸 파견 근무 기록, ' + s.year + '년') })),
  ev('col_bsw_op_misfire', 'COL_BSW', 'operator', [18, 50], 20, 4, (s) => ({ t: '공압 화기가 오발했습니다. 옆 사수가 다쳤고, 그 사람의 판정은 두 달 뒤에 나왔습니다.', k: 'bad', fx: { h: -3 } })),
  ev('col_bsw_op_escort', 'COL_BSW', 'operator', [18, 50], 30, 2, (s) => ({ t: '호위 임무였습니다. 의뢰인은 차 안에서 전화만 했고, 저희는 차 밖에서 비만 맞았습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('col_bsw_op_gear_test', 'COL_BSW', 'operator', [18, 50], 20, 4, (s) => ({ t: '신장비 시험대에 올랐습니다. 장비는 무거웠고, 보고서에는 "무결점"이라고 적혔습니다.', k: 'note', fx: { cap: { skill: 0.03 } } })),
  ev('col_bsw_elite_instructor', 'COL_BSW', 'elite', [24, 55], 30, 2, (s) => ({ t: '연습생 교육을 맡았습니다. 제가 들었던 "표적은 사람이 아니다"를 이번에는 제가 말했습니다.', k: 'ev', fx: { standing: 3 } })),
  ev('col_bsw_elite_grading', 'COL_BSW', 'elite', [24, 55], 25, 3, (s) => ({ t: '연습생 평가 채점을 했습니다. 4명 중 3명에게 탈락을 적었습니다. 그중 하나는 제 첫해와 똑같이 뛰었습니다.', k: 'bad', fx: { h: -2 }, f: F('블랙스틸 포트 배런 모집센터 연습생 평가 기준, 탈락률 76%') })),
  ev('col_bsw_elite_range', 'COL_BSW', 'elite', [24, 55], 25, 3, (s) => ({ t: '사격장에서 기록을 냈습니다. 게시판에 이름이 붙었고, 다음 주에 다른 이름이 그 위에 붙었습니다.', k: 'ev', fx: { cap: { skill: 0.04 } } })),
  ev('col_bsw_elite_contract', 'COL_BSW', 'elite', [24, 55], 20, 4, (s) => ({ t: '계약 조건을 직접 협상했습니다. 위험 수당 줄이 하나 늘었고, 사망 보상 줄은 그대로였습니다.', k: 'ev', fx: { money: medX(s, 0.3) } })),
  ev('col_bsw_exec_absorb', 'COL_BSW', 'exec', [30, 65], 25, 3, (s) => ({ t: '하청 용병단이 임무에 실패했습니다. 생존자들을 헐값에 흡수하는 서류에 서명했습니다.', k: 'bad', fx: { h: -2, standing: 3 } })),
  ev('col_bsw_exec_refuse', 'COL_BSW', 'exec', [30, 65], 25, 6, (s) => ({ t: '은행이 개척지 주민에게 발포하라는 명령을 넣었습니다. 거부했습니다. 계약 하나가 깨졌고, 다른 계약 셋이 들어왔습니다.', k: 'ev', fx: { standing: 5, money: -medX(s, 0.5) } }), { c: (s) => s.year >= 1099 }),
  ev('col_bsw_exec_board', 'COL_BSW', 'exec', [30, 65], 30, 2, (s) => ({ t: '임원 회의였습니다. 지도에 꽂힌 핀이 열두 개였고, 핀마다 사람이 수십 명이었습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('col_bsw_exec_funeral', 'COL_BSW', 'exec', [30, 65], 20, 4, (s) => ({ t: '임무 중 사망한 오퍼레이터의 장례에 회사 대표로 갔습니다. 가족은 보상금 서류를 받았고, 저를 보지 않았습니다.', k: 'loss', fx: { h: -3 } })),
  ev('col_bsw_ceo_shareholders', 'COL_BSW', 'ceo', [35, 75], 30, 2, (s) => ({ t: '주주 총회였습니다. 사망자 수는 각주에, 매출은 본문에 있었습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('col_bsw_ceo_gov', 'COL_BSW', 'ceo', [35, 75], 25, 3, (s) => ({ t: '연방 정부 계약에 서명했습니다. 계약서는 두껍고, 서명 칸은 하나였습니다.', k: 'ev', fx: { money: medX(s, 3) } })),
  ev('col_bsw_ceo_resign_denied', 'COL_BSW', 'ceo', [35, 75], 20, 5, (s) => ({ t: '옛 오퍼레이터의 사직서가 올라왔습니다. 승인하지 않았습니다. 그 사람은 서류상 여전히 회사 사람입니다.', k: 'note' })),
  ev('col_bsw_ceo_founder', 'COL_BSW', 'ceo', [35, 75], 20, 5, (s) => ({ t: '정예 오퍼레이터 하나가 독립해 회사를 차린다고 했습니다. 막지 않았습니다. 첫 고객이 되어 주었습니다.', k: 'warm', fx: { h: 2 } })),
  transition('col_bsw_transition', 'COL_BSW', {
    operator: (s) => '평가를 통과해 오퍼레이터가 되었습니다. 진짜 화기를 받았고, 계약서가 세 해짜리로 바뀌었습니다.',
    elite: (s) => '정예로 분류되었습니다. 교관 완장이 왔고, 파견 횟수는 줄지 않았습니다.',
    exec: (s) => '임원이 되었습니다. 총 대신 서류를 들었고, 서류가 더 무거웠습니다.',
    ceo: (s) => '회사의 대표가 되었습니다. 첫 결재는 다음 분기 사망 보상 예산이었습니다.',
  }),
  aftermath('col_bsw_after', 'COL_BSW', {
    elimination: (s) => '탈락했습니다. 모집센터 뒷문으로 나왔고, 가방 하나와 두 해가 남았습니다.',
    kia: (s) => '임무에서 크게 다쳤습니다. 회사는 계약서대로 치료비를 냈고, 계약서대로 다음 계약은 없었습니다.',
    infected: (s) => '판정이 중증으로 나왔습니다. 퇴직금과 계약 해지 통지가 같은 봉투에 들어 있었습니다.',
  }),
  // 소속 변주
  { id: 'col_bsw_apd', a: [16, 60], tags: ['aff:COL_BSW_APD'], w: 20, gap: 4,
    run: (s) => ({ t: 'APD 소속으로 도시 경비에 섰습니다. 경찰과 같은 모퉁이에 서 있었고, 월급은 달랐습니다.', k: 'note' }) },
  { id: 'col_bsw_deat', a: [16, 60], tags: ['aff:COL_BSW_DEAT'], w: 20, gap: 4,
    run: (s) => ({ t: 'DEAT 작전 전날 밤이었습니다. 편지를 썼고, 돌아와서 찢었습니다.', k: 'ev', fx: { h: -1, standing: 3 } }) },
  { id: 'col_bsw_obhr', a: [16, 60], tags: ['aff:COL_BSW_OBHR'], w: 20, gap: 4,
    run: (s) => ({ t: 'OBHR 호위 임무였습니다. 의뢰인의 이름은 끝까지 몰랐고, 의뢰인은 저희 이름을 알 필요가 없었습니다.', k: 'note', fx: { money: medX(s, 0.15) } }) },
  { id: 'col_bsw_account', a: [16, 60], tags: ['aff:COL_BSW_ACCOUNT'], w: 20, gap: 4,
    run: (s) => ({ t: '회계 부서라 기초 야전 훈련만 받았습니다. 장부에서 "손실"이라는 칸이 무엇을 세는지는 첫 달에 알았습니다.', k: 'note' }) },
  // 로도스 접점(referral): 합동 작전
  { id: 'col_bsw_rhodes_joint', a: [18, 55], tags: ['track:COL_BSW', '!rhodes'], w: 8, gap: 8, c: (s) => !!tr(s) && tr(s).stage >= 1,
    run: (s) => { s.S.flags.rhodes_operation = s.S.age; return { t: '로도스 아일랜드 오퍼레이터들과 합동 작전을 했습니다. 끝나고 그쪽 지휘관이 제 소속과 이름을 물었습니다.', k: 'note' }; } },
  // 방문국(순회형 피드)
  { id: 'col_bsw_visit_kazimierz', a: [16, 60], tags: ['track:COL_BSW', 'visit:kazimierz'], w: 30, gap: 3,
    run: (s) => ({ t: '카시미어 파견이었습니다. 경기장 경비였고, 관중은 저희를 배경으로 알았습니다.', k: 'ev', fx: { standing: 2 } }) },
  { id: 'col_bsw_visit_bolivar', a: [16, 60], tags: ['track:COL_BSW', 'visit:bolivar'], w: 30, gap: 3,
    run: (s) => ({ t: '볼리바르 파견이었습니다. 세 정부 중 누가 의뢰인인지 묻지 않는 것이 첫 규칙이었습니다.', k: 'ev', fx: { hl: -1, standing: 2 } }) },
  { id: 'col_bsw_visit_sargon', a: [16, 60], tags: ['track:COL_BSW', 'visit:sargon'], w: 30, gap: 3,
    run: (s) => ({ t: '사르곤 파견이었습니다. 모래가 화기 속으로 들어왔고, 저녁마다 분해해서 닦았습니다.', k: 'ev', fx: { cap: { skill: 0.02 } } }) },
  { id: 'col_canon_liskarm', a: [18, 55], tags: ['columbia'], w: 30, c: (s) => canonOk(s, 'liskarm') && !!tr(s) && ['COL_BSW', 'COL_LABOR'].includes(tr(s).id),
    run: (s) => { canonSeen(s); return { t: '파견지에서 블랙스틸 오퍼레이터 하나가 동료 둘의 짐까지 들고 먼저 차에 올랐습니다. 이름은 들었고, 다시 볼 일은 없었습니다.', k: 'note' }; } },

  // ══════════════════════════════════════════════════════════════════════════
  // COL_FRONTIER 개척민(A11, 핵심) — member / leader / sheriff + 계절·명절·동네
  // ══════════════════════════════════════════════════════════════════════════
  entry('col_frontier_entry', 'COL_FRONTIER', (s) => ({ t: ro(affName(s, '개척지')) + ' 들어온 첫 해였습니다. 라디오에서 들은 "컬럼비아 드림"과 땅의 색이 달랐습니다.', k: 'ev' })),
  ev('col_fro_member_fence', 'COL_FRONTIER', 'member', [14, 50], 30, 2, (s) => ({ t: '울타리를 쳤습니다. 하루 백 걸음씩. 울타리 바깥은 아직 지도에 이름이 없었습니다.', k: 'ev', fx: { hl: -1, cap: { skill: 0.04 } } })),
  ev('col_fro_member_wage', 'COL_FRONTIER', 'member', [14, 50], 30, 2, (s) => ({ t: '일당을 받았습니다. 40%는 보험료로, 나머지는 가게로 갔습니다. 가게는 회사 것이었습니다.', k: 'bad', fx: { money: -medX(s, 0.02) }, f: F('보험협회 개척지 노동자 특약 요율표, ' + s.year + '년') })),
  ev('col_fro_member_raid_rumor', 'COL_FRONTIER', 'member', [14, 50], 20, 3, (s) => ({ t: '옆 개척지가 습격을 받았다고 했습니다. 도적이라고 했고, 농장 쪽 사람이라고도 했습니다.', k: 'note', fx: { h: -2 } })),
  ev('col_fro_member_well', 'COL_FRONTIER', 'member', [14, 50], 25, 3, (s) => ({ t: '우물을 팠습니다. 열흘 만에 물이 나왔고, 첫 물은 팀 전원이 한 모금씩 마셨습니다.', k: 'warm', fx: { h: 2, cap: { ties: 0.03 } } })),
  ev('col_fro_leader_roster', 'COL_FRONTIER', 'leader', [18, 60], 30, 2, (s) => ({ t: '팀 명단을 짰습니다. 열 명 중 둘은 기침을 했고, 명단에는 적지 않았습니다.', k: 'note', fx: { standing: 2 } })),
  ev('col_fro_leader_bank', 'COL_FRONTIER', 'leader', [18, 60], 25, 3, (s) => ({ t: '은행 사람이 왔습니다. 대출 상환일을 말했고, 수확일은 묻지 않았습니다.', k: 'bad', fx: { h: -2 } })),
  ev('col_fro_leader_catastrophe', 'COL_FRONTIER', 'leader', [18, 60], 20, 4, (s) => ({ t: '재앙 경보가 왔습니다. 팀을 이끌고 사흘을 걸었고, 돌아오니 울타리만 남아 있었습니다.', k: 'bad', fx: { hl: -3, h: -3, money: -medX(s, 0.2), standing: 3 } })),
  ev('col_fro_leader_newcomers', 'COL_FRONTIER', 'leader', [18, 60], 25, 3, (s) => ({ t: '새 개척민 가족이 왔습니다. 도시에서 왔다고 했고, 왜 왔는지는 아무도 묻지 않았습니다.', k: 'ev', fx: { cap: { ties: 0.02 } } })),
  ev('col_fro_sheriff_badge', 'COL_FRONTIER', 'sheriff', [25, 70], 30, 2, (s) => ({ t: '보안관 배지를 달고 첫 분쟁을 맡았습니다. 땅 경계 문제였고, 양쪽 다 서류가 있었습니다.', k: 'ev', fx: { standing: 3 } })),
  ev('col_fro_sheriff_harvest', 'COL_FRONTIER', 'sheriff', [25, 70], 30, 2, (s) => ({ t: '농장 수확이 끝났습니다. 창고가 찼고, 은행 서류 한 장이 그 창고를 반으로 나누었습니다.', k: 'ev', fx: { money: medX(s, 0.4) } })),
  ev('col_fro_sheriff_tax', 'COL_FRONTIER', 'sheriff', [25, 70], 20, 4, (s) => ({ t: '국세청 단속이 왔습니다. 양조장 장부를 사흘 뒤졌고, ' + fmt(s.med * 0.3) + ' 벌금 고지서를 두고 갔습니다.', k: 'bad', fx: { money: -medX(s, 0.3) }, f: F('연방 국세청 개척지 주류 과세 고지, ' + s.year + '년') })),
  ev('col_fro_sheriff_pmc', 'COL_FRONTIER', 'sheriff', [25, 70], 20, 4, (s) => ({ t: '민간 군사기업 차량이 마을에 섰습니다. 은행 의뢰라고 했습니다. 마을 사람들이 광장에 모였고, 차량은 저녁에 떠났습니다.', k: 'bad', fx: { h: -2, standing: 4 } })),
  transition('col_frontier_transition', 'COL_FRONTIER', {
    leader: (s) => '팀 리더가 되었습니다. 울타리 안의 열 사람이 제 책임이 되었습니다.',
    sheriff: (s) => '보안관이 되었습니다. 배지 하나와 땅 한 조각, 그리고 은행 대출 서류가 함께 왔습니다.',
  }),
  aftermath('col_frontier_after', 'COL_FRONTIER', {
    ruin: (s) => '대출을 갚지 못했습니다. 은행이 땅을 가져갔고, 더 바깥쪽 개척지로 가는 길만 남았습니다.',
    raid: (s) => '습격을 받았습니다. 살아남았고, 울타리와 팀은 남지 않았습니다.',
    catastrophe: (s) => '재앙이 지나갔습니다. 개척지는 지도에서 지워졌고, 살아 나온 사람은 몇 되지 않았습니다.',
    infected: (s) => '개척지에서 판정이 났습니다. 팀은 저를 명단에서 뺐고, 보험협회는 저를 다른 명단에 넣었습니다.',
  }),
  // 계절·명절·동네(A11 체감용, 6개+)
  { id: 'col_fro_long_table', a: [10, 90], tags: ['track:COL_FRONTIER'], w: 25, gap: 3,
    run: (s) => ({ t: '긴 식탁의 날이었습니다. 개척지 전체가 한 식탁에 앉았고, 접시보다 사람이 많았습니다.', k: 'warm', fx: { h: 3, cap: { ties: 0.02 } } }) },
  { id: 'col_fro_first_frost', a: [10, 90], tags: ['track:COL_FRONTIER'], w: 25, gap: 2,
    run: (s) => ({ t: '첫 서리가 지난해보다 9일 일렀습니다. 거두지 못한 것은 땅에 두었고, 거둔 것은 창고에 두었습니다.', k: 'ev', f: F('연방 개척국 기상 기록, ' + s.year + '년') }) },
  { id: 'col_fro_founding_day', a: [10, 90], tags: ['track:COL_FRONTIER'], w: 20, gap: 4,
    run: (s) => ({ t: fest(s, 0) + '이었습니다. 개척지에서도 불꽃을 쏘았습니다. 3발이었고, 도시에서는 300발을 쏜다고 했습니다.', k: 'ev', fx: { h: 2 }, f: F('연방 기념행사 집계, ' + s.year + '년') }) },
  { id: 'col_fro_radio', a: [10, 90], tags: ['track:COL_FRONTIER'], w: 20, gap: 3,
    run: (s) => ({ t: '라디오에서 또 개척민을 모집했습니다. 올해 모집 인원 1,200명. "컬럼비아 드림"이라는 말이 나올 때마다 누군가 라디오를 꺼 버렸습니다.', k: 'note', f: F('연방 개척국 개척민 모집 공고, ' + s.year + '년') }) },
  { id: 'col_fro_franchise', a: [14, 90], tags: ['track:COL_FRONTIER'], w: 20, gap: 5,
    run: (s) => ({ t: '마을에 체인 가게가 들어왔습니다. 간판이 마을에서 가장 밝았고, 값은 도시보다 비쌌습니다.', k: 'note', fx: { money: -medX(s, 0.02) } }) },
  { id: 'col_fro_suburb', a: [14, 90], tags: ['track:COL_FRONTIER'], w: 15, gap: 5,
    run: (s) => ({ t: '개척지가 자라 교외 소리를 듣게 되었습니다. 잔디밭이 생겼고, 잔디밭마다 울타리가 하나씩 더 생겼습니다.', k: 'ev', fx: { h: 1 } }) },
  { id: 'col_fro_sunday', a: [10, 90], tags: ['track:COL_FRONTIER'], w: 20, gap: 3,
    run: (s) => ({ t: '일요일이었습니다. 개척지 전체가 늦게 일어났고, 저녁에는 누군가 기타를 꺼냈습니다.', k: 'warm', fx: { h: 2 } }) },
  // 소속 변주: 개척지별
  { id: 'col_fro_basewood', a: [14, 80], tags: ['aff:COL_FRO_BASEWOOD'], w: 20, gap: 4,
    run: (s) => ({ t: '베이스우드 플레이트가 이동했습니다. 땅이 흔들리는 사이 울타리 기둥 셋이 넘어졌고, 다시 세웠습니다.', k: 'ev' }) },
  { id: 'col_fro_deadhorse', a: [14, 80], tags: ['aff:COL_FRO_DEADHORSE'], w: 20, gap: 4,
    run: (s) => ({ t: '데드호스에는 보안관이 하나, 술집이 셋이었습니다. 밤에 소리가 나면 술집 쪽이었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'col_fro_richmond', a: [14, 80], tags: ['aff:COL_FRO_RICHMOND'], w: 20, gap: 4,
    run: (s) => ({ t: '뉴 리치먼드에 광산 회사가 사무소를 냈습니다. 일당이 조금 올랐고, 기침하는 사람이 조금 늘었습니다.', k: 'note', fx: { money: medX(s, 0.05) } }) },
  { id: 'col_fro_davis', a: [14, 80], tags: ['aff:COL_FRO_DAVIS'], w: 20, gap: 6, c: (s) => s.year >= 1099,
    run: (s) => ({ t: '데이비스 타운 은행에 강도가 들었다고 했습니다. 마을 사람들은 은행 쪽보다 강도 쪽 이야기를 더 오래 했습니다.', k: 'note' }) },

  // ══════════════════════════════════════════════════════════════════════════
  // COL_INSURANCE 보험 의존 감염자(A5 forced, 핵심) — private / public / frontier
  // ══════════════════════════════════════════════════════════════════════════
  ev('col_ins_private_bill', 'COL_INSURANCE', 'private', [5, 90], 35, 1, (s) => ({ t: '보험료 청구서가 왔습니다. 지난달보다 12% 올랐고, 올린 이유는 한 줄이었습니다.', k: 'bad', fx: { money: -medX(s, 0.08), h: -1 }, f: F('보험협회 감염자 특약 요율 개정 고시, ' + s.year + '년') })),
  ev('col_ins_private_work', 'COL_INSURANCE', 'private', [14, 70], 30, 2, (s) => ({ t: '보험료를 내기 위해 일했습니다. 일자리는 묻지 않는 곳이었고, 묻지 않는 만큼 적게 주었습니다.', k: 'ev', fx: { hl: -1 } })),
  ev('col_ins_private_vitamin', 'COL_INSURANCE', 'private', [5, 90], 25, 3, (s) => ({ t: '보험사에서 약이 왔습니다. 억제제 대신 영양제와 진통제였습니다. 다음 달치는 미리 줄 수 없다고 했습니다.', k: 'bad', fx: { hl: -1 } })),
  ev('col_ins_private_agent', 'COL_INSURANCE', 'private', [5, 90], 20, 3, (s) => ({ t: '보험 설계사가 집에 왔습니다. 상품을 바꾸면 보험료가 내려간다고 했습니다. 보장도 함께 내려갔습니다.', k: 'note', fx: { money: medX(s, 0.03) } })),
  ev('col_ins_public_gate', 'COL_INSURANCE', 'public', [5, 90], 35, 2, (s) => ({ t: '격리구역 출입문은 하루 2번 열렸습니다. 아침에 나가는 사람보다 저녁에 들어오는 사람이 적었습니다.', k: 'bad', fx: { h: -2 }, f: F('보험협회 격리구역 출입 관리 규정 제3조') })),
  ev('col_ins_public_clinic', 'COL_INSURANCE', 'public', [5, 90], 30, 2, (s) => ({ t: '공공 진료소에 갔습니다. 번호표는 240번대였고, 약은 한 종류였습니다.', k: 'ev', fx: { hl: 1 }, f: F('보험협회 격리구역 진료소 일일 접수 집계, ' + s.year + '년') })),
  ev('col_ins_public_work', 'COL_INSURANCE', 'public', [14, 70], 30, 2, (s) => ({ t: '구역 안 작업반에 배정되었습니다. 분류 작업이었고, 무엇을 분류하는지는 적혀 있지 않았습니다.', k: 'ev', fx: { standing: 2, money: medX(s, 0.05) } })),
  ev('col_ins_public_letter', 'COL_INSURANCE', 'public', [5, 90], 20, 3, (s) => ({ t: '바깥에서 편지가 왔습니다. 봉투는 검사 도장이 찍혀 있었고, 내용은 날씨 이야기였습니다.', k: 'warm', fx: { h: 2 } })),
  ev('col_ins_frontier_dust', 'COL_INSURANCE', 'frontier', [5, 90], 35, 2, (s) => ({ t: '개척지 바깥의 흙은 붉었습니다. 하루 일하면 손이 그 색이 되었습니다.', k: 'ev', fx: { hl: -2 } })),
  ev('col_ins_frontier_market', 'COL_INSURANCE', 'frontier', [5, 90], 25, 3, (s) => ({ t: '장이 섰습니다. 억제제라고 파는 약이 있었고, 값은 한 달치 일당이었습니다. 사는 사람이 많았습니다.', k: 'note' })),
  ev('col_ins_frontier_neighbors', 'COL_INSURANCE', 'frontier', [5, 90], 25, 3, (s) => ({ t: '옆 천막 가족도 보험료를 못 내서 왔다고 했습니다. 서로 어느 도시였는지 말했고, 돌아갈 이야기는 하지 않았습니다.', k: 'warm', fx: { h: 1, cap: { ties: 0.02 } } })),
  ev('col_ins_frontier_patrol', 'COL_INSURANCE', 'frontier', [5, 90], 20, 3, (s) => ({ t: '연방 순찰대가 지나갔습니다. 서류를 보지 않았습니다. 여기서는 서류가 없는 것이 서류였습니다.', k: 'note' })),
  transition('col_insurance_transition', 'COL_INSURANCE', {
    public: (s) => '민영 보험이 끊겼습니다. 공공보험 격리구역으로 옮겨졌고, 주소가 구역 번호로 바뀌었습니다.',
    frontier: (s) => '격리구역에서도 밀려났습니다. 개척지 바깥으로 보내졌고, 보험협회의 마지막 서류에는 "이송 완료"라고 적혀 있었습니다.',
  }),
  aftermath('col_insurance_after', 'COL_INSURANCE', {
    exile: (s) => '보험 미납이 두 해였습니다. 추방 통지서 한 장으로 나라를 떠났고, 국경 너머에서는 보험료를 묻는 사람이 없었습니다.',
  }),
  { id: 'col_ins_exile_out', a: [5, 90], tags: ['track:COL_INSURANCE:frontier'], w: 10, gap: 3, c: (s) => s.S.money < 0,
    run: (s) => { s.migrate('exile'); return { t: '개척지 바깥에서도 버틸 돈이 없었습니다. 국경을 넘었습니다. 뒤에서 아무도 부르지 않았습니다.', k: 'bad' }; } },
  // 소속 변주: 보험사
  { id: 'col_ins_private_aff', a: [5, 90], tags: ['aff:COL_INS_PRIVATE'], w: 20, gap: 4,
    run: (s) => ({ t: '민영 보험사 상담 전화를 걸었습니다. 대기 음악이 두 곡 지나갔고, 상담원은 약관 조항 번호를 읽어 주었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'col_ins_public_aff', a: [5, 90], tags: ['aff:COL_INS_PUBLIC'], w: 20, gap: 4,
    run: (s) => ({ t: '공공보험 갱신 서류를 썼습니다. 소득 칸에 적을 숫자가 작아서, 칸이 커 보였습니다.', k: 'note', f: F('보험협회 격리구역 공공보험 갱신 지침, 연 소득 기준 ' + s.year + '년판') }) },
  // 보험 가입 통지(이민자 첫 해) + 신참
  { id: 'col_newcomer_insurance', a: [10, 80], tags: ['columbia', 'newcomer'], w: 40, gap: 3,
    run: (s) => ({ t: '거주 등록을 하자 보험협회에서 가입 안내서가 왔습니다. 첫 장은 환영 인사, 둘째 장부터 7쪽은 광석병 특약 안내였습니다.', k: 'note', fx: { money: -medX(s, 0.03) }, f: F('보험협회 신규 거주자 가입 안내서 ' + s.year + '년판') }) },
  { id: 'col_newcomer_first_year', a: [10, 80], tags: ['columbia', 'newcomer'], w: 35, gap: 2,
    run: (s) => ({ t: pick(s, ['이민자 첫 해였습니다. 모든 것이 빨랐고, 값이 붙어 있었고, 값은 매달 조금씩 올랐습니다.', '말이 서툴러 가게에서 두 번 물었습니다. 두 번째 대답에는 미소가 있었고, 값은 같았습니다.', '첫 월급의 셋 중 하나가 집세로, 하나가 보험료로 갔습니다. 남은 하나로 살았습니다.']), k: 'ev', fx: { h: -1 } }) },
  { id: 'col_newcomer_papers', a: [14, 80], tags: ['columbia', 'newcomer', 'papers:legal'], w: 25, gap: 3,
    run: (s) => ({ t: '거주 허가 갱신 창구에 섰습니다. 번호표가 넘어가는 사이 옆 사람이 고향 말로 중얼거렸고, 같은 말이었습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }) },

  // ══════════════════════════════════════════════════════════════════════════
  // 나머지 진로 — 단계마다 2개 + 전환 + 몰락 후일담
  // ══════════════════════════════════════════════════════════════════════════
  // COL_SLUM 판자촌·갱 — resident / member / boss
  ev('col_slum_res_rain', 'COL_SLUM', 'resident', [10, 60], 30, 2, (s) => ({ t: '판자촌에 비가 왔습니다. 지붕은 셋 중 하나가 새었고, 저희 집은 그 하나였습니다.', k: 'bad', fx: { hl: -1, h: -1 } })),
  ev('col_slum_res_errand', 'COL_SLUM', 'resident', [10, 60], 30, 2, (s) => ({ t: '동네 형이 봉투를 건네 달라고 했습니다. 건넸고, 돌아오는 길에 동전이 주머니에 있었습니다.', k: 'ev', fx: { money: medX(s, 0.02), standing: 3 } })),
  ev('col_slum_member_corner', 'COL_SLUM', 'member', [14, 60], 30, 2, (s) => ({ t: '모퉁이 하나를 맡았습니다. 지나가는 사람은 저를 보지 않았고, 저는 모두를 보았습니다.', k: 'ev', fx: { standing: 3 } })),
  ev('col_slum_member_police', 'COL_SLUM', 'member', [14, 60], 25, 3, (s) => ({ t: '경찰차가 판자촌 입구에 섰습니다. 들어오지는 않았습니다. 입구에서 사진만 찍고 갔습니다.', k: 'note', fx: { h: -1 } })),
  ev('col_slum_boss_tribute', 'COL_SLUM', 'boss', [20, 70], 30, 2, (s) => ({ t: '구역 상납이 들어왔습니다. 봉투 수를 세고, 빠진 이름을 적었습니다.', k: 'ev', fx: { money: medX(s, 0.3), standing: 2 } })),
  ev('col_slum_boss_deal', 'COL_SLUM', 'boss', [20, 70], 25, 3, (s) => ({ t: '옆 구역 두목과 만났습니다. 경계선을 다시 그렸고, 악수는 하지 않았습니다.', k: 'note', fx: { h: -1 } })),
  transition('col_slum_transition', 'COL_SLUM', {
    member: (s) => '갱의 단원이 되었습니다. 팔에 표식을 새겼고, 어머니에게는 긴팔을 입고 갔습니다.',
    boss: (s) => '두목이 되었습니다. 판자촌 사람들이 길을 비켰고, 경찰도 비켰습니다.',
  }),
  aftermath('col_slum_after', 'COL_SLUM', {
    arrest: (s) => '체포되었습니다. 변호사는 국선이었고, 형량은 정해져 있었습니다.',
    vendetta: (s) => '보복이 있었습니다. 살아남았고, 그 구역에는 다시 가지 않았습니다.',
    kia: (s) => '총격이 있었습니다. 병원에서 깨어났고, 갱은 저를 찾아오지 않았습니다.',
  }),
  { id: 'col_slum_trimounts', a: [10, 70], tags: ['aff:COL_SLUM_TRIMOUNTS'], w: 20, gap: 4,
    run: (s) => ({ t: '트리마운츠 판자촌 위로 연구소 건물의 불빛이 밤새 켜져 있었습니다. 그 불빛으로 책을 읽는 아이들이 있었습니다.', k: 'note' }) },
  { id: 'col_slum_redhand_1096', a: [10, 70], tags: ['aff:COL_SLUM_REDHAND'], w: 100, c: (s) => s.year === 1096,
    run: (s) => { if (s.rng.chance(0.5)) { s.applyExit('death:catastrophe', 'catastrophe'); return; } s.applyExit('injured', 'catastrophe'); return { t: '1096년 8월, 티카론토 감염자 구역에 재앙이 왔습니다. 레드 핸드는 그날 거의 전원이 사라졌고, 저는 살아 나온 몇 사람 중 하나였습니다.', k: 'bad', fx: { h: -8 }, f: F('연방 재난관리국 티카론토 피해 집계, 1096년 8월') }; } },

  // COL_ORPHAN 고아원 출신 — orphanage / labor / placed
  ev('col_orp_orphanage_bell', 'COL_ORPHAN', 'orphanage', [5, 16], 30, 2, (s) => ({ t: '고아원의 하루는 종으로 나뉘었습니다. 밥 종, 공부 종, 불 끄는 종. 울지 않는 종은 없었습니다.', k: 'ev' })),
  ev('col_orp_orphanage_visitor', 'COL_ORPHAN', 'orphanage', [5, 16], 25, 3, (s) => ({ t: '양복 입은 사람들이 와서 아이들을 보고 갔습니다. 이름을 적어 갔고, 제 이름은 적히지 않았습니다.', k: 'note', fx: { h: -1 } })),
  ev('col_orp_labor_shift', 'COL_ORPHAN', 'labor', [10, 22], 30, 2, (s) => ({ t: '작업장 교대가 열두 시간이었습니다. 급여는 고아원 계좌로 들어갔고, 그 계좌는 본 적이 없었습니다.', k: 'bad', fx: { hl: -2, cap: { skill: 0.03 } } })),
  ev('col_orp_labor_training', 'COL_ORPHAN', 'labor', [10, 22], 25, 3, (s) => ({ t: '훈련이라고 했습니다. 달리고, 외우고, 묻지 않는 법을 배웠습니다. 셋째가 가장 오래 걸렸습니다.', k: 'ev', fx: { cap: { skill: 0.04 }, standing: 2 } })),
  ev('col_orp_placed_letter', 'COL_ORPHAN', 'placed', [14, 30], 30, 2, (s) => ({ t: '배치 통지가 왔습니다. 도시 이름과 회사 이름이 적혀 있었고, 두 이름 다 처음 들었습니다.', k: 'ev' })),
  ev('col_orp_placed_visit', 'COL_ORPHAN', 'placed', [14, 30], 20, 4, (s) => ({ t: '고아원에 한 번 돌아가 보았습니다. 종소리는 같았고, 아이들은 전부 달랐습니다.', k: 'warm', fx: { h: 1 } })),
  transition('col_orphan_transition', 'COL_ORPHAN', {
    labor: (s) => '고아원 생활이 끝나고 작업장으로 보내졌습니다. 침상은 그대로, 종은 하나 더 늘었습니다.',
    placed: (s) => '배치되었습니다. 고아원 문을 나올 때 받은 것은 가방 하나와 추천서 한 장이었습니다.',
  }),
  aftermath('col_orphan_after', 'COL_ORPHAN', {
    ruin: (s) => '고아원이 문을 닫았습니다. 아이들은 흩어졌고, 저는 거리에서 첫 밤을 났습니다.',
  }),
  { id: 'col_orp_maylander', a: [5, 25], tags: ['aff:COL_ORP_MAYLANDER'], w: 25, gap: 3,
    run: (s) => ({ t: '메이랜더 고아원의 수업은 다른 곳과 달랐습니다. 지도 읽기, 몸 숨기기, 거짓말 알아내기. 시험은 매주였습니다.', k: 'note', fx: { cap: { skill: 0.04 } } }) },
  { id: 'col_orp_trenton', a: [5, 25], tags: ['aff:COL_ORP_TRENTON'], w: 25, gap: 3,
    run: (s) => ({ t: '트렌턴 고아원 뒷문에 밤마다 누군가 아이를 두고 갔습니다. 아침에 종이 한 번 더 울렸습니다.', k: 'note', fx: { h: -1 } }) },

  // COL_LABOR 공장·광산 노동 — worker / skilled / supervisor
  ev('col_lab_worker_whistle', 'COL_LABOR', 'worker', [15, 60], 30, 2, (s) => ({ t: '교대 호각이 울리면 들어가고, 울리면 나왔습니다. 하루가 호각 두 번이었습니다.', k: 'ev', fx: { hl: -1, cap: { skill: 0.03 } } })),
  ev('col_lab_worker_dust', 'COL_LABOR', 'worker', [15, 60], 25, 3, (s) => ({ t: '현장 먼지가 옷에 배었습니다. 집에 오면 문 앞에서 털었고, 그래도 아이가 기침을 했습니다.', k: 'bad', fx: { hl: -2 } })),
  ev('col_lab_skilled_tool', 'COL_LABOR', 'skilled', [19, 60], 30, 2, (s) => ({ t: '제 공구함이 생겼습니다. 이름을 새겼고, 공구마다 자리를 정했습니다.', k: 'ev', fx: { cap: { skill: 0.04 }, standing: 2 } })),
  ev('col_lab_skilled_newbie', 'COL_LABOR', 'skilled', [19, 60], 25, 3, (s) => ({ t: '신입에게 기계를 가르쳤습니다. 손가락을 어디에 두지 말아야 하는지부터 가르쳤습니다.', k: 'ev', fx: { cap: { ties: 0.02 } } })),
  ev('col_lab_super_quota', 'COL_LABOR', 'supervisor', [25, 65], 30, 2, (s) => ({ t: '생산 목표가 내려왔습니다. 지난달보다 15% 높았고, 사람 수는 같았습니다.', k: 'bad', fx: { h: -2, standing: 2 }, f: F('컬럼비아 제조업협회 생산 목표 고시, ' + s.year + '년') })),
  ev('col_lab_super_accident', 'COL_LABOR', 'supervisor', [25, 65], 20, 4, (s) => ({ t: '현장에서 사고가 났습니다. 다친 사람의 보고서를 썼고, 원인 칸에 "부주의"라고 적으라는 말을 들었습니다.', k: 'bad', fx: { h: -3 } })),
  transition('col_labor_transition', 'COL_LABOR', {
    skilled: (s) => '숙련공이 되었습니다. 시급이 올랐고, 기계가 고장 나면 제 이름이 불렸습니다.',
    supervisor: (s) => '현장 감독이 되었습니다. 호각을 제가 불게 되었고, 호각 소리가 싫어졌습니다.',
  }),
  aftermath('col_labor_after', 'COL_LABOR', {
    accident: (s) => '기계에 다쳤습니다. 산재 서류는 석 달이 걸렸고, 회사는 다른 사람을 그 자리에 세웠습니다.',
    infected: (s) => '현장에서 판정이 났습니다. 다음 날 출입증이 멈췄고, 보험협회의 편지가 먼저 집에 와 있었습니다.',
    layoff: (s) => '공장이 줄였습니다. 근속순이라고 했고, 제 이름은 그 순서 안에 있었습니다.',
  }),
  { id: 'col_lab_mine', a: [15, 65], tags: ['aff:COL_LAB_MINE'], w: 25, gap: 3,
    run: (s) => ({ t: '광산 갱도에서 하루를 보냈습니다. 올라오면 하늘이 눈에 아팠고, 그 통증이 좋았습니다.', k: 'ev', fx: { hl: -2, money: medX(s, 0.05) } }) },
  { id: 'col_lab_demolition', a: [15, 65], tags: ['aff:COL_LAB_DEMOLITION'], w: 25, gap: 3,
    run: (s) => ({ t: '폭파 작업이었습니다. 숫자를 세고, 귀를 막고, 먼지가 가라앉기를 기다렸습니다. 기다리는 동안 아무도 말하지 않았습니다.', k: 'ev', fx: { cap: { skill: 0.04 } } }) },
  { id: 'col_lab_quarry', a: [15, 65], tags: ['aff:COL_LAB_QUARRY'], w: 20, gap: 4,
    run: (s) => ({ t: '채석 소도시에서는 모두가 같은 회사 사람이었습니다. 가게도, 학교도, 병원도 그 회사 간판이었습니다.', k: 'note' }) },

  // COL_SHOP 유통·서비스 점원(A10) — clerk / manager / owner
  ev('col_shop_clerk_register', 'COL_SHOP', 'clerk', [15, 50], 30, 2, (s) => ({ t: '계산대에 섰습니다. 하루에 "좋은 하루 되세요"를 200번 말했고, 한 번도 뜻은 없었습니다.', k: 'ev', fx: { cap: { ties: 0.02 } } })),
  ev('col_shop_clerk_shelf', 'COL_SHOP', 'clerk', [15, 50], 25, 3, (s) => ({ t: '진열대를 바꿨습니다. 비싼 것은 눈높이, 싼 것은 발밑. 본사 진열 지침 제7조였습니다.', k: 'note', f: F('유통 체인 본사 진열 지침 제7조') })),
  ev('col_shop_manager_shift', 'COL_SHOP', 'manager', [20, 60], 30, 2, (s) => ({ t: '근무표를 짰습니다. 사람은 넷, 자리는 여섯. 빈 자리는 제가 채웠습니다.', k: 'ev', fx: { hl: -1, standing: 2 } })),
  ev('col_shop_manager_hq', 'COL_SHOP', 'manager', [20, 60], 25, 3, (s) => ({ t: '본사 점검이 왔습니다. 바닥 광택과 미소 각도를 적어 갔습니다. 매출은 묻지 않았습니다.', k: 'note', fx: { h: -1 } })),
  ev('col_shop_owner_lease', 'COL_SHOP', 'owner', [25, 70], 30, 2, (s) => ({ t: '임대 계약을 갱신했습니다. 임대료는 10% 올랐고, 간판은 그대로였습니다.', k: 'bad', fx: { money: -medX(s, 0.2) }, f: F('트리마운츠 상공회의소 상업 임대료 지수, ' + s.year + '년') })),
  ev('col_shop_owner_regular', 'COL_SHOP', 'owner', [25, 70], 25, 3, (s) => ({ t: '단골이 생겼습니다. 이름은 몰라도 주문은 외웠습니다. 그 사람이 한 달 오지 않으면 걱정이 되었습니다.', k: 'warm', fx: { h: 2 } })),
  transition('col_shop_transition', 'COL_SHOP', {
    manager: (s) => '매니저가 되었습니다. 열쇠 꾸러미가 생겼고, 문 닫는 사람이 제가 되었습니다.',
    owner: (s) => '점장이 되었습니다. 간판 아래 제 이름이 작게 붙었습니다.',
  }),
  aftermath('col_shop_after', 'COL_SHOP', {
    layoff: (s) => '점포가 줄였습니다. 마지막 날 유니폼을 반납했고, 세탁비는 월급에서 빠졌습니다.',
    infected: (s) => '판정이 나자 계산대에서 창고로, 창고에서 집으로 보내졌습니다. 서류상 사유는 "직무 재배치"였습니다.',
    bankrupt: (s) => '가게가 문을 닫았습니다. 간판을 내리는 데 한 시간, 빚을 세는 데 한 달이 걸렸습니다.',
  }),
  { id: 'col_shop_mamajones', a: [15, 70], tags: ['aff:COL_SHOP_MAMAJONES'], w: 25, gap: 4,
    run: (s) => ({ t: '마마존스 매장에 억제제 코너가 생겼습니다. 값이 싸서 잘 팔렸습니다. 효과를 묻는 손님에게는 본사 문구를 읽어 주었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'col_shop_siesta', a: [15, 70], tags: ['aff:COL_SHOP_SIESTA'], w: 25, gap: 4,
    run: (s) => ({ t: '시에스타 호텔은 ' + fest(s, 1) + ' 때 가장 바빴습니다. 맥주 노점이 해변을 따라 섰고, 손님은 감염자인지 묻지 않았고, 저희도 묻지 않았습니다.', k: 'ev', fx: { h: 1, money: medX(s, 0.05) } }) },
  { id: 'col_shop_bar', a: [18, 70], tags: ['aff:COL_SHOP_BAR'], w: 25, gap: 4,
    run: (s) => ({ t: '바의 밤은 길었습니다. 마지막 손님은 늘 같은 사람이었고, 늘 같은 이야기를 했습니다.', k: 'note', fx: { hl: -1, cap: { ties: 0.02 } } }) },

  // COL_PMC 기타 용병단(A6 순회형) — merc / lead / boss
  ev('col_pmc_merc_sign', 'COL_PMC', 'merc', [16, 50], 30, 2, (s) => ({ t: '계약서에 서명했습니다. 보상 칸은 명확했고, 임무 칸은 비어 있었습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('col_pmc_merc_cheap', 'COL_PMC', 'merc', [16, 50], 25, 3, (s) => ({ t: '장비가 중고였습니다. 앞사람 이름이 지워진 자리에 제 이름을 썼습니다.', k: 'note', fx: { h: -1 } })),
  ev('col_pmc_lead_team', 'COL_PMC', 'lead', [20, 55], 30, 2, (s) => ({ t: '팀을 맡았습니다. 여섯 명, 그중 둘은 처음 보는 얼굴이었고, 임무 전에 이름을 외웠습니다.', k: 'ev', fx: { standing: 3 } })),
  ev('col_pmc_lead_bigfirm', 'COL_PMC', 'lead', [20, 55], 25, 3, (s) => ({ t: '큰 회사 밑에서 하청을 받았습니다. 그쪽 장비는 새것이었고, 저희 자리는 맨 앞이었습니다.', k: 'bad', fx: { money: medX(s, 0.2), hl: -1 } })),
  ev('col_pmc_boss_bid', 'COL_PMC', 'boss', [25, 65], 30, 2, (s) => ({ t: '입찰에 들어갔습니다. 큰 회사보다 싸게 썼고, 그 차이가 저희 사람들 보험료였습니다.', k: 'bad', fx: { money: medX(s, 0.5), h: -1 } })),
  ev('col_pmc_boss_survivors', 'COL_PMC', 'boss', [25, 65], 20, 4, (s) => ({ t: '임무가 실패했습니다. 큰 회사가 생존자를 흡수하겠다고 했습니다. 값은 헐값이었고, 거절할 돈이 없었습니다.', k: 'bad', fx: { h: -3, standing: -5 } })),
  transition('col_pmc_transition', 'COL_PMC', {
    lead: (s) => '팀장이 되었습니다. 계약서에 제 이름이 두 번 들어가게 되었습니다.',
    boss: (s) => '하청 용병단의 두목이 되었습니다. 회사 이름을 지었고, 이름보다 빚이 먼저 등록되었습니다.',
  }),
  aftermath('col_pmc_after', 'COL_PMC', {
    kia: (s) => '임무에서 다쳤습니다. 용병단은 치료비 절반을 냈고, 나머지 절반은 제 몫이었습니다.',
    contract_end: (s) => '계약이 해지되었습니다. 의뢰인이 바뀌었고, 새 의뢰인은 다른 용병단을 썼습니다.',
    infected: (s) => '판정이 났습니다. 용병단은 계약서 맨 뒷장을 보여 주었고, 그 장에 제 이름이 지워졌습니다.',
  }),
  { id: 'col_pmc_visit_bolivar', a: [16, 60], tags: ['track:COL_PMC', 'visit:bolivar'], w: 30, gap: 3,
    run: (s) => ({ t: '볼리바르에서 플랜테이션 경비를 섰습니다. 밤에 들리는 소리가 짐승인지 사람인지 구분하는 데 한 달이 걸렸습니다.', k: 'ev', fx: { standing: 2 } }) },
  { id: 'col_pmc_visit_siracusa', a: [16, 60], tags: ['track:COL_PMC', 'visit:siracusa'], w: 30, gap: 3,
    run: (s) => ({ t: '시라쿠사 의뢰였습니다. 의뢰인은 가족 이름으로 서명했고, 저희는 누구 편인지 끝까지 몰랐습니다.', k: 'note' }) },
  { id: 'col_pmc_redmark', a: [16, 60], tags: ['aff:COL_PMC_REDMARK'], w: 20, gap: 4,
    run: (s) => ({ t: '레드마크의 임무는 늘 급했습니다. 출발 두 시간 전에 통보가 왔고, 돌아오는 날은 적혀 있지 않았습니다.', k: 'ev', fx: { hl: -1, money: medX(s, 0.1) } }) },

  // COL_UNIV 대학생(A9) — freshman / undergrad / graduate / placed
  ev('col_uni_fresh_tuition', 'COL_UNIV', 'freshman', [17, 24], 30, 2, (s) => ({ t: '학비 고지서가 왔습니다. ' + fmt(s.med * 0.6) + '. 숫자를 세 번 읽었고, 세 번 다 같았습니다.', k: 'bad', fx: { money: -medX(s, 0.6) }, f: F('트리마운츠 공과대학 학비 고지, ' + s.year + '년') })),
  ev('col_uni_fresh_lecture', 'COL_UNIV', 'freshman', [17, 24], 30, 2, (s) => ({ t: '대강당 수업이었습니다. 삼백 명이 앉았고, 교수는 아무의 이름도 부르지 않았습니다.', k: 'ev', fx: { cap: { learn: 0.04 } } })),
  ev('col_uni_under_lab', 'COL_UNIV', 'undergrad', [18, 26], 30, 2, (s) => ({ t: '실험실에 들어갔습니다. 밤 열 시에도 불이 켜져 있었고, 그 불빛에 익숙해졌습니다.', k: 'ev', fx: { cap: { learn: 0.05 }, hl: -1 } })),
  ev('col_uni_under_recruit', 'COL_UNIV', 'undergrad', [18, 26], 25, 3, (s) => ({ t: '기업 설명회가 열렸습니다. 연구소 쪽 부스에 줄이 가장 길었고, 그 줄 끝에 서 있었습니다.', k: 'note' })),
  ev('col_uni_grad_thesis', 'COL_UNIV', 'graduate', [21, 30], 30, 2, (s) => ({ t: '논문 심사였습니다. 질문 셋 중 둘에 대답했고, 하나는 "더 보겠습니다"라고 했습니다.', k: 'ev', fx: { cap: { learn: 0.05 }, standing: 3 } })),
  ev('col_uni_grad_funding', 'COL_UNIV', 'graduate', [21, 30], 25, 3, (s) => ({ t: '연구비가 끊겼습니다. 지도교수는 기업 과제를 가져왔고, 주제가 바뀌었습니다.', k: 'bad', fx: { h: -2 } })),
  ev('col_uni_placed_offer', 'COL_UNIV', 'placed', [22, 32], 30, 2, (s) => ({ t: '진로를 정해야 했습니다. 연구소, 회사, 로스쿨. 세 봉투가 책상에 있었고, 하나만 열 수 있었습니다.', k: 'ev' })),
  ev('col_uni_placed_gown', 'COL_UNIV', 'placed', [22, 32], 25, 3, (s) => ({ t: '졸업식이었습니다. 가운을 빌렸고, 사진을 찍었고, 가운을 반납했습니다.', k: 'warm', fx: { h: 2 } })),
  transition('col_univ_transition', 'COL_UNIV', {
    undergrad: (s) => '학부 전공에 들어갔습니다. 교수 하나가 이름을 외워 주었습니다.',
    graduate: (s) => '대학원에 들어갔습니다. 장학금과 야근이 같이 왔습니다.',
    placed: (s) => '학위를 마쳤습니다. 다음 길을 정할 때가 되었고, 봉투가 몇 개 왔습니다.',
  }),
  aftermath('col_univ_after', 'COL_UNIV', {
    ruin: (s) => '학비를 더 댈 수 없었습니다. 휴학 서류를 냈고, 돌아가지 못했습니다.',
    infected: (s) => '판정이 나자 학교는 등록을 받아 주었고, 실험실은 출입을 막았습니다.',
  }),
  { id: 'col_uni_trimounts_aff', a: [17, 32], tags: ['aff:COL_UNI_TRIMOUNTS'], w: 25, gap: 3,
    run: (s) => ({ t: '트리마운츠 공과대학 게시판에는 연구소 채용 공고가 늘 맨 위에 있었습니다. 그 아래로 다른 공고들이 겹쳐 붙었습니다.', k: 'note', fx: { cap: { learn: 0.02 } } }) },

  // COL_GOV 공무원·군·경찰(A4) — rookie / officer / chief / director
  ev('col_gov_rookie_oath', 'COL_GOV', 'rookie', [18, 35], 30, 2, (s) => ({ t: '선서를 했습니다. 연방과 헌법에. 선서문에 보험 이야기는 없었고, 급여 명세서에는 있었습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('col_gov_rookie_night', 'COL_GOV', 'rookie', [18, 35], 30, 2, (s) => ({ t: '야간 근무였습니다. 도시는 조용했고, 무전기는 조용하지 않았습니다.', k: 'ev', fx: { hl: -1, cap: { skill: 0.03 } } })),
  ev('col_gov_officer_patrol', 'COL_GOV', 'officer', [21, 50], 30, 2, (s) => ({ t: '순찰 구역이 정해졌습니다. 판자촌 입구까지였고, 입구 안쪽은 구역이 아니었습니다.', k: 'note' })),
  ev('col_gov_officer_test', 'COL_GOV', 'officer', [21, 50], 25, 3, (s) => ({ t: '정기 건강 검진이었습니다. 광석병 항목이 맨 위에 있었고, 결과가 나올 때까지 모두 말이 없었습니다.', k: 'note', fx: { h: -1 } })),
  ev('col_gov_chief_order', 'COL_GOV', 'chief', [28, 60], 30, 2, (s) => ({ t: '위에서 명령이 내려왔습니다. 집회 해산. 부하들에게 전달했고, 전달하는 목소리가 제 것 같지 않았습니다.', k: 'bad', fx: { h: -2, standing: 2 } })),
  ev('col_gov_chief_budget', 'COL_GOV', 'chief', [28, 60], 25, 3, (s) => ({ t: '예산 심의에 갔습니다. 장비 예산은 깎였고, 민간 군사기업 계약 예산은 늘었습니다.', k: 'note', fx: { h: -1 } })),
  ev('col_gov_dir_press', 'COL_GOV', 'director', [35, 70], 30, 2, (s) => ({ t: '기자회견을 했습니다. 질문 다섯 개 중 넷은 미리 받은 것이었고, 하나는 아니었습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('col_gov_dir_election', 'COL_GOV', 'director', [35, 70], 25, 4, (s) => ({ t: '선거철이었습니다. 득표율 71%. 국장 자리는 임명직이었고, 임명하는 사람은 늘 같았습니다.', k: 'note', f: F('연방 선거관리국 대통령 선거 결과 공고, ' + s.year + '년') })),
  transition('col_gov_transition', 'COL_GOV', {
    officer: (s) => '정식 경관이 되었습니다. 배지 번호가 나왔고, 번호로 불리는 데 익숙해졌습니다.',
    chief: (s) => '반장이 되었습니다. 책상이 생겼고, 순찰차에서 내려왔습니다.',
    director: (s) => '국장이 되었습니다. 임명장에 대통령 서명이 있었습니다.',
  }),
  aftermath('col_gov_after', 'COL_GOV', {
    kia: (s) => '근무 중 다쳤습니다. 훈장과 조기 퇴직 서류가 함께 왔습니다.',
    scandal: (s) => '발포 명령 조사에 이름이 올랐습니다. 징계는 가벼웠고, 이름은 지워지지 않았습니다.',
    layoff: (s) => '조직 개편으로 자리가 없어졌습니다. 공고 한 장이었습니다.',
  }),
  { id: 'col_gov_federal', a: [18, 60], tags: ['aff:COL_GOV_FEDERAL'], w: 25, gap: 3,
    run: (s) => ({ t: '연방군 훈련이었습니다. 교관은 전쟁 이야기를 하지 않았고, 신장비 이야기만 했습니다.', k: 'ev', fx: { cap: { skill: 0.04 } } }) },
  { id: 'col_gov_agency', a: [18, 60], tags: ['aff:COL_GOV_AGENCY'], w: 25, gap: 3,
    run: (s) => ({ t: '관리국 서류 더미였습니다. 도장을 하루 이백 번 찍었고, 그중 몇 장이 사람의 거주지를 정했습니다.', k: 'note' }) },

  // COL_MEDIA 방송·영화(A12) — staff / rookie / star
  ev('col_med_staff_set', 'COL_MEDIA', 'staff', [16, 45], 30, 2, (s) => ({ t: '촬영장 스태프였습니다. 새벽 네 시에 조명을 세우고, 밤 열한 시에 걷었습니다.', k: 'ev', fx: { hl: -2, cap: { skill: 0.03 } } })),
  ev('col_med_staff_extra', 'COL_MEDIA', 'staff', [16, 45], 25, 3, (s) => ({ t: '단역이 모자라 카메라 앞에 섰습니다. 대사는 없었고, 뒷모습만 나왔습니다.', k: 'note', fx: { h: 1 } })),
  ev('col_med_rookie_audition', 'COL_MEDIA', 'rookie', [17, 45], 30, 2, (s) => ({ t: '오디션이었습니다. 삼십 초 연기하고 세 시간 기다렸습니다. 연락은 오지 않았고, 다음 오디션이 왔습니다.', k: 'ev', fx: { h: -1, standing: 2 } })),
  ev('col_med_rookie_radio', 'COL_MEDIA', 'rookie', [17, 45], 25, 3, (s) => ({ t: '라디오 생방송에 들어갔습니다. 목소리가 떨렸고, 진행자는 그걸 "신선하다"고 했습니다.', k: 'ev', fx: { cap: { arts: 0.03 } } })),
  ev('col_med_star_premiere', 'COL_MEDIA', 'star', [20, 65], 30, 2, (s) => ({ t: '시사회였습니다. 제 이름이 포스터 두 번째 줄에 있었고, 첫 줄 사람은 오지 않았습니다.', k: 'ev', fx: { standing: 3, money: medX(s, 0.5) } })),
  ev('col_med_star_tabloid', 'COL_MEDIA', 'star', [20, 65], 25, 3, (s) => ({ t: '신문 연예면에 사진이 났습니다. 사실 절반, 꾸민 것 절반. 소속사는 그걸로 충분하다고 했습니다.', k: 'note', fx: { h: -1 } })),
  transition('col_media_transition', 'COL_MEDIA', {
    rookie: (s) => '카메라 앞으로 갔습니다. 신인이라는 말이 이름 앞에 붙었습니다.',
    star: (s) => '포스터에 이름이 올랐습니다. 거리에서 알아보는 사람이 생겼고, 모자를 쓰기 시작했습니다.',
  }),
  aftermath('col_media_after', 'COL_MEDIA', {
    scandal: (s) => '기사가 났습니다. 소속사는 하루 만에 계약을 정리했고, 전화번호를 바꿨습니다.',
    fade: (s) => '섭외가 끊겼습니다. 한 해를 기다렸고, 두 해째에는 기다리지 않았습니다.',
    accident: (s) => '촬영 중 사고였습니다. 살았고, 카메라 앞에는 다시 서지 못했습니다.',
  }),
  { id: 'col_med_rankwood', a: [16, 65], tags: ['aff:COL_MED_RANKWOOD'], w: 25, gap: 3,
    run: (s) => ({ t: '랭크우드 세트장은 도시 한 구역이었습니다. 가짜 거리 끝에 진짜 판자촌이 보였고, 카메라는 그쪽을 찍지 않았습니다.', k: 'note' }) },
  { id: 'col_med_tbs', a: [16, 65], tags: ['aff:COL_MED_TBS'], w: 25, gap: 3,
    run: (s) => ({ t: 'TBS 라디오 부스에서 밤 방송을 했습니다. 사연 편지 중 셋은 보험료 이야기였고, 하나만 읽었습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }) },

  // COL_LAW 변호사·전문직(A10) — school / inhouse / partner
  ev('col_law_school_case', 'COL_LAW', 'school', [22, 32], 30, 2, (s) => ({ t: '판례집이 책상 높이였습니다. 다 읽었고, 시험에 나온 것은 세 쪽이었습니다.', k: 'ev', fx: { cap: { learn: 0.05 }, hl: -1 } })),
  ev('col_law_school_loan', 'COL_LAW', 'school', [22, 32], 25, 3, (s) => ({ t: '학자금 대출을 늘렸습니다. 졸업하면 갚을 수 있다고들 했습니다.', k: 'bad', fx: { money: -medX(s, 0.5) } })),
  ev('col_law_inhouse_contract', 'COL_LAW', 'inhouse', [25, 60], 30, 2, (s) => ({ t: '계약서 검토였습니다. 쉰 장 중 한 줄을 고쳤고, 그 한 줄이 회사 돈 수백 명분을 지켰습니다.', k: 'ev', fx: { standing: 3 } })),
  ev('col_law_inhouse_claim', 'COL_LAW', 'inhouse', [25, 60], 25, 3, (s) => ({ t: '감염자 직원 해고 건이 올라왔습니다. 법적으로는 문제가 없었습니다. 그렇게 썼습니다.', k: 'bad', fx: { h: -2 } })),
  ev('col_law_partner_name', 'COL_LAW', 'partner', [30, 70], 30, 2, (s) => ({ t: '회사 이름에 제 이름이 들어갔습니다. 간판을 바꾸는 데 한 주, 익숙해지는 데 한 해가 걸렸습니다.', k: 'ev', fx: { standing: 3, money: medX(s, 1) } })),
  ev('col_law_partner_frontier', 'COL_LAW', 'partner', [30, 70], 20, 4, (s) => ({ t: '개척지 보급 소송을 무료로 맡았습니다. 이겼습니다. 사무실 사람들은 왜 맡았는지 묻지 않았습니다.', k: 'warm', fx: { h: 3 } })),
  transition('col_law_transition', 'COL_LAW', {
    inhouse: (s) => '변호사 자격을 얻어 사내 변호사가 되었습니다. 첫 급여로 대출 이자를 냈습니다.',
    partner: (s) => '파트너가 되었습니다. 방이 넓어졌고, 밤도 길어졌습니다.',
  }),
  aftermath('col_law_after', 'COL_LAW', {
    scandal: (s) => '징계가 내려왔습니다. 자격은 남았고, 의뢰인은 남지 않았습니다.',
    bankrupt: (s) => '사무소가 문을 닫았습니다. 학자금 대출은 닫히지 않았습니다.',
    infected: (s) => '판정이 나자 의뢰인이 하나씩 떠났습니다. 명문대 학위도 안정된 수입을 지켜 주지 못했습니다.',
  }),
  { id: 'col_law_rhodes_legal', a: [25, 65], tags: ['track:COL_LAW', '!rhodes'], w: 8, gap: 8, c: (s) => !!tr(s) && tr(s).stage >= 1,
    run: (s) => { s.S.flags.rhodes_legal = s.S.age; return { t: '로도스 아일랜드 쪽 계약 서류를 검토했습니다. 상대 법무 담당이 제 명함을 챙겨 갔습니다.', k: 'note' }; } },
  { id: 'col_law_litigation', a: [25, 70], tags: ['aff:COL_LAW_LITIGATION'], w: 25, gap: 3,
    run: (s) => ({ t: '법정에 섰습니다. 상대 변호사는 학교 선배였고, 판결 뒤에 같이 ' + eul(cul(s).drink) + ' 마셨습니다.', k: 'ev', fx: { cap: { ties: 0.02 } } }) },

  // COL_EXEC 기업 과두(A10) — exec / ceo / elite
  ev('col_exec_exec_jet', 'COL_EXEC', 'exec', [28, 70], 30, 2, (s) => ({ t: '회사 전용 비행선으로 세 도시를 하루에 돌았습니다. 어느 도시였는지는 비서가 알았습니다.', k: 'ev', fx: { hl: -1, standing: 2 } })),
  ev('col_exec_exec_lobby', 'COL_EXEC', 'exec', [28, 70], 25, 3, (s) => ({ t: '의원 하나와 저녁을 먹었습니다. 법안 조항 하나가 다음 주에 바뀌었습니다.', k: 'note', fx: { money: -medX(s, 1) } })),
  ev('col_exec_ceo_cut', 'COL_EXEC', 'ceo', [32, 75], 30, 2, (s) => ({ t: '공장 2곳을 닫기로 결정했습니다. 서명 한 번이었고, 그 도시 2곳은 다음 분기 보고서에서 사라졌습니다.', k: 'bad', fx: { h: -2, money: medX(s, 5) }, f: F('컬럼비아 제조업협회 공장 폐쇄 집계, ' + s.year + '년') })),
  ev('col_exec_ceo_president', 'COL_EXEC', 'ceo', [32, 75], 25, 4, (s) => ({ t: '대통령 만찬에 초대받았습니다. 대통령은 늘 같은 사람이었고, 초대 명단도 거의 같았습니다.', k: 'note', fx: { standing: 3 } })),
  ev('col_exec_elite_ten', 'COL_EXEC', 'elite', [40, 80], 30, 3, (s) => ({ t: '열 사람이 모이는 방에 들어갔습니다. 그 방에서 정한 것이 다음 해 신문에 "시장"이라는 이름으로 실렸습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('col_exec_elite_heir', 'COL_EXEC', 'elite', [45, 80], 25, 4, (s) => ({ t: '후계를 정해야 했습니다. 자식과 회사 사람 중에서. 둘 다 저를 닮았고, 다른 쪽을 닮았습니다.', k: 'note' })),
  transition('col_exec_transition', 'COL_EXEC', {
    ceo: (s) => '최고경영자가 되었습니다. 신문 경제면에 사진이 실렸고, 사진 아래 숫자가 이름보다 컸습니다.',
    elite: (s) => '열 사람 중 하나로 불리게 되었습니다. 공식 명칭은 없었고, 모두가 그 말을 알았습니다.',
  }),
  aftermath('col_exec_after', 'COL_EXEC', {
    arrest: (s) => '수사가 들어왔습니다. 변호사 열 명이 붙었고, 형량은 그 열 명만큼 줄었습니다.',
    bankrupt: (s) => '회사가 넘어갔습니다. 이름은 남았고, 그 이름은 더 이상 제 것이 아니었습니다.',
  }),
  { id: 'col_exe_simon_1091', a: [28, 80], tags: ['aff:COL_EXE_SIMON'], w: 100, c: (s) => s.year === 1091,
    run: (s) => { s.applyExit('demote', 'bankrupt'); return { t: '1091년, 사이먼사가 무너졌습니다. 하루 사이였습니다. 계좌가 묶였고, 전화는 받지 않는 쪽이 늘었습니다.', k: 'bad', fx: { money: -medX(s, 5), h: -5 }, f: F('연방 증권위원회 사이먼사 청산 공고, 1091년') }; } },
  { id: 'col_exe_maylander', a: [28, 80], tags: ['aff:COL_EXE_MAYLANDER'], w: 20, gap: 4,
    run: (s) => ({ t: '메이랜더 재단 이사회였습니다. 자선 사업 보고와 요원 양성 예산이 같은 장에 있었습니다.', k: 'note' }) },
  { id: 'col_exe_hyde', a: [28, 80], tags: ['aff:COL_EXE_HYDE'], w: 20, gap: 4,
    run: (s) => ({ t: '하이드 형제 쪽 사업 회의였습니다. 형제는 서로 말하지 않았고, 저희를 통해 말했습니다.', k: 'note', fx: { h: -1 } }) },
];

// ────────────────────────────────────────────────────────────────────────────
// 혼인·주거 결정 덮어쓰기(국가별 build/apply). 시라쿠사 파일이 이 객체에 자기 항목을 더한다.
// 결정 id 는 엔진과 같아야 그쪽을 대체하므로, 거주국이 여기 없으면 엔진 기본 build/apply 로 넘긴다.
// ────────────────────────────────────────────────────────────────────────────
export const W9E_OVERRIDES = {
  columbia: {
    marry_civil: {
      build: (s, pr, t) => ({ title: '혼인 신고', body: wa(pr.name) + ' 시청에 혼인 신고를 하기로 했습니다. 서류 두 장, 증인 둘, 수수료 한 줄.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람입니다.' : ''),
        choices: [{ k: 'accept', label: '신고한다', auto: 3 }, { k: 'hold', label: '한 해 미룬다', auto: 1 }, { k: 'decline', label: '하지 않는다', auto: 0.6 }] }),
      text: { accept: (s, pr) => wa(pr.name) + ' 혼인 신고를 마쳤습니다. 창구 직원이 "축하합니다"를 서류 넘기는 속도로 말했습니다.', hold: '신고를 미루었습니다. 서류는 서랍에 두었습니다.', decline: '신고하지 않기로 했습니다.' },
    },
    marry_church: {
      build: (s, pr, t) => ({ title: '교회 혼인', body: wa(pr.name) + ' 교회에서 식을 올리기로 했습니다. 하객 명단에 회사 사람이 절반이었습니다.' + (t.dowry ? ' 식 비용은 ' + fmt(s.med * t.dowry) + '.' : ''),
        choices: [{ k: 'accept', label: '식을 올린다', auto: 3 }, { k: 'hold', label: '미룬다', auto: 1 }, { k: 'decline', label: '하지 않는다', auto: 0.6 }] }),
      text: { accept: (s, pr) => wa(pr.name) + ' 교회에서 결혼했습니다. 종이 울렸고, 사진사가 가장 바빴습니다.', hold: '식을 미루었습니다.', decline: '하지 않기로 했습니다.' },
    },
    marry_prenup: {
      build: (s, pr, t) => ({ title: '혼전 계약 혼인', body: wa(pr.name) + ' 결혼하기 전에 변호사 둘이 먼저 만났습니다. 재산 분할 조항 열두 개, 광석병 조항 하나. 계약 비용은 ' + fmt(s.med * Math.abs(t.dowry || 2)) + '.',
        choices: [{ k: 'accept', label: '서명한다', auto: 2.5 }, { k: 'hold', label: '조항을 더 본다', auto: 1 }, { k: 'decline', label: '결혼하지 않는다', auto: 0.6 }] }),
      text: { accept: (s, pr) => wa(pr.name) + ' 결혼했습니다. 계약서는 금고에, 결혼사진은 거실에 두었습니다.', hold: '조항을 더 보기로 했습니다. 변호사 비용이 한 달 더 들었습니다.', decline: '결혼하지 않기로 했습니다. 변호사들은 수수료를 받았습니다.' },
    },
    marry_frontier: {
      build: (s, pr, t) => ({ title: '개척지 혼인', body: wa(pr.name) + ' 개척지에서 식을 올리기로 했습니다. 보안관이 주례, 긴 식탁이 피로연장. 서류는 다음에 도시 가는 사람이 가져갑니다.',
        choices: [{ k: 'accept', label: '식을 올린다', auto: 3 }, { k: 'hold', label: '수확 뒤로 미룬다', auto: 1 }, { k: 'decline', label: '하지 않는다', auto: 0.5 }] }),
      text: { accept: (s, pr) => wa(pr.name) + ' 개척지에서 결혼했습니다. 울타리 안 모두가 왔고, 선물은 공구와 씨앗이었습니다.', hold: '수확 뒤로 미루었습니다.', decline: '하지 않기로 했습니다.' },
    },
    home_change: {
      build: (s, opts) => ({ title: '집', body: '집을 살 만큼 모였습니다. 은행은 대출 조건을, 보험협회는 거주지 위험 등급을 먼저 보냈습니다.',
        choices: opts.map((h) => ({ k: h.id, label: h.name, sub: fmt(s.med * h.buy) + (h.id === 'frontier_cabin' ? ' · 재앙 등급 높음' : ''), auto: h.w ?? 1 })).concat([{ k: 'no', label: '임대로 산다', auto: 1 }]) }),
      text: { no: '임대로 더 살기로 했습니다. 집세는 다음 달에 또 올랐습니다.', fail: '대출이 나오지 않았습니다.', ok: (s, h) => ro(h.name) + ' 옮겼습니다. 열쇠와 함께 대출 상환표가 왔습니다.' },
    },
  },
};

/** marry_<type> 결정: 거주국에 덮어쓰기가 있으면 그 문구, 없으면 엔진 기본 */
function marryDecision(type) {
  const base = ENGINE_DECISIONS.marry;
  return {
    once: false, at: 0.45,
    ok: (s) => { const b = base.ok(s); return b && !!(s.S.flags.y_marry && s.S.flags.y_marry.v && s.S.flags.y_marry.v.type.id === type); },
    build: (s, p) => {
      const r = s.S.flags.y_marry && s.S.flags.y_marry.v; if (!r) return null; Object.assign(p, r);
      const ov = W9E_OVERRIDES[s.S.cur] && W9E_OVERRIDES[s.S.cur]['marry_' + type];
      if (!ov) return base.build(s, p);
      return ov.build(s, r.prospect, r.type);
    },
    apply: (s, k, p) => {
      const ov = W9E_OVERRIDES[s.S.cur] && W9E_OVERRIDES[s.S.cur]['marry_' + type];
      if (!ov) return base.apply(s, k, p);
      s.S.flags.y_marry = null;
      if (k !== 'accept') return typeof ov.text[k] === 'function' ? ov.text[k](s, p.prospect) : ov.text[k];
      if (familyOpposes(s, p.prospect)) return { t: ov.oppose || '가족이 반대했습니다. 종족이 다르다는 이유였습니다. 혼담은 깨졌습니다.', k: 'bad' };
      if (!marry(s, p.prospect, p.type, { quiet: true })) return '혼인은 이루어지지 않았습니다.';
      return { t: ov.text.accept(s, p.prospect), k: 'warm' };
    },
  };
}
export { marryDecision };

/** home_change 결정: 거주국 덮어쓰기 또는 엔진 기본 */
export const homeChangeDecision = {
  once: false, gap: 5, at: 0.7,
  ok: (s) => ENGINE_DECISIONS.home_change.ok(s),
  build: (s, p) => {
    const ov = W9E_OVERRIDES[s.S.cur] && W9E_OVERRIDES[s.S.cur].home_change;
    if (!ov) return ENGINE_DECISIONS.home_change.build(s, p);
    const opts = homeChangeOptions(s).slice(0, 3); if (!opts.length) return null;
    return ov.build(s, opts);
  },
  apply: (s, k, p) => {
    const ov = W9E_OVERRIDES[s.S.cur] && W9E_OVERRIDES[s.S.cur].home_change;
    if (!ov) return ENGINE_DECISIONS.home_change.apply(s, k, p);
    if (k === 'no') return ov.text.no;
    const h = homeChangeOptions(s).find((x) => x.id === k);
    if (!h || !setHousing(s, h, { buy: true, quiet: true })) return ov.text.fail;
    return { t: ov.text.ok(s, h), k: 'ev' };
  },
};

// ────────────────────────────────────────────────────────────────────────────
// 결정
// ────────────────────────────────────────────────────────────────────────────
export const decisions = {
  // ── 보험(COL_INSURANCE forced 진입·분기). 미납 1년째에 열린다(2년째는 엔진이 추방) ──
  col_insurance_default: {
    tags: ['columbia', 'known'], once: false, gap: 1,
    ok: (s) => !!s.S.flags.oriPremium && (s.S.flags.premiumMissed || 0) >= 1 && !(tr(s) && tr(s).id === 'COL_INSURANCE') && s.S.cur === 'columbia',
    build: (s) => ({ title: '보험료 미납', body: '보험료를 내지 못했습니다. 보험협회의 두 번째 통지서에는 세 가지 길이 적혀 있었습니다.', fact: F('보험협회 미납 처리 지침, 연체 2회 시 거주 자격 상실'),
      choices: [{ k: 'borrow', label: '빚을 내어 낸다', sub: fmt(s.med) + ' 상당', auto: s.S.money > s.med ? 2 : 0.5 }, { k: 'public', label: '공공보험 격리구역으로', sub: '보험료 없음, 구역 밖 출입 제한', auto: 1.5 }, { k: 'frontier', label: '개척지로 간다', sub: '보험료 없음, 치료 없음', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'borrow') { s.S.money -= s.med; s.S.flags.premiumMissed = 0; return { t: '빚을 내어 보험료를 냈습니다. 다음 청구서는 한 달 뒤에 옵니다.', k: 'bad' }; }
      s.S.flags.oriPremium = 0; s.S.flags.premiumMissed = 0;
      s.enterTrack('COL_INSURANCE', { how: 'forced', via: 'default', stage: k === 'public' ? 1 : 2, quiet: true });
      return k === 'public' ? { t: '민영 보험을 포기했습니다. 공공보험 격리구역으로 옮겨졌고, 주소가 구역 번호로 바뀌었습니다.', k: 'bad', fx: { h: -5 } }
        : { t: '개척지로 가는 차에 올랐습니다. 보험협회의 마지막 서류에는 "자발적 전출"이라고 적혀 있었습니다.', k: 'bad', fx: { h: -4 } };
    },
  },
  // 진로 없는 감염자가 보험을 유지하는 경우: 보험 의존 생활(private 단계) 진입
  col_insurance_dependent: {
    tags: ['columbia', 'known'], once: true,
    ok: (s) => !!s.S.flags.oriPremium && !tr(s) && s.S.age >= 15 && (s.S.flags.joblessYears || 0) >= 1 && s.S.cur === 'columbia',
    build: (s) => ({ title: '보험료를 내는 삶', body: '판정 뒤로 일자리가 들어오지 않았습니다. 보험료는 매달 옵니다. 묻지 않는 일자리가 있다고들 합니다.',
      choices: [{ k: 'go', label: '그 일을 한다', sub: '보험료를 위해', auto: 2 }, { k: 'no', label: '버틴다', auto: 1 }] }),
    apply: (s, k) => { if (k !== 'go') return '한 해를 더 버티기로 했습니다.'; s.enterTrack('COL_INSURANCE', { how: 'forced', via: 'premium', stage: 0, quiet: true }); return { t: '보험료를 내기 위한 일을 시작했습니다. 일터는 묻지 않았고, 묻지 않는 만큼 적게 주었습니다.', k: 'ev' }; },
  },
  col_insurance_fake: {
    tags: ['columbia', 'known'], once: false, gap: 3,
    ok: (s) => s.S.money >= s.med * 0.5 && !s.S.rhodes && yr(s, 'colfake', 0.2),
    build: (s) => ({ title: '싼 억제제', body: '체인 가게에서 억제제를 반값에 판다고 했습니다. 상자에는 효능이 길게, 제조사는 짧게 적혀 있었습니다. 값은 ' + fmt(s.med * 0.3) + '.',
      choices: [{ k: 'buy', label: '산다', auto: 1.5 }, { k: 'no', label: '사지 않는다', auto: 1 }] }),
    apply: (s, k) => { if (k !== 'buy') return '사지 않았습니다.'; s.S.money -= Math.round(s.med * 0.3); if (s.rng.chance(0.65)) return { t: '먹었습니다. 통증은 조금 가라앉았고, 수치는 그대로였습니다. 진통제였습니다.', k: 'bad', fx: { h: -2 } }; s.S.flags.suppressant = true; return { t: '먹었습니다. 올해 수치가 조금 늦게 올랐습니다. 다음 상자는 같은 것이 아닐 수도 있습니다.', k: 'ev' }; },
  },

  // ── 라인 랩(A9): 자가 실험·은폐 ──
  col_rhine_self_experiment: {
    tags: ['track:COL_RHINE'], once: false, gap: 5,
    ok: (s) => onT(s, 'COL_RHINE') && tr(s).stage >= 1 && tr(s).stage <= 2 && s.S.age >= 24 && yr(s, 'colself', 0.18),
    build: (s) => ({ title: '자가 실험', body: '피험자 승인이 나지 않았습니다. 실험 일정은 나 있었습니다. 제 몸에 하면 서류가 필요 없습니다.',
      choices: [{ k: 'no', label: '승인을 기다린다', sub: '실적 지연', auto: 2 }, { k: 'yes', label: '제 몸에 한다', sub: '큰 보상, 큰 위험', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'no') { s.S.track.standing = Math.max(0, s.S.track.standing - 3); return { t: '승인을 기다렸습니다. 일정은 한 해 밀렸고, 옆 섹션이 먼저 발표했습니다.', k: 'note', fx: { h: -1 } }; }
      const r = s.rng.rnd();
      if (r < 0.5) { s.S.track.standing = Math.min(100, s.S.track.standing + 20); s.promote({ quiet: true }); return { t: '성공했습니다. 결과가 학회에 나갔고, 제 이름이 첫 줄에 있었습니다. 몸은 두 달 뒤에 회복되었습니다.', k: 'big', fx: { hl: -8, cap: { learn: 0.4 } } }; }
      if (r < 0.8) { if (!s.S.ori.on) s.infect('work'); return { t: '실험 중 시약이 새었습니다. 결과는 나왔고, 몸에는 다른 결과가 남았습니다.', k: 'bad', fx: { hl: -15, h: -5 } }; }
      s.S.flags.fall_experiment_survive = s.S.age; s.applyExit('death:experiment', 'accident'); return false;
    },
  },
  col_rhine_coverup: {
    tags: ['track:COL_RHINE'], once: false, gap: 6,
    ok: (s) => onT(s, 'COL_RHINE') && tr(s).stage >= 1 && yr(s, 'colcover', 0.15),
    build: (s) => ({ title: '사고 보고서', body: '실험실 사고가 있었습니다. 보고서 초안에는 "장비 결함"이라고 적혀 있었고, 장비는 멀쩡했습니다. 서명란이 비어 있습니다.',
      choices: [{ k: 'sign', label: '서명한다', sub: '섹션 보호', auto: 2 }, { k: 'refuse', label: '서명하지 않는다', sub: '평가 하락', auto: 1 }] }),
    apply: (s, k) => { if (k === 'sign') return { t: '서명했습니다. 보고서는 접수되었고, 다친 사람의 이름은 보고서에 없었습니다.', k: 'bad', fx: { h: -3, standing: 5 } }; return { t: '서명하지 않았습니다. 다른 사람이 했고, 제 연말 평가가 한 칸 내려갔습니다.', k: 'note', fx: { standing: -8, h: 1 } }; },
  },

  // ── 블랙스틸(A6): 연습생 평가(76% 탈락)·감염 5규칙 ──
  col_bsw_eval: {
    tags: ['track:COL_BSW:trainee'], once: false,
    ok: (s) => onT(s, 'COL_BSW') && tr(s).years >= 2 && !s.S.flags.bswEvalAt,
    build: (s) => ({ title: '최종 평가', body: '두 해 훈련이 끝났습니다. 내일이 평가입니다. 넷 중 하나만 오퍼레이터 계약서를 받습니다.', fact: F('블랙스틸 포트 배런 모집센터 연습생 평가 기준, 탈락률 76%'),
      choices: [{ k: 'go', label: '평가를 받는다', auto: 4 }, { k: 'quit', label: '평가 전에 나간다', sub: '탈락 기록 없음', auto: 0.5 }] }),
    apply: (s, k) => {
      s.S.flags.bswEvalAt = s.S.age;
      if (k === 'quit') { s.leaveTrack('expel', { quiet: true }); return { t: '평가 전날 짐을 쌌습니다. 기록에는 "자진 퇴소"라고 남았습니다.', k: 'loss' }; }
      const z = s.S.cap.skill; const p = Math.min(0.6, Math.max(0.1, 0.24 + 0.15 * z));
      if (s.rng.chance(p)) { s.promote({ force: true, quiet: true }); return { t: '통과했습니다. 오퍼레이터 계약서에 서명했고, 침상 옆자리 셋은 비어 있었습니다.', k: 'big', fx: { h: 5, standing: 10 } }; }
      s.fall('elimination'); return false;
    },
  },
  col_bsw_infected_rule: {
    tags: ['track:COL_BSW', 'known'], once: true,
    ok: (s) => onT(s, 'COL_BSW') && tr(s).stage >= 1 && tr(s).stage <= 2,
    build: (s) => ({ title: '감염자 운용 규정', body: '판정 결과가 회사에 들어갔습니다. 규정은 다섯 줄입니다. 경증은 허가 뒤 합동 임무, 중등증은 단독 임무, 중증은 퇴직금과 계약 해지.',
      choices: [{ k: 'solo', label: '단독 임무를 받는다', sub: '위험 높음, 계약 유지', auto: 2 }, { k: 'quit', label: '퇴직금을 받고 나간다', auto: 1 }] }),
    apply: (s, k) => { if (k === 'quit') { s.S.money += Math.round(s.med * 1.5); s.leaveTrack('expel', { quiet: true }); return { t: '퇴직금을 받았습니다. 계약 해지 통지와 같은 봉투였습니다.', k: 'loss' }; } s.S.track.standing = Math.min(100, s.S.track.standing + 5); return { t: '단독 임무로 분류되었습니다. 같은 차를 타는 사람이 없어졌습니다.', k: 'bad', fx: { h: -3 } }; },
  },

  // ── 개척민(A11): 고리대·모집 전단 ──
  col_frontier_loan: {
    tags: ['track:COL_FRONTIER'], once: false, gap: 4,
    ok: (s) => onT(s, 'COL_FRONTIER') && tr(s).stage >= 1 && yr(s, 'colloan', 0.25),
    build: (s) => ({ title: '은행 대출', body: '은행 사람이 왔습니다. 농기구와 종자 값을 빌려 주겠다고 했습니다. 이자는 두 자리, 담보는 땅이었습니다.',
      choices: [{ k: 'take', label: '빌린다', sub: fmt(s.med * 2), auto: 1.5 }, { k: 'no', label: '빌리지 않는다', auto: 1 }] }),
    apply: (s, k) => { if (k !== 'take') return '빌리지 않았습니다. 올해도 손으로 갈았습니다.'; s.S.money += Math.round(s.med * 2); s.S.flags.frontierLoan = (s.S.flags.frontierLoan || 0) + 1; if (s.rng.chance(0.35)) { s.S.flags.frontierLoanDue = s.S.age + 3; } return { t: '빌렸습니다. 농기구가 왔고, 상환표도 왔습니다.', k: 'ev' }; },
  },
  col_frontier_foreclose: {
    tags: ['track:COL_FRONTIER'], once: false, gap: 3,
    ok: (s) => onT(s, 'COL_FRONTIER') && !!s.S.flags.frontierLoanDue && s.S.age >= s.S.flags.frontierLoanDue && s.S.money < s.med * 2,
    build: (s) => ({ title: '상환일', body: '상환일이 왔습니다. 돈은 없고, 은행은 땅 서류를 가져왔습니다.',
      choices: [{ k: 'sell', label: '땅을 넘긴다', auto: 2 }, { k: 'fight', label: '변호사를 찾는다', sub: '비용, 낮은 승산', auto: 1 }] }),
    apply: (s, k) => { s.S.flags.frontierLoanDue = null; if (k === 'fight' && s.rng.chance(0.3)) { s.S.money -= Math.round(s.med * 0.3); return { t: '소송에서 이겼습니다. 은행은 상환 기한을 늘렸고, 변호사는 수수료를 받았습니다.', k: 'warm', fx: { h: 3 } }; } s.fall('ruin'); return false; },
  },
  col_frontier_recruit: {
    tags: ['columbia'], once: false, gap: 6,
    ok: (s) => !tr(s) && s.S.age >= 16 && s.S.age <= 45 && (s.S.flags.joblessYears || 0) >= 2 && s.S.q <= 3 && !s.S.prison && !s.S.school && yr(s, 'colrecruit', 0.4),
    build: (s) => ({ title: '컬럼비아 드림', body: '라디오에서 개척민을 모집했습니다. 땅과 집과 일자리. 조건은 한 줄, 작은 글씨는 열 줄이었습니다.',
      choices: [{ k: 'go', label: '간다', auto: 2 }, { k: 'no', label: '도시에 남는다', auto: 1 }] }),
    apply: (s, k) => { if (k !== 'go') return '도시에 남았습니다. 라디오는 다음 주에도 같은 광고를 했습니다.'; s.S.urban = false; return s.enterTrack('COL_FRONTIER', { via: 'team', quiet: true }) ? { t: '개척단 차에 올랐습니다. 사흘을 달렸고, 내린 곳에는 울타리 기둥만 박혀 있었습니다.', k: 'ev' } : '자리가 없었습니다.'; },
  },

  // ── 회사원(A10): 발령·이직 ──
  col_office_transfer: {
    tags: ['track:COL_OFFICE'], once: false, gap: 5,
    ok: (s) => onT(s, 'COL_OFFICE') && tr(s).stage >= 1 && yr(s, 'coltransfer', 0.15),
    build: (s) => ({ title: '발령', body: '지사 발령과 경쟁사 제안이 같은 주에 왔습니다. 지사는 월급이 같고, 경쟁사는 직함이 하나 높습니다.',
      choices: [{ k: 'branch', label: '지사로 간다', sub: '평가 상승', auto: 1.5 }, { k: 'rival', label: '경쟁사 제안을 본다', sub: '다른 길이 열림', auto: 1 }, { k: 'stay', label: '그대로 있는다', auto: 1.5 }] }),
    apply: (s, k) => { if (k === 'branch') return { t: '지사로 갔습니다. 이사 비용은 회사가 냈고, 적응 비용은 제가 냈습니다.', k: 'ev', fx: { standing: 8, h: -2 } }; if (k === 'rival') { s.S.flags.switchOpen = true; return { t: '경쟁사 사람과 점심을 먹었습니다. 명함을 받았고, 다른 길이 보였습니다.', k: 'note' }; } return '그대로 있기로 했습니다.'; },
  },
  col_office_layoff_list: {
    tags: ['track:COL_OFFICE:manager'], once: true,
    ok: (s) => onT(s, 'COL_OFFICE') && yr(s, 'collist', 0.3),
    build: (s) => ({ title: '명단', body: '팀에서 둘을 줄여야 합니다. 명단은 제가 씁니다. 가장 오래된 사람과 가장 어린 사람, 둘 중 하나는 들어가야 합니다.',
      choices: [{ k: 'senior', label: '오래된 사람을 적는다', sub: '퇴직금이 크다', auto: 1 }, { k: 'junior', label: '어린 사람을 적는다', sub: '다시 구할 수 있다', auto: 1 }, { k: 'me', label: '제 이름을 적는다', auto: 0.3 }] }),
    apply: (s, k) => { if (k === 'me') { s.leaveTrack('expel', { quiet: true }); return { t: '제 이름을 적었습니다. 윗사람은 놀라지 않았고, 서류는 그대로 올라갔습니다.', k: 'loss', fx: { h: 2 } }; } return { t: k === 'senior' ? '오래된 사람을 적었습니다. 그 사람은 제게 처음 복사기 쓰는 법을 가르쳐 준 사람이었습니다.' : '어린 사람을 적었습니다. 그 사람은 제 첫해와 똑같은 얼굴로 상자를 들고 나갔습니다.', k: 'bad', fx: { h: -4, standing: 4 } }; },
  },

  // ── 공무원·경찰(A4): 발포 명령 ──
  col_gov_fire_order: {
    tags: ['track:COL_GOV'], once: false, gap: 6,
    ok: (s) => onT(s, 'COL_GOV') && tr(s).stage >= 1 && yr(s, 'colfire', 0.12),
    build: (s) => ({ title: '명령', body: '개척지 주민들이 은행 앞에 모였습니다. 위에서 해산 명령이 왔고, 무기 사용 허가도 왔습니다.',
      choices: [{ k: 'obey', label: '명령대로 한다', auto: 1.5 }, { k: 'refuse', label: '거부한다', sub: '징계', auto: 1 }] }),
    apply: (s, k) => { if (k === 'refuse') { s.S.track.standing = Math.max(0, s.S.track.standing - 15); return { t: '거부했습니다. 다른 부대가 들어갔고, 제 이름은 징계 명단에 올랐습니다.', k: 'bad', fx: { h: 2 } }; } if (s.rng.chance(0.3)) { s.fall('scandal'); return false; } return { t: '명령대로 했습니다. 광장은 비었고, 다음 날 신문은 "질서 회복"이라고 썼습니다.', k: 'bad', fx: { h: -5, standing: 5 } }; },
  },

  // ── 방송·영화(A12): 캐스팅 ──
  col_media_casting: {
    tags: ['track:COL_MEDIA'], once: false, gap: 4,
    ok: (s) => onT(s, 'COL_MEDIA') && tr(s).stage <= 1 && yr(s, 'colcast', 0.2),
    build: (s) => ({ title: '캐스팅', body: '큰 작품 캐스팅 제안이 왔습니다. 조건이 하나 붙어 있었습니다. 감독과 저녁을 먹는 것.',
      choices: [{ k: 'go', label: '저녁을 먹는다', auto: 1 }, { k: 'no', label: '거절한다', auto: 1.5 }] }),
    apply: (s, k) => { if (k === 'no') return { t: '거절했습니다. 배역은 다른 사람에게 갔고, 그 사람은 다음 해 포스터에 있었습니다.', k: 'note', fx: { h: 1 } }; if (s.S.innate.looks >= 0.5 && s.rng.chance(0.5)) { s.promote({ quiet: true }); return { t: '배역을 받았습니다. 저녁 자리에서 무슨 말이 오갔는지는 아무에게도 말하지 않았습니다.', k: 'ev', fx: { h: -2, standing: 10 } }; } return { t: '저녁을 먹었습니다. 배역은 오지 않았습니다.', k: 'bad', fx: { h: -3 } }; },
  },

  // ── 변호사(A10): 감염 숨김 ──
  col_law_hide: {
    tags: ['track:COL_LAW', 'known'], once: true,
    ok: (s) => onT(s, 'COL_LAW') && tr(s).stage >= 1 && !s.S.flags.oriHidden,
    build: (s) => ({ title: '진단서', body: '판정이 났습니다. 의뢰인들이 알면 떠납니다. 아는 의사가 진단서 날짜를 바꿔 줄 수 있다고 했습니다. 값은 ' + fmt(s.med * 1.5) + '.',
      choices: [{ k: 'hide', label: '바꾼다', auto: 1 }, { k: 'no', label: '그대로 둔다', auto: 1.5 }] }),
    apply: (s, k) => { if (k !== 'hide') return { t: '그대로 두었습니다. 의뢰인 둘이 그달에 떠났습니다.', k: 'bad', fx: { standing: -10 } }; s.S.money -= Math.round(s.med * 1.5); s.S.flags.oriHidden = true; return { t: '진단서 날짜가 바뀌었습니다. 의뢰인들은 아직 모릅니다.', k: 'note' }; },
  },

  // ── 판자촌(A1): 갱 가입 ──
  col_slum_join: {
    tags: ['track:COL_SLUM:resident'], once: true,
    ok: (s) => onT(s, 'COL_SLUM') && s.S.age >= 13 && yr(s, 'colslum', 0.35),
    build: (s) => ({ title: '제안', body: '동네 형들이 같이 다니자고 했습니다. 팔에 표식을 새기면 밥은 나온다고 했습니다.',
      choices: [{ k: 'yes', label: '같이 다닌다', auto: 1.5 }, { k: 'no', label: '거절한다', auto: 1 }] }),
    apply: (s, k) => { if (k === 'no') { s.S.track.standing = Math.max(0, s.S.track.standing - 5); return { t: '거절했습니다. 그 뒤로 그 골목은 돌아서 다녔습니다.', k: 'note' }; } s.promote({ force: true, quiet: true }); return { t: '같이 다니게 되었습니다. 표식을 새겼고, 밥은 나왔습니다.', k: 'ev', fx: { standing: 10 } }; },
  },

  // ── 혼인·주거 덮어쓰기(엔진 id 와 같게 등록 → 그쪽 대체). 거주국이 W9E_OVERRIDES 에 없으면 엔진 문구 ──
  marry_civil: marryDecision('civil'),
  marry_church: marryDecision('church'),
  marry_prenup: marryDecision('prenup'),
  marry_frontier: marryDecision('frontier'),
  home_change: homeChangeDecision,
};

// W11: 엔진 id 와 같은 결정은 국가 디스패처로 옮긴다(여러 파일이 같은 id 를 등록해도 거주국별로 분기)
hoist(decisions, { marry_civil: ['columbia'], marry_church: ['columbia'], marry_prenup: ['columbia'], marry_frontier: ['columbia'], home_change: ['columbia'] });

export default { events, decisions };
