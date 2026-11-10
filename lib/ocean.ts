/*
 * OCEAN — the sea's chapter (docs/specs/art-ocean.md).
 *
 * 2026-11-09: "after vegetal series prepare the Ocean series. with corals
 * growing like trees. swarms of fishes. swarms of small fishes. jellyfish
 * swarms. and entire ecosystem in 3d as the final one with corals fishes
 * etc... that we drive through like for the tree road."
 *
 * Five pieces played as one trip, built as Vegetal is (lib/vegetal.ts):
 * every grain of light keeps its identity, each piece is a formula from a
 * grain and the time to a place and a colour, each piece opens from a wide
 * ball of faint stars, and every grain pours on into the next piece.
 *
 * Pure: no three.js, no DOM.
 */

import {
  fibonacciSphere,
  flow,
  GOLDEN_ANGLE,
  hash,
  makeParticles,
  type Particle,
  type Phase,
  type RGB,
  smooth,
  type Vec3,
} from './bigbang';
import { seeded } from './star-tree';
import { along3, grow3, length3, type Route3, resample3 } from './vegetal';

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

/* ---------- the pieces, with their words ---------- */

export interface OceanPhase extends Phase {
  /** A short reflection, shown a line at a time over the picture. */
  words: string[];
}

export const PHASES: OceanPhase[] = [
  {
    id: 'coral',
    name: 'Coral garden',
    line: 'Corals grow up from the sand like trees, branching and fanning out. Their polyps open at the tips; light falls in shafts.',
    words: [
      'A coral is a colony of tiny animals, each one building its share of stone.',
      'Together they grow forests that whole seas depend on.',
    ],
    duration: 32,
    glow: 1,
    size: 0.85,
  },
  {
    id: 'shoal',
    name: 'Shoal',
    line: 'A shoal of fish turns as one: no leader, each fish keeping close to its neighbours.',
    words: [
      'Each fish watches only the few beside it,',
      'and from that the whole shoal moves like one body.',
    ],
    duration: 30,
    glow: 1,
    size: 0.85,
  },
  {
    id: 'sardines',
    name: 'Small fish',
    line: 'Thousands of small fish wheel in a ring, gather into a ball, and open into the ring again. Their sides flash silver as they turn.',
    words: [
      'Packed close, small fish are safer: a hunter cannot pick out one.',
      'The flash of a thousand turning sides is their shared defence.',
    ],
    duration: 30,
    glow: 0.95,
    size: 0.75,
  },
  {
    id: 'jellyfish',
    name: 'Jellyfish',
    line: 'Jellyfish rise slowly, each bell pulsing, tentacles trailing. They glow with their own light.',
    words: [
      'Jellyfish have swum the seas for more than five hundred million years,',
      'with no brain and no heart, only a net of nerves and a pulse.',
    ],
    duration: 30,
    glow: 1.05,
    size: 0.8,
  },
  {
    id: 'reef',
    name: 'Reef',
    line: 'Swimming down a channel through the reef: corals grow on both sides as we come, fish wheel ahead, jellyfish drift above.',
    words: [
      'A reef covers less than a hundredth of the sea floor,',
      'yet a quarter of all sea life lives on it.',
    ],
    duration: 44,
    glow: 1,
    size: 0.85,
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
    if (t < (PHASE_START[i] as number) + (PHASES[i] as OceanPhase).duration) {
      index = i;
      break;
    }
  }
  return {
    index,
    u: (t - (PHASE_START[index] as number)) / (PHASES[index] as OceanPhase).duration,
  };
}

/** One colour per piece, for the step bar. */
export const STEP_COLOURS = ['#ff7a6a', '#9fd8e8', '#d8e4f0', '#c69cff', '#5fd0c0'];

/* ---------- colours ---------- */

