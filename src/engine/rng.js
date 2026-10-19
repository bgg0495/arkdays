// 시드 가능한 난수 생성기(mulberry32) + 확률 도우미.
// 브라우저·Node 공용 ES 모듈. 전역 상태 없음 — makeRng()가 돌려주는 객체를 ctx.rng로 들고 다닌다.

/** 문자열 → 32비트 시드 (xmur3 계열 해시) */
export function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** mulberry32: 32비트 상태 하나로 [0,1) 균등 난수 */
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** 표준정규 분위 함수 (Acklam 근사, 상대오차 ~1e-9) */
export function invNorm(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425, ph = 1 - pl;
  let q, r;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= ph) {
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/** 표준정규 누적분포 (erf 근사) */
export function normCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z >= 0 ? 1 - p : p;
}

/** 확률 p에 오즈비 OR을 적용한 확률 */
export function odds(p, OR) {
  const o = (p / (1 - p)) * OR;
  return o / (1 + o);
}

/**
 * makeRng(seed?) → { seed, rnd, ri, rf, pick, chance, wpick, norm, tri, poisson, shuffle }
 * seed: 숫자·문자열·생략(시간 기반).
 */
export function makeRng(seed) {
  const s = seed == null
    ? (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0
    : typeof seed === 'number' ? seed >>> 0 : hashSeed(String(seed));
  const rnd = mulberry32(s);
  const R = {
    seed: s,
    rnd,
    /** 정수 [a,b] */
    ri: (a, b) => a + Math.floor(rnd() * (b - a + 1)),
    /** 실수 [a,b) */
    rf: (a, b) => a + rnd() * (b - a),
    pick: (arr) => arr[Math.floor(rnd() * arr.length)],
    chance: (p) => rnd() < p,
    /**
     * 가중 추첨. 입력: {key: w} 객체 | [[key,w],…] | [{id,w}|{k,w}] 배열.
     * 가중치 ≤0 은 제외. 전부 0이면 null.
     */
    wpick: (w) => {
      let entries;
      if (Array.isArray(w)) {
        entries = w.map((e) => Array.isArray(e) ? e : [e.id ?? e.k ?? e.key ?? e, typeof e.w === 'function' ? e.w() : (e.w ?? 1)]);
      } else {
        entries = Object.entries(w);
      }
      let total = 0;
      for (const [, v] of entries) if (v > 0) total += v;
      if (!(total > 0)) return null;
      let r = rnd() * total;
      for (const [k, v] of entries) {
        if (v <= 0) continue;
        r -= v;
        if (r < 0) return k;
      }
      return entries[entries.length - 1][0];
    },
    /** 정규분포 */
    norm: (mu = 0, sd = 1) => mu + sd * invNorm(clamp(rnd(), 1e-9, 1 - 1e-9)),
    /** 삼각분포 [0,1) 중앙 봉우리 */
    tri: () => (rnd() + rnd()) / 2,
    poisson: (lambda) => {
      if (lambda <= 0) return 0;
      const L = Math.exp(-lambda);
      let k = 0, p = 1;
      do { k++; p *= rnd(); } while (p > L && k < 200);
      return k - 1;
    },
    shuffle: (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
  return R;
}
