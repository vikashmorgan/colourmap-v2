import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  APPROACH_HALF,
  ATL_CENTRE,
  ATL_EDGE,
  atlantisBlocked,
  atlantisItems,
  atlantisPlan,
  COMPLEX_R,
  edgePull,
  HEART_H,
  RINGS,
  realmBlocked,
} from './city-atlantis-rings';
import { BLOCK_X, BLOCK_Z, GROUND, type Item } from './city-grid';
import { LANE_LEN } from './city-speedway';

/*
 * 2026-11-14: "plant Atlantis circle by circle, adding height and circles as you go ... more
 * spaced out than the first city ... towers, spirals ... tubes connecting bubble domes that float
 * in the air."
 */

const P = atlantisPlan();
const ringTowers = (k: number) => P.towers.filter((t) => t.ring === k);

describe('Atlantis rising: circle by circle', () => {
  it('plants six rings round the heart, each ring taller than the one outside it', () => {
    expect(RINGS.length).toBe(6);
    for (let k = 0; k < RINGS.length; k++) {
      const here = ringTowers(k);
      expect(here.length).toBeGreaterThanOrEqual(5);
      // Every tower stands on its circle.
      for (const tw of here)
        expect(Math.hypot(tw.x - ATL_CENTRE[0], tw.z - ATL_CENTRE[2])).toBeCloseTo(
          (RINGS[k] as { r: number }).r,
          6,
        );
      if (k === 0) continue;
      const outside = ringTowers(k - 1);
      // Rings never overlap in height: the lowest of this ring over the tallest of the last.
      expect(Math.min(...here.map((t) => t.h))).toBeGreaterThan(
        Math.max(...outside.map((t) => t.h)),
      );
      expect((RINGS[k] as { r: number }).r).toBeLessThan((RINGS[k - 1] as { r: number }).r);
    }
    const heart = P.towers.find((t) => t.kind === 'heart');
    expect(heart?.h).toBe(HEART_H);
    expect(HEART_H).toBeGreaterThan(Math.max(...ringTowers(5).map((t) => t.h)));
  });

  it('stands much further apart than the first city: wide gaps to fly between towers and rings', () => {
    let least = Number.POSITIVE_INFINITY;
    for (let i = 0; i < P.towers.length; i++)
      for (let j = i + 1; j < P.towers.length; j++) {
        const a = P.towers[i] as (typeof P.towers)[number];
        const b = P.towers[j] as (typeof P.towers)[number];
        const gap = Math.hypot(a.x - b.x, a.z - b.z) - a.r * 1.2 - b.r * 1.2;
        least = Math.min(least, gap);
      }
    // The first city's blocks are 26 by 34 with streets of 6 to 11 between: here every gap is
    // wider than a whole block.
    expect(least).toBeGreaterThan(BLOCK_X);
    for (let k = 1; k < RINGS.length; k++)
      expect((RINGS[k - 1] as { r: number }).r - (RINGS[k] as { r: number }).r).toBeGreaterThan(
        BLOCK_Z * 2,
      );
  });

  it('keeps the avenue in from the speedway clear to the heart', () => {
    for (const tw of P.towers) {
      if (tw.kind === 'heart') continue;
      if (tw.z > ATL_CENTRE[2]) expect(Math.abs(tw.x)).toBeGreaterThan(APPROACH_HALF);
    }
    // Flying it at 40 over the ground, from the lane's end to the heart's plaza: nothing in the way.
    for (let z = -LANE_LEN; z > ATL_CENTRE[2] + 40; z -= 2) {
      expect(realmBlocked([0, GROUND + 40, z])).toBe(false);
      expect(realmBlocked([APPROACH_HALF - 6, GROUND + 20, z])).toBe(false);
    }
  });

  it('rises with spirals: twisting towers, tubes winding round every third tower and the heart', () => {
    const kinds = new Set(P.towers.map((t) => t.kind));
    for (const k of ['drum', 'spiral', 'needle', 'heart']) expect(kinds.has(k as never)).toBe(true);
    const helices = P.paths.filter((p) => p.kind === 'helix');
    expect(helices.length).toBeGreaterThan(P.towers.length / 4);
    for (const h of helices) {
      if (h.kind !== 'helix') continue;
      expect(h.turns).toBeGreaterThanOrEqual(2);
      const tw = P.towers.find((t) => t.x === h.x && t.z === h.z);
      expect(tw).toBeDefined();
      // Round the tower, never inside it.
      expect(h.r).toBeGreaterThan((tw?.r ?? 0) * 1.15);
    }
  });

  it('floats bubble domes in the air, joined by glowing tubes; four dome complexes on plazas', () => {
    expect(P.domes.length).toBeGreaterThan(30);
    for (const d of P.domes) expect(d.c[1] - d.r).toBeGreaterThan(GROUND + 15);
    const lines = P.paths.filter((p) => p.kind === 'line');
    expect(lines.length).toBeGreaterThan(P.domes.length * 0.8);
    // Every floating dome (bar the heart's pearl) has a tube touching its skin.
    for (const d of P.domes) {
      if (d.key === 9998) continue;
      const touches = lines.some((p) => {
        if (p.kind !== 'line') return false;
        return [p.a, p.b].some(
          (e) => Math.abs(Math.hypot(e[0] - d.c[0], e[1] - d.c[1], e[2] - d.c[2]) - d.r) < 0.01,
        );
      });
      expect(touches).toBe(true);
    }
    for (let c = 0; c < 4; c++) {
      const group = P.domes.filter((d) => d.complex === c);
      expect(group.length).toBe(5);
      const big = group.find((d) => d.r === 20) as (typeof group)[number];
      expect(Math.hypot(big.c[0] - ATL_CENTRE[0], big.c[2] - ATL_CENTRE[2])).toBeCloseTo(
        COMPLEX_R,
        6,
      );
      // A circle plaza on the ground under it.
      expect(
        P.ground.some((g) => g.kind === 'plaza' && Math.hypot(g.x - big.c[0], g.z - big.c[2]) < 1),
      ).toBe(true);
    }
    // The great ring of tube joins them.
    expect(P.paths.filter((p) => p.kind === 'arc').length).toBe(32);
  });

  it('holds you out of towers and domes, and turns you back gently near the edge', () => {
    const tw = ringTowers(3)[0] as (typeof P.towers)[number];
    expect(atlantisBlocked([tw.x, GROUND + 10, tw.z])).toBe(true);
    expect(atlantisBlocked([tw.x, GROUND + tw.h + 5, tw.z])).toBe(false);
    const d = P.domes[1] as (typeof P.domes)[number];
    expect(atlantisBlocked(d.c)).toBe(true);
    expect(realmBlocked([ATL_CENTRE[0] + ATL_EDGE + 5, GROUND + 40, ATL_CENTRE[2]])).toBe(true);
    // Heading out east past the soft edge, the pull turns you toward the heart (yaw rises toward π/2 west).
    const q: Vec3 = [ATL_CENTRE[0] + 600, GROUND + 40, ATL_CENTRE[2]];
    expect(Math.abs(edgePull(q, -Math.PI / 2))).toBeGreaterThan(0.3);
    expect(edgePull([ATL_CENTRE[0] + 100, GROUND + 40, ATL_CENTRE[2]], 0)).toBe(0);
  });

  it('draws only what is in reach and ahead, its sites finite, mellow and never inside the lane', () => {
    const out: Item[] = [];
    const eye: Vec3 = [0, GROUND + 60, -LANE_LEN - 20];
    atlantisItems(eye, [0, 0, -1], 12, out);
    expect(out.length).toBeGreaterThan(20);
    const all: Item[] = [];
    atlantisItems(eye, [0, 0, -1], 12, all);
    const back: Item[] = [];
    atlantisItems(eye, [0, 0, 1], 12, back);
    expect(back.length).toBeLessThan(all.length / 2);
    const o = [0, 0, 0, 0, 0, 0];
    let seen = 0;
    for (const it of out) {
      expect(it.d).toBeLessThanOrEqual(1100);
      for (let s = 0; s < it.count; s += Math.max(7, Math.floor(it.count / 150))) {
        if (!it.site(s, o)) continue;
        seen++;
        for (const v of o) expect(Number.isFinite(v)).toBe(true);
        expect(Math.max(o[3] as number, o[4] as number, o[5] as number)).toBeLessThan(0.7);
        // Nothing of Atlantis stands in the lane.
        expect((o[2] as number) < -LANE_LEN + 2).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(500);
  });
});
