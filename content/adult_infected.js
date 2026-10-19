// W4b 성인기 감염 생활 콘텐츠: 이벤트 약 22개 · 결정 3개(숨긴 감염 신고, 로도스 제안, 억제제).
// 감염·진행·진단·정책 분기(수용소·격리·안락사 통지·보험·보호비·추방)와 발각·3기 실직은 엔진 oripathy 가 처리하고 플래그를 세운다.
// 여기서는 그 뒤의 일상을 서술한다. 무거운 주제는 장면 없이 결과만(D25). 각주는 세계관 안의 출처만. 콜백은 ctx 첫 인자(D23).
import { applyPolicy } from '../src/engine/oripathy.js';
import { eul, iga, eun, wa, ro } from '../src/engine/text.js';
import { cul, org, fest, F, orgF, rhodesF, poor, rich, nomadic, under, artsTop, lifeRoll, medX } from './_util.js';
import { yr, adult, working, partner, kids, pol, fmtLMD } from './adult_work.js';

const known = (s) => s.S.ori.on && s.S.ori.known;
const hidden = (s) => known(s) && !!s.S.flags.oriHidden;
const uL = (s) => s.S.ori.uL.toFixed(2);

export const events = [
  // ── 감염은 됐지만 모르는 동안 ──
  { id: 'inf_unknown_fatigue', a: [19, 64], tags: ['infected', '!known'], w: 25, gap: 4,
    run: (s) => ({ t: s.rng.pick(['몸이 자주 무거웠습니다. 나이 탓이라고 했습니다. 스물몇에.', '손끝이 가끔 저렸습니다. 일이 많아서라고 생각했습니다.', '밤에 열이 났다가 아침에 내렸습니다. 의사에게는 가지 않았습니다.']), k: 'note', fx: { hl: -1 },
      f: rhodesF('소책자 「조기 증상은 대개 무시된다」') }) },
  { id: 'ori_rumor_adult', a: [19, 64], w: 12, gap: 6, c: (s) => s.nation.oriExp >= 2 && !known(s),
    run: (s) => ({ t: s.rng.pick(['이웃이 어느 날 사라졌습니다. 격리구역으로 갔다는 소문이었습니다.', '시장 입구에 검진 천막이 섰습니다. 사람들이 돌아서 갔습니다.', '길에서 소매를 걷어 보라는 순찰이 있었습니다. 저는 걷었고, 앞사람은 걷지 못했습니다.']), k: 'note', fx: { h: -2 },
      f: orgF(s, '감염자 등록 월보') }) },

  // ── 숨기는 삶 ──
  { id: 'inf_hidden_sleeves', a: [19, 64], w: 45, gap: 3, rep: true, c: (s) => hidden(s),
    run: (s) => ({ t: s.rng.pick(['여름에도 긴 소매를 입었습니다. 아무도 묻지 않았고, 그것이 더 무서웠습니다.', '장갑을 벗지 않는 사람으로 알려졌습니다. 그 정도면 괜찮았습니다.', '결정이 비치는 자리를 분으로 덮었습니다. 매일 아침 ' + s.rng.ri(5, 20) + '분이 들었습니다.']), k: 'note', fx: { h: -2 },
      f: F('기록된 바 없음') }) },
  { id: 'inf_hidden_checkup', a: [19, 64], w: 30, gap: 4, c: (s) => hidden(s),
    run: (s) => ({ t: s.rng.pick(['사업장 정기 검진 날 앓아누웠습니다. 셋째 해였습니다.', '검진표에 다른 사람의 피를 냈습니다. 그 사람 값은 한 달치였습니다.', '검진원이 집에 왔습니다. 문을 열지 않았습니다. 다음 날 벌금 고지가 왔습니다.']), k: 'bad', fx: { money: -medX(s, 0.15), h: -3 },
      f: orgF(s, '정기 검진 불참자 명단') }) },
  { id: 'inf_hidden_partner', a: [19, 64], w: 40, c: (s) => hidden(s) && !!partner(s) && !s.S.flags.hiddenPartnerTold,
    run: (s) => { s.S.flags.hiddenPartnerTold = true;
      const tell = s.rng.chance(0.6);
      return { t: tell ? partner(s).name + '에게 말했습니다. 오래 말이 없었고, 그 뒤로 둘이 숨겼습니다.' : partner(s).name + '에게는 말하지 않았습니다. 같은 집에서 다른 소매를 입었습니다.', k: tell ? 'note' : 'bad', fx: tell ? { so: 2, h: -1 } : { so: -3, h: -3 },
        f: F('기록된 바 없음') }; } },

  // ── 알려진 감염자의 일상 ──
  { id: 'inf_known_work', a: [19, 64], tags: ['known'], w: 30, gap: 4, c: (s) => working(s) && !s.S.rhodes && !hidden(s),
    run: (s) => ({ t: s.rng.pick(['일터에서 제 컵이 따로 놓였습니다.', '같은 조 사람이 바뀌었습니다. 새 사람도 곧 바뀌었습니다.', '급료 봉투에 "감염자 감액" 줄이 생겼습니다.', '점심을 혼자 먹는 것이 자연스러워졌습니다.']), k: 'bad', fx: { so: -2, h: -2 },
      f: orgF(s, '감염자 고용 지침') }) },
  { id: 'inf_fired', a: [19, 62], tags: ['known'], w: 45, c: (s) => working(s) && !s.S.rhodes && !hidden(s) && ['persecute', 'quarantine', 'euthanasia', 'insurance', 'expel'].includes(pol(s)) && yr(s, 'inffire', 0.12),
    run: (s) => { s.S.job = null; s.S.income = 0; s.S.flags.laidOff = s.S.age; s.S.flags.infFired = s.S.age;
      return { t: '감염을 이유로 해고되었습니다. ' + s.rng.pick(['통지서에는 "안전 규정"이라고 적혀 있었습니다.', '퇴직금은 반이었습니다. 규정이라고 했습니다.', '사물함은 이미 비워져 있었습니다.']), k: 'bad', fx: { h: -5, so: -2 },
        f: orgF(s, '감염자 고용 지침 제' + s.rng.ri(2, 15) + '조') }; } },
  { id: 'inf_family_reaction', a: [19, 64], tags: ['known'], w: 60, c: (s) => !!partner(s) && !s.S.flags.infFamTold && !hidden(s),
    run: (s) => { s.S.flags.infFamTold = true;
      const stay = s.rng.chance(0.7);
      return { t: stay ? eun(partner(s).name) + ' 남았습니다. 식기를 나누자는 말은 하지 않았습니다.' : partner(s).name + '의 친정에서 사람이 왔습니다. 그날 저녁부터 집이 조용했습니다.', k: stay ? 'warm' : 'bad', fx: stay ? { so: 3, h: 2 } : { so: -4, h: -4 },
        f: orgF(s, '감염자 가족 등록란') }; } },
  { id: 'inf_crystal', a: [19, 64], tags: ['known', 'ori_stage2'], w: 30, gap: 4, c: (s) => !s.S.rhodes,
    run: (s) => ({ t: '손등 결정이 자랐습니다. ' + uL(s) + ' u/L. ' + s.rng.pick(['거울을 보는 시간이 줄었습니다.', '아이가 만져 보려 했고, 손을 뺐습니다.', '결정은 차가웠습니다. 사람들이 말하는 것과 달리.']), k: 'bad', fx: { h: -2 },
      f: rhodesF('진행 단계 관찰 기준') }) },
  { id: 'inf_stage3', a: [19, 64], tags: ['ori_stage3'], w: 50, gap: 2, rep: true, c: (s) => !s.S.rhodes,
    run: (s) => ({ t: s.rng.pick(['누워 있는 날이 서 있는 날보다 많아졌습니다.', '숨이 짧아졌습니다. 계단이 먼저 끊겼고 그다음 골목이 끊겼습니다.', '밤에 결정이 자라는 소리가 들린다고 생각했습니다. 들리지 않는다고 의사는 말했습니다.']), k: 'bad', fx: { h: -3 },
      f: rhodesF('말기 환자 돌봄 지침') }) },
  { id: 'inf_arts_bonus', a: [19, 64], tags: ['infected'], w: 20, gap: 5, c: (s) => artsTop(s) && working(s),
    run: (s) => ({ t: '아츠가 전보다 쉽게 나왔습니다. ' + s.rng.pick(['일이 빨라졌고, 윗사람이 이유를 묻지 않았습니다.', '손끝이 밝아지는 것을 동료가 봤습니다. 둘 다 못 본 척했습니다.', '값은 결정 밀도로 치렀습니다. ' + uL(s) + ' u/L.']), k: 'note', fx: { money: Math.round(s.S.income * 0.05), hl: -2 },
      f: rhodesF('감염자 아츠 활성 보고') }) },

  // ── 격리구역 ──
  { id: 'inf_quarantine_life', a: [19, 64], w: 45, gap: 3, rep: true, c: (s) => !!s.S.flags.quarantined,
    run: (s) => ({ t: s.rng.pick(['격리구역의 하루는 비슷했습니다. 배급 줄, 검진 줄, 잠.', '구역 담장 너머로 ' + fest(s) + ' 불빛이 보였습니다. 소리는 오지 않았습니다.', '구역 안에서 ' + cul(s).food.split('와')[0] + ' 파는 사람이 생겼습니다. 값은 바깥의 세 배였습니다.', '새로 들어온 사람이 울었습니다. 아무도 쳐다보지 않았습니다. 다들 그랬으니까.']), k: 'note', fx: { h: -1 },
      f: orgF(s, '격리구역 운영 일지') }) },
  { id: 'inf_quarantine_pass', a: [19, 64], w: 30, gap: 5, c: (s) => !!s.S.flags.quarantined,
    run: (s) => { const ok = s.rng.chance(0.5);
      return { t: '바깥 통행증을 신청했습니다. ' + (ok ? '사흘짜리가 나왔습니다. 부모를 보러 갔고, 사흘은 짧았습니다.' : '거절되었습니다. 사유란은 비어 있었습니다.'), k: ok ? 'warm' : 'bad', fx: ok ? { so: 3, h: 2, money: -medX(s, 0.1) } : { h: -3 },
        f: orgF(s, '격리구역 통행 허가 대장') }; } },

  // ── 억제제·보험·보호비·안락사 서류 ──
  { id: 'inf_suppressant_cost', a: [19, 64], w: 40, gap: 2, rep: true, c: (s) => !!s.S.flags.suppressant,
    run: (s) => ({ t: '억제제 값으로 올해 ' + iga(fmtLMD(s.med * 0.4)) + ' 나갔습니다. ' + s.rng.pick(['약은 작았고 상자는 컸습니다.', '약사는 "진행이 느려진다"고 했고 "멎는다"고는 하지 않았습니다.', '한 달치를 두 달에 나눠 먹어 보았습니다. 수치가 올랐습니다. 다시 한 달치로 돌아갔습니다.']), k: 'note', fx: { h: -1 },
      f: rhodesF('억제제 처방 안내') }) },
  { id: 'inf_premium_citizen', a: [19, 64], w: 30, gap: 4, c: (s) => !!s.S.flags.oriPremium,
    run: (s) => ({ t: s.rng.pick(['보험증을 보여 주면 가게에 들어갈 수 있었습니다. 보여 주지 않으면 들어갈 수 없었습니다.', '"보험료만 내면 시민"이라는 말을 설계사가 했습니다. 틀린 말은 아니었습니다.', '보험증 갱신에 하루가 걸렸습니다. 줄은 감염자 창구 하나뿐이었습니다.']), k: 'note', fx: { h: -1 },
      f: F(org(s) + ' 감염자 특약 안내서') }) },
  { id: 'inf_fees_life', a: [19, 64], w: 25, gap: 5, c: (s) => !!s.S.flags.oriFees,
    run: (s) => ({ t: s.rng.pick(['보호비를 내는 집은 서로 알았습니다. 모르는 척하는 것도 보호의 일부였습니다.', '보호비를 걷는 사람이 바뀌었습니다. 새 사람은 더 젊었고 더 비쌌습니다.', '한 번 늦게 냈습니다. 다음 날 창문이 하나 깨져 있었습니다.']), k: 'bad', fx: { h: -2, money: -medX(s, 0.05) },
      f: F('기록된 바 없음') }) },
  { id: 'inf_euth_papers', a: [19, 64], w: 35, gap: 4, c: (s) => !!s.S.flags.euthTrack && s.S.flags.euthNotice == null,
    run: (s) => ({ t: s.rng.pick(['격리구역 사무소에서 서류를 갱신했습니다. 세 번째 장은 늘 접혀 있었습니다.', '같은 구역 사람 하나가 "통지"를 받았다고 했습니다. 다음 주에 그 방이 비었습니다.', '검진 수치가 적힌 종이를 받았습니다. ' + uL(s) + ' u/L. 어느 숫자부터인지는 모두 알고 있었습니다.']), k: 'bad', fx: { h: -3 },
      f: orgF(s, '보건령 제3조 시행 세칙') }) },

  // ── 수용소·추방 뒤 ──
  { id: 'inf_camp_adult', a: [19, 64], tags: ['camp'], w: 50, gap: 2, rep: true,
    run: (s) => ({ t: s.rng.pick(['수용소의 하루는 갱도와 배급으로 나뉘었습니다.', '번호로 불렸습니다. 이름은 혼자 있을 때만 썼습니다.', '편지가 한 통 왔습니다. 검열 도장이 글자보다 많았습니다.', '옆 자리 사람이 바뀌었습니다. 이유는 묻지 않는 곳이었습니다.']), k: 'bad', fx: { h: -2 },
      f: orgF(s, '수용소 일일 점호 기록') }) },
  { id: 'inf_camp_after', a: [19, 64], w: 70, c: (s) => s.S.flags.oriOutcome === 'camp' && !s.S.prison && !s.S.flags.campAfterTold,
    run: (s) => { s.S.flags.campAfterTold = true;
      return { t: '수용소에서 나온 뒤의 첫해였습니다. ' + s.rng.pick(['집은 다른 사람이 살고 있었습니다.', '옛 이웃이 길에서 저를 모르는 척했습니다. 고마웠습니다.', '서류의 "재분류"가 무슨 뜻인지 끝내 아무도 설명하지 않았습니다.']), k: 'note', fx: { h: -2, so: -2 },
        f: orgF(s, '재분류 대상자 명단') }; } },
  { id: 'inf_expelled_life', a: [19, 64], w: 70, c: (s) => !!s.S.mig && ['expel', 'insurance_default'].includes(s.S.flags.migReason) && !s.S.flags.expelTold,
    run: (s) => { s.S.flags.expelTold = true;
      return { t: '쫓겨난 땅에서의 첫해였습니다. ' + s.rng.pick(['말이 달랐고, 감염자를 보는 눈은 같았습니다.', '첫 달은 역 근처에서 잤습니다.', '고향 ' + wa(cul(s).food) + ' 비슷한 것을 찾는 데 반년이 걸렸습니다.']), k: 'bad', fx: { h: -3, so: -3 },
        f: orgF(s, '외국인 감염자 거주 등록') }; } },

  // ── 로도스 아일랜드 ──
  { id: 'inf_rhodes_poster', a: [19, 64], tags: ['known', '!rhodes'], w: 20, gap: 4, c: (s) => s.S.flags.rhodesOffer == null,
    run: (s) => { const get = s.rng.chance(0.35);
      if (get) s.S.flags.rhodesOffer = s.S.age;
      return { t: get ? '로도스 아일랜드 모집 공고를 보고 연락했습니다. 답장이 왔습니다.' : '로도스 아일랜드 모집 공고를 보았습니다. 연락하지는 않았습니다.', k: 'note', fx: get ? { h: 2 } : {},
        f: rhodesF('공개 모집 공고 ' + s.year + '년분') }; } },
  { id: 'inf_rhodes_ship', a: [19, 64], tags: ['rhodes'], w: 35, gap: 4, rep: true,
    run: (s) => ({ t: s.rng.pick(['로도스 식당에서는 아무도 제 손을 보지 않았습니다. 다들 비슷한 손이었습니다.', '함선이 이동하는 밤에는 바닥이 울렸습니다. 금방 익숙해졌습니다.', '의료부 복도에서 마주치는 얼굴이 몇 개 늘었습니다. 몇 개는 사라졌습니다.', '검진 날 간호사가 이름을 불렀습니다. 번호가 아니었습니다.']), k: 'warm', fx: { so: 2, h: 2 },
      f: rhodesF('선내 생활 안내') }) },
  { id: 'inf_rhodes_work', a: [19, 64], tags: ['rhodes'], w: 30, gap: 5,
    run: (s) => { const field = s.rng.chance(0.3);
      return { t: field ? '외근 보조로 나갔습니다. 돌아오는 길에 새 얼굴 둘을 데려왔습니다.' : s.rng.pick(['후방지원부에서 일했습니다. 서류, 세탁, 식당. 감염자 대부분이 그쪽을 택한다고 했습니다.', '의료부 보조로 배정되었습니다. 제가 받던 검진을 이제 제가 합니다.', '기관부에서 보일러를 맡았습니다. 뜨거웠고 조용했습니다.']), k: 'note', fx: field ? { h: 2, hl: -2, money: medX(s, 0.1) } : { so: 1, money: medX(s, 0.05) },
        f: rhodesF('인사부 배치 기록') }; } },
  { id: 'inf_rhodes_checkup', a: [19, 64], tags: ['rhodes'], w: 30, gap: 3,
    run: (s) => ({ t: '정기 검진. ' + uL(s) + ' u/L. ' + s.rng.pick(['의사가 "느려졌다"고 했습니다. "멎었다"는 아니었습니다.', '약이 바뀌었습니다. 맛은 같았습니다.', '수치표를 받아 서랍에 넣었습니다. 서랍이 두꺼워졌습니다.']), k: 'note', fx: { h: 1 },
      f: rhodesF('환자 경과 기록') }) },

  // ── 카즈델 ──
  { id: 'inf_kazdel_normal', a: [19, 64], tags: ['kazdel', 'infected'], w: 30, gap: 5,
    run: (s) => ({ t: s.rng.pick(['결정이 보여도 아무도 묻지 않았습니다. 묻지 않는 것이 카즈델의 인사였습니다.', '용병단 의무병이 수치를 적었습니다. ' + uL(s) + ' u/L. "아직 뛸 수 있군" 하고 서명했습니다.', '외국 사람이 제 손을 보고 물러섰습니다. 여기서는 그 사람이 이상한 쪽이었습니다.']), k: 'note', fx: { so: 1 },
      f: F('용병 등록부 건강란') }) },
];

