/**
 * Drive: the two road worlds (docs/specs/drive-game.md). Pure: no three.js, no DOM.
 *
 * A track is a centre line traced from its curvature (x east, y north, metres; headings
 * counter-clockwise from +x), with an elevation, a half-width and a banking that follows the
 * curvature: on a right-hand bend the left side rises, on a left-hand bend the right side, more the
 * tighter the bend, so a fast line rides up the outside and gravity holds you in the turn. The road's
 * last metres curl up a little at each edge (a lip, like a half-pipe's), which you can ride and
 * drop back off.
 *
 * - Coast Road: endless, winding along a cliff top at sunset, wide and in brown earth; the sea far
 *   below on the left behind a rail, the cliff rising on the right. Timed in kilometres.
 * - Canyon Race: a fixed course over the salt flat (the same every time, so times compare): sweeping
 *   banked bends, three crests that launch you and dips that speed you up, a run through a canyon
 *   with narrow passages and two arches, and obstacles to thread. Start, four checkpoints, finish.
 *
 * Road coordinates: s along the centre line, u across it (positive to the left).
 */

import { clamp, type Gate } from '@/lib/art/drive';
import { G, type Ground, type Hit, type Vehicle, type World } from '@/lib/art/vehicle';

export type TrackId = 'coast' | 'canyon' | 'night' | 'chinatown' | 'neon';

export interface Wall {
  /** Offset of the barrier from the centre (positive left), and its height over the road. */
  u: number;
  height: number;
}

export interface TrackDef {
  id: TrackId;
  startH: number;
  curv(s: number): number;
  elev(s: number): number;
  half(s: number): number;
  /** Lip height at the road's edges. */
  lip(s: number): number;
  /** Design speed for the banking (m/s) and the steepest bank (radians). */
  bankSpeed: number;
  bankMax: number;
  /** The ground off the road levels out toward this height (null: stays at the edge's height). */
  terrain: number | null;
  /** Barriers left and right (null: open). */
  walls(s: number): { left: Wall | null; right: Wall | null };
}

/* ── Banking and the surface ───────────────────────────────── */

/** The bank for a curvature: steep enough to hold the design speed, never past the most. */
export function bankFor(k: number, speed: number, most: number): number {
  return clamp(Math.atan((k * speed * speed) / G), -most, most);
}

/** The lip: flat across the road, curling up over its last 2.5 m at each edge. */
export function lipAt(u: number, half: number, lip: number): number {
  const d = Math.abs(u) - (half - 2.5);
  if (d <= 0) return 0;
  const k = Math.min(d, 2.5) / 2.5;
  return lip * k * k;
}

/* ── The track ─────────────────────────────────────────────── */

export interface Frame {
  x: number;
  y: number;
  h: number;
  k: number;
  e: number;
  bank: number;
  half: number;
}

export interface Track {
  def: TrackDef;
  ds: number;
  x: Float64Array;
  y: Float64Array;
  h: Float64Array;
  n: number;
  /** Last place found, so the next search starts near it. */
  hint: number;
}

const DS = 2;

export function makeTrack(def: TrackDef): Track {
  const cap = 4096;
  const t: Track = {
    def,
    ds: DS,
    x: new Float64Array(cap),
    y: new Float64Array(cap),
    h: new Float64Array(cap),
    n: 1,
    hint: 0,
  };
  t.h[0] = def.startH;
  return t;
}

/** Traces the centre line at least as far as s. */
export function ensure(t: Track, s: number): void {
  const need = Math.ceil(Math.max(0, s) / t.ds) + 2;
  if (need <= t.n) return;
  if (need > t.x.length) {
    let cap = t.x.length;
    while (cap < need) cap *= 2;
    const grow = (a: Float64Array) => {
      const b = new Float64Array(cap);
      b.set(a);
      return b;
    };
    t.x = grow(t.x);
    t.y = grow(t.y);
    t.h = grow(t.h);
  }
  for (let i = t.n; i < need; i++) {
    const s0 = (i - 1) * t.ds;
    // Heading by the midpoint rule; position along the mean heading.
    const hm = t.h[i - 1] + t.def.curv(s0 + t.ds / 4) * (t.ds / 2);
    t.h[i] = t.h[i - 1] + t.def.curv(s0 + t.ds / 2) * t.ds;
    t.x[i] = t.x[i - 1] + Math.cos(hm) * t.ds;
    t.y[i] = t.y[i - 1] + Math.sin(hm) * t.ds;
  }
  t.n = need;
}

