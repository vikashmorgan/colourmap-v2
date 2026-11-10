/*
 * OCEAN — the sea's chapter (docs/specs/art-ocean.md).
 *
 * 2026-11-09: "after vegetal series prepare the Ocean series. with corals
 * growing like trees. swarms of fishes. swarms of small fishes. jellyfish
 * swarms. and entire ecosystem in 3d as the final one with corals fishes
 * etc... that we drive through like for the tree road."
 *
 * Eight pieces played as one trip, built as Vegetal is (lib/vegetal.ts):
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
    id: 'fans',
    name: 'Sea fans',
    line: 'A forest of sea fans rises from the sand, each a single lace of branches, all bending together in the current.',
    words: [
      'A sea fan grows across the current, never along it,',
      'so every polyp on its lace can catch what the water carries.',
    ],
    duration: 32,
    glow: 1,
    size: 0.85,
  },
  {
    id: 'tables',
    name: 'Table corals',
    line: 'Table corals spread wide plates on short stalks, tier above tier, with round brain corals on the sand between them.',
    words: [
      'A table coral grows outward more than upward,',
      'a roof of stone that shades the fish beneath it.',
    ],
    duration: 32,
    glow: 1,
    size: 0.85,
  },
  {
    id: 'fish-pulse',
    name: 'Fish pulse',
    line: 'The coral stands grown in a half ring. Clownfish swim out of it together, and slip back in whenever the blue hunter passes.',
    words: [
      'A clownfish rarely strays more than a few body lengths from home.',
      'Out together, back together: the whole family breathes as one.',
    ],
    duration: 32,
    glow: 1,
    size: 0.85,
  },
  {
    id: 'shoal',
    name: 'Shoal',
    line: 'A shoal of fish turns as one, each fish keeping close to its neighbours. Your cursor is a small yellow fish they follow; a click lets them roam.',
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
    line: 'Thousands of small blue fish swim as one: a ring, a ball, a tornado, a river. Their sides flash pale as they turn.',
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
export const STEP_COLOURS = [
  '#ff7a6a',
  '#c69cff',
  '#5fd0c0',
  '#ff9a3c',
  '#9fd8e8',
  '#d8e4f0',
  '#c69cff',
  '#5fd0c0',
];

/* ---------- colours ---------- */

