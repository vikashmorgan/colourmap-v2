/*
 * RIVERDUST, the trip (docs/specs/riverdust.md): the desert town's design series as a trip for the
 * shared player (components/TripPlayer.tsx), the way the City shows its Studio pieces. One piece a
 * category (← → between them), one pill a design (↑ ↓ between them), the design's name shown
 * quietly beside the category's. The designs live in lib/riverdust-designs.ts; here only where
 * the eye stands, the grains left over for dusk stars, sand ripples and drifting dust, and the
 * Journey that plays the categories one after another. Pure: no three.js, no DOM.
 */

import type { Particle, Phase, RGB, Vec3 } from './bigbang';
import { hash } from './bigbang';
import { lerp, mix, scale, TAU, wrap } from './city-grid';
import {
  CATEGORIES,
  DESIGN_BUDGET,
  type Design,
  designModel,
  designSite,
  type View,
} from './riverdust-designs';
import { RD } from './riverdust-kit';

/** Grains on a phone and on a computer: a design takes up to DESIGN_BUDGET, the rest are dust and stars. */
export const GRAINS = { small: 6000, large: 9000 };
export { DESIGN_BUDGET };

/** How long a category plays on its own before it loops (the eye's glide out and back), seconds. */
export const LOOP = 60;

export const PHASES: Phase[] = CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  line: c.line,
  duration: LOOP,
  glow: 1,
  size: 0.85,
}));
export const PHASE_START = PHASES.map((_, i) => i * LOOP);
export const TOTAL = PHASES.length * LOOP;
/** The step bar's colours: ochre, burnt orange, burgundy, sand, terracotta, dusk violet, gold. */
export const STEP_COLOURS = [
  '#e0a050',
  '#e8742c',
  '#b03048',
  '#e8c890',
  '#c0603c',
  '#9a7ad4',
  '#f0c060',
];

/* ---------- the pills: one design a category ---------- */

const kinds = CATEGORIES.map(() => 0);
export const hasVariants = (k: number) => CATEGORIES[k] !== undefined;
export const variantNames = (k: number) => CATEGORIES[k]?.designs.map((d) => d.name) ?? [];
export const variantLabel = (k: number) => CATEGORIES[k]?.label ?? '';
/** Design i of category k; with no category (the Journey), the first of each. */
export function setVariant(i: number, k?: number) {
  if (k === undefined) {
    kinds.fill(0);
    return;
  }
  const c = CATEGORIES[k];
  if (c) kinds[k] = c.designs[i] ? i : 0;
}
/** The design showing in category k. */
export function designOf(k: number): Design {
  const c = CATEGORIES[wrap(k, CATEGORIES.length)] ?? (CATEGORIES[0] as (typeof CATEGORIES)[0]);
  return c.designs[kinds[CATEGORIES.indexOf(c)] ?? 0] ?? (c.designs[0] as Design);
}

/* ---------- the grains ---------- */

export function makeParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, i) => ({
    i,
    a: hash(i, 1),
    b: hash(i, 2),
    c: hash(i, 3),
    d: hash(i, 4),
    dir: [0, 0, -1] as Vec3,
    cluster: 0,
    stagger: hash(i, 5),
  }));
}

const STAR: RGB = mix(RD.sand, RD.violet, 0.35);
const ORIGIN = { x: 0, z: 0 };
const o = [0, 0, 0, 0, 0, 0];

/**
 * A grain beyond the design: faint dusk stars in a dome over the town, ripples of sand on lines
 * receding to the horizon (the floor that gives the depth), and dust drifting slowly in the air.
 */
export function ambientAt(p: Particle, t: number): { pos: Vec3; rgb: RGB } {
  if (p.c < 0.4) {
    const a = p.a * TAU;
    const e = Math.asin(p.b) * 0.9;
    const r = 210;
    const glow = 0.12 + 0.12 * p.d * (0.85 + 0.15 * Math.sin(t * 0.3 + p.i));
    return {
      pos: [
        Math.cos(a) * Math.cos(e) * r,
        18 + Math.sin(e) * r * 0.55,
        -40 + Math.sin(a) * Math.cos(e) * r,
      ],
      rgb: scale(STAR, glow),
    };
  }
  if (p.c < 0.82) {
    const row = Math.floor(p.b * 46);
    const z = 24 - row * 6 - row * row * 0.06;
    const x = (p.a - 0.5) * 2 * (40 + row * 4);
    const y = 0.02 + 0.25 * Math.sin(x * 0.15 + row);
    return { pos: [x, y, z], rgb: scale(RD.sand, 0.07 + 0.04 * p.d) };
  }
  // Dust in the air, drifting slowly across on the breeze, rising and falling a little.
  const x = wrap(p.a * 80 + t * 0.4, 80) - 40;
  return {
    pos: [x, 0.6 + p.b * 11 + Math.sin(t * 0.2 + p.i) * 0.5, 22 - p.d * 100],
    rgb: scale(RD.gold, 0.06 + 0.05 * p.b),
  };
}

