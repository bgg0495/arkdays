// W4a 공통 유년·학창기 콘텐츠(0~18세): 이벤트 약 45개 · 결정 10개.
// 규칙: 담백한 "~했습니다"체(D25). 각주 f 는 세계관 안의 출처만. 무거운 주제는 장면 없이 결과만.
//       반복 이벤트는 gap 3년 이상. 콜백은 전부 ctx 첫 인자(D23). 태그·플래그는 src/engine/README.md.
import { diagnose } from '../src/engine/oripathy.js';
import { takeJob } from '../src/engine/finance.js';
import { makeName, familyNames } from '../src/engine/names.js';
import { clamp } from '../src/engine/rng.js';
import {
  cul, org, fest, F, orgF, rhodesF, given, momName, dadName, dadHere, momHere, poor, rich, nomadic, upper, under,
  artsTop, artsLow, sibs, youngest, dadJob, momJob, once, lifeRoll, medX, eul, iga, eun, wa, ro, ieot, rago,
} from './_util.js';

// ────────────────────────────────────────────────────────────────────────────
// 이벤트
// ────────────────────────────────────────────────────────────────────────────
export const events = [
  // ── 0~2세 ──
  { id: 'birth_register', a: [0, 0], w: 30,
    run: (s) => {
      const bm = s.S.bm;
      const late = s.rng.chance(poor(s) ? 0.4 : 0.1);
      return { t: org(s) + '에 출생이 등록되었습니다.' + (late ? ' 신고는 석 달 늦었습니다. 벌금은 ' + cul(s).food + ' 한 끼 값이었습니다.' : ''), k: 'note',
        f: orgF(s, '호적 대장 ' + bm + '월분', s.year) };
    } },
  { id: 'name_given', a: [0, 1], w: 20,
    run: (s) => {
      const who = s.rng.pick([dadHere(s) ? '아버지' : '어머니', '할머니', '마을 어른', momHere(s) ? '어머니' : '이웃']);
      return { t: given(s) + '. ' + iga(who) + ' 지어 준 이름입니다. ' + (s.rng.chance(0.5) ? '뜻은 묻는 사람마다 다르게 말했습니다.' : '같은 이름이 동네에 둘 더 있었습니다.'), k: 'note',
        f: orgF(s, '작명 신고서') };
    } },
  { id: 'night_cry', a: [0, 1], w: 25, gap: 3,
    run: (s) => ({ t: '밤마다 울었습니다. ' + momName(s) + (momHere(s) ? '는 자장가를 ' + s.rng.ri(3, 9) + '곡 외우게 되었습니다.' : '의 자장가는 기억에 남지 않았습니다.'), k: 'ev', fx: { so: 1 },
      f: rhodesF('육아 소책자 「첫해의 밤」') }) },
  { id: 'kid_fever', a: [0, 5], w: 40, gap: 3,
    c: (s) => s.rng.chance(Math.min(0.6, 0.06 + s.nation.stats.u5 * 2.5) * [1.4, 1.2, 1, 0.8, 0.6][s.S.q - 1]),
    run: (s) => {
      const bad = s.rng.chance(0.3);
      return { t: bad ? '열병을 앓았습니다. 사흘 동안 아무것도 먹지 못했습니다. 의사는 오지 않았고, 열은 저절로 내렸습니다.' : '열이 났습니다. 이웃이 알려 준 약초를 달여 먹고 이틀 만에 나았습니다.',
        k: 'bad', fx: { hl: bad ? -5 : -2 }, f: rhodesF('연보 「유아 열병과 생존」') };
    } },
  { id: 'first_step', a: [1, 2], w: 25,
    run: (s) => ({ t: '첫걸음을 뗐습니다. ' + s.rng.pick(['넘어졌고, 다시 섰습니다.', '세 걸음 만에 식탁 다리를 붙잡았습니다.', '아무도 보지 않을 때였습니다. 어머니는 믿지 않았습니다.']), k: 'warm', fx: { h: 2, hl: 1 },
      f: F(org(s) + ' 발달 기록표 1항') }) },
  { id: 'first_word', a: [1, 3], w: 25,
    run: (s) => {
      const w = s.rng.pick(['엄마', '아빠', '밥', '싫어', '더', cul(s).drink.split(' ')[0]]);
      return { t: '첫말은 ' + ieot('"' + w + '"') + '습니다.' + (w === '싫어' ? ' 그 뒤로 자주 썼습니다.' : ''), k: 'warm', fx: { sm: 1, so: 1 }, f: F(org(s) + ' 발달 기록표 2항') };
    } },
  { id: 'born_infected_check', a: [1, 9], tags: ['born_infected'], w: 30, gap: 3,
    run: (s) => ({ t: '정기 검진에서 혈중 결정 밀도를 재었습니다. ' + s.S.ori.uL.toFixed(2) + ' u/L. 의사는 숫자를 적고 아무 말도 하지 않았습니다.', k: 'note', fx: { h: -1 },
      f: rhodesF('소아 광석병 관찰 지침') }) },
  { id: 'miner_dust', a: [2, 12], tags: ['miner_family'], w: 25, gap: 4,
    run: (s) => ({ t: (dadHere(s) ? '아버지' : '어머니') + '의 작업복에서 늘 검은 가루가 떨어졌습니다. 집 안의 모든 것이 그 가루를 조금씩 머금었습니다.', k: 'note', fx: { hl: -2 },
      f: rhodesF('광산 가정 분진 조사') }) },

  // ── 2~6세 ──
  { id: 'sibling_born', a: [1, 10], w: 40, gap: 3,
    c: (s) => s.S.fam.younger > sibs(s).length,
    run: (s) => {
      const sex = s.rng.chance(0.512) ? 'M' : 'F';
      const name = makeName(s.data, s.rng, { lang: s.nation.nameLang, sex, race: s.S.race, avoid: familyNames(s.S) }).given;
      s.S.fam.sibs.push({ name, sex, bornAt: s.S.age, alive: true });
      return { t: '동생이 태어났습니다. ' + name + '. ' + s.rng.pick(['처음에는 반갑지 않았습니다.', '안아 보라는 말에 도망쳤습니다.', '울음소리가 집을 채웠습니다.']), k: 'warm', fx: { so: 2, h: -1 },
        f: orgF(s, '호적 대장 추가 기재', s.year) };
    } },
  { id: 'grandparent_visit', a: [2, 9], w: 25,
    c: (s) => lifeRoll(s, 'grand', 0.7),
    run: (s) => { s.S.flags.grandAlive = true;
      return { t: '할머니가 ' + fest(s) + '에 맞춰 찾아왔습니다. ' + eul(cul(s).food) + ' 해 주었고, 옛날이야기는 끝이 없었습니다.', k: 'warm', fx: { so: 3, h: 2 },
        f: F(cul(s).food + ' 조리법은 ' + org(s) + ' 어디에도 등록되어 있지 않습니다') }; } },
  { id: 'grandparent_loss', a: [5, 15], w: 20, c: (s) => !!s.S.flags.grandAlive,
    run: (s) => { s.S.flags.grandAlive = false;
      return { t: '할머니가 세상을 떠났습니다. 장례는 ' + s.rng.pick(['사흘', '하루', '이레']) + ' 동안 이어졌습니다. 어른들이 우는 것을 처음 보았습니다.', k: 'loss', fx: { h: -4, so: -2 },
        f: orgF(s, '사망 신고 접수증') }; } },
  { id: 'festival_first', a: [3, 7], w: 25,
    run: (s) => {
      const f = fest(s, 0);
      return { t: eul(f) + ' 처음으로 기억합니다. ' + s.rng.pick(['어른들이 "' + cul(s).greet + '" 하고 서로 인사했습니다.', iga(cul(s).food) + ' 상에 올랐습니다.', '새 옷을 입었고, 하루 종일 벗지 않았습니다.']), k: 'warm', fx: { h: 3, so: 1 },
        f: F(org(s) + ' 명절 공휴일 고시') };
    } },
  { id: 'festival_teen', a: [12, 18], w: 12, gap: 4,
    run: (s) => {
      const f = fest(s);
      return { t: f + '에 가족이 모였습니다. ' + s.rng.pick(['어른들은 ' + eul(cul(s).drink) + ' 마시며 ' + cul(s).ruler + ' 이야기를 했습니다.', '친척 하나가 빈자리였습니다. 아무도 이유를 말하지 않았습니다.', '올해는 ' + iga(cul(s).food) + ' 작년보다 적었습니다.']), k: 'ev', fx: { so: 2 },
        f: F(org(s) + ' 명절 공휴일 고시') };
    } },
  { id: 'playmate', a: [3, 6], w: 30, c: (s) => lifeRoll(s, 'pm', 0.7),
    run: (s) => ({ t: '골목에서 또래를 만났습니다. 이름보다 별명을 먼저 알았습니다.', k: 'warm', fx: { so: 3, h: 2 } }) },
  { id: 'explore', a: [4, 8], w: 15,
    run: (s) => ({ t: s.rng.pick(['혼자 집을 나가 길을 잃었습니다. 해가 지기 전에 찾았습니다.', nomadic(s) ? '이동도시의 아래 갑판까지 내려갔습니다. 소리가 다르게 들렸습니다.' : '마을 끝 담장 너머까지 가 보았습니다. 아무것도 없었습니다.', '다락에서 ' + (dadHere(s) ? '아버지' : '어머니') + '의 낡은 기록장을 찾았습니다. 읽을 수는 없었습니다.']), k: 'ev', fx: { sm: 2, hl: -1 },
      f: F(org(s) + ' 미아 신고 접수 ' + s.rng.ri(1, 3) + '건') }) },
  { id: 'dad_absent_letter', a: [4, 12], w: 25, gap: 4, c: (s) => s.S.fam.dad.absent,
    run: (s) => ({ t: s.rng.pick(['아버지에게서 편지가 왔습니다. 발신지는 적혀 있지 않았습니다.', '아버지 이야기를 물었습니다. 어머니는 대답 대신 ' + eul(cul(s).food) + ' 더 담아 주었습니다.', '아버지를 안다는 사람이 다녀갔습니다. 돈을 조금 두고 갔습니다.']), k: 'note', fx: { h: -1, so: 1 },
      f: orgF(s, '가족 관계 등록부에는 아버지 칸이 비어 있습니다') }) },
  { id: 'tutor', a: [4, 9], w: 25, c: (s) => rich(s),
    run: (s) => ({ t: '가정교사가 왔습니다. 글자와 숫자, 그리고 ' + cul(s).rulerTitle + '께 인사하는 법을 배웠습니다.', k: 'ev', fx: { sm: 4, h: -1, money: -medX(s, 0.1) }, f: F(org(s) + ' 교사 등록 명부') }) },
  { id: 'ration_line', a: [4, 12], w: 25, gap: 4, c: (s) => poor(s),
    run: (s) => ({ t: '배급 줄에 ' + wa(momHere(s) ? '어머니' : '어른') + ' 함께 섰습니다. ' + s.rng.ri(2, 5) + '시간 뒤 ' + cul(s).food.split('와')[0].split('과')[0] + ' 조금을 받았습니다.', k: 'bad', fx: { h: -2, hl: -1 },
      f: orgF(s, '구호 배급 장부') }) },
  { id: 'cat_drill', a: [4, 14], w: 25, gap: 4, c: (s) => s.nation.catFreq >= 2,
    run: (s) => ({ t: nomadic(s) ? '플레이트 분리 훈련이 있었습니다. 경보 소리에 맞춰 손잡이를 잡고 서는 법을 배웠습니다.' : '재앙 대피 훈련이 있었습니다. 지하 대피소까지 ' + s.rng.ri(4, 15) + '분. 어른들은 그 시간을 매년 적어 두었습니다.', k: 'ev', fx: { sm: 1 },
      f: F('재앙 정보 전달자 협회 대피 지침 제' + s.rng.ri(2, 9) + '판') }) },
  { id: 'forecaster_visit', a: [5, 16], w: 20, gap: 4, c: (s) => s.nation.catFreq >= 2,
    run: (s) => ({ t: s.rng.pick(['재앙 정보 전달자가 마을에 와서 하늘을 가리키며 설명했습니다. 어른들은 그가 떠난 뒤에야 떠들었습니다.', '재앙 정보 전달자의 예보가 벽에 붙었습니다. 글자보다 그림이 많았고, 아이들이 먼저 읽었습니다.', '전달자가 틀렸다는 말이 돌았습니다. 재앙은 예보보다 하루 늦게, 옆 마을로 갔습니다.']), k: 'note', fx: { sm: 1 },
      f: F('재앙 정보 전달자 협회 순회 기록') }) },
  { id: 'domestic', a: [5, 15], w: 15, c: (s) => dadHere(s) && lifeRoll(s, 'domestic', poor(s) ? 0.3 : 0.1),
    run: (s) => { s.S.flags.hardHome = true;
      return { t: '집에서 맞는 날이 있었습니다. 이웃은 알았고, 모르는 척했습니다.', k: 'bad', fx: { h: -5, so: -2, hl: -1 },
        f: orgF(s, '가정 내 사건 접수 대장에는 해당 주소가 없습니다') }; } },

  // ── 학교 ──
  { id: 'first_day', a: [7, 8], tags: ['school'], w: 40,
    run: (s) => ({ t: '학교 첫해였습니다. ' + s.rng.pick(['선생님은 이름을 세 번 다시 물었습니다.', '교실에 ' + s.rng.ri(18, 60) + '명이 있었습니다.', '첫날 울었고, 둘째 날은 울지 않았습니다.']), k: 'ev', fx: { sm: 2, so: 1 },
      f: orgF(s, '학령 아동 등록 명부', s.year) }) },
  { id: 'school_friend', a: [7, 15], tags: ['school'], w: 25, gap: 4,
    run: (s) => ({ t: s.rng.pick(['짝이 된 아이와 친해졌습니다. 도시락을 나눠 먹었습니다.', '친구가 생겼습니다. 집에 데려가자 어머니가 ' + eul(cul(s).food) + ' 내놓았습니다.', '학교 끝나고 같이 걷는 아이가 생겼습니다. 길이 길어졌습니다.']), k: 'warm', fx: { so: 3, h: 2 },
      f: F('출석부 비고란') }) },
  { id: 'good_teacher', a: [8, 14], tags: ['school'], w: 20, c: (s) => lifeRoll(s, 'gt', 0.6),
    run: (s) => ({ t: '좋은 선생님을 만났습니다. 질문을 해도 혼내지 않았고, 모르는 것은 모른다고 말했습니다.', k: 'warm', fx: { sm: 4, h: 2 },
      f: F(org(s) + ' 교원 명부에 평범한 이름으로 적혀 있습니다') }) },
  { id: 'exam', a: [13, 17], tags: ['school'], w: 20, gap: 3,
    run: (s) => {
      const good = s.rng.chance(clamp(0.3 + (s.S.st.sm - 50) / 100, 0.1, 0.9));
      return { t: good ? '시험을 잘 보았습니다. 성적표를 가족이 돌려 보았습니다.' : '시험을 망쳤습니다. 성적표는 책 사이에 끼워 두었습니다.', k: good ? 'warm' : 'bad', fx: good ? { h: 3, sm: 1 } : { h: -3 },
        f: F(org(s) + ' 학력 평가 기준표') };
    } },
  { id: 'book', a: [8, 15], w: 15, gap: 4, c: (s) => (s.S.school || s.S.q >= 3) && lifeRoll(s, 'book', 0.6),
    run: (s) => ({ t: s.rng.pick(['책 한 권을 밤새 읽었습니다. 제목은 잊었고, 결말은 기억합니다.', '옛 전쟁 이야기책을 읽었습니다. 지도에서 그 나라를 찾아보았습니다.', cul(s).ruler + ' 이야기책을 읽었습니다. 삽화의 얼굴이 어른들이 말하는 것과 달랐습니다.']), k: 'ev', fx: { sm: 3 },
      f: F(org(s) + ' 금서 목록에는 없는 책이었습니다') }) },
  { id: 'no_school_kid', a: [7, 13], w: 25, gap: 4, c: (s) => s.S.flags.noSchool && !s.S.job,
    run: (s) => ({ t: s.rng.pick(['또래가 학교 가는 길을 담 너머로 보았습니다.', '집안일을 했습니다. 글자는 간판에서 조금씩 배웠습니다.', '동네 아이에게 글자를 배웠습니다. 값으로 ' + eul(cul(s).food.split('와')[0].split('과')[0]) + ' 나눠 주었습니다.']), k: 'note', fx: { sm: 1, h: -1 },
      f: orgF(s, '학령 아동 명부 미등록') }) },
  { id: 'working_child_day', a: [9, 14], tags: ['working_child'], w: 35, gap: 3,
    run: (s) => {
      const hurt = s.rng.chance(0.3);
      return { t: hurt ? '작업장에서 다쳤습니다. 하루 쉬고 다시 나갔습니다.' : '하루 ' + s.rng.ri(9, 13) + '시간을 일했습니다. 품삯은 어른의 절반이었습니다.', k: 'bad', fx: hurt ? { hl: -4, h: -2 } : { hl: -2, h: -2, money: medX(s, 0.02) },
        f: orgF(s, '노동 대장에는 나이 칸이 없습니다') };
    } },

  // ── 또래·사회 ──
  { id: 'teased_outsider', a: [6, 16], tags: ['outsider'], w: 25, gap: 4,
    run: (s) => ({ t: rago(s.race.name) + ' 놀림을 받았습니다. ' + s.rng.pick(['처음에는 울었고, 나중에는 세었습니다.', '귀 모양을 두고 한 말이었습니다.', '선생님은 못 들은 척했습니다.']), k: 'bad', fx: { so: -3, h: -2 },
      f: orgF(s, '종족 분포표에서 ' + eun(s.race.name) + ' 기타 항목입니다') }) },
  { id: 'teased_sarkaz', a: [6, 18], tags: ['sarkaz', '!kazdel'], w: 30, gap: 3,
    run: (s) => ({ t: s.rng.pick(['뿔 때문에 가게에서 쫓겨났습니다. 이유는 묻지 않았습니다.', '살카즈라는 말을 욕처럼 쓰는 아이가 있었습니다. 어른한테 배운 말이었습니다.', '어머니는 외출할 때 뿔을 가리는 모자를 쓰게 했습니다.']), k: 'bad', fx: { so: -3, h: -3 },
      f: orgF(s, '거주 종족 명부에 살카즈 칸은 별지로 되어 있습니다') }) },
  { id: 'infected_neighbor', a: [6, 16], w: 20, gap: 5, c: (s) => s.nation.oriExp >= 2 && !s.S.ori.known,
    run: (s) => ({ t: s.rng.pick(['옆집에 감염자가 산다는 말이 돌았습니다. 그 집 아이는 더 이상 골목에 나오지 않았습니다.', '이웃 아주머니 손등에 검은 결정이 보였습니다. 어머니는 인사만 하고 지나갔습니다.', '감염자 이웃이 이사를 갔습니다. 밤에, 수레 하나로.']), k: 'note', fx: { h: -2 },
      f: orgF(s, '감염자 신고 접수 대장') }) },
  { id: 'arts_first', a: [6, 14], w: 25, c: (s) => s.S.arts >= 0.3 && !s.S.flags.artsNoticed,
    run: (s) => { s.S.flags.artsNoticed = s.S.age;
      const top = artsTop(s);
      return { t: top ? '손끝에서 오리지늄 가루가 빛났습니다. 어른들이 한참 쳐다보았습니다.' : '화가 났을 때 유리잔이 저절로 떨렸습니다. 아무도 보지 못했습니다.', k: top ? 'big' : 'ev', fx: { sm: 2 },
        f: F(org(s) + ' 아츠 적성 등급표 ' + (top ? '갑' : '을') + '급') }; } },
  { id: 'arts_low_note', a: [8, 14], w: 15, c: (s) => artsLow(s) && !s.S.flags.artsLowNoted,
    run: (s) => { s.S.flags.artsLowNoted = true;
      return { t: '아츠 수업에서 유닛이 반응하지 않았습니다. 선생님은 "드문 일은 아니다"라고 했습니다.', k: 'note', fx: { h: -1 }, f: F(org(s) + ' 아츠 적성 등급표 병급') }; } },
  { id: 'hobby_progress', a: [9, 17], w: 12, gap: 3, c: (s) => !!s.S.flags.hobby,
    run: (s) => {
      const h = s.S.flags.hobby;
      const m = {
        draw: ['그림을 벽에 붙였습니다. 어머니가 떼지 않았습니다.', { h: 3 }],
        run: ['동네 달리기에서 ' + s.rng.ri(1, 4) + '등을 했습니다.', { hl: 3, h: 1 }],
        read: ['책을 ' + s.rng.ri(10, 40) + '권 읽었습니다. 아무도 세지 않았습니다.', { sm: 3 }],
        craft: ['만든 물건을 처음으로 팔았습니다. ' + cul(s).food.split('와')[0].split('과')[0] + ' 값이었습니다.', { sm: 1, money: medX(s, 0.01) }],
        music: ['골목에서 노래를 불렀습니다. 창문이 하나 열렸습니다.', { so: 2, h: 2 }],
        arts: ['아츠 연습으로 촛불을 켰습니다. 손이 조금 떨렸습니다.', { sm: 2, hl: -1 }],
      }[h] || ['취미에 시간을 썼습니다.', { h: 1 }];
      return { t: m[0], k: 'warm', fx: m[1], f: F('취미는 ' + org(s) + ' 신고 대상이 아닙니다') };
    } },
  { id: 'street_show', a: [6, 14], tags: ['urban'], w: 15, gap: 4, c: (s) => lifeRoll(s, 'show', 0.5),
    run: (s) => ({ t: '거리 공연을 보았습니다. 모자에 동전을 넣었고, 공연자는 눈을 맞췄습니다.', k: 'warm', fx: { h: 2, money: -1 }, f: F(org(s) + ' 노상 공연 허가증 번호 ' + s.rng.ri(100, 999)) }) },
  { id: 'harvest_help', a: [7, 14], tags: ['rural'], w: 20, gap: 4,
    run: (s) => ({ t: '수확을 도왔습니다. 허리가 아팠고, 저녁은 많았습니다.', k: 'ev', fx: { hl: 1, so: 1, h: 1 }, f: orgF(s, '농사 작황 보고') }) },
  { id: 'first_terminal_rich', a: [8, 14], tags: ['nomadic_upper'], w: 25, c: (s) => rich(s) && !s.S.flags.terminal,
    run: (s) => { s.S.flags.terminal = s.S.age;
      return { t: '첫 단말기를 받았습니다. 상층부 아이들끼리만 쓰는 통신망이 있었습니다.', k: 'warm', fx: { so: 2, sm: 1, h: 2 }, f: F(s.nation.name + ' 이동도시 통신국 가입 약관') }; } },
  { id: 'nomad_move_kid', a: [3, 18], tags: ['nomadic'], w: 15, gap: 5,
    run: (s) => ({ t: s.rng.pick(['이동도시가 새 좌표로 떠났습니다. 창밖 풍경만 바뀌었습니다.', '도시가 움직이는 날이었습니다. 컵 속 ' + iga(cul(s).drink) + ' 한쪽으로 기울었습니다.', '도시가 멈춘 곳에 황야가 있었습니다. 어른들은 나가지 말라고 했고, 아이들은 울타리까지만 갔습니다.']), k: 'note', fx: { h: 1 },
      f: F(s.nation.name + ' 이동도시 운항국 항로 공고') }) },
  { id: 'plate_transfer', a: [7, 14], tags: ['nomadic'], w: 20,
    run: (s) => ({ t: '살던 플레이트가 분리되어 다른 구역에 붙었습니다. 학교와 친구가 한 번에 바뀌었습니다.', k: 'ev', fx: { so: -3, h: -2, sm: 1 }, f: F(s.nation.name + ' 이동도시 운항국 플레이트 재배치 공고') }) },
  { id: 'parent_job_loss', a: [6, 16], w: 8, c: (s) => lifeRoll(s, 'pjl', 0.35) && ((dadHere(s) && s.S.fam.dad.job) || s.S.fam.mom.job),
    run: (s) => { const who = dadHere(s) && s.S.fam.dad.job ? '아버지' : '어머니';
      return { t: iga(who) + ' 일자리를 잃었습니다. 집 안이 조용해졌고, 식탁이 작아졌습니다.', k: 'bad', fx: { h: -3, money: -medX(s, 0.15) }, f: orgF(s, '실직 신고 접수증') }; } },
  { id: 'school_screening', a: [8, 17], tags: ['school', 'infected', '!known'], w: 30, gap: 3, c: (s) => s.nation.oriExp >= 2,
    run: (s) => {
      if (s.rng.chance(0.35)) { diagnose(s, 'exam'); return { t: '학교 정기 검진이 있었습니다. 결과 통지서는 봉해져 집으로 왔습니다.', k: 'note', f: orgF(s, '학생 정기 검진 규정') }; }
      return { t: '학교 정기 검진이 있었습니다. 줄이 길어 혈액 검사는 다음 해로 미뤄졌습니다.', k: 'note', f: orgF(s, '학생 정기 검진 규정') };
    } },

  // ── 10대 ──
  { id: 'puberty', a: [12, 15], w: 25, c: (s) => lifeRoll(s, 'pub', 0.6),
    run: (s) => ({ t: s.rng.pick(['키가 한 해에 손가락 길이만큼 자랐습니다. 옷이 전부 짧아졌습니다.', '목소리가 바뀌었습니다. 집에서 말을 줄였습니다.', '거울을 오래 보게 되었습니다.']), k: 'ev', fx: { hl: 1, h: -1 }, f: rhodesF('소책자 「성장기」') }) },
  { id: 'first_love', a: [14, 18], w: 12, c: (s) => lifeRoll(s, 'love', 0.65),
    run: (s) => ({ t: s.rng.pick(['처음으로 누군가를 좋아하게 되었습니다. 말은 하지 못했습니다.', '편지를 썼고, 보내지 않았습니다.', '같은 길로 돌아가는 사람이 생겼습니다.']), k: 'warm', fx: { h: 4, so: 2 }, f: F('기록된 바 없음') }) },
  { id: 'friend_leaves', a: [10, 17], w: 15, c: (s) => s.S.st.so >= 45 && lifeRoll(s, 'fl', 0.5),
    run: (s) => ({ t: s.rng.pick(['가장 가까운 친구가 이사를 갔습니다. 편지는 두 번 오고 끊겼습니다.', '친구 집이 ' + (nomadic(s) ? '다른 플레이트로' : '다른 도시로') + ' 떠났습니다. 주소를 적은 종이는 잃어버렸습니다.']), k: 'loss', fx: { so: -4, h: -3 }, f: orgF(s, '전출 신고 대장') }) },
  { id: 'part_time', a: [14, 17], tags: ['urban'], w: 20, gap: 3, c: (s) => s.S.q <= 3 && !s.S.job,
    run: (s) => ({ t: s.rng.pick(['방과 후 ' + cul(s).food.split('와')[0].split('과')[0] + ' 가게에서 일했습니다.', '새벽 배달을 했습니다. 거리를 외웠습니다.', '짐을 나르는 일을 했습니다. 손이 굵어졌습니다.']), k: 'ev', fx: { money: medX(s, 0.03), hl: -1, sm: 1 }, f: orgF(s, '소년 노동 신고서(제출되지 않음)') }) },
  { id: 'elder_story', a: [8, 15], w: 8, gap: 4, c: (s) => lifeRoll(s, 'elder', 0.5),
    run: (s) => ({ t: '동네 노인이 옛 전쟁 이야기를 해 주었습니다. 끝은 늘 "그래도 그때가 나았다"였습니다.', k: 'note', fx: { sm: 2 }, f: F(org(s) + ' 공식 연표와는 연도가 ' + s.rng.ri(2, 20) + '년 다릅니다') }) },
  { id: 'world_news', a: [12, 18], w: 10, gap: 3,
    c: (s) => s.year >= 1094 && lifeRoll(s, 'news', 0.6),
    run: (s) => {
      const y = s.year;
      const items = [];
      if (y >= 1094 && y <= 1098 && s.S.root !== 'victoria') items.push('빅토리아 수도 런디니움이 봉쇄되었다는 소식이 들렸습니다.');
      if (y >= 1096 && y <= 1097 && s.S.root !== 'ursus') items.push('우르수스 체르노보그가 재앙으로 사라졌다고 했습니다. 지도에서 이름이 지워졌습니다.');
      if (y >= 1097 && y <= 1098 && s.S.root !== 'yan') items.push('용문에서 감염자들이 봉기했다는 이야기가 신문 한 귀퉁이에 났습니다.');
      if (y >= 1098 && y <= 1099 && s.S.root !== 'victoria') items.push('타라가 독립을 선언했다고 했습니다. 어른들은 지도를 꺼내 어디인지 찾았습니다.');
      if (y >= 1101 && s.S.cur !== 'kjerag') items.push('쉐라그에 첫 재앙이 왔다고 했습니다. 설산에도 재앙이 온다는 것을 그때 알았습니다.');
      const told = s.S.flags.newsTold || (s.S.flags.newsTold = []);
      const fresh = items.filter((t) => !told.includes(t));
      if (!fresh.length) fresh.push(s.rng.pick(['먼 나라 소식이 신문에 났습니다. 이름을 발음할 수 없는 도시였습니다.', '신문 국제면에 이동도시 충돌 사고가 났습니다. 사망자 수는 두 신문이 달랐습니다.', '어느 나라 왕이 바뀌었다고 했습니다. 어른들은 거기 왕이 있었는지도 몰랐습니다.']));
      const pick = s.rng.pick(fresh); told.push(pick);
      return { t: pick, k: 'note', fx: { sm: 1 }, f: F(s.rng.pick(['용문 신문 국제면', '컬럼비아 통신사 전신', '카시미어 중계 자막', '행상인의 말'])) };
    } },
  { id: 'coming_of_age', a: [16, 18], w: 25,
    run: (s) => ({ t: '성년 의식을 치렀습니다. ' + s.rng.pick([cul(s).drink + ' 첫 잔을 받았습니다.', cul(s).elder + '들 앞에서 이름을 말했습니다.', org(s) + '에서 성인 등록증을 받았습니다. 사진은 마음에 들지 않았습니다.']), k: 'warm', fx: { h: 2, so: 2 },
      f: orgF(s, '성인 등록 대장', s.year) }) },
  { id: 'career_talk', a: [14, 17], w: 20,
    run: (s) => {
      const who = dadHere(s) ? '아버지' : '어머니';
      const job = dadHere(s) ? dadJob(s) : momJob(s);
      return { t: iga(who) + ' 앞날을 물었습니다. ' + s.rng.pick(['"' + ro(job) + ' 살지는 말라"고 했습니다.', '대답 대신 ' + eul(cul(s).food) + ' 먹었습니다.', '처음으로 어른처럼 이야기했습니다.']), k: 'ev', fx: { so: 2, sm: 1 }, f: F('가족 회의록은 작성되지 않았습니다') };
    } },
  { id: 'under_deck_kid', a: [5, 15], tags: ['nomadic_under'], w: 20, gap: 4,
    run: (s) => ({ t: s.rng.pick(['하층 갑판은 늘 기관 소리가 났습니다. 조용한 밤이 더 무서웠습니다.', '상층부 아이가 떨어뜨린 물건을 주웠습니다. 돌려주지 않았습니다.', '환기구 앞 자리를 두고 아이들끼리 다퉜습니다.']), k: 'note', fx: { hl: -1, so: 1 },
      f: F(s.nation.name + ' 이동도시 하층 거주 등록증') }) },
  { id: 'known_child', a: [6, 17], tags: ['known', '!camp'], w: 25, gap: 3,
    run: (s) => ({ t: s.rng.pick(['감염자라는 것이 알려진 뒤 아이들이 옆에 앉지 않았습니다.', '약을 사러 가는 날이 정해졌습니다. 그날은 학교에 가지 않았습니다.', '손목의 결정을 긴 소매로 가렸습니다. 여름에도.']), k: 'bad', fx: { so: -3, h: -2 },
      f: rhodesF('소아 감염자 생활 지침') }) },
  { id: 'camp_child', a: [5, 17], tags: ['camp'], w: 40, gap: 3,
    run: (s) => ({ t: s.rng.pick(['수용소에서 한 해를 보냈습니다. 또래는 몇 명 있었고, 줄어들었습니다.', '수용소 작업은 아이에게도 배당되었습니다. 할당량은 어른의 절반이었습니다.']), k: 'bad', fx: { hl: -3, h: -3 },
      f: orgF(s, '수용소 수용 인원 보고에는 나이 분포가 없습니다') }) },
];

