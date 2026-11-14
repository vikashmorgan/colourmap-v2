import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { BUILDING_SPOTS, buildingModel } from './city-buildings-15';
import { blockTower, blockTowerAsWas } from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND, type Item, TILE_I } from './city-grid';
import {
  CROWN_RISE,
  istanbulItems,
  TURQUOISE_CROWN,
  towerCrown,
  turquoiseCrownSet,
} from './city-istanbul';
import { railCeiling } from './city-metro';
import { ringSets } from './city-rings';
import { STATIONS, stationModel } from './city-stations';
import { strokePoint } from './city-strokes';

const G = GROUND;

function oriental() {
  const out = [];
  for (let I = 2; I < TILE_I / 2; I++)
    for (let J = 8; J < 16; J++) {
      const tw = blockTower(I, J);
      if (tw.d === 'oriental' && tw.shape === 'box') out.push({ tw, was: blockTowerAsWas(I, J) });
    }
  return out;
}

describe('the Oriental quarter in an Istanbul spirit (2026-11-14)', () => {
  it('raises its towers and crowns each with domes and needles, turquoise and gold', () => {
    const ts = oriental();
    expect(ts.length).toBeGreaterThan(3);
    const now = ts.reduce((s, t) => s + t.tw.h, 0) / ts.length;
    const was = ts.reduce((s, t) => s + t.was.h, 0) / ts.length;
    expect(now).toBeGreaterThan(was * 1.5);
    for (const { tw } of ts) {
      const S = towerCrown(tw);
      const o = [0, 0, 0];
      let top = Number.NEGATIVE_INFINITY;
      for (let s = 0; s < S.count; s++) {
        strokePoint(S, s, 0, 0, o);
        top = Math.max(top, o[1] as number);
        // On its roof, within its walls.
        expect(o[1]).toBeGreaterThan(G + tw.h - 0.01);
        expect(Math.abs((o[0] as number) - tw.x)).toBeLessThan(tw.hx + 0.6);
        expect(Math.abs((o[2] as number) - tw.z)).toBeLessThan(tw.hz + 0.6);
      }
      expect(top).toBeLessThan(G + tw.h + CROWN_RISE + 6);
      // Under the high currents' loops (142) by ten.
      expect(top).toBeLessThan(G + 132);
    }
  });

  it('stands the Turquoise Crown on its own open block, the tallest in the quarter', () => {
    const T = TURQUOISE_CROWN;
    const tw = blockTower(T.I, T.J);
    expect(tw.d).toBe('oriental');
    expect(tw.shape).toBe('plaza');
    expect(railCeiling(T.I, T.J)).toBe(Number.POSITIVE_INFINITY);
    const S = turquoiseCrownSet();
    const o = [0, 0, 0];
    let top = Number.NEGATIVE_INFINITY;
    let reach = 0;
    for (let s = 0; s < S.count; s++) {
      strokePoint(S, s, 0, 0, o);
      top = Math.max(top, o[1] as number);
      reach = Math.max(reach, Math.hypot(o[0] as number, o[2] as number));
    }
    expect(top).toBeGreaterThan(G + T.top - 1);
    expect(top).toBeLessThanOrEqual(G + T.top);
    // Taller than every tower and crown of the quarter, and than the Crescent Needle beside it.
    for (const { tw: t } of oriental()) expect(G + t.h + CROWN_RISE + 6).toBeLessThan(top - 30);
    for (const b of BUILDING_SPOTS.filter((x) => x.d === 'oriental'))
      expect(G + buildingModel(b).top).toBeLessThan(top);
    // On its block, under the stations and every ring set over it.
    expect(reach).toBeLessThan(BLOCK_X / 2 + 2);
    const lowStation = Math.min(...STATIONS.map((s) => G + s.h + stationModel(s).lo - s.bob));
    expect(top).toBeLessThan(lowStation - 10);
    const x = (T.I + 0.5) * BLOCK_X;
    const z = (T.J + 0.5) * BLOCK_Z;
    for (const R of ringSets()) {
      const big = Math.max(...R.radii);
      if (Math.hypot(R.c[0] - x, R.c[2] - z) < reach + big + 4)
        expect(R.c[1] - (Math.abs(R.n[1]) > 0.9 ? 1.5 : big)).toBeGreaterThan(top + 6);
    }
  });

  it('draws the Crown from far off, softly lit, nothing jumping between frames', () => {
    const T = TURQUOISE_CROWN;
    const eye: Vec3 = [(T.I + 0.5) * BLOCK_X, G + 30, (T.J + 0.5) * BLOCK_Z + 300];
    const a: Item[] = [];
    const b: Item[] = [];
    istanbulItems(eye, 4, 160, 400, blockTower, () => true, a);
    istanbulItems(eye, 4 + 1 / 60, 160, 400, blockTower, () => true, b);
    expect(a.length).toBeGreaterThan(0);
    for (let i = 0; i < a.length; i++) {
      const A = a[i] as Item;
      const B = b[i] as Item;
      for (let s = 0; s < Math.min(A.count, 600); s++) {
        const p = [0, 0, 0, 0, 0, 0];
        const q = [0, 0, 0, 0, 0, 0];
        A.site(s, p);
        B.site(s, q);
        expect(Math.max(p[3] as number, p[4] as number, p[5] as number)).toBeLessThan(0.9);
        for (let c = 3; c < 6; c++)
          expect(Math.abs((p[c] as number) - (q[c] as number))).toBeLessThan(0.05);
      }
    }
  });
});