const SAND: RGB = [0.85, 0.72, 0.5];
const SNOW: RGB = [0.75, 0.9, 1];
const SHAFT: RGB = [0.6, 0.9, 1];
const SILVER: RGB = [0.82, 0.9, 1];
const BLUE_FISH: RGB = [0.35, 0.7, 1];
const GOLD_FISH: RGB = [1, 0.75, 0.35];
const BELL: RGB = [0.72, 0.55, 1];
const RIM: RGB = [0.75, 1, 0.95];
const TENTACLE: RGB = [1, 0.6, 0.85];
const STAR: RGB = [0.9, 0.86, 0.74];
/** One tone per coral colony: coral pink, orange, violet, gold, teal, rose, green. */
const CORAL_TONES: RGB[] = [
  [1, 0.45, 0.42],
  [1, 0.62, 0.3],
  [0.75, 0.5, 1],
  [1, 0.82, 0.42],
  [0.35, 0.9, 0.85],
  [1, 0.5, 0.75],
  [0.6, 0.95, 0.55],
];

/* ---------- shared: the sea itself ---------- */

const FLOOR = -14;
const SURFACE = 26;

/** Marine snow: specks drifting slowly up through a box round `c`. */
function snowAt(p: Particle, t: number, c: Vec3, w: number, h: number): Vec3 {
  return [
    c[0] + (hash(p.i, 81) - 0.5) * w + Math.sin(t * 0.13 + p.i) * 1.2,
    c[1] - h / 2 + wrap(hash(p.i, 82) * h + t * 0.4, h),
    c[2] + (hash(p.i, 83) - 0.5) * w + Math.cos(t * 0.11 + p.i) * 1.2,
  ];
}

/** Shafts of light slanting down from the surface, swaying. */
function shaftAt(p: Particle, t: number, c: Vec3): Vec3 {
  const k = Math.floor(hash(p.i, 84) * 7);
  const x = c[0] + (k - 3) * 9 + Math.sin(t * 0.07 + k) * 2;
  const s = hash(p.i, 85);
  return [
    x + s * 10 + (hash(p.i, 86) - 0.5) * 1.6,
    SURFACE - s * (SURFACE - FLOOR),
    c[2] - 12 + (k % 3) * 8,
  ];
}

/* ---------- 1. Coral garden: corals grown like trees ---------- */

export const COLONIES = 7;
type Colony = { at: Vec3; routes: Route3[]; flat: boolean; yaw: number };
let colonies: Colony[] | null = null;
/** Seven colonies on the sand: branching corals, and every third one a flat sea fan. */
export function corals(): Colony[] {
  if (colonies) return colonies;
  colonies = Array.from({ length: COLONIES }, (_, k) => {
    const out: number[][] = [];
    grow3(seeded(60 + k), [0, 0, 0], [0, 1, 0], 2.6 + 1.4 * hash(k, 61), 0.8, 5, k, [], out);
    const r = 20 * Math.sqrt((k + 0.5) / COLONIES);
    const a = k * GOLDEN_ANGLE;
    return {
      at: [Math.cos(a) * r, FLOOR, Math.sin(a) * r * 0.7],
      routes: out.map(resample3),
      flat: k % 3 === 1,
      yaw: hash(k, 62) * TAU,
    };
  });
  return colonies;
}

/** A point of colony c's coral, grown `g`: along a branch, or on a polyp at a tip. */
function coralLocal(c: Colony, p: Particle, g: number, t: number, polyp: boolean): Vec3 {
  const route = c.routes[Math.floor(hash(p.i, 63) * c.routes.length)] as Route3;
  const len = length3(route);
  let q: Vec3;
  if (polyp) {
    const [x, y, z] = along3(route, len * g);
    const open = 0.35 + 0.25 * Math.sin(t * 1.4 + p.i * 0.1);
    const d = fibonacciSphere(p.i % 61, 61);
    q = add([x, y, z], d, open * Math.cbrt(p.b) * smooth((g - 0.55) / 0.3));
  } else {
    // More grains toward the tips, where the branches are many.
    const [x, y, z, w] = along3(route, len * g * p.b ** 0.5);
    q = add([x, y, z], fibonacciSphere(p.i % 389, 389), w * 0.55 * Math.sqrt(p.d));
  }
  // A sea fan grows flat: one plane of fine branches.
  if (c.flat) q = [q[0] * 1.3, q[1] * 1.15, q[2] * 0.12];
  const cs = Math.cos(c.yaw);
  const sn = Math.sin(c.yaw);
  return [q[0] * cs - q[2] * sn, q[1], q[0] * sn + q[2] * cs];
}

