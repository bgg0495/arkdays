// W4b 성인기 가족 콘텐츠: 이벤트 약 28개 · 결정 6개(구혼/수락, 자녀, 가사 전담, 다시 일터로, 부모 부양, 자녀 감염).
// 결혼·출산·부모/배우자/자녀 사망은 엔진 familyYear 가 확률로 처리한다. 여기서는 그 결과를 국가 관습으로 꾸민다.
// 담백한 "~했습니다"체(D25). 각주 f 는 세계관 안의 출처만. 콜백은 전부 ctx 첫 인자(D23).
import { makeName, familyNames } from '../src/engine/names.js';
import { initPartner, becomeHomemaker } from '../src/engine/finance.js';
import { humanAge } from '../src/engine/lifetable.js';
import { eul, iga, eun, wa, ro, ieot } from '../src/engine/text.js';
import { cul, org, fest, F, orgF, rhodesF, given, poor, rich, nomadic, lifeRoll, once, medX, jobName, faction } from './_util.js';
import { yr, hum, adult, working, homemaker, partner, kids, kidAge, pol, someone, fmtLMD } from './_adult_util.js';

const momAlive = (s) => s.S.fam.mom.alive;
const dadAlive = (s) => s.S.fam.dad.alive && !s.S.fam.dad.absent;
const sibCount = (s) => (s.S.fam.older || 0) + (s.S.fam.younger || 0);
const sinceWed = (s) => (s.S.fam.marriedAt == null ? -1 : s.S.age - s.S.fam.marriedAt);

/** 혼례 묘사(국가 관습). key = 최상위 국가, 용문·타라·극동 북조는 따로 */
const WED = {
  yan: (s) => '홍등을 걸고 양가 어른들께 차를 올렸습니다. 중매인이 사주를 맞췄다고 했고, 폭죽은 이웃이 터뜨렸습니다.',
  lungmen: (s) => '식당 2층을 빌렸습니다. 딤섬이 ' + s.rng.ri(12, 30) + '판 나왔고, 축의금 봉투는 근위국 양식처럼 반듯했습니다.',
  higashi: (s) => (s.S.sub.region === 'north' ? '가문 혼례였습니다. 술잔을 세 번 돌렸고, 상석에는 가문 어른이 앉았습니다.' : '회사 동료가 하객의 반이었습니다. 호텔 연회장에서 상사가 축사를 두 번 했습니다.'),
  ursus: (s) => '관청에 혼인을 등록하고 마을에서 잔치를 했습니다. 흑빵에 소금을 얹어 나눴고, ' + cul(s).rulerTitle + '의 초상 앞에서 사진을 찍었습니다.',
  sami: (s) => '장로가 눈 위에 룬을 그려 축복했습니다. 순록 젖을 나눠 마셨고, 사제는 "숲이 두 사람을 보고 있다"고 했습니다.',
  kjerag: (s) => '산신의 사제가 축복했고, 양가 가주의 허락장이 식탁 위에 놓였습니다. 치즈 국물이 밤새 끓었습니다.',
  leithanien: (s) => '혼례는 음악회 뒤에 이어졌습니다. 사중주가 연주했고, 하객들은 적포도주 잔을 들었습니다.',
  victoria: (s) => '공작령 등기소에서 서명했습니다. 차와 파이가 나왔고, 비가 왔습니다.',
  tara: (s) => '성당 호적부에 두 이름이 올랐습니다. 양고기 스튜와 흑맥주로 밤을 보냈고, 유목민 친척이 노래를 불렀습니다.',
  kazimierz: (s) => '감정회에 혼인을 등록했습니다. 하객석 뒤에 스폰서 광고판이 서 있었고, 사진에 그 로고가 들어갔습니다.',
  columbia: (s) => '카운티 서기 앞에서 서명했습니다. 보험협회에서 신혼부부 특약 안내서가 식장까지 왔습니다.',
  siracusa: (s) => cul(s).rulerTitle + '의 승인을 먼저 받았습니다. 그 뒤에 성당, 그 뒤에 와인. 하객 중 누가 패밀리인지 모두 알았고 아무도 말하지 않았습니다.',
  laterano: (s) => '공증인이 입회했습니다. 종이 울렸고, 선인장 타르트가 나왔습니다.',
  iberia: (s) => '재판소에 혼인을 등록했습니다. 등대 아래에서 염장 생선과 해초 술로 잔치를 했고, 해가 지기 전에 끝냈습니다.',
  aegir: (s) => '집정관 기록원에 두 사람의 결합이 기재되었습니다. 조류가 바뀌는 시각에 맞춰 잔을 들었습니다.',
  minos: (s) => '신전 사제가 올리브 가지를 두 사람 머리에 얹었습니다. 포도주는 신전 창고에서 나왔습니다.',
  sargon: (s) => '아미르령 서기가 혼인을 기록했습니다. 잔치는 사흘 동안 이어졌고 대추야자는 바닥나지 않았습니다.',
  bolivar: (s) => faction(s) + ' 등기소에 혼인을 올렸습니다. 다른 두 정부는 인정하지 않을 수도 있다고 서기가 말했습니다. 커피를 마셨습니다.',
  rim: (s) => '광업연합 인사부에 가족 수당 신청서를 냈습니다. 수박 케이크를 잘랐고, 다음 날 둘 다 출근했습니다.',
  kazdel: (s) => '용병단 동료들이 증류주를 가져왔습니다. 축사는 "아직 살아 있군" 한마디였습니다. 그것으로 충분했습니다.',
  durin: (s) => '돔 공동체 기록소에 등록했습니다. 벌꿀주 통이 셋 비었고, 이웃이 전부 왔습니다.',
};
const wedText = (s) => (WED[s.S.cur] || WED[s.S.root] || ((x) => '혼인을 ' + org(x) + '에 등록하고 잔치를 했습니다.'))(s);

