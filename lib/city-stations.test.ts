import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { route, SKY, STRATOSPHERE } from './city';
import { fireworkPlaces } from './city-fireworks';
import { blocked, DISTRICTS, districtAt } from './city-game';
import { GROUND, type Item, TILE_X, TILE_Z } from './city-grid';
import { TRACKS } from './city-race';
import { CITY_PORTALS, RING_RADII, ringOf } from './city-space';
import {
  STATION_HIGH,
  STATION_LOW,
  STATIONS,
  stationCentre,
  stationCount,
  stationItems,
  stationModel,
  stationSite,
  stationTurn,
} from './city-stations';
import { QUARTER_STARTS } from './city-travel';

/** The shortest way between two tile-local x or z, the plan repeating. */
const wrapd = (d: number, P: number) => d - P * Math.round(d / P);
const flat = (ax: number, az: number, bx: number, bz: number) =>
  Math.hypot(wrapd(ax - bx, TILE_X), wrapd(az - bz, TILE_Z));
/** How far point q is from station st's reach (a cylinder round its middle, bob and all). */
function fromStation(st: (typeof STATIONS)[number], q: Vec3): number {
  const M = stationModel(st);
  const c = stationCentre(st, 0);
  const h = Math.max(0, flat(q[0], q[2], c[0], c[2]) - M.r);
  const lo = c[1] + M.lo - st.bob;
  const hi = c[1] + M.hi + st.bob;
  const y = q[1] < lo ? lo - q[1] : q[1] > hi ? q[1] - hi : 0;
  return Math.hypot(h, y);
}

