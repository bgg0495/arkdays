// 엔진 내장 결정(§3.3 track_choose·track_switch, §6.3 looks_change, §7 migrate_work·migrate_study·naturalize·return_home,
// §8 marry_<type>·marry_second·home_change, §10 rhodes_offer, A6 contract_end).
// 콘텐츠가 같은 id 로 결정을 등록하면 그쪽이 우선(createSim 이 없는 것만 채운다). 문구는 전부 임시(담백체) — W9 가 덮어쓴다.
// 선택지의 auto 가중은 자동 시뮬·자동 결정용. p 는 build 가 채우는 결정 인자.
import { BALANCE as B } from './balance.js';
import { entryCandidates, rollEntry, choiceSet, enterTrack, switchCandidates, switchTrack, leaveTrack, trackOf, affOf, promote } from './track.js';
import { clamp } from './rng.js';
import { looksChangeOpen, looksChangeApply } from './caps.js';
import { migrateTo, naturalize, returnHome, destCandidates } from './migration.js';
import { marry, makeProspect, familyOpposes, marriageTypes, polyOpen, rollMarriageType, marriageP } from './marriage.js';
import { homeChangeOpen, homeChangeOptions, setHousing } from './housing.js';
import { rhodesTrigger, joinRhodes, VIA_LABEL, placeRhodes, DEPT_LABEL } from './rhodes.js';
import { eul, ro, wa, iga } from './text.js';

const adult = (s) => s.S.phase === 'life' && S_(s).age >= 15;

// W12(D53b) 승급 기회 문구(원형별). 콘텐츠가 track_promo 를 덮어쓰면 그쪽이 우선
const PROMO_TITLE = { A1: '윗선의 추천', A2: '토너먼트', A3: '승급 시험', A4: '진급 심사', A5: '작업반 승급', A6: '더 큰 계약', A7: '서임', A8: '서임', A9: '공석', A10: '공석', A11: '자리 넓히기', A12: '큰 무대' };
const PROMO_GO = { A1: '추천을 받는다', A2: '출전한다', A3: '응시한다', A4: '심사에 나간다', A6: '계약을 받는다', A7: '서임을 받는다', A8: '서임을 받는다', A9: '손을 든다', A10: '손을 든다', A11: '벌인다', A12: '무대에 선다' };
const PROMO_BODY = {
  A1: (nm, where) => where + ' 윗선이 ' + ro(nm) + ' 올리자는 말을 꺼냈습니다. 추천이 들어가면 돌이킬 수 없고, 떨어지면 추천한 사람의 체면이 깎입니다.',
  A2: (nm) => nm + ' 자격 토너먼트가 열립니다. 나가면 몸이 상할 수 있고, 지면 순위가 떨어집니다.',
  A3: (nm) => nm + ' 등용 시험 공고가 붙었습니다. 떨어진 이름도 방에 붙습니다.',
  A4: (nm) => nm + ' 진급 심사가 있습니다. 심사에서 밀리면 다음 심사까지 눈 밖에 납니다.',
  A6: (nm) => nm + ' 급 계약이 들어왔습니다. 못 해내면 평판이 깎입니다.',
  A7: (nm) => nm + ' 서임 이야기가 나왔습니다. 어른들 앞에 서야 합니다.',
  A8: (nm) => nm + ' 서임 이야기가 나왔습니다. 어른들 앞에 서야 합니다.',
  A9: (nm) => nm + ' 자리가 비었습니다. 손을 들면 심사가 있고, 떨어지면 한동안 말이 돕니다.',
  A10: (nm) => nm + ' 자리가 비었습니다. 손을 들면 심사가 있고, 떨어지면 한동안 말이 돕니다.',
  A11: (nm) => '일을 ' + nm + ' 규모로 키울 기회입니다. 잘못되면 밑천이 줄고 거래처 눈길이 식습니다.',
  A12: (nm) => ro(nm) + ' 설 큰 무대 제안이 왔습니다. 무대에서 미끄러지면 다음 제안은 늦게 옵니다.',
  default: (nm) => ro(nm) + ' 올라설 기회가 왔습니다. 나서면 성공할 수도, 체면을 잃을 수도 있습니다.',
};
const PROMO_FAIL = { A1: '추천은 묻혔습니다. 윗선이 당분간 얼굴을 보지 않았습니다.', A2: '토너먼트에서 졌습니다. 순위가 내려갔습니다.', A3: '시험에 떨어졌습니다. 방에 이름이 없었습니다.', A4: '심사에서 밀렸습니다. 다음 심사까지 눈 밖에 났습니다.', A6: '계약을 끝까지 해내지 못했습니다. 평판이 깎였습니다.', A7: '서임은 미뤄졌습니다.', A8: '서임은 미뤄졌습니다.', A9: '자리는 다른 사람에게 갔습니다.', A10: '자리는 다른 사람에게 갔습니다.', A11: '벌인 만큼 거두지 못했습니다. 밑천이 줄었습니다.', A12: '무대는 조용히 끝났습니다. 다음 제안은 오지 않았습니다.' };
const S_ = (s) => s.S;
const med = (s) => s.med;

