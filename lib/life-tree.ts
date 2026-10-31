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
import { buildStarTree, FOOT_Y, type StarTree } from './star-tree';

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

export function buildLifeTrees(depth = 8): Record<Branch, StarTree> {
  return Object.fromEntries(
    BRANCHES.map((b) => [b, buildStarTree(depth, TREE_SEED[b], false)]),
  ) as Record<Branch, StarTree>;
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
  const s = (f.min * REACH * grow) / TREE_HEIGHT;
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
export function pulse(t: number, period = 3.2): { radius: number; alpha: number; surge: number } {
  const k = (((t % period) + period) % period) / period;
  return { radius: ROOT_RADIUS + k * 0.5, alpha: 0.5 * (1 - k) ** 2, surge: Math.exp(-k * 6) };
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
