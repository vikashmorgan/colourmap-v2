/*
 * ADN — the DNA double helix, drawn in stars.
 *
 * Asked for 2026-11-08: "add another as ADN that represents DNA shapes, and
 * dots move through them." Two strands twist round one upright axis, joined
 * by base pairs (rungs), ten to a turn as in B-DNA. The strands sit 0.8 of a
 * half turn apart rather than opposite, which opens the wide and the narrow
 * groove that make the shape read as DNA. Stars run up one strand and down
 * the other (the strands are antiparallel), and across the rungs.
 *
 * World units: the helix stands from y = -HEIGHT to y = HEIGHT, x and z
 * within RADIUS of the axis, z towards the viewer.
 */

export const ADN_HEIGHT = 0.85;
export const ADN_RADIUS = 0.22;
/** How far round the second strand sits from the first: the grooves. */
export const ADN_GROOVE = Math.PI * 0.8;

export type Vec3 = [number, number, number];

/** A point on strand 0 or 1 at u (0 bottom, 1 top), the helix turned by `spin` radians. */
export function helixPoint(u: number, strand: 0 | 1, turns: number, spin: number): Vec3 {
  const a = u * turns * Math.PI * 2 + spin + strand * ADN_GROOVE;
  return [Math.cos(a) * ADN_RADIUS, -ADN_HEIGHT + 2 * ADN_HEIGHT * u, Math.sin(a) * ADN_RADIUS];
}

/** How many base pairs: ten to a turn. */
export const rungCount = (turns: number): number => Math.max(1, Math.round(turns * 10));

/** Where rung k sits up the helix. */
export const rungU = (k: number, turns: number): number => (k + 0.5) / rungCount(turns);

/** A point s of the way (0 to 1) across rung k, from strand 0 to strand 1. */
export function rungPoint(k: number, s: number, turns: number, spin: number): Vec3 {
  const u = rungU(k, turns);
  const a = helixPoint(u, 0, turns, spin);
  const b = helixPoint(u, 1, turns, spin);
  return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
}

/**
 * Onto the screen: tipped back by `tilt` radians so the helix is seen a little
 * from above, with a soft perspective. Returns x, y and how near the point is
 * (0 at the back, 1 at the front), for size and light.
 */
export function project([x, y, z]: Vec3, tilt: number): [number, number, number] {
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const ty = y * c - z * s;
  const tz = y * s + z * c;
  const p = 1 / (1 - tz * 0.35);
  // Near and far round the axis only, so the top and bottom light alike.
  const near = Math.max(0, Math.min(1, (z / ADN_RADIUS + 1) / 2));
  return [x * p, ty * p, near];
}
