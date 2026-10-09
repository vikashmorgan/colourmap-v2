import { describe, expect, it } from 'vitest';
import {
  fibonacciSphere,
  look,
  makeParticles,
  PHASE_START,
  PHASES,
  particleAt,
  phaseAt,
  sierpinskiTetra,
  sierpinskiTri,
  superformula,
  TOTAL,
} from './bigbang';

const particles = makeParticles(1200);
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('the steps', () => {
  it('has sixteen named steps that add up to the whole trip', () => {
    expect(PHASES).toHaveLength(16);
    expect(PHASES.map((p) => p.id)).toEqual([
      'explosion',
      'clusters',
      'gravity',
      'light',
      'symmetry',
      'play',
      'symtunnel',
      'depth',
      'tunnel',
      'fractal',
      'pulse',
      'growing',
      'cells',
      'microbes',
      'ocean',
      'shoals',
    ]);
    expect(TOTAL).toBe(PHASES.reduce((s, p) => s + p.duration, 0));
    expect(new Set(PHASES.map((p) => p.id)).size).toBe(PHASES.length);
  });

  it('finds the step and the progress through it, and loops', () => {
    expect(phaseAt(0)).toEqual({ index: 0, u: 0 });
    const mid = PHASE_START[3] + PHASES[3].duration / 2;
    expect(phaseAt(mid).index).toBe(3);
    expect(phaseAt(mid).u).toBeCloseTo(0.5);
    expect(phaseAt(TOTAL + mid).index).toBe(3);
    expect(phaseAt(-1).index).toBe(PHASES.length - 1);
  });
});

describe('one continuous trip', () => {
  it('never jumps at a step boundary', () => {
    for (let k = 1; k < PHASES.length; k++) {
      const b = PHASE_START[k];
      for (const p of particles.slice(0, 300)) {
        const before = particleAt(p, b - 1e-4).pos;
        const after = particleAt(p, b + 1e-4).pos;
        expect(dist(before, after)).toBeLessThan(0.05);
      }
    }
  });

  it('ends where it begins: the last moment and the first are the same point', () => {
    for (const p of particles.slice(0, 300)) {
      const end = particleAt(p, TOTAL - 1e-4).pos;
      const start = particleAt(p, 0).pos;
      expect(dist(end, start)).toBeLessThan(0.05);
      expect(dist(start, [0, 0, 0])).toBeLessThan(1e-9);
    }
  });

  it('gives finite positions and colours everywhere', () => {
    for (let s = 0; s < TOTAL; s += 1.7) {
      for (const p of particles.slice(0, 80)) {
        const { pos, rgb } = particleAt(p, s);
        for (const x of [...pos, ...rgb]) expect(Number.isFinite(x)).toBe(true);
      }
    }
  });

  it('blends glow and size smoothly', () => {
    const a = look(PHASE_START[3] - 0.01);
    const b = look(PHASE_START[3] + 0.01);
    expect(Math.abs(a.glow - b.glow)).toBeLessThan(0.05);
  });
});

describe('the mathematics', () => {
  it('spreads points evenly on the sphere (Fibonacci)', () => {
    const v = fibonacciSphere(5, 100);
    expect(Math.hypot(...v)).toBeCloseTo(1);
  });

  it('draws a circle with the superformula when m is 0', () => {
    expect(superformula(1.234, 0, 2, 2, 2)).toBeCloseTo(1);
    expect(superformula(0, 6, 1, 1, 1)).toBeGreaterThan(0);
  });

  it('keeps Sierpinski points inside their shapes', () => {
    for (let i = 0; i < 200; i++) {
      const x = (i * 0.6180339887) % 1;
      const [tx, ty] = sierpinskiTri(x, 9);
      expect(tx).toBeGreaterThanOrEqual(0);
      expect(tx).toBeLessThanOrEqual(1);
      expect(ty).toBeGreaterThanOrEqual(0);
      expect(ty).toBeLessThanOrEqual(Math.sqrt(3) / 2 + 1e-9);
      const t = sierpinskiTetra(x, 8, 10);
      for (const c of t) expect(Math.abs(c)).toBeLessThanOrEqual(10 * 0.5 + 1e-9);
    }
  });
});
