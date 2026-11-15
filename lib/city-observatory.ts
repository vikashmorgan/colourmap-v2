/*
 * The Observatory in the City of Dreams (docs/specs/art-city.md, "Industry superquarter and the
 * observatory"): the Domes collection's new design (lib/golden-buildings.ts, DOMES 4) standing once
 * in the Solarpunk domes quarter, on its own block beside the garden of domes' plaza, its slit open
 * toward the long way of the city and its telescope looking out through it. Pure: no three.js, no
 * DOM.
 *
 * 2026-11-14: "also add an OBSERVATORY design to the Domes collection ... place one somewhere
 * fitting." Kept open as the fifteen new buildings' blocks are (lib/city-big.ts openBlock), drawn
 * at its Studio proportions (not stretched up, so its dome stays round), held as a solid drum and
 * dome by the collision's `blocked`.
 */

import type { RGB, Vec3 } from './bigbang';
import { studioItem } from './city-designs';
import { BLOCK_X, BLOCK_Z, C, GROUND, type Item, mix, nearest, TILE_X, TILE_Z } from './city-grid';
import { OBSERVATORY_KIND, OBSERVATORY as SIZE } from './golden-buildings';

/** Its block, tile-local: column 4, row 35, beside the domes' landmark plaza (columns 2 and 3). */
export const OBSERVATORY_BLOCK = { I: 4, J: 35 } as const;
/** How many times its Studio size it stands: its terrace just inside the block. */
export const OBSERVATORY_SCALE = 1.55;
/** Where it stands, tile-local: its block's middle. */
export const OBSERVATORY_AT: [number, number] = [
  (OBSERVATORY_BLOCK.I + 0.5) * BLOCK_X,
  (OBSERVATORY_BLOCK.J + 0.5) * BLOCK_Z,
];
/** Its drum's radius and the dome's foot over the street, scaled. */
export const OBS_R = SIZE.drum * OBSERVATORY_SCALE;
export const OBS_FOOT = (1 + SIZE.drumH) * OBSERVATORY_SCALE;
/** Its crown over the street. */
export const OBS_TOP = OBS_FOOT + OBS_R;
const COLOUR: RGB = mix(C.leaf, C.ivory, 0.35);

/** Whether tile-local block (li, lj) is the observatory's. */
export const observatoryBlock = (li: number, lj: number) =>
  li === OBSERVATORY_BLOCK.I && lj === OBSERVATORY_BLOCK.J;

/** Whether a point is inside the observatory's drum or dome, `m` round (its nearest copy). */
export function observatoryHolds(q: Vec3, m: number): boolean {
  const dx = q[0] - nearest(OBSERVATORY_AT[0], q[0], TILE_X);
  const dz = q[2] - nearest(OBSERVATORY_AT[1], q[2], TILE_Z);
  const R = OBS_R + m;
  const d2 = dx * dx + dz * dz;
  if (d2 > R * R) return false;
  const y = q[1] - GROUND;
  return y < OBS_FOOT + Math.sqrt(R * R - d2);
}

/** The observatory as one of the Ship's items, when within R and ahead. */
export function observatoryItems(
  eye: Vec3,
  t: number,
  R: number,
  ahead: (x: number, z: number, rad: number) => boolean,
  out: Item[],
): void {
  const x = nearest(OBSERVATORY_AT[0], eye[0], TILE_X);
  const z = nearest(OBSERVATORY_AT[1], eye[2], TILE_Z);
  if (Math.hypot(x - eye[0], z - eye[2]) > R + 30) return;
  if (!ahead(x, z, 30)) return;
  const key = 46000 + Math.round(z / TILE_Z) * 7 + Math.round(x / TILE_X);
  out.push(
    studioItem('domes', OBSERVATORY_KIND, { x, z, key }, OBSERVATORY_SCALE, 2600, eye, t, COLOUR),
  );
}
