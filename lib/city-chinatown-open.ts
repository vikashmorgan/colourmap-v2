/*
 * Openings through Chinatown's clutter (docs/specs/art-city.md, "Racing corridors and the
 * Heights–Golden bridges", 2026-11-14). Pure: no three.js, no DOM.
 *
 * 2026-11-14, the user: "some Chinatown parts are getting too overloaded with panels and lampions
 * and stuff. Would be cool to have openings so I can fly through."
 *
 * Two things, and Chinatown keeps its character:
 * - **Thinner.** Fewer tall signs up its towers, fewer strings of lanterns across its streets,
 *   fewer covered walkways and rope lights, fewer flying lanterns over its roofs (the numbers
 *   below; lib/city-game.ts, lib/city-ropes.ts and lib/city-lanterns.ts read them).
 * - **Windows.** A few clear boxes of air, CT_WINDOWS, down its side streets and along its cross
 *   streets at chosen heights: no sign, string, walkway or rope reaches into one, and no tower
 *   stands in one, so the ship can thread straight through. The racing corridors (lib/city-
 *   corridors.ts) cross Chinatown too and are kept clear of strings and walkways.
 */

import type { Vec3 } from './bigbang';
import { BLOCK_X, BLOCK_Z, GROUND, nearest, TILE_X, TILE_Z, wrap } from './city-grid';

/** The tall signs' levels up a Chinatown tower off the avenue: tall towers, and the rest. */
export const CT_SIGN_LEVELS_TALL = [0.14, 0.42, 0.7, 0.9];
export const CT_SIGN_LEVELS = [0.2, 0.75];
/** The heights its strings of lanterns cross its side streets at (they were nine to fifty, five). */
export const CT_STRAND_LEVELS = [9, 26, 50];
/** The share of a walkway's heights that carry one (it was a half). */
export const CT_WALK_SHARE = 0.3;
/** How often one of its streets is hung with rope lights (it was 0.6). */
export const CT_ROPE_SHARE = 0.4;

/** A clear box of air, tile-local: x, y (over the street) and z ranges. */
export type CtWindow = {
  name: string;
  x: [number, number];
  y: [number, number];
  z: [number, number];
};

/** Down the side street on line I (along z), between heights y0 and y1 over the street. */
const down = (name: string, I: number, y0: number, y1: number, z0 = 8, z1 = 8 * BLOCK_Z - 8) => ({
  name,
  x: [I * BLOCK_X - 5.5, I * BLOCK_X + 5.5] as [number, number],
  y: [y0, y1] as [number, number],
  z: [z0, z1] as [number, number],
});
/** Along the cross street on line J (along x), from x0 to x1, between heights y0 and y1. */
const along = (name: string, J: number, x0: number, x1: number, y0: number, y1: number) => ({
  name,
  x: [x0, x1] as [number, number],
  y: [y0, y1] as [number, number],
  z: [J * BLOCK_Z - 3.2, J * BLOCK_Z + 3.2] as [number, number],
});

/**
 * The windows, a few to each Chinatown (the plan's first band, rows 0 to 7): three down side
 * streets at a low, a middle and a high band, and two along cross streets either side of the
 * avenue, each twenty or more high. Clear of every tower (tested), so you can fly them end to end.
 */
export const CT_WINDOWS: CtWindow[] = [
  down('West lane, low', -5, 10, 32),
  down('Avenue lane, high', -2, 34, 56),
  down('East lane, middle', 2, 20, 42),
  along('North crossing, west', 2, -150, -14, 14, 36),
  along('North crossing, east', 2, 14, 150, 14, 36),
  along('South crossing, west', 6, -150, -14, 34, 56),
  along('South crossing, east', 6, 14, 150, 34, 56),
];

/** Whether the box lo..hi (world, y absolute) reaches into any of Chinatown's windows. */
export function inCtWindow(lo: Vec3, hi: Vec3): boolean {
  // Into the tile's own frame by the box's middle, so a box never straddles two copies.
  const ox = nearest(0, (lo[0] + hi[0]) / 2, TILE_X);
  const zc = (lo[2] + hi[2]) / 2;
  const oz = zc - wrap(zc, TILE_Z);
  const x0 = lo[0] - ox;
  const x1 = hi[0] - ox;
  const z0 = lo[2] - oz;
  const z1 = hi[2] - oz;
  const y0 = lo[1] - GROUND;
  const y1 = hi[1] - GROUND;
  for (const w of CT_WINDOWS) {
    if (x1 <= w.x[0] || x0 >= w.x[1]) continue;
    if (z1 <= w.z[0] || z0 >= w.z[1]) continue;
    if (y1 <= w.y[0] || y0 >= w.y[1]) continue;
    return true;
  }
  return false;
}
