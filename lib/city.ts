/*
 * CITY — the third chapter, after Vegetal and Ocean (docs/specs/art-city.md).
 *
 * 2026-11-12: "basically the cells looked like a future city with spaceships
 * travelling. work on creating that future city. as vegetal. ocean and city
 * after that. in there u can create different components one by one. long
 * term aim will be to create that future neon city that we fly through on a
 * spaceship."
 *
 * Seven pieces played as one trip, built as Ocean is (lib/ocean.ts): every
 * grain of light keeps its identity, each piece is a formula from a grain and
 * the time to a place and a colour, each piece opens from a wide ball of
 * faint stars, and every grain pours on into the next piece. The towers are
 * the Vegetal Cell's boxes stacked floor on floor; the ships are its pulses.
 * Neon is the point here, so the chapter leaves Vegetal's gold for cyan,
 * magenta and amber over a violet night, drifting slowly, never flashing.
 *
 * Pure: no three.js, no DOM.
 */

import {
  fibonacciSphere,
  flow,
  hash,
  makeParticles,
  type Particle,
  type Phase,
  type RGB,
  smooth,
  type Vec3,
} from './bigbang';

export { fade, wordsShown } from './journey';
export { makeParticles, type Particle };

const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const mix = (a: RGB, b: RGB, t: number): RGB => lerp3(a, b, t) as RGB;
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const wrap = (x: number, n: number) => ((x % n) + n) % n;
const frac = (x: number) => x - Math.floor(x);
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Which role a grain plays in a piece: the first whose bound its `c` is under. */
function roleOf<T extends string>(c: number, roles: readonly (readonly [T, number])[]): T {
  for (const [r, upTo] of roles) if (c < upTo) return r;
  return (roles[roles.length - 1] as readonly [T, number])[0];
}

/* ---------- the pieces, with their words ---------- */

export interface CityPhase extends Phase {
  /** A short reflection, shown a line at a time over the picture. */
  words: string[];
}

export const PHASES: CityPhase[] = [
  {
    id: 'towers',
    name: 'Towers',
    line: 'A city grows up out of a grid of blocks: tall towers rise floor by floor, box on box, their windows lighting as they climb.',
    words: [
      'A city is built one floor at a time, by hands that will never see it finished.',
      'Every lit window is someone keeping a small part of it awake.',
    ],
    duration: 32,
    glow: 1,
    size: 0.8,
  },
  {
    id: 'lanes',
    name: 'Sky lanes',
    line: 'Ships stream between the towers in layered lanes, four heights crossing each other, white lights one way and red lights the other.',
    words: [
      'Each light is going somewhere of its own,',
      'and together they make one slow river through the night.',
    ],
    duration: 32,
    glow: 1,
    size: 0.8,
  },
  {
    id: 'neon',
    name: 'Neon',
    line: 'The towers wear their colours: bands of cyan, magenta and amber, tall signs and lit spires, drifting slowly from one hue to the next over a violet night.',
    words: ['Light is how a city speaks after dark,', 'softly, to anyone still looking up.'],
    duration: 32,
    glow: 1.05,
    size: 0.8,
  },
  {
    id: 'chinatown',
    name: 'Chinatown',
    line: 'Through a red gate into a narrow street: tall signs glowing down the sides of the towers in Chinese and Japanese, red lanterns strung across overhead.',
    words: [
      'Every city keeps smaller cities inside it,',
      'each lit in the colours of somewhere far away.',
    ],
    duration: 36,
    glow: 1,
    size: 0.8,
  },
  {
    id: 'docks',
    name: 'Bridges and docks',
    line: 'Sky bridges join the towers high above the street; ships come in to the landing platforms, rest a while, and lift off again.',
    words: [
      'A bridge is a promise between two places that they will stay close.',
      'A dock is somewhere to arrive, and somewhere to leave from.',
    ],
    duration: 32,
    glow: 1,
    size: 0.8,
  },
  {
    id: 'canyon',
    name: 'Canyon',
    line: 'Flying down an endless street between the towers, ships passing above and below; the towers behind come round to the far end, so the street never ends.',
    words: [
      'Between the walls of a city the sky becomes a road.',
      'Keep moving and the street keeps opening ahead.',
    ],
    duration: 44,
    glow: 1,
    size: 0.8,
  },
  {
    id: 'ship',
    name: 'Ship',
    line: 'Pilot a small ship through the city, keys only: A and D turn, W and S climb and dive, E or Shift faster, Q or X slower, Space boosts while the bar lasts.',
    words: [
      'Somewhere in all that light there is a window waiting for you.',
      'Fly gently: the city is full of other people going home.',
    ],
    duration: 40,
    glow: 1,
    size: 1,
  },
];

export const TOTAL = PHASES.reduce((s, p) => s + p.duration, 0);
export const PHASE_START: number[] = PHASES.map((_, i) =>
  PHASES.slice(0, i).reduce((s, p) => s + p.duration, 0),
);

/** Which piece a moment of the chapter is in, and how far through it (0..1). */
export function phaseAt(time: number): { index: number; u: number } {
  const t = wrap(time, TOTAL);
  let index = PHASES.length - 1;
  for (let i = 0; i < PHASES.length; i++) {
    if (t < (PHASE_START[i] as number) + (PHASES[i] as CityPhase).duration) {
      index = i;
      break;
    }
  }
  return {
    index,
    u: (t - (PHASE_START[index] as number)) / (PHASES[index] as CityPhase).duration,
  };
}

/** One colour per piece, for the step bar. */
export const STEP_COLOURS = [
  '#7f9cff',
  '#e8f0ff',
  '#ff5fd2',
  '#ff4a3a',
  '#ffb24a',
  '#4ef0ff',
  '#b48cff',
];

/* ---------- colours ---------- */

const STAR: RGB = [0.78, 0.72, 0.95];
const EDGE: RGB = [0.38, 0.5, 1];
const GROUND_LINE: RGB = [0.5, 0.36, 0.95];
const WARM_WINDOW: RGB = [1, 0.8, 0.52];
const COOL_WINDOW: RGB = [0.62, 0.82, 1];
const CYAN: RGB = [0.22, 0.92, 1];
const MAGENTA: RGB = [1, 0.28, 0.78];
const AMBER: RGB = [1, 0.64, 0.22];
const VIOLET: RGB = [0.6, 0.4, 1];
/** Ships coming are white, ships going are red, as the lights of a road at night. */
const HEADLIGHT: RGB = [0.9, 0.95, 1];
const TAILLIGHT: RGB = [1, 0.28, 0.22];
const HULL: RGB = [0.62, 0.74, 1];
const LANTERN_RED: RGB = [1, 0.2, 0.13];
const GOLD: RGB = [1, 0.74, 0.3];
const NEON: RGB[] = [CYAN, MAGENTA, AMBER, VIOLET];

/**
 * A neon colour drifting slowly round cyan, magenta, amber and violet: about a minute from one
 * to the next, `k` setting where on the round each light starts (2026-11-12, and the user's
 * standing wish that colours lean slowly, never flash).
 */
export function neonAt(k: number, t: number): RGB {
  const x = k * 0.9 + t * 0.016;
  const n = Math.floor(x);
  return mix(
    NEON[wrap(n, NEON.length)] as RGB,
    NEON[wrap(n + 1, NEON.length)] as RGB,
    smooth(frac(x)),
  );
}

/* ---------- shared: towers, stars, the ground ---------- */

export const GROUND = -16;
/** The height of one floor: the box each tower is stacked from. */
const FLOOR_H = 4;

export type Tower = { x: number; z: number; hx: number; hz: number; h: number; k: number };

/** A point on a tower's outline at height y, `s` (0..1) round it, `out` beyond its walls. */
function ringAt(tw: Tower, s: number, y: number, out = 0): Vec3 {
  const hx = tw.hx + out;
  const hz = tw.hz + out;
  let d = wrap(s, 1) * 4 * (hx + hz);
  if (d < 2 * hx) return [tw.x - hx + d, y, tw.z - hz];
  d -= 2 * hx;
  if (d < 2 * hz) return [tw.x + hx, y, tw.z - hz + d];
  d -= 2 * hz;
  if (d < 2 * hx) return [tw.x + hx - d, y, tw.z + hz];
  d -= 2 * hx;
  return [tw.x - hx, y, tw.z + hz - d];
}

/**
 * A point on one face of a tower, `a` (-1..1) across it, at height y, `out` beyond the wall:
 * face 0 looks to -z, 1 to +x, 2 to +z, 3 to -x.
 */
function facePoint(tw: Tower, face: number, a: number, y: number, out = 0): Vec3 {
  switch (face) {
    case 0:
      return [tw.x + a * tw.hx, y, tw.z - tw.hz - out];
    case 1:
      return [tw.x + tw.hx + out, y, tw.z + a * tw.hz];
    case 2:
      return [tw.x - a * tw.hx, y, tw.z + tw.hz + out];
    default:
      return [tw.x - tw.hx - out, y, tw.z - a * tw.hz];
  }
}

/**
 * A grain of a tower's box edges, the Cell's walls stacked: the four corners up its height and a
 * ring round every floor. Built only to `top`; the grains above wait on the rim being built
 * (`built` 0 there), so the tower climbs floor by floor. Given a `face`, only that face's two
 * corners and its line at each floor: what a street sees, with every grain where it shows.
 */
function towerEdge(
  tw: Tower,
  p: Particle,
  top = tw.h,
  face = -1,
  floorH = FLOOR_H,
): { pos: Vec3; built: number } {
  const q = hash(p.i, 11);
  const floors = Math.max(1, Math.round(tw.h / floorH));
  const level = GROUND + (Math.floor(hash(p.i, 12) * (floors + 1)) * tw.h) / floors;
  let pos: Vec3;
  if (face >= 0) {
    pos =
      q < 0.45
        ? facePoint(tw, face, q < 0.225 ? -1 : 1, GROUND + p.b * tw.h)
        : facePoint(tw, face, p.b * 2 - 1, level);
  } else if (q < 0.5) {
    const c = Math.floor(q * 8);
    pos = [tw.x + (c & 1 ? 1 : -1) * tw.hx, GROUND + p.b * tw.h, tw.z + (c & 2 ? 1 : -1) * tw.hz];
  } else pos = ringAt(tw, p.b, level);
  if (pos[1] <= GROUND + top + 1e-6) return { pos, built: 1 };
  return { pos: ringAt(tw, p.b, GROUND + top), built: 0 };
}

/** Whether a window is lit, 0..1: now and then one goes out or comes on, fading over seconds. */
function windowLit(key: number, t: number): number {
  const v = t * 0.02 + hash(key, 17) * 10;
  const n = Math.floor(v);
  const a = hash(key + n * 7.31, 18) < 0.55 ? 1 : 0;
  const b = hash(key + (n + 1) * 7.31, 18) < 0.55 ? 1 : 0;
  return lerp(a, b, smooth((v - n - 0.85) / 0.15));
}

