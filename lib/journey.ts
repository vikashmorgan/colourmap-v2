/*
 * THE JOURNEY — after the Big Bang (docs/specs/art-journey.md).
 *
 * 2026-11-09: "a deep journey into the tree. from bacteria to cells to living
 * creatures in swarms like fish. to trees to pulses and currents to roots",
 * and "mix with words and philosophy and organisation and meaning ... nature,
 * technology and what is sacred, and why this is a pivotal moment".
 *
 * Built the way the Big Bang is (lib/bigbang.ts): every grain of light is one
 * particle with a fixed identity, each step is a formula from a particle and
 * the time to a place and a colour, and between steps each grain pours to its
 * next place at its own golden-ratio moment. So the grain that is part of a
 * bacterium is later part of a cell, a fish, the sap, a pulse, a root and
 * the seed: one life, organised in more and more ways.
 *
 * Unlike the Big Bang the eye travels, so each step also says where the
 * camera stands and what it looks at. The tree, its pulses and its roots are
 * drawn on the Star Tree's routes (lib/star-tree.ts), as on the G menu.
 *
 * Pure: no three.js, no DOM.
 */

import {
  clamp01,
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
  along,
  buildStarTree,
  FOOT_Y,
  grow,
  type Route,
  resample,
  routeLength,
  type Seg,
  sampleChain,
  seeded,
} from './star-tree';

export { makeParticles, type Particle };

const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const mix = (a: RGB, b: RGB, t: number): RGB => lerp3(a, b, t) as RGB;
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const wrap = (x: number, n: number) => ((x % n) + n) % n;
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/* ---------- the steps, with their words ---------- */

/** What each step's words are about: the five threads of the journey. */
export type Thread = 'Nature' | 'Organisation' | 'Technology' | 'Sacred' | 'Now';

export interface JourneyPhase extends Phase {
  thread: Thread;
  /** A short reflection, shown a line at a time over the picture. */
  words: string[];
}

export const PHASES: JourneyPhase[] = [
  {
    id: 'sea',
    name: 'Warm sea',
    line: 'After the Big Bang, light cools into a warm sea. Grains drift on its currents.',
    thread: 'Nature',
    words: [
      'Before anything was alive, things already moved together.',
      'A current is the first kind of order: no plan, only flow.',
      'Every grain you will follow is made of this sea.',
    ],
    duration: 22,
    glow: 0.95,
    size: 0.9,
  },
  {
    id: 'bacteria',
    name: 'Bacteria',
    line: 'The grains gather into the first life: tiny rods that swim, tumble, and split in two.',
    thread: 'Organisation',
    words: [
      'Life begins small, and many.',
      'Bacteria talk in chemistry, and act only when enough of them agree.',
      'Deciding together is older than any city.',
    ],
    duration: 30,
    glow: 1,
    size: 0.8,
  },
  {
    id: 'veins',
    name: 'Veins',
    line: 'The swimmers stream into a branching network, reaching out like a mould in search of food.',
    thread: 'Organisation',
    words: [
      'A mould with no brain once grew a network much like the railways around Tokyo.',
      'It found, by feeling its way, the paths engineers had planned.',
      'Networks were not invented. They were noticed.',
    ],
    duration: 26,
    glow: 1.1,
    size: 0.8,
  },
  {
    id: 'cells',
    name: 'Cells',
    line: 'One cell divides: 2, 4, 8, 16, 32, into a hollow ball, the start of a body.',
    thread: 'Sacred',
    words: [
      'Long ago one cell let another live inside it, and both became more.',
      'Every cell in you still carries that agreement.',
      'A body is made by cooperation before it is made by competition.',
    ],
    duration: 34,
    glow: 1,
    size: 0.9,
  },
  {
    id: 'swarm',
    name: 'Swarm',
    line: 'The ball opens and every cell becomes a fish. The school turns as one, splits, finds itself, and spirals.',
    thread: 'Organisation',
    words: [
      'A school has no leader. Each fish follows only its nearest neighbours,',
      'and thousands turn as one.',
      'Intelligence can live between us, not only inside us.',
    ],
    duration: 38,
    glow: 1,
    size: 0.85,
  },
  {
    id: 'tree',
    name: 'Tree',
    line: 'The school dives to the floor and climbs back up as a tree, every fish a grain of sap.',
    thread: 'Nature',
    words: [
      'A tree climbs toward the light for centuries, in no hurry.',
      'Many cultures pictured the world as a tree:',
      'roots below, branches above, and us in between.',
    ],
    duration: 30,
    glow: 1.05,
    size: 0.85,
  },
  {
    id: 'pulses',
    name: 'Pulses',
    line: 'Into the trunk. Water climbs, sugar falls, and a pulse runs out to every leaf.',
    thread: 'Technology',
    words: [
      'No pump lifts the water: the sun pulls it up through every leaf.',
      'Our machines run on pulses too: current, signal, data.',
      'The question was never whether we pulse, but what our pulses carry.',
    ],
    duration: 32,
    glow: 1.25,
    size: 0.8,
  },
  {
    id: 'roots',
    name: 'Roots',
    line: 'Below the ground the roots spread and meet the roots of other trees: one network under the forest.',
    thread: 'Sacred',
    words: [
      'Under the forest, roots and fungi pass sugar and warnings from tree to tree.',
      'One of the oldest networks on Earth is underground, and it shares.',
      'Perhaps the sacred is simply what keeps the whole alive.',
    ],
    duration: 32,
    glow: 1,
    size: 0.8,
  },
  {
    id: 'seed',
    name: 'Seed',
    line: 'All the light runs back along the roots into one seed. It waits, then opens into the sea again.',
    thread: 'Now',
    words: [
      'Today one species can edit the code of life and build minds that learn.',
      'For the first time, what grows next is partly in our hands.',
      'Like a seed, this moment holds a whole tree. What grows depends on what we put inside.',
    ],
    duration: 24,
    glow: 0.8,
    size: 1,
  },
];

