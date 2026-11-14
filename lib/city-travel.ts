/*
 * Fast travel in the City of Dreams (docs/specs/art-city.md, "Quarter starts and fast travel"): a
 * start on every quarter's best road, and the spots the map's places lead to. Pure: no three.js,
 * no DOM; the flight itself (the short hop there) lives in lib/city.ts.
 *
 * 2026-11-14: "ability to go to main street or main starting point of each quarter. so there is a
 * special road on each quarter that has a great view etc..." and "from map i can click to the diff
 * spots and fast travel."
 *
 * Each start stands over a street, raised to about the roofs (clear of every wall, the collision's
 * own `blocked`), facing down the road toward the quarter's view: for a quarter with a landmark,
 * the street running to its plaza from the band's far edge, the landmark straight ahead; for the
 * Canals, over the middle canal from the tile's edge toward the avenue; for the Neon market, in
 * the Neon Canyon's long run (lib/city-canyon.ts) looking up it to the bend. Positions are
 * tile-local; the city repeats every TILE_X across and TILE_Z along, and a trip goes to the copy
 * nearest the ship.
 */

import type { Vec3 } from './bigbang';
import { CANYON_PATH } from './city-canyon';
import {
  BAND_ROWS,
  BANDS,
  blocked,
  DISTRICTS,
  type DistrictId,
  districtAt,
  LANDMARKS,
} from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND, TILE_X, TILE_Z } from './city-grid';
import type { MapGo } from './city-minimap';
import { ATLANTIS_NAME, MOUTH, SPEEDWAY_NAME } from './city-speedway';

/**
 * Where a trip ends: the ship's position and its heading (yaw: 0 flies -z, π/2 flies -x); with
 * `realm`, on through the speedway's gate it lands at, into Atlantis.
 */
export type TravelSpot = { pos: Vec3; yaw: number; realm?: 'atlantis' };
/** A quarter's start: its district, its name, and the point it looks at (tile-local x, z). */
export type QuarterStart = TravelSpot & { d: DistrictId; name: string; view: [number, number] };

/** The heading (yaw) that flies from a to b, level. */
export const yawToward = (a: [number, number], b: [number, number]) =>
  Math.atan2(-(b[0] - a[0]), -(b[1] - a[1]));

/** How high a start stands over the street: about the roofs, a little under the tall ones. */
export const START_HEIGHT = 50;

/** The lowest clear point at (x, z) from `y` up, in steps of 4 (never inside a wall). */
function clearAt(x: number, y: number, z: number): Vec3 {
  for (let h = y; h < GROUND + 400; h += 4) if (!blocked([x, h, z])) return [x, h, z];
  return [x, GROUND + 400, z];
}

/** A start at (x, z) raised START_HEIGHT and clear, looking at `view`. */
function startAt(d: DistrictId, x: number, z: number, view: [number, number]): QuarterStart {
  return {
    d,
    name: DISTRICTS[d].name,
    pos: clearAt(x, GROUND + START_HEIGHT, z),
    yaw: yawToward([x, z], view),
    view,
  };
}

/** The band a district's land lies in (the first, for Chinatown and the Green Code, both sides). */
const bandOf = (d: DistrictId) => BANDS.findIndex((b) => b[0] === d || b[1] === d);

/**
 * The start of a quarter with a landmark: on the street through its plaza, six short of the band's
 * far edge (where the plan's next band begins), the landmark straight ahead some 130 away.
 */
function landmarkStart(d: DistrictId): QuarterStart {
  const l = LANDMARKS.find((m) => m.d === d && m.kind !== 'race');
  if (!l) throw new Error(`no landmark in ${d}`);
  const z = (bandOf(d) + 1) * BAND_ROWS * BLOCK_Z - 6;
  return startAt(d, l.x, z, [l.x, l.z]);
}

/** The Canals: over the middle canal, in from the tile's edge, looking along it to the avenue. */
function canalsStart(): QuarterStart {
  const z = (bandOf('canals') * BAND_ROWS + 4) * BLOCK_Z;
  return startAt('canals', 6 * BLOCK_X - 6, z, [0, z]);
}

