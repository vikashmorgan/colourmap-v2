/**
 * The lake and the city on its far shore (lib/art/lake-city.ts), drawn: dark water and a skyline of
 * lit towers, every tower and its lights mirrored under the water, dimmer, so the lake carries the
 * city upside down. One group per Undertown run, in the road's frame at the city's anchor; placed
 * relative to the camera each frame like the track's chunks.
 */

import * as THREE from 'three';
import { LAKE_CITY, type LakeTower, lakeTowers } from '@/lib/art/lake-city';

type V3 = [number, number, number];

/** The city's lights (linear, bright): warm gold, lantern red, jade, violet. */
const TONES: V3[] = [
  [1.5, 1.0, 0.45],
  [1.6, 0.3, 0.12],
  [0.4, 1.3, 0.8],
  [0.9, 0.5, 1.6],
];
const BODY: V3 = [0.012, 0.01, 0.018];
/** The mirror's share of the light. */
const MIRROR = 0.38;

class Mesh {
  pos: number[] = [];
  col: number[] = [];
  quad(a: V3, b: V3, c: V3, d: V3, col: V3) {
    for (const p of [a, b, c, a, c, d]) {
      this.pos.push(p[0], p[1], p[2]);
      this.col.push(col[0], col[1], col[2]);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  }
}

function hash(n: number): number {
  const s = Math.sin(n * 91.7 + 13.1) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * One tower and its reflection into `body` (dark faces) and `lit` (window bands, crown). `P` maps
 * (a, b, height) in the anchor's frame to scene coordinates.
 */
function tower(
  t: LakeTower,
  i: number,
  P: (a: number, b: number, h: number) => V3,
  body: Mesh,
  lit: Mesh,
) {
  const L = LAKE_CITY.LEVEL;
  const corners: [number, number][] = [
    [t.a - t.w, t.b - t.d],
    [t.a + t.w, t.b - t.d],
    [t.a + t.w, t.b + t.d],
    [t.a - t.w, t.b + t.d],
  ];
  const tone = TONES[t.tone];
  for (const m of [1, -1]) {
    // Up from the water, or its mirror down into it.
    const H = (h: number) => L + m * h;
    const k = m > 0 ? 1 : MIRROR;
    const dim = (c: V3, f = 1): V3 => [c[0] * k * f, c[1] * k * f, c[2] * k * f];
    for (let j = 0; j < 4; j++) {
      const [a0, b0] = corners[j];
      const [a1, b1] = corners[(j + 1) % 4];
      body.quad(P(a0, b0, H(0)), P(a1, b1, H(0)), P(a1, b1, H(t.h)), P(a0, b0, H(t.h)), BODY);
      // Floors every 4.2 m: lit bands, broken into lit and dark windows, a hair off the face.
      const out = 0.15;
      const na = (b1 - b0) / (Math.hypot(a1 - a0, b1 - b0) || 1);
      const nb = -(a1 - a0) / (Math.hypot(a1 - a0, b1 - b0) || 1);
      const floors = Math.floor(t.h / 4.2);
      for (let f = 1; f < floors; f++) {
        const seg = 4;
        for (let q = 0; q < seg; q++) {
          if (hash(i * 977 + j * 131 + f * 17 + q) < 0.42) continue;
          const u0 = q / seg + 0.04;
          const u1 = (q + 1) / seg - 0.04;
          const A = (u: number): [number, number] => [
            a0 + (a1 - a0) * u - na * out,
            b0 + (b1 - b0) * u - nb * out,
          ];
          const [pa, pb] = A(u0);
          const [qa, qb] = A(u1);
          const z0 = f * 4.2;
          const z1 = z0 + 1.4;
          const warm = hash(i * 31 + f) < 0.25 ? TONES[0] : tone;
          lit.quad(
            P(pa, pb, H(z0)),
            P(qa, qb, H(z0)),
            P(qa, qb, H(z1)),
            P(pa, pb, H(z1)),
            dim(warm, 0.55),
          );
        }
      }
    }
    // The roof, and a crown of light on the tallest.
    body.quad(
      P(corners[0][0], corners[0][1], H(t.h)),
      P(corners[1][0], corners[1][1], H(t.h)),
      P(corners[2][0], corners[2][1], H(t.h)),
      P(corners[3][0], corners[3][1], H(t.h)),
      BODY,
    );
    if (t.crown) {
      for (let j = 0; j < 4; j++) {
        const [a0, b0] = corners[j];
        const [a1, b1] = corners[(j + 1) % 4];
        lit.quad(
          P(a0, b0, H(t.h)),
          P(a1, b1, H(t.h)),
          P(a1, b1, H(t.h + 2.2)),
          P(a0, b0, H(t.h + 2.2)),
          dim(tone, 1.4),
        );
      }
      // A spire.
      const sw = 0.6;
      lit.quad(
        P(t.a - sw, t.b, H(t.h)),
        P(t.a + sw, t.b, H(t.h)),
        P(t.a, t.b, H(t.h + t.h * 0.12)),
        P(t.a, t.b, H(t.h + t.h * 0.12)),
        dim(tone, 1.2),
      );
    }
  }
}

/** Run k's lake and city, in the road's frame at (x, y) heading h (positions relative to (x, y)). */
export function buildLakeCity(
  k: number,
  h: number,
  water: THREE.Material,
  body: THREE.Material,
  lit: THREE.Material,
): THREE.Group {
  const ca = Math.cos(h);
  const sa = Math.sin(h);
  // Along the heading, and out to the right of it; scene axes (x, height, -y).
  const P = (a: number, b: number, z: number): V3 => {
    const x = ca * a + sa * b;
    const y = sa * a - ca * b;
    return [x, z, -y];
  };
  const g = new THREE.Group();
  const b = new Mesh();
  const l = new Mesh();
  lakeTowers(k).forEach((t, i) => {
    tower(t, i, P, b, l);
  });
  // The water: a broad sheet from the near shore to past the far one.
  const w = new Mesh();
  const { NEAR, FAR, SHORE, LENGTH, LEVEL } = LAKE_CITY;
  const deep: V3 = [0.004, 0.006, 0.016];
  const A = LENGTH / 2;
  w.quad(
    P(-A, NEAR, LEVEL),
    P(A, NEAR, LEVEL),
    P(A, FAR + SHORE, LEVEL),
    P(-A, FAR + SHORE, LEVEL),
    deep,
  );
  const wm = new THREE.Mesh(w.geometry(), water);
  wm.renderOrder = 2;
  g.add(new THREE.Mesh(b.geometry(), body), new THREE.Mesh(l.geometry(), lit), wm);
  return g;
}
