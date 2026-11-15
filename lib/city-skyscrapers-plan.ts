/*
 * Where the Temples' skyscrapers stand (docs/specs/art-city.md, "Temple skyscrapers and the
 * Skyscraper series", 2026-11-14), and how the high currents climb over them. Plain data and one
 * small formula, so lib/city-currents.ts can read it without a cycle; the towers' drawing, walls
 * and bridges are lib/city-skyscrapers.ts's. Pure: no three.js, no DOM.
 *
 * "Perspective is everything and the whole point of this city": the five stand in two files down
 * the quarter, x 117 and x 143, staggered row by row like a chessboard, so flying down it they line
 * up into views. The lantern barge (x 117, 96) sails through the gates of the file on x 117, the
 * Temples' eastern highway (86) through those of the file on x 143: two rows of frames receding.
 *
 * Kept off (2026-11-14, with the racing corridors, lib/city-corridors.ts): the corridors (x 66 to
 * 90) and the slimmed columns beside them (2 and 3), the avenue and its own columns (0, 1), and the
 * river's row and its neighbours (23 to 25), so every wall there stays where it was.
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
  /** How high the gate it stands on is (0: none, the design from the street up). */
  base: number;
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
  base = 0,
): TempleTower => ({ name, x, z: (J + 0.5) * BLOCK_Z, I, J, top, r, design, voids, base });

/** The highway gates: the Temples' eastern low-roof highway (86, lanes x 140 to 146) runs through them. */
const HIGHWAY_GATE: Void = { y0: 78, y1: 96, hw: 6, open: 'all' };

/** The barge's slot (x 117: its hull and lanterns 3.5 either side, 90 to 100 high) and the highway's. */
const BARGE_SLOT: Void = { y0: 0, y1: 110, hw: 6, open: 'z' };
const HIGHWAY_SLOT: Void = { y0: 0, y1: 100, hw: 6, open: 'z' };

/**
 * The five (2026-11-14: "a bunch of awesome unique skyscrapers ... not right next to each other"):
 * each on a block of its own in columns 4 and 5, rows 26 to 31, the blocks round it kept open, no
 * two on neighbouring blocks (each one's nearest a diagonal block away or further); inside their
 * blocks (4.5 or more from every street's middle); clear of the landmark's plaza and orbit, Ivory
 * Echo's orbit and the Domes' big square. Each taller than every tower in the quarter; the tallest
 * three taller than Ivory Echo (157) too. The Helix and the Stair stand on gates of their own.
 */
export const TEMPLE_TOWERS: TempleTower[] = [
  T('Garden of Bells', 5, 26, 143, 166, 8.5, 3, [
    HIGHWAY_GATE,
    { y0: 146, y1: 154, hw: 6, open: 'all' },
  ]),
  T('Gate of the Barge', 4, 27, 117, 158, 8.5, 10, [BARGE_SLOT]),
  T('Helix of Dawn', 5, 28, 143, 170, 8.5, 0, [HIGHWAY_SLOT], HIGHWAY_SLOT.y1),
  T('Twin Lanterns', 4, 29, 117, 162, 8.5, 4, [BARGE_SLOT]),
  T('Stair of Light', 5, 31, 143, 150, 8.5, 7, [HIGHWAY_SLOT], HIGHWAY_SLOT.y1),
];

/** The columns and rows the blocks round a tower may open in: never a corridor's or the river's. */
const OPEN_COLS = new Set([4, 5]);
const FIRST_OPEN_ROW = 26;

/** The tower standing on block (I, J) (tile-local column and row), if any. */
export function templeTowerAt(li: number, lj: number): TempleTower | null {
  return TEMPLE_TOWERS.find((t) => t.I === li && t.J === lj) ?? null;
}

/** Whether block (li, lj) is one of the blocks round a tower, kept open so you can fly round it. */
export function besideTempleTower(li: number, lj: number): boolean {
  if (!OPEN_COLS.has(li) || lj < FIRST_OPEN_ROW) return false;
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
