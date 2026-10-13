/**
 * Liquid 1–3 — Geometry presets carrying the liquid ripple of the Big Bang
 * "Pulse", asked for 2026-10-13: "a series of three called Liquid 1 2 3, with
 * different shapes and that liquid ripple 3D effect on them in different ways."
 *
 * The Pulse's liquid is one travelling wave: the radius swells and sinks with
 * sin(ωt − k·r) running outward, the surface lifts in depth with a second wave,
 * and the light glints as the crest passes. Here it is drawn in LINES (this is
 * the Geometry tab, not Stars), on three shapes, each rippled differently:
 *
 *   liquid1  the mirrored fractal web: the Pulse's own Sierpinski sand, drawn as
 *            triangle edges in n mirrored sectors; the wave breathes outward
 *   liquid2  nested rose petals; the ripple swirls round the flower, twisting
 *            the petals like ink stirred in water
 *   liquid3  a seed-of-life lattice laid flat like a pond and seen at an angle;
 *            three drops ripple through it, lifting the circles in 3D
 *   liquid4  the Prism 3D look in liquid: spectral rings stacked in depth round
 *            a warm core, with spectral spokes; every ring flows and swirls and
 *            the whole stack undulates like a jellyfish, hues drifting, made to
 *            bloom (asked for the same day: "liquid colour inspired by prism 3d
 *            and bloom, but more liquid motions")
 *
 * Positions are computed here, turned and given a soft perspective, so the
 * depth reads on the Field's orthographic camera.
 */

import * as THREE from 'three';

import { advancePhase, type Rgb, shiftHue } from '@/lib/visual-math';

export const LIQUID_MODES = ['liquid1', 'liquid2', 'liquid3', 'liquid4'] as const;
type LiquidMode = (typeof LIQUID_MODES)[number];

export function isLiquidMode(mode: string): boolean {
  return (LIQUID_MODES as readonly string[]).includes(mode);
}

export interface LiquidCfg {
  mode: string;
  symmetry: number;
  complexity: number;
  glow: number;
  breathSpeed: number;
  intensity: number;
  luminous: number;
}

const TAU = Math.PI * 2;
const MAX_SEGMENTS = 26000;

type Seg = [number, number, number, number]; // x0, y0, x1, y1 on the unit disc

/* ── The shapes, on a unit disc ─────────────────────────────── */

/** The Sierpinski triangle at `levels`, as its smallest triangles' edges, in the unit triangle. */
export function sierpinskiEdges(levels: number): Seg[] {
  let tris: [number, number][][] = [
    [
      [0, 0],
      [1, 0],
      [0.5, Math.sqrt(3) / 2],
    ],
  ];
  for (let l = 0; l < levels; l++) {
    const next: [number, number][][] = [];
    for (const [a, b, c] of tris) {
      const ab: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const bc: [number, number] = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
      const ca: [number, number] = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2];
      next.push([a, ab, ca], [ab, b, bc], [ca, bc, c]);
    }
    tris = next;
  }
  const out: Seg[] = [];
  for (const [a, b, c] of tris) {
    out.push([a[0], a[1], b[0], b[1]], [b[0], b[1], c[0], c[1]], [c[0], c[1], a[0], a[1]]);
  }
  return out;
}

/** Liquid 1: the fractal folded into n mirrored sectors, as the Pulse folds its sand. */
export function fractalWeb(n: number, levels: number): Seg[] {
  const tri = sierpinskiEdges(levels);
  const H = Math.sqrt(3) / 2;
  const half = Math.PI / n;
  const toDisc = (fx: number, fy: number, sector: number): [number, number] => {
    const mirror = sector % 2 === 1 ? -1 : 1;
    const r = 0.08 + 0.92 * (fy / H);
    const th = (sector * TAU) / n + mirror * (fx - 0.5) * 2 * half * 0.92;
    return [Math.cos(th) * r, Math.sin(th) * r];
  };
  const out: Seg[] = [];
  for (let s = 0; s < n; s++) {
    for (const [x0, y0, x1, y1] of tri) {
      // Each edge in three pieces, so it can bend with the wave.
      for (let k = 0; k < 3; k++) {
        const t0 = k / 3;
        const t1 = (k + 1) / 3;
        const a = toDisc(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, s);
        const b = toDisc(x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1, s);
        out.push([a[0], a[1], b[0], b[1]]);
      }
    }
  }
  return out;
}

