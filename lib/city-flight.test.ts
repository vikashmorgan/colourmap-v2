/*
 * Flight feel (docs/specs/art-city.md, "Flight feel (2026-11-13)"): "specially playability
 * navigation effects. for making city fun to fly through. smooth turn effects when u turn a lot,
 * effects behind ship for the boost. boost not too fast in the city but faster when above."
 */
import { afterEach, describe, expect, it } from 'vitest';

import { makeParticles, type Vec3 } from './bigbang';
import {
  AVENUE,
  BOOST_PACE,
  blocked,
  boostGlow,
  boostPaceAt,
  eyeIn,
  FLY_SPEED,
  flier,
  GROUND,
  gauges,
  HIGH_BOOST,
  PHASES,
  placeShip,
  STREET_BOOST,
  setFly,
} from './city';
import { engineLight, SHIPS, shipGrainAt, shipGrainColour, trailLight } from './city-ships';
import { CITY_PORTALS, enterTunnel, inSpace, resetSpace, spaceMode } from './city-space';

const k = PHASES.findIndex((p) => p.id === 'ship');
const dt = 1 / 60;
let t = 10;
const fresh = () => {
  t = 10;
  setFly(false, [], 0, t);
  setFly(true, [], dt, t);
};
const run = (keys: string[], seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    t += dt;
    setFly(true, keys, dt, t);
  }
};
const yawOf = (f: Vec3) => Math.atan2(-f[0], -f[2]);
const turnTo = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const speed = () => gauges().find((g) => g.label === 'Speed')?.value as number;
/** How far the chase eye stands off the ship's heading, seen from above (radians). */
const lag = () => {
  const { c, f } = flier(t);
  const { eye } = eyeIn(k, 0, t);
  return Math.abs(turnTo(yawOf([c[0] - eye[0], 0, c[2] - eye[2]]) - yawOf(f)));
};

afterEach(() => {
  resetSpace();
  setFly(false, [], 0, 0);
});

