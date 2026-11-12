/*
 * GRAIN MESH — buildings drawn in grains of light, for the golden city
 * (docs/specs/art-city.md).
 *
 * A building is a short list of lines (its edges, bright), triangles (its
 * faces, dim, lit by how much they face the eye, so it reads solid) and dots
 * (lamps, plants, fire, steam). Each grain picks one by its golden-sequence
 * number, so every element gets its fair share: lines by length, faces by
 * area, dots by weight. A few simple motions (steam rising, lights flowing
 * along a line, a lattice turning and breathing, a slow orbit) are kept on
 * the element, worked out as the grain is placed.
 *
 * Pure: no three.js, no DOM.
 */

import { hash, type Particle, type Vec3 } from './bigbang';

/** The golden ratio, φ: every size in the golden city is a power of it. */
export const PHI = (1 + Math.sqrt(5)) / 2;
/** The ground the golden city stands on: the City chapter's ground. */
export const GROUND_Y = -16;

const TAU = Math.PI * 2;
const frac = (x: number) => x - Math.floor(x);
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addv = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len3 = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

/** The colours a grain can take; the piece's palette turns each into light. */
export const Tone = {
  edge: 0,
  face: 1,
  glass: 2,
  water: 3,
  plant: 4,
  fire: 5,
  light: 6,
  ground: 7,
  road: 8,
  steam: 9,
  film: 10,
} as const;

/** How an element moves. */
export const Anim = {
  still: 0,
  /** Dots rising `key` high and fading as they go: steam, motes of light. */
  rise: 1,
  /** Grains running along their line at `key` a second: conveyors, travellers. */
  flow: 2,
  /** Turning slowly round the vertical through the pivot and breathing in and out. */
  breathe: 3,
  /** Glowing up and down slowly: a furnace, `key` its own beat. */
  pulse: 4,
  /** Turning round the vertical through the pivot at `key` a second: ships, a crane's jib. */
  orbit: 5,
} as const;

export type Opts = { anim?: number; key?: number; w?: number; two?: boolean };

/** One mesh being built: add lines, faces and dots, then `build()` it once. */
export class Mesh {
  lines: number[] = [];
  lineMeta: number[] = [];
  tris: number[] = [];
  triMeta: number[] = [];
  dots: number[] = [];
  dotMeta: number[] = [];
  /** The point faces turn away from: their normals point out from here. */
  centre: Vec3 = [0, 0, 0];
  /** What `breathe` and `orbit` turn round. */
  pivot: Vec3 = [0, 0, 0];

  line(a: Vec3, b: Vec3, tone: number, o: Opts = {}) {
    if (len3(sub(a, b)) < 1e-6) return;
    this.lines.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    this.lineMeta.push(tone, o.anim ?? 0, o.key ?? 0, o.w ?? 1);
  }
  poly(pts: Vec3[], closed: boolean, tone: number, o: Opts = {}) {
    for (let i = 0; i + 1 < pts.length; i++) this.line(pts[i] as Vec3, pts[i + 1] as Vec3, tone, o);
    if (closed && pts.length > 2) this.line(pts[pts.length - 1] as Vec3, pts[0] as Vec3, tone, o);
  }
  tri(a: Vec3, b: Vec3, c: Vec3, tone: number, o: Opts = {}) {
    let n = cross(sub(b, a), sub(c, a));
    const l = len3(n);
    if (l < 1e-9) return;
    n = [n[0] / l, n[1] / l, n[2] / l];
    const m: Vec3 = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    if (dot3(n, sub(m, this.centre)) < 0) n = [-n[0], -n[1], -n[2]];
    this.tris.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    this.triMeta.push(tone, o.anim ?? 0, o.key ?? 0, o.w ?? 1, n[0], n[1], n[2], o.two ? 1 : 0);
  }
  /** A flat four-sided face from corner `o` along `u` and `v`. */
  quad(o: Vec3, u: Vec3, v: Vec3, tone: number, opts: Opts = {}) {
    const b = addv(o, u);
    const c = addv(b, v);
    const d = addv(o, v);
    this.tri(o, b, c, tone, opts);
    this.tri(o, c, d, tone, opts);
  }
  dot(at: Vec3, r: number, tone: number, o: Opts = {}) {
    this.dots.push(at[0], at[1], at[2], r);
    this.dotMeta.push(tone, o.anim ?? 0, o.key ?? 0, o.w ?? 1);
  }

