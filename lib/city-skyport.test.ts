/*
 * The flying stations and the ring parcours in the game (docs/specs/art-city.md, "Flying stations
 * and rings of light", the finish of 2026-11-14): map marks, travel spots, docking, and the
 * fireworks kept off them.
 */
import { afterEach, describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { placeShip, setFly, shipNow, tally, travelling, travelTo } from './city';
import { BURST_HIGH, BURST_LOW, burstsAt, fireworkPlaces } from './city-fireworks';
import { blocked } from './city-game';
import { GROUND, TILE_X, TILE_Z } from './city-grid';
import { parcoursRings, resetRingBest, resetRings, ringPassedBy } from './city-rings';
import {
  burstClear,
  parcoursLine,
  parcoursStart,
  resetSkyDock,
  SKY_DOCK_AWAY,
  SKY_DOCK_R,
  SKY_DOCK_SPEED,
  skyDockBanner,
  skyDocked,
  skyDockStep,
  skyPlaces,
  stationSpot,
  undockSky,
} from './city-skyport';
import {
  STATIONS,
  stationCentre,
  stationModel,
  stationSite,
  stationWarmth,
  WARM_IN,
  WARM_OUT,
} from './city-stations';
import { nearestCopy, spotFor } from './city-travel';

const wrapd = (d: number, P: number) => d - P * Math.round(d / P);
const flat = (ax: number, az: number, bx: number, bz: number) =>
  Math.hypot(wrapd(ax - bx, TILE_X), wrapd(az - bz, TILE_Z));
/** How far q is from station st's reach (a cylinder round its middle, bob and all). */
function fromStation(st: (typeof STATIONS)[number], q: Vec3): number {
  const M = stationModel(st);
  const h = Math.max(0, flat(q[0], q[2], st.x, st.z) - M.r);
  const lo = GROUND + st.h + M.lo - st.bob;
  const hi = GROUND + st.h + M.hi + st.bob;
  const y = q[1] < lo ? lo - q[1] : q[1] > hi ? q[1] - hi : 0;
  return Math.hypot(h, y);
}
const heading = (yaw: number): [number, number] => [-Math.sin(yaw), -Math.cos(yaw)];
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

afterEach(() => {
  resetSkyDock();
});

describe('the sky on the map (2026-11-14: "finish the sky stations")', () => {
  it('marks the fifteen stations and the parcours start, inside the tile, each leading there', () => {
    const P = skyPlaces();
    const sky = P.filter((p) => p.kind === 'sky');
    expect(sky).toHaveLength(STATIONS.length);
    STATIONS.forEach((st, i) => {
      const p = sky[i];
      expect(p?.name).toBe(st.name);
      expect(p?.go).toEqual({ sky: i, name: st.name });
      expect(p?.x).toBe(st.x);
      expect(p?.z).toBe(st.z);
    });
    const start = P.filter((p) => p.kind === 'parcours');
    expect(start).toHaveLength(1);
    expect(start[0]?.go).toEqual({ sky: 'parcours', name: 'Ring parcours' });
    for (const p of P) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(TILE_X / 2);
      // Drawn as a layer over the towers, under the tallest landmark's top on the 3D map.
      expect(p.y).toBeGreaterThan(80);
      expect(p.y).toBeLessThan(210);
    }
  });

  it('draws the parcours as one line down the whole tile', () => {
    const L = parcoursLine();
    expect(L.length).toBeGreaterThan(60);
    expect(L[0]?.[1]).toBe(0);
    expect(L[L.length - 1]?.[1]).toBeGreaterThan(TILE_Z - 20);
    for (const [x, , y] of L) {
      expect(Math.abs(x)).toBeLessThan(TILE_X / 2);
      expect(y).toBeGreaterThan(100);
    }
  });
});

describe('travel to the sky', () => {
  it('leads to each station: out of its reach, level with it, facing it, clear of the others', () => {
    STATIONS.forEach((st, i) => {
      const s = stationSpot(i);
      expect(spotFor({ sky: i, name: st.name })).toEqual(s);
      expect(blocked(s.pos)).toBe(false);
      const c = stationCentre(st, 0);
      // Near: in sight of it, not in it, and outside its docking zone.
      expect(fromStation(st, s.pos), st.name).toBeGreaterThan(20);
      expect(flat(s.pos[0], s.pos[2], st.x, st.z), st.name).toBeLessThan(stationModel(st).r + 40);
      expect(dist(s.pos, c)).toBeGreaterThan(SKY_DOCK_AWAY);
      expect(Math.abs(s.pos[1] - c[1])).toBeLessThan(st.bob + 1);
      const [fx, fz] = heading(s.yaw);
      const dx = c[0] - s.pos[0];
      const dz = c[2] - s.pos[2];
      expect((fx * dx + fz * dz) / Math.hypot(dx, dz)).toBeGreaterThan(0.99);
      for (const o of STATIONS)
        if (o !== st) expect(fromStation(o, s.pos), o.name).toBeGreaterThan(20);
    });
  });

  it('leads to the parcours start, facing the first ring a short way ahead, straight through it', () => {
    const s = spotFor({ sky: 'parcours', name: 'Ring parcours' });
    expect(s).toEqual(parcoursStart());
    const g = parcoursRings()[0] as ReturnType<typeof parcoursRings>[number];
    const d = dist(s.pos, g.c);
    expect(d).toBeGreaterThan(15);
    expect(d).toBeLessThan(40);
    const [fx, fz] = heading(s.yaw);
    // Flown level and straight on from it, the ship goes through the first ring.
    const a: Vec3 = [...s.pos];
    const b: Vec3 = [s.pos[0] + fx * 2 * d, s.pos[1], s.pos[2] + fz * 2 * d];
    expect(ringPassedBy(g, g.c, a, b)).toBe(true);
    expect(blocked(s.pos)).toBe(false);
    for (const st of STATIONS) expect(fromStation(st, s.pos)).toBeGreaterThan(20);
  });
});

