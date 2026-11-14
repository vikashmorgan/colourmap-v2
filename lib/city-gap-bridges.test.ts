/*
 * Bridges over the gap between the Heights and the Golden gardens (docs/specs/art-city.md, "Racing
 * corridors and the Heights–Golden bridges"), 2026-11-14: "I love the space between the Heights and
 * Golden Garden. Add more bridges higher up, so I can fly below them, or above, or in between. That
 * width is perfect for racing and the pleasure of flying."
 */
import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { makeParticles, PHASES, pieceAt, pieceCamera, placeShip, setFly } from './city';
import { CORRIDOR_HALF, CORRIDOR_X } from './city-corridors';
import { blocked, blockTower, districtOf } from './city-game';
import {
  DECK_HALF,
  deckSpan,
  GAP_BRIDGES,
  GAP_HALF,
  GAP_Z,
  gapBridgeItems,
} from './city-gap-bridges';
import { AVENUE, BLOCK_X, GROUND, type Item, TILE_I, TILE_J, TILE_X, TILE_Z } from './city-grid';
import { RIVER_ROW, RIVER_W, RIVER_Z } from './city-rain';

const ship = PHASES.findIndex((p) => p.id === 'ship');
const dt = 1 / 60;

/**
 * The gap's walls as they stood before this change (measured 2026-11-14 on the plan of PR #473):
 * the Heights' towers' south faces on row 23, columns -6 to -1; every Golden gardens tower's north
 * face on row 24 at 831.
 */
const HEIGHTS_FACES = [799.543, 800.002, 800.519, 801, 798.931, 801];
const GOLDEN_FACE = 831;

describe('the Heights–Golden gap: its width kept exactly', () => {
  it('is the river’s strip, the Heights on its north bank and the Golden gardens on its south', () => {
    expect(RIVER_Z).toBe(RIVER_ROW * 34);
    expect(GAP_Z).toBe(RIVER_Z);
    for (let I = -6; I < 0; I++) {
      expect(districtOf(I, RIVER_ROW - 1)).toBe('heights');
      expect(districtOf(I, RIVER_ROW)).toBe('golden');
    }
    expect(GAP_HALF).toBe(RIVER_W + 3);
  });

  it('keeps every wall where it was, 30 wall to wall, and never narrower in any copy', () => {
    for (let i = 0; i < 6; i++) {
      const north = blockTower(-6 + i, RIVER_ROW - 1);
      const south = blockTower(-6 + i, RIVER_ROW);
      expect(north.z + north.hz).toBeCloseTo(HEIGHTS_FACES[i] as number, 2);
      expect(south.z - south.hz).toBeCloseTo(GOLDEN_FACE, 6);
    }
    // Each copy's towers are their own (the plan's hash), but the walls hold the same line.
    for (const [ti, tj] of [
      [1, -1],
      [-2, 3],
    ] as const) {
      const oz = tj * TILE_Z;
      for (let i = 0; i < 12; i++) {
        const I = -6 + i + ti * TILE_I;
        const north = blockTower(I, RIVER_ROW - 1 + tj * TILE_J);
        const south = blockTower(I, RIVER_ROW + tj * TILE_J);
        expect(north.z + north.hz - oz).toBeLessThanOrEqual(RIVER_Z - GAP_HALF + 1e-6);
        expect(south.z - south.hz - oz).toBeCloseTo(GOLDEN_FACE, 6);
      }
    }
    const nearest = Math.max(...HEIGHTS_FACES);
    expect(GOLDEN_FACE - nearest).toBe(2 * GAP_HALF);
  });
});

