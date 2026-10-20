// W9f 미노스 진로 콘텐츠(국가 전용, D40). 계약: docs/설계_명세_v1.md §11 + "W7 메모 — 스키마 고정".
// 핵심: MIN_CIVIC→MIN_TEMPLE(치안관→사제 사다리, 감염자는 사제 불가·사제 감염은 아크로티 좌천)·MIN_BOAT(델피 운하 뱃사공)·MIN_ATHLETE(힘노이의 지혜)·MIN_SOLDIER(국경 수비·용병).
// 나머지: MIN_SECURITY·MIN_FARM·MIN_TRADE·MIN_ART·MIN_BORDER. 힘노이의 지혜 대회 자체는 bigevents 몫이면 그쪽이 우선이라 여기서는 진로 안의 출전 서사만 쓴다.
// 거주 기준 태그 'nation:minos', 출생 기준 'minos'.
import { F, cul, fest, medX, eul, iga, eun, wa, ro } from '../_util.js';
import { ENGINE_DECISIONS } from '../../src/engine/choices.js';
import { marriageP, rollMarriageType, makeProspect, marry, familyOpposes } from '../../src/engine/marriage.js';
import { homeChangeOptions, setHousing } from '../../src/engine/housing.js';

const NAT = 'minos';
const N = 'nation:' + NAT;
const T = (id, st) => 'track:' + id + (st ? ':' + st : '');
const E = (id, a, tags, w, gap, run, x) => ({ id, a, tags, w, gap, run, ...(x || {}) });
const stId = (s) => (s.stage ? s.stage.id : null);
const here = (s) => s.S.cur === NAT;
const forte = (s) => s.S.race === 'forte';

function trans(id, track, a, texts) {
  return { id, a, tags: [T(track)], w: 90, gap: 1,
    c: (s) => !!s.S.track && s.S.track.stage > 0 && s.S.age - s.S.track.stageSince <= 1 && texts[stId(s)] != null && !s.S.flags['tr_' + id + '_' + stId(s)],
    run: (s) => { const k = stId(s); s.S.flags['tr_' + id + '_' + k] = s.S.age; const t = texts[k] || '자리가 바뀌었습니다.'; return typeof t === 'function' ? t(s) : { t, k: 'ev', fx: { h: 1 } }; } };
}
function after(id, track, a, texts, tag = NAT) {
  return { id, a, tags: [tag], w: 100,
    c: (s) => !s.S.track && s.S.flags.lastTrack === track && s.S.age - s.S.flags.lastTrackLeftAt <= 2 && !['retire', 'switch', 'death', 'rhodes', 'homemaker'].includes(s.S.flags.lastTrackHow),
    run: (s) => { const f = s.S.flags; const c = f.lastFallAt === f.lastTrackLeftAt ? f.lastFall : null; const t = (c && texts[c]) || texts[f.lastTrackHow] || texts._; return { t: typeof t === 'function' ? t(s) : t, k: 'loss' }; } };
}
function canon(id, years, tags, a, text, extraC) {
  return { id, a, tags, w: 30,
    c: (s) => s.year >= years[0] && s.year <= years[1] && (s.S.flags.canonSeen || 0) < 3 && (!extraC || extraC(s)),
    run: (s) => { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; return { t: typeof text === 'function' ? text(s) : text, k: 'note' }; } };
}
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
      if (k === 'decline') return '혼담을 거절했습니다.';
      if (familyOpposes(s, p.prospect)) return { t: '양가가 반대했습니다. 종족이 다르다는 말이 식탁에서 한 번 나왔고, 그것으로 끝났습니다.', k: 'bad' };
      if (!marry(s, p.prospect, p.type, { quiet: true })) return '혼인은 이루어지지 않았습니다.';
      return { t: okText(s, p.prospect), k: 'warm', fx: { h: 4 } };
    },
  };
}

