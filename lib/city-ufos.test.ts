import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { blocked } from './city-game';
import { BLOCK_X, GROUND, type Item, TILE_X, TILE_Z } from './city-grid';
import { PARCOURS_LOW, PARCOURS_R, ringSets, setCentre } from './city-rings';
import { STATIONS, stationCentre, stationModel } from './city-stations';
import { ARCH_PIER, ARCH_Z } from './city-symbols';
import {
  BIG_LOOPS,
  bigUfoAt,
  DASH_SHARE,
  darterAt,
  darterLine,
  darterOf,
  HOP,
  PATROL,
  SMALL_DRAWN,
  UFO_DESIGNS,
  UFO_MAX,
  ufoDesign,
  ufoItems,
  ufoSite,
} from './city-ufos';

/*
 * 2026-11-15: "more cool unique UFOs like the current circular orange ones, some bigger UFO ones
 * that fly around the city ... They are awesome."
 */

const o = [0, 0, 0, 0, 0, 0];
/** Every grain of design D flying at c along f at time t (n of them, spread over it). */
function grains(id: (typeof UFO_DESIGNS)[number]['id'], c: Vec3, f: Vec3, t: number, n: number) {
  const D = ufoDesign(id);
  const out: { p: Vec3; rgb: Vec3 }[] = [];
  for (let s = 0; s < n; s++) {
    ufoSite(D, (s + 0.5) / n, (s * 0.618) % 1, c, f, 0.2, t, 1, 1, o);
    out.push({ p: [o[0], o[1], o[2]] as Vec3, rgb: [o[3], o[4], o[5]] as Vec3 });
  }
  return out;
}

describe('UFOs: the family', () => {
  it('has six or more designs of its own, some big (several times the small ones), some small', () => {
    expect(UFO_DESIGNS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(UFO_DESIGNS.map((d) => d.id)).size).toBe(UFO_DESIGNS.length);
    expect(new Set(UFO_DESIGNS.map((d) => d.name)).size).toBe(UFO_DESIGNS.length);
    const big = UFO_DESIGNS.filter((d) => d.big);
    const small = UFO_DESIGNS.filter((d) => !d.big);
    expect(big.length).toBeGreaterThanOrEqual(2);
    expect(small.length).toBeGreaterThanOrEqual(4);
    const most = Math.max(...small.map((d) => d.size));
    for (const d of big) expect(d.size).toBeGreaterThan(4 * most);
    // In the spirit of the orange ones: every hull warm (red over blue).
    for (const d of UFO_DESIGNS) expect(d.body[0]).toBeGreaterThan(d.body[2] * 1.5);
  });

  it('draws each design round its middle, within its size, finite, mellow, and moving slowly', () => {
    for (const D of UFO_DESIGNS) {
      const c: Vec3 = [10, GROUND + 60, 20];
      const a = grains(D.id, c, [0, 0, 1], 5, D.sites);
      const b = grains(D.id, c, [0, 0, 1], 5 + 1 / 60, D.sites);
      for (let i = 0; i < a.length; i++) {
        const g = a[i] as (typeof a)[number];
        expect([...g.p, ...g.rgb].every(Number.isFinite)).toBe(true);
        expect(Math.hypot(g.p[0] - c[0], g.p[2] - c[2])).toBeLessThan(D.size * 1.3);
        expect(Math.abs(g.p[1] - c[1])).toBeLessThan(D.size * 0.9);
        expect(Math.max(...g.rgb)).toBeLessThanOrEqual(UFO_MAX + 1e-9);
        // A frame apart, no colour jumps: light is mellow.
        const h = b[i] as (typeof b)[number];
        for (let k = 0; k < 3; k++)
          expect(Math.abs((g.rgb[k] as number) - (h.rgb[k] as number))).toBeLessThan(0.05);
      }
      // Each has more than one part lit: hull, accent, lights.
      expect(new Set(a.map((g) => g.rgb.map((v) => v.toFixed(1)).join())).size).toBeGreaterThan(2);
    }
  });
});

describe('UFOs: the big ones', () => {
  it('drift slowly on long loops stretched along the city', () => {
    for (const B of BIG_LOOPS) {
      expect(ufoDesign(B.id).big).toBe(true);
      expect(B.rz).toBeGreaterThan(8 * B.rx);
      expect(B.speed).toBeLessThan(8);
      const a = bigUfoAt(B, 100).c;
      const b = bigUfoAt(B, 101).c;
      expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeLessThan(8.5);
    }
  });

  it('stay clear of every station, ring set, the parcours and every solid roof, all the way round', () => {
    const sets = ringSets();
    for (const B of BIG_LOOPS) {
      const D = ufoDesign(B.id);
      const R = Math.sqrt((B.rx * B.rx + B.rz * B.rz) / 2);
      const lap = (6.3 * R) / B.speed;
      for (let t = 0; t < lap; t += lap / 90) {
        const { c, f } = bigUfoAt(B, t);
        for (const g of grains(B.id, c, f, t, 36)) {
          const [x, y, z] = g.p;
          expect(y).toBeLessThan(PARCOURS_LOW - PARCOURS_R - 20);
          for (const st of STATIONS) {
            const M = stationModel(st);
            const sc = stationCentre(st, t);
            const apart = Math.hypot(x - sc[0], z - sc[2]) > M.r + 6;
            const under = y < sc[1] + M.lo - 6;
            expect(apart || under).toBe(true);
          }
          // Every ring of every set: the grain 6 or more from each ring's circle.
          for (const S of sets) {
            const sc = setCentre(S, t);
            const d: Vec3 = [x - sc[0], y - sc[1], z - sc[2]];
            const along = d[0] * S.n[0] + d[1] * S.n[1] + d[2] * S.n[2];
            const radial = Math.hypot(
              d[0] - along * S.n[0],
              d[1] - along * S.n[1],
              d[2] - along * S.n[2],
            );
            for (const r of S.radii) expect(Math.hypot(along, radial - r)).toBeGreaterThan(6);
          }
          // Off the Temple skyscrapers and every roof: open air.
          expect(blocked([x, y, z])).toBe(false);
          expect(blocked([x + TILE_X, y, z + TILE_Z])).toBe(false);
        }
        expect(Math.abs(c[0]) + D.size).toBeLessThanOrEqual(64);
      }
    }
  }, 90_000);
});

