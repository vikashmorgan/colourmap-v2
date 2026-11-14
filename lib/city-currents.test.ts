import { describe, expect, it } from 'vitest';

import { makeParticles, type Vec3 } from './bigbang';
import { flier, PHASES, pieceAt, pieceCamera, placeShip, setFly } from './city';
import {
  CHANNELS,
  channel,
  channelSlot,
  FLOCK,
  flockTheta,
  HIGH_X,
  HIGH_Z,
  highCurrent,
  highCurrentsNear,
  highShip,
  laneLight,
  loopAt,
  OUTLIERS,
  outlierAt,
  outlierGrain,
  RUN,
  streamShip,
} from './city-currents';
import { avenueWay, xStreetWay, zStreetWay } from './city-flow';
import { blockTower } from './city-game';
import { AVENUE, BLOCK_X, BLOCK_Z, GROUND, TILE_X, wrap } from './city-grid';

/*
 * 2026-11-14: "make more channels where ships navigate together in one direction to avoid
 * overload. so u follow linear currents of ships. some of these currents can be above and turn
 * together or be more curvy currents. but mainly one street one direction of ship and a few
 * outliers with the unique big ships."
 */

const CENTRES: [number, number][] = [
  [0, 0],
  [400, -900],
  [-1234, 5678],
  [77, 31337],
];
const angle = (a: Vec3, b: Vec3) => {
  const d = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / Math.hypot(...a) / Math.hypot(...b);
  return Math.acos(Math.max(-1, Math.min(1, d)));
};

describe('Ship currents: the street channels', () => {
  it('runs every channel one way, on the flow’s rules, and keeps its way as it comes round', () => {
    for (let c = 0; c < CHANNELS; c++) {
      const first = channel(c, 0, 0);
      for (const [cx, cz] of CENTRES) {
        const F = channel(c, cx, cz);
        expect(F.sgn).toBe(first.sgn);
        if (F.kind === 'avenue') expect(F.sgn).toBe(avenueWay(c >> 1));
        if (F.kind === 'street' && wrap(F.line, 12) !== 0) expect(F.sgn).toBe(zStreetWay(F.line));
        if (F.kind === 'cross') expect(F.sgn).toBe(xStreetWay(F.line));
        // Never at the height the ship cruises at; the avenue's files clear of its middle.
        expect(Math.abs(F.y - 21)).toBeGreaterThan(4);
        if (F.kind === 'avenue') expect(Math.abs(F.off)).toBeGreaterThan(3);
        if (F.kind === 'cross') expect(F.y).toBeGreaterThan(12);
        if (F.kind === 'express') expect(F.y).toBeGreaterThan(100);
      }
    }
    // Neighbouring streets flow opposite ways, so crossing ones pass over each other.
    const a = channel(8, 0, 0);
    const b = channel(9, 0, 0);
    expect(Math.abs(a.line - b.line)).toBe(1);
  });

  it('flies each channel in single file, at one spacing and one speed, all headed the same way', () => {
    for (const n of [60, 120, 333]) {
      for (const [cx, cz] of CENTRES) {
        const t = 41.3;
        const byChannel = new Map<number, ReturnType<typeof streamShip>[]>();
        for (let j = 0; j < n; j++) {
          const s = streamShip(j, n, cx, cz, t);
          const list = byChannel.get(s.c) ?? [];
          list.push(s);
          byChannel.set(s.c, list);
        }
        expect(byChannel.size).toBe(CHANNELS);
        for (const [c, list] of byChannel) {
          expect(channelSlot(n - 1, n).c).toBe(CHANNELS - 1);
          const F = list[0]?.F as ReturnType<typeof channel>;
          const ax = F.axis;
          const gap = RUN / list.length;
          const s0 = (list[0] as (typeof list)[number]).head[ax];
          for (const s of list) {
            // One heading.
            expect(s.dir).toEqual(list[0]?.dir);
            // Single file: the same line across, the same height.
            expect(s.head[ax === 2 ? 0 : 2]).toBeCloseTo(
              (list[0] as (typeof list)[number]).head[ax === 2 ? 0 : 2],
              9,
            );
            expect(s.head[1]).toBe(list[0]?.head[1]);
            // One spacing: each ship a whole number of gaps from the first, round the stretch.
            const steps = wrap(s.head[ax] - s0, RUN) / gap;
            expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-6);
          }
          expect(c).toBeLessThan(CHANNELS);
        }
      }
    }
  });

  it('moves every ship of a channel on at the channel’s speed, deterministic', () => {
    const n = 150;
    const dt = 1 / 60;
    for (let j = 0; j < n; j += 7) {
      const a = streamShip(j, n, 120, -340, 10);
      const b = streamShip(j, n, 120, -340, 10 + dt);
      expect(streamShip(j, n, 120, -340, 10)).toEqual(a);
      const ax = a.F.axis;
      const step = b.head[ax] - a.head[ax];
      // Unless it came round its stretch, it moved its channel's speed, its way.
      if (Math.abs(step) < RUN / 2) expect(step).toBeCloseTo(a.F.sgn * a.F.speed * dt, 6);
    }
  });

  it('marks each channel with faint lane lights, fixed over the street', () => {
    const G = 150;
    for (let g = 0; g < G; g++) {
      const a = laneLight(g, G, 30, 30, 5);
      const b = laneLight(g, G, 31, 33, 5.5);
      expect(a.light).toBeGreaterThan(0.4);
      expect(a.light).toBeLessThanOrEqual(1);
      // Moving the eye a little does not move the light (unless its line came round).
      if (a.F.line === b.F.line && Math.abs(a.pos[a.F.axis] - b.pos[a.F.axis]) < RUN / 2)
        expect(b.pos).toEqual(a.pos);
      // A slow swell: brightness changes little in a frame.
      const c = laneLight(g, G, 30, 30, 5 + 1 / 60);
      expect(Math.abs(c.light - a.light)).toBeLessThan(0.02);
    }
  });
});

