import { describe, expect, it } from 'vitest';

import { labelPoint, NODE_RING, nodePoint, spokeAngle, spokePoint } from './star-wheel';

const f = { cx: 500, cy: 400, min: 800 };
const dist = ([x, y]: [number, number]) => Math.hypot(x - f.cx, y - f.cy);

describe('the star wheel', () => {
  it('puts the first spoke at the top and goes round clockwise', () => {
    expect(spokeAngle(0, 8)).toBeCloseTo(-Math.PI / 2);
    expect(spokeAngle(2, 8)).toBeCloseTo(0);
    const [x, y] = nodePoint(f, 0, 8);
    expect(x).toBeCloseTo(f.cx);
    expect(y).toBeLessThan(f.cy);
  });

  it('runs a spoke from the ball out to its hub, bowed off straight in the middle', () => {
    const a = spokeAngle(2, 8);
    expect(dist(spokePoint(f, a, 0, 0, 30))).toBeCloseTo(30);
    const end = spokePoint(f, a, 1, 0, 30);
    expect(dist(end)).toBeCloseTo(NODE_RING * f.min);
    expect(end[0]).toBeCloseTo(nodePoint(f, 2, 8)[0]);
    expect(end[1]).toBeCloseTo(nodePoint(f, 2, 8)[1]);
    // Pointing right, the middle bows down, off the straight line.
    expect(spokePoint(f, a, 0.5, 0, 30)[1]).toBeGreaterThan(f.cy + 5);
  });

  it('is wider where it leaves the ball than where it reaches the hub', () => {
    const a = spokeAngle(0, 4);
    const near = Math.abs(spokePoint(f, a, 0, 1, 30)[0] - spokePoint(f, a, 0, -1, 30)[0]);
    const far = Math.abs(spokePoint(f, a, 1, 1, 30)[0] - spokePoint(f, a, 1, -1, 30)[0]);
    expect(near).toBeGreaterThan(far * 2);
  });

  it('sets each name beyond its hub', () => {
    expect(dist(labelPoint(f, 3, 8))).toBeGreaterThan(dist(nodePoint(f, 3, 8)));
  });
});
