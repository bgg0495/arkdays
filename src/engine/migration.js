// 이주 상태 기계(§7, D47). 사유 → 목적지 후보 → papers → 적응 단계(settling/settled/naturalized) → 귀화·귀향.
// 상태: S.res = { nation, papers:'native'|'legal'|'refugee'|'illegal'|'contract'|'agreement', since, phase, itinerantAt }
// 순회형 진로(itinerant)는 거주국을 유지하고 S.res.itinerantAt 에 올해 머문 곳을 기록한다. 로도스 본함 거주는 res.nation='rhodes'.
import { rootOf } from './data.js';
import { BALANCE as B } from './balance.js';
import { mulTies } from './caps.js';
import { relOf, refreshRel } from './relations.js';
import { trackOf, leaveTrack } from './track.js';
import { applyPolicy } from './oripathy.js';
import { ro, eul } from './text.js';

const M = () => B.mig;
export const REASONS = ['work', 'study', 'marriage', 'flee', 'asylum', 'exile', 'contract', 'caravan', 'rhodes', 'return', 'deport'];
export const REASON_LABEL = { work: '일자리를 찾아', study: '공부하러', marriage: '결혼으로', flee: '피난으로', asylum: '망명으로', exile: '추방되어', contract: '계약으로', caravan: '상단을 따라', rhodes: '로도스 아일랜드에 합류해', return: '고향으로', deport: '강제 송환되어',
  expel: '추방되어', insurance_default: '보험료를 못 내', voluntary: '스스로', laterano_1101: '사변을 피해', silence2: '해안을 떠나' };

/** 사유별 도착 papers */
export function papersFor(sim, reason, to) {
  const n = sim.data.nationById[to];
  switch (reason) {
    case 'work': return n && n.stats.ppp > sim.nation.stats.ppp * 2 ? 'contract' : 'legal';
    case 'study': case 'marriage': case 'caravan': case 'return': case 'deport': return 'legal';
    case 'flee': return n && n.refugeeIn === false ? 'illegal' : 'refugee';
    case 'asylum': return 'refugee';
    case 'exile': case 'expel': case 'insurance_default': return n && n.refugeeIn === false ? 'illegal' : (sim.rng.chance(0.5) ? 'illegal' : 'refugee');
    case 'contract': return 'contract';
    case 'rhodes': return 'agreement';
    default: return 'legal';
  }
}

/** 목적지 후보 [[id, w], …]. 관계 등급 exclude 국가 제외, 감염 공개자는 박해·추방 국가 회피 */
export function destCandidates(sim, reason, opts = {}) {
  const { S, data } = sim;
  const cur = S.root;
  const mig = sim.nation.mig || {};
  const hostile = (n) => M().hostile.includes(typeof n.policy === 'string' ? n.policy : 'ignore');
  const list = opts.list || (reason === 'study' ? M().studyNations : reason === 'asylum' ? M().asylumNations : null);
  const out = [];
  for (const n of data.topNations) {
    if (n.id === cur || n.virtual || !(n.share > 0)) continue;
    if (relOf(data, n.id, S.race, sim.year) === 'exclude') continue;
    let w;
    if (list) { if (!list.includes(n.id)) continue; w = 1; }
    else w = mig[n.id] != null ? mig[n.id] : (Object.keys(mig).length ? 0.05 : Math.max(0.1, n.share));
    if (!(w > 0)) continue;
    if (reason === 'flee' || reason === 'asylum' || reason === 'exile') { if (n.refugeeIn === false) w *= 0.3; }
    if (reason === 'work') w *= Math.sqrt(Math.max(0.3, n.stats.ppp / Math.max(1, sim.nation.stats.ppp)));
    if (S.ori.on && S.ori.known && hostile(n)) w *= 0.2;
    if (n.expelsInfected && S.ori.on) w *= 0.3;
    out.push([n.id, w]);
  }
  return out;
}

/**
 * 이주 실행(sim.migrate 가 감싼다). reason, to(국가 id, 생략 시 후보 가중 롤).
 * 도착: res 갱신, ties −60%, 진로 종료(계약·협정·상단은 유지), rel 재계산, 로그 big, 감염 공개자는 새 정책 적용.
 */
export function migrateTo(sim, reason, to, opts = {}) {
  const { S, data } = sim;
  if (S.phase !== 'life') return false;
  const keepTrack = ['contract', 'agreement', 'caravan', 'rhodes'].includes(reason) || opts.keepTrack;
  let id = to;
  if (!id) { id = sim.rng.wpick(destCandidates(sim, reason, opts)); if (!id) return false; }
  const n = data.nationById[id];
  if (!n) return false;
  const papers = opts.papers || papersFor(sim, reason, id);
  const from = sim.nation.name;
  S.cur = id; S.root = rootOf(data, id);
  S.mig = id === S.born ? null : id;
  S.stats.moves++;
  S.flags.migReason = reason; S.flags.migAt = S.age;
  S.res = { nation: id, papers: reason === 'return' && id === S.born ? 'native' : papers, since: S.age, phase: reason === 'return' && id === S.born ? 'settled' : 'settling', itinerantAt: null, from: S.flags.migFrom || S.born };
  S.flags.migFrom = from;
  S.flags.quarantined = false; S.flags.noMove = false; S.flags.oriFees = false; S.flags.oriPremium = 0; S.flags.euthTrack = false; S.flags.euthNotice = null;
  if (S.prison && reason !== 'deport') { S.prison = null; S.prisonLeft = 0; }
  mulTies(S, 1 - B.cap.migTies);
  if (S.track && !keepTrack) leaveTrack(sim, 'migrate', { quiet: true });
  if (S.job && !S.track && !keepTrack) { S.job = null; S.income = 0; }
  if (S.school && !['study'].includes(reason)) S.school = null;
  refreshRel(sim);
  S.flags.migHist = S.flags.migHist || [];
  S.flags.migHist.push({ at: S.age, to: id, reason, papers: S.res.papers });
  if (!opts.quiet) {
    const bad = ['exile', 'expel', 'insurance_default', 'flee', 'asylum', 'deport'].includes(reason);
    const why = REASON_LABEL[reason] || '';
    sim.log((why ? why + ' ' : '') + ro(n.name) + ' 옮겨 갔습니다.' + (papers === 'refugee' ? ' 난민 신분이었습니다.' : papers === 'illegal' ? ' 서류는 없었습니다.' : ''), bad ? 'bad' : 'big');
  }
  if (S.ori.on && S.ori.known && !S.rhodes) {
    const p = sim.policy;
    if (['ignore', 'treat', 'neglect', 'insurance', 'quarantine'].includes(p)) applyPolicy(sim, p);
  }
  sim.HOOK.change(S, sim);
  return true;
}

