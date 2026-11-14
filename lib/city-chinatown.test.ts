import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { LOUNGES, placeDock } from './city-docks';
import { missingChars, textPixels } from './city-font';
import {
  BAND_ROWS,
  BANDS,
  blocked,
  blockTower,
  CT_TALL,
  cityBanners,
  ctStoreys,
  districtAt,
  gameItems,
  MARGIN,
  WALK_LEVELS,
  walkItem,
  walkwaysNear,
} from './city-game';
import { AVENUE, BLOCK_Z, GROUND, TILE_J, TILE_Z, wrap } from './city-grid';
import { CITY_NAMES, OPENING, TORII, wordItem } from './city-signs';

const finite = (v: number[]) => v.every(Number.isFinite);
const ctTowers = (n = 0) => {
  const out = [];
  for (let J = n * TILE_J; J < n * TILE_J + BAND_ROWS; J++)
    for (let I = -6; I < 6; I++) {
      const tw = blockTower(I, J);
      if (tw.d === 'chinatown' && tw.shape === 'box') out.push(tw);
    }
  return out;
};

describe('Chinatown, higher (2026-11-13: "make chinatown higher with many levels. i like how it is becoming devlopped")', () => {
  it('stands taller, storey on storey, a few tall tiered towers over the rest', () => {
    const tws = ctTowers();
    expect(tws.length).toBeGreaterThan(40);
    const mean = tws.reduce((a, tw) => a + tw.h, 0) / tws.length;
    // Lower towers than the Heights still, but well above the 22 to 38 they were.
    expect(mean).toBeGreaterThan(38);
    const tall = tws.filter((tw) => tw.h >= CT_TALL);
    expect(tall.length).toBeGreaterThanOrEqual(2);
    expect(tall.length).toBeLessThan(tws.length / 4);
    // Over four turns of the plan, a few in every Chinatown.
    const many = [0, 1, 2, 3].map((n) => ctTowers(n).filter((tw) => tw.h >= CT_TALL).length);
    expect(many.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(10);
    for (const tw of tws) expect(ctStoreys(tw.h)).toBeGreaterThanOrEqual(4);
    expect(ctStoreys(100)).toBeGreaterThanOrEqual(15);
  });

  it('holds you at the new heights, and keeps the avenue and its gates open to fly down', () => {
    for (const tw of ctTowers()) {
      if (tw.bore) continue;
      expect(blocked([tw.x, GROUND + tw.h - 1, tw.z])).toBe(true);
      expect(blocked([tw.x, GROUND + tw.h + MARGIN + 0.5, tw.z])).toBe(false);
    }
    // Down the middle of the avenue through Chinatown and the opening road, low and high.
    for (let z = 2; z < OPENING.start; z += 3)
      for (const y of [GROUND + 8.5, GROUND + 21, GROUND + 60])
        for (const x of [-AVENUE + MARGIN + 0.3, 0, AVENUE - MARGIN - 0.3])
          expect(blocked([x, y, z])).toBe(false);
    // The gates' lintels still stand over the lane you fly in under them.
    expect(GROUND + TORII.beam).toBeGreaterThan(GROUND + 21);
  });

  it('keeps the Chinatown lounge’s pad clear to land on', () => {
    const i = LOUNGES.findIndex((L) => L.name === 'Chinatown lounge');
    const P = placeDock(i, [0, 0, 0]);
    expect(blocked([P.pad[0], P.pad[1] + 2, P.pad[2]])).toBe(false);
  });

  it('crosses its side streets with covered walkways at several heights, never over the avenue', () => {
    const ws = walkwaysNear([0, GROUND + 30, 4 * BLOCK_Z], 140);
    expect(ws.length).toBeGreaterThan(6);
    const heights = new Set(ws.map((w) => w.y - GROUND));
    expect(heights.size).toBeGreaterThanOrEqual(3);
    const o = [0, 0, 0, 0, 0, 0];
    for (const w of ws) {
      expect(WALK_LEVELS).toContain(w.y - GROUND);
      // From wall to wall across a side street, not the avenue.
      expect(w.x1).toBeGreaterThan(w.x0);
      expect(w.x0 >= AVENUE || w.x1 <= -AVENUE).toBe(true);
      expect(districtAt((w.x0 + w.x1) / 2, w.z)).toBe('chinatown');
      const it = walkItem(w, [w.x0, w.y, w.z + 30], 2);
      for (let s = 0; s < it.count; s++) {
        expect(it.site(s, o)).toBe(true);
        expect(finite(o)).toBe(true);
      }
    }
  });

  it('draws its storeys and walkways near the eye, every grain somewhere finite', () => {
    const eye: Vec3 = [30, GROUND + 30, 6 * BLOCK_Z];
    const items = gameItems(eye, [0, 0, -1], 3);
    expect(items.length).toBeGreaterThan(0);
    const o = [0, 0, 0, 0, 0, 0];
    for (const it of items)
      for (let s = 0; s < it.count; s += Math.max(1, Math.floor(it.count / 20)))
        if (it.site(s, o)) expect(finite(o)).toBe(true);
  });
});

describe('the city’s names all round it (2026-11-13: "u can put more banners liek city of dreams. city of hope etc...all around the city.")', () => {
  const all = [0, 1, -1].flatMap((n) => [0, 1].flatMap((m) => cityBanners(n, m)));
  const base = (s: string) => s.replace('\n', ' ');

  it('writes every name, many times, in several faces, every letter drawable', () => {
    const tile = cityBanners(0, 0);
    expect(tile.length).toBeGreaterThanOrEqual(15);
    for (const name of CITY_NAMES) expect(tile.map((w) => base(w.text))).toContain(name);
    expect(new Set(tile.map((w) => w.face)).size).toBeGreaterThanOrEqual(3);
    for (const w of all) {
      expect(CITY_NAMES as readonly string[]).toContain(base(w.text));
      expect(missingChars(w.text, w.face)).toEqual([]);
      expect(w.frame).toBe('box');
    }
  });

  it('stands them over cross streets, on roofs, or on the face of a tall Chinatown tower', () => {
    for (const w of all) {
      const T = textPixels(w.text, { face: w.face });
      const foot = w.at[1] - T.h * w.px;
      expect(foot).toBeGreaterThan(GROUND + 10);
      const cross = Math.abs(wrap(w.at[2] + BLOCK_Z / 2, BLOCK_Z) - BLOCK_Z / 2) < 1e-6;
      if (cross) {
        // Over the avenue, above the lanes the Ship and the traffic cruise in.
        const mid = w.at[0] + (T.w * w.px) / 2;
        if (Math.abs(mid - Math.round(mid / 312) * 312) < 1)
          expect(foot).toBeGreaterThan(GROUND + 28);
        continue;
      }
      // Else on a tower: a roof's street edge or a tall tiered tower's face.
      const tw = blockTower(
        Math.floor((w.at[0] + (T.w * w.px) / 2) / 26),
        Math.floor((w.at[2] - 1.6) / BLOCK_Z),
      );
      expect(tw.shape).toBe('box');
      expect(foot).toBeGreaterThan(GROUND + tw.h * 0.5);
    }
  });

  it('leaves the market’s side and the opening road’s gates to themselves', () => {
    const marketBand = BANDS.findIndex((b) => b[1] === 'market');
    for (const w of cityBanners(0, 0)) {
      const row = Math.floor(wrap(w.at[2] - 0.5, TILE_Z) / BLOCK_Z);
      const T = textPixels(w.text, { face: w.face });
      const mid = w.at[0] + (T.w * w.px) / 2;
      if (Math.floor(row / BAND_ROWS) === marketBand) expect(mid).toBeLessThan(0);
      expect(w.at[2] < OPENING.end || w.at[2] > OPENING.start || Math.abs(mid) > 30).toBe(true);
    }
    expect(TILE_J).toBe(56);
  });

  it('drifts its colour slowly: no light jumps between frames, never a flash', () => {
    const o = [0, 0, 0, 0, 0, 0];
    const p = [0, 0, 0, 0, 0, 0];
    for (const w of cityBanners(0, 0).slice(0, 6)) {
      const eye: Vec3 = [w.at[0], w.at[1], w.at[2] + 40];
      for (let t = 0; t < 20; t += 0.5) {
        const a = wordItem(w, eye, t);
        const b = wordItem(w, eye, t + 1 / 60);
        for (let s = 0; s < a.count; s += 23) {
          a.site(s, o);
          b.site(s, p);
          for (const c of [3, 4, 5])
            expect(Math.abs((o[c] as number) - (p[c] as number))).toBeLessThan(0.02);
        }
      }
    }
  });

  it('shows them to the Ship as it flies down the avenue', () => {
    const w = cityBanners(0, 0)[0];
    if (!w) throw new Error('no banner');
    const items = gameItems([0, GROUND + 21, w.at[2] + 60], [0, 0, -1], 1);
    const count = wordItem(w, [0, GROUND + 21, w.at[2] + 60], 1).count;
    expect(items.some((it) => it.count === count && it.d < 70)).toBe(true);
  });
});
