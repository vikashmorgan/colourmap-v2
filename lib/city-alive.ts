/*
 * Alive quarters (docs/specs/art-city.md, "Alive quarters", 2026-11-14): the ordinary towers of the
 * quarters stand much taller and are joined at height by sky bridges; lights hang across the
 * streets of every quarter (Chinatown's and the Indian quarter's had theirs); the Canals' own
 * buildings stand as tall as the Heights'; the Indian quarter rises and a few super-tall spires
 * from the Studio's collection stand over it; and highways of ships fly just over the low roofs.
 * Gates, banners, turned signs, the plazas' rings and the canal bridges have their own modules
 * (lib/city-gates.ts, lib/city-banners.ts, lib/city-plazas.ts, lib/city-canal-bridges.ts); this
 * one gathers them for the Ship's renderer. Pure: no three.js, no DOM; the towers come from
 * lib/city-game.ts, handed in (so no cycle).
 *
 * 2026-11-14: "ordinary towers in the quarters much taller, more alive, connected at height: sky
 * bridges and walkways between towers", "hanging lights across streets in other quarters", "in
 * the canals quarter make the cool unique buildings big and huge, at the scale of the heights",
 * "make the indian quarter much taller overall, and add a few unique super-tall towers", and
 * "highways of traffic on the higher layers of the city, flying above the lower buildings".
 *
 * Every height is kept clear of the ship currents (lib/city-currents.ts, lib/city-flow.ts): the
 * towers stay under the high currents' loops (142 and up) and the big ships' lines; whatever crosses
 * a street keeps LANE_CLEAR from every street channel's height. Light is mellow: a slow drift.
 */

import { hash, type Vec3 } from './bigbang';
import {
  type Ahead,
  type AliveBlock,
  offAvenue,
  quarterTones,
  type TowerAt,
  tileCol,
} from './city-alive-base';
import { bannerItems } from './city-banners';
import { stretchSite } from './city-big';
import { BUILDING_KINDS } from './city-buildings';
import { canalBridgeItems } from './city-canal-bridges';
import {
  HIGH_STREAMS,
  type MarketStream,
  OUTLIERS,
  SKY_STREAMS,
  skyStreamOver,
} from './city-currents';
import { type Design, designMesh, quarterPalette } from './city-designs';
import { gateItems } from './city-gates';
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
  TILE_J,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import { istanbulItems } from './city-istanbul';
import { highwayItem } from './city-market';
import { type Monument, orbitItems } from './city-orbits';
import { type PlazaSpot, plazaItems } from './city-plazas';
import { type StrokeSet, Strokes, strokeItem } from './city-strokes';

const G = GROUND;

export type { Ahead, AliveBlock, TowerAt } from './city-alive-base';
export { LANE_CLEAR, LANE_HEIGHTS, laneFree, QUARTER_TONE, quarterTones } from './city-alive-base';

/* ---------- taller towers ---------- */

/** The highest a raised tower stands: the high currents' loops dip to 142, ten clear over a roof. */
export const ALIVE_CAP = 128;
/** How far under a big ship's line a raised tower stays. */
const OUTLIER_CLEAR = 14;
/** The cap of a column (tile-local), under any big ship flying along it. */
export function columnCap(I: number): number {
  const li = tileCol(I);
  let cap = ALIVE_CAP;
  for (const O of OUTLIERS) {
    if (O.axis !== 2) continue;
    const x = wrap(O.off + TILE_X / 2, TILE_X) - TILE_X / 2;
    const lo = li * BLOCK_X;
    if (x + O.len / 2 > lo - 2 && x - O.len / 2 < lo + BLOCK_X + 2)
      cap = Math.min(cap, O.y - OUTLIER_CLEAR);
  }
  return cap;
}

/**
 * How tall each quarter's ordinary towers now stand: from lo to hi, and about `sky` of them taller
 * still, up to skyHi (2026-11-14: "much taller, more alive"). A tower never comes out lower.
 */
