import { describe, expect, it } from 'vitest';

import {
  fractalWeb,
  isLiquidMode,
  LIQUID_MODES,
  liquidAt,
  nestedRoses,
  prismStack,
  seedLattice,
  sierpinskiEdges,
} from './geometry-liquid';

const inDisc = (segs: [number, number, number, number][]) =>
  segs.every(([a, b, c, d]) => Math.hypot(a, b) <= 1.0001 && Math.hypot(c, d) <= 1.0001);

describe('Liquid 1–4', () => {
  it('knows its four modes', () => {
    expect(LIQUID_MODES).toEqual(['liquid1', 'liquid2', 'liquid3', 'liquid4']);
    expect(isLiquidMode('liquid3')).toBe(true);
    expect(isLiquidMode('liquid')).toBe(false);
  });

  it('builds the Sierpinski triangle as 3^levels small triangles', () => {
    expect(sierpinskiEdges(3)).toHaveLength(27 * 3);
  });

  it('draws every shape inside the unit disc', () => {
    expect(inDisc(fractalWeb(8, 3))).toBe(true);
    expect(inDisc(nestedRoses(7, 6))).toBe(true);
    expect(inDisc(seedLattice(0.25))).toBe(true);
    expect(inDisc(prismStack(9, 8))).toBe(true);
  });

  it('folds the fractal web into n mirrored sectors', () => {
    expect(fractalWeb(6, 3)).toHaveLength(6 * 27 * 3 * 3);
  });

  it('keeps every ripple gentle: points stay near the disc and depth small', () => {
    for (const mode of LIQUID_MODES) {
      for (let s = 0; s < 20; s += 1.7) {
        for (const [x, y] of [
          [0.3, 0.1],
          [-0.6, 0.5],
          [0.9, -0.2],
        ] as const) {
          const p = liquidAt(mode, x, y, s, 1, 7);
          expect(Math.hypot(p.x, p.y)).toBeLessThan(1.25);
          expect(Math.abs(p.z)).toBeLessThan(0.7);
          expect(p.glint).toBeGreaterThan(0.2);
        }
      }
    }
  });

  it('moves with time: the liquid is never still', () => {
    for (const mode of LIQUID_MODES) {
      const a = liquidAt(mode, 0.5, 0.2, 1, 1, 7);
      const b = liquidAt(mode, 0.5, 0.2, 2.3, 1, 7);
      expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z)).toBeGreaterThan(1e-3);
    }
  });

  it('colours Liquid 4 across the spectrum from the core out', () => {
    const inner = liquidAt('liquid4', 0.15, 0, 0, 1, 9).hue ?? -1;
    const outer = liquidAt('liquid4', 0.95, 0, 0, 1, 9).hue ?? -1;
    expect(inner).toBeGreaterThanOrEqual(0);
    expect(outer).toBeGreaterThan(inner);
    expect(liquidAt('liquid1', 0.5, 0, 0, 1, 9).hue).toBeUndefined();
  });
});
