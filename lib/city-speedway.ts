/*
 * The speedway to Atlantis (docs/specs/art-city.md, "Atlantis rising and the speed tunnel"): a
 * deep lane between two tall walls that starts over the avenue at the plan's north end (the top
 * middle of the map, Chinatown's first two rows) and carries on, out of the endless city, to
 * Atlantis. Pure: no three.js, no DOM; the flight's hooks live in lib/city.ts.
 *
 * 2026-11-14: "a speed tunnel to Atlantis ... one deep lane between two tall walls, with space to
 * fly ... tunnels along it, and lights that flash and stream in the ship's direction, faster than
 * the ship, so it feels like full speed."
 *
 * Two places, one lane:
 * - **The mouth** (city, tile-local, every copy of the tile): two tall walls of light either side
 *   of the avenue over a glowing deck at 26, from z = 76 north to the gate at z = 8, twelve across. Light only
 *   (nothing in the city's `blocked`); under the deck the avenue runs on as before.
 * - **The lane** (Atlantis's own ground, realm-local: the gate at z = 0, north is -z): 640 long,
 *   opening from the mouth's 12 to 44 across, its walls 176 high and solid (you stay in it), three
 *   tunnels of arches along it, flaring wide at its end where Atlantis begins.
 *
 * Flying north through the gate (piloted, between the deck and the walls' top) you leave the city:
 * the realm's coordinates are the world's less the gate's copy, so the lane goes straight on from
 * where you were. Flying back south out of the lane's start returns you to that copy. Fast travel
 * (the map, [ and ]) always brings you home too.
 *
 * Light: the lane is the one place the City races and flashes (asked for explicitly): streaks run
 * north along the walls and the floor faster than the ship (they ride a phase eased from its
 * speed, so a change of pace never makes them jump), their heads flicker, the tunnels' arches
 * light in waves ahead of you. Everywhere else in Atlantis the light drifts slowly.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import { textPixels } from './city-font';
import {
  C,
  GROUND,
  type Item,
  mix,
  mixId,
  nearest,
  scale,
  TAU,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import type { MapPlace } from './city-minimap';
import { type WordSign, wordItem } from './city-signs';

/* ---------- the mouth, in the city ---------- */

/** The mouth over the avenue (tile-local): half its width, where it opens, its gate, deck and top. */
export const MOUTH = {
  half: 6,
  zIn: 76,
  zGate: 8,
  deck: GROUND + 26,
  top: GROUND + 140,
} as const;

/** The tile rows the mouth stands over (the avenue's bridges there give way to it). */
export const MOUTH_ROWS = [0, 1, 2] as const;
/** Whether a span of the avenue at tile-local z (its row's start) and height y would cross the mouth. */
export const inMouthRows = (lz: number, y: number) =>
  y >= MOUTH.deck - 4 && lz >= 0 && lz < MOUTH.zIn + 4;

/** The copy of the gate nearest a point: its x (the avenue's middle) and z. */
export function gateNear(q: Vec3): { ox: number; oz: number } {
  return {
    ox: Math.round(q[0] / TILE_X) * TILE_X,
    oz: nearest(MOUTH.zGate, q[2], TILE_Z),
  };
}

/**
 * Whether the step from a to b (world) went north through the gate of a copy of the mouth,
 * between the deck and the top: that copy's gate (the realm's origin), else null.
 */
export function mouthCrossed(a: Vec3, b: Vec3): { ox: number; oz: number } | null {
  if (b[2] >= a[2]) return null;
  const g = gateNear(b);
  if (!(a[2] >= g.oz && b[2] < g.oz)) return null;
  if (Math.abs(b[0] - g.ox) > MOUTH.half - 0.5) return null;
  if (b[1] < MOUTH.deck || b[1] > MOUTH.top) return null;
  return g;
}

/** Whether a world point is inside the mouth, between its walls, over its deck. */
export function inMouth(q: Vec3): boolean {
  const lz = wrap(q[2], TILE_Z);
  const x = q[0] - Math.round(q[0] / TILE_X) * TILE_X;
  return (
    lz >= MOUTH.zGate &&
    lz <= MOUTH.zIn &&
    Math.abs(x) < MOUTH.half &&
    q[1] >= MOUTH.deck - 2 &&
    q[1] <= MOUTH.top + 4
  );
}