export function frameAt(t: Track, s: number): Frame {
  const sc = Math.max(0, s);
  ensure(t, sc + t.ds);
  const u = sc / t.ds;
  const i = Math.floor(u);
  const f = u - i;
  const k = t.def.curv(sc);
  const x = t.x[i] + (t.x[i + 1] - t.x[i]) * f;
  const y = t.y[i] + (t.y[i + 1] - t.y[i]) * f;
  const h = t.h[i] + (t.h[i + 1] - t.h[i]) * f;
  // Before the start the road carries straight on backwards.
  const back = Math.min(0, s);
  return {
    x: x + Math.cos(h) * back,
    y: y + Math.sin(h) * back,
    h,
    k,
    e: t.def.elev(sc),
    bank: bankFor(k, t.def.bankSpeed, t.def.bankMax),
    half: t.def.half(sc),
  };
}

/** A point beside the centre line: u metres to the left. */
export function pointAt(t: Track, s: number, u: number): { x: number; y: number } {
  const f = frameAt(t, s);
  return { x: f.x - Math.sin(f.h) * u, y: f.y + Math.cos(f.h) * u };
}

/** Road coordinates of a world point, searching from `hint` (Newton steps along the line). */
export function project(t: Track, px: number, py: number, hint = t.hint): { s: number; u: number } {
  let s = hint;
  let u = 0;
  for (let it = 0; it < 6; it++) {
    const f = frameAt(t, s);
    const c = Math.cos(f.h);
    const sn = Math.sin(f.h);
    const dx = px - f.x;
    const dy = py - f.y;
    const along = dx * c + dy * sn;
    u = -dx * sn + dy * c;
    const step = along / Math.max(0.3, 1 - f.k * u);
    s += clamp(step, -200, 200);
    if (Math.abs(step) < 1e-4) break;
  }
  return { s, u };
}

/** The surface's height at road coordinates (s, u). */
export function heightAt(t: Track, s: number, u: number): number {
  const f = frameAt(t, s);
  const lip = t.def.lip(Math.max(0, s));
  const uc = clamp(u, -f.half, f.half);
  const edge = f.e - Math.tan(f.bank) * uc + lipAt(uc, f.half, lip);
  const out = Math.abs(u) - f.half;
  if (out <= 0) return edge;
  const toward = t.def.terrain;
  if (toward === null) return edge;
  // Off the road the ground slopes back to the flat (1 in 2).
  return edge + clamp(toward - edge, -out * 0.5, out * 0.5);
}

/** The ground under a world point, for the physics. */
export function groundAt(t: Track, px: number, py: number): Ground & { s: number; u: number } {
  const { s, u } = project(t, px, py);
  t.hint = s;
  const f = frameAt(t, s);
  const h = heightAt(t, s, u);
  const dU = (heightAt(t, s, u + 0.25) - heightAt(t, s, u - 0.25)) / 0.5;
  const dS = (heightAt(t, s + 0.5, u) - heightAt(t, s - 0.5, u)) / Math.max(0.3, 1 - f.k * u);
  const c = Math.cos(f.h);
  const sn = Math.sin(f.h);
  const out = Math.abs(u) - f.half;
  return {
    h,
    gx: dS * c - dU * sn,
    gy: dS * sn + dU * c,
    rough: clamp(out / 0.8, 0, 1),
    lip: t.def.lip(Math.max(0, s)) > 0 ? clamp((Math.abs(u) - (f.half - 2.5)) / 2.5, 0, 1) : 0,
    s,
    u,
  };
}

/* ── Shapes along the road ─────────────────────────────────── */

/** A cosine bump of height a and half-width w centred at c (0 outside). */
export function bump(s: number, c: number, a: number, w: number): number {
  const x = (s - c) / w;
  return Math.abs(x) >= 1 ? 0 : (a * (1 + Math.cos(Math.PI * x))) / 2;
}