  /* ---------- a few shapes made of the three ---------- */

  /** A level circle round c, `n` points. */
  static circle(c: Vec3, r: number, n = Math.max(12, Math.ceil(TAU * r))): Vec3[] {
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * TAU;
      return [c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r] as Vec3;
    });
  }
  ring(c: Vec3, r: number, tone: number, o: Opts = {}, n?: number) {
    this.poly(Mesh.circle(c, r, n), true, tone, o);
  }
  /** A round wall from y0 to y1, with rings at its top and foot and `posts` upright edges. */
  cylinder(
    c: Vec3,
    r: number,
    y0: number,
    y1: number,
    face: number,
    edge: number,
    posts = 0,
    n = Math.max(12, Math.ceil(TAU * r * 0.7)),
  ) {
    const lo = Mesh.circle([c[0], y0, c[2]], r, n);
    for (let i = 0; i < n; i++) {
      const a = lo[i] as Vec3;
      const b = lo[(i + 1) % n] as Vec3;
      this.quad(a, sub(b, a), [0, y1 - y0, 0], face);
    }
    this.ring([c[0], y0, c[2]], r, edge, {}, n);
    this.ring([c[0], y1, c[2]], r, edge, {}, n);
    for (let k = 0; k < posts; k++) {
      const a = (k / posts) * TAU;
      const x = c[0] + Math.cos(a) * r;
      const z = c[2] + Math.sin(a) * r;
      this.line([x, y0, z], [x, y1, z], edge);
    }
  }
  /** A flat disc (or ring, from r0) at height y. */
  disc(c: Vec3, r1: number, tone: number, r0 = 0, o: Opts = {}) {
    const n = Math.max(12, Math.ceil(TAU * r1 * 0.5));
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU;
      const a1 = ((i + 1) / n) * TAU;
      const p = (r: number, a: number): Vec3 => [
        c[0] + Math.cos(a) * r,
        c[1],
        c[2] + Math.sin(a) * r,
      ];
      if (r0 <= 0) this.tri([c[0], c[1], c[2]], p(r1, a0), p(r1, a1), tone, o);
      else {
        this.tri(p(r0, a0), p(r1, a0), p(r1, a1), tone, o);
        this.tri(p(r0, a0), p(r1, a1), p(r0, a1), tone, o);
      }
    }
  }
  /**
   * A box standing on (x, y, z), half-widths hx, hz, `h` tall, turned `rot` round the vertical:
   * its four walls and roof as faces, its twelve edges as lines.
   */
  box(
    at: Vec3,
    hx: number,
    h: number,
    hz: number,
    face: number,
    edge: number,
    rot = 0,
    top = true,
  ) {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const P = (x: number, y: number, z: number): Vec3 => [
      at[0] + x * c - z * s,
      at[1] + y,
      at[2] + x * s + z * c,
    ];
    const keep = this.centre;
    this.centre = P(0, h / 2, 0);
    const corners = [P(-hx, 0, -hz), P(hx, 0, -hz), P(hx, 0, hz), P(-hx, 0, hz)];
    const up: Vec3 = [0, h, 0];
    for (let i = 0; i < 4; i++) {
      const a = corners[i] as Vec3;
      const b = corners[(i + 1) % 4] as Vec3;
      this.quad(a, sub(b, a), up, face);
      this.line(a, b, edge);
      this.line(addv(a, up), addv(b, up), edge);
      this.line(a, addv(a, up), edge);
    }
    const t0 = addv(corners[0] as Vec3, up);
    if (top)
      this.quad(
        t0,
        sub(corners[1] as Vec3, corners[0] as Vec3),
        sub(corners[3] as Vec3, corners[0] as Vec3),
        face,
      );
    this.centre = keep;
  }
  /**
   * A surface f(u, v), u and v from 0 to 1, cut nu by nv: faces, and lines along its u and v
   * grid lines when given a tone for them (every `every`th line).
   */
  surface(
    f: (u: number, v: number) => Vec3,
    nu: number,
    nv: number,
    face: number,
    o: Opts = {},
    grid?: { tone: number; uEvery?: number; vEvery?: number; opts?: Opts },
  ) {
    const P = (i: number, j: number) => f(i / nu, j / nv);
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const a = P(i, j);
        const b = P(i + 1, j);
        const c = P(i + 1, j + 1);
        const d = P(i, j + 1);
        this.tri(a, b, c, face, o);
        this.tri(a, c, d, face, o);
      }
    if (!grid) return;
    const ue = grid.uEvery ?? 0;
    const ve = grid.vEvery ?? 0;
    if (ue > 0)
      for (let i = 0; i <= nu; i += ue)
        this.poly(
          Array.from({ length: nv + 1 }, (_, j) => P(i, j)),
          false,
          grid.tone,
          grid.opts,
        );
    if (ve > 0)
      for (let j = 0; j <= nv; j += ve)
        this.poly(
          Array.from({ length: nu + 1 }, (_, i) => P(i, j)),
          false,
          grid.tone,
          grid.opts,
        );
  }
  /**
   * A geodesic dome: an icosahedron's faces cut `freq` times each way and blown out to a sphere
   * of radius r round c, kept where the face's middle stands above `cut` (in units of r).
   */
  geodesic(
    c: Vec3,
    r: number,
    freq: number,
    face: number,
    edge: number,
    cut = -0.05,
    o: Opts = {},
  ) {
    const t = (1 + Math.sqrt(5)) / 2;
    const V: Vec3[] = [
      [-1, t, 0],
      [1, t, 0],
      [-1, -t, 0],
      [1, -t, 0],
      [0, -1, t],
      [0, 1, t],
      [0, -1, -t],
      [0, 1, -t],
      [t, 0, -1],
      [t, 0, 1],
      [-t, 0, -1],
      [-t, 0, 1],
    ];
    const F = [
      [0, 11, 5],
      [0, 5, 1],
      [0, 1, 7],
      [0, 7, 10],
      [0, 10, 11],
      [1, 5, 9],
      [5, 11, 4],
      [11, 10, 2],
      [10, 7, 6],
      [7, 1, 8],
      [3, 9, 4],
      [3, 4, 2],
      [3, 2, 6],
      [3, 6, 8],
      [3, 8, 9],
      [4, 9, 5],
      [2, 4, 11],
      [6, 2, 10],
      [8, 6, 7],
      [9, 8, 1],
    ];
    const onSphere = (q: Vec3): Vec3 => {
      const l = len3(q);
      return [c[0] + (q[0] / l) * r, c[1] + (q[1] / l) * r, c[2] + (q[2] / l) * r];
    };
    const floor = (q: Vec3): Vec3 => [q[0], Math.max(q[1], c[1]), q[2]];
    const keep = this.centre;
    this.centre = c;
    const seen = new Set<string>();
    const edgeOnce = (a: Vec3, b: Vec3) => {
      const k1 = `${a.map((x) => x.toFixed(3))}|${b.map((x) => x.toFixed(3))}`;
      const k2 = `${b.map((x) => x.toFixed(3))}|${a.map((x) => x.toFixed(3))}`;
      if (seen.has(k1) || seen.has(k2)) return;
      seen.add(k1);
      this.line(a, b, edge, o);
    };
    for (const [ia, ib, ic] of F) {
      const A = V[ia as number] as Vec3;
      const B = V[ib as number] as Vec3;
      const C = V[ic as number] as Vec3;
      const at = (i: number, j: number): Vec3 => {
        const k = freq - i - j;
        return onSphere([
          (A[0] * k + B[0] * i + C[0] * j) / freq,
          (A[1] * k + B[1] * i + C[1] * j) / freq,
          (A[2] * k + B[2] * i + C[2] * j) / freq,
        ]);
      };
      for (let i = 0; i < freq; i++)
        for (let j = 0; j < freq - i; j++) {
          const tris: Vec3[][] = [[at(i, j), at(i + 1, j), at(i, j + 1)]];
          if (i + j < freq - 1) tris.push([at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
          for (const [a, b, d] of tris as [Vec3, Vec3, Vec3][]) {
            if ((a[1] + b[1] + d[1]) / 3 - c[1] < cut * r) continue;
            // The lowest row is set down on the ground, so the dome stands on its ring.
            const A = floor(a);
            const B = floor(b);
            const D = floor(d);
            this.tri(A, B, D, face, o);
            edgeOnce(A, B);
            edgeOnce(B, D);
            edgeOnce(D, A);
          }
        }
    }
    this.centre = keep;
  }

  build(): Built {
    const lines = new Float32Array(this.lines);
    const tris = new Float32Array(this.tris);
    const dots = new Float32Array(this.dots);
    const nl = this.lineMeta.length / 4;
    const nt = this.triMeta.length / 8;
    const nd = this.dotMeta.length / 4;
    const lineCum = new Float64Array(nl);
    const triCum = new Float64Array(nt);
    const dotCum = new Float64Array(nd);
    let s = 0;
    for (let i = 0; i < nl; i++) {
      const L = Math.hypot(
        (lines[i * 6 + 3] as number) - (lines[i * 6] as number),
        (lines[i * 6 + 4] as number) - (lines[i * 6 + 1] as number),
        (lines[i * 6 + 5] as number) - (lines[i * 6 + 2] as number),
      );
      s += L * (this.lineMeta[i * 4 + 3] as number);
      lineCum[i] = s;
    }
    for (let i = 0; i < nl; i++) lineCum[i] = (lineCum[i] as number) / (s || 1);
    s = 0;
    for (let i = 0; i < nt; i++) {
      const o = i * 9;
      const a: Vec3 = [tris[o] as number, tris[o + 1] as number, tris[o + 2] as number];
      const b: Vec3 = [tris[o + 3] as number, tris[o + 4] as number, tris[o + 5] as number];
      const c: Vec3 = [tris[o + 6] as number, tris[o + 7] as number, tris[o + 8] as number];
      s += 0.5 * len3(cross(sub(b, a), sub(c, a))) * (this.triMeta[i * 8 + 3] as number);
      triCum[i] = s;
    }
    for (let i = 0; i < nt; i++) triCum[i] = (triCum[i] as number) / (s || 1);
    s = 0;
    for (let i = 0; i < nd; i++) {
      s += this.dotMeta[i * 4 + 3] as number;
      dotCum[i] = s;
    }
    for (let i = 0; i < nd; i++) dotCum[i] = (dotCum[i] as number) / (s || 1);
    return {
      lines,
      lineMeta: new Float32Array(this.lineMeta),
      lineCum,
      tris,
      triMeta: new Float32Array(this.triMeta),
      triCum,
      dots,
      dotMeta: new Float32Array(this.dotMeta),
      dotCum,
      pivot: this.pivot,
    };
  }
}

export type Built = {
  lines: Float32Array;
  lineMeta: Float32Array;
  lineCum: Float64Array;
  tris: Float32Array;
  triMeta: Float32Array;
  triCum: Float64Array;
  dots: Float32Array;
  dotMeta: Float32Array;
  dotCum: Float64Array;
  pivot: Vec3;
};

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

/** A grain on a mesh: where it is, its tone, its element's key, and how much light it gives (0..1). */
export type Hit = { pos: Vec3; tone: number; key: number; lit: number; kind: 0 | 1 | 2 };

/** How the grains are shared out: lines up to `lines`, faces up to `faces`, the rest dots (of 0..1). */
export type Shares = { lines: number; faces: number };

/** Turn q round the vertical through the pivot by angle a. */
function turn(q: Vec3, pivot: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const x = q[0] - pivot[0];
  const z = q[2] - pivot[2];
  return [pivot[0] + x * c - z * s, q[1], pivot[2] + x * s + z * c];
}
const breathing = (q: Vec3, pivot: Vec3, t: number): Vec3 => {
  const k = 1 + 0.035 * Math.sin((TAU * t) / 9);
  const r = turn(q, pivot, t * 0.025);
  return [
    pivot[0] + (r[0] - pivot[0]) * k,
    pivot[1] + (r[1] - pivot[1]) * k,
    pivot[2] + (r[2] - pivot[2]) * k,
  ];
};

/**
 * Grain p on mesh B at time t, seen from `eye`; `q` (0..1) says which share it falls in, the
 * element picked by its golden-sequence number so each gets its fair part.
 */
export function onMesh(B: Built, p: Particle, q: number, t: number, eye: Vec3, sh: Shares): Hit {
  const pick = p.a;
  const s1 = p.b;
  const s2 = p.d;
  const kind = q < sh.lines && B.lineCum.length ? 0 : q < sh.faces && B.triCum.length ? 1 : 2;
  if (kind === 0 || (kind === 2 && !B.dotCum.length)) {
    const i = pickIn(B.lineCum, pick);
    const o = i * 6;
    const m = i * 4;
    const anim = B.lineMeta[m + 1] as number;
    const key = B.lineMeta[m + 2] as number;
    const a: Vec3 = [B.lines[o] as number, B.lines[o + 1] as number, B.lines[o + 2] as number];
    const b: Vec3 = [B.lines[o + 3] as number, B.lines[o + 4] as number, B.lines[o + 5] as number];
    let s = s1;
    let lit = 1;
    if (anim === Anim.flow) {
      const L = len3(sub(b, a)) || 1;
      s = frac(s1 + (t * key) / L);
      lit = Math.sin(Math.PI * s) ** 0.5;
    }
    let pos = addv(a, sub(b, a), s);
    if (anim === Anim.breathe) pos = breathing(pos, B.pivot, t);
    else if (anim === Anim.orbit) pos = turn(pos, B.pivot, t * key);
    return { pos, tone: B.lineMeta[m] as number, key, lit, kind: 0 };
  }
  if (kind === 1) {
    const i = pickIn(B.triCum, pick);
    const o = i * 9;
    const m = i * 8;
    const r1 = Math.sqrt(s1);
    const wa = 1 - r1;
    const wb = r1 * (1 - s2);
    const wc = r1 * s2;
    let pos: Vec3 = [
      (B.tris[o] as number) * wa + (B.tris[o + 3] as number) * wb + (B.tris[o + 6] as number) * wc,
      (B.tris[o + 1] as number) * wa +
        (B.tris[o + 4] as number) * wb +
        (B.tris[o + 7] as number) * wc,
      (B.tris[o + 2] as number) * wa +
        (B.tris[o + 5] as number) * wb +
        (B.tris[o + 8] as number) * wc,
    ];
    const anim = B.triMeta[m + 1] as number;
    const key = B.triMeta[m + 2] as number;
    let n: Vec3 = [
      B.triMeta[m + 4] as number,
      B.triMeta[m + 5] as number,
      B.triMeta[m + 6] as number,
    ];
    if (anim === Anim.breathe) {
      pos = breathing(pos, B.pivot, t);
      n = turn(n, [0, 0, 0], t * 0.025);
    } else if (anim === Anim.orbit) {
      pos = turn(pos, B.pivot, t * key);
      n = turn(n, [0, 0, 0], t * key);
    }
    // Lit by how squarely the face looks at the eye: faces turned away stay faint.
    const toEye = sub(eye, pos);
    const f = dot3(n, toEye) / (len3(toEye) || 1);
    const two = (B.triMeta[m + 7] as number) > 0;
    const facing = two ? 0.45 + 0.55 * Math.abs(f) : f > 0 ? 0.3 + 0.7 * f : 0.1 + 0.1 * (1 + f);
    let lit = facing;
    if (anim === Anim.pulse) lit *= 0.65 + 0.35 * Math.sin(t * 0.45 + key);
    return { pos, tone: B.triMeta[m] as number, key, lit, kind: 1 };
  }
  const i = pickIn(B.dotCum, pick);
  const o = i * 4;
  const m = i * 4;
  const anim = B.dotMeta[m + 1] as number;
  const key = B.dotMeta[m + 2] as number;
  const r = (B.dots[o + 3] as number) * Math.cbrt(s1);
  const a = s2 * TAU;
  const z = 2 * hash(p.i, 311) - 1;
  const ring = Math.sqrt(1 - z * z);
  let pos: Vec3 = [
    (B.dots[o] as number) + Math.cos(a) * ring * r,
    (B.dots[o + 1] as number) + z * r,
    (B.dots[o + 2] as number) + Math.sin(a) * ring * r,
  ];
  let lit = 1;
  if (anim === Anim.rise) {
    const h = frac(hash(p.i, 312) + t * 0.05);
    pos = [pos[0] + Math.sin(t * 0.3 + p.i) * h * 0.6, pos[1] + h * key, pos[2]];
    lit = Math.sin(Math.PI * h) * (1 - 0.5 * h);
  } else if (anim === Anim.pulse) lit = 0.65 + 0.35 * Math.sin(t * 0.45 + key);
  else if (anim === Anim.breathe) pos = breathing(pos, B.pivot, t);
  else if (anim === Anim.orbit) pos = turn(pos, B.pivot, t * key);
  return { pos, tone: B.dotMeta[m] as number, key, lit, kind: 2 };
}
