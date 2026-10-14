import { describe, expect, it } from 'vitest';

import { inside, level, MASK_NAMES, mask } from './flow-masks';

describe('flow masks', () => {
  it('has ten named masks', () => {
    expect(MASK_NAMES).toHaveLength(10);
    expect(MASK_NAMES).toContain('Skull');
  });

  it('measures prims: inside below one, outside above', () => {
    expect(level({ k: 'e', x: 0, y: 0, rx: 1, ry: 1 }, 0.5, 0)).toBeCloseTo(0.5);
    expect(level({ k: 'c', ax: 0, ay: 0, bx: 1, by: 0, r: 0.1 }, 0.5, 0.2)).toBeCloseTo(2);
    expect(level({ k: 'b', x: 0, y: 0, hw: 1, hh: 0.5 }, 0.5, 0.25)).toBeCloseTo(0.5);
  });

  it('leaves the eyes and the mouth open in every mask', () => {
    for (let i = 0; i < 10; i++) {
      const m = mask(i, 0.5);
      // The first hole is an eye: its centre is dark, the face beside it is gold.
      const eye = m.holes[0];
      if (!eye || eye.k !== 'e') throw new Error('first hole should be an eye');
      expect(inside(m, eye.x, eye.y).in).toBe(false);
      expect(m.holes.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps every mask within the frame, and moving in time', () => {
    for (let i = 0; i < 10; i++) {
      for (let k = 0; k < 400; k++) {
        const x = ((k * 37) % 100) / 50 - 1;
        const y = ((k * 61) % 100) / 50 - 1;
        if (inside(mask(i, 1), x * 1.2, y * 1.2).in)
          expect(Math.max(Math.abs(x * 1.2), Math.abs(y * 1.2))).toBeLessThan(1.05);
      }
    }
    expect(JSON.stringify(mask(0, 0))).not.toBe(JSON.stringify(mask(0, 1)));
  });

  it('lights the rims of the holes', () => {
    const m = mask(0, 0);
    const eye = m.holes[0];
    if (!eye || eye.k !== 'e') throw new Error('eye');
    expect(inside(m, eye.x + eye.rx * 1.05, eye.y).rim).toBeGreaterThan(0.5);
  });
});