/** The map's names for the mouth and for Atlantis (lib/city-minimap.ts; lib/city-travel.ts). */
export const SPEEDWAY_NAME = 'Speedway to Atlantis';
export const ATLANTIS_NAME = 'Atlantis';
export const SPEEDWAY_PLACES: MapPlace[] = [
  {
    kind: 'portal',
    name: SPEEDWAY_NAME,
    x: 0,
    z: (MOUTH.zIn + MOUTH.zGate) / 2 + 14,
    y: MOUTH.top - GROUND,
    colour: [0.3, 0.95, 0.9],
  },
  {
    kind: 'portal',
    name: ATLANTIS_NAME,
    x: 0,
    z: MOUTH.zGate,
    y: MOUTH.top - GROUND,
    colour: [1, 0.82, 0.48],
  },
];

/* ---------- the lane, on Atlantis's ground ---------- */

export const LANE_LEN = 640;
export const LANE_HALF = 22;
/** How high you can fly in the lane, and how high its walls stand. */
export const LANE_TOP = GROUND + 150;
export const LANE_WALL = GROUND + 176;
/** The tunnels along it: where each starts (realm z, going north), how long, its arches. */
export const TUNNELS_AT = [-120, -290, -460] as const;
export const TUNNEL_LEN = 72;
export const ARCH_GAP = 4;
export const ARCH_POST = 44;
/** The extra pace the lane gives at its full (the pace times 1 + PUSH): a push, not a catapult. */
export const PUSH = 1.25;

/** Half the lane's width at realm z: the mouth's 6, opening to 22, flaring wide at its end. */
export function laneHalf(z: number): number {
  const open = MOUTH.half + (LANE_HALF - MOUTH.half) * smooth(-z / 100);
  return open + 40 * smooth((-z - (LANE_LEN - 80)) / 80);
}

/** Whether a realm point lies along the lane (from its start to its end, any height). */
export const alongLane = (q: Vec3) => q[2] <= 1 && q[2] >= -LANE_LEN;

/** In the lane, its walls hold you (from the street to past the top): a wall, or over its top. */
export function laneBlocked(q: Vec3, margin = 1.2): boolean {
  if (!alongLane(q)) return false;
  return Math.abs(q[0]) > laneHalf(q[2]) - margin || q[1] > LANE_TOP + 0.5;
}

/**
 * How much the speedway pushes your pace at a point (1 none): in the mouth (world) it rises
 * along to the gate, in the lane (realm) it is full until the last stretch, easing off as the
 * lane flares into Atlantis. The pace is multiplied: keys still speed up, slow down and steer.
 */
export function pushAt(q: Vec3, realm: boolean): number {
  if (realm) {
    if (!alongLane(q)) return 1;
    return 1 + PUSH * (1 - smooth((-q[2] - (LANE_LEN - 140)) / 120));
  }
  if (!inMouth(q)) return 1;
  const lz = wrap(q[2], TILE_Z);
  return 1 + PUSH * 0.6 * smooth((MOUTH.zIn - lz) / (MOUTH.zIn - MOUTH.zGate));
}

/* ---------- where you are ---------- */

const realm = {
  on: false,
  /** The gate's copy you came through: realm = world less this. */
  ox: 0,
  oz: 0,
  /** The racing lights' phase, eased from the ship's speed (they never jump). */
  phase: 0,
  /** This visit: arrived past the lane yet, and when. */
  arrived: false,
  arrivedAt: Number.NEGATIVE_INFINITY,
  /** The welcome, once a session: when it lit, or NaN until it has. */
  welcomedAt: Number.NaN,
};

export const inAtlantis = () => realm.on;
export const toLocal = (q: Vec3): Vec3 => [q[0] - realm.ox, q[1], q[2] - realm.oz];
export const toWorld = (q: Vec3): Vec3 => [q[0] + realm.ox, q[1], q[2] + realm.oz];
/** Into Atlantis's ground through the gate at (ox, oz). */
export function enterAtlantis(ox: number, oz: number) {
  realm.on = true;
  realm.ox = ox;
  realm.oz = oz;
  realm.arrived = false;
  realm.arrivedAt = Number.NEGATIVE_INFINITY;
}
/** Back to the city (the trip home, a start afresh). */
export function leaveAtlantis() {
  realm.on = false;
  realm.arrived = false;
}
/** For the tests: as if the page were fresh (the welcome not yet shown). */
export function resetSpeedway() {
  leaveAtlantis();
  realm.phase = 0;
  realm.welcomedAt = Number.NaN;
}

