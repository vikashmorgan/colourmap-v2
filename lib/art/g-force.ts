/**
 * Drive: the G-force mask (docs/specs/drive-game.md, "Camera and feel"), every world. Pure.
 *
 * 2026-11-23: "when u turn intensely bring a light darker edge blur mask to show the g pressure.
 * same when u get hit". The screen's edges darken and blur a little with the sideways pull of a
 * hard turn, and a hit gives a brief soft pulse of the same mask. Never a flash; subtle at most.
 */

/** From this sideways pull (m/s²) the mask begins, and by this it is full. */
export const G_FROM = 10;
export const G_FULL = 34;
/** The most the turn's mask reaches, and a hit's pulse. */
export const G_MAX = 0.5;
export const HIT_PULSE = 0.45;
/** How long a hit's pulse takes to fade (s, its time constant), and how fast it swells. */
export const HIT_FADE = 0.35;
const HIT_RISE = 0.06;

function smooth(e0: number, e1: number, v: number): number {
  const k = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

/** The mask from the sideways pull of a turn (m/s²). */
export function turnMask(lateral: number): number {
  return G_MAX * smooth(G_FROM, G_FULL, Math.abs(lateral));
}

/** A hit's soft pulse, `age` seconds after it: swells in a few hundredths, fades over a third of a
 * second. Nothing before the hit. */
export function hitMask(age: number, power = 1): number {
  if (!(age >= 0)) return 0;
  return HIT_PULSE * Math.min(1, power) * Math.min(1, age / HIT_RISE) * Math.exp(-age / HIT_FADE);
}

/** Both together, never past the most a turn gives plus a little. */
export function gMask(lateral: number, hitAge: number, hitPower = 1): number {
  return Math.min(0.7, turnMask(lateral) + hitMask(hitAge, hitPower));
}

/** Eases the mask: quick to come (4/s), slow to go (1.8/s), so it breathes with the turn. */
export function easeMask(current: number, target: number, dt: number): number {
  const rate = target > current ? 4 : 1.8;
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}
