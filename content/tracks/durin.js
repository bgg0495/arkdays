// W9h 두린 진로 콘텐츠(§11, D40 국가 전용). 8 진로 전부, 단계마다 2개 + 지하 돔 일상·대표단·돔 축일·지상행(치료 목적 ctx.migrate).
// 톤: 작은 지하 도시. 전쟁도 재앙도 없고 술은 많다. 유일한 재해는 천장. 지상 정치에 무관심. 담백체(D25), 각주는 숫자 있을 때만(D31), 조사는 text.js(D30).
// 로도스는 지하에서 닫혀 있다(rhodes.json closed). 지상행 뒤에만 열린다 — 여기서는 지상행 이주만 맡고 입구는 엔진에 둔다.
import { eul, iga, eun, wa, ro, ieot } from '../../src/engine/text.js';
import { F, medX, cul, fest } from '../_util.js';

const partner = (s) => (s.S.fam.partner && s.S.fam.partner.alive ? s.S.fam.partner : null);
const affIs = (s, ...ids) => !!s.S.track && ids.includes(s.S.track.aff);
const inDome = (s) => s.S.cur === 'durin';
const domeF = (doc, year) => F('돔 공동체 기록소 ' + doc + (year == null ? '' : ', ' + year + '년'));
function canonOk(s, id) {
  const f = (s.data.canonFigures || []).find((x) => x.id === id);
  if (!f) return false;
  if (s.year < f.years[0] || s.year > f.years[1]) return false;
  return (s.S.flags.canonSeen || 0) < 3;
}
const canonSee = (s) => { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; };
const afterFall = (s, track, outcome) => s.S.flags.lastTrack === track && s.S.flags.lastFallAt != null && s.S.age - s.S.flags.lastFallAt <= 1 && (!outcome || s.S.flags.lastFallOutcome === outcome) && !s.S.track;
/** 대표(rep) 단계 공통 */
const repStage = (s) => !!s.S.track && !!s.stage && (s.stage.id === 'rep' || s.stage.id === 'mayor');

