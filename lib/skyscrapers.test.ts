import { describe, expect, it } from 'vitest';

import { makeParticles } from './bigbang';
import { PHASES, pieceAt, pieceCamera, setVariant, variantLabel, variantNames } from './city';
import { GROUND_Y, Mesh } from './grain-mesh';
import {
  buildSky,
  Carved,
  inVoid,
  SKY_DESIGNS,
  SKYSCRAPERS,
  STUDIO_SKY,
  skyscraperEye,
  type Void,
} from './skyscrapers';

const k = PHASES.findIndex((p) => p.id === 'skyscrapers');

/** Every point a mesh draws: line ends and pieces, face corners, lamps. */
function points(m: Mesh): number[][] {
  const out: number[][] = [];
  const take = (a: number[], step: number, n: number) => {
    for (let i = 0; i < a.length; i += step)
      for (let j = 0; j < n; j++) out.push(a.slice(i + j * 3, i + j * 3 + 3));
  };
  take(m.lines, 6, 2);
  take(m.tris, 9, 3);
  take(m.dots, 4, 1);
  // The middles of lines too, so a line crossing a void is caught.
  for (let i = 0; i < m.lines.length; i += 6)
    out.push(
      [0, 1, 2].map((c) => ((m.lines[i + c] as number) + (m.lines[i + 3 + c] as number)) / 2),
    );
  return out;
}

describe('the Skyscraper series (2026-11-14: "Add a skyscraper series to the designs")', () => {
  it('is registered as a Studio piece beside the Buildings, eight or more named pills', () => {
    expect(k).toBeGreaterThan(-1);
    expect(PHASES[k - 1]?.id).toBe('buildings');
    expect(SKY_DESIGNS.length).toBeGreaterThanOrEqual(8);
    expect(SKY_DESIGNS.length).toBeLessThanOrEqual(12);
    expect(new Set(SKY_DESIGNS.map((d) => d.name)).size).toBe(SKY_DESIGNS.length);
    expect(variantNames(k)).toEqual(SKY_DESIGNS.map((d) => d.name));
    expect(variantLabel(k)).toBe('Skyscraper');
    expect(SKYSCRAPERS.names).toEqual(variantNames(k));
    for (const d of SKY_DESIGNS) expect(d.idea.length).toBeGreaterThan(30);
  });

  it('builds every design inside its footprint at each height, out of its voids, at any size', () => {
    for (const [h, r] of [
      [STUDIO_SKY.h, STUDIO_SKY.r],
      [160, 8.5],
    ] as const) {
      SKY_DESIGNS.forEach((D, i) => {
        const voids: Void[] = D.voids(h, r);
        const m = new Carved(voids);
        buildSky(m, i, h, r, voids);
        const pts = points(m);
        expect(pts.length, D.name).toBeGreaterThan(300);
        const bad: string[] = [];
        for (const p of pts) {
          const [x, y, z] = p as [number, number, number];
          const v = (y - GROUND_Y) / h;
          // Inside its square at that height (a hair for the line pieces' ends on the walls).
          const e = r * D.reach(Math.min(1, Math.max(0, v))) + 0.35;
          const ok =
            Number.isFinite(x + y + z) &&
            v >= -1e-6 &&
            v <= 1 + 1e-6 &&
            Math.abs(x) <= e &&
            Math.abs(z) <= e &&
            !inVoid(voids, x, y - GROUND_Y, z, 0.05);
          if (!ok && bad.length < 3) bad.push(`${D.name} ${h}: ${p.map((q) => q.toFixed(2))}`);
        }
        expect(bad).toEqual([]);
      });
    }
  });

  it('cuts any design through where the game asks: a slot for a highway, nothing left in it', () => {
    const slot: Void[] = [{ y0: 78, y1: 96, hw: 6, open: 'all' }];
    const m = new Carved(slot);
    buildSky(m, 3, 166, 8.5, slot);
    const pts = points(m);
    expect(pts.some((p) => (p[1] as number) - GROUND_Y > 100)).toBe(true);
    expect(
      pts.filter((p) =>
        inVoid(slot, p[0] as number, (p[1] as number) - GROUND_Y, p[2] as number, 0.05),
      ),
    ).toEqual([]);
    // Uncut, the same design has nothing in the way of a plain mesh.
    const plain = new Mesh();
    buildSky(plain, 0, 64, 7, []);
    expect(plain.lines.length).toBeGreaterThan(100);
  });

  it('shows every pill whole, every grain finite, the eye orbiting slowly', () => {
    const grains = makeParticles(1500);
    for (let i = 0; i < SKY_DESIGNS.length; i++) {
      setVariant(i, k);
      const cam = pieceCamera(k, 10);
      for (const p of grains.slice(0, 400)) {
        const g = pieceAt(p, k, 10);
        expect(g.pos.every(Number.isFinite) && g.rgb.every(Number.isFinite)).toBe(true);
        expect(Math.max(...g.rgb)).toBeLessThanOrEqual(1);
      }
      expect(cam.eye.every(Number.isFinite)).toBe(true);
    }
    setVariant(0, k);
    const a = skyscraperEye(10);
    const b = skyscraperEye(10 + 1 / 60);
    expect(Math.hypot(a.eye[0] - b.eye[0], a.eye[2] - b.eye[2])).toBeLessThan(0.1);
    // The whole tower in view: the eye stands back further than the tower is tall.
    expect(Math.hypot(a.eye[0], a.eye[2])).toBeGreaterThan(STUDIO_SKY.h);
  });
});
