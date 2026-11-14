/*
 * The Skyscraper series (docs/specs/art-city.md, "Temple skyscrapers and the Skyscraper series",
 * 2026-11-14): eleven tall towers of our own, one to a pill in the City's Studio, and the same
 * builders standing in the Temples' quarter of the game city (lib/city-skyscrapers.ts).
 *
 * 2026-11-14: "Temple quarter should have a bunch of awesome unique skyscrapers as well, with a big
 * long bridge between them ... Add a skyscraper series to the designs."
 *
 * Every design is a builder of any height h and footprint r: the whole of it stands inside the
 * square |x|, |z| <= r · reach(y / h) round its axis (what the game holds as its walls), its foot
 * at the street. A tower may be cut through by voids (open floors, a slot between two legs), where
 * nothing is drawn and the Ship flies through. Original designs only, no real building's look.
 * Light is mellow: lamps breathe slowly, rings turn very slowly. Pure: no three.js, no DOM.
 */

import type { Vec3 } from './bigbang';
import type { BuildingSet } from './golden-quarters';
import { Anim, GROUND_Y, Mesh, type Opts, Tone } from './grain-mesh';

const G = GROUND_Y;
const TAU = Math.PI * 2;
const P = (x: number, y: number, z: number): Vec3 => [x, G + y, z];
const { edge, face, glass, light, plant, fire, road } = Tone;

/**
 * A void through a tower, over the street from y0 to y1: a slot along z (`open` 'z', free where
 * |x| < hw) or an open floor ('all', free where |x| < hw or |z| < hw: only its corner columns stand).
 */
export type Void = { y0: number; y1: number; hw: number; open: 'z' | 'all' };

/** Whether a point (relative to the tower's axis and foot) lies in one of the voids, `m` in from their faces. */
export function inVoid(voids: Void[], x: number, y: number, z: number, m = 0): boolean {
  for (const v of voids) {
    if (y <= v.y0 + m || y >= v.y1 - m) continue;
    const w = v.hw - m;
    if (Math.abs(x) < w) return true;
    if (v.open === 'all' && Math.abs(z) < w) return true;
  }
  return false;
}

/**
 * A mesh that leaves out whatever falls in its voids: lines cut into short pieces and only the
 * pieces outside kept, faces split until small and kept by their middles, lamps by their place.
 * The builders draw into it as into any mesh.
 */
export class Carved extends Mesh {
  constructor(private readonly voids: Void[]) {
    super();
  }
  private out(p: Vec3): boolean {
    return !inVoid(this.voids, p[0], p[1] - G, p[2]);
  }
  override line(a: Vec3, b: Vec3, tone: number, o: Opts = {}) {
    if (this.voids.length === 0) return super.line(a, b, tone, o);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(1, Math.ceil(len / 0.8));
    const at = (u: number): Vec3 => [
      a[0] + (b[0] - a[0]) * u,
      a[1] + (b[1] - a[1]) * u,
      a[2] + (b[2] - a[2]) * u,
    ];
    let run = -1;
    for (let i = 0; i <= n; i++) {
      const keep = i < n && this.out(at((i + 0.5) / n));
      if (keep && run < 0) run = i;
      if (!keep && run >= 0) {
        super.line(at(run / n), at(i / n), tone, o);
        run = -1;
      }
    }
  }
  override tri(a: Vec3, b: Vec3, c: Vec3, tone: number, o: Opts = {}, depth = 0) {
    if (this.voids.length === 0) return super.tri(a, b, c, tone, o);
    if (!this.touches(a, b, c)) return super.tri(a, b, c, tone, o);
    const d = (p: Vec3, q: Vec3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    const big = Math.max(d(a, b), d(b, c), d(c, a));
    const all = this.out(a) && this.out(b) && this.out(c);
    const m: Vec3 = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    if ((all && big < 3) || big < 1.2 || depth >= 6) {
      if (this.out(m)) super.tri(a, b, c, tone, o);
      return;
    }
    const mid = (p: Vec3, q: Vec3): Vec3 => [
      (p[0] + q[0]) / 2,
      (p[1] + q[1]) / 2,
      (p[2] + q[2]) / 2,
    ];
    const ab = mid(a, b);
    const bc = mid(b, c);
    const ca = mid(c, a);
    this.tri(a, ab, ca, tone, o, depth + 1);
    this.tri(ab, b, bc, tone, o, depth + 1);
    this.tri(ca, bc, c, tone, o, depth + 1);
    this.tri(ab, bc, ca, tone, o, depth + 1);
  }
  /** Whether a face's box meets any void (if not, it is kept whole, unsplit). */
  private touches(a: Vec3, b: Vec3, c: Vec3): boolean {
    const lo = (i: number) => Math.min(a[i] as number, b[i] as number, c[i] as number);
    const hi = (i: number) => Math.max(a[i] as number, b[i] as number, c[i] as number);
    const e = 1e-6;
    for (const v of this.voids) {
      if (hi(1) - G <= v.y0 + e || lo(1) - G >= v.y1 - e) continue;
      if (lo(0) < v.hw - e && hi(0) > -v.hw + e) return true;
      if (v.open === 'all' && lo(2) < v.hw - e && hi(2) > -v.hw + e) return true;
    }
    return false;
  }
  override dot(at: Vec3, r: number, tone: number, o: Opts = {}) {
    if (this.out(at)) super.dot(at, r, tone, o);
  }
}

/* ---------- pieces ---------- */

/** A square's four corners at height y (over the street), half-width w, turned a. */
function square(w: number, y: number, a = 0, cx = 0, cz = 0): Vec3[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([u, v]) =>
    P(
      cx + (u as number) * w * c - (v as number) * w * s,
      y,
      cz + (u as number) * w * s + (v as number) * w * c,
    ),
  );
}

