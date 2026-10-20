// W9f 이베리아 진로 콘텐츠(국가 전용, D40). 계약: docs/설계_명세_v1.md §11 + "W7 메모 — 스키마 고정".
// 핵심 진로 5: IBE_INQ(재판소)·IBE_COAST(봉쇄 해안 주민)·IBE_PENAL(형벌 대대)·IBE_FARM(내륙 농민)·IBE_PIRATE(해적·밀수, 순회).
// 나머지: IBE_CLERK·IBE_FISH·IBE_LIGHT·IBE_SCHOLAR·IBE_NURSE·IBE_BUILDER·IBE_DEEP(전환 전용, 마지막 단계 강제).
// 표기: 시테러·고요함·심해교회·에기르. 대사건(살비엔토 1098·등대 탈환 1100·활로 1100)은 bigevents.js 몫이라 여기서는 연동 문장만 쓴다.
// 거주 기준 태그 'nation:iberia', 출생 기준 'iberia'. 에기르 혈통은 rel:institutional(관계 매트릭스).
import { F, cul, fest, medX, eul, iga, eun, wa, ro } from '../_util.js';
import { ENGINE_DECISIONS } from '../../src/engine/choices.js';
import { marriageP, rollMarriageType, makeProspect, marry, familyOpposes } from '../../src/engine/marriage.js';
import { homeChangeOptions, setHousing } from '../../src/engine/housing.js';

const NAT = 'iberia';
const N = 'nation:' + NAT;
const T = (id, st) => 'track:' + id + (st ? ':' + st : '');
const E = (id, a, tags, w, gap, run, x) => ({ id, a, tags, w, gap, run, ...(x || {}) });
const stId = (s) => (s.stage ? s.stage.id : null);
const here = (s) => s.S.cur === NAT;
const aegir = (s) => s.S.race === 'aegir';

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
      if (familyOpposes(s, p.prospect)) return { t: '양가가 반대했습니다. 종족 때문이라는 말은 아무도 하지 않았습니다.', k: 'bad' };
      if (!marry(s, p.prospect, p.type, { quiet: true })) return '혼인은 이루어지지 않았습니다.';
      return { t: okText(s, p.prospect), k: 'warm', fx: { h: 4 } };
    },
  };
}
/** 에기르 혈통 체포(결과만). 감옥 또는 처형 */
function arrestAegir(s, pJail, pDeath) {
  const r = s.rng.rnd();
  if (r < pDeath) { s.die('execution', '재판소 처형'); return null; }
  if (r < pDeath + pJail) {
    if (s.S.track) s.leaveTrack('prison', { quiet: true });
    s.S.prison = 'jail'; s.S.prisonLeft = s.rng.ri(2, 6);
    return { t: '재판소에 끌려갔습니다. 질문은 혈통에 관한 것이었고, 대답은 적히지 않았습니다. ' + s.S.prisonLeft + '년.', k: 'bad', fx: { h: -5 } };
  }
  return { t: '재판소 사람이 집 앞에 서 있었습니다. 질문 세 개를 하고 갔습니다. 그날 밤 바다 쪽 창을 막았습니다.', k: 'bad', fx: { h: -3 } };
}