// ────────────────────────────────────────────────────────────────────────────
// 결정
// ────────────────────────────────────────────────────────────────────────────
export const decisions = {
  /** 숨긴 채 몇 해 — 신고할까 */
  adult_hidden_report: {
    gap: 6,
    ok: (s) => adult(s) && hidden(s) && yr(s, 'hidrep', 0.15),
    build: (s) => {
      const p = pol(s);
      return { title: '숨긴 지 ' + (s.S.age - (s.S.flags.oriKnownAt || s.S.age)) + '년', body: '결정 밀도 ' + uL(s) + ' u/L. 숨기는 데 드는 돈과 품이 매년 늘었습니다. ' + ({ persecute: '신고하면 수용소나 국경입니다.', quarantine: '신고하면 격리구역입니다.', euthanasia: '신고하면 격리구역과 서류 한 장입니다.', insurance: '신고하면 보험료입니다. 못 내면 국경입니다.', neglect: '신고하면 보호비 걷는 사람이 옵니다.', expel: '신고하면 성문 밖입니다.' }[p] || '신고해도 달라질 것은 많지 않습니다.'),
        fact: orgF(s, '감염 미신고 처벌 조항'), choices: [
          { k: 'keep', label: '계속 숨긴다', sub: '들킬 확률은 매년 그대로', auto: 2 },
          { k: 'report', label: '신고한다', sub: '정책대로 처분', auto: ['ignore', 'treat', 'insurance'].includes(p) ? 2 : 0.5 },
          { k: 'rhodes', label: '로도스를 찾는다', sub: '연락이 닿을지는 모릅니다', auto: 1.5 }] };
    },
    apply: (s, k) => {
      const S = s.S;
      if (k === 'report') { S.flags.oriHidden = false; applyPolicy(s, s.policy); return { t: '신고했습니다. 서류의 "최초 진단일" 칸을 비워 두었고, 서기는 묻지 않았습니다.', k: 'note', f: orgF(s, '감염자 등록 대장', s.year) }; }
      if (k === 'rhodes') { if (s.rng.chance(0.45)) { S.rhodes = true; S.ori.treated = true; S.flags.rhodesAt = S.age; S.flags.oriHidden = false; return { t: '로도스 아일랜드와 연락이 닿았습니다. 처음으로 소매를 걷고 진료를 받았습니다.', k: 'warm', fx: { h: 5 }, f: rhodesF('신규 환자 등록증') }; }
        return { t: '로도스 아일랜드에 편지를 보냈습니다. 답은 오지 않았습니다. 소매는 그대로였습니다.', k: 'note', fx: { h: -2 }, f: rhodesF('수신 우편 대장 미도달 표시') }; }
      return { t: '계속 숨기기로 했습니다. 장갑을 한 켤레 더 샀습니다.', k: 'note', fx: { money: -medX(s, 0.05) }, f: F('기록된 바 없음') };
    },
  },
  /** 로도스 합류 제안(엔진 rhodesOffer 플래그 → 여기서 고른다. 고르지 않으면 엔진이 연 30% 로 자동 합류) */
  adult_rhodes_offer: {
    gap: 3,
    ok: (s) => adult(s) && s.S.flags.rhodesOffer != null && !s.S.rhodes,
    build: (s) => ({ title: '로도스 아일랜드', body: '로도스 아일랜드에서 사람이 왔습니다. 치료와 일자리를 함께 말했고, 함선은 한 곳에 머물지 않는다고 했습니다. ' + (partner(s) || kids(s).length ? '가족 동반란이 있었습니다.' : '짐은 하나면 된다고 했습니다.'),
      fact: rhodesF('신규 인원 안내서'), choices: [
        { k: 'join', label: '합류한다', sub: '치료 시작, 진행 ×0.5. ' + (s.S.job ? '지금 일은 그만둡니다' : '일자리가 생깁니다'), auto: 2 },
        { k: 'later', label: '생각해 본다', sub: '제안은 남습니다', auto: 1 },
        { k: 'no', label: '거절한다', sub: '제안이 사라집니다', auto: 0.5 }] }),
    apply: (s, k) => {
      const S = s.S;
      if (k === 'join') { S.rhodes = true; S.ori.treated = true; S.flags.rhodesAt = S.age; S.flags.rhodesOffer = null; S.flags.quarantined = false; S.flags.noMove = false;
        return { t: '로도스 아일랜드에 합류했습니다. 첫 검진에서 간호사가 이름을 물었습니다. 번호가 아니라.', k: 'big', fx: { h: 6, so: 3 }, f: rhodesF('신규 인원 등록, ' + s.year + '년') }; }
      if (k === 'no') { S.flags.rhodesOffer = null; S.flags.rhodesRefused = S.age; return { t: '거절했습니다. 안내서는 서랍에 넣었습니다.', k: 'note', fx: { h: -1 }, f: rhodesF('모집 응답 대장 "거절"') }; }
      return { t: '생각해 보겠다고 했습니다. 안내서는 식탁 위에 두었습니다.', k: 'note', f: rhodesF('모집 응답 대장 "보류"') };
    },
  },
  /** 억제제(엔진은 잔고가 중위소득 2배를 넘으면 자동 구매. 그 아래 구간에서 한 번 살지 묻는다) */
  adult_suppressant: {
    gap: 4,
    ok: (s) => adult(s) && known(s) && !s.S.ori.treated && !s.S.rhodes && s.S.money > s.med * 0.6 && s.S.money <= s.med * 2 && yr(s, 'supp', 0.3),
    build: (s) => {
      const dealer = { columbia: '약국', kazimierz: '지하 거주구 약장수', siracusa: '패밀리 쪽 약', yan: '약방', ursus: '뒷골목 약장수', victoria: '약제사', lungmen: '약방', higashi: '제약 회사 영업' }[s.S.cur] || '떠돌이 약장수';
      return { title: '억제제', body: iga(dealer) + ' 억제제를 내놓았습니다. 한 해치 ' + fmtLMD(s.med * 0.4) + '. 잔고는 ' + fmtLMD(s.S.money) + '. 싼 것도 있다고 했습니다.',
        fact: rhodesF('억제제 유통 경고문'), choices: [
          { k: 'buy', label: '제값에 산다', sub: '돈 −, 결정 밀도 조금 내려감', auto: 1.5 },
          { k: 'cheap', label: '싼 것을 산다', sub: '돈 − 조금, 진짜일 수도 아닐 수도', auto: 1 },
          { k: 'no', label: '사지 않는다', sub: '변화 없음', auto: 1 }] };
    },
    apply: (s, k) => {
      const o = s.S.ori;
      if (k === 'buy') { o.uL = +Math.max(0.01, o.uL - 0.03).toFixed(3); s.S.flags.boughtSupp = (s.S.flags.boughtSupp || 0) + 1; return { t: '억제제를 샀습니다. 수치가 조금 내렸습니다. ' + uL(s) + ' u/L.', k: 'note', fx: { money: -medX(s, 0.4), h: 1 }, f: rhodesF('억제제 처방 안내') }; }
      if (k === 'cheap') { const real = s.rng.chance(0.5);
        if (real) { o.uL = +Math.max(0.01, o.uL - 0.02).toFixed(3); return { t: '싼 억제제를 샀습니다. 진짜였습니다. 수치 ' + uL(s) + ' u/L.', k: 'note', fx: { money: -medX(s, 0.1) }, f: F('기록된 바 없음') }; }
        return { t: '싼 억제제를 샀습니다. 진통제였습니다. 아프지는 않았고 수치는 그대로였습니다.', k: 'bad', fx: { money: -medX(s, 0.1), h: -3 }, f: rhodesF('위조 억제제 경고문') }; }
      return { t: '사지 않았습니다. 돈은 겨울을 위해 두었습니다.', k: 'note', f: F('기록된 바 없음') };
    },
  },
};

export default { events, decisions };
