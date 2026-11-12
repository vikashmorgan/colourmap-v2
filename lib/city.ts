/*
 * CITY — the third chapter, after Vegetal and Ocean (docs/specs/art-city.md).
 *
 * 2026-11-12: "basically the cells looked like a future city with spaceships
 * travelling. work on creating that future city. as vegetal. ocean and city
 * after that. in there u can create different components one by one. long
 * term aim will be to create that future neon city that we fly through on a
 * spaceship."
 *
 * It opens on the golden city (lib/golden-city.ts: its plan from φ, the city
 * rising from it, its heart, its temples, factories and glass domes), then
 * five night cities from above (lib/city-plans.ts), then the neon city.
 *
 * Fifteen pieces played as one trip, built as Ocean is (lib/ocean.ts): every
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
import {
  advancePulses,
  type Block,
  blocked,
  blockTower,
  cruiser,
  DISTRICTS,
  type DistrictId,
  districtAt,
  floorAt,
  gameItems,
  inMouth,
  MARGIN,
  NEAR,
  portalJump,
  SHIP_SLOTS,
  shipGrain,
  signsNear,
  touchLanterns,
  viewAt,
  wallTint,
} from './city-game';
import { AVENUE, BLOCK_X, BLOCK_Z, type Item, TILE_J } from './city-grid';
import { aboveAt, aboveEye, CITIES, setCityKind } from './city-plans';
import { raceBanner, raceStep, resetRace, rival, trackItems } from './city-race';
import { skyGrain } from './city-sky';
import {
  buildingAt,
  buildingEye,
  DOMES,
  FACTORIES,
  FACTORY_PALETTES,
  GOLDEN_PALETTES,
  goldenPlanAt,
  goldenPlanEye,
  heartAt,
  heartEye,
  NOVA_CORES,
  novaAt,
  novaEye,
  PLANS,
  risingAt,
  risingEye,
  setGoldenPalette,
  setNovaKind,
  setPlanKind,
  TEMPLES,
} from './golden-city';

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
    id: 'golden-plan',
    name: 'Golden plan',
    line: 'A round city of light seen from above, lit ring by ring from its golden heart: the rings of knowledge, making, living and nature, each φ times wider than the last, canals between them, twelve boulevards running out through all of them.',
    words: [
      'A city can be drawn from one number, the way a sunflower is.',
      'Every road leads to the centre, and the centre belongs to everyone.',
    ],
    duration: 40,
    glow: 1.05,
    size: 2,
  },
  {
    id: 'rising',
    name: 'Rising',
    line: 'The plan rises from the map: each ring φ times higher toward the heart, the living ring in terraces, nature staying low, the canals flat and shining, as the eye tilts down from above to the side.',
    words: [
      'What is drawn with care can be built with care.',
      'A city rises the way hope does: from the centre outward.',
    ],
    duration: 40,
    glow: 1,
    size: 3,
  },
  {
    id: 'heart',
    name: 'The heart',
    line: 'The centre up close: an open sphere of golden light breathing slowly over a round garden where all twelve boulevards meet, low terraces stepping down to the canal, ships passing far above.',
    words: [
      'The heart of the city is not a palace: it is open, and it is light.',
      'It belongs to no one, so it belongs to all.',
    ],
    duration: 36,
    glow: 1.05,
    size: 1,
  },
  {
    id: 'nova',
    name: 'Nova Cores',
    line: 'Power sources of the city in the heart’s style: an open lattice of light floating over a round plaza, each core from its own rule, breathing slowly as its energy runs out along the conduits on the ground.',
    words: [
      'Every district needs a place where the light is made, and given away.',
      'A power that breathes is a power that can be shared.',
    ],
    duration: 36,
    glow: 1.05,
    size: 1,
  },
  {
    id: 'temples',
    name: 'Temples',
    line: 'Golden temples, each built from a few shapes and one ratio (a rotunda, a ziggurat, a ring, a pyramid, a lotus), then gathered into a court, a sacred complex and a whole temple quarter.',
    words: [
      'The simplest rules make the calmest buildings.',
      'A temple is a place built so that light has somewhere to rest.',
    ],
    duration: 36,
    glow: 1,
    size: 0.95,
  },
  {
    id: 'factories',
    name: 'Factories',
    line: 'Works in the ring of making (a sawtooth hall, a foundry, an assembly hall, workshops and their crane, a solar works, old cement works, bottle kilns), then a factory group, an industrial complex and a whole industrial quarter.',
    words: ['Making is a kind of hope you can hold.', 'A good workshop is as bright as a temple.'],
    duration: 36,
    glow: 1,
    size: 0.95,
  },
  {
    id: 'domes',
    name: 'Domes',
    line: 'Golden glasshouses full of plants (a geodesic dome, bubbles, a palm house, a lattice shell), then a group of domes, a dome complex joined by glass corridors and a whole solarpunk dome quarter.',
    words: [
      'Under glass, a garden keeps its summer.',
      'The lightest roof is the one the sun comes through.',
    ],
    duration: 36,
    glow: 1,
    size: 0.95,
  },
  {
    id: 'above',
    name: 'From above',
    line: 'Night cities seen from far above: streets branch like roots but in order, the centre glows, highways reach into the dark and car lights move along them. Five cities to choose from.',
    words: [
      'From high enough, a city at night looks like something that grew.',
      'Its streets branch the way roots do: toward what it needs.',
    ],
    duration: 36,
    glow: 1.05,
    size: 0.7,
  },
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
    size: 0.65,
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
    size: 0.65,
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
    line: 'Flying down an endless street between the towers, ships flying forward above and below, one colour to each road, and cross streets high above; the towers behind come round to the far end, so the street never ends.',
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
    line: 'Pilot a small ship through the City of Dreams: Chinatown, the Indian quarter, Istanbul, the Heights, the canals, golden gardens, temples, factories, domes, pyramids. A and D turn, W and S climb and dive, E faster, Q slower, Space boosts (with W, up into the stratosphere), L slows down to look, Enter starts a race.',
    words: [
      'A city you can read from above is a city you can find your way home in.',
      'Fly gently: the city answers, a window waking for every one who passes.',
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
  '#ffd27a',
  '#f5c060',
  '#fff1c8',
  '#ffe2a0',
  '#e8b450',
  '#d99a4a',
  '#cfe08a',
  '#f2c25a',
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

/*
 * When tower j starts to rise and how far it has risen, `u` through the piece: the middle first.
 * 2026-11-12: "towers and sky lanes make them start moving faster": the middle tower rises from
 * the first moment, quickly at first and settling (an ease-out), the rim's by a seventh of the
 * way in, every tower up by about a third (some ten seconds).
 */
export function builtTop(j: number, u: number): number {
  const tw = CITY[j] as Tower;
  const mid = (BLOCKS - 1) / 2;
  const far = Math.hypot((j % BLOCKS) - mid, Math.floor(j / BLOCKS) - mid) / Math.hypot(mid, mid);
  const start = 0.12 * far + 0.04 * hash(j, 207) * far;
  const x = Math.min(1, Math.max(0, (u - start) / 0.2));
  return tw.h * (1 - (1 - x) ** 2);
}

type Spot = { pos: Vec3; rgb: RGB };

/*
 * 2026-11-12: "towers and sky lanes more defined, more dots." The grains go where the eye sees
 * them: each tower's faces turned toward the eye, weighted by how squarely they face it (a face
 * seen edge-on gets few, the back faces almost none), their corners, floor lines and windows.
 * A grain near the line between two faces' shares fades, so as the eye goes round, grains that
 * change face do it unlit, never popping.
 */
const FACE_FLOOR = 0.03;
export function facingFace(tw: Tower, eye: Vec3, q: number): { face: number; fade: number } {
  const dx = eye[0] - tw.x;
  const dz = eye[2] - tw.z;
  const l = Math.hypot(dx, dz) || 1;
  const w = [
    Math.max(0, -dz / l) + FACE_FLOOR,
    Math.max(0, dx / l) + FACE_FLOOR,
    Math.max(0, dz / l) + FACE_FLOOR,
    Math.max(0, -dx / l) + FACE_FLOOR,
  ];
  const sum = (w[0] as number) + (w[1] as number) + (w[2] as number) + (w[3] as number);
  let run = 0;
  for (let f = 0; f < 4; f++) {
    const lo = run;
    run += (w[f] as number) / sum;
    if (q < run || f === 3) {
      const edge = Math.min(q - lo, run - q);
      return { face: f, fade: smooth(edge / 0.015) };
    }
  }
  return { face: 0, fade: 1 };
}

const TOWER_ROLES = [
  ['ground', 0.05],
  ['sky', 0.08],
  ['edge', 0.56],
  ['window', 1],
] as const;

/** Where the eye goes round the towers, `u` through the piece. */
function towersEye(u: number): { eye: Vec3; target: Vec3 } {
  const a = 0.6 + u * 1.1;
  return { eye: [Math.sin(a) * 66, GROUND + 34, Math.cos(a) * 66], target: [0, GROUND + 13, 0] };
}
/** Where the eye goes round the lanes at time t. */
function lanesEye(t: number): { eye: Vec3; target: Vec3 } {
  const a = 2.1 + t * 0.03;
  return { eye: [Math.sin(a) * 52, GROUND + 26, Math.cos(a) * 52], target: [0, GROUND + 17, 0] };
}

