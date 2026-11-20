/**
 * Drive's autopilot (docs/specs/drive-game.md, "Autopilot"): the races playing themselves in the
 * Grid's porthole (2026-11-19: "a cool connection to the grid tree, with the videogames appearing
 * in autopilot in a small porthole that opens when you check the racing part"). Pure.
 *
 * On a track it aims at a point on the centre line a little ahead (further the faster), boosts on
 * the straights, and in Sky Canyon drifts slowly between the heights. On the open salt it wanders
 * in long easy curves.
 */

import { type Controls, clamp, wrapAngle } from '@/lib/art/drive';
import { pointAt, type Track } from '@/lib/art/track';
import type { Vehicle } from '@/lib/art/vehicle';

/** How far ahead it aims (m), at rest and per m/s. */
export const LOOK = { base: 16, perSpeed: 0.55 };

export function autopilotControls(
  v: Vehicle,
  track: Track | null,
  s: number,
  t: number,
  flying = false,
  /** The line it holds across the road (m, + left); the rivals each keep their own. */
  lane = 0,
): Controls {
  const speed = Math.hypot(v.vx, v.vy);
  if (!track) {
    // The salt: long, easy curves.
    return { throttle: 1, steer: 0.35 * Math.sin(t * 0.23), boost: 0 };
  }
  const p = pointAt(track, s + LOOK.base + LOOK.perSpeed * speed, lane);
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
