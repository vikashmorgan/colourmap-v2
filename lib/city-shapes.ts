/*
 * A few grain primitives for the City game's tall buildings (docs/specs/art-city.md, "Taller
 * landmarks and fireworks"): lines, rings, spheres, turned surfaces and twisting boxes, each a
 * formula from a site's number to a point, built once and cached. The taller landmarks
 * (lib/city-landmarks.ts), the big squares (lib/city-big.ts) and the fifteen new buildings
 * (lib/city-buildings-15.ts) are all made of these. Pure: no three.js, no DOM.
 */

import { fibonacciSphere, type RGB, type Vec3 } from './bigbang';
import { frac, lerp, TAU } from './city-grid';

/** A run of n sites: f(u, s, t) puts site s (u its place along the run, 0..1) at a point. */
export type Part = {
  n: number;
  f: (u: number, s: number, t: number) => Vec3;
  rgb: RGB;
  tw?: number;
};
export type Model = { parts: Part[]; cum: number[]; count: number; top: number; r: number };

/** A model from its parts, its height (`top`) and reach from its axis (`r`) noted for the map and tests. */
export function model(parts: Part[], top: number, r: number): Model {
  const cum: number[] = [];
  let n = 0;
  for (const p of parts) {
    n += p.n;
    cum.push(n);
  }
  return { parts, cum, count: n, top, r };
}

export const seg = (a: Vec3, b: Vec3, n: number, rgb: RGB, tw = 0): Part => ({
  n: Math.max(1, Math.round(n)),
  f: (u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)],
  rgb,
  tw,
});

/** A horizontal circle, or one standing across x ('x') or z ('z'). */
export const ring = (
  c: Vec3,
  r: number,
  n: number,
  rgb: RGB,
  plane: 'y' | 'x' | 'z' = 'y',
  tw = 0,
): Part => ({
  n: Math.max(3, Math.round(n)),
  f: (u) => {
    const a = u * TAU;
    const p = Math.cos(a) * r;
    const q = Math.sin(a) * r;
    if (plane === 'y') return [c[0] + p, c[1], c[2] + q];
    if (plane === 'z') return [c[0] + p, c[1] + q, c[2]];
    return [c[0], c[1] + q, c[2] + p];
  },
  rgb,
  tw,
});

/** A whole sphere (or, `half`, its upper half), squashed by sq. */
export const ball = (
  c: Vec3,
  r: number,
  n: number,
  rgb: RGB,
  sq = 1,
  tw = 0,
  half = false,
): Part => {
  const m = Math.max(4, Math.round(n));
  return {
    n: m,
    f: (u) => {
      const d = fibonacciSphere(Math.floor(u * m), half ? 2 * m : m);
      return [c[0] + d[0] * r, c[1] + d[1] * r * sq, c[2] + d[2] * r];
    },
    rgb,
    tw,
  };
};

/** A surface turned round the vertical: `ribs` lines up it and `rings` round it, radius r(v) at height y(v). */
export const turned = (
  prof: (v: number) => [number, number],
  ribs: number,
  rings: number,
  n: number,
  rgb: RGB,
  ringRgb: RGB,
  tw = 0,
): Part[] => [
  {
    n: Math.max(4, Math.round(n * 0.55)),
    f: (u) => {
      const rib = Math.floor(u * ribs);
      const [r, y] = prof(frac(u * ribs));
      const a = (rib / ribs) * TAU;
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    },
    rgb,
    tw,
  },
  {
    n: Math.max(4, Math.round(n * 0.45)),
    f: (u) => {
      const k = Math.floor(u * rings);
      const a = frac(u * rings) * TAU;
      const [r, y] = prof((k + 0.5) / rings);
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    },
    rgb: ringRgb,
    tw,
  },
];

/** A square of half-width w at height y, turned by angle a round the vertical. */
export const square = (w: number, y: number, a: number, n: number, rgb: RGB, tw = 0): Part => ({
  n: Math.max(4, Math.round(n)),
  f: (u) => {
    const side = Math.floor(u * 4);
    const v = frac(u * 4) * 2 - 1;
    const [px, pz] = [
      [v, -1],
      [1, v],
      [-v, 1],
      [-1, -v],
    ][side] as [number, number];
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [(px * c - pz * s) * w, y, (px * s + pz * c) * w];
  },
  rgb,
  tw,
});

/**
 * A box rising from y0 to y1, its half-width w(v) and its turn a(v) along the way (v 0..1): its
 * four corner edges (helices when it turns) and `floors` squares round it.
 */
export function twistBox(
  y0: number,
  y1: number,
  w: (v: number) => number,
  a: (v: number) => number,
  floors: number,
  n: number,
  rgb: RGB,
  floorRgb: RGB,
): Part[] {
  const parts: Part[] = [];
  for (let c = 0; c < 4; c++) {
    parts.push({
      n: Math.round(n * 0.12),
      f: (u) => {
        const ang = a(u) + Math.PI / 4 + (c * Math.PI) / 2;
        const r = w(u) * Math.SQRT2;
        return [Math.cos(ang) * r, lerp(y0, y1, u), Math.sin(ang) * r];
      },
      rgb,
    });
  }
  parts.push({
    n: Math.round(n * 0.52),
    f: (u, s, t) => {
      const k = Math.floor(u * floors);
      const v = (k + 0.5) / floors;
      return square(w(v), lerp(y0, y1, v), a(v), 4, floorRgb).f(frac(u * floors), s, t);
    },
    rgb: floorRgb,
  });
  return parts;
}

export function shiftPart(p: Part, d: Vec3): Part {
  return {
    ...p,
    f: (u, s, t) => {
      const q = p.f(u, s, t);
      return [q[0] + d[0], q[1] + d[1], q[2] + d[2]];
    },
  };
}
export const shift = (parts: Part[], d: Vec3) => parts.map((p) => shiftPart(p, d));

const models = new Map<string, Model>();
/** A model built once, under its name. */
export function cached(key: string, make: () => Model): Model {
  const had = models.get(key);
  if (had) return had;
  const m = make();
  models.set(key, m);
  return m;
}

/**
 * Site s of model M standing at (x, y, z): its place and colour into o, brightness k. The colour
 * drifts slowly (the mellow rule: nothing flashes); a part's `tw` twinkles it gently.
 */
export function shapeSite(
  M: Model,
  s: number,
  t: number,
  x: number,
  y: number,
  z: number,
  k: number,
  o: number[],
): boolean {
  let i = 0;
  while ((M.cum[i] as number) <= s) i++;
  const part = M.parts[i] as Part;
  const start = (M.cum[i] as number) - part.n;
  const p = part.f((s - start + 0.5) / part.n, s, t);
  o[0] = x + p[0];
  o[1] = y + p[1];
  o[2] = z + p[2];
  const tw = part.tw ? 1 - part.tw * (0.5 + 0.5 * Math.sin(t * 0.8 + s * 1.7)) : 1;
  const drift = 0.88 + 0.12 * Math.sin(t * 0.21 + s * 0.013);
  const b = 0.42 * k * tw * drift;
  o[3] = part.rgb[0] * b;
  o[4] = part.rgb[1] * b;
  o[5] = part.rgb[2] * b;
  return Number.isFinite(o[0]) && Number.isFinite(o[1]) && Number.isFinite(o[2]);
}