/** Faces and corner edges between two outlines of the same number of points. */
function loft(m: Mesh, lo: Vec3[], hi: Vec3[], tone: number, corners = true) {
  const n = lo.length;
  for (let i = 0; i < n; i++) {
    const a = lo[i] as Vec3;
    const b = lo[(i + 1) % n] as Vec3;
    const c = hi[(i + 1) % n] as Vec3;
    const d = hi[i] as Vec3;
    m.tri(a, b, c, tone);
    m.tri(a, c, d, tone);
    if (corners) m.line(a, d, edge);
  }
}

/** A row of lamps along an outline, one at each side's middle and between, breathing slowly. */
function lamps(m: Mesh, pts: Vec3[], per: number, key: number) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i] as Vec3;
    const b = pts[(i + 1) % n] as Vec3;
    for (let k = 1; k <= per; k++) {
      const u = k / (per + 1);
      m.dot(
        [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u],
        0.18,
        light,
        { anim: Anim.pulse, key: key + i * 1.7 + k, w: 0.5 },
      );
    }
  }
}

/** A spire up the axis from y0 to y1, a soft beacon at its tip. */
function spire(m: Mesh, y0: number, y1: number) {
  m.line(P(0, y0, 0), P(0, y1, 0), edge, { w: 0.8 });
  m.dot(P(0, y1, 0), 0.5, fire, { anim: Anim.pulse, key: y1, w: 0.7 });
}

/* ---------- the eleven ---------- */

/** A design: its name, its builder, how wide it stands at each height, its own voids in the Studio. */
export type SkyDesign = {
  name: string;
  /** One line, for the spec and the pill's tooltip. */
  idea: string;
  build: (m: Mesh, h: number, r: number, voids: Void[]) => void;
  /** How far out it reaches at height fraction v (0 foot, 1 top), as a share of r. */
  reach: (v: number) => number;
  /** The voids it has of its own when it stands alone (the Studio's pill). */
  voids: (h: number, r: number) => Void[];
};

const none = () => [];

/** Helix Twist: square floors, each turned a little more, tapering, a quarter and a half turn in all. */
function helixTwist(m: Mesh, h: number, r: number) {
  const N = 36;
  const top = h * 0.9;
  const w = (v: number) => r * 0.7 * (1 - 0.3 * v);
  const a = (v: number) => v * Math.PI * 0.75;
  let prev = square(w(0), 0, 0);
  for (let k = 1; k <= N; k++) {
    const v = k / N;
    const cur = square(w(v), top * v, a(v));
    m.centre = P(0, top * (v - 0.5 / N), 0);
    loft(m, prev, cur, k % 3 === 0 ? glass : face);
    m.poly(cur, true, k % 4 === 0 ? edge : glass, { w: k % 4 === 0 ? 1 : 0.5 });
    if (k % 3 === 1) lamps(m, cur, 2, k);
    prev = cur;
  }
  m.poly(square(w(0), 0, 0), true, edge);
  m.centre = P(0, top, 0);
  for (const p of prev) m.line(p, P(0, h * 0.96, 0), edge, { w: 0.7 });
  spire(m, h * 0.96, h);
}

