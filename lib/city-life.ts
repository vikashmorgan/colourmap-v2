/*
 * Life in the City of Dreams (docs/specs/art-city.md, "Life in the city", 2026-11-14): what lives
 * over the streets, gathered for the Ship's picture (lib/city.ts `gather`). Pure: no three.js, no
 * DOM.
 *
 * - Chinatown's flying lanterns and jellyfish of light (lib/city-lanterns.ts).
 * - The murmurations over the whole city, parting round the ship (lib/city-flocks.ts).
 * (The Matrix quarter's rising towers are in lib/city-rise.ts, the traffic's flow in
 * lib/city-flow.ts, the stars overhead in lib/city-stars.ts and lib/city-sky.ts.)
 *
 * Their budget: each is an item the plan deals grains to like any other, nearest first and thinned
 * with the distance, so they take a share of the pool, never all of it. At most some 1,400 lantern
 * sites and 1,200 jellyfish sites over a Chinatown stretch in full, and five flocks of 520 birds;
 * what is far off is drawn sparsely.
 */

import type { Vec3 } from './bigbang';
import { flockItems } from './city-flocks';
import type { Item } from './city-grid';
import { chinatownSkyItems } from './city-lanterns';

/** Everything alive over the city near the eye, with the ship (`c`, flying along `f`) for the flocks to part round. */
export function lifeItems(eye: Vec3, t: number, c: Vec3, f: Vec3): Item[] {
  const out: Item[] = [];
  chinatownSkyItems(eye, t, out);
  flockItems(eye, t, out, { c, f });
  return out;
}