export const TOTAL = PHASES.reduce((s, p) => s + p.duration, 0);
export const PHASE_START: number[] = PHASES.map((_, i) =>
  PHASES.slice(0, i).reduce((s, p) => s + p.duration, 0),
);

/** Which step a moment of the journey is in, and how far through it (0..1). */
export function phaseAt(time: number): { index: number; u: number } {
  const t = wrap(time, TOTAL);
  let index = PHASES.length - 1;
  for (let i = 0; i < PHASES.length; i++) {
    if (t < (PHASE_START[i] as number) + (PHASES[i] as JourneyPhase).duration) {
      index = i;
      break;
    }
  }
  return {
    index,
    u: (t - (PHASE_START[index] as number)) / (PHASES[index] as JourneyPhase).duration,
  };
}

/** One colour per step, for the step bar. */
export const STEP_COLOURS = [
  '#d9a35c',
  '#b8e05a',
  '#f0b44a',
  '#f2d6c0',
  '#c9d6c2',
  '#c4a060',
  '#ffcf6a',
  '#b0885a',
  '#fff1c8',
];

/**
 * How much of a step's reflection is showing, line by line: each line fades
 * in after the step has formed, and all of them go before the next step.
 */
export function wordsShown(u: number, lines: number): number[] {
  return Array.from({ length: lines }, (_, k) => {
    const start = 0.12 + k * 0.14;
    return smooth((u - start) / 0.08) * smooth((0.9 - u) / 0.06);
  });
}

/* ---------- where things stand ---------- */

/** The tree stands with its foot here; everything below is the ground. */
export const GROUND = -16;
/** Star Tree units to the journey's. */
const S = 22;
const toWorld = (x: number, y: number): [number, number] => [x * S, GROUND + (y - FOOT_Y) * S];

/** A gentle flow with no centre: a few sines, the field warped through itself. */
function current(x: number, y: number, z: number, t: number, amp: number): Vec3 {
  let px = x;
  let py = y;
  for (let k = 0; k < 3; k++) {
    const vx = Math.sin(0.13 * py + 0.31 * t) + 0.6 * Math.sin(0.27 * py - 0.17 * px + 0.23 * t);
    const vy = Math.sin(0.11 * px - 0.27 * t) + 0.6 * Math.cos(0.21 * px + 0.19 * py - 0.29 * t);
    px += vx * amp;
    py += vy * amp;
  }
  return [px, py, z + Math.sin(0.09 * x + 0.17 * t) * amp * 2];
}

/* 1. The warm sea: grains spread through a slab of water, carried by the current. */
function seaPoint(p: Particle, t: number): Vec3 {
  const x = (p.a - 0.5) * 72;
  const y = (p.b - 0.5) * 44;
  const z = (p.c - 0.5) * 34;
  return current(
    x + Math.sin(t * 0.07 + p.d * TAU) * 3,
    y + Math.cos(t * 0.05 + p.c * TAU) * 2,
    z,
    t * 0.5,
    2.2,
  );
}

