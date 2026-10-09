/**
 * Big Bang moments as Stars presets. Five steps of the Big Bang trip
 * (lib/bigbang.ts) that stand on their own, drawn with the trip's own maths,
 * camera and colours, looping forever:
 *
 *   bbpulse    the fractal sand, pulsing; Folds sets its symmetry
 *   bbtunnel   the golden prism tunnel, fading softly as prisms pass and at the
 *              edges instead of vanishing in a block
 *   bbflower   the rose of the growing-symmetry step, with a fixed petal count
 *   bbocean    the ocean of life, fully formed (no opening phase)
 *   bbfractal  the Sierpinski fractal breaking into the pulse sand and back
 *
 * Every one has a Timer: off at its lowest, or every 10–30 seconds the whole
 * shape explodes outward and gathers itself back together.
 */

import * as THREE from 'three';

import {
  colour,
  fractalSand,
  makeParticles,
  type Particle,
  PHASES,
  prismPoint,
  type RGB,
  rose,
  smooth,
  swimmerPoint,
  target,
  triangle,
  type Vec3,
} from '@/lib/bigbang';
import { advancePhase } from '@/lib/visual-math';

export const BIG_BANG_STAR_MODES = [
  'bbpulse',
  'bbtunnel',
  'bbflower',
  'bbocean',
  'bbfractal',
] as const;
type BigBangStarMode = (typeof BIG_BANG_STAR_MODES)[number];

export function isBigBangStarMode(mode: string): boolean {
  return (BIG_BANG_STAR_MODES as readonly string[]).includes(mode);
}

export interface BigBangStarCfg {
  mode: string;
  symmetry: number;
  /** The Timer, in seconds; below TIMER_OFF it is off. */
  complexity: number;
  breathSpeed: number;
  intensity: number;
  particles: number;
  luminous: number;
}

const MAX_DOTS = 9000;
const TAU = Math.PI * 2;
/** The trip's camera: perspective, 55° field, 58 units back. */
const CAMERA_Z = 58;
const TAN_HALF_FOV = Math.tan((55 / 2) * (Math.PI / 180));
/** Timer values at or below this are "off". */
export const TIMER_OFF = 9.5;
const EXPLODE_SECONDS = 6;

const phaseIndex = (id: string) => PHASES.findIndex((p) => p.id === id);
const FRACTAL = phaseIndex('fractal');
const PULSE = phaseIndex('pulse');
const GROWING = phaseIndex('growing');
const OCEAN = phaseIndex('ocean');
const TUNNEL = phaseIndex('tunnel');

const particles: Particle[] = makeParticles(MAX_DOTS);

export function dotCount(slider: number): number {
  return Math.min(MAX_DOTS, Math.round(2000 + Math.max(0, slider) * 700));
}

/**
 * How far particle p is blown out at second s of a Timer of `timer` seconds:
 * 0 while the shape holds, then out and back over EXPLODE_SECONDS, each grain
 * leaving and returning at its own golden-ratio moment. 0 when the timer is off.
 */
export function explosion(p: Particle, s: number, timer: number): number {
  if (timer <= TIMER_OFF) return 0;
  const cycle = timer + EXPLODE_SECONDS;
  const local = ((s % cycle) + cycle) % cycle;
  if (local < timer) return 0;
  const x = (local - timer) / EXPLODE_SECONDS;
  const out = smooth((x - 0.08 * p.stagger) / 0.28);
  const back = 1 - smooth((x - 0.42 - 0.25 * p.stagger) / 0.33);
  return Math.min(out, back);
}

/** Fractal Break: hold the fractal, break into sand, hold the sand, gather back. */
export function breakAmount(p: Particle, s: number): number {
  const HOLD = 10;
  const MOVE = 7;
  const cycle = 2 * (HOLD + MOVE);
  const local = ((s % cycle) + cycle) % cycle;
  if (local < HOLD) return 0;
  if (local < HOLD + MOVE) return smooth(((local - HOLD) / MOVE - 0.35 * p.stagger) / 0.65);
  if (local < 2 * HOLD + MOVE) return 1;
  return 1 - smooth(((local - 2 * HOLD - MOVE) / MOVE - 0.35 * p.stagger) / 0.65);
}

/** The tunnel with n prisms to a ring (the trip draws six). */
function tunnelPoint(p: Particle, t: number, n: number): Vec3 {
  const rings = 16;
  const ring = Math.floor(p.b * rings);
  const spacing = 22;
  const span = rings * spacing;
  const travel = (((ring * spacing - t * 9) % span) + span) % span;
  const z = 40 - travel;
  const q = Math.floor(p.a * n);
  const ang = (q * TAU) / n + z * 0.012 + 0.04 * t;
  const local = prismPoint(triangle(3.4, ang), 8, p);
  return [Math.cos(ang) * 13 + local[0], Math.sin(ang) * 13 + local[1], z + local[2] - 4];
}

const lerp3 = (a: Vec3, b: Vec3, w: number): Vec3 => [
  a[0] + (b[0] - a[0]) * w,
  a[1] + (b[1] - a[1]) * w,
  a[2] + (b[2] - a[2]) * w,
];
const mixRgb = (a: RGB, b: RGB, w: number): RGB => [
  a[0] + (b[0] - a[0]) * w,
  a[1] + (b[1] - a[1]) * w,
  a[2] + (b[2] - a[2]) * w,
];

