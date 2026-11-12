/*
 * FROM ABOVE: five night cities seen from far above, the City chapter's piece
 * (docs/specs/art-city.md). They began in Vegetal as its City piece and moved
 * here on 2026-11-12 ("all the visuals of cities seen from above which were in
 * vegetal ... bring them back into city"), looking just as they did.
 *
 * 2026-11-12: "then do a new one called city. cityscapes seen from above in
 * vegetal. like cities seen from space or from an airplane (must look a bit
 * like the roots visuals but more structured). do 5 such visuals in the
 * cities collection." A city at night lies flat across the picture, as from
 * an airplane window: grains of light along its streets, avenues and ring
 * roads; a dense, bright centre fading to sparse suburbs; highways reaching
 * into the dark and forking at their ends like roots; car lights moving along
 * the fast roads, white one way and amber the other. Water and parks stay
 * dark. The lights come on from the centre out, and the eye drifts slowly
 * over it. Pills pick one of five cities:
 *   Grid    a tilted grid, a diagonal avenue across it, a river with bridges
 *   Star    boulevards from one centre, ring roads round it, a dark park
 *   River   an old city grown like roots from two cores, a winding river
 *   Bay     ring roads in half circles round the head of a bay, an island
 *   Canals  rings of canals round a harbour, a sparser town across the water
 * The plans are laid out on a unit disc and drawn CITY_K across, flat in the
 * x–y plane, the eye looking down the z axis.
 *
 * Pure: no three.js, no DOM.
 */

import { hash, type Particle, type RGB, smooth, type Vec3 } from './bigbang';
import {
  along,
  grow,
  type Route,
  resample,
  routeLength,
  type Seg,
  sampleChain,
  seeded,
} from './star-tree';

const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const wrap = (x: number, n: number) => ((x % n) + n) % n;
const at = (v: readonly number[], i: number) => v[i] as number;

export const CITY_K = 46;
type Road = { route: Route; rank: number };
type CityPlan = {
  roads: Road[];
  /** Running total of each road's share of the street grains, and of the fast roads' cars. */
  cum: Float64Array;
  fast: number[];
  fastCum: Float64Array;
  wet: (x: number, y: number) => boolean;
  dens: (x: number, y: number) => number;
  centre: [number, number];
};
type Keep = (x: number, y: number) => boolean;
/** How many street grains a unit of road takes, by rank: highway, avenue, street, lane. */
const RANK_W = [1.1, 1.5, 1, 0.45];

/** Points from (x0, y0) to (x1, y1), close enough together to cut at a shore. */
function lineRaw(x0: number, y0: number, x1: number, y1: number): number[] {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.01));
  const raw: number[] = [];
  for (let i = 0; i <= n; i++) raw.push(lerp(x0, x1, i / n), lerp(y0, y1, i / n), 0.01);
  return raw;
}
/** Points round an arc about (cx, cy). */
function arcRaw(cx: number, cy: number, r: number, a0: number, a1: number): number[] {
  const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * r) / 0.01));
  const raw: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = lerp(a0, a1, i / n);
    raw.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.01);
  }
  return raw;
}
/** Points along a curve q -> (x, y), q from 0 to 1. */
function curveRaw(f: (q: number) => [number, number], n: number): number[] {
  const raw: number[] = [];
  for (let i = 0; i <= n; i++) raw.push(...f(i / n), 0.01);
  return raw;
}
/** A path cut into the stretches `keep` allows, each one a road of the given rank. */
function roadsOf(raw: number[], rank: number, keep: Keep, out: Road[]) {
  let run: number[] = [];
  const flush = () => {
    if (run.length >= 9) {
      const route = resample(run);
      if (route.count > 2) out.push({ route, rank });
    }
    run = [];
  };
  for (let i = 0; i + 2 < raw.length; i += 3) {
    const x = at(raw, i);
    const y = at(raw, i + 1);
    if (keep(x, y)) run.push(x, y, at(raw, i + 2));
    else flush();
  }
  flush();
}
/** Branching roads grown like roots from (x, y) toward `angle` (from +y, toward +x). */
function rootRoads(
  rng: () => number,
  x: number,
  y: number,
  angle: number,
  len: number,
  depth: number,
  spread: number,
  shrink: number,
  rank: number,
  keep: Keep,
  out: Road[],
) {
  const chains: Seg[][] = [];
  grow(rng, x, y, angle, len, 0.01, depth, spread, shrink, [], chains);
  // The chains share their first stretches; each stretch is laid once, so no road is doubled.
  // The first stretches are the main roads, a rank up; the finer they fork, the smaller the road.
  const laid = new Set<Seg>();
  for (const c of chains) {
    c.forEach((seg, i) => {
      if (laid.has(seg)) return;
      laid.add(seg);
      const r = Math.min(3, Math.max(0, rank - 1 + Math.floor(i / 2)));
      roadsOf(sampleChain([seg], false), r, keep, out);
    });
  }
}
/** Inside a ragged edge of radius R round (cx, cy), so no city is a perfect circle. */
const within = (x: number, y: number, R: number, cx = 0, cy = 0) => {
  const a = Math.atan2(y - cy, x - cx);
  return (
    Math.hypot(x - cx, y - cy) < R * (1 + 0.16 * Math.sin(3 * a + 1.3) + 0.09 * Math.sin(7 * a))
  );
};
const falloff = (cx: number, cy: number, s: number) => (x: number, y: number) =>
  Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (s * s));
