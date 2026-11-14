import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  ALIVE_CAP,
  aliveItems,
  CANAL_UNIQUE,
  columnCap,
  HANG_DROP,
  type Hang,
  hangSet,
  hangsBetween,
  INDIAN_SPIRES,
  LANE_CLEAR,
  laneFree,
  RISE,
  risesAt,
  type SkyBridge,
  SPIRE_SITES,
  skyBridgeSet,
  skyBridges,
  spireStretch,
} from './city-alive';
import { studioBlockHeight } from './city-big';
import { BUILDING_SPOTS } from './city-buildings-15';
import {
  highCurrent,
  loopAt,
  marketShip,
  OUTLIERS,
  SKY_LANE_GAP,
  SKY_STREAMS,
} from './city-currents';
import { EXPRESS_X, EXPRESS_Z, X_HEIGHTS, Z_HEIGHTS } from './city-flow';
import { blocked, blockTower, blockTowerAsWas } from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND, type Item, TAU, TILE_I, wrap } from './city-grid';
import { railCeiling } from './city-metro';
import { ringSets } from './city-rings';
import { TEMPLE_TOWERS } from './city-skyscrapers-plan';
import { STATION_LOW } from './city-stations';
import { strokePoint } from './city-strokes';

const G = GROUND;
const all = () => true;

/** Every site of an item. */
function sites(it: Item, cap = 40000): number[][] {
  const out: number[][] = [];
  const n = Math.min(it.count, cap);
  for (let s = 0; s < n; s++) {
    const o = [0, 0, 0, 0, 0, 0];
    if (it.site(s, o)) out.push(o);
  }
  return out;
}

/** The plain towers of a quarter in the first tile, off the avenue. */
function towers(d: string) {
  const out = [];
  for (let I = -TILE_I / 2; I < TILE_I / 2; I++)
    for (let J = 0; J < 56; J++) {
      const tw = blockTower(I, J);
      if (tw.d === d && (tw.shape === 'box' || tw.shape === 'business') && risesAt(I))
        out.push({ tw, was: blockTowerAsWas(I, J) });
    }
  return out;
}

/** Whether a point sits in a street channel's lane (its line, its height), LANE_CLEAR / 2 round it. */
function inLane(p: number[]): boolean {
  const x = p[0] as number;
  const y = (p[1] as number) - G;
  const z = p[2] as number;
  const r = LANE_CLEAR / 2;
  const nx = Math.abs(x - Math.round(x / BLOCK_X) * BLOCK_X);
  const nz = Math.abs(z - Math.round(z / BLOCK_Z) * BLOCK_Z);
  if (nx < 4.2 && wrap(Math.round(x / BLOCK_X), TILE_I) !== 0)
    for (const h of [...Z_HEIGHTS, ...Z_HEIGHTS.map((v) => v + 0.6), EXPRESS_Z])
      if (Math.abs(y - h) < r) return true;
  if (nz < 4.2) for (const h of [...X_HEIGHTS, EXPRESS_X]) if (Math.abs(y - h) < r) return true;
  return false;
}

/** Eyes over the quarters: in a street, low, looking along it. */
const EYES: Vec3[] = [
  [65, G + 20, 20 * BLOCK_Z + 10],
  [-60, G + 30, 10 * BLOCK_Z],
  [-120, G + 40, 26 * BLOCK_Z],
  [90, G + 30, 34 * BLOCK_Z],
  [52, G + 25, 9 * BLOCK_Z],
  [-52, G + 25, 41 * BLOCK_Z],
  [78, G + 30, 44 * BLOCK_Z],
];