type CoralRole = 'floor' | 'snow' | 'shaft' | 'polyp' | 'coral';
const coralRole = (p: Particle): CoralRole =>
  p.c < 0.1 ? 'floor' : p.c < 0.16 ? 'snow' : p.c < 0.21 ? 'shaft' : p.c < 0.34 ? 'polyp' : 'coral';

function coralPoint(p: Particle, u: number, t: number): Vec3 {
  switch (coralRole(p)) {
    case 'floor': {
      const a = p.d * TAU;
      const r = 34 * Math.sqrt(p.b);
      return [Math.cos(a) * r, FLOOR + Math.sin(r * 0.6 + a * 3) * 0.3, Math.sin(a) * r];
    }
    case 'snow':
      return snowAt(p, t, [0, 2, 0], 60, 36);
    case 'shaft':
      return shaftAt(p, t, [0, 0, 0]);
    default: {
      const c = corals()[Math.floor(p.a * COLONIES)] as Colony;
      const g = 0.04 + 0.96 * smooth((u - 0.04 * (p.a * COLONIES)) / 0.45);
      return add(c.at, coralLocal(c, p, g, t, coralRole(p) === 'polyp'));
    }
  }
}

/* ---------- fish, of any size ---------- */

/** Grain p on a fish at c heading f, `len` long; `j` sets its own beat. */
function fishAt(c: Vec3, f: Vec3, len: number, p: Particle, t: number, j: number): Vec3 {
  const side = norm(cross(f, [0, 1, 0]));
  const up = cross(side, f);
  // Head at s = 0, tail at s = 1; the last grains fan out as the tail fin.
  const s = p.b;
  const body = 0.2 * len * Math.sin(Math.PI * Math.min(1, s ** 0.7 * 1.05));
  const fin = s > 0.82 ? ((s - 0.82) / 0.18) * 0.22 * len : 0;
  const wag = 0.12 * len * Math.sin(9 * t + j * 1.3 - 6 * s) * s * s;
  const a = p.d * TAU;
  const back = len * (0.5 - s);
  const lat = Math.cos(a) * body + wag;
  const ver = Math.sin(a) * (body * 0.75 + fin);
  return [
    c[0] + f[0] * back + side[0] * lat + up[0] * ver,
    c[1] + f[1] * back + side[1] * lat + up[1] * ver,
    c[2] + f[2] * back + side[2] * lat + up[2] * ver,
  ];
}

/* ---------- 2. Shoal: a school that turns as one ---------- */

export const SHOAL = 36;
/** Where the shoal is at time t: a slow loop through the water. */
export function shoalCentre(t: number): Vec3 {
  return [22 * Math.cos(0.12 * t), 5 * Math.sin(0.21 * t), 14 * Math.sin(0.24 * t)];
}
const heading = (path: (t: number) => Vec3, t: number) => {
  const a = path(t);
  const b = path(t + 0.05);
  return norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
};

/** Fish j of the shoal: where it swims and which way it points. */
export function shoalFish(j: number, u: number, t: number): { c: Vec3; f: Vec3 } {
  // Each fish follows the shoal's path a moment behind its neighbours ahead, so turns run through it.
  const lag = hash(j, 71) * 3;
  const centre = shoalCentre(t - lag);
  const f = heading(shoalCentre, t - lag);
  const side = norm(cross(f, [0, 1, 0]));
  const up = cross(side, f);
  // A loose lens round the path, breathing a little; tighter as the piece goes on.
  const spread = 9 * (1 - 0.25 * smooth((u - 0.4) / 0.3)) * (1 + 0.12 * Math.sin(t * 0.5));
  const ox = (hash(j, 72) - 0.5) * 2 * spread + Math.sin(t * 0.7 + j) * 0.3;
  const oy = (hash(j, 73) - 0.5) * spread * 1.2;
  return { c: add(add(centre, side, ox), up, oy), f };
}

type ShoalRole = 'snow' | 'fish';
const shoalRole = (p: Particle): ShoalRole => (p.c < 0.1 ? 'snow' : 'fish');

function shoalPoint(p: Particle, u: number, t: number): Vec3 {
  if (shoalRole(p) === 'snow') return snowAt(p, t, [0, 0, 0], 70, 40);
  const j = Math.floor(p.a * SHOAL);
  const { c, f } = shoalFish(j, u, t);
  return fishAt(c, f, 3 + 0.6 * hash(j, 74), p, t, j);
}