/** 0 before a, rising to 1 by a + ramp, holding, falling back to 0 between b - ramp and b. */
export function window01(s: number, a: number, b: number, ramp: number): number {
  const up = clamp((s - a) / ramp, 0, 1);
  const down = clamp((b - s) / ramp, 0, 1);
  const k = Math.min(up, down);
  return k * k * (3 - 2 * k);
}

/** Linear between keyframes [s, value]. */
export function keyed(keys: readonly (readonly [number, number])[], s: number): number {
  if (s <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (s <= keys[i][0]) {
      const [s0, v0] = keys[i - 1];
      const [s1, v1] = keys[i];
      return v0 + ((v1 - v0) * (s - s0)) / (s1 - s0);
    }
  }
  return keys[keys.length - 1][1];
}

/* ── Coast Road ────────────────────────────────────────────── */

const TAU = Math.PI * 2;

/** Its heading: three slow sways, so the bends come long and short. */
export function coastHeading(s: number): number {
  return (
    0.8 * Math.sin((TAU * s) / 1700) +
    0.35 * Math.sin((TAU * s) / 730 + 1.3) +
    0.15 * Math.sin((TAU * s) / 410 + 0.4)
  );
}

export function coastCurv(s: number): number {
  return (
    0.8 * (TAU / 1700) * Math.cos((TAU * s) / 1700) +
    0.35 * (TAU / 730) * Math.cos((TAU * s) / 730 + 1.3) +
    0.15 * (TAU / 410) * Math.cos((TAU * s) / 410 + 0.4)
  );
}

export const COAST_HALF = 12;
/** The rail on the sea side and the foot of the cliff, from the centre. */
export const COAST_RAIL = COAST_HALF + 6;
export const COAST_CLIFF = -(COAST_HALF + 9);
/** The sea, this far under the road. */
export const COAST_SEA = -40;

export const COAST: TrackDef = {
  id: 'coast',
  startH: 0,
  curv: coastCurv,
  elev: (s) => 4 * Math.sin((TAU * s) / 900) + 1.6 * Math.sin((TAU * s) / 370 + 0.7),
  half: () => COAST_HALF,
  lip: () => 1.1,
  bankSpeed: 55,
  bankMax: 0.6,
  terrain: null,
  // The rail is 1.1 m to see, but holds you however high a crest throws you: never into the sea.
  walls: () => ({ left: { u: COAST_RAIL, height: 40 }, right: { u: COAST_CLIFF, height: 30 } }),
};

/** Coast Road is timed by the kilometre: a gate every 1,000 m. */
export const COAST_GATE = 1000;

/* ── Night Rain ────────────────────────────────────────────── */

export const NIGHT_HALF = 10;
/** Lamps beside the road every 32 m, and a gantry across it every 128 m. */
export const NIGHT_LAMP = 32;
/** The night roads' barrier: at the road's edge, under the LED arrows, a kerb you glance off. It
 * stands tall (unseen) so a jump off the banked lip never carries you into the towers. */
export const NIGHT_BARRIER = 1.5;
const barrier = (half: number): { left: Wall; right: Wall } => ({
  left: { u: half + NIGHT_BARRIER, height: 30 },
  right: { u: -(half + NIGHT_BARRIER), height: 30 },
});
export const NIGHT_GANTRY = 128;
export const NIGHT_LAMP_U = NIGHT_HALF + 1.5;
export const NIGHT_LAMP_H = 8;

/** Every 1,500 m: a crest that lifts you at 600 m and a dip at 1,100 m. */
export function nightElev(s: number): number {
  const p = ((s % 1500) + 1500) % 1500;
  return bump(p, 600, 4.5, 34) + bump(p, 1100, -3, 50) + 1.5 * Math.sin((TAU * s) / 640);
}

export const NIGHT: TrackDef = {
  id: 'night',
  startH: 0,
  curv: (s) =>
    0.7 * (TAU / 1500) * Math.cos((TAU * s) / 1500 + 0.6) +
    0.4 * (TAU / 620) * Math.cos((TAU * s) / 620 + 2.1),
  elev: nightElev,
  half: () => NIGHT_HALF,
  lip: () => 0.8,
  bankSpeed: 52,
  bankMax: 0.55,
  terrain: 0,
  walls: () => barrier(NIGHT_HALF),
};

