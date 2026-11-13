/*
 * Rope lights over the streets of the City of Dreams (docs/specs/art-city.md, "Game design"):
 * corridors of ropes hung from wall to wall across a street, each sagging in a U (a catenary), tiny
 * lights all along it, rope after rope down the street like a Diwali lane. Thick in the Indian
 * quarter and Chinatown, here and there everywhere else. A slow shimmer runs along them; they
 * never flash.
 *
 * 2026-11-13: "diwali corridor rope lights: ropes hanging between buildings in a U with tiny
 * lights along them, strung across streets."
 *
 * Pure: no three.js, no DOM. The towers come from lib/city-game.ts, handed in (so no cycle).
 */

import { hash, type RGB, type Vec3 } from './bigbang';
import {
  BLOCK_X,
  BLOCK_Z,
  boxDist,
  C,
  GROUND,
  type Item,
  lerp,
  mix,
  mixId,
  scale,
  TILE_I,
  wrap,
} from './city-grid';

/** What a rope needs of a tower: its walls, its height, whether it is a plain building, its quarter. */
export type Wall = {
  x: number;
  z: number;
  hx: number;
  hz: number;
  h: number;
  shape: string;
  d: string;
};

/** How often a street of each quarter is hung with a corridor of ropes. */
export const ROPE_SHARE: Record<string, number> = {
  indian: 0.85,
  chinatown: 0.6,
  oriental: 0.45,
  market: 0.4,
  canals: 0.25,
  golden: 0.2,
  temples: 0.2,
};
const ROPE_DEFAULT = 0.12;
/** Ropes down a corridor every ROPE_EVERY; a light every LIGHT_GAP along a rope. */
export const ROPE_EVERY = 4.2;
const LIGHT_GAP = 0.5;
/** How deep a rope sags, for its span: a real U. */
export const SAG = 0.2;

/** The lights' colours, quarter by quarter: marigold and warm for Diwali, red and gold for Chinatown. */
function tones(d: string): [RGB, RGB] {
  switch (d) {
    case 'indian':
      return [C.marigold, C.warm];
    case 'chinatown':
      return [C.red, C.gold];
    case 'oriental':
      return [C.turquoise, C.warm];
    case 'market':
      return [C.magenta, C.warm];
    case 'canals':
      return [C.violet, C.warm];
    default:
      return [C.warm, C.ivory];
  }
}

/** A rope's height at u (0..1) from one wall to the other: a catenary, `sag` deep at its middle. */
export function ropeY(top: number, sag: number, u: number): number {
  const k = 1.6;
  const c = Math.cosh(k);
  return top - (sag * (c - Math.cosh(k * (2 * u - 1)))) / (c - 1);
}

type Corridor = {
  /** Each rope's two ends (same height), and how deep it sags. */
  ropes: { a: Vec3; b: Vec3 }[];
  d: string;
  key: number;
  lo: Vec3;
  hi: Vec3;
};

/** A corridor across the street between walls A and B (along x, axis 0, or z, axis 2), or none. */
function corridor(A: Wall, B: Wall, axis: 0 | 2, key: number): Corridor | null {
  if (A.shape !== 'box' || B.shape !== 'box') return null;
  if (hash(key, 81) >= (ROPE_SHARE[A.d] ?? ROPE_DEFAULT)) return null;
  const tops = Math.min(A.h, B.h);
  if (tops < 11) return null;
  // From wall to wall across the street, down the stretch both walls face.
  const w0 = axis === 0 ? A.x + A.hx : A.z + A.hz;
  const w1 = axis === 0 ? B.x - B.hx : B.z - B.hz;
  if (w1 - w0 < 4) return null;
  const s0 = axis === 0 ? Math.max(A.z - A.hz, B.z - B.hz) : Math.max(A.x - A.hx, B.x - B.hx);
  const s1 = axis === 0 ? Math.min(A.z + A.hz, B.z + B.hz) : Math.min(A.x + A.hx, B.x + B.hx);
  const n = Math.floor((s1 - s0 - 1) / ROPE_EVERY);
  if (n < 1) return null;
  const top = GROUND + Math.min(tops - 2, 10 + 5 * hash(key, 82));
  const ropes: { a: Vec3; b: Vec3 }[] = [];
  const pad = (s1 - s0 - (n - 1) * ROPE_EVERY) / 2;
  for (let j = 0; j < n; j++) {
    const s = s0 + pad + j * ROPE_EVERY;
    const y = top + 0.6 * Math.sin(j * 1.3 + key);
    ropes.push(axis === 0 ? { a: [w0, y, s], b: [w1, y, s] } : { a: [s, y, w0], b: [s, y, w1] });
  }
  const sag = SAG * (w1 - w0);
  const lo: Vec3 = axis === 0 ? [w0, top - sag - 1.5, s0] : [s0, top - sag - 1.5, w0];
  const hi: Vec3 = axis === 0 ? [w1, top + 1, s1] : [s1, top + 1, w1];
  return { ropes, d: A.d, key, lo, hi };
}

