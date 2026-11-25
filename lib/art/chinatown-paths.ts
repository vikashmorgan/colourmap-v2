/**
 * Chinatown Run's second paths (2026-11-24). Pure: no three.js, no DOM.
 *
 * - **The underpass** (地下街, was Main Street: "give option to keep going normal instead of doing
 *   the tilt … so there are 2 paths", then "below the road of the main chinatown … yet another plot
 *   twist"): before each Undertown a lane peels off the road's right edge, sinks into a cut, swings
 *   in under the street and runs beneath it while the road flips over into Undertown above, then
 *   swings out, climbs and merges back. Keep left and you flip under; bear right at the fork
 *   (地下街 UNDERPASS ↘) and you go below. Once the two have parted a median walls them apart; down
 *   under the road the cut's walls and the street's deck do.
 * - **The balcony road** ("on the small jumps allow ability to jump go higher up left and ride a
 *   second slope on the left. that is above the normal slope. like a side track above the first
 *   floor of the buildings"): at a street crest a kicker on the left of the road; jump up-left off
 *   it onto a raised lane one storey up along the shophouse fronts, ride it a few hundred metres,
 *   and a ramp brings you back down onto the road. Miss it and you are simply on the road below.
 *
 * Chinatown's street lies at height 0 outside its crest and dip (lib/art/track.ts CHINATOWN), so the
 * balcony's height is given over that datum.
 */

import { CHINA_LAP, LAP_BALCONY, lapX, nthOf } from './chinatown-lap';
import { underRunAt, underStart } from './undertown';

const smooth = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

/* ── The underpass: the way under Undertown ────────────────── */

/**
 * The underpass (地下街, 2026-11-24: "loop that goes to undertown add option to go to the right and
 * take another road that doesn't go to undertown … but below the road of the main chinatown. so it
 * is yet another plot twist"). Where Main Street ran level beside the flip, the right-hand fork now
 * goes down: it peels off the road's right edge, sinks into a cut, swings in under the street and
 * runs beneath it while the road above flips over into Undertown, then swings back out right,
 * climbs out of its cut and merges back. In metres from where the Undertown run starts (underStart):
 * - PEEL: out to the right at street level, OUT m from the centre (the median forms on the way);
 * - DIVE: down into the cut, DEPTH m under the street (eased at both ends, gentle enough at full
 *   boost that nobody is thrown off its brow);
 * - IN: swings in under the road, its centre to UNDER_C (most of it under the street's deck);
 * - under the road it stays until BACK: the flip lifts the roof off over your head (0 to 180),
 *   the ribbon runs upside down high above, and from BACK it swings out right again;
 * - CLIMB: up out of the cut, done before the median ends;
 * - MERGE: back onto the road.
 * LANE is half its width and KERB the kerb past each edge. It is a second track, not a lane
 * (2026-11-24: "a big ass second track on the right with more emptiness around it"): nearly as
 * wide as the avenues, and once it is down everything right of the street falls away with it into
 * a broad open plain, the buildings stood well back (OPEN m more past its far edge), the street
 * running along the plain's edge on its retaining wall and then over the track as a deck.
 */
export const LOWER = {
  LANE: 14,
  KERB: 1,
  OUT: 44,
  UNDER_C: -6,
  OPEN: 36,
  DEPTH: 12,
  PEEL: [-1000, -700],
  DIVE: [-790, -450],
  IN: [-480, -220],
  BACK: [580, 840],
  CLIMB: [800, 1140],
  MERGE: [1100, 1400],
} as const;

/** How far before the Undertown run the fork starts, and how far past its start the lane is back. */
export const LOWER_FROM = LOWER.PEEL[0];
export const LOWER_TO = LOWER.MERGE[1];

const smoother = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * k * (k * (6 * k - 15) + 10);
};
const along = (x: number, [a, b]: readonly [number, number]) => (x - a) / (b - a);

/** Metres from the start of the Undertown run whose underpass s is on (LOWER_FROM to LOWER_TO), or
 * null where none runs. */
export function lowerLocal(s: number): number | null {
  if (!Number.isFinite(s)) return null;
  const k = underRunAt(s - LOWER_FROM);
  if (k < 0) return null;
  const x = s - underStart(k);
  return x >= LOWER_FROM && x < LOWER_TO ? x : null;
}

/** Where the underpass's centre runs at s (u: negative on the right; UNDER_C under the road),
 * or null where there is none. */
export function underpass(s: number): number | null {
  const x = lowerLocal(s);
  if (x === null) return null;
  const { OUT, UNDER_C, PEEL, IN, BACK, MERGE } = LOWER;
  if (x < IN[0]) return -OUT * smooth(along(x, PEEL));
  if (x < BACK[0]) return -OUT + (UNDER_C + OUT) * smooth(along(x, IN));
  if (x < MERGE[0]) return UNDER_C - (UNDER_C + OUT) * smooth(along(x, BACK));
  return -OUT * (1 - smooth(along(x, MERGE)));
}