/* ---------- 3. Small fish: a ring that gathers into a ball ---------- */

export const SMALL_FISH = 900;
/** Small fish j's place: on a wheeling ring, or, mid-piece, orbiting in a tight ball. */
function smallPath(j: number, u: number, t: number): Vec3 {
  const th = hash(j, 91) * TAU + t * (0.32 + 0.08 * hash(j, 92));
  const ph = hash(j, 93) * TAU + t * 0.7;
  const R = 15;
  const r = 4 + 1.6 * Math.sin(th * 2 + t * 0.3);
  const ring: Vec3 = [
    (R + r * Math.cos(ph)) * Math.cos(th),
    r * Math.sin(ph) * 1.3 + 2 * Math.sin(th * 3 + t * 0.2),
    (R + r * Math.cos(ph)) * Math.sin(th),
  ];
  const ball = smooth((u - 0.35) / 0.15) * (1 - smooth((u - 0.72) / 0.15));
  if (ball <= 0) return ring;
  const tilt = hash(j, 94) * Math.PI;
  const rb = 6 + 3 * Math.cbrt(hash(j, 95));
  const an = (1 + 0.4 * hash(j, 96)) * t + hash(j, 97) * TAU;
  const orb: Vec3 = [
    Math.cos(an) * rb,
    Math.sin(an) * rb * Math.cos(tilt),
    Math.sin(an) * rb * Math.sin(tilt),
  ];
  return lerp3(ring, orb, ball);
}

/** Small fish j's place and heading. */
export function smallFish(j: number, u: number, t: number): { c: Vec3; f: Vec3 } {
  const c = smallPath(j, u, t);
  const n = smallPath(j, u, t + 0.03);
  return { c, f: norm([n[0] - c[0], n[1] - c[1], n[2] - c[2]]) };
}

function smallPoint(p: Particle, u: number, t: number): Vec3 {
  if (p.c < 0.08) return snowAt(p, t, [0, 0, 0], 60, 36);
  const { c, f } = smallFish(Math.floor(p.a * SMALL_FISH), u, t);
  // A tiny dash of a fish: its grains in a line along its heading.
  return add(c, f, (0.5 - p.b) * 0.9);
}

/* ---------- 4. Jellyfish: bells pulsing, tentacles trailing ---------- */

export const JELLIES = 13;
const JELLY_SPAN = 46;
/** How far a jellyfish's bell is drawn in, 0 (open) to 1 (pulled in): a quick pull, a slow release. */
export const pulseOf = (j: number, t: number) =>
  Math.max(0, Math.sin(t * 1.1 + hash(j, 101) * TAU)) ** 2;

type JellyPart = 'bell' | 'rim' | 'tentacle' | 'arm';
const jellyPart = (p: Particle): JellyPart =>
  p.d < 0.42 ? 'bell' : p.d < 0.52 ? 'rim' : p.d < 0.88 ? 'tentacle' : 'arm';

/** Grain p on a jellyfish whose bell top is at c, of size k, at pulse `pull`. */
function jellyAt(c: Vec3, k: number, pull: number, p: Particle, t: number, j: number): Vec3 {
  const R = 2.4 * k * (1 - 0.2 * pull);
  const H = 1.7 * k * (1 + 0.18 * pull);
  const part = jellyPart(p);
  const a = p.b * TAU;
  if (part === 'bell' || part === 'rim') {
    const v = part === 'rim' ? 1 : Math.sqrt(frac(p.b * 7.3));
    const ang = part === 'rim' ? a : frac(p.b * 13.7) * TAU;
    const ring = R * Math.sin((v * Math.PI) / 2) * (part === 'rim' ? 1.04 : 1);
    return [
      c[0] + Math.cos(ang) * ring,
      c[1] - H * (1 - Math.cos((v * Math.PI) / 2)),
      c[2] + Math.sin(ang) * ring,
    ];
  }
  if (part === 'tentacle') {
    // Ten tentacles from the rim, trailing and swaying, longer as they relax.
    const n = Math.floor(frac(p.b * 10) * 10);
    const s = frac(p.b * 97.1);
    const ang = (n / 10) * TAU;
    const L = 7 * k * (1 - 0.15 * pull);
    const sway = Math.sin(s * 5 - t * 1.6 + n + j) * 0.6 * s * k;
    return [
      c[0] + Math.cos(ang) * R * (1 - 0.3 * s) + Math.cos(ang + 1.6) * sway,
      c[1] - H - s * L,
      c[2] + Math.sin(ang) * R * (1 - 0.3 * s) + Math.sin(ang + 1.6) * sway,
    ];
  }
  // Four frilled arms hanging from the middle, turning slowly.
  const n = Math.floor(frac(p.b * 4) * 4);
  const s = frac(p.b * 53.3);
  const ang = (n / 4) * TAU + s * 2.5 + t * 0.2;
  const rr = 0.45 * k * (1 + 0.5 * Math.sin(s * 14));
  return [c[0] + Math.cos(ang) * rr, c[1] - H * 0.6 - s * 4 * k, c[2] + Math.sin(ang) * rr];
}

