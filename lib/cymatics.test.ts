import { describe, expect, it } from 'vitest';

import {
  besselJ,
  CIRCLE_PATTERNS,
  chladniSquare,
  circularMode,
  legendreP,
  maxAbs,
  patternBlend,
  SPHERE_PATTERNS,
  SQUARE_PATTERNS,
  sphereMode,
} from './cymatics';

describe('besselJ', () => {
  it('matches known values', () => {
    expect(besselJ(0, 0)).toBe(1);
    expect(besselJ(1, 0)).toBe(0);
    expect(besselJ(0, 1)).toBeCloseTo(0.7651977, 6);
    expect(besselJ(1, 2)).toBeCloseTo(0.5767248, 6);
    expect(besselJ(3, 5)).toBeCloseTo(0.3648312, 6);
  });

  it('has its first zero where the drum has its first ring', () => {
    expect(besselJ(0, 2.404826)).toBeCloseTo(0, 5);
  });
});

describe('legendreP', () => {
  it('matches the low orders', () => {
    const x = 0.3;
    expect(legendreP(0, 0, x)).toBe(1);
    expect(legendreP(1, 0, x)).toBeCloseTo(x);
    expect(legendreP(2, 0, x)).toBeCloseTo((3 * x * x - 1) / 2);
    expect(legendreP(1, 1, x)).toBeCloseTo(Math.sqrt(1 - x * x));
    expect(legendreP(2, 2, x)).toBeCloseTo(3 * (1 - x * x));
  });
});

describe('plate modes', () => {
  it('square Chladni figures are still along the diagonal', () => {
    for (const { n, m } of SQUARE_PATTERNS) {
      expect(chladniSquare(0.37, 0.37, n, m)).toBeCloseTo(0);
    }
  });

  it('circular modes have n-fold nodal spokes', () => {
    // cos(nθ) = 0 at θ = π / 2n.
    expect(circularMode(0.5, Math.PI / 6, 3, 12)).toBeCloseTo(0);
  });

  it('sphere modes rotate around the pole with m', () => {
    expect(sphereMode(1, Math.PI / 4, 4, 2)).toBeCloseTo(0);
  });

  it('every pattern list is a loop of distinct figures', () => {
    for (const list of [CIRCLE_PATTERNS, SQUARE_PATTERNS, SPHERE_PATTERNS]) {
      expect(list.length).toBeGreaterThanOrEqual(6);
      expect(new Set(list.map((p) => JSON.stringify(p))).size).toBe(list.length);
    }
  });
});

describe('patternBlend', () => {
  it('holds a pattern, then eases into the next', () => {
    expect(patternBlend(1, 8, 3, 2)).toEqual({ from: 0, to: 1, mix: 0 });
    const mid = patternBlend(4, 8, 3, 2);
    expect(mid.from).toBe(0);
    expect(mid.mix).toBeCloseTo(0.5);
    expect(patternBlend(5, 8, 3, 2).from).toBe(1);
  });

  it('loops from the last pattern back to the first', () => {
    const end = patternBlend(8 * 5 - 0.5, 8, 3, 2);
    expect(end.from).toBe(7);
    expect(end.to).toBe(0);
    expect(patternBlend(8 * 5, 8, 3, 2).from).toBe(0);
    expect(patternBlend(-1, 8, 3, 2).from).toBe(7);
  });
});

describe('maxAbs', () => {
  it('finds the largest magnitude and never returns 0', () => {
    expect(maxAbs(3, (i) => [-2, 1, 0][i])).toBe(2);
    expect(maxAbs(2, () => 0)).toBe(1);
  });
});
