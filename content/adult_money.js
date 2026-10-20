// W4b 성인기 돈·생활 콘텐츠: 이벤트 약 19개 · 결정 2개(집 마련, 빚).
// 소득·가계·빚 이자·보험료·보호비·억제제 지출은 엔진 financeYear 가 처리한다. 여기서는 그 결과(음수 잔고, 미납, 재앙 피격 수)를 서사로 꾸민다.
// 담백한 "~했습니다"체(D25). 각주 f 는 세계관 안의 출처만. 콜백은 전부 ctx 첫 인자(D23).
import { eul, iga, eun, wa, ro, ieot } from '../src/engine/text.js';
import { cul, org, fest, F, orgF, rhodesF, poor, rich, nomadic, upper, under, lifeRoll, medX } from './_util.js';
import { yr, adult, working, partner, kids, fmtLMD } from './_adult_util.js';

const momGone = (s) => !s.S.fam.mom.alive;
const dadGone = (s) => !s.S.fam.dad.alive && !s.S.fam.dad.absent;
const insuranceLand = (s) => s.policy === 'insurance';

export const events = [
  // ── 빚 ──
  { id: 'money_debt_collector', a: [19, 64], w: 45, gap: 3, rep: true, c: (s) => s.S.money < 0 && (s.S.flags.debtYears || 0) >= 1,
    run: (s) => { s.S.flags.hadDebt = true;
      const who = { siracusa: '패밀리 쪽 사람', ursus: '관청 집행관', columbia: '채권 회수 회사 직원', kazimierz: '스폰서 쪽 회계사', laterano: '공증인', victoria: '공작령 집행관' }[s.S.root] || '빚쟁이';
      return { t: iga(who) + ' 찾아왔습니다. ' + s.rng.pick(['문은 열어 주었고 차는 내지 않았습니다.', '장부를 읊었습니다. 액수는 ' + ieot(fmtLMD(-s.S.money)) + '습니다.', '이웃이 다 듣도록 말했습니다. 그것이 목적이었습니다.']), k: 'bad', fx: { h: -3, so: -2 },
        f: orgF(s, '채무 등기') }; } },
  { id: 'money_debt_cleared', a: [19, 64], w: 60, c: (s) => !!s.S.flags.hadDebt && s.S.money >= 0,
    run: (s) => { s.S.flags.hadDebt = false;
      return { t: '빚을 다 갚았습니다. ' + s.rng.pick(['장부에 줄이 그어졌습니다.', '그날 저녁 ' + eul(cul(s).drink) + ' 한 잔 샀습니다. 외상이 아닌 첫 잔이었습니다.', '마지막 영수증은 액자에 넣지 않았지만 버리지도 않았습니다.']), k: 'warm', fx: { h: 5 },
        f: orgF(s, '채무 등기 소멸') }; } },
  { id: 'money_pawn', a: [19, 64], w: 25, gap: 4, c: (s) => adult(s) && s.S.money < s.med * 0.2 && poor(s),
    run: (s) => ({ t: s.rng.pick(['어머니가 남긴 것을 전당포에 맡겼습니다. 되찾지 못했습니다.', '겨울옷을 팔아 겨울을 났습니다.', '쌀을 외상으로 샀습니다. 가게 주인은 장부 대신 얼굴을 기억했습니다.']), k: 'bad', fx: { h: -2, money: medX(s, 0.04) },
      f: orgF(s, '전당 거래 대장') }) },
  { id: 'money_loan_due', a: [19, 64], w: 70, c: (s) => s.S.flags.loan != null && s.S.age - s.S.flags.loan >= 3 && !s.S.flags.loanPaid,
    run: (s) => { s.S.flags.loanPaid = true;
      return { t: '빌린 돈의 기한이 왔습니다. 이자까지 ' + fmtLMD(s.med * 1.3) + '. ' + (s.S.money > s.med * 1.3 ? '갚았습니다.' : '갚았고, 잔고가 비었습니다.'), k: 'note', fx: { money: -medX(s, 1.3), h: -1 },
        f: orgF(s, '채무 등기 변제') }; } },

  // ── 경기·물가·세금 ──
  { id: 'money_recession', a: [20, 64], w: 40, gap: 7, c: (s) => working(s) && yr(s, 'recess', 0.08),
    run: (s) => { s.S.flags.recession = s.S.age; if (s.S.money > 0) s.S.money = Math.round(s.S.money * 0.95);
      return { t: '경기가 꺾였습니다. ' + ({ columbia: '주식 전광판 앞에 사람이 모였다가 흩어졌습니다.', kazimierz: '스폰서들이 광고를 거뒀습니다. 기사들은 더 싸게 뛰었습니다.', higashi: '회사들이 사람을 줄였습니다. 거품이라는 말이 신문에 났습니다.', victoria: '공장 굴뚝 몇 개가 멈췄습니다.', yan: '광맥이 줄어든다는 소문이 값을 올렸습니다.', siracusa: '패밀리들이 보호비를 올렸습니다. 경기와 상관없이.', ursus: '배급 줄이 길어졌습니다.' }[s.S.root] || '시장의 물건값이 올랐고 임금은 그대로였습니다.'),
        k: 'bad', fx: { h: -3 }, f: orgF(s, '경기 동향 보고', s.year) }; } },
  { id: 'money_price_rise', a: [19, 64], w: 15, gap: 6, c: (s) => adult(s),
    run: (s) => ({ t: cul(s).food.split('와')[0] + ' 값이 올랐습니다. ' + s.rng.pick(['상인은 재앙 탓이라고 했습니다. 재앙은 멀리 있었습니다.', '한 끼를 줄였습니다.', '시장에 가는 횟수가 줄었습니다.']), k: 'note', fx: { money: -medX(s, 0.02) },
      f: orgF(s, '물가 고시') }) },
  { id: 'money_tax', a: [19, 64], w: 12, gap: 6, c: (s) => working(s),
    run: (s) => ({ t: ({ yan: '호부에서 세금 고지가 왔습니다. 항목은 열두 가지였고 아는 것은 셋이었습니다.', victoria: '공작령 세금이 올랐습니다. 공작이 바뀐 탓이라고 했습니다.', siracusa: '세금은 시청에, "기부"는 ' + cul(s).rulerTitle + '께. 둘 다 거절할 수 없었습니다.', columbia: '세금 신고서가 ' + s.rng.ri(8, 30) + '장이었습니다. 대행사에 맡겼고 대행비가 세금만 했습니다.', laterano: '세금은 없었습니다. 대신 헌금 봉투가 매달 왔습니다.', kazdel: '세금이라는 것은 없었습니다. 용병단이 보급품에서 떼어 갔습니다.', sargon: '아미르의 징세관이 왔습니다. 작년과 다른 사람이었고 액수도 달랐습니다.' }[s.S.root] || org(s) + '에서 세금 고지가 왔습니다. 액수는 지난해보다 조금 올랐습니다.'),
      k: 'note', fx: { money: -Math.round(s.S.income * 0.02) }, f: orgF(s, '세액 고지서', s.year) }) },
  { id: 'money_windfall', a: [20, 64], w: 10, c: (s) => adult(s) && lifeRoll(s, 'windfall', 0.25),
    run: (s) => ({ t: s.rng.pick(['길에서 지갑을 주웠습니다. 주인을 찾았고, 사례가 적지 않았습니다.', '오래 잊고 있던 빌려준 돈이 돌아왔습니다.', fest(s) + ' 추첨에 당첨되었습니다. 상품은 ' + cul(s).food + ' 1년치였고, 반은 팔았습니다.']), k: 'warm', fx: { money: medX(s, 0.4), h: 4 },
      f: F('기록된 바 없음') }) },

  // ── 감염 관련 지출(엔진 결과) ──
  { id: 'money_premium_bill', a: [19, 64], w: 40, gap: 3, rep: true, c: (s) => !!s.S.flags.oriPremium,
    run: (s) => ({ t: '감염자 특약 보험료 청구서가 왔습니다. 연 소득의 ' + Math.round(s.S.flags.oriPremium * 100) + '%. ' + s.rng.pick(['"시민 자격 유지비"라는 항목이 따로 있었습니다.', '납부 창구 직원은 친절했고 빨랐습니다.', '청구서 뒷면에 미납 시 조치가 작은 글씨로 적혀 있었습니다.']), k: 'bad', fx: { h: -2 },
      f: F(org(s) + ' 감염자 특약 약관 제' + s.rng.ri(3, 20) + '조') }) },
  { id: 'money_premium_missed', a: [19, 64], w: 70, c: (s) => (s.S.flags.premiumMissed || 0) >= 1 && s.S.flags.premiumWarnAt !== s.S.flags.premiumMissed,
    run: (s) => { s.S.flags.premiumWarnAt = s.S.flags.premiumMissed;
      return { t: '보험료를 내지 못했습니다. 경고장이 왔습니다. "다음 미납 시 거주 자격 종료." ' + s.rng.pick(['밤에 셈을 다시 했습니다. 셈은 같았습니다.', '팔 수 있는 것을 세어 보았습니다.', partner(s) ? iga(partner(s).name) + ' 일을 하나 더 잡았습니다.' : '혼자 셈을 했습니다.']), k: 'bad', fx: { h: -5 },
        f: F(org(s) + ' 감염자 특약 미납 경고 양식') }; } },
  { id: 'money_protection_fee', a: [19, 64], w: 35, gap: 3, c: (s) => !!s.S.flags.oriFees,
    run: (s) => ({ t: '보호비를 걷는 사람이 왔습니다. ' + s.rng.pick(['"보호"가 무엇으로부터인지는 묻지 않았습니다.', '액수가 올랐습니다. 이유는 "사정"이었습니다.', '이번에는 ' + cul(s).food + '도 가져갔습니다.']), k: 'bad', fx: { h: -2, so: -1 },
      f: F('기록된 바 없음') }) },

  // ── 유산·사기·운용 ──
  { id: 'money_inheritance', a: [19, 64], w: 50, c: (s) => (momGone(s) || dadGone(s)) && !s.S.flags.inherited,
    run: (s) => { s.S.flags.inherited = true;
      const q = s.S.q;
      if (q >= 3) { const amt = medX(s, (q - 2) * 0.8 / Math.max(1, (s.S.fam.older || 0) + (s.S.fam.younger || 0) + 1));
        return { t: '유산을 받았습니다. ' + fmtLMD(amt) + '. ' + s.rng.pick(['형제와 나눴습니다. 계산은 ' + org(s) + ' 서기가 했고 다툼은 저희가 했습니다.', '집은 팔았습니다. 사는 사람이 벽지를 바꾸겠다고 했습니다.', '부모의 장부에는 제가 모르는 빚도 적혀 있었습니다. 그것도 받았습니다.']), k: 'note', fx: { money: amt, h: -1 },
          f: orgF(s, '상속 등기', s.year) }; }
      return { t: '유산은 빚이었습니다. ' + fmtLMD(s.med * 0.15) + '. ' + s.rng.pick(['갚기로 했습니다. 부모의 이름이었습니다.', '장례 비용이 더 컸습니다.', '물건은 옷 몇 벌과 그릇이었고, 그릇은 지금도 씁니다.']), k: 'bad', fx: { money: -medX(s, 0.15), h: -2 },
        f: orgF(s, '상속 등기(채무 포함)', s.year) }; } },
  { id: 'money_scam', a: [20, 62], w: 20, c: (s) => adult(s) && s.S.money > s.med * 0.5 && lifeRoll(s, 'scam', 0.3),
    run: (s) => { const loss = Math.round(s.S.money * 0.1);
      return { t: '사기를 당했습니다. ' + ({ columbia: '"재앙 피해 완전 보장"이라는 보험이었습니다. 회사는 재앙보다 먼저 사라졌습니다.', kazimierz: '유망 기사의 지분이라고 했습니다. 기사는 첫 경기에서 졌고 지분은 종이였습니다.', siracusa: '패밀리 이름을 댄 사람이었습니다. 진짜 패밀리가 더 화를 냈습니다.', yan: '광맥 투자였습니다. 광맥은 있었고 제 지분은 없었습니다.', laterano: '총기 면허 대행이었습니다. 공증인은 그런 대행은 없다고 했습니다.', rim: '새 광구 채굴권이었습니다. 광업연합 지도에 그 광구는 없었습니다.', higashi: '회사 주식이었습니다. 회사는 있었고 주식은 두 번 팔린 것이었습니다.', ursus: '수용소에 간 친척을 빼내 준다는 사람이었습니다. 돈만 빠졌습니다.' }[s.S.root] || '아는 사람의 아는 사람이었습니다. 둘 다 사라졌습니다.') + ' ' + eul(fmtLMD(loss)) + ' 잃었습니다.',
        k: 'bad', fx: { money: -loss, h: -4 }, f: orgF(s, '사기 피해 신고 접수', s.year) }; } },
  { id: 'money_invest', a: [25, 62], w: 20, gap: 4, c: (s) => adult(s) && s.S.money > s.med * 3,
    run: (s) => { const win = s.rng.chance(0.6); const amt = Math.round(s.S.money * (win ? 0.1 : -0.08));
      return { t: '모아 둔 돈을 ' + ({ columbia: '기업 주식에', kazimierz: '기사단 지분에', yan: '표국 지분에', victoria: '공작령 채권에', lungmen: '물류 회사에', laterano: '총기 공방 지분에', siracusa: '와이너리에', higashi: '회사 채권에', durin: '양조장에', kjerag: '철도 채권에' }[s.S.cur] || s.S.root && ({ columbia: '기업 주식에' }[s.S.root]) || '동네 상회에') + ' 넣어 두었습니다. ' + (win ? '불었습니다. ' + fmtLMD(amt) + '.' : '줄었습니다. ' + fmtLMD(-amt) + '.'),
        k: win ? 'warm' : 'bad', fx: { money: amt, h: win ? 2 : -3 }, f: orgF(s, '자산 신고 명세', s.year) }; } },

  // ── 집·이동도시 ──
  { id: 'money_rent_plate', a: [19, 64], w: 25, gap: 5, c: (s) => nomadic(s) && !s.S.flags.homeOwner,
    run: (s) => ({ t: '플레이트 임대료가 올랐습니다. ' + (under(s) ? '지하층인데도 그랬습니다. 환기구 쪽 방으로 옮겼습니다.' : '상층 전망값이라고 했습니다. 전망은 매달 바뀌었습니다.'), k: 'bad', fx: { money: -medX(s, 0.08), h: -1 },
      f: orgF(s, '이동도시 플레이트 임대료 고시') }) },
  { id: 'money_nomad_move', a: [19, 64], w: 12, gap: 6, c: (s) => nomadic(s) && !working(s),
    run: (s) => ({ t: '이동도시가 새 좌표로 떠났습니다. ' + s.rng.pick(['창밖 풍경만 바뀌었습니다.', '정박지 상인들이 올라와 ' + cul(s).food + ' 값을 두 배로 불렀습니다.', '정착민들이 손을 흔들었습니다. 부러운 쪽이 어디인지는 늘 헷갈립니다.']), k: 'note', fx: { h: 1 },
      f: orgF(s, '이동도시 항로 고시') }) },
  { id: 'money_house_life', a: [25, 64], w: 15, gap: 6, c: (s) => !!s.S.flags.homeOwner,
    run: (s) => ({ t: s.rng.pick(['집 지붕을 고쳤습니다. 내 지붕이었습니다.', '마당에 ' + eul(s.rng.pick(['나무', '채소', '빨랫줄'])) + ' 들였습니다.', '집값이 올랐다는 말을 들었습니다. 팔 생각은 없었습니다.']), k: 'warm', fx: { h: 2, money: -medX(s, 0.05) },
      f: orgF(s, '부동산 등기') }) },

  // ── 재앙 피해 복구(엔진 catYear 결과) ──
  { id: 'money_cat_rebuild', a: [19, 64], w: 80, c: (s) => s.S.stats.catHits > (s.S.flags.catSeen || 0),
    run: (s) => { s.S.flags.catSeen = s.S.stats.catHits;
      if (insuranceLand(s)) s.S.flags.catClaim = s.S.age;
      return { t: '재앙이 지나간 자리를 치웠습니다. ' + s.rng.pick(['지붕은 새로 얹었고 벽은 그대로 두었습니다.', '이웃 셋이 떠났습니다. 둘은 돌아왔습니다.', '잔류 오리지늄 측정원이 다녀갔습니다. 수치는 말해 주지 않았습니다.']) + (s.S.flags.homeOwner ? ' 집이 있다는 것은 고칠 것이 있다는 뜻이었습니다.' : ''),
        k: 'bad', fx: { money: -medX(s, 0.08), hl: -1 }, f: F('재앙 정보 전달자 협회 피해 집계, ' + s.year + '년') }; } },
  { id: 'money_insurance_claim', a: [19, 64], w: 70, c: (s) => s.S.flags.catClaim != null && !s.S.flags.catClaimDone,
    run: (s) => { s.S.flags.catClaimDone = true; s.S.flags.catClaim = null;
      const paid = s.rng.chance(0.5);
      return { t: '재앙 피해 보험금을 청구했습니다. ' + (paid ? '석 달 뒤 ' + iga(fmtLMD(s.med * 0.4)) + ' 나왔습니다. 청구액의 반이었습니다.' : '거절되었습니다. 사유는 "약관 제' + s.rng.ri(7, 40) + '조 재앙 등급 미해당"이었습니다.'), k: paid ? 'note' : 'bad', fx: paid ? { money: medX(s, 0.4) } : { h: -3 },
        f: F(org(s) + ' 재앙 보상 약관') }; } },
];