/** How fast the lane's lights run at a ship's speed: always well ahead of it. */
export const lightSpeed = (speed: number) => 2.2 * Math.abs(speed) + 12;
/** Each frame: the lights run on at their speed for the ship's. */
export function speedwayStep(dt: number, speed: number) {
  realm.phase = wrap(realm.phase + lightSpeed(speed) * dt, 1e6);
}
export const lanePhase = () => realm.phase;

/* ---------- arrival: the welcome, once ---------- */

/** Where you have arrived: well down the lane, the sign ahead, Atlantis opening beyond. */
export const ARRIVAL_Z = -(LANE_LEN - 150);
export const WELCOME_Z = -(LANE_LEN - 24);
/** The welcome's life: in over 0.8 s, held, gone by 9.5 s. */
export const WELCOME_HOLD = 7;
export const WELCOME_FADE = 2.5;

/**
 * Each frame in the realm, where you are (realm-local): the first time this visit you pass the
 * arrival line, you have arrived (true, once a visit); the first arrival of the session lights
 * the welcome.
 */
export function arrivalStep(q: Vec3, t: number): boolean {
  if (!realm.on || realm.arrived || q[2] > ARRIVAL_Z) return false;
  realm.arrived = true;
  realm.arrivedAt = t;
  if (Number.isNaN(realm.welcomedAt)) realm.welcomedAt = t;
  return true;
}
export const arrived = () => realm.arrived;
export const welcomedAt = () => realm.welcomedAt;
/** Arriving another way (fast travel): placed past the line, arrived at once. */
export function arriveNow(t: number) {
  arrivalStep([0, 0, ARRIVAL_Z - 1], t);
}

/** How lit the welcome is at time t: 0 before it, glowing in, held, faded away; then never again. */
export function welcomeGlow(t: number): number {
  const a = t - realm.welcomedAt;
  if (!(a >= 0)) return 0;
  return smooth(a / 0.8) * (1 - smooth((a - WELCOME_HOLD) / WELCOME_FADE));
}

const SEA_GOLD: RGB = [1, 0.82, 0.48];
const SEA_TEAL: RGB = [0.3, 0.95, 0.9];
/** The sign: big deco letters hung across the lane near its end, read as you come (from +z). */
const WELCOME_TEXT = 'WELCOME TO\nATLANTIS';
const WELCOME_PX = 1.05;
const WELCOME_W = textPixels(WELCOME_TEXT, { face: 'deco', fill: true }).w * WELCOME_PX;
export const WELCOME_SIGN: WordSign = {
  text: WELCOME_TEXT,
  at: [-WELCOME_W / 2, GROUND + 112, WELCOME_Z],
  px: WELCOME_PX,
  rgb: SEA_GOLD,
  rgb2: SEA_TEAL,
  frameRgb: SEA_TEAL,
  face: 'deco',
  frame: 'box',
  key: 4401,
};

/** The welcome, as an item, while it glows (realm-local eye); null otherwise. */
export function welcomeItem(eye: Vec3, t: number): Item | null {
  const g = welcomeGlow(t);
  if (g <= 0.002) return null;
  const it = wordItem(WELCOME_SIGN, eye, t);
  const inner = it.site;
  return {
    d: it.d,
    gid: it.gid,
    count: it.count,
    weight: 6,
    site: (s, o) => {
      if (!inner(s, o)) return false;
      const k = 1.6 * g;
      o[3] = (o[3] as number) * k;
      o[4] = (o[4] as number) * k;
      o[5] = (o[5] as number) * k;
      return true;
    },
  };
}

/* ---------- the racing light ---------- */

const STREAK = 6;
const STREAK_GAP = 0.7;
const DASH_GAP = 9;
const LANE_HUES: RGB[] = [C.cyan, [0.55, 0.85, 1], C.white, [0.4, 1, 0.85]];

/**
 * A streak's grain on a line along z from z0 (south) to z1 (north): `rows` lines, streaks
 * `DASH_GAP` apart riding the phase north, each STREAK grains, its head bright and flickering.
 * Site s of the line set: false where none falls inside [z1, z0].
 */
