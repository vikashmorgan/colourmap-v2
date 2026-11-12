/*
 * The City game's river and its rain (docs/specs/art-city.md, "The river and the rain").
 * Pure: no three.js, no DOM.
 *
 * 2026-11-12, the user: "in the city make a part with rain and rain on the water below. and parts
 * with a river."
 *
 * A river crosses the whole city along x, on the line between the Canals and the golden gardens
 * (tile row 24), under a bridge at every street and a cable-stayed bridge for the avenue. Its
 * water is a dark mirror: every lamp and arch over it shows again below its surface, wobbling. Over
 * the Canals and the river beside them it rains: streaks slanting in a slow wind, rings spreading
 * where the drops meet the water. Mellow throughout: one blue for the water, warm lamps, the
 * Canals' violet, a slow pulse up the avenue bridge's pylons on the city's beat.
 *
 * Everything is handed to the Ship's renderer as Items (lib/city-grid.ts), only near the eye: the
 * rain in a box round it, the river in segments within sight, so the frame stays cheap.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import {
  AVENUE,
  BLOCK_X,
  BLOCK_Z,
  beat,
  boxDist,
  C,
  frac,
  GROUND,
  type Item,
  mix,
  mixId,
  nearest,
  scale,
  TAU,
  TILE_I,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';

/* ---------- the river ---------- */

/** The river runs along x on the street line before this tile row (z = RIVER_ROW · BLOCK_Z). */
export const RIVER_ROW = 24;
export const RIVER_Z = RIVER_ROW * BLOCK_Z;
/** Half the river's width, bank to bank. */
export const RIVER_W = 12;
/** Its water lies this far under the street; its embankment walls stand from there up. */
export const RIVER_DEPTH = 7;
export const RIVER_Y = GROUND - RIVER_DEPTH;

/** The river's middle line nearest z. */
export const riverZ = (z: number) => nearest(RIVER_Z, z, TILE_Z);
/** Whether (x, z) is over the river's water, `room` in from its banks. */
export const inRiver = (_x: number, z: number, room = 0) =>
  Math.abs(z - riverZ(z)) < RIVER_W - room;

/**
 * Towers on the two rows beside the river stand back from its banks, leaving an embankment walk:
 * a tower of half depth hz at z, moved and narrowed if it would reach over the water.
 */
export function riverClear(J: number, z: number, hz: number): { z: number; hz: number } {
  const row = wrap(J, TILE_Z / BLOCK_Z);
  const edge = 3;
  if (row === RIVER_ROW - 1) {
    const lim = Math.floor(J / (TILE_Z / BLOCK_Z)) * TILE_Z + RIVER_Z - RIVER_W - edge;
    const h = Math.min(hz, 8);
    return { z: Math.min(z, lim - h), hz: h };
  }
  if (row === RIVER_ROW) {
    const lim = Math.floor(J / (TILE_Z / BLOCK_Z)) * TILE_Z + RIVER_Z + RIVER_W + edge;
    const h = Math.min(hz, 8);
    return { z: Math.max(z, lim + h), hz: h };
  }
  return { z, hz };
}
/** Whether tile row J lies beside the river (its blocks hold only plain towers). */
export const besideRiver = (J: number) => {
  const row = wrap(J, TILE_Z / BLOCK_Z);
  return row === RIVER_ROW - 1 || row === RIVER_ROW;
};

/** The bridges, tile-local x: one on every street line, the avenue's (x = 0) the grand one. */
export const BRIDGES_X: number[] = Array.from(
  { length: TILE_I },
  (_, i) => (i - TILE_I / 2) * BLOCK_X,
);
/** Half the width of a bridge's deck: the avenue's, wall to wall; a street's. */
export const bridgeHalf = (x: number) => (Math.abs(x) < 1 ? AVENUE : 3);

/* ---------- the rain ---------- */

/**
 * How hard it rains at (x, z), 0..1: over the Canals and the river beside them (tile-local x from
 * just across the avenue to the tile's edge, z from the Canals' first row to past the river), soft
 * at every edge.
 */