/* 2. Bacteria: rods with a tail, each swimming its own loop, splitting in two. */
export const BACTERIA = 144;
function bacteriumCentre(j: number, t: number): Vec3 {
  const hx = (hash(j, 11) - 0.5) * 56;
  const hy = (hash(j, 12) - 0.5) * 32;
  const hz = (hash(j, 13) - 0.5) * 16;
  const w1 = 0.25 + 0.2 * hash(j, 14);
  const w2 = 0.31 + 0.2 * hash(j, 15);
  const r = 3 + 3 * hash(j, 16);
  return [
    hx + r * Math.sin(w1 * t + j),
    hy + r * 0.7 * Math.sin(w2 * t + j * 1.7),
    hz + r * 0.5 * Math.cos(w1 * t * 0.8 + j),
  ];
}
function bacteriumPoint(p: Particle, u: number, t: number): Vec3 {
  const j = Math.floor(p.a * BACTERIA);
  const c = bacteriumCentre(j, t);
  // It points the way it swims.
  const ahead = bacteriumCentre(j, t + 0.15);
  const f = norm([ahead[0] - c[0], ahead[1] - c[1], ahead[2] - c[2]]);
  const side = norm(cross(f, [0, 0, 1]));
  const up = cross(side, f);
  const L = 1.6;
  // Binary fission: the rod stretches, pinches and parts.
  const split = smooth((u - 0.4) / 0.35);
  let along = 0;
  let r = 0;
  if (p.c < 0.18) {
    // The tail, a beating wave behind the rod.
    const s = p.b;
    along = -L / 2 - s * 1.5;
    const wave = Math.sin(14 * s - 9 * t + j) * 0.25 * s;
    return [
      c[0] + f[0] * along + side[0] * wave,
      c[1] + f[1] * along + side[1] * wave,
      c[2] + f[2] * along + side[2] * wave,
    ];
  }
  const s = p.b - 0.5;
  along = s * L * (1 + 0.6 * split) + Math.sign(s) * split * 0.9;
  // Rounded ends: thinner towards the caps.
  r = 0.32 * Math.sqrt(p.d) * Math.sqrt(Math.max(0.05, 1 - (2 * s) ** 2));
  const a = p.c * TAU * 7;
  return [
    c[0] + f[0] * along + (side[0] * Math.cos(a) + up[0] * Math.sin(a)) * r,
    c[1] + f[1] * along + (side[1] * Math.cos(a) + up[1] * Math.sin(a)) * r,
    c[2] + f[2] * along + (side[2] * Math.cos(a) + up[2] * Math.sin(a)) * r,
  ];
}

/* 3. Veins: a network grown out from the middle in every direction, like a mould. */
let veinRoutes: Route[] | null = null;
export function veins(): Route[] {
  if (veinRoutes) return veinRoutes;
  const rng = seeded(31);
  const out: Seg[][] = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU + (rng() - 0.5) * 0.3;
    grow(rng, 0, 0, a, 0.2, 0.03, 5, 0.5, 0.8, [], out);
  }
  veinRoutes = out.map((chain) => resample(sampleChain(chain, false)));
  return veinRoutes;
}
function veinPoint(p: Particle, u: number, t: number): Vec3 {
  const routes = veins();
  const r = routes[Math.floor(p.a * routes.length)] as Route;
  const len = routeLength(r);
  // Food found at the tips: a few grains rest there and glow.
  const reach = 0.25 + 0.75 * smooth(u / 0.35);
  const s = p.c < 0.12 ? len * reach : wrap(p.b * len + t * 0.12, len) * reach;
  const [x, y, w] = along(r, s);
  const k = 26;
  const off = (p.d - 0.5) * w * 2 * k;
  return [x * k + off, y * k * 0.8 - off * 0.3, Math.sin(x * 4 + y * 3 + t * 0.3) * 3];
}

