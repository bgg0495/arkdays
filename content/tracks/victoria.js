// W9d 빅토리아 진로 콘텐츠(v0.3): data/tracks/victoria.json 의 15진로 전용 이벤트·결정. 텍스트 공유 0(D40).
// 핵심 5: VIC_FACTORY(공장 노동, 생업·산업형) · VIC_CONSCRIPT(왕실군 징집) · VIC_KNIGHT(탑의 기사·증기 기사, ~1094) · VIC_INFECTED(감염자 노동, forced) · VIC_GANG(글래스고).
// 나머지 10은 단계마다 2개 + 전환 + 몰락 후일담. 런디니움 점령기(1094~98)는 bigevents.js 의 대사건·탈출 결정과 겹치지 않게 연동만:
//   S.flags.londinium(거주) / londiniumEscaped 를 읽고, 자경단 입단(VIC_MILITIA)·국외 피난(ctx.migrate('flee'))·탑의 기사 최후(1094)만 여기서 쓴다.
// 타라는 빅토리아의 하위 지역이라 'victoria' 태그가 타라 거주자에게도 붙는다 → 런디니움·공작령 전용 문장은 '!nation:tara'.
// home_change 와 marry_parish 는 세 나라(빅토리아·타라·카시미어) 공용 덮어쓰기로 이 파일에만 둔다(엔진 내장 결정에 위임, 다른 나라는 엔진 문구).
// 톤: 담백한 "~했습니다"체(D25), 각주는 숫자가 있을 때만(D31), 조사는 유틸(D30), 캐논 인물 1회성(D43).
import { eul, iga, eun, wa, ro, ieot, rago } from '../../src/engine/text.js';
import { cul, F, orgF, given, poor, rich, lifeRoll, once, medX, momHere, dadHere, nomadic } from '../_util.js';
import { ENGINE_DECISIONS } from '../../src/engine/choices.js';
import { hoist } from '../_dispatch.js';

const V = 'nation:victoria';   // 거주국·상위국 태그(출생국 'victoria' 맨 태그는 이주민에게도 붙으므로 쓰지 않는다)
const T = (id, st) => 'track:' + id + (st ? ':' + st : '');
const inStage = (s) => (s.S.track ? s.S.age - s.S.track.stageSince : 99);
const fresh = (s) => inStage(s) <= 1;   // 전환 서사는 gap/rep 없이 1회(엔진이 ev_ 플래그로 재선택 안 함)
const standing = (s) => (s.S.track ? s.S.track.standing : 0);
const affIs = (s, id) => !!s.S.track && s.S.track.aff === id;
const affName = (s, dflt) => (s.aff ? s.aff.name : dflt);
const left = (s, id, how, within = 2) => s.S.flags.lastTrack === id && (!how || s.S.flags.lastTrackHow === how) && s.S.age - (s.S.flags.lastTrackLeftAt ?? -99) <= within;
const demoted = (s, id) => !!s.S.track && s.S.track.id === id && s.S.flags.lastFallOutcome === 'demote' && s.S.age - (s.S.flags.lastFallAt ?? -99) <= 1;
const cameFrom = (s, id) => { const h = s.S.trackHist; return h.length > 0 && h[h.length - 1].id === id; };
const canonOk = (s, id, y0, y1) => s.year >= y0 && s.year <= y1 && (s.S.flags.canonSeen || 0) < 3 && !s.S.flags['seen_' + id];
const seeCanon = (s, id) => { s.S.flags['seen_' + id] = s.S.age; s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; };
const pct = (s, k) => -Math.round(s.S.money * k);
const known = (s) => s.S.ori.on && s.S.ori.known;
const nat = (s, id) => (s.data.nationById[id] ? s.data.nationById[id].name : id);
const occupied = (s) => s.year >= 1094 && s.year <= 1098 && !!s.S.flags.londinium && !s.S.flags.londiniumEscaped;
const inVic = (s) => s.S.cur === V;
const sarkaz = (s) => s.S.race === 'sarkaz';
const nationHousingBody = {
  victoria: '집을 마련할 만큼 모였습니다. 등기소 서류에는 소유자 칸이 있고, 그 칸이 비어 있는 집에서 지금까지 살았습니다.',
  tara: '집을 마련할 만큼 모였습니다. 오두막이든 마차든, 빅토리아 등기소가 아니라 성당 호적부에 적히는 집입니다.',
  kazimierz: '집을 마련할 만큼 모였습니다. 플레이트 위의 집은 경기장과 가까울수록 비쌉니다. 남부 농가는 밭이 딸려 옵니다.',
};