describe('alive quarters: taller towers (2026-11-14: "much taller, more alive")', () => {
  it('raises the ordinary towers of every quarter, never lowering one', () => {
    for (const d of Object.keys(RISE)) {
      const ts = towers(d);
      expect(ts.length, d).toBeGreaterThan(2);
      const now = ts.reduce((s, t) => s + t.tw.h, 0) / ts.length;
      const was = ts.reduce((s, t) => s + t.was.h, 0) / ts.length;
      for (const t of ts) expect(t.tw.h, d).toBeGreaterThanOrEqual(t.was.h - 1e-9);
      // Much taller on average, but the Heights, tall already.
      expect(now, d).toBeGreaterThan(d === 'heights' ? was * 1.05 : was * 1.25);
    }
    // The Indian quarter much taller overall (it stood 14 to 30).
    const ind = towers('indian');
    const mean = ind.reduce((s, t) => s + t.tw.h, 0) / ind.length;
    expect(mean).toBeGreaterThan(40);
  });

  it('keeps them under the high currents, the big ships and the metro, and solid to fly round', () => {
    for (let I = -TILE_I / 2; I < TILE_I / 2; I++)
      for (let J = 0; J < 56; J++) {
        const tw = blockTower(I, J);
        const was = blockTowerAsWas(I, J);
        if (tw.h <= was.h + 1e-9 || tw.shape !== 'box') continue;
        expect(tw.h).toBeLessThanOrEqual(Math.min(ALIVE_CAP, columnCap(I)) + 1e-9);
        expect(tw.h).toBeLessThanOrEqual(railCeiling(I, J) + 1e-9);
        expect(blocked([tw.x, G + tw.h - 2, tw.z])).toBe(true);
        expect(blocked([tw.x, G + tw.h + 3, tw.z])).toBe(false);
      }
    // The big ships fly along columns -5 and 4 (126 and 96 over the street): raised towers there
    // stay under them by ten.
    for (const O of OUTLIERS) {
      if (O.axis !== 2) continue;
      const I = Math.floor(O.off / BLOCK_X);
      for (let J = 0; J < 56; J++) {
        const tw = blockTower(I, J);
        if (tw.h > blockTowerAsWas(I, J).h + 1e-9) expect(tw.h + 10, O.name).toBeLessThan(O.y);
      }
    }
    // The high currents' loops stay ten over every roof (city-currents.test.ts holds the rest).
    for (const [a, b] of [
      [0, 0],
      [1, 2],
      [-1, 3],
    ]) {
      const H = highCurrent(a as number, b as number);
      for (let s = 0; s < 120; s++) {
        const { p } = loopAt(H, (s / 120) * TAU);
        const tw = blockTower(Math.floor(p[0] / BLOCK_X), Math.floor(p[2] / BLOCK_Z));
        expect(p[1]).toBeGreaterThan(G + tw.h + 10);
      }
    }
  });

  it('makes the Canals’ own buildings as tall as the Heights’ towers', () => {
    const heights = towers('heights').map((t) => t.tw.h);
    const hMean = heights.reduce((s, h) => s + h, 0) / heights.length;
    let n = 0;
    for (let I = 0; I < TILE_I / 2; I++)
      for (let J = 16; J < 24; J++) {
        const tw = blockTower(I, J);
        if (tw.shape !== 'design' || !tw.design || tw.d !== 'canals') continue;
        n++;
        const cap = Math.min(CANAL_UNIQUE.lo, columnCap(I), railCeiling(I, J) - 2);
        expect(tw.design.h).toBeGreaterThanOrEqual(cap - 1e-9);
        expect(tw.design.h).toBeLessThanOrEqual(CANAL_UNIQUE.hi + 1e-9);
        // Free of the metro, they stand at the Heights' scale.
        if (cap >= CANAL_UNIQUE.lo) expect(tw.design.h).toBeGreaterThan(hMean * 0.85);
        // Its footprint kept: the canal streets still breathe.
        expect(tw.design.r).toBeLessThan(10);
        expect(blocked([tw.x, G + tw.design.h * 0.5, tw.z])).toBe(true);
      }
    expect(n).toBeGreaterThan(3);
  });
});

