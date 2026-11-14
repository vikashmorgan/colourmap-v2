/*
 * Quarter starts and fast travel (docs/specs/art-city.md, "Quarter starts and fast travel"),
 * 2026-11-14: "ability to go to main street or main starting point of each quarter. so there is a
 * special road on each quarter that has a great view etc..." and "from map i can click to the diff
 * spots and fast travel."
 */
import { afterEach, describe, expect, it } from 'vitest';

import { PHASES, placeShip, setFly, shipNow, travelling, travelTo } from './city';
import { inCanyon } from './city-canyon';
import { blocked, DISTRICTS, type DistrictId, districtAt, LANDMARKS } from './city-game';
import { GROUND, TILE_X, TILE_Z } from './city-grid';
import { cityMapData } from './city-minimap';
import { skySpot } from './city-skyport';
import { STATIONS } from './city-stations';
import {
  hopFrom,
  nearestCopy,
  placeSpot,
  QUARTER_STARTS,
  quarterStart,
  spotFor,
  yawToward,
} from './city-travel';

const heading = (yaw: number): [number, number] => [-Math.sin(yaw), -Math.cos(yaw)];
const dt = 1 / 60;
let t = 100;
const run = (keys: string[], seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    t += dt;
    setFly(true, keys, dt, t);
  }
};

afterEach(() => {
  // Back on the route for the tests after.
  t += 10;
  setFly(false, [], 0, t);
});

describe('quarter starts', () => {
  it('has one start for each of the twelve quarters', () => {
    expect(QUARTER_STARTS.map((q) => q.d).sort()).toEqual(
      (Object.keys(DISTRICTS) as DistrictId[]).sort(),
    );
    for (const q of QUARTER_STARTS) expect(q.name).toBe(DISTRICTS[q.d].name);
  });

  it('stands each start in its own quarter, raised over the street and clear of every wall', () => {
    for (const q of QUARTER_STARTS) {
      expect(districtAt(q.pos[0], q.pos[2]), q.d).toBe(q.d);
      expect(q.pos[1], q.d).toBeGreaterThan(GROUND + 30);
      expect(q.pos[1], q.d).toBeLessThan(GROUND + 90);
      expect(blocked(q.pos), q.d).toBe(false);
      // A copy far off in the endless city is as clear.
      expect(blocked([q.pos[0] + 3 * TILE_X, q.pos[1], q.pos[2] - 2 * TILE_Z]), q.d).toBe(false);
    }
  });

  it('faces each start down its road toward its view, a long way off', () => {
    for (const q of QUARTER_STARTS) {
      const [fx, fz] = heading(q.yaw);
      const dx = q.view[0] - q.pos[0];
      const dz = q.view[1] - q.pos[2];
      const d = Math.hypot(dx, dz);
      expect(d, q.d).toBeGreaterThan(100);
      expect((fx * dx + fz * dz) / d, q.d).toBeGreaterThan(0.99);
      // The road there is open: no wall on the way at the start's height, most of the way.
      let walls = 0;
      for (let s = 4; s < d - 30; s += 4)
        if (blocked([q.pos[0] + fx * s, q.pos[1], q.pos[2] + fz * s])) walls++;
      expect(walls, q.d).toBe(0);
    }
  });

  it('looks at the landmark where a quarter has one, down the Neon Canyon in the market', () => {
    for (const l of LANDMARKS) {
      if (l.kind === 'race') continue;
      expect(quarterStart(l.d).view).toEqual([l.x, l.z]);
    }
    const m = quarterStart('market');
    expect(inCanyon(m.pos[0], m.pos[2], 2)).toBe(true);
  });

  it('hops to the next quarter and the one before, round the plan', () => {
    const c = quarterStart('chinatown');
    expect(hopFrom(c.pos[0], c.pos[2], 1).d).toBe('indian');
    expect(hopFrom(c.pos[0], c.pos[2], -1).d).toBe('code');
    const code = quarterStart('code');
    expect(hopFrom(code.pos[0], code.pos[2], 1).d).toBe('chinatown');
  });

  it('brings a start to the copy nearest the ship', () => {
    const q = quarterStart('egypt');
    const far: [number, number, number] = [q.pos[0] + 5 * TILE_X + 40, 0, q.pos[2] - 7 * TILE_Z];
    const c = nearestCopy(q.pos, far);
    expect(Math.abs(c[0] - far[0])).toBeLessThanOrEqual(TILE_X / 2);
    expect(Math.abs(c[2] - far[2])).toBeLessThanOrEqual(TILE_Z / 2);
    expect(c[1]).toBe(q.pos[1]);
  });

  it('leads every named place on the map to a clear spot facing it', () => {
    for (const p of cityMapData().places) {
      const s = placeSpot(p.x, p.z, p.y);
      expect(blocked(s.pos), p.name).toBe(false);
      expect(s.pos[1], p.name).toBeGreaterThan(GROUND + 30);
      const [fx, fz] = heading(s.yaw);
      const target = QUARTER_STARTS.find((q) => q === s)?.view ?? [p.x, p.z];
      const dx = target[0] - s.pos[0];
      const dz = target[1] - s.pos[2];
      expect((fx * dx + fz * dz) / Math.hypot(dx, dz), p.name).toBeGreaterThan(0.99);
    }
    expect(yawToward([0, 0], [0, -10])).toBeCloseTo(0);
  });
});

