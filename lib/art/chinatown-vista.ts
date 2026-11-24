/**
 * The views out of the canyon. Pure: no three.js, no DOM.
 *
 * - **The lake arcade** (望湖廊, 2026-11-24: "also in main china road add a whole part left that is
 *   below the buildings in a whole area with a wider view to the left"): once after each Undertown,
 *   the shophouses on the left of the street stand up on red columns over the road's left side:
 *   you drive under them, a deck of buildings overhead, columns receding along the edge, and past
 *   the columns the wall of the street is gone. A terrace opens to a balustrade and beyond it, far
 *   below, the lake and the big city on its far shore (lib/art/lake-city.ts), mirrored in the
 *   water. The right side stays the canyon.
 * - **The overlooks** (2026-11-24: "a view over a beautiful city in the distance"): at the top of a
 *   long climb the canyon parts on one side: no buildings for a few hundred metres, the hillside
 *   falling away to a balustrade, the lake and a city across it (lib/art/chinatown-lap.ts
 *   LAP_OVERLOOK). Sightlines first: nothing stands or crosses there.
 * The road itself is unchanged: its walls hold you, nothing stands on it.
 */

import { CHINA_LAP, LAP_OVERLOOK, LAP_UNDER, OVERLOOK } from './chinatown-lap';
import { LOWER_TO } from './chinatown-paths';

export const VISTA = {
  /** How long the arcade runs (m), and where after each Undertown run starts: FROM m after it
   * (clear of its underpass). */
  LENGTH: 600,
  FROM: LOWER_TO + 60,
  CLEAR: 60,
  /** The deck of buildings: its underside this high over the street (m), from DECK_IN m inside
   * the road's left edge out to the columns' outer row DEEP m past it. */
  DECK: 9.5,
  SLAB: 1.2,
  DECK_IN: 4,
  DEEP: 14,
  /** The columns: their rows (m past the road's left edge) and how far apart along. */
  COLS: [1.6, 14] as const,
  STEP: 9,
  /** The terrace past the columns to the balustrade (m past the road's edge). */
  RAIL: 18,
} as const;

export type VistaKind = 'arcade' | 'overlook';

export interface Vista {
  kind: VistaKind;
  /** Where it starts (m along the road) and how long it runs. */
  start: number;
  length: number;
  /** The side it opens on: +1 left, -1 right. */
  side: 1 | -1;
  /** Its count along the road (for its city's seed): lap by lap, in order within a lap. */
  k: number;
}

/** The lap's views, m into the lap, in order. */
const LAP_VISTAS: readonly Omit<Vista, 'k'>[] = [
  ...LAP_UNDER.map((u) => ({
    kind: 'arcade' as const,
    start: u + VISTA.FROM,
    length: VISTA.LENGTH,
    side: 1 as const,
  })),
  ...LAP_OVERLOOK.map(([a, side]) => ({
    kind: 'overlook' as const,
    start: a,
    length: OVERLOOK,
    side,
  })),
].sort((a, b) => a.start - b.start);

/** Every view overlapping [s0, s1). */
export function vistasBetween(s0: number, s1: number): Vista[] {
  const out: Vista[] = [];
  if (!(s1 > s0)) return out;
  for (let n = Math.max(0, Math.floor(s0 / CHINA_LAP) - 1); n * CHINA_LAP < s1; n++)
    LAP_VISTAS.forEach((v, i) => {
      const start = n * CHINA_LAP + v.start;
      if (start < s1 && start + v.length > s0)
        out.push({ ...v, start, k: n * LAP_VISTAS.length + i });
    });
  return out;
}

/** The view s is in and how far into it, or null. */
export function vistaAt(s: number): { v: Vista; x: number } | null {
  if (!Number.isFinite(s)) return null;
  const v = vistasBetween(s, s + 1e-6)[0];
  return v ? { v, x: s - v.start } : null;
}

/** Metres into the lake arcade s is in (0 to LENGTH), or null (not in an arcade). */
export function vistaLocal(s: number): number | null {
  const a = vistaAt(s);
  return a && a.v.kind === 'arcade' ? a.x : null;
}

/** Whether a view (on `side`, or either) runs anywhere within w of s. */
export function nearVista(s: number, w: number, side?: 1 | -1): boolean {
  return vistasBetween(s - w, s + w + 1e-6).some((v) => side === undefined || v.side === side);
}