/** A grain of a tower's windows: a grid on its four faces, two rows a floor; lit or dark, warm or cool. */
function towerWindow(
  tw: Tower,
  p: Particle,
  t: number,
  top = tw.h,
  only = -1,
): { pos: Vec3; lit: number; warm: boolean } {
  const face = only >= 0 ? only : Math.floor(hash(p.i, 13) * 4);
  const w = face % 2 ? tw.hz : tw.hx;
  const cols = Math.max(2, Math.floor((2 * w) / 1.2));
  const col = Math.floor(hash(p.i, 14) * cols);
  const rows = Math.max(2, Math.floor(tw.h / 2));
  const row = Math.floor(p.b * rows);
  const a = -1 + ((col + 0.5 + (p.d - 0.5) * 0.35) * 2) / cols;
  const y = GROUND + ((row + 0.5) * tw.h) / rows;
  const pos = facePoint(tw, face, a, y, 0.04);
  const key = tw.k * 1009 + face * 211 + col * 17 + row;
  const built = y <= GROUND + top ? 1 : 0;
  if (!built) pos[1] = GROUND + top;
  return { pos, lit: windowLit(key, t) * built, warm: hash(key, 19) < 0.7 };
}

/** A grain of a neon band: a ribbon of two rings round the tower at one of its banded floors. */
function towerBand(tw: Tower, p: Particle): { pos: Vec3; band: number } {
  const bands = 2 + Math.floor(hash(tw.k, 31) * 3);
  const band = Math.floor(hash(p.i, 32) * bands);
  const y = GROUND + tw.h * (0.35 + (0.6 * (band + 0.5)) / bands) + (p.d < 0.5 ? 0 : 0.28);
  return { pos: ringAt(tw, p.b, y, 0.08), band };
}

/** A grain of a spire on the roof: a mast, its beacon at the tip. */
function towerSpire(tw: Tower, p: Particle): { pos: Vec3; tip: boolean } {
  const tall = 2.5 + 5 * hash(tw.k, 33);
  const top = GROUND + tw.h;
  if (p.d < 0.7) return { pos: [tw.x, top + p.b * tall, tw.z], tip: false };
  return { pos: add([tw.x, top + tall, tw.z], fibonacciSphere(p.i % 37, 37), 0.25), tip: true };
}

/** Grain p's tower in a set, picked by a weight that grows with the tower's size, so tall towers get more grains. */
type TowerSet = { list: Tower[]; cum: number[] };
function towerSet(list: Tower[]): TowerSet {
  const w = list.map((tw) => tw.h * (tw.hx + tw.hz + 1));
  const sum = w.reduce((s, x) => s + x, 0);
  let run = 0;
  return { list, cum: w.map((x) => (run += x / sum)) };
}
function pick(set: TowerSet, x: number): number {
  for (let j = 0; j < set.cum.length; j++) if (x < (set.cum[j] as number)) return j;
  return set.cum.length - 1;
}

/** Stars in a dome high over the city. */
function skyAt(p: Particle, c: Vec3): Vec3 {
  const d = fibonacciSphere(p.i % 997, 997);
  const r = 150;
  return [c[0] + d[0] * r, c[1] + 20 + Math.abs(d[1]) * r * 0.6, c[2] + d[2] * r];
}

/* ---------- the city: twenty-five blocks ---------- */

const BLOCKS = 5;
const PITCH = 10;
export const CITY: Tower[] = Array.from({ length: BLOCKS * BLOCKS }, (_, j) => {
  const i = j % BLOCKS;
  const l = Math.floor(j / BLOCKS);
  const mid = (BLOCKS - 1) / 2;
  const far = Math.hypot(i - mid, l - mid) / Math.hypot(mid, mid);
  return {
    x: (i - mid) * PITCH + (hash(j, 201) - 0.5) * 1.2,
    z: (l - mid) * PITCH + (hash(j, 202) - 0.5) * 1.2,
    hx: 1.8 + 1.3 * hash(j, 203),
    hz: 1.8 + 1.3 * hash(j, 204),
    // Taller toward the middle, as a city's heart.
    h: 10 + 34 * (1 - far) ** 1.2 * (0.55 + 0.45 * hash(j, 205)) + 4 * hash(j, 206),
    k: j,
  };
});
const CITY_SET = towerSet(CITY);
/** The streets between the blocks, where the lanes run. */
const STREETS = [-1.5, -0.5, 0.5, 1.5].map((s) => s * PITCH);

/** The ground: each block's outline, and dim lamps along its kerb. */
function groundAt(p: Particle): Vec3 {
  const j = Math.floor(p.a * CITY.length);
  const i = j % BLOCKS;
  const l = Math.floor(j / BLOCKS);
  const mid = (BLOCKS - 1) / 2;
  const block: Tower = { x: (i - mid) * PITCH, z: (l - mid) * PITCH, hx: 4.2, hz: 4.2, h: 0, k: j };
  return ringAt(block, p.b, GROUND);
}

/* ---------- 1. Towers: the city growing up from its blocks ---------- */

/** When tower j starts to rise and how far it has risen, `u` through the piece: the middle first. */
export function builtTop(j: number, u: number): number {
  const tw = CITY[j] as Tower;
  const mid = (BLOCKS - 1) / 2;
  const far = Math.hypot((j % BLOCKS) - mid, Math.floor(j / BLOCKS) - mid) / Math.hypot(mid, mid);
  const start = 0.04 + 0.28 * far + 0.08 * hash(j, 207);
  return tw.h * smooth((u - start) / 0.42);
}

type Spot = { pos: Vec3; rgb: RGB };

const TOWER_ROLES = [
  ['ground', 0.08],
  ['sky', 0.12],
  ['edge', 0.6],
  ['window', 1],
] as const;

function towersAt(p: Particle, u: number, t: number): Spot {
  const twinkle = 0.7 + 0.3 * Math.sin(t * 1.3 + p.i * 0.37);
  switch (roleOf(p.c, TOWER_ROLES)) {
    case 'ground':
      return { pos: groundAt(p), rgb: scale(GROUND_LINE, 0.16) };
    case 'sky':
      return { pos: skyAt(p, [0, 0, 0]), rgb: scale(STAR, 0.3 * twinkle) };
    case 'edge': {
      const j = pick(CITY_SET, p.a);
      const top = builtTop(j, u);
      const { pos, built } = towerEdge(CITY[j] as Tower, p, top);
      // The rim being built glows warm; a tower not yet begun stays dark.
      return {
        pos,
        rgb: built ? scale(EDGE, 0.28) : scale(WARM_WINDOW, 0.18 * smooth(top / 1.5)),
      };
    }
    default: {
      const j = pick(CITY_SET, p.a);
      const top = builtTop(j, u);
      const w = towerWindow(CITY[j] as Tower, p, t, top);
      const tone = w.warm ? WARM_WINDOW : COOL_WINDOW;
      return { pos: w.pos, rgb: scale(tone, 0.02 + 0.24 * w.lit) };
    }
  }
}

/* ---------- ships: a bright head and a short trail ---------- */

/** Grain p on a ship's light at `head` going `dir`: the head bright, the trail fading behind. */
function dashAt(head: Vec3, dir: Vec3, p: Particle, len: number): Vec3 {
  return add(head, dir, -(p.b ** 1.6) * len);
}
const dashGlow = (p: Particle) => (p.b < 0.12 ? 1 : 0.55 * (1 - p.b) ** 2);

/* ---------- 2. Sky lanes: streams of ships at four heights ---------- */

export type Lane = { axis: 0 | 2; at: number; y: number; dir: 1 | -1; speed: number };
/** Four heights, the lanes along x on the first and third and along z on the others, both ways in every street. */
export const LANES: Lane[] = [8, 15, 23, 32].flatMap((h, level) =>
  STREETS.flatMap((s, n) =>
    ([1, -1] as const).map((dir) => ({
      axis: level % 2 ? (2 as const) : (0 as const),
      at: s + dir * 0.7,
      y: GROUND + h + (n % 2) * 0.8,
      dir,
      speed: 4.5 + 2.5 * hash(level * 10 + n, 211),
    })),
  ),
);
export const SHIPS = 384;
const LANE_SPAN = 64;

/** Ship j in the lanes at time t: its head, its heading, and how far it is from either end (for a soft fade). */
export function laneShip(j: number, t: number): { c: Vec3; f: Vec3; edge: number; dir: 1 | -1 } {
  const lane = LANES[j % LANES.length] as Lane;
  const per = SHIPS / LANES.length;
  const m = Math.floor(j / LANES.length);
  const s0 = ((m + 0.7 * hash(j, 212)) / per) * LANE_SPAN;
  const s = wrap(s0 + lane.speed * t, LANE_SPAN);
  const along = lane.dir * (s - LANE_SPAN / 2);
  const c: Vec3 = lane.axis === 0 ? [along, lane.y, lane.at] : [lane.at, lane.y + 0.4, along];
  const f: Vec3 = lane.axis === 0 ? [lane.dir, 0, 0] : [0, 0, lane.dir];
  return { c, f, edge: smooth(Math.min(s, LANE_SPAN - s) / 8), dir: lane.dir };
}

const LANE_ROLES = [
  ['ground', 0.06],
  ['sky', 0.09],
  ['edge', 0.33],
  ['window', 0.55],
  ['ship', 1],
] as const;

function lanesAt(p: Particle, u: number, t: number): Spot {
  const role = roleOf(p.c, LANE_ROLES);
  if (role !== 'ship') {
    // The city stands grown and dimmer, so the traffic reads.
    const s = towersAt(p, 1, t);
    return { pos: s.pos, rgb: scale(s.rgb, role === 'window' ? 0.7 : 0.85) };
  }
  const j = Math.floor(p.a * SHIPS);
  const { c, f, edge, dir } = laneShip(j, t);
  // The traffic comes on as the piece opens.
  const live = smooth((u - 0.02 - 0.2 * hash(j, 213)) / 0.15);
  return {
    pos: dashAt(c, f, p, 2.4),
    rgb: scale(dir > 0 ? HEADLIGHT : TAILLIGHT, 0.55 * dashGlow(p) * edge * live),
  };
}

/* ---------- 3. Neon: bands, signs and spires in slow colour ---------- */

/** Which towers carry a tall sign, on which face and how high. */
function signOf(tw: Tower): { face: number; y0: number; tall: number } | null {
  if (tw.h < 16 || hash(tw.k, 41) > 0.7) return null;
  const tall = Math.min(9, tw.h * 0.4);
  return { face: Math.floor(hash(tw.k, 42) * 4), y0: GROUND + tw.h * 0.25, tall };
}

/**
 * A grain of a tall blade sign standing out from a tower's face: its frame, and a dot pattern of
 * three columns in it, abstract, glowing (the readable signs are Chinatown's).
 */
