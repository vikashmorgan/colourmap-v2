import { afterEach, describe, expect, it } from 'vitest';

import { makeParticles, type Vec3 } from './bigbang';
import {
  flier,
  gauges,
  PHASES,
  pieceAt,
  pieceBackground,
  pieceCamera,
  placeShip,
  setFly,
  tally,
  travelTo,
} from './city';
import { atlantisItems, atlantisPlan, realmBlocked } from './city-atlantis-rings';
import { avenueSpans, bandOfRow } from './city-avenue';
import { blocked, blockTower } from './city-game';
import { GROUND, type Item, TILE_X, TILE_Z } from './city-grid';
import { cityMapData } from './city-minimap';
import { resetSharks, sharksShowing } from './city-sharks';
import {
  ARRIVAL_Z,
  arrivalStep,
  enterAtlantis,
  inAtlantis,
  LANE_LEN,
  LANE_TOP,
  laneBlocked,
  laneHalf,
  laneItems,
  lanePhase,
  leaveAtlantis,
  lightSpeed,
  MOUTH,
  mouthCrossed,
  mouthItems,
  PUSH,
  pushAt,
  resetSpeedway,
  speedwayStep,
  WELCOME_FADE,
  WELCOME_HOLD,
  welcomedAt,
  welcomeGlow,
  welcomeItem,
} from './city-speedway';
import { ATLANTIS_SPOT, SPEEDWAY_SPOT, spotFor } from './city-travel';

/*
 * 2026-11-14: "a speed tunnel to Atlantis ... one deep lane between two tall walls, with space to
 * fly ... tunnels along it, and lights that flash and stream in the ship's direction, faster than
 * the ship" and "Welcome to Atlantis" once on entering.
 */

const ship = PHASES.findIndex((p) => p.id === 'ship');
const dt = 1 / 30;

afterEach(() => {
  setFly(false, [], 0, 0);
  resetSpeedway();
  resetSharks();
});

/** Flies piloted from q heading north with `keys` until `done`, or `limit` seconds; the time it ended. */
function flyFrom(q: Vec3, keys: string[], done: () => boolean, limit: number, t0 = 5): number {
  setFly(true, [], 1 / 60, t0);
  placeShip(q, 0);
  let t = t0;
  for (; t < t0 + limit; t += dt) {
    setFly(true, keys, dt, t + dt);
    if (done()) break;
  }
  return t;
}