export const events = [
  // ══════════ MIN_CIVIC 구역 공직 (핵심: 치안관→감독관→평의회) ══════════
  E('min_civ_mag_night', [22, 50], [T('MIN_CIVIC', 'magistrate')], 30, 2, () => ({ t: '구역 치안관으로 밤 순찰을 돌았습니다. 사건은 포도주 값 다툼 1건, 사제에게 올릴 것은 없었습니다.', k: 'ev', f: F('신전 서기관 구역 치안 기록') })),
  E('min_civ_mag_vote', [22, 50], [T('MIN_CIVIC', 'magistrate')], 25, 3, () => ({ t: '구역 선출 투표가 다시 돌아왔습니다. 득표 142, 상대 97. 사제가 결과를 승인했습니다.', k: 'ev', fx: { standing: 2 }, f: F('신전 서기관 구역 선출 기록') })),
  E('min_civ_mag_temple', [22, 50], [T('MIN_CIVIC', 'magistrate')], 25, 3, () => ({ t: '치안관 결정 하나를 신전에 올렸습니다. 사제의 승인은 사흘 뒤 왔고 한 글자가 바뀌어 있었습니다.', k: 'note' })),
  E('min_civ_sup_ledger', [26, 60], [T('MIN_CIVIC', 'supervisor')], 30, 2, () => ({ t: '시정감독관으로 구역 장부를 봤습니다. 수확철 나룻배 배정표가 가장 두꺼웠습니다.', k: 'ev', fx: { standing: 1 } })),
  E('min_civ_sup_rebuild', [26, 60], [T('MIN_CIVIC', 'supervisor')], 25, 3, () => ({ t: '제1신전 재건 노역 배정. 시민 5명 중 1명이 이름을 올렸고, 감독관은 그 명단을 신전에 가져갔습니다.', k: 'note', f: F('신전 서기관 재건 노역 명부') })),
  E('min_civ_sup_sargon', [26, 60], [T('MIN_CIVIC', 'supervisor')], 25, 3, () => ({ t: '사르곤 사절 응대. 통역은 있었고 웃음은 없었습니다.', k: 'note', fx: { h: -1 } })),
  E('min_civ_cou_seat', [32, 80], [T('MIN_CIVIC', 'council')], 30, 2, (s) => ({ t: cul(s).ruler + ' 자리. 발언 순서가 도시 순서였고, 아테누스가 늘 먼저였습니다.', k: 'ev' })),
  E('min_civ_cou_priest', [32, 80], [T('MIN_CIVIC', 'council')], 25, 3, () => ({ t: '평의회 결정이 사제단에 올라갔습니다. 승인은 왔고, 승인이 오기까지 한 계절이 걸렸습니다.', k: 'note' })),
  E('min_civ_cou_shard', [32, 80], [T('MIN_CIVIC', 'council')], 20, 4, () => ({ t: '도편 투표가 열렸습니다. 이름이 적힌 조각이 광장에 쌓였고, 위원들은 자기 이름을 찾지 않는 척했습니다.', k: 'bad', fx: { h: -2 } })),
  trans('min_civ_trans', 'MIN_CIVIC', [23, 80], {
    supervisor: '시정감독관으로 임명되었습니다. 선출이 아니라 임명이었고, 그 차이를 구역 사람들이 먼저 알았습니다.',
    council: (s) => ({ t: '평의회 위원이 되었습니다. 신전 계단을 올라가는 쪽이 되었습니다.', k: 'big', fx: { h: 3 } }),
  }),
  after('min_civ_after', 'MIN_CIVIC', [23, 80], {
    exile: '도편 투표에서 이름이 가장 많이 나왔습니다. 도시를 떠났습니다.',
    impeach: '탄핵이 있었습니다. 사제가 승인했고 그것으로 끝이었습니다.',
    scandal: '이름이 광장 공고에 났습니다. 다음 선출에는 나가지 않았습니다.',
    _: '공직을 떠났습니다. 구역 사람들은 여전히 치안관이라고 불렀습니다.',
  }),
  E('min_civ_aff_athenus', [22, 80], ['aff:MIN_CIV_ATHENUS'], 25, 3, () => ({ t: '아테누스. 극장 앞 광장이 구역이었고 밤마다 연극이 치안관보다 늦게 끝났습니다.', k: 'note' })),
  E('min_civ_aff_corinia', [22, 80], ['aff:MIN_CIV_CORINIA'], 25, 3, () => ({ t: '코리니아. 상인 다툼이 구역 사건의 대부분이었고, 다툼은 대개 돈으로 끝났습니다.', k: 'note', fx: { money: 1 } })),
  E('min_civ_aff_lacedaemon', [22, 80], ['aff:MIN_CIV_LACEDAEMON'], 25, 3, () => ({ t: '라케다이몬 평의회. 격투장 쪽 구역이었고 치안관도 창을 들 줄 알아야 했습니다.', k: 'note', fx: { cap: { skill: 0.03 } } })),

  // ══════════ MIN_TEMPLE 신전 사제 (핵심) ══════════
  E('min_tem_asp_rule', [12, 28], [T('MIN_TEMPLE', 'aspirant')], 30, 2, () => ({ t: '지망생 첫해. 신전 규칙 48조는 지루했고 지루한 것이 규칙이라고 선배가 말했습니다.', k: 'ev', f: F('신전 서기관 규칙서 사본') })),
  E('min_tem_asp_epic', [12, 28], [T('MIN_TEMPLE', 'aspirant')], 25, 3, () => ({ t: '건국 서사시를 외웠습니다. 12영웅의 이름이 먼저였고 자기 이름은 나중이었습니다.', k: 'note', fx: { cap: { learn: 0.05 } } })),
  E('min_tem_asp_exam', [12, 28], [T('MIN_TEMPLE', 'aspirant')], 25, 3, () => ({ t: '신전 검사. 몸에 결정이 없는지 보는 것이었고, 아무도 그 이유를 묻지 않았습니다.', k: 'note' })),
  E('min_tem_srv_oil', [15, 40], [T('MIN_TEMPLE', 'servant')], 30, 2, () => ({ t: '신전 봉사자로 등잔 기름을 채웠습니다. 12영웅 앞에 등잔 12개, 매일 아침.', k: 'ev', f: F('신전 서기관 기름 출납') })),
  E('min_tem_srv_pilgrim', [15, 40], [T('MIN_TEMPLE', 'servant')], 25, 3, () => ({ t: '순례자들을 안내했습니다. 질문은 많았고 사제만 답할 수 있는 것이었습니다.', k: 'note', fx: { standing: 1 } })),
  E('min_tem_srv_games', [15, 40], [T('MIN_TEMPLE', 'servant')], 25, 3, (s) => ({ t: fest(s, 0) + ' 기간. 신전이 선수들에게 올리브 관을 내렸고, 봉사자가 관을 들었습니다.', k: 'warm', fx: { h: 1 } })),
  E('min_tem_pri_approve', [20, 80], [T('MIN_TEMPLE', 'priest')], 30, 2, () => ({ t: '사제로 구역 결정 7건을 승인했습니다. 치안관의 글씨를 읽고 한 글자를 고쳤습니다.', k: 'ev', fx: { standing: 1 }, f: F('신전 서기관 승인 대장') })),
  E('min_tem_pri_boring', [20, 80], [T('MIN_TEMPLE', 'priest')], 25, 3, () => ({ t: '신전의 하루는 형식과 규칙이었습니다. 지루했고, 지루한 것이 평화라고 믿기로 했습니다.', k: 'note' })),
  E('min_tem_pri_infected', [20, 80], [T('MIN_TEMPLE', 'priest')], 20, 4, () => ({ t: '감염 판정을 받은 지망생을 돌려보냈습니다. 규칙이었고 규칙을 읽는 것이 사제의 일이었습니다.', k: 'bad', fx: { h: -2 } })),
  E('min_tem_chief_oracle', [30, 95], [T('MIN_TEMPLE', 'chief')], 30, 2, () => ({ t: '수석 사제로 신탁을 받았습니다. 꿈과 신탁을 구분하는 것이 가장 오래 걸렸습니다.', k: 'ev' })),
  E('min_tem_chief_council', [30, 95], [T('MIN_TEMPLE', 'chief')], 25, 3, () => ({ t: '평의회 결정이 올라왔습니다. 승인 도장을 찍기 전에 한 계절을 두었습니다.', k: 'note', fx: { standing: 1 } })),
  E('min_tem_chief_sargon', [30, 95], [T('MIN_TEMPLE', 'chief')], 20, 4, (s) => ({ t: s.year >= 1095 ? '사르곤과의 불가침 소식이 신전에 왔습니다. 변경 사제가 한 일이라고 했습니다.' : '변경에서 습격 보고가 올라왔습니다. 신전은 기도했고, 기도는 변경까지 가는 데 오래 걸렸습니다.', k: 'note' })),
  trans('min_tem_trans', 'MIN_TEMPLE', [13, 95], {
    servant: '신전 봉사자가 되었습니다. 등잔 기름 열쇠를 받았습니다.',
    priest: (s) => ({ t: '사제 서임. 12영웅 앞에서 서사시 첫 줄을 읊었습니다.' + (forte(s) ? '' : ' 포르테가 아닌 사제는 신전에서 손에 꼽혔습니다.'), k: 'big', fx: { h: 4 } }),
    chief: (s) => ({ t: '수석 사제가 되었습니다. 신탁을 받는 쪽이 되었습니다.', k: 'big', fx: { h: 3 } }),
  }),
  after('min_tem_after', 'MIN_TEMPLE', [13, 95], {
    heresy: '교리 문제가 있었습니다. 신전 계단을 다시 오르는 일은 없었습니다.',
    _: '신전을 떠났습니다. 새벽 등잔 시간에 눈이 떠지는 것은 한참 갔습니다.',
  }),
  // 사제의 감염 → 변경 아크로티 좌천(결과만)
  E('min_tem_akroti', [15, 95], [T('MIN_TEMPLE'), 'known', '!aff:MIN_TEM_AKROTI'], 300, 0, (s) => { s.S.track.aff = 'MIN_TEM_AKROTI'; if (s.S.track.stage > 1) { s.S.track.stage = 2; s.S.track.stageSince = s.S.age; } return { t: '감염 판정 뒤 변경 아크로티 신전 발령이 났습니다. 좌천이라는 말은 아무도 쓰지 않았고 모두 알았습니다.', k: 'loss', fx: { h: -4, standing: -10 } }; }),
  E('min_tem_aff_heroes', [12, 95], ['aff:MIN_TEM_HEROES'], 25, 3, () => ({ t: '12영웅 신전. 계단은 높았고 순례자는 매일 그 계단을 올랐습니다.', k: 'note' })),
  E('min_tem_aff_endymion', [12, 95], ['aff:MIN_TEM_ENDYMION'], 25, 3, () => ({ t: '엔디미온 신전. 꿈을 적는 장부가 있었고, 신탁은 그 장부에서 골랐습니다.', k: 'note', fx: { cap: { arts: 0.03 } } })),
  E('min_tem_aff_akroti', [12, 95], ['aff:MIN_TEM_AKROTI'], 30, 2, () => ({ t: '변경 아크로티 신전. 신도의 절반은 민병이었고 기도 뒤에 창 손질이 있었습니다.', k: 'note' })),
  canon('min_canon_pallas', [1096, 1105], ['aff:MIN_TEM_AKROTI'], [12, 60], '변경으로 좌천된 사제가 마을 민병 앞에서 창 잡는 법을 가르쳤습니다. 신전 사람들은 그 이름을 작게 말했습니다.'),

  // ══════════ MIN_BOAT 델피 운하 뱃사공 (핵심, 생업) ══════════
  E('min_boa_dis_pole', [12, 30], [T('MIN_BOAT', 'disciple')], 30, 2, () => ({ t: '제자로 장대를 잡았습니다. 배는 돌았고 스승은 웃지 않았습니다.', k: 'ev', fx: { cap: { skill: 0.05 } } })),
  E('min_boa_dis_names', [12, 30], [T('MIN_BOAT', 'disciple')], 25, 3, () => ({ t: '운하의 굽이마다 이름이 있었습니다. 외우는 데 한 해, 몸이 아는 데 두 해.', k: 'note' })),
  E('min_boa_dis_apple', [12, 30], [T('MIN_BOAT', 'disciple')], 25, 3, () => ({ t: '사과 수확철. 배정표에 제자 배는 없었고, 그래도 사과 상자를 날랐습니다.', k: 'ev', fx: { money: 1 } })),
  E('min_boa_dis_fall', [12, 30], [T('MIN_BOAT', 'disciple')], 20, 4, () => ({ t: '운하에 빠졌습니다. 스승이 장대로 끌어올렸고, 그날 저녁 포도주를 한 잔 주었습니다.', k: 'warm', fx: { h: 1, hl: -1 } })),
  E('min_boa_boa_fare', [15, 65], [T('MIN_BOAT', 'boatman')], 30, 2, () => ({ t: '뱃사공으로 하루 10번 운하를 건넸습니다. 손님은 올리브 상자와 사람이 반반이었습니다.', k: 'ev', f: F('선착장 뱃삯 장부') })),
  E('min_boa_boa_harvest', [15, 65], [T('MIN_BOAT', 'boatman')], 30, 2, () => ({ t: '수확철 나룻배 배정. 배정표를 두고 선착장에서 목소리가 높았습니다. 치안관이 왔고 배정표는 그대로였습니다.', k: 'bad', fx: { h: -1 } })),
  E('min_boa_boa_festival', [15, 65], [T('MIN_BOAT', 'boatman')], 25, 3, (s) => ({ t: fest(s, 1) + '. 배에 꽃을 걸었고 그날은 뱃삯을 받지 않았습니다.', k: 'warm', fx: { h: 2 } })),
  E('min_boa_boa_city', [15, 65], [T('MIN_BOAT', 'boatman')], 20, 4, () => ({ t: '도시가 양지로 자리를 옮겼습니다. 덜 익은 과일을 익히기 위해서였고, 운하 물길도 조금 바뀌었습니다.', k: 'note' })),
  E('min_boa_dock_roster', [28, 80], [T('MIN_BOAT', 'dockmaster')], 30, 2, () => ({ t: '선착장장으로 배정표를 짰습니다. 수확철 배정표 한 장에 뱃사공 30명의 한 달이 걸려 있었습니다.', k: 'ev', fx: { standing: 1 }, f: F('선착장 배정표') })),
  E('min_boa_dock_dispute', [28, 80], [T('MIN_BOAT', 'dockmaster')], 25, 3, () => ({ t: '배정 다툼 중재. 치안관까지 가지 않게 하는 것이 선착장장의 일이었습니다.', k: 'note', fx: { standing: 1 } })),
  E('min_boa_dock_disciple', [28, 80], [T('MIN_BOAT', 'dockmaster')], 25, 3, () => ({ t: '제자 하나가 운하에 빠졌습니다. 장대로 끌어올렸고 저녁에 포도주를 한 잔 주었습니다.', k: 'warm', fx: { h: 1 } })),
  E('min_boa_dock_priest', [28, 80], [T('MIN_BOAT', 'dockmaster')], 20, 4, () => ({ t: '사제 지망에 떨어져 뱃사공이 된 사람이 선착장에 있었습니다. 그 사람이 운하 이름을 가장 잘 알았습니다.', k: 'note' })),
  trans('min_boa_trans', 'MIN_BOAT', [13, 80], {
    boatman: '자기 배를 받았습니다. 장대에 이름을 새겼습니다.',
    dockmaster: '선착장장이 되었습니다. 배정표를 짜는 쪽이 되었습니다.',
  }),
  after('min_boa_after', 'MIN_BOAT', [13, 80], {
    ruin: '배정에서 밀려 배를 넘겼습니다. 운하 이름은 아직 외우고 있었습니다.',
    drowning: '운하 사고가 있었습니다. 끌려 나왔고 다시 장대를 잡지 않았습니다.',
    scandal: '배정 다툼에서 이름이 올랐습니다. 선착장은 다른 사람에게 배를 주었습니다.',
    _: '뱃사공을 그만두었습니다. 물 위에 선 느낌이 한 달 갔습니다.',
  }),
  E('min_boa_aff_dock', [12, 80], ['aff:MIN_BOA_DOCK'], 25, 3, () => ({ t: '델피 운하 선착장. 배정표가 벽에 붙었고 아침마다 사람들이 그 앞에 섰습니다.', k: 'note' })),
  E('min_boa_aff_indep', [12, 80], ['aff:MIN_BOA_INDEP'], 25, 3, () => ({ t: '독립 뱃사공. 배정표 밖에서 손님을 받았고 손님은 적었고 뱃삯은 자기가 정했습니다.', k: 'note' })),

  // ══════════ MIN_ATHLETE 격투·경기 선수 (핵심, 힘노이의 지혜) ══════════
  E('min_ath_tra_dawn', [12, 25], [T('MIN_ATHLETE', 'trainee')], 30, 2, () => ({ t: '훈련생 새벽. 라케다이몬 언덕을 3번 뛰어 올랐고 내려올 때는 걸었습니다.', k: 'ev', fx: { cap: { skill: 0.08 }, hl: 1 }, f: F('훈련장 일지') })),
  E('min_ath_tra_coach', [12, 25], [T('MIN_ATHLETE', 'trainee')], 25, 3, () => ({ t: '코치가 자세를 고쳐 주었습니다. 말은 없었고 손으로 어깨를 돌렸습니다.', k: 'note' })),
  E('min_ath_tra_olive', [12, 25], [T('MIN_ATHLETE', 'trainee')], 25, 3, (s) => ({ t: '식사는 ' + cul(s).food + '. 훈련생은 두 배로 먹었고 두 배로 뛰었습니다.', k: 'warm' })),
  E('min_ath_tra_watch', [12, 25], [T('MIN_ATHLETE', 'trainee')], 25, 3, () => ({ t: '선배의 경기를 관중석에서 보았습니다. 이긴 쪽도 진 쪽도 올리브 관을 받지 않았습니다. 관은 한 명만 받습니다.', k: 'note' })),
  E('min_ath_fig_bout', [15, 35], [T('MIN_ATHLETE', 'fighter')], 30, 2, (s) => ({ t: '라케다이몬 격투. ' + (s.rng.chance(0.55) ? '이겼습니다. 관중이 이름을 불렀고 그 이름이 처음 낯설었습니다.' : '졌습니다. 다음 경기 날짜가 그날 저녁 나왔습니다.'), k: 'ev', fx: { standing: 2, hl: -1 } })),
  E('min_ath_fig_injury', [15, 35], [T('MIN_ATHLETE', 'fighter')], 20, 3, () => ({ t: '경기 중 다쳤습니다. 한 계절을 쉬었고 그동안 다른 선수가 자리를 채웠습니다.', k: 'bad', fx: { hl: -3, standing: -2 } })),
  E('min_ath_fig_temple', [15, 35], [T('MIN_ATHLETE', 'fighter')], 25, 3, () => ({ t: '신전 사제가 경기장에 왔습니다. 우승자에게 관을 주고 돌아갔습니다. 다른 선수들은 그 뒷모습을 보았습니다.', k: 'note' })),
  E('min_ath_fig_crowd', [15, 35], [T('MIN_ATHLETE', 'fighter')], 25, 3, () => ({ t: '관중석에서 이름을 부르는 아이가 있었습니다. 다음 날 그 아이가 훈련장 문 앞에 서 있었습니다.', k: 'warm', fx: { h: 2 } })),
  E('min_ath_hym_arrive', [17, 35], [T('MIN_ATHLETE', 'hymnoi')], 30, 2, (s) => ({ t: fest(s, 0) + ' 출전. 힘노이산 아래 선수촌에 들어갔고, 거기서는 도시 이름으로 불렸습니다.', k: 'ev', fx: { standing: 1 } })),
  E('min_ath_hym_bout', [17, 35], [T('MIN_ATHLETE', 'hymnoi')], 30, 2, (s) => ({ t: '대회 경기. ' + (s.rng.chance(0.45) ? '이겼습니다. 12영웅 신전 쪽에서 종이 울렸습니다.' : '졌습니다. 상대 도시 사람들이 환호했고, 그 소리가 산에 메아리쳤습니다.'), k: 'ev', fx: { standing: 3, hl: -1 } })),
  E('min_ath_hym_envoy', [17, 35], [T('MIN_ATHLETE', 'hymnoi')], 20, 4, () => ({ t: '타국 사절이 관중석에 앉았습니다. 경기는 외교였고 선수는 그것을 몰라야 잘했습니다.', k: 'note' })),
  E('min_ath_hym_crown', [17, 35], [T('MIN_ATHLETE', 'hymnoi')], 20, 4, () => ({ t: '올리브 관을 받았습니다. 관은 가벼웠고 그날 밤 잠은 오지 않았습니다.', k: 'warm', fx: { h: 4, standing: 4 } })),
  E('min_ath_leg_statue', [20, 60], [T('MIN_ATHLETE', 'legend')], 30, 2, () => ({ t: '3연승. 라케다이몬 광장에 이름이 새겨졌습니다. 돌에 새기는 데 석 달이 걸렸습니다.', k: 'ev', fx: { standing: 2 } })),
  E('min_ath_leg_temple', [20, 60], [T('MIN_ATHLETE', 'legend')], 25, 3, () => ({ t: '신전에서 사람이 왔습니다. 사제 발탁 이야기였고, 조건은 하나였습니다. 몸에 결정이 없을 것.', k: 'note' })),
  E('min_ath_leg_kids', [20, 60], [T('MIN_ATHLETE', 'legend')], 25, 3, () => ({ t: '훈련장에 아이들이 몰렸습니다. 모두 같은 자세를 흉내 냈고 모두 틀렸습니다.', k: 'warm', fx: { h: 2 } })),
  E('min_ath_leg_old', [20, 60], [T('MIN_ATHLETE', 'legend')], 25, 3, () => ({ t: '무릎이 말을 듣지 않는 날이 늘었습니다. 전설은 아침마다 무릎을 문질렀습니다.', k: 'note', fx: { hl: -2 } })),
  trans('min_ath_trans', 'MIN_ATHLETE', [13, 60], {
    fighter: '정식 선수가 되었습니다. 경기 일정표에 이름이 올랐습니다.',
    hymnoi: (s) => ({ t: fest(s, 0) + ' 출전권을 받았습니다. 도시가 이름을 외웠습니다.', k: 'big', fx: { h: 4 } }),
    legend: (s) => ({ t: '3연승. 광장에 이름이 새겨졌습니다. 다음 날 아침 훈련은 같았습니다.', k: 'big', fx: { h: 5 } }),
  }),
  after('min_ath_after', 'MIN_ATHLETE', [13, 60], {
    injury: '경기에서 크게 다쳤습니다. 관중석에서 보는 쪽이 되었습니다.',
    scandal: '경기 외 일로 이름이 올랐습니다. 출전 명단에서 빠졌습니다.',
    _: '선수 생활을 마쳤습니다. 새벽에 언덕을 보면 다리가 먼저 움직였습니다.',
  }),
  E('min_ath_aff_lacedaemon', [12, 60], ['aff:MIN_ATH_LACEDAEMON'], 25, 3, () => ({ t: '라케다이몬 격투. 모래 위에서 시작하고 모래 위에서 끝났습니다.', k: 'note' })),
  E('min_ath_aff_hymnoi', [12, 60], ['aff:MIN_ATH_HYMNOI'], 25, 3, () => ({ t: '대회 선수단. 군사 훈련에서 온 종목이라 교관이 코치였습니다.', k: 'note', fx: { cap: { skill: 0.03 } } })),
  E('min_ath_aff_track', [12, 60], ['aff:MIN_ATH_TRACK'], 25, 3, () => ({ t: '미노스 육상. 멀리서 온 전승이라고 했고, 트랙은 올리브 밭 사이였습니다.', k: 'note' })),

  // ══════════ MIN_SOLDIER 투창병·펠타스트 (핵심, 국경) ══════════
  E('min_sol_rec_javelin', [16, 30], [T('MIN_SOLDIER', 'recruit')], 30, 2, () => ({ t: '신병 투창 훈련. 10발 중 3발이 표적에 갔고 7발은 주워 왔습니다.', k: 'ev', fx: { cap: { skill: 0.05 } }, f: F('미노스군 훈련 기록') })),
  E('min_sol_rec_hill', [16, 30], [T('MIN_SOLDIER', 'recruit')], 25, 3, () => ({ t: '산악 행군. 고개를 넘으면 또 고개였고 사르곤 쪽 하늘이 보였습니다.', k: 'ev', fx: { hl: -1 } })),
  E('min_sol_rec_hymn', [16, 30], [T('MIN_SOLDIER', 'recruit')], 25, 3, () => ({ t: '행군 찬가를 배웠습니다. 점령기에 금지되었던 노래라고 교관이 말했습니다.', k: 'note', fx: { h: 1 } })),
  E('min_sol_rec_border', [16, 30], [T('MIN_SOLDIER', 'recruit')], 25, 3, () => ({ t: '국경 마을에 배치되었습니다. 마을 사람들이 신병에게 올리브를 주었습니다.', k: 'warm' })),
  E('min_sol_pel_raid', [17, 45], [T('MIN_SOLDIER', 'peltast')], 30, 2, () => ({ t: '습격 경보. 투창을 들고 고개로 올라갔고, 내려올 때 창은 하나 줄었습니다.', k: 'bad', fx: { standing: 2, hl: -1 } })),
  E('min_sol_pel_mercenary', [17, 45], [T('MIN_SOLDIER', 'peltast')], 25, 3, () => ({ t: '외국 용병 부대가 옆에 주둔했습니다. 빅토리아 말을 썼고 봉급은 미노스보다 많았습니다.', k: 'note' })),
  E('min_sol_pel_village', [17, 45], [T('MIN_SOLDIER', 'peltast')], 25, 3, () => ({ t: '변경 마을 수비. 민병들과 함께 섰고 민병의 창은 더 낡았습니다.', k: 'ev' })),
  E('min_sol_pel_treaty', [17, 45], [T('MIN_SOLDIER', 'peltast')], 20, 4, (s) => ({ t: s.year >= 1095 ? '불가침 소식이 국경에 왔습니다. 창은 내려놓지 않았고 경보는 줄었습니다.' : '사르곤 쪽에서 불빛이 보였습니다. 밤새 창을 잡고 있었고 아무 일도 없었습니다.', k: 'note' })),
  E('min_sol_sq_catapult', [20, 50], [T('MIN_SOLDIER', 'squad')], 30, 2, () => ({ t: '투석기조 분대장. 돌 하나를 고개 너머로 보내는 데 여덟 명이 필요했습니다.', k: 'ev', fx: { standing: 1 } })),
  E('min_sol_sq_recruits', [20, 50], [T('MIN_SOLDIER', 'squad')], 25, 3, () => ({ t: '신병 여덟을 받았습니다. 여덟 중 다섯이 변경 마을 아이였습니다.', k: 'note' })),
  E('min_sol_sq_guerrilla', [20, 50], [T('MIN_SOLDIER', 'squad')], 25, 3, () => ({ t: '게릴라 전술 훈련. 산을 아는 쪽이 이기는 전쟁이라고 배웠습니다.', k: 'ev', fx: { cap: { skill: 0.05 } } })),
  E('min_sol_sq_loss', [20, 50], [T('MIN_SOLDIER', 'squad')], 15, 5, () => ({ t: '분대원 하나가 고개에서 돌아오지 않았습니다. 이름을 신전에 올리는 것이 분대장의 일이었습니다.', k: 'loss', fx: { h: -3 } })),
  E('min_sol_cmd_map', [28, 60], [T('MIN_SOLDIER', 'commander')], 30, 2, () => ({ t: '지휘관으로 국경 수비선을 그렸습니다. 고개 하나하나가 선이었습니다.', k: 'ev' })),
  E('min_sol_cmd_council', [28, 60], [T('MIN_SOLDIER', 'commander')], 25, 3, (s) => ({ t: cul(s).ruler + '에 보고했습니다. 창 수와 사람 수를 적었고 둘 다 모자랐습니다.', k: 'note', fx: { standing: 1 } })),
  E('min_sol_cmd_hire', [28, 60], [T('MIN_SOLDIER', 'commander')], 25, 3, () => ({ t: '외국 용병 고용 안건. 가울 쪽 부대가 왔고 지휘관은 그들의 봉급표를 보지 않았습니다.', k: 'note' })),
  E('min_sol_cmd_old', [28, 60], [T('MIN_SOLDIER', 'commander')], 20, 4, () => ({ t: '점령기 이야기를 신병들에게 했습니다. 사르곤 이름을 강요받던 시절이었고, 신병들은 처음 듣는 이야기였습니다.', k: 'note' })),
  trans('min_sol_trans', 'MIN_SOLDIER', [17, 60], {
    peltast: '펠타스트가 되었습니다. 투창 셋과 방패 하나를 받았습니다.',
    squad: '분대장이 되었습니다. 투석기조 하나가 손에 들어왔습니다.',
    commander: (s) => ({ t: '지휘관이 되었습니다. 수비선을 그리는 쪽이 되었습니다.', k: 'big', fx: { h: 3 } }),
  }),
  after('min_sol_after', 'MIN_SOLDIER', [17, 60], {
    kia: '고개에서 크게 다쳤습니다. 변경 마을 사람들이 업어 내려왔습니다.',
    raid: '습격에서 살아남았습니다. 분대의 반이 남지 않았습니다.',
    discharged: '복무를 마쳤습니다. 투창은 반납했고 찬가는 남았습니다.',
    _: '군을 떠났습니다. 고개를 보면 다리가 먼저 긴장했습니다.',
  }),
  E('min_sol_aff_army', [16, 60], ['aff:MIN_SOL_ARMY'], 25, 3, () => ({ t: '미노스군 본대. 대열이 길었고 노래가 길었습니다.', k: 'note' })),
  E('min_sol_aff_guerrilla', [16, 60], ['aff:MIN_SOL_GUERRILLA'], 25, 3, () => ({ t: '게릴라·의용 전선. 제복은 없었고 산은 전부 알았습니다.', k: 'note', fx: { cap: { skill: 0.03 } } })),
  E('min_sol_aff_border', [16, 60], ['aff:MIN_SOL_BORDER'], 25, 3, () => ({ t: '변경 수비대. 사르곤 접경에서 민병과 같은 초소에 섰습니다. 봉급은 용병의 반이었습니다.', k: 'note', fx: { hl: -1 } })),

  // ══════════ MIN_SECURITY 민간 보안 기업원 (1090~) ══════════
  E('min_sec_new_badge', [18, 35], [T('MIN_SECURITY', 'new')], 30, 2, () => ({ t: '신입 배지를 받았습니다. 회사 이름이 창보다 컸습니다.', k: 'ev' })),
  E('min_sec_new_drill', [18, 35], [T('MIN_SECURITY', 'new')], 25, 3, () => ({ t: '훈련은 군사 훈련과 같았고 끝에 상업 교육이 붙었습니다.', k: 'note', fx: { cap: { skill: 0.05 } } })),
  E('min_sec_age_guard', [20, 55], [T('MIN_SECURITY', 'agent')], 30, 2, () => ({ t: '보안 요원으로 대회장 경비를 섰습니다. 관중 2000, 요원 40. 관중은 선수를 보고 요원은 관중을 보았습니다.', k: 'ev', fx: { standing: 1 }, f: F('위원회 대회 운영 기록') })),
  E('min_sec_age_compete', [20, 55], [T('MIN_SECURITY', 'agent')], 25, 3, () => ({ t: '인터락킹 컴페티션 출전. 상금과 계약이 걸려 있었고 둘 다 회사 몫이 컸습니다.', k: 'ev', fx: { money: 1 } })),
  E('min_sec_lead_team', [24, 60], [T('MIN_SECURITY', 'lead')], 30, 2, () => ({ t: '팀장으로 팀 넷을 돌렸습니다. 대회 일정이 팀의 한 해였습니다.', k: 'ev' })),
  E('min_sec_lead_client', [24, 60], [T('MIN_SECURITY', 'lead')], 25, 3, () => ({ t: '고객은 상인 조합이었습니다. 경비 계약서에 대회 성적 조항이 있었습니다.', k: 'note', fx: { money: 1 } })),
  E('min_sec_com_rule', [30, 65], [T('MIN_SECURITY', 'committee')], 30, 2, () => ({ t: '위원회에서 대회 규칙을 정했습니다. 공식 지위는 없었고 영향력은 있었습니다.', k: 'ev', fx: { standing: 1 } })),
  E('min_sec_com_money', [30, 65], [T('MIN_SECURITY', 'committee')], 25, 3, () => ({ t: '위원회 예산 회의. 상금보다 경비 계약이 더 큰 숫자였습니다.', k: 'note' })),
  trans('min_sec_trans', 'MIN_SECURITY', [19, 65], {
    agent: '정식 보안 요원이 되었습니다. 배지에 이름이 들어갔습니다.',
    lead: '팀장이 되었습니다. 팀 배지 넷을 받았습니다.',
    committee: '위원회 위원이 되었습니다. 회의실 자리가 정해졌습니다.',
  }),
  after('min_sec_after', 'MIN_SECURITY', [19, 65], {
    bankrupt: '회사가 문을 닫았습니다. 배지는 서랍에 들어갔습니다.',
    layoff: '정리 통보를 받았습니다. 다음 대회는 관중석에서 보았습니다.',
    injury: '대회에서 다쳤습니다. 회사는 치료비를 냈고 계약은 연장하지 않았습니다.',
    _: '회사를 나왔습니다. 대회 날이 되면 발이 먼저 경기장으로 향했습니다.',
  }),
  E('min_sec_aff_committee', [18, 65], ['aff:MIN_SEC_COMMITTEE'], 25, 3, () => ({ t: '인터락킹 컴페티션 위원회. 민간 기업들이 모여 대회를 운영했고 신전은 관을 내릴 뿐이었습니다.', k: 'note' })),
  E('min_sec_aff_firm', [18, 65], ['aff:MIN_SEC_FIRM'], 25, 3, () => ({ t: '민간 보안 기업. 사무실은 코리니아에, 훈련장은 라케다이몬에 있었습니다.', k: 'note' })),

  // ══════════ MIN_FARM 과수·논·꽃 리큐르 (생업) ══════════
  E('min_far_fam_apple', [12, 30], [T('MIN_FARM', 'family')], 30, 2, () => ({ t: '가족 과수원. 사과 수확철에 나룻배 배정을 기다리며 상자 40개를 쌓았습니다.', k: 'ev', f: F('선착장 배정표') })),
  E('min_far_fam_rice', [12, 30], [T('MIN_FARM', 'family')], 25, 3, () => ({ t: '습지 논. 물에 들어가는 일은 아이들 몫이었고 아이들은 그것을 좋아했습니다.', k: 'warm' })),
  E('min_far_own_sun', [18, 60], [T('MIN_FARM', 'own')], 30, 2, () => ({ t: '덜 익은 과일을 익히려 도시가 양지로 옮겼습니다. 과수원은 따라가지 못했고 햇빛은 따라왔습니다.', k: 'note' })),
  E('min_far_own_market', [18, 60], [T('MIN_FARM', 'own')], 25, 3, () => ({ t: '코리니아 장터에 사과를 냈습니다. 값은 뱃삯 15%를 뺀 만큼이었습니다.', k: 'ev', fx: { money: 1 }, f: F('코리니아 장터 시세') })),
  E('min_far_liq_still', [24, 70], [T('MIN_FARM', 'liqueur')], 30, 2, () => ({ t: '꽃 리큐르 증류. 첫 병은 신전에, 둘째 병은 이웃에, 셋째 병부터 팔았습니다.', k: 'ev', fx: { cap: { skill: 0.05 } } })),
  E('min_far_liq_recipe', [24, 70], [T('MIN_FARM', 'liqueur')], 25, 3, () => ({ t: '꽃을 따는 시각이 맛을 정했습니다. 새벽, 그리고 이슬이 마르기 전.', k: 'note' })),
  E('min_far_sup_contract', [30, 80], [T('MIN_FARM', 'supplier')], 30, 2, () => ({ t: '코리니아 납품 계약. 상단 도장이 병 라벨에 찍혔고 값이 두 배로 뛰었습니다.', k: 'ev', fx: { money: 2, standing: 1 } })),
  E('min_far_sup_temple', [30, 80], [T('MIN_FARM', 'supplier')], 25, 3, () => ({ t: '신전 축제용 리큐르를 올렸습니다. 사제가 이름을 기억했습니다.', k: 'warm', fx: { h: 2 } })),
  trans('min_far_trans', 'MIN_FARM', [13, 80], {
    own: '자기 이름으로 과수원을 등기했습니다. 신전 서기관 장부에 올랐습니다.',
    liqueur: '꽃 리큐르 증류기를 들였습니다. 첫 병은 신전에 올렸습니다.',
    supplier: (s) => ({ t: '코리니아 납품 명가가 되었습니다. 라벨에 이름이 들어갔습니다.', k: 'big', fx: { h: 3 } }),
  }),
  after('min_far_after', 'MIN_FARM', [13, 80], {
    ruin: '흉작이 겹쳐 과수원을 넘겼습니다. 나무는 그대로였습니다.',
    catastrophe: '재앙이 과수원을 지나갔습니다. 살아남았고 나무는 남지 않았습니다.',
    raid: '습격에서 살아남았습니다. 창고는 비었습니다.',
    _: '농사를 그만두었습니다. 사과 꽃 피는 때는 여전히 알았습니다.',
  }),
  E('min_far_aff_apple', [12, 80], ['aff:MIN_FAR_APPLE'], 25, 3, () => ({ t: '사과 과수. 수확철 배정표가 한 해 수입을 정했습니다.', k: 'note' })),
  E('min_far_aff_rice', [12, 80], ['aff:MIN_FAR_RICE'], 25, 3, () => ({ t: '습지 논. 물이 발목까지, 벼가 허리까지.', k: 'note' })),
  E('min_far_aff_flower', [12, 80], ['aff:MIN_FAR_FLOWER'], 25, 3, () => ({ t: '꽃밭. 꽃을 따는 손이 리큐르 값이었습니다.', k: 'note', fx: { money: 1 } })),

  // ══════════ MIN_TRADE 코리니아 상인 ══════════
  E('min_tra_ped_road', [14, 35], [T('MIN_TRADE', 'peddler')], 30, 2, () => ({ t: '행상. 마을 5곳을 돌면 상자가 비었고 발이 부었습니다.', k: 'ev', fx: { hl: -1 }, f: F('행상 장부') })),
  E('min_tra_ped_figure', [14, 35], [T('MIN_TRADE', 'peddler')], 25, 3, () => ({ t: '컬럼비아 영화 피규어를 들고 다녔습니다. 아이들이 몰렸고 어른들은 값을 물었습니다.', k: 'warm', fx: { money: 1 } })),
  E('min_tra_shop_open', [18, 60], [T('MIN_TRADE', 'shop')], 30, 2, () => ({ t: '점포를 열었습니다. 코리니아 거리 가게 60곳 중 간판이 가장 작았습니다.', k: 'ev', f: F('코리니아 조합 점포 명부') })),
  E('min_tra_shop_seed', [18, 60], [T('MIN_TRADE', 'shop')], 25, 3, () => ({ t: '코리니아 상인이 씨앗을 퍼뜨렸다는 전설을 손님에게 들려주었습니다. 손님은 씨앗을 샀습니다.', k: 'note', fx: { money: 1 } })),
  E('min_tra_mer_caravan', [25, 70], [T('MIN_TRADE', 'merchant')], 30, 2, () => ({ t: '대상인으로 수레 12대 상단을 냈습니다. 라이타니엔까지, 사르곤까지. 돌아오는 상단은 늘 조금 작았습니다.', k: 'ev', fx: { money: 2, standing: 1 }, f: F('코리니아 상단 장부') })),
  E('min_tra_mer_art', [25, 70], [T('MIN_TRADE', 'merchant')], 25, 3, () => ({ t: '예술품 해외 반출 논쟁. 상인은 팔자고 했고 신전은 남기자고 했습니다. 반은 팔렸습니다.', k: 'note' })),
  E('min_tra_pri_both', [30, 80], [T('MIN_TRADE', 'priest')], 30, 2, () => ({ t: '사제 겸업. 아침에는 신전 등잔, 오후에는 상단 장부.', k: 'ev' })),
  E('min_tra_pri_doubt', [30, 80], [T('MIN_TRADE', 'priest')], 25, 3, () => ({ t: '사제 겸 상인을 두고 누가 뭐라 했습니다. 신전은 승인했고 장부는 늘었습니다.', k: 'note', fx: { standing: 1 } })),
  trans('min_tra_trans', 'MIN_TRADE', [15, 80], {
    shop: '점포를 냈습니다. 행상 상자는 가게 뒤에 두었습니다.',
    merchant: '대상인이 되었습니다. 상단 깃발에 이름이 들어갔습니다.',
    priest: (s) => ({ t: '신전이 사제 겸업을 승인했습니다. 등잔과 장부를 한 손에 들었습니다.', k: 'big', fx: { h: 3 } }),
  }),
  after('min_tra_after', 'MIN_TRADE', [15, 80], {
    bankrupt: '파산했습니다. 간판은 내렸고 행상 상자는 남았습니다.',
    raid: '상단이 습격을 받았습니다. 살아 돌아왔고 상자는 돌아오지 않았습니다.',
    scandal: '거래 하나로 이름이 올랐습니다. 코리니아 조합에서 이름이 빠졌습니다.',
    _: '장사를 접었습니다. 값을 매기는 버릇은 남았습니다.',
  }),
  E('min_tra_aff_corinia', [14, 80], ['aff:MIN_TRA_CORINIA'], 25, 3, () => ({ t: '코리니아 상단. 조합 회의가 평의회보다 길었습니다.', k: 'note' })),
  E('min_tra_aff_peddler', [14, 80], ['aff:MIN_TRA_PEDDLER'], 25, 3, () => ({ t: '행상. 발이 가게였고 상자가 창고였습니다.', k: 'note' })),
  E('min_tra_aff_rankwood', [14, 80], ['aff:MIN_TRA_RANKWOOD'], 25, 3, () => ({ t: '랭크우드 수입상. 컬럼비아 영화 소품이 코리니아에서 두 배 값이었습니다.', k: 'note', fx: { money: 1 } })),

  // ══════════ MIN_ART 극작가·철학자 ══════════
  E('min_art_dis_copy', [15, 35], [T('MIN_ART', 'disciple')], 30, 2, () => ({ t: '스승의 희곡을 베꼈습니다. 점령기에 금지되었던 대목을 베낄 때 손이 조금 빨라졌습니다.', k: 'ev', fx: { cap: { learn: 0.05 } } })),
  E('min_art_dis_debate', [15, 35], [T('MIN_ART', 'disciple')], 25, 3, () => ({ t: '광장 토론. 포르테가 힘만 세다는 말에 포르테 철학자가 두 시간 반박했습니다.', k: 'note' })),
  E('min_art_pla_stage', [20, 60], [T('MIN_ART', 'playwright')], 30, 2, () => ({ t: '첫 희곡이 아테누스 극장에 올랐습니다. 관객 300, 그중 사제 셋.', k: 'ev', fx: { standing: 2 }, f: F('아테누스 극장 공연 기록') })),
  E('min_art_pla_censor', [20, 60], [T('MIN_ART', 'playwright')], 20, 4, () => ({ t: '사르곤 사절이 관람하는 날 한 장면이 빠졌습니다. 평의회 요청이었고 극작가는 그 장면을 다음 날 올렸습니다.', k: 'note', fx: { h: -1 } })),
  E('min_art_not_name', [28, 80], [T('MIN_ART', 'notable')], 30, 2, () => ({ t: '아테누스 명사. 광장에서 이름을 아는 사람이 모르는 사람보다 많아졌습니다.', k: 'ev' })),
  E('min_art_not_epic', [28, 80], [T('MIN_ART', 'notable')], 25, 3, () => ({ t: '건국 서사시 새 판본 작업에 참여했습니다. 사제단이 한 글자씩 보았습니다.', k: 'note', fx: { standing: 1 } })),
  trans('min_art_trans', 'MIN_ART', [16, 80], {
    playwright: '극작가로 이름을 올렸습니다. 극장 벽보에 이름이 작게 들어갔습니다.',
    notable: (s) => ({ t: '아테누스 명사가 되었습니다. 광장에 자리가 생겼습니다.', k: 'big', fx: { h: 3 } }),
  }),
  after('min_art_after', 'MIN_ART', [16, 80], {
    fade: '희곡이 더는 오르지 않았습니다. 광장 자리는 다른 사람이 앉았습니다.',
    arrest: '작품 하나로 조사를 받았습니다. 풀려났고 극장은 조심스러워졌습니다.',
    exile: '도편 투표에 이름이 올랐습니다. 도시를 떠났습니다.',
    _: '펜을 놓았습니다. 광장 토론은 멀리서 들었습니다.',
  }),
  E('min_art_aff_theater', [15, 80], ['aff:MIN_ART_THEATER'], 25, 3, () => ({ t: '아테누스 극장. 점령기에 닫혔던 문이었고 지금은 매일 밤 열렸습니다.', k: 'note' })),
  E('min_art_aff_school', [15, 80], ['aff:MIN_ART_SCHOOL'], 25, 3, () => ({ t: '철학 학파. 올리브나무 아래서 수업했고 비 오는 날은 쉬었습니다.', k: 'note' })),

  // ══════════ MIN_BORDER 변경 마을 주민 ══════════
  E('min_bor_child_watch', [8, 16], [T('MIN_BORDER', 'child')], 30, 2, () => ({ t: '아이들이 고개 쪽 망을 봤습니다. 불빛이 보이면 종을 쳤고, 종은 한 해에 3번 울렸습니다.', k: 'note', fx: { h: -1 }, f: F('아크로티 신전 기록') })),
  E('min_bor_child_spear', [8, 16], [T('MIN_BORDER', 'child')], 25, 3, () => ({ t: '어른들이 창 잡는 법을 가르쳤습니다. 열 살이었고 창은 키보다 길었습니다.', k: 'ev', fx: { cap: { skill: 0.05 } } })),
  E('min_bor_mil_field', [14, 60], [T('MIN_BORDER', 'militia')], 30, 2, () => ({ t: '낮에는 밭, 밤에는 초소. 민병 40명이 사흘에 한 번 밤을 섰고 창은 밭 가에 세워 두었습니다.', k: 'ev', fx: { hl: -1 }, f: F('아크로티 민병 당번표') })),
  E('min_bor_mil_raid', [14, 60], [T('MIN_BORDER', 'militia')], 25, 3, (s) => ({ t: s.year >= 1095 ? '불가침 뒤로 종이 울리는 날이 줄었습니다. 창은 밭 가에 그대로 있었습니다.' : '습격. 종이 울렸고 마을 사람들이 신전으로 모였습니다. 아침에 집 둘이 타고 있었습니다.', k: 'bad', fx: { h: -2 } })),
  E('min_bor_chief_treaty', [30, 90], [T('MIN_BORDER', 'chief')], 30, 2, (s) => ({ t: s.year >= 1095 ? '촌장으로 사르곤 쪽 부족 사람과 마주 앉았습니다. 불가침이라고 했고, 양쪽 다 창을 뒤에 두었습니다.' : '촌장으로 피난 길을 정했습니다. 종이 울리면 신전으로, 신전이 막히면 고개 뒤로.', k: 'note' })),
  E('min_bor_chief_names', [30, 90], [T('MIN_BORDER', 'chief')], 25, 3, () => ({ t: '마을 이름을 신전 장부에 다시 올렸습니다. 사라진 이름은 다른 장부로 갔습니다.', k: 'loss', fx: { h: -1 } })),
  trans('min_bor_trans', 'MIN_BORDER', [9, 90], {
    militia: '민병 명단에 이름이 올랐습니다. 창 하나가 자기 것이 되었습니다.',
    chief: '촌장이 되었습니다. 종을 치는 순서를 정하는 쪽이 되었습니다.',
  }),
  after('min_bor_after', 'MIN_BORDER', [9, 90], {
    raid: '습격에서 살아남았습니다. 마을은 반이 남았습니다.',
    kia: '고개에서 크게 다쳤습니다. 마을 사람들이 업어 내려왔습니다.',
    _: '마을을 떠났습니다. 종소리는 꿈에 남았습니다.',
  }),
  E('min_bor_aff_akroti', [8, 90], ['aff:MIN_BOR_AKROTI'], 25, 3, () => ({ t: '아크로티. 신전 하나, 민병 수십, 고개 셋.', k: 'note' })),
  E('min_bor_aff_agnes', [8, 90], ['aff:MIN_BOR_AGNES'], 25, 3, () => ({ t: '아그네스 강 변경. 강 건너에서 불빛이 보이면 그날 밤은 길었습니다.', k: 'note', fx: { h: -1 } })),
  E('min_bor_aff_sargon', [8, 90], ['aff:MIN_BOR_SARGON'], 25, 3, () => ({ t: '사르곤 접경. 장날에는 양쪽 말이 섞였고 밤에는 섞이지 않았습니다.', k: 'note' })),

  // ══════════ 생업·계절·명절·동네 (A11: BOAT·FARM·TRADE·BORDER) ══════════
  E('min_live_olive', [12, 90], [N, 'arch:A11'], 25, 3, () => ({ t: '올리브 수확. 나무 아래 천을 펴고 가지를 쳤습니다. 온 마을이 같은 소리였습니다.', k: 'warm', fx: { h: 1 } })),
  E('min_live_games', [12, 90], [N, 'arch:A11'], 25, 3, (s) => ({ t: fest(s, 0) + ' 기간. 마을마다 선수 이름을 걸었고, 이긴 날은 포도주가 공짜였습니다.', k: 'warm', fx: { h: 2 } })),
  E('min_live_hymn', [12, 90], [N, 'arch:A11'], 25, 3, (s) => ({ t: fest(s, 1) + '. 신전 앞에서 찬가를 불렀습니다. 점령기에 금지되었던 노래라고 노인들이 말했습니다.', k: 'warm', fx: { h: 1 } })),
  E('min_live_apple_boat', [12, 90], [N, 'arch:A11'], 20, 4, () => ({ t: '사과 수확철 나룻배 배정표가 붙었습니다. 배 30척에 과수원 50곳. 선착장에서 목소리가 높았고 치안관이 왔습니다.', k: 'note', f: F('선착장 배정표') })),
  E('min_live_move_sun', [12, 90], [N, 'arch:A11'], 15, 5, () => ({ t: '도시가 양지로 자리를 옮겼습니다. 덜 익은 과일 때문이었고 마을 사람들은 그 이유를 당연하게 여겼습니다.', k: 'note' })),
  E('min_live_wine', [14, 90], [N, 'arch:A11'], 20, 4, (s) => ({ t: '새 ' + cul(s).drink + ' 나오는 날. 첫 잔은 영웅들에게, 둘째 잔은 이웃에게.', k: 'warm', fx: { h: 1 } })),
  E('min_live_sargon_news', [12, 90], [N, 'arch:A11'], 15, 5, (s) => ({ t: s.year >= 1095 ? '사르곤과 불가침이라는 소식이 장터에 돌았습니다. 믿는 사람 반, 창을 손질하는 사람 반.' : '사르곤 국경에서 또 소식이 왔습니다. 장터가 하루 조용했습니다.', k: 'note' })),
  E('min_live_treat', [12, 90], [N, 'arch:A11', 'known'], 30, 3, () => ({ t: '신전 부속 치료소에서 약을 받았습니다. 이 땅에서 감염자는 치료를 받습니다. 사제가 될 수는 없습니다.', k: 'note', fx: { hl: 1 } })),

  // ══════════ 종족: 포르테 우대(rel:favored) ══════════
  E('min_forte_strong', [14, 80], [N, 'rel:favored'], 20, 4, () => ({ t: '포르테는 힘만 세다는 농담이 돌았습니다. 광장 토론에서 포르테 철학자가 두 시간 반박했고, 농담은 다음 주에도 돌았습니다.', k: 'note' })),
  E('min_forte_seat', [14, 80], [N, 'rel:favored'], 15, 5, () => ({ t: '신전 계단 앞줄은 포르테 자리였습니다. 아무도 정하지 않았고 모두 알았습니다.', k: 'note' })),

  // ══════════ 이주 신참(newcomer, 미노스는 귀화가 열려 있다) ══════════
  E('min_new_olive', [10, 80], [N, 'newcomer'], 40, 3, () => ({ t: '미노스에 와서 처음 받은 것은 올리브 한 접시였습니다. 두 번째는 구역 등록 서류였습니다.', k: 'warm', fx: { h: 1 } })),
  E('min_new_hero', [10, 80], [N, 'newcomer'], 30, 4, (s) => ({ t: '"' + cul(s).greet + '"라는 인사를 배웠습니다. 영웅이 누구인지는 나중에 배웠습니다.', k: 'note' })),
];