/* ── Chinatown Run and the Neon District ───────────────────── */

/** Chinatown: narrow lanes (half 7.5 m) opening onto wide avenues (half 12 m), 600 m each. */
export const CHINA_LANE = 7.5;
export const CHINA_AVENUE = 12;

export function chinatownHalf(s: number): number {
  const p = ((s % 1200) + 1200) % 1200;
  const avenue = window01(p, 600, 1200, 70);
  return CHINA_LANE + (CHINA_AVENUE - CHINA_LANE) * avenue;
}

export const CHINATOWN: TrackDef = {
  id: 'chinatown',
  startH: 0,
  curv: (s) =>
    0.55 * (TAU / 1100) * Math.cos((TAU * s) / 1100 + 1.1) +
    0.45 * (TAU / 480) * Math.cos((TAU * s) / 480 + 0.3),
  elev: (s) => {
    const p = ((s % 1200) + 1200) % 1200;
    return bump(p, 900, 4, 30) + bump(p, 300, -2.5, 45);
  },
  half: chinatownHalf,
  lip: () => 0.7,
  bankSpeed: 45,
  bankMax: 0.5,
  terrain: 0,
  walls: (s) => {
    // The shophouses' fronts stop you in the lanes; on the avenues the pavement is open.
    const half = chinatownHalf(s);
    if (half > 10) return barrier(half);
    return { left: { u: half + 2.3, height: 6 }, right: { u: -(half + 2.3), height: 6 } };
  },
};

export const NEON_HALF = 13;

export const NEON_TRACK: TrackDef = {
  id: 'neon',
  startH: 0,
  curv: (s) =>
    0.9 * (TAU / 2100) * Math.cos((TAU * s) / 2100 + 0.2) +
    0.3 * (TAU / 700) * Math.cos((TAU * s) / 700 + 1.9),
  elev: (s) => {
    const p = ((s % 1800) + 1800) % 1800;
    return bump(p, 700, 5.5, 36) + bump(p, 1400, -3.5, 55) + 2 * Math.sin((TAU * s) / 900);
  },
  half: () => NEON_HALF,
  lip: () => 0.9,
  bankSpeed: 58,
  bankMax: 0.6,
  terrain: 0,
  walls: () => barrier(NEON_HALF),
};

/* ── Canyon Race ───────────────────────────────────────────── */

/** Curvature keyframes: the bends, eased in and out over 60 m (a right bend is negative). */
export const CANYON_CURVES: readonly (readonly [number, number])[] = [
  [0, 0],
  [300, 0],
  [360, -1 / 300],
  [640, -1 / 300],
  [700, 0],
  [900, 0],
  [960, 1 / 220],
  [1240, 1 / 220],
  [1300, -1 / 180],
  [1440, -1 / 180],
  [1500, 0],
  [1700, 0],
  [1760, 1 / 150],
  [1900, 1 / 150],
  [1950, 0],
  [2100, 0],
  [2160, -1 / 130],
  [2340, -1 / 130],
  [2400, 0],
  [2550, 0],
  [2610, 1 / 200],
  [2800, 1 / 200],
  [2850, 0],
  [3000, 0],
  [3060, -1 / 160],
  [3250, -1 / 160],
  [3300, 0],
  [3700, 0],
  [3760, 1 / 400],
  [4140, 1 / 400],
  [4200, -1 / 250],
  [4440, -1 / 250],
  [4500, 0],
];

/** Crests (they launch you) and dips (they speed you up): centre, height, half-width. */
export const CANYON_BUMPS: readonly (readonly [number, number, number])[] = [
  [600, 2, 80],
  [820, 5, 35],
  [1150, -2.5, 60],
  [2480, -4, 55],
  [3550, 6.5, 40],
  [4600, -3.5, 45],
  [4720, 5, 32],
];

/** Where the canyon walls stand, and the narrow passages inside it. */
export const CANYON_RANGE: readonly [number, number] = [1650, 3400];
export const CANYON_PASSAGES: readonly (readonly [number, number])[] = [
  [1970, 2130],
  [2830, 2970],
];
export const CANYON_ARCHES = [2050, 3250];
export const CANYON_HALF = 11;
export const CANYON_NARROW = 7.5;