// ────────────────────────────────────────────────────────────────────────────
// 결정
// ────────────────────────────────────────────────────────────────────────────
const SPECIAL15 = {
  // 국가 특수 진로(D26). job 이면 바로 취업, school 이면 상급 학교 진학에 플래그, uni 면 대학 예약
  yan: { k: 'academy', label: '학궁 시험', sub: '관료의 길. 합격하면 대학까지', mode: 'exam', flag: 'academy', job: null },
  lungmen: { k: 'lgd', label: '근위국 학교', sub: '18세에 근위국 경관', mode: 'school', flag: 'lgdCadet' },
  higashi: { k: 'dojo', label: '가문 수련', sub: '무사 가문의 길', mode: 'school', flag: 'dojo', c: (s) => s.S.sub.region === 'north' },
  higashi_s: { k: 'company', label: '회사 견습', sub: '남조식. 바로 일하기', mode: 'job', job: 'shopkeeper', c: (s) => s.S.sub.region !== 'north' },
  ursus: { k: 'cadet', label: '제1군단 유년학교', sub: '18세에 입대 확정', mode: 'school', flag: 'cadet', c: (s) => s.S.sex === 'M' || s.nation.conscriptSex === 'all' },   // D33
  sami: { k: 'priest', label: '눈의 사제 견습', sub: '부족의 점복과 예언', mode: 'job', job: 'snowpriest', c: (s) => s.S.flags.snowApprentice || s.S.arts >= 0.5 },
  sami_w: { k: 'warrior', label: '부족 전사', sub: '사냥과 경계', mode: 'job', job: 'tribal_warrior', c: (s) => !(s.S.flags.snowApprentice || s.S.arts >= 0.5) },
  kjerag: { k: 'karlan', label: '카란 무역 견습', sub: '산 아래 상회로', mode: 'job', job: 'karlan_trader' },
  leithanien: { k: 'conserv', label: '음악원', sub: '18세까지. 음악가의 길', mode: 'school', flag: 'conservatory', c: (s) => !artsLow(s) },
  victoria: { k: 'factory', label: '공장', sub: '공작령 공장. 바로 일하기', mode: 'job', job: 'factory_worker' },
  tara: { k: 'militia', label: '방위군', sub: '마을을 지키는 일', mode: 'job', job: 'defence_militia' },
  kazimierz: { k: 'knight', label: '기사 연습생', sub: '기사단 입단', mode: 'job', job: 'knight_trainee' },
  columbia: { k: 'lab', label: '연구소 인턴', sub: '대학까지 가는 길', mode: 'uni', flag: 'labIntern' },
  siracusa: { k: 'famiglia', label: '패밀리', sub: '심부름부터', mode: 'job', job: 'famiglia' },
  laterano: { k: 'notary', label: '공증소 수습', sub: '대학까지. 공증인의 길', mode: 'uni', flag: 'notaryTrainee' },
  iberia: { k: 'inquis', label: '재판소 수습', sub: '18세까지. 재판관의 길', mode: 'school', flag: 'inquisitionTrainee' },
  aegir: { k: 'consul', label: '집정관 배정', sub: '적성에 따라 직무가 정해집니다', mode: 'job', job: 'consul_assigned' },
  minos: { k: 'athlete', label: '운동선수', sub: '힘노이의 지혜 출전', mode: 'job', job: 'athlete' },
  sargon: { k: 'caravan', label: '오아시스 상단', sub: '사막을 건너는 일', mode: 'job', job: 'caravan' },
  bolivar: { k: 'merc', label: '용병', sub: '가장 벌이가 좋은 일', mode: 'job', job: 'mercenary' },
  rim: { k: 'mine', label: '광산 입사', sub: '광업연합 정규 광부', mode: 'job', job: 'ori_miner' },
  kazdel: { k: 'warcrow', label: '용병단', sub: '보급병부터', mode: 'job', job: 'warcrow' },
  durin: { k: 'brew', label: '양조장', sub: '벌꿀주 통을 굴리는 일', mode: 'job', job: 'brewer' },
};
function specialsFor(s) {
  const out = [];
  for (const [key, sp] of Object.entries(SPECIAL15)) {
    const nid = key.split('_')[0];
    if (nid !== s.S.cur && nid !== s.S.root) continue;
    if (sp.c && !sp.c(s)) continue;
    out.push(sp);
  }
  return out;
}

