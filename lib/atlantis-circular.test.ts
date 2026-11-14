import { describe, expect, it } from 'vitest';

import {
  ATLANTIS_NODES,
  atlantisAt,
  BERTHS,
  COMPARTMENTS,
  COMPLEX_R,
  COMPLEX_RING,
  COMPLEXES,
  dockedSub,
  GREAT_H,
  PLAZA_R,
  prepareAtlantis,
  roleShare,
  SUB_COUNT,
  submarine,
  TUNNEL_R,
  TUNNELS,
} from './atlantis';
import { makeParticles } from './bigbang';
import { GROUND_Y } from './grain-mesh';

/*
 * 2026-11-14: "make Atlantis more vertical with factories domes towers but all connecting with
 * human sized tunnels unravelling around it and in circles or spirals around some buildings ...
 * adding 4 dome complexes NSEW so it creates this super cool circular design with circle plazas
 * and complexes at every quarter."
 */

const G = GROUND_Y;
const all = makeParticles(9000);
const TAU = Math.PI * 2;
const dist = (a: number[], b: number[]) =>
  Math.hypot(
    (a[0] as number) - (b[0] as number),
    (a[1] as number) - (b[1] as number),
    (a[2] as number) - (b[2] as number),
  );
const flat = (a: number[], b: number[]) =>
  Math.hypot((a[0] as number) - (b[0] as number), (a[2] as number) - (b[2] as number));
const radius = (a: number[]) => Math.hypot(a[0] as number, a[2] as number);
/** The tallest of the noted solids (not the tunnels) whose middle passes `where`. */
const tallest = (where: (r: number) => boolean) =>
  Math.max(
    ...COMPARTMENTS.filter((C) => C.kind !== 'tunnel' && where(radius(C.c))).map(
      (C) => C.c[1] + C.r - G,
    ),
  );
/** The new solid things of 2026-11-14 (the complexes' domes are 'dome', found by place). */
const NEW_KINDS = ['tower', 'factory', 'stack', 'tunnel'];
const inAComplex = (c: number[]) =>
  COMPLEXES.some((X) => flat(c, X.c) < COMPLEX_RING + 3) && radius(c) > COMPLEX_R - 13;

/** The grains view v gives `role`, drawn at time t. */
const roles = [
  'plankton',
  'shaft',
  'floor',
  'city',
  'temple',
  'harbour',
  'reef',
  'sub',
  'bubble',
  'dock',
  'fish',
  'jelly',
  'manta',
  'whale',
  'map',
  'rise',
  'tunnel',
];
function grains(v: number, role: string, t = 12) {
  let lo = 0;
  for (const r of roles) {
    if (r === role) break;
    lo += roleShare(v, r);
  }
  const hi = lo + roleShare(v, role);
  return all.filter((p) => p.c >= lo && p.c < hi).map((p) => atlantisAt(p, 0.3, t, v));
}

prepareAtlantis();

