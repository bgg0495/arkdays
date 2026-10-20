// 저장 호환(§14): v0.2 세이브(S.v 1, st.sm/so, job, home{type,deck}, mig, rhodes:true) → v1. 실패하면 null(UI 가 토스트 후 삭제).
// healStats: NaN·범위 복구(cap·born·standing 포함).
import { clamp } from './rng.js';
import { healCaps, zc } from './caps.js';
import { tracksFor } from './data.js';

export const SAVE_V = 2;

export function healStats(S) {
  if (!S || typeof S !== 'object') return S;
  S.st = S.st || {};
  for (const k of ['hl', 'h']) S.st[k] = Number.isFinite(S.st[k]) ? clamp(S.st[k], 0, 100) : 60;
  delete S.st.sm; delete S.st.so;
  if (!Number.isFinite(S.money)) S.money = 0;
  if (!Number.isFinite(S.income)) S.income = 0;
  if (!Number.isFinite(S.pct)) S.pct = 0.5;
  healCaps(S);
  if (S.track) {
    if (!Number.isFinite(S.track.standing)) S.track.standing = 20;
    S.track.standing = clamp(S.track.standing, 0, 100);
    if (!Number.isFinite(S.track.stage)) S.track.stage = 0;
    S.track.flags = S.track.flags || {};
  }
  if (!S.status || typeof S.status !== 'object') S.status = { noble: null, slave: false, stigma: null };
  if (!S.res || typeof S.res !== 'object') S.res = { nation: S.cur, papers: S.mig ? 'legal' : 'native', since: 0, phase: 'settled', itinerantAt: null };
  if (!Array.isArray(S.trackHist)) S.trackHist = [];
  if (S.rhodes == null) S.rhodes = false;
  if (!S.home || typeof S.home !== 'object') S.home = { type: 'settled', deck: 'ground' };
  if (!S.fam.marriage && S.fam.married) S.fam.marriage = { type: 'custom', at: S.fam.marriedAt ?? S.age, name: '관습 혼인' };
  return S;
}

/** v0.2 → v1. data 는 prepareData 결과. 변환 불가면 null */
export function migrateSave(S, data) {
  try {
    if (!S || typeof S !== 'object' || !S.st) return null;
    if (S.v >= SAVE_V && S.cap && S.innate && S.res && S.status) { healStats(S); return S; }
    // cap: sm→learn, so→ties (50 = 0, 20점 = 1z)
    const sm = Number.isFinite(S.st.sm) ? S.st.sm : 50, so = Number.isFinite(S.st.so) ? S.st.so : 50;
    S.cap = S.cap || { skill: +zc((S.pct ?? 0.5) * 2 - 1).toFixed(3), learn: +zc((sm - 50) / 20).toFixed(3), arts: +zc(S.arts ?? 0).toFixed(3), ties: +zc((so - 50) / 20).toFixed(3) };
    S.innate = S.innate || { looks: 0, luck: 0, trait: S.trait || null };
    S.status = S.status || { noble: S.q === 5 ? 'noble' : null, slave: false, stigma: S.flags && S.flags.oriOutcome === 'expel' ? 'exile' : null };
    S.trackHist = S.trackHist || [];
    // job → 가장 가까운 생업 진로(국가의 A11 중 job 필드가 같은 것, 없으면 첫 A11)
    if (!S.track && S.job && S.job !== 'homemaker' && !S.retired) {
      const list = tracksFor(data, S.cur).filter((t) => t.archetype === 'A11' && !t.forced);
      const t = list.find((x) => x.job === S.job) || list[0];
      if (t) { const stage = Math.min(t.stages.length - 1, S.jobY >= 15 ? 2 : S.jobY >= 5 ? 1 : 0); S.track = { id: t.id, stage, since: Math.max(0, S.age - (S.jobY || 0)), stageSince: S.age, years: S.jobY || 0, standing: t.standing.start ?? 20, aff: null, flags: { via: 'save' } }; }
    }
    if (!S.res) S.res = { nation: S.cur, papers: S.mig ? 'legal' : 'native', since: S.mig ? (S.flags && S.flags.migAt) ?? 0 : 0, phase: 'settled', itinerantAt: null };
    if (S.home && !S.home.housing) S.home.housing = S.home.type === 'nomadic' ? 'plate_rent' : (S.urban ? 'town_rent' : 'village_house');
    if (S.rhodes === true) S.rhodes = { via: 'treatment', status: S.ori && S.ori.on ? 'patient' : 'operator', dept: S.ori && S.ori.on ? 'patient' : 'logistics', since: (S.flags && S.flags.rhodesAt) ?? S.age };
    if (S.rhodes == null) S.rhodes = false;
    if (!S.fam.marriage && S.fam.married) S.fam.marriage = { type: 'custom', at: S.fam.marriedAt ?? S.age, name: '관습 혼인' };
    S.rel = S.rel || 'neutral';
    S.v = SAVE_V;
    healStats(S);
    return S;
  } catch (e) {
    return null;
  }
}
