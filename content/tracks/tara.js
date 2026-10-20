// W9d 타라 진로 콘텐츠(v0.3): data/tracks/tara.json 의 11진로 전용 이벤트·결정. 텍스트 공유 0(D40).
// 핵심 5: TAR_NOMAD(유목민 전령·장례) · TAR_REDIRON(적철 근위대, 1098~) · TAR_FARM(농촌) · TAR_DUBLIN(더블린, 1091~98) · TAR_WANDER(유랑민).
// 나머지 6(HILLOCK·SMITH·POET·RATION·SPIRIT·VICSERV)은 단계마다 2개 + 전환 + 몰락 후일담.
// 타라는 빅토리아의 하위 지역(region). 엔진은 S.sub.region('hillock')·S.eth('nomad')를 타라 출생 시 세우지 않으므로 이 파일의 ta_born_roll 이 0~6세에 한 번 롤한다(힐록 0.1, 유목민 0.1 — W8 메모 제안 비율).
// 대사건(bigevents.js: dublinn_1091·hillock_1098·tara_indep_1098·big_uprising 1097)과 겹치지 않게 연동만: 1098 사윈 숙청(더블린 간부)·적철 편입·힐록 더티밤(공장 노동자)·텐게어는 여기서 쓴다.
// 혼인 덮어쓰기는 handfast·nomad·camp(타라 거주자만, 그 밖은 엔진 문구). parish·home_change 는 victoria.js 가 맡는다.
// 톤: 담백한 "~했습니다"체(D25), 각주는 숫자가 있을 때만(D31), 조사는 유틸(D30), 캐논 인물 1회성(D43).
import { eul, iga, eun, wa, ro, ieot, rago } from '../../src/engine/text.js';
import { cul, F, orgF, given, poor, rich, lifeRoll, once, medX, momHere, dadHere } from '../_util.js';
import { ENGINE_DECISIONS } from '../../src/engine/choices.js';
import { hoist } from '../_dispatch.js';

const TA = 'nation:tara';
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
const hillock = (s) => !!s.S.sub && s.S.sub.region === 'hillock';
const nomad = (s) => s.S.eth === 'nomad';
const tengair = (s) => !!s.S.flags.tengair;
const pre = (s) => s.year < 1098;          // 독립 선언 전(빅토리아 총독부)
const dublinnEra = (s) => s.year >= 1091 && s.year <= 1098;
const inTara = (s) => s.S.cur === TA;