/** Jellyfish j: its bell top, rising slowly and coming round again from below. */
function jellyTop(j: number, t: number): { c: Vec3; k: number; edge: number } {
  const y = wrap(hash(j, 102) * JELLY_SPAN + t * (0.6 + 0.4 * hash(j, 103)), JELLY_SPAN);
  const k = 0.75 + 0.6 * hash(j, 104);
  return {
    c: [
      (hash(j, 105) - 0.5) * 44 + Math.sin(t * 0.1 + j) * 2,
      y - JELLY_SPAN / 2,
      (hash(j, 106) - 0.5) * 26,
    ],
    k,
    // Faint where it comes round, so no jellyfish pops in or out.
    edge: smooth(y / 6) * smooth((JELLY_SPAN - y) / 6),
  };
}

function jellyPoint(p: Particle, t: number): Vec3 {
  if (p.c < 0.1) return snowAt(p, t, [0, 0, 0], 60, 44);
  const j = Math.floor(p.a * JELLIES);
  const { c, k } = jellyTop(j, t);
  return jellyAt(c, k, pulseOf(j, t), p, t, j);
}

/* ---------- 5. Reef: a channel swum through as the corals grow ---------- */

export const EYE_H = 3.5;
export const CHANNEL_W = 4;
const LOOP = 150;
const BEHIND = 14;
const SPEED = 3.2;
export const REEF_SLOTS = 24;
const REEF_FISH = 60;
const REEF_JELLIES = 5;

export type ReefSlot = { x: number; z0: number; colony: number; size: number };
/** Where coral slot j stands: either side of the channel, at its own place and size. */
export function reefSlot(j: number): ReefSlot {
  const side = j % 2 ? 1 : -1;
  return {
    x: side * (CHANNEL_W + 1.5 + 9 * hash(j, 111) ** 1.3),
    z0: (j + 0.7 * (hash(j, 112) - 0.5)) * (LOOP / REEF_SLOTS),
    colony: Math.floor(hash(j, 113) * COLONIES),
    size: 0.8 + 0.6 * hash(j, 114),
  };
}

const swum = (u: number) => SPEED * u * (PHASES[4] as OceanPhase).duration;
const ahead = (z0: number, s: number) => wrap(z0 - s, LOOP) - BEHIND;
const grownAt = (d: number) => 0.04 + 0.96 * smooth((LOOP - BEHIND - 14 - d) / 55);
/** Light fades into the far blue, so the far end of the channel never pops. */
const haze = (d: number) => smooth((LOOP - BEHIND - d) / 45);

type ReefRole = 'floor' | 'snow' | 'shaft' | 'fish' | 'jelly' | 'polyp' | 'coral';
const reefRole = (p: Particle): ReefRole =>
  p.c < 0.08
    ? 'floor'
    : p.c < 0.12
      ? 'snow'
      : p.c < 0.15
        ? 'shaft'
        : p.c < 0.3
          ? 'fish'
          : p.c < 0.42
            ? 'jelly'
            : p.c < 0.52
              ? 'polyp'
              : 'coral';

