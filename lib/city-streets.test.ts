/*
 * The wider streets (docs/specs/art-city.md, "Wider streets (2026-11-14)").
 *
 * 2026-11-14: "make a lot of the thin streets larger." Earlier: "side streets that work well".
 * And: "avoid streets being too narrow where panels almost touch themselves. great when tall
 * streets with lots of pancartes but needs to breathe."
 */

import { describe, expect, it } from 'vitest';
import type { Vec3 } from './bigbang';
import { signSize } from './city';
import { skyBridgeItem } from './city-business';
import { CANYON_W, CANYON_WALLS, canyonWallAt } from './city-canyon';
import { flowLane, LANE_COUNT, LANE_OFF, WIDE_LANE_OFF } from './city-flow';
import { textPixels } from './city-font';
import {
  type Block,
  blocked,
  blockTower,
  blockTowerAsWas,
  inBore,
  MARGIN,
  STREET_MIN_GAP,
  tileCol,
  tileRow,
  towerSigns,
  walkwaysNear,
} from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND, TILE_J, WIDE_FACTOR, wideLine } from './city-grid';
import { boardsOn, type WordSign } from './city-signs';
import { THROUGH } from './city-under';

const solid = (tw: Block) => tw.shape === 'box' || tw.shape === 'business' || tw.shape === 'code';
const throughRow = (tw: Block) =>
  tileCol(tw.I) === Math.floor(THROUGH.x / BLOCK_X) &&
  tileRow(tw.J) >= THROUGH.J0 &&
  tileRow(tw.J) <= THROUGH.J1;
/** A tower that stands back from the streets: not the avenue's, Chinatown's, the canyon's or the tunnel's. */
const movable = (tw: Block) =>
  solid(tw) &&
  tw.I !== 0 &&
  tw.I !== -1 &&
  tw.d !== 'chinatown' &&
  canyonWallAt(tw.I, tw.J) === null &&
  !throughRow(tw);

/** Every side street's stretch over one tile: the two towers either side of it, and its line. */
type Stretch = { axis: 0 | 2; line: number; A: Block; B: Block; a: Block; b: Block };
function stretches(): Stretch[] {
  const out: Stretch[] = [];
  for (let J = 0; J < TILE_J; J++)
    for (let I = -6; I < 6; I++) {
      // Along z, on line I + 1 (never the avenue, x = 0).
      if (I + 1 !== 0)
        out.push({
          axis: 2,
          line: I + 1,
          A: blockTower(I, J),
          B: blockTower(I + 1, J),
          a: blockTowerAsWas(I, J),
          b: blockTowerAsWas(I + 1, J),
        });
      // Across x, on line J + 1, off the avenue.
      if (I !== 0 && I !== -1)
        out.push({
          axis: 0,
          line: J + 1,
          A: blockTower(I, J),
          B: blockTower(I, J + 1),
          a: blockTowerAsWas(I, J),
          b: blockTowerAsWas(I, J + 1),
        });
    }
  return out;
}
const clear = (s: { axis: 0 | 2 }, A: Block, B: Block) =>
  s.axis === 2 ? B.x - B.hx - (A.x + A.hx) : B.z - B.hz - (A.z + A.hz);
const ALL = stretches();

