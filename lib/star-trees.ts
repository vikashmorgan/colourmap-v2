/*
 * STAR TREES — three more trees for the star current of lib/star-tree.ts.
 *
 * Asked for 2026-11-08: "do 3 more different tree visuals in stars trees."
 * Each is laid out the same way as the Star Tree, as routes a star walks from
 * a root tip up to a tip, so the same drawing carries them; only the shape
 * differs:
 *
 * - Willow: a short trunk opens into arching boughs, and from every bough
 *   long strands hang down like a curtain; the stars climb, then fall.
 * - Sea Wind: a coastal tree bent by years of one wind; the trunk leans, the
 *   crown is flat and streams out to the lee side.
 * - Banyan: a wide, low crown on long level limbs, with aerial roots that
 *   drop straight to the ground; some stars climb into the leaves, others
 *   run back down the hanging roots.
 *
 * Same world units as the Star Tree: roots at FOOT_Y and below, x near 0.
 */

import {
  buildStarTree,
  FOOT_Y,
  grow,
  type Route,
  resample,
  type Seg,
  type StarTree,
  sampleChain,
  seeded,
} from './star-tree';

type Quad = [number, number, number, number, number, number, number, number];

/** A point on a quadratic curve (x0, y0, cx, cy, x1, y1, w0, w1) at t, with its width. */
function at(q: Quad, t: number): [number, number, number] {
  const [x0, y0, cx, cy, x1, y1, w0, w1] = q;
  const u = 1 - t;
  return [
    u * u * x0 + 2 * u * t * cx + t * t * x1,
    u * u * y0 + 2 * u * t * cy + t * t * y1,
    w0 + (w1 - w0) * t,
  ];
}

/** x, y, w triplets along a quadratic curve from t0 to t1. */
function sample(q: Quad, t0 = 0, t1 = 1): number[] {
  const out: number[] = [];
  for (let k = 0; k <= 24; k++) out.push(...at(q, t0 + ((t1 - t0) * k) / 24));
  return out;
}

/** A few short roots spreading below the foot, as on the Star Tree. */
function rootsAt(rng: () => number, x: number, width: number): Seg[][] {
  const roots: Seg[][] = [];
  for (const a of [-2.25, -2.65, Math.PI, 2.65, 2.25]) {
    grow(rng, x, FOOT_Y, a + (rng() - 0.5) * 0.2, 0.14, width, 1, 0.35, 0.8, [], roots);
  }
  return roots;
}

const pick = <T>(rng: () => number, list: T[]): T => list[Math.floor(rng() * list.length)] as T;

/** Willow: `depth` sets how many boughs (and so how full the curtain is). */
export function buildWillow(depth: number, seed = 11): StarTree {
  const rng = seeded(seed);
  const boughs = Math.max(4, Math.min(10, Math.round(depth) + 2));
  const roots = rootsAt(rng, 0, 0.05);
  const topY = -0.12;
  const trunk = sample([0, FOOT_Y, 0.04, (FOOT_Y + topY) / 2, 0, topY, 0.07, 0.05]);
  const routes: Route[] = [];
  const tips: [number, number][] = [];
  for (let b = 0; b < boughs; b++) {
    // Fanned from one side to the other, each bough arching up and out.
    const a = -1.15 + (2.3 * (b + 0.5)) / boughs + (rng() - 0.5) * 0.15;
    const reach = 0.5 + rng() * 0.18;
    const bough: Quad = [
      0,
      topY,
      Math.sin(a) * reach * 0.35,
      topY + 0.5,
      Math.sin(a) * reach * 1.15,
      topY + 0.42 + Math.cos(a) * 0.28,
      0.045,
      0.02,
    ];
    const dir = Math.sign(Math.sin(a)) || 1;
    const strands = 5 + Math.floor(rng() * 3);
    for (let k = 0; k < strands; k++) {
      const t = 0.35 + (0.65 * k) / (strands - 1);
      const [bx, by, bw] = at(bough, t);
      // A strand lifts a little over the bough, then hangs down.
      const endY = Math.max(FOOT_Y - 0.1, by - (0.55 + rng() * 0.5));
      const endX = bx + dir * (0.06 + rng() * 0.08);
      const strand: Quad = [bx, by, bx + dir * 0.1, by + 0.06, endX, endY, bw * 0.6, 0.004];
      routes.push(
        resample([
          ...sampleChain(pick(rng, roots), true),
          ...trunk,
          ...sample(bough, 0, t),
          ...sample(strand),
        ]),
      );
      tips.push([endX, endY]);
    }
  }
  return { routes, tips };
}

