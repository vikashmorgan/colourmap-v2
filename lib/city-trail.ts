/*
 * THE BOOST TRAIL — light left where the ship has been, so it curves with every turn.
 *
 * 2026-11-13: "add more boost. a better boost trail. a second faster boost."
 *
 * The plume on the ship (lib/city-ships.ts plumeAt) points straight back; this trail is laid along
 * the path the ship has actually flown, kept for the last second and a half: two streams from its
 * engines, spreading and fading with age like a contrail, sparks drifting off it, a hot white-pink
 * core under the hyperboost. Its light only eases with the glow (mellow: never a flash).
 *
 * Pure apart from its own buffer: no three.js, no DOM.
 */

import { hash, type RGB, type Vec3 } from './bigbang';

/** How many seconds of path are kept, and how many samples. */
export const TRAIL_SECONDS = 1.6;
const CAP = 128;

export type Trail = {
  /** x, y, z, then the ship's right (x, z) and up y, per sample. */
  pts: Float32Array;
  ts: Float64Array;
  /** Index of the newest sample; how many are kept. */
  head: number;
  n: number;
};

export function makeTrail(): Trail {
  return { pts: new Float32Array(CAP * 6), ts: new Float64Array(CAP), head: -1, n: 0 };
}

/** Forget the path (a fresh start, a jump, a room). */
export function clearTrail(tr: Trail) {
  tr.head = -1;
  tr.n = 0;
}

/** Where the ship is at time t, its right `r` (level) and up: one more sample of the path. */
export function pushTrail(tr: Trail, c: Vec3, r: Vec3, t: number) {
  if (tr.n > 0 && t - (tr.ts[tr.head] as number) < 1 / 90) return;
  // A jump back in time, or a leap in space (a portal): start over.
  if (tr.n > 0) {
    const o = tr.head * 6;
    const far = Math.hypot(
      c[0] - (tr.pts[o] as number),
      c[1] - (tr.pts[o + 1] as number),
      c[2] - (tr.pts[o + 2] as number),
    );
    if (t < (tr.ts[tr.head] as number) || far > 60) clearTrail(tr);
  }
  tr.head = (tr.head + 1) % CAP;
  tr.n = Math.min(CAP, tr.n + 1);
  const o = tr.head * 6;
  tr.pts[o] = c[0];
  tr.pts[o + 1] = c[1];
  tr.pts[o + 2] = c[2];
  tr.pts[o + 3] = r[0];
  tr.pts[o + 4] = r[2];
  tr.pts[o + 5] = r[1];
  tr.ts[tr.head] = t;
}

/** How many seconds of path there are behind the newest sample. */
export function trailSpan(tr: Trail): number {
  if (tr.n < 2) return 0;
  const oldest = (tr.head - tr.n + 1 + CAP) % CAP;
  return (tr.ts[tr.head] as number) - (tr.ts[oldest] as number);
}

/** Where the ship was `age` seconds before the newest sample, and its right then (null if unknown). */
export function trailAt(tr: Trail, age: number): { c: Vec3; r: Vec3 } | null {
  if (tr.n < 2) return null;
  const want = (tr.ts[tr.head] as number) - age;
  let i = tr.head;
  for (let k = 0; k < tr.n - 1; k++) {
    const j = (i - 1 + CAP) % CAP;
    const tj = tr.ts[j] as number;
    if (tj <= want) {
      const ti = tr.ts[i] as number;
      const f = ti > tj ? (want - tj) / (ti - tj) : 0;
      const a = j * 6;
      const b = i * 6;
      const L = (q: number) => (tr.pts[a + q] as number) * (1 - f) + (tr.pts[b + q] as number) * f;
      return { c: [L(0), L(1), L(2)], r: [L(3), L(5), L(4)] };
    }
    i = j;
  }
  return null;
}

/** The trail's colours: the engines' cyan, cooling to violet; the hyperboost's hot core. */
const CYAN: RGB = [0.35, 0.9, 1];
const VIOLET: RGB = [0.55, 0.3, 1];
const HOT: RGB = [1, 0.75, 0.95];
const mix = (a: RGB, b: RGB, k: number): RGB => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];

/** How long the trail is now, in seconds of path: none at rest, longer with the glow and the hyper. */
export const trailLength = (glow: number, hyper: number) =>
  Math.min(TRAIL_SECONDS, 0.9 * glow + 0.7 * hyper);

/**
 * Grain `i` of the trail (`q` 0..1 its place in the trail's share), `len` the ship's length:
 * where it is and its colour, or null when the trail is too short or the path not known yet.
 */
export function trailGrain(
  tr: Trail,
  i: number,
  q: number,
  len: number,
  glow: number,
  hyper: number,
  t: number,
): { pos: Vec3; rgb: RGB } | null {
  const L = Math.min(trailLength(glow, hyper), trailSpan(tr));
  if (L < 0.05) return null;
  const spark = hash(i, 931) < 0.12;
  // Denser near the ship, where the light is brightest.
  const u = q ** 1.6;
  const at = trailAt(tr, u * L + 0.02);
  if (!at) return null;
  const { c, r } = at;
  // Two streams from the engines, a little apart, drawing together then spreading as they age.
  const side = (hash(i, 932) < 0.5 ? -1 : 1) * len * 0.22 * (1 - 0.5 * u);
  const spread = len * (0.05 + 0.5 * u) * (1 + 0.6 * hyper);
  const a = hash(i, 933) * Math.PI * 2;
  const rad = spread * Math.sqrt(hash(i, 934));
  // Sparks drift off sideways and fall a little as they age.
  const drift = spark ? len * 1.4 * u : 0;
  const s = side + Math.cos(a) * rad + drift * (hash(i, 935) - 0.5) * 2;
  const up = Math.sin(a) * rad * 0.6 - (spark ? 0.6 * u * u * len : 0);
  const pos: Vec3 = [c[0] + r[0] * s, c[1] + up, c[2] + r[2] * s];
  // Hot near the ship under the hyper, cyan, then violet as it cools.
  const core = hyper * (1 - u) ** 2 * (Math.abs(side) < len * 0.3 ? 1 : 0.6);
  const hue = mix(mix(CYAN, VIOLET, u), HOT, core);
  const shimmer = 0.85 + 0.15 * Math.sin(t * 3 + i * 0.7);
  const k =
    (spark ? 1 : 0.8) * (1 - u) ** (spark ? 1 : 1.5) * (0.4 + 0.6 * glow + 0.4 * hyper) * shimmer;
  return { pos, rgb: [Math.min(1, hue[0] * k), Math.min(1, hue[1] * k), Math.min(1, hue[2] * k)] };
}