/** Crowned Needle: an eight-sided shaft tapering to a needle, a crown of eight tines round its waist. */
function crownedNeedle(m: Mesh, h: number, r: number) {
  const N = 24;
  const top = h * 0.84;
  const oct = (rad: number, y: number) =>
    Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * TAU + TAU / 16;
      return P(Math.cos(a) * rad, y, Math.sin(a) * rad);
    });
  const rad = (v: number) => r * (0.95 - 0.7 * v);
  let prev = oct(rad(0), 0);
  for (let k = 1; k <= N; k++) {
    const v = k / N;
    const cur = oct(rad(v), top * v);
    m.centre = P(0, top * (v - 0.5 / N), 0);
    loft(m, prev, cur, k % 2 ? face : glass, k % 2 === 0);
    if (k % 3 === 0) m.poly(cur, true, edge, { w: 0.6 });
    if (k % 2 === 1) lamps(m, cur, 1, k * 3);
    prev = cur;
  }
  // The crown: eight tines curving out and up from the shaft, a ring through their tips.
  const yc = top * 0.78;
  const rc = rad(0.78);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const pts: Vec3[] = [];
    for (let j = 0; j <= 8; j++) {
      const u = j / 8;
      const rr = rc + (r * 0.62 - rc) * Math.sin((u * Math.PI) / 2);
      pts.push(P(Math.cos(a) * rr, yc + u * h * 0.1, Math.sin(a) * rr));
    }
    m.poly(pts, false, edge);
    m.dot(pts[8] as Vec3, 0.3, light, { anim: Anim.pulse, key: i, w: 0.6 });
  }
  m.ring(P(0, yc + h * 0.1, 0), r * 0.62, edge, { w: 0.7 }, 32);
  spire(m, top, h);
}

/** Offset Stack: five boxes, each smaller, set off its neighbour, terraces where they overhang. */
function offsetStack(m: Mesh, h: number, r: number) {
  const N = 5;
  let y = 0;
  const share = [0.27, 0.23, 0.2, 0.17, 0.13];
  for (let k = 0; k < N; k++) {
    const hw = r * (0.6 - 0.06 * k);
    const off = Math.max(0, r - hw - 0.3) * (k % 2 ? 1 : -1) * 0.8;
    const [ox, oz] = k % 4 < 2 ? [off, 0] : [0, off];
    const hh = h * 0.94 * (share[k] as number);
    m.box(P(ox, y, oz), hw, hh, hw, k % 2 ? glass : face, edge);
    // Windows: lit dots in rows on every face.
    for (let f = 0; f < 4; f++) {
      const ax = f % 2 === 0;
      const sgn = f < 2 ? 1 : -1;
      for (let row = 1; row < hh / 3; row++)
        for (let c = -2; c <= 2; c++) {
          const along = (c / 2.5) * hw;
          const at = ax
            ? P(ox + sgn * (hw + 0.05), y + row * 3, oz + along)
            : P(ox + along, y + row * 3, oz + sgn * (hw + 0.05));
          if ((row + c + k) % 3 === 0)
            m.dot(at, 0.16, light, { anim: Anim.pulse, key: row * 5 + c + k * 11, w: 0.4 });
        }
    }
    // A garden rail round the terrace the next box leaves.
    m.poly(square(hw - 0.4, y + hh + 0.6, 0, ox, oz), true, plant, { w: 0.5 });
    y += hh;
  }
  spire(m, y, h);
}