export function canyonHalf(s: number): number {
  let narrow = 0;
  for (const [a, b] of CANYON_PASSAGES) narrow = Math.max(narrow, window01(s, a - 40, b + 40, 60));
  return CANYON_HALF - (CANYON_HALF - CANYON_NARROW) * narrow;
}

/** How far the canyon walls have risen at s: 0 out on the salt, 1 inside. */
export function canyonDepth(s: number): number {
  return window01(s, CANYON_RANGE[0], CANYON_RANGE[1], 80);
}

/** The canyon walls' height over the road: 25 to 60 m, varying along it. */
export function canyonWallHeight(s: number, side: number): number {
  const v =
    0.5 +
    0.3 * Math.sin(s / 61 + side * 1.7) +
    0.2 * Math.sin(s / 23 + side * 0.6) * Math.sin(s / 137);
  return (25 + 35 * clamp(v, 0, 1)) * canyonDepth(s);
}

export const CANYON: TrackDef = {
  id: 'canyon',
  startH: Math.PI / 2,
  curv: (s) => keyed(CANYON_CURVES, s),
  elev: (s) => CANYON_BUMPS.reduce((e, [c, a, w]) => e + bump(s, c, a, w), 0),
  half: canyonHalf,
  lip: (s) => 0.6 + 0.6 * canyonDepth(s),
  bankSpeed: 50,
  bankMax: 0.55,
  terrain: 0,
  walls: (s) => {
    if (canyonDepth(s) < 0.5) return { left: null, right: null };
    const half = canyonHalf(s);
    return {
      left: { u: half + 3, height: canyonWallHeight(s, 1) },
      right: { u: -(half + 3), height: canyonWallHeight(s, -1) },
    };
  },
};

export const RACE = {
  start: 150,
  checkpoints: [1000, 2000, 3000, 4000],
  finish: 4950,
};

/* ── Obstacles ─────────────────────────────────────────────── */

export type ObstacleKind = 'boulder' | 'pillar' | 'rock' | 'ridge';

/** A fixed obstacle in road coordinates: a ridge runs across from u to u2. */
export interface Obstacle {
  kind: ObstacleKind;
  s: number;
  u: number;
  r: number;
  height: number;
  u2?: number;
}

export const CANYON_OBSTACLES: readonly Obstacle[] = [
  { kind: 'boulder', s: 450, u: 5, r: 1.6, height: 2.6 },
  { kind: 'boulder', s: 520, u: -6, r: 1.9, height: 3 },
  { kind: 'boulder', s: 760, u: 2, r: 1.4, height: 2.2 },
  { kind: 'pillar', s: 1100, u: -4, r: 1.4, height: 11 },
  { kind: 'pillar', s: 1380, u: 6, r: 1.6, height: 13 },
  { kind: 'ridge', s: 1600, u: -11, u2: -2, r: 0.5, height: 0.6 },
  { kind: 'rock', s: 1820, u: -4, r: 1.3, height: 1.8 },
  { kind: 'rock', s: 2000, u: 3, r: 1.1, height: 1.5 },
  { kind: 'rock', s: 2230, u: -2, r: 1.5, height: 2 },
  { kind: 'rock', s: 2650, u: 5, r: 1.3, height: 1.8 },
  { kind: 'rock', s: 2700, u: -5, r: 1.4, height: 1.9 },
  { kind: 'rock', s: 2920, u: 0, r: 1.2, height: 1.7 },
  { kind: 'rock', s: 3120, u: -3, r: 1.5, height: 2 },
  { kind: 'pillar', s: 3800, u: 5, r: 1.5, height: 12 },
  { kind: 'pillar', s: 3900, u: -6, r: 1.7, height: 14 },
  { kind: 'pillar', s: 4000, u: 0, r: 1.4, height: 10 },
  { kind: 'pillar', s: 4100, u: 7, r: 1.6, height: 12 },
  { kind: 'boulder', s: 4300, u: -3, r: 1.7, height: 2.8 },
  { kind: 'boulder', s: 4380, u: 4, r: 1.5, height: 2.4 },
  { kind: 'ridge', s: 4560, u: 2, u2: 11, r: 0.5, height: 0.6 },
];