/** Grain p in category k on its own, `s` seconds in: a site of the design showing, or dust. */
export function pieceAt(p: Particle, k: number, s: number): { pos: Vec3; rgb: RGB } {
  const M = designModel(designOf(k).id);
  if (p.i < M.count && designSite(M, p.i, s, ORIGIN, 1, o)) {
    return {
      pos: [o[0] as number, o[1] as number, o[2] as number],
      rgb: [o[3] as number, o[4] as number, o[5] as number],
    };
  }
  return ambientAt(p, s);
}

/* ---------- the eye ---------- */

type Eye = { eye: Vec3; target: Vec3 };

/**
 * A design's view, `s` seconds in: the eye glides forward along its line of sight and back again
 * over the loop (smooth at both ends), swaying a little side to side, as if walking or riding in.
 */
export function viewAt(v: View, s: number): Eye {
  const dx = v.target[0] - v.eye[0];
  const dz = v.target[2] - v.eye[2];
  const l = Math.hypot(dx, dz) || 1;
  const g = (v.glide ?? 0) * 0.5 * (1 - Math.cos((s / LOOP) * TAU));
  // Twice a loop, so the loop closes on itself.
  const sway = Math.sin((s / LOOP) * TAU * 2) * 0.35;
  const ox = (dx / l) * g + (dz / l) * sway;
  const oz = (dz / l) * g - (dx / l) * sway;
  return {
    eye: [v.eye[0] + ox, v.eye[1], v.eye[2] + oz],
    target: [v.target[0] + ox * 0.9, v.target[1], v.target[2] + oz * 0.9],
  };
}

export const pieceCamera = (k: number, s: number): Eye => viewAt(designOf(k).view, s);
export const pieceLength = () => LOOP;
export const pieceProgress = (_k: number, s: number) => wrap(s, LOOP) / LOOP;
export const pieceLook = (k: number) => {
  const P = PHASES[k] ?? (PHASES[0] as Phase);
  return { glow: P.glow, size: P.size };
};

/** How much a grain shows by its distance: dissolving right at the eye, fading into the dusk far off. */
export function fade(pos: Vec3, eye: Vec3): number {
  const d = Math.hypot(pos[0] - eye[0], pos[1] - eye[1], pos[2] - eye[2]);
  const near = Math.min(1, Math.max(0, (d - 1.5) / 5));
  const far = Math.min(1, Math.max(0, (320 - d) / 170));
  return near * near * (3 - 2 * near) * far;
}

/* ---------- the Journey: the categories one after another ---------- */

export function phaseAt(t: number): { index: number; u: number } {
  const w = wrap(t, TOTAL);
  const index = Math.min(PHASES.length - 1, Math.floor(w / LOOP));
  return { index, u: (w - index * LOOP) / LOOP };
}

const smooth = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};
const lerp3 = (a: Vec3, b: Vec3, w: number): Vec3 => [
  lerp(a[0], b[0], w),
  lerp(a[1], b[1], w),
  lerp(a[2], b[2], w),
];

/** Grain p in the Journey at time t: the category showing, gliding into the next at its end. */
export function particleAt(p: Particle, time: number): { pos: Vec3; rgb: RGB } {
  const { index, u } = phaseAt(time);
  const s = u * LOOP;
  const a = pieceAt(p, index, s);
  const w = smooth((u - 0.85 + 0.08 * p.stagger) / 0.12);
  if (w <= 0) return a;
  const b = pieceAt(p, (index + 1) % PHASES.length, 0);
  return { pos: lerp3(a.pos, b.pos, w), rgb: mix(a.rgb, b.rgb, w) };
}

export function camera(time: number): Eye {
  const { index, u } = phaseAt(time);
  const a = pieceCamera(index, u * LOOP);
  const w = smooth((u - 0.85) / 0.15);
  if (w <= 0) return a;
  const b = pieceCamera((index + 1) % PHASES.length, 0);
  return { eye: lerp3(a.eye, b.eye, w), target: lerp3(a.target, b.target, w) };
}

export const look = () => ({ glow: 1, size: 0.85 });
