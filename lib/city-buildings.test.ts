import { describe, expect, it } from 'vitest';

import { makeParticles } from './bigbang';
import { PHASES, pieceAt, pieceCamera, setVariant, variantLabel, variantNames } from './city';
import {
  BUILDING_KINDS,
  BUILDINGS,
  type BuildingKind,
  building,
  buildingsEye,
  siteReach,
} from './city-buildings';
import { GROUND_Y, Mesh } from './grain-mesh';

const k = PHASES.findIndex((p) => p.id === 'buildings');
const grains = makeParticles(3000);
const finite = (v: ArrayLike<number>) => Array.from(v).every(Number.isFinite);

describe('Buildings (2026-11-12: "do 20 cool buildings, each unique")', () => {
  it('is a Studio piece with twenty named pills, each from its own district', () => {
    expect(k).toBeGreaterThan(-1);
    expect(BUILDING_KINDS).toHaveLength(20);
    expect(variantNames(k)).toEqual(BUILDING_KINDS.map((b) => b.name));
    expect(variantLabel(k)).toBe('Building');
    expect(new Set(BUILDINGS.names).size).toBe(20);
    expect(BUILDING_KINDS.map((b) => b.district)).toContain('Chinatown');
    expect(BUILDING_KINDS.map((b) => b.district)).toContain('Atlantis Quarter');
    expect(new Set(BUILDING_KINDS.map((b) => b.district)).size).toBeGreaterThanOrEqual(15);
  });

  it('builds every building finite, on the ground, inside its site, the same every time', () => {
    for (let i = 0; i < 20; i++) {
      const b = building(i).build();
      expect(finite(b.lines) && finite(b.tris) && finite(b.dots)).toBe(true);
      expect(b.lines.length).toBeGreaterThan(0);
      expect(b.tris.length).toBeGreaterThan(0);
      expect(b.dots.length).toBeGreaterThan(0);
      // Kept small enough that a grain's pick stays cheap.
      expect(b.lines.length / 6 + b.tris.length / 9 + b.dots.length / 4).toBeLessThan(20000);
      const reach = siteReach((BUILDING_KINDS[i] as BuildingKind).site) + 6;
      for (const arr of [b.lines, b.tris]) {
        for (let j = 0; j < arr.length; j += 3) {
          expect(arr[j + 1] as number).toBeGreaterThan(GROUND_Y - 0.01);
          expect(Math.hypot(arr[j] as number, arr[j + 2] as number)).toBeLessThan(reach);
        }
      }
      const again = building(i).build();
      expect(Array.from(again.lines)).toEqual(Array.from(b.lines));
      expect(Array.from(again.dots)).toEqual(Array.from(b.dots));
    }
  });

  it('can be placed anywhere: moved, turned and scaled', () => {
    const home = building('Pagoda').build();
    const m = building('Pagoda', new Mesh(), {
      at: [40, GROUND_Y, -20],
      rot: Math.PI / 2,
      scale: 0.5,
    });
    const there = m.build();
    expect(there.lines.length).toBe(home.lines.length);
    // A quarter turn: (x, y, z) at home lands at (40 − z/2, y/2, −20 + x/2).
    for (let j = 0; j < 30; j += 3) {
      const [x, y, z] = [home.lines[j], home.lines[j + 1], home.lines[j + 2]] as number[];
      expect(there.lines[j] as number).toBeCloseTo(40 - (z as number) * 0.5, 4);
      expect(there.lines[j + 1] as number).toBeCloseTo(
        GROUND_Y + ((y as number) - GROUND_Y) * 0.5,
        4,
      );
      expect(there.lines[j + 2] as number).toBeCloseTo(-20 + (x as number) * 0.5, 4);
    }
  });

  it('draws each one solid, lit, distinct, its grains finite and above the ground', () => {
    const maps: Set<string>[] = [];
    for (let i = 0; i < 20; i++) {
      setVariant(i, k);
      let ok = true;
      let below = 0;
      let lit = 0;
      const cells = new Set<string>();
      for (const p of grains) {
        const s = pieceAt(p, k, 7.5);
        ok &&= finite(s.pos) && finite(s.rgb);
        below = Math.min(below, s.pos[1] - GROUND_Y);
        if (Math.max(...s.rgb) > 0.02) lit++;
        cells.add(s.pos.map((v) => Math.floor(v / 1.5)).join());
      }
      expect(ok).toBe(true);
      expect(below).toBeGreaterThan(-0.01);
      expect(lit).toBeGreaterThan(grains.length * 0.7);
      maps.push(cells);
      // The eye sees it whole: outside the site, above the ground, looking at it.
      const cam = pieceCamera(k, 7.5);
      const reach = siteReach((BUILDING_KINDS[i] as BuildingKind).site);
      expect(Math.hypot(cam.eye[0], cam.eye[2])).toBeGreaterThan(reach);
      expect(cam.eye[1]).toBeGreaterThan(GROUND_Y + 5);
    }
    for (let i = 0; i < 20; i++)
      for (let j = i + 1; j < 20; j++) {
        const a = maps[i] as Set<string>;
        const b = maps[j] as Set<string>;
        const both = [...a].filter((c) => b.has(c)).length;
        expect(both / (a.size + b.size - both)).toBeLessThan(0.6);
      }
    setVariant(0);
  });

  it('orbits slowly, the same moment always giving the same picture', () => {
    const a = buildingsEye(3, 10);
    const b = buildingsEye(3, 10 + 1 / 60);
    expect(Math.hypot(a.eye[0] - b.eye[0], a.eye[2] - b.eye[2])).toBeLessThan(0.1);
    setVariant(5, k);
    const p = grains[100] as (typeof grains)[number];
    expect(pieceAt(p, k, 4)).toEqual(pieceAt(p, k, 4));
    setVariant(0);
  });
});
