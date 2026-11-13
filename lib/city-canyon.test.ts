import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  CANYON_H,
  CANYON_LENGTH,
  CANYON_NAME,
  CANYON_PATH,
  CANYON_RUNS,
  CANYON_W,
  CANYON_WALLS,
  canyonItems,
  canyonWallAt,
  DRIFT,
  inCanyon,
  neonHue,
  wallFaceItem,
} from './city-canyon';
import { hasChar } from './city-font';
import { blocked, blockTower, districtAt, gameItems } from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND, type Item, TILE_X, TILE_Z } from './city-grid';
import { railCeiling } from './city-metro';
import { cityMapData } from './city-minimap';

const finite = (v: number[]) => v.every(Number.isFinite);
const ahead = () => true;

/** Every lit site of some items: finite, never a negative colour; how many. */
function lit(items: Item[]): number {
  const o = [0, 0, 0, 0, 0, 0];
  let n = 0;
  for (const it of items) {
    expect(Number.isFinite(it.d)).toBe(true);
    for (let s = 0; s < it.count; s += Math.max(1, Math.floor(it.count / 200))) {
      if (!it.site(s, o)) continue;
      expect(finite(o)).toBe(true);
      expect(Math.min(o[3] as number, o[4] as number, o[5] as number)).toBeGreaterThanOrEqual(0);
      n++;
    }
  }
  return n;
}

describe('the Neon Canyon (2026-11-13: "add a neon part to the city and a canyon in there")', () => {
  it('runs several hundred long through the Neon market, with a bend', () => {
    expect(CANYON_LENGTH).toBeGreaterThanOrEqual(290);
    expect(new Set(CANYON_RUNS.map((r) => r.axis)).size).toBe(2);
    // Every step of its middle line is in the market (or on its edges).
    for (const r of CANYON_RUNS)
      for (let s = r.s0 + 1; s < r.s1; s += 2) {
        const [x, z] = r.axis === 2 ? [r.c + 1, s] : [s, r.c + 1];
        expect(districtAt(x, z)).toBe('market');
      }
  });

  it('walls it with very tall towers close on both sides, lower only under the metro', () => {
    for (const w of CANYON_WALLS) {
      const tw = blockTower(w.li, w.lj);
      expect(tw.shape).toBe('box');
      expect(tw.bore).toBeNull();
      const ceiling = railCeiling(w.li, w.lj);
      if (Number.isFinite(ceiling)) expect(tw.h).toBeLessThanOrEqual(ceiling);
      else expect(tw.h).toBeGreaterThanOrEqual(CANYON_H[0]);
      // They hold you like every tower.
      expect(blocked([tw.x, GROUND + tw.h / 2, tw.z])).toBe(true);
      expect(blocked([tw.x, GROUND + tw.h + 3, tw.z])).toBe(false);
    }
    // Most of its length is walled over a hundred high, twelve across.
    const tall = CANYON_WALLS.filter((w) => blockTower(w.li, w.lj).h >= 100);
    expect(tall.length).toBeGreaterThanOrEqual(12);
    for (const r of CANYON_RUNS) {
      if (r.axis !== 2) continue;
      const J = Math.floor((r.s0 + 10) / BLOCK_Z);
      const west = blockTower(Math.floor((r.c - 1) / BLOCK_X), J);
      const east = blockTower(Math.floor((r.c + 1) / BLOCK_X), J);
      expect(east.x - east.hx - (west.x + west.hx)).toBeCloseTo(2 * CANYON_W, 6);
      expect(Math.min(west.h, east.h) / (2 * CANYON_W)).toBeGreaterThan(8);
    }
    expect(canyonWallAt(1 + 12, 43 + 56)).not.toBeNull();
    expect(canyonWallAt(-3, 43)).toBeNull();
  });

  it('keeps its street and both mouths clear to fly, at every height', () => {
    // Every run end to end (round the bend the far wall stands across the run's line, as it should).
    for (const r of CANYON_RUNS)
      for (let s = r.s0; s <= r.s1; s += 1)
        for (const off of [-CANYON_W + 2.2, 0, CANYON_W - 2.2])
          for (const y of [3, 20, 50, 90]) {
            const q: Vec3 = r.axis === 2 ? [r.c + off, GROUND + y, s] : [s, GROUND + y, r.c + off];
            expect(blocked(q)).toBe(false);
            expect(inCanyon(q[0] + TILE_X, q[2] - TILE_Z)).toBe(true);
          }
    const [x0, z0] = CANYON_PATH[0] as [number, number];
    const [x1, z1] = CANYON_PATH[CANYON_PATH.length - 1] as [number, number];
    for (let d = 0; d < 12; d++) {
      expect(blocked([x0, GROUND + 6, z0 - d])).toBe(false);
      expect(blocked([x1, GROUND + 6, z1 + d])).toBe(false);
    }
    expect(inCanyon(-60, 1500)).toBe(false);
  });

  it('lights its walls, cables across it, boards and its name, near the eye only, finite', () => {
    const eye: Vec3 = [CANYON_PATH[2]?.[0] as number, GROUND + 25, 1470];
    const out: Item[] = [];
    canyonItems(eye, 7, 160, blockTower, ahead, out);
    expect(out.filter((it) => it.weight === 1.3).length).toBeGreaterThan(4);
    expect(out.filter((it) => it.weight === 1.8).length).toBeGreaterThan(2);
    expect(out.filter((it) => it.weight === 3.5).length).toBeGreaterThan(10);
    expect(lit(out)).toBeGreaterThan(1000);
    for (const it of out) if (it.weight === 1.3) expect(it.count).toBeLessThanOrEqual(3600);
    // In the game's own picture too.
    const game = gameItems(eye, [0, 0, 1], 7);
    expect(game.filter((it) => it.weight === 1.8).length).toBeGreaterThan(2);
    // Far off (Chinatown), nothing of it is lit.
    const far: Item[] = [];
    canyonItems([0, GROUND + 20, 120], 7, 160, blockTower, ahead, far);
    expect(far).toHaveLength(0);
    for (const ch of CANYON_NAME) if (ch !== '\n' && ch !== ' ') expect(hasChar(ch)).toBe(true);
  });

  it('drifts its colours slowly round the neon hues, never a flash', () => {
    // A frame apart, a hue moves by under a hundredth.
    for (let u = 0; u < 1; u += 0.003) {
      const a = neonHue(u);
      const b = neonHue(u + DRIFT / 60);
      for (let c = 0; c < 3; c++)
        expect(Math.abs((a[c] as number) - (b[c] as number))).toBeLessThan(0.01);
    }
    const tw = blockTower(1, 44);
    const eye: Vec3 = [26, GROUND + 20, tw.z - 30];
    const A = wallFaceItem(tw, [-1, 0], eye, 30, 10);
    const B = wallFaceItem(tw, [-1, 0], eye, 30 + 1 / 60, 10);
    const o = [0, 0, 0, 0, 0, 0];
    const p = [0, 0, 0, 0, 0, 0];
    for (let s = 0; s < A.count; s += 7) {
      if (!A.site(s, o) || !B.site(s, p)) continue;
      for (let c = 3; c < 6; c++)
        expect(Math.abs((o[c] as number) - (p[c] as number))).toBeLessThan(0.02);
    }
  });

  it('is on the map, its line down its street and its name "Neon Canyon"', () => {
    const m = cityMapData();
    expect(m.canyon).toEqual(CANYON_PATH);
    const place = m.places.find((p) => p.name === 'Neon Canyon');
    expect(place?.kind).toBe('canyon');
    expect(inCanyon(place?.x as number, place?.z as number)).toBe(true);
  });
});