function bladeAt(tw: Tower, s: { face: number; y0: number; tall: number }, p: Particle): Vec3 {
  const W = 1.3;
  const rows = Math.floor(s.tall / 0.5);
  let a: number;
  let y: number;
  if (p.d < 0.3) {
    const e = (p.d / 0.3) * 2 * (W + s.tall);
    if (e < W) [a, y] = [e, 0];
    else if (e < W + s.tall) [a, y] = [W, e - W];
    else if (e < 2 * W + s.tall) [a, y] = [2 * W + s.tall - e, s.tall];
    else [a, y] = [0, 2 * (W + s.tall) - e];
  } else {
    const col = Math.floor(hash(p.i, 43) * 3);
    let row = Math.floor(p.b * rows);
    if (hash(tw.k * 31 + col * 7 + row, 44) < 0.45) row = (row + 1) % rows;
    a = 0.25 + col * 0.4;
    y = (row + 0.5) * 0.5;
  }
  const out = 0.15 + a;
  const yy = s.y0 + y;
  const along = tw.hx * 0.6;
  switch (s.face) {
    case 0:
      return [tw.x + along, yy, tw.z - tw.hz - out];
    case 1:
      return [tw.x + tw.hx + out, yy, tw.z + tw.hz * 0.6];
    case 2:
      return [tw.x - along, yy, tw.z + tw.hz + out];
    default:
      return [tw.x - tw.hx - out, yy, tw.z - tw.hz * 0.6];
  }
}

const NEON_ROLES = [
  ['ground', 0.07],
  ['sky', 0.09],
  ['edge', 0.27],
  ['window', 0.45],
  ['band', 0.68],
  ['sign', 0.86],
  ['spire', 0.92],
  ['ship', 1],
] as const;

function neonCityAt(p: Particle, t: number): Spot {
  const twinkle = 0.75 + 0.25 * Math.sin(t * 0.9 + p.i * 0.37);
  const role = roleOf(p.c, NEON_ROLES);
  const j = pick(CITY_SET, p.a);
  const tw = CITY[j] as Tower;
  // Each tower breathes a little, slowly, on its own beat.
  const breath = 0.8 + 0.2 * Math.sin(t * 0.35 + j * 1.7);
  switch (role) {
    case 'ground': {
      // Coloured light pooling on the street under the towers.
      const pos = groundAt(p);
      return { pos, rgb: scale(neonAt(Math.floor(p.a * CITY.length), t), 0.14) };
    }
    case 'sky':
      return { pos: skyAt(p, [0, 0, 0]), rgb: scale(STAR, 0.25 * twinkle) };
    case 'edge': {
      const { pos } = towerEdge(tw, p);
      return { pos, rgb: scale(mix(VIOLET, EDGE, 0.5), 0.16) };
    }
    case 'window': {
      const w = towerWindow(tw, p, t);
      return { pos: w.pos, rgb: scale(w.warm ? WARM_WINDOW : COOL_WINDOW, 0.02 + 0.2 * w.lit) };
    }
    case 'band': {
      const { pos, band } = towerBand(tw, p);
      // A tower's bands in its own colour, every other one in the colour two steps on.
      return { pos, rgb: scale(neonAt(j + (band % 2) * 2, t), 0.42 * breath) };
    }
    case 'sign': {
      const s = signOf(tw);
      if (!s) {
        const { pos, band } = towerBand(tw, p);
        return { pos, rgb: scale(neonAt(j + (band % 2) * 2, t), 0.42 * breath) };
      }
      return { pos: bladeAt(tw, s, p), rgb: scale(neonAt(j + 1.7, t), 0.5 * breath) };
    }
    case 'spire': {
      const { pos, tip } = towerSpire(tw, p);
      const beacon = 0.55 + 0.45 * Math.sin(t * 0.8 + j);
      return { pos, rgb: tip ? scale(TAILLIGHT, 0.7 * beacon) : scale(EDGE, 0.2) };
    }
    default: {
      const k = Math.floor(p.a * SHIPS);
      const { c, f, edge, dir } = laneShip(k * 3, t);
      return {
        pos: dashAt(c, f, p, 2.4),
        rgb: scale(dir > 0 ? HEADLIGHT : TAILLIGHT, 0.45 * dashGlow(p) * edge),
      };
    }
  }
}

/* ---------- glyphs: Chinese and Japanese characters drawn in grains ---------- */
/*
 * CHINATOWN (2026-11-12): "add chinese signs on side of buildings. or
 * japanese. like that cyberpunk asian mood. so we can create a chinatown in
 * the city." Real characters, rasterised once at 16 × 16 from the MS Gothic
 * font and kept here as bits (one row of sixteen to four hex digits), so the
 * signs read in tests and on the server alike, with no canvas. Every grain of
 * a sign falls on a lit pixel of its characters. Common, kind words only:
 *
 *   龍 dragon · 福 good fortune · 茶 tea · 麺 noodles · 酒 wine ·
 *   夜市 night market · 中華街 Chinatown · ラーメン ramen ·
 *   喫茶 café (a tea house) · 夢 dream
 */
const GLYPH_BITS: Record<string, string> = {
  龍: '1040ff7e4240247cff04007c7e40427c7e40427c7e40427c424242424e3e0000',
  福: '200023fe2000f9fc0904110411fc200063feb2222a2223fe2222222223fe0000',
  茶: '0820fffe082001000280044008203118c1061ff0010011101108210801000000',
  麺: '100010fe7c1010207cfe10aafeba10aa3cba24aa64aa98fe0c003300c0fe0000',
  酒: '400027fe1090009087fe449224920512061e2402240247fe4402840287fe0000',
  夜: '01000100fffe0000108010f82108214863306490a0a0204020a0211826060000',
  市: '01000100fffe0100010001007ffc41044104410441044104411c010001000000',
  中: '0100010001007ffc410441044104410441047ffc010001000100010001000000',
  華: '0820fffe08207ffc11101110fffe111011107ffc01000100fffe010001000000',
  街: '1100111e27c04100910017c0201e21046104a7c42104210421e42f04201c0000',
  ラ: '000000001ff0000000003ff800080008001000100020004001800e0000000000',
  ー: '00000000000000000000000040003ffc00000000000000000000000000000000',
  メ: '000000100010001000200c200340008000c00120021004001800600000000000',
  ン: '00000000300008000004000400080008001000200040008003001c0000000000',
  喫: '02000200f7be92129792921293a2962cf04000400ffe004000a003181c060000',
  夢: '0820fffe08207ffc44447ffc0000fffe820287f2182066400180060078000000',
};
export const GLYPH_PX = 16;
const glyphCache = new Map<string, [number, number][]>();
/**
 * The lit pixels of a character, as column and row from its top left. In a vertical sign the long
 * vowel mark ー stands upright, as it is written down a page.
 */
export function glyph(ch: string, vertical = false): [number, number][] {
  const key = `${ch}${vertical ? '|' : ''}`;
  const had = glyphCache.get(key);
  if (had) return had;
  const hex = GLYPH_BITS[ch] ?? '';
  const out: [number, number][] = [];
  for (let r = 0; r < GLYPH_PX; r++) {
    const row = Number.parseInt(hex.slice(r * 4, r * 4 + 4) || '0', 16);
    for (let c = 0; c < GLYPH_PX; c++) {
      if (!(row & (1 << (GLYPH_PX - 1 - c)))) continue;
      out.push(vertical && ch === 'ー' ? [r, c] : [c, r]);
    }
  }
  glyphCache.set(key, out);
  return out;
}

/**
 * A sign of characters facing +z (toward an eye looking down a street): its top left corner, one
 * character under the next or side by side, each `px` a pixel; `tone` its colour on the neon
 * round, red and gold Chinatown's own.
 */
export type Sign = {
  text: string;
  at: Vec3;
  vertical: boolean;
  px: number;
  tone: 'red' | 'gold' | number;
  k: number;
};
const GAP = 3;
/** How wide and tall a sign's characters are, in world units. */
export function signSize(s: Sign): { w: number; h: number } {
  const n = [...s.text].length;
  const cell = (GLYPH_PX + GAP) * s.px;
  const one = GLYPH_PX * s.px;
  return s.vertical ? { w: one, h: one + (n - 1) * cell } : { w: one + (n - 1) * cell, h: one };
}
const signCache = new Map<Sign, Float32Array>();
/** Every lit pixel of a sign's characters, as x and y down from its top left, in pixels. */
function signPixels(s: Sign): Float32Array {
  const had = signCache.get(s);
  if (had) return had;
  const out: number[] = [];
  [...s.text].forEach((ch, n) => {
    const step = n * (GLYPH_PX + GAP);
    for (const [c, r] of glyph(ch, s.vertical)) {
      out.push(s.vertical ? c : c + step, s.vertical ? r + step : r);
    }
  });
  const arr = new Float32Array(out);
  signCache.set(s, arr);
  return arr;
}
export const signPixelCount = (s: Sign) => signPixels(s).length / 2;

/** Grain p on a sign: most on a lit pixel of its characters, the rest on a thin frame round them. */
export function signPoint(s: Sign, p: Particle, salt = 51): { pos: Vec3; frame: boolean } {
  const { w, h } = signSize(s);
  const m = 2.2 * s.px;
  if (hash(p.i, salt) < 0.14) {
    const e = hash(p.i, salt + 1) * 2 * (w + h + 4 * m);
    const W = w + 2 * m;
    const H = h + 2 * m;
    let x: number;
    let y: number;
    if (e < W) [x, y] = [e, 0];
    else if (e < W + H) [x, y] = [W, e - W];
    else if (e < 2 * W + H) [x, y] = [2 * W + H - e, H];
    else [x, y] = [0, 2 * (W + H) - e];
    return { pos: [s.at[0] - m + x, s.at[1] + m - y, s.at[2]], frame: true };
  }
  const px = signPixels(s);
  const n = Math.floor(hash(p.i, salt + 2) * (px.length / 2));
  const jx = (hash(p.i, salt + 3) - 0.5) * 0.7;
  const jy = (hash(p.i, salt + 4) - 0.5) * 0.7;
  return {
    pos: [
      s.at[0] + ((px[n * 2] as number) + 0.5 + jx) * s.px,
      s.at[1] - ((px[n * 2 + 1] as number) + 0.5 + jy) * s.px,
      s.at[2],
    ],
    frame: false,
  };
}

/**
 * How bright a sign is now: a soft, slow wavering, and once in a long while a gentle dip and
 * back over a second or two, never a hard flash (2026-11-12: "very gently").
 */
export function signFlicker(k: number, t: number): number {
  const waver = 0.88 + 0.07 * Math.sin(t * 0.7 + k * 2.1) + 0.05 * Math.sin(t * 1.9 + k);
  const cycle = 23 + 9 * hash(k, 52);
  const x = wrap(t + hash(k, 53) * cycle, cycle);
  const dip = smooth(x / 0.8) * smooth((2.2 - x) / 0.8);
  return waver * (1 - 0.35 * dip);
}

