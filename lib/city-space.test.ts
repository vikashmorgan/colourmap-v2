import { afterEach, describe, expect, it } from 'vitest';

import { makeParticles, type Vec3 } from './bigbang';
import {
  FLY_SPEED,
  fade,
  flier,
  PHASES,
  pieceAt,
  pieceBackground,
  placeShip,
  SPACE_PACE,
  setFly,
  tally,
} from './city';
import { type Item, TILE_X, TILE_Z } from './city-grid';
import {
  CITY_PORTALS,
  cityPortal,
  cityPortalItems,
  currentSystem,
  enterTunnel,
  inSpace,
  keepOut,
  type Portal,
  planetAt,
  portalStep,
  RING_GAP,
  RING_RADII,
  RING_WINDOW,
  resetSpace,
  ringCrossed,
  ringOf,
  ringPull,
  SYSTEMS,
  spaceItems,
  spaceMode,
  TUNNEL_SECONDS,
  tunnelMach,
  tunnelStep,
} from './city-space';

const ship = PHASES.findIndex((p) => p.id === 'ship');
const dt = 1 / 60;
const yawAlong = (a: Vec3) => Math.atan2(-a[0], -a[2]);

/** Flying the ship straight through portal P's rings, from just before its first. */
function flyThrough(P: Portal, t0: number, skip = -1): number {
  let t = t0;
  const from = ringOf(P, 0).c;
  let q: Vec3 = [from[0] - P.axis[0] * 5, from[1] - P.axis[1] * 5, from[2] - P.axis[2] * 5];
  const end = (RING_RADII.length - 1) * RING_GAP + 10;
  for (let s = 0; s < end + 5; s += 1) {
    const next: Vec3 = [q[0] + P.axis[0], q[1] + P.axis[1], q[2] + P.axis[2]];
    // Skipping a ring: go round it, off to the side.
    const side = skip >= 0 && Math.abs(s - 5 - skip * RING_GAP) < 2 ? 40 : 0;
    const a: Vec3 = [q[0] + side, q[1], q[2]];
    const b: Vec3 = [next[0] + side, next[1], next[2]];
    t += 0.05;
    const g = portalStep(a, b, t);
    if (g) return t;
    q = next;
  }
  return -1;
}

afterEach(() => resetSpace());