/** The reef's fish school: wheeling a little ahead of the eye, moving on with it. */
function reefSchool(s: number, t: number): Vec3 {
  return [
    7 * Math.sin(0.2 * t),
    EYE_H + 2 + 1.5 * Math.sin(0.3 * t),
    -s - 24 + 6 * Math.cos(0.17 * t),
  ];
}

function reefAt(p: Particle, u: number, t: number): { pos: Vec3; d: number } {
  const s = swum(u);
  const on = (z0: number, x: number, y: number) => {
    const d = ahead(z0, s);
    return { pos: [x, y, -s - d] as Vec3, d };
  };
  switch (reefRole(p)) {
    case 'floor': {
      // Sand either side and down the channel, in soft dunes.
      const x = (p.d - 0.5) * 2 * (CHANNEL_W + 16);
      return on(p.b * LOOP, x, Math.sin(p.b * 70 + x * 0.4) * 0.25 + 0.012 * x * x * 0.3);
    }
    case 'snow': {
      const z0 = p.b * LOOP;
      return on(z0, (p.d - 0.5) * 30, 1 + wrap(hash(p.i, 115) * 16 + t * 0.4, 16));
    }
    case 'shaft': {
      const k = Math.floor(hash(p.i, 116) * 9);
      const q = hash(p.i, 117);
      return on(k * (LOOP / 9) + q * 6, ((k % 3) - 1) * 8 + q * 4, 22 - q * 22);
    }
    case 'fish': {
      // Small fish along a ring round the school's centre, turning as one.
      const j = Math.floor(p.a * REEF_FISH);
      const c0 = reefSchool(s, t);
      const th = hash(j, 118) * TAU + t * 0.6;
      const r = 4.5 + 3 * hash(j, 119);
      const c: Vec3 = [
        c0[0] + Math.cos(th) * r,
        c0[1] + (hash(j, 120) - 0.5) * 2.5,
        c0[2] + Math.sin(th) * r,
      ];
      const f: Vec3 = [-Math.sin(th), 0, Math.cos(th)];
      return { pos: fishAt(c, f, 1.1, p, t, j), d: -c[2] - s };
    }
    case 'jelly': {
      const j = Math.floor(p.a * REEF_JELLIES);
      const z0 = (j + 0.5) * (LOOP / REEF_JELLIES);
      const d = ahead(z0, s);
      const c: Vec3 = [(hash(j, 121) - 0.5) * 12, 9 + 2 * Math.sin(t * 0.3 + j), -s - d];
      return { pos: jellyAt(c, 0.8, pulseOf(j, t), p, t, j), d };
    }
    default: {
      const slot = reefSlot(Math.floor(p.a * REEF_SLOTS));
      const colony = corals()[slot.colony] as Colony;
      const d = ahead(slot.z0, s);
      const q = coralLocal(colony, p, grownAt(d), t, reefRole(p) === 'polyp');
      return { pos: [slot.x + q[0] * slot.size, q[1] * slot.size, -s - d + q[2] * slot.size], d };
    }
  }
}

/* ---------- where every grain is ---------- */

/** Where particle p is in piece k's own form, `u` through it, at chapter time t. */
function form(k: number, p: Particle, u: number, t: number): Vec3 {
  switch (k) {
    case 0:
      return coralPoint(p, Math.max(u, 0), t);
    case 1:
      return shoalPoint(p, u, t);
    case 2:
      return smallPoint(p, u, t);
    case 3:
      return jellyPoint(p, t);
    default:
      return reefAt(p, u, t).pos;
  }
}

/*
 * Between pieces: a ball of faint stars, as in Vegetal. Each form loosens
 * into a wide, slowly turning ball round where the next piece stands, and
 * the stars settle into it one by one.
 */
const BALL_R = 20;

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

/** Where particle p is in piece k, `u` through it, at chapter time t. */
export function target(k: number, p: Particle, u: number, t: number): Vec3 {
  const f = form(k, p, u, t);
  const a = arrival(k, p, u);
  return a >= 1 ? f : lerp3(starBall(k, p, t), f, a);
}

/* ---------- colour ---------- */

/** The colour of particle p in piece k: a faint star until it arrives, then the form's own. */
export function colour(k: number, p: Particle, u: number, t: number): RGB {
  const c = formColour(k, p, u, t);
  const a = arrival(k, p, u);
  if (a >= 1) return c;
  const twinkle = 0.6 + 0.4 * Math.sin(t * 2.3 + p.i * 0.91);
  return mix(scale(STAR, 0.32 * twinkle), c, a);
}

