/**
 * Cymatics math for the Magnetic Sands 1–4 visuals in Geometry Field.
 *
 * A vibrating plate shakes sand wherever it moves and lets it rest where it
 * stays still, so the sand draws the plate's nodal lines (Chladni figures).
 * These are the standing-wave shapes; the sand physics lives in
 * components/geometry-cymatics.ts. Amplitudes are roughly normalised to ±1.
 */

/** Bessel function of the first kind J_n(x), integer n ≥ 0, by its power series. */
export function besselJ(n: number, x: number): number {
  const half = x / 2;
  let term = 1;
  for (let i = 1; i <= n; i++) term *= half / i;
  let sum = term;
  const h2 = half * half;
  for (let k = 1; k < 60; k++) {
    term *= -h2 / (k * (k + n));
    sum += term;
    if (Math.abs(term) < 1e-12 * Math.max(1, Math.abs(sum))) break;
  }
  return sum;
}

/** Associated Legendre P_l^m(x) for 0 ≤ m ≤ l, |x| ≤ 1 (no Condon–Shortley sign). */
export function legendreP(l: number, m: number, x: number): number {
  let pmm = 1;
  if (m > 0) {
    const s = Math.sqrt(Math.max(0, (1 - x) * (1 + x)));
    let f = 1;
    for (let i = 1; i <= m; i++) {
      pmm *= f * s;
      f += 2;
    }
  }
  if (l === m) return pmm;
  let pmm1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmm1;
  let pll = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = (x * (2 * ll - 1) * pmm1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmm1;
    pmm1 = pll;
  }
  return pll;
}

/** Square Chladni plate: cos(nπx)cos(mπy) − cos(mπx)cos(nπy), x, y in [−1, 1]. */
export function chladniSquare(x: number, y: number, n: number, m: number): number {
  const P = Math.PI;
  return (
    0.5 * (Math.cos(n * P * x) * Math.cos(m * P * y) - Math.cos(m * P * x) * Math.cos(n * P * y))
  );
}

/** Circular drum mode: J_n(α·r)·cos(nθ), r in [0, 1]. Unnormalised. */
export function circularMode(r: number, theta: number, n: number, alpha: number): number {
  return besselJ(n, alpha * r) * Math.cos(n * theta);
}

/** Sphere mode: P_l^m(cos θ)·cos(mφ). Unnormalised. */
export function sphereMode(theta: number, phi: number, l: number, m: number): number {
  return legendreP(l, m, Math.cos(theta)) * Math.cos(m * phi);
}

export interface CirclePattern {
  n: number;
  alpha: number;
}
export interface SquarePattern {
  n: number;
  m: number;
}
export interface SpherePattern {
  l: number;
  m: number;
}

// Each list is a loop: the last pattern flows back into the first.
export const CIRCLE_PATTERNS: CirclePattern[] = [
  { n: 0, alpha: 11.8 },
  { n: 3, alpha: 13.0 },
  { n: 6, alpha: 13.6 },
  { n: 2, alpha: 14.8 },
  { n: 5, alpha: 15.7 },
  { n: 8, alpha: 16.0 },
  { n: 4, alpha: 11.1 },
  { n: 1, alpha: 16.5 },
];

export const SQUARE_PATTERNS: SquarePattern[] = [
  { n: 1, m: 4 },
  { n: 2, m: 5 },
  { n: 3, m: 6 },
  { n: 1, m: 6 },
  { n: 3, m: 8 },
  { n: 2, m: 7 },
  { n: 4, m: 7 },
  { n: 1, m: 5 },
];

export const SPHERE_PATTERNS: SpherePattern[] = [
  { l: 4, m: 0 },
  { l: 5, m: 3 },
  { l: 6, m: 6 },
  { l: 7, m: 2 },
  { l: 6, m: 4 },
  { l: 8, m: 5 },
  { l: 5, m: 5 },
  { l: 7, m: 4 },
];

/**
 * Where a looping pattern sequence stands at `phase`: the pattern being held
 * (`from`), the next one (`to`) and an eased 0..1 blend between them. Each
 * step holds for `hold` and then blends over `blend` (phase units).
 */
export function patternBlend(
  phase: number,
  count: number,
  hold: number,
  blend: number,
): { from: number; to: number; mix: number } {
  const step = hold + blend;
  const total = step * count;
  const p = ((phase % total) + total) % total;
  const from = Math.floor(p / step);
  const local = p - from * step;
  const raw = local <= hold ? 0 : (local - hold) / blend;
  return { from, to: (from + 1) % count, mix: raw * raw * (3 - 2 * raw) };
}

/** Largest |f| over a sample set, for normalising a mode's amplitude to ±1. */
export function maxAbs(samples: number, f: (i: number) => number): number {
  let m = 0;
  for (let i = 0; i < samples; i++) m = Math.max(m, Math.abs(f(i)));
  return m || 1;
}
