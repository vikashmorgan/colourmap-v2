/**
 * Drive: off the twist (2026-11-22: "make loopings without rail so if you exit out you fly into
 * the void and dive into the stars below and accelerate and explode. and it says U FUCKED UP!
 * race over"). Pure, so it can be tested; the engine draws it.
 *
 * A twist has no barriers. Ride off its ribbon and you leave the road for good: thrown out from
 * the twist's axis, you dive away into the stars, faster and faster, until you blow up, and the
 * race is over.
 */

import { onBypass, type Track, type TrackDef, TWIST_OPEN } from './track';

export const WRECK = {
  /** How far the twist must have turned before its edges are open (rad). */
  OPEN: TWIST_OPEN,
  /** How far past the edge before you have left it (m). */
  PAST: 1,
  /** The dive's pull (m/s², more than gravity: the stars draw you in). */
  DIVE: 26,
  /** How hard you are thrown out from the axis (m/s). */
  THROW: 9,
  /** Seconds into the dive when you explode, and when the race is called. */
  BOOM: 2.4,
  OVER: 3.4,
};

/** Whether a twist's edges are open here (no barriers). */
export function twistOpen(def: TrackDef, s: number): boolean {
  return Math.abs(def.twist?.(Math.max(0, s)) ?? 0) > WRECK.OPEN;
}

/** Whether you have ridden off the twist's ribbon at (s, u) (its bypass lane is still road). */
export function offTwist(t: Track, s: number, u: number): boolean {
  return (
    twistOpen(t.def, s) &&
    Math.abs(u) > t.def.half(Math.max(0, s)) + WRECK.PAST &&
    onBypass(t, s, u) === null
  );
}

export interface Wreck {
  /** Seconds since you left the road. */
  t: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  boomed: boolean;
  over: boolean;
}

/** Leaving the road at a point (world, z up) with your velocity, thrown out from the twist's axis. */
export function newWreck(
  p: { x: number; y: number; z: number },
  v: { vx: number; vy: number },
  axis: { x: number; y: number; z: number },
): Wreck {
  const dx = p.x - axis.x;
  const dy = p.y - axis.y;
  const dz = p.z - axis.z;
  const m = Math.hypot(dx, dy, dz) || 1;
  return {
    t: 0,
    x: p.x,
    y: p.y,
    z: p.z,
    vx: v.vx + (dx / m) * WRECK.THROW,
    vy: v.vy + (dy / m) * WRECK.THROW,
    vz: (dz / m) * WRECK.THROW,
    boomed: false,
    over: false,
  };
}

/** A step of the dive: what happened in it (the explosion, the race called) comes back as flags. */
export function stepWreck(w: Wreck, dt: number): { boom: boolean; over: boolean } {
  w.t += dt;
  w.vz -= WRECK.DIVE * dt;
  w.x += w.vx * dt;
  w.y += w.vy * dt;
  w.z += w.vz * dt;
  const boom = !w.boomed && w.t >= WRECK.BOOM;
  const over = !w.over && w.t >= WRECK.OVER;
  if (boom) w.boomed = true;
  if (over) w.over = true;
  return { boom, over };
}
