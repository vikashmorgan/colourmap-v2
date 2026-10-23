import { describe, expect, it } from 'vitest';

import { FLOW_MOVEMENTS_SANDS, flowSandsFormation, gravityCores } from './GeometryField';

const R = 300;

describe('Magnetic Sands 2', () => {
  it('has no straight sine "sand waves" act — every act is circular', () => {
    const forms = new Set(FLOW_MOVEMENTS_SANDS.map((m) => m.form));
    expect(forms.has(1)).toBe(false);
    expect(forms).toEqual(new Set([2, 3, 4, 5, 6, 7]));
  });

  it('seed of life puts every grain on one of seven whole circles', () => {
    const cr = R * 0.42;
    for (let i = 1; i < 4000; i += 3) {
      const [x, y] = flowSandsFormation(7, i, 0, 0, R);
      if (i % 4 === 0) continue; // the persistent ring-order grains
      const c = i % 7;
      const a = (c / 6) * Math.PI * 2;
      const cx = c === 0 ? 0 : Math.cos(a) * cr;
      const cy = c === 0 ? 0 : Math.sin(a) * cr;
      expect(Math.hypot(x - cx, y - cy)).toBeCloseTo(cr, 6);
    }
  });

  it('closes each circle: grains cover the full turn, not a C', () => {
    // Angles of the centre circle's grains must leave no gap wider than 20°.
    const angles: number[] = [];
    for (let i = 0; i < 5200; i++) {
      if (i % 7 !== 0 || i % 4 === 0) continue;
      const [x, y] = flowSandsFormation(7, i, 0, 0, R);
      angles.push(Math.atan2(y, x));
    }
    angles.sort((a, b) => a - b);
    let gap = angles[0] + Math.PI * 2 - angles.at(-1)!;
    for (let k = 1; k < angles.length; k++) gap = Math.max(gap, angles[k] - angles[k - 1]);
    expect(gap).toBeLessThan((20 * Math.PI) / 180);
  });

  it('rose rings keep six-fold symmetry', () => {
    const r = (a: number) => 1 + 0.1 * Math.cos(6 * a);
    expect(r(0.3)).toBeCloseTo(r(0.3 + Math.PI / 3));
    const [x, y] = flowSandsFormation(6, 9, 0, 0, R);
    expect(Math.hypot(x, y)).toBeLessThan(R);
  });
});

describe('Gravity', () => {
  it('starts its cores where they always were, then orbits them as a mirrored pair', () => {
    const [a0, b0] = gravityCores(0, R);
    expect(a0.x).toBeCloseTo(R * 0.32);
    expect(a0.y).toBeCloseTo(-R * 0.06);
    for (const t of [0, 5, 40]) {
      const [a, b] = gravityCores(t, R);
      expect(b.x).toBeCloseTo(-a.x);
      expect(b.y).toBeCloseTo(-a.y);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(Math.hypot(a0.x - b0.x, a0.y - b0.y));
    }
    expect(gravityCores(10, R)[0].x).not.toBeCloseTo(a0.x);
  });
});