/* 4. Cells: one cell divides five times, 2 to 32, and the 32 open into a hollow ball. */
const DIVISIONS = 5;
const cellRadius = (level: number) => 6 * 2 ** (-level / 3);
/** Each division splits along the next axis, as a real embryo cleaves. */
const AXES: Vec3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [0.7, 0.7, 0],
  [0, 0.7, 0.7],
];
function cellCentre(a: number, level: number): Vec3 {
  let c: Vec3 = [0, 0, 0];
  for (let L = 1; L <= level; L++) {
    const bit = Math.floor(a * 2 ** L) % 2 === 0 ? -1 : 1;
    const ax = AXES[(L - 1) % AXES.length] as Vec3;
    const d = cellRadius(L) * 0.95 * bit;
    c = [c[0] + ax[0] * d, c[1] + ax[1] * d, c[2] + ax[2] * d];
  }
  return c;
}
function cellPoint(p: Particle, u: number, t: number): Vec3 {
  const lv = clamp01(u / 0.4) * DIVISIONS;
  const L = Math.min(DIVISIONS - 1, Math.floor(lv));
  const f = smooth(lv - L);
  let c = lerp3(cellCentre(p.a, L), cellCentre(p.a, L + 1), f);
  const r = cellRadius(lv);
  // The ball hollows: the 32 cells move out onto one sphere.
  const hollow = smooth((u - 0.42) / 0.13);
  if (hollow > 0) {
    const out = norm(c);
    c = lerp3(c, [out[0] * 7.5, out[1] * 7.5, out[2] * 7.5], hollow);
  }
  // In each cell: its membrane, the cytoplasm turning slowly, and a nucleus.
  const th = Math.acos(1 - 2 * p.b);
  const ph = p.d * TAU + (p.c > 0.45 ? t * 0.4 : 0);
  const k = p.c < 0.45 ? 1 : p.c < 0.8 ? 0.85 * Math.cbrt(p.b) : 0.3;
  const local: Vec3 = [
    Math.sin(th) * Math.cos(ph) * r * k,
    Math.cos(th) * r * k,
    Math.sin(th) * Math.sin(ph) * r * k,
  ];
  const turn = t * 0.15;
  const x = c[0] + local[0];
  const z = c[2] + local[2];
  return [
    x * Math.cos(turn) - z * Math.sin(turn),
    c[1] + local[1],
    x * Math.sin(turn) + z * Math.cos(turn),
  ];
}

/* 5. Swarm: a school of fish along a looping path, splitting in three, then a ball. */
export const FISH = 89;
function schoolPath(tau: number): Vec3 {
  const r = 17 + 6 * Math.cos(3 * tau);
  return [r * Math.cos(2 * tau), 9 * Math.sin(3 * tau), r * Math.sin(2 * tau) * 0.6];
}
function fishFrame(j: number, u: number, t: number): { c: Vec3; f: Vec3 } {
  // Three groups part and find each other again.
  const g = j % 3;
  const part = Math.sin(Math.PI * clamp01((u - 0.06) / 0.32));
  const tau = 0.16 * t - hash(j, 21) * 0.45 + (g - 1) * 0.7 * part;
  const at = schoolPath(tau);
  const next = schoolPath(tau + 0.01);
  const f = norm([next[0] - at[0], next[1] - at[1], next[2] - at[2]]);
  const side = norm(cross(f, [0, 1, 0]));
  const up = cross(side, f);
  const rho = 5 * Math.sqrt(hash(j, 22)) * (1 + 0.25 * Math.sin(t * 0.6));
  const al = hash(j, 23) * TAU + 0.3 * t;
  const school: Vec3 = [
    at[0] + (side[0] * Math.cos(al) + up[0] * Math.sin(al)) * rho,
    at[1] + (side[1] * Math.cos(al) + up[1] * Math.sin(al)) * rho,
    at[2] + (side[2] * Math.cos(al) + up[2] * Math.sin(al)) * rho,
  ];
  // The bait ball: every fish on its own tilted orbit round one point.
  const ball = smooth((u - 0.4) / 0.14);
  if (ball <= 0) return { c: school, f };
  const tilt = hash(j, 24) * Math.PI;
  const R = 7 + 3.5 * hash(j, 25);
  const w = 0.9 + 0.4 * hash(j, 26);
  const an = w * t + hash(j, 27) * TAU;
  const orbit = (a: number): Vec3 => [
    Math.cos(a) * R,
    Math.sin(a) * R * Math.cos(tilt),
    Math.sin(a) * R * Math.sin(tilt),
  ];
  const o = orbit(an);
  const o2 = orbit(an + 0.05);
  const fo = norm([o2[0] - o[0], o2[1] - o[1], o2[2] - o[2]]);
  return { c: lerp3(school, o, ball), f: norm(lerp3(f, fo, ball)) };
}
function fishPoint(p: Particle, u: number, t: number): Vec3 {
  const j = Math.floor(p.a * FISH);
  const { c, f } = fishFrame(j, u, t);
  const side = norm(cross(f, [0, 1, 0]));
  const up = cross(side, f);
  const len = 3;
  // Head at s = 0, tail at s = 1; the eye is a bright grain at the head.
  const s = p.c < 0.06 ? 0.04 : p.b;
  const body = 0.5 * Math.sin(Math.PI * Math.min(1, s ** 0.7 * 1.05));
  const wag = 0.35 * Math.sin(9 * t + j * 1.3 - 6 * s) * s * s;
  const a = p.d * TAU;
  const back = len * (0.5 - s);
  const lat = Math.cos(a) * body + wag;
  const ver = Math.sin(a) * body * 0.7;
  return [
    c[0] + f[0] * back + side[0] * lat + up[0] * ver,
    c[1] + f[1] * back + side[1] * lat + up[1] * ver,
    c[2] + f[2] * back + side[2] * lat + up[2] * ver,
  ];
}

