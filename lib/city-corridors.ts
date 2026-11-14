/*
 * The racing corridors (docs/specs/art-city.md, "Racing corridors and the Heights–Golden
 * bridges", 2026-11-14). Pure: no three.js, no DOM.
 *
 * 2026-11-14, the user: "open up and enlarge the main long streets, so it creates other long
 * corridors like the central horizontal one on the map, but three buildings above and three below.
 * Make that long road larger, from far left to far right. It will be used for innovative racing and
 * flying in fun ways, where I can zigzag a bit and go above and below."
 *
 * Two long streets parallel to the Grand Avenue, three blocks either side of it (the street lines
 * x = ±3 · BLOCK_X = ±78, the landmarks' columns), are opened to CORRIDOR_HALF either side of their
 * line along the whole tile: the towers on the blocks beside them step back and slim
 * (lib/city-game.ts buildBlock, through `corridorClear`), as the wider streets did. Over them, a few
 * light obstacles to play with, kept sparse: low bridges to hop or dive under, high bridges, and
 * ring gates; lamps along both kerbs so each corridor reads as one long road.
 *
 * Perspective first (the user: "perspective is everything and the whole point of this city"): the
 * corridors are straight and open the whole tile, so the eye runs down them; the obstacles are
 * drawn out to 420 and stand on the corridor's middle, so seen from one end they recede as a row
 * of frames (a deck, a ring, a deck) each smaller than the last; the kerb lamps run out to 320 each
 * way, two lines converging on the vanishing point.
 *
 * Kept as they were, and why: the landmarks and big squares stand on the corridors' crossings, in
 * their open plazas (wider than a corridor), and are light, so the corridors run through them like
 * roundabouts. The through tunnel's row of towers (lib/city-under.ts THROUGH) keeps its place, so
 * beside it the corridor is made up from the far side (never under CORRIDOR_MIN across).
 */

import type { Vec3 } from './bigbang';
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
  STRIP_I,
  scale,
  TAU,
  TILE_I,
  TILE_J,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';

/** The corridors' street lines (x = line · BLOCK_X), three blocks either side of the avenue. */
export const CORRIDOR_LINES = [-3, 3] as const;
/** Their middles, tile-local x. */
export const CORRIDOR_X: number[] = CORRIDOR_LINES.map((l) => l * BLOCK_X);
/** Half a corridor's width, wall to wall: 24 across (the avenue is 18, a boulevard about 16). */
export const CORRIDOR_HALF = 12;
/** The narrowest a corridor ever gets: beside the through tunnel's row, which keeps its place. */
export const CORRIDOR_MIN = 20;
/** The least half width a tower beside a corridor keeps. */
export const CORRIDOR_TOWER_MIN_HALF = 3.5;

const tileCol = (I: number) => wrap(I + STRIP_I / 2, TILE_I) - STRIP_I / 2;

/**
 * Which side of a corridor block column I stands on: -1 when its high edge (x = (I + 1) · BLOCK_X)
 * is a corridor's line (its towers stay CORRIDOR_HALF below it), 1 when its low edge is (they stay
 * CORRIDOR_HALF above it), 0 for every other column (and the annex, which has no streets).
 */
export function corridorSide(I: number): -1 | 0 | 1 {
  const li = tileCol(I);
  for (const L of CORRIDOR_LINES) {
    if (li + 1 === L) return -1;
    if (li === L) return 1;
  }
  return 0;
}
/** Whether the street between columns I and I + 1 is a corridor (nothing is strung across it). */
export const acrossCorridor = (I: number) => corridorSide(I) === -1;

/**
 * A tower of half width hx at x on column I, out of the corridor beside it: its corridor face moved
 * back to CORRIDOR_HALF from the line (or to `keptFace + CORRIDOR_MIN`, when the tower across the
 * corridor keeps its place and stands nearer), and if that leaves it thinner than `minHalf` its far
 * face moves out, never nearer than `least` to the street on its far side. Columns off the
 * corridors come back as they were.
 */
