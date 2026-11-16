import { describe, expect, it } from 'vitest';

import {
  bankFor,
  bump,
  CANYON,
  CANYON_ARCHES,
  CANYON_HAZARDS,
  CANYON_OBSTACLES,
  CANYON_RANGE,
  COAST,
  COAST_CLIFF,
  COAST_GATE,
  COAST_RAIL,
  canyonDepth,
  canyonHalf,
  collideTrack,
  frameAt,
  gateAt,
  groundAt,
  hazardU,
  heightAt,
  keyed,
  lipAt,
  makeTrack,
  makeTrackWorld,
  NIGHT,
  newRace,
  passes,
  pointAt,
  project,
  RACE,
  stepCanyonRace,
  stepKmRace,
  toSegment,
  window01,
} from './track';
import { G, newVehicle, speedOf, stepVehicle } from './vehicle';

describe('banking', () => {
  it('raises the outside of every bend, more the tighter it is, up to a limit', () => {
    // A left bend (positive curvature) banks the road so its right side (u < 0) is higher.
    expect(bankFor(1 / 300, 55, 0.6)).toBeGreaterThan(0);
    expect(bankFor(-1 / 300, 55, 0.6)).toBeLessThan(0);
    expect(bankFor(1 / 150, 55, 0.6)).toBeGreaterThan(bankFor(1 / 300, 55, 0.6));
    expect(bankFor(1, 55, 0.6)).toBe(0.6);
    // Banked just right, gravity holds the design speed round the bend.
    const k = 1 / 600;
    expect(Math.tan(bankFor(k, 55, 0.6)) * G).toBeCloseTo(k * 55 * 55, 6);
  });

  it('lifts the left edge on a right-hand bend and the right edge on a left-hand one', () => {
    const t = makeTrack(CANYON);
    // 500 m in: the sweeping right-hander.
    expect(frameAt(t, 500).k).toBeLessThan(0);
    expect(heightAt(t, 500, 9)).toBeGreaterThan(heightAt(t, 500, -9));
    // 1,100 m in: the left-hander.
    expect(frameAt(t, 1100).k).toBeGreaterThan(0);
    expect(heightAt(t, 1100, -9)).toBeGreaterThan(heightAt(t, 1100, 9));
  });

  it('curls the last metres of the road up into a lip', () => {
    expect(lipAt(0, 12, 1)).toBe(0);
    expect(lipAt(9.5, 12, 1)).toBe(0);
    expect(lipAt(12, 12, 1)).toBeCloseTo(1);
    expect(lipAt(-11, 12, 1)).toBeGreaterThan(0);
  });
});

describe('the centre line', () => {
  it('traces from the curvature and finds its way back to road coordinates', () => {
    const t = makeTrack(COAST);
    for (const s of [0, 137, 900, 2500, 7777]) {
      for (const u of [-10, 0, 6]) {
        const p = pointAt(t, s, u);
        const q = project(t, p.x, p.y, s + 15);
        expect(q.s).toBeCloseTo(s, 2);
        expect(q.u).toBeCloseTo(u, 2);
      }
    }
  });

  it('keeps going (Coast Road is endless)', () => {
    const t = makeTrack(COAST);
    const far = frameAt(t, 50_000);
    expect(Number.isFinite(far.x)).toBe(true);
    // 2 m steps: about the length travelled.
    const a = pointAt(t, 10_000, 0);
    const b = pointAt(t, 10_100, 0);
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThan(95);
  });

  it('gives the ground its height and slope for the physics', () => {
    const t = makeTrack(CANYON);
    const p = pointAt(t, 500, 6);
    const g = groundAt(t, p.x, p.y);
    expect(g.h).toBeCloseTo(heightAt(t, 500, 6), 3);
    // On the right-hander the bank rises to the left: the slope points left of the road.
    const f = frameAt(t, 500);
    const left = { x: -Math.sin(f.h), y: Math.cos(f.h) };
    expect(g.gx * left.x + g.gy * left.y).toBeGreaterThan(0.1);
    expect(g.rough).toBe(0);
    const off = pointAt(t, 500, 20);
    expect(groundAt(t, off.x, off.y).rough).toBe(1);
  });
});

describe('shapes', () => {
  it('bumps, windows and keyframes', () => {
    expect(bump(100, 100, 5, 30)).toBe(5);
    expect(bump(130, 100, 5, 30)).toBe(0);
    expect(window01(0, 10, 100, 20)).toBe(0);
    expect(window01(50, 10, 100, 20)).toBe(1);
    expect(
      keyed(
        [
          [0, 0],
          [10, 1],
        ],
        5,
      ),
    ).toBe(0.5);
    expect(
      keyed(
        [
          [0, 0],
          [10, 1],
        ],
        20,
      ),
    ).toBe(1);
  });
});

describe('Coast Road', () => {
  it('is wide, with a rail on the sea side and the cliff on the other', () => {
    const w = COAST.walls(100);
    expect(COAST.half(0)).toBeGreaterThanOrEqual(12);
    expect(w.left?.u).toBe(COAST_RAIL);
    expect(w.right?.u).toBe(COAST_CLIFF);
  });

  it('holds you in at the rail without a crash', () => {
    const world = makeTrackWorld(COAST);
    const p = pointAt(world.track, 300, COAST_RAIL + 0.5);
    const v = newVehicle('ship', p.x, p.y, 0, heightAt(world.track, 300, COAST_RAIL));
    world.track.hint = 300;
    const hit = collideTrack(world, v, 0);
    expect(hit).not.toBeNull();
    // Pushed back toward the road.
    const f = frameAt(world.track, 300);
    expect((hit?.nx ?? 0) * -Math.sin(f.h) + (hit?.ny ?? 0) * Math.cos(f.h)).toBeLessThan(0);
  });

  it('times each kilometre between gates', () => {
    let r = newRace();
    r = stepKmRace(r, 999, 1001, 0, 12, 10);
    expect(r.start).toBe(10);
    r = stepKmRace(r, 1999, 2001, 0, 12, 40);
    expect(r).toMatchObject({ last: 30, best: 30, start: 40 });
    // Round the gate outside its posts: nothing.
    expect(stepKmRace(r, 2999, 3001, 30, 12, 70)).toBe(r);
    expect(COAST_GATE).toBe(1000);
  });
});