/** A sign's colour now: Chinatown's lantern red and gold, or a light on the neon round. */
function signTone(s: Sign, t: number): RGB {
  if (s.tone === 'red') return LANTERN_RED;
  if (s.tone === 'gold') return GOLD;
  return neonAt(s.tone, t);
}
/** The frame's colour: gold round red, red round gold, the neon's next colour round neon. */
function frameTone(s: Sign, t: number): RGB {
  if (s.tone === 'red') return GOLD;
  if (s.tone === 'gold') return LANTERN_RED;
  return neonAt(s.tone + 2, t);
}
function signColour(s: Sign, frame: boolean, t: number, k = 1): RGB {
  const f = signFlicker(s.k, t) * k;
  return frame ? scale(frameTone(s, t), 0.3 * f) : scale(signTone(s, t), 0.62 * f);
}

/** Weighted picking among signs, by how many pixels each has, so every character is as dense. */
function signSet(list: Sign[]): { list: Sign[]; cum: number[] } {
  const w = list.map((s) => signPixelCount(s) * 1.16);
  const sum = w.reduce((a, b) => a + b, 0);
  let run = 0;
  return { list, cum: w.map((x) => (run += x / sum)) };
}
const pickSign = (set: { list: Sign[]; cum: number[] }, x: number) => {
  for (let j = 0; j < set.cum.length; j++) if (x < (set.cum[j] as number)) return j;
  return set.cum.length - 1;
};

/** Texts for the tall signs, in turn: ramen, tea, dragon, wine, dream, noodles, good fortune, café. */
export const SIGN_TEXTS = ['ラーメン', '茶', '龍', '酒', '夢', '麺', '福', '喫茶'];
const SIGN_TONES: Sign['tone'][] = ['red', 0, 'gold', 1, 'red', 2.2, 'gold', 0.4];

/* ---------- 4. Chinatown: a gate, a street of signs, lanterns overhead ---------- */

/** Half the street's width, wall to wall. */
export const STREET = 6;
/** Where the gate stands across the street's mouth. */
export const GATE_Z = 22;
const CT_SLOTS = 8;
const CT_PITCH = 10.5;

/** The towers either side of Chinatown's street, their inner walls on its edges. */
export const CT_TOWERS: Tower[] = Array.from({ length: 2 * CT_SLOTS }, (_, j) => {
  const side = j % 2 ? 1 : -1;
  const n = Math.floor(j / 2);
  const hx = 2.6 + 1.6 * hash(j, 301);
  return {
    x: side * (STREET + hx),
    z: 14 - n * CT_PITCH,
    hx,
    hz: 3.6 + 1.2 * hash(j, 302),
    h: 14 + 26 * hash(j, 303),
    k: j + 40,
  };
});
const CT_SET = towerSet(CT_TOWERS);

/** A tall sign down the street side of most towers, hanging from near its front corner, one or two a tower. */
export const CT_SIGNS: Sign[] = [
  ...CT_TOWERS.flatMap((tw, j) => {
    if (j === 7 || j === 10) return [];
    const side = tw.x < 0 ? -1 : 1;
    const text = SIGN_TEXTS[(j * 3) % SIGN_TEXTS.length] as string;
    const px = 0.15;
    const s0: Sign = { text, at: [0, 0, 0], vertical: true, px, tone: 'red', k: j };
    const { w, h } = signSize(s0);
    // Hung from the wall, standing out into the street, its top a little under the roof or 20 up.
    const x0 = side < 0 ? -STREET + 0.35 : STREET - 0.35 - w;
    const top = Math.min(GROUND + tw.h - 1, GROUND + 4.5 + h + 3 * hash(j, 304));
    return [
      {
        ...s0,
        at: [x0, top, tw.z + tw.hz - 0.8] as Vec3,
        tone: SIGN_TONES[j % SIGN_TONES.length] as Sign['tone'],
      },
    ];
  }),
  // Horizontal ones too: a night-market banner across the street, and a café sign over a doorway.
  { text: '夜市', at: [-2.85, GROUND + 14.5, -24], vertical: false, px: 0.15, tone: 'gold', k: 30 },
  {
    text: '喫茶',
    at: [-STREET + 0.4, GROUND + 6.2, -45],
    vertical: false,
    px: 0.11,
    tone: 1.1,
    k: 31,
  },
];
const CT_SIGN_SET = signSet(CT_SIGNS);
/** The gate's plaque: Chinatown, gold on red. */
export const GATE_SIGN: Sign = {
  text: '中華街',
  at: [-2.65, GROUND + 8.85, GATE_Z + 0.3],
  vertical: false,
  px: 0.105,
  tone: 'gold',
  k: 32,
};

/** A grain of the gate: four red pillars, two beams, curved roofs turning up at their ends. */
function gateAt(p: Particle): { pos: Vec3; part: 'pillar' | 'beam' | 'roof' | 'plaque' } {
  const q = p.d;
  const z = GATE_Z;
  if (q < 0.3) {
    // Pillars: the two middle ones the taller, each four corner lines.
    const n = Math.floor(hash(p.i, 61) * 4);
    const x = [-5.2, -2.9, 2.9, 5.2][n] as number;
    const tall = n === 1 || n === 2 ? 9.4 : 7.3;
    const c = Math.floor(hash(p.i, 62) * 4);
    return {
      pos: [x + (c & 1 ? 0.18 : -0.18), GROUND + p.b * tall, z + (c & 2 ? 0.18 : -0.18)],
      part: 'pillar',
    };
  }
  if (q < 0.48) {
    // A lower beam all the way across, an upper one over the middle bay.
    const upper = hash(p.i, 63) < 0.4;
    const half = upper ? 3.2 : 5.6;
    const y = upper ? GROUND + 9.1 : GROUND + 6.6;
    return {
      pos: [(p.b * 2 - 1) * half, y + (hash(p.i, 64) < 0.5 ? 0 : 0.3), z],
      part: 'beam',
    };
  }
  if (q < 0.78) {
    // Three roofs, the middle one highest: an eave and a ridge, the ends turned up.
    const r = Math.floor(hash(p.i, 65) * 3);
    const [cx, half, y0] = (
      [
        [0, 4, GROUND + 10.2],
        [-4.3, 2, GROUND + 7.8],
        [4.3, 2, GROUND + 7.8],
      ] as const
    )[r] as readonly [number, number, number];
    const s = p.b * 2 - 1;
    const lift = 0.7 * Math.abs(s) ** 4;
    const ridge = hash(p.i, 66) < 0.4;
    return {
      pos: [cx + s * half, y0 + lift + (ridge ? 0.55 : 0), z + (ridge ? 0 : 0.5)],
      part: 'roof',
    };
  }
  return { pos: signPoint(GATE_SIGN, p, 67).pos, part: 'plaque' };
}

/** Where the strings of lanterns cross the street, and how high. */
export const LANTERN_ROWS = [12, 2, -8, -34, -46, -58];
const PER_ROW = 8;
export const LANTERNS = LANTERN_ROWS.length * PER_ROW;

/** Lantern j's middle: strung across the street on a sagging line, swaying a little. */
export function lanternAt(j: number, t: number): Vec3 {
  const row = Math.floor(j / PER_ROW);
  const m = j % PER_ROW;
  const z = LANTERN_ROWS[row] as number;
  const x = -STREET + ((m + 0.5) * 2 * STREET) / PER_ROW;
  const y0 = GROUND + 8 + (row % 2) * 0.7;
  const sag = 0.9 * (1 - (x / STREET) ** 2);
  return [
    x,
    y0 - sag - 0.75 + 0.04 * Math.sin(t * 0.7 + j),
    z + 0.12 * Math.sin(t * 0.6 + j * 1.3),
  ];
}

/** A grain of a lantern: its round red body, a gold cap and tassel, or the string between them. */
function lanternGrain(p: Particle, t: number): { pos: Vec3; part: 'body' | 'cap' | 'string' } {
  const j = Math.floor(p.a * LANTERNS);
  const c = lanternAt(j, t);
  if (p.d < 0.72) {
    const d = fibonacciSphere(p.i % 61, 61);
    return { pos: [c[0] + d[0] * 0.55, c[1] + d[1] * 0.66, c[2] + d[2] * 0.55], part: 'body' };
  }
  if (p.d < 0.86) {
    const top = p.b < 0.5;
    const a = hash(p.i, 71) * TAU;
    const y = top ? c[1] + 0.68 : c[1] - 0.68 - hash(p.i, 72) * 0.45;
    const r = top ? 0.25 : 0.06;
    return { pos: [c[0] + Math.cos(a) * r, y, c[2] + Math.sin(a) * r], part: 'cap' };
  }
  const row = Math.floor(j / PER_ROW);
  const z = LANTERN_ROWS[row] as number;
  const x = (p.b * 2 - 1) * STREET;
  const y0 = GROUND + 8 + (row % 2) * 0.7;
  return { pos: [x, y0 - 0.9 * (1 - (x / STREET) ** 2), z], part: 'string' };
}

const CT_ROLES = [
  ['ground', 0.05],
  ['sky', 0.07],
  ['edge', 0.2],
  ['window', 0.3],
  ['gate', 0.42],
  ['lantern', 0.62],
  ['sign', 1],
] as const;

function chinatownAt(p: Particle, t: number): Spot {
  const twinkle = 0.75 + 0.25 * Math.sin(t * 0.9 + p.i * 0.37);
  switch (roleOf(p.c, CT_ROLES)) {
    case 'ground': {
      // The street's kerbs and a wet sheen of red light down its middle.
      const z = 30 - p.b * 100;
      if (p.d < 0.6)
        return { pos: [(p.d < 0.3 ? -1 : 1) * STREET, GROUND, z], rgb: scale(GROUND_LINE, 0.18) };
      return {
        pos: [(hash(p.i, 81) - 0.5) * 2 * STREET * 0.8, GROUND, z],
        rgb: scale(LANTERN_RED, 0.06 * twinkle),
      };
    }
    case 'sky':
      return { pos: skyAt(p, [0, 0, -20]), rgb: scale(STAR, 0.25 * twinkle) };
    case 'edge': {
      const tw = CT_TOWERS[pick(CT_SET, p.a)] as Tower;
      return { pos: towerEdge(tw, p).pos, rgb: scale(mix(VIOLET, EDGE, 0.4), 0.2) };
    }
    case 'window': {
      const tw = CT_TOWERS[pick(CT_SET, p.a)] as Tower;
      const w = towerWindow(tw, p, t);
      return { pos: w.pos, rgb: scale(WARM_WINDOW, 0.02 + 0.18 * w.lit) };
    }
    case 'gate': {
      const { pos, part } = gateAt(p);
      if (part === 'plaque') {
        const frame = signPoint(GATE_SIGN, p, 67).frame;
        return { pos, rgb: signColour(GATE_SIGN, frame, t) };
      }
      return {
        pos,
        rgb:
          part === 'roof' ? scale(GOLD, 0.4) : scale(LANTERN_RED, part === 'pillar' ? 0.32 : 0.4),
      };
    }
    case 'lantern': {
      const { pos, part } = lanternGrain(p, t);
      const j = Math.floor(p.a * LANTERNS);
      const glow = 0.85 + 0.15 * Math.sin(t * 0.5 + j * 0.9);
      if (part === 'body') return { pos, rgb: scale(mix(LANTERN_RED, AMBER, 0.15), 0.42 * glow) };
      if (part === 'cap') return { pos, rgb: scale(GOLD, 0.45) };
      return { pos, rgb: scale(GOLD, 0.08) };
    }
    default: {
      const s = CT_SIGNS[pickSign(CT_SIGN_SET, p.a)] as Sign;
      const { pos, frame } = signPoint(s, p);
      return { pos, rgb: signColour(s, frame, t) };
    }
  }
}