export function corridorClear(
  I: number,
  x: number,
  hx: number,
  least: number,
  minHalf = CORRIDOR_TOWER_MIN_HALF,
  keptFace: number | null = null,
): { x: number; hx: number } {
  const side = corridorSide(I);
  if (side === 0) return { x, hx };
  const lo = I * BLOCK_X;
  const hi = (I + 1) * BLOCK_X;
  let a = x - hx;
  let b = x + hx;
  if (side < 0) {
    let edge = hi - CORRIDOR_HALF;
    if (keptFace !== null) edge = Math.min(edge, keptFace - CORRIDOR_MIN);
    if (b <= edge) return { x, hx };
    b = edge;
    if (b - a < 2 * minHalf) a = Math.max(lo + least, b - 2 * minHalf);
  } else {
    let edge = lo + CORRIDOR_HALF;
    if (keptFace !== null) edge = Math.max(edge, keptFace + CORRIDOR_MIN);
    if (a >= edge) return { x, hx };
    a = edge;
    if (b - a < 2 * minHalf) b = Math.min(hi - least, a + 2 * minHalf);
  }
  return { x: (a + b) / 2, hx: (b - a) / 2 };
}

/** Whether world x lies inside a corridor, `room` in from its walls. */
export function inCorridor(x: number, room = 0): boolean {
  const lx = x - nearest(0, x, TILE_X);
  return CORRIDOR_X.some((c) => Math.abs(lx - c) < CORRIDOR_HALF - room);
}

/* ---------- the obstacles: low and high bridges, ring gates ---------- */

export type CorridorFeatureKind = 'low' | 'high' | 'gate';
/** An obstacle over a corridor: which corridor (its tile-local x), where along it, and its height. */
export type CorridorFeature = { kind: CorridorFeatureKind; x: number; z: number; y: number };
/** A low bridge's deck, a high bridge's deck, a gate's middle: heights over the street. */
export const LOW_DECK = 12;
export const HIGH_DECK = 40;
export const GATE_Y = 24;
export const GATE_R = 9;
/** How deep a bridge is (its deck and rails, a high bridge's lattice). */
export const LOW_DEPTH = 1.2;
export const HIGH_DEPTH = 3;

/** The rows round the landmarks' crossings (band middles) and the big squares': their plazas. */
const PLAZA_ROWS = (() => {
  const s = new Set<number>();
  for (let b = 0; b < TILE_J / 8; b++) {
    s.add(b * 8 + 3);
    s.add(b * 8 + 4);
  }
  // The big squares (lib/city-big.ts BIG_SQUARES), on the corridors' crossings too.
  for (const r of [10, 12, 16, 32, 39, 40, 50]) {
    s.add(r - 1);
    s.add(r);
  }
  // The river's two rows (its bridges, the Heights–Golden bridges) and the tile's ends.
  for (const r of [0, 23, 24, TILE_J - 1]) s.add(r);
  return s;
})();

/**
 * The obstacles, tile-local: on each corridor about one block in five, mid-block (never in a
 * plaza, by the river or at the tile's ends), staggered between the two corridors, in turn a low
 * bridge, a ring gate and a high bridge, so you hop, thread and dive as you go.
 */
export const CORRIDOR_FEATURES: CorridorFeature[] = (() => {
  const out: CorridorFeature[] = [];
  const order: CorridorFeatureKind[] = ['low', 'gate', 'high'];
  // One sweep down the plan, the corridors taking turns, three rows or more apart: so each
  // corridor has one every six rows or so and the two are never side by side.
  const count = [0, 1];
  let side = 0;
  let last = -99;
  for (let J = 1; J < TILE_J - 1; J++) {
    if (PLAZA_ROWS.has(J) || J - last < 3) continue;
    const kind = order[(count[side] as number) % order.length] as CorridorFeatureKind;
    const y = kind === 'low' ? LOW_DECK : kind === 'high' ? HIGH_DECK : GATE_Y;
    out.push({ kind, x: CORRIDOR_X[side] as number, z: (J + 0.5) * BLOCK_Z, y });
    count[side] = (count[side] as number) + 1;
    last = J;
    side = 1 - side;
  }
  return out;
})();

/** A feature's vertical extent over the street: what you fly under and over. */
export function featureSpan(f: CorridorFeature): [number, number] {
  if (f.kind === 'gate') return [f.y - GATE_R, f.y + GATE_R];
  return f.kind === 'low' ? [f.y, f.y + LOW_DEPTH] : [f.y, f.y + HIGH_DEPTH];
}

const ROSE = mix(C.rose, C.warm, 0.35);
const TEAL = mix(C.turquoise, C.white, 0.2);
/** Each corridor's own accent: rose on the -x one, teal on the +x one. */
const accent = (x: number) => (x < 0 ? ROSE : TEAL);

