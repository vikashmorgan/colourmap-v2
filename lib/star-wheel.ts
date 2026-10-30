/*
 * THE STAR WHEEL — the G menu's wheel drawn in the life tree's language
 * (components/StarWheel.tsx).
 *
 * Martin, 2026-10-30: "the wheel: do it with a similar design as the tree,
 * keeping the overall context circle. And design 2 for it is the wheel as it
 * is now, so I can move from tree to wheel and see an evolution of the same
 * style."
 *
 * So the same centre -- the ball of stars that is you -- and from it a
 * current of stars along a gently bowed spoke to each hub, each hub a small
 * ball of stars of its own, the whole held by a slow outer ring of stars: the
 * context circle. Choosing a hub turns its pages into the spokes.
 *
 * Pure: positions in screen pixels from a frame, as lib/life-tree.ts.
 */

import type { Frame } from './life-tree';

/** The context circle, the hubs' ring and where the names sit, as shares of the smaller side. */
export const RING = 0.43;
export const NODE_RING = 0.3;
export const LABEL_RING = 0.37;

/** How far each spoke bows off straight, in radians at its middle: a branch, not a ruler. */
export const BOW = 0.14;

/** The angle of spoke `i` of `n`: the first at the top, then clockwise. */
export const spokeAngle = (i: number, n: number): number =>
  -Math.PI / 2 + (i / Math.max(n, 1)) * Math.PI * 2;

const polar = (f: Frame, a: number, r: number): [number, number] => [
  f.cx + Math.cos(a) * r,
  f.cy + Math.sin(a) * r,
];

/**
 * A star on a spoke: `t` from the ball (0) to the hub (1), `across` -1..1
 * over the spoke's width, which is widest where it leaves the ball.
 */
export function spokePoint(
  f: Frame,
  angle: number,
  t: number,
  across: number,
  from: number,
): [number, number] {
  const r0 = from;
  const r1 = NODE_RING * f.min;
  const r = r0 + (r1 - r0) * t;
  const a = angle + BOW * Math.sin(Math.PI * t);
  const w = f.min * (0.011 * (1 - t) + 0.0025);
  const [x, y] = polar(f, a, r);
  return [x - Math.sin(a) * across * w, y + Math.cos(a) * across * w];
}

/** Where hub or page `i` of `n` has its ball of stars. */
export const nodePoint = (f: Frame, i: number, n: number): [number, number] =>
  polar(f, spokeAngle(i, n), NODE_RING * f.min);

/** Where its name sits, just beyond its ball. */
export const labelPoint = (f: Frame, i: number, n: number): [number, number] =>
  polar(f, spokeAngle(i, n), LABEL_RING * f.min);
