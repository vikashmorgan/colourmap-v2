import { describe, expect, it } from 'vitest';
import type { Vec3 } from './bigbang';
import { BUILDING_KINDS } from './city-buildings';
import {
  DESIGN_FIT,
  DESIGN_QUARTERS,
  designFor,
  designHolds,
  designItem,
  studioItem,
} from './city-designs';
import { blocked, blockTower, DISTRICTS, gameItems } from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND, TILE_I, TILE_J } from './city-grid';

const tile = () => {
  const out: ReturnType<typeof blockTower>[] = [];
  for (let I = -TILE_I / 2; I < TILE_I / 2; I++)
    for (let J = 0; J < TILE_J; J++) out.push(blockTower(I, J));
  return out;
};

describe('the Studio’s twenty buildings in the game city', () => {
  it('stands them in the quarters they belong to: the pagoda in Chinatown, domes in Istanbul, stair temples', () => {
    const blocks = tile().filter((b) => b.shape === 'design');
    expect(blocks.length).toBeGreaterThan(40);
    for (const b of blocks) {
      const kind = b.design?.kind as number;
      expect(DESIGN_QUARTERS[b.d]?.kinds).toContain(kind);
      // Never on the avenue, always inside its block, the streets kept.
      expect(Math.abs(b.x) - (b.design?.r ?? 0)).toBeGreaterThan(9);
      expect(b.x - b.hx).toBeGreaterThan(b.I * BLOCK_X);
      expect(b.z + b.hz).toBeLessThan((b.J + 1) * BLOCK_Z);
    }
    const kinds = (d: string) =>
      new Set(blocks.filter((b) => b.d === d).map((b) => b.design?.kind));
    expect(kinds('chinatown').has(2)).toBe(true);
    expect(kinds('oriental').has(4)).toBe(true);
    expect([...kinds('temples')].some((k) => k === 0 || k === 17 || k === 14)).toBe(true);
    // Many of the twenty, not one or two.
    expect(new Set(blocks.map((b) => b.design?.kind)).size).toBeGreaterThanOrEqual(14);
  });

  it('fits each to its block and under the metro, or leaves the block a plain building', () => {
    for (let k = 0; k < 400; k++) {
      const g = designFor('market', k, 30);
      if (!g) continue;
      const spec = BUILDING_KINDS[g.kind] as (typeof BUILDING_KINDS)[number];
      expect(spec.site.r * g.sc).toBeLessThanOrEqual(DESIGN_FIT + 1e-9);
      expect(spec.height * g.sc).toBeLessThanOrEqual(28 + 1e-9);
    }
    expect(designFor('nowhere', 1, 100)).toBeNull();
  });

  it('holds you out of them, tapering for the stair temples, and lets you over them', () => {
    const b = tile().find((q) => q.shape === 'design' && q.design && !q.design.tapered);
    const t = tile().find((q) => q.shape === 'design' && q.design?.tapered);
    for (const tw of [b, t]) {
      if (!tw?.design) throw new Error('no design');
      expect(blocked([tw.x, GROUND + 3, tw.z])).toBe(true);
      expect(blocked([tw.x, GROUND + tw.design.h + 3, tw.z])).toBe(false);
    }
    const g = t?.design as NonNullable<NonNullable<typeof t>['design']>;
    // A stair temple's corner, high up, is open air.
    expect(designHolds(g, 0, 0, [g.r * 0.9, GROUND + g.h * 0.8, g.r * 0.9], 1.2)).toBe(false);
  });

  it('draws them and the Studio’s temples, factories and domes as lit meshes, finite', () => {
    const o = [0, 0, 0, 0, 0, 0];
    const tw = tile().find((q) => q.shape === 'design') as ReturnType<typeof blockTower>;
    const eye: Vec3 = [tw.x + 30, GROUND + 10, tw.z + 30];
    const items = [
      designItem(tw.design as NonNullable<typeof tw.design>, tw, DISTRICTS[tw.d].colour, eye, 4),
      studioItem('factories', 1, { x: 0, z: 0, key: 3 }, 0.72, 2000, eye, 4),
      studioItem('domes', 2, { x: 0, z: 0, key: 4 }, 0.72, 2000, eye, 4),
      studioItem('temples', 0, { x: 0, z: 0, key: 5 }, 0.72, 2000, eye, 4),
    ];
    for (const it of items) {
      let lit = 0;
      for (let s = 0; s < it.count; s += 11) {
        expect(it.site(s, o)).toBe(true);
        expect(o.every(Number.isFinite)).toBe(true);
        lit += (o[3] as number) + (o[4] as number) + (o[5] as number);
      }
      expect(lit).toBeGreaterThan(1);
    }
  });

  it('puts the factories, domes and temples in their quarters, drawn as you pass', () => {
    const studios = tile().filter((b) => b.shape === 'studio');
    for (const set of ['temples', 'factories', 'domes'] as const)
      expect(studios.filter((b) => b.studio?.set === set).length).toBeGreaterThan(5);
    const tw = studios.find((b) => b.studio?.set === 'factories') as ReturnType<typeof blockTower>;
    const items = gameItems([tw.x, GROUND + 12, tw.z + 40], [0, -0.2, -1], 3);
    expect(items.some((it) => it.weight === 1.4 && it.count === 2000)).toBe(true);
  });
});
