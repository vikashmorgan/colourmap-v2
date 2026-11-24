/**
 * Drive's autopilot (docs/specs/drive-game.md, "Autopilot"): the races playing themselves in the
 * Grid's porthole (2026-11-19: "a cool connection to the grid tree, with the videogames appearing
 * in autopilot in a small porthole that opens when you check the racing part"). Pure.
 *
 * On a track it aims at a point on the centre line a little ahead (further the faster), boosts on
 * the straights, and in Sky Canyon drifts slowly between the heights. On the open salt it wanders
 * in long easy curves. Where the road offers a second path (Chinatown's Main Street past Undertown,
 * its balcony road, a twist's bypass) it aims along the one it picked.
 */

import { type PathPick, pickFor, runStart } from '@/lib/art/chinatown-paths';
import { type Controls, clamp, wrapAngle } from '@/lib/art/drive';
import { pointAt, type Track, type TrackDef } from '@/lib/art/track';
import type { Vehicle } from '@/lib/art/vehicle';

/** How far ahead it aims (m), at rest and per m/s. */
export const LOOK = { base: 16, perSpeed: 0.55 };

/** Where to aim across the road at s for a racer holding `lane`: on the bypass or the balcony road
 * if it picked that way and one runs there, else its own line. */
export function aimLane(def: TrackDef, s: number, lane: number, pick: PathPick): number {
  if (pick.balcony) {
    const bc = def.balcony?.(Math.max(0, s));
    if (bc) return bc.c;
    // Coming to its kicker: up the left of the road, to jump up-left off its lip.
    const half = def.half(Math.max(0, s));
    if ((def.kick?.(Math.max(0, s), half) ?? 0) > 0) return half - 1.5;
  }
  if (pick.bypass) {
    const c = def.bypass?.(Math.max(0, s));
    if (c !== null && c !== undefined) return c + lane * 0.3;
  }
  return lane;
}

/** The autopilot's way at the fork or balcony road s is on: one or the other, the same along it. */
export function forkPick(def: TrackDef, s: number): PathPick {
  const by = (q: number) => (def.bypass?.(q) ?? null) !== null;
  const bc = (q: number) => (def.balcony?.(q) ?? null) !== null;
  return {
    bypass: by(Math.max(0, s)) && pickFor(runStart(by, s)),
    balcony: bc(Math.max(0, s)) && pickFor(runStart(bc, s) + 1),
  };
}

export function autopilotControls(
  v: Vehicle,
  track: Track | null,
  s: number,
  t: number,
  flying = false,
  /** The line it holds across the road (m, + left); the rivals each keep their own. */
  lane = 0,
  /** Which second paths it takes (left out: the autopilot's own pick at each). */
  pick?: PathPick,
): Controls {
  const speed = Math.hypot(v.vx, v.vy);
  if (!track) {
    // The salt: long, easy curves.
    return { throttle: 1, steer: 0.35 * Math.sin(t * 0.23), boost: 0 };
  }
  const ahead = s + LOOK.base + LOOK.perSpeed * speed;
  const p = pointAt(
    track,
    ahead,
    aimLane(track.def, ahead, lane, pick ?? forkPick(track.def, ahead)),
  );
  const err = wrapAngle(Math.atan2(p.y - v.y, p.x - v.x) - v.h);
  const c: Controls = {
    throttle: 1,
    steer: clamp(err * 2.4, -1, 1),
    boost: Math.abs(err) < 0.04 ? 1 : 0,
  };
  // In the sky, a slow climb and dive through the three heights.
  if (flying) c.climb = clamp(Math.sin(t * 0.18) * 1.6, -1, 1);
  return c;
}
