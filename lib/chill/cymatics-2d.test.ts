import { describe, expect, it } from 'vitest';

import {
  BLEND,
  blendedAmp,
  CIRCLE_TABLES,
  createSand,
  createStars,
  cymaticsCounts,
  HOLD,
  plateAmp,
  plateAt,
  stepSand,
  twinkle,
} from './cymatics-2d';

/** Small deterministic random source. */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('cymatics-2d', () => {
  it('normalises every radial table to ±1', () => {
    for (const table of CIRCLE_TABLES) {
      const max = Math.max(...Array.from(table.values, Math.abs));
      expect(max).toBeCloseTo(1, 5);
    }
  });

  it('plate amplitude follows J_n(αr)·cos(nθ) and stays within ±1', () => {
    const table = CIRCLE_TABLES[1]; // n = 3
    expect(table.n).toBe(3);
    // cos(3θ) = 0 at θ = π/6, so the spoke is a still line.
    const r = 0.5;
    expect(plateAmp(table, r * Math.cos(Math.PI / 6), r * Math.sin(Math.PI / 6))).toBeCloseTo(0, 5);
    for (let i = 0; i < 50; i++) {
      const a = plateAmp(table, Math.cos(i) * 0.9, Math.sin(i * 1.3) * 0.4);
      expect(Math.abs(a)).toBeLessThanOrEqual(1.0001);
    }
    // Outside the plate the radius is clamped, not extrapolated.
    expect(Number.isFinite(plateAmp(table, 3, 3))).toBe(true);
  });

  it('holds a figure, then blends to the next one', () => {
    const held = plateAt(1);
    expect(held.mix).toBe(0);
    expect(held.from).toBe(CIRCLE_TABLES[0]);
    expect(held.to).toBe(CIRCLE_TABLES[1]);
    const mid = plateAt(HOLD + BLEND / 2);
    expect(mid.mix).toBeCloseTo(0.5, 5);
    expect(blendedAmp(held, 0.3, 0.2)).toBe(plateAmp(CIRCLE_TABLES[0], 0.3, 0.2));
    const expected =
      plateAmp(mid.from, 0.3, 0.2) * (1 - mid.mix) + plateAmp(mid.to, 0.3, 0.2) * mid.mix;
    expect(blendedAmp(mid, 0.3, 0.2)).toBeCloseTo(expected, 10);
  });

  it('scatters sand on the plate', () => {
    const grains = createSand(500, seeded(3));
    expect(grains).toHaveLength(500);
    for (const g of grains) expect(Math.hypot(g.x, g.y)).toBeLessThan(1);
  });

  it('gathers sand onto the still lines', () => {
    const rand = seeded(7);
    const plate = plateAt(1);
    const grains = createSand(800, rand);
    const meanAmp = () =>
      grains.reduce((sum, g) => sum + Math.abs(blendedAmp(plate, g.x, g.y)), 0) / grains.length;
    const before = meanAmp();
    for (let i = 0; i < 200; i++) stepSand(grains, plate, 0.2, rand);
    const after = meanAmp();
    expect(after).toBeLessThan(before * 0.6);
    for (const g of grains) expect(Math.hypot(g.x, g.y)).toBeLessThan(1);
  });

  it('puts a grain that leaves the plate back on it', () => {
    const grains = [{ x: 0.999, y: 0, seed: 0.5, stir: 0 }];
    stepSand(grains, plateAt(1), 0, seeded(2));
    expect(Math.hypot(grains[0].x, grains[0].y)).toBeLessThan(0.99);
    expect(grains[0].stir).toBe(1);
  });

  it('makes stars that twinkle within 0..1 and brighten with sound', () => {
    const stars = createStars(300, seeded(5));
    expect(stars).toHaveLength(300);
    expect(stars.some((s) => s.sparkle)).toBe(true);
    for (const s of stars) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(1);
      for (const t of [0, 1.7, 9]) {
        const quiet = twinkle(s, t, 0);
        const loud = twinkle(s, t, 1);
        expect(quiet).toBeGreaterThan(0);
        expect(loud).toBeLessThanOrEqual(1);
        expect(loud).toBeGreaterThanOrEqual(quiet);
      }
    }
  });

  it('scales grains and stars with density, clamped', () => {
    expect(cymaticsCounts(0)).toEqual({ grains: 900, stars: 140 });
    expect(cymaticsCounts(1)).toEqual({ grains: 3000, stars: 400 });
    expect(cymaticsCounts(-1)).toEqual(cymaticsCounts(0));
    expect(cymaticsCounts(2)).toEqual(cymaticsCounts(1));
  });
});
