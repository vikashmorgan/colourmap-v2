import { afterEach, describe, expect, it } from 'vitest';

import { flier, placeShip, route, setFly, travelling, travelTo, travelWithin } from './city';
import {
  ATL_MAP,
  ATL_PLACES,
  atlFitView,
  atlFitView3D,
  atlPick,
  clampAtlView,
  drawAtlantisMap,
  projectAtl,
  ringColour,
} from './city-atlantis-map';
import { ATL_CENTRE, ATL_EDGE, fromHeart, realmBlocked } from './city-atlantis-rings';
import { blocked } from './city-game';
import { GROUND, TILE_Z, wrap } from './city-grid';
import { resetSharks, school, schoolJoin } from './city-sharks';
import { ARRIVAL_Z, inAtlantis, MOUTH, resetSpeedway } from './city-speedway';
import { ATLANTIS_SPOT, CITY_START_SPOT } from './city-travel';

/*
 * 2026-11-15: "put atlantis as map when u are in atlantis. with option to go back to big city."
 */

const dt = 1 / 30;

afterEach(() => {
  setFly(false, [], 0, 0);
  resetSpeedway();
  resetSharks();
});

/** A canvas 2D context that only counts what is drawn. */
function fakeCtx() {
  const calls = { arcs: 0, lines: 0, texts: [] as string[] };
  const ctx = {
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {
      calls.lines++;
    },
    arc: () => {
      calls.arcs++;
    },
    rect: () => {},
    fill: () => {},
    stroke: () => {},
    setLineDash: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    measureText: (s: string) => ({ width: s.length * 6 }),
    fillText: (s: string) => {
      calls.texts.push(s);
    },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

/** Into Atlantis by the map's own trip (the gate, then on to the arrival). */
function intoAtlantis(): number {
  setFly(true, [], 1 / 60, 5);
  placeShip([0, GROUND + 50, 900], 0);
  travelTo(ATLANTIS_SPOT);
  let t = 5;
  for (; t < 8; t += dt) setFly(true, [], dt, t + dt);
  expect(inAtlantis()).toBe(true);
  return t;
}

describe('Atlantis’s map', () => {
  it('covers Atlantis: the lane from its gate to the far edge past the heart', () => {
    expect(ATL_MAP.z1).toBeGreaterThan(0);
    expect(ATL_MAP.z0).toBeLessThanOrEqual(ATL_CENTRE[2] - ATL_EDGE);
    expect(ATL_MAP.x1 - ATL_MAP.x0).toBeGreaterThanOrEqual(2 * ATL_EDGE);
    // Flat, its whole ground on a phone's screen and on a computer's.
    for (const [w, h] of [
      [390, 760],
      [1280, 720],
    ] as [number, number][]) {
      for (const v of [atlFitView(w, h), atlFitView3D(w, h)])
        for (const [x, z] of [
          [0, 0],
          [0, ATL_CENTRE[2]],
          [ATL_EDGE, ATL_CENTRE[2]],
          [-ATL_EDGE, ATL_CENTRE[2]],
          [0, ATL_CENTRE[2] - ATL_EDGE],
        ] as [number, number][]) {
          const [sx, sy] = projectAtl(v, w, h, x, 0, z);
          expect(sx).toBeGreaterThanOrEqual(0);
          expect(sx).toBeLessThanOrEqual(w);
          expect(sy).toBeGreaterThanOrEqual(0);
          expect(sy).toBeLessThanOrEqual(h);
        }
    }
    // A view dragged away stays over Atlantis.
    const far = clampAtlView({ tilt: 3, yaw: 0, zoom: 99, cx: 5000, cz: 5000 });
    expect(far.cx).toBe(ATL_MAP.x1);
    expect(far.cz).toBe(ATL_MAP.z1);
    expect(far.zoom).toBeLessThanOrEqual(12);
    // Teal at the rim, warming to gold toward the heart.
    expect(ringColour(0)[2]).toBeGreaterThan(ringColour(5)[2]);
    expect(ringColour(5)[0]).toBeGreaterThan(ringColour(0)[0]);
  });

  it('draws the rings, towers, domes and spirals, its places’ names, and you', () => {
    const { ctx, calls } = fakeCtx();
    const shown = drawAtlantisMap(
      ctx,
      atlFitView(390, 760),
      390,
      760,
      { x: 0, y: 60, z: -300, heading: 0 },
      1,
    );
    expect(calls.arcs).toBeGreaterThan(150);
    expect(calls.lines).toBeGreaterThan(500);
    expect(calls.texts).toContain('You · 60 m');
    expect(shown.length).toBeGreaterThan(2);
    for (const l of shown) expect(l.place).toBeDefined();
    // Tilted too.
    const tilted = fakeCtx();
    drawAtlantisMap(tilted.ctx, atlFitView3D(1280, 720), 1280, 720, null, 1);
    expect(tilted.calls.arcs).toBeGreaterThan(150);
  });

  it('flies to a place tapped on it, by its name or its mark', () => {
    const v = atlFitView(390, 760);
    const { ctx } = fakeCtx();
    const shown = drawAtlantisMap(ctx, v, 390, 760, null, 1);
    const named = shown[0];
    expect(named).toBeDefined();
    if (!named?.place) return;
    expect(atlPick(shown, v, 390, 760, { x: named.x + 4, y: named.y })).toBe(named.place);
    for (const p of ATL_PLACES) {
      const [sx, sy] = projectAtl(v, 390, 760, p.x, 0, p.z);
      const got = atlPick([], v, 390, 760, { x: sx + 1, y: sy });
      expect(got).not.toBeNull();
      expect(Math.hypot((got?.x ?? 0) - p.x, (got?.z ?? 0) - p.z)).toBeLessThan(80);
    }
    expect(atlPick([], v, 390, 760, { x: 2, y: 2 })).toBeNull();
  });

  it('lands each place’s spot clear of every tower, dome and wall, inside the edge', () => {
    expect(ATL_PLACES.map((p) => p.name)).toEqual([
      'The gate',
      'Arrival',
      'Heart of Atlantis',
      'North domes',
      'East domes',
      'South domes',
      'West domes',
    ]);
    for (const p of ATL_PLACES) {
      expect(realmBlocked(p.spot.pos)).toBe(false);
      expect(p.spot.pos[2]).toBeLessThan(0);
      if (p.kind !== 'gate' && p.kind !== 'arrival')
        expect(fromHeart(p.spot.pos)).toBeLessThan(560);
    }
  });

  it('flies within Atlantis from its map, staying on its ground', () => {
    let t = intoAtlantis();
    const heart = ATL_PLACES.find((p) => p.kind === 'heart');
    if (!heart) throw new Error('no heart');
    travelWithin(heart.spot);
    expect(travelling()).toBe(true);
    for (let end = t + 2; t < end; t += dt) setFly(true, [], dt, t + dt);
    expect(travelling()).toBe(false);
    expect(inAtlantis()).toBe(true);
    const { c } = flier(t);
    expect(Math.hypot(c[0] - heart.spot.pos[0], c[2] - heart.spot.pos[2])).toBeLessThan(15);
    expect(c[2]).toBeLessThan(ARRIVAL_Z);
    expect(realmBlocked(c)).toBe(false);
  });
});

describe('back to the city from Atlantis’s map', () => {
  it('is the Ship’s own start, on the opening road, facing up the avenue', () => {
    const r = route(0).c;
    expect(CITY_START_SPOT.pos[0]).toBeCloseTo(r[0], 6);
    expect(CITY_START_SPOT.pos[1]).toBeCloseTo(r[1], 0);
    expect(CITY_START_SPOT.pos[2]).toBeCloseTo(wrap(r[2], TILE_Z), 6);
    expect(CITY_START_SPOT.yaw).toBe(0);
    expect(blocked(CITY_START_SPOT.pos)).toBe(false);
  });

  it('leaves Atlantis (the sharks gone, the realm reset) and lands there, piloted', () => {
    let t = intoAtlantis();
    // The sharks swimming beside you, then home.
    schoolJoin(flier(t).c, [0, 0, -1], t);
    expect(school.mode).toBe('follow');
    travelTo(CITY_START_SPOT);
    expect(inAtlantis()).toBe(false);
    expect(school.mode).toBe('away');
    expect(school.vis).toBe(0);
    for (let end = t + 2; t < end && travelling(); t += dt) setFly(true, [], dt, t + dt);
    expect(travelling()).toBe(false);
    expect(inAtlantis()).toBe(false);
    const { c } = flier(t);
    // The copy of the start nearest the gate you came through.
    expect(Math.abs(wrap(c[2], TILE_Z) - CITY_START_SPOT.pos[2])).toBeLessThan(2);
    expect(Math.abs(c[2] - MOUTH.zGate)).toBeLessThan(TILE_Z / 2);
    expect(blocked(c)).toBe(false);
  });
});