export type HazardKind = 'devil' | 'tumbleweed';

/** Something that drifts across the road and back: u(t) = u0 + amp sin(2π t / period + phase). */
export interface Hazard {
  kind: HazardKind;
  s: number;
  u0: number;
  amp: number;
  period: number;
  phase: number;
  r: number;
}

export const CANYON_HAZARDS: readonly Hazard[] = [
  { kind: 'devil', s: 1200, u0: 0, amp: 9, period: 7, phase: 0, r: 3 },
  { kind: 'tumbleweed', s: 2300, u0: 0, amp: 6, period: 4, phase: 1, r: 0.6 },
  { kind: 'tumbleweed', s: 3150, u0: 0, amp: 6, period: 3.5, phase: 2, r: 0.6 },
  { kind: 'devil', s: 3850, u0: 0, amp: 10, period: 9, phase: 1.5, r: 3.2 },
  { kind: 'devil', s: 4400, u0: 2, amp: 8, period: 6, phase: 3, r: 2.8 },
  { kind: 'tumbleweed', s: 4650, u0: 0, amp: 9, period: 5, phase: 0.5, r: 0.6 },
];

export function hazardU(h: Hazard, t: number): number {
  return h.u0 + h.amp * Math.sin((TAU * t) / h.period + h.phase);
}

/** Distance from p to the segment ab, and the nearest point on it. */
export function toSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { d: number; x: number; y: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const k = l2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  const x = ax + dx * k;
  const y = ay + dy * k;
  return { d: Math.hypot(px - x, py - y), x, y };
}

/** Half the vehicle's width, for hits. */
export const BODY_R = 1.0;

/** A hit from a round thing at (ox, oy) of radius r. */
export function circleHit(
  px: number,
  py: number,
  ox: number,
  oy: number,
  r: number,
  loss: number,
  soft = false,
): Hit | null {
  const d = Math.hypot(px - ox, py - oy);
  const reach = r + BODY_R;
  if (d >= reach) return null;
  const nx = d > 1e-6 ? (px - ox) / d : 1;
  const ny = d > 1e-6 ? (py - oy) / d : 0;
  return { nx, ny, depth: soft ? (reach - d) * 0.2 : reach - d, loss, spin: 0, soft };
}

/* ── The world for the physics ─────────────────────────────── */

export interface TrackWorld extends World {
  track: Track;
  /** Where the fixed obstacles stand in the world (built once). */
  placed: { o: Obstacle; x: number; y: number; x2: number; y2: number; base: number }[];
  hazards: readonly Hazard[];
}

export function makeTrackWorld(def: TrackDef): TrackWorld {
  const track = makeTrack(def);
  const obstacles = def.id === 'canyon' ? CANYON_OBSTACLES : [];
  const placed = obstacles.map((o) => {
    const a = pointAt(track, o.s, o.u);
    const b = pointAt(track, o.s, o.u2 ?? o.u);
    return { o, x: a.x, y: a.y, x2: b.x, y2: b.y, base: heightAt(track, o.s, o.u) };
  });
  const hazards = def.id === 'canyon' ? CANYON_HAZARDS : [];
  const world: TrackWorld = {
    track,
    placed,
    hazards,
    ground: (x, y) => groundAt(track, x, y),
    collide: (v, t) => collideTrack(world, v, t),
  };
  return world;
}

