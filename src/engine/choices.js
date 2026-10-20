// 엔진 내장 결정(§3.3 track_choose·track_switch, §6.3 looks_change, §7 migrate_work·migrate_study·naturalize·return_home,
// §8 marry_<type>·marry_second·home_change, §10 rhodes_offer, A6 contract_end).
// 콘텐츠가 같은 id 로 결정을 등록하면 그쪽이 우선(createSim 이 없는 것만 채운다). 문구는 전부 임시(담백체) — W9 가 덮어쓴다.
// 선택지의 auto 가중은 자동 시뮬·자동 결정용. p 는 build 가 채우는 결정 인자.
import { BALANCE as B } from './balance.js';
import { entryCandidates, rollEntry, choiceSet, enterTrack, switchCandidates, switchTrack, leaveTrack, trackOf } from './track.js';
import { looksChangeOpen, looksChangeApply } from './caps.js';
import { migrateTo, naturalize, returnHome, destCandidates } from './migration.js';
import { marry, makeProspect, familyOpposes, marriageTypes, polyOpen, rollMarriageType, marriageP } from './marriage.js';
import { homeChangeOpen, homeChangeOptions, setHousing } from './housing.js';
import { rhodesTrigger, joinRhodes, VIA_LABEL, placeRhodes, DEPT_LABEL } from './rhodes.js';
import { eul, ro, wa, iga } from './text.js';

const adult = (s) => s.S.phase === 'life' && S_(s).age >= 15;
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
      if (r.cands.length === 1) { enterTrack(s, r.cands[0].id, { via: 'auto' }); return null; }
      const set = choiceSet(s, r.cands);
      const names = (c) => { const t = s.data.trackById[c.id]; const a = t.affiliations.length ? '소속 ' + t.affiliations.map((id) => s.data.affById[id] && s.data.affById[id].name).filter(Boolean).slice(0, 2).join('·') : ''; return { name: t.name, sub: (t.stages[0].title || t.stages[0].name) + (a ? ' · ' + a : '') + (t.special ? ' · 이 나라의 길' : '') }; };
      return { title: '길을 고를 때', body: '올해 들어갈 수 있는 자리가 몇 있습니다. 하나를 고르면 당분간은 그 길입니다.',
        choices: set.map((c) => { const n = names(c); return { k: c.id, label: n.name, sub: n.sub, auto: c.w }; }).concat([{ k: 'wait', label: '한 해 더 본다', sub: '소득 없음', auto: 0.15 }]) };
    },
    apply: (s, k) => { if (k === 'wait') { s.S.flags.joblessYears = (s.S.flags.joblessYears || 0) + 1; return '한 해를 더 기다렸습니다.'; } return enterTrack(s, k, { via: 'choose' }) ? false : '그 자리는 열리지 않았습니다.'; },
  },
  track_switch: {
    once: false, gap: 3, at: 0.5,
    ok: (s) => !!s.S.track && !!s.S.flags.switchOpen && switchCandidates(s).length > 0,
    build: (s) => {
      const cands = switchCandidates(s).slice(0, 3);
      if (!cands.length) { s.S.flags.switchOpen = false; return null; }
      const t = trackOf(s);
      return { title: '다른 길', body: eul(t.name) + ' 떠날 수 있는 때입니다.',
        choices: cands.map((c) => ({ k: c.id, label: s.data.trackById[c.id].name, auto: c.w })).concat([{ k: 'stay', label: '남는다', auto: 1.5 }]) };
    },
    apply: (s, k) => { s.S.flags.switchOpen = false; if (k === 'stay') return '남기로 했습니다.'; return switchTrack(s, k) ? false : '옮기지 못했습니다.'; },
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
    once: false, gap: 3, at: 0.6,
    ok: (s) => looksChangeOpen(s) && yearly(s, 'looks', () => s.rng.chance(0.05)),
    build: (s) => ({ title: '얼굴을 바꾸는 일', body: '아츠 시술이 있습니다. 값은 ' + Math.round(med(s) * B.cap.looksChange.money).toLocaleString() + ' LMD. 잘되면 달라지고, 잘못되면 몸이 상합니다.',
      choices: [{ k: 'go', label: '받는다', sub: '성공 70% / 실패 20% / 사고 10%', auto: 0.3 }, { k: 'no', label: '그만둔다', auto: 1 }] }),
    apply: (s, k) => { if (k !== 'go') return '그대로 살기로 했습니다.'; const r = looksChangeApply(s); return r === 'ok' ? { t: '시술이 잘되었습니다. 거울이 조금 낯설어졌습니다.', k: 'ev' } : r === 'fail' ? { t: '시술은 실패했습니다. 몸만 상했습니다.', k: 'bad' } : { t: '시술 중 사고가 났습니다. 오래 앓았습니다.', k: 'bad' }; },
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

/** 레지스트리에 없는 내장 결정을 앞쪽에 채운다(planYear 가 앞 2개만 큐에 넣으므로 순서가 우선순위) */
export function installEngineDecisions(registry, data) {
  const mine = { ...ENGINE_DECISIONS };
  // 혼인 유형별 결정 id: marry_<type>. 콘텐츠가 그 id 를 등록하면 build/apply 를 그쪽이 가져간다. 없으면 공통 marry 를 복제.
  const types = new Set();
  for (const [k, v] of Object.entries(data.marriage || {})) for (const t of v.types) types.add(t.id);
  for (const id of types) if (!registry.decisions['marry_' + id]) mine['marry_' + id] = { ...ENGINE_DECISIONS.marry, id: 'marry_' + id,
    ok: (s) => { const base = ENGINE_DECISIONS.marry.ok(s); return base && s.S.flags.y_marry && s.S.flags.y_marry.v && s.S.flags.y_marry.v.type.id === id; } };
  delete mine.marry;   // 공통 marry 는 유형 결정이 하나도 없을 때만
  if (!types.size) mine.marry = ENGINE_DECISIONS.marry;
  const out = {};
  const PRIORITY = ['rhodes_offer', 'track_choose', 'contract_end', 'migrate_study', 'naturalize', 'return_home', 'migrate_work', 'marry_second', 'track_switch', 'home_change', 'looks_change'];
  const order = (id) => { const i = PRIORITY.indexOf(id); return i < 0 ? (id.startsWith('marry_') || id === 'marry' ? 2.5 : 99) : i; };
  for (const [id, d] of Object.entries(mine).sort((a, b) => order(a[0]) - order(b[0]))) if (!registry.decisions[id]) { const dd = { id, tags: [], ...d }; if (dd.once === undefined) dd.once = true; out[id] = dd; }
  registry.decisions = { ...out, ...registry.decisions };
  return registry;
}
