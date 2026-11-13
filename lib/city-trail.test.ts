import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  clearTrail,
  makeTrail,
  pushTrail,
  TRAIL_SECONDS,
  trailAt,
  trailGrain,
  trailLength,
  trailSpan,
} from './city-trail';

/** A ship flying a quarter circle of radius 40 in 2 s, sampled at 60 a second. */
function curve() {
  const tr = makeTrail();
  for (let i = 0; i <= 120; i++) {
    const t = i / 60;
    const a = (t / 2) * (Math.PI / 2);
    const c: Vec3 = [40 * Math.sin(a), 0, 40 - 40 * Math.cos(a)];
    pushTrail(tr, c, [Math.cos(a), 0, Math.sin(a)], t);
  }
  return tr;
}

describe('the boost trail (2026-11-13: "a better boost trail")', () => {
  it('keeps the path flown, at most a little longer than it shows', () => {
    const tr = curve();
    expect(trailSpan(tr)).toBeGreaterThan(TRAIL_SECONDS);
    const now = trailAt(tr, 0);
    expect(now?.c[0]).toBeCloseTo(40, 1);
    // Half a second back the ship was on the curve, not on a straight line behind it.
    const back = trailAt(tr, 0.5);
    expect(back).not.toBeNull();
    const [x, , z] = (back as { c: Vec3 }).c;
    expect(Math.hypot(x, z - 40)).toBeCloseTo(40, 0);
  });

  it('starts over after a jump in time or a leap in space', () => {
    const tr = curve();
    pushTrail(tr, [500, 0, 500], [1, 0, 0], 2.1);
    expect(trailSpan(tr)).toBe(0);
    pushTrail(tr, [500, 0, 500], [1, 0, 0], 1);
    expect(tr.n).toBe(1);
    clearTrail(tr);
    expect(trailAt(tr, 0)).toBeNull();
  });

  it('is none at rest, longer with the boost and longer again with the hyperboost', () => {
    expect(trailLength(0, 0)).toBe(0);
    expect(trailLength(1, 0)).toBeGreaterThan(0.5);
    expect(trailLength(1, 1)).toBeGreaterThan(trailLength(1, 0));
    expect(trailLength(1, 1)).toBeLessThanOrEqual(TRAIL_SECONDS);
    expect(trailGrain(curve(), 1, 0.5, 2, 0, 0, 0)).toBeNull();
  });

  it('lies along the curve, its light fading with age, never past 1', () => {
    const tr = curve();
    let nearSum = 0;
    let farSum = 0;
    for (let i = 0; i < 2000; i++) {
      const q = i / 2000;
      const g = trailGrain(tr, i, q, 2, 1, 1, 3);
      expect(g).not.toBeNull();
      const { pos, rgb } = g as { pos: Vec3; rgb: [number, number, number] };
      expect(rgb.every((v) => v >= 0 && v <= 1)).toBe(true);
      // Within a few lengths of the circle the ship flew.
      expect(Math.abs(Math.hypot(pos[0], pos[2] - 40) - 40)).toBeLessThan(6);
      const light = rgb[0] + rgb[1] + rgb[2];
      if (q < 0.2) nearSum += light;
      else if (q > 0.8) farSum += light;
    }
    expect(nearSum).toBeGreaterThan(farSum * 2);
  });
});
