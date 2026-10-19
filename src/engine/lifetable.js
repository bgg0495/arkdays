// 생명표: 기대수명(le)·5세 미만 사망률(u5)에서 연령별 사망확률 q[0..maxAge]를 만든다.
// 0세 = 영아사망률, 1~4세 = u5 잔여 분배, 5~14세 = 낮은 평탄 구간,
// 15세 이상 = Gompertz-Makeham  q(x) = A + B·exp(g·(x-15)) 에서 B를 이분법으로 e0에 맞춘다.
// 종족 lifeMul(D11): 15세 이후 연령축을 lifeMul 배로 늘리고 연간 해저드를 1/lifeMul 로 줄인다.

const OLDEST = 110;        // 인간 척도 최고령(여기서 q=1)
const SEX_GAP = 4.5;       // 여−남 기대수명 차이(년), stats.gap 으로 덮어쓸 수 있음
const CACHE = new Map();

/** 표에서 x세의 잔여 기대수명 */
export function remainingAt(table, x) {
  const { q } = table;
  let l = 1, e = 0;
  for (let a = x; a < q.length; a++) {
    e += l * (1 - q[a] / 2);
    l *= 1 - q[a];
    if (l < 1e-9) break;
  }
  return e;
}

function buildHuman(e0Target, q0, u5, g, A) {
  const q = new Array(OLDEST + 1).fill(0);
  q[0] = q0;
  const rest = Math.max(0, u5 - q0);
  const share = [0.42, 0.26, 0.19, 0.13];
  for (let a = 1; a <= 4; a++) q[a] = rest * share[a - 1];
  const q514 = Math.max(0.0003, u5 * 0.22) / 10;
  for (let a = 5; a <= 14; a++) q[a] = q514;

  const fill = (lnB) => {
    const B = Math.exp(lnB);
    for (let a = 15; a <= OLDEST; a++) q[a] = Math.min(1, A + B * Math.exp(g * (a - 15)));
    q[OLDEST] = 1;
  };
  let lo = -20, hi = 0;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    fill(mid);
    const e = remainingAt({ q }, 0);
    if (e > e0Target) lo = mid; else hi = mid;
  }
  fill((lo + hi) / 2);
  return q;
}

/**
 * lifeTable(stats, sex, lifeMul=1)
 * stats: { le(양성 평균 기대수명), leM?, leF?, u5(0~1), im?(0~1, 기본 u5×0.7), gap?(여−남) }
 * sex: 'M' | 'F'
 * 반환 { q[], l[], e0, maxAge, lifeMul, sex }
 */
export function lifeTable(stats, sex, lifeMul = 1) {
  const key = [stats.le, stats.leM ?? '', stats.leF ?? '', stats.u5, stats.im ?? '', stats.gap ?? '', sex, lifeMul].join('|');
  const hit = CACHE.get(key);
  if (hit) return hit;

  // 성별 기대수명: leM/leF 가 있으면 그대로, 없으면 le ± gap
  const gap = stats.gap ?? (stats.leM != null && stats.leF != null ? stats.leF - stats.leM : SEX_GAP);
  let e0 = sex === 'F' ? stats.le + gap * 0.49 : stats.le - gap * 0.51;
  if (stats.leM != null && stats.leF != null) e0 = sex === 'F' ? stats.leF : stats.leM;
  let u5 = stats.u5 ?? 0.1, im = stats.im ?? u5 * 0.7;
  if (u5 > 1) u5 /= 1000;                          // ‰ 표기 허용
  if (im > 1) im /= 1000;
  u5 = Math.min(0.6, u5); im = Math.min(u5, im);
  const q0 = im * (sex === 'F' ? 0.9 : 1.1);
  // 기대수명이 높을수록 노년 사망이 가파르게 모인다(g↑), 배경 사망(A)은 아동사망률에 비례.
  const g = 0.085 + 0.027 * Math.max(0, Math.min(1, (e0 - 40) / 35));
  const A = 0.0004 + 0.004 * Math.min(1, u5 / 0.25);
  const base = buildHuman(Math.max(20, e0), q0, u5, g, A);

  let q;
  let maxAge = OLDEST;
  if (lifeMul === 1) {
    q = base;
  } else {
    maxAge = Math.round(15 + (OLDEST - 15) * lifeMul);
    q = new Array(maxAge + 1).fill(0);
    for (let a = 0; a <= 14; a++) q[a] = base[a];
    for (let a = 15; a <= maxAge; a++) {
      const ba = 15 + (a - 15) / lifeMul;             // 인간 척도 환산 나이
      const i = Math.min(OLDEST - 1, Math.floor(ba));
      const f = ba - i;
      const qb = base[i] * (1 - f) + base[i + 1] * f;
      const h = -Math.log(Math.max(1e-12, 1 - Math.min(0.999999, qb))) / lifeMul;
      q[a] = 1 - Math.exp(-h);
    }
    q[maxAge] = 1;
  }
  const l = [1];
  for (let a = 0; a < q.length; a++) l.push(l[a] * (1 - q[a]));
  const table = { q, l, e0: remainingAt({ q }, 0), maxAge, lifeMul, sex };
  CACHE.set(key, table);
  return table;
}

/** 종족 척도의 나이 → 인간 척도 나이 (15세 이하는 그대로) */
export function humanAge(age, lifeMul = 1) {
  return age <= 15 || lifeMul === 1 ? age : 15 + (age - 15) / lifeMul;
}

/** 연령 밴드: inf / child / young / mid / old (인간 척도) */
export function bandOf(age, lifeMul = 1) {
  const a = humanAge(age, lifeMul);
  if (a < 1) return 'inf';
  if (a < 15) return 'child';
  if (a < 40) return 'young';
  if (a < 65) return 'mid';
  return 'old';
}