export function rainAt(x: number, z: number): number {
  const lx = x - nearest(0, x, TILE_X);
  const lz = wrap(z, TILE_Z);
  const z0 = 16 * BLOCK_Z - 10;
  const z1 = RIVER_Z + RIVER_W + 40;
  return (
    smooth((lx + 24) / 30) *
    smooth((150 - lx) / 30) *
    smooth((lz - z0) / 30) *
    smooth((z1 - lz) / 30)
  );
}
/** The wind's slant: how far a drop drifts along x for every unit it falls. */
export const WIND = 0.32;
/** How fast the rain falls. */
export const FALL = 24;
const RAIN_BOX = 34;
const RAIN_H = 44;
export const STREAKS = 360;
const PER_STREAK = 4;
export const RIPPLES = 70;
const PER_RIPPLE = 12;
export const RIPPLE_LIFE = 1.7;

const near = (a: number, c: number, period: number) =>
  c + wrap(a - c + period / 2, period) - period / 2;

/** Where streak j's head is at time t, in the box round the eye (its own wrap). */
export function streakHead(j: number, eye: Vec3, t: number): Vec3 {
  const fall = wrap(hash(j, 903) * RAIN_H + t * FALL * (0.9 + 0.2 * hash(j, 904)), RAIN_H);
  const y = eye[1] + RAIN_H / 2 - fall;
  const x = near(hash(j, 901) * 997 + fall * WIND, eye[0], 2 * RAIN_BOX);
  const z = near(hash(j, 902) * 991, eye[2], 2 * RAIN_BOX);
  return [x, y, z];
}

/** Ripple j on the water at time t: its middle, its radius, how strongly it shows (0..1). */
export function ripple(
  j: number,
  eye: Vec3,
  t: number,
  water: (x: number, z: number) => number | null,
): { c: Vec3; r: number; k: number } | null {
  const ph = t / RIPPLE_LIFE + hash(j, 911);
  const n = Math.floor(ph);
  const a = ph - n;
  const x = near(hash(j * 131 + n, 912) * 997, eye[0], 80);
  // Half of them on the river (always on water), half wherever water lies (the canals too).
  const onRiver = j % 2 === 0;
  const z = onRiver
    ? riverZ(eye[2]) + (hash(j * 131 + n, 913) - 0.5) * 2 * (RIVER_W - 1)
    : near(hash(j * 131 + n, 914) * 991, eye[2], 80);
  const y = water(x, z);
  if (y === null) return null;
  const k = smooth(a / 0.15) * (1 - a) ** 1.5 * rainAt(x, z);
  return { c: [x, y + 0.04, z], r: 0.15 + 1.5 * a, k };
}

/* ---------- items for the Ship's renderer ---------- */

const RAIN_RGB: RGB = mix([0.72, 0.82, 1], C.violet, 0.3);
const WATER: RGB = [0.14, 0.4, 0.72];
const LAMP: RGB = C.warm;
const STONE: RGB = mix(C.ivory, C.violet, 0.35);

/** The water at (x, z): the river's or a canal's surface height, or null where there is none. */
export type WaterAt = (x: number, z: number) => number | null;

/** The rain round the eye: falling streaks, ripples where they meet the water. */
function rainItem(eye: Vec3, t: number, floor: (x: number, z: number) => number): Item {
  return {
    d: 0,
    gid: mixId(4242, 1),
    count: STREAKS * PER_STREAK,
    weight: 1.1,
    site: (s, o) => {
      const j = Math.floor(s / PER_STREAK);
      const seg = s % PER_STREAK;
      const h = streakHead(j, eye, t);
      // Along the streak, up and back against the wind from its head.
      const back = seg * 0.42;
      const x = h[0] - back * WIND;
      const y = h[1] + back;
      const z = h[2];
      if (y < floor(x, z) + 0.1) return false;
      const rain = rainAt(x, z);
      if (rain <= 0.02) return false;
      const fall = (eye[1] + RAIN_H / 2 - h[1]) / RAIN_H;
      const edge =
        smooth((RAIN_BOX - Math.abs(x - eye[0])) / 6) *
        smooth((RAIN_BOX - Math.abs(z - eye[2])) / 6) *
        smooth(fall / 0.1) *
        smooth((1 - fall) / 0.1);
      o[0] = x;
      o[1] = y;
      o[2] = z;
      const k = rain * edge * (seg === 0 ? 0.3 : 0.16 - 0.03 * seg);
      [o[3], o[4], o[5]] = scale(RAIN_RGB, k);
      return k > 0.004;
    },
  };
}