/** Where the wind puts a point of an upright tree: the higher, the further to the lee side. */
export function leeward(x: number, y: number): [number, number] {
  // The roots stay where they grew; only what stands above the foot is bent.
  if (y <= FOOT_Y) return [x - 0.42, y];
  const h = y - FOOT_Y;
  // The windward side is pressed in close; everything streams out to the right.
  const sx = x < 0 ? x * 0.45 : x * 1.05;
  return [sx + 0.42 * h ** 1.6 - 0.42, FOOT_Y + h * 0.7];
}

/** Sea Wind: the Star Tree grown, then bent by the wind (`depth` forks in the crown). */
export function buildWindTree(depth: number, seed = 5): StarTree {
  const upright = buildStarTree(depth, seed);
  const routes = upright.routes.map((r) => {
    const raw: number[] = [];
    for (let i = 0; i < r.count; i++) {
      const [x, y] = leeward(r.pts[i * 3] as number, r.pts[i * 3 + 1] as number);
      raw.push(x, y, r.pts[i * 3 + 2] as number);
    }
    return resample(raw);
  });
  return { routes, tips: upright.tips.map(([x, y]) => leeward(x, y)) };
}

/** Banyan: `depth` sets how many level limbs carry the crown and its hanging roots. */
export function buildBanyan(depth: number, seed = 3): StarTree {
  const rng = seeded(seed);
  const limbs = Math.max(4, Math.min(9, Math.round(depth) + 1));
  const roots = rootsAt(rng, 0, 0.06);
  const topY = -0.3;
  const trunk = sample([0, FOOT_Y, -0.03, (FOOT_Y + topY) / 2, 0, topY, 0.11, 0.09]);
  const pairs = Math.ceil(limbs / 2);
  const routes: Route[] = [];
  const tips: [number, number][] = [];
  const add = (raw: number[], tip: [number, number]) => {
    routes.push(resample([...sampleChain(pick(rng, roots), true), ...trunk, ...raw]));
    tips.push(tip);
  };
  for (let l = 0; l < limbs; l++) {
    const side = l % 2 === 0 ? 1 : -1;
    const rank = Math.floor(l / 2);
    const reach = (0.4 + (0.35 * (rank + 1)) / pairs) * (0.85 + 0.15 * rng());
    // Each limb rises a little off the trunk, then runs out nearly level.
    const limb: Quad = [
      0,
      topY,
      side * reach * 0.45,
      topY + 0.08 + 0.12 * rng(),
      side * reach,
      topY + 0.22 + 0.12 * rng() - rank * 0.03,
      0.06,
      0.02,
    ];
    // Aerial roots: from points along the limb straight down to the ground.
    for (const t of [0.45, 0.72, 0.97]) {
      if (rng() < 0.25) continue;
      const [px, py] = at(limb, t);
      const g = FOOT_Y - 0.02 - rng() * 0.06;
      const endX = px + (rng() - 0.5) * 0.04;
      const drop: Quad = [px, py, px + (rng() - 0.5) * 0.03, (py + g) / 2, endX, g, 0.008, 0.02];
      // Twice, so the hanging roots carry as many stars as a tuft of the crown.
      const route = [...sample(limb, 0, t), ...sample(drop)];
      add(route, [endX, g]);
      add(route, [endX, g]);
    }
    // The crown: low tufts of twigs rising all along the limb, a wide flat canopy.
    for (const t of [0.4, 0.65, 0.85, 1]) {
      const [px, py, pw] = at(limb, t);
      const tufts: Seg[][] = [];
      grow(rng, px, py, (rng() - 0.5) * 0.5, 0.1, pw * 0.8, 3, 0.7, 0.75, [], tufts);
      for (const chain of tufts) {
        const last = chain[chain.length - 1] as Seg;
        add([...sample(limb, 0, t), ...sampleChain(chain, false)], [last.x1, last.y1]);
      }
    }
  }
  return { routes, tips };
}

/** The three trees of the Star Trees preset, in the order of its Tree slider. */
export const STAR_TREE_SHAPES = ['willow', 'seawind', 'banyan'] as const;

export function buildStarTreeShape(shape: number, depth: number): StarTree {
  const s = Math.max(0, Math.min(2, Math.round(shape)));
  return s === 0 ? buildWillow(depth) : s === 1 ? buildWindTree(depth) : buildBanyan(depth);
}