/** Highways out from radius r0 round (cx, cy), each forking at its end like a root. */
function highways(
  rng: () => number,
  n: number,
  r0: number,
  keep: Keep,
  out: Road[],
  cx = 0,
  cy = 0,
  turn = 0.4,
) {
  for (let k = 0; k < n; k++) {
    const a = turn + (k / n) * TAU + (rng() - 0.5) * 0.4;
    rootRoads(
      rng,
      cx + Math.sin(a) * r0,
      cy + Math.cos(a) * r0,
      a,
      0.2,
      3,
      0.32,
      0.82,
      0,
      keep,
      out,
    );
  }
}

type CityKind = {
  name: string;
  seed: number;
  build: (rng: () => number) => Omit<CityPlan, 'cum' | 'fast' | 'fastCum'>;
};

export const CITIES: CityKind[] = [
  {
    name: 'Grid',
    seed: 61,
    build: (rng) => {
      // A grid tilted a little, close in the middle and twice as wide in the suburbs.
      const riverY = (x: number) => -0.32 + 0.22 * x + 0.03 * Math.sin(5 * x);
      const wet = (x: number, y: number) => Math.abs(y - riverY(x)) < 0.05;
      const roads: Road[] = [];
      const rot = 0.32;
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const toWorld = (gx: number, gy: number): [number, number] => [
        gx * c - gy * s,
        gx * s + gy * c,
      ];
      for (let i = -22; i <= 22; i++) {
        const v = i * 0.05;
        const rank = i % 4 === 0 ? 1 : i % 2 === 0 ? 2 : 3;
        const R = i % 2 === 0 ? 1 : 0.6;
        // Avenues cross the river on bridges; streets stop at its banks.
        const keep: Keep = (x, y) => within(x, y, R) && (rank === 1 || !wet(x, y));
        for (const axis of [0, 1]) {
          const raw = curveRaw((q) => {
            const w = -1.3 + 2.6 * q;
            return axis ? toWorld(v, w) : toWorld(w, v);
          }, 260);
          roadsOf(raw, rank, keep, roads);
        }
      }
      // One old road cuts across the grid on a slant, and the river's two embankments.
      const land: Keep = (x, y) => within(x, y, 1.05) && !wet(x, y);
      roadsOf(
        curveRaw((q) => [-1 + 2 * q, -0.75 + 1.4 * q + 0.12 * Math.sin(q * 4)], 300),
        1,
        (x, y) => within(x, y, 1.05),
        roads,
      );
      for (const side of [-1, 1])
        roadsOf(
          curveRaw((q) => [-1.1 + 2.2 * q, riverY(-1.1 + 2.2 * q) + side * 0.065], 300),
          2,
          land,
          roads,
        );
      highways(rng, 6, 0.75, (x, y) => !wet(x, y) && Math.hypot(x, y) < 1.45, roads);
      return { roads, wet, dens: falloff(0.05, 0.08, 0.5), centre: [0.05, 0.08] };
    },
  },
  {
    name: 'Star',
    seed: 67,
    build: (rng) => {
      // A dark park east of the centre: no lights in it.
      const wet = (x: number, y: number) => Math.hypot(x - 0.3, y + 0.24) < 0.08;
      const roads: Road[] = [];
      const keep: Keep = (x, y) => within(x, y, 0.95) && !wet(x, y);
      const B = 12;
      for (let k = 0; k < B; k++) {
        const a = (k / B) * TAU;
        roadsOf(
          lineRaw(Math.cos(a) * 0.03, Math.sin(a) * 0.03, Math.cos(a), Math.sin(a)),
          1,
          keep,
          roads,
        );
        // Short streets fan out between the boulevards, more of them further out.
        for (let m = 1; m < 6; m++) {
          const b = a + (m / 6) * (TAU / B);
          const r0 = m % 2 ? 0.2 : 0.1;
          roadsOf(
            lineRaw(Math.cos(b) * r0, Math.sin(b) * r0, Math.cos(b) * 0.9, Math.sin(b) * 0.9),
            3,
            keep,
            roads,
          );
        }
      }
      roadsOf(arcRaw(0, 0, 0.03, 0, TAU), 1, () => true, roads);
      roadsOf(arcRaw(0, 0, 0.2, 0, TAU), 1, (x, y) => !wet(x, y), roads);
      roadsOf(arcRaw(0, 0, 0.42, 0, TAU), 1, (x, y) => !wet(x, y), roads);
      roadsOf(arcRaw(0, 0, 0.72, 0, TAU), 0, () => true, roads);
      for (let r = 0.08; r < 0.95; r += 0.055) roadsOf(arcRaw(0, 0, r, 0, TAU), 2, keep, roads);
      highways(rng, 8, 0.9, (x, y) => Math.hypot(x, y) < 1.45, roads, 0, 0, 0.2);
      return { roads, wet, dens: falloff(0, 0, 0.45), centre: [0, 0] };
    },
  },
  {
    name: 'River',
    seed: 71,
    build: (rng) => {
      // An old city grown from two cores, one on each bank of a winding river.
      const riverY = (x: number) => 0.12 * Math.sin(2.4 * x + 0.5) + 0.05 * Math.sin(5.1 * x);
      const half = (x: number) => 0.035 + 0.012 * x;
      const wet = (x: number, y: number) => Math.abs(y - riverY(x)) < half(x);
      const roads: Road[] = [];
      const keep: Keep = (x, y) => within(x, y, 1.05) && !wet(x, y);
      for (let k = 0; k < 11; k++)
        rootRoads(
          rng,
          0.05,
          0.2,
          (k / 11) * TAU + rng() * 0.3,
          0.13,
          6,
          0.55,
          0.86,
          2,
          keep,
          roads,
        );
      for (let k = 0; k < 7; k++)
        rootRoads(
          rng,
          -0.3,
          -0.22,
          (k / 7) * TAU + rng() * 0.3,
          0.12,
          5,
          0.55,
          0.86,
          2,
          keep,
          roads,
        );
      for (const side of [-1, 1])
        roadsOf(
          curveRaw((q) => {
            const x = -1.1 + 2.2 * q;
            return [x, riverY(x) + side * (half(x) + 0.014)];
          }, 300),
          2,
          (x, y) => within(x, y, 0.85),
          roads,
        );
      for (const x of [-0.55, -0.2, 0.15, 0.5])
        roadsOf(lineRaw(x, riverY(x) - 0.1, x + 0.02, riverY(x) + 0.1), 1, () => true, roads);
      highways(rng, 5, 0.7, (x, y) => !wet(x, y) && Math.hypot(x, y) < 1.45, roads);
      return {
        roads,
        wet,
        dens: (x, y) =>
          Math.max(falloff(0.05, 0.2, 0.34)(x, y), 0.8 * falloff(-0.3, -0.22, 0.26)(x, y)),
        centre: [0.05, 0.2],
      };
    },
  },
  {
    name: 'Bay',
    seed: 73,
    build: (rng) => {
      // The sea to the north, pushing a bay south into the land, and an island off the coast.
      const coastY = (x: number) =>
        0.38 - 0.34 * Math.exp(-((x / 0.38) ** 2)) + 0.025 * Math.sin(9 * x);
      const island = (x: number, y: number) => Math.hypot((x - 0.55) / 1.4, y - 0.66) < 0.1;
      const wet = (x: number, y: number) => y > coastY(x) && !island(x, y);
      const roads: Road[] = [];
      const c: [number, number] = [0, -0.04];
      const land: Keep = (x, y) => !wet(x, y);
      const keep: Keep = (x, y) => within(x, y, 1.05, c[0], c[1]) && land(x, y);
      // Ring roads in half circles round the head of the bay, boulevards fanning inland.
      roadsOf(arcRaw(c[0], c[1], 0.25, 0, TAU), 1, land, roads);
      roadsOf(arcRaw(c[0], c[1], 0.5, 0, TAU), 0, land, roads);
      roadsOf(arcRaw(c[0], c[1], 0.82, 0, TAU), 0, land, roads);
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU;
        roadsOf(
          lineRaw(c[0], c[1], c[0] + Math.cos(a) * 1.05, c[1] + Math.sin(a) * 1.05),
          1,
          keep,
          roads,
        );
      }
      for (let i = -18; i <= 18; i++) {
        const v = i * 0.05;
        const rank = i % 2 ? 3 : 2;
        const R = i % 2 ? 0.5 : 0.95;
        const k2: Keep = (x, y) => within(x, y, R, c[0], c[1]) && land(x, y);
        roadsOf(lineRaw(-1, v, 1, v + 0.12), rank, k2, roads);
        roadsOf(lineRaw(v, -1, v - 0.12, 1), rank, k2, roads);
      }
      // The shore road, the island's streets and its bridge, and piers into the bay.
      roadsOf(
        curveRaw((q) => [-1.1 + 2.2 * q, coastY(-1.1 + 2.2 * q) - 0.018], 400),
        1,
        (x, y) => land(x, y) && Math.abs(x) < 1.05,
        roads,
      );
      for (let i = -3; i <= 3; i++) {
        roadsOf(lineRaw(0.55 + i * 0.04, 0.5, 0.55 + i * 0.04, 0.8), 2, island, roads);
        roadsOf(lineRaw(0.35, 0.66 + i * 0.03, 0.75, 0.66 + i * 0.03), 2, island, roads);
      }
      roadsOf(lineRaw(0.5, coastY(0.5) - 0.02, 0.52, 0.58), 1, () => true, roads);
      for (const x of [-0.3, -0.15, 0.12, 0.28])
        roadsOf(lineRaw(x, coastY(x) - 0.01, x, coastY(x) + 0.06), 2, () => true, roads);
      highways(
        rng,
        5,
        0.85,
        (x, y) => land(x, y) && Math.hypot(x, y) < 1.45,
        roads,
        c[0],
        c[1],
        2.4,
      );
      return { roads, wet, dens: falloff(c[0], c[1], 0.45), centre: c };
    },
  },
  {
    name: 'Canals',
    seed: 79,
    build: (rng) => {
      // A harbour across the city's north, and rings of canals round the old centre on its shore.
      const c: [number, number] = [0, 0.3];
      const harbour = (x: number, y: number) =>
        Math.abs(y - (0.42 + 0.03 * Math.sin(6 * x))) < 0.09;
      const CANALS = [0.13, 0.21, 0.29, 0.37, 0.45];
      const canal = (x: number, y: number) => {
        if (y > c[1]) return false;
        const r = Math.hypot(x - c[0], y - c[1]);
        return CANALS.some((R) => Math.abs(r - R) < 0.014);
      };
      const wet = (x: number, y: number) => harbour(x, y) || canal(x, y);
      const roads: Road[] = [];
      const dry: Keep = (x, y) => !wet(x, y);
      // Both banks of every canal, and streets crossing them on bridges toward the centre.
      for (const R of CANALS)
        for (const side of [-1, 1])
          roadsOf(arcRaw(c[0], c[1], R + side * 0.026, Math.PI, TAU), 2, dry, roads);
      for (let k = 0; k <= 24; k++) {
        const a = Math.PI + (k / 24) * Math.PI;
        roadsOf(
          lineRaw(
            c[0] + Math.cos(a) * 0.05,
            c[1] + Math.sin(a) * 0.05,
            c[0] + Math.cos(a) * 0.95,
            c[1] + Math.sin(a) * 0.95,
          ),
          k % 4 ? 3 : 1,
          (x, y) => !harbour(x, y) && within(x, y, 0.95, c[0], c[1]),
          roads,
        );
      }
      // Beyond the canals, a newer grid; across the harbour a sparser town.
      for (let i = -20; i <= 20; i++) {
        const v = i * 0.06;
        const k2: Keep = (x, y) => {
          const r = Math.hypot(x - c[0], y - c[1]);
          return dry(x, y) && r > 0.52 && within(x, y, y > c[1] ? 0.75 : 1.05, c[0], c[1]);
        };
        roadsOf(lineRaw(-1.1, v + 0.1, 1.1, v - 0.1), i % 2 ? 3 : 2, k2, roads);
        roadsOf(lineRaw(v - 0.1, -1.1, v + 0.1, 1.1), i % 2 ? 3 : 2, k2, roads);
      }
      roadsOf(arcRaw(c[0], c[1], 0.72, Math.PI, TAU), 0, dry, roads);
      roadsOf(lineRaw(-0.12, 0.3, -0.1, 0.56), 1, () => true, roads);
      roadsOf(lineRaw(0.22, 0.3, 0.24, 0.56), 1, () => true, roads);
      highways(
        rng,
        5,
        0.75,
        (x, y) => dry(x, y) && Math.hypot(x, y) < 1.45,
        roads,
        c[0],
        c[1],
        2.2,
      );
      return { roads, wet, dens: falloff(c[0], c[1] - 0.12, 0.45), centre: [c[0], c[1] - 0.12] };
    },
  },
];
let cityKind = 0;
const cityPlans: (CityPlan | null)[] = CITIES.map(() => null);