/** 자녀 이름 하나(기록용) */
const kidNames = (s) => kids(s).map((k) => k.name).join(', ');

export const events = [
  // ── 결혼 ──
  { id: 'fam_wedding', a: [18, 60], w: 80, c: (s) => !!partner(s) && s.S.fam.married && sinceWed(s) <= 1 && s.S.flags.weddingTold !== s.S.fam.marriedAt,
    run: (s) => { s.S.flags.weddingTold = s.S.fam.marriedAt;
      const p = partner(s);
      // 종족 간 결혼(살카즈·에기르 배우자) 소수 롤 — 카즈델·에기르 밖에서만 시선이 따라온다
      if (!p.race && s.rng.chance(0.12) && !['kazdel', 'aegir'].includes(s.S.root)) { p.race = s.rng.pick(['sarkaz', 'aegir', 'sarkaz']); s.S.flags.mixedMarriage = p.race; }
      return { t: wa(p.name) + '의 혼례. ' + wedText(s) + (p.race === 'sarkaz' ? ' 하객 몇이 신부 쪽 뿔을 오래 쳐다봤습니다.' : p.race === 'aegir' ? ' 배우자는 바다에서 온 사람이었습니다. 하객 몇은 그 말만 기억했습니다.' : ''),
        k: 'warm', fx: { h: 3, money: -medX(s, 0.15), cap: { ties: 0.03 } }, f: orgF(s, '혼인 등기', s.year) }; } },
  { id: 'fam_newlywed', a: [19, 60], w: 25, gap: 12, c: (s) => !!partner(s) && sinceWed(s) >= 1 && sinceWed(s) <= 3,
    run: (s) => ({ t: s.rng.pick([partner(s).name + '의 코 고는 소리에 익숙해졌습니다.', '둘이 사는 집은 둘이 벌어도 좁았습니다.', eul(cul(s).food) + ' 어느 쪽 집 방식으로 할지 다퉜습니다. 반반으로 정했습니다.']), k: 'warm', fx: { h: 2, cap: { ties: 0.02 } },
      f: orgF(s, '가구 조사표') }) },
  { id: 'fam_anniversary', a: [25, 64], w: 40, c: (s) => !!partner(s) && sinceWed(s) > 0 && sinceWed(s) % 10 === 0 && s.S.flags.anniv !== sinceWed(s),
    run: (s) => { s.S.flags.anniv = sinceWed(s); const hasKids = kids(s).length > 0;
      return { t: '결혼 ' + sinceWed(s) + '년이 되었습니다. ' + s.rng.pick([wa(partner(s).name) + ' 처음 갔던 ' + cul(s).drink + ' 집에 다시 갔습니다. 주인이 바뀌어 있었습니다.', '선물은 없었고, 둘 다 기억은 하고 있었습니다.', (hasKids ? '아이들이 상을 차렸습니다. 소금이 많았습니다.' : '둘이 상을 차렸습니다. 소금은 알맞았습니다.')]), k: 'warm', fx: { h: 2, cap: { ties: 0.02 } },
        f: orgF(s, '혼인 등기 원본') }; } },
  { id: 'fam_single', a: [30, 48], w: 15, gap: 7, c: (s) => adult(s) && !partner(s) && !s.S.fam.widowed && !s.S.flags.divorced,
    run: (s) => ({ t: s.rng.pick(['친척들이 혼인 이야기를 꺼내는 횟수가 ' + fest(s) + '마다 늘었습니다.', '혼자 사는 집이 익숙해졌습니다. 조용했고, 대개는 괜찮았습니다.', '친구들 결혼식에 ' + s.rng.ri(3, 7) + '번 갔습니다. 축의금 장부는 길어졌습니다.']), k: 'note', fx: { h: s.rng.chance(0.5) ? 1 : -1 },
      f: orgF(s, '가구 조사표 1인 가구란') }) },
  { id: 'fam_divorce', a: [22, 58], w: 25, c: (s) => !!partner(s) && sinceWed(s) >= 3 && !s.S.flags.divorced && lifeRoll(s, 'div', 0.1),
    run: (s) => { const f = s.S.fam; const name = f.partner.name;
      f.partner = null; f.married = false; s.S.flags.divorced = s.S.age;
      if (s.S.money > 0) s.S.money = Math.round(s.S.money * 0.85);
      return { t: wa(name) + ' 헤어졌습니다. ' + s.rng.pick(['서류는 한 장이었습니다.', '집은 반으로 나눌 수 없어서 팔았습니다.', '아이들은 격주로 오갔습니다.']), k: 'loss', fx: { h: -6, cap: { ties: -0.04 } },
        f: orgF(s, '혼인 해소 신고', s.year) }; } },
  { id: 'fam_widow', a: [19, 64], w: 70, c: (s) => s.S.fam.widowed && !partner(s) && !s.S.flags.widowTold,
    run: (s) => { s.S.flags.widowTold = true;
      return { t: s.rng.pick(['배우자의 옷을 정리했습니다. 주머니에서 영수증 하나가 나왔습니다. ' + cul(s).food + ' 값이었습니다.', '혼자 밥을 먹는 데 ' + s.rng.ri(2, 8) + '달이 걸렸습니다.', '이름을 부르다가 멈추는 일이 몇 번 있었습니다.']), k: 'loss', fx: { h: -3 },
        f: orgF(s, '사망 신고 접수증 사본') }; } },
  { id: 'fam_mixed_gaze', a: [19, 64], w: 30, gap: 4, c: (s) => !!s.S.flags.mixedMarriage && !!partner(s),
    run: (s) => { const r = s.S.flags.mixedMarriage;
      return { t: r === 'sarkaz' ? s.rng.pick(['집주인이 계약을 갱신하지 않았습니다. 이유는 묻지 않았고, 배우자의 뿔을 보는 눈이 이유였습니다.', '아이 학교에서 "아버지 쪽 종족" 칸을 두 번 확인했습니다.', '시장에서 배우자 혼자 가면 값이 달랐습니다. 같이 가기 시작했습니다.'])
        : s.rng.pick(['이웃이 배우자가 물을 얼마나 마시는지 세었습니다.', '해안 소식이 들릴 때마다 사람들의 눈이 우리 집 쪽으로 왔습니다.', '배우자의 친정은 편지로만 왔습니다. 바다 밑에서 오는 편지였습니다.']),
        k: 'bad', fx: { h: -1, cap: { ties: -0.02 } }, f: orgF(s, '혼인 등기 비고란 종족 기재') }; } },

  // ── 출산·자녀 ──
  { id: 'fam_newborn', a: [19, 55], w: 80, c: (s) => kids(s).some((k) => kidAge(s, k) === 1 && !s.S.flags['nb_' + k.bornAt]),
    run: (s) => { const k = kids(s).find((x) => kidAge(s, x) === 1 && !s.S.flags['nb_' + x.bornAt]); s.S.flags['nb_' + k.bornAt] = true;
      const who = s.rng.pick([momAlive(s) ? '어머니' : null, dadAlive(s) ? '아버지' : null, partner(s) ? partner(s).name : null, '할머니'].filter(Boolean));
      return { t: k.name + '의 이름은 ' + iga(who) + ' 지었습니다. ' + s.rng.pick(['첫해는 아무도 제대로 자지 못했습니다.', org(s) + ' 등록은 ' + s.rng.ri(1, 6) + '주 늦었습니다.', fest(s) + '에 처음 안고 나갔습니다.']) + (k.infected ? ' 의사가 아이 손을 오래 들여다봤습니다.' : ''),
        k: 'warm', fx: { h: 3, hl: -1, cap: { ties: 0.02 } }, f: orgF(s, '출생 신고 ' + s.rng.ri(100, 9999) + '호', s.year - 1) }; } },
  { id: 'fam_kid_school', a: [24, 60], w: 40, c: (s) => kids(s).some((k) => kidAge(s, k) === 7 && !s.S.flags['ks_' + k.bornAt]),
    run: (s) => { const k = kids(s).find((x) => kidAge(s, x) === 7 && !s.S.flags['ks_' + x.bornAt]); s.S.flags['ks_' + k.bornAt] = true;
      const go = !poor(s) || s.rng.chance(0.5);
      return { t: go ? iga(k.name) + ' 학교에 들어갔습니다. ' + s.rng.pick(['가방이 아이보다 컸습니다.', '첫날 울지 않았습니다. 저는 조금 울었습니다.', '선생은 제 이름을 물었고, 아이 이름은 벌써 알고 있었습니다.']) : eun(k.name) + ' 학교에 가지 못했습니다. 학비보다 아이 손이 집에 필요했습니다.',
        k: go ? 'warm' : 'bad', fx: go ? { h: 2, money: -medX(s, 0.05) } : { h: -3 }, f: orgF(s, go ? '학령 아동 등록 명부' : '학령 아동 명부 미등록') }; } },
  { id: 'fam_kid_teen', a: [32, 64], w: 30, c: (s) => kids(s).some((k) => kidAge(s, k) === 15 && !s.S.flags['kt_' + k.bornAt]),
    run: (s) => { const k = kids(s).find((x) => kidAge(s, x) === 15 && !s.S.flags['kt_' + x.bornAt]); s.S.flags['kt_' + k.bornAt] = true;
      return { t: iga(k.name) + ' 열다섯이 되었습니다. ' + s.rng.pick(['저와 말을 안 하는 기간이 ' + s.rng.ri(2, 9) + '달 이어졌습니다.', '제 직업을 묻더니 다른 일을 하겠다고 했습니다. 맞는 말이었습니다.', '어느 날 저보다 키가 컸습니다. 날짜는 모릅니다.']), k: 'note', fx: { h: s.rng.chance(0.5) ? 1 : -1, cap: { ties: 0.01 } },
        f: orgF(s, '호적 대장 연령 기재') }; } },
  { id: 'fam_kid_leaves', a: [36, 64], w: 35, c: (s) => kids(s).some((k) => kidAge(s, k) === 19 && !s.S.flags['kl_' + k.bornAt]),
    run: (s) => { const k = kids(s).find((x) => kidAge(s, x) === 19 && !s.S.flags['kl_' + x.bornAt]); s.S.flags['kl_' + k.bornAt] = true;
      return { t: iga(k.name) + ' 집을 떠났습니다. ' + s.rng.pick(['짐은 가방 하나였습니다. 제가 떠날 때와 같았습니다.', '다른 도시로 갔습니다. 편지는 처음 석 달은 자주 왔습니다.', '떠난 방은 그대로 두었습니다. 넉 달 뒤에 창고가 되었습니다.']), k: 'note', fx: { h: 1, cap: { ties: -0.02 } },
        f: orgF(s, '전출 신고') }; } },
  { id: 'fam_kid_marries', a: [40, 64], w: 30, c: (s) => kids(s).some((k) => kidAge(s, k) >= 22 && kidAge(s, k) <= 32 && !s.S.flags['km_' + k.bornAt] && lifeRoll(s, 'km' + k.bornAt, 0.6)),
    run: (s) => { const k = kids(s).find((x) => kidAge(s, x) >= 22 && kidAge(s, x) <= 32 && !s.S.flags['km_' + x.bornAt] && s.S.flags['roll_km' + x.bornAt]); s.S.flags['km_' + k.bornAt] = true; s.S.flags.kidMarried = true;
      return { t: iga(k.name) + ' 결혼했습니다. ' + s.rng.pick(['제 혼례 때 입은 옷을 꺼냈다가 다시 넣었습니다. 맞지 않았습니다.', '상대 집안은 ' + cul(s).address + ' 호칭을 썼습니다. 저는 아직 어색했습니다.', '잔치 비용은 반을 냈습니다. 반도 적지 않았습니다.']), k: 'warm', fx: { h: 3, money: -medX(s, 0.15), cap: { ties: 0.03 } },
        f: orgF(s, '혼인 등기(자녀분)', s.year) }; } },
  { id: 'fam_grandchild', a: [42, 64], w: 30, gap: 6, c: (s) => !!s.S.flags.kidMarried,
    run: (s) => ({ t: '손주가 태어났습니다. ' + s.rng.pick(['이름 짓는 데는 끼지 못했습니다.', '제 아이가 아이를 안는 모습을 보았습니다. 서툴렀고, 저도 그랬습니다.', fest(s) + '에 처음 안아 보았습니다. 가벼웠습니다.']), k: 'warm', fx: { h: 4, cap: { ties: 0.03 } },
      f: orgF(s, '출생 신고(손주분)') }) },
  { id: 'fam_kid_infected_found', a: [20, 60], w: 70, c: (s) => kids(s).some((k) => k.infected && kidAge(s, k) >= 3 && kidAge(s, k) <= 14) && !s.S.flags.kidInfectedKnown,
    run: (s) => { const k = kids(s).find((x) => x.infected && kidAge(s, x) >= 3); s.S.flags.kidInfectedKnown = k.name; s.S.flags.kidInfectedAt = s.S.age;
      return { t: k.name + '의 검진 결과가 왔습니다. 감염이었습니다. ' + s.rng.pick(['봉투는 식탁 위에 하루 동안 그대로 있었습니다.', '아이는 봉투보다 저녁 반찬에 관심이 있었습니다.', '의사는 숫자를 적고 저를 보지 않았습니다.']), k: 'bad', fx: { h: -8, cap: { ties: -0.02 } },
        f: rhodesF('소아 광석병 진단 기준') }; } },
  { id: 'fam_kid_lost_after', a: [19, 64], w: 70, c: (s) => s.S.stats.kidsLost > (s.S.flags.kidsLostSeen || 0),
    run: (s) => { s.S.flags.kidsLostSeen = s.S.stats.kidsLost;
      return { t: s.rng.pick(['아이의 물건을 상자에 넣었습니다. 상자는 열지 않았습니다.', '이웃이 ' + eul(cul(s).food) + ' 가져왔습니다. 먹지 못했고, 버리지도 못했습니다.', '그 뒤로 한동안 ' + eul(fest(s)) + ' 지내지 않았습니다.']), k: 'loss', fx: { h: -3 },
        f: orgF(s, '사망 신고 접수증') }; } },
  { id: 'fam_childless', a: [26, 46], w: 15, gap: 9, c: (s) => !!partner(s) && !kids(s).length && sinceWed(s) >= 5,
    run: (s) => ({ t: s.rng.pick(['아이 이야기는 서로 꺼내지 않게 되었습니다.', '친척이 아이를 묻는 횟수가 ' + fest(s) + '마다 늘었습니다.', '둘이서 사는 집은 조용했고, 조용함에 익숙해졌습니다.']), k: 'note', fx: { h: -1, cap: { ties: 0.01 } },
      f: orgF(s, '가구 조사표') }) },
  { id: 'fam_dinner', a: [20, 64], w: 15, gap: 8, c: (s) => !!partner(s) || kids(s).length > 0,
    run: (s) => ({ t: fest(s) + '에 식구가 다 모였습니다. ' + s.rng.pick([iga(cul(s).food) + ' 상에 올랐습니다. 늘 같은 맛이었고, 그래서 좋았습니다.', '서로 "' + cul(s).greet + '" 하고 인사했습니다. 식구끼리 그러는 집이었습니다.', eul(cul(s).drink) + ' 한 잔씩 돌렸습니다. 아이들은 냄새만 맡았습니다.']), k: 'warm', fx: { h: 3, cap: { ties: 0.02 } },
      f: orgF(s, '명절 공휴일 고시') }) },

  // ── 배우자 ──
  { id: 'fam_partner_job', a: [20, 60], w: 15, gap: 8, c: (s) => !!partner(s),
    run: (s) => { const p = partner(s); const n = p.name;
      const i = p.works ? s.rng.pick([1, 2]) : 0;   // 0 일 시작 / 1 일터 폐업(실직) / 2 승진
      if (i === 0) p.works = true; else if (i === 1) { p.works = false; s.S.flags.partnerLostJob = s.S.age; } else p.pct = Math.min(0.98, (p.pct || 0.5) + 0.05);
      return { t: [iga(n) + ' 일을 시작했습니다. 저녁 식탁에 모르는 이름들이 올라왔습니다.', n + '의 일터가 문을 닫았습니다. 한동안 한 사람 벌이로 살았습니다.', iga(n) + ' 승진했습니다. 그날은 ' + eul(cul(s).food) + ' 사 왔습니다.'][i], k: 'note', fx: { cap: { ties: 0.01 } },
        f: orgF(s, '가구 조사표 배우자 직업란') }; } },
  { id: 'fam_partner_sick', a: [22, 64], w: 20, gap: 8, c: (s) => !!partner(s) && lifeRoll(s, 'psick', 0.5),
    run: (s) => ({ t: iga(partner(s).name) + ' 오래 아팠습니다. ' + s.rng.pick(['의사 값이 두 달치였습니다.', '제가 일을 쉬고 간병했습니다.', '회복했습니다. 전처럼은 아니었습니다.']), k: 'bad', fx: { money: -medX(s, 0.15), h: -3, hl: -1 },
      f: rhodesF('가족 간병 안내') }) },
  { id: 'fam_partner_infected', a: [19, 64], w: 70, c: (s) => !!partner(s) && partner(s).infected && !s.S.flags.partnerInfTold,
    run: (s) => { s.S.flags.partnerInfTold = true;
      return { t: iga(partner(s).name) + ' 감염 판정을 받았습니다. ' + ({ persecute: '밤에 둘이서 서류를 태웠습니다.', quarantine: '격리구역 이주 명령이 함께 왔습니다. 가족 동반란이 있었습니다.', euthanasia: '서류 마지막 줄을 둘 다 읽지 않았습니다.', insurance: '보험료 청구서가 둘 몫이 되었습니다.', neglect: '보호비 걷는 사람이 한 명 더 왔습니다.', expel: '성문까지 같이 걸어갔습니다. 저는 돌아왔습니다.', treat: '치료소에 같이 다니기 시작했습니다.' }[s.policy] || '달라진 것은 식탁의 침묵이었습니다.'),
        k: 'bad', fx: { h: -6, cap: { ties: -0.02 } }, f: orgF(s, '감염자 등록 대장(배우자분)') }; } },

  // ── 부모 ──
  { id: 'fam_parent_old', a: [25, 64], w: 20, gap: 6, c: (s) => (momAlive(s) && s.S.fam.mom.age >= 65) || (dadAlive(s) && s.S.fam.dad.age >= 65),
    run: (s) => { const who = momAlive(s) && s.S.fam.mom.age >= 65 ? '어머니' : '아버지';
      return { t: iga(who) + ' 눈에 띄게 늙었습니다. ' + s.rng.pick(['제 이름을 한 번 잘못 불렀습니다.', '같은 이야기를 두 번 했습니다. 두 번 들었습니다.', '계단에서 손을 내밀었습니다. 처음에는 거절했습니다.']), k: 'note', fx: { h: -1, cap: { ties: 0.01 } },
        f: orgF(s, '노령 부양 실태 조사') }; } },
  { id: 'fam_parent_visit', a: [20, 60], w: 12, gap: 6, c: (s) => (momAlive(s) || dadAlive(s)) && (!!s.S.mig || (nomadic(s) && yr(s, 'pvisit', 0.5))),
    run: (s) => ({ t: '부모를 보러 먼 길을 갔습니다. ' + s.rng.pick(['집은 작아졌고 부모는 더 작아졌습니다.', eul(cul(s).food) + ' 해 주었습니다. 어릴 때 맛이었습니다.', '돌아오는 길에 한 번 뒤를 봤습니다.']), k: 'warm', fx: { h: 2, money: -medX(s, 0.1), cap: { ties: 0.03 } },
      f: orgF(s, '여행 통행 기록') }) },
  { id: 'fam_mom_belongings', a: [19, 64], w: 40, c: (s) => !momAlive(s) && !s.S.flags.momBelongings,
    run: (s) => { s.S.flags.momBelongings = true;
      return { t: '어머니의 유품을 정리했습니다. ' + s.rng.pick(['옷 몇 벌과 제 어릴 때 이 하나가 종이에 싸여 있었습니다.', '서랍에서 제가 보낸 편지가 전부 나왔습니다.', cul(s).food + ' 만드는 법은 적어 두지 않았습니다. 이제 아무도 모릅니다.']), k: 'loss', fx: { h: -3 },
        f: orgF(s, '사망 신고 접수증 사본') }; } },
  { id: 'fam_dad_belongings', a: [19, 64], w: 40, c: (s) => !s.S.fam.dad.alive && !s.S.fam.dad.absent && !s.S.flags.dadBelongings,
    run: (s) => { s.S.flags.dadBelongings = true;
      return { t: '아버지의 유품을 정리했습니다. ' + s.rng.pick(['작업복 주머니에서 ' + cul(s).drink + ' 영수증이 나왔습니다.', '쓰던 도구는 제가 가졌습니다. 쓸 줄은 몰랐습니다.', '사진은 석 장이었습니다. 전부 젊었을 때였습니다.']), k: 'loss', fx: { h: -3 },
        f: orgF(s, '사망 신고 접수증 사본') }; } },

  // ── 형제 ──
  { id: 'fam_sib_feud', a: [22, 60], w: 20, c: (s) => sibCount(s) > 0 && !s.S.flags.sibFeud && lifeRoll(s, 'sibfeud', 0.4),
    run: (s) => { s.S.flags.sibFeud = s.S.age;
      return { t: '형제와 틀어졌습니다. ' + s.rng.pick(['부모 집을 누가 갖느냐였습니다.', '돈 문제였습니다. 액수는 지금 생각하면 적었습니다.', '말 한마디였습니다. 어느 쪽이 먼저였는지는 서로 다르게 기억합니다.']), k: 'bad', fx: { h: -2, cap: { ties: -0.03 } },
        f: F('기록된 바 없음') }; } },
  { id: 'fam_sib_reconcile', a: [24, 64], w: 25, c: (s) => !!s.S.flags.sibFeud && !s.S.flags.sibOk && s.S.age - s.S.flags.sibFeud >= 3,
    run: (s) => { s.S.flags.sibOk = true;
      return { t: '형제와 다시 말을 했습니다. ' + s.rng.pick(['부모의 장례에서였습니다.', fest(s) + '에 먼저 연락이 왔습니다.', '아이들이 사촌끼리 먼저 친해졌습니다.']), k: 'warm', fx: { h: 3, cap: { ties: 0.04 } },
        f: F('기록된 바 없음') }; } },
  { id: 'fam_sib_news', a: [20, 64], w: 15, gap: 8, c: (s) => sibCount(s) > 0,
    run: (s) => ({ t: '형제 소식이 왔습니다. ' + s.rng.pick(['결혼했다고 했습니다. 잔치에는 가지 못했습니다.', '다른 나라로 떠났다고 했습니다. 주소는 없었습니다.', '검진에서 걸렸다고 했습니다. 편지는 그 뒤로 짧아졌습니다.', '아이가 둘이 되었다고 했습니다.']), k: 'note', fx: { cap: { ties: 0.01 } },
      f: orgF(s, '우편 수신 대장') }) },
];

