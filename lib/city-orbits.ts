/*
 * Rings of ships round the monuments (docs/specs/art-city.md, "Alive quarters", 2026-11-14): "some
 * streams move in circular, curving paths: rings of ships orbiting the big monuments and landmark
 * buildings (temples, domes, Nova Cores, the tall landmarks, the Indian super-talls). One-way loops
 * at one or two heights per monument, smooth curves, with a few spiralling up or down."
 *
 * Each monument gets an orbit at a constant radius, a little outside its reach, at the lowest height
 * over every roof round it by eight that is clear of the street channels' heights (they cross the
 * streets), the big ships' lines, the express lanes and every ring set; about half get a second,
 * higher ring flying the other way, and about a third fly their first as a spiral, climbing two
 * turns and fading out at the top to come in again at the foot. All under the express lanes (108),
 * so under the flocks, the high currents and the stations. Heights are found per tile copy (the
 * towers round a monument differ from copy to copy) and kept. Light, mellow: the ships' lights a
 * steady glow, lane lights under them swelling slowly the way they fly. Pure: no three.js, no DOM.
 */

import { hash, smooth, type Vec3 } from './bigbang';
import { type Ahead, laneFree, QUARTER_TONE, type TowerAt } from './city-alive-base';
import { OUTLIERS } from './city-currents';
import {
  BLOCK_X,
  BLOCK_Z,
  boxDist,
  C,
  GROUND,
  type Item,
  mix,
  mixId,
  nearest,
  TAU,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import { ringSets } from './city-rings';

const G = GROUND;

/** A monument, tile-local: its middle, how far it reaches from it, its quarter. */
export type Monument = { x: number; z: number; r: number; d: string };

/** An orbit: round (cx, cz) at radius r, at height y (climbing `rise` over `turns` for a spiral). */
export type Orbit = {
  cx: number;
  cz: number;
  r: number;
  y: number;
  rise: number;
  /** A spiral flying down from its top rather than up from its foot. */
  down: boolean;
  turns: number;
  sgn: 1 | -1;
  speed: number;
  gap: number;
  d: string;
  key: number;
};

/** How far outside a monument's reach its orbit flies, and over the roofs round it. */
export const ORBIT_OUT = 7;
export const ORBIT_OVER = 8;
/** The highest an orbit flies: under the express lanes (112) by four. */
export const ORBIT_TOP = 104;
/** How far a spiral climbs. */
export const SPIRAL_RISE = 14;

/** Whether height y is clear for an orbit of radius r round (x, z), tile-local, in quarter d. */
function clearAt(x: number, z: number, r: number, y: number, d: string): boolean {
  if (!laneFree(y - 1, d === 'market') || !laneFree(y + 1, d === 'market')) return false;
  for (const O of OUTLIERS) {
    // The line it flies along, and how near the orbit's circle comes to it.
    const off = O.axis === 2 ? x - nearest(O.off, x, O.every) : z - nearest(O.off, z, O.every);
    if (Math.abs(off) < r + O.len / 2 + 4 && Math.abs(y - O.y) < 12) return false;
  }
  for (const R of ringSets()) {
    const big = Math.max(...R.radii);
    // A flat set is only its own thickness high (as lib/city-rings.test.ts measures them).
    const top = Math.abs(R.n[1]) > 0.9 ? 1.5 : big;
    const near = Math.hypot(R.c[0] - x, R.c[2] - z) < r + big + 4;
    if (near && Math.abs(R.c[1] - (G + y)) < top + 4) return false;
  }
  return true;
}

/** The highest roof whose block meets the circle of radius r (± 3) round (x, z), in the copy at (I0, J0). */
function roofRound(
  x: number,
  z: number,
  r: number,
  I0: number,
  J0: number,
  towerAt: TowerAt,
): number {
  let top = 0;
  const i0 = Math.floor((x - r - 4) / BLOCK_X);
  const i1 = Math.floor((x + r + 4) / BLOCK_X);
  const j0 = Math.floor((z - r - 4) / BLOCK_Z);
  const j1 = Math.floor((z + r + 4) / BLOCK_Z);
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++) {
      const tw = towerAt(I0 + i, J0 + j);
      if (tw.h <= 0) continue;
      const lx = tw.x - I0 * BLOCK_X;
      const lz = tw.z - J0 * BLOCK_Z;
      const dx = Math.max(0, Math.abs(lx - x) - tw.hx);
      const dz = Math.max(0, Math.abs(lz - z) - tw.hz);
      const near = Math.hypot(dx, dz);
      const far = Math.hypot(Math.abs(lx - x) + tw.hx, Math.abs(lz - z) + tw.hz);
      if (near < r + 3 && far > r - 3) top = Math.max(top, tw.h);
    }
  return top;
}

