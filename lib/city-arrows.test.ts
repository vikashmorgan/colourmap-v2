/*
 * LED arrows on the towers (docs/specs/art-city.md, "Boost rings, LED arrows and the big
 * fireworks"), 2026-11-15: "A bunch of arrows on some of the buildings that create a feeling of
 * speed, pointing the direction, as an LED design element."
 */
import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  ARROW_REACH,
  type ArrowPanel,
  arrowGlow,
  arrowItems,
  arrowPanels,
  arrowPhase,
  arrowSite,
  CHEVRON_GAP,
  MOST_ARROWS,
  panelSites,
} from './city-arrows';
import { CORRIDOR_X } from './city-corridors';
import { channel } from './city-currents';
import { xStreetWay, zStreetWay } from './city-flow';
import { blocked } from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND } from './city-grid';

/** The street line a row looks across at: along z, x = L · BLOCK_X; along x, z = L · BLOCK_Z. */
const lineOf = (p: ArrowPanel) => p.line;
/** Where a site lies along its row's street. */
const alongOf = (p: ArrowPanel, o: number[]) => (p.axis === 2 ? o[2] : o[0]) as number;

describe('LED arrows: rows of chevrons on the towers along the streets', () => {
  const P = arrowPanels();

  it('puts many rows on the towers, most along the corridors, some at the roofs and some down the facades', () => {
    expect(P.length).toBeGreaterThan(60);
    expect(P.filter((p) => p.corridor).length).toBeGreaterThan(20);
    expect(P.filter((p) => p.axis === 0).length).toBeGreaterThan(10);
    expect(P.filter((p) => p.roof).length).toBeGreaterThan(15);
    expect(P.filter((p) => !p.roof).length).toBeGreaterThan(15);
    for (const p of P) {
      expect(p.n).toBeGreaterThanOrEqual(3);
      // Never on the Grand Avenue.
      if (p.axis === 2) expect(lineOf(p)).not.toBe(0);
      if (p.corridor) expect(CORRIDOR_X).toContain(lineOf(p) * BLOCK_X);
    }
  });

  it('sits each row on a real tower face, over an open street', () => {
    for (const p of P) {
      const across = p.axis === 2 ? 0 : 2;
      const inside: Vec3 = [p.c[0], p.c[1], p.c[2]];
      const outside: Vec3 = [p.c[0], p.c[1], p.c[2]];
      inside[across] -= p.out * 0.8;
      outside[across] += p.out * 3;
      expect(blocked(inside)).toBe(true);
      expect(blocked(outside)).toBe(false);
      // The face looks at its street: the street line is in front of it, close.
      const L = lineOf(p) * (p.axis === 2 ? BLOCK_X : BLOCK_Z);
      const ahead = (L - p.c[across]) * p.out;
      expect(ahead).toBeGreaterThan(0);
      expect(ahead).toBeLessThan(17);
    }
  });

  it('points every row the way its street’s traffic flows, as the flow and the currents do', () => {
    for (const p of P) {
      const L = lineOf(p);
      expect(p.sgn).toBe(p.axis === 2 ? zStreetWay(L) : xStreetWay(L));
    }
    // The currents' street channels flow the same way on the same lines.
    for (let c = 0; c < 30; c++) {
      const F = channel(c, 60, 400);
      if (F.kind === 'street' && F.line % 24 !== 0) expect(F.sgn).toBe(zStreetWay(F.line));
      if (F.kind === 'cross') expect(F.sgn).toBe(xStreetWay(F.line));
    }
    // Each chevron's tip leads the way the traffic goes: ahead of its arms' ends.
    const o = [0, 0, 0, 0, 0, 0];
    for (const p of P.slice(0, 40)) {
      for (let i = 0; i < p.n; i++) {
        arrowSite(p, p.c, i * 10, 0, o);
        const tip = alongOf(p, o);
        arrowSite(p, p.c, i * 10 + 4, 0, o);
        const end = alongOf(p, o);
        expect((tip - end) * p.sgn).toBeGreaterThan(1);
      }
    }
  });

  it('runs its light along the street the way the traffic goes', () => {
    for (const sgn of [1, -1] as const) {
      // The crest's place at time t, near s = 0.
      const crest = (t: number) => {
        let best = -1;
        let at = 0;
        for (let s = -6; s <= 6; s += 0.02) {
          const g = arrowGlow(sgn, s, t);
          if (g > best) {
            best = g;
            at = s;
          }
        }
        return at;
      };
      const a = crest(0);
      const b = crest(0.1);
      expect((b - a) * sgn).toBeGreaterThan(0.3);
      // The phase grows with time and falls along the flow: a later chevron lights later.
      expect(arrowPhase(sgn, 0, 1)).toBeGreaterThan(arrowPhase(sgn, 0, 0));
      expect(arrowPhase(sgn, sgn * CHEVRON_GAP, 0)).toBeLessThan(arrowPhase(sgn, 0, 0));
    }
    // On a real row: the brightest chevron moves along the street the way its arrows point.
    const p = P.find((q) => q.n >= 7 && q.corridor) as ArrowPanel;
    const o = [0, 0, 0, 0, 0, 0];
    const brightest = (t: number) => {
      let best = -1;
      let at = 0;
      for (let i = 0; i < p.n; i++) {
        arrowSite(p, p.c, i * 10 + 2, t, o);
        if ((o[3] as number) > best) {
          best = o[3] as number;
          at = alongOf(p, o);
        }
      }
      return at;
    };
    let moved = 0;
    for (let t = 0; t < 3; t += 0.05) {
      const d = (brightest(t + 0.05) - brightest(t)) * p.sgn;
      if (Math.abs(d) < CHEVRON_GAP * 1.5) moved += d;
    }
    expect(moved).toBeGreaterThan(0);
  });

  it('glows mellow: dim always, brighter as the wave passes, never a flash', () => {
    const o = [0, 0, 0, 0, 0, 0];
    const a = [0, 0, 0, 0, 0, 0];
    for (const p of P.slice(0, 30)) {
      for (let s = 0; s < panelSites(p); s += 3) {
        for (let t = 0; t < 2; t += 0.25) {
          arrowSite(p, p.c, s, t, o);
          arrowSite(p, p.c, s, t + 1 / 60, a);
          expect(o.every(Number.isFinite)).toBe(true);
          const m = Math.max(o[3] as number, o[4] as number, o[5] as number);
          expect(m).toBeGreaterThan(0.03);
          expect(m).toBeLessThan(0.5);
          expect(Math.abs((a[3] as number) - (o[3] as number))).toBeLessThan(0.05);
        }
      }
    }
  });

  it('draws the nearest rows ahead down a corridor, a modest share of the pool, none from high over the city', () => {
    const eye: Vec3 = [CORRIDOR_X[1] as number, GROUND + 20, 400];
    const items = arrowItems(eye, [0, 0, -1], 5, 600);
    expect(items.length).toBeGreaterThan(4);
    expect(items.length).toBeLessThanOrEqual(MOST_ARROWS);
    expect(items.reduce((n, it) => n + it.count, 0)).toBeLessThan(4000);
    for (const it of items) expect(it.d).toBeLessThanOrEqual(ARROW_REACH);
    expect(arrowItems([0, GROUND + 400, 400], [0, -1, 0], 5, 900)).toEqual([]);
  });
});
