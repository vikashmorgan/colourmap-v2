import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { studioItem } from './city-designs';
import { FACTORY_NAMES, FACTORY_SITES, factoryAt, factoryContextItem } from './city-factories';
import { blockTower, gameItems, LANDMARKS } from './city-game';
import { GROUND, type Item, mixId, TILE_I, TILE_J } from './city-grid';

type Block = ReturnType<typeof blockTower>;
const tile = () => {
  const out: Block[] = [];
  for (let I = -TILE_I / 2; I < TILE_I / 2; I++)
    for (let J = 0; J < TILE_J; J++) out.push(blockTower(I, J));
  return out;
};
const factories = () => tile().filter((b) => b.shape === 'studio' && b.studio?.set === 'factories');

/** Sampled sites of an item: finite, never negative; their colours. */
function colours(it: Item, step = 3): number[][] {
  const o = [0, 0, 0, 0, 0, 0];
  const out: number[][] = [];
  for (let s = 0; s < it.count; s += step) {
    if (!it.site(s, o)) continue;
    expect(o.every(Number.isFinite)).toBe(true);
    expect(Math.min(o[3] as number, o[4] as number, o[5] as number)).toBeGreaterThanOrEqual(0);
    out.push(o.slice(3));
  }
  return out;
}

describe('factories through the city (2026-11-13: "think how factories can be better integrated not all together")', () => {
  it('keeps the Industrial quarter’s landmark foundry, and only two works beside it there', () => {
    const L = LANDMARKS.find((l) => l.d === 'industrial');
    expect(L?.set).toBe('factories');
    expect(FACTORY_NAMES[L?.i as number]).toBe('Foundry');
    expect(factories().filter((b) => b.d === 'industrial')).toHaveLength(2);
  });

  it('stands the others singly where they make sense: canals, the Heights’ edge, the desert, the domes, the Matrix quarter', () => {
    const all = factories();
    expect(all).toHaveLength(FACTORY_SITES.length);
    const where = new Set(all.map((b) => b.d));
    for (const d of ['canals', 'heights', 'egypt', 'domes', 'code'])
      expect(where.has(d as Block['d'])).toBe(true);
    for (const b of all) {
      const site = factoryAt(b.I, b.J);
      expect(site).not.toBeNull();
      expect(b.studio?.i).toBe(site?.i);
      // Off the avenue.
      expect(b.I === 0 || b.I === -1).toBe(false);
      // The plan repeats: the same factory a tile on.
      expect(factoryAt(b.I + TILE_I, b.J + TILE_J)).toBe(site);
    }
    // The canal's works stand on a canal's edge.
    const canal = all.find((b) => b.d === 'canals') as Block;
    expect([18, 20, 22]).toContain(canal.J);
    // Every one of the Studio's seven kinds stands somewhere, the foundry's landmark counted.
    expect(new Set([...all.map((b) => b.studio?.i), 1]).size).toBeGreaterThanOrEqual(6);
  });

  it('never puts two on neighbouring blocks, across the tile’s edges too', () => {
    for (const a of FACTORY_SITES)
      for (const b of FACTORY_SITES) {
        if (a === b) continue;
        const di = Math.abs(
          ((((a.li - b.li) % TILE_I) + TILE_I + TILE_I / 2) % TILE_I) - TILE_I / 2,
        );
        const dj = Math.abs(
          ((((a.lj - b.lj) % TILE_J) + TILE_J + TILE_J / 2) % TILE_J) - TILE_J / 2,
        );
        expect(Math.max(di, dj)).toBeGreaterThan(1);
      }
  });

  it('gives each its context: a lit yard, a chimney with slow steam, a conveyor to its neighbour', () => {
    for (const site of FACTORY_SITES) {
      const tw = blockTower(site.li, site.lj);
      const eye: Vec3 = [tw.x + 40, GROUND + 15, tw.z + 40];
      const it = factoryContextItem(site, tw, null, eye, 12);
      expect(colours(it).length).toBeGreaterThan(100);
      // Mellow: a frame later no light has moved its colour by more than a few hundredths.
      const a = colours(it, 1);
      const b = colours(factoryContextItem(site, tw, null, eye, 12 + 1 / 60), 1);
      for (let k = 0; k < Math.min(a.length, b.length); k++)
        for (let c = 0; c < 3; c++)
          expect(Math.abs((a[k]?.[c] as number) - (b[k]?.[c] as number))).toBeLessThan(0.05);
    }
    // Drawn in the game as you pass, the conveyor running to its neighbour's wall.
    const site = FACTORY_SITES.find((s) => s.role === 'on the canal quay');
    const tw = blockTower(site?.li as number, site?.lj as number);
    const items = gameItems([tw.x, GROUND + 12, tw.z + 40], [0, -0.2, -1], 3);
    expect(items.some((it) => it.gid === mixId(tw.k, 6611))).toBe(true);
  });

  it('draws the data foundry in the Matrix quarter’s green only', () => {
    const site = FACTORY_SITES.find((s) => s.role === 'data foundry');
    expect(site?.tint).toBeDefined();
    const tw = blockTower(site?.li as number, site?.lj as number);
    expect(tw.d).toBe('code');
    const eye: Vec3 = [tw.x - 30, GROUND + 15, tw.z + 30];
    const items = [
      factoryContextItem(site as (typeof FACTORY_SITES)[number], tw, null, eye, 4),
      studioItem(
        'factories',
        site?.i as number,
        { x: tw.x, z: tw.z, key: tw.k },
        0.72,
        2000,
        eye,
        4,
        site?.tint,
      ),
    ];
    for (const it of items)
      for (const [r, g, b] of colours(it, 5)) {
        expect(g as number).toBeGreaterThanOrEqual(r as number);
        expect(g as number).toBeGreaterThanOrEqual(b as number);
      }
  });
});
