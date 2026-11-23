import { describe, expect, it } from 'vitest';

import { GEARS } from './drive';
import { gearRing, newShiftWatch, RING, ringAt, ringFor, watchShift } from './gear-rings';

describe('gear rings (2026-11-23: "bigger and bigger" each gear)', () => {
  it('has no ring for the first gear, one for every gear after', () => {
    expect(gearRing(1, 6)).toBeNull();
    expect(gearRing(0, 6)).toBeNull();
    expect(gearRing(Number.NaN, 6)).toBeNull();
    for (let g = 2; g <= 6; g++) expect(gearRing(g, 6)?.gear).toBe(g);
  });

  it('grows bigger, brighter, longer and with more echoes each gear', () => {
    for (const kind of ['car', 'ship'] as const) {
      const n = GEARS[kind].length;
      let prev = ringFor(kind, 2);
      expect(prev?.radius).toBeCloseTo(RING.R0, 9);
      for (let g = 3; g <= n; g++) {
        const r = ringFor(kind, g);
        if (!r || !prev) throw new Error('a ring for every gear past the first');
        expect(r.radius).toBeGreaterThan(prev.radius);
        expect(r.bright).toBeGreaterThan(prev.bright);
        expect(r.life).toBeGreaterThan(prev.life);
        expect(r.echoes).toBeGreaterThanOrEqual(prev.echoes);
        prev = r;
      }
    }
  });

  it('makes the top gear a full sonic boom wall, and only the top gear', () => {
    const top = gearRing(6, 6);
    expect(top?.wall).toBe(true);
    expect(top?.radius).toBeCloseTo(RING.R1, 9);
    expect(top?.bright).toBeCloseTo(1, 9);
    expect(top?.echoes).toBe(3);
    for (let g = 2; g < 6; g++) expect(gearRing(g, 6)?.wall).toBe(false);
    expect(ringFor('ship', GEARS.ship.length)?.wall).toBe(true);
    // A box of two: its one shift is the top.
    expect(gearRing(2, 2)?.wall).toBe(true);
  });

  it('bursts out fast, eases to full size, slides back, fades to nothing and never flashes', () => {
    const r = gearRing(6, 6);
    if (!r) throw new Error('a top ring');
    let peak = 0;
    let prevR = 0;
    for (let a = 0; a < r.life; a += 0.01) {
      const s = ringAt(r, a);
      if (!s) throw new Error('alive through its life');
      expect(s.radius).toBeGreaterThanOrEqual(prevR);
      expect(s.radius).toBeLessThanOrEqual(r.radius);
      prevR = s.radius;
      peak = Math.max(peak, s.alpha);
    }
    expect(peak).toBeLessThanOrEqual(RING.PEAK);
    expect(ringAt(r, r.life * 0.5)?.radius).toBeGreaterThan(r.radius * 0.8);
    expect(ringAt(r, r.life * 0.5)?.back).toBeCloseTo(RING.BACK * r.life * 0.5, 9);
    expect(ringAt(r, r.life * 0.98)?.alpha).toBeLessThan(0.01);
    expect(ringAt(r, r.life)).toBeNull();
  });

  it('lets each echo follow a little later, smaller and fainter', () => {
    const r = gearRing(6, 6);
    if (!r) throw new Error('a top ring');
    expect(ringAt(r, 0.05, 1)).toEqual({ radius: 0, back: 0, alpha: 0 });
    const a = ringAt(r, 0.4, 0);
    const b = ringAt(r, 0.48, 1);
    expect(b?.radius).toBeCloseTo((a?.radius ?? 0) * 0.85, 9);
    expect(b?.alpha).toBeCloseTo((a?.alpha ?? 0) * 0.8, 9);
  });

  it('rings on upshifts only, and never strobes when the speed hovers at a shift', () => {
    const w = newShiftWatch();
    expect(watchShift(w, 1, 0)).toBeNull();
    expect(watchShift(w, 2, 1)).toBe(2);
    expect(watchShift(w, 2, 1.1)).toBeNull();
    // Down and straight back up: too soon to ring again.
    expect(watchShift(w, 1, 1.2)).toBeNull();
    expect(watchShift(w, 2, 1.3)).toBeNull();
    expect(watchShift(w, 3, 2)).toBe(3);
    expect(watchShift(w, 2, 2.5)).toBeNull();
    // Long enough later, the same gear rings again.
    expect(watchShift(w, 3, 2 + RING.REARM + 0.01)).toBe(3);
    // A jump of two gears rings the one you land in.
    expect(watchShift(w, 5, 9)).toBe(5);
  });
});
