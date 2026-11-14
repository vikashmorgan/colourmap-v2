import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { placeShip, route, SKY, setFly, tally } from './city';
import { FLOCK_Y } from './city-flocks';
import { blocked } from './city-game';
import { GROUND, TILE_X, TILE_Z } from './city-grid';
import { TRACKS } from './city-race';
import {
  aboveCityItems,
  MOST_PARCOURS,
  MOST_SETS,
  MOST_STATIONS,
  PARCOURS_HIGH,
  PARCOURS_LOW,
  PARCOURS_SITES,
  type ParcoursRing,
  parcoursAt,
  parcoursCopy,
  parcoursRings,
  parcoursSite,
  RING_BEST_KEY,
  RING_MIN_R,
  resetRingBest,
  resetRings,
  ringBanner,
  ringBest,
  ringHeat,
  ringPassedBy,
  ringSets,
  ringStep,
  STREAK_WINDOW,
  setCentre,
  setCount,
  setSite,
} from './city-rings';
import { CITY_PORTALS, inSpace, portalStep, RING_RADII, resetSpace, ringOf } from './city-space';
import { STATIONS, stationCentre, stationModel } from './city-stations';
import { QUARTER_STARTS } from './city-travel';

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const wrapd = (d: number, P: number) => d - P * Math.round(d / P);
/** The shortest way between two tile-local points, the plan repeating. */
const apart = (a: Vec3, b: Vec3) =>
  Math.hypot(wrapd(a[0] - b[0], TILE_X), a[1] - b[1], wrapd(a[2] - b[2], TILE_Z));
const along = (g: ParcoursRing, k: number): Vec3 => [
  g.c[0] + g.n[0] * k,
  g.c[1] + g.n[1] * k,
  g.c[2] + g.n[2] * k,
];
/** Ship's sample path along the parcours, from z0 on by `run`, a step every `step`. */
const pathAlong = (z0: number, run: number, step: number): Vec3[] =>
  Array.from({ length: Math.ceil(Math.abs(run) / step) + 1 }, (_, k) =>
    parcoursAt(z0 + Math.sign(run) * k * step),
  );

describe('Rings of light: concentric rings as decoration (2026-11-14)', () => {
  it('stands big concentric sets on landmarks, round and over buildings, under stations and free', () => {
    const S = ringSets();
    const kinds = new Set(S.map((s) => s.kind));
    for (const k of ['crown', 'halo', 'over', 'under', 'free'])
      expect(kinds.has(k as never)).toBe(true);
    expect(S.length).toBeGreaterThanOrEqual(20);
    const o = [0, 0, 0, 0, 0, 0];
    for (const set of S) {
      expect(set.radii.length).toBeGreaterThanOrEqual(2);
      expect(set.radii.length).toBeLessThanOrEqual(4);
      expect(Math.min(...set.radii)).toBeGreaterThanOrEqual(RING_MIN_R);
      expect(Math.max(...set.radii)).toBeLessThanOrEqual(40);
      // Concentric: every light of ring i the ring's radius from the one middle, in one plane.
      const c = setCentre(set, 12);
      let start = 0;
      for (const r of set.radii) {
        const n = Math.round((2 * Math.PI * r) / 0.55);
        for (let s = start; s < start + n; s += 5) {
          setSite(set, s, 12, c, [1, 0.5, 0.2], 1, o);
          const d = sub([o[0], o[1], o[2]] as Vec3, c);
          expect(Math.abs(len(d) - r)).toBeLessThan(0.05 * r);
          expect(Math.abs(dot(d, set.n))).toBeLessThan(0.04 * r);
        }
        start += n;
      }
      expect(start).toBe(setCount(set));
    }
  });

  it('turns them slowly and keeps them clear of the flocks, the high currents and the big ships', () => {
    const a = [0, 0, 0, 0, 0, 0];
    const b = [0, 0, 0, 0, 0, 0];
    for (const set of ringSets()) {
      const top = Math.abs(set.n[1]) > 0.9 ? 1.5 : Math.max(...set.radii);
      const lo = set.c[1] - top;
      const hi = set.c[1] + top;
      // The flocks wander 140 over the street, their shapes some 20 up and down; the high
      // currents of ships 142 to 182, the big ships 96 to 142: none of it among them.
      expect(lo > FLOCK_Y + 26 || hi < FLOCK_Y - 26, set.kind).toBe(true);
      expect(lo > GROUND + 192 || hi < GROUND + 80, set.kind).toBe(true);
      const c0 = setCentre(set, 30);
      const c1 = setCentre(set, 30 + 1 / 60);
      for (let s = 0; s < setCount(set); s += 11) {
        setSite(set, s, 30, c0, [0.5, 0.8, 1], 1, a);
        setSite(set, s, 30 + 1 / 60, c1, [0.5, 0.8, 1], 1, b);
        expect(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])).toBeLessThan(0.1);
        expect(Math.abs(b[3] - a[3])).toBeLessThan(0.02);
      }
    }
  });

  it('hangs the sets under stations with them as they bob', () => {
    for (const set of ringSets().filter((s) => s.kind === 'under')) {
      const st = STATIONS[set.under];
      expect(st).toBeDefined();
      if (!st) continue;
      const M = stationModel(st);
      for (const t of [0, 7.5, 31]) {
        const c = setCentre(set, t);
        const sc = stationCentre(st, t);
        expect(c[1] - sc[1]).toBeCloseTo(set.c[1] - stationCentre(st, 0)[1], 6);
        expect(sc[1] + M.lo - c[1]).toBeGreaterThan(10);
      }
    }
  });
});

