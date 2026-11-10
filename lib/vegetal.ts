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
 * Eleven pieces played as one trip, built as the Journey is (lib/journey.ts):
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
  ['tree-2d', 'tree-3d', 'avenue', 'forest', 'full-tree', 'reflection'].includes(
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

/* ---------- 3. Tree 2D: the Star Tree, flat ---------- */

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

/* ---------- 4. Tree 3D: branches forking round their own axis ---------- */

const STEP3 = 0.2;
export type Route3 = { pts: Float32Array; count: number };
const length3 = (r: Route3) => (r.count - 1) * STEP3;

/** Resamples a polyline of x, y, z, width to points STEP3 apart. */
function resample3(raw: number[]): Route3 {
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

function grow3(
  rng: () => number,
  o: Vec3,
  dir: Vec3,
  len: number,
  width: number,
  depth: number,
  turn: number,
  chain: number[],
  out: number[][],
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
  const forks = chain.length === 0 ? 4 : depth > 2 && rng() < 0.3 ? 3 : 2;
  for (let i = 0; i < forks; i++) {
    // Each fork leans out round the branch's own axis, turning on by the golden angle each time.
    const a = turn + (i * TAU) / forks + (rng() - 0.5) * 0.4;
    const tilt = 0.38 + 0.25 * rng();
    const side = add(mul(e1, Math.cos(a)), e2, Math.sin(a));
    const nd = norm(add(add(mul(dir, Math.cos(tilt)), side, Math.sin(tilt)), [0, 0.22, 0]));
    grow3(
      rng,
      end,
      nd,
      len * (0.76 + 0.08 * (rng() - 0.5)),
      width * 0.7,
      depth - 1,
      a + GOLDEN_ANGLE,
      next,
      out,
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
export function setGround(i: number) {
  groundKind = i;
}
export const hasGround = (k: number) => PHASES[k]?.id === 'tree-3d';
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

/* ---------- 5. Veins: the Journey's network, made round and symmetric ---------- */

const VEIN_R = 24;
/** Eight turns round the centre, each one mirrored: sixteen copies of one branching. */
export const VEIN_FOLD = 8;
type Mandala = { routes: Route[]; reach: number };
let mandalaNet: Mandala | null = null;
/** One branching grown up from the centre, and how far out it reaches. */
export function mandala(): Mandala {
  if (mandalaNet) return mandalaNet;
  const rng = seeded(31);
  const out: Seg[][] = [];
  grow(rng, 0, 0, 0, 0.2, 0.03, 5, 0.32, 0.8, [], out);
  const routes = out.map((c) => resample(sampleChain(c, false)));
  let reach = 0;
  for (const r of routes) {
    for (let i = 0; i < r.count; i++) {
      reach = Math.max(reach, Math.hypot(r.pts[i * 3] as number, r.pts[i * 3 + 1] as number));
    }
  }
  mandalaNet = { routes, reach };
  return mandalaNet;
}

/*
 * Exactly symmetric (2026-11-10: "veins, make it symmetric"): grains go in
 * runs of sixteen, one per copy, and every grain of a run takes its role,
 * branch, place and pulse from the run, so the sixteen copies are the same
 * picture turned and mirrored, pulse for pulse.
 */
const VEIN_COPIES = VEIN_FOLD * 2;
type VeinSeed = { m: number; c: number; a: number; b: number; d: number };
function veinSeed(p: Particle): VeinSeed {
  const run = Math.floor(p.i / VEIN_COPIES);
  return {
    m: p.i % VEIN_COPIES,
    c: hash(run, 81),
    a: hash(run, 78),
    b: hash(run, 79),
    d: hash(run, 80),
  };
}
type VeinRole = 'pulse' | 'tip' | 'ring' | 'vein';
const veinRole = (p: Particle): VeinRole => {
  const { c } = veinSeed(p);
  return c < 0.15 ? 'pulse' : c < 0.22 ? 'tip' : c < 0.3 ? 'ring' : 'vein';
};

/** A shallow bowl facing the eye, so the round net has a little depth. */
const bowl = (x: number, y: number): Vec3 => [x, y, 3 - 0.012 * (x * x + y * y)];

/** Point (x, y) of the branching, placed in the grain's copy: one of eight turns, mirrored or not. */
function inCopy(p: Particle, x: number, y: number, t: number): Vec3 {
  const { m } = veinSeed(p);
  const mx = m & 1 ? -x : x;
  const a = ((m >> 1) / VEIN_FOLD) * TAU + t * 0.03;
  const k = VEIN_R / mandala().reach;
  return bowl((mx * Math.cos(a) - y * Math.sin(a)) * k, (mx * Math.sin(a) + y * Math.cos(a)) * k);
}

function veinsPoint(p: Particle, t: number): Vec3 {
  const role = veinRole(p);
  const { m, a: sa, b: sb, d: sd } = veinSeed(p);
  if (role === 'ring') {
    // The ring too: one arc, repeated round in sixteen.
    const a = ((m + sb) / VEIN_COPIES) * TAU + t * 0.03;
    const R = VEIN_R * 1.06 + (sd - 0.5) * 0.4;
    return bowl(Math.cos(a) * R, Math.sin(a) * R);
  }
  const net = mandala();
  const route = net.routes[Math.floor(sa * net.routes.length)] as Route;
  const len = routeLength(route);
  // Food runs out from the centre to the tips, where a few grains rest and glow.
  const s =
    role === 'tip' ? len : role === 'pulse' ? len * wrap(sb + t * 0.12, 1) : len * sb ** 0.6;
  const [x, y, w] = along(route, s);
  return inCopy(p, x + (sd - 0.5) * w, y, t);
}

/* ---------- 6. Fungi: threads from spores, joined into one net ---------- */

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

/* ---------- 7. Leaf: a midrib, veins forking to the edge, light in, sugar out ---------- */

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

/* ---------- 8. Flower: florets on the golden angle ---------- */

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

/* ---------- 9. Fruit & seed: swells, ripens, falls, opens, a seed sprouts ---------- */

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

/* ---------- 10–11. Avenue and Forest: flying down a road as the trees grow ---------- */

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

/* ---------- 13. Reflection: a still tree and the same tree in the water ---------- */

/*
 * 2026-11-10: "after full tree do reflection, with a tree and a reflection of
 * it on the water with soft ripples below it. Also symmetric, but the lower
 * part moving, without rotation of the upper tree." Grains go in pairs, one
 * in the tree and one in the water, sharing everything but the side, so the
 * reflection is the tree turned over; only it moves, with the ripples.
 */
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
const reflRole = (c: number): ReflRole => (c < 0.1 ? 'water' : c < 0.78 ? 'wood' : 'leaf');
const REFL_K = 0.75;

function reflectionPoint(p: Particle, u: number, t: number): Vec3 {
  const { under, c, a, b, d, run } = reflSeed(p);
  const role = reflRole(c);
  if (role === 'water') {
    // The surface: fine lines of light along the water, drifting gently.
    const x = (a - 0.5) * 120;
    const z = (b - 0.5) * 50;
    return [x + Math.sin(t * 0.3 + z) * 0.4, under ? -0.05 : 0.05, z];
  }
  const routes = tree3d();
  const route = routes[Math.floor(a * routes.length)] as Route3;
  const len = length3(route);
  const grown = 0.05 + 0.95 * smooth(u / 0.42);
  let q: Vec3;
  if (role === 'leaf') {
    const [x, y, z] = along3(route, len * grown);
    const s = fibonacciSphere(run % 157, 157);
    const r = 1.8 * Math.cbrt(b) * smooth((u - 0.3) / 0.2);
    q = [x + s[0] * r, y + s[1] * r * 0.8, z + s[2] * r];
  } else {
    const s = len * grown * wrap(b + sapDir(c < 0.44) * t * 0.04 * (0.7 + 0.6 * d), 1);
    const [x, y, z, w] = along3(route, s);
    q = add([x, y, z], fibonacciSphere(run % 389, 389), w * 0.5 * Math.sqrt(d));
  }
  const x = q[0] * REFL_K;
  const y = (q[1] - GROUND_3D) * REFL_K;
  const z = q[2] * REFL_K;
  if (!under) return [x, y, z];
  // Turned over in the water, swaying more the deeper it goes: soft ripples.
  const deep = smooth(y / 10);
  return [
    x + Math.sin(y * 0.9 - t * 1.3) * 0.7 * deep,
    -y + Math.sin(x * 0.5 + t * 0.9) * 0.25 * deep,
    z,
  ];
}

function reflectionColour(p: Particle, t: number): RGB {
  const { under, c, b, run } = reflSeed(p);
  const tw = 0.7 + 0.3 * Math.sin(t * 1.7 + run * 0.37);
  let rgb: RGB;
  switch (reflRole(c)) {
    case 'water':
      rgb = scale(mix(WATER, SUN, 0.4), 0.16 + 0.22 * Math.sin(t * 1.2 + run) ** 2);
      break;
    case 'leaf':
      rgb = scale(mix(LEAF, SUGAR, 0.35 + 0.4 * b), 0.7 * tw);
      break;
    default:
      rgb = scale(mix(BARK, GOLD, b), 0.68 * tw);
  }
  // The reflection is fainter and a little cooler, glinting as the ripples catch the light.
  if (!under || reflRole(c) === 'water') return rgb;
  const glint = 0.75 + 0.25 * Math.sin(t * 2 + run * 1.3);
  return scale(mix(rgb, WATER, 0.25), 0.5 * glint);
}

/* ---------- 12. Above and below: roots and tree, all gold, about the horizon ---------- */

/*
 * 2026-11-10: "one in vegetal with roots below and tree above, but all
 * golden, with a horizon in the middle, no green". The roots of piece 2 hang
 * from the horizon and the tree of piece 4 stands on it, both grown from the
 * one point where they meet. Water climbs from the root tips to the base, and
 * sap on up the trunk.
 */
const BELOW_K = 0.85;
/*
 * The tree holds still, and a slider turns only the horizon line, from
 * across the picture to running toward the eye like a road (2026-11-10:
 * "stabilise the full tree so it doesn't rotate, with a slider to rotate the
 * road line … it gives me ideas for road perspective for later").
 */
let lineTurn = 0;
/** The horizon line's turn, in degrees: 0 across the picture, 90 toward the eye. */
export function setLineTurn(deg: number) {
  lineTurn = deg;
}
export const hasLineTurn = (k: number) => PHASES[k]?.id === 'full-tree';
type BelowRole = 'horizon' | 'water' | 'root' | 'wood' | 'leaf';
const belowRole = (p: Particle): BelowRole =>
  p.c < 0.07
    ? 'horizon'
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
    // A thin line, brightest and densest at the middle, a faint shimmer along it, turned by the
    // Road slider from across the picture toward the eye.
    const x = (p.b - 0.5) * 2;
    const along = Math.sign(x) * Math.abs(x) ** 1.6 * 70;
    const across = (p.d - 0.5) * 1.2;
    const a = (lineTurn * Math.PI) / 180;
    return [
      along * Math.cos(a) - across * Math.sin(a),
      Math.sin(p.b * 300 + t * 0.4) * 0.06,
      along * Math.sin(a) + across * Math.cos(a),
    ];
  }
  if (role === 'water' || role === 'root') {
    const set = rootSystem();
    const r = Math.floor(p.a * set.routes.length);
    const len = routeLength(set.routes[r] as Route);
    const s =
      role === 'water' ? len * grown * wrap(p.b - t * 0.06, 1) ** 0.55 : len * grown * p.b ** 0.55;
    const pos = onRoot(r, s, role === 'root' ? (p.d - 0.5) * 2 : 0);
    return [pos[0] * BELOW_K, (pos[1] - ROOT_BASE[1]) * BELOW_K, pos[2] * BELOW_K];
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
  switch (k) {
    case 0:
      return cellPoint(p, u, t);
    case 1:
      return rootPoint(p, u, t);
    case 2:
      return flatPoint(p, u, t);
    case 3:
      return tree3Point(p, u, t);
    case 4:
      return veinsPoint(p, t);
    case 5:
      return fungusPoint(p, u, t);
    case 6:
      return leafPoint(p, u, t);
    case 7:
      return flowerPoint(p, u, t);
    case 8:
      return fruitPoint(p, u, t);
    case 11:
      return belowPoint(p, u, t);
    case 12:
      return reflectionPoint(p, u, t);
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
// The fruit and the two roads (8–10) grow as they go and never use theirs.
const FORMED = [0.55, 0.45, 0.45, 0.5, 0, 0.7, 0.45, 0.4, 0, 0, 0, 0.45, 0.45];
const BALL_R = 20;
const isFruit = (k: number) => PHASES[k]?.id === 'fruit';
const runsOn = (k: number) => isFruit(k) || isForest(k);

/** When a grain reaches its place in piece k, 0 (first) to 1 (last): the piece's growing order. */
function order(k: number, p: Particle): number {
  if (k === 0) return cellFar(Math.floor(p.a * CELL_COUNT));
  if (k === 4) return veinSeed(p).b;
  if (k === 12) return reflSeed(p).b;
  if (k === 7 && flowerRole(p) === 'floret') return p.a;
  if (isFruit(k)) return 0.5 * p.b;
  return p.b;
}

/** Piece k's form, held whole until FORMED unless the piece grows as it goes. */
const whole = (k: number, p: Particle, u: number, t: number) =>
  form(k, p, runsOn(k) ? u : Math.max(u, at(FORMED, k)), t);

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

function formColour(k: number, p: Particle, u: number, t: number): RGB {
  const twinkle = 0.7 + 0.3 * Math.sin(t * 1.7 + p.i * 0.37);
  switch (k) {
    case 0:
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
    case 1:
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
    case 2:
      if (isSoil2(p)) return scale(EARTH, 0.35);
      if (isLeaf2(p)) return scale(LEAF, 0.9 * twinkle);
      return p.c < 0.4
        ? scale(mix(GOLD, WATER, 0.35), 0.8 * twinkle)
        : scale(mix(GOLD, SUGAR, 0.4), 0.8 * twinkle);
    case 3:
      switch (tree3Role(p)) {
        case 'soil':
          return groundColour(p);
        case 'leaf':
          return scale(mix(LEAF, [0.85, 0.9, 0.4], p.b), 0.75 * twinkle);
        default:
          return scale(mix(BARK, GOLD, p.d), 0.7 * twinkle);
      }
    case 4: {
      // The twinkle by run too, so every copy shines alike.
      const { b } = veinSeed(p);
      const tw = 0.7 + 0.3 * Math.sin(t * 1.7 + Math.floor(p.i / VEIN_COPIES) * 0.37);
      switch (veinRole(p)) {
        case 'pulse':
          return scale(SUGAR, 1 * tw);
        case 'tip':
          return scale(SUGAR, 1.05);
        case 'ring':
          return scale(GOLD, 0.4 * tw);
        default:
          return scale(mix([0.78, 0.56, 0.3], SUGAR, b), 0.75 * tw);
      }
    }
    case 5:
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
    case 6:
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
    case 7:
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
    case 9:
    case 10:
      return forestColour(k, p, u, t, twinkle);
    case 12:
      return reflectionColour(p, t);
    case 11:
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
  switch (k) {
    case 0: {
      // Slowly round the block of cells.
      const a = 0.5 + u * 1.3;
      return { eye: [Math.sin(a) * 46, 10, Math.cos(a) * 46], target: [0, 0, 0] };
    }
    case 1:
      return { eye: [Math.sin(t * 0.05) * 8, -2, 56], target: [0, 0, 0] };
    case 2:
      return { eye: [Math.sin(t * 0.04) * 3, 0, 64], target: [0, 0, 0] };
    case 3: {
      const a = t * 0.07;
      return { eye: [Math.sin(a) * 58, 2, Math.cos(a) * 58], target: [0, -2, 0] };
    }
    case 4:
      return { eye: [Math.sin(t * 0.04) * 6, 6, 58], target: [0, 0, 0] };
    case 5:
      return { eye: [Math.sin(t * 0.04) * 10, 14, 44], target: [0, SOIL, 0] };
    case 6:
      return { eye: [Math.sin(t * 0.05) * 6, 2, 52], target: [0, 0, 0] };
    case 7: {
      const tilt = smooth((u - 0.4) / 0.5);
      return { eye: lerp3([0, HEAD[1], 44], [18, 14, 36], tilt), target: HEAD };
    }
    case 9:
    case 10: {
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
    case 12:
      // Still, face on and level with the water: the tree does not turn.
      return { eye: [0, 1.5, 78], target: [0, 0, 0] };
    case 11:
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
const pieceFrom = (k: number) => (isForest(k) ? 0 : isFruit(k) ? 0.2 : at(FORMED, k));

/** How long piece k plays on its own before it loops, in seconds. */
export function pieceLength(k: number): number {
  if (isForest(k)) return (2 * LOOP) / SPEED;
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

/** How far through its loop piece k is, `s` seconds in, for the step bar and the words. */
export const pieceProgress = (k: number, s: number) => pieceClock(k, s).f;

/** Position and colour of particle p in piece k on its own, `s` seconds in. */
export function pieceAt(p: Particle, k: number, s: number): { pos: Vec3; rgb: RGB } {
  const { f, u, t } = pieceClock(k, s);
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
  const w = isForest(k) ? 0 : smooth((f - 0.75) / 0.25);
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