/** City `kind`'s plan, with each road's share of the street grains and of the cars. */
export function cityPlan(kind = cityKind): CityPlan {
  const cached = cityPlans[kind];
  if (cached) return cached;
  const base = (CITIES[kind] as CityKind).build(seeded((CITIES[kind] as CityKind).seed));
  const cum = new Float64Array(base.roads.length);
  const fast: number[] = [];
  let sum = 0;
  base.roads.forEach((r, i) => {
    sum += routeLength(r.route) * at(RANK_W, r.rank);
    cum[i] = sum;
    if (r.rank <= 1) fast.push(i);
  });
  const fastCum = new Float64Array(fast.length);
  let fsum = 0;
  fast.forEach((i, j) => {
    fsum += routeLength((base.roads[i] as Road).route);
    fastCum[j] = fsum;
  });
  for (let i = 0; i < cum.length; i++) cum[i] = (cum[i] as number) / sum;
  for (let i = 0; i < fastCum.length; i++) fastCum[i] = (fastCum[i] as number) / fsum;
  const plan = { ...base, cum, fast, fastCum };
  cityPlans[kind] = plan;
  return plan;
}

/** The first index whose running total passes q. */
function pickIn(cum: Float64Array, q: number): number {
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((cum[mid] as number) < q) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

type CityRole = 'car' | 'street' | 'glow' | 'core';
const cityRole = (p: Particle): CityRole =>
  p.c < 0.08 ? 'car' : p.c < 0.74 ? 'street' : p.c < 0.95 ? 'glow' : 'core';
/** A grain of the city: where it is on the plan, the rank of its road, how dense the city is there. */
type CityGrain = { x: number; y: number; rank: number; dens: number; way: number };

/*
 * Each grain tries a few places in turn, taking the first the city's density
 * allows, so most land in the centre and fewer out in the suburbs, while the
 * highways keep theirs all the way out.
 */
export function cityGrain(p: Particle, t: number): CityGrain {
  const plan = cityPlan();
  const role = cityRole(p);
  if (role === 'car') {
    const road = plan.roads[at(plan.fast, pickIn(plan.fastCum, p.a))] as Road;
    const len = routeLength(road.route);
    const way = p.d < 0.5 ? 1 : -1;
    const s = wrap(p.b * len + way * t * 0.05 * (0.8 + 0.4 * hash(p.i, 85)), len);
    const [x, y] = along(road.route, s);
    return { x, y, rank: road.rank, dens: plan.dens(x, y), way };
  }
  if (role === 'core') {
    // The bright heart of the city, packed round its centre.
    for (let n = 0; n < 4; n++) {
      const a = hash(p.i, 86 + n) * TAU;
      const r = 0.1 * Math.sqrt(-2 * Math.log(1 - 0.95 * hash(p.i, 90 + n)));
      const x = plan.centre[0] + Math.cos(a) * r;
      const y = plan.centre[1] + Math.sin(a) * r;
      if (!plan.wet(x, y)) return { x, y, rank: 1, dens: plan.dens(x, y), way: 0 };
    }
  }
  let g: CityGrain = { x: 0, y: 0, rank: 3, dens: 0, way: 0 };
  for (let n = 0; n < 4; n++) {
    const q = n === 0 ? p.a : hash(p.i, 94 + n);
    const road = plan.roads[pickIn(plan.cum, q)] as Road;
    const len = routeLength(road.route);
    const s = (n === 0 ? p.b : hash(p.i, 98 + n)) * len;
    let [x, y] = along(road.route, s);
    if (role === 'glow') {
      // Lights in the blocks either side of the street, the windows and yards between roads.
      const [x2, y2] = along(road.route, Math.min(len, s + 0.01));
      const [x1, y1] = along(road.route, Math.max(0, s - 0.01));
      const l = Math.hypot(x2 - x1, y2 - y1) || 1;
      const off = (hash(p.i, 102 + n) - 0.5) * 0.04;
      x += (-(y2 - y1) / l) * off;
      y += ((x2 - x1) / l) * off;
      if (plan.wet(x, y)) continue;
    }
    const dens = plan.dens(x, y);
    g = { x, y, rank: road.rank, dens, way: 0 };
    const allow = road.rank === 0 && role === 'street' ? 1 : 0.08 + 0.92 * dens ** 0.8;
    if (hash(p.i, 106 + n) < allow) break;
  }
  return g;
}

/** How far the lights have come on at plan point (x, y), `u` through the piece: from the centre out. */
const cityLit = (x: number, y: number, u: number) => {
  const c = cityPlan().centre;
  return smooth((u * 5.5 - Math.hypot(x - c[0], y - c[1])) / 0.25);
};

const cityPos = (p: Particle, g: CityGrain): Vec3 => [
  g.x * CITY_K,
  g.y * CITY_K,
  (p.d - 0.5) * 0.3 + (cityRole(p) === 'core' ? p.b * 1.2 : 0),
];

/** Which of the five cities the pills have picked; the first in the Journey. */
export function setCityKind(i: number) {
  cityKind = CITIES[i] ? i : 0;
}

/* The lights, the Vegetal palette they were made in: sodium, amber, sugar and a warm white. */
const GOLD: RGB = [196 / 255, 160 / 255, 96 / 255];
const SUGAR: RGB = [1, 0.78, 0.38];
const SUN: RGB = [1, 0.97, 0.8];
const AMBER: RGB = [1, 0.62, 0.18];
const SODIUM: RGB = [1, 0.66, 0.28];

/** Every grain's own slow twinkle. */
const twinkleOf = (p: Particle, t: number) => 0.7 + 0.3 * Math.sin(t * 1.7 + p.i * 0.37);

/** A city's light: brighter and whiter toward the centre, amber along the highways and suburbs. */
function cityColour(p: Particle, u: number, t: number, g: CityGrain): RGB {
  const twinkle = twinkleOf(p, t);
  const lit = cityLit(g.x, g.y, u);
  const d = g.dens;
  switch (cityRole(p)) {
    case 'car':
      // Headlights one way, tail lights the other.
      return g.way > 0 ? scale(SUN, 0.85 * lit) : scale(AMBER, 0.75 * lit);
    case 'core':
      return scale(mix(SUGAR, SUN, 0.55), (0.6 + 0.3 * twinkle) * lit);
    case 'glow':
      return scale(mix(GOLD, SUGAR, d), (0.14 + 0.4 * d) * twinkle * lit);
    default: {
      const tone = g.rank === 0 ? SODIUM : mix(AMBER, SUN, 0.25 + 0.6 * d ** 1.5);
      const k = at([0.7, 0.95, 0.8, 0.62], g.rank);
      return scale(tone, (0.3 + 0.6 * d) * k * twinkle * lit);
    }
  }
}

/**
 * Grain p in the city the pills have picked, `u` through the piece (its lights come on from the
 * centre out), at time t: its place and colour, the grain worked out once for both.
 */
export function aboveAt(p: Particle, u: number, t: number): { pos: Vec3; rgb: RGB } {
  const g = cityGrain(p, t);
  return { pos: cityPos(p, g), rgb: cityColour(p, u, t, g) };
}

/** Flying over: drifting slowly across the city, looking a little ahead and down. */
export function aboveEye(t: number): { eye: Vec3; target: Vec3 } {
  const c = cityPlan().centre;
  const x = c[0] * CITY_K + 12 * Math.sin(t * 0.023);
  const y = c[1] * CITY_K + 8 * Math.sin(t * 0.017 + 1);
  return { eye: [x, y - 12, 62], target: [x, y + 2, 0] };
}