describe('the Heights–Golden bridges', () => {
  it('stands six or more bridges along the gap, staggered, west of the avenue, off the corridor and the ground bridges', () => {
    expect(GAP_BRIDGES.length).toBeGreaterThanOrEqual(6);
    const xs = GAP_BRIDGES.map((b) => b.x);
    expect(new Set(xs).size).toBe(xs.length);
    for (const x of xs) {
      expect(x - DECK_HALF).toBeGreaterThan(-6 * BLOCK_X);
      expect(x + DECK_HALF).toBeLessThan(-AVENUE);
      for (const c of CORRIDOR_X)
        expect(Math.abs(x - c)).toBeGreaterThan(CORRIDOR_HALF + DECK_HALF);
      // The street lines carry the river's ground bridges (half 3).
      for (let I = -6; I <= 0; I++)
        expect(Math.abs(x - I * BLOCK_X)).toBeGreaterThan(3 + DECK_HALF);
    }
  });

  it('stacks decks with clear air between: under the lowest, between each, over the top, at low, middle and high', () => {
    const styles = new Set<string>();
    const bands = { low: 0, mid: 0, high: 0 };
    for (const b of GAP_BRIDGES) {
      expect(b.decks.length).toBeGreaterThanOrEqual(2);
      const spans = b.decks.map(deckSpan);
      expect((spans[0] as [number, number])[0]).toBeGreaterThanOrEqual(16);
      for (let i = 1; i < spans.length; i++)
        expect(
          (spans[i] as [number, number])[0] - (spans[i - 1] as [number, number])[1],
        ).toBeGreaterThanOrEqual(20);
      for (const d of b.decks) {
        styles.add(d.style);
        if (d.y < 35) bands.low++;
        else if (d.y < 75) bands.mid++;
        else bands.high++;
      }
      // The ship flies under, between and over every deck, the whole way across the gap.
      const ys: number[] = [(spans[0] as [number, number])[0] - 6];
      for (let i = 1; i < spans.length; i++)
        ys.push(((spans[i - 1] as [number, number])[1] + (spans[i] as [number, number])[0]) / 2);
      ys.push((spans[spans.length - 1] as [number, number])[1] + 8);
      for (const y of ys)
        for (let dz = -GAP_HALF + 2; dz <= GAP_HALF - 2; dz += 2)
          for (const ox of [0, -TILE_X])
            expect(blocked([ox + b.x, GROUND + y, RIVER_Z + dz + TILE_Z])).toBe(false);
    }
    expect([...styles].sort()).toEqual(['arch', 'flat', 'lattice']);
    expect(bands.low).toBeGreaterThanOrEqual(3);
    expect(bands.mid).toBeGreaterThanOrEqual(3);
    // Especially high ones: four or more over 75, one over a hundred and ten.
    expect(bands.high).toBeGreaterThanOrEqual(4);
    expect(Math.max(...GAP_BRIDGES.flatMap((b) => b.decks.map((d) => d.y)))).toBeGreaterThan(110);
  });

  it('draws them bank to bank over the gap, finite and mellow, near the eye', () => {
    const eye: Vec3 = [-80 + TILE_X, GROUND + 50, RIVER_Z + 70 - TILE_Z];
    const out: Item[] = [];
    gapBridgeItems(eye, 30, 420, out);
    expect(out.length).toBe(GAP_BRIDGES.length);
    const o = [0, 0, 0, 0, 0, 0];
    for (const it of out) {
      it.site(0, o);
      const b = GAP_BRIDGES.find(
        (g) => Math.abs(g.x + TILE_X - (o[0] as number)) <= DECK_HALF + 1e-6,
      );
      expect(b).toBeDefined();
      const top = Math.max(...(b?.decks.map((d) => deckSpan(d)[1]) ?? [0]));
      for (let s = 0; s < it.count; s++) {
        expect(it.site(s, o)).toBe(true);
        expect(o.every(Number.isFinite)).toBe(true);
        expect(Math.abs((o[0] as number) - (b?.x as number) - TILE_X)).toBeLessThanOrEqual(
          DECK_HALF + 1e-6,
        );
        expect(Math.abs((o[2] as number) + TILE_Z - RIVER_Z)).toBeLessThanOrEqual(GAP_HALF + 1e-6);
        expect(o[1] as number).toBeLessThanOrEqual(GROUND + top + 1e-6);
        expect(o[1] as number).toBeGreaterThanOrEqual(GROUND);
        expect(Math.max(o[3] as number, o[4] as number, o[5] as number)).toBeLessThanOrEqual(0.7);
      }
    }
    // Out of reach, none.
    const far: Item[] = [];
    gapBridgeItems([-80, GROUND + 50, RIVER_Z + 600], 30, 420, far);
    expect(far.length).toBe(0);
  });

  it('keeps to a phone’s and a computer’s grains flying the gap among them, every grain finite', () => {
    for (const n of [6500, 15000]) {
      const ps = makeParticles(n);
      let t = 400;
      setFly(false, [], 0, t);
      setFly(true, [], dt, t);
      // Along the gap toward the avenue (+x), between the decks.
      placeShip([-150, GROUND + 50, RIVER_Z], -Math.PI / 2);
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
    }
  });
});
