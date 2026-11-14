import { describe, expect, it } from 'vitest';

import type { RGB, Vec3 } from './bigbang';
import { route, STRATOSPHERE } from './city';
import {
  BIG_SQUARES,
  BIG_STRETCH,
  BLOCK_STRETCH,
  bigHeight,
  bigItems,
  openBlock,
  studioBlockHeight,
} from './city-big';
import {
  BURST_HIGH,
  BURST_LOW,
  bloomAt,
  burstSite,
  burstsAt,
  fireworkItems,
  fireworkPlaces,
  LIFE_MAX,
  RISE,
  SPARKS,
} from './city-fireworks';
import { blocked, blockTower, DISTRICTS, districtAt, gameItems, LANDMARKS } from './city-game';
import { AVENUE, BLOCK_X, BLOCK_Z, GROUND, TILE_Z } from './city-grid';
import { crownItem, crownKey, crownModel, landmarkHeight } from './city-landmarks';
import { railCeiling } from './city-metro';
import { TRACKS } from './city-race';

/** How tall each landmark stood before 2026-11-14 (measured from its grains). */
const OLD: Record<string, number> = {
  pagoda: 64,
  race: 10,
  shikhara: 55,
  mosque: 51,
  nova: 24,
  temples: 20,
  factories: 31,
  domes: 9,
  pyramid: 36,
  dataspire: 165,
};

const cosine = (a: RGB, b: RGB) =>
  (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b) || 1);

describe('taller landmarks (2026-11-14: "they need to be much bigger")', () => {
  it('raises every small landmark two to ten times, over every tower round its plaza', () => {
    for (const L of LANDMARKS) {
      const key = crownKey(L.kind, L.set);
      if (!key) {
        expect(L.kind).toBe('spire');
        expect(landmarkHeight('spire')).toBeGreaterThan(190);
        continue;
      }
      const h = landmarkHeight(key);
      expect(h).toBeGreaterThanOrEqual(key === 'dataspire' ? 160 : 128);
      if ((OLD[key] as number) < 100) expect(h).toBeGreaterThanOrEqual(2 * (OLD[key] as number));
      // Taller than every tower of its quarter within four blocks of its crossing.
      const I0 = Math.round(L.x / BLOCK_X);
      const J0 = Math.round(L.z / BLOCK_Z);
      for (let I = I0 - 4; I < I0 + 4; I++)
        for (let J = J0 - 4; J < J0 + 4; J++) {
          const tw = blockTower(I, J);
          if (tw.d === L.d) expect(tw.h).toBeLessThan(h);
        }
    }
  });

  it('draws each crown up to its height, finite, in its quarter’s light, mellow', () => {
    const o = [0, 0, 0, 0, 0, 0];
    for (const L of LANDMARKS) {
      const key = crownKey(L.kind, L.set);
      if (!key) continue;
      const M = crownModel(key);
      const it = crownItem(key, L.x, L.z, [L.x, GROUND + 40, L.z - 300], 12, 1, 1);
      let top = Number.NEGATIVE_INFINITY;
      let rx = 0;
      let rz = 0;
      for (let s = 0; s < it.count; s++) {
        expect(it.site(s, o)).toBe(true);
        top = Math.max(top, (o[1] as number) - GROUND);
        rx = Math.max(rx, Math.abs((o[0] as number) - L.x));
        rz = Math.max(rz, Math.abs((o[2] as number) - L.z));
        for (const c of o.slice(3)) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThan(0.75);
        }
      }
      expect(top).toBeGreaterThan(M.top - 6);
      expect(top).toBeLessThan(M.top + 1);
      // It stays on its plaza (four blocks, 52 by 68, a street of three more round it): never out
      // over the avenue or into the next blocks' towers.
      expect(rx).toBeLessThan(BLOCK_X + 3);
      expect(rz).toBeLessThan(BLOCK_Z + 3);
      expect(Math.abs(L.x) - rx).toBeGreaterThan(AVENUE + 30);
      expect(it.count).toBeGreaterThan(900);
    }
  });

  it('is drawn from 300 away, from the street', () => {
    const L = LANDMARKS.find((l) => l.kind === 'pagoda');
    if (!L) throw new Error('no pagoda');
    const eye: Vec3 = [L.x, GROUND + 20, L.z - 300];
    const items = gameItems(eye, [0, 0, 1], 3);
    expect(items.some((i) => i.gid !== 0 && i.probe?.[0]?.[1] === GROUND + 190 * 0.95)).toBe(true);
  });

  it('leaves the plazas open, so the Ship flies through every crown', () => {
    for (const L of LANDMARKS) {
      const key = crownKey(L.kind, L.set);
      if (!key) continue;
      for (const y of [20, 60, 120])
        for (const [dx, dz] of [
          [0, 0],
          [10, 10],
          [-18, 18],
        ])
          expect(blocked([L.x + (dx as number), GROUND + y, L.z + (dz as number)])).toBe(false);
    }
  });
});

