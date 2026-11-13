import { describe, expect, it } from 'vitest';
import type { Vec3 } from './bigbang';
import { blocked, blockTower, floorAt, pulseAt } from './city-game';
import { BLOCK_Z, GROUND, type Item, TILE_X, TILE_Z } from './city-grid';
import { cityMapData } from './city-minimap';
import {
  DEEP,
  DEEP_MOUTHS,
  DEEP_RUNS,
  DEEP_W,
  THROUGH,
  underAt,
  underEyeY,
  underItems,
  underSeeThrough,
} from './city-under';

const mid = (r: (typeof DEEP_RUNS)[number], y: number): Vec3 => {
  const s = (r.s0 + r.s1) / 2;
  return r.axis === 0 ? [s, y, r.c] : [r.c, y, s];
};

describe('the Deep Line under the city', () => {
  it('lets you fly every run of it, held in by its rock, the street solid over it', () => {
    for (const r of DEEP_RUNS) {
      const q = mid(r, 0);
      const u = underAt(q[0], q[2]);
      expect(u).not.toBeNull();
      const f = (u as NonNullable<typeof u>).floor;
      expect(floorAt(q[0], q[2])).toBeLessThan(GROUND);
      expect(blocked([q[0], f + 5, q[2]])).toBe(false);
      expect(blocked([q[0], f + 1, q[2]])).toBe(true);
      // Over a closed run the street is solid; over a ramp you can drop in.
      expect(blocked([q[0], GROUND - 2, q[2]])).toBe(!r.open);
      expect(blocked([q[0], GROUND + 4, q[2]])).toBe(false);
    }
  });

  it('keeps its walls, and repeats with the plan', () => {
    const r = DEEP_RUNS[2] as (typeof DEEP_RUNS)[number];
    const q = mid(r, DEEP + 5);
    const side: Vec3 =
      r.axis === 0 ? [q[0], q[1], q[2] + DEEP_W + 1] : [q[0] + DEEP_W + 1, q[1], q[2]];
    expect(blocked(side)).toBe(true);
    expect(blocked([q[0] + TILE_X, q[1], q[2] + 2 * TILE_Z])).toBe(false);
  });

  it('turns its corners: the runs meet with room to fly round', () => {
    // The corner under (-130, 340): from the westward run into the southward one.
    const c: Vec3 = [-130, DEEP + 5, 10 * BLOCK_Z];
    expect(blocked(c)).toBe(false);
    expect(blocked([c[0] + 3, c[1], c[2] - 3])).toBe(false);
  });

  it('comes out in a canal with no lip at its mouth', () => {
    const r = DEEP_RUNS[DEEP_RUNS.length - 1] as (typeof DEEP_RUNS)[number];
    for (let z = r.s1 - 6; z <= r.s1 + 3; z += 0.5)
      expect(blocked([r.c, GROUND - 10, z])).toBe(false);
  });

  it('opens on the street in lit ramps you can see, named on the map, dashed', () => {
    expect(DEEP_MOUTHS.length).toBe(2);
    for (const m of DEEP_MOUTHS) {
      expect(underAt(m.x, m.z + m.down * 3)?.open).toBe(true);
      expect(blocked([m.x, GROUND + 3, m.z - m.down * 6])).toBe(false);
    }
    const data = cityMapData();
    expect(data.tunnels?.length).toBe(DEEP_RUNS.length + 1);
    expect(data.places.filter((p) => p.name === 'Deep Line').length).toBe(2);
  });

  it('keeps the camera inside, and hides the city overhead from deep in it', () => {
    const r = DEEP_RUNS[3] as (typeof DEEP_RUNS)[number];
    const c = mid(r, DEEP + 5);
    const y = underEyeY(c, GROUND + 40) as number;
    expect(y).toBeLessThan(DEEP + 11);
    expect(underEyeY([c[0], GROUND + 10, c[2]], GROUND + 13)).toBeNull();
    const see = underSeeThrough(c);
    expect(see).not.toBeNull();
    expect(see?.(0, GROUND + 20, 0)).toBe(false);
    expect(see?.(0, DEEP + 3, 0)).toBe(true);
    expect(underSeeThrough([c[0], GROUND + 10, c[2]])).toBeNull();
  });

  it('draws rings that light up in pulses, finite, only the ramps from the street', () => {
    const o = [0, 0, 0, 0, 0, 0];
    const deep = mid(DEEP_RUNS[1] as (typeof DEEP_RUNS)[number], DEEP + 5);
    const items: Item[] = [];
    underItems(deep, 3, 160, pulseAt, () => true, items);
    expect(items.length).toBeGreaterThan(2);
    const street: Item[] = [];
    underItems([-70, GROUND + 10, 1000], 3, 160, pulseAt, () => true, street);
    // From the street far from a ramp, nothing of the tunnel shows.
    expect(street.length).toBe(0);
    const ramp: Item[] = [];
    const m = DEEP_MOUTHS[0] as (typeof DEEP_MOUTHS)[number];
    underItems([m.x, GROUND + 8, m.z + 30], 3, 160, pulseAt, () => true, ramp);
    expect(ramp.length).toBeGreaterThan(0);
    for (const it of [...items, ...ramp]) {
      for (let s = 0; s < it.count; s += 7) {
        if (!it.site(s, o)) continue;
        expect(o.every(Number.isFinite)).toBe(true);
        expect(Math.min(o[3] as number, o[4] as number, o[5] as number)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('the tunnel through a row of towers', () => {
  it('bores every tower of the row on one line, so you can fly straight through', () => {
    for (let J = THROUGH.J0; J <= THROUGH.J1; J++) {
      const tw = blockTower(2, J);
      expect(tw.shape).toBe('box');
      expect(tw.bore?.through).toBe(true);
      expect(tw.x).toBe(THROUGH.x);
      expect(tw.h).toBeGreaterThan(THROUGH.y + THROUGH.hh + 2 - GROUND);
    }
    for (let z = THROUGH.z0 + 1; z < THROUGH.z1; z += 1)
      expect(blocked([THROUGH.x, THROUGH.y, z])).toBe(false);
    const tw = blockTower(2, THROUGH.J0 + 1);
    expect(blocked([THROUGH.x, THROUGH.y + THROUGH.hh + 1, tw.z])).toBe(true);
  });
});