/* ---------- small ships of any size ---------- */

/**
 * Grain p on a small ship at c heading f, `len` long, banked `roll`: a flat arrowhead with a
 * raised spine, two engines at the back and their glow streaming behind, longer the faster it
 * goes (`pace` 0 at rest). Our own shape: an arrowhead, nothing borrowed.
 */
function craftAt(
  c: Vec3,
  f: Vec3,
  len: number,
  p: Particle,
  pace: number,
  roll = 0,
): { pos: Vec3; part: 'hull' | 'spine' | 'engine' | 'trail' } {
  const side0 = norm(cross(f, [0, 1, 0]));
  const up0 = cross(side0, f);
  const side = add(scale(side0 as RGB, Math.cos(roll)) as Vec3, up0, Math.sin(roll));
  const up = cross(side, f);
  const at = (a: number, s: number, h: number): Vec3 =>
    add(add(add(c, f, a * len), side, s * len), up, h * len);
  const q = p.b;
  if (q < 0.42) {
    // The arrowhead's outline: the nose, two swept wing tips, a notched back.
    const e = Math.floor(hash(p.i, 91) * 4);
    const s = hash(p.i, 92);
    const pts: [number, number][] = [
      [0.5, 0],
      [-0.45, 0.42],
      [-0.28, 0],
      [-0.45, -0.42],
    ];
    const A = pts[e] as [number, number];
    const B = pts[(e + 1) % 4] as [number, number];
    return { pos: at(lerp(A[0], B[0], s), lerp(A[1], B[1], s), 0), part: 'hull' };
  }
  if (q < 0.58) {
    const s = hash(p.i, 93);
    return { pos: at(0.45 - s * 0.75, 0, 0.07 * Math.sin(Math.PI * s)), part: 'spine' };
  }
  const e = hash(p.i, 94) < 0.5 ? 1 : -1;
  if (q < 0.76) {
    const a = hash(p.i, 95) * TAU;
    return {
      pos: at(-0.3, e * 0.17 + Math.cos(a) * 0.05, Math.sin(a) * 0.05),
      part: 'engine',
    };
  }
  const s = hash(p.i, 96);
  return { pos: at(-0.32 - s * (0.25 + 0.55 * pace), e * 0.17, 0), part: 'trail' };
}
function craftColour(part: 'hull' | 'spine' | 'engine' | 'trail', p: Particle, k: number): RGB {
  switch (part) {
    case 'hull':
      return scale(HULL, 0.28 * k);
    case 'spine':
      return scale(HULL, 0.34 * k);
    case 'engine':
      return scale(CYAN, 0.55 * k);
    default:
      return scale(CYAN, 0.35 * (1 - hash(p.i, 96)) * k);
  }
}

/* ---------- 5. Bridges and docks ---------- */

export type Bridge = { a: Vec3; b: Vec3; axis: 0 | 2 };
/** Sky bridges between neighbouring towers tall enough, at a height both reach. */
export const BRIDGES: Bridge[] = CITY.flatMap((A, j) => {
  const out: Bridge[] = [];
  const i = j % BLOCKS;
  const l = Math.floor(j / BLOCKS);
  const try2 = (B: Tower | undefined, axis: 0 | 2, salt: number) => {
    if (!B || Math.min(A.h, B.h) < 16 || hash(j, salt) > 0.55) return;
    const y = GROUND + Math.min(A.h, B.h) * (0.35 + 0.45 * hash(j, salt + 1));
    if (axis === 0) {
      const z = (A.z + B.z) / 2;
      out.push({ a: [A.x + A.hx, y, z], b: [B.x - B.hx, y, z], axis });
    } else {
      const x = (A.x + B.x) / 2;
      out.push({ a: [x, y, A.z + A.hz], b: [x, y, B.z - B.hz], axis });
    }
  };
  if (i + 1 < BLOCKS) try2(CITY[j + 1], 0, 221);
  if (l + 1 < BLOCKS) try2(CITY[j + BLOCKS], 2, 223);
  return out;
});

/** A grain of a sky bridge: a tube of four long edges, ribs across it, lights along its floor. */
function bridgeAt(p: Particle): { pos: Vec3; light: boolean } {
  const br = BRIDGES[Math.floor(p.a * BRIDGES.length)] as Bridge;
  const s = p.b;
  const mid = lerp3(br.a, br.b, s);
  const across: Vec3 = br.axis === 0 ? [0, 0, 1] : [1, 0, 0];
  const w = 0.65;
  const h = 0.55;
  const q = p.d;
  if (q < 0.6) {
    const c = Math.floor((q / 0.6) * 4);
    return { pos: add(add(mid, across, c & 1 ? w : -w), [0, 1, 0], c & 2 ? h : -h), light: false };
  }
  if (q < 0.85) {
    // A rib every unit, round the tube: the Cell's walls again, laid on their side.
    const len = Math.hypot(br.b[0] - br.a[0], br.b[2] - br.a[2]);
    const ribs = Math.max(2, Math.floor(len));
    const r = lerp3(br.a, br.b, (Math.floor(s * ribs) + 0.5) / ribs);
    const a = hash(p.i, 231) * 4;
    const e = Math.floor(a);
    const g = a - e;
    const corners: [number, number][] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    const A = corners[e] as [number, number];
    const B = corners[(e + 1) % 4] as [number, number];
    return {
      pos: add(add(r, across, lerp(A[0], B[0], g) * w), [0, 1, 0], lerp(A[1], B[1], g) * h),
      light: false,
    };
  }
  return { pos: add(mid, [0, 1, 0], -h - 0.05), light: true };
}

export type Pad = { at: Vec3; out: Vec3; tower: number };
/** Landing platforms standing out from the faces of the taller towers. */
export const PADS: Pad[] = CITY.flatMap((tw, j) => {
  if (tw.h < 18 || hash(j, 241) > 0.5) return [];
  const face = Math.floor(hash(j, 242) * 4);
  const out: Vec3 = (
    [
      [0, 0, -1],
      [1, 0, 0],
      [0, 0, 1],
      [-1, 0, 0],
    ] as Vec3[]
  )[face] as Vec3;
  const y = GROUND + tw.h * (0.55 + 0.3 * hash(j, 243));
  const reach = (face % 2 ? tw.hx : tw.hz) + 1.5;
  return [{ at: [tw.x + out[0] * reach, y, tw.z + out[2] * reach], out, tower: j }];
});
const PAD_R = 1.4;
const DOCK_CYCLE = 18;

/** A grain of a platform: its square rim, a cross on its deck, and lights round the rim chasing slowly. */
function padAt(p: Particle, t: number): { pos: Vec3; light: number } {
  const pad = PADS[Math.floor(p.a * PADS.length)] as Pad;
  const sq: Tower = { x: pad.at[0], z: pad.at[2], hx: PAD_R, hz: PAD_R, h: 0, k: 0 };
  if (p.d < 0.45) return { pos: ringAt(sq, p.b, pad.at[1]), light: 0 };
  if (p.d < 0.7) {
    const s = (p.b * 2 - 1) * PAD_R;
    const along = hash(p.i, 251) < 0.5;
    return {
      pos: [pad.at[0] + (along ? s : 0), pad.at[1], pad.at[2] + (along ? 0 : s)],
      light: 0,
    };
  }
  const n = Math.floor(p.b * 12);
  const pos = add(ringAt(sq, n / 12, pad.at[1], 0.1), fibonacciSphere(p.i % 13, 13), 0.06);
  return { pos, light: 0.4 + 0.6 * smooth(Math.sin(t * 0.6 - n * 0.5) * 0.5 + 0.5) };
}

/**
 * Ship m at pad j, `t` seconds on: it comes in from far off along a curve, settles on the deck,
 * rests, lifts and leaves the other way. Two ships to a pad, half a cycle apart.
 */
export function dockShip(
  j: number,
  m: number,
  t: number,
): { c: Vec3; f: Vec3; pace: number; seen: number } {
  const pad = PADS[j] as Pad;
  const x = dockPhase(j, m, t);
  const c = dockShipAt(j, m, t);
  const pace = x < 0.3 ? 1 - smooth(x / 0.3) : x < 0.6 ? 0 : smooth((x - 0.6) / 0.4);
  // Pointing the way it moves; on the deck, facing out from the tower.
  let f: Vec3 = pad.out;
  if (x < 0.29 || x > 0.61) {
    const n = dockShipAt(j, m, t + 0.05);
    const d: Vec3 = [n[0] - c[0], n[1] - c[1], n[2] - c[2]];
    if (Math.hypot(d[0], d[2]) > 1e-4) f = norm([d[0], d[1] * 0.4, d[2]]);
  }
  return { c, f, pace, seen: smooth(x / 0.06) * smooth((1 - x) / 0.06) };
}
/** How far round its cycle ship m at pad j is, 0..1. */
const dockPhase = (j: number, m: number, t: number) =>
  wrap(t / DOCK_CYCLE + m * 0.5 + hash(j, 262), 1);
/** Where ship m at pad j is at time t. */
function dockShipAt(j: number, m: number, t: number): Vec3 {
  const pad = PADS[j] as Pad;
  const deck = add(pad.at, [0, 1, 0], 0.3);
  const hover = add(pad.at, [0, 1, 0], 3);
  const yaw = hash(j * 2 + m, 261) * TAU;
  const from = add(add(pad.at, [Math.cos(yaw), 0, Math.sin(yaw)], 34), [0, 1, 0], 10);
  const to = add(add(pad.at, [Math.cos(yaw + 2.2), 0, Math.sin(yaw + 2.2)], 34), [0, 1, 0], 16);
  const x = dockPhase(j, m, t);
  const curve = (a: Vec3, b: Vec3, s: number): Vec3 => {
    // Swinging round through a point over the deck's outward side.
    const ctl = add(lerp3(a, b, 0.5), pad.out, 8);
    return lerp3(lerp3(a, ctl, s), lerp3(ctl, b, s), s);
  };
  if (x < 0.3) {
    const s = smooth(x / 0.3);
    return s < 0.85 ? curve(from, hover, s / 0.85) : lerp3(hover, deck, (s - 0.85) / 0.15);
  }
  if (x < 0.6) return deck;
  const s = smooth((x - 0.6) / 0.4);
  return s < 0.15 ? lerp3(deck, hover, s / 0.15) : curve(hover, to, (s - 0.15) / 0.85);
}

