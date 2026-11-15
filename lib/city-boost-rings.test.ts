/*
 * Boost rings (docs/specs/art-city.md, "Boost rings, LED arrows and the big fireworks"),
 * 2026-11-15: "More big unique circles above the city, or in the city, that you can fly into, and
 * they boost you."
 */
import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  gauges,
  makeParticles,
  PHASES,
  pieceAt,
  pieceCamera,
  placeShip,
  route,
  setFly,
  tally,
} from './city';
import { SKY_BARS } from './city-bars';
import {
  BOOST_R_MAX,
  BOOST_R_MIN,
  BOOST_STYLES,
  type BoostRing,
  boostClearOfBurst,
  boostHeat,
  boostPassedBy,
  boostRingItems,
  boostRingStep,
  boostRings,
  boostSite,
  boostSites,
  MOST_BOOST,
  resetBoostRings,
  SPIRE_KEEP,
  SURGE_LIFE,
  surgeAt,
  surgePace,
} from './city-boost-rings';
import { CORRIDOR_FEATURES, CORRIDOR_X } from './city-corridors';
import { FLOCK_Y } from './city-flocks';
import { blocked, LANDMARKS } from './city-game';
import { GROUND, TILE_X, TILE_Z } from './city-grid';
import { TRACKS } from './city-race';
import { parcoursRings, resetRings, ringBanner, ringSets, ringStep } from './city-rings';
import { CITY_PORTALS, RING_RADII, ringOf } from './city-space';
import { STATIONS, stationCentre, stationModel } from './city-stations';
import { ARCH_OUTER, ARCH_PIER, ARCH_Z, SATURN_X, SATURN_Z } from './city-symbols';
import { QUARTER_STARTS } from './city-travel';
import { barModel } from './space-bars';

const wrapd = (d: number, P: number) => d - P * Math.round(d / P);
const apart = (a: Vec3, b: Vec3) =>
  Math.hypot(wrapd(a[0] - b[0], TILE_X), a[1] - b[1], wrapd(a[2] - b[2], TILE_Z));
const reach = (g: BoostRing) => Math.max(g.rx, g.ry);
const speed = () => gauges().find((g) => g.label === 'Speed')?.value as number;
const dt = 1 / 60;

/** A point on ring g's rim at angle a, scaled by k. */
const rim = (g: BoostRing, a: number, k = 1): Vec3 => {
  const across = Math.cos(a) * g.rx * k;
  return [
    g.c[0] + (g.axis === 2 ? across : 0),
    g.c[1] + Math.sin(a) * g.ry * k,
    g.c[2] + (g.axis === 0 ? across : 0),
  ];
};
/** A point k along ring g's way through, from its middle. */
const through = (g: BoostRing, k: number, du = 0, dv = 0): Vec3 => [
  g.c[0] + (g.axis === 0 ? k : du),
  g.c[1] + dv,
  g.c[2] + (g.axis === 2 ? k : du),
];

