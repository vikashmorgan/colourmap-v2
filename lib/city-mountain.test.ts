/*
 * The Mountain quarter (docs/specs/art-city.md, "Mountain and Favela quarters"), 2026-11-14: "add
 * the mountain and favela above, so the city becomes more square", and "draw the mountains NOT as
 * scattered dots but as TOPO LINES, contour lines like a topographic map".
 */
import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { ANNEX_X } from './city-annex';
import { GROUND, type Item, mixId, STRIP_X, TILE_X, TILE_Z } from './city-grid';
import {
  CABLE_STATIONS,
  CABLES,
  CAR_DROP,
  CAR_SPEED,
  CARS_PER_CABLE,
  CONTOUR,
  cableCarAt,
  cableLength,
  cablePoint,
  footR,
  INDEX_EVERY,
  MOUNTAIN_Z1,
  mountainGeo,
  mountainHeight,
  mountainItems,
  mountainSolid,
  PEAKS,
  peakHeight,
  STAIR_FLIGHT,
  TEMPLE_H,
  TEMPLES,
} from './city-mountain';
import { RIVER_W } from './city-rain';

const sites = (items: Item[], step = 1) => {
  const out: number[][] = [];
  for (const it of items)
    for (let s = 0; s < it.count; s += step) {
      const o = [0, 0, 0, 0, 0, 0];
      if (it.site(s, o)) out.push(o);
    }
  return out;
};
/** A world point brought back to the annex's frame. */
const local = (x: number, z: number): [number, number] => [
  (((x - STRIP_X / 2) % TILE_X) + TILE_X) % TILE_X,
  ((z % TILE_Z) + TILE_Z) % TILE_Z,
];
/** An eye in the Mountain quarter's valley, on the river's bank, looking up it (−z). */
const VALLEY: Vec3 = [STRIP_X / 2 + 150, GROUND + 40, MOUNTAIN_Z1 - 10];

describe('the Mountain quarter: peaks as a cheap height field', () => {
  it('stands its peaks inside the annex, clear of the strip and the river, none over 128', () => {
    expect(PEAKS.length).toBeGreaterThanOrEqual(6);
    for (const p of PEAKS) {
      expect(p.h).toBeLessThanOrEqual(128);
      for (let a = 0; a < Math.PI * 2; a += 0.05) {
        const r = footR(p, a);
        expect(r).toBeLessThan(1.2 * p.r);
        const x = p.x + Math.cos(a) * r;
        const z = p.z + Math.sin(a) * r;
        expect(x).toBeGreaterThan(-10);
        expect(x).toBeLessThan(ANNEX_X - 5);
        expect(z).toBeGreaterThan(0);
        expect(z).toBeLessThan(MOUNTAIN_Z1 - RIVER_W);
      }
    }
  });

  it('rises from nothing at the foot to the summit, steadily up every ray', () => {
    for (const p of PEAKS) {
      // Its summit, or the plateau its summit temple stands on.
      expect(peakHeight(p, p.x, p.z)).toBeCloseTo(p.top, 6);
      expect(p.top).toBeLessThanOrEqual(p.h);
      expect(mountainHeight(p.x, p.z)).toBeGreaterThanOrEqual(p.top - 1e-9);
      for (let a = 0; a < Math.PI * 2; a += 0.7) {
        let last = Number.POSITIVE_INFINITY;
        for (let e = 0; e < footR(p, a) + 4; e += 2) {
          const h = peakHeight(p, p.x + Math.cos(a) * e, p.z + Math.sin(a) * e);
          expect(h).toBeLessThanOrEqual(last + 1e-9);
          last = h;
        }
        expect(peakHeight(p, p.x + Math.cos(a) * 1.21 * p.r, p.z + Math.sin(a) * 1.21 * p.r)).toBe(
          0,
        );
      }
    }
  });

  it('is solid inside a peak and clear in the valleys and over the summits', () => {
    for (const p of PEAKS) {
      expect(mountainSolid(p.x, p.h * 0.5, p.z, 1.2)).toBe(true);
      expect(mountainSolid(p.x + p.r * 0.3, 2, p.z, 1.2)).toBe(true);
      // Over the summit and its temple or station, clear.
      expect(mountainSolid(p.x, p.h + TEMPLE_H + 8, p.z, 1.2)).toBe(false);
    }
    // Off the slopes the street is the floor: the valley up from the river is open.
    for (let z = MOUNTAIN_Z1 - 20; z > 560; z -= 5)
      expect(mountainSolid(150, 34, z, 1.2)).toBe(false);
  });
});