/** Barriers, obstacles and drifting hazards near the vehicle. */
export function collideTrack(w: TrackWorld, v: Vehicle, t: number): Hit | null {
  const tr = w.track;
  const { s, u } = project(tr, v.x, v.y);
  const f = frameAt(tr, s);
  const nx = -Math.sin(f.h);
  const ny = Math.cos(f.h);
  const walls = tr.def.walls(s);
  const ground = heightAt(tr, s, u);
  const above = v.z - ground;
  const left = walls.left;
  if (left && u > left.u - BODY_R && above < left.height) {
    return { nx: -nx, ny: -ny, depth: u - (left.u - BODY_R), loss: 0.08, spin: 0.6 };
  }
  const right = walls.right;
  if (right && u < right.u + BODY_R && above < right.height) {
    return { nx, ny, depth: right.u + BODY_R - u, loss: 0.08, spin: -0.6 };
  }
  for (const p of w.placed) {
    if (Math.abs(p.o.s - s) > 30) continue;
    if (v.z > p.base + p.o.height) continue;
    let hit: Hit | null;
    if (p.o.kind === 'ridge') {
      const q = toSegment(v.x, v.y, p.x, p.y, p.x2, p.y2);
      hit = circleHit(v.x, v.y, q.x, q.y, p.o.r, 0.3);
    } else hit = circleHit(v.x, v.y, p.x, p.y, p.o.r, 0.35);
    if (hit) {
      // Spin away from the side it was struck on.
      const side = Math.sign(-Math.sin(v.h) * hit.nx + Math.cos(v.h) * hit.ny) || 1;
      return { ...hit, spin: side * 2.2 };
    }
  }
  for (const hz of w.hazards) {
    if (Math.abs(hz.s - s) > 20) continue;
    const at = pointAt(tr, hz.s, hazardU(hz, t));
    const base = heightAt(tr, hz.s, hazardU(hz, t));
    if (hz.kind === 'tumbleweed' && v.z > base + 1.2) continue;
    const hit =
      hz.kind === 'devil'
        ? circleHit(v.x, v.y, at.x, at.y, hz.r, 0.03, true)
        : circleHit(v.x, v.y, at.x, at.y, hz.r, 0.08);
    if (hit) return { ...hit, spin: hz.kind === 'devil' ? 0.8 : 0.4 };
  }
  return null;
}

/* ── Gates ─────────────────────────────────────────────────── */

/** The gate across the road at s (a line from edge to edge, a little wider). */
export function gateAt(t: Track, s: number): Gate {
  const f = frameAt(t, s);
  const a = pointAt(t, s, f.half + 2);
  const b = pointAt(t, s, -(f.half + 2));
  return { ax: a.x, ay: a.y, bx: b.x, by: b.y };
}

export interface Race {
  /** When the run started, or null. */
  start: number | null;
  /** The next gate to pass (an index into the course's gates). */
  next: number;
  last: number | null;
  best: number | null;
  record: boolean;
}

export function newRace(best: number | null = null): Race {
  return { start: null, next: 0, last: null, best, record: false };
}

/** Whether moving from s0 to s1 (with |u| inside the gate) passes the gate at g. */
export function passes(s0: number, s1: number, u: number, half: number, g: number): boolean {
  return s0 < g && s1 >= g && Math.abs(u) <= half + 3;
}

/**
 * The Canyon Race: the start gate starts the clock, the checkpoints must be passed in order, the
 * finish stops it. Going back through the start restarts the run.
 */
export function stepCanyonRace(
  race: Race,
  s0: number,
  s1: number,
  u: number,
  half: number,
  t: number,
): Race {
  const gates = [RACE.start, ...RACE.checkpoints, RACE.finish];
  if (passes(s0, s1, u, half, RACE.start)) return { ...race, start: t, next: 1, record: false };
  if (race.start === null) return race;
  const g = gates[race.next];
  if (g !== undefined && passes(s0, s1, u, half, g)) {
    if (race.next === gates.length - 1) {
      const time = t - race.start;
      const record = race.best === null || time < race.best;
      return { start: null, next: 0, last: time, best: record ? time : race.best, record };
    }
    return { ...race, next: race.next + 1 };
  }
  return race;
}

/** Coast Road and Night Rain: every kilometre gate ends one timed kilometre and starts the next. */
export function stepKmRace(
  race: Race,
  s0: number,
  s1: number,
  u: number,
  half: number,
  t: number,
): Race {
  const g = Math.ceil(s0 / COAST_GATE) * COAST_GATE;
  if (g <= 0 || !passes(s0, s1, u, half, g)) return race;
  if (race.start === null) return { ...race, start: t, record: false };
  const time = t - race.start;
  const record = race.best === null || time < race.best;
  return { start: t, next: 0, last: time, best: record ? time : race.best, record };
}