const orbitCache = new Map<string, Orbit[]>();
/**
 * Monument mi's orbits in the tile copy whose first block is (I0, J0): one or two rings, the first
 * maybe a spiral, at heights clear of the roofs round it and of every other way of the sky.
 */
export function orbitsOf(
  M: Monument,
  mi: number,
  I0: number,
  J0: number,
  towerAt: TowerAt,
): Orbit[] {
  const ck = `${mi} ${I0} ${J0}`;
  const had = orbitCache.get(ck);
  if (had) return had;
  const out: Orbit[] = [];
  const r = M.r + ORBIT_OUT;
  const base = roofRound(M.x, M.z, r, I0, J0, towerAt) + ORBIT_OVER;
  const key = mixId(mi * 131 + 7, wrap(I0 * 31 + J0, 99991));
  const spiral = hash(key, 981) < 0.35;
  const free = (y0: number, rise: number) => {
    for (let y = y0; y <= y0 + rise; y += 1) if (!clearAt(M.x, M.z, r, y, M.d)) return false;
    return true;
  };
  let y1 = -1;
  for (let y = Math.max(base, 18); y + (spiral ? SPIRAL_RISE : 0) <= ORBIT_TOP; y += 1)
    if (free(y, spiral ? SPIRAL_RISE : 0)) {
      y1 = y;
      break;
    }
  const sgn: 1 | -1 = hash(key, 982) < 0.5 ? 1 : -1;
  const ring = (y: number, rise: number, s: 1 | -1, n: number): Orbit => ({
    cx: M.x,
    cz: M.z,
    r,
    y,
    rise,
    down: rise > 0 && hash(key, 987) < 0.5,
    turns: rise > 0 ? 2 : 1,
    sgn: s,
    speed: 11 + 3 * hash(key, 983 + n),
    gap: 12,
    d: M.d,
    key: key + n,
  });
  if (y1 >= 0) {
    out.push(ring(y1, spiral ? SPIRAL_RISE : 0, sgn, 0));
    if (hash(key, 984) < 0.5) {
      const from = y1 + (spiral ? SPIRAL_RISE : 0) + 12;
      for (let y = from; y <= ORBIT_TOP; y += 1)
        if (free(y, 0)) {
          out.push(ring(y, 0, sgn === 1 ? -1 : 1, 1));
          break;
        }
    }
  }
  if (orbitCache.size > 2000) orbitCache.clear();
  orbitCache.set(ck, out);
  return out;
}

/** How far over its foot an orbit flies `a` along its path: up a spiral, or down one. */
export function orbitClimb(O: Orbit, a: number): number {
  const u = a / orbitLength(O);
  return O.rise * (O.down ? 1 - u : u);
}
/** How long an orbit's path is. */
export const orbitLength = (O: Orbit) => TAU * O.r * O.turns;
/** How many ships fly it. */
export const orbitShips = (O: Orbit) => Math.max(3, Math.floor(orbitLength(O) / O.gap));

/**
 * Ship i of an orbit at time t (tile-local): its place, the way it flies, how much it shows (a
 * spiral's fade in at its foot and out at its top; a ring's always).
 */
export function orbitShip(O: Orbit, i: number, t: number): { p: Vec3; f: Vec3; k: number } {
  const L = orbitLength(O);
  const n = orbitShips(O);
  const a = wrap((i * L) / n + O.sgn * O.speed * t + hash(O.key, 985) * L, L);
  const th = a / O.r + hash(O.key, 986) * TAU;
  const c = Math.cos(th);
  const s = Math.sin(th);
  return {
    p: [O.cx + c * O.r, G + O.y + orbitClimb(O, a), O.cz + s * O.r],
    f: [-s * O.sgn, ((O.down ? -1 : 1) * O.rise) / L, c * O.sgn],
    k: O.rise > 0 ? smooth(Math.min(a, L - a) / 14) : 1,
  };
}

