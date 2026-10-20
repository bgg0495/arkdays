// W9h 카즈델 진로 콘텐츠(§11, D40 국가 전용). 핵심 5: 살카즈 용병(KZD_MERC)·군사위원회(KZD_COMMISSION)·보일러공(KZD_BOILER)·흉터의 상점(KZD_BROKER)·해외 살카즈(KZD_DIASPORA).
// 나머지 9 진로는 단계마다 2개. 생업·명절(물물교환·오리아이언 파편·전후 복구·사우인), 캐논 인물 1회성(D43), 관계 등급(살카즈가 타국에서), 귀향(1098~), visit:kazdel.
// 톤(D25): 담백체. 내전·전사·시신은 결과만. 각주는 숫자가 있을 때만(D31), 세계관 안의 출처(용병 등록부·과도 정부 공고·바벨 기록 등). 조사는 text.js 유틸(D30).
// 대사건(bigevents.js: kazdel_war_1090·teresia_1094·londinium_1094/1098)과 중복하지 않고 S.flags.war·연도로만 연동한다.
import { eul, iga, eun, wa, ro, ieot } from '../../src/engine/text.js';
import { F, orgF, medX, lifeRoll, cul, fest } from '../_util.js';

// ── 공용 도우미 ──
const flags = (s) => s.S.flags;
const partner = (s) => (s.S.fam.partner && s.S.fam.partner.alive ? s.S.fam.partner : null);
const kidsN = (s) => s.S.fam.kids.filter((k) => k.alive).length;
const affIs = (s, ...ids) => !!s.S.track && ids.includes(s.S.track.aff);
const affName = (s, fallback) => (s.aff ? s.aff.name : fallback);
const uL = (s) => s.S.ori.uL.toFixed(2);
const war = (s) => !!s.S.flags.war;
const yearIn = (s, a, b) => s.year >= a && s.year <= b;
const sarkaz = (s) => s.S.race === 'sarkaz';
/** 캐논 인물 1회성 게이트(D43): 연도 범위 + 생애 3명 상한 */
function canonOk(s, id) {
  const f = (s.data.canonFigures || []).find((x) => x.id === id);
  if (!f) return false;
  if (s.year < f.years[0] || s.year > f.years[1]) return false;
  return (s.S.flags.canonSeen || 0) < 3;
}
const canonSee = (s) => { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; };
/** 몰락 직후(그해·다음 해) 후일담 게이트 */
const afterFall = (s, track, outcome) => s.S.flags.lastTrack === track && s.S.flags.lastFallAt != null && s.S.age - s.S.flags.lastFallAt <= 1 && (!outcome || s.S.flags.lastFallOutcome === outcome) && !s.S.track;
const kzF = (doc, year) => F('용병 등록부 ' + doc + (year == null ? '' : ', ' + year + '년'));
const govF = (doc, year) => F('카즈델 과도 정부 ' + doc + (year == null ? '' : ', ' + year + '년'));

