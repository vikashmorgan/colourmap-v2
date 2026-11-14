/*
 * A far layer for the trip player (docs/specs/art-city.md, "The far city"): a still cloud of
 * points, built once, describing one tile of a world that repeats, drawn by the GPU in copies
 * round the eye beyond the live grains' reach. The live grains cost JavaScript every frame; these
 * cost none but a uniform or two (2026-11-14: "what stops u from increasing field depth of vision
 * 5 times on computer?", then "lets try it. try a light version that doesn't take u too much
 * energy but still looks nice"). Pure: no three.js, no DOM. The shader in components/TripPlayer.tsx
 * draws `farFade` the same way.
 */

import type { Vec3 } from './bigbang';

/**
 * One tile's cloud: three numbers a point for its place (tile-local, x across the tile's middle,
 * z from 0 along it) and three for its colour; `tile` its size across (x) and along (z); `cuts`
 * the first point of each strip along z (strips laid one after another, each its own z range in
 * `spans`), so each strip is drawn, and left out when out of sight, on its own.
 */
export type FarCloud = {
  positions: Float32Array;
  colours: Float32Array;
  tile: [number, number];
  cuts: number[];
  spans: [number, number][];
};

/** What a trip hands the player for its far layer; the player asks only on a computer. */
export type FarLayer = {
  /** The cloud, built the first time it is asked for, the same object after. */
  build: () => FarCloud;
  /** Where the live grains' view ends now: the far layer comes in from 0.8 of it to it. */
  near: (eye: Vec3) => number;
  /** Where the far layer is gone. */
  far: (eye: Vec3) => number;
  /** How much of it shows now, 0 (hidden) to 1. */
  shown: (eye: Vec3) => number;
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * How bright a far point is at distance d from the eye: nothing inside 0.8 of the near view,
 * coming in smoothly to the near edge (so there is no seam with the live grains), dimming slowly
 * with distance to under half, and gone by `far`, from 0.7 of it.
 */
export function farFade(d: number, near: number, far: number): number {
  const into = smoothstep(near * 0.8, near, d);
  const out = 1 - smoothstep(far * 0.7, far, d);
  const dim = 1 - 0.55 * Math.min(1, Math.max(0, (d - near) / Math.max(1, far - near)));
  return into * out * dim;
}

/** One copy of one strip: which strip, and where its tile is moved to. */
export type FarCopy = { chunk: number; ox: number; oz: number };

/**
 * The copies of the tile's strips to draw round the eye: every one that comes within `far` of it
 * (across the ground) and is not wholly inside 0.8 of the near view, where the far layer shows
 * nothing. Written into `out` (its objects reused); returns how many.
 */
export function tileCopies(
  eye: Vec3,
  near: number,
  far: number,
  tile: [number, number],
  spans: [number, number][],
  out: FarCopy[],
): number {
  const [TX, TZ] = tile;
  const inner = near * 0.8;
  let n = 0;
  const n0 = Math.ceil((eye[0] - far - TX / 2) / TX);
  const n1 = Math.floor((eye[0] + far + TX / 2) / TX);
  spans.forEach(([z0, z1], chunk) => {
    const m0 = Math.ceil((eye[2] - far - z1) / TZ);
    const m1 = Math.floor((eye[2] + far - z0) / TZ);
    for (let m = m0; m <= m1; m++) {
      const a = z0 + m * TZ;
      const b = z1 + m * TZ;
      const dz = Math.max(a - eye[2], 0, eye[2] - b);
      const fz = Math.max(Math.abs(a - eye[2]), Math.abs(b - eye[2]));
      for (let i = n0; i <= n1; i++) {
        const l = -TX / 2 + i * TX;
        const r = l + TX;
        const dx = Math.max(l - eye[0], 0, eye[0] - r);
        if (Math.hypot(dx, dz) > far) continue;
        const fx = Math.max(Math.abs(l - eye[0]), Math.abs(r - eye[0]));
        if (Math.hypot(fx, fz) < inner) continue;
        const c = out[n] ?? { chunk: 0, ox: 0, oz: 0 };
        c.chunk = chunk;
        c.ox = i * TX;
        c.oz = m * TZ;
        out[n++] = c;
      }
    }
  });
  return n;
}