// ────────────────────────────────────────────────────────────────────────────
// 결정
// ────────────────────────────────────────────────────────────────────────────

/** 구혼 관습(국가별): title·body·수락 문구 */
function proposeStyle(s) {
  const r = s.S.root;
  if (r === 'yan' || (r === 'higashi' && s.S.sub.region === 'north')) return { title: '중매', body: '중매인이 집에 왔습니다. 상대의 집안과 생년을 적은 종이를 내놓았고, 얼굴은 종이 다음이었습니다.', yes: '혼담을 받았습니다.' };
  if (r === 'siracusa') return { title: '혼담과 승인', body: '만나는 사람이 있었습니다. 혼인하려면 ' + cul(s).rulerTitle + '의 승인이 먼저였습니다. 승인은 공짜가 아니었습니다.', yes: cul(s).rulerTitle + '의 승인을 받았습니다. 봉투 하나가 들어갔습니다.' };
  if (['laterano', 'minos', 'sami', 'iberia', 'tara', 'kjerag'].includes(r)) return { title: '축복', body: '만나는 사람이 있었습니다. ' + cul(s).ruler.split('와')[0] + ' 쪽에서 혼인의 축복을 줄 수 있다고 했습니다. 거절할 수도 있다고도 했습니다.', yes: '축복을 받았습니다.' };
  if (r === 'columbia' || r === 'kazimierz') return { title: '혼인 계약서', body: '만나는 사람이 있었습니다. 상대 쪽에서 혼인 계약서를 내밀었습니다. 조항은 ' + s.rng.ri(9, 40) + '개였고 재산 분할이 둘째 장이었습니다.', yes: '계약서에 서명했습니다.' };
  if (r === 'aegir') return { title: '배정', body: '집정관 기록원에서 결합 상대의 기록을 보내왔습니다. 적합도 수치가 적혀 있었고, 만나 본 적은 없었습니다.', yes: '배정을 받아들였습니다.' };
  if (r === 'kazdel') return { title: '같이 살기', body: '같은 용병단 사람이었습니다. 혼례라는 말은 쓰지 않았고, "다음 계약까지 같이 살자"고 했습니다.', yes: '같이 살기로 했습니다.' };
  return { title: '구혼', body: '만나는 사람이 있었습니다. 어느 저녁, 둘 중 하나가 먼저 말했습니다.', yes: '혼인하기로 했습니다.' };
}

