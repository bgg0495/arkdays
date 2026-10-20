// W9f 라테라노 진로 콘텐츠(국가 전용, D40). 계약: docs/설계_명세_v1.md §11 + "W7 메모 — 스키마 고정".
// 핵심 진로 5: LAT_CURIA(교황청 7청)·LAT_NOTARY(공증소 집행자, 순회)·LAT_LEGATUS(만국 전달자, 순회)·LAT_COHORS(호위대·총기사)·LAT_MONASTERY(수도원).
// 나머지: LAT_GUARD·LAT_GUN·LAT_DESSERT·LAT_TEACHER·LAT_MEDIC·LAT_OFFICE·LAT_DENTIST·LAT_FALLEN(강제).
// 태그 규칙: 거주 기준은 'nation:laterano', 출생 기준(추방 뒤에도)은 'laterano'. 공통 직장 이벤트는 쓰지 않는다(archetype:A10 전용은 W11 몫).
// 각주는 숫자가 있을 때만(D31), 캐논 인물은 1회성·연도 게이트·생애 3명 이하(D43). 무거운 일(추방·타락·발포)은 결과만 적는다.
import { F, cul, fest, medX, lifeRoll, eul, iga, eun, wa, ro } from '../_util.js';
import { ENGINE_DECISIONS } from '../../src/engine/choices.js';
import { marriageP, rollMarriageType, makeProspect, marry, familyOpposes } from '../../src/engine/marriage.js';
import { homeChangeOptions, setHousing } from '../../src/engine/housing.js';

const NAT = 'laterano';
const N = 'nation:' + NAT;
const T = (id, st) => 'track:' + id + (st ? ':' + st : '');
const E = (id, a, tags, w, gap, run, x) => ({ id, a, tags, w, gap, run, ...(x || {}) });
const stId = (s) => (s.stage ? s.stage.id : null);
const sankta = (s) => s.S.race === 'sankta';
const liberi = (s) => s.S.race === 'liberi';
const here = (s) => s.S.cur === NAT;

/** 단계 전환 서사: 승급 다음 해에 그 단계마다 1회 */
function trans(id, track, a, texts) {
  return { id, a, tags: [T(track)], w: 90, gap: 1,
    c: (s) => !!s.S.track && s.S.track.stage > 0 && s.S.age - s.S.track.stageSince <= 1 && texts[stId(s)] != null && !s.S.flags['tr_' + id + '_' + stId(s)],
    run: (s) => { const k = stId(s); s.S.flags['tr_' + id + '_' + k] = s.S.age; const t = texts[k] || '자리가 바뀌었습니다. 책상도 바뀌었습니다.'; return typeof t === 'function' ? t(s) : { t, k: 'ev', fx: { h: 1 } }; } };
}
/** 몰락 후일담: 진로를 잃은 뒤 2년 안에 1회. texts: 몰락 cause 또는 이탈 how → 문장, _ 는 기본 */
function after(id, track, a, texts, tag = NAT) {
  return { id, a, tags: [tag], w: 100,
    c: (s) => !s.S.track && s.S.flags.lastTrack === track && s.S.age - s.S.flags.lastTrackLeftAt <= 2 && !['retire', 'switch', 'death', 'rhodes', 'homemaker'].includes(s.S.flags.lastTrackHow),
    run: (s) => { const f = s.S.flags; const c = f.lastFallAt === f.lastTrackLeftAt ? f.lastFall : null; const t = (c && texts[c]) || texts[f.lastTrackHow] || texts._; return { t: typeof t === 'function' ? t(s) : t, k: 'loss' }; } };
}
/** 캐논 인물 1회성(D43): 연도 게이트 + 생애 3명 */
function canon(id, years, tags, a, text, extraC) {
  return { id, a, tags, w: 30,
    c: (s) => s.year >= years[0] && s.year <= years[1] && (s.S.flags.canonSeen || 0) < 3 && (!extraC || extraC(s)),
    run: (s) => { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; return { t: typeof text === 'function' ? text(s) : text, k: 'note' }; } };
}
/** 혼인 롤(엔진 choices.js 의 yearly 와 같은 캐시 키를 써서 다른 유형 결정과 한 해 한 번만 롤) */
function marryRoll(s) {
  const S = s.S; const k = 'y_marry';
  if (S.flags[k] && S.flags[k].age === S.age) return S.flags[k].v;
  const p = marriageP(s);
  const v = p > 0 && s.rng.chance(p) ? { type: rollMarriageType(s), prospect: makeProspect(s) } : null;
  S.flags[k] = { age: S.age, v };
  return v;
}
function marryDecision(typeId, body, okText) {
  return {
    once: false, at: 0.45,
    ok: (s) => { const r = marryRoll(s); return !!(r && r.type && r.type.id === typeId); },
    build: (s, p) => {
      const r = marryRoll(s); if (!r) return null; Object.assign(p, r);
      if (!here(s)) return ENGINE_DECISIONS.marry.build(s, p);
      return { title: r.type.name, body: body(s, r.prospect, r.type),
        choices: [{ k: 'accept', label: '받아들인다', auto: 2 }, { k: 'hold', label: '한 해 미룬다', auto: 0.6 }, { k: 'decline', label: '거절한다', auto: 0.4 }] };
    },
    apply: (s, k, p) => {
      if (!here(s)) return ENGINE_DECISIONS.marry.apply(s, k, p);
      s.S.flags.y_marry = null;
      if (!p || !p.prospect || !p.type) return '혼담은 없던 일이 되었습니다.';
      if (k === 'hold') return '혼담을 한 해 미루었습니다.';
      if (k === 'decline') return '혼담을 거절했습니다. 중매한 쪽이 더 서운해했습니다.';
      if (familyOpposes(s, p.prospect)) return { t: '양가가 반대했습니다. 종족이 다르다는 말을 아무도 입 밖에 내지 않았고, 그래서 더 분명했습니다.', k: 'bad' };
      if (!marry(s, p.prospect, p.type, { quiet: true })) return '혼인은 이루어지지 않았습니다.';
      return { t: okText(s, p.prospect), k: 'warm', fx: { h: 4 } };
    },
  };
}