/* 6–7. The tree: the Star Tree, each route turned round the trunk so the crown is round. */
let treeRoutes: Route[] | null = null;
export function tree(): Route[] {
  if (!treeRoutes) treeRoutes = buildStarTree(8, 7, false).routes;
  return treeRoutes;
}
/** A point of route `r` (of `n`) at `s`, in the journey's space, `across` -1..1 over its width. */
function onTree(r: number, n: number, route: Route, s: number, across: number, t: number): Vec3 {
  const [x, y, w] = along(route, s);
  const fan = (r / Math.max(1, n - 1) - 0.5) * Math.PI * 0.9 + t * 0.04;
  const [X, Y] = toWorld(x + (across * w) / 2, y);
  return [X * Math.cos(fan), Y, X * Math.sin(fan)];
}
function treePoint(p: Particle, u: number, t: number): Vec3 {
  const routes = tree();
  const r = Math.floor(p.a * routes.length);
  const route = routes[r] as Route;
  const len = routeLength(route);
  // It grows up out of the floor in the first part of the step.
  const grown = 0.05 + 0.95 * smooth(u / 0.4);
  const leaf = p.c > 0.86;
  const s = leaf ? len * grown : wrap(p.b * len + t * 0.09 * (0.7 + 0.6 * p.c), len) * grown;
  const pos = onTree(r, routes.length, route, s, (p.d - 0.5) * 2, t);
  if (!leaf) return pos;
  // Leaves: a small cloud at each tip.
  const g = 0.9 * Math.sqrt(p.b);
  const a = p.d * TAU * 3;
  return [pos[0] + Math.cos(a) * g, pos[1] + Math.sin(a) * g * 0.8, pos[2] + Math.sin(a * 1.7) * g];
}
/** The heartbeat in the tree: a smooth swell every 3.2 seconds (as the life tree's). */
const breath = (t: number) => 0.5 - 0.5 * Math.cos((TAU * t) / 3.2);
function pulsePoint(p: Particle, _u: number, t: number): Vec3 {
  const routes = tree();
  const r = Math.floor(p.a * routes.length);
  const route = routes[r] as Route;
  const len = routeLength(route);
  // Half the grains climb (water), half come down (sugar); both surge on the beat.
  const up = p.c < 0.55;
  const go = t * 0.16 * (1 + 0.5 * breath(t)) * (0.8 + 0.4 * p.d);
  const s = wrap(p.b * len + (up ? go : -go), len);
  return onTree(r, routes.length, route, s, (p.d - 0.5) * 1.4, t);
}

