/*
 * VEGETAL — the plant world's chapter (docs/specs/art-vegetal.md).
 *
 * 2026-11-09: "develop the vegetal journeys. 3d trees. roots (but only one
 * base for all the roots). vegetal cells connecting inside. a whole chapter,
 * 1 cell 2 roots 3 tree 2d 4 tree 3d … think of more ideas for 6 7 8."
 *
 * Then two forests to fly through, to end it (2026-11-09: "a forest with a
 * road in the middle and we fly through it as the trees grow, in 3d … do 1
 * with symmetric trees, and one more organic where the trees are not
 * symmetric or mirrored between left and right side of the road").
 *
 * The pieces are played as one trip, built as the Journey is (lib/journey.ts):
 * every grain of light keeps its identity, each piece is a formula from a
 * grain and the time to a place and a colour, and between pieces each grain
 * pours on at its own golden-ratio moment. The eye moves with each piece.
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
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const mix = (a: RGB, b: RGB, t: number): RGB => lerp3(a, b, t) as RGB;
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const wrap = (x: number, n: number) => ((x % n) + n) % n;
const frac = (x: number) => x - Math.floor(x);
const at = (v: readonly number[], i: number) => v[i] as number;
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

export interface VegetalPhase extends Phase {
  /** A short reflection, shown a line at a time over the picture. */
  words: string[];
}

export const PHASES: VegetalPhase[] = [
  {
    id: 'cell',
    name: 'Cell',
    line: 'A block of plant cells. Green chloroplasts stream round each wall, and pulses cross from cell to cell.',
    words: [
      'Plant cells are not sealed boxes: fine channels through their walls join them inside.',
      'A plant is less a crowd of cells than one living fabric.',
    ],
    duration: 30,
    glow: 1,
    size: 0.85,
  },
  {
    id: 'roots',
    name: 'Roots',
    line: 'From one base every root reaches down and out, forking, with fine hairs at the tips. Water climbs to the base.',
    words: [
      'A root tip feels gravity and turns toward water, with no eyes and no brain.',
      'Everything above grows from what one base can gather below.',
    ],
    duration: 30,
    glow: 1,
    size: 0.8,
  },
  {
    id: 'roots-tree',
    name: 'Roots and tree',
    line: 'One tree in one picture: its crown above the ground and its roots below, grown from the same point at the same pace. Water climbs from a root tip to the base, and on up the trunk to a leaf.',
    words: [
      'What a tree raises into the light, it mirrors in the dark below.',
      'Roots and crown grow together; neither outgrows the other for long.',
    ],
    duration: 32,
    glow: 1,
    size: 0.82,
  },
  {
    id: 'city',
    name: 'City',
    line: 'A city at night, seen from far above: streets branch like roots but in order, the centre glows, highways reach into the dark and car lights move along them. Five cities to choose from.',
    words: [
      'From high enough, a city at night looks like something that grew.',
      'Its streets branch the way roots do: toward what it needs.',
    ],
    duration: 36,
    glow: 1.05,
    size: 0.7,
  },
  {
    id: 'tree-2d',
    name: 'Tree 2D',
    line: 'The tree drawn flat: from its base the trunk forks and forks again, and sap runs both ways.',
    words: [
      'Each branch repeats the rule of the whole: grow, fork, reach.',
      'A simple rule, repeated, becomes a crown.',
    ],
    duration: 26,
    glow: 1.05,
    size: 0.85,
  },
  {
    id: 'tree-3d',
    name: 'Tree 3D',
    line: 'The same idea in three dimensions. Each branch turns round its own axis, so leaves find light on every side.',
    words: [
      'Branches spread round the trunk like the steps of a spiral stair,',
      'so that no leaf stands wholly in another’s shade.',
    ],
    duration: 32,
    glow: 1,
    size: 0.85,
  },
  {
    id: 'veins',
    name: 'Veins',
    line: 'One network grown from a centre, the same in every direction: a branching that turns round on itself into a circle.',
    words: [
      'Veins, roots, rivers and lightning branch by the same few rules.',
      'Repeated round a centre, they make a mandala.',
    ],
    duration: 28,
    glow: 1.05,
    size: 0.8,
  },
  {
    id: 'fungi',
    name: 'Fungi',
    line: 'Threads spread from spores and join into one net under the soil. Food pulses along it, and mushrooms rise.',
    words: [
      'Most land plants share their roots with fungi:',
      'sugar flows one way, water and minerals the other.',
    ],
    duration: 30,
    glow: 1.05,
    size: 0.8,
  },
  {
    id: 'leaf',
    name: 'Leaf',
    line: 'One great leaf unfurls: veins fork from the midrib to the edge. Light falls in and runs out as sugar.',
    words: [
      'A leaf turns sunlight, air and water into sugar.',
      'Almost every meal on Earth begins in a leaf.',
    ],
    duration: 28,
    glow: 1,
    size: 0.85,
  },
  {
    id: 'flower',
    name: 'Flower',
    line: 'Florets open, each turned by the golden angle, about 137.5°, and spirals appear. Petals open; pollen drifts.',
    words: [
      'Each new floret turns by the same golden angle,',
      'so the spirals come in Fibonacci numbers: 21, 34, 55.',
    ],
    duration: 30,
    glow: 0.95,
    size: 0.8,
  },
  {
    id: 'fruit',
    name: 'Fruit & seed',
    line: 'The heart of the flower swells into a fruit, ripens, falls and opens. A seed takes root, and its first cells begin again.',
    words: [
      'A fruit is a gift with a purpose: whoever eats it carries the seeds away.',
      'The end of one plant is folded inside the start of the next.',
    ],
    duration: 34,
    glow: 1,
    size: 0.85,
  },
  {
    id: 'avenue',
    name: 'Avenue',
    line: 'A road through a forest, flown a little above the ground. The trees stand in even rows, each one the mirror of the one across the road, and grow as we come.',
    words: [
      'Rows that repeat draw the eye to one point far ahead:',
      'perspective is harmony you can travel through.',
    ],
    duration: 36,
    glow: 1,
    size: 0.85,
  },
  {
    id: 'forest',
    name: 'Forest',
    line: 'The same road through a wild forest: no tree mirrors another, each grows at its own place, size and lean.',
    words: [
      'No two trees in a forest are alike, yet the forest is one thing:',
      'order and freedom growing side by side.',
    ],
    duration: 40,
    glow: 1,
    size: 0.85,
  },
  {
    id: 'full-tree',
    name: 'Full tree',
    line: 'The roots below and the tree above, all in gold, meeting at the horizon. Water climbs from the root tips, through the trunk, to the crown.',
    words: [
      'A tree is two trees: one reaching down for water, one reaching up for light.',
      'Neither grows without the other; the horizon is where they meet.',
    ],
    duration: 34,
    glow: 1,
    size: 0.8,
  },
  {
    id: 'reflection',
    name: 'Reflection',
    line: 'A tree stands still at the water’s edge, and below it the same tree in the water, trembling with soft ripples.',
    words: [
      'Still water gives back the tree whole, branch for branch.',
      'Above, what is; below, the same, moving.',
    ],
    duration: 34,
    glow: 1,
    size: 0.8,
  },
  {
    id: 'bloom',
    name: 'Bloom',
    line: 'A flower in slow motion: the stem rises, leaves unfurl, the bud swells and its petals open row by row.',
    words: ['Every flower opens from the outside in,', 'slowly enough that we forget to watch it.'],
    duration: 48,
    glow: 0.9,
    size: 0.8,
  },
  {
    id: 'bird',
    name: 'Bird Sim',
    line: 'Your turn: a bird, or the Dot Walker on foot, in a golden forest of many trees, some in blossom, with rivers, still ponds and sparrows, and a world tree far ahead. Keys only: A and D turn, the bird gliding through its turns; W and S climb and dive, or walk on and back; Shift goes faster, X slower; Space jumps.',
    // A line about freedom and its author, a new one every QUOTE_EVERY seconds (2026-11-11).
    get words() {
      return freedomWords();
    },
    duration: 60,
    glow: 1,
    size: 0.8,
  },
];

/** Piece k's id: the pieces are told apart by id, so a new one can go anywhere in the list. */
const idOf = (k: number) => PHASES[k]?.id ?? '';

export const TOTAL = PHASES.reduce((s, p) => s + p.duration, 0);
export const PHASE_START: number[] = PHASES.map((_, i) =>
  PHASES.slice(0, i).reduce((s, p) => s + p.duration, 0),
);

/** Which piece a moment of the chapter is in, and how far through it (0..1). */
export function phaseAt(time: number): { index: number; u: number } {
  const t = wrap(time, TOTAL);
  let index = PHASES.length - 1;
  for (let i = 0; i < PHASES.length; i++) {
    if (t < at(PHASE_START, i) + (PHASES[i] as VegetalPhase).duration) {
      index = i;
      break;
    }
  }
  return { index, u: (t - at(PHASE_START, index)) / (PHASES[index] as VegetalPhase).duration };
}

/** One colour per piece, for the step bar. */
export const STEP_COLOURS = [
  '#9fd36a',
  '#c48a52',
  '#b9a05a',
  '#f2c25a',
  '#d9b56a',
  '#8fc45a',
  '#f0b44a',
  '#d9c7f0',
  '#7fd14e',
  '#ffc94a',
  '#ff8a4a',
  '#b9d98a',
  '#7fb86a',
  '#e0b452',
  '#9cc7d9',
  '#f2a0b8',
  '#e8c06a',
];

/*
 * Which way the sap runs in the trees (2026-11-10: "tree, you can make it
 * with dots all moving from bottom to up or from up to bottom, with a small
 * button on the right"). In the Journey half climb and half come down; a
 * piece on its own sends them all one way, up or down, by its button.
 */
let sapWay: 0 | 1 | -1 = 0;
/** All up (true), all down (false), or both ways as in the Journey (null). */
export function setSap(up: boolean | null) {
  sapWay = up === null ? 0 : up ? 1 : -1;
}
/** A grain's way along its branch: the one set, else up when `climbs`. */
const sapDir = (climbs: boolean) => sapWay || (climbs ? 1 : -1);
/** The pieces with trees whose sap the button turns. */
export const hasSap = (k: number) =>
  ['roots-tree', 'tree-2d', 'tree-3d', 'avenue', 'forest', 'full-tree', 'reflection'].includes(
    PHASES[k]?.id ?? '',
  );

/* ---------- 1. Cell: a block of plant cells joined inside ---------- */

const GRID: Vec3 = [4, 3, 2];
export const CELL_COUNT = GRID[0] * GRID[1] * GRID[2];
const CELL_SIZE: Vec3 = [8, 9.5, 8];
/** How far along each axis one step to the next cell is in the index. */
const STRIDE: Vec3 = [1, GRID[0], GRID[0] * GRID[1]];

function cellIjk(j: number): Vec3 {
  return [j % GRID[0], Math.floor(j / GRID[0]) % GRID[1], Math.floor(j / (GRID[0] * GRID[1]))];
}

/** How far cell j sits from the middle of the block, 0..1. */
function cellFar(j: number): number {
  const [i, k, l] = cellIjk(j);
  return (
    Math.hypot(
      (i - (GRID[0] - 1) / 2) / ((GRID[0] - 1) / 2),
      (k - (GRID[1] - 1) / 2) / ((GRID[1] - 1) / 2),
      (l - (GRID[2] - 1) / 2) / ((GRID[2] - 1) / 2),
    ) / Math.sqrt(3)
  );
}

/** Cell j's centre and half-size, `u` through the piece: the block grows out from the middle. */
export function cellOf(j: number, u: number): { c: Vec3; h: Vec3; g: number } {
  const [i, k, l] = cellIjk(j);
  const off: Vec3 = [i - (GRID[0] - 1) / 2, k - (GRID[1] - 1) / 2, l - (GRID[2] - 1) / 2];
  const g = smooth((u - 0.3 * cellFar(j)) / 0.22);
  const s = 0.47 * (0.3 + 0.7 * g);
  return {
    c: [off[0] * CELL_SIZE[0] * g, off[1] * CELL_SIZE[1] * g, off[2] * CELL_SIZE[2] * g],
    h: [CELL_SIZE[0] * s, CELL_SIZE[1] * s, CELL_SIZE[2] * s],
    g,
  };
}

type CellRole = 'wall' | 'chloroplast' | 'nucleus' | 'pulse';
const cellRole = (p: Particle): CellRole =>
  p.c < 0.48 ? 'wall' : p.c < 0.8 ? 'chloroplast' : p.c < 0.9 ? 'nucleus' : 'pulse';

/** A pulse's way from its cell to the next one along an axis, and how far along it is. */
function pulseOf(p: Particle, u: number, t: number): { from: Vec3; to: Vec3; f: number } {
  const j = Math.floor(p.a * CELL_COUNT);
  const ijk = cellIjk(j);
  const axis = Math.floor(p.d * 3);
  const step = at(ijk, axis) + 1 < at(GRID, axis) ? 1 : -1;
  const nb = j + step * at(STRIDE, axis);
  const live = smooth((u - 0.35) / 0.15);
  const f = frac(t * 0.3 + hash(j * 3 + axis, 9) + p.b * 0.08) * live;
  return { from: cellOf(j, u).c, to: cellOf(nb, u).c, f };
}

function cellPoint(p: Particle, u: number, t: number): Vec3 {
  const j = Math.floor(p.a * CELL_COUNT);
  const { c, h } = cellOf(j, u);
  const k = h[0] / (CELL_SIZE[0] * 0.47);
  switch (cellRole(p)) {
    case 'wall': {
      // Plant cells are boxes with walls: most grains draw the box's twelve edges, so the walls
      // read as a grid, and the rest fill its faces faintly.
      const local: Vec3 = [0, 0, 0];
      if (p.d < 0.65) {
        const e = Math.floor((p.d / 0.65) * 12);
        const axis = e % 3;
        const corner = Math.floor(e / 3);
        local[axis] = (p.b * 2 - 1) * at(h, axis);
        local[(axis + 1) % 3] = (corner & 1 ? 1 : -1) * at(h, (axis + 1) % 3);
        local[(axis + 2) % 3] = (corner & 2 ? 1 : -1) * at(h, (axis + 2) % 3);
        return add(c, local);
      }
      const q = (p.d - 0.65) / 0.35;
      const f = Math.floor(q * 6);
      const axis = f >> 1;
      local[axis] = (f & 1 ? 1 : -1) * at(h, axis);
      local[(axis + 1) % 3] = (p.b * 2 - 1) * at(h, (axis + 1) % 3);
      local[(axis + 2) % 3] = ((q * 6 - f) * 2 - 1) * at(h, (axis + 2) % 3);
      return add(c, local);
    }
    case 'chloroplast': {
      // Ten green discs streaming round the inside of the wall, neighbours turning opposite ways.
      const n = Math.floor(p.b * 10);
      const th = (n / 10) * TAU + (j % 2 ? 1 : -1) * t * 0.35;
      const loop: Vec3 = [
        Math.cos(th) * h[0] * 0.72,
        Math.sin(th) * h[1] * 0.72,
        ((n % 3) - 1) * h[2] * 0.45,
      ];
      const blob = fibonacciSphere(p.i % 97, 97);
      const r = 0.55 * Math.sqrt(frac(p.d * 13)) * k;
      return add(add(c, loop), [blob[0], blob[1], blob[2] * 0.5], r);
    }
    case 'nucleus': {
      const d = fibonacciSphere(p.i % 211, 211);
      return add(add(c, [h[0] * 0.3, -h[1] * 0.25, h[2] * 0.2]), d, 1.15 * k * Math.cbrt(p.b));
    }
    default: {
      const { from, to, f } = pulseOf(p, u, t);
      return lerp3(from, to, f);
    }
  }
}

/* ---------- 2. Roots: one base, every root grown from it ---------- */

export const ROOT_BASE: Vec3 = [0, 14, 0];
const ROOT_K = 38;
type RootSystem = { routes: Route[]; az: number[]; twist: number[] };
let rootSet: RootSystem | null = null;
export function rootSystem(): RootSystem {
  if (rootSet) return rootSet;
  const rng = seeded(23);
  const routes: Route[] = [];
  const az: number[] = [];
  const twist: number[] = [];
  // Seven main roots from the one base: a tap root straight down, six leaning out round it.
  for (let k = 0; k < 7; k++) {
    const tilt = k === 0 ? 0.05 : 0.55 + 0.6 * rng();
    const out: Seg[][] = [];
    grow(rng, 0, 0, Math.PI - tilt, k === 0 ? 0.2 : 0.15, 0.05, 6, 0.42, 0.8, [], out);
    for (const chain of out) {
      routes.push(resample(sampleChain(chain, false)));
      az.push(k * GOLDEN_ANGLE);
      twist.push((rng() - 0.5) * 1.1);
    }
  }
  rootSet = { routes, az, twist };
  return rootSet;
}

type RootRole = 'water' | 'base' | 'soil' | 'root' | 'hair';
const rootRole = (p: Particle): RootRole =>
  p.c < 0.16 ? 'water' : p.c < 0.2 ? 'base' : p.c < 0.24 ? 'soil' : p.c < 0.88 ? 'root' : 'hair';

/** A point `s` along root r, in the world: each root turns a little round the tap root as it goes. */
function onRoot(r: number, s: number, across: number): Vec3 {
  const set = rootSystem();
  const route = set.routes[r] as Route;
  const len = routeLength(route);
  const [x, y0, w] = along(route, s);
  // A root that curls upward is turned back down: nothing of it rises above the base.
  const y = Math.min(y0, -y0);
  const phi = at(set.az, r) + at(set.twist, r) * (s / len) ** 1.5;
  const off = across * w * ROOT_K * 0.5;
  return [
    x * ROOT_K * Math.cos(phi) - Math.sin(phi) * off,
    ROOT_BASE[1] + y * ROOT_K,
    x * ROOT_K * Math.sin(phi) + Math.cos(phi) * off,
  ];
}

function rootPoint(p: Particle, u: number, t: number): Vec3 {
  const set = rootSystem();
  const r = Math.floor(p.a * set.routes.length);
  const len = routeLength(set.routes[r] as Route);
  const reach = 0.05 + 0.95 * smooth(u / 0.4);
  switch (rootRole(p)) {
    case 'water':
      // Climbing toward the base.
      return onRoot(r, len * reach * wrap(p.b - t * 0.06, 1) ** 0.55, 0);
    case 'base': {
      const d = fibonacciSphere(p.i % 173, 173);
      return add(ROOT_BASE, d, 1.4 * Math.cbrt(p.b));
    }
    case 'soil': {
      const a = p.d * TAU;
      const rr = 32 * Math.sqrt(p.b);
      return [
        Math.cos(a) * rr,
        ROOT_BASE[1] + 0.4 + Math.sin(rr + t * 0.2) * 0.2,
        Math.sin(a) * rr,
      ];
    }
    case 'root':
      // More grains toward the tips, where the roots are many and fine.
      return onRoot(r, len * reach * p.b ** 0.55, (p.d - 0.5) * 2);
    default: {
      const tip = onRoot(r, len * reach * (0.82 + 0.18 * p.b), 0);
      const d = fibonacciSphere(p.i % 131, 131);
      return add(tip, d, 0.3 + 1.2 * p.d * smooth((u - 0.2) / 0.3));
    }
  }
}

/* ---------- 3. Roots and tree: one tree, its crown above the ground and its roots below ---------- */

/*
 * 2026-11-12: "after roots make roots and tree. where both live in same
 * visual." The roots of piece 2, in their earth and water colours, spread
 * below a ground line, and the green tree of Tree 3D stands on it, both grown
 * from the one point where they meet, at one pace. Water climbs from a root
 * tip to the base and goes on up the trunk to a branch tip as sap, so the two
 * halves are one living thing. The eye walks slowly round, a little above the
 * ground.
 */
const RT_K = 0.7;
type RootsTreeRole = 'water' | 'base' | 'soil' | 'root' | 'hair' | 'wood' | 'leaf';
const rootsTreeRole = (p: Particle): RootsTreeRole =>
  p.c < 0.1
    ? 'water'
    : p.c < 0.115
      ? 'base'
      : p.c < 0.14
        ? 'soil'
        : p.c < 0.44
          ? 'root'
          : p.c < 0.5
            ? 'hair'
            : p.c < 0.82
              ? 'wood'
              : 'leaf';

/** Root r at s, moved so its base sits on the ground at the origin, at the picture's scale. */
const rootBelow = (r: number, s: number, across: number): Vec3 => {
  const q = onRoot(r, s, across);
  return [q[0] * RT_K, (q[1] - ROOT_BASE[1]) * RT_K, q[2] * RT_K];
};
/** A point of the 3D tree, its foot moved onto the ground at the origin. */
const treeAbove = (q: Vec3): Vec3 => [q[0] * RT_K, (q[1] - GROUND_3D) * RT_K, q[2] * RT_K];

/** How far round its way a water grain is: 0 at a root tip, 0.5 at the base, 1 at a branch tip. */
export const waterTrip = (p: Particle, t: number) => wrap(p.b + sapDir(true) * t * 0.035, 1);

function rootsTreePoint(p: Particle, u: number, t: number): Vec3 {
  const grown = 0.05 + 0.95 * smooth(u / 0.42);
  const role = rootsTreeRole(p);
  const roots = rootSystem();
  const r = Math.floor(p.a * roots.routes.length);
  const rlen = routeLength(roots.routes[r] as Route) * grown;
  const trees = tree3d();
  // Water picks its branch apart from its root, so one root does not always feed one branch.
  const pick = role === 'water' ? hash(p.i, 84) : p.a;
  const route = trees[Math.floor(pick * trees.length)] as Route3;
  const tlen = length3(route) * grown;
  switch (role) {
    case 'water': {
      const q = waterTrip(p, t);
      if (q < 0.5) return rootBelow(r, rlen * (1 - 2 * q), 0);
      const [x, y, z] = along3(route, tlen * (2 * q - 1));
      return treeAbove([x, y, z]);
    }
    case 'base':
      return mul(fibonacciSphere(p.i % 173, 173), 1.1 * Math.cbrt(p.b));
    case 'soil': {
      // The ground line: a disc seen nearly edge on, densest at the foot of the trunk.
      const a = p.d * TAU;
      const rr = 24 * p.b;
      return [Math.cos(a) * rr, Math.sin(rr + t * 0.2) * 0.12, Math.sin(a) * rr];
    }
    case 'root':
      return rootBelow(r, rlen * p.b ** 0.55, (p.d - 0.5) * 2);
    case 'hair': {
      const tip = rootBelow(r, rlen * (0.82 + 0.18 * p.b), 0);
      const d = fibonacciSphere(p.i % 131, 131);
      return add(tip, d, (0.2 + 0.85 * p.d) * smooth((u - 0.2) / 0.3));
    }
    case 'leaf': {
      const [x, y, z] = along3(route, tlen);
      const d = fibonacciSphere(p.i % 157, 157);
      const rr = 1.8 * Math.cbrt(p.b) * smooth((u - 0.3) / 0.2);
      const flutter = Math.sin(t * 2 + p.i) * 0.15;
      return treeAbove([x + d[0] * rr + flutter, y + d[1] * rr * 0.8, z + d[2] * rr]);
    }
    default: {
      const dir = sapDir(p.c < 0.66);
      const s = tlen * wrap(p.b + dir * t * 0.04 * (0.7 + 0.6 * p.d), 1);
      const [x, y, z, w] = along3(route, s);
      return treeAbove(add([x, y, z], fibonacciSphere(p.i % 389, 389), w * 0.5 * Math.sqrt(p.d)));
    }
  }
}

/* ---------- 4. City: night cities seen from far above ---------- */

/*
 * 2026-11-12: "then do a new one called city. cityscapes seen from above in
 * vegetal. like cities seen from space or from an airplane (must look a bit
 * like the roots visuals but more structured). do 5 such visuals in the
 * cities collection." A city at night lies flat across the picture, as from
 * an airplane window: grains of light along its streets, avenues and ring
 * roads; a dense, bright centre fading to sparse suburbs; highways reaching
 * into the dark and forking at their ends like roots; car lights moving along
 * the fast roads, white one way and amber the other. Water and parks stay
 * dark. The lights come on from the centre out, and the eye drifts slowly
 * over it. Pills pick one of five cities:
 *   Grid    a tilted grid, a diagonal avenue across it, a river with bridges
 *   Star    boulevards from one centre, ring roads round it, a dark park
 *   River   an old city grown like roots from two cores, a winding river
 *   Bay     ring roads in half circles round the head of a bay, an island
 *   Canals  rings of canals round a harbour, a sparser town across the water
 * The plans are laid out on a unit disc and drawn CITY_K across.
 */
export const CITY_K = 46;
type Road = { route: Route; rank: number };
type CityPlan = {
  roads: Road[];
  /** Running total of each road's share of the street grains, and of the fast roads' cars. */
  cum: Float64Array;
  fast: number[];
  fastCum: Float64Array;
  wet: (x: number, y: number) => boolean;
  dens: (x: number, y: number) => number;
  centre: [number, number];
};
type Keep = (x: number, y: number) => boolean;
/** How many street grains a unit of road takes, by rank: highway, avenue, street, lane. */
const RANK_W = [1.1, 1.5, 1, 0.45];

/** Points from (x0, y0) to (x1, y1), close enough together to cut at a shore. */
function lineRaw(x0: number, y0: number, x1: number, y1: number): number[] {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.01));
  const raw: number[] = [];
  for (let i = 0; i <= n; i++) raw.push(lerp(x0, x1, i / n), lerp(y0, y1, i / n), 0.01);
  return raw;
}
/** Points round an arc about (cx, cy). */
function arcRaw(cx: number, cy: number, r: number, a0: number, a1: number): number[] {
  const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * r) / 0.01));
  const raw: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = lerp(a0, a1, i / n);
    raw.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.01);
  }
  return raw;
}
/** Points along a curve q -> (x, y), q from 0 to 1. */
function curveRaw(f: (q: number) => [number, number], n: number): number[] {
  const raw: number[] = [];
  for (let i = 0; i <= n; i++) raw.push(...f(i / n), 0.01);
  return raw;
}
/** A path cut into the stretches `keep` allows, each one a road of the given rank. */
function roadsOf(raw: number[], rank: number, keep: Keep, out: Road[]) {
  let run: number[] = [];
  const flush = () => {
    if (run.length >= 9) {
      const route = resample(run);
      if (route.count > 2) out.push({ route, rank });
    }
    run = [];
  };
  for (let i = 0; i + 2 < raw.length; i += 3) {
    const x = at(raw, i);
    const y = at(raw, i + 1);
    if (keep(x, y)) run.push(x, y, at(raw, i + 2));
    else flush();
  }
  flush();
}
/** Branching roads grown like roots from (x, y) toward `angle` (from +y, toward +x). */
function rootRoads(
  rng: () => number,
  x: number,
  y: number,
  angle: number,
  len: number,
  depth: number,
  spread: number,
  shrink: number,
  rank: number,
  keep: Keep,
  out: Road[],
) {
  const chains: Seg[][] = [];
  grow(rng, x, y, angle, len, 0.01, depth, spread, shrink, [], chains);
  // The chains share their first stretches; each stretch is laid once, so no road is doubled.
  // The first stretches are the main roads, a rank up; the finer they fork, the smaller the road.
  const laid = new Set<Seg>();
  for (const c of chains) {
    c.forEach((seg, i) => {
      if (laid.has(seg)) return;
      laid.add(seg);
      const r = Math.min(3, Math.max(0, rank - 1 + Math.floor(i / 2)));
      roadsOf(sampleChain([seg], false), r, keep, out);
    });
  }
}
/** Inside a ragged edge of radius R round (cx, cy), so no city is a perfect circle. */
const within = (x: number, y: number, R: number, cx = 0, cy = 0) => {
  const a = Math.atan2(y - cy, x - cx);
  return (
    Math.hypot(x - cx, y - cy) < R * (1 + 0.16 * Math.sin(3 * a + 1.3) + 0.09 * Math.sin(7 * a))
  );
};
const falloff = (cx: number, cy: number, s: number) => (x: number, y: number) =>
  Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (s * s));