/** 12세 상급 학교 합격 확률: 국가 교육 수준(소득)·분위·지식 */
function lsecP(s) {
  const st = s.nation.stats;
  return clamp(0.3 + st.ppp / 6000 + (s.S.q - 3) * 0.1 + (s.S.st.sm - 60) / 200, 0.05, 0.95);
}


export const decisions = {
  temper: {
    ok: (s) => s.S.age === 2,
    build: (s) => ({ title: '두 살', body: given(s) + '의 기질이 드러나기 시작했습니다. 어떤 아이였습니까.', fact: orgF(s, '영유아 발달 기록표 비고란'),
      choices: [
        { k: 'cur', label: '호기심', sub: '학식 +, 손에 닿는 것은 다 열어 봅니다', auto: 1 },
        { k: 'act', label: '활달함', sub: '건강 +, 앉아 있는 날이 없습니다', auto: 1 },
        { k: 'warm', label: '다정함', sub: '연줄 +, 우는 아이 옆에 가서 앉습니다', auto: 1 },
        { k: 'grit', label: '끈기', sub: '행복 +, 한 번 잡은 것은 놓지 않습니다', auto: 1 }] }),
    apply: (s, k) => { s.S.trait = k; const fx = { cur: { sm: 3 }, act: { hl: 3 }, warm: { so: 3 }, grit: { h: 3 } }[k]; return { t: '기질이 자리 잡았습니다.', fx, f: orgF(s, '발달 기록표 3항') }; },
  },
  hobby7: {
    ok: (s) => s.S.age === 7,
    build: (s) => {
      const ch = [
        { k: 'draw', label: '그림', sub: '행복 +', auto: 1 },
        { k: 'run', label: '달리기', sub: '건강 +', auto: 1 },
        { k: 'read', label: '책', sub: '학식 +', auto: s.S.school ? 1.2 : 0.5 },
        { k: 'craft', label: '손으로 만들기', sub: '학식 +, 가끔 돈', auto: 1 },
      ];
      if (s.nation.id === 'leithanien' || s.rng.chance(0.4)) ch.push({ k: 'music', label: '노래', sub: '연줄 +', auto: 0.8 });
      if (s.S.arts >= 0.3) ch.push({ k: 'arts', label: '아츠 연습', sub: '학식 +, 건강 −, 감염 위험 조금', auto: artsTop(s) ? 1.5 : 0.6 });
      return { title: '일곱 살', body: '혼자 있는 시간에 손이 가는 것이 생겼습니다.', fact: F('취미는 ' + org(s) + ' 신고 대상이 아닙니다'), choices: ch };
    },
    apply: (s, k) => { s.S.flags.hobby = k; const fx = { draw: { h: 2 }, run: { hl: 2 }, read: { sm: 2 }, craft: { sm: 1 }, music: { so: 2 }, arts: { sm: 1 } }[k]; return { t: '취미가 생겼습니다.', fx, f: F('기록된 바 없음') }; },
  },
  infected_friend: {
    ok: (s) => s.S.age >= 7 && s.S.age <= 12 && s.nation.oriExp >= 2 && !s.S.ori.known && s.rng.chance(0.25),
    build: (s) => ({ kind: 'small', title: '그 집 아이', body: '감염자라고 소문난 집 아이가 같이 놀자고 했습니다. 어른들은 가지 말라고 했습니다.', fact: rhodesF('소책자 「광석병은 함께 놀아서 옮지 않습니다」'), def: 'play',
      choices: [{ k: 'play', label: '같이 놀기', sub: '연줄 +, 어른들 눈총', auto: 1 }, { k: 'avoid', label: '피하기', sub: '행복 −', auto: 1 }] }),
    apply: (s, k) => k === 'play' ? { t: '같이 놀았습니다. 아무 일도 일어나지 않았습니다. 어머니는 손을 세 번 씻게 했습니다.', k: 'warm', fx: { so: 3, h: 1 }, f: rhodesF('소책자 「광석병은 함께 놀아서 옮지 않습니다」') }
      : { t: '피했습니다. 그 아이는 그 뒤로 부르지 않았습니다.', k: 'note', fx: { h: -2 }, f: F('기록된 바 없음') },
  },
  bully: {
    ok: (s) => s.S.age >= 8 && s.S.age <= 13 && s.S.school && s.rng.chance(0.3 + 0.15 * s.race.stigma + (s.S.eth === 'outsider' ? 0.15 : 0)),
    build: (s) => ({ title: '괴롭힘', body: '학교에서 괴롭히는 아이가 있었습니다. 이유는 ' + s.rng.pick(['종족', '옷', '말투', '없었습니다. 그냥 그랬습니다.']).replace(/\.$/, '') + '.', fact: F(org(s) + ' 학교 규율에 괴롭힘 항목은 없습니다'),
      choices: [
        { k: 'fight', label: '맞선다', sub: '건강 −, 행복 +', auto: 1 },
        { k: 'avoid', label: '피한다', sub: '연줄 −', auto: 1 },
        { k: 'tell', label: '선생님께 말한다', sub: '선생님에 따라 다릅니다', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'fight') return s.rng.chance(0.5) ? { t: '맞섰습니다. 코피가 났고, 그 뒤로 건드리지 않았습니다.', k: 'ev', fx: { hl: -2, h: 3, so: 1 }, f: F('양호실 기록') } : { t: '맞섰습니다. 졌습니다. 그래도 다음 날 학교에 갔습니다.', k: 'bad', fx: { hl: -3, h: 1 }, f: F('양호실 기록') };
      if (k === 'tell') return s.S.flags['ev_good_teacher'] != null || s.rng.chance(0.4) ? { t: '선생님께 말했습니다. 선생님이 조용히 해결했습니다.', k: 'warm', fx: { so: 2, h: 2 }, f: F('교무 일지') } : { t: '선생님께 말했습니다. "너도 잘못이 있겠지"라는 대답을 들었습니다.', k: 'bad', fx: { h: -3, so: -1 }, f: F('교무 일지에는 기재되지 않았습니다') };
      return { t: '피해 다녔습니다. 학교 가는 길이 길어졌습니다.', k: 'note', fx: { so: -2, h: -1 }, f: F('기록된 바 없음') };
    },
  },
  terminal: {
    ok: (s) => s.S.age >= 10 && s.S.age <= 14 && upper(s) && !s.S.flags.terminal && s.S.q <= 3,
    build: (s) => ({ kind: 'small', title: '단말기', body: '반 아이들은 거의 다 단말기를 가지고 있었습니다. 부모에게 사 달라고 할지 망설였습니다.', fact: F(s.nation.name + ' 이동도시 통신국 가입 약관'), def: 'ask',
      choices: [{ k: 'ask', label: '조른다', sub: '돈 −, 연줄 +', auto: 1 }, { k: 'skip', label: '참는다', sub: '행복 −', auto: 1 }] }),
    apply: (s, k) => { if (k === 'ask') { s.S.flags.terminal = s.S.age; return { t: '중고 단말기를 받았습니다. 화면에 금이 하나 있었습니다.', k: 'warm', fx: { so: 2, money: -medX(s, 0.08) }, f: F(s.nation.name + ' 이동도시 통신국 가입 약관') }; }
      return { t: '사 달라고 하지 않았습니다. 친구 것을 가끔 빌려 썼습니다.', k: 'note', fx: { h: -1 }, f: F('기록된 바 없음') }; },
  },
  arts_test: {
    ok: (s) => s.S.age === 11 && artsTop(s),
    build: (s) => ({ title: '아츠 적성 검사', body: '검사 결과가 왔습니다. 상위 등급이었습니다. 담당자는 수련 과정 등록을 권했습니다.', fact: F(org(s) + ' 아츠 적성 등급표 갑급 통지서'),
      choices: [
        { k: 'enroll', label: '수련 등록', sub: '학식 +, 15세에 캐스터 과정 우선', auto: 1.5 },
        { k: 'wait', label: '미룬다', sub: '변화 없음', auto: 1 }] }),
    apply: (s, k) => { if (k === 'enroll') { s.S.flags.casterPrep = true; return { t: '기초 아츠 수련에 등록했습니다. 주말이 사라졌습니다.', k: 'ev', fx: { sm: 3, h: -1 }, f: F(org(s) + ' 아츠 수련 등록증') }; }
      return { t: '통지서는 서랍에 넣어 두었습니다.', k: 'note', f: F('기록된 바 없음') }; },
  },
  school12: {
    ok: (s) => s.S.age === 12 && s.S.school === 'prim',
    build: (s) => {
      const p = lsecP(s);
      const ch = [
        { k: 'go', label: '상급 학교 시험', sub: '합격 가능성 약 ' + Math.round(p * 100) + '%', auto: 2 },
        { k: 'work', label: '집안을 돕는다', sub: '학교 끝. 돈 +, 학식 −', auto: poor(s) ? 1.5 : 0.5 },
      ];
      if (rich(s)) ch.push({ k: 'private', label: '사립 학교', sub: '돈이 들지만 확실합니다', auto: 1.5 });
      return { title: '열두 살', body: '초등 과정이 끝납니다. ' + org(s) + ' 학제상 상급 학교는 시험을 치러야 합니다.', fact: orgF(s, '학제 규정 제' + s.rng.ri(3, 12) + '조'), choices: ch };
    },
    apply: (s, k) => {
      const S = s.S;
      const pass = k === 'private' || (k === 'go' && s.rng.chance(lsecP(s)));
      if (k === 'private') S.money -= medX(s, 0.4);
      if (k === 'work') { S.school = null; S.eduEnd = 12; return { t: '학교를 마쳤습니다. 집안일을 맡았습니다.', k: 'ev', fx: { sm: -1, so: 1 }, f: orgF(s, '학령 아동 명부 말소') }; }
      if (pass) { S.school = 'lsec'; S.edu = 2; S.eduEnd = 15; return { t: k === 'private' ? '사립 학교에 들어갔습니다. 교복이 비쌌습니다.' : '시험에 붙었습니다. 상급 학교에 들어갔습니다.', k: 'warm', fx: { h: 3, sm: 2 }, f: orgF(s, '상급 학교 입학 명부', s.year) }; }
      S.school = null; S.eduEnd = 12;
      return { t: '시험에 떨어졌습니다. 학교는 여기까지였습니다.', k: 'bad', fx: { h: -4 }, f: orgF(s, '상급 학교 입학 명부에 이름이 없습니다') };
    },
  },
  school15: {
    ok: (s) => s.S.age === 15 && s.S.school === 'lsec', at: 0.55,
    build: (s) => {
      const ch = [{ k: 'usec', label: '진학', sub: '18세까지 상급 학교', auto: 1.5 }, { k: 'work', label: '취업', sub: '바로 일하기', auto: poor(s) ? 1.5 : 0.8 }];
      if (s.S.q >= 3 || s.S.money > s.med * 3) ch.push({ k: 'uni', label: '대학까지', sub: '22세까지. 돈이 듭니다', auto: rich(s) ? 1.5 : 0.7 });
      if (artsTop(s) || s.S.flags.casterPrep) ch.push({ k: 'caster', label: '아츠 수련 과정', sub: '20세까지. 캐스터의 길', auto: s.S.flags.casterPrep ? 2.5 : 1.5 });
      for (const sp of specialsFor(s)) ch.push({ k: sp.k, label: sp.label, sub: sp.sub, auto: (sp.k === 'knight' && s.S.flags.knightTrial) || (sp.k === 'priest' && s.S.flags.snowApprentice) ? 2.5 : 1 });
      return { title: '열다섯', body: '중등 과정이 끝납니다. ' + org(s) + '에서 진로 신고서가 왔습니다. 칸은 하나만 채울 수 있습니다.', fact: orgF(s, '진로 신고서 양식 ' + s.rng.ri(1, 9) + '호'), choices: ch };
    },
    apply: (s, k) => {
      const S = s.S;
      const f = orgF(s, '진로 신고서 접수', s.year);
      if (k === 'usec') { S.school = 'usec'; S.eduEnd = 18; return { t: '상급 학교에 진학했습니다.', f }; }
      if (k === 'uni') { S.school = 'usec'; S.eduEnd = 18; S.flags.uniPlanned = true; S.money -= medX(s, 0.5); return { t: '대학까지 가기로 했습니다. 등록금 예치금을 냈습니다.', f }; }
      if (k === 'caster') { S.school = 'caster'; S.eduEnd = 20; return { t: '아츠 수련 과정에 들어갔습니다.', f }; }
      if (k === 'work') { S.school = null; S.eduEnd = 15; return { t: '학교를 마치고 일을 찾기로 했습니다.', f }; }
      const sp = Object.values(SPECIAL15).find((x) => x.k === k);
      if (!sp) { S.school = null; S.eduEnd = 15; return { t: '학교를 마쳤습니다.', f }; }
      if (sp.mode === 'job') { S.school = null; S.eduEnd = 15; S.flags[sp.k + 'Path'] = true; takeJob(s, sp.job, true); return { t: sp.label + '의 길로 들어섰습니다. ' + ro(s.data.jobById[sp.job].name) + ' 일을 시작했습니다.', k: 'big', f }; }
      if (sp.mode === 'exam') {
        const pass = s.rng.chance(clamp(0.25 + (S.st.sm - 60) / 150 + (S.q - 3) * 0.08, 0.05, 0.9));
        if (pass) { S.school = 'usec'; S.eduEnd = 18; S.flags.uniPlanned = true; S.flags[sp.flag] = true; return { t: '학궁 시험에 붙었습니다. 관료의 길이 열렸습니다.', k: 'big', fx: { h: 4 }, f: orgF(s, '학궁 입학 방(榜)', s.year) }; }
        S.school = 'usec'; S.eduEnd = 18;
        return { t: '학궁 시험에 떨어졌습니다. 보통 상급 학교에 진학했습니다.', k: 'bad', fx: { h: -3 }, f: orgF(s, '학궁 입학 방에 이름이 없습니다') };
      }
      S.school = 'usec'; S.eduEnd = 18; S.flags[sp.flag] = true;
      if (sp.mode === 'uni') S.flags.uniPlanned = true;
      return { t: sp.label + ' 과정에 들어갔습니다.', k: 'big', f };
    },
  },
  oridiag: {
    ok: (s) => !!s.S.flags.oriDiagPending,
    build: (s) => {
      const o = s.S.flags.oriOutcome;
      const child = s.S.age < 18;
      const pol = s.S.flags.oriPolicy;
      const ch = [{ k: 'accept', label: child ? '신고한다' : '받아들이기', sub: child ? '부모가 ' + org(s) + '에 신고합니다' : '지금 처분대로 삽니다', auto: 1 }];
      if (o !== 'camp' && o !== 'expel' && o !== 'execute') ch.push({ k: 'hide', label: '숨긴다', sub: '들키면 더 나쁩니다', auto: (pol === 'persecute' || (s.S.cur === 'higashi' && s.S.sub.region === 'north')) ? 2 : 1 });
      const body = child
        ? iga(momHere(s) ? '어머니' : dadHere(s) ? '아버지' : '보호자') + ' 판정서를 받았습니다. 밤늦게까지 식탁에 앉아 있었습니다. 가족은 어떻게 하기로 했습니까.'
        : '판정서를 받았습니다. 어떻게 하시겠습니까.';
      return { title: '판정 이후', body, fact: orgF(s, '감염자 처우 규정 ' + ({ persecute: '수용·추방 조항', quarantine: '격리구역 이주 조항', euthanasia: '격리 및 단계별 조치 조항', neglect: '보호 명목 징수 조항', insurance: '특약 보험료 조항', expel: '즉시 출국 조항', treat: '공공 치료소 등록 조항', ignore: '해당 조항 없음' }[pol] || '해당 조항 없음')), choices: ch };
    },
    apply: (s, k) => {
      const S = s.S; S.flags.oriDiagPending = false;
      const child = S.age < 18;
      if (k === 'hide') { S.flags.oriHidden = true; S.flags.quarantined = false; S.flags.noMove = false; return { t: child ? '가족은 판정서를 태웠습니다. 긴 소매와 장갑이 늘었습니다.' : '기록을 숨기고 평소처럼 살기로 했습니다.', k: 'note', f: F('기록된 바 없음') }; }
      return { t: child ? '가족은 신고하기로 했습니다. 서류에 부모의 서명이 들어갔습니다.' : '받아들였습니다.', k: 'note', f: orgF(s, '감염자 등록 대장', s.year) };
    },
  },
  draft18: {
    ok: (s) => s.S.age === 18 && s.nation.conscript === 'draft' && !s.S.served && !s.S.serving && !s.S.prison && !(s.S.ori.known && s.S.ori.stage >= 2)
      && (s.nation.conscriptSex === 'all' || s.S.sex === 'M'),   // D33: 기본 남성만
    build: (s) => {
      const army = { ursus: '제1군단', yan: '병부', victoria: '공작령 연대', leithanien: '여황 친위 연대', kazimierz: '국경 기사단 보조대', higashi: '막부군', aegir: '방위 함대', minos: '도시 방위대', sargon: '아미르 친위대' }[s.S.root] || s.nation.name + ' 국군';
      const war = !!s.S.flags.war;
      const cadet = !!s.S.flags.cadet;
      return { title: '징집 통지', body: army + '에서 복무 통지서가 왔습니다.' + (war ? ' 전시입니다. 거부할 수 없습니다.' : cadet ? ' 유년학교 출신은 바로 배치됩니다.' : ' 통지서 뒷면에 면제 조항이 작게 적혀 있었습니다.'), fact: F(s.nation.name + ' 병무 조례 제' + s.rng.ri(2, 19) + '조'),
        choices: war || cadet ? [{ k: 'serve', label: '입대' }] : [
          { k: 'serve', label: '입대', sub: '3년', auto: 3 },
          { k: 'dodge', label: '기피', sub: '들키면 투옥', auto: 0.7 },
          { k: 'pay', label: '면제 비용', sub: '중위소득 1.5년치', auto: s.S.money > s.med * 2 ? 1 : 0.2 }] };
    },
    apply: (s, k) => {
      const S = s.S;
      if (k === 'serve') { S.serving = 3; S.job = null; S.school = null; return { t: '입대했습니다. ' + eun(cul(s).food) + ' 당분간 먹지 못합니다.', f: F(s.nation.name + ' 병무 조례 입영 확인서') }; }
      if (k === 'pay') { S.money -= medX(s, 1.5); return { t: '면제 비용을 냈습니다. 영수증에는 "기부"라고 적혀 있었습니다.', k: 'note', f: F(s.nation.name + ' 병무 조례 면제 조항') }; }
      S.flags.dodger = true;
      if (s.rng.chance(0.3)) { S.prison = 'jail'; S.prisonLeft = 1; S.money -= medX(s, 0.5); return { t: '기피하다 붙잡혀 1년을 복역했습니다.', k: 'bad', f: F(s.nation.name + ' 병무 조례 기피 처벌 조항') }; }
      return { t: '통지서를 모른 척했습니다. 두 번째 통지서는 오지 않았습니다.', k: 'note', f: F('기록된 바 없음') };
    },
  },
};

export default { events, decisions };
