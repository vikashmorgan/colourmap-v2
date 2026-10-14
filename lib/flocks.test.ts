import { describe, expect, it } from 'vitest';

import {
  birdCentre,
  birdTarget,
  fishTarget,
  fishWeights,
  predator,
  split,
  steer,
  view,
} from './flocks';

describe('the murmuration', () => {
  it('is one flock at times and breaks into three at others', () => {
    const splits = Array.from({ length: 200 }, (_, i) => split(i * 0.5));
    expect(Math.min(...splits)).toBe(0);
    expect(Math.max(...splits)).toBeGreaterThan(0.95);
    const t0 = splits.indexOf(0) * 0.5;
    const t1 = splits.findIndex((s) => s > 0.95) * 0.5;
    const gap = (t: number) =>
      Math.hypot(
        ...(birdCentre(0, t).map((v, i) => v - (birdCentre(1, t)[i] as number)) as [
          number,
          number,
          number,
        ]),
      );
    expect(gap(t0)).toBeLessThan(0.01);
    expect(gap(t1)).toBeGreaterThan(0.5);
  });

  it('keeps the birds in view', () => {
    for (let t = 0; t < 120; t += 3.7) {
      const p = birdTarget([1, 1, 1], 2, t);
      for (const v of p) expect(Math.abs(v)).toBeLessThan(1.3);
    }
  });
});

describe('the school of fish', () => {
  it('mills, streams and balls in turn, the weights always adding to one', () => {
    const seen = new Set<string>();
    for (let t = 0; t < 120; t += 1) {
      const w = fishWeights(t);
      expect(w.mill + w.stream + w.ball).toBeCloseTo(1, 6);
      for (const [k, v] of Object.entries(w)) if (v > 0.99) seen.add(k);
    }
    expect([...seen].sort()).toEqual(['ball', 'mill', 'stream']);
  });

  it('turns round the torus while milling', () => {
    const a = fishTarget(0.1, 0.5, 0.5, 1);
    const b = fishTarget(0.1, 0.5, 0.5, 2);
    expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeGreaterThan(0.2);
    expect(Math.hypot(a[0], a[2])).toBeCloseTo(0.42, 1);
  });

  it('sends a predator through now and then', () => {
    expect(predator(1)).not.toBeNull();
    expect(predator(6)).toBeNull();
  });

  it('makes fish flee a predator in their midst', () => {
    const pos = new Float32Array([0.05, 0, 0]);
    const vel = new Float32Array([0, 0, 0]);
    steer(pos, vel, () => [0, 0, 0], 0, 1 / 30, {
      pull: 2,
      flow: 0,
      turn: 30,
      vmin: 0,
      vmax: 5,
      threat: [0, 0, 0],
    });
    expect(pos[0]).toBeGreaterThan(0.05);
  });
});

describe('steering and the view', () => {
  it('brings a member toward its target, never faster than allowed', () => {
    const pos = new Float32Array([1, 0, 0]);
    const vel = new Float32Array([0, 0, 0]);
    for (let i = 0; i < 120; i++)
      steer(pos, vel, () => [0, 0, 0], i / 60, 1 / 60, {
        pull: 2,
        flow: 0,
        turn: 3,
        vmin: 0,
        vmax: 0.8,
      });
    expect(Math.abs(pos[0] as number)).toBeLessThan(0.5);
    expect(Math.hypot(vel[0] as number, vel[1] as number, vel[2] as number)).toBeLessThanOrEqual(
      0.8001,
    );
  });

  it('draws nearer points larger', () => {
    const near = view([0.5, 0, 0.5], 0, 0);
    const far = view([0.5, 0, -0.5], 0, 0);
    expect(near[0]).toBeGreaterThan(far[0]);
  });
});
