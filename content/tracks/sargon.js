// W9g 사르곤 진로 콘텐츠 (D40 국가 전용, 텍스트 공유 0).
// 핵심 진로 5: SAR_COURT(궁정 관료)·SAR_ZHAYEDAN(자예단)·SAR_SLAVE(노예)·SAR_TRIBE(아카후알라 부족)·SAR_TRADE(오아시스 상단) — 단계마다 이벤트 4개.
// 나머지 7: SAR_ARMY·SAR_FARM·SAR_MINE·SAR_TEACHER·SAR_MESSENGER·SAR_MERC·SAR_TOUR — 단계마다 2개. 전부 전환 서사·몰락 후일담 1개씩.
// 생업 계절 이벤트(대추야자·모래바람·바자르·우기·풍토병), 소속 변주(aff:), 신참·관계·방문 태그, 캐논 인물(D43, 1회성·연도 게이트).
// 결정: 자예단 지원·마비소티아 난투·노예 반란·궁정 줄서기·암시장·세금 체납·용병 탈영 + marry_dowry(지참금 흥정)·marry_tribal·marry_court·marry_slave·marry_second·home_change.
// 톤: 담백한 "~했습니다"체(D25), 무거운 주제는 결과만, 각주는 숫자가 있을 때만 세계관 안 출처(D31), 조사는 유틸(D30).
// 공용 파일은 import 만 한다. 같은 묶음의 bolivar.js·rim.js 가 이 파일의 sharedDecisions 를 가져다 같은 id 로 등록한다(국가 분기 + 엔진 위임).
import { ENGINE_DECISIONS } from '../../src/engine/choices.js';
import { eul, iga, eun, wa, ro, ieot, rago } from '../../src/engine/text.js';
import { cul, fest, F, orgF, rhodesF, given, poor, rich, lifeRoll, once, medX, momName, dadName } from '../_util.js';
import { hoist } from '../_dispatch.js';

// ── 도우미 ─────────────────────────────────────────────────────────────────
const T = (id, st) => 'track:' + id + (st ? ':' + st : '');
/** 이벤트 압축 생성: run 이 문자열·객체면 그대로 돌려준다 */
const E = (id, a, tags, w, gap, run, extra = {}) => ({ id, a, tags, w, gap, run: typeof run === 'function' ? run : () => run, ...extra });
const trk = (s, id) => !!s.S.track && s.S.track.id === id;
const stageId = (s) => (s.stage ? s.stage.id : null);
/** 올해 단계가 바뀐 직후(승급 다음 해까지) */
const stNew = (s) => !!s.S.track && s.S.track.stage > 0 && s.S.age - s.S.track.stageSince <= 1;
/** 그 진로에서 몰락해 떠난 지 2년 안 */
const fell = (s, id, within = 2) => !s.S.track && s.S.flags.lastTrack === id && !!s.S.flags.lastFall && s.S.flags.lastFallAt != null && s.S.age - s.S.flags.lastFallAt <= within;
const affIs = (s, id) => !!s.S.track && s.S.track.aff === id;
const standing = (s) => (s.S.track ? s.S.track.standing : 0);
const skillZ = (s) => (s.S.cap ? s.S.cap.skill : 0);
const known = (s) => s.S.ori.on && s.S.ori.known;
/** 출생 지역(아카후알라 정글 / 그 밖). 엔진이 region 을 롤하지 않으면 여기서 한 번 정한다 */
export function sarRegion(s) {
  const S = s.S; S.sub = S.sub || {};
  if (S.sub.region === undefined) S.sub.region = lifeRoll(s, 'sar_region', 0.15) ? 'acahualla' : 'other';
  return S.sub.region;
}
const jungle = (s) => sarRegion(s) === 'acahualla';
/** 캐논 인물(D43): 연도 게이트 + 생애 3명 상한. 돌려준 객체의 name 은 1회성 이벤트에서만 쓴다 */
export function canonOpen(s, id) {
  const f = (s.data.canonFigures || []).find((x) => x.id === id);
  if (!f || !Array.isArray(f.years)) return null;
  if (s.year < f.years[0] || s.year > f.years[1]) return null;
  if ((s.S.flags.canonSeen || 0) >= 3 || s.S.flags['canon_' + id] != null) return null;
  return f;
}
export function canonSeen(s, f) { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; s.S.flags['canon_' + f.id] = s.S.age; }
const dinar = (s, k) => Math.round(s.med * k).toLocaleString() + ' LMD';

