import { describe, expect, it } from 'vitest';

import { makeParticles, type Vec3 } from './bigbang';
import { FLY_SPEED, PHASES, pieceAt, pieceCamera, placeShip, STREET_BOOST, setFly } from './city';
import { CORRIDOR_X } from './city-corridors';
import { blocked } from './city-game';
import { GROUND, type Item, nearest, TILE_X } from './city-grid';
import {
  CHASE_MAX,
  CHASE_MIN,
  CHASE_SLOT,
  CHASE_SPEED,
  type Chase,
  COP_LAGS,
  CRUISER_SITES,
  chaseNow,
  chaseShows,
  cruiserAt,
  cruiserSite,
  FLARE_HALF,
  FUGITIVE_SITES,
  flareColour,
  flareRedLeft,
  fugitiveSite,
  POLICE_BLUE,
  POLICE_RED,
  planChase,
  policeItems,
  resetChases,
  WEAVE_X,
} from './city-police';

/*
 * 2026-11-15: "space police with flare lights; they travel through town sometimes at full speed
 * chasing other spaceships like ours."
 */

const ship = PHASES.findIndex((p) => p.id === 'ship');
const o = [0, 0, 0, 0, 0, 0];
const EYE: Vec3 = [10, GROUND + 20, 700];
const chases = (eye = EYE) =>
  Array.from({ length: 60 }, (_, n) => planChase(n, eye)).filter((c): c is Chase => c !== null);
const at = (c: Chase, t: number): Vec3 => {
  const p: Vec3 = [0, 0, 0];
  c.target.at(t, p);
  return p;
};

describe('the space police: their lights', () => {
  it('alternate red and blue, left and right swapping every flare', () => {
    for (const t of [0.05, 3.3, 17.1]) {
      for (let i = 0; i < 3; i++) {
        const L = flareColour(t, i, -1);
        const R = flareColour(t, i, 1);
        // One red, one blue, always.
        const red = (c: number[]) => (c[0] as number) > (c[2] as number);
        expect(red(L)).not.toBe(red(R));
        // Half a flare later, swapped.
        const u = t + FLARE_HALF;
        expect(red(flareColour(u, i, -1))).toBe(red(R));
        expect(flareRedLeft(u, i)).toBe(!flareRedLeft(t, i));
      }
    }
    expect(POLICE_RED[0]).toBeGreaterThan(POLICE_RED[2] * 5);
    expect(POLICE_BLUE[2]).toBeGreaterThan(POLICE_BLUE[0] * 5);
    // Swapping a few times a second, not a strobe.
    expect(FLARE_HALF).toBeGreaterThan(0.15);
    expect(FLARE_HALF).toBeLessThan(0.6);
  });

  it('flash only on the police: the cruiser’s other sites and the fugitive hold steady', () => {
    const c: Vec3 = [0, GROUND + 24, 0];
    const f: Vec3 = [0, 0, 1];
    const a = [0, 0, 0, 0, 0, 0];
    for (let s = 0; s < CRUISER_SITES; s++) {
      cruiserSite(c, f, 0, s, 1.01, 1, o);
      cruiserSite(c, f, 0, s, 1.01 + FLARE_HALF, 1, a);
      expect(o.every(Number.isFinite)).toBe(true);
      const changed = Math.abs((o[3] as number) - (a[3] as number)) > 0.05;
      if (s < 60 || s >= 80) expect(changed).toBe(false);
    }
    let flares = 0;
    for (let s = 60; s < 80; s++) {
      cruiserSite(c, f, 0, s, 1.01, 1, o);
      cruiserSite(c, f, 0, s, 1.01 + FLARE_HALF, 1, a);
      if (Math.abs((o[3] as number) - (a[3] as number)) > 0.05) flares++;
    }
    expect(flares).toBeGreaterThan(10);
    for (let s = 0; s < FUGITIVE_SITES; s++) {
      fugitiveSite(c, f, s, 2, 1, o);
      expect(o.every(Number.isFinite)).toBe(true);
      expect(Math.max(o[3] as number, o[4] as number, o[5] as number)).toBeLessThan(0.7);
    }
  });
});