// ────────────────────────────────────────────────────────────────────────────
// 결정
// ────────────────────────────────────────────────────────────────────────────
export const decisions = {
  adult_house: {
    ok: (s) => adult(s) && s.S.age >= 25 && s.S.age <= 45 && !s.S.flags.homeOwner && !s.S.flags.houseDecided && s.S.money > s.med * 2 && !s.S.flags.quarantined,
    build: (s) => {
      const price = medX(s, nomadic(s) ? 1.5 : 1.2);
      const ch = [];
      if (nomadic(s)) {
        ch.push({ k: 'plate', label: '플레이트를 산다', sub: '돈 −' + fmtLMD(price) + ', 도시와 함께 움직입니다', auto: s.S.money > price ? 1.5 : 0.3 });
        ch.push({ k: 'settle', label: '정착지로 내려간다', sub: '돈 −' + fmtLMD(medX(s, 0.8)) + ', 재앙에 더 노출됩니다', auto: 0.7 });
      } else {
        ch.push({ k: 'buy', label: '집을 산다', sub: '돈 −' + fmtLMD(price) + ', 행복 +', auto: s.S.money > price ? 1.5 : 0.3 });
        if (s.nation.nomadic > 0.3) ch.push({ k: 'plate_rent', label: '이동도시로 올라간다', sub: '임대. 재앙은 피하고 임대료는 매년', auto: 0.6 });
      }
      ch.push({ k: 'rent', label: '지금처럼 산다', sub: '변화 없음', auto: 1 });
      return { title: '집', body: '모은 돈이 ' + fmtLMD(s.S.money) + '입니다. ' + (nomadic(s) ? '지금은 플레이트 ' + (under(s) ? '지하층' : '상층') + ' 임대입니다.' : '지금은 ' + (poor(s) ? '부모 집 곁방' : '세 들어 사는 집') + '입니다.') + (partner(s) ? ' ' + eun(partner(s).name) + ' 집 이야기를 자주 꺼냈습니다.' : ''),
        fact: orgF(s, '부동산 등기 수수료 고시'), choices: ch };
    },
    apply: (s, k) => {
      s.S.flags.houseDecided = k;
      if (k === 'buy' || k === 'plate') { s.S.flags.homeOwner = true; s.S.money -= medX(s, k === 'plate' ? 1.5 : 1.2);
        return { t: k === 'plate' ? '플레이트 한 칸을 샀습니다. 등기에는 "구동부 위 ' + s.rng.ri(3, 40) + '구역"이라고 적혔습니다.' : '집을 샀습니다. 문이 삐걱거렸고, 제 문이었습니다.', k: 'big', fx: { h: 5, so: 1 }, f: orgF(s, '부동산 등기', s.year) }; }
      if (k === 'settle') { s.S.home = { type: 'settled', deck: 'ground' }; s.S.money -= medX(s, 0.8); s.S.flags.homeOwner = true;
        return { t: '정착지로 내려갔습니다. 땅이 흔들리지 않는 것이 처음에는 어색했습니다.', k: 'ev', fx: { h: 2 }, f: orgF(s, '정주 전입 신고', s.year) }; }
      if (k === 'plate_rent') { s.S.home = { type: 'nomadic', deck: rich(s) ? 'upper' : 'under' }; s.S.money -= medX(s, 0.5);
        return { t: '이동도시로 올라갔습니다. 첫 이동 날 그릇이 전부 떨어졌습니다.', k: 'ev', fx: { h: 1 }, f: orgF(s, '이동도시 전입 신고', s.year) }; }
      return { t: '지금처럼 살기로 했습니다. 돈은 서랍에 두었습니다.', k: 'note', f: F('기록된 바 없음') };
    },
  },
  adult_debt: {
    gap: 8,
    ok: (s) => adult(s) && s.S.age >= 22 && s.S.age <= 55 && s.S.money < s.med * 0.3 && s.S.money >= 0 && s.S.flags.loan == null && yr(s, 'debt', 0.35),
    build: (s) => {
      const lender = { siracusa: '패밀리 쪽 사람', columbia: '대부 회사', kazimierz: '스폰서 회계사', ursus: '관청 저축소', laterano: '공증소 대부', victoria: '공작령 은행', yan: '전장(錢莊)', lungmen: '전장' }[s.S.cur] || { siracusa: '패밀리 쪽 사람' }[s.S.root] || '마을 대부업자';
      return { title: '빚', body: '잔고가 ' + fmtLMD(s.S.money) + '입니다. ' + iga(lender) + ' 중위소득 한 해치를 빌려주겠다고 했습니다. 기한은 3년, 이자는 셋에 하나.',
        fact: orgF(s, '대부 등기 요건'), choices: [
          { k: 'take', label: '빌린다', sub: '지금 돈 +, 3년 뒤 1.3배 상환', auto: 1 },
          { k: 'no', label: '버틴다', sub: '건강 −', auto: 1.2 }] };
    },
    apply: (s, k) => {
      if (k === 'take') { s.S.flags.loan = s.S.age; return { t: '빌렸습니다. 서명란에는 보증인 칸이 있었고, ' + (partner(s) ? partner(s).name + '의 이름을 적었습니다.' : '비워 두었습니다.'), k: 'note', fx: { money: medX(s, 1) }, f: orgF(s, '대부 등기', s.year) }; }
      return { t: '빌리지 않았습니다. 겨울에 난로를 덜 피웠습니다.', k: 'note', fx: { hl: -3, h: -1 }, f: F('기록된 바 없음') };
    },
  },
};

export default { events, decisions };
