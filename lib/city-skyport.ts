/*
 * The flying stations and the ring parcours in the game (docs/specs/art-city.md, "Flying stations
 * and rings of light", the finish of 2026-11-14): their marks on the map, the spots a tap on them
 * travels to, docking at a station, and the fireworks kept off them. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "finish the sky stations": the map shows the fifteen stations and the parcours, a
 * tap on one flies there, and flown slowly into a station's middle the ship docks: it settles and
 * holds gently, the station's lights warm; any steering or boost undocks.
 */

import type { RGB, Vec3 } from './bigbang';
import { DISTRICTS } from './city-game';
import { GROUND, TILE_X, TILE_Z } from './city-grid';
import type { MapPlace } from './city-minimap';
import { PARCOURS_R, parcoursAt, parcoursRings } from './city-rings';
import {
  resetStationWarmth,
  STATIONS,
  setStationWarm,
  stationCentre,
  stationModel,
} from './city-stations';
import type { TravelSpot } from './city-travel';

/* ---------- travel spots ---------- */

/** How far out from a station's reach a trip to it ends, facing it. */
export const STATION_STANDOFF = 30;

/**
 * Where a trip to station i ends (tile-local): level with its middle, out past its reach on its
 * +z side, facing it (flying -z, the way the ship flies up the city).
 */
export function stationSpot(i: number): TravelSpot {
  const st = STATIONS[i] ?? (STATIONS[0] as (typeof STATIONS)[number]);
  const back = stationModel(st).r + STATION_STANDOFF;
  return { pos: [st.x, GROUND + st.h, st.z + back], yaw: 0 };
}

/**
 * The parcours' start (tile-local): on its curve a little past the first ring, facing that ring's
 * middle, so flying on (up the city, -z) goes straight through it and on down the chain.
 */
export function parcoursStart(): TravelSpot {
  const G = parcoursRings();
  const a = (G[0] as (typeof G)[number]).c;
  const b = (G[1] as (typeof G)[number]).c;
  const p = parcoursAt(a[2] + 0.6 * (b[2] - a[2]));
  return { pos: p, yaw: Math.atan2(-(a[0] - p[0]), -(a[2] - p[2])) };
}

/** Where a sky mark on the map leads: a station's spot, or the parcours' start. */
export const skySpot = (key: number | 'parcours'): TravelSpot =>
  key === 'parcours' ? parcoursStart() : stationSpot(key);

/* ---------- on the map ---------- */

/**
 * The share of their height the sky's marks stand at in the 3D map, so the stations and the
 * parcours (200 to 450 over the street) read as a layer over the towers and stay in the frame.
 */
export const SKY_MAP_K = 0.45;

/** The fifteen stations and the parcours' start as places on the map, each tapped to fly there. */
export function skyPlaces(): MapPlace[] {
  const out: MapPlace[] = STATIONS.map((st, i) => ({
    kind: 'sky',
    name: st.name,
    x: st.x,
    z: st.z,
    y: st.h * SKY_MAP_K,
    colour: DISTRICTS[st.d].colour,
    go: { sky: i, name: st.name },
  }));
  const s = parcoursStart().pos;
  const name = 'Ring parcours';
  out.push({
    kind: 'parcours',
    name,
    x: s[0],
    z: s[2],
    y: (s[1] - GROUND) * SKY_MAP_K,
    colour: [1, 0.78, 0.45] as RGB,
    go: { sky: 'parcours', name },
  });
  return out;
}

/** The parcours' curve over one turn of the plan, for a faint dotted line: x, z, its map height. */
export function parcoursLine(step = 16): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let z = 0; z <= TILE_Z; z += step) {
    const p = parcoursAt(z);
    out.push([p[0], p[2], (p[1] - GROUND) * SKY_MAP_K]);
  }
  return out;
}

/* ---------- docking ---------- */

/** How near a station's middle docks, and how slow the ship must be (under its cruise). */
export const SKY_DOCK_R = 16;
export const SKY_DOCK_SPEED = 6.5;
/** Undocked, a station docks again only once the ship has been this far from its middle. */
export const SKY_DOCK_AWAY = SKY_DOCK_R * 1.5;
/** How far from the middle the ship settles at most (it eases in from where it docked). */
const SETTLE = 8;

const dock = {
  /** The station docked at (-1 none), its tile copy, and where the ship holds from its middle. */
  i: -1,
  x: 0,
  z: 0,
  off: [0, 0, 0] as Vec3,
  /** The station just left, and its copy: it docks again once the ship has left its middle. */
  away: -1,
  ax: 0,
  az: 0,
};
const hold: Vec3 = [0, 0, 0];

/** Station i's copy nearest x or z. */
const copyX = (sx: number, x: number) => sx + Math.round((x - sx) / TILE_X) * TILE_X;
const copyZ = (sz: number, z: number) => sz + Math.round((z - sz) / TILE_Z) * TILE_Z;

