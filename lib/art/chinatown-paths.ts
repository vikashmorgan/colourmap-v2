/**
 * Chinatown Run's second paths (2026-11-24). Pure: no three.js, no DOM.
 *
 * - **Main Street** ("give option to keep going normal instead of doing the tilt for the chinatown
 *   run so u can do it both ways and there are 2 paths"): before each Undertown a lane peels off
 *   the road's right edge, runs beside the flip clear of its sweep, and merges back after it. Keep
 *   left and you flip under; bear right at the fork (大街 MAIN STREET →) and you stay on top,
 *   driving normally. Once the two have parted a median walls them apart, so nobody on the ribbon
 *   is ever drawn hanging off its side.
 * - **The balcony road** ("on the small jumps allow ability to jump go higher up left and ride a
 *   second slope on the left. that is above the normal slope. like a side track above the first
 *   floor of the buildings"): at a street crest a kicker on the left of the road; jump up-left off
 *   it onto a raised lane one storey up along the shophouse fronts, ride it a few hundred metres,
 *   and a ramp brings you back down onto the road. Miss it and you are simply on the road below.
 *
 * Chinatown's street lies at height 0 outside its crest and dip (lib/art/track.ts CHINATOWN), so the
 * balcony's height is given over that datum.
 */

import { UNDER, UNDER_LENGTH } from './undertown';

const smooth = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

/* ── Main Street: the way past Undertown ───────────────────── */

/**
 * Main Street: half its width (as a twist's bypass, BYPASS_LANE in track.ts), how far its centre
 * runs out right of the road's (clear of the flip's sweep, about 23 m from the centre, with room),
 * where it starts to peel off before the flip and how long before the flip it is fully out.
 */
export const MAIN = { LANE: 9, OUT: 38, SPLIT: 420, CLEAR: 60 };

/** Where Main Street's centre runs at s (u, negative: on the right), or null where there is none. */
export function mainStreet(s: number): number | null {
  const { OUT, SPLIT, CLEAR } = MAIN;
  if (!(s >= UNDER.AT - SPLIT)) return null;
  const k = Math.floor((s - UNDER.AT + SPLIT) / UNDER.EVERY);
  const x = s - (UNDER.AT + k * UNDER.EVERY);
  if (x > UNDER_LENGTH + SPLIT) return null;
  const a = Math.min(
    (x + SPLIT) / (SPLIT - CLEAR),
    (UNDER_LENGTH + SPLIT - x) / (SPLIT - CLEAR),
    1,
  );
  return -OUT * smooth(a);
}

/**
 * Where the median between the road and Main Street runs (u: halfway between the road's right edge
 * and the lane's inner edge), or null while the two still overlap or touch.
 */
export function mainMedian(c: number | null, half: number): number | null {
  if (c === null) return null;
  const inner = c + MAIN.LANE;
  if (inner >= -half) return null;
  return (inner - half) / 2;
}

/** The fork's nose for the Undertown run that starts at `under` (m along the road): where the lane
 * has just parted from the road (the median begins), for a road `half` wide there. */
export function forkNose(under: number, half: number): number {
  for (let s = under - MAIN.SPLIT; s < under; s += 1)
    if (mainMedian(mainStreet(s), half) !== null) return s;
  return under;
}

/* ── The balcony road ──────────────────────────────────────── */

/**
 * The balcony road, at a street crest (CREST m into each 2,000 m period, lib/art/track.ts):
 * - the kicker: KICK m of ramp up to the crest's top on the left of the road (KICK_W m of it, its
 *   inner side easing in over 3 m), KICK_H m tall, ending in a lip;
 * - the deck: from the crest's top, H m over the street (a storey and a bit: the first floor of
 *   the shophouses), half-width W, its inner edge GAP m past the road's edge, for RUN m;
 * - the ramp: RAMP m down to the street;
 * - the merge: MERGE m sliding back onto the road's left lane.
 * Only where no Undertown (nor its flips' sweep) is within CLEAR m.
 */
export const BALCONY = {
  PERIOD: 2000,
  CREST: 1500,
  KICK: 36,
  KICK_H: 2,
  KICK_W: 8,
  H: 6,
  W: 4.5,
  GAP: 0.5,
  RUN: 240,
  RAMP: 100,
  MERGE: 120,
  CLEAR: 60,
};

/** From the crest's top to the end of the merge (m). */
export const BALCONY_LENGTH = BALCONY.RUN + BALCONY.RAMP + BALCONY.MERGE;

