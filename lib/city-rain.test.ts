import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { blocked, blockTower, floorAt, gameItems, waterAt } from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND, type Item, TILE_I, TILE_J, TILE_X, TILE_Z } from './city-grid';
import {
  BRIDGES_X,
  FALL,
  inRiver,
  RIPPLES,
  RIVER_W,
  RIVER_Y,
  RIVER_Z,
  rainAt,
  ripple,
  riverItems,
  STREAKS,
  streakHead,
  WIND,
} from './city-rain';

const sites = (it: Item) => {
  const out: { pos: Vec3; rgb: Vec3 }[] = [];
  const o = [0, 0, 0, 0, 0, 0];
  for (let s = 0; s < it.count; s++) {
    if (!it.site(s, o)) continue;
    out.push({
      pos: [o[0], o[1], o[2]] as Vec3,
      rgb: [o[3], o[4], o[5]] as Vec3,
    });
  }
  return out;
};
const ok = (q: { pos: Vec3; rgb: Vec3 }) =>
  [...q.pos, ...q.rgb].every(Number.isFinite) && Math.min(...q.rgb) >= 0;

describe('the river (2026-11-12: "parts with a river")', () => {
  it('crosses the whole city along x, sunk under the street, every tile', () => {
    for (let x = -3 * TILE_X; x < 3 * TILE_X; x += 7) {
      expect(inRiver(x, RIVER_Z)).toBe(true);
      expect(inRiver(x, RIVER_Z + TILE_Z * 2)).toBe(true);
      expect(floorAt(x, RIVER_Z)).toBe(RIVER_Y);
      expect(waterAt(x, RIVER_Z)).toBe(RIVER_Y);
    }
    expect(inRiver(0, RIVER_Z + RIVER_W + 1)).toBe(false);
    expect(RIVER_Y).toBeLessThan(GROUND - 4);
  });

  it('keeps every tower back from its banks, and you can fly low over it, under the bridges', () => {
    for (let I = -TILE_I; I < TILE_I; I++) {
      for (const J of [23, 24, 23 + TILE_J, 24 - TILE_J]) {
        const tw = blockTower(I, J);
        expect(['box', 'business']).toContain(tw.shape);
        const zc = Math.round(tw.z / TILE_Z) * TILE_Z + RIVER_Z;
        const zr = tw.z < zc ? zc - RIVER_W - 2 : zc + RIVER_W + 2;
        expect(tw.z < zc ? tw.z + tw.hz : tw.z - tw.hz).toSatisfy((e: number) =>
          tw.z < zc ? e <= zr : e >= zr,
        );
        // The street beside it is still six or more wide.
        const other = blockTower(I, tw.z < zc ? J - 1 : J + 1);
        if (other.shape === 'box') {
          const gap =
            tw.z < zc ? tw.z - tw.hz - (other.z + other.hz) : other.z - other.hz - (tw.z + tw.hz);
          expect(gap).toBeGreaterThanOrEqual(6);
        }
      }
    }
    for (let x = -TILE_X / 2; x < TILE_X / 2; x += 3) {
      for (const dz of [-RIVER_W + 2, 0, RIVER_W - 2]) {
        expect(blocked([x, RIVER_Y + 2.5, RIVER_Z + dz])).toBe(false);
        expect(blocked([x, RIVER_Y + 1, RIVER_Z + dz])).toBe(true);
      }
    }
  });

  it('draws water, banks, bridges and their reflections, finite and lit, near the eye', () => {
    const eye: Vec3 = [4, GROUND + 6, RIVER_Z + 40];
    const out: Item[] = [];
    riverItems(eye, 300, 160, floorAt, waterAt, out);
    const all = out.flatMap(sites);
    expect(all.length).toBeGreaterThan(2000);
    expect(all.every(ok)).toBe(true);
    // A bridge on every street within sight, the avenue's the grand one with its pylons.
    expect(BRIDGES_X).toContain(0);
    expect(all.some((q) => Math.abs(q.pos[0]) < 12 && q.pos[1] > GROUND + 20)).toBe(true);
    // Reflections: lamps and arches mirrored under the surface.
    const under = all.filter((q) => q.pos[1] < RIVER_Y - 1 && Math.max(...q.rgb) > 0.05);
    expect(under.length).toBeGreaterThan(50);
    // Nothing on the river flashes: a frame apart no site's colour moves by 0.05 (the rain itself
    // falls fast, and is left out).
    const later: Item[] = [];
    riverItems(eye, 300 + 1 / 60, 160, floorAt, waterAt, later);
    let jump = 0;
    out.forEach((it, i) => {
      const o = [0, 0, 0, 0, 0, 0];
      const p = [0, 0, 0, 0, 0, 0];
      const it2 = later[i] as Item;
      if (it.d <= 2) return;
      for (let s = 0; s < it.count; s += 7) {
        if (!it.site(s, o) || !it2.site(s, p)) continue;
        jump = Math.max(jump, Math.hypot(o[3] - p[3], o[4] - p[4], o[5] - p[5]));
      }
    });
    expect(jump).toBeLessThan(0.05);
    // From the city's game, flying along the river.
    const game = gameItems(eye, [0, 0, -1], 300);
    expect(game.length).toBeGreaterThan(out.length);
  });
});