function streakSite(
  s: number,
  z0: number,
  z1: number,
  rowAt: (r: number, o: number[]) => void,
  rows: number,
  o: number[],
  phase: number,
  t: number,
  bright: number,
): boolean {
  const per = Math.ceil((z0 - z1) / DASH_GAP) + 1;
  const g = s % STREAK;
  const k = Math.floor(s / STREAK);
  const r = k % rows;
  const j = Math.floor(k / rows);
  if (j >= per) return false;
  const off = 13.7 * r;
  const z = z1 + wrap(-(phase + off) - z1, DASH_GAP) + j * DASH_GAP + g * STREAK_GAP;
  if (z > z0 || z < z1) return false;
  rowAt(r, o);
  o[2] = z;
  const head = g === 0;
  // The heads flash (asked for: "lights that flash and stream"), each row at its own beat.
  const flash = head ? (wrap(t * 7 + r * 0.37 + j * 0.11, 1) < 0.5 ? 1 : 0.45) : 1;
  const hue = LANE_HUES[r % LANE_HUES.length] as RGB;
  const c = head ? mix(hue, C.white, 0.5) : hue;
  const k2 = bright * flash * (1 - g / STREAK) ** 1.4;
  o[3] = c[0] * k2;
  o[4] = c[1] * k2;
  o[5] = c[2] * k2;
  return true;
}

/** A dim rail's grain: rows of quiet points along z, every 2, so the walls read between streaks. */
function railSite(
  s: number,
  z0: number,
  z1: number,
  rowAt: (r: number, o: number[]) => void,
  rows: number,
  o: number[],
  rgb: RGB,
): boolean {
  const per = Math.ceil((z0 - z1) / 2);
  const r = s % rows;
  const j = Math.floor(s / rows);
  if (j >= per) return false;
  rowAt(r, o);
  o[2] = z1 + (j + 0.5) * 2;
  o[3] = rgb[0];
  o[4] = rgb[1];
  o[5] = rgb[2];
  return true;
}

const RAIL: RGB = scale(mix(C.cyan, C.violet, 0.4), 0.12);

/** Where wall rows stand: `n` rows from y0 to y1 on side x. */
const wallRow = (x: number, y0: number, y1: number, n: number) => (r: number, o: number[]) => {
  o[0] = x;
  o[1] = y0 + ((r + 0.5) * (y1 - y0)) / n;
};

/** Ahead of the eye, within R: d, or -1. */
function aheadD(eye: Vec3, fwd: Vec3, lo: Vec3, hi: Vec3, R: number): number {
  const dx = Math.max(lo[0] - eye[0], 0, eye[0] - hi[0]);
  const dy = Math.max(lo[1] - eye[1], 0, eye[1] - hi[1]);
  const dz = Math.max(lo[2] - eye[2], 0, eye[2] - hi[2]);
  const d = Math.hypot(dx, dy, dz);
  if (d > R) return -1;
  const cx = (lo[0] + hi[0]) / 2 - eye[0];
  const cy = (lo[1] + hi[1]) / 2 - eye[1];
  const cz = (lo[2] + hi[2]) / 2 - eye[2];
  const rad = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2;
  if (cx * fwd[0] + cy * fwd[1] + cz * fwd[2] < -rad) return -1;
  return d;
}

/* ---------- the mouth's light (city) ---------- */

const WALL_ROWS = 12;
const MOUTH_REACH = 520;

/**
 * The mouth's light near the eye (world), for the city's renderer: both walls (rails and streaks),
 * the deck's three lines, the gate's frame and the opening's.
 */