/** Garden Void: a square tower opened through at its sky gardens, only its corner columns standing. */
function gardenVoid(m: Mesh, h: number, r: number, voids: Void[]) {
  const w = r * 0.96;
  const col = Math.max(0.8, w - (voids[0]?.hw ?? w * 0.7));
  const cuts = [...voids].sort((a, b) => a.y0 - b.y0);
  const top = h * 0.93;
  // The body in pieces between the voids.
  let y = 0;
  const bands: [number, number][] = [];
  for (const v of cuts) {
    if (v.y0 > y) bands.push([y, v.y0]);
    y = Math.max(y, v.y1);
  }
  if (y < top) bands.push([y, top]);
  for (const [a, b] of bands) {
    m.box(P(0, a, 0), w, b - a, w, face, edge);
    for (let yy = a + 3; yy < b - 1; yy += 3) {
      m.poly(square(w + 0.02, yy, 0), true, glass, { w: 0.45 });
      if (Math.round(yy) % 2 === 0) lamps(m, square(w + 0.05, yy + 1.2, 0), 3, yy);
    }
  }
  // The corner columns through each void, and its garden: a lawn of small plants, trees, lamps.
  for (const v of cuts) {
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      const cx = sx * (w - col / 2);
      const cz = sz * (w - col / 2);
      m.box(P(cx, v.y0, cz), col / 2, v.y1 - v.y0, col / 2, face, edge);
      // A tree on each column's inner corner.
      const tx = sx * (w - col - 0.6);
      const tz = sz * (w - col - 0.6);
      m.line(P(tx, v.y0, tz), P(tx, v.y0 + 2.2, tz), road, { w: 0.6 });
      for (let j = 0; j < 7; j++) {
        const a = (j / 7) * TAU;
        m.dot(
          P(tx + Math.cos(a) * 0.9, v.y0 + 2.6 + 0.4 * Math.sin(a * 2), tz + Math.sin(a) * 0.9),
          0.3,
          plant,
          { w: 0.5 },
        );
      }
    }
    m.poly(square(w - 0.3, v.y0 + 0.05, 0), true, plant, { w: 0.6 });
    m.poly(square(w - 0.3, v.y1 - 0.05, 0), true, edge, { w: 0.7 });
    lamps(m, square(w - 0.4, v.y1 - 0.4, 0), 4, v.y0);
  }
  // A roof garden and a slim mast.
  m.poly(square(w * 0.7, top + 0.4, 0), true, plant, { w: 0.6 });
  spire(m, top, h);
}

/** The Studio's two sky gardens of a Garden Void tower. */
const gardenVoids = (h: number, r: number): Void[] => [
  { y0: h * 0.36, y1: h * 0.45, hw: r * 0.62, open: 'all' },
  { y0: h * 0.66, y1: h * 0.73, hw: r * 0.62, open: 'all' },
];

/** Twin Crown: two slender legs with a slot between them, joined high up by a crown block. */
function twinCrown(m: Mesh, h: number, r: number, voids: Void[]) {
  const slot = voids.find((v) => v.y0 <= 0.01 && v.open === 'z') ?? {
    y0: 0,
    y1: h * 0.6,
    hw: r * 0.35,
    open: 'z' as const,
  };
  const join = slot.y1;
  const top = h * 0.9;
  const legW = (r - slot.hw) / 2;
  for (const s of [-1, 1]) {
    const cx = s * (slot.hw + legW);
    m.box(P(cx, 0, 0), legW, join, r * 0.86, face, edge);
    for (let y = 4; y < join; y += 4) {
      m.line(P(cx - legW, y, r * 0.87), P(cx + legW, y, r * 0.87), glass, { w: 0.5 });
      m.line(P(cx - legW, y, -r * 0.87), P(cx + legW, y, -r * 0.87), glass, { w: 0.5 });
      m.dot(P(cx - s * legW - s * 0.05, y + 2, 0), 0.2, light, {
        anim: Anim.pulse,
        key: y + s,
        w: 0.5,
      });
    }
  }
  // The arch of the slot's head, and the crown block over it.
  const arch: Vec3[] = [];
  for (let j = 0; j <= 12; j++) {
    const u = j / 12;
    arch.push(P(-slot.hw + 2 * slot.hw * u, join + 0.05 + 2.5 * Math.sin(Math.PI * u), r * 0.86));
  }
  m.poly(arch, false, edge);
  m.poly(
    arch.map((p) => [p[0], p[1], -p[2]] as Vec3),
    false,
    edge,
  );
  m.box(P(0, join, 0), r, top - join, r * 0.86, glass, edge);
  for (let y = join + 3; y < top; y += 3)
    lamps(
      m,
      square(r + 0.05, y, 0).map((p) => [p[0], p[1], p[2] * 0.86] as Vec3),
      3,
      y,
    );
  // A stepped crown and twin masts.
  m.box(P(0, top, 0), r * 0.6, h * 0.04, r * 0.5, face, edge);
  for (const s of [-1, 1]) {
    m.line(P(s * r * 0.45, top, 0), P(s * r * 0.45, h, 0), edge, { w: 0.7 });
    m.dot(P(s * r * 0.45, h, 0), 0.45, fire, { anim: Anim.pulse, key: s * 3, w: 0.7 });
  }
}

