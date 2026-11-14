import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { route } from './city';
import {
  AVENUE_BAND_ROWS,
  AVENUE_STYLES,
  avenueItems,
  avenueSpans,
  GATE_LINTELS,
  GATE_X,
  GATE_Y,
  GATEWAYS,
  gatewayWords,
  rowHues,
} from './city-avenue';
import { missingChars } from './city-font';
import { BAND_ROWS, BANDS, blocked, blockTower, MARGIN } from './city-game';
import { AVENUE, BLOCK_Z, GROUND, type Item, TILE_J, TILE_Z } from './city-grid';
import { TRACKS } from './city-race';
import { QUARTER_STARTS } from './city-travel';

const finite = (v: number[]) => v.every(Number.isFinite);
const always = () => true;
/** The Grand Avenue's items seen from eye, looking down the avenue (−z). */
const near = (eye: Vec3, t = 2): Item[] => {
  const out: Item[] = [];
  avenueItems(eye, t, 160, blockTower, always, out);
  return out;
};
/** Every site of the items, as [x, y, z, r, g, b]. */
const sites = (items: Item[], step = 1) => {
  const out: number[][] = [];
  for (const it of items)
    for (let s = 0; s < it.count; s += step) {
      const o = [0, 0, 0, 0, 0, 0];
      if (it.site(s, o)) out.push(o);
    }
  return out;
};
/** The rows of band b in turn n of the plan. */
const bandRows = (b: number, n = 0) =>
  Array.from({ length: AVENUE_BAND_ROWS }, (_, r) => n * TILE_J + b * AVENUE_BAND_ROWS + r);