// ── 핵심 1. SAR_COURT 샤 궁정 관료 (A3: junior → senior → vizier) ───────────
const court = [
  E('sar_cou_j_ledger', [18, 60], [T('SAR_COURT', 'junior')], 40, 2, (s) => ({ t: '서기국 장부를 베끼는 일로 한 해가 갔습니다. 글씨가 작아졌고, 눈이 나빠졌습니다.', k: 'ev', fx: { cap: { learn: 0.03 }, standing: 2, hl: -1 } })),
  E('sar_cou_j_watch', [18, 60], [T('SAR_COURT', 'junior')], 35, 3, (s) => ({ t: '군 지휘권을 가진 귀족이 관료들의 출근 시각을 적어 갔습니다. 늦은 날이 세 번이었고, 세 번 모두 장부에 남았습니다.', k: 'bad', fx: { standing: -3, h: -2 }, f: orgF(s, '근태 장부', s.year) })),
  E('sar_cou_j_gift', [18, 60], [T('SAR_COURT', 'junior')], 30, 3, (s) => (s.rng.chance(0.5) ? { t: '청탁과 함께 상자가 왔습니다. 돌려보냈습니다. 다음 날 다른 상자가 왔습니다.', k: 'note', fx: { standing: 1 } } : { t: '청탁과 함께 상자가 왔습니다. 열어 보았습니다. 그 뒤로 상자는 매달 왔습니다.', k: 'bad', fx: { money: medX(s, 0.3), h: -2 } })),
  E('sar_cou_j_shah', [18, 60], [T('SAR_COURT', 'junior')], 25, 4, (s) => ({ t: '샤의 행렬이 복도를 지났습니다. 벽을 보고 서 있었습니다. 발소리가 지나간 뒤에야 숨을 쉬었습니다.', k: 'note', fx: { h: 1 } })),
  E('sar_cou_s_tax', [22, 70], [T('SAR_COURT', 'senior')], 40, 2, (s) => ({ t: '아미르령 세금 보고서를 결재했습니다. 숫자 하나를 고쳤습니다. 그 숫자가 어느 마을의 겨울이었습니다.', k: 'bad', fx: { standing: 3, h: -2 } })),
  E('sar_cou_s_envoy', [22, 70], [T('SAR_COURT', 'senior')], 35, 3, (s) => ({ t: '파디샤의 사절을 맞았습니다. ' + cul(s).drink + ' 석 잔이 비는 동안 세 가지 요구를 들었고, 하나만 적었습니다.', k: 'ev', fx: { cap: { ties: 0.03 }, standing: 2, f: orgF(s, '사절 접견 기록', s.year) } })),
  E('sar_cou_s_purge_rumor', [22, 70], [T('SAR_COURT', 'senior')], 30, 3, (s) => ({ t: '옆 부서의 고위 관료가 하룻밤 사이에 사라졌습니다. 그 방의 서류는 아침에 다른 사람이 정리하고 있었습니다.', k: 'bad', fx: { h: -3 } })),
  E('sar_cou_s_hanging', [22, 70], [T('SAR_COURT', 'senior')], 25, 6, (s) => ({ t: '아미르 한 사람이 교수형에 처해졌습니다. 그 명령서 말미에 제 서명이 있었습니다. 손이 떨리지 않은 것이 더 무서웠습니다.', k: 'bad', fx: { h: -4, standing: 4 } })),
  E('sar_cou_v_gate', [28, 90], [T('SAR_COURT', 'vizier')], 40, 3, (s) => ({ t: '샤르-아가데의 문은 안에서 열리지 않았습니다. 재상이 되고 처음 안 사실이었습니다. 가족은 초청장을 받아야 들어올 수 있었습니다.', k: 'note', fx: { h: -2 } })),
  E('sar_cou_v_audience', [28, 90], [T('SAR_COURT', 'vizier')], 35, 2, (s) => ({ t: '샤를 알현했습니다. 물음은 하나였고, 대답은 짧았습니다. 그 대답으로 아미르령 둘의 국경이 옮겨졌습니다.', k: 'big', fx: { standing: 5, cap: { ties: 0.05 }, f: orgF(s, '국경 조정 칙령', s.year) } })),
  E('sar_cou_v_poison', [28, 90], [T('SAR_COURT', 'vizier')], 25, 4, (s) => ({ t: '저녁상의 잔 하나가 바뀌어 있었습니다. 시종이 먼저 마셨고, 그 시종은 다음 날 오지 않았습니다.', k: 'bad', fx: { h: -5, hl: -3 } })),
  E('sar_cou_v_heir', [28, 90], [T('SAR_COURT', 'vizier')], 30, 4, (s) => ({ t: '후계를 두고 파디샤들이 줄을 섰습니다. 재상의 방 앞 복도가 한 해 내내 붐볐습니다. 누구의 이름도 먼저 부르지 않았습니다.', k: 'ev', fx: { standing: 2, h: -1 } })),
  E('sar_cou_jester', [18, 70], ['aff:SAR_COU_JESTER'], 40, 3, (s) => ({ t: '어릿광대의 자리에서 샤를 웃겼습니다. 웃음이 멎은 뒤에 한 말이 다음 날 칙령이 되었습니다. 그것을 아는 사람은 둘뿐이었습니다.', k: 'note', fx: { standing: 3, h: 1 } })),
  E('sar_cou_noble', [18, 70], ['aff:SAR_COU_NOBLE'], 30, 4, (s) => ({ t: '추천한 귀족 집안의 심부름이 공무보다 먼저였습니다. 거절할 수 없는 순서였습니다.', k: 'bad', fx: { standing: 2, h: -2 } })),
  E('sar_cou_shift', [18, 90], [T('SAR_COURT')], 400, 2, (s) => ({ t: stageId(s) === 'senior' ? '고위 관료가 되었습니다. 방이 생겼고, 방문이 닫히는 소리를 듣는 사람도 생겼습니다.' : '재상의 인장을 받았습니다. 그날로 궁정 바깥의 집은 남의 집이 되었습니다.', k: 'big', fx: { h: 3 } }), { c: stNew }),
  E('sar_cou_after', [18, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'purge' ? '궁정에서 숙청된 뒤의 일입니다. 이름이 명부에서 지워졌고, 옛 동료들은 길에서 눈을 내렸습니다.' : '궁정을 떠난 뒤의 일입니다. 서기국 인장이 없는 손이 한동안 낯설었습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'SAR_COURT') }),
];

// ── 핵심 2. SAR_ZHAYEDAN 자예단 후보 (A4 종료형: volunteer → trial → immortal) ───
const zhayedan = [
  E('sar_zha_v_list', [20, 50], [T('SAR_ZHAYEDAN', 'volunteer')], 45, 2, (s) => ({ t: '파디샤가 바치는 공물 명단에 이름이 올랐습니다. 명단은 사람 이름 열둘이었고, 짐승은 없었습니다.', k: 'ev', fx: { standing: 3 }, f: orgF(s, '공물 명부', s.year) })),
  E('sar_zha_v_farewell', [20, 50], [T('SAR_ZHAYEDAN', 'volunteer')], 40, 3, (s) => ({ t: '가족이 전별 음식을 쌌습니다. ' + cul(s).food + '였습니다. 돌아올 때 먹을 것이 아니라는 것을 양쪽 다 알았습니다.', k: 'loss', fx: { h: -3 } })),
  E('sar_zha_v_march', [20, 50], [T('SAR_ZHAYEDAN', 'volunteer')], 35, 3, (s) => ({ t: '샤르-아가데까지 사막을 걸었습니다. 자원자 하나가 도중에 돌아섰습니다. 아무도 붙잡지 않았습니다.', k: 'ev', fx: { hl: -2, cap: { skill: 0.03 } } })),
  E('sar_zha_v_oath', [20, 50], [T('SAR_ZHAYEDAN', 'volunteer')], 30, 3, (s) => ({ t: '궁정 문 앞에서 서약을 읽었습니다. 서약서에는 돌아간다는 말이 없었습니다.', k: 'note', fx: { standing: 2 } })),
  E('sar_zha_t_first', [20, 55], [T('SAR_ZHAYEDAN', 'trial')], 45, 2, (s) => ({ t: '첫 관문을 지났습니다. 함께 들어간 사람 중 셋이 다음 관문 앞에 없었습니다.', k: 'ev', fx: { standing: 4, hl: -3 }, f: orgF(s, '자예단 선발 기록', s.year) })),
  E('sar_zha_t_return', [20, 55], [T('SAR_ZHAYEDAN', 'trial')], 35, 3, (s) => ({ t: '탈락한 사람이 고향으로 돌아가는 것을 보았습니다. 걸음이 가벼워 보였습니다. 부러운지 아닌지는 끝내 정하지 못했습니다.', k: 'note', fx: { h: -1 } })),
  E('sar_zha_t_gold', [20, 55], [T('SAR_ZHAYEDAN', 'trial')], 30, 3, (s) => ({ t: '시험을 통과하면 몸이 어떻게 되는지 들었습니다. 설명은 짧았고, 질문은 받지 않았습니다.', k: 'bad', fx: { h: -3 } })),
  E('sar_zha_t_gem', [20, 55], ['aff:SAR_ZHA_GEM', T('SAR_ZHAYEDAN', 'trial')], 40, 3, (s) => ({ t: '다섯 보석의 의식을 준비했습니다. 보석마다 이름을 외웠고, 그 이름이 무엇을 담는지는 외우지 않았습니다.', k: 'note', fx: { cap: { learn: 0.03 } } })),
  E('sar_zha_i_post', [21, 120], [T('SAR_ZHAYEDAN', 'immortal')], 45, 2, (s) => ({ t: '최남단 고온지대의 초소에 섰습니다. 바람이 뜨거웠고, 뜨거운 것을 느끼지 못했습니다.', k: 'note', fx: { standing: 2 } })),
  E('sar_zha_i_silence', [21, 120], [T('SAR_ZHAYEDAN', 'immortal')], 40, 3, (s) => ({ t: '한 해 동안 한 말을 세어 보았습니다. 열 마디가 되지 않았습니다. 필요한 말은 그보다 적었습니다.', k: 'note', fx: { h: -1, f: F('자예단 초소 일지, ' + s.year + '년') } })),
  E('sar_zha_i_demon', [21, 120], [T('SAR_ZHAYEDAN', 'immortal')], 35, 3, (s) => ({ t: '남쪽에서 온 것을 막았습니다. 무엇이었는지는 보고서에 적지 않았습니다. 적을 말이 없었습니다.', k: 'ev', fx: { standing: 4 } })),
  E('sar_zha_i_family', [21, 120], [T('SAR_ZHAYEDAN', 'immortal')], 25, 6, (s) => ({ t: '가족이 초소 아래까지 왔습니다. 멀리서 손을 들었고, 저도 들었습니다. 그것으로 충분하다고 양쪽이 생각했습니다.', k: 'warm', fx: { h: 2 } })),
  E('sar_zha_shift', [20, 120], [T('SAR_ZHAYEDAN')], 400, 2, (s) => { if (stageId(s) === 'immortal') { s.S.flags.zhayedan = s.S.age; return { t: '시험을 통과했습니다. 그 뒤로 배고프지 않았고, 잠들지 않았고, 늙지 않았습니다. 자예단이 되었습니다.', k: 'big', fx: { h: 2, hl: 10 } }; } return { t: '시험이 시작되었습니다. 이름 대신 번호를 받았습니다.', k: 'ev', fx: { standing: 2 } }; }, { c: stNew }),
  E('sar_zha_after', [20, 95], [], 500, 1, (s) => ({ t: '자예단 시험에서 탈락한 뒤의 일입니다. 고향에 돌아왔고, 사람들은 묻지 않았습니다. 묻지 않는 것이 예의였습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'SAR_ZHAYEDAN') }),
];

// ── 핵심 3. SAR_SLAVE 노예 (A11 붕괴형: slave(forced) → revolt → freed) ──────────
const slave = [
  E('sar_sla_born', [0, 12], ['sargon', 'q1', '!track:SAR_SLAVE', '!slave'], 60, 1, (s) => { s.S.status.slave = true; s.enterTrack('SAR_SLAVE', { how: 'forced', via: 'born', quiet: true }); return { t: '태어난 집이 주인의 것이었습니다. 부모의 이름 옆에 주인의 이름이 먼저 적혀 있었습니다.', k: 'bad', fx: { h: -3 } }; }, { c: (s) => !s.S.track && lifeRoll(s, 'sar_slave_born', 0.3) }),
  E('sar_sla_debt', [16, 50], ['sargon', '!track:SAR_SLAVE', '!slave', '!noble'], 40, 3, (s) => { s.S.status.slave = true; s.enterTrack('SAR_SLAVE', { how: 'forced', via: 'debt', quiet: true }); return { t: '빚을 갚지 못했습니다. 채권자가 사람을 데려왔고, 서류에 몸값이라는 칸이 있었습니다.', k: 'bad', fx: { h: -6 } }; }, { c: (s) => s.S.q <= 2 && s.S.money < -s.med && s.rng.chance(0.35) }),
  E('sar_sla_s_quarry', [6, 70], [T('SAR_SLAVE', 'slave'), 'aff:SAR_SLA_CHESHME'], 45, 2, (s) => ({ t: '샤르-체슈메의 채석장에서 돌을 날랐습니다. 하루에 몇 번인지 세지 않았습니다. 세는 사람은 따로 있었습니다.', k: 'bad', fx: { hl: -3, h: -2 } })),
  E('sar_sla_s_house', [6, 70], [T('SAR_SLAVE', 'slave'), 'aff:SAR_SLA_HOUSE'], 45, 2, (s) => ({ t: '주인집 부엌에서 한 해를 보냈습니다. 주인의 아이가 글을 배우는 것을 문틈으로 보았습니다.', k: 'note', fx: { cap: { learn: 0.02 }, h: -1 } })),
  E('sar_sla_s_sold', [6, 70], [T('SAR_SLAVE', 'slave')], 30, 5, (s) => ({ t: '팔렸습니다. 값은 듣지 못했습니다. 새 주인은 이름을 묻지 않고 번호를 주었습니다.', k: 'loss', fx: { h: -5 } })),
  E('sar_sla_s_hand', [6, 70], [T('SAR_SLAVE', 'slave')], 25, 4, (s) => ({ t: '옆 사람이 도망치다 잡혔습니다. 그날 저녁 그 사람은 한 손으로 밥을 먹었습니다.', k: 'bad', fx: { h: -4 } })),
  E('sar_sla_s_feast', [6, 70], [T('SAR_SLAVE', 'slave')], 25, 3, (s) => ({ t: fest(s) + ' 날에는 주인집에서 남은 ' + eul(cul(s).food) + ' 내려보냈습니다. 그날만은 배가 불렀습니다.', k: 'warm', fx: { h: 2, hl: 1 } })),
  E('sar_sla_r_whisper', [12, 70], [T('SAR_SLAVE', 'revolt')], 45, 2, (s) => ({ t: '밤에 모였습니다. 말은 적었고, 돌아가는 길에 횃불을 들지 않았습니다.', k: 'ev', fx: { cap: { ties: 0.04 }, standing: 3 } })),
  E('sar_sla_r_weapon', [12, 70], [T('SAR_SLAVE', 'revolt')], 35, 3, (s) => ({ t: '채석 도구가 하나씩 없어졌습니다. 감독은 세다가 그만두었습니다.', k: 'note', fx: { h: 1 } })),
  E('sar_sla_r_crush', [12, 70], [T('SAR_SLAVE', 'revolt')], 30, 3, (s) => ({ t: '옆 채석장의 반란이 진압되었습니다. 그쪽에서 살아 돌아온 사람은 없었습니다. 우리 쪽은 그날 밤 더 조용했습니다.', k: 'bad', fx: { h: -5 } })),
  E('sar_sla_r_paper', [12, 70], [T('SAR_SLAVE', 'revolt')], 30, 3, (s) => ({ t: '해방 문서라는 것이 있다는 말을 들었습니다. 글을 아는 사람이 한 명 있었고, 그 사람이 밤마다 읽혔습니다.', k: 'note', fx: { cap: { learn: 0.03 } } })),
  E('sar_sla_f_mark', [14, 80], [T('SAR_SLAVE', 'freed')], 45, 2, (s) => ({ t: '해방민의 표식을 받았습니다. 표식은 몸에 남았고, 사람들은 그것을 먼저 보았습니다.', k: 'note', fx: { h: -1 } })),
  E('sar_sla_f_refuse', [14, 80], [T('SAR_SLAVE', 'freed')], 40, 3, (s) => ({ t: '일자리를 찾았습니다. 세 집이 표식을 보고 돌려보냈고, 네 번째 집이 반값에 받았습니다.', k: 'bad', fx: { money: medX(s, 0.1), h: -2, f: F('해방민 고용 신고, ' + s.year + '년') } })),
  E('sar_sla_f_land', [14, 80], [T('SAR_SLAVE', 'freed')], 35, 3, (s) => { s.S.flags.switchOpen = true; return { t: '오아시스 가장자리의 땅을 소작으로 얻었습니다. 땅은 나빴고, 제 것이 아니었고, 그래도 아침에 나가는 곳이 생겼습니다.', k: 'warm', fx: { h: 3 } }; }),
  E('sar_sla_f_master', [14, 80], [T('SAR_SLAVE', 'freed')], 25, 5, (s) => ({ t: '옛 주인을 바자르에서 보았습니다. 그쪽은 알아보지 못했습니다. 그것이 가장 나은 결말이라고 생각했습니다.', k: 'note', fx: { h: 1 } })),
  E('sar_sla_shift', [6, 80], [T('SAR_SLAVE')], 400, 2, (s) => (stageId(s) === 'freed' ? { t: '해방되었습니다. 서류 한 장이었습니다. 그 한 장을 얻는 데 평생이 들어 있었습니다.', k: 'big', fx: { h: 6 } } : { t: '반란에 가담했습니다. 돌아갈 길은 그날로 없어졌습니다.', k: 'bad', fx: { h: 1, standing: 3 } }), { c: stNew }),
  E('sar_sla_after', [6, 95], [], 500, 1, (s) => ({ t: '노예 신분에서 떠난 뒤의 일입니다. 표식은 지워지지 않았고, 지우려 하지도 않았습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'SAR_SLAVE') }),
];

// ── 핵심 4. SAR_TRIBE 아카후알라 부족민 (A7: member → role → chief → grand) ────
const tribe = [
  E('sar_tri_m_rain', [10, 60], [T('SAR_TRIBE', 'member')], 45, 2, (s) => ({ t: '우기가 왔습니다. 길이 물에 잠겼고, 사냥은 나무 위에서 했습니다.', k: 'ev', fx: { cap: { skill: 0.03 }, hl: -1 } })),
  E('sar_tri_m_fire', [10, 60], [T('SAR_TRIBE', 'member')], 40, 2, (s) => ({ t: '모닥불 앞에서 어른들이 결정을 내렸습니다. 어린 사람도 말할 수 있었고, 말한 것은 기억되었습니다.', k: 'warm', fx: { cap: { ties: 0.03 }, standing: 2 } })),
  E('sar_tri_m_fever', [10, 60], [T('SAR_TRIBE', 'member')], 35, 3, (s) => ({ t: '정글 열병이 돌았습니다. 사흘을 앓았습니다. 옆 움막의 아이는 사흘째 아침에 일어나지 않았습니다.', k: 'bad', fx: { hl: -6, h: -3 } })),
  E('sar_tri_m_durin', [10, 60], [T('SAR_TRIBE', 'member')], 30, 4, (s) => ({ t: '키 작은 손님들이 발전기를 들고 왔습니다. 마을에 밤이 늦게 왔고, 술맛을 두고 싸움이 났습니다. 싸움은 이틀 갔습니다.', k: 'note', fx: { h: 2 } })),
  E('sar_tri_r_guard', [14, 70], [T('SAR_TRIBE', 'role')], 45, 2, (s) => ({ t: '경비 순번이 돌아왔습니다. 밤새 정글 소리를 들었고, 사람 소리는 없었습니다.', k: 'ev', fx: { standing: 2, cap: { skill: 0.03 } } })),
  E('sar_tri_r_heal', [14, 70], [T('SAR_TRIBE', 'role')], 35, 3, (s) => ({ t: '주술사가 다친 사냥꾼의 다리를 묶었습니다. 아츠를 쓰지 않았고, 손만 썼습니다. 그 손을 보고 배웠습니다.', k: 'note', fx: { cap: { learn: 0.03 } } })),
  E('sar_tri_r_engine', [14, 70], [T('SAR_TRIBE', 'role')], 30, 3, (s) => ({ t: '부족의 엔지니어가 물레방아를 고쳤습니다. 나무와 쇠를 반반 썼습니다. 다음 해 쇠가 더 많아졌습니다.', k: 'ev', fx: { cap: { skill: 0.04 } } })),
  E('sar_tri_r_flint', [14, 70], [T('SAR_TRIBE', 'role')], 30, 3, (s) => ({ t: '이웃 부족이 경계 나무를 옮겨 심었습니다. 밤에 다시 옮겨 심었습니다. 그 일을 세 해 반복했습니다.', k: 'bad', fx: { h: -2, standing: 2, f: F('부족 경계 분쟁 기록, ' + s.year + '년') } })),
  E('sar_tri_c_council', [22, 80], [T('SAR_TRIBE', 'chief')], 45, 2, (s) => ({ t: '족장으로서 다섯 부족의 모임에 나갔습니다. 다른 족장 넷이 말을 하는 동안 숯불만 보았습니다. 마지막에 한마디 했고, 그것이 결정이 되었습니다.', k: 'big', fx: { standing: 4, cap: { ties: 0.04 }, f: F('다섯 부족 모임 기록, ' + s.year + '년') } })),
  E('sar_tri_c_inam', [22, 80], [T('SAR_TRIBE', 'chief')], 35, 3, (s) => ({ t: '상회 사람들이 철광 값을 가져왔습니다. 값은 궁정 쪽 숫자였고, 부족 쪽 숫자는 따로 있었습니다. 둘 사이에서 한 해를 흥정했습니다.', k: 'ev', fx: { money: medX(s, 0.4), standing: 2 } })),
  E('sar_tri_c_envoy', [22, 80], [T('SAR_TRIBE', 'chief')], 30, 4, (s) => ({ t: '궁정 사절이 세금 장부를 들고 정글 입구까지 왔습니다. 정글 안으로는 들어오지 않았습니다. 장부도 들어오지 않았습니다.', k: 'note', fx: { h: 2 } })),
  E('sar_tri_c_prep', [22, 80], [T('SAR_TRIBE', 'chief')], 30, 3, (s) => ({ t: '마비소티아가 다가왔습니다. 젊은 전사들이 족장의 이름을 걸고 몸을 만들었습니다. 족장의 몸도 만들어야 했습니다.', k: 'ev', fx: { cap: { skill: 0.04 }, hl: 2 } })),
  E('sar_tri_g_title', [30, 90], [T('SAR_TRIBE', 'grand')], 45, 2, (s) => ({ t: '대족장의 자리에서 분쟁을 들었습니다. 두 부족이 같은 강을 자기 것이라 했습니다. 강은 둘 다의 것이라고 했고, 둘 다 불만이었고, 그것으로 끝났습니다.', k: 'ev', fx: { standing: 3 } })),
  E('sar_tri_g_cliff', [30, 90], [T('SAR_TRIBE', 'grand')], 30, 4, (s) => ({ t: '술을 마시고 절벽 길을 걸었습니다. 아내가 뒤따라오며 소리쳤습니다. 그날은 떨어지지 않았습니다.', k: 'note', fx: { h: 2, hl: -2 } })),
  E('sar_tri_g_infected', [30, 90], [T('SAR_TRIBE', 'grand')], 30, 4, (s) => ({ t: '감염된 사냥꾼이 부족 모임에 그대로 앉아 있었습니다. 아무도 자리를 옮기지 않았습니다. 바깥에서 온 상인만 놀랐습니다.', k: 'warm', fx: { h: 2 } })),
  E('sar_tri_g_outside', [30, 90], [T('SAR_TRIBE', 'grand')], 30, 5, (s) => ({ t: '바깥 나라에서 대족장을 만나러 왔습니다. 종이를 내밀었고, 종이에는 도장을 찍는 칸이 있었습니다. 도장이 없다고 했습니다.', k: 'note', fx: { standing: 2 } })),
  E('sar_tri_eunectes_aff', [14, 80], ['aff:SAR_TRI_EUNECTES', T('SAR_TRIBE')], 35, 3, (s) => ({ t: '철광이 있는 부족이라 쇠를 다루는 일이 많았습니다. 다른 부족이 쇠를 빌리러 왔고, 빌린 쇠는 돌아오지 않는 것이 보통이었습니다.', k: 'ev', fx: { money: medX(s, 0.15), cap: { skill: 0.03 } } })),
  E('sar_tri_gavial_aff', [14, 80], ['aff:SAR_TRI_GAVIAL', T('SAR_TRIBE')], 35, 3, (s) => ({ t: '부족의 이름은 떠난 전사의 이름이었습니다. 그 이름을 부를 때마다 어른들은 잠깐 말을 멈췄습니다.', k: 'note', fx: { h: 1 } })),
  E('sar_tri_shift', [10, 90], [T('SAR_TRIBE')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'role' ? '역할을 받았습니다. ' + s.rng.pick(['전사', '경비병', '주술사 견습', '엔지니어 조수']) + '였습니다. 그날부터 모닥불 자리가 바뀌었습니다.' : id === 'chief' ? '족장이 되었습니다. 어른들이 먼저 앉으라고 했습니다.' : '마비소티아에서 마지막까지 서 있었습니다. 대족장이 되었습니다.', k: 'big', fx: { h: 4, standing: 3 } }; }, { c: stNew }),
  E('sar_tri_after', [10, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'exile' ? '부족에서 쫓겨난 뒤의 일입니다. 정글 가장자리까지 걸었고, 뒤를 돌아보지 않는 것이 규칙이었습니다.' : '부족을 떠난 뒤의 일입니다. 정글 소리가 없는 밤에 잠을 설쳤습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'SAR_TRIBE') }),
];

// ── 핵심 5. SAR_TRADE 오아시스 상단 (A11 순회형: peddler → member → master → magnate → padishah) ──
const trade = [
  E('sar_tra_p_stall', [14, 50], [T('SAR_TRADE', 'peddler')], 45, 2, (s) => ({ t: '바자르 구석에 좌판을 폈습니다. 하루 종일 ' + eul(cul(s).drink) + ' 팔았고, 저녁에 판 수를 세니 열일곱 잔이었습니다.', k: 'ev', fx: { money: medX(s, 0.05), cap: { ties: 0.02 } }, f: F('오아시스 장날 좌판세 영수, ' + s.year + '년') })),
  E('sar_tra_p_sand', [14, 50], [T('SAR_TRADE', 'peddler')], 40, 2, (s) => ({ t: '모래바람에 길을 잃었습니다. 짐승이 먼저 오아시스 냄새를 맡았습니다. 짐승 덕에 살았습니다.', k: 'bad', fx: { hl: -3, h: -1 } })),
  E('sar_tra_p_fair', [14, 50], [T('SAR_TRADE', 'peddler')], 35, 2, (s) => ({ t: fest(s, 1) + '에 짐을 다 팔았습니다. 빈 자루를 메고 돌아오는 길이 가장 가벼운 길이었습니다.', k: 'warm', fx: { money: medX(s, 0.15), h: 2 } })),
  E('sar_tra_p_tax', [14, 50], [T('SAR_TRADE', 'peddler')], 30, 3, (s) => ({ t: '아미르령 경계에서 통행세를 냈습니다. 다음 아미르령에서 또 냈습니다. 세 번째 경계에서는 물건보다 세금이 많아졌습니다.', k: 'bad', fx: { money: -medX(s, 0.08) } })),
  E('sar_tra_m_escort', [17, 60], [T('SAR_TRADE', 'member')], 45, 2, (s) => ({ t: '상단 호위대와 함께 사막을 건넜습니다. 호위대는 용병이었고, 용병의 눈이 상단 짐을 보는 방식이 마음에 걸렸습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  E('sar_tra_m_columbia', [17, 60], [T('SAR_TRADE', 'member')], 35, 3, (s) => ({ t: '컬럼비아 상인이 서류를 내밀었습니다. 도장 칸이 일곱 개였습니다. 상단주는 셋만 찍었습니다.', k: 'ev', fx: { cap: { learn: 0.03 }, money: medX(s, 0.1), f: F('컬럼비아 상단 계약서 사본, ' + s.year + '년') } })),
  E('sar_tra_m_water', [17, 60], [T('SAR_TRADE', 'member')], 35, 3, (s) => ({ t: '오아시스 물값이 올랐습니다. 물을 파는 부족과 상단이 한나절 흥정했고, 저녁에 반값에 합의했습니다. 아침 값의 반이었습니다.', k: 'note', fx: { money: -medX(s, 0.05), f: F('오아시스 물값 협정, ' + s.year + '년') } })),
  E('sar_tra_m_black', [17, 60], [T('SAR_TRADE', 'member')], 30, 4, (s) => ({ t: '암시장 사람이 밤에 찾아왔습니다. 상단 짐 중 하나를 다른 값에 사겠다고 했습니다. 상단주에게 말했고, 상단주는 그 사람을 이미 알고 있었습니다.', k: 'note', fx: { h: -1 } })),
  E('sar_tra_s_contract', [23, 70], [T('SAR_TRADE', 'master')], 45, 2, (s) => ({ t: '상단주로서 첫 큰 계약을 맺었습니다. 미노스행 향신료였습니다. 짐이 떠나는 날 밤에 잠을 자지 못했습니다.', k: 'big', fx: { money: medX(s, 0.6), standing: 3 } })),
  E('sar_tra_s_raid', [23, 70], [T('SAR_TRADE', 'master')], 35, 3, (s) => ({ t: '수송대가 습격을 당했습니다. 짐의 삼분의 일을 잃었고, 사람은 잃지 않았습니다. 사람이 먼저라고 호위대장에게 말해 둔 덕이었습니다.', k: 'bad', fx: { money: -medX(s, 0.5), h: -3 }, f: F('오아시스 상단 손실 장부, ' + s.year + '년') })),
  E('sar_tra_s_pecon', [23, 70], [T('SAR_TRADE', 'master')], 30, 4, (s) => ({ t: '페콘의 전달자 선거에 돈을 냈습니다. 어느 쪽에도 내지 않는 상단은 없었습니다.', k: 'note', fx: { money: -medX(s, 0.3), cap: { ties: 0.05 } } })),
  E('sar_tra_s_amir', [23, 70], [T('SAR_TRADE', 'master')], 30, 3, (s) => ({ t: '아미르가 상단을 불렀습니다. 통행세를 면해 주겠다고 했고, 대신 아미르의 짐을 실어 달라고 했습니다. 짐이 무엇인지는 묻지 않았습니다.', k: 'ev', fx: { money: medX(s, 0.4), h: -1 } })),
  E('sar_tra_g_audience', [31, 85], [T('SAR_TRADE', 'magnate')], 45, 3, (s) => ({ t: '거상으로 파디샤를 알현했습니다. 파디샤는 상단의 짐승 수를 물었고, 사람 수는 묻지 않았습니다.', k: 'big', fx: { standing: 5 } })),
  E('sar_tra_g_assassin', [31, 85], [T('SAR_TRADE', 'magnate')], 30, 4, (s) => ({ t: '밤에 담을 넘은 사람이 있었습니다. 호위가 먼저 보았습니다. 다음 날 경쟁 상단의 상단주가 안부를 물어 왔습니다.', k: 'bad', fx: { h: -4 } })),
  E('sar_tra_g_school', [31, 85], [T('SAR_TRADE', 'magnate')], 30, 4, (s) => ({ t: '고향 오아시스에 학교를 세웠습니다. 교사 둘, 학생 서른. 첫해에 글을 깨친 아이가 열하나였습니다.', k: 'warm', fx: { money: -medX(s, 1.5), h: 5, standing: 3 }, f: F('오아시스 학교 설립 기록, ' + s.year + '년') })),
  E('sar_tra_g_caravan', [31, 85], [T('SAR_TRADE', 'magnate')], 35, 2, (s) => ({ t: '상단이 셋이 되었습니다. 사막 길 하나에 상단 하나씩이었습니다. 이름은 다 제 이름이었고, 얼굴은 모두 달랐습니다.', k: 'ev', fx: { money: medX(s, 1), cap: { ties: 0.04 }, f: F('상단 등록 대장, ' + s.year + '년') } })),
  E('sar_tra_pd_crown', [40, 120], [T('SAR_TRADE', 'padishah')], 45, 3, (s) => ({ t: '파디샤로 책봉되었습니다. 샤의 이름으로 된 문서였습니다. 그 문서를 읽는 데 상단 서기 셋이 붙었습니다.', k: 'big', fx: { standing: 6, h: 3, f: orgF(s, '책봉 문서', s.year) } })),
  E('sar_tra_pd_court', [40, 120], [T('SAR_TRADE', 'padishah')], 35, 3, (s) => ({ t: '궁정에 한 해의 절반을 머물렀습니다. 상단 일은 서신으로 했고, 서신은 한 달 걸렸습니다.', k: 'note', fx: { h: -2 } })),
  E('sar_tra_pd_tax', [40, 120], [T('SAR_TRADE', 'padishah')], 35, 3, (s) => ({ t: '이제 통행세를 받는 쪽이 되었습니다. 받는 쪽의 장부가 내는 쪽의 장부보다 두꺼웠습니다.', k: 'ev', fx: { money: medX(s, 2) } })),
  E('sar_tra_pd_tribute', [40, 120], [T('SAR_TRADE', 'padishah')], 30, 5, (s) => ({ t: '올해 자예단 공물 명단을 샤에게 올렸습니다. 명단의 이름 하나는 상단에서 자란 아이였습니다. 아이가 자원했고, 말리지 않았습니다.', k: 'loss', fx: { h: -3, standing: 2 } })),
  E('sar_tra_black_aff', [14, 80], ['aff:SAR_TRA_BLACK', T('SAR_TRADE')], 40, 3, (s) => ({ t: '암시장 물건은 낮에 팔지 않았습니다. 밤에 팔았고, 값은 낮의 세 배였고, 장부는 없었습니다.', k: 'note', fx: { money: medX(s, 0.3), h: -1 } })),
  E('sar_tra_columbia_aff', [14, 80], ['aff:SAR_TRA_COLUMBIA', T('SAR_TRADE')], 35, 3, (s) => ({ t: '컬럼비아 상단의 현지 고용이라 급여는 달러로 받았습니다. 승진은 본사 사람 몫이라는 말을 둘째 해에 들었습니다.', k: 'note', fx: { money: medX(s, 0.1), h: -1 } })),
  E('sar_tra_visit_columbia', [14, 90], [T('SAR_TRADE'), 'visit:columbia'], 40, 2, (s) => ({ t: '컬럼비아에 머무는 동안 모든 값이 적혀 있었습니다. 흥정이 없는 바자르는 처음이었습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),
  E('sar_tra_visit_minos', [14, 90], [T('SAR_TRADE'), 'visit:minos'], 40, 2, (s) => ({ t: '미노스의 항구에서 향신료를 내렸습니다. 사르곤 사람에게는 값을 두 번 물었습니다. 두 번째가 더 비쌌습니다.', k: 'bad', fx: { money: -medX(s, 0.05) } })),
  E('sar_tra_visit_yan', [14, 90], [T('SAR_TRADE'), 'visit:yan'], 40, 2, (s) => ({ t: '염국 관문에서 짐을 사흘 묶였습니다. 서류가 하나 모자랐습니다. 그 서류는 돈으로 살 수 있었습니다.', k: 'note', fx: { money: -medX(s, 0.08) } })),
  E('sar_tra_shift', [14, 120], [T('SAR_TRADE')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'member' ? '상단에 들어갔습니다. 좌판 대신 짐승 한 마리를 맡았습니다.' : id === 'master' ? '상단주가 되었습니다. 이름이 상단 깃발에 올라갔습니다.' : id === 'magnate' ? '거상이라고 불리기 시작했습니다. 부르는 사람이 먼저 허리를 굽혔습니다.' : '파디샤의 관을 받았습니다. 상인이 아니라 영주가 되었습니다.', k: 'big', fx: { h: 4 } }; }, { c: stNew }),
  E('sar_tra_after', [14, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'bankrupt' ? '상단이 망한 뒤의 일입니다. 짐승을 팔았고, 깃발은 팔리지 않았습니다.' : '상단을 떠난 뒤의 일입니다. 사막 길을 걷지 않는 발이 자꾸 길을 찾았습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'SAR_TRADE') }),
];

// ── 나머지. SAR_ARMY 상비군·사병 (A4: militia → retainer → standing → officer) ──
const army = [
  E('sar_arm_mil_wall', [15, 50], [T('SAR_ARMY', 'militia')], 45, 2, (s) => ({ t: '마을 담 위에서 밤을 지켰습니다. 창은 할아버지 것이었고, 할아버지도 같은 담 위에 섰었다고 했습니다.', k: 'ev', fx: { cap: { skill: 0.03 } } })),
  E('sar_arm_mil_raid', [15, 50], [T('SAR_ARMY', 'militia')], 35, 3, (s) => ({ t: '이웃 아미르령 사람들이 가축을 끌고 갔습니다. 쫓아갔고, 경계에서 멈췄습니다. 경계 너머는 다른 법이었습니다.', k: 'bad', fx: { h: -2, standing: 2 } })),
  E('sar_arm_ret_lord', [17, 60], [T('SAR_ARMY', 'retainer')], 45, 2, (s) => ({ t: '귀족의 사병으로 저택 문을 지켰습니다. 귀족의 손님이 누구인지 외웠고, 손님이 아닌 사람도 외웠습니다.', k: 'ev', fx: { standing: 2, cap: { ties: 0.02 } } })),
  E('sar_arm_ret_feud', [17, 60], [T('SAR_ARMY', 'retainer')], 35, 3, (s) => ({ t: '주인 귀족과 이웃 귀족이 다퉜습니다. 사병끼리 들판에서 만났고, 양쪽 다 몇 명이 돌아오지 않았습니다.', k: 'bad', fx: { hl: -4, standing: 3 } })),
  E('sar_arm_std_pay', [22, 60], [T('SAR_ARMY', 'standing')], 45, 2, (s) => ({ t: '궁정에서 급여가 나왔습니다. 통일된 장비, 통일된 날짜. 처음으로 다음 달을 셀 수 있었습니다.', k: 'warm', fx: { h: 2, money: medX(s, 0.1) }, f: orgF(s, '상비군 급여 대장', s.year) })),
  E('sar_arm_std_city', [22, 60], [T('SAR_ARMY', 'standing')], 35, 3, (s) => ({ t: '도시 방어 훈련이 보름이었습니다. 성문을 닫고 여는 것을 백 번 했습니다. 백 번째에도 삐걱였습니다.', k: 'ev', fx: { cap: { skill: 0.04 }, hl: -1, f: orgF(s, '도시 방어 훈련 일지', s.year) } })),
  E('sar_arm_off_map', [27, 65], [T('SAR_ARMY', 'officer')], 45, 2, (s) => ({ t: '장교로서 지도 앞에 섰습니다. 지도의 선 하나가 부하 서른이었습니다. 선을 옮겼습니다.', k: 'ev', fx: { standing: 3, h: -1, f: orgF(s, '부대 편성표', s.year) } })),
  E('sar_arm_off_purge', [27, 65], [T('SAR_ARMY', 'officer')], 30, 4, (s) => ({ t: '옆 부대 장교가 아미르의 명으로 끌려갔습니다. 죄목은 듣지 못했습니다. 그날 밤 부하들이 저를 보는 눈이 달랐습니다.', k: 'bad', fx: { h: -4 } })),
  E('sar_arm_shah_aff', [15, 65], ['aff:SAR_ARM_SHAH', T('SAR_ARMY')], 35, 3, (s) => ({ t: '샤 상비군의 갑옷은 하나뿐이라 누구 것인지 알 수 없었습니다. 그것이 뜻이라고 교관이 말했습니다.', k: 'note', fx: { standing: 2 } })),
  E('sar_arm_amir_aff', [15, 65], ['aff:SAR_ARM_AMIR', T('SAR_ARMY')], 35, 3, (s) => ({ t: '아미르의 사병이라 아미르의 적이 곧 제 적이었습니다. 아미르의 적은 자주 바뀌었습니다.', k: 'bad', fx: { h: -2 } })),
  E('sar_arm_war', [15, 65], [T('SAR_ARMY'), 'war'], 60, 1, (s) => ({ t: '전쟁이었습니다. 아미르령 경계가 매달 옮겨졌고, 어디까지 지켜야 하는지는 아무도 말해 주지 않았습니다.', k: 'bad', fx: { hl: -5, h: -3, standing: 3 } }), { rep: true }),
  E('sar_arm_shift', [15, 70], [T('SAR_ARMY')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'retainer' ? '귀족이 사병으로 받았습니다. 마을 담에서 저택 담으로 옮겼습니다.' : id === 'standing' ? '상비군에 들었습니다. 급여가 궁정에서 나오기 시작했습니다.' : '장교가 되었습니다. 평민 출신 장교는 부대에 둘뿐이었습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('sar_arm_after', [15, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'desert' ? '부대를 떠난 뒤의 일입니다. 사르곤 안에서는 이름을 쓸 수 없었습니다.' : '군을 떠난 뒤의 일입니다. 아침에 종이 울리지 않아도 깼습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'SAR_ARMY') }),
];

// ── SAR_FARM 농민 (A11: family → own → notable → clan) + 생업 계절 이벤트 ──
const farm = [
  E('sar_far_f_dates', [12, 50], [T('SAR_FARM', 'family')], 45, 2, (s) => ({ t: '대추야자 수확에 온 가족이 나무에 올랐습니다. 떨어진 것은 아이들 몫이었습니다.', k: 'warm', fx: { h: 2, hl: -1 } })),
  E('sar_far_f_well', [12, 50], [T('SAR_FARM', 'family')], 35, 3, (s) => ({ t: '우물이 낮아졌습니다. 아버지가 밤에 물을 길었고, 낮에는 길지 않았습니다. 이웃이 보기 때문이었습니다.', k: 'note', fx: { hl: -1 } })),
  E('sar_far_o_lease', [16, 60], [T('SAR_FARM', 'own')], 45, 2, (s) => ({ t: '소작 계약을 새로 썼습니다. 수확의 셋 중 하나가 지주 몫이었습니다. 지난해는 넷 중 하나였습니다.', k: 'bad', fx: { money: -medX(s, 0.08) }, f: F('아미르령 소작 계약 사본, ' + s.year + '년') })),
  E('sar_far_o_collector', [16, 60], [T('SAR_FARM', 'own')], 40, 2, (s) => ({ t: '세리가 왔습니다. 장부와 창고를 번갈아 보았고, 장부보다 창고를 믿었습니다.', k: 'bad', fx: { money: -medX(s, 0.1), h: -1 } })),
  E('sar_far_n_dispute', [24, 70], [T('SAR_FARM', 'notable')], 45, 2, (s) => ({ t: '마을 물꼬 다툼을 맡았습니다. 양쪽 집 모두 저녁상에 불렀습니다. 상을 두 번 받았고, 결정은 한 번 했습니다.', k: 'ev', fx: { standing: 3, cap: { ties: 0.03 } } })),
  E('sar_far_n_school', [24, 70], [T('SAR_FARM', 'notable')], 35, 3, (s) => ({ t: '마을 아이들 몇을 공립학교에 보내는 돈을 모았습니다. 교육이 유일한 길이라고 모두 믿었고, 돈은 모자랐습니다.', k: 'warm', fx: { money: -medX(s, 0.2), h: 2 } })),
  E('sar_far_c_sheikh', [32, 90], [T('SAR_FARM', 'clan')], 45, 2, (s) => ({ t: eul(cul(s).elder) + ' 보좌해 씨족 회의에 앉았습니다. 말할 차례는 마지막이었고, 마지막 말이 가장 오래 남았습니다.', k: 'ev', fx: { standing: 3 } })),
  E('sar_far_c_amir', [32, 90], [T('SAR_FARM', 'clan')], 30, 4, (s) => ({ t: '아미르의 사람이 씨족의 징집 수를 들고 왔습니다. 숫자를 깎았습니다. 셋을 깎는 데 ' + cul(s).drink + ' 다섯 잔이 들었습니다.', k: 'note', fx: { standing: 2, cap: { ties: 0.03 }, f: F('씨족 징집 할당표, ' + s.year + '년') } })),
  E('sar_far_amir_aff', [12, 90], ['aff:SAR_FAR_AMIR', T('SAR_FARM')], 35, 3, (s) => ({ t: '아미르령이라 세금이 아미르 기분에 따라 달랐습니다. 올해 기분은 나빴습니다.', k: 'bad', fx: { money: -medX(s, 0.12) } })),
  E('sar_far_oasis_aff', [12, 90], ['aff:SAR_FAR_OASIS', T('SAR_FARM')], 35, 3, (s) => ({ t: '오아시스 부족에는 세금이라는 말이 없었습니다. 궁정 사람이 와서 그 말을 가르쳤습니다. 다음 해에 군인이 왔습니다.', k: 'bad', fx: { h: -3 } })),
  // 생업 계절·명절·동네
  E('sar_liv_sandstorm', [5, 90], [T('SAR_FARM')], 40, 2, (s) => ({ t: '모래바람이 이틀 불었습니다. 문틈을 천으로 막고 이틀을 앉아 있었습니다. 지붕의 모래를 치우는 데 사흘이 들었습니다.', k: 'bad', fx: { hl: -2, f: F('오아시스 기상 기록, ' + s.year + '년') } })),
  E('sar_liv_bazaar', [5, 90], [T('SAR_FARM')], 40, 2, (s) => ({ t: '바자르에 나갔습니다. 향신료 냄새와 외치는 소리. ' + eul(cul(s).food) + ' 사 먹었습니다. 값을 세 번 깎았습니다.', k: 'warm', fx: { h: 2, money: -medX(s, 0.02) } })),
  E('sar_liv_fair', [5, 90], [T('SAR_FARM')], 35, 2, (s) => ({ t: fest(s, 1) + '이었습니다. 이웃 오아시스 사람들까지 왔고, ' + cul(s).greet + '. 인사가 하루 백 번이었습니다.', k: 'warm', fx: { h: 3, cap: { ties: 0.02 } } })),
  E('sar_liv_mahuiz', [5, 90], [T('SAR_FARM')], 25, 3, (s) => ({ t: '정글 쪽에서 ' + iga(fest(s, 0)) + ' 열린다는 소문이 왔습니다. 마을 젊은이 둘이 구경 갔다가 한 명만 멀쩡히 돌아왔습니다.', k: 'note', fx: { h: 1 } })),
  E('sar_liv_jungle_rain', [5, 90], [T('SAR_FARM')], 35, 2, (s) => ({ t: '우기였습니다. 정글 길이 끊겼고, 열병이 돌았습니다. 집집마다 문 앞에 연기를 피웠습니다.', k: 'bad', fx: { hl: -3 } }), { c: jungle }),
  E('sar_liv_jungle_fever', [5, 90], ['sargon'], 30, 3, (s) => ({ t: '정글 풍토병이 집에 들어왔습니다. 두 주를 앓았고, 어머니가 밤마다 잎을 달였습니다.', k: 'bad', fx: { hl: -5, h: -2 } }), { c: (s) => jungle(s) && (trk(s, 'SAR_FARM') || trk(s, 'SAR_TRIBE')) }),
  E('sar_liv_checkpoint', [5, 90], [T('SAR_FARM')], 30, 3, (s) => ({ t: '아미르끼리 다투는 해였습니다. 마을 길목에 검문소가 생겼고, 장에 가는 데 하루가 더 들었습니다.', k: 'bad', fx: { money: -medX(s, 0.03), h: -1 } })),
  E('sar_liv_wedding', [5, 90], [T('SAR_FARM')], 25, 4, (s) => ({ t: '이웃집 혼례였습니다. 지참금 이야기가 음식보다 많았습니다. 신랑 집이 낙타 두 마리 값을 냈다고 했습니다.', k: 'warm', fx: { h: 2 } })),
  E('sar_far_shift', [12, 95], [T('SAR_FARM')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'own' ? '제 이름으로 땅을 부치기 시작했습니다. 소작이었지만 장부에 제 이름이 있었습니다.' : id === 'notable' ? '마을에서 어른 대접을 받기 시작했습니다. 물꼬 다툼이 제 집 앞으로 왔습니다.' : '씨족장 곁에 앉게 되었습니다. ' + cul(s).elder + '의 오른쪽이었습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('sar_far_after', [12, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'ruin' ? '땅을 잃은 뒤의 일입니다. 남의 땅에서 품을 팔았고, 품값은 수확의 열에 하나였습니다.' : '농사를 접은 뒤의 일입니다. 손에서 흙 냄새가 사라지는 데 한 해가 걸렸습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'SAR_FARM') }),
];

// ── SAR_MINE 광부(롱스프링형) (A5: miner → diagnosed(forced) → quarantine(forced) → clinic) ──
const mine = [
  E('sar_min_m_shaft', [14, 60], [T('SAR_MINE', 'miner')], 45, 2, (s) => ({ t: '채석장 아래로 내려갔습니다. 위에서 종을 치면 올라왔습니다. 종이 늦은 날은 밤이 되어 있었습니다.', k: 'bad', fx: { hl: -2 } })),
  E('sar_min_m_dust', [14, 60], [T('SAR_MINE', 'miner')], 40, 2, (s) => ({ t: '가루가 옷에 배었습니다. 집에 오면 마당에서 옷을 털었고, 아이들은 그동안 안에 있으라고 했습니다.', k: 'note', fx: { hl: -2, h: -1 } })),
  E('sar_min_m_known', [14, 60], [T('SAR_MINE', 'miner'), 'known'], 300, 1, (s) => { s.promote({ force: true, quiet: true }); return { t: '판정이 나왔습니다. 작업반장이 종이를 건넸고, 종이에는 격리라는 말이 있었습니다.', k: 'loss', fx: { h: -5 } }; }),
  E('sar_min_d_paper', [14, 70], [T('SAR_MINE', 'diagnosed')], 50, 1, (s) => ({ t: '판정서를 들고 집에 갔습니다. 가족이 읽었고, 아무도 울지 않았습니다. 그날은.', k: 'loss', fx: { h: -4 } })),
  E('sar_min_d_wait', [14, 70], [T('SAR_MINE', 'diagnosed')], 45, 1, (s) => ({ t: '격리 구역으로 가는 날짜를 기다렸습니다. 기다리는 동안 집안 물건을 하나씩 사람들에게 나눠 주었습니다.', k: 'note', fx: { h: -2 } })),
  E('sar_min_q_village', [15, 80], [T('SAR_MINE', 'quarantine')], 80, 1, (s) => ({ t: '격리 구역 안에도 마을이 있었습니다. 우물이 있었고, 빵집이 있었고, 담이 있었습니다. 담은 바깥에서 세운 것이었습니다.', k: 'note', fx: { h: 1 } })),
  E('sar_min_q_lord', [15, 80], [T('SAR_MINE', 'quarantine')], 35, 3, (s) => ({ t: '영주가 격리 구역에 약을 보냈습니다. 약은 모자랐고, 보낸 것 자체가 다른 아미르령에서는 없는 일이었습니다.', k: 'warm', fx: { hl: 2, h: 2 } })),
  E('sar_min_c_clinic', [16, 90], [T('SAR_MINE', 'clinic')], 90, 1, (s) => ({ t: '진료소에서 일했습니다. 붕대를 삶고, 바닥을 닦았습니다. 감염된 의사가 감염된 환자를 보았습니다.', k: 'ev', fx: { cap: { learn: 0.03 }, h: 1 } })),
  E('sar_min_c_mercs', [16, 90], [T('SAR_MINE', 'clinic')], 70, 2, (s) => ({ t: '경비병 옷을 입은 용병들이 왔습니다. 약과 사람을 몇 데려갔습니다. 어디로 가는지 묻는 사람에게 대답하지 않았습니다.', k: 'bad', fx: { h: -5 } })),
  E('sar_min_longspring_aff', [14, 90], ['aff:SAR_MIN_LONGSPRING', T('SAR_MINE')], 35, 3, (s) => ({ t: '사막 채석장이라 물이 먼저였습니다. 물 당번이 광부 당번보다 중요했습니다.', k: 'note', fx: { hl: -1 } })),
  E('sar_min_acahualla_aff', [14, 90], ['aff:SAR_MIN_ACAHUALLA', T('SAR_MINE')], 35, 3, (s) => ({ t: '정글 철광이라 가루보다 열병이 먼저였습니다. 감염된 사람도 같은 갱에서 일했고, 아무도 자리를 바꾸지 않았습니다.', k: 'note', fx: { h: 1 } })),
  E('sar_min_shift', [14, 90], [T('SAR_MINE')], 400, 2, (s) => { const id = stageId(s); if (id === 'diagnosed' && !s.S.ori.on) s.infect('work'); return { t: id === 'diagnosed' ? '감염 판정을 받았습니다. 채석장 명부에서 격리 명부로 이름이 옮겨졌습니다.' : id === 'quarantine' ? '격리 구역으로 들어갔습니다. 문은 하나였고, 안쪽에서는 열리지 않았습니다.' : '진료소 일을 맡게 되었습니다. 격리 구역 안에서 할 수 있는 몇 안 되는 일이었습니다.', k: 'loss', fx: { h: -2 } }; }, { c: stNew }),
  E('sar_min_after', [14, 95], [], 500, 1, (s) => ({ t: '채석장을 떠난 뒤의 일입니다. 기침은 따라왔습니다.', k: 'loss', fx: { hl: -2 } }), { c: (s) => fell(s, 'SAR_MINE') }),
];

// ── SAR_TEACHER 공립학교 교사 (A3: student → teacher → principal → advisor) ──
const teacher = [
  E('sar_tea_s_foreign', [18, 30], [T('SAR_TEACHER', 'student')], 45, 2, (s) => ({ t: '외국 교과서로 배웠습니다. 지도에 사르곤이 작게 있었습니다. 그 지도를 외웠습니다.', k: 'ev', fx: { cap: { learn: 0.04 } } })),
  E('sar_tea_s_fee', [18, 30], [T('SAR_TEACHER', 'student')], 35, 3, (s) => ({ t: '학비가 밀렸습니다. 집에서 대추야자 두 자루를 보냈고, 학교는 자루를 받았습니다.', k: 'bad', fx: { money: -medX(s, 0.1), h: -1 } })),
  E('sar_tea_t_class', [22, 60], [T('SAR_TEACHER', 'teacher')], 45, 2, (s) => ({ t: '교실에 아이 마흔이었습니다. 책상은 스물. 둘씩 앉았고, 글을 쓸 때는 번갈아 썼습니다.', k: 'ev', fx: { cap: { ties: 0.02 }, h: 1 }, f: orgF(s, '공립학교 학적 집계', s.year) })),
  E('sar_tea_t_parent', [22, 60], [T('SAR_TEACHER', 'teacher')], 35, 3, (s) => ({ t: '학부모가 찾아왔습니다. 아이가 글을 배워 무엇이 되느냐고 물었습니다. 평민 아니면 귀족이라고 대답하지 못했습니다.', k: 'note', fx: { h: -1 } })),
  E('sar_tea_p_close', [30, 65], [T('SAR_TEACHER', 'principal')], 45, 2, (s) => ({ t: '교장으로서 아미르의 서신을 받았습니다. 학교 예산이 절반이 되었습니다. 교사 하나를 내보냈고, 그 교사가 저를 보던 눈을 기억합니다.', k: 'bad', fx: { h: -3, standing: 2, f: orgF(s, '공립학교 예산 통지', s.year) } })),
  E('sar_tea_p_exam', [30, 65], [T('SAR_TEACHER', 'principal')], 35, 3, (s) => ({ t: '졸업생 하나가 제국 시험에 붙었습니다. 학교 벽에 이름을 적었습니다. 벽에는 그 이름 하나였습니다.', k: 'warm', fx: { h: 4, standing: 3 } })),
  E('sar_tea_a_advise', [38, 80], [T('SAR_TEACHER', 'advisor')], 45, 2, (s) => ({ t: '파디샤의 교육 고문으로 궁정에 들었습니다. 학교를 셋 더 세우자고 했고, 하나가 세워졌습니다.', k: 'big', fx: { standing: 3, f: orgF(s, '교육 고문 건의서', s.year) } })),
  E('sar_tea_a_textbook', [38, 80], [T('SAR_TEACHER', 'advisor')], 35, 3, (s) => ({ t: '교과서를 새로 썼습니다. 지도에 사르곤을 크게 넣었습니다. 외국 교과를 들여온 아미르가 못마땅해했습니다.', k: 'note', fx: { cap: { learn: 0.03 }, h: 1 } })),
  E('sar_tea_private_aff', [18, 80], ['aff:SAR_TEA_PRIVATE', T('SAR_TEACHER')], 35, 3, (s) => ({ t: '사립학교라 학생은 귀족 자제뿐이었습니다. 급여는 공립의 두 배였고, 말을 조심하는 일도 두 배였습니다.', k: 'note', fx: { money: medX(s, 0.1), h: -1 } })),
  E('sar_tea_shift', [18, 80], [T('SAR_TEACHER')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'teacher' ? '교사가 되었습니다. 첫 교실에 들어가기 전에 복도에서 한참 서 있었습니다.' : id === 'principal' ? '교장이 되었습니다. 열쇠 꾸러미가 무거웠습니다.' : '파디샤의 교육 고문으로 임명되었습니다. 학교 밖에서 학교를 보는 자리였습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('sar_tea_after', [18, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'scandal' ? '학교에서 나온 뒤의 일입니다. 소문이 먼저 마을에 닿아 있었습니다.' : '학교 문이 닫힌 뒤의 일입니다. 아이들이 길에서 선생님이라고 불렀고, 대답하기 어려웠습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'SAR_TEACHER') }),
];

// ── SAR_MESSENGER 왕실 전달자 (A3 순회형: apprentice → messenger → chief) ──
const messenger = [
  E('sar_msg_a_sky', [18, 35], [T('SAR_MESSENGER', 'apprentice')], 45, 2, (s) => ({ t: '하늘을 읽는 법을 배웠습니다. 선배 전달자는 구름을 보고 사흘 뒤를 말했고, 사흘 뒤에 맞았습니다.', k: 'ev', fx: { cap: { arts: 0.04 } } })),
  E('sar_msg_a_water', [18, 35], [T('SAR_MESSENGER', 'apprentice')], 35, 3, (s) => ({ t: '물을 나누는 법을 배웠습니다. 사막에서 물은 하루 세 모금이었고, 네 모금째를 마시면 돌아오지 못한다고 했습니다.', k: 'note', fx: { hl: -2 } })),
  E('sar_msg_m_run', [21, 60], [T('SAR_MESSENGER', 'messenger')], 45, 2, (s) => ({ t: '재앙 경보를 들고 오아시스 넷을 돌았습니다. 셋은 믿었고, 하나는 믿지 않았습니다. 믿지 않은 곳은 다음 해 지도에서 없어졌습니다.', k: 'bad', fx: { standing: 3, hl: -2, h: -2, f: orgF(s, '재앙 경보 전달 기록', s.year) } })),
  E('sar_msg_m_court', [21, 60], [T('SAR_MESSENGER', 'messenger')], 35, 3, (s) => ({ t: '궁정에 보고서를 올렸습니다. 서기가 받아 적었고, 받아 적는 동안 한 번도 고개를 들지 않았습니다.', k: 'note', fx: { standing: 2 } })),
  E('sar_msg_c_train', [29, 70], [T('SAR_MESSENGER', 'chief')], 45, 2, (s) => ({ t: '수석 전달자로 견습 셋을 받았습니다. 하나는 사막에서, 하나는 궁정에서 그만두었습니다. 하나가 남았습니다.', k: 'ev', fx: { standing: 3, cap: { ties: 0.03 }, f: orgF(s, '전달자 견습 명부', s.year) } })),
  E('sar_msg_c_election', [29, 70], [T('SAR_MESSENGER', 'chief')], 35, 4, (s) => ({ t: '페콘의 전달자 선거가 있었습니다. 상단들이 줄을 섰고, 저는 어느 줄에도 서지 않았습니다. 그래서 뽑혔다고 했습니다.', k: 'big', fx: { standing: 4 } })),
  E('sar_msg_pecon_aff', [18, 70], ['aff:SAR_MSG_PECON', T('SAR_MESSENGER')], 35, 3, (s) => ({ t: '페콘의 선거로 뽑힌 자리라 임기가 있었습니다. 임기 마지막 해에는 모두가 다음 사람을 보았습니다.', k: 'note', fx: { h: -1 } })),
  E('sar_msg_visit_minos', [18, 70], [T('SAR_MESSENGER'), 'visit:minos'], 40, 2, (s) => ({ t: '미노스 국경까지 경보를 전했습니다. 그쪽 전달자와 노트를 맞췄습니다. 글자는 달랐고 그림은 같았습니다.', k: 'note', fx: { cap: { arts: 0.02 } } })),
  E('sar_msg_visit_columbia', [18, 70], [T('SAR_MESSENGER'), 'visit:columbia'], 40, 2, (s) => ({ t: '컬럼비아 쪽 관측소에 들렀습니다. 기계가 하늘을 읽었습니다. 기계가 틀린 날 제가 맞았고, 그날 하루만 대접받았습니다.', k: 'note', fx: { h: 1 } })),
  E('sar_msg_shift', [18, 70], [T('SAR_MESSENGER')], 400, 2, (s) => ({ t: stageId(s) === 'messenger' ? '전달자가 되었습니다. 왕실 인장이 찍힌 통행증을 받았습니다.' : '수석 전달자가 되었습니다. 이제 하늘보다 사람을 더 많이 보았습니다.', k: 'big', fx: { h: 3 } }), { c: stNew }),
  E('sar_msg_after', [18, 95], [], 500, 1, (s) => ({ t: '전달자 통행증을 반납한 뒤의 일입니다. 하늘을 보는 버릇은 반납되지 않았습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'SAR_MESSENGER') }),
];

// ── SAR_MERC 사르곤 용병 (A6 순회형: tribal → low → member → lead) ──
const merc = [
  E('sar_mer_t_leave', [14, 35], [T('SAR_MERC', 'tribal')], 45, 2, (s) => ({ t: '부족 전사 여럿이 사르곤을 떠났습니다. 부족 안에는 싸울 일보다 먹을 일이 적었습니다.', k: 'note', fx: { h: -1, cap: { skill: 0.03 } } })),
  E('sar_mer_t_first', [14, 35], [T('SAR_MERC', 'tribal')], 35, 3, (s) => ({ t: '첫 계약이었습니다. 상단 호위 열흘. 열흘째 밤에 처음으로 무기를 썼습니다.', k: 'bad', fx: { money: medX(s, 0.2), h: -3 } })),
  E('sar_mer_l_pmc', [16, 45], [T('SAR_MERC', 'low')], 45, 2, (s) => ({ t: '외국 회사의 하급 용병으로 번호를 받았습니다. 번호는 세 자리였고, 두 자리 번호를 가진 사람들이 명령했습니다.', k: 'ev', fx: { standing: 2 } })),
  E('sar_mer_l_pay', [16, 45], [T('SAR_MERC', 'low')], 35, 3, (s) => ({ t: '급여가 두 달 늦었습니다. 셋째 달에 나왔고, 두 달 치는 빠져 있었습니다. 묻는 사람은 넷째 달에 없었습니다.', k: 'bad', fx: { money: -medX(s, 0.1), h: -2, f: F('용병 급여 지급 대장, ' + s.year + '년') } })),
  E('sar_mer_m_team', [20, 50], [T('SAR_MERC', 'member')], 45, 2, (s) => ({ t: '팀원이 되었습니다. 팀은 여섯이었고, 겨울에 다섯이 되었습니다. 봄에 새 사람이 왔고, 아무도 이름을 빨리 외우지 않았습니다.', k: 'note', fx: { cap: { ties: 0.03 }, h: -2, f: F('용병 팀 명부, ' + s.year + '년') } })),
  E('sar_mer_m_wyvern', [20, 50], [T('SAR_MERC', 'member')], 30, 4, (s) => ({ t: '와이번 연합 쪽 용병과 같은 계약에 묶였습니다. 그쪽은 공납으로 온 사람들이었고, 급여를 받는 것이 미안해졌습니다.', k: 'note', fx: { h: -1 } })),
  E('sar_mer_ld_contract', [26, 55], [T('SAR_MERC', 'lead')], 45, 2, (s) => ({ t: '팀장으로 계약서에 서명했습니다. 조항 하나가 유족 배상이었습니다. 그 조항은 줄이 그어져 있었고, 그대로 서명했습니다.', k: 'bad', fx: { money: medX(s, 0.6), h: -3, standing: 3 } })),
  E('sar_mer_ld_loss', [26, 55], [T('SAR_MERC', 'lead')], 35, 3, (s) => ({ t: '팀원 하나를 잃었습니다. 가족에게 편지를 썼습니다. 회사 양식이 있었고, 양식을 쓰지 않았습니다.', k: 'loss', fx: { h: -5 } })),
  E('sar_mer_amir_aff', [14, 60], ['aff:SAR_MER_AMIR', T('SAR_MERC')], 35, 3, (s) => ({ t: '경비병 제복을 입었지만 급여는 아미르의 금고에서 따로 나왔습니다. 제복은 위장이었고, 마을 사람들은 그것을 알았습니다.', k: 'bad', fx: { h: -2, money: medX(s, 0.1) } })),
  E('sar_mer_visit_bolivar', [14, 60], [T('SAR_MERC'), 'visit:bolivar'], 40, 2, (s) => ({ t: '볼리바르 전선에 파견되었습니다. 어느 정부 편인지 세 번 바뀌었습니다. 급여는 한 번도 바뀌지 않았습니다.', k: 'bad', fx: { hl: -3, money: medX(s, 0.15) } })),
  E('sar_mer_visit_columbia', [14, 60], [T('SAR_MERC'), 'visit:columbia'], 40, 2, (s) => ({ t: '컬럼비아 회사 경비로 서 있었습니다. 총을 쓸 일은 없었고, 서 있는 값만 받았습니다.', k: 'note', fx: { money: medX(s, 0.1) } })),
  E('sar_mer_war', [14, 60], [T('SAR_MERC'), 'war'], 60, 1, (s) => ({ t: '전시라 계약이 넘쳤습니다. 값은 올랐고, 돌아오는 사람 수는 내렸습니다.', k: 'bad', fx: { money: medX(s, 0.3), hl: -4 } }), { rep: true }),
  E('sar_mer_shift', [14, 60], [T('SAR_MERC')], 400, 2, (s) => { const id = stageId(s); return { t: id === 'low' ? '외국 회사와 계약했습니다. 부족의 무기를 반납하고 회사의 무기를 받았습니다.' : id === 'member' ? '정식 팀원이 되었습니다. 번호가 두 자리가 되었습니다.' : '팀장이 되었습니다. 계약서에 서명하는 손이 제 손이 되었습니다.', k: 'big', fx: { h: 3 } }; }, { c: stNew }),
  E('sar_mer_after', [14, 95], [], 500, 1, (s) => ({ t: s.S.flags.lastFall === 'contract_end' ? '계약이 끝난 뒤의 일입니다. 퇴직금은 없었고, 무기 반납 영수증은 있었습니다.' : '용병을 그만둔 뒤의 일입니다. 큰 소리에 몸이 먼저 움직였습니다.', k: 'loss', fx: { h: -3 } }), { c: (s) => fell(s, 'SAR_MERC') }),
];

// ── SAR_TOUR 메나트 하마이트 관광·보석 (A10: guide → staff → manager) ──
const tour = [
  E('sar_tou_g_group', [18, 45], [T('SAR_TOUR', 'guide')], 45, 2, (s) => ({ t: '관광객 스무 명을 데리고 유적을 돌았습니다. 질문은 모두 보석 값이었습니다.', k: 'ev', fx: { cap: { ties: 0.02 }, money: medX(s, 0.03), f: F('관광 안내 일지, ' + s.year + '년') } })),
  E('sar_tou_g_heat', [18, 45], [T('SAR_TOUR', 'guide')], 35, 3, (s) => ({ t: '한낮 유적에서 관광객 하나가 쓰러졌습니다. 그늘로 옮기고 물을 먹였습니다. 회사는 그 일을 평가에 넣지 않았습니다.', k: 'note', fx: { hl: -1 } })),
  E('sar_tou_s_gem', [21, 60], [T('SAR_TOUR', 'staff')], 45, 2, (s) => ({ t: '보석상 진열대 뒤에 섰습니다. 손님이 값을 물으면 보석의 역사를 먼저 말했습니다. 역사가 길수록 값이 올랐습니다.', k: 'ev', fx: { money: medX(s, 0.08), cap: { learn: 0.02 } } })),
  E('sar_tou_s_museum', [21, 60], [T('SAR_TOUR', 'staff')], 35, 3, (s) => ({ t: '박물관 전시를 바꿨습니다. 설명판을 세 나라 글자로 썼습니다. 사르곤 글자가 가장 작았습니다.', k: 'note', fx: { h: -1 } })),
  E('sar_tou_m_season', [27, 65], [T('SAR_TOUR', 'manager')], 45, 2, (s) => ({ t: '관리자로서 성수기 인력을 짰습니다. 안내원 열둘 중 넷은 계절 계약이었습니다. 계절이 끝나면 넷은 없었습니다.', k: 'note', fx: { standing: 3, h: -1, f: F('성수기 인력표, ' + s.year + '년') } })),
  E('sar_tou_m_drop', [27, 65], [T('SAR_TOUR', 'manager')], 35, 3, (s) => ({ t: '아미르 사이 다툼으로 관광이 반으로 줄었습니다. 본사는 숫자를 보냈고, 숫자 밑에 이름 넷을 적어 보내라고 했습니다.', k: 'bad', fx: { h: -4, f: F('관광객 집계, ' + s.year + '년') } })),
  E('sar_tou_gem_aff', [18, 65], ['aff:SAR_TOU_GEM', T('SAR_TOUR')], 35, 3, (s) => ({ t: '보석상이라 수당이 판매에 따라 붙었습니다. 좋은 달과 나쁜 달의 차이가 집세였습니다.', k: 'note', fx: { money: medX(s, 0.15) } })),
  E('sar_tou_shift', [18, 65], [T('SAR_TOUR')], 400, 2, (s) => ({ t: stageId(s) === 'staff' ? '안내 깃발을 내려놓고 매장 안으로 들어갔습니다.' : '관리자가 되었습니다. 매장 열쇠와 인력표를 받았습니다.', k: 'big', fx: { h: 3 } }), { c: stNew }),
  E('sar_tou_after', [18, 95], [], 500, 1, (s) => ({ t: '회사를 나온 뒤의 일입니다. 유적 앞을 지나며 설명하던 문장이 입 안에서 혼자 돌았습니다.', k: 'loss', fx: { h: -2 } }), { c: (s) => fell(s, 'SAR_TOUR') }),
];

// ── 신참·관계·방문·전시·캐논 ──────────────────────────────────────────────
const misc = [
  E('sar_newcomer_price', [10, 80], ['sargon', 'newcomer'], 35, 2, (s) => ({ t: '바자르에서 값을 흥정하지 못했습니다. 흥정하지 않는 사람에게는 처음 부른 값이 값이었습니다.', k: 'bad', fx: { money: -medX(s, 0.03) } })),
  E('sar_newcomer_amir', [10, 80], ['sargon', 'newcomer'], 30, 3, (s) => ({ t: '어느 아미르령인지 먼저 물었습니다. 대답을 못 하자 서류를 다시 쓰라고 했습니다. 아미르의 이름이 나라 이름보다 먼저였습니다.', k: 'note', fx: { h: -1 } })),
  E('sar_newcomer_tea', [10, 80], ['sargon', 'newcomer'], 25, 3, (s) => ({ t: '이웃이 ' + eul(cul(s).drink) + ' 내왔습니다. 세 잔을 비우기 전에 일어나면 안 된다는 것을 그날 배웠습니다.', k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } })),
  E('sar_rel_inst', [10, 80], ['sargon', 'rel:institutional'], 35, 3, (s) => ({ t: '궁정 서류에 종족 칸이 있었습니다. 그 칸 때문에 다른 칸은 읽히지 않았습니다.', k: 'bad', fx: { h: -2 } })),
  E('sar_rel_cultural', [10, 80], ['sargon', 'rel:cultural'], 30, 3, (s) => ({ t: '바자르 상인이 값을 부르기 전에 얼굴을 한 번 더 보았습니다. 값은 조금 더 높았습니다.', k: 'note', fx: { money: -medX(s, 0.02) } })),
  E('sar_rel_favored', [10, 80], ['sargon', 'rel:favored'], 25, 4, (s) => ({ t: '궁정 사람이 종족을 보고 먼저 자리를 권했습니다. 권한 이유는 말하지 않았고, 말하지 않아도 알았습니다.', k: 'note', fx: { h: 1, standing: 1 } })),
  E('sar_visit_in_bazaar', [12, 80], ['visit:sargon'], 35, 2, (s) => ({ t: '사르곤에 머무는 동안 값을 흥정하는 법을 배웠습니다. 세 번 깎아야 시작이었습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('sar_visit_in_heat', [12, 80], ['visit:sargon'], 35, 2, (s) => ({ t: '사르곤의 한낮에는 아무도 밖에 없었습니다. 밖에 있는 사람은 외국인뿐이라고, 그늘에서 누가 말했습니다.', k: 'note', fx: { hl: -1 } })),
  E('sar_war_civil', [8, 90], ['sargon', 'war'], 50, 2, (s) => ({ t: '아미르들이 전쟁을 했습니다. 어느 쪽 아미르인지에 따라 길이 열리고 닫혔습니다. 장에 가는 길이 두 번 바뀌었습니다.', k: 'bad', fx: { h: -3, money: -medX(s, 0.05) } }), { rep: true }),
  E('sar_war_levy', [15, 45], ['sargon', 'war', '!serving', '!track:SAR_ARMY'], 30, 3, (s) => ({ t: '아미르가 마을에서 사람을 뽑아 갔습니다. 집마다 한 명. 저희 집은 ' + (s.S.fam.older ? '형' : '제') + ' 차례였습니다.', k: 'bad', fx: { h: -3 } })),
  E('sar_canon_gavial', [10, 80], ['sargon'], 60, 1, (s) => { const f = canonOpen(s, 'gavial'); canonSeen(s, f); return { t: '부족에서 쫓겨났다는 치유자가 광산 입구에서 다친 광부의 다리를 묶어 주고 떠났습니다. 이름이 ' + f.name + '이라는 것은 나중에 들었습니다.', k: 'note', fx: { h: 1 } }; }, { c: (s) => (trk(s, 'SAR_MINE') || trk(s, 'SAR_TRIBE')) && !!canonOpen(s, 'gavial') }),
  E('sar_canon_tomimi', [10, 80], ['sargon', T('SAR_TRIBE')], 60, 1, (s) => { const f = canonOpen(s, 'tomimi'); canonSeen(s, f); return { t: '이웃 부족의 어린 족장이 모닥불 앞에서 어른들보다 먼저 결정을 내렸습니다. ' + f.name + '. 아무도 반대하지 않았고, 멀리서 그것을 보았습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }; }, { c: (s) => !!canonOpen(s, 'tomimi') }),
  E('sar_canon_eunectes', [10, 80], ['sargon', T('SAR_TRIBE')], 60, 1, (s) => { const f = canonOpen(s, 'eunectes'); canonSeen(s, f); return { t: '철광을 쥔 족장이 쇳덩이를 어깨에 메고 혼자 정글 길을 올라가는 것을 보았습니다. ' + f.name + '의 부족 사람들은 그것을 늘 보는 일처럼 보았습니다.', k: 'note', fx: { h: 1 } }; }, { c: (s) => !!canonOpen(s, 'eunectes') }),
];

export const events = [].concat(court, zhayedan, slave, tribe, trade, army, farm, mine, teacher, messenger, merc, tour, misc);

// ── 결정 ─────────────────────────────────────────────────────────────────────
/** 엔진 marry_<type> 의 ok 와 같은 판정(유형 id 일치) */
const marryOk = (id) => (s) => ENGINE_DECISIONS.marry.ok(s) && !!s.S.flags.y_marry && !!s.S.flags.y_marry.v && s.S.flags.y_marry.v.type.id === id;
const marryPick = (s, p) => { const r = s.S.flags.y_marry && s.S.flags.y_marry.v; if (!r) return null; Object.assign(p, r); return r; };
function marryApply(s, k, p, typeOverride) {
  s.S.flags.y_marry = null;
  if (k === 'hold') return '혼담을 미루었습니다.';
  if (k === 'decline') return '혼담을 거절했습니다.';
  if (!p.prospect || !p.type) return '혼담은 흐지부지되었습니다.';
  // 엔진 결정의 apply 를 그대로 빌린다(가족 반대·지참금·poly 처리 동일)
  return ENGINE_DECISIONS.marry.apply(s, 'accept', typeOverride ? { ...p, type: typeOverride } : p);
}

export const decisions = {
  // 사르곤 지참금 혼인: 흥정 선택지(k 'haggle') 추가. accept/hold/decline 은 엔진과 같다
  marry_dowry: {
    once: false, at: 0.45, ok: marryOk('dowry'),
    build: (s, p) => { const r = marryPick(s, p); if (!r) return null; const t = r.type, pr = r.prospect; const amt = Math.round(s.med * t.dowry); const groom = s.S.sex === 'M';
      return { title: '지참금 혼인', body: wa(pr.name) + ' 혼담이 오갑니다. 신랑 쪽이 내는 지참금은 ' + amt.toLocaleString() + ' LMD. ' + (groom ? '집안 형편에 맞는 값인지 셰이크가 먼저 물었습니다.' : '상대 집이 그 값을 낼 수 있는지 어머니가 먼저 물었습니다.') + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람입니다.' : ''),
        choices: [{ k: 'accept', label: '받아들인다', auto: 1.2 }, { k: 'haggle', label: '지참금을 흥정한다', sub: groom ? '깎는다' : '올린다', auto: 0.8 }, { k: 'hold', label: '보류한다', auto: 0.5 }, { k: 'decline', label: '거절한다', auto: 0.4 }] }; },
    apply: (s, k, p) => { if (k !== 'haggle') return marryApply(s, k, p);
      const groom = s.S.sex === 'M';
      if (s.rng.chance(0.55 + 0.1 * (s.S.cap ? s.S.cap.ties : 0))) { s.log(groom ? '흥정이 통했습니다. 지참금이 삼분의 일 줄었습니다.' : '흥정이 통했습니다. 지참금이 삼분의 일 늘었습니다.', 'note'); return marryApply(s, 'accept', p, { ...p.type, dowry: p.type.dowry * (groom ? 0.67 : 1.33) }); }
      s.S.flags.y_marry = null; return { t: '흥정이 지나쳤습니다. 상대 집이 혼담을 거두었습니다.', k: 'bad', fx: { h: -2 } }; },
  },
  marry_tribal: {
    once: false, at: 0.45, ok: marryOk('tribal'),
    build: (s, p) => { const r = marryPick(s, p); if (!r) return null; const pr = r.prospect;
      return { title: '부족 혼례', body: wa(pr.name) + ' 모닥불 앞에서 혼례를 올리자는 말이 나왔습니다. 지참금은 사냥감 몇 마리면 됩니다. 두 부족의 어른들이 먼저 앉았습니다.',
        choices: [{ k: 'accept', label: '받아들인다', auto: 1.5 }, { k: 'hold', label: '보류한다', auto: 0.5 }, { k: 'decline', label: '거절한다', auto: 0.4 }] }; },
    apply: (s, k, p) => marryApply(s, k, p),
  },
  marry_court: {
    once: false, at: 0.45, ok: marryOk('court'),
    build: (s, p) => { const r = marryPick(s, p); if (!r) return null; const pr = r.prospect; const amt = Math.round(s.med * r.type.dowry);
      return { title: '궁정 혼약', body: wa(pr.name) + ' 혼약이 궁정을 통해 들어왔습니다. 지참금 ' + amt.toLocaleString() + ' LMD. 혼약서에는 두 집안의 이름이 두 사람 이름보다 크게 적혀 있습니다.',
        choices: [{ k: 'accept', label: '받아들인다', auto: 1.3 }, { k: 'hold', label: '보류한다', auto: 0.5 }, { k: 'decline', label: '거절한다', sub: '궁정 평판', auto: 0.3 }] }; },
    apply: (s, k, p) => { if (k === 'decline' && s.S.track) s.S.track.standing = Math.max(0, s.S.track.standing - 5); return marryApply(s, k, p); },
  },
  marry_slave: {
    once: false, at: 0.45, ok: marryOk('slave'),
    build: (s, p) => { const r = marryPick(s, p); if (!r) return null; const pr = r.prospect;
      return { title: '노예 결연', body: wa(pr.name) + ' 결연하라는 말이 주인에게서 내려왔습니다. 지참금은 없습니다. 아이가 태어나면 그 아이도 주인의 것입니다.',
        choices: [{ k: 'accept', label: '받아들인다', auto: 1.5 }, { k: 'hold', label: '미룬다', auto: 0.4 }, { k: 'decline', label: '거절한다', sub: '거절할 수 없는 일', auto: 0.2 }] }; },
    apply: (s, k, p) => { if (k === 'decline') { s.S.flags.y_marry = null; return { t: '거절했습니다. 주인은 다음 해에 다른 사람을 데려왔습니다.', k: 'bad', fx: { h: -3 } }; } return marryApply(s, k, p); },
  },
  // 자예단 지원(SAR_ARMY 상단 전환)
  sar_zhayedan_volunteer: {
    tags: [T('SAR_ARMY')], once: false, gap: 4, at: 0.5,
    ok: (s) => trk(s, 'SAR_ARMY') && s.S.track.stage >= 2 && s.S.age >= 20 && s.S.age <= 40 && skillZ(s) >= 1.2 && s.rng.chance(0.35),
    build: (s) => ({ title: '공물', body: '파디샤가 샤에게 바칠 자원자 명단을 짭니다. 뽑히면 시험을 치르고, 통과하면 돌아오지 않습니다. 가족에게는 명예와 급여가 남습니다.',
      choices: [{ k: 'go', label: '자원한다', sub: '자예단 후보', auto: 0.5 }, { k: 'no', label: '자원하지 않는다', auto: 1.5 }] }),
    apply: (s, k) => { if (k === 'no') return '명단에 이름을 올리지 않았습니다.'; return s.switchTrack('SAR_ZHAYEDAN', 'switch') ? false : { t: '명단에 올랐지만 파디샤가 다른 이름을 골랐습니다.', k: 'note' }; },
  },
  // 마비소티아 난투(SAR_TRIBE 족장 → 대족장)
  sar_mahuizzotia: {
    tags: [T('SAR_TRIBE', 'chief')], once: false, gap: 3, at: 0.5,
    ok: (s) => trk(s, 'SAR_TRIBE') && stageId(s) === 'chief' && s.S.age >= 20 && s.rng.chance(0.5),
    build: (s) => ({ title: fest(s, 0), body: '대족장을 뽑는 난투가 열립니다. 족장이 직접 나가거나, 부족의 전사를 대신 세웁니다. 마지막까지 서 있는 쪽이 대족장입니다.',
      choices: [{ k: 'fight', label: '직접 나간다', sub: '몸으로', auto: 1 }, { k: 'proxy', label: '전사를 세운다', auto: 1 }, { k: 'skip', label: '올해는 거른다', auto: 0.6 }] }),
    apply: (s, k) => {
      if (k === 'skip') return '올해는 불 옆에 앉아 구경만 했습니다.';
      const p = (k === 'fight' ? 0.25 + 0.15 * skillZ(s) : 0.2 + 0.1 * standing(s) / 100);
      if (s.rng.chance(Math.max(0.05, Math.min(0.7, p)))) { s.promote({ force: true, quiet: true }); return { t: k === 'fight' ? '마지막까지 서 있었습니다. 다음 날 아침 다섯 부족이 대족장이라고 불렀습니다.' : '부족의 전사가 마지막까지 섰습니다. 전사의 이름과 족장의 이름이 함께 불렸습니다.', k: 'big', fx: { h: 5, standing: 8, hl: k === 'fight' ? -8 : 0 } }; }
      return { t: k === 'fight' ? '셋째 판에 넘어졌습니다. 갈비뼈 둘. 부족은 족장을 업고 돌아갔습니다.' : '부족의 전사가 둘째 판에 졌습니다. 전사는 한 달을 누웠고, 족장은 그 집에 고기를 보냈습니다.', k: 'bad', fx: { hl: k === 'fight' ? -12 : -1, h: -3, standing: -3 } };
    },
  },
  // 노예 반란 가담
  sar_slave_revolt: {
    tags: [T('SAR_SLAVE', 'slave')], once: false, gap: 5, at: 0.5,
    ok: (s) => trk(s, 'SAR_SLAVE') && stageId(s) === 'slave' && s.S.age >= 15 && s.rng.chance(0.15),
    build: (s) => ({ title: '밤의 모임', body: '채석장 사람들이 밤에 모입니다. 무기라고 할 것은 없고, 사람 수는 감독의 열 배입니다. 들키면 끝이고, 들키지 않아도 끝이 좋다는 보장은 없습니다.',
      choices: [{ k: 'join', label: '모임에 나간다', auto: 0.8 }, { k: 'no', label: '자리에 남는다', auto: 1.2 }] }),
    apply: (s, k) => { if (k === 'no') return '자리에 남았습니다. 모임에 나간 사람들을 보지 않으려 했습니다.';
      if (s.rng.chance(0.3)) { s.applyExit('death', 'execution'); return false; }
      s.promote({ force: true, quiet: true }); return { t: '모임에 나갔습니다. 돌아가는 길은 그날로 없어졌습니다.', k: 'bad', fx: { h: 2, standing: 5 } }; },
  },
  // 궁정 줄서기
  sar_court_side: {
    tags: [T('SAR_COURT')], once: false, gap: 6, at: 0.5,
    ok: (s) => trk(s, 'SAR_COURT') && s.S.age >= 22 && s.rng.chance(0.3),
    build: (s) => ({ title: '줄', body: '파디샤 하나와 아미르 하나가 궁정에서 다툽니다. 양쪽 모두 사람을 모으고 있고, 모이지 않는 사람의 이름도 적고 있습니다.',
      choices: [{ k: 'padishah', label: '파디샤 쪽에 선다', auto: 1 }, { k: 'amir', label: '아미르 쪽에 선다', auto: 1 }, { k: 'none', label: '어느 쪽에도 서지 않는다', auto: 0.8 }] }),
    apply: (s, k) => { if (k === 'none') { s.S.track.standing = Math.max(0, s.S.track.standing - 4); return { t: '어느 쪽에도 서지 않았습니다. 양쪽 명부에 이름이 올랐습니다.', k: 'note', fx: { h: -1 } }; }
      if (s.rng.chance(0.55)) { s.S.track.standing = Math.min(100, s.S.track.standing + 10); return { t: '선 쪽이 이겼습니다. 방이 복도 안쪽으로 옮겨졌습니다.', k: 'warm', fx: { h: 2, cap: { ties: 0.04 } } }; }
      if (s.rng.chance(0.4)) { s.fall('purge'); return false; }
      s.S.track.standing = Math.max(0, s.S.track.standing - 15); return { t: '선 쪽이 졌습니다. 방이 복도 끝으로 옮겨졌고, 한동안 아무도 문을 두드리지 않았습니다.', k: 'bad', fx: { h: -4 } }; },
  },
  // 암시장 거래(상단)
  sar_trade_black: {
    tags: [T('SAR_TRADE')], once: false, gap: 4, at: 0.5,
    ok: (s) => trk(s, 'SAR_TRADE') && s.S.track.stage >= 1 && s.rng.chance(0.2),
    build: (s) => ({ title: '밤의 값', body: '암시장 사람이 상단 짐 하나를 낮의 세 배 값에 사겠다고 합니다. 장부에는 적을 수 없는 거래입니다.',
      choices: [{ k: 'sell', label: '판다', auto: 0.7 }, { k: 'no', label: '팔지 않는다', auto: 1.3 }] }),
    apply: (s, k) => { if (k === 'no') return '낮의 값으로만 팔았습니다.';
      if (s.rng.chance(0.3)) { s.S.track.standing = Math.max(0, s.S.track.standing - 12); return { t: '검문에 걸렸습니다. 짐을 빼앗겼고, 상단 이름에 줄이 그어졌습니다.', k: 'bad', fx: { money: -medX(s, 0.8), h: -3 } }; }
      return { t: '밤에 팔았습니다. 장부에는 없는 돈이 생겼습니다.', k: 'note', fx: { money: medX(s, 1.2), h: -1 } }; },
  },
  // 세금 체납(농민)
  sar_farm_tax: {
    tags: [T('SAR_FARM')], once: false, gap: 5, at: 0.5,
    ok: (s) => trk(s, 'SAR_FARM') && s.S.age >= 16 && s.S.money < s.med * 0.3 && s.rng.chance(0.3),
    build: (s) => ({ title: '세리', body: '올해 세금을 낼 수 없습니다. 세리는 셋 중 하나를 고르라고 합니다. 가축을 내놓거나, 아들을 민병으로 보내거나, 내년에 갑절로 내거나.',
      choices: [{ k: 'cattle', label: '가축을 내놓는다', auto: 1 }, { k: 'militia', label: '민병으로 간다', sub: '상비군·사병 길', auto: 0.7 }, { k: 'double', label: '내년에 갑절로 낸다', auto: 0.8 }] }),
    apply: (s, k) => { if (k === 'cattle') return { t: '가축 두 마리를 내놓았습니다. 외양간이 넓어졌습니다.', k: 'bad', fx: { money: -medX(s, 0.3), h: -2 } };
      if (k === 'militia') return s.switchTrack('SAR_ARMY', 'switch') ? false : '민병 자리는 올해 차 있었습니다. 가축을 내놓았습니다.';
      s.S.flags.sarTaxDebt = (s.S.flags.sarTaxDebt || 0) + 1; return { t: '내년으로 미뤘습니다. 세리는 장부에 갑절이라고 적고 갔습니다.', k: 'note', fx: { h: -1 } }; },
  },
  // 용병 탈영
  sar_merc_desert: {
    tags: [T('SAR_MERC')], once: false, gap: 5, at: 0.5,
    ok: (s) => trk(s, 'SAR_MERC') && s.S.track.stage >= 1 && s.rng.chance(s.S.flags.war || s.S.st.hl < 55 ? 0.4 : 0.12),
    build: (s) => ({ title: '계약서 뒷장', body: '다음 계약지는 돌아오는 사람이 반이라는 곳입니다. 계약서 뒷장에는 이탈 시 급여 몰수라고 적혀 있습니다. 급여는 두 달째 밀려 있습니다.',
      choices: [{ k: 'leave', label: '밤에 떠난다', sub: '탈영', auto: 0.6 }, { k: 'stay', label: '계약대로 간다', auto: 1.4 }] }),
    apply: (s, k) => { if (k === 'stay') return { t: '계약대로 갔습니다. 돌아왔습니다.', k: 'ev', fx: { hl: -5, money: medX(s, 0.3), standing: 3 } };
      s.leaveTrack('expel', { quiet: true }); return { t: '밤에 떠났습니다. 밀린 급여는 포기했고, 회사 명부에는 이탈이라고 남았습니다.', k: 'bad', fx: { h: -2 } }; },
  },
};

// ── 세 나라 공용 덮어쓰기(국가 분기 + 엔진 위임). bolivar.js·rim.js 가 import 해서 같은 id 로 등록한다 ──
const HOME_TEXT = {
  sargon: (s, opts) => ({ title: '집', body: '집을 마련할 만큼 모였습니다. ' + (s.S.urban ? '도시 셋집을 벗어날 수 있습니다.' : '흙집 한 채면 오아시스에서 어른 대접을 받습니다.') + ' 지참금을 내고 나면 남는 돈을 다시 세어 보았습니다.' }),
  bolivar: (s, opts) => ({ title: '집', body: '집을 마련할 만큼 모였습니다. 세 정부 어느 쪽 등기소에 올릴지가 집값만큼 중요합니다. 등기소가 바뀌면 집도 바뀝니다.' }),
  rim: (s, opts) => ({ title: '집', body: '집을 마련할 만큼 모였습니다. 가족공동체 공동 주택에 이름을 올리거나, 회사 기숙사를 나올 수 있습니다. 광산 쪽 집은 재앙이 오면 먼저 비웁니다.' }),
};
export const sharedDecisions = {
  home_change: {
    once: false, gap: ENGINE_DECISIONS.home_change.gap, at: 0.7,
    ok: ENGINE_DECISIONS.home_change.ok,
    build: (s, p) => { const base = ENGINE_DECISIONS.home_change.build(s, p); if (!base) return null; const tx = HOME_TEXT[s.S.cur]; if (!tx) return base; const o = tx(s); return { ...base, title: o.title, body: o.body, choices: base.choices.map((c) => (c.k === 'no' ? { ...c, label: s.S.cur === 'rim' ? '기숙사에 남는다' : '그대로 산다' } : c)) }; },
    apply: ENGINE_DECISIONS.home_change.apply,
  },
  marry_second: {
    once: true, at: 0.6,
    ok: ENGINE_DECISIONS.marry_second.ok,
    build: (s, p) => { if (s.S.cur !== 'sargon') return ENGINE_DECISIONS.marry_second.build(s, p);
      return { title: '둘째 배우자', body: '집안 형편이 둘째 혼인을 허락합니다. 첫째 배우자의 집이 먼저 물었고, 지참금은 첫째보다 적게 부르는 것이 관습입니다. ' + eun(cul(s).elder) + ' 집이 둘이면 걱정도 둘이라고 했습니다.',
        choices: [{ k: 'yes', label: '맞이한다', auto: 1 }, { k: 'no', label: '하지 않는다', auto: 1.5 }] }; },
    apply: ENGINE_DECISIONS.marry_second.apply,
  },
};
Object.assign(decisions, sharedDecisions);

// W11: 엔진 id 와 같은 결정은 국가 디스패처로 옮긴다(여러 파일이 같은 id 를 등록해도 거주국별로 분기)
hoist(decisions, { marry_dowry: ['sargon'], marry_tribal: ['sargon'], marry_court: ['sargon'], marry_slave: ['sargon'], home_change: ['sargon', 'bolivar', 'rim'], marry_second: ['sargon', 'bolivar', 'rim'] });

export default { events, decisions };
