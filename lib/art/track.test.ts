import { describe, expect, it } from 'vitest';

import {
  BANK_MAX,
  bankFor,
  bump,
  CANYON,
  CANYON_ARCHES,
  CANYON_PIPE,
  CANYON_RANGE,
  CHINATOWN,
  COAST,
  COAST_CLIFF,
  COAST_GATE,
  COAST_RAIL,
  canyonDepth,
  canyonHalf,
  canyonWallU,
  collideTrack,
  frameAt,
  GOLDEN,
  GOLDEN_BANK,
  GOLDEN_HALF,
  gateAt,
  groundAt,
  heightAt,
  keyed,
  lipAt,
  makeTrack,
  makeTrackWorld,
  NEON_TRACK,
  NIGHT,
  newRace,
  PIPE_TOP,
  passes,
  pipeAt,
  pipeReach,
  pointAt,
  project,
  RACE,
  SKY,
  SKY_LAP,
  SKY_LEVELS,
  skyWallU,
  stepCanyonRace,
  stepKmRace,
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

describe('the Golden Track', () => {
  it('bends tighter and banks steeper than the other tracks, and never crosses itself', () => {
    const t = makeTrack(GOLDEN);
    let most = 0;
    let bank = 0;
    const pts: { x: number; y: number }[] = [];
    for (let s = 0; s <= 7200; s += 10) {
      most = Math.max(most, Math.abs(GOLDEN.curv(s)));
      bank = Math.max(bank, Math.abs(frameAt(t, s).bank));
      pts.push(pointAt(t, s, 0));
    }
    expect(1 / most).toBeLessThan(150);
    expect(bank).toBeCloseTo(GOLDEN_BANK, 2);
    expect(GOLDEN_BANK).toBeGreaterThan(BANK_MAX);
    // Points more than 300 m apart along the road stay apart across it.
    let near = Infinity;
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 30; j < pts.length; j++)
        near = Math.min(near, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
    expect(near).toBeGreaterThan(GOLDEN_HALF * 2 + 10);
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
    const off = pointAt(t, 500, canyonHalf(500) + 8);
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
    const hit = collideTrack(world, v);
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

  it('is very wide and clear: nothing stands on it (2026-11-17)', () => {
    for (let s = 0; s < 5000; s += 25) expect(canyonHalf(s)).toBeGreaterThanOrEqual(18);
    const world = makeTrackWorld(CANYON);
    for (let s = RACE.start; s < RACE.finish; s += 10) {
      for (const u of [-15, 0, 15]) {
        const p = pointAt(world.track, s, u);
        world.track.hint = s;
        const v = newVehicle(
          'car',
          p.x,
          p.y,
          frameAt(world.track, s).h,
          heightAt(world.track, s, u),
        );
        expect(collideTrack(world, v)).toBeNull();
      }
    }
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

describe('every road keeps you on it (2026-11-17)', () => {
  // "create it so the car stays on track, on the road"; "so the car doesn't drift excessively and
  // lose control all the time". Full throttle for 30 s, hands off, then the keys slammed left and
  // right every 0.7 s: never off the road, never a spin, never slowed to a crawl.
  for (const def of [COAST, CANYON, NIGHT, CHINATOWN, NEON_TRACK, SKY]) {
    for (const kind of ['car', 'ship'] as const) {
      for (const hands of ['off', 'slammed'] as const) {
        it(`${def.id}, ${kind}, keys ${hands}`, () => {
          const world = makeTrackWorld(def);
          const f = frameAt(world.track, 5);
          const v = newVehicle(kind, f.x, f.y, f.h, f.e);
          let worst = -99;
          let slowest = 1e9;
          let slip = 0;
          for (let i = 0; i < 60 * 30; i++) {
            const t = i / 60;
            const steer = hands === 'off' ? 0 : Math.floor(t / 0.7) % 2 ? 1 : -1;
            stepVehicle(v, { throttle: 1, steer, boost: 0 }, 1 / 60, world, t);
            if (t < 8) continue;
            const { s, u } = project(world.track, v.x, v.y);
            // In the canyon the edge is a quarter-pipe you may ride up: free up to its top.
            worst = Math.max(worst, Math.abs(u) - def.half(s) - pipeReach(world.track, s));
            slowest = Math.min(slowest, speedOf(v));
            slip = Math.max(slip, Math.abs(v.slip));
          }
          // On the road (or its pipe), at most onto the first of its curled-up edge.
          expect(worst).toBeLessThan(2);
          expect(slowest).toBeGreaterThan(40);
          expect(slip).toBeLessThan(0.25);
        });
      }
    }
  }

  it('curves the canyon edges up into the walls with no corner anywhere (2026-11-19)', () => {
    expect(pipeAt(0, 16)).toBe(0);
    expect(pipeAt(-3, 16)).toBe(0);
    // Smooth: the slope grows steadily, with no jump, from flat at the edge to steep at the top.
    let prev = 0;
    for (let d = 0.25; d < 22; d += 0.25) {
      const slope = (pipeAt(d + 0.01, 16) - pipeAt(d - 0.01, 16)) / 0.02;
      expect(slope).toBeGreaterThanOrEqual(prev - 1e-6);
      expect(slope - prev).toBeLessThan(0.5);
      prev = slope;
    }
    expect(pipeAt(16 * PIPE_TOP, 16)).toBeGreaterThan(10);
    // In the canyon: no lip, the pipe's full curve, and the rock beyond its top.
    const w = makeTrackWorld(CANYON);
    const s = 2500;
    const half = canyonHalf(s);
    expect(CANYON.lip(s)).toBe(0);
    expect(heightAt(w.track, s, half + 12) - heightAt(w.track, s, half)).toBeCloseTo(
      pipeAt(12, CANYON_PIPE),
      1,
    );
    expect(canyonWallU(s)).toBeGreaterThan(half + CANYON_PIPE * PIPE_TOP);
  });

  it('lets you ride high up a canyon wall, and gravity brings you back down', () => {
    const w = makeTrackWorld(CANYON);
    const s = 2500;
    w.track.hint = s;
    const f = frameAt(w.track, s);
    // At 250 km/h along the road, the left key held 2.5 s into the wall, then let go.
    const v = newVehicle('car', f.x, f.y, f.h, heightAt(w.track, s, 0));
    v.vx = Math.cos(f.h) * 70;
    v.vy = Math.sin(f.h) * 70;
    let highest = 0;
    let slowest = 1e9;
    let back = false;
    for (let i = 0; i < 60 * 6; i++) {
      stepVehicle(v, { throttle: 1, steer: i < 150 ? 1 : 0, boost: 0 }, 1 / 60, w, i / 60);
      const pipe = groundAt(w.track, v.x, v.y).road?.pipe ?? 0;
      highest = Math.max(highest, pipe);
      slowest = Math.min(slowest, speedOf(v));
      if (highest > 0.6 && pipe === 0) back = true;
    }
    // High up the curve, never over its top, down on the road again, and never slowed.
    expect(highest).toBeGreaterThan(0.6);
    expect(highest).toBeLessThanOrEqual(1);
    expect(back).toBe(true);
    expect(slowest).toBeGreaterThan(50);
  });

  it('banks gently, so a bend never throws you up its outside', () => {
    expect(BANK_MAX).toBeLessThanOrEqual(0.2);
    for (const def of [COAST, CANYON, NIGHT, CHINATOWN, NEON_TRACK, SKY])
      expect(def.bankMax).toBe(BANK_MAX);
  });
});

describe('Sky Canyon (2026-11-19)', () => {
  it('runs on forever in long left and right bends, deep and wide, with pipes and tall walls', () => {
    const w = makeTrackWorld(SKY);
    let left = 0;
    let right = 0;
    let tightest = 0;
    for (let s = 0; s < 30000; s += 20) {
      const k = SKY.curv(s);
      if (k > 0.001) left++;
      if (k < -0.001) right++;
      tightest = Math.max(tightest, Math.abs(k));
    }
    expect(left).toBeGreaterThan(50);
    expect(right).toBeGreaterThan(50);
    // Long turns: never tighter than a 250 m radius.
    expect(1 / tightest).toBeGreaterThan(250);
    const far = frameAt(w.track, 25000);
    expect(Number.isFinite(far.x)).toBe(true);
    // Walls far taller than the highest flying height, standing at the top of the pipes.
    const walls = SKY.walls(1234);
    expect(walls.left?.height).toBeGreaterThan(SKY_LEVELS[2] + 60);
    expect(walls.left?.u).toBe(skyWallU());
    expect(SKY.pipe?.(100)).toBeGreaterThan(0);
  });

  it('times a lap door to door', () => {
    let r = newRace();
    r = stepKmRace(r, SKY_LAP - 5, SKY_LAP + 5, 0, 30, 10, SKY_LAP);
    expect(r.start).toBe(10);
    r = stepKmRace(r, 2 * SKY_LAP - 5, 2 * SKY_LAP + 5, 0, 30, 85, SKY_LAP);
    expect(r.last).toBe(75);
  });
});
