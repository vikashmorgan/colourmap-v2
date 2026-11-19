import { describe, expect, it } from 'vitest';

import { autopilotControls } from './autopilot';
import { COAST, frameAt, makeTrack, pointAt } from './track';
import { newVehicle } from './vehicle';

describe('the autopilot', () => {
  it('steers back toward the road: left of the line it turns right, and the other way', () => {
    const tr = makeTrack(COAST);
    const f = frameAt(tr, 400);
    const left = pointAt(tr, 400, 8);
    const right = pointAt(tr, 400, -8);
    const a = autopilotControls(newVehicle('car', left.x, left.y, f.h), tr, 400, 0);
    const b = autopilotControls(newVehicle('car', right.x, right.y, f.h), tr, 400, 0);
    expect(a.throttle).toBe(1);
    expect(a.steer).toBeLessThan(0);
    expect(b.steer).toBeGreaterThan(0);
  });

  it('boosts when lined up, wanders on the salt, climbs and dives in the sky', () => {
    const tr = makeTrack(COAST);
    const f = frameAt(tr, 1000);
    const ahead = frameAt(tr, 1016);
    const v = newVehicle('ship', f.x, f.y, Math.atan2(ahead.y - f.y, ahead.x - f.x));
    expect(autopilotControls(v, tr, 1000, 0).boost).toBe(1);
    const salt = [0, 7, 14].map(
      (t) => autopilotControls(newVehicle('car', 0, 0, 0), null, 0, t).steer,
    );
    expect(new Set(salt).size).toBe(3);
    const sky = [2, 20].map((t) => autopilotControls(v, tr, 1000, t, true).climb ?? 0);
    expect(sky[0]).toBeGreaterThan(0);
    expect(sky[1]).toBeLessThan(0);
  });
});
