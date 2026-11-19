import { describe, expect, it } from 'vitest';

import {
  DRAG_TURN,
  dragTurn,
  newTurntable,
  SPIN,
  stepTurntable,
  TILT,
  tiltBy,
  ZOOM,
  zoomBy,
} from './garage';

describe('the turntable', () => {
  it('spins slowly by itself', () => {
    let t = newTurntable();
    for (let i = 0; i < 60; i++) t = stepTurntable(t, 1 / 60);
    expect(t.angle).toBeCloseTo(SPIN.idle, 3);
  });

  it('follows a drag, then carries the fling and eases back to the idle spin, same way round', () => {
    let t = dragTurn(newTurntable(), -100, 0.05);
    expect(t.angle).toBeCloseTo(-100 * DRAG_TURN);
    expect(t.speed).toBeLessThan(-SPIN.idle);
    const held = stepTurntable(t, 0.5);
    expect(held.angle).toBe(t.angle);
    t = { ...t, held: false };
    for (let i = 0; i < 600; i++) t = stepTurntable(t, 1 / 60);
    expect(t.speed).toBeCloseTo(-SPIN.idle, 2);
  });

  it('caps a wild fling', () => {
    expect(dragTurn(newTurntable(), 5000, 0.01).speed).toBe(SPIN.max);
  });

  it('keeps the camera tilt and distance in range', () => {
    expect(tiltBy(TILT.start, 1e6)).toBe(TILT.max);
    expect(tiltBy(TILT.start, -1e6)).toBe(TILT.min);
    expect(zoomBy(ZOOM.start, 1e6)).toBe(ZOOM.max);
    expect(zoomBy(ZOOM.start, -1e6)).toBe(ZOOM.min);
  });
});