/* 8. Roots: the tree's roots, two neighbours' roots, and the threads between them. */
type RootNet = { routes: Route[]; main: number; neighbours: number };
let rootNet: RootNet | null = null;
const NEIGHBOUR_X = 1.9;
export function roots(): RootNet {
  if (rootNet) return rootNet;
  const rng = seeded(17);
  const grown = (x: number, depth: number, len: number): Seg[][] => {
    const out: Seg[][] = [];
    for (const a of [-0.95, -0.45, 0, 0.45, 0.95]) {
      grow(rng, x, FOOT_Y, Math.PI + a + (rng() - 0.5) * 0.2, len, 0.05, depth, 0.55, 0.8, [], out);
    }
    return out;
  };
  const main = grown(0, 6, 0.2);
  const others = [...grown(-NEIGHBOUR_X, 5, 0.16), ...grown(NEIGHBOUR_X, 5, 0.16)];
  const tip = (c: Seg[]) => c[c.length - 1] as Seg;
  // Threads: from tips of the main roots to the nearest tip of a neighbour, sagging a little.
  const threads: Route[] = [];
  for (let i = 0; i < main.length && threads.length < 28; i += 2) {
    const a = tip(main[i] as Seg[]);
    let best: Seg | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const o of others) {
      const b = tip(o);
      const d = Math.hypot(b.x1 - a.x1, b.y1 - a.y1);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    if (!best || bestD > 1.6) continue;
    const raw: number[] = [];
    for (let k = 0; k <= 24; k++) {
      const q = k / 24;
      const sag = Math.sin(Math.PI * q) * 0.12;
      raw.push(lerp(a.x1, best.x1, q), lerp(a.y1, best.y1, q) - sag, 0.004);
    }
    threads.push(resample(raw));
  }
  const toRoutes = (cs: Seg[][]) => cs.map((c) => resample(sampleChain(c, false)));
  const mainR = toRoutes(main);
  const othersR = toRoutes(others);
  rootNet = {
    routes: [...mainR, ...othersR, ...threads],
    main: mainR.length,
    neighbours: othersR.length,
  };
  return rootNet;
}
function rootRoute(p: Particle): { route: Route; kind: 'main' | 'other' | 'thread'; r: number } {
  const net = roots();
  const threads = net.routes.length - net.main - net.neighbours;
  // Most grains in the tree's own roots, the rest in its neighbours and the threads.
  const kind = p.c < 0.62 ? 'main' : p.c < 0.84 || threads === 0 ? 'other' : 'thread';
  const from = kind === 'main' ? 0 : kind === 'other' ? net.main : net.main + net.neighbours;
  const n = kind === 'main' ? net.main : kind === 'other' ? net.neighbours : threads;
  const r = from + Math.floor(p.a * n);
  return { route: net.routes[r] as Route, kind, r };
}
function rootPoint(p: Particle, u: number, t: number, back = 0): Vec3 {
  const { route, kind, r } = rootRoute(p);
  const len = routeLength(route);
  // The roots reach down in the first part of the step.
  const reach = 0.08 + 0.92 * smooth(u / 0.35);
  const dir = kind === 'thread' && p.d < 0.5 ? -1 : 1;
  let s = wrap(p.b * len + dir * t * 0.07, len) * reach;
  // Running back: every grain slides up its root toward the foot.
  s *= 1 - back;
  const [x, y0, w] = along(route, s);
  // A root that curls upward is turned back down: nothing of it shows above the ground.
  const y = y0 > FOOT_Y ? 2 * FOOT_Y - y0 : y0;
  const [X, Y] = toWorld(x + (p.d - 0.5) * w, y);
  const z = (hash(r, 41) - 0.5) * 14 * Math.min(1, Math.abs(x) * 2) + Math.sin(y * 9 + r) * 1.5;
  return [X, Y, z];
}
/** A few grains are the ground itself: a line of soil the roots hang from. */
function groundPoint(p: Particle, t: number): Vec3 {
  return [(p.b - 0.5) * 110, GROUND + Math.sin(p.b * 40 + t * 0.2) * 0.25, (p.d - 0.5) * 40];
}

/* 9. The seed: the grains run back up the roots and gather into one seed, which beats. */
export const SEED: Vec3 = [0, GROUND - 1.5, 0];
/** Inside the seed, a tree in small: "this moment holds a whole tree". */
const inSeedTree = (p: Particle) => p.c > 0.6;
const SEED_SHELL: Vec3 = [3, 4.4, 3];
function seedShape(p: Particle, t: number): Vec3 {
  const beat = 1 + 0.08 * breath(t);
  if (inSeedTree(p)) {
    const routes = tree();
    const r = Math.floor(p.a * routes.length);
    const route = routes[r] as Route;
    const len = routeLength(route);
    const [x, y] = along(route, wrap(p.b * len + t * 0.05, len));
    const k = 0.1 * beat;
    const fan = (r / Math.max(1, routes.length - 1) - 0.5) * Math.PI * 0.9 + t * 0.1;
    const X = x * S * k;
    return [
      SEED[0] + X * Math.cos(fan),
      SEED[1] - SEED_SHELL[1] * 0.75 + (y - FOOT_Y) * S * k,
      SEED[2] + X * Math.sin(fan),
    ];
  }
  // The shell: grains on the skin of an upright almond.
  const d = fibonacciSphere(p.i % 997, 997);
  const r = (0.94 + 0.06 * p.b) * beat;
  return [
    SEED[0] + d[0] * r * SEED_SHELL[0],
    SEED[1] + d[1] * r * SEED_SHELL[1],
    SEED[2] + d[2] * r * SEED_SHELL[2],
  ];
}
function seedPoint(p: Particle, u: number, t: number): Vec3 {
  const back = smooth((u - 0.04 * p.stagger) / 0.25);
  const fromRoots = rootPoint(p, 1, t, back);
  const gather = smooth((u - 0.22 - 0.1 * p.stagger) / 0.2);
  return lerp3(fromRoots, seedShape(p, t), gather);
}

