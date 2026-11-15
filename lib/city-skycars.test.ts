import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { CAR_BODIES, CAR_LEN, CARS_ALONG_X, CARS_ALONG_Z, carSite } from './city-cars';
import { CORRIDOR_FEATURES, CORRIDOR_HALF, CORRIDOR_X, featureSpan } from './city-corridors';
import { blocked } from './city-game';
import { BLOCK_X, GROUND, type Item, TILE_Z } from './city-grid';
import {
  BOULEVARD_Y,
  CORRIDOR_LEVELS,
  SKY_CARS,
  SKY_LANES,
  SKYCARS_DRAWN,
  skyCarAt,
  skyCarItems,
  skyCarOpen,
} from './city-skycars';

/* 2026-11-15: "more flying cars flying around. They are awesome." */

const o = [0, 0, 0, 0, 0, 0];

describe('flying cars: more of them', () => {
  it('raises the car density: more cars in the streets, and flying cars in the sky lanes', () => {
    // Before 2026-11-15: 22 a way down a street, 4 along a cross street, no flying cars.
    expect(CARS_ALONG_Z).toBeGreaterThan(22);
    expect(CARS_ALONG_X).toBeGreaterThan(4);
    const before = 22 * 2 * 12 + 4 * 2 * 56;
    const now = CARS_ALONG_Z * 2 * 12 + CARS_ALONG_X * 2 * 56 + SKY_CARS;
    expect(now).toBeGreaterThan(before * 1.5);
    expect(SKY_CARS).toBeGreaterThanOrEqual(150);
  });

  it('comes in five car bodies, all of them flying', () => {
    expect(CAR_BODIES.length).toBe(5);
    const seen = new Set<string>();
    for (let i = 0; i < SKY_LANES.length; i++)
      for (let k = 0; k < 8; k++) seen.add(skyCarAt(i, k, 3, [0, 0, 0]).body as string);
    expect(seen.size).toBe(5);
  });
});

describe('flying cars: the sky lanes', () => {
  it('fly down the corridors and boulevards, one way a lane on the right, none into the next', () => {
    for (let i = 0; i < SKY_LANES.length; i++) {
      const L = SKY_LANES[i] as (typeof SKY_LANES)[number];
      const corridor = Math.abs(Math.abs(L.line) - 3) < 1e-9;
      if (corridor) {
        expect(CORRIDOR_LEVELS as readonly number[]).toContain(L.y);
        expect(Math.abs(L.x - L.line * BLOCK_X)).toBeLessThan(CORRIDOR_HALF - 6);
      } else {
        expect(L.y).toBe(BOULEVARD_Y);
        expect(Math.abs(L.line) % 2).toBe(0);
      }
      // On the right: heading +z it keeps to -x of its line.
      expect(Math.sign(L.line * BLOCK_X - L.x)).toBe(L.sgn);
      for (const t of [0, 41, 300]) {
        const cars = Array.from({ length: L.n }, (_, k) => skyCarAt(i, k, t, [L.x, 0, 0]));
        for (const c of cars) expect(c.dir[2]).toBe(L.sgn);
        for (let a = 0; a < cars.length; a++)
          for (let b = a + 1; b < cars.length; b++) {
            const d = Math.abs(
              (cars[a] as (typeof cars)[0]).pos[2] - (cars[b] as (typeof cars)[0]).pos[2],
            );
            expect(Math.min(d, TILE_Z - d)).toBeGreaterThan(CAR_LEN * 3);
          }
      }
    }
  });

  it('pass under the low decks and gates and over the high decks in the corridors', () => {
    const [low, high] = CORRIDOR_LEVELS;
    for (const f of CORRIDOR_FEATURES) {
      const [a, b] = featureSpan(f);
      if (f.kind === 'high') expect(high).toBeGreaterThan(b + 2.5);
      else expect(low + 2.2).toBeLessThan(a);
    }
    expect(CORRIDOR_X.length).toBe(2);
  });

  it('never puts a grain inside a building, all along every lane', () => {
    for (let i = 0; i < SKY_LANES.length; i++) {
      for (const t of [0, 23, 57]) {
        for (let k = 0; k < (SKY_LANES[i] as (typeof SKY_LANES)[number]).n; k++) {
          const c = skyCarAt(i, k, t, [0, 0, TILE_Z]);
          if (skyCarOpen(c) <= 0) continue;
          for (let s = 0; s < 64; s += 2) {
            carSite(c, s, o, 1, 1, true);
            expect(blocked([o[0] as number, o[1] as number, o[2] as number])).toBe(false);
          }
        }
      }
    }
  }, 60_000);
});

describe('flying cars: drawn near the eye, within a budget', () => {
  it('draws at most a few dozen, ahead of the eye, finite, their glow under them', () => {
    const eye: Vec3 = [78, GROUND + 20, 500];
    const out: Item[] = [];
    skyCarItems(eye, [0, 0, 1], 12, out);
    expect(out.length).toBeGreaterThan(4);
    expect(out.length).toBeLessThanOrEqual(SKYCARS_DRAWN);
    for (const it of out) {
      expect(it.count).toBe(64);
      for (let s = 0; s < it.count; s++) {
        expect(it.site(s, o)).toBe(true);
        expect(o.every(Number.isFinite)).toBe(true);
        expect(o[2] as number).toBeGreaterThan(eye[2] - 6);
      }
    }
    // The glow it hovers on sits just under it, never on the street.
    const c = skyCarAt(0, 0, 5, eye);
    carSite(c, 63, o, 1, 1, true);
    expect(o[1] as number).toBeGreaterThan(c.pos[1] - 0.5);
  });
});