/** 나이당 1회 캐시 롤 */
function yearly(s, key, fn) {
  const S = s.S;
  const k = 'y_' + key;
  if (S.flags[k] && S.flags[k].age === S.age) return S.flags[k].v;
  const v = fn();
  S.flags[k] = { age: S.age, v };
  return v;
}

export const ENGINE_DECISIONS = {
  // ── 진로 진입 ──
  track_choose: {
    once: false, at: 0.25,
    ok: (s) => { const r = rollEntry(s); return !!(r && r.cands.length >= 1); },
    build: (s) => {
      const r = s.S.flags.trackCands;
      if (!r || r.age !== s.S.age || !r.cands.length) return null;
      if (r.cands.length === 1) { if (enterTrack(s, r.cands[0].id, { via: 'auto' }) && s.requeueFeed) s.requeueFeed(); return null; }
      const set = choiceSet(s, r.cands);
      // W12(D51-9·10): 소속 후보 나열("벨로네 패밀리·로사티 패밀리") 대신 첫 단계 칭호 + 이 후보가 뜬 까닭 한 줄
      const names = (c) => { const t = s.data.trackById[c.id]; return { name: t.name, sub: (t.stages[0].title || t.stages[0].name) + (c.why ? ' · 까닭: ' + c.why : '') + (t.special && c.why !== '이 나라의 길' ? ' · 이 나라의 길' : '') }; };
      return { title: '길을 고를 때', body: '올해 들어갈 수 있는 자리가 몇 있습니다. 하나를 고르면 당분간은 그 길입니다.',
        choices: set.map((c) => { const n = names(c); return { k: c.id, label: n.name, sub: n.sub, auto: c.w }; }).concat([{ k: 'wait', label: '한 해 더 본다', sub: '소득 없음', auto: 0.15 }]) };
    },
    apply: (s, k) => { if (k === 'wait') { s.S.flags.joblessYears = (s.S.flags.joblessYears || 0) + 1; return '한 해를 더 기다렸습니다.'; } if (!enterTrack(s, k, { via: 'choose' })) return '그 자리는 열리지 않았습니다.'; if (s.requeueFeed) s.requeueFeed(); return false; },
  },
  track_switch: {
    once: false, gap: 3, at: 0.5,
    ok: (s) => !!s.S.track && !!s.S.flags.switchOpen && switchCandidates(s).length > 0,
    build: (s) => {
      const cands = switchCandidates(s).slice(0, 3);
      if (!cands.length) { s.S.flags.switchOpen = false; return null; }
      const t = trackOf(s);
      return { title: '다른 길', body: eul(t.name) + ' 떠날 수 있는 때입니다.',
        choices: cands.map((c) => ({ k: c.id, label: s.data.trackById[c.id].name, sub: c.why ? '까닭: ' + c.why : undefined, auto: c.w })).concat([{ k: 'stay', label: '남는다', auto: 1.5 }]) };
    },
    apply: (s, k) => { s.S.flags.switchOpen = false; if (k === 'stay') return '남기로 했습니다.'; return switchTrack(s, k) ? false : '옮기지 못했습니다.'; },
  },
  // ── 승급 기회(W12 D53b). trackYear 가 S.flags.promoDue 를 두면 다음 해에 연다. 원형별 제목·문구. 국가 콘텐츠가 같은 id 로 덮어쓸 수 있다(디스패처) ──
  track_promo: {
    once: false, at: 0.35,
    ok: (s) => { const d = s.S.flags.promoDue; return !!(d && s.S.track && d.age === s.S.age - 1 && s.S.track.stage === d.stage && !s.S.prison); },
    build: (s) => {
      const d = s.S.flags.promoDue; const t = trackOf(s); if (!t || !d) return null;
      const next = t.stages[s.S.track.stage + 1]; if (!next) return null;
      const a = affOf(s); const nm = next.title || next.name; const A = t.archetype;
      const where = a ? a.name : t.name;
      const body = (PROMO_BODY[A] || PROMO_BODY.default)(nm, where);
      const go = d.succ >= (B.track.promoAutoGo ?? 0.4);
      return { title: PROMO_TITLE[A] || '승급 기회', body,
        choices: [
          { k: 'go', label: PROMO_GO[A] || '나선다', sub: '성공 확률 ' + Math.round(d.succ * 100) + '% · 성공: ' + nm + ', 지위 ▲ · 실패: 지위 ▼', auto: go ? 1 : 0.15 },
          { k: 'wait', label: '다음 기회를 기다린다', sub: '지위 그대로. 기회는 다시 옵니다', auto: go ? 0.15 : 1 }] };
    },
    apply: (s, k) => {
      const d = s.S.flags.promoDue; s.S.flags.promoDue = null; if (!d || !s.S.track) return false;
      const t = trackOf(s);
      if (k === 'wait') { s.S.flags.promoWaits = (s.S.flags.promoWaits || 0) + 1; return '이번에는 나서지 않았습니다.'; }
      s.S.flags.promoWaits = 0;
      if (s.rng.chance(d.succ)) { s.S.flags.omen = false; return promote(s) ? false : '자리는 열리지 않았습니다.'; }
      return { t: (t && PROMO_FAIL[t.archetype]) || '기회를 잡지 못했습니다. 윗선의 눈길이 식었습니다.', k: 'bad', fx: { standing: -(B.track.promoFailStanding ?? 8), h: -3 } };
    },
  },
  contract_end: {
    once: false, at: 0.4,
    ok: (s) => !!(s.S.track && s.S.track.flags.contractDue),
    build: (s) => { const t = trackOf(s); if (!t) return null; return { title: '계약 만료', body: t.name + ' 계약이 끝났습니다.', choices: [{ k: 're', label: '재계약', auto: 2 }, { k: 'leave', label: '떠난다', auto: 1 }] }; },
    apply: (s, k) => {
      const tr = s.S.track; if (!tr) return false;
      tr.flags.contractDue = false;
      if (k === 're') { const t = trackOf(s); tr.flags.contractEnd = s.S.age + s.rng.ri(t.contract[0], t.contract[1]); return '다시 계약했습니다.'; }
      leaveTrack(s, 'expel', { quiet: true });
      if (s.S.res.papers === 'contract' && s.S.cur !== s.S.born) s.S.flags.returnHomeDue = true;
      return '계약을 끝내고 떠났습니다.';
    },
  },
  // ── 외모 변경(§6.3) ──
  looks_change: {
    once: true, at: 0.6,
    ok: (s) => looksChangeOpen(s) && yearly(s, 'looks', () => s.rng.chance(B.cap.looksChange.p ?? 0.5)),
    build: (s) => { const c = B.cap.looksChange; const uses = s.track && (s.track.archetype === 'A2' || s.track.archetype === 'A12');
      return { title: '얼굴을 바꾸는 일', body: (uses ? '이 일은 얼굴도 봅니다. ' : '') + '아츠 시술이 있습니다. 값은 ' + Math.round(med(s) * c.money).toLocaleString() + ' LMD. 잘되면 달라지고, 잘못되면 몸이 상합니다. 한 번뿐인 결심입니다.',
        choices: [{ k: 'go', label: '받는다', sub: '성공 ' + Math.round(c.ok * 100) + '% / 실패 ' + Math.round(c.fail * 100) + '%(건강 −) / 사고 ' + Math.round((1 - c.ok - c.fail) * 100) + '%(건강 −−) · 돈 −', auto: 0.3 }, { k: 'no', label: '그만둔다', sub: '다시 묻지 않습니다', auto: 1 }] }; },
    apply: (s, k) => { s.S.flags.looksAsked = s.S.age; if (k !== 'go') return '그대로 살기로 했습니다.'; const r = looksChangeApply(s); return r === 'ok' ? { t: '시술이 잘되었습니다. 거울이 조금 낯설어졌습니다.', k: 'ev' } : r === 'fail' ? { t: '시술은 실패했습니다. 몸만 상했습니다.', k: 'bad' } : { t: '시술 중 사고가 났습니다. 오래 앓았습니다.', k: 'bad' }; },
  },
  // ── 이주(§7) ──
  migrate_work: {
    once: false, gap: 4, at: 0.5,
    ok: (s) => { const S = s.S; if (S.age < 18 || S.age > 50 || S.prison || S.flags.noMove || S.cur === 'rhodes' || S.school) return false;
      const t = trackOf(s); const jobless = !t && (S.flags.joblessYears || 0) >= B.mig.joblessYears;
      if (S.flags.migAt != null && S.age - S.flags.migAt < 10) return false;
      const open = yearly(s, 'migw', () => s.rng.chance(jobless ? B.mig.joblessWorkP : (t && ['A10', 'A11'].includes(t.archetype) ? B.mig.workP : 0)));
      return !!open && destCandidates(s, 'work').length > 0; },
    build: (s) => { const cands = destCandidates(s, 'work').sort((a, b) => b[1] - a[1]).slice(0, 2); if (!cands.length) return null;
      return { title: '일자리를 찾아', body: '이곳에는 자리가 없습니다. 국경 너머에는 있다고들 합니다.',
        choices: cands.map(([id]) => ({ k: id, label: ro(s.data.nationById[id].name) + ' 간다', auto: 1 })).concat([{ k: 'stay', label: '남는다', auto: B.mig.workAutoStay }]) }; },
    apply: (s, k) => { if (k === 'stay') return '남기로 했습니다.'; return migrateTo(s, 'work', k) ? false : '떠나지 못했습니다.'; },
  },
  migrate_study: {
    once: true, at: 0.3,
    ok: (s) => { const S = s.S; return S.age >= 15 && S.age <= 22 && S.q >= 3 && S.cap && S.cap.learn >= B.mig.studyLearn && !S.prison && S.cur !== 'rhodes' && yearly(s, 'migs', () => s.rng.chance(B.mig.studyP)) && destCandidates(s, 'study').length > 0; },
    build: (s) => { const cands = destCandidates(s, 'study'); const id = s.rng.wpick(cands); if (!id) return null;
      return { title: '유학', body: s.data.nationById[id].name + '의 학교에서 받아 주겠다고 합니다.', choices: [{ k: id, label: '간다', auto: 1 }, { k: 'no', label: '남는다', auto: 1.2 }] }; },
    apply: (s, k) => { if (k === 'no') return '남기로 했습니다.'; if (!migrateTo(s, 'study', k)) return '가지 못했습니다.'; s.S.school = 'uni'; s.S.eduEnd = Math.max(s.S.age + 4, 22); s.S.edu = Math.max(s.S.edu, 3); s.S.flags.studyAbroad = s.S.age; return false; },
  },
  naturalize: {
    once: false, gap: 5, at: 0.5,
    ok: (s) => !!s.S.flags.naturalizeDue,
    build: (s) => ({ title: '귀화', body: s.nation.name + ' 국적을 신청할 수 있습니다.', choices: [{ k: 'yes', label: '신청한다', auto: 1.5 }, { k: 'no', label: '미룬다', auto: 1 }] }),
    apply: (s, k) => { s.S.flags.naturalizeDue = false; if (k === 'no') return '미루었습니다.'; return naturalize(s) ? false : '받아들여지지 않았습니다.'; },
  },
  return_home: {
    once: false, gap: 5, at: 0.5,
    ok: (s) => !!s.S.flags.returnHomeDue && s.S.cur !== s.S.born && s.S.cur !== 'rhodes' && !s.S.prison && !s.S.flags.noMove && !(s.S.status && s.S.status.stigma === 'exile'),
    build: (s) => ({ title: '고향', body: s.data.nationById[s.S.born].name + '에 돌아갈 수 있습니다.', choices: [{ k: 'go', label: '돌아간다', auto: 1 }, { k: 'stay', label: '여기 산다', auto: B.mig.stayShare * 4 }] }),
    apply: (s, k) => { s.S.flags.returnHomeDue = false; if (k === 'stay') return '여기에 남기로 했습니다.'; return returnHome(s) ? false : '돌아가지 못했습니다.'; },
  },
  // ── 혼인(§8). 유형별 id 는 createSim 이 데이터에서 읽어 marry_<type> 로 복제한다 ──
  marry: {
    once: false, at: 0.45,
    ok: (s) => yearly(s, 'marry', () => { if (!(marriageP(s) > 0) || !s.rng.chance(marriageP(s))) return null; const type = rollMarriageType(s); const prospect = makeProspect(s); return { type, prospect }; }) != null,
    build: (s, p) => { const r = s.S.flags.y_marry && s.S.flags.y_marry.v; if (!r) return null; Object.assign(p, r);
      const t = r.type; const pr = r.prospect;
      return { title: t.name, body: wa(pr.name) + ' 혼담이 오갑니다. ' + t.name + (t.dowry ? ' — 지참금 ' + Math.round(med(s) * t.dowry).toLocaleString() + ' LMD.' : '.') + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람입니다.' : ''),
        choices: [{ k: 'accept', label: '받아들인다', auto: B.marriage.autoAccept }, { k: 'hold', label: '보류한다', auto: B.marriage.autoHold }, { k: 'decline', label: '거절한다', auto: B.marriage.autoDecline }] }; },
    apply: (s, k, p) => { s.S.flags.y_marry = null; if (k !== 'accept') return k === 'hold' ? '혼담을 미루었습니다.' : '혼담을 거절했습니다.';
      if (familyOpposes(s, p.prospect)) return { t: '가족이 반대했습니다. 종족이 다르다는 이유였습니다. 혼담은 깨졌습니다.', k: 'bad' };
      return marry(s, p.prospect, p.type) ? false : '혼인은 이루어지지 않았습니다.'; },
  },
  marry_second: {
    once: true, at: 0.6,
    ok: (s) => polyOpen(s),
    build: (s) => ({ title: '두 번째 배우자', body: '집안 형편이 두 번째 혼인을 허락합니다.', choices: [{ k: 'yes', label: '맞이한다', auto: 1 }, { k: 'no', label: '하지 않는다', auto: 1.5 }] }),
    apply: (s, k) => { if (k === 'no') return '하지 않기로 했습니다.'; const t = marriageTypes(s).find((x) => x.id === s.S.fam.marriage.type) || { id: 'custom', name: '관습 혼인' }; return marry(s, makeProspect(s), t, { second: true }) ? false : '이루어지지 않았습니다.'; },
  },
  // ── 주거(§8.2) ──
  home_change: {
    once: false, gap: B.housing.changeGap, at: 0.7,
    ok: (s) => homeChangeOpen(s) && yearly(s, 'home', () => s.rng.chance(0.15)),
    build: (s) => { const opts = homeChangeOptions(s).slice(0, 3); if (!opts.length) return null;
      return { title: '집', body: '집을 마련할 만큼 모였습니다.', choices: opts.map((h) => ({ k: h.id, label: h.name, sub: Math.round(med(s) * h.buy).toLocaleString() + ' LMD', auto: h.w ?? 1 })).concat([{ k: 'no', label: '그대로 산다', auto: 1 }]) }; },
    apply: (s, k) => { if (k === 'no') return '그대로 살기로 했습니다.'; const h = homeChangeOptions(s).find((x) => x.id === k); return h && setHousing(s, h, { buy: true }) ? false : '마련하지 못했습니다.'; },
  },
  // ── 로도스(§10) ──
  rhodes_offer: {
    once: false, gap: 2, at: 0.55,
    ok: (s) => { if (!s.S.flags.rhodesPending) { const v = yearly(s, 'rhodes', () => rhodesTrigger(s)); if (v) s.S.flags.rhodesPending = v; } return !!s.S.flags.rhodesPending && !s.S.rhodes; },
    build: (s, p) => { const via = s.S.flags.rhodesPending; if (!via) return null; p.via = via;
      const place = placeRhodes(s, via);
      const autoJoin = B.rhodes.autoJoin[via] ?? B.rhodes.autoJoin.default;
      return { title: '로도스 아일랜드', body: (VIA_LABEL[via] || '') + '. ' + (place.status === 'patient' ? '환자로 받아 주겠다고 합니다.' : place.status === 'contractor' ? '협력 계약을 제안합니다.' : DEPT_LABEL[place.dept] + ' 자리를 제안합니다.'),
        choices: [{ k: 'join', label: '합류한다', auto: autoJoin }, { k: 'hold', label: '보류한다', auto: (1 - autoJoin) * 0.4 }, { k: 'decline', label: '거절한다', auto: (1 - autoJoin) * 0.6 }] }; },
    apply: (s, k, p) => { s.S.flags.y_rhodes = null; s.S.flags.rhodesPending = null; if (k === 'join') return joinRhodes(s, p.via) ? false : '합류하지 못했습니다.'; if (k === 'decline') s.S.flags.rhodesDeclinedAt = s.S.age; return k === 'hold' ? '대답을 미루었습니다.' : '거절했습니다.'; },
  },
};