describe('the space police: chases', () => {
  it('start now and then, each a fugitive with one to three cruisers, and end after a while', () => {
    const all = chases();
    expect(all.length).toBeGreaterThan(25);
    expect(all.length).toBeLessThan(60);
    const cops = new Set(all.map((c) => c.cops));
    expect([...cops].every((n) => n >= 1 && n <= 3)).toBe(true);
    expect(cops.size).toBe(3);
    for (const c of all) {
      expect(c.end - c.start).toBeGreaterThanOrEqual(CHASE_MIN);
      expect(c.end - c.start).toBeLessThanOrEqual(CHASE_MAX);
      expect(c.end).toBeLessThan((c.n + 1) * CHASE_SLOT);
      // Shows while it runs, gone after.
      expect(chaseShows(c, (c.start + c.end) / 2)).toBe(1);
      expect(chaseShows(c, c.end + 0.1)).toBe(0);
      expect(chaseShows(c, c.start - 0.1)).toBe(0);
    }
    // The chase now: on while it runs, then none until the next.
    resetChases();
    const c = all[0] as Chase;
    expect(chaseNow((c.start + c.end) / 2, EYE)?.n).toBe(c.n);
    expect(chaseNow(c.end + 0.5, EYE)).toBeNull();
    resetChases();
  });

  it('races at the Ship’s street boost, the cruisers on its tail flying the path it flew', () => {
    expect(CHASE_SPEED).toBeCloseTo(FLY_SPEED * STREET_BOOST);
    for (const c of chases().slice(0, 12)) {
      for (let t = c.start + 2; t < c.end; t += 1.7) {
        const a = at(c, t);
        const b = at(c, t + 0.5);
        expect(Math.abs(b[2] - a[2]) / 0.5).toBeCloseTo(CHASE_SPEED, 5);
        expect(Math.sign(b[2] - a[2])).toBe(c.sgn);
        for (let i = 0; i < c.cops; i++) {
          const p: Vec3 = [0, 0, 0];
          const f: Vec3 = [0, 0, 0];
          cruiserAt(c, i, t, p, f);
          // On the fugitive's path a moment before: the same place along, a loose file across.
          const was = at(c, t - (COP_LAGS[i] as number));
          expect(Math.abs(p[2] - was[2])).toBeLessThan(2);
          expect(Math.hypot(p[0] - was[0], p[1] - was[1])).toBeLessThan(2.2);
          // Behind it, heading its way.
          expect((a[2] - p[2]) * c.sgn).toBeGreaterThan(15);
          expect(f[2] * c.sgn).toBeGreaterThan(0.95);
        }
      }
    }
  });

  it('runs down a racing corridor, inside its walls, nothing solid in the way', () => {
    for (const c of chases().slice(0, 10)) {
      const lx = c.x - nearest(0, c.x, TILE_X);
      expect(CORRIDOR_X.some((x) => Math.abs(lx - x) < 1e-6)).toBe(true);
      for (let t = c.start; t <= c.end; t += 0.6) {
        const ps: { p: Vec3; f: Vec3; i: number }[] = [];
        const a = at(c, t);
        const b = at(c, t + 0.05);
        ps.push({ p: a, f: [b[0] - a[0], b[1] - a[1], b[2] - a[2]], i: -1 });
        for (let i = 0; i < c.cops; i++) {
          const p: Vec3 = [0, 0, 0];
          const f: Vec3 = [0, 0, 0];
          cruiserAt(c, i, t, p, f);
          ps.push({ p, f, i });
        }
        for (const { p, f, i } of ps) {
          expect(Math.abs(p[0] - c.x)).toBeLessThan(WEAVE_X + 2);
          const n = i < 0 ? FUGITIVE_SITES : CRUISER_SITES;
          for (let s = 0; s < n; s += 3) {
            if (i < 0) fugitiveSite(p, f, s, t, 1, o);
            else cruiserSite(p, f, i, s, t, 1, o);
            expect(blocked([o[0] as number, o[1] as number, o[2] as number])).toBe(false);
          }
        }
      }
    }
  }, 60_000);

  it('now and then passes right by the player, down the corridor nearest', () => {
    const near = chases().filter((c) => c.near);
    expect(near.length).toBeGreaterThan(5);
    for (const c of near) {
      expect(Math.abs(c.x - EYE[0])).toBeLessThanOrEqual(78 + 1e-6);
      let closest = Number.POSITIVE_INFINITY;
      for (let t = c.start; t <= c.end; t += 0.25)
        closest = Math.min(closest, Math.abs(at(c, t)[2] - EYE[2]));
      expect(closest).toBeLessThan(8);
    }
  });

  it('draws the fugitive and its cruisers near the eye while a chase runs, nothing between chases', () => {
    const c = chases().find((k) => k.near) as Chase;
    resetChases();
    const out: Item[] = [];
    // Facing up the corridor toward where the chase comes from.
    const eye: Vec3 = [c.x + 6, GROUND + 22, EYE[2]];
    policeItems(eye, [0, 0, -c.sgn], c.start + 2, out);
    expect(out.length).toBe(1 + c.cops);
    for (const it of out)
      for (let s = 0; s < it.count; s++) {
        expect(it.site(s, o)).toBe(true);
        expect(o.every(Number.isFinite)).toBe(true);
      }
    const none: Item[] = [];
    policeItems(eye, [0, 0, -c.sgn], c.end + 1, none);
    expect(none.length).toBe(0);
    resetChases();
  });
});

describe('the space police: within the grain budget', () => {
  it('keeps to a phone’s and a computer’s grains with a chase, UFOs and flying cars about', () => {
    const dt = 1 / 60;
    for (const n of [6500, 15000]) {
      const ps = makeParticles(n);
      // A slot whose chase passes by the player.
      const c = Array.from({ length: 60 }, (_, k) => planChase(k, EYE)).find(
        (k) => k?.near,
      ) as Chase;
      let t = c.start + 1;
      resetChases();
      setFly(false, [], 0, t);
      setFly(true, [], dt, t);
      placeShip([CORRIDOR_X[1] as number, GROUND + 20, 900], c.sgn > 0 ? 0 : Math.PI);
      let lit = 0;
      let finite = true;
      for (let k = 0; k < 3; k++) {
        t += dt;
        setFly(true, [], dt, t);
        pieceCamera(ship, t);
        lit = 0;
        for (const p of ps) {
          const g = pieceAt(p, ship, t);
          finite &&= g.pos.every(Number.isFinite) && g.rgb.every(Number.isFinite);
          if (g.rgb[0] + g.rgb[1] + g.rgb[2] > 0.004) lit++;
        }
      }
      expect(finite).toBe(true);
      expect(lit).toBeLessThanOrEqual(n);
      expect(lit).toBeGreaterThan(n * 0.3);
      setFly(false, [], 0, 0);
      resetChases();
    }
  }, 120_000);
});
