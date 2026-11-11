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
  {
    id: 'swim',
    // Shark Sim (2026-11-11: "call it shark simulator"); the id stays 'swim'.
    name: 'Shark Sim',
    line: 'You are the hammerhead, or any fish you pick. Keys only: A and D turn, W and S rise and sink, E or Shift speeds up, Q or X slows, Space boosts, B bites. Boost up through the surface to fly. Three seas: the coral forest, open water full of shoals, and the deep.',
    // The first of the freedom lines below; on its own the piece goes through them all.
    words: [
      'From this hour I ordain myself loos’d of limits and imaginary lines,',
      '— Walt Whitman',
    ],
    duration: 40,
    glow: 1,
    size: 0.85,
  },
];

/*
 * FREEDOM (2026-11-11): "give me really deep quotes about freedom as I
 * navigate through the games, not just random stuff". While you play the
 * Shark Sim, one line at a time, each with its author: public-domain writers
 * only, quoted as first published (Rousseau in G. D. H. Cole's 1913
 * translation), a line or two of each.
 */
export const FREEDOM: { text: string; by: string }[] = [
  {
    text: 'From this hour I ordain myself loos’d of limits and imaginary lines,',
    by: 'Walt Whitman',
  },
  { text: 'Man is born free; and everywhere he is in chains.', by: 'Jean-Jacques Rousseau' },
  {
    text: 'Let him step to the music which he hears, however measured or far away.',
    by: 'Henry David Thoreau',
  },
  { text: 'I am no bird; and no net ensnares me', by: 'Charlotte Brontë' },
  {
    text: 'Nothing is at last sacred but the integrity of your own mind.',
    by: 'Ralph Waldo Emerson',
  },
  {
    text: 'In landlessness alone resides the highest truth, shoreless, indefinite as God',
    by: 'Herman Melville',
  },
  { text: 'Where the mind is without fear and the head is held high', by: 'Rabindranath Tagore' },
  {
    text: 'I was not born to be forced. I will breathe after my own fashion.',
    by: 'Henry David Thoreau',
  },
  { text: 'If there is no struggle there is no progress.', by: 'Frederick Douglass' },
  { text: 'I too am not a bit tamed, I too am untranslatable,', by: 'Walt Whitman' },
  { text: 'Trust thyself: every heart vibrates to that iron string.', by: 'Ralph Waldo Emerson' },
  {
    text: 'Into that heaven of freedom, my Father, let my country awake.',
    by: 'Rabindranath Tagore',
  },
];
/** Seconds each freedom line stays. */
export const QUOTE_SECONDS = 16;
/** The freedom line shown `s` seconds into the Shark Sim, its author's line under it, and how far it has come in (0..1). */
export function freedomAt(s: number): { lines: string[]; shown: number } {
  const n = Math.floor(Math.max(0, s) / QUOTE_SECONDS);
  const q = FREEDOM[n % FREEDOM.length] as { text: string; by: string };
  const u = Math.max(0, s) / QUOTE_SECONDS - n;
  return {
    lines: [q.text, `— ${q.by}`],
    shown: smooth((u - 0.06) / 0.08) * smooth((0.94 - u) / 0.08),
  };
}

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
  '#ffd27a',
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

/*
 * CORAL COLOURS (2026-11-11): "option to make all corals warm colours no green
 * and blue. or option to make all corals golden and warm. can be activated".
 * A button beside the speeds steps through Natural, Warm (reds, oranges,
 * pinks and ambers, no green, no blue) and Gold, on every piece with corals.
 */
export const CORAL_MODES = ['Natural corals', 'Warm corals', 'Gold corals'];
const WARM_TONES: RGB[] = [
  [1, 0.35, 0.3],
  [1, 0.55, 0.22],
  [1, 0.42, 0.62],
  [1, 0.7, 0.28],
  [0.95, 0.28, 0.42],
  [1, 0.6, 0.45],
  [0.88, 0.22, 0.2],
];
const GOLD_TONES: RGB[] = [
  [1, 0.78, 0.32],
  [1, 0.68, 0.22],
  [0.95, 0.84, 0.5],
  [1, 0.62, 0.2],
  [0.92, 0.72, 0.36],
  [1, 0.86, 0.45],
  [0.85, 0.6, 0.25],
];
let coralMode = 0;
/** Which colours the corals wear: set by the button, natural in the Journey. */
export function setCoralMode(i: number) {
  coralMode = CORAL_MODES[i] ? i : 0;
}
/** A coral's tone in the colours picked: its own, or the warm or gold one at its place `k` in its palette. */
function paint(tone: RGB, k: number): RGB {
  if (coralMode === 0) return tone;
  const set = coralMode === 1 ? WARM_TONES : GOLD_TONES;
  return set[k % set.length] as RGB;
}
/** The pale the polyps open to: cream, a warmer cream when the corals are warm or gold. */
const polypWhite = (): RGB => (coralMode === 0 ? [1, 1, 0.9] : [1, 0.93, 0.78]);
const WITH_CORALS = new Set(['coral', 'fans', 'tables', 'fish-pulse', 'reef', 'swim']);
export const hasCoralModes = (k: number) => WITH_CORALS.has(PHASES[k]?.id ?? '');

/*
 * FISH COLOURS (2026-11-11): "ability to make all fish in blue-like tones, so
 * it becomes more aesthetically unified, or all fish in reddish colours, other
 * options". A second button steps through Natural, Blues, Reds, Gold and
 * Silver, on every piece with fish. Each fish keeps its own light and its
 * markings (dark bands stay dark, pale bellies pale); only the hue changes,
 * a little different from fish to fish so a school still shimmers. The
 * jellyfish, whales and squid keep their own colours.
 */
export const FISH_MODES = ['Natural fish', 'Blue fish', 'Red fish', 'Gold fish', 'Silver fish'];
/** Each family's dark, middle and pale tone. */
const FISH_SETS: [RGB, RGB, RGB][] = [
  [
    [0.12, 0.3, 1],
    [0.3, 0.68, 1],
    [0.72, 0.9, 1],
  ],
  [
    [0.9, 0.1, 0.16],
    [1, 0.36, 0.26],
    [1, 0.72, 0.62],
  ],
  [
    [1, 0.6, 0.12],
    [1, 0.78, 0.3],
    [1, 0.93, 0.66],
  ],
  [
    [0.5, 0.58, 0.68],
    [0.78, 0.84, 0.92],
    [0.96, 0.97, 1],
  ],
];
let fishMode = 0;
/** Which colours the fish wear: set by the button, natural in the Journey. */
export function setFishMode(i: number) {
  fishMode = FISH_MODES[i] ? i : 0;
}
/**
 * A fish's colour `c` in the colours picked: its own, or the family's tone at the same light, from
 * the dark tone to the middle one as fish `k` varies, and toward the pale one where it was pale.
 */
export function fishTint(c: RGB, k = 0): RGB {
  if (fishMode === 0) return c;
  const lit = Math.max(c[0], c[1], c[2]);
  if (lit < 1e-6) return c;
  const [dark, middle, pale] = FISH_SETS[fishMode - 1] as [RGB, RGB, RGB];
  const white = Math.min(c[0], c[1], c[2]) / lit;
  const tone = mix(mix(dark, middle, 0.3 + 0.7 * frac(k * 0.618 + 0.2)), pale, white ** 2);
  return scale(tone, lit / Math.max(tone[0], tone[1], tone[2]));
}
const WITH_FISH = new Set(['fish-pulse', 'shoal', 'sardines', 'reef', 'swim']);
export const hasFishModes = (k: number) => WITH_FISH.has(PHASES[k]?.id ?? '');

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

/*
 * 2026-11-11: "coral garden: don't do those balls of lights at the start, just
 * start with corals growing from nothingness, and make them grow more, slower
 * as they get bigger". Each colony grows over most of the piece, quick at
 * first and slowing as it gets big, and stays dark until it has begun.
 */
const GARDEN_SCALE = 1.3;
/** How grown garden colony k is, u through the piece. */
export function gardenGrowth(k: number, u: number): number {
  const x = Math.max(0, Math.min(1, (u - 0.03 * k) / 0.75));
  return 0.02 + 0.98 * (1 - (1 - x) ** 2.6);
}
/**
 * How much of a colony shows: nothing while it is still a knot, then light growing with its size, so
 * the grains crowded on a young coral never glare.
 */
const gardenSeen = (g: number) => smooth((g - 0.03) / 0.12) * Math.min(1, 1.3 * g ** 1.7);