describe('UFOs and the Great Arch (lib/city-symbols.ts, 2026-11-14)', () => {
  it('turns the big ones short of the arch’s row, and keeps the small ones off its piers', () => {
    for (const B of BIG_LOOPS) {
      const D = ufoDesign(B.id);
      expect(B.cz - B.rz - D.size).toBeGreaterThan(ARCH_Z + ARCH_PIER.hz + 4);
      expect(B.cz + B.rz + D.size).toBeLessThan(TILE_Z + ARCH_Z - ARCH_PIER.hz - 4);
    }
    for (const li of [-2, -1, 1, 2]) {
      const cell = Math.floor(ARCH_Z / PATROL);
      const dr = darterOf(li, cell);
      if (!dr) continue;
      for (let t = 0; t < 30; t += 0.7) {
        const a = darterAt(li, cell, dr.key, t);
        expect(Math.abs(Math.abs(a.c[0]) - ARCH_PIER.x) > ARCH_PIER.hx + dr.design.size).toBe(true);
      }
    }
  });
});

describe('UFOs: the small ones dart round the quarters', () => {
  it('patrol the wide boulevards and corridors, darting then hovering, inside their stretch', () => {
    expect(darterLine(0)).toBe(false);
    expect(darterLine(2) && darterLine(3) && darterLine(-4)).toBe(true);
    let found = 0;
    for (let li = -6; li <= 6; li++)
      for (let cell = 0; cell < 14; cell++) {
        const dr = darterOf(li, cell);
        if (!dr) continue;
        found++;
        expect(dr.design.big).toBe(false);
        for (let t = 0; t < 40; t += 0.5) {
          const a = darterAt(li, cell, dr.key, t);
          expect(a.c[2]).toBeGreaterThanOrEqual(cell * PATROL);
          expect(a.c[2]).toBeLessThanOrEqual((cell + 1) * PATROL);
          expect(Math.abs(a.c[0] - li * BLOCK_X)).toBeLessThan(1);
        }
      }
    expect(found).toBeGreaterThan(14);
    // A hop: fast in the dash, still in the hover.
    const dr = (() => {
      for (let cell = 0; cell < 14; cell++) {
        const d = darterOf(2, cell) ?? darterOf(-2, cell) ?? darterOf(4, cell);
        if (d) return { d, cell, li: darterOf(2, cell) ? 2 : darterOf(-2, cell) ? -2 : 4 };
      }
      throw new Error('no darter');
    })();
    const speeds: number[] = [];
    for (let t = 0; t < HOP * 4; t += 0.05)
      speeds.push(darterAt(dr.li, dr.cell, dr.d.key, t).speed);
    expect(Math.max(...speeds)).toBeGreaterThan(20);
    expect(speeds.filter((v) => v === 0).length / speeds.length).toBeGreaterThan(
      (1 - DASH_SHARE) * 0.9,
    );
  });

  it('never puts a grain inside a building along their paths', () => {
    for (let li = -6; li <= 6; li++)
      for (let cell = 0; cell < 14; cell++) {
        const dr = darterOf(li, cell);
        if (!dr) continue;
        for (let t = 0; t < 30; t += 1.3) {
          const a = darterAt(li, cell, dr.key, t);
          for (const g of grains(dr.design.id, a.c, a.f, t, 24)) {
            expect(blocked(g.p)).toBe(false);
          }
        }
      }
  });
});

describe('UFOs: drawn near the eye, within a budget', () => {
  it('gives a few items, the small ones near and the big ones far, every site finite and mellow', () => {
    let sawBig = false;
    let sawSmall = false;
    for (const eye of [
      [0, GROUND + 30, 600],
      [78, GROUND + 25, 1200],
      [-52, GROUND + 140, 300],
    ] as Vec3[]) {
      for (const t of [10, 200, 900]) {
        const out: Item[] = [];
        ufoItems(eye, [0, 0, 1], t, out);
        ufoItems(eye, [0, 0, -1], t, out);
        const small = out.filter((it) => it.count < 200);
        const big = out.filter((it) => it.count >= 200);
        sawBig ||= big.length > 0;
        sawSmall ||= small.length > 0;
        expect(small.length).toBeLessThanOrEqual(2 * SMALL_DRAWN);
        expect(out.reduce((s, it) => s + it.count, 0)).toBeLessThan(2 * 3500);
        for (const it of out) {
          for (let s = 0; s < it.count; s += 7) {
            expect(it.site(s, o)).toBe(true);
            expect(o.every(Number.isFinite)).toBe(true);
            expect(Math.max(o[3], o[4], o[5])).toBeLessThanOrEqual(UFO_MAX + 1e-9);
          }
        }
      }
    }
    expect(sawBig).toBe(true);
    expect(sawSmall).toBe(true);
  });
});