export function mouthItems(eye: Vec3, fwd: Vec3, t: number, out: Item[]) {
  const { ox, oz } = gateNear(eye);
  const z1 = oz;
  const z0 = oz + (MOUTH.zIn - MOUTH.zGate);
  const ph = realm.phase;
  for (const side of [-1, 1] as const) {
    const x = ox + side * MOUTH.half;
    const d = aheadD(eye, fwd, [x - 0.5, MOUTH.deck, z1], [x + 0.5, MOUTH.top, z0], MOUTH_REACH);
    if (d < 0) continue;
    const row = wallRow(x, MOUTH.deck, MOUTH.top, WALL_ROWS);
    const nStreak = WALL_ROWS * (Math.ceil((z0 - z1) / DASH_GAP) + 1) * STREAK;
    const nRail = WALL_ROWS * Math.ceil((z0 - z1) / 2);
    out.push({
      d,
      gid: mixId(4410 + side, Math.round(oz)),
      count: nStreak + nRail,
      weight: 2.4,
      site: (s, o) =>
        s < nStreak
          ? streakSite(s, z0, z1, row, WALL_ROWS, o, ph, t, 0.75)
          : railSite(s - nStreak, z0, z1, row, WALL_ROWS, o, RAIL),
    });
  }
  // The deck: three lines of streaks at 26, the avenue running on underneath.
  const dd = aheadD(
    eye,
    fwd,
    [ox - MOUTH.half, MOUTH.deck, z1],
    [ox + MOUTH.half, MOUTH.deck, z0],
    MOUTH_REACH,
  );
  if (dd >= 0) {
    const deckRow = (r: number, o: number[]) => {
      o[0] = ox + (r - 1) * MOUTH.half * 0.85;
      o[1] = MOUTH.deck;
    };
    const n = 3 * (Math.ceil((z0 - z1) / DASH_GAP) + 1) * STREAK;
    out.push({
      d: dd,
      gid: mixId(4420, Math.round(oz)),
      count: n + 3 * Math.ceil((z0 - z1) / 2),
      weight: 2,
      site: (s, o) =>
        s < n
          ? streakSite(s, z0, z1, deckRow, 3, o, ph, t, 0.55)
          : railSite(s - n, z0, z1, deckRow, 3, o, RAIL),
    });
  }
  // The gate's frame and the opening's: a glowing rectangle across the avenue, breathing slowly
  // (the gate a little brighter: it is where Atlantis begins).
  for (const [z, gate] of [
    [z1, true],
    [z0, false],
  ] as const) {
    const d = aheadD(
      eye,
      fwd,
      [ox - MOUTH.half, MOUTH.deck, z - 0.5],
      [ox + MOUTH.half, MOUTH.top, z + 0.5],
      MOUTH_REACH,
    );
    if (d < 0) continue;
    const w = 2 * MOUTH.half;
    const h = MOUTH.top - MOUTH.deck;
    const per = 2 * (w + h);
    const n = Math.ceil(per / 0.5);
    out.push({
      d,
      gid: mixId(gate ? 4430 : 4431, Math.round(oz)),
      count: n,
      weight: 3,
      site: (s, o) => {
        const e = ((s + 0.5) / n) * per;
        let x: number;
        let y: number;
        if (e < w) [x, y] = [e, 0];
        else if (e < w + h) [x, y] = [w, e - w];
        else if (e < 2 * w + h) [x, y] = [2 * w + h - e, h];
        else [x, y] = [0, per - e];
        o[0] = ox - MOUTH.half + x;
        o[1] = MOUTH.deck + y;
        o[2] = z;
        // A chase of light round the frame, quick (the lane's exception), on a slow breath.
        const chase = 0.5 + 0.5 * Math.cos(TAU * (e / per) * 3 - t * 5);
        const c = mix(SEA_TEAL, SEA_GOLD, gate ? 0.35 : 0.1);
        const k = (gate ? 0.55 : 0.35) * (0.6 + 0.4 * chase);
        o[3] = c[0] * k;
        o[4] = c[1] * k;
        o[5] = c[2] * k;
        return true;
      },
    });
  }
}

/* ---------- the lane's light (realm) ---------- */

const SEG = 40;
const LANE_REACH = 700;
const ARCH_PER = 0.9;

/** The arch over the lane at realm z: posts up the walls to ARCH_POST, a half circle over. */
function archPoint(z: number, u: number, o: number[]) {
  const W = laneHalf(z);
  const post = ARCH_POST;
  const arc = Math.PI * W;
  const total = 2 * post + arc;
  const e = u * total;
  if (e < post) {
    o[0] = -W;
    o[1] = GROUND + e;
  } else if (e < post + arc) {
    const a = Math.PI - ((e - post) / arc) * Math.PI;
    o[0] = W * Math.cos(a);
    o[1] = GROUND + post + W * Math.sin(a);
  } else {
    o[0] = W;
    o[1] = GROUND + post - (e - post - arc);
  }
  o[2] = z;
}

