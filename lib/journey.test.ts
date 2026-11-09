import { describe, expect, it } from 'vitest';

import { flow } from './bigbang';
import {
  camera,
  colour,
  GROUND,
  look,
  makeParticles,
  PHASE_START,
  PHASES,
  particleAt,
  phaseAt,
  SEED,
  STEP_COLOURS,
  TOTAL,
  target,
  tree,
  wordsShown,
} from './journey';

const particles = makeParticles(1500);
const dist = (a: number[], b: number[]) =>
  Math.hypot(
    (a[0] as number) - (b[0] as number),
    (a[1] as number) - (b[1] as number),
    (a[2] as number) - (b[2] as number),
  );
const at = (k: number, u: number) =>
  (PHASE_START[k] as number) + u * (PHASES[k]?.duration as number);

describe('the journey', () => {
  it('goes from a warm sea to a seed in nine steps, each with a thread and its words', () => {
    expect(PHASES.map((p) => p.id)).toEqual([
      'sea',
      'bacteria',
      'veins',
      'cells',
      'swarm',
      'tree',
      'pulses',
      'roots',
      'seed',
    ]);
    expect(PHASES.map((p) => p.thread)).toContain('Now');
    for (const p of PHASES) {
      expect(p.words.length).toBeGreaterThanOrEqual(2);
      expect(p.words.length).toBeLessThanOrEqual(3);
      expect(p.line.length).toBeGreaterThan(20);
    }
    expect(STEP_COLOURS).toHaveLength(PHASES.length);
    expect(TOTAL).toBe(PHASES.reduce((s, p) => s + p.duration, 0));
    expect(phaseAt(at(4, 0.5))).toEqual({ index: 4, u: expect.closeTo(0.5, 6) });
    expect(phaseAt(TOTAL + 1).index).toBe(0);
  });

  it('keeps every grain somewhere real, in every step and between them', () => {
    for (let k = 0; k < PHASES.length; k++) {
      for (const u of [0, 0.3, 0.6, 0.85, 0.99]) {
        for (const p of particles.slice(0, 300)) {
          const { pos, rgb } = particleAt(p, at(k, u));
          for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
  });

  it('pours each grain into the next step with no cut', () => {
    for (let k = 0; k < PHASES.length; k++) {
      const next = (k + 1) % PHASES.length;
      const t = at(k, 0.9999);
      for (const p of particles.slice(0, 200)) {
        expect(flow(p, 0.9999)).toBeCloseTo(1, 3);
        const end = particleAt(p, t).pos;
        // The next step starts where this one ends.
        expect(dist(end, target(next, p, 0, t))).toBeLessThan(0.05);
      }
    }
  });

  it('grows the tree up from the ground, and keeps the roots below it', () => {
    expect(tree().length).toBeGreaterThan(100);
    for (const p of particles) {
      const y = target(5, p, 0.6, at(5, 0.6))[1];
      expect(y).toBeGreaterThanOrEqual(GROUND - 1.5);
      expect(y).toBeLessThan(GROUND + 40);
    }
    for (const p of particles) {
      const y = target(7, p, 0.6, at(7, 0.6))[1];
      expect(y).toBeLessThanOrEqual(GROUND + 0.5);
    }
  });

  it('divides one cell into thirty-two, then gathers every grain into the seed', () => {
    const t = at(3, 0.7);
    const centres = new Set(particles.map((p) => Math.floor(p.a * 32)));
    expect(centres.size).toBe(32);
    // At the start of the cells step all grains are in one cell.
    const first = particles.map((p) => target(3, p, 0, t));
    for (const q of first) expect(Math.hypot(q[0], q[1], q[2])).toBeLessThanOrEqual(6.01);
    // Late in the seed step every grain is in the seed.
    for (const p of particles) {
      const q = target(8, p, 0.58, at(8, 0.58));
      expect(dist(q, SEED)).toBeLessThan(5);
      expect(colour(8, p, 0.58, at(8, 0.58))[0]).toBeGreaterThan(0.05);
    }
  });

  it('shows the words a line at a time after the step forms, and clears them before the next', () => {
    expect(wordsShown(0, 3)).toEqual([0, 0, 0]);
    expect(wordsShown(0.6, 3).every((v) => v > 0.99)).toBe(true);
    expect(wordsShown(0.97, 3)).toEqual([0, 0, 0]);
    const early = wordsShown(0.22, 3);
    expect(early[0]).toBeGreaterThan(early[2] as number);
  });

  it('takes the eye into the trunk, below the ground, and close to the seed', () => {
    const inTrunk = camera(at(6, 0.7)).eye;
    expect(Math.hypot(inTrunk[0], inTrunk[2])).toBeLessThan(20);
    expect(camera(at(7, 0.6)).eye[1]).toBeLessThan(GROUND);
    expect(dist(camera(at(8, 0.7)).eye, SEED)).toBeLessThan(30);
    for (let s = 0; s < TOTAL; s += 3) {
      const { eye, target: aim } = camera(s);
      expect(dist(eye, aim)).toBeGreaterThan(1);
    }
    expect(look(at(6, 0.5)).glow).toBeGreaterThan(look(at(0, 0.5)).glow);
  });
});