export const events = [
  // ── DUR_DESIGN 구조 설계·건축 ──
  { id: 'dur_des_app_draw', a: [14, 35], tags: ['track:DUR_DESIGN:apprentice'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['설계 견습으로 들어갔습니다. 첫 도면은 제 방이었습니다. 방이 도면보다 작았습니다.', '천장 균열을 재는 법을 배웠습니다. 자로 재고, 손으로 다시 쟀습니다.', '선배가 "천장은 거짓말을 안 한다"고 했습니다. 돔에서 그것은 농담이 아니었습니다.']), k: 'note', fx: { cap: { learn: 0.04 } } }) },
  { id: 'dur_des_app_tavern', a: [14, 35], tags: ['track:DUR_DESIGN:apprentice'], w: 25, gap: 3,
    run: (s) => ({ t: '설계 조 회식은 술집 위층에서 했습니다. 도면을 탁자에 펴 놓고 ' + eul(cul(s).drink) + ' 쏟지 않는 것이 견습의 첫 기술이었습니다.', k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } }) },
  { id: 'dur_des_eng_crack', a: [17, 70], tags: ['track:DUR_DESIGN:engineer'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['대돔 보수를 맡았습니다. 균열 하나에 한 계절이 들었습니다.', '새 구획 설계가 투표에 올라갔습니다. 통과되었습니다. 반대표는 천장이 낮다는 이유였습니다.', '지하수 길을 피해 기둥을 옮겼습니다. 기둥이 옮겨진 자리에 아무도 눈치채지 못했습니다. 그것이 잘된 설계였습니다.']), k: 'ev', fx: { standing: 2, cap: { learn: 0.02 } } }) },
  { id: 'dur_des_eng_dome', a: [17, 70], tags: ['aff:DUR_DES_DOME'], w: 25, gap: 4,
    run: (s) => ({ t: '대돔 보수반은 천장에 매달려 일했습니다. 아래에서 올려다보면 작은 사람들이 더 작게 보였습니다.', k: 'note', fx: { hl: -1, standing: 2 } }) },
  { id: 'dur_des_arc_hall', a: [22, 80], tags: ['track:DUR_DESIGN:architect'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['건축가가 되었습니다. 제 이름이 붙은 구획이 생겼습니다. 이름은 작게 새겼습니다. 돔에서는 다들 그렇게 했습니다.', '수몰 구역을 어떻게 쓸지 투표에 부쳤습니다. 리조트가 이겼습니다. 저는 창고에 표를 던졌습니다.']), k: 'ev', fx: { standing: 3 } }) },
  { id: 'dur_des_arc_minimalist', a: [20, 80], tags: ['track:DUR_DESIGN'], w: 8, c: (s) => canonOk(s, 'minimalist'),
    run: (s) => { canonSee(s); return { t: '작은 건축가 하나가 창고 도면을 다시 그려 주고는 "체류는 일시적"이라고 세 번 말하는 것을 보았습니다. 도면은 좋았습니다.', k: 'note', fx: { cap: { learn: 0.02 } } }; } },
  { id: 'dur_des_rep_vote', a: [30, 90], tags: ['track:DUR_DESIGN:rep'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['설계 대표로 뽑혔습니다. 주민 투표였고, 표 차이는 ' + s.rng.ri(3, 40) + '표였습니다.', '대표단 회의에서 공업 대표와 기둥 간격을 두고 한 시간 다퉜습니다. 끝나고 같이 마셨습니다.']), k: 'big', fx: { standing: 4 }, f: domeF('주민 투표 결과', s.year) }) },
  { id: 'dur_des_rep_collapse_scare', a: [30, 90], tags: ['track:DUR_DESIGN:rep'], w: 25, gap: 4,
    run: (s) => ({ t: '천장에서 돌이 떨어졌습니다. 주먹만 했습니다. 도시 전체가 사흘 동안 그 돌 이야기만 했고, 대표는 사흘 동안 잠을 못 잤습니다.', k: 'bad', fx: { h: -3, standing: 2 } }) },

  // ── DUR_INDUSTRY 공업·자동기계 ──
  { id: 'dur_ind_app_gear', a: [14, 35], tags: ['track:DUR_INDUSTRY:apprentice'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['공업 견습이 되었습니다. 첫해는 톱니를 닦았습니다. 톱니가 저보다 컸습니다.', '자동기계 하나가 견습실을 돌아다녔습니다. 이름은 없었고, 다들 이름으로 불렀습니다.', '기름 냄새가 몸에 뱄습니다. ' + (s.S.fam.mom.alive ? '어머니가' : '동생이') + ' 식탁에서 코를 막았고, ' + (s.S.fam.dad.alive && !s.S.fam.dad.absent ? '아버지는' : '이웃은') + ' 웃었습니다.']), k: 'note', fx: { cap: { skill: 0.04 } } }) },
  { id: 'dur_ind_app_small', a: [14, 35], tags: ['track:DUR_INDUSTRY:apprentice'], w: 25, gap: 3,
    run: (s) => ({ t: '지상에서 들여온 부품이 두린 손에 맞지 않았습니다. 다시 깎았습니다. 지상 물건은 늘 조금 컸습니다.', k: 'note', fx: { cap: { skill: 0.02 } } }) },
  { id: 'dur_ind_mec_fix', a: [17, 70], tags: ['track:DUR_INDUSTRY:mechanic'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['기계공이 되었습니다. 돔의 환기구 절반이 제 손을 거쳤습니다.', '자동기계가 고장 나 구획 하나가 하루 멈췄습니다. 고쳤습니다. 고치는 동안 주민들이 구경을 왔습니다.', '발전기 소리가 달라진 것을 제가 제일 먼저 들었습니다. 그날 밤 교대로 지켰습니다.']), k: 'ev', fx: { standing: 2 } }) },
  { id: 'dur_ind_mec_lift', a: [17, 70], tags: ['aff:DUR_IND_LIFT'], w: 25, gap: 4,
    run: (s) => ({ t: '승강기 보수 날이었습니다. 승강기가 멈추면 지상과의 길이 하루 끊겼고, 아무도 아쉬워하지 않았습니다.', k: 'note', fx: { standing: 2 } }) },
  { id: 'dur_ind_des_automata', a: [22, 80], tags: ['track:DUR_INDUSTRY:designer'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['자동기계를 설계했습니다. 첫 작품은 술잔을 나르는 기계였습니다. 투표 없이 통과되었습니다.', '설계도가 지상 광산 쪽에 팔렸습니다. 값은 좋았고, 설계도에 두린 글자가 그대로 남았습니다.']), k: 'ev', fx: { standing: 3, money: medX(s, 0.5) } }) },
  { id: 'dur_ind_des_cannon', a: [22, 80], tags: ['aff:DUR_IND_GENERATOR'], w: 25, gap: 4,
    run: (s) => ({ t: '지상 발전기 일을 하다 두린과 티아카우가 술맛으로 다퉈 술 대포를 쐈다는 이야기를 들었습니다. 다리가 하나 부서졌다고 했습니다. 다들 웃었고, 저도 웃었습니다.', k: 'note', fx: { h: 2 } }) },
  { id: 'dur_ind_rep_seat', a: [30, 90], tags: ['track:DUR_INDUSTRY:rep'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['공업 대표가 되었습니다. 대표단 회의는 술집 안쪽 방에서 열렸습니다.', '발전기 교체를 투표에 올렸습니다. 찬성 ' + s.rng.ri(55, 80) + '할. 반대는 소음 때문이었습니다.']), k: 'big', fx: { standing: 4 }, f: domeF('주민 투표 결과', s.year) }) },
  { id: 'dur_ind_rep_surface_offer', a: [30, 90], tags: ['track:DUR_INDUSTRY:rep'], w: 20, gap: 5,
    run: (s) => ({ t: '지상 회사에서 자동기계 설계를 사겠다고 사람을 보냈습니다. 승강기를 타고 내려온 지상 사람은 천장을 계속 올려다보았습니다. 계약은 했습니다.', k: 'note', fx: { money: medX(s, 0.8) } }) },

  // ── DUR_GEO 지질 탐사 ──
  { id: 'dur_geo_ast_walk', a: [14, 35], tags: ['track:DUR_GEO:assistant'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['탐사 조수가 되었습니다. 벽을 두드리고 소리를 적는 일이었습니다.', '선배가 "저 벽 뒤에 물이 있다"고 했고, 있었습니다. 어떻게 아느냐고 물었더니 "그냥 안다"고 했습니다.', '지도에 없는 굴을 하나 찾았습니다. 지도에 올렸습니다. 제 이름은 올리지 않았습니다.']), k: 'note', fx: { cap: { learn: 0.04 } } }) },
  { id: 'dur_geo_ast_lost', a: [14, 35], tags: ['track:DUR_GEO:assistant'], w: 25, gap: 3,
    run: (s) => ({ t: '탐사 굴에서 하루 길을 잃었습니다. 등불이 꺼지기 전에 선배가 찾아왔습니다. 그 뒤로는 벽을 더 자주 두드렸습니다.', k: 'bad', fx: { h: -2, cap: { learn: 0.02 } } }) },
  { id: 'dur_geo_sur_find', a: [17, 70], tags: ['track:DUR_GEO:surveyor'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['탐사원이 되었습니다. 돔 아래 지하수 길을 새로 그렸습니다.', '오리지늄 광맥 비슷한 것이 벽에 비쳤습니다. 그쪽 굴을 막았습니다. 돔에서는 그렇게 했습니다.', '새 구획이 들어설 자리를 정했습니다. 설계 대표와 발전기 대표가 다른 자리를 원했고, 땅이 제 편이었습니다.']), k: 'ev', fx: { standing: 2 } }) },
  { id: 'dur_geo_sur_surface', a: [17, 70], tags: ['aff:DUR_GEO_SURFACE'], w: 25, gap: 4,
    run: (s) => ({ t: '지상 광산 쪽 지질 일이었습니다. 광산 사람들은 두린이 돌 냄새를 맡는다고 했습니다. 틀린 말은 아니었습니다.', k: 'note', fx: { money: medX(s, 0.3), hl: -1 } }) },
  { id: 'dur_geo_rep_water', a: [30, 90], tags: ['track:DUR_GEO:rep'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['지질 대표가 되었습니다. 대표단에서 말이 가장 적은 자리였습니다. 땅이 대신 말했습니다.', '범람 경보를 냈습니다. 수몰 구역이 ' + s.rng.ri(2, 9) + '일 잠겼고, 사람은 다치지 않았습니다.']), k: 'big', fx: { standing: 4 }, f: domeF('지질 대표 보고', s.year) }) },
  { id: 'dur_geo_rep_quiet', a: [30, 90], tags: ['track:DUR_GEO:rep'], w: 25, gap: 4,
    run: (s) => ({ t: '천장 보고서를 냈습니다. "변화 없음". 그 네 글자를 쓰려고 한 해를 돌았습니다.', k: 'note', fx: { h: 1 } }) },

  // ── DUR_TRADE 상인 ──
  { id: 'dur_tra_cle_shop', a: [14, 40], tags: ['track:DUR_TRADE:clerk'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['가게 점원이 되었습니다. 손님 전부가 아는 얼굴이었고, 외상이 장부의 반이었습니다.', '버섯 빵 값을 외웠습니다. 값은 한 해에 한 번 바뀌었고, 바뀌는 날은 축제였습니다.', '지상 물건이 들어오는 날 가게가 붐볐습니다. 산 사람보다 구경한 사람이 많았습니다.']), k: 'note', fx: { cap: { ties: 0.03 } } }) },
  { id: 'dur_tra_cle_tasting', a: [14, 40], tags: ['track:DUR_TRADE:clerk'], w: 25, gap: 3,
    run: (s) => ({ t: '손님이 ' + eul(cul(s).drink) + ' 한 잔 권했습니다. 받았습니다. 두린에서 거절은 장사가 아니었습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'dur_tra_mer_own', a: [17, 70], tags: ['track:DUR_TRADE:merchant'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['가게를 열었습니다. 개업 날 이웃이 다 왔습니다. 돔에는 이웃밖에 없었으니까요.', '지상 교역단과 거래했습니다. 그쪽은 값을 올리려 했고, 저는 천천히 마셨습니다. 값은 내려갔습니다.', '장부가 두꺼워졌습니다. 외상도 같이 두꺼워졌습니다.']), k: 'ev', fx: { money: medX(s, 0.3), standing: 2 } }) },
  { id: 'dur_tra_mer_aquapit', a: [17, 70], tags: ['aff:DUR_TRA_AQUAPIT'], w: 25, gap: 4,
    run: (s) => ({ t: '수몰 구역 리조트에 가게를 냈습니다. 손님은 많았고, 주민 투표로 리조트가 철거된 뒤에는 수영장 자리에 가게만 남았습니다.', k: 'note', fx: { money: -medX(s, 0.2), h: -1 } }) },
  { id: 'dur_tra_rep_council', a: [25, 80], tags: ['track:DUR_TRADE:rep'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['상업 대표가 되었습니다. 대표단에서 돈 이야기를 하는 사람은 저뿐이었고, 그래서 제일 인기가 없었습니다.', '지상 교역 조건을 투표에 올렸습니다. 통과되었습니다. 아무도 내용을 읽지 않았다는 것을 알고 있었습니다.']), k: 'big', fx: { standing: 4 } }) },
  { id: 'dur_tra_rep_festival', a: [25, 80], tags: ['track:DUR_TRADE:rep'], w: 25, gap: 3,
    run: (s) => ({ t: fest(s, 0) + ' 예산을 맡았습니다. 술값이 전체의 반이었습니다. 줄이자는 말은 아무도 하지 않았습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'dur_tra_may_hall', a: [30, 90], tags: ['track:DUR_TRADE:mayor'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['시장을 겸했습니다. 시장실은 가게 안쪽 방이었습니다.', '지상에서 사절이 왔습니다. 무슨 동맹 이야기를 했습니다. 다음 안건은 벌꿀주 품질 규격이었고, 사절은 그 안건이 더 길다는 것을 믿지 못했습니다.']), k: 'big', fx: { standing: 4 } }) },
  { id: 'dur_tra_may_small', a: [30, 90], tags: ['track:DUR_TRADE:mayor'], w: 25, gap: 4,
    run: (s) => ({ t: '시장 임기 동안 가장 큰 일은 승강기 정비였습니다. 두 번째는 축제 날짜였습니다. 그 정도면 좋은 임기였습니다.', k: 'warm', fx: { h: 2 } }) },

  // ── DUR_LIT 문학·도서관 ──
  { id: 'dur_lit_lib_shelf', a: [14, 45], tags: ['track:DUR_LIT:librarian'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['도서관 사서가 되었습니다. 서가 절반이 지상 펄프 잡지였습니다. 가장 많이 빌려 가는 것도 그것이었습니다.', '책에 곰팡이가 피지 않게 하는 것이 일의 반이었습니다. 돔은 축축했습니다.', '아이들에게 지상 이야기를 읽어 주었습니다. 아이들은 하늘이라는 것을 그림으로만 알았습니다.']), k: 'note', fx: { cap: { learn: 0.04 } } }) },
  { id: 'dur_lit_lib_pulp', a: [14, 45], tags: ['aff:DUR_LIT_PULP'], w: 25, gap: 3,
    run: (s) => ({ t: '지상 잡지 새 호가 들어왔습니다. 대기 명단이 ' + s.rng.ri(10, 40) + '명이었습니다. 돔에서 그만큼 기다리는 것은 그것뿐이었습니다.', k: 'warm', fx: { h: 2 }, f: domeF('도서관 대출 대장', s.year) }) },
  { id: 'dur_lit_wri_book', a: [17, 80], tags: ['track:DUR_LIT:writer'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['책을 냈습니다. 돔 사람 전부가 한 권씩 샀습니다. 그것이 두린 작가의 판매 부수였습니다.', '지상 이야기를 썼습니다. 가 본 적은 없었습니다. 가 본 사람이 "비슷하다"고 했습니다.', '술집에서 낭독회를 했습니다. 끝까지 들은 사람과 끝까지 마신 사람이 같았습니다.']), k: 'ev', fx: { standing: 3, money: medX(s, 0.2) } }) },
  { id: 'dur_lit_wri_fade', a: [17, 80], tags: ['track:DUR_LIT:writer'], w: 25, gap: 4,
    run: (s) => ({ t: '새 책이 전 책보다 덜 팔렸습니다. 돔에서 덜 팔린다는 것은 이웃 몇이 사지 않았다는 뜻이었고, 그 몇을 알고 있었습니다.', k: 'bad', fx: { h: -2, standing: -2 } }) },
  { id: 'dur_lit_rep_seat', a: [30, 90], tags: ['track:DUR_LIT:rep'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['문학 대표가 되었습니다. 대표단에서 발언 순서는 늘 마지막이었고, 마지막 발언은 늘 건배였습니다.', '지상 잡지 수입 예산을 통과시켰습니다. 반대 없음.']), k: 'big', fx: { standing: 4 } }) },
  { id: 'dur_lit_rep_outsider', a: [30, 90], tags: ['track:DUR_LIT:rep'], w: 20, gap: 5, c: (s) => s.S.race !== 'durin',
    run: (s) => ({ t: '두린이 아닌 대표는 저뿐이었습니다. 회의 탁자가 낮았고, 무릎을 접고 앉았습니다. 아무도 그것을 이상하게 보지 않았습니다.', k: 'note', fx: { h: 1 } }) },

  // ── DUR_LIFT 승강기 관리 ──
  { id: 'dur_lif_hel_cable', a: [14, 45], tags: ['track:DUR_LIFT:helper'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['승강기 보조가 되었습니다. 케이블에 기름을 먹이는 일이었습니다. 케이블 하나가 도시의 목숨이라고 했습니다.', '지상에서 내려온 사람을 처음 가까이서 보았습니다. 컸습니다. 승강기 천장에 머리를 부딪혔습니다.', '승강기가 올라가는 소리를 하루 종일 들었습니다. 올라가는 사람보다 내려오는 물건이 많았습니다.']), k: 'note', fx: { cap: { skill: 0.03 } } }) },
  { id: 'dur_lif_hel_stuck', a: [14, 45], tags: ['track:DUR_LIFT:helper'], w: 25, gap: 3,
    run: (s) => ({ t: '승강기가 중간에 섰습니다. 안에 지상 상인 둘이 있었습니다. 여섯 시간 뒤에 내려왔고, 상인들은 다시 오지 않았습니다.', k: 'bad', fx: { h: -2, standing: 1 } }) },
  { id: 'dur_lif_kee_gate', a: [17, 70], tags: ['track:DUR_LIFT:keeper'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['승강기 관리인이 되었습니다. 도시의 문을 여는 사람이었고, 문은 하루에 몇 번 열리지 않았습니다.', '지상에서 온 사람의 짐을 확인했습니다. 짐은 대부분 술이었습니다. 통과.', '위로 올라가겠다는 주민을 태웠습니다. 돌아오겠다고 했습니다. 돌아오는 사람은 반쯤 되었습니다.']), k: 'ev', fx: { standing: 2 } }) },
  { id: 'dur_lif_kee_intruder', a: [17, 70], tags: ['track:DUR_LIFT:keeper'], w: 20, gap: 5,
    run: (s) => ({ t: '지상 사람 몇이 허락 없이 내려오려 했습니다. 승강기를 세웠습니다. 위에서 한참 소리가 났고, 그다음 조용해졌습니다.', k: 'bad', fx: { h: -2, standing: 3 } }) },
  { id: 'dur_lif_con_rule', a: [25, 80], tags: ['track:DUR_LIFT:controller'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['출입 통제 책임을 맡았습니다. 규칙은 두 줄이었습니다. 술은 들여오고, 무기는 올려보낸다.', '지상 사절의 출입 허가를 냈습니다. 대표단이 결정하고 제가 열쇠를 돌렸습니다.']), k: 'big', fx: { standing: 4 } }) },
  { id: 'dur_lif_con_close', a: [25, 80], tags: ['track:DUR_LIFT:controller'], w: 20, gap: 5,
    run: (s) => ({ t: '지상에 무슨 일이 났다고 해서 승강기를 열흘 잠갔습니다. 열흘 동안 도시는 아무것도 달라지지 않았습니다. 그것이 돔의 좋은 점이었습니다.', k: 'note', fx: { h: 1 } }) },

  // ── DUR_BREW 양조 ──
  { id: 'dur_bre_hob_first', a: [14, 60], tags: ['track:DUR_BREW:hobby'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['집에서 ' + eul(cul(s).drink) + ' 담갔습니다. 첫 통은 시었습니다. 이웃이 그래도 다 마셔 주었습니다.', '벌꿀 값이 올랐습니다. 양조 애호가들이 모여 한숨을 쉬었고, 한숨 뒤에 마셨습니다.', '술 취향으로 친구가 갈렸습니다. 벌꿀주 쪽과 증류주 쪽. 저는 양쪽에 앉았습니다.']), k: 'note', fx: { cap: { skill: 0.02 }, h: 1 } }) },
  { id: 'dur_bre_hob_judge', a: [14, 60], tags: ['track:DUR_BREW:hobby'], w: 25, gap: 3,
    run: (s) => ({ t: '동네 품평회에 통 하나를 냈습니다. ' + s.rng.ri(2, 15) + '등이었습니다. 등수는 아무도 기억하지 않았고, 맛은 다들 기억했습니다.', k: 'warm', fx: { h: 2 }, f: domeF('품평회 기록', s.year) }) },
  { id: 'dur_bre_bre_cellar', a: [18, 75], tags: ['track:DUR_BREW:brewer'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['양조가가 되었습니다. 저장고 열쇠를 받았고, 저장고가 집보다 컸습니다.', '제 술이 술집에 들어갔습니다. 술집 주인이 "작년 것이 낫다"고 했습니다. 작년 것도 제 것이었습니다.', '지상 상인이 통째로 사 갔습니다. 지상에서는 값이 세 배라고 했습니다. 올려 보낸 뒤 조금 서운했습니다.']), k: 'ev', fx: { money: medX(s, 0.3), standing: 2 } }) },
  { id: 'dur_bre_bre_spirit', a: [18, 75], tags: ['aff:DUR_BRE_SPIRIT'], w: 25, gap: 4,
    run: (s) => ({ t: '증류기를 돌렸습니다. 증류주는 벌꿀주보다 말이 적은 사람이 마셨습니다. 그 손님들이 단골이었습니다.', k: 'note', fx: { money: medX(s, 0.1) } }) },
  { id: 'dur_bre_mas_name', a: [25, 90], tags: ['track:DUR_BREW:master'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['명인이라고 불리기 시작했습니다. 부른 사람은 술집 주인이었고, 그 뒤로 다들 그렇게 불렀습니다.', '새 통을 열면 이웃이 모였습니다. 모이는 수로 그해 술을 알았습니다.']), k: 'big', fx: { standing: 4 } }) },
  { id: 'dur_bre_mas_cannon', a: [25, 90], tags: ['aff:DUR_BRE_CANNON'], w: 20, gap: 5,
    run: (s) => ({ t: '지상 아카후알라에서 술 대포에 쓸 술을 주문했습니다. 대포에 넣을 술이라고 해서 덜 좋은 것을 보내지는 않았습니다.', k: 'note', fx: { money: medX(s, 0.4), h: 1 } }) },

  // ── DUR_SURFACE 지상행 ──
  { id: 'dur_sur_lif_up', a: [14, 70], tags: ['track:DUR_SURFACE:lift'], w: 60,
    run: (s) => ({ t: '승강기를 타고 올라갔습니다. 문이 열리자 하늘이 있었습니다. 책에서 본 것보다 컸고, 한참 서 있었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'dur_sur_lif_first', a: [14, 70], tags: ['track:DUR_SURFACE:lift'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['지상 사람들이 저를 아이로 보았습니다. 값을 깎아 주었고, 일은 주지 않았습니다.', '비를 처음 맞았습니다. 천장에서 떨어지는 물과 달랐습니다. 끝이 없었습니다.', '모자가 날아갔습니다. 바람이라는 것이었습니다.']), k: 'note', fx: { h: 1, hl: -1 } }) },
  { id: 'dur_sur_sur_work', a: [15, 70], tags: ['track:DUR_SURFACE:surface'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['광산에서 일했습니다. 돌 냄새를 맡는다고 다들 저를 앞에 세웠습니다. 앞은 위험한 자리였습니다.', '거리에서 그림을 그려 팔았습니다. 사람들은 그림보다 그리는 사람을 구경했습니다.', '지상 공장에서 기계를 고쳤습니다. 손이 작아 들어가는 곳이 있었고, 그래서 잘렸을 때 제가 갔습니다.']), k: 'note', fx: { money: medX(s, 0.2), hl: -1 } }) },
  { id: 'dur_sur_sur_dwarf', a: [15, 70], tags: ['track:DUR_SURFACE:surface'], w: 25, gap: 3,
    run: (s) => ({ t: s.rng.pick(['의사가 왜소증이라고 적으려 했습니다. 두린이라고 했더니 지우고 다시 적었습니다.', '술집에서 어른 요금을 받지 않으려 했습니다. 어른 요금을 냈고, 어른 술을 마셨습니다.']), k: 'note', fx: { h: -1 } }) },
  { id: 'dur_sur_sur_dossoles', a: [15, 70], tags: ['aff:DUR_SUR_DOSSOLES'], w: 25, gap: 4,
    run: (s) => ({ t: '도솔레스 거리에서 예술가로 살았습니다. 인공 바다 옆이었습니다. 돔의 수몰 구역보다 컸고, 덜 조용했습니다.', k: 'note', fx: { h: 1, money: medX(s, 0.1) } }) },
  { id: 'dur_sur_sur_sour', a: [15, 70], tags: ['track:DUR_SURFACE:surface'], w: 20, gap: 4,
    run: (s) => ({ t: '지상에서 험한 일을 몇 번 겪고 나니 말수가 줄었습니다. 돔 사람들이 들으면 성격이 삐뚤어졌다고 할 것 같았습니다. 틀린 말은 아니었습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'dur_sur_inf_after', a: [15, 80], tags: ['track:DUR_SURFACE:infected'], w: 60, gap: 2,
    run: (s) => ({ t: s.rng.pick(['감염되었습니다. 지상에서는 흔한 일이라고 했습니다. 돔에서는 들어 본 적만 있는 일이었습니다.', '결정이 손등에 비쳤습니다. 돔에 돌아갈 수 없다는 것을 그때 알았습니다. 돔은 감염자를 받지 않는 것이 아니라, 받아 본 적이 없었습니다.']), k: 'bad', fx: { h: -4 } }) },
  { id: 'dur_sur_inf_rhodes_rumor', a: [15, 80], tags: ['track:DUR_SURFACE:infected'], w: 30, gap: 3, c: (s) => !s.S.rhodes,
    run: (s) => ({ t: '치료해 주는 배가 있다는 말을 들었습니다. 다소 불만스러웠습니다. 배보다 돔이 나았으니까요. 그래도 들어 두었습니다.', k: 'note', fx: { h: 1 } }) },

  // ── 돔 일상·축일·대표단 (진로 무관) ──
  { id: 'dur_life_festival_expand', a: [5, 95], tags: ['durin'], w: 25, gap: 8,
    run: (s) => ({ t: ieot(fest(s, 0)) + '습니다. ' + s.rng.pick(['새 구획 벽을 트는 날이었고, 도시 전부가 망치 소리를 들으러 왔습니다.', '통을 열었습니다. 열린 통 수로 그해 형편을 알았습니다.', '아이들이 새 구획을 처음 뛰어다녔습니다. 어른들은 천장을 올려다보았습니다. 버텼습니다.']), k: 'warm', fx: { h: 3 } }) },
  { id: 'dur_life_farewell', a: [5, 95], tags: ['durin'], w: 20, gap: 8,
    run: (s) => ({ t: iga(fest(s, 1)) + ' 있었습니다. 지상으로 올라가는 이웃을 보내는 자리였습니다. ' + s.rng.pick(['돌아오겠다고 했습니다. 다들 고개를 끄덕였고, 아무도 믿지 않았습니다.', '술을 한 통 들려 보냈습니다. 지상 술은 못 마실 거라고 했습니다.']), k: 'note', fx: { h: -1, cap: { ties: 0.01 } } }) },
  { id: 'dur_life_tavern', a: [16, 95], tags: ['durin'], w: 30, gap: 8,
    run: (s) => ({ t: s.rng.pick(['술집에서 저녁을 보냈습니다. "' + cul(s).greet + '"가 인사였고, 대답은 잔을 드는 것이었습니다.', '새 벌꿀주 통이 열렸습니다. 돔 사람 절반이 그 자리에 있었습니다.', '술 취향으로 자리가 갈렸습니다. 같은 취향끼리 앉았고, 취향이 바뀌면 자리를 옮겼습니다.']), k: 'warm', fx: { h: 2, cap: { ties: 0.01 } } }) },
  { id: 'dur_life_vote', a: [16, 95], tags: ['durin'], w: 25, gap: 3,
    run: (s) => { const pct = s.rng.ri(52, 78); return { t: '주민 투표가 있었습니다. ' + s.rng.pick(['안건은 승강기 운행 시간이었습니다. 한 시간 늦추는 쪽이 ' + pct + '할로 이겼습니다.', '안건은 지상 동맹이었습니다. 투표율이 ' + (pct - 20) + '할이었고, 축제 안건보다 낮았습니다.', '안건은 리조트 철거였습니다. 지루해졌다는 이유로 철거가 ' + pct + '할로 이겼습니다.']), k: 'note', fx: { h: 1 }, f: domeF('주민 투표 결과', s.year) }; } },
  { id: 'dur_life_ceiling', a: [5, 95], tags: ['durin'], w: 15, gap: 8,
    run: (s) => ({ t: '천장에서 물이 떨어졌습니다. 설계 대표가 와서 보고 "괜찮다"고 했습니다. 괜찮았습니다. 그래도 그 자리는 피해 다녔습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'dur_life_surface_news', a: [10, 95], tags: ['durin'], w: 15, gap: 8,
    run: (s) => ({ t: '지상에서 전쟁이 났다는 말이 승강기를 타고 내려왔습니다. ' + s.rng.pick(['어느 나라인지 아무도 묻지 않았습니다.', '잡지 다음 호가 늦어질 거라는 이야기가 더 길었습니다.']), k: 'note' }) },
  { id: 'dur_life_small', a: [10, 95], tags: ['durin'], w: 10, gap: 6,
    run: (s) => ({ t: '지상 사람이 돔에 내려와 문마다 머리를 부딪혔습니다. 아이들이 세었습니다. ' + s.rng.ri(4, 11) + '번이었습니다.', k: 'warm', fx: { h: 2 }, f: domeF('방문자 일지', s.year) }) },
  { id: 'dur_rel_sarkaz', a: [10, 95], tags: ['durin', 'race:sarkaz'], w: 10, gap: 6,
    run: (s) => ({ t: '돔에서는 뿔을 아무도 보지 않았습니다. 문에 걸리는 것만 빼면.', k: 'warm', fx: { h: 2 } }) },
  { id: 'dur_newcomer', a: [10, 95], tags: ['durin', 'newcomer'], w: 30, gap: 2,
    run: (s) => ({ t: s.rng.pick(['천장이 낮았습니다. 허리를 굽히는 데 한 해가 걸렸습니다.', '이웃이 술을 권했습니다. 거절했더니 다음 날 또 권했습니다. 셋째 날 받았습니다.', '돔 사람들은 제가 어디서 왔는지 묻지 않았습니다. 무엇을 마시는지만 물었습니다.']), k: 'note', fx: { h: 1 } }) },
  { id: 'dur_visit', a: [10, 95], tags: ['visit:durin'], w: 25, gap: 3,
    run: (s) => ({ t: s.rng.pick(['두린 돔에 들렀습니다. 문마다 머리를 부딪혔고, 아이들이 세었습니다.', '두린에 머무는 동안 술을 거절할 수 없었습니다. 거절이 없는 곳이었습니다.', '승강기를 타고 내려갔다 올라왔습니다. 내려간 시간보다 올라온 시간이 짧게 느껴졌습니다.']), k: 'note', fx: { h: 1 } }) },
  { id: 'dur_after_dome', a: [10, 95], w: 60, c: (s) => afterFall(s, 'DUR_DESIGN') || afterFall(s, 'DUR_INDUSTRY') || afterFall(s, 'DUR_TRADE') || afterFall(s, 'DUR_LIT'),
    run: (s) => ({ t: '자리에서 물러났습니다. 돔에서 물러난 사람은 술집에서 한 자리 더 생기는 것 말고는 달라지는 것이 없었습니다.', k: 'note', fx: { h: -1 } }) },
];

// ────────────────────────────────────────────────────────────────────────────
// 결정 (4)
// ────────────────────────────────────────────────────────────────────────────
export const decisions = {
  /** 리조트 철거 투표 */
  dur_vote_aquapit: {
    tags: ['durin'], once: true, at: 0.5,
    ok: (s) => s.S.age >= 16 && s.rng.chance(0.15),
    build: (s) => ({ title: '주민 투표', body: '수몰 구역 리조트 철거가 투표에 올랐습니다. 찬성 쪽은 "지루하다"였고, 반대 쪽은 "그래도 물이 따뜻하다"였습니다.',
      choices: [
        { k: 'demolish', label: '철거에 찬성', auto: 1.2 },
        { k: 'keep', label: '유지에 찬성', auto: 1 },
        { k: 'drink', label: '투표 대신 한 잔', auto: 0.8 }] }),
    apply: (s, k) => {
      if (k === 'demolish') return { t: '철거가 이겼습니다. 수영장 자리는 창고가 되었고, 창고는 금방 찼습니다.', k: 'note', fx: { h: 1 } };
      if (k === 'keep') return { t: '유지 쪽에 표를 던졌습니다. 졌습니다. 마지막 날 물에 들어갔다 나왔습니다.', k: 'note', fx: { h: 1 } };
      return { t: '투표장 대신 술집에 갔습니다. 결과는 다음 날 들었습니다. 철거였습니다.', k: 'warm', fx: { h: 2 } };
    },
  },
  /** 호기심 지상행 */
  dur_surface_go: {
    tags: ['durin'], gap: 8, once: false, at: 0.5,
    ok: (s) => s.S.age >= 14 && s.S.age <= 50 && s.S.cur === 'durin' && !!s.S.track && s.S.track.id !== 'DUR_SURFACE' && s.S.track.id !== 'DUR_LIFT' && s.rng.chance(0.06),
    build: (s) => ({ title: '승강기', body: '승강기 앞에 섰습니다. 올라가면 하늘이 있다고 했습니다. 광산 일도, 거리 일도, 돌아오지 않은 이웃도 거기 있었습니다.',
      choices: [
        { k: 'go', label: '올라간다', sub: '지상행 진로, 거주지 이동', auto: 0.7 },
        { k: 'stay', label: '내려온다', sub: '변화 없음', auto: 1.5 }] }),
    apply: (s, k) => {
      if (k !== 'go') return { t: '승강기 문이 열렸다 닫혔습니다. 돌아서서 술집에 갔습니다.', k: 'note', fx: { h: 1 } };
      if (!s.switchTrack('DUR_SURFACE')) return { t: '올라가려 했지만 승강기가 정비 중이었습니다.', k: 'note' };
      const to = s.rng.pick(['sargon', 'bolivar', 'columbia', 'rim']);
      s.migrate('work', to, { keepTrack: true, quiet: true });
      if (s.S.phase !== 'life') return false;
      return { t: ro(s.data.nationById[to].name) + ' 올라갔습니다. 돔 사람 하나가 승강기 문 앞까지 따라와 술 한 병을 쥐여 주었습니다.', k: 'big', fx: { h: 2 } };
    },
  },
  /** 돔 안에서 감염 — 치료 목적 지상행 */
  dur_surface_treat: {
    tags: ['durin', 'known'], once: true, at: 0.5,
    ok: (s) => s.S.age >= 12 && s.S.cur === 'durin' && !s.S.rhodes,
    build: (s) => ({ title: '치료', body: '돔에는 광석병을 본 의사가 없었습니다. 지상에는 치료해 주는 곳이 있다고 했습니다. 승강기는 올라가는 쪽으로도 움직였습니다.',
      choices: [
        { k: 'up', label: '치료하러 올라간다', sub: '거주지 이동, 진로 중단', auto: 1.5 },
        { k: 'stay', label: '돔에 남는다', sub: '치료 없음', auto: 1 }] }),
    apply: (s, k) => {
      if (k !== 'up') return { t: '돔에 남았습니다. 이웃들은 결정을 보고도 술을 권했습니다. 그것이 돔의 치료였습니다.', k: 'note', fx: { h: 1 } };
      const to = s.rng.pick(['columbia', 'bolivar', 'sargon']);
      s.migrate('work', to, { quiet: true });
      if (s.S.phase !== 'life') return false;
      return { t: '치료를 받으러 ' + ro(s.data.nationById[to].name) + ' 올라갔습니다. 하늘 아래에서 첫 진료를 받았고, 의사는 두린을 처음 본다고 했습니다.', k: 'big', fx: { h: -1 } };
    },
  },
  /** 술 취향 다툼 */
  dur_brew_taste: {
    tags: ['durin'], gap: 6, once: false, at: 0.5,
    ok: (s) => s.S.age >= 18 && s.rng.chance(0.12),
    build: (s) => ({ title: '취향', body: '술집에서 벌꿀주 쪽과 증류주 쪽이 갈라섰습니다. 양쪽 다 제 쪽에 앉으라고 했습니다.',
      choices: [
        { k: 'mead', label: '벌꿀주 쪽', auto: 1 },
        { k: 'spirit', label: '증류주 쪽', auto: 1 },
        { k: 'both', label: '양쪽을 오간다', auto: 0.8 }] }),
    apply: (s, k) => {
      if (k === 'both') return { t: '양쪽을 오갔습니다. 양쪽에서 잔을 받았고, 다음 날 양쪽에서 미움을 받았습니다. 사흘 갔습니다.', k: 'note', fx: { h: 1, hl: -1 } };
      return { t: (k === 'mead' ? '벌꿀주' : '증류주') + ' 쪽에 앉았습니다. 그쪽 사람들이 그해 친구가 되었고, 저쪽 사람들은 다음 해에 돌아왔습니다.', k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } };
    },
  },
};

export default { events, decisions };