describe('Ship currents: high and curvy currents over the roofs', () => {
  const cells: [number, number][] = [];
  for (let a = -2; a <= 2; a++) for (let b = -3; b <= 3; b++) cells.push([a, b]);

  it('loops over the roofs, crossing the avenue, linking the quarters either side', () => {
    for (const [ix, iz] of cells) {
      const H = highCurrent(ix, iz);
      let lo = Number.POSITIVE_INFINITY;
      let hi = Number.NEGATIVE_INFINITY;
      for (let s = 0; s < 240; s++) {
        const { p } = loopAt(H, (s / 240) * Math.PI * 2);
        const tw = blockTower(Math.floor(p[0] / BLOCK_X), Math.floor(p[2] / BLOCK_Z));
        expect(p[1]).toBeGreaterThan(GROUND + tw.h + 10);
        lo = Math.min(lo, p[0]);
        hi = Math.max(hi, p[0]);
      }
      // Its loop spans the avenue (at its middle line) by over a hundred either side.
      expect(lo).toBeLessThan(H.cx - 100);
      expect(hi).toBeGreaterThan(H.cx + 100);
      expect(wrap(H.cx, TILE_X)).toBe(0);
    }
  });

  it('flies its flock on a smooth curve: no sharp heading jumps between frames, banking together', () => {
    const dt = 1 / 60;
    for (const [ix, iz] of cells.slice(0, 12)) {
      const H = highCurrent(ix, iz);
      for (let i = 0; i < FLOCK; i++) {
        let prev = highShip(H, i, 0);
        for (let f = 1; f < 600; f += 1) {
          const s = highShip(H, i, f * dt * 3);
          expect(angle(prev.f, s.f)).toBeLessThan(0.03);
          expect(Math.abs(s.bank - prev.bank)).toBeLessThan(0.03);
          expect(Math.hypot(s.c[0] - prev.c[0], s.c[2] - prev.c[2])).toBeLessThan(
            H.speed * dt * 3 * 2.5,
          );
          prev = s;
        }
      }
      // Ships flying side by side head the same way and bank the same.
      for (const t of [0, 7, 33]) {
        const a = highShip(H, 4, t);
        const b = highShip(H, 5, t);
        expect(angle(a.f, b.f)).toBeLessThan(0.01);
        expect(a.bank).toBeCloseTo(b.bank, 6);
        // And it turns: somewhere on the loop the flock banks.
      }
      const banks = Array.from({ length: 60 }, (_, k) => Math.abs(highShip(H, 0, k * 4).bank));
      expect(Math.max(...banks)).toBeGreaterThan(0.05);
    }
  });

  it('flies its flock forward along the loop, the leaders ahead', () => {
    const H = highCurrent(1, -2);
    const th0 = flockTheta(H, 0);
    const th1 = flockTheta(H, 1);
    expect(Math.sign(th1 - th0)).toBe(H.sgn);
    const lead = highShip(H, 0, 10);
    const tail = highShip(H, FLOCK - 1, 10);
    const ahead = [tail.c[0] - lead.c[0], 0, tail.c[2] - lead.c[2]] as Vec3;
    expect(ahead[0] * lead.f[0] + ahead[2] * lead.f[2]).toBeLessThan(0);
  });

  it('finds the currents nearest the eye, deterministic', () => {
    const a = highCurrentsNear([100, 21, -700], 2);
    expect(a.length).toBe(2);
    expect(highCurrentsNear([100, 21, -700], 2)).toEqual(a);
    expect(highCurrent(3, 4)).toEqual(highCurrent(3, 4));
    expect(highCurrent(3, 4)).not.toEqual(highCurrent(4, 3));
    expect(HIGH_X).toBe(TILE_X);
    expect(HIGH_Z).toBeGreaterThan(300);
  });
});

