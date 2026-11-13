import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  CODE_GREEN,
  codeTowerItem,
  DATA_SPIRE,
  dataSpireItem,
  rainLight,
  TRAIL,
} from './city-code';
import {
  BAND_ROWS,
  BANDS,
  blocked,
  blockTower,
  DISTRICTS,
  districtOf,
  gameItems,
  LANDMARKS,
} from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND, type Item, TILE_I, TILE_J } from './city-grid';
import { cityMapData, landmarkName } from './city-minimap';

const finite = (v: number[]) => v.every(Number.isFinite);
const CODE_J0 = BANDS.findIndex((b) => b[0] === 'code') * BAND_ROWS;

/** Every lit site of some items: finite, and green (green the strongest of the three). */
function greenSites(items: Item[]) {
  const o = [0, 0, 0, 0, 0, 0];
  let n = 0;
  for (const it of items) {
    for (let s = 0; s < it.count; s += Math.max(1, Math.floor(it.count / 300))) {
      if (!it.site(s, o)) continue;
      expect(finite(o)).toBe(true);
      expect(o[4] as number).toBeGreaterThanOrEqual(o[3] as number);
      expect(o[4] as number).toBeGreaterThanOrEqual(o[5] as number);
      n++;
    }
  }
  return n;
}

describe('the Green Code quarter (2026-11-13: "do a matrix quarter in green")', () => {
  it('takes a band of its own at the far end of the plan, both sides, overlapping no other quarter', () => {
    expect(BANDS).toHaveLength(TILE_J / BAND_ROWS);
    expect(BANDS[BANDS.length - 1]).toEqual(['code', 'code']);
    // The six bands before it are as they were.
    expect(BANDS.slice(0, 6).flat()).not.toContain('code');
    for (let J = 0; J < TILE_J; J++) {
      for (let I = -TILE_I / 2; I < TILE_I / 2; I++) {
        const inBand = J >= CODE_J0 && J < CODE_J0 + BAND_ROWS;
        expect(districtOf(I, J) === 'code').toBe(inBand);
      }
    }
    expect(DISTRICTS.code.name).toBe('Green Code quarter');
    expect(DISTRICTS.code.colour).toEqual(CODE_GREEN);
  });

  it('raises dark code towers that hold you, leave streets of six or more and keep off the avenue', () => {
    let towers = 0;
    for (let J = CODE_J0; J < CODE_J0 + BAND_ROWS; J++) {
      for (let I = -TILE_I / 2; I < TILE_I / 2; I++) {
        const tw = blockTower(I, J);
        if (tw.shape === 'plaza') continue;
        expect(tw.shape).toBe('code');
        towers++;
        expect(Math.abs(tw.x) - tw.hx).toBeGreaterThanOrEqual(9 - 1e-9);
        expect(tw.x - tw.hx - I * BLOCK_X).toBeGreaterThanOrEqual(3 - 1e-9);
        expect((I + 1) * BLOCK_X - tw.x - tw.hx).toBeGreaterThanOrEqual(3 - 1e-9);
        expect(tw.z - tw.hz - J * BLOCK_Z).toBeGreaterThanOrEqual(3 - 1e-9);
        expect((J + 1) * BLOCK_Z - tw.z - tw.hz).toBeGreaterThanOrEqual(3 - 1e-9);
        expect(blocked([tw.x, GROUND + tw.h / 2, tw.z])).toBe(true);
        expect(blocked([tw.x, GROUND + tw.h + 3, tw.z])).toBe(false);
      }
    }
    expect(towers).toBeGreaterThan(80);
  });

  it('stands a data spire on its plaza, named on the map', () => {
    const L = LANDMARKS.find((l) => l.kind === 'dataspire');
    expect(L?.d).toBe('code');
    expect(landmarkName(L as (typeof LANDMARKS)[number])).toBe('Data spire');
    const place = cityMapData().places.find((p) => p.name === 'Data spire');
    expect(place?.y).toBe(DATA_SPIRE.top);
    expect(cityMapData().districts.some((d) => d.id === 'code')).toBe(true);
  });

  it('lets the code fall slowly and smoothly down each column: a pale head, a fading trail, no flash', () => {
    for (const seed of [1, 77, 4242]) {
      let lit = 0;
      let lo = 1;
      let hi = 0;
      let step = 0;
      for (let row = 0; row < 40; row++) {
        let last = rainLight(seed, row, 40, 0);
        for (let f = 1; f < 30 * 60; f++) {
          const b = rainLight(seed, row, 40, f / 60);
          lo = Math.min(lo, b);
          hi = Math.max(hi, b);
          step = Math.max(step, Math.abs(b - last));
          last = b;
          if (b > 0.04) lit++;
        }
      }
      expect(lo).toBeGreaterThanOrEqual(0);
      expect(hi).toBeLessThanOrEqual(1);
      expect(hi).toBeGreaterThan(0.9);
      // Never more than a soft step a frame: the head moves at most three and a half cells a second.
      expect(step).toBeLessThan(0.07);
      // Lit about a quarter of the time: a column of streams, not a wall of light.
      const share = lit / (40 * 30 * 60);
      expect(share).toBeGreaterThan(0.1);
      expect(share).toBeLessThan(0.5);
    }
    expect(TRAIL).toBeGreaterThan(6);
  });

  it('draws its towers, spire, streets and welcome in green only, at finite places', () => {
    const tw = blockTower(-3, CODE_J0 + 1);
    const eye: Vec3 = [tw.x - 30, GROUND + 20, tw.z + 40];
    expect(greenSites([codeTowerItem(tw, eye, 3, 30)])).toBeGreaterThan(50);
    const L = LANDMARKS.find((l) => l.kind === 'dataspire') as (typeof LANDMARKS)[number];
    const spire = dataSpireItem(L.x, L.z, [L.x + 60, GROUND + 40, L.z + 80], 7, 50, 1);
    expect(greenSites([spire])).toBeGreaterThan(50);
    // In the quarter, everything the game adds near the street is green (the ships aside).
    const inside: Vec3 = [2, GROUND + 20, (CODE_J0 + 4) * BLOCK_Z];
    const items = gameItems(inside, [0, -0.1, -1], 5).filter((it) => it.d < 60);
    expect(items.length).toBeGreaterThan(3);
    expect(greenSites(items)).toBeGreaterThan(100);
  });

  it('keeps its towers within the budget the business towers keep', () => {
    let worst = 0;
    for (let J = CODE_J0; J < CODE_J0 + BAND_ROWS; J++) {
      const tw = blockTower(1, J);
      if (tw.shape !== 'code') continue;
      worst = Math.max(worst, codeTowerItem(tw, [tw.x + 30, GROUND + 20, tw.z + 30], 0, 10).count);
    }
    expect(worst).toBeLessThanOrEqual(4200);
  });
});