const isGround = (k: number, p: Particle) => (k === 7 || k === 8) && p.d > 0.94 && p.c > 0.5;

/** Where particle p is in step k, `u` through it, at journey time t. */
export function target(k: number, p: Particle, u: number, t: number): Vec3 {
  switch (k) {
    case 0:
      return seaPoint(p, t);
    case 1:
      return bacteriumPoint(p, u, t);
    case 2:
      return veinPoint(p, u, t);
    case 3:
      return cellPoint(p, u, t);
    case 4:
      return fishPoint(p, u, t);
    case 5:
      return treePoint(p, u, t);
    case 6:
      return pulsePoint(p, u, t);
    case 7:
      return isGround(k, p) ? groundPoint(p, t) : rootPoint(p, u, t);
    default:
      return isGround(k, p) && u < 0.5 ? groundPoint(p, t) : seedPoint(p, u, t);
  }
}

/* ---------- colour ---------- */

const AMBER: RGB = [0.78, 0.56, 0.3];
const TEAL: RGB = [0.3, 0.72, 0.66];
const LIME: RGB = [0.72, 0.95, 0.36];
const GOLD: RGB = [196 / 255, 160 / 255, 96 / 255];
const LEAF: RGB = [0.62, 0.82, 0.38];
const CREAM: RGB = [0.96, 0.86, 0.72];
const ROSE: RGB = [0.62, 0.36, 0.42];
const EMBER: RGB = [1, 0.5, 0.36];
const SILVER: RGB = [0.86, 0.82, 0.66];
const WATER: RGB = [0.55, 0.9, 0.85];
const SUGAR: RGB = [1, 0.78, 0.38];
const EARTH: RGB = [0.82, 0.58, 0.34];
const THREAD: RGB = [0.82, 0.76, 0.96];
const SEED_LIGHT: RGB = [1, 0.92, 0.66];

export function colour(k: number, p: Particle, u: number, t: number): RGB {
  const twinkle = 0.7 + 0.3 * Math.sin(t * 1.7 + p.i * 0.37);
  switch (k) {
    case 0:
      return scale(p.d < 0.8 ? AMBER : TEAL, 0.65 * twinkle);
    case 1:
      return p.c < 0.18 ? scale(LIME, 0.45) : scale(LIME, 0.85 * twinkle);
    case 2:
      // Brighter towards the tips, where the food is.
      return p.c < 0.12 ? scale(SUGAR, 1.1) : scale(mix(AMBER, SUGAR, p.b), 0.8 * twinkle);
    case 3:
      return p.c < 0.45 ? scale(CREAM, 0.42) : p.c < 0.8 ? scale(ROSE, 0.32) : scale(EMBER, 0.75);
    case 4:
      return p.c < 0.06
        ? [1.1, 1.05, 0.9]
        : scale(mix(SILVER, TEAL, 0.5 + 0.5 * Math.sin(p.d * TAU)), 0.6 * twinkle);
    case 5: {
      const leaf = p.c > 0.86;
      return leaf ? scale(LEAF, 0.9 * twinkle) : scale(mix(GOLD, LEAF, p.b * 0.4), 0.85 * twinkle);
    }
    case 6: {
      // A bright band runs out from the foot on every beat.
      const routes = tree();
      const route = routes[Math.floor(p.a * routes.length)] as Route;
      const len = routeLength(route);
      const front = ((t / 3.2) % 1) * len;
      const s = wrap(p.b * len, len);
      const band = Math.exp(-((s - front) ** 2) / 0.01);
      const base = p.c < 0.55 ? WATER : SUGAR;
      return scale(
        mix(base, [1.2, 1.1, 0.9], band),
        (0.42 + 0.55 * band) * (0.85 + 0.3 * breath(t)),
      );
    }
    case 7: {
      if (isGround(k, p)) return scale(EARTH, 0.35);
      const { kind } = rootRoute(p);
      return kind === 'thread' ? scale(THREAD, 0.7 * twinkle) : scale(EARTH, 0.8 * twinkle);
    }
    default: {
      if (isGround(k, p) && u < 0.5) return scale(EARTH, 0.35 * (1 - u * 2));
      const gather = smooth((u - 0.22 - 0.1 * p.stagger) / 0.2);
      // Thousands of grains in a small place: each one faint, so the seed glows and does not blind.
      const lit = inSeedTree(p)
        ? scale(mix(GOLD, LEAF, p.b * 0.5), 0.42 + 0.18 * breath(t))
        : scale(SEED_LIGHT, 0.06 + 0.04 * breath(t));
      return mix(scale(EARTH, 0.8), lit, gather);
    }
  }
}