function coralPoint(p: Particle, u: number, t: number): Vec3 {
  const role = coralRole(p);
  if (role === 'floor' || role === 'snow' || role === 'shaft') return bedPoint(role, p, t);
  const k = Math.floor(p.a * COLONIES);
  const c = corals()[k] as Colony;
  const q = coralLocal(c, p, gardenGrowth(k, u), t, role === 'polyp');
  return add(c.at, q, GARDEN_SCALE);
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
/*
 * A second garden for Fish pulse (2026-11-11: "fish pulse with only red corals and warm yellow
 * small fish, and the blue one going around changed for a hammer shark", "and all these corals
 * share one root, on a rock made of star points").
 */
export const PULSE_NAMES = ['Clownfish', 'Red garden'];
let pulseKind = 0;
/** Which garden Fish pulse shows: set by the pills, the clownfish in the Journey. */
export function setPulseKind(i: number) {
  pulseKind = PULSE_NAMES[i] ? i : 0;
}
const ROCK_H = 3;
let rooted: Colony | null = null;
/** One red coral, every branch from one root, standing on the rock. */
export function rootCoral(): Colony {
  if (rooted) return rooted;
  const out: number[][] = [];
  grow3(seeded(150), [0, 0, 0], [0, 1, 0], 2.6, 0.9, 7, 0, [], out);
  rooted = { at: [0, FLOOR + ROCK_H - 0.4, 0], routes: out.map(resample3), flat: false, yaw: 0.3 };
  return rooted;
}
/** The rock: a low lumpy boulder of star points the root grips. */
function rockPoint(p: Particle): Vec3 {
  const d = fibonacciSphere(p.i % 613, 613);
  const lump = 1 + 0.18 * Math.sin(5 * d[0] + 3 * d[2]) + 0.12 * Math.sin(7 * d[1] + 2 * d[0]);
  const r = 5.2 * lump * (0.92 + 0.08 * p.b);
  return [d[0] * r, FLOOR + Math.max(0, d[1]) * ROCK_H * lump, d[2] * r * 0.85];
}
const RED_TONES: RGB[] = [
  [1, 0.2, 0.16],
  [0.92, 0.1, 0.18],
  [1, 0.32, 0.22],
];
/** The colonies the fish live in, in the garden shown now. */
const pulseHomes = (): Colony[] => (pulseKind === 1 ? [rootCoral()] : homeCorals());

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
  const homes = pulseHomes();
  const c = homes[j % homes.length] as Colony;
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

type PulseRole = 'floor' | 'snow' | 'shaft' | 'polyp' | 'coral' | 'rock' | 'hunter' | 'fish';
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
            ? pulseKind === 1 && p.c < 0.3
              ? 'rock'
              : 'coral'
            : p.c < 0.66
              ? 'hunter'
              : 'fish';

function pulsePoint(p: Particle, t: number): Vec3 {
  const role = pulseRole(p);
  if (role === 'floor' || role === 'snow' || role === 'shaft') return bedPoint(role, p, t);
  if (role === 'fish') {
    const j = Math.floor(p.a * CLOWNS);
    const { c, f } = clownFish(j, t);
    return fishAt(c, f, pulseKind === 1 ? 0.85 : 1.2, p, t, j);
  }
  if (role === 'hunter') {
    const { c, f } = hunterAt(t);
    if (pulseKind === 1) return kindFishAt(SHOAL_KINDS[3] as ShoalKind, c, f, 6, p, t, 0);
    return fishAt(c, f, 4.5, p, t * 0.6, 0);
  }
  if (role === 'rock') return rockPoint(p);
  const homes = pulseHomes();
  const c = homes[Math.floor(p.a * homes.length)] as Colony;
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

/*
 * SHARK BODY (2026-11-11): "improve shark movement animation so when i move
 * left or right it reflects on its body in a natural liquid sinusoidal
 * dynamic". Your own fish bends into its turns: the body curves along the arc
 * it swims, a wave runs from head to tail that grows with how hard it turns,
 * and the beat quickens as it goes faster.
 */
/** How your fish's body moves: `bend` how hard it turns (right positive), `wave` how strong its beat. */
export type Sway = { bend: number; wave: number };
const STILL: Sway = { bend: 0, wave: 1 };
/** The sideways sway at s along a body `len` long (head 0, tail 1), on top of the beat `wag`. */
const swayAt = (sway: Sway, s: number, len: number, wag: number, t: number) =>
  sway.wave * wag + sway.bend * len * (0.28 * s * s + 0.07 * s * Math.sin(5.5 * t - 7 * s));

/** Grain p on a fish at c heading f, `len` long; `j` sets its own beat. */
function fishAt(
  c: Vec3,
  f: Vec3,
  len: number,
  p: Particle,
  t: number,
  j: number,
  sway: Sway = STILL,
): Vec3 {
  const side = norm(cross(f, [0, 1, 0]));
  const up = cross(side, f);
  // Head at s = 0, tail at s = 1; the last grains fan out as the tail fin.
  const s = p.b;
  const body = 0.2 * len * Math.sin(Math.PI * Math.min(1, s ** 0.7 * 1.05));
  const fin = s > 0.82 ? ((s - 0.82) / 0.18) * 0.22 * len : 0;
  const wag = swayAt(sway, s, len, 0.12 * len * Math.sin(9 * t + j * 1.3 - 6 * s) * s * s, t);
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
/** A moment of a path: where, which way, and (for your own) how hard bubbles stream from you then. */
type Trail = { t: number; c: Vec3; f: Vec3; k?: number };
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
function trailAt(t: number, tr: Trail[] = steer.trail): { c: Vec3; f: Vec3 } {
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

/** How far back from the head the jaw reaches, as a share of the length, and which grains are its lower half. */
const JAW = 0.3;
const isLowerJaw = (p: Particle) => Math.sin(p.d * TAU) < 0.15;
/** Whether grain p lies on the body of a fish of this kind (not a fin, the tail, the hammer or a bill). */
const onBody = (kind: ShoalKind, p: Particle) => {
  const part = hash(p.i, 151);
  const tailTop = kind.tail === 'crescent' ? ((kind.lobes ?? [0.26])[0] > 0.5 ? 0.42 : 0.34) : 0.25;
  return part >= tailTop;
};

/** Grain p on a fish of this kind at c heading f: body, fins, and a hammer or a sword at the head. */
function kindFishAt(
  kind: ShoalKind,
  c: Vec3,
  f: Vec3,
  len: number,
  p: Particle,
  t: number,
  j: number,
  gape = 0,
  sway: Sway = STILL,
  wing = 0,
): Vec3 {
  const side = norm(cross(f, [0, 1, 0]));
  const up = cross(side, f);
  if (wing > 0 && kind.dorsal >= 0.15) {
    // Flying (2026-11-11: "open wings and become like a flying fish shark"): the side fins, and a
    // share of the body's grains, spread out into two long wings, swept back a little, tilted up,
    // shivering in the wind; they fold back as `wing` falls.
    const part = hash(p.i, 151);
    const fin = part >= 0.18 && part < 0.25;
    if (fin || (onBody(kind, p) && hash(p.i, 153) < 0.15)) {
      const folded = kindFishAt(kind, c, f, len, p, t, j, gape, sway, 0);
      const w = hash(p.i, 152);
      const sd = p.b < 0.5 ? -1 : 1;
      const chord = len * (0.3 - 0.2 * w);
      const root = kind.depth * len * Math.sin(Math.PI * Math.min(1, 0.3 ** 0.7 * 1.05));
      const back = len * 0.23 - 0.18 * len * w - chord * p.d;
      const lat = sd * (root + 0.8 * len * w);
      const ver = 0.08 * len * w + 0.015 * len * Math.sin(40 * t + w * 3) * w;
      const spread: Vec3 = [
        c[0] + f[0] * back + side[0] * lat + up[0] * ver,
        c[1] + f[1] * back + side[1] * lat + up[1] * ver,
        c[2] + f[2] * back + side[2] * lat + up[2] * ver,
      ];
      return lerp3(folded, spread, wing);
    }
  }
  const wagAt = (s: number) =>
    swayAt(sway, s, len, 0.12 * len * Math.sin(9 * kind.wag * t + j * 1.3 - 6 * s) * s * s, t);
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
  // A hunter's jaw (2026-11-11: "when it bites it needs to open its mouth"): the lower half of the
  // head hinges down wide from the back of the jaw, the snout lifting a little, so the mouth gapes.
  const hinge = gape > 0 && s < JAW ? 1 - s / JAW : 0;
  const jaw = hinge > 0 ? (isLowerJaw(p) ? -0.26 : 0.06) * gape * len * hinge : 0;
  return put(
    len * (0.5 - s),
    Math.cos(a) * bodyAt(s) * (kind.wide ?? 1) + wagAt(s),
    Math.sin(a) * (bodyAt(s) * kind.tall + fin) + jaw,
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
function shoalColour(
  p: Particle,
  twinkle: number,
  ki = shoalKind,
  jj?: number,
  lead = steer.w,
): RGB {
  const kind = SHOAL_KINDS[ki] as ShoalKind;
  const j = jj ?? Math.floor(p.a * kind.count);
  if (ki === 0) {
    const blue = mix(DEEP_BLUE, BLUE_FISH, 0.5 + 0.5 * Math.sin(p.d * TAU));
    // The one yellow fish, unless the cursor's own yellow fish is leading.
    const yellow = j === 0 ? 1 - lead : 0;
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
  // All five mixed, glowing red and warm orange like paper lanterns (2026-11-11: "make one with all
  // the jellyfish mixes but all red or warm orange, so it feels like lampions").
  { name: 'Lanterns', count: 15, size: 1, rise: 0.6, beat: 0.8 },
];
const LANTERNS = 5;
export const JELLY_NAMES = JELLY_KINDS.map((k) => k.name);
let jellyKind = 0;
/** Which jellyfish drift: set by the pills, the glowing ones in the Journey. */
export function setJellyKind(i: number) {
  jellyKind = JELLY_KINDS[i] ? i : 0;
}
const jellyNow = () => JELLY_KINDS[jellyKind] as JellyKind;
/** Which of the five shapes jellyfish j has: its kind's, or among the lanterns each in turn. */
const jellyForm = (j: number) => (jellyKind === LANTERNS ? j % LANTERNS : jellyKind);
const jellyPull = (j: number, t: number) => {
  const { beat } = JELLY_KINDS[jellyForm(j)] as JellyKind;
  return beat ? pulseOf(j, t * beat * (jellyKind === LANTERNS ? 0.8 : 1)) : 0;
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
      y - JELLY_SPAN / 2 + ((JELLY_KINDS[jellyForm(j)] as JellyKind).size > 1.2 ? 3 : 0),
      (hash(j, 106) - 0.5) * 22,
    ],
    k: (JELLY_KINDS[jellyForm(j)] as JellyKind).size * (0.8 + 0.4 * hash(j, 104)),
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
function kindJellyAt(
  c: Vec3,
  k: number,
  pull: number,
  p: Particle,
  t: number,
  j: number,
  form = jellyKind,
): Vec3 {
  const a = p.b * TAU;
  const v = Math.sqrt(frac(p.b * 7.3));
  const ang = frac(p.b * 13.7) * TAU;
  switch (form) {
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
function kindJellyColour(
  p: Particle,
  pull: number,
  twinkle: number,
  edge: number,
  t: number,
  form = jellyKind,
): RGB {
  const glow = (0.55 + 0.45 * pull) * edge;
  switch (form) {
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

/** A lantern's light: the shape's own brightness, in red to warm orange, lit warmer at its rim. */
function lanternColour(j: number, base: RGB, rim: boolean): RGB {
  const lit = Math.max(base[0], base[1], base[2]);
  const warm = mix([1, 0.2, 0.08], [1, 0.52, 0.12], hash(j, 107));
  return scale(rim ? mix(warm, [1, 0.78, 0.4], 0.5) : warm, lit * 1.2);
}

function jellyPoint(p: Particle, t: number): Vec3 {
  if (p.c < 0.1) return snowAt(p, t, [0, 0, 0], 60, 44);
  const j = Math.floor(p.a * jellyNow().count);
  const { c, k } = kindTop(j, t);
  const form = jellyForm(j);
  return form === 0
    ? jellyAt(c, k, pulseOf(j, t), p, t, j)
    : kindJellyAt(c, k, jellyPull(j, t), p, t, j, form);
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

/* ---------- 9. Shark Sim: your own fish, through three seas ---------- */
/*
 * 2026-11-11: "after reef create a game where I can choose my fish, or a school
 * of fish, and move through the corals, or above them where it feels a bit
 * like stars and schools of fish are around me". The world wraps round the
 * swimmer, so the sea never ends; above the reef the drifting snow turns to stars.
 *
 * SHARK SIM (2026-11-11): "ws to go up and down in ocean swim. call it shark
 * simulator. even i fother fish available. make hammer head default". W and S
 * rise and sink, E (or Shift) and Q set the pace; the hammerhead comes first,
 * the other fish stay in the pills.
 */

type SwimKind = {
  name: string;
  kind: number | null;
  count: number;
  len: number;
  cam: number;
  /** A hunter: it eats the small fish it reaches, and they scatter from it. */
  eats?: boolean;
  /** All in gold: the fish the treasures unlock. */
  gold?: boolean;
};
const SWIM_KINDS: SwimKind[] = [
  { name: 'Hammerhead', kind: 3, count: 1, len: 9, cam: 20, eats: true },
  { name: 'Swordfish', kind: 4, count: 1, len: 8, cam: 18, eats: true },
  { name: 'Clownfish', kind: null, count: 1, len: 1.4, cam: 8 },
  { name: 'Yellow tang', kind: 1, count: 1, len: 2.2, cam: 9 },
  { name: 'Silver school', kind: 0, count: 24, len: 2.2, cam: 16 },
  { name: 'Bannerfish school', kind: 10, count: 12, len: 2, cam: 14 },
  // Unlocked by finding treasures; not in the pills before.
  { name: 'Golden hammerhead', kind: 3, count: 1, len: 9, cam: 20, eats: true, gold: true },
];
export const SWIM_NAMES = SWIM_KINDS.map((k) => k.name);
/** The fish in the pills now: the golden hammerhead only once enough treasures are found. */
export const swimNames = () => (unlocked() ? SWIM_NAMES : SWIM_NAMES.slice(0, -1));
let swimKind = 0;
/** Which fish you swim as: set by the pills, the hammerhead in the Journey. */
export function setSwimKind(i: number) {
  swimKind = i < swimNames().length && SWIM_KINDS[i] ? i : 0;
}
const swimNow = () => SWIM_KINDS[swimKind] as SwimKind;
export const hasGame = (k: number) => PHASES[k]?.id === 'swim';

/*
 * SEAS (2026-11-11): "create diff ocean environments. as we had said
 * yesterday. one with swarms shoals bancs de poissons tout outour quand on
 * monte au dessus plus haut. aim is to make it beautiful. and then deep ocean
 * with animals from deep as said yesterday. so the coral forest is just one
 * environment". Three seas, picked by a second row of pills: the coral
 * forest; open water, lit from the surface, great shoals turning all round
 * you at every height; and the deep, a canyon dropping from the reef past
 * mantas, squid and lantern fish to a rare giant squid and the glowing vents.
 */
export const SEA_NAMES = ['Coral forest', 'Open water', 'Deep ocean'];
let sea = 0;
/** Which sea you swim in: set by the pills, the coral forest in the Journey. */
export function setSea(i: number) {
  const next = SEA_NAMES[i] ? i : 0;
  // A new sea: you take over again from the wander, where it is in that sea.
  if (next !== sea) {
    swim.on = false;
    dashOff.fill(0);
    dashVel.fill(0);
  }
  sea = next;
}
export const hasSeas = hasGame;

/** Swimming speed in units a second, cruising; E doubles it, Q slows to a drift. */
export const SWIM_SPEED = 4.5;
const SWIM_W = 84;
const SKY_TOP = FLOOR + 72;
/** The surface in the Shark Sim: your middle keeps just under it, unless you leap out. */
const WATER = SKY_TOP + 2;
/** The floor of the abyss, where the vents stand. */
export const DEEP_FLOOR = FLOOR - 96;
/** The deep ocean's canyon: a strip of the wrapping field, its walls dropping from the reef to the vents. */
const CANYON: [number, number] = [21, 63];
const inCanyon = (x: number) => {
  const w = wrap(x, SWIM_W);
  return w > CANYON[0] && w < CANYON[1];
};
/** How low you can go at x: the sand, or in the deep ocean's canyon the floor of the abyss. */
const floorAt = (x: number) => (sea === 2 && inCanyon(x) ? DEEP_FLOOR : FLOOR);
const heading3 = (yaw: number, pitch: number): Vec3 => [
  -Math.sin(yaw) * Math.cos(pitch),
  Math.sin(pitch),
  -Math.cos(yaw) * Math.cos(pitch),
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const swim = {
  on: false,
  pos: [0, FLOOR + 6, 0] as Vec3,
  yaw: 0,
  pitch: 0,
  speed: SWIM_SPEED,
  trail: [] as Trail[],
  /** How hard you are turning, eased, right positive: what bends the body. */
  bend: 0,
  /** What is left in the boost bar, 0 to 1. */
  boost: 1,
  /** How close the nearest small fish is to your mouth: the jaw opens a little as you close in. */
  near: Number.POSITIVE_INFINITY,
  /** How calm you are, 0 to 1: it grows while you cruise without boosting or biting. */
  calm: 0,
  /** Out of the water: flying, your upward speed, and how far your side fins are spread as wings (0..1). */
  air: false,
  vy: 0,
  wing: 0,
  /** When you last came back into the water, nose first: the bubbles stream from then. */
  enterAt: -1e9,
  /** Inside the coral tunnel, and how far the eye has come in close behind you for it (0..1). */
  tube: false,
  tubeIn: 0,
  /** The time of the last frame, whether Space boosted in it, whether B was held, and when a superboost ends. */
  t: 0,
  boosting: false,
  bHeld: false,
  superUntil: -1e9,
  /** Every fish you have eaten this visit, for the gauge. */
  eaten: 0,
};

/*
 * CALM (2026-11-11, from the Shark Sim plan the user approved: "no need for
 * day and night. but do the rest"): the longer you cruise without boosting or
 * biting, the calmer you grow, twelve seconds to full, quicker when slow, and
 * a soft warm glow grows on you. Past the trust mark small fish come close
 * instead of fleeing, and a calm hunter does not bite; a boost breaks the calm.
 */
export const CALM_SECONDS = 12;
export const CALM_TRUST = 0.6;
export const calmNow = () => swim.calm;

/*
 * BOOST (2026-11-11): "press space for boost. with a booster bar. when u eat
 * fish u win boost back". Space held sends you on at three times the cruise
 * while the bar lasts (three seconds from full); every fish eaten wins back a
 * share of it.
 */
export const BOOST_PACE = 3.2;
export const BOOST_SECONDS = 3;
export const BOOST_PER_FISH = 0.15;
/** The boost bar, 0 to 1, for the player to show. */
export const boostLeft = () => swim.boost;

/**
 * With no one at the controls (the Journey): over the reef and up into the stars and down again; in
 * open water high among the shoals; in the deep, slowly down the canyon to the vents and back up.
 */
function autopilot(t: number): { c: Vec3; f: Vec3 } {
  const at = (tt: number): Vec3 =>
    sea === 1
      ? [18 * Math.sin(0.05 * tt), FLOOR + 28 + 12 * Math.sin(0.04 * tt), -3.5 * tt]
      : sea === 2
        ? [
            42 + 12 * Math.sin(0.05 * tt),
            FLOOR + 6 - 98 * (0.5 - 0.5 * Math.cos(0.025 * tt)),
            -3.5 * tt,
          ]
        : [18 * Math.sin(0.05 * tt), FLOOR + 9 + 9 * (0.5 - 0.5 * Math.cos(0.06 * tt)), -3.5 * tt];
  const c = at(t);
  const n = at(t + 0.05);
  return { c, f: norm([n[0] - c[0], n[1] - c[1], n[2] - c[2]]) };
}

/*
 * FLIGHT (2026-11-11): "ability to jump above water. as u go up u can press
 * boost, swim super fast, and u fly above water, open wings and become like a
 * flying fish shark. flying shark, and then dive again with wings closed like
 * a lil torpedo, with water bubble effects around you". Under the surface you
 * stop as before; boosting up into it (W held, or already climbing, and going
 * fast) you leap out in a splash. In the air your side fins open into wings
 * and you glide on a long arc, W holding you up a little longer, Space keeping
 * your speed, A and D banking round; S folds the wings and you dive, nose
 * first, back in with a second splash and a trail of bubbles behind you.
 */
/** How hard the air pulls you down, how slowly spread wings let you sink, how quickly the air slows you. */
export const AIR_G = 16;
const GLIDE_SINK = 2;
const AIR_DRAG = 0.12;
/** The least angle you leave the water at. */
const LEAP_ANGLE = 0.5;
/** Whether you are out of the water, flying, and how far your wings are spread (0..1). */
export const airborne = () => swim.air;
export const wingsOpen = () => swim.wing;

/**
 * The controls, each frame: whether you are swimming, the keys held, and how far the piece's time
 * moved. Keys only, never the mouse (2026-11-11: "controls should not be with mouse, only ASDWX").
 */
export function setSwim(active: boolean, keys: string[], dt: number, t: number) {
  swim.t = t;
  if (!active) {
    swim.on = false;
    swim.air = false;
    swim.wing = 0;
    swim.tube = false;
    swim.boosting = false;
    swim.bHeld = false;
    react(dt, t);
    return;
  }
  if (!swim.on) {
    // Taking over from the wander where it is.
    const a = autopilot(t);
    swim.pos = a.c;
    swim.yaw = Math.atan2(-a.f[0], -a.f[2]);
    swim.pitch = Math.asin(Math.max(-1, Math.min(1, a.f[1])));
    swim.speed = SWIM_SPEED;
    swim.trail = [];
    swim.on = true;
    swim.air = false;
    swim.vy = 0;
    swim.wing = 0;
    swim.tube = sea === 0 && tubeOf(swim.pos).inside;
  }
  const held = (...names: string[]) => names.some((n) => keys.includes(n));
  const turn = (held('a', 'arrowleft') ? -1.3 : 0) + (held('d', 'arrowright') ? 1.3 : 0);
  // In the air you bank round wider.
  swim.yaw -= turn * dt * (swim.air ? 0.7 : 1);
  // The body follows the turn a moment late, so it flows into the bend and out of it.
  swim.bend += (Math.max(-1.2, Math.min(1.2, turn)) - swim.bend) * (1 - Math.exp(-3.5 * dt));
  // A superboost (a calamari eaten) is faster still, and the bar does not run down while it lasts.
  const superOn = t < swim.superUntil;
  const boosting = held(' ') && (swim.boost > 0 || superOn);
  if (boosting && !superOn) swim.boost = Math.max(0, swim.boost - dt / BOOST_SECONDS);
  swim.boosting = boosting;
  const boostPace = superOn ? SUPER_PACE : BOOST_PACE;
  const rise = held('w', 'arrowup');
  const sink = held('s', 'arrowdown');
  const was = swim.pos;
  let pace = 1;
  if (swim.air) {
    // Wings out, unless S folds them for the dive.
    swim.wing += ((sink ? 0 : 1) - swim.wing) * (1 - Math.exp(-6 * dt));
    swim.speed = boosting
      ? swim.speed + (SWIM_SPEED * boostPace - swim.speed) * (1 - Math.exp(-2 * dt))
      : swim.speed * Math.exp(-AIR_DRAG * dt);
    // Spread wings lift you, more the faster you go; folded, you fall, and S pulls you down.
    const lift =
      AIR_G * swim.wing * (rise ? 0.88 : 0.75) * Math.min(1, swim.speed / (2 * SWIM_SPEED));
    swim.vy += (lift - AIR_G - (sink ? 10 : 0)) * dt;
    if (swim.vy < -GLIDE_SINK)
      swim.vy += (-GLIDE_SINK - swim.vy) * (1 - Math.exp(-2.5 * swim.wing * dt));
    const h = heading3(swim.yaw, 0);
    swim.pos = [
      was[0] + h[0] * swim.speed * dt,
      was[1] + swim.vy * dt,
      was[2] + h[2] * swim.speed * dt,
    ];
    // Pointing the way you fly: up as you leave, level as you glide, nose down in the dive.
    swim.pitch = Math.atan2(swim.vy, swim.speed);
    if (swim.pos[1] < SKY_TOP && swim.vy < 0) {
      // Back in, nose first, at the speed you fell.
      swim.air = false;
      swim.speed = Math.min(SWIM_SPEED * SUPER_PACE, Math.hypot(swim.speed, swim.vy));
      swim.enterAt = t;
      splash(swim.pos, t, Math.min(1.3, 0.5 + Math.abs(swim.vy) / 12));
    }
  } else {
    // Under water the fins fold back against the body.
    swim.wing *= Math.exp(-8 * dt);
    // W and S rise and sink (2026-11-11: "ws to go up and down"), as the arrows up and down do.
    let tilt = (rise ? 0.8 : 0) - (sink ? 0.8 : 0);
    if (swim.pos[1] <= floorAt(swim.pos[0]) + 1.6 && tilt < 0) tilt = 0;
    // At the surface you rise no further, unless you come up fast on a boost: then you leap out.
    const leap =
      boosting &&
      swim.pos[1] >= SKY_TOP - 0.6 &&
      (rise || swim.pitch > 0.2) &&
      swim.speed > 1.6 * SWIM_SPEED;
    if (swim.pos[1] >= SKY_TOP && tilt > 0 && !leap) tilt = 0;
    swim.pitch += (tilt - swim.pitch) * (1 - Math.exp(-2.2 * dt));
    pace = boosting ? boostPace : held('e', 'shift') ? 2.1 : held('q', 'x') ? 0.35 : 1;
    // A boost kicks in quickly; otherwise the pace eases.
    swim.speed += (SWIM_SPEED * pace - swim.speed) * (1 - Math.exp((boosting ? -5 : -1.5) * dt));
    if (leap) {
      // Out at full boost, whatever the speed you had reached.
      const a = Math.max(swim.pitch, LEAP_ANGLE);
      const out = Math.max(swim.speed, 0.9 * SWIM_SPEED * boostPace);
      swim.air = true;
      swim.vy = out * Math.sin(a);
      swim.speed = out * Math.cos(a);
      swim.pos = [was[0], SKY_TOP + 0.01, was[2]];
      swim.pitch = a;
      splash(swim.pos, t, 1);
    } else {
      const f = heading3(swim.yaw, swim.pitch);
      swim.pos = add(swim.pos, f, swim.speed * dt);
      // A current, once you are in it, carries you along.
      swim.pos = add(swim.pos, currentPull(swim.pos), dt);
      // Below the reef in the deep ocean the canyon's walls hold you: you slide along them.
      if (sea === 2 && swim.pos[1] < FLOOR + 1.5 && !inCanyon(swim.pos[0])) swim.pos[0] = was[0];
      swim.pos[1] = Math.max(floorAt(swim.pos[0]) + 1.5, Math.min(SKY_TOP, swim.pos[1]));
      confine(was);
    }
  }
  // Calm grows while you cruise, quicker when slow; a boost breaks it at once.
  if (boosting) swim.calm = 0;
  else
    swim.calm = Math.min(1, swim.calm + (dt / CALM_SECONDS) * (pace < 1 ? 2 : pace > 1 ? 0.5 : 1));
  swim.tubeIn += ((swim.tube ? 1 : 0) - swim.tubeIn) * (1 - Math.exp(-2 * dt));
  swim.trail.push({ t, c: swim.pos, f: heading3(swim.yaw, swim.pitch), k: bubbling(t) });
  while (swim.trail.length > 2 && (swim.trail[0] as Trail).t < t - 4) swim.trail.shift();
  if (swimNow().eats) {
    startle(dt, t);
    // B bites (2026-11-11: "u need to press a button to eat fish, not automatic"), once a press.
    const b = held('b');
    if (b && !swim.bHeld) biteNow(t);
    swim.bHeld = b;
  }
  calamariStep(dt, t);
  collect(t);
  react(dt, t);
}

/** You: where you are at time t and which way you swim. */
export function swimmer(t: number): { c: Vec3; f: Vec3 } {
  return swim.on ? { c: swim.pos, f: heading3(swim.yaw, swim.pitch) } : autopilot(t);
}
/** How your own fish's body moves now: bent into the turn, its beat stronger the harder it turns and the faster it goes. */
export function swimSway(): Sway {
  if (!swim.on) return STILL;
  const fast = Math.max(0, Math.min(1, swim.speed / SWIM_SPEED - 1));
  return { bend: swim.bend, wave: 1 + 1.4 * Math.min(1, Math.abs(swim.bend)) + 0.6 * fast };
}
/** Where your mouth is: the front of your head. */
const mouthAt = (t: number): Vec3 => {
  const { c, f } = swimmer(t);
  return add(c, f, swimNow().len * 0.5);
};

/** A world point brought round to the copy of it nearest the swimmer, on a field `w` wide. */
const near = (base: Vec3, c: Vec3, w: number): Vec3 => [
  c[0] + wrap(base[0] - c[0] + w / 2, w) - w / 2,
  base[1],
  c[2] + wrap(base[2] - c[2] + w / 2, w) - w / 2,
];
/** How far up from the sand the swimmer is, 0 among the corals to 1 high in the open water. */
const altitude = (c: Vec3) => smooth((c[1] - FLOOR - 12) / 14);
/** How much sunlight reaches down to height y: all of it above the reef, none 70 below. */
const daylight = (y: number) => smooth((y - FLOOR + 70) / 70);

/* ---------- the small fish you hunt, eaten and coming back ---------- */
/*
 * EATING (2026-11-11): "add ability for shark to eat small fish with 3
 * animations for it o give flow and variety". A hunter that reaches a school
 * bites, by turns a lunge, a sweep and a rise from below; the fish it takes
 * shrink into its mouth, the rest scatter round it and close up behind, and
 * each one eaten comes back a while later, so the sea never empties.
 */

const SCHOOLS = 5;
const SCHOOL_FISH = 60;
const BAIT_BALLS = 8;
const BAIT_FISH = 360;
const LANTERN_GROUPS = 15;
const LANTERN_FISH = 150;
/** Every small fish you can eat: the schools in every sea, the open water's shoals, the deep's lantern fish. */
export const PREY = SCHOOL_FISH + BAIT_FISH + LANTERN_FISH;
const NEVER = -1e9;
const eatenAt = new Float64Array(PREY).fill(NEVER);
/** Seconds a fish takes to vanish into the mouth, and before it comes back. */
export const GULP = 0.45;
export const RESPAWN = 14;
/** Whether prey fish i swims in the sea you are in. */
const preyIn = (i: number) =>
  i < SCHOOL_FISH ||
  (sea === 1 ? i < SCHOOL_FISH + BAIT_FISH : sea === 2 && i >= SCHOOL_FISH + BAIT_FISH);

/** How much of prey fish i is there at time t: whole, shrinking into the mouth, gone, then growing back. */
export function preyShown(i: number, t: number): number {
  const d = t - (eatenAt[i] ?? NEVER);
  if (d < 0) return 1;
  if (d < GULP) return 1 - d / GULP;
  if (d < RESPAWN) return 0;
  return smooth((d - RESPAWN) / 2.5);
}

/** The three bites, taken by turns, and the one under way. */
export const BITE_NAMES = ['Lunge', 'Sweep', 'Rise'];
export const BITE = 0.8;
/** A bite on a boost: one long lunge, surging further and reaching further. */
export const LUNGE = 1.25;
const bite = { at: NEVER, style: 0, n: 0, long: false };
/** The bite under way at time t, and how far through it (0..1); null between bites. */
export function biteAt(t: number): { style: number; k: number; long: boolean } | null {
  const d = t - bite.at;
  const len = bite.long ? LUNGE : BITE;
  return d >= 0 && d < len ? { style: bite.style, k: d / len, long: bite.long } : null;
}

/** Where a school's fish is before it scatters: each school a swirling ball, drifting, at your height. */
function schoolRaw(i: number, tt: number, me: Vec3): Vec3 {
  const s = i % SCHOOLS;
  const j = Math.floor(i / SCHOOLS);
  const way = hash(s, 180) * TAU;
  const a = (s % 2 ? -1 : 1) * 0.5 * tt + j * 0.9;
  const r = 1.6 + 2.2 * hash(i, 165);
  // In the deep they keep to the canyon, swimming along it.
  const x =
    sea === 2
      ? CANYON[0] + 5 + 32 * hash(s, 181)
      : hash(s, 181) * SWIM_W - Math.sin(way) * 1.4 * tt;
  return [
    x + Math.cos(a) * r,
    me[1] + 2 + 2.5 * (s % 3) + 1.2 * Math.sin(0.2 * tt + s) + (hash(i, 166) - 0.5) * 2.4,
    hash(s, 182) * SWIM_W - Math.cos(way) * 1.4 * tt + Math.sin(a) * r,
  ];
}

/*
 * The open water's shoals (bancs de poissons): eight great balls of small
 * fish at every height, each turning about its own middle, a wheel or a
 * tornado, breathing in and out as it drifts.
 */
function baitRaw(j: number, tt: number): Vec3 {
  const b = j % BAIT_BALLS;
  const n = Math.floor(j / BAIT_BALLS);
  const R = 5 + 2.5 * hash(b, 185);
  const spin = (b % 2 ? -1 : 1) * (0.32 + 0.12 * hash(b, 186));
  const v = hash(j, 187) - 0.5;
  const tornado = b % 3 === 2;
  const r =
    R *
    (tornado ? 0.3 + 0.7 * (v + 0.5) : 0.55 + 0.45 * hash(j, 188)) *
    (1 + 0.1 * Math.sin(0.4 * tt + b));
  const a = spin * tt + n * GOLDEN_ANGLE;
  return [
    hash(b, 189) * SWIM_W + 4 * Math.sin(0.05 * tt + b) + Math.cos(a) * r,
    FLOOR + 14 + 34 * hash(b, 190) + 2 * Math.sin(0.1 * tt + b) + v * R * (tornado ? 2.2 : 0.9),
    hash(b, 191) * SWIM_W + 4 * Math.cos(0.05 * tt + b) + Math.sin(a) * r,
  ];
}

/** The deep's lantern fish: small groups down the canyon, in the twilight below the reef. */
function lanternRaw(j: number, tt: number): Vec3 {
  const g = j % LANTERN_GROUPS;
  const n = Math.floor(j / LANTERN_GROUPS);
  return [
    CANYON[0] + 4 + 34 * hash(g, 192) + (hash(j, 193) - 0.5) * 6 + Math.sin(0.13 * tt + n),
    FLOOR - 12 - 43 * hash(g, 194) + (hash(j, 195) - 0.5) * 4 + 0.5 * Math.sin(0.3 * tt + j),
    hash(g, 196) * SWIM_W - 0.8 * tt + (hash(j, 197) - 0.5) * 6 + Math.cos(0.11 * tt + n),
  ];
}

function preyRaw(i: number, tt: number, me: Vec3): Vec3 {
  if (i < SCHOOL_FISH) return schoolRaw(i, tt, me);
  if (i < SCHOOL_FISH + BAIT_FISH) return baitRaw(i - SCHOOL_FISH, tt);
  return lanternRaw(i - SCHOOL_FISH - BAIT_FISH, tt);
}
const preyLen = (i: number) =>
  i < SCHOOL_FISH
    ? (i % SCHOOLS) % 3 === 2
      ? 1.6
      : 1.1
    : i < SCHOOL_FISH + BAIT_FISH
      ? 0.85
      : 0.7;

/**
 * Small fish part round a hunter: pushed away from the nearest point of its body, more the closer
 * they are, and bursting wide as it rises through them. They close up again once it has passed.
 */
function scatter(c: Vec3, t: number): Vec3 {
  const kind = swimNow();
  if (!kind.eats) return c;
  const { c: s, f } = swimmer(t);
  const half = kind.len / 2;
  const q = add(s, f, Math.max(-half, Math.min(half, dot(sub(c, s), f))));
  const d = sub(c, q);
  const dist = Math.hypot(d[0], d[1], d[2]);
  const b = biteAt(t);
  const burst = b && b.style === 2 ? 1 + 0.8 * Math.sin(Math.PI * b.k) : 1;
  const R = (0.35 * kind.len + 3) * burst;
  if (dist >= R || dist < 1e-6) return c;
  return add(c, d, ((1 - dist / R) ** 2 * R * 0.6) / dist);
}

/*
 * DASH (2026-11-11: "do an animation where small fish swim away faster when u
 * get close"). Each small fish carries its own flight: as the hunter nears,
 * it is thrown away from the nearest point of its body, harder the closer it
 * is, turning to swim the way it flees; a spring then draws it back to its
 * school, so it darts off and comes round again. Fleeing fish are harder to
 * catch: the boost is how you run them down.
 */
/*
 * FLIGHT OF THE SMALL FISH (2026-11-11: "the fish run away faster when u get
 * close in beautiful motion"). They notice you sooner and flee harder; each
 * school turns away together, every fish carried by the school's own flight
 * as well as its own, so even the far side of the ball wheels away; and they
 * curve round you as they go, the way a school opens like a fountain round a
 * hunter and closes again behind it.
 */
const FLIGHT = 3;
const dashOff = new Float64Array(PREY * FLIGHT);
const dashVel = new Float64Array(PREY * FLIGHT);
export const DASH = 40;
/** How far from the hunter's body small fish start to flee. */
const fearOf = (len: number) => 0.6 * len + 8;
/** The school each small fish belongs to, for fleeing together. */
const GROUPS = SCHOOLS + BAIT_BALLS + LANTERN_GROUPS;
const groupOf = (i: number) =>
  i < SCHOOL_FISH
    ? i % SCHOOLS
    : i < SCHOOL_FISH + BAIT_FISH
      ? SCHOOLS + ((i - SCHOOL_FISH) % BAIT_BALLS)
      : SCHOOLS + BAIT_BALLS + ((i - SCHOOL_FISH - BAIT_FISH) % LANTERN_GROUPS);
const pushes = new Float64Array(PREY * FLIGHT);
const gaps = new Float64Array(PREY);
const groupPush = new Float64Array(GROUPS * FLIGHT);
const groupCount = new Float64Array(GROUPS);

/** Where prey fish i swims at time t before it flees or parts: brought round to you, above the floor. */
function preyBase(i: number, t: number, me: Vec3): { c: Vec3; f: Vec3 } {
  const a = preyRaw(i, t, me);
  const b = preyRaw(i, t + 0.05, me);
  const c = near(a, me, SWIM_W);
  c[1] = Math.max(floorAt(c[0]) + 1, c[1]);
  return { c, f: norm(sub(b, a)) };
}

/** Each frame while you hunt: every small fish near you dashes away, and every one away swings home. */
function startle(dt: number, t: number) {
  if (dt <= 0) return;
  const kind = swimNow();
  const { c: s, f } = swimmer(t);
  const mouth = add(s, f, kind.len / 2);
  const half = kind.len / 2;
  const R = fearOf(kind.len);
  const keep = Math.exp(-2 * dt);
  // Calm, you are trusted: fish within twice the fear distance drift in to a ring just off your body.
  const trusted = swim.calm >= CALM_TRUST;
  let nearest = Number.POSITIVE_INFINITY;
  groupPush.fill(0);
  groupCount.fill(0);
  // First each fish's own fright, and each school's together.
  for (let i = 0; i < PREY; i++) {
    const o = i * FLIGHT;
    pushes.fill(0, o, o + FLIGHT);
    gaps[i] = Number.POSITIVE_INFINITY;
    if (!preyIn(i)) {
      dashOff.fill(0, o, o + FLIGHT);
      dashVel.fill(0, o, o + FLIGHT);
      continue;
    }
    const { c } = preyBase(i, t, s);
    const at: Vec3 = [
      c[0] + (dashOff[o] ?? 0),
      c[1] + (dashOff[o + 1] ?? 0),
      c[2] + (dashOff[o + 2] ?? 0),
    ];
    if (preyShown(i, t) >= 1)
      nearest = Math.min(nearest, Math.hypot(at[0] - mouth[0], at[1] - mouth[1], at[2] - mouth[2]));
    const q = add(s, f, Math.max(-half, Math.min(half, dot(sub(at, s), f))));
    const d = sub(at, q);
    const dist = Math.hypot(d[0], d[1], d[2]);
    gaps[i] = dist;
    if (dist < 1e-6) continue;
    if (trusted) {
      const k = dist < 2 * R ? (-3 * (dist - 0.6 * R)) / dist : 0;
      for (let x = 0; x < FLIGHT; x++) pushes[o + x] = k * (d[x] as number);
      continue;
    }
    if (dist >= R) continue;
    const k = (DASH * (1 - dist / R) ** 1.3) / dist;
    // Away from you, and curving round you, each school its own way round.
    const round = cross(f, scale(d as RGB, 1 / dist) as Vec3);
    const way = groupOf(i) % 2 ? 1 : -1;
    const g = groupOf(i) * FLIGHT;
    for (let x = 0; x < FLIGHT; x++) {
      const v = k * (d[x] as number) + way * 0.55 * k * dist * (round[x] as number);
      pushes[o + x] = v;
      groupPush[g + x] = (groupPush[g + x] ?? 0) + v;
    }
    groupCount[groupOf(i)] = (groupCount[groupOf(i)] ?? 0) + 1;
  }
  // Then each fish swims its own fright and its school's, the school's reaching a little beyond.
  for (let i = 0; i < PREY; i++) {
    if (!preyIn(i)) continue;
    const o = i * FLIGHT;
    const g = groupOf(i);
    const n = groupCount[g] ?? 0;
    const share = n > 0 && !trusted ? 0.6 * smooth((2.2 * R - (gaps[i] ?? 0)) / R) : 0;
    for (let x = 0; x < FLIGHT; x++) {
      const off = dashOff[o + x] ?? 0;
      const push =
        (pushes[o + x] ?? 0) + (share * (groupPush[g * FLIGHT + x] ?? 0)) / Math.max(1, n);
      let vel = ((dashVel[o + x] ?? 0) + (push - 2.2 * off) * dt) * keep;
      // Never flung too far: it stays a fish of its school.
      if (Math.abs(off + vel * dt) > 16) vel = 0;
      dashVel[o + x] = vel;
      dashOff[o + x] = off + vel * dt;
    }
  }
  swim.near = nearest;
}

/** Prey fish i at time t: where it is, which way it swims, how long, and how much of it is there. */
export function preyAt(i: number, t: number): { c: Vec3; f: Vec3; len: number; shown: number } {
  const me = swimmer(t).c;
  const { c: base, f: way } = preyBase(i, t, me);
  const o = i * FLIGHT;
  const vel: Vec3 = [dashVel[o] ?? 0, dashVel[o + 1] ?? 0, dashVel[o + 2] ?? 0];
  // Fleeing, it turns to swim the way it is thrown.
  const f = norm(add(way, vel, 0.4));
  let c = scatter(add(base, [dashOff[o] ?? 0, dashOff[o + 1] ?? 0, dashOff[o + 2] ?? 0]), t);
  const shown = preyShown(i, t);
  const d = t - (eatenAt[i] ?? NEVER);
  // Being eaten: drawn into the mouth as it shrinks.
  if (d >= 0 && d < GULP) c = lerp3(c, mouthAt(t), smooth(d / GULP));
  return { c, f, len: preyLen(i), shown };
}

/**
 * A hunter's mouth at `mouth`, time t: if no bite is under way and a small fish is within two reaches,
 * the next of the three bites begins and takes the nearest (a lunge one, a sweep up to three, a rise
 * two). Returns how many it took.
 */
export function eatNear(mouth: Vec3, t: number, reach = 1.2 + 0.18 * swimNow().len): number {
  if (biteAt(t)) return 0;
  // A calm hunter does not bite of itself.
  if (swim.calm >= CALM_TRUST) return 0;
  const style = bite.n % 3;
  const got = takeNear(mouth, t, reach, MOST[style] as number);
  if (got) startBite(t, style, false);
  return got;
}
/** How many fish each bite can take: a lunge one, a sweep three, a rise two. */
const MOST = [1, 3, 2];
/** The nearest small fish within two reaches of `mouth`, up to `most` of them, taken; how many. */
function takeNear(mouth: Vec3, t: number, reach: number, most: number): number {
  const close: { i: number; d: number }[] = [];
  for (let i = 0; i < PREY; i++) {
    if (!preyIn(i) || preyShown(i, t) < 1) continue;
    const { c } = preyAt(i, t);
    const d = Math.hypot(c[0] - mouth[0], c[1] - mouth[1], c[2] - mouth[2]);
    if (d < 2 * reach) close.push({ i, d });
  }
  if (!close.length) return 0;
  close.sort((x, y) => x.d - y.d);
  const taken = close.slice(0, most);
  for (const { i } of taken) eatenAt[i] = t;
  // Every fish eaten wins back some boost.
  swim.boost = Math.min(1, swim.boost + BOOST_PER_FISH * taken.length);
  swim.eaten += taken.length;
  return taken.length;
}
/** A bite begins: its style, whether it is the long lunge; it breaks the calm. */
function startBite(t: number, style: number, long: boolean) {
  bite.at = t;
  bite.style = style;
  bite.long = long;
  // The long lunge comes between the three, not in their turn.
  if (!long) bite.n++;
  swim.calm = 0;
}

/*
 * BITE ON B (2026-11-11): "u can also use boost to bite. but u need to press a
 * button to eat fish, not automatic". B snaps the jaw, by turns the lunge, the
 * sweep and the rise, whether or not a fish is there; it takes what is within
 * reach of the mouth. On a boost, B is one long lunge instead: the body surges
 * twice as far, the mouth reaches nearly twice as wide, and it can take three.
 */
export function biteNow(t: number): number {
  const kind = swimNow();
  if (!kind.eats || biteAt(t)) return 0;
  const long = swim.boosting;
  const style = long ? 0 : bite.n % 3;
  startBite(t, style, long);
  const { f } = swimmer(t);
  const mouth = add(mouthAt(t), f, (long ? 0.4 : 0.15) * kind.len);
  const reach = (1.2 + 0.18 * kind.len) * (long ? 1.8 : 1.25);
  return (
    takeNear(mouth, t, reach, long ? 3 : (MOST[style] as number)) + eatCalamari(mouth, t, reach)
  );
}

/** How many fish you have eaten this visit. */
export const eatenCount = () => swim.eaten;

/** Every fish back, no bite under way: for a fresh start. */
export function resetPrey() {
  eatenAt.fill(NEVER);
  dashOff.fill(0);
  dashVel.fill(0);
  bite.at = NEVER;
  bite.n = 0;
  bite.long = false;
  swim.boost = 1;
  swim.calm = 0;
  swim.eaten = 0;
  swim.superUntil = NEVER;
  resetCalamari();
}

/** How fast prey fish i is fleeing, units a second: for the tests. */
export const dashSpeed = (i: number) =>
  Math.hypot(dashVel[i * FLIGHT] ?? 0, dashVel[i * FLIGHT + 1] ?? 0, dashVel[i * FLIGHT + 2] ?? 0);

/**
 * The hunter's body through a bite: where it is, which way it points, how wide its jaw. A lunge
 * surges forward and nods as the jaw snaps; a sweep whips the head to one side through the school
 * and back; a rise dips, then comes up from below, mouth open. The jaw opens wide, holds a beat and
 * snaps shut a little past halfway; the camera keeps to the steady path, so only the shark moves.
 */
function bitePose(c: Vec3, f: Vec3, len: number, t: number): { c: Vec3; f: Vec3; gape: number } {
  const b = biteAt(t);
  // Closing in on a fish the jaw already parts a little, ready.
  const ready = swim.on ? 0.3 * smooth((fearOf(len) - swim.near) / 6) : 0;
  if (!b) return { c, f, gape: ready };
  const { style, k } = b;
  const arc = Math.sin(Math.PI * k);
  // Wide open through the first half, held a beat, then snapped shut.
  const open = k < 0.45 ? smooth(k / 0.45) : k < 0.55 ? 1 : 1 - smooth((k - 0.55) / 0.1);
  const gape = Math.max(ready * (1 - smooth(k / 0.2)), open);
  if (style === 0)
    return {
      // The long lunge on a boost surges more than twice as far.
      c: add(c, f, (b.long ? 0.55 : 0.22) * len * arc),
      f: norm(add(f, [0, 1, 0], -0.25 * Math.sin(TAU * k))),
      gape,
    };
  if (style === 1) {
    const a = 0.7 * Math.sin(TAU * k) * (1 - 0.5 * k);
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    return { c, f: norm([f[0] * cs - f[2] * sn, f[1], f[0] * sn + f[2] * cs]), gape };
  }
  return {
    c: add(c, [0, 1, 0], len * (0.22 * arc - 0.12 * Math.sin(TAU * k))),
    f: norm(add(f, [0, 1, 0], 0.6 * arc)),
    gape,
  };
}

/** How wide your own fish's jaw is open at time t, 0 shut to 1 wide. */
export function gapeAt(t: number): number {
  const kind = swimNow();
  if (!kind.eats) return 0;
  const { c, f } = swimmer(t);
  return bitePose(c, f, kind.len, t).gape;
}

/* ---------- the deep: the drop-off, mantas, squid, the giant, the vents ---------- */

const MANTAS = 4;
const SQUIDS = 10;
const RIM_CORALS = 14;
const VENTS = 5;
const CANYON_MID = (CANYON[0] + CANYON[1]) / 2;

type DeepRole = 'rim' | 'manta' | 'squid' | 'giant' | 'vent';
const deepRole = (p: Particle): DeepRole => {
  const h = hash(p.i, 201);
  return h < 0.22 ? 'rim' : h < 0.42 ? 'manta' : h < 0.6 ? 'squid' : h < 0.74 ? 'giant' : 'vent';
};

/** Coral j on the lip of the drop-off: either side of the canyon, on the reef above it. */
function rimSlot(j: number): { at: Vec3; colony: number; size: number } {
  const out = 1.5 + 9 * hash(j, 203);
  return {
    at: [
      j % 2 ? CANYON[1] + out : CANYON[0] - out,
      FLOOR,
      ((j + hash(j, 204)) * SWIM_W) / RIM_CORALS,
    ],
    colony: Math.floor(hash(j, 205) * COLONIES),
    size: 0.8 + 0.6 * hash(j, 206),
  };
}

/** Grain p of a body at c heading f: `put` takes a place along it, across it and up from it. */
const frame = (c: Vec3, f: Vec3) => {
  const side = norm(cross(f, [0, 1, 0]));
  const up = cross(side, f);
  return (back: number, lat: number, ver: number): Vec3 => [
    c[0] + f[0] * back + side[0] * lat + up[0] * ver,
    c[1] + f[1] * back + side[1] * lat + up[1] * ver,
    c[2] + f[2] * back + side[2] * lat + up[2] * ver,
  ];
};

/** Manta m's path: slow loops just below the lip of the drop-off, each a little deeper than the last. */
const mantaPath = (m: number, tt: number): Vec3 => [
  CANYON_MID + 13 * Math.sin(0.045 * tt + m * 1.7),
  FLOOR - 7 - 5 * m + 2 * Math.sin(0.08 * tt + m),
  hash(m, 208) * SWIM_W - 2.2 * tt + 9 * Math.cos(0.035 * tt + m),
];

/*
 * A manta, our own: a wide diamond of wing, its leading edge swept back, the
 * tips rising and falling in a slow wave that runs out along each wing, two
 * horns curling ahead of the head and a thin whip of a tail.
 */
function mantaAt(m: number, p: Particle, t: number, me: Vec3): Vec3 {
  const tt = mantaClock(m, t);
  const a = mantaPath(m, tt);
  return mantaShape(frame(near(a, me, SWIM_W), norm(sub(mantaPath(m, tt + 0.05), a))), p, t, m);
}
/** Grain p of manta m's body, placed by `put`, `size` times the deep's mantas. */
function mantaShape(
  put: (back: number, lat: number, ver: number) => Vec3,
  p: Particle,
  t: number,
  m: number,
  size = 1,
): Vec3 {
  const L = 5.5 * size;
  const S = 11 * size;
  const part = hash(p.i, 209);
  const q = hash(p.i, 210);
  if (part < 0.08) return put(-L * 0.45 - 0.9 * L * q, 0.15 * q * Math.sin(3 * t + q * 6), 0);
  if (part < 0.13) return put(L * 0.5 + 0.5 * q, (p.b < 0.5 ? -1 : 1) * (0.6 - 0.2 * q), -0.15 * q);
  const u = p.b * 2 - 1;
  const au = Math.abs(u);
  const chord = L * (1 - au ** 1.4);
  const flap = 1.9 * au ** 1.6 * Math.sin(1.4 * t + m * 1.9 - au * 1.6);
  const thick = (hash(p.i, 211) - 0.5) * 0.35 * (1 - au);
  return put(L * 0.5 - 0.42 * L * au - chord * p.d, (u * S) / 2, flap + thick);
}

/**
 * A squid at c heading f, mantle first, `size` times a calamari: the mantle drawn in as it jets
 * (pull near 1), its fins rippling at the tip, eight arms opening and closing behind, two long
 * tentacles trailing with clubs at their ends.
 */
function squidAt(
  c: Vec3,
  f: Vec3,
  size: number,
  pull: number,
  p: Particle,
  t: number,
  j: number,
): Vec3 {
  const put = frame(c, f);
  const L = 2.4 * size;
  const A = 1.6 * size;
  const part = hash(p.i, 230);
  const q = hash(p.i, 231);
  if (part < 0.5) {
    const r = 0.34 * size * Math.sin(Math.PI * 0.5 * Math.min(1, q * 1.6)) * (1 - 0.2 * pull);
    const a = p.d * TAU;
    return put(L * (0.5 - q), Math.cos(a) * r, Math.sin(a) * r);
  }
  if (part < 0.62)
    return put(
      L * (0.38 - 0.3 * q),
      (p.b < 0.5 ? -1 : 1) * size * (0.25 + 0.45 * (1 - q) * p.d),
      0.1 * size * Math.sin(4 * t + q * 5 + j),
    );
  if (part < 0.9) {
    const arm = Math.floor(p.b * 8);
    const ang = (arm / 8) * TAU;
    const open = (0.15 + (0.12 + 0.25 * (1 - pull)) * q) * size;
    return put(
      -L * 0.5 - A * q,
      Math.cos(ang) * open,
      Math.sin(ang) * open + 0.08 * size * Math.sin(3 * t + q * 5 + arm),
    );
  }
  const T = 3 * size;
  const sd = p.b < 0.5 ? -1 : 1;
  const club = q > 0.85 ? 0.08 * size * Math.sin(p.d * TAU) : 0;
  return put(
    -L * 0.5 - T * q,
    sd * 0.12 * size + 0.25 * size * q * Math.sin(1.3 * t + j + q * 3) + club,
    0.2 * size * q * Math.cos(1.1 * t + j) + club,
  );
}

/** How the squid jet: a quick pull of the mantle, then a glide. */
const squidPull = (j: number, t: number) => Math.max(0, Math.sin(2.2 * t + j * 1.3)) ** 2;
/** Squid j of the group: drifting down the canyon in the twilight, each jet a surge forward. */
function squidOf(j: number, t: number, me: Vec3): { c: Vec3; f: Vec3 } {
  const path = (tt: number): Vec3 => [
    CANYON_MID + 8 * Math.sin(0.03 * tt) + (hash(j, 232) - 0.5) * 10,
    FLOOR - 30 + 4 * Math.sin(0.05 * tt) + (hash(j, 233) - 0.5) * 6,
    hash(j, 234) * 8 + 30 - 0.9 * tt,
  ];
  const a = path(t);
  const f = norm(sub(path(t + 0.05), a));
  const surge = 0.45 * Math.sin(2.2 * t + j * 1.3 - 0.8);
  return { c: near(add(a, f, surge), me, SWIM_W), f };
}

/** The giant squid's long cycle: hidden most of the time, it drifts out of the dark now and then. */
export const GIANT_CYCLE = 75;
export const giantSeen = (t: number) =>
  smooth((Math.sin((TAU * t) / GIANT_CYCLE + 1) - 0.55) / 0.3);
function giantOf(t: number, me: Vec3): { c: Vec3; f: Vec3 } {
  const path = (tt: number): Vec3 => [
    CANYON_MID + 6 * Math.sin(0.02 * tt),
    DEEP_FLOOR + 30 + 3 * Math.sin(0.03 * tt),
    10 - 0.6 * tt,
  ];
  const a = path(t);
  return { c: near(a, me, SWIM_W), f: norm(sub(path(t + 0.05), a)) };
}

/* ---------- calamari: a superboost, and ink in your eyes ---------- */
/*
 * CALAMARI (2026-11-11): "add some calamari. when u eat one u have a
 * superboost. but the calamari can spit ink on your screen and u can't see
 * (like in Mario Kart)". Six squid in every sea, each on its own slow round;
 * as you come near one it jets away mantle first, in quick pulls. Bite one
 * (B) and the boost bar fills and a superboost runs for five seconds: faster
 * than a boost, the bar not running down. But come close and now and then a
 * squid squirts its ink at you: a dark cloud bursts behind it, and blots of
 * ink cover the screen, holding a moment, then fading in a few seconds.
 */
export const CALAMARI = 6;
export const SUPER_SECONDS = 5;
export const SUPER_PACE = 4.4;
export const INK_SECONDS = 4.5;
/** Seconds before a squid can ink again, and before one eaten comes back. */
const INK_COOL = 12;
const CAL_RESPAWN = 20;
const calOff = new Float64Array(CALAMARI * 3);
const calVel = new Float64Array(CALAMARI * 3);
const calEatenAt = new Float64Array(CALAMARI).fill(NEVER);
const calInkAt = new Float64Array(CALAMARI).fill(NEVER);
const calInkPos: Vec3[] = Array.from({ length: CALAMARI }, () => [0, 0, 0] as Vec3);
let inkAt = NEVER;

/** Where calamari j goes before it flees: its own slow round on the field, at a height for the sea. */
function calamariBase(j: number, t: number, me: Vec3): { c: Vec3; f: Vec3 } {
  const path = (tt: number): Vec3 => [
    sea === 2
      ? CANYON[0] + 6 + 30 * hash(j, 320) + 4 * Math.sin(0.09 * tt + j)
      : hash(j, 320) * SWIM_W + 9 * Math.sin(0.06 * tt + j),
    (sea === 0
      ? FLOOR + 5 + 9 * hash(j, 321)
      : sea === 1
        ? FLOOR + 14 + 34 * hash(j, 321)
        : FLOOR - 8 - 34 * hash(j, 321)) +
      1.5 * Math.sin(0.3 * tt + j),
    hash(j, 322) * SWIM_W + 9 * Math.cos(0.05 * tt + j * 2) - 1.2 * tt,
  ];
  const a = path(t);
  return { c: near(a, me, SWIM_W), f: norm(sub(path(t + 0.05), a)) };
}
/** How much of calamari j is there: whole, drawn into your mouth, gone, then back. */
function calamariShown(j: number, t: number): number {
  const d = t - (calEatenAt[j] ?? NEVER);
  if (d < 0) return 1;
  if (d < GULP) return 1 - d / GULP;
  if (d < CAL_RESPAWN) return 0;
  return smooth((d - CAL_RESPAWN) / 2.5);
}
/** Calamari j at time t: where, which way (the way it flees, while it flees), and how much of it is there. */
export function calamariAt(j: number, t: number): { c: Vec3; f: Vec3; shown: number } {
  const { c, f } = calamariBase(j, t, swimmer(t).c);
  const o = j * 3;
  const vel: Vec3 = [calVel[o] ?? 0, calVel[o + 1] ?? 0, calVel[o + 2] ?? 0];
  let at = add(c, [calOff[o] ?? 0, calOff[o + 1] ?? 0, calOff[o + 2] ?? 0]);
  const d = t - (calEatenAt[j] ?? NEVER);
  if (d >= 0 && d < GULP) at = lerp3(at, mouthAt(t), smooth(d / GULP));
  const fast = Math.hypot(...vel);
  return { c: at, f: fast > 1 ? norm(add(f, vel, 0.3)) : f, shown: calamariShown(j, t) };
}

/** Each frame: every calamari near you jets away, mantle first, and now and then squirts its ink. */
function calamariStep(dt: number, t: number) {
  if (dt <= 0) return;
  const { c: s, f } = swimmer(t);
  const mouth = add(s, f, swimNow().len / 2);
  const keep = Math.exp(-1.6 * dt);
  for (let j = 0; j < CALAMARI; j++) {
    if (calamariShown(j, t) < 1) continue;
    const { c } = calamariAt(j, t);
    const d = sub(c, mouth);
    const dist = Math.max(0.5, Math.hypot(d[0], d[1], d[2]));
    // Quick pulls of the mantle: the push comes in beats.
    const jet = 0.35 + 0.65 * Math.max(0, Math.sin(9 * t + j * 2));
    const push = dist < 16 ? (30 * (1 - dist / 16) ** 1.2 * jet) / dist : 0;
    const o = j * 3;
    for (let x = 0; x < 3; x++) {
      const off = calOff[o + x] ?? 0;
      let vel = ((calVel[o + x] ?? 0) + (push * (d[x] as number) - 1.4 * off) * dt) * keep;
      if (Math.abs(off + vel * dt) > 22) vel = 0;
      calVel[o + x] = vel;
      calOff[o + x] = off + vel * dt;
    }
    // Close, and not lately: some squid ink, some do not.
    if (
      dist < 9 &&
      t - (calInkAt[j] ?? NEVER) > INK_COOL &&
      hash(j * 37 + Math.floor(t / INK_COOL), 323) < 0.65
    ) {
      calInkAt[j] = t;
      calInkPos[j] = c;
      inkAt = t;
    }
  }
}

/** A bite at `mouth`: any calamari within reach is eaten, filling the bar and starting a superboost. */
function eatCalamari(mouth: Vec3, t: number, reach: number): number {
  let n = 0;
  for (let j = 0; j < CALAMARI; j++) {
    if (calamariShown(j, t) < 1) continue;
    const { c } = calamariAt(j, t);
    if (Math.hypot(c[0] - mouth[0], c[1] - mouth[1], c[2] - mouth[2]) < 2 * reach + 1) {
      calEatenAt[j] = t;
      n++;
    }
  }
  if (n) {
    swim.boost = 1;
    swim.superUntil = t + SUPER_SECONDS;
    swim.eaten += n;
  }
  return n;
}
/** Whether a superboost is running now. */
export const superOn = () => swim.t < swim.superUntil;

/** How much ink covers the screen at time t, 0 to 1: splashed on at once, held, then fading. */
export function inkVeil(t = swim.t): number {
  const d = t - inkAt;
  if (d < 0 || d >= INK_SECONDS) return 0;
  if (d < 0.2) return d / 0.2;
  if (d < 2) return 1;
  return 1 - smooth((d - 2) / (INK_SECONDS - 2));
}

/** Every calamari back, no ink: for a fresh start. */
function resetCalamari() {
  calOff.fill(0);
  calVel.fill(0);
  calEatenAt.fill(NEVER);
  calInkAt.fill(NEVER);
  inkAt = NEVER;
}

/** Grain p of a calamari: its body, or, just after it inks, a cloud of ink spreading where it was. */
function calamariPoint(p: Particle, t: number, me: Vec3): Vec3 {
  const j = Math.floor(p.a * CALAMARI);
  const inked = t - (calInkAt[j] ?? NEVER);
  if (hash(p.i, 325) < 0.3 && inked >= 0 && inked < 3) {
    const d = fibonacciSphere(p.i % 71, 71);
    return add(
      near(calInkPos[j] as Vec3, me, SWIM_W),
      d,
      (0.6 + 2.6 * Math.sqrt(inked / 3)) * (0.6 + 0.4 * p.b),
    );
  }
  const { c, f, shown } = calamariAt(j, t);
  // Quicker pulls than the deep's slow squid: these are darting.
  return squidAt(c, f, 0.9 * Math.max(shown, 0.02), squidPull(j, 1.6 * t), p, t, j);
}
function calamariColour(p: Particle, t: number, twinkle: number): RGB {
  const j = Math.floor(p.a * CALAMARI);
  const inked = t - (calInkAt[j] ?? NEVER);
  if (hash(p.i, 325) < 0.3 && inked >= 0 && inked < 3)
    return scale([0.34, 0.27, 0.45], 0.2 * (1 - inked / 3) * twinkle);
  const shown = calamariShown(j, t);
  // Pale rose, the colour cells flickering, a blue spark at each arm's tip.
  const tip = hash(p.i, 230) >= 0.62 && hash(p.i, 231) > 0.9;
  if (tip) return scale(GLOW_BLUE, 0.6 * twinkle * shown);
  const flicker = 0.6 + 0.4 * Math.sin(5 * t + p.i * 0.7);
  return scale(mix([1, 0.5, 0.45], [1, 0.86, 0.8], 0.5 + 0.5 * flicker), 0.3 * twinkle * shown);
}

/* ---------- spray: splashes at the surface, bubbles behind you ---------- */

/** The last two splashes, where and when and how big; seconds a splash lasts. */
const splashes: { at: Vec3; t: number; k: number }[] = [];
export const SPLASH = 1.6;
function splash(at: Vec3, t: number, k: number) {
  splashes.unshift({ at: [at[0], WATER, at[2]], t, k });
  if (splashes.length > 2) splashes.length = 2;
}
/** When the last splash was: for the tests. */
export const lastSplash = () => splashes[0]?.t ?? NEVER;
/** How hard bubbles stream from you at time t: after you dive back in, on a superboost, on a boost, diving fast. */
function bubbling(t: number): number {
  if (swim.air) return 0;
  const dive = t >= swim.enterAt ? 1 - smooth((t - swim.enterAt) / 2.5) : 0;
  const diving = swim.pitch < -0.4 && swim.speed > 1.5 * SWIM_SPEED ? 0.5 : 0;
  return Math.max(dive, t < swim.superUntil ? 0.8 : 0, swim.boosting ? 0.4 : 0, diving);
}
/** How hard bubbles are streaming from you now: for the tests. */
export const bubblesNow = () => (swim.trail[swim.trail.length - 1] as Trail | undefined)?.k ?? 0;
const sprayMemo = { t: Number.NaN, on: false };
/** Whether any splash or bubbles show at time t: only then do the spray's grains leave the snow. */
function sprayOn(t: number): boolean {
  if (sprayMemo.t === t) return sprayMemo.on;
  let on = false;
  if (swim.on) {
    const last = splashes[0];
    on = !!last && t - last.t >= 0 && t - last.t < SPLASH;
    for (let n = swim.trail.length - 1; !on && n >= 0; n--) {
      const e = swim.trail[n] as Trail;
      if (e.t < t - 2.4) break;
      if ((e.k ?? 0) > 0.01) on = true;
    }
  }
  sprayMemo.t = t;
  sprayMemo.on = on;
  return on;
}
/** Your path at time t, with how hard it bubbled then: the nearest moment kept. */
function trailMoment(t: number): Trail | null {
  const tr = swim.trail;
  if (!tr.length) return null;
  let lo = 0;
  let hi = tr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((tr[mid] as Trail).t < t) lo = mid + 1;
    else hi = mid;
  }
  return tr[lo] as Trail;
}
/** A grain of spray: a drop of a splash, a ring spreading on the surface, or a bubble rising behind you; `k` how bright. */
function sprayAt(p: Particle, t: number): { pos: Vec3; k: number } {
  if (hash(p.i, 304) < 0.5) {
    const e = splashes[hash(p.i, 310) < 0.6 ? 0 : 1] ?? splashes[0];
    const tau = e ? t - e.t : -1;
    if (!e || tau < 0 || tau >= SPLASH) return { pos: [0, DEEP_FLOOR - 50, 0], k: 0 };
    const a = p.b * TAU;
    const fade = 1 - tau / SPLASH;
    if (hash(p.i, 311) < 0.3) {
      const r = 0.8 + 5.5 * e.k * Math.sqrt(tau / SPLASH);
      return { pos: [e.at[0] + Math.cos(a) * r, WATER + 0.05, e.at[2] + Math.sin(a) * r], k: fade };
    }
    // Drops thrown up and out, falling back to the surface.
    const v = (1.5 + 5 * hash(p.i, 312)) * e.k;
    const up = (4 + 8 * hash(p.i, 313)) * e.k;
    return {
      pos: [
        e.at[0] + Math.cos(a) * v * tau,
        Math.max(WATER, WATER + up * tau - 0.5 * AIR_G * tau * tau),
        e.at[2] + Math.sin(a) * v * tau,
      ],
      k: fade ** 1.5,
    };
  }
  // A bubble left behind you a moment ago, spreading and rising, until the surface.
  const lag = 2.2 * hash(p.i, 309);
  const m = trailMoment(t - lag);
  if (!m || !m.k) return { pos: [0, DEEP_FLOOR - 50, 0], k: 0 };
  const d = fibonacciSphere(p.i % 89, 89);
  const pos = add(add(m.c, m.f, -0.4 * swimNow().len), d, 0.3 + 1.2 * lag);
  pos[1] = Math.min(WATER - 0.1, pos[1] + 1.6 * lag + 0.2 * Math.sin(6 * t + p.i));
  return { pos, k: m.k * (1 - lag / 2.2) };
}

const ventBase = (v: number): Vec3 => [
  CANYON[0] + 8 + 26 * hash(v, 212),
  DEEP_FLOOR,
  ((v + 0.3 * hash(v, 213)) * SWIM_W) / VENTS,
];
const ventH = (v: number) => 6 + 7 * hash(v, 214);
type VentPart = 'chimney' | 'mat' | 'plume';
const ventPart = (p: Particle): VentPart => {
  const h = hash(p.i, 215);
  return h < 0.4 ? 'chimney' : h < 0.5 ? 'mat' : 'plume';
};
const PLUME = 18;
/** The vents on the floor of the abyss: rough chimneys, glowing mats round their feet, hot water rising. */
function ventAt(p: Particle, t: number, me: Vec3): Vec3 {
  const v = Math.floor(p.a * VENTS);
  const b = near(ventBase(v), me, SWIM_W);
  const h = ventH(v);
  const q = hash(p.i, 216);
  const a = p.d * TAU;
  switch (ventPart(p)) {
    case 'chimney': {
      const r = (1.4 - 0.8 * q) * (0.8 + 0.4 * hash(p.i, 217));
      return [b[0] + Math.cos(a) * r, b[1] + q * h, b[2] + Math.sin(a) * r];
    }
    case 'mat': {
      const r = 1.5 + 4 * Math.sqrt(q);
      return [b[0] + Math.cos(a) * r, b[1] + 0.1, b[2] + Math.sin(a) * r];
    }
    default: {
      // Rising, widening and curling as it cools.
      const rise = wrap(q * PLUME + t * 2.2, PLUME);
      const w = rise / PLUME;
      const r = 0.4 + 3.2 * w ** 0.8 * hash(p.i, 218);
      const turn = a + t * 0.6 + rise * 0.4;
      return [
        b[0] + Math.cos(turn) * r + 1.5 * w * Math.sin(0.2 * t + v),
        b[1] + h + rise,
        b[2] + Math.sin(turn) * r,
      ];
    }
  }
}

/** The deep's rock: the canyon's two walls, the reef on either side above, the floor of the abyss. */
function deepRockAt(p: Particle, me: Vec3): Vec3 {
  const q = hash(p.i, 219);
  const z = hash(p.i, 220) * SWIM_W;
  if (q < 0.55) {
    const y = FLOOR - p.b * (FLOOR - DEEP_FLOOR);
    const rough = 1.2 * Math.sin(y * 0.35 + z * 0.2) + (hash(p.i, 221) - 0.5);
    return near([p.d < 0.5 ? CANYON[1] + rough : CANYON[0] - rough, y, z], me, SWIM_W);
  }
  if (q < 0.75) {
    const x = CANYON[1] + p.b * (SWIM_W - (CANYON[1] - CANYON[0]));
    return near([x, FLOOR + Math.sin(p.b * 60 + z) * 0.25, z], me, SWIM_W);
  }
  const x = CANYON[0] + p.b * (CANYON[1] - CANYON[0]);
  return near([x, DEEP_FLOOR + Math.sin(x * 0.7 + z * 0.5) * 0.3, z], me, SWIM_W);
}

/* ---------- regions: a flight of mantas, swarms of jellyfish ---------- */
/*
 * REGIONS (2026-11-11): "flocks of jellyfish in some parts of the fish world,
 * different ones. like u can get lost in parts where suddenly u get the manta
 * rays, 40 of them, and can swim with them, or suddenly a swarm of
 * jellyfish". Beyond the field that wraps round you the sea is laid out in
 * great squares 150 across: in some a flight of forty mantas, in others a
 * swarm of one kind of jellyfish (glow, moon, lion's mane, box or comb), in
 * the rest nothing. Swim far enough and you come into one: some of the reef's,
 * the shoals' or the deep's grains pour together into mantas or jellyfish,
 * and pour back as you leave. The mantas fly with you in a loose, wide
 * formation, each following your path a moment behind, beating slowly,
 * keeping your pace; the jellyfish hang in a great cloud you swim through.
 */
export const ZONE_CELL = 150;
export const FLOCK = 40;
export const SWARM = 42;
const ZONE_IN = 34;
const ZONE_OUT = 58;
export type Zone = { kind: 'manta' | 'jelly'; form: number; at: Vec3; w: number };
/** The region of square (i, j), if it has one: what it is and where its middle is. */
function zoneOfCell(
  i: number,
  j: number,
): { kind: Zone['kind']; form: number; x: number; z: number } | null {
  const id = i * 7919 + j * 104729;
  const h = hash(id, 350);
  if (h >= 0.75) return null;
  return {
    kind: h < 0.3 ? 'manta' : 'jelly',
    form: Math.floor(hash(id, 351) * 5),
    x: (i + 0.3 + 0.4 * hash(id, 352)) * ZONE_CELL,
    z: (j + 0.3 + 0.4 * hash(id, 353)) * ZONE_CELL,
  };
}
/** How high a region's middle is, in the sea you are in: the jellyfish in the open water, or down the canyon. */
function zoneHeight(x: number): number {
  return sea === 0 ? FLOOR + 16 : sea === 1 ? FLOOR + 32 : inCanyon(x) ? FLOOR - 24 : FLOOR + 14;
}
/** The region at `pos` (unwrapped), and how far into it (0 at its edge, 1 well inside); null in open sea. */
export function zoneAt(pos: Vec3): Zone | null {
  const ci = Math.floor(pos[0] / ZONE_CELL);
  const cj = Math.floor(pos[2] / ZONE_CELL);
  let best: Zone | null = null;
  for (let di = -1; di <= 1; di++)
    for (let dj = -1; dj <= 1; dj++) {
      const z = zoneOfCell(ci + di, cj + dj);
      if (!z) continue;
      const w = smooth((ZONE_OUT - Math.hypot(pos[0] - z.x, pos[2] - z.z)) / (ZONE_OUT - ZONE_IN));
      if (w > (best?.w ?? 0))
        best = { kind: z.kind, form: z.form, at: [z.x, zoneHeight(z.x), z.z], w };
    }
  return best;
}
const zoneMemo = { t: Number.NaN, pos: null as Vec3 | null, sea: -1, zone: null as Zone | null };
/** The region you are in at time t. */
export function zoneNow(t: number): Zone | null {
  const me = swimmer(t).c;
  if (zoneMemo.t === t && zoneMemo.pos === me && zoneMemo.sea === sea) return zoneMemo.zone;
  zoneMemo.t = t;
  zoneMemo.pos = me;
  zoneMemo.sea = sea;
  zoneMemo.zone = zoneAt(me);
  return zoneMemo.zone;
}
/** How many of each sea's spare grains a region takes: of the coral trees, the shoals, the deep's. */
const ZONE_SHARE = [0.55, 0.23, 0.28];

/** Manta m of the flight: following your path a moment behind, out to your side, above or below. */
export function flockManta(m: number, t: number): { c: Vec3; f: Vec3 } {
  const lag = 0.5 + 3 * hash(m, 354);
  const back = swim.on ? trailAt(t - lag, swim.trail) : autopilot(t - lag);
  const level =
    Math.hypot(back.f[0], back.f[2]) > 1e-3
      ? norm([back.f[0], 0, back.f[2]])
      : ([0, 0, -1] as Vec3);
  const side = norm(cross(level, [0, 1, 0]));
  // Never right on top of you: a clear lane down the middle.
  const lat = (hash(m, 355) < 0.5 ? -1 : 1) * (9 + 24 * hash(m, 356));
  const up = (hash(m, 357) - 0.5) * 16 + 1.5 * Math.sin(0.25 * t + m);
  const fwd = (hash(m, 358) - 0.5) * 26 + 2 * Math.sin(0.17 * t + m * 1.3);
  const c = add(add(add(back.c, side, lat), [0, 1, 0], up), level, fwd);
  c[1] = Math.max(floorAt(c[0]) + 3, Math.min(SKY_TOP - 1, c[1]));
  return { c, f: norm(add(level, [0, 1, 0], 0.12 * Math.cos(0.25 * t + m))) };
}
/** Jellyfish j of a swarm: its top, rising slowly through the cloud and coming round again, faint where it does. */
function swarmJelly(j: number, t: number, zone: Zone): { c: Vec3; k: number; edge: number } {
  const span = 26;
  const y = wrap(hash(j, 360) * span + t * (0.5 + 0.4 * hash(j, 361)), span);
  return {
    c: [
      zone.at[0] + (hash(j, 362) - 0.5) * 70 + 2 * Math.sin(0.1 * t + j),
      zone.at[1] - span / 2 + y,
      zone.at[2] + (hash(j, 363) - 0.5) * 70 + 2 * Math.cos(0.08 * t + j),
    ],
    k: (zone.form === 2 ? 0.45 : 0.6) * (0.8 + 0.4 * hash(j, 364)),
    edge: smooth(y / 4) * smooth((span - y) / 4),
  };
}
/** Whether grain p, drawing `part`, is one a region borrows now: the region if so. */
function zoneFor(p: Particle, part: SwimPart, t: number): Zone | null {
  if (part !== 'coral' && part !== 'polyp') return null;
  if (hash(p.i, 305) >= (ZONE_SHARE[sea] as number)) return null;
  const z = zoneNow(t);
  return z && z.w > 0 ? z : null;
}
function zonePoint(p: Particle, t: number, zone: Zone): Vec3 {
  if (zone.kind === 'manta') {
    const m = Math.floor(p.a * FLOCK);
    const { c, f } = flockManta(m, t);
    return mantaShape(frame(c, f), p, t * 0.8, m, 0.6);
  }
  const j = Math.floor(p.a * SWARM);
  const { c, k } = swarmJelly(j, t, zone);
  return zone.form === 0
    ? jellyAt(c, k, pulseOf(j, t), p, t, j)
    : kindJellyAt(c, k, pulseOf(j, t * 0.8), p, t, j, zone.form);
}
function zoneColour(p: Particle, t: number, twinkle: number, zone: Zone): RGB {
  if (zone.kind === 'manta') {
    // Dark backs and pale bellies, lit by what daylight reaches them.
    const m = Math.floor(p.a * FLOCK);
    const belly = Math.abs(p.b * 2 - 1) > 0.9 ? 1 : hash(p.i, 211);
    const tone = mix([0.22, 0.27, 0.36], [0.85, 0.9, 0.95], belly);
    return fishTint(scale(tone, (0.14 + 0.3 * daylight(flockManta(m, t).c[1])) * twinkle), m);
  }
  const j = Math.floor(p.a * SWARM);
  const { edge } = swarmJelly(j, t, zone);
  return zone.form === 0
    ? jellyColour(p, pulseOf(j, t), twinkle, edge)
    : kindJellyColour(p, pulseOf(j, t * 0.8), twinkle, edge, t, zone.form);
}

/* ---------- the open water: sun from the surface ---------- */

const RAYS = 9;
/** Shafts of sun slanting down from the surface, swaying; `s` how far down each grain is. */
function rayAt(p: Particle, t: number, me: Vec3): { pos: Vec3; s: number } {
  const k = Math.floor(hash(p.i, 222) * RAYS);
  const s = hash(p.i, 223);
  const base: Vec3 = [
    hash(k, 224) * SWIM_W + Math.sin(t * 0.07 + k) * 2 + s * 14 + (hash(p.i, 227) - 0.5) * 1.6,
    SKY_TOP + 2 - s * 60,
    hash(k, 225) * SWIM_W + (hash(p.i, 226) - 0.5) * 1.6,
  ];
  return { pos: near(base, me, SWIM_W), s };
}
/** The surface far above, a sheet of light rippling. */
const isSurface = (p: Particle) => hash(p.i, 228) < 0.35;

/* ---------- the coral tunnel, forking in a Y ---------- */
/*
 * TUNNEL (2026-11-11): "can u do a tunnel of corals as some place that
 * connects from one side to another with a Y so there are two exits on one of
 * the sides". In the coral forest an arch of coral runs along the sand: one
 * mouth, a trunk, then it forks and comes out by two mouths side by side. Its
 * walls are rings of coral close together with polyps tufting from them, wide
 * enough for the hammerhead. It stands at one place on the wrapping field, so
 * you keep coming across it.
 */
/*
 * THE GREAT TUNNEL (2026-11-11): "make tunnel really big, like a big circular
 * tunnel, not a small half-ass tunnel. a tunnel with small red fish and
 * corals, and rays of light passing through from openings. and u can't get
 * out, u have to go through". Now a round tube eighteen across, lying on the
 * sand, still forking in a Y: one mouth, a trunk, then two branches out to
 * two mouths thirty apart. Its walls are rings of coral, polyps tufting
 * inward; thirty small red fish swim up and down it in little schools,
 * parting round you; six openings in its roof let shafts of sunlight fall
 * through to its floor. Swim in by a mouth and its walls hold you until you
 * leave by a mouth; from outside they keep you out. Inside, the eye comes in
 * closer behind you.
 */
export const TUNNEL_R = 9;
/** Where it stands on the field: the mouth at TUNNEL_Z0, the fork TUNNEL_TRUNK on, the exits 2 SPREAD apart. */
const TUNNEL_X = 0;
const TUNNEL_Z0 = 34;
export const TUNNEL_TRUNK = 24;
const BRANCH = 30;
const SPREAD = 15;
/** The tube's middle line, its foot sunk a little into the sand. */
const TUBE_Y = FLOOR + TUNNEL_R - 1;
/** How far from the wall your middle keeps, inside or out. */
const TUBE_CLEAR = 2.4;
/** Branch `side` (-1 left, 1 right) `v` along, from the fork (0) to its mouth (1). */
const branchAt = (side: number, v: number): Vec3 => [
  TUNNEL_X + side * SPREAD * smooth(v),
  TUBE_Y,
  TUNNEL_Z0 - TUNNEL_TRUNK - BRANCH * v,
];
/** How long each branch is along its curve. */
export const TUNNEL_BRANCH = (() => {
  let l = 0;
  for (let n = 1; n <= 200; n++)
    l += Math.hypot(...sub(branchAt(1, n / 200), branchAt(1, (n - 1) / 200)));
  return l;
})();
export const TUNNEL_LEN = TUNNEL_TRUNK + 2 * TUNNEL_BRANCH;
/** The tube's middle line and which way it runs, `s` along it: the trunk, then the left branch, then the right. */
export function tunnelAt(s: number): { c: Vec3; f: Vec3 } {
  const x = Math.max(0, Math.min(TUNNEL_LEN - 1e-6, s));
  if (x < TUNNEL_TRUNK) return { c: [TUNNEL_X, TUBE_Y, TUNNEL_Z0 - x], f: [0, 0, -1] };
  const left = x < TUNNEL_TRUNK + TUNNEL_BRANCH;
  const v = Math.min(1, (x - TUNNEL_TRUNK - (left ? 0 : TUNNEL_BRANCH)) / TUNNEL_BRANCH);
  const side = left ? -1 : 1;
  return {
    c: branchAt(side, v),
    f: norm(sub(branchAt(side, Math.min(1, v + 0.01)), branchAt(side, Math.max(0, v - 0.01)))),
  };
}
/** Whether a place on the field lies under the tunnel's footprint, where no other coral grows. */
const underTunnel = (x: number, z: number) =>
  Math.abs(wrap(x - TUNNEL_X + SWIM_W / 2, SWIM_W) - SWIM_W / 2) < SPREAD + TUNNEL_R + 3 &&
  z > TUNNEL_Z0 - TUNNEL_TRUNK - BRANCH - TUNNEL_R - 2 &&
  z < TUNNEL_Z0 + TUNNEL_R + 2;

/** The tube's middle lines as points: the trunk (its mouth first), then each branch (its mouth last). */
const TUBE_LINES: Vec3[][] = [
  Array.from({ length: 7 }, (_, n): Vec3 => [TUNNEL_X, TUBE_Y, TUNNEL_Z0 - (TUNNEL_TRUNK * n) / 6]),
  Array.from({ length: 17 }, (_, n) => branchAt(-1, n / 16)),
  Array.from({ length: 17 }, (_, n) => branchAt(1, n / 16)),
];
/**
 * The tube nearest `pos`: how far its middle line is, the nearest point on it, whether `pos` is out
 * past one of its mouths, and whether it is well inside.
 */
export function tubeOf(pos: Vec3): { d: number; at: Vec3; out: boolean; inside: boolean } {
  const fork: Vec3 = [TUNNEL_X, TUBE_Y, TUNNEL_Z0 - TUNNEL_TRUNK];
  const here = near(fork, pos, SWIM_W);
  const shift: Vec3 = [here[0] - fork[0], 0, here[2] - fork[2]];
  let best = { d: Number.POSITIVE_INFINITY, at: pos, out: true };
  TUBE_LINES.forEach((line, li) => {
    for (let n = 0; n < line.length - 1; n++) {
      const a = add(line[n] as Vec3, shift);
      const ab = sub(add(line[n + 1] as Vec3, shift), a);
      const u = dot(sub(pos, a), ab) / dot(ab, ab);
      const q = add(a, ab, Math.max(0, Math.min(1, u)));
      const d = Math.hypot(...sub(pos, q));
      if (d < best.d) {
        // Out past the trunk's mouth, or past a branch's.
        const out = li === 0 ? n === 0 && u < 0 : n === line.length - 2 && u > 1;
        best = { d, at: q, out };
      }
    }
  });
  return { ...best, inside: !best.out && best.d < TUNNEL_R - 1 };
}
/** Whether you are inside the tunnel now. */
export const inTunnel = () => swim.tube;

/** After you move: the tunnel's walls hold you in once you are in, and keep you out until you come in by a mouth. */
function confine(was: Vec3) {
  if (sea !== 0) {
    swim.tube = false;
    return;
  }
  const now = tubeOf(swim.pos);
  const lim = TUNNEL_R - TUBE_CLEAR;
  const to = (r: number) => {
    swim.pos = add(now.at, norm(sub(swim.pos, now.at)), r);
    swim.pos[1] = Math.max(floorAt(swim.pos[0]) + 1.5, Math.min(SKY_TOP, swim.pos[1]));
  };
  if (swim.tube) {
    if (now.out) swim.tube = false;
    else if (now.d > lim) to(lim);
    return;
  }
  if (now.out || now.d >= TUNNEL_R + TUBE_CLEAR) return;
  if (tubeOf(was).out && now.d < TUNNEL_R - 1) {
    // In by a mouth: inside from now on.
    swim.tube = true;
    if (now.d > lim) to(lim);
    return;
  }
  to(TUNNEL_R + TUBE_CLEAR);
}

/** The openings in the roof, `s` along the tube, and how long and how wide each is. */
const OPENINGS = [
  6,
  17,
  TUNNEL_TRUNK + 10,
  TUNNEL_TRUNK + 22,
  TUNNEL_TRUNK + TUNNEL_BRANCH + 10,
  TUNNEL_TRUNK + TUNNEL_BRANCH + 22,
];
const HOLE_S = 2.6;
const HOLE_A = 0.55;
/** How far a point is from branch `side`'s middle line. */
const fromBranch = (pt: Vec3, side: number) => {
  let d = Number.POSITIVE_INFINITY;
  for (let n = 0; n <= 32; n++) d = Math.min(d, Math.hypot(...sub(pt, branchAt(side, n / 32))));
  return d;
};
/** A grain of the wall, on the field before it is brought round to you: its ring's middle, its way out, its tone. */
type WallGrain = { c: Vec3; n: Vec3; tone: number };
const wallGrains = new Map<number, WallGrain>();
function wallGrain(p: Particle): WallGrain {
  const hit = wallGrains.get(p.i);
  if (hit) return hit;
  let s = hash(p.i, 241) * TUNNEL_LEN;
  // Most grains gather on rings close together, so the walls read as built of coral.
  if (hash(p.i, 242) < 0.6) s = (Math.floor(s / 2.2) + 0.5) * 2.2;
  let th = p.d * TAU;
  // Out of an opening in the roof, to its edge, so each opening has a rim.
  for (const o of OPENINGS) {
    const da = wrap(th - Math.PI / 2 + Math.PI, TAU) - Math.PI;
    if (Math.abs(s - o) < HOLE_S && Math.abs(da) < HOLE_A)
      th = Math.PI / 2 + (da < 0 ? -1 : 1) * HOLE_A * (1 + 0.2 * hash(p.i, 243));
  }
  const ring = (ss: number) => {
    const { c, f } = tunnelAt(ss);
    const side: Vec3 = [f[2], 0, -f[0]];
    return { c, n: [side[0] * Math.cos(th), Math.sin(th), side[2] * Math.cos(th)] as Vec3 };
  };
  let at = ring(s);
  // A branch's wall inside the other branch would close the fork: it goes to the trunk instead.
  if (s >= TUNNEL_TRUNK) {
    const other = s < TUNNEL_TRUNK + TUNNEL_BRANCH ? 1 : -1;
    if (fromBranch(add(at.c, at.n, TUNNEL_R), other) < TUNNEL_R - 0.2) {
      s = hash(p.i, 245) * TUNNEL_TRUNK;
      at = ring(s);
    }
  }
  const g = { c: at.c, n: at.n, tone: Math.floor(s / 4) % COLONIES };
  wallGrains.set(p.i, g);
  return g;
}

/** Grain p on the tunnel's wall: on a ring of coral, its polyps tufting inward, breathing. */
function tunnelPoint(p: Particle, t: number, me: Vec3, polyp: boolean): Vec3 {
  const g = wallGrain(p);
  const r = polyp
    ? TUNNEL_R - (0.3 + 1.3 * hash(p.i, 244)) * (0.7 + 0.3 * Math.sin(t * 1.4 + p.i * 0.1))
    : TUNNEL_R + 0.7 * (hash(p.i, 244) - 0.5);
  const pos = add(near(g.c, me, SWIM_W), g.n, r);
  // What would lie under the sand lies on it.
  pos[1] = Math.max(FLOOR + 0.05, pos[1]);
  return pos;
}
function tunnelColour(p: Particle, me: Vec3, polyp: boolean, twinkle: number): RGB {
  const g = wallGrain(p);
  const at = near(g.c, me, SWIM_W);
  const edge = smooth((SWIM_W / 2 - Math.hypot(at[0] - me[0], at[2] - me[2])) / 12);
  const tone = paint(CORAL_TONES[g.tone] as RGB, g.tone);
  return polyp
    ? scale(mix(tone, polypWhite(), 0.35), 0.75 * twinkle * edge)
    : scale(tone, 0.45 * twinkle * edge);
}

/** The small red fish of the tunnel: thirty, in six little schools. */
export const RED_FISH = 30;
/** Red fish j: swimming up or down the trunk and one branch, at its own depth in the tube, parting round you. */
export function redFish(j: number, t: number, me: Vec3): { c: Vec3; f: Vec3; edge: number } {
  const g = j % 6;
  const right = g % 2 === 1;
  const dir = g % 3 === 0 ? -1 : 1;
  const L = TUNNEL_TRUNK + TUNNEL_BRANCH;
  const u = wrap(
    hash(g, 341) * L + dir * (2.4 + 0.8 * hash(g, 340)) * t + (hash(j, 342) - 0.5) * 3,
    L,
  );
  const s = u < TUNNEL_TRUNK ? u : TUNNEL_TRUNK + (right ? TUNNEL_BRANCH : 0) + (u - TUNNEL_TRUNK);
  const { c, f } = tunnelAt(s);
  const side: Vec3 = [f[2], 0, -f[0]];
  const th = hash(g, 343) * TAU + 0.4 * Math.sin(0.3 * t + g) + (hash(j, 344) - 0.5) * 0.8;
  const r = TUNNEL_R * (0.25 + 0.4 * hash(g, 345)) + (hash(j, 346) - 0.5) * 1.4;
  const pos = add(
    near(c, me, SWIM_W),
    [side[0] * Math.cos(th), Math.sin(th), side[2] * Math.cos(th)],
    r,
  );
  pos[1] = Math.max(FLOOR + 0.8, pos[1] + 0.3 * Math.sin(1.3 * t + j));
  return {
    c: scatter(pos, t),
    f: scale(f as RGB, dir) as Vec3,
    // Faint at each end of its round, so none pops in or out.
    edge: smooth(u / 3) * smooth((L - u) / 3),
  };
}

/** A grain of a shaft of sunlight falling through an opening, motes drifting down it; `k` how bright. */
function beamAt(p: Particle, t: number, me: Vec3): { pos: Vec3; k: number } {
  const o = OPENINGS[Math.floor(hash(p.i, 347) * OPENINGS.length)] as number;
  const top = near(add(tunnelAt(o).c, [0, TUNNEL_R, 0]), me, SWIM_W);
  // A little above the roof, down to the floor.
  const v = frac(hash(p.i, 348) + t * 0.03) * 1.25 - 0.25;
  const a = p.b * TAU;
  const rr = 1.6 * Math.sqrt(p.d) * (1 + 0.25 * Math.max(0, v));
  const pos = add(add(top, [0.18, -1, 0.12], v * (2 * TUNNEL_R - 1)), [
    Math.cos(a) * rr,
    0,
    Math.sin(a) * rr,
  ]);
  return {
    pos,
    k: (v < 0 ? 0.55 : 1 - 0.5 * v) * smooth((v + 0.25) / 0.15) * smooth((1 - v) / 0.1),
  };
}

/* ---------- light: caustics on the floor, waves of light on the surface ---------- */
/*
 * LIGHT (2026-11-11): "can u give me lighting. like liquid reflections on the
 * sea floor as one mode I can activate", "imagine u do a surface above. with
 * waves of light like waves seen from below. beautiful hypnotic patterns". A
 * switch: on the sand a net of liquid light, two families of wavering lines
 * crossing and sliding, beads of brightness running along them; above, the
 * surface seen from below, a wider net of light rippling the other way. Kept
 * soft, so nothing glares.
 */
let light = false;
/** The Light switch: set by the player's toggle, off in the Journey and on every other piece. */
export function setLight(on: boolean, k?: number) {
  light = on && (k === undefined || hasGame(k));
}
export const hasLight = hasGame;
export const lightOn = () => light;

/**
 * A grain on a net of light lines over a tile `w` wide, `n` lines a family, at height y: its place,
 * and how bright the bead it sits in is (0..1). The lines waver with periods that divide the tile,
 * so the net wraps without a seam.
 */
function lightNet(p: Particle, t: number, me: Vec3, w: number, n: number, y: number, flow: number) {
  const k1 = (TAU / w) * 3;
  const k2 = (TAU / w) * 2;
  const gap = w / n;
  const line = Math.floor(hash(p.i, 272) * n);
  const u = hash(p.i, 273) * w;
  const across =
    line * gap +
    0.28 * gap * Math.sin(u * k2 + flow * t * 0.6 + line * 1.7) +
    0.16 * gap * Math.sin(u * k1 - flow * t * 0.9 + line);
  const pos: Vec3 = hash(p.i, 271) < 0.5 ? [u, y, across] : [across, y, u];
  const bead = (0.5 + 0.5 * Math.sin(u * 0.9 + flow * t * 1.3 + line * 2)) ** 2;
  return { pos: near(pos, me, w), bead };
}
const CAUSTIC_W = 48;
const WAVES_W = 64;
const causticAt = (p: Particle, t: number, me: Vec3) =>
  lightNet(p, t, me, CAUSTIC_W, 12, FLOOR + 0.05, 1);
const wavesAt = (p: Particle, t: number, me: Vec3) => {
  const net = lightNet(p, t, me, WAVES_W, 16, SKY_TOP + 2, -0.7);
  net.pos[1] += 0.6 * Math.sin(net.pos[0] * 0.2 + t * 0.7) * Math.cos(net.pos[2] * 0.17 - t * 0.5);
  return net;
};
const SUNLIGHT: RGB = [0.82, 0.95, 1];

/* ---------- visitors: hammerheads passing in a school, and whales ---------- */
/*
 * VISITORS (2026-11-11): "add bancs de requins marteaux moving in fluid ways.
 * inside the ocean. they are not always there but sometimes appear. also add
 * whales". Now and then a school of seven hammerheads glides by, each
 * following the one ahead a moment later, so its turns flow through the
 * school; and two whales cruise slowly, long flippers beating, flukes rising
 * and falling. Each comes out of the blue and goes again.
 */
export const HAMMERS = 7;
export const WHALES = 2;
export const HAMMER_CYCLE = 70;
export const WHALE_CYCLE = 95;
/** How much the hammerhead school is there at time t: there a while, then gone a while. */
export const hammersSeen = (t: number) =>
  smooth((Math.sin((TAU * t) / HAMMER_CYCLE + 0.5) - 0.2) / 0.35);
/** How much whale w is there at time t. */
export const whaleSeen = (w: number, t: number) =>
  smooth((Math.sin((TAU * t) / WHALE_CYCLE + w * 2.5) - 0.3) / 0.3);

const hammerPath = (tt: number): Vec3 =>
  sea === 2
    ? [CANYON_MID + 10 * Math.sin(0.025 * tt), FLOOR - 9 + 4 * Math.sin(0.05 * tt), 20 - 2.6 * tt]
    : [
        25 * Math.sin(0.025 * tt) + 30,
        FLOOR + (sea === 1 ? 30 : 16) + (sea === 1 ? 6 : 3) * Math.sin(0.05 * tt),
        60 - 2.6 * tt + 12 * Math.sin(0.03 * tt),
      ];
/** Hammerhead j of the passing school: following the path a moment behind the one ahead. */
function hammerOf(j: number, t: number, me: Vec3): { c: Vec3; f: Vec3 } {
  const lag = 0.7 * j + 0.4 * hash(j, 254);
  const a = hammerPath(t - lag);
  const f = norm(sub(hammerPath(t - lag + 0.05), a));
  const side = norm(cross(f, [0, 1, 0]));
  const ox = (j % 2 ? 1 : -1) * (1.5 + 2.2 * Math.ceil(j / 2)) + 0.6 * Math.sin(0.4 * t + j);
  const oy = (hash(j, 255) - 0.5) * 3 + 0.5 * Math.sin(0.3 * t + j * 2);
  return { c: near(add(add(a, side, ox), [0, 1, 0], oy), me, SWIM_W), f };
}

const whalePath = (w: number, tt: number): Vec3 =>
  sea === 2
    ? [CANYON_MID + 8 * Math.sin(0.02 * tt + w), FLOOR - 20 - 10 * w, 40 * w - 1.8 * tt]
    : [
        30 + 42 * w + 8 * Math.sin(0.02 * tt + w),
        FLOOR + (sea === 1 ? 22 + 18 * w : 40 + 6 * w) + 2 * Math.sin(0.04 * tt + w),
        40 * w - 1.8 * tt,
      ];
export const WHALE_LEN = 26;
/** A whale of our own: a long body tapering to the tail, wide flukes, long flippers; it beats up and down. */
function whaleAt(w: number, p: Particle, t: number, me: Vec3): Vec3 {
  const tt = whaleClock(w, t);
  const a = whalePath(w, tt);
  const put = frame(near(a, me, SWIM_W), norm(sub(whalePath(w, tt + 0.05), a)));
  const L = WHALE_LEN;
  const flex = (s: number) => 0.05 * L * Math.sin(1.1 * t + w - 4 * s) * s * s;
  const part = hash(p.i, 252);
  const q = hash(p.i, 253);
  const side = p.b < 0.5 ? -1 : 1;
  if (part < 0.1)
    return put(-0.47 * L - 0.06 * L * q, side * 0.15 * L * q, flex(1) + (p.d - 0.5) * 0.01 * L);
  if (part < 0.2)
    return put(
      0.22 * L - 0.12 * L * q,
      side * (0.07 * L + 0.25 * L * q),
      -0.04 * L * q + 0.05 * L * q * Math.sin(0.7 * t + w + q),
    );
  const s = p.b;
  const r = 0.085 * L * Math.sin(Math.PI * Math.min(1, s ** 0.55 * 1.02));
  const ang = p.d * TAU;
  return put(L * (0.5 - s), Math.cos(ang) * r, Math.sin(ang) * r * 0.9 + flex(s));
}

function visitorPoint(p: Particle, t: number, me: Vec3): Vec3 {
  if (hash(p.i, 251) < 0.55) {
    const j = Math.floor(p.a * HAMMERS);
    const { c, f } = hammerOf(j, t, me);
    return kindFishAt(SHOAL_KINDS[3] as ShoalKind, c, f, 8, p, t, j);
  }
  return whaleAt(Math.floor(p.a * WHALES), p, t, me);
}
function visitorColour(p: Particle, t: number, twinkle: number, me: Vec3): RGB {
  const lit = 0.4 + 0.6 * daylight(me[1]);
  if (hash(p.i, 251) < 0.55)
    return fishTint(
      scale(
        mix([0.86, 0.89, 0.92], [0.5, 0.56, 0.62], 0.5 + 0.5 * Math.sin(p.d * TAU)),
        0.3 * twinkle * hammersSeen(t) * lit,
      ),
      Math.floor(p.a * HAMMERS),
    );
  const w = Math.floor(p.a * WHALES);
  const belly = hash(p.i, 252) >= 0.2 && Math.sin(p.d * TAU) < -0.3;
  // Throat grooves: pale lines along the belly at the front.
  const groove = belly && p.b < 0.45 && frac(p.d * 40) < 0.3;
  const tone: RGB = belly ? (groove ? [0.85, 0.88, 0.9] : [0.6, 0.66, 0.72]) : [0.26, 0.31, 0.4];
  return scale(tone, 0.24 * twinkle * whaleShown(w, t) * lit);
}

/* ---------- a reef that answers you: anemones, clownfish, tube worms, corals ---------- */
/*
 * REACTIONS (2026-11-11: "some coral reefs have the clownfish hiding in when u
 * get close. so we define different corals with different reactions.
 * anemones would be cool as well."). In the coral forest each kind answers
 * you its own way, by how near you are: anemones, soft clumps of swaying
 * tentacles, draw them in and curl; the clownfish living in them dive in and
 * peek back out once you have passed; tube worms snap their little fans shut
 * and open them again slowly; the coral trees sway in your wake and their
 * polyps dim, glowing back as you go.
 */
export const ANEMONES = 6;
const ANEMONE_AT: Vec3[] = [
  [50, FLOOR, 30],
  [20, FLOOR, 60],
  [60, FLOOR, 74],
  [36, FLOOR, 48],
  [56, FLOOR, 10],
  [30, FLOOR, 8],
];
const CLOWNS_EACH = 3;
const TUBES = 8;
const TUBE_AT: Vec3[] = [
  [44, FLOOR, 40],
  [26, FLOOR, 30],
  [64, FLOOR, 40],
  [52, FLOOR, 62],
  [40, FLOOR, 78],
  [22, FLOOR, 74],
  [58, FLOOR, 20],
  [34, FLOOR, 18],
];
export const CLAMS = 3;
const CLAM_AT: Vec3[] = [
  [42, FLOOR, 22],
  [28, FLOOR, 66],
  [64, FLOOR, 56],
];
/** How drawn in each answers you now, 0 open to 1 shut, eased: anemones, tube worms, coral trees; how open each clam is. */
const hidden = {
  anemone: new Float64Array(ANEMONES),
  tube: new Float64Array(TUBES),
  coral: new Float64Array(16),
  clam: new Float64Array(CLAMS),
};
export const anemoneHidden = (a: number) => hidden.anemone[a] ?? 0;
export const tubeShut = (k: number) => hidden.tube[k] ?? 0;
export const clamOpen = (c: number) => hidden.clam[c] ?? 0;
/** Where anemone a, tube cluster k or clam c is, brought round to you. */
export const anemoneAt = (a: number, me: Vec3) => near(ANEMONE_AT[a] as Vec3, me, SWIM_W);
export const tubeAt = (k: number, me: Vec3) => near(TUBE_AT[k] as Vec3, me, SWIM_W);
export const clamAt = (c: number, me: Vec3) => near(CLAM_AT[c] as Vec3, me, SWIM_W);

/*
 * GUESTS (2026-11-11, the approved plan): a whale you can swim alongside
 * quickens or slows to keep your pace while you are at its side, and stays
 * while you do; in the deep the first manta loops, and if you follow behind
 * it, it waits when you fall back and moves on when you close in.
 */
const guest = {
  whale: [0, 0],
  whaleRate: [1, 1],
  beside: [0, 0],
  manta: 0,
  mantaRate: 1,
};
/** The whale's own speed along its path, units a second. */
export const WHALE_SPEED = 1.8;
const whaleClock = (w: number, _t: number) => guest.whale[w] ?? 0;
const mantaClock = (m: number, t: number) => (m === 0 ? guest.manta : t);
/** How much whale w is there: in its own time, or as long as you swim beside it. */
const whaleShown = (w: number, t: number) => Math.max(whaleSeen(w, t), guest.beside[w] ?? 0);
/** How fast whale w and the first manta go along their paths now, 1 their own pace: for the tests. */
export const whaleRate = (w: number) => guest.whaleRate[w] ?? 1;
export const mantaRate = () => guest.mantaRate;
export const besideWhale = (w: number) => guest.beside[w] ?? 0;
/** Where whale w and the first manta are now on the field, and which way they swim: for the tests. */
export function whaleNow(w: number): { c: Vec3; f: Vec3 } {
  const s = guest.whale[w] ?? 0;
  const c = whalePath(w, s);
  return { c, f: norm(sub(whalePath(w, s + 0.05), c)) };
}
export function mantaNow(): { c: Vec3; f: Vec3 } {
  const c = mantaPath(0, guest.manta);
  return { c, f: norm(sub(mantaPath(0, guest.manta + 0.05), c)) };
}

/** Each frame: everything that answers you eases toward how near you are. */
function react(dt: number, t: number) {
  if (dt <= 0) return;
  const { c: me } = swimmer(t);
  const ease = (v: number, to: number, up: number, down: number) =>
    v + (to - v) * (1 - Math.exp(-(to > v ? up : down) * dt));
  const gap = (a: Vec3, lift: number) =>
    Math.hypot(a[0] - me[0], a[1] + lift - me[1], a[2] - me[2]);
  for (let a = 0; a < ANEMONES; a++) {
    const to = smooth((14 - gap(anemoneAt(a, me), 1.5)) / 6);
    hidden.anemone[a] = ease(hidden.anemone[a] ?? 0, to, 4, 0.35);
  }
  for (let k = 0; k < TUBES; k++) {
    const to = smooth((9 - gap(tubeAt(k, me), 1)) / 3);
    hidden.tube[k] = ease(hidden.tube[k] ?? 0, to, 10, 0.4);
  }
  for (let j = 0; j < SWIM_CORALS; j++) {
    const to = smooth((12 - gap(near(swimSlot(j).at, me, SWIM_W), 4)) / 8);
    hidden.coral[j] = ease(hidden.coral[j] ?? 0, to, 3, 0.4);
  }
  // A clam opens only to someone slow and close.
  const slow = swim.on && swim.speed < 0.6 * SWIM_SPEED;
  for (let c = 0; c < CLAMS; c++) {
    const to = slow && gap(clamAt(c, me), 0.5) < 12 ? 1 : 0;
    hidden.clam[c] = ease(hidden.clam[c] ?? 0, to, 1.2, 0.6);
  }
  // The whales: at their side they match your pace.
  for (let w = 0; w < WHALES; w++) {
    const s = guest.whale[w] ?? 0;
    const a = whalePath(w, s);
    const fw = norm(sub(whalePath(w, s + 0.05), a));
    const d = sub(me, near(a, me, SWIM_W));
    const along = dot(d, fw);
    const lat = Math.hypot(...sub(d, scale(fw, along) as Vec3));
    const known = whaleSeen(w, t) > 0.3 || (guest.beside[w] ?? 0) > 0.05;
    const beside = swim.on && known && Math.abs(along) < 16 && lat < 14;
    const to = beside ? Math.max(0.3, Math.min(3, swim.speed / WHALE_SPEED)) : 1;
    guest.whaleRate[w] = ease(guest.whaleRate[w] ?? 1, to, 1.5, 1.5);
    guest.beside[w] = ease(guest.beside[w] ?? 0, beside ? 1 : 0, 1, 0.3);
    guest.whale[w] = s + dt * (guest.whaleRate[w] ?? 1);
  }
  // The first manta: followed from behind, it keeps about ten ahead of you.
  let to = 1;
  if (sea === 2 && swim.on) {
    const a = mantaPath(0, guest.manta);
    const fm = norm(sub(mantaPath(0, guest.manta + 0.05), a));
    const d = sub(me, near(a, me, SWIM_W));
    const dist = Math.hypot(...d);
    if (dot(d, fm) < 0 && dist < 30) to = Math.max(0.25, Math.min(1.7, 1 + (10 - dist) * 0.12));
  }
  guest.mantaRate = ease(guest.mantaRate, to, 1.2, 1.2);
  guest.manta += dt * guest.mantaRate;
}

function anemonePoint(p: Particle, t: number, me: Vec3): Vec3 {
  const a = Math.floor(p.a * ANEMONES);
  const at = anemoneAt(a, me);
  const hide = anemoneHidden(a);
  // Its foot: a short soft column.
  if (hash(p.i, 284) < 0.15) {
    const ang = p.d * TAU;
    const r = 0.9 * Math.sqrt(hash(p.i, 286));
    return [at[0] + Math.cos(ang) * r, at[1] + 0.5 * p.b, at[2] + Math.sin(ang) * r];
  }
  // A tentacle: from the disc, up and out, swaying; drawn in, it shortens and curls inward.
  const k = Math.floor(hash(p.i, 285) * 28);
  const v = hash(p.i, 286);
  const ang = k * GOLDEN_ANGLE;
  const rr = 0.3 + 0.9 * Math.sqrt(frac(k * 0.618));
  const L = 1.9 * (1 - 0.7 * hide);
  const out = 0.45 * (1 - hide) * v - 0.5 * hide * v * v;
  const sway = 0.25 * v * L * Math.sin(1.2 * t + k + a - 2 * v);
  return [
    at[0] + Math.cos(ang) * (rr + out * L) + sway,
    at[1] + 0.5 + v * L * (1 - 0.25 * v),
    at[2] + Math.sin(ang) * (rr + out * L) + 0.4 * sway,
  ];
}
function anemoneColour(p: Particle, twinkle: number): RGB {
  const a = Math.floor(p.a * ANEMONES);
  const tone = paint([0.85, 0.5, 0.9], a);
  if (hash(p.i, 284) < 0.15) return scale(tone, 0.18 * twinkle);
  const tip = hash(p.i, 286) > 0.85;
  return scale(tip ? mix(tone, polypWhite(), 0.5) : tone, (tip ? 0.5 : 0.32) * twinkle);
}

/** Clownfish j of the anemones: out round its anemone, or down in its tentacles as you pass. */
export function anemoneClown(j: number, t: number, me: Vec3): { c: Vec3; f: Vec3 } {
  const a = j % ANEMONES;
  const n = Math.floor(j / ANEMONES);
  const at = anemoneAt(a, me);
  const way = n % 2 ? 1 : -1;
  const ring = (tt: number): Vec3 => {
    const ang = 0.5 * way * tt + n * 2.1;
    const r = 1.4 + 0.5 * n;
    return [
      at[0] + Math.cos(ang) * r,
      at[1] + 1.8 + 0.4 * Math.sin(tt + n),
      at[2] + Math.sin(ang) * r,
    ];
  };
  const out = ring(t);
  const fOut = norm(sub(ring(t + 0.05), out));
  const home: Vec3 = [
    at[0] + Math.cos(n * 2.1) * 0.4,
    at[1] + 0.7,
    at[2] + Math.sin(n * 2.1) * 0.4,
  ];
  const h = smooth(anemoneHidden(a));
  return { c: lerp3(out, home, h), f: norm(lerp3(fOut, [0, -1, 0], 0.8 * h)) };
}

function tubePoint(p: Particle, t: number, me: Vec3): Vec3 {
  const k = Math.floor(p.a * TUBES);
  const w = Math.floor(hash(p.i, 287) * 5);
  const base = add(tubeAt(k, me), [
    (hash(k * 5 + w, 295) - 0.5) * 1.6,
    0,
    (hash(k * 5 + w, 296) - 0.5) * 1.6,
  ]);
  const h = 0.8 + 0.6 * hash(k * 5 + w, 297);
  const open = 1 - tubeShut(k);
  if (hash(p.i, 288) < 0.4) {
    const ang = p.d * TAU;
    return [base[0] + Math.cos(ang) * 0.08, base[1] + p.b * h, base[2] + Math.sin(ang) * 0.08];
  }
  // The crown: a little spiral fan opening upward; shut, it is pulled down into the tube.
  const v = hash(p.i, 289);
  const ang = v * TAU * 2 + w + 0.3 * Math.sin(t + w);
  const r = 0.5 * open * v;
  return [
    base[0] + Math.cos(ang) * r,
    base[1] + h * (0.75 + 0.25 * open) + 0.35 * r,
    base[2] + Math.sin(ang) * r,
  ];
}
const TUBE_TONES: RGB[] = [
  [1, 0.5, 0.3],
  [1, 0.78, 0.3],
  [0.95, 0.35, 0.5],
  [0.6, 0.4, 1],
  [1, 0.6, 0.65],
];
function tubeColour(p: Particle, twinkle: number): RGB {
  if (hash(p.i, 288) < 0.4) return scale([0.6, 0.55, 0.45], 0.12);
  const w = Math.floor(hash(p.i, 287) * 5);
  const open = 1 - tubeShut(Math.floor(p.a * TUBES));
  return scale(paint(TUBE_TONES[w] as RGB, w), 0.45 * twinkle * (0.25 + 0.75 * open));
}

/* ---------- treasures hidden in the landscape ---------- */
/*
 * TREASURE (2026-11-11: "searching for treasures hidden in the landscape").
 * Six finds: a pearl in each of three giant clams on the sand, which open
 * only to someone slow and close; an amphora lying in the coral tunnel's
 * fork; a trail of twelve gold coins down the deep canyon; a glowing egg by
 * the vents. Swim through one to take it, in a soft burst of its light. A
 * small count shows while you play; three finds bring the Golden hammerhead
 * into the pills. Kept for the visit only.
 */
export const FINDS = 6;
export const COINS = 12;
export const BURST = 1.2;
const foundAt = new Map<string, number>();
const coinAt = (i: number): Vec3 => {
  const v = i / (COINS - 1);
  return [
    CANYON[0] + 5 + 18 * v,
    FLOOR - 4 - (FLOOR - DEEP_FLOOR - 8) * v,
    30 + 6 * Math.sin(i * 0.8),
  ];
};
/** The amphora lies on the tunnel's floor at its fork. */
const amphoraAt = (): Vec3 => {
  const { c } = tunnelAt(TUNNEL_TRUNK);
  return [c[0], FLOOR + 0.8, c[2]];
};
const eggAt = (): Vec3 => add(ventBase(0), [3, 1.2, 0]);
const pearlAt = (c: number): Vec3 => add(CLAM_AT[c] as Vec3, [0, 0.35, 0]);

type Treasure = { id: string; sea: number; at: Vec3; reach: number; ready: () => boolean };
const TREASURES: Treasure[] = [
  ...Array.from({ length: CLAMS }, (_, c) => ({
    id: `pearl${c}`,
    sea: 0,
    at: pearlAt(c),
    reach: 2.5,
    ready: () => clamOpen(c) > 0.7,
  })),
  { id: 'amphora', sea: 0, at: amphoraAt(), reach: 3, ready: () => true },
  ...Array.from({ length: COINS }, (_, i) => ({
    id: `coin${i}`,
    sea: 2,
    at: coinAt(i),
    reach: 2.5,
    ready: () => true,
  })),
  { id: 'egg', sea: 2, at: eggAt(), reach: 3, ready: () => true },
];
export const TREASURE_IDS = TREASURES.map((x) => x.id);
/** Where treasure `id` lies, on the field. */
export const treasureAt = (id: string) => TREASURES.find((x) => x.id === id)?.at;

/** How many of the six finds are yours: each pearl, the amphora, the whole coin trail, the egg. */
export function finds(): number {
  let n = 0;
  for (let c = 0; c < CLAMS; c++) if (foundAt.has(`pearl${c}`)) n++;
  if (foundAt.has('amphora')) n++;
  if (Array.from({ length: COINS }, (_, i) => foundAt.has(`coin${i}`)).every(Boolean)) n++;
  if (foundAt.has('egg')) n++;
  return n;
}
/** The count shown while you play. */
export const tally = () => `Finds ${finds()} / ${FINDS}`;

/*
 * GAUGES (2026-11-11): "meters like in an airplane cockpit for height,
 * speed, fish eaten, treasures discovered". Four small round dials while you
 * play, read every frame: your height above the surface (below it, how deep;
 * the dial runs from the floor of the sea you are in), your speed, the fish
 * you have eaten, the treasures found.
 */
export type Gauge = { label: string; value: number; min?: number; max: number; unit?: string };
export function gauges(): Gauge[] {
  const { c } = swimmer(swim.t);
  const speed = !swim.on ? SWIM_SPEED : swim.air ? Math.hypot(swim.speed, swim.vy) : swim.speed;
  return [
    {
      label: 'Height',
      value: Math.round(c[1] - WATER),
      min: (sea === 2 ? DEEP_FLOOR : FLOOR) - WATER,
      max: 30,
      unit: 'm',
    },
    { label: 'Speed', value: Math.round(speed), max: 20, unit: 'm/s' },
    { label: 'Fish', value: swim.eaten, max: 60 },
    { label: 'Treasure', value: finds(), max: FINDS },
  ];
}
/** Whether the treasures have brought the Golden hammerhead. */
export const unlocked = () => finds() >= 3;
/** All treasures back where they were: for a fresh start. */
export const resetTreasure = () => foundAt.clear();

/** Each frame: any treasure you swim through is yours, if it is ready to be taken. */
function collect(t: number) {
  const { c: me, f } = swimmer(t);
  const mouth = add(me, f, swimNow().len * 0.5);
  for (const x of TREASURES) {
    if (x.sea !== sea || foundAt.has(x.id) || !x.ready()) continue;
    const at = near(x.at, me, SWIM_W);
    const d = Math.min(
      Math.hypot(at[0] - me[0], at[1] - me[1], at[2] - me[2]),
      Math.hypot(at[0] - mouth[0], at[1] - mouth[1], at[2] - mouth[2]),
    );
    if (d < x.reach) foundAt.set(x.id, t);
  }
}

/** How far through its burst treasure `id` is at t: 0 until found, then up to 1, when it is gone. */
function burstOf(id: string, t: number): number {
  const at = foundAt.get(id);
  if (at === undefined || t < at) return 0;
  return Math.min(1, (t - at) / BURST);
}
/** A treasure's grain at `local` from its middle, bursting outward and fading once found. */
function bursting(at: Vec3, local: Vec3, k: number): Vec3 {
  if (k <= 0) return add(at, local);
  const l = Math.hypot(...local) || 1;
  return add(at, local, 1 + (4 * smooth(k)) / l);
}
/** The light of a treasure's grain through its burst: a soft lift, then gone. */
const burstLight = (k: number) => (k <= 0 ? 1 : k >= 1 ? 0 : (1 + 0.6 * (1 - k)) * (1 - smooth(k)));

type TreasurePart = 'clam' | 'amphora' | 'coins' | 'egg';
function treasurePoint(part: TreasurePart, p: Particle, t: number, me: Vec3): Vec3 {
  switch (part) {
    case 'clam': {
      const c = Math.floor(p.a * CLAMS);
      const at = clamAt(c, me);
      const open = clamOpen(c);
      if (hash(p.i, 289) < 0.12) {
        const d = fibonacciSphere(p.i % 53, 53);
        return bursting(
          add(at, [0, 0.35, 0]),
          scale(d as RGB, 0.32) as Vec3,
          burstOf(`pearl${c}`, t),
        );
      }
      // Two ridged half-shells hinged at the back; the upper one lifts as the clam opens.
      const R = 1.7;
      const u = p.d * 2 - 1;
      const ridged = hash(p.i, 298) < 0.6 ? Math.round(u * 6) / 6 : u;
      const ang = (ridged * Math.PI) / 2;
      const v = Math.sqrt(hash(p.i, 291));
      const dome = 0.35 * R * v * (1 - v) + 0.05;
      const z = Math.cos(ang) * v * R - 0.5 * R;
      const x = Math.sin(ang) * v * R;
      if (p.b < 0.5) return [at[0] + x, at[1] + 0.3 - dome, at[2] + z];
      const th = 0.1 + 1.0 * open;
      const rz = z + 0.5 * R;
      return [
        at[0] + x,
        at[1] + 0.3 + dome * Math.cos(th) + rz * Math.sin(th),
        at[2] - 0.5 * R - dome * Math.sin(th) + rz * Math.cos(th),
      ];
    }
    case 'amphora': {
      // Lying on its side in the fork: a swelling body, a narrow neck, a flared mouth, two handles.
      const at = amphoraAt();
      const base = near(at, me, SWIM_W);
      const s = p.b;
      const len = 2.6;
      const r =
        s < 0.12
          ? 0.12
          : s < 0.75
            ? 0.15 + 0.5 * Math.sin((Math.PI * (s - 0.12)) / 0.63)
            : s > 0.95
              ? 0.3
              : 0.2;
      const ang = p.d * TAU;
      let local: Vec3 = [(s - 0.5) * len, Math.sin(ang) * r, Math.cos(ang) * r];
      if (hash(p.i, 282) < 0.0075) {
        // A handle: an arc from the neck to the shoulder.
        const w = hash(p.i, 299) * Math.PI;
        local = [
          (0.78 - 0.12 * Math.sin(w)) * len - 0.5 * len,
          0.2 + 0.35 * Math.sin(w),
          p.d < 0.5 ? -0.3 : 0.3,
        ];
      }
      const cs = Math.cos(0.4);
      const sn = Math.sin(0.4);
      return bursting(
        base,
        [local[0] * cs - local[2] * sn, local[1], local[0] * sn + local[2] * cs],
        burstOf('amphora', t),
      );
    }
    case 'coins': {
      const i = Math.floor(p.a * COINS);
      const base = near(coinAt(i), me, SWIM_W);
      const ang = p.d * TAU;
      const r = 0.45 * Math.sqrt(p.b);
      const spin = t * 2 + i;
      const lx = Math.cos(ang) * r;
      return bursting(
        base,
        [lx * Math.cos(spin), Math.sin(ang) * r, lx * Math.sin(spin)],
        burstOf(`coin${i}`, t),
      );
    }
    default: {
      const base = near(eggAt(), me, SWIM_W);
      const d = fibonacciSphere(p.i % 97, 97);
      const inner = hash(p.i, 300) < 0.4 ? 0.6 : 1;
      return bursting(
        base,
        [d[0] * 0.7 * inner, d[1] * 1.1 * inner, d[2] * 0.7 * inner],
        burstOf('egg', t),
      );
    }
  }
}
function treasureColour(part: TreasurePart, p: Particle, t: number, twinkle: number): RGB {
  switch (part) {
    case 'clam': {
      const c = Math.floor(p.a * CLAMS);
      const open = clamOpen(c);
      if (hash(p.i, 289) < 0.12)
        return scale(
          [1, 0.96, 0.9],
          (0.12 + 0.3 * open) * twinkle * burstLight(burstOf(`pearl${c}`, t)),
        );
      // The shells pale stone; the lip of the mantle, seen as it opens, shimmering teal to violet.
      const v = Math.sqrt(hash(p.i, 291));
      // (In the coral colours picked, as the rest of the reef is.)
      if (v > 0.85)
        return scale(
          mix(paint([0.35, 0.75, 0.85], 4), paint([0.6, 0.45, 1], 2), p.d),
          (0.08 + 0.3 * open) * twinkle,
        );
      return scale([0.75, 0.7, 0.6], 0.15 * twinkle);
    }
    case 'amphora': {
      const glint = 0.5 + 0.5 * Math.sin(2 * t);
      const tone = mix([0.85, 0.45, 0.25], [1, 0.85, 0.45], 0.25 * glint);
      return scale(tone, 0.28 * twinkle * burstLight(burstOf('amphora', t)));
    }
    case 'coins': {
      const i = Math.floor(p.a * COINS);
      return scale([1, 0.8, 0.35], 0.4 * twinkle * burstLight(burstOf(`coin${i}`, t)));
    }
    default: {
      const k = burstLight(burstOf('egg', t));
      if (hash(p.i, 300) < 0.4)
        return scale([0.4, 1, 0.8], 0.35 * (0.6 + 0.4 * Math.sin(1.6 * t)) * twinkle * k);
      return scale([0.5, 0.9, 0.8], 0.16 * twinkle * k);
    }
  }
}

/* ---------- currents: ribbons of moving water ---------- */
/*
 * CURRENTS (2026-11-11, the approved plan): a few ribbons of streaming light,
 * moving water you can see, that carry you fast once you are in them,
 * linking places: in the coral forest from the open reef to the tunnel's
 * mouth, and from its right exit up into the open water; in the open water
 * two long sweeps among the shoals; in the deep from the reef down over the
 * canyon's lip, and from the vents back up toward it.
 */
const CURRENT_WAYS: Vec3[][][] = [
  [
    [
      [52, -5, 80],
      [64, -7, 66],
      [76, -9, 54],
      [84, -11, 47],
    ],
    [
      [9, -11, 2],
      [14, -6, -10],
      [20, 4, -22],
      [26, 14, -34],
    ],
  ],
  [
    [
      [10, 6, 10],
      [30, 12, 20],
      [50, 10, 10],
      [70, 4, -5],
    ],
    [
      [20, 30, 60],
      [40, 24, 40],
      [60, 28, 25],
      [80, 34, 20],
    ],
  ],
  [
    [
      [70, -2, 20],
      [66, -8, 30],
      [60, -16, 40],
      [52, -30, 50],
    ],
    [
      [40, -104, 10],
      [38, -80, 0],
      [42, -50, -10],
      [46, -20, -20],
    ],
  ],
];
export const CURRENT_PUSH = 8;
const CURRENT_R = 4;
const CURRENT_SAMPLES = 48;
/** A Catmull-Rom curve through the four points of a current, as samples with their headings. */
const currentCache = new Map<string, { at: Vec3[]; f: Vec3[]; len: number }>();
function currentOf(s: number, i: number) {
  const key = `${s}:${i}`;
  const hit = currentCache.get(key);
  if (hit) return hit;
  const pts = (CURRENT_WAYS[s] as Vec3[][])[i] as Vec3[];
  const P = (k: number) => pts[Math.max(0, Math.min(pts.length - 1, k))] as Vec3;
  const at: Vec3[] = [];
  for (let n = 0; n <= CURRENT_SAMPLES; n++) {
    const x = (n / CURRENT_SAMPLES) * (pts.length - 1);
    const k = Math.min(pts.length - 2, Math.floor(x));
    const u = x - k;
    const [p0, p1, p2, p3] = [P(k - 1), P(k), P(k + 1), P(k + 2)];
    const c = (j: number) =>
      0.5 *
      (2 * (p1[j] as number) +
        (-(p0[j] as number) + (p2[j] as number)) * u +
        (2 * (p0[j] as number) -
          5 * (p1[j] as number) +
          4 * (p2[j] as number) -
          (p3[j] as number)) *
          u *
          u +
        (-(p0[j] as number) + 3 * (p1[j] as number) - 3 * (p2[j] as number) + (p3[j] as number)) *
          u *
          u *
          u);
    at.push([c(0), c(1), c(2)]);
  }
  const f = at.map((a, n) =>
    norm(sub(at[Math.min(n + 1, CURRENT_SAMPLES)] as Vec3, at[Math.max(n - 1, 0)] as Vec3)),
  );
  let len = 0;
  for (let n = 1; n < at.length; n++) len += Math.hypot(...sub(at[n] as Vec3, at[n - 1] as Vec3));
  const out = { at, f, len };
  currentCache.set(key, out);
  return out;
}
const currentsHere = () => (CURRENT_WAYS[sea] as Vec3[][]).length;
/** Where a current starts, on the field: for the tests. */
export const currentStart = (i: number) => currentOf(sea, i).at[2] as Vec3;

/** How a current pushes you at `pos`, units a second: along it, full in its middle, nothing past its edge. */
function currentPull(pos: Vec3): Vec3 {
  let best: Vec3 = [0, 0, 0];
  let most = 0;
  for (let i = 0; i < currentsHere(); i++) {
    const { at, f } = currentOf(sea, i);
    for (let n = 0; n < at.length; n++) {
      const q = near(at[n] as Vec3, pos, SWIM_W);
      const d = Math.hypot(q[0] - pos[0], q[1] - pos[1], q[2] - pos[2]);
      const w = smooth((CURRENT_R - d) / 2);
      if (w > most && n < at.length - 1) {
        most = w;
        best = scale(f[n] as RGB, CURRENT_PUSH * w) as Vec3;
      }
    }
  }
  return best;
}

/** A grain of a current: streaming along it in a loose tube; `u` how far along. */
function currentPoint(p: Particle, t: number, me: Vec3): { pos: Vec3; u: number } {
  const i = Math.floor(p.a * currentsHere());
  const { at, f, len } = currentOf(sea, i);
  const u = frac(hash(p.i, 292) + (t * CURRENT_PUSH * 0.8) / len);
  const n = Math.min(CURRENT_SAMPLES - 1, Math.floor(u * CURRENT_SAMPLES));
  const w = u * CURRENT_SAMPLES - n;
  const c = lerp3(at[n] as Vec3, at[n + 1] as Vec3, w);
  const fd = f[n] as Vec3;
  const side = norm(cross(fd, [0, 1, 0]));
  const up = cross(side, fd);
  const b = hash(p.i, 294) * TAU;
  const r = 1.2 * Math.sqrt(hash(p.i, 293));
  return { pos: near(add(add(c, side, Math.cos(b) * r), up, Math.sin(b) * r), me, SWIM_W), u };
}
function currentColour(p: Particle, t: number, twinkle: number, me: Vec3): RGB {
  const { u } = currentPoint(p, t, me);
  // Bands of light running along it, fading in at its start and out at its end.
  const band = (0.5 + 0.5 * Math.sin(u * 40 - t * 6 + p.a * 3)) ** 2;
  const ends = smooth(u / 0.1) * smooth((1 - u) / 0.1);
  const tone: RGB = sea === 2 ? [0.5, 0.8, 1] : [0.75, 0.95, 1];
  return scale(tone, 0.13 * (0.3 + 0.7 * band) * ends * twinkle);
}

/** Put your fish at `pos`, heading `yaw`, at the controls: for the tests. */
export function placeSwimmer(pos: Vec3, yaw = 0, pitch = 0) {
  swim.on = true;
  swim.pos = pos;
  swim.yaw = yaw;
  swim.pitch = pitch;
  swim.speed = SWIM_SPEED;
  swim.trail = [];
  swim.air = false;
  swim.vy = 0;
  swim.wing = 0;
  swim.tube = sea === 0 && tubeOf(pos).inside;
}

/* ---------- the Shark Sim's grains ---------- */

export const SWIM_CORALS = 16;
type SwimRole = 'floor' | 'sky' | 'polyp' | 'coral' | 'school' | 'you';
const swimRole = (p: Particle): SwimRole =>
  p.c < 0.08
    ? 'floor'
    : p.c < 0.2
      ? 'sky'
      : p.c < 0.3
        ? 'polyp'
        : p.c < 0.72
          ? 'coral'
          : p.c < 0.87
            ? 'school'
            : 'you';

/**
 * What grain p draws, with the rest of the picture: the tunnel takes a share of the coral forest's
 * corals; the visitors a share of the open water's and the deep's, and the grains a lone fish of
 * yours leaves spare (fewer grains on you, so you never glare); with Light on, the sand turns to
 * caustics and some snow to the waves of light above. The calamari take a few of the schools'
 * grains; the spray some snow while a splash or bubbles show; the surface more snow as you near it.
 */
type SwimPart =
  | SwimRole
  | 'tunnel'
  | 'redfish'
  | 'beam'
  | 'visitor'
  | 'caustic'
  | 'waves'
  | 'anemone'
  | 'clown'
  | 'tube'
  | 'current'
  | 'calamari'
  | 'spray'
  | 'surface'
  | TreasurePart;
/** How much the surface shows from below as you come up to it (all of it in the open water). */
const surfaceNear = (me: Vec3) => (sea === 1 ? 1 : smooth((me[1] - SKY_TOP + 24) / 10));
/** What grain p draws in the Shark Sim at time t: for the tests. */
export const swimPartOf = (p: Particle, t: number): string => swimPart(p, t);
function swimPart(p: Particle, t: number): SwimPart {
  const role = swimRole(p);
  switch (role) {
    case 'you':
      return swimNow().count === 1 && hash(p.i, 260) >= 0.4 ? 'visitor' : 'you';
    case 'school':
      return hash(p.i, 324) < 0.16 ? 'calamari' : role;
    case 'polyp':
    case 'coral': {
      if (sea === 0) {
        // The tunnel (an amphora in its fork, its red fish, its shafts of light), then the reef's
        // answering kinds, then the coral trees.
        if (hash(p.i, 240) < 0.5) {
          if (hash(p.i, 282) < 0.06) return 'amphora';
          const h = hash(p.i, 306);
          return h < 0.13 ? 'redfish' : h < 0.23 ? 'beam' : 'tunnel';
        }
        if (hash(p.i, 280) >= 0.35) return role;
        const r = hash(p.i, 281);
        return r < 0.5 ? 'anemone' : r < 0.65 ? 'clown' : r < 0.85 ? 'tube' : 'clam';
      }
      if (role === 'coral' && hash(p.i, 250) < 0.22) return 'visitor';
      if (sea === 2 && role === 'coral') {
        // Coins down the canyon from the lip's corals; the egg from the vents' grains.
        const deep = deepRole(p);
        if (deep === 'rim' && hash(p.i, 283) < 0.25) return 'coins';
        if (deep === 'vent' && hash(p.i, 283) < 0.12) return 'egg';
      }
      return role;
    }
    case 'floor':
      return light && sea === 0 && hash(p.i, 274) < 0.6 ? 'caustic' : role;
    case 'sky': {
      if (hash(p.i, 290) < 0.25) return 'current';
      if (!isSurface(p) && hash(p.i, 301) < 0.3 && sprayOn(t)) return 'spray';
      if (isSurface(p) && surfaceNear(swimmer(t).c) > 0) return 'surface';
      if (!light || sea === 2) return role;
      const h = hash(p.i, 270);
      return h < 0.45 ? 'waves' : sea === 0 && h < 0.65 ? 'caustic' : role;
    }
    default:
      return role;
  }
}

/** Coral j's place on the wrapping field, which garden colony it is, and how big; none under the tunnel. */
function swimSlot(j: number): { at: Vec3; colony: number; size: number } {
  const side = 4;
  const cell = SWIM_W / side;
  const x = ((j % side) + 0.2 + 0.6 * hash(j, 161)) * cell;
  const z = (Math.floor(j / side) + 0.2 + 0.6 * hash(j, 162)) * cell;
  // A coral that would stand in the tunnel's way grows just beside it instead.
  const dx = wrap(x - TUNNEL_X + SWIM_W / 2, SWIM_W) - SWIM_W / 2;
  const out = (dx < 0 ? -1 : 1) * (SPREAD + TUNNEL_R + 4 + 3 * hash(j, 165));
  return {
    at: [underTunnel(x, z) ? TUNNEL_X + out : x, FLOOR, z],
    colony: Math.floor(hash(j, 163) * COLONIES),
    size: 0.9 + 0.7 * hash(j, 164),
  };
}

/** Fish j of your school, or you alone: following your path a moment behind, in a loose lens. */
function youFish(j: number, t: number): { c: Vec3; f: Vec3 } {
  const me = swimNow();
  if (j === 0 || me.count === 1) return swimmer(t);
  const lag = 0.25 + 1.4 * hash(j, 168);
  const back = swim.on ? trailAt(t - lag, swim.trail) : autopilot(t - lag);
  const side = norm(cross(back.f, [0, 1, 0]));
  const up = cross(side, back.f);
  const ox = (hash(j, 169) - 0.5) * 6 + 0.3 * Math.sin(0.8 * t + j);
  const oy = (hash(j, 170) - 0.5) * 3;
  return { c: add(add(back.c, side, ox), up, oy), f: back.f };
}

/** Prey fish i drawn by grain p: shrinking to nothing as it is eaten. */
function preyPoint(i: number, p: Particle, t: number): Vec3 {
  const { c, f, len, shown } = preyAt(i, t);
  return fishAt(c, f, len * Math.max(shown, 0.02), p, t, i);
}

/** A coral of the field, or on the lip of the drop-off, grown and half in bloom. */
function fieldCoral(
  slot: { at: Vec3; colony: number; size: number },
  p: Particle,
  t: number,
  me: Vec3,
  polyp: boolean,
  wake = 0,
): Vec3 {
  const colony = corals()[slot.colony] as Colony;
  const at = near(slot.at, me, SWIM_W);
  const q = coralLocal(colony, p, 1, t, polyp, 0.5);
  const pos: Vec3 = [at[0] + q[0] * slot.size, at[1] + q[1] * slot.size, at[2] + q[2] * slot.size];
  if (wake <= 0) return pos;
  // Swaying in your wake: pushed the way you swim, more toward the top, a sea fan the most.
  const { f } = swimmer(t);
  const h = q[1] * slot.size;
  const k =
    wake * 0.05 * h * h * (colony.flat ? 2 : 1) * (0.7 + 0.3 * Math.sin(3 * t + slot.colony));
  return [pos[0] + f[0] * k, pos[1], pos[2] + f[2] * k];
}

/** The snow round you: spread through the water, wrapping up and down about you. */
function snowRound(p: Particle, t: number, me: Vec3): Vec3 {
  const pos = near([p.b * SWIM_W, 0, hash(p.i, 171) * SWIM_W], me, SWIM_W);
  const h = 70;
  pos[1] = me[1] + wrap(p.d * h - me[1] + h / 2 - t * 0.15, h) - h / 2;
  // None inside the sand or the rock: those wait, unseen, far below.
  if (pos[1] < floorAt(pos[0]) || (sea === 2 && pos[1] < FLOOR && !inCanyon(pos[0])))
    pos[1] = DEEP_FLOOR - 50;
  return pos;
}

function deepPoint(p: Particle, t: number, me: Vec3): Vec3 {
  switch (deepRole(p)) {
    case 'rim':
      return fieldCoral(rimSlot(Math.floor(p.a * RIM_CORALS)), p, t, me, hash(p.i, 207) < 0.25);
    case 'manta':
      return mantaAt(Math.floor(p.a * MANTAS), p, t, me);
    case 'squid': {
      const j = Math.floor(p.a * SQUIDS);
      const { c, f } = squidOf(j, t, me);
      return squidAt(c, f, 1, squidPull(j, t), p, t, j);
    }
    case 'giant': {
      const { c, f } = giantOf(t, me);
      return squidAt(c, f, 5, squidPull(0, t * 0.4), p, t * 0.5, 0);
    }
    default:
      return ventAt(p, t, me);
  }
}

/** The surface seen from below: a sheet of light rippling at the top of the water. */
function surfaceAt(p: Particle, t: number, me: Vec3): Vec3 {
  const pos = near([p.b * SWIM_W, 0, p.d * SWIM_W], me, SWIM_W);
  pos[1] = WATER + 0.5 * Math.sin(pos[0] * 0.3 + t * 0.8) * Math.cos(pos[2] * 0.27 - t * 0.6);
  return pos;
}

function swimPoint(p: Particle, t: number): Vec3 {
  const me = swimmer(t).c;
  const part = swimPart(p, t);
  // In a region some grains pour into its mantas or jellyfish, and back out as you leave.
  const zone = zoneFor(p, part, t);
  if (zone && zone.w >= 1) return zonePoint(p, t, zone);
  const pos = partPoint(part, p, t, me);
  return zone ? lerp3(pos, zonePoint(p, t, zone), smooth(zone.w)) : pos;
}

function partPoint(part: SwimPart, p: Particle, t: number, me: Vec3): Vec3 {
  switch (part) {
    case 'calamari':
      return calamariPoint(p, t, me);
    case 'spray':
      return sprayAt(p, t).pos;
    case 'surface': {
      // Out of the snow as you come up, all of it in the open water.
      const w = surfaceNear(me);
      const sheet = surfaceAt(p, t, me);
      return w >= 1 ? sheet : lerp3(snowRound(p, t, me), sheet, w);
    }
    case 'redfish': {
      const j = Math.floor(p.a * RED_FISH);
      const { c, f } = redFish(j, t, me);
      return fishAt(c, f, 0.9, p, t, j);
    }
    case 'beam':
      return beamAt(p, t, me).pos;
    case 'anemone':
      return anemonePoint(p, t, me);
    case 'clown': {
      const j = Math.floor(p.a * ANEMONES * CLOWNS_EACH);
      const { c, f } = anemoneClown(j, t, me);
      return fishAt(c, f, 0.7, p, t, j);
    }
    case 'tube':
      return tubePoint(p, t, me);
    case 'current':
      return currentPoint(p, t, me).pos;
    case 'clam':
    case 'amphora':
    case 'coins':
    case 'egg':
      return treasurePoint(part, p, t, me);
    case 'tunnel':
      return tunnelPoint(p, t, me, swimRole(p) === 'polyp');
    case 'visitor':
      return visitorPoint(p, t, me);
    case 'caustic':
      return causticAt(p, t, me).pos;
    case 'waves':
      return wavesAt(p, t, me).pos;
    case 'floor': {
      if (sea === 1) return rayAt(p, t, me).pos;
      if (sea === 2) return deepRockAt(p, me);
      const base: Vec3 = [p.b * SWIM_W, FLOOR + Math.sin(p.b * 60 + p.d * 40) * 0.25, p.d * SWIM_W];
      return near(base, me, SWIM_W);
    }
    case 'sky':
      // Snow among the corals, stars above, glints in the open water, sparks of light in the deep.
      return snowRound(p, t, me);
    case 'school':
      return preyPoint(Math.floor(p.a * SCHOOL_FISH), p, t);
    case 'you': {
      const kind = swimNow();
      const j = Math.floor(p.a * kind.count);
      const fish = youFish(j, t);
      const len = kind.len * (j === 0 ? 1 : 0.9 + 0.2 * hash(j, 172));
      const { c, f, gape } =
        j === 0 && kind.eats ? bitePose(fish.c, fish.f, len, t) : { ...fish, gape: 0 };
      // You, the one in front, bend into your turns and spread your wings in flight; the fish of
      // your school just follow.
      const sway = j === 0 ? swimSway() : STILL;
      return kind.kind === null
        ? fishAt(c, f, len, p, t, j, sway)
        : kindFishAt(
            SHOAL_KINDS[kind.kind] as ShoalKind,
            c,
            f,
            len,
            p,
            t,
            j,
            gape,
            sway,
            j === 0 ? swim.wing : 0,
          );
    }
    default: {
      if (sea === 1) return preyPoint(SCHOOL_FISH + Math.floor(p.a * BAIT_FISH), p, t);
      if (sea === 2) {
        if (swimRole(p) === 'polyp')
          return preyPoint(SCHOOL_FISH + BAIT_FISH + Math.floor(p.a * LANTERN_FISH), p, t);
        return deepPoint(p, t, me);
      }
      const j = Math.floor(p.a * SWIM_CORALS);
      return fieldCoral(swimSlot(j), p, t, me, swimRole(p) === 'polyp', hidden.coral[j] ?? 0);
    }
  }
}

/** A coral's colour on the field: fading toward the edge, where the field wraps round. */
function fieldCoralColour(
  slot: { at: Vec3; colony: number },
  me: Vec3,
  polyp: boolean,
  twinkle: number,
  light: number,
  wake = 0,
): RGB {
  const at = near(slot.at, me, SWIM_W);
  const edge = smooth((SWIM_W / 2 - Math.hypot(at[0] - me[0], at[2] - me[2])) / 12) * light;
  const tone = paint(CORAL_TONES[slot.colony] as RGB, slot.colony);
  // With you near, the polyps dim, and glow back as you go.
  return polyp
    ? scale(mix(tone, polypWhite(), 0.3), 0.95 * twinkle * edge * (1 - 0.7 * wake))
    : scale(tone, 0.7 * twinkle * edge * (1 - 0.2 * wake));
}

const HOT: RGB = [1, 0.42, 0.1];
const SMOKE: RGB = [0.42, 0.34, 0.5];
const GLOW_CYAN: RGB = [0.35, 1, 0.9];
const GLOW_BLUE: RGB = [0.4, 0.62, 1];
const SQUID_RED: RGB = [1, 0.42, 0.38];
const GIANT_RED: RGB = [0.85, 0.24, 0.2];

function deepColour(p: Particle, t: number, twinkle: number, me: Vec3): RGB {
  switch (deepRole(p)) {
    case 'rim':
      return fieldCoralColour(
        rimSlot(Math.floor(p.a * RIM_CORALS)),
        me,
        hash(p.i, 207) < 0.25,
        twinkle,
        1,
      );
    case 'manta': {
      // Dark backs and pale bellies, lit by what daylight reaches them, a faint pale edge to the wings.
      const m = Math.floor(p.a * MANTAS);
      const belly = Math.abs(p.b * 2 - 1) > 0.9 ? 1 : hash(p.i, 211);
      const tone = mix([0.22, 0.27, 0.36], [0.85, 0.9, 0.95], belly);
      return fishTint(
        scale(tone, (0.12 + 0.3 * daylight(mantaPath(m, mantaClock(m, t))[1])) * twinkle),
        m,
      );
    }
    case 'squid': {
      // Reddish, the colour cells flickering, a blue spark at each arm's tip.
      const tip = hash(p.i, 230) >= 0.62 && hash(p.i, 231) > 0.9;
      if (tip) return scale(GLOW_BLUE, 0.7 * twinkle);
      const flicker = 0.6 + 0.4 * Math.sin(5 * t + p.i * 0.7);
      return scale(SQUID_RED, 0.28 * flicker * twinkle);
    }
    case 'giant': {
      const seen = giantSeen(t);
      // Its great eye, pale, on the side of the mantle near the arms.
      const eye = hash(p.i, 230) < 0.5 && hash(p.i, 231) > 0.82 && hash(p.i, 231) < 0.9;
      if (eye) return scale([0.9, 0.95, 1], 0.6 * seen * twinkle);
      return scale(GIANT_RED, 0.26 * seen * twinkle);
    }
    default: {
      const q = hash(p.i, 216);
      switch (ventPart(p)) {
        case 'chimney':
          // Dark rock, glowing hot toward the mouth.
          return mix(
            scale([0.4, 0.32, 0.28], 0.1),
            scale(HOT, 0.8 * twinkle),
            smooth((q - 0.72) / 0.28),
          );
        case 'mat':
          return scale([1, 0.92, 0.65], 0.22 * twinkle);
        default: {
          const w = wrap(q * PLUME + t * 2.2, PLUME) / PLUME;
          return scale(mix(HOT, SMOKE, smooth(w / 0.5)), 0.55 * (1 - w) ** 1.5 * twinkle);
        }
      }
    }
  }
}

function swimColour(p: Particle, t: number, twinkle: number): RGB {
  const part = swimPart(p, t);
  const zone = zoneFor(p, part, t);
  if (zone && zone.w >= 1) return zoneColour(p, t, twinkle, zone);
  const own = partColour(part, p, t, twinkle);
  return zone ? mix(own, zoneColour(p, t, twinkle, zone), smooth(zone.w)) : own;
}

function partColour(part: SwimPart, p: Particle, t: number, twinkle: number): RGB {
  const me = swimmer(t).c;
  const up = altitude(me);
  const dark = 1 - daylight(me[1]);
  switch (part) {
    case 'calamari':
      return calamariColour(p, t, twinkle);
    case 'spray': {
      // Drops and rings white-blue; bubbles silver, a little dimmer.
      const { k } = sprayAt(p, t);
      return scale(
        hash(p.i, 304) < 0.5 ? [0.85, 0.95, 1] : SILVER,
        (hash(p.i, 304) < 0.5 ? 0.5 : 0.32) * k * twinkle,
      );
    }
    case 'surface': {
      const sheet = scale([0.75, 0.92, 1], (0.12 + 0.2 * up) * twinkle);
      const w = surfaceNear(me);
      return w >= 1 ? sheet : mix(partColour('sky', p, t, twinkle), sheet, w);
    }
    case 'redfish': {
      const j = Math.floor(p.a * RED_FISH);
      const { edge } = redFish(j, t, me);
      // Small and red, a paler belly; their own colours, or the fish colours picked.
      const belly = Math.sin(p.d * TAU) < -0.3;
      return fishTint(scale(belly ? [1, 0.55, 0.45] : [1, 0.22, 0.16], 0.38 * twinkle * edge), j);
    }
    case 'beam': {
      // Warm sunlight, a little golden.
      const { k } = beamAt(p, t, me);
      return scale([1, 0.93, 0.75], 0.16 * k * (0.7 + 0.3 * twinkle));
    }
    case 'anemone':
      return anemoneColour(p, twinkle);
    case 'clown':
      return fishTint(clownColour(p, twinkle), Math.floor(p.a * ANEMONES * CLOWNS_EACH));
    case 'tube':
      return tubeColour(p, twinkle);
    case 'current':
      return currentColour(p, t, twinkle, me);
    case 'clam':
    case 'amphora':
    case 'coins':
    case 'egg':
      return treasureColour(part, p, t, twinkle);
    case 'tunnel':
      return tunnelColour(p, me, swimRole(p) === 'polyp', twinkle);
    case 'visitor':
      return visitorColour(p, t, twinkle, me);
    case 'caustic': {
      // Soft lines of light on the sand, fainter the higher you swim above them.
      const { bead } = causticAt(p, t, me);
      return scale(mix(SUNLIGHT, [1, 0.97, 0.85], 0.5), 0.16 * (0.3 + 0.7 * bead) * (1 - 0.6 * up));
    }
    case 'waves': {
      const { bead } = wavesAt(p, t, me);
      return scale(SUNLIGHT, (0.12 + 0.1 * up) * (0.3 + 0.7 * bead) * twinkle);
    }
    case 'floor': {
      if (sea === 1) {
        const { s } = rayAt(p, t, me);
        const k = Math.floor(hash(p.i, 222) * RAYS);
        return scale(
          mix(SHAFT, [1, 0.95, 0.8], 0.3),
          0.2 * (1 - s) ** 1.5 * (0.6 + 0.4 * Math.sin(t * 0.9 + k * 2)),
        );
      }
      if (sea === 2)
        return scale([0.55, 0.5, 0.45], 0.14 * (0.2 + 0.8 * daylight(deepRockAt(p, me)[1])));
      return scale(SAND, 0.18 * (1 - 0.5 * up));
    }
    case 'sky': {
      if (snowRound(p, t, me)[1] < DEEP_FLOOR) return [0, 0, 0];
      if (sea === 2) {
        // Going down, the snow gives way to sparks: a few in three glow blue-green, flashing now and then.
        const bio = hash(p.i, 173) < 0.35;
        const flash = Math.max(0, Math.sin(t * 0.6 + p.i * 1.7)) ** 12;
        const tone = hash(p.i, 174) < 0.5 ? GLOW_CYAN : GLOW_BLUE;
        const spark = bio
          ? scale(tone, (0.12 + 0.8 * flash) * twinkle)
          : scale(SNOW, 0.04 * twinkle);
        return mix(scale(SNOW, 0.3 * twinkle), spark, dark);
      }
      if (sea === 1) {
        // Specks catching the sun, brighter near the surface.
        const glint = hash(p.i, 173) ** 8;
        return scale(mix(SNOW, [1, 0.95, 0.8], glint), (0.22 + 0.9 * glint + 0.1 * up) * twinkle);
      }
      // Up in the open water the snow becomes stars, a few brighter than the rest.
      const star = hash(p.i, 173) ** 6;
      return mix(scale(SNOW, 0.3 * twinkle), scale(STAR, (0.35 + 1.1 * star) * twinkle), up);
    }
    case 'school': {
      const i = Math.floor(p.a * SCHOOL_FISH);
      const s = i % SCHOOLS;
      const tone =
        s % 3 === 0
          ? mix(DEEP_BLUE, BLUE_FISH, 0.5 + 0.5 * Math.sin(p.d * TAU))
          : s % 3 === 1
            ? ([1, 0.82, 0.12] as RGB)
            : mix(SILVER, [0.42, 0.52, 0.6], 0.5);
      return fishTint(
        scale(tone, (0.3 + 0.1 * up) * (1 - 0.6 * dark) * twinkle * preyShown(i, t)),
        s,
      );
    }
    case 'you': {
      // Dimmed: you are close to the eye, and at full light you read as a white glare.
      const kind = swimNow();
      const j = Math.floor(p.a * kind.count);
      const dim = kind.count === 1 ? 0.55 : 0.8;
      // Calm, a soft warm glow grows on you.
      const glow = j === 0 ? scale([1, 0.85, 0.6], 0.1 * swim.calm * twinkle) : ([0, 0, 0] as RGB);
      if (kind.kind === null)
        return add(scale(fishTint(clownColour(p, twinkle), j), dim), glow) as RGB;
      const sk = SHOAL_KINDS[kind.kind] as ShoalKind;
      // The golden hammerhead stays gold whatever the fish colours.
      const own = kind.gold
        ? scale(
            mix([1, 0.72, 0.25], [1, 0.9, 0.6], 0.5 + 0.5 * Math.sin(p.d * TAU)),
            0.32 * twinkle,
          )
        : fishTint(shoalColour(p, twinkle, kind.kind, j, 0), j);
      const base = add(scale(own, dim), glow) as RGB;
      // Inside the open mouth: a dark rose, so the gape reads.
      if (j === 0 && kind.eats && p.b < JAW && isLowerJaw(p) && onBody(sk, p)) {
        const fish = youFish(0, t);
        const { gape } = bitePose(fish.c, fish.f, kind.len, t);
        return mix(base, scale([0.85, 0.35, 0.38], 0.3 * twinkle), smooth(gape / 0.6));
      }
      return base;
    }
    default: {
      if (sea === 1) {
        // Silver and blue, flashing pale whenever a fish's side turns to the sun; brighter higher up.
        const i = SCHOOL_FISH + Math.floor(p.a * BAIT_FISH);
        const { c, f, shown } = preyAt(i, t);
        const flash = Math.abs(f[0] * 0.6 + f[2] * 0.8) ** 6;
        const tone = mix(mix(DEEP_BLUE, BLUE_FISH, hash(i, 99)), LIGHT_BLUE, flash);
        const high = smooth((c[1] - FLOOR - 10) / 50);
        return fishTint(scale(tone, (0.2 + 0.4 * flash) * (0.75 + 0.5 * high) * shown), i);
      }
      if (sea === 2) {
        if (swimRole(p) === 'polyp') {
          // Lantern fish: dark bodies, rows of blue-green lights along their sides.
          const i = SCHOOL_FISH + BAIT_FISH + Math.floor(p.a * LANTERN_FISH);
          const shown = preyShown(i, t);
          return fishTint(
            hash(p.i, 175) < 0.4
              ? scale(GLOW_CYAN, 0.6 * twinkle * shown)
              : scale([0.3, 0.42, 0.55], 0.1 * shown),
            i,
          );
        }
        return deepColour(p, t, twinkle, me);
      }
      const j = Math.floor(p.a * SWIM_CORALS);
      return fieldCoralColour(
        swimSlot(j),
        me,
        swimRole(p) === 'polyp',
        twinkle,
        1,
        hidden.coral[j] ?? 0,
      );
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
    case 'swim':
      return swimPoint(p, t);
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
    case 'swim':
      return swimColour(p, t, twinkle);
    case 'coral':
      switch (coralRole(p)) {
        case 'floor':
          return scale(SAND, 0.18);
        case 'snow':
          return scale(SNOW, 0.35 * twinkle);
        case 'shaft':
          return scale(SHAFT, 0.18 * (0.4 + 0.6 * hash(p.i, 85)));
        default: {
          const c = Math.floor(p.a * COLONIES);
          const tone = paint(CORAL_TONES[c] as RGB, c);
          const seen = gardenSeen(gardenGrowth(c, Math.max(u, 0)));
          return coralRole(p) === 'polyp'
            ? scale(mix(tone, polypWhite(), 0.35), 0.85 * twinkle * seen)
            : scale(tone, 0.6 * twinkle * seen);
        }
      }
    case 'fans':
    case 'tables':
    case 'fish-pulse': {
      const role = PHASES[k]?.id === 'fish-pulse' ? pulseRole(p) : coralRole(p);
      if (role === 'floor') return scale(SAND, 0.18);
      if (role === 'snow') return scale(SNOW, 0.35 * twinkle);
      if (role === 'shaft') return scale(SHAFT, 0.18 * (0.4 + 0.6 * hash(p.i, 85)));
      const red = PHASES[k]?.id === 'fish-pulse' && pulseKind === 1;
      if (role === 'fish') {
        // Small warm yellow fish in the red garden, each a touch warmer or paler.
        const j = Math.floor(p.a * CLOWNS);
        if (red)
          return fishTint(
            scale(mix([1, 0.85, 0.32], [1, 0.68, 0.2], hash(j, 147)), 0.42 * twinkle),
            j,
          );
        return fishTint(clownColour(p, twinkle), j);
      }
      if (role === 'hunter') {
        // The hammerhead grey; elsewhere blue along the back, silver on the belly.
        if (red)
          return fishTint(
            scale(
              mix([0.86, 0.89, 0.92], [0.5, 0.56, 0.62], 0.5 + 0.5 * Math.sin(p.d * TAU)),
              0.36 * twinkle,
            ),
          );
        return fishTint(
          scale(mix(SILVER, DEEP_BLUE, 0.5 + 0.5 * Math.sin(p.d * TAU)), 0.4 * twinkle),
        );
      }
      if (role === 'rock') return scale(STAR, (0.3 + 0.25 * hash(p.i, 148) ** 3) * twinkle);
      const tones =
        PHASES[k]?.id === 'fans'
          ? FAN_TONES
          : PHASES[k]?.id === 'tables'
            ? TABLE_TONES
            : red
              ? RED_TONES
              : HOME_TONES;
      const ti = Math.floor(p.a * tones.length * 0.999);
      const tone = paint(tones[ti] as RGB, ti);
      return role === 'polyp'
        ? scale(mix(tone, polypWhite(), 0.35), 0.85 * twinkle)
        : scale(tone, 0.6 * twinkle);
    }
    case 'shoal':
      if (shoalRole(p) !== 'snow')
        return fishTint(shoalColour(p, twinkle), Math.floor(p.a * kindNow().count));
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
      return fishTint(scale(tone, 0.2 + 0.5 * flash), j);
    }
    case 'jellyfish': {
      if (p.c < 0.1) return scale(SNOW, 0.3 * twinkle);
      const j = Math.floor(p.a * jellyNow().count);
      const { edge } = kindTop(j, t);
      const form = jellyForm(j);
      const base =
        form === 0
          ? jellyColour(p, pulseOf(j, t), twinkle, edge)
          : kindJellyColour(p, jellyPull(j, t), twinkle, edge, t, form);
      if (jellyKind !== LANTERNS) return base;
      const rim = form === 0 ? jellyPart(p) === 'rim' : form === 4 ? p.d >= 0.6 : false;
      return lanternColour(j, base, rim);
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
          return fishTint(
            scale(mix(BLUE_FISH, SILVER, frac(p.a * 7)), 0.3 * twinkle * h),
            Math.floor(p.a * REEF_FISH),
          );
        case 'jelly': {
          const j = Math.floor(p.a * REEF_JELLIES);
          return jellyColour(p, pulseOf(j, t), twinkle, h);
        }
        default: {
          const slot = reefSlot(Math.floor(p.a * REEF_SLOTS));
          const tone = paint(CORAL_TONES[slot.colony] as RGB, slot.colony);
          const bloom = bloomAt(d);
          // A coral not yet grown is a tight knot of grains: kept dark until it starts to grow, so the
          // far end of the channel has no bright dots (2026-11-11: "I don't like the dots of light in
          // the distance for the reef, for the corals that haven't grown yet. they are too bright").
          const seen = h * smooth((grownAt(d) - 0.08) / 0.35);
          return reefRole(p) === 'polyp'
            ? scale(
                mix(tone, polypWhite(), 0.35 - 0.15 * bloom),
                (0.85 + 0.5 * bloom) * twinkle * seen,
              )
            : scale(tone, 0.6 * twinkle * seen);
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
    case 'swim': {
      // Behind you and a little above, looking past you the way you swim; closer in the tunnel, and
      // kept level in flight so the leap and the dive read.
      const { c, f: way } = swimmer(t);
      const f = swim.air ? norm([way[0], way[1] * 0.3, way[2]]) : way;
      const d = swimNow().cam * (1 - 0.4 * swim.tubeIn);
      const eye = add(add(c, f, -d), [0, 1, 0], d * (0.32 - 0.14 * swim.tubeIn));
      eye[1] = Math.max(floorAt(c[0]) + 1, eye[1]);
      return { eye, target: add(c, f, 5) };
    }
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
  ['fish-pulse', { label: 'Garden', names: PULSE_NAMES, set: setPulseKind }],
  ['swim', { label: 'Your fish', names: SWIM_NAMES, set: setSwimKind }],
]);
const variantsOf = (k: number) => VARIANTS.get(PHASES[k]?.id ?? '');
export const hasVariants = (k: number) => variantsOf(k) !== undefined;
export const variantNames = (k: number) =>
  PHASES[k]?.id === 'swim' ? swimNames() : (variantsOf(k)?.names ?? []);
export const variantLabel = (k: number) => variantsOf(k)?.label ?? '';
/** Look i on piece k; with no piece, as in the Journey, every piece back to its first. */
export function setVariant(i: number, k?: number) {
  if (k === undefined) for (const v of VARIANTS.values()) v.set(0);
  else variantsOf(k)?.set(i);
}
/** The Shark Sim's sea, the second row of pills; with no piece, as in the Journey, the coral forest. */
export function setSeaOf(i: number, k?: number) {
  setSea(k !== undefined && hasSeas(k) ? i : 0);
}