function rippleItem(eye: Vec3, t: number, water: WaterAt): Item {
  const memo: ({ c: Vec3; r: number; k: number } | null | undefined)[] = [];
  return {
    d: 2,
    gid: mixId(4242, 2),
    count: RIPPLES * PER_RIPPLE,
    weight: 1.4,
    site: (s, o) => {
      const j = Math.floor(s / PER_RIPPLE);
      let R = memo[j];
      if (R === undefined) {
        R = ripple(j, eye, t, water);
        memo[j] = R;
      }
      if (!R || R.k <= 0.01) return false;
      const a = ((s % PER_RIPPLE) / PER_RIPPLE) * TAU;
      o[0] = R.c[0] + Math.cos(a) * R.r;
      o[1] = R.c[1];
      o[2] = R.c[2] + Math.sin(a) * R.r;
      [o[3], o[4], o[5]] = scale(mix(RAIN_RGB, WATER, 0.3), 0.32 * R.k);
      return true;
    },
  };
}

/** A segment of the river, 2 blocks long, from x0: its water, banks, lamps and their reflections. */
const SEG = 2 * BLOCK_X;
function riverSegment(x0: number, zc: number, eye: Vec3, t: number, high: boolean): Item {
  const water = high ? 260 : 340;
  const banks = Math.ceil(SEG / 0.45) * 2;
  const walls = Math.ceil(SEG / 0.9) * 2;
  const lamps = Math.floor(SEG / 8) * 2;
  const LAMP_SITES = 10;
  const yL = GROUND + 3.2;
  return {
    d: boxDist(eye, [x0, RIVER_Y, zc - RIVER_W], [x0 + SEG, GROUND + 3, zc + RIVER_W]),
    gid: mixId(Math.round(x0), Math.round(zc) + 77),
    count: water + banks + walls + lamps * LAMP_SITES,
    weight: high ? 2.2 : 1.1,
    probe: [
      [x0 + SEG / 2, GROUND + 0.5, zc - RIVER_W],
      [x0 + SEG / 2, GROUND + 0.5, zc + RIVER_W],
      [x0 + SEG / 2, RIVER_Y + 0.2, zc],
    ],
    site: (s, o) => {
      if (s < water) {
        // The water: a dark blue, light flowing slowly downstream across it; wetter in the rain,
        // where the neon round it leans the surface violet.
        const x = x0 + hash(s, 921) * SEG;
        const z = zc + (hash(s, 922) - 0.5) * 2 * (RIVER_W - 0.4);
        o[0] = x;
        o[1] = RIVER_Y + 0.05 * Math.sin(t * 0.8 + x * 0.5);
        o[2] = z;
        const flow = 0.5 + 0.5 * Math.sin(x * 0.22 - t * 0.9 + Math.sin(z * 0.4 + t * 0.3) * 1.4);
        const wet = rainAt(x, z);
        const c = mix(WATER, C.violet, 0.4 * wet * (0.5 + 0.5 * Math.sin(x * 0.07)));
        [o[3], o[4], o[5]] = scale(c, (high ? 0.2 : 0.07) + (high ? 0.14 : 0.12) * flow ** 3);
        return true;
      }
      s -= water;
      if (s < banks) {
        // The embankments' top edges, lit lines along both banks.
        const side = s & 1 ? 1 : -1;
        o[0] = x0 + (((s >> 1) + 0.5) / (banks / 2)) * SEG;
        o[1] = GROUND + 0.05;
        o[2] = zc + side * RIVER_W;
        [o[3], o[4], o[5]] = scale(STONE, high ? 0.45 : 0.3);
        return true;
      }
      s -= banks;
      if (s < walls) {
        // The walls down to the water, faint.
        const side = s & 1 ? 1 : -1;
        o[0] = x0 + hash(s, 923) * SEG;
        o[1] = RIVER_Y + RIVER_DEPTH * hash(s, 924);
        o[2] = zc + side * (RIVER_W + 0.05);
        [o[3], o[4], o[5]] = scale(STONE, 0.08);
        return true;
      }
      s -= walls;
      // Lamps on posts along both banks, each again under the water, wobbling: wet reflections.
      const lamp = Math.floor(s / LAMP_SITES);
      const q = s % LAMP_SITES;
      const side = lamp & 1 ? 1 : -1;
      const x = x0 + ((lamp >> 1) + 0.5) * 8;
      const z = zc + side * (RIVER_W - 0.3);
      const glow = 0.85 + 0.15 * Math.sin(t * 0.5 + x * 0.3);
      if (q < 3) {
        o[0] = x;
        o[1] = yL + (q - 1) * 0.12;
        o[2] = z;
        [o[3], o[4], o[5]] = scale(LAMP, 0.55 * glow);
        return true;
      }
      if (q < 5) {
        o[0] = x;
        o[1] = GROUND + (q - 3) * 1.4;
        o[2] = z;
        [o[3], o[4], o[5]] = scale(STONE, 0.2);
        return true;
      }
      // The reflection: the lamp mirrored under the surface, stretched toward it, wobbling.
      const m = q - 5;
      const wob = 0.18 * Math.sin(t * 1.3 + x * 0.7 + m * 1.9);
      o[0] = x + wob;
      o[1] = 2 * RIVER_Y - yL + m * 0.5;
      o[2] = z - side * (0.4 + m * 0.6);
      [o[3], o[4], o[5]] = scale(LAMP, (0.26 - 0.04 * m) * glow);
      return true;
    },
  };
}

