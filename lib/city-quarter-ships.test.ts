import { describe, expect, it } from 'vitest';

import type { RGB, Vec3 } from './bigbang';
import { isQuarterShip, quarterEdge, streamShip } from './city-currents';
import { DISTRICTS, type DistrictId, districtAt } from './city-game';
import { TILE_X, TILE_Z } from './city-grid';
import {
  DRONES,
  droneAt,
  HOMES,
  homesNear,
  QUARTER_DESIGNS,
  quarterColour,
  quarterGrain,
  quarterShipGrain,
} from './city-quarter-ships';

/*
 * 2026-11-14: "also make some unique ships or drones for each quarter." And: "a few unique ships
 * become part of the quarter. this doesn't mean only those."
 */

const IDS = Object.keys(DISTRICTS) as DistrictId[];
const cosine = (a: RGB, b: RGB) =>
  (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b));

describe('Quarter ships: a design of our own for every quarter', () => {
  it('gives every district its own design, named, each a different shape', () => {
    const names = new Set<string>();
    const shapes = new Set<string>();
    for (const d of IDS) {
      const D = QUARTER_DESIGNS[d];
      expect(D.district).toBe(d);
      names.add(D.name);
      const sig = Array.from({ length: 24 }, (_, s) => {
        const g = quarterGrain(d, (s + 0.5) / 24, ((s * 0.37) % 1) + 0.01, 0);
        return `${g.a.toFixed(2)},${g.b.toFixed(2)},${g.h.toFixed(2)}`;
      }).join('|');
      shapes.add(sig);
    }
    expect(names.size).toBe(IDS.length);
    expect(shapes.size).toBe(IDS.length);
  });

  it('keeps every grain in its quarter’s colour family, leaning slowly', () => {
    for (const d of IDS) {
      const base = DISTRICTS[d].colour;
      for (const part of [0, 1, 2] as const) {
        for (let t = 0; t < 120; t += 3.7) {
          const c = quarterColour(d, part, t, 1.3);
          expect(cosine(c, base)).toBeGreaterThan(0.88);
          const c2 = quarterColour(d, part, t + 1 / 60, 1.3);
          expect(Math.max(...c.map((v, i) => Math.abs(v - (c2[i] as number))))).toBeLessThan(0.01);
        }
      }
    }
  });

  it('keeps each design about its own length, light never over its colour', () => {
    for (const d of IDS) {
      for (let q = 0; q < 1; q += 0.013) {
        const s = quarterShipGrain(d, q, (q * 3.1) % 1, [0, 50, 0], [0, 0, -1], 2, 4, 0, 1);
        expect(Math.hypot(...s.pos.map((v, i) => v - ([0, 50, 0][i] as number)))).toBeLessThan(
          2 * 2,
        );
        expect(Math.max(...s.rgb)).toBeLessThanOrEqual(0.62);
      }
    }
  });

  it('flies each quarter’s own ships among the general ships in its own streets', () => {
    const seen = new Set<DistrictId>();
    let quarter = 0;
    let all = 0;
    const n = 120;
    for (let cz = 0; cz < TILE_Z; cz += 150) {
      for (const cx of [-140, -60, 0, 60, 140]) {
        for (let j = 0; j < n; j++) {
          const s = streamShip(j, n, cx, cz, 17);
          if (s.k <= 0.5) continue;
          all++;
          if (!isQuarterShip(s)) continue;
          quarter++;
          // In the middle of its quarter it shows; at the quarter's edge it fades.
          if (quarterEdge(s.F, s.head) > 14) seen.add(districtAt(s.head[0], s.head[2]));
        }
      }
    }
    // A share, not all: the general ships keep flowing among them.
    expect(quarter / all).toBeGreaterThan(0.15);
    expect(quarter / all).toBeLessThan(0.45);
    for (const d of IDS) expect(seen.has(d)).toBe(true);
  });
});

describe('Quarter ships: drones round each quarter’s heart', () => {
  it('has a heart for every district, and finds the nearest', () => {
    const ds = new Set(HOMES.map((h) => h.d));
    for (const d of IDS) expect(ds.has(d)).toBe(true);
    const eye: Vec3 = [HOMES[4]?.x ?? 0, 30, (HOMES[4]?.z ?? 0) + 3 * TILE_Z];
    const [h] = homesNear(eye, 2);
    expect(h?.key).toBe(HOMES[4]?.key);
    expect(Math.abs((h?.z ?? 0) - eye[2])).toBeLessThan(1);
    expect(Math.abs((h?.x ?? 0) - eye[0])).toBeLessThan(TILE_X / 2);
  });

  it('drifts its drones slowly round the heart, over the plaza, deterministic', () => {
    for (const h of HOMES) {
      for (let i = 0; i < DRONES; i++) {
        for (const t of [0, 13, 99]) {
          const a = droneAt(h, i, t);
          expect(droneAt(h, i, t)).toEqual(a);
          const r = Math.hypot(a.c[0] - h.x, a.c[2] - h.z);
          expect(r).toBeGreaterThan(30);
          expect(r).toBeLessThan(65);
          expect(a.c[1]).toBeGreaterThan(-16 + 40);
          const b = droneAt(h, i, t + 1);
          // Slow: a few units a second.
          expect(Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1], b.c[2] - a.c[2])).toBeLessThan(10);
        }
      }
    }
  });
});