describe('Night Rain', () => {
  it('banks its bends and lifts you over its crests', () => {
    const t = makeTrack(NIGHT);
    expect(NIGHT.elev(600)).toBeGreaterThan(NIGHT.elev(400));
    expect(NIGHT.elev(1100)).toBeLessThan(NIGHT.elev(900));
    let banked = 0;
    for (let s = 0; s < 1500; s += 50) banked = Math.max(banked, Math.abs(frameAt(t, s).bank));
    expect(banked).toBeGreaterThan(0.15);
  });
});

describe('Canyon Race', () => {
  it('is the same course every time', () => {
    const a = makeTrack(CANYON);
    const b = makeTrack(CANYON);
    expect(pointAt(a, 4000, 0)).toEqual(pointAt(b, 4000, 0));
  });

  it('runs through a canyon with narrow passages and two arches', () => {
    expect(canyonDepth(500)).toBe(0);
    expect(canyonDepth((CANYON_RANGE[0] + CANYON_RANGE[1]) / 2)).toBe(1);
    expect(canyonHalf(2050)).toBeLessThan(canyonHalf(1800));
    expect(CANYON.walls(2500).left).not.toBeNull();
    expect(CANYON.walls(500).left).toBeNull();
    for (const s of CANYON_ARCHES) expect(canyonDepth(s)).toBe(1);
  });

  it('has crests that launch you and dips', () => {
    const crest = CANYON.elev(3550);
    expect(crest).toBeGreaterThan(5);
    expect(CANYON.elev(2480)).toBeLessThan(-3);
  });

  it('puts every obstacle on or by the road, and hazards that drift across it', () => {
    for (const o of CANYON_OBSTACLES) {
      expect(Math.abs(o.u)).toBeLessThanOrEqual(canyonHalf(o.s));
      expect(o.s).toBeGreaterThan(RACE.start);
      expect(o.s).toBeLessThan(RACE.finish);
    }
    const h = CANYON_HAZARDS[0];
    expect(hazardU(h, 0)).toBeCloseTo(h.u0 + h.amp * Math.sin(h.phase));
    expect(Math.abs(hazardU(h, h.period / 4) - h.u0)).toBeCloseTo(h.amp, 5);
  });

  it('costs speed and spins you when you hit a boulder, and lets you fly over it', () => {
    const world = makeTrackWorld(CANYON);
    const o = world.placed[0];
    world.track.hint = o.o.s;
    const v = newVehicle('car', o.x - 0.5, o.y, 0, o.base);
    const hit = collideTrack(world, v, 0);
    expect(hit).not.toBeNull();
    expect(hit?.loss).toBeGreaterThan(0.2);
    expect(Math.abs(hit?.spin ?? 0)).toBeGreaterThan(1);
    v.z = o.base + o.o.height + 1;
    expect(collideTrack(world, v, 0)).toBeNull();
  });

  it('measures distance to a ridge', () => {
    expect(toSegment(0, 1, -1, 0, 1, 0).d).toBeCloseTo(1);
    expect(toSegment(3, 0, -1, 0, 1, 0).d).toBeCloseTo(2);
  });

  it('starts at the start, needs every checkpoint and stops at the finish', () => {
    const gates = [RACE.start, ...RACE.checkpoints, RACE.finish];
    let r = newRace(100);
    let t = 0;
    for (const g of gates) {
      t += 10;
      r = stepCanyonRace(r, g - 1, g + 1, 0, 11, t);
    }
    expect(r).toMatchObject({ start: null, last: 50, best: 50, record: true });
    // Skipping a checkpoint: the finish does not count.
    let s = stepCanyonRace(newRace(), RACE.start - 1, RACE.start + 1, 0, 11, 0);
    s = stepCanyonRace(s, RACE.finish - 1, RACE.finish + 1, 0, 11, 30);
    expect(s.last).toBeNull();
    expect(passes(10, 20, 0, 11, 15)).toBe(true);
    expect(passes(10, 20, 20, 11, 15)).toBe(false);
  });

  it('places its gates across the road', () => {
    const t = makeTrack(CANYON);
    const g = gateAt(t, RACE.start);
    expect(Math.hypot(g.bx - g.ax, g.by - g.ay)).toBeCloseTo(2 * (canyonHalf(RACE.start) + 2), 3);
  });

  it('can be driven: a car at full throttle down the first straight flies off the first crest', () => {
    const world = makeTrackWorld(CANYON);
    const start = pointAt(world.track, 650, 0);
    const v = newVehicle(
      'car',
      start.x,
      start.y,
      frameAt(world.track, 650).h,
      heightAt(world.track, 650, 0),
    );
    world.track.hint = 650;
    v.vx = 70 * Math.cos(v.h);
    v.vy = 70 * Math.sin(v.h);
    let flew = false;
    for (let i = 0; i < 60 * 4; i++) {
      stepVehicle(v, { throttle: 1, steer: 0, boost: 0 }, 1 / 60, world, i / 60);
      if (v.air) flew = true;
    }
    expect(flew).toBe(true);
    expect(speedOf(v)).toBeGreaterThan(40);
    expect(world.track.hint).toBeGreaterThan(820);
  });
});
