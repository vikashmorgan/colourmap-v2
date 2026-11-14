/*
 * Stars when you look up (docs/specs/art-city.md, "Life in the city"). Pure: no three.js, no DOM.
 *
 * 2026-11-14: "and stars above in the sky when u look up." The sky keeps its five grains in every
 * hundred (lib/city-sky.ts), and reads brighter and fuller as the eye turns up:
 * - Looking up (the camera's forward pointing over the horizon), the sky borrows up to six more
 *   grains a hundred from the traffic's eleven, one at a time and each fading across as it goes
 *   (the traffic is mostly out of view when you look up; looking ahead, the city keeps them all).
 * - Those grains are more stars: half along a faint Milky Way, a band of many dim stars arching
 *   over the city, the rest scattered, most faint and a few bright.
 * - Every star twinkles slowly and gently (several seconds a breath, never a flicker), and the
 *   whole dome is brighter looking up; its far distance no longer dims it (`lift`).
 */

import { fibonacciSphere, hash, type RGB, smooth, type Vec3 } from './bigbang';
import { C, frac, mix, scale, TAU } from './city-grid';

/** The grains a hundred the sky can borrow from the traffic when the eye looks up. */
export const STAR_BORROW = 6;

/** How far the eye looks up, 0 (level or down) to 1 (well up), from its forward vector's y. */
export const lookUp = (fwdY: number) => smooth((fwdY - 0.08) / 0.42);

/**
 * How much of borrowed grain b (0 to STAR_BORROW - 1) is a star now, 0..1, as the eye looks up:
 * they come over one after another, each easing across.
 */
export const borrowShare = (b: number, up: number) => smooth(up * STAR_BORROW - b);

/** The Milky Way's great circle: its pole, and two directions in its plane. */
const POLE: Vec3 = (() => {
  const v: Vec3 = [0.9, 0.15, 0.4];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();
const E1: Vec3 = (() => {
  const v: Vec3 = [-POLE[2], 0, POLE[0]];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();
const E2: Vec3 = [
  POLE[1] * E1[2] - POLE[2] * E1[1],
  POLE[2] * E1[0] - POLE[0] * E1[2],
  POLE[0] * E1[1] - POLE[1] * E1[0],
];

/** A star's gentle twinkle: a slow breath of a few seconds, never under 0.82. */
export const twinkle = (L: number, t: number) =>
  0.91 + 0.09 * Math.sin(t * (0.3 + 0.4 * hash(L, 871)) + hash(L, 872) * TAU);

/**
 * Borrowed star L of n: a direction on the dome (always over the horizon), how bright, its colour.
 * Half on the Milky Way, faint and many; the rest scattered, most faint, a few bright.
 */
export function extraStar(L: number, n: number, t: number): { d: Vec3; k: number; rgb: RGB } {
  const half = Math.ceil(n / 2);
  let d: Vec3;
  let k: number;
  let rgb: RGB;
  if (L < half) {
    const a = frac(0.5 + L * 0.618034) * TAU;
    // Spread across the band, thicker at its middle.
    const g = (hash(L, 873) + hash(L, 874) + hash(L, 875) - 1.5) * 0.16;
    d = [
      E1[0] * Math.cos(a) + E2[0] * Math.sin(a) + POLE[0] * g,
      E1[1] * Math.cos(a) + E2[1] * Math.sin(a) + POLE[1] * g,
      E1[2] * Math.cos(a) + E2[2] * Math.sin(a) + POLE[2] * g,
    ];
    k = 0.16 + 0.22 * hash(L, 876) ** 3;
    rgb = mix(C.white, C.violet, 0.3 + 0.2 * hash(L, 877));
  } else {
    d = fibonacciSphere(L - half, Math.max(1, n - half));
    const m = hash(L, 878);
    k = 0.2 + 0.6 * m ** 5;
    rgb = mix(C.white, hash(L, 879) < 0.5 ? C.warm : C.cyan, 0.25 * hash(L, 880));
  }
  // Mirrored over the horizon, so every one is up in the sky.
  const up: Vec3 = [d[0], Math.abs(d[1]) * 0.94 + 0.05, d[2]];
  const l = Math.hypot(up[0], up[1], up[2]) || 1;
  return { d: [up[0] / l, up[1] / l, up[2] / l], k: k * twinkle(L + 7919, t), rgb };
}

/**
 * Borrowed star L of n round the ship at c, on the sky's dome of radius R, at `share` (0..1) of its
 * light, `lift` making up for the dome's distance.
 */
export function extraStarSpot(
  L: number,
  n: number,
  c: Vec3,
  R: number,
  share: number,
  lift: number,
  t: number,
): { pos: Vec3; rgb: RGB } {
  const s = extraStar(L, n, t);
  const rgb = scale(s.rgb, s.k * share * lift);
  return {
    pos: [c[0] + s.d[0] * R, c[1] + s.d[1] * R, c[2] + s.d[2] * R],
    rgb: [Math.min(1, rgb[0]), Math.min(1, rgb[1]), Math.min(1, rgb[2])],
  };
}
