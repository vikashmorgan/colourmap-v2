import { describe, expect, it } from 'vitest';
import {
  ambientAt,
  camera,
  designOf,
  fade,
  GRAINS,
  LOOP,
  makeParticles,
  PHASES,
  particleAt,
  phaseAt,
  pieceAt,
  pieceCamera,
  setVariant,
  TOTAL,
  variantLabel,
  variantNames,
} from './riverdust';
import {
  CATEGORIES,
  DESIGN_BUDGET,
  DESIGNS,
  designGrains,
  designModel,
  designSite,
  fitBudget,
  grandstand,
  sunGate,
} from './riverdust-designs';
import { P, PRAYER, RD } from './riverdust-kit';

describe('the RIVERDUST series (2026-11-16: "create series of desert town elements ... call it RIVERDUST")', () => {
  it('has seven categories, the race gate last, each of five to eight named designs', () => {
    expect(CATEGORIES.map((c) => c.name)).toEqual([
      'Flags and lamps',
      'Tents and camps',
      'Market',
      'Buildings',
      'Cavern and rock',
      'Water and river',
      'Race gate',
    ]);
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length);
    for (const c of CATEGORIES) {
      expect(c.designs.length).toBeGreaterThanOrEqual(5);
      expect(c.designs.length).toBeLessThanOrEqual(8);
      expect(c.label.length).toBeGreaterThan(0);
      for (const d of c.designs) {
        expect(d.id.startsWith(`${c.id}/`)).toBe(true);
        expect(d.idea.length).toBeGreaterThan(40);
      }
    }
  });

  it('gives every design its own name and id', () => {
    expect(new Set(DESIGNS.map((d) => d.name)).size).toBe(DESIGNS.length);
    expect(new Set(DESIGNS.map((d) => d.id)).size).toBe(DESIGNS.length);
    expect(DESIGNS.map((d) => d.name)).toEqual(
      expect.arrayContaining([
        'Prayer Street',
        'Hall of Banners',
        'Lamp Tunnel',
        'Burgundy Souk',
        'Glowing Cavern',
        'Plank Bridge',
      ]),
    );
  });

  it('has the racetrack installations asked for: gates, grandstands, the start line, paddock and timing tower', () => {
    const race = CATEGORIES.find((c) => c.id === 'race');
    expect(race?.designs.map((d) => d.name)).toEqual(
      expect.arrayContaining([
        'Sun Gate',
        'Grandstand Straight',
        'Start Line',
        'Paddock',
        'Finish Arena',
      ]),
    );
  });

  it('keeps every design within its grain budget, the trip player’s grains with dust to spare', () => {
    expect(GRAINS.small).toBeGreaterThan(DESIGN_BUDGET + 500);
    for (const d of DESIGNS) {
      const M = designModel(d.id);
      expect(M.count, d.name).toBeLessThanOrEqual(DESIGN_BUDGET);
      expect(M.count, d.name).toBeGreaterThan(800);
    }
  });

  it('thins a design over budget, walls before lamps, every part kept', () => {
    const wall = P(6000, () => [0, 0, 0], RD.sand);
    const lamps = P(300, () => [0, 0, 0], RD.lamp, 0.15);
    const out = fitBudget([wall, lamps], 1000);
    expect(out).toHaveLength(2);
    expect(out.reduce((a, p) => a + p.n, 0)).toBeLessThanOrEqual(1000);
    expect(out[1]?.n).toBe(300);
    // Mostly lamps: all thinned alike.
    const bright = fitBudget(
      [P(4000, () => [0, 0, 0], RD.lamp, 0.1), P(4000, () => [0, 0, 0], RD.sand)],
      1000,
    );
    expect(bright[0]?.n).toBe(bright[1]?.n);
    expect(bright.reduce((a, p) => a + p.n, 0)).toBeLessThanOrEqual(1000);
  });

  it('draws in warm dusty light, lamps breathing softly, never flashing, every site a number', () => {
    const o = [0, 0, 0, 0, 0, 0];
    for (const d of DESIGNS) {
      const M = designModel(d.id);
      for (const p of M.parts) {
        expect(p.tw ?? 0).toBeLessThanOrEqual(0.2);
        for (const c of p.rgb) expect(c).toBeLessThanOrEqual(1);
        expect(p.rgb[0], d.name).toBeGreaterThanOrEqual(p.rgb[2] - 0.15);
      }
      for (let s = 0; s < M.count; s += 7) {
        expect(designSite(M, s, 13.7, { x: 0, z: 0 }, 1, o), `${d.name} ${s}`).toBe(true);
        for (let j = 3; j < 6; j++) expect(o[j] as number).toBeLessThan(0.5);
      }
    }
  });

  it('moves slowly: from one frame to the next almost nothing jumps', () => {
    const a = [0, 0, 0, 0, 0, 0];
    const b = [0, 0, 0, 0, 0, 0];
    for (const d of DESIGNS) {
      const M = designModel(d.id);
      let jumps = 0;
      let n = 0;
      for (let s = 0; s < M.count; s += 5, n++) {
        designSite(M, s, 20, { x: 0, z: 0 }, 1, a);
        designSite(M, s, 20 + 1 / 60, { x: 0, z: 0 }, 1, b);
        if (
          Math.hypot(
            (a[0] as number) - (b[0] as number),
            (a[1] as number) - (b[1] as number),
            (a[2] as number) - (b[2] as number),
          ) > 0.5
        )
          jumps++;
      }
      // Only a flame's grain going back to the bowl, or a boat round its loop far off.
      expect(jumps / n, d.name).toBeLessThan(0.02);
    }
  });

  it('builds scenes in depth, for perspective: each runs away from the eye', () => {
    for (const d of DESIGNS) {
      const { positions } = designGrains(d.id, { x: 0, z: 0 });
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 2; i < positions.length; i += 3) {
        const z = positions[i] as number;
        if (z < lo) lo = z;
        if (z > hi) hi = z;
      }
      expect(hi - lo, d.name).toBeGreaterThan(25);
      // The eye stands nearer than most of the scene, looking into it.
      expect(d.view.eye[2]).toBeGreaterThan(d.view.target[2]);
    }
  });

  it('draws a design anywhere, turned and scaled, for the racing worlds', () => {
    const id = 'race/sun-gate';
    const here = designGrains(id, { x: 0, z: 0 }, 5);
    const there = designGrains(id, { x: 100, y: 2, z: -50, scale: 2 }, 5);
    expect(there.positions.length).toBe(here.positions.length);
    for (let i = 0; i < here.positions.length; i += 300) {
      expect(there.positions[i]).toBeCloseTo(100 + 2 * (here.positions[i] as number), 3);
      expect(there.positions[i + 1]).toBeCloseTo(2 + 2 * (here.positions[i + 1] as number), 3);
      expect(there.positions[i + 2]).toBeCloseTo(-50 + 2 * (here.positions[i + 2] as number), 3);
    }
    const turned = designGrains(id, { x: 0, z: 0, rot: Math.PI / 2 }, 5);
    expect(turned.positions[0]).toBeCloseTo(here.positions[2] as number, 3);
    expect(turned.positions[2]).toBeCloseTo(-(here.positions[0] as number), 3);
    // The builders stand alone too.
    expect(sunGate(0).length).toBeGreaterThan(10);
    expect(grandstand(10, -20, 30, -1).length).toBeGreaterThan(5);
  });

  it('fades the prayer flags and keeps them dusty', () => {
    expect(PRAYER).toHaveLength(5);
    for (const c of PRAYER) for (const v of c) expect(v).toBeGreaterThan(0.3);
  });
});

