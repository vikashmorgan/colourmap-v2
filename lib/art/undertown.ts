/**
 * Undertown (2026-11-23: "for chinatown make racetrack two sided and at the edge there is a cool
 * twist edge that makes it flip and u race the other way from under as if u were on the other side
 * of the racetrack. mirrored. and it is a different decor. with chinatown but called the undertown
 * with undertown letters when u ride there"). Pure: no three.js, no DOM.
 *
 * Every UNDER.EVERY metres on Chinatown Run the road's left edge curls up and over: the road rolls
 * half a turn about an axis UNDER.AXIS m over it, and you are on its underside, upside down,
 * mirrored (what was on your left is on your right), the street and its shophouses hanging over
 * your head. You stay glued to the road: as on a twist, the physics drives a flat road and only
 * what is drawn turns (lib/art/track.ts `twistPose`), so the camera rolls with you. After HOLD m
 * the roll carries on the same way, the other half turn, and you are back on top.
 *
 * Unlike a twist, Undertown keeps its barriers (nobody falls off it into the stars) and has no
 * straight road through its hollow: everyone goes under.
 */

export const UNDER = {
  /** Where the first starts (m along Chinatown Run), and how often one comes round: 1.3 km of
   * street first, then one every 3.6 km (2026-11-24, the longer street; were 700 and 2,400). */
  AT: 1300,
  EVERY: 3600,
  /** The flip over the edge, in and again out (m), and the stretch upside down between. */
  FLIP: 180,
  HOLD: 620,
  /** The axis the road rolls about, this high over it (m): upside down the road runs twice this
   * over the street, above the shophouses under it (kept under 21 m there,
   * lib/art/chinatown-street.ts) with room for Undertown's own beneath. */
  AXIS: 18,
  /** The barriers close in to the ribbon's edge over this much at each end (m). */
  EASE: 40,
  /** How far past the road's edge the barrier stands on the ribbon (m). */
  EDGE: 0.4,
} as const;

/** One Undertown run, flip in to flip out (m). */
export const UNDER_LENGTH = UNDER.FLIP * 2 + UNDER.HOLD;

/** Metres from the start of the Undertown run s is in, or null outside every one. */
export function underLocal(s: number): number | null {
  if (!(s >= UNDER.AT)) return null;
  const x = (s - UNDER.AT) % UNDER.EVERY;
  return x < UNDER_LENGTH ? x : null;
}

/** Where the Undertown run s is in starts and ends, or null outside. */
export function underSpan(s: number): { from: number; to: number } | null {
  const x = underLocal(s);
  if (x === null) return null;
  return { from: s - x, to: s - x + UNDER_LENGTH };
}

const smoother = (x: number) => x * x * x * (x * (6 * x - 15) + 10);

/**
 * How far the road has rolled here (rad), as TrackDef.twist: easing 0 → π over the flip in, π all
 * the way along the underside, π → 2π over the flip out (the same way round, so you come up on the
 * side you went down). 0 outside.
 */
export function underTwist(s: number): number {
  const x = underLocal(s);
  if (x === null || x <= 0) return 0;
  const { FLIP, HOLD } = UNDER;
  if (x < FLIP) return Math.PI * smoother(x / FLIP);
  if (x < FLIP + HOLD) return Math.PI;
  return Math.PI * (1 + smoother((x - FLIP - HOLD) / FLIP));
}

/** How upside down you are: 0 on top, 1 on the underside (eased through the flips). */
export function underDepth(s: number): number {
  return (1 - Math.cos(underTwist(s))) / 2;
}

/** Whether s is in Undertown proper: past halfway through the flip in, before halfway out. */
export function inUndertown(s: number): boolean {
  return underDepth(s) > 0.5;
}

/** Whether s is on the flat underside (between the flips), where Undertown's own pieces stand. */
export function onUnderside(s: number): boolean {
  const x = underLocal(s);
  return x !== null && x >= UNDER.FLIP && x < UNDER.FLIP + UNDER.HOLD;
}

/**
 * Where the barrier stands across the road at s (positive), given where it stands elsewhere: on
 * the ribbon it closes in to the road's edge so you are never drawn hanging off it, easing in and
 * out over UNDER.EASE m so nobody is shoved.
 */
export function underWall(s: number, normal: number, half: number): number {
  const x = underLocal(s);
  if (x === null) return normal;
  const a = Math.min(x / UNDER.EASE, (UNDER_LENGTH - x) / UNDER.EASE, 1);
  const k = a * a * (3 - 2 * a);
  return normal + (half + UNDER.EDGE - normal) * k;
}

/** Undertown's colours (linear): its asphalt plum, its edges crimson, its lights violet and red. */
export const UNDER_COLOURS = {
  asphalt: [0.05, 0.01, 0.06] as [number, number, number],
  edge: [0.14, 0.012, 0.035] as [number, number, number],
  violet: [0.62, 0.22, 1] as [number, number, number],
  crimson: [1, 0.08, 0.2] as [number, number, number],
};

/**
 * The road's colour on Undertown's side: drawn toward plum in the middle and crimson at the edges
 * (`across` is u over the half-width, -1..1), by k (0 none, 1 Undertown's own).
 */
export function underTint(
  c: readonly [number, number, number],
  across: number,
  k: number,
): [number, number, number] {
  const e = Math.min(1, Math.abs(across)) ** 4;
  const { asphalt, edge } = UNDER_COLOURS;
  const out: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const want = asphalt[i] + (edge[i] - asphalt[i]) * e;
    out[i] = c[i] + (want - c[i]) * Math.max(0, Math.min(1, k));
  }
  return out;
}