describe('docking at a flying station', () => {
  const st = STATIONS[4] as (typeof STATIONS)[number];

  it('docks slow in the middle, holds there bobbing with it, and undocks at any steering', () => {
    const t0 = 40;
    const c = stationCentre(st, t0);
    const at: Vec3 = [c[0] + 5, c[1], c[2] + 5];
    // Too fast, or steering, or out of the middle: no dock.
    expect(skyDockStep(at, SKY_DOCK_SPEED + 1, false, t0)).toBeNull();
    expect(skyDockStep(at, 2, true, t0)).toBeNull();
    expect(skyDockStep([c[0], c[1], c[2] + SKY_DOCK_R + 2], 2, false, t0)).toBeNull();
    expect(skyDocked()).toBe(-1);
    // Slow in the middle: docked, held where it came in.
    const h = skyDockStep(at, 2, false, t0) as Vec3;
    expect(skyDocked()).toBe(4);
    expect(skyDockBanner()).toBe(`Docked · ${st.name}`);
    expect(dist(h, at)).toBeLessThan(0.01);
    // Held while it bobs: the hold moves with the station.
    const later = skyDockStep(at, 0, false, t0 + 5) as Vec3;
    const c2 = stationCentre(st, t0 + 5);
    expect(later[1] - c2[1]).toBeCloseTo(at[1] - c[1]);
    // Any steering undocks, at once.
    expect(skyDockStep(at, 0, true, t0 + 6)).toBeNull();
    expect(skyDocked()).toBe(-1);
    expect(skyDockBanner()).toBe('');
    // Never trapped: in its middle, slow, it does not dock again until the ship has left it.
    expect(skyDockStep(at, 1, false, t0 + 6.1)).toBeNull();
    const out: Vec3 = [c[0], c[1], c[2] + SKY_DOCK_AWAY + 4];
    expect(skyDockStep(out, 1, false, t0 + 8)).toBeNull();
    expect(skyDockStep(at, 1, false, t0 + 10)).not.toBeNull();
    expect(skyDocked()).toBe(4);
  });

  it('settles a ship that came in off the middle a little nearer it', () => {
    const c = stationCentre(st, 10);
    const at: Vec3 = [c[0] + 14, c[1], c[2]];
    const h = skyDockStep(at, 1, false, 10) as Vec3;
    expect(dist(h, c)).toBeLessThan(dist(at, c));
    expect(dist(h, c)).toBeLessThanOrEqual(8.01);
  });

  it('warms the station’s lights slowly while docked, and cools them after, never a jump', () => {
    const i = 4;
    const c = stationCentre(st, 20);
    expect(stationWarmth(i, 20)).toBe(0);
    skyDockStep([c[0], c[1], c[2]], 1, false, 20);
    let was = 0;
    for (let t = 20; t < 20 + WARM_IN + 0.5; t += 1 / 60) {
      const w = stationWarmth(i, t);
      expect(Math.abs(w - was)).toBeLessThan(0.03);
      was = w;
    }
    expect(was).toBeCloseTo(1);
    // Warmer lamps: leaning to the warm shade, a little brighter, still mellow.
    const cold = [0, 0, 0, 0, 0, 0];
    const warm = [0, 0, 0, 0, 0, 0];
    let warmer = 0;
    for (let s = 0; s < stationModel(st).count; s += 11) {
      stationSite(st, s, 30, c, 1.15, cold, 0);
      stationSite(st, s, 30, c, 1.84, warm, 1);
      if (
        (warm[3] as number) / ((warm[5] as number) + 1e-6) >=
        (cold[3] as number) / ((cold[5] as number) + 1e-6)
      )
        warmer++;
      expect(Math.max(warm[3] as number, warm[4] as number, warm[5] as number)).toBeLessThan(0.8);
    }
    expect(warmer / Math.ceil(stationModel(st).count / 11)).toBeGreaterThan(0.9);
    undockSky(23);
    for (let t = 23; t < 23 + WARM_OUT + 0.5; t += 1 / 60) {
      const w = stationWarmth(i, t);
      expect(Math.abs(w - was)).toBeLessThan(0.03);
      was = w;
    }
    expect(was).toBe(0);
    // The other stations stayed cold throughout.
    expect(stationWarmth(0, 22)).toBe(0);
  });

  it('flies the Ship in slowly to dock, holds it, and lets it go at a touch of the keys', () => {
    resetRings();
    const dt = 1 / 60;
    let t = 700;
    const run = (keys: string[], seconds: number) => {
      for (let k = 0; k < Math.round(seconds * 60); k++) {
        t += dt;
        setFly(true, keys, dt, t);
      }
    };
    setFly(true, [], dt, t);
    // Off to the station by the map, then slowly in toward its middle.
    travelTo(spotFor({ sky: 4, name: st.name }));
    run([], 1.2);
    expect(travelling()).toBe(false);
    const spot = nearestCopy(stationSpot(4).pos, shipNow().c);
    expect(dist(shipNow().c, spot)).toBeLessThan(3);
    // Held up there: over the towers' sky the ship keeps its height.
    run(['q'], 1);
    expect(shipNow().c[1]).toBeGreaterThan(GROUND + st.h - st.bob - 3);
    const c0 = stationCentre(st, t, spot[0], spot[2] - stationModel(st).r - 30);
    placeShip([c0[0], c0[1], c0[2] + SKY_DOCK_R + 6], 0);
    run(['q'], 0.1);
    for (let k = 0; k < 600 && skyDocked() < 0; k++) run(['q'], dt);
    expect(skyDocked()).toBe(4);
    expect(tally()).toBe(`Docked · ${st.name}`);
    // Held: three seconds on, still in the middle, hardly moving.
    run([], 3);
    const c1 = stationCentre(st, t, c0[0], c0[2]);
    expect(dist(shipNow().c, c1)).toBeLessThan(SKY_DOCK_R);
    const a = [...shipNow().c] as Vec3;
    run([], dt);
    expect(dist(shipNow().c, a)).toBeLessThan(0.05);
    // A turn undocks, and flying on the ship leaves the middle: never caught.
    run(['a'], dt);
    expect(skyDocked()).toBe(-1);
    run(['w'], 4);
    expect(skyDocked()).toBe(-1);
    expect(dist(shipNow().c, stationCentre(st, t, c0[0], c0[2]))).toBeGreaterThan(SKY_DOCK_R);
    setFly(false, [], 0, 0);
  });

  it('flies the Ship from the parcours start through the first ring', () => {
    resetRings();
    resetRingBest();
    const dt = 1 / 60;
    let t = 1500;
    setFly(true, [], dt, t);
    travelTo(spotFor({ sky: 'parcours', name: 'Ring parcours' }));
    for (let k = 0; k < 600 && !tally().startsWith('Rings'); k++) {
      t += dt;
      setFly(true, [], dt, t);
    }
    expect(tally()).toBe('Rings 1');
    setFly(false, [], 0, 0);
  });
});