describe('the RIVERDUST trip: a category a piece, a design a pill', () => {
  it('has one piece per category, its designs as the pills', () => {
    expect(PHASES.map((p) => p.id)).toEqual(CATEGORIES.map((c) => c.id));
    expect(TOTAL).toBe(PHASES.length * LOOP);
    for (const [k, c] of CATEGORIES.entries()) {
      expect(variantNames(k)).toEqual(c.designs.map((d) => d.name));
      expect(variantLabel(k)).toBe(c.label);
    }
  });

  it('switches design with the pills, back to the first with none', () => {
    setVariant(2, 0);
    expect(designOf(0).name).toBe(CATEGORIES[0]?.designs[2]?.name);
    setVariant(99, 0);
    expect(designOf(0).name).toBe(CATEGORIES[0]?.designs[0]?.name);
    setVariant(3, 6);
    setVariant(0);
    expect(designOf(6).name).toBe('Sun Gate');
  });

  it('fills the grains beyond the design with dust and stars, all finite', () => {
    const ps = makeParticles(GRAINS.small);
    for (let k = 0; k < PHASES.length; k++) {
      const count = designModel(designOf(k).id).count;
      for (let i = 0; i < ps.length; i += 37) {
        const g = pieceAt(ps[i] as (typeof ps)[0], k, 9);
        expect(g.pos.every(Number.isFinite)).toBe(true);
        expect(g.rgb.every(Number.isFinite)).toBe(true);
      }
      const extra = ps[count + 3] as (typeof ps)[0];
      expect(pieceAt(extra, k, 9)).toEqual(ambientAt(extra, 9));
    }
  });

  it('glides the eye forward and back over the loop, smooth where it loops', () => {
    for (let k = 0; k < PHASES.length; k++) {
      const v = designOf(k).view;
      const a = pieceCamera(k, 0);
      expect(a.eye[0]).toBeCloseTo(v.eye[0], 5);
      expect(a.eye[2]).toBeCloseTo(v.eye[2], 5);
      const mid = pieceCamera(k, LOOP / 2);
      const moved = Math.hypot(mid.eye[0] - a.eye[0], mid.eye[2] - a.eye[2]);
      expect(moved).toBeGreaterThan(1);
      const end = pieceCamera(k, LOOP - 0.01);
      expect(Math.hypot(end.eye[0] - a.eye[0], end.eye[2] - a.eye[2])).toBeLessThan(0.1);
    }
  });

  it('fades grains at the eye and far into the dusk', () => {
    expect(fade([0, 0, 0], [0, 0, 0])).toBe(0);
    expect(fade([0, 0, -30], [0, 0, 0])).toBe(1);
    expect(fade([0, 0, -400], [0, 0, 0])).toBe(0);
  });

  it('plays the categories one after another in the Journey', () => {
    expect(phaseAt(0).index).toBe(0);
    expect(phaseAt(LOOP * 2.5)).toEqual({ index: 2, u: 0.5 });
    expect(phaseAt(TOTAL + 1).index).toBe(0);
    const p = makeParticles(10)[4] as ReturnType<typeof makeParticles>[0];
    for (const t of [0, LOOP * 0.95, LOOP * 3.3]) {
      expect(particleAt(p, t).pos.every(Number.isFinite)).toBe(true);
      const c = camera(t);
      expect(c.eye.every(Number.isFinite)).toBe(true);
    }
  });
});
