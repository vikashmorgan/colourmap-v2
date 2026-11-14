/*
 * The plazas round the temples and unique buildings, composed as one design (docs/specs/art-city.md,
 * "Alive quarters", 2026-11-14): "infrastructure around temples and unique buildings: curving roads,
 * ramps and bridges. Plazas around them composed as one design with collective reflection, not block
 * next to block."
 *
 * Every landmark's plaza and every big square gets the same composition round its centre, in its
 * quarter's tones: a ring road on the ground with a dashed line down its middle; a still pool round
 * the building's foot with rings spreading out from it (the reflection everyone shares) and paving
 * rays joining pool and road; an elevated ring walkway over them at 22, two ramps curving up to it
 * from the road in opposite quarters, and four bridges in from the ring to a halo round the
 * building. Everything stands inside the four open blocks, off the crossing streets' lanes (the
 * ramps climb in the quarters between them; the ring and the bridges cross the lanes' lines at 22,
 * seven clear of the nearest). Light only: you fly through it. Pure: no three.js, no DOM.
 */

import type { Vec3 } from './bigbang';
import { type Ahead, quarterTones } from './city-alive-base';
import { GROUND, type Item, mixId, nearest, TAU, TILE_X, TILE_Z } from './city-grid';
import { type StrokeSet, Strokes, strokeItem } from './city-strokes';

const G = GROUND;

/** A plaza's centre, tile-local, and its quarter. */
export type PlazaSpot = { x: number; z: number; d: string };

/** The composition's sizes: the ring road's half widths (x, z), the ring walkway's, its height. */
export const PLAZA = { roadX: 21, roadZ: 27, ringX: 17.5, ringZ: 23, ringY: 22, pool: 8, halo: 9 };

let built: StrokeSet | null = null;
/** The composition round (0, 0), built once: every plaza places it at its centre. */
export function plazaSet(): StrokeSet {
  if (built) return built;
  const S = new Strokes(0.9);
  const ell =
    (rx: number, rz: number, y: number) =>
    (u: number): Vec3 => [Math.cos(u * TAU) * rx, G + y, Math.sin(u * TAU) * rz];
  // The ring road: its two edges, a dashed line down its middle.
  S.curve(ell(PLAZA.roadX - 1.4, PLAZA.roadZ - 1.4, 0.15), 64, 2, 0.12);
  S.curve(ell(PLAZA.roadX + 1.4, PLAZA.roadZ + 1.4, 0.15), 64, 2, 0.12);
  for (let i = 0; i < 48; i++) {
    const f = ell(PLAZA.roadX, PLAZA.roadZ, 0.15);
    S.line(f(i / 48), f((i + 0.4) / 48), 1, 0.22, 0.5);
  }
  // The pool and its rings, spreading out: the reflection.
  S.curve(ell(PLAZA.pool, PLAZA.pool, 0.1), 40, 0, 0.24);
  for (const r of [10.5, 13, 15.5]) S.curve(ell(r, r * 1.15, 0.08), 40, 2, 0.08 + (16 - r) * 0.01);
  // Paving rays from the pool to the road, between the streets.
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * TAU;
    S.line(
      [Math.cos(a) * PLAZA.pool, G + 0.1, Math.sin(a) * PLAZA.pool],
      [Math.cos(a) * (PLAZA.roadX - 1.6), G + 0.1, Math.sin(a) * (PLAZA.roadZ - 1.6)],
      2,
      0.1,
    );
  }
  // The ring walkway: its deck's two edges, a rail, lamps.
  const Y = PLAZA.ringY;
  S.curve(ell(PLAZA.ringX - 1, PLAZA.ringZ - 1, Y), 64, 0, 0.26);
  S.curve(ell(PLAZA.ringX + 1, PLAZA.ringZ + 1, Y), 64, 0, 0.26);
  S.curve(ell(PLAZA.ringX + 1, PLAZA.ringZ + 1, Y + 1.1), 64, 0, 0.16);
  for (let i = 0; i < 24; i++) S.dot(ell(PLAZA.ringX, PLAZA.ringZ, Y + 0.1)(i / 24), 1, 0.5);
  // Two ramps from the road, curving up through opposite quarters to the ring.
  for (const q of [0, 2]) {
    const a0 = (q * Math.PI) / 2 + 0.2;
    const a1 = (q * Math.PI) / 2 + Math.PI / 2 - 0.2;
    const at = (u: number, side: number, dy: number): Vec3 => {
      const a = a0 + (a1 - a0) * u;
      const rx = PLAZA.roadX - 1.2 + side;
      const rz = PLAZA.roadZ - 1.2 + side;
      // Eased up: level where it leaves the road, level where it meets the ring.
      const y = Y * (0.5 - 0.5 * Math.cos(Math.PI * u));
      return [Math.cos(a) * rx, G + 0.3 + y * ((Y - 0.3) / Y) + dy, Math.sin(a) * rz];
    };
    for (const side of [-0.9, 0.9]) S.curve((u) => at(u, side, 0), 24, 0, 0.24);
    S.curve((u) => at(u, 0.9, 1.1), 24, 0, 0.14);
    // Where it meets the ring: a short landing in to it.
    const a = a1;
    for (const side of [-0.9, 0.9])
      S.line(
        [
          Math.cos(a) * (PLAZA.roadX - 1.2) + side * Math.sin(a),
          G + Y,
          Math.sin(a) * (PLAZA.roadZ - 1.2) - side * Math.cos(a),
        ],
        [
          Math.cos(a) * PLAZA.ringX + side * Math.sin(a),
          G + Y,
          Math.sin(a) * PLAZA.ringZ - side * Math.cos(a),
        ],
        0,
        0.24,
      );
  }
  // Four bridges in from the ring to the halo round the building, on the diagonals.
  for (let i = 0; i < 4; i++) {
    const a = ((i + 0.5) / 4) * TAU;
    const c = Math.cos(a);
    const s = Math.sin(a);
    for (const side of [-0.8, 0.8]) {
      S.line(
        [c * PLAZA.halo - s * side, G + Y, s * PLAZA.halo + c * side],
        [c * (PLAZA.ringX - 1) - s * side, G + Y, s * (PLAZA.ringZ - 1) + c * side],
        0,
        0.22,
      );
    }
  }
  S.curve(ell(PLAZA.halo, PLAZA.halo, Y), 40, 1, 0.3);
  S.curve(ell(PLAZA.halo, PLAZA.halo, Y + 1.1), 40, 0, 0.16);
  built = S.build();
  return built;
}

/** The plazas within sight. */
export function plazaItems(
  eye: Vec3,
  t: number,
  R: number,
  spots: PlazaSpot[],
  ahead: Ahead,
  out: Item[],
) {
  const S = plazaSet();
  const ox0 = nearest(0, eye[0], TILE_X);
  spots.forEach((p, pi) => {
    for (const ox of [ox0 - TILE_X, ox0, ox0 + TILE_X]) {
      const x = ox + p.x;
      if (Math.abs(x - eye[0]) > R + 30) continue;
      const z = nearest(p.z, eye[2], TILE_Z);
      if (Math.abs(z - eye[2]) > R + 30) continue;
      if (!ahead(x, z, 34) && eye[1] < G + 80) continue;
      const it = strokeItem(
        S,
        x,
        z,
        quarterTones(p.d, t, pi),
        1,
        eye,
        t,
        mixId(pi + 51, Math.round(z)),
        1.6,
        0.2,
      );
      if (it.d < R) out.push(it);
    }
  });
}