export const events = [
  // ── 출생 롤: 힐록 카운티·유목민(엔진이 세우지 않는 보조 변수) ──
  { id: 'ta_born_roll', a: [0, 6], tags: [TA], w: 1000, c: (s) => !s.S.flags.taraRolled,
    run: (s) => { s.S.flags.taraRolled = true;
      if (!s.S.sub) s.S.sub = {};
      if (!s.S.sub.region && !s.S.urban && s.rng.chance(0.1)) s.S.sub.region = 'hillock';
      if (!s.S.eth && !s.S.urban && s.rng.chance(0.1)) { s.S.eth = 'nomad'; s.S.home.type = 'nomadic'; s.S.home.deck = 'ground'; }
      if (nomad(s)) return { t: '유목민의 마차에서 자랐습니다. 마을 사람들은 마차를 "저 사람들"이라고 불렀고, 마차 사람들은 마을을 "멈춘 사람들"이라고 불렀습니다.', k: 'note' };
      if (hillock(s)) return { t: '힐록 카운티에서 자랐습니다. 빅토리아 주둔지가 마을 끝에 있었고, 공장 굴뚝이 그 뒤에 있었습니다. 증조부가 옛 왕의 신하였다는 말을 집에서는 하지 않았습니다.', k: 'note' };
      return { t: '감자밭과 양 사이에서 자랐습니다. 마을 교회 종이 빅토리아 시각으로 울렸고, 할아버지는 텐게어 시각으로 일어났습니다.', k: 'note' }; } },

  // ════════════════════════════════════════════════════════════════════
  // TAR_NOMAD 유목민(장례·전령) — 아이 → 전령 → 장례 주관자
  // ════════════════════════════════════════════════════════════════════
  { id: 'ta_nom_ch_wagon', a: [8, 20], tags: [T('TAR_NOMAD', 'child')], w: 55, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['마차가 움직이는 날은 학교가 없는 날이었습니다. 길이 학교였다고 ' + iga(cul(s).elder) + ' 말했고, 마을 교사는 그렇게 말하지 않았습니다.', '장례 행렬 맨 뒤에서 걸었습니다. 아이의 자리였습니다. 행렬이 길어지면 어른이 된다고 했습니다.', '편지 꾸러미를 안고 마차 밖을 보았습니다. 겉봉의 이름을 읽는 것이 제 글 공부였습니다.']), k: 'note', fx: { cap: { arts: 0.02, ties: 0.02 } } }) },
  { id: 'ta_nom_ch_town', a: [8, 20], tags: [T('TAR_NOMAD', 'child')], w: 40, gap: 2,
    run: (s) => ({ t: '나 시어셔 외곽에 마차를 세웠습니다. 도시 아이들이 돌을 던졌습니다. 어른들은 돌을 던지지 않았고, 대신 가게 문을 닫았습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'ta_nom_ch_rite', a: [8, 20], tags: [T('TAR_NOMAD', 'child')], w: 40, gap: 2,
    run: (s) => { s.S.flags.omen = true; return { t: eul(cul(s).festivals[1]) + ' 처음 끝까지 보았습니다. 환상열석 위에서 불이 올랐고, ' + iga(cul(s).elder) + ' 옛 텐게어로 무엇인가를 읊었습니다. 뜻은 몰랐고, 울음은 알았습니다.', k: 'warm', fx: { cap: { arts: 0.03 }, h: 1 } }; } },
  { id: 'ta_nom_cr_omen', a: [12, 50], tags: [T('TAR_NOMAD', 'courier')], w: 25, gap: 3,
    run: (s) => { s.S.flags.omen = true; return { t: '길에서 징조를 보았습니다. 까마귀가 셋, 바람이 서쪽. ' + cul(s).elder + '라면 무슨 뜻인지 알았을 것입니다. 저는 뜻 대신 방향만 알았고, 그 방향으로 갔습니다.', k: 'note', fx: { cap: { arts: 0.02 } } }; } },
  { id: 'ta_nom_ch_old', a: [8, 20], tags: [T('TAR_NOMAD', 'child')], w: 35, gap: 3,
    run: (s) => ({ t: '마차 수가 줄었습니다. 작년에 다섯, 올해 넷. 떠난 집은 도시에 방을 얻었다고 했습니다. 방이 있는 집은 길을 모른다고 ' + iga(cul(s).elder) + ' 말했습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'ta_nom_cr_trn', a: [12, 30], tags: [T('TAR_NOMAD', 'courier')], w: 300, c: (s) => fresh(s, 'TAR_NOMAD_courier'),
    run: (s) => ({ t: '첫 편지를 혼자 날랐습니다. 마을 셋을 지나는 길이었고, 사흘이었습니다. 받는 사람이 겉봉을 보고 울었습니다. 무슨 편지였는지는 묻지 않는 것이 전령의 일이었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'ta_nom_cr_route', a: [12, 50], tags: [T('TAR_NOMAD', 'courier')], w: 50, gap: 1, rep: true,
    run: (s) => { const bad = s.rng.chance(0.3);
      return { t: bad ? s.rng.pick(['길에서 빅토리아 순찰대를 만났습니다. 편지를 열어 보았습니다. 제가 열지 않은 편지를 남이 열었습니다.', '눈에 갇혔습니다. 이틀. 편지는 품에 넣어 말렸습니다.', pre(s) ? '편지 받을 집이 비어 있었습니다. 힐록으로 갔다고 했습니다. 편지는 제가 보관했습니다.' : '편지 받을 집이 비어 있었습니다. 레드리지 난민촌으로 갔다고 했습니다. 거기까지 갔습니다.']) : s.rng.pick(['편지 열두 통을 날랐습니다. 전부 전했습니다. 답장 셋을 받아 돌아왔습니다.', '소식을 전했습니다. 종이 없는 소식이었습니다. 누가 죽었고 누가 태어났는지. 마을이 모여 들었습니다.', '농가에서 감자 한 자루를 품삯으로 받았습니다. 돈보다 무거웠고, 돈보다 나았습니다.']), k: bad ? 'bad' : 'note', fx: bad ? { h: -2, hl: -2 } : { standing: 2, money: medX(s, 0.03) } }; } },
  { id: 'ta_nom_cr_dublinn', a: [12, 50], tags: [T('TAR_NOMAD', 'courier')], w: 40, gap: 2, c: (s) => dublinnEra(s),
    run: (s) => ({ t: '더블린 쪽 편지를 맡았습니다. 겉봉에 이름이 없었습니다. 전령은 이름 없는 편지를 나르지 않는 것이 규칙이었고, 그해에는 규칙이 많이 바뀌었습니다.', k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'ta_nom_cr_messenger', a: [14, 40], tags: [T('TAR_NOMAD', 'courier')], w: 30, gap: 3,
    run: (s) => ({ t: '재앙 전달자가 마차를 찾아왔습니다. 길을 아는 사람을 찾는다고 했습니다. 전달자 협회 배지를 보여 주었고, 그 배지가 마차보다 멀리 간다고 했습니다.', k: 'note', fx: { cap: { arts: 0.02 } } }) },
  { id: 'ta_nom_mo_trn', a: [20, 60], tags: [T('TAR_NOMAD', 'mourner')], w: 300, c: (s) => fresh(s, 'TAR_NOMAD_mourner'),
    run: (s) => ({ t: '장례를 처음 주관했습니다. ' + iga(cul(s).elder) + ' 마지막으로 제 뒤에 섰습니다. 옛 텐게어를 제 입으로 읊었습니다. 뜻을 아는 사람은 이제 행렬에 셋이었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'ta_nom_mo_rite', a: [20, 70], tags: [T('TAR_NOMAD', 'mourner')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['농가 장례를 주관했습니다. 교회 사제가 먼저 하고, 제가 나중에 했습니다. 가족은 둘 다 원했습니다.', '노령 드라코의 화장이었습니다. 환상열석 위에서. 백 년에 한 번 있는 일이라고 했고, 제가 그 한 번이었습니다.', '장례 행렬에 도시 사람이 처음 섰습니다. 뒤에서, 조용히. 묻지 않았습니다.']), k: 'note', fx: { standing: 3, cap: { arts: 0.02 } } }) },
  { id: 'ta_nom_mo_extinct', a: [20, 70], tags: [T('TAR_NOMAD', 'mourner')], w: 35, gap: 3,
    run: (s) => ({ t: '마차가 둘 남았습니다. 아이가 하나였습니다. 그 아이에게 옛 텐게어를 가르쳤습니다. 아이는 빅토리아어로 받아 적었습니다.', k: 'bad', fx: { h: -3 } }) },
  { id: 'ta_nom_mo_king', a: [20, 70], tags: [T('TAR_NOMAD', 'mourner')], w: 30, gap: 3, c: (s) => s.year >= 1099,
    run: (s) => ({ t: '나 시어셔에서 사람이 왔습니다. 왕의 이름으로 ' + cul(s).festivals[1] + ' 주관을 부탁했습니다. 백 년 동안 마을이 등 돌리던 일을 왕이 먼저 찾았습니다.', k: 'warm', fx: { standing: 6, h: 3 } }) },
  { id: 'ta_nom_fall', a: [8, 70], tags: [TA], w: 300, c: (s) => left(s, 'TAR_NOMAD', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastFall === 'exile' ? '마차에서 내려야 했습니다. 계율이었습니다. 무엇을 어겼는지는 ' + cul(s).elder + '만 말할 수 있었고, 말하지 않았습니다.' : '마차가 더 가지 못했습니다. 바퀴도, 사람도. 도시 외곽에 방을 얻었습니다. 방이 있는 집이 되었습니다.', k: 'loss', fx: { h: -5 } }) },

  // ════════════════════════════════════════════════════════════════════
  // TAR_REDIRON 적철 근위대(1098~) — 병 → 중간 지휘 → 대장
  // ════════════════════════════════════════════════════════════════════
  // 입구: entry.gates 의 year [1098,9999] 배열형을 엔진이 열지 못한다(W9c 메모 §1) → 독립 뒤 모병 이벤트로 넣는다
  { id: 'ta_red_enter', a: [16, 35], tags: [TA, '!track:TAR_REDIRON', '!track:TAR_DUBLIN', '!track:TAR_VICSERV', '!rhodes', '!prison:camp', '!prison:jail'], w: 80, c: (s) => s.year >= 1098 && !s.S.flags.redAsked && s.S.q <= 3 && s.S.cap.skill >= -0.8 && (!s.S.track || ['TAR_FARM', 'TAR_WANDER', 'TAR_HILLOCK'].includes(s.S.track.id)) && s.rng.chance(s.S.track ? 0.06 : 0.15) && !!s.data.trackById.TAR_REDIRON,
    run: (s) => { s.S.flags.redAsked = s.S.age; if (!s.enterTrack('TAR_REDIRON', { how: s.S.track ? 'switch' : 'enter', via: 'recruit', quiet: true })) return null;
      return { t: '적철 근위대 모병 공고가 교회 문에 붙었습니다. 왕의 이름이었고, 급료는 빅토리아 총독부 시절 품삯의 두 배였습니다. 이름을 적었습니다. 제복은 다음 주에 왔습니다.', k: 'ev', fx: { h: 2 } }; } },
  { id: 'ta_red_pv_oath', a: [16, 45], tags: [T('TAR_REDIRON', 'private')], w: 55, gap: 4,
    run: (s) => ({ t: affIs(s, 'TAR_RED_EXDUBLINN') ? '구 더블린 편입병이었습니다. 근위대 제복 아래 더블린 시절 흉터가 있었고, 교관은 그것을 보고 아무 말도 하지 않았습니다.' : '적철 근위대에 들어갔습니다. 웰링턴 공작의 사병이던 부대가 타라 정규군이 되었습니다. 제복은 그대로였고, 깃발만 바뀌었습니다.', k: 'ev', fx: { standing: 2 } }) },
  { id: 'ta_red_pv_duty', a: [16, 45], tags: [T('TAR_REDIRON', 'private')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['나 시어셔 야간 순찰이었습니다. 통행금지 시각 뒤에 거리에 있는 것은 저희뿐이었습니다. 저희도 무서웠습니다.', '빅토리아 쪽 국경 초소였습니다. 저쪽 초소 병사와 같은 억양이었습니다. 몇 년 전까지 같은 군대였습니다.', '식량 호송이었습니다. 마차 셋, 호위 열. 마을마다 사람들이 나와 마차를 세었습니다. 세 대로는 모자랐습니다.']), k: 'note', fx: { standing: 2, hl: -1 } }) },
  { id: 'ta_red_pv_fog', a: [16, 45], tags: [T('TAR_REDIRON', 'private')], w: 40, gap: 2, c: (s) => s.year <= 1100,
    run: (s) => ({ t: '"검은 안개"가 거리에 나타났다는 말이 돌았습니다. 가짜 통행금지를 내리고 사람을 데려간다고 했습니다. 그 안개가 저희 부대라는 말도 돌았습니다. 저는 그날 밤 막사에 있었습니다.', k: 'bad', fx: { h: -3 } }) },
  { id: 'ta_red_pv_curfew_seen', a: [16, 45], tags: [T('TAR_REDIRON', 'private')], w: 40, c: (s) => !s.S.flags.redCurfewAsked,
    run: (s) => { s.S.flags.redCurfewOffer = s.S.age; return { t: '분대장이 밤 명령서를 받았습니다. 서명 칸이 비어 있었고, 내용은 통행금지였습니다. 공고된 적 없는 통행금지였습니다.', k: 'note' }; } },
  { id: 'ta_red_sg_trn', a: [20, 50], tags: [T('TAR_REDIRON', 'sergeant')], w: 300, c: (s) => fresh(s, 'TAR_REDIRON_sergeant'),
    run: (s) => ({ t: '중간 지휘를 맡았습니다. 계급 이름은 나 시어셔에서 올해 정한 것이었습니다. 신생 군대의 신생 계급. 부하 열둘 중 넷이 저보다 오래 총을 들었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'ta_red_sg_order', a: [20, 55], tags: [T('TAR_REDIRON', 'sergeant')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['국경 마을 징발을 지휘했습니다. 영수증을 썼습니다. 타라 왕의 이름으로. 왕은 아직 대관식을 하지 않았습니다.', '더블린 잔당 수색 명령이었습니다. 부하 절반이 옛 더블린이었습니다. 수색은 느렸고, 아무도 재촉하지 않았습니다.', '빅토리아 쪽에서 군대가 움직인다는 보고였습니다. 참호를 팠습니다. 감자밭이었습니다.']), k: 'note', fx: { standing: 3, h: -2 } }) },
  { id: 'ta_red_sg_food', a: [20, 55], tags: [T('TAR_REDIRON', 'sergeant')], w: 40, gap: 2,
    run: (s) => ({ t: '부대 배급이 줄었습니다. 나라 전체가 줄었습니다. 부하에게 제 몫을 나눴고, 부하는 받지 않았습니다. 다음 날 그 부하의 몫이 제 식판에 있었습니다.', k: 'warm', fx: { hl: -1, cap: { ties: 0.03 } } }) },
  { id: 'ta_red_sg_exdublinn', a: [20, 55], tags: [T('TAR_REDIRON', 'sergeant'), 'aff:TAR_RED_EXDUBLINN'], w: 35, gap: 3,
    run: (s) => ({ t: '옛 더블린 출신은 승진이 느렸습니다. 기록에 그런 규정은 없었고, 승진 명단에는 그런 결과가 있었습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'ta_red_cp_trn', a: [26, 55], tags: [T('TAR_REDIRON', 'captain')], w: 300, c: (s) => fresh(s, 'TAR_REDIRON_captain'),
    run: (s) => ({ t: '대장이 되었습니다. 나 시어셔 궁에서 임명장을 받았습니다. 왕은 짧게 말했고, 그 옆의 옛 더블린 간부는 아무 말도 하지 않았습니다. 둘 다 저를 보았습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'ta_red_cp_days', a: [26, 60], tags: [T('TAR_REDIRON', 'captain')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['빅토리아와의 국경 회담에 군 쪽 사람으로 앉았습니다. 저쪽 대령은 사관학교 동기의 동기였습니다. 서로 모르는 척했습니다.', '가스트렐 전함 승선 명령이 왔습니다. 현존 최대 육상전함. 그 위에서 보면 타라가 한눈에 들어왔고, 작았습니다.', '부대에서 검은 안개 이야기를 금지했습니다. 금지했다는 것이 답이었습니다.']), k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'ta_red_cp_shay', a: [26, 60], tags: [T('TAR_REDIRON', 'captain'), 'aff:TAR_RED_GUARD'], w: 30, gap: 4,
    run: (s) => ({ t: '옛 교관이 나 시어셔 근무로 물러났습니다. 공작 사병 시절부터 부대를 이끈 사람이었습니다. 송별식은 없었고, 부대 전체가 아침 점호를 그 사람 쪽으로 서서 했습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'ta_red_fall', a: [16, 60], tags: [TA], w: 300, c: (s) => left(s, 'TAR_REDIRON', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'disgrace' ? '가짜 통행금지 사건에 제 이름이 묶였습니다. 조사 결과는 공고되지 않았고, 제 이름은 명부에서 지워졌습니다. 거리에서 "검은 안개"라는 말을 들으면 돌아보지 않게 되었습니다.' : s.S.flags.lastTrackHow === 'exile' ? '탈영했습니다. 국경 너머는 빅토리아였고, 거기서 저는 반란군 출신이었습니다. 어느 쪽에도 명부가 없었습니다.' : '근위대에서 나왔습니다. 제복은 반납했고, 흉터는 반납하지 못했습니다.', k: 'loss', fx: { h: -5 } }) },

  // ════════════════════════════════════════════════════════════════════
  // TAR_FARM 농민 — 가족 → 소작 → 자영
  // ════════════════════════════════════════════════════════════════════
  { id: 'ta_farm_fam_potato', a: [12, 40], tags: [T('TAR_FARM', 'family')], w: 55, gap: 1, rep: true,
    run: (s) => { const good = s.rng.chance(0.5);
      return { t: good ? '감자 수확이 괜찮았습니다. 양 두 마리를 더 샀습니다. 겨울 ' + cul(s).food + ' 솥이 조금 깊어졌습니다.' : s.rng.pick(['감자 수확이 나빴습니다. 빅토리아 중개상은 값을 반으로 불렀고, 다른 중개상은 없었습니다.', '양이 병들었습니다. 수의사는 나 시어셔에 하나뿐이었고, 그 사람은 빅토리아 농장부터 돌았습니다.', '밭 가장자리에 용광로 굴뚝이 섰습니다. 옛 왕성 환상열석 자리였습니다. 밭이 조금 줄었습니다.']), k: good ? 'warm' : 'bad', fx: good ? { h: 2, money: medX(s, 0.08) } : { h: -2, money: -medX(s, 0.05) } }; } },
  { id: 'ta_farm_fam_church', a: [12, 40], tags: [T('TAR_FARM', 'family')], w: 40, gap: 2,
    run: (s) => ({ t: '교회 종이 울렸습니다. ' + s.rng.pick(['사제가 빅토리아어로 설교했고, 할머니는 텐게어로 기도했습니다. 둘 다 같은 하늘에 갔습니다.', '성당 호적부에 동생 이름이 올랐습니다. 빅토리아어 철자로. 집에서 부르는 이름과 달랐습니다.', '종 아래서 마을 회의가 열렸습니다. 안건은 감자였고, 결론은 감자였습니다.']), k: 'note', fx: { cap: { ties: 0.02 } } }) },
  { id: 'ta_farm_fam_wage', a: [12, 40], tags: [T('TAR_FARM', 'family')], w: 35, gap: 3, c: (s) => pre(s),
    run: (s) => ({ t: '빅토리아 농장에서 품삯을 받았습니다. 빅토리아 사람의 품삯보다 적었습니다. 같은 밭, 같은 감자, 다른 봉투. 아무도 그 이유를 적어 주지 않았습니다.', k: 'bad', fx: { money: medX(s, 0.03), h: -2 } }) },
  { id: 'ta_farm_fam_dublinn', a: [14, 40], tags: [T('TAR_FARM', 'family')], w: 40, gap: 2, c: (s) => dublinnEra(s) && !s.S.flags.dublinnAsked,
    run: (s) => { s.S.flags.dublinnOffer = s.S.age; return { t: '밤에 마을에 사람이 왔습니다. 더블린이라고 했습니다. 감자 한 자루를 받아 갔고, 다음에 올 때는 자루 대신 사람을 데려가겠다고 했습니다.', k: 'note' }; } },
  { id: 'ta_farm_ten_trn', a: [16, 55], tags: [T('TAR_FARM', 'tenant')], w: 300, c: (s) => fresh(s, 'TAR_FARM_tenant'),
    run: (s) => ({ t: '밭을 따로 빌렸습니다. 소작이었습니다. ' + (pre(s) ? '지주는 빅토리아 사람이었고, 1년에 두 번 왔습니다. 수확 때와 소작료 때.' : '지주는 타라 사람이었고, 소작료는 빅토리아 때와 같았습니다. 깃발만 바뀌었습니다.'), k: 'ev', fx: { h: 2 } }) },
  { id: 'ta_farm_ten_rent', a: [16, 60], tags: [T('TAR_FARM', 'tenant')], w: 50, gap: 1, rep: true,
    run: (s) => { const good = s.rng.chance(0.5);
      return { t: good ? '소작료를 내고 남은 감자로 겨울을 났습니다. 양고기는 ' + cul(s).festivals[0] + ' 때 한 번이었습니다.' : s.rng.pick(['수확이 나빴고, 소작료는 같았습니다. 지주의 서기는 하늘을 보지 않았습니다.', '식량 유출이 있었습니다. 빅토리아로 가는 마차가 밤에 지나갔고, 마을은 아침에 배를 곯았습니다.', pre(s) ? '총독부 공고가 붙었습니다. 세금이었습니다. 텐게어로는 적혀 있지 않았습니다.' : '왕의 이름으로 징발이 있었습니다. 영수증은 받았습니다. 왕은 대관식을 아직 하지 않았습니다.']), k: good ? 'warm' : 'bad', fx: good ? { h: 2, money: medX(s, 0.1) } : { h: -3, money: -medX(s, 0.1) } }; } },
  { id: 'ta_farm_ten_wander', a: [16, 60], tags: [T('TAR_FARM', 'tenant')], w: 35, gap: 3,
    run: (s) => ({ t: '유랑민이 밭을 지나갔습니다. 감자 몇 알이 없어졌습니다. 신고하지 않았습니다. 내년에 제가 그 길에 설 수도 있었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'ta_farm_ten_hillock', a: [16, 60], tags: [T('TAR_FARM', 'tenant')], w: 40, c: (s) => s.year === 1098,
    run: (s) => ({ t: '힐록에서 온 사람들이 마을을 지나갔습니다. 1월이었습니다. 헛간을 열어 주었고, 아침에 헛간은 비어 있었습니다. 감자가 한 자루 줄어 있었고, 괜찮았습니다.', k: 'note', fx: { h: -2, money: -medX(s, 0.03) } }) },
  { id: 'ta_farm_own_trn', a: [22, 65], tags: [T('TAR_FARM', 'own')], w: 300, c: (s) => fresh(s, 'TAR_FARM_own'),
    run: (s) => ({ t: '밭 문서에 제 이름이 올랐습니다. ' + (pre(s) ? '빅토리아 등기소 서류였습니다. 타라 사람 이름이 빅토리아 철자로 적혔습니다.' : '성당 호적부 옆에 새로 생긴 등기 장부였습니다. 타라 철자로 적혔고, 그것이 처음이었습니다.'), k: 'big', fx: { h: 4 } }) },
  { id: 'ta_farm_own_harvest', a: [22, 70], tags: [T('TAR_FARM', 'own')], w: 50, gap: 1, rep: true,
    run: (s) => { const good = s.rng.chance(0.55);
      return { t: good ? '제 밭의 감자였습니다. 나 시어셔 시장에 직접 냈습니다. 중개상 없이. 값은 중개상의 두 배였고, 마차 삯이 그 차액이었습니다.' : s.rng.pick(['흉년이었습니다. 제 밭이라 제 손해였습니다. 지주가 없다는 것은 그런 뜻이기도 했습니다.', '배급표가 마을에 돌았습니다. 자영농도 받았습니다. 제 감자를 배급표로 사는 기분이었습니다.', '빅토리아 쪽 군대가 국경에 늘었다는 말이 돌았습니다. 감자밭에 참호를 팔지 말라고 근위대에 부탁했습니다. 들어주지 않았습니다.']), k: good ? 'warm' : 'bad', fx: good ? { h: 3, money: medX(s, 0.15) } : { h: -3, money: -medX(s, 0.1) } }; } },
  { id: 'ta_farm_own_village', a: [22, 70], tags: [T('TAR_FARM', 'own')], w: 35, gap: 3,
    run: (s) => ({ t: '마을 회의를 제 집에서 열었습니다. 안건은 ' + s.rng.pick(['텐게어 학교였습니다. 교사가 없었고, 교과서도 없었고, 뜻은 있었습니다.', '빅토리아 혈통 이웃이었습니다. 쫓아내자는 쪽과 두자는 쪽. 두자는 쪽이 하나 많았습니다. 제 표였습니다.', '종이었습니다. 교회 종을 빅토리아 시각으로 칠지 타라 시각으로 칠지. 두 번 치기로 했습니다.']), k: 'note', fx: { cap: { ties: 0.03 }, standing: 2 } }) },
  { id: 'ta_farm_own_sheep', a: [22, 70], tags: [T('TAR_FARM', 'own')], w: 30, gap: 3,
    run: (s) => ({ t: '양 떼가 ' + s.rng.ri(20, 60) + '마리가 되었습니다. 마을에서 둘째로 많았습니다. 첫째는 교회였습니다.', k: 'warm', fx: { h: 2, money: medX(s, 0.1) }, f: orgF(s, '교구 가축 대장') }) },
  { id: 'ta_farm_fall', a: [12, 70], tags: [TA], w: 300, c: (s) => (left(s, 'TAR_FARM', null) && s.S.flags.lastTrackHow !== 'retire' || demoted(s, 'TAR_FARM')),
    run: (s) => ({ t: s.S.flags.lastFall === 'ruin' ? '밭을 잃었습니다. 흉년 두 해와 소작료 세 해. 문서의 이름이 바뀌었고, 같은 밭에서 품삯을 받았습니다.' : s.S.flags.lastFall === 'raid' ? '마을이 습격을 받았습니다. 누구였는지는 끝내 몰랐습니다. 빅토리아라고도 했고, 더블린이라고도 했고, 둘 다 아니라고도 했습니다.' : '농사를 접었습니다. 감자밭은 남았고, 저는 길에 섰습니다.', k: 'loss', fx: { h: -5 } }) },

  // ════════════════════════════════════════════════════════════════════
  // TAR_DUBLIN 더블린 병사·간부(1091~98) — 하급 병사 → 연락책 → 간부 → 지휘관, 1098 사윈 숙청
  // ════════════════════════════════════════════════════════════════════
  { id: 'ta_dub_pv_camp', a: [14, 45], tags: [T('TAR_DUBLIN', 'private')], w: 55, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['들판 야영지였습니다. 천막 하나에 여덟, 총 하나에 둘. 총이 모자란 쪽이 먼저 자고 먼저 깼습니다.', '밤에 빅토리아 초소 근처까지 갔다가 돌아왔습니다. 명령은 "보고 오라"였고, 본 것은 불빛 둘이었습니다.', '식량이 왔습니다. 마을에서 걷은 감자였습니다. 걷은 마을이 제 마을이었습니다.']), k: 'note', fx: { standing: 2, hl: -1 } }) },
  { id: 'ta_dub_pv_who', a: [14, 45], tags: [T('TAR_DUBLIN', 'private')], w: 40, gap: 2,
    run: (s) => ({ t: affIs(s, 'TAR_DUB_INFECTED') ? '감염자 대표단 쪽 천막이었습니다. 힐록에서 온 사람이 절반이었습니다. 더블린에서는 감염자도 총을 들었고, 그것이 여기 온 이유였습니다.' : affIs(s, 'TAR_DUB_WYVERN') ? '와이번 부대였습니다. 노래하는 간부가 있었습니다. 밤에 그 노래를 들으면 다음 날이 덜 무서웠습니다.' : '같은 천막에 유랑민, 농민, 힐록 사람, 시인이 있었습니다. 서로 왜 왔는지는 묻지 않았습니다. 와 있다는 것이 답이었습니다.', k: 'note', fx: { cap: { ties: 0.03 } } }) },
  { id: 'ta_dub_pv_food', a: [14, 45], tags: [T('TAR_DUBLIN', 'private')], w: 35, gap: 2,
    run: (s) => ({ t: '식량 창고에서 자루가 비었습니다. 횡령이라고 했습니다. 누가 했는지는 간부들이 알았고, 간부들은 말하지 않았습니다. 그 주 배급이 반으로 줄었습니다.', k: 'bad', fx: { hl: -2, h: -2 } }) },
  { id: 'ta_dub_pv_hillock', a: [14, 45], tags: [T('TAR_DUBLIN', 'private')], w: 40, c: (s) => s.year === 1097,
    run: (s) => ({ t: '겨울 거사 이야기가 돌았습니다. 힐록으로 모인다고 했습니다. 천막마다 총을 세었고, 세어도 모자랐습니다.', k: 'note', fx: { h: -2 } }) },
  { id: 'ta_dub_li_trn', a: [16, 45], tags: [T('TAR_DUBLIN', 'liaison')], w: 300, c: (s) => fresh(s, 'TAR_DUBLIN_liaison'),
    run: (s) => ({ t: '연락책이 되었습니다. 마을과 야영지 사이를 밤에 걸었습니다. 편지는 없었습니다. 전부 외웠습니다. 잡히면 외운 것이 증거였습니다.', k: 'big', fx: { h: 1 } }) },
  { id: 'ta_dub_li_route', a: [16, 45], tags: [T('TAR_DUBLIN', 'liaison')], w: 50, gap: 1, rep: true,
    run: (s) => { const bad = s.rng.chance(0.3);
      return { t: bad ? s.rng.pick(['빅토리아 순찰대에 잡힐 뻔했습니다. 감자밭에 엎드려 밤을 샜습니다.', '연락할 마을이 비어 있었습니다. 주둔군이 다녀갔다고 했습니다.', '제보자가 있다는 말이 돌았습니다. 연락책은 제일 먼저 의심받는 자리였습니다.']) : s.rng.pick(['마을 셋을 돌았습니다. 감자 두 자루와 소식 하나를 가지고 돌아왔습니다.', '나 시어셔 안으로 들어갔습니다. 시인의 집이었습니다. 시는 암호였고, 암호는 시였습니다.', '유목민 전령과 만났습니다. 편지를 나르는 사람과 말을 나르는 사람이 길에서 서로 비켰습니다.']), k: bad ? 'bad' : 'note', fx: bad ? { h: -3 } : { standing: 3 } }; } },
  { id: 'ta_dub_li_informer', a: [16, 45], tags: [T('TAR_DUBLIN', 'liaison')], w: 35, gap: 3,
    run: (s) => ({ t: '제보자가 잡혔습니다. 야영지 사람이었습니다. 처형은 새벽이었고, 저는 그 사람과 같은 천막이었습니다. 그날 밤부터 천막에서 아무도 말하지 않았습니다.', k: 'bad', fx: { h: -4 } }) },
  { id: 'ta_dub_cd_trn', a: [18, 50], tags: [T('TAR_DUBLIN', 'cadre')], w: 300, c: (s) => fresh(s, 'TAR_DUBLIN_cadre'),
    run: (s) => ({ t: '간부가 되었습니다. ' + (affIs(s, 'TAR_DUB_SIX') ? '간부 6인 직속이었습니다. 특기 호칭을 가진 사람들 옆자리. 저는 호칭이 없었고, 그것이 다행이었습니다.' : '호칭 대신 천막 하나와 사람 서른을 받았습니다.') + ' 결정하는 쪽이 되었고, 결정은 늘 식량 아니면 사람이었습니다.', k: 'big', fx: { h: 1 } }) },
  { id: 'ta_dub_cd_decide', a: [18, 50], tags: [T('TAR_DUBLIN', 'cadre')], w: 45, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['강경파와 온건파 회의였습니다. 저는 어느 쪽인지 말하지 않았고, 말하지 않는 것이 한쪽이 되었습니다.', '마을 징발을 결정했습니다. 제 마을이었습니다. 다른 사람을 보냈습니다. 비겁했고, 그래서 보냈습니다.', '빅토리아 혈통 소년 하나가 야영지에서 구타당했습니다. 첩자라고 했습니다. 말렸습니다. 늦었습니다.']), k: 'bad', fx: { standing: 3, h: -3 } }) },
  { id: 'ta_dub_cd_hardline', a: [18, 50], tags: [T('TAR_DUBLIN', 'cadre'), 'aff:TAR_DUB_HARDLINE'], w: 40, gap: 2,
    run: (s) => ({ t: '강경파였습니다. 회의에서 늘 먼저 일어섰고, 먼저 일어서는 사람이 먼저 지목됩니다. 그것을 알면서 일어섰습니다.', k: 'note', fx: { standing: 3, h: -2 } }) },
  { id: 'ta_dub_cd_samhain_seen', a: [18, 50], tags: [T('TAR_DUBLIN', 'cadre')], w: 60, c: (s) => s.year === 1098 && !s.S.flags.samhainAsked,
    run: (s) => { s.S.flags.samhainOffer = s.S.age; return { t: '독립 선언 뒤 첫 ' + cul(s).festivals[0] + ' 연회 초대장이 왔습니다. 왕의 이름이었습니다. 간부 전원. 초대장은 종이 한 장이었고, 종이는 가벼웠습니다.', k: 'note' }; } },
  { id: 'ta_dub_cm_trn', a: [22, 55], tags: [T('TAR_DUBLIN', 'commander')], w: 300, c: (s) => fresh(s, 'TAR_DUBLIN_commander'),
    run: (s) => ({ t: '지휘관이 되었습니다. 야영지 셋, 사람 수백. 숫자를 아는 사람은 저뿐이었고, 그 숫자가 매주 줄었습니다.', k: 'big', fx: { h: 1 } }) },
  { id: 'ta_dub_cm_days', a: [22, 55], tags: [T('TAR_DUBLIN', 'commander')], w: 45, gap: 1,
    run: (s) => ({ t: s.rng.pick(['빅토리아 남부에서 "유령 부대"가 움직인다는 보고였습니다. 보고한 사람이 다음 주에 보고되었습니다.', '왕의 귀환 소식이 왔습니다. 로흐시니. 야영지가 환호했고, 저는 환호하지 않았습니다. 왕이 오면 지휘관은 둘이 됩니다.', '에블라나 쪽 사람이 다녀갔습니다. 그 사람이 다녀간 천막에서 사흘 동안 사람들이 아팠습니다.']), k: 'bad', fx: { standing: 2, h: -3 } }) },
  { id: 'ta_dub_cm_wyvern', a: [22, 55], tags: [T('TAR_DUBLIN', 'commander'), 'aff:TAR_DUB_WYVERN'], w: 30, gap: 3,
    run: (s) => ({ t: '와이번 부대 지휘였습니다. 부대의 절반이 노래를 알았고, 절반이 총을 알았습니다. 노래를 아는 쪽이 오래 살았습니다. 이유는 몰랐습니다.', k: 'note', fx: { h: 1 } }) },
  // ── 1098 사윈 숙청·적철 편입(대사건 tara_indep_1098 과 연동) ──
  { id: 'ta_dub_1098', a: [14, 60], tags: [T('TAR_DUBLIN')], w: 1000, c: (s) => s.year >= 1098 && s.S.flags.samhainAsked !== s.year,
    run: (s) => { const cadre = s.S.track.stage >= 2; const hard = affIs(s, 'TAR_DUB_HARDLINE') || affIs(s, 'TAR_DUB_SIX');
      if (cadre && s.rng.chance(hard ? 0.6 : 0.35)) { s.die('execution', cul(s).festivals[0] + ' 숙청'); return; }
      if (cadre) { s.enterTrack('TAR_REDIRON', { how: 'switch', via: 'exdublinn', aff: 'TAR_RED_GUARD', stage: 1, quiet: true }); return { t: cul(s).festivals[0] + ' 밤, 간부들이 검은 숲으로 불려 갔습니다. 저는 불리지 않았습니다. 다음 날 적철 근위대 임명장이 왔습니다. 불린 사람들의 자리였습니다.', k: 'big', fx: { h: -6 } }; }
      s.enterTrack('TAR_REDIRON', { how: 'switch', via: 'exdublinn', aff: 'TAR_RED_EXDUBLINN', quiet: true });
      return { t: '독립이 선언되었고, 더블린 하급 병사는 적철 근위대에 편입되었습니다. 제복이 바뀌었고, 천막이 막사가 되었습니다. ' + cul(s).festivals[0] + ' 밤에 간부 여섯이 사라졌다는 말은 막사에서 하지 않았습니다.', k: 'ev', fx: { h: -2 } }; } },
  { id: 'ta_dub_fall', a: [14, 60], tags: [TA], w: 300, c: (s) => left(s, 'TAR_DUBLIN', null) && !['retire', 'switch'].includes(s.S.flags.lastTrackHow),
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'injured' ? '교전에서 다쳤습니다. 야영지 의무 천막에는 붕대가 있었고 의사는 없었습니다. 마을로 돌려보내졌고, 마을은 저를 모르는 척했습니다. 그것이 저를 지키는 방식이었습니다.' : '더블린을 떠났습니다. 떠난 사람은 제보자로 의심받았고, 남은 사람은 숙청을 기다렸습니다. 어느 쪽도 좋은 자리는 아니었습니다.', k: 'loss', fx: { h: -5 } }) },

  // ════════════════════════════════════════════════════════════════════
  // TAR_WANDER 유랑민 — 잡범 → 유랑 → 더블린 합류(1091~98 이면 TAR_DUBLIN 으로)
  // ════════════════════════════════════════════════════════════════════
  { id: 'ta_wan_cr_streets', a: [10, 40], tags: [T('TAR_WANDER', 'crime')], w: 55, gap: 1, rep: true,
    run: (s) => { const caught = s.rng.chance(0.25);
      return { t: caught ? '시장에서 붙잡혔습니다. 감자 세 알. 빅토리아 순경은 저를 보고, 감자를 보고, 감자를 돌려주게 하고 보냈습니다. 다음에는 안 보낸다고 했습니다.' : s.rng.pick(['트렌트 카운티 시장에서 손이 빨라졌습니다. 감자 한 알, 빵 반 덩이. 배가 손을 가르쳤습니다.', '빈집을 찾아 잤습니다. 빈집은 많았습니다. 힐록으로, 빅토리아로, 떠난 집들이었습니다.', '같은 처지 아이들과 다녔습니다. 넷이었다가 셋이었다가 다섯이었습니다.']), k: caught ? 'bad' : 'note', fx: caught ? { h: -3 } : { money: medX(s, 0.01), cap: { ties: 0.01 } } }; } },
  { id: 'ta_wan_cr_trent', a: [10, 40], tags: [T('TAR_WANDER', 'crime'), 'aff:TAR_WAN_TRENT'], w: 40, gap: 2,
    run: (s) => ({ t: '트렌트 카운티에서 쫓겨났습니다. 카운티 경계에 공고가 붙었습니다. 이름은 없고 인상착의만. 그 인상착의가 저였고, 저 같은 사람 수십이었습니다.', k: 'bad', fx: { h: -3 } }) },
  { id: 'ta_wan_cr_british', a: [10, 40], tags: [T('TAR_WANDER', 'crime')], w: 35, gap: 3,
    run: (s) => ({ t: '빅토리아 혈통 아이가 무리에 들어왔습니다. 억양으로 알았습니다. 첩자라고 하는 아이가 있었고, 그냥 배고픈 아이라고 하는 아이가 있었습니다. 둘 다 배고팠습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'ta_wan_cr_church', a: [10, 40], tags: [T('TAR_WANDER', 'crime')], w: 30, gap: 3,
    run: (s) => ({ t: '교회 뒷문에서 수프를 받았습니다. 사제는 이름을 묻지 않았고, 호적부에 적지도 않았습니다. 적히지 않는 것이 그 시절의 안전이었습니다.', k: 'warm', fx: { hl: 2, h: 1 } }) },
  { id: 'ta_wan_wd_trn', a: [12, 50], tags: [T('TAR_WANDER', 'wander')], w: 300, c: (s) => fresh(s, 'TAR_WANDER_wander'),
    run: (s) => ({ t: '카운티 밖으로 나왔습니다. ' + (affIs(s, 'TAR_WAN_SCATANA') ? '스카타나 들판이었습니다. 끝이 보이지 않았고, 끝까지 간 사람 이야기도 들은 적이 없었습니다.' : '길이 집이 되었습니다. 길은 넓었고, 잘 곳은 좁았습니다.'), k: 'ev', fx: { h: -2 } }) },
  { id: 'ta_wan_wd_road', a: [12, 55], tags: [T('TAR_WANDER', 'wander')], w: 55, gap: 1, rep: true,
    run: (s) => { const bad = s.rng.chance(0.4);
      return { t: bad ? s.rng.pick(['겨울이었습니다. 들판에서 둘이 아침에 일어나지 않았습니다. 묻어 줄 땅이 얼어 있었습니다.', '빅토리아 순찰대가 들판을 쓸었습니다. 숨었고, 숨은 자리에서 사흘을 굶었습니다.', '감염된 사람이 무리에 있었습니다. 떠나라는 말을 아무도 못 했습니다. 떠날 데가 없는 것은 모두 같았습니다.']) : s.rng.pick(['농가 헛간에서 잤습니다. 주인이 알면서 모르는 척했습니다. 아침에 감자가 한 자루 놓여 있었습니다.', '유목민 마차와 마주쳤습니다. 길을 알려 주었습니다. 묻지 않았는데 알려 주었습니다.', '들판에 야영지가 생겼습니다. 저 같은 사람 수백. 야영지는 이름이 없었고, 곧 이름이 생길 것 같았습니다.']), k: bad ? 'bad' : 'note', fx: bad ? { hl: -4, h: -3 } : { h: 1, cap: { ties: 0.02 } } }; } },
  { id: 'ta_wan_wd_theo', a: [12, 55], tags: [T('TAR_WANDER', 'wander')], w: 35, gap: 3,
    run: (s) => ({ t: '무리의 아이 하나가 길에서 죽었습니다. 아무도 돌보지 않아서였습니다. 돌볼 수 없어서였다고 서로에게 말했습니다. 둘 다 맞았습니다.', k: 'loss', fx: { h: -4 } }) },
  { id: 'ta_wan_wd_samhain', a: [12, 55], tags: [T('TAR_WANDER', 'wander')], w: 30, gap: 3,
    run: (s) => ({ t: cul(s).festivals[0] + ' 밤이었습니다. 마을마다 불이 켜졌고, 유랑민은 불 밖에 있었습니다. 누군가 불 밖으로 ' + cul(s).food + ' 한 그릇을 내놓았습니다. 죽은 이들을 위한 것이라고 했습니다. 산 사람이 먹었습니다.', k: 'warm', fx: { hl: 2, h: 1 } }) },
  { id: 'ta_wan_db_trn', a: [14, 55], tags: [T('TAR_WANDER', 'dublinn')], w: 1000, c: (s) => fresh(s, 'TAR_WANDER_dublinn'),
    run: (s) => { if (dublinnEra(s) && s.enterTrack('TAR_DUBLIN', { how: 'switch', via: 'wanderer', quiet: true })) return { t: '들판의 야영지에 이름이 붙었습니다. 더블린. 총을 받았고, 천막을 받았고, 처음으로 누가 제 이름을 적었습니다.', k: 'big', fx: { h: 3 } };
      return { t: '더블린 잔당이라는 사람들과 만났습니다. ' + (s.year > 1098 ? '독립 뒤였습니다. 근위대에 편입되지 않은 사람들이었고, 들판에서 들판으로 다녔습니다. 저도 그랬습니다.' : '아직 이름이 없었습니다. 이름이 생기기 전의 무리였고, 저는 거기 있었습니다.'), k: 'note', fx: { cap: { ties: 0.03 } } }; } },
  { id: 'ta_wan_db_remnant', a: [14, 60], tags: [T('TAR_WANDER', 'dublinn')], w: 45, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['잔당 무리와 들판을 돌았습니다. 근위대 순찰을 피했습니다. 피하는 쪽도 피해지는 쪽도 옛 더블린이었습니다.', '레드리지 난민촌에 들렀습니다. 저보다 가난한 사람이 있다는 것을 거기서 알았습니다.', '옛 간부라는 사람이 무리를 이끌었습니다. 호칭이 있다고 했습니다. 호칭으로 감자가 나오지는 않았습니다.']), k: 'note', fx: { h: -1 } }) },
  { id: 'ta_wan_db_amnesty', a: [14, 60], tags: [T('TAR_WANDER', 'dublinn')], w: 35, gap: 3, c: (s) => s.year >= 1099,
    run: (s) => ({ t: '왕의 이름으로 사면 공고가 붙었습니다. 근위대에 들어오면 지난 일은 묻지 않는다고 했습니다. 무리의 절반이 갔고, 절반은 공고를 믿지 않았습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'ta_wan_fall', a: [10, 65], tags: [TA], w: 300, c: (s) => left(s, 'TAR_WANDER', null) && !['retire', 'switch'].includes(s.S.flags.lastTrackHow),
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'prison' ? '순찰대에 붙잡혔습니다. 죄목은 유랑이었습니다. 유랑이 죄가 되는 법은 빅토리아 것이었고, 감옥은 타라에 있었습니다.' : '길에서 내려왔습니다. 마을 하나가 헛간을 내주었고, 헛간이 방이 되었습니다. 길은 그대로 있었고, 가끔 보러 갔습니다.', k: 'loss', fx: { h: -4 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 나머지 진로(단계마다 2개 + 전환 + 몰락 후일담)
  // ════════════════════════════════════════════════════════════════════
  // ── TAR_HILLOCK 힐록 주민·공장: 공장 노동 → 더티밤 피폭 후(forced, 1098) → 재건 노동 ──
  { id: 'ta_hil_wk_line', a: [14, 60], tags: [T('TAR_HILLOCK', 'worker')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['힐록 공장 라인이었습니다. 빅토리아식 교대였고, 빅토리아 품삯의 반이었습니다. 타라인이라서였고, 서류에는 그렇게 적히지 않았습니다.', '주둔군이 공장 문 앞에 섰습니다. 노동자를 지키는지 공장을 지키는지는 서 있는 방향으로 알았습니다.', '증조부가 옛 왕의 신하였다는 집은 반장이 될 수 없었습니다. 규정은 없었고, 결과는 있었습니다.']), k: 'note', fx: { hl: -2, h: -1 } }) },
  { id: 'ta_hil_wk_garrison', a: [14, 60], tags: [T('TAR_HILLOCK', 'worker'), 'aff:TAR_HIL_GARRISON'], w: 40, gap: 2,
    run: (s) => ({ t: '주둔지 노역이었습니다. 빅토리아 병사의 막사를 타라 사람이 지었습니다. 품삯은 공장보다 적었고, 막사는 튼튼했습니다.', k: 'bad', fx: { money: medX(s, 0.03), h: -2 } }) },
  { id: 'ta_hil_1098', a: [14, 70], tags: [T('TAR_HILLOCK', 'worker')], w: 1000, c: (s) => s.year === 1098,
    run: (s) => { const hit = s.rng.chance(0.7);
      if (hit) { s.promote({ force: true, quiet: true }); if (!s.S.ori.on) s.infect('dirtybomb'); return { t: '1월, 힐록에 오리지늄 더티밤이 떨어졌습니다. 공장 쪽이었습니다. 분진이 가라앉은 뒤 마을 절반의 몸에 결정이 생겼습니다. 저도 그 절반이었습니다.', k: 'loss', fx: { hl: -12, h: -8 }, f: F('성당 호적부 힐록 교구 기록, 1098년 1월') }; }
      return { t: '1월, 힐록에 오리지늄 더티밤이 떨어졌습니다. 저는 그날 교대가 아니었습니다. 교대였던 사람들은 분진 속에서 나왔고, 저는 그 사람들을 집까지 데려다주었습니다.', k: 'bad', fx: { h: -6 }, f: F('성당 호적부 힐록 교구 기록, 1098년 1월') }; } },
  { id: 'ta_hil_db_trn', a: [14, 70], tags: [T('TAR_HILLOCK', 'dirtybomb')], w: 400, c: (s) => fresh(s, 'TAR_HILLOCK_dirtybomb'),
    run: (s) => ({ t: '피폭자 명부에 올랐습니다. 빅토리아 총독부 명부였고, 명부에 오른 사람은 격리 대상이었습니다. 독립 선언이 그해 가을에 왔고, 명부는 바뀌지 않았습니다. 명부를 바꿀 사람이 없었습니다.', k: 'loss', fx: { h: -5 } }) },
  { id: 'ta_hil_db_days', a: [14, 70], tags: [T('TAR_HILLOCK', 'dirtybomb')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['분진이 가라앉은 자리에 천막이 섰습니다. 격리 야영지였습니다. 빅토리아 법이었고, 타라 사람이 지켰습니다.', '더블린 감염자 대표단 사람이 천막에 왔습니다. 힐록 피폭자는 대표단 자격이라고 했습니다. 자격으로 할 수 있는 것은 총을 드는 것뿐이었습니다.', '로도스 카운티 힐록 사무소에서 약이 왔습니다. 외국 회사였습니다. 외국 회사가 유일하게 온 곳이었습니다.']), k: 'bad', fx: { hl: -2, h: -2 } }) },
  { id: 'ta_hil_db_dublinn', a: [14, 60], tags: [T('TAR_HILLOCK', 'dirtybomb')], w: 40, c: (s) => dublinnEra(s) && !s.S.flags.dublinnAsked,
    run: (s) => { s.S.flags.dublinnOffer = s.S.age; return { t: '감염자 대표단이 천막을 돌며 이름을 받았습니다. 피폭자는 묻지 않고 받는다고 했습니다. 종이가 제 앞에 왔습니다.', k: 'note' }; } },
  { id: 'ta_hil_rb_trn', a: [14, 70], tags: [T('TAR_HILLOCK', 'rebuild')], w: 300, c: (s) => fresh(s, 'TAR_HILLOCK_rebuild'),
    run: (s) => ({ t: '재건 노동 명부에 올랐습니다. 분진 위에 집을 다시 짓는 일이었습니다. 품삯은 나 시어셔에서 왔고, 늦게 왔고, 왔습니다.', k: 'ev', fx: { h: 2 } }) },
  { id: 'ta_hil_rb_days', a: [14, 75], tags: [T('TAR_HILLOCK', 'rebuild')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['옛 공장 자리에 벽을 세웠습니다. 공장은 다시 짓지 않기로 했습니다. 마을 회의였고, 만장일치였습니다.', '교회를 먼저 지었습니다. 집보다 먼저. 호적부가 거기 있어야 사람이 돌아온다고 사제가 말했습니다.', '빅토리아에서 조사단이 왔습니다. "진압"이라고 적힌 공고를 들고. 마을은 조사단에게 물 한 잔을 주었고, 그것뿐이었습니다.']), k: 'note', fx: { standing: 2, hl: -1 } }) },
  { id: 'ta_hil_rb_names', a: [14, 75], tags: [T('TAR_HILLOCK', 'rebuild')], w: 30, gap: 3,
    run: (s) => ({ t: '마을 입구에 이름을 새겼습니다. 1월 2일의 이름들. ' + s.rng.ri(60, 200) + '개였고, 더 있었지만 아무도 전부를 몰랐습니다.', k: 'loss', fx: { h: -2 }, f: F('성당 호적부 힐록 교구 기록, 1098년 1월') }) },
  { id: 'ta_hil_fall', a: [14, 75], tags: [TA], w: 300, c: (s) => (left(s, 'TAR_HILLOCK', null) && s.S.flags.lastTrackHow !== 'retire' || demoted(s, 'TAR_HILLOCK')),
    run: (s) => ({ t: s.S.flags.lastFall === 'infected' ? '결정이 몸에 들어왔습니다. 재건 명부에서 피폭자 명부로 다시 옮겨졌습니다. 같은 천막이었습니다.' : '힐록을 떠났습니다. 떠난 집이 남은 집보다 많은 마을이었습니다. 저도 그 수에 들어갔습니다.', k: 'loss', fx: { h: -5 } }) },
  // ── TAR_SMITH 대장장이·조각가: 견습 → 대장장이 → 조각 의뢰 명장 ──
  { id: 'ta_smi_app_forge', a: [14, 40], tags: [T('TAR_SMITH', 'apprentice')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['나 시어셔 대장간에서 풀무를 밟았습니다. 스승은 망치를 놓지 않았고, 저는 풀무를 놓지 못했습니다.', '말굽을 처음 만들었습니다. 스승이 녹였습니다. 세 번째에 녹이지 않았습니다.', '빅토리아 주둔군 주문이 왔습니다. 말굽 쉰 개. 스승은 받았고, 받으면서 욕을 했습니다. 텐게어로.']), k: 'note', fx: { cap: { skill: 0.03 } } }) },
  { id: 'ta_smi_app_ration', a: [14, 40], tags: [T('TAR_SMITH', 'apprentice')], w: 35, gap: 3,
    run: (s) => ({ t: '대장간에서 배급표를 나눠 주었습니다. 스승이 시정 배급을 겸했습니다. 망치를 든 손으로 표를 세었고, 세는 동안에도 망치는 놓지 않았습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }) },
  { id: 'ta_smi_sm_trn', a: [18, 55], tags: [T('TAR_SMITH', 'smith')], w: 300, c: (s) => fresh(s, 'TAR_SMITH_smith'),
    run: (s) => ({ t: '제 망치를 받았습니다. 스승의 것이었습니다. 스승은 새것을 샀다고 했고, 새것은 보지 못했습니다.', k: 'big', fx: { h: 4 } }) },
  { id: 'ta_smi_sm_work', a: [18, 60], tags: [T('TAR_SMITH', 'smith')], w: 45, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick([pre(s) ? '총독부 주문과 마을 주문이 같은 날 왔습니다. 마을 것을 먼저 했습니다. 총독부는 늦어도 값을 깎지 않았고, 마을은 늦으면 밭을 못 갈았습니다.' : '근위대 주문이 왔습니다. 창날. 타라 군대의 창날을 타라 대장간이 만드는 것이 처음이었습니다.', '농기구를 고쳤습니다. 값은 감자로 받았습니다. 장부에는 감자 자루 수를 적었습니다.', dublinnEra(s) ? '밤에 누가 왔습니다. 총열을 고쳐 달라고 했습니다. 고쳤고, 장부에 적지 않았습니다.' : '조각 의뢰가 하나 들어왔습니다. 교회 문 장식이었습니다. 망치로 하던 일을 끌로 했습니다.']), k: 'note', fx: { money: medX(s, 0.15), cap: { skill: 0.02 } } }) },
  { id: 'ta_smi_sc_trn', a: [26, 65], tags: [T('TAR_SMITH', 'sculptor')], w: 300, c: (s) => fresh(s, 'TAR_SMITH_sculptor'),
    run: (s) => ({ t: cul(s).festivals[0] + ' 조각 의뢰를 받았습니다. 나 시어셔 광장에 세울 것이었습니다. 붉은 용. 대장장이가 조각가가 되었고, 마을은 저를 명사라고 불렀습니다. 망치는 그대로였습니다.', k: 'big', fx: { h: 4 } }) },
  { id: 'ta_smi_sc_days', a: [26, 70], tags: [T('TAR_SMITH', 'sculptor')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['왕궁에서 의뢰가 왔습니다. 대관식 장식이라고 했습니다. 대관식은 미뤄졌고, 장식은 창고에 들어갔습니다.', '조각 앞에서 아이들이 놀았습니다. 아이들은 조각가를 몰랐고, 용은 알았습니다. 그것으로 되었습니다.', '빅토리아 수집가가 조각을 사겠다고 했습니다. 값은 대장간 열 채였습니다. 팔지 않았습니다. 광장 것이었습니다.']), k: 'note', fx: { standing: 3, money: medX(s, 0.2) } }) },
  { id: 'ta_smi_fall', a: [14, 70], tags: [TA], w: 300, c: (s) => left(s, 'TAR_SMITH', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'disgrace' ? '옛일이 드러났습니다. 더블린 시절이었는지 빅토리아군 시절이었는지는 사람마다 달리 말했습니다. 대장간 문 앞에 사람이 오지 않게 되었습니다.' : '대장간 불을 껐습니다. 망치는 벽에 걸었습니다. 스승의 것이었으니 버릴 수 없었습니다.', k: 'loss', fx: { h: -5 } }) },
  // ── TAR_POET 시인·작가: 낭독 → 민족 시인 → 작가 ──
  { id: 'ta_poet_rc_pub', a: [15, 40], tags: [T('TAR_POET', 'recital')], w: 45, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['펍에서 시를 읽었습니다. ' + cul(s).drink + ' 한 잔이 값이었습니다. 텐게어로 읽으면 두 잔이었습니다.', '낭독회에 사람이 ' + s.rng.ri(5, 30) + '명 왔습니다. 그중 하나는 무엇인가 적고 있었습니다. 시를 적는 것 같지는 않았습니다.', '옛 시를 외웠습니다. 책이 없어서 입에서 입으로 온 시였습니다. 제 입이 다음 책이었습니다.']), k: 'note', fx: { cap: { learn: 0.02 }, standing: 1 }, f: F('나 시어셔 낭독회 참석 기록') }) },
  { id: 'ta_poet_rc_tengair', a: [15, 40], tags: [T('TAR_POET', 'recital')], w: 35, gap: 3,
    run: (s) => ({ t: '빅토리아어로 쓴 시와 텐게어로 쓴 시가 한 공책에 있었습니다. 총독부 사람이 공책을 보면 절반만 읽을 수 있었고, 그 절반이 안전한 절반이었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'ta_poet_pt_trn', a: [18, 55], tags: [T('TAR_POET', 'poet')], w: 300, c: (s) => fresh(s, 'TAR_POET_poet'),
    run: (s) => ({ t: '시집이 나왔습니다. 나 시어셔 인쇄소에서 ' + s.rng.ri(100, 500) + '부. 반은 펍에서 팔렸고, 반은 손에서 손으로 갔습니다. 손에서 손으로 간 쪽이 더 멀리 갔습니다.', k: 'big', fx: { h: 4 }, f: F('나 시어셔 인쇄소 발행 대장') }) },
  { id: 'ta_poet_pt_days', a: [18, 60], tags: [T('TAR_POET', 'poet')], w: 45, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick([affIs(s, 'TAR_POET_NATIONAL') ? '민족주의 모임에서 시를 읽었습니다. 평민 모임이었다가 귀족이 섞였습니다. 귀족은 시를 듣고 돈을 냈고, 평민은 시를 듣고 외웠습니다.' : '와이번 쪽 사람들과 노래를 만들었습니다. 시에 곡이 붙자 시가 아니라 노래가 되었고, 노래는 검열이 어려웠습니다.', pre(s) ? '총독부가 시집 한 권을 금서로 올렸습니다. 제 것이었습니다. 다음 날 펍에서 값이 세 배가 되었습니다.' : '왕궁에서 낭독 초청이 왔습니다. 시를 읽었고, 왕은 끝까지 들었습니다. 옆자리 근위대장은 중간에 나갔습니다.', '남작 연회에 초대받았습니다. 거절했습니다. 연회에서 교전이 있었다는 말을 다음 날 들었습니다.']), k: 'note', fx: { standing: 3, h: -1 } }) },
  { id: 'ta_poet_wr_trn', a: [25, 65], tags: [T('TAR_POET', 'writer')], w: 300, c: (s) => fresh(s, 'TAR_POET_writer'),
    run: (s) => ({ t: '책을 썼습니다. 시가 아니라 이야기였습니다. 타라 사람이 타라 이야기를 타라 글자로 쓴 책. 빅토리아 서점에도 들어갔고, 번역본이었습니다.', k: 'big', fx: { h: 4, money: medX(s, 0.5) } }) },
  { id: 'ta_poet_wr_days', a: [25, 70], tags: [T('TAR_POET', 'writer')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['젊은 시인이 공책을 들고 찾아왔습니다. 제가 들고 다니던 공책과 같은 것이었습니다. 읽어 주었습니다. 전부.', '빅토리아 출판사에서 계약이 왔습니다. 조건은 "정치적 내용 삭제"였습니다. 삭제하고 나면 감자 이야기만 남았습니다. 감자 이야기가 정치였습니다.', '학교에서 제 시를 가르친다고 했습니다. 텐게어 학교였습니다. 교과서가 없어서 제 시집이 교과서였습니다.']), k: 'note', fx: { standing: 2, h: 1 } }) },
  { id: 'ta_poet_fall', a: [15, 70], tags: [TA], w: 300, c: (s) => left(s, 'TAR_POET', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'prison' ? '시집이 증거가 되었습니다. 총독부 법정이었고, 판사는 시를 읽지 않았습니다. 읽을 필요가 없는 재판이었습니다.' : s.S.flags.lastTrackHow === 'injured' ? '연회에서 교전에 휘말렸습니다. 시인이 있을 자리가 아니었고, 시인은 그런 자리에 자주 있었습니다.' : '시를 더 쓰지 않았습니다. 공책은 남았습니다. 누군가 외워 가기를 기다렸습니다.', k: 'loss', fx: { h: -5 } }) },
  // ── TAR_RATION 시정·배급 담당: 배급 담당 → 시정 관리 → 관청 ──
  { id: 'ta_rat_rt_desk', a: [18, 55], tags: [T('TAR_RATION', 'ration')], w: 45, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['배급표를 나눴습니다. 줄은 길었고, 표는 짧았습니다. 줄 끝 사람에게 "내일"이라고 말하는 것이 일이었습니다.', '배급 장부를 맞췄습니다. 숫자가 맞지 않았습니다. 맞지 않는 쪽이 늘 사람 쪽이었습니다.', '식량 마차가 왔습니다. 빅토리아에서. 독립 선언 뒤에도 감자는 국경을 몰랐습니다.']), k: 'note', fx: { cap: { learn: 0.02 }, h: -1 } }) },
  { id: 'ta_rat_rt_skim', a: [18, 55], tags: [T('TAR_RATION', 'ration')], w: 35, gap: 3,
    run: (s) => ({ t: '상관이 배급표 한 묶음을 따로 뺐습니다. 장부에는 "분실"이었습니다. 저는 장부를 썼고, 분실이라고 썼습니다.', k: 'bad', fx: { h: -3 } }) },
  { id: 'ta_rat_of_trn', a: [22, 60], tags: [T('TAR_RATION', 'official')], w: 300, c: (s) => fresh(s, 'TAR_RATION_official'),
    run: (s) => ({ t: '시정 관리가 되었습니다. 나 시어셔 시정은 왕 말고는 아무것도 없는 나라의 유일한 관청이었고, 제 책상이 그 관청의 한 귀퉁이였습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'ta_rat_of_days', a: [22, 65], tags: [T('TAR_RATION', 'official')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['난민 명부를 만들었습니다. 레드리지. 이름을 적는 데 한 달, 식량을 보내는 데 석 달.', '야간 통행금지 공고를 썼습니다. 진짜 공고였습니다. 가짜 공고가 돈다는 말에 진짜에는 제 서명을 넣었습니다.', '빅토리아 총독부 시절 서류를 정리했습니다. 버리라는 명령이었습니다. 몇 장은 버리지 못했습니다. 이름이 적힌 것들이었습니다.']), k: 'note', fx: { standing: 2, cap: { learn: 0.02 } } }) },
  { id: 'ta_rat_off_trn', a: [28, 65], tags: [T('TAR_RATION', 'office')], w: 300, c: (s) => fresh(s, 'TAR_RATION_office'),
    run: (s) => ({ t: '관청 책임자가 되었습니다. 왕 바로 아래. 그 사이에 아무것도 없는 나라라 그 자리가 그렇게 높았고, 그래서 그렇게 위험했습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'ta_rat_off_days', a: [28, 70], tags: [T('TAR_RATION', 'office')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['대관식 예산을 올렸습니다. 왕은 미뤘습니다. 다시 올렸고, 다시 미뤘습니다. 식량 예산은 미루지 않았습니다.', '빅토리아 쪽 대사와 만났습니다. 웰링턴 공작의 사람이었고, 타라 말을 했습니다. 억양이 저보다 나았습니다.', '궁에서 왕을 가까이서 보았습니다. 왕은 젊었고, 피곤했고, 제 보고서를 끝까지 읽었습니다.']), k: 'note', fx: { standing: 2, cap: { ties: 0.03 } } }) },
  { id: 'ta_rat_fall', a: [18, 70], tags: [TA], w: 300, c: (s) => left(s, 'TAR_RATION', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'disgrace' ? '배급표 횡령에 제 이름이 묶였습니다. 상관의 "분실"이 제 장부에 있었습니다. 장부는 제 글씨였습니다.' : s.S.flags.lastTrackHow === 'prison' ? '총독부가 저를 데려갔습니다. 죄목은 배급표였고, 진짜 이유는 배급표가 간 곳이었습니다.' : '관청에서 나왔습니다. 책상은 다음 날 다른 사람 것이 되었습니다. 나라에 관청이 하나뿐이라 갈 데가 없었습니다.', k: 'loss', fx: { h: -5 } }) },
  // ── TAR_SPIRIT 영혼수호자(A7): 견습 → 수호자 → 은거 장로 ──
  { id: 'ta_spi_app_rite', a: [10, 30], tags: [T('TAR_SPIRIT', 'apprentice')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['환상열석에서 옛 텐게어를 외웠습니다. 뜻은 가르쳐 주지 않았습니다. 뜻은 소리가 먼저라고 했습니다.', '계율을 배웠습니다. 라브리타흐 이후의 계율. 은거. 세상에 나서지 않는 것이 첫째였고, 저는 아직 세상에 나선 적이 없었습니다.', '사제단이 셋이었습니다. 장로 둘, 견습 하나. 하나가 저였습니다.']), k: 'note', fx: { cap: { arts: 0.04 } } }) },
  { id: 'ta_spi_app_wander', a: [10, 30], tags: [T('TAR_SPIRIT', 'apprentice')], w: 35, gap: 3,
    run: (s) => ({ t: '유랑민에게 거처를 내주었습니다. 사제단 계율이었습니다. 유랑민은 사제단이 누군지 몰랐고, 몰라야 했습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'ta_spi_gd_trn', a: [16, 50], tags: [T('TAR_SPIRIT', 'guardian')], w: 300, c: (s) => fresh(s, 'TAR_SPIRIT_guardian'),
    run: (s) => ({ t: '수호자가 되었습니다. 환상열석 위에서, 밤에, 보는 사람 없이. 징조가 있었다고 장로가 말했고, 저는 징조를 보지 못했습니다. 그것도 징조라고 했습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'ta_spi_gd_days', a: [16, 60], tags: [T('TAR_SPIRIT', 'guardian')], w: 45, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick([eul(cul(s).festivals[1]) + ' 주관했습니다. 환상열석 위의 불. 마을 사람 몇이 멀리서 보았고, 가까이 오지 않았습니다.', s.year >= 1098 ? '왕이 환상열석을 찾아왔습니다. 혼자였습니다. 왕은 무엇인가를 물었고, 저는 계율대로 답하지 않았습니다. 왕은 고개를 끄덕였습니다.' : '총독부 조사관이 환상열석을 재고 갔습니다. 용광로 자리라고 했습니다. 재는 것을 막을 계율은 없었습니다.', '에블라나의 이름이 바람에 실려 왔습니다. 타라인의 생명력을 갉아먹는다고 했습니다. 사제단은 그 이름을 입에 올리지 않았고, 올리지 않는 것이 가장 큰 말이었습니다.']), k: 'note', fx: { standing: 2, cap: { arts: 0.02 } } }) },
  { id: 'ta_spi_gd_omen', a: [16, 60], tags: [T('TAR_SPIRIT', 'guardian')], w: 25, gap: 4,
    run: (s) => { s.S.flags.omen = true; return { t: '환상열석 위에서 징조를 보았습니다. 무엇이었는지는 말할 수 없습니다. 장로가 그날 처음으로 제 이름을 불렀습니다.', k: 'note', fx: { cap: { arts: 0.03 } } }; } },
  { id: 'ta_spi_el_trn', a: [30, 80], tags: [T('TAR_SPIRIT', 'elder')], w: 300, c: (s) => fresh(s, 'TAR_SPIRIT_elder'),
    run: (s) => ({ t: '은거 장로가 되었습니다. 사제단은 다시 셋이었습니다. 장로 둘, 견습 하나. 이번에는 제가 장로 쪽이었고, 견습은 제가 가르친 아이였습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'ta_spi_el_days', a: [30, 90], tags: [T('TAR_SPIRIT', 'elder')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['견습에게 옛 텐게어를 가르쳤습니다. 뜻은 가르치지 않았습니다. 소리가 먼저였고, 제가 그렇게 배웠습니다.', '왕궁에서 신하로 와 달라는 청이 왔습니다. 옛 수호자 하나가 그렇게 갔다고 했습니다. 저는 가지 않았습니다. 계율이었고, 핑계이기도 했습니다.', '환상열석 하나가 쓰러졌습니다. 용광로 진동이었습니다. 세우지 못했습니다. 세우지 않는 것이 계율에 맞는지 밤새 생각했습니다.']), k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'ta_spi_fall', a: [10, 90], tags: [TA], w: 300, c: (s) => left(s, 'TAR_SPIRIT', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'disgrace' ? '계율을 어겼습니다. 세상에 나선 것이었습니다. 어떤 일이었는지는 사제단만 알았고, 사제단은 저를 더는 부르지 않았습니다.' : '사제단을 떠났습니다. 환상열석은 그대로 있었고, 저는 멀리서 보는 사람이 되었습니다. 마을 사람들처럼.', k: 'loss', fx: { h: -5 } }) },
  // ── TAR_VICSERV 빅토리아 복무 타라인: 병 → 정보장교 → 이중첩자 → 대사 ──
  { id: 'ta_vs_pv_duty', a: [17, 40], tags: [T('TAR_VICSERV', 'private')], w: 45, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['빅토리아군 제복을 입고 타라 마을을 지났습니다. 마을 사람들이 저를 보았습니다. 제복을 보았고, 얼굴은 보지 않으려 했습니다.', '같은 부대 빅토리아 병사가 제 억양을 흉내 냈습니다. 웃었습니다. 저도 웃었습니다. 그것이 복무였습니다.', '가문에서 편지가 왔습니다. "집안 누구도 공작 아래 복무할 위신이 없었다"는 말이 돌았다고. 저는 위신 대신 급료를 골랐고, 그것도 적지 않았습니다.']), k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'ta_vs_pv_hillock', a: [17, 40], tags: [T('TAR_VICSERV', 'private'), 'aff:TAR_VIC_HILLOCK'], w: 40, gap: 2,
    run: (s) => ({ t: '힐록 주둔군이었습니다. 타라 사람이 타라 사람을 지키는 빅토리아 군대. 공장 노동자들이 저를 지나칠 때 아무도 인사하지 않았고, 저도 하지 않았습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'ta_vs_in_trn', a: [20, 45], tags: [T('TAR_VICSERV', 'intel')], w: 300, c: (s) => fresh(s, 'TAR_VICSERV_intel'),
    run: (s) => ({ t: '정보장교가 되었습니다. 타라 말을 안다는 것이 자격이었습니다. 타라 사람들의 말을 듣고 빅토리아어로 적는 일. 적는 것이 일이었고, 적지 않는 것이 더 큰 일이 되어 갔습니다.', k: 'big', fx: { h: 1 } }) },
  { id: 'ta_vs_in_work', a: [20, 50], tags: [T('TAR_VICSERV', 'intel')], w: 45, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['더블린 연락책 명단이 제 책상에 왔습니다. 아는 이름이 둘이었습니다. 보고서에는 하나만 올렸습니다. 둘 다 올렸어야 했고, 하나도 올리지 말았어야 했습니다.', '빅토리아군 정보부 회의였습니다. 타라를 지도로 보는 사람들 사이에서 저만 타라를 마을로 알았습니다.', '힐록 작전 명령서를 보았습니다. 더티밤이라는 말이 있었습니다. 보고 나서 사흘 동안 아무도 만나지 않았습니다.']), k: 'bad', fx: { standing: 3, h: -3 } }) },
  { id: 'ta_vs_in_double_seen', a: [20, 50], tags: [T('TAR_VICSERV', 'intel')], w: 50, c: (s) => dublinnEra(s) && !s.S.flags.doubleAsked,
    run: (s) => { s.S.flags.doubleOffer = s.S.age; return { t: '더블린 쪽에서 사람이 왔습니다. 제가 타라 사람이라는 것을 알고 왔습니다. 정보를 넘기면 타라가 기억할 것이라고 했습니다. 빅토리아도 기억할 것이라는 말은 하지 않았습니다.', k: 'note' }; } },
  { id: 'ta_vs_db_trn', a: [22, 50], tags: [T('TAR_VICSERV', 'double')], w: 300, c: (s) => fresh(s, 'TAR_VICSERV_double'),
    run: (s) => ({ t: '두 쪽에 보고서를 썼습니다. 같은 사실을 두 가지로. 밤에 어느 쪽 보고서가 진짜인지 생각했고, 둘 다였습니다.', k: 'big', fx: { h: -2 } }) },
  { id: 'ta_vs_db_days', a: [22, 55], tags: [T('TAR_VICSERV', 'double')], w: 45, gap: 1, rep: true,
    run: (s) => { const risk = s.rng.chance(0.3);
      return { t: risk ? '빅토리아 정보부가 내부 조사를 시작했습니다. 제 책상도 조사했습니다. 서랍은 깨끗했습니다. 깨끗한 것이 의심스럽다고 조사관이 말했습니다.' : s.rng.pick(['더블린에 작전 날짜 하나를 넘겼습니다. 마을 하나가 비었고, 빅토리아군은 빈 마을에 들어갔습니다.', '빅토리아에 더블린 식량 창고 위치를 넘겼습니다. 가짜 위치였습니다. 진짜 위치도 알았습니다.', '양쪽에서 급료를 받았습니다. 한쪽은 돈, 한쪽은 "기억하겠다"는 말. 둘 다 썼습니다.']), k: risk ? 'bad' : 'note', fx: risk ? { h: -4 } : { standing: 3, h: -2 } }; } },
  { id: 'ta_vs_en_trn', a: [28, 60], tags: [T('TAR_VICSERV', 'envoy')], w: 300, c: (s) => fresh(s, 'TAR_VICSERV_envoy'),
    run: (s) => ({ t: '대사가 되었습니다. 발각된 뒤였습니다. 빅토리아는 저를 처형하는 대신 웰링턴 공작의 이름으로 타라에 보냈습니다. 양쪽을 아는 사람이 쓸모 있었고, 쓸모는 목숨이었습니다.', k: 'big', fx: { h: 2 } }) },
  { id: 'ta_vs_en_days', a: [28, 70], tags: [T('TAR_VICSERV', 'envoy')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['타라 왕궁에 빅토리아 대사로 섰습니다. 타라 말로 인사했습니다. 왕은 빅토리아어로 답했습니다. 둘 다 뜻이 있었습니다.', '로도스 아일랜드 사람이 대사관에 왔습니다. 중재 이야기였습니다. 제 이름을 적어 갔습니다.', '가문 사람이 대사관 문 앞까지 왔다가 돌아갔습니다. 들어오지 않았습니다. 들어오지 않은 것이 가문의 인사였습니다.']), k: 'note', fx: { standing: 2, cap: { ties: 0.03 } } }) },
  { id: 'ta_vs_fall', a: [17, 70], tags: [TA], w: 300, c: (s) => left(s, 'TAR_VICSERV', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'exile' ? '발각되었습니다. 빅토리아는 저를 쫓았고, 타라는 저를 몰랐습니다. 양쪽 다 아는 사람이 양쪽 다 없는 사람이 되었습니다.' : s.S.flags.lastTrackHow === 'injured' ? '작전에서 다쳤습니다. 빅토리아군 병원이었고, 옆 침대는 타라 사람이었습니다. 서로 모르는 척했습니다.' : '제대했습니다. 빅토리아 제복을 벗고 타라 마을로 돌아갔습니다. 마을은 제복을 기억했습니다.', k: 'loss', fx: { h: -5 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 생업·동네·계절: 사윈, 환상열석, 감자밭, 흑맥주 펍, 텐게어, 총독 포고, 통행금지, 식량 부족
  // ════════════════════════════════════════════════════════════════════
  { id: 'ta_life_samhain', a: [8, 90], tags: [TA], w: 40, gap: 2,
    run: (s) => s.rng.chance(0.22) ? ({ t: cul(s).festivals[0] + ' 밤, 마을에 불이 ' + s.rng.ri(20, 80) + '개 켜졌습니다. 작년보다 ' + s.rng.ri(1, 9) + '개 적었습니다. 세는 사람은 저뿐이었습니다.', k: 'note', fx: { h: 1 }, f: orgF(s, '교구 기록, ' + s.year + '년') }) : ((s) => ({ t: cul(s).festivals[0] + '이었습니다. ' + s.rng.pick(['마을마다 불을 켰습니다. 죽은 이들을 위한 자리에 ' + cul(s).food + ' 한 그릇을 놓았습니다. 아침에 그릇이 비어 있었습니다. 누가 먹었는지는 묻지 않았습니다.', '가면을 쓰고 집집을 돌았습니다. 아이들 일이었고, 어른들도 가면 뒤에서는 아이였습니다.', s.year >= 1098 ? '독립 뒤 첫 ' + cul(s).festivals[0] + '에는 사라진 이름이 많았습니다. 불은 그래도 켰습니다.' : '총독부가 모임을 금했습니다. 불은 집 안에서 켰고, 창문으로 서로 보았습니다.']), k: 'warm', fx: { h: 2, cap: { ties: 0.01 } } }))(s) },
  { id: 'ta_life_stones', a: [8, 90], tags: [TA], w: 30, gap: 3,
    run: (s) => s.rng.chance(0.22) ? ({ t: '환상열석 ' + s.rng.ri(9, 13) + '개 중 ' + s.rng.ri(1, 4) + '개가 기울었습니다. 용광로 진동이었습니다. 세우자는 사람도, 세울 돈도 없었습니다.', k: 'note', fx: { h: -1 }, f: orgF(s, '유적 조사 기록') }) : ((s) => ({ t: '환상열석에 갔습니다. ' + s.rng.pick(['옛 게일 왕성 자리. 돌 위에 용광로 굴뚝이 섰고, 돌은 그 아래 그대로 있었습니다.', '노령 드라코의 화장이 있었다고 했습니다. 재는 바람이 가져갔고, 사람들은 그 바람 쪽으로 절했습니다.', cul(s).festivals[1] + ' 밤이었습니다. 멀리서 불을 보았습니다. 가까이 가는 사람은 없었습니다.']), k: 'note', fx: { cap: { arts: 0.01 }, h: 1 } }))(s) },
  { id: 'ta_life_potato', a: [8, 90], tags: [TA], w: 40, gap: 2,
    run: (s) => { if (s.rng.chance(0.22)) return { t: '감자 수확이 작년의 ' + s.rng.ri(60, 130) + '%였습니다. 교구 서기가 적어 갔고, 적힌 숫자와 헛간 자루 수는 달랐습니다.', k: 'note', f: orgF(s, '수확 집계, ' + s.year + '년') };
      const bad = s.rng.chance(0.4);
      return { t: bad ? '감자가 모자랐습니다. ' + s.rng.pick(['식량 마차가 빅토리아 쪽으로 갔습니다. 마을은 마차를 세었고, 세는 것 말고는 할 수 있는 것이 없었습니다.', '배급표가 돌았습니다. 줄은 교회 앞에서 밭까지 이어졌습니다.', '양고기 없는 ' + cul(s).food + '였습니다. 감자만. 그것도 작았습니다.']) : '감자 수확이었습니다. ' + s.rng.pick(['온 마을이 밭에 나갔습니다. 아이들은 캤고, 노인들은 세었습니다.', '첫 감자를 교회에 냈습니다. 둘째 감자를 집에 냈습니다. 셋째 감자는 없었습니다.', '감자 자루가 헛간에 찼습니다. 겨울이 그 자루만큼 길었습니다.']), k: bad ? 'bad' : 'warm', fx: bad ? { hl: -2, h: -2 } : { h: 2 } }; } },
  { id: 'ta_life_pub', a: [16, 90], tags: [TA], w: 35, gap: 2,
    run: (s) => ({ t: '펍에서 ' + cul(s).drink + ' 한 잔을 마셨습니다. ' + s.rng.pick(['누군가 텐게어로 노래를 시작했고, 절반이 따라 불렀고, 절반은 가사를 몰랐습니다.', '구석에서 시인이 시를 읽었습니다. 값은 ' + cul(s).drink + ' 한 잔이었습니다.', pre(s) ? '총독부 사람이 들어오자 노래가 멈췄습니다. 나가자 다시 시작했습니다. 같은 노래였습니다.' : '근위대 병사가 들어왔습니다. 노래가 잠깐 멈췄다가 이어졌습니다. 병사도 따라 불렀습니다.']), k: 'warm', fx: { h: 2, money: -medX(s, 0.02) } }) },
  { id: 'ta_life_tengair_seen', a: [8, 90], tags: [TA], w: 45, c: (s) => !s.S.flags.tengairAsked && s.S.age >= 8,
    run: (s) => { s.S.flags.tengairOffer = s.S.age; return { t: (s.S.age < 15 ? '학교에서 텐게어로 말하다가 벌을 섰습니다. 집에서는 텐게어로 말하다가 칭찬을 받았습니다.' : '텐게어로 말하는 모임이 있다고 했습니다. 밤에, 교회 뒤에서. 가는 사람은 서로를 알았고, 안 가는 사람도 그들을 알았습니다.'), k: 'note' }; } },
  { id: 'ta_life_governor', a: [10, 90], tags: [TA], w: 30, gap: 3, c: (s) => pre(s),
    run: (s) => ({ t: cul(s).ruler + ' 포고문이 교회 문에 붙었습니다. ' + s.rng.pick(['빅토리아어였습니다. 사제가 텐게어로 읽어 주었고, 읽으면서 몇 줄을 바꿨습니다.', '세금이었습니다. 감자로 내도 된다고 했습니다. 감자가 없어서 돈으로 냈습니다.', '"평균 이하 임금"이라는 말이 포고문에 없었습니다. 있을 필요가 없었습니다.']), k: 'note', fx: { h: -1 } }) },
  { id: 'ta_life_curfew', a: [10, 90], tags: [TA], w: 35, gap: 2, c: (s) => s.year >= 1098,
    run: (s) => s.rng.chance(0.22) ? ({ t: '야간 통행금지가 ' + s.rng.ri(1, 3) + '시간 당겨졌습니다. 공고에는 왕의 서명이 있었고, 서명 아래 날짜는 어제였습니다.', k: 'bad', fx: { h: -2 }, f: F('나 시어셔 시정 통행 고시, ' + s.year + '년') }) : ((s) => ({ t: '야간 통행금지였습니다. ' + s.rng.pick(['진짜 공고였습니다. 왕의 서명이 있었습니다. 가짜 공고에는 서명이 없다고 했고, 어둠 속에서 서명은 보이지 않았습니다.', '밤에 발소리를 세었습니다. 근위대인지 "검은 안개"인지. 둘이 다른지도 몰랐습니다.', '통행금지 전에 집에 들어갔습니다. 들어가서도 문을 두 번 확인했습니다.']), k: 'bad', fx: { h: -2 } }))(s) },
  { id: 'ta_life_wake', a: [10, 90], tags: [TA], w: 25, gap: 3,
    run: (s) => ({ t: '이웃의 장례였습니다. ' + s.rng.pick(['유목민이 장례를 주관했습니다. 옛 방식. 마을 사람 절반은 그것을 처음 보았습니다.', '밤새 ' + eul(cul(s).drink) + ' 마시고 이야기를 했습니다. 죽은 사람 이야기였고, 산 사람이 웃었습니다. 그것이 타라의 장례였습니다.', '사제가 빅토리아어로, 가족이 텐게어로 기도했습니다. 둘 다 같은 사람을 위한 것이었습니다.']), k: 'note', fx: { h: -1, cap: { ties: 0.02 } } }) },
  { id: 'ta_life_greet', a: [8, 90], tags: [TA], w: 20, gap: 5,
    run: (s) => ({ t: '길에서 만나면 "' + cul(s).greet + '"라고 했습니다. 길이 평탄한 적은 드물었고, 그래서 그렇게 인사했습니다.', k: 'note', fx: { h: 1 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 소속 변주(aff:), 관계(rel:), 신참, 방문(visit:), 빅토리아 혈통
  // ════════════════════════════════════════════════════════════════════
  { id: 'ta_aff_six', a: [16, 55], tags: ['aff:TAR_DUB_SIX'], w: 40, gap: 2,
    run: (s) => ({ t: '간부 6인 회의 자리에 섰습니다. 벽 쪽이었습니다. 달변가가 말했고, 독약사가 듣고, 나머지는 서로를 보았습니다. 저는 바닥을 보았습니다.', k: 'note', fx: { cap: { ties: 0.03 }, h: -1 } }) },
  { id: 'ta_aff_infected_rep', a: [14, 55], tags: ['aff:TAR_DUB_INFECTED'], w: 40, gap: 2,
    run: (s) => ({ t: '감염자 대표단 천막에는 약이 없었고 총이 있었습니다. 대표단 사람들은 자기 몸보다 오래 살 것을 바라지 않았고, 그래서 제일 앞에 섰습니다.', k: 'bad', fx: { hl: -1, standing: 3 } }) },
  { id: 'ta_aff_wyvern', a: [14, 55], tags: ['aff:TAR_DUB_WYVERN'], w: 35, gap: 3,
    run: (s) => ({ t: '와이번 부대 천막에서 노래를 배웠습니다. 간부가 가르쳤습니다. 가사는 텐게어였고, 곡은 어디서 왔는지 아무도 몰랐습니다.', k: 'warm', fx: { h: 2, cap: { arts: 0.02 } } }) },
  { id: 'ta_aff_garrison', a: [14, 60], tags: ['aff:TAR_HIL_GARRISON'], w: 35, gap: 3,
    run: (s) => ({ t: '주둔지 노역 명부에 "타라인"이라는 칸이 따로 있었습니다. 그 칸의 품삯이 따로 있었고, 따로 있는 쪽이 늘 적었습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'ta_aff_intel', a: [18, 60], tags: ['aff:TAR_VIC_INTEL'], w: 35, gap: 3,
    run: (s) => ({ t: '빅토리아군 정보부 배지를 받았습니다. 배지는 타라 마을에서 보여 주지 않는 것이었습니다. 보여 주지 않아도 마을은 알았습니다.', k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'ta_rel_british', a: [8, 90], tags: [TA], w: 40, gap: 3, c: (s) => s.year >= 1098 && lifeRoll(s, 'ta_british', 0.15),
    run: (s) => ({ t: '빅토리아 혈통이라는 것이 마을에 알려졌습니다. 독립 뒤였습니다. ' + s.rng.pick(['가게에서 값을 두 번 물었습니다. 두 번째가 비쌌습니다.', '아이들이 "첩자"라고 했습니다. 어른들은 말리지 않았습니다.', '교회에서 뒷자리에 앉게 되었습니다. 아무도 그러라고 하지 않았고, 그렇게 되었습니다.']), k: 'bad', fx: { h: -3 } }) },
  { id: 'ta_rel_institutional', a: [8, 90], tags: [TA, 'rel:institutional'], w: 40, gap: 3,
    run: (s) => ({ t: '호적부에 종족 칸이 있었습니다. 그 칸이 나머지 칸을 정했습니다. 배급표 줄이 따로였고, 따로인 줄이 늘 길었습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'ta_rel_subtle', a: [8, 90], tags: [TA, 'rel:subtle'], w: 30, gap: 4,
    run: (s) => ({ t: '펍에서 제 종족을 먼저 말하고 이름을 나중에 말하는 사람이 있었습니다. 틀린 말은 아니었고, 그래서 더 그랬습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'ta_newcomer_tengair', a: [8, 80], tags: [TA, 'newcomer'], w: 40, gap: 2,
    run: (s) => ({ t: '마을 사람들이 텐게어로 말했습니다. 제 앞에서는 빅토리아어로 바꿨습니다. 바꾸는 순간이 보였고, 그것이 외부인이라는 뜻이었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'ta_newcomer_potato', a: [8, 80], tags: [TA, 'newcomer'], w: 35, gap: 3,
    run: (s) => ({ t: '감자 수확에 손을 보탰습니다. 묻지 않았는데 자루 하나를 주었습니다. 말은 안 통했고, 감자는 통했습니다.', k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } }) },
  { id: 'ta_newcomer_church', a: [8, 80], tags: [TA, 'newcomer'], w: 30, gap: 3,
    run: (s) => ({ t: '성당 호적부에 이름을 올렸습니다. 사제는 제 이름을 타라 철자로 적으려다 멈추고, 제 철자대로 적었습니다. 그것이 첫 환영이었습니다.', k: 'note', fx: { cap: { ties: 0.01 } } }) },
  { id: 'ta_visit_field', a: [15, 70], tags: ['visit:tara'], w: 30, gap: 3,
    run: (s) => ({ t: '타라에 머무는 동안 감자밭 사이 길을 걸었습니다. 마을마다 교회 종이 있었고, 종소리가 마을마다 조금씩 달랐습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'ta_visit_curfew', a: [15, 70], tags: ['visit:tara'], w: 25, gap: 3, c: (s) => s.year >= 1098,
    run: (s) => ({ t: '타라에서 야간 통행금지를 겪었습니다. 숙소 주인이 문을 세 번 잠갔습니다. 세 번째 자물쇠는 새것이었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'ta_visit_pub', a: [15, 70], tags: ['visit:tara'], w: 25, gap: 3,
    run: (s) => ({ t: '타라 펍에서 흑맥주를 마셨습니다. 누군가 노래를 시작했고, 가사는 몰랐지만 곡은 따라 흥얼거렸습니다. 옆자리 사람이 잔을 부딪쳐 주었습니다.', k: 'warm', fx: { h: 2 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 캐논 인물(1회성, 연도 게이트, 생애 3명 상한, 거리감)
  // ════════════════════════════════════════════════════════════════════
  { id: 'ta_canon_reed', a: [12, 60], tags: [TA], w: 60, c: (s) => canonOk(s, 'reed', 1094, 1098) && !!s.S.track && ['TAR_DUBLIN', 'TAR_WANDER'].includes(s.S.track.id),
    run: (s) => { seeCanon(s, 'reed'); return { t: '더블린 간부라는 여자가 들판 야영지에서 불을 쬐다 말고 먼 산 쪽으로 혼자 걸어갔습니다. 아무도 따라가지 않았습니다. 따라가면 안 되는 걸음이었습니다.', k: 'note', fx: { h: 1 } }; } },
  { id: 'ta_canon_culann', a: [14, 65], tags: [TA], w: 60, c: (s) => canonOk(s, 'culann', 1096, 1105) && !!s.S.track && ['TAR_SMITH', 'TAR_RATION'].includes(s.S.track.id),
    run: (s) => { seeCanon(s, 'culann'); return { t: '대장간 주인이 배급표를 나눠 주면서도 손에서는 망치를 놓지 않았습니다. 퇴역 군인이라고도 했고, 조각가라고도 했습니다. 저는 줄 끝에서 표를 받았습니다.', k: 'note', fx: { h: 1 } }; } },
  { id: 'ta_canon_bridgid', a: [8, 60], tags: [TA], w: 60, c: (s) => canonOk(s, 'bridgid', 1096, 1105) && !!s.S.track && ['TAR_NOMAD', 'COM_MESSENGER'].includes(s.S.track.id),
    run: (s) => { seeCanon(s, 'bridgid'); return { t: '유목민 소녀가 장례 행렬 맨 앞에서 편지 꾸러미를 안고 걸었습니다. 영혼수호자 후손이라고 누가 작게 말했습니다. 저는 행렬 뒤쪽이었습니다.', k: 'note', fx: { h: 1 } }; } },
];

// ════════════════════════════════════════════════════════════════════
// 결정(12): 텐게어 · 더블린 입단 · 사윈 연회 초대장 · 가짜 통행금지 · 이중첩자 · 전령의 편지 · 농촌 식량 나눔 · 사윈 조각 의뢰 · 사면 · 혼인 3(handfast·nomad·camp)
// ════════════════════════════════════════════════════════════════════
const marryWrap = (typeId, bodyOf, labels) => ({
  tags: [], once: false, at: 0.45,
  ok: (s) => ENGINE_DECISIONS.marry.ok(s) && !!(s.S.flags.y_marry && s.S.flags.y_marry.v && s.S.flags.y_marry.v.type.id === typeId),
  build: (s, p) => { const v = ENGINE_DECISIONS.marry.build(s, p); if (!v || s.S.cur !== TA) return v;
    return { ...v, body: bodyOf(s, p.prospect, p.type), choices: v.choices.map((c, i) => ({ ...c, label: labels[i] || c.label })) }; },
  apply: (s, k, p) => ENGINE_DECISIONS.marry.apply(s, k, p),
});

export const decisions = {
  ta_tengair: {
    tags: [TA], once: true, at: 0.4,
    ok: (s) => !!s.S.flags.tengairOffer && s.S.age - s.S.flags.tengairOffer <= 1,
    build: (s) => { s.S.flags.tengairAsked = true;
      return { title: '텐게어', body: s.S.age < 15 ? '학교는 빅토리아어, 집은 텐게어입니다. 어느 쪽 말을 제 말로 할지 아이도 정해야 했습니다. 텐게어를 고르면 학교가 멀어지고, 빅토리아어를 고르면 할머니가 멀어집니다.' : '텐게어 모임에 가자는 말을 들었습니다. 가면 마을이 가까워지고 총독부가 멀어집니다. 안 가면 그 반대입니다. 독립이 오면 셈이 바뀐다고들 했지만, 독립은 아직 오지 않았습니다.',
        choices: [{ k: 'tengair', label: '텐게어를 쓴다', sub: '관계 +, 학식·일자리 −(독립 전)', auto: 1.2 }, { k: 'english', label: '빅토리아어로 간다', sub: '학식 +, 마을과 거리', auto: 1 }] }; },
    apply: (s, k) => { if (k === 'tengair') { s.S.flags.tengair = true; return { t: '텐게어를 제 말로 했습니다. ' + (pre(s) ? '학교 성적표에 "언어 태도"라는 칸이 나빠졌고, 교회 뒤 모임에서 제 자리가 생겼습니다.' : '독립 뒤라 셈이 달랐습니다. 관청 서류가 텐게어로 바뀌기 시작했고, 제가 그것을 읽을 수 있었습니다.'), k: 'ev', fx: pre(s) ? { cap: { ties: 0.06, learn: -0.03 }, h: 2 } : { cap: { ties: 0.06, learn: 0.02 }, h: 2 } }; }
      s.S.flags.tengair = false; return { t: '빅토리아어로 갔습니다. 성적표가 좋아졌고, 할머니는 제 말을 절반만 알아들었습니다. 절반은 알아들었습니다.', k: 'note', fx: { cap: { learn: 0.05, ties: -0.02 }, h: -1 } }; },
  },
  ta_dublinn_join: {
    tags: [TA, '!track:TAR_DUBLIN', '!track:TAR_VICSERV', '!prison:camp', '!prison:jail', '!rhodes'], once: true, at: 0.5,
    ok: (s) => dublinnEra(s) && s.S.age >= 14 && !!s.data.trackById.TAR_DUBLIN && ((!!s.S.flags.dublinnOffer && s.S.age - s.S.flags.dublinnOffer <= 1) || s.rng.chance(s.S.q <= 2 ? 0.2 : 0.08)),   // 마을마다 밤에 종이가 돌았다: 입구 이벤트 없이도 연 8~20%
    build: (s) => { s.S.flags.dublinnAsked = true;
      return { title: '더블린', body: '종이가 제 앞에 왔습니다. 이름을 적으면 들판 야영지로 갑니다. 총 하나에 둘, 천막 하나에 여덟, 그리고 빅토리아 순찰대. 적지 않으면 내일 아침 밭에 나갑니다. 종이를 들고 온 사람은 기다렸습니다.', fact: F('더블린 소집 통지(압수본)'),
        choices: [{ k: 'join', label: '이름을 적는다', sub: '더블린 병사 · 사망 위험', auto: known(s) || hillock(s) ? 1.5 : 0.8 }, { k: 'no', label: '밭에 나간다', auto: 1.2 }] }; },
    apply: (s, k) => { if (k !== 'join') return { t: '적지 않았습니다. 그 사람은 다음 집으로 갔고, 다음 집 아이가 다음 날 보이지 않았습니다.', k: 'note', fx: { h: -1 } };
      if (s.enterTrack('TAR_DUBLIN', { how: 'switch', via: 'village', aff: hillock(s) || known(s) ? 'TAR_DUB_INFECTED' : undefined, quiet: true })) return { t: '이름을 적었습니다. 그날 밤 들판으로 갔습니다. 총은 다음 주에 받았고, 천막은 그날 받았습니다.', k: 'big', fx: { h: 1, cap: { ties: 0.03 } } };
      return '종이는 그날 밤 거둬 갔습니다.'; },
  },
  ta_samhain_invite: {
    tags: [T('TAR_DUBLIN')], once: true, at: 0.5,
    ok: (s) => !!s.S.flags.samhainOffer && s.S.age - s.S.flags.samhainOffer <= 1 && (s.S.track ? s.S.track.stage : -1) >= 2,
    build: (s) => { s.S.flags.samhainAsked = s.year;
      return { title: cul(s).festivals[0] + ' 연회', body: '왕의 이름으로 온 초대장입니다. 간부 전원. 검은 숲 연회장. 가지 않으면 왕을 거역하는 것이고, 가면 왕이 무엇을 할지는 아무도 모릅니다. 강경파는 전원 간다고 했습니다. 그것이 더 불안했습니다.',
        choices: [{ k: 'go', label: '연회에 간다', sub: '왕의 신임 / 숙청', auto: 1 }, { k: 'flee', label: '그날 밤 야영지를 떠난다', sub: '유랑, 살아남음', auto: 0.8 }] }; },
    apply: (s, k) => {
      if (k === 'flee') { s.leaveTrack('switch', { quiet: true }); s.enterTrack('TAR_WANDER', { how: 'switch', via: 'deserter', stage: 1, quiet: true }); return { t: '초대장을 두고 야영지를 떠났습니다. 들판으로. 다음 날 연회장에서 간부 여섯이 돌아오지 않았다는 말을 들판에서 들었습니다.', k: 'big', fx: { h: -4 } }; }
      const hard = affIs(s, 'TAR_DUB_HARDLINE') || affIs(s, 'TAR_DUB_SIX');
      if (s.rng.chance(hard ? 0.65 : 0.3)) { s.die('execution', cul(s).festivals[0] + ' 숙청'); return false; }
      s.enterTrack('TAR_REDIRON', { how: 'switch', via: 'exdublinn', aff: 'TAR_RED_GUARD', stage: 1, quiet: true });
      return { t: '연회에 갔습니다. 검은 숲. 간부 여섯이 자리를 떴고, 돌아오지 않았습니다. 남은 사람에게 왕이 적철 근위대 임명장을 내렸습니다. 받았습니다. 손이 떨렸고, 아무도 보지 않았습니다.', k: 'big', fx: { h: -6, standing: 10 } }; },
  },
  ta_red_curfew: {
    tags: [T('TAR_REDIRON')], once: true, at: 0.5,
    ok: (s) => !!s.S.flags.redCurfewOffer && s.S.age - s.S.flags.redCurfewOffer <= 1,
    build: (s) => { s.S.flags.redCurfewAsked = true;
      return { title: '서명 없는 명령', body: '밤 명령서입니다. 서명 칸이 비어 있고, 내용은 공고된 적 없는 통행금지입니다. 거리에 나온 사람을 데려오라는 것입니다. 거리에서 사람들은 저희를 "검은 안개"라고 부를 것입니다. 거부하면 명령 불복종이고, 명령은 서명이 없습니다.',
        choices: [{ k: 'obey', label: '명령대로 나간다', sub: '군공 +, 오명', auto: 1 }, { k: 'refuse', label: '서명을 요구한다', sub: '군공 −, 처벌 위험', auto: 1 }] }; },
    apply: (s, k) => { if (k === 'obey') { s.S.flags.blackFog = true; return { t: '나갔습니다. 거리의 사람 셋을 데려왔습니다. 어디로 갔는지는 모릅니다. 다음 날 마을에서 "검은 안개"라는 말을 들었고, 돌아보지 않았습니다.', k: 'bad', fx: { standing: 5, h: -5 } }; }
      if (s.rng.chance(0.3)) { s.eff({ standing: -15 }); return { t: '서명을 요구했습니다. 분대장은 명령서를 거뒀고, 다음 주 제 이름이 국경 초소 명단으로 옮겨졌습니다. 그 초소는 겨울이 길었습니다.', k: 'bad', fx: { h: -2, hl: -2 } }; }
      return { t: '서명을 요구했습니다. 명령서는 그날 밤 나가지 않았습니다. 분대장은 아무 말이 없었고, 그것이 고맙다는 뜻이라고 나중에 알았습니다.', k: 'ev', fx: { h: 2, standing: -3 } }; },
  },
  ta_vs_double: {
    tags: [T('TAR_VICSERV', 'intel')], once: true, at: 0.5,
    ok: (s) => !!s.S.flags.doubleOffer && s.S.age - s.S.flags.doubleOffer <= 1,
    build: (s) => { s.S.flags.doubleAsked = true;
      return { title: '두 번째 보고서', body: '더블린 쪽 사람이 기다립니다. 정보를 넘기면 타라가 기억할 것이라고 했습니다. 넘기지 않으면 빅토리아가 기억할 것이고, 그쪽은 급료를 줍니다. 발각되면 어느 쪽이든 끝입니다.',
        choices: [{ k: 'yes', label: '넘긴다', sub: '이중첩자 · 발각 위험', auto: 1 }, { k: 'no', label: '보고한다', sub: '정보부 신임 +', auto: 1 }] }; },
    apply: (s, k) => { if (k === 'yes') { s.promote({ force: true, quiet: true }); return { t: '넘겼습니다. 그날 밤부터 보고서를 두 벌 썼습니다. 기억하겠다는 말은 받았고, 기억이 무엇을 해 주는지는 몰랐습니다.', k: 'big', fx: { h: -3 } }; }
      s.eff({ standing: 8 }); return { t: '보고했습니다. 그 사람은 다음 날 잡혔습니다. 정보부는 제 보고서를 칭찬했고, 저는 그 사람의 얼굴을 오래 기억했습니다.', k: 'bad', fx: { h: -5 } }; },
  },
  ta_nom_letter: {
    tags: [T('TAR_NOMAD', 'courier')], once: true, at: 0.5,
    ok: (s) => dublinnEra(s) && s.rng.chance(0.3),
    build: (s) => ({ title: '이름 없는 편지', body: '겉봉에 이름이 없는 편지입니다. 더블린 쪽 것이라는 것을 압니다. 전령은 이름 없는 편지를 나르지 않습니다. 규칙입니다. 보낸 사람은 감자 두 자루를 내놓았습니다. 마차에 감자는 반 자루 남아 있습니다.',
      choices: [{ k: 'carry', label: '나른다', sub: '감자 +, 순찰대 위험', auto: 1.2 }, { k: 'refuse', label: '규칙대로 돌려준다', sub: '부족 신망 +', auto: 1 }] }),
    apply: (s, k) => { if (k !== 'carry') { s.eff({ standing: 5 }); return { t: '돌려주었습니다. ' + iga(cul(s).elder) + ' 고개를 끄덕였습니다. 그 편지는 다른 길로 갔고, 그 길은 저보다 느렸을 것입니다.', k: 'note' }; }
      if (s.rng.chance(0.25)) { s.eff({ hl: -6, h: -4 }); return { t: '날랐습니다. 순찰대에 잡혔습니다. 편지는 열렸고, 저는 사흘 뒤에 풀려났습니다. 편지의 내용은 끝내 몰랐고, 순찰대는 알았습니다.', k: 'bad' }; }
      return { t: '날랐습니다. 사흘 길. 받는 사람은 겉봉을 보지 않고 제 얼굴을 보았습니다. 감자 두 자루가 마차에 올랐습니다.', k: 'ev', fx: { money: medX(s, 0.08), standing: 2, h: 1 } }; },
  },
  ta_farm_share: {
    tags: [T('TAR_FARM')], once: false, gap: 5, at: 0.5,
    ok: (s) => (s.S.track ? s.S.track.stage : -1) >= 1 && s.rng.chance(0.2),
    build: (s) => ({ title: '감자 한 자루', body: '마을에 배급표가 돌고, 제 헛간에는 감자가 세 자루 있습니다. 겨울은 넉 달입니다. 옆집은 자루가 없습니다. 옆집 아이가 헛간 문 앞에 서 있다가 갔습니다.',
      choices: [{ k: 'share', label: '한 자루를 준다', sub: '동네 평판 +, 겨울 −', auto: 1.3 }, { k: 'keep', label: '헛간 문을 잠근다', sub: '겨울 안전', auto: 1 }] }),
    apply: (s, k) => { if (k === 'share') return { t: '한 자루를 옆집에 놓았습니다. 밤에. 아침에 옆집 아이가 헛간 앞을 쓸고 있었습니다.', k: 'warm', fx: { standing: 6, h: 3, hl: -2, cap: { ties: 0.03 } } };
      return { t: '문을 잠갔습니다. 겨울을 났습니다. 봄에 옆집 아이가 저를 보고 인사하지 않았고, 저도 하지 않았습니다.', k: 'note', fx: { standing: -4, h: -2 } }; },
  },
  ta_smi_sculpt: {
    tags: [T('TAR_SMITH', 'smith')], once: true, at: 0.5,
    ok: (s) => inStage(s) >= 4 && s.S.cap.skill >= 0.5 && s.rng.chance(0.3),
    build: (s) => ({ title: cul(s).festivals[0] + ' 조각', body: '나 시어셔 시정에서 ' + cul(s).festivals[0] + ' 광장 조각을 의뢰했습니다. 붉은 용. 대장장이가 할 일은 아니라고 길드 사람들이 말했고, 의뢰는 대장장이에게 왔습니다. 석 달이 걸리고, 그동안 말굽 주문은 못 받습니다.',
      choices: [{ k: 'yes', label: '끌을 든다', sub: '명장의 길 / 석 달 소득 −', auto: 1.2 }, { k: 'no', label: '망치만 든다', auto: 1 }] }),
    apply: (s, k) => { if (k !== 'yes') return { t: '거절했습니다. 다른 사람이 용을 만들었습니다. 광장에서 그 용을 볼 때마다 제 손이 조금 움직였습니다.', k: 'note', fx: { h: -1 } };
      s.eff({ money: -medX(s, 0.3) }); if (s.rng.chance(0.5 + s.S.cap.skill * 0.15)) { s.promote({ force: true }); return { t: '석 달 동안 끌을 들었습니다. ' + cul(s).festivals[0] + ' 밤 광장에 용이 섰습니다. 마을이 그 앞에 불을 켰습니다. 대장간이 그날부터 공방이라 불렸습니다.', k: 'big', fx: { h: 5 } }; }
      return { t: '석 달 동안 끌을 들었습니다. 용은 섰고, 사람들은 지나갔습니다. 다음 해 의뢰는 오지 않았습니다. 손은 그래도 늘었습니다.', k: 'note', fx: { cap: { skill: 0.05 }, h: -1 } }; },
  },
  ta_wan_amnesty: {
    tags: [T('TAR_WANDER', 'dublinn')], once: true, at: 0.5,
    ok: (s) => s.year >= 1099 && !!s.data.trackById.TAR_REDIRON && s.S.age <= 40,
    build: (s) => ({ title: '사면', body: '왕의 이름으로 사면 공고가 붙었습니다. 근위대에 들어오면 지난 일은 묻지 않는다고 합니다. 무리의 절반은 갔고, 절반은 공고를 믿지 않습니다. 간 사람 중 돌아와서 말해 준 사람은 아직 없습니다.',
      choices: [{ k: 'go', label: '근위대로 간다', sub: '적철 근위대 편입', auto: 1.2 }, { k: 'stay', label: '들판에 남는다', auto: 1 }] }),
    apply: (s, k) => { if (k !== 'go') return { t: '남았습니다. 들판은 넓었고, 사람은 절반이었습니다.', k: 'note' };
      if (s.enterTrack('TAR_REDIRON', { how: 'switch', via: 'amnesty', aff: 'TAR_RED_EXDUBLINN', quiet: true })) return { t: '갔습니다. 지난 일은 묻지 않았습니다. 제복을 받았고, 막사를 받았고, 처음으로 지붕 아래서 겨울을 났습니다.', k: 'big', fx: { h: 3 } };
      return '공고는 다음 날 떼어졌습니다.'; },
  },
  marry_handfast: marryWrap('handfast', (s, pr, t) => wa(pr.name) + ' 손 묶기 혼례를 이야기했습니다. 교회 없이, 환상열석 앞에서 손을 묶고 1년 하루를 삽니다. 1년 뒤에 풀지 않으면 혼인입니다. 지참금은 양 두 마리입니다.' + (pr.home ? ' 상대는 ' + nat(s, pr.home) + ' 사람입니다. 손 묶기는 그쪽 호적에 적히지 않습니다.' : ''), ['손을 묶는다', '다음 해로 미룬다', '거절한다']),
  marry_nomad: marryWrap('nomad', (s, pr, t) => wa(pr.name) + ' 혼례를 마차 사이에서 올리는 이야기가 오갔습니다. ' + iga(cul(s).elder) + ' 옛 텐게어로 축복하고, 두 마차가 한 마차가 됩니다. 마을 교회에는 적히지 않습니다.', ['마차를 잇는다', '다음 길에서', '거절한다']),
  marry_camp: marryWrap('camp', (s, pr, t) => wa(pr.name) + ' 야영지 혼인을 이야기했습니다. 사제도 호적부도 없이, 천막 앞에서 간부 하나가 증인이 됩니다. 지참금은 없고, 내일도 없을 수 있습니다. 그래서 오늘 하는 것입니다.', ['오늘 한다', '내일로 미룬다', '하지 않는다']),
};

// W11: 엔진 id 와 같은 결정은 국가 디스패처로 옮긴다(여러 파일이 같은 id 를 등록해도 거주국별로 분기)
hoist(decisions, { marry_handfast: ['tara'], marry_nomad: ['tara'], marry_camp: ['tara'] });

export default { events, decisions };