/** Lattice Spire: a tapering square shaft wrapped in a diagrid of light, a glass core inside. */
function latticeSpire(m: Mesh, h: number, r: number) {
  const N = 14;
  const top = h * 0.88;
  const w = (v: number) => r * 0.95 * (1 - 0.45 * v);
  for (let k = 0; k < N; k++) {
    const v0 = k / N;
    const v1 = (k + 1) / N;
    const lo = square(w(v0), top * v0, 0);
    const hi = square(w(v1), top * v1, 0);
    for (let i = 0; i < 4; i++) {
      const a = lo[i] as Vec3;
      const b = lo[(i + 1) % 4] as Vec3;
      const c = hi[(i + 1) % 4] as Vec3;
      const d = hi[i] as Vec3;
      m.line(a, c, edge, { w: 0.8 });
      m.line(b, d, edge, { w: 0.8 });
      m.line(a, d, edge, { w: 0.5 });
    }
    m.poly(hi, true, edge, { w: 0.6 });
    // The glass core inside.
    m.centre = P(0, top * (v0 + v1) * 0.5, 0);
    loft(m, square(w(v0) * 0.72, top * v0, 0), square(w(v1) * 0.72, top * v1, 0), glass, false);
    lamps(m, square(w(v0) * 0.73, top * (v0 + 0.5 / N), 0), 2, k * 7);
  }
  m.poly(square(w(0), 0, 0), true, edge);
  // A lattice pyramid to the tip.
  const cap = square(w(1), top, 0);
  for (const p of cap) m.line(p, P(0, h * 0.97, 0), edge);
  spire(m, h * 0.97, h);
}

/** Orbit Tower: a round core with a dome, three tilted rings of light turning slowly round it. */
function orbitTower(m: Mesh, h: number, r: number) {
  const top = h * 0.84;
  const rc = r * 0.55;
  const n = 16;
  const ring = (rad: number, y: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * TAU;
      return P(Math.cos(a) * rad, y, Math.sin(a) * rad);
    });
  const N = 20;
  let prev = ring(rc, 0);
  for (let k = 1; k <= N; k++) {
    const v = k / N;
    const cur = ring(rc * (1 - 0.12 * v), top * v);
    m.centre = P(0, top * (v - 0.5 / N), 0);
    loft(m, prev, cur, k % 2 ? face : glass, k % 4 === 0);
    if (k % 2 === 0) m.poly(cur, true, glass, { w: 0.5 });
    if (k % 3 === 0) lamps(m, cur, 0, k);
    for (let i = 0; i < n; i += 4)
      m.dot(cur[i] as Vec3, 0.18, light, { anim: Anim.pulse, key: k * 3 + i, w: 0.4 });
    prev = cur;
  }
  // The dome.
  m.centre = P(0, top, 0);
  for (let j = 0; j < 5; j++) {
    const a0 = (j / 5) * (Math.PI / 2);
    const a1 = ((j + 1) / 5) * (Math.PI / 2);
    const rr = rc * 0.88;
    loft(
      m,
      ring(rr * Math.cos(a0), top + rr * Math.sin(a0)),
      ring(rr * Math.cos(a1) + 0.01, top + rr * Math.sin(a1)),
      glass,
      j === 0,
    );
  }
  spire(m, top + rc * 0.88, h);
  // Three tilted rings, each turning very slowly round the tower (Anim.orbit about the axis).
  const tilts = [0.22, -0.26, 0.18];
  [0.52, 0.68, 0.82].forEach((f, i) => {
    const rr = r * 0.9;
    const tilt = tilts[i] as number;
    const y = h * f;
    const pts: Vec3[] = [];
    for (let j = 0; j < 48; j++) {
      const a = (j / 48) * TAU;
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      pts.push(P(x, y + z * Math.sin(tilt), z * Math.cos(tilt)));
    }
    m.poly(pts, true, edge, { anim: Anim.orbit, key: 0.06 * (i % 2 ? -1 : 1), w: 0.9 });
    for (let j = 0; j < 48; j += 6)
      m.dot(pts[j] as Vec3, 0.3, light, { anim: Anim.orbit, key: 0.06 * (i % 2 ? -1 : 1), w: 0.6 });
  });
}

