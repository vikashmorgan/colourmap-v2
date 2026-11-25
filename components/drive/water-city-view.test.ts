import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { KRAKEN, newRipples } from '@/lib/art/chinatown-lake';
import { makeTrackWorld, WATER_TRACK } from '@/lib/art/track';
import { WATER_LAP } from '@/lib/art/water-city';

import { buildLakeView } from './lake-view';
import { buildWaterCityView, waterLairsNear, waterSharkSpots } from './water-city-view';

const tr = makeTrackWorld(WATER_TRACK).track;

describe('Water City as you see it', () => {
  it('finds the sharks and the kraken near you, lap after lap', () => {
    expect(waterLairsNear(5600).map((l) => l.s)).toContain(5650);
    expect(waterLairsNear(WATER_LAP + 6700).map((l) => l.s)).toContain(WATER_LAP + 6750);
    expect(waterLairsNear(500)).toHaveLength(0);
    const spots = waterSharkSpots(6000);
    expect(spots.length).toBeGreaterThan(2);
    for (const sp of spots) expect(Math.abs(sp.s - 6000)).toBeLessThan(1500);
  });

  it('builds towers, decks and portals ahead of you, and the kraken once woken', () => {
    const view = buildWaterCityView(tr);
    const frame = (s: number, woke: number | null) => ({
      cam: { x: 0, y: 0, z: 4 },
      s,
      ripples: newRipples(),
      lairs: waterLairsNear(s).map((lair) => ({ lair, woke, past: s - lair.s, aim: { s, u: 0 } })),
      rain: 1,
    });
    view.update(0, 0, 10, 1 / 60, frame(2000, null));
    let meshes = 0;
    view.group.traverse((o) => {
      if (o instanceof THREE.Mesh) meshes++;
    });
    expect(meshes).toBeGreaterThan(10);
    // Woken 3 s ago by the first lair: its tentacles are drawn.
    view.update(0, 0, 13, 1 / 60, frame(5600, 10));
    let flesh = 0;
    view.group.traverse((o) => {
      if (o instanceof THREE.InstancedMesh && o.count > 100) flesh = Math.max(flesh, o.count);
    });
    expect(flesh).toBeGreaterThan(KRAKEN.LAIRS.length * 10);
    view.dispose();
  });

  it('stands the lake’s far gate only once Water City is found', () => {
    const lake = buildLakeView(0, 0, 0);
    const frame = (found: boolean) => ({
      cam: { x: -1000, y: 0, z: -8 },
      s: -1000,
      run: { lit: [false, false, false, false, false, false, false], found },
      ripples: newRipples(),
      woke: [null, null],
      past: [0, 0],
      aim: [
        { s: 0, u: 0 },
        { s: 0, u: 0 },
      ],
      storm: 1,
      found,
    });
    const big = () => {
      let on = 0;
      lake.group.traverse((o) => {
        if (o.visible && o instanceof THREE.Group && o.scale.x > 1.5) on++;
      });
      return on;
    };
    lake.update(0, 0, 1, 1 / 60, frame(false));
    expect(big()).toBe(0);
    lake.update(0, 0, 1, 1 / 60, frame(true));
    expect(big()).toBe(1);
    lake.dispose();
  });
});