/** Whether an Undertown run (flip in to flip out) comes within CLEAR m of [a, b]. */
function nearUndertown(a: number, b: number): boolean {
  const lo = a - BALCONY.CLEAR - UNDER_LENGTH;
  const hi = b + BALCONY.CLEAR;
  const k0 = Math.ceil((lo - UNDER.AT) / UNDER.EVERY);
  for (let k = Math.max(0, k0); UNDER.AT + k * UNDER.EVERY <= hi; k++) {
    const from = UNDER.AT + k * UNDER.EVERY;
    if (from + UNDER_LENGTH >= a - BALCONY.CLEAR && from <= hi) return true;
  }
  return false;
}

/** Whether crest n (at n × PERIOD + CREST) carries a balcony road. */
export function balconyAtCrest(n: number): boolean {
  if (n < 0) return false;
  const c = n * BALCONY.PERIOD + BALCONY.CREST;
  return !nearUndertown(c - BALCONY.KICK, c + BALCONY_LENGTH);
}

/** Metres from the top of the crest whose balcony road s is on or coming to (from -KICK to
 * BALCONY_LENGTH), or null. */
export function balconyLocal(s: number): number | null {
  if (!Number.isFinite(s)) return null;
  const n = Math.round((s - BALCONY.CREST) / BALCONY.PERIOD);
  const x = s - (n * BALCONY.PERIOD + BALCONY.CREST);
  if (x < -BALCONY.KICK || x >= BALCONY_LENGTH) return null;
  return balconyAtCrest(n) ? x : null;
}

export interface Balcony {
  /** Its centre (u, positive left), its half-width, and its surface's height over the street's
   * datum (down on the street, the road's left edge's). */
  c: number;
  w: number;
  z: number;
  /** Up off the street (the deck and the ramp) or down on it (the merge). */
  raised: boolean;
}

/**
 * The balcony road at s, beside a road `half` wide there whose left edge the bank lifts by `lift`
 * (m, negative where it dips), or null where it does not run. The deck stands H over the road's
 * left edge as the bank carries it, so it is always a storey over the road beside it.
 */
export function balcony(s: number, half: number, lift = 0): Balcony | null {
  const x = balconyLocal(s);
  if (x === null || x < 0) return null;
  const { W, GAP, H, RUN, RAMP, MERGE } = BALCONY;
  const out = half + GAP + W;
  if (x < RUN) return { c: out, w: W, z: lift + H, raised: true };
  if (x < RUN + RAMP) {
    const k = (x - RUN) / RAMP;
    // Down the ramp, eased at both ends.
    const up = H * (1 - k * k * k * (k * (6 * k - 15) + 10));
    return { c: out, w: W, z: lift + up, raised: up > 0.05 };
  }
  const k = smooth((x - RUN - RAMP) / MERGE);
  return { c: out + (half - W - out) * k, w: W, z: lift, raised: false };
}

/** The kicker's height on the road at (s, u) for a road `half` wide (0 off it). */
export function kickAt(s: number, u: number, half: number): number {
  const x = balconyLocal(s);
  if (x === null || x >= 0) return 0;
  const along = smooth((x + BALCONY.KICK) / BALCONY.KICK);
  const across = smooth((u - (half - BALCONY.KICK_W - 3)) / 3);
  return BALCONY.KICK_H * along * across * (u <= half + 0.01 ? 1 : 0);
}

/* ── Choosing a path ───────────────────────────────────────── */

/** Which of the second paths a racer takes where it comes to one. */
export interface PathPick {
  bypass: boolean;
  balcony: boolean;
}

function hash(n: number): number {
  const s = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return s - Math.floor(s);
}

/** Where a run of `on` (true along a fork or a balcony) that s is in starts, on a 10 m grid. */
export function runStart(on: (s: number) => boolean, s: number): number {
  let a = Math.floor(s / 10) * 10;
  for (let i = 0; i < 400 && a > 0 && on(a - 10); i++) a -= 10;
  return a;
}

/** The autopilot's pick for the run starting at `start`: one way or the other, the same each time,
 * about half each. */
export function pickFor(start: number): boolean {
  return hash(Math.round(start)) < 0.5;
}

/** The fork's and the balcony road's signs: their words and their tone in the sign atlas. */
export const PATH_SIGNS = {
  under: '下町 UNDERTOWN ↶',
  main: '大街 MAIN STREET →',
  balcony: '露台 BALCONY ↖',
} as const;
