// 출생: newLife(data, rng, opts) → 상태 객체 S (설계 명세 §4 필드 전부 초기화).
// 롤 순서: 국가(share) → 하위 지역 → 성별 → 종족 → 분위 q → 도시/농촌/이동도시 → 이름 → 부모·형제
//          → 출생 감염 → 아츠 적성 → 초기 스탯.
import { clamp, odds } from './rng.js';
import { lifeTable } from './lifetable.js';
import { rootOf, rollWhenVars } from './data.js';
import { homeOriMul, parentPrevalence, stageOf } from './oripathy.js';
import { BALANCE as B } from './balance.js';
import { toLMD, incomeAt } from './finance.js';
import { makeName as composeName } from './names.js';
import { rollCaps } from './caps.js';
import { raceWeightsFor, relOf } from './relations.js';
import { SAVE_V } from './save.js';

export const BIRTH_YEARS = [1080, 1100];   // D12
export const MALE_P = 0.512;

/** 국가 추첨: 최상위 국가를 (자기 share + 하위 share)로 뽑고, 하위 지역으로 분기 */
export function drawNation(data, rng) {
  const top = data.topNations.map((n) => {
    const kids = (n.children || []).map((id) => data.nationById[id]);
    return [n.id, n.share + kids.reduce((s, c) => s + c.share, 0)];
  });
  const rootId = rng.wpick(top) || data.topNations[0].id;
  const root = data.nationById[rootId];
  const kids = (root.children || []).map((id) => data.nationById[id]);
  if (!kids.length) return root;
  const pickId = rng.wpick([[root.id, root.share], ...kids.map((c) => [c.id, c.share])]);
  return data.nationById[pickId] || root;
}

/** 종족 추첨. 관계 등급 exclude 조합(§9)은 가중 0 */
export function drawRace(data, nation, rng) {
  const w = raceWeightsFor(data, nation);
  const id = rng.wpick(w);
  return data.raceById[id] || data.races[0];
}

export function makeName(data, nation, sex, rng, opts = {}) {
  return composeName(data, rng, { lang: opts.lang || nation.nameLang, sex, race: opts.race, q: opts.q, father: opts.father, avoid: opts.avoid });
}

function parentJob(data, nation, urban, q, rng) {
  const root = rootOf(data, nation.id);
  const cands = data.jobs.filter((j) => (!j.only || j.only.includes(nation.id) || j.only.includes(root))
    && (j.urban === 0 || (j.urban === 1) === !!urban) && !j.req.length && (!j.special || nation.jobs.includes(j.id)) && j.sector !== 'none');
  if (!cands.length) return null;
  const want = (q - 0.5) / 5;
  return rng.wpick(cands.map((j) => [j.id, 1 / (0.15 + Math.abs((j.lo + j.hi) / 2 - want))]));
}

/** 부모가 감염자일 확률(유병률 기반, 추정). 광산 등 고노출 직업 부모는 추가 배율 */
function parentInfectP(nation, race, job, data, homeMul) {
  const j = job ? data.jobById[job] : null;
  const jm = j ? j.oriMul : 1;
  return parentPrevalence(nation, race, jm, homeMul) * (j && j.oriMul >= 3 ? B.minerParentMul : 1);
}

/**
 * newLife(data, rng, opts?)  opts: { nation?, race?, sex?, by?, q? } 강제값(디버그용)
 */