describe('Atlantis, circular and vertical (2026-11-14)', () => {
  it('sets four dome complexes on the four axes at one radius, each round its own plaza', () => {
    expect(COMPLEXES.map((C) => C.name)).toEqual(['N', 'E', 'S', 'W']);
    COMPLEXES.forEach((C, i) => {
      // On the boulevards of the four long loops: a quarter turn apart, all equally far out.
      expect(C.a).toBeCloseTo((i * TAU) / 4, 9);
      expect(radius(C.c)).toBeCloseTo(COMPLEX_R, 9);
      expect(C.c[1]).toBe(G);
      // The plaza in the middle is open: no dome or tower stands on it.
      const onPlaza = COMPARTMENTS.filter((X) => X.kind !== 'tunnel' && flat(X.c, C.c) < PLAZA_R);
      expect(onPlaza).toEqual([]);
      // Domes of several sizes round it, two of them stacks rising high.
      const round = COMPARTMENTS.filter(
        (X) => X.kind === 'dome' && flat(X.c, C.c) < COMPLEX_RING + 1 && flat(X.c, C.c) > PLAZA_R,
      );
      expect(round.length).toBe(4);
      expect(new Set(round.map((X) => X.r.toFixed(2))).size).toBe(2);
      const stacks = COMPARTMENTS.filter(
        (X) => X.kind === 'stack' && flat(X.c, C.c) < COMPLEX_RING + 1,
      );
      expect(new Set(stacks.map((X) => `${X.c[0].toFixed(1)},${X.c[2].toFixed(1)}`)).size).toBe(2);
      expect(Math.max(...stacks.map((X) => X.c[1] + X.r - G))).toBeGreaterThan(8);
      // A ring tunnel bounds the plaza.
      expect(
        TUNNELS.some(
          (T) => T.kind === 'ring' && T.around && flat(T.around, C.c) < 1e-9 && T.closed,
        ),
      ).toBe(true);
    });
    // The plan is symmetric: each complex the last turned a quarter round the heart.
    const ring = (C: (typeof COMPLEXES)[number]) =>
      COMPARTMENTS.filter((X) => X.kind !== 'tunnel' && flat(X.c, C.c) < COMPLEX_RING + 3).map(
        (X) => {
          const dx = X.c[0] - C.c[0];
          const dz = X.c[2] - C.c[2];
          const c = Math.cos(-C.a);
          const s = Math.sin(-C.a);
          return [dx * c - dz * s, X.c[1], dx * s + dz * c, X.r];
        },
      );
    const first = ring(COMPLEXES[0] as (typeof COMPLEXES)[number]);
    for (const C of COMPLEXES) {
      const these = ring(C);
      expect(these.length).toBe(first.length);
      for (const x of these)
        expect(
          first.some((y) => dist(x, y) + Math.abs((x[3] as number) - (y[3] as number)) < 1e-6),
        ).toBe(true);
    }
  });

  it('rises: far taller than before, the skyline climbing in rings toward the heart', () => {
    // Before: the spires reached 7.8 and the heart's dome 5.2.
    expect(tallest(() => true)).toBeGreaterThan(7.8 * 2);
    expect(tallest(() => true)).toBeLessThan(GREAT_H + 1.5);
    const knowledge = tallest((r) => r < 9);
    const making = tallest((r) => r > 9 && r < 17);
    const outer = tallest((r) => r > 17);
    expect(knowledge).toBeGreaterThan(making + 2);
    expect(making).toBeGreaterThan(outer + 2);
    // Every compartment of the ring of making has its factory; the four diagonals a great tower.
    const factories = new Set(
      COMPARTMENTS.filter((C) => C.kind === 'factory').map(
        (C) => `${C.c[0].toFixed(1)},${C.c[2].toFixed(1)}`,
      ),
    );
    expect(factories.size).toBe(12);
    const towers = COMPARTMENTS.filter((C) => C.kind === 'tower' && C.c[1] + C.r - G > 15);
    expect(new Set(towers.map((C) => `${C.c[0].toFixed(1)},${C.c[2].toFixed(1)}`)).size).toBe(4);
    for (const C of towers)
      expect(Math.abs(Math.abs(C.c[0]) - Math.abs(C.c[2]))).toBeLessThan(1e-6);
  });

  it('joins the heart, every tower and every complex through human-sized tunnels', () => {
    // Human sized: thin beside the boulevards' glass tunnels (0.35) and the great towers.
    expect(TUNNEL_R * 2).toBeLessThan(0.35);
    expect(TUNNEL_R).toBeLessThan(GREAT_H / 100);
    const drawn = TUNNELS.filter((T) => T.drawn);
    expect(drawn.length).toBeGreaterThan(60);
    // Each tunnel starts at the place it names and ends at the other.
    for (const T of TUNNELS) {
      const A = ATLANTIS_NODES[T.a];
      const B = ATLANTIS_NODES[T.b];
      expect(A && B).toBeTruthy();
      if (!A || !B) continue;
      expect(flat(T.pts[0] as number[], A.c)).toBeLessThan(A.reach);
      expect(flat(T.pts[T.pts.length - 1] as number[], B.c)).toBeLessThan(B.reach);
      // Points close together, so the path reads smooth; never under the floor.
      for (let i = 1; i < T.pts.length; i++)
        expect(dist(T.pts[i] as number[], T.pts[i - 1] as number[])).toBeLessThan(1.6);
      for (const q of T.pts) expect(q[1]).toBeGreaterThan(G);
    }
    // Everything reachable from the heart, walking the tunnels.
    const seen = new Set(['heart']);
    for (let grew = true; grew; ) {
      grew = false;
      for (const T of TUNNELS)
        for (const [x, y] of [
          [T.a, T.b],
          [T.b, T.a],
        ] as const)
          if (seen.has(x) && !seen.has(y)) {
            seen.add(y);
            grew = true;
          }
    }
    for (const id of ['N', 'E', 'S', 'W', 'tower-1', 'tower-4', 'tower-7', 'tower-10'])
      expect(seen.has(id)).toBe(true);
    expect(seen.size).toBe(Object.keys(ATLANTIS_NODES).length);
    // The complexes are joined round the circle too, each to the next.
    for (let i = 0; i < 4; i++) {
      const a = COMPLEXES[i]?.name;
      const b = COMPLEXES[(i + 1) % 4]?.name;
      expect(TUNNELS.some((T) => T.kind === 'arc' && T.a === a && T.b === b)).toBe(true);
    }
  });

  it('winds helices up towers, spires and stacks, and rings round domes', () => {
    const helices = TUNNELS.filter((T) => T.kind === 'helix');
    const round = new Set<string>();
    for (const T of helices) {
      const c = T.around as number[];
      expect(c).toBeTruthy();
      let turn = 0;
      for (let i = 1; i < T.pts.length; i++) {
        const p = T.pts[i - 1] as number[];
        const q = T.pts[i] as number[];
        const a0 = Math.atan2(
          (p[2] as number) - (c[2] as number),
          (p[0] as number) - (c[0] as number),
        );
        const a1 = Math.atan2(
          (q[2] as number) - (c[2] as number),
          (q[0] as number) - (c[0] as number),
        );
        turn += ((a1 - a0 + 3 * Math.PI) % TAU) - Math.PI;
      }
      expect(Math.abs(turn)).toBeGreaterThan(TAU * 1.4);
      // It climbs as it winds.
      expect((T.pts[T.pts.length - 1] as number[])[1]).toBeGreaterThan(
        (T.pts[0] as number[])[1] + 2,
      );
      round.add(`${(c[0] as number).toFixed(1)},${(c[2] as number).toFixed(1)}`);
    }
    expect(round.size).toBeGreaterThanOrEqual(12);
    const rings = TUNNELS.filter((T) => T.kind === 'ring');
    expect(rings.length).toBeGreaterThanOrEqual(9);
    for (const T of rings) {
      expect(T.closed).toBe(true);
      expect(dist(T.pts[0] as number[], T.pts[T.pts.length - 1] as number[])).toBe(0);
    }
  });

  it('keeps every submarine clear of the new towers, factories, stacks, domes and tunnels', () => {
    const solid = COMPARTMENTS.filter((C) => NEW_KINDS.includes(C.kind) || inAComplex(C.c));
    for (const kind of NEW_KINDS) expect(solid.some((C) => C.kind === kind)).toBe(true);
    // Every drawn tunnel point has its bounding sphere.
    const tunnels = COMPARTMENTS.filter((C) => C.kind === 'tunnel');
    expect(tunnels.length).toBe(
      TUNNELS.filter((T) => T.drawn).reduce((s, T) => s + T.pts.length, 0),
    );
    let hit = 0;
    for (let g = 0; g < SUB_COUNT; g++)
      for (let t = 0; t < 120; t += 0.9) {
        const { c } = submarine(g, t);
        for (const C of solid) if (dist(c, C.c) < C.r + 0.3) hit++;
      }
    // And the harbour's own, coming in, resting and leaving through the north complex.
    for (let b = 0; b < BERTHS.length; b++)
      for (let t = 0; t < 26; t += 0.25) {
        const { c } = dockedSub(b, t);
        for (const C of solid) if (dist(c, C.c) < C.r + 0.3) hit++;
      }
    expect(hit).toBe(0);
  });

  it('stays calm and in Atlantis’s colours: no brighter than the city, its tunnels fainter', () => {
    for (const v of [1, 3, 4]) {
      const city = grains(v, 'city');
      const shade = (s: { rgb: number[] }) => Math.max(...s.rgb);
      const lit = (L: { rgb: number[] }[]) => L.filter((s) => shade(s) > 0.01);
      const mean = (L: { rgb: number[] }[]) =>
        lit(L).reduce((a, s) => a + shade(s), 0) / lit(L).length;
      const cityMax = Math.max(...city.map(shade));
      const rise = grains(v, 'rise');
      const tunnel = grains(v, 'tunnel');
      expect(lit(rise).length).toBeGreaterThan(rise.length * 0.85);
      expect(lit(tunnel).length).toBeGreaterThan(tunnel.length * 0.85);
      expect(mean(rise)).toBeLessThan(mean(city) * 1.25);
      expect(Math.max(...rise.map(shade))).toBeLessThan(cityMax + 0.1);
      expect(mean(tunnel)).toBeLessThan(mean(city));
      expect(Math.max(...tunnel.map(shade))).toBeLessThan(0.4);
      // Every colour is one Atlantis already shows (by hue, its brightest channel taken as 1).
      const hue = (s: { rgb: number[] }) => s.rgb.map((x) => x / shade(s));
      const palette = lit([
        ...city,
        ...grains(v, 'temple'),
        ...grains(v, 'harbour'),
        ...grains(v, 'bubble'),
      ]).map(hue);
      let off = 0;
      for (const s of [...lit(rise), ...lit(tunnel)]) {
        const h = hue(s);
        if (!palette.some((P) => dist(P, h) < 0.12)) off++;
      }
      expect(off).toBeLessThan((lit(rise).length + lit(tunnel).length) * 0.02);
    }
  });

  it('drifts its pulses slowly along the tunnels: a frame apart nothing jumps', () => {
    for (const v of [0, 3]) {
      const a = grains(v, 'tunnel', 20);
      const b = grains(v, 'tunnel', 20 + 1 / 60);
      let jump = 0;
      let moved = 0;
      a.forEach((s, i) => {
        const o = b[i] as { pos: number[]; rgb: number[] };
        jump = Math.max(jump, dist(s.rgb, o.rgb));
        const d = dist(s.pos, o.pos);
        if (d > 1e-6) moved++;
        // Slowly: under 0.6 a second, unless coming round at an open end, unseen.
        if (d > 0.6 / 60) expect(Math.max(...s.rgb, ...o.rgb)).toBeLessThan(0.01);
      });
      expect(jump).toBeLessThan(0.02);
      expect(moved).toBeGreaterThan(a.length * 0.2);
    }
  });
});
