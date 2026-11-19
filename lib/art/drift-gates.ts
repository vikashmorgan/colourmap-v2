/**
 * Drive, Salt Flat: the drift gates (docs/specs/drive-game.md). Pure: no three.js, no DOM.
 *
 * Asked for 2026-11-19: "for the salt flat do gates, so it becomes a game on speeding and drifting,
 * with a button to brake so I can brake and turn to drift harder." A loop of gates laid out on the
 * salt west of the measured mile, in sweeping alternate bends: through them in order, as fast as
 * you can, sliding the bends. A lap is timed from the first gate back to it; drifting builds a
 * score, more the faster and the wider the slide, and a combo grows the longer a drift is held.
 * A drift is banked when it ends (after a short grace, so linking two bends keeps the combo).
 *
 * World: x east, y north, metres (the Salt Flat's own, lib/art/salt-flat-game.ts).
 */

import { crosses, type Gate } from '@/lib/art/drive';

/** Half the opening of a drift gate (m): wide enough to slide through. */
export const DRIFT_GATE_HALF = 11;

/**
 * The gates' centres, in order, a closed loop: the first stands 50 m ahead of where the car starts
 * (x 6, y -70, facing north), the course swings west in long alternate bends and comes back up
 * from the south through the first gate again.
 */
export const DRIFT_PATH: readonly [number, number][] = [
  [6, -20],
  [-40, 140],
  [-200, 230],
  [-360, 160],
  [-430, 0],
  [-340, -150],
  [-180, -130],
  [-90, -260],
  [-180, -420],
  [-60, -540],
  [80, -420],
  [70, -230],
];

/** Each gate square to the way through it (the line from the gate before to the gate after). */
export const DRIFT_GATES: Gate[] = DRIFT_PATH.map(([x, y], i) => {
  const n = DRIFT_PATH.length;
  const [ax, ay] = DRIFT_PATH[(i - 1 + n) % n];
  const [bx, by] = DRIFT_PATH[(i + 1) % n];
  const dx = bx - ax;
  const dy = by - ay;
  const l = Math.hypot(dx, dy) || 1;
  // Across the way: the direction turned a quarter.
  const cx = (-dy / l) * DRIFT_GATE_HALF;
  const cy = (dx / l) * DRIFT_GATE_HALF;
  return { ax: x - cx, ay: y - cy, bx: x + cx, by: y + cy };
});

/** What counts as a drift: a slide wider than this (radians) above this speed (m/s), on the ground. */
export const DRIFT_ANGLE = 0.14;
export const DRIFT_SPEED = 12;
/** Seconds a drift may lapse before it is banked: two bends linked keep their combo. */
export const DRIFT_GRACE = 0.5;
/** Points for sliding through a gate. */
export const GATE_BONUS = 150;

export interface DriftRun {
  /** The gate to go through next (0 is the start and finish). */
  next: number;
  /** When the lap under way started (game seconds), or null before the first gate. */
  start: number | null;
  /** Points banked this lap, and the drift under way: its points and how long it has been held. */
  score: number;
  pending: number;
  held: number;
  /** Seconds since the last moment that counted as a drift. */
  lapse: number;
  /** The last lap finished: its time and score; and the bests. */
  lastTime: number | null;
  lastScore: number | null;
  bestTime: number | null;
  bestScore: number | null;
  /** Whether the last lap set the best time, or the best score. */
  recordTime: boolean;
  recordScore: boolean;
}

export function newDriftRun(
  bestTime: number | null = null,
  bestScore: number | null = null,
): DriftRun {
  return {
    next: 0,
    start: null,
    score: 0,
    pending: 0,
    held: 0,
    lapse: 99,
    lastTime: null,
    lastScore: null,
    bestTime,
    bestScore,
    recordTime: false,
    recordScore: false,
  };
}

/** The combo for a drift held `held` seconds: ×1, growing to ×4 by 6 s. */
export function comboOf(held: number): number {
  return 1 + Math.min(3, held * 0.5);
}

/** Points a slide earns per second: the speed times the slide's angle past the threshold. */
export function driftRate(speed: number, slip: number): number {
  const a = Math.abs(slip);
  if (speed < DRIFT_SPEED || a < DRIFT_ANGLE) return 0;
  return speed * Math.min(a, 0.9) * 6;
}

export interface DriftInput {
  /** The move this frame, from (px, py) to (qx, qy). */
  px: number;
  py: number;
  qx: number;
  qy: number;
  speed: number;
  slip: number;
  air: boolean;
}

/** One frame of the drift game. Returns a new DriftRun. */
export function stepDrift(run: DriftRun, m: DriftInput, dt: number, t: number): DriftRun {
  const r = { ...run };
  const rate = r.start !== null && !m.air ? driftRate(m.speed, m.slip) : 0;
  if (rate > 0) {
    r.held += dt;
    r.lapse = 0;
    r.pending += rate * comboOf(r.held) * dt;
  } else {
    r.lapse += dt;
    if (r.lapse > DRIFT_GRACE && (r.pending > 0 || r.held > 0)) {
      r.score += Math.round(r.pending);
      r.pending = 0;
      r.held = 0;
    }
  }

  const n = DRIFT_GATES.length;
  if (!crosses(m.px, m.py, m.qx, m.qy, DRIFT_GATES[r.next])) return r;
  // Sliding through a gate is worth a bonus, and keeps the drift alive.
  if (r.start !== null && rate > 0) r.pending += GATE_BONUS * comboOf(r.held);
  if (r.next === 0) {
    if (r.start !== null) {
      // The lap is done: bank everything, keep the bests, and the next lap starts at once.
      const time = t - r.start;
      const score = r.score + Math.round(r.pending);
      r.recordTime = r.bestTime === null || time < r.bestTime;
      r.recordScore = score > 0 && (r.bestScore === null || score > r.bestScore);
      if (r.recordTime) r.bestTime = time;
      if (r.recordScore) r.bestScore = score;
      r.lastTime = time;
      r.lastScore = score;
    }
    r.start = t;
    r.score = 0;
    r.pending = 0;
    r.held = 0;
  }
  r.next = (r.next + 1) % n;
  return r;
}

/** The score shown: what is banked plus the drift under way. */
export function liveScore(r: DriftRun): number {
  return r.score + Math.round(r.pending);
}