export const decisions = {
  // 치안관→사제: 신전 추천(감염자는 불가)
  min_civic_priest: {
    tags: [T('MIN_CIVIC')], once: true,
    ok: (s) => !!s.S.track && s.S.track.stage >= 1 && s.S.track.standing >= 50 && s.rng.chance(0.3),
    build: (s) => ({ title: '추천', body: '신전에서 사제 추천 이야기가 왔습니다. 조건은 하나, 몸에 결정이 없을 것.' + (s.S.ori.on && s.S.ori.known ? ' 판정 기록이 있습니다.' : ''),
      choices: [{ k: 'go', label: '추천을 받는다', auto: 1 }, { k: 'stay', label: '공직에 남는다', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'stay') return { t: '공직에 남았습니다. 신전은 다시 묻지 않았습니다.', k: 'note' };
      if (s.S.ori.on) return { t: '신전 검사에서 결정이 나왔습니다. 추천은 철회되었고 공직은 그대로였습니다. 치료는 받을 수 있다고 사제가 말했습니다.', k: 'bad', fx: { h: -4 } };
      if (!s.enterTrack('MIN_TEMPLE', { how: 'switch', via: 'aspirant', stage: 2, skipExam: true, quiet: true })) return '추천은 이루어지지 않았습니다.';
      return { t: '사제 서임을 받았습니다. 치안관 시절 올렸던 결정들을 이번에는 승인하는 쪽에서 보았습니다.', k: 'big', fx: { h: 4 } };
    },
  },
  // 도편 투표
  min_civic_ostracism: {
    tags: [T('MIN_CIVIC')], once: false, gap: 8,
    ok: (s) => !!s.S.track && s.S.track.stage >= 1 && s.rng.chance(0.3),
    build: () => ({ title: '도편', body: '광장에 도편 투표가 열렸습니다. 이름이 가장 많이 적힌 사람이 도시를 떠납니다. 공직자도 조각을 하나 받습니다.',
      choices: [{ k: 'rival', label: '경쟁자 이름을 적는다', auto: 1 }, { k: 'blank', label: '빈 조각을 낸다', auto: 1 }] }),
    apply: (s, k) => {
      const risk = s.S.track.standing < 35 ? 0.3 : 0.08;
      if (s.rng.chance(risk)) { s.fall('exile'); return false; }
      return k === 'rival' ? { t: '경쁜자 이름을 적었습니다. 그 사람은 떠나지 않았고, 다음 회의에서 눈이 마주쳤습니다.', k: 'note', fx: { standing: 1 } } : { t: '빈 조각을 냈습니다. 광장의 조각 더미에서 자기 이름은 몇 개 보였습니다.', k: 'note', fx: { h: -1 } };
    },
  },
  // 힘노이의 지혜 출전
  min_athlete_hymnoi: {
    tags: [T('MIN_ATHLETE', 'fighter')], once: false, gap: 4,
    ok: (s) => !!s.S.track && s.S.track.standing >= 45 && s.rng.chance(0.5),
    build: (s) => ({ title: '출전', body: fest(s, 0) + ' 도시 대표 선발이 열렸습니다. 나가면 다른 도시 선수들과 싸우고, 이기면 올리브 관이 걸립니다.',
      choices: [{ k: 'go', label: '선발에 나간다', auto: 1.5 }, { k: 'skip', label: '올해는 쉰다', auto: 0.7 }] }),
    apply: (s, k) => {
      if (k === 'skip') return { t: '올해는 쉬었습니다. 관중석에서 보았고 손이 몇 번 움직였습니다.', k: 'note' };
      const r = s.rng.rnd();
      if (r < 0.12) { s.fall('injury'); return false; }
      if (r < 0.5) { s.promote({ force: true }); return { t: '선발에서 이겼습니다. 도시 대표로 힘노이산에 갑니다.', k: 'big', fx: { h: 4 } }; }
      return { t: '선발에서 졌습니다. 이긴 선수의 이름을 도시가 외웠고, 그 이름은 내 것이 아니었습니다.', k: 'bad', fx: { h: -2, standing: -2 } };
    },
  },
  // 수확철 나룻배 배정 다툼
  min_boat_harvest: {
    tags: [T('MIN_BOAT', 'boatman')], once: false, gap: 5,
    ok: (s) => !!s.S.track && s.rng.chance(0.4),
    build: () => ({ title: '배정', body: '사과 수확철 배정표에서 내 배가 빠졌습니다. 옆 뱃사공은 두 번 들어갔습니다. 선착장장은 치안관 쪽을 봤습니다.',
      choices: [{ k: 'argue', label: '선착장에서 따진다', auto: 1 }, { k: 'temple', label: '치안관에게 올린다', auto: 0.8 }, { k: 'let', label: '그냥 넘긴다', auto: 1 }] }),
    apply: (s, k) => k === 'argue' ? (s.rng.chance(0.5) ? { t: '목소리를 높였습니다. 배정표가 고쳐졌고 옆 뱃사공과는 한 해 말을 하지 않았습니다.', k: 'ev', fx: { money: medX(s, 0.3), standing: -2 } } : { t: '목소리를 높였습니다. 치안관이 왔고 배정표는 그대로였습니다.', k: 'bad', fx: { standing: -4, h: -2 } })
      : k === 'temple' ? { t: '치안관에게 올렸습니다. 사흘 뒤 배정표에 이름이 들어갔습니다. 선착장장이 그 뒤로 인사를 짧게 했습니다.', k: 'ev', fx: { money: medX(s, 0.3), standing: 1 } }
      : { t: '넘겼습니다. 사과는 다른 배로 갔고 운하는 그대로 흘렀습니다.', k: 'note', fx: { h: 1, money: -medX(s, 0.1) } },
  },
  // 변경 습격 때
  min_border_raid: {
    tags: [T('MIN_BORDER')], once: false, gap: 6,
    ok: (s) => !!s.S.track && s.S.age >= 14 && s.year < 1095 && s.rng.chance(0.35),
    build: () => ({ title: '종', body: '밤에 종이 울렸습니다. 고개 쪽에 불빛. 민병은 창을 들고, 나머지는 신전으로 갑니다.',
      choices: [{ k: 'spear', label: '창을 든다', auto: 1 }, { k: 'temple', label: '신전으로 간다', auto: 1.2 }] }),
    apply: (s, k) => {
      if (k === 'spear') { if (s.rng.chance(0.15)) { s.fall('raid'); return false; } return { t: '창을 들고 고개에 섰습니다. 아침에 내려왔고 마을은 그대로였습니다.', k: 'ev', fx: { standing: 4, hl: -2 } }; }
      return { t: '신전으로 갔습니다. 밤이 길었고 아침에 집 하나가 타고 있었습니다. 내 집은 아니었습니다.', k: 'bad', fx: { h: -2 } };
    },
  },
  // 혼인 덮어쓰기(미노스 3종)
  marry_temple: marryDecision('temple',
    (s, pr, t) => wa(pr.name) + ' 혼담이 오갑니다. 신전 혼례입니다. 사제가 12영웅 앞에서 승인하고 지참금은 ' + Math.round(s.med * t.dowry).toLocaleString() + ' LMD.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람입니다.' : ''),
    (s, pr) => wa(pr.name) + ' 혼례를 올렸습니다. 사제가 두 이름을 서사시 운율로 읊었고 올리브 관이 둘 놓였습니다.'),
  marry_district: marryDecision('district',
    (s, pr) => wa(pr.name) + ' 혼담이 오갑니다. 구역 등록 혼인입니다. 치안관이 장부에 적고 신전은 나중에 승인합니다.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람입니다.' : ''),
    (s, pr) => wa(pr.name) + ' 혼인했습니다. 치안관이 장부에 두 이름을 적었고 포도주 한 병을 두고 갔습니다.'),
  marry_border: marryDecision('border',
    (s, pr) => wa(pr.name) + ' 혼담이 오갑니다. 변경 마을 혼례입니다. 촌장이 보고 마을이 기억합니다. 신전까지는 멀고 창은 가깝습니다.',
    (s, pr) => wa(pr.name) + ' 혼례를 올렸습니다. 마을이 하루 종을 치지 않았고, 그것이 선물이었습니다.'),
  home_change: {
    once: false, gap: 5, at: 0.7,
    ok: ENGINE_DECISIONS.home_change.ok,
    build: (s) => {
      if (!here(s)) return ENGINE_DECISIONS.home_change.build(s);
      const opts = homeChangeOptions(s).slice(0, 3); if (!opts.length) return null;
      return { title: '집', body: '집을 마련할 만큼 모였습니다. 등기는 신전 서기관이 하고, 구역 치안관이 한 번 봅니다.',
        choices: opts.map((h) => ({ k: h.id, label: h.name, sub: Math.round(s.med * h.buy).toLocaleString() + ' LMD', auto: h.w ?? 1 })).concat([{ k: 'no', label: '그대로 산다', auto: 1 }]) };
    },
    apply: (s, k) => {
      if (!here(s)) return ENGINE_DECISIONS.home_change.apply(s, k);
      if (k === 'no') return '그대로 살기로 했습니다.';
      const h = homeChangeOptions(s).find((x) => x.id === k);
      if (!h || !setHousing(s, h, { buy: true, quiet: true })) return '등기는 나지 않았습니다.';
      return { t: eul(h.name) + ' 마련했습니다. 신전 서기관 장부에 이름이 올랐고 이웃이 올리브를 가져왔습니다.', k: 'warm', fx: { h: 3 } };
    },
  },
};

export default { events, decisions };