function jellyColour(p: Particle, pull: number, twinkle: number, k: number): RGB {
  const glow = 0.55 + 0.45 * pull;
  switch (jellyPart(p)) {
    case 'bell':
      return scale(BELL, 0.35 * glow * k);
    case 'rim':
      return scale(RIM, 0.85 * glow * twinkle * k);
    case 'tentacle':
      return scale(TENTACLE, 0.4 * twinkle * k);
    default:
      return scale(mix(BELL, TENTACLE, 0.5), 0.5 * k);
  }
}

function formColour(k: number, p: Particle, u: number, t: number): RGB {
  const twinkle = 0.7 + 0.3 * Math.sin(t * 1.7 + p.i * 0.37);
  switch (k) {
    case 0:
      switch (coralRole(p)) {
        case 'floor':
          return scale(SAND, 0.18);
        case 'snow':
          return scale(SNOW, 0.35 * twinkle);
        case 'shaft':
          return scale(SHAFT, 0.18 * (0.4 + 0.6 * hash(p.i, 85)));
        case 'polyp':
          return scale(
            mix(CORAL_TONES[Math.floor(p.a * COLONIES)] as RGB, [1, 1, 0.9], 0.35),
            0.85 * twinkle,
          );
        default:
          return scale(CORAL_TONES[Math.floor(p.a * COLONIES)] as RGB, 0.6 * twinkle);
      }
    case 1: {
      if (shoalRole(p) === 'snow') return scale(SNOW, 0.3 * twinkle);
      const j = Math.floor(p.a * SHOAL);
      // Blue backs, silver bellies, and a few golden fish among them.
      const tone =
        hash(j, 75) < 0.12 ? GOLD_FISH : mix(BLUE_FISH, SILVER, 0.5 + 0.5 * Math.sin(p.d * TAU));
      return scale(tone, 0.32 * twinkle);
    }
    case 2: {
      if (p.c < 0.08) return scale(SNOW, 0.3 * twinkle);
      // A flash of silver whenever a fish's side turns toward the light.
      const { f } = smallFish(Math.floor(p.a * SMALL_FISH), u, t);
      const flash = Math.abs(f[0] * 0.6 + f[2] * 0.8) ** 6;
      return scale(SILVER, 0.16 + 0.6 * flash);
    }
    case 3: {
      if (p.c < 0.1) return scale(SNOW, 0.3 * twinkle);
      const j = Math.floor(p.a * JELLIES);
      return jellyColour(p, pulseOf(j, t), twinkle, jellyTop(j, t).edge);
    }
    default: {
      const { d } = reefAt(p, u, t);
      const h = haze(d);
      switch (reefRole(p)) {
        case 'floor':
          return scale(SAND, 0.2 * h);
        case 'snow':
          return scale(SNOW, 0.3 * twinkle * h);
        case 'shaft':
          return scale(SHAFT, 0.2 * h);
        case 'fish':
          return scale(mix(BLUE_FISH, SILVER, frac(p.a * 7)), 0.3 * twinkle * h);
        case 'jelly': {
          const j = Math.floor(p.a * REEF_JELLIES);
          return jellyColour(p, pulseOf(j, t), twinkle, h);
        }
        default: {
          const slot = reefSlot(Math.floor(p.a * REEF_SLOTS));
          const tone = CORAL_TONES[slot.colony] as RGB;
          return reefRole(p) === 'polyp'
            ? scale(mix(tone, [1, 1, 0.9], 0.35), 0.85 * twinkle * h)
            : scale(tone, 0.6 * twinkle * h);
        }
      }
    }
  }
}

/* ---------- the moving eye ---------- */

type Eye = { eye: Vec3; target: Vec3 };