describe('the wider streets (2026-11-14: "make a lot of the thin streets larger")', () => {
  it('widens every other side street both ways, each at least 1.6 times as wide as it was', () => {
    expect(WIDE_FACTOR).toBeGreaterThanOrEqual(1.6);
    // Along z the even lines but the avenue's; across x the odd ones: a rhythm both ways.
    expect([1, 2, 3, 4, 6, 12].map((I) => wideLine(2, I))).toEqual([
      false,
      true,
      false,
      true,
      true,
      false,
    ]);
    expect([0, 1, 2, 3, -1].map((J) => wideLine(0, J))).toEqual([false, true, false, true, true]);
    const wide = ALL.filter((s) => wideLine(s.axis, s.line) && movable(s.A) && movable(s.B));
    expect(wide.filter((s) => s.axis === 2).length).toBeGreaterThan(60);
    expect(wide.filter((s) => s.axis === 0).length).toBeGreaterThan(60);
    let sum = 0;
    for (const s of wide) {
      const was = clear(s, s.a, s.b);
      const now = clear(s, s.A, s.B);
      expect(now).toBeGreaterThanOrEqual(1.6 * was - 1e-6);
      sum += now / was;
    }
    expect(sum / wide.length).toBeGreaterThan(1.7);
  });

  it('leaves the avenue and its towers as they were', () => {
    for (let J = 0; J < TILE_J; J++)
      for (const I of [-1, 0]) {
        const now = blockTower(I, J);
        const was = blockTowerAsWas(I, J);
        expect([now.x, now.z, now.hx, now.hz, now.h]).toEqual([
          was.x,
          was.z,
          was.hx,
          was.hz,
          was.h,
        ]);
      }
  });

  it('keeps the Neon Canyon narrow, its walls where they were', () => {
    for (const w of CANYON_WALLS) {
      const tw = blockTower(w.li, w.lj);
      expect(tw.hx).toBeCloseTo((w.x1 - w.x0) / 2, 9);
      expect(tw.hz).toBeCloseTo((w.z1 - w.z0) / 2, 9);
    }
    // Still twelve across, wall to wall.
    expect(blockTower(2, 40).x - blockTower(2, 40).hx - 2 * BLOCK_X).toBeCloseTo(CANYON_W, 9);
  });

  it('leaves every side street nine wide or more ("needs to breathe"), but where two kept towers meet', () => {
    expect(2 * STREET_MIN_GAP).toBe(9);
    let n = 0;
    for (const s of ALL) {
      if (!solid(s.A) || !solid(s.B) || (!movable(s.A) && !movable(s.B))) continue;
      // Where a slim tower could give no more, a hair under.
      expect(clear(s, s.A, s.B)).toBeGreaterThan(8.8);
      n++;
    }
    expect(n).toBeGreaterThan(300);
    // Chinatown's side streets, between its towers off the avenue, fourteen.
    for (const s of ALL) {
      if (s.axis !== 2 || s.A.d !== 'chinatown' || s.B.d !== 'chinatown') continue;
      if (!solid(s.A) || !solid(s.B)) continue;
      expect(clear(s, s.A, s.B)).toBeGreaterThanOrEqual(14 - 1e-9);
    }
  });

  it('holds you at the drawn walls of a widened street, and lets you fly down its middle', () => {
    const wide = ALL.filter((s) => wideLine(s.axis, s.line) && movable(s.A) && movable(s.B));
    for (const s of wide.slice(0, 80)) {
      for (const tw of [s.A, s.B]) {
        if (tw.shape === 'code') continue; // Its walls follow it as it rises (lib/city-rise.ts).
        const y = GROUND + Math.min(tw.h - 2, 4);
        const toB = tw === s.A ? 1 : -1;
        const face: Vec3 =
          s.axis === 2 ? [tw.x + toB * tw.hx, y, tw.z] : [tw.x, y, tw.z + toB * tw.hz];
        const step = (d: number): Vec3 =>
          s.axis === 2 ? [face[0] + toB * d, y, face[2]] : [face[0], y, face[2] + toB * d];
        const inside = step(-0.1);
        if (!inBore(tw, inside)) expect(blocked(inside)).toBe(true);
        expect(blocked(step(MARGIN + 0.05))).toBe(false);
      }
      // The middle of the street, low down, clear.
      const mid: Vec3 =
        s.axis === 2
          ? [s.line * BLOCK_X, GROUND + 6, (s.A.z + s.B.z) / 2]
          : [(s.A.x + s.B.x) / 2, GROUND + 6, s.line * BLOCK_Z];
      expect(blocked(mid)).toBe(false);
    }
  });

  it('spans its walkways and sky bridges wall to wall, meeting both walls', () => {
    // Chinatown's covered walkways.
    const walks = walkwaysNear([60, GROUND + 30, 4 * BLOCK_Z], 200);
    expect(walks.length).toBeGreaterThan(10);
    for (const w of walks) {
      const I = Math.floor((w.x0 - 0.5) / BLOCK_X);
      const J = Math.floor(w.z / BLOCK_Z);
      const A = blockTower(I, J);
      const B = blockTower(I + 1, J);
      expect(w.x0).toBeCloseTo(A.x + A.hx, 9);
      expect(w.x1).toBeCloseTo(B.x - B.hx, 9);
      expect(w.x1 - w.x0).toBeGreaterThanOrEqual(14 - 1e-9);
      expect(blocked([w.x0 - 0.3, w.y, w.z])).toBe(true);
      expect(blocked([w.x1 + 0.3, w.y, w.z])).toBe(true);
    }
    // The business towers' sky bridges, across the streets of the Heights, wide and narrow.
    let n = 0;
    for (const s of ALL) {
      if (s.A.shape !== 'business' || s.B.shape !== 'business') continue;
      const it = skyBridgeItem(s.A, s.B, s.axis === 2 ? 0 : 2, [s.A.x, GROUND + 50, s.A.z], 10);
      if (!it?.probe) continue;
      const [a, b] = it.probe as [Vec3, Vec3];
      const into = (q: Vec3, d: number): Vec3 =>
        s.axis === 2 ? [q[0] + d, q[1], q[2]] : [q[0], q[1], q[2] + d];
      for (const [q, tw, d] of [
        [a, s.A, -0.3],
        [b, s.B, 0.3],
      ] as const) {
        // On the wall, inside its breadth, the tower behind it.
        if (s.axis === 2) expect(Math.abs(q[2] - tw.z)).toBeLessThan(tw.hz - 1);
        else expect(Math.abs(q[0] - tw.x)).toBeLessThan(tw.hx - 1);
        if (!inBore(tw, into(q, d))) expect(blocked(into(q, d))).toBe(true);
      }
      n++;
    }
    expect(n).toBeGreaterThan(5);
  });
});

