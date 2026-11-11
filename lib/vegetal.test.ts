import { describe, expect, it } from 'vitest';

import { flow, GOLDEN_ANGLE } from './bigbang';
import { along, routeLength } from './star-tree';
import {
  along3,
  BEAT,
  beatAt,
  bendAt,
  CELL_COUNT,
  camera,
  cellOf,
  colour,
  DRUMS,
  EYE_H,
  FLORETS,
  FOREST_SLOTS,
  floret,
  forestTrees,
  fruitOf,
  GROUND_3D,
  GROUND_FRUIT,
  GROUNDS,
  makeParticles,
  mandala,
  PHASE_START,
  PHASES,
  particleAt,
  phaseAt,
  pieceAt,
  pieceCamera,
  pieceLength,
  REFL_TREES,
  ROAD_W,
  ROOT_BASE,
  reflTreeRoutes,
  rootSystem,
  rowOpen,
  STEP_COLOURS,
  setGold,
  setVariant,
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
  it('has fourteen numbered pieces, from a cell to a flower blooming, each with words', () => {
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
      'full-tree',
      'reflection',
      'bloom',
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
      // Over the road, or over the river wherever it has bent (the eye stands 14 into the loop).
      expect(Math.abs(a.eye[0] - bendAt(k, -a.eye[2] + 14))).toBeLessThan(ROAD_W);
      if (k === 10) {
        expect(Math.abs(bendAt(k, 30) - bendAt(k, 0))).toBeGreaterThan(2);
        expect(bendAt(k, 30)).toBeCloseTo(bendAt(k, 30 + 140), 6);
      }
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

  it('puts the roots below the horizon and the tree above it, all gold, no green', () => {
    const k = PHASES.findIndex((p) => p.id === 'full-tree');
    const t = at(k, 0.7);
    let below = 0;
    let above = 0;
    for (const p of particles) {
      const pos = target(k, p, 0.7, t);
      const [r, g, b] = colour(k, p, 0.7, t);
      // Gold: red at least green, green above blue.
      expect(r).toBeGreaterThanOrEqual(g - 1e-9);
      expect(g).toBeGreaterThanOrEqual(b - 1e-9);
      if (pos[1] < -2) below++;
      if (pos[1] > 2) above++;
    }
    expect(below).toBeGreaterThan(particles.length * 0.2);
    expect(above).toBeGreaterThan(particles.length * 0.2);
  });

  it("starts the full tree's roots straight down, a little below the horizon, before they spread", () => {
    const k = PHASES.findIndex((p) => p.id === 'full-tree');
    const t = at(k, 0.7);
    const roots = particles
      .filter((p) => p.c >= 0.07 && p.c < 0.45)
      .map((p) => target(k, p, 0.7, t));
    for (const [x, y, z] of roots) {
      expect(y).toBeLessThan(0.1);
      // Just under the horizon only the straight neck: no root has leaned out yet.
      if (y > -3) expect(Math.hypot(x, z)).toBeLessThan(1.5);
    }
  });

  it('makes the veins exactly symmetric: sixteen copies of one picture, turned and mirrored', () => {
    const t = at(4, 0.6);
    const all = makeParticles(1600);
    // Grains 0..15 are one run, one per copy: all the same distance from the centre.
    for (let run = 0; run < 100; run++) {
      const r = all
        .slice(run * 16, run * 16 + 16)
        .map((p) => Math.hypot(...(target(4, p, 0.6, t).slice(0, 2) as [number, number])));
      for (const v of r) expect(v).toBeCloseTo(r[0] as number, 6);
    }
  });

  it('gives the tree in the water the shape of the tree above, turned over and rippling', () => {
    const k = PHASES.findIndex((p) => p.id === 'reflection');
    const all = makeParticles(2000);
    // At a ripple-free moment for the trunk's foot, the pair meets at the water.
    const t = at(k, 0.7);
    let above = 0;
    for (let i = 0; i < all.length; i += 2) {
      const up = target(k, all[i] as (typeof all)[0], 0.7, t);
      const down = target(k, all[i + 1] as (typeof all)[0], 0.7, t);
      if (up[1] > 1) {
        above++;
        expect(down[1]).toBeLessThan(0);
        expect(Math.abs(down[1] + up[1])).toBeLessThan(0.3);
        expect(Math.abs(down[0] - up[0])).toBeLessThan(0.8);
        expect(down[2]).toBeCloseTo(up[2], 6);
      }
    }
    expect(above).toBeGreaterThan(500);
    // The tree above does not turn: the eye stands still.
    expect(camera(at(k, 0.2))).toEqual(camera(at(k, 0.6)));
  });

  it('stands five trees over five waters in the reflection, each mirrored and none a willow', () => {
    const k = PHASES.findIndex((p) => p.id === 'reflection');
    const t = at(k, 0.7);
    const all = makeParticles(3000);
    expect(REFL_TREES.map((r) => r.name)).toEqual(['Oak', 'Pine', 'Birch', 'Cherry', 'Baobab']);
    const shapes = REFL_TREES.map((_, i) => {
      setVariant(i, k);
      const routes = reflTreeRoutes(i);
      expect(routes.length).toBeGreaterThan(10);
      let water = 0;
      let top = 0;
      for (const p of all) {
        const pos = target(k, p, 0.7, t);
        const rgb = colour(k, p, 0.7, t);
        for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        // Nothing hangs down from the crown: the tree stays above the water (only the trunk's
        // foot dips in), its reflection below.
        if (p.i % 2 === 0) expect(pos[1]).toBeGreaterThan(-2);
        if (Math.abs(pos[1]) < 0.6 && Math.max(...rgb) > 0.1) water++;
        top = Math.max(top, pos[1]);
      }
      // The water shows: a good share of the grains light its surface.
      expect(water).toBeGreaterThan(all.length * 0.08);
      // Every tree fits the picture.
      expect(top).toBeLessThan(42);
      return top;
    });
    // Five different trees.
    expect(new Set(shapes.map((h) => Math.round(h))).size).toBeGreaterThanOrEqual(4);
    setVariant(0);
  });

  it('grows the bloom slowly: the stem first, then the bud, then the petals open from the outside in', () => {
    const k = PHASES.findIndex((p) => p.id === 'bloom');
    const height = (u: number) =>
      Math.max(
        ...particles.filter((p) => p.c < 0.1).map((p) => pieceAt(p, k, u * pieceLength(k)).pos[1]),
      );
    expect(height(0.05)).toBeLessThan(height(0.15));
    expect(height(0.15)).toBeLessThan(height(0.3));
    // Closed while the bud swells, open by the end, the outer row ahead of the inner.
    expect(rowOpen(0, 0.4)).toBe(0);
    expect(rowOpen(0, 0.85)).toBeGreaterThan(0.9);
    expect(rowOpen(0, 0.65)).toBeGreaterThan(rowOpen(2, 0.65));
    const spread = (u: number) =>
      Math.max(
        ...particles
          .filter((p) => p.c >= 0.24 && p.c < 0.86)
          .map((p) => {
            const [x, , z] = pieceAt(p, k, u * pieceLength(k)).pos;
            return Math.hypot(x, z);
          }),
      );
    expect(spread(0.78)).toBeGreaterThan(spread(0.4) * 2);
  });

  it('lays each ground under the 3D tree on the floor', () => {
    const t = at(3, 0.7);
    const soil = particles.filter((p) => p.c > 0.72 && p.c <= 0.8);
    GROUNDS.forEach((_, g) => {
      setVariant(g, 3);
      for (const p of soil) {
        const pos = target(3, p, 0.7, t);
        const rgb = colour(3, p, 0.7, t);
        for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        expect(pos[1]).toBeGreaterThan(GROUND_3D - 0.5);
        expect(pos[1]).toBeLessThan(GROUND_3D + 5);
      }
    });
    setVariant(0);
  });

  it('turns the 3D tree all gold on its switch, and back to green off it', () => {
    const t = at(3, 0.7);
    const leaves = particles.filter((p) => p.c > 0.8);
    setGold(true);
    for (const p of leaves) {
      const [r, g, b] = colour(3, p, 0.7, t);
      expect(r).toBeGreaterThanOrEqual(g);
      expect(g).toBeGreaterThanOrEqual(b);
    }
    setGold(false);
    expect(leaves.filter((p) => colour(3, p, 0.7, t)[1] > colour(3, p, 0.7, t)[0]).length).toBe(
      leaves.length,
    );
  });

  it('beats the veins: a wave leaves the centre on each beat and runs out, all brightening', () => {
    const k = 4;
    // A beat: half a beat in, and every beat after.
    const beatStart = at(k, 0.5) - ((at(k, 0.5) + BEAT / 2) % BEAT) + 0.06 * BEAT;
    const reach = (t: number) => {
      // The pulse grains' mean distance from the centre.
      const d = particles
        .filter((p) => p.i % 7 === 0)
        .map((p) => target(k, p, 0.6, t))
        .map(([x, y]) => Math.hypot(x, y));
      return d.reduce((a, b) => a + b, 0) / d.length;
    };
    expect(beatAt(beatStart)).toBeGreaterThan(0.75);
    expect(beatAt(beatStart + BEAT * 0.9)).toBeLessThan(0.05);
    // The whole drum is brighter just after a beat than just before the next.
    const glow = (t: number) =>
      particles.reduce((a, p) => a + Math.max(...colour(k, p, 0.6, t)), 0);
    expect(glow(beatStart + 0.02)).toBeGreaterThan(glow(beatStart + BEAT * 0.95) * 1.2);
    expect(reach(beatStart + BEAT * 0.9)).toBeGreaterThan(reach(beatStart + 0.02));
  });

  it('draws five drums, each inside its hoop, centred, and exactly symmetric', () => {
    const t = at(4, 0.6);
    const all = makeParticles(2400);
    expect(DRUMS).toHaveLength(5);
    DRUMS.forEach((d, i) => {
      setVariant(i, 4);
      const n = d.fold * 2;
      let sx = 0;
      let sy = 0;
      for (let run = 0; run < 60; run++) {
        const r = all.slice(run * n, run * n + n).map((p) => {
          const [x, y] = target(4, p, 0.6, t);
          sx += x;
          sy += y;
          expect(Math.hypot(x, y)).toBeLessThan(24 * 1.1);
          return Math.hypot(x, y);
        });
        for (const v of r) expect(v).toBeCloseTo(r[0] as number, 6);
      }
      // Centred: every copy balances the others round the knot.
      expect(Math.abs(sx / (60 * n))).toBeLessThan(1e-6);
      expect(Math.abs(sy / (60 * n))).toBeLessThan(1e-6);
    });
    setVariant(0);
  });

  it('keeps the water dark near the top of the roots and shows it deeper down', () => {
    const t = at(1, 0.7);
    const water = particles.filter((p) => p.c < 0.16);
    for (const p of water) {
      const y = target(1, p, 0.7, t)[1];
      if (y > ROOT_BASE[1] - 3) expect(Math.max(...colour(1, p, 0.7, t))).toBeLessThan(1e-6);
    }
    expect(water.some((p) => Math.max(...colour(1, p, 0.7, t)) > 0.4)).toBe(true);
  });

  it('plays each piece on its own: whole from the start, no ball of stars, looping with no seam', () => {
    const isRoad = (k: number) => PHASES[k]?.id === 'avenue' || PHASES[k]?.id === 'forest';
    for (let k = 0; k < PHASES.length; k++) {
      const len = pieceLength(k);
      expect(len).toBeGreaterThan(8);
      // Nothing starts in the ball of stars: every grain is in the piece's form.
      for (const p of particles.slice(0, 100)) {
        expect(dist(pieceAt(p, k, 0).pos, starBall(k, p, 0))).toBeGreaterThan(1e-3);
      }
      for (const s of [0, 0.3 * len, 0.9 * len]) {
        for (const p of particles.slice(0, 200)) {
          const { pos, rgb } = pieceAt(p, k, s);
          for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        }
      }
      // Seen from the eye, the end of a loop is where the next begins.
      const before = len * 3 - 1e-4;
      const after = len * 3 + 1e-4;
      const e0 = pieceCamera(k, before).eye;
      const e1 = pieceCamera(k, after).eye;
      if (!isRoad(k)) expect(dist(e0, e1)).toBeLessThan(0.05);
      // On the roads a grain passing behind the eye goes round to the far end at any moment, the wrap too.
      const kept = particles.slice(0, 400).filter((p) => {
        const a = pieceAt(p, k, before).pos;
        const b = pieceAt(p, k, after).pos;
        const ra = a.map((v, i) => v - (e0[i] as number));
        const rb = b.map((v, i) => v - (e1[i] as number));
        return dist(ra, rb) < 0.05;
      });
      // (In the avenue the first pair of trees stands at the very start of the loop.)
      expect(kept.length).toBeGreaterThanOrEqual(isRoad(k) ? 360 : 400);
    }
  });
});