export const events = [
  // ══════════ IBE_INQ 재판소 재판관 (핵심) ══════════
  E('ibe_inq_pen_drill', [18, 35], [T('IBE_INQ', 'penal')], 30, 2, () => ({ t: '형벌 대대 소속으로 재판소 훈련장에 섰습니다. 등불을 켜는 법부터 배웠고, 하루 30번 켰습니다.', k: 'ev', fx: { cap: { skill: 0.05 } }, f: F('재판소 훈련 기록') })),
  E('ibe_inq_pen_scripture', [18, 35], [T('IBE_INQ', 'penal')], 25, 3, () => ({ t: '경전 암송. 틀린 구절마다 밤 순찰 한 시간이 붙었습니다.', k: 'note', fx: { cap: { learn: 0.05 } } })),
  E('ibe_inq_pen_coast', [18, 35], [T('IBE_INQ', 'penal')], 25, 3, () => ({ t: '해안 순찰에 따라갔습니다. 재판관은 앞에, 병사들은 뒤에, 바다는 옆에 있었습니다.', k: 'ev' })),
  E('ibe_inq_pen_question', [18, 35], [T('IBE_INQ', 'penal')], 25, 3, () => ({ t: '교관이 "왜 심판하려 하는가"를 물었습니다. 대답은 다음 해에 하라고 했습니다.', k: 'note' })),
  E('ibe_inq_cand_lamp', [19, 40], [T('IBE_INQ', 'candidate')], 30, 2, () => ({ t: '자격자로 등불을 받았습니다. 등불 번호 217. 불은 아직 재판관의 것보다 어두웠습니다.', k: 'ev', fx: { cap: { arts: 0.05 } }, f: F('재판소 등불 지급 대장') })),
  E('ibe_inq_cand_shadow', [19, 40], [T('IBE_INQ', 'candidate')], 30, 2, () => ({ t: '재판관을 따라 마을 심문에 들어갔습니다. 기록은 자격자가, 질문은 재판관이 했습니다.', k: 'ev', fx: { standing: 1 } })),
  E('ibe_inq_cand_rapier', [19, 40], [T('IBE_INQ', 'candidate')], 25, 3, () => ({ t: '레이피어와 핸드캐논 훈련. 손에 익는 데 한 해, 몸에 익는 데 또 한 해였습니다.', k: 'ev', fx: { cap: { skill: 0.05 } } })),
  E('ibe_inq_cand_vigil', [19, 40], [T('IBE_INQ', 'candidate')], 25, 3, () => ({ t: '밤샘 기도. 바스티온 데 칸티코스의 돌바닥은 새벽에 가장 찼습니다.', k: 'note', fx: { hl: -1 } })),
  E('ibe_inq_inq_patrol', [22, 60], [T('IBE_INQ', 'inquisitor')], 30, 2, () => ({ t: '해안 순찰 12km. 등불을 들고 마을 어귀에 서면 사람들이 창문을 닫았습니다.', k: 'ev', fx: { standing: 1 }, f: F('재판소 순찰 일지') })),
  E('ibe_inq_inq_question', [22, 60], [T('IBE_INQ', 'inquisitor')], 30, 2, () => ({ t: '심문. 질문은 3개였고, 세 번째 질문에 모두가 대답을 바꿨습니다.', k: 'ev', f: F('재판소 심문 기록') })),
  E('ibe_inq_inq_blockade', [22, 60], [T('IBE_INQ', 'inquisitor')], 25, 3, () => ({ t: '봉쇄 마을 입구에 서서 통행증을 봤습니다. 안에서 나오려는 사람은 있었고 들어가려는 사람은 없었습니다.', k: 'note', fx: { h: -1 } })),
  E('ibe_inq_inq_disciple', [22, 60], [T('IBE_INQ', 'inquisitor')], 25, 3, () => ({ t: '자격자 하나를 제자로 받았습니다. 첫 가르침은 등불을 끄는 법이었습니다.', k: 'warm' })),
  E('ibe_inq_grand_council', [30, 75], [T('IBE_INQ', 'grand')], 30, 2, () => ({ t: '대재판관 회의. 지도 위의 봉쇄선이 지난해보다 2km 안쪽으로 들어왔습니다.', k: 'ev', f: F('재판소 봉쇄선 지도') })),
  E('ibe_inq_grand_sentence', [30, 75], [T('IBE_INQ', 'grand')], 25, 3, () => ({ t: '판결문에 서명했습니다. 서명 하나에 마을 하나의 겨울이 걸려 있었습니다.', k: 'bad', fx: { standing: 2, h: -2 } })),
  E('ibe_inq_grand_rumor', [30, 75], [T('IBE_INQ', 'grand')], 25, 3, () => ({ t: '옛 왕의 초상을 걸었다는 사람을 잡아갔다는 소문이 돌았습니다. 소문은 재판소가 한 일보다 늘 컸습니다.', k: 'note' })),
  E('ibe_inq_grand_coast', [30, 75], [T('IBE_INQ', 'grand')], 25, 3, () => ({ t: '등대에 올라 바다를 보았습니다. 보이는 것은 없었고, 그것이 보고서의 첫 줄이었습니다.', k: 'note' })),
  E('ibe_inq_saint_name', [35, 95], [T('IBE_INQ', 'saint')], 30, 2, () => ({ t: '성도의 이름이 공고 맨 위에 있었습니다. 그 아래 이름들이 실제로 움직였습니다.', k: 'ev' })),
  E('ibe_inq_saint_pilgrim', [35, 95], [T('IBE_INQ', 'saint')], 25, 3, () => ({ t: '내륙 마을에서 성도를 보러 온 사람들이 있었습니다. 축복을 청했고, 등불을 들어 주었습니다.', k: 'warm', fx: { h: 1 } })),
  E('ibe_inq_saint_silence', [35, 95], [T('IBE_INQ', 'saint')], 25, 3, (s) => ({ t: fest(s, 0) + '. 성도가 앞에 서고 재판관들이 뒤에 섰습니다. 바다 쪽을 향해 아무 말도 하지 않았습니다.', k: 'note' })),
  E('ibe_inq_saint_old', [35, 95], [T('IBE_INQ', 'saint')], 20, 4, () => ({ t: '성도는 아홉 자리였고 채워진 자리는 적었습니다. 빈자리를 세는 것이 일이 되었습니다.', k: 'note', fx: { h: -1 } })),
  trans('ibe_inq_trans', 'IBE_INQ', [19, 95], {
    candidate: '자격자가 되었습니다. 형벌 대대 표식을 떼고 재판소 표식을 달았습니다.',
    inquisitor: (s) => ({ t: '재판관 서임. 등불에 불이 옮겨졌고, 그 불은 다른 사람의 등불에서 왔습니다.', k: 'big', fx: { h: 3 } }),
    grand: '대재판관이 되었습니다. 바스티온 데 칸티코스의 방 하나가 이름으로 불렸습니다.',
    saint: (s) => ({ t: '성도로 추대되었습니다. 명예직이라고 했지만, 그 이름이 걸린 공고에는 아무도 토를 달지 않았습니다.', k: 'big', fx: { h: 3 } }),
  }),
  after('ibe_inq_after', 'IBE_INQ', [19, 95], {
    kia: '해안 교전에서 크게 다쳤습니다. 등불은 다른 사람 손으로 넘어갔습니다.',
    seaborn: '시테러 습격에서 살아 돌아왔습니다. 재판소는 요양을 명했고 등불은 반납받았습니다.',
    heresy: '이단 심문을 받는 쪽이 되었습니다. 결과는 공고에 한 줄로 났습니다.',
    assassination: '습격을 받고 살아남았습니다. 재판소는 그 뒤로 이름을 부르지 않았습니다.',
    _: '재판소를 떠났습니다. 등불 없는 밤이 처음에는 어두웠습니다.',
  }),
  E('ibe_inq_aff_carmen', [18, 90], ['aff:IBE_INQ_CARMEN'], 25, 3, () => ({ t: '제자단의 아침. 스승의 질문은 하나였고, 답을 준비하는 데 하루가 갔습니다.', k: 'note', fx: { cap: { learn: 0.05 } } })),
  E('ibe_inq_aff_granfaro', [18, 90], ['aff:IBE_INQ_GRANFARO'], 25, 3, () => ({ t: '그란파로 주둔. 이베리아에서 아직 등불이 켜진 마지막 항구라고들 했습니다.', k: 'note' })),
  E('ibe_inq_aff_rhodes', [18, 90], ['aff:IBE_INQ_RHODES'], 25, 3, (s) => { s.S.flags.rhodes_legal = s.S.age; return { t: '로도스 아일랜드 파견 메신저. 제약회사 쪽 사람들은 등불을 보고도 묻지 않았습니다.', k: 'note' }; }),
  E('ibe_inq_lighthouse_1100', [18, 90], [T('IBE_INQ')], 70, 0, () => ({ t: '그란파로 등대 쪽 작전에 재판소 인원이 전부 동원되었습니다. 돌아온 명단은 나간 명단보다 짧았습니다.', k: 'bad', fx: { hl: -2, standing: 3 } }), { c: (s) => s.year === 1100 }),
  canon('ibe_canon_carmen', [1090, 1107], [T('IBE_INQ')], [18, 60], '대재판관이 등대 아래를 지나갔습니다. 순찰병들이 일제히 등불을 낮췄고, 그 사람은 고개를 들지 않았습니다.'),
  canon('ibe_canon_irene', [1098, 1107], [T('IBE_INQ', 'candidate')], [19, 35], '젊은 재판관이 봉쇄 마을 입구에서 서류를 덮고 "들어간다"고 했습니다. 뒤따르는 사람은 없었습니다.'),

  // ══════════ IBE_PENAL 형벌 대대 (핵심) ══════════
  E('ibe_pen_rec_roll', [16, 30], [T('IBE_PENAL', 'recruit')], 30, 2, () => ({ t: '신병 30명 점호. 이름 대신 죄목이나 고향을 부르는 사람도 있었습니다.', k: 'ev', f: F('형벌 대대 명부') })),
  E('ibe_pen_rec_wall', [16, 30], [T('IBE_PENAL', 'recruit')], 30, 2, () => ({ t: '해안 방벽 보수. 돌을 쌓는 동안 바다는 한 번도 조용하지 않았습니다.', k: 'ev', fx: { hl: -1 } })),
  E('ibe_pen_rec_ration', [16, 30], [T('IBE_PENAL', 'recruit')], 25, 3, (s) => ({ t: '배식은 ' + cul(s).food + '. 신병은 맨 뒤에 섰습니다.', k: 'note' })),
  E('ibe_pen_rec_lamp', [16, 30], [T('IBE_PENAL', 'recruit')], 25, 3, () => ({ t: '재판관이 신병 막사를 지나갔습니다. 등불 빛이 침상 위를 한 번 쓸고 갔습니다.', k: 'note' })),
  E('ibe_pen_sol_patrol', [17, 45], [T('IBE_PENAL', 'soldier')], 30, 2, () => ({ t: '해안 순찰. 모래 위에 사람 발자국이 아닌 것이 있었습니다. 보고했고, 다음 날 그 자리는 봉쇄되었습니다.', k: 'ev', fx: { standing: 1 } })),
  E('ibe_pen_sol_night', [17, 45], [T('IBE_PENAL', 'soldier')], 30, 2, () => ({ t: '밤 초소. 파도 소리와 다른 소리를 구분하는 법을 몸이 먼저 배웠습니다.', k: 'note', fx: { hl: -1 } })),
  E('ibe_pen_sol_village', [17, 45], [T('IBE_PENAL', 'soldier')], 25, 3, () => ({ t: '봉쇄 마을에 식량을 넣었습니다. 담 너머에서 다투는 소리가 났고, 소란을 일으킨 사람이 끌려 나왔습니다.', k: 'bad', fx: { h: -2 } })),
  E('ibe_pen_sol_mate', [17, 45], [T('IBE_PENAL', 'soldier')], 25, 3, () => ({ t: '동기가 복무를 마치고 내륙으로 갔습니다. 남은 사람끼리 해초 술을 한 잔씩 돌렸습니다.', k: 'warm', fx: { h: 1 } })),
  E('ibe_pen_eli_lead', [20, 50], [T('IBE_PENAL', 'elite')], 30, 2, () => ({ t: '엘리트 병사로 순찰조를 이끌었습니다. 재판관이 없는 날은 등불 대신 횃불이었습니다.', k: 'ev', fx: { standing: 2 } })),
  E('ibe_pen_eli_sweep', [20, 50], [T('IBE_PENAL', 'elite')], 25, 3, () => ({ t: '교단 모임 소탕에 들어갔습니다. 집 안에는 조개껍데기와 젖은 바닥만 남아 있었습니다.', k: 'bad', fx: { h: -2 } })),
  E('ibe_pen_eli_offer', [20, 50], [T('IBE_PENAL', 'elite')], 20, 4, () => ({ t: '재판관이 지원 자격이 있다고 말했습니다. 대답은 하지 않았고, 질문은 잊히지 않았습니다.', k: 'note' })),
  E('ibe_pen_eli_scar', [20, 50], [T('IBE_PENAL', 'elite')], 25, 3, () => ({ t: '교전에서 상처가 하나 늘었습니다. 바닷물에 닿으면 아직 쓰렸습니다.', k: 'bad', fx: { hl: -2 } })),
  E('ibe_pen_sgt_roster', [24, 55], [T('IBE_PENAL', 'sergeant')], 30, 2, () => ({ t: '하사관으로 순찰표를 짰습니다. 바다 쪽 초소에 누구를 넣느냐가 그 사람의 한 달이었습니다.', k: 'ev' })),
  E('ibe_pen_sgt_recruits', [24, 55], [T('IBE_PENAL', 'sergeant')], 25, 3, () => ({ t: '신병 열둘을 받았습니다. 절반은 죄목으로 왔고 절반은 배를 채우러 왔습니다.', k: 'note' })),
  E('ibe_pen_sgt_report', [24, 55], [T('IBE_PENAL', 'sergeant')], 25, 3, () => ({ t: '재판관에게 보고했습니다. 보고는 짧았고, 등불은 보고하는 동안 한 번도 흔들리지 않았습니다.', k: 'note', fx: { standing: 1 } })),
  E('ibe_pen_sgt_loss', [24, 55], [T('IBE_PENAL', 'sergeant')], 15, 5, () => ({ t: '순찰조 하나가 돌아오지 않았습니다. 이름을 명부에서 옮겨 적는 것이 하사관의 일이었습니다.', k: 'loss', fx: { h: -3 } })),
  trans('ibe_pen_trans', 'IBE_PENAL', [17, 55], {
    soldier: '신병 표식을 떼고 병사가 되었습니다. 초소 배치표에 이름이 올랐습니다.',
    elite: '엘리트 병사로 뽑혔습니다. 재판소 훈련장 출입이 허락되었습니다.',
    sergeant: '하사관이 되었습니다. 순찰표를 짜는 쪽이 되었습니다.',
  }),
  after('ibe_pen_after', 'IBE_PENAL', [17, 55], {
    seaborn: '시테러 습격에서 살아 돌아왔습니다. 몸은 남았고 복무는 끝났습니다.',
    kia: '교전에서 크게 다쳤습니다. 형벌 대대는 상이 기록을 남기고 보냈습니다.',
    desert: '탈영 기록이 남았습니다. 해안으로는 다시 갈 수 없었습니다.',
    discharged: '복무를 마쳤습니다. 내륙으로 가는 길에 바다를 돌아보지 않았습니다.',
    _: '형벌 대대를 떠났습니다. 파도 소리가 한동안 밤마다 들렸습니다.',
  }),
  E('ibe_pen_aff_tercio', [16, 55], ['aff:IBE_PEN_TERCIO'], 25, 3, () => ({ t: '테르시오 대형 훈련. 창과 총이 번갈아 서는 법을 몸이 외웠습니다.', k: 'ev', fx: { cap: { skill: 0.05 } } })),
  E('ibe_pen_aff_coast', [16, 55], ['aff:IBE_PEN_COAST'], 25, 3, () => ({ t: '해안 순찰대. 하루의 절반은 모래 위, 절반은 소금기 묻은 막사였습니다.', k: 'note', fx: { hl: -1 } })),
  E('ibe_pen_aff_sweep', [16, 55], ['aff:IBE_PEN_SWEEP'], 25, 3, () => ({ t: '교단 소탕대. 문을 열면 대개 비어 있었고, 비어 있지 않은 날이 기억에 남았습니다.', k: 'bad', fx: { h: -1 } })),

  // ══════════ IBE_COAST 봉쇄 해안 주민 (핵심, 붕괴형) ══════════
  E('ibe_coa_child_name', [8, 16], [T('IBE_COAST', 'child')], 30, 2, () => ({ t: '마을 어른들은 아이를 생활 물건 이름으로 불렀습니다. 판금, 밧줄, 등잔. 마을 아이 9명이 다 그랬습니다.', k: 'note', f: F('장로의 만조 막대') })),
  E('ibe_coa_child_tide', [8, 16], [T('IBE_COAST', 'child')], 30, 2, () => ({ t: '만조 때마다 어른들이 세는 숫자가 있었습니다. 올해 73번째. 숫자가 커질수록 마을이 조용해졌습니다.', k: 'note', fx: { h: -1 }, f: F('장로의 만조 막대') })),
  E('ibe_coa_child_hunger', [8, 16], [T('IBE_COAST', 'child')], 30, 2, () => ({ t: '하루 한 끼. 떠밀려온 것을 삶은 국이었고, 어른들은 그것이 무엇인지 말하지 않았습니다.', k: 'bad', fx: { hl: -2 } })),
  E('ibe_coa_child_wall', [8, 16], [T('IBE_COAST', 'child')], 25, 3, () => ({ t: '마을 밖 봉쇄선에 재판소 사람이 서 있었습니다. 어른들은 그쪽을 보지 말라고 했습니다.', k: 'note' })),
  E('ibe_coa_res_fog', [14, 70], [T('IBE_COAST', 'resident')], 30, 2, () => ({ t: '해무가 마을을 덮은 날. 바다 쪽에서 나는 소리를 아무도 입에 올리지 않았습니다.', k: 'note', fx: { h: -1 } })),
  E('ibe_coa_res_flesh', [14, 70], [T('IBE_COAST', 'resident')], 25, 3, () => ({ t: '떠밀려온 살을 나눴습니다. 먹은 사람은 그날 밤 잘 잤고, 안 먹은 사람은 배가 고팠습니다.', k: 'bad', fx: { hl: -1 } })),
  E('ibe_coa_res_preach', [14, 70], [T('IBE_COAST', 'resident')], 25, 3, () => ({ t: '교단 사람이 바다를 가리키며 구원을 말했습니다. 듣는 사람은 많았고 묻는 사람은 없었습니다.', k: 'note' })),
  E('ibe_coa_res_inq', [14, 70], [T('IBE_COAST', 'resident')], 20, 4, () => ({ t: '재판소 순찰이 마을에 들어왔습니다. 식량을 두고 갔고, 한 사람을 데리고 갔습니다.', k: 'bad', fx: { h: -2 } })),
  E('ibe_coa_eld_count', [40, 95], [T('IBE_COAST', 'elder')], 30, 2, () => ({ t: '장로로 만조 수를 세는 일을 맡았습니다. 세는 사람이 바뀌어도 숫자는 이어졌습니다.', k: 'note' })),
  E('ibe_coa_eld_lots', [40, 95], [T('IBE_COAST', 'elder')], 25, 3, () => ({ t: '제비 그릇을 보관했습니다. 붉은 조개 하나와 흰 조개 여럿. 아무도 그릇을 들여다보지 않았습니다.', k: 'note', fx: { h: -2 } })),
  E('ibe_coa_eld_young', [40, 95], [T('IBE_COAST', 'elder')], 25, 3, () => ({ t: '젊은 사람이 마을을 떠나겠다고 했습니다. 봉쇄선 너머에 무엇이 있는지 장로도 몰랐습니다.', k: 'note' })),
  E('ibe_coa_eld_fire', [40, 95], [T('IBE_COAST', 'elder')], 25, 3, () => ({ t: '밤에 불을 피웠습니다. 바다에서 보이지 않게, 그러나 마을에서는 보이게.', k: 'warm', fx: { h: 1 } })),
  trans('ibe_coa_trans', 'IBE_COAST', [9, 95], {
    resident: '아이 이름을 벗고 주민이 되었습니다. 제비 그릇에 조개 하나가 더 들어갔습니다.',
    elder: '장로가 되었습니다. 만조를 세는 막대가 손에 들어왔습니다.',
  }),
  after('ibe_coa_after', 'IBE_COAST', [9, 95], {
    raid: '습격에서 살아남았습니다. 마을은 반이 남았습니다.',
    seaborn: '시테러가 마을을 지나갔습니다. 남은 사람은 셀 수 있을 만큼이었습니다.',
    _: '마을을 떠났습니다. 봉쇄선 너머의 공기는 소금기가 덜했습니다.',
  }),
  // 100번째 만조 제비(결과만). 뽑히면 인신공양.
  E('ibe_coa_lottery', [12, 95], [T('IBE_COAST')], 18, 4, (s) => {
    const r = s.rng.rnd();
    if (r < 0.06) { s.die('sacrifice', '인신공양'); return null; }
    if (r < 0.2) return { t: '100번째 만조. 제비는 옆집으로 갔습니다. 다음 날 그 집 문은 열려 있었고 안에는 아무도 없었습니다.', k: 'loss', fx: { h: -5 } };
    return { t: '100번째 만조. 제비 그릇이 돌았고, 흰 조개였습니다. 마을은 다음 만조부터 다시 세기 시작했습니다.', k: 'bad', fx: { h: -3 } };
  }, { c: (s) => s.S.track && s.S.track.stage >= 1 }),
  E('ibe_coa_aff_salviento', [8, 95], ['aff:IBE_COA_SALVIENTO'], 25, 3, (s) => ({ t: s.year >= 1099 ? '살비엔토의 그 겨울 뒤로 재판소 사람이 마을에 상주했습니다. 제비 그릇은 치워졌고, 식량은 들어왔습니다.' : '살비엔토. 좌초한 도시의 판금 사이로 바닷바람이 들어왔고, 막을 것은 없었습니다.', k: 'note' })),
  E('ibe_coa_aff_rocamarea', [8, 95], ['aff:IBE_COA_ROCAMAREA'], 25, 3, () => ({ t: '로카마레아. 바위에 붙은 마을이었고 바위보다 사람이 적었습니다.', k: 'note' })),
  E('ibe_coa_aff_faromuerto', [8, 95], ['aff:IBE_COA_FAROMUERTO'], 25, 3, () => ({ t: '파로 무에르토. 꺼진 등대 아래 마을이었습니다. 등대가 켜진 것을 본 사람은 노인들만이었습니다.', k: 'note' })),
  E('ibe_coa_aff_aron', [8, 95], ['aff:IBE_COA_ARON'], 25, 3, () => ({ t: '아론. 해적들이 질서를 약속하고 식량의 반을 가져갔습니다. 나머지 반으로 마을이 돌아갔습니다.', k: 'bad', fx: { money: -1 } })),

  // ══════════ IBE_FARM 내륙 농민·상인 (핵심, 생업) ══════════
  E('ibe_far_fam_field', [12, 30], [T('IBE_FARM', 'family')], 30, 2, () => ({ t: '가족 밭에서 일했습니다. 바다에서 먼 땅이라 소금기가 없었고, 그것이 자랑이었습니다.', k: 'ev' })),
  E('ibe_far_fam_tax', [12, 30], [T('IBE_FARM', 'family')], 25, 3, () => ({ t: '재판소 사람이 세곡을 받으러 왔습니다. 양을 재는 동안 아버지는 말이 없었습니다.', k: 'note', fx: { money: -1 } })),
  E('ibe_far_fam_refugee', [12, 30], [T('IBE_FARM', 'family')], 25, 3, () => ({ t: '해안에서 온 사람들이 마을을 지나갔습니다. 밥을 주었고, 이름은 묻지 않았습니다.', k: 'warm', fx: { h: 1 } })),
  E('ibe_far_fam_dry', [12, 30], [T('IBE_FARM', 'family')], 25, 3, () => ({ t: '가물었습니다. 우물이 얕아졌고 기도가 길어졌습니다.', k: 'bad', fx: { hl: -1 } })),
  E('ibe_far_own_land', [18, 65], [T('IBE_FARM', 'own')], 30, 2, () => ({ t: '자영 농지. 수확의 3할이 재판소 장부에 먼저 적히고 나머지가 창고에 들어갔습니다.', k: 'ev', f: F('재판소 세곡 대장') })),
  E('ibe_far_own_market', [18, 65], [T('IBE_FARM', 'own')], 30, 2, () => ({ t: '장날. 염장 생선이 내륙까지 왔고 값은 매년 10%씩 올랐습니다.', k: 'note', f: F('페르도니도라 장터 시세표') })),
  E('ibe_far_own_clerk', [18, 65], [T('IBE_FARM', 'own')], 25, 3, () => ({ t: '민정 서기가 마을 장부를 들고 왔습니다. 옛날에는 사제였다는 말을 누가 했습니다.', k: 'note' })),
  E('ibe_far_own_harvest', [18, 65], [T('IBE_FARM', 'own')], 25, 3, () => ({ t: '수확이 좋았습니다. 재판소가 가져간 뒤에도 남았습니다.', k: 'warm', fx: { money: 1, h: 2 } })),
  E('ibe_far_not_meeting', [30, 85], [T('IBE_FARM', 'notable')], 30, 2, () => ({ t: '마을 유력자로 재판소 사람과 마주 앉았습니다. 세곡 이야기였고, 양쪽 다 숫자를 적어 왔습니다.', k: 'ev', fx: { standing: 1 } })),
  E('ibe_far_not_dispute', [30, 85], [T('IBE_FARM', 'notable')], 25, 3, () => ({ t: '마을 다툼을 중재했습니다. 재판소까지 가지 않게 하는 것이 유력자의 일이었습니다.', k: 'note', fx: { standing: 1 } })),
  E('ibe_far_not_road', [30, 85], [T('IBE_FARM', 'notable')], 25, 3, () => ({ t: '수도로 가는 길을 손봤습니다. 페르도니도라 상인들이 그 길로 들어왔습니다.', k: 'ev', fx: { money: 1 } })),
  E('ibe_far_not_old', [30, 85], [T('IBE_FARM', 'notable')], 20, 4, () => ({ t: '마을 노인이 황금기 이야기를 했습니다. 바다에서 금화가 들어오던 때였다고 했습니다. 아무도 믿지 않았고 아무도 반박하지 않았습니다.', k: 'note' })),
  trans('ibe_far_trans', 'IBE_FARM', [13, 85], {
    own: '자기 이름으로 밭을 등기했습니다. 재판소 장부에 이름이 올랐습니다.',
    notable: '마을 유력자가 되었습니다. 재판소 사람이 마을에 오면 먼저 찾는 집이 되었습니다.',
  }),
  after('ibe_far_after', 'IBE_FARM', [13, 85], {
    ruin: '흉작이 겹쳐 밭을 넘겼습니다. 밭은 그대로였고 이름만 바뀌었습니다.',
    arrest: '재판소에 끌려갔다 돌아왔습니다. 밭은 그동안 다른 사람이 갈았습니다.',
    _: '농사를 그만두었습니다. 손의 흙은 오래 남았습니다.',
  }),
  E('ibe_far_aff_inland', [12, 85], ['aff:IBE_FARM_INLAND'], 25, 3, () => ({ t: '내륙 농촌. 바다를 본 적 없는 아이들이 자랐습니다.', k: 'warm' })),
  E('ibe_far_aff_perdonidora', [12, 85], ['aff:IBE_FARM_PERDONIDORA'], 25, 3, () => ({ t: '페르도니도라 상인으로 수도 장터에 섰습니다. 재판소 깃발이 장터 한가운데 걸려 있었습니다.', k: 'note', fx: { money: 1 } })),

  // ══════════ IBE_PIRATE 해적·유물 밀매 (핵심, 순회) ══════════
  E('ibe_pir_crew_salt', [14, 35], [T('IBE_PIRATE', 'crew')], 30, 2, () => ({ t: '소금 사막 횡단. 배는 모래 위를 갔고 바다는 보이지 않았습니다.', k: 'ev', fx: { hl: -1 } })),
  E('ibe_pir_crew_rule', [14, 35], [T('IBE_PIRATE', 'crew')], 25, 3, () => ({ t: '선상 규칙을 외웠습니다. 첫째, 선장의 말. 둘째, 바다 쪽을 보지 않는 것.', k: 'note' })),
  E('ibe_pir_crew_scale', [14, 35], [T('IBE_PIRATE', 'crew')], 25, 3, () => ({ t: '염린 사냥에 따라갔습니다. 몫은 작았고 처음 받은 몫이었습니다.', k: 'ev', fx: { money: 1 } })),
  E('ibe_pir_crew_inq', [14, 35], [T('IBE_PIRATE', 'crew')], 25, 3, () => ({ t: '재판소 순찰선이 보였습니다. 선장은 속도를 줄이지도 올리지도 않았습니다.', k: 'note', fx: { h: -1 } })),
  E('ibe_pir_bos_cook', [17, 50], [T('IBE_PIRATE', 'bosun')], 30, 2, () => ({ t: '갑판장 겸 요리사. 염장 생선을 다섯 가지로 요리하는 법을 알게 되었습니다.', k: 'warm' })),
  E('ibe_pir_bos_relic', [17, 50], [T('IBE_PIRATE', 'bosun')], 25, 3, () => ({ t: '유물 상자를 내륙 상인에게 넘겼습니다. 상자 안은 보지 않았습니다.', k: 'ev', fx: { money: 1 } })),
  E('ibe_pir_bos_mutiny', [17, 50], [T('IBE_PIRATE', 'bosun')], 15, 5, () => ({ t: '선원들이 선장에게 불만을 말했습니다. 갑판장은 가운데 섰습니다. 그날은 그걸로 끝났습니다.', k: 'bad', fx: { h: -2, standing: 2 } })),
  E('ibe_pir_bos_port', [17, 50], [T('IBE_PIRATE', 'bosun')], 25, 3, () => ({ t: '타국 항구에 들어갔습니다. 거기서는 해적이 아니라 상인이었습니다.', k: 'note' })),
  E('ibe_pir_cap_chart', [22, 60], [T('IBE_PIRATE', 'captain')], 30, 2, () => ({ t: '선장으로 항로를 정했습니다. 재판소 순찰선이 다니지 않는 길은 멀었습니다.', k: 'ev', fx: { standing: 1 } })),
  E('ibe_pir_cap_share', [22, 60], [T('IBE_PIRATE', 'captain')], 25, 3, () => ({ t: '몫을 나눴습니다. 선장 몫이 가장 컸고, 가장 먼저 사라졌습니다.', k: 'note', fx: { money: 2 } })),
  E('ibe_pir_cap_village', [22, 60], [T('IBE_PIRATE', 'captain')], 25, 3, () => ({ t: '해안 마을에 들어가 식량과 질서를 거래했습니다. 마을은 둘 다 받았습니다.', k: 'bad', fx: { h: -1 } })),
  E('ibe_pir_cap_wanted', [22, 60], [T('IBE_PIRATE', 'captain')], 20, 4, () => ({ t: '재판소 공고에 이름이 올랐습니다. 공고를 뜯어 선실에 붙였습니다.', k: 'note' })),
  E('ibe_pir_fleet_ships', [30, 70], [T('IBE_PIRATE', 'fleet')], 30, 2, () => ({ t: '선단 두목으로 배 셋을 거느렸습니다. 셋 다 이름이 있었고 셋 다 서류는 없었습니다.', k: 'ev', fx: { standing: 1 } })),
  E('ibe_pir_fleet_order', [30, 70], [T('IBE_PIRATE', 'fleet')], 25, 3, () => ({ t: '선단 규칙을 새로 정했습니다. 첫째 줄은 "질서를 판다"였습니다.', k: 'note' })),
  E('ibe_pir_fleet_deal', [30, 70], [T('IBE_PIRATE', 'fleet')], 25, 3, () => ({ t: '내륙 큰 상인과 거래했습니다. 상인은 재판소 사람을 알았고, 그래서 거래가 됐습니다.', k: 'ev', fx: { money: 2 } })),
  E('ibe_pir_fleet_old', [30, 70], [T('IBE_PIRATE', 'fleet')], 20, 4, () => ({ t: '옛 선장 이야기를 젊은 선원들에게 했습니다. 이름은 네 개였고 살아 있는 사람은 없었습니다.', k: 'note' })),
  trans('ibe_pir_trans', 'IBE_PIRATE', [15, 70], {
    bosun: '갑판장이 되었습니다. 열쇠 둘과 칼 하나를 받았습니다.',
    captain: (s) => ({ t: '선장이 되었습니다. 선실에 들어가 문을 닫고 한참 앉아 있었습니다.', k: 'big', fx: { h: 3 } }),
    fleet: '선단 두목이 되었습니다. 바다 쪽 사람들이 이름을 외웠습니다.',
  }),
  after('ibe_pir_after', 'IBE_PIRATE', [15, 70], {
    arrest: '재판소에 잡혔다 풀려났습니다. 배는 압류되었고 이름은 공고에 남았습니다.',
    betrayal: '배신이 있었습니다. 살아남았고 배는 남지 않았습니다.',
    seaborn: '바다에서 온 것과 마주쳤습니다. 배는 돌아왔고 선원의 반은 돌아오지 않았습니다.',
    kia: '교전에서 크게 다쳤습니다. 뭍에 내려졌습니다.',
    _: '배를 내렸습니다. 땅이 흔들리는 느낌이 한 달 갔습니다.',
  }),
  E('ibe_pir_aff_juana', [14, 70], ['aff:IBE_PIR_JUANA'], 25, 3, () => ({ t: '후아나 선단. 배 이름은 요람이었고 선원들은 그 이름을 농담으로 쓰지 않았습니다.', k: 'note' })),
  E('ibe_pir_aff_aron', [14, 70], ['aff:IBE_PIR_ARON'], 25, 3, () => ({ t: '아론 해적. 마을에서 식량을 받고 질서를 주었습니다. 마을 사람들은 둘 다 믿지 않았습니다.', k: 'bad', fx: { h: -1 } })),
  E('ibe_pir_aff_relic', [14, 70], ['aff:IBE_PIR_RELIC'], 25, 3, () => ({ t: '유물 발굴단. 모래를 파면 황금기 것이 나왔고, 재판소는 그것을 금지했습니다.', k: 'ev', fx: { money: 1 } })),
  E('ibe_pir_visit_bol', [14, 70], [T('IBE_PIRATE'), 'visit:bolivar'], 30, 3, () => ({ t: '볼리바르 항구. 세 정부 중 어느 쪽 세관인지 묻지 않고 돈을 냈습니다.', k: 'note' })),
  E('ibe_pir_visit_col', [14, 70], [T('IBE_PIRATE'), 'visit:columbia'], 30, 3, () => ({ t: '컬럼비아 상인이 유물 값을 두 배로 쳤습니다. 서류를 요구하지도 않았습니다.', k: 'ev', fx: { money: 1 } })),
  E('ibe_pir_visit_sir', [14, 70], [T('IBE_PIRATE'), 'visit:siracusa'], 30, 3, () => ({ t: '시라쿠사 항구에서는 해적보다 패밀리가 더 질서를 지켰습니다.', k: 'note' })),

  // ══════════ IBE_CLERK 민정 서기 ══════════
  E('ibe_clk_pri_mass', [20, 50], [T('IBE_CLERK', 'priest')], 30, 2, () => ({ t: '사제로 예배를 집전했습니다. 신도 40명, 그중 재판소 사람 3명. 신도는 줄고 재판소 사람은 늘었습니다.', k: 'ev', f: F('예배당 출석 기록') })),
  E('ibe_clk_pri_letter', [20, 50], [T('IBE_CLERK', 'priest')], 25, 3, () => ({ t: '재판소에서 서한이 왔습니다. 성직자의 역할을 다시 정한다는 내용이었습니다.', k: 'note', fx: { h: -1 } })),
  E('ibe_clk_dem_desk', [22, 60], [T('IBE_CLERK', 'demoted')], 30, 2, () => ({ t: '격하된 뒤 책상을 받았습니다. 제단보다 낮았고 더 넓었습니다.', k: 'note' })),
  E('ibe_clk_dem_old', [22, 60], [T('IBE_CLERK', 'demoted')], 25, 3, () => ({ t: '옛 신도가 찾아와 고해를 청했습니다. 들어주었고, 기록은 하지 않았습니다.', k: 'warm', fx: { h: 1 } })),
  E('ibe_clk_clk_ledger', [24, 65], [T('IBE_CLERK', 'clerk')], 30, 2, () => ({ t: '민정 서기로 마을 장부를 맡았습니다. 출생 12, 혼인 4, 세곡 한 칸. 장례는 맨 뒤 칸이었습니다.', k: 'ev', fx: { standing: 1 }, f: F('민정 서기 마을 장부') })),
  E('ibe_clk_clk_comfort', [24, 65], [T('IBE_CLERK', 'clerk')], 25, 3, () => ({ t: '해안에서 온 가족을 등록했습니다. 서류에 적을 수 없는 것이 더 많았습니다.', k: 'note' })),
  E('ibe_clk_chief_region', [32, 70], [T('IBE_CLERK', 'chief')], 30, 2, () => ({ t: '지역 수석 서기로 마을 서기들의 장부를 모았습니다. 숫자는 맞았고 사람은 줄었습니다.', k: 'ev' })),
  E('ibe_clk_chief_inq', [32, 70], [T('IBE_CLERK', 'chief')], 25, 3, () => ({ t: '재판관이 서기국에 들렀습니다. 등불을 책상에 놓고 장부를 넘겼습니다. 한 장도 말없이.', k: 'note', fx: { h: -1 } })),
  trans('ibe_clk_trans', 'IBE_CLERK', [21, 70], {
    demoted: '격하 통지를 받았습니다. 제의를 벗고 서기 복장을 받았습니다.',
    clerk: '민정 서기 임명장이 왔습니다. 마을 하나가 장부 하나였습니다.',
    chief: '지역 수석 서기가 되었습니다. 장부 열 권이 책상에 올라왔습니다.',
  }),
  after('ibe_clk_after', 'IBE_CLERK', [21, 70], {
    heresy: '이단 혐의가 있었습니다. 살아남았고 장부는 다른 사람에게 갔습니다.',
    seaborn: '습격에서 살아 돌아왔습니다. 서기국은 재편되었습니다.',
    _: '서기 일을 그만두었습니다. 장부 글씨체는 손에 남았습니다.',
  }),
  E('ibe_clk_aff_priest', [20, 70], ['aff:IBE_CLK_PRIEST'], 25, 3, () => ({ t: '격하 사제 출신 서기들이 모이면 옛 기도문을 아무도 먼저 꺼내지 않았습니다.', k: 'note' })),
  E('ibe_clk_aff_bishop', [20, 70], ['aff:IBE_CLK_BISHOP'], 25, 3, () => ({ t: '격하 주교. 옛 교구 사람들이 여전히 고개를 숙였고, 재판소 사람들은 숙이지 않았습니다.', k: 'note' })),
  E('ibe_clk_aff_mayor', [20, 70], ['aff:IBE_CLK_MAYOR'], 25, 3, () => ({ t: '이장 겸임. 마을 일과 재판소 일이 한 책상에 올라왔고, 둘이 다른 날이 있었습니다.', k: 'note', fx: { standing: 1 } })),

  // ══════════ IBE_FISH 어민 ══════════
  E('ibe_fis_crew_net', [12, 30], [T('IBE_FISH', 'crew')], 30, 2, () => ({ t: '선원으로 그물을 당겼습니다. 올라온 것은 적었고 소금은 많았습니다.', k: 'ev', fx: { hl: -1 } })),
  E('ibe_fis_crew_limit', [12, 30], [T('IBE_FISH', 'crew')], 25, 3, () => ({ t: '재판소가 정한 선까지만 나갔습니다. 그 너머 물빛이 달랐습니다.', k: 'note' })),
  E('ibe_fis_fis_catch', [15, 60], [T('IBE_FISH', 'fisher')], 30, 2, () => ({ t: '출어 40일. 수확은 적었고 그래도 나갔습니다.', k: 'ev', f: F('재판소 출어 허가 대장') })),
  E('ibe_fis_fis_salt', [15, 60], [T('IBE_FISH', 'fisher')], 25, 3, () => ({ t: '잡은 것을 염장했습니다. 내륙으로 가는 길에 값이 세 번 올랐습니다.', k: 'note', fx: { money: 1 } })),
  E('ibe_fis_own_boat', [20, 65], [T('IBE_FISH', 'owner')], 30, 2, () => ({ t: '선주가 되었습니다. 배 등록은 재판소가 했고 등록증에는 출어 한계선이 적혀 있었습니다.', k: 'ev' })),
  E('ibe_fis_own_crew', [20, 65], [T('IBE_FISH', 'owner')], 25, 3, () => ({ t: '선원 둘을 썼습니다. 둘 다 바다를 무서워했고, 그래서 뽑았습니다.', k: 'note' })),
  E('ibe_fis_fleet_boats', [28, 70], [T('IBE_FISH', 'fleet')], 30, 2, () => ({ t: '선단장으로 배 다섯을 움직였습니다. 재판소 순찰선이 다섯 다 알았습니다.', k: 'ev', fx: { standing: 1 } })),
  E('ibe_fis_fleet_scale', [28, 70], [T('IBE_FISH', 'fleet')], 25, 3, () => ({ t: '염린 선단과 거래했습니다. 값은 좋았고 묻지 않는 것이 조건이었습니다.', k: 'note', fx: { money: 2 } })),
  trans('ibe_fis_trans', 'IBE_FISH', [13, 70], {
    fisher: '어민이 되었습니다. 자기 그물을 가졌습니다.',
    owner: '배 한 척을 등기했습니다. 재판소 도장이 선체 번호 옆에 찍혔습니다.',
    fleet: '선단장이 되었습니다. 포구에서 이름을 아는 사람이 늘었습니다.',
  }),
  after('ibe_fis_after', 'IBE_FISH', [13, 70], {
    seaborn: '바다에서 온 것과 마주쳤습니다. 배는 잃었고 몸은 남았습니다.',
    drowning: '배가 뒤집혔습니다. 끌려 나왔고 다시 배를 타지 않았습니다.',
    ruin: '재판소 봉쇄선이 포구까지 내려왔습니다. 배를 뭍에 올렸습니다.',
    _: '배를 내렸습니다. 손의 소금기는 오래 남았습니다.',
  }),
  E('ibe_fis_aff_fincatcher', [12, 70], ['aff:IBE_FIS_FINCATCHER'], 25, 3, () => ({ t: '핀캐처. 지느러미 하나하나가 돈이었고, 돈은 적었습니다.', k: 'note' })),
  E('ibe_fis_aff_salt', [12, 70], ['aff:IBE_FIS_SALT'], 25, 3, () => ({ t: '소금배. 소금 사막을 건너는 배였고 물고기보다 소금을 더 많이 날랐습니다.', k: 'note' })),
  E('ibe_fis_aff_saltscale', [12, 70], ['aff:IBE_FIS_SALTSCALE'], 25, 3, () => ({ t: '염린 사냥. 값은 좋았고 돌아오지 않는 배도 있었습니다.', k: 'bad', fx: { money: 1, h: -1 } })),

  // ══════════ IBE_LIGHT 등대지기 ══════════
  E('ibe_lig_ass_stairs', [14, 35], [T('IBE_LIGHT', 'assistant')], 30, 2, () => ({ t: '등대 계단 218개. 하루 몇 번 오르는지 세다가 그만두었습니다.', k: 'ev', fx: { hl: -1 }, f: F('등대 점등 일지') })),
  E('ibe_lig_ass_oil', [14, 35], [T('IBE_LIGHT', 'assistant')], 25, 3, () => ({ t: '기름을 채우는 법, 심지를 자르는 법. 등대지기는 말로 가르치지 않았습니다.', k: 'note' })),
  E('ibe_lig_kee_night', [17, 80], [T('IBE_LIGHT', 'keeper')], 30, 2, () => ({ t: '등대 밤. 불빛이 닿는 곳에는 배가 없었고, 닿지 않는 곳에서 소리가 났습니다.', k: 'note', fx: { h: -1 } })),
  E('ibe_lig_kee_inq', [17, 80], [T('IBE_LIGHT', 'keeper')], 25, 3, () => ({ t: '재판관이 등대에 올랐습니다. 바다를 한참 보고 내려갔습니다. 말은 "꺼지지 않게"였습니다.', k: 'note', fx: { standing: 1 } })),
  E('ibe_lig_nam_pick', [40, 90], [T('IBE_LIGHT', 'naming')], 30, 2, () => ({ t: '후계로 아이 하나를 골랐습니다. 계단을 세지 않는 아이였습니다.', k: 'warm', fx: { h: 2 } })),
  E('ibe_lig_nam_hand', [40, 90], [T('IBE_LIGHT', 'naming')], 25, 3, () => ({ t: '후계에게 심지 자르는 법을 보여 주었습니다. 말은 하지 않았습니다.', k: 'note' })),
  trans('ibe_lig_trans', 'IBE_LIGHT', [15, 90], {
    keeper: '등대지기가 되었습니다. 열쇠 하나와 밤 전부를 받았습니다.',
    naming: '후계를 지정할 때가 왔습니다. 등대지기의 마지막 일이었습니다.',
  }),
  after('ibe_lig_after', 'IBE_LIGHT', [15, 90], {
    seaborn: '등대가 습격을 받았습니다. 불은 꺼졌다 켜졌고, 몸은 한동안 일어나지 못했습니다.',
    kia: '등대 방어에서 크게 다쳤습니다. 불은 다른 손이 지켰습니다.',
    _: '등대를 내려왔습니다. 밤에 불이 켜지는지 멀리서 확인하는 버릇이 남았습니다.',
  }),
  E('ibe_lig_aff_granfaro', [14, 90], ['aff:IBE_LIG_GRANFARO'], 25, 3, (s) => ({ t: s.year >= 1101 ? '그란파로 등대. 탈환 뒤 불은 다시 켜졌고 계단은 새로 놓였습니다.' : '그란파로 등대. 이베리아 해안에서 가장 밝은 불이었고 그래서 가장 많이 보였습니다.', k: 'note' })),
  E('ibe_lig_aff_rocky', [14, 90], ['aff:IBE_LIG_ROCKY'], 25, 3, () => ({ t: '로키 코스트. 등대 하나, 사람 둘, 바위 전부.', k: 'note' })),

  // ══════════ IBE_SCHOLAR 연구자·번역가 ══════════
  E('ibe_sch_ass_copy', [18, 35], [T('IBE_SCHOLAR', 'assistant')], 30, 2, () => ({ t: '조수로 황금기 문서 40장을 옮겨 적었습니다. 글자는 읽혔고 뜻은 재판소가 정했습니다.', k: 'ev', fx: { cap: { learn: 0.05 } }, f: F('재판소 문서고 열람 기록') })),
  E('ibe_sch_ass_lamp', [18, 35], [T('IBE_SCHOLAR', 'assistant')], 25, 3, () => ({ t: '밤 연구실. 등불은 재판소 것이었고 기름도 그랬습니다.', k: 'note' })),
  E('ibe_sch_sch_translate', [20, 60], [T('IBE_SCHOLAR', 'scholar')], 30, 2, () => ({ t: '타국 문서를 번역했습니다. 바다에 관한 구절은 따로 표시해 올렸습니다.', k: 'ev', fx: { standing: 1 } })),
  E('ibe_sch_sch_suspect', [20, 60], [T('IBE_SCHOLAR', 'scholar')], 20, 4, () => ({ t: '연구 내용에 질문이 들어왔습니다. 질문한 쪽은 재판소였고, 답은 사흘 걸렸습니다.', k: 'bad', fx: { h: -2 } })),
  E('ibe_sch_sec_desk', [28, 65], [T('IBE_SCHOLAR', 'secretary')], 30, 2, () => ({ t: '재판소 비서로 재판관의 서류를 정리했습니다. 읽지 말아야 할 것과 읽어야 할 것이 같은 상자에 있었습니다.', k: 'ev' })),
  E('ibe_sch_sec_bio', [28, 65], [T('IBE_SCHOLAR', 'secretary')], 20, 4, (s) => { s.S.flags.rhodes_legal = s.S.age; return { t: '연구 자료가 외부 제약회사로 넘어가야 했습니다. 로도스 아일랜드라는 이름이 서류에 처음 적혔습니다.', k: 'note' }; }),
  trans('ibe_sch_trans', 'IBE_SCHOLAR', [19, 65], {
    scholar: '연구자 자격을 받았습니다. 자기 이름으로 서가 하나를 썼습니다.',
    secretary: '재판소 비서가 되었습니다. 책상이 등불 가까이로 옮겨졌습니다.',
  }),
  after('ibe_sch_after', 'IBE_SCHOLAR', [19, 65], {
    arrest: '재판소에 끌려갔다 풀려났습니다. 연구는 압수되었습니다.',
    seaborn: '습격에서 살아남았습니다. 연구실은 남지 않았습니다.',
    _: '연구를 접었습니다. 번역하던 문장 하나가 오래 머리에 남았습니다.',
  }),
  E('ibe_sch_aff_inq', [18, 65], ['aff:IBE_SCH_INQ'], 25, 3, () => ({ t: '재판소 산하 연구. 연구 주제는 바다였고 결론은 늘 "경계"였습니다.', k: 'note' })),
  E('ibe_sch_aff_translator', [18, 65], ['aff:IBE_SCH_TRANSLATOR'], 25, 3, () => ({ t: '민간 번역가. 타국 책을 옮기면 재판소가 한 번 더 읽었습니다.', k: 'note' })),
  E('ibe_sch_aff_bio', [18, 65], ['aff:IBE_SCH_BIO'], 25, 3, () => ({ t: '생명공학. 표본은 바다에서 왔고 그 출처는 보고서에 적지 않았습니다.', k: 'note', fx: { cap: { learn: 0.05 } } })),

  // ══════════ IBE_NURSE 예배당 간호인 ══════════
  E('ibe_nur_vol_bandage', [14, 35], [T('IBE_NURSE', 'volunteer')], 30, 2, () => ({ t: '예배당 봉사자로 붕대를 감았습니다. 환자의 반은 해안에서 왔습니다.', k: 'ev' })),
  E('ibe_nur_vol_pray', [14, 35], [T('IBE_NURSE', 'volunteer')], 25, 3, () => ({ t: '기도 시간. 환자들은 바다 쪽으로 등을 돌리고 누웠습니다.', k: 'note' })),
  E('ibe_nur_nur_rounds', [16, 60], [T('IBE_NURSE', 'nurse')], 30, 2, () => ({ t: '회진. 환자 12, 침상 9.', k: 'ev', fx: { hl: -1 }, f: F('예배당 간호 일지') })),
  E('ibe_nur_nur_inq', [16, 60], [T('IBE_NURSE', 'nurse')], 25, 3, () => ({ t: '재판관이 환자를 보러 왔습니다. 등불보다 붕대를 먼저 들었고, 그것이 의외였습니다.', k: 'note' })),
  E('ibe_nur_head_roster', [24, 65], [T('IBE_NURSE', 'head')], 30, 2, () => ({ t: '수석 간호인으로 당번표를 짰습니다. 밤 당번에 자기 이름을 가장 많이 넣었습니다.', k: 'ev', fx: { standing: 1 } })),
  E('ibe_nur_head_supply', [24, 65], [T('IBE_NURSE', 'head')], 25, 3, () => ({ t: '약품이 모자랐습니다. 재판소에 청했고 반이 왔습니다.', k: 'bad', fx: { h: -1 } })),
  E('ibe_nur_pick_lamp', [24, 65], [T('IBE_NURSE', 'picked')], 30, 2, () => ({ t: '재판소 발탁 뒤 등불을 받았습니다. 붕대 감던 손으로 심지를 잡았습니다.', k: 'ev' })),
  E('ibe_nur_pick_patient', [24, 65], [T('IBE_NURSE', 'picked')], 25, 3, () => ({ t: '옛 환자가 재판소 복장을 보고 멈춰 섰습니다. 인사는 했고 말은 짧았습니다.', k: 'note' })),
  trans('ibe_nur_trans', 'IBE_NURSE', [15, 65], {
    nurse: '정식 간호인이 되었습니다. 침상 아홉이 책임이 되었습니다.',
    head: '수석 간호인이 되었습니다. 당번표를 짜는 쪽이 되었습니다.',
    picked: (s) => ({ t: '재판소가 발탁했습니다. 예배당을 떠나는 날 환자들이 복도에 나와 있었습니다.', k: 'big', fx: { h: 3 } }),
  }),
  after('ibe_nur_after', 'IBE_NURSE', [15, 65], {
    overwork: '과로로 쓰러졌습니다. 예배당은 침상 하나를 내주었습니다.',
    seaborn: '예배당이 습격을 받았습니다. 살아남았고 환자 명단은 짧아졌습니다.',
    _: '예배당을 떠났습니다. 붕대 감는 손놀림은 남았습니다.',
  }),
  E('ibe_nur_aff_chapel', [14, 65], ['aff:IBE_NUR_CHAPEL'], 25, 3, () => ({ t: '예배당. 제단은 비었고 침상은 찼습니다.', k: 'note' })),
  E('ibe_nur_aff_medic', [14, 65], ['aff:IBE_NUR_MEDIC'], 25, 3, () => ({ t: '재판소 의무반. 환자의 반은 병사였고 반은 병사가 데려온 사람이었습니다.', k: 'note' })),
  canon('ibe_canon_lumen', [1097, 1107], [T('IBE_NURSE')], [14, 50], '간호인 출신이라는 재판관이 환자 침상 옆에 앉아 등불보다 붕대를 먼저 들었습니다. 에기르라고 누가 말했고, 아무도 더 말하지 않았습니다.'),

  // ══════════ IBE_BUILDER 건설 노동(황금기 잔존) ══════════
  E('ibe_bui_hand_stone', [14, 35], [T('IBE_BUILDER', 'hand')], 30, 2, () => ({ t: '잡역. 좌초한 도시의 판금을 떼어 내륙으로 날랐습니다.', k: 'ev', fx: { hl: -1 } })),
  E('ibe_bui_hand_shame', [14, 35], [T('IBE_BUILDER', 'hand')], 25, 3, () => ({ t: '황금기 건물을 헐었습니다. 지나가던 노인이 "수치"라고 했습니다. 누구를 향한 말인지 몰랐습니다.', k: 'note', fx: { h: -1 } })),
  E('ibe_bui_ski_wall', [17, 55], [T('IBE_BUILDER', 'skilled')], 30, 2, () => ({ t: '숙련 노동으로 방벽을 올렸습니다. 재판소가 선을 그렸고 그 선 위에 돌을 놓았습니다.', k: 'ev' })),
  E('ibe_bui_ski_pay', [17, 55], [T('IBE_BUILDER', 'skilled')], 25, 3, () => ({ t: '임금이 늦었습니다. 재판소 공사였고, 재판소에 가서 물을 사람은 없었습니다.', k: 'bad', fx: { h: -1 } })),
  E('ibe_bui_fore_crew', [24, 60], [T('IBE_BUILDER', 'foreman')], 30, 2, () => ({ t: '현장 반장으로 스물을 맡았습니다. 해안에서 온 사람이 반이었습니다.', k: 'ev', fx: { standing: 1 } })),
  E('ibe_bui_fore_ruin', [24, 60], [T('IBE_BUILDER', 'foreman')], 25, 3, () => ({ t: '유적 보수 현장. 황금기 기둥을 세우는 일이었고, 누구를 위한 일인지 묻는 사람은 없었습니다.', k: 'note' })),
  trans('ibe_bui_trans', 'IBE_BUILDER', [15, 60], {
    skilled: '숙련 노동자가 되었습니다. 임금이 조금 올랐습니다.',
    foreman: '현장 반장이 되었습니다. 재판소 도면을 직접 받았습니다.',
  }),
  after('ibe_bui_after', 'IBE_BUILDER', [15, 60], {
    accident: '현장 사고가 났습니다. 몸이 예전처럼 움직이지 않았습니다.',
    ruin: '공사가 끊겼습니다. 재판소 예산이 바다 쪽으로 갔다고 했습니다.',
    scandal: '현장 자재가 없어진 일에 이름이 올랐습니다. 다른 현장은 받아 주지 않았습니다.',
    _: '현장을 떠났습니다. 손바닥 굳은살은 남았습니다.',
  }),
  E('ibe_bui_aff_stranded', [14, 60], ['aff:IBE_BUI_STRANDED'], 25, 3, () => ({ t: '좌초 도시 보수. 도시는 움직이지 않았고 그 위에서 사람들은 살았습니다.', k: 'note' })),
  E('ibe_bui_aff_ruins', [14, 60], ['aff:IBE_BUI_RUINS'], 25, 3, () => ({ t: '황금기 유적. 돌마다 옛 문장이 있었고 재판소는 그 문장을 덮으라고 했습니다.', k: 'note' })),

  // ══════════ IBE_DEEP 심해교회 신도 (전환 전용) ══════════
  E('ibe_dee_con_voice', [12, 80], [T('IBE_DEEP', 'contact')], 30, 2, () => ({ t: '바다 쪽에서 부르는 소리를 들었다는 사람과 자주 만났습니다. 그 사람은 늘 젖은 신발이었습니다.', k: 'note' })),
  E('ibe_dee_con_gift', [12, 80], [T('IBE_DEEP', 'contact')], 25, 3, () => ({ t: '조개껍데기 하나를 받았습니다. 귀에 대면 소리가 났습니다. 바다가 아닌 소리였습니다.', k: 'note', fx: { h: 1 } })),
  E('ibe_dee_bel_gather', [12, 80], [T('IBE_DEEP', 'believer')], 30, 2, () => ({ t: '밤 모임. 바닥은 젖어 있었고 아무도 춥다고 하지 않았습니다.', k: 'note', fx: { h: 1 } })),
  E('ibe_dee_bel_hide', [12, 80], [T('IBE_DEEP', 'believer')], 25, 3, () => ({ t: '재판소 순찰이 지나갔습니다. 신도들은 평범한 얼굴로 서 있었고, 평범한 얼굴이 가장 어려웠습니다.', k: 'bad', fx: { h: -1 } })),
  E('ibe_dee_bis_flock', [20, 80], [T('IBE_DEEP', 'bishop')], 30, 2, () => ({ t: '주교로 신도들을 이끌었습니다. 낮에는 다른 이름으로 살았습니다.', k: 'note', fx: { standing: 1 } })),
  E('ibe_dee_bis_rite', [20, 80], [T('IBE_DEEP', 'bishop')], 25, 3, () => ({ t: '의식이 있었습니다. 바다로 들어간 사람은 돌아오지 않았고, 남은 사람들은 노래했습니다.', k: 'bad', fx: { h: -2 } })),
  E('ibe_dee_chg_skin', [12, 90], [T('IBE_DEEP', 'changed')], 30, 2, () => ({ t: '피부가 달라졌습니다. 물에 들어가면 편했고 나오면 아팠습니다.', k: 'bad', fx: { hl: -3 } })),
  E('ibe_dee_chg_sea', [12, 90], [T('IBE_DEEP', 'changed')], 25, 3, () => ({ t: '바다 쪽에서 부르는 소리가 이제 분명히 들렸습니다. 다른 사람에게는 들리지 않는다는 것도 알았습니다.', k: 'bad', fx: { h: -1 } })),
  trans('ibe_dee_trans', 'IBE_DEEP', [12, 90], {
    believer: '신도가 되었습니다. 이름을 하나 더 받았고 그 이름은 젖은 채로 발음되었습니다.',
    bishop: '주교 자리를 받았습니다. 아는 사람은 신도들뿐이었습니다.',
    changed: (s) => ({ t: '몸이 바뀌기 시작했습니다. 돌아갈 수 있는 지점은 지난 뒤였습니다.', k: 'bad', fx: { hl: -5, h: -3 } }),
  }),
  E('ibe_dee_aff_village', [12, 90], ['aff:IBE_DEE_VILLAGE'], 25, 3, () => ({ t: '해안 마을 교단. 마을 절반이 신도였고 나머지 절반은 모르는 척했습니다.', k: 'note' })),
  E('ibe_dee_aff_infiltrator', [12, 90], ['aff:IBE_DEE_INFILTRATOR'], 25, 3, () => ({ t: '재판소 안에서 신도로 살았습니다. 등불을 들고 모임 장소를 지나쳤습니다.', k: 'bad', fx: { h: -2, standing: 1 } })),
  E('ibe_dee_aff_bishop', [12, 90], ['aff:IBE_DEE_BISHOP'], 25, 3, () => ({ t: '위장 주교 계열. 낮의 직함과 밤의 직함이 달랐습니다.', k: 'note' })),

  // ══════════ 생업·계절·명절·동네 (A11: COAST·FISH·LIGHT·FARM·BUILDER) ══════════
  E('ibe_live_lighting', [8, 95], [N, 'arch:A11'], 25, 3, (s) => ({ t: fest(s, 1) + '. 마을 등대에 불이 들어왔습니다. 올해도 꺼지지 않았다고 노인들이 말했습니다.', k: 'warm', fx: { h: 2 } })),
  E('ibe_live_mourning', [8, 95], [N, 'arch:A11'], 25, 3, (s) => ({ t: fest(s, 0) + '. 바다 쪽을 향해 아무 말도 하지 않는 날이었습니다. 아이들도 조용했습니다.', k: 'note' })),
  E('ibe_live_fog', [8, 95], [N, 'arch:A11'], 25, 3, () => ({ t: '해무가 내륙까지 올라온 날. 문을 닫았고, 소리가 나도 열지 않았습니다.', k: 'note', fx: { h: -1 } })),
  E('ibe_live_preach', [12, 95], [N, 'arch:A11', '!' + T('IBE_DEEP')], 20, 4, (s) => { s.S.flags.deepContact = s.S.age; return { t: '낯선 사람이 바다를 가리키며 구원을 말했습니다. 마을 사람 몇이 끝까지 들었습니다.', k: 'note' }; }),
  E('ibe_live_saltfish', [8, 95], [N, 'arch:A11'], 20, 4, () => ({ t: '염장 생선을 말리는 계절. 마을 전체가 같은 냄새였습니다.', k: 'warm' })),
  E('ibe_live_pass', [12, 95], [N, 'arch:A11'], 20, 4, () => ({ t: '재판소 통행증 갱신. 줄은 길었고 질문은 3개였습니다.', k: 'note', f: F('재판소 통행증 발급 대장') })),
  E('ibe_live_salt_wind', [8, 95], [N, 'arch:A11'], 20, 4, () => ({ t: '소금 사막 쪽 바람이 불었습니다. 빨래가 하루 만에 하얘졌습니다.', k: 'note' })),
  E('ibe_live_doblon', [12, 95], [N, 'arch:A11'], 15, 5, () => ({ t: '노인이 옛 금화를 꺼내 보였습니다. 고요함 뒤로는 찍지 않는 돈이라고 했습니다.', k: 'note' })),

  // ══════════ 에기르 혈통 의심(rel:institutional) ══════════
  E('ibe_aeg_paper', [12, 90], [N, 'rel:institutional'], 30, 3, () => ({ t: '서류의 종족 칸이 나머지 칸을 정했습니다. 에기르라고 적힌 날 뒤로 통행증은 더 오래 걸렸습니다.', k: 'bad', fx: { h: -2 } })),
  E('ibe_aeg_window', [12, 90], [N, 'rel:institutional'], 25, 4, () => ({ t: '그란파로에서 에기르는 거의 남지 않았다고 들었습니다. 남은 사람들은 바다 쪽 창을 막고 살았습니다.', k: 'note' })),
  E('ibe_aeg_arrest', [14, 90], [N, 'rel:institutional', '!prison:jail'], 20, 5, (s) => arrestAegir(s, 0.3, 0.05)),
  E('ibe_aeg_hide', [14, 90], [N, 'rel:institutional'], 20, 4, () => ({ t: '물에 오래 있지 않는 법을 배웠습니다. 피부가 마르면 아팠지만, 젖어 있으면 눈에 띄었습니다.', k: 'bad', fx: { hl: -1 } })),
  E('ibe_aeg_1100', [12, 90], [N, 'rel:institutional'], 70, 0, () => ({ t: '에기르와 다시 연결되었다는 소식 뒤로 거리의 눈이 조금 달라졐습니다. 적대인지 호기심인지 구분하기 어려웠습니다.', k: 'note', fx: { h: 1 } }), { c: (s) => s.year >= 1101 && s.year <= 1102 }),

  // ══════════ 이주 신참(newcomer) ══════════
  E('ibe_new_coast', [10, 80], [N, 'newcomer'], 40, 3, () => ({ t: '이베리아에 와서 처음 배운 말은 "등대가 꺼지지 않기를"이었습니다. 두 번째는 재판소 통행증 서식이었습니다.', k: 'note' })),
  E('ibe_new_sea', [10, 80], [N, 'newcomer'], 30, 4, () => ({ t: '바다 쪽으로 가지 말라는 말을 세 사람에게 들었습니다. 셋 다 이유는 말하지 않았습니다.', k: 'note' })),
];

