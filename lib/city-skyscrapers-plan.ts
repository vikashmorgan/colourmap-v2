/*
 * Where the Temples' skyscrapers stand (docs/specs/art-city.md, "Temple skyscrapers and the
 * Skyscraper series", 2026-11-14), and how the high currents climb over them. Plain data and one
 * small formula, so lib/city-currents.ts can read it without a cycle; the towers' drawing, walls
 * and bridges are lib/city-skyscrapers.ts's. Pure: no three.js, no DOM.
 *
 * "Perspective is everything and the whole point of this city": the six stand in two files along
 * the quarter, x 63 and x 143 (with two between, at 93 and 117), so flying down the quarter they
 * line up into views, the Temples' eastern highway threading the gates of both towers on x 143.
 */

import { BLOCK_Z, planX, TILE_Z, wrap } from './city-grid';
import type { Void } from './skyscrapers';

/**
 * A Temple skyscraper, tile-local: its axis (x, z), its block (I, J), its top over the street, its
 * square footprint's half-width r, which design of the series it is (lib/skyscrapers.ts
 * SKY_DESIGNS), and its voids (a slot for the barge, gates for the highway).
 */
export type TempleTower = {
  name: string;
  x: number;
  z: number;
  I: number;
  J: number;
  top: number;
  r: number;
  design: number;
  voids: Void[];
};

const T = (
  name: string,
  I: number,
  J: number,
  x: number,
  top: number,
  r: number,
  design: number,
  voids: Void[] = [],
  z = (J + 0.5) * BLOCK_Z,
): TempleTower => ({ name, x, z, I, J, top, r, design, voids });

/** The highway gates: the Temples' eastern low-roof highway (86, lanes x 140 to 146) runs through them. */
const HIGHWAY_GATE: Void = { y0: 78, y1: 96, hw: 6, open: 'all' };

/**
 * The six (2026-11-14: "a bunch of awesome unique skyscrapers ... not right next to each other"):
 * each on a block of its own, the blocks round it kept open, every pair two blocks or more apart;
 * out of the racing corridor on x 78 (by eight or more) and off the avenue; inside their blocks
 * (4.5 or more from every street's middle); clear of the landmark's plaza and orbit, Ivory Echo's
 * orbit and the Domes' big square. The Arch Gate stands over the lantern barge's line (x 117, 96):
 * the barge sails under its arch. Each taller than every tower in the quarter; the tallest three
 * taller than Ivory Echo (157) too.
 */
export const TEMPLE_TOWERS: TempleTower[] = [
  // Beside the river (its bank at z 828): to the far side of its block, back from the bank by 4.5.
  T('Helix of Dawn', 3, 24, 93, 154, 6, 0, [], 839),
  T('Lattice of Vows', 2, 26, 63, 148, 6.5, 5),
  T('Garden of Bells', 5, 26, 143, 166, 8.5, 3, [
    HIGHWAY_GATE,
    { y0: 146, y1: 154, hw: 6, open: 'all' },
  ]),
  T('Gate of the Barge', 4, 28, 117, 170, 8.5, 10, [{ y0: 0, y1: 110, hw: 6, open: 'z' }]),
  T('Stair of Light', 2, 29, 63, 150, 6.5, 7),
  T('Twin Lanterns', 5, 30, 143, 160, 8.5, 4, [{ y0: 0, y1: 104, hw: 6, open: 'z' }]),
];

/** The tower standing on block (I, J) (tile-local column and row), if any. */
export function templeTowerAt(li: number, lj: number): TempleTower | null {
  return TEMPLE_TOWERS.find((t) => t.I === li && t.J === lj) ?? null;
}

/** Whether block (li, lj) is one of the blocks round a tower, kept open so you can fly round it. */
export function besideTempleTower(li: number, lj: number): boolean {
  return TEMPLE_TOWERS.some((t) => Math.abs(t.I - li) + Math.abs(t.J - lj) === 1);
}

/* ---------- the high currents over them ---------- */

/** How far over the tallest tower the high currents climb near the towers. */
export const LIFT_CLEAR = 7;
/** Over the towers' area, the high currents fly at least this high (over the street). */
export const LIFT_Y = Math.max(...TEMPLE_TOWERS.map((t) => t.top)) + LIFT_CLEAR;
/** The area the currents climb over fully: every tower and twelve round it, tile-local. */
export const LIFT_AREA = {
  x0: Math.min(...TEMPLE_TOWERS.map((t) => t.x - t.r)) - 12,
  x1: Math.max(...TEMPLE_TOWERS.map((t) => t.x + t.r)) + 12,
  z0: Math.min(...TEMPLE_TOWERS.map((t) => t.z - t.r)) - 12,
  z1: Math.max(...TEMPLE_TOWERS.map((t) => t.z + t.r)) + 12,
};
/** How far out from that area they ease back down to their own heights: long, so the climb is gentle. */
export const LIFT_FADE = 110;
const SOFT = 3;

/**
 * A high current's height y (over the street) at (x, z), lifted over the Temple towers: at least
 * LIFT_Y over their area, easing back to its own height over LIFT_FADE round it. Smooth everywhere
 * (a soft maximum, a smoothstep fade), so a flock climbs and comes down without a jolt.
 */
export function currentLift(x: number, z: number, y: number): number {
  const lx = planX(x);
  const lz = wrap(z, TILE_Z);
  const A = LIFT_AREA;
  const dx = Math.max(A.x0 - lx, 0, lx - A.x1);
  const dz = Math.max(A.z0 - lz, 0, lz - A.z1);
  if (dx >= LIFT_FADE || dz >= LIFT_FADE) return y;
  const d = Math.hypot(dx, dz);
  if (d >= LIFT_FADE) return y;
  const s = 1 - d / LIFT_FADE;
  const w = s * s * (3 - 2 * s);
  const u = LIFT_Y - y;
  return y + (w * (u + Math.sqrt(u * u + SOFT * SOFT))) / 2;
}
