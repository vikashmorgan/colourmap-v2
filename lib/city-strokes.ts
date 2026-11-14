/*
 * Strokes of light for the City of Dreams (docs/specs/art-city.md, "Alive quarters"): a structure
 * drawn as polylines (gates, sky bridges, banner frames, arches, ramps), built once tile-local and
 * handed to the Ship's renderer as one Item. Each segment keeps its own tone (an index into the
 * palette the caller passes each frame) and brightness, so the light can drift slowly without the
 * geometry being rebuilt. Pure: no three.js, no DOM; nothing allocated per site.
 */

import type { RGB, Vec3 } from './bigbang';
import { boxDist, type Item } from './city-grid';

/** A built set of strokes: its segments' ends, how many sites each gets, its tone and brightness. */
export type StrokeSet = {
  /** Six numbers a segment: its two ends. */
  ends: Float32Array;
  /** The first site of each segment, and one past the last (length segments + 1). */
  cum: Int32Array;
  tone: Uint8Array;
  k: Float32Array;
  count: number;
  lo: Vec3;
  hi: Vec3;
};

/** Builds a stroke set: lines and polylines, a site every `gap` along them. */
export class Strokes {
  private e: number[] = [];
  private n: number[] = [];
  private tn: number[] = [];
  private kk: number[] = [];
  constructor(private gap = 0.5) {}

  /** A straight line from a to b in tone `tone`, `k` bright; `gap` its own site spacing. */
  line(a: Vec3, b: Vec3, tone: number, k: number, gap = this.gap): this {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (len < 1e-6) return this;
    this.e.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    this.n.push(Math.max(1, Math.ceil(len / gap)));
    this.tn.push(tone);
    this.kk.push(k);
    return this;
  }

  /** A polyline through the points. */
  poly(pts: Vec3[], tone: number, k: number, gap = this.gap): this {
    for (let i = 1; i < pts.length; i++)
      this.line(pts[i - 1] as Vec3, pts[i] as Vec3, tone, k, gap);
    return this;
  }

  /** A curve: f(u) for u in 0..1, in `steps` straight pieces. */
  curve(f: (u: number) => Vec3, steps: number, tone: number, k: number, gap = this.gap): this {
    let prev = f(0);
    for (let i = 1; i <= steps; i++) {
      const p = f(i / steps);
      this.line(prev, p, tone, k, gap);
      prev = p;
    }
    return this;
  }

  /** A single lamp: one site. */
  dot(p: Vec3, tone: number, k: number): this {
    this.e.push(p[0], p[1], p[2], p[0], p[1], p[2]);
    this.n.push(1);
    this.tn.push(tone);
    this.kk.push(k);
    return this;
  }

  build(): StrokeSet {
    const m = this.n.length;
    const cum = new Int32Array(m + 1);
    for (let i = 0; i < m; i++) cum[i + 1] = (cum[i] as number) + (this.n[i] as number);
    const lo: Vec3 = [Infinity, Infinity, Infinity];
    const hi: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < this.e.length; i++) {
      const a = i % 3;
      const v = this.e[i] as number;
      if (v < lo[a]) lo[a] = v;
      if (v > hi[a]) hi[a] = v;
    }
    if (m === 0) {
      lo.fill(0);
      hi.fill(0);
    }
    return {
      ends: Float32Array.from(this.e),
      cum,
      tone: Uint8Array.from(this.tn),
      k: Float32Array.from(this.kk),
      count: cum[m] as number,
      lo,
      hi,
    };
  }
}

/** The segment site s falls in (binary search over cum). */
function segmentOf(cum: Int32Array, s: number): number {
  let a = 0;
  let b = cum.length - 2;
  while (a < b) {
    const m = (a + b + 1) >> 1;
    if ((cum[m] as number) <= s) a = m;
    else b = m - 1;
  }
  return a;
}

/** Site s of a stroke set, offset by (ox, oz): its place in o[0..2]; returns its segment. */
export function strokePoint(S: StrokeSet, s: number, ox: number, oz: number, o: number[]): number {
  const i = segmentOf(S.cum, s);
  const c0 = S.cum[i] as number;
  const n = (S.cum[i + 1] as number) - c0;
  const u = n === 1 ? 0.5 : (s - c0 + 0.5) / n;
  const j = i * 6;
  const e = S.ends;
  o[0] = ox + (e[j] as number) + ((e[j + 3] as number) - (e[j] as number)) * u;
  o[1] = (e[j + 1] as number) + ((e[j + 4] as number) - (e[j + 1] as number)) * u;
  o[2] = oz + (e[j + 2] as number) + ((e[j + 5] as number) - (e[j + 2] as number)) * u;
  return i;
}

/**
 * A stroke set as one of the Ship's items, tile-local and moved by (ox, oz): each site in its
 * segment's palette tone at its brightness, times `glow`, with a slow shimmer drifting along it
 * (`drift` 0 for none). `palette` is read at every site, so the caller may lean it slowly per frame.
 */
export function strokeItem(
  S: StrokeSet,
  ox: number,
  oz: number,
  palette: RGB[],
  glow: number,
  eye: Vec3,
  t: number,
  gid: number,
  weight = 2,
  drift = 0.12,
): Item {
  const lo: Vec3 = [S.lo[0] + ox, S.lo[1], S.lo[2] + oz];
  const hi: Vec3 = [S.hi[0] + ox, S.hi[1], S.hi[2] + oz];
  const mid: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  return {
    d: boxDist(eye, lo, hi),
    gid,
    count: S.count,
    weight,
    probe: [[lo[0], mid[1], lo[2]], mid, [hi[0], mid[1], hi[2]]],
    site: (s, o) => {
      const i = strokePoint(S, s, ox, oz, o);
      const c = palette[S.tone[i] as number] ?? (palette[0] as RGB);
      const k =
        (S.k[i] as number) *
        glow *
        (1 - drift + drift * Math.sin(t * 0.35 - ((o[0] as number) + (o[2] as number)) * 0.05));
      o[3] = c[0] * k;
      o[4] = c[1] * k;
      o[5] = c[2] * k;
      return true;
    },
  };
}
