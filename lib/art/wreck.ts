/**
 * Drive: off the twist (2026-11-22: "make loopings without rail so if you exit out you fly into
 * the void and dive into the stars below and accelerate and explode. and it says U FUCKED UP!
 * race over"). Pure, so it can be tested; the engine draws it.
 *
 * A twist has no barriers. Ride off its ribbon and you leave the road for good: thrown out from
 * the twist's axis, you dive away into the stars, faster and faster, until you blow up, and the
 * race is over.
 */

import { edgesOpen, onBypass, type Track, type TrackDef, TWIST_OPEN } from './track';

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

/** Whether a twist's edges are open here (no barriers; Undertown keeps its own). */
export function twistOpen(def: TrackDef, s: number): boolean {
  return edgesOpen(def, s);
}

/** Whether you have ridden off the twist's ribbon at (s, u) (its bypass lane is still road). */
export function offTwist(t: Track, s: number, u: number): boolean {
  return (
    twistOpen(t.def, s) &&
    Math.abs(u) > t.def.half(Math.max(0, s)) + WRECK.PAST &&
    onBypass(t, s, u) === null
  );
}

/*
 * STRAIGHT THROUGH (2026-11-22: "straight road option below and inside, straight through the
 * loopings"). The physics already drives a flat road through a twist; only the roll is drawn. So
 * the straight road is a choice, not more road: hold the gold centre strip as the twist begins and
 * you run flat along the ground through its hollow while the ribbon rolls up and over you. No
 * boost after it (that is the loop's), and no void to fall into.
 */
export const STRAIGHT = {
  /** Half the centre strip that takes you straight through (m). */
  STRIP: 4.5,
  /** Half the lane drawn through the hollow (m). */
  LANE: 7,
  /** How far before a twist its centre strip is marked (m). */
  LEAD: 300,
};

/** Where the twist starting at or just after s ends, if s is at its very start (else null). */
export function twistEntry(def: TrackDef, s: number): { end: number } | null {
  const th = def.twist?.(Math.max(0, s)) ?? 0;
  if (th === 0 || Math.abs(th) >= 0.05) return null;
  // A looping has no hollow to drive straight through: its bypass is the way round. Undertown
  // has none either: everyone goes under.
  if (def.looping?.(Math.max(0, s)) || def.under?.(Math.max(0, s))) return null;
  let end = s;
  while (end < s + 1200 && (def.twist?.(end) ?? 0) !== 0) end += 2;
  return { end };
}

/** Whether entering a twist at (s, u) takes you straight through. */
export function choosesStraight(def: TrackDef, s: number, u: number): boolean {
  return twistEntry(def, s) !== null && Math.abs(u) <= STRAIGHT.STRIP;
}

/** Whether s is in a twist or the stretch marked before it. */
export function nearTwist(def: TrackDef, s: number): boolean {
  if (!def.twist) return false;
  for (let a = 0; a <= STRAIGHT.LEAD; a += 20) {
    const at = Math.max(0, s + a);
    if (def.twist(at) !== 0) return !def.looping?.(at) && !def.under?.(at);
  }
  return false;
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