/* ---------- the moving eye ---------- */

type Eye = { eye: Vec3; target: Vec3 };

/** Where the camera stands in step k, `u` through it. */
export function eyeIn(k: number, u: number, t: number): Eye {
  switch (k) {
    case 0:
      return { eye: [Math.sin(t * 0.05) * 4, 2, 52], target: [0, 0, 0] };
    case 1:
      return { eye: [Math.sin(t * 0.06) * 3, 0, lerp(46, 34, smooth(u))], target: [0, 0, 0] };
    case 2:
      return { eye: [0, -6, lerp(34, 46, smooth(u))], target: [0, 0, 0] };
    case 3: {
      // Round the embryo.
      const a = u * 1.4;
      return { eye: [Math.sin(a) * 30, 6, Math.cos(a) * 30], target: [0, 0, 0] };
    }
    case 4:
      return { eye: [Math.sin(t * 0.04) * 8, 8, 50], target: [0, 0, 0] };
    case 5:
      return { eye: [Math.sin(t * 0.05) * 4, 0, lerp(70, 60, smooth(u))], target: [0, 1, 0] };
    case 6: {
      // Into the trunk, then up it.
      const inn = smooth(u / 0.45);
      const y = lerp(GROUND + 6, 14, smooth((u - 0.2) / 0.8));
      return {
        eye: [lerp(0, 5, inn), lerp(0, y, inn), lerp(60, 15, inn)],
        target: [0, lerp(1, y + 8, inn), 0],
      };
    }
    case 7: {
      const down = smooth(u / 0.3);
      return {
        eye: [Math.sin(t * 0.05) * 5, lerp(GROUND + 4, GROUND - 8, down), 50],
        target: [0, lerp(GROUND, GROUND - 12, down), 0],
      };
    }
    default: {
      const close = smooth((u - 0.2) / 0.5);
      return {
        eye: [0, lerp(GROUND - 8, SEED[1] + 1, close), lerp(50, 24, close)],
        target: lerp3([0, GROUND - 12, 0], SEED, close),
      };
    }
  }
}

/** The camera at journey time t, eased into the next step's start in the last quarter. */
export function camera(time: number): Eye {
  const t = wrap(time, TOTAL);
  const { index, u } = phaseAt(t);
  const next = (index + 1) % PHASES.length;
  const a = eyeIn(index, u, t);
  const w = smooth((u - 0.75) / 0.25);
  if (w <= 0) return a;
  const b = eyeIn(next, 0, t);
  return { eye: lerp3(a.eye, b.eye, w), target: lerp3(a.target, b.target, w) };
}

/* ---------- the continuous flow between steps ---------- */

/** Position and colour of particle p at journey time t, flowing between steps. */
export function particleAt(p: Particle, time: number): { pos: Vec3; rgb: RGB } {
  const t = wrap(time, TOTAL);
  const { index, u } = phaseAt(t);
  const w = flow(p, u);
  const a = target(index, p, u, t);
  const ca = colour(index, p, u, t);
  if (w <= 0) return { pos: a, rgb: ca };
  const next = (index + 1) % PHASES.length;
  const b = target(next, p, 0, t);
  const cb = colour(next, p, 0, t);
  return { pos: lerp3(a, b, w), rgb: mix(ca, cb, w) };
}

/** Glow and size for the whole picture, blended across step boundaries. */
export function look(time: number): { glow: number; size: number } {
  const { index, u } = phaseAt(time);
  const now = PHASES[index] as JourneyPhase;
  const next = PHASES[(index + 1) % PHASES.length] as JourneyPhase;
  const w = smooth((u - 0.75) / 0.25);
  return { glow: lerp(now.glow, next.glow, w), size: lerp(now.size, next.size, w) };
}

/** Grains dissolve as they near the eye and fade far away. */
export function fade(pos: Vec3, eye: Vec3): number {
  const d = Math.hypot(pos[0] - eye[0], pos[1] - eye[1], pos[2] - eye[2]);
  return smooth((d - 3) / 9) * smooth((260 - d) / 140);
}
