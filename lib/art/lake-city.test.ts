import { describe, expect, it } from 'vitest';
import { LOWER, LOWER_FROM, LOWER_TO } from './chinatown-paths';
import { LAKE_CITY, lakeAnchor, lakeNear, lakeTowers } from './lake-city';
import { UNDER, UNDER_LENGTH } from './undertown';

describe('the lake city past Undertown (2026-11-24: "THAT\'S WHERE U BUILD THE BIG CITY")', () => {
  it('faces each Undertown, inside the stretch where the underpass is down', () => {
    for (const k of [0, 1, 4]) {
      const a = lakeAnchor(k);
      const run = UNDER.AT + k * UNDER.EVERY;
      expect(a).toBeGreaterThan(run);
      expect(a).toBeLessThan(run + UNDER_LENGTH);
      expect(a - run).toBeGreaterThan(LOWER.DIVE[1]);
      expect(a - run).toBeLessThan(LOWER.CLIMB[0]);
      expect(lakeNear(a)).toBe(k);
      expect(lakeNear(run + LOWER_FROM)).toBe(k);
      expect(lakeNear(run + LOWER_TO)).toBe(k);
    }
    expect(lakeNear(-5000)).toBeNull();
  });

  it('stands a skyline on the far shore: tallest in the middle, the same every time', () => {
    const t = lakeTowers(2);
    expect(t).toEqual(lakeTowers(2));
    expect(t).not.toEqual(lakeTowers(3));
    expect(t.length).toBe(LAKE_CITY.TOWERS);
    for (const p of t) {
      expect(p.b - p.d).toBeGreaterThan(LAKE_CITY.FAR);
      expect(p.b + p.d).toBeLessThan(LAKE_CITY.FAR + LAKE_CITY.SHORE + 20);
      expect(Math.abs(p.a)).toBeLessThan(LAKE_CITY.LENGTH / 2);
      expect(p.h).toBeGreaterThanOrEqual(LAKE_CITY.LOW * 0.4);
      expect(p.h).toBeLessThanOrEqual(LAKE_CITY.HIGH);
    }
    const mid = t.filter((p) => Math.abs(p.a) < 200);
    const ends = t.filter((p) => Math.abs(p.a) > 500);
    const top = (xs: typeof t) => Math.max(...xs.map((p) => p.h));
    expect(top(mid)).toBeGreaterThan(top(ends) * 1.5);
    expect(t.some((p) => p.crown)).toBe(true);
    // Below the street's datum by the void's depth: the lake lies at the underpass's level.
    expect(LAKE_CITY.LEVEL).toBeLessThan(-LOWER.DEPTH);
  });
});