function towersAt(p: Particle, u: number, t: number, eye: Vec3 = towersEye(u).eye): Spot {
  const twinkle = 0.7 + 0.3 * Math.sin(t * 1.3 + p.i * 0.37);
  switch (roleOf(p.c, TOWER_ROLES)) {
    case 'ground':
      return { pos: groundAt(p), rgb: scale(GROUND_LINE, 0.16) };
    case 'sky':
      return { pos: skyAt(p, [0, 0, 0]), rgb: scale(STAR, 0.3 * twinkle) };
    case 'edge': {
      const j = pick(CITY_SET, p.a);
      const tw = CITY[j] as Tower;
      const top = builtTop(j, u);
      const { face, fade } = facingFace(tw, eye, hash(p.i, 15));
      const { pos, built } = towerEdge(tw, p, top, face);
      // The rim being built glows warm; a tower not yet begun stays dark.
      return {
        pos,
        rgb: built ? scale(EDGE, 0.3 * fade) : scale(WARM_WINDOW, 0.2 * fade * smooth(top / 1.5)),
      };
    }
    default: {
      const j = pick(CITY_SET, p.a);
      const tw = CITY[j] as Tower;
      const top = builtTop(j, u);
      const { face, fade } = facingFace(tw, eye, hash(p.i, 16));
      const w = towerWindow(tw, p, t, top, face);
      const tone = w.warm ? WARM_WINDOW : COOL_WINDOW;
      return { pos: w.pos, rgb: scale(tone, (0.03 + 0.26 * w.lit) * fade) };
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
      speed: 6.5 + 3.5 * hash(level * 10 + n, 211),
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
  ['ground', 0.04],
  ['sky', 0.06],
  ['edge', 0.3],
  ['window', 0.5],
  ['ship', 1],
] as const;

/*
 * The traffic is streaming from the first moment (2026-11-12: "make them start moving faster"):
 * no ship waits to come on, and the lanes run quicker than before (6.5 to 10 a second).
 */
function lanesAt(p: Particle, _u: number, t: number): Spot {
  const role = roleOf(p.c, LANE_ROLES);
  if (role !== 'ship') {
    // The city stands grown and dimmer, so the traffic reads; only its faces toward the eye.
    const s = towersAt(p, 1, t, lanesEye(t).eye);
    return { pos: s.pos, rgb: scale(s.rgb, role === 'window' ? 0.7 : 0.85) };
  }
  const j = Math.floor(p.a * SHIPS);
  const { c, f, edge, dir } = laneShip(j, t);
  return {
    pos: dashAt(c, f, p, 2.4),
    rgb: scale(dir > 0 ? HEADLIGHT : TAILLIGHT, 0.6 * dashGlow(p) * edge),
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
const signCache = new Map<string, Float32Array>();
/**
 * Every lit pixel of a sign's characters, as x and y down from its top left, in pixels: the same
 * for every sign of the same words, so kept by its words.
 */
function signPixels(s: Sign): Float32Array {
  const key = `${s.text}${s.vertical ? '|' : '-'}`;
  const had = signCache.get(key);
  if (had) return had;
  const out: number[] = [];
  [...s.text].forEach((ch, n) => {
    const step = n * (GLYPH_PX + GAP);
    for (const [c, r] of glyph(ch, s.vertical)) {
      out.push(s.vertical ? c : c + step, s.vertical ? r + step : r);
    }
  });
  const arr = new Float32Array(out);
  signCache.set(key, arr);
  return arr;
}
export const signPixelCount = (s: Sign) => signPixels(s).length / 2;

/** Grain p on a sign: most on a lit pixel of its characters, the rest on a thin frame round them. */
export function signPoint(
  s: Sign,
  p: Pick<Particle, 'i'>,
  salt = 51,
): { pos: Vec3; frame: boolean } {
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

type GatePart = 'pillar' | 'beam' | 'roof' | 'plaque';
/** A grain of the gate: four red pillars, two beams, curved roofs turning up at their ends. */
function gateAt(p: Particle): { pos: Vec3; part: GatePart } {
  return gateShape(p.d, p.b, p.i);
}
/** The gate's shape: `q` (0..1) picks the part, `b` (0..1) the place along it, `i` the rest. */
function gateShape(q: number, b: number, i: number): { pos: Vec3; part: GatePart } {
  const p = { i, b };
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

const flown = (u: number) =>
  SPEED * u * (PHASES.find((p) => p.id === 'canyon') as CityPhase).duration;
const ahead = (z0: number, s: number) => wrap(z0 - s, LOOP) - BEHIND;
/** Light fades into the far violet, so the far end of the street never pops. */
const haze = (d: number) => smooth((LOOP - BEHIND - d) / 45);

/*
 * 2026-11-12: "the canyon make it only with lights going forward; the other
 * direction should be for the ones above that go from left to right or right
 * to left. each road has one colour of spaceship to keep it coherent."
 */
/** One colour per height of the street's traffic, low to high. */
const LANE_COLOURS: RGB[] = [AMBER, CYAN, HEADLIGHT, VIOLET];
/** The street's own traffic: four lanes either side of the eye, above and below it, all flying forward. */
export const CANYON_LANES = [-3.6, -1.4, 1.4, 3.6].flatMap((x, xi) =>
  [-9, -4, 5, 11].map((dy, level) => ({
    x,
    y: EYE_Y + dy,
    speed: 10 + 1.5 * level + 1.5 * hash(xi * 4 + level, 321),
    colour: LANE_COLOURS[level] as RGB,
  })),
);
/** Cross streets high above the canyon, each one way, left to right or right to left, in its own colour. */
const CROSS_COLOURS: RGB[] = [MAGENTA, GOLD, LANTERN_RED, MAGENTA];
export const CANYON_CROSSINGS = CROSS_COLOURS.map((colour, i) => ({
  z0: (i + 0.5) * (LOOP / CROSS_COLOURS.length),
  y: EYE_Y + (i % 2 ? 22 : 15),
  dir: i % 2 ? 1 : -1,
  speed: 6 + 2 * hash(i, 324),
  colour,
}));
/** How far either side of the street the cross traffic shows before the towers hide it. */
const CROSS_SPAN = 2 * (CANYON_W + 7);
const STREET_SHIPS = 128;
const CANYON_SHIPS = 160;

/**
 * Canyon ship j: where it is, which way it heads, its road's colour and how far ahead of the eye,
 * flown `s` down the street at time t. The first STREET_SHIPS fly the street; the rest cross above.
 */
export function canyonShip(
  j: number,
  s: number,
  t: number,
): { c: Vec3; d: number; dir: Vec3; colour: RGB; fade: number } {
  if (j < STREET_SHIPS) {
    const lane = CANYON_LANES[j % CANYON_LANES.length] as (typeof CANYON_LANES)[number];
    const per = STREET_SHIPS / CANYON_LANES.length;
    const m = Math.floor(j / CANYON_LANES.length);
    const z0 = ((m + 0.7 * hash(j, 323)) / per) * LOOP;
    // In the world it moves away down the street (-z); seen from the eye it wraps.
    const d = ahead(z0 + lane.speed * t, s);
    return { c: [lane.x, lane.y, -s - d], d, dir: [0, 0, -1], colour: lane.colour, fade: 1 };
  }
  const n = j - STREET_SHIPS;
  const cross = CANYON_CROSSINGS[n % CANYON_CROSSINGS.length] as (typeof CANYON_CROSSINGS)[number];
  const m = Math.floor(n / CANYON_CROSSINGS.length);
  const per = (CANYON_SHIPS - STREET_SHIPS) / CANYON_CROSSINGS.length;
  const x0 = ((m + 0.6 * hash(j, 325)) / per) * CROSS_SPAN;
  const x = wrap(x0 + cross.dir * cross.speed * t, CROSS_SPAN) - CROSS_SPAN / 2;
  const d = ahead(cross.z0, s);
  return {
    c: [x, cross.y, -s - d],
    d,
    dir: [cross.dir, 0, 0],
    colour: cross.colour,
    // Out of and back into the towers either side, never popping.
    fade: smooth((CROSS_SPAN / 2 - Math.abs(x)) / 3),
  };
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
      const { c, d, dir, colour, fade } = canyonShip(j, s, t);
      return {
        pos: dashAt(c, dir, p, 2.6),
        rgb: scale(colour, 0.55 * dashGlow(p) * haze(d) * fade),
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

/* ---------- 7. Ship: your own ship, down the avenue and through Chinatown ---------- */
/*
 * 2026-11-12: "long term aim will be to create that future neon city that we
 * fly through on a spaceship." Keys only, as the Shark Sim: A and D turn, W
 * and S climb and dive, E or Shift faster, Q or X slower, Space boosts while
 * the bar lasts and the bar fills again as you cruise. The towers' walls hold
 * you: you slide along them.
 *
 * Round two, the same day: "solid tower walls while you fly the ship, since
 * they still look like sparse lines of light. After that would come the ship
 * flying down the canyon past Chinatown, which is the start of the full
 * fly-through." The city is an endless grid of blocks, a tower to each: a
 * wide avenue runs on forward (-z) down the middle, narrower streets beside
 * it and side streets across, to turn into. Three blocks in every eight the
 * avenue is Chinatown: a red gate at either end, tall signs down the walls,
 * lanterns strung across overhead and a 夜市 banner; then neon towers again.
 *
 * The grains: the Canyon brings its towers round to the far end and draws only
 * the faces the street sees. Here that is taken all the way. Every frame the
 * city is a list of light sites (on each face: windows, its edges, neon bands
 * and a faint fill; signs, lanterns, gates; the kerbs) on just the towers in
 * front of the eye and within VIEW, on just the faces turned toward it, nearer
 * sites kept more densely than far ones. The pool of grains is dealt out to
 * them and whatever is left waits unlit. The picture is the set of sites, so
 * a grain moving from one site to another never shows; a site comes and goes
 * by fading, never popping.
 */

export const FLY_SPEED = 9;
/** The highest you can climb in normal flight: over every tower. */
export const SKY = GROUND + 150;
/** The stratosphere: how high the super boost takes you, the whole city laid out below. */
export const STRATOSPHERE = GROUND + 520;
/** How fast the super boost climbs (and dives back down). */
export const SUPER_CLIMB = 48;
/** Slow mode: a gentle drift, the eye tilted down at the city. */
export const SLOW_PACE = 0.22;
export { AVENUE, BLOCK_X, BLOCK_Z, blocked, blockTower, floorAt, MARGIN };
export const BOOST_PACE = 3;
export const BOOST_SECONDS = 3;
/** Seconds of cruising that fill an empty bar. */
export const BOOST_REFILL = 10;

/** Chinatown on the avenue: the first band of the plan (lib/city-game.ts), eight blocks in every 48. */
export const CT_EVERY = TILE_J;
export const CT_BLOCKS = 8;
/** How far the eye sees; the far towers sink into the violet night on the way. */
export const VIEW = 160;

/** Whether row J of the avenue's blocks is Chinatown. */
export const isChinatownRow = (J: number) => wrap(J, CT_EVERY) < CT_BLOCKS;

/** How far into Chinatown a point of the avenue at z is: 1 inside a stretch, easing to 0 over `ease` outside it. */
export function chinatownness(z: number, ease = 0): number {
  const s = wrap(z, CT_EVERY * BLOCK_Z);
  const len = CT_BLOCKS * BLOCK_Z;
  const out = s <= len ? 0 : Math.min(s - len, CT_EVERY * BLOCK_Z - s);
  if (ease > 0) return smooth(1 - out / ease);
  return out > 0 ? 0 : 1;
}

/* ---------- Chinatown on the avenue ---------- */

const signRows = new Map<number, Sign[]>();
/**
 * The tall signs of Chinatown's row J: two down the avenue side of each tower, standing out over
 * the avenue and facing down it (+z), so you read them as you come.
 */
export function avenueSigns(J: number): Sign[] {
  if (!isChinatownRow(J)) return [];
  const had = signRows.get(J);
  if (had) return had;
  const out: Sign[] = [];
  for (const side of [-1, 1]) {
    const tw = blockTower(side < 0 ? -1 : 0, J);
    for (const n of [0, 1]) {
      const j = J * 4 + (side < 0 ? 0 : 2) + n;
      const s0: Sign = {
        text: SIGN_TEXTS[wrap(j * 3 + 1, SIGN_TEXTS.length)] as string,
        at: [0, 0, 0],
        vertical: true,
        px: 0.25,
        tone: SIGN_TONES[wrap(j, SIGN_TONES.length)] as Sign['tone'],
        k: 200 + wrap(j, 97),
      };
      const { w, h } = signSize(s0);
      const x0 = side < 0 ? -AVENUE + 0.3 : AVENUE - 0.3 - w;
      const top = Math.min(GROUND + tw.h - 1, GROUND + 4 + h + 7 * hash(j, 431));
      out.push({ ...s0, at: [x0, top, tw.z + tw.hz * (n ? -0.45 : 0.6)] });
    }
  }
  if (signRows.size > 256) signRows.clear();
  signRows.set(J, out);
  return out;
}

/** The night-market banner across the middle of stretch n, between two strings of lanterns. */
function bannerOf(n: number): Sign {
  const s: Sign = { text: '夜市', at: [0, 0, 0], vertical: false, px: 0.3, tone: 'gold', k: 230 };
  const { w } = signSize(s);
  return { ...s, at: [-w / 2, GROUND + 23.5, n * CT_EVERY * BLOCK_Z + 48.5], k: 230 + wrap(n, 7) };
}
const banners = new Map<number, Sign>();
const bannerFor = (n: number) => {
  const had = banners.get(n);
  if (had) return had;
  if (banners.size > 64) banners.clear();
  const s = bannerOf(n);
  banners.set(n, s);
  return s;
};

/** Where the lantern strings cross the avenue in a stretch, from its start: every nine, inside the gates. */
const LANTERN_STRINGS = Array.from(
  { length: Math.floor((CT_BLOCKS * BLOCK_Z - 16) / 9) },
  (_, r) => 8 + 9 * r,
);
const LANTERNS_ACROSS = 7;
/** How high the strings are tied, over the ship's head as it flies under them. */
const STRING_Y = GROUND + 18.5;
const LANTERN_SITES = 66;
const STRING_SITES = 40;
/** The gate on the avenue, the Chinatown piece's own made larger, tall enough to fly under its beams. */
const GATE_WIDE = 1.65;
const GATE_TALL = 2;
const GATE_SITES = 1500;

/* ---------- the flight ---------- */

const headingOf = (yaw: number, pitch: number): Vec3 => [
  -Math.sin(yaw) * Math.cos(pitch),
  Math.sin(pitch),
  -Math.cos(yaw) * Math.cos(pitch),
];
/** The ways along the grid, as the autopilot keeps them: -z, +x, +z, -x. */
const WAYS: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
const turnTo = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Who flies: `route` the autopilot down the avenue (the Journey, or before anyone steers), the
 * same for the same moment; `pilot` you; `drift` the autopilot again once you let go, carrying on
 * from where you were along the streets, back to the avenue and down it.
 */
type Pilot = 'route' | 'pilot' | 'drift';
const fly = {
  mode: 'route' as Pilot,
  pos: [0, GROUND + 21, 0] as Vec3,
  yaw: 0,
  pitch: 0,
  speed: FLY_SPEED,
  boost: 1,
  /** How far the ship leans into its turn, eased. */
  bank: 0,
  t: 0,
  /** Carrying on: the way it keeps (WAYS), the street's line, the last crossing it chose at. */
  way: 0,
  line: 0,
  crossed: Number.NaN,
  /** Counts every move, so a frame's plan knows the ship has moved. */
  v: 0,
  /** The super boost: climbing on into the stratosphere (high), and how fast it climbs or falls. */
  high: false,
  vy: 0,
  /** Slow mode (L): a gentle drift, the eye looking down; `look` eases it in and out. */
  slow: false,
  look: 0,
  /** Keys held last frame, to catch a press (L, Enter). */
  held: [] as string[],
  /** The district you are in, and when you came into it, for its name on the screen. */
  district: '' as DistrictId | '',
  entered: Number.NEGATIVE_INFINITY,
};
export const hasGame = (k: number) => PHASES[k]?.id === 'ship';
export const boostLeft = () => fly.boost;
/** Whether slow mode is on. */
export const slowMode = () => fly.slow;
/**
 * The keys the Ship takes for itself beyond the arrows, each a round button on a phone: Space
 * boosts (with W, the super boost), L slow mode, Enter starts a race.
 */
export const SHIP_KEYS = [' ', 'l', 'enter'];

/** The height you cruise at down the avenue, and low under the lanterns through Chinatown. */
export const CRUISE_Y = GROUND + 21;
export const CHINATOWN_Y = GROUND + 8.5;
const cruiseY = (z: number, t: number) =>
  lerp(CRUISE_Y + 3 * Math.sin(0.09 * t), CHINATOWN_Y, chinatownness(z, 45));
/**
 * The route: on its own the piece starts sixty short of a Chinatown gate; in the Journey, which
 * reaches the ship's piece some minutes in, it passes near the middle of the city, so the grains
 * pour in from the canyon and on into the towers without crossing half the city.
 */
const ROUTE_Z0 =
  CT_BLOCKS * BLOCK_Z +
  60 +
  Math.round(
    (FLY_SPEED * (PHASE_START[PHASES.findIndex((p) => p.id === 'ship')] as number)) /
      (CT_EVERY * BLOCK_Z),
  ) *
    CT_EVERY *
    BLOCK_Z;
function routeAt(t: number): Vec3 {
  const z = ROUTE_Z0 - FLY_SPEED * t;
  return [1.5 * Math.sin(0.21 * t), cruiseY(z, t), z];
}
/** With no one at the controls: down the avenue, weaving a little, dipping through each Chinatown. */
export function route(t: number): { c: Vec3; f: Vec3 } {
  const c = routeAt(t);
  const n = routeAt(t + 0.05);
  return { c, f: norm([n[0] - c[0], n[1] - c[1], n[2] - c[2]]) };
}

/** The ceiling now: over every tower, or the stratosphere while the super boost lasts. */
const ceiling = () => (fly.high ? STRATOSPHERE : SKY);

/**
 * Forward at the ship's pace (and up or down at the super boost's); a wall in the way, slide along
 * it, keeping whichever way is free. The floor is the street, or a canal's bed under it.
 */
function move(dt: number) {
  const was = fly.pos;
  const f = headingOf(fly.yaw, fly.pitch);
  const next: Vec3 = add(was, f, fly.speed * dt);
  next[1] += fly.vy * dt;
  next[1] = Math.max(floorAt(next[0], next[2]) + 2, Math.min(ceiling(), next[1]));
  const tries: Vec3[] = [
    next,
    [next[0], next[1], was[2]],
    [was[0], next[1], next[2]],
    [was[0], next[1], was[2]],
    // On a roof: on along it at the same height.
    [next[0], was[1], next[2]],
    [next[0], was[1], was[2]],
    [was[0], was[1], next[2]],
  ];
  fly.pos = tries.find((q) => !blocked(q)) ?? was;
}

/** At a crossing, which way the autopilot goes: back toward the avenue, then on down it. */
function nextWay(way: number, line: number, at: number): number {
  if (way === 0 || way === 2) {
    if (Math.abs(line) < 1) return way === 0 ? 0 : 1;
    return line > 0 ? 3 : 1;
  }
  if (Math.abs(at) < 1) return 0;
  // Going away from the avenue: turn down the next street, and back toward it at the crossing after.
  return at > 0 === (way === 1) ? 0 : way;
}

/** Letting go: the autopilot takes the way along the grid nearest your heading, on the nearest street. */
function startCarryingOn() {
  fly.mode = 'drift';
  fly.way = wrap(Math.round(-fly.yaw / (Math.PI / 2)), 4);
  const alongZ = fly.way % 2 === 0;
  fly.line = alongZ
    ? Math.round(fly.pos[0] / BLOCK_X) * BLOCK_X
    : Math.round(fly.pos[2] / BLOCK_Z) * BLOCK_Z;
  fly.crossed = Number.NaN;
}

/** The autopilot carrying on: down the middle of its street, choosing at each crossing, easing round. */
function carryOn(dt: number, t: number) {
  const p = fly.pos;
  let [dx, dz] = WAYS[fly.way] as [number, number];
  let alongZ = dx === 0;
  const pitchOf = alongZ ? BLOCK_Z : BLOCK_X;
  const coord = alongZ ? p[2] : p[0];
  const sgn = alongZ ? dz : dx;
  const next = (sgn > 0 ? Math.ceil(coord / pitchOf) : Math.floor(coord / pitchOf)) * pitchOf;
  const mark = next + (alongZ ? 0 : 1e7);
  if (Math.abs(next - coord) < 8 && mark !== fly.crossed) {
    fly.crossed = mark;
    const way = nextWay(fly.way, fly.line, next);
    if (way !== fly.way) {
      fly.way = way;
      fly.line = next;
      [dx, dz] = WAYS[way] as [number, number];
      alongZ = dx === 0;
    }
  }
  // Aim ten ahead along the street, pulled toward its middle.
  const off = alongZ ? fly.line - p[0] : fly.line - p[2];
  const aim: [number, number] = alongZ ? [off, dz * 10] : [dx * 10, off];
  const miss = turnTo(Math.atan2(-aim[0], -aim[1]) - fly.yaw);
  const rate = Math.max(-1.1, Math.min(1.1, miss * 2.5));
  fly.yaw = turnTo(fly.yaw + rate * dt);
  fly.bank += (rate * 0.45 - fly.bank) * (1 - Math.exp(-4 * dt));
  const onAvenue = alongZ && Math.abs(fly.line) < 1;
  const wantY = onAvenue ? cruiseY(p[2], t) : CRUISE_Y;
  const wantPitch = Math.max(-0.5, Math.min(0.5, Math.atan2(wantY - p[1], 14)));
  fly.pitch += (wantPitch - fly.pitch) * (1 - Math.exp(-2.5 * dt));
  // From high up, it comes back down at the super boost's pace, then flies as before.
  const wantVy = p[1] > SKY - 10 ? -SUPER_CLIMB : 0;
  fly.vy += (wantVy - fly.vy) * (1 - Math.exp(-2 * dt));
  if (p[1] < SKY - 5) fly.high = false;
  const pace = Math.abs(miss) > 0.25 ? 0.6 : 1;
  fly.speed += (FLY_SPEED * pace - fly.speed) * (1 - Math.exp(-1.5 * dt));
  move(dt);
}

/** Starts the route afresh: no super boost, no slow mode, no race. */
function afresh() {
  fly.mode = 'route';
  fly.high = false;
  fly.vy = 0;
  fly.slow = false;
  fly.look = 0;
  resetRace();
}

/**
 * The controls, each frame: whether you are flying, the keys held, and how far the piece's time
 * moved. Keys only, never the mouse, as in the Shark Sim. A jump in time (a piece picked again,
 * the Journey) starts the route afresh.
 */
export function setFly(active: boolean, keys: string[], dt: number, t: number) {
  const jumped = Math.abs(t - fly.t - dt) > 0.5;
  fly.t = t;
  fly.v++;
  if (jumped) afresh();
  const pressed = (k: string) => keys.includes(k) && !fly.held.includes(k);
  const enter = pressed('enter');
  const lookKey = pressed('l');
  fly.held = [...keys];
  fly.look += ((fly.slow && fly.mode === 'pilot' ? 1 : 0) - fly.look) * (1 - Math.exp(-2 * dt));
  if (!active) {
    fly.boost = Math.min(1, fly.boost + dt / BOOST_REFILL);
    raceStep({ active: false, pos: fly.pos, enter: false, t });
    if (fly.mode === 'pilot') startCarryingOn();
    if (fly.mode === 'drift') carryOn(dt, t);
    after(dt, t);
    return;
  }
  if (fly.mode === 'route') {
    // Taking over from the autopilot where it is.
    const a = route(t);
    fly.pos = a.c;
    fly.yaw = Math.atan2(-a.f[0], -a.f[2]);
    fly.pitch = Math.asin(Math.max(-1, Math.min(1, a.f[1])));
    fly.speed = FLY_SPEED;
    fly.bank = 0;
  }
  fly.mode = 'pilot';
  if (lookKey) fly.slow = !fly.slow;
  const held = (...names: string[]) => names.some((n) => keys.includes(n));
  const turn = (held('a', 'arrowleft') ? -1.2 : 0) + (held('d', 'arrowright') ? 1.2 : 0);
  fly.yaw = turnTo(fly.yaw - turn * dt);
  fly.bank += (-turn * 0.45 - fly.bank) * (1 - Math.exp(-4 * dt));
  const up = held('w', 'arrowup');
  const down = held('s', 'arrowdown');
  let tilt = (up ? 0.55 : 0) - (down ? 0.55 : 0);
  if (fly.pos[1] <= floorAt(fly.pos[0], fly.pos[2]) + 2.5 && tilt < 0) tilt = 0;
  if (fly.pos[1] >= ceiling() && tilt > 0) tilt = 0;
  // Slow mode levels out unless you climb or dive.
  fly.pitch += (tilt - fly.pitch) * (1 - Math.exp(-2.5 * dt));
  const boosting = held(' ') && fly.boost > 0;
  // High over the towers the bar does not drain: the open sky is free.
  if (boosting && fly.pos[1] < SKY) fly.boost = Math.max(0, fly.boost - dt / BOOST_SECONDS);
  else if (!held(' ')) fly.boost = Math.min(1, fly.boost + dt / BOOST_REFILL);
  // The super boost: boost and climb together, and you go on up into the stratosphere; up there,
  // W climbs on and S dives back down, fast; below the towers' sky you fly as before.
  if (boosting && up) fly.high = true;
  if (fly.high) {
    const want = up ? SUPER_CLIMB : down ? -SUPER_CLIMB : 0;
    fly.vy += (want - fly.vy) * (1 - Math.exp(-1.8 * dt));
    // Once begun, the climb goes on while W is held; it ends back down under the towers' sky.
    if (fly.pos[1] < SKY - 5 && !up) fly.high = false;
  } else fly.vy += (0 - fly.vy) * (1 - Math.exp(-3 * dt));
  // The race: a prompt at its start, held still for the 3, 2, 1, a bar slowing you a moment.
  const r = raceStep({ active: true, pos: fly.pos, enter, t });
  if (r.hold) {
    fly.pos = [...r.hold.c];
    fly.yaw = Math.atan2(-r.hold.f[0], -r.hold.f[2]);
    fly.pitch = 0;
    fly.speed = 0;
    fly.vy = 0;
    after(dt, t);
    return;
  }
  const pace =
    (boosting ? BOOST_PACE : held('e', 'shift') ? 1.8 : held('q', 'x') ? 0.4 : 1) *
    (fly.slow ? SLOW_PACE : 1) *
    r.pace;
  fly.speed += (FLY_SPEED * pace - fly.speed) * (1 - Math.exp((boosting ? -4 : -1.5) * dt));
  const was: Vec3 = [...fly.pos];
  move(dt);
  // A portal carries you on to another district.
  const jump = portalJump(was, fly.pos);
  if (jump !== 0) fly.pos = [fly.pos[0], fly.pos[1], fly.pos[2] + jump];
  after(dt, t);
}

/** After every move: the tunnels' pulses run on, lanterns you touch light, the district's name. */
function after(dt: number, t: number) {
  const { c, f } = flier(t);
  advancePulses(dt, fly.mode === 'route' ? FLY_SPEED : fly.speed, f);
  touchLanterns(c, t);
  const d = districtAt(c[0], c[2]);
  if (d !== fly.district) {
    fly.district = d;
    fly.entered = t;
  }
}

/** You: where you are at time t and which way you fly. */
export function flier(t: number): { c: Vec3; f: Vec3 } {
  return fly.mode === 'route' ? route(t) : { c: fly.pos, f: headingOf(fly.yaw, fly.pitch) };
}

/** How far up into the stratosphere you are, 0 (at the towers' sky) to 1. */
const highness = (y: number) => smooth((y - SKY + 20) / (STRATOSPHERE - SKY));

/** The cockpit's dials: your height over the street and your speed. */
export type Gauge = { label: string; value: number; min?: number; max: number; unit?: string };
export function gauges(): Gauge[] {
  const { c } = flier(fly.t);
  return [
    {
      label: 'Height',
      value: Math.round(c[1] - GROUND),
      min: -CANAL_FLOOR,
      max: (fly.high || c[1] > SKY ? STRATOSPHERE : SKY) - GROUND,
      unit: 'm',
    },
    {
      label: 'Speed',
      value: Math.round(fly.mode === 'route' ? FLY_SPEED : fly.speed),
      max: FLY_SPEED * BOOST_PACE,
      unit: 'm/s',
    },
  ];
}
const CANAL_FLOOR = 14;

/**
 * The quiet words beside the bar: the race's (a prompt, 3 2 1, gate and time, place and best),
 * or the name of a district for a few seconds as you come into it; nothing otherwise.
 */
export function tally(): string {
  const r = raceBanner(fly.t);
  if (r) return r;
  if (fly.district && fly.t - fly.entered < 4 && fly.entered > Number.NEGATIVE_INFINITY)
    return DISTRICTS[fly.district].name;
  return fly.slow ? 'Slow · looking down' : '';
}

/**
 * Behind your ship and a little above, looking past it the way you fly. In slow mode the eye rises
 * and tilts down at the city below; high up it stands far back and looks down on the whole plan.
 */
function shipEye(c: Vec3, f: Vec3): Eye {
  const hi = highness(c[1]);
  const lk = fly.look;
  const fl = Math.hypot(f[0], f[2]) || 1;
  const fh: Vec3 = [f[0] / fl, 0, f[2] / fl];
  const back = lerp(10, 7, lk) + 150 * hi;
  const rise = 3.2 + 7 * lk + 190 * hi;
  const eye = add(add(c, lerp3(f, fh, Math.max(lk, hi)), -back), [0, 1, 0], rise);
  eye[1] = Math.max(GROUND + 1, eye[1]);
  const near = add(c, f, 6);
  const down = add(add(c, fh, 8 + 4 * lk), [0, 1, 0], -14);
  const plan: Vec3 = [c[0] + fh[0] * 160, GROUND, c[2] + fh[2] * 160];
  const target = lerp3(lerp3(near, down, lk), plan, hi);
  return { eye, target };
}

/* ---------- what the eye can see: towers in the way ---------- */

/** Whether the line from the eye to a point runs through tower tw (one the eye is inside never hides). */
function crosses(tw: Tower, e: Vec3, dx: number, dy: number, dz: number): boolean {
  const s = 0.06;
  const x0 = tw.x - tw.hx + s;
  const x1 = tw.x + tw.hx - s;
  const z0 = tw.z - tw.hz + s;
  const z1 = tw.z + tw.hz - s;
  const y1 = GROUND + tw.h - s;
  if (e[0] > x0 && e[0] < x1 && e[2] > z0 && e[2] < z1 && e[1] < y1) return false;
  let lo = 0;
  let hi = 1;
  const slab = (o: number, d: number, a: number, b: number) => {
    if (Math.abs(d) < 1e-9) {
      if (o <= a || o >= b) hi = -1;
      return;
    }
    let u = (a - o) / d;
    let w = (b - o) / d;
    if (u > w) [u, w] = [w, u];
    lo = Math.max(lo, u);
    hi = Math.min(hi, w);
  };
  slab(e[0], dx, x0, x1);
  if (lo >= hi) return false;
  slab(e[2], dz, z0, z1);
  if (lo >= hi) return false;
  slab(e[1], dy, GROUND - 1, y1);
  return lo < hi;
}

/** Whether a tower stands between the eye and a point: the blocks walked through along the line, one by one. */
function hidden(e: Vec3, x: number, y: number, z: number): boolean {
  const dx = x - e[0];
  const dy = y - e[1];
  const dz = z - e[2];
  let I = Math.floor(e[0] / BLOCK_X);
  let J = Math.floor(e[2] / BLOCK_Z);
  const si = dx > 0 ? 1 : -1;
  const sj = dz > 0 ? 1 : -1;
  const ax = Math.abs(dx);
  const az = Math.abs(dz);
  const stepX = ax > 1e-9 ? BLOCK_X / ax : Number.POSITIVE_INFINITY;
  const stepZ = az > 1e-9 ? BLOCK_Z / az : Number.POSITIVE_INFINITY;
  let nx = ax > 1e-9 ? (si > 0 ? (I + 1) * BLOCK_X - e[0] : e[0] - I * BLOCK_X) / ax : stepX;
  let nz = az > 1e-9 ? (sj > 0 ? (J + 1) * BLOCK_Z - e[2] : e[2] - J * BLOCK_Z) / az : stepZ;
  for (let n = 0; n < 40; n++) {
    if (crosses(blockTower(I, J), e, dx, dy, dz)) return true;
    if (nx > 1 && nz > 1) return false;
    if (nx < nz) {
      nx += stepX;
      I += si;
    } else {
      nz += stepZ;
      J += sj;
    }
  }
  return false;
}

/* ---------- the frame's plan: light sites, dealt out to the grains ---------- */

/**
 * Of every hundred grains: five for the sky (stars, constellations, satellites, stations), four
 * for you, six for the other ships, eleven of traffic, the rest the pool.
 */
const YOU_FROM = 5;
const SHIPS_FROM = 9;
const TRAFFIC_FROM = 15;
const POOL_FROM = 26;
const poolRank = (i: number) => Math.floor(i / 100) * (100 - POOL_FROM) + (i % 100) - POOL_FROM;
const poolSize = (n: number) =>
  Math.floor(n / 100) * (100 - POOL_FROM) + Math.max(0, (n % 100) - POOL_FROM);

type Plan = {
  t: number;
  v: number;
  c: Vec3;
  f: Vec3;
  eye: Vec3;
  fwd: Vec3;
  /** How many sites, and each one's place and colour. */
  n: number;
  pos: Float32Array;
  rgb: Float32Array;
  /** Each site's own number, and the pool grain it went to. */
  ids: Uint32Array;
  home: Int32Array;
  /** Pool grain r shows site slot[r], or waits unlit (-1). */
  slot: Int32Array;
  size: number;
  /** How many grains asked of this plan, so the next knows how many the player draws. */
  top: number;
};
const newPlan = (): Plan => ({
  t: Number.NaN,
  v: -1,
  c: [0, 0, 0],
  f: [0, 0, -1],
  eye: [0, 0, 0],
  fwd: [0, 0, -1],
  n: 0,
  pos: new Float32Array(0),
  rgb: new Float32Array(0),
  ids: new Uint32Array(0),
  home: new Int32Array(0),
  slot: new Int32Array(0),
  size: 0,
  top: 0,
});
/** Two plans kept, so asking about two moments in turn never makes either again. */
const plans: [Plan, Plan] = [newPlan(), newPlan()];
let grains = 9000;
/** How densely sites are kept: raised and lowered gently, frame to frame, to fill the pool. */
let lambda = 1;
let lastBuilt = Number.NaN;

/** A 32-bit mix of two numbers, for dealing sites to grains. */
function mix32(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  return h >>> 0;
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const strides = new Map<number, number>();
/** A step through n sites that visits each once, the first few already spread over them all. */
function strideFor(n: number): number {
  const had = strides.get(n);
  if (had) return had;
  let s = Math.max(1, Math.round(n * 0.618034));
  while (gcd(s, n) !== 1) s++;
  strides.set(n, s);
  return s;
}
/**
 * How densely sites are kept at a distance: all near, fewer further off, and few right by the eye,
 * where they would be drawn large and are faded anyway.
 */
const dens = (d: number) => {
  const r = Math.min(1, 22 / d);
  return r * Math.sqrt(r) * smooth((d - 3) / 7);
};

/* The site being placed and its colour, and what it belongs to. */
const o = [0, 0, 0, 0, 0, 0];
const cur = {
  plan: plans[0],
  t: 0,
  tw: CITY[0] as Tower,
  face: 0,
  w: 0,
  ct: false,
  cols: 0,
  rows: 0,
  per: 0,
  n: 0,
  nr: 0,
  bands: 0,
  lit: 0,
  warm: true,
  red: false,
  sign: GATE_SIGN,
  gateZ: 0,
  flip: 1,
  front: true,
  part: 'pillar' as GatePart,
  frame: false,
  rowZ: 0,
  gid: 0,
  /** A district's wall colour, or none. */
  tint: null as RGB | null,
  /** The game's own sites (lib/city-game.ts): where each is and its colour. */
  fn: ((_s: number, _o: number[]) => false) as Item['site'],
  /** Whether the group is near enough to you to wake as you pass. */
  wakes: false,
};
/** How far the eye sees now, as a share of VIEW: wider the higher you fly. */
let reach = 1;

/** What a group's sites are. */
const Kind = {
  Corner: 0,
  Rim: 1,
  Floor: 2,
  Window: 3,
  Fill: 4,
  Band: 5,
  Kerb: 6,
  Glyph: 7,
  Frame: 8,
  Lanterns: 9,
  Gate: 10,
  Custom: 11,
} as const;
type Kind = (typeof Kind)[keyof typeof Kind];

/** A point on the current face, `a` (-1..1) across it, at height y, `out` beyond the wall. */
function onFace(a: number, y: number, out = 0.04) {
  const { tw } = cur;
  o[1] = y;
  switch (cur.face) {
    case 0:
      o[0] = tw.x + a * tw.hx;
      o[2] = tw.z - tw.hz - out;
      return;
    case 1:
      o[0] = tw.x + tw.hx + out;
      o[2] = tw.z + a * tw.hz;
      return;
    case 2:
      o[0] = tw.x - a * tw.hx;
      o[2] = tw.z + tw.hz + out;
      return;
    default:
      o[0] = tw.x - tw.hx - out;
      o[2] = tw.z - a * tw.hz;
  }
}

/** Site s of the current group's kind: its place into o; false when there is nothing there (a dark window). */
function siteAt(kind: Kind, s: number): boolean {
  const { tw } = cur;
  switch (kind) {
    case Kind.Corner:
      onFace(s % 2 ? 1 : -1, GROUND + ((Math.floor(s / 2) + 0.5) * tw.h) / cur.n, 0);
      return true;
    case Kind.Rim:
      onFace(-1 + ((s + 0.5) * 2) / cur.n, GROUND + tw.h, 0);
      return true;
    case Kind.Floor: {
      const fl = Math.floor(s / cur.per);
      onFace(-1 + (((s % cur.per) + 0.5) * 2) / cur.per, GROUND + ((fl + 1) * tw.h) / (cur.n + 1));
      return true;
    }
    case Kind.Window: {
      const col = s % cur.cols;
      const row = Math.floor(s / cur.cols);
      const key = tw.k * 1009 + cur.face * 211 + col * 17 + row;
      cur.lit = windowLit(key, cur.t);
      if (cur.lit < 0.06 && !cur.wakes) return false;
      onFace(-1 + ((col + 0.5) * 2) / cur.cols, GROUND + ((row + 0.5) * tw.h) / cur.rows);
      if (cur.wakes) {
        // The city responds: dark windows near you wake as you pass.
        const c = cur.plan.c;
        const ex = (o[0] as number) - c[0];
        const ey = (o[1] as number) - c[1];
        const ez = (o[2] as number) - c[2];
        const near = Math.sqrt(ex * ex + ey * ey + ez * ez);
        if (near < 24) cur.lit = Math.max(cur.lit, 0.8 * smooth((24 - near) / 12));
      }
      if (cur.lit < 0.06) return false;
      cur.warm = hash(key, 19) < (cur.ct ? 0.92 : 0.7);
      cur.red = cur.ct && hash(key, 20) < 0.18;
      return true;
    }
    case Kind.Fill: {
      const m = mix32(cur.gid, s);
      const jx = ((m & 1023) / 1024 - 0.5) * 0.8;
      const jy = (((m >>> 10) & 1023) / 1024 - 0.5) * 0.8;
      const col = s % cur.n;
      const row = Math.floor(s / cur.n);
      onFace(
        -1 + ((col + 0.5 + jx) * 2) / cur.n,
        GROUND + ((row + 0.5 + jy) * tw.h) / cur.nr,
        0.02,
      );
      return true;
    }
    case Kind.Band: {
      const line = Math.floor(s / cur.per);
      const band = line >> 1;
      cur.lit = band;
      const y = GROUND + tw.h * (0.35 + (0.6 * (band + 0.5)) / cur.bands) + (line & 1) * 0.28;
      onFace(-1 + (((s % cur.per) + 0.5) * 2) / cur.per, y, 0.08);
      return true;
    }
    case Kind.Kerb: {
      const pave: Tower = { ...tw, hx: tw.hx + 1.5, hz: tw.hz + 1.5 };
      const q = ringAt(pave, (s + 0.5) / cur.n, GROUND + 0.02);
      [o[0], o[1], o[2]] = q;
      return true;
    }
    case Kind.Glyph: {
      if (!cur.front) return false;
      const sg = cur.sign;
      const px = signPixels(sg);
      o[0] = sg.at[0] + ((px[s * 2] as number) + 0.5) * sg.px;
      o[1] = sg.at[1] - ((px[s * 2 + 1] as number) + 0.5) * sg.px;
      o[2] = sg.at[2];
      return true;
    }
    case Kind.Frame: {
      const sg = cur.sign;
      const { w, h } = signSize(sg);
      const m = 2.2 * sg.px;
      const W = w + 2 * m;
      const H = h + 2 * m;
      const e = ((s + 0.5) / cur.n) * 2 * (W + H);
      let x: number;
      let y: number;
      if (e < W) [x, y] = [e, 0];
      else if (e < W + H) [x, y] = [W, e - W];
      else if (e < 2 * W + H) [x, y] = [2 * W + H - e, H];
      else [x, y] = [0, 2 * (W + H) - e];
      o[0] = sg.at[0] - m + x;
      o[1] = sg.at[1] + m - y;
      o[2] = sg.at[2];
      return true;
    }
    case Kind.Lanterns: {
      const across = LANTERNS_ACROSS * LANTERN_SITES;
      if (s >= across) {
        // The string: tied to the walls, sagging to the middle.
        const x = -AVENUE + ((s - across + 0.5) * 2 * AVENUE) / STRING_SITES;
        cur.part = 'beam';
        o[0] = x;
        o[1] = STRING_Y - 1.2 * (1 - (x / AVENUE) ** 2);
        o[2] = cur.rowZ;
        return true;
      }
      const j = Math.floor(s / LANTERN_SITES);
      const q = s % LANTERN_SITES;
      const key = Math.round(cur.rowZ) * 7 + j;
      const x = -AVENUE + ((j + 0.5) * 2 * AVENUE) / LANTERNS_ACROSS;
      const cy =
        STRING_Y - 1.2 * (1 - (x / AVENUE) ** 2) - 1.1 + 0.05 * Math.sin(cur.t * 0.7 + key);
      const cz = cur.rowZ + 0.15 * Math.sin(cur.t * 0.6 + key * 1.3);
      cur.lit = key;
      if (q < 54) {
        const d = fibonacciSphere(q, 54);
        cur.part = 'pillar';
        o[0] = x + d[0] * 0.8;
        o[1] = cy + d[1] * 0.95;
        o[2] = cz + d[2] * 0.8;
        return true;
      }
      cur.part = 'roof';
      if (q < 62) {
        const a = ((q - 54) / 8) * TAU;
        o[0] = x + Math.cos(a) * 0.36;
        o[1] = cy + 0.98;
        o[2] = cz + Math.sin(a) * 0.36;
        return true;
      }
      o[0] = x;
      o[1] = cy - 1 - (q - 62) * 0.18;
      o[2] = cz;
      return true;
    }
    case Kind.Custom:
      return cur.fn(s, o);
    default: {
      // The gate: the Chinatown piece's own, larger, turned to face the way you come.
      const g = gateShape(frac(0.5 + s * 0.7548776662), frac(0.5 + s * 0.569840291), s);
      if (g.part === 'plaque' && !cur.front) return false;
      cur.part = g.part;
      cur.frame = g.part === 'plaque' && signPoint(GATE_SIGN, { i: s }, 67).frame;
      o[0] = g.pos[0] * GATE_WIDE * cur.flip;
      o[1] = GROUND + (g.pos[1] - GROUND) * GATE_TALL;
      o[2] = cur.gateZ + (g.pos[2] - GATE_Z) * GATE_WIDE * cur.flip;
      return true;
    }
  }
}

/** The colour of the site just placed, into o[3..5]. */
function toneAt(kind: Kind) {
  const { tw, t } = cur;
  let c: RGB;
  switch (kind) {
    case Kind.Custom:
      return;
    case Kind.Corner:
    case Kind.Rim:
      c = cur.ct
        ? scale(mix(VIOLET, LANTERN_RED, 0.55), 0.34)
        : cur.tint
          ? scale(mix(VIOLET, cur.tint, 0.7), 0.38)
          : scale(mix(VIOLET, EDGE, 0.5), 0.36);
      break;
    case Kind.Floor:
      c = cur.ct ? scale(mix(VIOLET, LANTERN_RED, 0.4), 0.14) : scale(mix(VIOLET, EDGE, 0.5), 0.15);
      break;
    case Kind.Window:
      c = scale(cur.red ? LANTERN_RED : cur.warm ? WARM_WINDOW : COOL_WINDOW, 0.04 + 0.3 * cur.lit);
      break;
    case Kind.Fill:
      c = scale(mix(VIOLET, EDGE, 0.35), 0.1);
      break;
    case Kind.Band: {
      // A tower's bands in its own colour, every other one two steps on; Chinatown's red and gold.
      const breath = 0.8 + 0.2 * Math.sin(t * 0.35 + tw.k * 1.7);
      const band = cur.lit;
      c = cur.ct
        ? scale(band % 2 ? GOLD : LANTERN_RED, 0.4 * breath)
        : cur.tint
          ? scale(band % 2 ? GOLD : cur.tint, 0.4 * breath)
          : scale(neonAt(tw.k + (band % 2) * 2, t), 0.4 * breath);
      break;
    }
    case Kind.Kerb:
      c = scale(GROUND_LINE, 0.2);
      break;
    case Kind.Glyph:
      c = signColour(cur.sign, false, t);
      break;
    case Kind.Frame:
      c = signColour(cur.sign, true, t);
      break;
    case Kind.Lanterns: {
      const glow = 0.85 + 0.15 * Math.sin(t * 0.5 + cur.lit * 0.9);
      c =
        cur.part === 'pillar'
          ? scale(mix(LANTERN_RED, AMBER, 0.15), 0.42 * glow)
          : cur.part === 'roof'
            ? scale(GOLD, 0.45)
            : scale(GOLD, 0.12);
      break;
    }
    default:
      c =
        cur.part === 'plaque'
          ? signColour(GATE_SIGN, cur.frame, t)
          : cur.part === 'roof'
            ? scale(GOLD, 0.4)
            : scale(LANTERN_RED, cur.part === 'pillar' ? 0.34 : 0.42);
  }
  [o[3], o[4], o[5]] = c;
}

/**
 * One group of sites, `count` of them, kept `weight` times as densely as windows: the m-th in a
 * fixed, well-spread order shows while m / count is under how densely sites are kept where it
 * is, fading in over the last stretch, so sites come and go softly as you near and leave. A group
 * partly hidden (`seen` under 1) has each site checked against the towers in the way.
 */
function group(
  gid: number,
  count: number,
  weight: number,
  dNear: number,
  seen: number,
  kind: Kind,
) {
  const P = cur.plan;
  if (count <= 0 || P.n >= P.size) return;
  const lim = Math.min(
    count,
    Math.ceil(weight * lambda * dens(Math.max(dNear / reach, 10)) * count),
  );
  if (lim <= 0) return;
  cur.gid = gid;
  const tw0 = cur.tw;
  cur.wakes = dNear < 26;
  const mouthed = kind < Kind.Kerb && !!(tw0 as Block).bore;
  const stride = strideFor(count);
  const [ex, ey, ez] = P.eye;
  const [fx, fy, fz] = P.fwd;
  for (let m = 0; m < lim; m++) {
    const s = (m * stride) % count;
    if (!siteAt(kind, s)) continue;
    const dx = (o[0] as number) - ex;
    const dy = (o[1] as number) - ey;
    const dz = (o[2] as number) - ez;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const dd = d / reach;
    if (dd > VIEW || dx * fx + dy * fy + dz * fz < 0.5) continue;
    const b = smooth((weight * lambda * dens(dd) - (m + 0.5) / count) / 0.12);
    if (b <= 0) continue;
    // No window over a tunnel's mouth.
    if (mouthed && kind < Kind.Kerb && inMouth(tw0, o[0] as number, o[1] as number, o[2] as number))
      continue;
    if (seen < 1 && hidden(P.eye, o[0] as number, o[1] as number, o[2] as number)) continue;
    toneAt(kind);
    // The city responds: what is near you glows a little brighter.
    let wake = 1;
    if (cur.wakes) {
      const c = P.c;
      const wx = (o[0] as number) - c[0];
      const wy = (o[1] as number) - c[1];
      const wz = (o[2] as number) - c[2];
      wake += 0.5 * smooth((20 - Math.sqrt(wx * wx + wy * wy + wz * wz)) / 14);
    }
    // Near grains, drawn large, fade away; far light sinks into the violet night.
    const k = wake * b * smooth((d - 4) / 10) * smooth((VIEW - dd) / 100);
    const lean = 0.65 * (1 - smooth((VIEW - dd) / 100));
    const lum = Math.max(o[3] as number, o[4] as number, o[5] as number) * 0.8;
    put(
      mix32(gid, s),
      lerp(o[3] as number, VIOLET[0] * lum, lean) * k,
      lerp(o[4] as number, VIOLET[1] * lum, lean) * k,
      lerp(o[5] as number, VIOLET[2] * lum, lean) * k,
    );
    if (P.n >= P.size) return;
  }
}

/** A site into the plan: its place (in o), its colour and its own number. */
function put(id: number, r: number, g: number, b: number) {
  const P = cur.plan;
  const n = P.n;
  P.ids[n] = id;
  P.pos[n * 3] = o[0] as number;
  P.pos[n * 3 + 1] = o[1] as number;
  P.pos[n * 3 + 2] = o[2] as number;
  P.rgb[n * 3] = r;
  P.rgb[n * 3 + 1] = g;
  P.rgb[n * 3 + 2] = b;
  P.n++;
}

/**
 * Deal the sites to the pool's grains: a site seen last frame keeps the grain it had, so grains
 * stay put as the picture moves (and pour smoothly into the next piece); a new one takes a free
 * grain at or after its own number.
 */
function deal(P: Plan, prev: Plan) {
  P.slot.fill(-1);
  const had = new Map<number, number>();
  for (let s = 0; s < prev.n; s++) had.set(prev.ids[s] as number, prev.home[s] as number);
  for (let s = 0; s < P.n; s++) {
    const h = had.get(P.ids[s] as number);
    if (h !== undefined && h < P.size && P.slot[h] === -1) {
      P.slot[h] = s;
      P.home[s] = h;
    } else P.home[s] = -1;
  }
  for (let s = 0; s < P.n; s++) {
    if (P.home[s] !== -1) continue;
    let j = (P.ids[s] as number) % P.size;
    while (P.slot[j] !== -1) j = j + 1 === P.size ? 0 : j + 1;
    P.slot[j] = s;
    P.home[s] = j;
  }
}

/** How much of a face the eye sees, 0..1, from a few points on it. */
function faceSeen(tw: Tower, face: number, eye: Vec3): number {
  let seen = 0;
  for (const a of [-0.8, 0, 0.8]) {
    for (const y of [0.08, 0.4, 0.7, 0.97]) {
      const q = facePoint(tw, face, a, GROUND + y * tw.h, 0.05);
      if (!hidden(eye, q[0], q[1], q[2])) seen++;
    }
  }
  return seen / 12;
}
/** How much of something the eye sees, 0..1, from a few of its points. */
function pointsSeen(eye: Vec3, pts: Vec3[]): number {
  return pts.filter((q) => !hidden(eye, q[0], q[1], q[2])).length / pts.length;
}
/** The nearest a box comes to a point. */
function boxDistance(e: Vec3, lo: Vec3, hi: Vec3): number {
  const c = (i: number) => Math.max(lo[i] as number, Math.min(hi[i] as number, e[i] as number));
  return Math.hypot(c(0) - e[0], c(1) - e[1], c(2) - e[2]);
}

/** Everything to draw this frame, nearest first: towers' faces and kerbs, and Chinatown. */
function gather(P: Plan): { d: number; run: () => void }[] {
  const items: { d: number; run: () => void }[] = [];
  const { eye, fwd } = P;
  const fl = Math.hypot(fwd[0], fwd[2]) || 1;
  const hx = fwd[0] / fl;
  const hz = fwd[2] / fl;
  const I0 = Math.floor((eye[0] - VIEW) / BLOCK_X);
  const I1 = Math.floor((eye[0] + VIEW) / BLOCK_X);
  const J0 = Math.floor((eye[2] - VIEW) / BLOCK_Z);
  const J1 = Math.floor((eye[2] + VIEW) / BLOCK_Z);
  for (let I = I0; I <= I1; I++) {
    for (let J = J0; J <= J1; J++) {
      const tw = blockTower(I, J);
      // Pyramids, parks, plazas and the Studio's buildings are drawn by the game (lib/city-game.ts).
      if (tw.shape !== 'box') continue;
      const rx = tw.x - eye[0];
      const rz = tw.z - eye[2];
      const rad = Math.hypot(tw.hx, tw.hz) + 2;
      const depth = rx * hx + rz * hz;
      const side = Math.abs(rx * hz - rz * hx);
      // In front of the eye, within sight, and inside the view's width.
      if (depth < -rad || Math.hypot(rx, rz) - rad > VIEW || side > depth * 1.05 + rad * 1.5 + 4)
        continue;
      const ct = tw.d === 'chinatown';
      const tint = wallTint(tw);
      const id = mix32(I * 73856093, J * 19349663);
      const lo: Vec3 = [tw.x - tw.hx - 1.5, GROUND, tw.z - tw.hz - 1.5];
      const hi: Vec3 = [tw.x + tw.hx + 1.5, GROUND, tw.z + tw.hz + 1.5];
      const dk = boxDistance(eye, lo, hi);
      items.push({
        d: dk,
        run: () => {
          cur.tw = tw;
          cur.n = Math.ceil((4 * (tw.hx + tw.hz + 3)) / 0.6);
          group(mix32(id, 99), cur.n, 1.4, dk, 0.5, Kind.Kerb);
        },
      });
      for (let face = 0; face < 4; face++) {
        const n: Vec3 = (
          [
            [0, 0, -1],
            [1, 0, 0],
            [0, 0, 1],
            [-1, 0, 0],
          ] as Vec3[]
        )[face] as Vec3;
        const fc = facePoint(tw, face, 0, eye[1]);
        // Only the faces turned toward the eye.
        if ((eye[0] - fc[0]) * n[0] + (eye[2] - fc[2]) * n[2] <= 0.05) continue;
        const w = face % 2 ? tw.hz : tw.hx;
        const a0 = facePoint(tw, face, -1, GROUND);
        const a1 = facePoint(tw, face, 1, GROUND + tw.h);
        const d = boxDistance(
          eye,
          [Math.min(a0[0], a1[0]), GROUND, Math.min(a0[2], a1[2])],
          [Math.max(a0[0], a1[0]), GROUND + tw.h, Math.max(a0[2], a1[2])],
        );
        if (d > VIEW) continue;
        items.push({
          d,
          run: () => {
            const seen = faceSeen(tw, face, eye);
            if (seen <= 0) return;
            const gid = mix32(id, face * 16);
            Object.assign(cur, { tw, face, w, ct, tint });
            cur.n = Math.ceil(tw.h / 0.4);
            group(gid + 1, 2 * cur.n, 2.4, d, seen, Kind.Corner);
            cur.n = Math.ceil((2 * w) / 0.4);
            group(gid + 2, cur.n, 2.4, d, seen, Kind.Rim);
            cur.bands = 2 + Math.floor(hash(tw.k, 31) * 3);
            cur.per = Math.ceil((2 * w) / 0.45);
            group(gid + 3, cur.bands * 2 * cur.per, 1.6, d, seen, Kind.Band);
            cur.cols = Math.max(2, Math.floor((2 * w) / 1.1));
            cur.rows = Math.max(2, Math.floor(tw.h / 1.6));
            group(gid + 4, cur.cols * cur.rows, 1.6, d, seen, Kind.Window);
            cur.n = Math.max(0, Math.round(tw.h / FLOOR_H) - 1);
            cur.per = Math.ceil((2 * w) / 0.5);
            group(gid + 5, cur.n * cur.per, 0.5, d, seen, Kind.Floor);
            cur.n = Math.ceil((2 * w) / 1.6);
            cur.nr = Math.ceil(tw.h / 1.6);
            group(gid + 6, cur.n * cur.nr, 0.6, d, seen, Kind.Fill);
          },
        });
      }
    }
  }
  // Chinatown: the stretches of the avenue within sight.
  const signs: Sign[] = [];
  const high = eye[1] > GROUND + 90;
  const span = CT_EVERY * BLOCK_Z;
  const len = CT_BLOCKS * BLOCK_Z;
  for (let n = Math.floor((eye[2] - VIEW - len) / span); n * span <= eye[2] + VIEW; n++) {
    const z0 = n * span;
    for (const [gz, flip] of [
      [z0 + len - 2, 1],
      [z0 + 2, -1],
    ] as const) {
      const d = boxDistance(eye, [-9, GROUND, gz - 1.2], [9, GROUND + 21, gz + 1.2]);
      if (d > VIEW || (gz - eye[2]) * hz + -eye[0] * hx < -12) continue;
      items.push({
        d,
        run: () => {
          const seen = pointsSeen(eye, [
            [-8, GROUND + 4, gz],
            [8, GROUND + 4, gz],
            [0, GROUND + 19, gz],
          ]);
          if (seen <= 0) return;
          Object.assign(cur, { gateZ: gz, flip, front: (eye[2] - gz) * flip > 0 });
          group(mix32(n, 501 + flip), GATE_SITES, 2.5, d, seen, Kind.Gate);
        },
      });
    }
    for (const dz of LANTERN_STRINGS) {
      const rz = z0 + dz;
      const d = boxDistance(eye, [-AVENUE, STRING_Y - 4, rz - 1], [AVENUE, STRING_Y, rz + 1]);
      if (d > VIEW || (rz - eye[2]) * hz < -12) continue;
      items.push({
        d,
        run: () => {
          const seen = pointsSeen(eye, [
            [-6, STRING_Y - 2, rz],
            [0, STRING_Y - 2, rz],
            [6, STRING_Y - 2, rz],
          ]);
          if (seen <= 0) return;
          cur.rowZ = rz;
          group(
            mix32(n, 600 + dz),
            LANTERNS_ACROSS * LANTERN_SITES + STRING_SITES,
            1.8,
            d,
            seen,
            Kind.Lanterns,
          );
        },
      });
    }
    signs.push(bannerFor(n));
    for (let J = n * CT_EVERY; J < n * CT_EVERY + CT_BLOCKS; J++) signs.push(...avenueSigns(J));
  }
  // Chinatown's signs at every height, on all its streets.
  if (!high) signs.push(...signsNear(eye));
  for (const sg of signs) {
    const { w, h } = signSize(sg);
    const lo: Vec3 = [sg.at[0], sg.at[1] - h, sg.at[2]];
    const hi: Vec3 = [sg.at[0] + w, sg.at[1], sg.at[2]];
    const d = boxDistance(eye, lo, hi);
    if (d > VIEW || (sg.at[2] - eye[2]) * hz < -12) continue;
    items.push({
      d,
      run: () => {
        const seen = pointsSeen(eye, [
          [lo[0], lo[1], lo[2]],
          [hi[0], hi[1], hi[2]],
          [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]],
        ]);
        if (seen <= 0) return;
        cur.sign = sg;
        // Read from in front; from behind, only its frame.
        cur.front = eye[2] > sg.at[2];
        const gid = mix32(sg.k * 131 + Math.round(sg.at[2]), Math.round(sg.at[0] * 10));
        group(gid, signPixelCount(sg), 4, d, seen, Kind.Glyph);
        cur.n = Math.ceil((2 * (w + h)) / (sg.px * 1.5));
        group(gid + 1, cur.n, 3, d, seen, Kind.Frame);
      },
    });
  }
  // The game's own: districts, landmarks, lanterns, tunnels, metro, word signs, races, the plan.
  const game: Item[] = [...gameItems(eye, fwd, cur.t), ...trackItems(eye, cur.t, NEAR)];
  for (const g of game) {
    items.push({
      d: g.d,
      run: () => {
        // Seen at any of its probes, all of it is drawn: no check of every site.
        if (g.probe && pointsSeen(eye, g.probe) <= 0) return;
        cur.fn = g.site;
        group(g.gid, g.count, g.weight, g.d, 1, Kind.Custom);
      },
    });
  }
  return items.sort((a, b) => a.d - b.d);
}

/** Make the plan for time t: where the eye is, then every site it can see, nearest first. */
function build(P: Plan, t: number) {
  const { c, f } = flier(t);
  const { eye, target } = shipEye(c, f);
  Object.assign(P, { t, v: fly.v, c, f, eye, fwd: norm(sub(target, eye)), n: 0, top: 0 });
  reach = viewAt(eye[1]) / VIEW;
  cur.plan = P;
  cur.t = t;
  for (const it of gather(P)) {
    it.run();
    if (P.n >= P.size) break;
  }
}
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/**
 * The plan for time t, made once a frame. How densely sites are kept is eased a little each frame
 * toward filling nine tenths of the pool; after a jump in time it is found again at once.
 */
function planFor(t: number): Plan {
  const hit = plans.find((P) => P.t === t && P.v === fly.v);
  if (hit) return hit;
  const [a, b] = plans;
  const prev = a.t === lastBuilt ? a : b;
  const P = prev === a ? b : a;
  // Learnt from the last plan, once it has been asked for a hundred grains or more.
  if (prev.top >= 100) grains = prev.top;
  const size = poolSize(grains);
  if (P.size !== size) {
    Object.assign(P, {
      size,
      pos: new Float32Array(size * 3),
      rgb: new Float32Array(size * 3),
      ids: new Uint32Array(size),
      home: new Int32Array(size),
      slot: new Int32Array(size),
    });
  }
  const aim = 0.9 * size;
  const dt = t - lastBuilt;
  build(P, t);
  const ease = (power: number) => {
    lambda *= Math.max(0.5, Math.min(2, (aim / Math.max(1, P.n)) ** power));
    lambda = Math.max(0.02, Math.min(12, lambda));
  };
  if (dt > 0 && dt <= 0.5) ease(Math.min(1, dt * 6));
  else if (dt !== 0) {
    for (let n = 0; n < 4; n++) {
      ease(0.85);
      build(P, t);
    }
  }
  deal(P, prev);
  lastBuilt = t;
  return P;
}

/* ---------- the traffic: streams in the streets round you ---------- */

const NS_HEIGHTS = [5, 11, 28, 35];
const EW_HEIGHTS = [16, 40];
const NS_STREETS = 5;
const EW_STREETS = 6;
/** The avenue's own lanes, two a side at each height, always there; then the streets round you. */
const AVE_LANES = NS_HEIGHTS.length * 4;
const NS_LANES = AVE_LANES + NS_STREETS * NS_HEIGHTS.length * 2;
const LANE_COUNT = NS_LANES + EW_STREETS * EW_HEIGHTS.length * 2;
const RUN = 200;
const DASH = 9;
/** The whole number ≡ slot (mod n) nearest x: a street slot brought round to the one nearest the eye. */
const nearestOf = (slot: number, n: number, x: number) => slot + n * Math.round((x - slot) / n);
const near = (a: number, c: number, period: number) =>
  c + wrap(a - c + period / 2, period) - period / 2;

/**
 * A grain of the traffic: ships stream along the streets at four heights (two across), coming on
 * the left and going on the right; the streets round you, brought round as you fly, fading where
 * they come round. None low on the avenue through Chinatown, under its lanterns.
 */
function trafficAt(p: Particle, P: Plan, t: number): Spot {
  const L = Math.floor(p.i / 100) * (POOL_FROM - TRAFFIC_FROM) + (p.i % 100) - TRAFFIC_FROM;
  const j = Math.floor(L / DASH);
  const b = (L % DASH) / (DASH - 1);
  const lane = j % LANE_COUNT;
  const cx = P.eye[0] + P.fwd[0] * 60;
  const cz = P.eye[2] + P.fwd[2] * 60;
  const speed = 7 + 4 * hash(lane, 451);
  const s0 = hash(j, 452) * RUN;
  let head: Vec3;
  let dir: Vec3;
  let k: number;
  let sgn: number;
  if (lane < NS_LANES) {
    const ave = lane < AVE_LANES;
    const n = ave ? lane : lane - AVE_LANES;
    sgn = ave ? (n & 1 ? 1 : -1) : n >= (NS_LANES - AVE_LANES) / 2 ? 1 : -1;
    const level = (ave ? n >> 1 : Math.floor(n / NS_STREETS)) % NS_HEIGHTS.length;
    const I = ave ? 0 : nearestOf(n % NS_STREETS, NS_STREETS, cx / BLOCK_X);
    const y = (NS_HEIGHTS[level] as number) + (ave && n >= 8 ? 1.2 : 0);
    const z = near(s0 + sgn * speed * t, cz, RUN);
    const off = I === 0 ? (ave && n >= 8 ? 6.3 : 3.4) : 2.2;
    head = [I * BLOCK_X - sgn * off, GROUND + y + (I & 1) * 0.6, z];
    dir = [0, 0, sgn];
    k = smooth((RUN / 2 - Math.abs(z - cz)) / 20);
    k *= smooth(((NS_STREETS / 2) * BLOCK_X - Math.abs(I * BLOCK_X - cx)) / 15);
    if (I === 0 && y < 16) k *= 1 - chinatownness(z, 12);
  } else {
    const e = lane - NS_LANES;
    sgn = e >= EW_STREETS * EW_HEIGHTS.length ? 1 : -1;
    const level = Math.floor(e / EW_STREETS) % EW_HEIGHTS.length;
    const J = nearestOf(e % EW_STREETS, EW_STREETS, cz / BLOCK_Z);
    const x = near(s0 + sgn * speed * t, cx, RUN);
    head = [x, GROUND + (EW_HEIGHTS[level] as number), J * BLOCK_Z + sgn * 2.2];
    dir = [sgn, 0, 0];
    k = smooth((RUN / 2 - Math.abs(x - cx)) / 20);
    k *= smooth(((EW_STREETS / 2) * BLOCK_Z - Math.abs(J * BLOCK_Z - cz)) / 15);
  }
  const pos = add(head, dir, -(b ** 1.6) * 2.8);
  const r = sub(pos, P.eye);
  const d = Math.hypot(r[0], r[1], r[2]);
  // Only ahead of the eye and within sight.
  if (r[0] * P.fwd[0] + r[1] * P.fwd[1] + r[2] * P.fwd[2] < 0.5) k = 0;
  k *= smooth((d - 4) / 10) * smooth((VIEW - d) / 100);
  if (k > 0 && hidden(P.eye, pos[0], pos[1], pos[2])) k = 0;
  const glow = b < 0.12 ? 1 : 0.55 * (1 - b) ** 2;
  return { pos, rgb: scale(sgn > 0 ? HEADLIGHT : TAILLIGHT, 0.55 * glow * k) };
}

function shipAt(p: Particle, t: number): Spot {
  const P = planFor(t);
  if (p.i + 1 > P.top) P.top = p.i + 1;
  const m = p.i % 100;
  if (m >= POOL_FROM) {
    const r = poolRank(p.i);
    const s = r < P.size ? (P.slot[r] as number) : -1;
    if (s >= 0) {
      return {
        pos: [P.pos[s * 3] as number, P.pos[s * 3 + 1] as number, P.pos[s * 3 + 2] as number],
        rgb: [P.rgb[s * 3] as number, P.rgb[s * 3 + 1] as number, P.rgb[s * 3 + 2] as number],
      };
    }
    // Waiting, unlit, for a site to show.
    return { pos: skyAt(p, [P.c[0], 0, P.c[2]]), rgb: [0, 0, 0] };
  }
  if (m >= TRAFFIC_FROM) return trafficAt(p, P, t);
  if (m >= SHIPS_FROM) return otherShipAt(p, P, t);
  if (m >= YOU_FROM) {
    const pace = fly.mode === 'route' ? 0.6 : Math.max(0, fly.speed / FLY_SPEED - 0.4);
    const { pos, part } = craftAt(P.c, P.f, 2.4, p, pace, fly.mode === 'route' ? 0 : fly.bank);
    return { pos, rgb: craftColour(part, p, 0.42) };
  }
  // The sky (lib/city-sky.ts), in a dome just beyond the city's reach, so nothing in it stands in
  // front of it: stars and constellations, satellites, the stations, the spire's beacon.
  const L = Math.floor(p.i / 100) * YOU_FROM + m;
  const n = Math.floor(grains / 100) * YOU_FROM + Math.min(YOU_FROM, grains % 100);
  return skyGrain(L, Math.max(n, L + 1), P.c, viewAt(P.eye[1]) + 40, highness(P.c[1]), t);
}

/**
 * The other ships (lib/city-game.ts): six cruising the avenue, the streets and the lane over the
 * roofs, and three more, the rivals while a race is on, a second convoy otherwise. Each ship has
 * its share of these grains; ahead of the eye and in sight only.
 */
const shipSeen = { t: Number.NaN, v: -1, list: [] as boolean[] };
function otherShipAt(p: Particle, P: Plan, t: number): Spot {
  const per = TRAFFIC_FROM - SHIPS_FROM;
  const L = Math.floor(p.i / 100) * per + (p.i % 100) - SHIPS_FROM;
  const n =
    Math.floor(grains / 100) * per + Math.max(0, Math.min(per, (grains % 100) - SHIPS_FROM));
  const each = Math.max(1, Math.floor(n / SHIP_SLOTS));
  const slot = Math.min(SHIP_SLOTS - 1, Math.floor(L / each));
  const q = (L - slot * each + 0.5) / each;
  const r = slot >= 6 ? rival(slot - 6, t) : null;
  const ship = r ? { c: r.c, f: r.f, design: 1, k: 1 } : cruiser(slot, t, P.eye, P.c);
  const g = shipGrain(r ? 1 : ship.design, q, p.i, ship.c, ship.f, t);
  const rel = sub(g.pos, P.eye);
  const d = Math.hypot(rel[0], rel[1], rel[2]);
  let k = ship.k * smooth((d - 4) / 10) * smooth((VIEW - d) / 100);
  if (rel[0] * P.fwd[0] + rel[1] * P.fwd[1] + rel[2] * P.fwd[2] < 0.5) k = 0;
  if (k > 0) {
    // Whether a ship is in sight, found once a frame per ship from its middle.
    if (shipSeen.t !== P.t || shipSeen.v !== P.v)
      Object.assign(shipSeen, { t: P.t, v: P.v, list: [] });
    let seen = shipSeen.list[slot];
    if (seen === undefined) {
      seen = !hidden(P.eye, ship.c[0], ship.c[1], ship.c[2]);
      shipSeen.list[slot] = seen;
    }
    if (!seen) k = 0;
  }
  return { pos: g.pos, rgb: scale(r ? mix(g.rgb, LANTERN_RED, 0.5) : g.rgb, k) };
}

/*
 * The pieces' pills: eleven plans, eight Nova Cores, the temples, factories and domes each from
 * the single building up to the quarter (lib/golden-quarters.ts), five cities from above.
 */

let templeKind = 0;
let factoryKind = 0;
let domeKind = 0;
const VARIANTS: Record<string, { names: string[]; label: string; set: (i: number) => void }> = {
  'golden-plan': { names: PLANS, label: 'Plan', set: setPlanKind },
  nova: { names: NOVA_CORES, label: 'Nova Core', set: setNovaKind },
  temples: { names: TEMPLES.names, label: TEMPLES.label, set: (i) => (templeKind = i) },
  factories: { names: FACTORIES.names, label: FACTORIES.label, set: (i) => (factoryKind = i) },
  domes: { names: DOMES.names, label: DOMES.label, set: (i) => (domeKind = i) },
  above: { names: CITIES.map((c) => c.name), label: 'City', set: setCityKind },
};

/*
 * Colour presets per piece (the Design menu's Palette pill): the golden pieces in gold, rose
 * gold, white marble and gold, or night neon gold; the factories in gold, rust, steel or night
 * neon gold. Pieces with none have no Palette pill.
 */
const PALETTE_SETS: Record<string, string[]> = {
  'golden-plan': GOLDEN_PALETTES,
  rising: GOLDEN_PALETTES,
  heart: GOLDEN_PALETTES,
  nova: GOLDEN_PALETTES,
  temples: GOLDEN_PALETTES,
  factories: FACTORY_PALETTES,
  domes: GOLDEN_PALETTES,
};
const palettesOf = (k: number) => PALETTE_SETS[PHASES[k]?.id ?? ''];
export const hasPalettes = (k: number) => palettesOf(k) !== undefined;
export const paletteNames = (k: number) => palettesOf(k) ?? [];
/** Preset i on piece k; with no piece (the Journey) or an unknown one, gold. */
export function setPalette(i: number, k?: number) {
  const names = k === undefined ? undefined : palettesOf(k);
  setGoldenPalette(names?.[i] ?? 'Gold');
}
const variantsOf = (k: number) => VARIANTS[PHASES[k]?.id ?? ''];
export const hasVariants = (k: number) => variantsOf(k) !== undefined;
export const variantNames = (k: number) => variantsOf(k)?.names ?? [];
export const variantLabel = (k: number) => variantsOf(k)?.label ?? '';
/** Pill i on piece k; with no piece (the Journey), the first of each. */
export function setVariant(i: number, k?: number) {
  if (k === undefined) {
    for (const v of Object.values(VARIANTS)) v.set(0);
    return;
  }
  const v = variantsOf(k);
  if (v) v.set(v.names[i] ? i : 0);
}

/* ---------- where every grain is ---------- */

/** Where particle p is in piece k's own form, and its colour, `u` through it, at chapter time t. */
export function formAt(k: number, p: Particle, u: number, t: number): Spot {
  switch (PHASES[k]?.id) {
    case 'golden-plan':
      return goldenPlanAt(p, Math.max(u, 0), t);
    case 'rising':
      return risingAt(p, Math.max(u, 0), t);
    case 'heart':
      return heartAt(p, t);
    case 'nova':
      return novaAt(p, t);
    case 'temples':
      return buildingAt(TEMPLES, templeKind, p, t);
    case 'factories':
      return buildingAt(FACTORIES, factoryKind, p, t);
    case 'domes':
      return buildingAt(DOMES, domeKind, p, t);
    case 'above':
      return aboveAt(p, u, t);
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
    case 'golden-plan':
      return goldenPlanEye(u, t);
    case 'rising':
      return risingEye(u, t);
    case 'heart':
      return heartEye(t);
    case 'nova':
      return novaEye(t);
    case 'temples':
      return buildingEye(t, TEMPLES.reach[templeKind]);
    case 'factories':
      return buildingEye(t, FACTORIES.reach[factoryKind]);
    case 'domes':
      return buildingEye(t, DOMES.reach[domeKind]);
    case 'above':
      return aboveEye(t);
    case 'towers':
      // Slowly round the city, above its roofs, looking at its heart.
      return towersEye(u);
    case 'lanes':
      return lanesEye(t);
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
      const { c, f } = flier(t);
      return shipEye(c, f);
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
 * of the street per loop, so the wrap does not show. Nor does the ship: it
 * flies on down the avenue, wherever its loop falls.
 */
const fliesOn = (k: number) => PHASES[k]?.id === 'canyon' || PHASES[k]?.id === 'ship';
const isAbove = (k: number) => PHASES[k]?.id === 'above';
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
  // From above, on its own, is lit from the start (its lights came on by 0.3 through it, as in
  // Vegetal) and stands still, so its loop needs no glide back.
  if (isAbove(k)) return aboveAt(p, 0.3 + 0.7 * f, t);
  const a = formAt(k, p, u, t);
  if (fliesOn(k)) return a;
  const w = smooth((f - 0.8 + 0.12 * p.stagger) / 0.2);
  if (w <= 0) return a;
  const b = formAt(k, p, 0, t);
  return { pos: lerp3(a.pos, b.pos, w), rgb: mix(a.rgb, b.rgb, w) };
}

/** The camera in piece k on its own, easing back to where the piece began in the last quarter. */
export function pieceCamera(k: number, s: number): Eye {
  const { f, u, t } = pieceClock(k, s);
  const a = eyeIn(k, u, t);
  const w = fliesOn(k) ? 0 : smooth((f - 0.75) / 0.25);
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