export const events = [
  // ════════════════════════════════════════════════════════════════════
  // KZD_MERC 살카즈 용병 (핵심, A6)  — 계약 단위, 문맹·감염 흔함, "질문하지 않는다"
  // ════════════════════════════════════════════════════════════════════
  // ── new 팀 신입 ──
  { id: 'kzd_merc_new_first', a: [12, 40], tags: ['track:KZD_MERC:new'], w: 40,
    run: (s) => ({ t: affName(s, '팀') + '에 들어갔습니다. 대장이 이름을 묻고, 글을 읽을 줄 아느냐고 물었습니다. ' + (s.S.cap.learn > 0 ? '읽을 줄 안다고 하자 서류 심부름이 늘었습니다.' : '모른다고 하자 대장은 "그래도 된다"고 했습니다.'), k: 'ev', fx: { standing: 3 } }) },
  { id: 'kzd_merc_new_gear', a: [12, 40], tags: ['track:KZD_MERC:new'], w: 30, gap: 3,
    run: (s) => ({ t: s.rng.pick(['첫 장비는 죽은 사람의 것이었습니다. 이름표를 떼고 썼습니다.', '방패에 난 구멍을 판자로 막았습니다. 보호 장비는 그게 전부였습니다.', '신발이 맞지 않았습니다. 발에 맞는 신발은 다음 계약에서 나온다고 했습니다.']), k: 'note', fx: { h: -1 } }) },
  { id: 'kzd_merc_new_pay', a: [12, 40], tags: ['track:KZD_MERC:new'], w: 30, gap: 2,
    run: (s) => ({ t: '첫 보수는 순금 조각 하나였습니다. ' + s.rng.pick(['무게를 재는 법을 몰라 대장이 재 주었습니다.', '그것으로 건조식품 한 자루를 바꿨습니다.', '집에 가져가자 ' + (s.S.fam.mom.alive ? '어머니가' : '식구가') + ' 한참 쥐고 있었습니다.']), k: 'warm', fx: { money: medX(s, 0.1), h: 2 }, f: kzF('계약 보수 대장', s.year) }) },
  { id: 'kzd_merc_new_question', a: [12, 40], tags: ['track:KZD_MERC:new'], w: 30, gap: 3,
    run: (s) => ({ t: '고용주가 누구인지 물었습니다. 대장은 "용병은 질문하지 않는다"고 했습니다. ' + s.rng.pick(['그 뒤로 묻지 않았습니다.', '그날 밤 혼자 짐작해 보았습니다. 맞았는지는 모릅니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'kzd_merc_new_infected_common', a: [12, 40], tags: ['track:KZD_MERC:new', 'infected'], w: 25, gap: 4,
    run: (s) => ({ t: '팀에서 결정이 없는 사람은 둘뿐이었습니다. ' + s.rng.pick(['아무도 제 손을 보지 않았습니다.', '의무병이 수치를 적고 "뛸 수 있군" 하고 끝냈습니다. ' + uL(s) + ' u/L.']), k: 'note', fx: { h: 1 }, f: kzF('건강란') }) },
  // ── member 팀원 ──
  { id: 'kzd_merc_member_contract', a: [14, 50], tags: ['track:KZD_MERC:member'], w: 35, gap: 2,
    run: (s) => ({ t: '새 계약이 왔습니다. ' + s.rng.pick(['귀족 쪽 일이었습니다. 보수는 좋았고 설명은 없었습니다.', '다른 팀과 연합하는 계약이었습니다. 저쪽 대장이 우리 대장보다 젊었습니다.', '외부 후원이 붙은 계약이었습니다. 후원자의 이름은 끝까지 듣지 못했습니다.']), k: 'ev', fx: { money: medX(s, 0.3), standing: 2 } }) },
  { id: 'kzd_merc_member_loss', a: [14, 50], tags: ['track:KZD_MERC:member'], w: 30, gap: 3,
    run: (s) => ({ t: s.rng.pick(['작전에서 셋이 돌아오지 않았습니다. 돌아온 사람이 짐을 나눴습니다.', '옆자리 사람이 바뀌었습니다. 새 사람은 더 어렸습니다.', '대장이 이름 둘을 명단에서 지웠습니다. 지우는 데 오래 걸리지 않았습니다.']), k: 'bad', fx: { h: -3, hl: -1 } }) },
  { id: 'kzd_merc_member_literacy', a: [14, 50], tags: ['track:KZD_MERC:member'], w: 20, gap: 5, c: (s) => s.S.cap.learn < -0.3,
    run: (s) => ({ t: '계약서에 지장을 찍었습니다. 내용은 대장이 읽어 주었습니다. ' + s.rng.pick(['대장이 전부 읽었는지는 모릅니다.', '다음 계약부터는 글자 몇 개를 외워 두었습니다.']), k: 'note', fx: { cap: { learn: 0.02 } } }) },
  { id: 'kzd_merc_member_abroad', a: [16, 45], tags: ['track:KZD_MERC:member', 'kazdel'], w: 12, gap: 6, c: (s) => !war(s) && s.S.cur === 'kazdel',
    run: (s) => { const to = s.rng.pick(['victoria', 'columbia', 'leithanien']); const n = s.data.nationById[to];
      if (!s.migrate('contract', to, { keepTrack: true })) return { t: '해외 계약 이야기가 돌았습니다. 성사되지 않았습니다.', k: 'note' };
      return { t: '팀이 ' + ro(n.name) + ' 가는 계약을 받았습니다. 살카즈를 쓰면 유족 배상이 없다는 것을 그쪽 고용주도 알고 있었습니다.', k: 'ev', fx: { money: medX(s, 0.4), h: -1 } }; } },
  { id: 'kzd_merc_member_sauin', a: [14, 60], tags: ['track:KZD_MERC:member', 'kazdel'], w: 15, gap: 4,
    run: (s) => ({ t: fest(s, 0) + ' 밤을 야영지에서 보냈습니다. 죽은 동료 이름을 하나씩 불렀고, 부를 이름이 작년보다 많았습니다.', k: 'note', fx: { h: -1, standing: 1 } }) },
  // ── captain 팀 대장 ──
  { id: 'kzd_merc_captain_hire', a: [20, 55], tags: ['track:KZD_MERC:captain'], w: 35, gap: 2,
    run: (s) => ({ t: '고용주를 직접 만났습니다. ' + s.rng.pick(['귀족은 보수를 먼저 말하고 조건을 나중에 말했습니다. 조건이 더 길었습니다.', '고용주는 "살카즈 팀이라 싸다"고 했습니다. 그 값에 서명했습니다.', '상대는 유족 배상 항목을 지웠습니다. 지운 자리에 서명했습니다.']), k: 'ev', fx: { money: medX(s, 0.6), standing: 2 } }) },
  { id: 'kzd_merc_captain_recruit', a: [20, 55], tags: ['track:KZD_MERC:captain'], w: 30, gap: 3,
    run: (s) => ({ t: '신입을 받았습니다. ' + s.rng.pick(['열넷이었습니다. 열여섯이라고 했고, 믿어 주었습니다.', '글을 아는 아이였습니다. 서류를 맡겼습니다.', '결정이 손등까지 올라온 아이였습니다. 받았습니다. 받지 않을 이유가 카즈델에는 없었습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'kzd_merc_captain_split', a: [20, 55], tags: ['track:KZD_MERC:captain'], w: 20, gap: 4,
    run: (s) => ({ t: '팀이 둘로 갈라질 뻔했습니다. 보수 배분 때문이었습니다. ' + s.rng.pick(['밤새 이야기해서 남겼습니다.', '넷이 나갔습니다. 다음 달에 둘이 돌아왔습니다.']), k: 'bad', fx: { h: -2, standing: -3 } }) },
  { id: 'kzd_merc_captain_war', a: [20, 55], tags: ['track:KZD_MERC:captain', 'war'], w: 40, gap: 2,
    run: (s) => ({ t: '전시 계약은 골라 받을 수 없었습니다. ' + s.rng.pick(['양쪽 깃발이 같은 주에 사람을 보냈습니다.', '보수는 식량으로 왔습니다. 돈보다 나았습니다.', '팀의 반이 한 계절 만에 바뀌었습니다.']), k: 'bad', fx: { hl: -2, h: -2, money: medX(s, 0.2) } }) },
  { id: 'kzd_merc_captain_commission', a: [18, 45], tags: ['track:KZD_MERC', 'kazdel'], w: 30, gap: 3, c: (s) => !!s.S.track && s.S.track.stage >= 1 && yearIn(s, 1086, 1097) && sarkaz(s) && s.rng.chance(0.5),
    run: (s) => { s.S.flags.switchOpen = true; return { t: '군사위원회가 용병 팀을 편입하고 있었습니다. 대장급은 장교 자리를 준다고 했습니다. ' + (s.S.track.stage >= 2 ? '제 이름이 명단에 있었습니다.' : '대장 이름이 명단에 있었고, 팀 전체가 따라갈지를 물었습니다.'), k: 'note', fx: { standing: 1 } }; } },
  { id: 'kzd_merc_captain_hoederer', a: [18, 60], tags: ['track:KZD_MERC'], w: 8, c: (s) => !!s.S.track && canonOk(s, 'hoederer') && s.S.track.stage <= 2,
    run: (s) => { canonSee(s); return { t: '다른 팀과 합동 작전을 했습니다. 그쪽 장신의 대장이 신입들에게 "질문하지 마라" 한마디로 교육을 끝내는 것을 보았습니다.', k: 'note', fx: { cap: { skill: 0.02 } } }; } },
  // ── banner 깃발 편입·독립 ──
  { id: 'kzd_merc_banner_choose', a: [25, 60], tags: ['track:KZD_MERC:banner'], w: 35, gap: 3,
    run: (s) => ({ t: s.rng.pick(['깃발 아래 들어갔습니다. 식량과 보급이 왔고, 명령도 왔습니다.', '독립을 지켰습니다. 보급은 없었고, 고를 수 있는 계약만 남았습니다.', '깃발이 바뀌었습니다. 대원들은 깃발을 보지 않고 저를 보았습니다.']), k: 'ev', fx: { standing: 3 } }) },
  { id: 'kzd_merc_banner_table', a: [25, 60], tags: ['track:KZD_MERC:banner'], w: 25, gap: 4,
    run: (s) => ({ t: '협상 자리에 앉았습니다. ' + s.rng.pick(['상대는 저를 "대장"이 아니라 "살카즈"라고 불렀습니다. 값은 그만큼 깎였습니다.', '우리 쪽 요구를 적어 간 사람은 제가 처음이었다고 했습니다.']), k: 'note', fx: { money: medX(s, 0.8), standing: 2 } }) },
  { id: 'kzd_merc_banner_w', a: [25, 60], tags: ['track:KZD_MERC:banner'], w: 8, c: (s) => canonOk(s, 'w'),
    run: (s) => { canonSee(s); return { t: '깃발 회의에서 붉은 머리의 용병 대장이 협상 테이블에 폭탄 하나를 올려놓고 웃었다는 이야기를 들었습니다. 그 자리에 있었던 사람은 말을 아꼈습니다.', k: 'note' }; } },
  { id: 'kzd_merc_banner_veterans', a: [25, 60], tags: ['track:KZD_MERC:banner'], w: 25, gap: 4,
    run: (s) => ({ t: '처음 들어온 해의 동료 중 남은 사람을 세어 보았습니다. ' + s.rng.ri(0, 2) + '명이었습니다.', k: 'bad', fx: { h: -2 }, f: kzF('명부 생존 확인란', s.year) }) },
  // ── chair 바벨 의장 ──
  { id: 'kzd_merc_chair_seat', a: [30, 80], tags: ['track:KZD_MERC:chair'], w: 40, gap: 3,
    run: (s) => ({ t: '의장석에 앉았습니다. ' + s.rng.pick(['의자는 전임자 것이었고, 전임자는 돌아오지 않았습니다.', '군벌들이 차례로 인사를 왔습니다. 인사는 짧았고 조건은 길었습니다.', '첫 결정은 식량 배급이었습니다. 두 번째는 누구를 쏘지 않을지였습니다.']), k: 'big', fx: { standing: 5, money: medX(s, 1) } }) },
  { id: 'kzd_merc_chair_pressure', a: [30, 80], tags: ['track:KZD_MERC:chair'], w: 30, gap: 3,
    run: (s) => ({ t: s.rng.pick(['밤에 창문을 등지고 앉지 않게 되었습니다.', '옛 부하가 찾아와 옛 이름으로 불렀습니다. 그 이름이 반가웠고, 들려서는 안 되었습니다.', '왕좌는 비어 있었고, 모두가 그 빈자리를 보며 저에게 말했습니다.']), k: 'note', fx: { h: -2 } }) },
  // ── 전환·몰락 후일담 ──
  { id: 'kzd_merc_promo_note', a: [12, 70], tags: ['track:KZD_MERC'], w: 25, gap: 3, c: (s) => !!s.S.track && s.S.track.stageSince === s.S.age - 1 && s.S.track.stage > 0,
    run: (s) => ({ t: '자리가 올라갔습니다. ' + s.rng.pick(['보수 배분 순서가 앞으로 왔습니다.', '먼저 죽은 사람의 자리였습니다.', '대원들이 호칭을 바꾸는 데 한 계절이 걸렸습니다.']), k: 'ev', fx: { h: 2 } }) },
  { id: 'kzd_merc_after_injured', a: [12, 80], w: 60, c: (s) => afterFall(s, 'KZD_MERC', 'injured'),
    run: (s) => ({ t: '다쳐서 팀을 나왔습니다. ' + s.rng.pick(['짐은 동료가 들어다 주었고, 그 뒤로는 혼자 들었습니다.', '대장이 순금 조각 하나를 더 쥐여 주었습니다. 배상은 아니라고 했습니다.', '왼손은 이제 결정이 덮었고 오른손은 성했습니다. 오른손으로 할 일을 찾았습니다.']), k: 'bad', fx: { h: -3 } }) },
  { id: 'kzd_merc_after_expel', a: [12, 80], w: 60, c: (s) => afterFall(s, 'KZD_MERC', 'expel'),
    run: (s) => ({ t: '계약이 끝났고 다음 계약은 오지 않았습니다. ' + s.rng.pick(['중개소 앞에서 하루를 서 있었습니다.', '장비를 팔았습니다. 산 사람은 더 어린 용병이었습니다.', '집에 돌아갔습니다. 돌아갈 집이 있는 것이 팀에서는 드문 일이었습니다.']), k: 'note', fx: { h: -2 } }) },

  // ════════════════════════════════════════════════════════════════════
  // KZD_COMMISSION 군사위원회 장교 (핵심, A4, 1086~1098)
  // ════════════════════════════════════════════════════════════════════
  { id: 'kzd_com_adj_desk', a: [18, 45], tags: ['track:KZD_COMMISSION:adjutant'], w: 40, gap: 2,
    run: (s) => ({ t: '부관 책상을 받았습니다. ' + s.rng.pick(['서류가 용병 시절 계약서보다 두꺼웠습니다.', '상관의 이름을 대신 서명하는 법을 배웠습니다.', '명령서를 베끼는 일이 반, 명령서를 전하러 가는 일이 반이었습니다.']), k: 'ev', fx: { standing: 2, cap: { learn: 0.02 } } }) },
  { id: 'kzd_com_adj_war', a: [18, 45], tags: ['track:KZD_COMMISSION:adjutant'], w: 35, gap: 2, c: (s) => yearIn(s, 1090, 1094),
    run: (s) => ({ t: '내전 중이었습니다. ' + s.rng.pick(['바벨 쪽 마을 이름이 지도에서 지워졌습니다. 지운 사람은 저였습니다.', '상관이 밤에 돌아와 아무 말도 하지 않았습니다. 다음 날 명단이 짧아져 있었습니다.', '포성이 가까운 날은 서류를 지하로 옮겼습니다.']), k: 'bad', fx: { h: -3 } }) },
  { id: 'kzd_com_adj_mentor', a: [18, 45], tags: ['track:KZD_COMMISSION:adjutant'], w: 25, gap: 4,
    run: (s) => ({ t: '상관이 "용병 때 버릇"을 하나씩 고쳐 주었습니다. ' + s.rng.pick(['먼저 묻지 않는 것은 그대로 두라고 했습니다.', '경례하는 손이 늦다고 했습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'kzd_com_adj_scar', a: [18, 45], tags: ['track:KZD_COMMISSION:adjutant'], w: 20, gap: 5,
    run: (s) => ({ t: '중개인이 상관을 찾아왔습니다. 문밖에서 기다리는 동안 안쪽에서 웃음소리가 났습니다. 웃을 일은 아니었을 것입니다.', k: 'note', fx: { cap: { ties: 0.02 } } }) },
  { id: 'kzd_com_off_command', a: [20, 50], tags: ['track:KZD_COMMISSION:officer'], w: 40, gap: 2,
    run: (s) => ({ t: '장교가 되어 처음 부대를 맡았습니다. ' + s.rng.pick(['절반이 옛 용병 팀 사람들이었습니다. 호칭이 바뀌는 데 두 달이 걸렸습니다.', '배급 명단에 제 서명이 들어갔습니다. 서명 한 번에 서른 명이 먹었습니다.']), k: 'ev', fx: { standing: 3 } }) },
  { id: 'kzd_com_off_londinium', a: [20, 50], tags: ['track:KZD_COMMISSION:officer'], w: 40, gap: 2, c: (s) => yearIn(s, 1094, 1098),
    run: (s) => ({ t: '런디니움 원정에 나갔습니다. ' + s.rng.pick(['조악한 무기로 성벽을 올랐습니다. 올라간 사람 수와 내려온 사람 수를 따로 적었습니다.', '점령지 거리에서 살카즈는 처음으로 길을 비키는 쪽이 아니었습니다.', '귀족 하나의 처형을 지켜보았습니다. 명령서에는 제 이름이 없었고, 그것이 다행이라고 느낀 것이 오래 남았습니다.']), k: 'bad', fx: { hl: -2, h: -3, standing: 3 } }) },
  { id: 'kzd_com_off_purge_rumor', a: [20, 50], tags: ['track:KZD_COMMISSION:officer'], w: 25, gap: 4,
    run: (s) => ({ t: '옆 부대 장교가 사라졌습니다. ' + s.rng.pick(['"전향"이라고 했습니다. 어느 쪽으로인지는 말하지 않았습니다.', '그 사람의 책상이 다음 날 비워졌고, 그다음 날 다른 사람이 앉았습니다.']), k: 'bad', fx: { h: -2 } }) },
  { id: 'kzd_com_off_training', a: [20, 50], tags: ['track:KZD_COMMISSION:officer'], w: 25, gap: 3,
    run: (s) => ({ t: '편입된 용병들에게 기초 군사훈련을 시켰습니다. 줄을 서는 것부터였습니다. 용병은 줄을 서 본 적이 없었습니다.', k: 'note', fx: { cap: { skill: 0.02 }, standing: 1 } }) },
  { id: 'kzd_com_lt_order', a: [22, 55], tags: ['track:KZD_COMMISSION:lieutenant'], w: 40, gap: 2,
    run: (s) => ({ t: '중위가 되었습니다. ' + s.rng.pick(['명령서에 제 이름이 찍혀 나가기 시작했습니다. 찍힌 이름은 돌아오지 않았습니다.', '회의에서 처음으로 말할 차례가 왔습니다. 짧게 했습니다.']), k: 'ev', fx: { standing: 3 } }) },
  { id: 'kzd_com_lt_nachzehrer', a: [22, 55], tags: ['aff:KZD_COM_NACHZEHRER'], w: 25, gap: 4,
    run: (s) => ({ t: '시든 궁정의 임무는 밤에 왔습니다. 돌아와서는 보고서를 썼고, 보고서는 한 장을 넘기지 않았습니다.', k: 'bad', fx: { h: -3, standing: 3 } }) },
  { id: 'kzd_com_lt_absurd', a: [22, 55], tags: ['aff:KZD_COM_ABSURD'], w: 25, gap: 4,
    run: (s) => ({ t: '부조리주의자들의 부대에서는 명령서보다 농담이 먼저 돌았습니다. 농담이 끝나면 명령이 그대로 집행되었습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'kzd_com_lt_family', a: [22, 55], tags: ['track:KZD_COMMISSION:lieutenant'], w: 20, gap: 4, c: (s) => !!partner(s),
    run: (s) => ({ t: partner(s).name + '에게 보급품을 먼저 돌렸습니다. 장교의 가족은 줄을 서지 않았습니다. 줄 선 사람들이 그것을 보았습니다.', k: 'note', fx: { h: 1, standing: -1 } }) },
  { id: 'kzd_com_cmd_front', a: [25, 60], tags: ['track:KZD_COMMISSION:commander'], w: 40, gap: 2,
    run: (s) => ({ t: '사령관이 되었습니다. ' + s.rng.pick(['지도 위의 숫자가 사람이라는 것을 잊는 데 한 해가 걸렸습니다.', '총사령관 앞에서 보고했습니다. 보고는 세 문장이었고, 대답은 한 문장이었습니다.']), k: 'big', fx: { standing: 4, money: medX(s, 1) } }) },
  { id: 'kzd_com_cmd_heir', a: [25, 60], tags: ['aff:KZD_COM_HEIR'], w: 25, gap: 4,
    run: (s) => ({ t: '후계 전달자 부대에는 말보다 침묵이 많았습니다. 명령은 종이가 아니라 눈으로 왔습니다.', k: 'note', fx: { standing: 2 } }) },
  { id: 'kzd_com_cmd_theresis', a: [22, 60], tags: ['track:KZD_COMMISSION'], w: 8, c: (s) => !!s.S.track && canonOk(s, 'theresis') && s.S.track.stage >= 1,
    run: (s) => { canonSee(s); return { t: '총사령관이 복도를 지나갔습니다. 장교들이 숨소리까지 낮췄고, 저도 그랬습니다.', k: 'note' }; } },
  { id: 'kzd_com_cmd_retreat', a: [25, 60], tags: ['track:KZD_COMMISSION:commander'], w: 50, c: (s) => s.year === 1098,
    run: (s) => ({ t: '런디니움에서 철수했습니다. 섭정왕도, 총사령관도 돌아오지 않았습니다. 부대를 이끌고 국경을 넘었고, 국경 너머에는 과도 정부가 서 있었습니다.', k: 'big', fx: { h: -5, standing: -5 }, f: govF('군사위원회 해산 공고', 1098) }) },
  { id: 'kzd_com_sup_seat', a: [30, 70], tags: ['track:KZD_COMMISSION:supreme'], w: 40, gap: 3,
    run: (s) => ({ t: '총사령관석에 앉았습니다. ' + s.rng.pick(['앉은 사람 중 살아서 내려온 사람은 없었다는 말을 들었습니다.', '첫 서명은 처형 명령이 아니라 식량 배급이었습니다. 두 번째는 아니었습니다.']), k: 'big', fx: { standing: 5 } }) },
  { id: 'kzd_com_sup_night', a: [30, 70], tags: ['track:KZD_COMMISSION:supreme'], w: 30, gap: 3,
    run: (s) => ({ t: '밤에 문을 두 번 잠갔습니다. 세 번째 자물쇠를 달까 생각하다 그만두었습니다.', k: 'note', fx: { h: -2 } }) },
  { id: 'kzd_com_after_1098', a: [18, 80], w: 70, c: (s) => s.S.flags.lastTrack === 'KZD_COMMISSION' && s.year >= 1098 && !s.S.track && !s.S.flags.comAfterTold,
    run: (s) => { s.S.flags.comAfterTold = true; return { t: '위원회가 없어졌습니다. ' + s.rng.pick(['계급장을 떼었습니다. 떼는 데 걸린 시간보다 달았던 시간이 짧았습니다.', '과도 정부가 "재교육"을 말했습니다. 공장 훈련소 줄에 섰습니다.', '옛 부하가 길에서 경례를 하려다 손을 내렸습니다.']), k: 'bad', fx: { h: -4, standing: -5 } }; } },

  // ════════════════════════════════════════════════════════════════════
  // KZD_BOILER 보일러공·용광로 정비 (핵심, A11)
  // ════════════════════════════════════════════════════════════════════
  { id: 'kzd_boil_app_heat', a: [14, 45], tags: ['track:KZD_BOILER:apprentice'], w: 40, gap: 2,
    run: (s) => ({ t: '보일러실 견습으로 들어갔습니다. ' + s.rng.pick(['첫 달은 석탄을 날랐습니다. 둘째 달도 그랬습니다.', '선배 보일러공은 골리앗 아종이었습니다. 삽 하나가 제 두 개만 했습니다.', '뜨거운 곳에서는 말을 안 하게 된다는 것을 배웠습니다.']), k: 'ev', fx: { hl: -1, cap: { skill: 0.03 } } }) },
  { id: 'kzd_boil_app_training1098', a: [14, 45], tags: ['track:KZD_BOILER:apprentice'], w: 35, gap: 3, c: (s) => s.year >= 1098,
    run: (s) => ({ t: '과도 정부의 용광로 정비 훈련에 들어갔습니다. 줄 선 사람 대부분이 돌아온 용병이었습니다. 삽을 창처럼 쥐는 사람이 많았습니다.', k: 'note', fx: { cap: { skill: 0.03 }, standing: 2 }, f: govF('직업훈련 등록부', s.year) }) },
  { id: 'kzd_boil_app_burn', a: [14, 45], tags: ['track:KZD_BOILER:apprentice'], w: 25, gap: 3,
    run: (s) => ({ t: '팔에 화상을 입었습니다. ' + s.rng.pick(['선배가 기름을 발라 주고 "두 번째부터는 안 아프다"고 했습니다. 거짓말이었습니다.', '흉터가 남았습니다. 보일러공의 첫 표지였습니다.']), k: 'bad', fx: { hl: -3 } }) },
  { id: 'kzd_boil_app_barter', a: [14, 45], tags: ['track:KZD_BOILER:apprentice', 'kazdel'], w: 25, gap: 3,
    run: (s) => ({ t: '품삯은 오리아이언 파편으로 받았습니다. ' + s.rng.pick(['파편 두 개가 빵 한 덩이였습니다.', '파편을 세는 법을 ' + (s.S.fam.mom.alive ? '어머니가' : '선임이') + ' 가르쳐 주었습니다.']), k: 'note', fx: { money: medX(s, 0.05) } }) },
  { id: 'kzd_boil_man_shift', a: [16, 60], tags: ['track:KZD_BOILER:boilerman'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['보일러가 밤새 돌았습니다. 저도 그랬습니다.', '압력계를 하루에 백 번 보았습니다. 백 번 다 같았고, 그것이 일이었습니다.', '보일러실 바닥에서 잤습니다. 집보다 따뜻했습니다.']), k: 'note', fx: { hl: -1, standing: 1 } }) },
  { id: 'kzd_boil_man_goliath', a: [16, 60], tags: ['aff:KZD_BOI_GOLIATH'], w: 25, gap: 4,
    run: (s) => ({ t: '골리앗 인프라 조에서는 힘이 곧 자리였습니다. ' + s.rng.pick(['제 자리는 중간이었습니다.', '가장 큰 사람이 가장 말이 적었습니다.']), k: 'note', fx: { cap: { skill: 0.02 } } }) },
  { id: 'kzd_boil_man_revenant', a: [16, 60], tags: ['aff:KZD_BOI_REVENANT'], w: 25, gap: 4,
    run: (s) => ({ t: '영혼 용광로 쪽 일은 레버넌트가 맡았습니다. 우리는 그 옆 보일러만 보았습니다. 옆 보일러가 더 뜨거웠습니다.', k: 'note', fx: { hl: -1, h: -1 } }) },
  { id: 'kzd_boil_man_war', a: [16, 60], tags: ['track:KZD_BOILER:boilerman', 'war'], w: 35, gap: 2,
    run: (s) => ({ t: '전시에도 보일러는 돌아야 했습니다. ' + s.rng.pick(['어느 쪽 깃발이든 보일러공은 데려가지 않았습니다. 데려가면 도시가 멈추니까요.', '포탄이 가까이 떨어진 날에도 교대는 바뀌지 않았습니다.']), k: 'bad', fx: { hl: -2, h: -1 } }) },
  { id: 'kzd_boil_fur_overhaul', a: [20, 60], tags: ['track:KZD_BOILER:furnace'], w: 40, gap: 2,
    run: (s) => ({ t: '용광로를 세우고 들어갔습니다. ' + s.rng.pick(['안은 식었어도 벽은 뜨거웠습니다. 사흘 걸렸습니다.', '전에 들어간 사람이 남긴 표시를 찾았습니다. 그 사람은 이제 없었습니다.']), k: 'ev', fx: { hl: -2, standing: 3 } }) },
  { id: 'kzd_boil_fur_rebuild', a: [20, 60], tags: ['track:KZD_BOILER:furnace'], w: 35, gap: 3, c: (s) => s.year >= 1098,
    run: (s) => ({ t: '멈춰 있던 용광로에 다시 불을 넣었습니다. ' + s.rng.ri(4, 9) + '년 만이었습니다. 불이 붙자 보일러실에서 누가 손뼉을 쳤고, 아무도 말리지 않았습니다.', k: 'warm', fx: { h: 4, standing: 3 }, f: govF('공장 재가동 기록', s.year) }) },
  { id: 'kzd_boil_fur_accident_near', a: [20, 60], tags: ['track:KZD_BOILER:furnace'], w: 25, gap: 4,
    run: (s) => ({ t: '옆 조에서 사고가 났습니다. ' + s.rng.pick(['이름 둘이 명판에 올라갔습니다. 명판은 보일러실 입구에 있었습니다.', '그날 저녁 교대는 아무도 빠지지 않았습니다.']), k: 'bad', fx: { h: -3 } }) },
  { id: 'kzd_boil_fur_infected', a: [20, 60], tags: ['track:KZD_BOILER:furnace', 'infected'], w: 20, gap: 4,
    run: (s) => ({ t: '열기 앞에서는 결정이 더 빨리 자란다는 말이 있었습니다. 믿지 않았고, 재 보지도 않았습니다.', k: 'note', fx: { hl: -1 } }) },
  { id: 'kzd_boil_fore_build', a: [25, 65], tags: ['track:KZD_BOILER:foreman'], w: 40, gap: 2,
    run: (s) => ({ t: '이동도시 건조 반장이 되었습니다. ' + s.rng.pick(['가고일 골조 조와 골리앗 인프라 조를 한 도면에 앉히는 일이었습니다.', '도면을 읽을 줄 아는 반장이 둘뿐이라고 했습니다. 제가 그중 하나였습니다.']), k: 'big', fx: { standing: 4, money: medX(s, 0.5) } }) },
  { id: 'kzd_boil_fore_launch', a: [25, 65], tags: ['track:KZD_BOILER:foreman'], w: 25, gap: 5,
    run: (s) => ({ t: '새 플레이트가 처음 움직였습니다. 반원들이 보일러실에서 나와 올려다보았습니다. 땅이 움직이는 것을 처음 본 아이도 있었습니다.', k: 'warm', fx: { h: 4 } }) },
  { id: 'kzd_boil_after_expel', a: [14, 80], w: 60, c: (s) => afterFall(s, 'KZD_BOILER', 'expel'),
    run: (s) => ({ t: '보일러실에서 나오게 되었습니다. ' + s.rng.pick(['공장이 다시 멈췄습니다. 이번에는 전쟁 때문이 아니었습니다.', '손에 밴 기름 냄새가 한 계절 갔습니다.']), k: 'bad', fx: { h: -3 } }) },

  // ════════════════════════════════════════════════════════════════════
  // KZD_BROKER 흉터의 상점 중개인 (핵심, A1 변형)
  // ════════════════════════════════════════════════════════════════════
  { id: 'kzd_bro_err_first', a: [14, 40], tags: ['track:KZD_BROKER:errand'], w: 40, gap: 2,
    run: (s) => ({ t: (affIs(s, 'KZD_BRO_SCAR') ? '흉터의 상점' : affName(s, '중개소')) + ' 심부름을 시작했습니다. ' + s.rng.pick(['봉투를 건네고 이름은 묻지 않았습니다.', '첫 심부름은 용병 팀에 사람 수를 전하는 것이었습니다. 숫자가 틀리면 사람이 죽는다고 했습니다.', '상점에는 간판이 없었습니다. 간판이 없어도 다들 찾아왔습니다.']), k: 'ev', fx: { cap: { ties: 0.03 }, standing: 2 } }) },
  { id: 'kzd_bro_err_watch', a: [14, 40], tags: ['track:KZD_BROKER:errand'], w: 30, gap: 3,
    run: (s) => ({ t: s.rng.pick(['누가 누구와 이야기하는지 보는 것이 일이었습니다. 보고 잊는 것도 일이었습니다.', '심부름 값은 건조식품이었습니다. 어떤 날은 순금 조각이었고, 그런 날은 무슨 일이 있었던 날이었습니다.']), k: 'note', fx: { money: medX(s, 0.05), cap: { ties: 0.02 } } }) },
  { id: 'kzd_bro_err_betrayal_seen', a: [14, 40], tags: ['track:KZD_BROKER:errand'], w: 25, gap: 4,
    run: (s) => ({ t: '중개인 하나가 사라졌습니다. 배신이라고 했습니다. 어느 쪽을 배신했는지는 아무도 말하지 않았습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'kzd_bro_err_slave', a: [14, 40], tags: ['aff:KZD_BRO_SLAVE'], w: 30, gap: 3, c: (s) => s.year <= 1086,
    run: (s) => ({ t: '노예 계약서를 나르는 심부름이었습니다. 계약서에 적힌 이름 중에 아는 이름이 있었습니다. 전했습니다.', k: 'bad', fx: { h: -3, standing: 2 } }) },
  { id: 'kzd_bro_bro_deal', a: [16, 50], tags: ['track:KZD_BROKER:broker'], w: 40, gap: 2,
    run: (s) => ({ t: '중개를 맡았습니다. ' + s.rng.pick(['용병 팀 하나와 귀족 하나를 붙였습니다. 양쪽에서 받았습니다.', '값을 매기는 것은 제 몫이었습니다. 사람 값을.', '계약이 깨지면 중개인이 먼저 듣습니다. 먼저 듣고 먼저 사라지는 것이 오래 사는 법이었습니다.']), k: 'ev', fx: { money: medX(s, 0.5), standing: 2 } }) },
  { id: 'kzd_bro_bro_recruit', a: [16, 50], tags: ['aff:KZD_BRO_RECRUIT'], w: 30, gap: 3,
    run: (s) => ({ t: '알선 명단에 아이 이름을 올렸습니다. 열셋이었습니다. ' + s.rng.pick(['어머니가 데려왔습니다.', '혼자 왔습니다. 혼자 오는 아이가 더 많았습니다.']), k: 'bad', fx: { h: -2, money: medX(s, 0.1) } }) },
  { id: 'kzd_bro_bro_war', a: [16, 50], tags: ['track:KZD_BROKER:broker', 'war'], w: 35, gap: 2,
    run: (s) => ({ t: '전시에 상점은 바빴습니다. ' + s.rng.pick(['양쪽 깃발이 같은 명단을 사 갔습니다.', '값이 매일 올랐습니다. 사람 값도, 정보 값도.']), k: 'ev', fx: { money: medX(s, 0.6), h: -1 } }) },
  { id: 'kzd_bro_bro_threat', a: [16, 50], tags: ['track:KZD_BROKER:broker'], w: 25, gap: 4,
    run: (s) => ({ t: '계약이 틀어진 용병 팀이 찾아왔습니다. ' + s.rng.pick(['상점 뒷문으로 나갔습니다. 뒷문이 있는 이유였습니다.', '값을 물어 주었습니다. 물어 준 값이 받은 값보다 컸습니다.']), k: 'bad', fx: { money: -medX(s, 0.3), h: -3 } }) },
  { id: 'kzd_bro_info_ledger', a: [20, 60], tags: ['track:KZD_BROKER:informant'], w: 40, gap: 2,
    run: (s) => ({ t: '정보상이 되었습니다. ' + s.rng.pick(['장부가 머릿속에 있었습니다. 종이에 적는 정보상은 오래 못 산다고 했습니다.', '어느 부대가 어디로 가는지를 팔았습니다. 산 사람이 그 길목에서 기다렸습니다.']), k: 'ev', fx: { money: medX(s, 0.8), cap: { ties: 0.03 } } }) },
  { id: 'kzd_bro_info_commission', a: [20, 60], tags: ['aff:KZD_BRO_INFO'], w: 30, gap: 3, c: (s) => yearIn(s, 1086, 1098),
    run: (s) => ({ t: '위원회 장교 하나가 단골이 되었습니다. 젊었고, 묻는 것이 많았고, 값은 정확히 냈습니다.', k: 'note', fx: { money: medX(s, 0.4), standing: 2 } }) },
  { id: 'kzd_bro_info_wrong', a: [20, 60], tags: ['track:KZD_BROKER:informant'], w: 25, gap: 4,
    run: (s) => ({ t: '판 정보가 틀렸습니다. ' + s.rng.pick(['산 사람은 돌아오지 않았고, 그래서 따지러 오지도 않았습니다.', '다음 정보를 공짜로 주었습니다. 그것으로 끝났습니다.']), k: 'bad', fx: { standing: -4, h: -2 } }) },
  { id: 'kzd_bro_info_rebuild', a: [20, 60], tags: ['track:KZD_BROKER:informant'], w: 25, gap: 4, c: (s) => s.year >= 1098,
    run: (s) => ({ t: '과도 정부가 섰어도 상점은 열려 있었습니다. 이제 파는 것은 부대 이동이 아니라 공장 자리와 배급표였습니다.', k: 'note', fx: { money: medX(s, 0.3) } }) },
  { id: 'kzd_bro_own_keys', a: [25, 70], tags: ['track:KZD_BROKER:owner'], w: 40, gap: 2,
    run: (s) => ({ t: '상점 열쇠를 받았습니다. ' + s.rng.pick(['전 운영자는 떠났다고 했습니다. 떠난 사람의 짐은 상점에 그대로 있었습니다.', '첫 손님은 옛 동료였습니다. 값을 깎아 주지 않았습니다. 깎아 주는 순간 상점이 끝난다고 배웠습니다.']), k: 'big', fx: { money: medX(s, 1), standing: 4 } }) },
  { id: 'kzd_bro_own_night', a: [25, 70], tags: ['track:KZD_BROKER:owner'], w: 30, gap: 3,
    run: (s) => ({ t: '운영자는 상점에서 잤습니다. 집은 따로 있었지만, 집에서 자는 운영자는 오래가지 못했다고 들었습니다.', k: 'note', fx: { h: -2 } }) },
  { id: 'kzd_bro_after_dead_rumor', a: [14, 80], w: 60, c: (s) => afterFall(s, 'KZD_BROKER', 'injured'),
    run: (s) => ({ t: '상점 일에서 손을 뗐습니다. ' + s.rng.pick(['뗀 손에는 흉터가 하나 더 생겨 있었습니다.', '상점은 저 없이도 열렸습니다. 늘 그랬습니다.']), k: 'bad', fx: { h: -3 } }) },

  // ════════════════════════════════════════════════════════════════════
  // KZD_DIASPORA 해외 살카즈 (핵심, A6 하한, itinerant: columbia·leithanien·victoria)
  // ════════════════════════════════════════════════════════════════════
  { id: 'kzd_dia_low_work', a: [12, 50], tags: ['track:KZD_DIASPORA:low'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['보일러실 일자리를 얻었습니다. 서류에 종족 칸이 있었고, 그 칸이 급료를 정했습니다.', '용병 졸개 일이었습니다. 앞줄이었습니다. 살카즈는 늘 앞줄이었습니다.', '공사장에서 일했습니다. 점심 줄에서 뒤로 밀렸고, 밀린 자리에서 먹었습니다.']), k: 'note', fx: { money: medX(s, 0.2), h: -1 } }) },
  { id: 'kzd_dia_low_contract_go', a: [14, 45], tags: ['track:KZD_DIASPORA:low', 'kazdel'], w: 25, gap: 5, c: (s) => s.S.cur === 'kazdel',
    run: (s) => { const to = s.rng.pick(['columbia', 'leithanien', 'victoria']); const n = s.data.nationById[to];
      if (!s.migrate('contract', to, { keepTrack: true })) return { t: '해외 일자리 이야기가 돌았습니다. 가지 못했습니다.', k: 'note' };
      return { t: ro(n.name) + ' 가는 계약에 서명했습니다. 뱃삯은 첫해 급료에서 뗀다고 했습니다. 첫해 급료가 얼마인지는 적혀 있지 않았습니다.', k: 'ev', fx: { h: -1 } }; } },
  { id: 'kzd_dia_low_horns', a: [12, 50], tags: ['track:KZD_DIASPORA:low'], w: 25, gap: 3,
    run: (s) => ({ t: s.rng.pick(['뿔을 모자로 가렸습니다. 모자가 벗겨지는 날은 하루가 달라졌습니다.', '아이가 길에서 뿔을 가리키며 물었고, 아이 어머니가 아이 손을 끌어 내렸습니다.', '"살카즈"라는 말을 등 뒤에서 들었습니다. 돌아보지 않는 법을 배웠습니다.']), k: 'bad', fx: { h: -2 } }) },
  { id: 'kzd_dia_low_cemetery', a: [12, 50], tags: ['track:KZD_DIASPORA:low'], w: 15, gap: 6,
    run: (s) => ({ t: '공사장 땅을 파다 뼈가 나왔습니다. 뿔이 있었습니다. 현장 감독이 흙을 덮으라고 했고, 덮었습니다.', k: 'bad', fx: { h: -4 } }) },
  { id: 'kzd_dia_exc_welfare', a: [16, 60], tags: ['track:KZD_DIASPORA:excluded'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['배급 창구에서 서류를 돌려받았습니다. "해당 없음" 도장이 찍혀 있었습니다.', '병원 문 앞에서 종족 칸을 보더니 다른 병원을 가르쳐 주었습니다. 다른 병원은 없었습니다.', '집세가 올랐습니다. 옆집은 오르지 않았습니다.']), k: 'bad', fx: { money: -medX(s, 0.05), h: -2 } }) },
  { id: 'kzd_dia_exc_community', a: [16, 60], tags: ['track:KZD_DIASPORA:excluded'], w: 30, gap: 3,
    run: (s) => ({ t: s.rng.pick(['살카즈끼리 모이는 지하실이 있었습니다. 거기서는 뿔을 가리지 않았습니다.', fest(s, 0) + ' 밤에 불꽃을 쏘았습니다. 유령 산크타 옷을 입은 아이들이 뛰어다녔고, 이웃은 창문을 닫았습니다.', '고향 말을 쓰는 가게가 하나 있었습니다. 값은 비쌌고, 그래도 갔습니다.']), k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } }) },
  { id: 'kzd_dia_exc_lab', a: [16, 60], tags: ['track:KZD_DIASPORA:excluded', 'columbia'], w: 15, gap: 6,
    run: (s) => ({ t: '연구소에서 사람을 모집한다는 전단이 살카즈 거리에만 붙었습니다. 보수가 좋았습니다. 간 사람 중 돌아온 사람이 있는지는 몰랐습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'kzd_dia_exc_1098', a: [16, 60], tags: ['track:KZD_DIASPORA:excluded', 'victoria'], w: 50, c: (s) => s.year >= 1098 && !s.S.flags.dia1098,
    run: (s) => { s.S.flags.dia1098 = true; return { t: '런디니움이 돌아온 뒤였습니다. 살카즈는 전범이 되었습니다. ' + (partner(s) ? partner(s).name + '까지 조사를 받았습니다.' : '거리에서 서류 검사가 늘었습니다.') + ' 짐을 싸 둔 채로 살았습니다.', k: 'bad', fx: { h: -5, money: -medX(s, 0.2) } }; } },
  { id: 'kzd_dia_exc_disguise', a: [16, 60], tags: ['aff:KZD_DIA_DISGUISE'], w: 30, gap: 3,
    run: (s) => ({ t: '카프리니로 살았습니다. ' + s.rng.pick(['뿔 모양을 다듬는 데 한 달에 한 번 돈이 들었습니다.', '같은 살카즈가 알아보고도 모르는 척해 주었습니다. 그것이 인사였습니다.']), k: 'note', fx: { money: -medX(s, 0.05), h: -1 } }) },
  { id: 'kzd_dia_legal_job', a: [18, 65], tags: ['track:KZD_DIASPORA:legal'], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['합법 고용 계약서를 받았습니다. 종족 칸이 있었지만, 급료 칸이 따로 있었습니다.', '첫 월급을 받았습니다. 통장이 생겼습니다. 통장에 이름이 찍혀 있었습니다.', '일터에서 제 자리가 생겼습니다. 자리에 이름표가 있었고, 이름표에 뿔 그림은 없었습니다.']), k: 'warm', fx: { money: medX(s, 0.5), h: 3 } }) },
  { id: 'kzd_dia_legal_still', a: [18, 65], tags: ['track:KZD_DIASPORA:legal'], w: 30, gap: 3,
    run: (s) => ({ t: s.rng.pick(['승진 명단에서 빠졌습니다. 이유는 적혀 있지 않았고, 물어보지 않았습니다.', '회식 자리에서 제 잔만 따로 놓였습니다. 그래도 자리는 있었습니다.']), k: 'note', fx: { h: -1, standing: 1 } }) },
  { id: 'kzd_dia_legal_music', a: [18, 65], tags: ['track:KZD_DIASPORA:legal'], w: 15, gap: 5, c: (s) => s.S.cap.arts > 0.5,
    run: (s) => ({ t: '살카즈 악단이 무대에 섰다는 소식을 들었습니다. 뿔을 가리지 않고. 표를 샀습니다.', k: 'warm', fx: { h: 3, money: -medX(s, 0.05) } }) },
  { id: 'kzd_dia_ifrit', a: [16, 60], tags: ['track:KZD_DIASPORA', 'columbia'], w: 6, c: (s) => canonOk(s, 'ifrit'),
    run: (s) => { canonSee(s); return { t: '연구동에서 일하던 살카즈 인턴 하나가 사직서를 썼다고 했습니다. 지하에서 뿔 달린 아이가 끌려 나오는 것을 본 날이었다고 했습니다. 소문은 거기까지였습니다.', k: 'bad', fx: { h: -3 } }; } },

  // ════════════════════════════════════════════════════════════════════
  // 나머지 진로 — 단계마다 2개
  // ════════════════════════════════════════════════════════════════════
  // ── KZD_SLAVE 자기 노예 계약(1086 이전, forced) ──
  { id: 'kzd_sla_con_sign', a: [8, 50], tags: ['track:KZD_SLAVE:contract'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['계약서의 이름은 제 것이었고 서명은 가족 것이었습니다. 그것으로 가족은 겨울을 났습니다.', '아침에 줄을 섰습니다. 줄의 앞은 일, 줄의 뒤는 식사였습니다.', '목에 표식이 생겼습니다. 표식이 있으면 거리에서 묻는 사람이 없었습니다.']), k: 'bad', fx: { h: -3, hl: -1 } }) },
  { id: 'kzd_sla_con_house', a: [8, 50], tags: ['aff:KZD_SLA_HOUSE'], w: 30, gap: 3,
    run: (s) => ({ t: '귀족 집안의 일이었습니다. 바닥은 따뜻했고, 바닥에서 잤습니다.', k: 'note', fx: { hl: 1, h: -1 } }) },
  { id: 'kzd_sla_exp_front', a: [10, 50], tags: ['track:KZD_SLAVE:expendable'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['전선으로 보내졌습니다. 장비는 없었고 번호는 있었습니다.', '앞줄에 섰습니다. 앞줄은 묻지 않고 걷는 줄이었습니다.', '옆 번호가 돌아오지 않았습니다. 번호는 다른 사람에게 다시 붙었습니다.']), k: 'bad', fx: { hl: -3, h: -3 } }) },
  { id: 'kzd_sla_exp_scar', a: [10, 50], tags: ['aff:KZD_SLA_SCAR'], w: 30, gap: 3,
    run: (s) => ({ t: '중개인이 계약을 다른 고용주에게 넘겼습니다. 저에게 알려 준 사람은 없었고, 아침에 깃발이 달라져 있었습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'kzd_sla_freed_day', a: [10, 60], tags: ['track:KZD_SLAVE:freed'], w: 60,
    run: (s) => ({ t: '해방되었습니다. 쌍둥이 왕의 이름으로 계약이 무효가 되었습니다. ' + s.rng.pick(['표식은 남았습니다. 표식을 보고 길을 비키는 사람은 없어졌습니다.', '처음 받은 품삯을 어디에 쓸지 몰라 하루를 쥐고 있었습니다.']), k: 'big', fx: { h: 6 } }) },
  { id: 'kzd_sla_freed_after', a: [10, 60], tags: ['track:KZD_SLAVE:freed'], w: 30, gap: 3,
    run: (s) => ({ t: '해방된 사람끼리 모였습니다. 옛 번호로 서로를 불렀고, 그것이 농담이 되는 데 몇 해가 걸렸습니다.', k: 'note', fx: { h: 1, cap: { ties: 0.02 } } }) },
  // ── KZD_CHILD 무덤 금속 채집 아동 ──
  { id: 'kzd_chi_gat_grave', a: [6, 14], tags: ['track:KZD_CHILD:gather'], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['무덤에서 금속을 떼었습니다. 이름이 새겨진 것은 떼지 않는다는 규칙이 아이들 사이에 있었습니다.', '해 지기 전에 자루를 채워야 했습니다. 자루가 가벼운 날은 저녁이 없었습니다.', '큰 아이들이 좋은 구역을 먼저 차지했습니다. 저는 뒤쪽 무덤을 돌았습니다.']), k: 'note', fx: { hl: -1, cap: { skill: 0.02 } } }) },
  { id: 'kzd_chi_gat_hurt', a: [6, 14], tags: ['track:KZD_CHILD:gather'], w: 25, gap: 3,
    run: (s) => ({ t: '녹슨 쇠에 손을 베었습니다. 흙으로 덮고 계속했습니다. 흉터는 어른이 되어서도 남았습니다.', k: 'bad', fx: { hl: -2 } }) },
  { id: 'kzd_chi_bar_trade', a: [7, 15], tags: ['track:KZD_CHILD:barter'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['금속 한 자루를 건조식품 한 봉지와 바꿨습니다. 상인은 저울을 쓰지 않았습니다.', '파편 값을 외웠습니다. 셈은 그렇게 배웠습니다. 글자는 배우지 못했습니다.', '용병이 지나가다 자루를 통째로 사 갔습니다. 값은 후했고, 그 용병은 다시 오지 않았습니다.']), k: 'note', fx: { money: medX(s, 0.03), cap: { learn: 0.01 } } }) },
  { id: 'kzd_chi_bar_sauin', a: [7, 15], tags: ['track:KZD_CHILD:barter', 'kazdel'], w: 20, gap: 3,
    run: (s) => ({ t: fest(s, 0) + ' 밤에는 무덤에 가지 않았습니다. 아이들끼리 불을 피웠고, 금속 대신 돌을 던졌습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'kzd_chi_err_team', a: [9, 16], tags: ['track:KZD_CHILD:errand'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['용병 팀 심부름을 맡았습니다. 물을 나르고 장비를 닦았습니다. 장비에 손대는 법을 그때 배웠습니다.', '대장이 이름을 불렀습니다. 번호가 아니라 이름을. 팀에서 처음이었습니다.', '팀 사람 하나가 글자를 가르쳐 주었습니다. 제 이름 석 자였습니다.']), k: 'note', fx: { cap: { skill: 0.03, learn: 0.01 }, standing: 2 } }) },
  { id: 'kzd_chi_err_watch', a: [9, 16], tags: ['track:KZD_CHILD:errand'], w: 25, gap: 3,
    run: (s) => ({ t: '팀이 작전에서 돌아올 때 수를 셌습니다. 나간 수보다 적었습니다. 세는 것은 제 일이 아니었지만 세었습니다.', k: 'bad', fx: { h: -2 } }) },
  // ── KZD_BABEL 바벨 전문직(1031~1086) ──
  { id: 'kzd_bab_stu_school', a: [14, 30], tags: ['track:KZD_BABEL:student'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['바벨 학교에 들어갔습니다. 교실에 유리창이 있었습니다. 깨지지 않은 유리창은 처음 보았습니다.', '글자를 배웠습니다. 집에서는 제가 처음이었습니다.', '수업이 끝나면 이동 농지에서 일했습니다. 학교와 농지가 같은 플레이트에 있었습니다.']), k: 'ev', fx: { cap: { learn: 0.05 } } }) },
  { id: 'kzd_bab_stu_theresa', a: [14, 30], tags: ['track:KZD_BABEL'], w: 8, c: (s) => canonOk(s, 'theresa'),
    run: (s) => { canonSee(s); return { t: '이동 농지 가장자리에서 흰 옷의 여자가 아이들에게 글자를 가르치는 것을 멀리서 보았습니다. 가까이 가지는 않았습니다.', k: 'warm', fx: { h: 2 } }; } },
  { id: 'kzd_bab_pro_work', a: [18, 60], tags: ['track:KZD_BABEL:professional'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['바벨 병원에서 일했습니다. 결정이 손등까지 올라온 환자에게 처음으로 "치료"라는 말을 썼습니다.', '학교에서 가르쳤습니다. 학생 절반이 용병 집 아이였고, 절반은 용병이 될 아이였습니다.', '엔지니어링팀에서 플레이트 도면을 그렸습니다. 도면에 처음으로 학교 자리가 들어갔습니다.']), k: 'note', fx: { standing: 2, cap: { learn: 0.03 } } }) },
  { id: 'kzd_bab_pro_1086', a: [18, 60], tags: ['track:KZD_BABEL:professional'], w: 60, c: (s) => s.year === 1086,
    run: (s) => ({ t: '교사들 사이의 다툼이 쿠데타의 구실이 되었습니다. 교무실에서 어느 쪽에 설지를 물었고, 대답은 그날 밤 명단이 되었습니다.', k: 'bad', fx: { h: -4, standing: -2 }, f: F('바벨 학교 교직원 회의록, 1086년') }) },
  { id: 'kzd_bab_head_budget', a: [25, 65], tags: ['track:KZD_BABEL:head'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['부서 책임을 맡았습니다. 예산표의 첫 줄은 식량, 둘째 줄은 약, 셋째 줄부터가 연구였습니다.', '회의에서 "살카즈의 생계"라는 말이 하루에 열 번 나왔습니다. 열 번 다 다른 뜻이었습니다.']), k: 'ev', fx: { standing: 3 } }) },
  { id: 'kzd_bab_head_closure', a: [25, 65], tags: ['track:KZD_BABEL:head'], w: 8, c: (s) => canonOk(s, 'closure'),
    run: (s) => { canonSee(s); return { t: '엔지니어링팀의 젊은 책임자가 제 부서 공구함을 열어 보고 "이건 내가 더 싸게 산다"고 했습니다. 실제로 더 싸게 사 왔습니다.', k: 'note', fx: { money: medX(s, 0.1) } }; } },
  { id: 'kzd_bab_dis_after', a: [18, 80], tags: ['track:KZD_BABEL:dissolved'], w: 60, gap: 2,
    run: (s) => ({ t: s.rng.pick(['바벨이 흩어진 뒤였습니다. 병원 간판이 내려갔고, 환자는 그대로 왔습니다.', '옛 동료는 용병이 되었거나 위원회에 갔거나 소식이 없었습니다. 세 갈래였습니다.', '학교 건물은 창고가 되었습니다. 유리창은 그대로였고, 그것이 더 이상했습니다.']), k: 'bad', fx: { h: -3 } }) },
  { id: 'kzd_bab_dis_ship', a: [18, 80], tags: ['track:KZD_BABEL:dissolved'], w: 20, gap: 4, c: (s) => s.year >= 1094,
    run: (s) => ({ t: '바벨의 배가 남았다는 말을 들었습니다. 이름을 바꿔 달았다고 했습니다. 옛 동료 몇이 거기 있다고 했습니다.', k: 'note', fx: { h: 1 } }) },
  // ── KZD_COURT 왕정 직속군(순혈) ──
  { id: 'kzd_cou_sci_blood', a: [12, 25], tags: ['track:KZD_COURT:scion'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['혈통 기록부에 이름이 올라갔습니다. 기록부는 저보다 오래된 것이었습니다.', '영지 밖으로 나가지 않았습니다. 나갈 이유가 없다고 배웠습니다.', '같은 또래 중 순혈이 아닌 아이와는 같은 식탁에 앉지 않았습니다. 앉아 본 적이 없어서 이상한 줄도 몰랐습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'kzd_cou_sci_temple', a: [12, 25], tags: ['aff:KZD_COU_TEMPLE'], w: 30, gap: 3,
    run: (s) => ({ t: '지식의 신전에서는 책을 읽기 전에 손을 씻었습니다. 책이 사람보다 귀한 곳이었습니다.', k: 'note', fx: { cap: { learn: 0.04 } } }) },
  { id: 'kzd_cou_tra_arts', a: [14, 30], tags: ['track:KZD_COURT:trained'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['아츠 강화 훈련이 시작되었습니다. 한 가지 아츠만 반복했습니다. 그것이 가문의 아츠였습니다.', '훈련 뒤에는 코피가 났습니다. 교관은 "순혈의 값"이라고 했습니다.', '같은 훈련을 받던 하나가 중단되었습니다. 이유는 듣지 못했습니다.']), k: 'bad', fx: { cap: { arts: 0.05 }, hl: -2 } }) },
  { id: 'kzd_cou_tra_banshee', a: [14, 30], tags: ['aff:KZD_COU_BANSHEE'], w: 30, gap: 3,
    run: (s) => ({ t: '밴시 가문의 훈련은 소리로 했습니다. 소리를 내는 날보다 삼키는 날이 많았습니다.', k: 'note', fx: { cap: { arts: 0.03 } } }) },
  { id: 'kzd_cou_gua_duty', a: [18, 60], tags: ['track:KZD_COURT:guard'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['직속군에 섰습니다. 영주가 지나갈 때 숨을 멈추는 것이 첫 규칙이었습니다.', '평민 용병과 같은 전장에 섰습니다. 같은 줄은 아니었습니다.', '영묘를 지키는 순번이 돌아왔습니다. 영묘 안에서는 아무것도 묻지 않았습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'kzd_cou_gua_war', a: [18, 60], tags: ['track:KZD_COURT:guard', 'war'], w: 40, gap: 2,
    run: (s) => ({ t: '내전에서 왕정은 어느 쪽도 아니었고, 그래서 양쪽에서 맞았습니다. 영지 담장이 한 해에 두 번 뚫렸습니다.', k: 'bad', fx: { hl: -3, h: -3 } }) },
  { id: 'kzd_cou_roy_near', a: [25, 80], tags: ['track:KZD_COURT:royal'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['영주 근위가 되었습니다. 영주의 식사를 먼저 맛보는 것이 일 중 하나였습니다.', '영주가 처음으로 이름을 불렀습니다. 그것으로 충분하다고 가문은 말했습니다.']), k: 'big', fx: { standing: 4 } }) },
  { id: 'kzd_cou_roy_rot', a: [25, 80], tags: ['aff:KZD_COU_ROT'], w: 30, gap: 3,
    run: (s) => ({ t: '부패의 영지에서는 근위도 썩는 것을 지켰습니다. 무엇이 썩는지는 묻지 않는 것이 예의였습니다.', k: 'note', fx: { h: -1 } }) },
  // ── KZD_CONFESSOR 고해신부·인공 살카즈 제작 ──
  { id: 'kzd_con_nov_rite', a: [16, 35], tags: ['track:KZD_CONFESSOR:novice'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['수습으로 들어갔습니다. 첫해는 침묵이었습니다. 말을 하면 처음부터 다시였습니다.', '고해를 듣는 법보다 잊는 법을 먼저 배웠습니다.', '밤에 아츠를 썼고 아침에 손이 떨렸습니다. 떨리지 않을 때까지 반복했습니다.']), k: 'note', fx: { cap: { arts: 0.05 }, h: -1 } }) },
  { id: 'kzd_con_nov_sudarium', a: [16, 35], tags: ['aff:KZD_CON_SUDARIUM'], w: 30, gap: 3,
    run: (s) => ({ t: '수다림의 수습은 얼굴을 가렸습니다. 가린 채로 서로를 알아보는 데 한 해가 걸렸습니다.', k: 'note', fx: { cap: { arts: 0.03 } } }) },
  { id: 'kzd_con_con_hear', a: [22, 70], tags: ['track:KZD_CONFESSOR:confessor'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['고해신부가 되었습니다. 첫 고해는 영주의 것이었습니다. 들은 것은 지금도 말하지 않습니다.', '고해를 들은 날은 잠을 설쳤습니다. 들은 것 때문이 아니라 들어야 했던 것 때문이었습니다.', '고해 뒤에 집행이 따르는 날이 있었습니다. 집행은 제 손으로 했습니다. 결과만 적습니다.']), k: 'bad', fx: { standing: 3, h: -2 } }) },
  { id: 'kzd_con_con_backlash', a: [22, 70], tags: ['track:KZD_CONFESSOR:confessor'], w: 25, gap: 4,
    run: (s) => ({ t: '아츠가 되돌아왔습니다. 사흘을 누웠습니다. 나흘째 다시 섰고, 손에 결정 비슷한 것이 비쳤다가 사라졌습니다.', k: 'bad', fx: { hl: -5 } }) },
  { id: 'kzd_con_mak_work', a: [30, 90], tags: ['track:KZD_CONFESSOR:maker'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['제작실에 들어갔습니다. 무엇을 만드는지는 들어가기 전에 알았고, 들어가서는 잊었습니다.', '피조물 하나가 이름을 물었습니다. 이름은 주지 않는 것이 규칙이었습니다. 규칙을 지켰습니다.']), k: 'bad', fx: { standing: 4, h: -3 } }) },
  { id: 'kzd_con_mak_rumor', a: [30, 90], tags: ['track:KZD_CONFESSOR:maker'], w: 25, gap: 4,
    run: (s) => ({ t: '다른 제작실의 피조물이 돌아섰다는 말을 들었습니다. 그 제작실은 그 뒤로 열리지 않았습니다.', k: 'bad', fx: { h: -2 } }) },
  // ── KZD_FARM 이동 농지 농민 ──
  { id: 'kzd_far_lab_field', a: [12, 60], tags: ['track:KZD_FARM:labor'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['이동 농지에서 일했습니다. 플레이트가 움직이는 동안에도 밭은 움직이지 않는 것처럼 일했습니다.', '수확은 반이 용병 몫, 반이 마을 몫이었습니다. 그 반을 또 나눴습니다.', '비가 오지 않는 땅을 플레이트가 옮겨 갔습니다. 비가 오는 곳으로.']), k: 'note', fx: { cap: { skill: 0.02 }, money: medX(s, 0.05) } }) },
  { id: 'kzd_far_lab_babel', a: [12, 60], tags: ['aff:KZD_FAR_BABEL'], w: 30, gap: 3,
    run: (s) => ({ t: '바벨 농지에는 학교가 붙어 있었습니다. 일 끝나고 글자를 배우는 사람이 저녁마다 열 명쯤 되었습니다.', k: 'warm', fx: { cap: { learn: 0.03 }, h: 1 } }) },
  { id: 'kzd_far_man_ration', a: [18, 65], tags: ['track:KZD_FARM:manage'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['농지 관리를 맡았습니다. 씨앗 창고 열쇠가 제게 왔습니다. 열쇠가 무거웠습니다.', '돌아온 용병 팀이 식량을 달라고 왔습니다. 장부에 적고 내주었습니다. 장부는 곧 의미가 없어졌습니다.']), k: 'ev', fx: { standing: 3 } }) },
  { id: 'kzd_far_man_raid_near', a: [18, 65], tags: ['track:KZD_FARM:manage', 'war'], w: 35, gap: 3,
    run: (s) => ({ t: '옆 농지가 털렸습니다. 어느 쪽 깃발이었는지는 남은 사람이 말하지 않았습니다. 우리 농지는 그 주에 플레이트를 돌렸습니다.', k: 'bad', fx: { h: -3, money: -medX(s, 0.1) } }) },
  { id: 'kzd_far_rat_line', a: [20, 70], tags: ['track:KZD_FARM:ration'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['배급 담당이 되었습니다. 줄 선 사람 중 아는 얼굴이 반이었습니다. 반에게도 같은 양을 주었습니다.', '귀환 용병에게 식량을 나눴습니다. 받는 손 중 성한 손이 드물었습니다.']), k: 'note', fx: { standing: 2, cap: { ties: 0.02 } } }) },
  { id: 'kzd_far_rat_short', a: [20, 70], tags: ['track:KZD_FARM:ration'], w: 30, gap: 3,
    run: (s) => ({ t: '배급이 모자란 주였습니다. 줄 끝 ' + s.rng.ri(5, 20) + '명이 빈손으로 돌아갔습니다. 다음 주에는 그 사람들이 앞에 섰습니다.', k: 'bad', fx: { h: -2 }, f: govF('배급 대장', s.year) }) },
  // ── KZD_FACTORY 공장·언어학교(1098~) ──
  { id: 'kzd_fac_tra_line', a: [14, 50], tags: ['track:KZD_FACTORY:trainee'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['훈련생으로 공장에 들어갔습니다. 첫 수업은 기계가 아니라 출근 시간이었습니다.', '옆자리 훈련생은 열 해 용병이었습니다. 나사를 돌리는 손이 떨렸고, 떨리지 않을 때까지 돌렸습니다.', '언어학교에서 외국 글자를 배웠습니다. 카즈델 밖에서 쓰는 글자라고 했습니다.']), k: 'note', fx: { cap: { learn: 0.04 } } }) },
  { id: 'kzd_fac_tra_training', a: [14, 50], tags: ['aff:KZD_FAC_TRAINING'], w: 30, gap: 3,
    run: (s) => ({ t: '과도 정부 훈련소의 수료증을 받았습니다. 종이 한 장이었고, 카즈델에서 받은 첫 종이였습니다.', k: 'warm', fx: { h: 2, standing: 2 } }) },
  { id: 'kzd_fac_wor_shift', a: [16, 60], tags: ['track:KZD_FACTORY:worker'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['공원이 되었습니다. 월급이라는 것을 받았습니다. 파편이 아니라 종이였고, 종이로 빵을 샀습니다.', '언어 강사가 되었습니다. 학생들은 귀환 용병이었고, 첫 단어는 "안녕하십니까"였습니다. 카즈델 인사와 달랐습니다.', '공장 사이렌이 하루를 나눴습니다. 포성이 나누던 하루보다 짧았습니다.']), k: 'note', fx: { money: medX(s, 0.1), standing: 1 } }) },
  { id: 'kzd_fac_wor_language', a: [16, 60], tags: ['aff:KZD_FAC_LANGUAGE'], w: 30, gap: 3,
    run: (s) => ({ t: '언어학교 학생 하나가 외국으로 떠났습니다. 배운 말로 첫 편지를 보내왔습니다. 철자가 틀렸고, 읽혔습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'kzd_fac_fore_run', a: [20, 65], tags: ['track:KZD_FACTORY:foreman'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['반장이 되었습니다. 반원 명단에 옛 용병 팀 이름이 셋 있었습니다.', '교장이 되었습니다. 교장실 창문이 깨져 있었고, 갈아 끼우는 데 한 달이 걸렸습니다. 유리가 귀했습니다.']), k: 'ev', fx: { standing: 3 } }) },
  { id: 'kzd_fac_fore_close', a: [20, 65], tags: ['track:KZD_FACTORY:foreman'], w: 25, gap: 4,
    run: (s) => ({ t: '공장 하나가 다시 닫혔습니다. 우리 공장은 아니었습니다. 닫힌 공장 반장이 찾아와 자리를 물었고, 없다고 했습니다.', k: 'bad', fx: { h: -2 } }) },
  // ── KZD_DESIGNER 마르트 디자이너(itinerant) ──
  { id: 'kzd_des_app_sketch', a: [16, 35], tags: ['track:KZD_DESIGNER:apprentice'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['마르트의 수습이 되었습니다. 첫 일은 옷이 아니라 실 정리였습니다.', '뿔 모양에 맞춘 모자를 그렸습니다. 사장은 "그건 팔리지 않는다"고 했고, 다음 해에 팔았습니다.']), k: 'note', fx: { cap: { arts: 0.04 } } }) },
  { id: 'kzd_des_app_abroad', a: [16, 35], tags: ['track:KZD_DESIGNER:apprentice'], w: 25, gap: 3, c: (s) => !!s.S.res.itinerantAt,
    run: (s) => { const n = s.data.nationById[s.S.res.itinerantAt]; return { t: (n ? n.name + ' 전시회에 ' : '해외 전시회에 ') + '따라갔습니다. 옷을 보던 사람들이 제 뿔을 보고 옷을 다시 보았습니다.', k: 'note', fx: { h: -1, cap: { ties: 0.02 } } }; } },
  { id: 'kzd_des_des_show', a: [18, 50], tags: ['track:KZD_DESIGNER:designer'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['제 이름이 들어간 옷이 나왔습니다. 이름은 작게, 상표는 크게였습니다.', '해외 주문이 들어왔습니다. 주문서에 "살카즈 디자이너"라는 말이 괄호 안에 있었습니다.', '옷이 팔렸습니다. 산 사람은 옷을 입었고, 디자이너가 누군지는 몰랐습니다. 그것이 편했습니다.']), k: 'ev', fx: { money: medX(s, 0.6), standing: 3 } }) },
  { id: 'kzd_des_des_closed', a: [18, 50], tags: ['track:KZD_DESIGNER:designer'], w: 25, gap: 4,
    run: (s) => ({ t: '해외 매장 하나가 문을 닫았습니다. 건물주가 살카즈 상표를 원하지 않았다고 했습니다. 재고는 배로 돌아왔습니다.', k: 'bad', fx: { money: -medX(s, 0.3), h: -2 } }) },
  { id: 'kzd_des_bra_name', a: [25, 65], tags: ['track:KZD_DESIGNER:brand'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['브랜드 대표가 되었습니다. 첫 결정은 뿔 구멍을 기본으로 넣을지였습니다. 넣었습니다.', '잡지가 인터뷰를 요청했습니다. 질문의 반이 옷이고 반이 카즈델이었습니다. 옷 이야기만 했습니다.']), k: 'big', fx: { money: medX(s, 1.2), standing: 4 } }) },
  { id: 'kzd_des_bra_home', a: [25, 65], tags: ['track:KZD_DESIGNER:brand', 'kazdel'], w: 25, gap: 4,
    run: (s) => ({ t: '카즈델에 작업실을 하나 두었습니다. 재봉사 전원이 돌아온 용병이었습니다. 바느질이 정확했습니다.', k: 'warm', fx: { h: 2, standing: 2 } }) },
  // ── KZD_ASSASSIN 유해 결사대 자객 ──
  { id: 'kzd_ass_rite_horn', a: [14, 30], tags: ['track:KZD_ASSASSIN:rite'], w: 60,
    run: (s) => ({ t: '의식을 치렀습니다. 뿔을 자르고 피부를 태웠습니다. 이름은 두고 왔습니다. 결과만 적습니다.', k: 'bad', fx: { hl: -6, h: -3, standing: 5 } }) },
  { id: 'kzd_ass_rite_silence', a: [14, 30], tags: ['track:KZD_ASSASSIN:rite'], w: 30, gap: 2,
    run: (s) => ({ t: '의식 뒤 한 해는 말을 하지 않았습니다. 하지 않는 것이 아니라 할 수 없는 것이라고 선배가 말했습니다.', k: 'note', fx: { cap: { skill: 0.04 } } }) },
  { id: 'kzd_ass_ass_job', a: [15, 50], tags: ['track:KZD_ASSASSIN:assassin'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['임무가 왔습니다. 이름 하나와 장소 하나였습니다. 돌아와서 이름을 지웠습니다.', '표적이 아는 얼굴이었습니다. 임무는 임무였습니다. 결과만 적습니다.', '임무 사이의 날들은 길었습니다. 길어서 좋았습니다.']), k: 'bad', fx: { standing: 3, h: -3, money: medX(s, 0.5) } }) },
  { id: 'kzd_ass_ass_hunted', a: [15, 50], tags: ['track:KZD_ASSASSIN:assassin'], w: 25, gap: 4,
    run: (s) => ({ t: '거꾸로 쫓기는 계절이 있었습니다. 한 달을 지하에서 보냈고, 올라왔을 때 쫓던 쪽이 먼저 없어져 있었습니다.', k: 'bad', fx: { hl: -3, h: -2 } }) },
  { id: 'kzd_ass_cad_order', a: [22, 60], tags: ['track:KZD_ASSASSIN:cadre'], w: 50, gap: 2,
    run: (s) => ({ t: s.rng.pick(['간부가 되었습니다. 이제 이름을 받는 쪽이 아니라 주는 쪽이었습니다.', '새 지원자의 의식을 지켜보았습니다. 제 것보다 길게 느껴졌습니다.']), k: 'ev', fx: { standing: 4 } }) },
  { id: 'kzd_ass_cad_rumor', a: [22, 60], tags: ['track:KZD_ASSASSIN:cadre'], w: 25, gap: 4,
    run: (s) => ({ t: '결사대 이야기가 바깥에서 돌았습니다. 반은 틀렸고, 틀린 쪽이 더 무서웠습니다. 고치지 않았습니다.', k: 'note', fx: { h: -1 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 생업·명절·동네 (카즈델 전체, 진로 무관)
  // ════════════════════════════════════════════════════════════════════
  { id: 'kzd_life_barter', a: [10, 80], tags: ['kazdel'], w: 20, gap: 3,
    run: (s) => { const n = s.rng.ri(2, 6); return { t: s.rng.pick(['시장에는 값이 없었습니다. 오리아이언 파편 ' + n + '개가 빵 한 덩이인지를 그날 아침에 정했습니다.', '외국 돈이 들어왔습니다. 받는 가게가 하나였고, 그 가게 앞에 줄이 섰습니다.', '파편 대신 약속으로 샀습니다. 약속은 사우인 전에 갚는 것이 규칙이었습니다.']), k: 'note', fx: { money: -medX(s, 0.02) }, f: s.rng.chance(0.5) ? kzF('물물교환 시세표', s.year) : undefined }; } },
  { id: 'kzd_life_oriiron', a: [10, 80], tags: ['kazdel'], w: 15, gap: 4,
    run: (s) => ({ t: '오리아이언 파편을 ' + s.rng.ri(3, 12) + '개 모았습니다. 한 해 먹을 소금이었습니다. 파편은 손에서 미지근했고, 아무도 그것을 묻지 않았습니다.', k: 'note', fx: { money: medX(s, 0.05) }, f: kzF('물물교환 시세표', s.year) }) },
  { id: 'kzd_life_sauin', a: [6, 90], tags: ['kazdel'], w: 25, gap: 8,
    run: (s) => ({ t: ieot(fest(s, 0)) + '습니다. ' + s.rng.pick(['죽은 사람의 이름을 불렀습니다. 올해는 부를 이름이 하나 늘었습니다.', '불을 피우고 ' + eul(cul(s).food) + ' 나눴습니다. 나눌 사람이 작년보다 적었습니다.', '아이들이 유령 산크타 옷을 입고 뛰어다녔습니다. 어른들은 웃지 않았고, 말리지도 않았습니다.']), k: 'note', fx: { h: 1 } }) },
  { id: 'kzd_life_greet', a: [10, 90], tags: ['kazdel'], w: 10, gap: 8,
    run: (s) => ({ t: '길에서 옛 얼굴을 만났습니다. "' + cul(s).greet + '." 그것이 인사였고, 대답도 같았습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'kzd_life_rebuild', a: [10, 90], tags: ['kazdel'], w: 30, gap: 2, c: (s) => s.year >= 1098 && s.year <= 1106,
    run: (s) => ({ t: s.rng.pick(['전후 복구였습니다. 무너진 ' + (s.S.home.type === 'nomadic' ? '플레이트 조각을' : '담과 지붕을') + ' 치우는 데 동네가 다 나왔습니다. 용병도 삽을 들었습니다.', '과도 정부 공고가 붙었습니다. 읽을 수 있는 사람이 소리 내어 읽었고, 나머지가 들었습니다.', '물이 다시 나왔습니다. 수도꼭지 앞에 줄이 섰고, 줄 선 사람들이 처음으로 서로 이야기했습니다.']), k: 'note', fx: { h: 1, cap: { ties: 0.02 } } }) },
  { id: 'kzd_life_war_home', a: [6, 90], tags: ['kazdel', 'war'], w: 30, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['포성이 가까운 밤은 지하에서 잤습니다. 지하에 사람이 많았습니다.', '양쪽 깃발이 같은 주에 마을을 지나갔습니다. 집에 남은 것이 줄었습니다.', '배급은 깃발을 가리지 않았습니다. 줄만 길었습니다.']), k: 'bad', fx: { hl: -1, h: -2, money: -medX(s, 0.05) } }) },
  { id: 'kzd_life_infected_normal', a: [10, 90], tags: ['kazdel', 'known'], w: 15, gap: 5,
    run: (s) => ({ t: '결정이 비치는 손으로 빵을 받았습니다. 파는 사람도 같은 손이었습니다. 카즈델에서 그것은 날씨 같은 것이었습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'kzd_life_babel_1094', a: [10, 90], tags: ['kazdel'], w: 30, c: (s) => s.year === 1095,
    run: (s) => ({ t: '여왕이 죽은 다음 해였습니다. 바벨 이름이 붙은 것은 간판이든 학교든 내려갔습니다. 농지는 남았습니다. 농지는 깃발을 모르니까요.', k: 'note', fx: { h: -2 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 관계 등급·신참·귀향·방문
  // ════════════════════════════════════════════════════════════════════
  { id: 'kzd_rel_inst_papers', a: [10, 80], tags: ['race:sarkaz', 'rel:institutional'], w: 25, gap: 3,
    run: (s) => ({ t: s.rng.pick(['서류에 종족 칸이 있었습니다. 그 칸이 나머지 칸을 정했습니다.', '거주 등록 창구가 따로 있었습니다. 따로 있는 창구는 한 달에 한 번 열렸습니다.', '병원에서 접수를 받지 않았습니다. 받지 않는 이유는 벽에 붙어 있었습니다.']), k: 'bad', fx: { h: -2, money: -medX(s, 0.03) } }) },
  { id: 'kzd_rel_inst_1098', a: [10, 80], tags: ['race:sarkaz', 'rel:institutional', 'victoria'], w: 40, c: (s) => s.year >= 1098 && !s.S.flags.relVic1098,
    run: (s) => { s.S.flags.relVic1098 = true; return { t: '런디니움이 돌아온 뒤 살카즈는 이 나라에서 전범이었습니다. 거리에서 서류 검사가 늘었고, 검사하는 쪽이 먼저 한 걸음 물러섰습니다.', k: 'bad', fx: { h: -4 } }; } },
  { id: 'kzd_rel_subtle_shop', a: [10, 80], tags: ['race:sarkaz', 'rel:subtle'], w: 20, gap: 4,
    run: (s) => ({ t: s.rng.pick(['가게 주인이 거스름돈을 카운터에 놓았습니다. 손에 쥐여 주지 않고.', '이웃이 인사를 했습니다. 눈은 뿔에 있었습니다.', '아이 학교에서 "카즈델 이야기"를 발표하라고 했습니다. 아이는 하지 않았고, 그것으로 끝났습니다.']), k: 'note', fx: { h: -1 } }) },
  { id: 'kzd_rel_neutral_kjerag', a: [10, 80], tags: ['race:sarkaz', 'rel:neutral', '!kazdel'], w: 10, gap: 6,
    run: (s) => ({ t: '여기서는 뿔을 아무도 보지 않았습니다. 처음에는 그것이 더 어색했습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'kzd_newcomer_in', a: [10, 80], tags: ['kazdel', 'newcomer'], w: 30, gap: 2,
    run: (s) => ({ t: s.rng.pick(['카즈델 말이 서툴렀습니다. 값을 두 번 물었고, 두 번째 값이 쌌습니다. 여기서는 그랬습니다.', '외국 사람은 드물었습니다. 아이들이 따라왔고, 어른들은 묻지 않았습니다.', '돈을 내밀었더니 상인이 웃었습니다. 파편으로 바꿔 주는 사람을 찾는 데 하루가 걸렸습니다.']), k: 'note', fx: { h: -1 } }) },
  { id: 'kzd_return_1098', a: [12, 80], tags: ['kazdel'], w: 60, c: (s) => s.year >= 1098 && s.S.flags.migReason === 'return' && s.S.age - (s.S.flags.migAt ?? -99) <= 1 && !s.S.flags.kzdReturnTold,
    run: (s) => { s.S.flags.kzdReturnTold = true; return { t: '카즈델로 돌아왔습니다. ' + s.rng.pick(['떠날 때 있던 ' + (s.S.home.type === 'nomadic' ? '플레이트가' : '골목이') + ' 없었고, 없던 공장이 있었습니다.', '동네 사람 반이 모르는 얼굴이었습니다. 반은 아는 얼굴이었고, 그 반이 더 늙어 있었습니다.', '첫 인사는 "' + cul(s).greet + '"이었습니다. 살아 있었습니다.']), k: 'big', fx: { h: 3, cap: { ties: 0.03 } } }; } },
  { id: 'kzd_visit_streets', a: [10, 80], tags: ['visit:kazdel'], w: 25, gap: 3,
    run: (s) => ({ t: s.rng.pick(['카즈델에 머무는 동안 돈을 쓸 데가 없었습니다. 파편이 없었으니까요.', '카즈델 거리에서는 결정이 비치는 손을 아무도 가리지 않았습니다. 제가 더 이상한 쪽이었습니다.', '카즈델에서 들은 인사는 "' + cul(s).greet + '"이었습니다. 처음에는 농담인 줄 알았습니다.']), k: 'note', fx: { h: -1 } }) },
  { id: 'kzd_visit_war', a: [10, 80], tags: ['visit:kazdel'], w: 30, gap: 2, c: (s) => yearIn(s, 1090, 1098),
    run: (s) => ({ t: '카즈델에 머무는 동안 포성을 들었습니다. 현지 사람들은 방향으로 어느 쪽인지 알았고, 저는 몰랐습니다.', k: 'bad', fx: { h: -2 } }) },
];

// ────────────────────────────────────────────────────────────────────────────
// 결정 (11)
// ────────────────────────────────────────────────────────────────────────────
export const decisions = {
  /** 용병 계약 갱신 — 유족 배상 조항을 걸고 버틸지 */
  kzd_merc_renew: {
    tags: ['track:KZD_MERC'], gap: 4, once: false, at: 0.5,
    ok: (s) => !!s.S.track && s.S.age >= 14 && s.S.track.stage >= 1 && s.S.track.stage <= 3 && s.rng.chance(0.2),
    build: (s) => ({ title: '계약 조건', body: '새 고용주가 계약서를 내밀었습니다. 유족 배상 항목이 비어 있었습니다. 살카즈 팀을 쓰는 이유가 그 빈칸이었습니다.',
      choices: [
        { k: 'sign', label: '그대로 서명한다', sub: '보수 +', auto: 2 },
        { k: 'demand', label: '배상 항목을 요구한다', sub: '계약이 깨질 수 있음, 팀 신뢰 +', auto: 1 },
        { k: 'walk', label: '이 계약은 받지 않는다', sub: '보수 없음', auto: 0.6 }] }),
    apply: (s, k) => {
      if (k === 'sign') return { t: '서명했습니다. 보수는 순금으로 왔습니다. 빈칸은 빈칸으로 남았습니다.', k: 'note', fx: { money: medX(s, 0.4) } };
      if (k === 'demand') { if (s.rng.chance(0.45)) return { t: '요구했습니다. 고용주는 종이를 접어 넣고 다른 팀을 불렀습니다. 팀은 저를 탓하지 않았습니다.', k: 'bad', fx: { standing: 3, money: -medX(s, 0.1) } };
        return { t: '요구했습니다. 고용주가 한참 보더니 항목을 적어 넣었습니다. 적힌 금액은 작았고, 처음 적힌 것이었습니다.', k: 'warm', fx: { standing: 5, money: medX(s, 0.3) } }; }
      return { t: '받지 않았습니다. 그해 겨울은 길었습니다.', k: 'note', fx: { money: -medX(s, 0.15), h: -1 } };
    },
  },
  /** 동료 시신 처리 */
  kzd_merc_body: {
    tags: ['track:KZD_MERC'], gap: 5, once: false, at: 0.6,
    ok: (s) => !!s.S.track && s.S.age >= 14 && s.rng.chance(0.18),
    build: (s) => ({ title: '남은 사람', body: '작전에서 동료 하나가 돌아오지 못했습니다. 돌아갈 길은 멀었고, 짐은 이미 무거웠습니다.',
      choices: [
        { k: 'carry', label: '데리고 돌아간다', sub: '건강 −, 팀 신뢰 +', auto: 1.5 },
        { k: 'bury', label: '그 자리에 묻는다', sub: '표식을 남깁니다', auto: 1.5 },
        { k: 'leave', label: '두고 간다', sub: '팀 신뢰 −', auto: 0.5 }] }),
    apply: (s, k) => {
      if (k === 'carry') return { t: '데리고 돌아갔습니다. 가족이 있었습니다. 가족은 울지 않았고, 짐을 받아 들었습니다.', k: 'bad', fx: { hl: -3, h: -2, standing: 4 } };
      if (k === 'bury') return { t: '그 자리에 묻었습니다. 무덤에 금속 조각 하나를 세웠습니다. 아이들이 떼어 가지 않기를 바랐습니다.', k: 'bad', fx: { h: -2, standing: 2 } };
      return { t: '두고 왔습니다. 아무도 말하지 않았고, 그 뒤로 그 이름도 말하지 않았습니다.', k: 'bad', fx: { h: -4, standing: -3 } };
    },
  },
  /** 바벨 가담(≤1094) */
  kzd_merc_babel: {
    tags: ['track:KZD_MERC'], once: true, at: 0.5,
    ok: (s) => !!s.S.track && s.S.age >= 15 && s.year >= 1086 && s.year <= 1094 && s.rng.chance(0.3),
    build: (s) => ({ title: '깃발', body: '바벨 쪽 사람이 팀을 찾아왔습니다. 보수는 식량과 보급이었고, 적은 군사위원회였습니다. 다른 날에는 위원회 쪽 사람이 왔습니다. 조건은 같았고 적만 달랐습니다.',
      choices: [
        { k: 'babel', label: '바벨에 선다', sub: '전시 위험, 1094 이후 몰락 위험', auto: 1 },
        { k: 'commission', label: '위원회에 선다', sub: '장교 길이 열릴 수 있음', auto: 1 },
        { k: 'none', label: '어느 쪽도 아니다', sub: '보급 없음', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'babel') { s.S.flags.kzdSide = 'babel'; return { t: '바벨 깃발 아래 섰습니다. 보급은 제때 왔고, 적은 아는 얼굴이 많았습니다.', k: 'ev', fx: { standing: 3, money: medX(s, 0.2) } }; }
      if (k === 'commission') { s.S.flags.kzdSide = 'commission'; if (s.S.track.stage >= 2 && s.rng.chance(0.5)) { s.S.flags.switchOpen = true; } return { t: '위원회 깃발 아래 섰습니다. 명령서가 계약서를 대신했습니다.', k: 'ev', fx: { standing: 3, money: medX(s, 0.2) } }; }
      return { t: '어느 깃발도 들지 않았습니다. 보급은 없었고, 양쪽에서 같은 눈으로 보았습니다.', k: 'note', fx: { h: -1, money: -medX(s, 0.1) } };
    },
  },
  /** 1094 바벨 쪽에 섰던 용병 — 붕괴 후 */
  kzd_merc_babel_fall: {
    tags: ['track:KZD_MERC'], once: true, at: 0.9,
    ok: (s) => !!s.S.track && s.S.flags.kzdSide === 'babel' && s.year === 1095,
    build: (s) => ({ title: '깃발이 내려간 뒤', body: '바벨이 흩어졌습니다. 바벨 깃발 아래 섰던 팀은 위원회 명단에 올라 있었습니다.',
      choices: [
        { k: 'hide', label: '이름을 바꾸고 숨는다', sub: '계약 평판 −', auto: 1.5 },
        { k: 'ship', label: '남은 배를 찾아간다', sub: '로도스 협정 가능성', auto: 1 },
        { k: 'surrender', label: '위원회에 투항한다', sub: '사망 위험', auto: 0.6 }] }),
    apply: (s, k) => {
      if (k === 'hide') return { t: '이름을 바꾸고 다른 팀에 들어갔습니다. 옛 이름을 아는 사람은 둘이었고, 둘 다 말하지 않았습니다.', k: 'note', fx: { standing: -6, h: -2 } };
      if (k === 'ship') { s.S.flags.rhodes_operation = s.S.age; return { t: '바벨의 배가 남았다는 곳으로 갔습니다. 배는 이름을 바꿔 달고 있었고, 옛 얼굴 몇이 갑판에서 이쪽을 보았습니다.', k: 'ev', fx: { h: 1 } }; }
      if (s.rng.chance(0.3)) { s.die('execution', '숙청'); return false; }
      return { t: '투항했습니다. 조사는 사흘이었고, 사흘 뒤 다른 부대 명단에 이름이 올라 있었습니다.', k: 'bad', fx: { h: -4, standing: -3 } };
    },
  },
  /** 위원회 장교 — 숙청 집행 */
  kzd_com_purge: {
    tags: ['track:KZD_COMMISSION'], gap: 4, once: false, at: 0.5,
    ok: (s) => !!s.S.track && s.S.track.stage >= 1 && s.year <= 1098 && s.rng.chance(0.25),
    build: (s) => ({ title: '명단', body: '명단이 내려왔습니다. 이름 중 하나는 옛 팀 동료였습니다. 집행은 제 부대 몫이었습니다.',
      choices: [
        { k: 'do', label: '집행한다', sub: '군공 +', auto: 1.5 },
        { k: 'warn', label: '그 이름에게 먼저 알린다', sub: '발각 위험', auto: 1 },
        { k: 'refuse', label: '거부한다', sub: '강등·숙청 위험', auto: 0.4 }] }),
    apply: (s, k) => {
      if (k === 'do') return { t: '집행했습니다. 결과만 적습니다. 보고서는 한 장이었습니다.', k: 'bad', fx: { standing: 5, h: -5 } };
      if (k === 'warn') { if (s.rng.chance(0.35)) { s.fall('purge'); return false; } return { t: '밤에 쪽지를 보냈습니다. 다음 날 그 집은 비어 있었고, 명단에는 "소재 불명"이 적혔습니다.', k: 'note', fx: { h: 1, standing: -2 } }; }
      if (s.rng.chance(0.5)) { s.fall('purge'); return false; }
      s.S.track.stage = Math.max(0, s.S.track.stage - 1); return { t: '거부했습니다. 계급장 하나가 떨어졌고, 명단은 다른 부대로 갔습니다.', k: 'bad', fx: { standing: -8 } };
    },
  },
  /** 보일러공 — 용광로 긴급 수리 */
  kzd_boil_emergency: {
    tags: ['track:KZD_BOILER'], gap: 5, once: false, at: 0.5,
    ok: (s) => !!s.S.track && s.S.track.stage >= 1 && s.rng.chance(0.2),
    build: (s) => ({ title: '압력', body: '보일러 압력이 올라갔고 안전판이 듣지 않았습니다. 지금 들어가면 멈출 수 있고, 들어가지 않으면 구역이 비워집니다.',
      choices: [
        { k: 'go', label: '들어간다', sub: '사고 위험, 동네 평판 +', auto: 1.3 },
        { k: 'evac', label: '구역을 비운다', sub: '보일러 손실', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'go') { const r = s.rng.rnd(); if (r < 0.08) { s.die('accident', '보일러 사고'); return false; } if (r < 0.3) return { t: '들어가서 멈췄습니다. 나올 때 팔이 익어 있었습니다. 보일러는 다음 날 다시 돌았습니다.', k: 'bad', fx: { hl: -12, standing: 6 } };
        return { t: '들어가서 멈췄습니다. 나왔을 때 조원들이 아무 말도 하지 않았고, 그날 저녁 ' + iga(cul(s).drink) + ' 제 앞에 먼저 놓였습니다.', k: 'warm', fx: { standing: 8, h: 3 } }; }
      return { t: '구역을 비웠습니다. 보일러 하나가 터졌고 사람은 다치지 않았습니다. 다음 달 월급이 절반이었습니다.', k: 'note', fx: { money: -medX(s, 0.15), standing: -2 } };
    },
  },
  /** 흉터의 상점 — 배신 제안 */
  kzd_bro_betray: {
    tags: ['track:KZD_BROKER'], gap: 6, once: false, at: 0.5,
    ok: (s) => !!s.S.track && s.S.track.stage >= 1 && s.rng.chance(0.15),
    build: (s) => ({ title: '제안', body: '단골 용병 팀의 다음 행선지를 사겠다는 사람이 왔습니다. 값은 한 해 수입이었습니다. 그 팀 대장은 제 이름을 알고 있었습니다.',
      choices: [
        { k: 'no', label: '팔지 않는다', sub: '조직 신뢰 +', auto: 2 },
        { k: 'sell', label: '판다', sub: '돈 +, 피살 위험', auto: 0.8 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '팔지 않았습니다. 산다던 사람은 다음 주에 다른 중개인을 찾았고, 그 중개인은 그다음 주에 보이지 않았습니다.', k: 'note', fx: { standing: 4 } };
      if (s.rng.chance(0.3)) { s.fall('betrayal'); return false; }
      return { t: '팔았습니다. 그 팀은 돌아오지 않았습니다. 돈은 한 해를 갔고, 밤은 더 오래 갔습니다.', k: 'bad', fx: { money: medX(s, 1), h: -4 } };
    },
  },
  /** 해외 살카즈 — 카프리니 위장 */
  kzd_dia_disguise: {
    tags: ['track:KZD_DIASPORA'], once: true, at: 0.5,
    ok: (s) => !!s.S.track && s.S.track.stage >= 1 && s.S.cur !== 'kazdel' && s.rng.chance(0.3),
    build: (s) => ({ title: '뿔', body: '뿔을 다듬어 카프리니로 보이게 해 주는 사람이 있었습니다. 값은 석 달치 집세였고, 매달 손봐야 한다고 했습니다.',
      choices: [
        { k: 'yes', label: '위장한다', sub: '편견 이벤트 줄어듦, 돈 −', auto: 1 },
        { k: 'no', label: '그대로 산다', sub: '변화 없음', auto: 1.5 }] }),
    apply: (s, k) => {
      if (k !== 'yes') return { t: '그대로 살기로 했습니다. 뿔은 뿔이었습니다.', k: 'note', fx: { h: 1 } };
      s.S.track.aff = 'KZD_DIA_DISGUISE';
      return { t: '뿔을 다듬었습니다. 거울 속 사람이 카프리니처럼 보였고, 거울을 오래 보지 않게 되었습니다.', k: 'note', fx: { money: -medX(s, 0.3), h: -2 } };
    },
  },
  /** 채집 아동 — 용병 팀 입단 제안 */
  kzd_chi_join: {
    tags: ['track:KZD_CHILD'], once: true, at: 0.6,
    ok: (s) => !!s.S.track && s.S.age >= 11 && s.S.track.stage >= 1 && s.rng.chance(0.4),
    build: (s) => ({ title: '팀', body: '용병 팀 대장이 자루를 보더니 팀에 들어오지 않겠느냐고 했습니다. 밥은 매일 준다고 했습니다.',
      choices: [
        { k: 'join', label: '들어간다', sub: '용병 진로로', auto: 1.5 },
        { k: 'stay', label: '무덤에 남는다', sub: '변화 없음', auto: 1 }] }),
    apply: (s, k) => {
      if (k !== 'join') return { t: '남았습니다. 대장은 다음 아이에게 같은 말을 했습니다.', k: 'note' };
      return s.switchTrack('KZD_MERC') ? false : { t: '들어가려 했지만 팀이 먼저 떠났습니다.', k: 'note' };
    },
  },
  /** 자기 노예 계약(1086 이전) — 가족 보호 */
  kzd_slave_sell: {
    tags: ['kazdel', 'q1'], once: true, at: 0.5,
    ok: (s) => s.S.age >= 9 && s.S.age <= 35 && s.year <= 1086 && !s.S.track && s.S.money < s.med * 0.3 && s.rng.chance(0.2),
    build: (s) => ({ title: '계약서', body: '중개소 사람이 계약서를 가져왔습니다. 제 이름을 적으면 가족이 세 해 겨울을 난다고 했습니다.',
      choices: [
        { k: 'sign', label: '서명한다', sub: '가족 돈 +, 노예 계약', auto: 1 },
        { k: 'no', label: '서명하지 않는다', sub: '변화 없음', auto: 1.5 }] }),
    apply: (s, k) => {
      if (k !== 'sign') return { t: '서명하지 않았습니다. 상점 사람은 종이를 접어 다음 집으로 갔습니다.', k: 'note' };
      if (s.enterTrack('KZD_SLAVE', { how: 'forced', via: 'family_protection', quiet: true })) return { t: '서명했습니다. 가족에게 건조식품 세 자루가 갔고, 저는 다음 날 떠났습니다.', k: 'bad', fx: { money: medX(s, 0.5), h: -5 } };
      return { t: '서명했지만 계약은 성사되지 않았습니다.', k: 'note' };
    },
  },
  /** 위원회 1098 — 철수 후 거취 */
  kzd_com_1098: {
    tags: ['track:KZD_COMMISSION'], once: true, at: 0.95,
    ok: (s) => !!s.S.track && s.year === 1098,
    build: (s) => ({ title: '철수', body: '런디니움에서 물러났습니다. 위원회는 해산되었고, 과도 정부가 "재교육"과 "면책"을 같이 말했습니다.',
      choices: [
        { k: 'merc', label: '용병으로 돌아간다', sub: '살카즈 용병 진로', auto: 1.5 },
        { k: 'factory', label: '훈련소에 간다', sub: '공장·언어학교 진로', auto: 1 },
        { k: 'exile', label: '나라를 떠난다', sub: '망명', auto: 0.6 }] }),
    apply: (s, k) => {
      if (k === 'merc') return s.switchTrack('KZD_MERC') ? false : { t: '팀을 찾았지만 받아 주는 곳이 없었습니다.', k: 'bad' };
      if (k === 'factory') return s.switchTrack('KZD_FACTORY') ? false : { t: '훈련소 명단에 올랐지만 자리가 없었습니다.', k: 'bad' };
      s.migrate('asylum'); return s.S.phase === 'life' ? { t: '계급장을 두고 국경을 넘었습니다. 넘은 뒤에는 장교였다는 말을 하지 않았습니다.', k: 'bad', fx: { h: -3 } } : false;
    },
  },
};

export default { events, decisions };