export function newLife(data, rng, opts = {}) {
  const nation = opts.nation ? data.nationById[opts.nation] : drawNation(data, rng);
  const root = rootOf(data, nation.id);
  const st = nation.stats;
  const by = opts.by ?? rng.ri((B.birthYearMin && B.birthYearMin[root]) ?? BIRTH_YEARS[0], BIRTH_YEARS[1]);   // W11: 국가별 하한
  const sex = opts.sex ?? (rng.chance(MALE_P) ? 'M' : 'F');
  const race = opts.race ? data.raceById[opts.race] : drawRace(data, nation, rng);

  // 소수민족 플래그: 국가 eths 가중 롤(없으면 null). W12(D51-3): 종족 home 불일치 → 'outsider' 자동 부여는 폐기 — 차별은 D49 관계 매트릭스(S.rel)만 본다
  let eth = null;
  if (Object.keys(nation.eths || {}).length) {
    const total = Object.values(nation.eths).reduce((s, v) => s + v, 0);
    if (rng.chance(total / 100)) eth = rng.wpick(nation.eths);
  }

  // policyVariants 가 참조하는 보조 변수(region, amir …)를 출생 시 롤. 값은 변형이 적은 것 또는 'other'
  const sub = rollWhenVars(nation, rng);
  // W11: 소지역(S.sub.region) 출생 롤 — balance.regions 표(극동 남북·사르곤 아카후알라·볼리바르 삼파·타라 힐록). 진로 region 가중·정책 분기가 읽는다
  { const tbl = B.regions && (B.regions[nation.id] || B.regions[root]); if (tbl) sub.region = rng.wpick(tbl) || sub.region; }

  const q = opts.q ?? rng.ri(1, 5);
  const urban = rng.chance(odds(clamp(st.urb, 0.02, 0.98), Math.exp(0.3 * (q - 3))));
  // W12(D51-10): 농촌 출생 전용 소지역(시라쿠사 황야 등) — balance.ruralRegions. 진로 데이터의 {region} 하드 게이트가 읽는다
  { const rr = B.ruralRegions && (B.ruralRegions[nation.id] || B.ruralRegions[root]); if (rr && !urban) for (const [k, p] of Object.entries(rr)) if (rng.chance(p)) { sub.region = k; break; } }
  let home;
  if (urban && rng.chance(nation.nomadic)) {
    home = { type: 'nomadic', deck: rng.chance(clamp(0.1 + (q - 1) * 0.2, 0.1, 0.9)) ? 'upper' : 'under' };
  } else {
    home = { type: 'settled', deck: 'ground' };
  }
  const ethLang = eth && data.ethnicFlags[eth] && data.ethnicFlags[eth].nameLang;
  const dadName = makeName(data, nation, 'M', rng, { lang: ethLang, race: race.id, q });
  const momName = makeName(data, nation, 'F', rng, { lang: ethLang, race: race.id, q, avoid: new Set([dadName.given]) });
  const name = makeName(data, nation, sex, rng, { lang: ethLang, race: race.id, q, father: dadName.given, avoid: new Set([dadName.given, momName.given]) });

  // 부모·형제
  const tfr = st.tfr ?? 4.5;
  const mAge = Math.round(clamp(19 + rng.tri() * 14 + (tfr - 2) * 1.2, 15, 46));
  const fAge = Math.round(clamp(mAge + 3 + rng.norm(0, 3), 16, 60));
  const sibTotal = rng.poisson(Math.max(0, tfr - 1));
  const older = rng.ri(0, sibTotal);
  const momJob = parentJob(data, nation, urban, q, rng);
  const dadJob = parentJob(data, nation, urban, q, rng);
  const homeMul = homeOriMul(home, urban);
  const momInf = rng.chance(parentInfectP(nation, race, momJob, data, homeMul));
  const dadInf = rng.chance(parentInfectP(nation, race, dadJob, data, homeMul));
  const dadAbsent = rng.chance(0.1 + (nation.conflict - 1) * 0.04);
  const fam = {
    mom: { name: momName.given, age: mAge, alive: true, job: momJob, infected: momInf, sex: 'F' },
    dad: { name: dadName.given, age: fAge, alive: !dadAbsent, absent: dadAbsent, job: dadJob, infected: dadInf, sex: 'M' },
    older, younger: sibTotal - older, sibs: [],
    partner: null, married: false, marriedAt: null, widowed: false, kids: [],
  };

  // 출생 감염 (§5.1)
  const ori = { on: false, uL: 0, since: null, known: false, treated: false, stage: 0 };
  let oriHow = null;
  const pBirth = momInf && dadInf ? B.bornInfectP.both : momInf || dadInf ? B.bornInfectP.one : 0;
  if (pBirth && opts.terra !== false && rng.chance(pBirth)) {
    // 양쪽 감염이면 결정 밀도가 더 높게 시작한다(광산촌 신생아)
    ori.on = true; ori.uL = +(momInf && dadInf ? rng.rf(0.08, 0.2) : rng.rf(0.03, 0.12)).toFixed(3); ori.since = 0; ori.stage = stageOf(ori.uL); oriHow = 'born';
  }

  // 역량·타고남 롤(v1 §6.1). 구 S.arts 는 cap.arts 와 같은 값(artsTop10 판정 호환)
  const { cap, innate } = rollCaps(rng, { q, race });
  const arts = cap.arts;
  // 신분(§2): 작위·노예·낙인. 작위는 상층에서만, 노예는 nation.slaveP(기본 0)
  const status = { noble: q === 5 && rng.chance(0.6) ? 'noble' : q === 4 && rng.chance(0.15) ? 'noble' : null, slave: q === 1 && rng.chance(nation.slaveP || 0), stigma: null };

  // 생명표·시뮬 기대수명(D19)·플레이 길이(D22: 국가 인간 척도 e0 기준)
  const lt = lifeTable(st, sex, race.lifeMul);
  const tk = nation.terra && nation.terra[sex] ? nation.terra[sex] : null;
  const k = tk ? tk.k : 1;
  const e0Model = lt.e0;
  const e0 = e0Model * k;
  const humanE0 = (tk ? tk.e0 : lifeTable(st, sex, 1).e0);
  const yearSec = clamp(720 / Math.max(1, humanE0), 6, 14);
  const u5k = nation.terra && nation.terra.u5k ? nation.terra.u5k : 1;

  const u5 = st.u5 ?? 0.1;        // 0~1
  const S = {
    v: SAVE_V, phase: 'birth', t: 0, age: 0, speed: 2, paused: false,
    by, bm: rng.ri(1, 12), born: nation.id, cur: nation.id, root,
    sex, q, urban, bornUrban: urban, city: null, name,
    race: race.id, eth, arts, ori, home: { ...home, housing: null, since: 0, owned: false, forced: false }, sub,
    st: {
      hl: clamp(Math.round(78 + (q - 3) * 2 - u5 * 30 + rng.norm(0, 4)), 40, 95),
      h: clamp(Math.round(60 + rng.norm(0, 7)), 20, 90),
    },
    // v1 §2
    cap, innate, status,
    track: null, trackHist: [],
    dream: null,   // W16(D56): 장래 희망 { id, at } (dream_choose)
    res: { nation: nation.id, papers: 'native', since: 0, phase: 'settled', itinerantAt: null },
    rel: relOf(data, nation.id, race.id, by),
    money: Math.round(toLMD(incomeAt(st.ppp, st.gini, clamp((q - 0.5) / 5, 0.05, 0.95)) * [0, 0.1, 0.5, 1.5, 4, 10][q])),
    income: 0, pct: clamp((q - 0.5) / 5 + rng.norm(0, 0.06), 0.03, 0.97),
    job: null, jobY: 0, edu: 0, school: null, eduEnd: null, retired: false, pension: 0,
    focus: null, fT: {}, focusW: {},
    trait: null, fam: { ...fam, marriage: null },
    served: 0, serving: 0, prison: null, prisonLeft: 0, rhodes: false, mig: null,
    log: [], years: [], queue: [], pending: null, recent: [], flags: {}, done: {}, deathAt: null,
    e0: +e0.toFixed(1), e0Model: +e0Model.toFixed(1), yearSec: +yearSec.toFixed(2), lifeMul: race.lifeMul,
    stats: { maxIncome: 0, maxPct: 0, kidsBorn: 0, kidsLost: 0, moves: 0, decisions: 0, auto: 0, infectedAt: ori.on ? 0 : null, oriHow, catHits: 0 },
    u5: +(Math.min(99, (1 - lt.l[5]) * 100 * u5k)).toFixed(1),
  };
  if (S.money < 0) S.money = 0;
  if (ori.on) S.flags.bornInfected = true;
  if (root === 'higashi' && q >= 4 && rng.chance(0.02)) S.flags.ninja_clan = true;   // W8 gate status:'ninja_clan'(창작 2%)
  const hot = (j) => j && data.jobById[j] && data.jobById[j].oriMul >= 3;
  if (hot(fam.mom.job) || hot(fam.dad.job)) S.flags.minerFamily = true;
  return S;
}
