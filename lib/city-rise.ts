/*
 * The Matrix quarter's towers rising and sinking (docs/specs/art-city.md, "Life in the city").
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
 *
 * 2026-11-14, the Matrix quarter (docs/specs/art-city.md, "Matrix quarter and Neon Market"):
 * "buildings rising and sinking", more of it and more visible. Seven towers in ten move now, by
 * three tenths to over half their height, on nine to eighteen second cycles; a tower never moves
 * faster than RISE_MAX_SPEED, so a tall one's swing is held to what stays smooth (and the ship,
 * lifted by a rising roof, rides it calmly).
 */

import { hash } from './bigbang';

/** How many of the quarter's towers move: seven in ten. */
export const RISE_SHARE = 0.7;
/** The shortest and longest cycle, in seconds. */
export const RISE_MIN_PERIOD = 9;
export const RISE_MAX_PERIOD = 18;
/** The least and the deepest a moving tower sinks, as a share of its height. */
export const RISE_MIN_DROP = 0.3;
export const RISE_MAX_DROP = 0.55;
/** The fastest a roof ever rises or sinks, in units a second. */
export const RISE_MAX_SPEED = 10;

/** A code tower's own rise, from its block's number: none for the towers that stand still. */
export function codeRise(k: number): { drop: number; period: number; phase: number } | null {
  if (hash(k, 761) >= RISE_SHARE) return null;
  return {
    drop: RISE_MIN_DROP + (RISE_MAX_DROP - RISE_MIN_DROP) * hash(k, 762),
    period: RISE_MIN_PERIOD + (RISE_MAX_PERIOD - RISE_MIN_PERIOD) * hash(k, 763),
    phase: hash(k, 764),
  };
}

/**
 * A code tower's height at time t: its full height `h`, or less as it sinks, on its own cycle,
 * its swing held so the roof never moves faster than RISE_MAX_SPEED. Smooth in t.
 */
export function codeHeight(h: number, k: number, t: number): number {
  const r = codeRise(k);
  if (!r) return h;
  const sink = 0.5 - 0.5 * Math.cos(2 * Math.PI * (t / r.period + r.phase));
  // A cosine swing of A over a period P moves at most A·π/P.
  const swing = Math.min(h * r.drop, (RISE_MAX_SPEED * r.period) / Math.PI);
  return h - swing * sink;
}

/** The city's clock for the towers' walls: set by the Ship each frame and each picture it makes. */
let clock = 0;
export const setRiseClock = (t: number) => {
  clock = t;
};
export const riseClock = () => clock;