/** Highways out from radius r0 round (cx, cy), each forking at its end like a root. */
function highways(
  rng: () => number,
  n: number,
  r0: number,
  keep: Keep,
  out: Road[],
  cx = 0,
  cy = 0,
  turn = 0.4,
) {
  for (let k = 0; k < n; k++) {
    const a = turn + (k / n) * TAU + (rng() - 0.5) * 0.4;
    rootRoads(
      rng,
      cx + Math.sin(a) * r0,
      cy + Math.cos(a) * r0,
      a,
      0.2,
      3,
      0.32,
      0.82,
      0,
      keep,
      out,
    );
  }
}

type CityKind = {
  name: string;
  seed: number;
  build: (rng: () => number) => Omit<CityPlan, 'cum' | 'fast' | 'fastCum'>;
};

export const CITIES: CityKind[] = [
  {
    name: 'Grid',
    seed: 61,
    build: (rng) => {
      // A grid tilted a little, close in the middle and twice as wide in the suburbs.
      const riverY = (x: number) => -0.32 + 0.22 * x + 0.03 * Math.sin(5 * x);
      const wet = (x: number, y: number) => Math.abs(y - riverY(x)) < 0.05;
      const roads: Road[] = [];
      const rot = 0.32;
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const toWorld = (gx: number, gy: number): [number, number] => [
        gx * c - gy * s,
        gx * s + gy * c,
      ];
      for (let i = -22; i <= 22; i++) {
        const v = i * 0.05;
        const rank = i % 4 === 0 ? 1 : i % 2 === 0 ? 2 : 3;
        const R = i % 2 === 0 ? 1 : 0.6;
        // Avenues cross the river on bridges; streets stop at its banks.
        const keep: Keep = (x, y) => within(x, y, R) && (rank === 1 || !wet(x, y));
        for (const axis of [0, 1]) {
          const raw = curveRaw((q) => {
            const w = -1.3 + 2.6 * q;
            return axis ? toWorld(v, w) : toWorld(w, v);
          }, 260);
          roadsOf(raw, rank, keep, roads);
        }
      }
      // One old road cuts across the grid on a slant, and the river's two embankments.
      const land: Keep = (x, y) => within(x, y, 1.05) && !wet(x, y);
      roadsOf(
        curveRaw((q) => [-1 + 2 * q, -0.75 + 1.4 * q + 0.12 * Math.sin(q * 4)], 300),
        1,
        (x, y) => within(x, y, 1.05),
        roads,
      );
      for (const side of [-1, 1])
        roadsOf(
          curveRaw((q) => [-1.1 + 2.2 * q, riverY(-1.1 + 2.2 * q) + side * 0.065], 300),
          2,
          land,
          roads,
        );
      highways(rng, 6, 0.75, (x, y) => !wet(x, y) && Math.hypot(x, y) < 1.45, roads);
      return { roads, wet, dens: falloff(0.05, 0.08, 0.5), centre: [0.05, 0.08] };
    },
  },
  {
    name: 'Star',
    seed: 67,
    build: (rng) => {
      // A dark park east of the centre: no lights in it.
      const wet = (x: number, y: number) => Math.hypot(x - 0.3, y + 0.24) < 0.08;
      const roads: Road[] = [];
      const keep: Keep = (x, y) => within(x, y, 0.95) && !wet(x, y);
      const B = 12;
      for (let k = 0; k < B; k++) {
        const a = (k / B) * TAU;
        roadsOf(
          lineRaw(Math.cos(a) * 0.03, Math.sin(a) * 0.03, Math.cos(a), Math.sin(a)),
          1,
          keep,
          roads,
        );
        // Short streets fan out between the boulevards, more of them further out.
        for (let m = 1; m < 6; m++) {
          const b = a + (m / 6) * (TAU / B);
          const r0 = m % 2 ? 0.2 : 0.1;
          roadsOf(
            lineRaw(Math.cos(b) * r0, Math.sin(b) * r0, Math.cos(b) * 0.9, Math.sin(b) * 0.9),
            3,
            keep,
            roads,
          );
        }
      }
      roadsOf(arcRaw(0, 0, 0.03, 0, TAU), 1, () => true, roads);
      roadsOf(arcRaw(0, 0, 0.2, 0, TAU), 1, (x, y) => !wet(x, y), roads);
      roadsOf(arcRaw(0, 0, 0.42, 0, TAU), 1, (x, y) => !wet(x, y), roads);
      roadsOf(arcRaw(0, 0, 0.72, 0, TAU), 0, () => true, roads);
      for (let r = 0.08; r < 0.95; r += 0.055) roadsOf(arcRaw(0, 0, r, 0, TAU), 2, keep, roads);
      highways(rng, 8, 0.9, (x, y) => Math.hypot(x, y) < 1.45, roads, 0, 0, 0.2);
      return { roads, wet, dens: falloff(0, 0, 0.45), centre: [0, 0] };
    },
  },
  {
    name: 'River',
    seed: 71,
    build: (rng) => {
      // An old city grown from two cores, one on each bank of a winding river.
      const riverY = (x: number) => 0.12 * Math.sin(2.4 * x + 0.5) + 0.05 * Math.sin(5.1 * x);
      const half = (x: number) => 0.035 + 0.012 * x;
      const wet = (x: number, y: number) => Math.abs(y - riverY(x)) < half(x);
      const roads: Road[] = [];
      const keep: Keep = (x, y) => within(x, y, 1.05) && !wet(x, y);
      for (let k = 0; k < 11; k++)
        rootRoads(
          rng,
          0.05,
          0.2,
          (k / 11) * TAU + rng() * 0.3,
          0.13,
          6,
          0.55,
          0.86,
          2,
          keep,
          roads,
        );
      for (let k = 0; k < 7; k++)
        rootRoads(
          rng,
          -0.3,
          -0.22,
          (k / 7) * TAU + rng() * 0.3,
          0.12,
          5,
          0.55,
          0.86,
          2,
          keep,
          roads,
        );
      for (const side of [-1, 1])
        roadsOf(
          curveRaw((q) => {
            const x = -1.1 + 2.2 * q;
            return [x, riverY(x) + side * (half(x) + 0.014)];
          }, 300),
          2,
          (x, y) => within(x, y, 0.85),
          roads,
        );
      for (const x of [-0.55, -0.2, 0.15, 0.5])
        roadsOf(lineRaw(x, riverY(x) - 0.1, x + 0.02, riverY(x) + 0.1), 1, () => true, roads);
      highways(rng, 5, 0.7, (x, y) => !wet(x, y) && Math.hypot(x, y) < 1.45, roads);
      return {
        roads,
        wet,
        dens: (x, y) =>
          Math.max(falloff(0.05, 0.2, 0.34)(x, y), 0.8 * falloff(-0.3, -0.22, 0.26)(x, y)),
        centre: [0.05, 0.2],
      };
    },
  },
  {
    name: 'Bay',
    seed: 73,
    build: (rng) => {
      // The sea to the north, pushing a bay south into the land, and an island off the coast.
      const coastY = (x: number) =>
        0.38 - 0.34 * Math.exp(-((x / 0.38) ** 2)) + 0.025 * Math.sin(9 * x);
      const island = (x: number, y: number) => Math.hypot((x - 0.55) / 1.4, y - 0.66) < 0.1;
      const wet = (x: number, y: number) => y > coastY(x) && !island(x, y);
      const roads: Road[] = [];
      const c: [number, number] = [0, -0.04];
      const land: Keep = (x, y) => !wet(x, y);
      const keep: Keep = (x, y) => within(x, y, 1.05, c[0], c[1]) && land(x, y);
      // Ring roads in half circles round the head of the bay, boulevards fanning inland.
      roadsOf(arcRaw(c[0], c[1], 0.25, 0, TAU), 1, land, roads);
      roadsOf(arcRaw(c[0], c[1], 0.5, 0, TAU), 0, land, roads);
      roadsOf(arcRaw(c[0], c[1], 0.82, 0, TAU), 0, land, roads);
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU;
        roadsOf(
          lineRaw(c[0], c[1], c[0] + Math.cos(a) * 1.05, c[1] + Math.sin(a) * 1.05),
          1,
          keep,
          roads,
        );
      }
      for (let i = -18; i <= 18; i++) {
        const v = i * 0.05;
        const rank = i % 2 ? 3 : 2;
        const R = i % 2 ? 0.5 : 0.95;
        const k2: Keep = (x, y) => within(x, y, R, c[0], c[1]) && land(x, y);
        roadsOf(lineRaw(-1, v, 1, v + 0.12), rank, k2, roads);
        roadsOf(lineRaw(v, -1, v - 0.12, 1), rank, k2, roads);
      }
      // The shore road, the island's streets and its bridge, and piers into the bay.
      roadsOf(
        curveRaw((q) => [-1.1 + 2.2 * q, coastY(-1.1 + 2.2 * q) - 0.018], 400),
        1,
        (x, y) => land(x, y) && Math.abs(x) < 1.05,
        roads,
      );
      for (let i = -3; i <= 3; i++) {
        roadsOf(lineRaw(0.55 + i * 0.04, 0.5, 0.55 + i * 0.04, 0.8), 2, island, roads);
        roadsOf(lineRaw(0.35, 0.66 + i * 0.03, 0.75, 0.66 + i * 0.03), 2, island, roads);
      }
      roadsOf(lineRaw(0.5, coastY(0.5) - 0.02, 0.52, 0.58), 1, () => true, roads);
      for (const x of [-0.3, -0.15, 0.12, 0.28])
        roadsOf(lineRaw(x, coastY(x) - 0.01, x, coastY(x) + 0.06), 2, () => true, roads);
      highways(
        rng,
        5,
        0.85,
        (x, y) => land(x, y) && Math.hypot(x, y) < 1.45,
        roads,
        c[0],
        c[1],
        2.4,
      );
      return { roads, wet, dens: falloff(c[0], c[1], 0.45), centre: c };
    },
  },
  {
    name: 'Canals',
    seed: 79,
    build: (rng) => {
      // A harbour across the city's north, and rings of canals round the old centre on its shore.
      const c: [number, number] = [0, 0.3];
      const harbour = (x: number, y: number) =>
        Math.abs(y - (0.42 + 0.03 * Math.sin(6 * x))) < 0.09;
      const CANALS = [0.13, 0.21, 0.29, 0.37, 0.45];
      const canal = (x: number, y: number) => {
        if (y > c[1]) return false;
        const r = Math.hypot(x - c[0], y - c[1]);
        return CANALS.some((R) => Math.abs(r - R) < 0.014);
      };
      const wet = (x: number, y: number) => harbour(x, y) || canal(x, y);
      const roads: Road[] = [];
      const dry: Keep = (x, y) => !wet(x, y);
      // Both banks of every canal, and streets crossing them on bridges toward the centre.
      for (const R of CANALS)
        for (const side of [-1, 1])
          roadsOf(arcRaw(c[0], c[1], R + side * 0.026, Math.PI, TAU), 2, dry, roads);
      for (let k = 0; k <= 24; k++) {
        const a = Math.PI + (k / 24) * Math.PI;
        roadsOf(
          lineRaw(
            c[0] + Math.cos(a) * 0.05,
            c[1] + Math.sin(a) * 0.05,
            c[0] + Math.cos(a) * 0.95,
            c[1] + Math.sin(a) * 0.95,
          ),
          k % 4 ? 3 : 1,
          (x, y) => !harbour(x, y) && within(x, y, 0.95, c[0], c[1]),
          roads,
        );
      }
      // Beyond the canals, a newer grid; across the harbour a sparser town.
      for (let i = -20; i <= 20; i++) {
        const v = i * 0.06;
        const k2: Keep = (x, y) => {
          const r = Math.hypot(x - c[0], y - c[1]);
          return dry(x, y) && r > 0.52 && within(x, y, y > c[1] ? 0.75 : 1.05, c[0], c[1]);
        };
        roadsOf(lineRaw(-1.1, v + 0.1, 1.1, v - 0.1), i % 2 ? 3 : 2, k2, roads);
        roadsOf(lineRaw(v - 0.1, -1.1, v + 0.1, 1.1), i % 2 ? 3 : 2, k2, roads);
      }
      roadsOf(arcRaw(c[0], c[1], 0.72, Math.PI, TAU), 0, dry, roads);
      roadsOf(lineRaw(-0.12, 0.3, -0.1, 0.56), 1, () => true, roads);
      roadsOf(lineRaw(0.22, 0.3, 0.24, 0.56), 1, () => true, roads);
      highways(
        rng,
        5,
        0.75,
        (x, y) => dry(x, y) && Math.hypot(x, y) < 1.45,
        roads,
        c[0],
        c[1],
        2.2,
      );
      return { roads, wet, dens: falloff(c[0], c[1] - 0.12, 0.45), centre: [c[0], c[1] - 0.12] };
    },
  },
];
let cityKind = 0;
export const hasCities = (k: number) => idOf(k) === 'city';
const cityPlans: (CityPlan | null)[] = CITIES.map(() => null);

/** City `kind`'s plan, with each road's share of the street grains and of the cars. */
export function cityPlan(kind = cityKind): CityPlan {
  const cached = cityPlans[kind];
  if (cached) return cached;
  const base = (CITIES[kind] as CityKind).build(seeded((CITIES[kind] as CityKind).seed));
  const cum = new Float64Array(base.roads.length);
  const fast: number[] = [];
  let sum = 0;
  base.roads.forEach((r, i) => {
    sum += routeLength(r.route) * at(RANK_W, r.rank);
    cum[i] = sum;
    if (r.rank <= 1) fast.push(i);
  });
  const fastCum = new Float64Array(fast.length);
  let fsum = 0;
  fast.forEach((i, j) => {
    fsum += routeLength((base.roads[i] as Road).route);
    fastCum[j] = fsum;
  });
  for (let i = 0; i < cum.length; i++) cum[i] = (cum[i] as number) / sum;
  for (let i = 0; i < fastCum.length; i++) fastCum[i] = (fastCum[i] as number) / fsum;
  const plan = { ...base, cum, fast, fastCum };
  cityPlans[kind] = plan;
  return plan;
}