/* ---------- the signs and boards breathe ---------- */

type Panel = { x0: number; x1: number; y0: number; y1: number; z: number };
const signPanel = (s: ReturnType<typeof towerSigns>[number]): Panel => {
  const { w, h } = signSize(s);
  return { x0: s.at[0], x1: s.at[0] + w, y0: s.at[1] - h, y1: s.at[1], z: s.at[2] };
};
const boardPanel = (b: WordSign): Panel => {
  const T = textPixels(b.text, { face: b.face ?? 'brush', vertical: b.vertical ?? false });
  return {
    x0: b.at[0],
    x1: b.at[0] + T.w * b.px,
    y0: b.at[1] - T.h * b.px,
    y1: b.at[1],
    z: b.at[2],
  };
};
/** Panels from two facing walls: how far apart the nearest two that face each other are. */
function breathing(west: Panel[], east: Panel[]): number {
  let least = Number.POSITIVE_INFINITY;
  for (const p of west)
    for (const q of east)
      if (Math.abs(p.z - q.z) < 2 && p.y0 < q.y1 && q.y0 < p.y1)
        least = Math.min(least, q.x0 - p.x1);
  return least;
}

describe('the traffic on the wider streets', () => {
  it('runs its two streams further apart on a wide street, inside its walls', () => {
    let wide = 0;
    for (let l = 0; l < LANE_COUNT; l++) {
      const F = flowLane(l, 3 * BLOCK_X, 30 * BLOCK_Z, BLOCK_X, BLOCK_Z);
      if (F.avenue || F.express) continue;
      const w = wideLine(F.axis, F.line);
      expect(Math.abs(F.off)).toBe(w ? WIDE_LANE_OFF : LANE_OFF);
      if (w) wide++;
    }
    expect(wide).toBeGreaterThan(10);
    // Still well inside the narrowest street (nine).
    expect(WIDE_LANE_OFF).toBeLessThan(STREET_MIN_GAP - 1);
  });
});

describe('the street signs breathe (2026-11-14: "great when tall streets with lots of pancartes but needs to breathe")', () => {
  it("leaves open air between Chinatown's tall signs across its side streets, and a clear way between", () => {
    let n = 0;
    for (const s of ALL) {
      if (s.axis !== 2 || s.A.d !== 'chinatown' || s.B.d !== 'chinatown') continue;
      const west = towerSigns(s.A)
        .filter((g) => g.at[0] > s.A.x)
        .map(signPanel);
      const east = towerSigns(s.B)
        .filter((g) => g.at[0] < s.B.x)
        .map(signPanel);
      if (!west.length || !east.length) continue;
      // Never two facing each other close: staggered along the street.
      expect(breathing(west, east)).toBeGreaterThan(4);
      // Whatever their heights, a way six wide or more between the furthest out of each.
      const out = Math.max(...west.map((p) => p.x1));
      const back = Math.min(...east.map((p) => p.x0));
      expect(back - out).toBeGreaterThan(6);
      n++;
    }
    expect(n).toBeGreaterThan(20);
  });

  it('hangs boards on the side streets with open air between the two walls', () => {
    let n = 0;
    for (const s of ALL) {
      if (s.axis !== 2 || !solid(s.A) || !solid(s.B) || s.A.d === 'chinatown') continue;
      if (s.A.h < 20 || s.B.h < 20) continue;
      const levels = [0.1, 0.28, 0.46, 0.64, 0.82];
      const west = boardsOn(s.A, [1], levels, [[1, 1, 1]]).map(boardPanel);
      const east = boardsOn(s.B, [-1], levels, [[1, 1, 1]]).map(boardPanel);
      if (!west.length || !east.length) continue;
      expect(breathing(west, east)).toBeGreaterThan(4);
      const out = Math.max(...west.map((p) => p.x1));
      const back = Math.min(...east.map((p) => p.x0));
      expect(back - out).toBeGreaterThan(5);
      n++;
    }
    expect(n).toBeGreaterThan(100);
  });

  it("keeps the Neon Canyon's boards from touching across it", () => {
    for (const J of [40, 41]) {
      const W = blockTower(1, J);
      const E = blockTower(2, J);
      const levels = [0.1, 0.28, 0.46, 0.64, 0.82];
      const west = boardsOn(W, [1], levels, [[1, 1, 1]]).map(boardPanel);
      const east = boardsOn(E, [-1], levels, [[1, 1, 1]]).map(boardPanel);
      expect(west.length).toBe(5);
      expect(breathing(west, east)).toBeGreaterThan(4);
      expect(
        Math.min(...east.map((p) => p.x0)) - Math.max(...west.map((p) => p.x1)),
      ).toBeGreaterThan(8);
    }
  });
});