/**
 * A bridge over the river at x (world), its middle line zc: deck edges and railings, an arch under
 * each edge springing from the walls, lamps on its posts, and all of it mirrored in the water. The
 * avenue's bridge is cable-stayed: two pylons on its middle, cables fanning to the deck, a light
 * climbing each pylon on the city's beat.
 */
function bridgeItem(x: number, lx: number, zc: number, eye: Vec3, t: number): Item {
  const hw = bridgeHalf(lx);
  const grand = hw > 4;
  const span = RIVER_W + 2.5;
  const DECK = Math.ceil((2 * span) / 0.35);
  const decks = DECK * 4;
  const ARCH = Math.ceil((2 * RIVER_W) / 0.3);
  const arches = ARCH * 2 * 2;
  const lamps = 6 * 6;
  const PYLON = 60;
  const CABLES = 8;
  const CABLE = 26;
  const pylons = grand ? 2 * (PYLON + CABLES * CABLE) : 0;
  const yTop = GROUND + 24;
  return {
    d: boxDist(eye, [x - hw, RIVER_Y, zc - span], [x + hw, grand ? yTop : GROUND + 2, zc + span]),
    gid: mixId(Math.round(x), Math.round(zc) + 911),
    count: decks + arches + lamps + pylons,
    weight: 1.8,
    probe: [
      [x, GROUND + 1, zc],
      [x, GROUND + 1, zc - span],
      [x, GROUND + 1, zc + span],
    ],
    site: (s, o) => {
      if (s < decks) {
        // Two deck edges and two railings along z.
        const e = Math.floor(s / DECK);
        const u = ((s % DECK) + 0.5) / DECK;
        o[0] = x + (e & 1 ? hw : -hw);
        o[1] = GROUND + (e & 2 ? 1.1 : 0.02);
        o[2] = zc - span + u * 2 * span;
        [o[3], o[4], o[5]] = scale(STONE, e & 2 ? 0.22 : 0.34);
        return true;
      }
      s -= decks;
      if (s < arches) {
        // An arch under each edge, and its reflection: together a ring in the water.
        const mirror = s >= arches / 2;
        const r = s % (arches / 2);
        const e = Math.floor(r / ARCH);
        const u = ((r % ARCH) + 0.5) / ARCH;
        const dz = (u - 0.5) * 2 * RIVER_W;
        const yA = RIVER_Y + 0.6 + (RIVER_DEPTH - 1.4) * (1 - (dz / RIVER_W) ** 2) ** 0.5;
        o[0] = x + (e ? hw : -hw) + (mirror ? 0.1 * Math.sin(t * 1.2 + dz) : 0);
        o[1] = mirror ? 2 * RIVER_Y - yA : yA;
        o[2] = zc + dz;
        [o[3], o[4], o[5]] = scale(mix(STONE, LAMP, 0.3), mirror ? 0.1 : 0.26);
        return true;
      }
      s -= arches;
      if (s < lamps) {
        // Lamps on six posts: both ends and the middle of each side, each mirrored below.
        const post = Math.floor(s / 6);
        const q = s % 6;
        const px = x + (post & 1 ? hw : -hw);
        const pz = zc + (Math.floor(post / 2) - 1) * span * 0.9;
        const y = GROUND + 2.6;
        const glow = 0.85 + 0.15 * Math.sin(t * 0.5 + post);
        if (q < 2) {
          o[0] = px;
          o[1] = y + q * 0.1;
          o[2] = pz;
          [o[3], o[4], o[5]] = scale(LAMP, 0.55 * glow);
        } else if (q < 4) {
          o[0] = px;
          o[1] = GROUND + 1.2 * (q - 1);
          o[2] = pz;
          [o[3], o[4], o[5]] = scale(STONE, 0.2);
        } else {
          if (Math.abs(pz - zc) > RIVER_W) return false;
          const m = q - 4;
          o[0] = px + 0.15 * Math.sin(t * 1.3 + px + m);
          o[1] = 2 * RIVER_Y - y + m * 0.6;
          o[2] = pz;
          [o[3], o[4], o[5]] = scale(LAMP, 0.22 * glow);
        }
        return true;
      }
      s -= lamps;
      // The avenue bridge's pylons and cables.
      const side = s >= pylons / 2 ? 1 : -1;
      const r = s % (pylons / 2);
      const px = x + side * (hw + 1);
      const b = beat(t, 1 / 2, side > 0 ? 0 : 0.5);
      if (r < PYLON) {
        const u = (r + 0.5) / PYLON;
        o[0] = px;
        o[1] = GROUND + u * (yTop - GROUND);
        o[2] = zc + (r & 1 ? 0.5 : -0.5);
        // A light climbing the pylon on the beat.
        const climb = Math.exp(-(((u - frac(t * 0.12 + (side > 0 ? 0 : 0.5))) / 0.05) ** 2));
        [o[3], o[4], o[5]] = scale(mix(STONE, C.cyan, climb), 0.28 + 0.4 * climb + 0.08 * b);
        return true;
      }
      const c = Math.floor((r - PYLON) / CABLE);
      const u = (((r - PYLON) % CABLE) + 0.5) / CABLE;
      const dir = c & 1 ? 1 : -1;
      const reach = (0.35 + (0.65 * ((c >> 1) + 1)) / (CABLES / 2)) * span;
      const top = yTop - 0.8 - (c >> 1) * 0.9;
      o[0] = px - side * u * 0.8;
      o[1] = top + (GROUND + 1.1 - top) * u;
      o[2] = zc + dir * reach * u;
      [o[3], o[4], o[5]] = scale(mix(STONE, C.cyan, 0.25), 0.2);
      return true;
    },
  };
}

