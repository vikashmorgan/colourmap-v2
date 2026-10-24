/**
 * Cymatics for the Chill Machine visuals — a flat, star-filled take on the
 * Cymatic Sands of Geometry Field (components/geometry-cymatics.ts).
 *
 * Sand lies on a round plate. The plate vibrates in a circular mode
 * J_n(αr)·cos(nθ); grains are shaken where the plate moves and come to rest
 * on its still (nodal) lines, so the sand draws the figure. The mode slowly
 * walks through CIRCLE_PATTERNS and the sand flows to each new figure. Sound
 * shakes harder and moves the walk along faster.
 *
 * Everything here is in plate units: the plate is the unit disc, centred on 0.
 * The canvas drawing lives in components/AtomVisualizer.tsx.
 */

import { besselJ, CIRCLE_PATTERNS, patternBlend } from '@/lib/cymatics';

/** Radial samples per pattern table. */
const TABLE_SIZE = 256;

/** J_n(α·r) sampled over r ∈ [0, 1], normalised so the largest |value| is 1. */
export interface RadialTable {
  n: number;
  values: Float32Array;
}

function buildTable(n: number, alpha: number): RadialTable {
  const values = new Float32Array(TABLE_SIZE + 1);
  let max = 0;
  for (let i = 0; i <= TABLE_SIZE; i++) {
    const v = besselJ(n, (alpha * i) / TABLE_SIZE);
    values[i] = v;
    max = Math.max(max, Math.abs(v));
  }
  const norm = max || 1;
  for (let i = 0; i <= TABLE_SIZE; i++) values[i] /= norm;
  return { n, values };
}

/** One table per circle pattern, built once. */
export const CIRCLE_TABLES: readonly RadialTable[] = CIRCLE_PATTERNS.map((p) =>
  buildTable(p.n, p.alpha),
);

function radial(table: RadialTable, r: number): number {
  const f = Math.min(1, Math.max(0, r)) * TABLE_SIZE;
  const i = Math.floor(f);
  if (i >= TABLE_SIZE) return table.values[TABLE_SIZE];
  const t = f - i;
  return table.values[i] * (1 - t) + table.values[i + 1] * t;
}

/** Plate displacement at (x, y) for one pattern, roughly within ±1. */
export function plateAmp(table: RadialTable, x: number, y: number): number {
  const r = Math.sqrt(x * x + y * y);
  const theta = Math.atan2(y, x);
  return radial(table, r) * Math.cos(table.n * theta);
}

/** Where the pattern walk stands: two tables and how far it has blended. */
export interface PlateState {
  from: RadialTable;
  to: RadialTable;
  mix: number;
}

/** Each figure holds for 5 phase units, then flows to the next over 3. */
export const HOLD = 5;
export const BLEND = 3;

export function plateAt(phase: number): PlateState {
  const { from, to, mix } = patternBlend(phase, CIRCLE_TABLES.length, HOLD, BLEND);
  return { from: CIRCLE_TABLES[from], to: CIRCLE_TABLES[to], mix };
}

/** Blended displacement of the plate at (x, y). */
export function blendedAmp(plate: PlateState, x: number, y: number): number {
  const a = plateAmp(plate.from, x, y);
  if (plate.mix <= 0) return a;
  return a * (1 - plate.mix) + plateAmp(plate.to, x, y) * plate.mix;
}

export interface Grain {
  x: number;
  y: number;
  /** 0..1, picks a palette colour and a size. */
  seed: number;
  /** How much the grain moved last step, for sparkle (still grains glint). */
  stir: number;
}

/** Grains scattered evenly over the plate. */
export function createSand(count: number, rand: () => number = Math.random): Grain[] {
  const grains: Grain[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(rand()) * 0.98;
    const a = rand() * Math.PI * 2;
    grains.push({ x: r * Math.cos(a), y: r * Math.sin(a), seed: rand(), stir: 1 });
  }
  return grains;
}

const GRAD_H = 0.01;

/**
 * One step of sand physics. Each grain slides down the slope of A² (towards
 * the nearest still line) and is kicked at random in proportion to |A|, so
 * moving parts of the plate stay empty. `shake` (0..1+) is how hard the plate
 * is driven; sound raises it.
 */
export function stepSand(
  grains: Grain[],
  plate: PlateState,
  shake: number,
  rand: () => number = Math.random,
): void {
  const pull = 0.012;
  const kick = 0.018 + shake * 0.03;
  for (const g of grains) {
    const a = blendedAmp(plate, g.x, g.y);
    const ax = blendedAmp(plate, g.x + GRAD_H, g.y);
    const ay = blendedAmp(plate, g.x, g.y + GRAD_H);
    // ∇(A²) = 2A∇A
    const gx = (2 * a * (ax - a)) / GRAD_H;
    const gy = (2 * a * (ay - a)) / GRAD_H;
    const jitter = Math.abs(a) * kick;
    const dx = -gx * pull + (rand() - 0.5) * jitter;
    const dy = -gy * pull + (rand() - 0.5) * jitter;
    g.x += dx;
    g.y += dy;
    g.stir = g.stir * 0.85 + Math.sqrt(dx * dx + dy * dy) * 0.15;
    // Keep grains on the plate: a grain that falls off lands somewhere new.
    const r2 = g.x * g.x + g.y * g.y;
    if (r2 > 0.99 * 0.99) {
      const r = Math.sqrt(rand()) * 0.95;
      const t = rand() * Math.PI * 2;
      g.x = r * Math.cos(t);
      g.y = r * Math.sin(t);
      g.stir = 1;
    }
  }
}

export interface Star {
  /** 0..1 across the canvas. */
  x: number;
  y: number;
  /** Radius in px before the size slider. */
  size: number;
  /** Twinkle phase and rate. */
  phase: number;
  rate: number;
  /** A few stars are drawn as four-point sparkles. */
  sparkle: boolean;
}

/** A field of stars behind the plate. */
export function createStars(count: number, rand: () => number = Math.random): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const big = rand() < 0.08;
    stars.push({
      x: rand(),
      y: rand(),
      size: big ? 1.2 + rand() * 1.2 : 0.35 + rand() * 0.75,
      phase: rand() * Math.PI * 2,
      rate: 0.6 + rand() * 1.8,
      sparkle: big,
    });
  }
  return stars;
}

/** Star brightness 0..1 at time `t` (seconds); loud sound lifts every star. */
export function twinkle(star: Star, t: number, loudness: number): number {
  const base = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * star.rate + star.phase));
  return Math.min(1, base * (0.75 + loudness * 0.6));
}

/** Grain and star counts for a density slider value (0..1). */
export function cymaticsCounts(density: number): { grains: number; stars: number } {
  const d = Math.min(1, Math.max(0, density));
  return { grains: Math.round(900 + d * 2100), stars: Math.round(140 + d * 260) };
}
