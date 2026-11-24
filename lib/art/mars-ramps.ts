/**
 * Drive, Mars: the things to jump off and drive on (docs/specs/drive-game.md, world 8, "Ramps and
 * decks"). Pure: where they stand and their height at any point, added to the ground the physics
 * drives (lib/art/mars.ts marsHeight).
 *
 * 2026-11-23: "design it so u can jump onto space stations or high pipeline tracks. or use factory
 * elements to jump high into the sky".
 *
 * - Kickers: rust launch ramps, by each factory pointing away from it (two each), and a few on
 *   the Landing Plain. They rise steeper toward the lip and stop: off the lip you fly.
 * - Decks: a flat rust track laid on top of each pipeline run, a ramp up at each end, its sides
 *   sloping down like a berm, so you can ride the pipelines high above the dunes.
 */

export interface Kicker {
  x: number;
  y: number;
  /** The way up it (rad), its length, its height at the lip and its width (m). */
  h: number;
  len: number;
  height: number;
  width: number;
  /** A natural slab of rock rather than a rust ramp (drawn in rock; the same shape). */
  rock?: boolean;
  /** An iron conveyor gallery or roof ramp in the factory city (drawn in iron; the same shape). */
  gallery?: boolean;
}

export interface Deck {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** Its top's height above the ground (m), its flat width, and the ramps' length at each end. */
  height: number;
  width: number;
  ramp: number;
}

export const KICKER = { len: 26, height: 7, width: 9, back: 5 };
/** The rock slabs round the canyons: shorter, lower, wider than the rust kickers. */
export const SLAB = { len: 22, height: 5, width: 11 };
export const DECK = { height: 7, width: 6, ramp: 40, berm: 5 };

/** How high a kicker is at a point (0 off it). The face rises as (u/len)^1.4 to the lip; behind
 * the lip the back falls away over a few metres. */
export function kickerHeight(k: Kicker, x: number, y: number): number {
  const dx = x - k.x;
  const dy = y - k.y;
  const c = Math.cos(k.h);
  const s = Math.sin(k.h);
  const u = dx * c + dy * s;
  const v = Math.abs(-dx * s + dy * c);
  if (u < 0 || u > k.len + KICKER.back || v > k.width / 2 + 1) return 0;
  const side = v <= k.width / 2 ? 1 : 1 - (v - k.width / 2);
  const along = u <= k.len ? (u / k.len) ** 1.4 : Math.max(0, 1 - (u - k.len) / KICKER.back);
  return k.height * along * side;
}

/** How high a deck is at a point (0 off it): ramps at the ends, the flat top, sloping sides. */
export function deckHeight(d: Deck, x: number, y: number): number {
  const ex = d.bx - d.ax;
  const ey = d.by - d.ay;
  const L = Math.hypot(ex, ey);
  if (L < 1) return 0;
  const u = ((x - d.ax) * ex + (y - d.ay) * ey) / L;
  if (u < 0 || u > L) return 0;
  const v = Math.abs((-(x - d.ax) * ey + (y - d.ay) * ex) / L);
  const reach = d.width / 2 + DECK.berm;
  if (v > reach) return 0;
  const side = v <= d.width / 2 ? 1 : 1 - (v - d.width / 2) / DECK.berm;
  const along = Math.min(1, u / d.ramp, (L - u) / d.ramp);
  // The ramps ease in at their feet and level out at the top.
  const e = along * along * (3 - 2 * along);
  return d.height * e * side;
}

/** The extra height of every ramp and deck at a point. */
export function rampHeight(
  kickers: readonly Kicker[],
  decks: readonly Deck[],
  x: number,
  y: number,
): number {
  let h = 0;
  for (const k of kickers) {
    if (Math.abs(x - k.x) > k.len + 12 || Math.abs(y - k.y) > k.len + 12) continue;
    h = Math.max(h, kickerHeight(k, x, y));
  }
  for (const d of decks) {
    const pad = d.width / 2 + DECK.berm;
    if (
      x < Math.min(d.ax, d.bx) - pad ||
      x > Math.max(d.ax, d.bx) + pad ||
      y < Math.min(d.ay, d.by) - pad ||
      y > Math.max(d.ay, d.by) + pad
    )
      continue;
    h = Math.max(h, deckHeight(d, x, y));
  }
  return h;
}
