import { describe, expect, it } from 'vitest';

import { normalAt, polygonSdf, speedColour, WIND_SHAPES, windShape, windVelocity } from './wind';

describe('wind', () => {
  const [sphere, wing, body] = WIND_SHAPES;

  it('blows left to right at speed 1 far from the object', () => {
    for (const s of WIND_SHAPES) {
      const [vx, vy] = windVelocity(s!, -2.5, 0.9, 0);
      expect(vx).toBeCloseTo(1, 2);
      expect(Math.abs(vy)).toBeLessThan(0.01);
    }
  });

  it('stops on the nose of a sphere and speeds up over its shoulder', () => {
    const nose = windVelocity(sphere!, -0.45 - 0.32 - 0.005, 0, 0);
    expect(Math.hypot(...nose)).toBeLessThan(0.2);
    const top = windVelocity(sphere!, -0.45, 0.32 + 0.01, 0);
    expect(top[0]).toBeGreaterThan(1.3);
  });

  it('never blows into the object at its surface', () => {
    for (const s of [sphere!, wing!, body!]) {
      for (const [px, py] of s.outline) {
        // A point just outside the outline.
        const [nx, ny] = normalAt(s, px, py);
        const x = px + nx * 0.004;
        const y = py + ny * 0.004;
        const [vx, vy] = windVelocity(s, x, y, 0);
        expect(vx * nx + vy * ny).toBeGreaterThan(-0.05);
      }
    }
  });

  it('pushes the air down behind the wing, on average', () => {
    let sum = 0;
    for (let i = 0; i < 40; i++) sum += windVelocity(wing!, wing!.tail + 0.2, 0, i * 0.1)[1];
    expect(sum / 40).toBeLessThan(0);
  });

  it('sheds a wake behind a blunt body that changes with time', () => {
    const a = windVelocity(sphere!, sphere!.tail + 0.4, 0.05, 0);
    const b = windVelocity(sphere!, sphere!.tail + 0.4, 0.05, 0.25);
    expect(Math.abs(a[1] - b[1])).toBeGreaterThan(0.05);
    // ...and the wake is slower than the free stream.
    expect(windVelocity(sphere!, sphere!.tail + 0.3, 0, 0)[0]).toBeLessThan(1);
  });

  it('measures distance to a polygon, negative inside', () => {
    const square: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    expect(polygonSdf(square, 0.5, 0.5)).toBeCloseTo(-0.5);
    expect(polygonSdf(square, 2, 0.5)).toBeCloseTo(1);
  });

  it('chooses a shape by number, clamped', () => {
    expect(windShape(0).name).toBe('sphere');
    expect(windShape(1).name).toBe('wing');
    expect(windShape(2).name).toBe('body');
    expect(windShape(9).name).toBe('body');
    expect(windShape(-3).name).toBe('sphere');
  });

  it('colours slow air blue and fast air gold', () => {
    expect(speedColour(0)[0]).toBeGreaterThan(200);
    expect(speedColour(2)[0]).toBeLessThan(60);
  });
});
