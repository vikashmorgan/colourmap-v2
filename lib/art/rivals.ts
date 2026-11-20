/**
 * Drive's rivals (docs/specs/drive-game.md, "Rivals"): five other racers on every track, each in
 * its own colour and fire, switched on or off in the menu (2026-11-20: "racing more with other
 * racers of another colour and flame, for all the racetracks, can be turned on or off, 5 other
 * racers"). Pure: who they are, where they line up, and how they drive.
 *
 * They drive the autopilot (lib/art/autopilot.ts), each holding its own line across the road and
 * its own pace. A gentle elastic keeps the pack round you: a rival far ahead eases off, one far
 * behind boosts, so there is always someone to race.
 */

import { autopilotControls } from '@/lib/art/autopilot';
import { type Controls, clamp } from '@/lib/art/drive';
import { type FireId, type Hull, hullById } from '@/lib/art/drive-design';
import type { Track } from '@/lib/art/track';
import type { Vehicle } from '@/lib/art/vehicle';

export interface Rival {
  name: string;
  /** A glossy paint in its own colour. */
  colour: string;
  fire: FireId;
  /** Its line across the road, as a share of the half-width (+ left, - right). */
  lane: number;
  /** Its throttle at full race pace, 0..1. */
  pace: number;
  /** Where it lines up: metres along the road from your start (+ ahead), and across (share). */
  grid: { ds: number; du: number };
}

export const RIVALS: Rival[] = [
  {
    name: 'Cyan',
    colour: '#18c8e0',
    fire: 'plasma',
    lane: 0.45,
    pace: 0.97,
    grid: { ds: 14, du: 0.5 },
  },
  {
    name: 'Violet',
    colour: '#8a3cf0',
    fire: 'gas',
    lane: -0.4,
    pace: 0.95,
    grid: { ds: 14, du: -0.5 },
  },
  {
    name: 'Lime',
    colour: '#7ad62a',
    fire: 'blaze',
    lane: 0.15,
    pace: 0.93,
    grid: { ds: 28, du: 0.25 },
  },
  {
    name: 'Orange',
    colour: '#f07818',
    fire: 'whiteHot',
    lane: -0.15,
    pace: 0.99,
    grid: { ds: -14, du: -0.5 },
  },
  {
    name: 'Pearl',
    colour: '#f2eee6',
    fire: 'speed',
    lane: 0.3,
    pace: 0.96,
    grid: { ds: -14, du: 0.5 },
  },
];

/** The elastic: past this gap (m) a rival eases off ahead or boosts behind. */
export const ELASTIC = 160;

/** A rival's hull: the Paint finish in its own colour. */
export function rivalHull(r: Rival): Hull {
  return { ...hullById('paint'), colour: r.colour };
}

/**
 * How a rival drives this frame. `gap` is its distance along the road ahead of you (m, + ahead).
 */
export function rivalControls(
  r: Rival,
  v: Vehicle,
  track: Track,
  s: number,
  t: number,
  gap: number,
  flying = false,
): Controls {
  const half = track.def.half(Math.max(0, s));
  const c = autopilotControls(v, track, s, t + r.pace * 40, flying, r.lane * half * 0.8);
  let throttle = r.pace;
  let boost = c.boost;
  if (gap > ELASTIC) {
    throttle = clamp(r.pace - (gap - ELASTIC) / 400, 0.35, 1);
    boost = 0;
  } else if (gap < -ELASTIC) boost = 1;
  return { ...c, throttle, boost };
}

/** Your place among the racers: 1 + how many are further along the road than you. */
export function placeOf(you: number, rivals: readonly number[]): number {
  return 1 + rivals.filter((s) => s > you).length;
}

/**
 * Two racers touching: push them apart along the line between them and swap the part of their
 * speeds that meets head-on, so they bump and slide rather than pass through. Mutates both.
 */
export const TOUCH = 2.6;
export function bump(a: Vehicle, b: Vehicle): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d >= TOUCH || d < 1e-6) return false;
  const nx = dx / d;
  const ny = dy / d;
  const push = (TOUCH - d) / 2;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel < 0) {
    const j = rel * 0.8;
    a.vx += nx * j * 0.5;
    a.vy += ny * j * 0.5;
    b.vx -= nx * j * 0.5;
    b.vy -= ny * j * 0.5;
  }
  return true;
}