const DOCK_ROLES = [
  ['ground', 0.04],
  ['sky', 0.05],
  ['edge', 0.4],
  ['window', 0.52],
  ['bridge', 0.7],
  ['pad', 0.8],
  ['craft', 1],
] as const;

function docksAt(p: Particle, t: number): Spot {
  const twinkle = 0.75 + 0.25 * Math.sin(t * 0.9 + p.i * 0.37);
  switch (roleOf(p.c, DOCK_ROLES)) {
    case 'ground':
      return { pos: groundAt(p), rgb: scale(GROUND_LINE, 0.14) };
    case 'sky':
      return { pos: skyAt(p, [0, 0, 0]), rgb: scale(STAR, 0.25 * twinkle) };
    case 'edge': {
      const tw = CITY[pick(CITY_SET, p.a)] as Tower;
      return { pos: towerEdge(tw, p).pos, rgb: scale(EDGE, 0.3) };
    }
    case 'window': {
      const tw = CITY[pick(CITY_SET, p.a)] as Tower;
      const w = towerWindow(tw, p, t);
      return { pos: w.pos, rgb: scale(w.warm ? WARM_WINDOW : COOL_WINDOW, 0.02 + 0.22 * w.lit) };
    }
    case 'bridge': {
      const { pos, light } = bridgeAt(p);
      return { pos, rgb: light ? scale(AMBER, 0.45) : scale(CYAN, 0.2) };
    }
    case 'pad': {
      const { pos, light } = padAt(p, t);
      return { pos, rgb: light ? scale(AMBER, 0.6 * light) : scale(HULL, 0.22) };
    }
    default: {
      const n = Math.floor(p.a * PADS.length * 2);
      const { c, f, pace, seen } = dockShip(n >> 1, n & 1, t);
      const { pos, part } = craftAt(c, f, 1.8, p, pace);
      return { pos, rgb: craftColour(part, p, seen) };
    }
  }
}

/* ---------- 6. Canyon: an endless street flown down the middle ---------- */

export const EYE_Y = GROUND + 20;
export const CANYON_W = 6;
const LOOP = 140;
const BEHIND = 14;
const SPEED = 7;
export const CANYON_SLOTS = 24;

/** Where canyon slot j's tower stands: either side of the street, its inner wall at least CANYON_W out. */
export function canyonSlot(j: number): Tower & { z0: number } {
  const side = j % 2 ? 1 : -1;
  const hx = 2.5 + 2.5 * hash(j, 311);
  return {
    x: side * (CANYON_W + hx + 1.5 * hash(j, 312)),
    z: 0,
    z0: (Math.floor(j / 2) + 0.4 * hash(j, 313)) * (LOOP / (CANYON_SLOTS / 2)),
    hx,
    hz: 3.6 + 2 * hash(j, 314),
    h: 18 + 40 * hash(j, 315) ** 1.2,
    k: j + 80,
  };
}
const SLOTS = Array.from({ length: CANYON_SLOTS }, (_, j) => canyonSlot(j));
const CANYON_SET = towerSet(SLOTS);
/** Every third slot carries a tall sign on its street side: Chinatown, flown past. */
const CANYON_SIGNS: (Sign | null)[] = SLOTS.map((tw, j) => {
  if (j % 3) return null;
  const text = SIGN_TEXTS[(j / 3) % SIGN_TEXTS.length] as string;
  const s: Sign = { text, at: [0, 0, 0], vertical: true, px: 0.2, tone: 'red', k: j + 60 };
  const { w, h } = signSize(s);
  const inner = Math.abs(tw.x) - tw.hx;
  const x0 = tw.x < 0 ? -inner + 0.3 : inner - 0.3 - w;
  return {
    ...s,
    at: [x0, EYE_Y + h / 2 + 4 * (hash(j, 316) - 0.5), tw.hz - 0.6],
    tone: SIGN_TONES[(j / 3) % SIGN_TONES.length] as Sign['tone'],
  };
});
const SIGNED = CANYON_SIGNS.flatMap((s, j) => (s ? [j] : []));
const CANYON_SIGN_SET = signSet(SIGNED.map((j) => CANYON_SIGNS[j] as Sign));

const flown = (u: number) => SPEED * u * (PHASES[5] as CityPhase).duration;
const ahead = (z0: number, s: number) => wrap(z0 - s, LOOP) - BEHIND;
/** Light fades into the far violet, so the far end of the street never pops. */
const haze = (d: number) => smooth((LOOP - BEHIND - d) / 45);

/** The canyon's traffic: four lanes either side of the eye, above and below it; left comes, right goes. */
export const CANYON_LANES = [-3.6, -1.4, 1.4, 3.6].flatMap((x) =>
  [-9, -4, 5, 11].map((dy) => ({
    x,
    y: EYE_Y + dy,
    dir: x < 0 ? 1 : -1,
    speed: x < 0 ? 9 + 3 * hash(dy, 321) : 11 + 3 * hash(dy, 322),
  })),
);
const CANYON_SHIPS = 160;

/** Canyon ship j: where it is and how far ahead of the eye, flown `s` down the street at time t. */
export function canyonShip(j: number, s: number, t: number): { c: Vec3; d: number; dir: number } {
  const lane = CANYON_LANES[j % CANYON_LANES.length] as (typeof CANYON_LANES)[number];
  const per = CANYON_SHIPS / CANYON_LANES.length;
  const m = Math.floor(j / CANYON_LANES.length);
  const z0 = ((m + 0.7 * hash(j, 323)) / per) * LOOP;
  // In the world it moves along the street, coming (+z) or going (-z); seen from the eye it wraps.
  const d = ahead(z0 - lane.dir * lane.speed * t, s);
  return { c: [lane.x, lane.y, -s - d], d, dir: lane.dir };
}

const CANYON_ROLES = [
  ['ground', 0.06],
  ['sky', 0.08],
  ['edge', 0.36],
  ['window', 0.58],
  ['band', 0.66],
  ['sign', 0.76],
  ['ship', 1],
] as const;

function canyonAt(p: Particle, u: number, t: number): Spot & { d: number } {
  const s = flown(u);
  const role = roleOf(p.c, CANYON_ROLES);
  const twinkle = 0.75 + 0.25 * Math.sin(t * 0.9 + p.i * 0.37);
  switch (role) {
    case 'ground': {
      // Kerbs and crossings far below, going by.
      const d = ahead(p.b * LOOP, s);
      const x =
        p.d < 0.5 ? (p.d < 0.25 ? -1 : 1) * CANYON_W : (hash(p.i, 331) - 0.5) * 2 * CANYON_W;
      const z = p.d < 0.5 ? -s - d : -s - (Math.round((d + BEHIND) / 11.7) * 11.7 - BEHIND);
      return { pos: [x, GROUND, z], rgb: scale(GROUND_LINE, 0.16 * haze(d)), d };
    }
    case 'sky':
      return { pos: skyAt(p, [0, 0, -s - 60]), rgb: scale(STAR, 0.22 * twinkle), d: 60 };
    case 'ship': {
      const j = Math.floor(p.a * CANYON_SHIPS);
      const { c, d, dir } = canyonShip(j, s, t);
      return {
        pos: dashAt(c, [0, 0, dir], p, 2.6),
        rgb: scale(dir > 0 ? HEADLIGHT : TAILLIGHT, 0.55 * dashGlow(p) * haze(d)),
        d,
      };
    }
    case 'sign': {
      const n = pickSign(CANYON_SIGN_SET, p.a);
      const j = SIGNED[n] as number;
      const sign = CANYON_SIGNS[j] as Sign;
      const slot = SLOTS[j] as Tower & { z0: number };
      const d = ahead(slot.z0, s);
      const { pos, frame } = signPoint(sign, p);
      return {
        pos: [pos[0], pos[1], pos[2] - s - d],
        rgb: scale(signColour(sign, frame, t), haze(d)),
        d,
      };
    }
    default: {
      const j = pick(CANYON_SET, p.a);
      const slot = SLOTS[j] as Tower & { z0: number };
      const d = ahead(slot.z0, s);
      const tw: Tower = { ...slot, z: -s - d };
      const h = haze(d);
      // Only the faces the street sees: the wall along it and the front toward the eye.
      const face = hash(p.i, 332) < 0.55 ? (tw.x < 0 ? 1 : 3) : 2;
      if (role === 'edge') {
        const { pos } = towerEdge(tw, p, tw.h, face);
        return { pos, rgb: scale(mix(VIOLET, EDGE, 0.5), 0.26 * h), d };
      }
      if (role === 'window') {
        const w = towerWindow(tw, p, t, tw.h, face);
        const tone = w.warm ? WARM_WINDOW : COOL_WINDOW;
        return { pos: w.pos, rgb: scale(tone, (0.02 + 0.26 * w.lit) * h), d };
      }
      const { pos, band } = towerBand(tw, p);
      return { pos, rgb: scale(neonAt(j + (band % 2) * 2, t), 0.4 * h), d };
    }
  }
}

/* ---------- 7. Ship: your own ship, through an endless city ---------- */
/*
 * 2026-11-12: "long term aim will be to create that future neon city that we
 * fly through on a spaceship." A first flight: the city is a field of towers
 * that wraps round you, so it never ends, its far edge fading; traffic runs
 * in the streets at four heights. Keys only, as the Shark Sim: A and D turn,
 * W and S climb and dive, E or Shift faster, Q or X slower, Space boosts
 * while the bar lasts and the bar fills again as you cruise. The towers'
 * walls hold you: you slide along them.
 */

export const FLY_SPEED = 9;
export const FIELD = 96;
const FIELD_BLOCKS = 4;
const FIELD_PITCH = FIELD / FIELD_BLOCKS;
/** The highest you can climb: well over the tallest tower. */
export const SKY = GROUND + 90;
/** How close to a wall you can come. */
export const MARGIN = 1.2;
export const BOOST_PACE = 3;
export const BOOST_SECONDS = 3;
/** Seconds of cruising that fill an empty bar. */
export const BOOST_REFILL = 10;