describe('the Mountain quarter: topographic lines', () => {
  it('rings every peak with a contour at every CONTOUR of height, every fifth an index ring', () => {
    const G = mountainGeo();
    expect(mountainGeo()).toBe(G);
    PEAKS.forEach((p, pi) => {
      const rings = G.rings.filter((r) => r.p === pi);
      expect(rings.length).toBe(Math.ceil((p.top - 2) / CONTOUR) - 1);
      rings.forEach((r, i) => {
        expect(r.L).toBe((i + 1) * CONTOUR);
        expect(r.index).toBe((i + 1) % INDEX_EVERY === 0);
      });
    });
  });

  it('lays every grain of a ring on its contour line, not over the slopes, hidden under a higher one', () => {
    const G = mountainGeo();
    let total = 0;
    for (const r of G.rings) {
      for (let s = 0; s < r.n; s++) {
        const i = (r.start + s) * 3;
        const x = G.pts[i] as number;
        const y = G.pts[i + 1] as number;
        const z = G.pts[i + 2] as number;
        expect(y).toBe(r.L);
        // On its own peak's contour, and no neighbour's slope stands over it.
        expect(Math.abs(peakHeight(PEAKS[r.p] as (typeof PEAKS)[number], x, z) - r.L)).toBeLessThan(
          0.05,
        );
        expect(mountainHeight(x, z)).toBeLessThanOrEqual(r.L + 0.6);
        total++;
      }
      // Points close along the line: a drawn curve, never a scatter.
      for (let s = 1; s < r.n; s++) {
        const a = (r.start + s - 1) * 3;
        const b = (r.start + s) * 3;
        const gap = Math.hypot(
          (G.pts[a] as number) - (G.pts[b] as number),
          (G.pts[a + 2] as number) - (G.pts[b + 2] as number),
        );
        if (gap > 3) continue; // where a ring passes under a neighbour's slope
        expect(gap).toBeLessThan(2);
      }
    }
    expect(total).toBeGreaterThan(5000);
  });

  it('draws the rings from the valley, their grains on the contours, in the Data Peak ramp, softly', () => {
    const out: Item[] = [];
    mountainItems(VALLEY, [0, 0, -1], 30, 400, out);
    expect(out.length).toBeGreaterThan(40);
    const pts = sites(out, 3);
    expect(pts.length).toBeGreaterThan(2000);
    let onLine = 0;
    let rings = 0;
    for (const o of pts) {
      expect(o.every(Number.isFinite)).toBe(true);
      for (const c of [3, 4, 5]) {
        expect(o[c]).toBeGreaterThanOrEqual(0);
        expect(o[c]).toBeLessThanOrEqual(1);
      }
      const [ax, lz] = local(o[0] as number, o[2] as number);
      const y = (o[1] as number) - GROUND;
      // A contour grain stands on a multiple of CONTOUR, right on the slope there.
      if (Math.abs(y / CONTOUR - Math.round(y / CONTOUR)) < 1e-6 && y > 0) {
        rings++;
        if (Math.abs(mountainHeight(ax, lz) - y) < 0.7) onLine++;
      }
    }
    expect(rings).toBeGreaterThan(1000);
    expect(onLine / rings).toBeGreaterThan(0.98);
    // Mellow: a frame later no colour moves by 0.01.
    const a: Item[] = [];
    const b: Item[] = [];
    mountainItems(VALLEY, [0, 0, -1], 30, 400, a);
    mountainItems(VALLEY, [0, 0, -1], 30 + 1 / 60, 400, b);
    const ring = a.findIndex((it) => it.count > 100);
    const o1 = [0, 0, 0, 0, 0, 0];
    const o2 = [0, 0, 0, 0, 0, 0];
    for (let s = 0; s < (a[ring] as Item).count; s += 7) {
      (a[ring] as Item).site(s, o1);
      (b[ring] as Item).site(s, o2);
      for (const c of [3, 4, 5])
        expect(Math.abs((o1[c] as number) - (o2[c] as number))).toBeLessThan(0.01);
    }
  });

  it('draws nothing when the mountains are out of reach or behind', () => {
    const far: Item[] = [];
    // From the Favela's middle, the Mountain quarter 600 off either way along the tile.
    mountainItems([STRIP_X / 2 + 150, GROUND + 40, 1360], [0, 0, -1], 0, 300, far);
    expect(far.length).toBe(0);
    // Just past the river, facing away from the mountains behind.
    mountainItems([STRIP_X / 2 + 150, GROUND + 40, MOUNTAIN_Z1 + 20], [0, 0, 1], 0, 300, far);
    expect(far.length).toBe(0);
  });
});

