import { describe, expect, it } from 'vitest';

import { flow } from './bigbang';
import {
  CHANNEL_W,
  camera,
  colour,
  corals,
  EYE_H,
  makeParticles,
  PHASE_START,
  PHASES,
  particleAt,
  phaseAt,
  pulseOf,
  REEF_SLOTS,
  reefSlot,
  STEP_COLOURS,
  shoalFish,
  starBall,
  TOTAL,
  target,
} from './ocean';

const particles = makeParticles(1500);
const dist = (a: number[], b: number[]) =>
  Math.hypot(
    (a[0] as number) - (b[0] as number),
    (a[1] as number) - (b[1] as number),
    (a[2] as number) - (b[2] as number),
  );
const at = (k: number, u: number) =>
  (PHASE_START[k] as number) + u * (PHASES[k]?.duration as number);

describe('the ocean chapter', () => {
  it('has five pieces, from a coral garden to the reef, each with words', () => {
    expect(PHASES.map((p) => p.id)).toEqual(['coral', 'shoal', 'sardines', 'jellyfish', 'reef']);
    for (const p of PHASES) {
      expect(p.words).toHaveLength(2);
      expect(p.line.length).toBeGreaterThan(20);
    }
    expect(STEP_COLOURS).toHaveLength(PHASES.length);
    expect(TOTAL).toBe(PHASES.reduce((s, p) => s + p.duration, 0));
    expect(phaseAt(TOTAL + 1).index).toBe(0);
  });

  it('opens every piece from a wide ball of faint stars', () => {
    for (let k = 0; k < PHASES.length; k++) {
      const t = at(k, 0);
      for (const p of particles.slice(0, 50)) {
        expect(target(k, p, 0, t)).toEqual(starBall(k, p, t));
        expect(Math.max(...colour(k, p, 0, t))).toBeLessThan(0.35);
      }
    }
  });

  it('keeps every grain somewhere real, in every piece and between them', () => {
    for (let k = 0; k < PHASES.length; k++) {
      for (const u of [0, 0.3, 0.6, 0.85, 0.99]) {
        for (const p of particles.slice(0, 300)) {
          const { pos, rgb } = particleAt(p, at(k, u));
          for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
  });

  it('pours each grain into the next piece with no cut', () => {
    for (let k = 0; k < PHASES.length; k++) {
      const next = (k + 1) % PHASES.length;
      const t = at(k, 0.9999);
      for (const p of particles.slice(0, 200)) {
        expect(flow(p, 0.9999)).toBeCloseTo(1, 3);
        expect(dist(particleAt(p, t).pos, target(next, p, 0, t))).toBeLessThan(0.05);
      }
    }
  });

  it('grows the corals up from the sand like trees', () => {
    const all = corals();
    expect(all).toHaveLength(7);
    for (const c of all) expect(c.routes.length).toBeGreaterThan(20);
    const height = (u: number) =>
      Math.max(...particles.filter((p) => p.c >= 0.34).map((p) => target(0, p, u, at(0, u))[1]));
    // Grown by mid-piece: standing up from the sand at -14, none of it below.
    expect(height(0.6)).toBeGreaterThan(-14 + 8);
    for (const p of particles.filter((q) => q.c >= 0.34)) {
      expect(target(0, p, 0.6, at(0, 0.6))[1]).toBeGreaterThan(-14 - 1);
    }
  });

  it('keeps the shoal together and pointing the same way', () => {
    const t = at(1, 0.5);
    const fish = Array.from({ length: 36 }, (_, j) => shoalFish(j, 0.5, t));
    const c = [0, 1, 2].map((i) => fish.reduce((s, f) => s + (f.c[i] as number), 0) / fish.length);
    for (const f of fish) expect(dist(f.c, c)).toBeLessThan(16);
    const mean = [0, 1, 2].map(
      (i) => fish.reduce((s, f) => s + (f.f[i] as number), 0) / fish.length,
    );
    expect(Math.hypot(...mean)).toBeGreaterThan(0.6);
  });

  it('pulses each jellyfish between open and drawn in', () => {
    const pulls = Array.from({ length: 60 }, (_, i) => pulseOf(3, i * 0.1));
    expect(Math.min(...pulls)).toBeLessThan(0.05);
    expect(Math.max(...pulls)).toBeGreaterThan(0.9);
  });

  it('swims the eye down the reef channel, corals on both sides', () => {
    const a = camera(at(4, 0.2));
    const b = camera(at(4, 0.6));
    expect(a.eye[1]).toBeCloseTo(EYE_H, 6);
    expect(b.eye[2]).toBeLessThan(a.eye[2] - 20);
    const xs = Array.from({ length: REEF_SLOTS }, (_, j) => reefSlot(j).x);
    expect(xs.some((x) => x < -CHANNEL_W)).toBe(true);
    expect(xs.some((x) => x > CHANNEL_W)).toBe(true);
    for (const x of xs) expect(Math.abs(x)).toBeGreaterThan(CHANNEL_W);
    for (let s = 0; s < TOTAL; s += 3) {
      const { eye, target: aim } = camera(s);
      expect(dist(eye, aim)).toBeGreaterThan(1);
    }
  });
});