/** Stepped Temple Tower: a temple's stepped base, a ribbed shaft, a stepped crown with a gold finial. */
function steppedTemple(m: Mesh, h: number, r: number) {
  // Four terraces, a stair up the front of each.
  const steps = [0.98, 0.84, 0.7, 0.57];
  let y = 0;
  const sh = h * 0.045;
  steps.forEach((s, k) => {
    m.box(P(0, y, 0), r * s, sh, r * s, face, edge);
    m.poly(square(r * s - 0.3, y + sh + 0.3, 0), true, fire, { w: 0.4 });
    const front = r * s;
    m.line(P(-1, y, front + 0.05), P(-1, y + sh, front + 0.05), road, { w: 0.6 });
    m.line(P(1, y, front + 0.05), P(1, y + sh, front + 0.05), road, { w: 0.6 });
    if (k === 0) lamps(m, square(r * s + 0.05, sh * 0.5, 0), 4, 3);
    y += sh;
  });
  // The shaft: ribbed, a band of light every few floors.
  const shaftW = r * 0.46;
  const top = h * 0.78;
  m.box(P(0, y, 0), shaftW, top - y, shaftW, glass, edge);
  for (const [sx, sz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const)
    for (const o of [-0.5, 0, 0.5]) {
      const x = sx ? sx * (shaftW + 0.15) : o * shaftW;
      const z = sz ? sz * (shaftW + 0.15) : o * shaftW;
      m.line(P(x, y, z), P(x, top, z), edge, { w: 0.55 });
    }
  for (let yy = y + 4; yy < top; yy += 4) lamps(m, square(shaftW + 0.2, yy, 0), 2, yy);
  // The crown: three steps narrowing, a golden finial.
  let cy = top;
  [0.62, 0.48, 0.34].forEach((s, k) => {
    const hh = h * (0.05 - 0.008 * k);
    m.box(P(0, cy, 0), r * s, hh, r * s, face, edge);
    m.poly(square(r * s + 0.05, cy + hh * 0.5, 0), true, fire, { w: 0.5 });
    cy += hh;
  });
  m.line(P(0, cy, 0), P(0, h, 0), fire, { w: 0.9 });
  m.dot(P(0, h, 0), 0.6, fire, { anim: Anim.pulse, key: 7, w: 0.8 });
}

/** Prism Blade: a three-sided blade turning a little as it rises, its roof cut on a slant. */
function prismBlade(m: Mesh, h: number, r: number) {
  const N = 26;
  const tri = (v: number) => {
    const rad = r * 0.98 * (1 - 0.18 * v);
    const turn = v * 0.5;
    // Its roof slants: the first corner reaches the top, the others stop short.
    const lifts = [1, 0.86, 0.78];
    return [0, 1, 2].map((i) => {
      const a = turn + (i / 3) * TAU - Math.PI / 2;
      return { x: Math.cos(a) * rad, z: Math.sin(a) * rad, lift: lifts[i] as number };
    });
  };
  const top = h * 0.95;
  let prev = tri(0).map((c) => P(c.x, 0, c.z));
  for (let k = 1; k <= N; k++) {
    const v = k / N;
    const cur = tri(v).map((c) => P(c.x, top * Math.min(v, c.lift), c.z));
    m.centre = P(0, top * (v - 0.5 / N) * 0.8, 0);
    loft(m, prev, cur, k % 2 ? glass : face);
    if (k % 2 === 0) m.poly(cur, true, glass, { w: 0.5 });
    if (k % 3 === 1) lamps(m, cur, 3, k * 2);
    prev = cur;
  }
  m.poly(prev, true, edge);
  m.poly(
    tri(0).map((c) => P(c.x, 0, c.z)),
    true,
    edge,
  );
  spire(m, top, h);
}

/** Lotus Crown: a slim round shaft opening at its head into eight petals round a glowing heart. */
function lotusCrown(m: Mesh, h: number, r: number) {
  const top = h * 0.78;
  const rs = r * 0.42;
  const n = 12;
  const ring = (rad: number, y: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * TAU;
      return P(Math.cos(a) * rad, y, Math.sin(a) * rad);
    });
  const N = 18;
  let prev = ring(rs * 1.15, 0);
  for (let k = 1; k <= N; k++) {
    const v = k / N;
    const cur = ring(rs * (1.15 - 0.15 * v), top * v);
    m.centre = P(0, top * (v - 0.5 / N), 0);
    loft(m, prev, cur, k % 2 ? face : glass, k % 3 === 0);
    if (k % 2 === 0) lamps(m, cur, 0, k * 5);
    prev = cur;
  }
  // The petals: each a curved blade out and up from the shaft's head.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const side = (u: number, s: number): Vec3 => {
      const rr = rs + (r * 0.95 - rs) * Math.sin((u * Math.PI) / 2);
      const spread = 0.28 * Math.sin(Math.PI * u) * s;
      return P(Math.cos(a + spread) * rr, top + h * 0.18 * u * u, Math.sin(a + spread) * rr);
    };
    const L = Array.from({ length: 9 }, (_, j) => side(j / 8, 1));
    const R = Array.from({ length: 9 }, (_, j) => side(j / 8, -1));
    m.poly(L, false, edge);
    m.poly(R, false, edge);
    m.centre = P(0, top - 4, 0);
    for (let j = 0; j < 8; j++) {
      m.tri(L[j] as Vec3, L[j + 1] as Vec3, R[j + 1] as Vec3, glass, { two: true });
      m.tri(L[j] as Vec3, R[j + 1] as Vec3, R[j] as Vec3, glass, { two: true });
    }
    m.dot(side(1, 0), 0.3, light, { anim: Anim.pulse, key: i * 2, w: 0.6 });
  }
  m.dot(P(0, top + h * 0.06, 0), 1.2, fire, { anim: Anim.pulse, key: 1, w: 0.8 });
  spire(m, top, h);
}

