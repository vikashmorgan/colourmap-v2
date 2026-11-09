import { describe, expect, it } from 'vitest';

import { flow, GOLDEN_ANGLE } from './bigbang';
import { along, routeLength } from './star-tree';
import {
  along3,
  CELL_COUNT,
  camera,
  cellOf,
  colour,
  EYE_H,
  FLORETS,
  FOREST_SLOTS,
  floret,
  forestTrees,
  fruitOf,
  GROUND_FRUIT,
  makeParticles,
  mandala,
  PHASE_START,
  PHASES,
  particleAt,
  phaseAt,
  ROAD_W,
  ROOT_BASE,
  rootSystem,
  STEP_COLOURS,
  starBall,
  TOTAL,
  target,
  tree3d,
  treeSlot,
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
  it('has eleven numbered pieces, from a cell to the forest road, each with words', () => {
    expect(PHASES.map((p) => p.id)).toEqual([
      'cell',
      'roots',
      'tree-2d',
      'tree-3d',
      'veins',
      'fungi',
      'leaf',
      'flower',
      'fruit',
      'avenue',
      'forest',
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

  it('opens every piece from a wide ball of faint stars, never one crowded point', () => {
    for (let k = 0; k < PHASES.length; k++) {
      const t = at(k, 0);
      const pts = particles.map((p) => target(k, p, 0, t));
      const c = [0, 1, 2].map((i) => pts.reduce((s, q) => s + (q[i] as number), 0) / pts.length);
      const spread = Math.sqrt(pts.reduce((s, q) => s + dist(q, c) ** 2, 0) / pts.length);
      expect(spread).toBeGreaterThan(10);
      for (const p of particles.slice(0, 50)) {
        expect(target(k, p, 0, t)).toEqual(starBall(k, p, t));
        expect(Math.max(...colour(k, p, 0, t))).toBeLessThan(0.35);
      }
    }
  });

  it('turns the veins round the centre: eight copies, each mirrored, inside one circle', () => {
    expect(mandala().reach).toBeGreaterThan(0);
    for (const p of particles) {
      const [x, y] = target(4, p, 0.6, at(4, 0.6));
      expect(Math.hypot(x, y)).toBeLessThan(24 * 1.1);
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

  it('mirrors the avenue across the road, and lets no two sides of the forest match', () => {
    for (let j = 0; j < FOREST_SLOTS; j += 2) {
      const left = treeSlot(9, j);
      const right = treeSlot(9, j + 1);
      expect(right.x).toBeCloseTo(-left.x, 9);
      expect(right.z0).toBe(left.z0);
      expect(right.mirror).toBe(!left.mirror);
    }
    // In the forest, no tree stands opposite a twin.
    const wild = Array.from({ length: FOREST_SLOTS }, (_, j) => treeSlot(10, j));
    expect(new Set(wild.map((s) => Math.sign(s.x))).size).toBe(2);
    for (const a of wild) {
      for (const b of wild) {
        if (a === b) continue;
        const twin = Math.abs(a.x + b.x) < 0.5 && Math.abs(a.z0 - b.z0) < 0.5 && a.kind === b.kind;
        expect(twin).toBe(false);
      }
    }
    expect(forestTrees()).toHaveLength(4);
  });

  it('flies the eye down the road a little above it, as the trees grow toward it', () => {
    for (const k of [9, 10]) {
      const a = camera(at(k, 0.2));
      const b = camera(at(k, 0.6));
      expect(a.eye[1]).toBeCloseTo(EYE_H, 6);
      expect(Math.abs(a.eye[0])).toBeLessThan(ROAD_W);
      expect(b.eye[2]).toBeLessThan(a.eye[2] - 20);
      // Trees just ahead of the eye stand taller than the seedlings far down the road.
      const t = at(k, 0.6);
      const trees = particles.filter((p) => p.c >= 0.42).map((p) => target(k, p, 0.6, t));
      const eyeZ = b.eye[2];
      const tall = (lo: number, hi: number) =>
        Math.max(0, ...trees.filter((q) => eyeZ - q[2] > lo && eyeZ - q[2] < hi).map((q) => q[1]));
      expect(tall(10, 40)).toBeGreaterThan(2 * tall(100, 125));
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