const DASH = 6;
const LANE_STEP = 3.2;

/** An orbit in the copy moved by (ox, oz), for the Ship's renderer: its ships and its lane lights. */
export function orbitItem(O: Orbit, ox: number, oz: number, eye: Vec3, t: number): Item {
  const n = orbitShips(O);
  const ships = n * DASH;
  const L = orbitLength(O);
  const lanes = Math.floor(L / LANE_STEP);
  const tone = QUARTER_TONE[O.d] ?? C.warm;
  const lean = 0.5 + 0.5 * Math.sin(0.05 * t + O.key * 0.01);
  const col = mix(tone, C.white, 0.15 + 0.2 * lean);
  const lo: Vec3 = [ox + O.cx - O.r, G + O.y - 1, oz + O.cz - O.r];
  const hi: Vec3 = [ox + O.cx + O.r, G + O.y + O.rise + 1, oz + O.cz + O.r];
  return {
    d: boxDist(eye, lo, hi),
    gid: mixId(O.key, 9901),
    count: ships + lanes,
    weight: 1.7,
    probe: [0, 1, 2, 3].map((q) => {
      const a = (q / 4) * TAU;
      return [ox + O.cx + Math.cos(a) * O.r, G + O.y, oz + O.cz + Math.sin(a) * O.r] as Vec3;
    }),
    site: (s, o) => {
      if (s < ships) {
        const S = orbitShip(O, Math.floor(s / DASH), t);
        if (S.k <= 0.01) return false;
        const g = s % DASH;
        // Nose ahead, two wingtips, a tail of three behind.
        const back = g === 0 ? -0.9 : g < 3 ? 0.4 : 0.6 + (g - 3) * 0.9;
        const side = g === 1 ? 1.1 : g === 2 ? -1.1 : 0;
        o[0] = ox + S.p[0] - S.f[0] * back + S.f[2] * side;
        o[1] = S.p[1];
        o[2] = oz + S.p[2] - S.f[2] * back - S.f[0] * side;
        const light = (g === 0 ? 0.7 : g < 3 ? 0.45 : 0.4 * (1 - (g - 3) / 3)) * S.k;
        o[3] = col[0] * light;
        o[4] = col[1] * light;
        o[5] = col[2] * light;
        return true;
      }
      const q = s - ships;
      const along = (q + 0.5) * LANE_STEP;
      const th = along / O.r + hash(O.key, 986) * TAU;
      o[0] = ox + O.cx + Math.cos(th) * O.r;
      o[1] = G + O.y + orbitClimb(O, along) - 0.8;
      o[2] = oz + O.cz + Math.sin(th) * O.r;
      const wave = 0.5 + 0.5 * Math.cos((TAU * (along - 0.6 * O.speed * t)) / 40);
      const k = 0.05 + 0.1 * wave;
      o[3] = col[0] * k;
      o[4] = col[1] * k;
      o[5] = col[2] * k;
      return true;
    },
  };
}

/** The orbits round the monuments within sight. */
export function orbitItems(
  eye: Vec3,
  t: number,
  R: number,
  monuments: Monument[],
  towerAt: TowerAt,
  ahead: Ahead,
  out: Item[],
) {
  const ox0 = nearest(0, eye[0], TILE_X);
  monuments.forEach((M, mi) => {
    for (const ox of [ox0 - TILE_X, ox0, ox0 + TILE_X]) {
      const x = ox + M.x;
      if (Math.abs(x - eye[0]) > R + 40) continue;
      const z = nearest(M.z, eye[2], TILE_Z);
      if (Math.abs(z - eye[2]) > R + 40) continue;
      if (!ahead(x, z, M.r + 20) && eye[1] < G + 80) continue;
      const oz = z - M.z;
      const I0 = Math.round(ox / BLOCK_X);
      const J0 = Math.round(oz / BLOCK_Z);
      for (const O of orbitsOf(M, mi, I0, J0, towerAt)) {
        const it = orbitItem(O, ox, oz, eye, t);
        if (it.d < R) out.push(it);
      }
    }
  });
}
