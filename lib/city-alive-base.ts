/*
 * The alive quarters' shared ground (docs/specs/art-city.md, "Alive quarters"): what they need of a
 * tower, each quarter's tones, and the street channels' heights that nothing crossing a street may
 * stand in. Pure: no three.js, no DOM; nothing here imports lib/city-game.ts (so no cycle).
 */

import type { RGB } from './bigbang';
import { MARKET_LEVELS } from './city-currents';
import { EXPRESS_X, EXPRESS_Z, X_HEIGHTS, Z_HEIGHTS } from './city-flow';
import { C, mix, TILE_I, TILE_J, wrap } from './city-grid';

/** What the alive quarters need of a block's tower (lib/city-game.ts Block, without the cycle). */
export type AliveBlock = {
  x: number;
  z: number;
  hx: number;
  hz: number;
  h: number;
  k: number;
  I: number;
  J: number;
  d: string;
  shape: string;
};
export type TowerAt = (I: number, J: number) => AliveBlock;
export type Ahead = (x: number, z: number, rad: number) => boolean;

export const tileCol = (I: number) => wrap(I + TILE_I / 2, TILE_I) - TILE_I / 2;
export const tileRow = (J: number) => wrap(J, TILE_J);
/** Whether block column I is off the avenue (the avenue runs between columns -1 and 0). */
export const offAvenue = (I: number) => {
  const li = tileCol(I);
  return li !== 0 && li !== -1;
};
/** A tower that stands as a solid box (plain, a business tower, a Matrix tower). */
export const solidTower = (tw: AliveBlock) =>
  tw.shape === 'box' || tw.shape === 'business' || tw.shape === 'code';

/** Each quarter's own colour (lib/city-game.ts DISTRICTS), kept here so this file stands alone. */
export const QUARTER_TONE: Record<string, RGB> = {
  chinatown: C.red,
  indian: C.saffron,
  oriental: C.turquoise,
  heights: C.cyan,
  canals: C.violet,
  golden: C.gold,
  temples: C.ivory,
  industrial: C.steel,
  domes: C.leaf,
  egypt: C.sand,
  market: C.magenta,
  code: [0.3, 1, 0.45],
};
/** A quarter's three tones now: its colour leaning slowly toward warm, a warm lamp, a pale white. */
export function quarterTones(d: string, t: number, key: number): RGB[] {
  const c = QUARTER_TONE[d] ?? C.warm;
  const lean = 0.5 + 0.5 * Math.sin(0.05 * t + key * 0.37);
  return [mix(c, mix(c, C.warm, 0.4), lean), mix(C.warm, c, 0.25), mix(C.white, c, 0.2)];
}

/** How far anything crossing a street keeps from a street channel's height. */
export const LANE_CLEAR = 4;
/** The heights the street channels fly at over the street: the streets', the cross streets', the express lanes'. */
export const LANE_HEIGHTS: number[] = [
  ...Z_HEIGHTS,
  ...Z_HEIGHTS.map((y) => y + 0.6),
  ...X_HEIGHTS,
  EXPRESS_Z,
  EXPRESS_X,
];
/** Whether height y (over the street) is clear of every lane, and of the market's highways in the market. */
export function laneFree(y: number, market = false): boolean {
  for (const L of LANE_HEIGHTS) if (Math.abs(y - L) < LANE_CLEAR) return false;
  if (market) for (const L of Object.values(MARKET_LEVELS)) if (Math.abs(y - L) < 6) return false;
  return true;
}
