import { afterEach, describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  FOLLOW_S,
  LEAVE_S,
  RETURN_MAX,
  RETURN_MIN,
  resetSharks,
  returnAt,
  SCHOOL,
  school,
  schoolJoin,
  sharkGrain,
  sharkStep,
  sharksShowing,
} from './city-sharks';

/*
 * 2026-11-14: "a school of sharks swims alongside at the ship's speed, following it, for about 20
 * seconds, then peels away. Sometimes they come back to follow again."
 */

afterEach(() => resetSharks());

const dt = 1 / 30;
/** A ship flying north at `speed`, weaving gently: where it is at time t. */
const shipAt = (t: number, speed: number): { c: Vec3; f: Vec3 } => {
  const f: Vec3 = [0.2 * Math.sin(t * 0.2), 0, -1];
  const l = Math.hypot(f[0], f[2]);
  return { c: [8 * -Math.cos(t * 0.2) * 5, 40, -speed * t], f: [f[0] / l, 0, f[2] / l] };
};
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('the sharks of Atlantis', () => {
  it('swim alongside at the ship’s speed for about twenty seconds, then peel away', () => {
    const speed = 40;
    const start = shipAt(0, speed);
    schoolJoin(start.c, start.f, 0);
    let t = 0;
    let far = 0;
    for (; t < FOLLOW_S - dt / 2; t += dt) {
      const s = shipAt(t, speed);
      sharkStep(s.c, s.f, speed, dt, t, true);
      if (t > 6) {
        // Caught up: the school beside you, keeping pace.
        expect(school.mode).toBe('follow');
        far = Math.max(far, dist(school.c, s.c));
        for (let i = 0; i < SCHOOL; i++) expect(dist(school.at[i] as Vec3, s.c)).toBeGreaterThan(4);
      }
    }
    expect(far).toBeLessThan(30);
    expect(sharksShowing()).toBe(true);
    // Then the peel: slowing, turning off, falling behind and fading.
    for (; t < FOLLOW_S + LEAVE_S + 1; t += dt) {
      const s = shipAt(t, speed);
      sharkStep(s.c, s.f, speed, dt, t, true);
    }
    expect(school.mode).toBe('away');
    expect(sharksShowing()).toBe(false);
    expect(school.show.every((k) => k === 0)).toBe(true);
  });

  it('come back now and then while you stay, one to two minutes later, and follow again', () => {
    const speed = 30;
    const s0 = shipAt(0, speed);
    schoolJoin(s0.c, s0.f, 0);
    const joins: number[] = [0];
    let was = school.mode;
    for (let t = 0; t < 400; t += dt) {
      const s = shipAt(t, speed);
      sharkStep(s.c, s.f, speed, dt, t, true);
      if (school.mode === 'follow' && was !== 'follow') joins.push(t);
      was = school.mode;
    }
    expect(joins.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < joins.length; i++) {
      const gap = (joins[i] as number) - (joins[i - 1] as number) - FOLLOW_S - LEAVE_S;
      expect(gap).toBeGreaterThanOrEqual(RETURN_MIN - 0.1);
      expect(gap).toBeLessThanOrEqual(RETURN_MAX + 0.1);
    }
    for (let v = 0; v < 50; v++) {
      expect(returnAt(100, v) - 100).toBeGreaterThanOrEqual(RETURN_MIN);
      expect(returnAt(100, v) - 100).toBeLessThan(RETURN_MAX);
    }
  });

  it('leave at once when you leave Atlantis', () => {
    const s = shipAt(0, 20);
    schoolJoin(s.c, s.f, 0);
    sharkStep(s.c, s.f, 20, dt, dt, true);
    sharkStep(s.c, s.f, 20, dt, 2 * dt, false);
    expect(school.mode).toBe('away');
    expect(sharksShowing()).toBe(false);
  });

  it('move smoothly as a school: no shark jumps between frames', () => {
    const speed = 35;
    const s0 = shipAt(0, speed);
    schoolJoin(s0.c, s0.f, 0);
    const last = school.at.map((p) => [...p] as Vec3);
    for (let t = dt; t < FOLLOW_S + LEAVE_S; t += dt) {
      const s = shipAt(t, speed);
      sharkStep(s.c, s.f, speed, dt, t, true);
      if (t > 2 * dt)
        for (let i = 0; i < SCHOOL; i++) {
          // At most the ship's own step and a little: they never teleport.
          expect(dist(school.at[i] as Vec3, last[i] as Vec3)).toBeLessThan(speed * dt * 3 + 1);
        }
      school.at.forEach((p, i) => {
        last[i] = [...p] as Vec3;
      });
    }
  });

  it('are made of grains near each shark, mellow, each its share', () => {
    const s = shipAt(0, 30);
    schoolJoin(s.c, s.f, 0);
    for (let t = 0; t < 8; t += dt) {
      const q = shipAt(t, 30);
      sharkStep(q.c, q.f, 30, dt, t, true);
    }
    const n = 700;
    let lit = 0;
    for (let L = 0; L < n; L++) {
      const g = sharkGrain(L, n, 8);
      const i = Math.min(SCHOOL - 1, Math.floor(L / Math.floor(n / SCHOOL)));
      for (const v of g.pos) expect(Number.isFinite(v)).toBe(true);
      expect(dist(g.pos, school.at[i] as Vec3)).toBeLessThan(8);
      expect(Math.max(...g.rgb)).toBeLessThan(0.55);
      if (g.rgb[0] + g.rgb[1] + g.rgb[2] > 0.05) lit++;
    }
    expect(lit).toBeGreaterThan(n * 0.8);
  });
});