/** Liquid 2: `rings` nested roses of n petals, each a closed polyline. */
export function nestedRoses(n: number, rings: number, steps = 240): Seg[] {
  const out: Seg[] = [];
  for (let k = 1; k <= rings; k++) {
    const scale = k / rings;
    const turn = (k % 2 ? 0 : Math.PI / n) * 0.5;
    let prev: [number, number] | null = null;
    for (let i = 0; i <= steps; i++) {
      const th = (i / steps) * TAU;
      const petal = Math.abs(Math.cos((n * (th + turn)) / 2)) ** 0.7;
      const r = scale * (0.3 + 0.7 * petal);
      const p: [number, number] = [Math.cos(th) * r, Math.sin(th) * r];
      if (prev) out.push([prev[0], prev[1], p[0], p[1]]);
      prev = p;
    }
  }
  return out;
}

/** Liquid 3: the flower of life, circles of radius `cell` on a hex lattice inside the disc. */
export function seedLattice(cell: number, steps = 44): Seg[] {
  const out: Seg[] = [];
  const dy = (cell * Math.sqrt(3)) / 2;
  const rows = Math.ceil(1 / dy) + 1;
  for (let j = -rows; j <= rows; j++) {
    const cy = j * dy;
    const offset = (Math.abs(j) % 2) * cell * 0.5;
    for (let i = -rows; i <= rows; i++) {
      const cx = i * cell + offset;
      if (Math.hypot(cx, cy) > 1 - cell * 0.6) continue;
      let prev: [number, number] | null = null;
      for (let s = 0; s <= steps; s++) {
        const a = (s / steps) * TAU;
        const p: [number, number] = [cx + Math.cos(a) * cell, cy + Math.sin(a) * cell];
        if (prev) out.push([prev[0], prev[1], p[0], p[1]]);
        prev = p;
      }
    }
  }
  return out;
}

/** Liquid 4: spectral rings from the core outward, and n spokes through them. */
export function prismStack(n: number, rings: number, steps = 180): Seg[] {
  const out: Seg[] = [];
  for (let k = 0; k < rings; k++) {
    const r = 0.14 + (0.84 * k) / Math.max(1, rings - 1);
    let prev: [number, number] | null = null;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * TAU;
      const p: [number, number] = [Math.cos(a) * r, Math.sin(a) * r];
      if (prev) out.push([prev[0], prev[1], p[0], p[1]]);
      prev = p;
    }
  }
  for (let sp = 0; sp < n; sp++) {
    const a = (sp / n) * TAU;
    for (let i = 0; i < 28; i++) {
      const r0 = 0.08 + (0.9 * i) / 28;
      const r1 = 0.08 + (0.9 * (i + 1)) / 28;
      out.push([Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1]);
    }
  }
  return out;
}

/* ── The liquid: how each shape ripples ─────────────────────── */

export type Lifted = { x: number; y: number; z: number; glint: number; hue?: number };

/**
 * One point of a shape, moved by its liquid at time s (seconds). `amp` (0..1)
 * is how much it moves. Returns the moved point on the unit disc, its depth
 * (−1..1 scale) and how brightly the passing crest lights it (≈ 0.4..1.1).
 */