describe('the Grand Avenue (2026-11-14: "make the main street when u go from chinatown start forward forever unique. on multiple heights")', () => {
  it('has a design for every band of the plan, each its own', () => {
    expect(AVENUE_BAND_ROWS).toBe(BAND_ROWS);
    expect(AVENUE_STYLES.length).toBe(BANDS.length);
    const looks = AVENUE_STYLES.map((S) => `${S.spanKinds}|${S.galleryKinds}|${S.roofs}`);
    expect(new Set(looks).size).toBe(AVENUE_STYLES.length);
    for (const S of AVENUE_STYLES.slice(1)) {
      // Lit roofs on both sides, never plain black ones, and something over the avenue.
      expect(S.roofs).not.toContain('none');
      expect(S.features.length).toBeGreaterThan(0);
    }
  });

  it('stands its walls high in every quarter ("make sure these main streets are high with many vertical levels")', () => {
    for (let b = 1; b < BANDS.length; b++) {
      const hs: number[] = [];
      for (const J of [...bandRows(b), ...bandRows(b, 1)])
        for (const I of [-1, 0]) {
          const tw = blockTower(I, J);
          if (tw.shape === 'box' || tw.shape === 'code') hs.push(tw.h);
        }
      hs.sort((a, c) => a - c);
      // Most of them well above the road (the metro still lowers the few it passes over).
      expect(hs[Math.floor(hs.length / 2)]).toBeGreaterThan(50);
    }
  });

  it('crosses every band’s stretch with bridges at three heights or more, all above 20, wall to wall', () => {
    for (let b = 0; b < BANDS.length; b++) {
      const levels = new Set<number>();
      for (const J of [...bandRows(b), ...bandRows(b, 1)]) {
        for (const sp of avenueSpans(0, J, blockTower)) {
          levels.add(sp.y - GROUND);
          expect(sp.y - GROUND).toBeGreaterThan(20);
          // From the left wall to the right, under both walls' tops.
          expect(sp.x0).toBeCloseTo(-AVENUE, 0);
          expect(sp.x1).toBeCloseTo(AVENUE, 0);
          expect(sp.y).toBeLessThan(GROUND + Math.min(blockTower(-1, J).h, blockTower(0, J).h));
          // In the block, never over the cross street.
          const into = sp.z - Math.floor(sp.z / BLOCK_Z) * BLOCK_Z;
          expect(into).toBeGreaterThan(2);
          expect(into).toBeLessThan(BLOCK_Z - 2);
        }
      }
      expect(levels.size).toBeGreaterThanOrEqual(3);
    }
  });

  it('draws each band’s stretch at many levels above the road: galleries, bridges, roofs, features', () => {
    for (let b = 1; b < BANDS.length; b++) {
      const z = (b * AVENUE_BAND_ROWS + 6) * BLOCK_Z;
      const items = near([0, GROUND + 40, z], 3);
      expect(items.length).toBeGreaterThan(8);
      const all = sites(items, 3);
      const bins = new Set(
        all
          .filter((o) => (o[1] as number) > GROUND + 20 && Math.abs((o[2] as number) - z) < 160)
          .map((o) => Math.floor(((o[1] as number) - GROUND) / 10)),
      );
      // From 20 up to 70 and more: something on every ten of height.
      expect(bins.size).toBeGreaterThanOrEqual(6);
      for (const o of all) {
        expect(finite(o)).toBe(true);
        for (const c of [3, 4, 5]) {
          expect(o[c]).toBeGreaterThanOrEqual(0);
          expect(o[c]).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('keeps the avenue flyable: nothing it adds is solid, the middle clear at every bridge’s height', () => {
    for (let z = 3; z < TILE_Z; z += 5)
      for (const y of [21, 34, 48, 64, 90, 120])
        for (const x of [-AVENUE + MARGIN + 0.3, 0, AVENUE - MARGIN - 0.3])
          expect(blocked([x, GROUND + y, z])).toBe(false);
    for (let t = 0; t < 600; t += 0.5) {
      const { c } = route(t);
      expect(blocked(c)).toBe(false);
      expect(Math.abs(c[0])).toBeLessThan(AVENUE - 2);
    }
  });

  it('leaves the quarter starts and the race courses as clear as they were', () => {
    for (const q of QUARTER_STARTS) expect(blocked(q.pos)).toBe(false);
    for (const T of TRACKS) for (const g of [T.start, ...T.gates]) expect(blocked(g)).toBe(false);
  });

  it('drifts its colours slowly: no light jumps between frames, never a flash', () => {
    const eye: Vec3 = [0, GROUND + 50, (4 * AVENUE_BAND_ROWS + 3) * BLOCK_Z];
    for (const t of [1, 7.3, 40]) {
      const a = near(eye, t);
      const b = near(eye, t + 1 / 60);
      expect(a.length).toBe(b.length);
      const o = [0, 0, 0, 0, 0, 0];
      const p = [0, 0, 0, 0, 0, 0];
      a.forEach((it, i) => {
        const jt = b[i] as Item;
        for (let s = 0; s < it.count; s += 11) {
          it.site(s, o);
          jt.site(s, p);
          for (const c of [3, 4, 5])
            expect(Math.abs((o[c] as number) - (p[c] as number))).toBeLessThan(0.03);
        }
      });
    }
  });
});

describe('the loop, seamless (2026-11-14: "so from china town forward finish game and goes back to china town so u can go infinitely forward")', () => {
  it('stands a gateway at every band’s edge, the first where the Green Code gives way to Chinatown', () => {
    expect(GATEWAYS.length).toBe(BANDS.length);
    GATEWAYS.forEach((g, b) => {
      expect(g.z).toBe(b * BAND_ROWS * BLOCK_Z);
      expect(g.to).toBe(b);
    });
    const join = GATEWAYS[0];
    if (!join) throw new Error('no join');
    expect(BANDS[join.from]).toEqual(['code', 'code']);
    expect(BANDS[join.to]).toEqual(['chinatown', 'chinatown']);
    const words = gatewayWords(join, 0, 0, 1).map((w) => w.text);
    expect(words).toContain('CHINATOWN');
    expect(words).toContain('GREEN CODE');
    for (const g of GATEWAYS)
      for (const w of gatewayWords(g, 0, g.z, 1)) {
        expect(missingChars(w.text, 'deco')).toEqual([]);
        // Over the lanes the Ship cruises in, inside the avenue.
        expect(w.at[1]).toBeGreaterThan(GROUND + 40);
        expect(w.at[0]).toBeGreaterThan(-AVENUE);
      }
  });

  it('draws each gateway up to its crown, light all through, in the next turn of the plan the same', () => {
    for (const n of [0, 1, -1])
      for (const g of GATEWAYS) {
        const gz = n * TILE_Z + g.z;
        const all = sites(near([0, GROUND + 30, gz + 60]), 2).filter(
          (o) => Math.abs((o[2] as number) - gz) < 3 && Math.abs(o[0] as number) <= GATE_X + 4,
        );
        expect(Math.max(...all.map((o) => o[1] as number))).toBeGreaterThan(GROUND + GATE_Y);
        // The lintels carry lights across the whole avenue.
        for (const h of GATE_LINTELS)
          expect(
            all.some(
              (o) => Math.abs((o[1] as number) - GROUND - h) < 0.7 && Math.abs(o[0] as number) < 1,
            ),
          ).toBe(true);
        // And you fly through it, at every height.
        for (const y of [10, 21, 50, 80, 105]) expect(blocked([0, GROUND + y, gz])).toBe(false);
      }
  });

  it('carries the same design on every turn of the plan, and blends each band into the next at its edges', () => {
    // The towers differ from turn to turn; each block's design is the same.
    for (const J of [3, 13, 30, 47, 55]) {
      const kinds = (JJ: number) => [...new Set(avenueSpans(0, JJ, blockTower).map((s) => s.kind))];
      const here = kinds(J);
      for (const n of [1, -1, 5]) {
        const there = kinds(J + n * TILE_J);
        if (here.length && there.length) expect(there).toEqual(here);
      }
    }
    for (let b = 0; b < BANDS.length; b++) {
      const S = AVENUE_STYLES[b] as (typeof AVENUE_STYLES)[number];
      const prev = AVENUE_STYLES[(b + BANDS.length - 1) % BANDS.length] as typeof S;
      const [first] = rowHues(b, 0);
      const [mid] = rowHues(b, 3);
      expect(mid).toEqual(S.hues[0]);
      // Leaning toward the band before it, if the two differ.
      const d0 = Math.hypot(...first.map((c, i) => c - (prev.hues[0][i] as number)));
      const d1 = Math.hypot(...S.hues[0].map((c, i) => c - (prev.hues[0][i] as number)));
      if (d1 > 0) expect(d0).toBeLessThan(d1);
    }
  });
});