export const decisions = {
  // (W11) 구혼 결정 adult_propose 는 제거 — 혼인은 엔진 marry_<type>(marriage.json 유형)만
  /** 자녀를 가질까(출산 자체는 엔진 롤). */
  adult_kids: {
    ok: (s) => !!partner(s) && !kids(s).length && sinceWed(s) >= 1 && hum(s) <= 40 && hum(s) >= 20,
    build: (s) => {
      const inf = s.S.ori.on || partner(s).infected;
      return { title: '아이', body: wa(partner(s).name) + ' 아이 이야기를 했습니다. ' + (inf ? '둘 중 하나가 감염자입니다. 아이가 물려받을 확률을 의사는 숫자로 말했고, 우리는 그 숫자를 다시 말하지 않았습니다.' : poor(s) ? '아이 하나에 입이 하나 늘고 손도 하나 늘 것입니다.' : '집은 아이 하나쯤 들어올 자리가 있었습니다.'),
        fact: inf ? rhodesF('출생 감염 상담 지침') : orgF(s, '출생 장려 고시'), choices: [
          { k: 'want', label: '아이를 기다린다', sub: '관계 +', auto: inf ? 1 : 2 },
          { k: 'wait', label: '몇 해 미룬다', sub: '돈 +(저축), 그래도 아이는 올 수 있습니다', auto: 1 },
          { k: 'none', label: '갖지 않기로 한다', sub: '행복 ±, 그래도 아이는 올 수 있습니다', auto: inf ? 1.5 : 0.5 }] };
    },
    apply: (s, k) => {
      s.S.flags.kidsDecided = k;
      if (k === 'want') return { t: '아이를 기다리기로 했습니다. 방 한쪽을 비웠습니다.', k: 'warm', fx: { h: 1, cap: { ties: 0.03 } }, f: F('기록된 바 없음') };
      if (k === 'wait') return { t: '몇 해 미루기로 했습니다. 그동안은 둘이 벌어 둘이 쓰기로 했습니다.', k: 'note', fx: { money: medX(s, 0.2) } };
      return { t: '갖지 않기로 했습니다. 서로에게 그 말을 다시 하지는 않았습니다.', k: 'note', fx: { h: s.rng.chance(0.5) ? 2 : -2 } };
    },
  },
  /** 가사 전담(D35). 결혼 1~3년차 또는 첫 아이 0~1세 중 먼저 오는 때 생애 한 번 묻는다. 기본 가중치 = 국가 homemakerP × 성별(남 ×0.1) */
  adult_homemaker: {
    once: false, at: 0.7,
    ok: (s) => { const p = partner(s); if (!p || homemaker(s) || !adult(s) || s.S.prison || s.S.flags.quarantined) return false;
      if (s.S.flags.hmAsked != null) return false;   // 생애 한 번만(결혼 또는 첫 아이 중 먼저 오는 쪽)
      const firstKid = kids(s).length === 1 && kidAge(s, kids(s)[0]) <= 1;
      const wed = sinceWed(s) >= 1 && sinceWed(s) <= 3;
      return wed || firstKid; },
    build: (s) => {
      const p = partner(s);
      const firstKid = kids(s).length === 1 && kidAge(s, kids(s)[0]) <= 1;
      const hp = (s.nation.homemakerP ?? 0.5) * (s.S.sex === 'F' ? 1 : 0.1) * (p.works ? 1 : 0.6);
      const cur = s.S.job ? jobName(s, s.S.job) + ' 일' : '일자리를 찾는 것';
      const body = (firstKid ? iga(kids(s)[0].name) + ' 태어났습니다. ' : '살림이 둘이 되었습니다. ')
        + (p.works ? iga(p.name) + ' 벌어 오는 돈으로 ' + (hp >= 0.6 ? '집안을 맡는 것이 이 땅에서는 흔한 일입니다.' : hp >= 0.4 ? '집안을 맡을 수도 있습니다. 이웃 절반은 그렇게 삽니다.' : '집안을 맡는 집도 있습니다. 이 땅에서는 드문 편입니다.')
          : p.name + '의 벌이는 없습니다. 집안을 맡으면 들어오는 돈이 끊깁니다.')
        + ' ' + eun(cur) + ' 어떻게 하겠습니까.';
      return { title: firstKid ? '아이와 살림' : '살림', body, fact: orgF(s, '가구 조사표 가사 전담란'),
        choices: [
          { k: 'home', label: '가사를 맡는다', sub: '본인 소득 0, 가계는 배우자 벌이. 관계 +', auto: hp },
          { k: 'work', label: s.S.job ? '일을 계속한다' : '일을 찾는다', sub: '둘이 벌어 둘이 씁니다', auto: 1 - hp }] };
    },
    apply: (s, k) => {
      const firstKid = kids(s).length === 1 && kidAge(s, kids(s)[0]) <= 1;
      s.S.flags.hmAsked = s.S.age; s.S.flags.hmAskedWhy = firstKid ? 'kid' : 'wed';
      if (k !== 'home') return { t: s.S.job ? '일을 계속하기로 했습니다. 집안일은 둘이 나눴고, 대개는 한쪽으로 기울었습니다.' : '일을 찾기로 했습니다. 집안일은 저녁에 했습니다.', k: 'note', f: orgF(s, '가구 조사표 맞벌이란') };
      becomeHomemaker(s);
      return { t: '가사를 맡았습니다. ' + s.rng.pick(['아침은 배우자보다 먼저, 저녁은 배우자보다 늦게 끝났습니다.', '장부는 제 손에 들어왔습니다. 돈은 들어오는 날보다 나가는 날이 많았습니다.', '이웃 아낙들의 이름을 한 달 만에 다 외웠습니다.']), k: 'ev', fx: { h: 1, cap: { ties: 0.02 } }, f: orgF(s, '가구 조사표 가사 전담란', s.year) };
    },
  },
  /** 가사 전담 중 사별·이혼·배우자 실직 → 다시 일터로(D35) */
  adult_backtowork: {
    once: false, gap: 3,
    ok: (s) => homemaker(s) && !s.S.prison && hum(s) < 58 && (!partner(s) || !partner(s).works),   // W14(QA B12): 60세 넘어 '첫 면접' 이 나오지 않게
    build: (s) => {
      const p = partner(s);
      const why = !p ? (s.S.fam.widowed ? '배우자가 세상을 떠났습니다.' : '혼자가 되었습니다.') : p.name + '의 벌이가 끊겼습니다.';
      const years = s.S.flags.homemakerYears || 0;
      return { title: '다시 일터로', body: why + ' 집안을 맡은 지 ' + years + '년입니다. ' + (years >= 10 ? '이력서에 적을 것이 적습니다.' : '예전 일을 기억하는 사람이 아직 있습니다.'), fact: orgF(s, '구직 알선 대장 재취업란'),
        choices: [
          { k: 'work', label: '일을 찾는다', sub: '내년부터 구직. 벌이가 줄었다면 필요합니다', auto: p ? 1.5 : 3 },
          { k: 'stay', label: '집을 지킨다', sub: kids(s).length ? '아이들 곁에. 돈 −' : '돈 −', auto: p ? 1 : 0.6 }] };
    },
    apply: (s, k) => {
      if (k !== 'work') return { t: '집을 지키기로 했습니다. 살림은 줄였습니다.', k: 'note', fx: { h: -1 } };
      if (s.S.track) s.leaveTrack('content', { quiet: true }); s.S.job = null; s.S.income = 0; s.S.flags.backToWork = s.S.age; s.S.flags.joblessYears = 0;
      return { t: '일을 찾기로 했습니다. ' + ((s.S.flags.homemakerYears || 0) >= 10 ? '첫 면접에서 햇수를 묻더니 더는 묻지 않았습니다.' : '옛 일터에 먼저 들렀습니다.'), k: 'ev', f: orgF(s, '구직 알선 대장', s.year) };
    },
  },
  /** 부모 부양 */
  adult_parent_care: {
    ok: (s) => adult(s) && s.S.age >= 25 && ((momAlive(s) && s.S.fam.mom.age >= 68) || (dadAlive(s) && s.S.fam.dad.age >= 68)),
    build: (s) => {
      const who = momAlive(s) && dadAlive(s) ? '부모' : momAlive(s) ? '어머니' : '아버지';
      const far = !!s.S.mig;
      return { title: who + ' 부양', body: iga(who) + ' 혼자 지내기 어려워졌습니다. ' + (far ? '저는 다른 나라에 있습니다.' : sibCount(s) ? '형제들은 서로를 보았습니다.' : '형제는 없습니다.'),
        fact: orgF(s, '노령 부양 실태 조사'), choices: [
          { k: 'home', label: '모신다', sub: '관계 +, 돈 −, 집이 좁아집니다', auto: far ? 0.5 : 1.5 },
          { k: 'send', label: '돈을 보낸다', sub: '돈 −(매년 조금씩)', auto: 1.5 },
          { k: 'no', label: '맡지 않는다', sub: '관계 −, 행복 −', auto: sibCount(s) ? 1 : 0.4 }] };
    },
    apply: (s, k) => {
      if (k === 'home') { s.S.flags.parentCare = 'home'; return { t: '모셨습니다. 방 하나가 부모 방이 되었고, 저녁 식탁에 옛날이야기가 돌아왔습니다.', k: 'warm', fx: { h: 1, money: -medX(s, 0.25), cap: { ties: 0.03 } }, f: orgF(s, '동거 가족 신고') }; }
      if (k === 'send') { s.S.flags.parentCare = 'send'; return { t: '매달 돈을 보내기로 했습니다. 편지는 두 달에 한 번이었습니다.', k: 'note', fx: { money: -medX(s, 0.2) } }; }
      s.S.flags.parentCare = 'no';
      return { t: '맡지 않기로 했습니다. ' + (sibCount(s) ? '형제가 맡았고, 그 뒤로 형제와 말이 줄었습니다.' : '부모는 혼자 지냈습니다.'), k: 'bad', fx: { h: -3, cap: { ties: -0.03 } }, f: F('기록된 바 없음') };
    },
  },
  /** 자녀 감염 판정 뒤 */
  adult_kid_infected: {
    ok: (s) => !!s.S.flags.kidInfectedKnown && !s.S.flags.kidInfDecided,
    build: (s) => {
      const name = s.S.flags.kidInfectedKnown;
      const p = s.policy;
      const ch = [{ k: 'report', label: '신고한다', sub: ({ persecute: '아이가 수용소로 갈 수 있습니다', quarantine: '아이는 격리구역으로. 가족도 따라갈 수 있습니다', euthanasia: '격리구역과 서류 한 장', insurance: '아이 몫 보험료가 더해집니다', neglect: '보호비가 늘어납니다', expel: '아이만 성문 밖으로 나갑니다', treat: '공공 치료소 등록' }[p] || '달라질 것은 많지 않습니다'), auto: ['treat', 'ignore', 'insurance'].includes(p) ? 2 : 0.6 }];
      if (!['treat'].includes(p)) ch.push({ k: 'hide', label: '숨긴다', sub: '긴 소매, 검진 회피. 들키면 더 나쁩니다', auto: ['persecute', 'euthanasia', 'expel'].includes(p) ? 2.5 : 1 });
      ch.push({ k: 'rhodes', label: '로도스를 찾는다', sub: '연락이 닿을지는 모릅니다', auto: 1.5 });
      return { title: '아이의 판정', body: name + '의 판정서를 두고 밤늦게까지 식탁에 앉아 있었습니다. ' + (partner(s) ? partner(s).name + '도 같이였습니다.' : '혼자였습니다.'), fact: orgF(s, '감염자 처우 규정 미성년자 조항'), choices: ch };
    },
    apply: (s, k) => {
      const S = s.S; S.flags.kidInfDecided = k;
      const name = S.flags.kidInfectedKnown;
      const p = s.policy;
      if (k === 'hide') { S.flags.kidHidden = true; return { t: '판정서를 태웠습니다. ' + name + '의 옷은 전부 긴 소매가 되었습니다.', k: 'note', fx: { h: -2 }, f: F('기록된 바 없음') }; }
      if (k === 'rhodes') {
        if (s.rng.chance(0.5)) { S.flags.kidRhodes = true; return { t: '로도스 아일랜드와 연락이 닿았습니다. ' + eun(name) + ' 몇 달에 한 번 검진을 받고 약을 가져옵니다.', k: 'warm', fx: { h: 4 }, f: rhodesF('소아 환자 등록증') }; }
        return { t: '로도스 아일랜드에 편지를 보냈습니다. 답은 오지 않았고, 아이는 그대로 자랐습니다.', k: 'note', fx: { h: -2 } };
      }
      const out = { persecute: eun(name) + ' 이송 명단에 올랐습니다. 면회는 분기에 한 번이었습니다.', quarantine: eun(name) + ' 격리구역으로 갔습니다. 가족 동반을 신청했고, 반년 뒤 허가가 났습니다.', euthanasia: eun(name) + ' 격리구역에 등록되었습니다. 서류 마지막 줄은 읽지 않았습니다.', insurance: '보험료 청구서에 ' + name + ' 몫이 더해졌습니다.', neglect: '보호비 걷는 사람이 아이 이름을 외워 갔습니다.', expel: eun(name) + ' 보호자 한 명과 함께 성문 밖으로 나가게 되었습니다. ' + (partner(s) ? iga(partner(s).name) + ' 따라갔습니다.' : '제가 따라갔고, 돌아왔습니다.'), treat: eun(name) + ' 공공 치료소에 등록되었습니다. 진행을 늦추는 약이 나옵니다.' }[p] || eun(name) + ' 등록되었습니다. 달라진 것은 없었습니다.';
      const fx = { persecute: { h: -10, cap: { ties: -0.04 } }, quarantine: { h: -6, money: -medX(s, 0.3) }, euthanasia: { h: -8 }, insurance: { money: -medX(s, 0.4) }, neglect: { money: -medX(s, 0.2) }, expel: { h: -8, cap: { ties: -0.03 } }, treat: { h: 2 } }[p] || { h: -1 };
      return { t: '신고했습니다. ' + out, k: p === 'treat' ? 'note' : 'bad', fx, f: orgF(s, '감염자 등록 대장(미성년자분)', s.year) };
    },
  },
};

export default { events, decisions };