/**
 * The lane near the eye (realm-local), for the renderer: its walls in stretches of 40 (rails and
 * streaks), the floor's streaks, and the tunnels' arches lighting in waves ahead of you.
 */
export function laneItems(eye: Vec3, fwd: Vec3, t: number, out: Item[]) {
  const ph = realm.phase;
  for (let z1 = -LANE_LEN; z1 < 0; z1 += SEG) {
    const z0 = Math.min(0, z1 + SEG);
    const W = Math.max(laneHalf(z0), laneHalf(z1));
    for (const side of [-1, 1] as const) {
      const lo: Vec3 = [side < 0 ? -W - 1 : laneHalf(z0) - 1, GROUND, z1];
      const hi: Vec3 = [side < 0 ? -laneHalf(z0) + 1 : W + 1, LANE_WALL, z0];
      const d = aheadD(eye, fwd, lo, hi, LANE_REACH);
      if (d < 0) continue;
      // The wall follows the lane's width: rows on a line at the stretch's middle width.
      const x = side * laneHalf((z0 + z1) / 2);
      const row = wallRow(x, GROUND + 2, LANE_WALL, WALL_ROWS + 4);
      const rows = WALL_ROWS + 4;
      const nStreak = rows * (Math.ceil(SEG / DASH_GAP) + 1) * STREAK;
      const nRail = rows * Math.ceil(SEG / 2);
      out.push({
        d,
        gid: mixId(4500 + side, z1),
        count: nStreak + nRail,
        weight: 2.2,
        site: (s, o) =>
          s < nStreak
            ? streakSite(s, z0, z1, row, rows, o, ph, t, 0.8)
            : railSite(s - nStreak, z0, z1, row, rows, o, RAIL),
      });
    }
    // The floor: five lines of streaks, the middle one brightest.
    const d = aheadD(eye, fwd, [-W, GROUND, z1], [W, GROUND + 1, z0], LANE_REACH);
    if (d >= 0) {
      const w = laneHalf((z0 + z1) / 2);
      const floorRow = (r: number, o: number[]) => {
        o[0] = ((r - 2) / 2) * w * 0.8;
        o[1] = GROUND + 0.3;
      };
      const n = 5 * (Math.ceil(SEG / DASH_GAP) + 1) * STREAK;
      out.push({
        d,
        gid: mixId(4510, z1),
        count: n + 5 * Math.ceil(SEG / 2),
        weight: 1.8,
        site: (s, o) =>
          s < n
            ? streakSite(s, z0, z1, floorRow, 5, o, ph, t, 0.6)
            : railSite(s - n, z0, z1, floorRow, 5, o, RAIL),
      });
    }
  }
  // The tunnels: arches every 4, each lit by waves running north faster than you.
  for (const at of TUNNELS_AT) {
    const zS = at;
    const zN = at - TUNNEL_LEN;
    const W = laneHalf(zS);
    const d = aheadD(eye, fwd, [-W, GROUND, zN], [W, GROUND + ARCH_POST + W, zS], LANE_REACH);
    if (d < 0) continue;
    const arches = Math.floor(TUNNEL_LEN / ARCH_GAP) + 1;
    const total = 2 * ARCH_POST + Math.PI * W;
    const per = Math.ceil(total / ARCH_PER);
    out.push({
      d,
      gid: mixId(4520, at),
      count: arches * per,
      weight: 2.4,
      site: (s, o) => {
        const a = Math.floor(s / per);
        const u = ((s % per) + 0.5) / per;
        const z = zS - a * ARCH_GAP;
        archPoint(z, u, o);
        // A wave every 28 along, riding the phase north: a bright front, a quick fall behind it.
        const w = wrap(-z - ph * 1.1, 28);
        const wave = Math.exp(-w / 3.5);
        const glint = hash(a * 131 + Math.floor(u * 40), 77) < 0.08 ? 0.3 : 0;
        const c = mix(SEA_TEAL, C.white, 0.6 * wave);
        const k = 0.16 + 0.7 * wave + glint * wave;
        o[3] = c[0] * k;
        o[4] = c[1] * k;
        o[5] = c[2] * k;
        return true;
      },
    });
  }
  const wi = welcomeItem(eye, t);
  if (wi) out.push(wi);
}
