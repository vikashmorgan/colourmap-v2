/*
 * THE LIFE TREE — the G menu as three trees from one root.
 *
 * Martin, 2026-10-30: "build it on brain when I press G as organising visual
 * language. For now all in one colour. With pulse from center and three trees
 * moving from the center root as my life tree orga stuff."
 *
 * The three trees are the three branches of lib/branches.ts -- Art, Admin,
 * Energy -- and the root they share is the centre: you, how you are today,
 * which that file insists is never a branch. So the figure says the same
 * thing the data does: one root, three ways out of it. Each tree is a Star
 * Tree (lib/star-tree.ts) without its own roots, turned to face away from
 * the centre, and a current of stars runs from the root out to every tip.
 *
 * Pure: no DOM. Positions are in screen pixels from a centre and a size.
 */

import { BRANCHES, type Branch } from './branches';
import {
  buildStarTree,
  FOOT_Y,
  type Route,
  resample,
  STEP,
  type StarTree,
  seeded,
} from './star-tree';
import { buildBanyan, buildWillow } from './star-trees';

/** Which way each tree grows, in screen radians (y down): Art up, Admin lower right, Energy lower left. */
export const TREE_ANGLE: Record<Branch, number> = {
  art: -Math.PI / 2,
  admin: Math.PI / 6,
  energy: (5 * Math.PI) / 6,
};

/** A different seed each, so the three are siblings, not copies. */
const TREE_SEED: Record<Branch, number> = { art: 7, admin: 11, energy: 23 };

/** How far a crown reaches from the centre, as a share of the smaller screen side. */
export const REACH = 0.36;

/** Tree height in world units, foot to the top of the crown. */
const TREE_HEIGHT = 1.55;

/** The empty ring the trunks start from, as a share of the smaller side: the root. */
export const ROOT_RADIUS = 0.035;

/*
 * THREE LOOKS (2026-11-08): "add designs 1 2 3 which would be modifications
 * on the tree ... inspired by new designs on the tree". The Star Trees of Art
 * (lib/star-trees.ts) lend two: II a willow, its strands hanging in a curtain,
 * III a banyan, low and wide, its aerial roots dropping back down. Rootless,
 * since the three share the one root at the centre.
 *
 * FOUR LOOKS (2026-11-10): "in the grid tree add a second design 2 so old 2
 * become 3 and then 3 becomes 4. that is to make it a 3d tree inspired by the
 * 3d tree in journey but with the three trees in one connected at the center.
 * and pulsing outwards. art admin energy". So II is now a tree grown in 3D
 * (buildTree3d below), III the willow, IV the banyan.
 */
export type TreeLook = 1 | 2 | 3 | 4;

/*
 * THE 3D TREE (2026-11-10). Grown the way Vegetal's 3D tree is
 * (lib/vegetal.ts, grow3): four limbs off the trunk, then twos and threes,
 * each fork leaning out round its own branch's axis and turning on by the
 * golden angle, so the crown fills all round instead of lying in one plane.
 * Written again here, small, so the G menu does not load the Art pieces.
 *
 * In the tree's own frame: x across, y along the trunk from FOOT_Y, z out of
 * the page toward you. Each of Art, Admin and Energy is one limb of it, grown
 * from the shared root along its usual angle, so together they are one tree
 * with its root at the centre.
 */
type V3 = [number, number, number];
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TAU = Math.PI * 2;
const norm3 = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross3 = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const add3 = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