const SAND: RGB = [0.85, 0.72, 0.5];
const SNOW: RGB = [0.75, 0.9, 1];
const SHAFT: RGB = [0.6, 0.9, 1];
const SILVER: RGB = [0.82, 0.9, 1];
const BLUE_FISH: RGB = [0.35, 0.7, 1];
const DEEP_BLUE: RGB = [0.15, 0.35, 0.95];
const YELLOW_FISH: RGB = [1, 0.88, 0.25];
const LIGHT_BLUE: RGB = [0.6, 0.85, 1];
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
/** Sea fans: violet, magenta, indigo and deep red, no yellow (2026-11-10: "dont put the yellow greens in sea fans"). */
const FAN_TONES: RGB[] = [
  [0.75, 0.45, 1],
  [1, 0.4, 0.75],
  [0.5, 0.42, 1],
  [1, 0.38, 0.35],
];
/** Table corals and brain corals: teal, ochre, pale green, salmon. */
const TABLE_TONES: RGB[] = [
  [0.35, 0.85, 0.8],
  [0.95, 0.75, 0.4],
  [0.7, 0.9, 0.6],
  [0.95, 0.6, 0.45],
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
function coralLocal(c: Colony, p: Particle, g: number, t: number, polyp: boolean, bloom = 0): Vec3 {
  const route = c.routes[Math.floor(hash(p.i, 63) * c.routes.length)] as Route3;
  const len = length3(route);
  let q: Vec3;
  if (polyp) {
    const [x, y, z] = along3(route, len * g);
    // A bloom opens the polyps wide, like flowers.
    const open = (0.35 + 0.25 * Math.sin(t * 1.4 + p.i * 0.1)) * (1 + 1.6 * bloom);
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

/** The sea bed every garden shares: sand, drifting snow and shafts of light. */
function bedPoint(role: 'floor' | 'snow' | 'shaft', p: Particle, t: number): Vec3 {
  if (role === 'snow') return snowAt(p, t, [0, 2, 0], 60, 36);
  if (role === 'shaft') return shaftAt(p, t, [0, 0, 0]);
  const a = p.d * TAU;
  const r = 34 * Math.sqrt(p.b);
  return [Math.cos(a) * r, FLOOR + Math.sin(r * 0.6 + a * 3) * 0.3, Math.sin(a) * r];
}

function coralPoint(p: Particle, u: number, t: number): Vec3 {
  const role = coralRole(p);
  if (role === 'floor' || role === 'snow' || role === 'shaft') return bedPoint(role, p, t);
  const c = corals()[Math.floor(p.a * COLONIES)] as Colony;
  const g = 0.04 + 0.96 * smooth((u - 0.04 * (p.a * COLONIES)) / 0.45);
  return add(c.at, coralLocal(c, p, g, t, role === 'polyp'));
}

/*
 * More gardens (2026-11-10: "do more coral gardens"): a forest of sea fans
 * swaying in the current, and table corals in tiers among round brain corals.
 */

/* ---------- 2. Sea fans: flat fans swaying in the current ---------- */

export const FANS = 9;
let fanSet: Colony[] | null = null;
/** Nine sea fans, taller and finer than the garden's, each one a single plane of branches. */
export function seaFans(): Colony[] {
  if (fanSet) return fanSet;
  fanSet = Array.from({ length: FANS }, (_, k) => {
    const out: number[][] = [];
    grow3(seeded(110 + k), [0, 0, 0], [0, 1, 0], 3 + 1.6 * hash(k, 111), 0.6, 5, k, [], out);
    const r = 22 * Math.sqrt((k + 0.5) / FANS);
    const a = k * GOLDEN_ANGLE + 0.7;
    return {
      at: [Math.cos(a) * r, FLOOR, Math.sin(a) * r * 0.7],
      routes: out.map(resample3),
      flat: true,
      yaw: hash(k, 112) * Math.PI,
    };
  });
  return fanSet;
}

function fanPoint(p: Particle, u: number, t: number): Vec3 {
  const role = coralRole(p);
  if (role === 'floor' || role === 'snow' || role === 'shaft') return bedPoint(role, p, t);
  const k = Math.floor(p.a * FANS);
  const c = seaFans()[k] as Colony;
  const g = 0.04 + 0.96 * smooth((u - 0.02 * k) / 0.22);
  const q = coralLocal(c, p, g, t, role === 'polyp');
  // The current runs along x: every fan bends with it, more toward the top, the far ones a moment later.
  const sway = 0.012 * q[1] * q[1] * Math.sin(0.9 * t - 0.07 * c.at[0]);
  return [c.at[0] + q[0] + sway, c.at[1] + q[1], c.at[2] + q[2] + 0.3 * sway];
}

/* ---------- 3. Table corals: wide plates in tiers, and round brain corals ---------- */

export const TABLES = 6;
export const BRAINS = 5;
type Plate = { at: Vec3; h: number; r: number; tilt: number };
/** Table coral k: where it stands, how high its plate is and how wide. */
export function tablePlate(k: number): Plate {
  const a = k * GOLDEN_ANGLE + 0.3;
  const d = 18 * Math.sqrt((k + 0.5) / TABLES);
  return {
    at: [Math.cos(a) * d, FLOOR, Math.sin(a) * d * 0.8],
    h: 2 + 4 * hash(k, 121),
    r: 4 + 3 * hash(k, 122),
    tilt: (hash(k, 123) - 0.5) * 0.25,
  };
}
/** Brain coral k: a low mound between the tables. */
function brainMound(k: number): { at: Vec3; r: number } {
  const a = k * GOLDEN_ANGLE + 2.1;
  const d = 8 + 16 * hash(k, 124);
  return { at: [Math.cos(a) * d, FLOOR, Math.sin(a) * d * 0.8], r: 1.8 + 1.6 * hash(k, 125) };
}

function tablePoint(p: Particle, u: number, t: number): Vec3 {
  const role = coralRole(p);
  if (role === 'floor' || role === 'snow' || role === 'shaft') return bedPoint(role, p, t);
  const k = Math.floor(p.a * (TABLES + BRAINS));
  const g = 0.04 + 0.96 * smooth((u - 0.04 * k) / 0.45);
  if (k >= TABLES) {
    // A dome folded into winding ridges, like a brain.
    const m = brainMound(k - TABLES);
    const d = fibonacciSphere(p.i % 997, 997);
    const ridge =
      1 + 0.07 * Math.sin(9 * Math.atan2(d[2], d[0]) + 6 * Math.sin(3 * d[1] * Math.PI));
    const r = m.r * g * ridge;
    return [m.at[0] + d[0] * r, m.at[1] + Math.abs(d[1]) * r * 0.75, m.at[2] + d[2] * r];
  }
  const pl = tablePlate(k);
  if (p.d < 0.1) {
    // The stalk, grown first, then the plate spreads from its top.
    const y = pl.h * Math.min(1, g * 1.6) * (p.d / 0.1);
    const a = p.b * TAU;
    return [pl.at[0] + Math.cos(a) * 0.45, pl.at[1] + y, pl.at[2] + Math.sin(a) * 0.45];
  }
  // The plate: fine branches running out from the centre, its rim curling up a little; polyps along the rim.
  const ray = (Math.floor(hash(p.i, 126) * 56) + (hash(p.i, 127) - 0.5) * 0.3) / 56;
  const a = ray * TAU;
  const s = role === 'polyp' ? 0.88 + 0.12 * p.b : Math.sqrt(p.b);
  const r = pl.r * smooth((g - 0.2) / 0.8) * s;
  const lift = 0.06 * r * r + (hash(p.i, 128) - 0.5) * 0.25 + r * pl.tilt;
  const breathe = role === 'polyp' ? 0.12 * Math.sin(t * 1.4 + p.i * 0.1) : 0;
  return [pl.at[0] + Math.cos(a) * r, pl.at[1] + pl.h + lift + breathe, pl.at[2] + Math.sin(a) * r];
}

/* ---------- 4. Fish pulse: clownfish leaving their coral together, then going back in ---------- */
/*
 * 2026-11-10: "gardens where the coral is stable and grown and small fish
 * pulse in and out of it, like clownfish that all come out together in the
 * same pulse, then go back in. call it fish pulse".
 */

/*
 * 2026-11-10: "in the fish pulse do the coral more open, more busy, a bit
 * more like a semi circle. and more small fish. when a blue silver fish comes
 * the clowns enter. when it leaves they come out."
 */

export const CLOWNS = 48;
export const HOMES = 6;
/** Seconds for the blue hunter to swim once round the garden. */
export const HUNT_LAP = 20;
/** The way the eye looks at the thicket, round the vertical; the half ring opens toward it. */
const PULSE_VIEW = 0.5;
const VIEW: Vec3 = [Math.sin(PULSE_VIEW), 0, Math.cos(PULSE_VIEW)];
const ACROSS: Vec3 = [Math.cos(PULSE_VIEW), 0, -Math.sin(PULSE_VIEW)];
const THICKET: Vec3 = [0, FLOOR + 5, 0];
let homes: Colony[] | null = null;
/** Six busy corals in a half ring, open toward the eye: the fishes' home. They do not grow: they are grown. */
export function homeCorals(): Colony[] {
  if (homes) return homes;
  homes = Array.from({ length: HOMES }, (_, k) => {
    const out: number[][] = [];
    grow3(seeded(130 + k), [0, 0, 0], [0, 1, 0], 2.6 + 0.8 * hash(k, 131), 0.7, 6, k, [], out);
    const psi = ((k + 0.5) / HOMES - 0.5) * Math.PI;
    const at = add(add([0, FLOOR, 0], VIEW, -9 * Math.cos(psi)), ACROSS, 10 * Math.sin(psi));
    return { at, routes: out.map(resample3), flat: false, yaw: hash(k, 132) * TAU };
  });
  return homes;
}
/** A home coral's point, spread wider so its branches stand open. */
const opened = (q: Vec3): Vec3 => [q[0] * 1.4, q[1], q[2] * 1.4];
const HOME_TONES: RGB[] = [
  [0.75, 0.5, 1],
  [1, 0.5, 0.75],
  [0.35, 0.9, 0.85],
];

/** The blue hunter at time t: a lap round the garden, passing close in front of the coral once a lap. */
export function hunterAt(t: number): { c: Vec3; f: Vec3 } {
  const at = (tt: number): Vec3 => {
    const th = (tt / HUNT_LAP) * TAU;
    return add(
      add([0, FLOOR + 9 + 1.5 * Math.sin(th * 2), 0], ACROSS, 26 * Math.cos(th)),
      VIEW,
      -10 + 20 * Math.sin(th),
    );
  };
  const c = at(t);
  const n = at(t + 0.05);
  return { c, f: norm([n[0] - c[0], n[1] - c[1], n[2] - c[2]]) };
}

/** How far out the clownfish are at time t: 0 hidden in the coral while the hunter is near, 1 out once it has gone. */
export function outOf(t: number): number {
  const { c } = hunterAt(t);
  const d = Math.hypot(c[0] - THICKET[0], c[1] - THICKET[1], c[2] - THICKET[2]);
  return smooth((d - 13) / 9);
}

/** Clownfish j: where it shelters, and where it swims to when the shoal comes out. */
function clownPlaces(j: number): { home: Vec3; away: Vec3 } {
  const c = homeCorals()[j % HOMES] as Colony;
  const route = c.routes[Math.floor(hash(j, 141) * c.routes.length)] as Route3;
  const [x, y, z] = along3(route, length3(route) * (0.45 + 0.4 * hash(j, 142)));
  const cs = Math.cos(c.yaw);
  const sn = Math.sin(c.yaw);
  const home = add(c.at, opened([x * cs - z * sn, y, x * sn + z * cs]));
  // Out and up, toward the open side of the half ring.
  const a = Math.atan2(VIEW[2], VIEW[0]) + (hash(j, 143) - 0.5) * 2.2;
  const dir = norm([Math.cos(a), 0.45 + 0.4 * hash(j, 144), Math.sin(a)]);
  return { home, away: add(home, dir, 5 + 4 * hash(j, 145)) };
}

/** Clownfish j at time t: its place and heading. */
export function clownFish(j: number, t: number): { c: Vec3; f: Vec3; out: number } {
  const lag = 0.4 * hash(j, 146);
  const at = (tt: number): Vec3 => {
    // All together, each a hair behind the next, so the shoal moves as one but not as a machine.
    const e = outOf(tt - lag);
    const { home, away } = clownPlaces(j);
    return add(
      lerp3(home, away, e),
      [Math.sin(1.3 * tt + j), 0.5 * Math.sin(1.7 * tt + j), Math.cos(1.1 * tt + j)],
      0.8 * e,
    );
  };
  const c = at(t);
  const n = at(t + 0.05);
  const v: Vec3 = [n[0] - c[0], n[1] - c[1], n[2] - c[2]];
  const { home, away } = clownPlaces(j);
  const outward = norm([away[0] - home[0], away[1] - home[1], away[2] - home[2]]);
  // Facing the way it swims. On the way in it faces home, and once sheltered turns slowly to look
  // out again: a smooth turn round the vertical, never a flip.
  const going = outOf(t - lag + 0.6) - outOf(t - lag - 0.6);
  const turn = Math.PI * smooth(-going / 0.15);
  const cs = Math.cos(turn);
  const sn = Math.sin(turn);
  const rest: Vec3 = [
    outward[0] * cs - outward[2] * sn,
    outward[1] * cs,
    outward[0] * sn + outward[2] * cs,
  ];
  const w = smooth((Math.hypot(v[0], v[1], v[2]) - 0.005) / 0.03);
  const f = norm(add(scale(rest, 1 - w), norm(v), w));
  return { c, f, out: outOf(t - lag) };
}

type PulseRole = 'floor' | 'snow' | 'shaft' | 'polyp' | 'coral' | 'hunter' | 'fish';
const pulseRole = (p: Particle): PulseRole =>
  p.c < 0.07
    ? 'floor'
    : p.c < 0.11
      ? 'snow'
      : p.c < 0.14
        ? 'shaft'
        : p.c < 0.24
          ? 'polyp'
          : p.c < 0.62
            ? 'coral'
            : p.c < 0.66
              ? 'hunter'
              : 'fish';

function pulsePoint(p: Particle, t: number): Vec3 {
  const role = pulseRole(p);
  if (role === 'floor' || role === 'snow' || role === 'shaft') return bedPoint(role, p, t);
  if (role === 'fish') {
    const j = Math.floor(p.a * CLOWNS);
    const { c, f } = clownFish(j, t);
    return fishAt(c, f, 1.2, p, t, j);
  }
  if (role === 'hunter') {
    const { c, f } = hunterAt(t);
    return fishAt(c, f, 4.5, p, t * 0.6, 0);
  }
  const c = homeCorals()[Math.floor(p.a * HOMES)] as Colony;
  return add(c.at, opened(coralLocal(c, p, 1, t, role === 'polyp')));
}

/** A clownfish's colours, head to tail: orange, with three white bands and darker fins. */
function clownColour(p: Particle, twinkle: number): RGB {
  const s = p.b;
  const band = (s > 0.2 && s < 0.28) || (s > 0.47 && s < 0.55) || (s > 0.74 && s < 0.8);
  if (band) return scale([1, 0.96, 0.9], 0.5 * twinkle);
  if (s > 0.9) return scale([1, 0.4, 0.06], 0.22 * twinkle);
  return scale([1, 0.45, 0.08], 0.4 * twinkle);
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

/* ---------- 5. Shoal: a school that turns as one ---------- */

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

/*
 * Five kinds of shoal, picked by pills, each of one kind of fish only
 * (2026-11-10: "5 different shoal types with each time a group of only same
 * fish. some fish more developed like hammer sharks", "swordfish instead of
 * dolphin"). The bigger the fish, the fewer, the slower and the wider apart.
 */
type ShoalKind = {
  name: string;
  count: number;
  len: number;
  /** Body depth, as a share of the length, how much taller it is, and how wide side to side (a tang is a flat disc). */
  depth: number;
  tall: number;
  wide?: number;
  /** Dorsal fin height, as a share of the length; 0 for none. Sharks and swordfish also get side fins. */
  dorsal: number;
  /**
   * A fanned tail, or the crescent of fast swimmers, its upper and lower lobes as shares of the
   * length; a shark's upper lobe is the longer, a thresher's as long as its body.
   */
  tail: 'fan' | 'crescent';
  lobes?: [number, number];
  head?: 'hammer' | 'bill';
  spread: number;
  /** How fast the shoal travels its loop, and how fast the tails beat. */
  pace: number;
  wag: number;
  /** How far back the eye stands, for big fish. */
  view: number;
  back: RGB;
  belly: RGB;
  bars?: boolean;
  /** A butterflyfish's thin snout ahead of the head, and the long pennant streaming from its back, as shares of the length. */
  snout?: number;
  pennant?: number;
  /** Its markings, head (0) to tail (1): bands across the body, some on the upper half only. */
  marks?: { from: number; to: number; tone: RGB; top?: boolean }[];
};

const INK: RGB = [0.06, 0.06, 0.08];
const PEARL: RGB = [0.95, 0.95, 0.9];
const LEMON: RGB = [1, 0.85, 0.15];
/** A butterflyfish: a tall flat disc, small fins, a quick tail; they drift in pairs and small groups. */
const butterfly = (
  o: Partial<ShoalKind> & Pick<ShoalKind, 'name' | 'back' | 'belly'>,
): ShoalKind => ({
  count: 26,
  len: 2.1,
  depth: 0.42,
  tall: 1.25,
  wide: 0.25,
  dorsal: 0.1,
  tail: 'fan',
  spread: 8,
  pace: 0.8,
  wag: 1.3,
  view: 0.85,
  ...o,
});
export const SHOAL_KINDS: ShoalKind[] = [
  {
    name: 'Silver fish',
    count: SHOAL,
    len: 3,
    depth: 0.2,
    tall: 0.75,
    dorsal: 0,
    tail: 'fan',
    spread: 9,
    pace: 1,
    wag: 1,
    view: 1,
    back: DEEP_BLUE,
    belly: BLUE_FISH,
  },
  {
    name: 'Yellow tangs',
    count: 44,
    len: 2.2,
    depth: 0.4,
    tall: 1.3,
    wide: 0.3,
    dorsal: 0.08,
    tail: 'fan',
    spread: 7,
    pace: 0.9,
    wag: 1.2,
    view: 0.85,
    back: [1, 0.82, 0.12],
    belly: [1, 0.93, 0.45],
  },
  {
    name: 'Barracudas',
    count: 22,
    len: 5.5,
    depth: 0.075,
    tall: 0.9,
    dorsal: 0.06,
    tail: 'fan',
    spread: 11,
    pace: 0.7,
    wag: 0.6,
    view: 1.05,
    back: [0.42, 0.52, 0.6],
    belly: SILVER,
    bars: true,
  },
  {
    name: 'Hammerheads',
    count: 8,
    len: 11,
    depth: 0.11,
    tall: 0.9,
    dorsal: 0.22,
    tail: 'crescent',
    lobes: [0.36, 0.16],
    head: 'hammer',
    spread: 17,
    pace: 0.45,
    wag: 0.4,
    view: 1.35,
    back: [0.5, 0.56, 0.62],
    belly: [0.86, 0.89, 0.92],
  },
  {
    name: 'Swordfish',
    count: 5,
    len: 10,
    depth: 0.12,
    tall: 0.85,
    dorsal: 0.2,
    tail: 'crescent',
    head: 'bill',
    spread: 14,
    pace: 0.85,
    wag: 0.5,
    view: 1.3,
    back: [0.22, 0.32, 0.62],
    belly: SILVER,
  },
  {
    // 2026-11-10: "add the sharks with big tails that point longer, like a moon with the higher part longer".
    name: 'Thresher sharks',
    count: 6,
    len: 8.5,
    depth: 0.12,
    tall: 0.95,
    dorsal: 0.2,
    tail: 'crescent',
    lobes: [0.85, 0.13],
    spread: 15,
    pace: 0.5,
    wag: 0.45,
    view: 1.45,
    back: [0.5, 0.44, 0.6],
    belly: [0.88, 0.88, 0.92],
  },
  // Butterflyfish (2026-11-10: "add more types of beautiful unique butterfly fish").
  butterfly({
    // Pearl white with copper bands, a long snout, a dark eyespot near the tail.
    name: 'Copperbands',
    back: PEARL,
    belly: PEARL,
    snout: 0.2,
    marks: [
      { from: 0.08, to: 0.14, tone: [1, 0.5, 0.15] },
      { from: 0.28, to: 0.37, tone: [1, 0.55, 0.15] },
      { from: 0.5, to: 0.59, tone: [1, 0.55, 0.15] },
      { from: 0.7, to: 0.76, tone: [1, 0.5, 0.15] },
      { from: 0.78, to: 0.82, tone: INK, top: true },
    ],
  }),
  butterfly({
    // White chevrons at the front, lemon behind, a black band through the eye and a thread from the fin.
    name: 'Threadfins',
    back: LEMON,
    belly: PEARL,
    pennant: 0.25,
    marks: [
      { from: 0.1, to: 0.16, tone: INK },
      { from: 0.55, to: 1, tone: LEMON, top: true },
      { from: 0.85, to: 1, tone: LEMON },
    ],
  }),
  butterfly({
    // Gold, with a raccoon's black mask over the eyes and a white band behind it.
    name: 'Raccoons',
    back: [1, 0.72, 0.15],
    belly: [1, 0.82, 0.3],
    marks: [
      { from: 0.06, to: 0.2, tone: INK, top: true },
      { from: 0.2, to: 0.25, tone: PEARL, top: true },
      { from: 0.84, to: 0.89, tone: INK },
    ],
  }),
  butterfly({
    // Bright yellow, a very long snout, the top of the head black above the white throat.
    name: 'Longnoses',
    back: [1, 0.9, 0.1],
    belly: [1, 0.9, 0.1],
    snout: 0.34,
    marks: [
      { from: 0, to: 0.22, tone: PEARL },
      { from: 0, to: 0.22, tone: INK, top: true },
      { from: 0.8, to: 0.84, tone: INK },
    ],
  }),
  butterfly({
    // Bannerfish: white with two broad black bands, a yellow tail, a long white banner from the back.
    name: 'Bannerfish',
    back: PEARL,
    belly: PEARL,
    pennant: 0.6,
    dorsal: 0.14,
    marks: [
      { from: 0.2, to: 0.38, tone: INK },
      { from: 0.55, to: 0.72, tone: INK },
      { from: 0.82, to: 1, tone: LEMON },
    ],
  }),
];
export const SHOAL_NAMES = SHOAL_KINDS.map((k) => k.name);
let shoalKind = 0;
/** Which shoal swims: set by the pills, the first in the Journey. */
export function setShoalKind(i: number) {
  shoalKind = SHOAL_KINDS[i] ? i : 0;
}
const kindNow = () => SHOAL_KINDS[shoalKind] as ShoalKind;

/*
 * The cursor as a small yellow fish, the shoal following it at the speed it
 * swims anyway (2026-11-10: "in shoal transform my mouse cursor into a small
 * yellow fish. and all the shoal follows it", "at same speed as they are
 * moving now"). The player hands over where the cursor points each frame.
 */
export const hasPointer = (k: number) => PHASES[k]?.id === 'shoal';
/** Roughly how fast the shoal travels its loop, in units a second, before its kind's pace. */
const SHOAL_SPEED = 4.4;
/** Seconds of the chase kept, enough for the slowest shoal's last fish. */
const TRAIL_SECONDS = 9;
type Trail = { t: number; c: Vec3; f: Vec3 };
const steer = {
  w: 0,
  cursor: null as Vec3 | null,
  lead: [0, 0, 0] as Vec3,
  /** The way the shoal is swimming: it turns toward the cursor gradually, never on the spot. */
  dir: [1, 0, 0] as Vec3,
  f: [1, 0, 0] as Vec3,
  trail: [] as Trail[],
};
/** How quickly the shoal turns toward the cursor, per second: a wide, easy curve at its speed. */
const TURN = 1.1;
/** Where the cursor points (null when it is away) at time t, dt after the last frame. */
export function setPointer(at: Vec3 | null, dt: number, t: number) {
  const kind = kindNow();
  const was = steer.w;
  steer.w = Math.max(0, Math.min(1, steer.w + (at ? dt : -dt) / 1.2));
  if (!at) {
    if (steer.w === 0) steer.trail = [];
    return;
  }
  if (was === 0) {
    // Taking over from the loop where the shoal is now.
    steer.lead = shoalCentre(t * kind.pace);
    steer.f = heading((tt) => shoalCentre(tt * kind.pace), t);
    steer.dir = steer.f;
    steer.trail = [];
  }
  if (steer.cursor && dt > 0) {
    const d: Vec3 = [at[0] - steer.cursor[0], at[1] - steer.cursor[1], at[2] - steer.cursor[2]];
    if (Math.hypot(...d) > 1e-3) steer.f = norm(lerp3(steer.f, norm(d), Math.min(1, dt * 8)));
  }
  steer.cursor = at;
  // The shoal swims on at its own speed, always, bending its course toward the cursor in an easy
  // curve; near the cursor it swings round it in loops instead of stopping (2026-11-11: "when
  // activated the fish stop moving fluidly and become very mechanic in their turns").
  const to: Vec3 = [at[0] - steer.lead[0], at[1] - steer.lead[1], at[2] - steer.lead[2]];
  const dist = Math.hypot(...to);
  const round = norm(cross(steer.dir, [0, 1, 0]));
  const want = norm(add(norm(to), round, 0.6 * smooth((7 - dist) / 5)));
  steer.dir = norm(lerp3(steer.dir, want, 1 - Math.exp(-TURN * dt)));
  steer.lead = add(steer.lead, steer.dir, SHOAL_SPEED * kind.pace * dt);
  steer.trail.push({ t, c: steer.lead, f: steer.dir });
  while (steer.trail.length > 2 && (steer.trail[0] as Trail).t < t - TRAIL_SECONDS)
    steer.trail.shift();
}
/** Where the chase was at time t, and which way it was going. */
function trailAt(t: number): { c: Vec3; f: Vec3 } {
  const tr = steer.trail;
  if (!tr.length) return { c: steer.lead, f: steer.f };
  if (t <= (tr[0] as Trail).t) return tr[0] as Trail;
  for (let i = tr.length - 1; i > 0; i--) {
    const a = tr[i - 1] as Trail;
    const b = tr[i] as Trail;
    if (t >= a.t) {
      const w = b.t > a.t ? Math.min(1, (t - a.t) / (b.t - a.t)) : 1;
      return { c: lerp3(a.c, b.c, w), f: norm(lerp3(a.f, b.f, w)) };
    }
  }
  return tr[tr.length - 1] as Trail;
}

/** Fish j of the shoal: where it swims and which way it points. */
export function shoalFish(j: number, u: number, t: number): { c: Vec3; f: Vec3 } {
  const kind = kindNow();
  const path = (tt: number) => shoalCentre(tt * kind.pace);
  // Each fish follows the shoal's path a moment behind its neighbours ahead, so turns run through it.
  const lag = (hash(j, 71) * 3) / kind.pace;
  let centre = path(t - lag);
  let f = heading(path, t - lag);
  if (steer.w > 0) {
    // Following the cursor's fish instead, along the way the chase went.
    const chase = trailAt(t - lag);
    const w = smooth(steer.w);
    centre = lerp3(centre, chase.c, w);
    f = norm(lerp3(f, chase.f, w));
  }
  const side = norm(cross(f, [0, 1, 0]));
  const up = cross(side, f);
  // A loose lens round the path, breathing a little; tighter as the piece goes on.
  const spread =
    kind.spread * (1 - 0.25 * smooth((u - 0.4) / 0.3)) * (1 + 0.12 * Math.sin(t * 0.5));
  const ox = (hash(j, 72) - 0.5) * 2 * spread + Math.sin(t * 0.7 + j) * 0.3;
  const oy = (hash(j, 73) - 0.5) * spread * 1.2;
  return { c: add(add(centre, side, ox), up, oy), f };
}

/** Grain p on a fish of this kind at c heading f: body, fins, and a hammer or a sword at the head. */
function kindFishAt(
  kind: ShoalKind,
  c: Vec3,
  f: Vec3,
  len: number,
  p: Particle,
  t: number,
  j: number,
): Vec3 {
  const side = norm(cross(f, [0, 1, 0]));
  const up = cross(side, f);
  const wagAt = (s: number) => 0.12 * len * Math.sin(9 * kind.wag * t + j * 1.3 - 6 * s) * s * s;
  const put = (back: number, lat: number, ver: number): Vec3 => [
    c[0] + f[0] * back + side[0] * lat + up[0] * ver,
    c[1] + f[1] * back + side[1] * lat + up[1] * ver,
    c[2] + f[2] * back + side[2] * lat + up[2] * ver,
  ];
  const bodyAt = (s: number) => kind.depth * len * Math.sin(Math.PI * Math.min(1, s ** 0.7 * 1.05));
  const part = hash(p.i, 151);
  const q = hash(p.i, 152);
  const big = kind.dorsal >= 0.15;
  if (kind.snout && part < 0.06) {
    // A thin snout for picking food from cracks in the coral.
    return put(len * (0.45 + kind.snout * q), (p.d - 0.5) * 0.03 * len * (1 - q), -0.03 * len);
  }
  if (kind.pennant && part >= 0.06 && part < 0.1) {
    // The pennant: from the front of the fin, up and streaming back, waving as it goes.
    const w = q;
    const top = bodyAt(0.3) * kind.tall + kind.dorsal * len;
    return put(
      len * 0.2 - kind.pennant * len * w,
      wagAt(0.3 + w * 0.5) + 0.04 * len * Math.sin(5 * t + j - 6 * w) * w,
      top + 0.1 * len * Math.sin(w * Math.PI * 0.8),
    );
  }
  if (kind.head === 'hammer' && part < 0.1) {
    // The hammer: a flat blade across the head, an eye at each end.
    return put(len * 0.47, (q - 0.5) * 0.34 * len, (p.d - 0.5) * 0.03 * len);
  }
  if (kind.head === 'bill' && part < 0.08) {
    // The sword: a long flat bill, a third of the body again, ahead of the head.
    return put(len * (0.5 + 0.38 * q), (p.d - 0.5) * 0.015 * len * (1 - q), 0);
  }
  if (kind.dorsal > 0 && part >= 0.1 && part < 0.18) {
    // The dorsal fin: its base on the back, narrowing as it rises, the tip swept back in a curve,
    // as a shark's is (2026-11-10: "improve the top fin and tail of the sharks").
    const h = p.d ** 0.8;
    const s = 0.28 + 0.18 * q * (1 - h) + (big ? 0.14 : 0.06) * h ** 1.6;
    return put(
      len * (0.5 - s),
      wagAt(s),
      bodyAt(0.28 + 0.09 * q) * kind.tall + kind.dorsal * len * h,
    );
  }
  if (big && part >= 0.18 && part < 0.25) {
    // Side fins, swept back and a little down.
    const s = 0.3 + 0.08 * p.d;
    const out = bodyAt(s) + 0.2 * len * q;
    return put(len * (0.5 - s) - 0.08 * len * q, (p.b < 0.5 ? -1 : 1) * out, -0.06 * len * q);
  }
  const [upperLobe, lowerLobe] = kind.lobes ?? [0.26, 0.24];
  if (kind.tail === 'crescent' && part >= 0.25 && part < (upperLobe > 0.5 ? 0.42 : 0.34)) {
    // A crescent tail: two lobes curving back from the tail's root, tapering to their points;
    // the longer the upper lobe, the more of the grains it takes.
    const upper = p.b < upperLobe / (upperLobe + lowerLobe);
    const L = (upper ? upperLobe : lowerLobe) * len;
    const w = q;
    // A long lobe leaves lower and sweeps up toward its tip, like a scythe.
    const ang = upper ? (upperLobe > 0.5 ? 0.3 + 0.35 * w : 0.75 - 0.25 * w) : -0.75 + 0.25 * w;
    const thick = (p.d - 0.5) * 0.1 * len * (1 - w) ** 0.7;
    return put(
      -len * 0.48 - L * w * Math.cos(ang),
      wagAt(1) * (1 + w),
      L * w * Math.sin(ang) + thick,
    );
  }
  // The body, head at s = 0 and tail at s = 1; a fanned tail on the small fish.
  const s = p.b;
  const fin = kind.tail === 'fan' && s > 0.82 ? ((s - 0.82) / 0.18) * 0.22 * len : 0;
  const a = p.d * TAU;
  return put(
    len * (0.5 - s),
    Math.cos(a) * bodyAt(s) * (kind.wide ?? 1) + wagAt(s),
    Math.sin(a) * (bodyAt(s) * kind.tall + fin),
  );
}

type ShoalRole = 'snow' | 'fish';
const shoalRole = (p: Particle): ShoalRole => (p.c < 0.1 ? 'snow' : 'fish');

/** Grains of the snow that become the cursor's yellow fish while it leads. */
const isLeader = (p: Particle) => p.c >= 0.075 && p.c < 0.1;

function shoalPoint(p: Particle, u: number, t: number): Vec3 {
  if (shoalRole(p) === 'snow') {
    const flake = snowAt(p, t, [0, 0, 0], 70, 40);
    if (steer.w <= 0 || !steer.cursor || !isLeader(p)) return flake;
    return lerp3(flake, fishAt(steer.cursor, steer.f, 1.6, p, t, 0), steer.w);
  }
  const kind = kindNow();
  const j = Math.floor(p.a * kind.count);
  const { c, f } = shoalFish(j, u, t);
  const len = kind.len * (1 + 0.2 * hash(j, 74));
  return shoalKind === 0 ? fishAt(c, f, len, p, t, j) : kindFishAt(kind, c, f, len, p, t, j);
}

/**
 * A shoal fish's colour: dark back, pale belly, the barracuda's bars. The silver fish are all
 * blue, and one alone is yellow (2026-11-10: "silver fish all in blue and only one in yellow").
 */
function shoalColour(p: Particle, twinkle: number): RGB {
  const kind = kindNow();
  const j = Math.floor(p.a * kind.count);
  if (shoalKind === 0) {
    const blue = mix(DEEP_BLUE, BLUE_FISH, 0.5 + 0.5 * Math.sin(p.d * TAU));
    // The one yellow fish, unless the cursor's own yellow fish is leading.
    const yellow = j === 0 ? 1 - steer.w : 0;
    return scale(mix(blue, YELLOW_FISH, yellow), (0.34 + 0.08 * yellow) * twinkle);
  }
  if (kind.marks) {
    // A butterflyfish: its snout, pennant and fins in its back colour, its body banded.
    const part = hash(p.i, 151);
    if ((kind.snout && part < 0.06) || (part >= 0.1 && part < 0.18))
      return scale(kind.back, 0.34 * twinkle);
    if (kind.pennant && part >= 0.06 && part < 0.1) return scale(PEARL, 0.4 * twinkle);
    const top = Math.sin(p.d * TAU) > 0.1;
    let tone = mix(kind.belly, kind.back, 0.5 + 0.5 * Math.sin(p.d * TAU));
    for (const m of kind.marks) if (p.b >= m.from && p.b < m.to && (!m.top || top)) tone = m.tone;
    return scale(tone, 0.36 * twinkle);
  }
  const tone = mix(kind.belly, kind.back, 0.5 + 0.5 * Math.sin(p.d * TAU));
  const bar =
    kind.bars && p.b > 0.15 && p.b < 0.8 && frac(p.b * 9) < 0.35 && Math.sin(p.d * TAU) > -0.2;
  return scale(tone, (bar ? 0.18 : 0.34) * twinkle);
}

/* ---------- 6. Small fish: ten ways of swimming together ---------- */

export const SMALL_FISH = 900;
/** Small fish j's place: on a wheeling ring, or, mid-piece, orbiting in a tight ball. */
function ringPath(j: number, u: number, t: number): Vec3 {
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

/** A point at radius r in a random direction for fish j, turning slowly round a tilted axis. */
function orbit(j: number, r: number, t: number, speed: number): Vec3 {
  const tilt = hash(j, 94) * Math.PI;
  const an = (1 + 0.4 * hash(j, 96)) * t * speed + hash(j, 97) * TAU;
  return [Math.cos(an) * r, Math.sin(an) * r * Math.cos(tilt), Math.sin(an) * r * Math.sin(tilt)];
}

/*
 * Ten swarms, picked by pills (2026-11-10: "small fish do 10 types of motions
 * movements and swarms. and do them in blue"). Each is fish j's place at time t.
 */
const SWARMS: { name: string; at: (j: number, u: number, t: number) => Vec3 }[] = [
  { name: 'Ring', at: ringPath },
  {
    // One tight ball, breathing in and out.
    name: 'Bait ball',
    at: (j, _u, t) =>
      orbit(j, (6 + 4 * Math.cbrt(hash(j, 95))) * (1 + 0.15 * Math.sin(0.8 * t)), t, 1),
  },
  {
    // A funnel standing up from below, wider at the top, its middle swaying.
    name: 'Tornado',
    at: (j, _u, t) => {
      const y = 13 * Math.sin(hash(j, 91) * TAU + t * 0.15);
      const r = 3 + 5 * ((y + 13) / 26) + 0.8 * hash(j, 92);
      const a = hash(j, 93) * TAU + t * (1.2 - 0.03 * y);
      const mx = 3 * Math.sin(0.3 * t + y * 0.12);
      return [mx + Math.cos(a) * r, y, Math.sin(a) * r];
    },
  },
  {
    // A flat wheel, the inner fish going round faster than the outer.
    name: 'Carousel',
    at: (j, _u, t) => {
      const r = 4 + 14 * Math.sqrt(hash(j, 91));
      const a = hash(j, 92) * TAU + (t * 1.6) / (1 + r * 0.08);
      return [
        Math.cos(a) * r,
        (hash(j, 93) - 0.5) * 3 + 1.5 * Math.sin(a * 2 + t * 0.5),
        Math.sin(a) * r,
      ];
    },
  },
  {
    // One long ribbon, each fish following the one ahead along a winding path.
    name: 'River',
    at: (j, _u, t) => {
      const sg = t * 0.3 - hash(j, 91) * 3.2;
      const path: Vec3 = [20 * Math.sin(sg), 6 * Math.sin(2 * sg + 0.5), 10 * Math.sin(1.5 * sg)];
      return add(path, orbit(j, 2.4 * Math.sqrt(hash(j, 95)), t, 0.6));
    },
  },
  {
    // A loop round two centres, crossing in the middle.
    name: 'Figure eight',
    at: (j, _u, t) => {
      const sg = hash(j, 91) * TAU + t * 0.45;
      const path: Vec3 = [18 * Math.sin(sg), 3 * Math.sin(2 * sg + t * 0.3), 9 * Math.sin(2 * sg)];
      return add(path, orbit(j, 3 * Math.sqrt(hash(j, 95)), t, 0.8));
    },
  },
  {
    // A hunter passes through the school; the fish part round it and close behind.
    name: 'Fountain',
    at: (j, _u, t) => {
      const base: Vec3 = [
        (hash(j, 91) - 0.5) * 30 + 2 * Math.sin(0.4 * t + j),
        (hash(j, 92) - 0.5) * 10,
        (hash(j, 93) - 0.5) * 14,
      ];
      const hunter: Vec3 = [24 * Math.sin(t * 0.35), 1.5 * Math.sin(t * 0.5), 0];
      const d: Vec3 = [base[0] - hunter[0], base[1] - hunter[1], base[2] - hunter[2]];
      const dl = Math.hypot(...d) || 1;
      return add(base, d, (6 * Math.exp(-((dl / 6) ** 2))) / dl);
    },
  },
  {
    // A ball that bursts outward all at once, then slowly gathers again.
    name: 'Flash',
    at: (j, _u, t) => {
      const ph = frac(t / 6);
      const burst = smooth(ph / 0.06) * (1 - smooth((ph - 0.1) / 0.55));
      return orbit(
        j,
        (5 + 3 * Math.cbrt(hash(j, 95))) * (1 + 1.8 * burst * (0.6 + 0.4 * hash(j, 98))),
        t,
        0.7,
      );
    },
  },
  {
    // A wide sheet, a slow wave running through it.
    name: 'Wave',
    at: (j, _u, t) => {
      const x = (hash(j, 91) - 0.5) * 44 + 1.5 * Math.sin(t * 0.6 + j);
      const z = (hash(j, 92) - 0.5) * 24;
      return [
        x,
        4 * Math.sin(0.3 * x - 1.3 * t) + 2 * Math.sin(0.3 * z + t) + (hash(j, 93) - 0.5),
        z,
      ];
    },
  },
  {
    // Two schools circling each other, merging into one, and parting again.
    name: 'Two schools',
    at: (j, _u, t) => {
      const apart = 12 * (0.5 + 0.5 * Math.cos(0.3 * t));
      const a = t * 0.5 + (j % 2) * Math.PI;
      const c: Vec3 = [Math.cos(a) * apart, 0, Math.sin(a) * apart * 0.6];
      return add(c, orbit(j, 4 + 2.5 * Math.cbrt(hash(j, 95)), t, 1.1));
    },
  },
];
export const SWARM_NAMES = SWARMS.map((w) => w.name);
let swarm = 0;
/** Which swarm the small fish swim: set by the pills, the ring in the Journey. */
export function setSwarm(i: number) {
  swarm = SWARMS[i] ? i : 0;
}
const smallPath = (j: number, u: number, t: number) => (SWARMS[swarm] ?? SWARMS[0])!.at(j, u, t);

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

/* ---------- 7. Jellyfish: bells pulsing, tentacles trailing ---------- */

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

/*
 * Five kinds of jellyfish, picked by pills, one kind at a time (2026-11-10:
 * "jelly fish do 5 kinds of jfish"). The first is the glowing one above.
 */
type JellyKind = {
  name: string;
  count: number;
  size: number;
  /** How fast they rise and how fast the bells beat; comb jellies do not pulse. */
  rise: number;
  beat: number;
};
export const JELLY_KINDS: JellyKind[] = [
  { name: 'Glow jellies', count: JELLIES, size: 1, rise: 1, beat: 1 },
  // A wide flat saucer, four pink rings in it, a fringe of short fine tentacles.
  { name: 'Moon jellies', count: 11, size: 1, rise: 0.8, beat: 0.8 },
  // Few and big: a red bell, a long mane of tentacles in bunches, a curtain of frilled arms.
  { name: 'Lion’s manes', count: 4, size: 1.45, rise: 0.5, beat: 0.6 },
  // A pale cube, four bunches of thin tentacles from its corners; quick swimmers.
  { name: 'Box jellies', count: 9, size: 0.9, rise: 1.5, beat: 1.8 },
  // An oval body that drifts, eight rows of combs shimmering in rainbow waves.
  { name: 'Comb jellies', count: 14, size: 0.85, rise: 0.7, beat: 0 },
];
export const JELLY_NAMES = JELLY_KINDS.map((k) => k.name);
let jellyKind = 0;
/** Which jellyfish drift: set by the pills, the glowing ones in the Journey. */
export function setJellyKind(i: number) {
  jellyKind = JELLY_KINDS[i] ? i : 0;
}
const jellyNow = () => JELLY_KINDS[jellyKind] as JellyKind;
const jellyPull = (j: number, t: number) => {
  const { beat } = jellyNow();
  return beat ? pulseOf(j, t * beat) : 0;
};

/** Jellyfish j of the kind drifting now: its top, rising, and how faint it is near the wrap. */
function kindTop(j: number, t: number): { c: Vec3; k: number; edge: number } {
  if (jellyKind === 0) return jellyTop(j, t);
  const kind = jellyNow();
  const y = wrap(
    hash(j, 102) * JELLY_SPAN + t * kind.rise * (0.6 + 0.4 * hash(j, 103)),
    JELLY_SPAN,
  );
  return {
    c: [
      ((j + 0.5) / kind.count - 0.5) * 46 + (hash(j, 105) - 0.5) * 6 + Math.sin(t * 0.1 + j) * 2,
      // The big ones hang higher, so their manes stay in view.
      y - JELLY_SPAN / 2 + (kind.size > 1.2 ? 3 : 0),
      (hash(j, 106) - 0.5) * 22,
    ],
    k: kind.size * (0.8 + 0.4 * hash(j, 104)),
    edge: smooth(y / 6) * smooth((JELLY_SPAN - y) / 6),
  };
}

/** A bell of radius r and height h hanging below c, v from the top (0) to the rim (1); square for a box jelly. */
function dome(c: Vec3, r: number, h: number, v: number, ang: number, square = false): Vec3 {
  const q = Math.sin((v * Math.PI) / 2);
  const ring = square
    ? ((r * 0.85) / Math.max(Math.abs(Math.cos(ang)), Math.abs(Math.sin(ang)))) * (0.55 + 0.45 * q)
    : r * q;
  const y = square ? h * v : h * (1 - Math.cos((v * Math.PI) / 2));
  return [c[0] + Math.cos(ang) * ring, c[1] - y, c[2] + Math.sin(ang) * ring];
}

/** Grain p on a jellyfish of kinds 1 to 4, top at c, size k, at pulse `pull`. */
function kindJellyAt(c: Vec3, k: number, pull: number, p: Particle, t: number, j: number): Vec3 {
  const a = p.b * TAU;
  const v = Math.sqrt(frac(p.b * 7.3));
  const ang = frac(p.b * 13.7) * TAU;
  switch (jellyKind) {
    case 1: {
      const R = 3 * k * (1 - 0.15 * pull);
      const H = 0.8 * k * (1 + 0.25 * pull);
      if (p.d < 0.45) return dome(c, R, H, v, ang);
      if (p.d < 0.53) return dome(c, R * 1.03, H, 1, a);
      if (p.d < 0.75) {
        const n = Math.floor(frac(p.b * 40) * 40);
        const s = frac(p.b * 97.1);
        const na = (n / 40) * TAU;
        const sway = Math.sin(s * 5 - t * 1.4 + n + j) * 0.2 * s * k;
        return [
          c[0] + Math.cos(na) * (R + sway),
          c[1] - H - s * 1.6 * k,
          c[2] + Math.sin(na) * (R + sway),
        ];
      }
      // Four horseshoe rings seen through the bell.
      const n = Math.floor(frac(p.b * 4) * 4);
      const ca = (n / 4) * TAU + Math.PI / 4;
      const rr = 0.28 * R * (0.85 + 0.15 * frac(p.b * 31.1));
      return [
        c[0] + Math.cos(ca) * 0.42 * R + Math.cos(a * 11) * rr,
        c[1] - H * 0.45,
        c[2] + Math.sin(ca) * 0.42 * R + Math.sin(a * 11) * rr,
      ];
    }
    case 2: {
      const R = 2.6 * k * (1 - 0.18 * pull);
      const H = 1.3 * k * (1 + 0.2 * pull);
      if (p.d < 0.3) return dome(c, R, H, v, ang);
      if (p.d < 0.36) return dome(c, R * 1.03, H, 1, a);
      if (p.d < 0.85) {
        // Eight bunches of long fine tentacles, a mane trailing far below.
        const n = Math.floor(frac(p.b * 8) * 8);
        const s = frac(p.b * 97.1);
        const na = (n / 8) * TAU + (frac(p.b * 61.7) - 0.5) * 0.6;
        const L = 11 * k * (0.6 + 0.4 * frac(p.b * 23.9)) * (1 - 0.1 * pull);
        const sw = Math.sin(s * 4 - t * 0.9 + n + j) * 1.4 * s * k;
        return [
          c[0] + Math.cos(na) * R * (0.85 - 0.3 * s) + Math.cos(na + 1.6) * sw,
          c[1] - H - s * L,
          c[2] + Math.sin(na) * R * (0.85 - 0.3 * s) + Math.sin(na + 1.6) * sw,
        ];
      }
      // A curtain of frilled arms from the middle.
      const s = frac(p.b * 53.3);
      const fa = frac(p.b * 4.1) * TAU + s * 1.5 + t * 0.15;
      const rr = 0.8 * k * (1 + 0.6 * Math.sin(s * 18 + fa * 3));
      return [c[0] + Math.cos(fa) * rr, c[1] - H * 0.6 - s * 5 * k, c[2] + Math.sin(fa) * rr];
    }
    case 3: {
      const R = 1.7 * k * (1 - 0.2 * pull);
      const H = 2.4 * k * (1 + 0.1 * pull);
      if (p.d < 0.45) return dome(c, R, H, v, ang, true);
      if (p.d < 0.52) return dome(c, R, H, 1, a, true);
      // Four corners, four thin tentacles from each.
      const n = Math.floor(frac(p.b * 16) * 16);
      const ca = Math.PI / 4 + Math.floor(n / 4) * (Math.PI / 2) + ((n % 4) - 1.5) * 0.12;
      const s = frac(p.b * 97.1);
      const corner = R * 0.85 * Math.SQRT2 * (1 + 0.2 * s);
      const sway = Math.sin(s * 5 - t * 1.4 + n + j) * 0.4 * s * k;
      return [
        c[0] + Math.cos(ca) * corner + Math.cos(ca + 1.6) * sway,
        c[1] - H - s * 8 * k,
        c[2] + Math.sin(ca) * corner + Math.sin(ca + 1.6) * sway,
      ];
    }
    default: {
      // An oval body turning slowly, eight rows of combs on it.
      const rx = 1.3 * k;
      const ry = 2.2 * k;
      const spin = t * 0.3 + j;
      const comb = p.d >= 0.6;
      const vv = comb ? 0.1 + 0.8 * frac(p.b * 37.3) : frac(p.b * 7.3);
      const aa = comb ? (Math.floor(frac(p.b * 8) * 8) / 8) * TAU + spin : ang + spin;
      const out = comb ? 1.06 : 1;
      return [
        c[0] + Math.cos(aa) * rx * Math.sin(Math.PI * vv) * out,
        c[1] - ry * (1 - Math.cos(Math.PI * vv)),
        c[2] + Math.sin(aa) * rx * Math.sin(Math.PI * vv) * out,
      ];
    }
  }
}

/** A rainbow hue, 0 to 1 round the wheel. */
const rainbow = (h: number): RGB => [
  0.5 + 0.5 * Math.cos(TAU * h),
  0.5 + 0.5 * Math.cos(TAU * (h - 1 / 3)),
  0.5 + 0.5 * Math.cos(TAU * (h - 2 / 3)),
];

/** A grain's colour on a jellyfish of kinds 1 to 4. */
function kindJellyColour(p: Particle, pull: number, twinkle: number, edge: number, t: number): RGB {
  const glow = (0.55 + 0.45 * pull) * edge;
  switch (jellyKind) {
    case 1:
      if (p.d < 0.45) return scale([0.75, 0.85, 1], 0.28 * glow);
      if (p.d < 0.53) return scale([0.85, 0.95, 1], 0.6 * glow * twinkle);
      if (p.d < 0.75) return scale([0.8, 0.9, 1], 0.32 * twinkle * edge);
      return scale([1, 0.55, 0.85], 0.75 * glow);
    case 2:
      if (p.d < 0.3) return scale([1, 0.4, 0.25], 0.42 * glow);
      if (p.d < 0.36) return scale([1, 0.6, 0.35], 0.7 * glow * twinkle);
      if (p.d < 0.85) return scale([1, 0.62, 0.3], 0.28 * twinkle * edge);
      return scale([0.95, 0.35, 0.3], 0.5 * edge);
    case 3:
      if (p.d < 0.45) return scale([0.6, 0.9, 1], 0.24 * glow);
      if (p.d < 0.52) return scale([0.7, 1, 1], 0.65 * glow * twinkle);
      return scale([0.75, 0.95, 1], 0.34 * twinkle * edge);
    default: {
      if (p.d < 0.6) return scale([0.55, 0.75, 1], 0.18 * edge);
      // Light running down each row of combs, broken into rainbow colours.
      const row = Math.floor(frac(p.b * 8) * 8);
      const vv = frac(p.b * 37.3);
      return scale(rainbow(frac(vv * 1.5 - 0.8 * t + row * 0.08)), 0.7 * twinkle * edge);
    }
  }
}

function jellyPoint(p: Particle, t: number): Vec3 {
  if (p.c < 0.1) return snowAt(p, t, [0, 0, 0], 60, 44);
  const j = Math.floor(p.a * jellyNow().count);
  const { c, k } = kindTop(j, t);
  return jellyKind === 0
    ? jellyAt(c, k, pulseOf(j, t), p, t, j)
    : kindJellyAt(c, k, jellyPull(j, t), p, t, j);
}

/* ---------- 8. Reef: a channel swum through as the corals grow ---------- */

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

const REEF_SECONDS = (PHASES.find((p) => p.id === 'reef') as OceanPhase).duration;
const swum = (u: number) => SPEED * u * REEF_SECONDS;
const ahead = (z0: number, s: number) => wrap(z0 - s, LOOP) - BEHIND;
/*
 * 2026-11-11: "in reef I want to see the corals blooming and the fish in a
 * shoal, not in a tornado swarm". The corals grow up in plain view as the eye
 * comes, and burst into bloom as it passes them.
 */
const grownAt = (d: number) => 0.04 + 0.96 * smooth((50 - d) / 34);
const bloomAt = (d: number) => smooth((24 - d) / 14);
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

/** Where the reef's shoal leads at time t, from a point a little ahead of the eye: weaving down the channel. */
const reefWeave = (t: number): Vec3 => [
  5 * Math.sin(0.22 * t),
  2 + 1.2 * Math.sin(0.35 * t),
  3 * Math.cos(0.2 * t),
];

/** Reef fish j: its place and heading, the shoal swimming on down the channel ahead of the eye. */
export function reefFish(j: number, s: number, t: number): { c: Vec3; f: Vec3 } {
  // Each fish follows the weave a moment behind the ones ahead, so turns run through the shoal.
  const lag = 2 * hash(j, 118);
  const w = reefWeave(t - lag);
  const n = reefWeave(t - lag + 0.05);
  const f = norm([(n[0] - w[0]) / 0.05, (n[1] - w[1]) / 0.05, (n[2] - w[2]) / 0.05 - SPEED]);
  const side = norm(cross(f, [0, 1, 0]));
  const up = cross(side, f);
  const ox = (hash(j, 119) - 0.5) * 7 + 0.3 * Math.sin(0.7 * t + j);
  const oy = (hash(j, 120) - 0.5) * 3;
  const back = 6 * hash(j, 122);
  const c = add(add(add([w[0], EYE_H + w[1], -s - 22 + w[2]], side, ox), up, oy), f, -back);
  return { c, f };
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
      // A shoal swimming on down the channel ahead, all one way.
      const j = Math.floor(p.a * REEF_FISH);
      const { c, f } = reefFish(j, s, t);
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
      const q = coralLocal(colony, p, grownAt(d), t, reefRole(p) === 'polyp', bloomAt(d));
      return { pos: [slot.x + q[0] * slot.size, q[1] * slot.size, -s - d + q[2] * slot.size], d };
    }
  }
}

/* ---------- where every grain is ---------- */

/** Where particle p is in piece k's own form, `u` through it, at chapter time t. */
function form(k: number, p: Particle, u: number, t: number): Vec3 {
  switch (PHASES[k]?.id) {
    case 'coral':
      return coralPoint(p, Math.max(u, 0), t);
    case 'fans':
      return fanPoint(p, Math.max(u, 0), t);
    case 'tables':
      return tablePoint(p, Math.max(u, 0), t);
    case 'fish-pulse':
      return pulsePoint(p, t);
    case 'shoal':
      return shoalPoint(p, u, t);
    case 'sardines':
      return smallPoint(p, u, t);
    case 'jellyfish':
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
const GARDENS = new Set(['coral', 'fans', 'tables', 'fish-pulse']);

/** How far grain p has come from the ball of stars into piece k's form, `u` through it. */
export function arrival(k: number, p: Particle, u: number): number {
  // Gardens grow up from the sand, so their grains arrive sooner.
  const order = GARDENS.has(PHASES[k]?.id ?? '') ? 0.6 * p.b : p.b;
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
  switch (PHASES[k]?.id) {
    case 'coral':
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
    case 'fans':
    case 'tables':
    case 'fish-pulse': {
      const role = PHASES[k]?.id === 'fish-pulse' ? pulseRole(p) : coralRole(p);
      if (role === 'floor') return scale(SAND, 0.18);
      if (role === 'snow') return scale(SNOW, 0.35 * twinkle);
      if (role === 'shaft') return scale(SHAFT, 0.18 * (0.4 + 0.6 * hash(p.i, 85)));
      if (role === 'fish') return clownColour(p, twinkle);
      if (role === 'hunter') {
        // Blue along the back, silver on the belly.
        return scale(mix(SILVER, DEEP_BLUE, 0.5 + 0.5 * Math.sin(p.d * TAU)), 0.4 * twinkle);
      }
      const tones =
        PHASES[k]?.id === 'fans'
          ? FAN_TONES
          : PHASES[k]?.id === 'tables'
            ? TABLE_TONES
            : HOME_TONES;
      const tone = tones[Math.floor(p.a * tones.length * 0.999)] as RGB;
      return role === 'polyp'
        ? scale(mix(tone, [1, 1, 0.9], 0.35), 0.85 * twinkle)
        : scale(tone, 0.6 * twinkle);
    }
    case 'shoal':
      if (shoalRole(p) !== 'snow') return shoalColour(p, twinkle);
      return isLeader(p) && steer.w > 0
        ? mix(scale(SNOW, 0.3 * twinkle), scale(YELLOW_FISH, 0.5), steer.w)
        : scale(SNOW, 0.3 * twinkle);
    case 'sardines': {
      if (p.c < 0.08) return scale(SNOW, 0.3 * twinkle);
      // All blue, a paler flash whenever a fish's side turns toward the light.
      const j = Math.floor(p.a * SMALL_FISH);
      const { f } = smallFish(j, u, t);
      const flash = Math.abs(f[0] * 0.6 + f[2] * 0.8) ** 6;
      const tone = mix(mix(DEEP_BLUE, BLUE_FISH, hash(j, 99)), LIGHT_BLUE, flash);
      return scale(tone, 0.2 + 0.5 * flash);
    }
    case 'jellyfish': {
      if (p.c < 0.1) return scale(SNOW, 0.3 * twinkle);
      const j = Math.floor(p.a * jellyNow().count);
      const { edge } = kindTop(j, t);
      return jellyKind === 0
        ? jellyColour(p, pulseOf(j, t), twinkle, edge)
        : kindJellyColour(p, jellyPull(j, t), twinkle, edge, t);
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
          const bloom = bloomAt(d);
          return reefRole(p) === 'polyp'
            ? scale(mix(tone, [1, 1, 0.9], 0.35 - 0.15 * bloom), (0.85 + 0.5 * bloom) * twinkle * h)
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
  switch (PHASES[k]?.id) {
    case 'coral': {
      // Slowly round the garden, a little above the sand.
      const a = 0.4 + u * 1.2;
      return { eye: [Math.sin(a) * 44, FLOOR + 14, Math.cos(a) * 44], target: [0, FLOOR + 6, 0] };
    }
    case 'fans': {
      // Low among the fans, looking up their height.
      const a = 1.2 + u * 1;
      return { eye: [Math.sin(a) * 46, FLOOR + 10, Math.cos(a) * 46], target: [0, FLOOR + 8, 0] };
    }
    case 'tables': {
      // From above, to see the plates in their tiers.
      const a = 2 + u * 1;
      return { eye: [Math.sin(a) * 38, FLOOR + 22, Math.cos(a) * 38], target: [0, FLOOR + 3, 0] };
    }
    case 'fish-pulse': {
      // Before the open side of the half ring and a little above it, swinging gently: the coral stays still, the fish move.
      const a = PULSE_VIEW + 0.3 * Math.sin(t * 0.05);
      return { eye: [Math.sin(a) * 30, FLOOR + 17, Math.cos(a) * 30], target: [0, FLOOR + 5, 0] };
    }
    case 'shoal': {
      // Beside the shoal, keeping it in view as it loops.
      const { pace, view } = kindNow();
      const c = shoalCentre(t * pace);
      const a = t * 0.04;
      const loop: Eye = {
        eye: [
          c[0] * 0.4 + Math.sin(a) * 40 * view,
          c[1] + 4 * view,
          c[2] * 0.4 + Math.cos(a) * 40 * view,
        ],
        target: [c[0] * 0.6, c[1], c[2] * 0.6],
      };
      if (steer.w <= 0) return loop;
      // Held still while the cursor leads, so the water stays where the hand is.
      const held: Eye = { eye: [0, 6 * view, 52 * view], target: [0, 0, 0] };
      return {
        eye: lerp3(loop.eye, held.eye, smooth(steer.w)),
        target: lerp3(loop.target, held.target, smooth(steer.w)),
      };
    }
    case 'sardines':
      return { eye: [Math.sin(t * 0.05) * 12, 8, 44], target: [0, 0, 0] };
    case 'jellyfish':
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

/* ---------- pills: the shoal's kinds, the small fish's swarms, the jellyfish's kinds ---------- */

const VARIANTS = new Map<string, { label: string; names: string[]; set: (i: number) => void }>([
  ['shoal', { label: 'Shoal', names: SHOAL_NAMES, set: setShoalKind }],
  ['sardines', { label: 'Swarm', names: SWARM_NAMES, set: setSwarm }],
  ['jellyfish', { label: 'Jellyfish', names: JELLY_NAMES, set: setJellyKind }],
]);
const variantsOf = (k: number) => VARIANTS.get(PHASES[k]?.id ?? '');
export const hasVariants = (k: number) => variantsOf(k) !== undefined;
export const variantNames = (k: number) => variantsOf(k)?.names ?? [];
export const variantLabel = (k: number) => variantsOf(k)?.label ?? '';
/** Look i on piece k; with no piece, as in the Journey, every piece back to its first. */
export function setVariant(i: number, k?: number) {
  if (k === undefined) for (const v of VARIANTS.values()) v.set(0);
  else variantsOf(k)?.set(i);
}
