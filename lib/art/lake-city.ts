/**
 * The lake and the city on its far shore (2026-11-24: "THAT DISTANT LAKE AND REFLECTION AWESOME FOR
 * THE DOUBLE SIDE STUFF. THAT'S WHERE U BUILD THE BIG CITY IN THE DISTANCE"). Pure: no three.js.
 *
 * Around each Undertown, right of the street, the underpass's void opens onto a lake
 * (lib/art/chinatown-paths.ts), and across it stands a big city: a skyline of lit towers, tallest
 * in the middle, mirrored in the water. On top you look out over it; flipped under in Undertown it
 * hangs over your head, city and reflection changing places. Laid out in the road's frame at one
 * point (AT m into the run): `a` along the road's heading there, `b` out to the right (m), so the
 * far shore never folds round the road's bends.
 */

import { underRunAt, underStart } from './undertown';

export const LAKE_CITY = {
  /** Where along each Undertown run the city faces (m from the run's start). */
  AT: 490,
  /** The water: from NEAR to FAR + SHORE m out from the road's centre at AT, LENGTH m along. */
  NEAR: 150,
  FAR: 620,
  SHORE: 220,
  LENGTH: 1700,
  /** The lake's level (m; the underpass's void floor is 12 m under the street's datum). */
  LEVEL: -12.4,
  /** The towers: how many, how deep their band behind the far shore (m), how tall (m). */
  TOWERS: 72,
  BAND: 170,
  LOW: 45,
  HIGH: 240,
} as const;

export interface LakeTower {
  /** Along the road's heading at the anchor, and out to the right (m), from the anchor. */
  a: number;
  b: number;
  /** Half its width along and across, its height (m). */
  w: number;
  d: number;
  h: number;
  /** Its light: an index into the city's tones; and whether it wears a lit crown. */
  tone: number;
  crown: boolean;
}

function hash(n: number, k: number): number {
  const s = Math.sin(n * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Where along the road the city of Undertown run k faces (m). */
export function lakeAnchor(k: number): number {
  return underStart(k) + LAKE_CITY.AT;
}

/** The Undertown run whose lake city is nearest s, or null off the road (before its start). */
export function lakeNear(s: number): number | null {
  if (!(s >= 0)) return null;
  const k0 = underRunAt(s - LAKE_CITY.AT);
  const ks = [k0, k0 + 1].filter((k) => k >= 0);
  return ks.reduce((a, b) => (Math.abs(s - lakeAnchor(b)) < Math.abs(s - lakeAnchor(a)) ? b : a));
}

/**
 * The towers of run k's city: spread along the far shore, the tallest in the middle and fewer,
 * lower ones toward its ends (a skyline, not a wall), the nearer row lower so the taller stand
 * over it. The same every time.
 */
export function lakeTowers(k: number): LakeTower[] {
  const { TOWERS, FAR, BAND, LOW, HIGH, LENGTH } = LAKE_CITY;
  const out: LakeTower[] = [];
  for (let i = 0; i < TOWERS; i++) {
    const r = (j: number) => hash(k * 101 + i, j);
    // Along: denser in the middle.
    const x = (i + r(1) * 0.8) / TOWERS - 0.5;
    const a = Math.sign(x) * Math.abs(2 * x) ** 1.3 * (LENGTH * 0.42);
    const depth = r(2);
    const b = FAR + 25 + depth * BAND;
    const bell = Math.exp(-((a / (LENGTH * 0.22)) ** 2));
    const h = LOW + (HIGH - LOW) * bell * (0.45 + 0.55 * r(3)) * (0.7 + 0.3 * depth);
    out.push({
      a,
      b,
      w: 7 + r(4) * 10,
      d: 7 + r(5) * 9,
      h,
      tone: Math.floor(r(6) * 4),
      crown: h > 120 && r(7) < 0.6,
    });
  }
  return out;
}