/** Where the camera stands in piece k, `u` through it. */
export function eyeIn(k: number, u: number, t: number): Eye {
  switch (k) {
    case 0: {
      // Slowly round the garden, a little above the sand.
      const a = 0.4 + u * 1.2;
      return { eye: [Math.sin(a) * 44, FLOOR + 14, Math.cos(a) * 44], target: [0, FLOOR + 6, 0] };
    }
    case 1: {
      // Beside the shoal, keeping it in view as it loops.
      const c = shoalCentre(t);
      const a = t * 0.04;
      return {
        eye: [c[0] * 0.4 + Math.sin(a) * 40, c[1] + 4, c[2] * 0.4 + Math.cos(a) * 40],
        target: [c[0] * 0.6, c[1], c[2] * 0.6],
      };
    }
    case 2:
      return { eye: [Math.sin(t * 0.05) * 12, 8, 44], target: [0, 0, 0] };
    case 3:
      return { eye: [Math.sin(t * 0.04) * 6, -6, 48], target: [0, 2, 0] };
    default: {
      // Down the middle of the channel, a little above the sand.
      const s = swum(u);
      const sway = Math.sin(t * 0.13) * 0.6;
      return { eye: [sway, EYE_H, -s], target: [sway * 0.4, EYE_H - 0.5, -s - 30] };
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
  const a = target(index, p, u, t);
  const ca = colour(index, p, u, t);
  if (w <= 0) return { pos: a, rgb: ca };
  const next = (index + 1) % PHASES.length;
  return {
    pos: lerp3(a, target(next, p, 0, t), w),
    rgb: mix(ca, colour(next, p, 0, t), w),
  };
}

/*
 * Each piece on its own, as Vegetal's are (2026-11-10: "then do the ocean
 * after vegetal"): it starts at its beginning with no ball of stars, picked
 * by name, and loops, each grain gliding back to where the piece began. The
 * reef never loops back: the eye swims on, two turns of the channel per
 * loop, so the wrap does not show.
 */
const isReef = (k: number) => PHASES[k]?.id === 'reef';

/** How long piece k plays on its own before it loops, in seconds. */
export function pieceLength(k: number): number {
  return isReef(k) ? (2 * LOOP) / SPEED : (PHASES[k] as OceanPhase).duration;
}

/** Piece k on its own, `s` seconds in: how far through the loop (f), the piece's own u, and its time. */
function pieceClock(k: number, s: number): { f: number; u: number; t: number } {
  const len = pieceLength(k);
  const f = wrap(s, len) / len;
  return { f, u: (f * len) / (PHASES[k] as OceanPhase).duration, t: s };
}

/** How far through its loop piece k is, `s` seconds in, for the words. */
export const pieceProgress = (k: number, s: number) => pieceClock(k, s).f;

/** Position and colour of particle p in piece k on its own, `s` seconds in. */
export function pieceAt(p: Particle, k: number, s: number): { pos: Vec3; rgb: RGB } {
  const { f, u, t } = pieceClock(k, s);
  const pos = form(k, p, u, t);
  const rgb = formColour(k, p, u, t);
  if (isReef(k)) return { pos, rgb };
  const w = smooth((f - 0.8 + 0.12 * p.stagger) / 0.2);
  if (w <= 0) return { pos, rgb };
  return { pos: lerp3(pos, form(k, p, 0, t), w), rgb: mix(rgb, formColour(k, p, 0, t), w) };
}

/** The camera in piece k on its own, easing back to where the piece began in the last quarter. */
export function pieceCamera(k: number, s: number): Eye {
  const { f, u, t } = pieceClock(k, s);
  const a = eyeIn(k, u, t);
  const w = isReef(k) ? 0 : smooth((f - 0.75) / 0.25);
  if (w <= 0) return a;
  const b = eyeIn(k, 0, t);
  return { eye: lerp3(a.eye, b.eye, w), target: lerp3(a.target, b.target, w) };
}

/** Glow and size of piece k on its own. */
export function pieceLook(k: number): { glow: number; size: number } {
  const { glow, size } = PHASES[k] as OceanPhase;
  return { glow, size };
}

/** Glow and size for the whole picture, blended across piece boundaries. */
export function look(time: number): { glow: number; size: number } {
  const { index, u } = phaseAt(time);
  const now = PHASES[index] as OceanPhase;
  const next = PHASES[(index + 1) % PHASES.length] as OceanPhase;
  const w = smooth((u - 0.75) / 0.25);
  return { glow: lerp(now.glow, next.glow, w), size: lerp(now.size, next.size, w) };
}