/** The first index whose running total passes q. */
function pickIn(cum: Float64Array, q: number): number {
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((cum[mid] as number) < q) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

type CityRole = 'car' | 'street' | 'glow' | 'core';
const cityRole = (p: Particle): CityRole =>
  p.c < 0.08 ? 'car' : p.c < 0.74 ? 'street' : p.c < 0.95 ? 'glow' : 'core';
/** A grain of the city: where it is on the plan, the rank of its road, how dense the city is there. */
type CityGrain = { x: number; y: number; rank: number; dens: number; way: number };

/*
 * Each grain tries a few places in turn, taking the first the city's density
 * allows, so most land in the centre and fewer out in the suburbs, while the
 * highways keep theirs all the way out.
 */
export function cityGrain(p: Particle, t: number): CityGrain {
  const plan = cityPlan();
  const role = cityRole(p);
  if (role === 'car') {
    const road = plan.roads[at(plan.fast, pickIn(plan.fastCum, p.a))] as Road;
    const len = routeLength(road.route);
    const way = p.d < 0.5 ? 1 : -1;
    const s = wrap(p.b * len + way * t * 0.05 * (0.8 + 0.4 * hash(p.i, 85)), len);
    const [x, y] = along(road.route, s);
    return { x, y, rank: road.rank, dens: plan.dens(x, y), way };
  }
  if (role === 'core') {
    // The bright heart of the city, packed round its centre.
    for (let n = 0; n < 4; n++) {
      const a = hash(p.i, 86 + n) * TAU;
      const r = 0.1 * Math.sqrt(-2 * Math.log(1 - 0.95 * hash(p.i, 90 + n)));
      const x = plan.centre[0] + Math.cos(a) * r;
      const y = plan.centre[1] + Math.sin(a) * r;
      if (!plan.wet(x, y)) return { x, y, rank: 1, dens: plan.dens(x, y), way: 0 };
    }
  }
  let g: CityGrain = { x: 0, y: 0, rank: 3, dens: 0, way: 0 };
  for (let n = 0; n < 4; n++) {
    const q = n === 0 ? p.a : hash(p.i, 94 + n);
    const road = plan.roads[pickIn(plan.cum, q)] as Road;
    const len = routeLength(road.route);
    const s = (n === 0 ? p.b : hash(p.i, 98 + n)) * len;
    let [x, y] = along(road.route, s);
    if (role === 'glow') {
      // Lights in the blocks either side of the street, the windows and yards between roads.
      const [x2, y2] = along(road.route, Math.min(len, s + 0.01));
      const [x1, y1] = along(road.route, Math.max(0, s - 0.01));
      const l = Math.hypot(x2 - x1, y2 - y1) || 1;
      const off = (hash(p.i, 102 + n) - 0.5) * 0.04;
      x += (-(y2 - y1) / l) * off;
      y += ((x2 - x1) / l) * off;
      if (plan.wet(x, y)) continue;
    }
    const dens = plan.dens(x, y);
    g = { x, y, rank: road.rank, dens, way: 0 };
    const allow = road.rank === 0 && role === 'street' ? 1 : 0.08 + 0.92 * dens ** 0.8;
    if (hash(p.i, 106 + n) < allow) break;
  }
  return g;
}

/** How far the lights have come on at plan point (x, y), `u` through the piece: from the centre out. */
const cityLit = (x: number, y: number, u: number) => {
  const c = cityPlan().centre;
  return smooth((u * 5.5 - Math.hypot(x - c[0], y - c[1])) / 0.25);
};

const cityPos = (p: Particle, g: CityGrain): Vec3 => [
  g.x * CITY_K,
  g.y * CITY_K,
  (p.d - 0.5) * 0.3 + (cityRole(p) === 'core' ? p.b * 1.2 : 0),
];

/* ---------- 5. Tree 2D: the Star Tree, flat ---------- */

const GROUND_2D = -20;
const S2 = 26;
let flatRoutes: Route[] | null = null;
export function flatTree(): Route[] {
  if (!flatRoutes) flatRoutes = buildStarTree(8, 7, false).routes;
  return flatRoutes;
}
const isLeaf2 = (p: Particle) => p.c > 0.86;
const isSoil2 = (p: Particle) => p.c > 0.82 && !isLeaf2(p);

function flatPoint(p: Particle, u: number, t: number): Vec3 {
  if (isSoil2(p))
    return [(p.b - 0.5) * 80, GROUND_2D + Math.sin(p.b * 50 + t * 0.2) * 0.2, (p.d - 0.5) * 2];
  const routes = flatTree();
  const route = routes[Math.floor(p.a * routes.length)] as Route;
  const len = routeLength(route);
  const grown = 0.05 + 0.95 * smooth(u / 0.4);
  const leaf = isLeaf2(p);
  const dir = sapDir(p.c < 0.4);
  const s = leaf
    ? len * grown
    : len * grown * wrap(p.b + dir * t * 0.05 * (0.7 + 0.6 * p.c), 1) ** 0.6;
  const [x, y, w] = along(route, s);
  const pos: Vec3 = [
    (x + ((p.d - 0.5) * w) / 1) * S2,
    GROUND_2D + (y - FOOT_Y) * S2,
    (p.d - 0.5) * 0.8,
  ];
  if (!leaf) return pos;
  const g = 1.1 * Math.sqrt(p.b) * smooth((u - 0.25) / 0.2);
  const a = p.d * TAU * 3;
  return [pos[0] + Math.cos(a) * g, pos[1] + Math.sin(a) * g, pos[2]];
}

/* ---------- 6. Tree 3D: branches forking round their own axis ---------- */

const STEP3 = 0.2;
export type Route3 = { pts: Float32Array; count: number };
export const length3 = (r: Route3) => (r.count - 1) * STEP3;

/** Resamples a polyline of x, y, z, width to points STEP3 apart. */
export function resample3(raw: number[]): Route3 {
  const pts: number[] = [at(raw, 0), at(raw, 1), at(raw, 2), at(raw, 3)];
  let carry = 0;
  for (let i = 4; i + 3 < raw.length; i += 4) {
    const a = [at(raw, i - 4), at(raw, i - 3), at(raw, i - 2), at(raw, i - 1)];
    const b = [at(raw, i), at(raw, i + 1), at(raw, i + 2), at(raw, i + 3)];
    const len = Math.hypot(at(b, 0) - at(a, 0), at(b, 1) - at(a, 1), at(b, 2) - at(a, 2));
    let s = STEP3 - carry;
    while (s <= len) {
      const f = s / (len || 1);
      for (let k = 0; k < 4; k++) pts.push(lerp(at(a, k), at(b, k), f));
      s += STEP3;
    }
    carry = len - (s - STEP3);
  }
  return { pts: Float32Array.from(pts), count: pts.length / 4 };
}

/** Where a point `s` along a 3D route is, and how wide the branch is there. */
export function along3(r: Route3, s: number): [number, number, number, number] {
  const f = Math.max(0, s / STEP3);
  const i = Math.min(r.count - 1, Math.floor(f));
  const j = Math.min(r.count - 1, i + 1);
  const q = Math.min(1, f - i);
  const p = r.pts;
  const v = (k: number) => lerp(p[i * 4 + k] as number, p[j * 4 + k] as number, q);
  return [v(0), v(1), v(2), v(3)];
}

export const GROUND_3D = -20;

/** How a 3D tree branches: forks off the trunk, how far each leans out and up, how it shortens. */
export type Shape3 = {
  first: number;
  tilt: number;
  lean: number;
  up: number;
  lenK: number;
  three: number;
};
const OAK_SHAPE: Shape3 = { first: 4, tilt: 0.38, lean: 0.25, up: 0.22, lenK: 0.76, three: 0.3 };

export function grow3(
  rng: () => number,
  o: Vec3,
  dir: Vec3,
  len: number,
  width: number,
  depth: number,
  turn: number,
  chain: number[],
  out: number[][],
  shape: Shape3 = OAK_SHAPE,
) {
  const e1 = norm(cross(dir, Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const e2 = cross(dir, e1);
  const end = add(o, dir, len);
  // A slight bend, so no branch is a ruler.
  const ba = rng() * TAU;
  const bend = add(
    add(o, dir, len * 0.5),
    add(mul(e1, Math.cos(ba)), e2, Math.sin(ba)),
    len * 0.12,
  );
  const next = chain.slice();
  for (let k = 0; k < 12; k++) {
    const f = k / 12;
    const g = 1 - f;
    for (let m = 0; m < 3; m++) {
      next.push(g * g * at(o, m) + 2 * g * f * at(bend, m) + f * f * at(end, m));
    }
    next.push(lerp(width, width * 0.7, f));
  }
  if (depth <= 0) {
    next.push(end[0], end[1], end[2], width * 0.7);
    out.push(next);
    return;
  }
  // Four main limbs off the trunk, so the crown is full all round; then twos and threes.
  const forks = chain.length === 0 ? shape.first : depth > 2 && rng() < shape.three ? 3 : 2;
  for (let i = 0; i < forks; i++) {
    // Each fork leans out round the branch's own axis, turning on by the golden angle each time.
    const a = turn + (i * TAU) / forks + (rng() - 0.5) * 0.4;
    const tilt = shape.tilt + shape.lean * rng();
    const side = add(mul(e1, Math.cos(a)), e2, Math.sin(a));
    const nd = norm(add(add(mul(dir, Math.cos(tilt)), side, Math.sin(tilt)), [0, shape.up, 0]));
    grow3(
      rng,
      end,
      nd,
      len * (shape.lenK + 0.08 * (rng() - 0.5)),
      width * 0.7,
      depth - 1,
      a + GOLDEN_ANGLE,
      next,
      out,
      shape,
    );
  }
}

let tree3Routes: Route3[] | null = null;
/** The 3D tree's routes, each from the foot of the trunk to one branch tip. */
export function tree3d(): Route3[] {
  if (tree3Routes) return tree3Routes;
  const out: number[][] = [];
  grow3(seeded(5), [0, GROUND_3D, 0], [0, 1, 0], 10, 1.6, 7, 0, [], out);
  tree3Routes = out.map(resample3);
  return tree3Routes;
}

type Tree3Role = 'wood' | 'leaf' | 'soil';
const tree3Role = (p: Particle): Tree3Role => (p.c > 0.8 ? 'leaf' : p.c > 0.72 ? 'soil' : 'wood');

/*
 * The ground round the 3D tree, to try on (2026-11-10: "a bunch of pills to
 * change the central circle ground at the base so I can experiment with
 * different textures and materials, like tall grass, short grass, desert
 * stones or desert sand"). Chosen by pills under a piece played on its own;
 * the Journey keeps the earth.
 */
export const GROUNDS = ['Earth', 'Short grass', 'Tall grass', 'Desert sand', 'Desert stones'];
let groundKind = 0;
export const hasGround = (k: number) => PHASES[k]?.id === 'tree-3d';
/*
 * The 3D tree all in gold, its green crown turned gold too (2026-11-10: "tree:
 * put ability to make it full gold, no green leaves on top"). A switch beside
 * the piece; the Journey keeps the green.
 */
let fullGold = false;
export function setGold(on: boolean) {
  fullGold = on;
}
export const hasGold = hasGround;
/*
 * One switch beside a piece, each piece its own (2026-11-11): Gold on the 3D
 * tree, No road on the full tree (the horizon line taken off), Green on
 * Reflection (gold trees with green leaves; all gold without it).
 */
let noRoad = false;
let reflGreen = false;
const SWITCHES: Record<string, string> = {
  'tree-3d': 'Gold',
  'full-tree': 'No road',
  reflection: 'Green',
};
export const hasSwitch = (k: number) => (PHASES[k]?.id ?? '') in SWITCHES;
export const switchLabel = (k: number) => SWITCHES[PHASES[k]?.id ?? ''] ?? '';
/** The switch on piece k on or off; the Journey (no piece) has them all off. */
export function setSwitch(on: boolean, k?: number) {
  const id = k === undefined ? '' : PHASES[k]?.id;
  fullGold = on && id === 'tree-3d';
  noRoad = on && id === 'full-tree';
  reflGreen = on && id === 'reflection';
}
const GROUND_R = 26;

/** Grain p of the ground, in the kind chosen. */
function groundPoint(p: Particle, t: number): Vec3 {
  const G = GROUND_3D;
  const disc = (u: number, v: number): [number, number] => {
    const a = v * TAU;
    const rr = GROUND_R * Math.sqrt(u);
    return [Math.cos(a) * rr, Math.sin(a) * rr];
  };
  switch (groundKind) {
    case 1:
    case 2: {
      // Blades: a few grains each up a thin blade that bends in the breeze, the tall ones more.
      const tall = groundKind === 2;
      const blades = tall ? 150 : 260;
      const n = Math.floor(hash(p.i, 90) * blades);
      const [x, z] = disc(hash(n, 91), hash(n, 92));
      const h = (tall ? 3.2 : 0.9) * (0.7 + 0.6 * hash(n, 93));
      const q = p.b;
      const lean = (Math.sin(t * 1.1 + x * 0.25 + z * 0.1) * (tall ? 0.6 : 0.15) + 0.2) * q * q;
      const dir = hash(n, 94) * TAU;
      return [x + Math.cos(dir) * lean * h, G + q * h, z + Math.sin(dir) * lean * h];
    }
    case 3: {
      // Sand: ripples left by the wind, faintly drifting.
      const [x, z] = disc(p.b, p.d);
      return [x, G + 0.3 * Math.sin(x * 0.5 + z * 0.18 + t * 0.05) + 0.1 * Math.sin(z * 1.3), z];
    }
    case 4: {
      // Stones: round backs of pebbles and rocks on a sandy floor.
      if (p.b < 0.3) {
        const [x, z] = disc(p.d, frac(p.b * 7));
        return [x, G, z];
      }
      const n = Math.floor(hash(p.i, 95) * 46);
      const [x, z] = disc(hash(n, 96), hash(n, 97));
      const r = 0.5 + 1.4 * hash(n, 98) ** 2;
      const s = fibonacciSphere(p.i % 61, 61);
      return [x + s[0] * r, G + Math.abs(s[1]) * r * 0.6, z + s[2] * r * 0.85];
    }
    default: {
      const [x, z] = disc(p.b, p.d);
      return [x, G, z];
    }
  }
}

const GRASS: RGB = [0.42, 0.72, 0.28];
const STRAW: RGB = [0.86, 0.8, 0.45];
const SAND: RGB = [0.95, 0.8, 0.55];
const STONE: RGB = [0.72, 0.66, 0.58];
function groundColour(p: Particle): RGB {
  switch (groundKind) {
    case 1:
      return scale(mix(GRASS, LEAF, p.b), 0.35 + 0.25 * p.b);
    case 2:
      return scale(mix(GRASS, STRAW, p.b ** 1.5), 0.3 + 0.3 * p.b);
    case 3:
      return scale(SAND, 0.22 + 0.12 * Math.sin(p.b * 40 + p.d * 9) ** 2);
    case 4:
      return p.b < 0.3 ? scale(SAND, 0.16) : scale(STONE, 0.3 + 0.2 * p.d);
    default:
      return scale(EARTH, 0.3);
  }
}

function tree3Point(p: Particle, u: number, t: number): Vec3 {
  const role = tree3Role(p);
  if (role === 'soil') return groundPoint(p, t);
  const routes = tree3d();
  const route = routes[Math.floor(p.a * routes.length)] as Route3;
  const len = length3(route);
  const grown = 0.05 + 0.95 * smooth(u / 0.42);
  if (role === 'leaf') {
    const [x, y, z] = along3(route, len * grown);
    const d = fibonacciSphere(p.i % 157, 157);
    const r = 1.8 * Math.cbrt(p.b) * smooth((u - 0.3) / 0.2);
    const flutter = Math.sin(t * 2 + p.i) * 0.15;
    return [x + d[0] * r + flutter, y + d[1] * r * 0.8, z + d[2] * r];
  }
  // Sap: half the grains climb, half come down, at an even pace all the way, so the base is
  // slow and calm (2026-11-10: "slower at the base for the pulse in tree 3d").
  const dir = sapDir(p.c < 0.38);
  const s = len * grown * wrap(p.b + dir * t * 0.04 * (0.7 + 0.6 * p.d), 1);
  const [x, y, z, w] = along3(route, s);
  const d = fibonacciSphere(p.i % 389, 389);
  return add([x, y, z], d, w * 0.5 * Math.sqrt(p.d));
}

/* ---------- 7. Veins: the Journey's network, made round and symmetric ---------- */

const VEIN_R = 24;
/** Eight turns round the centre, each one mirrored: sixteen copies of one branching. */
export const VEIN_FOLD = 8;

/*
 * Five drums (2026-11-10: "veins: make it centered and pulse more, pulse by
 * pulse, for a rhythm of stars, and make 5 different types of that same kind
 * of shape; looks like a buffalo drum, Lakota, seen from behind, very
 * shamanic and earthly"). Each is a branching repeated round a centre inside a
 * hoop, with the lacing of a hand drum's back running from the hoop to a knot
 * in the middle. They differ in how many turns, how the branching grows, a
 * twist, and rings. Chosen by pills; the Journey plays the first.
 */
type Drum = {
  name: string;
  fold: number;
  seed: number;
  depth: number;
  spread: number;
  shrink: number;
  /** How far the branching turns round the centre at the hoop, in radians. */
  twist: number;
  /** Rings between the knot and the hoop. */
  rings: number;
};
export const DRUMS: Drum[] = [
  {
    name: 'Drum',
    fold: VEIN_FOLD,
    seed: 31,
    depth: 5,
    spread: 0.32,
    shrink: 0.8,
    twist: 0,
    rings: 0,
  },
  {
    name: 'Four winds',
    fold: 4,
    seed: 11,
    depth: 6,
    spread: 0.42,
    shrink: 0.8,
    twist: 0,
    rings: 1,
  },
  { name: 'Sun', fold: 12, seed: 47, depth: 4, spread: 0.2, shrink: 0.88, twist: 0, rings: 0 },
  { name: 'Spiral', fold: 6, seed: 19, depth: 5, spread: 0.3, shrink: 0.82, twist: 1.3, rings: 0 },
  { name: 'Web', fold: 10, seed: 53, depth: 4, spread: 0.36, shrink: 0.8, twist: 0, rings: 3 },
];
let drumKind = 0;
const drum = () => DRUMS[drumKind] as Drum;
export const hasDrums = (k: number) => PHASES[k]?.id === 'veins';

/* The pieces' pills: the 3D tree's grounds and the veins' drums. */
export const hasVariants = (k: number) =>
  hasGround(k) || hasDrums(k) || hasReflTrees(k) || hasBlooms(k) || hasBird(k) || hasCities(k);
export const variantNames = (k: number) =>
  hasCities(k)
    ? CITIES.map((c) => c.name)
    : hasDrums(k)
      ? DRUMS.map((d) => d.name)
      : hasReflTrees(k)
        ? REFL_TREES.map((d) => d.name)
        : hasBlooms(k)
          ? BLOOMS
          : hasBird(k)
            ? PLAYERS
            : GROUNDS;
export const variantLabel = (k: number) =>
  hasCities(k)
    ? 'City'
    : hasDrums(k)
      ? 'Drum'
      : hasReflTrees(k)
        ? 'Tree'
        : hasBlooms(k)
          ? 'Flower'
          : hasBird(k)
            ? 'Play as'
            : 'Ground';
/** Pill i on piece k; with no piece (the Journey), the first of each. */
export function setVariant(i: number, k?: number) {
  if (k === undefined) {
    groundKind = 0;
    drumKind = 0;
    reflKind = 0;
    bloomKind = 0;
    cityKind = 0;
    quoteNow = 0;
    if (playerKind) setPlayer(0);
  } else if (hasCities(k)) cityKind = CITIES[i] ? i : 0;
  else if (hasDrums(k)) drumKind = i;
  else if (hasBird(k)) {
    if (i !== playerKind) setPlayer(i);
  } else if (hasBlooms(k)) bloomKind = i;
  else if (hasReflTrees(k)) reflKind = i;
  else if (hasGround(k)) groundKind = i;
}

/** The time between two beats of the drum, in seconds (2026-11-11: "slower pulse in veins"). */
export const BEAT = 2.4;
/**
 * How far through its beat the drum is at time t, 0 on the beat. The first beat falls half a beat
 * in, so a piece's loop, a whole number of beats long, joins between two beats.
 */
const beatPhase = (t: number) => wrap(t / BEAT + 0.5, 1);
/*
 * Four kinds of pulse, one per beat in turn (2026-11-11: "different kinds of
 * pulses, one of them where the roots keep taking the path, like it shapes the
 * root as it travels through it"):
 *   Wave       a wave of light leaves the centre and runs out to the tips
 *   Trace      the light draws the roots as it goes: ahead of it they are dark
 *   Heartbeat  two waves close together, lub-dub
 *   Return     the light gathers from the tips back into the centre
 */
export const PULSES = ['Wave', 'Trace', 'Heartbeat', 'Return'] as const;
/** Which pulse beat at time t is: 0 Wave, 1 Trace, 2 Heartbeat, 3 Return. */
export const pulseKind = (t: number) => Math.floor(t / BEAT + 0.5) % PULSES.length;
const FADE = Math.exp(-4);
const strike = (x: number) =>
  x <= 0 ? 0 : (smooth(x / 0.06) * (Math.exp(-4 * x) - FADE)) / (1 - FADE);
/** How strongly the drum is sounding at time t: 0 at the start and end of every beat. */
export const beatAt = (t: number) => {
  const x = beatPhase(t);
  switch (pulseKind(t)) {
    case 2:
      return Math.max(strike(x), 0.75 * strike(x - 0.28));
    case 3:
      // Swelling as the light comes home, sounding as it reaches the centre.
      return smooth((x - 0.25) / 0.5) * smooth((1 - x) / 0.2);
    default:
      return strike(x);
  }
};
/** How far out the light has run on beat t, 0 at the centre to 1 at the tips; slowing as it goes. */
const runOut = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 2;
/** How far along its route (0..1) pulse grain with seeds sb, sd is at time t. */
function pulseAlong(sb: number, sd: number, t: number): number {
  const x = beatPhase(t) + (sb - 0.5) * 0.05;
  switch (pulseKind(t)) {
    case 1:
      return runOut(x / 0.8);
    case 2:
      return sd < 0.5 ? runOut(x / 0.45) : runOut((x - 0.28) / 0.45);
    case 3:
      return 1 - runOut((x - 0.1) / 0.75);
    default:
      return runOut(x);
  }
}
/** On a Trace beat, how lit a vein is `q` (0..1) of the way out: dark ahead of the light. */
function traced(q: number, t: number): number {
  if (pulseKind(t) !== 1) return 1;
  const x = beatPhase(t);
  const front = runOut(x / 0.8);
  const ahead = smooth((q - front) / 0.06);
  return 1 - 0.88 * smooth(x / 0.08) * ahead;
}

type Mandala = { routes: Route[]; reach: number };
const mandalaNets: (Mandala | null)[] = DRUMS.map(() => null);
/** One branching of drum `kind` grown up from the centre, and how far out it reaches. */
export function mandala(kind = drumKind): Mandala {
  const cached = mandalaNets[kind];
  if (cached) return cached;
  const d = DRUMS[kind] as Drum;
  const rng = seeded(d.seed);
  const out: Seg[][] = [];
  grow(rng, 0, 0, 0, 0.2, 0.03, d.depth, d.spread, d.shrink, [], out);
  const routes = out.map((c) => resample(sampleChain(c, false)));
  let reach = 0;
  for (const r of routes) {
    for (let i = 0; i < r.count; i++) {
      reach = Math.max(reach, Math.hypot(r.pts[i * 3] as number, r.pts[i * 3 + 1] as number));
    }
  }
  const net = { routes, reach };
  mandalaNets[kind] = net;
  return net;
}

/*
 * Exactly symmetric (2026-11-10: "veins, make it symmetric"): grains go in
 * runs of sixteen, one per copy, and every grain of a run takes its role,
 * branch, place and pulse from the run, so the sixteen copies are the same
 * picture turned and mirrored, pulse for pulse.
 */
const veinCopies = () => drum().fold * 2;
type VeinSeed = { m: number; c: number; a: number; b: number; d: number };
function veinSeed(p: Particle): VeinSeed {
  const n = veinCopies();
  const run = Math.floor(p.i / n);
  return {
    m: p.i % n,
    c: hash(run, 81),
    a: hash(run, 78),
    b: hash(run, 79),
    d: hash(run, 80),
  };
}
type VeinRole = 'pulse' | 'tip' | 'ring' | 'lace' | 'vein';
const veinRole = (p: Particle): VeinRole => {
  const { c } = veinSeed(p);
  return c < 0.15 ? 'pulse' : c < 0.2 ? 'tip' : c < 0.28 ? 'ring' : c < 0.34 ? 'lace' : 'vein';
};

/** A shallow bowl facing the eye, so the round net has a little depth. */
const bowl = (x: number, y: number): Vec3 => [x, y, 3 - 0.012 * (x * x + y * y)];

/**
 * Point (x, y) of the branching, in drum units (the hoop at VEIN_R), placed in the grain's copy:
 * one of the drum's turns, mirrored or not, twisted by how far out it is. On each beat the whole
 * drum swells a touch, like a skin struck.
 */
function inCopy(p: Particle, x: number, y: number, t: number): Vec3 {
  const { m } = veinSeed(p);
  const { fold, twist } = drum();
  const mx = m & 1 ? -x : x;
  const a = ((m >> 1) / fold) * TAU + t * 0.03 + twist * (Math.hypot(x, y) / VEIN_R) ** 1.2;
  const k = 1 + 0.02 * beatAt(t);
  return bowl((mx * Math.cos(a) - y * Math.sin(a)) * k, (mx * Math.sin(a) + y * Math.cos(a)) * k);
}

/** Where the hoop's lacing meets in the middle. */
const KNOT_R = 2.2;

function veinsPoint(p: Particle, t: number): Vec3 {
  const role = veinRole(p);
  const { m, a: sa, b: sb, d: sd } = veinSeed(p);
  const { fold, rings } = drum();
  if (role === 'ring') {
    // The hoop, and the drum's inner rings, each one arc repeated round in every copy.
    const ring = rings > 0 && sd < 0.45 ? 1 + Math.floor((sd / 0.45) * rings) : 0;
    const a = ((m + sb) / veinCopies()) * TAU + t * 0.03;
    const R = ring
      ? KNOT_R + ((VEIN_R - KNOT_R) * ring) / (rings + 1)
      : VEIN_R * 1.06 + (frac(sd * 7) - 0.5) * 0.5;
    const k = 1 + 0.02 * beatAt(t);
    return bowl(Math.cos(a) * R * k, Math.sin(a) * R * k);
  }
  if (role === 'lace') {
    // The lacing: a straight thong from the hoop to the knot, two to a copy, and the knot.
    if (sd < 0.2) {
      const a = sb * TAU;
      const r = KNOT_R * Math.sqrt(sd / 0.2);
      return inCopy(p, Math.cos(a) * r, Math.sin(a) * r, t);
    }
    const r = KNOT_R + (VEIN_R * 1.04 - KNOT_R) * sb;
    const lean = Math.PI / (2 * fold);
    return inCopy(p, Math.sin(lean) * r, Math.cos(lean) * r, t);
  }
  const net = mandala();
  const route = net.routes[Math.floor(sa * net.routes.length)] as Route;
  const len = routeLength(route);
  // On each beat the light runs along the branching, in that beat's kind of pulse; a few grains
  // rest and glow at the tips.
  const s = role === 'tip' ? len : role === 'pulse' ? len * pulseAlong(sb, sd, t) : len * sb ** 0.6;
  const [x, y, w] = along(route, s);
  const k = VEIN_R / net.reach;
  return inCopy(p, (x + (sd - 0.5) * w) * k, y * k, t);
}

/* ---------- 8. Fungi: threads from spores, joined into one net ---------- */

const SOIL = -6;
const FK = 40;
export const SPORES = 9;
type FungalNet = { routes: Route[]; hyphae: number; spores: [number, number][] };
let fungalNet: FungalNet | null = null;
export function fungi(): FungalNet {
  if (fungalNet) return fungalNet;
  const rng = seeded(41);
  const spores: [number, number][] = Array.from({ length: SPORES }, (_, k) => [
    (hash(k, 1) - 0.5) * 1.1,
    (hash(k, 2) - 0.5) * 0.7,
  ]);
  const chains: Seg[][] = [];
  const owner: number[] = [];
  spores.forEach(([x, y], k) => {
    for (let m = 0; m < 5; m++) {
      const before = chains.length;
      grow(rng, x, y, (m / 5) * TAU + rng(), 0.07, 0.012, 4, 0.6, 0.85, [], chains);
      for (let q = before; q < chains.length; q++) owner.push(k);
    }
  });
  const tip = (c: Seg[]) => c[c.length - 1] as Seg;
  // Where threads of two spores meet, they join: a link from tip to nearest foreign tip.
  const links: Route[] = [];
  for (let i = 0; i < chains.length && links.length < 60; i += 3) {
    const a = tip(chains[i] as Seg[]);
    let best: Seg | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (let j = 0; j < chains.length; j++) {
      if (owner[j] === owner[i]) continue;
      const b = tip(chains[j] as Seg[]);
      const d = Math.hypot(b.x1 - a.x1, b.y1 - a.y1);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    if (!best || bestD > 0.25) continue;
    const raw: number[] = [];
    for (let k = 0; k <= 16; k++) {
      const q = k / 16;
      const wob = Math.sin(Math.PI * q) * 0.02 * (hash(i, 3) - 0.5);
      raw.push(lerp(a.x1, best.x1, q) + wob, lerp(a.y1, best.y1, q) - wob, 0.006);
    }
    links.push(resample(raw));
  }
  const hyphae = chains.map((c) => resample(sampleChain(c, false)));
  fungalNet = { routes: [...hyphae, ...links], hyphae: hyphae.length, spores };
  return fungalNet;
}

type FungusRole = 'pulse' | 'spore' | 'soil' | 'thread' | 'mushroom';
const fungusRole = (p: Particle): FungusRole =>
  p.c < 0.2
    ? 'pulse'
    : p.c < 0.25
      ? 'spore'
      : p.c < 0.3
        ? 'soil'
        : p.c < 0.86
          ? 'thread'
          : 'mushroom';

const onSoil = (x: number, z: number, t: number): Vec3 => [
  x * FK,
  SOIL + Math.sin(x * 9 + t * 0.1) * 0.6 + Math.cos(z * 7) * 0.5,
  z * FK,
];

/** Mushroom m: where it stands, how tall, how wide its cap. */
const mushroom = (m: number) => {
  const [x, z] = fungi().spores[m] as [number, number];
  return { x: x * FK, z: z * FK, h: 5 + 2 * hash(m, 5), cap: 2.2 + 0.8 * hash(m, 6) };
};

function fungusPoint(p: Particle, u: number, t: number): Vec3 {
  const net = fungi();
  const role = fungusRole(p);
  if (role === 'spore') {
    const [x, z] = net.spores[Math.floor(p.a * SPORES)] as [number, number];
    return add(onSoil(x, z, t), fibonacciSphere(p.i % 61, 61), 0.7 * Math.cbrt(p.b));
  }
  if (role === 'soil') return onSoil((p.b - 0.5) * 1.4, (p.d - 0.5) * 0.9, t);
  if (role === 'mushroom') {
    const m = Math.floor(p.a * 5);
    const { x, z, h, cap } = mushroom(m);
    const rise = smooth((u - 0.25 - 0.04 * m) / 0.25);
    const top = SOIL + h * rise;
    if (p.d < 0.35) {
      const a = frac(p.d * 31) * TAU;
      return [x + Math.cos(a) * 0.45, SOIL + (top - SOIL) * p.b, z + Math.sin(a) * 0.45];
    }
    const d = fibonacciSphere(p.i % 301, 301);
    const R = cap * (0.2 + 0.8 * rise);
    // The dome above; underneath, the gills, spokes out from the stalk.
    if (d[1] >= 0) return [x + d[0] * R, top + d[1] * R * 0.6, z + d[2] * R];
    const a = (Math.floor(p.d * 24) / 24) * TAU;
    const rr = R * Math.sqrt(p.b);
    return [x + Math.cos(a) * rr, top - 0.1, z + Math.sin(a) * rr];
  }
  const r = Math.floor(p.a * net.routes.length);
  const route = net.routes[r] as Route;
  const len = routeLength(route);
  const reach = 0.06 + 0.94 * smooth(u / 0.4);
  const s =
    role === 'pulse'
      ? len * reach * wrap(p.b + (p.d < 0.5 ? 1 : -1) * t * 0.25, 1)
      : len * reach * p.b ** (r < net.hyphae ? 0.6 : 1);
  const [x, y, w] = along(route, s);
  const pos = onSoil(x, y, t);
  return [pos[0] + (p.d - 0.5) * w * FK, pos[1], pos[2] + (p.d - 0.5) * w * FK];
}

/* ---------- 9. Leaf: a midrib, veins forking to the edge, light in, sugar out ---------- */

export const PETIOLE: Vec3 = [0, -24, 0];
const BLADE_FOOT = -17;
const BLADE_LEN = 36;
export const VEINS = 18;
const midX = (v: number) => 1.2 * Math.sin(v * 2.2);
const halfWidth = (v: number) =>
  13 * Math.sin(Math.PI * Math.max(0, Math.min(1, v)) ** 0.85) ** 0.8;

/** A point of the leaf's blade: `v` from foot to tip, `x` -1..1 from edge to edge. */
function leafAt(v: number, x: number, t: number): Vec3 {
  const X = midX(v) + x * halfWidth(v);
  const curl = -0.012 * X * X + 2 * Math.sin(v * Math.PI) + Math.sin(t * 0.5 + v * 3) * 0.4;
  return [X, BLADE_FOOT + v * BLADE_LEN, curl];
}

/** Where vein k starts on the midrib. */
const veinFoot = (k: number) => 0.08 + (0.8 * Math.floor(k / 2)) / (VEINS / 2 - 1);

function veinAt(k: number, q: number, t: number): Vec3 {
  const side = k % 2 ? 1 : -1;
  const v0 = veinFoot(k);
  const v1 = Math.min(0.97, v0 + 0.14);
  const a = leafAt(v0, 0, t);
  const c = leafAt(v0 + 0.05, side * 0.5, t);
  const b = leafAt(v1, side * 0.95, t);
  const g = 1 - q;
  return [
    g * g * a[0] + 2 * g * q * c[0] + q * q * b[0],
    g * g * a[1] + 2 * g * q * c[1] + q * q * b[1],
    g * g * a[2] + 2 * g * q * c[2] + q * q * b[2],
  ];
}

/** The midrib and the stalk below it, `q` from the foot of the stalk to the tip. */
function midribAt(q: number, t: number): Vec3 {
  const y = PETIOLE[1] + q * (BLADE_FOOT + BLADE_LEN - PETIOLE[1]);
  if (y < BLADE_FOOT) return [0, y, 0];
  return leafAt((y - BLADE_FOOT) / BLADE_LEN, 0, t);
}

type LeafRole = 'midrib' | 'vein' | 'blade' | 'light' | 'sugar';
const leafRole = (p: Particle): LeafRole =>
  p.c < 0.14
    ? 'midrib'
    : p.c < 0.42
      ? 'vein'
      : p.c < 0.82
        ? 'blade'
        : p.c < 0.92
          ? 'light'
          : 'sugar';

/** How far a grain of light has fallen, 0..1 (1 is on the leaf). */
const lightFall = (p: Particle, t: number) => frac(t * 0.35 + hash(p.i, 3));

function leafPoint(p: Particle, u: number, t: number): Vec3 {
  let pos: Vec3;
  switch (leafRole(p)) {
    case 'midrib':
      pos = add(midribAt(p.b, t), [(p.d - 0.5) * 0.5, 0, 0]);
      break;
    case 'vein':
      pos = add(veinAt(Math.floor(p.a * VEINS), p.b, t), [0, (p.d - 0.5) * 0.25 * (1 - p.b), 0]);
      break;
    case 'blade':
      pos = leafAt(p.b, p.d * 2 - 1, t);
      break;
    case 'light': {
      const land = leafAt(hash(p.i, 4), hash(p.i, 5) * 2 - 1, t);
      const f = lightFall(p, t);
      pos = add(land, [-10, 20, 20], 1 - f);
      break;
    }
    default: {
      // Sugar: down a vein to the midrib, then down the midrib to the stalk.
      const k = Math.floor(p.a * VEINS);
      const f = frac(p.b + t * 0.12);
      pos = f < 0.5 ? veinAt(k, 1 - 2 * f, t) : leafAt(veinFoot(k) * (2 - 2 * f), 0, t);
    }
  }
  // The leaf unfurls from its stalk.
  const g = 0.15 + 0.85 * smooth(u / 0.4);
  return lerp3(PETIOLE, pos, g);
}

/* ---------- 10. Flower: florets on the golden angle ---------- */

export const HEAD: Vec3 = [0, 4, 0];
export const FLORETS = 700;
const HEAD_R = 8.5;
const PETALS = 34;
const PETAL_LEN = 9;

/** Floret n of the head, open 0..1: Vogel's spiral, r = c·√n, turned by the golden angle each time. */
export function floret(n: number, open: number, t: number): Vec3 {
  const r = (HEAD_R / Math.sqrt(FLORETS)) * Math.sqrt(n) * (0.3 + 0.7 * open);
  const th = n * GOLDEN_ANGLE + t * 0.02;
  const dome = 1.2 * (1 - (r / HEAD_R) ** 2);
  return [HEAD[0] + r * Math.cos(th), HEAD[1] + r * Math.sin(th), HEAD[2] + dome];
}

// No stem (2026-11-10: "flower without the green tige"): the head floats, its grains in the petals.
type FlowerRole = 'floret' | 'petal' | 'pollen';
const flowerRole = (p: Particle): FlowerRole =>
  p.c < 0.5 ? 'floret' : p.c < 0.92 ? 'petal' : 'pollen';
const opening = (u: number) => smooth(u / 0.4);

function flowerPoint(p: Particle, u: number, t: number): Vec3 {
  const open = opening(u);
  switch (flowerRole(p)) {
    case 'floret': {
      const n = Math.floor(p.a * FLORETS);
      const d = fibonacciSphere(p.i % 53, 53);
      return add(floret(n, open, t), d, (0.18 + 0.14 * (n / FLORETS)) * Math.sqrt(p.d));
    }
    case 'petal': {
      // Petals lie back from a closed cup to open flat, the inner row a little behind.
      const m = Math.floor(p.a * PETALS);
      const phi = (m / PETALS) * TAU + t * 0.02;
      const beta = lerp(0.15, Math.PI / 2 - 0.12, open);
      const er: Vec3 = [Math.cos(phi), Math.sin(phi), 0];
      const axis: Vec3 = [er[0] * Math.sin(beta), er[1] * Math.sin(beta), Math.cos(beta)];
      const wide: Vec3 = [-Math.sin(phi), Math.cos(phi), 0];
      const rim = HEAD_R * (0.3 + 0.7 * open) + 0.5;
      const q = p.b;
      const w = (p.d * 2 - 1) * 1.4 * Math.sin(Math.PI * q ** 0.8);
      const base = add(HEAD, er, rim);
      return add(add(add(base, axis, q * PETAL_LEN), wide, w), [0, 0, m % 2 ? -0.4 : 0]);
    }
    default: {
      const f = frac(p.b + t * 0.08);
      const from = floret(Math.floor(hash(p.i, 7) * FLORETS), open, t);
      return add(from, [Math.sin(p.d * TAU) * 14, 10 + Math.sin(t + p.i) * 0.5, 6], f);
    }
  }
}

/* ---------- 11. Fruit & seed: swells, ripens, falls, opens, a seed sprouts ---------- */

export const GROUND_FRUIT = -16;
export const SEEDS = 7;
/** The seed that sprouts. */
const SPROUT = 3;

/** The fruit's centre and radius, `u` through the piece: it hangs, swells, then falls. */
export function fruitOf(u: number, t: number): { c: Vec3; r: number } {
  const swell = smooth(u / 0.28);
  const r = 2.5 + 3.5 * swell;
  const q = Math.min(1, Math.max(0, (u - 0.34) / 0.14));
  const y = HEAD[1] + (GROUND_FRUIT + r - HEAD[1]) * q * q;
  const sway = Math.sin(t * 0.8) * 0.4 * swell * (1 - q);
  return { c: [sway, y, 0], r };
}

/** Where seed k lies on the ground once the fruit has opened. */
const seedGround = (k: number): Vec3 => [
  (k - (SEEDS - 1) / 2) * 3.2 + (hash(k, 2) - 0.5),
  GROUND_FRUIT + 0.4,
  (hash(k, 3) - 0.5) * 4,
];

type FruitRole = 'skin' | 'flesh' | 'soil' | 'seed' | 'sprout';
// Seeds and the sprout are small, so only a few grains each; the rest is skin.
const fruitRole = (p: Particle): FruitRole =>
  p.c < 0.45 || p.c >= 0.82
    ? 'skin'
    : p.c < 0.64
      ? 'flesh'
      : p.c < 0.66
        ? 'soil'
        : p.c < 0.74
          ? 'seed'
          : 'sprout';

function seedAt(k: number, p: Particle, u: number, t: number): Vec3 {
  const { c, r } = fruitOf(u, t);
  const inFruit = add(c, fibonacciSphere(k, SEEDS), r * 0.45);
  const spill = smooth((u - 0.52) / 0.15);
  const sink = 0.8 * smooth((u - 0.62) / 0.1);
  const where = add(lerp3(inFruit, seedGround(k), spill), [0, -sink, 0]);
  const d = fibonacciSphere(p.i % 89, 89);
  return [where[0] + d[0] * 0.5, where[1] + d[1] * 0.75, where[2] + d[2] * 0.5];
}

function fruitPoint(p: Particle, u: number, t: number): Vec3 {
  const role = fruitRole(p);
  if (role === 'soil') return [(p.b - 0.5) * 70, GROUND_FRUIT, (p.d - 0.5) * 20];
  if (role === 'seed') return seedAt(Math.floor(p.a * SEEDS), p, u, t);
  if (role === 'sprout') {
    const grownUp = smooth((u - 0.64) / 0.22);
    const seed = seedAt(SPROUT, p, u, t);
    if (grownUp <= 0) return seed;
    const foot = add(seedGround(SPROUT), [0, -0.8, 0]);
    // A shoot up, a root down, and two seed leaves at the top.
    let pos: Vec3;
    if (p.d < 0.3) pos = add(foot, [Math.sin(p.b * 3) * 0.3, p.b * 6 * grownUp, 0]);
    else if (p.d < 0.5) pos = add(foot, [Math.sin(p.b * 5) * 0.4, -p.b * 3 * grownUp, 0]);
    else {
      const side = p.d < 0.75 ? -1 : 1;
      const q = p.b;
      const top = add(foot, [0, 6 * grownUp, 0]);
      pos = add(top, [
        side * q * 2.4 * grownUp,
        Math.sin(Math.PI * q) * 0.8 * grownUp,
        (frac(p.d * 9) - 0.5) * 0.9 * Math.sin(Math.PI * q),
      ]);
    }
    return lerp3(seed, pos, smooth(grownUp * 3));
  }
  const { c, r } = fruitOf(u, t);
  const d = fibonacciSphere(p.i % 613, 613);
  const rr = role === 'skin' ? r : r * 0.9 * Math.cbrt(p.b);
  // It opens: each half tips outward about the bottom of the fruit, like two cups.
  const open = smooth((u - 0.5) / 0.12);
  if (open <= 0) return add(c, d, rr);
  const side = d[0] >= 0 ? 1 : -1;
  const vx = d[0] * rr;
  const vy = d[1] * rr + r;
  const th = -side * open * (Math.PI / 2);
  return [
    c[0] + side * open * 0.6 + vx * Math.cos(th) - vy * Math.sin(th),
    c[1] - r + vx * Math.sin(th) + vy * Math.cos(th),
    c[2] + d[2] * rr,
  ];
}

/* ---------- 12–13. Avenue and Forest: flying down a road as the trees grow ---------- */

/** Half the road's width; the eye flies a little above it. */
export const ROAD_W = 3.2;
export const EYE_H = 3;
/** The stretch of road the trees stand along: the eye flies on, and the stretch comes round again. */
const LOOP = 140;
/** How far behind the eye a tree stays before it goes round to the far end. */
const BEHIND = 14;
const SPEED = 3.6;
export const FOREST_SLOTS = 22;
const isAvenue = (k: number) => PHASES[k]?.id === 'avenue';
export const isForest = (k: number) => PHASES[k]?.id === 'avenue' || PHASES[k]?.id === 'forest';

let forestKinds: Route3[][] | null = null;
/** Four kinds of tree, grown as the 3D tree is but smaller. The avenue uses only the first. */
export function forestTrees(): Route3[][] {
  if (forestKinds) return forestKinds;
  forestKinds = [11, 12, 13, 14].map((seed, i) => {
    const out: number[][] = [];
    grow3(seeded(seed), [0, 0, 0], [0, 1, 0], 4.2 - 0.3 * i, 0.9, 5, seed, [], out);
    return out.map(resample3);
  });
  return forestKinds;
}

export type TreeSlot = {
  x: number;
  z0: number;
  kind: number;
  size: number;
  yaw: number;
  mirror: boolean;
};
/**
 * Where tree slot j stands. In the avenue, rows at even steps, the right
 * tree the mirror of the left. In the forest, each tree has its own place,
 * kind, size and turn, and the two sides do not match.
 */
export function treeSlot(k: number, j: number): TreeSlot {
  if (isAvenue(k)) {
    const side = j % 2 ? 1 : -1;
    return {
      x: side * (ROAD_W + 3.6),
      z0: ((j >> 1) * LOOP) / (FOREST_SLOTS / 2),
      kind: 0,
      size: 1,
      yaw: 0,
      mirror: side > 0,
    };
  }
  const side = hash(j, 41) < 0.5 ? -1 : 1;
  return {
    x: side * (ROAD_W + 2.2 + 9 * hash(j, 42) ** 1.4),
    z0: (j + 0.8 * (hash(j, 43) - 0.5)) * (LOOP / FOREST_SLOTS),
    kind: Math.floor(hash(j, 44) * 4),
    size: 0.7 + 0.55 * hash(j, 45),
    yaw: hash(j, 46) * TAU,
    mirror: false,
  };
}

/** How far the eye has flown, `u` through the piece. */
const flown = (k: number, u: number) => SPEED * u * (PHASES[k] as VegetalPhase).duration;
/** How far ahead of the eye a thing standing at z0 along the loop is. */
const ahead = (z0: number, s: number) => wrap(z0 - s, LOOP) - BEHIND;
/** Trees are seedlings far ahead and grown by the time the eye reaches them. */
const grownAt = (d: number) => 0.04 + 0.96 * smooth((LOOP - BEHIND - 14 - d) / 55);
/** Light fades into the far dark, so the far end of the road never pops. */
const haze = (d: number) => smooth((LOOP - BEHIND - d) / 40);

/*
 * The wild forest follows a river, not a road, toward a mountain far ahead
 * (2026-11-10: "make it a sinuous river instead of a road, and put a
 * mountain in the distant horizon as the point it seems to be getting to").
 * The river bends twice per turn of the loop, with a smaller ripple, so the
 * recycled stretch still joins up; the mountain keeps its distance.
 */
/** How far the river has bent aside at z0 along the loop. The avenue's road runs straight. */
export const bendAt = (k: number, z0: number) =>
  isAvenue(k) ? 0 : 6 * Math.sin((TAU * 2 * z0) / LOOP) + 2.4 * Math.sin((TAU * 5 * z0) / LOOP + 1);
/** How far ahead the mountain stands, always. */
export const MOUNTAIN_D = 135;
/** Its size: tall enough to rise well above the far trees. */
const MOUNTAIN_K = 1.2;
/** The mountain's ridge: one peak and two smaller shoulders. */
export const ridge = (x: number) =>
  34 * Math.exp(-((x / 34) ** 2)) +
  17 * Math.exp(-(((x + 52) / 22) ** 2)) +
  13 * Math.exp(-(((x - 56) / 20) ** 2)) +
  1.6 * Math.sin(x * 0.35) * Math.exp(-((x / 80) ** 2));

type ForestRole = 'edge' | 'dash' | 'water' | 'mountain' | 'ground' | 'firefly' | 'leaf' | 'wood';
function forestRole(k: number, p: Particle): ForestRole {
  // The mountain is far and wide, so it takes a good share of the grains, from the trunks.
  if (!isAvenue(k) && p.c >= 0.92) return 'mountain';
  if (p.c >= 0.19) return p.c < 0.22 ? 'firefly' : p.c < 0.42 ? 'leaf' : 'wood';
  if (isAvenue(k)) return p.c < 0.07 ? 'edge' : p.c < 0.1 ? 'dash' : 'ground';
  return p.c < 0.07 ? 'edge' : p.c < 0.13 ? 'water' : 'ground';
}

/** Grain p in the forest: where it stands and how far ahead of the eye it is. */
function forestAt(k: number, p: Particle, u: number, t: number): { pos: Vec3; d: number } {
  const s = flown(k, u);
  const side = p.d < 0.5 ? -1 : 1;
  const on = (z0: number, x: number, y: number) => {
    const d = ahead(z0, s);
    return { pos: [x + bendAt(k, z0), y, -s - d] as Vec3, d };
  };
  switch (forestRole(k, p)) {
    case 'edge': {
      // The road's edge, or a river bank that wavers a little.
      const z0 = p.b * LOOP;
      const w = isAvenue(k) ? ROAD_W : ROAD_W + 0.35 * Math.sin(z0 * 0.7 + side);
      return on(z0, side * w, 0.02);
    }
    case 'water': {
      // The river's surface, flowing past: light caught on its ripples.
      const z0 = p.b * LOOP - t * 1.2;
      const across = (p.d * 2 - 1) * (ROAD_W - 0.3);
      return on(z0, across, Math.sin(z0 * 1.3 + p.d * 9 + t) * 0.05);
    }
    case 'mountain': {
      // Far ahead of the eye, wherever it is: an outline, a faint face, snow on the peak.
      const x = (p.b - 0.5) * 170;
      const top = ridge(x);
      const y = p.d < 0.6 ? top : top * ((p.d - 0.6) / 0.4) ** 0.7;
      return {
        pos: [x * MOUNTAIN_K, y * MOUNTAIN_K, -s - MOUNTAIN_D + (frac(p.d * 11) - 0.5) * 4],
        d: 0,
      };
    }
    case 'dash': {
      // A broken line down the middle: dashes 2.5 long, 6 apart.
      const n = Math.floor(p.b * (LOOP / 6));
      return on(n * 6 + 2.5 * frac(p.d * 7), 0, 0.02);
    }
    case 'ground': {
      const out = ROAD_W + 0.4 + 26 * frac(p.d * 5) ** 1.6;
      return on(p.b * LOOP, side * out, Math.sin(p.b * 400 + t * 0.3) * 0.05);
    }
    case 'firefly': {
      const out = ROAD_W + 1 + 9 * frac(p.d * 3);
      return on(
        p.b * LOOP + Math.sin(t * 0.3 + p.i) * 0.8,
        side * out + Math.sin(t * 0.4 + p.i * 2) * 0.6,
        1.2 + 5 * hash(p.i, 47) + Math.sin(t * 0.5 + p.i) * 0.4,
      );
    }
    default: {
      const slot = treeSlot(k, Math.floor(p.a * FOREST_SLOTS));
      const routes = forestTrees()[slot.kind] as Route3[];
      const route = routes[Math.floor(hash(p.i, 48) * routes.length)] as Route3;
      const len = length3(route);
      const d = ahead(slot.z0, s);
      const g = grownAt(d);
      let local: Vec3;
      if (forestRole(k, p) === 'leaf') {
        const [x, y, z] = along3(route, len * g);
        const sphere = fibonacciSphere(p.i % 157, 157);
        const r = 1.1 * Math.cbrt(p.b) * smooth((g - 0.55) / 0.35);
        local = [x + sphere[0] * r, y + sphere[1] * r * 0.8, z + sphere[2] * r];
      } else {
        // Sap climbing and falling, as in the 3D tree.
        const dir = sapDir(p.c < 0.71);
        const along = len * g * wrap(p.b + dir * t * 0.04 * (0.7 + 0.6 * p.d), 1) ** 0.45;
        const [x, y, z, w] = along3(route, along);
        local = add([x, y, z], fibonacciSphere(p.i % 389, 389), w * 0.5 * Math.sqrt(p.d));
      }
      const lx = slot.mirror ? -local[0] : local[0];
      const c = Math.cos(slot.yaw);
      const sn = Math.sin(slot.yaw);
      return {
        pos: [
          slot.x + bendAt(k, slot.z0) + (lx * c - local[2] * sn) * slot.size,
          local[1] * slot.size,
          -s - d + (lx * sn + local[2] * c) * slot.size,
        ],
        d,
      };
    }
  }
}

const forestPoint = (k: number, p: Particle, u: number, t: number) => forestAt(k, p, u, t).pos;

/* ---------- 15. Reflection: a still tree and the same tree in the water ---------- */

/*
 * 2026-11-10: "after full tree do reflection, with a tree and a reflection of
 * it on the water with soft ripples below it. Also symmetric, but the lower
 * part moving, without rotation of the upper tree." Grains go in pairs, one
 * in the tree and one in the water, sharing everything but the side, so the
 * reflection is the tree turned over; only it moves, with the ripples.
 */
/*
 * Five trees, each over its own water (2026-11-10: "reflection: make 5 types
 * of tree like this one, and for each type of reflection make the water
 * different, one where we can see soft ripples of stars on the water etc., to
 * make the water more visible"). No weeping willow. The water has twice the
 * grains it had, and each kind moves in its own way.
 */
type ReflTree = {
  name: string;
  /** How far down a branch from its tip the leaves reach, and how big each tuft is. */
  leafReach: number;
  leafR: number;
  leaf: RGB;
  bark: RGB;
  /** How much the reflection sways, and how bright it is beside the tree. */
  sway: number;
  shown: number;
};
export const REFL_TREES: ReflTree[] = [
  // The oak, the first tree, over soft ripples of stars spreading from under it.
  {
    name: 'Oak',
    leafReach: 0,
    leafR: 1.8,
    leaf: [0.62, 0.82, 0.38],
    bark: [0.75, 0.55, 0.32],
    sway: 0.7,
    shown: 0.5,
  },
  // A pine in whorls, dark needles along its boughs, over water still as a mirror.
  {
    name: 'Pine',
    leafReach: 7,
    leafR: 0.9,
    leaf: [0.3, 0.62, 0.46],
    bark: [0.62, 0.38, 0.26],
    sway: 0.12,
    shown: 0.72,
  },
  // A tall white birch, light leaves, in the rain: rings open and fade across the water.
  {
    name: 'Birch',
    leafReach: 3,
    leafR: 1.1,
    leaf: [0.82, 0.9, 0.45],
    bark: [0.95, 0.93, 0.88],
    sway: 0.45,
    shown: 0.5,
  },
  // A cherry in blossom under the moon: a glittering path, petals falling onto it.
  {
    name: 'Cherry',
    leafReach: 2,
    leafR: 1.7,
    leaf: [1, 0.64, 0.78],
    bark: [0.55, 0.34, 0.32],
    sway: 0.35,
    shown: 0.42,
  },
  // A baobab, thick trunk and a small crown, over water breathing out mist.
  {
    name: 'Baobab',
    leafReach: 0.6,
    leafR: 1.4,
    leaf: [0.6, 0.78, 0.36],
    bark: [0.8, 0.66, 0.58],
    sway: 0.9,
    shown: 0.32,
  },
];
let reflKind = 0;
const reflTree = () => REFL_TREES[reflKind] as ReflTree;
export const hasReflTrees = (k: number) => PHASES[k]?.id === 'reflection';

/** How each tree grows: forks off the trunk, how far each fork leans out, and how it shortens. */
const TREE_SHAPES: { seed: number; len: number; width: number; depth: number; shape: Shape3 }[] = [
  {
    seed: 9,
    len: 9,
    width: 0.9,
    depth: 7,
    shape: { first: 3, tilt: 0.3, lean: 0.15, up: 0.3, lenK: 0.78, three: 0.2 },
  },
  {
    seed: 13,
    len: 9,
    width: 1.4,
    depth: 7,
    shape: { first: 4, tilt: 0.75, lean: 0.3, up: 0.02, lenK: 0.8, three: 0.35 },
  },
  {
    seed: 17,
    len: 17,
    width: 4.5,
    depth: 5,
    shape: { first: 5, tilt: 0.9, lean: 0.3, up: 0.15, lenK: 0.6, three: 0.5 },
  },
];

/** A pine: a straight trunk and whorls of boughs that droop and turn up at the ends, shorter higher up. */
function pineRoutes(): Route3[] {
  const G = GROUND_3D;
  const H = 40;
  const trunk = (to: number) => {
    const raw: number[] = [];
    for (let y = 0; y <= to; y += 0.5) raw.push(0, G + y, 0, 1.3 * (1 - (0.85 * y) / H));
    return raw;
  };
  const routes: Route3[] = [resample3(trunk(H))];
  for (let k = 0; k < 12; k++) {
    const h = 10 + k * 2.5;
    const L = 12 * (1 - k / 12) + 1.4;
    for (let i = 0; i < 5; i++) {
      const a = k * GOLDEN_ANGLE + (i * TAU) / 5;
      const raw = trunk(h);
      for (let j = 1; j <= 10; j++) {
        const f = j / 10;
        raw.push(
          Math.cos(a) * L * f,
          G + h - 0.3 * L * f + 0.22 * L * f * f,
          Math.sin(a) * L * f,
          0.3 * (1 - f) + 0.05,
        );
      }
      routes.push(resample3(raw));
    }
  }
  return routes;
}

const reflRoutes: (Route3[] | null)[] = REFL_TREES.map(() => null);
/** The routes of reflection tree `kind`, each from the foot of the trunk to one tip. */
export function reflTreeRoutes(kind = reflKind): Route3[] {
  const cached = reflRoutes[kind];
  if (cached) return cached;
  let routes: Route3[];
  if (kind === 0) routes = tree3d();
  else if (kind === 1) routes = pineRoutes();
  else {
    const s = TREE_SHAPES[kind - 2] as (typeof TREE_SHAPES)[0];
    const out: number[][] = [];
    grow3(
      seeded(s.seed),
      [0, GROUND_3D, 0],
      [0, 1, 0],
      s.len,
      s.width,
      s.depth,
      0,
      [],
      out,
      s.shape,
    );
    routes = out.map(resample3);
  }
  reflRoutes[kind] = routes;
  return routes;
}

type ReflSeed = { under: boolean; c: number; a: number; b: number; d: number; run: number };
function reflSeed(p: Particle): ReflSeed {
  const run = Math.floor(p.i / 2);
  return {
    under: p.i % 2 === 1,
    c: hash(run, 101),
    a: hash(run, 102),
    b: hash(run, 103),
    d: hash(run, 104),
    run,
  };
}
type ReflRole = 'water' | 'wood' | 'leaf';
const reflRole = (c: number): ReflRole => (c < 0.2 ? 'water' : c < 0.78 ? 'wood' : 'leaf');
const REFL_K = 0.75;
/** The moon, high over the cherry's water. */
const MOON: Vec3 = [24, 30, -45];
const RAIN_DROPS = 40;
const RAIN_EVERY = 3;
/** A falling cherry petal: how far down from the crown to the water it has come. */
const petalFall = (run: number, t: number) => frac(t * 0.04 + hash(run, 105));
const isPetal = (run: number, d: number) => reflKind === 3 && d < 0.12 && hash(run, 106) < 0.9;

/** Grain p of the water, in the kind under the tree chosen. Each grain of a pair has its own place. */
function waterPoint(p: Particle, t: number): Vec3 {
  const { under, a, b, d } = reflSeed(p);
  const ua = under ? frac(a * 7.31 + 0.13) : a;
  const ub = under ? frac(b * 5.17 + 0.29) : b;
  const ud = under ? frac(d * 3.73 + 0.41) : d;
  const x = (ua - 0.5) * 130;
  const z = (ub - 0.5) * 60 - 5;
  switch (reflKind) {
    case 1:
      // Mirror still: long faint lines lying across the water, barely drifting.
      return [wrap(x + 65 + t * 0.3, 130) - 65, 0, (Math.floor(ub * 16) / 16 - 0.5) * 60 - 5];
    case 2: {
      // Rain: each drop opens a ring that widens and fades; a third of the grains lie still.
      if (ud < 0.3) return [x, 0, z];
      const n = Math.floor(ua * RAIN_DROPS);
      const age = t / RAIN_EVERY + hash(n, 107);
      const drop = Math.floor(age);
      const r = 0.3 + 5 * frac(age);
      const th = ub * TAU;
      return [
        (hash(n * 131 + drop, 108) - 0.5) * 100 + Math.cos(th) * r,
        0,
        (hash(n * 131 + drop, 109) - 0.5) * 50 - 5 + Math.sin(th) * r * 0.9,
      ];
    }
    case 3: {
      if (ud < 0.22) {
        // The moon above, and the same moon in the water below.
        const th = ua * TAU;
        const r = 3 * Math.sqrt(ub);
        return [
          MOON[0] + Math.cos(th) * r,
          (under ? -1 : 1) * (MOON[1] + Math.sin(th) * r),
          MOON[2],
        ];
      }
      // The glitter path, from under the moon toward the eye, widening as it comes.
      const f = ub;
      return [lerp(MOON[0], 0, f) + (ua - 0.5) * (1.5 + 9 * f), 0, lerp(MOON[2], 50, f)];
    }
    case 4:
      // Mist: grains hanging low over the water, drifting; the rest faint on the surface.
      if (under) return [x, 0, z];
      return [
        wrap(x + 65 + t * 0.4, 130) - 65,
        0.3 + 4 * ud * ud + Math.sin(t * 0.2 + x * 0.1) * 0.3,
        z,
      ];
    default:
      // Soft ripples of stars: a field of small stars on the water, rings of light passing out through it.
      return [x, Math.sin(Math.hypot(x, z) * 0.7 - t * 1.1) * 0.12, z];
  }
}

function waterColour(p: Particle, t: number): RGB {
  const { under, a, b, d, run } = reflSeed(p);
  const pos = waterPoint(p, t);
  const ud = under ? frac(d * 3.73 + 0.41) : d;
  switch (reflKind) {
    case 1:
      return scale(mix(WATER, SUN, 0.5), 0.2 + 0.05 * Math.sin(t * 0.5 + run));
    case 2: {
      if (ud < 0.3) return scale(WATER, 0.14);
      const n = Math.floor((under ? frac(a * 7.31 + 0.13) : a) * RAIN_DROPS);
      const age = frac(t / RAIN_EVERY + hash(n, 107));
      return scale(mix(WATER, SUN, 0.4), 0.15 + 0.75 * (1 - age) ** 1.5);
    }
    case 3: {
      if (ud < 0.22) return scale([0.98, 0.97, 0.88], under ? 0.5 : 0.85);
      const flick = Math.max(0, Math.sin(t * 3 + run * 2.1 + b * 9)) ** 6;
      return scale([0.95, 0.95, 0.85], 0.12 + 0.85 * flick);
    }
    case 4:
      return scale([0.85, 0.9, 0.95], under ? 0.12 : 0.16 + 0.06 * Math.sin(t * 0.3 + run));
    default: {
      const wave = Math.max(0, Math.sin(Math.hypot(pos[0], pos[2] + 5) * 0.7 - t * 1.1)) ** 4;
      const tw = 0.7 + 0.3 * Math.sin(t * 2.3 + run * 1.7);
      return scale(mix(WATER, SUN, 0.55), (0.14 + 0.6 * wave) * tw);
    }
  }
}

function reflectionPoint(p: Particle, u: number, t: number): Vec3 {
  const { under, c, a, b, d, run } = reflSeed(p);
  const role = reflRole(c);
  if (role === 'water') return waterPoint(p, t);
  const tree = reflTree();
  const routes = reflTreeRoutes();
  const route = routes[Math.floor(a * routes.length)] as Route3;
  const len = length3(route);
  const grown = 0.05 + 0.95 * smooth(u / 0.42);
  let q: Vec3;
  if (role === 'leaf') {
    const reach = tree.leafReach * hash(run, 110);
    const [x, y, z] = along3(route, Math.max(0, len * grown - reach));
    const s = fibonacciSphere(run % 157, 157);
    const r = tree.leafR * Math.cbrt(b) * smooth((u - 0.3) / 0.2);
    q = [x + s[0] * r, y + s[1] * r * 0.8, z + s[2] * r];
    if (isPetal(run, d)) {
      // A blossom petal drifting down from its place in the crown to the water, and resting there.
      const f = petalFall(run, t);
      const y0 = q[1];
      const fall = Math.min(1, f * 1.25);
      q = [
        q[0] + Math.sin(t * 0.7 + run) * 3 * fall,
        lerp(y0, GROUND_3D + 0.1, fall * fall),
        q[2] + Math.cos(t * 0.5 + run) * 2 * fall,
      ];
    }
  } else {
    const s = len * grown * wrap(b + sapDir(c < 0.44) * t * 0.04 * (0.7 + 0.6 * d), 1);
    const [x, y, z, w] = along3(route, s);
    q = add([x, y, z], fibonacciSphere(run % 389, 389), w * 0.5 * Math.sqrt(d));
  }
  const x = q[0] * REFL_K;
  const y = (q[1] - GROUND_3D) * REFL_K;
  const z = q[2] * REFL_K;
  if (!under) return [x, y, z];
  // Turned over in the water, swaying more the deeper it goes: ripples, as strong as the water moves.
  const deep = smooth(y / 10) * tree.sway;
  const mist = reflKind === 4 ? 1 : 0;
  return [
    x + Math.sin(y * 0.9 - t * 1.3) * deep + mist * Math.sin(t * 0.7 + run) * 0.8,
    -y + Math.sin(x * 0.5 + t * 0.9) * 0.35 * deep,
    z + mist * Math.cos(t * 0.6 + run * 1.3) * 0.8,
  ];
}

/*
 * ALL GOLD (2026-11-11: "keep the reflection all golden, or golden and green
 * as second option, no silver"). Every colour of the piece is turned to gold
 * at its own brightness, pale ones to a lighter gold, so there is no silver
 * or blue anywhere; with the Green switch the leaves stay green.
 */
const GOLD_HUE: RGB = [1, 0.82, 0.49];
function golden(rgb: RGB): RGB {
  const v = Math.max(rgb[0], rgb[1], rgb[2]);
  if (v <= 0) return [0, 0, 0];
  const pale = Math.min(rgb[0], rgb[1], rgb[2]) / v;
  return scale(mix(GOLD_HUE, SUGAR, pale * 0.7), v);
}

function reflectionColour(p: Particle, t: number): RGB {
  const { c, b, d, run } = reflSeed(p);
  const role = reflRole(c);
  if (role === 'water') return golden(waterColour(p, t));
  const rgb = reflectionTint(p, t);
  if (!reflGreen || role !== 'leaf' || isPetal(run, d)) return golden(rgb);
  return scale(mix(LEAF, [0.85, 0.9, 0.4], b), Math.max(rgb[0], rgb[1], rgb[2]));
}

function reflectionTint(p: Particle, t: number): RGB {
  const { under, c, b, d, run } = reflSeed(p);
  const role = reflRole(c);
  const tree = reflTree();
  const tw = 0.7 + 0.3 * Math.sin(t * 1.7 + run * 0.37);
  let rgb: RGB;
  if (role === 'leaf') {
    rgb =
      reflKind === 0
        ? scale(mix(LEAF, SUGAR, 0.35 + 0.4 * b), 0.7 * tw)
        : scale(mix(tree.leaf, [1, 0.95, 0.9], 0.3 * b), 0.7 * tw);
    if (isPetal(run, d)) rgb = scale([1, 0.78, 0.86], 0.8);
  } else if (reflKind === 2) {
    // The birch's white bark, with its dark marks.
    rgb = scale(hash(run, 111) < 0.18 ? [0.3, 0.26, 0.24] : tree.bark, 0.6 * tw);
  } else {
    rgb = scale(mix(tree.bark, GOLD, reflKind === 0 ? b : 0.3 * b), 0.68 * tw);
  }
  // The reflection is fainter and a little cooler, glinting as the ripples catch the light.
  if (!under) return rgb;
  const glint = 0.75 + 0.25 * Math.sin(t * 2 + run * 1.3);
  return scale(mix(rgb, WATER, 0.25), tree.shown * glint);
}

/* ---------- 16. Bloom: a flower growing and opening, in slow motion ---------- */

/*
 * 2026-11-10: "add a flower bloom to the visuals so it looks like a flower
 * growing and blooming in slow motion". A stem rises from the ground, two
 * leaves unfurl, a bud swells in its green sepals, the sepals fold back, the
 * petals open row by row from the outside in, and last the stamens rise and
 * pollen drifts up.
 */
const BLOOM_GROUND = -16;
const BLOOM_TOP = 6;
type BloomRole = 'stem' | 'leaf' | 'sepal' | 'petal' | 'stamen' | 'pollen';
const bloomRole = (p: Particle): BloomRole =>
  p.c < 0.1
    ? 'stem'
    : p.c < 0.18
      ? 'leaf'
      : p.c < 0.24
        ? 'sepal'
        : p.c < 0.86
          ? 'petal'
          : p.c < 0.95
            ? 'stamen'
            : 'pollen';
/** The stem's gentle S, at height y. */
const stemAt = (y: number): Vec3 => [
  0.9 * Math.sin((y - BLOOM_GROUND) * 0.12),
  y,
  0.5 * Math.sin((y - BLOOM_GROUND) * 0.07),
];
/** How high the stem has grown, u through the piece. */
const stemTop = (u: number) => lerp(BLOOM_GROUND + 0.5, BLOOM_TOP, smooth(u / 0.32));
/** A row of petals: how many, how long, how wide, how far each opens and curls. */
type PetalRow = { n: number; len: number; w: number; open: number; curl: number };
/*
 * FIVE FLOWERS AND FIREWORKS (2026-11-11: "make 5 diff types of flowers and
 * add a mode where it is just lots of flowers blooming like fireworks etc...
 * pure blooming beauty"). Each flower is its rows of petals, outside in, its
 * colours from the base of a petal to its edge, and its heart: how many
 * stamens, how tall, and the colour of their tips. Chosen by pills.
 */
type Flower = {
  name: string;
  rows: PetalRow[];
  deep: RGB;
  pale: RGB;
  stamens: number;
  stamenLen: number;
  tip: RGB;
};
export const FLOWERS: Flower[] = [
  {
    name: 'Rose',
    rows: [
      { n: 8, len: 6.5, w: 2.6, open: 1.4, curl: 0.6 },
      { n: 8, len: 5.5, w: 2.3, open: 1.0, curl: 0.45 },
      { n: 5, len: 4.2, w: 1.9, open: 0.6, curl: 0.3 },
    ],
    deep: [0.88, 0.3, 0.5],
    pale: [1, 0.86, 0.88],
    stamens: 16,
    stamenLen: 2.6,
    tip: [1, 0.8, 0.3],
  },
  {
    // Broad petals in a cup, pale with pink edges, round a heart like a seed head.
    name: 'Lotus',
    rows: [
      { n: 8, len: 6, w: 3.2, open: 0.95, curl: 0.15 },
      { n: 8, len: 5, w: 2.8, open: 0.55, curl: 0.1 },
    ],
    deep: [1, 0.93, 0.9],
    pale: [0.95, 0.5, 0.68],
    stamens: 26,
    stamenLen: 1.2,
    tip: [1, 0.85, 0.35],
  },
  {
    // Six long petals curling right back, apricot, with long stamens.
    name: 'Lily',
    rows: [{ n: 6, len: 8, w: 2.2, open: 1.5, curl: 1.4 }],
    deep: [1, 0.5, 0.22],
    pale: [1, 0.9, 0.75],
    stamens: 6,
    stamenLen: 6,
    tip: [0.95, 0.45, 0.2],
  },
  {
    // Many thin white petals laid out flat round a wide gold disc.
    name: 'Daisy',
    rows: [{ n: 24, len: 6, w: 0.9, open: 1.5, curl: 0.1 }],
    deep: [1, 0.95, 0.85],
    pale: [1, 1, 0.95],
    stamens: 60,
    stamenLen: 0.6,
    tip: [1, 0.78, 0.25],
  },
  {
    // Four wide red petals in a loose cup round a dark heart.
    name: 'Poppy',
    rows: [{ n: 4, len: 6, w: 3.6, open: 0.85, curl: 0.55 }],
    deep: [0.95, 0.2, 0.1],
    pale: [1, 0.5, 0.25],
    stamens: 30,
    stamenLen: 1.4,
    tip: [0.55, 0.3, 0.55],
  },
];
/** The pills: the five flowers, and fireworks of flowers. */
export const BLOOMS = [...FLOWERS.map((f) => f.name), 'Fireworks'];
const FIREWORKS = FLOWERS.length;
let bloomKind = 0;
export const hasBlooms = (k: number) => PHASES[k]?.id === 'bloom';
const flower = (kind = bloomKind) => FLOWERS[kind] ?? (FLOWERS[0] as Flower);
/** Which row of flower f a petal grain with seed a is on: rows share the petals by their size. */
function petalRow(f: Flower, a: number): number {
  const sizes = f.rows.map((r) => r.n * r.len * r.w);
  const total = sizes.reduce((x, y) => x + y, 0);
  let acc = 0;
  for (let i = 0; i < sizes.length; i++) {
    acc += (sizes[i] as number) / total;
    if (a < acc) return i;
  }
  return sizes.length - 1;
}
/** Where stamen n of flower f stands: a wide disc of many short ones, or a few tall threads. */
const stamenFoot = (f: Flower, n: number) =>
  f.stamens > 20
    ? { r0: 0.2 + 1.4 * Math.sqrt(n / f.stamens), lean: 0.2 + 0.6 * Math.sqrt(n / f.stamens) }
    : { r0: 0.2, lean: 0.35 };
/** How open petal row `row` is, u through the piece: the outer row first. */
export const rowOpen = (row: number, u: number) => smooth((u - 0.5 - 0.07 * row) / 0.28);
/** How big the bud has grown. */
const budSize = (u: number) => 0.15 + 0.85 * smooth((u - 0.18) / 0.3);

/**
 * A point on a petal-like blade from the head's centre h: `phi` round the stem, length `len`,
 * leaning `beta` from upright and curling `curl` more toward its tip; q along it, w across.
 */
function blade(
  h: Vec3,
  phi: number,
  r0: number,
  len: number,
  wide: number,
  beta: number,
  curl: number,
  q: number,
  w: number,
): Vec3 {
  const th = beta + (curl * q * q) / 3;
  const across = w * wide * Math.sin(Math.PI * q ** 0.75) * 0.5;
  const cup = w * w * wide * 0.15;
  const radial = r0 + len * q * Math.sin(th) - cup * Math.cos(th);
  const up = len * q * Math.cos(th) + cup * Math.sin(th);
  return [
    h[0] + Math.cos(phi) * radial - Math.sin(phi) * across,
    h[1] + up,
    h[2] + Math.sin(phi) * radial + Math.cos(phi) * across,
  ];
}

function bloomPoint(p: Particle, u: number, t: number): Vec3 {
  if (bloomKind === FIREWORKS) return fireworkPoint(p, t);
  const top = stemTop(u);
  const h = stemAt(top);
  const size = budSize(u);
  const breath = 1 + 0.015 * Math.sin(t * 0.3);
  switch (bloomRole(p)) {
    case 'stem': {
      const d = fibonacciSphere(p.i % 97, 97);
      return add(stemAt(lerp(BLOOM_GROUND, top, p.b)), d, 0.35 * Math.sqrt(p.d));
    }
    case 'leaf': {
      // Two leaves, a third and half way up, unfurling from against the stem.
      const k = p.a < 0.5 ? 0 : 1;
      const y = Math.min(top, lerp(BLOOM_GROUND, BLOOM_TOP, k ? 0.52 : 0.34));
      const open = smooth((u - 0.12 - 0.06 * k) / 0.25);
      return blade(
        stemAt(y),
        0.6 + k * Math.PI,
        0.2,
        0.5 + 7 * open,
        1.2 + 1.8 * open,
        lerp(0.12, 1.05, open),
        0.8 * open,
        p.b,
        p.d * 2 - 1,
      );
    }
    case 'sepal': {
      const m = Math.floor(p.a * 5);
      const open = smooth((u - 0.45) / 0.12);
      return blade(
        h,
        (m / 5) * TAU + 0.3,
        0.5,
        3.2 * (0.4 + 0.6 * size),
        1.3,
        lerp(0.15, 2, open),
        0.3,
        p.b,
        p.d * 2 - 1,
      );
    }
    case 'petal': {
      const row = petalRow(flower(), p.a);
      const R = flower().rows[row] as PetalRow;
      const m = Math.floor(hash(p.i, 112) * R.n);
      const open = rowOpen(row, u);
      const phi = ((m + row * 0.5) / R.n) * TAU + 0.2 * row;
      return blade(
        h,
        phi,
        0.5 + 0.5 * open,
        R.len * size * breath,
        R.w * (0.6 + 0.7 * open),
        lerp(0.1, R.open, open),
        R.curl * open,
        p.b,
        p.d * 2 - 1,
      );
    }
    case 'stamen': {
      // Fine threads rising from the heart once the petals are open, each with a bright tip.
      const f = flower();
      const n = Math.floor(p.a * f.stamens);
      const rise = smooth((u - 0.72) / 0.14);
      const { r0, lean } = stamenFoot(f, n);
      return blade(
        h,
        n * GOLDEN_ANGLE,
        r0,
        0.2 + f.stamenLen * rise,
        0.06,
        lean,
        0.2,
        p.b,
        p.d * 2 - 1,
      );
    }
    default: {
      const f = frac(p.b + t * 0.05);
      const a = p.d * TAU;
      return add(h, [Math.sin(a) * 6 * f, 2 + 8 * f, Math.cos(a) * 6 * f]);
    }
  }
}

/*
 * Not too bright (2026-11-11: "it starts too bright like corals used to.
 * focus on the flower blooming. don't make the flower too bright as well"):
 * every part is as faint as it is small. Packed into a bud, a seedling or a
 * furled leaf its grains crowd onto a few pixels, so they glow only as they
 * spread out, and the open flower is a touch softer than before.
 */
/** How much a part shows, `x` (0..1) of the way to spread out: almost nothing while packed tight. */
const shownAt = (x: number) => 0.01 + 0.99 * x * x;
function bloomColour(p: Particle, u: number, t: number): RGB {
  if (bloomKind === FIREWORKS) return fireworkColour(p, t);
  const tw = 0.85 + 0.15 * Math.sin(t * 1.3 + p.i * 0.37);
  const f = flower();
  switch (bloomRole(p)) {
    case 'stem':
      return scale([0.42, 0.7, 0.36], 0.45 * tw * shownAt(smooth(u / 0.3)));
    case 'leaf': {
      const open = smooth((u - 0.12 - 0.06 * (p.a < 0.5 ? 0 : 1)) / 0.25);
      return scale(mix([0.35, 0.65, 0.3], [0.62, 0.86, 0.42], p.b), 0.5 * tw * shownAt(open));
    }
    case 'sepal':
      return scale([0.42, 0.68, 0.34], 0.45 * tw * shownAt(smooth((u - 0.18) / 0.3)));
    case 'petal': {
      const row = petalRow(f, p.a);
      const spread = smooth((rowOpen(row, u) + u - 0.4) / 0.6);
      return scale(
        mix(scale(f.deep, 1 - 0.12 * row), f.pale, p.b ** 0.7),
        0.2 * tw * shownAt(spread),
      );
    }
    case 'stamen': {
      const rise = smooth((u - 0.72) / 0.14);
      return p.b > 0.88 ? scale(f.tip, 0.8 * tw * rise) : scale([1, 0.9, 0.7], 0.35 * rise);
    }
    default:
      return scale([1, 0.88, 0.5], 0.7 * tw * smooth((u - 0.8) / 0.1));
  }
}

/*
 * FIREWORKS: flowers opening all round in the dark, each on its own clock. A
 * bud appears, bursts open, holds, and as it fades its petals sink a little,
 * like a firework's sparks; then it blooms again somewhere else, as another
 * of the five flowers. No stems, only blooming.
 */
export const FIREWORK_FLOWERS = 14;
const FIREWORK_EVERY = 9;
type Firework = { c: Vec3; kind: number; size: number; tilt: number; yaw: number; lu: number };
/** Flower j of the fireworks at time t: where, which, and how far through its bloom. */
export function firework(j: number, t: number): Firework {
  const x = t / FIREWORK_EVERY + hash(j, 121);
  const n = Math.floor(x);
  const h = (s: number) => hash(j * 97 + n * 13, s);
  return {
    c: [(h(122) - 0.5) * 60, (h(123) - 0.5) * 28 + 1, (h(124) - 0.5) * 24],
    kind: Math.floor(h(125) * FLOWERS.length),
    size: 0.55 + 0.5 * h(126),
    tilt: 0.3 + 0.6 * h(127),
    yaw: (h(128) - 0.5) * 1.8,
    lu: x - n,
  };
}
const fireworkOf = (p: Particle, t: number) =>
  firework(Math.floor(hash(p.i, 120) * FIREWORK_FLOWERS), t);
/** How open a firework flower is, lu through its bloom: a quick burst, then held. */
const burst = (lu: number) => smooth(lu / 0.3);
/** How brightly it shows: in as it bursts, out at the end, so no flower pops in or out. */
export const fireworkShown = (lu: number) => smooth(lu / 0.12) * smooth((1 - lu) / 0.3);

function fireworkPoint(p: Particle, t: number): Vec3 {
  const fw = fireworkOf(p, t);
  const f = FLOWERS[fw.kind] as Flower;
  const open = burst(fw.lu);
  const size = fw.size * (0.25 + 0.75 * open);
  let q: Vec3;
  if (p.c < 0.88) {
    const row = petalRow(f, p.a);
    const R = f.rows[row] as PetalRow;
    const m = Math.floor(hash(p.i, 112) * R.n);
    const o = smooth(open * 1.15 - 0.15 * row);
    q = blade(
      [0, 0, 0],
      ((m + row * 0.5) / R.n) * TAU + 0.2 * row,
      0.5 * o * fw.size,
      R.len * size,
      R.w * fw.size * (0.6 + 0.7 * o),
      lerp(0.1, R.open, o),
      R.curl * o,
      p.b,
      p.d * 2 - 1,
    );
  } else {
    const n = Math.floor(p.a * f.stamens);
    const { r0, lean } = stamenFoot(f, n);
    q = blade(
      [0, 0, 0],
      n * GOLDEN_ANGLE,
      r0 * fw.size,
      0.2 + f.stamenLen * size * open,
      0.06,
      lean,
      0.2,
      p.b,
      0,
    );
  }
  // Tipped toward us and turned a little, so the flowers face every way; sinking as they fade.
  const ct = Math.cos(fw.tilt);
  const st = Math.sin(fw.tilt);
  const y1 = q[1] * ct - q[2] * st;
  const z1 = q[1] * st + q[2] * ct;
  const cy = Math.cos(fw.yaw);
  const sy = Math.sin(fw.yaw);
  const fall = 3 * smooth((fw.lu - 0.7) / 0.3) * (0.6 + 0.8 * p.b);
  return [fw.c[0] + q[0] * cy + z1 * sy, fw.c[1] + y1 - fall, fw.c[2] - q[0] * sy + z1 * cy];
}

function fireworkColour(p: Particle, t: number): RGB {
  const fw = fireworkOf(p, t);
  const f = FLOWERS[fw.kind] as Flower;
  const tw = 0.85 + 0.15 * Math.sin(t * 1.3 + p.i * 0.37);
  const shown = fireworkShown(fw.lu) * (0.2 + 0.8 * burst(fw.lu)) * tw;
  if (p.c < 0.88) return scale(mix(f.deep, f.pale, p.b ** 0.7), 0.3 * shown);
  return p.b > 0.8 ? scale(f.tip, 0.7 * shown) : scale([1, 0.9, 0.7], 0.3 * shown);
}

/* ---------- 17. Bird Sim: your own bird, through a forest of golden trees ---------- */

/*
 * 2026-11-11: "tree 3d put ability to make the tree all golden. no green. and
 * ability to navigate as a bird in a forest of golden trees. and mushrooms and
 * stuff. like the shark sim. call it bird sim". The forest wraps round the
 * bird, so it never ends: golden trees on low hills, mushrooms glowing in
 * rings at their feet, fireflies drifting, stars above the canopy.
 *
 * Then a world to fly through (2026-11-11): rivers and sacred ponds that
 * mirror the trees, more kinds of tree and trees in blossom, flocks of
 * sparrows, a world tree on the horizon, a forest that grows on water, moods
 * for the water, and lines about freedom on the way.
 */
export const hasBird = (k: number) => PHASES[k]?.id === 'bird';
/** Cruising speed in units a second; Shift flies faster. */
export const BIRD_SPEED = 7;
/** The forest's width: the trees repeat this far apart round the bird. */
const BIRD_W = 120;
/** Sixteen trees over the field, then two on the banks of each pond. */
const FIELD_TREES = 16;
const BIRD_TREES = 20;
export const MUSHROOMS = 48;
const BIRD_TOP = 60;
const BIRD_CAM = 12;
const bearing = (yaw: number, pitch: number): Vec3 => [
  -Math.sin(yaw) * Math.cos(pitch),
  Math.sin(pitch),
  -Math.cos(yaw) * Math.cos(pitch),
];
/** Bumped whenever the bird or its world changes, so what is worked out once a frame is kept. */
let birdStamp = 0;

/*
 * FREEDOM (2026-11-11: "give me really deep quotes about freedom as I
 * navigate through the games, not just random stuff"). Lines from writers
 * long in the public domain, word for word as first printed (old translations
 * only), one at a time with its author, a new one every QUOTE_EVERY seconds.
 */
export const FREEDOM: { line: string; by: string }[] = [
  { line: 'No bird soars too high, if he soars with his own wings.', by: 'William Blake' },
  {
    line: 'I wish to speak a word for Nature, for absolute freedom and wildness',
    by: 'Henry David Thoreau',
  },
  { line: 'He is free who lives as he wishes to live', by: 'Epictetus, tr. George Long' },
  { line: 'Stone walls do not a prison make, / Nor iron bars a cage', by: 'Richard Lovelace' },
  {
    line: 'Man is born free; and everywhere he is in chains.',
    by: 'Jean-Jacques Rousseau, tr. G. D. H. Cole',
  },
  { line: 'I too am not a bit tamed, I too am untranslatable', by: 'Walt Whitman' },
  {
    line: 'Over himself, over his own body and mind, the individual is sovereign.',
    by: 'John Stuart Mill',
  },
  {
    line: 'Eternal Spirit of the chainless Mind! / Brightest in dungeons, Liberty!',
    by: 'Lord Byron',
  },
  {
    line: 'Nothing is at last sacred but the integrity of your own mind.',
    by: 'Ralph Waldo Emerson',
  },
  {
    line: 'I was not born to be forced. I will breathe after my own fashion.',
    by: 'Henry David Thoreau',
  },
  { line: 'Where the mind is without fear and the head is held high', by: 'Rabindranath Tagore' },
  { line: 'Afoot and light-hearted I take to the open road', by: 'Walt Whitman' },
];
/** How long each line about freedom stays, in seconds: the Bird Sim's loop on its own. */
export const QUOTE_EVERY = 12;
let quoteNow = 0;
/** The line about freedom showing now, and its author. */
export const freedomWords = (): string[] => {
  const q = FREEDOM[quoteNow] ?? (FREEDOM[0] as (typeof FREEDOM)[0]);
  return [q.line, `— ${q.by}`];
};

/*
 * TWO LANDS (2026-11-11: "ability to go to a forest that grows on water, like
 * the cherry tree but more tree types, and spreads"). A row of pills over the
 * players: the Golden forest on its hills, or the Water forest, open water
 * over everything and every kind of tree growing straight out of it over its
 * own reflection. The Water forest spreads: it starts as a grove round where
 * it was chosen and widens outward, saplings rising and blossoming at its
 * edge, open water beyond, so there is always an edge to fly out to.
 */
export const LANDS = ['Golden forest', 'Water forest'];
let land = 0;
const waterWorld = () => land === 1;
/** The open water's level in the Water forest. */
export const SEA_Y = -0.5;
/**
 * The open water's grains repeat on a narrower field than the trees, so the water near the eye is
 * dense enough to show its mood; beyond it the far fade has taken the light anyway.
 */
const WATER_W = 64;
/** A water grain brought round near c: on the open water's field, or the forest's. */
const nearWater = (base: Vec3, c: Vec3): Vec3 => nearOn(base, c, waterWorld() ? WATER_W : BIRD_W);
/** Where and when the Water forest began spreading: set on the first frame after it is chosen. */
let spreadFrom: { t: number; c: Vec3 } | null = null;
/** How far out from where it began the Water forest has spread, t seconds in. */
export const spreadReach = (t: number) =>
  spreadFrom ? 34 + 6 * Math.max(0, t - spreadFrom.t) : Number.POSITIVE_INFINITY;
/** Pill i over the Bird Sim: the Golden forest or the Water forest; the Journey (no piece) the first. */
export function setLand(i: number, k?: number) {
  const next = k !== undefined && hasBird(k) && LANDS[i] ? i : 0;
  if (next === land) return;
  land = next;
  spreadFrom = null;
  birdStamp++;
}

/*
 * WATER MOODS (2026-11-11: "the water can have different effects: from waves,
 * to calm ripples, to rain with lots of sparkles growing on the water etc.").
 * A button beside the speeds steps through them, for the rivers, the ponds and
 * the open water alike: Calm, still as a mirror; Ripples, rings spreading
 * slowly; Waves, long swells rolling through; Rain, drops landing all over,
 * each a sparkle that blooms into a ring and fades, the fireflies falling as
 * rain. The reflections tremble as much as the water moves.
 */
export const WATER_MOODS = ['Calm', 'Ripples', 'Waves', 'Rain'];
let waterMood = 0;
export function setWaterMood(i: number) {
  waterMood = WATER_MOODS[i] ? i : 0;
}
const RAIN_RINGS = 16;
const RAIN_T = 2.2;

/*
 * RIVERS AND SACRED PONDS (2026-11-11: "and rivers. and sacred ponds with
 * reflections and water effects"). A river winds across each width of the
 * forest in a valley of its own, flowing; two still ponds lie in flat
 * hollows, ringed with small lights, a tree on each bank, and the trees show
 * in them upside down.
 */
/** The land's low hills, before the river and the ponds cut into them. */
const rise = (x: number, z: number) =>
  1.4 * Math.sin(x * 0.065) + 1.1 * Math.sin(z * 0.08 + 1) + 0.6 * Math.sin((x + z) * 0.13);
/** Where the river runs across the forest at z. */
export const riverX = (z: number) =>
  60 + 14 * Math.sin((TAU * z) / BIRD_W) + 5 * Math.sin((2 * TAU * z) / BIRD_W + 1);
/** Half the river's width at z. */
export const riverHalf = (z: number) => 2.6 + 0.9 * Math.sin((3 * TAU * z) / BIRD_W);
/** How far x is across from the middle of the nearest copy of the river at z. */
const fromRiver = (x: number, z: number) => wrap(x - riverX(z) + BIRD_W / 2, BIRD_W) - BIRD_W / 2;
type Pond = { c: [number, number]; r: number; level: number };
const pond = (x: number, z: number, r: number): Pond => ({ c: [x, z], r, level: rise(x, z) - 1.2 });
/**
 * The two ponds in each width of the forest, each still, in a hollow of its own: wide enough that,
 * coming to one, the trees across it show upside down in its water, as they would.
 */
export const PONDS: Pond[] = [pond(16, 30, 12), pond(102, 88, 9)];
/** How far (x, z) is from the middle of the nearest copy of pond k. */
const fromPond = (k: number, x: number, z: number) => {
  const c = (PONDS[k] as Pond).c;
  return Math.hypot(
    wrap(x - c[0] + BIRD_W / 2, BIRD_W) - BIRD_W / 2,
    wrap(z - c[1] + BIRD_W / 2, BIRD_W) - BIRD_W / 2,
  );
};
/** The ground's height at (x, z): low hills, a valley along the river, a flat hollow under each pond. */
export const hill = (x: number, z: number) => {
  let h = rise(x, z) - 1.6 * smooth((riverHalf(z) + 5 - Math.abs(fromRiver(x, z))) / 5);
  for (let k = 0; k < PONDS.length; k++) {
    const p = PONDS[k] as Pond;
    h = lerp(h, p.level - 0.6, smooth((p.r + 3 - fromPond(k, x, z)) / 3));
  }
  return h;
};
/** Whether (x, z) is under water: everywhere in the Water forest, else in the river or a pond. */
export const wetAt = (x: number, z: number) =>
  waterWorld() ||
  Math.abs(fromRiver(x, z)) < riverHalf(z) ||
  PONDS.some((p, k) => fromPond(k, x, z) < p.r);
/** The floor at (x, z): the hills, or the open water in the Water forest. */
const landY = (x: number, z: number) => (waterWorld() ? SEA_Y : hill(x, z));

/**
 * Water grain (u, v, w) before the mood moves it: on the open water in the Water forest; else in the
 * river (flowing, so it drifts along with time) or in one of the ponds. `pond` says which, -1 the river.
 */
function waterSpot(
  u: number,
  v: number,
  w: number,
  t: number,
): { x: number; y: number; z: number; pond: number } {
  if (waterWorld()) return { x: v * WATER_W, y: SEA_Y, z: w * WATER_W, pond: -1 };
  if (u < 0.55) {
    const z = wrap(v * BIRD_W + t * 1.2, BIRD_W);
    const x = riverX(z) + (2 * w - 1) * riverHalf(z) * 0.92;
    return { x, y: rise(x, z) - 1.2, z, pond: -1 };
  }
  const k = u < 0.82 ? 0 : 1;
  const p = PONDS[k] as Pond;
  const a = v * TAU;
  const r = p.r * Math.sqrt(w);
  return { x: p.c[0] + Math.cos(a) * r, y: p.level, z: p.c[1] + Math.sin(a) * r, pond: k };
}

const bird = {
  on: false,
  pos: [0, 12, 0] as Vec3,
  yaw: 0,
  pitch: 0,
  bank: 0,
  /** How hard it is turning, -1 left to 1 right, eased: the more, the more it glides on open wings. */
  steer: 0,
  speed: BIRD_SPEED,
  /** Wingbeats so far, and how hard it is beating, 0 gliding to 1. */
  flap: 0,
  effort: 0.5,
  /** On foot: strides so far, how high off the ground in a jump, and rising speed. */
  stride: 0,
  jump: 0,
  vy: 0,
  /** Whether a key has been pressed since the game began: till then the walker strolls alone. */
  touched: false,
};

/*
 * THE DOT WALKER (2026-11-11: "add a way that I can walk with dot walker when
 * walking in the forest, so not bird but dot walker, that walks on the earth,
 * on the forest videogame"). The golden figure of dots from the Dot Walker
 * Arena (components/DotWalkerArena.tsx), in the round: a head, a body, arms
 * swinging against the legs as it strides, dust where its feet touch. Chosen
 * by a pill; W and S walk on and back, Shift runs, Space jumps. In the Water
 * forest it walks on the water.
 */
export const PLAYERS = ['Bird', 'Dot Walker'];
let playerKind = 0;
const walking = () => playerKind === 1;
/** Walking pace in units a second; Shift runs. */
export const WALK_SPEED = 3.2;
/** How far one stride carries the walker. */
const WALK_STRIDE = 1.5;
const WALK_CAM = 7;

/** With no one at the controls (the Journey): a weave between the trees, rising and falling. */
function birdPilot(t: number): { c: Vec3; f: Vec3 } {
  const at = (tt: number): Vec3 => [
    20 * Math.sin(0.045 * tt),
    13 + 7 * Math.sin(0.07 * tt),
    -BIRD_SPEED * 0.9 * tt,
  ];
  const c = at(t);
  const n = at(t + 0.05);
  return { c, f: norm([n[0] - c[0], n[1] - c[1], n[2] - c[2]]) };
}

/**
 * The controls, each frame: whether you are flying, the keys held, how far the piece's time moved,
 * and the time. The Water forest starts spreading from where the bird is on the first frame in it.
 */
export function setBird(active: boolean, keys: string[], dt: number, t: number) {
  steerBird(active, keys, dt, t);
  birdStamp++;
  if (waterWorld() && !spreadFrom) spreadFrom = { t, c: [...flier(t).c] as Vec3 };
}

function steerBird(active: boolean, keys: string[], dt: number, t: number) {
  if (!active) {
    bird.on = false;
    bird.touched = false;
    return;
  }
  // On foot it strolls by itself until a key is pressed, so it is never standing still at the start
  // (2026-11-11: "bird sim, why is it not launching, static at start").
  if (walking() && !bird.touched) {
    if (!keys.length) {
      bird.on = false;
      return;
    }
    bird.touched = true;
  }
  if (!bird.on) {
    // Taking over from the weave, or the stroll, where it is.
    const a = walking() ? walkerPilot(t) : birdPilot(t);
    bird.pos = a.c;
    bird.yaw = Math.atan2(-a.f[0], -a.f[2]);
    bird.pitch = Math.asin(Math.max(-1, Math.min(1, a.f[1])));
    bird.speed = BIRD_SPEED;
    bird.on = true;
  }
  const held = (...names: string[]) => names.some((n) => keys.includes(n));
  // Keys only, never the mouse (2026-11-11: "controls should not be with mouse, only ASDWX").
  const turn = (held('a', 'arrowleft') ? -1.4 : 0) + (held('d', 'arrowright') ? 1.4 : 0);
  bird.yaw -= turn * dt;
  if (walking()) {
    walk(held, dt);
    return;
  }
  // Leaning into the turn, as a bird does, and gliding through it on open wings (2026-11-11: "as I
  // move left/right with the bird he gets into planer (glide) and keeps his wings open").
  const steer = Math.max(-1, Math.min(1, turn / 1.4));
  bird.steer += (steer - bird.steer) * (1 - Math.exp(-4 * dt));
  bird.bank += (-0.6 * steer - bird.bank) * (1 - Math.exp(-3 * dt));
  let tilt = (held('w', 'arrowup') ? 0.8 : 0) - (held('s', 'arrowdown') ? 0.8 : 0);
  const ground = landY(bird.pos[0], bird.pos[2]);
  if (bird.pos[1] <= ground + 2 && tilt < 0) tilt = 0;
  if (bird.pos[1] >= BIRD_TOP && tilt > 0) tilt = 0;
  bird.pitch += (tilt - bird.pitch) * (1 - Math.exp(-2.5 * dt));
  const fast = held('shift');
  bird.speed +=
    (BIRD_SPEED * (fast ? 1.9 : held('x') ? 0.5 : 1) - bird.speed) * (1 - Math.exp(-1.5 * dt));
  // Beating hard to climb or fly fast, gliding with wings held out on the way down and in a turn.
  const want = fast ? 1 : bird.pitch > 0.1 ? 0.9 : bird.pitch < -0.15 ? 0 : 0.45;
  bird.effort += (want * (1 - 0.85 * Math.abs(bird.steer)) - bird.effort) * (1 - Math.exp(-2 * dt));
  bird.flap += dt * (1.2 + 2.2 * bird.effort);
  const f = bearing(bird.yaw, bird.pitch);
  bird.pos = add(bird.pos, f, bird.speed * dt);
  bird.pos[1] = Math.max(landY(bird.pos[0], bird.pos[2]) + 1.5, Math.min(BIRD_TOP, bird.pos[1]));
}

/** The walker on foot, each frame: walking on or back, running, jumping, its feet on the hills. */
function walk(held: (...names: string[]) => boolean, dt: number) {
  const pace = held('w', 'arrowup') ? 1 : held('s', 'arrowdown') ? -0.6 : 0;
  const run = held('shift') ? 2 : held('x') ? 0.5 : 1;
  bird.speed += (WALK_SPEED * run * pace - bird.speed) * (1 - Math.exp(-6 * dt));
  bird.pitch = 0;
  bird.bank = 0;
  bird.steer = 0;
  const f = bearing(bird.yaw, 0);
  bird.pos = add(bird.pos, f, bird.speed * dt);
  bird.stride += (bird.speed * dt) / WALK_STRIDE;
  if (held(' ', 'space') && bird.jump <= 0) bird.vy = 6;
  bird.vy -= 18 * dt;
  bird.jump = Math.max(0, bird.jump + bird.vy * dt);
  if (bird.jump <= 0) bird.vy = Math.max(0, bird.vy);
  bird.pos[1] = landY(bird.pos[0], bird.pos[2]) + bird.jump;
}

/** With no one at the controls: the walker strolls between the trees on its own. */
function walkerPilot(t: number): { c: Vec3; f: Vec3 } {
  const at = (tt: number): Vec3 => {
    const x = 16 * Math.sin(0.03 * tt);
    const z = -WALK_SPEED * 0.9 * tt;
    return [x, landY(x, z), z];
  };
  const c = at(t);
  const n = at(t + 0.05);
  return { c, f: norm([n[0] - c[0], 0, n[2] - c[2]]) };
}

type Player = {
  c: Vec3;
  f: Vec3;
  bank: number;
  /** How hard it turns, -1 left to 1 right: the bird glides through a turn on open wings. */
  steer: number;
  flap: number;
  effort: number;
  /** On foot: strides so far, and how fast it is going, 0 standing to 1 running. */
  stride: number;
  pace: number;
};

let flierMemo: { t: number; s: number; me: Player } | null = null;
/** The bird, or the walker: where it is at time t, which way it goes, how it leans, wings or legs. */
export function flier(t: number): Player {
  if (flierMemo && flierMemo.t === t && flierMemo.s === birdStamp) return flierMemo.me;
  const me = flierNow(t);
  flierMemo = { t, s: birdStamp, me };
  return me;
}

function flierNow(t: number): Player {
  if (bird.on)
    return {
      c: bird.pos,
      f: bearing(bird.yaw, bird.pitch),
      bank: bird.bank,
      steer: bird.steer,
      flap: bird.flap,
      effort: bird.effort,
      stride: bird.stride,
      pace: Math.min(1, Math.abs(bird.speed) / (WALK_SPEED * 2)),
    };
  if (walking()) {
    const a = walkerPilot(t);
    return {
      ...a,
      bank: 0,
      steer: 0,
      flap: 0,
      effort: 0,
      stride: (WALK_SPEED * 0.9 * t) / WALK_STRIDE,
      pace: 0.45,
    };
  }
  // The weave bends right while its sideways drift speeds up that way: it glides through each bend.
  const a = birdPilot(t);
  const steer = -0.9 * Math.sin(0.045 * t) ** 3;
  return {
    ...a,
    bank: -0.6 * steer,
    steer,
    flap: t * 2.4,
    effort: (0.5 + 0.4 * Math.cos(0.07 * t)) * (1 - 0.85 * Math.abs(steer)),
    stride: 0,
    pace: 0,
  };
}

/** Pill i on the forest game: the bird or the walker. A new choice starts from the autopilot. */
export function setPlayer(i: number) {
  playerKind = PLAYERS[i] ? i : 0;
  bird.on = false;
  bird.touched = false;
  birdStamp++;
}

/**
 * Grain p of the Dot Walker standing at c facing f: a round head, a body, arms and legs swinging
 * opposite as it strides, more the faster it goes, and dust kicked up where its feet land.
 */
function walkerBody(p: Particle, me: Player, t: number): Vec3 {
  const side = norm(cross(me.f, [0, 1, 0]));
  const at = (fw: number, sd: number, u: number): Vec3 =>
    add(add(add(me.c, me.f, fw), side, sd), [0, 1, 0], u);
  const ph = me.stride * Math.PI;
  const swing = 0.15 + 0.55 * me.pace;
  const bob = 0.1 * me.pace * Math.abs(Math.sin(ph)) + 0.03 * Math.sin(t * 1.6);
  const d = fibonacciSphere(p.i % 89, 89);
  const q = p.b;
  if (p.a < 0.14) return at(d[2] * 0.3, d[0] * 0.3, 3.05 + bob + d[1] * 0.32);
  if (p.a < 0.42) {
    // The body: wide at the shoulders, narrow at the waist.
    const h = 1.65 + 1.05 * q;
    const w = 0.28 + 0.2 * q;
    return at(d[2] * 0.18 + 0.05 * me.pace, d[0] * w, h + bob + d[1] * 0.05);
  }
  if (p.a < 0.62) {
    // An arm from the shoulder, swinging against the leg on its side.
    const s = p.a < 0.52 ? -1 : 1;
    const a = -s * swing * Math.sin(ph);
    const len = 1.15 * q;
    return at(Math.sin(a) * len, s * (0.52 + 0.06 * q), 2.6 + bob - Math.cos(a) * len);
  }
  if (p.a < 0.92) {
    // A leg: the thigh swings from the hip, the shin bends back as the foot comes through.
    const s = p.a < 0.77 ? -1 : 1;
    const a1 = s * swing * Math.sin(ph);
    const a2 = a1 - 1.1 * me.pace * Math.max(0, Math.sin(ph * s + Math.PI / 2)) * 0.6;
    const knee: Vec3 = [Math.sin(a1) * 0.82, s * 0.22, 1.65 + bob - Math.cos(a1) * 0.82];
    const k = q < 0.5 ? q * 2 : 1;
    if (q < 0.5) return at(knee[0] * k, knee[1], 1.65 + bob + (knee[2] - 1.65 - bob) * k);
    const u = (q - 0.5) * 2;
    return at(knee[0] + Math.sin(a2) * 0.82 * u, knee[1], knee[2] - Math.cos(a2) * 0.82 * u);
  }
  // Dust at the feet, rising and spreading from each step.
  const f = frac(p.b + me.stride * 0.5);
  const a = p.d * TAU;
  return at(
    Math.cos(a) * (0.3 + 0.8 * f) - 0.6 * f,
    Math.sin(a) * (0.3 + 0.8 * f),
    0.05 + 0.5 * f * me.pace,
  );
}

/** A world point brought round to the copy of it nearest c, on a field `w` wide. */
const nearOn = (base: Vec3, c: Vec3, w: number): Vec3 => [
  c[0] + wrap(base[0] - c[0] + w / 2, w) - w / 2,
  base[1],
  c[2] + wrap(base[2] - c[2] + w / 2, w) - w / 2,
];
/** A world point brought round to the copy of it nearest the bird, on the forest's width. */
const nearBird = (base: Vec3, c: Vec3): Vec3 => nearOn(base, c, BIRD_W);

/*
 * THE WORLD TREE (2026-11-11: "and a really really big tree in the distance,
 * like an arbre monde (world tree)"). One tree far taller than the forest, a
 * long flight ahead, roots spread over the land, a crown like a sky of gold,
 * leaves of light drifting down from it. Seen from far it is drawn closer in
 * and smaller in the same proportion, so it looks exactly as far as it is and
 * still shows over the haze; near, it is its full size, and you can fly up
 * through its branches. It stands on a field so wide that it comes round
 * again only far beyond sight, fading out before it does.
 */
export const WORLD_TREE: Vec3 = [10, 0, -460];
/** How tall the world tree stands. */
export const WORLD_TREE_H = 300;
const WORLD_W = 1600;
/** No nearer than this is it drawn closer: inside it, full size. */
const WORLD_NEAR = 110;
const WORLD_SHAPE: Shape3 = { first: 5, tilt: 0.55, lean: 0.3, up: 0.12, lenK: 0.78, three: 0.4 };

/** A tree's routes stood with the foot of its trunk at the origin and scaled to `height` tall. */
function fitRoutes(routes: Route3[], height: number): Route3[] {
  const first = (routes[0] as Route3).pts;
  const x0 = first[0] as number;
  const y0 = first[1] as number;
  const z0 = first[2] as number;
  let top = y0 + 1e-6;
  for (const r of routes)
    for (let i = 0; i < r.count; i++) top = Math.max(top, r.pts[i * 4 + 1] as number);
  const k = height / (top - y0);
  return routes.map((r) => {
    const pts = r.pts.slice();
    for (let i = 0; i < r.count; i++) {
      pts[i * 4] = ((pts[i * 4] as number) - x0) * k;
      pts[i * 4 + 1] = ((pts[i * 4 + 1] as number) - y0) * k;
      pts[i * 4 + 2] = ((pts[i * 4 + 2] as number) - z0) * k;
      pts[i * 4 + 3] = (pts[i * 4 + 3] as number) * k;
    }
    return { pts, count: r.count };
  });
}

let worldRoutes: Route3[] | null = null;
/** The world tree's routes, from the foot of its trunk to every tip, WORLD_TREE_H tall. */
export function worldTreeRoutes(): Route3[] {
  if (worldRoutes) return worldRoutes;
  const out: number[][] = [];
  grow3(seeded(77), [0, 0, 0], [0, 1, 0], 4, 1.5, 6, 0, [], out, WORLD_SHAPE);
  worldRoutes = fitRoutes(out.map(resample3), WORLD_TREE_H);
  return worldRoutes;
}

/*
 * MORE TREES, AND TREES IN BLOOM (2026-11-11: "and more types of trees. and
 * blooming trees"). Eight kinds: two golden oaks, a pine in whorls, a tall
 * birch, a broad spreading tree, a baobab, and two in blossom, a cherry and a
 * plum, their flowers opening and closing over a slow season of their own and
 * petals drifting down from them onto the ground or the water.
 */
type BirdKind = { name: string; routes: Route3[]; leafR: number; reach: number; bloom: boolean };
const PLUM_SHAPE: Shape3 = { first: 3, tilt: 0.55, lean: 0.35, up: 0.25, lenK: 0.8, three: 0.4 };
let birdKindList: BirdKind[] | null = null;
/** The Bird Sim's kinds of tree, each about the forest's height. */
export function birdKinds(): BirdKind[] {
  if (birdKindList) return birdKindList;
  const oaks = forestTrees();
  const oak = oaks[0] as Route3[];
  const h = oakHeight(oak);
  const plum: number[][] = [];
  grow3(seeded(29), [0, 0, 0], [0, 1, 0], 3, 0.7, 5, 0, [], plum, PLUM_SHAPE);
  birdKindList = [
    { name: 'Oak', routes: oak, leafR: 1.5, reach: 0, bloom: false },
    {
      name: 'Pine',
      routes: fitRoutes(reflTreeRoutes(1), 1.35 * h),
      leafR: 0.5,
      reach: 7,
      bloom: false,
    },
    {
      name: 'Cherry',
      routes: fitRoutes(reflTreeRoutes(3), 0.9 * h),
      leafR: 1.3,
      reach: 2,
      bloom: true,
    },
    {
      name: 'Birch',
      routes: fitRoutes(reflTreeRoutes(2), 1.4 * h),
      leafR: 0.75,
      reach: 3,
      bloom: false,
    },
    { name: 'Oak', routes: oaks[2] as Route3[], leafR: 1.5, reach: 0, bloom: false },
    {
      name: 'Baobab',
      routes: fitRoutes(reflTreeRoutes(4), 0.95 * h),
      leafR: 1.1,
      reach: 0.6,
      bloom: false,
    },
    {
      name: 'Plum',
      routes: fitRoutes(plum.map(resample3), 0.8 * h),
      leafR: 1.2,
      reach: 1.5,
      bloom: true,
    },
    {
      name: 'Spreading',
      routes: fitRoutes(reflTreeRoutes(3), 0.85 * h),
      leafR: 1.4,
      reach: 0,
      bloom: false,
    },
  ];
  return birdKindList;
}
/** How tall a tree's routes stand above the foot of its trunk. */
function oakHeight(routes: Route3[]): number {
  const y0 = (routes[0] as Route3).pts[1] as number;
  let top = y0;
  for (const r of routes)
    for (let i = 0; i < r.count; i++) top = Math.max(top, r.pts[i * 4 + 1] as number);
  return top - y0;
}
/** How open tree j's blossom is at time t, 0 closed to 1 open: a slow season of its own. */
const bloomOpen = (j: number, t: number) => smooth(0.6 + 0.9 * Math.sin(0.07 * t + j * 1.7));

/** The share of the grains that make the world tree. */
const WORLD_LO = 0.29;
const WORLD_HI = 0.39;
type BirdRole =
  | 'ground'
  | 'water'
  | 'sky'
  | 'flock'
  | 'mushroom'
  | 'world'
  | 'wood'
  | 'leaf'
  | 'mirror'
  | 'bird';
/*
 * Every grain has its part, by its place in the cloud: the shares moved round
 * to make room for the water, the sparrows, the world tree and the
 * reflections, the grain count the same.
 */
const birdRole = (p: Particle): BirdRole => {
  const c = p.c;
  if (c < 0.07) return waterWorld() ? 'water' : 'ground';
  if (c < 0.12) return 'water';
  if (c < 0.18) return 'sky';
  if (c < 0.215) return 'flock';
  // On the open water half the mushrooms' grains are lotuses and half more water.
  if (c < WORLD_LO) return waterWorld() && hash(p.i, 264) < 0.5 ? 'water' : 'mushroom';
  if (c < WORLD_HI) return 'world';
  if (c < 0.57) return 'wood';
  if (c < 0.9) return 'leaf';
  if (c < 0.975) return 'mirror';
  return 'bird';
};

type Slot = { at: Vec3; kind: number; size: number; yaw: number };
/** The pond a tree on a bank stands by. */
const pondOfTree = (j: number) => PONDS[Math.floor((j - FIELD_TREES) / 2)] as Pond;
const slotCache: (Slot[] | null)[] = LANDS.map(() => null);
/** Tree j of the forest: its foot on the wrapping field, which kind, how big, which way turned. */
export function forestSlot(j: number): Slot {
  let list = slotCache[land];
  if (!list) {
    list = Array.from({ length: BIRD_TREES }, (_, i) => placeTree(i));
    slotCache[land] = list;
  }
  return list[wrap(j, BIRD_TREES)] as Slot;
}
function placeTree(j: number): Slot {
  if (j >= FIELD_TREES) {
    // Two on the banks of each pond, across the water from each other, so from any side one shows
    // in it: a cherry and a birch by the first, a plum and a pine by the second.
    const n = j - FIELD_TREES;
    const p = pondOfTree(j);
    const a = [0.7, 3.9, 2.2, 5.3][n] as number;
    const x = p.c[0] + Math.cos(a) * (p.r + 1.2);
    const z = p.c[1] + Math.sin(a) * (p.r + 1.2);
    return { at: [x, landY(x, z), z], kind: [2, 3, 6, 1][n] as number, size: 2.1, yaw: a };
  }
  const side = 4;
  const cell = BIRD_W / side;
  let x = ((j % side) + 0.2 + 0.6 * hash(j, 201)) * cell;
  let z = (Math.floor(j / side) + 0.2 + 0.6 * hash(j, 202)) * cell;
  // Out of the river, onto its nearer bank, and out of the ponds.
  const dx = fromRiver(x, z);
  const bank = riverHalf(z) + 3;
  if (Math.abs(dx) < bank) x += (dx < 0 ? -1 : 1) * bank - dx;
  PONDS.forEach((p, k) => {
    const d = fromPond(k, x, z);
    if (d < p.r + 3) {
      const a = hash(j, 206) * TAU;
      x = p.c[0] + Math.cos(a) * (p.r + 3);
      z = p.c[1] + Math.sin(a) * (p.r + 3);
    }
  });
  return {
    at: [x, landY(x, z), z],
    kind: Math.floor(hash(j, 203) * 8),
    size: 1.6 + 0.8 * hash(j, 204),
    yaw: hash(j, 205) * TAU,
  };
}

type Mushroom = { at: Vec3; h: number; stem: number; cap: number; glow: boolean };
const mushroomCache: (Mushroom[] | null)[] = LANDS.map(() => null);
/** Mushroom m: in a ring round the foot of a tree, out of the water, its height, stem and cap. */
function birdMushroom(m: number): Mushroom {
  let list = mushroomCache[land];
  if (!list) {
    list = Array.from({ length: MUSHROOMS }, (_, i) => placeMushroom(i));
    mushroomCache[land] = list;
  }
  return list[wrap(m, MUSHROOMS)] as Mushroom;
}
function placeMushroom(m: number): Mushroom {
  const tree = forestSlot(m % BIRD_TREES);
  let a = hash(m, 206) * TAU;
  const d = 3 + 4 * hash(m, 207);
  let x = tree.at[0] + Math.cos(a) * d;
  let z = tree.at[2] + Math.sin(a) * d;
  if (!waterWorld() && wetAt(x, z)) {
    a += Math.PI;
    x = tree.at[0] + Math.cos(a) * d;
    z = tree.at[2] + Math.sin(a) * d;
  }
  const size = 0.6 + 1.3 * hash(m, 208) ** 2;
  return {
    at: [x, landY(x, z), z],
    h: 1.2 * size,
    stem: 0.18 * size,
    cap: (0.7 + 0.3 * hash(m, 209)) * size,
    glow: hash(m, 210) < 0.4,
  };
}

/*
 * SPARROWS (2026-11-11: "add flocks of sparrows flying in bird sim"). Three
 * flocks crossing the forest and the sky, each a hundred-odd small birds
 * moving as one: the flock stretches and gathers, folds and turns, waves
 * running through it, as starlings do in a murmuration. Each comes round
 * again on a wide field and fades before it does.
 */
export const FLOCKS = 3;
const FLOCK_W = 240;
/** The heading of flock f. */
const flockYaw = (f: number) => hash(f, 271) * TAU;
/** Where the middle of flock f is at time t, before it is brought round near the bird. */
export function flockCentre(f: number, t: number): Vec3 {
  const a = flockYaw(f);
  const run = (6 + 3 * hash(f, 273)) * t;
  return [
    hash(f, 274) * FLOCK_W - Math.sin(a) * run + 12 * Math.sin(0.23 * t + f),
    17 + 10 * Math.sin(0.11 * t + 2 * f),
    hash(f, 275) * FLOCK_W - Math.cos(a) * run + 12 * Math.cos(0.19 * t + 3 * f),
  ];
}

/** Grain p of a flock: one sparrow, its place in the flock's changing shape. */
function sparrow(p: Particle, me: Player, t: number): { pos: Vec3; k: number } {
  const f = Math.floor(hash(p.i, 270) * FLOCKS);
  const c = nearOn(flockCentre(f, t), me.c, FLOCK_W);
  c[1] = Math.max(c[1], landY(c[0], c[2]) + 5);
  const s = fibonacciSphere(p.i % 97, 97);
  const r = Math.cbrt(hash(p.i, 272));
  const ph = t + f * 7;
  // A long, low cloud that breathes, with waves running through it.
  const breathe = 0.35 * Math.sin(0.5 * ph);
  const x0 = s[0] * r * 9 * (1 + breathe);
  const y0 = s[1] * r * 2.6 * (1 + 0.5 * Math.sin(0.37 * ph + 1));
  const z0 = s[2] * r * 5 * (1 - 0.6 * breathe);
  const x = x0 + 1.8 * Math.sin(0.45 * z0 + 1.1 * ph);
  const y = y0 + 1.5 * Math.sin(0.35 * x0 + 0.9 * ph) + 0.15 * Math.sin(t * 3 + p.i);
  const z = z0 + 1.3 * Math.sin(0.4 * y0 + 1.3 * ph);
  const a = flockYaw(f) + 0.5 * Math.sin(0.2 * ph);
  const fw: Vec3 = [-Math.sin(a), 0, -Math.cos(a)];
  const sd: Vec3 = [Math.cos(a), 0, -Math.sin(a)];
  const pos = add(add(add(c, fw, x), sd, z), [0, 1, 0], y);
  const away = Math.hypot(c[0] - me.c[0], c[2] - me.c[2]);
  return { pos, k: 1 - smooth((away - 70) / 40) };
}

/** Grain p of the bird, round its centre c flying along f: a body, two wings, a fanned tail. */
function birdBody(p: Particle, me: Player): Vec3 {
  const side0 = norm(cross(me.f, [0, 1, 0]));
  const up0 = cross(side0, me.f);
  // Leaning into the turn: side and up turned about the way it flies.
  const cb = Math.cos(me.bank);
  const sb = Math.sin(me.bank);
  const side = add(scale(side0, cb), up0, sb);
  const up = add(scale(up0, cb), side0, -sb);
  const at = (fw: number, sd: number, u: number): Vec3 =>
    add(add(add(me.c, me.f, fw), side, sd), up, u);
  const q = p.b;
  const v = p.d;
  if (p.a < 0.25) {
    // The body, a slender spindle, and a round head at the front.
    const d = fibonacciSphere(p.i % 89, 89);
    if (p.a < 0.05) return at(0.75 + d[2] * 0.2, d[0] * 0.2, d[1] * 0.2 + 0.05);
    const len = (q - 0.5) * 1.4;
    const r = 0.22 * Math.sin(Math.PI * q) ** 0.6;
    return at(len, d[0] * r, d[1] * r);
  }
  if (p.a < 0.35) {
    // The tail: a fan behind, spread a little wider as it slows, and twisted into a turn.
    const spread = (v - 0.5) * (0.5 + 0.4 * q + 0.25 * Math.abs(me.steer));
    const beat = 0.04 * Math.sin(me.flap * TAU) * (1 - Math.abs(me.steer));
    return at(-0.7 - 0.8 * q, spread, (beat + 0.12 * me.steer * (v - 0.5)) * q);
  }
  // A wing: out along the span, the chord narrowing to the tip, beating up and down. In a turn the
  // beat stops and both wings are held open to glide, not rigid: the inner wing, on the side it
  // turns to, lifts, folds a little and curls at its tip; the outer one stretches long and low; a
  // slight flex runs out along both (2026-11-11: "the wings open and get impacted by left or right
  // movement").
  const wing = p.a < 0.675 ? -1 : 1;
  const glide = Math.min(1, Math.abs(me.steer));
  const inner = Math.max(0, wing * me.steer);
  const outer = Math.max(0, -wing * me.steer);
  const beat = Math.sin(me.flap * TAU);
  const lift = (0.15 + 0.75 * me.effort) * beat * (1 - glide);
  const span = 2.7 * q * (1 + 0.12 * outer - 0.14 * inner);
  const chord = 0.85 * (1 - 0.65 * q);
  const flex = glide * 0.07 * q * Math.sin(me.flap * 0.8 * TAU + q * 3);
  const ang =
    lift * (0.6 + 0.4 * q) +
    glide * 0.08 +
    q * (0.3 * inner - 0.18 * outer) +
    0.45 * inner * q ** 3 +
    flex;
  const sweep = -0.35 * q * q - 0.3 * inner * q * q;
  return at(0.25 + sweep - v * chord, wing * span * Math.cos(ang), span * Math.sin(ang));
}

type BirdFrame = {
  me: Player;
  eye: Vec3;
  /** The foot of the world tree's nearest copy, how much it is drawn in, and how much it shows. */
  world: Vec3;
  worldK: number;
  worldShown: number;
  /** By each pond, the tree on its bank across the water from the eye. */
  across: number[];
};
let frameMemo: { t: number; s: number; f: BirdFrame } | null = null;
/** What every grain of the Bird Sim shares at time t, worked out once a frame. */
function birdFrame(t: number): BirdFrame {
  if (frameMemo && frameMemo.t === t && frameMemo.s === birdStamp) return frameMemo.f;
  const me = flier(t);
  const eye = eyeIn(PHASES.length - 1, 0, t).eye;
  const world = nearOn(WORLD_TREE, me.c, WORLD_W);
  world[1] = landY(world[0], world[2]);
  const away = Math.hypot(world[0] - eye[0], world[2] - eye[2]);
  const edge = Math.max(Math.abs(world[0] - me.c[0]), Math.abs(world[2] - me.c[2]));
  const f: BirdFrame = {
    me,
    eye,
    world,
    worldK: Math.min(1, WORLD_NEAR / Math.max(1e-3, away)),
    worldShown: 1 - smooth((edge - 600) / 150),
    across: PONDS.map((_, k) => {
      const far = (j: number) => {
        const at = nearBird(forestSlot(j).at, me.c);
        return Math.hypot(at[0] - eye[0], at[2] - eye[2]);
      };
      const j = FIELD_TREES + 2 * k;
      return far(j) > far(j + 1) ? j : j + 1;
    }),
  };
  frameMemo = { t, s: birdStamp, f };
  return f;
}

/** A grain's place, and how much of its light shows (grown, lit, near), for its colour. */
type Grain = { pos: Vec3; k: number; lit?: boolean; petal?: boolean };

/**
 * Grain p of tree j, a leaf or a grain of sap: where it is, how grown the tree is (the Water forest's
 * spreading edge, and room round the world tree's trunk), and whether it is a falling petal.
 */
function treeGrain(p: Particle, j: number, leaf: boolean, F: BirdFrame, t: number): Grain {
  const slot = forestSlot(j);
  const kind = birdKinds()[slot.kind] as BirdKind;
  const route = kind.routes[Math.floor(hash(p.i, 215) * kind.routes.length)] as Route3;
  const len = length3(route);
  const at = nearBird(slot.at, F.me.c);
  let g = smooth((Math.hypot(at[0] - F.world[0], at[2] - F.world[2]) - 14) / 8);
  if (spreadFrom && waterWorld())
    g *= smooth(
      (spreadReach(t) - Math.hypot(at[0] - spreadFrom.c[0], at[2] - spreadFrom.c[2])) / 16,
    );
  let q: Vec3;
  let petal = false;
  if (leaf) {
    const [x, y, z] = along3(route, Math.max(0, len - kind.reach * hash(p.i, 243)));
    const d = fibonacciSphere(p.i % 157, 157);
    const open = kind.bloom ? bloomOpen(j, t) * g : 1;
    const r = kind.leafR * Math.cbrt(p.b) * (0.35 + 0.65 * open);
    q = [x + d[0] * r + Math.sin(t * 1.5 + p.i) * 0.08, y + d[1] * r * 0.8, z + d[2] * r];
    petal = kind.bloom && hash(p.i, 244) < 0.16;
  } else {
    // Sap climbing every trunk and branch.
    const [x, y, z, w] = along3(route, len * wrap(p.b + t * 0.03 * (0.7 + 0.6 * p.d), 1));
    q = add([x, y, z], fibonacciSphere(p.i % 389, 389), w * 0.5 * Math.sqrt(p.d));
  }
  const size = slot.size * (0.04 + 0.96 * g);
  const cy = Math.cos(slot.yaw);
  const sy = Math.sin(slot.yaw);
  const pos: Vec3 = [
    at[0] + (q[0] * cy - q[2] * sy) * size,
    at[1] + q[1] * size,
    at[2] + (q[0] * sy + q[2] * cy) * size,
  ];
  if (petal) {
    // A petal drifting down from its place in the crown, and resting where it lands.
    const fall = Math.min(1, frac(t * 0.05 + hash(p.i, 245)) * 1.25);
    pos[0] += Math.sin(t * 0.7 + p.i) * 2.5 * fall;
    pos[2] += Math.cos(t * 0.5 + p.i) * 2 * fall;
    pos[1] = lerp(pos[1], landY(pos[0], pos[2]) + 0.05, fall * fall);
  }
  return { pos, k: g, petal };
}

/** How much the water lifts at (x, z) in the mood chosen, and how much light its crest catches. */
function swell(x: number, z: number, pondK: number, t: number): { y: number; crest: number } {
  switch (waterMood) {
    case 1: {
      // Rings spreading slowly: out from a pond's middle, or from a spring every fourteen units.
      const r =
        pondK >= 0
          ? fromPond(pondK, x, z)
          : Math.hypot(x - (Math.floor(x / 14) + 0.5) * 14, z - (Math.floor(z / 14) + 0.5) * 14);
      const s = Math.sin(r * 1.3 - t * 2);
      return { y: 0.06 * s, crest: Math.max(0, s) ** 4 };
    }
    case 2: {
      // Long swells rolling through, smaller in the river and least in the ponds.
      const amp = pondK >= 0 ? 0.08 : waterWorld() ? 0.45 : 0.16;
      const s = Math.sin(0.45 * x + 0.25 * z - 1.7 * t);
      return {
        y: amp * (s + 0.4 * Math.sin(0.9 * z - 0.5 * x - 2.3 * t)),
        crest: Math.max(0, s) ** 3,
      };
    }
    default:
      return { y: 0, crest: 0 };
  }
}

/**
 * Grain p of the water: lying still, swelling with the mood, or in the rain a drop of its own (a
 * sparkle where it lands, flaring and gone, then landing again somewhere new) or one of a ring.
 */
function waterGrain(p: Particle, F: BirdFrame, t: number): Grain {
  const rain = waterMood === 3 ? hash(p.i, 250) : 1;
  if (rain < 0.35) {
    // A drop lands, a sparkle, and its ring widens and fades; then it falls again somewhere new.
    const n = Math.floor(hash(p.i, 251) * RAIN_RINGS);
    const age = t / RAIN_T + hash(n, 252);
    const drop = Math.floor(age);
    const f = age - drop;
    const m = n * 131 + drop;
    const s = waterSpot(hash(m, 253), hash(m, 254), hash(m, 255), 0);
    const c = nearWater([s.x, s.y, s.z], F.me.c);
    const r = 0.1 + 2.4 * Math.sqrt(f);
    const a = p.b * TAU;
    return {
      pos: [c[0] + Math.cos(a) * r, s.y + 0.03, c[2] + Math.sin(a) * r],
      k: 0.08 + 0.45 * (1 - f) ** 2,
    };
  }
  if (rain < 0.8) {
    // Lots of single sparkles, each a drop of its own, blooming where it lands and fading fast.
    const age = (t * 1.7) / RAIN_T + hash(p.i, 259);
    const drop = Math.floor(age);
    const f = age - drop;
    const m = p.i * 7 + drop;
    const s = waterSpot(hash(m, 253), hash(m, 254), hash(m, 255), 0);
    const c = nearWater([s.x, s.y, s.z], F.me.c);
    return { pos: [c[0], s.y + 0.05 + 0.3 * f, c[2]], k: 0.04 + 0.75 * (1 - f) ** 4 };
  }
  const s = waterSpot(p.b, p.d, hash(p.i, 256), t);
  const pos = nearWater([s.x, s.y, s.z], F.me.c);
  const w = swell(pos[0], pos[2], s.pond, t);
  pos[1] += w.y;
  const calm = 0.5 + 0.5 * Math.sin(t * 0.6 + p.i * 1.3);
  const k =
    waterMood === 0
      ? 0.12 + 0.12 * calm ** 3
      : waterMood === 3
        ? 0.07 + 0.03 * calm
        : 0.07 + 0.4 * w.crest;
  return { pos, k };
}

/**
 * The tree a grain of a reflection mirrors: any in the Water forest; else, by each pond, whichever of
 * its two trees stands across the water from the eye, the one that shows in it.
 */
const mirrorTree = (p: Particle, F: BirdFrame) =>
  waterWorld() ? Math.floor(p.a * BIRD_TREES) : (F.across[p.i % PONDS.length] as number);

/**
 * Grain p of a reflection: a grain of a tree turned over in the water under it. In the Golden forest
 * the trees on the ponds' banks, showing only where the eye sees the pond (else a faint glint on its
 * surface); in the Water forest every tree, in the open water. It trembles as the water moves.
 */
function mirrorGrain(p: Particle, F: BirdFrame, t: number): Grain {
  const world = waterWorld();
  const j = mirrorTree(p, F);
  const g = treeGrain(p, j, hash(p.i, 246) < 0.62, F, t);
  const slot = forestSlot(j);
  const pd = pondOfTree(j);
  const level = world ? SEA_Y : pd.level;
  // A pond is small beside its trees: turned over at full height, only their feet would fall in it
  // from where the bird flies, so its reflections are drawn shallower, as on water with a skin of
  // ripples; the open water gives them back whole.
  const m: Vec3 = [g.pos[0], level - (g.pos[1] - level) * (world ? 1 : 0.35), g.pos[2]];
  const deep = smooth((level - m[1]) / 6);
  const sway = [0.04, 0.25, 0.7, 0.3][waterMood] as number;
  m[0] += Math.sin((level - m[1]) * 0.9 - t * 1.3 + p.i * 0.01) * sway * deep;
  m[2] += Math.cos(m[0] * 0.5 + t * 0.9) * sway * 0.5 * deep;
  if (world) return { pos: m, k: g.k, lit: true, petal: g.petal };
  // The pond's own copy next to its tree's.
  const at = nearBird(slot.at, F.me.c);
  const cx = at[0] + pd.c[0] - slot.at[0];
  const cz = at[2] + pd.c[1] - slot.at[2];
  const e = F.eye;
  if (e[1] > level + 0.05 && m[1] < level) {
    // Where the eye's line to the turned-over grain crosses the water: in the pond, it shows.
    const s = (e[1] - level) / (e[1] - m[1]);
    const hx = e[0] + s * (m[0] - e[0]);
    const hz = e[2] + s * (m[2] - e[2]);
    if (Math.hypot(hx - cx, hz - cz) < pd.r * 0.95)
      return { pos: m, k: g.k, lit: true, petal: g.petal };
  }
  const a = hash(p.i, 247) * TAU;
  const r = pd.r * Math.sqrt(hash(p.i, 248));
  return { pos: [cx + Math.cos(a) * r, level + 0.02, cz + Math.sin(a) * r], k: 1, lit: false };
}

/** Grain p of the world tree: sap in the trunk and limbs, roots over the land, the crown, falling light. */
function worldGrain(p: Particle, F: BirdFrame, t: number): Vec3 {
  const v = (p.c - WORLD_LO) / (WORLD_HI - WORLD_LO);
  const routes = worldTreeRoutes();
  // The crown gathers on a third of the tips, so each tuft is full enough to read from far off.
  const n = Math.floor(hash(p.i, 260) * routes.length);
  const route = routes[v < 0.4 ? n : n - (n % 3)] as Route3;
  const len = length3(route);
  let q: Vec3;
  if (v < 0.3) {
    // Sap climbing, thickest low down, so the trunk stands out as the tree's spine.
    const s = wrap(p.b + t * 0.012 * (0.7 + 0.6 * p.d), 1) ** 1.6;
    const [x, y, z, w] = along3(route, len * s);
    q = add([x, y, z], fibonacciSphere(p.i % 389, 389), w * 0.5 * Math.sqrt(p.d));
  } else if (v < 0.4) {
    // Nine great roots running out over the land from the foot, sinking as they go.
    const n = Math.floor(p.b * 9);
    const a = (n / 9) * TAU + 0.3 * hash(n, 261);
    const s = p.d;
    const L = WORLD_TREE_H * 0.32;
    const th = 5 * (1 - s) ** 2;
    const d = fibonacciSphere(p.i % 61, 61);
    q = [
      Math.cos(a) * s * L + d[0] * th,
      th * 0.8 - 1.5 * s + d[1] * th * 0.5,
      Math.sin(a) * s * L + d[2] * th,
    ];
  } else if (v < 0.92) {
    const [x, y, z] = along3(route, len * (1 - 0.06 * hash(p.i, 262)));
    const d = fibonacciSphere(p.i % 157, 157);
    const r = 0.045 * WORLD_TREE_H * Math.cbrt(p.b);
    q = [x + d[0] * r + Math.sin(t * 0.3 + p.i) * 0.4, y + d[1] * r * 0.7, z + d[2] * r];
  } else {
    // Leaves of light drifting down out of the crown.
    const [x, y, z] = along3(route, len);
    const f = frac(t * 0.025 + hash(p.i, 263));
    q = [x + Math.sin(t * 0.4 + p.i) * 14 * f, y * (1 - f), z + Math.cos(t * 0.3 + p.i) * 14 * f];
  }
  const e = F.eye;
  const k = F.worldK;
  return [
    e[0] + (F.world[0] + q[0] - e[0]) * k,
    e[1] + (F.world[1] + q[1] - e[1]) * k,
    e[2] + (F.world[2] + q[2] - e[2]) * k,
  ];
}

/** Where grain p of the Bird Sim is at time t, and how much of its light shows. */
function birdGrain(p: Particle, t: number): Grain {
  const F = birdFrame(t);
  const me = F.me;
  switch (birdRole(p)) {
    case 'ground': {
      const pos = nearBird([p.b * BIRD_W, 0, p.d * BIRD_W], me.c);
      pos[1] = hill(pos[0], pos[2]);
      // Under the river and the ponds the bed shows only faintly.
      return { pos, k: wetAt(pos[0], pos[2]) ? 0.3 : 1 };
    }
    case 'water':
      return waterGrain(p, F, t);
    case 'sky': {
      if (p.d < 0.45) {
        // Stars over the canopy.
        const pos = nearBird([p.b * BIRD_W, 0, hash(p.i, 211) * BIRD_W], me.c);
        pos[1] = 70 + 25 * hash(p.i, 212);
        return { pos, k: 1 };
      }
      const pos = nearBird([p.b * BIRD_W, 0, hash(p.i, 213) * BIRD_W], me.c);
      const floor = landY(pos[0], pos[2]);
      if (waterMood === 3) {
        // In the rain the fireflies are raindrops, falling.
        const f = frac(t * 0.9 + hash(p.i, 257));
        return { pos: [pos[0], floor + 0.5 + 32 * (1 - f), pos[2]], k: 1 };
      }
      // Fireflies drifting between the trees, never far from the bird.
      const k = p.i * 0.37;
      return {
        pos: [
          pos[0] + 1.5 * Math.sin(t * 0.4 + k),
          floor + 1 + 14 * hash(p.i, 214) + 1.2 * Math.sin(t * 0.3 + k * 2),
          pos[2] + 1.5 * Math.cos(t * 0.35 + k),
        ],
        k: 1,
      };
    }
    case 'flock':
      return sparrow(p, me, t);
    case 'mushroom': {
      const m = birdMushroom(Math.floor(p.a * MUSHROOMS));
      const at = nearBird(m.at, me.c);
      if (waterWorld()) {
        // On the water, a lotus instead: a round leaf floating flat, a cup of petals over it.
        if (p.b < 0.5) {
          const a = p.d * TAU;
          const r = m.cap * 2 * Math.sqrt(p.b / 0.5);
          return { pos: [at[0] + Math.cos(a) * r, SEA_Y + 0.05, at[2] + Math.sin(a) * r], k: 1 };
        }
        const a = (Math.floor(p.d * 8) / 8) * TAU + 0.2 * hash(p.i, 258);
        const s = (p.b - 0.5) * 2;
        const r = m.cap * 1.4 * Math.sin(s * 1.9);
        return {
          pos: [at[0] + Math.cos(a) * r, SEA_Y + 0.1 + m.cap * s, at[2] + Math.sin(a) * r],
          k: 1,
        };
      }
      if (p.b < 0.3) {
        // The stem, thicker at the foot.
        const y = (p.b / 0.3) * m.h;
        const a = p.d * TAU;
        const w = m.stem * (1.3 - 0.4 * (y / m.h));
        return { pos: [at[0] + Math.cos(a) * w, at[1] + y, at[2] + Math.sin(a) * w], k: 1 };
      }
      // The cap: a dome over the stem, with a fringe of gills beneath.
      const d = fibonacciSphere(p.i % 233, 233);
      const dome = Math.abs(d[1]);
      const gill = p.b < 0.4;
      return {
        pos: [
          at[0] + d[0] * m.cap * (gill ? 0.9 : 1),
          at[1] + m.h + (gill ? -0.05 : dome * m.cap * 0.55),
          at[2] + d[2] * m.cap * (gill ? 0.9 : 1),
        ],
        k: 1,
      };
    }
    case 'world':
      return { pos: worldGrain(p, F, t), k: F.worldShown };
    case 'mirror':
      return mirrorGrain(p, F, t);
    case 'bird':
      return { pos: walking() ? walkerBody(p, me, t) : birdBody(p, me), k: 1 };
    default:
      return treeGrain(p, Math.floor(p.a * BIRD_TREES), birdRole(p) === 'leaf', F, t);
  }
}

/** Light fades into the far forest, so trees coming round the wrap never pop. */
const birdFar = (pos: Vec3, me: Vec3) =>
  1 - smooth((Math.hypot(pos[0] - me[0], pos[2] - me[2]) - BIRD_W * 0.28) / (BIRD_W * 0.2));

/** Blossom: a blush on gold, never pink enough to leave the gold behind. */
const BLOSSOM: RGB = [1, 0.74, 0.66];
/** The water, all gold as on Reflection: never silver or blue. */
const BIRD_WATER: RGB = [1, 0.86, 0.6];

/** A tree's leaf or sap at its brightness, before the far fade: gold, or blossom on the trees in bloom. */
function treeTone(
  p: Particle,
  j: number,
  leaf: boolean,
  petal: boolean,
  t: number,
  twinkle: number,
): RGB {
  if (!leaf) return scale(mix(BARK, GOLD, 0.5 + 0.5 * p.d), 0.55 * twinkle);
  const slot = forestSlot(j);
  if (petal) return scale(BLOSSOM, 0.4);
  if ((birdKinds()[slot.kind] as BirdKind).bloom) {
    const open = bloomOpen(j, t);
    return scale(mix(mix(GOLD, BLOSSOM, open), SUN, 0.3 * p.b), (0.3 + 0.25 * open) * twinkle);
  }
  return scale(mix(GOLD, SUGAR, p.b), 0.55 * twinkle);
}

function birdColour(p: Particle, t: number, twinkle: number, g: Grain): RGB {
  const me = flier(t);
  const role = birdRole(p);
  if (role === 'bird' && walking()) {
    // The walker's gold, the head a little brighter; the dust only while walking, fading as it rises.
    if (p.a >= 0.92) return scale(SUGAR, 0.05 * me.pace * (1 - frac(p.b + me.stride * 0.5)));
    return scale(mix(GOLD, SUGAR, p.a < 0.14 ? 0.8 : 0.3), p.a < 0.14 ? 0.09 : 0.07);
  }
  if (role === 'bird') {
    // Pale gold feathers, the wingtips and the tail's edge brighter; soft, since it is near.
    const tip = p.a >= 0.35 ? p.b ** 2 : p.a >= 0.25 ? p.b : 0;
    return scale(mix([0.95, 0.82, 0.55], SUN, tip), 0.05 + 0.06 * tip);
  }
  if (role === 'world') {
    // Gold all through, softer the farther it is drawn in, so the far crown never glares.
    const v = (p.c - WORLD_LO) / (WORLD_HI - WORLD_LO);
    const near = 0.35 + 0.65 * g.k * Math.sqrt(birdFrame(t).worldK);
    const tone: RGB =
      v < 0.3
        ? scale(mix(BARK, GOLD, 0.5 + 0.5 * p.d), 0.5)
        : v < 0.4
          ? scale(mix(BARK, GOLD, 0.3), 0.35)
          : v < 0.92
            ? scale(mix(GOLD, SUGAR, p.b), 0.42)
            : scale(SUGAR, 0.3 + 0.5 * Math.max(0, Math.sin(t * 1.1 + p.i)) ** 4);
    return scale(tone, near * g.k * twinkle);
  }
  const far = birdFar(g.pos, me.c);
  switch (role) {
    case 'ground':
      return scale(mix(EARTH, GOLD, 0.4), 0.14 * far * g.k);
    case 'water':
      return scale(BIRD_WATER, g.k * far);
    case 'sky': {
      if (p.d < 0.45) return scale(STAR, (0.2 + 0.7 * hash(p.i, 216) ** 6) * twinkle);
      if (waterMood === 3) return scale(BIRD_WATER, 0.1 * far);
      // A firefly: a warm spark that comes and goes.
      const on = Math.max(0, Math.sin(t * 1.3 + p.i * 2.1)) ** 3;
      return scale(SUGAR, (0.15 + 0.9 * on) * far);
    }
    case 'flock': {
      // Small warm specks, their wings catching the light as they beat.
      const flick = Math.sin(t * 13 + p.i * 1.7) ** 2;
      return scale(mix(BARK, SUGAR, 0.5), (0.1 + 0.1 * flick) * g.k);
    }
    case 'mushroom': {
      const m = birdMushroom(Math.floor(p.a * MUSHROOMS));
      if (waterWorld()) {
        // The lotus: a dim gold leaf, its petals blush and gold.
        if (p.b < 0.5) return scale(GOLD, 0.05 * far);
        return scale(mix(BLOSSOM, SUN, (p.b - 0.5) * 1.2), 0.09 * far * twinkle);
      }
      if (p.b < 0.3) return scale(STALK, 0.35 * far);
      if (p.b < 0.4) return scale(mix(STALK, AMBER, 0.4), 0.3 * far);
      // Caps in amber and ember red, some glowing softly from within, with pale spots.
      const spot = hash(p.i, 217) < 0.12;
      const cap = spot ? STALK : mix(AMBER, RIPE, hash(Math.floor(p.a * MUSHROOMS), 218));
      const glow = m.glow ? 0.55 + 0.25 * Math.sin(t * 0.8 + p.a * 40) : 0.4;
      return scale(cap, glow * far * twinkle);
    }
    case 'mirror': {
      if (!g.lit) return scale(BIRD_WATER, 0.07 * far);
      const j = mirrorTree(p, birdFrame(t));
      const tone = treeTone(p, j, hash(p.i, 246) < 0.62, !!g.petal, t, twinkle);
      // Fainter than the tree, glinting as the water catches the light.
      const glint = 0.75 + 0.25 * Math.sin(t * 2 + p.i * 1.3);
      return scale(golden(tone), 0.45 * glint * g.k * far);
    }
    default: {
      const tone = treeTone(
        p,
        Math.floor(p.a * BIRD_TREES),
        role === 'leaf',
        !!g.petal,
        t,
        twinkle,
      );
      // Saplings at the Water forest's edge come up out of the dark as they grow.
      return scale(tone, far * (0.15 + 0.85 * g.k));
    }
  }
}

/* ---------- 14. Above and below: roots and tree, all gold, about the horizon ---------- */

/*
 * 2026-11-10: "one in vegetal with roots below and tree above, but all
 * golden, with a horizon in the middle, no green". The roots of piece 2 hang
 * from the horizon and the tree of piece 6 stands on it, both grown from the
 * one point where they meet. Water climbs from the root tips to the base, and
 * sap on up the trunk.
 */
const BELOW_K = 0.85;
/*
 * The tree holds still and the horizon runs straight across; the Road slider
 * is gone (2026-11-10: "road can be taken off in the full tree, and roots
 * begin more straight so they all get pushed a few cm lower"). The roots drop
 * straight down from the horizon on a short neck before they spread.
 */
const ROOT_DROP = 4;
/** How far below its own top a root has gone straight down before it leans out. */
const ROOT_STRAIGHT = 7;
type BelowRole = 'horizon' | 'water' | 'root' | 'wood' | 'leaf';
const belowRole = (p: Particle): BelowRole =>
  p.c < 0.07
    ? noRoad
      ? 'water'
      : 'horizon'
    : p.c < 0.15
      ? 'water'
      : p.c < 0.45
        ? 'root'
        : p.c < 0.85
          ? 'wood'
          : 'leaf';

function belowPoint(p: Particle, u: number, t: number): Vec3 {
  const grown = 0.05 + 0.95 * smooth(u / 0.42);
  const role = belowRole(p);
  if (role === 'horizon') {
    // A thin line, brightest and densest at the middle, a faint shimmer along it.
    const x = (p.b - 0.5) * 2;
    return [
      Math.sign(x) * Math.abs(x) ** 1.6 * 70,
      Math.sin(p.b * 300 + t * 0.4) * 0.06,
      (p.d - 0.5) * 1.2,
    ];
  }
  if (role === 'root' && hash(p.i, 83) < 0.06) {
    // The neck: one straight stem from the horizon down to where the roots begin.
    const w = 0.35 * Math.sqrt(p.d);
    const a = p.d * 40;
    return [Math.cos(a) * w, -ROOT_DROP * BELOW_K * p.b * grown, Math.sin(a) * w];
  }
  if (role === 'water' || role === 'root') {
    const set = rootSystem();
    const r = Math.floor(p.a * set.routes.length);
    const len = routeLength(set.routes[r] as Route);
    const s =
      role === 'water' ? len * grown * wrap(p.b - t * 0.06, 1) ** 0.55 : len * grown * p.b ** 0.55;
    const pos = onRoot(r, s, role === 'root' ? (p.d - 0.5) * 2 : 0);
    const y = pos[1] - ROOT_BASE[1];
    // Near their top the roots are drawn in toward the middle, so they all start straight down.
    const out = 0.15 + 0.85 * smooth(-y / ROOT_STRAIGHT);
    return [pos[0] * out * BELOW_K, (y - ROOT_DROP) * BELOW_K, pos[2] * out * BELOW_K];
  }
  const routes = tree3d();
  const route = routes[Math.floor(p.a * routes.length)] as Route3;
  const len = length3(route);
  let pos: Vec3;
  if (role === 'leaf') {
    const [x, y, z] = along3(route, len * grown);
    const d = fibonacciSphere(p.i % 157, 157);
    const r = 1.6 * Math.cbrt(p.b) * smooth((u - 0.3) / 0.2);
    pos = [x + d[0] * r, y + d[1] * r * 0.8, z + d[2] * r];
  } else {
    const dir = sapDir(p.c < 0.65);
    const s = len * grown * wrap(p.b + dir * t * 0.04 * (0.7 + 0.6 * p.d), 1) ** 0.45;
    const [x, y, z, w] = along3(route, s);
    pos = add([x, y, z], fibonacciSphere(p.i % 389, 389), w * 0.5 * Math.sqrt(p.d));
  }
  return [pos[0] * BELOW_K, (pos[1] - GROUND_3D) * BELOW_K, pos[2] * BELOW_K];
}

/* ---------- where every grain is ---------- */

/** Where particle p is in piece k's finished form, `u` through it, at chapter time t. */
function form(k: number, p: Particle, u: number, t: number): Vec3 {
  switch (idOf(k)) {
    case 'cell':
      return cellPoint(p, u, t);
    case 'roots':
      return rootPoint(p, u, t);
    case 'roots-tree':
      return rootsTreePoint(p, u, t);
    case 'city':
      return cityPos(p, cityGrain(p, t));
    case 'tree-2d':
      return flatPoint(p, u, t);
    case 'tree-3d':
      return tree3Point(p, u, t);
    case 'veins':
      return veinsPoint(p, t);
    case 'fungi':
      return fungusPoint(p, u, t);
    case 'leaf':
      return leafPoint(p, u, t);
    case 'flower':
      return flowerPoint(p, u, t);
    case 'fruit':
      return fruitPoint(p, u, t);
    case 'full-tree':
      return belowPoint(p, u, t);
    case 'reflection':
      return reflectionPoint(p, u, t);
    case 'bloom':
      return bloomPoint(p, u, t);
    case 'bird':
      return birdGrain(p, t).pos;
    default:
      return forestPoint(k, p, u, t);
  }
}

/*
 * Between pieces: a ball of stars. Each form loosens into a wide, slowly
 * turning ball of faint stars round where the next piece stands, and the
 * stars settle into the new form in its growing order, from the base out to
 * the tips. No piece starts from one crowded point, so the picture never
 * becomes a ball of light.
 */

/**
 * How far through each piece its form is whole. The fruit tells its own
 * story and the forests are flown through, so their time always runs.
 */
// The fruit, the two roads, the drums, the bloom and the Bird Sim grow as they go and never use theirs.
const FORMED: Record<string, number> = {
  cell: 0.55,
  roots: 0.45,
  'roots-tree': 0.45,
  city: 0.3,
  'tree-2d': 0.45,
  'tree-3d': 0.5,
  fungi: 0.7,
  leaf: 0.45,
  flower: 0.4,
  'full-tree': 0.45,
  reflection: 0.45,
};
const formed = (k: number) => FORMED[idOf(k)] ?? 0;
const BALL_R = 20;
const isFruit = (k: number) => PHASES[k]?.id === 'fruit';
const runsOn = (k: number) => isFruit(k) || isForest(k) || hasBird(k);

/** When a grain reaches its place in piece k, 0 (first) to 1 (last): the piece's growing order. */
function order(k: number, p: Particle): number {
  const id = idOf(k);
  if (id === 'cell') return cellFar(Math.floor(p.a * CELL_COUNT));
  if (id === 'veins') return veinSeed(p).b;
  if (id === 'reflection') return reflSeed(p).b;
  if (id === 'flower' && flowerRole(p) === 'floret') return p.a;
  if (isFruit(k)) return 0.5 * p.b;
  return p.b;
}

/** Piece k's form, held whole until FORMED unless the piece grows as it goes. */
const whole = (k: number, p: Particle, u: number, t: number) =>
  form(k, p, runsOn(k) ? u : Math.max(u, formed(k)), t);

/** How far grain p has come from the ball of stars into piece k's form, `u` through it. */
export function arrival(k: number, p: Particle, u: number): number {
  return smooth((u - 0.02 - 0.4 * order(k, p)) / 0.14);
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
  const f = whole(k, p, u, t);
  const a = arrival(k, p, u);
  return a >= 1 ? f : lerp3(starBall(k, p, t), f, a);
}

/* ---------- colour ---------- */

const CELL_WALL: RGB = [0.75, 0.9, 0.55];
const CHLORO: RGB = [0.35, 0.95, 0.35];
const NUCLEUS: RGB = [1, 0.8, 0.5];
const SPARK: RGB = [1, 0.95, 0.7];
const EARTH: RGB = [0.82, 0.58, 0.34];
const ROOT: RGB = [0.9, 0.75, 0.5];
const WATER: RGB = [0.55, 0.9, 0.95];
const GOLD: RGB = [196 / 255, 160 / 255, 96 / 255];
const LEAF: RGB = [0.62, 0.82, 0.38];
const SUGAR: RGB = [1, 0.78, 0.38];
const BARK: RGB = [0.75, 0.55, 0.32];
const HYPHA: RGB = [0.85, 0.8, 0.95];
const THREAD: RGB = [0.82, 0.76, 0.96];
const CAP: RGB = [0.9, 0.55, 0.3];
const STALK: RGB = [0.95, 0.88, 0.75];
const BLADE: RGB = [0.3, 0.7, 0.25];
const VEIN: RGB = [0.65, 0.92, 0.4];
const SUN: RGB = [1, 0.97, 0.8];
const DISC: RGB = [0.4, 0.25, 0.1];
const AMBER: RGB = [1, 0.62, 0.18];
const PETAL: RGB = [1, 0.82, 0.28];
const UNRIPE: RGB = [0.45, 0.75, 0.3];
const RIPE: RGB = [1, 0.5, 0.22];
const SEED: RGB = [0.98, 0.88, 0.66];
const SHOOT: RGB = [0.55, 0.95, 0.4];

const STAR: RGB = [0.9, 0.86, 0.74];

/** The colour of particle p in piece k: a faint star until it arrives, then the form's own. */
export function colour(k: number, p: Particle, u: number, t: number): RGB {
  const c = formColour(k, p, u, t);
  const a = arrival(k, p, u);
  if (a >= 1) return c;
  const twinkle = 0.6 + 0.4 * Math.sin(t * 2.3 + p.i * 0.91);
  return mix(scale(STAR, 0.32 * twinkle), c, a);
}

/** Every grain's own slow twinkle. */
const twinkleOf = (p: Particle, t: number) => 0.7 + 0.3 * Math.sin(t * 1.7 + p.i * 0.37);

function formColour(k: number, p: Particle, u: number, t: number): RGB {
  const twinkle = twinkleOf(p, t);
  switch (idOf(k)) {
    case 'cell':
      switch (cellRole(p)) {
        case 'wall':
          return scale(CELL_WALL, 0.32);
        case 'chloroplast':
          return scale(CHLORO, 0.7 * twinkle);
        case 'nucleus':
          return scale(NUCLEUS, 0.6);
        default: {
          // Brightest as it passes through the wall between two cells.
          const { f } = pulseOf(p, u, t);
          const band = Math.exp(-((f - 0.5) ** 2) / 0.01);
          return scale(SPARK, (0.25 + 0.9 * band) * smooth((u - 0.35) / 0.15));
        }
      }
    case 'roots':
      switch (rootRole(p)) {
        case 'water': {
          // None near the top (2026-11-10: "upper part of roots without the blue dots, but they
          // can appear as you go in the ground and deeper"): the water shows from 4 below the base.
          const depth = ROOT_BASE[1] - rootPoint(p, u, t)[1];
          return scale(WATER, 0.9 * twinkle * smooth((depth - 4) / 12));
        }
        case 'base':
          return scale(SUGAR, 0.9);
        case 'soil':
          return scale(EARTH, 0.3);
        case 'root':
          return scale(mix(EARTH, ROOT, p.b), 0.7 * twinkle);
        default:
          return scale(ROOT, 0.35);
      }
    case 'roots-tree':
      switch (rootsTreeRole(p)) {
        case 'water': {
          // Water below the ground, showing only a little way down as in Roots; sap above it.
          const q = waterTrip(p, t);
          return q < 0.5
            ? scale(WATER, 0.9 * twinkle * smooth((1 - 2 * q - 0.1) / 0.25))
            : scale(mix(GOLD, WATER, 0.35), 0.8 * twinkle);
        }
        case 'base':
          return scale(SUGAR, 0.9);
        case 'soil':
          return scale(EARTH, 0.3);
        case 'root':
          return scale(mix(EARTH, ROOT, p.b), 0.7 * twinkle);
        case 'hair':
          return scale(ROOT, 0.35);
        case 'leaf':
          return scale(mix(LEAF, [0.85, 0.9, 0.4], p.b), 0.75 * twinkle);
        default:
          return scale(mix(BARK, GOLD, p.d), 0.7 * twinkle);
      }
    case 'city':
      return cityColour(p, u, t, twinkle);
    case 'tree-2d':
      if (isSoil2(p)) return scale(EARTH, 0.35);
      if (isLeaf2(p)) return scale(LEAF, 0.9 * twinkle);
      return p.c < 0.4
        ? scale(mix(GOLD, WATER, 0.35), 0.8 * twinkle)
        : scale(mix(GOLD, SUGAR, 0.4), 0.8 * twinkle);
    case 'tree-3d':
      switch (tree3Role(p)) {
        case 'soil':
          return groundColour(p);
        case 'leaf':
          return fullGold
            ? scale(mix(GOLD, SUGAR, p.b), 0.8 * twinkle)
            : scale(mix(LEAF, [0.85, 0.9, 0.4], p.b), 0.75 * twinkle);
        default:
          return scale(mix(fullGold ? GOLD : BARK, GOLD, p.d), 0.7 * twinkle);
      }
    case 'veins': {
      // The twinkle by run too, so every copy shines alike.
      const { b, d } = veinSeed(p);
      const tw = 0.7 + 0.3 * Math.sin(t * 1.7 + Math.floor(p.i / veinCopies()) * 0.37);
      // Everything brightens on the beat and settles before the next.
      const beat = beatAt(t);
      switch (veinRole(p)) {
        case 'pulse':
          return scale(SUGAR, (0.75 + 0.35 * beat) * tw);
        case 'tip':
          return scale(SUGAR, (0.8 + 0.35 * beat) * traced(1, t));
        case 'ring':
          return scale(GOLD, (0.35 + 0.25 * beat) * tw);
        case 'lace':
          // The knot in the middle is the drum's heart: it flares on every beat.
          return d < 0.2
            ? scale(SUGAR, (0.5 + 0.7 * beat) * tw)
            : scale(mix(BARK, GOLD, 0.6), (0.3 + 0.3 * beat) * tw);
        default:
          return scale(
            mix([0.78, 0.56, 0.3], SUGAR, b),
            (0.6 + 0.25 * beat) * tw * traced(b ** 0.6, t),
          );
      }
    }
    case 'fungi':
      switch (fungusRole(p)) {
        case 'pulse':
          return scale(SUGAR, 0.95 * twinkle);
        case 'spore':
          return scale(SUGAR, 0.8);
        case 'soil':
          return scale(EARTH, 0.25);
        case 'thread': {
          const r = Math.floor(p.a * fungi().routes.length);
          return r < fungi().hyphae ? scale(HYPHA, 0.5 * twinkle) : scale(THREAD, 0.8 * twinkle);
        }
        default:
          return p.d < 0.35 ? scale(STALK, 0.55) : scale(CAP, 0.7 * twinkle);
      }
    case 'leaf':
      switch (leafRole(p)) {
        case 'midrib':
          return scale([0.75, 0.95, 0.45], 0.85);
        case 'vein':
          return scale(VEIN, 0.7 * twinkle);
        case 'blade':
          return scale(BLADE, 0.28 * (0.8 + 0.4 * Math.sin(p.b * 90) * Math.sin(p.d * 70)));
        case 'light': {
          const f = lightFall(p, t);
          return scale(SUN, (0.25 + 0.9 * f) * smooth((u - 0.3) / 0.15));
        }
        default:
          return scale(SUGAR, 0.9 * smooth((u - 0.35) / 0.15));
      }
    case 'flower':
      switch (flowerRole(p)) {
        case 'floret': {
          const n = Math.floor(p.a * FLORETS);
          return scale(mix(DISC, AMBER, Math.sqrt(n / FLORETS)), 0.85 * twinkle);
        }
        case 'petal':
          // A third more grains since the stem went: each a little dimmer, the same light in all.
          return scale(PETAL, 0.5 * (0.75 + 0.25 * p.b));
        default:
          return scale([1, 0.92, 0.55], 0.8 * smooth((opening(u) - 0.6) / 0.3));
      }
    case 'avenue':
    case 'forest':
      return forestColour(k, p, u, t, twinkle);
    case 'reflection':
      return reflectionColour(p, t);
    case 'bloom':
      return bloomColour(p, u, t);
    case 'bird':
      return birdColour(p, t, twinkle, birdGrain(p, t));
    case 'full-tree':
      // All gold: no green anywhere.
      switch (belowRole(p)) {
        case 'horizon':
          return scale(SUN, 0.55 * (1 - 0.6 * Math.abs(p.b - 0.5) * 2));
        case 'water':
          return scale(SUN, 0.85 * twinkle);
        case 'root':
          return scale(mix(GOLD, AMBER, 0.3 * p.b), 0.6 * twinkle);
        case 'leaf':
          return scale(mix(SUGAR, PETAL, p.b), 0.6 * twinkle);
        default:
          return scale(mix(GOLD, SUGAR, p.d * 0.5), 0.7 * twinkle);
      }
    default: {
      const ripe = smooth((u - 0.08) / 0.3);
      switch (fruitRole(p)) {
        case 'skin':
          return scale(mix(UNRIPE, RIPE, ripe), 0.4 * twinkle);
        case 'flesh':
          return scale(mix(UNRIPE, SUGAR, ripe), 0.14 * (1 - 0.8 * smooth((u - 0.65) / 0.25)));
        case 'soil':
          return scale(EARTH, 0.3);
        case 'seed':
          return scale(SEED, 0.15);
        default:
          // Many grains wait in the one seed that sprouts: each is faint until it grows.
          return mix(
            scale(SEED, 0.05),
            scale(SHOOT, 0.9 * twinkle),
            smooth(((u - 0.64) / 0.22) * 3),
          );
      }
    }
  }
}

const SODIUM: RGB = [1, 0.66, 0.28];

/** A city's light: brighter and whiter toward the centre, amber along the highways and suburbs. */
function cityColour(p: Particle, u: number, t: number, twinkle: number, g = cityGrain(p, t)): RGB {
  const lit = cityLit(g.x, g.y, u);
  const d = g.dens;
  switch (cityRole(p)) {
    case 'car':
      // Headlights one way, tail lights the other.
      return g.way > 0 ? scale(SUN, 0.85 * lit) : scale(AMBER, 0.75 * lit);
    case 'core':
      return scale(mix(SUGAR, SUN, 0.55), (0.6 + 0.3 * twinkle) * lit);
    case 'glow':
      return scale(mix(GOLD, SUGAR, d), (0.14 + 0.4 * d) * twinkle * lit);
    default: {
      const tone = g.rank === 0 ? SODIUM : mix(AMBER, SUN, 0.25 + 0.6 * d ** 1.5);
      const k = at([0.7, 0.95, 0.8, 0.62], g.rank);
      return scale(tone, (0.3 + 0.6 * d) * k * twinkle * lit);
    }
  }
}

const MOSS: RGB = [0.35, 0.55, 0.25];
const MIST: RGB = [0.72, 0.7, 0.88];
/** The forest's leaves: one green in the avenue, a spread of greens and a little amber in the wild forest. */
const FOREST_LEAVES: RGB[] = [LEAF, [0.45, 0.78, 0.32], [0.82, 0.86, 0.36], [0.95, 0.66, 0.3]];

function forestColour(k: number, p: Particle, u: number, t: number, twinkle: number): RGB {
  const { d } = forestAt(k, p, u, t);
  const h = haze(d);
  switch (forestRole(k, p)) {
    case 'edge':
      return scale(GOLD, (isAvenue(k) ? 0.5 : 0.35) * h);
    case 'water': {
      const glint = Math.sin(t * 1.5 + p.i * 0.7) ** 2;
      return scale(mix(WATER, SUN, 0.45), (0.18 + 0.4 * glint) * h);
    }
    case 'mountain': {
      // Brightest on its outline and snowy peak, its face faint; a far, cool tone.
      const x = (p.b - 0.5) * 170;
      const snow = smooth((ridge(x) - 24) / 8);
      return p.d < 0.6
        ? scale(mix(MIST, SUN, snow), 0.8 + 0.3 * snow)
        : scale(MIST, 0.2 * (0.4 + 0.6 * ((p.d - 0.6) / 0.4)));
    }
    case 'dash':
      return scale(SUN, 0.45 * h);
    case 'ground':
      return scale(mix(EARTH, MOSS, frac(p.b * 31)), 0.2 * h);
    case 'firefly':
      return scale(SUGAR, (0.4 + 0.6 * Math.sin(t * 1.3 + p.i) ** 2) * h);
    case 'leaf': {
      const j = Math.floor(p.a * FOREST_SLOTS);
      const tone = isAvenue(k) ? LEAF : (FOREST_LEAVES[Math.floor(hash(j, 49) * 4)] as RGB);
      return scale(mix(tone, [0.85, 0.9, 0.4], p.b * 0.4), 0.75 * twinkle * h);
    }
    default:
      return scale(mix(BARK, GOLD, p.d), 0.65 * twinkle * h);
  }
}

/* ---------- the moving eye ---------- */

type Eye = { eye: Vec3; target: Vec3 };

/** Where the camera stands in piece k, `u` through it. */
export function eyeIn(k: number, u: number, t: number): Eye {
  switch (idOf(k)) {
    case 'cell': {
      // Slowly round the block of cells.
      const a = 0.5 + u * 1.3;
      return { eye: [Math.sin(a) * 46, 10, Math.cos(a) * 46], target: [0, 0, 0] };
    }
    case 'roots':
      return { eye: [Math.sin(t * 0.05) * 8, -2, 56], target: [0, 0, 0] };
    case 'roots-tree': {
      // Slowly round the tree, a little above the ground, so the ground reads as a thin line.
      const a = t * 0.06;
      return { eye: [Math.sin(a) * 62, 5, Math.cos(a) * 62], target: [0, 2, 0] };
    }
    case 'city': {
      // Flying over: drifting slowly across the city, looking a little ahead and down.
      const c = cityPlan().centre;
      const x = c[0] * CITY_K + 12 * Math.sin(t * 0.023);
      const y = c[1] * CITY_K + 8 * Math.sin(t * 0.017 + 1);
      return { eye: [x, y - 12, 62], target: [x, y + 2, 0] };
    }
    case 'tree-2d':
      return { eye: [Math.sin(t * 0.04) * 3, 0, 64], target: [0, 0, 0] };
    case 'tree-3d': {
      const a = t * 0.07;
      return { eye: [Math.sin(a) * 58, 2, Math.cos(a) * 58], target: [0, -2, 0] };
    }
    case 'veins':
      // Face on to the drum, its knot in the middle of the picture.
      return { eye: [0, 0, 60], target: [0, 0, 0] };
    case 'fungi':
      return { eye: [Math.sin(t * 0.04) * 10, 14, 44], target: [0, SOIL, 0] };
    case 'leaf':
      return { eye: [Math.sin(t * 0.05) * 6, 2, 52], target: [0, 0, 0] };
    case 'flower': {
      const tilt = smooth((u - 0.4) / 0.5);
      return { eye: lerp3([0, HEAD[1], 44], [18, 14, 36], tilt), target: HEAD };
    }
    case 'avenue':
    case 'forest': {
      // Down the middle of the road, a little above it, swaying a touch more in the wild forest.
      // In the forest the eye follows the river's bends, looking to where it bends next.
      const s = flown(k, u);
      const sway = Math.sin(t * 0.15) * (isAvenue(k) ? 0.25 : 0.7);
      const here = bendAt(k, s + BEHIND);
      const there = bendAt(k, s + BEHIND + 30);
      return {
        eye: [here + sway, EYE_H, -s],
        target: [there + sway * 0.4, EYE_H - 0.7, -s - 30],
      };
    }
    case 'bloom': {
      if (bloomKind === FIREWORKS) {
        // Back far enough to see them all, drifting a little from side to side.
        const a = Math.sin(t * 0.05) * 0.25;
        return { eye: [Math.sin(a) * 56, 5, Math.cos(a) * 56], target: [0, 1, 0] };
      }
      // Slowly round the flower, rising with it, and a little above once it opens.
      const a = 0.3 + t * 0.03;
      const ty = lerp(BLOOM_GROUND + 3, BLOOM_TOP + 1, smooth(u / 0.35));
      const lift = 4 + 9 * smooth((u - 0.5) / 0.3);
      return { eye: [Math.sin(a) * 32, ty + lift, Math.cos(a) * 32], target: [0, ty, 0] };
    }
    case 'bird': {
      // Behind the bird and a little above, looking past it the way it flies; the walker from
      // over its shoulder, at its own height.
      const { c, f } = flier(t);
      if (walking()) {
        const eye = add(add(c, f, -WALK_CAM), [0, 1, 0], 4);
        eye[1] = Math.max(landY(eye[0], eye[2]) + 1.5, eye[1]);
        return { eye, target: add(add(c, f, 6), [0, 1, 0], 2) };
      }
      const eye = add(add(c, f, -BIRD_CAM), [0, 1, 0], BIRD_CAM * 0.3);
      eye[1] = Math.max(landY(eye[0], eye[2]) + 1, eye[1]);
      return { eye, target: add(c, f, 6) };
    }
    case 'reflection':
      // Still, face on and a little above the water, so its surface shows: the tree does not turn.
      return { eye: [0, 7, 78], target: [0, 0, 0] };
    case 'full-tree':
      // Still, face on, a little above the horizon, so a line turned toward the eye reads as a road.
      return { eye: [0, 4, 80], target: [0, 0, 0] };
    default: {
      const { c } = fruitOf(u, t);
      const ty = lerp(c[1], GROUND_FRUIT + 2, smooth((u - 0.5) / 0.2));
      return {
        eye: [Math.sin(t * 0.05) * 4, ty + 4, 36 - 6 * smooth((u - 0.6) / 0.3)],
        target: [0, ty, 0],
      };
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
 * Each piece on its own (2026-11-10: "all those vegetal, with pill mode so u
 * just get the visuals straight up without the circle at start … so i can
 * click journey mode and it brings me to what it is now"). A piece starts
 * whole, with no ball of stars, and loops: near the end each grain glides
 * back to where the piece began. The two roads never loop back: the eye flies
 * on, two turns of the recycled road per loop, so the wrap is seamless.
 */

/**
 * Where piece k starts on its own: whole already. The roads grow as they go,
 * so from 0; the fruit once it has swelled, not as a small bright dot.
 */
const pieceFrom = (k: number) => (isForest(k) || hasBird(k) ? 0 : isFruit(k) ? 0.2 : formed(k));

/** How long piece k plays on its own before it loops, in seconds. */
export function pieceLength(k: number): number {
  if (isForest(k)) return (2 * LOOP) / SPEED;
  // The Bird Sim never loops back: its bar runs once for each line about freedom.
  if (hasBird(k)) return QUOTE_EVERY;
  return (1 - pieceFrom(k)) * (PHASES[k] as VegetalPhase).duration;
}

/** Piece k on its own, `s` seconds in: how far through the loop (f), the piece's own u, and its time. */
function pieceClock(k: number, s: number): { f: number; u: number; t: number } {
  const len = pieceLength(k);
  const f = wrap(s, len) / len;
  const from = pieceFrom(k);
  const u = isForest(k) ? (f * len) / (PHASES[k] as VegetalPhase).duration : from + (1 - from) * f;
  return { f, u, t: s };
}

/**
 * How far through its loop piece k is, `s` seconds in, for the step bar and the words. On the Bird
 * Sim it also turns to the line about freedom of the moment, so each line comes in and goes out on
 * its own loop.
 */
export function pieceProgress(k: number, s: number): number {
  if (hasBird(k)) quoteNow = Math.floor(wrap(s / QUOTE_EVERY, FREEDOM.length));
  return pieceClock(k, s).f;
}

/** Position and colour of particle p in piece k on its own, `s` seconds in. */
export function pieceAt(p: Particle, k: number, s: number): { pos: Vec3; rgb: RGB } {
  const { f, u, t } = pieceClock(k, s);
  if (hasBird(k)) {
    // Worked out once for both its place and its colour: the Bird Sim has the most to work out.
    const g = birdGrain(p, t);
    return { pos: g.pos, rgb: birdColour(p, t, twinkleOf(p, t), g) };
  }
  if (hasCities(k)) {
    // The city's grain worked out once for its place and its colour. On its own the city is lit
    // from the start and stands still, so its loop needs no glide back.
    const g = cityGrain(p, t);
    return { pos: cityPos(p, g), rgb: cityColour(p, u, t, twinkleOf(p, t), g) };
  }
  const pos = whole(k, p, u, t);
  const rgb = formColour(k, p, u, t);
  if (isForest(k)) return { pos, rgb };
  const w = smooth((f - 0.8 + 0.12 * p.stagger) / 0.2);
  if (w <= 0) return { pos, rgb };
  const from = pieceFrom(k);
  return {
    pos: lerp3(pos, whole(k, p, from, t), w),
    rgb: mix(rgb, formColour(k, p, from, t), w),
  };
}

/** The camera in piece k on its own, easing back to where the piece began in the last quarter. */
export function pieceCamera(k: number, s: number): Eye {
  const { f, u, t } = pieceClock(k, s);
  const a = eyeIn(k, u, t);
  const w = isForest(k) || hasBird(k) ? 0 : smooth((f - 0.75) / 0.25);
  if (w <= 0) return a;
  const b = eyeIn(k, pieceFrom(k), t);
  return { eye: lerp3(a.eye, b.eye, w), target: lerp3(a.target, b.target, w) };
}

/** Glow and size of piece k on its own. */
export function pieceLook(k: number): { glow: number; size: number } {
  const { glow, size } = PHASES[k] as VegetalPhase;
  return { glow, size };
}

/** Glow and size for the whole picture, blended across piece boundaries. */
export function look(time: number): { glow: number; size: number } {
  const { index, u } = phaseAt(time);
  const now = PHASES[index] as VegetalPhase;
  const next = PHASES[(index + 1) % PHASES.length] as VegetalPhase;
  const w = smooth((u - 0.75) / 0.25);
  return { glow: lerp(now.glow, next.glow, w), size: lerp(now.size, next.size, w) };
}