describe('alive quarters: the Indian quarter’s super-tall spires', () => {
  it('stands three to five, each on an open block, spread out, from the Studio’s collection', () => {
    expect(INDIAN_SPIRES.length).toBeGreaterThanOrEqual(3);
    expect(INDIAN_SPIRES.length).toBeLessThanOrEqual(5);
    const skyline = Math.max(...towers('indian').map((t) => t.tw.h));
    for (const s of INDIAN_SPIRES) {
      const tw = blockTower(s.I, s.J);
      expect(tw.d).toBe('indian');
      expect(tw.shape).toBe('plaza');
      expect(railCeiling(s.I, s.J)).toBe(Number.POSITIVE_INFINITY);
      expect(BUILDING_SPOTS.some((b) => b.I === s.I && b.J === s.J)).toBe(false);
      expect(s.I === 0 || s.I === -1).toBe(false);
      // Well above the quarter's skyline, ten under the high currents' lowest (142), far under the
      // stations (200 and up) and under every ring set over it.
      expect(s.top).toBeGreaterThan(skyline + 20);
      expect(s.top).toBeLessThanOrEqual(132);
      expect(s.top).toBeLessThan(STATION_LOW - 60);
      const { r } = spireStretch(s);
      const x = (s.I + 0.5) * BLOCK_X;
      const z = (s.J + 0.5) * BLOCK_Z;
      for (const R of ringSets()) {
        const far = Math.hypot(R.c[0] - x, R.c[2] - z) > r + Math.max(...R.radii) + 5;
        if (!far) expect(R.c[1] - Math.max(...R.radii)).toBeGreaterThan(G + s.top + 10);
      }
      // Ten under any big ship flying over it.
      for (const O of OUTLIERS) {
        if (O.axis !== 2) continue;
        if (Math.abs(O.off - x) < r + O.len / 2 + 2) expect(s.top + 10, O.name).toBeLessThan(O.y);
      }
      for (const o of [...INDIAN_SPIRES, ...BUILDING_SPOTS.filter((b) => b.d === 'indian')]) {
        if (o === s) continue;
        expect(Math.hypot((o.I - s.I) * BLOCK_X, (o.J - s.J) * BLOCK_Z)).toBeGreaterThan(55);
      }
    }
  });

  it('draws them from far off, finite and mellow', () => {
    const s = INDIAN_SPIRES[0] as (typeof INDIAN_SPIRES)[number];
    const eye: Vec3 = [(s.I + 0.5) * BLOCK_X, G + 30, (s.J + 0.5) * BLOCK_Z + 260];
    const out: Item[] = [];
    aliveItems(eye, 3, 160, 400, blockTower, all, out);
    const tall = out.filter((it) => it.count === SPIRE_SITES);
    expect(tall.length).toBeGreaterThan(0);
    let top = Number.NEGATIVE_INFINITY;
    for (const it of tall)
      for (const p of sites(it, SPIRE_SITES)) {
        for (const v of p) expect(Number.isFinite(v)).toBe(true);
        top = Math.max(top, p[1] as number);
        expect(Math.max(p[3] as number, p[4] as number, p[5] as number)).toBeLessThan(1.5);
      }
    expect(top).toBeGreaterThan(G + 90);
  });
});