describe('fireworks kept off the stations and the parcours (polish)', () => {
  it('tells a burst in a station or a ring from one in the open air', () => {
    const st = STATIONS[0] as (typeof STATIONS)[number];
    expect(burstClear(stationCentre(st, 0), 20)).toBe(false);
    const g = parcoursRings()[3] as ReturnType<typeof parcoursRings>[number];
    expect(burstClear(g.c, 18)).toBe(false);
    // Copies far off in the endless city are the same.
    const c = stationCentre(st, 0);
    expect(burstClear([c[0] + 2 * TILE_X, c[1], c[2] - TILE_Z], 20)).toBe(false);
    // Over the avenue's foot, low, away from all of them.
    expect(burstClear([0, BURST_LOW, 1000], 18)).toBe(burstClear([0, BURST_LOW, 1000], 18));
  });

  it('never blooms a burst into a flying station or a parcours ring, and still bursts', () => {
    let seen = 0;
    const places = fireworkPlaces();
    for (let t = 0; t < 240; t += 0.7) {
      for (const P of places) {
        for (const b of burstsAt(t, [P.x, GROUND + 300, P.z], 120)) {
          seen++;
          expect(b.c[1]).toBeGreaterThanOrEqual(BURST_LOW);
          expect(b.c[1]).toBeLessThanOrEqual(BURST_HIGH);
          for (const st of STATIONS) {
            const M = stationModel(st);
            const h = flat(b.c[0], b.c[2], st.x, st.z) - M.r - b.r;
            const lo = GROUND + st.h + M.lo - st.bob;
            const hi = GROUND + st.h + M.hi + st.bob;
            const y = b.c[1] - b.r - 24 > hi ? b.c[1] - b.r - 24 - hi : lo - (b.c[1] + b.r);
            expect(Math.max(h, y), st.name).toBeGreaterThan(5);
          }
          for (const g of parcoursRings()) {
            const h = flat(b.c[0], b.c[2], g.c[0], g.c[2]) - g.r - b.r;
            const y = Math.max(b.c[1] - b.r - 24 - (g.c[1] + g.r), g.c[1] - g.r - (b.c[1] + b.r));
            expect(Math.max(h, y)).toBeGreaterThan(5);
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(100);
  });
});
