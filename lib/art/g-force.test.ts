import { describe, expect, it } from 'vitest';
import {
  easeMask,
  G_FROM,
  G_FULL,
  G_MAX,
  gMask,
  HIT_PULSE,
  hitMask,
  turnMask,
} from './g-force';

describe('the G-force mask', () => {
  it('stays off in gentle turns and grows to its most in hard ones, either way', () => {
    expect(turnMask(0)).toBe(0);
    expect(turnMask(G_FROM)).toBe(0);
    expect(turnMask(G_FULL)).toBeCloseTo(G_MAX, 9);
    expect(turnMask(G_FULL * 3)).toBeCloseTo(G_MAX, 9);
    expect(turnMask(-20)).toBe(turnMask(20));
    let prev = 0;
    for (let a = 0; a <= 40; a += 1) {
      const m = turnMask(a);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });

  it("pulses softly after a hit: swells fast, fades within a second, nothing before", () => {
    expect(hitMask(-0.1)).toBe(0);
    expect(hitMask(Number.NaN)).toBe(0);
    expect(hitMask(0)).toBe(0);
    const peak = Math.max(...[0.02, 0.04, 0.06, 0.08, 0.1].map((a) => hitMask(a)));
    expect(peak).toBeGreaterThan(HIT_PULSE * 0.6);
    expect(peak).toBeLessThanOrEqual(HIT_PULSE);
    expect(hitMask(1.2)).toBeLessThan(0.02);
    expect(hitMask(0.06, 0.5)).toBeCloseTo(hitMask(0.06) * 0.5, 9);
  });

  it('stacks a turn and a hit, within bounds', () => {
    expect(gMask(G_FULL, 0.06)).toBeGreaterThan(gMask(G_FULL, 99));
    expect(gMask(1000, 0.06, 5)).toBeLessThanOrEqual(0.7);
  });

  it('eases in quicker than it eases out, and never overshoots', () => {
    const up = easeMask(0, 1, 0.1);
    const down = 1 - easeMask(1, 0, 0.1);
    expect(up).toBeGreaterThan(down);
    let m = 0;
    for (let i = 0; i < 600; i++) m = easeMask(m, 0.5, 1 / 60);
    expect(m).toBeLessThanOrEqual(0.5);
    expect(m).toBeCloseTo(0.5, 3);
  });
});