describe('Flight feel (2026-11-13)', () => {
  it('eases into a turn and glides out of it when you let go, banking deeper on a long one', () => {
    fresh();
    run(['d'], 1);
    const y0 = yawOf(flier(t).f);
    // Let go: the turn glides on a little, then settles.
    run([], 0.2);
    const glide = Math.abs(turnTo(yawOf(flier(t).f) - y0));
    expect(glide).toBeGreaterThan(0.08);
    expect(glide).toBeLessThan(0.24);
    run([], 1.5);
    const y1 = yawOf(flier(t).f);
    run([], 0.2);
    expect(Math.abs(turnTo(yawOf(flier(t).f) - y1))).toBeLessThan(0.01);
    // A long turn leans further than a short one: the chase view's roll follows the bank.
    fresh();
    run(['d'], 0.4);
    const short = Math.abs(eyeIn(k, 0, t).roll ?? 0);
    run(['d'], 1.8);
    const long = Math.abs(eyeIn(k, 0, t).roll ?? 0);
    expect(long).toBeGreaterThan(short + 0.02);
    // Slight: never more than a quarter of a radian.
    expect(long).toBeLessThan(0.25);
  });

  it('swings the chase camera round late in a turn, and lines it up again flying straight', () => {
    fresh();
    expect(lag()).toBeLessThan(0.01);
    run(['a'], 0.5);
    expect(lag()).toBeGreaterThan(0.08);
    run([], 2);
    expect(lag()).toBeLessThan(0.01);
  });

  it('keeps the camera level on the autopilot’s route', () => {
    setFly(false, [], 0, 20);
    expect(eyeIn(k, 0, 20).roll ?? 0).toBe(0);
  });

  it('boosts gently in the streets, more at the roofs, most in the stratosphere', () => {
    expect(boostPaceAt(GROUND + 10)).toBeCloseTo(STREET_BOOST, 1);
    expect(boostPaceAt(GROUND + 150)).toBeCloseTo(BOOST_PACE, 1);
    expect(boostPaceAt(GROUND + 520)).toBeCloseTo(HIGH_BOOST, 1);
    // Smooth: no step anywhere between the street and the stratosphere.
    for (let y = GROUND; y < GROUND + 600; y += 1)
      expect(Math.abs(boostPaceAt(y + 1) - boostPaceAt(y))).toBeLessThan(0.05);
    const boostedAt = (h: number) => {
      fresh();
      const { c, f } = flier(t);
      placeShip([c[0], GROUND + h, c[2]], yawOf(f));
      // Space and W a moment: the super boost holds you up high.
      run([' ', 'w'], dt);
      placeShip([c[0], GROUND + h, c[2]], yawOf(f));
      run([' '], 1.5);
      return speed();
    };
    const street = boostedAt(8.5);
    const roofs = boostedAt(150);
    const high = boostedAt(450);
    expect(street).toBeLessThan(roofs);
    expect(roofs).toBeLessThan(high);
    expect(street).toBeLessThan(FLY_SPEED * (STREET_BOOST + 0.2));
  });

  it('streams a longer, brighter plume under boost, its afterglow fading slowly', () => {
    const ps = makeParticles(2000);
    const c: Vec3 = [0, 0, 0];
    const f: Vec3 = [0, 0, -1];
    for (const s of SHIPS) {
      const reach = (glow: number) => {
        let far = 0;
        let n = 0;
        for (const p of ps) {
          const g = shipGrainAt(s.id, c, f, s.len, p, 1, 0, glow, 3);
          expect(g.pos.every(Number.isFinite)).toBe(true);
          if (g.part !== 'trail') continue;
          n++;
          far = Math.max(far, g.pos[2]);
          for (const v of shipGrainColour(s.id, g.part, p, 1, glow))
            expect(v).toBeLessThanOrEqual(1);
        }
        return { far, n };
      };
      const calm = reach(0);
      const boosted = reach(1);
      expect(boosted.far).toBeGreaterThan(calm.far + 1.2 * s.len);
      expect(boosted.n).toBeGreaterThan(calm.n);
    }
    expect(engineLight(1)).toBeGreaterThan(engineLight(0));
    expect(trailLight(0.8, 1)).toBeGreaterThan(trailLight(0.8, 0));
    // In flight: the glow rises while you boost and fades after, never jumping.
    fresh();
    let was = boostGlow();
    for (let i = 0; i < 60; i++) {
      run([' '], dt);
      expect(Math.abs(boostGlow() - was)).toBeLessThan(0.1);
      was = boostGlow();
    }
    expect(boostGlow()).toBeGreaterThan(0.9);
    run([], 1);
    expect(boostGlow()).toBeGreaterThan(0.2);
    expect(boostGlow()).toBeLessThan(0.45);
    run([], 4);
    expect(boostGlow()).toBeLessThan(0.01);
  });

  it('pulls the chase eye back a little under boost', () => {
    fresh();
    const d = () => {
      const { c } = flier(t);
      const { eye } = eyeIn(k, 0, t);
      return Math.hypot(c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]);
    };
    run([], 0.5);
    const calm = d();
    run([' '], 1);
    expect(d()).toBeGreaterThan(calm + 1.5);
  });

  it('keeps every speed on the needle’s dial, over the city and out in space', () => {
    const check = () => {
      for (const g of gauges()) expect(g.value).toBeLessThanOrEqual(g.max);
    };
    fresh();
    run([' ', 'e'], 2);
    check();
    run([' ', 'w'], 12);
    check();
    run([' '], 3);
    check();
    enterTunnel(CITY_PORTALS[0] as (typeof CITY_PORTALS)[number], t);
    for (let i = 0; i < 60 * 8 && spaceMode() === 'tunnel'; i++) run([], dt);
    expect(inSpace()).toBe(true);
    run([' ', 'e'], 4);
    check();
    run([' '], 4);
    check();
  });

  it('bumps softly along a wall: slower, leaning away, still moving', () => {
    // A stretch of tower wall along the avenue's right side, long enough to slide along.
    const y = GROUND + 6;
    let z0 = Number.NaN;
    for (let z = 0; z > -2000 && Number.isNaN(z0); z -= 1) {
      let wall = true;
      for (let d = 0; d <= 25 && wall; d += 0.5)
        wall = blocked([AVENUE + 1, y, z - d]) && !blocked([AVENUE - 2.5, y, z - d]);
      if (wall) z0 = z;
    }
    expect(Number.isNaN(z0)).toBe(false);
    const slide = (x: number, yaw: number) => {
      fresh();
      placeShip([x, y, z0], yaw);
      run([], 2);
      return { v: speed(), c: [...flier(t).c] };
    };
    const free = slide(0, 0);
    // Heading into the wall on the right.
    const start: Vec3 = [AVENUE - 2.5, y, z0];
    const slid = slide(start[0], -0.5);
    const ratio = slid.v / free.v;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.8);
    expect(
      Math.hypot((slid.c[0] as number) - start[0], (slid.c[2] as number) - start[2]),
    ).toBeGreaterThan(5);
    // Leaning away from the wall (to the left): the chase view rolls with it.
    expect(eyeIn(k, 0, t).roll ?? 0).toBeGreaterThan(0.01);
  });
});
