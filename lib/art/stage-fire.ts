/**
 * Drive: the start's stage fire (2026-11-22: "the start a 3 2 1 go with big fire shooting on all
 * sides in spectacular fashion. symmetric and well designed stage fire works"). Pure: where the
 * burners stand along the grid and which count fires which, so the show can be tested; the engine
 * draws it (components/drive/stage-fire.ts).
 *
 * Four burner pairs stand on both edges of the road, mirror images across it, from the grid up
 * the road ahead. On "3" the nearest pair fires a column of flame, on "2" the next, on "1" the
 * next, so the fire runs away up the road with the count; on GO every pair roars at once, taller,
 * the farthest tallest, and gold sparks arc in from both sides to cross over the road.
 */

import { BEAT, LIGHTS } from './race-intro';

/** The burners' places along the road from the gantry (m): from beside the grid up the road ahead,
 * all in the crane's shot. */
export const STAGE_ALONG = [-6, 10, 26, 42] as const;
/** How far out from the road's edge the burners stand (m). */
export const STAGE_OUT = 1.5;

/** A burst: which count fires it (0, 1, 2 the three lights, 3 GO), how tall, how long. */
export interface Burst {
  beat: number;
  height: number;
  life: number;
  sparks: boolean;
}

export interface Jet {
  /** Along the road from the gantry (m). */
  along: number;
  /** Across: +1 left, -1 right. */
  side: 1 | -1;
  bursts: Burst[];
}

/** Every burner, both sides, with its bursts. */
export function stageJets(): Jet[] {
  const out: Jet[] = [];
  STAGE_ALONG.forEach((along, i) => {
    for (const side of [1, -1] as const) {
      const bursts: Burst[] = [];
      // The three lights fire the nearest three pairs in turn.
      if (i < LIGHTS) bursts.push({ beat: i, height: 16, life: 0.9, sparks: false });
      // GO: everything, the farthest pair tallest, sparks from every pair.
      bursts.push({
        beat: LIGHTS,
        height: i === STAGE_ALONG.length - 1 ? 34 : 24,
        life: 1.8,
        sparks: true,
      });
      out.push({ along, side, bursts });
    }
  });
  return out;
}

/** When a count's burst starts, in seconds after the click (the first light lights at the click). */
export function beatTime(beat: number): number {
  return beat * BEAT;
}