export function liquidAt(
  mode: LiquidMode,
  x: number,
  y: number,
  s: number,
  amp: number,
  n: number,
): Lifted {
  const r = Math.hypot(x, y);
  const th = Math.atan2(y, x);
  const w = TAU * 0.45 * s; // the Pulse's own breathing
  if (mode === 'liquid1') {
    // The Pulse: the radius breathes with a wave running outward, depth with another.
    const k = 8.6;
    const r2 = r * (1 + amp * 0.12 * Math.sin(w - k * r));
    const th2 = th + 0.03 * s;
    const z = amp * 0.22 * Math.sin(r * 10.5 - s * 1.2);
    const glint = 0.75 + 0.35 * Math.sin(w - k * r);
    return { x: Math.cos(th2) * r2, y: Math.sin(th2) * r2, z, glint };
  }
  if (mode === 'liquid2') {
    // Stirred: the angle is pushed round by a wave that travels out, so petals twist and untwist.
    const swirl = amp * 0.32 * Math.sin(6.5 * r - w) * r;
    const th2 = th + swirl + 0.05 * s;
    const r2 = r * (1 + amp * 0.06 * Math.sin(n * th - 1.3 * s));
    const z = amp * 0.3 * r * Math.sin(n * th + 0.9 * s - 4 * r);
    const glint = 0.7 + 0.4 * Math.sin(6.5 * r - w + n * th * 0.5);
    return { x: Math.cos(th2) * r2, y: Math.sin(th2) * r2, z, glint };
  }
  if (mode === 'liquid4') {
    // The Prism stack, liquid: each ring flows (two waves round it), the stack swirls
    // and undulates in depth, and the hue runs through the spectrum from the core out.
    const frac = Math.min(1, Math.max(0, (r - 0.14) / 0.84));
    const r2 =
      r *
      (1 + amp * (0.07 * Math.sin(n * th + 1.1 * s + 7 * r) + 0.05 * Math.sin(3 * th - 1.7 * s)));
    const th2 = th + amp * 0.26 * Math.sin(5 * r - w) * (0.3 + r) + 0.04 * s;
    const z = (frac - 0.5) * 0.7 + amp * 0.2 * Math.sin(9 * r - 1.6 * s + n * th * 0.5);
    const hue = (frac * 0.85 + (th / TAU) * 0.15 + 0.05 * s + 10) % 1;
    const glint = 0.85 + 0.35 * Math.sin(9 * r - w);
    return { x: Math.cos(th2) * r2, y: Math.sin(th2) * r2, z, glint, hue };
  }
  // liquid3 — a pond: three drops wander and ripple the surface; the lattice stays put, the depth moves.
  let z = 0;
  let crest = 0;
  for (let d = 0; d < 3; d++) {
    const cx = 0.45 * Math.cos(0.11 * s * (d + 1) + d * 2.1);
    const cy = 0.45 * Math.sin(0.13 * s * (d + 1.3) + d * 1.7);
    const dist = Math.hypot(x - cx, y - cy);
    const wave = Math.sin(14 * dist - 2.4 * s - d) * Math.exp(-2.2 * dist);
    z += wave;
    crest += Math.max(0, wave);
  }
  return { x, y, z: amp * 0.16 * z, glint: 0.55 + 0.6 * Math.min(1, crest) };
}

/* ── Building and updating ──────────────────────────────────── */

const shapes = new Map<string, Seg[]>();
function shapeFor(mode: LiquidMode, n: number, detail: number): Seg[] {
  const key = `${mode}-${n}-${detail}`;
  let segs = shapes.get(key);
  if (!segs) {
    if (mode === 'liquid1') {
      // Finer fractal with Detail, but never more lines than the buffer holds.
      let levels = detail <= 4 ? 3 : detail <= 7 ? 4 : 5;
      while (levels > 2 && n * 9 * 3 ** levels > MAX_SEGMENTS) levels--;
      segs = fractalWeb(n, levels);
    } else if (mode === 'liquid2') segs = nestedRoses(n, 4 + detail);
    else if (mode === 'liquid4') segs = prismStack(n, 5 + detail);
    else segs = seedLattice(0.34 - detail * 0.022);
    if (segs.length > MAX_SEGMENTS) segs = segs.slice(0, MAX_SEGMENTS);
    shapes.set(key, segs);
  }
  return segs;
}

export function buildLiquidSeries(): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_SEGMENTS * 6), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_SEGMENTS * 6), 3));
  geo.setDrawRange(0, 0);
  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  group.add(new THREE.LineSegments(geo, mat));
  return group;
}

const clocks = new Map<string, { phase: number; last: number | null }>();
const spectral = new THREE.Color();