describe('the speedway’s mouth, over the avenue at the plan’s north end', () => {
  it('is clear to fly: nothing solid of the city between its walls, in any copy of the tile', () => {
    for (const [cx, cz] of [
      [0, 0],
      [TILE_X * 3, -TILE_Z * 2],
    ] as [number, number][])
      for (let z = MOUTH.zGate; z <= MOUTH.zIn; z += 2)
        for (let x = -MOUTH.half + 1; x <= MOUTH.half - 1; x += 1.5)
          for (let y = MOUTH.deck; y <= MOUTH.top; y += 6)
            expect(blocked([cx + x, y, cz + z])).toBe(false);
  });

  it('keeps the avenue’s bridges out of its lane (they stay under the deck, or in the rows past it)', () => {
    for (let J = 0; J < 3; J++) {
      expect(bandOfRow(J).b).toBe(0);
      for (const sp of avenueSpans(0, J, blockTower)) expect(sp.y).toBeLessThan(MOUTH.deck - 4);
    }
    // Chinatown still has its bridges further down its stretch.
    let spans = 0;
    for (let J = 3; J < 8; J++) spans += avenueSpans(0, J, blockTower).length;
    expect(spans).toBeGreaterThan(4);
  });

  it('opens only northward, through its gate, between the deck and the top', () => {
    const z = MOUTH.zGate;
    expect(mouthCrossed([0, GROUND + 60, z + 1], [0, GROUND + 60, z - 1])).toEqual({
      ox: 0,
      oz: z,
    });
    expect(
      mouthCrossed([TILE_X, GROUND + 60, z + TILE_Z + 1], [TILE_X, GROUND + 60, z + TILE_Z - 1]),
    ).toEqual({ ox: TILE_X, oz: z + TILE_Z });
    // Southward, under the deck (the autopilot's cruise), over the top, or beside it: no.
    expect(mouthCrossed([0, GROUND + 60, z - 1], [0, GROUND + 60, z + 1])).toBeNull();
    expect(mouthCrossed([0, GROUND + 21, z + 1], [0, GROUND + 21, z - 1])).toBeNull();
    expect(mouthCrossed([0, MOUTH.top + 5, z + 1], [0, MOUTH.top + 5, z - 1])).toBeNull();
    expect(
      mouthCrossed([MOUTH.half + 2, GROUND + 60, z + 1], [MOUTH.half + 2, GROUND + 60, z - 1]),
    ).toBeNull();
  });

  it('draws its walls of streaming light and its gate near the eye', () => {
    const out: Item[] = [];
    mouthItems([0, GROUND + 60, MOUTH.zIn + 60], [0, 0, -1], 3, out);
    expect(out.length).toBeGreaterThanOrEqual(4);
    const o = [0, 0, 0, 0, 0, 0];
    for (const it of out)
      for (let s = 0; s < it.count; s += 5) {
        if (!it.site(s, o)) continue;
        expect(Math.abs(o[0] as number)).toBeLessThanOrEqual(MOUTH.half + 0.01);
        expect(o[2] as number).toBeGreaterThanOrEqual(MOUTH.zGate - 0.01);
        expect(o[2] as number).toBeLessThanOrEqual(MOUTH.zIn + 0.01);
      }
  });
});

describe('the lane to Atlantis', () => {
  it('is one deep lane between two tall walls, with room to fly, and clear of every building', () => {
    for (let z = -20; z > -LANE_LEN + 80; z -= 10) {
      expect(2 * laneHalf(z)).toBeGreaterThanOrEqual(12);
      if (z < -100) expect(2 * laneHalf(z)).toBeGreaterThanOrEqual(40);
      expect(laneBlocked([0, GROUND + 60, z])).toBe(false);
      expect(laneBlocked([laneHalf(z) + 1, GROUND + 60, z])).toBe(true);
      expect(laneBlocked([0, LANE_TOP + 2, z])).toBe(true);
      for (let x = -laneHalf(z) + 2; x < laneHalf(z) - 2; x += 3)
        for (let y = GROUND + 3; y < LANE_TOP; y += 12) expect(realmBlocked([x, y, z])).toBe(false);
    }
    // No building grain of Atlantis inside the lane.
    const P = atlantisPlan();
    for (const tw of P.towers) expect(tw.z + tw.r * 1.3).toBeLessThan(-LANE_LEN);
    for (const d of P.domes) expect(d.c[2] + d.r).toBeLessThan(-LANE_LEN);
    const out: Item[] = [];
    atlantisItems([0, GROUND + 60, -300], [0, 0, -1], 7, out);
    const o = [0, 0, 0, 0, 0, 0];
    for (const it of out)
      for (let s = 0; s < it.count; s += Math.max(3, Math.floor(it.count / 150)))
        if (it.site(s, o)) expect(o[2] as number).toBeLessThan(-LANE_LEN + 2);
  });

  it('pushes your pace (keys still steer and slow you), and its lights always outrun you', () => {
    expect(pushAt([0, GROUND + 60, -300], true)).toBeCloseTo(1 + PUSH, 6);
    expect(pushAt([0, GROUND + 60, -LANE_LEN - 100], true)).toBe(1);
    expect(pushAt([0, GROUND + 60, (MOUTH.zGate + MOUTH.zIn) / 2], false)).toBeGreaterThan(1);
    expect(pushAt([0, GROUND + 10, (MOUTH.zGate + MOUTH.zIn) / 2], false)).toBe(1);
    expect(pushAt([3 * 26, GROUND + 60, 500], false)).toBe(1);
    for (const v of [0, 9, 30, 80, 200]) expect(lightSpeed(v)).toBeGreaterThan(1.5 * v + 10);
    // The phase runs on smoothly with the speed: never a jump.
    const a = lanePhase();
    speedwayStep(dt, 60);
    expect(lanePhase() - a).toBeCloseTo(lightSpeed(60) * dt, 6);
  });

  it('streams its lights north (the ship’s way) and lights its tunnels’ arches', () => {
    const eye: Vec3 = [0, GROUND + 40, -60];
    const zsAt = (phase: number) => {
      speedwayStep(phase, 0);
      const out: Item[] = [];
      laneItems(eye, [0, 0, -1], 1, out);
      const wall = out[0] as Item;
      const o = [0, 0, 0, 0, 0, 0];
      wall.site(0, o);
      return o[2] as number;
    };
    // The first streak's head moves north (z falls) as the phase runs on.
    const z0 = zsAt(0);
    const z1 = zsAt(1 / 12);
    expect(z1).toBeLessThan(z0);
    const out: Item[] = [];
    laneItems([0, GROUND + 40, -100], [0, 0, -1], 1, out);
    expect(out.length).toBeGreaterThan(6);
  });
});

