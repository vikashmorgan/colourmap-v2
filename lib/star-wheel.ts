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

/*
 * TWIGS ON THE HUBS (2026-10-31): the wheel in the opened tree's language.
 * Each hub's ball grows one short twig per page inside it, fanned outward
 * round its name, so the wheel says how full each hub is before it opens.
 */
export const TWIG_LENGTH = 0.055;
export const TWIG_FAN = 0.7;

/** The heading of twig `k` of `m` off a hub at spoke angle `angle`. */
export const twigAngle = (angle: number, k: number, m: number): number =>
  m <= 1 ? angle : angle + (k / (m - 1) - 0.5) * 2 * TWIG_FAN;

/** A star `t` (0 at the hub's ball, 1 at the tip) along twig `k` of `m`, curling a little outward. */
export function twigPoint(
  f: Frame,
  angle: number,
  k: number,
  m: number,
  t: number,
): [number, number] {
  const [x0, y0] = polar(f, angle, NODE_RING * f.min);
  const head = twigAngle(angle, k, m);
  // Leaves the ball across, ends turned toward straight out: a twig, not a ray.
  const a = head + (angle - head) * 0.35 * t;
  const r = TWIG_LENGTH * f.min * t;
  return [x0 + Math.cos(a) * r, y0 + Math.sin(a) * r];
}

/*
 * TWO SIDES OF THE BRAIN (2026-11-08): "make the wheel divided into two
 * sides, with the left and right side brain." At the top level the hubs
 * split into two halves either side of a seam of stars. Which hub goes
 * where is the user's own call (2026-11-08): "art, body, sound left; learn,
 * mind right". You, not placed, sits with Learn and Mind, three a side.
 * Clockwise from the top: the right half going down, then the left half
 * coming back up. Inside a hub, its pages take the whole ring as before.
 */
export type Side = 'left' | 'right';

export const BRAIN: Record<string, Side> = {
  studio: 'left',
  body: 'left',
  sound: 'left',
  learn: 'right',
  mind: 'right',
  you: 'right',
  engine: 'right',
  play: 'right',
};

/** Hubs the wheel leaves out for now (2026-11-08: "engine room not needed right now in the wheel, and play is also not necessary"). They stay in the tree, the terminal and the Grid map. */
export const WHEEL_HIDDEN = new Set(['engine', 'play']);

/** Pages the wheel leaves out of a hub (2026-11-08: "circles and sparks and AI not necessary in mind"). */
export const WHEEL_HIDDEN_PAGES = new Set(['/ai', '/sparks', '/circles']);

/** The empty band either side of the seam, at the top and the bottom, in radians. */
export const SEAM_GAP = 0.22;

/** The hubs in wheel order: the right half top to bottom, then the left half bottom to top. */
export function brainOrder<T extends { id: string }>(hubs: T[]): T[] {
  const shown = hubs.filter((h) => !WHEEL_HIDDEN.has(h.id));
  const right = shown.filter((h) => BRAIN[h.id] !== 'left');
  const left = shown.filter((h) => BRAIN[h.id] === 'left').reverse();
  return [...right, ...left];
}

/** The angle of each spoke in that order: `right` spokes down the right half, `left` up the left. */
export function brainAngles(right: number, left: number): number[] {
  const span = Math.PI - 2 * SEAM_GAP;
  const top = -Math.PI / 2;
  return [
    ...Array.from({ length: right }, (_, j) => top + SEAM_GAP + ((j + 0.5) / right) * span),
    ...Array.from({ length: left }, (_, j) => Math.PI / 2 + SEAM_GAP + ((j + 0.5) / left) * span),
  ];
}

/** A point at `angle`, `share` of the smaller side out from the centre. */
export const pointAt = (f: Frame, angle: number, share: number): [number, number] =>
  polar(f, angle, share * f.min);

/*
 * FROM TREE TO WHEEL (2026-11-08): "when I move to wheel, the dots from the
 * tree transform into that circle of stars and then into the wheel." The
 * tree's stars gather onto the context circle, then the wheel forms out of
 * that circle: its currents start on the ring and settle onto their spokes.
 */
export const GATHER_SECONDS = 1;
export const FORM_SECONDS = 1.3;

/** Eased progress, 0 to 1, `t` seconds into a stage of `length` seconds. */
export const stage = (t: number, length: number): number => {
  const k = Math.min(1, Math.max(0, t / length));
  return k * k * (3 - 2 * k);
};