describe('the Mountain quarter: temples, stairs and cable cars', () => {
  it('stands temples on four summits and on a ledge of each other peak, solid', () => {
    expect(TEMPLES).toHaveLength(PEAKS.length);
    expect(TEMPLES.filter((T) => T.kind === 'summit')).toHaveLength(4);
    expect(TEMPLES.filter((T) => T.kind === 'ledge')).toHaveLength(4);
    TEMPLES.forEach((T, i) => {
      const p = PEAKS[i] as (typeof PEAKS)[number];
      // On its slope: the ground under it about its platform's height.
      expect(Math.abs(mountainHeight(T.x, T.z) - T.y)).toBeLessThan(3);
      if (T.kind === 'ledge') {
        expect(T.y).toBeGreaterThan(p.h * 0.3);
        expect(T.y).toBeLessThan(p.h * 0.7);
        // Turned toward the strip.
        expect(T.x).toBeLessThan(p.x);
      }
      expect(mountainSolid(T.x, T.y + TEMPLE_H / 2, T.z, 1.2)).toBe(true);
      expect(T.y + TEMPLE_H).toBeLessThan(142);
    });
    const out: Item[] = [];
    mountainItems(VALLEY, [0, 0, -1], 3, 900, out);
    const temples = out.filter((it) => it.count === 136);
    expect(temples.length).toBeGreaterThanOrEqual(4);
    for (const it of temples) expect(sites([it]).length).toBe(136);
  });

  it('climbs a long stairway from the foot of each temple’s peak up to its platform', () => {
    const G = mountainGeo();
    expect(G.stairs).toHaveLength(TEMPLES.length);
    for (const st of G.stairs) {
      const T = TEMPLES[st.temple] as (typeof TEMPLES)[number];
      expect(st.n).toBeGreaterThan(40);
      const at = (m: number) => {
        const i = (st.start + m) * 5;
        return [G.steps[i], G.steps[i + 1], G.steps[i + 2]] as number[];
      };
      const first = at(0);
      const last = at(st.n - 1);
      expect(first[1] as number).toBeLessThan(3);
      expect(Math.abs((last[1] as number) - T.y)).toBeLessThan(4);
      expect(Math.hypot((last[0] as number) - T.x, (last[2] as number) - T.z)).toBeLessThan(
        T.s + 3,
      );
      for (let m = 1; m < st.n; m++) {
        const a = at(m - 1);
        const b = at(m);
        const step = Math.hypot(
          (b[0] as number) - (a[0] as number),
          (b[2] as number) - (a[2] as number),
        );
        expect(step).toBeGreaterThan(0.9);
        expect(step).toBeLessThan(1.3);
        // On the slope, a little over it; its last flight rising off it onto the platform.
        const ground = Math.min(mountainHeight(b[0] as number, b[2] as number), T.y) + 0.25;
        expect(b[1] as number).toBeGreaterThanOrEqual(ground - 1e-3);
        if (m < st.n - STAIR_FLIGHT - 2)
          expect(Math.abs((b[1] as number) - ground)).toBeLessThan(1e-3);
      }
    }
  });

  it('hangs its cables clear of every slope, station to station', () => {
    expect(CABLES.length).toBeGreaterThanOrEqual(4);
    CABLES.forEach(([a, b], c) => {
      const A = CABLE_STATIONS[a] as (typeof CABLE_STATIONS)[number];
      const B = CABLE_STATIONS[b] as (typeof CABLE_STATIONS)[number];
      const p0 = cablePoint(c, 0);
      const p1 = cablePoint(c, 1);
      expect([p0[0], p0[1], p0[2]]).toEqual([A.x, A.head, A.z]);
      expect([p1[0], p1[1], p1[2]]).toEqual([B.x, B.head, B.z]);
      for (let s = 0; s <= 1; s += 0.01)
        for (const side of [-1, 1]) {
          const p = cablePoint(c, s, side);
          // A cabin hanging under it clears the ground there by three or more.
          expect(p[1] - CAR_DROP - 1 - mountainHeight(p[0], p[2])).toBeGreaterThan(3);
        }
    });
  });

  it('moves the cabins slowly along their cables, up one rope and down the other', () => {
    CABLES.forEach((_, c) => {
      const len = cableLength(c);
      for (let k = 0; k < CARS_PER_CABLE; k++) {
        const a = cableCarAt(c, k, 10);
        const b = cableCarAt(c, k, 11);
        // Hanging under its rope, on it.
        const rope = cablePoint(c, a.s, a.side);
        expect(a.c[0]).toBeCloseTo(rope[0], 9);
        expect(a.c[1]).toBeCloseTo(rope[1] - CAR_DROP, 9);
        expect(a.c[2]).toBeCloseTo(rope[2], 9);
        expect(a.side).toBe(k % 2 === 0 ? 1 : -1);
        // Moving along it, the way its rope runs, at a slow steady pace.
        const ds = b.s - a.s;
        if (Math.abs(ds) < 0.5) {
          expect(Math.sign(ds)).toBe(a.side);
          expect(Math.abs(ds) * len).toBeCloseTo(CAR_SPEED, 6);
        }
        expect(Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1], b.c[2] - a.c[2])).toBeLessThan(3);
        // The same moment, the same place.
        expect(cableCarAt(c, k, 10)).toEqual(a);
      }
    });
    // Drawn near: each cabin's lit windows and frame.
    const out: Item[] = [];
    mountainItems([STRIP_X / 2 + 40, GROUND + 60, 200], [0, 0, -1], 5, 600, out);
    const cars = new Set(
      CABLES.flatMap((_, c) =>
        Array.from({ length: CARS_PER_CABLE }, (_, k) => mixId(c * 16 + k, 73700)),
      ),
    );
    const drawn = out.filter((it) => cars.has(it.gid));
    expect(drawn.length).toBeGreaterThan(4);
    for (const it of drawn) expect(sites([it]).length).toBe(40);
  });
});