/** How each mode is seen: its tilt (radians) and how far the camera stands, in disc radii. */
const VIEW: Record<LiquidMode, { tilt: (s: number) => number; dist: number }> = {
  liquid1: { tilt: (s) => 0.32 + 0.12 * Math.sin(s * 0.21), dist: 3.4 },
  liquid2: { tilt: (s) => 0.55 + 0.1 * Math.sin(s * 0.17), dist: 3.0 },
  liquid3: { tilt: () => 1.02, dist: 2.6 },
  liquid4: { tilt: (s) => 0.5 + 0.25 * Math.sin(s * 0.2), dist: 2.8 },
};

export function updateLiquidSeries(
  group: THREE.Group,
  cfg: LiquidCfg,
  palRgb: [number, number, number],
  t: number,
  R: number,
): void {
  const mode = cfg.mode as LiquidMode;
  let clock = clocks.get(mode);
  if (!clock) {
    clock = { phase: 0, last: null };
    clocks.set(mode, clock);
  }
  const s = advancePhase(clock, t, cfg.breathSpeed);
  const n = Math.max(3, Math.min(24, Math.round(cfg.symmetry)));
  const detail = Math.max(1, Math.min(10, Math.round(cfg.complexity)));
  const segs = shapeFor(mode, n, detail);
  const amp = Math.min(1.6, 0.25 + cfg.luminous * 0.3);
  const light = (cfg.intensity / 10) * 1.25;
  const base: Rgb = [palRgb[0] / 255, palRgb[1] / 255, palRgb[2] / 255];
  const spread = cfg.glow / 10; // colour drift across the radius
  const { tilt, dist } = VIEW[mode];
  const ct = Math.cos(tilt(s));
  const st = Math.sin(tilt(s));
  const scale = R * (mode === 'liquid3' ? 1.25 : 1.05);

  const line = group.children[0] as THREE.LineSegments;
  const pos = line.geometry.getAttribute('position').array as Float32Array;
  const col = line.geometry.getAttribute('color').array as Float32Array;

  // Colours by radius, computed once per frame for 16 bands (hue shifts are not cheap).
  const BANDS = 16;
  const bands: Rgb[] = [];
  for (let b = 0; b < BANDS; b++)
    bands.push(spread > 0 ? shiftHue(base, (b / BANDS) * spread * 0.35 + 0.02 * s * spread) : base);

  const project = (p: Lifted, out: Float32Array, at: number) => {
    // Tilt about the x axis, then a soft perspective: nearer is a little larger.
    const y1 = p.y * ct - p.z * st;
    const z1 = p.y * st + p.z * ct;
    const f = dist / (dist - z1);
    out[at] = p.x * f * scale;
    out[at + 1] = y1 * f * scale;
    out[at + 2] = 0;
    return f;
  };

  let v = 0;
  for (const [x0, y0, x1, y1] of segs) {
    const a = liquidAt(mode, x0, y0, s, amp, n);
    const b = liquidAt(mode, x1, y1, s, amp, n);
    const fa = project(a, pos, v * 3);
    const fb = project(b, pos, v * 3 + 3);
    for (const [p, f, at] of [
      [a, fa, v * 3],
      [b, fb, v * 3 + 3],
    ] as const) {
      const r = Math.min(0.999, Math.hypot(p.x, p.y));
      // The edge of the disc fades softly; the crest and the near side shine.
      const edge = Math.min(1, (1 - r) * 5);
      const k = light * p.glint * edge * (0.75 + 0.35 * (f - 1) * 4);
      if (p.hue !== undefined) {
        // Prism light: full spectrum, bright enough to bloom; a warm white core.
        spectral.setHSL(p.hue, 1, 0.58);
        const core = Math.max(0, 1 - r / 0.22);
        col[at] = (spectral.r * (1 - core) + 1.15 * core) * k * 1.5;
        col[at + 1] = (spectral.g * (1 - core) + 0.82 * core) * k * 1.5;
        col[at + 2] = (spectral.b * (1 - core) + 0.45 * core) * k * 1.5;
      } else {
        const band = bands[Math.floor(r * BANDS)] as Rgb;
        col[at] = band[0] * k;
        col[at + 1] = band[1] * k;
        col[at + 2] = band[2] * k;
      }
    }
    v += 2;
  }
  line.geometry.setDrawRange(0, v);
  line.geometry.getAttribute('position').needsUpdate = true;
  line.geometry.getAttribute('color').needsUpdate = true;
}