/**
 * Everything of the river and the rain near the eye: the rain and its ripples (in the rain only),
 * the river's segments and bridges within sight. `floor` and `water` come from the game, which
 * knows the canals.
 */
export function riverItems(
  eye: Vec3,
  t: number,
  R: number,
  floor: (x: number, z: number) => number,
  water: WaterAt,
  out: Item[],
): void {
  const zc = riverZ(eye[2]);
  const high = eye[1] > GROUND + 120;
  if (Math.abs(zc - eye[2]) < R + RIVER_W) {
    const span = Math.min(R, Math.sqrt(Math.max(0, R * R - (zc - eye[2]) ** 2)) + 40);
    const xa = Math.floor((eye[0] - span) / SEG) * SEG;
    for (let x0 = xa; x0 < eye[0] + span; x0 += SEG) out.push(riverSegment(x0, zc, eye, t, high));
    if (!high) {
      const ox = nearest(0, eye[0], TILE_X);
      for (const off of [-TILE_X, 0, TILE_X]) {
        for (const lx of BRIDGES_X) {
          const x = ox + off + lx;
          if (Math.abs(x - eye[0]) > span) continue;
          out.push(bridgeItem(x, lx, zc, eye, t));
        }
      }
    }
  }
  // The rain, round the eye while it is in it (or near), and only under the towers' sky.
  if (eye[1] < GROUND + 140 && rainAt(eye[0], eye[2]) + rainAt(eye[0], eye[2] + 40) > 0.01) {
    out.push(rainItem(eye, t, floor));
    out.push(rippleItem(eye, t, water));
  }
}