export const RISE: Record<string, { lo: number; hi: number; sky: number; skyHi: number }> = {
  indian: { lo: 36, hi: 72, sky: 0.12, skyHi: 96 },
  oriental: { lo: 40, hi: 84, sky: 0.22, skyHi: 106 },
  heights: { lo: 92, hi: 124, sky: 0.2, skyHi: 128 },
  canals: { lo: 38, hi: 84, sky: 0.2, skyHi: 112 },
  golden: { lo: 42, hi: 92, sky: 0.18, skyHi: 118 },
  temples: { lo: 22, hi: 44, sky: 0.08, skyHi: 64 },
  industrial: { lo: 36, hi: 90, sky: 0.2, skyHi: 116 },
  domes: { lo: 32, hi: 82, sky: 0.18, skyHi: 108 },
  market: { lo: 44, hi: 104, sky: 0.2, skyHi: 122 },
};

/** How far under a low-roof highway (lib/city-currents.ts SKY_STREAMS) a raised roof stays. */
export const HIGHWAY_CLEAR = 8;

/**
 * Tower k of quarter d in column I, h tall as planned: how tall it stands now (never lower). At
 * (x, z), `half` its widest half: never up into a low-roof highway over it.
 */
export function aliveHeight(
  d: string,
  k: number,
  h: number,
  I: number,
  x = Number.NaN,
  z = Number.NaN,
  half = 0,
): number {
  const R = RISE[d];
  if (!R) return h;
  let want = R.lo + (R.hi - R.lo) * hash(k, 901) ** 1.2;
  if (hash(k, 902) < R.sky) want = Math.max(want, R.hi + (R.skyHi - R.hi) * hash(k, 903));
  // The first column beside the avenue's own towers keeps its height: the quarters step up away
  // from the avenue, whose walls and galleries keep their own levels (lib/city-avenue.ts).
  if (!risesAt(I)) return h;
  if (Number.isFinite(x)) {
    const hw = skyStreamOver(x - nearest(0, x, TILE_X), wrap(z, TILE_Z), half + 2);
    if (hw !== null) want = Math.min(want, hw - HIGHWAY_CLEAR);
  }
  return Math.max(h, Math.min(want, columnCap(I)));
}
/** Whether a column's towers rise: all but the avenue's and the first beside it. */
export function risesAt(I: number): boolean {
  const li = tileCol(I);
  return li !== 1 && li !== -2 && li !== 0 && li !== -1;
}

/* ---------- the Canals' own buildings, as tall as the Heights' ---------- */

/** How tall the Canals' unique buildings stand: the Heights' towers' range. */
export const CANAL_UNIQUE = { lo: 92, hi: 124 };
/**
 * One of the Studio's twenty in the Canals, stretched upward to the Heights' scale (2026-11-14:
 * "big and huge ... so they dominate the canal skyline"): its footprint kept (so the canal streets
 * still breathe), its height 92 to 124, under the metro and any big ship's line.
 */
export function canalDesign(g: Design, k: number, ceiling: number, I: number): Design {
  const want = CANAL_UNIQUE.lo + (CANAL_UNIQUE.hi - CANAL_UNIQUE.lo) * hash(k, 905);
  const h = Math.min(want, columnCap(I), ceiling - 2);
  if (h <= g.h) return g;
  return { ...g, h, sy: h / g.h };
}

/* ---------- the Indian quarter's super-tall spires ---------- */

/** A super-tall spire: its block (tile-local), the Studio building it is (BUILDING_KINDS), its top. */
export type Spire = { name: string; I: number; J: number; kind: number; top: number };
/**
 * The Indian quarter's spires (2026-11-14: "a few super-tall towers from the building collection,
 * temple-spire or lotus-like"): the Shikhara, the Domed Hall and the Hanging Gardens, stretched up
 * to 112 to 126, each on a block of its own kept open, spread over the quarter, off the avenue, out
 * from under the metro, off the big ship's column and the shikhara landmark's plaza. Under the high currents (142) by ten.
 */
export const INDIAN_SPIRES: Spire[] = [
  { name: 'Saffron Shikhara', I: -3, J: 8, kind: 3, top: 126 },
  { name: 'Garden of Lamps', I: -2, J: 13, kind: 16, top: 118 },
  { name: 'Marigold Dome', I: -4, J: 15, kind: 4, top: 112 },
];
/** The spire on block (I, J), if one stands there. */
export function spireAt(I: number, J: number): Spire | null {
  const li = tileCol(I);
  const lj = wrap(J, TILE_J);
  return INDIAN_SPIRES.find((s) => s.I === li && s.J === lj) ?? null;
}
/** Grains a spire is drawn with: enough to read from far off. */
export const SPIRE_SITES = 2600;
/** A spire's stretch: across (to fill its block) and up (to its top). */
export function spireStretch(s: Spire): { sh: number; sv: number; r: number } {
  const spec = BUILDING_KINDS[s.kind];
  const r0 = spec?.site.r ?? 10;
  const sh = Math.min(1.7, 11 / r0);
  return { sh, sv: s.top / (spec?.height ?? 20), r: r0 * sh };
}