/** How far under the street the underpass's floor runs at s (m, 0 at street level or where none). */
export function underpassDepth(s: number): number {
  const x = lowerLocal(s);
  if (x === null) return 0;
  const { DEPTH, DIVE, CLIMB } = LOWER;
  if (x < CLIMB[0]) return DEPTH * smoother(along(x, DIVE));
  return DEPTH * (1 - smoother(along(x, CLIMB)));
}

/** Deeper than this (m) the underpass is down in its cut, walled apart from the street above. */
export const SUNK = 0.3;

/**
 * Where the median between the road and the lane runs (u: halfway between the road's right edge
 * and the lane's inner edge), or null while the two still overlap or touch (at the fork, at the
 * merge, and down under the road, where it is the cut's wall and the deck that part them).
 */
export function pathMedian(c: number | null, half: number): number | null {
  if (c === null) return null;
  const inner = c + LOWER.LANE;
  if (inner >= -half) return null;
  return (inner - half) / 2;
}

/** The fork's nose for the Undertown run that starts at `under` (m along the road): where the lane
 * has just parted from the road (the median begins), for the road's half-width `half` along it. */
export function forkNose(under: number, half: (s: number) => number): number {
  for (let s = under + LOWER_FROM; s < under; s += 1)
    if (pathMedian(underpass(s), half(s)) !== null) return s;
  return under;
}

/* ── The balcony road ──────────────────────────────────────── */

/**
 * The balcony road, at its kicker crest (twice a lap, lib/art/chinatown-lap.ts LAP_BALCONY: the
 * street's only sharp crests since 2026-11-24, the rest are long smooth swells):
 * - the kicker: KICK m of ramp up to the crest's top on the left of the road (KICK_W m of it, its
 *   inner side easing in over 3 m), KICK_H m tall, ending in a lip;
 * - the deck: from the crest's top, H m over the street (a storey and a bit: the first floor of
 *   the shophouses), half-width W, its inner edge GAP m past the road's edge, for RUN m;
 * - the ramp: RAMP m down to the street;
 * - the merge: MERGE m sliding back onto the road's left lane.
 * Kept CLEAR m clear of any Undertown (nor its flips' sweep).
 */
export const BALCONY = {
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

/** Over how many metres of each end of the merge the street's lip fades out and back (m). */
export const MERGE_EASE = 30;

/** From the crest's top to the end of the merge (m). */
export const BALCONY_LENGTH = BALCONY.RUN + BALCONY.RAMP + BALCONY.MERGE;

/** Where balcony road k's crest is (m along the road; from 0, twice a lap). */
export function balconyCrest(k: number): number {
  return nthOf(LAP_BALCONY, k);
}

/** Metres from the top of the crest whose balcony road s is on or coming to (from -KICK to
 * BALCONY_LENGTH), or null. */
export function balconyLocal(s: number): number | null {
  if (!Number.isFinite(s) || s < 0) return null;
  const x = lapX(s);
  for (const c of LAP_BALCONY) {
    const d = x - c;
    if (d >= -BALCONY.KICK && d < BALCONY_LENGTH) return d;
  }
  return null;
}

/** The balcony crests between s0 and s1 (m along the road). */
export function balconyCrests(s0: number, s1: number): number[] {
  const out: number[] = [];
  for (let n = Math.max(0, Math.floor(s0 / CHINA_LAP)); n * CHINA_LAP < s1; n++)
    for (const c of LAP_BALCONY) {
      const s = n * CHINA_LAP + c;
      if (s >= s0 && s < s1) out.push(s);
    }
  return out;
}

export interface Balcony {
  /** Its centre (u, positive left), its half-width, and its surface's height over the street's
   * datum (down on the street, the road's left edge's). */
  c: number;
  w: number;
  z: number;
  /** Up off the street (the deck and the ramp) or down on it (the merge). */
  raised: boolean;
  /** How far merged with the road, 0 to 1, easing in and out over the merge's ends: the street's
   * left lip fades by it on a smooth-edged road. */
  join?: number;
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
    return { c: out, w: W, z: lift + up, raised: up > 0.05, join: 0 };
  }
  const k = smooth((x - RUN - RAMP) / MERGE);
  const m = x - RUN - RAMP;
  return {
    c: out + (half - W - out) * k,
    w: W,
    z: lift,
    raised: false,
    join: smoother(m / MERGE_EASE) * smoother((MERGE - m) / MERGE_EASE),
  };
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
  /** Off down the side roads it comes to (the alley, the high road, the deep way). */
  side?: boolean;
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
  main: '地下街 UNDERPASS ↘',
  /** Lettered along the underpass's walls. */
  deep: '地下街 · 灯 · UNDERPASS',
  balcony: '露台 BALCONY ↖',
  /** Over the lake arcade's mouth (lib/art/chinatown-vista.ts). */
  lake: '望湖廊 LAKE ARCADE',
} as const;