/** Arch Gate: a tower standing on a great arch, two broad legs and a vaulted head, ribbed body above. */
function archGate(m: Mesh, h: number, r: number, voids: Void[]) {
  const slot = voids.find((v) => v.y0 <= 0.01 && v.open === 'z') ?? {
    y0: 0,
    y1: h * 0.5,
    hw: r * 0.5,
    open: 'z' as const,
  };
  const join = slot.y1;
  const hw = slot.hw;
  const d = r * 0.82;
  const top = h * 0.86;
  for (const s of [-1, 1]) {
    const mid = (s * (hw + r)) / 2;
    m.box(P(mid, 0, 0), (r - hw) / 2, join, d, face, edge);
    // A parabola of light up each leg's face, the arch's line drawn on.
    for (const zf of [d + 0.05, -d - 0.05]) {
      const pts: Vec3[] = [];
      for (let j = 0; j <= 14; j++) {
        const u = j / 14;
        pts.push(P(s * (r - (r - hw) * u ** 0.5 * 0.92), join * u, zf));
      }
      m.poly(pts, false, edge, { w: 0.8 });
    }
    for (let y = 5; y < join; y += 5)
      m.dot(P(s * (hw - 0.05), y, 0), 0.22, light, { anim: Anim.pulse, key: y * 0.3 + s, w: 0.5 });
  }
  // The vault over the slot: a half ellipse on both faces, ribs across its underside.
  const vault = (z: number) =>
    Array.from({ length: 17 }, (_, j) => {
      const a = (j / 16) * Math.PI;
      return P(-Math.cos(a) * hw, join + 0.05 + Math.sin(a) * hw * 0.55, z);
    });
  m.poly(vault(d), false, edge);
  m.poly(vault(-d), false, edge);
  for (let j = 1; j < 16; j += 3)
    m.line(vault(d)[j] as Vec3, vault(-d)[j] as Vec3, glass, { w: 0.5 });
  // The body: full width, ribbed, bands of lamps; then a tapered head and a spire.
  m.box(P(0, join, 0), r, top - join, d, glass, edge);
  for (const x of [-r * 0.66, -r * 0.33, 0, r * 0.33, r * 0.66])
    for (const z of [d + 0.12, -d - 0.12]) m.line(P(x, join, z), P(x, top, z), edge, { w: 0.5 });
  for (let y = join + 4; y < top; y += 4)
    lamps(
      m,
      square(r + 0.05, y, 0).map((p) => [p[0], p[1], p[2] * (d / r)] as Vec3),
      3,
      y,
    );
  m.centre = P(0, top, 0);
  loft(
    m,
    square(r, top, 0).map((p) => [p[0], p[1], p[2] * (d / r)] as Vec3),
    square(r * 0.45, h * 0.95, 0),
    face,
  );
  spire(m, h * 0.95, h);
}

/**
 * The eleven, in pill order. Each reach is an upper bound of how far out it stands at that height
 * (the tests hold every grain inside it): what the game holds as its walls.
 */