describe('Flying stations over the City of Dreams (2026-11-14)', () => {
  it('floats fifteen stations, each its own design and name', () => {
    expect(STATIONS).toHaveLength(15);
    expect(new Set(STATIONS.map((s) => s.design)).size).toBe(15);
    expect(new Set(STATIONS.map((s) => s.name)).size).toBe(15);
    // Their shapes differ, not only their names: no two alike in size, reach and height.
    const shapes = STATIONS.map((s) => {
      const M = stationModel(s);
      return `${M.count}:${M.r.toFixed(0)}:${M.lo.toFixed(0)}:${M.hi.toFixed(0)}`;
    });
    expect(new Set(shapes).size).toBe(15);
    for (const s of STATIONS) {
      expect(stationCount(s)).toBeGreaterThan(1000);
      expect(stationCount(s)).toBeLessThan(2600);
    }
  });

  it('floats over the towers’ sky and under the stratosphere’s top, bob and all', () => {
    for (const s of STATIONS) {
      const M = stationModel(s);
      expect(s.h).toBeGreaterThanOrEqual(STATION_LOW);
      expect(s.h).toBeLessThanOrEqual(STATION_HIGH);
      expect(GROUND + s.h + M.lo - s.bob).toBeGreaterThan(SKY + 40);
      expect(GROUND + s.h + M.hi + s.bob).toBeLessThan(STRATOSPHERE - 50);
    }
  });

  it('spreads them over the quarters, each in its own quarter’s colours', () => {
    expect(new Set(STATIONS.map((s) => s.d)).size).toBe(12);
    const o = [0, 0, 0, 0, 0, 0];
    for (const s of STATIONS) {
      expect(districtAt(s.x, s.z)).toBe(s.d);
      const c = stationCentre(s, 0);
      const sum = [0, 0, 0];
      for (let i = 0; i < stationCount(s); i++) {
        expect(stationSite(s, i, 3, c, 1, o)).toBe(true);
        sum[0] += o[3] as number;
        sum[1] += o[4] as number;
        sum[2] += o[5] as number;
      }
      const q = DISTRICTS[s.d].colour;
      const cos =
        (sum[0] * q[0] + sum[1] * q[1] + sum[2] * q[2]) /
        (Math.hypot(sum[0], sum[1], sum[2]) * Math.hypot(q[0], q[1], q[2]));
      expect(cos, s.name).toBeGreaterThan(0.97);
    }
  });

  it('turns and bobs slowly, the same for the same moment, never jumping or flashing', () => {
    const a = [0, 0, 0, 0, 0, 0];
    const b = [0, 0, 0, 0, 0, 0];
    const dt = 1 / 60;
    for (const s of STATIONS) {
      expect(stationCentre(s, 41.3)).toEqual(stationCentre(s, 41.3));
      expect(Math.abs(stationTurn(s, 1) - stationTurn(s, 0))).toBeLessThan(0.06);
      const n = stationCount(s);
      for (const t of [0, 17.2, 93.7]) {
        const c0 = stationCentre(s, t);
        const c1 = stationCentre(s, t + dt);
        expect(Math.abs(c1[1] - c0[1])).toBeLessThan(0.05);
        for (let i = 0; i < n; i += 7) {
          stationSite(s, i, t, c0, 1, a);
          stationSite(s, i, t + dt, c1, 1, b);
          const step = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
          const lumA = Math.max(a[3], a[4], a[5]);
          const lumB = Math.max(b[3], b[4], b[5]);
          // A grain only ever moves a little a frame; one coming round (falling light starting
          // again at the top) is dark as it does.
          if (step > 0.4) expect(Math.max(lumA, lumB), s.name).toBeLessThan(0.02);
          expect(Math.abs(lumB - lumA)).toBeLessThan(0.03);
          // Mellow: never brighter than a lit window's glow.
          expect(lumA).toBeLessThan(0.8);
        }
      }
    }
  });

  it('keeps clear of the fireworks, the space portals, the Sky Island Loop and one another', () => {
    for (const s of STATIONS) {
      const M = stationModel(s);
      for (const f of fireworkPlaces())
        expect(flat(s.x, s.z, f.x, f.z), s.name).toBeGreaterThan(M.r + 20);
      for (const P of CITY_PORTALS)
        for (let i = 0; i < RING_RADII.length; i++) {
          const g = ringOf(P, i);
          expect(fromStation(s, g.c), `${s.name} ${P.name}`).toBeGreaterThan(g.r + 20);
        }
      const sky = TRACKS.find((t) => t.name === 'Sky Island Loop');
      for (const q of [sky?.start, ...(sky?.gates ?? [])])
        if (q) expect(fromStation(s, q), s.name).toBeGreaterThan(25);
      for (const o of STATIONS) {
        if (o === s) continue;
        const Mo = stationModel(o);
        const c = stationCentre(o, 0);
        // Apart, beside or over one another.
        const apart = flat(s.x, s.z, o.x, o.z) - M.r - Mo.r;
        const above = Math.max(
          c[1] + Mo.lo - (GROUND + s.h + M.hi),
          GROUND + s.h + M.lo - (c[1] + Mo.hi),
        );
        expect(Math.max(apart, above), `${s.name} ${o.name}`).toBeGreaterThan(10);
      }
    }
  });

  it('is light, flown through, and far over the autopilot’s route, the quarter starts and the races', () => {
    for (const s of STATIONS) {
      const c = stationCentre(s, 0);
      expect(blocked(c)).toBe(false);
      expect(blocked([c[0] + 5, c[1] + 3, c[2]])).toBe(false);
      for (let t = 0; t < 400; t += 9.7) expect(fromStation(s, route(t).c)).toBeGreaterThan(120);
      for (const q of QUARTER_STARTS) expect(fromStation(s, q.pos)).toBeGreaterThan(100);
      for (const T of TRACKS.filter((k) => k.name !== 'Sky Island Loop'))
        for (const g of T.gates) expect(fromStation(s, g)).toBeGreaterThan(100);
    }
  });

  it('draws them from far off and from the street looking up, within sight only', () => {
    const s = STATIONS[0] as (typeof STATIONS)[number];
    const items = (eye: Vec3, fwd: Vec3, R: number) => {
      const out: Item[] = [];
      stationItems(eye, fwd, 10, R, out);
      return out;
    };
    // From the street under it, looking up the way it floats.
    const street: Vec3 = [s.x + 20, GROUND + 20, s.z + 150];
    const up = [0, 0.83, -0.55] as Vec3;
    const seen = items(street, up, 340).filter((it) => it.count === stationCount(s));
    expect(seen.length).toBeGreaterThan(0);
    expect(Math.min(...seen.map((it) => it.d))).toBeLessThan(300);
    // From high up a long way off, it is there; behind the eye, it is not.
    expect(items([s.x, GROUND + 300, s.z + 700], [0, 0, -1], 900).length).toBeGreaterThan(0);
    const behind = items([s.x, GROUND + 300, s.z - 200], [0, 0, -1], 340);
    expect(behind.some((it) => it.count === stationCount(s) && it.d > 60)).toBe(false);
    // Every site a finite place and colour.
    const o = [0, 0, 0, 0, 0, 0];
    for (const it of seen)
      for (let i = 0; i < it.count; i += 13) {
        it.site(i, o);
        expect(o.every(Number.isFinite)).toBe(true);
      }
  });
});