describe('hyperspace (queued: "ultraboost ring portals high in the sky into hyperspace")', () => {
  it('has a few portals high over the city, rings shrinking big to small, every tile', () => {
    expect(CITY_PORTALS.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < RING_RADII.length; i++)
      expect(RING_RADII[i]).toBeLessThan(RING_RADII[i - 1] as number);
    const P = cityPortal(0, [0, 0, 0]);
    const Q = cityPortal(0, [TILE_X * 2, 0, TILE_Z]);
    expect(Q.at[0] - P.at[0]).toBeCloseTo(TILE_X * 2, 6);
    expect(Q.at[2] - P.at[2]).toBeCloseTo(TILE_Z, 6);
    // Seen from far, high up: drawn from over a thousand away.
    const out: Item[] = [];
    cityPortalItems([P.at[0] + 900, P.at[1] + 200, P.at[2]], 3, out);
    expect(out.length).toBeGreaterThan(0);
    const o = [0, 0, 0, 0, 0, 0];
    for (const it of out) {
      for (let s = 0; s < it.count; s += 3) {
        expect(it.site(s, o)).toBe(true);
        expect(o.every(Number.isFinite)).toBe(true);
      }
    }
  });

  it('opens only when every ring is flown through in order', () => {
    const P = cityPortal(1, [0, 0, 0]);
    // Through a ring's middle counts; outside its rim does not.
    const c = ringOf(P, 0).c;
    const before: Vec3 = [c[0] - P.axis[0], c[1], c[2] - P.axis[2]];
    const after: Vec3 = [c[0] + P.axis[0], c[1], c[2] + P.axis[2]];
    expect(ringCrossed(P, before, after)).toBe(0);
    expect(
      ringCrossed(P, [before[0], before[1] + 30, before[2]], [after[0], after[1] + 30, after[2]]),
    ).toBe(-1);
    // The wrong way through does not count.
    expect(ringCrossed(P, after, before)).toBe(-1);
    // Missing one ring is forgiven (2026-11-13: "boost rings don't work"); missing the last is not.
    expect(flyThrough(P, 10, 2)).toBeGreaterThan(0);
    resetSpace();
    expect(flyThrough(P, 10, RING_RADII.length - 1)).toBe(-1);
    resetSpace();
    expect(flyThrough(P, 30)).toBeGreaterThan(0);
    // Too slow between two rings: the run starts over.
    resetSpace();
    const step = (q: Vec3, t: number, back = false) => {
      const s = back ? -1 : 1;
      return portalStep(
        [q[0] - s * P.axis[0], q[1], q[2] - s * P.axis[2]],
        [q[0] + s * P.axis[0], q[1], q[2] + s * P.axis[2]],
        t,
      );
    };
    expect(step(ringOf(P, 0).c, 100)).toBeNull();
    expect(step(ringOf(P, 1).c, 101)).toBeNull();
    expect(step(ringOf(P, 2).c, 101 + RING_WINDOW + 1)).toBeNull();
    for (let i = 3; i < RING_RADII.length; i++) expect(step(ringOf(P, i).c, 108 + i)).toBeNull();
    // Flown the other way, small ring first, it opens too.
    resetSpace();
    let opened = null;
    for (let i = RING_RADII.length - 1; i >= 0; i--)
      opened = step(ringOf(P, i).c, 200 + (RING_RADII.length - i), true) ?? opened;
    expect(opened).not.toBeNull();
  });

  it('pulls the ship gently toward the next ring ahead, and not from far off or side on', () => {
    const P = cityPortal(0, [0, 0, 0]);
    const c0 = ringOf(P, 0).c;
    const from: Vec3 = [c0[0] + 15, c0[1] - 10, c0[2] - P.axis[2] * 60];
    expect(ringPull(from, P.axis)).toEqual(c0);
    // From the far side, flying back, the nearest ring ahead is the small one.
    const c4 = ringOf(P, RING_RADII.length - 1).c;
    const back: Vec3 = [c4[0], c4[1], c4[2] + P.axis[2] * 40];
    expect(ringPull(back, [-P.axis[0], -P.axis[1], -P.axis[2]])).toEqual(c4);
    expect(ringPull([c0[0], c0[1], c0[2] - P.axis[2] * 300], P.axis)).toBeNull();
    expect(ringPull(from, [1, 0, 0])).toBeNull();
  });

  it('the tunnel: Mach climbing and easing, streaks round the eye, then a system facing its star', () => {
    expect(tunnelMach(0)).toBeLessThan(5);
    expect(tunnelMach(0.5)).toBeGreaterThan(25);
    expect(tunnelMach(1)).toBeLessThan(5);
    enterTunnel(cityPortal(0, [0, 0, 0]), 50);
    expect(spaceMode()).toBe('tunnel');
    const items = spaceItems([0, 0, 0], [0, 0, -1], 51);
    expect(items.length).toBe(1);
    const o = [0, 0, 0, 0, 0, 0];
    for (let s = 0; s < (items[0] as Item).count; s += 5) {
      (items[0] as Item).site(s, o);
      expect(o.every(Number.isFinite)).toBe(true);
    }
    expect(tunnelStep(dt, 52)).toBeNull();
    const a = tunnelStep(dt, 50 + TUNNEL_SECONDS + 0.01);
    expect(a?.city).toBe(false);
    expect(spaceMode()).toBe('space');
    const S = currentSystem();
    expect(a?.pos).toEqual(S.arrive);
    // Facing the star (at the origin).
    const f: Vec3 = [-Math.sin(a?.yaw ?? 0), 0, -Math.cos(a?.yaw ?? 0)];
    expect(f[0] * -S.arrive[0] + f[2] * -S.arrive[2]).toBeGreaterThan(0);
  });

  it('three systems: a star, planets with rings, moons and air, all drawn finite and lit', () => {
    expect(SYSTEMS.length).toBe(3);
    expect(new Set(SYSTEMS.map((s) => s.name)).size).toBe(3);
    const all = SYSTEMS.flatMap((s) => s.planets);
    expect(all.some((p) => p.rings)).toBe(true);
    expect(all.some((p) => p.moons?.length)).toBe(true);
    expect(all.some((p) => p.atmosphere)).toBe(true);
    for (const S of SYSTEMS) {
      // A gate on to the next system and one home.
      expect(S.portals.some((p) => p.to === 'city')).toBe(true);
      expect(S.portals.some((p) => typeof p.to === 'number')).toBe(true);
    }
    enterTunnel(cityPortal(0, [0, 0, 0]), 0);
    tunnelStep(dt, TUNNEL_SECONDS + 1);
    const eye: Vec3 = [0, 80, 700];
    const items = spaceItems(eye, [0, 0, -1], 20);
    expect(items.length).toBeGreaterThan(8);
    const o = [0, 0, 0, 0, 0, 0];
    let lit = 0;
    let drawn = 0;
    for (const it of items) {
      for (let s = 0; s < it.count; s += 11) {
        if (!it.site(s, o)) continue;
        drawn++;
        expect(o.every(Number.isFinite)).toBe(true);
        expect(Math.min(o[3], o[4], o[5])).toBeGreaterThanOrEqual(0);
        if (Math.max(o[3], o[4], o[5]) > 0.2) lit++;
      }
    }
    expect(drawn).toBeGreaterThan(500);
    expect(lit).toBeGreaterThan(100);
    // The planets move round their star, slowly.
    const P = SYSTEMS[0]?.planets[0];
    if (!P) throw new Error('no planet');
    const a = planetAt(P, 0);
    const b = planetAt(P, 1);
    expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeGreaterThan(1);
    expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeLessThan(30);
    // Nothing flies into a planet or the star.
    const inside = keepOut([...a], 0);
    expect(Math.hypot(inside[0] - a[0], inside[1] - a[1], inside[2] - a[2])).toBeGreaterThan(P.r);
    const star = keepOut([1, 0, 0], 0);
    expect(Math.hypot(star[0], star[1], star[2])).toBeGreaterThan(SYSTEMS[0]?.star.r ?? 0);
  });

  it('in the game: through a city portal, the tunnel, a system, a gate home, the city again', () => {
    const P = CITY_PORTALS[0] as Portal;
    let t = 5000;
    const tick = (keys: string[]) => {
      t += dt;
      setFly(true, keys, dt, t);
    };
    setFly(false, [], 0, t);
    tick([]);
    // Fly the ship through the Avenue Gate's rings, boosted, high up.
    const start = ringOf(P, 0).c;
    placeShip([start[0] - P.axis[0] * 8, start[1], start[2] - P.axis[2] * 8], yawAlong(P.axis));
    // Boost and climb a moment for the super boost that holds you this high, then level out.
    tick([' ', 'w']);
    placeShip([start[0] - P.axis[0] * 8, start[1], start[2] - P.axis[2] * 8], yawAlong(P.axis));
    for (let f = 0; f < 60 * 12 && !inSpace(); f++) tick([' ']);
    expect(spaceMode()).toBe('tunnel');
    expect(tally()).toMatch(/^Hyperspace · Mach \d+$/);
    expect(pieceBackground(ship)).not.toBeNull();
    for (let f = 0; f < 60 * (TUNNEL_SECONDS + 0.5); f++) tick([]);
    expect(spaceMode()).toBe('space');
    expect(tally()).toContain(currentSystem().name);
    // The picture out there: finite, and space does not dim with distance.
    const ps = makeParticles(3000);
    for (const p of ps) {
      const g = pieceAt(p, ship, t);
      expect([...g.pos, ...g.rgb].every(Number.isFinite)).toBe(true);
    }
    expect(fade([0, 0, 2000], [0, 0, 0])).toBe(1);
    // Flying out there is fast.
    const c0 = [...flier(t).c];
    for (let f = 0; f < 120; f++) tick(['e']);
    const c1 = flier(t).c;
    expect(Math.hypot(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2])).toBeGreaterThan(
      FLY_SPEED * 2 * 2,
    );
    // Through the gate home: back over the city, just past the portal left by.
    const home = currentSystem().portals.find((p) => p.to === 'city') as Portal;
    const h0 = ringOf(home, 0).c;
    placeShip([h0[0] - home.axis[0] * 8, h0[1], h0[2] - home.axis[2] * 8], yawAlong(home.axis));
    for (let f = 0; f < 60 * 12 && spaceMode() === 'space'; f++) tick([' ']);
    expect(spaceMode()).toBe('tunnel');
    for (let f = 0; f < 60 * (TUNNEL_SECONDS + 0.5); f++) tick([]);
    expect(inSpace()).toBe(false);
    expect(pieceBackground(ship)).toBeNull();
    expect(SPACE_PACE).toBeGreaterThan(1);
    setFly(false, [], 0, 0);
  });
});