function spireItems(eye: Vec3, t: number, R: number, ahead: Ahead, out: Item[]) {
  const ox = nearest(0, eye[0], TILE_X);
  INDIAN_SPIRES.forEach((s, si) => {
    const { sh, sv, r } = spireStretch(s);
    const lx = (s.I + 0.5) * BLOCK_X + ox;
    const lz0 = (s.J + 0.5) * BLOCK_Z;
    const z = nearest(lz0, eye[2], TILE_Z);
    for (const x of [lx - TILE_X, lx, lx + TILE_X]) {
      if (Math.hypot(x - eye[0], z - eye[2]) > R + r) continue;
      if (!ahead(x, z, r + 10) && eye[1] < G + 80) continue;
      const P = {
        B: designMesh(s.kind),
        at: [x, G, z] as Vec3,
        sh,
        sv,
        palette: quarterPalette(mix(C.saffron, C.marigold, 0.4)),
      };
      out.push({
        d: boxDist(eye, [x - r, G, z - r], [x + r, G + s.top, z + r]),
        gid: mixId(si + 1, Math.round(x * 3 + z)),
        count: SPIRE_SITES,
        weight: 1.5,
        probe: [
          [x, G + s.top * 0.9, z],
          [x, G + s.top * 0.5, z],
          [x + r * 0.7, G + 3, z],
        ],
        site: (q, o) => stretchSite(P, q, t, eye, o),
      });
    }
  });
}

/* ---------- sky bridges and walkways between the towers ---------- */

/** The heights a sky bridge may cross at, over the street: all clear of the lanes. */
export const SKY_LEVELS = [38, 50, 64, 78, 92, 102];
/** About this share of each level is bridged, where both towers reach; at most three a pair. */
export const SKY_SHARE = 0.5;
const SKY_MAX = 3;
/**
 * The quarters whose towers are bridged here: Chinatown and the market have their own; the Heights'
 * one bridge a pair (lib/city-business.ts) gains these above and below it.
 */
const SKY_QUARTERS = new Set([
  'indian',
  'oriental',
  'heights',
  'canals',
  'golden',
  'temples',
  'industrial',
  'domes',
]);

/** A sky bridge: its deck along x (`axis` 0, from a to b at z = c) or along z (at x = c), its height. */
export type SkyBridge = {
  axis: 0 | 2;
  a: number;
  b: number;
  c: number;
  y: number;
  k: number;
  style: number;
  d: string;
};

/** A tower a bridge can land on: plain, a business tower, one of the Studio's buildings. */
const solid = (tw: AliveBlock) =>
  tw.shape === 'box' || tw.shape === 'business' || tw.shape === 'design';

/** The sky bridges from tower A to its neighbour B across the street (B at I + 1, or J + 1). */
export function skyBridges(A: AliveBlock, B: AliveBlock, axis: 0 | 2, out: SkyBridge[]) {
  if (!solid(A) || !solid(B) || A.d !== B.d || !SKY_QUARTERS.has(A.d)) return;
  if (!offAvenue(A.I) || !offAvenue(B.I)) return;
  const [a, b] = axis === 0 ? [A.x + A.hx, B.x - B.hx] : [A.z + A.hz, B.z - B.hz];
  if (b - a < 4) return;
  // Where their facing walls overlap, kept to the middle of the block (off the crossing streets).
  let lo: number;
  let hi: number;
  if (axis === 0) {
    const m = (A.J + 0.5) * BLOCK_Z;
    lo = Math.max(A.z - A.hz, B.z - B.hz, m - 9);
    hi = Math.min(A.z + A.hz, B.z + B.hz, m + 9);
  } else {
    const m = (A.I + 0.5) * BLOCK_X;
    lo = Math.max(A.x - A.hx, B.x - B.hx, m - 6);
    hi = Math.min(A.x + A.hx, B.x + B.hx, m + 6);
  }
  if (hi - lo < 5) return;
  const top = Math.min(A.h, B.h) - 5;
  let n = 0;
  SKY_LEVELS.forEach((y, li) => {
    if (n >= SKY_MAX || y > top) return;
    const key = mixId(A.k * 3 + axis, li);
    if (hash(key, 911) >= SKY_SHARE) return;
    n++;
    const c = lo + 2 + (hi - lo - 4) * hash(key, 912);
    out.push({ axis, a, b, c, y: G + y, k: key, style: Math.floor(hash(key, 913) * 3), d: A.d });
  });
}