describe('fast travel', () => {
  it('flies the ship to a quarter start in about a second, piloted, clear, facing its view', () => {
    expect(PHASES.some((p) => p.id === 'ship')).toBe(true);
    t += 10;
    setFly(false, [], 0, t);
    setFly(true, [], dt, t);
    for (const d of ['market', 'golden', 'canals', 'chinatown'] as DistrictId[]) {
      const q = quarterStart(d);
      const from = shipNow().c;
      travelTo(q);
      expect(travelling()).toBe(true);
      // Under a second and a bit, however far.
      let frames = 0;
      while (travelling() && frames < 120) {
        run([], dt);
        frames++;
      }
      expect(travelling()).toBe(false);
      expect(frames / 60).toBeLessThanOrEqual(1.01);
      const { c, f } = shipNow();
      const at = nearestCopy(q.pos, from);
      expect(Math.hypot(c[0] - at[0], c[1] - at[1], c[2] - at[2]), d).toBeLessThan(3);
      expect(blocked(c), d).toBe(false);
      const [fx, fz] = heading(q.yaw);
      expect(f[0] * fx + f[2] * fz, d).toBeGreaterThan(0.95);
    }
  });

  it('eases on the way: each frame moves a little, never a jump', () => {
    placeShip(quarterStart('chinatown').pos, 0);
    t += dt;
    setFly(true, [], dt, t);
    travelTo(quarterStart('code'));
    let was = shipNow().c;
    let most = 0;
    while (travelling()) {
      run([], dt);
      const c = shipNow().c;
      most = Math.max(most, Math.hypot(c[0] - was[0], c[1] - was[1], c[2] - was[2]));
      was = [...c];
    }
    // The tile's half length in about a second: a few tens a frame at the fastest, no snap.
    expect(most).toBeLessThan(60);
    expect(most).toBeGreaterThan(0);
  });

  it('flies to a flying station or the ring parcours from the map, and holds its height up there', () => {
    t += dt;
    setFly(true, [], dt, t);
    for (const go of [
      { sky: 0, name: STATIONS[0]?.name ?? '' },
      { sky: 9, name: STATIONS[9]?.name ?? '' },
      { sky: 'parcours' as const, name: 'Ring parcours' },
    ]) {
      const spot = spotFor(go);
      expect(spot).toEqual(skySpot(go.sky));
      const from = shipNow().c;
      travelTo(spot);
      run([], 1.1);
      expect(travelling()).toBe(false);
      const at = nearestCopy(spot.pos, from);
      expect(
        Math.hypot(...([0, 1, 2] as const).map((k) => shipNow().c[k] - at[k])),
        go.name,
      ).toBeLessThan(3);
      // Over the towers' sky, flying on level: it neither sinks nor climbs away.
      run([], 1);
      expect(Math.abs(shipNow().c[1] - at[1]), go.name).toBeLessThan(2);
      expect(shipNow().c[1]).toBeGreaterThan(GROUND + 200);
    }
    setFly(false, [], 0, 0);
  });

  it('hops with [ and ] while flying', () => {
    const c = quarterStart('heights');
    placeShip(c.pos, c.yaw);
    t += dt;
    setFly(true, [], dt, t);
    run([']'], dt);
    run([], 1.2);
    expect(districtAt(shipNow().c[0], shipNow().c[2])).toBe('canals');
    run(['['], dt);
    run([], 1.2);
    expect(districtAt(shipNow().c[0], shipNow().c[2])).toBe('heights');
    // Flying on after: piloted, under the keys.
    run(['w'], 0.5);
    expect(blocked(shipNow().c)).toBe(false);
  });
});
