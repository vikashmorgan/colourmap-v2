/*
 * The Green Code quarter's towers rising and sinking (docs/specs/art-city.md, "Life in the city").
 * Pure: no three.js, no DOM, and nothing from lib/city-game.ts, so the game can ask it freely.
 *
 * 2026-11-14: "for green code make that some buildings are growing up and down so it gives
 * vertical movement". Some of the quarter's towers sink slowly from their full height and grow back
 * up again, each on its own long, smooth cycle (eight to twenty seconds) and its own range: never
 * higher than the tower as it was built (so it stays under the metro and every other ceiling),
 * never lower than half of it. A cosine all the way: no jolt, no jump.
 *
 * The towers are solid, so the game's walls follow the drawn height (lib/city-game.ts `blocked`),
 * read at the city's clock here: the Ship sets it each frame, and a roof rising under the ship
 * lifts it with it (lib/city.ts), so the ship is never inside a tower.
 */

import { hash } from './bigbang';

/** How many of the quarter's towers move: a little under half. */
export const RISE_SHARE = 0.45;
/** The shortest and longest cycle, in seconds. */
export const RISE_MIN_PERIOD = 8;
export const RISE_MAX_PERIOD = 20;
/** The deepest a tower sinks, as a share of its height. */
export const RISE_MAX_DROP = 0.45;

/** A code tower's own rise, from its block's number: none for the towers that stand still. */
export function codeRise(k: number): { drop: number; period: number; phase: number } | null {
  if (hash(k, 761) >= RISE_SHARE) return null;
  return {
    drop: 0.2 + (RISE_MAX_DROP - 0.2) * hash(k, 762),
    period: RISE_MIN_PERIOD + (RISE_MAX_PERIOD - RISE_MIN_PERIOD) * hash(k, 763),
    phase: hash(k, 764),
  };
}

/**
 * A code tower's height at time t: its full height `h`, or a little less as it sinks, on its own
 * cycle. Smooth in t.
 */
export function codeHeight(h: number, k: number, t: number): number {
  const r = codeRise(k);
  if (!r) return h;
  const sink = 0.5 - 0.5 * Math.cos(2 * Math.PI * (t / r.period + r.phase));
  return h * (1 - r.drop * sink);
}

/** The city's clock for the towers' walls: set by the Ship each frame and each picture it makes. */
let clock = 0;
export const setRiseClock = (t: number) => {
  clock = t;
};
export const riseClock = () => clock;
