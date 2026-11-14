/*
 * The Neon Market come alive (docs/specs/art-city.md, "Matrix quarter and Neon Market"): bridges
 * across its streets at many heights, a few signs that flash, and its flying highways, the ship
 * currents of lib/city-currents.ts (MARKET_STREAMS) lit as streams you can follow. Pure: no
 * three.js, no DOM; the towers come from lib/city-game.ts, handed in (so no cycle).
 *
 * 2026-11-14: "neon market: a few more bridges across its streets at various heights. a few
 * flashing lights and signs. ship currents as flying highways at different heights."
 *
 * Flashing is the market's one exception to the city's mellow light (everything else drifts
 * slowly, nothing flashes), asked for by name: only about one tower in eight carries a flashing
 * sign, each a crisp on and off under once a second or a quick double, never a strobe. The
 * bridges and the highways keep to the slow drift.
 */

import { hash, type RGB, type Vec3 } from './bigbang';
import { canyonWallAt, DRIFT, neonHue } from './city-canyon';
import {
  MARKET_LEVELS,
  MARKET_STREAMS,
  type MarketStream,
  marketColour,
  marketShip,
  marketShips,
} from './city-currents';
import { textPixels } from './city-font';
import {
  BLOCK_Z,
  boxDist,
  C,
  clamp,
  frac,
  GROUND,
  type Item,
  mixId,
  nearest,
  TAU,
  TILE_I,
  TILE_J,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import { type WordSign, wordItem } from './city-signs';

const G = GROUND;

/** What the market needs of a block's tower (lib/city-game.ts Block, without the cycle). */
export type MarketBlock = {
  x: number;
  z: number;
  hx: number;
  hz: number;
  h: number;
  k: number;
  I: number;
  J: number;
  d: string;
  shape: string;
};

/** A market tower that can carry a bridge or a flashing sign: plain, off the avenue, not the canyon's. */
function plainMarket(tw: MarketBlock): boolean {
  const li = wrap(tw.I + TILE_I / 2, TILE_I) - TILE_I / 2;
  return tw.d === 'market' && tw.shape === 'box' && li !== 0 && canyonWallAt(tw.I, tw.J) === null;
}

/* ---------- bridges ---------- */

/**
 * A bridge across a street: its deck along x (`axis` 0) from a to b at z = c, or along z (`axis`
 * 2) at x = c; its height; its own number.
 */
export type MarketBridge = { axis: 0 | 2; a: number; b: number; c: number; y: number; k: number };
/** About this share of the market's neighbouring towers are joined across their street. */
export const BRIDGE_SHARE = 0.45;
/** The heights a bridge is hung at, as shares of the lower tower's. */
export const BRIDGE_LEVELS = [0.28, 0.52, 0.78];
/** How far a bridge keeps from a highway's height. */
export const BRIDGE_CLEAR = 6;

/**
 * The bridge from tower A to its neighbour B across the street between them (B at I + 1 for
 * `axis` 0, at J + 1 for `axis` 2), if they have one: hung at one of three heights under the lower
 * roof, clear of the highways' heights, where their walls face each other.
 */
export function marketBridge(A: MarketBlock, B: MarketBlock, axis: 0 | 2): MarketBridge | null {
  if (!plainMarket(A) || !plainMarket(B)) return null;
  const key = A.k * 3 + axis;
  if (hash(key, 851) >= BRIDGE_SHARE) return null;
  const top = Math.min(A.h, B.h) - 4;
  if (top < 16) return null;
  const lv = BRIDGE_LEVELS[Math.floor(hash(key, 852) * BRIDGE_LEVELS.length)] as number;
  let y = Math.max(9, top * lv);
  for (const Y of Object.values(MARKET_LEVELS))
    if (Math.abs(y - Y) < BRIDGE_CLEAR) y = Y - BRIDGE_CLEAR - 0.5;
  if (y < 8) return null;
  // Across x: from A's +x wall to B's -x wall, where their z spans meet; across z the same way.
  const [a, b] = axis === 0 ? [A.x + A.hx, B.x - B.hx] : [A.z + A.hz, B.z - B.hz];
  if (b - a < 3) return null;
  const lo = axis === 0 ? Math.max(A.z - A.hz, B.z - B.hz) : Math.max(A.x - A.hx, B.x - B.hx);
  const hi = axis === 0 ? Math.min(A.z + A.hz, B.z + B.hz) : Math.min(A.x + A.hx, B.x + B.hx);
  if (hi - lo < 5) return null;
  const c = clamp(lo + (hi - lo) * (0.25 + 0.5 * hash(key, 853)), lo + 2, hi - 2);
  return { axis, a, b, c, y: G + y, k: key };
}

/**
 * A bridge's light: two rails each side, its deck lamps, and a neon strip under it drifting
 * slowly round the canyon's hues (never flashing).
 */
export function marketBridgeItem(B: MarketBridge, eye: Vec3, t: number): Item {
  const len = B.b - B.a;
  const per = Math.ceil(len / 0.4);
  const at = (u: number, side: number, dy: number, o: number[]) => {
    const s = B.a + u * len;
    if (B.axis === 0) {
      o[0] = s;
      o[2] = B.c + side;
    } else {
      o[0] = B.c + side;
      o[2] = s;
    }
    o[1] = B.y + dy;
  };
  const lo: Vec3 = B.axis === 0 ? [B.a, B.y - 1, B.c - 1.2] : [B.c - 1.2, B.y - 1, B.a];
  const hi: Vec3 = B.axis === 0 ? [B.b, B.y + 1.6, B.c + 1.2] : [B.c + 1.2, B.y + 1.6, B.b];
  const mid: Vec3 = B.axis === 0 ? [(B.a + B.b) / 2, B.y, B.c] : [B.c, B.y, (B.a + B.b) / 2];
  const hue = neonHue(t * DRIFT + hash(B.k, 854));
  return {
    d: boxDist(eye, lo, hi),
    gid: mixId(B.k, 8551),
    count: per * 6,
    weight: 2,
    probe: [[lo[0], B.y, lo[2]], mid, [hi[0], B.y, hi[2]]],
    site: (s, o) => {
      const e = Math.floor(s / per);
      const u = ((s % per) + 0.5) / per;
      if (e < 4) {
        at(u, e & 2 ? 1 : -1, e & 1 ? 1.4 : 0, o);
        o[3] = hue[0] * 0.3;
        o[4] = hue[1] * 0.3;
        o[5] = hue[2] * 0.3;
        return true;
      }
      if (e === 4) {
        at(u, 0, 0.05, o);
        const lamp = s % 4 === 0;
        const k = lamp ? 0.5 : 0.1;
        o[3] = C.warm[0] * k;
        o[4] = C.warm[1] * k;
        o[5] = C.warm[2] * k;
        return true;
      }
      // The strip under it: a slow wave of its hue running across.
      at(u, 0, -0.5, o);
      const wave = 0.5 + 0.5 * Math.sin(t * 0.4 - u * 6 + B.k);
      const k = 0.14 + 0.26 * wave;
      o[3] = hue[0] * k;
      o[4] = hue[1] * k;
      o[5] = hue[2] * k;
      return true;
    },
  };
}

/* ---------- flashing signs ---------- */

/** The flashing signs' words: our own. */
export const FLASH_WORDS = ['OPEN', 'LIVE', 'NOW', 'NIGHT', 'NEON', 'JOY'];
/** About one market tower in eight carries one. */
export const FLASH_SHARE = 0.13;
/** How lit a flashing sign is when off: a faint tube, never gone. */
export const FLASH_OFF = 0.06;
/** How long the on and off edges take, in seconds: crisp. */
export const FLASH_EDGE = 0.035;
const FLASH_TONES: RGB[] = [C.magenta, C.cyan, C.amber, C.rose];

/**
 * A tower's flashing sign, if it carries one: a framed word high on the wall that looks down the
 * street the other way (-z; the shop words have +z), in one neon tone.
 */
export function flashSignOn(tw: MarketBlock): WordSign | null {
  if (!plainMarket(tw) || tw.h < 18 || hash(tw.k, 861) >= FLASH_SHARE) return null;
  const text = FLASH_WORDS[Math.floor(hash(tw.k, 862) * FLASH_WORDS.length)] as string;
  const T = textPixels(text, { face: 'deco' });
  const px = Math.min(0.34, (tw.hx * 1.5) / T.w);
  const y = G + tw.h - 2;
  if (y - T.h * px < G + 6) return null;
  return {
    text,
    at: [tw.x - (T.w * px) / 2, y, tw.z - tw.hz - 0.3],
    px,
    rgb: FLASH_TONES[Math.floor(hash(tw.k, 863) * FLASH_TONES.length)] as RGB,
    key: 8600 + (tw.k % 997),
    face: 'deco',
    frame: 'box',
  };
}

/** A flashing sign's rhythm from its key: its period, its phase, and single or double. */
export function flashOf(key: number): { period: number; phase: number; double: boolean } {
  return {
    period: 1.1 + 0.6 * hash(key, 871),
    phase: hash(key, 872),
    double: hash(key, 873) < 0.4,
  };
}

/** A ramp up at a and down at b, `e` wide, of u (all in the same units). */
const onWindow = (u: number, a: number, b: number, e: number) =>
  clamp((u - a) / e, 0, 1) * clamp((b - u) / e, 0, 1);

/**
 * How lit a flashing sign is now: FLASH_OFF or 1, with crisp edges. Single: on for a little over
 * half of each beat. Double: two quick flashes, then dark for the rest.
 */
export function flashLevel(key: number, t: number): number {
  const f = flashOf(key);
  const u = frac(t / f.period + f.phase) * f.period;
  const e = FLASH_EDGE;
  const on = f.double
    ? Math.max(onWindow(u, 0, 0.26, e), onWindow(u, 0.42, 0.68, e))
    : onWindow(u, 0, f.period * 0.56, e);
  return FLASH_OFF + (1 - FLASH_OFF) * on;
}

/** A flashing sign for the Ship's renderer: the word sign, lit on its flash. */
export function flashItem(w: WordSign, eye: Vec3, t: number): Item {
  const base = wordItem(w, eye, t);
  const lit = flashLevel(w.key, t);
  return {
    ...base,
    site: (s, o) => {
      if (!base.site(s, o)) return false;
      o[3] = (o[3] as number) * lit;
      o[4] = (o[4] as number) * lit;
      o[5] = (o[5] as number) * lit;
      return true;
    },
  };
}

/** A market block's own items: its flashing sign, and its bridges to the towers at I + 1 and J + 1. */
export function marketBlockItems(
  tw: MarketBlock,
  towerAt: (I: number, J: number) => MarketBlock,
  eye: Vec3,
  t: number,
  R: number,
  out: Item[],
) {
  if (tw.d !== 'market') return;
  const sign = flashSignOn(tw);
  if (sign) {
    const it = flashItem(sign, eye, t);
    if (it.d < R) out.push(it);
  }
  const bx = marketBridge(tw, towerAt(tw.I + 1, tw.J), 0);
  if (bx) {
    const it = marketBridgeItem(bx, eye, t);
    if (it.d < R) out.push(it);
  }
  const bz = marketBridge(tw, towerAt(tw.I, tw.J + 1), 2);
  if (bz) {
    const it = marketBridgeItem(bz, eye, t);
    if (it.d < R) out.push(it);
  }
}

/* ---------- the flying highways ---------- */

/** Grains a ship of a highway takes: nose, two wingtips, a fin, five of tail. */
export const HIGHWAY_DASH = 9;
/** How far apart the highway's lane lights are. */
const LANE_STEP = 3;

/**
 * A highway through the market's copy in the tile at (ox, oz): its ships, each the highway's
 * colour, a bright nose and a tail streaming behind the way it flies; under them a faint line of
 * lane lights with a slow swell running the same way, so a stream reads from afar and can be
 * followed.
 */
export function highwayItem(
  S: MarketStream,
  ox: number,
  oz: number,
  eye: Vec3,
  t: number,
  key: number,
): Item {
  const n = marketShips(S);
  const ships = n * HIGHWAY_DASH;
  const len = S.s1 - S.s0;
  const lanes = Math.floor(len / LANE_STEP);
  const y = G + S.y;
  const [dx, dz] = S.axis === 2 ? [0, S.sgn] : [S.sgn, 0];
  // Its side, square to the way it flies.
  const [sx, sz] = [-dz, dx];
  const colour = marketColour(S.level, t);
  const tail = 2.4 + 0.08 * S.speed;
  const place = (s: number, o: number[]) => {
    if (S.axis === 2) {
      o[0] = ox + S.c;
      o[2] = oz + s;
    } else {
      o[0] = ox + s;
      o[2] = oz + S.c;
    }
    o[1] = y;
  };
  const lo: Vec3 =
    S.axis === 2 ? [ox + S.c - 2, y - 1, oz + S.s0] : [ox + S.s0, y - 1, oz + S.c - 2];
  const hi: Vec3 =
    S.axis === 2 ? [ox + S.c + 2, y + 1, oz + S.s1] : [ox + S.s1, y + 1, oz + S.c + 2];
  const probe: Vec3[] = [0.1, 0.35, 0.65, 0.9].map((u) => {
    const s = S.s0 + u * len;
    return S.axis === 2 ? [ox + S.c, y, oz + s] : [ox + s, y, oz + S.c];
  });
  return {
    d: boxDist(eye, lo, hi),
    gid: mixId(key, 8701),
    count: ships + lanes,
    weight: 1.8,
    probe,
    site: (s, o) => {
      if (s < ships) {
        const i = Math.floor(s / HIGHWAY_DASH);
        const g = s % HIGHWAY_DASH;
        const m = marketShip(S, i, t);
        if (m.k <= 0.01) return false;
        place(m.s, o);
        let light: number;
        let white = 0;
        if (g === 0) {
          // The nose, a little ahead, nearly white.
          o[0] = (o[0] as number) + dx * 0.9;
          o[2] = (o[2] as number) + dz * 0.9;
          light = 0.75;
          white = 0.5;
        } else if (g < 3) {
          const e = g === 1 ? 1 : -1;
          o[0] = (o[0] as number) + sx * 1.2 * e - dx * 0.5;
          o[2] = (o[2] as number) + sz * 1.2 * e - dz * 0.5;
          light = 0.5;
        } else if (g === 3) {
          o[0] = (o[0] as number) - dx * 0.6;
          o[1] = (o[1] as number) + 0.7;
          o[2] = (o[2] as number) - dz * 0.6;
          light = 0.4;
        } else {
          const u = (g - 3) / (HIGHWAY_DASH - 3);
          o[0] = (o[0] as number) - dx * (0.6 + tail * u);
          o[2] = (o[2] as number) - dz * (0.6 + tail * u);
          light = 0.42 * (1 - u) ** 1.5;
        }
        const k = light * m.k;
        o[3] = (colour[0] + (1 - colour[0]) * white) * k;
        o[4] = (colour[1] + (1 - colour[1]) * white) * k;
        o[5] = (colour[2] + (1 - colour[2]) * white) * k;
        return true;
      }
      // The lane lights, a little under the ships, a swell running with the stream.
      const q = s - ships;
      const along = S.s0 + (q + 0.5) * LANE_STEP;
      place(along, o);
      o[1] = y - 0.8;
      const wave = 0.5 + 0.5 * Math.cos((TAU * (along - S.sgn * 0.6 * S.speed * t)) / 40);
      const k = 0.06 + 0.12 * wave;
      o[3] = colour[0] * k;
      o[4] = colour[1] * k;
      o[5] = colour[2] * k;
      return true;
    },
  };
}

/** The market's rows in the tile, where its highways run. */
const MARKET_Z0 = 40 * BLOCK_Z;
const MARKET_Z1 = 48 * BLOCK_Z;

/** The market's highways near the eye, `ahead` the eye's view; only those within R. */
export function highwayItems(
  eye: Vec3,
  t: number,
  R: number,
  ahead: (x: number, z: number, rad: number) => boolean,
  out: Item[],
) {
  const ox = nearest(0, eye[0], TILE_X);
  if (eye[0] - ox < -R || eye[0] - ox > 160 + R) return;
  const n0 = Math.floor((eye[2] - R - MARKET_Z1) / TILE_Z);
  const n1 = Math.floor((eye[2] + R) / TILE_Z);
  for (let n = n0; n <= n1; n++) {
    const oz = n * TILE_Z;
    if (eye[2] < oz + MARKET_Z0 - R || eye[2] > oz + MARKET_Z1 + R) continue;
    MARKET_STREAMS.forEach((S, i) => {
      const mid = (S.s0 + S.s1) / 2;
      const [mx, mz] = S.axis === 2 ? [ox + S.c, oz + mid] : [ox + mid, oz + S.c];
      if (!ahead(mx, mz, (S.s1 - S.s0) / 2 + 10)) return;
      const it = highwayItem(S, ox, oz, eye, t, n * TILE_J + i * 101);
      if (it.d < R) out.push(it);
    });
  }
}
