/*
 * The metro (docs/specs/art-city.md, "Game design"): a suspended monorail on a rail held high on
 * lit pylons, swishing through the city in long smooth curves to balance the square towers. One
 * closed loop per tile of the plan (a closed Catmull-Rom spline through eighteen points, so it is
 * smooth all the way round), trains of lit carriages hanging under it, leaning into the bends,
 * and four stations on platforms. Towers under the rail stand lower, so it never meets one.
 *
 * 2026-11-12: "imagine a metro in the city that is on suspended rail tracks that swishes through
 * city with curves to balance square shapes and curves."
 */

import type { Vec3 } from './bigbang';
import { BLOCK_X, BLOCK_Z, GROUND, lerp, TAU, TILE_X, TILE_Z, wrap } from './city-grid';

/** Where the rail passes over the plan, tile-local (x, z): down the right side, back up the left. */
export const RAIL_POINTS: [number, number][] = [
  [0, 28],
  [70, 48],
  [140, 120],
  [185, 300],
  [130, 520],
  [190, 740],
  [135, 960],
  [195, 1180],
  [130, 1400],
  [75, 1572],
  [0, 1600],
  [-75, 1572],
  [-130, 1400],
  [-195, 1180],
  [-135, 960],
  [-190, 740],
  [-130, 520],
  [-185, 300],
  [-140, 120],
  [-70, 48],
];
/** The rail's height over the street: high over the lanes, rising and falling gently. */
export const RAIL_Y = 40;
const SAMPLES = 2400;

const catmull = (p0: number, p1: number, p2: number, p3: number, u: number) =>
  0.5 *
  (2 * p1 +
    (-p0 + p2) * u +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
    (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);

/** The rail sampled evenly by its length: places, headings, and how far round each is. */
export const RAIL = (() => {
  const n = RAIL_POINTS.length;
  const raw: Vec3[] = [];
  const per = 400;
  for (let i = 0; i < n; i++) {
    const P = (k: number) => RAIL_POINTS[wrap(i + k, n)] as [number, number];
    for (let j = 0; j < per; j++) {
      const u = j / per;
      const x = catmull(P(-1)[0], P(0)[0], P(1)[0], P(2)[0], u);
      const z = catmull(P(-1)[1], P(0)[1], P(1)[1], P(2)[1], u);
      raw.push([x, 0, z]);
    }
  }
  const cum = [0];
  for (let i = 1; i <= raw.length; i++) {
    const a = raw[i - 1] as Vec3;
    const b = raw[i % raw.length] as Vec3;
    cum.push((cum[i - 1] as number) + Math.hypot(b[0] - a[0], b[2] - a[2]));
  }
  const length = cum[raw.length] as number;
  const pos = new Float32Array(SAMPLES * 3);
  let k = 0;
  for (let s = 0; s < SAMPLES; s++) {
    const want = (s / SAMPLES) * length;
    while ((cum[k + 1] as number) < want) k++;
    const a = raw[k] as Vec3;
    const b = raw[(k + 1) % raw.length] as Vec3;
    const f = (want - (cum[k] as number)) / ((cum[k + 1] as number) - (cum[k] as number) || 1);
    pos[s * 3] = lerp(a[0], b[0], f);
    pos[s * 3 + 1] = GROUND + RAIL_Y + 5 * Math.sin((TAU * 3 * s) / SAMPLES);
    pos[s * 3 + 2] = lerp(a[2], b[2], f);
  }
  return { pos, length, n: SAMPLES };
})();

/** The rail `s` along it (any s: it loops), tile-local: its place, heading, and lean into the bend. */
export function railAt(s: number): { c: Vec3; f: Vec3; bank: number } {
  const L = RAIL.length;
  const x = (wrap(s, L) / L) * RAIL.n;
  const i = Math.floor(x);
  const f = x - i;
  const P = (k: number): Vec3 => {
    const j = wrap(k, RAIL.n) * 3;
    return [RAIL.pos[j] as number, RAIL.pos[j + 1] as number, RAIL.pos[j + 2] as number];
  };
  const a = P(i);
  const b = P(i + 1);
  const c: Vec3 = [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
  const h = (k: number) => {
    const p = P(i + k + 4);
    const q = P(i + k - 4);
    const l = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) || 1;
    return [(p[0] - q[0]) / l, (p[1] - q[1]) / l, (p[2] - q[2]) / l] as Vec3;
  };
  const t0 = h(-6);
  const t1 = h(6);
  const dir = h(0);
  // The bend: how fast the heading turns, signed, so the carriages lean into it.
  const turn = Math.atan2(t0[0] * t1[2] - t0[2] * t1[0], t0[0] * t1[0] + t0[2] * t1[2]);
  const step = (12 * RAIL.length) / RAIL.n;
  return { c, f: dir, bank: Math.max(-0.35, Math.min(0.35, (turn / step) * 18)) };
}

/** The lowest the rail comes over block (I, J) of the plan (tile-local), or none. */
const under = (() => {
  const m = new Map<number, number>();
  for (let s = 0; s < RAIL.n; s += 2) {
    const x = RAIL.pos[s * 3] as number;
    const y = RAIL.pos[s * 3 + 1] as number;
    const z = RAIL.pos[s * 3 + 2] as number;
    for (const dx of [-7, 0, 7]) {
      for (const dz of [-7, 0, 7]) {
        const I = wrap(Math.floor((x + dx) / BLOCK_X) + 6, TILE_X / BLOCK_X) - 6;
        const J = wrap(Math.floor((z + dz) / BLOCK_Z), TILE_Z / BLOCK_Z);
        const key = I * 4096 + J;
        m.set(key, Math.min(m.get(key) ?? Number.POSITIVE_INFINITY, y));
      }
    }
  }
  return m;
})();
/**
 * How high a tower on block (I, J) may stand so the rail clears it (Infinity where the rail does
 * not pass). Blocks are taken tile-local, the plan repeating every tile.
 */
export function railCeiling(I: number, J: number): number {
  const li = wrap(I + 6, TILE_X / BLOCK_X) - 6;
  const lj = wrap(J, TILE_Z / BLOCK_Z);
  const y = under.get(li * 4096 + lj);
  return y === undefined ? Number.POSITIVE_INFINITY : y - GROUND - 9;
}

/** Trains: three of four carriages, each carriage this long, gliding on at this pace. */
export const TRAINS = 3;
export const CARS = 4;
export const CAR_LEN = 6.5;
export const TRAIN_SPEED = 13;
/** How far under the rail a carriage hangs (to its middle). */
export const HANG = 2.4;

/** Carriage `car` of train j at time t, tile-local: its middle, heading and lean. */
export function carAt(j: number, car: number, t: number): { c: Vec3; f: Vec3; bank: number } {
  const s = (j / TRAINS) * RAIL.length + TRAIN_SPEED * t - car * (CAR_LEN + 0.8);
  const r = railAt(s);
  // Hung under the rail, swung out a little by the bend.
  const side: Vec3 = [-r.f[2], 0, r.f[0]];
  const swing = Math.sin(r.bank) * HANG;
  return {
    c: [r.c[0] + side[0] * swing, r.c[1] - Math.cos(r.bank) * HANG, r.c[2] + side[2] * swing],
    f: r.f,
    bank: r.bank,
  };
}

/** The stations: four, evenly round the loop. */
export const STATIONS = [0.06, 0.31, 0.56, 0.81].map((k) => k * RAIL.length);
