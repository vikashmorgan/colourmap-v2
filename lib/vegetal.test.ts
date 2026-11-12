import { describe, expect, it } from 'vitest';

import { flow, GOLDEN_ANGLE, type Particle } from './bigbang';
import { along, routeLength } from './star-tree';
import {
  along3,
  BEAT,
  BLOOMS,
  beatAt,
  bendAt,
  birdKinds,
  CELL_COUNT,
  CORRIDOR_CELLS,
  CORRIDOR_GAP,
  CORRIDOR_LEN,
  camera,
  cellOf,
  colour,
  corridorAhead,
  DRUMS,
  EYE_H,
  FIREWORK_FLOWERS,
  FLOCKS,
  FLORETS,
  FLOWERS,
  FOREST_SLOTS,
  FREEDOM,
  firework,
  fireworkShown,
  flier,
  flockCentre,
  floret,
  forestSlot,
  forestTrees,
  fruitOf,
  GROUND_3D,
  GROUND_FRUIT,
  GROUNDS,
  hill,
  LANDS,
  makeParticles,
  mandala,
  PHASE_START,
  PHASES,
  PLAYERS,
  PONDS,
  PULSES,
  particleAt,
  phaseAt,
  pieceAt,
  pieceCamera,
  pieceLength,
  pieceProgress,
  pulseKind,
  QUOTE_EVERY,
  REFL_TREES,
  ROAD_W,
  ROOT_BASE,
  reflTreeRoutes,
  riverHalf,
  riverX,
  rootSystem,
  rowOpen,
  SEA_Y,
  STEP_COLOURS,
  setBird,
  setGold,
  setLand,
  setSwitch,
  setVariant,
  setWaterMood,
  spreadReach,
  starBall,
  switchLabel,
  TOTAL,
  target,
  tree3d,
  treeSlot,
  variantLabel,
  variantNames,
  WATER_MOODS,
  WORLD_TREE,
  WORLD_TREE_H,
  waterTrip,
  wetAt,
  worldTreeRoutes,
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
const piece = (id: string) => PHASES.findIndex((p) => p.id === id);
const ROOTS = piece('roots');
const TREE3 = piece('tree-3d');
const VEINS = piece('veins');
const AVENUE = piece('avenue');
const FOREST = piece('forest');

describe('the vegetal chapter', () => {
  it('has sixteen numbered pieces, from a cell to Bird Sim, each with words', () => {
    expect(PHASES.map((p) => p.id)).toEqual([
      'cell',
      'roots',
      'roots-tree',
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
      'bird',
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
      const [x, y] = target(VEINS, p, 0.6, at(VEINS, 0.6));
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
      expect(target(ROOTS, p, 0.6, at(ROOTS, 0.6))[1]).toBeLessThanOrEqual(ROOT_BASE[1] + 2);
    }
  });

  describe('Cell corridor (2026-11-12)', () => {
    const k = piece('cell');
    const all = makeParticles(9000);

    it('offers the block or a corridor: two walls of cells and an empty middle, the eye in it', () => {
      expect(variantNames(k)).toEqual(['Block', 'Corridor']);
      expect(variantLabel(k)).toBe('View');
      setVariant(1, k);
      for (const s of [2, 17]) {
        let left = 0;
        let right = 0;
        for (const p of all) {
          const { pos, rgb } = pieceAt(p, k, s);
          for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
          // Nothing in the gap down the middle.
          expect(Math.abs(pos[0])).toBeGreaterThan(CORRIDOR_GAP - 1e-6);
          if (pos[0] < 0) left++;
          else right++;
        }
        expect(left).toBeGreaterThan(all.length * 0.4);
        expect(right).toBeGreaterThan(all.length * 0.4);
      }
      // The eye is in the gap, looking down it.
      const { eye, target: aim } = pieceCamera(k, 4);
      expect(Math.abs(eye[0])).toBeLessThan(1);
      expect(aim[2]).toBeLessThan(eye[2] - 10);
      setVariant(0);
    });

    it('flies on forever: the cells come toward the eye, pass behind it and come round to the far end', () => {
      setVariant(1, k);
      expect(CORRIDOR_CELLS).toBe(48);
      // Every grain at every moment lies between just behind the eye and the far end: the
      // same grains, recycled, never left behind.
      for (const s of [0, 7, 33, 120, 1000]) {
        for (const p of all.slice(0, 3000)) {
          const z = pieceAt(p, k, s).pos[2];
          expect(z).toBeLessThan(8 + 4);
          expect(z).toBeGreaterThan(-CORRIDOR_LEN - 4);
        }
      }
      // A second later nearly every grain has come closer (the rest came round to the far end).
      const walls = all.filter((p) => p.c < 0.68).slice(0, 1000);
      const closer = walls.filter((p) => pieceAt(p, k, 6).pos[2] > pieceAt(p, k, 5).pos[2]);
      expect(closer.length).toBeGreaterThan(walls.length * 0.85);
      // The first column, just ahead at the start, has gone behind and come round far ahead.
      expect(corridorAhead(0, 0)).toBeCloseTo(0, 9);
      expect(corridorAhead(0, 3)).toBeGreaterThan(CORRIDOR_LEN * 0.6);
      // Coming round, the far cells fade in out of the dark.
      const far = walls.filter((p) => pieceAt(p, k, 5).pos[2] < -CORRIDOR_LEN + 14);
      const near = walls.filter((p) => Math.abs(pieceAt(p, k, 5).pos[2] + 15) < 6);
      const glow = (ps: typeof walls) =>
        ps.reduce((a, p) => a + Math.max(...pieceAt(p, k, 5).rgb), 0) / ps.length;
      expect(glow(far)).toBeLessThan(glow(near) * 0.5);
      setVariant(0);
    });

    it('keeps the block in the Journey', () => {
      setVariant(1, k);
      setVariant(0);
      for (const p of all.slice(0, 500))
        expect(Math.abs(target(k, p, 0.6, at(k, 0.6))[2])).toBeLessThan(20);
    });
  });

  describe('Roots and tree (2026-11-12)', () => {
    const k = piece('roots-tree');
    const all = makeParticles(3000);

    it('comes right after Roots: the crown above a ground line, the roots below, from one point', () => {
      expect(k).toBe(ROOTS + 1);
      expect(PHASES[k]?.name).toBe('Roots and tree');
      const t = at(k, 0.7);
      let below = 0;
      let above = 0;
      for (const p of all) {
        const pos = target(k, p, 0.7, t);
        const rgb = colour(k, p, 0.7, t);
        for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        // The roots (and their hairs) stay under the ground, the wood and leaves over it.
        if (p.c >= 0.14 && p.c < 0.44) expect(pos[1]).toBeLessThan(0.5);
        if (p.c >= 0.5) expect(pos[1]).toBeGreaterThan(-0.5);
        if (pos[1] < -2) below++;
        if (pos[1] > 2) above++;
      }
      expect(below).toBeGreaterThan(all.length * 0.25);
      expect(above).toBeGreaterThan(all.length * 0.25);
      // Green leaves above, earth-coloured roots below.
      const leaves = all.filter((p) => p.c >= 0.82).map((p) => colour(k, p, 0.7, t));
      expect(leaves.every(([r, g]) => g > r)).toBe(true);
      const roots = all.filter((p) => p.c >= 0.14 && p.c < 0.44).map((p) => colour(k, p, 0.7, t));
      expect(roots.every(([r, g, b]) => r >= g && g >= b)).toBe(true);
    });

    it('sends water up a root to the base and on up the trunk, so both halves live as one', () => {
      const water = all.filter((p) => p.c < 0.1);
      for (const s of [3, 9]) {
        for (const p of water) {
          const y = pieceAt(p, k, s).pos[1];
          if (waterTrip(p, s) < 0.45) expect(y).toBeLessThan(0.3);
          if (waterTrip(p, s) > 0.55) expect(y).toBeGreaterThan(-0.3);
        }
      }
      // A grain on its way climbs: higher a moment later.
      const p = water.find((q) => waterTrip(q, 3) > 0.1 && waterTrip(q, 3) < 0.3) as Particle;
      expect(pieceAt(p, k, 4).pos[1]).toBeGreaterThan(pieceAt(p, k, 3).pos[1]);
      // The eye walks round the tree.
      expect(dist(pieceCamera(k, 2).eye, pieceCamera(k, 12).eye)).toBeGreaterThan(5);
    });
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
      const left = treeSlot(AVENUE, j);
      const right = treeSlot(AVENUE, j + 1);
      expect(right.x).toBeCloseTo(-left.x, 9);
      expect(right.z0).toBe(left.z0);
      expect(right.mirror).toBe(!left.mirror);
    }
    // In the forest, no tree stands opposite a twin.
    const wild = Array.from({ length: FOREST_SLOTS }, (_, j) => treeSlot(FOREST, j));
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
    for (const k of [AVENUE, FOREST]) {
      const a = camera(at(k, 0.2));
      const b = camera(at(k, 0.6));
      expect(a.eye[1]).toBeCloseTo(EYE_H, 6);
      // Over the road, or over the river wherever it has bent (the eye stands 14 into the loop).
      expect(Math.abs(a.eye[0] - bendAt(k, -a.eye[2] + 14))).toBeLessThan(ROAD_W);
      if (k === FOREST) {
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
    const t = at(VEINS, 0.6);
    const all = makeParticles(1600);
    // Grains 0..15 are one run, one per copy: all the same distance from the centre.
    for (let run = 0; run < 100; run++) {
      const r = all
        .slice(run * 16, run * 16 + 16)
        .map((p) => Math.hypot(...(target(VEINS, p, 0.6, t).slice(0, 2) as [number, number])));
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

  it('slows the veins and turns four kinds of pulse in turn, each silent where beats meet', () => {
    expect(BEAT).toBeGreaterThanOrEqual(2);
    expect(PULSES).toEqual(['Wave', 'Trace', 'Heartbeat', 'Return']);
    const start = (kind: number) => {
      let s = BEAT / 2;
      while (pulseKind(s + 0.01) !== kind) s += BEAT;
      return s;
    };
    for (let kind = 0; kind < 4; kind++) {
      const s = start(kind);
      // The next beat is the next kind.
      expect(pulseKind(s + BEAT + 0.01)).toBe((kind + 1) % 4);
      expect(beatAt(s + 0.001)).toBeLessThan(0.1);
      expect(beatAt(s + BEAT - 0.001)).toBeLessThan(0.1);
    }
    const k = VEINS;
    const pulses = particles.filter((p) => p.i % 7 === 0);
    const reach = (t: number) =>
      pulses.map((p) => target(k, p, 0.6, t)).reduce((a, [x, y]) => a + Math.hypot(x, y), 0) /
      pulses.length;
    // Return: the light comes home, from the tips to the centre.
    const back = start(3);
    expect(reach(back + BEAT * 0.15)).toBeGreaterThan(reach(back + BEAT * 0.8));
    // Heartbeat: two strikes in one beat.
    const lub = start(2);
    expect(beatAt(lub + BEAT * 0.32)).toBeGreaterThan(beatAt(lub + BEAT * 0.26));
    // Trace: ahead of the light the veins are dark, behind it lit; by the end all lit again.
    const tr = start(1);
    const lit = (t: number) =>
      particles.filter((p) => Math.max(...colour(k, p, 0.6, t)) > 0.25).length;
    expect(lit(tr + BEAT * 0.25)).toBeLessThan(lit(tr + BEAT * 0.9) * 0.8);
  });

  it('gives each of three pieces its own switch, and the Journey none', () => {
    const id = (x: string) => PHASES.findIndex((p) => p.id === x);
    expect(switchLabel(id('tree-3d'))).toBe('Gold');
    expect(switchLabel(id('full-tree'))).toBe('No road');
    expect(switchLabel(id('reflection'))).toBe('Green');
    expect(switchLabel(id('veins'))).toBe('');
    // No road: the horizon line goes, its grains onto the roots.
    const k = id('full-tree');
    const t = at(k, 0.7);
    const flatLine = () =>
      particles.filter((p) => {
        const [x, y] = target(k, p, 0.7, t);
        return Math.abs(y) < 0.1 && Math.abs(x) > 20;
      }).length;
    const withRoad = flatLine();
    setSwitch(true, k);
    expect(withRoad).toBeGreaterThan(20);
    expect(flatLine()).toBe(0);
    setSwitch(false);
    expect(flatLine()).toBe(withRoad);
  });

  it('keeps the reflection all gold, every tree and water, or gold with green leaves', () => {
    const k = PHASES.findIndex((p) => p.id === 'reflection');
    const t = at(k, 0.7);
    const all = makeParticles(1200);
    REFL_TREES.forEach((_, i) => {
      setVariant(i, k);
      for (const p of all) {
        const [r, g, b] = colour(k, p, 0.7, t);
        // Gold, never silver or blue: red at least green, green above blue.
        expect(r).toBeGreaterThanOrEqual(g - 1e-9);
        expect(g).toBeGreaterThan(b - 1e-9);
        if (r > 0.05) expect(b).toBeLessThan(r * 0.95);
      }
    });
    setVariant(0, k);
    setSwitch(true, k);
    const green = all.filter((p) => {
      const [r, g] = colour(k, p, 0.7, t);
      return g > r;
    }).length;
    expect(green).toBeGreaterThan(all.length * 0.1);
    setSwitch(false);
    setVariant(0);
  });

  it('opens five different flowers, each softly, never a bright point at the start', () => {
    const k = PHASES.findIndex((p) => p.id === 'bloom');
    expect(BLOOMS).toEqual(['Rose', 'Lotus', 'Lily', 'Daisy', 'Poppy', 'Fireworks']);
    const L = pieceLength(k);
    const widths = FLOWERS.map((_, i) => {
      setVariant(i, k);
      let w = 0;
      for (const p of particles) {
        const { pos, rgb } = pieceAt(p, k, 0.6 * L);
        for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        expect(Math.max(...rgb)).toBeLessThan(0.9);
        if (p.c >= 0.24 && p.c < 0.86) w += Math.hypot(pos[0], pos[2]);
      }
      // At the very start, the bud and seedling are faint.
      const early = particles.reduce((a, p) => a + Math.max(...pieceAt(p, k, 0.02 * L).rgb), 0);
      const open = particles.reduce((a, p) => a + Math.max(...pieceAt(p, k, 0.6 * L).rgb), 0);
      expect(early).toBeLessThan(open * 0.5);
      return Math.round((w / particles.length) * 20);
    });
    // Five shapes: the petals' mean reach differs from one flower to the next.
    expect(new Set(widths).size).toBe(5);
    setVariant(0);
  });

  it('sets off fireworks of flowers: many at once, each bursting open, fading, and blooming again elsewhere', () => {
    const k = PHASES.findIndex((p) => p.id === 'bloom');
    setVariant(BLOOMS.indexOf('Fireworks'), k);
    const L = pieceLength(k);
    for (const s of [1, 7, 19]) {
      for (const p of particles) {
        const { pos, rgb } = pieceAt(p, k, s);
        for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
      }
    }
    // Spread wide across the dark, not one flower.
    const xs = particles.map((p) => pieceAt(p, k, 0.3 * L).pos[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(25);
    // Fading in and out, never popping.
    expect(fireworkShown(0)).toBe(0);
    expect(fireworkShown(1)).toBe(0);
    expect(fireworkShown(0.5)).toBeGreaterThan(0.9);
    // Each flower comes back somewhere new.
    // Each flower comes back somewhere new, one bloom later.
    expect(firework(3, 1).c).not.toEqual(firework(3, 10).c);
    expect(FIREWORK_FLOWERS).toBeGreaterThanOrEqual(10);
    setVariant(0);
  });

  it('flies a bird of your own through a golden forest: W climbs, S dives, A turns, never into the ground', () => {
    const k = PHASES.findIndex((p) => p.id === 'bird');
    expect(PHASES[k]?.name).toBe('Bird Sim');
    const fly = (keys: string[], secs: number) => {
      for (let i = 0; i < secs * 30; i++) setBird(true, keys, 1 / 30, 0);
    };
    setBird(true, [], 1 / 30, 0);
    const y0 = flier(0).c[1];
    fly(['w'], 2);
    expect(flier(0).c[1]).toBeGreaterThan(y0 + 3);
    const y1 = flier(0).c[1];
    fly(['s'], 2);
    expect(flier(0).c[1]).toBeLessThan(y1 - 3);
    const f0 = flier(0).f;
    fly(['a'], 1);
    const f1 = flier(0).f;
    expect(f0[0] * f1[0] + f0[2] * f1[2]).toBeLessThan(0.9);
    // Diving for long never goes under the hills.
    fly(['s'], 20);
    const c = flier(0).c;
    expect(c[1]).toBeGreaterThan(hill(c[0], c[2]) + 1);
    // The forest round the bird: every grain somewhere real, the trees all gold, none green. All
    // but the far world tree and the sparrows on their wider field lie on the forest's width round it.
    const me = flier(0).c;
    for (const p of particles) {
      const { pos, rgb } = pieceAt(p, k, 5);
      for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
      if (p.c >= 0.3 && p.c < 0.975) expect(rgb[1]).toBeLessThanOrEqual(rgb[0] + 1e-9);
      const world = p.c >= 0.29 && p.c < 0.39;
      const flock = p.c >= 0.18 && p.c < 0.215;
      if (!world && !flock) {
        expect(Math.abs(pos[0] - me[0])).toBeLessThan(60 + 30);
        expect(Math.abs(pos[2] - me[2])).toBeLessThan(60 + 30);
      }
    }
    // The eye rides behind the bird.
    const eye = pieceCamera(k, 5);
    expect(dist(eye.eye, me)).toBeLessThan(18);
    setBird(false, [], 0, 0);
  });

  it('walks the Dot Walker on the forest floor: W on, S back, Space jumps, its legs striding', () => {
    const k = PHASES.findIndex((p) => p.id === 'bird');
    expect(PLAYERS).toEqual(['Bird', 'Dot Walker']);
    setVariant(1, k);
    const step = (keys: string[], secs: number) => {
      for (let i = 0; i < secs * 30; i++) setBird(true, keys, 1 / 30, 0);
    };
    // Before any key it strolls on by itself: never standing still at the start.
    const a0 = flier(1).c;
    step([], 0.5);
    expect(dist(flier(3).c, a0)).toBeGreaterThan(3);
    step(['w'], 0.1);
    const ground = () => {
      const c = flier(0).c;
      return c[1] - hill(c[0], c[2]);
    };
    expect(ground()).toBeCloseTo(0, 5);
    const z0 = flier(0).c[2];
    step(['w'], 2);
    // On, the way it faces, its feet on the hills.
    const moved = Math.hypot(flier(0).c[0], flier(0).c[2] - z0);
    expect(moved).toBeGreaterThan(4);
    expect(ground()).toBeCloseTo(0, 5);
    // Space: up, and back down.
    setBird(true, [' '], 1 / 30, 0);
    step([], 0.2);
    expect(ground()).toBeGreaterThan(0.3);
    step([], 2);
    expect(ground()).toBeCloseTo(0, 5);
    // A figure about as tall as a person among the trees, every grain real, legs apart mid-stride.
    step(['w'], 0.3);
    const me = flier(0).c;
    const body = particles.filter((p) => p.c >= 0.975).map((p) => pieceAt(p, k, 5));
    for (const { pos, rgb } of body)
      for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
    const ys = body.map(({ pos }) => pos[1] - me[1]);
    expect(Math.max(...ys)).toBeGreaterThan(3);
    expect(Math.max(...ys)).toBeLessThan(4);
    // The eye stands behind, at the walker's own height.
    expect(pieceCamera(k, 5).eye[1] - me[1]).toBeLessThan(6);
    setBird(false, [], 0, 0);
    setVariant(0);
  });

  describe('Bird Sim world (2026-11-11)', () => {
    const k = PHASES.findIndex((p) => p.id === 'bird');
    const big = makeParticles(9000);
    const steer = (keys: string[], secs: number, t0 = 0) => {
      let t = t0;
      for (let i = 0; i < secs * 30; i++) {
        t += 1 / 30;
        setBird(true, keys, 1 / 30, t);
      }
      return t;
    };
    /** Each wing's reach out from the body, and its tip's height, sideways in the flat. */
    const wings = (t: number) => {
      const me = flier(t);
      const side = [-me.f[2], 0, me.f[0]];
      const l = Math.hypot(side[0] as number, side[2] as number);
      return [-1, 1].map((w) => {
        let span = 0;
        let tip = 0;
        for (const p of big) {
          if (p.c < 0.975 || p.a < 0.35 || (p.a < 0.675 ? -1 : 1) !== w) continue;
          const pos = pieceAt(p, k, t).pos;
          const d = pos.map((v, i) => v - (me.c[i] as number));
          const across =
            ((d[0] as number) * (side[0] as number) + (d[2] as number) * (side[2] as number)) / l;
          if (Math.abs(across) > Math.abs(span)) {
            span = across;
            tip = d[1] as number;
          }
        }
        return { span: Math.abs(span), tip };
      });
    };

    it('glides through a turn on open wings: no beat, the outer wing stretched, the inner lifted', () => {
      setVariant(0);
      let t = steer([], 2, 5);
      // Flying straight the wings beat: the tips rise and fall.
      const beat: number[] = [];
      for (let i = 0; i < 6; i++) {
        t = steer([], 0.1, t);
        beat.push((wings(t)[1] as { tip: number }).tip);
      }
      expect(Math.max(...beat) - Math.min(...beat)).toBeGreaterThan(0.8);
      expect(Math.abs(flier(t).steer)).toBeLessThan(0.05);
      // Held in a left turn it glides: the wings stay open and nearly still, only a slight flex.
      t = steer(['a'], 2, t);
      expect(flier(t).steer).toBeLessThan(-0.9);
      const held: { span: number; tip: number }[][] = [];
      for (let i = 0; i < 6; i++) {
        t = steer(['a'], 0.1, t);
        held.push(wings(t));
      }
      const tips = held.map((w) => (w[1] as { tip: number }).tip);
      expect(Math.max(...tips) - Math.min(...tips)).toBeLessThan(0.5);
      expect(Math.max(...tips) - Math.min(...tips)).toBeGreaterThan(0);
      const [left, right] = held[0] as { span: number; tip: number }[];
      // The outer (right) wing reaches further than the inner (left), both open wide.
      expect((right as { span: number }).span).toBeGreaterThan(
        (left as { span: number }).span + 0.2,
      );
      expect((left as { span: number }).span).toBeGreaterThan(1.8);
      // Banked into the turn, yet the inner wing is lifted: its tip no lower than the body.
      expect((left as { tip: number }).tip).toBeGreaterThan(0);
      // And the other way round to the right.
      t = steer(['d'], 3, t);
      const [l2, r2] = wings(t);
      expect((l2 as { span: number }).span).toBeGreaterThan((r2 as { span: number }).span + 0.2);
      // Straight again, it eases back to beating.
      t = steer([], 3, t);
      expect(Math.abs(flier(t).steer)).toBeLessThan(0.05);
      setBird(false, [], 0, 0);
    });

    it('sends flocks of sparrows across the forest, each one cloud that moves and changes shape', () => {
      expect(FLOCKS).toBeGreaterThanOrEqual(3);
      const sparrows = big.filter((p) => p.c >= 0.18 && p.c < 0.215);
      expect(sparrows.length).toBeGreaterThan(200);
      for (let f = 0; f < FLOCKS; f++) {
        const a = flockCentre(f, 10);
        const b = flockCentre(f, 12);
        for (const v of [...a, ...b]) expect(Number.isFinite(v)).toBe(true);
        // On the move, several units a second, in the air.
        expect(Math.hypot(b[0] - a[0], b[2] - a[2])).toBeGreaterThan(8);
        expect(a[1]).toBeGreaterThan(5);
      }
      // Each sparrow somewhere real, and the flock's shape is never the same twice.
      const spread = (t: number) => {
        const ps = sparrows.slice(0, 120).map((p) => pieceAt(p, k, t));
        for (const { pos, rgb } of ps)
          for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        const ys = ps.map((r) => r.pos[1]);
        return Math.max(...ys) - Math.min(...ys);
      };
      expect(Math.abs(spread(10) - spread(13))).toBeGreaterThan(0.1);
    });

    it('stands a world tree far ahead, far taller than the forest, drawn in from far so it shows', () => {
      const routes = worldTreeRoutes();
      let top = 0;
      for (const r of routes)
        for (let i = 0; i < r.count; i++) top = Math.max(top, r.pts[i * 4 + 1] as number);
      expect(top).toBeCloseTo(WORLD_TREE_H, 0);
      expect(WORLD_TREE_H).toBeGreaterThan(200);
      expect(Math.hypot(WORLD_TREE[0], WORLD_TREE[2])).toBeGreaterThan(300);
      // From the start its grains are all real and inside the far fade, and it towers: seen from
      // the eye its top stands high above the horizon.
      setBird(false, [], 0, 0);
      const eye = pieceCamera(k, 1).eye;
      const tree = big.filter((p) => p.c >= 0.29 && p.c < 0.39);
      let steepest = 0;
      for (const p of tree) {
        const { pos, rgb } = pieceAt(p, k, 1);
        for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        expect(dist(pos, eye)).toBeLessThan(250);
        const rise = (pos[1] - eye[1]) / Math.hypot(pos[0] - eye[0], pos[2] - eye[2]);
        steepest = Math.max(steepest, rise);
      }
      expect(Math.atan(steepest)).toBeGreaterThan(0.3);
    });

    it('lays a river and two sacred ponds in the land, the trees on dry ground, the water on them', () => {
      expect(PONDS).toHaveLength(2);
      // The river lies in a valley, and each pond's floor under its still water.
      for (const z of [0, 17, 40, 77, 100]) {
        const x = riverX(z);
        expect(wetAt(x, z)).toBe(true);
        expect(hill(x, z)).toBeLessThan(hill(x + riverHalf(z) + 8, z));
      }
      for (const p of PONDS) {
        expect(wetAt(p.c[0], p.c[1])).toBe(true);
        expect(hill(p.c[0], p.c[1])).toBeLessThan(p.level);
      }
      // No tree stands in the water; the trees by the ponds stand on their banks.
      for (let j = 0; j < 20; j++) {
        const at = forestSlot(j).at;
        expect(wetAt(at[0], at[2])).toBe(false);
      }
      // Every grain of water lies on the river or a pond.
      setWaterMood(0);
      const water = big.filter((p) => p.c >= 0.07 && p.c < 0.12).slice(0, 200);
      for (const p of water) {
        const { pos } = pieceAt(p, k, 3);
        expect(wetAt(pos[0], pos[2])).toBe(true);
      }
    });

    it('moves the water by its mood: calm, ripples, waves rolling, rain sparkling where it lands', () => {
      expect(WATER_MOODS).toEqual(['Calm', 'Ripples', 'Waves', 'Rain']);
      setLand(1, k);
      steer([], 0.2, 2);
      const water = big.filter((p) => p.c < 0.12);
      const look = (m: number) => {
        setWaterMood(m);
        const rs = water.map((p) => pieceAt(p, k, 9));
        for (const { pos, rgb } of rs)
          for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        const ys = rs.map((r) => r.pos[1]);
        return {
          lift: Math.max(...ys) - Math.min(...ys),
          brightest: Math.max(...rs.map((r) => r.rgb[0])),
        };
      };
      const calm = look(0);
      const ripples = look(1);
      const waves = look(2);
      const rain = look(3);
      expect(calm.lift).toBeLessThan(0.01);
      expect(ripples.lift).toBeGreaterThan(0.05);
      expect(waves.lift).toBeGreaterThan(ripples.lift * 3);
      // Rain: sparkles far brighter than still water.
      expect(rain.brightest).toBeGreaterThan(calm.brightest * 2);
      setWaterMood(0);
      setLand(0, k);
      setBird(false, [], 0, 0);
    });

    it('grows a Water forest out of open water, every tree over its reflection, spreading outward', () => {
      expect(LANDS).toEqual(['Golden forest', 'Water forest']);
      setLand(1, k);
      const t0 = steer([], 0.1, 20);
      // The trees stand in the water: eight kinds, two in blossom.
      expect(forestSlot(3).at[1]).toBe(SEA_Y);
      expect(birdKinds()).toHaveLength(8);
      expect(birdKinds().filter((b) => b.bloom)).toHaveLength(2);
      // Reflections lie under the water.
      const mirrors = big.filter((p) => p.c >= 0.9 && p.c < 0.975).slice(0, 300);
      const under = mirrors.filter((p) => pieceAt(p, k, t0).pos[1] < SEA_Y).length;
      expect(under).toBeGreaterThan(mirrors.length * 0.8);
      // It spreads: further out as time goes on.
      expect(spreadReach(t0 + 20)).toBeGreaterThan(spreadReach(t0) + 60);
      // The Journey goes back to the Golden forest.
      setLand(0);
      expect(forestSlot(3).at[1]).not.toBe(SEA_Y);
      setBird(false, [], 0, 0);
    });

    it('shows a line about freedom at a time, with its author, and turns to the next', () => {
      expect(FREEDOM.length).toBeGreaterThanOrEqual(10);
      for (const q of FREEDOM) {
        expect(q.line.split(/\s+/).filter((w) => w !== '/').length).toBeLessThanOrEqual(15);
        expect(q.by.length).toBeGreaterThan(3);
      }
      expect(pieceLength(k)).toBe(QUOTE_EVERY);
      pieceProgress(k, 1);
      expect(PHASES[k]?.words).toEqual([FREEDOM[0]?.line, `— ${FREEDOM[0]?.by}`]);
      expect(pieceProgress(k, QUOTE_EVERY * 2.5)).toBeCloseTo(0.5, 6);
      expect(PHASES[k]?.words[0]).toBe(FREEDOM[2]?.line);
      // The Journey starts from the first again.
      setVariant(0);
      expect(PHASES[k]?.words[0]).toBe(FREEDOM[0]?.line);
    });
  });

  it('lays each ground under the 3D tree on the floor', () => {
    const t = at(TREE3, 0.7);
    const soil = particles.filter((p) => p.c > 0.72 && p.c <= 0.8);
    GROUNDS.forEach((_, g) => {
      setVariant(g, TREE3);
      for (const p of soil) {
        const pos = target(TREE3, p, 0.7, t);
        const rgb = colour(TREE3, p, 0.7, t);
        for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        expect(pos[1]).toBeGreaterThan(GROUND_3D - 0.5);
        expect(pos[1]).toBeLessThan(GROUND_3D + 5);
      }
    });
    setVariant(0);
  });

  it('turns the 3D tree all gold on its switch, and back to green off it', () => {
    const t = at(TREE3, 0.7);
    const leaves = particles.filter((p) => p.c > 0.8);
    setGold(true);
    for (const p of leaves) {
      const [r, g, b] = colour(TREE3, p, 0.7, t);
      expect(r).toBeGreaterThanOrEqual(g);
      expect(g).toBeGreaterThanOrEqual(b);
    }
    setGold(false);
    expect(
      leaves.filter((p) => colour(TREE3, p, 0.7, t)[1] > colour(TREE3, p, 0.7, t)[0]).length,
    ).toBe(leaves.length);
  });

  it('beats the veins: a wave leaves the centre on each beat and runs out, all brightening', () => {
    const k = VEINS;
    // A beat: half a beat in, and every beat after.
    let beatStart = at(k, 0.5) - ((at(k, 0.5) + BEAT / 2) % BEAT) + 0.06 * BEAT;
    // A Wave beat: the other kinds are tested on their own.
    while (pulseKind(beatStart) !== 0) beatStart += BEAT;
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
    const t = at(VEINS, 0.6);
    const all = makeParticles(2400);
    expect(DRUMS).toHaveLength(5);
    DRUMS.forEach((d, i) => {
      setVariant(i, VEINS);
      const n = d.fold * 2;
      let sx = 0;
      let sy = 0;
      for (let run = 0; run < 60; run++) {
        const r = all.slice(run * n, run * n + n).map((p) => {
          const [x, y] = target(VEINS, p, 0.6, t);
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
    const t = at(ROOTS, 0.7);
    const water = particles.filter((p) => p.c < 0.16);
    for (const p of water) {
      const y = target(ROOTS, p, 0.7, t)[1];
      if (y > ROOT_BASE[1] - 3) expect(Math.max(...colour(ROOTS, p, 0.7, t))).toBeLessThan(1e-6);
    }
    expect(water.some((p) => Math.max(...colour(ROOTS, p, 0.7, t)) > 0.4)).toBe(true);
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