export const FIELD_TOWERS: Tower[] = Array.from({ length: FIELD_BLOCKS * FIELD_BLOCKS }, (_, j) => {
  const i = j % FIELD_BLOCKS;
  const l = Math.floor(j / FIELD_BLOCKS);
  return {
    x: i * FIELD_PITCH - FIELD / 2 + FIELD_PITCH / 2 + (hash(j, 401) - 0.5) * 2.4,
    z: l * FIELD_PITCH - FIELD / 2 + FIELD_PITCH / 2 + (hash(j, 402) - 0.5) * 2.4,
    hx: 3.5 + 3 * hash(j, 403),
    hz: 3.5 + 3 * hash(j, 404),
    h: 16 + 36 * hash(j, 405) ** 1.2,
    k: j + 120,
  };
});
const FIELD_SET = towerSet(FIELD_TOWERS);
/** The streets of the field: between every two rows of blocks. */
const FIELD_STREETS = Array.from({ length: FIELD_BLOCKS }, (_, i) => i * FIELD_PITCH - FIELD / 2);
const FIELD_LANES = [10, 20, 32, 46].flatMap((h, level) =>
  FIELD_STREETS.flatMap((at, n) =>
    ([1, -1] as const).map((dir) => ({
      axis: level % 2 ? 2 : 0,
      at: at + dir * 0.9,
      y: GROUND + h,
      dir,
      speed: 7 + 4 * hash(level * 10 + n, 411),
    })),
  ),
);
const FIELD_SHIPS = 200;
/** A sign on every third tower of the field. */
const FIELD_SIGNS: Sign[] = FIELD_TOWERS.flatMap((tw, j) => {
  if (j % 3 !== 1) return [];
  const s: Sign = {
    text: SIGN_TEXTS[j % SIGN_TEXTS.length] as string,
    at: [0, 0, 0],
    vertical: true,
    px: 0.22,
    tone: SIGN_TONES[j % SIGN_TONES.length] as Sign['tone'],
    k: j + 90,
  };
  const { h } = signSize(s);
  return [{ ...s, at: [tw.x + tw.hx + 0.3, GROUND + 12 + h, tw.z + tw.hz * 0.5] as Vec3 }];
});
const FIELD_SIGN_SET = signSet(FIELD_SIGNS);
const FIELD_SIGN_TOWER = FIELD_TOWERS.flatMap((_, j) => (j % 3 === 1 ? [j] : []));

const headingOf = (yaw: number, pitch: number): Vec3 => [
  -Math.sin(yaw) * Math.cos(pitch),
  Math.sin(pitch),
  -Math.cos(yaw) * Math.cos(pitch),
];
const fly = {
  on: false,
  pos: [0, GROUND + 24, 0] as Vec3,
  yaw: 0,
  pitch: 0,
  speed: FLY_SPEED,
  boost: 1,
  /** How far the ship leans into its turn, eased. */
  bank: 0,
  t: 0,
};
export const hasGame = (k: number) => PHASES[k]?.id === 'ship';
export const boostLeft = () => fly.boost;

/**
 * The autopilot's round: the streets round two blocks by two, its corners rounded, `d` along it
 * (x and z). Staying near the middle of the field, the Journey never carries the eye far off.
 */
const LAP_H = FIELD_PITCH;
const LAP_R = 3;
const LAP_SIDE = 2 * LAP_H - 2 * LAP_R + (Math.PI * LAP_R) / 2;
function lap(d: number): [number, number] {
  const w = wrap(d, 4 * LAP_SIDE);
  const side = Math.floor(w / LAP_SIDE);
  const s = w - side * LAP_SIDE;
  const straight = 2 * LAP_H - 2 * LAP_R;
  let x: number;
  let z: number;
  if (s < straight) [x, z] = [-LAP_H, LAP_H - LAP_R - s];
  else {
    const a = Math.PI + (s - straight) / LAP_R;
    [x, z] = [-LAP_H + LAP_R + LAP_R * Math.cos(a), -LAP_H + LAP_R + LAP_R * Math.sin(a)];
  }
  // Each side the first turned a quarter round: (x, z) to (-z, x).
  for (let i = 0; i < side; i++) [x, z] = [-z, x];
  return [x, z];
}

/** With no one at the controls (the Journey, or let go): round the streets, rising and sinking among the towers. */
function autopilot(t: number): { c: Vec3; f: Vec3 } {
  const at = (tt: number): Vec3 => {
    const [x, z] = lap(FLY_SPEED * tt);
    return [x, GROUND + 26 + 10 * Math.sin(0.07 * tt), z];
  };
  const c = at(t);
  const n = at(t + 0.05);
  return { c, f: norm([n[0] - c[0], n[1] - c[1], n[2] - c[2]]) };
}

/** A coordinate of the field brought round to the copy of it nearest `c`. */
const nearest = (x: number, c: number) => c + wrap(x - c + FIELD / 2, FIELD) - FIELD / 2;

/** Whether a point is inside a tower of the field, walls and MARGIN included. */
export function blocked(q: Vec3): boolean {
  for (const tw of FIELD_TOWERS) {
    if (q[1] > GROUND + tw.h + MARGIN) continue;
    if (
      Math.abs(q[0] - nearest(tw.x, q[0])) < tw.hx + MARGIN &&
      Math.abs(q[2] - nearest(tw.z, q[2])) < tw.hz + MARGIN
    )
      return true;
  }
  return false;
}

/**
 * The controls, each frame: whether you are flying, the keys held, and how far the piece's time
 * moved. Keys only, never the mouse, as in the Shark Sim.
 */
export function setFly(active: boolean, keys: string[], dt: number, t: number) {
  fly.t = t;
  if (!active) {
    fly.on = false;
    fly.boost = Math.min(1, fly.boost + dt / BOOST_REFILL);
    return;
  }
  if (!fly.on) {
    // Taking over from the autopilot where it is.
    const a = autopilot(t);
    fly.pos = a.c;
    fly.yaw = Math.atan2(-a.f[0], -a.f[2]);
    fly.pitch = Math.asin(Math.max(-1, Math.min(1, a.f[1])));
    fly.speed = FLY_SPEED;
    fly.bank = 0;
    fly.on = true;
  }
  const held = (...names: string[]) => names.some((n) => keys.includes(n));
  const turn = (held('a', 'arrowleft') ? -1.2 : 0) + (held('d', 'arrowright') ? 1.2 : 0);
  fly.yaw -= turn * dt;
  fly.bank += (-turn * 0.45 - fly.bank) * (1 - Math.exp(-4 * dt));
  let tilt = (held('w', 'arrowup') ? 0.55 : 0) - (held('s', 'arrowdown') ? 0.55 : 0);
  if (fly.pos[1] <= GROUND + 2.5 && tilt < 0) tilt = 0;
  if (fly.pos[1] >= SKY && tilt > 0) tilt = 0;
  fly.pitch += (tilt - fly.pitch) * (1 - Math.exp(-2.5 * dt));
  const boosting = held(' ') && fly.boost > 0;
  if (boosting) fly.boost = Math.max(0, fly.boost - dt / BOOST_SECONDS);
  else if (!held(' ')) fly.boost = Math.min(1, fly.boost + dt / BOOST_REFILL);
  const pace = boosting ? BOOST_PACE : held('e', 'shift') ? 1.8 : held('q', 'x') ? 0.4 : 1;
  fly.speed += (FLY_SPEED * pace - fly.speed) * (1 - Math.exp((boosting ? -4 : -1.5) * dt));
  const was = fly.pos;
  const f = headingOf(fly.yaw, fly.pitch);
  const next: Vec3 = add(was, f, fly.speed * dt);
  next[1] = Math.max(GROUND + 2, Math.min(SKY, next[1]));
  // A wall in the way: slide along it, keeping whichever way is free.
  const tries: Vec3[] = [
    next,
    [next[0], next[1], was[2]],
    [was[0], next[1], next[2]],
    [was[0], next[1], was[2]],
  ];
  fly.pos = tries.find((q) => !blocked(q)) ?? was;
}

/** You: where you are at time t and which way you fly. */
export function flier(t: number): { c: Vec3; f: Vec3 } {
  return fly.on ? { c: fly.pos, f: headingOf(fly.yaw, fly.pitch) } : autopilot(t);
}

/** The cockpit's dials: your height over the street and your speed. */
export type Gauge = { label: string; value: number; min?: number; max: number; unit?: string };
export function gauges(): Gauge[] {
  const { c } = flier(fly.t);
  return [
    { label: 'Height', value: Math.round(c[1] - GROUND), max: SKY - GROUND, unit: 'm' },
    {
      label: 'Speed',
      value: Math.round(fly.on ? fly.speed : FLY_SPEED),
      max: FLY_SPEED * BOOST_PACE,
      unit: 'm/s',
    },
  ];
}

const SHIP_ROLES = [
  ['ground', 0.05],
  ['sky', 0.07],
  ['edge', 0.46],
  ['window', 0.64],
  ['band', 0.7],
  ['sign', 0.8],
  ['traffic', 0.96],
  ['you', 1],
] as const;

/** How much shows at a horizontal distance from you: all near, nothing at the field's wrapping edge. */
const fieldEdge = (q: Vec3, c: Vec3) =>
  smooth((FIELD / 2 - 4 - Math.hypot(q[0] - c[0], q[2] - c[2])) / 16);

