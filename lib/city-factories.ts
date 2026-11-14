/*
 * The Studio's factories spread through the City of Dreams (docs/specs/art-city.md, "Factories in
 * the city"): the Industrial quarter keeps its landmark foundry and two works, and the other
 * factories stand singly where they make sense, each with a little context so it belongs there:
 * a lit yard, a chimney breathing slow steam, and a conveyor of light running to its neighbour.
 *
 * 2026-11-13: "think how factories can be better integrated not all together."
 *
 * Everything is data (FACTORY_SITES, tile-local); never two on neighbouring blocks. Light is mellow:
 * the conveyor's pulses glide, the chimney's lamp breathes, the steam drifts. Pure: no three.js,
 * no DOM.
 */

import type { RGB, Vec3 } from './bigbang';
import {
  BLOCK_X,
  BLOCK_Z,
  boxDist,
  C,
  frac,
  GROUND,
  type Item,
  lerp,
  mix,
  mixId,
  scale,
  TAU,
  TILE_I,
  TILE_J,
  wrap,
} from './city-grid';

/** A factory on its own block, tile-local, and what it is doing there. */
export type FactorySite = {
  /** Tile-local column (-6..5) and row (0..55). */
  li: number;
  lj: number;
  /** Which of the Studio's factories (lib/golden-buildings.ts FACTORIES). */
  i: number;
  /** Why it stands here, for the map and the spec. */
  role: string;
  /** Its context's hue: the yard, the conveyor, the chimney's lamp. */
  hue: RGB;
  /** Drawn in this colour instead of the factories' own (the data foundry's green). */
  tint?: RGB;
  /** The conveyor runs toward the avenue (along x), or along z (+1 / -1), to its neighbour. */
  conveyor: { axis: 0 | 2; dir: 1 | -1 };
};

/** The Studio's factory names, by index (lib/golden-buildings.ts). */
export const FACTORY_NAMES = [
  'Sawtooth',
  'Foundry',
  'Assembly',
  'Workshops',
  'Solar',
  'Cement works',
  'Kilns',
];

const CODE_GREEN: RGB = [0.22, 1, 0.42];

/**
 * Where the factories stand. The Industrial quarter's landmark foundry is on its plaza
 * (lib/city-game.ts LANDMARKS); these are the rest, one to a block, none touching another.
 */
export const FACTORY_SITES: FactorySite[] = [
  // The Industrial quarter keeps two works besides its foundry, apart from each other.
  {
    li: -6,
    lj: 33,
    i: 0,
    role: 'Industrial quarter',
    hue: C.amber,
    conveyor: { axis: 0, dir: 1 },
  },
  {
    li: -2,
    lj: 38,
    i: 3,
    role: 'Industrial quarter',
    hue: C.amber,
    conveyor: { axis: 2, dir: -1 },
  },
  // By the canal: cement works on the quay, the conveyor out over the water.
  {
    li: 4,
    lj: 20,
    i: 5,
    role: 'on the canal quay',
    hue: C.violet,
    conveyor: { axis: 2, dir: -1 },
  },
  // At the city's edge, below the Heights' towers: an assembly hall feeding them.
  {
    li: -6,
    lj: 19,
    i: 2,
    role: 'at the edge, by the Heights',
    hue: C.cyan,
    conveyor: { axis: 0, dir: 1 },
  },
  // Solar works at the desert's edge, among the pyramids.
  {
    li: -6,
    lj: 42,
    i: 4,
    role: 'solar works at the desert’s edge',
    hue: C.sand,
    conveyor: { axis: 0, dir: 1 },
  },
  // Kilns beside the domes: the glassworks that make their panes.
  {
    li: 5,
    lj: 35,
    i: 6,
    role: 'glassworks for the domes',
    hue: C.leaf,
    conveyor: { axis: 0, dir: -1 },
  },
  // The Green Code quarter's data foundry, drawn in the quarter's green.
  {
    li: 3,
    lj: 52,
    i: 1,
    role: 'data foundry',
    hue: CODE_GREEN,
    tint: CODE_GREEN,
    conveyor: { axis: 0, dir: -1 },
  },
];