/** 내장 결정을 레지스트리 앞쪽에 채운다(planYear 가 앞 2개만 큐에 넣으므로 순서가 우선순위).
 *  콘텐츠가 같은 id 를 등록했으면 그쪽 build/apply 를 쓰되 자리는 엔진 PRIORITY 그대로(W11: 덮어쓴 rhodes_offer·track_choose 가 뒤로 밀리지 않게) */
export function installEngineDecisions(registry, data) {
  const mine = { ...ENGINE_DECISIONS };
  // 혼인 유형별 결정 id: marry_<type>. 콘텐츠가 그 id 를 등록하면 build/apply 를 그쪽이 가져간다. 없으면 공통 marry 를 복제.
  const types = new Set();
  for (const [k, v] of Object.entries(data.marriage || {})) for (const t of v.types) types.add(t.id);
  for (const id of types) if (!registry.decisions['marry_' + id]) mine['marry_' + id] = { ...ENGINE_DECISIONS.marry, id: 'marry_' + id,
    ok: (s) => { const base = ENGINE_DECISIONS.marry.ok(s); return base && s.S.flags.y_marry && s.S.flags.y_marry.v && s.S.flags.y_marry.v.type.id === id; } };
  delete mine.marry;   // 공통 marry 는 유형 결정이 하나도 없을 때만
  if (!types.size) mine.marry = ENGINE_DECISIONS.marry;
  const PRIORITY = ['rhodes_offer', 'track_choose', 'track_promo', 'contract_end', 'migrate_study', 'naturalize', 'return_home', 'migrate_work', 'marry_second', 'track_switch', 'home_change', 'looks_change'];
  const order = (id) => { const i = PRIORITY.indexOf(id); return i < 0 ? (id.startsWith('marry_') || id === 'marry' ? 2.5 : 99) : i; };
  const isBuiltin = (id) => id in mine || id.startsWith('marry_') || PRIORITY.includes(id);
  const front = {};
  const ids = new Set([...Object.keys(mine), ...Object.keys(registry.decisions).filter(isBuiltin)]);
  for (const id of [...ids].sort((a, b) => order(a) - order(b))) {
    if (registry.decisions[id]) { front[id] = registry.decisions[id]; continue; }
    const dd = { id, tags: [], ...mine[id] }; if (dd.once === undefined) dd.once = true; front[id] = dd;
  }
  const rest = {};
  for (const [id, d] of Object.entries(registry.decisions)) if (!front[id]) rest[id] = d;
  registry.decisions = { ...front, ...rest };
  registry.builtinIds = new Set(Object.keys(front));   // planYear 가 큐 앞자리를 줄 결정 id
  return registry;
}