/** Where the docked ship holds at time t (shared, overwritten each call). */
function holdAt(t: number): Vec3 {
  const c = stationCentre(STATIONS[dock.i] as (typeof STATIONS)[number], t, dock.x, dock.z);
  hold[0] = c[0] + dock.off[0];
  hold[1] = c[1] + dock.off[1];
  hold[2] = c[2] + dock.off[2];
  return hold;
}

/**
 * A frame of the ship at pos, at speed, steering or boosting or not, at time t: docks when slow in
 * a station's middle (not the one just left), holds while docked, and undocks at any steering or
 * boost. Returns the point the docked ship eases toward (bobbing with its station), or null.
 */
export function skyDockStep(pos: Vec3, speed: number, steering: boolean, t: number): Vec3 | null {
  if (dock.i >= 0) {
    if (!steering) return holdAt(t);
    undockSky(t);
    return null;
  }
  if (dock.away >= 0) {
    const st = STATIONS[dock.away] as (typeof STATIONS)[number];
    const c = stationCentre(st, t, dock.ax, dock.az);
    if (Math.hypot(pos[0] - c[0], pos[1] - c[1], pos[2] - c[2]) > SKY_DOCK_AWAY) dock.away = -1;
  }
  if (steering || speed > SKY_DOCK_SPEED) return null;
  for (let i = 0; i < STATIONS.length; i++) {
    if (i === dock.away) continue;
    const st = STATIONS[i] as (typeof STATIONS)[number];
    const x = copyX(st.x, pos[0]);
    const z = copyZ(st.z, pos[2]);
    if (Math.abs(pos[0] - x) > SKY_DOCK_R || Math.abs(pos[2] - z) > SKY_DOCK_R) continue;
    if (Math.abs(pos[1] - GROUND - st.h) > SKY_DOCK_R + st.bob) continue;
    const c = stationCentre(st, t, x, z);
    const dx = pos[0] - c[0];
    const dy = pos[1] - c[1];
    const dz = pos[2] - c[2];
    const d = Math.hypot(dx, dy, dz);
    if (d >= SKY_DOCK_R) continue;
    const k = d > SETTLE ? SETTLE / d : 1;
    dock.i = i;
    dock.x = x;
    dock.z = z;
    dock.off[0] = dx * k;
    dock.off[1] = dy * k;
    dock.off[2] = dz * k;
    setStationWarm(i, true, t);
    return holdAt(t);
  }
  return null;
}

/** Off the station docked at, if any (steering, letting go, a trip): its lights cool slowly. */
export function undockSky(t: number) {
  if (dock.i < 0) return;
  setStationWarm(dock.i, false, t);
  dock.away = dock.i;
  dock.ax = dock.x;
  dock.az = dock.z;
  dock.i = -1;
}

/** Nothing docked, every station cold (a fresh start). */
export function resetSkyDock() {
  dock.i = -1;
  dock.away = -1;
  resetStationWarmth();
}

/** The station docked at (its index in STATIONS), or -1. */
export const skyDocked = () => dock.i;

/** The quiet words while docked: the station's name; '' otherwise. */
export const skyDockBanner = () =>
  dock.i >= 0 ? `Docked · ${(STATIONS[dock.i] as (typeof STATIONS)[number]).name}` : '';

/* ---------- the fireworks kept off them ---------- */

/** How far a burst's sparks fall over its life, at most (lib/city-fireworks.ts: 2.6 t², t ≤ 3). */
const SPARK_FALL = 24;
/** The air kept between a burst and a station or a parcours ring. */
const BURST_GAP = 6;

/**
 * Whether a firework bursting at c with sparks out to r (falling as they fade) stays off every
 * flying station (its reach, bob and all) and every parcours ring. No allocation: it runs for each
 * burst alive, every frame.
 */
export function burstClear(c: Vec3, r: number): boolean {
  const top = c[1] + r;
  const low = c[1] - r - SPARK_FALL;
  for (let i = 0; i < STATIONS.length; i++) {
    const st = STATIONS[i] as (typeof STATIONS)[number];
    const M = stationModel(st);
    const x = copyX(st.x, c[0]);
    const z = copyZ(st.z, c[2]);
    const flat = Math.hypot(c[0] - x, c[2] - z) - r - M.r;
    const lo = GROUND + st.h + M.lo - st.bob;
    const hi = GROUND + st.h + M.hi + st.bob;
    const dy = low > hi ? low - hi : top < lo ? lo - top : 0;
    if (Math.max(flat, dy) < BURST_GAP) return false;
  }
  const G = parcoursRings();
  for (let i = 0; i < G.length; i++) {
    const g = G[i] as (typeof G)[number];
    const x = copyX(g.c[0], c[0]);
    const z = copyZ(g.c[2], c[2]);
    const flat = Math.hypot(c[0] - x, c[2] - z) - r - PARCOURS_R;
    if (flat >= BURST_GAP) continue;
    const dy = low > g.c[1] + PARCOURS_R ? low - g.c[1] - PARCOURS_R : g.c[1] - PARCOURS_R - top;
    if (dy < BURST_GAP) return false;
  }
  return true;
}