function shipAt(p: Particle, t: number): Spot {
  const { c, f } = flier(t);
  const role = roleOf(p.c, SHIP_ROLES);
  const twinkle = 0.75 + 0.25 * Math.sin(t * 0.9 + p.i * 0.37);
  const placed = (tw: Tower): Tower => ({ ...tw, x: nearest(tw.x, c[0]), z: nearest(tw.z, c[2]) });
  switch (role) {
    case 'ground': {
      // The block outlines round you, brought round as you fly.
      const j = Math.floor(p.a * FIELD_TOWERS.length);
      const tw = placed(FIELD_TOWERS[j] as Tower);
      const block: Tower = { ...tw, hx: FIELD_PITCH / 2 - 3, hz: FIELD_PITCH / 2 - 3 };
      const pos = ringAt(block, p.b, GROUND);
      return { pos, rgb: scale(GROUND_LINE, 0.16 * fieldEdge(pos, c)) };
    }
    case 'sky':
      return { pos: skyAt(p, [c[0], 0, c[2]]), rgb: scale(STAR, 0.25 * twinkle) };
    case 'you': {
      const pace = fly.on ? Math.max(0, fly.speed / FLY_SPEED - 0.4) : 0.6;
      const { pos, part } = craftAt(c, f, 2.4, p, pace, fly.on ? fly.bank : 0);
      return { pos, rgb: craftColour(part, p, 0.42) };
    }
    case 'traffic': {
      const j = Math.floor(p.a * FIELD_SHIPS);
      const lane = FIELD_LANES[j % FIELD_LANES.length] as (typeof FIELD_LANES)[number];
      const per = FIELD_SHIPS / FIELD_LANES.length;
      const m = Math.floor(j / FIELD_LANES.length);
      const along = (m + 0.7 * hash(j, 412)) * (FIELD / per) + lane.dir * lane.speed * t;
      const q: Vec3 =
        lane.axis === 0
          ? [nearest(along, c[0]), lane.y, nearest(lane.at, c[2])]
          : [nearest(lane.at, c[0]), lane.y + 0.5, nearest(along, c[2])];
      const dir: Vec3 = lane.axis === 0 ? [lane.dir, 0, 0] : [0, 0, lane.dir];
      return {
        pos: dashAt(q, dir, p, 2.8),
        rgb: scale(lane.dir > 0 ? HEADLIGHT : TAILLIGHT, 0.55 * dashGlow(p) * fieldEdge(q, c)),
      };
    }
    case 'sign': {
      const n = pickSign(FIELD_SIGN_SET, p.a);
      const sign = FIELD_SIGNS[n] as Sign;
      const tw = FIELD_TOWERS[FIELD_SIGN_TOWER[n] as number] as Tower;
      const { pos, frame } = signPoint(sign, p);
      const q: Vec3 = [
        pos[0] - tw.x + nearest(tw.x, c[0]),
        pos[1],
        pos[2] - tw.z + nearest(tw.z, c[2]),
      ];
      return { pos: q, rgb: scale(signColour(sign, frame, t), fieldEdge(q, c)) };
    }
    default: {
      const j = pick(FIELD_SET, p.a);
      const tw = placed(FIELD_TOWERS[j] as Tower);
      if (role === 'edge') {
        const { pos } = towerEdge(tw, p, tw.h, -1, 9);
        return { pos, rgb: scale(mix(VIOLET, EDGE, 0.5), 0.32 * fieldEdge(pos, c)) };
      }
      if (role === 'window') {
        const w = towerWindow(tw, p, t);
        const tone = w.warm ? WARM_WINDOW : COOL_WINDOW;
        return { pos: w.pos, rgb: scale(tone, (0.02 + 0.3 * w.lit) * fieldEdge(w.pos, c)) };
      }
      const { pos, band } = towerBand(tw, p);
      return { pos, rgb: scale(neonAt(j + (band % 2) * 2, t), 0.38 * fieldEdge(pos, c)) };
    }
  }
}

/* ---------- where every grain is ---------- */

/** Where particle p is in piece k's own form, and its colour, `u` through it, at chapter time t. */
export function formAt(k: number, p: Particle, u: number, t: number): Spot {
  switch (PHASES[k]?.id) {
    case 'towers':
      return towersAt(p, Math.max(u, 0), t);
    case 'lanes':
      return lanesAt(p, u, t);
    case 'neon':
      return neonCityAt(p, t);
    case 'chinatown':
      return chinatownAt(p, t);
    case 'docks':
      return docksAt(p, t);
    case 'canyon':
      return canyonAt(p, u, t);
    default:
      return shipAt(p, t);
  }
}

/*
 * Between pieces: a ball of faint stars, as in Vegetal and Ocean. Each form
 * loosens into a wide, slowly turning ball round where the next piece stands,
 * and the stars settle into it one by one.
 */
const BALL_R = 22;

/** How far grain p has come from the ball of stars into piece k's form, `u` through it. */
export function arrival(k: number, p: Particle, u: number): number {
  const order = k === 0 ? 0.6 * p.b : p.b;
  return smooth((u - 0.02 - 0.4 * order) / 0.14);
}

/** The grain's place in the ball of stars round piece k. */
export function starBall(k: number, p: Particle, t: number): Vec3 {
  const c = eyeIn(k, 0, t).target;
  const r = BALL_R * Math.cbrt(hash(p.i, 61));
  const a = t * 0.05;
  const x = p.dir[0] * r;
  const z = p.dir[2] * r;
  return [
    c[0] + x * Math.cos(a) - z * Math.sin(a),
    c[1] + p.dir[1] * r,
    c[2] + x * Math.sin(a) + z * Math.cos(a),
  ];
}

/** Where particle p is in piece k, `u` through it, at chapter time t, and its colour. */
function journeyAt(k: number, p: Particle, u: number, t: number): Spot {
  const f = formAt(k, p, u, t);
  const a = arrival(k, p, u);
  if (a >= 1) return f;
  const twinkle = 0.6 + 0.4 * Math.sin(t * 2.3 + p.i * 0.91);
  return {
    pos: lerp3(starBall(k, p, t), f.pos, a),
    rgb: mix(scale(STAR, 0.32 * twinkle), f.rgb, a),
  };
}
export const target = (k: number, p: Particle, u: number, t: number) => journeyAt(k, p, u, t).pos;
export const colour = (k: number, p: Particle, u: number, t: number) => journeyAt(k, p, u, t).rgb;

/* ---------- the moving eye ---------- */

type Eye = { eye: Vec3; target: Vec3 };

/** Where the camera stands in piece k, `u` through it. */
export function eyeIn(k: number, u: number, t: number): Eye {
  switch (PHASES[k]?.id) {
    case 'towers': {
      // Slowly round the city, above its roofs, looking at its heart.
      const a = 0.6 + u * 1.1;
      return {
        eye: [Math.sin(a) * 66, GROUND + 34, Math.cos(a) * 66],
        target: [0, GROUND + 13, 0],
      };
    }
    case 'lanes': {
      const a = 2.1 + t * 0.03;
      return {
        eye: [Math.sin(a) * 52, GROUND + 26, Math.cos(a) * 52],
        target: [0, GROUND + 17, 0],
      };
    }
    case 'neon': {
      // Lower and closer, among the towers, looking up a little.
      const a = 3.6 + t * 0.025;
      return {
        eye: [Math.sin(a) * 40, GROUND + 11, Math.cos(a) * 40],
        target: [0, GROUND + 19, 0],
      };
    }
    case 'chinatown': {
      // Walking pace through the gate and on down the street, eyes a little up at the signs.
      const z = GATE_Z + 30 - 50 * u;
      const sway = Math.sin(t * 0.13) * 0.5;
      return { eye: [sway, GROUND + 5.5, z], target: [sway * 0.3, GROUND + 10, z - 30] };
    }
    case 'docks': {
      const a = 5 + t * 0.03;
      return {
        eye: [Math.sin(a) * 50, GROUND + 36, Math.cos(a) * 50],
        target: [0, GROUND + 21, 0],
      };
    }
    case 'canyon': {
      // Down the middle of the street, between the towers.
      const s = flown(u);
      const sway = Math.sin(t * 0.13) * 0.8;
      const bob = Math.sin(t * 0.09) * 1.2;
      return {
        eye: [sway, EYE_Y + bob, -s],
        target: [sway * 0.4, EYE_Y + bob - 1.5, -s - 30],
      };
    }
    default: {
      // Behind your ship and a little above, looking past it the way you fly.
      const { c, f } = flier(t);
      const eye = add(add(c, f, -10), [0, 1, 0], 3.2);
      eye[1] = Math.max(GROUND + 1, eye[1]);
      return { eye, target: add(c, f, 6) };
    }
  }
}

/** The camera at chapter time t, eased into the next piece's start in the last quarter. */
export function camera(time: number): Eye {
  const t = wrap(time, TOTAL);
  const { index, u } = phaseAt(t);
  const a = eyeIn(index, u, t);
  const w = smooth((u - 0.75) / 0.25);
  if (w <= 0) return a;
  const b = eyeIn((index + 1) % PHASES.length, 0, t);
  return { eye: lerp3(a.eye, b.eye, w), target: lerp3(a.target, b.target, w) };
}

/* ---------- the flow between pieces ---------- */

/** Position and colour of particle p at chapter time t, flowing between pieces. */
export function particleAt(p: Particle, time: number): { pos: Vec3; rgb: RGB } {
  const t = wrap(time, TOTAL);
  const { index, u } = phaseAt(t);
  const w = flow(p, u);
  const a = journeyAt(index, p, u, t);
  if (w <= 0) return a;
  const b = journeyAt((index + 1) % PHASES.length, p, 0, t);
  return { pos: lerp3(a.pos, b.pos, w), rgb: mix(a.rgb, b.rgb, w) };
}

/*
 * Each piece on its own, as Ocean's are: it starts at its beginning with no
 * ball of stars, picked by name, and loops, each grain gliding back to where
 * the piece began. The canyon never loops back: the eye flies on, two turns
 * of the street per loop, so the wrap does not show.
 */
const isCanyon = (k: number) => PHASES[k]?.id === 'canyon';

/** How long piece k plays on its own before it loops, in seconds. */
export function pieceLength(k: number): number {
  return isCanyon(k) ? (2 * LOOP) / SPEED : (PHASES[k] as CityPhase).duration;
}

/** Piece k on its own, `s` seconds in: how far through the loop (f), the piece's own u, and its time. */
function pieceClock(k: number, s: number): { f: number; u: number; t: number } {
  const len = pieceLength(k);
  const f = wrap(s, len) / len;
  return { f, u: (f * len) / (PHASES[k] as CityPhase).duration, t: s };
}

/** How far through its loop piece k is, `s` seconds in, for the words. */
export const pieceProgress = (k: number, s: number) => pieceClock(k, s).f;

/** Position and colour of particle p in piece k on its own, `s` seconds in. */
export function pieceAt(p: Particle, k: number, s: number): { pos: Vec3; rgb: RGB } {
  const { f, u, t } = pieceClock(k, s);
  const a = formAt(k, p, u, t);
  if (isCanyon(k)) return a;
  const w = smooth((f - 0.8 + 0.12 * p.stagger) / 0.2);
  if (w <= 0) return a;
  const b = formAt(k, p, 0, t);
  return { pos: lerp3(a.pos, b.pos, w), rgb: mix(a.rgb, b.rgb, w) };
}

/** The camera in piece k on its own, easing back to where the piece began in the last quarter. */
export function pieceCamera(k: number, s: number): Eye {
  const { f, u, t } = pieceClock(k, s);
  const a = eyeIn(k, u, t);
  const w = isCanyon(k) ? 0 : smooth((f - 0.75) / 0.25);
  if (w <= 0) return a;
  const b = eyeIn(k, 0, t);
  return { eye: lerp3(a.eye, b.eye, w), target: lerp3(a.target, b.target, w) };
}

/** Glow and size of piece k on its own. */
export function pieceLook(k: number): { glow: number; size: number } {
  const { glow, size } = PHASES[k] as CityPhase;
  return { glow, size };
}

/** Glow and size for the whole picture, blended across piece boundaries. */
export function look(time: number): { glow: number; size: number } {
  const { index, u } = phaseAt(time);
  const now = PHASES[index] as CityPhase;
  const next = PHASES[(index + 1) % PHASES.length] as CityPhase;
  const w = smooth((u - 0.75) / 0.25);
  return { glow: lerp(now.glow, next.glow, w), size: lerp(now.size, next.size, w) };
}
