import { describe, expect, it } from 'vitest';

import { crosses } from './drive';
import {
  COURSE_POLES,
  FINISH_GATE,
  FINISH_Y,
  LINE,
  MAX_STAKES,
  MESAS,
  MILE,
  newStreak,
  POLE_REACH,
  START,
  START_GATE,
  START_Y,
  STREAK,
  SUN_AZ,
  stakeIn,
  stakesNear,
  streakAt,
  streakDue,
  sunOnScreen,
  wrapPeriod,
} from './salt-flat-game';

describe('the course', () => {
  it('measures a mile between the gates, along the painted line', () => {
    expect(FINISH_Y - START_Y).toBeCloseTo(MILE);
    expect(LINE.y0).toBeLessThan(START.y);
    expect(LINE.y1).toBeGreaterThan(FINISH_Y);
    // Driving straight up from the start crosses both gates.
    expect(crosses(START.x, START_Y - 1, START.x, START_Y + 1, START_GATE)).toBe(true);
    expect(crosses(START.x, FINISH_Y - 1, START.x, FINISH_Y + 1, FINISH_GATE)).toBe(true);
  });

  it('has eleven tenth-mile markers and two posts at each gate', () => {
    expect(COURSE_POLES.filter((p) => p.kind === 1)).toHaveLength(11);
    expect(COURSE_POLES.filter((p) => p.kind === 2)).toHaveLength(2);
    expect(COURSE_POLES.filter((p) => p.kind === 3)).toHaveLength(2);
  });
});

describe('the stakes', () => {
  it('are sparse, scattered, the same every time, and never on the course', () => {
    let n = 0;
    for (let i = -20; i < 20; i++) {
      for (let j = -20; j < 20; j++) {
        const p = stakeIn(i, j);
        if (!p) continue;
        n++;
        expect(p).toEqual(stakeIn(i, j));
        expect(Math.abs(p.x - 5) < 60 && p.y > LINE.y0 && p.y < LINE.y1).toBe(false);
      }
    }
    expect(n / 1600).toBeGreaterThan(0.15);
    expect(n / 1600).toBeLessThan(0.4);
  });

  it('gives the nearest within reach', () => {
    const near = stakesNear(5000, 5000);
    expect(near.length).toBeLessThanOrEqual(MAX_STAKES);
    for (const p of near) expect(Math.hypot(p.x - 5000, p.y - 5000)).toBeLessThan(POLE_REACH);
    const d = near.map((p) => Math.hypot(p.x - 5000, p.y - 5000));
    expect([...d].sort((a, b) => a - b)).toEqual(d);
  });
});

describe('the horizon', () => {
  it('stands the sun just right of the first view, as in the piece', () => {
    const s = sunOnScreen(START.h, 1.5);
    expect(s.seen).toBe(1);
    expect(s.sx).toBeCloseTo(0.22, 2);
    expect(sunOnScreen(SUN_AZ + Math.PI, 1.5).seen).toBe(0);
  });

  it('spreads the mesas round the horizon', () => {
    expect(MESAS.length).toBeGreaterThanOrEqual(4);
    for (const m of MESAS) expect(m.height).toBeLessThan(0.05);
  });

  it('wraps the salt every 2,048 m', () => {
    expect(wrapPeriod(-1)).toBe(2047);
    expect(wrapPeriod(4097)).toBe(1);
  });
});

describe('the streak', () => {
  it('crosses the view 420 m out, then pauses, then comes again', () => {
    const cam = { x: 0, y: 0, yaw: Math.PI / 2 };
    const s = newStreak(cam, 10);
    const mid = streakAt(s, 10 + STREAK.run / 2);
    expect(mid).not.toBeNull();
    expect(mid?.hx ?? 99).toBeCloseTo(0, 6);
    expect(mid?.hy ?? 0).toBeCloseTo(STREAK.out, 6);
    // Left to right, its tail behind it.
    expect(mid?.tx ?? 0).toBeLessThan(mid?.hx ?? 0);
    expect(streakAt(s, 10 + STREAK.run + 1)).toBeNull();
    expect(streakDue(s, 10 + STREAK.cycle - 0.1)).toBe(false);
    expect(streakDue(s, 10 + STREAK.cycle)).toBe(true);
  });
});