/** A bridge across a corridor at z: deck edges, rails, an underglow, a lattice on a high one. */
function bridgeItem(f: CorridorFeature, x: number, z: number, eye: Vec3, t: number): Item {
  const H = CORRIDOR_HALF;
  const y = GROUND + f.y;
  const high = f.kind === 'high';
  const EDGE = Math.ceil((2 * H) / 0.4);
  const RAIL = Math.ceil((2 * H) / 0.7);
  const LAT = high ? 2 * 12 * 10 : 0;
  const POST = Math.ceil(f.y / 0.9);
  const deck = 2 * EDGE;
  const rails = 2 * RAIL;
  const posts = 4 * POST;
  const a = accent(f.x);
  return {
    d: boxDist(eye, [x - H, GROUND, z - 2], [x + H, y + HIGH_DEPTH, z + 2]),
    gid: mixId(Math.round(x * 3), Math.round(z * 3) + 7103),
    count: deck + rails + LAT + posts,
    weight: 1.7,
    probe: [
      [x, y + 1, z],
      [x - H, y + 1, z],
      [x + H, y + 1, z],
    ],
    site: (s, o) => {
      // A slow swell running across the deck, never a flash.
      const swell = 0.85 + 0.15 * Math.sin(t * 0.6 + z * 0.05);
      if (s < deck) {
        const e = s % 2;
        const u = (Math.floor(s / 2) + 0.5) / EDGE;
        o[0] = x - H + u * 2 * H;
        o[1] = y;
        o[2] = z + (e ? 1.6 : -1.6);
        const glow = Math.exp(-(((u - ((t * 0.12 + z * 0.01) % 1)) / 0.12) ** 2));
        [o[3], o[4], o[5]] = scale(mix(C.warm, a, 0.5 + 0.3 * glow), (0.34 + 0.2 * glow) * swell);
        return true;
      }
      s -= deck;
      if (s < rails) {
        const e = s % 2;
        const u = (Math.floor(s / 2) + 0.5) / RAIL;
        o[0] = x - H + u * 2 * H;
        o[1] = y + LOW_DEPTH;
        o[2] = z + (e ? 1.6 : -1.6);
        [o[3], o[4], o[5]] = scale(C.ivory, 0.18 * swell);
        return true;
      }
      s -= rails;
      if (s < LAT) {
        // A high bridge's lattice: a top chord and a zigzag down to the deck, each side.
        // Twelve runs of ten a side: six diagonals zigzagging up and down, six along the top.
        const e = s % 2;
        const q = Math.floor(s / 2);
        const panel = Math.floor(q / 10);
        const v = ((q % 10) + 0.5) / 10;
        const p = panel % 6;
        o[0] = x - H + ((p + v) / 6) * 2 * H;
        o[1] = y + HIGH_DEPTH * (panel >= 6 ? 1 : p % 2 === 0 ? v : 1 - v);
        o[2] = z + (e ? 1.6 : -1.6);
        [o[3], o[4], o[5]] = scale(mix(a, C.white, 0.2), 0.22 * swell);
        return true;
      }
      s -= LAT;
      // Four slim posts at the walls, from the street to the deck.
      const p = Math.floor(s / POST);
      const v = ((s % POST) + 0.5) / POST;
      o[0] = x + (p & 1 ? H : -H);
      o[1] = GROUND + v * f.y;
      o[2] = z + (p & 2 ? 1.6 : -1.6);
      [o[3], o[4], o[5]] = scale(mix(C.steel, a, 0.3), 0.14);
      return true;
    },
  };
}

/** A ring gate standing across a corridor at z, facing down it, its light chasing slowly round. */
function gateItem(f: CorridorFeature, x: number, z: number, eye: Vec3, t: number): Item {
  const RING = Math.ceil((TAU * GATE_R) / 0.45);
  const yc = GROUND + f.y;
  const a = accent(f.x);
  return {
    d: boxDist(eye, [x - GATE_R, yc - GATE_R, z - 1], [x + GATE_R, yc + GATE_R, z + 1]),
    gid: mixId(Math.round(x * 3), Math.round(z * 3) + 7109),
    count: 2 * RING,
    weight: 1.8,
    probe: [
      [x, yc + GATE_R, z],
      [x - GATE_R, yc, z],
      [x + GATE_R, yc, z],
    ],
    site: (s, o) => {
      const inner = s >= RING;
      const u = ((s % RING) + 0.5) / RING;
      const r = inner ? GATE_R - 0.5 : GATE_R;
      const ang = u * TAU;
      o[0] = x + Math.cos(ang) * r;
      o[1] = yc + Math.sin(ang) * r;
      o[2] = z;
      const head = (u - ((t * 0.18 + z * 0.003) % 1) + 1) % 1;
      const glow = Math.exp(-((head / 0.15) ** 2));
      [o[3], o[4], o[5]] = scale(
        mix(a, C.warm, inner ? 0.5 : 0.15),
        (inner ? 0.14 : 0.28) + 0.25 * glow,
      );
      return true;
    },
  };
}

