/*
 * The City game's shared ground (docs/specs/art-city.md, "Game design"): the grid's sizes, a few
 * small helpers, and the one shape every lit thing in the game hands to the Ship's renderer (an
 * Item: how many light sites it has and where each one is). Pure: no three.js, no DOM.
 */

import type { RGB, Vec3 } from './bigbang';

/** The street, as lib/city.ts has it (the tests hold the two the same). */
export const GROUND = -16;
/** A block across the avenue (x) and along it (z); a street runs on every line between blocks. */
export const BLOCK_X = 26;
export const BLOCK_Z = 34;
/** Half the avenue's width, wall to wall: the street at x = 0. */
export const AVENUE = 9;
/**
 * The plan repeats every TILE_I blocks across and TILE_J along, so the city never ends: seven
 * bands of eight along (2026-11-13: the seventh, the Green Code quarter, added at the far end so
 * every other place keeps its tile-local spot).
 */
export const TILE_I = 12;
export const TILE_J = 56;
export const TILE_X = TILE_I * BLOCK_X;
export const TILE_Z = TILE_J * BLOCK_Z;

export const TAU = Math.PI * 2;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const wrap = (x: number, n: number) => ((x % n) + n) % n;
export const frac = (x: number) => x - Math.floor(x);
export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
export const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
export const mix = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
export const dist3 = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const norm3 = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
/** The nearest a box comes to a point. */
export function boxDist(e: Vec3, lo: Vec3, hi: Vec3): number {
  const c = (i: number) => clamp(e[i] as number, lo[i] as number, hi[i] as number);
  return Math.hypot(c(0) - e[0], c(1) - e[1], c(2) - e[2]);
}
/**
 * A point `e` along the outline of a rectangle (half sizes hw, hh) round its middle, from its
 * corner (-hw, -hh): along its first side, up its second, back along its third, down its fourth.
 */
export function aroundRect(e: number, hw: number, hh: number): [number, number] {
  const m = wrap(e, 4 * (hw + hh));
  if (m < 2 * hw) return [-hw + m, -hh];
  if (m < 2 * hw + 2 * hh) return [hw, -hh + (m - 2 * hw)];
  if (m < 4 * hw + 2 * hh) return [hw - (m - 2 * hw - 2 * hh), hh];
  return [-hw, hh - (m - 4 * hw - 2 * hh)];
}
/** The copy of a value repeating every `period` nearest to c. */
export const nearest = (a: number, c: number, period: number) =>
  a + period * Math.round((c - a) / period);

/**
 * The city's one clock (2026-11-12: "think about ideas of pulse and rhythm in the city"): a slow
 * heartbeat of 66 a minute; each district beats at a simple ratio of it. A beat is a soft swell
 * and fall (0..1), never a flash.
 */
export const BPM = 66;
export function beat(t: number, ratio = 1, phase = 0): number {
  const x = frac((t * BPM * ratio) / 60 + phase);
  // Up quickly, down slowly: a heartbeat's shape, smooth all the way.
  return x < 0.18
    ? Math.sin((x / 0.18) * (Math.PI / 2)) ** 2
    : ((1 + Math.cos(((x - 0.18) / 0.82) * Math.PI)) / 2) ** 1.5;
}

/** The colours of the game city: the neon of lib/city.ts, and each district's own. */
export const C = {
  red: [1, 0.2, 0.13] as RGB,
  gold: [1, 0.74, 0.3] as RGB,
  amber: [1, 0.64, 0.22] as RGB,
  cyan: [0.22, 0.92, 1] as RGB,
  magenta: [1, 0.28, 0.78] as RGB,
  violet: [0.6, 0.4, 1] as RGB,
  warm: [1, 0.8, 0.52] as RGB,
  white: [0.9, 0.95, 1] as RGB,
  saffron: [1, 0.55, 0.12] as RGB,
  marigold: [1, 0.7, 0.1] as RGB,
  rose: [1, 0.45, 0.55] as RGB,
  turquoise: [0.25, 0.85, 0.8] as RGB,
  ivory: [1, 0.93, 0.8] as RGB,
  sand: [0.95, 0.75, 0.45] as RGB,
  leaf: [0.55, 0.95, 0.35] as RGB,
  steel: [0.55, 0.65, 0.85] as RGB,
};

/**
 * Something lit, for the Ship's renderer to deal grains to: `count` light sites, kept `weight`
 * times as densely as windows, the nearest `d` from the eye. `site(s, o)` puts site s's place in
 * o[0..2] and its colour in o[3..5], or says there is nothing there (false). `probe`: a few of its
 * points, checked against the towers in the way; none, and it is always seen.
 */
export type Item = {
  d: number;
  gid: number;
  count: number;
  weight: number;
  probe?: Vec3[];
  site: (s: number, o: number[]) => boolean;
};

/** A 32-bit mix of two numbers, for the items' own numbers. */
export function mixId(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  return h >>> 0;
}