describe('Ship currents: the big outliers', () => {
  it('flies a few big ships, slow, alone in long stretches, high and clear of the avenue’s way', () => {
    expect(OUTLIERS.length).toBeGreaterThanOrEqual(3);
    for (let o = 0; o < OUTLIERS.length; o++) {
      const O = OUTLIERS[o] as (typeof OUTLIERS)[number];
      // Slower than any channel (7.5 and up), much bigger than a ship (about 3).
      expect(O.speed).toBeLessThan(4);
      expect(O.len).toBeGreaterThan(20);
      // Rare: one in every long stretch.
      expect(O.run).toBeGreaterThanOrEqual(600);
      // High over the street, well above the cruise height.
      expect(O.y).toBeGreaterThan(80);
      if (O.axis === 2) {
        // Over the blocks, not down the avenue.
        const x = wrap(O.off + TILE_X / 2, TILE_X) - TILE_X / 2;
        expect(Math.abs(x)).toBeGreaterThan(AVENUE + O.len);
      }
      const a = outlierAt(o, [10, 0, 20], 50);
      const b = outlierAt(o, [10, 0, 20], 51);
      expect(outlierAt(o, [10, 0, 20], 50)).toEqual(a);
      expect(Math.hypot(b.c[0] - a.c[0], b.c[2] - a.c[2])).toBeCloseTo(O.speed, 6);
    }
  });

  it('draws each big ship in its own grains, its size, its lights breathing slowly', () => {
    for (const O of OUTLIERS) {
      let reach = 0;
      for (let q = 0; q < 1; q += 0.01) {
        const g = outlierGrain(O.kind, q, (q * 7.31) % 1, 3);
        reach = Math.max(reach, Math.abs(g.a));
        const g2 = outlierGrain(O.kind, q, (q * 7.31) % 1, 3 + 1 / 60);
        expect(Math.abs(g2.light - g.light)).toBeLessThan(0.02);
        expect(g.light).toBeLessThanOrEqual(0.7);
      }
      expect(reach).toBeGreaterThan(O.len / 2 - 2);
      expect(reach).toBeLessThan(O.len / 2 + 3);
    }
  });
});

describe('Ship currents: out of your way', () => {
  it('never flies a ship inside yours, even sitting in a channel’s file', () => {
    const k = PHASES.findIndex((p) => p.id === 'ship');
    const ps = makeParticles(4000);
    const traffic = ps.filter((p) => p.i % 100 >= 15 && p.i % 100 < 26);
    setFly(false, [], 0, 0);
    setFly(true, [], 1 / 60, 5);
    // On the avenue's lowest file, in the golden gardens' stretch, facing down the avenue.
    placeShip([-4.8, GROUND + 5.6, 28 * BLOCK_Z], 0);
    let lit = 0;
    for (let f = 0; f < 90; f++) {
      const t = 5 + f * 0.25;
      setFly(true, [], 0, t);
      pieceCamera(k, t);
      for (const p of ps) pieceAt(p, k, t);
      const { c } = flier(t);
      for (const p of traffic) {
        const s = pieceAt(p, k, t);
        if (s.rgb[0] + s.rgb[1] + s.rgb[2] < 0.01) continue;
        lit++;
        expect(Math.hypot(s.pos[0] - c[0], s.pos[1] - c[1], s.pos[2] - c[2])).toBeGreaterThan(1.5);
      }
    }
    expect(lit).toBeGreaterThan(100);
    setFly(false, [], 0, 0);
  });
});