// ───────────────────────────── 이벤트 ─────────────────────────────
export const events = [
  // ══════════ LAT_CURIA 교황청 7청 공무원 (핵심) ══════════
  E('lat_cur_scribe_copy', [18, 40], [T('LAT_CURIA', 'scribe')], 30, 2, (s) => ({ t: '하루에 서류 30장을 옮겨 적었습니다. 30장에 전부 같은 도장이 찍혔습니다.', k: 'ev', f: F('교황청 서기국 일일 처리 대장') })),
  E('lat_cur_scribe_number', [18, 40], [T('LAT_CURIA', 'scribe')], 30, 3, () => ({ t: '선배 공무원은 사람을 청 번호로 먼저 불렀습니다. 이름은 그다음이었습니다.', k: 'note' })),
  E('lat_cur_scribe_dessert', [18, 40], [T('LAT_CURIA', 'scribe')], 25, 3, () => ({ t: '교황청 식당의 디저트가 바뀌었습니다. 서기들 사이에서는 그것이 그달의 가장 큰 소식이었습니다.', k: 'warm', fx: { h: 1 } })),
  E('lat_cur_scribe_visitor', [18, 40], [T('LAT_CURIA', 'scribe')], 30, 2, () => ({ t: '민원인이 서기 자리까지 찾아왔습니다. 담당이 아니라고 말하지 않고 끝까지 들었습니다.', k: 'ev', fx: { standing: 2 } })),
  E('lat_cur_off_stamp', [20, 60], [T('LAT_CURIA', 'official')], 30, 2, () => ({ t: '청 사이에 서류가 오갔습니다. 제3청에서 온 서류 12건은 제4청 도장을 받아야 다시 움직였습니다.', k: 'ev', f: F('교황청 제4청 접수 대장') })),
  E('lat_cur_off_field', [20, 60], [T('LAT_CURIA', 'official')], 30, 3, () => ({ t: '외근을 나갔습니다. 외곽 마을 사람들은 공무원을 반기지도 꺼리지도 않았습니다.', k: 'note' })),
  E('lat_cur_off_feast', [20, 60], [T('LAT_CURIA', 'official')], 25, 3, (s) => ({ t: fest(s, 1) + '에 청이 하루 쉬었습니다. 밀린 서류는 쉬지 않았습니다.', k: 'ev', fx: { hl: -1 } })),
  E('lat_cur_off_late', [20, 60], [T('LAT_CURIA', 'official')], 25, 3, () => ({ t: '상급자의 결재가 석 달 늦었습니다. 그동안 민원인은 매주 왔습니다.', k: 'bad', fx: { h: -2 } })),
  E('lat_cur_dir_sign', [28, 68], [T('LAT_CURIA', 'director')], 30, 2, () => ({ t: '국장 결재란에 하루 30번 서명했습니다. 손은 떨리지 않았습니다. 떨릴 일이 아니었습니다.', k: 'ev', fx: { standing: 2 }, f: F('교황청 결재 대장') })),
  E('lat_cur_dir_sit', [28, 68], [T('LAT_CURIA', 'director')], 30, 3, () => ({ t: '추기경 회의에 배석했습니다. 발언은 없었고 기록만 했습니다.', k: 'note' })),
  E('lat_cur_dir_budget', [28, 68], [T('LAT_CURIA', 'director')], 25, 3, () => ({ t: '청 예산이 8% 줄었습니다. 어느 과를 줄일지 정하는 것이 국장의 일이었습니다.', k: 'bad', fx: { h: -2 }, f: F('교황청 예산 공고') })),
  E('lat_cur_dir_envoy', [28, 68], [T('LAT_CURIA', 'director')], 25, 3, () => ({ t: '타국 사절이 왔습니다. 통역 뒤에 앉아 커피만 세 잔 마셨습니다.', k: 'note' })),
  E('lat_cur_card_seal', [35, 90], [T('LAT_CURIA', 'cardinal')], 30, 2, () => ({ t: '추기경 서명이 찍힌 문서가 라테라노 밖으로 나갔습니다. 돌아올 때는 다른 나라 도장이 함께 있었습니다.', k: 'ev', fx: { standing: 2 } })),
  E('lat_cur_card_pope', [35, 90], [T('LAT_CURIA', 'cardinal')], 25, 4, (s) => ({ t: eul(cul(s).ruler) + ' 가까이에서 뵈었습니다. ' + eun(cul(s).rulerTitle) + ' 말이 적었습니다.', k: 'note', fx: { h: 2 } })),
  E('lat_cur_card_night', [35, 90], [T('LAT_CURIA', 'cardinal')], 30, 3, () => ({ t: '추기경단 회의가 밤까지 갔습니다. 결론은 다음 회의로 넘어갔습니다.', k: 'ev', fx: { hl: -1 } })),
  E('lat_cur_card_street', [35, 90], [T('LAT_CURIA', 'cardinal')], 25, 3, () => ({ t: '거리에서 사람들이 길을 비켰습니다. 그 거리가 편하지는 않았습니다.', k: 'note' })),
  trans('lat_cur_trans', 'LAT_CURIA', [19, 90], {
    official: '서기 자리를 떠나 청 공무원이 되었습니다. 책상이 창가로 옮겨졌습니다.',
    director: '국장실로 올라갔습니다. 복도에서 인사하던 사람들이 이제는 먼저 멈춰 섰습니다.',
    cardinal: (s) => ({ t: '추기경 서임을 받았습니다. 붉은 옷이 생각보다 무거웠습니다.' + (sankta(s) ? '' : ' 비산크타 추기경은 흔치 않았고, 복도가 그것을 알고 있었습니다.'), k: 'big', fx: { h: 3 } }),
  }),
  after('lat_cur_after', 'LAT_CURIA', [19, 90], {
    impeach: '해임 통지서는 한 장이었습니다. 짐은 상자 두 개였습니다.',
    scandal: '이름이 교황청 공고에 났습니다. 그 복도를 다시 걷는 일은 없었습니다.',
    _: '교황청을 나왔습니다. 성문 밖에서 돌아보니 탑은 그대로였습니다.',
  }),
  E('lat_cur_aff_1to4', [18, 70], ['aff:LAT_CUR_1TO4'], 25, 3, () => ({ t: '제3청 산업 심사표가 밀렸습니다. 공방 주인들이 복도에 줄을 섰고, 줄은 제4청 앞까지 이어졌습니다.', k: 'ev' })),
  E('lat_cur_aff_6_gun', [18, 70], ['aff:LAT_CUR_6'], 25, 3, () => ({ t: '제6청 장례 담당으로 수호총 반납을 받았습니다. 총은 서랍에, 이름은 장부에 들어갔습니다.', k: 'note', fx: { h: -1 } })),
  E('lat_cur_aff_6_birth', [18, 70], ['aff:LAT_CUR_6'], 20, 4, () => ({ t: '호적 외근으로 외곽 마을에서 출생 신고 5건을 받았습니다. 다섯 아이 모두 광륜이 있었습니다.', k: 'warm', f: F('제6청 호적 외근 보고') })),
  E('lat_cur_aff_7', [18, 70], ['aff:LAT_CUR_7'], 25, 3, () => ({ t: '제7청 서류는 봉인된 채 왔습니다. 열지 않고 다음 손으로 넘기는 것이 일이었습니다.', k: 'note' })),
  E('lat_cur_1101', [18, 90], [T('LAT_CURIA')], 60, 0, (s) => ({ t: '사변 뒤 청마다 결원이 났습니다. 떠난 사람 자리에 임명장이 왔고, 장례 업무를 맡는 부서가 새로 생겼습니다.', k: 'bad', fx: { hl: -2, standing: 3 } }), { c: (s) => s.year >= 1101 && s.year <= 1102 }),
  canon('lat_canon_lemuen', [1096, 1107], [T('LAT_CURIA', 'scribe')], [18, 30], '휠체어를 탄 공무원이 복도에서 신입의 서류 오류를 웃으며 세 군데 짚어 주었습니다. 뒤에 그 사람이 제7청 사람이라고 들었습니다.'),

  // ══════════ LAT_NOTARY 공증소 집행자 (핵심, 순회) ══════════
  E('lat_not_jr_tax', [16, 40], [T('LAT_NOTARY', 'junior')], 30, 2, () => ({ t: '세금 고지서 40장을 들고 집집마다 다녔습니다. 문은 열렸고 표정은 열리지 않았습니다.', k: 'ev', fx: { standing: 1 }, f: F('공증소 징수 대장') })),
  E('lat_not_jr_gun', [16, 40], [T('LAT_NOTARY', 'junior')], 30, 3, () => ({ t: '총기 등록 갱신 접수. 수호총 번호를 장부와 대조했습니다. 번호 하나가 달랐고, 그날은 길어졌습니다.', k: 'ev' })),
  E('lat_not_jr_debt', [16, 40], [T('LAT_NOTARY', 'junior')], 30, 2, () => ({ t: '채무 이행 감시. 약속한 날에 갔고 돈은 없었습니다. 다음 날짜를 적었습니다.', k: 'note' })),
  E('lat_not_jr_confess', [16, 40], [T('LAT_NOTARY', 'junior')], 25, 3, () => ({ t: '고해 차량 앞에 줄을 섰습니다. 민원 처리도 죄업이라고 선임이 말했습니다.', k: 'note', fx: { h: 1 } })),
  E('lat_not_sr_heir', [20, 60], [T('LAT_NOTARY', 'senior')], 30, 3, () => ({ t: '상속 분쟁. 형제 둘이 한 집을 두고 다퉜습니다. 공증소 도장이 한쪽에 찍혔고, 다른 쪽은 돌아보지 않고 갔습니다.', k: 'ev' })),
  E('lat_not_sr_custody', [20, 60], [T('LAT_NOTARY', 'senior')], 25, 3, () => ({ t: '친권 심사. 아이가 어느 집에서 자랄지를 서류 세 장이 정했습니다.', k: 'note', fx: { h: -1 } })),
  E('lat_not_sr_confiscate', [20, 60], [T('LAT_NOTARY', 'senior')], 25, 3, () => ({ t: '상습 위반자의 총기를 몰수했습니다. 총을 내려놓는 손이 늦었고, 그보다 늦지 않게 기다렸습니다.', k: 'ev', fx: { standing: 2 } })),
  E('lat_not_sr_juniors', [20, 60], [T('LAT_NOTARY', 'senior')], 25, 3, () => ({ t: '하급 집행자 2명을 맡았습니다. 둘 다 처음 고지서를 들고 나간 날 길을 잃었습니다.', k: 'warm', f: F('공증소 인사 기록') })),
  E('lat_not_head_report', [28, 70], [T('LAT_NOTARY', 'head')], 30, 2, () => ({ t: '공증소장으로 월례 보고를 올렸습니다. 숫자는 지난달과 같았고, 그것이 좋은 보고였습니다.', k: 'ev', fx: { standing: 1 } })),
  E('lat_not_head_rule', [28, 70], [T('LAT_NOTARY', 'head')], 25, 3, () => ({ t: '제5청에서 지침이 내려왔습니다. 지침은 두 장이었고 해석은 두 달이 걸렸습니다.', k: 'note' })),
  E('lat_not_head_queue', [28, 70], [T('LAT_NOTARY', 'head')], 25, 3, () => ({ t: '공증소 앞에 민원인이 줄을 섰습니다. 소장실 창문에서는 줄의 끝이 보이지 않았습니다.', k: 'ev', fx: { hl: -1 } })),
  E('lat_not_head_lost', [28, 70], [T('LAT_NOTARY', 'head')], 15, 5, () => ({ t: '집행자 하나가 임무에서 돌아오지 않았습니다. 이름을 장부에서 다른 장부로 옮겨 적는 것이 소장의 일이었습니다.', k: 'loss', fx: { h: -3 } })),
  E('lat_not_saint_desk', [30, 95], [T('LAT_NOTARY', 'saint')], 30, 2, () => ({ t: '성인 서품 뒤에도 출근했습니다. 책상은 같았고 찾아오는 사람이 달라졌습니다.', k: 'ev' })),
  E('lat_not_saint_pilgrim', [30, 95], [T('LAT_NOTARY', 'saint')], 25, 3, () => ({ t: '순례자들이 성인을 보러 왔습니다. 세금 고지서를 들고 나가는 모습을 보고는 조용히 돌아갔습니다.', k: 'note', fx: { h: 1 } })),
  E('lat_not_saint_advice', [30, 95], [T('LAT_NOTARY', 'saint')], 20, 4, () => ({ t: '교황청에서 자문을 청했습니다. 답은 짧게 했습니다.', k: 'note', fx: { standing: 2 } })),
  E('lat_not_saint_sign', [30, 95], [T('LAT_NOTARY', 'saint')], 25, 3, () => ({ t: '성인의 이름으로 나간 서류에는 아무도 토를 달지 않았습니다. 그래서 더 조심해서 썼습니다.', k: 'ev' })),
  trans('lat_not_trans', 'LAT_NOTARY', [17, 95], {
    senior: '선임 집행자가 되었습니다. 외근 가방에 도장이 하나 더 들어갔습니다.',
    head: '파구스 공증소장이 되었습니다. 책상이 창가로 갔고, 창밖으로 민원 줄이 보였습니다.',
    saint: (s) => ({ t: '성인 서품을 받았습니다. 종은 울리지 않았습니다. 다음 날 아침 출근 시간은 같았습니다.', k: 'big', fx: { h: 5 } }),
  }),
  after('lat_not_after', 'LAT_NOTARY', [17, 95], {
    kia: '임무 중 크게 다쳤습니다. 공증소는 치료비를 냈고 자리는 남겨 두지 않았습니다.',
    impeach: '직무 정지 공고가 공증소 벽에 붙었습니다. 지나다니던 길이 멀어졌습니다.',
    heresy: '이단 심문이 있었습니다. 결론은 국경 밖이었습니다.',
    _: '공증소를 나왔습니다. 도장 찍는 소리가 한동안 귀에 남았습니다.',
  }),
  E('lat_not_aff_pagus', [16, 70], ['aff:LAT_NOT_PAGUS'], 25, 3, () => ({ t: '파구스 공증소 당직. 밤새 민원은 한 건, 고양이 소동이었습니다.', k: 'warm' })),
  E('lat_not_aff_fallen', [16, 70], ['aff:LAT_NOT_FALLEN'], 30, 2, () => ({ t: '타락자 감독 순회. 추방 공민에게 수당과 약품을 건넸습니다. 영수증에 서명을 받았고 눈은 마주치지 않았습니다.', k: 'note', fx: { h: -2 } })),
  E('lat_not_aff_abroad', [16, 70], ['aff:LAT_NOT_ABROAD'], 30, 3, () => ({ t: '해외 공민 보호 파견. 타국 경찰서에서 라테라노 공민 하나를 데리고 나왔습니다. 서류가 사람보다 먼저 통했습니다.', k: 'ev', fx: { standing: 2 } })),
  E('lat_not_visit_sir', [16, 70], [T('LAT_NOTARY'), 'visit:siracusa'], 30, 3, () => ({ t: '시라쿠사 파견. 패밀리 사람이 공증소 도장을 보고 웃었습니다. 그래도 서류는 받아 갔습니다.', k: 'note' })),
  E('lat_not_visit_col', [16, 70], [T('LAT_NOTARY'), 'visit:columbia'], 30, 3, () => ({ t: '컬럼비아에서 라테라노 공민의 채무를 추심했습니다. 변호사가 셋 있었고, 셋 다 라테라노 법을 몰랐습니다.', k: 'ev' })),
  E('lat_not_visit_lei', [16, 70], [T('LAT_NOTARY'), 'visit:leithanien'], 30, 3, () => ({ t: '라이타니엔 파견. 수호총을 지닌 채 입국 심사를 받았습니다. 서류 4장이 필요했습니다.', k: 'note', f: F('라이타니엔 입국 심사 접수증') })),
  canon('lat_canon_federico', [1096, 1107], [T('LAT_NOTARY', 'junior')], [16, 30], '선임 집행자 하나가 세금 고지서를 건네며 수호총을 한 번도 만지지 않았습니다. 그 이름을 몇 해 뒤 공고에서 다시 보았습니다.'),

  // ══════════ LAT_LEGATUS 만국 전달자 (핵심, 순회) ══════════
  E('lat_leg_staff_sort', [22, 45], [T('LAT_LEGATUS', 'staff')], 30, 2, () => ({ t: '제7청 직원으로 외교 문서를 분류했습니다. 봉인된 것과 봉인되지 않은 것, 두 종류였습니다.', k: 'ev' })),
  E('lat_leg_staff_lodge', [22, 45], [T('LAT_LEGATUS', 'staff')], 25, 3, () => ({ t: '타국 사절 숙소를 준비했습니다. 베개 높이까지 확인했습니다.', k: 'note' })),
  E('lat_leg_staff_cipher', [22, 45], [T('LAT_LEGATUS', 'staff')], 25, 3, () => ({ t: '암호 서식을 익혔습니다. 외우고, 태웠습니다.', k: 'ev', fx: { cap: { learn: 0.05 } } })),
  E('lat_leg_staff_lesson', [22, 45], [T('LAT_LEGATUS', 'staff')], 25, 4, () => ({ t: '상관이 "전달자는 말을 전하는 사람이지 뜻을 전하는 사람이 아니다"라고 했습니다. 받아 적었습니다.', k: 'note' })),
  E('lat_leg_leg_border', [24, 60], [T('LAT_LEGATUS', 'legatus')], 30, 2, () => ({ t: '전달자로 국경을 넘었습니다. 서한은 가슴에, 수호총은 허리에 있었습니다.', k: 'ev', fx: { standing: 2 } })),
  E('lat_leg_leg_court', [24, 60], [T('LAT_LEGATUS', 'legatus')], 30, 3, (s) => ({ t: '타국 궁정에서 ' + cul(s).ruler + '의 서한을 읽었습니다. 듣는 쪽은 웃지도 끄덕이지도 않았습니다.', k: 'note' })),
  E('lat_leg_leg_citizens', [24, 60], [T('LAT_LEGATUS', 'legatus')], 25, 3, () => ({ t: '돌아오는 길에 라테라노 공민 둘을 만났습니다. 그들은 전달자의 수호총을 오래 보았습니다.', k: 'warm', fx: { h: 1 } })),
  E('lat_leg_leg_report', [24, 60], [T('LAT_LEGATUS', 'legatus')], 25, 2, () => ({ t: '임무 보고서를 썼습니다. 들은 말은 전부 적고 느낀 것은 하나도 적지 않았습니다.', k: 'ev' })),
  E('lat_leg_chief_map', [32, 70], [T('LAT_LEGATUS', 'chief')], 30, 2, () => ({ t: '수석 전달자로 전달자들의 노선을 정했습니다. 지도 위에 핀이 12개였습니다.', k: 'ev', f: F('제7청 전달자 배치표') })),
  E('lat_leg_chief_cardinal', [32, 70], [T('LAT_LEGATUS', 'chief')], 25, 3, () => ({ t: '추기경에게 직접 보고했습니다. 보고는 짧았고 질문은 길었습니다.', k: 'note', fx: { standing: 2 } })),
  E('lat_leg_chief_welcome', [32, 70], [T('LAT_LEGATUS', 'chief')], 25, 3, () => ({ t: '타국 특사가 라테라노에 왔습니다. 마중은 수석 전달자의 일이었습니다.', k: 'ev' })),
  E('lat_leg_chief_silent', [32, 70], [T('LAT_LEGATUS', 'chief')], 20, 4, () => ({ t: '젊은 전달자가 임무지에서 소식이 끊겼습니다. 사흘 뒤 돌아왔습니다. 그 사흘 동안 다른 일은 하지 못했습니다.', k: 'bad', fx: { h: -2 } })),
  trans('lat_leg_trans', 'LAT_LEGATUS', [23, 70], {
    legatus: '전달자로 임명되었습니다. 첫 임무지는 지도에서 손가락 한 마디 거리였습니다.',
    chief: '수석 전달자가 되었습니다. 국경을 넘는 일은 줄고, 넘는 사람을 세는 일이 늘었습니다.',
  }),
  after('lat_leg_after', 'LAT_LEGATUS', [23, 70], {
    kia: '임무지에서 크게 다쳐 돌아왔습니다. 제7청은 치료비를 냈고 보직은 비워 두지 않았습니다.',
    scandal: '임무 중 접촉한 사람이 문제가 되었습니다. 전달자 명단에서 이름이 지워졌습니다.',
    impeach: '직위 상실 통보를 받았습니다. 교황청 출입증은 그날 반납했습니다.',
    _: '전달자 일을 그만두었습니다. 여권의 도장 수를 세어 보지는 않았습니다.',
  }),
  E('lat_leg_aff_7', [22, 70], ['aff:LAT_LEG_7'], 25, 3, () => ({ t: '제7청 직할 임무. 서한의 내용을 전달자 본인도 몰랐습니다.', k: 'note' })),
  E('lat_leg_aff_applepie', [22, 70], ['aff:LAT_LEG_APPLEPIE'], 25, 4, () => ({ t: '개편 뒤 소속 명칭이 바뀌었습니다. 하는 일은 같았고 명함만 새로 찍었습니다.', k: 'note' })),
  E('lat_leg_visit_sir', [22, 70], [T('LAT_LEGATUS'), 'visit:siracusa'], 30, 3, () => ({ t: '시라쿠사에서 전달자를 만나려는 사람은 패밀리 사람이었습니다. 서한에는 그들의 이름이 없었습니다.', k: 'note' })),
  E('lat_leg_visit_col', [22, 70], [T('LAT_LEGATUS'), 'visit:columbia'], 30, 3, () => ({ t: '컬럼비아 관청에 서한을 전달하는 데 사흘이 걸렸습니다. 서한은 한 장이었습니다.', k: 'ev' })),
  E('lat_leg_visit_lei', [22, 70], [T('LAT_LEGATUS'), 'visit:leithanien'], 30, 3, () => ({ t: '라이타니엔 궁정의 음악회에 초대받았습니다. 음악보다 좌석 배치를 더 오래 기억했습니다.', k: 'note' })),
  E('lat_leg_visit_lgm', [22, 70], [T('LAT_LEGATUS'), 'visit:lungmen'], 30, 3, () => ({ t: '용문 거리에서 광륜을 가리라는 사람은 없었습니다. 보는 눈은 많았습니다.', k: 'note' })),
  E('lat_leg_summit', [22, 70], [T('LAT_LEGATUS')], 60, 0, () => ({ t: '만국 정상회담 준비로 한 해를 보냈습니다. 초청장 한 장에 서명이 넷 필요했습니다.', k: 'ev', fx: { hl: -2, standing: 3 } }), { c: (s) => s.year >= 1098 && s.year <= 1099 }),
  E('lat_itinerant_home', [16, 70], [N, 'itinerant'], 20, 3, () => ({ t: '한 해의 절반을 국경 밖에서 보냈습니다. 돌아오면 디저트 가게 메뉴가 바뀌어 있었습니다.', k: 'note' })),

  // ══════════ LAT_COHORS 호위대 병사·총기사 (핵심) ══════════
  E('lat_coh_rec_gun', [16, 28], [T('LAT_COHORS', 'recruit')], 30, 2, (s) => ({ t: sankta(s) ? '입대 첫날 수호총 점검을 받았습니다. 열두 살에 받은 총이 교관 손에서 분해되고 다시 조립되었습니다.' : '입대 첫날 지급 총을 받았습니다. 옆자리 산크타 동기는 자기 수호총을 그대로 썼습니다.', k: 'ev' })),
  E('lat_coh_rec_range', [16, 28], [T('LAT_COHORS', 'recruit')], 30, 2, (s) => ({ t: '사격 훈련. 표적은 멀었고' + (sankta(s) ? ' 옆 사람의 긴장이 광륜을 타고 함께 왔습니다.' : ' 산크타 동기들은 말없이 서로 호흡을 맞췄습니다.'), k: 'ev', fx: { cap: { skill: 0.05 } } })),
  E('lat_coh_rec_march', [16, 28], [T('LAT_COHORS', 'recruit')], 25, 3, () => ({ t: '행군. 성벽 둘레 14km를 하루에 돌았습니다.', k: 'ev', fx: { hl: -1 }, f: F('호위대 훈련 일지') })),
  E('lat_coh_rec_number', [16, 28], [T('LAT_COHORS', 'recruit')], 25, 3, () => ({ t: '교관은 이름 대신 번호로 불렀습니다. 번호를 외우는 데 하루가 걸렸습니다.', k: 'note' })),
  E('lat_coh_sol_gate', [17, 45], [T('LAT_COHORS', 'soldier')], 30, 2, () => ({ t: '성문 경비. 순례자 줄이 300명이었습니다. 살카즈는 없었고, 있을 수 없었습니다.', k: 'ev', fx: { standing: 1 }, f: F('호위대 성문 통행 기록') })),
  E('lat_coh_sol_night', [17, 45], [T('LAT_COHORS', 'soldier')], 30, 3, () => ({ t: '야간 순찰. 디저트 가게 불이 꺼지면 거리도 잠들었습니다.', k: 'note' })),
  E('lat_coh_sol_ceremony', [17, 45], [T('LAT_COHORS', 'soldier')], 25, 3, (s) => ({ t: '교황청 행사 경비. 종일 서 있었고 ' + eun(cul(s).rulerTitle) + ' 멀리서 지나갔습니다.', k: 'ev', fx: { hl: -1 } })),
  E('lat_coh_sol_leave', [17, 45], [T('LAT_COHORS', 'soldier')], 25, 3, (s) => ({ t: '분대 동기가 전역했습니다. 남은 사람끼리 ' + eul(cul(s).drink) + ' 마셨습니다.', k: 'warm', fx: { h: 1 } })),
  E('lat_coh_sq_recruits', [20, 50], [T('LAT_COHORS', 'squad')], 30, 2, () => ({ t: '분대장으로 신병 8명을 맡았습니다. 그중 2명이 리베리였고, 둘은 지급 총으로 사격했습니다.', k: 'ev', fx: { standing: 1 }, f: F('호위대 소대 편성표') })),
  E('lat_coh_sq_roster', [20, 50], [T('LAT_COHORS', 'squad')], 25, 3, () => ({ t: '교황청 호위 배치표를 짰습니다. 이름을 어디에 놓느냐가 그 사람의 하루였습니다.', k: 'note' })),
  E('lat_coh_sq_injury', [20, 50], [T('LAT_COHORS', 'squad')], 20, 3, () => ({ t: '분대원이 다쳤습니다. 보고서 작성은 분대장 몫이었습니다.', k: 'bad', fx: { h: -2 } })),
  E('lat_coh_sq_eval', [20, 50], [T('LAT_COHORS', 'squad')], 25, 3, () => ({ t: '분대 사격 평가 1위. 상은 없었고 다음 평가가 있었습니다.', k: 'ev', fx: { standing: 3 }, f: F('호위대 분대 사격 평가표') })),
  E('lat_coh_gk_command', [24, 60], [T('LAT_COHORS', 'gunknight')], 30, 2, () => ({ t: '총기사로 분견대를 이끌었습니다. 명령은 한 사람 입에서 나왔고 그 사람이 저였습니다.', k: 'ev', fx: { standing: 2 } })),
  E('lat_coh_gk_abroad', [24, 60], [T('LAT_COHORS', 'gunknight')], 25, 3, () => ({ t: '교황청 밖 임무. 타국 땅에서 총기사의 광륜을 처음 보는 사람들이 있었습니다.', k: 'note' })),
  E('lat_coh_gk_fallen', [24, 60], [T('LAT_COHORS', 'gunknight')], 15, 5, () => ({ t: '분견대원 하나가 타락 조짐을 보였다는 보고가 올라왔습니다. 조용히 처리되었습니다.', k: 'bad', fx: { h: -3 } })),
  E('lat_coh_gk_council', [24, 60], [T('LAT_COHORS', 'gunknight')], 25, 3, () => ({ t: '총기사 회의. 자리에 앉은 사람은 열이 안 되었습니다.', k: 'note' })),
  E('lat_coh_vet_ceremony', [40, 100], [T('LAT_COHORS', 'veteran')], 30, 2, () => ({ t: '최고참으로 신병 수여식에 섰습니다. 그 자리에 선 지 몇 해인지는 세지 않았습니다.', k: 'ev' })),
  E('lat_coh_vet_advice', [40, 100], [T('LAT_COHORS', 'veteran')], 25, 3, () => ({ t: '젊은 총기사들이 자문을 구했습니다. 답보다 침묵을 더 많이 주었습니다.', k: 'note', fx: { standing: 1 } })),
  E('lat_coh_vet_pope', [40, 100], [T('LAT_COHORS', 'veteran')], 20, 4, (s) => ({ t: cul(s).ruler + ' 알현. ' + iga(cul(s).rulerTitle) + ' 이름을 기억하고 있었습니다.', k: 'warm', fx: { h: 3 } })),
  E('lat_coh_vet_knee', [40, 100], [T('LAT_COHORS', 'veteran')], 25, 3, () => ({ t: '무릎이 아팠습니다. 사격은 여전히 정확했습니다.', k: 'note', fx: { hl: -2 } })),
  trans('lat_coh_trans', 'LAT_COHORS', [17, 100], {
    soldier: '훈련을 마치고 병사가 되었습니다. 소대 배치표에 이름이 올랐습니다.',
    squad: '분대장이 되었습니다. 분대원 여덟 이름을 하루에 외웠습니다.',
    gunknight: (s) => ({ t: '총기사로 서임되었습니다. 분견대 하나가 손에 들어왔습니다.' + (liberi(s) ? ' 리베리 총기사는 호위대가 기억하는 몇 명 안에 들었습니다.' : ''), k: 'big', fx: { h: 4 } }),
    veteran: '최고참이 되었습니다. 호위대에서 이름보다 별명이 더 자주 불렸습니다.',
  }),
  after('lat_coh_after', 'LAT_COHORS', [17, 100], {
    kia: '임무 중 크게 다쳤습니다. 호위대는 상이 연금을 정했고, 수호총은 반납하지 않았습니다.',
    heresy: '이단 혐의로 호위대를 떠났습니다. 국경을 넘을 때 수호총은 두고 갔습니다.',
    desert: '탈영 기록이 남았습니다. 돌아갈 수 없는 곳이 하나 생겼습니다.',
    discharged: '복무를 마쳤습니다. 수호총을 닦아 집 벽에 걸었습니다.',
    _: '호위대를 떠났습니다. 새벽 점호 시간에 눈이 떠지는 것은 한참 갔습니다.',
  }),
  E('lat_coh_aff_platoon', [16, 60], ['aff:LAT_COH_PLATOON'], 25, 3, () => ({ t: '소대 생활. 침상 열두 개, 코 고는 소리 셋.', k: 'warm' })),
  E('lat_coh_aff_detach', [16, 60], ['aff:LAT_COH_DETACH'], 25, 3, () => ({ t: '총기사 분견대 배치. 분견대는 총기사 하나와 병사 몇으로 움직였고, 명령은 한 줄로 왔습니다.', k: 'ev', fx: { standing: 1 } })),
  E('lat_coh_aff_papal', [16, 60], ['aff:LAT_COH_PAPAL'], 20, 4, () => ({ t: '교황 기사의 옛 휘장을 받았습니다. 지금은 쓰지 않는 휘장이었고, 그래서 더 조심히 달았습니다.', k: 'note', fx: { h: 1 } })),
  canon('lat_canon_fiammetta', [1096, 1107], [T('LAT_COHORS')], [16, 40], '리베리 집행자 하나가 디저트 가게 앞에서 총기 등록 서류와 타르트를 함께 받아 갔습니다. 어깨에 멘 것은 유탄발사기였습니다.'),

  // ══════════ LAT_MONASTERY 수도원 (핵심) ══════════
  E('lat_mon_ent_dawn', [8, 30], [T('LAT_MONASTERY', 'entry')], 30, 2, () => ({ t: '입문 첫해. 새벽 4시 기도와 빵 반죽이 같은 시각이었습니다.', k: 'ev', f: F('수도원 일과표') })),
  E('lat_mon_ent_rule', [8, 30], [T('LAT_MONASTERY', 'entry')], 25, 3, () => ({ t: '수도원 규칙서를 베꼈습니다. 52조였습니다.', k: 'note', fx: { cap: { learn: 0.05 } }, f: F('수도원 규칙서 사본') })),
  E('lat_mon_ent_cry', [8, 30], [T('LAT_MONASTERY', 'entry')], 25, 3, () => ({ t: '고아로 들어온 동기가 밤에 울었습니다. 아무도 묻지 않았고, 다음 날 그 아이는 빵을 하나 더 받았습니다.', k: 'warm', fx: { h: 1 } })),
  E('lat_mon_ent_brother', [8, 30], [T('LAT_MONASTERY', 'entry')], 25, 3, (s) => ({ t: eun(cul(s).elder) + ' 이름을 부르지 않고 "' + cul(s).address + '"라고 불렀습니다. 그 호칭에 익숙해지는 데 한 해가 걸렸습니다.', k: 'note' })),
  E('lat_mon_mem_guest', [12, 60], [T('LAT_MONASTERY', 'member')], 30, 2, () => ({ t: '외부 손님을 맞았습니다. 손님은 빵을 사러 온 사람이었습니다.', k: 'ev' })),
  E('lat_mon_mem_brew', [12, 60], [T('LAT_MONASTERY', 'member')], 25, 3, () => ({ t: '양조장 당번. 통 뚜껑을 열면 수도원이 조금 덜 엄숙했습니다.', k: 'warm', fx: { h: 1 } })),
  E('lat_mon_mem_visit', [12, 60], [T('LAT_MONASTERY', 'member')], 25, 3, () => ({ t: '교황청 심방. 하루 종일 청소했고 심방은 십오 분이었습니다.', k: 'note' })),
  E('lat_mon_mem_bread', [12, 60], [T('LAT_MONASTERY', 'member')], 25, 3, () => ({ t: '외곽 마을에 구호 빵 120개를 날랐습니다. 받는 사람은 수도원 이름을 몰랐습니다.', k: 'ev', fx: { standing: 1 }, f: F('수도원 출납 장부') })),
  E('lat_mon_sr_novice', [18, 70], [T('LAT_MONASTERY', 'senior')], 30, 2, () => ({ t: '선임으로 입문자를 맡았습니다. 밤에 우는 소리를 들었고, 다음 날 빵을 하나 더 주었습니다.', k: 'warm' })),
  E('lat_mon_sr_ledger', [18, 70], [T('LAT_MONASTERY', 'senior')], 25, 3, () => ({ t: '수도원 재정 장부. 숫자는 늘 모자랐고 기도는 늘 남았습니다.', k: 'note', fx: { h: -1 } })),
  E('lat_mon_sr_investor', [18, 70], [T('LAT_MONASTERY', 'senior')], 20, 4, () => ({ t: '해외 손님이 수도원 식품 투자를 이야기했습니다. 수도원장은 듣기만 했습니다.', k: 'note' })),
  E('lat_mon_sr_lecture', [18, 70], [T('LAT_MONASTERY', 'senior')], 25, 3, () => ({ t: '교리 강의. 질문이 날카로웠고, 모른다고 답했습니다.', k: 'ev', fx: { standing: 1 } })),
  E('lat_mon_abb_report', [30, 100], [T('LAT_MONASTERY', 'abbot')], 30, 2, () => ({ t: '수도원장으로 교황청에 연례 보고를 올렸습니다. 빵 매출이 기도 횟수보다 먼저 적혔습니다.', k: 'ev' })),
  E('lat_mon_abb_roof', [30, 100], [T('LAT_MONASTERY', 'abbot')], 25, 3, () => ({ t: '지붕 수리. 돈은 빵에서 나왔습니다.', k: 'note', fx: { money: -1 } })),
  E('lat_mon_abb_letter', [30, 100], [T('LAT_MONASTERY', 'abbot')], 20, 4, () => ({ t: '타국 수도원에서 서한이 왔습니다. 답장은 석 달 걸렸습니다.', k: 'note' })),
  E('lat_mon_abb_novices', [30, 100], [T('LAT_MONASTERY', 'abbot')], 25, 3, () => ({ t: '입문자 열 명을 받았습니다. 열 명 모두의 이름을 첫날 외웠습니다.', k: 'warm', fx: { h: 2 } })),
  trans('lat_mon_trans', 'LAT_MONASTERY', [9, 100], {
    member: '서원을 했습니다. 입문자 옷을 벗고 수도복을 받았습니다.',
    senior: '선임이 되었습니다. 방이 복도 끝으로 옮겨졌습니다. 거기가 조용했습니다.',
    abbot: (s) => ({ t: '수도원장으로 선출되었습니다. 열쇠 꾸러미가 생각보다 무거웠습니다.', k: 'big', fx: { h: 3 } }),
  }),
  after('lat_mon_after', 'LAT_MONASTERY', [9, 100], {
    heresy: '교리 심문 뒤 수도원 문이 닫혔습니다. 국경도 함께였습니다.',
    exile: '수도원을 떠나라는 결정이 내려왔습니다. 짐은 가방 하나였습니다.',
    _: '수도원을 나왔습니다. 새벽에 깨는 버릇은 남았습니다.',
  }),
  E('lat_mon_aff_landen', [8, 100], ['aff:LAT_MON_LANDEN'], 30, 2, () => ({ t: '랜든 수도원 빵 가마 당번. 새벽 4시에 불을 넣어 빵 200개를 냈습니다.', k: 'ev', fx: { hl: -1 }, f: F('랜든 수도원 출납 장부') })),
  E('lat_mon_aff_alster', [8, 100], ['aff:LAT_MON_ALSTER'], 30, 3, () => ({ t: '알스터 수도원의 아이스크림 기계가 또 넘치게 만들었습니다. 남은 것은 이웃 마을로 갔습니다.', k: 'warm', fx: { h: 1 } })),
  E('lat_mon_aff_ambrosius', [8, 100], ['aff:LAT_MON_AMBROSIUS'], 30, 2, (s) => ({ t: s.year < 1099 ? '암브로시우스 이동 수도원이 또 국경 하나를 넘었습니다. 창밖 풍경이 매주 바뀌었습니다.' : '암브로시우스 수도원이 라테라노에 돌아온 뒤였습니다. 바퀴는 멈췄고 기도 시간은 같았습니다.', k: 'note' })),
  E('lat_mon_aff_nursery', [8, 100], ['aff:LAT_MON_NURSERY'], 30, 3, () => ({ t: '양육 신전에서 아기들을 받았습니다. 탄생 의식에서 리베리 아기에게도 같은 말로 축복했습니다.', k: 'warm', fx: { h: 1 } })),

  // ══════════ LAT_GUARD 랜든 경비대 궁수 ══════════
  E('lat_gua_bel_register', [16, 40], [T('LAT_GUARD', 'believer')], 30, 2, () => ({ t: '랜든 수도원 신도로 등록했습니다. 라테라노 사람이 아니어도 활은 쥘 수 있었습니다.', k: 'ev' })),
  E('lat_gua_bel_bow', [16, 40], [T('LAT_GUARD', 'believer')], 30, 2, () => ({ t: '수도원 뜰에서 활을 쏘았습니다. 열 발 중 세 발이 표적에 갔습니다.', k: 'ev', fx: { cap: { skill: 0.05 } } })),
  E('lat_gua_arc_wall', [17, 55], [T('LAT_GUARD', 'archer')], 30, 2, () => ({ t: '경비대 궁수로 수도원 담장을 지켰습니다. 넘어오는 사람보다 넘어가는 빵이 많았습니다.', k: 'note' })),
  E('lat_gua_arc_escort', [17, 55], [T('LAT_GUARD', 'archer')], 30, 3, () => ({ t: '용병 계약으로 외부 호위를 나갔습니다. 수호총을 든 호위대원들이 궁수를 신기하게 보았습니다.', k: 'ev', fx: { standing: 2 } })),
  E('lat_gua_sq_five', [20, 55], [T('LAT_GUARD', 'squad')], 30, 2, () => ({ t: '조장이 되어 궁수 다섯을 맡았습니다. 다섯 중 셋이 다른 나라 말을 썼습니다.', k: 'ev' })),
  E('lat_gua_sq_rumor', [20, 55], [T('LAT_GUARD', 'squad')], 25, 3, () => ({ t: '공증소가 경비대 업무를 인수한다는 말이 돌았습니다. 조원들이 활을 더 자주 손질했습니다.', k: 'note', fx: { h: -1 } })),
  E('lat_gua_tr_same', [20, 60], [T('LAT_GUARD', 'transfer')], 30, 2, () => ({ t: '공증소 소속으로 수도원 경비를 계속했습니다. 활은 그대로, 상관만 바뀌었습니다.', k: 'ev' })),
  E('lat_gua_tr_payday', [20, 60], [T('LAT_GUARD', 'transfer')], 25, 3, () => ({ t: '봉급이 들어오는 날짜가 달라졌습니다. 공증소 날짜였습니다.', k: 'note' })),
  trans('lat_gua_trans', 'LAT_GUARD', [16, 60], {
    archer: '정식 경비대 궁수가 되었습니다. 활과 화살통을 받았습니다.',
    squad: '조장이 되었습니다. 조원 다섯의 활을 함께 손질했습니다.',
    transfer: '공증소 인수가 끝났습니다. 경비대 이름은 남았고 도장은 바뀌었습니다.',
  }),
  after('lat_gua_after', 'LAT_GUARD', [16, 60], {
    kia: '호위 임무 중 다쳤습니다. 계약서에는 치료비 조항이 있었고 다음 계약은 없었습니다.',
    contract_end: '계약이 끝났습니다. 활은 수도원에 두고 나왔습니다.',
    heresy: '교리 문제로 수도원과 나라를 함께 떠났습니다.',
    _: '경비대를 나왔습니다. 활 쏘는 손가락의 굳은살은 오래 남았습니다.',
  }),
  E('lat_gua_aff_landen', [16, 60], ['aff:LAT_GUA_LANDEN'], 25, 3, () => ({ t: '랜든 수도원 직속 경비. 빵 냄새가 초소까지 왔습니다.', k: 'warm' })),
  E('lat_gua_aff_notary', [16, 60], ['aff:LAT_GUA_NOTARY'], 25, 3, () => ({ t: '공증소 이관 뒤 집행자가 초소를 점검했습니다. 활을 보고 서류에 "총기 외 무기"라고 적었습니다.', k: 'note' })),

  // ══════════ LAT_GUN 총기 공방 장인 (생업) ══════════
  E('lat_gun_app_barrel', [14, 30], [T('LAT_GUN', 'apprentice')], 30, 2, () => ({ t: '견습 첫해. 총열을 닦는 일만 했습니다. 하루 20개, 한 해에 몇 개인지는 세지 않았습니다.', k: 'ev', fx: { cap: { skill: 0.05 } }, f: F('공방 견습 일지') })),
  E('lat_gun_app_disassemble', [14, 30], [T('LAT_GUN', 'apprentice')], 30, 3, () => ({ t: '장인이 견습의 조립품을 말없이 분해했습니다. 다음 날 다시 조립했습니다.', k: 'note' })),
  E('lat_gun_mas_first', [17, 60], [T('LAT_GUN', 'master')], 30, 2, () => ({ t: '장인으로 첫 총을 완성했습니다. 시험 사격은 다른 사람이 했습니다.', k: 'ev', fx: { standing: 2 } })),
  E('lat_gun_mas_backlog', [17, 60], [T('LAT_GUN', 'master')], 25, 3, () => ({ t: '주문 23건이 밀렸습니다. 공증소 등록 번호가 먼저 나오고 총이 나중에 나왔습니다.', k: 'note', f: F('공증소 총기 등록 대장') })),
  E('lat_gun_own_sign', [22, 65], [T('LAT_GUN', 'owner')], 30, 2, () => ({ t: '공방주로 간판을 올렸습니다. 간판보다 공증소 허가증이 먼저 걸렸습니다.', k: 'ev' })),
  E('lat_gun_own_apprentices', [22, 65], [T('LAT_GUN', 'owner')], 25, 3, () => ({ t: '견습 둘을 받았습니다. 둘 다 총열부터 닦였습니다.', k: 'warm' })),
  E('lat_gun_first_rank', [28, 70], [T('LAT_GUN', 'first')], 30, 2, () => ({ t: '1급 공방 평가를 받았습니다. 순위표에 공방 이름이 올라갔습니다.', k: 'ev', fx: { standing: 2 } })),
  E('lat_gun_first_export', [28, 70], [T('LAT_GUN', 'first')], 25, 3, () => ({ t: '타국 상인이 공방을 찾아왔습니다. 수출 서류는 공증소가 세 번 보았습니다.', k: 'note', fx: { money: 1 } })),
  trans('lat_gun_trans', 'LAT_GUN', [15, 70], {
    master: '견습을 마쳤습니다. 공방 이름이 새겨진 각인 도구를 받았습니다.',
    owner: '공방을 열었습니다. 첫 손님은 옆 공방 장인이었습니다.',
    first: '1급 공방 명단에 들었습니다. 명단은 매년 바뀌었고 올해는 들어갔습니다.',
  }),
  after('lat_gun_after', 'LAT_GUN', [15, 70], {
    ruin: '공방 문을 닫았습니다. 각인 도구는 팔지 않았습니다.',
    bankrupt: '빚이 공방을 가져갔습니다. 간판은 이웃 공방이 내려 주었습니다.',
    accident: '공방에서 사고가 났습니다. 손이 예전처럼 움직이지 않았습니다.',
    _: '공방을 나왔습니다. 쇠 냄새는 옷에서 한참 안 빠졌습니다.',
  }),
  E('lat_gun_aff_paganini', [14, 70], ['aff:LAT_GUN_PAGANINI'], 25, 3, () => ({ t: '파가니니 공방. 주인은 리베리였고 공방 총을 스스로 격발하지 못했습니다. 품질은 라테라노에서 두 번째 안에 들었습니다.', k: 'note' })),
  E('lat_gun_aff_vannini', [14, 70], ['aff:LAT_GUN_VANNINI'], 25, 3, () => ({ t: '반니니 공방의 주문서가 두 배로 왔습니다. 가마도 두 배로 뜨거웠습니다.', k: 'ev', fx: { hl: -1 } })),
  E('lat_gun_aff_griffin', [14, 70], ['aff:LAT_GUN_GRIFFIN'], 25, 3, () => ({ t: '그리핀 아스널에서 교육용 연습 장비를 만들었습니다. 쏘는 총보다 안 쏘는 총이 많았습니다.', k: 'note' })),
  E('lat_gun_aff_michaelion', [14, 70], ['aff:LAT_GUN_MICHAELION'], 25, 3, () => ({ t: '미카엘리온 공방가. 골목마다 쇠 냄새가 났고 아무도 그 냄새를 싫어하지 않았습니다.', k: 'warm' })),

  // ══════════ LAT_DESSERT 디저트 가게 (생업) ══════════
  E('lat_des_clk_counter', [12, 40], [T('LAT_DESSERT', 'clerk')], 30, 2, () => ({ t: '점원으로 계산대에 섰습니다. 하루 손님 60명, 절반은 단골, 절반은 순례자였습니다.', k: 'ev', f: F('가게 매출 장부') })),
  E('lat_des_clk_leftover', [12, 40], [T('LAT_DESSERT', 'clerk')], 25, 3, () => ({ t: '마감 뒤 남은 젤라토를 먹었습니다. 그것이 봉급의 일부였습니다.', k: 'warm', fx: { h: 1 } })),
  E('lat_des_pas_menu', [15, 60], [T('LAT_DESSERT', 'pastry')], 30, 2, () => ({ t: '제과사로 첫 신메뉴를 올렸습니다. 사흘 팔리고 내려갔습니다.', k: 'ev', fx: { cap: { skill: 0.05 } } })),
  E('lat_des_pas_dawn', [15, 60], [T('LAT_DESSERT', 'pastry')], 25, 3, () => ({ t: '새벽 반죽. 오븐이 켜지면 가게 앞 거리가 먼저 알았습니다.', k: 'note', fx: { hl: -1 } })),
  E('lat_des_own_register', [20, 65], [T('LAT_DESSERT', 'owner')], 30, 2, () => ({ t: '공증소에 영업 등록을 했습니다. 등록증에는 "식품 및 무기 판매"란이 있었습니다.', k: 'ev' })),
  E('lat_des_own_rent', [20, 65], [T('LAT_DESSERT', 'owner')], 25, 3, () => ({ t: '집세가 15% 올랐습니다. 타르트 값도 올렸습니다.', k: 'bad', fx: { h: -1 }, f: F('공증소 임대 등기') })),
  E('lat_des_fam_ammo', [25, 70], [T('LAT_DESSERT', 'famous')], 30, 2, () => ({ t: '진열장 한쪽에 탄약을 놓기 시작했습니다. 라테라노에서 손님 많은 가게는 다 그렇게 했습니다.', k: 'ev', fx: { money: 1 } })),
  E('lat_des_fam_pilgrim', [25, 70], [T('LAT_DESSERT', 'famous')], 25, 3, () => ({ t: '순례자들이 가게 이름을 알고 왔습니다. 사진을 찍고 디저트는 하나만 샀습니다.', k: 'note' })),
  trans('lat_des_trans', 'LAT_DESSERT', [13, 70], {
    pastry: '제과사가 되었습니다. 앞치마에 이름이 새겨졌습니다.',
    owner: '가게를 열었습니다. 첫날 손님 열둘, 그중 넷이 가족이었습니다.',
    famous: '라테라노에서 손님이 가장 많이 찾는 가게 중 하나가 되었습니다. 무기 판매 허가도 함께 왔습니다.',
  }),
  after('lat_des_after', 'LAT_DESSERT', [13, 70], {
    ruin: '가게를 닫았습니다. 간판은 이웃 가게가 가져갔습니다.',
    bankrupt: '빚이 가게를 가져갔습니다. 오븐은 마지막까지 따뜻했습니다.',
    _: '가게를 나왔습니다. 설탕 냄새가 옷에 남았습니다.',
  }),
  E('lat_des_aff_gelato', [12, 70], ['aff:LAT_DES_GELATO'], 25, 3, () => ({ t: '젤라토 기계가 고장 났습니다. 수리 기사가 오기 전까지 손으로 저었습니다.', k: 'note', fx: { hl: -1 } })),
  E('lat_des_aff_cactus', [12, 70], ['aff:LAT_DES_CACTUS'], 25, 3, () => ({ t: '선인장 타르트 단골은 노인들이었습니다. 한 분이 오지 않으면 가게가 먼저 알았습니다.', k: 'warm' })),
  E('lat_des_aff_sugarfree', [12, 70], ['aff:LAT_DES_SUGARFREE'], 25, 3, () => ({ t: '치과의사 구역 손님들은 무설탕을 좋아했습니다. 다른 구역에서는 팔리지 않았습니다.', k: 'note' })),
  E('lat_des_aff_alster', [12, 70], ['aff:LAT_DES_ALSTER'], 25, 3, () => ({ t: '알스터 수도원 납품. 수녀들이 아이스크림을 받으러 왔고 돌아갈 때 빵을 두고 갔습니다.', k: 'warm', fx: { h: 1 } })),

  // ══════════ LAT_TEACHER 교사·교수 ══════════
  E('lat_tea_ass_roll', [20, 40], [T('LAT_TEACHER', 'assistant')], 30, 2, () => ({ t: '보조 교사로 출석을 불렀습니다. 열네 해 무상교육의 첫해 아이들이었습니다.', k: 'ev' })),
  E('lat_tea_ass_sub', [20, 40], [T('LAT_TEACHER', 'assistant')], 25, 3, () => ({ t: '교사가 아픈 날 수업을 대신했습니다. 아이들이 더 조용했습니다.', k: 'note', fx: { standing: 1 } })),
  E('lat_tea_tea_ceremony', [22, 65], [T('LAT_TEACHER', 'teacher')], 30, 3, () => ({ t: '수호총 수여식에 학급 아이들과 갔습니다. 리베리 아이 둘은 뒷줄에 서 있었습니다.', k: 'note', fx: { h: -1 } })),
  E('lat_tea_tea_parents', [22, 65], [T('LAT_TEACHER', 'teacher')], 25, 3, () => ({ t: '학부모 면담. 성적보다 면허 시험 이야기가 길었습니다.', k: 'ev' })),
  E('lat_tea_pro_lecture', [28, 70], [T('LAT_TEACHER', 'professor')], 30, 2, () => ({ t: '첫 강의. 학생 30명 중 3명이 질문했습니다.', k: 'ev', fx: { standing: 1 }, f: F('우니베르시타스 수강 명부') })),
  E('lat_tea_pro_thesis', [28, 70], [T('LAT_TEACHER', 'professor')], 25, 3, () => ({ t: '논문 심사. 밤까지 읽었고 아침에 서명했습니다.', k: 'note', fx: { hl: -1 } })),
  E('lat_tea_dean_budget', [35, 75], [T('LAT_TEACHER', 'dean')], 30, 2, () => ({ t: '학장으로 학교 예산을 제6청에 올렸습니다. 회신은 반으로 돌아왔습니다.', k: 'ev' })),
  E('lat_tea_dean_speech', [35, 75], [T('LAT_TEACHER', 'dean')], 25, 3, () => ({ t: '졸업식 축사. 짧게 했고 박수는 길었습니다.', k: 'warm', fx: { h: 2 } })),
  trans('lat_tea_trans', 'LAT_TEACHER', [21, 75], {
    teacher: '정교사가 되었습니다. 학급 하나가 이름으로 불렸습니다.',
    professor: '교수로 임용되었습니다. 연구실 열쇠를 받았습니다.',
    dean: '학장으로 선출되었습니다. 회의가 수업을 대신했습니다.',
  }),
  after('lat_tea_after', 'LAT_TEACHER', [21, 75], {
    impeach: '교단에서 내려왔습니다. 학생들은 다음 주에도 등교했습니다.',
    scandal: '이름이 교무 공고에 났습니다. 교문을 다시 지나는 일은 없었습니다.',
    _: '학교를 나왔습니다. 분필 가루는 옷에 남았습니다.',
  }),
  E('lat_tea_aff_stmarcel', [20, 75], ['aff:LAT_TEA_STMARCEL'], 25, 3, () => ({ t: '생 마르셀 학교 운동장에서 사격 연습 소리가 났습니다. 수업 중에도 아무도 놀라지 않았습니다.', k: 'note' })),
  E('lat_tea_aff_universitas', [20, 75], ['aff:LAT_TEA_UNIVERSITAS'], 25, 3, () => ({ t: '우니베르시타스 미카엘리오니스의 도서관. 서가 하나가 통째로 총기 공학이었습니다.', k: 'note' })),

  // ══════════ LAT_MEDIC 병원 심리·공감과 ══════════
  E('lat_med_res_silent', [20, 35], [T('LAT_MEDIC', 'resident')], 30, 2, () => ({ t: '수련의 첫해. 공감과 환자는 말을 하지 않아도 되었고, 그래서 더 어려웠습니다.', k: 'ev' })),
  E('lat_med_res_night', [20, 35], [T('LAT_MEDIC', 'resident')], 25, 2, () => ({ t: '당직 밤. 환자 셋, 커피 다섯 잔.', k: 'note', fx: { hl: -1 } })),
  E('lat_med_doc_room', [24, 65], [T('LAT_MEDIC', 'doctor')], 30, 2, () => ({ t: '첫 진료실을 받았습니다. 창은 없었습니다.', k: 'ev' })),
  E('lat_med_doc_empathy', [24, 65], [T('LAT_MEDIC', 'doctor')], 25, 3, (s) => ({ t: sankta(s) ? '산크타 환자의 감정이 진료실에 가득 찼습니다. 차트를 보기 전에 이미 알았습니다.' : '산크타 환자들끼리는 말이 없어도 통했습니다. 비산크타 의사는 차트를 보았습니다.', k: 'note' })),
  E('lat_med_head_roster', [30, 70], [T('LAT_MEDIC', 'head')], 30, 2, () => ({ t: '과장이 되어 당직표를 짰습니다. 자기 이름은 맨 아래 적었습니다.', k: 'ev', fx: { standing: 1 } })),
  E('lat_med_head_meeting', [30, 70], [T('LAT_MEDIC', 'head')], 25, 3, () => ({ t: '병원 회의. 예산 이야기가 환자 이야기보다 길었습니다.', k: 'note', fx: { h: -1 } })),
  trans('lat_med_trans', 'LAT_MEDIC', [21, 70], {
    doctor: '수련을 마쳤습니다. 명패가 걸렸습니다.',
    head: '과장이 되었습니다. 진료실에 창이 생겼습니다.',
  }),
  after('lat_med_after', 'LAT_MEDIC', [21, 70], {
    overwork: '과로로 쓰러졌습니다. 병원은 휴직을 권했고 복직 자리는 없었습니다.',
    scandal: '이름이 병원 공고에 났습니다. 명패는 그날 내려갔습니다.',
    _: '병원을 나왔습니다. 당직 전화 소리가 한동안 환청으로 남았습니다.',
  }),
  E('lat_med_aff_central', [20, 70], ['aff:LAT_MED_CENTRAL'], 25, 3, () => ({ t: '파구스 스테보누스 중앙병원의 복도는 길었습니다. 하루에 몇 번 오가는지는 세지 않았습니다.', k: 'note' })),
  E('lat_med_aff_empathy', [20, 70], ['aff:LAT_MED_EMPATHY'], 25, 3, () => ({ t: '공감과. 산크타 환자들은 진료실에 들어오기 전에 이미 상태가 전해졌습니다.', k: 'note' })),
  E('lat_med_aff_psych', [20, 70], ['aff:LAT_MED_PSYCH'], 25, 3, () => ({ t: '심리과 상담. 환자는 광륜 이야기를 했고 의사는 잠 이야기를 물었습니다.', k: 'note' })),
  E('lat_med_1101', [20, 70], [T('LAT_MEDIC')], 60, 0, () => ({ t: '사변 뒤 환자가 밀렸습니다. 공감과 대기실이 복도까지 이어졌습니다.', k: 'bad', fx: { hl: -3, standing: 3 } }), { c: (s) => s.year >= 1101 && s.year <= 1102 }),

  // ══════════ LAT_OFFICE 출판·관광 회사원 ══════════
  E('lat_off_staff_proof', [18, 40], [T('LAT_OFFICE', 'staff')], 30, 2, () => ({ t: '출판사 사원으로 원고를 교정했습니다. 여행 안내서 개정판의 지명 표기가 하루 일이었습니다.', k: 'ev' })),
  E('lat_off_staff_desk', [18, 40], [T('LAT_OFFICE', 'staff')], 25, 3, () => ({ t: '관광 안내 데스크. 순례자 질문의 절반은 디저트 가게 위치였습니다.', k: 'warm' })),
  E('lat_off_edit_book', [24, 60], [T('LAT_OFFICE', 'editor')], 30, 2, () => ({ t: '편집장으로 첫 책을 냈습니다. 서점 진열대 맨 아래 칸이었습니다.', k: 'ev', fx: { standing: 1 } })),
  E('lat_off_edit_season', [24, 60], [T('LAT_OFFICE', 'editor')], 25, 3, () => ({ t: '지점장으로 순례 성수기를 났습니다. 계시의 탑 앞 줄이 하루 종일 이어졌습니다.', k: 'note', fx: { hl: -1 } })),
  E('lat_off_exec_meeting', [30, 65], [T('LAT_OFFICE', 'exec')], 30, 2, (s) => ({ t: s.year >= 1101 ? '임원 회의. 사변 뒤 이민 이야기가 매출 이야기 옆에 있었습니다.' : '임원 회의. 해외 지사 보고가 절반이었습니다.', k: 'ev' })),
  E('lat_off_exec_report', [30, 65], [T('LAT_OFFICE', 'exec')], 25, 3, () => ({ t: '임원으로 해외 지사 보고를 받았습니다. 숫자는 라테라노 밖에서 더 컸습니다.', k: 'note' })),
  trans('lat_off_trans', 'LAT_OFFICE', [19, 65], {
    editor: '편집장이 되었습니다. 책상에 원고 더미가 세 배로 늘었습니다.',
    exec: '임원이 되었습니다. 회의실 자리가 정해졌습니다.',
  }),
  after('lat_off_after', 'LAT_OFFICE', [19, 65], {
    layoff: '정리 통보를 받았습니다. 책상 서랍에 교정지가 남아 있었습니다.',
    bankrupt: '회사가 문을 닫았습니다. 마지막 책은 창고에 남았습니다.',
    _: '회사를 나왔습니다. 출근길 디저트 가게는 그대로였습니다.',
  }),
  E('lat_off_aff_montblanc', [18, 65], ['aff:LAT_OFF_MONTBLANC'], 25, 3, () => ({ t: '몽블랑 체스트넛 바스크 출판사. 사명보다 긴 책 제목은 없었습니다.', k: 'note' })),
  E('lat_off_aff_tour', [18, 65], ['aff:LAT_OFF_TOUR'], 25, 3, () => ({ t: '관광 회사. 순례 성수기와 비수기가 봉급을 정했습니다.', k: 'note' })),

  // ══════════ LAT_DENTIST 치과의사 (생업, 천대) ══════════
  E('lat_den_app_district', [14, 35], [T('LAT_DENTIST', 'apprentice')], 30, 2, () => ({ t: '치과의사 구역에서 견습을 시작했습니다. 구역 안 치과 11곳, 구역 밖 사람들은 이 길을 모른 척했습니다.', k: 'ev', f: F('치과의사 구역 등록 명부') })),
  E('lat_den_app_tools', [14, 35], [T('LAT_DENTIST', 'apprentice')], 25, 3, () => ({ t: '집게를 닦는 일. 환자는 하루에 2명이었습니다.', k: 'note', f: F('치과의사 구역 진료 기록') })),
  E('lat_den_den_sign', [17, 65], [T('LAT_DENTIST', 'dentist')], 30, 2, () => ({ t: '간판은 작았고 구역 안에서만 보였습니다.', k: 'ev' })),
  E('lat_den_den_night', [17, 65], [T('LAT_DENTIST', 'dentist')], 25, 3, () => ({ t: '구역 밖 손님이 밤에 몰래 왔습니다. 아침 거리에서 마주치면 모르는 사람이었습니다.', k: 'note', fx: { money: 1 } })),
  E('lat_den_eld_kids', [30, 80], [T('LAT_DENTIST', 'elder')], 30, 2, () => ({ t: '구역 터줏대감. 구역 아이들은 인사했고 구역 밖 어른들은 하지 않았습니다.', k: 'note' })),
  E('lat_den_eld_sugarfree', [30, 80], [T('LAT_DENTIST', 'elder')], 25, 3, () => ({ t: '구역에 무설탕 디저트 가게가 생겼습니다. 손님이 줄까 걱정했지만 줄지 않았습니다.', k: 'warm', fx: { h: 1 } })),
  trans('lat_den_trans', 'LAT_DENTIST', [15, 80], {
    dentist: '견습을 마쳤습니다. 구역 안 셋방에 진료 의자를 놓았습니다.',
    elder: '구역에서 가장 오래 남은 치과의사가 되었습니다.',
  }),
  after('lat_den_after', 'LAT_DENTIST', [15, 80], {
    ruin: '진료 의자를 팔았습니다. 구역은 그대로였습니다.',
    _: '진료를 그만두었습니다. 구역 밖으로 나가는 길은 여전히 멀었습니다.',
  }),
  E('lat_den_aff_district', [14, 80], ['aff:LAT_DEN_DISTRICT'], 25, 3, () => ({ t: '치과의사 구역의 저녁. 거리 하나 건너면 다른 라테라노였습니다.', k: 'note' })),

  // ══════════ LAT_FALLEN 타락·추방 산크타 (강제) ══════════
  // 발병 → 엔진이 즉시 추방(정책 expel). 그다음 해 국외에서 공증소 관리 진로로 들어간다. 진로의 nation 이 라테라노라 enterTrack 이 되돌려 보내지 않도록 cur 를 잠시 맞춘다.
  E('lat_fallen_judged', [1, 95], ['laterano', 'stigma:infected', 'migrant', '!' + T('LAT_FALLEN'), '!rhodes'], 200, 0, (s) => {
    const S = s.S; S.flags.latFallen = S.age;
    const cur = S.cur, root = S.root; S.cur = NAT; S.root = NAT;
    const ok = s.enterTrack('LAT_FALLEN', { how: 'forced', via: 'diagnosed', aff: 'LAT_FAL_EXPELLED', quiet: true });
    S.cur = cur; S.root = root;
    if (!ok) return { t: '성문 밖이었습니다. 공민증은 손에 그대로였습니다.', k: 'bad' };
    return { t: '성문 밖이었습니다. 공민증은 손에, ' + (sankta(s) ? '수호총은 허리에' : '짐은 등에') + ' 그대로였습니다. 공증소 사람이 수당 안내문을 건네고 돌아갔습니다. 라테라노의 공식 감염자 수는 여전히 0명이었습니다.', k: 'bad', fx: { h: -4 }, f: F('공증소 추방 공민 관리 대장') };
  }, { c: (s) => s.S.born === NAT && s.S.flags.oriOutcome === 'expel' && !s.S.flags.latFallen }),
  E('lat_fal_jud_gate', [1, 95], [T('LAT_FALLEN', 'judged')], 30, 2, () => ({ t: '추방 판정 뒤 첫해. 공민증은 그대로였고 성문도 그대로 닫혀 있었습니다.', k: 'bad' })),
  E('lat_fal_jud_notice', [1, 95], [T('LAT_FALLEN', 'judged')], 30, 2, () => ({ t: '국외 거처로 공증소 수당 통지서가 왔습니다. 숫자 옆에 "순응"이라는 칸이 있었습니다.', k: 'note' })),
  E('lat_fal_man_meds', [1, 95], [T('LAT_FALLEN', 'managed')], 30, 2, () => ({ t: '공증소 관리 대상으로 매달 약품 3종을 받았습니다. 감독관은 영수증에 서명을 받고 갔습니다.', k: 'ev', fx: { hl: 1 }, f: F('공증소 추방 공민 관리 대장') })),
  E('lat_fal_man_neighbor', [1, 95], [T('LAT_FALLEN', 'managed')], 25, 3, (s) => ({ t: sankta(s) ? '같은 처지의 산크타가 근처에 살았습니다. 광륜 둘이 밤에 조금 밝았습니다.' : '같은 처지의 라테라노 사람이 근처에 살았습니다. 서로 공민증 이야기는 하지 않았습니다.', k: 'warm', fx: { h: 2 } })),
  E('lat_fal_abr_job', [14, 95], [T('LAT_FALLEN', 'abroad')], 30, 2, () => ({ t: '해외 취업. 고용주는 라테라노 공민증을 보고 서류를 반으로 줄였습니다.', k: 'ev', fx: { money: 1 } })),
  E('lat_fal_abr_supervise', [14, 95], [T('LAT_FALLEN', 'abroad')], 25, 3, () => ({ t: '감독관 복무. 이번에는 다른 추방 공민에게 수당을 건네는 쪽이었습니다.', k: 'note' })),
  trans('lat_fal_trans', 'LAT_FALLEN', [1, 95], {
    managed: '공증소 관리 명단에 올랐습니다. 수당과 약품, 그리고 방문 일정표.',
    abroad: '해외 취업 허가가 났습니다. 공증소 감독은 분기 한 번으로 줄었습니다.',
  }),
  E('lat_fal_aff_expelled', [1, 95], ['aff:LAT_FAL_EXPELLED'], 25, 3, () => ({ t: '추방 감염 공민 모임. 모두 공민증을 지니고 있었고 아무도 꺼내지 않았습니다.', k: 'note' })),
  E('lat_fal_aff_abroad', [1, 95], ['aff:LAT_FAL_ABROAD'], 25, 3, (s) => ({ t: sankta(s) ? '타락 산크타로 해외에서 일했습니다. 광륜은 어두웠고 그 나라 사람들은 그 차이를 몰랐습니다.' : '라테라노 출신으로 해외에서 일했습니다. 출신을 묻는 사람은 적었습니다.', k: 'note' })),
  E('lat_fal_aff_service', [1, 95], ['aff:LAT_FAL_SERVICE'], 25, 3, () => ({ t: '경범 정부 복무. 감독관 감시 아래 서류 일을 했습니다. 서류는 다른 추방 공민의 것이었습니다.', k: 'note' })),
  canon('lat_canon_mostima', [1090, 1107], ['laterano', T('LAT_FALLEN')], [10, 60], '광륜이 흐릿한 여자가 국경 검문소를 지나갔습니다. 병사들은 서류를 보고도 아무 말 없이 길을 비켰습니다.'),

  // ══════════ 생업·계절·명절·동네 (A11: LAT_GUN·LAT_DESSERT·LAT_DENTIST) ══════════
  E('lat_live_saintday', [12, 90], [N, 'arch:A11'], 25, 3, (s) => ({ t: fest(s, 1) + '. 가게 문을 닫고 거리로 나갔습니다. 행렬이 지나가는 동안 디저트는 공짜였습니다.', k: 'warm', fx: { h: 2 } })),
  E('lat_live_newshop', [12, 90], [N, 'arch:A11'], 20, 4, () => ({ t: '새 디저트 가게가 또 열렸습니다. 거리마다 가게가 있는데도 줄이 섰습니다.', k: 'note' })),
  E('lat_live_license', [16, 90], [N, 'arch:A11'], 20, 5, () => ({ t: '면허 갱신 시험 날. 사격장 줄에 16살 아이들과 60 넘은 노인이 섞여 섰습니다. 합격률은 92%였습니다.', k: 'ev', f: F('공증소 면허 시험 공고') })),
  E('lat_live_cactus', [12, 90], [N, 'arch:A11'], 20, 4, () => ({ t: '선인장 타르트 계절. 노인들은 좋아했고 아이들은 접시를 밀었습니다.', k: 'warm' })),
  E('lat_live_gunreturn', [12, 90], [N, 'arch:A11'], 15, 5, () => ({ t: '이웃집 장례 뒤 공증소 사람이 와서 수호총을 가져갔습니다. 유족은 영수증을 받았습니다.', k: 'note', fx: { h: -1 } })),
  E('lat_live_vending', [12, 90], [N, 'arch:A11'], 20, 4, () => ({ t: '거리의 자동 아이스크림 판매기가 고장 났습니다. 아이들이 가게로 왔습니다.', k: 'warm', fx: { money: 1 } })),
  E('lat_live_century', [12, 90], [N, 'arch:A11'], 25, 0, (s) => ({ t: fest(s, 0) + ' 준비로 거리가 바뀌었습니다. 백 년에 한 번 있는 일에 가게마다 신메뉴를 냈습니다.', k: 'ev', fx: { h: 1 } }), { c: (s) => s.year % 100 >= 98 || s.year % 100 === 0 }),
  E('lat_live_district_warn', [12, 90], [N, 'arch:A11', '!' + T('LAT_DENTIST')], 15, 6, () => ({ t: '치과의사 구역 쪽으로는 가지 말라고 아이들에게 말했습니다. 어른들도 가지 않았습니다.', k: 'note' })),

  // ══════════ 종족 관계: 리베리의 2등 시민 일상(rel:cultural) ══════════
  E('lat_lib_counter', [16, 80], [N, 'rel:cultural'], 25, 3, () => ({ t: '공증소 창구에서 산크타 공민은 광륜을 보이고 리베리 공민은 공민증을 보였습니다. 줄은 같았습니다.', k: 'note' })),
  E('lat_lib_silence', [14, 80], [N, 'rel:cultural'], 25, 3, () => ({ t: '이웃 산크타들이 아무 말 없이 서로를 알아듣는 자리에 있었습니다. 말로 물어야 했습니다.', k: 'note', fx: { h: -1 } })),
  E('lat_lib_license', [16, 20], [N, 'rel:cultural'], 60, 0, () => ({ t: '총기 면허 시험에 합격했습니다. 지급 총이었습니다. 옆자리 산크타는 열두 살부터 쥔 총이었습니다.', k: 'ev', fx: { cap: { skill: 0.05 } } })),
  E('lat_lib_posting', [16, 60], [N, 'rel:cultural'], 15, 6, () => ({ t: '총기사 공고에 "리베리 지원 가능"이라고 적혀 있었습니다. 지원한 리베리를 아는 사람은 없었습니다.', k: 'note' })),
  E('lat_lib_child', [25, 60], [N, 'rel:cultural'], 25, 0, () => ({ t: '이웃 아이들의 수호총 수여식에 갔습니다. 우리 아이 차례는 오지 않았고, 아이는 그것을 먼저 알았습니다.', k: 'bad', fx: { h: -2 } }), { c: (s) => s.S.fam.kids.some((k) => k.alive) }),

  // ══════════ 종족 관계: 산크타(race:sankta) ══════════
  E('lat_san_license', [16, 17], [N, 'race:sankta'], 80, 0, () => ({ t: '총기 면허 시험. 사격 5발, 필기 10문항. 합격증은 공증소 도장이 찍혀 나왔습니다.', k: 'ev', fx: { cap: { skill: 0.05 } }, f: F('공증소 총기 면허 시험 요강') })),
  E('lat_san_school_end', [19, 20], [N, 'race:sankta'], 60, 0, () => ({ t: '열네 해 무상교육이 끝났습니다. 마지막 수업은 총기 안전이었습니다.', k: 'ev' })),
  E('lat_san_empathy', [14, 90], [N, 'race:sankta'], 25, 4, () => ({ t: '이웃의 슬픔이 광륜을 타고 먼저 왔습니다. 무슨 일인지는 나중에 들었습니다.', k: 'note', fx: { h: -1 } })),
  E('lat_san_quarrel', [14, 90], [N, 'race:sankta'], 20, 5, () => ({ t: '공감으로 전해진 감정과 입 밖의 말이 어긋났습니다. 작은 의견 차이가 하루 종일 갔습니다.', k: 'bad', fx: { h: -2 } })),
  E('lat_san_abroad_silence', [16, 90], ['laterano', 'race:sankta', 'migrant', '!rhodes'], 20, 5, () => ({ t: '라테라노를 떠나 지낸 지 오래였습니다. 광륜의 공감이 닿는 사람이 주위에 없었고, 침묵이 길었습니다.', k: 'note', fx: { h: -2 } })),

  // ══════════ 이주 신참: 라테라노의 이방인 공민(newcomer) ══════════
  E('lat_new_sankta', [10, 80], [N, 'newcomer', 'race:sankta'], 60, 0, () => ({ t: '외국에서 태어난 산크타도 공민이었습니다. 공증소 창구에서 공민증이 그날 나왔습니다.', k: 'warm', fx: { h: 2 } })),
  E('lat_new_other', [10, 80], [N, 'newcomer', '!race:sankta'], 40, 3, () => ({ t: '이방인으로 라테라노에 살았습니다. 공민증 대신 체류증이었고 디저트 값은 같았습니다.', k: 'note' })),
  E('lat_new_gun', [16, 80], [N, 'newcomer'], 30, 4, () => ({ t: '공증소에 총기 소지 신고를 했습니다. 수호총이 아닌 총은 등록이 길었습니다.', k: 'note' })),
];