/**
 * The rope corridors near the eye, as the Ship's renderer's items: across the streets between
 * every pair of plain buildings (not the avenue, which has its own strings), `ahead` saying what is
 * in front of the eye.
 */
export function ropeItems(
  eye: Vec3,
  t: number,
  R: number,
  towerAt: (I: number, J: number) => Wall,
  ahead: (x: number, z: number, rad: number) => boolean,
  out: Item[],
) {
  const I0 = Math.floor((eye[0] - R) / BLOCK_X);
  const I1 = Math.floor((eye[0] + R) / BLOCK_X);
  const J0 = Math.floor((eye[2] - R) / BLOCK_Z);
  const J1 = Math.floor((eye[2] + R) / BLOCK_Z);
  for (let I = I0; I <= I1; I++) {
    const onAvenue = wrap(I + TILE_I / 2, TILE_I) - TILE_I / 2 === -1;
    for (let J = J0; J <= J1; J++) {
      const A = towerAt(I, J);
      for (const axis of [0, 2] as const) {
        if (axis === 0 && onAvenue) continue;
        const B = axis === 0 ? towerAt(I + 1, J) : towerAt(I, J + 1);
        const c = corridor(A, B, axis, mixId(I * 3 + axis, J));
        if (!c) continue;
        const d = boxDist(eye, c.lo, c.hi);
        if (d > R) continue;
        if (d > 12 && !ahead((c.lo[0] + c.hi[0]) / 2, (c.lo[2] + c.hi[2]) / 2, 20)) continue;
        out.push(corridorItem(c, eye, t, d));
      }
    }
  }
}

function corridorItem(c: Corridor, _eye: Vec3, t: number, d: number): Item {
  const r0 = c.ropes[0] as { a: Vec3; b: Vec3 };
  const span = Math.hypot(r0.b[0] - r0.a[0], r0.b[2] - r0.a[2]);
  const per = Math.max(8, Math.ceil(span / (LIGHT_GAP / 2)));
  const sag = SAG * span;
  const [t0, t1] = tones(c.d);
  const mid = (r: { a: Vec3; b: Vec3 }): Vec3 => [
    (r.a[0] + r.b[0]) / 2,
    r.a[1] - sag,
    (r.a[2] + r.b[2]) / 2,
  ];
  const last = c.ropes[c.ropes.length - 1] as { a: Vec3; b: Vec3 };
  return {
    d,
    gid: c.key,
    count: c.ropes.length * per,
    weight: 1.9,
    probe: [mid(r0), mid(last), r0.a, last.b],
    site: (s, o) => {
      const j = Math.floor(s / per);
      const q = s % per;
      const r = c.ropes[j] as { a: Vec3; b: Vec3 };
      const u = (q + 0.5) / per;
      o[0] = lerp(r.a[0], r.b[0], u);
      o[1] = ropeY(r.a[1], sag, u);
      o[2] = lerp(r.a[2], r.b[2], u);
      // Every other site is the rope itself, faint; between them the tiny lights.
      if (q & 1) {
        [o[3], o[4], o[5]] = scale(mix(t0, C.violet, 0.5), 0.05);
        return true;
      }
      const n = q >> 1;
      const tone = (n + j) % 3 ? t0 : t1;
      // A slow shimmer running along the rope and down the corridor, each light its own breath.
      const wave = 0.5 + 0.5 * Math.sin(t * 0.4 - u * 5 - j * 0.7 + c.key * 0.001);
      const own = 0.85 + 0.15 * Math.sin(t * (0.25 + 0.35 * hash(n, j + 3)) + n);
      [o[3], o[4], o[5]] = scale(tone, (0.3 + 0.22 * wave) * own);
      return true;
    },
  };
}