describe('Rings of light: the parcours high over the city (2026-11-14)', () => {
  it('lays big rings along one smooth, banking curve, 270 to 370 over the street', () => {
    const G = parcoursRings();
    expect(G.length).toBeGreaterThan(35);
    for (let i = 0; i < G.length; i++) {
      const g = G[i] as ParcoursRing;
      const h = G[(i + 1) % G.length] as ParcoursRing;
      expect(g.r).toBeGreaterThanOrEqual(16);
      expect(g.r).toBeLessThanOrEqual(25);
      expect(g.c[1]).toBeGreaterThanOrEqual(PARCOURS_LOW);
      expect(g.c[1]).toBeLessThanOrEqual(PARCOURS_HIGH);
      // Its plane square to the way: right and up square to the heading and to each other.
      expect(Math.abs(dot(g.u, g.n))).toBeLessThan(1e-6);
      expect(Math.abs(dot(g.v, g.n))).toBeLessThan(1e-6);
      expect(Math.abs(dot(g.u, g.v))).toBeLessThan(1e-6);
      expect(Math.abs(g.bank)).toBeLessThanOrEqual(0.5);
      // No sharp turns: the next ring under 25° round from this one, and a steady gap. The last
      // comes round to the first, one turn of the plan on.
      const next: Vec3 = i + 1 < G.length ? h.c : [h.c[0], h.c[1], h.c[2] + TILE_Z];
      expect(len(sub(next, g.c))).toBeGreaterThan(38);
      expect(len(sub(next, g.c))).toBeLessThan(56);
      expect(Math.acos(Math.min(1, dot(g.n, h.n))) * (180 / Math.PI)).toBeLessThan(25);
    }
    // It weaves and climbs: the chain swings across the city and up and down.
    const xs = G.map((g) => g.c[0]);
    const ys = G.map((g) => g.c[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(100);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(60);
    // Banked into its turns, both ways.
    expect(Math.max(...G.map((g) => g.bank))).toBeGreaterThan(0.2);
    expect(Math.min(...G.map((g) => g.bank))).toBeLessThan(-0.2);
  });

  it('counts a pass within 0.8 of the radius from the middle, either way, and not well outside', () => {
    for (const g of parcoursRings()) {
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        const off: Vec3 = [
          g.u[0] * Math.cos(a) + g.v[0] * Math.sin(a),
          g.u[1] * Math.cos(a) + g.v[1] * Math.sin(a),
          g.u[2] * Math.cos(a) + g.v[2] * Math.sin(a),
        ];
        const at = (share: number, k2: number): Vec3 => {
          const p = along(g, k2);
          return [
            p[0] + off[0] * g.r * share,
            p[1] + off[1] * g.r * share,
            p[2] + off[2] * g.r * share,
          ];
        };
        expect(ringPassedBy(g, g.c, at(0.8, -3), at(0.8, 3))).toBe(true);
        expect(ringPassedBy(g, g.c, at(0.8, 3), at(0.8, -3))).toBe(true);
        // Slanting through counts too.
        expect(ringPassedBy(g, g.c, at(0.2, -4), at(0.8, 4))).toBe(true);
        expect(ringPassedBy(g, g.c, at(1.5, -3), at(1.5, 3))).toBe(false);
        // Short of the plane is no pass.
        expect(ringPassedBy(g, g.c, at(0, -6), at(0, -1))).toBe(false);
      }
    }
  });

  it('counts the rings flown in a row for the tally, and never opens the space portals', () => {
    resetRings();
    resetRingBest();
    resetSpace();
    const G = parcoursRings();
    // Down a stretch of the city along the curve, at about the boost's pace up there.
    const z0 = 300;
    const run = 900;
    const pts = pathAlong(z0, run, 4);
    let t = 100;
    let passes = 0;
    for (let k = 1; k < pts.length; k++) {
      t += 0.06;
      passes += ringStep(pts[k - 1] as Vec3, pts[k] as Vec3, t);
      expect(portalStep(pts[k - 1] as Vec3, pts[k] as Vec3, t)).toBeNull();
    }
    const within = G.filter((g) => g.c[2] > z0 + 2 && g.c[2] < z0 + run - 2).length;
    expect(passes).toBeGreaterThanOrEqual(within - 1);
    expect(passes).toBeLessThanOrEqual(within + 1);
    expect(ringBanner(t)).toBe(`Rings ${passes}`);
    expect(inSpace()).toBe(false);
    // The same ring at once again counts once.
    const g = G[10] as ParcoursRing;
    const before = ringStep(along(g, -2), along(g, 2), t + 0.1);
    expect(before).toBe(1);
    expect(ringStep(along(g, 2), along(g, -2), t + 0.2)).toBe(0);
    // A pause lets the count lapse; the next ring starts it again.
    expect(ringBanner(t + 0.2 + STREAK_WINDOW + 0.5)).toBe('');
    const h = G[20] as ParcoursRing;
    expect(ringStep(along(h, -2), along(h, 2), t + 0.2 + STREAK_WINDOW + 1)).toBe(1);
    // The new run is short of the best (the long run, and the ring flown again): it shows beside it.
    expect(ringBanner(t + 0.2 + STREAK_WINDOW + 1.2)).toBe(`Rings 1 · best ${passes + 1}`);
    resetRings();
    expect(ringBanner(t + 0.2 + STREAK_WINDOW + 1.2)).toBe('');
  });

  it('keeps the best run in a row, shows it quietly beside a shorter one, and keeps it on the device', () => {
    resetRings();
    resetRingBest();
    expect(ringBest()).toBe(0);
    const G = parcoursRings();
    const through = (i: number, t: number) => {
      const g = G[i] as ParcoursRing;
      return ringStep(along(g, -2), along(g, 2), t);
    };
    // Three in a row: the best is three, and the banner shows no best while the run is the best.
    for (let i = 0; i < 3; i++) expect(through(i, 10 + i)).toBe(1);
    expect(ringBest()).toBe(3);
    expect(ringBanner(13)).toBe('Rings 3');
    // A pause, then a new run of two: the best beside it.
    expect(through(10, 30)).toBe(1);
    expect(through(11, 31)).toBe(1);
    expect(ringBanner(31.5)).toBe('Rings 2 · best 3');
    // Past it, the best goes up with the run.
    expect(through(12, 32)).toBe(1);
    expect(through(13, 33)).toBe(1);
    expect(ringBest()).toBe(4);
    expect(ringBanner(33.5)).toBe('Rings 4');
    // A fresh start forgets the run, never the best; the device keeps it for the next visit.
    resetRings();
    expect(ringBest()).toBe(4);
    expect(globalThis.localStorage.getItem(RING_BEST_KEY)).toBe('4');
    resetRingBest(false);
    expect(ringBest()).toBe(4);
    globalThis.localStorage.setItem(RING_BEST_KEY, 'junk');
    resetRingBest(false);
    expect(ringBest()).toBe(0);
    resetRingBest();
    expect(globalThis.localStorage.getItem(RING_BEST_KEY)).toBeNull();
    resetRings();
  });

  it('flies the whole chain, a whole turn of the plan, without a portal opening', () => {
    resetRings();
    resetSpace();
    const pts = pathAlong(0, TILE_Z, 5);
    let t = 500;
    let passes = 0;
    for (let k = 1; k < pts.length; k++) {
      t += 0.05;
      passes += ringStep(pts[k - 1] as Vec3, pts[k] as Vec3, t);
      expect(portalStep(pts[k - 1] as Vec3, pts[k] as Vec3, t)).toBeNull();
    }
    expect(passes).toBeGreaterThanOrEqual(parcoursRings().length - 1);
    expect(inSpace()).toBe(false);
    resetRings();
  });

  it('warms a ring softly as you pass and ripples a halo from it, in its quarter’s colours', () => {
    resetRings();
    const g = parcoursRings()[5] as ParcoursRing;
    const { key } = parcoursCopy(g, g.c);
    expect(ringStep(along(g, -2), along(g, 2), 50)).toBe(1);
    // Drawn as you come at it.
    const items = aboveCityItems(along(g, -60), g.n, 50.5, 600);
    expect(items.some((x) => x.count === PARCOURS_SITES && x.d < 50)).toBe(true);
    // Heat: up over half a second, back over six, never a jump of more than 0.06 a frame.
    let prev = 0;
    let peak = 0;
    for (let t = 50; t < 58; t += 1 / 60) {
      const h = ringHeat(key, t);
      expect(Math.abs(h - prev)).toBeLessThan(0.06);
      prev = h;
      peak = Math.max(peak, h);
    }
    expect(peak).toBeGreaterThan(0.9);
    expect(ringHeat(key, 64)).toBe(0);
    const blue: [number, number, number] = [0.2, 0.9, 1];
    const o = [0, 0, 0, 0, 0, 0];
    // The halo shows after the pass, then is gone.
    expect(parcoursSite(g, g.c, key, blue, PARCOURS_SITES - 5, 50.6, o)).toBe(true);
    expect(parcoursSite(g, g.c, key, blue, PARCOURS_SITES - 5, 52, o)).toBe(false);
    // Warmer while hot than cold, and never glaring.
    const warm = [0, 0, 0, 0, 0, 0];
    const cold = [0, 0, 0, 0, 0, 0];
    parcoursSite(g, g.c, key, blue, 3, 50.8, warm);
    parcoursSite(g, g.c, key, blue, 3, 60, cold);
    expect((warm[3] as number) / (warm[5] as number)).toBeGreaterThan(
      (cold[3] as number) / (cold[5] as number),
    );
    for (let s = 0; s < PARCOURS_SITES; s += 3) {
      if (!parcoursSite(g, g.c, key, blue, s, 50.7, o)) continue;
      expect(o.every(Number.isFinite)).toBe(true);
      expect(Math.max(o[3] as number, o[4] as number, o[5] as number)).toBeLessThan(0.9);
    }
    resetRings();
  });

  it('shows the count beside the bar as the Ship flies through a ring', () => {
    resetSpace();
    resetRingBest();
    const g = parcoursRings()[12] as ParcoursRing;
    let t = 900;
    setFly(true, [], 1 / 60, t);
    const start = along(g, -14);
    placeShip(start, Math.atan2(-g.n[0], -g.n[2]));
    // A tap of boost and climb for the super boost (it holds the ship up there), then on, level.
    t += 1 / 60;
    setFly(true, [' ', 'w'], 1 / 60, t);
    for (let k = 0; k < 400 && !tally().startsWith('Rings'); k++) {
      t += 1 / 60;
      setFly(true, ['e'], 1 / 60, t);
    }
    expect(tally()).toBe('Rings 1');
    expect(inSpace()).toBe(false);
    resetRings();
    // Leaked fly state breaks the tests after: back on the route.
    setFly(false, [], 0, 0);
  });

  it('draws only the nearest within sight, a modest share of the pool, thinner from the stratosphere', () => {
    for (const [eye, fwd] of [
      [parcoursAt(300), [0, 0, 1]],
      [
        [0, SKY + 450, 900],
        [0, -0.8, -0.6],
      ],
      [
        [0, SKY - 120, 900],
        [0, 0.4, -0.9],
      ],
    ] as [Vec3, Vec3][]) {
      const items = aboveCityItems(eye, fwd, 20, 1300);
      expect(items.length).toBeLessThanOrEqual(MOST_STATIONS + MOST_SETS + MOST_PARCOURS);
      const sites = items.reduce((n, it) => n + it.count, 0);
      expect(sites).toBeLessThan(32000);
      // From over the stations, each weighs a quarter of what it does among them.
      if (eye[1] > SKY + 400) for (const it of items) expect(it.weight).toBeLessThan(0.6);
    }
  });

  it('keeps clear of the portals, the stations, the Sky Island Loop, the route, starts and races', () => {
    const G = parcoursRings();
    for (const g of G) {
      expect(blocked(g.c)).toBe(false);
      for (const P of CITY_PORTALS)
        for (let i = 0; i < RING_RADII.length; i++) {
          const q = ringOf(P, i);
          expect(apart(g.c, q.c), P.name).toBeGreaterThan(g.r + q.r + 20);
        }
      for (const st of STATIONS) {
        const M = stationModel(st);
        const c = stationCentre(st, 0);
        const flat = Math.hypot(wrapd(g.c[0] - c[0], TILE_X), wrapd(g.c[2] - c[2], TILE_Z));
        const lo = c[1] + M.lo - st.bob;
        const hi = c[1] + M.hi + st.bob;
        const dy = g.c[1] < lo ? lo - g.c[1] : g.c[1] > hi ? g.c[1] - hi : 0;
        expect(Math.hypot(Math.max(0, flat - M.r), dy) - g.r, st.name).toBeGreaterThan(10);
      }
      const sky = TRACKS.find((k) => k.name === 'Sky Island Loop');
      for (const q of sky?.gates ?? []) expect(apart(g.c, q)).toBeGreaterThan(g.r + 15);
    }
    // The decorative sets apart from the parcours' rings.
    for (const set of ringSets())
      for (const g of G)
        expect(apart(set.c, g.c) - Math.max(...set.radii) - g.r, set.kind).toBeGreaterThan(8);
    // Every ring and set far over the autopilot's route, the quarter starts and the low races.
    const all: [Vec3, number][] = [
      ...G.map((g): [Vec3, number] => [g.c, g.r]),
      ...ringSets().map((s): [Vec3, number] => [s.c, Math.max(...s.radii)]),
    ];
    for (const [c, r] of all) {
      expect(blocked(c)).toBe(false);
      for (let t = 0; t < 400; t += 9.7) expect(apart(c, route(t).c) - r).toBeGreaterThan(40);
      for (const q of QUARTER_STARTS) expect(apart(c, q.pos) - r).toBeGreaterThan(20);
      for (const T of TRACKS.filter((k) => k.name !== 'Sky Island Loop'))
        for (const q of T.gates) expect(apart(c, q) - r).toBeGreaterThan(15);
    }
    // The parcours is over the towers' sky: the super boost takes you there.
    for (const g of G) expect(g.c[1] - g.r).toBeGreaterThan(SKY + 60);
  });
});