// ───────────────────────────── 결정 ─────────────────────────────
export const decisions = {
  // 교황청: 청 배치 희망(서기 단계 1회)
  lat_curia_posting: {
    tags: [T('LAT_CURIA', 'scribe')], once: true,
    ok: (s) => !!s.S.track && s.S.age - s.S.track.since >= 1,
    build: (s) => ({ title: '청 배치', body: '서기 임기가 끝나갑니다. 배치 희망서를 낼 수 있습니다. 제6청은 외근이 많고, 제7청은 서류가 봉인되어 옵니다.',
      choices: [{ k: 'six', label: '제6청 민정·장례', sub: '외근·호적·수호총 반납', auto: 1 }, { k: 'seven', label: '제7청 외교·국방', sub: '봉인 서류', auto: s.S.cap.learn >= 0.5 ? 1 : 0.3 }, { k: 'stay', label: '지금 청에 남는다', auto: 1.2 }] }),
    apply: (s, k) => {
      if (k === 'stay') return '배치 희망서를 내지 않았습니다.';
      if (k === 'seven' && s.S.cap.learn < 0.5 && s.rng.chance(0.6)) return { t: '제7청 희망서는 반려되었습니다. 이유는 적혀 있지 않았습니다.', k: 'bad', fx: { h: -1 } };
      s.S.track.aff = k === 'six' ? 'LAT_CUR_6' : 'LAT_CUR_7';
      return { t: (k === 'six' ? '제6청' : '제7청') + ' 배치가 났습니다. 책상을 옮겼고, 복도가 달라졌습니다.', k: 'ev', fx: { standing: 2 } };
    },
  },
  // 공증소: 채무자의 집
  lat_notary_debtor: {
    tags: [T('LAT_NOTARY')], once: false, gap: 6,
    ok: (s) => s.S.age >= 17,
    build: () => ({ title: '기한', body: '채무 이행 감시로 간 집에 아이가 아팠습니다. 규정은 오늘이 기한이라고 했습니다.',
      choices: [{ k: 'extend', label: '기한을 적어 준다', sub: '관청 평판 −', auto: 1 }, { k: 'rule', label: '규정대로 집행한다', sub: '관청 평판 +', auto: 1 }] }),
    apply: (s, k) => k === 'extend'
      ? { t: '다음 날짜를 적어 주었습니다. 장부에는 "연기"라고 썼고 그 글자는 감사에서 눈에 띄었습니다.', k: 'ev', fx: { standing: -3, h: 2 } }
      : { t: '규정대로 집행했습니다. 집을 나올 때 뒤를 돌아보지 않았습니다.', k: 'bad', fx: { standing: 3, h: -3 } },
  },
  // 공증소: 타락자 감독관 보직
  lat_notary_fallen_post: {
    tags: [T('LAT_NOTARY'), '!aff:LAT_NOT_FALLEN'], once: true,
    ok: (s) => !!s.S.track && s.S.track.stage >= 1 && s.rng.chance(0.3),
    build: () => ({ title: '보직', body: '타락자 감독관 자리가 비었습니다. 국외 거처를 돌며 추방 공민에게 수당과 약품을 전하는 일입니다. 아무도 먼저 손을 들지 않았습니다.',
      choices: [{ k: 'yes', label: '맡는다', auto: 0.8 }, { k: 'no', label: '맡지 않는다', auto: 1 }] }),
    apply: (s, k) => { if (k === 'no') return '손을 들지 않았습니다. 다른 사람이 맡았습니다.'; s.S.track.aff = 'LAT_NOT_FALLEN'; return { t: '타락자 감독관이 되었습니다. 첫 순회에서 받은 영수증은 11장이었습니다.', k: 'ev', fx: { standing: 2, h: -1 }, f: F('공증소 추방 공민 관리 대장') }; },
  },
  // 만국 전달자: 임무지의 부탁
  lat_legatus_favor: {
    tags: [T('LAT_LEGATUS', 'legatus')], once: false, gap: 5,
    ok: (s) => s.rng.chance(0.4),
    build: () => ({ title: '부탁', body: '임무지의 관리가 라테라노 공민이 아닌 사람의 통행 편의를 부탁했습니다. 사례는 두툼했습니다.',
      choices: [{ k: 'no', label: '거절한다', auto: 1.5 }, { k: 'yes', label: '들어준다', sub: '사례를 받는다', auto: 0.5 }] }),
    apply: (s, k) => k === 'no'
      ? { t: '거절했습니다. 그 관리는 다음 방문에도 같은 얼굴로 맞았습니다.', k: 'note', fx: { standing: 2 } }
      : (s.rng.chance(0.3) ? (s.fall('scandal'), false) : { t: '들어주었습니다. 사례는 받았고 보고서에는 적지 않았습니다.', k: 'bad', fx: { money: medX(s, 0.5), standing: -3 } }),
  },
  // 호위대: 동족에게 발포할 상황(산크타)
  lat_cohors_fire: {
    tags: [T('LAT_COHORS'), 'race:sankta'], once: false, gap: 8,
    ok: (s) => !!s.S.track && s.S.track.stage >= 1 && s.rng.chance(0.25),
    build: () => ({ title: '명령', body: '공무 집행 중 상대가 산크타였습니다. 명령은 분명했고 공무 집행은 타락이 아니라고 배웠습니다.',
      choices: [{ k: 'fire', label: '명령대로 한다', auto: 1 }, { k: 'hold', label: '총을 내린다', auto: 0.8 }] }),
    apply: (s, k) => {
      if (k === 'fire') return { t: '명령대로 했습니다. 광륜은 멀쩡했습니다. 그날 밤 고해 차량 앞에 섰습니다.', k: 'bad', fx: { standing: 5, h: -6 } };
      if (s.rng.chance(0.15)) { s.fall('kia'); return false; }
      return { t: '총을 내렸습니다. 상대도 내렸습니다. 보고서에는 "대치 후 해산"이라고 적었습니다.', k: 'ev', fx: { standing: -4, h: 1 } };
    },
  },
  // 호위대: 패스파인더 접촉(이탈 결사)
  lat_cohors_pathfinder: {
    tags: [T('LAT_COHORS')], once: true,
    ok: (s) => !!s.S.track && s.S.age >= 20 && s.S.track.stage >= 1 && s.year >= 1090 && s.rng.chance(0.2),
    build: () => ({ title: '접촉', body: '전직 호위대원이라는 사람이 찾아왔습니다. 호위대를 떠난 사람들이 모이는 곳이 있다고 했습니다. 이름은 말하지 않았습니다.',
      choices: [{ k: 'report', label: '보고한다', auto: 1 }, { k: 'ignore', label: '못 들은 것으로 한다', auto: 1 }, { k: 'join', label: '따라간다', sub: '탈영', auto: 0.2 }] }),
    apply: (s, k) => {
      if (k === 'report') return { t: '보고했습니다. 그 사람은 다시 보이지 않았습니다.', k: 'note', fx: { standing: 4 } };
      if (k === 'ignore') return { t: '못 들은 것으로 했습니다. 그 사람도 다시 오지 않았습니다.', k: 'note' };
      s.fall('desert'); return false;
    },
  },
  // 수도원: 랜든의 용병 업무
  lat_monastery_guard: {
    tags: ['aff:LAT_MON_LANDEN'], once: true,
    ok: (s) => !!s.S.track && s.S.age >= 16 && s.S.track.stage >= 1 && s.rng.chance(0.4),
    build: () => ({ title: '계약', body: '랜든 수도원이 외부 호위 계약을 받았습니다. 수도사도 함께 나가야 사람 수가 맞습니다. 빵은 그동안 다른 사람이 굽습니다.',
      choices: [{ k: 'go', label: '함께 나간다', auto: 1 }, { k: 'stay', label: '빵을 굽는다', auto: 1 }] }),
    apply: (s, k) => k === 'go'
      ? { t: '호위에 나갔습니다. 돌아오니 빵은 조금 탔고 수도원 금고는 조금 찼습니다.', k: 'ev', fx: { standing: 3, hl: -2, money: medX(s, 0.2) } }
      : { t: '빵을 구웠습니다. 돌아온 사람들이 그 빵을 먹었습니다.', k: 'warm', fx: { h: 1 } },
  },
  // 채무 불이행 → 공증소 추심(타락·추방 입구 중 하나)
  lat_debt_notice: {
    tags: [N, '!' + T('LAT_FALLEN')], once: true,
    ok: (s) => s.S.age >= 20 && s.S.money < -s.med * 1,
    build: (s) => ({ title: '추심', body: '공증소 추심 통지가 왔습니다. 기한 안에 갚지 못하면 공증소 관리 대상이 됩니다.',
      choices: [{ k: 'pay', label: '갚는다', sub: '남은 돈을 전부 쓴다', auto: 1 }, { k: 'cant', label: '갚지 못한다', auto: 0.6 }] }),
    apply: (s, k) => {
      if (k === 'pay') { s.S.money = 0; return { t: '갚았습니다. 통장은 비었고 공증소 장부에서 이름이 빠졌습니다.', k: 'ev' }; }
      if (s.rng.chance(0.5)) { s.S.money = 0; return { t: '기한이 지났습니다. 공증소는 가진 것을 가져갔고, 명단에는 올리지 않았습니다.', k: 'bad', fx: { h: -2 } }; }
      s.S.money = 0;
      s.enterTrack('LAT_FALLEN', { how: 'forced', via: 'debt', aff: 'LAT_FAL_SERVICE', quiet: true });
      return { t: '기한이 지났습니다. 공증소 관리 대상이 되었고, 감독관 감시 아래 정부 복무가 붙었습니다. 공민증은 그대로였습니다.', k: 'bad', fx: { h: -4 } };
    },
  },
  // 혼인 유형 덮어쓰기(라테라노 3종). 다른 나라에서는 엔진 문구로 넘긴다
  marry_blessing: marryDecision('blessing',
    (s, pr) => wa(pr.name) + ' 혼담이 오갑니다. 사제의 축복으로 맺는 혼인입니다. 수도원 뜰에서 짧은 예식을 하고 공증소에는 뒤에 신고합니다.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람입니다.' : ''),
    (s, pr) => wa(pr.name) + ' 혼인했습니다. 사제가 축복했고 수도원 뜰에 포도주 두 잔이 놓였습니다.'),
  marry_notarized: marryDecision('notarized',
    (s, pr) => wa(pr.name) + ' 혼담이 오갑니다. 공증소 창구에서 등록하는 혼인입니다. 친권과 재산 계약서가 먼저이고 축복은 나중입니다.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람입니다.' : ''),
    (s, pr) => wa(pr.name) + ' 혼인했습니다. 공증소 집행자가 서류 세 장에 도장을 찍었고, 그중 한 장은 수호총 공동 등록이었습니다.'),
  marry_mixed: marryDecision('mixed',
    (s, pr) => wa(pr.name) + ' 혼담이 오갑니다. 상대는 ' + (pr.race === 'sankta' ? '산크타' : '산크타가 아닙니다') + '. 자녀는 비산크타로 태어납니다. 양가가 그 문장을 먼저 읽었습니다.',
    (s, pr) => wa(pr.name) + ' 혼인했습니다. 광륜 하나와 광륜 없는 머리 하나가 한 서류에 올랐습니다.'),
  // 주거 결정 덮어쓰기(라테라노). 다른 나라는 엔진 문구
  home_change: {
    once: false, gap: 5, at: 0.7,
    ok: ENGINE_DECISIONS.home_change.ok,
    build: (s) => {
      if (!here(s)) return ENGINE_DECISIONS.home_change.build(s);
      const opts = homeChangeOptions(s).slice(0, 3); if (!opts.length) return null;
      return { title: '집', body: '집을 마련할 만큼 모였습니다. 공증소 등기에는 집주인 이름과 수호총 번호가 같은 줄에 적힙니다.',
        choices: opts.map((h) => ({ k: h.id, label: h.name, sub: Math.round(s.med * h.buy).toLocaleString() + ' LMD', auto: h.w ?? 1 })).concat([{ k: 'no', label: '그대로 산다', auto: 1 }]) };
    },
    apply: (s, k) => {
      if (!here(s)) return ENGINE_DECISIONS.home_change.apply(s, k);
      if (k === 'no') return '그대로 살기로 했습니다. 집세는 다음 달에도 나갔습니다.';
      const h = homeChangeOptions(s).find((x) => x.id === k);
      if (!h || !setHousing(s, h, { buy: true, quiet: true })) return '등기는 나지 않았습니다.';
      return { t: eul(h.name) + ' 마련했습니다. 공증소 등기 서류에 도장이 찍히는 데 오전이 다 갔습니다.', k: 'warm', fx: { h: 3 } };
    },
  },
};

export default { events, decisions };