const bridgeSets = new Map<number, StrokeSet>();
/**
 * A sky bridge's strokes, built once: its deck's edges and rails; a glass tube's rings (style 0),
 * a truss's zigzag (1) or a walkway's slender hanging arc under it (2); lamps along its deck.
 */
export function skyBridgeSet(B: SkyBridge): StrokeSet {
  const had = bridgeSets.get(B.k);
  if (had) return had;
  const S = new Strokes(0.45);
  const P = (s: number, side: number, dy: number): Vec3 =>
    B.axis === 0 ? [s, B.y + dy, B.c + side] : [B.c + side, B.y + dy, s];
  const w = B.style === 2 ? 0.9 : 1.3;
  for (const side of [-w, w]) {
    S.line(P(B.a, side, 0), P(B.b, side, 0), 0, 0.3);
    S.line(P(B.a, side, 1.1), P(B.b, side, 1.1), 0, 0.22);
  }
  const len = B.b - B.a;
  if (B.style === 0) {
    // A glass tube: rings every 2.4, a ridge over it.
    for (let s = B.a + 1.2; s < B.b; s += 2.4)
      S.curve(
        (u) => {
          const a = Math.PI * u;
          return P(s, -Math.cos(a) * w, 0.2 + Math.sin(a) * 2);
        },
        8,
        2,
        0.16,
      );
    S.line(P(B.a, 0, 2.2), P(B.b, 0, 2.2), 2, 0.2);
  } else if (B.style === 1) {
    // A truss: zigzag struts along each side.
    for (const side of [-w, w]) {
      const pts: Vec3[] = [];
      const m = Math.max(2, Math.round(len / 2.2));
      for (let i = 0; i <= m; i++) pts.push(P(B.a + (len * i) / m, side, i % 2 ? 1.1 : 0));
      S.poly(pts, 0, 0.18);
    }
  } else {
    // A walkway: a slender arc under its deck, curving up to its middle.
    for (const side of [-w, w])
      S.curve((u) => P(B.a + len * u, side, -2.2 * (2 * u - 1) ** 2), 12, 0, 0.18);
  }
  for (let s = B.a + 1; s < B.b; s += 3) S.dot(P(s, 0, 0.1), 1, 0.55);
  const built = S.build();
  if (bridgeSets.size > 4000) bridgeSets.clear();
  bridgeSets.set(B.k, built);
  return built;
}

/* ---------- hanging lights across the streets ---------- */

/** How often a street of each quarter is hung with lights (Chinatown and the Indian quarter have theirs). */
export const HANG_SHARE: Record<string, number> = {
  oriental: 0.45,
  heights: 0.3,
  canals: 0.45,
  golden: 0.4,
  temples: 0.4,
  industrial: 0.3,
  domes: 0.4,
  egypt: 0.35,
  market: 0.45,
  code: 0.25,
};
/** The heights a string of hanging lights is strung at, over the street. */
export const HANG_LEVELS = [24, 34, 46];
/** How far a lamp hangs under its cable, at the most. */
export const HANG_DROP = 3.2;

/** A string of hanging lights across a street along z: x0..x1 at height y, at z; its quarter. */
export type Hang = { x0: number; x1: number; y: number; z: number; k: number; d: string };