describe('flying to Atlantis', () => {
  it('goes north through the gate into the lane, straight on, and lights the welcome once', () => {
    const t = flyFrom([0, GROUND + 60, MOUTH.zIn + 20], [' '], inAtlantis, 12);
    expect(inAtlantis()).toBe(true);
    const { c } = flier(t + dt);
    // Straight on: just past the gate, in the lane's middle.
    expect(c[2]).toBeLessThan(1);
    expect(c[2]).toBeGreaterThan(-60);
    expect(Math.abs(c[0])).toBeLessThan(MOUTH.half);
    expect(pieceBackground(ship)).not.toBeNull();
    expect(gauges().find((g) => g.label === 'District')?.text).toBe('Atlantis');
    expect(Number.isNaN(welcomedAt())).toBe(true);
    // On down the lane: arriving lights the welcome, and the sharks join.
    let s = t + dt;
    for (; s < t + 40; s += dt) {
      setFly(true, [' '], dt, s + dt);
      if (!Number.isNaN(welcomedAt())) break;
    }
    expect(welcomedAt()).toBeGreaterThan(0);
    expect(flier(s).c[2]).toBeLessThan(ARRIVAL_Z + 1);
    expect(sharksShowing()).toBe(true);
    expect(tally()).toBe('');
  });

  it('shows the welcome once in a session: glowing, then gone, never again', () => {
    enterAtlantis(0, MOUTH.zGate);
    expect(welcomeGlow(1)).toBe(0);
    expect(arrivalStep([0, GROUND + 50, ARRIVAL_Z - 1], 10)).toBe(true);
    expect(arrivalStep([0, GROUND + 50, ARRIVAL_Z - 2], 11)).toBe(false);
    expect(welcomeGlow(10.1)).toBeGreaterThan(0);
    expect(welcomeGlow(13)).toBeGreaterThan(0.95);
    expect(welcomeItem([0, GROUND + 60, ARRIVAL_Z], 13)).not.toBeNull();
    expect(welcomeGlow(10 + WELCOME_HOLD + WELCOME_FADE + 0.01)).toBe(0);
    expect(
      welcomeItem([0, GROUND + 60, ARRIVAL_Z], 10 + WELCOME_HOLD + WELCOME_FADE + 1),
    ).toBeNull();
    // Out and back in: the sharks come again, the welcome does not.
    leaveAtlantis();
    enterAtlantis(0, MOUTH.zGate);
    expect(arrivalStep([0, GROUND + 50, ARRIVAL_Z - 1], 60)).toBe(true);
    expect(welcomedAt()).toBe(10);
    expect(welcomeGlow(61)).toBe(0);
  });

  it('never traps you: back south out of the lane’s start brings you home to the mouth', () => {
    let t = flyFrom([0, GROUND + 60, MOUTH.zIn + 20], [' '], inAtlantis, 12) + dt;
    expect(inAtlantis()).toBe(true);
    // Turned round in the lane, flying south: out of its start, home.
    placeShip([0, GROUND + 60, -30], Math.PI);
    const end = t + 15;
    for (; t < end && inAtlantis(); t += dt) setFly(true, [], dt, t + dt);
    expect(inAtlantis()).toBe(false);
    const { c } = flier(t);
    expect(Math.abs(c[0])).toBeLessThan(MOUTH.half);
    expect(c[2]).toBeGreaterThan(MOUTH.zGate - 1);
    expect(blocked(c)).toBe(false);
  });

  it('is on the map: the speedway and Atlantis, both fast-travel spots', () => {
    const places = cityMapData().places;
    const sp = places.find((p) => p.name === 'Speedway to Atlantis');
    const at = places.find((p) => p.name === 'Atlantis');
    expect(sp).toBeDefined();
    expect(at).toBeDefined();
    expect(spotFor({ x: 0, z: 0, y: 0, name: 'Speedway to Atlantis' })).toBe(SPEEDWAY_SPOT);
    expect(spotFor({ x: 0, z: 0, y: 0, name: 'Atlantis' })).toBe(ATLANTIS_SPOT);
    expect(blocked(SPEEDWAY_SPOT.pos)).toBe(false);
    // The middle north: the map's top middle.
    expect(Math.abs(sp?.x ?? 99)).toBeLessThan(1);
    expect(sp?.z ?? 999).toBeLessThan(TILE_Z / 10);
    // Atlantis from the map: a short trip to the gate, then on to Atlantis's arrival.
    setFly(true, [], 1 / 60, 5);
    placeShip([0, GROUND + 50, 900], 0);
    travelTo(ATLANTIS_SPOT);
    let t = 5;
    for (; t < 8; t += dt) setFly(true, [], dt, t + dt);
    expect(inAtlantis()).toBe(true);
    for (; t < 12; t += dt) setFly(true, [], dt, t + dt);
    expect(welcomedAt()).toBeGreaterThan(0);
    // And the map takes you home from there.
    travelTo(SPEEDWAY_SPOT);
    expect(inAtlantis()).toBe(false);
  });

  it('keeps to the grain budget in Atlantis: every grain finite, the sharks within their share', () => {
    const ps = makeParticles(6500);
    let t = flyFrom([0, GROUND + 60, MOUTH.zIn + 20], [' '], inAtlantis, 12) + dt;
    placeShip([0, GROUND + 70, ARRIVAL_Z + 20], 0);
    let lit = 0;
    let sharks = 0;
    let finite = true;
    for (let f = 0; f < 8; f++) {
      t += 0.5;
      setFly(true, [' '], 0.5, t);
      pieceCamera(ship, t);
      lit = 0;
      sharks = 0;
      for (const p of ps) {
        const s = pieceAt(p, ship, t);
        finite &&= s.pos.every(Number.isFinite) && s.rgb.every(Number.isFinite);
        const on = s.rgb[0] + s.rgb[1] + s.rgb[2] > 0.004;
        if (on) lit++;
        if (on && p.i % 100 >= 15 && p.i % 100 < 26) sharks++;
      }
    }
    expect(finite).toBe(true);
    expect(inAtlantis()).toBe(true);
    expect(sharksShowing()).toBe(true);
    // The city's pool fills with Atlantis; the sharks keep to the traffic's eleven in a hundred.
    expect(lit).toBeGreaterThan(2000);
    expect(lit).toBeLessThanOrEqual(ps.length);
    expect(sharks).toBeGreaterThan(200);
    expect(sharks).toBeLessThanOrEqual(Math.ceil(ps.length * 0.11));
  });
});