describe('alive quarters: sky bridges and walkways at height', () => {
  const bridges = (): SkyBridge[] => {
    const out: SkyBridge[] = [];
    for (let I = -TILE_I / 2; I < TILE_I / 2; I++)
      for (let J = 0; J < 56; J++) {
        const A = blockTower(I, J);
        skyBridges(A, blockTower(I + 1, J), 0, out);
        skyBridges(A, blockTower(I, J + 1), 2, out);
      }
    return out;
  };

  it('joins many towers across both kinds of street, at several heights, under both roofs', () => {
    const bs = bridges();
    expect(bs.length).toBeGreaterThan(60);
    expect(bs.some((b) => b.axis === 0)).toBe(true);
    expect(bs.some((b) => b.axis === 2)).toBe(true);
    expect(new Set(bs.map((b) => b.y)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(bs.map((b) => b.d)).size).toBeGreaterThanOrEqual(5);
    for (const b of bs) {
      expect(laneFree(b.y - G)).toBe(true);
      expect(laneFree(b.y - G + 2.4)).toBe(true);
      expect(b.b - b.a).toBeGreaterThanOrEqual(4);
    }
  });

  it('spans wall to wall, its deck where both towers stand', () => {
    for (const b of bridges().slice(0, 40)) {
      const S = skyBridgeSet(b);
      const o = [0, 0, 0];
      let lo = Number.POSITIVE_INFINITY;
      let hi = Number.NEGATIVE_INFINITY;
      for (let s = 0; s < S.count; s++) {
        strokePoint(S, s, 0, 0, o);
        const along = b.axis === 0 ? (o[0] as number) : (o[2] as number);
        lo = Math.min(lo, along);
        hi = Math.max(hi, along);
        // Nothing hangs below its arch or over its tube.
        expect(o[1]).toBeGreaterThan(b.y - 2.5);
        expect(o[1]).toBeLessThan(b.y + 2.5);
      }
      expect(lo).toBeLessThan(b.a + 0.6);
      expect(hi).toBeGreaterThan(b.b - 0.6);
    }
  });
});

describe('alive quarters: hanging lights across the streets', () => {
  it('hangs them in the quarters that had none, never Chinatown’s or the Indian quarter’s', () => {
    const hs: Hang[] = [];
    for (let I = -TILE_I / 2; I < TILE_I / 2; I++)
      for (let J = 0; J < 56; J++) hangsBetween(blockTower(I, J), blockTower(I + 1, J), hs);
    const qs = new Set(hs.map((h) => h.d));
    expect(qs.size).toBeGreaterThanOrEqual(6);
    expect(qs.has('chinatown')).toBe(false);
    expect(qs.has('indian')).toBe(false);
    for (const h of hs.slice(0, 60)) {
      const S = hangSet(h);
      const o = [0, 0, 0];
      for (let s = 0; s < S.count; s++) {
        strokePoint(S, s, 0, 0, o);
        // Over the street channels (5, 11) by four at least, under the cable.
        expect(o[1]).toBeGreaterThan(G + 11.6 + LANE_CLEAR);
        expect(o[1]).toBeGreaterThan(h.y - HANG_DROP - 2.2);
        expect(o[1]).toBeLessThan(h.y + 0.6);
      }
    }
  });
});

describe('alive quarters: highways over the low roofs', () => {
  const roof = (x: number, z: number) => {
    const tw = blockTower(Math.floor(x / BLOCK_X), Math.floor(z / BLOCK_Z));
    if (tw.shape === 'studio' && tw.studio) return studioBlockHeight(tw.studio);
    if (tw.shape === 'design' && tw.design) return tw.design.h;
    return tw.h;
  };

  it('flies just over the low roofs, every lane of a highway one way, three abreast', () => {
    expect(SKY_STREAMS.length).toBeGreaterThanOrEqual(9);
    for (let i = 0; i < SKY_STREAMS.length; i += 3) {
      const lanes = SKY_STREAMS.slice(i, i + 3);
      expect(new Set(lanes.map((S) => S.sgn)).size).toBe(1);
      expect(new Set(lanes.map((S) => S.y)).size).toBe(1);
      expect((lanes[1]?.c as number) - (lanes[0]?.c as number)).toBeCloseTo(SKY_LANE_GAP, 6);
    }
    for (const S of SKY_STREAMS) {
      let top = 0;
      for (let z = S.s0; z <= S.s1; z += 2)
        for (const dx of [-4, 0, 4]) top = Math.max(top, roof(S.c + dx, z));
      // Over every roof by six, and no higher than forty over the highest (or threading the gates
      // of the Temple skyscrapers, lib/city-skyscrapers.ts, whose blocks round them are open).
      expect(S.y).toBeGreaterThan(top + 6);
      const gates = TEMPLE_TOWERS.some(
        (T) => Math.abs(T.x - S.c) < T.r && T.voids.some((v) => v.y0 < S.y && v.y1 > S.y),
      );
      if (!gates) expect(S.y).toBeLessThan(top + 40);
      // Each ship moves on the highway's way.
      const a = marketShip(S, 2, 10);
      const b = marketShip(S, 2, 10.1);
      if (Math.abs(b.s - a.s) < 10) expect(Math.sign(b.s - a.s)).toBe(S.sgn);
    }
  });

  it('keeps clear of the street lanes, the big ships, the high currents and the stations', () => {
    for (const S of SKY_STREAMS) {
      expect(laneFree(S.y)).toBe(true);
      for (const O of OUTLIERS) {
        if (O.axis !== 2) continue;
        const x = wrap(O.off + 156, 312) - 156;
        if (Math.abs(x - S.c) < O.len) expect(Math.abs(O.y - S.y)).toBeGreaterThan(10);
      }
      expect(S.y).toBeLessThan(142 - 20);
      expect(S.y).toBeLessThan(STATION_LOW);
      // Off the avenue, over the blocks: not down a street's line.
      const nx = Math.abs(S.c - Math.round(S.c / BLOCK_X) * BLOCK_X);
      expect(nx).toBeGreaterThan(8);
    }
  });
});

describe('alive quarters: nothing in the lanes, within budget, mellow', () => {
  it('leaves every street channel’s lane clear: gates, banners, signs, bridges, lights, plazas', () => {
    for (const eye of EYES) {
      const out: Item[] = [];
      aliveItems(eye, 5, 160, 400, blockTower, all, out, [
        { x: 78, z: 12 * BLOCK_Z, d: 'oriental' },
        { x: -78, z: 28 * BLOCK_Z, d: 'golden' },
      ]);
      for (const it of out) {
        // The spires and the highways stand over the blocks; the highways are lanes themselves.
        if (it.count === SPIRE_SITES || it.weight === 1.8) continue;
        for (const p of sites(it, 6000))
          expect(inLane(p), `${p.map((v) => v.toFixed(1))}`).toBe(false);
      }
    }
  });

  it('spends a modest budget: finite sites, no item over 4,000, a few tens of thousands in all', () => {
    for (const eye of EYES) {
      const out: Item[] = [];
      aliveItems(eye, 5, 160, 400, blockTower, all, out);
      const total = out.reduce((s, it) => s + it.count, 0);
      expect(total).toBeLessThan(60000);
      for (const it of out) {
        expect(it.count).toBeLessThanOrEqual(4000);
        expect(Number.isFinite(it.d)).toBe(true);
      }
    }
  });

  it('drifts slowly: nothing jumps or flashes between two frames', () => {
    const eye = EYES[0] as Vec3;
    const a: Item[] = [];
    const b: Item[] = [];
    aliveItems(eye, 20, 160, 400, blockTower, all, a);
    aliveItems(eye, 20 + 1 / 60, 160, 400, blockTower, all, b);
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      const A = a[i] as Item;
      const B = b[i] as Item;
      if (A.weight === 1.8 || A.count === SPIRE_SITES) continue; // the ships move on; the spires turn to the eye
      const pa = sites(A, 400);
      const pb = sites(B, 400);
      for (let s = 0; s < Math.min(pa.length, pb.length); s++) {
        const p = pa[s] as number[];
        const q = pb[s] as number[];
        for (let c = 3; c < 6; c++)
          expect(Math.abs((p[c] as number) - (q[c] as number))).toBeLessThan(0.05);
      }
    }
  });
});