/** The strings across the street between tower A and its neighbour B at I + 1. */
export function hangsBetween(A: AliveBlock, B: AliveBlock, out: Hang[]) {
  const share = HANG_SHARE[A.d];
  if (!share || A.d !== B.d || !offAvenue(A.I) || !offAvenue(B.I)) return;
  const ok = (tw: AliveBlock) =>
    tw.shape === 'box' || tw.shape === 'business' || tw.shape === 'code';
  if (!ok(A) || !ok(B)) return;
  const x0 = A.x + A.hx;
  const x1 = B.x - B.hx;
  if (x1 - x0 < 4) return;
  const m = (A.J + 0.5) * BLOCK_Z;
  const lo = Math.max(A.z - A.hz, B.z - B.hz, m - 9);
  const hi = Math.min(A.z + A.hz, B.z + B.hz, m + 9);
  if (hi - lo < 4) return;
  // A Matrix tower sinks to under half its height and rises again (lib/city-rise.ts): under that.
  const low = (tw: AliveBlock) => tw.h * (tw.shape === 'code' ? 0.42 : 1);
  const top = Math.min(low(A), low(B)) - 3;
  HANG_LEVELS.forEach((y, li) => {
    const key = mixId(A.k * 7 + 5, li);
    if (y > top || hash(key, 921) >= share) return;
    out.push({ x0, x1, y: G + y, z: lo + 1 + (hi - lo - 2) * hash(key, 922), k: key, d: A.d });
  });
}

/** A lamp's shape in each quarter: globe, bell, cage, star, drop. */
const LAMP_SHAPE: Record<string, number> = {
  oriental: 3,
  heights: 0,
  canals: 0,
  golden: 1,
  temples: 4,
  industrial: 2,
  domes: 0,
  egypt: 4,
  market: 3,
  code: 2,
};

const hangSets = new Map<number, StrokeSet>();
/** A string of lights: its cable, sagging a little, and lamps on drops of two lengths, in its quarter's shape. */
export function hangSet(H: Hang): StrokeSet {
  const had = hangSets.get(H.k);
  if (had) return had;
  const S = new Strokes(0.5);
  const len = H.x1 - H.x0;
  const sag = Math.min(1.2, len * 0.06);
  const cable = (u: number): Vec3 => [H.x0 + len * u, H.y - sag * 4 * u * (1 - u), H.z];
  S.curve(cable, 10, 2, 0.12);
  const n = Math.max(2, Math.floor(len / 2.2));
  const shape = LAMP_SHAPE[H.d] ?? 0;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const top = cable(u);
    const drop = i % 2 ? HANG_DROP - 0.9 : HANG_DROP * 0.55;
    const c: Vec3 = [top[0], top[1] - drop, top[2]];
    S.line(top, [c[0], c[1] + 0.35, c[2]], 2, 0.06, 0.6);
    const tone = i % 3 === 2 ? 0 : 1;
    const r = 0.32;
    if (shape === 0) {
      for (let a = 0; a < 6; a++) {
        const th = (a / 6) * Math.PI * 2;
        S.dot([c[0] + Math.cos(th) * r, c[1], c[2] + Math.sin(th) * r], tone, 0.42);
      }
      S.dot([c[0], c[1] + r, c[2]], tone, 0.42);
      S.dot([c[0], c[1] - r, c[2]], tone, 0.5);
    } else if (shape === 1) {
      // A bell: wider at its foot.
      for (let a = 0; a < 6; a++) {
        const th = (a / 6) * Math.PI * 2;
        S.line(
          [c[0], c[1] + 0.35, c[2]],
          [c[0] + Math.cos(th) * 0.4, c[1] - 0.3, c[2] + Math.sin(th) * 0.4],
          tone,
          0.36,
          0.25,
        );
      }
    } else if (shape === 2) {
      // A cage: a little square lantern.
      for (const [dx, dz] of [
        [-r, -r],
        [r, -r],
        [r, r],
        [-r, r],
      ] as const)
        S.line(
          [c[0] + dx, c[1] + r, c[2] + dz],
          [c[0] + dx, c[1] - r, c[2] + dz],
          tone,
          0.36,
          0.25,
        );
      S.dot(c, 1, 0.55);
    } else if (shape === 3) {
      // A star: six points.
      for (let a = 0; a < 6; a++) {
        const th = (a / 6) * Math.PI * 2;
        S.line(c, [c[0] + Math.cos(th) * 0.45, c[1] + Math.sin(th) * 0.45, c[2]], tone, 0.36, 0.2);
      }
    } else {
      // A drop: a paper lamp, long.
      S.line([c[0], c[1] + 0.5, c[2]], [c[0], c[1] - 0.5, c[2]], tone, 0.45, 0.2);
      S.dot([c[0] + 0.25, c[1], c[2]], tone, 0.4);
      S.dot([c[0] - 0.25, c[1], c[2]], tone, 0.4);
    }
  }
  const built = S.build();
  if (hangSets.size > 4000) hangSets.clear();
  hangSets.set(H.k, built);
  return built;
}