const siteMap = new Map(FACTORY_SITES.map((s) => [s.li * 4096 + s.lj, s]));
/** The factory on block (I, J), if one stands there (the plan repeating every tile). */
export function factoryAt(I: number, J: number): FactorySite | null {
  const li = wrap(I + TILE_I / 2, TILE_I) - TILE_I / 2;
  const lj = wrap(J, TILE_J);
  return siteMap.get(li * 4096 + lj) ?? null;
}

/** What the context needs of the neighbour the conveyor runs to: its walls (or none). */
export type Neighbour = { x: number; z: number; hx: number; hz: number; h: number } | null;

const YARD = { hx: BLOCK_X / 2 - 3.5, hz: BLOCK_Z / 2 - 3.5 };
export const CHIMNEY = { h: 34, r: 0.8 };
const STEAM = 90;
const CONVEYOR_Y = 7;

/**
 * A factory's context on its block round (x, z): its yard's edge lit low on the ground with a lamp
 * at each corner, a chimney at one corner (four edges, a rim, a slow red lamp, steam drifting up and
 * fading), and a conveyor of light on two rails from the yard to its neighbour's wall, soft pulses
 * gliding along it.
 */
export function factoryContextItem(
  site: FactorySite,
  at: { x: number; z: number; k: number },
  nb: Neighbour,
  eye: Vec3,
  t: number,
): Item {
  const { x, z } = at;
  const { hx, hz } = YARD;
  const hue = site.hue;
  // A tinted site (the data foundry) keeps to its one hue: every colour turned to it.
  const tint = site.tint;
  const tone = (c: RGB): RGB => (tint ? scale(tint, (c[0] + c[1] + c[2]) / 3) : c);
  // The chimney at the yard's corner away from the conveyor.
  const cs = site.conveyor.axis === 0 ? -site.conveyor.dir : 1;
  const chx = x + cs * (hx - 2.5);
  const chz = z - (hz - 2.5);
  // The conveyor: from the yard's edge to the neighbour's wall (or the next block's edge).
  const { axis, dir } = site.conveyor;
  const half = axis === 0 ? hx : hz;
  const c0 = (axis === 0 ? x : z) + dir * half;
  const reach = axis === 0 ? BLOCK_X : BLOCK_Z;
  let c1 = c0 + dir * 7;
  if (nb) c1 = axis === 0 ? nb.x - dir * nb.hx : nb.z - dir * nb.hz;
  if ((c1 - c0) * dir < 2 || (c1 - c0) * dir > reach) c1 = c0 + dir * 7;
  const len = Math.abs(c1 - c0);
  const conv = Math.max(8, Math.ceil(len / 0.35)) * 2;
  const yard = Math.ceil((4 * (hx + hz)) / 0.6);
  const edge = Math.ceil(CHIMNEY.h / 0.5);
  const n0 = yard + 16;
  const n1 = n0 + 4 * edge + 24;
  const n2 = n1 + STEAM;
  const top = GROUND + CHIMNEY.h;
  const cv = (u: number, side: number): Vec3 => {
    const s = lerp(c0, c1, u);
    return axis === 0
      ? [s, GROUND + CONVEYOR_Y, z + side * 0.6]
      : [x + side * 0.6, GROUND + CONVEYOR_Y, s];
  };
  return {
    d: boxDist(eye, [x - hx, GROUND, z - hz], [x + hx, top + 8, z + hz]),
    gid: mixId(at.k, 6611),
    count: n2 + conv,
    weight: 1.5,
    probe: [[chx, top, chz], [x, GROUND + 2, z], cv(0.5, 0)],
    site: (s, o) => {
      if (s < yard) {
        // The yard's edge, a low dashed line, every fourth dash a little brighter.
        const e = ((s + 0.5) / yard) * 4 * (hx + hz);
        const P = 2 * (hx + hz);
        const m = e % P;
        const [px, pz] =
          m < 2 * hx ? [-hx + m, e < P ? -hz : hz] : [e < P ? hx : -hx, -hz + (m - 2 * hx)];
        if (s % 3 === 2) return false;
        [o[0], o[1], o[2]] = [x + px, GROUND + 0.05, z + pz];
        [o[3], o[4], o[5]] = scale(hue, s % 12 < 2 ? 0.3 : 0.16);
        return true;
      }
      if (s < n0) {
        // A lamp at each corner of the yard, four lights each on a short post.
        const q = s - yard;
        const c = q >> 2;
        const [sx, sz] = [c === 1 || c === 2 ? 1 : -1, c >= 2 ? 1 : -1];
        [o[0], o[1], o[2]] = [x + sx * hx, GROUND + 0.8 + (q & 3) * 0.8, z + sz * hz];
        [o[3], o[4], o[5]] = scale(tone(mix(C.warm, hue, 0.3)), (q & 3) === 3 ? 0.55 : 0.18);
        return true;
      }
      if (s < n1) {
        const q = s - n0;
        if (q < 4 * edge) {
          // The chimney's four edges, darker low, warmer near its mouth.
          const c = q % 4;
          const y = GROUND + ((Math.floor(q / 4) + 0.5) * CHIMNEY.h) / edge;
          const r = CHIMNEY.r * (1.25 - 0.25 * ((y - GROUND) / CHIMNEY.h));
          o[0] = chx + (c === 1 || c === 2 ? r : -r);
          o[1] = y;
          o[2] = chz + (c >= 2 ? r : -r);
          const u = (y - GROUND) / CHIMNEY.h;
          [o[3], o[4], o[5]] = scale(tone(mix(C.steel, C.amber, u * 0.6)), 0.16 + 0.14 * u);
          return true;
        }
        const j = q - 4 * edge;
        if (j < 20) {
          const a = (j / 20) * TAU;
          [o[0], o[1], o[2]] = [chx + Math.cos(a), top, chz + Math.sin(a)];
          [o[3], o[4], o[5]] = scale(tone(C.amber), 0.32);
          return true;
        }
        // Its lamp, breathing slowly (about six seconds), never a flash.
        [o[0], o[1], o[2]] = [chx + (j - 21) * 0.15, top + 0.9, chz];
        [o[3], o[4], o[5]] = scale(tone(C.red), 0.25 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.05)));
        return true;
      }
      if (s < n2) {
        // Steam: puffs rising from the mouth and widening, drifting, fading out by 14 up.
        const q = s - n1;
        const u = frac(t * 0.07 + q / STEAM);
        const a = q * 2.4;
        const r = 0.6 + u * 3.2;
        o[0] = chx + Math.cos(a) * r + u * 3;
        o[1] = top + 1 + u * 14;
        o[2] = chz + Math.sin(a) * r;
        [o[3], o[4], o[5]] = scale(tone(C.white), 0.16 * Math.sin(Math.PI * u) * (1 - u * 0.5));
        return true;
      }
      // The conveyor: two faint rails, and pulses gliding along them toward the neighbour.
      const q = s - n2;
      const side = q & 1 ? 1 : -1;
      const u = ((q >> 1) + 0.5) / (conv / 2);
      [o[0], o[1], o[2]] = cv(u, side);
      const run = frac(u * (len / 6) - t * 0.35);
      const pulse = Math.max(0, 1 - Math.abs(run - 0.5) * 5) ** 2;
      [o[3], o[4], o[5]] = scale(tone(mix(hue, C.white, 0.2 * pulse)), 0.1 + 0.42 * pulse);
      return true;
    },
  };
}
