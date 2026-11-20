import { describe, expect, it } from 'vitest';

import { FIRES } from './drive-design';
import { bump, ELASTIC, placeOf, RIVALS, rivalControls, rivalHull } from './rivals';
import { COAST, frameAt, makeTrack, pointAt } from './track';
import { newVehicle } from './vehicle';

describe('the rivals', () => {
  it('are five, each in its own colour and its own fire', () => {
    expect(RIVALS).toHaveLength(5);
    expect(new Set(RIVALS.map((r) => r.colour)).size).toBe(5);
    expect(new Set(RIVALS.map((r) => r.fire)).size).toBe(5);
    for (const r of RIVALS) {
      expect(FIRES.some((f) => f.id === r.fire)).toBe(true);
      expect(rivalHull(r).colour).toBe(r.colour);
    }
  });

  it('hold their own line, ease off far ahead and boost far behind', () => {
    const tr = makeTrack(COAST);
    const f = frameAt(tr, 400);
    const v = newVehicle('car', f.x, f.y, f.h);
    const left = RIVALS.find((r) => r.lane > 0.3)!;
    const right = RIVALS.find((r) => r.lane < -0.3)!;
    expect(rivalControls(left, v, tr, 400, 0, 0).steer).toBeGreaterThan(
      rivalControls(right, v, tr, 400, 0, 0).steer,
    );
    const r = RIVALS[0];
    expect(rivalControls(r, v, tr, 400, 0, 0).throttle).toBe(r.pace);
    expect(rivalControls(r, v, tr, 400, 0, ELASTIC + 200).throttle).toBeLessThan(r.pace);
    expect(rivalControls(r, v, tr, 400, 0, ELASTIC + 200).boost).toBe(0);
    expect(rivalControls(r, v, tr, 400, 0, -ELASTIC - 1).boost).toBe(1);
    expect(pointAt(tr, 400, 0).x).toBeCloseTo(f.x);
  });

  it('count your place, and bump instead of passing through', () => {
    expect(placeOf(100, [50, 80, 90, 95, 99])).toBe(1);
    expect(placeOf(100, [150, 80, 120, 95, 99])).toBe(3);
    const a = newVehicle('car', 0, 0, 0);
    const b = newVehicle('car', 1, 0, 0);
    a.vx = 10;
    expect(bump(a, b)).toBe(true);
    expect(b.x - a.x).toBeCloseTo(2.6);
    expect(b.vx).toBeGreaterThan(0);
    expect(a.vx).toBeLessThan(10);
    expect(bump(a, newVehicle('car', 50, 0, 0))).toBe(false);
  });
});
