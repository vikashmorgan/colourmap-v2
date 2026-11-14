/*
 * The traffic's flow over the City of Dreams (docs/specs/art-city.md, "Life in the city"): which
 * way the ships stream on each street and at which height. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "do some avenues have only traffic in one direction like in canyon. and traffics
 * crossing only left on one street then only right on another street that it crosses. or playing
 * with different levels. but i like feeling of being in a flow."
 *
 * A designed flow, not a two-way jam:
 * - The avenue streams one way at each level: the two low levels with you, down the avenue (-z),
 *   the two high levels toward you (+z), so you fly in a river with the oncoming lights above.
 * - Every street along z is one way, all of it: one street toward +z, the next toward -z, the next
 *   +z again, low (5 and 11 over the street).
 * - Every cross street along x is one way too, alternating the same way (one street only to the
 *   right, the next only to the left), and higher (15 and 30), so the crossing streams pass over
 *   the streets they cross.
 * - Express lanes over the roofs (112 along z, 120 along x), each running against the street under
 *   it, faster.
 * None at the height you cruise at (21), and none low on the avenue through Chinatown, as before.
 *
 * Each lane is brought round to the street of its kind nearest the eye as you fly; every kind
 * comes round an even number of streets at a time, so a lane never changes its way when it does.
 */

import { hash } from './bigbang';
import { wideLine } from './city-grid';

/**
 * How far off its line a lane runs on a side street: further out on the wide ones (2026-11-14:
 * "make a lot of the thin streets larger"), so the two streams use the boulevard's width.
 */
export const LANE_OFF = 1.8;
export const WIDE_LANE_OFF = 3;

/** The avenue's heights: the first two with you (down the avenue), the last two toward you. */
export const AVE_HEIGHTS = [5, 11, 28, 35];
/** The streets along z, low; the cross streets along x, higher; the express lanes over the roofs. */
export const Z_HEIGHTS = [5, 11];
export const X_HEIGHTS = [15, 30];
export const EXPRESS_Z = 112;
export const EXPRESS_X = 120;
/** How many streets of each kind are kept round the eye: even, so a lane keeps its way. */
export const Z_STREETS = 6;
export const X_STREETS = 6;
export const EXPRESS_STREETS = 4;

const AVE_LANES = AVE_HEIGHTS.length * 4;
const Z_LANES = Z_STREETS * Z_HEIGHTS.length * 2;
const X_LANES = X_STREETS * X_HEIGHTS.length * 2;
const EZ_LANES = EXPRESS_STREETS * 2;
const EX_LANES = EXPRESS_STREETS * 2;
export const LANE_COUNT = AVE_LANES + Z_LANES + X_LANES + EZ_LANES + EX_LANES;

/** Which way the avenue flows at a level: with you (-z) low, toward you (+z) high. */
export const avenueWay = (level: number): 1 | -1 => (level < 2 ? -1 : 1);
/** Which way street line I along z flows (the avenue, I = 0, as its low levels). */
export const zStreetWay = (I: number): 1 | -1 => (I === 0 ? -1 : I % 2 === 0 ? 1 : -1);
/** Which way cross street line J along x flows: one to the right (+x), the next to the left. */
export const xStreetWay = (J: number): 1 | -1 => (J % 2 === 0 ? 1 : -1);

/** The whole number ≡ slot (mod n) nearest x: a street slot brought round to the one nearest the eye. */
const nearestOf = (slot: number, n: number, x: number) => slot + n * Math.round((x - slot) / n);

/**
 * A lane of the traffic, round the eye's centre (cx, cz): along z (`axis` 2, on street line I at
 * x = I · BLOCK_X) or along x (`axis` 0, on cross street J at z = J · BLOCK_Z); its height over the
 * street, its way (+1 or -1 along its axis), how far off the street's line it runs, how fast, and
 * how many streets of its kind are kept round the eye (for the fade where they come round).
 */
export type FlowLane = {
  axis: 0 | 2;
  line: number;
  y: number;
  sgn: 1 | -1;
  off: number;
  speed: number;
  streets: number;
  avenue: boolean;
  express: boolean;
};

export function flowLane(lane: number, cx: number, cz: number, BX: number, BZ: number): FlowLane {
  const speed = 7 + 4 * hash(lane, 451);
  let n = lane;
  if (n < AVE_LANES) {
    // The avenue: four lanes a level, two either side of the middle, all one way.
    const level = n >> 2;
    const side = n & 1 ? 1 : -1;
    const outer = n & 2 ? 1 : 0;
    return {
      axis: 2,
      line: 0,
      y: (AVE_HEIGHTS[level] as number) + outer * 1.2,
      sgn: avenueWay(level),
      off: side * (outer ? 6.3 : 3.4),
      speed,
      streets: 1,
      avenue: true,
      express: false,
    };
  }
  n -= AVE_LANES;
  if (n < Z_LANES) {
    const I = nearestOf(n % Z_STREETS, Z_STREETS, cx / BX);
    const level = Math.floor(n / Z_STREETS) % Z_HEIGHTS.length;
    const side = Math.floor(n / (Z_STREETS * Z_HEIGHTS.length)) ? 1 : -1;
    return {
      axis: 2,
      line: I,
      y: (Z_HEIGHTS[level] as number) + (I & 1) * 0.6,
      sgn: zStreetWay(I),
      off: side * (I === 0 ? 3.4 : wideLine(2, I) ? WIDE_LANE_OFF : LANE_OFF),
      speed,
      streets: Z_STREETS,
      avenue: I === 0,
      express: false,
    };
  }
  n -= Z_LANES;
  if (n < X_LANES) {
    const J = nearestOf(n % X_STREETS, X_STREETS, cz / BZ);
    const level = Math.floor(n / X_STREETS) % X_HEIGHTS.length;
    const side = Math.floor(n / (X_STREETS * X_HEIGHTS.length)) ? 1 : -1;
    return {
      axis: 0,
      line: J,
      y: X_HEIGHTS[level] as number,
      sgn: xStreetWay(J),
      off: side * (wideLine(0, J) ? WIDE_LANE_OFF : LANE_OFF),
      speed,
      streets: X_STREETS,
      avenue: false,
      express: false,
    };
  }
  n -= X_LANES;
  // The express lanes over the roofs, each against the street under it, faster.
  const fast = 15 + 4 * hash(lane, 453);
  if (n < EZ_LANES) {
    const I = nearestOf(n % EXPRESS_STREETS, EXPRESS_STREETS, cx / BX);
    return {
      axis: 2,
      line: I,
      y: EXPRESS_Z,
      sgn: zStreetWay(I) > 0 ? -1 : 1,
      off: (n >= EXPRESS_STREETS ? 1 : -1) * 2,
      speed: fast,
      streets: EXPRESS_STREETS,
      avenue: I === 0,
      express: true,
    };
  }
  n -= EZ_LANES;
  const J = nearestOf(n % EXPRESS_STREETS, EXPRESS_STREETS, cz / BZ);
  return {
    axis: 0,
    line: J,
    y: EXPRESS_X,
    sgn: xStreetWay(J) > 0 ? -1 : 1,
    off: (n >= EXPRESS_STREETS ? 1 : -1) * 2,
    speed: fast,
    streets: EXPRESS_STREETS,
    avenue: false,
    express: true,
  };
}