/* ---------- highways over the low roofs ---------- */

/** The highways over the low roofs within sight (lib/city-currents.ts SKY_STREAMS). */
function skyHighwayItems(eye: Vec3, t: number, R: number, ahead: Ahead, out: Item[]) {
  const ox0 = nearest(0, eye[0], TILE_X);
  [...SKY_STREAMS, ...HIGH_STREAMS].forEach((S: MarketStream, i) => {
    const mid = (S.s0 + S.s1) / 2;
    const half = (S.s1 - S.s0) / 2;
    for (const ox of [ox0 - TILE_X, ox0, ox0 + TILE_X]) {
      const lx = S.axis === 2 ? ox + S.c : ox + mid;
      if (Math.abs(lx - eye[0]) > R + (S.axis === 0 ? half : 0)) continue;
      const lz = nearest(S.axis === 2 ? mid : S.c, eye[2], TILE_Z);
      const oz = lz - (S.axis === 2 ? mid : S.c);
      if (Math.abs(lz - eye[2]) > R + (S.axis === 2 ? half : 0)) continue;
      if (!ahead(lx, lz, half + 10)) continue;
      const it = highwayItem(S, ox, oz, eye, t, mixId(i + 31, Math.round(oz / BLOCK_Z)));
      if (it.d < R) out.push(it);
    }
  });
}

/* ---------- everything alive near the eye ---------- */

/**
 * The alive quarters' items near the eye: the spires, sky bridges, hanging lights and highways
 * here; the gates, banners and turned signs, the plazas' rings and ramps and the canal bridges from
 * their own modules. Details within `near`; the spires and highways out to `far`.
 */
export function aliveItems(
  eye: Vec3,
  t: number,
  near: number,
  far: number,
  towerAt: TowerAt,
  ahead: Ahead,
  out: Item[],
  plazas: PlazaSpot[] = [],
  monuments: Monument[] = [],
) {
  spireItems(eye, t, far, ahead, out);
  skyHighwayItems(eye, t, Math.min(far, near + 120), ahead, out);
  const I0 = Math.floor((eye[0] - near) / BLOCK_X);
  const I1 = Math.floor((eye[0] + near) / BLOCK_X);
  const J0 = Math.floor((eye[2] - near) / BLOCK_Z);
  const J1 = Math.floor((eye[2] + near) / BLOCK_Z);
  const bridges: SkyBridge[] = [];
  const hangs: Hang[] = [];
  for (let I = I0; I <= I1; I++)
    for (let J = J0; J <= J1; J++) {
      const A = towerAt(I, J);
      if (!ahead(A.x, A.z, 30)) continue;
      const E = towerAt(I + 1, J);
      skyBridges(A, E, 0, bridges);
      skyBridges(A, towerAt(I, J + 1), 2, bridges);
      hangsBetween(A, E, hangs);
    }
  for (const B of bridges) {
    const S = skyBridgeSet(B);
    const it = strokeItem(S, 0, 0, quarterTones(B.d, t, B.k), 1, eye, t, mixId(B.k, 9301));
    if (it.d < near) out.push(it);
  }
  for (const H of hangs) {
    const S = hangSet(H);
    const it = strokeItem(
      S,
      0,
      0,
      quarterTones(H.d, t, H.k),
      1,
      eye,
      t,
      mixId(H.k, 9302),
      2.4,
      0.25,
    );
    if (it.d < near) out.push(it);
  }
  gateItems(eye, t, Math.min(far, near + 120), towerAt, ahead, out);
  bannerItems(eye, t, near, towerAt, ahead, out);
  plazaItems(eye, t, Math.min(far, near + 140), plazas, ahead, out);
  canalBridgeItems(eye, t, near, towerAt, ahead, out);
  orbitItems(eye, t, Math.min(far, near + 160), monuments, towerAt, ahead, out);
  istanbulItems(eye, t, near, far, towerAt, ahead, out);
}
