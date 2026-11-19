import { describe, expect, it } from 'vitest';

import {
  boostOf,
  controlsFromKeys,
  controlsFromTouches,
  crosses,
  ease,
  easeAngle,
  formatTime,
  kmh,
  makeTrail,
  mergeControls,
  NO_CONTROLS,
  newRun,
  pushTrail,
  speedFeel,
  stepRun,
  trailFade,
  trailIndex,
  wrapAngle,
} from './drive';

describe('controls', () => {
  it('reads the City game convention from the keys held', () => {
    expect(controlsFromKeys(new Set(['w', 'a']))).toEqual({
      throttle: 1,
      steer: 1,
      boost: 0,
      handbrake: false,
    });
    expect(controlsFromKeys(new Set(['arrowdown', 'arrowright']))).toEqual({
      throttle: -1,
      steer: -1,
      boost: 0,
      handbrake: false,
    });
    expect(controlsFromKeys(new Set(['f', 'a'])).handbrake).toBe(true);
    expect(controlsFromKeys(new Set([' '])).boost).toBe(1);
    expect(controlsFromKeys(new Set([' ', 'shift'])).boost).toBe(2);
    expect(controlsFromKeys(new Set())).toEqual({ ...NO_CONTROLS, handbrake: false });
  });

  it('drives on any touch and steers from the outer thirds', () => {
    expect(controlsFromTouches([])).toEqual(NO_CONTROLS);
    expect(controlsFromTouches([0.5])).toEqual({ throttle: 1, steer: 0, boost: 0 });
    expect(controlsFromTouches([0.05]).steer).toBe(1);
    expect(controlsFromTouches([0.95]).steer).toBe(-1);
    // A finger more in the middle boosts; both edges just steer.
    expect(controlsFromTouches([0.1, 0.5]).boost).toBe(1);
    expect(controlsFromTouches([0.05, 0.95])).toEqual({ throttle: 1, steer: 0, boost: 0 });
    expect(controlsFromTouches([0.1, 0.5, 0.6]).boost).toBe(2);
  });

  it('merges keys and touches, the stronger input winning', () => {
    const m = mergeControls(
      { throttle: 1, steer: 0, boost: 0 },
      { throttle: 0, steer: -1, boost: 1 },
    );
    expect(m).toEqual({ throttle: 1, steer: -1, boost: 1, handbrake: false });
    expect(mergeControls(NO_CONTROLS, { ...NO_CONTROLS, handbrake: true }).handbrake).toBe(true);
  });

  it('lifts top speed and pull with the boost', () => {
    expect(boostOf(0)).toEqual({ top: 1, pull: 1 });
    expect(boostOf(1).top).toBeGreaterThan(1);
    expect(boostOf(2).top).toBeGreaterThan(boostOf(1).top);
  });
});

describe('easing and feel', () => {
  it('eases toward the target independent of frame rate', () => {
    const one = ease(0, 1, 3, 0.1);
    let two = 0;
    two = ease(two, 1, 3, 0.05);
    two = ease(two, 1, 3, 0.05);
    expect(two).toBeCloseTo(one, 10);
  });

  it('eases angles the short way round', () => {
    expect(Math.abs(wrapAngle(3 * Math.PI))).toBeCloseTo(Math.PI, 10);
    expect(wrapAngle(0.5 + 4 * Math.PI)).toBeCloseTo(0.5, 10);
    const a = easeAngle(3, -3, 100, 1);
    expect(wrapAngle(a)).toBeCloseTo(-3, 6);
    // The short way from 3 to -3 passes through π, not 0.
    expect(easeAngle(3, -3, 1, 0.01)).toBeGreaterThan(3);
  });

  it('widens the view and shakes more with speed', () => {
    const slow = speedFeel(0, 90, 1);
    const fast = speedFeel(90, 90, 1);
    expect(fast.fov).toBeGreaterThan(slow.fov);
    expect(slow.shakeX).toBe(0);
    expect(Math.abs(fast.shakeX) + Math.abs(fast.shakeY)).toBeGreaterThan(0);
    expect(kmh(25)).toBe(90);
  });
});

describe('gates and runs', () => {
  const gate = { ax: -10, ay: 100, bx: 10, by: 100 };

  it('crosses a gate only between its posts', () => {
    expect(crosses(0, 90, 0, 110, gate)).toBe(true);
    expect(crosses(0, 110, 0, 90, gate)).toBe(true);
    expect(crosses(30, 90, 30, 110, gate)).toBe(false);
    expect(crosses(0, 80, 0, 95, gate)).toBe(false);
  });

  it('times a run from the start gate to the finish and keeps the best', () => {
    const finish = { ax: -10, ay: 200, bx: 10, by: 200 };
    let r = newRun();
    r = stepRun(r, gate, finish, 0, 99, 0, 101, 10);
    expect(r.start).toBe(10);
    r = stepRun(r, gate, finish, 0, 199, 0, 201, 25);
    expect(r).toMatchObject({ start: null, last: 15, best: 15, record: true });
    r = stepRun(r, gate, finish, 0, 99, 0, 101, 30);
    r = stepRun(r, gate, finish, 0, 199, 0, 201, 50);
    expect(r).toMatchObject({ last: 20, best: 15, record: false });
    // The finish without a start does nothing.
    expect(stepRun(newRun(), gate, finish, 0, 199, 0, 201, 5)).toEqual(newRun());
  });

  it('formats times quietly', () => {
    expect(formatTime(41.268)).toBe('41.27');
    expect(formatTime(75.5)).toBe('1:15.50');
    expect(formatTime(-1)).toBe('0.00');
  });
});

describe('trails', () => {
  it('drops a point every spacing and moves the head between', () => {
    const tr = makeTrail(4, 2);
    pushTrail(tr, 0, 0, 0, 0, 1);
    pushTrail(tr, 1, 0, 0, 0.1, 1);
    expect(tr.count).toBe(2);
    pushTrail(tr, 1.5, 0, 0, 0.2, 1);
    expect(tr.count).toBe(2);
    expect(tr.x[trailIndex(tr, 0)]).toBe(1.5);
    pushTrail(tr, 4, 0, 0, 0.3, 1);
    pushTrail(tr, 6, 0, 0, 0.4, 1);
    pushTrail(tr, 8, 0, 0, 0.5, 1);
    expect(tr.count).toBe(4);
    expect(tr.x[trailIndex(tr, 3)]).toBe(1.5);
    // A jump (a reset) starts it over.
    pushTrail(tr, 500, 0, 0, 1, 1);
    expect(tr.count).toBe(1);
  });

  it('fades marks out by their life', () => {
    expect(trailFade(0, 5)).toBe(1);
    expect(trailFade(2.5, 5)).toBeCloseTo(0.25);
    expect(trailFade(6, 5)).toBe(0);
  });
});