/** Where particle p is, and its colour, for one mode at trip time t. */
export function shapeAt(
  mode: BigBangStarMode,
  p: Particle,
  t: number,
  symmetry: number,
): { pos: Vec3; rgb: RGB } {
  switch (mode) {
    case 'bbpulse': {
      const n = Math.max(3, Math.round(symmetry));
      return { pos: fractalSand(p, t, n, 1), rgb: colour(PULSE, p, 0.5, t) };
    }
    case 'bbtunnel': {
      const n = Math.max(3, Math.round(symmetry));
      return { pos: tunnelPoint(p, t, n), rgb: colour(TUNNEL, p, 0.5, t) };
    }
    case 'bbflower': {
      const n = Math.max(3, Math.round(symmetry));
      return { pos: rose(p, t, n), rgb: colour(GROWING, p, 0.4, t) };
    }
    case 'bbocean':
      // u = 1: the swimmers already fully formed, no opening phase.
      return { pos: swimmerPoint(p, 1, t), rgb: colour(OCEAN, p, 0.5, t) };
    default: {
      const w = breakAmount(p, t);
      const a = target(FRACTAL, p, 0.5, t);
      const b = fractalSand(p, t, Math.max(3, Math.round(symmetry)), 1);
      return {
        pos: lerp3(a, b, w),
        rgb: mixRgb(colour(FRACTAL, p, 0.5, t), colour(PULSE, p, 0.5, t), w),
      };
    }
  }
}

/* ── Rendering ─────────────────────────────────────────────── */

const DOT_VERTEX = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
varying vec3 vColor;
void main() {
  vColor = aColor;
  gl_PointSize = aSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DOT_FRAGMENT = /* glsl */ `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor * a, a);
}
`;

const clocks = new Map<string, { phase: number; last: number | null }>();

function devicePixels(): number {
  return typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
}

export function buildBigBangStars(): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.BufferGeometry();
  const attr = (n: number) => {
    const a = new THREE.BufferAttribute(new Float32Array(MAX_DOTS * n), n);
    a.setUsage(THREE.DynamicDrawUsage);
    return a;
  };
  geo.setAttribute('position', attr(3));
  geo.setAttribute('aColor', attr(3));
  geo.setAttribute('aSize', attr(1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: DOT_VERTEX,
    fragmentShader: DOT_FRAGMENT,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.userData.tag = 'bigBangStars';
  group.add(points);
  return group;
}

export function updateBigBangStars(
  group: THREE.Group,
  cfg: BigBangStarCfg,
  t: number,
  R: number,
): void {
  const mode = cfg.mode as BigBangStarMode;
  let clock = clocks.get(mode);
  if (!clock) {
    clock = { phase: 0, last: null };
    clocks.set(mode, clock);
  }
  // Trip seconds at the chosen speed; the Timer counts the same seconds.
  const s = advancePhase(clock, t, cfg.breathSpeed);
  const points = group.children[0] as THREE.Points;
  const geo = points.geometry;
  const pos = geo.getAttribute('position').array as Float32Array;
  const col = geo.getAttribute('aColor').array as Float32Array;
  const size = geo.getAttribute('aSize').array as Float32Array;
  const count = dotCount(cfg.particles);
  const light = (cfg.intensity / 10) * 1.1;
  const timer = cfg.complexity;
  // The trip's picture fills the screen height; R is 0.42 of the shorter side.
  const view = (R * 1.19) / TAN_HALF_FOV;
  const dot = 0.42 * view * (0.6 + cfg.luminous * 0.25) * devicePixels();

  for (let i = 0; i < count; i++) {
    const p = particles[i] as Particle;
    let { pos: v, rgb } = shapeAt(mode, p, s, cfg.symmetry);
    const e = explosion(p, s, timer);
    if (e > 0) {
      // Outward along the grain's own direction, brighter while it flies.
      const dz = p.c * 2 - 1;
      const dr = Math.sqrt(1 - dz * dz);
      const da = p.d * TAU;
      const len = 30 + 26 * p.b;
      v = lerp3(
        v,
        [v[0] + Math.cos(da) * dr * len, v[1] + Math.sin(da) * dr * len, v[2] + dz * len * 0.6],
        e,
      );
      rgb = mixRgb(rgb, [1.4, 1.25, 1.0], e * 0.5);
    }
    const depth = CAMERA_Z - v[2];
    const j = i * 3;
    if (depth < 4) {
      // Behind or right at the camera: hidden (it has already faded out).
      pos[j] = 1e6;
      pos[j + 1] = 1e6;
      pos[j + 2] = 0;
      col[j] = col[j + 1] = col[j + 2] = 0;
      size[i] = 0;
      continue;
    }
    const k = view / depth;
    const x = v[0] * k;
    const y = v[1] * k;
    // Soft everywhere: dots fade as they near the camera, far away, and at the
    // screen's edge, so nothing ever vanishes as a block.
    const near = smooth((depth - 6) / 16);
    const far = 1 - smooth((depth - 330) / 40);
    const rim = 1 - smooth((Math.hypot(x, y) / R - 1.05) / 0.45);
    const fade = near * far * rim * light;
    pos[j] = x;
    pos[j + 1] = y;
    pos[j + 2] = 0;
    col[j] = rgb[0] * fade;
    col[j + 1] = rgb[1] * fade;
    col[j + 2] = rgb[2] * fade;
    size[i] = Math.min(28, Math.max(1, dot / depth));
  }
  geo.setDrawRange(0, count);
  geo.getAttribute('position').needsUpdate = true;
  geo.getAttribute('aColor').needsUpdate = true;
  geo.getAttribute('aSize').needsUpdate = true;
}