describe('boost rings: big, unique, in series down the long views', () => {
  const G = boostRings();

  it('stands big rings in four designs, in the corridors, the gap, over the avenue, the canals and the roofs', () => {
    const styles = new Set(G.map((g) => g.style));
    expect(styles.size).toBeGreaterThanOrEqual(4);
    for (const s of BOOST_STYLES) expect(G.filter((g) => g.style === s).length).toBeGreaterThan(3);
    const count = (p: BoostRing['place']) => G.filter((g) => g.place === p).length;
    expect(count('corridor')).toBeGreaterThanOrEqual(20);
    expect(count('gap')).toBeGreaterThanOrEqual(2);
    expect(count('avenue')).toBeGreaterThanOrEqual(3);
    expect(count('canal')).toBeGreaterThanOrEqual(2);
    expect(count('high')).toBeGreaterThanOrEqual(8);
    for (const g of G) {
      expect(reach(g)).toBeGreaterThanOrEqual(BOOST_R_MIN);
      expect(reach(g)).toBeLessThanOrEqual(BOOST_R_MAX);
    }
    // Both corridors carry a row of them.
    for (const x of CORRIDOR_X)
      expect(G.filter((g) => g.place === 'corridor' && g.c[0] === x).length).toBeGreaterThan(8);
  });

  it('lines them up down the long views, so they recede as a series, no two neighbours alike', () => {
    for (const x of CORRIDOR_X) {
      const row = G.filter((g) => g.place === 'corridor' && g.c[0] === x).sort(
        (a, b) => a.c[2] - b.c[2],
      );
      // All facing down the corridor, on its middle line, at one height.
      for (const g of row) {
        expect(g.axis).toBe(2);
        expect(g.c[1]).toBe(row[0]?.c[1]);
      }
      // Runs of three or more, a block or two apart.
      let run = 1;
      let best = 1;
      for (let i = 1; i < row.length; i++) {
        const gap = (row[i] as BoostRing).c[2] - (row[i - 1] as BoostRing).c[2];
        run = gap <= 70 ? run + 1 : 1;
        best = Math.max(best, run);
        if (gap <= 70)
          expect((row[i] as BoostRing).style).not.toBe((row[i - 1] as BoostRing).style);
      }
      expect(best).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps clear of the towers, the stations, the parcours, the sets, the portals, the bridges and the races', () => {
    const spire = LANDMARKS.find((l) => l.kind === 'spire') as (typeof LANDMARKS)[number];
    for (const g of G) {
      const R = reach(g);
      const name = `${g.place} ${g.c.map(Math.round).join(',')}`;
      expect(blocked(g.c), name).toBe(false);
      for (let k = 0; k < 64; k++)
        expect(blocked(rim(g, (k / 64) * Math.PI * 2)), name).toBe(false);
      for (const st of STATIONS) {
        const M = stationModel(st);
        const c = stationCentre(st, 0);
        const flat = Math.hypot(wrapd(g.c[0] - c[0], TILE_X), wrapd(g.c[2] - c[2], TILE_Z));
        const lo = c[1] + M.lo - st.bob;
        const hi = c[1] + M.hi + st.bob;
        const dy = g.c[1] < lo ? lo - g.c[1] : g.c[1] > hi ? g.c[1] - hi : 0;
        expect(Math.hypot(Math.max(0, flat - M.r), dy) - R, `${name} ${st.name}`).toBeGreaterThan(
          10,
        );
      }
      for (const p of parcoursRings()) expect(apart(g.c, p.c) - R - p.r, name).toBeGreaterThan(10);
      for (const S of ringSets())
        expect(apart(g.c, S.c) - R - Math.max(...S.radii), name).toBeGreaterThan(8);
      for (const P of CITY_PORTALS)
        for (let i = 0; i < RING_RADII.length; i++) {
          const q = ringOf(P, i);
          expect(apart(g.c, q.c) - R - q.r, name).toBeGreaterThan(20);
        }
      for (const f of CORRIDOR_FEATURES)
        expect(apart(g.c, [f.x, GROUND + f.y, f.z]) - R, name).toBeGreaterThan(10);
      for (const T of TRACKS)
        for (const q of [T.start, ...T.gates]) expect(apart(g.c, q) - R, name).toBeGreaterThan(15);
      for (const q of QUARTER_STARTS) expect(apart(g.c, q.pos) - R, name).toBeGreaterThan(5);
      for (let t = 0; t < 400; t += 9.7)
        expect(apart(g.c, route(t).c) - R, name).toBeGreaterThan(40);
      expect(
        Math.hypot(wrapd(g.c[0] - spire.x, TILE_X), wrapd(g.c[2] - spire.z, TILE_Z)),
      ).toBeGreaterThan(SPIRE_KEEP);
      // Off the Great Arch, the Saturn Tower's pole and (up high) the space bars.
      const ax = Math.max(0, Math.abs(wrapd(g.c[0], TILE_X)) - ARCH_OUTER);
      const az = Math.max(0, Math.abs(wrapd(g.c[2] - ARCH_Z, TILE_Z)) - ARCH_PIER.hz);
      expect(Math.hypot(ax, az) - R, name).toBeGreaterThan(10);
      expect(
        Math.hypot(wrapd(g.c[0] - SATURN_X, TILE_X), wrapd(g.c[2] - SATURN_Z, TILE_Z)) - R,
        name,
      ).toBeGreaterThan(25);
      if (g.c[1] - GROUND > 150)
        for (const b of SKY_BARS) {
          const flat = Math.hypot(wrapd(g.c[0] - b.x, TILE_X), wrapd(g.c[2] - b.z, TILE_Z));
          expect(flat - barModel(b.design).r - R, name).toBeGreaterThan(10);
        }
    }
    // Two rings never crowd one another.
    for (const a of G) for (const b of G) if (a !== b) expect(apart(a.c, b.c)).toBeGreaterThan(20);
  });

  it('keeps out of the currents: low ones over the street channels and under the big ships, high ones over the high streams', () => {
    for (const g of G) {
      const lo = g.c[1] - g.ry - GROUND;
      const hi = g.c[1] + g.ry - GROUND;
      if (hi < 96) {
        // Over the street's channel (11 along a street, 30 on a cross street, 35 on the avenue).
        expect(lo).toBeGreaterThan(g.place === 'corridor' ? 12.5 : 35);
      } else {
        // Over the big ships, express lanes, flocks, high currents and high streams; under the parcours.
        expect(lo).toBeGreaterThan(FLOCK_Y - GROUND + 26);
        expect(lo).toBeGreaterThan(188);
        expect(hi).toBeLessThan(250);
      }
    }
  });
});

describe('boost rings: the surge', () => {
  const G = boostRings();
  const g = G.find((r) => r.place === 'corridor' && r.c[0] > 0) as BoostRing;

  it('counts a pass through the ring, forgiving at the rim, and not well outside or alongside', () => {
    expect(boostPassedBy(g, g.c, through(g, -1), through(g, 1))).toBe(true);
    expect(boostPassedBy(g, g.c, through(g, 1), through(g, -1))).toBe(true);
    expect(boostPassedBy(g, g.c, through(g, -1, g.rx * 1.05), through(g, 1, g.rx * 1.05))).toBe(
      true,
    );
    expect(boostPassedBy(g, g.c, through(g, -1, 0, g.ry * 1.3), through(g, 1, 0, g.ry * 1.3))).toBe(
      false,
    );
    expect(boostPassedBy(g, g.c, through(g, -3), through(g, -1))).toBe(false);
  });

  it('surges when flown through: strong at once, easing off to nothing over two to three seconds', () => {
    resetBoostRings();
    const t0 = 5000;
    expect(boostRingStep(through(g, -1), through(g, 1), t0)).toBe(1);
    // The same ring a moment later: once.
    expect(boostRingStep(through(g, 1), through(g, -1), t0 + 0.5)).toBe(0);
    expect(surgeAt(t0 - 0.01)).toBe(0);
    expect(surgeAt(t0 + 0.15)).toBeGreaterThan(0.95);
    expect(surgePace(t0 + 0.15, false)).toBeGreaterThan(2.2);
    // Under the boost it adds less: it stacks, never runs away.
    expect(surgePace(t0 + 0.15, true)).toBeLessThan(surgePace(t0 + 0.15, false));
    expect(surgePace(t0 + 0.15, true)).toBeGreaterThan(1.5);
    let was = surgeAt(t0 + 0.15);
    for (let e = 0.15 + dt; e < SURGE_LIFE + 0.5; e += dt) {
      const k = surgeAt(t0 + e);
      expect(k).toBeLessThanOrEqual(was + 1e-9);
      expect(was - k).toBeLessThan(0.03);
      was = k;
    }
    expect(surgeAt(t0 + 1.3)).toBeGreaterThan(0.3);
    expect(surgeAt(t0 + 1.3)).toBeLessThan(0.7);
    expect(SURGE_LIFE).toBeGreaterThanOrEqual(2);
    expect(SURGE_LIFE).toBeLessThanOrEqual(3);
    expect(surgeAt(t0 + SURGE_LIFE)).toBe(0);
    expect(surgePace(t0 + SURGE_LIFE + 0.1, false)).toBe(1);
    resetBoostRings();
  });

  it('never counts toward the parcours, and the parcours never surges', () => {
    resetRings();
    resetBoostRings();
    const t = 6000;
    for (const r of G) {
      expect(ringStep(through(r, -1), through(r, 1), t)).toBe(0);
    }
    expect(ringBanner(t)).toBe('');
    const p = parcoursRings()[5] as ReturnType<typeof parcoursRings>[number];
    const a: Vec3 = [p.c[0] - p.n[0], p.c[1] - p.n[1], p.c[2] - p.n[2]];
    const b: Vec3 = [p.c[0] + p.n[0], p.c[1] + p.n[1], p.c[2] + p.n[2]];
    expect(boostRingStep(a, b, t + 20)).toBe(0);
    expect(surgeAt(t + 20.5)).toBe(0);
    resetRings();
    resetBoostRings();
  });

  it('speeds the Ship up as it flies through one, the parcours tally untouched', () => {
    let t = 7000;
    setFly(false, [], 0, t);
    setFly(true, [], dt, t);
    // Facing down the corridor (+z, yaw π), a little before the ring, on its middle.
    placeShip(through(g, -30), Math.PI);
    let passed = -1;
    let before = 0;
    for (let k = 0; k < 900 && passed < 0; k++) {
      t += dt;
      const v = speed();
      setFly(true, [], dt, t);
      if (surgeAt(t) > 0) {
        passed = t;
        before = v;
      }
    }
    expect(passed).toBeGreaterThan(0);
    expect(before).toBeGreaterThan(4);
    let top = 0;
    for (let k = 0; k < 60; k++) {
      t += dt;
      setFly(true, [], dt, t);
      top = Math.max(top, speed());
    }
    expect(top).toBeGreaterThan(1.5 * before);
    expect(tally().startsWith('Rings')).toBe(false);
    setFly(false, [], 0, 0);
    resetBoostRings();
  });
});

describe('boost rings: drawn', () => {
  const G = boostRings();

  it('draws each design finite and mellow, warming and rippling a halo after a pass', () => {
    resetBoostRings();
    const o = [0, 0, 0, 0, 0, 0];
    const t = 8000;
    for (const g of G.slice(0, 12)) {
      let lit = 0;
      for (let s = 0; s < boostSites(g); s++) {
        if (!boostSite(g, g.c, 1, [0.5, 0.7, 1], s, t, o)) continue;
        lit++;
        expect(o.every(Number.isFinite)).toBe(true);
        expect(Math.max(o[3] as number, o[4] as number, o[5] as number)).toBeLessThan(0.65);
        // On or inside its rim (a little outside for the halo).
        const du = (g.axis === 2 ? (o[0] as number) - g.c[0] : (o[2] as number) - g.c[2]) / g.rx;
        const dv = ((o[1] as number) - g.c[1]) / g.ry;
        expect(Math.hypot(du, dv)).toBeLessThan(1.01);
      }
      expect(lit).toBeGreaterThan(boostSites(g) * 0.6);
    }
    // After a pass: a halo reaching out past the rim, warmer, then gone.
    const g = G.find((r) => r.place === 'corridor') as BoostRing;
    boostRingStep(through(g, -1), through(g, 1), t);
    const fwd: Vec3 = [0, 0, 1];
    const look = (at: number) => {
      const it = boostRingItems(through(g, -20), fwd, at, 200)[0];
      if (!it) throw new Error('no ring in sight');
      let out = 0;
      let warm = 0;
      for (let s = 0; s < it.count; s++) {
        if (!it.site(s, o)) continue;
        const du = ((o[0] as number) - g.c[0]) / g.rx;
        const dv = ((o[1] as number) - g.c[1]) / g.ry;
        if (Math.hypot(du, dv) > 1.05) out++;
        warm += (o[3] as number) - (o[5] as number);
      }
      return { out, warm };
    };
    const soon = look(t + 0.5);
    const late = look(t + 8);
    expect(soon.out).toBeGreaterThan(20);
    expect(late.out).toBe(0);
    expect(soon.warm).toBeGreaterThan(late.warm);
    expect(boostHeat(12345, t)).toBe(0);
    resetBoostRings();
  });

  it('draws only the nearest ahead, a modest share of the pool', () => {
    for (const x of CORRIDOR_X) {
      const eye: Vec3 = [x, GROUND + 20, 300];
      const items = boostRingItems(eye, [0, 0, 1], 10, 900);
      expect(items.length).toBeGreaterThan(2);
      expect(items.length).toBeLessThanOrEqual(MOST_BOOST);
      expect(items.reduce((n, it) => n + it.count, 0)).toBeLessThan(6000);
      // Down the corridor ahead: a row of them, receding.
      expect(items.filter((it) => it.d > 30).length).toBeGreaterThan(1);
    }
  });

  it('keeps the fireworks off the rings', () => {
    for (const g of G) {
      expect(boostClearOfBurst(g.c, 30)).toBe(false);
      expect(boostClearOfBurst([g.c[0] + TILE_X, g.c[1] + 40, g.c[2] - TILE_Z], 30)).toBe(false);
    }
    expect(boostClearOfBurst([0, GROUND + 420, 1000], 30)).toBe(true);
  });
});

describe('boost rings: within the grain budget', () => {
  it('keeps to a phone’s and a computer’s grains flying down a corridor through the rings', () => {
    const ship = PHASES.findIndex((p) => p.id === 'ship');
    const g = boostRings().find((r) => r.place === 'corridor') as BoostRing;
    for (const n of [6500, 15000]) {
      const ps = makeParticles(n);
      let t = 300;
      setFly(false, [], 0, t);
      setFly(true, [], dt, t);
      placeShip(through(g, -60), Math.PI);
      let lit = 0;
      let finite = true;
      for (let k = 0; k < 3; k++) {
        t += dt;
        setFly(true, [], dt, t);
        pieceCamera(ship, t);
        lit = 0;
        for (const p of ps) {
          const q = pieceAt(p, ship, t);
          finite &&= q.pos.every(Number.isFinite) && q.rgb.every(Number.isFinite);
          if (q.rgb[0] + q.rgb[1] + q.rgb[2] > 0.004) lit++;
        }
      }
      expect(finite).toBe(true);
      expect(lit).toBeLessThanOrEqual(n);
      expect(lit).toBeGreaterThan(n * 0.3);
      setFly(false, [], 0, 0);
    }
  });
});