export const SKY_DESIGNS: SkyDesign[] = [
  {
    name: 'Helix Twist',
    idea: 'Thirty-six square floors, each turned a little more, tapering: a quarter and a half turn in all, a lit crown and spire.',
    build: helixTwist,
    reach: (v) => (v < 0.9 ? 1 - 0.3 * Math.min(1, v / 0.9) : 0.72),
    voids: none,
  },
  {
    name: 'Crowned Needle',
    idea: 'An eight-sided shaft tapering to a needle, a crown of eight tines curving out round its waist.',
    build: crownedNeedle,
    reach: (v) => Math.max(0.95 - 0.7 * Math.min(1, v / 0.84), v > 0.6 && v < 0.78 ? 0.64 : 0),
    voids: none,
  },
  {
    name: 'Offset Stack',
    idea: 'Five boxes stacked, each smaller and set off the one below, garden rails round the terraces they leave.',
    build: offsetStack,
    reach: () => 1,
    voids: none,
  },
  {
    name: 'Garden Void',
    idea: 'A square tower opened right through at its sky gardens: only its corner columns stand there, trees and lamps between.',
    build: gardenVoid,
    reach: () => 0.97,
    voids: gardenVoids,
  },
  {
    name: 'Twin Crown',
    idea: 'Two slender legs with a tall slot between them, joined high up by a glass crown with twin masts.',
    build: twinCrown,
    reach: () => 1,
    voids: (h, r) => [{ y0: 0, y1: h * 0.6, hw: r * 0.35, open: 'z' }],
  },
  {
    name: 'Lattice Spire',
    idea: 'A tapering square shaft wrapped in a diagrid of light, a glass core inside, a lattice pyramid to its tip.',
    build: latticeSpire,
    reach: (v) => 0.96 * (1 - 0.45 * Math.min(1, v / 0.88)),
    voids: none,
  },
  {
    name: 'Orbit Tower',
    idea: 'A round core under a glass dome, three tilted rings of light turning very slowly round it.',
    build: orbitTower,
    reach: () => 0.92,
    voids: none,
  },
  {
    name: 'Stepped Temple Tower',
    idea: 'A temple’s four terraces with their stairs, a ribbed shaft, a stepped crown and a golden finial.',
    build: steppedTemple,
    reach: (v) => (v < 0.19 ? 1 : v < 0.78 ? 0.68 : 0.64),
    voids: none,
  },
  {
    name: 'Prism Blade',
    idea: 'A three-sided blade turning a little as it rises, its roof cut on a slant to a mast.',
    build: prismBlade,
    reach: () => 0.99,
    voids: none,
  },
  {
    name: 'Lotus Crown',
    idea: 'A slim round shaft opening at its head into eight glass petals round a softly glowing heart.',
    build: lotusCrown,
    reach: (v) => (v < 0.77 ? 0.5 : 0.97),
    voids: none,
  },
  {
    name: 'Arch Gate',
    idea: 'A tower standing on a great arch: two broad legs, a vaulted head you fly under, a ribbed body and a tapered crown.',
    build: archGate,
    reach: () => 1,
    voids: (h, r) => [{ y0: 0, y1: h * 0.45, hw: r * 0.5, open: 'z' }],
  },
];

/** The Studio's size for every pill: this tall, this wide. */
export const STUDIO_SKY = { h: 64, r: 7 };

/** Design i built into mesh m at height h and footprint r, cut by `voids` (its own in the Studio). */
export function buildSky(m: Mesh, i: number, h: number, r: number, voids: Void[]) {
  const D = SKY_DESIGNS[i] ?? (SKY_DESIGNS[0] as SkyDesign);
  D.build(m, h, r, voids);
}

/** Everything drawn into `from` added to `to` (no spread: the arrays can be long). */
function copyInto(to: Mesh, from: Mesh) {
  const add = (a: number[], b: number[]) => {
    for (const v of b) a.push(v);
  };
  add(to.lines, from.lines);
  add(to.lineMeta, from.lineMeta);
  add(to.tris, from.tris);
  add(to.triMeta, from.triMeta);
  add(to.dots, from.dots);
  add(to.dotMeta, from.dotMeta);
}

/** The series as a Studio set (lib/golden-quarters.ts BuildingSet): one pill a tower, on a plaza. */
export const SKYSCRAPERS: BuildingSet = {
  names: SKY_DESIGNS.map((d) => d.name),
  build: SKY_DESIGNS.map((D, i) => (m: Mesh) => {
    const { h, r } = STUDIO_SKY;
    const voids = D.voids(h, r);
    const c = new Carved(voids);
    buildSky(c, i, h, r, voids);
    copyInto(m, c);
  }),
  label: 'Skyscraper',
  reach: SKY_DESIGNS.map(() => 1),
  rung: SKY_DESIGNS.map(() => 0),
};

/** Slowly round a pill's tower, a little above, far enough back to see it whole. */
export function skyscraperEye(t: number): { eye: Vec3; target: Vec3 } {
  const { h, r } = STUDIO_SKY;
  const target: Vec3 = [0, G + h * 0.44, 0];
  const d = 1.05 * h + 3 * r + 10;
  const az = 0.8 + t * 0.035;
  const el = 0.16;
  return {
    eye: [
      target[0] + Math.sin(az) * Math.cos(el) * d,
      target[1] + Math.sin(el) * d,
      target[2] + Math.cos(az) * Math.cos(el) * d,
    ],
    target,
  };
}