/** Lamps along both kerbs of a corridor, a stretch round the eye: the long road read as one. */
const KERB_GAP = 8;
/** How far down a corridor its kerb lamps are drawn, each way. */
export const KERB_REACH = 320;
function kerbItem(x: number, z0: number, z1: number, eye: Vec3, t: number): Item {
  const n = Math.max(1, Math.floor((z1 - z0) / KERB_GAP));
  const a = accent(x - nearest(0, x, TILE_X));
  return {
    d: boxDist(eye, [x - CORRIDOR_HALF, GROUND, z0], [x + CORRIDOR_HALF, GROUND + 1, z1]),
    gid: mixId(Math.round(x * 3), Math.round(z0) + 7121),
    count: 2 * n,
    weight: 2,
    site: (s, o) => {
      const side = s % 2 ? 1 : -1;
      const j = Math.floor(s / 2);
      const z = z0 + (j + 0.5) * KERB_GAP;
      o[0] = x + side * (CORRIDOR_HALF - 0.6);
      o[1] = GROUND + 0.35;
      o[2] = z;
      // A soft swell running along the corridor, the way a race would go.
      const b = 0.75 + 0.25 * Math.sin(z * 0.04 - t * 1.1);
      [o[3], o[4], o[5]] = scale(mix(C.warm, a, 0.4), 0.3 * b);
      return true;
    },
  };
}

/**
 * The corridors near the eye, for the Ship's renderer: the obstacles within R ahead and the kerb
 * lamps along the stretch round the eye, in every tile copy in reach. A few items a frame.
 */
export function corridorItems(
  eye: Vec3,
  t: number,
  R: number,
  ahead: (x: number, z: number, rad: number) => boolean,
  out: Item[],
) {
  const ox = nearest(0, eye[0], TILE_X);
  for (const off of [-TILE_X, 0, TILE_X]) {
    for (const cx of CORRIDOR_X) {
      const x = ox + off + cx;
      if (Math.abs(x - eye[0]) > R + CORRIDOR_HALF) continue;
      // Kerb lamps along the stretch round the eye, snapped to the lamp spacing so they hold still.
      // Out to KERB_REACH: two lines of lamps converging down the corridor, its perspective.
      const reach = Math.min(R, KERB_REACH);
      const z0 = Math.floor((eye[2] - reach) / KERB_GAP) * KERB_GAP;
      const z1 = Math.ceil((eye[2] + reach) / KERB_GAP) * KERB_GAP;
      if (eye[1] < GROUND + 160) out.push(kerbItem(x, z0, z1, eye, t));
      const n0 = Math.floor((eye[2] - R) / TILE_Z);
      const n1 = Math.floor((eye[2] + R) / TILE_Z);
      for (let n = n0; n <= n1; n++) {
        for (const f of CORRIDOR_FEATURES) {
          if (f.x !== cx) continue;
          const z = f.z + n * TILE_Z;
          if (Math.abs(z - eye[2]) > R) continue;
          if (Math.abs(z - eye[2]) > 30 && !ahead(x, z, 20)) continue;
          const it = f.kind === 'gate' ? gateItem(f, x, z, eye, t) : bridgeItem(f, x, z, eye, t);
          if (it.d < R) out.push(it);
        }
      }
    }
  }
}

/** For the map: each corridor's two walls, tile-local, the whole tile long. */
export function corridorRoads(): { x0: number; z0: number; x1: number; z1: number }[] {
  return CORRIDOR_X.flatMap((c) =>
    [-CORRIDOR_HALF, CORRIDOR_HALF].map((e) => ({ x0: c + e, z0: 0, x1: c + e, z1: TILE_Z })),
  );
}
