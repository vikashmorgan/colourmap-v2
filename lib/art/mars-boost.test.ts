import { describe, expect, it } from 'vitest';
import { distToLoop, KICKERS, marsHeight, PORTALS, siteHit } from './mars';
import {
  PORTAL_R,
  type Portal,
  portalCrossed,
  SUPER,
  superAccel,
  superLook,
  throughPortal,
} from './mars-boost';
import { CANYONS } from './mars-canyons';
import { START } from './salt-flat-game';
import { MARS_FLAT, newVehicle, stepVehicle, VEHICLES } from './vehicle';

const p: Portal = { x: 0, y: 0, h: 0, r: PORTAL_R };

describe('the superboost portals', () => {
  it('count a pass through the ring, either way, on the ground or flying', () => {
    expect(throughPortal(p, -2, 0, 2, 0, 0.5)).toBe(true);
    expect(throughPortal(p, 2, 1, -2, 1, 0.5)).toBe(true);
    expect(throughPortal(p, -2, 3, 2, 3, PORTAL_R + 4)).toBe(true);
  });

  it('miss beside it, over it, and along it', () => {
    expect(throughPortal(p, -2, PORTAL_R + 1, 2, PORTAL_R + 1, 1)).toBe(false);
    expect(throughPortal(p, -2, 0, 2, 0, PORTAL_R * 2 + 1)).toBe(false);
    expect(throughPortal(p, 1, -5, 1, 5, 1)).toBe(false);
    expect(throughPortal(p, -4, 0, -2, 0, 1)).toBe(false);
  });

  it('turn with their heading', () => {
    const north: Portal = { ...p, h: Math.PI / 2 };
    expect(throughPortal(north, 0, -2, 0, 2, 1)).toBe(true);
    expect(throughPortal(north, -2, 1, 2, 1, 1)).toBe(false);
    expect(portalCrossed([p, north], 0.5, -2, 0.5, 2, 1)).toBe(north);
  });

  it('stand at the canyons, on the desert straights beyond, clear of his loop, the start and the stations', () => {
    expect(PORTALS.length).toBeGreaterThanOrEqual(CANYONS.length * 4);
    for (const q of PORTALS) {
      expect(distToLoop(q.x, q.y)).toBeGreaterThan(60);
      expect(Math.hypot(q.x - START.x, q.y - START.y)).toBeGreaterThan(300);
      expect(siteHit(q.x, q.y, q.r)).toBeNull();
      for (const k of KICKERS) expect(Math.hypot(q.x - k.x, q.y - k.y)).toBeGreaterThan(q.r + 10);
    }
  });
});

describe('the superboost', () => {
  const top = VEHICLES.car.vTop;

  it('pushes hard at once, holds, fades and stops', () => {
    expect(superAccel(-1, 50, top)).toBe(0);
    expect(superAccel(0.05, 50, top)).toBeGreaterThan(0);
    expect(superAccel(0.05, 50, top)).toBeLessThan(SUPER.pull);
    expect(superAccel(1, 50, top)).toBe(SUPER.pull);
    expect(superAccel(SUPER.hold - 0.01, 50, top)).toBe(SUPER.pull);
    const fading = superAccel(SUPER.hold + SUPER.fade / 2, 50, top);
    expect(fading).toBeGreaterThan(0);
    expect(fading).toBeLessThan(SUPER.pull / 2);
    expect(superAccel(SUPER.hold + SUPER.fade, 50, top)).toBe(0);
  });

  it('eases off as you near its own top, well past your top speed', () => {
    expect(superAccel(1, top * SUPER.top, top)).toBe(0);
    expect(superAccel(1, top * SUPER.top - SUPER.ease / 2, top)).toBeCloseTo(SUPER.pull / 2, 6);
    expect(superAccel(1, top, top)).toBe(SUPER.pull);
  });

  it('shows on the screen a little longer than it pushes, fading in and out', () => {
    expect(superLook(-1)).toBe(0);
    expect(superLook(1)).toBe(1);
    expect(superLook(SUPER.look - 0.5)).toBeCloseTo(0.5, 6);
    expect(superLook(SUPER.look)).toBe(0);
  });

  it('takes a car at its top speed half again past it, then bleeds it off', () => {
    const v = newVehicle('car', 0, 0, 0);
    v.vx = top;
    v.z = marsHeight(0, 0);
    let best = 0;
    for (let i = 0; i < 60 * 12; i++) {
      const t = i / 60;
      const a = superAccel(t, Math.hypot(v.vx, v.vy), top);
      v.vx += Math.cos(v.h) * a * (1 / 60);
      v.vy += Math.sin(v.h) * a * (1 / 60);
      stepVehicle(v, { throttle: 1, steer: 0, boost: 0 }, 1 / 60, MARS_FLAT, t);
      best = Math.max(best, Math.hypot(v.vx, v.vy));
    }
    expect(best).toBeGreaterThan(top * 1.5);
    expect(best).toBeLessThan(top * SUPER.top + 1);
    expect(Math.hypot(v.vx, v.vy)).toBeLessThan(best - 20);
  });
});
