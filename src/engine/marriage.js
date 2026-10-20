// 혼인 제도(§8.1, D48). familyYear 의 결혼 롤이 성사되면 marriage.json 유형을 가중 롤로 정하고 결정 marry_<type> 을 연다.
// dowry 는 중위소득 배율로 돈 이동(남성이 받고 여성이 낸다), poly 는 두 번째 배우자, infected_only 는 격리구역 거주자 강제.
import { clamp } from './rng.js';
import { humanAge } from './lifetable.js';
import { BALANCE as B } from './balance.js';
import { makeName, familyNames } from './names.js';
import { initPartner } from './finance.js';
import { relOf, relOpposesMarriage } from './relations.js';
import { wa } from './text.js';

const MR = () => B.marriage;

export function marriageTypes(sim) {
  const m = sim.data.marriage;
  const n = sim.nation;
  const src = m[sim.S.cur] || (n.parent && m[n.parent]) || m._default;
  return src ? src.types : [];
}

function typeOk(sim, t) {
  const { S } = sim;
  const ha = humanAge(S.age, sim.race.lifeMul);
  if (t.age && (ha < t.age[0] || ha > t.age[1] + 5)) return false;
  if (t.since != null && sim.year < t.since) return false;
  if (t.until != null && sim.year > t.until) return false;
  if (t.region && (S.sub && S.sub.region) !== t.region) return false;
  const req = t.req || {};
  if (req.track && !(S.track && req.track.includes(S.track.id))) return false;
  if (req.income != null && S.income < sim.med * req.income) return false;
  if (req.money != null && S.money < sim.med * req.money) return false;
  if (req.q && (S.q < req.q[0] || S.q > req.q[1])) return false;
  if (req.infected != null && !!S.ori.on !== !!req.infected) return false;
  if (req.urban != null && !!S.urban !== !!req.urban) return false;
  if (req.status) { const k = req.status; if (k === 'slave' ? !S.status.slave : k === 'noble' ? !S.status.noble : S.status.stigma !== k) return false; }
  if (req.eth && S.eth !== req.eth) return false;
  return true;
}

/** 성사된 결혼의 제도 유형 롤. 격리구역 거주자는 infected_only 강제 */
export function rollMarriageType(sim) {
  const { S, rng } = sim;
  const types = marriageTypes(sim);
  const quarantined = !!S.flags.quarantined;
  let cands = types.filter((t) => typeOk(sim, t));
  if (quarantined) { const io = cands.filter((t) => t.infected_only); if (io.length) cands = io; }
  else cands = cands.filter((t) => !t.infected_only);
  if (!cands.length) cands = types.filter((t) => !t.infected_only && !(t.req && t.req.track));
  if (!cands.length) return { id: 'custom', name: '관습 혼인', w: 1, req: {} };
  const id = rng.wpick(cands.map((t) => [t.id, t.w ?? 1]));
  return cands.find((t) => t.id === id) || cands[0];
}

/** 배우자 후보 생성(수락 전). 종족·출신국·감염 여부 */
export function makeProspect(sim) {
  const { S, rng, data } = sim;
  const psex = S.sex === 'M' ? 'F' : 'M';
  let race = S.race;
  if (rng.chance(MR().crossRaceP)) {
    const w = { ...sim.nation.races }; delete w[S.race];
    const r = rng.wpick(w); if (r && data.raceById[r]) race = r;
  }
  const foreign = rng.chance(B.mig.partnerForeignP) ? rng.wpick(data.topNations.filter((n) => n.id !== S.root && !n.virtual && n.share > 0).map((n) => [n.id, n.share])) : null;
  const lang = foreign && data.nationById[foreign] ? data.nationById[foreign].nameLang : sim.nation.nameLang;
  return { name: makeName(data, rng, { lang, sex: psex, race, avoid: familyNames(S) }).given, sex: psex, race, home: foreign,
    age: S.age + rng.ri(-3, 4), alive: true, infected: rng.chance(0.03 * sim.nation.oriExp) };
}

/** 가족 반대 롤(§9): 종족 간 혼인에서 관계 등급이 문화적 이하면 일부 무산 */
export function familyOpposes(sim, prospect) {
  const { S, rng, data } = sim;
  if (prospect.race === S.race) return false;
  const g = relOf(data, S.cur, prospect.race, sim.year);
  return relOpposesMarriage(g) && rng.chance(MR().opposeBlock);
}

/** 결혼 확정: 배우자 등록, dowry, 타국 배우자면 이주 사유 marriage 플래그 */
export function marry(sim, prospect, type, opts = {}) {
  const { S } = sim;
  const f = S.fam;
  if (f.partner && f.partner.alive && !opts.second) return false;
  const p = { ...prospect };
  initPartner(sim, p);
  if (opts.second) { f.partners = f.partners || []; f.partners.push(p); }
  else { f.partner = p; f.married = true; f.marriedAt = S.age; f.widowed = false; }
  f.marriage = { type: type.id, at: S.age, name: type.name, aff: S.track ? S.track.aff : null, poly: !!type.poly };
  if (type.dowry) {
    // 양수 = 신랑 쪽이 냄, 음수 = 신부 쪽이 냄(W8 marriage.json 규약)
    const amt = Math.round(sim.med * Math.abs(type.dowry));
    const pays = (type.dowry > 0) === (S.sex === 'M');
    S.money += pays ? -amt : amt;
    S.flags.dowry = (pays ? -1 : 1) * amt;
  }
  if (!opts.quiet) sim.log(wa(p.name) + ' 결혼했습니다. ' + type.name + (type.dowry ? (S.flags.dowry < 0 ? ', 지참금을 냈습니다.' : ', 지참금을 받았습니다.') : '.'), 'warm');
  if (p.home && p.home !== S.root && !opts.second) S.flags.marriageMigrateTo = p.home;
  sim.HOOK.change(S, sim);
  return true;
}

/** 두 번째 배우자(poly) 결정이 열리는가 */
export function polyOpen(sim) {
  const { S } = sim;
  const m = S.fam.marriage;
  if (!m || !m.poly || !S.fam.partner || !S.fam.partner.alive) return false;
  if ((S.fam.partners || []).length >= 1) return false;
  const types = marriageTypes(sim);
  const t = types.find((x) => x.id === m.type);
  const need = (t && t.polyReq && t.polyReq.income) || MR().polyIncome;
  return S.income >= sim.med * need && sim.rng.chance(MR().polyP);
}

/** 결혼 롤 확률(기존 familyYear 의 식, ties 로 치환) */
export function marriageP(sim) {
  const { S, race } = sim;
  if (S.fam.partner || S.age < 18 || humanAge(S.age, race.lifeMul) > 45 || S.prison === 'camp' || S.serving) return 0;
  let p = 0.12 * clamp(1 + 0.25 * (S.cap ? S.cap.ties : 0), 0.3, 1.5) * (1 - 0.15 * race.stigma) * (S.eth === 'outsider' ? 0.8 : 1);
  if (S.res && S.res.phase === 'settling') p *= 0.6;
  if (S.ori.known && !S.rhodes) p *= 0.3;
  if (S.flags.quarantined) p *= 0.3;
  if (S.innate && S.innate.looks > 1) p *= 1.15;
  return p;
}