function grow3(
  rng: () => number,
  o: V3,
  dir: V3,
  len: number,
  width: number,
  depth: number,
  turn: number,
  chain: number[],
  out: number[][],
) {
  const e1 = norm3(cross3(dir, Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const e2 = cross3(dir, e1);
  const end = add3(o, dir, len);
  // A slight bend, so no branch is a ruler.
  const ba = rng() * TAU;
  const bend = add3(
    add3(o, dir, len * 0.5),
    add3([e1[0] * Math.cos(ba), e1[1] * Math.cos(ba), e1[2] * Math.cos(ba)], e2, Math.sin(ba)),
    len * 0.12,
  );
  const next = chain.slice();
  for (let k = 0; k < 12; k++) {
    const f = k / 12;
    const g = 1 - f;
    for (let m = 0; m < 3; m++)
      next.push(
        g * g * (o[m] as number) + 2 * g * f * (bend[m] as number) + f * f * (end[m] as number),
      );
    next.push(width + (width * 0.7 - width) * f);
  }
  if (depth <= 0) {
    next.push(end[0], end[1], end[2], width * 0.7);
    out.push(next);
    return;
  }
  const forks = chain.length === 0 ? 4 : depth > 2 && rng() < 0.3 ? 3 : 2;
  for (let i = 0; i < forks; i++) {
    const a = turn + (i * TAU) / forks + (rng() - 0.5) * 0.4;
    const tilt = 0.38 + 0.25 * rng();
    const side = add3(
      [e1[0] * Math.cos(a), e1[1] * Math.cos(a), e1[2] * Math.cos(a)],
      e2,
      Math.sin(a),
    );
    const lean = add3(
      [dir[0] * Math.cos(tilt), dir[1] * Math.cos(tilt), dir[2] * Math.cos(tilt)],
      side,
      Math.sin(tilt),
    );
    // Leaning on along the trunk, as Vegetal's leans up toward the light.
    const nd = norm3(add3(lean, [0, 0.22, 0]));
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

/** Resamples a polyline of x, y, z, width to points STEP apart in 3D: the route's depth goes in `z`. */
function resample3(raw: number[]): Route {
  const pts: number[] = [raw[0] ?? 0, raw[1] ?? 0, raw[3] ?? 0];
  const zs: number[] = [raw[2] ?? 0];
  let carry = 0;
  for (let i = 4; i + 3 < raw.length; i += 4) {
    const ax = raw[i - 4] as number;
    const ay = raw[i - 3] as number;
    const az = raw[i - 2] as number;
    const aw = raw[i - 1] as number;
    const bx = raw[i] as number;
    const by = raw[i + 1] as number;
    const bz = raw[i + 2] as number;
    const bw = raw[i + 3] as number;
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    let at = STEP - carry;
    while (at <= len) {
      const t = at / (len || 1);
      pts.push(ax + (bx - ax) * t, ay + (by - ay) * t, aw + (bw - aw) * t);
      zs.push(az + (bz - az) * t);
      at += STEP;
    }
    carry = len - (at - STEP);
  }
  return { pts: Float32Array.from(pts), count: pts.length / 3, z: Float32Array.from(zs) };
}

/** How far a 3D tree reaches from its foot, in world units: as far as the flat looks reach. */
const REACH_3D = 1.5;

/** One limb of the 3D tree, rootless, its farthest tip REACH_3D from the foot. */
export function buildTree3d(depth = 8, seed = 7): StarTree {
  const rng = seeded(seed);
  const d = Math.max(3, Math.min(8, Math.round(depth)));
  const raw: number[][] = [];
  // Two levels fewer than the flat tree: four limbs off the trunk already make it as full.
  grow3(rng, [0, 0, 0], [0, 1, 0], 1, 0.16, d - 2, rng() * TAU, [], raw);
  let far = 0;
  for (const c of raw)
    for (let i = 0; i + 3 < c.length; i += 4)
      far = Math.max(far, Math.hypot(c[i] as number, c[i + 1] as number, c[i + 2] as number));
  const k = REACH_3D / (far || 1);
  const routes = raw.map((c) => resample3(c.map((v, i) => (i % 4 === 1 ? FOOT_Y + v * k : v * k))));
  const tips = raw.map((c) => {
    const n = c.length;
    return [(c[n - 4] as number) * k, FOOT_Y + (c[n - 3] as number) * k] as [number, number];
  });
  return { routes, tips };
}

/** How far a route stands out of the page `s` world units along it; 0 on a flat tree. */
export function depthAlong(route: Route, s: number): number {
  const z = route.z;
  if (!z) return 0;
  const f = Math.max(0, s / STEP);
  const i = Math.min(route.count - 1, Math.floor(f));
  const j = Math.min(route.count - 1, i + 1);
  const t = Math.min(1, f - i);
  return (z[i] as number) + ((z[j] as number) - (z[i] as number)) * t;
}

/** A tree `k` times larger about its foot, its routes resampled to the same star spacing. */
function enlarged(tree: StarTree, k: number): StarTree {
  const at = (x: number, y: number): [number, number] => [x * k, FOOT_Y + (y - FOOT_Y) * k];
  return {
    routes: tree.routes.map((r) => {
      const raw: number[] = [];
      for (let i = 0; i < r.count; i++) {
        const [x, y] = at(r.pts[i * 3] as number, r.pts[i * 3 + 1] as number);
        raw.push(x, y, (r.pts[i * 3 + 2] as number) * k);
      }
      return resample(raw);
    }),
    tips: tree.tips.map(([x, y]) => at(x, y)),
  };
}

export function buildLifeTrees(depth = 8, look: TreeLook = 1): Record<Branch, StarTree> {
  const build = (b: Branch): StarTree =>
    look === 2
      ? buildTree3d(depth, TREE_SEED[b])
      : look === 3
        ? buildWillow(depth, TREE_SEED[b], { roots: false })
        : look === 4
          ? // Low and wide, it is grown a third larger so its crown reaches as far as the others.
            enlarged(buildBanyan(depth, TREE_SEED[b], { roots: false }), 1.35)
          : buildStarTree(depth, TREE_SEED[b], false);
  return Object.fromEntries(BRANCHES.map((b) => [b, build(b)])) as Record<Branch, StarTree>;
}

export type Frame = { cx: number; cy: number; min: number };

/*
 * ONE GOLD, THREE TINTS (2026-10-31). At the top all three trees are the
 * same gold. Opened, a tree leans to its own tint, so where you are reads at
 * a glance: Art an ember, Admin parchment, Energy a green gold. Never blue.
 */
export const GOLD_RGB: [number, number, number] = [196, 160, 96];

export const BRANCH_RGB: Record<Branch, [number, number, number]> = {
  art: [222, 142, 92],
  admin: [204, 188, 150],
  energy: [176, 182, 92],
};

/** Gold leaning `t` (0..1) of the way to a branch's tint. */
export function tint(branch: Branch, t: number): [number, number, number] {
  const to = BRANCH_RGB[branch];
  const k = Math.max(0, Math.min(1, t));
  return [0, 1, 2].map((i) =>
    Math.round((GOLD_RGB[i] as number) + ((to[i] as number) - (GOLD_RGB[i] as number)) * k),
  ) as [number, number, number];
}

/*
 * HOW THE FIGURE STANDS. At the top all three trees are the same size and
 * full. Stood in one, that tree evolves: it grows half as large again and the
 * root slides away from it so it has the room, while the other two shrink
 * back, still there -- turned away from, not gone (lib/branches.ts).
 */
export type View = { grow: Record<Branch, number>; shiftX: number; shiftY: number };

export const GROWN = 1.5;
export const SHRUNK = 0.55;

export function viewFor(lit: Branch | null, grown = GROWN): View {
  if (!lit) return { grow: { art: 1, admin: 1, energy: 1 }, shiftX: 0, shiftY: 0 };
  const a = TREE_ANGLE[lit];
  const grow = { art: SHRUNK, admin: SHRUNK, energy: SHRUNK };
  grow[lit] = grown;
  return { grow, shiftX: -Math.cos(a) * 0.3, shiftY: -Math.sin(a) * 0.3 };
}

/** The frame with the view's slide applied. */
export const shifted = (f: Frame, v: View): Frame => ({
  cx: f.cx + v.shiftX * f.min,
  cy: f.cy + v.shiftY * f.min,
  min: f.min,
});

/** Screen pixels per world unit of a tree grown `grow` times. */
export const treeScale = (f: Frame, grow = 1): number => (f.min * REACH * grow) / TREE_HEIGHT;

/**
 * A point of a tree in world units (x across, y up from FOOT_Y) to the screen:
 * the trunk leaves the root ring along the tree's angle, the crown opens
 * either side of it.
 */
export function treeToScreen(
  branch: Branch,
  x: number,
  y: number,
  f: Frame,
  grow = 1,
): [number, number] {
  const a = TREE_ANGLE[branch];
  const s = treeScale(f, grow);
  const along = (y - FOOT_Y) * s + f.min * ROOT_RADIUS;
  const across = x * s;
  return [
    f.cx + Math.cos(a) * along - Math.sin(a) * across,
    f.cy + Math.sin(a) * along + Math.cos(a) * across,
  ];
}

/** Where a tree's name sits: just beyond its crown. */
export function crownPoint(branch: Branch, f: Frame): [number, number] {
  const a = TREE_ANGLE[branch];
  const r = f.min * (REACH + ROOT_RADIUS + 0.07);
  return [f.cx + Math.cos(a) * r, f.cy + Math.sin(a) * r];
}

/** Where item `i` of `n` sits round the root, between the trunks, starting at the top. */
export function rootPoint(i: number, n: number, f: Frame): [number, number] {
  const a = Math.PI / 2 + (i / Math.max(n, 1)) * Math.PI * 2;
  const r = f.min * 0.2;
  return [f.cx + Math.cos(a) * r, f.cy + Math.sin(a) * r];
}

/**
 * The pulse from the root: a ring every `period` seconds, its radius (share
 * of the smaller side) and how bright it still is. Also how much the current
 * surges as the ring leaves, 0..1.
 */
export function pulse(
  t: number,
  period = 3.2,
): { radius: number; alpha: number; surge: number; breath: number; phase: number } {
  const k = (((t % period) + period) % period) / period;
  return {
    // How far through the beat, 0 to 1: how far out the 3D tree's wave has gone.
    phase: k,
    radius: ROOT_RADIUS + k * 0.5,
    alpha: 0.5 * (1 - k) ** 2,
    surge: Math.exp(-k * 6),
    // The same beat as a smooth swell, 0 to 1 and back, with no step anywhere in it.
    breath: 0.5 - 0.5 * Math.cos(2 * Math.PI * k),
  };
}

/*
 * PULSING OUTWARDS (2026-11-10). On the 3D tree each beat is a wave of light
 * running from the root out to every tip at once: brightest a share `phase`
 * of the way along each route. It rises from nothing at the root and fades to
 * nothing at the tips, so when the next beat starts there is no jump.
 */
export function outwardWave(u: number, phase: number): number {
  const d = (u - phase) / 0.12;
  return Math.sin(Math.PI * Math.max(0, Math.min(1, phase))) * Math.exp(-d * d);
}

/*
 * THE TURN (2026-11-10). The 3D tree sways slowly round the upright axis
 * through the root, a little each way, never far enough to fold Admin or
 * Energy flat; and it leans its top a touch toward you, so its depth shows
 * even when still. Nearer stars draw larger and brighter, farther ones smaller
 * and dimmer. With reduced motion it stands in a fixed three-quarter view.
 */
export const TURN_PERIOD = 40;
const TURN_SWAY = 0.45;
const TURN_STILL = 0.35;
export const TURN_PITCH = 0.22;
/** How far the eye stands from the root, as a share of the smaller side: the perspective. */
const EYE = 2.4;

export function figureYaw(t: number, still = false): number {
  return still ? TURN_STILL : TURN_SWAY * Math.sin((TAU * t) / TURN_PERIOD);
}

/** One frame's turn, kept and refilled so drawing makes nothing new per star. */
export type Turn = { cy: number; sy: number; cp: number; sp: number; eye: number };

export const makeTurn = (): Turn => ({ cy: 1, sy: 0, cp: 1, sp: 0, eye: 1 });

export function setTurn(turn: Turn, yaw: number, pitch: number, min: number): void {
  turn.cy = Math.cos(yaw);
  turn.sy = Math.sin(yaw);
  turn.cp = Math.cos(pitch);
  turn.sp = Math.sin(pitch);
  turn.eye = min * EYE;
}

/**
 * A point (dx, dy) from the root on screen, standing dz out of it, turned and
 * seen in perspective: writes its new dx, dy, and how much nearer it came
 * (1 at the root's depth, more when nearer), into `out`.
 */
export function project3(out: Float32Array, dx: number, dy: number, dz: number, t: Turn): void {
  const x1 = dx * t.cy + dz * t.sy;
  const z1 = -dx * t.sy + dz * t.cy;
  // Seen a little from above: the top comes toward you, the near side drops.
  const y2 = dy * t.cp + z1 * t.sp;
  const z2 = -dy * t.sp + z1 * t.cp;
  const k = t.eye / Math.max(t.eye * 0.2, t.eye - z2);
  out[0] = x1 * k;
  out[1] = y2 * k;
  out[2] = k;
}

/** A page's name from its address, for routes the Grid does not list. */
export function routeLabel(href: string): string {
  const last = href.split('/').filter(Boolean).pop() ?? href;
  const words = last.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/*
 * SWITCHING DESIGNS (2026-10-30): "a disintegration of the light currents and
 * tree when you do the switch: it disintegrates and rebuilds in 2 seconds".
 * The stars fly apart for the first second and stream back for the second;
 * the new design's names arrive at the turn.
 */
export const SWITCH_SECONDS = 2;

/** How far apart the stars are, 0 (a tree) to 1 (fully scattered), `t` seconds into a switch. */
export function scatter(t: number): number {
  if (t <= 0 || t >= SWITCH_SECONDS) return 0;
  const half = SWITCH_SECONDS / 2;
  const k = t < half ? t / half : (SWITCH_SECONDS - t) / half;
  return k * k * (3 - 2 * k);
}