describe('big temples, big domes and Nova Cores (2026-11-14)', () => {
  it('stands each on an open square of four blocks, clear of the rail, embassies and tunnels', () => {
    for (const q of BIG_SQUARES) {
      for (const [dx, dz] of [
        [-5, -5],
        [5, -5],
        [5, 5],
        [-5, 5],
      ]) {
        const I = Math.floor((q.x + (dx as number)) / BLOCK_X);
        const J = Math.floor((q.z + (dz as number)) / BLOCK_Z);
        expect(openBlock(I, J)).toBe(true);
        expect(blockTower(I, J).shape).toBe('plaza');
        expect(railCeiling(I, J)).toBe(Number.POSITIVE_INFINITY);
        expect(blockTower(I, J).bore).toBeNull();
      }
    }
  });

  it('makes them big: several times their Studio size, readable over the roofs', () => {
    for (const q of BIG_SQUARES) {
      expect(bigHeight(q)).toBeGreaterThanOrEqual(50);
      expect(BIG_STRETCH[q.kind].sv).toBeGreaterThanOrEqual(5);
    }
    expect(BIG_SQUARES.filter((q) => q.kind === 'temple').length).toBeGreaterThanOrEqual(3);
    expect(BIG_SQUARES.filter((q) => q.kind === 'dome').length).toBeGreaterThanOrEqual(3);
    expect(BIG_SQUARES.filter((q) => q.kind === 'nova').length).toBeGreaterThanOrEqual(3);
    // The Studio's buildings on the blocks: five times as tall as they stood (0.72), much bigger.
    expect(BLOCK_STRETCH.sv / 0.72).toBeGreaterThanOrEqual(4.5);
    expect(studioBlockHeight({ set: 'temples', i: 1 })).toBeGreaterThan(45);
  });

  it('keeps two of a kind from being neighbours, along a column or across the avenue', () => {
    const all = [
      ...BIG_SQUARES.map((q) => ({ kind: q.kind as string, x: q.x, z: q.z })),
      ...LANDMARKS.map((l) => ({
        kind: l.kind === 'nova' ? 'nova' : l.set === 'domes' || l.kind === 'mosque' ? 'dome' : '',
        x: l.x,
        z: l.z,
      })),
    ];
    for (const a of all)
      for (const b of all) {
        if (a === b || !a.kind || a.kind !== b.kind) continue;
        const along = a.x === b.x && Math.abs(a.z - b.z) <= 4 * BLOCK_Z;
        const across = a.z === b.z;
        expect(along || across).toBe(false);
      }
  });

  it('keeps them off the race courses and the autopilot’s avenue', () => {
    for (const q of BIG_SQUARES) {
      expect(Math.abs(q.x) - 30).toBeGreaterThan(AVENUE + 10);
      for (const T of TRACKS)
        for (const g of [T.start, ...T.gates])
          expect(Math.hypot(g[0] - q.x, g[2] - q.z)).toBeGreaterThan(36);
    }
    for (let t = 0; t < 600; t += 0.5) {
      const { c } = route(t);
      expect(blocked(c)).toBe(false);
      expect(Math.abs(c[0])).toBeLessThan(AVENUE - 2);
    }
  });

  it('draws them in their quarter’s colour from 300 away', () => {
    const q = BIG_SQUARES.find((b) => b.kind === 'temple') as (typeof BIG_SQUARES)[number];
    const out: ReturnType<typeof gameItems> = [];
    const colourAt = (x: number, z: number) => DISTRICTS[districtAt(x, z)].colour;
    bigItems([q.x, GROUND + 20, q.z - 300], 4, 340, () => true, colourAt, out);
    expect(out.length).toBeGreaterThan(0);
    const o = [0, 0, 0, 0, 0, 0];
    let top = 0;
    const it = out[0] as (typeof out)[number];
    for (let s = 0; s < it.count; s += 7) {
      it.site(s, o);
      top = Math.max(top, (o[1] as number) - GROUND);
      expect(Number.isFinite(o[0]) && Number.isFinite(o[1])).toBe(true);
    }
    expect(top).toBeGreaterThan(50);
  });
});

