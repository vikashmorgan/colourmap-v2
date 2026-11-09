import { describe, expect, it } from 'vitest';

import { flow, GOLDEN_ANGLE } from './bigbang';
import { along, routeLength } from './star-tree';
import {
  along3,
  CELL_COUNT,
  camera,
  cellOf,
  FLORETS,
  floret,
  fruitOf,
  GROUND_FRUIT,
  makeParticles,
  PHASE_START,
  PHASES,
  particleAt,
  phaseAt,
  ROOT_BASE,
  rootSystem,
  STEP_COLOURS,
  TOTAL,
  target,
  tree3d,
} from './vegetal';

const particles = makeParticles(1500);
const dist = (a: number[], b: number[]) =>
  Math.hypot(
    (a[0] as number) - (b[0] as number),
    (a[1] as number) - (b[1] as number),
    (a[2] as number) - (b[2] as number),
  );
const at = (k: number, u: number) =>
  (PHASE_START[k] as number) + u * (PHASES[k]?.duration as number);

describe('the vegetal chapter', () => {
  it('has eight numbered pieces, from a cell to fruit and seed, each with words', () => {
    expect(PHASES.map((p) => p.id)).toEqual([
      'cell',
      'roots',
      'tree-2d',
      'tree-3d',
      'fungi',
      'leaf',
      'flower',
      'fruit',
    ]);
    for (const p of PHASES) {
      expect(p.words).toHaveLength(2);
      expect(p.line.length).toBeGreaterThan(20);
    }
    expect(STEP_COLOURS).toHaveLength(PHASES.length);
    expect(TOTAL).toBe(PHASES.reduce((s, p) => s + p.duration, 0));
    expect(phaseAt(at(3, 0.5))).toEqual({ index: 3, u: expect.closeTo(0.5, 6) });
    expect(phaseAt(TOTAL + 1).index).toBe(0);
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

  it('grows the cells out of the middle into a block of sixty separate cells', () => {
    const early = cellOf(CELL_COUNT - 1, 0);
    expect(Math.hypot(...early.c)).toBeLessThan(0.01);
    const centres = new Set(
      Array.from({ length: CELL_COUNT }, (_, j) =>
        cellOf(j, 0.6)
          .c.map((v) => v.toFixed(2))
          .join(),
      ),
    );
    expect(centres.size).toBe(CELL_COUNT);
  });

  it('grows every root from one base, and keeps them below it', () => {
    const { routes } = rootSystem();
    expect(routes.length).toBeGreaterThan(100);
    for (const r of routes) {
      const [x, y] = along(r, 0);
      expect(Math.hypot(x, y)).toBeLessThan(1e-6);
      expect(routeLength(r)).toBeGreaterThan(0.3);
    }
    for (const p of particles) {
      expect(target(1, p, 0.6, at(1, 0.6))[1]).toBeLessThanOrEqual(ROOT_BASE[1] + 2);
    }
  });

  it('spreads the 3D tree round its trunk in every direction', () => {
    const tips = tree3d().map((r) => along3(r, (r.count - 1) * 0.2));
    const quadrants = new Set(tips.map(([x, , z]) => `${Math.sign(x)}${Math.sign(z)}`));
    expect(quadrants.size).toBe(4);
    const zs = tips.map((q) => q[2]);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(10);
  });

  it('sets each floret a golden angle on from the one before', () => {
    for (const n of [10, 200, FLORETS - 2]) {
      const a = floret(n, 1, 0);
      const b = floret(n + 1, 1, 0);
      const turn = Math.atan2(b[1] - 4, b[0]) - Math.atan2(a[1] - 4, a[0]);
      const diff =
        ((((turn - GOLDEN_ANGLE) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
      expect(Math.abs(diff)).toBeLessThan(1e-6);
    }
  });

  it('lets the fruit swell, fall to the ground, and the camera follow it', () => {
    expect(fruitOf(0.3, 0).r).toBeGreaterThan(fruitOf(0.05, 0).r);
    expect(fruitOf(0.3, 0).c[1]).toBeGreaterThan(fruitOf(0.5, 0).c[1]);
    const landed = fruitOf(0.55, 0);
    expect(landed.c[1] - landed.r).toBeCloseTo(GROUND_FRUIT, 5);
    for (let s = 0; s < TOTAL; s += 3) {
      const { eye, target: aim } = camera(s);
      expect(dist(eye, aim)).toBeGreaterThan(1);
    }
  });
});
