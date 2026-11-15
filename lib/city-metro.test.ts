import { describe, expect, it } from 'vitest';

import { blocked, gameItems } from './city-game';
import { GROUND, type Item } from './city-grid';
import {
  CAR_LEN,
  CARS,
  carAt,
  metroSpot,
  metroStationGlow,
  RAIL,
  railAt,
  railGap,
  STATIONS,
  TRAIN_SPEED,
  TRAINS,
} from './city-metro';
import { cityMapData } from './city-minimap';
import { spotFor } from './city-travel';

describe('the loop metro (2026-11-15: "a metro in a loop")', () => {
  it('runs on one closed loop: its rail ends where it began, smooth all the way round', () => {
    const a = railAt(0).c;
    const b = railAt(RAIL.length).c;
    for (let i = 0; i < 3; i++) expect(b[i]).toBeCloseTo(a[i] as number, 3);
    // No gap anywhere round it: every step as long as the next.
    const step = RAIL.length / RAIL.n;
    for (let s = 0; s < RAIL.n; s++) {
      const p = s * 3;
      const q = ((s + 1) % RAIL.n) * 3;
      const d = Math.hypot(
        (RAIL.pos[q] as number) - (RAIL.pos[p] as number),
        (RAIL.pos[q + 2] as number) - (RAIL.pos[p + 2] as number),
      );
      expect(Math.abs(d - step)).toBeLessThan(0.1);
    }
    // High on its pylons, over the street's lanes.
    for (let s = 0; s < RAIL.n; s += 10)
      expect((RAIL.pos[s * 3 + 1] as number) - GROUND).toBeGreaterThan(30);
  });

  it('trains of several carriages advance smoothly round it, and come back round', () => {
    expect(TRAINS).toBeGreaterThanOrEqual(3);
    expect(CARS).toBeGreaterThanOrEqual(3);
    for (let j = 0; j < TRAINS; j++) {
      let prev = carAt(j, 0, 0).c;
      for (let t = 1 / 30; t < 4; t += 1 / 30) {
        const c = carAt(j, 0, t).c;
        // One small even step a frame (never a jump), the train's pace.
        const d = Math.hypot(c[0] - prev[0], c[2] - prev[2]);
        expect(d).toBeGreaterThan(0.5 * (TRAIN_SPEED / 30));
        expect(d).toBeLessThan(1.5 * (TRAIN_SPEED / 30));
        prev = c;
      }
      // Round the whole loop in RAIL.length / TRAIN_SPEED seconds, back where it began.
      const lap = RAIL.length / TRAIN_SPEED;
      const a = carAt(j, 0, 3).c;
      const b = carAt(j, 0, 3 + lap).c;
      expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeLessThan(0.5);
      // Its carriages one behind another, close.
      for (let car = 1; car < CARS; car++) {
        const p = carAt(j, car - 1, 7).c;
        const q = carAt(j, car, 7).c;
        expect(Math.hypot(p[0] - q[0], p[2] - q[2])).toBeLessThan(CAR_LEN + 2);
      }
    }
  });

  it('a station glows softly while a train is in, never jumping', () => {
    expect(railGap(1, RAIL.length - 1)).toBeCloseTo(2, 6);
    for (let k = 0; k < STATIONS.length; k++) {
      let hi = 0;
      let lo = 1;
      let prev = metroStationGlow(k, 0);
      for (let t = 0; t < RAIL.length / TRAIN_SPEED; t += 1 / 30) {
        const g = metroStationGlow(k, t);
        expect(g).toBeGreaterThanOrEqual(0);
        expect(g).toBeLessThanOrEqual(1);
        expect(Math.abs(g - prev)).toBeLessThan(0.08);
        prev = g;
        hi = Math.max(hi, g);
        lo = Math.min(lo, g);
      }
      expect(hi).toBe(1);
      expect(lo).toBe(0);
    }
  });

  it('draws a station brighter while its train is in', () => {
    const k = 0;
    let tIn = 0;
    let tOut = 0;
    for (let t = 0; t < 200; t += 0.25) {
      if (metroStationGlow(k, t) === 1 && !tIn) tIn = t;
      if (metroStationGlow(k, t) === 0 && !tOut) tOut = t;
    }
    const r = railAt(STATIONS[k] as number);
    const eye = [r.c[0], r.c[1] + 4, r.c[2] + 30] as [number, number, number];
    const bright = (t: number) => {
      const it = gameItems(eye, [0, 0, -1], t).find(
        (i: Item) => i.count === 420 && i.weight === 2,
      ) as Item;
      const o = [0, 0, 0, 0, 0, 0];
      let sum = 0;
      for (let s = 0; s < it.count; s++)
        if (it.site(s, o)) sum += (o[3] as number) + (o[4] as number);
      return sum;
    };
    expect(bright(tIn)).toBeGreaterThan(1.2 * bright(tOut));
  });

  it('a tap on a metro station on the map flies there, clear, facing along the rail', () => {
    const data = cityMapData();
    const metro = data.places.filter((p) => p.name.startsWith('Metro '));
    expect(metro).toHaveLength(STATIONS.length);
    for (const [k, p] of metro.entries()) {
      expect(p.go).toEqual({ metro: 'loop', i: k, name: `Metro ${k + 1}` });
      const spot = spotFor(p.go as NonNullable<typeof p.go>);
      expect(spot).toEqual(metroSpot(k));
      expect(blocked(spot.pos)).toBe(false);
      // Facing the station: yaw 0 flies -z, π/2 flies -x.
      const f = [-Math.sin(spot.yaw), -Math.cos(spot.yaw)];
      const to = railAt(STATIONS[k] as number).c;
      const d = [to[0] - spot.pos[0], to[2] - spot.pos[2]];
      expect(
        (f[0] as number) * (d[0] as number) + (f[1] as number) * (d[1] as number),
      ).toBeGreaterThan(0.9 * Math.hypot(d[0] as number, d[1] as number));
    }
    // The loop on the map is closed.
    expect(data.metro.length).toBeGreaterThan(100);
  });
});