export const decisions = {
  // 재판소 입소 문답(자격자 첫해)
  ibe_inq_qa: {
    tags: [T('IBE_INQ', 'candidate')], once: true,
    ok: (s) => !!s.S.track,
    build: () => ({ title: '문답', body: '입소 문답. "왜 심판하려 하는가, 무엇을 심판하려 하는가." 대답은 기록됩니다.',
      choices: [{ k: 'order', label: '질서를 지키기 위해', auto: 1 }, { k: 'sea', label: '바다에서 온 것을 막기 위해', auto: 1 }, { k: 'self', label: '나 자신을', auto: 0.5 }] }),
    apply: (s, k) => k === 'order' ? { t: '"질서"라고 답했습니다. 재판관은 고개를 끄덕였고 기록원은 받아 적었습니다.', k: 'ev', fx: { standing: 3 } }
      : k === 'sea' ? { t: '"바다에서 온 것"이라고 답했습니다. 재판관은 등불을 조금 들었다 내렸습니다.', k: 'ev', fx: { standing: 2, cap: { arts: 0.05 } } }
      : { t: '"나 자신"이라고 답했습니다. 재판관은 한참 보았고, 기록원은 그 줄을 비워 두었습니다.', k: 'note', fx: { standing: -2, h: 2 } },
  },
  // 재판관의 집행
  ibe_inq_execute: {
    tags: [T('IBE_INQ')], once: false, gap: 5,
    ok: (s) => !!s.S.track && s.S.track.stage >= 2 && s.rng.chance(0.4),
    build: () => ({ title: '집행', body: '심문이 끝났습니다. 혐의는 교단 접촉. 증거는 젖은 바닥과 조개껍데기 하나. 집행을 명할 수 있습니다.',
      choices: [{ k: 'exec', label: '집행한다', auto: 1 }, { k: 'hold', label: '보류한다', sub: '더 조사한다', auto: 0.8 }] }),
    apply: (s, k) => k === 'exec' ? { t: '집행했습니다. 마을은 조용해졌고 보고서는 한 줄이었습니다.', k: 'bad', fx: { standing: 3, h: -4 } }
      : (s.rng.chance(0.25) ? { t: '보류했습니다. 다음 달 그 마을에서 사람이 셋 사라졌습니다. 보고서에는 보류한 이름이 적혔습니다.', k: 'bad', fx: { standing: -5, h: -3 } } : { t: '보류했습니다. 더 조사했고, 조개껍데기는 아이의 것이었습니다.', k: 'ev', fx: { standing: 1, h: 2 } }),
  },
  // 해안 봉쇄
  ibe_inq_blockade: {
    tags: [T('IBE_INQ')], once: false, gap: 6,
    ok: (s) => !!s.S.track && s.S.track.stage >= 2 && s.rng.chance(0.35),
    build: () => ({ title: '봉쇄', body: '해안 마을에서 식량을 청했습니다. 봉쇄선을 열면 사람이 나오고, 열지 않으면 사람이 줄어듭니다.',
      choices: [{ k: 'keep', label: '봉쇄를 유지한다', auto: 1 }, { k: 'food', label: '식량만 넣는다', auto: 1 }, { k: 'open', label: '봉쇄를 푼다', auto: 0.3 }] }),
    apply: (s, k) => k === 'keep' ? { t: '봉쇄를 유지했습니다. 마을 인원 보고서의 숫자가 다음 분기에 줄었습니다.', k: 'bad', fx: { standing: 2, h: -3 } }
      : k === 'food' ? { t: '식량을 넣었습니다. 담 너머에서 다투는 소리가 났고 소란자 하나를 데려왔습니다.', k: 'ev', fx: { standing: 1, h: -1 } }
      : (s.rng.chance(0.4) ? { t: '봉쇄를 풀었습니다. 나온 사람 중 하나가 내륙 마을에서 문제가 되었습니다. 책임은 서명한 사람에게 돌아왔습니다.', k: 'bad', fx: { standing: -6, h: -2 } } : { t: '봉쇄를 풀었습니다. 사람들이 내륙으로 걸어갔고 아무 일도 일어나지 않았습니다. 재판소는 그것을 기록하지 않았습니다.', k: 'ev', fx: { standing: -2, h: 3 } }),
  },
  // 심해교회 포교 → 개종(전환 전용 진로)
  ibe_deep_contact: {
    tags: [N, '!' + T('IBE_DEEP'), '!' + T('IBE_INQ')], once: true,
    ok: (s) => s.S.age >= 12 && s.S.flags.deepContact != null && s.S.age - s.S.flags.deepContact <= 2 && (!s.S.urban || s.rng.chance(0.3)),
    build: () => ({ title: '구원', body: '바다를 가리키던 사람이 다시 왔습니다. 밤 모임에 오라고 했습니다. 바닥이 젖어 있어도 춥지 않다고 했습니다.',
      choices: [{ k: 'no', label: '가지 않는다', auto: 2 }, { k: 'report', label: '재판소에 알린다', auto: 0.7 }, { k: 'go', label: '간다', auto: 0.5 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '가지 않았습니다. 그 사람은 다른 집 문을 두드렸습니다.', k: 'note' };
      if (k === 'report') return { t: '재판소에 알렸습니다. 다음 주 그 사람은 보이지 않았고, 마을 사람 둘도 보이지 않았습니다.', k: 'bad', fx: { h: -2 } };
      const aff = s.S.track && s.S.track.id === 'IBE_CLERK' ? 'IBE_DEE_BISHOP' : 'IBE_DEE_VILLAGE';
      if (!s.enterTrack('IBE_DEEP', { how: 'switch', via: 'contact', aff, quiet: true })) return '모임은 없던 일이 되었습니다.';
      return { t: '밤 모임에 갔습니다. 바닥은 젖어 있었고 춥지 않았습니다. 돌아오는 길에 신발이 마르지 않았습니다.', k: 'note', fx: { h: 2 } };
    },
  },
  // 해적: 유물 밀매
  ibe_pirate_relic: {
    tags: [T('IBE_PIRATE')], once: false, gap: 5,
    ok: (s) => !!s.S.track && s.S.track.stage >= 1 && s.rng.chance(0.4),
    build: (s) => ({ title: '유물', body: '소금 사막에서 황금기 유물이 나왔습니다. 재판소가 금지한 물건이고, 내륙 상인은 ' + medX(s, 1.5).toLocaleString() + ' LMD를 부릅니다.',
      choices: [{ k: 'sell', label: '넘긴다', auto: 1.2 }, { k: 'bury', label: '다시 묻는다', auto: 0.6 }] }),
    apply: (s, k) => k === 'bury' ? { t: '다시 묻었습니다. 선원들은 불만이었고 재판소 공고에는 이름이 오르지 않았습니다.', k: 'note', fx: { standing: -2 } }
      : (s.rng.chance(0.2) ? (s.fall('arrest'), false) : { t: '넘겼습니다. 상자는 내륙으로 갔고 돈은 선원들 몫으로 갈렸습니다.', k: 'ev', fx: { money: medX(s, 1.5), standing: 2 } }),
  },
  // 형벌 대대 엘리트 → 재판소 지원
  ibe_penal_apply: {
    tags: [T('IBE_PENAL', 'elite')], once: true,
    ok: (s) => !!s.S.track && !s.S.ori.on && s.S.cap.learn >= -0.8 && s.rng.chance(0.5),
    build: () => ({ title: '지원', body: '재판관이 지원 자격이 있다고 했습니다. 입소 문답과 경전, 등불 훈련이 기다립니다. 떨어지면 대대로 돌아옵니다.',
      choices: [{ k: 'apply', label: '지원한다', auto: 1 }, { k: 'stay', label: '대대에 남는다', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'stay') return { t: '대대에 남았습니다. 재판관은 다시 묻지 않았습니다.', k: 'note', fx: { standing: 1 } };
      if (s.rng.chance(0.4)) return { t: '지원했고 떨어졌습니다. 경전 암송에서였습니다. 대대 막사의 침상은 그대로였습니다.', k: 'bad', fx: { h: -2 } };
      if (!s.enterTrack('IBE_INQ', { how: 'switch', via: 'penal_elite', stage: 1, skipExam: true, quiet: true })) return '지원은 받아들여지지 않았습니다.';
      return { t: '지원했고 받아들여졌습니다. 자격자 표식을 받았고, 대대 동기들은 멀리서 보았습니다.', k: 'big', fx: { h: 3 } };
    },
  },
  // 혼인 유형 덮어쓰기(이베리아). chapel 은 쉐라그와 id 를 공유하므로 이베리아 밖에서는 엔진 문구
  marry_chapel: marryDecision('chapel',
    (s, pr, t) => wa(pr.name) + ' 혼담이 오갑니다. 예배당 혼인입니다. 민정 서기가 장부에 적고 지참금은 ' + Math.round(s.med * t.dowry).toLocaleString() + ' LMD.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람입니다.' : ''),
    (s, pr) => wa(pr.name) + ' 혼인했습니다. 예배당 제단은 비어 있었고 서기가 장부에 두 이름을 적었습니다.'),
  marry_coast: marryDecision('coast',
    (s, pr) => wa(pr.name) + ' 결연합니다. 봉쇄 마을의 결연은 장부가 없습니다. 장로가 보고 마을이 기억합니다.',
    (s, pr) => wa(pr.name) + ' 결연했습니다. 장로가 두 사람의 물건 이름을 나란히 불렀습니다.'),
  marry_inquisition: marryDecision('inquisition',
    (s, pr, t) => wa(pr.name) + ' 혼담이 오갑니다. 재판소 승인 혼인입니다. 상대의 혈통 서류가 먼저 심사되고, 지참금은 ' + Math.round(s.med * t.dowry).toLocaleString() + ' LMD.',
    (s, pr) => wa(pr.name) + ' 혼인했습니다. 재판소 도장이 혼인 서류에 찍혔고, 그 도장이 등불 모양이었습니다.'),
  marry_deep: marryDecision('deep',
    (s, pr) => wa(pr.name) + ' 결연합니다. 교단 결연입니다. 밤 모임에서, 젖은 바닥 위에서.',
    (s, pr) => wa(pr.name) + ' 결연했습니다. 신도들이 노래했고 바다 쪽 창은 열려 있었습니다.'),
  home_change: {
    once: false, gap: 5, at: 0.7,
    ok: ENGINE_DECISIONS.home_change.ok,
    build: (s) => {
      if (!here(s)) return ENGINE_DECISIONS.home_change.build(s);
      const opts = homeChangeOptions(s).slice(0, 3); if (!opts.length) return null;
      return { title: '집', body: '집을 마련할 만큼 모였습니다. 등기는 재판소가 하고, 바다에서 얼마나 떨어졌는지가 값을 정합니다.',
        choices: opts.map((h) => ({ k: h.id, label: h.name, sub: Math.round(s.med * h.buy).toLocaleString() + ' LMD', auto: h.w ?? 1 })).concat([{ k: 'no', label: '그대로 산다', auto: 1 }]) };
    },
    apply: (s, k) => {
      if (!here(s)) return ENGINE_DECISIONS.home_change.apply(s, k);
      if (k === 'no') return '그대로 살기로 했습니다.';
      const h = homeChangeOptions(s).find((x) => x.id === k);
      if (!h || !setHousing(s, h, { buy: true, quiet: true })) return '등기는 나지 않았습니다.';
      return { t: eul(h.name) + ' 마련했습니다. 재판소 등기 서류에 바다까지의 거리가 적혀 있었습니다.', k: 'warm', fx: { h: 3 } };
    },
  },
};

export default { events, decisions };