export const events = [
  // ════════════════════════════════════════════════════════════════════
  // VIC_FACTORY 공장 노동 — 조립 라인 → 반장 → 노동자 대표 → 군수공장 총책
  // ════════════════════════════════════════════════════════════════════
  { id: 'vi_fac_line_shift', a: [14, 60], tags: [T('VIC_FACTORY', 'line')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['교대 종이 울리면 라인에 서고, 종이 울리면 내려왔습니다. 하루가 종 두 번이었습니다.', '라인 끝에서 끝까지 걸으면 ' + s.rng.ri(80, 200) + '걸음이었습니다. 하루에 그 길을 마흔 번 걸었습니다.', '기계 소리에 귀가 둔해졌습니다. 집에 와서도 한참 동안 종소리가 들렸습니다.']), k: 'note', fx: { hl: -2 }, f: s.rng.chance(0.3) ? orgF(s, '공장 교대 기록') : undefined }) },
  { id: 'vi_fac_line_siblings', a: [14, 60], tags: [T('VIC_FACTORY', 'line')], w: 40, gap: 2,
    run: (s) => ({ t: '조립 라인 사람들은 서로를 형제자매라고 불렀습니다. ' + s.rng.pick(['교회 옆 연립에 같이 살았고, 같은 종에 일어났습니다.', '한 사람이 입원하면 다른 사람이 그 자리와 제 자리를 같이 섰습니다.', '월급날 펍에서 첫 잔은 늘 라인 반장이 샀습니다.']), k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } }) },
  { id: 'vi_fac_line_accident', a: [14, 60], tags: [T('VIC_FACTORY', 'line')], w: 35, gap: 3,
    run: (s) => ({ t: '옆 라인에서 사고가 났습니다. ' + s.rng.pick(['동료 하나가 병원에 갔고, 관리자는 "안전선 안으로"라고만 했습니다.', '장례는 짧았습니다. 공장은 그날 오후에 다시 돌았습니다.', '사고 기계는 다음 날 같은 자리에서 돌았습니다. 사람만 바뀌었습니다.']), k: 'bad', fx: { h: -3 } }) },
  { id: 'vi_fac_line_strike_seen', a: [16, 60], tags: [T('VIC_FACTORY', 'line')], w: 45, c: (s) => !s.S.flags.facStrikeAsked && inStage(s) >= 1,
    run: (s) => { s.S.flags.facStrikeOffer = s.S.age; return { t: '동료가 죽은 뒤 라인이 멈추자는 말이 돌았습니다. 노동자 대표가 종이에 이름을 받았습니다. 종이는 제 앞에서 멈췄습니다.', k: 'note' }; } },
  { id: 'vi_fac_line_smog', a: [14, 60], tags: [T('VIC_FACTORY', 'line'), 'urban'], w: 30, gap: 3,
    run: (s) => ({ t: '스모그가 짙은 날은 공장 안이 밖보다 맑았습니다. 그래서 다들 야근을 자원했습니다. 수당보다 공기 때문이었습니다.', k: 'note', fx: { hl: -1 } }) },
  { id: 'vi_fac_fore_trn', a: [18, 60], tags: [T('VIC_FACTORY', 'foreman')], w: 300, c: (s) => fresh(s, 'VIC_FACTORY_foreman'),
    run: (s) => ({ t: '반장이 되었습니다. ' + affName(s, '공장') + ' 교대표에 제 이름이 맨 위로 올라갔습니다. 라인 사람들은 저를 형제자매 대신 반장이라고 불렀습니다. 같은 사람들이었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_fac_fore_quota', a: [18, 65], tags: [T('VIC_FACTORY', 'foreman')], w: 45, gap: 2,
    run: (s) => ({ t: '공작령 납품 할당이 내려왔습니다. ' + (occupied(s) ? '군사위원회 몫이었습니다. 거부할 칸은 없었습니다.' : '할당표에 서명한 사람은 라인을 본 적이 없는 사람이었습니다.') + ' 라인에 말했고, 라인은 저를 보았습니다.', k: 'bad', fx: { h: -3, standing: 2 } }) },
  { id: 'vi_fac_fore_hire', a: [18, 65], tags: [T('VIC_FACTORY', 'foreman')], w: 40, gap: 2,
    run: (s) => ({ t: '새 사람을 뽑았습니다. ' + s.rng.pick(['열다섯이었습니다. 나이 칸은 비워 두라고 위에서 말했습니다.', '타라 쪽에서 온 사람이었습니다. 말은 서툴렀고 손은 빨랐습니다.', '감염자였습니다. 서류상으로는 아니었고, 저는 서류만 보았습니다.']), k: 'note', fx: { h: -1, cap: { ties: 0.02 } } }) },
  { id: 'vi_fac_fore_royaldell', a: [18, 65], tags: [T('VIC_FACTORY', 'foreman'), 'aff:VIC_FAC_ROYALDELL'], w: 35, gap: 3,
    run: (s) => ({ t: '로열 델 병기창 반장은 다른 공장 반장보다 급료가 좋았습니다. 대신 만든 것이 어디로 가는지 묻지 않는 것이 급료에 들어 있었습니다.', k: 'note', fx: { money: medX(s, 0.2) } }) },
  { id: 'vi_fac_rep_trn', a: [22, 65], tags: [T('VIC_FACTORY', 'rep')], w: 300, c: (s) => fresh(s, 'VIC_FACTORY_rep'),
    run: (s) => ({ t: '노동자 대표로 뽑혔습니다. 조합 이름은 없었습니다. 그냥 "대표단"이었고, 이름이 없어서 해산시킬 서류도 없었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_fac_rep_meeting', a: [22, 65], tags: [T('VIC_FACTORY', 'rep')], w: 45, gap: 2,
    run: (s) => ({ t: '관리자와 면담했습니다. ' + s.rng.pick(['약속은 셋이었고, 지켜진 것은 없었습니다. 다음 면담에서 같은 셋을 다시 받았습니다.', '안전선을 넓히겠다고 했습니다. 다음 달 안전선 페인트가 새로 칠해졌습니다. 같은 자리에.', '임금 이야기를 꺼내자 관리자는 공작령 이야기를 꺼냈습니다. 공작은 그 자리에 없었습니다.']), k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'vi_fac_rep_police', a: [22, 65], tags: [T('VIC_FACTORY', 'rep')], w: 35, gap: 3,
    run: (s) => ({ t: '시위 날 기마 경찰이 공장 앞에 섰습니다. 저는 사람들을 안전선 안으로 끌고 돌아갔습니다. 그날 밤 그 일이 옳았는지 오래 생각했습니다.', k: 'bad', fx: { h: -3, standing: 3 } }) },
  { id: 'vi_fac_rep_funeral', a: [22, 65], tags: [T('VIC_FACTORY', 'rep')], w: 30, gap: 3,
    run: (s) => ({ t: '라인 동료의 장례를 대표단이 치렀습니다. 공장은 화환 하나를 보냈습니다. 화환의 글씨가 고인의 이름보다 컸습니다.', k: 'loss', fx: { h: -3, cap: { ties: 0.02 } } }) },
  { id: 'vi_fac_chief_trn', a: [26, 65], tags: [T('VIC_FACTORY', 'chief')], w: 300, c: (s) => fresh(s, 'VIC_FACTORY_chief'),
    run: (s) => ({ t: occupied(s) ? '점령군이 공장 총책으로 저를 지목했습니다. 노동자 대표였기 때문입니다. 명령은 그쪽이 내리고, 책임은 제가 지는 자리였습니다.' : '군수공장 총책이 되었습니다. 라인에서 시작한 사람이 그 자리에 앉은 것은 공장 역사에 처음이었습니다. 두 번째가 있을지는 몰랐습니다.', k: 'big', fx: { h: occupied(s) ? -2 : 4 } }) },
  { id: 'vi_fac_chief_orders', a: [26, 70], tags: [T('VIC_FACTORY', 'chief')], w: 45, gap: 2,
    run: (s) => ({ t: occupied(s) ? '군사위원회 명령서가 매주 왔습니다. 석궁, 수류탄, 포탄. 만든 것이 성벽 안에서 쓰일지 밖에서 쓰일지는 명령서에 없었습니다.' : '공작령 병기 주문이 들어왔습니다. 어느 공작의 주문인지에 따라 납기가 달랐습니다. 가장 급한 주문이 가장 가까운 공작이었습니다.', k: 'note', fx: { money: medX(s, 0.4), h: -2 } }) },
  { id: 'vi_fac_chief_old', a: [26, 70], tags: [T('VIC_FACTORY', 'chief')], w: 30, gap: 3,
    run: (s) => ({ t: '옛 라인에 내려갔습니다. 교대 종이 울렸고, 몸이 먼저 움직였습니다. 라인 사람들이 저를 보았습니다. 형제자매의 눈은 아니었습니다.', k: 'note', fx: { h: -2 } }) },
  { id: 'vi_fac_chief_dukes', a: [26, 70], tags: [T('VIC_FACTORY', 'chief')], w: 30, gap: 4,
    run: (s) => ({ t: '공작령 관리가 공장을 시찰했습니다. 라인은 그날 세 배 빨리 돌았고, 사고는 그날 두 배였습니다. 시찰 보고서에는 "양호"가 적혔습니다.', k: 'note', fx: { standing: 2 } }) },
  { id: 'vi_fac_fall', a: [14, 70], tags: [V], w: 300, c: (s) => left(s, 'VIC_FACTORY', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'injured' ? '라인에서 다쳤습니다. 공장은 치료비 대신 "안전선 밖에 있었다"는 조서를 보냈습니다. 제 서명 칸이 있었고, 서명하지 않으면 치료비도 없었습니다.' : s.S.flags.lastTrackHow === 'infected' ? '건강 검진에서 결정이 나왔습니다. 그날로 출입증이 회수되었고, 감염자 노동법 사업장 주소가 적힌 종이 한 장이 대신 왔습니다.' : '감원이었습니다. 공작령 주문이 끊긴 다음 달이었습니다. 라인 절반이 같은 날 나왔고, 펍이 그날 저녁에 찼습니다.', k: 'loss', fx: { h: -5 } }) },

  // ════════════════════════════════════════════════════════════════════
  // VIC_CONSCRIPT 징집병 — 징집 → 기초 훈련 → 전선 → 제대
  // ════════════════════════════════════════════════════════════════════
  { id: 'vi_con_draft_notice', a: [17, 26], tags: [T('VIC_CONSCRIPT', 'draft')], w: 60, gap: 3,
    run: (s) => ({ t: '징집 통지서가 왔습니다. ' + affName(s, '왕실군') + ' 소속이었습니다. 통지서의 공작 인장은 제가 사는 공작령 것이 아니었습니다. 군대는 공작령을 가리지 않았습니다.', k: 'ev', fx: { h: -2 }, f: orgF(s, '징집 통지서 발급 대장, ' + s.year + '년') }) },
  { id: 'vi_con_draft_medical', a: [17, 26], tags: [T('VIC_CONSCRIPT', 'draft')], w: 40, gap: 2,
    run: (s) => ({ t: '신체 검사를 받았습니다. 의무관은 ' + (known(s) ? '결정을 보고도 도장을 찍었습니다. "소모품 배치"라는 말을 옆 서기가 했습니다.' : '키와 이와 팔을 보았습니다. 사람을 보지는 않았습니다.'), k: 'note', fx: known(s) ? { h: -4 } : { h: -1 } }) },
  { id: 'vi_con_draft_family', a: [17, 26], tags: [T('VIC_CONSCRIPT', 'draft')], w: 35, gap: 3,
    run: (s) => ({ t: (momHere(s) ? '어머니가 ' : dadHere(s) ? '아버지가 ' : '이웃이 ') + '역까지 따라왔습니다. 기차는 공작령 경계에서 한 번 섰습니다. 창밖의 깃발이 바뀌었습니다.', k: 'note', fx: { h: -2 } }) },
  { id: 'vi_con_draft_sarkaz', a: [17, 26], tags: [T('VIC_CONSCRIPT', 'draft')], w: 35, gap: 3,
    run: (s) => ({ t: '같은 소집조에 살카즈가 하나 있었습니다. ' + (s.year >= 1098 ? '런디니움 이후였습니다. 아무도 옆자리에 앉지 않았고, 저도 앉지 않았습니다.' : '아무도 신경 쓰지 않았습니다. 아직은.'), k: 'note', fx: { h: -1 } }) },
  { id: 'vi_con_basic_trn', a: [17, 28], tags: [T('VIC_CONSCRIPT', 'basic')], w: 300, c: (s) => fresh(s, 'VIC_CONSCRIPT_basic'),
    run: (s) => ({ t: '기초 훈련소에 들어갔습니다. 훈련은 기초뿐이었습니다. 사격 열흘, 행군 열흘, 나머지는 기다림이었습니다.', k: 'ev', fx: { hl: 2, cap: { skill: 0.03 } } }) },
  { id: 'vi_con_basic_drill', a: [17, 28], tags: [T('VIC_CONSCRIPT', 'basic')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['사격장에서 탄을 ' + s.rng.ri(30, 90) + '발 쐈습니다. 과녁에 맞은 것은 절반이었고, 교관은 절반이면 충분하다고 했습니다.', '행군 중 발에서 피가 났습니다. 하사관은 피를 보지 않았고, 걸음 수만 세었습니다.', '막사에서 공작령 이야기를 했습니다. 여덟 공작령에서 온 여덟 사람이 서로의 공작을 욕했습니다.']), k: 'note', fx: { hl: -1, cap: { skill: 0.02 } }, f: s.rng.chance(0.3) ? F('왕실군 기초 훈련 교범') : undefined }) },
  { id: 'vi_con_basic_sergeant', a: [17, 28], tags: [T('VIC_CONSCRIPT', 'basic')], w: 35, gap: 2,
    run: (s) => ({ t: '하사관이 사관학교 출신이라고 했습니다. 저희보다 세 살 많았고, 저희보다 서른 살 많은 것처럼 말했습니다. 그 사람 말이 틀린 적은 없었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'vi_con_basic_letter', a: [17, 28], tags: [T('VIC_CONSCRIPT', 'basic')], w: 30, gap: 2,
    run: (s) => ({ t: '집에서 편지가 왔습니다. ' + s.rng.pick(['공장 교대가 바뀌었다는 것, 펍 주인이 바뀌었다는 것, 그 밖에는 그대로라는 것.', '답장은 세 줄 썼습니다. 검열관이 읽을 것을 알고 썼습니다.', '편지에 ' + cul(s).drink + ' 잎이 한 줌 들어 있었습니다. 막사에서 한 주 동안 나눠 마셨습니다.']), k: 'warm', fx: { h: 2 } }) },
  { id: 'vi_con_front_trn', a: [18, 30], tags: [T('VIC_CONSCRIPT', 'front')], w: 300, c: (s) => fresh(s, 'VIC_CONSCRIPT_front'),
    run: (s) => ({ t: '전선 배치 명령이 왔습니다. ' + (affIs(s, 'VIC_CON_LONDINIUM') ? '런디니움 방위군이었습니다. 수도를 지키는 일이었고, 1094년 이후로는 수도 안에서 수도를 지키는 일이 되었습니다.' : affIs(s, 'VIC_CON_SECOND') ? '제2군이었습니다. 국경이라고 했고, 어느 국경인지는 기차에서 알았습니다.' : '왕실군 전선이었습니다. 지도의 어디인지는 알려 주지 않았습니다.'), k: 'big', fx: { h: -3 } }) },
  { id: 'vi_con_front_line', a: [18, 30], tags: [T('VIC_CONSCRIPT', 'front')], w: 50, gap: 1, rep: true,
    run: (s) => { const clash = s.rng.chance(s.S.flags.war ? 0.5 : 0.25);
      return { t: clash ? '교전이 있었습니다. ' + s.rng.pick(['옆 참호 사람이 돌아오지 않았습니다. 이름은 알았고, 고향은 몰랐습니다.', '포격이 반나절이었습니다. 끝나고 나서 손이 한 시간 동안 떨렸습니다.', '명령은 "전진"이었고, 전진한 자리는 어제와 같은 자리였습니다.']) : '전선은 조용했습니다. ' + s.rng.pick(['참호를 팠고, 비가 오면 다시 팠습니다.', '배급은 차와 비스킷이었습니다. 차는 식었고 비스킷은 돌이었습니다.', '감염된 병사들이 맨 앞 참호에 배치되었습니다. 아무도 그 이유를 묻지 않았습니다.']), k: clash ? 'bad' : 'note', fx: clash ? { hl: -5, h: -3, standing: 4 } : { h: -1, standing: 1 } }; } },
  { id: 'vi_con_front_infected', a: [18, 30], tags: [T('VIC_CONSCRIPT', 'front'), 'infected'], w: 45, gap: 2,
    run: (s) => ({ t: '감염자 분대로 재배치되었습니다. 맨 앞 참호, 가장 낡은 총. 분대장은 "먼저 가는 사람이 길을 연다"고 했습니다. 어디로 가는 길인지는 말하지 않았습니다.', k: 'bad', fx: { hl: -4, h: -4 } }) },
  { id: 'vi_con_front_promotion', a: [18, 30], tags: [T('VIC_CONSCRIPT', 'front')], w: 30, gap: 3, c: (s) => standing(s) >= 50,
    run: (s) => ({ t: '하사관 발탁 이야기가 나왔습니다. 전선에서 살아남은 징집병에게 가끔 오는 말이었습니다. 추천서는 장교가 쓰고, 장교는 제 이름을 몰랐습니다.', k: 'note', fx: { standing: 3 } }) },
  { id: 'vi_con_front_discharge', a: [18, 32], tags: [T('VIC_CONSCRIPT', 'front')], w: 80, gap: 1, c: (s) => inStage(s) >= 2 && !s.S.flags.war && s.rng.chance(0.4),
    run: (s) => { if (!s.promote({ force: true, quiet: true })) return null; return { t: '복무 기간이 끝났습니다. 전선에서 후방으로, 후방에서 역으로. 제대 명령서에 찍힌 도장은 징집 통지서의 것과 같은 도장이었습니다.', k: 'ev', fx: { h: 3 } }; } },
  { id: 'vi_con_disch_trn', a: [19, 32], tags: [T('VIC_CONSCRIPT', 'discharged')], w: 300, c: (s) => fresh(s, 'VIC_CONSCRIPT_discharged'),
    run: (s) => ({ t: '제대했습니다. 제대증과 기차표 한 장을 받았습니다. 기차는 올 때와 같은 공작령 경계에서 한 번 섰습니다. 깃발은 그대로였고, 저는 그대로가 아니었습니다.', k: 'big', fx: { h: 4 } }) },
  { id: 'vi_con_disch_home', a: [19, 35], tags: [T('VIC_CONSCRIPT', 'discharged')], w: 45, gap: 2,
    run: (s) => ({ t: '고향에 돌아왔습니다. ' + s.rng.pick(['공장은 제 자리를 비워 두지 않았습니다. 비워 둘 의무가 없었습니다.', '펍에서 첫 잔은 공짜였습니다. 둘째 잔부터는 아니었습니다.', '밤에 종소리가 나면 몸이 먼저 일어났습니다. 공장 종이 아니라 다른 종이었습니다.']), k: 'note', fx: { h: -1 } }) },
  { id: 'vi_con_disch_pension', a: [19, 40], tags: [T('VIC_CONSCRIPT', 'discharged')], w: 35, gap: 3,
    run: (s) => ({ t: '제대 수당이 나왔습니다. ' + Math.round(s.med * 0.4).toLocaleString() + ' LMD. 두 달치였습니다. 복무는 ' + s.rng.ri(2, 5) + '년이었습니다.', k: 'note', fx: { money: medX(s, 0.4) }, f: orgF(s, '제대 수당 지급 대장') }) },
  { id: 'vi_con_disch_sarkaz_ban', a: [19, 40], tags: [T('VIC_CONSCRIPT', 'discharged')], w: 30, gap: 3, c: (s) => s.year >= 1098,
    run: (s) => ({ t: '제대 병사 모임에서 런디니움 이야기가 나왔습니다. 살카즈를 보는 눈이 그 자리에서 정해졌고, 저는 그 눈을 고치지 못했습니다. 저도 같은 눈이었기 때문입니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'vi_con_fall', a: [17, 40], tags: [V], w: 300, c: (s) => left(s, 'VIC_CONSCRIPT', null) && !['retire', 'discharged'].includes(s.S.flags.lastTrackHow),
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'injured' ? '전선에서 다쳐 후송되었습니다. 제대증 대신 상이 기록 한 장을 받았습니다. 그 기록으로 받을 수 있는 것은 기차표뿐이었습니다.' : s.S.flags.lastTrackHow === 'exile' ? '탈영했습니다. 밤에 참호를 나와 국경 쪽으로 걸었습니다. 왕실군 명부에는 제 이름 옆에 줄이 그어졌고, 그 줄은 지워지지 않습니다.' : '군대에서 나왔습니다. 어떻게 나왔는지는 제대증에 적히지 않았습니다.', k: 'loss', fx: { h: -5 } }) },

  // ════════════════════════════════════════════════════════════════════
  // VIC_KNIGHT 탑의 기사·증기 기사 — 종자 → 초병대장 → 경비대장 → 기사 → 수장 (1094년 런디니움에서 끝난다)
  // ════════════════════════════════════════════════════════════════════
  // 입구: entry.ages [11,14] 인데 엔진 진입 롤은 15세부터라 콘텐츠가 넣는다(상층·기량·1094 이전). 1094 이후는 박물관 전시로만 남는다(캐논).
  { id: 'vi_kni_enter', a: [11, 14], tags: [V, '!nation:tara', '!track:VIC_KNIGHT', '!rhodes'], w: 400, c: (s) => s.year <= 1093 && !s.S.track && (s.S.q >= 4 || !!s.S.status.noble) && s.S.cap.skill >= 0.3 && !s.S.flags.kniRolled && !!s.data.trackById.VIC_KNIGHT,
    run: (s) => { s.S.flags.kniRolled = true; if (!s.rng.chance(s.S.status.noble ? 0.6 : 0.35)) return { t: '탑의 기사단 종자 선발에 이름을 넣었습니다. 선발되지 않았습니다. 서른 자리에 공작 집안 아이 수백이 왔습니다.', k: 'note', fx: { h: -2 } };
      if (!s.enterTrack('VIC_KNIGHT', { how: 'enter', via: s.S.status.noble ? 'family' : 'selected', quiet: true })) return null;
      return { t: '열한 살, 탑의 기사단 종자로 뽑혔습니다. 집을 떠나 런디니움에서 가장 높은 탑으로 갔습니다. 어머니는 역까지 따라왔고, 탑은 멀리서도 보였습니다.', k: 'big', fx: { h: 3 }, f: F('탑의 기사단 종자 명부, ' + s.year + '년') }; } },
  { id: 'vi_kni_sq_armor', a: [11, 20], tags: [T('VIC_KNIGHT', 'squire')], w: 55, gap: 2,
    run: (s) => ({ t: affIs(s, 'VIC_KNI_STEAM') ? '증기 갑옷을 닦았습니다. 기사가 입는 것이었고, 종자는 닦는 것이었습니다. 관 하나가 ' + s.rng.ri(12, 30) + 'kg이었습니다.' : '탑의 기사의 창과 갑옷을 손질했습니다. 창은 2백 년 된 것이었고, 저는 열한 살이었습니다.', k: 'note', fx: { cap: { skill: 0.03 }, hl: -1 }, f: affIs(s, 'VIC_KNI_STEAM') ? F('증기 기사단 장비 대장') : undefined }) },
  { id: 'vi_kni_sq_tower', a: [11, 20], tags: [T('VIC_KNIGHT', 'squire')], w: 45, gap: 2,
    run: (s) => ({ t: '탑에서 살았습니다. 런디니움에서 가장 높은 곳이었고, 종자의 방은 그 탑에서 가장 낮은 곳이었습니다. 계단을 하루 ' + s.rng.ri(20, 40) + '번 올랐습니다.', k: 'note', fx: { hl: 1 }, f: F('탑의 기사단 종자 일과표') }) },
  { id: 'vi_kni_sq_noble', a: [11, 20], tags: [T('VIC_KNIGHT', 'squire')], w: 40, gap: 3,
    run: (s) => ({ t: s.S.status.noble ? '같은 종자들 중 평민 출신이 하나 있었습니다. 시 경비대에서 왔다고 했습니다. 창은 저보다 잘 썼고, 식탁에서는 끝자리였습니다.' : '같은 종자들은 대부분 공작 집안 아이들이었습니다. 제 창은 그 아이들 것보다 낡았고, 제 손은 그 아이들 것보다 빨랐습니다. 둘 다 눈에 띄었습니다.', k: 'note', fx: { h: -1, cap: { skill: 0.02 } } }) },
  { id: 'vi_kni_sq_king', a: [11, 20], tags: [T('VIC_KNIGHT', 'squire')], w: 30, gap: 4,
    run: (s) => ({ t: '왕이 없는 나라의 왕실 기사단이었습니다. 서약문에 왕의 이름이 들어가는 자리는 비워 두었습니다. 그 자리가 언제 채워질지 아무도 말하지 않았습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'vi_kni_sen_trn', a: [14, 30], tags: [T('VIC_KNIGHT', 'sentinel')], w: 300, c: (s) => fresh(s, 'VIC_KNIGHT_sentinel'),
    run: (s) => ({ t: '초병대장이 되었습니다. 탑의 문을 지키는 자리였습니다. 밤에 문 앞에 서면 런디니움 전체가 발아래 있었고, 공작령 저택들의 불빛이 제일 늦게 꺼졌습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_kni_sen_watch', a: [14, 32], tags: [T('VIC_KNIGHT', 'sentinel')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['밤 경계였습니다. 탑 아래 거리에서 갱단 싸움 소리가 났습니다. 기사는 거리로 내려가지 않습니다. 그것이 규칙이었습니다.', '공작 하나가 탑을 방문했습니다. 수행원이 서른이었고, 기사단은 서른이 안 되었습니다.', '초병 중 하나가 아팠습니다. 그 자리를 이틀 섰습니다. 탑은 그동안 아무 일도 없었고, 그것이 일이었습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'vi_kni_sen_steam', a: [14, 32], tags: [T('VIC_KNIGHT', 'sentinel'), 'aff:VIC_KNI_STEAM'], w: 35, gap: 3,
    run: (s) => ({ t: '증기 갑옷을 처음 입었습니다. 관이 등에서 울렸고, 걸음이 제 걸음이 아니었습니다. 역사상 쉰 명이 안 되는 사람이 입은 갑옷이었습니다.', k: 'ev', fx: { cap: { skill: 0.04 } } }) },
  { id: 'vi_kni_sen_gaul', a: [14, 32], tags: [T('VIC_KNIGHT', 'sentinel')], w: 25, gap: 4,
    run: (s) => ({ t: '옛 가울 양식 창술을 배웠습니다. 교관은 그 이름을 입에 올리지 않았습니다. 창술은 창술이고 이름은 정치라고 했습니다.', k: 'note', fx: { cap: { skill: 0.03 } } }) },
  { id: 'vi_kni_gd_trn', a: [17, 36], tags: [T('VIC_KNIGHT', 'guard')], w: 300, c: (s) => fresh(s, 'VIC_KNIGHT_guard'),
    run: (s) => ({ t: '경비대장이 되었습니다. 탑의 안쪽, 왕관이 있던 방의 문을 맡았습니다. 방은 비어 있었고, 문은 잠겨 있었고, 열쇠는 제게 없었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_kni_gd_duty', a: [17, 36], tags: [T('VIC_KNIGHT', 'guard')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['의회 개원식에 기사단이 섰습니다. 의원들은 기사단을 보지 않았고, 기사단은 의원들을 보지 않았습니다. 양쪽 다 훈련된 태도였습니다.', '왕관 방 문 앞에서 밤을 샜습니다. 안에서 아무 소리도 나지 않았습니다. 그것이 이 자리의 전부였습니다.', '새 종자 셋을 받았습니다. 공작 집안 둘, 평민 하나. 평민 아이의 손이 제일 빨랐습니다. 제가 그랬던 것처럼.']), k: 'note', fx: { standing: 2, cap: { ties: 0.02 } } }) },
  { id: 'vi_kni_gd_dukes', a: [17, 36], tags: [T('VIC_KNIGHT', 'guard')], w: 35, gap: 3,
    run: (s) => ({ t: '공작들이 서로를 겨누기 시작했습니다. 기사단은 어느 공작의 것도 아니었고, 그래서 아무도 기사단에 묻지 않았습니다. 탑 아래에서 깃발이 하나씩 바뀌었습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'vi_kni_gd_museum', a: [17, 36], tags: [T('VIC_KNIGHT', 'guard')], w: 25, gap: 4,
    run: (s) => ({ t: '박물관 사람이 탑의 유물을 보러 왔습니다. 갑옷을 재고 창을 쟀습니다. 살아 있는 기사는 재지 않았습니다. 아직은 유물이 아니었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'vi_kni_kn_trn', a: [14, 40], tags: [T('VIC_KNIGHT', 'knight')], w: 300, c: (s) => fresh(s, 'VIC_KNIGHT_knight'),
    run: (s) => ({ t: '기사로 서임되었습니다. ' + (s.S.status.noble ? '열여섯의 공작 집안 아이로는 흔한 일이었고, 흔한 일도 그날은 흔하지 않았습니다.' : '평민 출신의 서임은 기사단 기록에 손에 꼽혔습니다. 기록관이 제 출신을 두 번 물었습니다.') + ' 왕이 없어 수장이 창을 어깨에 얹었습니다.', k: 'big', fx: { h: 5 } }) },
  { id: 'vi_kni_kn_duty', a: [14, 45], tags: [T('VIC_KNIGHT', 'knight')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['기사단 전체가 스물아홉이었습니다. 저녁 식탁에 전부 앉으면 한 상이었습니다.', '공작령 하나가 기사단에 사병이 되어 달라고 했습니다. 수장은 답하지 않았고, 답하지 않은 것이 답이었습니다.', '탑의 기사의 창은 거리에서 쓰이지 않습니다. 쓰이지 않는 창을 매일 손질했습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'vi_kni_kn_oath', a: [14, 45], tags: [T('VIC_KNIGHT', 'knight')], w: 30, gap: 3,
    run: (s) => ({ t: '서약을 갱신했습니다. 왕의 이름 자리는 여전히 비어 있었습니다. 어떤 기사는 그 자리에 나라 이름을 넣어 읽었고, 어떤 기사는 그냥 쉬었습니다. 저는 쉬었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'vi_kni_kn_city', a: [14, 45], tags: [T('VIC_KNIGHT', 'knight')], w: 30, gap: 3,
    run: (s) => ({ t: '탑 아래 거리를 걸었습니다. 갑옷 없이. 아무도 저를 알아보지 못했고, 펍에서 탑의 기사 이야기를 하는 사람이 있었습니다. 절반은 틀린 이야기였고, 고치지 않았습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'vi_kni_hd_trn', a: [20, 55], tags: [T('VIC_KNIGHT', 'head')], w: 300, c: (s) => fresh(s, 'VIC_KNIGHT_head'),
    run: (s) => ({ t: '기사단 수장이 되었습니다. 스물아홉의 맨 앞. 왕이 없는 왕실 기사단의 수장은 누구에게도 보고하지 않았고, 그것이 가장 무거운 점이었습니다.', k: 'big', fx: { h: 4 } }) },
  { id: 'vi_kni_hd_council', a: [20, 55], tags: [T('VIC_KNIGHT', 'head')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['공작 평의회가 기사단의 거취를 물었습니다. "왕의 것"이라고 답했습니다. 왕이 없다는 것을 양쪽 다 알았습니다.', '의회가 기사단 예산을 깎았습니다. 스물아홉의 식탁에서 차가 먼저 사라졌습니다.', '종자 서임을 제가 집전했습니다. 창을 어깨에 얹으며 그 아이가 서른이 될 때 기사단이 있을지 생각했습니다.']), k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'vi_kni_hd_steam', a: [20, 55], tags: [T('VIC_KNIGHT', 'head'), 'aff:VIC_KNI_STEAM'], w: 30, gap: 3,
    run: (s) => ({ t: '증기 기사단 서른두 벌의 갑옷 중 움직이는 것은 스무 벌이었습니다. 나머지는 부품으로 쓰였습니다. 기사도 그렇게 세어지는 날이 올 것 같았습니다.', k: 'bad', fx: { h: -2 }, f: F('증기 기사단 장비 대장') }) },
  { id: 'vi_kni_hd_quiet', a: [20, 55], tags: [T('VIC_KNIGHT', 'head')], w: 25, gap: 4,
    run: (s) => ({ t: '탑 꼭대기에 혼자 올랐습니다. 런디니움은 여덟 조각의 불빛이었습니다. 하나로 보이던 때가 있었다고 선대 수장이 말했었습니다. 저는 그때를 보지 못했습니다.', k: 'note', fx: { h: -1 } }) },
  // ── 1094 런디니움: 탑의 기사 최후 (대사건 londinium_1094 와 연동, 중복 서술 없음) ──
  { id: 'vi_kni_1094', a: [11, 60], tags: [T('VIC_KNIGHT')], w: 1000, c: (s) => s.year === 1094,
    run: (s) => { const r = s.rng.rnd();
      if (r < 0.6) { s.die('war', '런디니움 항전'); return; }
      s.leaveTrack('expel', { quiet: true }); s.S.flags.knightSurvivor = s.S.age; s.S.flags.londinium = true;
      return { t: '살카즈 군대가 성문을 넘던 날, 탑의 기사 스물아홉이 탑 아래에 섰습니다. 저는 살아남은 몇 안 되는 쪽이었습니다. 기사단은 그날로 없어졌고, 갑옷은 벗었고, 이름은 바꿨습니다.', k: 'loss', fx: { hl: -15, h: -10 }, f: F('공작령 등기소 런디니움 봉쇄 기록, 1094년') }; } },
  { id: 'vi_kni_survivor', a: [12, 70], tags: [V, '!nation:tara'], w: 40, gap: 5, c: (s) => !!s.S.flags.knightSurvivor,
    run: (s) => ({ t: s.year >= 1098 ? '박물관에 탑의 기사 전시가 열렸습니다. 유리 안에 제가 닦던 갑옷이 있었습니다. 이름표에 제 이름은 없었습니다. 그것이 맞았습니다.' : '갱단 사람이 저를 알아보았습니다. 탑의 기사였다는 것을. 아무 말도 하지 않았고, 다음 날 제 집 앞에 빵이 놓여 있었습니다.', k: 'note', fx: { h: s.year >= 1098 ? -2 : 1 } }) },
  { id: 'vi_kni_fall', a: [11, 60], tags: [V], w: 300, c: (s) => left(s, 'VIC_KNIGHT', null) && !s.S.flags.knightSurvivor && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'prison' ? '공작 평의회가 기사단 구금을 결의했습니다. 1072년처럼. 죄목은 "왕의 것"이라는 대답이었습니다.' : s.S.flags.lastTrackHow === 'injured' ? '훈련 중 다쳤습니다. 탑의 계단을 오를 수 없는 기사는 탑에 머물 수 없었습니다. 창은 두고 왔습니다.' : '기사단에서 나왔습니다. 갑옷은 탑에 남고, 서약은 제게 남았습니다. 둘 다 쓸 데가 없었습니다.', k: 'loss', fx: { h: -5 } }) },

  // ════════════════════════════════════════════════════════════════════
  // VIC_INFECTED 감염자 노동(forced) — 격리 노동(반값·16시간) → 사고 후 → 수용소
  // 진입: 엔진(persecute 수용소 분기) + 아래 두 이벤트(은폐 발각·판정 후 배정)
  // ════════════════════════════════════════════════════════════════════
  { id: 'vi_inf_assign', a: [10, 70], tags: [V, 'known', '!track:VIC_INFECTED', '!rhodes', '!prison:camp', '!prison:jail'], w: 400, c: (s) => inVic(s) && !s.S.track && !s.S.flags.oriHidden && s.data.trackById.VIC_INFECTED,
    run: (s) => { if (!s.enterTrack('VIC_INFECTED', { how: 'forced', via: 'assigned', quiet: true })) return null;
      return { t: '감염자 노동법 사업장 배정 통지가 왔습니다. ' + affName(s, '격리 노동 사업장') + '. 임금은 절반, 하루는 열여섯 시간. 거부란은 없었습니다.', k: 'loss', fx: { h: -6 }, f: F('칼라돈 감염자 노동법 시행 규칙 제3조') }; } },
  { id: 'vi_inf_found', a: [10, 70], tags: [V, 'known', '!track:VIC_INFECTED', '!rhodes', '!prison:camp', '!prison:jail'], w: 50, gap: 1, c: (s) => inVic(s) && !!s.S.flags.oriHidden && s.rng.chance(0.2) && s.data.trackById.VIC_INFECTED,
    run: (s) => { s.S.flags.oriHidden = false; if (!s.enterTrack('VIC_INFECTED', { how: 'forced', via: 'found', quiet: true })) return null;
      return { t: '숨겨 온 것이 발각되었습니다. ' + s.rng.pick(['직장 검진이었습니다.', '이웃의 신고였습니다. 누구인지는 끝내 몰랐습니다.', '거리 검문이었습니다. 소매를 걷으라고 했습니다.']) + ' 그날로 격리 노동 사업장 명부에 올랐습니다. 임금은 절반이 되었고, 하루는 두 배가 되었습니다.', k: 'loss', fx: { h: -8 }, f: F('칼라돈 감염자 노동법 시행 규칙 제3조') }; } },
  { id: 'vi_inf_half_shift', a: [10, 75], tags: [T('VIC_INFECTED', 'halfpay')], w: 55, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['열여섯 시간을 일했습니다. 방호복은 구멍이 났고, 바꿔 달라는 칸은 서식에 없었습니다.', '임금 봉투가 얇았습니다. 같은 라인 비감염자의 절반. 법이 그렇게 정했고, 법은 봉투 안에 들어 있지 않았습니다.', '감독관이 "노동법 덕분에 일할 수 있는 것"이라고 했습니다. 틀린 말이 아니어서 더 아팠습니다.']), k: 'bad', fx: { hl: -3, h: -2 } }) },
  { id: 'vi_inf_half_zone', a: [10, 75], tags: [T('VIC_INFECTED', 'halfpay'), 'aff:VIC_INF_ZONE'], w: 40, gap: 2,
    run: (s) => ({ t: '격리구역 숙소였습니다. 나이도 성별도 묻지 않고 한 방에 넣었습니다. 밤에 기침 소리가 돌림노래처럼 돌았습니다.', k: 'bad', fx: { h: -2, hl: -1 } }) },
  { id: 'vi_inf_half_caladon', a: [10, 75], tags: [T('VIC_INFECTED', 'halfpay'), 'aff:VIC_INF_CALADON'], w: 40, gap: 2,
    run: (s) => ({ t: '칼라돈 사업장에서는 열네 시간 상한 이야기가 돌았습니다. 돌기만 했습니다. 교대표는 열여섯 시간 그대로였습니다.', k: 'note', fx: { h: -1 }, f: F('칼라돈 공작령 노동 시간 개정안(미시행)') }) },
  { id: 'vi_inf_half_letter', a: [10, 75], tags: [T('VIC_INFECTED', 'halfpay')], w: 30, gap: 3,
    run: (s) => ({ t: '가족에게 편지를 썼습니다. 사업장 검열이 두 줄을 지웠습니다. 지워진 두 줄은 노동 시간과 임금이었습니다. 남은 줄은 "잘 지낸다"였습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'vi_inf_acc_trn', a: [10, 75], tags: [T('VIC_INFECTED', 'accident')], w: 400, c: (s) => fresh(s, 'VIC_INFECTED_accident'),
    run: (s) => ({ t: '사업장에서 사고가 났습니다. 방호복이 찢어졌고, 치료는 사업장 의무실에서 끝났습니다. 명부의 제 줄이 "사고 후"로 옮겨졌습니다. 그 칸의 임금은 절반의 절반이었습니다.', k: 'loss', fx: { hl: -10, h: -6 } }) },
  { id: 'vi_inf_acc_days', a: [10, 75], tags: [T('VIC_INFECTED', 'accident')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['다친 손으로 할 수 있는 일을 배정받았습니다. 분류 작업이었습니다. 분류되는 것이 무엇인지 끝까지 몰랐습니다.', '의무실 약이 떨어졌습니다. 다음 보급은 다음 달이었습니다.', '같은 방 사람이 밤에 나갔습니다. 아침에 돌아오지 않았고, 아무도 찾지 않았습니다.']), k: 'bad', fx: { hl: -2, h: -3 } }) },
  { id: 'vi_inf_acc_militia', a: [14, 60], tags: [T('VIC_INFECTED', 'accident')], w: 30, gap: 2, c: (s) => occupied(s),
    run: (s) => ({ t: '자경단 사람이 사업장 담 너머로 말을 걸었습니다. 점령군과 싸우는 데 감염자도 받는다고 했습니다. 담은 높았고, 그 말은 담을 넘어왔습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'vi_inf_camp_trn', a: [10, 80], tags: [T('VIC_INFECTED', 'camp')], w: 400, c: (s) => fresh(s, 'VIC_INFECTED_camp'),
    run: (s) => ({ t: '수용소 이송이었습니다. 사업장 명부에서 수용소 명부로. 사업장에는 임금이 있었고, 수용소에는 없었습니다. 그것이 두 명부의 차이였습니다.', k: 'loss', fx: { h: -8 } }) },
  { id: 'vi_inf_camp_days', a: [10, 80], tags: [T('VIC_INFECTED', 'camp')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['수용소 작업반이었습니다. 하루 일은 다음 날 일을 위해 땅을 고르는 것이었습니다.', '점호에서 이름 대신 번호를 불렀습니다. 번호를 외우는 데 사흘이 걸렸습니다.', '스카이즈 카운티에서 온 사람이 있었습니다. 거기는 더 나쁘다고 했습니다. 믿었습니다.']), k: 'bad', fx: { hl: -2, h: -2 } }) },
  { id: 'vi_inf_camp_village', a: [10, 80], tags: [T('VIC_INFECTED', 'camp')], w: 25, gap: 3,
    run: (s) => ({ t: '남부 해안의 광석병 마을 이야기를 들었습니다. 추방된 사람들이 산다고 했습니다. 수용소보다 나은지는 아무도 몰랐습니다. 가 본 사람이 돌아오지 않았으니까.', k: 'note', fx: { h: -1 } }) },
  { id: 'vi_inf_fall', a: [10, 80], tags: [V], w: 300, c: (s) => left(s, 'VIC_INFECTED', null),
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'released' ? '수용소에서 풀려났습니다. 서류에는 "재분류"라고 적혔습니다. 재분류된 사람이 갈 곳은 서류에 없었습니다.' : s.S.flags.lastTrackHow === 'prison' ? '수용소로 넘겨졌습니다. 사업장 출입증은 회수되었습니다. 회수할 것이 그것뿐이었습니다.' : '격리 노동 명부에서 이름이 빠졌습니다. 어디로 빠졌는지는 명부가 말하지 않았습니다.', k: 'loss', fx: { h: -4 } }) },

  // ════════════════════════════════════════════════════════════════════
  // VIC_GANG 글래스고 갱단 — 꼬마 → 단원 → 부관 → 두목(결투 승계)
  // ════════════════════════════════════════════════════════════════════
  { id: 'vi_gang_kid_errand', a: [10, 20], tags: [T('VIC_GANG', 'kid')], w: 55, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['노포트 골목에서 망을 봤습니다. 경찰이 오면 휘파람 두 번. 한 번도 불 일이 없는 날이 좋은 날이었습니다.', '심부름이었습니다. 봉투를 체육관에 전하고, 빵을 받아 왔습니다. 봉투 안은 보지 않았습니다.', '큰 형들 싸움을 구경하려다 쫓겨났습니다. "싸움은 밖에서, 애들은 안에서." 체육관 규칙이었습니다.']), k: 'note', fx: { money: medX(s, 0.02), cap: { ties: 0.02 } } }) },
  { id: 'vi_gang_kid_rule', a: [10, 20], tags: [T('VIC_GANG', 'kid')], w: 40, gap: 2,
    run: (s) => ({ t: '글래스고는 동네 사람들에게 돈을 걷지 않았습니다. 다른 갱은 걷었습니다. 그 차이를 동네 빵집 아주머니가 빵 한 개로 알려 주었습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'vi_gang_kid_school', a: [10, 20], tags: [T('VIC_GANG', 'kid')], w: 35, gap: 2,
    run: (s) => ({ t: '낮에는 ' + (s.S.school ? '학교에 갔고' : '공장 심부름을 했고') + ' 밤에는 골목에 있었습니다. 두 곳 다 저를 반쪽만 알았습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'vi_gang_kid_police', a: [10, 20], tags: [T('VIC_GANG', 'kid')], w: 35, gap: 3,
    run: (s) => ({ t: '기마 경찰에게 붙잡혔습니다. 경관은 제 나이를 묻고, 집을 묻고, 돌려보냈습니다. 돌려보내며 "다음엔 안 돌려보낸다"고 했습니다. 다음은 있었습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'vi_gang_mem_trn', a: [13, 30], tags: [T('VIC_GANG', 'member')], w: 300, c: (s) => fresh(s, 'VIC_GANG_member'),
    run: (s) => ({ t: '단원이 되었습니다. 체육관 뒷문 열쇠를 받았습니다. 낮에 일하고 밤에 싸우는 것, 그것이 글래스고였고 이제 제 것이었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_gang_mem_fight', a: [13, 40], tags: [T('VIC_GANG', 'member')], w: 50, gap: 1, rep: true,
    run: (s) => { const win = s.rng.chance(0.5 + s.S.cap.skill * 0.15);
      return { t: win ? '옆 구역 갱과 붙었습니다. 이겼습니다. 노포트의 길 하나가 글래스고 것이 되었습니다.' : '옆 구역 갱과 붙었습니다. 졌습니다. 체육관에서 사흘을 누워 있었고, 아무도 비웃지 않았습니다. 그것이 규칙이었습니다.', k: win ? 'ev' : 'bad', fx: win ? { standing: 5, h: 2 } : { hl: -6, h: -2 } }; } },
  { id: 'vi_gang_mem_gym', a: [13, 40], tags: [T('VIC_GANG', 'member'), 'aff:VIC_GANG_GYM'], w: 40, gap: 2,
    run: (s) => ({ t: '슬로버노커 체육관에서 샌드백을 쳤습니다. 체육관은 갱단 본거지이자 동네 아이들의 권투 교실이었습니다. 아이들이 올 시간에는 봉투가 보이지 않았습니다.', k: 'note', fx: { cap: { skill: 0.03 } } }) },
  { id: 'vi_gang_mem_day', a: [13, 40], tags: [T('VIC_GANG', 'member')], w: 35, gap: 2,
    run: (s) => ({ t: '낮 일자리가 ' + s.rng.pick(['하역장이었습니다. 밤에 싸울 힘을 낮에 썼습니다.', '공장이었습니다. 반장이 제 손의 흉터를 보고 아무 말도 하지 않았습니다.', '없었습니다. 체육관 청소를 했고, 두목이 그것도 일이라고 했습니다.']), k: 'note', fx: { money: medX(s, 0.05), hl: -1 } }) },
  { id: 'vi_gang_lt_trn', a: [17, 45], tags: [T('VIC_GANG', 'lieutenant')], w: 300, c: (s) => fresh(s, 'VIC_GANG_lieutenant'),
    run: (s) => ({ t: '부관이 되었습니다. 두목 옆자리였습니다. 봉투를 받는 쪽에서 나누는 쪽으로 옮겨 앉았습니다. 나누는 쪽이 더 어려웠습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_gang_lt_turf', a: [17, 50], tags: [T('VIC_GANG', 'lieutenant')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['구역 하나를 맡았습니다. 동네 사람들에게 돈을 걷지 않는 것이 제 구역의 규칙이었고, 그 규칙을 지키는 데 돈이 들었습니다.', '다른 갱과의 자리에 두목 대신 나갔습니다. 말은 짧았고, 뒤에 선 사람은 많았습니다.', '단원 하나가 동네 가게에서 돈을 걷었습니다. 내보냈습니다. 그날 밤 그 아이가 체육관 문 앞에서 울었습니다.']), k: 'note', fx: { standing: 3, h: -1 } }) },
  { id: 'vi_gang_lt_occupied', a: [17, 50], tags: [T('VIC_GANG', 'lieutenant')], w: 60, gap: 1, c: (s) => occupied(s),
    run: (s) => ({ t: '점령군이 노포트에 들어오지 못했습니다. 골목을 아는 쪽이 이겼습니다. 글래스고는 그해 수도에서 가장 큰 갱이 되었고, 그것이 자랑인지는 몰랐습니다.', k: 'ev', fx: { standing: 5, hl: -2 } }) },
  { id: 'vi_gang_lt_infected', a: [17, 50], tags: [T('VIC_GANG', 'lieutenant')], w: 30, gap: 3,
    run: (s) => ({ t: '단원 하나가 감염되었습니다. 격리구역에 보내지 않았습니다. 체육관 뒷방을 내주었고, 경찰이 묻자 "사촌"이라고 했습니다.', k: 'warm', fx: { h: 2, standing: 2 } }) },
  { id: 'vi_gang_boss_trn', a: [20, 55], tags: [T('VIC_GANG', 'boss')], w: 300, c: (s) => fresh(s, 'VIC_GANG_boss'),
    run: (s) => ({ t: '결투에서 이겨 두목이 되었습니다. 글래스고의 승계 방식이었습니다. 전 두목은 체육관 문턱에 앉아 "싸움은 밖에서"라고 했습니다. 그 말을 제가 하게 되었습니다.', k: 'big', fx: { h: 4, standing: 10 } }) },
  { id: 'vi_gang_boss_city', a: [20, 60], tags: [T('VIC_GANG', 'boss')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['노포트 두 개 구가 글래스고 것이라는 소문이 돌았습니다. 소문은 절반이 맞았고, 그 절반이면 충분했습니다.', '공작령 사람이 체육관으로 찾아왔습니다. 공작의 심부름이었습니다. 돌려보냈고, 다음 주에 다른 공작의 사람이 왔습니다.', '동네 아이들이 체육관 앞에서 저를 따라 했습니다. 막았습니다. 아이들이 따라 하지 않게 하는 것이 두목의 일이었습니다.']), k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'vi_gang_boss_duel', a: [20, 60], tags: [T('VIC_GANG', 'boss')], w: 35, gap: 3,
    run: (s) => { const win = s.rng.chance(0.6 + s.S.cap.skill * 0.1);
      return { t: '결투 신청이 들어왔습니다. ' + (win ? '받았고, 이겼습니다. 신청한 아이는 체육관에 남았습니다. 그것도 규칙이었습니다.' : '받았고, 졌습니다. 두목 자리는 그 아이 것이 되었고, 저는 문턱에 앉았습니다.'), k: win ? 'ev' : 'loss', fx: win ? { standing: 4, hl: -3 } : { standing: -20, h: -5, hl: -5 } }; } },
  { id: 'vi_gang_boss_council', a: [20, 60], tags: [T('VIC_GANG', 'boss')], w: 25, gap: 4, c: (s) => s.year >= 1098,
    run: (s) => ({ t: '의회에서 노포트 이야기가 나왔다고 했습니다. 갱단 두목이 의장이 된 나라였습니다. 저는 의회에 가지 않았고, 체육관에 있었습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'vi_gang_fall', a: [10, 65], tags: [V], w: 300, c: (s) => left(s, 'VIC_GANG', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'prison' ? '기마 경찰에 잡혔습니다. 경관은 이번에는 돌려보내지 않았습니다. 체육관 열쇠는 압수 목록에 올랐습니다.' : s.S.flags.lastTrackHow === 'injured' ? '골목 싸움에서 크게 다쳤습니다. 체육관 뒷방에서 한 달을 누웠고, 일어났을 때 제 자리는 다른 아이가 서 있었습니다.' : '글래스고를 떠났습니다. 체육관 열쇠는 두목에게 돌려주었습니다. 두목은 "문은 열려 있다"고 했고, 저는 그 문으로 돌아가지 않았습니다.', k: 'loss', fx: { h: -5 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 나머지 진로(단계마다 2개 + 전환 + 몰락 후일담)
  // ════════════════════════════════════════════════════════════════════
  // ── VIC_CRAFT 장인·자영업: 견습 → 독립 가게 → 도매상 ──
  { id: 'vi_cra_app_work', a: [14, 45], tags: [T('VIC_CRAFT', 'apprentice')], w: 45, gap: 2,
    run: (s) => ({ t: affIs(s, 'VIC_CRAFT_BAKERY') ? '새벽 세 시에 반죽을 시작했습니다. 빵집 주인은 반죽을 보지 않고 제 손을 보았습니다. 손이 반죽을 말해 준다고 했습니다.' : affIs(s, 'VIC_CRAFT_FLOWER') ? '온실에서 꽃을 골랐습니다. 공작령 저택 주문은 색으로, 장례 주문은 수로 골랐습니다.' : affIs(s, 'VIC_CRAFT_VIDEO') ? '비디오 대여점 선반을 정리했습니다. 카시미어 기사 경기 테이프가 제일 많이 나갔고, 제일 많이 늦게 돌아왔습니다.' : '향신료 도매상 창고에서 자루를 날랐습니다. 자루마다 다른 나라 이름이 찍혀 있었습니다. 냄새로 나라를 외웠습니다.', k: 'note', fx: { cap: { skill: 0.03 } } }) },
  { id: 'vi_cra_app_master', a: [14, 45], tags: [T('VIC_CRAFT', 'apprentice')], w: 35, gap: 3,
    run: (s) => ({ t: '주인이 가게를 하루 맡겼습니다. ' + (s.rng.chance(0.6) ? '매출은 평소와 같았고, 주인은 그것을 칭찬이라고 했습니다.' : '거스름돈을 틀렸습니다. 주인은 그 돈을 제 급료에서 뺐고, 다음에도 맡겼습니다.'), k: 'note', fx: { cap: { ties: 0.02 } } }) },
  { id: 'vi_cra_shop_trn', a: [18, 60], tags: [T('VIC_CRAFT', 'shop')], w: 300, c: (s) => fresh(s, 'VIC_CRAFT_shop'),
    run: (s) => ({ t: '가게를 열었습니다. 간판에 제 이름을 넣었습니다. 등기소 서류의 상호란에 그 이름을 적으며 손이 조금 떨렸습니다.', k: 'big', fx: { h: 4, money: -medX(s, 0.5) } }) },
  { id: 'vi_cra_shop_days', a: [18, 65], tags: [T('VIC_CRAFT', 'shop')], w: 45, gap: 1, rep: true,
    run: (s) => { const good = s.rng.chance(0.55);
      return { t: good ? s.rng.pick(['단골이 생겼습니다. 월급날 다음 날이 제일 바빴습니다.', '공작령 저택에서 주문이 왔습니다. 값은 묻지 않았고, 납기만 물었습니다.', '옆 가게와 서로 거스름돈을 바꿔 썼습니다. 그것이 동네였습니다.']) : s.rng.pick(['스모그가 짙은 주에는 손님이 절반이었습니다. 문은 열어 두었습니다.', '임대료가 올랐습니다. 집주인은 공작령 세금 때문이라고 했고, 공작은 가게에 온 적이 없었습니다.', occupied(s) ? '봉쇄 중에는 팔 것이 없었습니다. 가게 문을 열어 두고 배급표를 받았습니다.' : '큰 가게가 길 건너에 생겼습니다. 같은 물건이 더 쌌습니다.']), k: good ? 'warm' : 'bad', fx: good ? { money: medX(s, 0.15), h: 2 } : { money: -medX(s, 0.1), h: -2 } }; } },
  { id: 'vi_cra_whole_trn', a: [25, 65], tags: [T('VIC_CRAFT', 'wholesale')], w: 300, c: (s) => fresh(s, 'VIC_CRAFT_wholesale'),
    run: (s) => ({ t: '도매상이 되었습니다. 가게 열 곳에 물건을 댔습니다. 간판 대신 창고가 생겼고, 손님 대신 장부가 생겼습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_cra_whole_ledger', a: [25, 70], tags: [T('VIC_CRAFT', 'wholesale')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['육상함 적재항에서 물건을 받았습니다. 토룬 항구 도장이 찍힌 상자였습니다.', '거래처 하나가 문을 닫았습니다. 외상 장부의 그 줄은 지워지지 않았습니다.', '공작령 두 곳 사이의 관세가 올랐습니다. 같은 나라 안에서 국경을 넘는 기분이었습니다.']), k: 'note', fx: { money: medX(s, 0.3), h: -1 } }) },
  { id: 'vi_cra_whole_sarkaz', a: [25, 70], tags: [T('VIC_CRAFT', 'wholesale')], w: 30, gap: 3, c: (s) => s.year >= 1098,
    run: (s) => ({ t: '거래처 하나가 살카즈 가게였습니다. 1098년 이후 그 가게에 물건을 대는 도매상은 저 하나였습니다. 다른 거래처가 그것을 알았고, 주문이 줄었습니다.', k: 'bad', fx: { money: -medX(s, 0.2), h: -1 } }) },
  { id: 'vi_cra_fall', a: [14, 70], tags: [V], w: 300, c: (s) => left(s, 'VIC_CRAFT', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: occupied(s) || (s.year >= 1094 && s.year <= 1099 && s.S.flags.londinium) ? '봉쇄 중에 가게 문을 닫았습니다. 팔 것이 없었고, 살 사람도 없었습니다. 간판은 떼지 않았습니다. 뗄 힘이 없었습니다.' : '가게 문을 닫았습니다. 간판은 고물상이 가져갔습니다. 제 이름이 적힌 간판이 고물 값으로 팔렸습니다.', k: 'loss', fx: { h: -5 } }) },
  // ── VIC_RURAL 농축산·지방 산업: 가족 → 농장 → 농장주 ──
  { id: 'vi_rur_fam_work', a: [12, 40], tags: [T('VIC_RURAL', 'family')], w: 45, gap: 2,
    run: (s) => ({ t: affIs(s, 'VIC_RUR_NOMAD') ? '유목 마을의 가축을 몰았습니다. 마을이 움직이면 가축도 움직였고, 저는 그 사이를 걸었습니다.' : affIs(s, 'VIC_RUR_BRENTWOOD') ? '브렌트우드 온실에서 꽃을 땄습니다. 런디니움 저택으로 가는 꽃이었고, 저는 런디니움에 가 본 적이 없었습니다.' : affIs(s, 'VIC_RUR_EASTHAM') ? '이스트햄 가죽 공방에서 가죽을 무두질했습니다. 냄새가 옷에 배었고, 학교에서 그 냄새로 저를 알았습니다.' : '토룬 항구에서 육상함 짐을 내렸습니다. 배는 하루에 세 척, 짐은 셀 수 없었습니다.', k: 'note', fx: { cap: { skill: 0.03 }, hl: -1 } }) },
  { id: 'vi_rur_fam_harvest', a: [12, 40], tags: [T('VIC_RURAL', 'family')], w: 40, gap: 2,
    run: (s) => ({ t: cul(s).festivals[1] + ' 날이었습니다. 공작령 관리가 와서 수확량을 적어 갔습니다. 잔치는 관리가 돌아간 뒤에 시작했습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'vi_rur_farm_trn', a: [16, 55], tags: [T('VIC_RURAL', 'farm')], w: 300, c: (s) => fresh(s, 'VIC_RURAL_farm'),
    run: (s) => ({ t: '농장 일을 제 몫으로 맡았습니다. 밭 한 뙈기와 가축 몇 마리. 등기소 서류에는 아직 아버지 이름이 있었고, 일은 제 이름으로 했습니다.', k: 'ev', fx: { h: 2 } }) },
  { id: 'vi_rur_farm_days', a: [16, 60], tags: [T('VIC_RURAL', 'farm')], w: 45, gap: 1, rep: true,
    run: (s) => { const good = s.rng.chance(0.55);
      return { t: good ? '수확이 괜찮았습니다. 공작령 세금을 내고 남은 것으로 겨울을 났습니다.' : s.rng.pick(['재앙 경보가 늦게 왔습니다. 전달자는 마을 반대편부터 돌았습니다.', '공작령 세금이 올랐습니다. 공작이 사병을 늘렸다고 했습니다.', '런디니움에서 온 중개상이 값을 후려쳤습니다. 다른 중개상은 없었습니다.']), k: good ? 'warm' : 'bad', fx: good ? { money: medX(s, 0.15), h: 2 } : { money: -medX(s, 0.1), h: -2 } }; } },
  { id: 'vi_rur_farm_academy', a: [16, 22], tags: [T('VIC_RURAL', 'farm')], w: 30, c: (s) => s.S.cap.learn >= 0.5,
    run: (s) => ({ t: '마을 교사가 사관학교 이야기를 했습니다. 시골 출신이 수석으로 들어간 적이 있다고 했습니다. 한 번이었습니다. 한 번이면 길이 있는 것이라고 교사는 말했습니다.', k: 'note', fx: { cap: { learn: 0.02 } } }) },
  { id: 'vi_rur_own_trn', a: [25, 65], tags: [T('VIC_RURAL', 'owner')], w: 300, c: (s) => fresh(s, 'VIC_RURAL_owner'),
    run: (s) => ({ t: '농장주가 되었습니다. 등기소 서류의 이름이 제 것으로 바뀌었습니다. 공작령 관리는 그 서류를 보고 세금 칸을 다시 계산했습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_rur_own_hands', a: [25, 70], tags: [T('VIC_RURAL', 'owner')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['일꾼 셋을 썼습니다. 하나는 타라에서 온 사람이었습니다. 말은 서툴렀고, 가축이 그 사람을 제일 잘 따랐습니다.', '공작령 징발 통지가 왔습니다. 가축 두 마리. 영수증은 공작 인장이었고, 돈은 없었습니다.', '런디니움 시장에 직접 갔습니다. 중개상 없이. 값은 두 배였고, 기차표가 그 차액이었습니다.']), k: 'note', fx: { money: medX(s, 0.2), h: -1 } }) },
  { id: 'vi_rur_own_tara', a: [25, 70], tags: [T('VIC_RURAL', 'owner')], w: 25, gap: 4,
    run: (s) => ({ t: '타라 쪽에서 유랑민이 마을에 들어왔습니다. 마을 사람들은 문을 잠갔고, 저는 헛간을 열어 주었습니다. 다음 날 그 사람들은 없었고, 헛간은 깨끗했습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'vi_rur_fall', a: [12, 70], tags: [V], w: 300, c: (s) => left(s, 'VIC_RURAL', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'injured' ? '습격이었습니다. 마을을 지나간 무리가 누구였는지는 공작령 관리도 몰랐습니다. 밭은 남았고, 저는 일할 수 없는 몸이 되었습니다.' : '농장을 잃었습니다. 세금과 빚이 밭보다 컸습니다. 등기소 서류의 이름이 다시 바뀌었고, 이번에는 모르는 이름이었습니다.', k: 'loss', fx: { h: -5 } }) },
  // ── VIC_PRIVATE 공작 사병: 병 → 중간 지휘 → 대장 ──
  { id: 'vi_pri_pv_duty', a: [18, 50], tags: [T('VIC_PRIVATE', 'private')], w: 45, gap: 2,
    run: (s) => ({ t: affIs(s, 'VIC_PRI_REDIRON') ? '적철 근위대 병사였습니다. 웰링턴 공작의 사병이었고, 타라 쪽 국경이 근무지였습니다. 타라 말을 하는 동료가 절반이었습니다.' : affIs(s, 'VIC_PRI_GREYHAT') ? '회색 모자 소속이었습니다. 캐스터 공작의 사병. 모자는 정말 회색이었고, 하는 일은 모자보다 어두웠습니다.' : '소드베어러 병사였습니다. 윈더미어 공작령 경계를 순찰했습니다. 경계 너머도 빅토리아였고, 그래도 경계였습니다.', k: 'note', fx: { cap: { skill: 0.02 }, standing: 1 } }) },
  { id: 'vi_pri_pv_dukes', a: [18, 50], tags: [T('VIC_PRIVATE', 'private')], w: 40, gap: 2,
    run: (s) => ({ t: '공작들 사이에 충돌이 있었습니다. ' + s.rng.pick(['국경에서 다른 공작령 사병과 마주 섰습니다. 같은 말을 쓰는 적이었습니다.', '계엄이 내렸습니다. 공작령 안에서 공작의 법만 법이었습니다.', '명령은 "수도로 진입하지 말 것"이었습니다. 허가 없는 진입은 반역이었습니다.']), k: 'bad', fx: { h: -2, hl: -2 } }) },
  { id: 'vi_pri_sg_trn', a: [22, 55], tags: [T('VIC_PRIVATE', 'sergeant')], w: 300, c: (s) => fresh(s, 'VIC_PRIVATE_sergeant'),
    run: (s) => ({ t: '중간 지휘를 맡았습니다. 공작 사병의 계급은 공작마다 달랐고, 제 계급 이름은 공작이 그해에 정한 것이었습니다. 급료는 올랐습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_pri_sg_order', a: [22, 55], tags: [T('VIC_PRIVATE', 'sergeant')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['공작의 명령서가 왔습니다. 공작의 서명이 아니라 집사의 서명이었습니다. 효력은 같았습니다.', '부하 열을 받았습니다. 절반은 징집병 출신, 절반은 갱단 출신. 서로 구분이 안 되었습니다.', '마을 징발을 지휘했습니다. 영수증을 썼습니다. 영수증은 공작령 안에서만 종이였습니다.']), k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'vi_pri_sg_redirion', a: [22, 55], tags: [T('VIC_PRIVATE', 'sergeant'), 'aff:VIC_PRI_REDIRON'], w: 35, gap: 3, c: (s) => s.year >= 1098,
    run: (s) => ({ t: '적철 근위대가 타라 쪽으로 넘어갔다는 말이 돌았습니다. 대장이 그쪽 정규군을 만든다고 했습니다. 남을지 따라갈지를 하룻밤에 정해야 했습니다.', k: 'note', fx: { h: -2 } }) },
  { id: 'vi_pri_cp_trn', a: [28, 60], tags: [T('VIC_PRIVATE', 'captain')], w: 300, c: (s) => fresh(s, 'VIC_PRIVATE_captain'),
    run: (s) => ({ t: '대장이 되었습니다. 공작과 직접 말하는 자리였습니다. 공작은 제 이름을 알았고, 제 얼굴은 몰랐습니다. 둘 중 하나면 충분하다고 집사가 말했습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_pri_cp_days', a: [28, 65], tags: [T('VIC_PRIVATE', 'captain')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['공작의 저택 경비를 짰습니다. 저택이 공작령에서 제일 안전한 곳이었고, 제일 위험한 곳이었습니다.', '다른 공작령 사병 대장과 만났습니다. 둘 다 같은 사관학교 출신이었고, 둘 다 그 말을 하지 않았습니다.', '공작이 수도 진입을 명했습니다. 허가는 없었습니다. 명령과 법 중 하나를 골라야 했고, 급료를 주는 쪽을 골랐습니다.']), k: 'note', fx: { standing: 2, h: -2 } }) },
  { id: 'vi_pri_fall', a: [18, 65], tags: [V], w: 300, c: (s) => left(s, 'VIC_PRIVATE', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'exile' ? '공작이 저를 다른 공작에게 팔았다고 했습니다. 저는 다른 공작에게 공작을 팔았고, 둘 다 사실이었습니다. 국경을 넘었습니다.' : s.S.flags.lastTrackHow === 'injured' ? '공작령 충돌에서 다쳤습니다. 공작은 위로금을 보냈습니다. 집사의 서명이었습니다.' : '공작이 몰락했습니다. 사병은 공작과 함께 몰락합니다. 다른 공작은 몰락한 공작의 사병을 쓰지 않았습니다.', k: 'loss', fx: { h: -5 } }) },
  // ── VIC_POLICE 기마 경찰: 잡무 신참 → 경관 → 표창 → 경감 ──
  { id: 'vi_pol_rk_errand', a: [18, 40], tags: [T('VIC_POLICE', 'rookie')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['첫 사건은 분실 지갑이었습니다. 찾았습니다. 보고서는 두 장이었고, 지갑 속 돈보다 보고서 값이 비쌌습니다.', '말을 돌보는 일이었습니다. 경관의 말이었고, 경관은 말 이름을 몰랐습니다. 저는 알았습니다.', '"작고 어리다"는 이유로 거리 순찰에서 빠졌습니다. 서류를 정리했고, 서류 속 사건이 거리보다 많았습니다.']), k: 'note', fx: { cap: { learn: 0.02 } } }) },
  { id: 'vi_pol_rk_corrupt', a: [18, 40], tags: [T('VIC_POLICE', 'rookie')], w: 35, gap: 3,
    run: (s) => ({ t: '상관 하나가 펍 주인에게 봉투를 받는 것을 보았습니다. 보고하지 않았습니다. 보고할 곳이 그 상관이었습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'vi_pol_cs_trn', a: [20, 45], tags: [T('VIC_POLICE', 'constable')], w: 300, c: (s) => fresh(s, 'VIC_POLICE_constable'),
    run: (s) => ({ t: '경관이 되었습니다. 말을 받았고, 거리를 받았습니다. ' + affName(s, '기마 경찰') + ' 제복의 단추가 하나 늘었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_pol_cs_patrol', a: [20, 50], tags: [T('VIC_POLICE', 'constable')], w: 45, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['노포트 순찰이었습니다. 갱단 아이들이 휘파람을 두 번 불었습니다. 저를 위한 신호는 아니었습니다.', '공장 시위에 섰습니다. 노동자들은 저를 보았고, 저는 말 위에 있었습니다. 말 위는 높았고, 그래서 더 보였습니다.', '펍 방화 사건을 맡았습니다. 동료들은 손대지 말라고 했습니다. 손댔습니다.']), k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'vi_pol_cs_city', a: [20, 50], tags: [T('VIC_POLICE', 'constable'), 'aff:VIC_POL_CITY'], w: 35, gap: 3,
    run: (s) => ({ t: '시 경찰은 공작령 경찰보다 예산이 적었습니다. 말 사료부터 줄었습니다. 말이 먼저 알았습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'vi_pol_cm_trn', a: [24, 55], tags: [T('VIC_POLICE', 'commended')], w: 300, c: (s) => fresh(s, 'VIC_POLICE_commended'),
    run: (s) => ({ t: '표창을 받았습니다. 공로상 메달과 서류 한 장. 승진 이야기는 없었습니다. 표창과 승진은 다른 서류라고 서무과가 말했습니다.', k: 'big', fx: { h: 4 } }) },
  { id: 'vi_pol_cm_case', a: [24, 55], tags: [T('VIC_POLICE', 'commended')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['큰 사건을 맡았습니다. 공작령 저택이 관련되어 있었고, 사건은 저택 문 앞에서 끝났습니다.', '신문에 제 이름이 났습니다. 다음 날 상관이 "신문은 경찰이 아니다"라고 했습니다.', '감염자 은닉 신고가 들어왔습니다. 갔고, 보았고, 보고서에는 "해당 없음"이라고 썼습니다.']), k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'vi_pol_in_trn', a: [30, 60], tags: [T('VIC_POLICE', 'inspector')], w: 300, c: (s) => fresh(s, 'VIC_POLICE_inspector'),
    run: (s) => ({ t: '경감이 되었습니다. 말에서 내려 책상에 앉았습니다. 거리는 창밖이 되었고, 보고서는 제 앞이 되었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_pol_in_desk', a: [30, 65], tags: [T('VIC_POLICE', 'inspector')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['신참 하나가 분실 지갑 보고서를 두 장 써 왔습니다. 제가 쓰던 그대로였습니다.', '공작령에서 수사 중단 요청이 왔습니다. 요청이라고 적혀 있었고, 요청이 아니었습니다.', '부서 해산 이야기가 돌았습니다. 예산이었습니다. 말은 먼저 팔렸습니다.']), k: 'note', fx: { standing: 2, h: -2 } }) },
  { id: 'vi_pol_fall', a: [18, 65], tags: [V], w: 300, c: (s) => left(s, 'VIC_POLICE', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'disgrace' ? '상관의 봉투가 제 책상에서 발견되었습니다. 제 것이 아니었고, 그것을 증명할 서류는 상관이 갖고 있었습니다.' : s.S.flags.lastTrackHow === 'injured' ? '순찰 중 다쳤습니다. 말은 무사했습니다. 경찰은 말을 먼저 챙겼고, 그것이 규정이었습니다.' : '부서가 해산되었습니다. 제복은 반납했고, 말은 경매에 나갔습니다. 말 이름을 아는 사람은 저뿐이었습니다.', k: 'loss', fx: { h: -5 } }) },
  // ── VIC_OFFICE 사무직(A10): 사원 → 주임 → 비서·편집장 ──
  { id: 'vi_off_st_desk', a: [18, 55], tags: [T('VIC_OFFICE', 'staff')], w: 45, gap: 2,
    run: (s) => ({ t: affIs(s, 'VIC_OFF_PRESS') ? '신문사 편집부 막내였습니다. 기사보다 광고를 먼저 조판했습니다. 광고가 신문을 먹여 살린다고 편집장이 말했습니다.' : affIs(s, 'VIC_OFF_MP') ? '의원 사무실에서 편지를 분류했습니다. 민원 열 통에 공작령 공문 한 통. 공문이 먼저 올라갔습니다.' : affIs(s, 'VIC_OFF_FINANCE') ? '금융 회사 장부를 맞췄습니다. 숫자 끝에 공작령 이름이 붙어 있었고, 어느 공작의 돈인지에 따라 이자가 달랐습니다.' : '도매상 사무실에서 송장을 썼습니다. 토룬 항구에서 온 상자가 송장 한 장에 하나씩.', k: 'note', fx: { cap: { learn: 0.02 } } }) },
  { id: 'vi_off_st_smog', a: [18, 55], tags: [T('VIC_OFFICE', 'staff'), 'urban'], w: 30, gap: 3,
    run: (s) => ({ t: '스모그 경보가 내린 날 사무실 창을 닫았습니다. 공장 사람들은 닫을 창이 없다고 했습니다. 사무실은 그래도 사무실이었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'vi_off_sr_trn', a: [22, 60], tags: [T('VIC_OFFICE', 'senior')], w: 300, c: (s) => fresh(s, 'VIC_OFFICE_senior'),
    run: (s) => ({ t: '주임이 되었습니다. 책상이 창가로 옮겨졌습니다. 창밖은 스모그였고, 그래도 창가였습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_off_sr_work', a: [22, 60], tags: [T('VIC_OFFICE', 'senior')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['막내 둘을 받았습니다. 하나는 사관학교 떨어진 아이, 하나는 공장 반장 아들이었습니다.', '공작령 공문 양식이 바뀌었습니다. 여덟 공작령이 여덟 양식이었고, 이제 아홉이었습니다.', occupied(s) ? '봉쇄 중에도 출근했습니다. 할 일은 없었고, 배급표는 출근부에 붙어 있었습니다.' : '신문에 회사 이름이 났습니다. 좋은 기사는 아니었고, 사장은 "이름이 났다"고만 했습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'vi_off_sc_trn', a: [28, 65], tags: [T('VIC_OFFICE', 'secretary')], w: 300, c: (s) => fresh(s, 'VIC_OFFICE_secretary'),
    run: (s) => ({ t: affIs(s, 'VIC_OFF_PRESS') ? '편집장이 되었습니다. 1면을 제가 정했습니다. 1면의 절반은 광고였고, 그것도 제가 정했습니다.' : affIs(s, 'VIC_OFF_MP') ? '의원 비서가 되었습니다. 의원의 지팡이라고들 불렀습니다. 지팡이는 의원보다 먼저 의사당에 들어갔습니다.' : '사무실 책임자가 되었습니다. 서명이 제 것이 되었습니다. 서명 위의 숫자는 제 것이 아니었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_off_sc_days', a: [28, 65], tags: [T('VIC_OFFICE', 'secretary')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['공작령 하나가 기사 하나를 빼 달라고 했습니다. 뺐습니다. 다음 주에 다른 공작령이 그 기사를 넣어 달라고 했습니다.', '의회 회기 중이었습니다. 하루 열여섯 시간, 공장 감염자와 같은 시간이라고 누가 말했고, 아무도 웃지 않았습니다.', '젊은 직원이 사직서를 냈습니다. 타라로 간다고 했습니다. 말리지 않았습니다.']), k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'vi_off_fall', a: [18, 65], tags: [V], w: 300, c: (s) => left(s, 'VIC_OFFICE', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.year >= 1094 && s.year <= 1099 && s.S.flags.londinium ? '점령기에 회사가 문을 닫았습니다. 신문은 점령군 공고문이 되었고, 의원 사무실은 비었습니다. 책상은 그대로였습니다.' : '회사가 문을 닫았습니다. 마지막 날 서류를 상자에 넣었습니다. 제 이름이 적힌 서류는 한 장도 없었습니다.', k: 'loss', fx: { h: -5 } }) },
  // ── VIC_TEACHER 교사 → 교장 ──
  { id: 'vi_tea_t_class', a: [20, 60], tags: [T('VIC_TEACHER', 'teacher')], w: 45, gap: 2,
    run: (s) => ({ t: affIs(s, 'VIC_TEA_STMARCEL') ? '생 마르셸 학교 교실이었습니다. 공작 집안 아이들과 장학생이 한 교실에 앉았고, 제가 보기에는 같은 아이들이었습니다.' : '초등학교 교실이었습니다. 아이들 절반은 공장 교대 시간에 맞춰 왔고, 절반은 그 전에 일을 하고 왔습니다.', k: 'note', fx: { cap: { learn: 0.02 }, h: 1 } }) },
  { id: 'vi_tea_t_gaul', a: [20, 60], tags: [T('VIC_TEACHER', 'teacher')], w: 30, gap: 3,
    run: (s) => ({ t: '교과서에 가울이라는 이름이 없었습니다. 아이가 물었고, 저는 "옛 이름"이라고 답했습니다. 그 답이 보고서에 적힐 수 있다는 것을 알고 답했습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'vi_tea_p_trn', a: [30, 65], tags: [T('VIC_TEACHER', 'principal')], w: 300, c: (s) => fresh(s, 'VIC_TEACHER_principal'),
    run: (s) => ({ t: '교장이 되었습니다. 교실 대신 교장실. 공작령 교육 공문이 제 책상으로 왔습니다. 공문은 아이들 이야기를 하지 않았습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_tea_p_days', a: [30, 70], tags: [T('VIC_TEACHER', 'principal')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['공작령에서 교사 명단을 요구했습니다. 가울계 표시를 해 달라고 했습니다. 명단은 보냈고, 표시는 하지 않았습니다.', occupied(s) ? '점령 중에 학교 문을 열었습니다. 배급표를 아이들 손에 쥐여 주는 것이 수업이었습니다.' : '졸업생 하나가 사관학교에 들어갔습니다. 학교 게시판에 붙였습니다. 공장에 들어간 서른 명은 붙이지 않았습니다. 붙였어야 했습니다.', '학교 지붕이 샜습니다. 공작령 예산은 다음 해였고, 비는 올해였습니다.']), k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'vi_tea_fall', a: [20, 70], tags: [V], w: 300, c: (s) => left(s, 'VIC_TEACHER', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'prison' ? '자경단 정보원이었다는 것이 발각되었습니다. 학교 게시판에 제 이름이 붙었고, 이번에는 제가 붙인 것이 아니었습니다.' : '학교가 문을 닫았습니다. 아이들은 공장으로 갔고, 저는 공장에 갈 나이가 아니었습니다.', k: 'loss', fx: { h: -5 } }) },
  // ── VIC_MILITIA 점령기 자경단(1094~98 런디니움): 대원 → 조장 → 지도부 ──
  { id: 'vi_mil_mem_night', a: [14, 70], tags: [T('VIC_MILITIA', 'member')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['밤에 전단을 붙였습니다. 아침에 점령군이 떼었고, 밤에 다시 붙였습니다. 종이가 사람보다 오래 버텼습니다.', '지하 통로로 배급표를 날랐습니다. 군사위원회 배급과 자경단 배급이 따로 있었고, 둘 다 모자랐습니다.', '수디언 공장에서 석궁을 만들었습니다. 낮에는 점령군 것을, 밤에는 저희 것을.']), k: 'bad', fx: { hl: -2, standing: 3 } }) },
  { id: 'vi_mil_mem_who', a: [14, 70], tags: [T('VIC_MILITIA', 'member')], w: 35, gap: 2,
    run: (s) => ({ t: '자경단에는 공장 노동자, 가게 주인, 교사, 갱단 아이가 있었습니다. 서로 이름을 묻지 않았습니다. 이름을 모르면 말할 수도 없었습니다.', k: 'note', fx: { cap: { ties: 0.03 } } }) },
  { id: 'vi_mil_sq_trn', a: [15, 70], tags: [T('VIC_MILITIA', 'squad')], w: 300, c: (s) => fresh(s, 'VIC_MILITIA_squad'),
    run: (s) => ({ t: '조장이 되었습니다. 여섯을 맡았습니다. 여섯의 이름을 알게 되었고, 그것이 가장 위험한 지식이었습니다.', k: 'big', fx: { h: 1 } }) },
  { id: 'vi_mil_sq_op', a: [15, 70], tags: [T('VIC_MILITIA', 'squad')], w: 45, gap: 1, rep: true,
    run: (s) => { const bad = s.rng.chance(0.35);
      return { t: bad ? '작전이 실패했습니다. 여섯 중 둘이 돌아오지 않았습니다. 돌아오지 않은 이름을 지웠습니다. 종이에서만.' : '작전이 성공했습니다. 점령군 창고 하나. 식량은 그날 밤 연립 세 동에 나뉘었습니다.', k: bad ? 'loss' : 'ev', fx: bad ? { h: -5, standing: 2 } : { h: 3, standing: 4 } }; } },
  { id: 'vi_mil_ld_trn', a: [18, 70], tags: [T('VIC_MILITIA', 'leadership')], w: 300, c: (s) => fresh(s, 'VIC_MILITIA_leadership'),
    run: (s) => ({ t: '지도부에 들어갔습니다. 다섯 사람이 지하실에서 런디니움의 밤을 정했습니다. 저도 그중 하나였고, 제 이름은 그 방 밖에서는 없는 이름이었습니다.', k: 'big', fx: { h: 1 } }) },
  { id: 'vi_mil_ld_days', a: [18, 70], tags: [T('VIC_MILITIA', 'leadership')], w: 45, gap: 1,
    run: (s) => ({ t: s.rng.pick(['공작군이 성 밖에서 포위 포격을 했습니다. 안에서는 자경단이, 밖에서는 공작이, 둘 다 런디니움을 위한다고 했습니다.', '점령군 쪽에서 협상 제안이 왔습니다. 제안을 가져온 사람은 돌아가지 못했습니다. 저희 쪽 결정이 아니었습니다.', '지도부 하나가 발각되었습니다. 그날 밤 지하실을 옮겼습니다. 새 지하실은 더 깊었습니다.']), k: 'bad', fx: { h: -3, standing: 3 } }) },
  { id: 'vi_mil_disband', a: [14, 80], tags: [T('VIC_MILITIA')], w: 1000, c: (s) => s.year >= 1099,
    run: (s) => { const prev = s.S.trackHist.slice().reverse().find((h) => h.id !== 'VIC_MILITIA' && h.id !== 'VIC_INFECTED' && s.data.trackById[h.id] && !s.data.trackById[h.id].forcedEntry && s.data.trackById[h.id].exits.retire);
      if (prev && s.enterTrack(prev.id, { how: 'switch', via: 'militia_return', quiet: true })) return { t: '봉쇄가 끝났고, 자경단은 해산했습니다. 의회가 감사장을 보냈습니다. 감사장을 들고 ' + ro(s.data.trackById[prev.id].name) + ' 돌아갔습니다. 자리는 비어 있었습니다. 비워 둔 것은 아니었습니다.', k: 'ev', fx: { h: 2 } };
      s.retireTrack({}); return { t: '봉쇄가 끝났고, 자경단은 해산했습니다. 의회가 감사장을 보냈습니다. 감사장으로 살 수 있는 것은 없었고, 그래서 가게를 열었습니다.', k: 'ev', fx: { h: 2 } }; } },
  { id: 'vi_mil_fall', a: [14, 80], tags: [V], w: 300, c: (s) => left(s, 'VIC_MILITIA', null) && s.S.flags.lastTrackHow !== 'retire' && s.S.flags.lastTrackHow !== 'switch',
    run: (s) => ({ t: '자경단을 떠났습니다. 떠난 사람의 이름은 지하실 벽에서 지워졌습니다. 벽에 적힌 적이 없었으니 지울 것도 없었습니다.', k: 'loss', fx: { h: -4 } }) },
  // ── VIC_ACADEMY 사관학교: 생도 → 하사관·장교 → 대위 → 대령 → 귀족 지위 ──
  { id: 'vi_aca_cd_class', a: [16, 24], tags: [T('VIC_ACADEMY', 'cadet')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: (poor(s) || !s.S.urban ? '동기 대부분이 상류층이었습니다. 저는 아니었고, 그것이 교실에서 제일 먼저 눈에 띄는 점이었습니다. ' : '동기 대부분이 아는 얼굴이었습니다. 공작령 무도회에서 본 얼굴들이었습니다. ') + s.rng.pick(['전술 시험이었습니다. 만점이 하나 나왔습니다.', '사격 훈련에서 교관이 제 자세를 고쳤습니다. 한 번뿐이었습니다.', '야간 행군 뒤 동기 하나가 울었습니다. 아무도 보지 않았습니다.']), k: 'note', fx: { cap: { skill: 0.02, learn: 0.02 } } }) },
  { id: 'vi_aca_cd_letter', a: [16, 24], tags: [T('VIC_ACADEMY', 'cadet')], w: 35, c: (s) => standing(s) >= 45 && !s.S.flags.acaLetterAsked,
    run: (s) => { s.S.flags.acaLetterOffer = s.S.age; return { t: '교관이 추천서 이야기를 꺼냈습니다. 폭풍돌격대 선발에는 교관 추천서가 필요했습니다. 추천서는 공짜였고, 선발된 뒤의 일은 공짜가 아니었습니다.', k: 'note' }; } },
  { id: 'vi_aca_jr_trn', a: [18, 30], tags: [T('VIC_ACADEMY', 'junior')], w: 300, c: (s) => fresh(s, 'VIC_ACADEMY_junior'),
    run: (s) => ({ t: '졸업했습니다. ' + (affIs(s, 'VIC_ACA_STORM') ? '폭풍돌격대 배속이었습니다. 악기 이름으로 서로를 불렀습니다. 제 이름은 그날부터 악기였습니다.' : affIs(s, 'VIC_ACA_SECOND') ? '제2군단 배속이었습니다. 하사관으로 야전에 나갔습니다. 일반 보병보다 대우가 좋았고, 일반 보병과 같은 참호였습니다.' : '근위 배속이었습니다. 대다수가 가는 길이었습니다. 의사당 문 앞에 서는 일이었습니다.'), k: 'big', fx: { h: 4 } }) },
  { id: 'vi_aca_jr_duty', a: [18, 35], tags: [T('VIC_ACADEMY', 'junior')], w: 45, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['징집병 서른을 맡았습니다. 저보다 나이 많은 사람이 절반이었습니다.', '의장대 기수로 섰습니다. 깃발은 무거웠고, 바람이 불면 더 무거웠습니다.', '훈련 교관을 맡았습니다. 제가 받았던 훈련을 그대로 시켰습니다. 그때 저를 가르친 교관의 얼굴이 이제 이해되었습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'vi_aca_cp_trn', a: [22, 45], tags: [T('VIC_ACADEMY', 'captain')], w: 300, c: (s) => fresh(s, 'VIC_ACADEMY_captain'),
    run: (s) => ({ t: '대위가 되었습니다. 중대 하나. 명령서에 제 이름이 인쇄되어 나왔습니다. 손으로 쓴 것이 아니라 인쇄된 이름이 처음이었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_aca_cp_command', a: [22, 50], tags: [T('VIC_ACADEMY', 'captain')], w: 45, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick([occupied(s) ? '점령된 거리에서 부하를 세 번 세고서야 출발 명령을 내렸습니다. 돌아와서 다시 세었습니다. 같은 수였습니다.' : '주둔지 대위였습니다. 할 일은 보고서였고, 보고서는 "이상 없음"이었습니다.', '힐록 쪽 배치 명령이 왔다가 취소되었습니다. 취소된 이유는 듣지 못했습니다.', '중대 하나를 잃을 뻔했습니다. 잃지 않았고, 그 밤을 오래 기억했습니다.']), k: 'note', fx: { standing: 3, h: -1 } }) },
  { id: 'vi_aca_col_trn', a: [28, 55], tags: [T('VIC_ACADEMY', 'colonel')], w: 300, c: (s) => fresh(s, 'VIC_ACADEMY_colonel'),
    run: (s) => ({ t: '대령이 되었습니다. 연대였습니다. 의회가 연대장 임명을 승인했습니다. 의원 몇이 제 출신을 물었고, 몇은 묻지 않았습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_aca_col_days', a: [28, 60], tags: [T('VIC_ACADEMY', 'colonel')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['공작령 하나가 연대를 빌려 달라고 했습니다. 의회는 거절했고, 공작은 사병을 늘렸습니다.', '수도에서 귀족 지위로 가는 길이 있다고 했습니다. 제2군 쪽 사람이 말했습니다. 길이 있다는 것과 가는 것은 달랐습니다.', '타라 국경 배치였습니다. 타라 말을 하는 병사를 따로 세었습니다. 세라는 명령이었고, 센 숫자는 보고하지 않았습니다.']), k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'vi_aca_peer_trn', a: [35, 65], tags: [T('VIC_ACADEMY', 'peer')], w: 300, c: (s) => fresh(s, 'VIC_ACADEMY_peer'),
    run: (s) => ({ t: '귀족 지위를 받았습니다. 의회 의석과 함께였습니다. 사관학교 시절 동기 하나가 축하 편지를 보냈습니다. 그 아이는 처음부터 귀족이었고, 편지는 짧았습니다.', k: 'big', fx: { h: 4 } }) },
  { id: 'vi_aca_peer_days', a: [35, 70], tags: [T('VIC_ACADEMY', 'peer')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['의회에 앉았습니다. 군 예산 표결이었습니다. 제 연대의 겨울이 숫자 하나였습니다.', '공작령 무도회에 초대받았습니다. 어릴 때 밖에서 보던 불빛 안이었습니다. 안은 밖에서 보던 것보다 작았습니다.', '사관학교 졸업식에 내빈으로 갔습니다. 수석이 시골 출신이었습니다. 뒷줄에서 작게 웃음이 났고, 제가 제일 크게 박수를 쳤습니다.']), k: 'note', fx: { standing: 2, h: 1 } }) },
  { id: 'vi_aca_fall', a: [16, 70], tags: [V], w: 300, c: (s) => left(s, 'VIC_ACADEMY', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'prison' ? '군법회의였습니다. 명령과 법 사이에서 법을 골랐고, 군대는 명령을 골랐습니다.' : s.S.flags.lastTrackHow === 'injured' ? '전선에서 다쳤습니다. 상이 장교의 연금은 있었고, 상이 장교의 자리는 없었습니다.' : '군을 떠났습니다. 제복을 벗고 사관학교 앞을 지났습니다. 생도들이 경례했습니다. 제복을 보고 한 경례였고, 제복은 이제 없었습니다.', k: 'loss', fx: { h: -5 } }) },
  // ── VIC_SCHOLAR 학자(A9): 학생 → 실험팀 → 연구원 → 교수 ──
  { id: 'vi_sch_st_class', a: [17, 30], tags: [T('VIC_SCHOLAR', 'student')], w: 45, gap: 2,
    run: (s) => ({ t: affIs(s, 'VIC_SCH_ROYALSOC') ? '왕립 과학원 부속 과정이었습니다. 7백 년 된 기관이었고, 강의실 의자는 그 절반쯤 된 것 같았습니다.' : affIs(s, 'VIC_SCH_ADVANCED') ? '고등연구원 강의였습니다. 스승의 실험팀에 들어가는 것이 졸업보다 중요하다고들 했습니다.' : '국립대학 강의실이었습니다. 공작령마다 장학금이 달랐고, 제 공작령 것이 제일 적었습니다.', k: 'note', fx: { cap: { learn: 0.04 } } }) },
  { id: 'vi_sch_st_field', a: [17, 30], tags: [T('VIC_SCHOLAR', 'student')], w: 35, gap: 2,
    run: (s) => ({ t: '재앙 단층 답사를 따라갔습니다. 방호복은 선배 것을 물려받았습니다. 구멍은 선배가 표시해 두었습니다.', k: 'note', fx: { cap: { learn: 0.02 }, hl: -1 } }) },
  { id: 'vi_sch_lab_trn', a: [20, 35], tags: [T('VIC_SCHOLAR', 'lab')], w: 300, c: (s) => fresh(s, 'VIC_SCHOLAR_lab'),
    run: (s) => ({ t: '졸업 후 스승의 실험팀에 남았습니다. 급료는 학생 때와 같았고, 책임은 달랐습니다. 실험실 열쇠를 받았습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_sch_lab_work', a: [20, 40], tags: [T('VIC_SCHOLAR', 'lab')], w: 45, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['논문에 이름이 실렸습니다. 넷째 저자였습니다.', '스승이 왕립 과학원 발표를 했습니다. 자료는 제가 만들었고, 발표장에는 제 자리가 없었습니다.', '원석 시료를 다뤘습니다. 방호복 장갑이 얇았습니다. 얇다고 보고했고, 보고서는 서랍에 들어갔습니다.']), k: 'note', fx: { cap: { learn: 0.03 }, standing: 2 } }) },
  { id: 'vi_sch_lab_selfexp_seen', a: [20, 40], tags: [T('VIC_SCHOLAR', 'lab')], w: 35, c: (s) => !s.S.flags.schExpAsked,
    run: (s) => { s.S.flags.schExpOffer = s.S.age; return { t: '선임 연구원이 자기 몸에 시약을 썼다는 말이 돌았습니다. 결과는 학회지에 실렸고, 선임은 실리지 않았습니다.', k: 'note' }; } },
  { id: 'vi_sch_res_trn', a: [24, 45], tags: [T('VIC_SCHOLAR', 'researcher')], w: 300, c: (s) => fresh(s, 'VIC_SCHOLAR_researcher'),
    run: (s) => ({ t: '연구원이 되었습니다. 제 이름의 연구실. 실험팀 셋을 받았고, 그 셋에게 제가 받았던 급료를 주었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_sch_res_work', a: [24, 55], tags: [T('VIC_SCHOLAR', 'researcher')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['공작령에서 연구비가 왔습니다. 조건은 결과를 그 공작령에 먼저 보고하는 것이었습니다.', '재앙 단층 조사에서 팀원 하나가 감염되었습니다. 보고서에는 "방호 규정 준수"라고 썼습니다. 사실이었고, 그래서 더 나빴습니다.', '학회지 1저자가 되었습니다. 스승이 축하 편지를 보냈습니다. 짧았습니다.']), k: 'note', fx: { standing: 3, h: -1 } }) },
  { id: 'vi_sch_prof_trn', a: [30, 60], tags: [T('VIC_SCHOLAR', 'professor')], w: 300, c: (s) => fresh(s, 'VIC_SCHOLAR_professor'),
    run: (s) => ({ t: '교수가 되었습니다. 강의실 의자는 여전히 낡았고, 교단은 제 것이었습니다. 첫 강의에서 학생 하나가 스승이 하던 질문을 했습니다.', k: 'big', fx: { h: 4 } }) },
  { id: 'vi_sch_prof_days', a: [30, 70], tags: [T('VIC_SCHOLAR', 'professor')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['왕립 과학원 회원이 되었습니다. 7백 년 명부에 제 이름이 한 줄 들어갔습니다.', '학생 하나를 실험팀에 남겼습니다. 급료는 제가 받던 것과 같았습니다. 올리지 못했습니다.', '공작령 청문회에 전문가로 불려 갔습니다. 공작령은 답을 정해 두고 질문했습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'vi_sch_fall', a: [17, 70], tags: [V], w: 300, c: (s) => left(s, 'VIC_SCHOLAR', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'infected' ? '조사 중에 감염되었습니다. 연구실 열쇠는 그날 반납했습니다. 제 논문은 명부에 남고, 저는 남지 못했습니다.' : s.S.flags.lastTrackHow === 'injured' ? '실험실 사고였습니다. 안전 위원회 보고서는 세 장이었고, 제 이름은 둘째 장에 있었습니다.' : '연구실을 떠났습니다. 열쇠를 반납하며 처음 받던 날을 생각했습니다. 같은 열쇠였습니다.', k: 'loss', fx: { h: -5 } }) },
  // ── VIC_NOBLE 공작령 정치(A3): 가문원 → 의원 → 공작 ──
  { id: 'vi_nob_mem_house', a: [18, 50], tags: [T('VIC_NOBLE', 'member')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['가문 회의에 앉았습니다. 끝자리였습니다. 공작령 세금 이야기였고, 제 몫은 듣는 것이었습니다.', '무도회에 나갔습니다. 여덟 공작령의 깃발 아래서 춤을 췄고, 깃발마다 다른 쪽 눈치를 보았습니다.', '가문 사병 열병식에 섰습니다. 사병들이 경례했습니다. 제가 아니라 가문에.']), k: 'note', fx: { cap: { ties: 0.03 } } }) },
  { id: 'vi_nob_mem_blood', a: [18, 50], tags: [T('VIC_NOBLE', 'member')], w: 30, gap: 3,
    run: (s) => ({ t: (s.S.race === 'aslan' || s.S.race === 'draco' ? '혈통 이야기가 나왔습니다. 제 혈통이었습니다. 왕이 없는 나라에서 왕족 혈통은 자산이자 짐이었습니다.' : '혈통 이야기가 나왔습니다. 아슬란과 드라코. 제 가문은 둘 다 아니었고, 그래서 그 이야기에서 제 자리는 듣는 쪽이었습니다.'), k: 'note', fx: { h: -1 } }) },
  { id: 'vi_nob_mp_trn', a: [22, 60], tags: [T('VIC_NOBLE', 'mp')], w: 300, c: (s) => fresh(s, 'VIC_NOBLE_mp'),
    run: (s) => ({ t: '의원이 되었습니다. 가문 의석이었습니다. 의사당 제 자리에 가문 문장이 새겨져 있었습니다. 저보다 먼저 거기 있던 것이었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'vi_nob_mp_vote', a: [22, 65], tags: [T('VIC_NOBLE', 'mp')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['감염자 노동법 개정안 표결이었습니다. 열네 시간 상한. 부결되었습니다. 저는 찬성했고, 가문은 반대했습니다. 다음 가문 회의에서 끝자리로 돌아갔습니다.', '타라 재점령 결의안이었습니다. 찬성했습니다. 연대 하나가 그 표 하나로 움직였습니다.', s.year >= 1098 ? '새 의장이 섰습니다. 노포트 갱단 두목 출신이었습니다. 의사당 절반이 자리를 뜨지 않았고, 저도 뜨지 않았습니다.' : '공작령 간 관세 표결이었습니다. 여덟 공작령이 여덟 표로 갈렸습니다.']), k: 'note', fx: { standing: 3, h: -1 } }) },
  { id: 'vi_nob_duke_trn', a: [30, 75], tags: [T('VIC_NOBLE', 'duke')], w: 300, c: (s) => fresh(s, 'VIC_NOBLE_duke'),
    run: (s) => ({ t: '공작이 되었습니다. 여덟 중 하나. 공작령의 사병, 세금, 법이 제 서명 하나로 움직였습니다. 왕이 없는 나라의 여덟 왕 중 하나였고, 그것이 이 나라의 병이었습니다.', k: 'big', fx: { h: 4, money: medX(s, 5) } }) },
  { id: 'vi_nob_duke_days', a: [30, 80], tags: [T('VIC_NOBLE', 'duke')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['다른 공작령과 국경 분쟁이 있었습니다. 같은 나라 안에서. 사병을 보냈고, 의회에는 보고하지 않았습니다.', '공작령 수확제를 열었습니다. 저택 앞 광장에 농민 수천이 왔습니다. 세금 이야기는 그날 하지 않았습니다.', '수도 진입 허가를 신청했습니다. 공작이 수도에 들어가려면 허가가 필요했습니다. 거절되었습니다. 늘 그랬습니다.']), k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'vi_nob_fall', a: [18, 80], tags: [V], w: 300, c: (s) => left(s, 'VIC_NOBLE', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'exile' ? '가문이 무너졌습니다. 다른 공작들이 가문의 무기를 소각했고, 저는 그날 밤 국경을 넘었습니다. 문장이 새겨진 의석은 비어 있을 것입니다.' : '가문에서 밀려났습니다. 의석은 사촌이 받았고, 저택 문은 닫혔습니다. 가문 문장이 새겨진 것은 아무것도 가져오지 못했습니다.', k: 'loss', fx: { h: -6 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 런디니움 점령기(1094~98) 연동: 국외 피난 트리거, 자경단 입단은 결정에서
  // ════════════════════════════════════════════════════════════════════
  { id: 'vi_londinium_flee', a: [15, 70], tags: [V, '!nation:tara', '!prison:camp', '!prison:jail', '!rhodes'], w: 60, gap: 1, c: (s) => s.year >= 1095 && s.year <= 1097 && occupied(s) && s.rng.chance(0.12),
    run: (s) => { if (!s.migrate('flee')) return { t: '성 밖으로 나가는 길을 알아보았습니다. 값은 가진 것의 절반이었고, 가진 것이 절반도 되지 않았습니다.', k: 'note', fx: { h: -2 } };
      s.S.flags.londiniumEscaped = true; return { t: '봉쇄 ' + (s.year - 1094) + '년째, 성을 빠져나와 국경을 넘었습니다. ' + nat(s, s.S.cur) + '. 가져온 것은 두 손에 든 것뿐이었고, 런디니움 이야기는 하지 않았습니다.', k: 'big', fx: { money: pct(s, 0.4), h: 2 }, f: F('공작령 등기소 런디니움 봉쇄 기록') }; } },

  // ════════════════════════════════════════════════════════════════════
  // 생업·동네·계절: 스모그, 펍, 축구, 차, 공작령 수확제, 전달자 취임 서약식, 트램
  // ════════════════════════════════════════════════════════════════════
  { id: 'vi_life_smog', a: [10, 90], tags: [V, '!nation:tara', 'urban'], w: 35, gap: 3,
    run: (s) => s.rng.chance(0.22) ? ({ t: '스모그 경보가 올해 ' + s.rng.ri(20, 70) + '일째였습니다. 공작령 공고는 작년보다 ' + s.rng.ri(3, 15) + '일 적다고 했습니다. 기침은 세지 않았습니다.', k: 'note', fx: { hl: -2 }, f: orgF(s, '대기 경보 집계, ' + s.year + '년') }) : ((s) => ({ t: '스모그가 짙은 주였습니다. ' + s.rng.pick(['낮에 가로등이 켜졌습니다. 아이들은 그것을 좋아했고, 노인들은 기침을 했습니다.', '창틀에 검은 먼지가 손가락 한 마디 쌓였습니다. 닦았고, 다음 날 다시 쌓였습니다.', '공작령 공고가 붙었습니다. "외출 자제". 공장은 자제하지 않았습니다.']), k: 'note', fx: { hl: -2 } }))(s) },
  { id: 'vi_life_pub', a: [16, 90], tags: [V, '!nation:tara'], w: 35, gap: 2,
    run: (s) => s.rng.chance(0.22) ? ({ t: '펍에서 ' + s.rng.ri(2, 4) + '잔을 마셨습니다. 외상 장부에 제 줄이 ' + s.rng.ri(3, 12) + '칸이 되었습니다. 주인은 세지 않는 척했고, 세고 있었습니다.', k: 'note', fx: { h: 1, money: -medX(s, 0.02) }, f: F('펍 외상 장부') }) : ((s) => ({ t: '펍에 갔습니다. ' + s.rng.pick(['월급날이었습니다. 첫 잔은 반장이, 둘째 잔은 각자가, 셋째 잔은 아무도 기억 못 했습니다.', '구석 자리 노인이 탑의 기사 이야기를 했습니다. 절반은 틀렸고, 아무도 고치지 않았습니다.', '다트판 옆에 공작 여덟의 그림이 붙어 있었습니다. 그림마다 구멍 수가 달랐습니다.']), k: 'warm', fx: { h: 2, money: -medX(s, 0.02) } }))(s) },
  { id: 'vi_life_football', a: [10, 90], tags: [V, '!nation:tara'], w: 30, gap: 2,
    run: (s) => s.rng.chance(0.22) ? ({ t: '동네 축구 경기였습니다. 공장 팀이 ' + s.rng.ri(1, 5) + ' 대 ' + ro(String(s.rng.ri(0, 4))) + ' 이겼습니다. 심판은 펍 주인이었고, 판정은 외상 장부 순이었습니다.', k: 'warm', fx: { h: 3, hl: 1 }, f: F('공장 노동자 체육회 경기 기록') }) : ((s) => ({ t: '동네 축구 경기였습니다. ' + s.rng.pick(['공장 팀과 하역장 팀. 심판은 펍 주인이었고, 판정은 외상 장부 순이었습니다.', '진흙 밭이었고, 공은 하나였고, 사람은 서른이었습니다. 이긴 쪽이 펍에서 한턱냈습니다.', '아이들이 골대 뒤에서 자기들 경기를 했습니다. 그쪽이 더 진지했습니다.']), k: 'warm', fx: { h: 3, hl: 1 } }))(s) },
  { id: 'vi_life_tea', a: [10, 90], tags: [V, '!nation:tara'], w: 30, gap: 3,
    run: (s) => s.rng.chance(0.22) ? ({ t: '이웃이 차를 들고 왔습니다. 설탕 값이 올해 ' + s.rng.ri(10, 40) + '% 올랐다고 했습니다. 차 값은 그대로였고, 그래서 설탕 없이 마셨습니다.', k: 'warm', fx: { h: 1 }, f: orgF(s, '물가 고시, ' + s.year + '년') }) : ((s) => ({ t: '"' + cul(s).greet + '" 이웃이 문을 두드렸습니다. ' + cul(s).drink + ' 한 주전자에 ' + s.rng.pick(['동네 소식 세 가지가 따라왔습니다. 두 가지는 틀린 소식이었습니다.', '설탕은 없었습니다. 설탕 값이 올랐고, 차 값은 그대로였습니다.', '파이 한 조각이 따라왔습니다. 이웃의 아이가 공장에 들어갔다고 했습니다.']), k: 'warm', fx: { h: 2 } }))(s) },
  { id: 'vi_life_harvest', a: [10, 90], tags: [V, '!nation:tara', 'rural'], w: 35, gap: 2,
    run: (s) => ({ t: cul(s).festivals[1] + '였습니다. ' + s.rng.pick(['공작령 저택 앞 광장에 마을 전체가 모였습니다. 공작은 발코니에서 손을 흔들었고, 손은 작았습니다.', '사병들이 잔치를 지켰습니다. 사병들도 먹었습니다. 그날만은.', '수확량을 적은 종이가 공작령 관리 손에 있었고, 수확은 마을 손에 있었습니다. 종이가 더 무거웠습니다.']), k: 'warm', fx: { h: 3 } }) },
  { id: 'vi_life_messenger_oath', a: [10, 90], tags: [V, '!nation:tara', 'rural'], w: 25, gap: 4,
    run: (s) => ({ t: iga(cul(s).festivals[0]) + ' 있었습니다. 새 재앙 전달자가 마을 광장에서 서약을 낭독했습니다. 마을 사람들은 서약보다 그 사람의 발을 보았습니다. 그 발이 마을을 살릴 발이었습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'vi_life_tram', a: [10, 90], tags: [V, '!nation:tara', 'urban'], w: 30, gap: 3,
    run: (s) => s.rng.chance(0.22) ? ({ t: '트램 요금이 ' + s.rng.ri(2, 6) + '펜스가 되었습니다. 공작령 공고는 "운영비"라고 했습니다. 걷는 사람이 늘었습니다.', k: 'note', fx: { money: -medX(s, 0.01) }, f: F('시 궤도 운송 요금 고시, ' + s.year + '년') }) : ((s) => ({ t: '트램을 탔습니다. ' + s.rng.pick(['공장지대에서 궁전구까지 한 번에 가는 노선이었고, 궁전구에서 내리는 사람은 없었습니다.', '요금이 올랐습니다. 공작령 공고는 "운영비"라고 했습니다.', '옆자리 사람이 신문을 읽었습니다. 1면은 공작, 2면도 공작, 3면은 광고였습니다.']), k: 'note', fx: { money: -medX(s, 0.01) } }))(s) },
  { id: 'vi_life_dukes_war', a: [12, 90], tags: [V, '!nation:tara'], w: 25, gap: 4,
    run: (s) => s.rng.chance(0.22) ? ({ t: '공작 둘이 다툰다는 소식이 왔습니다. 공작령 세금이 ' + s.rng.ri(5, 20) + '% 올랐습니다. 사병 값이라고 공고에 적혀 있었습니다.', k: 'bad', fx: { h: -2, money: -medX(s, 0.04) }, f: orgF(s, '세율 고시, ' + s.year + '년') }) : ((s) => ({ t: '공작 둘이 다툰다는 소식이 왔습니다. ' + s.rng.pick(['국경 쪽 길이 막혔습니다. 같은 나라 안의 국경이었습니다.', '세금이 올랐습니다. 사병 값이라고 했습니다.', '동네 펍에서 어느 공작 편인지로 싸움이 났습니다. 둘 다 그 공작을 본 적이 없었습니다.']), k: 'bad', fx: { h: -2, money: -medX(s, 0.03) } }))(s) },

  // ════════════════════════════════════════════════════════════════════
  // 소속 변주(aff:), 관계(살카즈 1098~ 제도적 차별), 이주 신참, 방문
  // ════════════════════════════════════════════════════════════════════
  { id: 'vi_aff_caladon', a: [14, 65], tags: ['aff:VIC_FAC_CALADON'], w: 35, gap: 3,
    run: (s) => ({ t: '칼라돈 공장이었습니다. 고도딘 공작령. 감염자 노동법이 처음 만들어진 곳이었고, 라인의 절반이 감염자였습니다. 임금 봉투가 두 종류였습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'vi_aff_royaldell', a: [14, 65], tags: ['aff:VIC_FAC_ROYALDELL'], w: 35, gap: 3,
    run: (s) => ({ t: '로열 델 병기창 출입증은 다른 공장 출입증과 색이 달랐습니다. 그 색으로 펍에서 외상이 되었습니다. 병기창은 망하지 않는다고 다들 알았습니다.', k: 'note', fx: { money: medX(s, 0.1) } }) },
  { id: 'vi_aff_storm', a: [18, 55], tags: ['aff:VIC_ACA_STORM'], w: 35, gap: 3,
    run: (s) => ({ t: '폭풍돌격대 여섯 섹션 중 하나였습니다. 서로를 악기 이름으로 불렀고, 본명을 아는 사람은 지휘관뿐이었습니다. 작전은 짧았고, 섹션은 가끔 줄었습니다.', k: 'bad', fx: { hl: -2, standing: 3 } }) },
  { id: 'vi_aff_duchy', a: [18, 80], tags: ['aff:VIC_NOB_DUCHY'], w: 30, gap: 4,
    run: (s) => ({ t: '8대 공작령 회의였습니다. 여덟 가문이 한 탁자에 앉았고, 탁자는 여덟 조각으로 갈라진 것처럼 보였습니다. 결론은 "다음 회의"였습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }) },
  { id: 'vi_rel_sarkaz_papers', a: [10, 90], tags: [V], w: 60, gap: 2, c: (s) => sarkaz(s) && s.year >= 1098,
    run: (s) => ({ t: '서류에 종족 칸이 있었습니다. 살카즈. 1098년 이후 그 칸이 나머지 칸을 정했습니다. ' + s.rng.pick(['임대 계약이 거절되었습니다. 이유는 적히지 않았습니다.', '거리에서 "전범"이라는 말을 들었습니다. 런디니움에 간 적도 없었습니다.', '일자리 면접에서 면접관이 서류를 덮었습니다. 종족 칸까지만 읽었습니다.']), k: 'bad', fx: { h: -3, money: -medX(s, 0.05) } }) },
  { id: 'vi_rel_sarkaz_spouse', a: [18, 90], tags: [V, 'married'], w: 40, gap: 3, c: (s) => s.year >= 1098 && (sarkaz(s) || (s.S.fam.partner && s.S.fam.partner.race === 'sarkaz')),
    run: (s) => ({ t: '살카즈와 결혼한 집이라는 것이 동네에 알려졌습니다. 1098년 이후였습니다. 문 앞에 무엇이 놓이는 날이 있었고, 치우는 것이 아침 일이 되었습니다.', k: 'bad', fx: { h: -3 } }) },
  { id: 'vi_rel_institutional', a: [10, 90], tags: [V, 'rel:institutional'], w: 40, gap: 3,
    run: (s) => ({ t: '등기소 창구가 둘이었습니다. 하나는 줄이 짧았고, 제 줄은 길었습니다. 줄을 가르는 것은 서류의 종족 칸이었습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'vi_newcomer_tea', a: [10, 80], tags: [V, 'newcomer'], w: 35, gap: 2,
    run: (s) => ({ t: '이웃이 "' + cul(s).greet + '"라고 했습니다. 질문인 줄 알고 대답했습니다. 인사였습니다. 이웃은 웃었고, 그날 처음 차를 얻어 마셨습니다.', k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } }) },
  { id: 'vi_newcomer_duchy', a: [10, 80], tags: [V, 'newcomer'], w: 30, gap: 3,
    run: (s) => ({ t: '공작령이 여덟이라는 것을 몰랐습니다. 공작령 경계를 넘을 때 서류가 다시 필요했습니다. 같은 나라였고, 같은 나라가 아니었습니다.', k: 'note', fx: { h: -1, money: -medX(s, 0.03) } }) },
  { id: 'vi_newcomer_factory', a: [14, 60], tags: [V, 'newcomer', 'urban'], w: 30, gap: 3,
    run: (s) => ({ t: '공장 앞 줄에 섰습니다. 반장이 말을 시켰고, 제 말이 서툴자 손을 보았습니다. 손으로 뽑혔습니다.', k: 'note', fx: { cap: { ties: 0.01 } } }) },
  { id: 'vi_visit_smog', a: [15, 70], tags: ['visit:victoria'], w: 30, gap: 3,
    run: (s) => ({ t: '빅토리아에 머무는 동안 하늘을 한 번도 제대로 보지 못했습니다. 공장 연기였습니다. 사람들은 그것을 날씨라고 불렀습니다.', k: 'note', fx: { hl: -1 } }) },
  { id: 'vi_visit_dukes', a: [15, 70], tags: ['visit:victoria'], w: 25, gap: 3,
    run: (s) => ({ t: '빅토리아 공작령 경계에서 검문을 받았습니다. 한 나라 안에서 두 번째 검문이었습니다. 검문관은 다른 공작의 도장을 보고 얼굴을 찡그렸습니다.', k: 'note' }) },
  { id: 'vi_visit_pub', a: [15, 70], tags: ['visit:victoria'], w: 25, gap: 3,
    run: (s) => ({ t: '빅토리아 펍에서 차를 시켰습니다. 주인이 잠시 저를 보더니 차를 주었습니다. 옆자리 사람은 맥주를 마시며 공작 욕을 했습니다. 어느 공작인지는 끝내 몰랐습니다.', k: 'note', fx: { h: 1 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 캐논 인물(1회성, 연도 게이트, 생애 3명 상한, 거리감)
  // ════════════════════════════════════════════════════════════════════
  { id: 'vi_canon_horn', a: [16, 60], tags: [V], w: 60, c: (s) => canonOk(s, 'horn', 1094, 1098) && !!s.S.track && ['VIC_ACADEMY', 'VIC_CONSCRIPT'].includes(s.S.track.id) && !!s.S.flags.londinium,
    run: (s) => { seeCanon(s, 'horn'); return { t: '사관학교 출신 대위가 점령된 거리에서 부하들을 세 번 세고서야 출발 명령을 내렸습니다. 저는 그 부하 중 하나였거나, 그 옆 부대였습니다. 이름은 나중에 알았습니다.', k: 'note', fx: { h: 1 } }; } },
  { id: 'vi_canon_bagpipe', a: [16, 60], tags: [V], w: 60, c: (s) => canonOk(s, 'bagpipe', 1094, 1105) && !!s.S.track && ['VIC_ACADEMY', 'VIC_RURAL'].includes(s.S.track.id),
    run: (s) => { seeCanon(s, 'bagpipe'); return { t: s.S.track.id === 'VIC_RURAL' ? '유목 마을 농가 출신이 사관학교 수석이 되었다는 소식이 마을에 돌았습니다. 그 집 가축을 어릴 때 본 적이 있었습니다. 그것뿐이었습니다.' : '시골 출신이라는 생도가 수석으로 호명되자 뒷줄에서 작게 웃음이 터졌고, 그 생도가 제일 크게 웃었습니다. 저는 뒷줄이었습니다.', k: 'note', fx: { h: 1 } }; } },
  { id: 'vi_canon_siege', a: [10, 60], tags: [T('VIC_GANG')], w: 60, c: (s) => canonOk(s, 'siege', 1094, 1105),
    run: (s) => { seeCanon(s, 'siege'); return { t: '두목이 체육관 문턱에 앉아 신입에게 "싸움은 밖에서" 한마디만 했습니다. 신입은 저였거나 제 옆 아이였습니다. 그 뒤로 그 사람을 가까이서 본 적은 없습니다.', k: 'note', fx: { h: 1 } }; } },
];

// ════════════════════════════════════════════════════════════════════
// 결정(13): 공장 파업 · 사관학교 추천서 · 갱단 결투 · 자경단 입단 · 경찰 상관 봉투 · 학자 자가 실험 · 징집병 감염 은폐 · 제대 후 사병 제안
//          · 혼인(parish 빅토리아/타라, registry, peerage) · home_change(빅토리아·타라·카시미어 공용)
// ════════════════════════════════════════════════════════════════════
const marryWrap = (typeId, bodyOf, labels, nations) => ({
  tags: [], once: false, at: 0.45,
  ok: (s) => ENGINE_DECISIONS.marry.ok(s) && !!(s.S.flags.y_marry && s.S.flags.y_marry.v && s.S.flags.y_marry.v.type.id === typeId),
  build: (s, p) => { const v = ENGINE_DECISIONS.marry.build(s, p); if (!v || !nations.includes(s.S.cur)) return v;
    return { ...v, body: bodyOf(s, p.prospect, p.type), choices: v.choices.map((c, i) => ({ ...c, label: labels[i] || c.label })) }; },
  apply: (s, k, p) => ENGINE_DECISIONS.marry.apply(s, k, p),
});

export const decisions = {
  vi_fac_strike: {
    tags: [T('VIC_FACTORY')], once: true, at: 0.5,
    ok: (s) => !!s.S.flags.facStrikeOffer && s.S.age - s.S.flags.facStrikeOffer <= 1,
    build: (s) => { s.S.flags.facStrikeAsked = true;
      return { title: '라인을 멈추는 일', body: '대표단 종이가 제 앞에 왔습니다. 이름을 적으면 다음 주 월요일 라인이 섭니다. 관리자는 명단을 받아 볼 것이고, 기마 경찰은 공장 앞에 설 것입니다. 적지 않으면 월요일에 라인에 서는 사람이 됩니다.',
        choices: [{ k: 'join', label: '이름을 적는다', sub: '동네 평판 +, 해고 위험', auto: 1.2 }, { k: 'no', label: '적지 않는다', sub: '그대로', auto: 1 }] }; },
    apply: (s, k) => { if (k !== 'join') return { t: '적지 않았습니다. 월요일에 라인에 섰습니다. 라인은 절반이 비어 있었고, 그 절반이 저를 보았습니다.', k: 'note', fx: { h: -3 } };
      const r = s.rng.rnd();
      if (r < 0.2) { s.fall('layoff'); return false; }
      if (r < 0.6) return { t: '이름을 적었습니다. 라인이 사흘 섰습니다. 관리자가 약속을 셋 했고, 라인은 다시 돌았습니다. 약속은 돌지 않았습니다.', k: 'ev', fx: { standing: 6, h: 1, cap: { ties: 0.04 } } };
      return { t: '이름을 적었습니다. 라인이 열흘 섰습니다. 안전선이 넓어졌고, 임금이 조금 올랐습니다. 조금이었고, 열흘치는 아니었습니다.', k: 'warm', fx: { standing: 10, h: 3, money: medX(s, 0.1), cap: { ties: 0.05 } } }; },
  },
  vi_aca_letter: {
    tags: [T('VIC_ACADEMY')], once: true, at: 0.5,
    ok: (s) => !!s.S.flags.acaLetterOffer && s.S.age - s.S.flags.acaLetterOffer <= 1,
    build: (s) => { s.S.flags.acaLetterAsked = true;
      return { title: '추천서', body: '교관이 폭풍돌격대 선발 추천서를 써 주겠다고 합니다. 의회 직속 특수부대. 급료는 좋고, 작전은 짧고, 섹션은 가끔 줄어듭니다. 거절하면 근위나 제2군단, 대다수가 가는 길입니다.',
        choices: [{ k: 'yes', label: '추천서를 받는다', sub: '폭풍돌격대 · 몰락 위험 +', auto: 1 }, { k: 'no', label: '사양한다', sub: '근위·제2군단', auto: 1.2 }] }; },
    apply: (s, k) => { if (k !== 'yes') return { t: '사양했습니다. 교관은 고개를 끄덕였고, 추천서는 다른 생도에게 갔습니다. 그 생도의 이름은 2년 뒤 추모 명부에서 보았습니다.', k: 'note' };
      if (s.S.track && s.data.affById.VIC_ACA_STORM) s.S.track.aff = 'VIC_ACA_STORM';
      return { t: '추천서를 받았습니다. 선발을 통과했고, 악기 이름 하나를 받았습니다. 본명은 지휘관만 알게 되었습니다.', k: 'big', fx: { h: 3, standing: 5 } }; },
  },
  vi_gang_duel: {
    tags: [T('VIC_GANG', 'lieutenant')], once: true, at: 0.5,
    ok: (s) => inStage(s) >= 3 && standing(s) >= 55 && s.rng.chance(0.3),
    build: (s) => ({ title: '결투', body: '글래스고의 두목은 결투로 바뀝니다. 지금 두목은 늙었고, 저는 부관입니다. 신청하면 체육관 링에서 끝이 납니다. 이기면 두목, 지면 문턱.',
      choices: [{ k: 'duel', label: '결투를 신청한다', sub: '두목 / 부상·강등', auto: 1 }, { k: 'wait', label: '때를 기다린다', auto: 1.2 }] }),
    apply: (s, k) => { if (k !== 'duel') return { t: '기다렸습니다. 두목은 그해 겨울 체육관 문턱에서 "싸움은 밖에서"를 한 번 더 말했고, 저는 그 말을 받아 적었습니다.', k: 'note' };
      const win = s.rng.chance(0.45 + s.S.cap.skill * 0.15);
      if (win) { s.promote({ force: true }); return { t: '링에서 이겼습니다. 두목이 장갑을 벗어 제게 주었습니다. 동네 아이들이 문밖에서 보고 있었고, 저는 아이들을 먼저 돌려보냈습니다.', k: 'big', fx: { h: 4, hl: -4 } }; }
      s.eff({ hl: -10, standing: -15 }); return { t: '링에서 졌습니다. 두목은 저를 내보내지 않았습니다. 그것이 글래스고였고, 그래서 더 아팠습니다.', k: 'bad', fx: { h: -5 } }; },
  },
  vi_militia_join: {
    tags: [V, '!nation:tara', '!track:VIC_MILITIA', '!prison:camp', '!prison:jail', '!rhodes'], once: true, at: 0.5,
    ok: (s) => occupied(s) && s.S.age >= 14 && s.rng.chance(0.35) && !!s.data.trackById.VIC_MILITIA,
    build: (s) => ({ title: '자경단', body: '봉쇄 ' + (s.year - 1094) + '년째. 공장 노동자와 가게 주인이 밤에 모인다고 합니다. 이름은 묻지 않고, 발각되면 처형입니다. 함께 일하던 사람이 저를 그 모임에 데려가겠다고 했습니다.', fact: F('런디니움 시민 자경단 전단(압수본)'),
      choices: [{ k: 'join', label: '함께 간다', sub: '진로 전환 · 처형 위험', auto: 0.8 }, { k: 'no', label: '문을 닫고 있는다', sub: '변화 없음', auto: 1.2 }] }),
    apply: (s, k) => { if (k !== 'join') return { t: '문을 닫고 있었습니다. 밤에 지나가는 발소리를 세었습니다. 가끔 아는 발소리였습니다.', k: 'note', fx: { h: -2 } };
      if (s.enterTrack('VIC_MILITIA', { how: 'switch', via: 'londinium', quiet: true })) return { t: '함께 갔습니다. 지하실에 열둘이 있었고, 이름은 아무도 말하지 않았습니다. 그날부터 낮은 낮 일, 밤은 자경단이었습니다.', k: 'big', fx: { h: 2, cap: { ties: 0.03 } } };
      return '모임은 그날 밤 열리지 않았습니다.'; },
  },
  vi_pol_envelope: {
    tags: [T('VIC_POLICE')], once: true, at: 0.5,
    ok: (s) => (s.S.track ? s.S.track.stage : -1) >= 1 && s.rng.chance(0.25),
    build: (s) => ({ title: '봉투', body: '펍 주인이 봉투를 내밀었습니다. 상관이 받던 그 봉투입니다. 상관은 지난달 다른 부서로 갔고, 봉투는 자리를 따라 왔습니다. 받으면 매달이고, 거절하면 펍 주인은 상관에게 말할 것입니다.',
      choices: [{ k: 'take', label: '받는다', sub: '돈 +, 추문 위험', auto: 0.8 }, { k: 'refuse', label: '돌려준다', sub: '상관과 틀어짐', auto: 1.2 }] }),
    apply: (s, k) => { if (k === 'take') { s.S.flags.polEnvelope = true; if (s.rng.chance(0.2)) { s.fall('scandal'); return false; } return { t: '받았습니다. 매달 왔습니다. 봉투는 얇았고, 잠은 그보다 얇았습니다.', k: 'bad', fx: { money: medX(s, 0.3), h: -3 } }; }
      s.eff({ standing: -5 }); return { t: '돌려주었습니다. 다음 달 순찰 구역이 바뀌었습니다. 노포트 맨 안쪽이었습니다. 펍 주인은 그 소식을 저보다 먼저 알았습니다.', k: 'ev', fx: { h: 1 } }; },
  },
  vi_sch_selfexp: {
    tags: [T('VIC_SCHOLAR')], once: true, at: 0.5,
    ok: (s) => !!s.S.flags.schExpOffer && s.S.age - s.S.flags.schExpOffer <= 1,
    build: (s) => { s.S.flags.schExpAsked = true;
      return { title: '자가 실험', body: '시약이 있습니다. 동물 실험은 끝났고, 사람 실험은 승인이 3년 걸립니다. 제 몸에 쓰면 3년이 석 달이 됩니다. 결과는 학회지에 실릴 것이고, 몸은 실리지 않을 것입니다.',
        choices: [{ k: 'go', label: '제 몸에 쓴다', sub: '연구 실적 ++ / 건강·감염 위험', auto: 0.6 }, { k: 'no', label: '3년을 기다린다', auto: 1.4 }] }; },
    apply: (s, k) => { if (k !== 'go') return { t: '기다리기로 했습니다. 승인은 4년 걸렸고, 그동안 다른 연구실이 같은 결과를 냈습니다.', k: 'note', fx: { h: -2 } };
      const r = s.rng.rnd();
      if (r < 0.15) { s.infect('experiment'); return { t: '시약을 썼습니다. 석 달 뒤 결과가 나왔고, 결정도 나왔습니다. 논문은 실렸습니다.', k: 'loss', fx: { standing: 15, h: -6 } }; }
      if (r < 0.4) return { t: '시약을 썼습니다. 한 달을 앓았습니다. 결과는 쓸 만했고, 몸은 쓸 만하지 않았습니다.', k: 'bad', fx: { hl: -15, standing: 8 } };
      return { t: '시약을 썼습니다. 결과가 나왔습니다. 학회지 1저자. 스승이 처음으로 긴 편지를 보냈습니다.', k: 'big', fx: { standing: 15, h: 4, hl: -4, cap: { learn: 0.05 } } }; },
  },
  vi_con_hide: {
    tags: [T('VIC_CONSCRIPT'), 'infected', '!known'], once: true, at: 0.5,
    ok: (s) => s.S.ori.on && !s.S.ori.known && s.rng.chance(0.5),
    build: (s) => ({ title: '검진', body: '부대 정기 검진이 내일입니다. 몸에 결정이 있다는 것을 저는 압니다. 의무관이 보면 소모품 분대, 맨 앞 참호입니다. 검진 명부에서 제 이름을 빼 줄 서기가 있습니다. 값은 두 달치 급료입니다.',
      choices: [{ k: 'pay', label: '이름을 뺀다', sub: '돈 −, 발각 시 처벌', auto: 1.2 }, { k: 'go', label: '검진을 받는다', sub: '감염자 분대', auto: 0.8 }] }),
    apply: (s, k) => { if (k !== 'go') { s.eff({ money: -medX(s, 0.3) }); s.S.flags.conHid = true; return { t: '이름을 뺐습니다. 서기는 봉투를 세지 않았습니다. 다음 검진은 반년 뒤였고, 그때까지는 보통 참호였습니다.', k: 'note', fx: { h: -2 } }; }
      s.S.ori.known = true; return { t: '검진을 받았습니다. 의무관은 결정을 보고도 도장을 찍었습니다. 다음 날 감염자 분대 명부에 제 이름이 있었습니다.', k: 'bad', fx: { h: -5 } }; },
  },
  vi_con_private_offer: {
    tags: [V, '!track:VIC_PRIVATE', '!track:VIC_CONSCRIPT'], once: true, at: 0.5,
    ok: (s) => cameFrom(s, 'VIC_CONSCRIPT') && s.S.flags.lastTrackHow === 'discharged' && s.S.age - (s.S.flags.lastTrackLeftAt ?? -99) <= 2 && s.S.age <= 35 && !!s.data.trackById.VIC_PRIVATE,
    build: (s) => ({ title: '공작의 사람', body: '제대 병사를 찾는 사람이 펍에 왔습니다. 공작 사병 모집이었습니다. 급료는 왕실군의 두 배, 명령은 공작 집사가 내리고, 공작이 몰락하면 같이 몰락합니다.',
      choices: [{ k: 'join', label: '사병이 된다', sub: '공작 사병 진로', auto: 1 }, { k: 'no', label: '총은 그만 든다', auto: 1.3 }] }),
    apply: (s, k) => { if (k !== 'join') return { t: '거절했습니다. 그 사람은 다음 탁자로 갔고, 다음 탁자는 받았습니다.', k: 'note' };
      if (s.enterTrack('VIC_PRIVATE', { how: 'switch', via: 'veteran', quiet: true })) return { t: '사병이 되었습니다. ' + affName(s, '공작 사병') + '. 제복 색이 바뀌었고, 깃발에 왕관 대신 공작 문장이 있었습니다.', k: 'ev', fx: { money: medX(s, 0.3) } };
      return '모집은 그날로 끝났습니다.'; },
  },
  marry_parish: marryWrap('parish', (s, pr, t) => s.S.cur === 'tara' ? wa(pr.name) + ' 교구 혼인을 이야기했습니다. 성당 호적부에 두 이름이 나란히 적힙니다. 사제는 텐게어로 축복하고, 서류는 빅토리아어로 씁니다.' + (pr.home ? ' 상대는 ' + nat(s, pr.home) + ' 사람입니다.' : '') : wa(pr.name) + ' 교구 혼인을 이야기했습니다. 교회 앞 게시판에 세 주 동안 이름이 붙고, 아무도 반대하지 않으면 식입니다. ' + (pr.home ? '상대는 ' + nat(s, pr.home) + ' 사람입니다. 게시판 앞에 서는 사람이 조금 늘 것입니다.' : '동네 사람 절반이 게시판 앞에서 차 한 잔을 마십니다.'), ['식을 올린다', '게시를 미룬다', '거절한다'], ['victoria', 'tara']),
  marry_registry: marryWrap('registry', (s, pr, t) => wa(pr.name) + ' 등기소 혼인을 이야기했습니다. 교회 없이, 서류 두 장과 증인 둘. 공작령 등기소 직원은 종족 칸을 먼저 보고 이름 칸을 나중에 봅니다.' + (pr.home ? ' 상대는 ' + nat(s, pr.home) + ' 사람입니다. 서류가 한 장 더 늘었습니다.' : ''), ['신고한다', '미룬다', '하지 않는다'], ['victoria']),
  marry_peerage: marryWrap('peerage', (s, pr, t) => wa(pr.name) + ' 혼약이 가문 사이에서 오갔습니다. 지참금 ' + Math.round(s.med * t.dowry).toLocaleString() + ' LMD, 공작령 두 곳의 인장. 제 뜻은 셋째로 물었습니다.', ['혼약을 받는다', '가문에 미룬다', '거절한다'], ['victoria']),
  home_change: {
    tags: [], once: false, gap: ENGINE_DECISIONS.home_change.gap, at: 0.7,
    ok: (s) => ENGINE_DECISIONS.home_change.ok(s),
    build: (s) => { const v = ENGINE_DECISIONS.home_change.build(s); if (!v) return null;
      const body = nationHousingBody[s.S.cur]; if (!body) return v;
      const sub = { house_own: '공작령 등기', farm: '밭 딸림', manor: '사병 숙소 포함', cottage: '성당 호적부 등기', wagon: '길 위의 집', plate_own: '경기장 가까이', club_dorm: '클럽 배정' };
      return { ...v, title: s.S.cur === 'tara' ? '우리 집' : '집', body, choices: v.choices.map((c) => (c.k === 'no' ? { ...c, label: '그대로 산다' } : { ...c, sub: (sub[c.k] ? sub[c.k] + ' · ' : '') + (c.sub || '') })) }; },
    apply: (s, k) => ENGINE_DECISIONS.home_change.apply(s, k),
  },
};

// W11: 엔진 id 와 같은 결정은 국가 디스패처로 옮긴다(여러 파일이 같은 id 를 등록해도 거주국별로 분기)
hoist(decisions, { marry_parish: ['victoria', 'tara'], marry_registry: ['victoria'], marry_peerage: ['victoria'], home_change: ['victoria', 'tara', 'kazimierz'] });

export default { events, decisions };