/**
 * The Neon market: in the Neon Canyon, near the foot of its long run (the Green Code's edge),
 * looking up between its walls to the bend.
 */
function marketStart(): QuarterStart {
  const [bx, bz] = CANYON_PATH[2] as [number, number];
  const [, endZ] = CANYON_PATH[3] as [number, number];
  return startAt('market', bx, endZ - 12, [bx, bz]);
}

/**
 * Every quarter's start, in the plan's order down the avenue: Chinatown, the Indian quarter,
 * Istanbul, the Heights, the Canals, the golden gardens, the temples, the industrial quarter, the
 * domes, Egypt, the Neon market and the Green Code.
 */
export const QUARTER_STARTS: QuarterStart[] = BANDS.flatMap(([l, r]) => (l === r ? [l] : [l, r]))
  .filter((d, i, all) => all.indexOf(d) === i)
  .map((d) => (d === 'canals' ? canalsStart() : d === 'market' ? marketStart() : landmarkStart(d)));

/** A quarter's start. */
export const quarterStart = (d: DistrictId) =>
  QUARTER_STARTS.find((q) => q.d === d) as QuarterStart;

/** The quarter `step` on from the one at (x, z), round the plan's order ([ and ] while flying). */
export function hopFrom(x: number, z: number, step: 1 | -1): QuarterStart {
  const i = QUARTER_STARTS.findIndex((q) => q.d === districtAt(x, z));
  const n = QUARTER_STARTS.length;
  return QUARTER_STARTS[(((i + step) % n) + n) % n] as QuarterStart;
}

/** The copy of tile-local point p nearest `near` (the city repeats across and along). */
export function nearestCopy(p: Vec3, near: Vec3): Vec3 {
  return [
    p[0] + Math.round((near[0] - p[0]) / TILE_X) * TILE_X,
    p[1],
    p[2] + Math.round((near[2] - p[2]) / TILE_Z) * TILE_Z,
  ];
}

/**
 * Where a place on the map leads (tile-local x, z, `y` its height over the street): a quarter's
 * start when the place is what that start looks at (a landmark, the Neon Canyon), or else a clear
 * point some way back from it along a street, a little over its height, facing it.
 */
export function placeSpot(x: number, z: number, y: number): TravelSpot {
  const start = QUARTER_STARTS.find((q) => Math.hypot(q.view[0] - x, q.view[1] - z) < 1);
  if (start) return start;
  const h = GROUND + Math.min(120, Math.max(START_HEIGHT, y + 16));
  // Back along +z first (so it faces up the city, the way the ship flies), then the other ways.
  for (const back of [60, 40, 90]) {
    for (const [dx, dz] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as [number, number][]) {
      const px = x + dx * back;
      const pz = z + dz * back;
      if (!blocked([px, h, pz])) return { pos: [px, h, pz], yaw: yawToward([px, pz], [x, z]) };
    }
  }
  return { pos: clearAt(x, h, z + 60), yaw: 0 };
}

/**
 * The speedway's start (2026-11-14): over the avenue some 50 short of the mouth, at 60, facing
 * north up the lane; and Atlantis: the same road's gate, on through it to Atlantis's arrival.
 */
export const SPEEDWAY_SPOT: TravelSpot = { pos: [0, GROUND + 60, MOUTH.zIn + 50], yaw: 0 };
export const ATLANTIS_SPOT: TravelSpot = {
  pos: [0, GROUND + 60, MOUTH.zGate + 4],
  yaw: 0,
  realm: 'atlantis',
};

/** Where a tap on the map leads: a quarter's start, the speedway, Atlantis, or a place's spot. */
export const spotFor = (go: MapGo): TravelSpot => {
  if ('d' in go) return quarterStart(go.d);
  if (go.name === SPEEDWAY_NAME) return SPEEDWAY_SPOT;
  if (go.name === ATLANTIS_NAME) return ATLANTIS_SPOT;
  return placeSpot(go.x, go.z, go.y);
};