describe('the rain (2026-11-12: "a part with rain and rain on the water below")', () => {
  it('rains over the Canals and the river beside them, nowhere else', () => {
    expect(rainAt(3 * BLOCK_X, 20 * BLOCK_Z)).toBeGreaterThan(0.95);
    expect(rainAt(3 * BLOCK_X, RIVER_Z)).toBeGreaterThan(0.95);
    expect(rainAt(3 * BLOCK_X + TILE_X, 20 * BLOCK_Z + TILE_Z)).toBeGreaterThan(0.95);
    expect(rainAt(3 * BLOCK_X, 4 * BLOCK_Z)).toBe(0);
    expect(rainAt(-4 * BLOCK_X, 20 * BLOCK_Z)).toBe(0);
  });

  it('falls in streaks slanting in the wind, kept round the eye', () => {
    const eye: Vec3 = [3 * BLOCK_X, GROUND + 10, 20 * BLOCK_Z];
    let fell = 0;
    for (let j = 0; j < STREAKS; j++) {
      const a = streakHead(j, eye, 40);
      const b = streakHead(j, eye, 40 + 1 / 60);
      expect(Math.abs(a[0] - eye[0])).toBeLessThanOrEqual(34 + 1e-9);
      expect(Math.abs(a[2] - eye[2])).toBeLessThanOrEqual(34 + 1e-9);
      if (b[1] < a[1]) {
        fell++;
        const dy = a[1] - b[1];
        expect(dy).toBeGreaterThan((FALL * 0.85) / 60);
        expect(b[0] - a[0]).toBeCloseTo(dy * WIND, 6);
      }
    }
    expect(fell).toBeGreaterThan(STREAKS * 0.9);
  });

  it('spreads rings on the water where it falls, never on dry ground', () => {
    const eye: Vec3 = [3 * BLOCK_X, GROUND + 6, RIVER_Z - 20];
    let shown = 0;
    for (let j = 0; j < RIPPLES; j++) {
      const a = ripple(j, eye, 50, waterAt);
      if (!a) continue;
      expect(waterAt(a.c[0], a.c[2])).not.toBeNull();
      if (a.k > 0.05) shown++;
    }
    expect(shown).toBeGreaterThan(RIPPLES * 0.25);
    // In the rain the game adds the rain and its ripples; out of it, neither.
    const wet: Item[] = [];
    riverItems(eye, 50, 160, floorAt, waterAt, wet);
    const dry: Item[] = [];
    riverItems([-4 * BLOCK_X, GROUND + 6, 4 * BLOCK_Z], 50, 160, floorAt, waterAt, dry);
    const streaks = (list: Item[]) => list.filter((it) => it.d === 0).length;
    expect(streaks(wet)).toBe(1);
    expect(streaks(dry)).toBe(0);
    const rain =
      (wet.find((it) => it.d === 0) as Item) && sites(wet.find((it) => it.d === 0) as Item);
    expect(rain.length).toBeGreaterThan(STREAKS);
    expect(rain.every(ok)).toBe(true);
    // No drop below the floor.
    expect(rain.every((q) => q.pos[1] >= floorAt(q.pos[0], q.pos[2]))).toBe(true);
  });
});
