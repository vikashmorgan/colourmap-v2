/**
 * The lake arcade (望湖廊, 2026-11-24: "also in main china road add a whole part left that is below
 * the buildings in a whole area with a wider view to the left"). Pure: no three.js, no DOM.
 *
 * Once between each Undertown and the next fork, where no balcony road runs, the shophouses on the
 * left of the street stand up on red columns over the road's left side: you drive under them, a
 * deck of buildings overhead, columns receding along the edge, and past the columns the wall of
 * the street is gone. A terrace opens to a balustrade and beyond it, far below, the lake and the
 * big city on its far shore (lib/art/lake-city.ts), mirrored in the water. The right side stays
 * the canyon. The road itself is unchanged: its walls hold you, nothing stands on it.
 */

import { BALCONY, BALCONY_LENGTH, balconyAtCrest, LOWER_TO } from './chinatown-paths';
import { UNDER } from './undertown';

export const VISTA = {
  /** How long the arcade runs (m), and the free stretch it is placed in: from FROM to TO m after
   * each Undertown run starts (clear of its underpass and of the next fork), CLEAR m clear of any
   * balcony road. */
  LENGTH: 600,
  FROM: LOWER_TO + 60,
  TO: UNDER.EVERY - 1000 - 60,
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
  /** The terrace past the columns to the balustrade (m past the road's left edge). */
  RAIL: 18,
} as const;

/** Whether the balcony road at crest n comes within CLEAR m of [a, b]. */
function nearBalcony(a: number, b: number): boolean {
  const n0 = Math.floor((a - BALCONY_LENGTH - BALCONY.CREST) / BALCONY.PERIOD);
  for (
    let n = Math.max(0, n0);
    n * BALCONY.PERIOD + BALCONY.CREST - BALCONY.KICK <= b + VISTA.CLEAR;
    n++
  ) {
    if (!balconyAtCrest(n)) continue;
    const c = n * BALCONY.PERIOD + BALCONY.CREST;
    if (c + BALCONY_LENGTH >= a - VISTA.CLEAR && c - BALCONY.KICK <= b + VISTA.CLEAR) return true;
  }
  return false;
}

/** Where the arcade after Undertown run k starts (m along the road), or null where no balcony-free
 * stretch of its length fits. The earliest that fits, on a 20 m grid. */
export function vistaStart(k: number): number | null {
  if (k < 0) return null;
  const run = UNDER.AT + k * UNDER.EVERY;
  for (let a = run + VISTA.FROM; a + VISTA.LENGTH <= run + VISTA.TO; a += 20)
    if (!nearBalcony(a, a + VISTA.LENGTH)) return a;
  return null;
}

/** Metres into the arcade s is in (0 to LENGTH), or null. */
export function vistaLocal(s: number): number | null {
  if (!Number.isFinite(s)) return null;
  const k = Math.floor((s - UNDER.AT - VISTA.FROM) / UNDER.EVERY);
  const a = vistaStart(k);
  if (a === null || s < a || s >= a + VISTA.LENGTH) return null;
  return s - a;
}

/** Whether the arcade runs anywhere within w of s. */
export function nearVista(s: number, w: number): boolean {
  return [-w, 0, w].some((d) => vistaLocal(s + d) !== null);
}