describe('fireworks (2026-11-14: "they pop at random. in the colours of the quarter")', () => {
  const L = LANDMARKS.find((l) => l.kind === 'race') as (typeof LANDMARKS)[number];
  const eye: Vec3 = [L.x, GROUND + 20, L.z - 120];

  it('goes up over the landmarks, the big squares, the canals and the river', () => {
    expect(fireworkPlaces().length).toBe(LANDMARKS.length + BIG_SQUARES.length + 5);
  });

  it('is the same for the same moment', () => {
    const a = burstsAt(1234.5, eye, 340);
    const b = burstsAt(1234.5, eye, 340);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const o1 = [0, 0, 0, 0, 0, 0];
    const o2 = [0, 0, 0, 0, 0, 0];
    for (const x of a)
      for (let s = 0; s < 2 * SPARKS + 6; s += 5) {
        expect(burstSite(x, s, 1234.5, o1)).toBe(burstSite(x, s, 1234.5, o2));
        expect(o1).toEqual(o2);
      }
  });

  it('bursts every few seconds within sight, a few at a time', () => {
    let seen = 0;
    let most = 0;
    const keys = new Set<number>();
    for (let t = 0; t < 120; t += 0.5) {
      const bs = burstsAt(t, eye, 340);
      if (bs.length) seen++;
      most = Math.max(most, bs.length);
      for (const b of bs) keys.add(b.key);
    }
    // Over two minutes: many bursts, often one going, never a crowd.
    expect(keys.size).toBeGreaterThanOrEqual(12);
    expect(seen / 240).toBeGreaterThan(0.3);
    expect(most).toBeLessThanOrEqual(8);
  });

  it('keeps its sparks in its quarter’s colours, above the roofs, below the stratosphere, and fades', () => {
    const o = [0, 0, 0, 0, 0, 0];
    let checked = 0;
    for (let t = 0; t < 200; t += 3.7) {
      for (const b of burstsAt(t, eye, 600)) {
        expect(b.c[1]).toBeGreaterThanOrEqual(BURST_LOW);
        expect(b.c[1]).toBeLessThanOrEqual(BURST_HIGH);
        for (let tb = 0.05; tb < b.life; tb += 0.4)
          for (let s = 0; s < SPARKS; s += 3) {
            if (!burstSite(b, s, b.t0 + RISE + tb, o)) continue;
            checked++;
            // Over every roof (the Heights' tallest towers are 128) and well under the stratosphere.
            expect(o[1] as number).toBeGreaterThan(GROUND + 140);
            expect(o[1] as number).toBeLessThan(STRATOSPHERE - 60);
            expect(cosine([o[3], o[4], o[5]] as RGB, b.colour)).toBeGreaterThan(0.88);
            expect(Math.max(o[3] as number, o[4] as number, o[5] as number)).toBeLessThanOrEqual(
              0.5,
            );
          }
        // At its end: dark.
        for (let s = 0; s < SPARKS; s += 7) {
          if (burstSite(b, s, b.t0 + RISE + b.life - 0.02, o))
            expect(Math.max(o[3] as number, o[4] as number, o[5] as number)).toBeLessThan(0.02);
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('blooms in and fades out softly: never a flash', () => {
    for (const life of [2.2, 2.6, LIFE_MAX]) {
      expect(bloomAt(0, life)).toBe(0);
      expect(bloomAt(life - 0.01, life)).toBeLessThan(0.01);
      let was = 0;
      for (let tb = 0; tb < life; tb += 1 / 60) {
        const k = bloomAt(tb, life);
        expect(Math.abs(k - was)).toBeLessThan(0.08);
        was = k;
      }
    }
  });

  it('spends a modest budget: a few hundred sites a burst, only those in sight', () => {
    for (let t = 0; t < 60; t += 1) {
      const items = fireworkItems(eye, t, 340);
      expect(items.length).toBeLessThanOrEqual(8);
      for (const it of items) expect(it.count).toBeLessThanOrEqual(300);
    }
    // Nothing from a tile away.
    expect(fireworkItems([eye[0], eye[1], eye[2] + TILE_Z / 2], 10, 50).length).toBeLessThan(3);
  });
});
