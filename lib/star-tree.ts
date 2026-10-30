/*
 * STAR TREE — a tree drawn by a current of stars, from the roots up through
 * the trunk and out to every branch tip.
 *
 * Asked for 2026-10-28: "music liquid chaos … more sober … then we will use
 * this as base to transform it into a tree. Do a tree in that style as
 * another preset, inspired by that shape, with a soft current of stars that
 * goes from root to the branches."
 *
 * The tree is grown once from a seed, so it is the same tree every time: a
 * trunk that forks, each branch shorter and thinner, bending a little; and a
 * few roots spreading below. Every route a star can take, from a root tip up
 * to a branch tip, is laid out as a list of points a fixed step apart, with
 * the branch's width at each point. A star then only has to walk along its
 * route; spread across the width, the stars fill the trunk and thin out to
 * the twigs, the way sap would.
 *
 * World units: the tree stands from y = -0.9 (roots) to about y = 0.95,
 * centred on x = 0.
 */

export type Route = {
  /** x, y, width for each point along the route, STEP apart. */
  pts: Float32Array;
  /** Number of points. */
  count: number;
};

export const STEP = 0.008;

/** Where the trunk stands: its foot, in world units. */
export const FOOT_Y = -0.62;

type Seg = {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  w0: number;
  w1: number;
};

/** A small seeded generator, so the same seed grows the same tree. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Grows branches from (x, y) at `angle` (radians, 0 = up), returning each tip's chain of segments from the base. */
function grow(
  rng: () => number,
  x: number,
  y: number,
  angle: number,
  len: number,
  width: number,
  depth: number,
  spread: number,
  shrink: number,
  chain: Seg[],
  out: Seg[][],
) {
  const bend = (rng() - 0.5) * 0.5;
  const x1 = x + Math.sin(angle) * len;
  const y1 = y + Math.cos(angle) * len;
  const mid = angle + bend;
  const seg: Seg = {
    x0: x,
    y0: y,
    cx: x + Math.sin(mid) * len * 0.5,
    cy: y + Math.cos(mid) * len * 0.5,
    x1,
    y1,
    w0: width,
    w1: width * 0.7,
  };
  const next = [...chain, seg];
  if (depth <= 0) {
    out.push(next);
    return;
  }
  const forks = depth > 2 && rng() < 0.3 ? 3 : 2;
  for (let i = 0; i < forks; i++) {
    const side = forks === 2 ? (i === 0 ? -1 : 1) : i - 1;
    const a = angle + side * spread * (0.7 + 0.6 * rng()) + (rng() - 0.5) * 0.2;
    grow(
      rng,
      x1,
      y1,
      a,
      len * (shrink + 0.08 * (rng() - 0.5)),
      width * 0.7,
      depth - 1,
      spread * 0.95,
      shrink,
      next,
      out,
    );
  }
}

function sampleChain(chain: Seg[], reverse: boolean): number[] {
  const out: number[] = [];
  const segs = reverse ? [...chain].reverse() : chain;
  for (const s of segs) {
    // Points along a quadratic curve; a fine fixed count is enough, resampled below.
    for (let k = 0; k < 24; k++) {
      let t = k / 24;
      if (reverse) t = 1 - t;
      const u = 1 - t;
      out.push(
        u * u * s.x0 + 2 * u * t * s.cx + t * t * s.x1,
        u * u * s.y0 + 2 * u * t * s.cy + t * t * s.y1,
        s.w0 + (s.w1 - s.w0) * t,
      );
    }
  }
  return out;
}

/** Resamples a polyline (x, y, w triplets) to points STEP apart. */
export function resample(raw: number[]): Route {
  const pts: number[] = [raw[0] ?? 0, raw[1] ?? 0, raw[2] ?? 0];
  let carry = 0;
  for (let i = 3; i + 2 < raw.length; i += 3) {
    const ax = raw[i - 3] as number;
    const ay = raw[i - 2] as number;
    const aw = raw[i - 1] as number;
    const bx = raw[i] as number;
    const by = raw[i + 1] as number;
    const bw = raw[i + 2] as number;
    const len = Math.hypot(bx - ax, by - ay);
    let at = STEP - carry;
    while (at <= len) {
      const t = at / (len || 1);
      pts.push(ax + (bx - ax) * t, ay + (by - ay) * t, aw + (bw - aw) * t);
      at += STEP;
    }
    carry = len - (at - STEP);
  }
  return { pts: Float32Array.from(pts), count: pts.length / 3 };
}

export type StarTree = {
  /** Routes from a root tip to a branch tip. */
  routes: Route[];
  /** Branch tips, for the leaves' glow. */
  tips: [number, number][];
};

/**
 * The tree: `depth` forks above the trunk (more is a fuller crown), roots
 * below. Without roots each route starts at the foot of the trunk, for trees
 * that share one root drawn elsewhere (the life tree, lib/life-tree.ts).
 */
export function buildStarTree(depth: number, seed = 7, roots = true): StarTree {
  const rng = seeded(seed);
  const d = Math.max(3, Math.min(8, Math.round(depth)));
  const branches: Seg[][] = [];
  // The trunk is the first segment; the crown forks from its top.
  grow(rng, 0, FOOT_Y, 0, 0.42, 0.075, d, 0.48, 0.74, [], branches);
  const rootSegs: Seg[][] = [];
  if (roots) {
    for (const a of [-2.25, -2.65, Math.PI, 2.65, 2.25]) {
      grow(rng, 0, FOOT_Y, a + (rng() - 0.5) * 0.2, 0.14, 0.05, 1, 0.35, 0.8, [], rootSegs);
    }
  }
  const routes: Route[] = [];
  for (let i = 0; i < branches.length * (roots ? 2 : 1); i++) {
    const branch = branches[i % branches.length] as Seg[];
    const root = roots ? (rootSegs[Math.floor(rng() * rootSegs.length)] as Seg[]) : [];
    routes.push(resample([...sampleChain(root, true), ...sampleChain(branch, false)]));
  }
  const tips = branches.map((b) => {
    const last = b[b.length - 1] as Seg;
    return [last.x1, last.y1] as [number, number];
  });
  return { routes, tips };
}

/** Where a star `s` world units along a route is, and how wide the branch is there. Past the end, the tip. */
export function along(route: Route, s: number): [number, number, number] {
  const f = Math.max(0, s / STEP);
  const i = Math.min(route.count - 1, Math.floor(f));
  const j = Math.min(route.count - 1, i + 1);
  const t = Math.min(1, f - i);
  const p = route.pts;
  return [
    (p[i * 3] as number) + ((p[j * 3] as number) - (p[i * 3] as number)) * t,
    (p[i * 3 + 1] as number) + ((p[j * 3 + 1] as number) - (p[i * 3 + 1] as number)) * t,
    (p[i * 3 + 2] as number) + ((p[j * 3 + 2] as number) - (p[i * 3 + 2] as number)) * t,
  ];
}

/** A route's length in world units. */
export const routeLength = (route: Route): number => (route.count - 1) * STEP;