/** 귀향 */
export function returnHome(sim) {
  const { S } = sim;
  if (S.cur === S.born) return false;
  return migrateTo(sim, 'return', S.born);
}

/** 귀화 */
export function naturalize(sim) {
  const { S } = sim;
  if (!S.res || S.res.phase === 'naturalized') return false;
  S.res.phase = 'naturalized'; S.res.papers = 'legal'; S.res.naturalizedAt = S.age;
  S.status.stigma = S.status.stigma === 'exile' ? null : S.status.stigma;
  sim.log(sim.nation.name + ' 국적을 얻었습니다.', 'big', '(' + (sim.nation.statOrg || '기록소') + ' 귀화 등기)');
  refreshRel(sim);
  return true;
}

/** 연말 거주 상태 처리: 정착 단계 전환, 불법 발각, 난민→합법, 순회형 방문지, 귀화·귀향 결정 플래그 */
export function resYear(sim) {
  const { S, rng } = sim;
  if (S.phase !== 'life' || !S.res) return;
  const r = S.res;
  const n = sim.nation;
  const years = S.age - (r.since || 0);
  if (r.phase === 'settling') {
    const need = r.papers === 'refugee' ? M().settlingRefugee : M().settling;
    if (r.papers === 'illegal') {
      if (rng.chance(n.illegalRisk ?? M().illegalRisk)) {
        sim.log('체류 서류가 없는 것이 드러났습니다. 국경 밖으로 보내졌습니다.', 'bad');
        const back = S.born !== S.cur ? S.born : null;
        if (back && relOf(sim.data, back, S.race, sim.year) !== 'exclude') migrateTo(sim, 'deport', back, { papers: 'legal' });
        else migrateTo(sim, 'deport');
        return;
      }
    } else if (years >= need) { r.phase = 'settled'; sim.log('이곳 생활이 몸에 붙었습니다.', 'note'); }
  }
  if (r.papers === 'refugee' && rng.chance(M().asylumLegalP)) { r.papers = 'legal'; sim.log('체류 허가가 나왔습니다.', 'ev'); }
  if (r.papers === 'contract' && S.track == null && r.phase !== 'naturalized' && !S.flags.contractDoneAt) { S.flags.contractDoneAt = S.age; S.flags.returnHomeDue = true; }
  // 순회형: 올해 머문 곳
  const t = trackOf(sim);
  if (S.cur === 'rhodes') { const ports = sim.data.rhodes.ports.filter(([p]) => sim.data.nationById[p]); r.itinerantAt = ports.length ? rng.wpick(ports) : null; }
  else if (t && t.itinerant) {
    const route = (t.route && t.route.length ? t.route : Object.keys(n.mig || {})).filter((id) => id !== S.cur && sim.data.nationById[id]);
    r.itinerantAt = route.length ? rng.pick(route) : null;
  } else r.itinerantAt = null;
  // 귀화 결정 노출 / 귀향 결정 주기
  if (r.phase === 'settled' && r.papers === 'legal' && S.cur !== S.born && n.naturalize !== 'never' && years >= M().naturalizeYears && rng.chance(M().naturalizeP)) S.flags.naturalizeDue = true;
  if (S.cur !== S.born && S.cur !== 'rhodes' && years > 0 && years % M().returnHomeGap === 0) S.flags.returnHomeDue = true;
}

/** 엔진 쪽 이주 트리거(§7.1): 피난(재앙 피해·전시), 실업 이민은 결정으로(choices.js) */
export function fleeCheck(sim, why) {
  const { S, rng } = sim;
  if (S.phase !== 'life' || S.prison || S.flags.noMove) return false;
  if (!rng.chance(M().fleeP)) return false;
  return migrateTo(sim, 'flee');
}

/** 사망 요약용 한 문장 */
export function migrationSummary(S, data) {
  if (!S.flags.migHist || !S.flags.migHist.length) return null;
  const last = S.flags.migHist[S.flags.migHist.length - 1];
  const bornName = data.nationById[S.born] ? data.nationById[S.born].name : S.born;
  const toName = data.nationById[last.to] ? data.nationById[last.to].name : last.to;
  if (last.to === S.born) return bornName + '에서 태어나 떠났다가 돌아와 살았습니다.';
  return bornName + '에서 태어나 ' + ro(toName) + ' 옮겨 가 살았습니다. 이유는 ' + (REASON_LABEL[last.reason] || last.reason).replace(/ $/, '') + ' 였습니다.';
}
