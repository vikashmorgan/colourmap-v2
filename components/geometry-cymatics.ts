/**
 * Magnetic Sands 1–4 — cymatics. Sand on a vibrating plate is shaken where
 * the plate moves and comes to rest on its still (nodal) lines, so it draws
 * the standing wave. The wave slowly changes mode and the sand flows to the
 * new figure: a smooth, endless loop.
 *
 *   cymatics1  circle plate, 2D, pattern turning
 *   cymatics2  square Chladni plate inside a circle, pattern turning
 *   cymatics3  circle plate in 3D: tilting, precessing, loose sand lifted
 *   cymatics4  sphere (spherical harmonics), rotating in 3D
 *
 * Math: lib/cymatics.ts. Spec: docs/specs/math-tunnels-and-liquid-visuals.md
 */

import * as THREE from 'three';

import {
  besselJ,
  CIRCLE_PATTERNS,
  type CirclePattern,
  chladniSquare,
  maxAbs,
  patternBlend,
  SPHERE_PATTERNS,
  SQUARE_PATTERNS,
  sphereMode,
} from '@/lib/cymatics';
import { advancePhase, type PaletteSource, type Rgb, shiftHue } from '@/lib/visual-math';

export const CYMATIC_MODES = ['cymatics1', 'cymatics2', 'cymatics3', 'cymatics4'] as const;
type CymaticMode = (typeof CYMATIC_MODES)[number];

export function isCymaticsMode(mode: string): boolean {
  return (CYMATIC_MODES as readonly string[]).includes(mode);
}

export interface CymaticsCfg {
  mode: string;
  complexity: number;
  glow: number;
  breathSpeed: number;
  intensity: number;
  particles: number;
  luminous: number;
}

const MAX_SAND = 7000;
const HOLD = 3.2;
const BLEND = 1.6;
const EPS = 0.004;
const TABLE = 512;

/* ── Wave fields (unit plate / unit sphere) ─────────────────── */

// J_n(α·r) tables, normalised to ±1, built once per pattern.
const circleTables = new Map<string, Float32Array>();
function circleTable(p: CirclePattern, scale: number): Float32Array {
  const key = `${p.n}-${p.alpha}-${scale.toFixed(2)}`;
  let tab = circleTables.get(key);
  if (!tab) {
    const a = p.alpha * scale;
    const raw = new Float32Array(TABLE + 1);
    for (let i = 0; i <= TABLE; i++) raw[i] = besselJ(p.n, (a * 1.1 * i) / TABLE);
    // Normalise by the outer half so the centre peak doesn't wash out the rings.
    const norm = maxAbs(TABLE / 2, (i) => raw[TABLE / 2 + i]);
    for (let i = 0; i <= TABLE; i++) raw[i] = Math.max(-1.6, Math.min(1.6, raw[i] / norm));
    tab = raw;
    circleTables.set(key, tab);
  }
  return tab;
}

function sampleTable(tab: Float32Array, r: number): number {
  const f = Math.min(TABLE, (r / 1.1) * TABLE);
  const i = Math.min(TABLE - 1, Math.floor(f));
  const k = f - i;
  return tab[i] * (1 - k) + tab[i + 1] * k;
}

const sphereNorms = new Map<string, number>();
function sphereNorm(l: number, m: number): number {
  const key = `${l}-${m}`;
  let n = sphereNorms.get(key);
  if (n === undefined) {
    n = maxAbs(400, (i) => sphereMode((i / 399) * Math.PI, 0, l, m));
    sphereNorms.set(key, n);
  }
  return n;
}

interface FieldState {
  mode: CymaticMode;
  from: number;
  to: number;
  mix: number;
  rot: number;
  freq: number;
}

function field(s: FieldState, x: number, y: number, z: number): number {
  if (s.mode === 'cymatics4') {
    const len = Math.hypot(x, y, z) || 1;
    const theta = Math.acos(Math.max(-1, Math.min(1, z / len)));
    const phi = Math.atan2(y, x) - s.rot;
    const a = SPHERE_PATTERNS[s.from];
    const b = SPHERE_PATTERNS[s.to];
    const fa = sphereMode(theta, phi, a.l, a.m) / sphereNorm(a.l, a.m);
    if (s.mix === 0) return fa;
    const fb = sphereMode(theta, phi, b.l, b.m) / sphereNorm(b.l, b.m);
    return fa * (1 - s.mix) + fb * s.mix;
  }
  const c = Math.cos(s.rot);
  const sn = Math.sin(s.rot);
  const xr = x * c - y * sn;
  const yr = x * sn + y * c;
  if (s.mode === 'cymatics2') {
    const a = SQUARE_PATTERNS[s.from];
    const b = SQUARE_PATTERNS[s.to];
    const k = s.freq * 0.72;
    const fa = chladniSquare(xr * k, yr * k, a.n, a.m);
    if (s.mix === 0) return fa;
    return fa * (1 - s.mix) + chladniSquare(xr * k, yr * k, b.n, b.m) * s.mix;
  }
  const r = Math.hypot(xr, yr);
  const th = Math.atan2(yr, xr);
  const a = CIRCLE_PATTERNS[s.from];
  const b = CIRCLE_PATTERNS[s.to];
  const fa = sampleTable(circleTable(a, s.freq), r) * Math.cos(a.n * th);
  if (s.mix === 0) return fa;
  const fb = sampleTable(circleTable(b, s.freq), r) * Math.cos(b.n * th);
  return fa * (1 - s.mix) + fb * s.mix;
}

/* ── Sand ───────────────────────────────────────────────────── */

interface Sand {
  p: Float32Array; // unit-space positions
  v: Float32Array; // velocities
  clock: { phase: number; last: number | null };
}

function seedSand(mode: CymaticMode): Sand {
  const p = new Float32Array(MAX_SAND * 3);
  for (let i = 0; i < MAX_SAND; i++) {
    if (mode === 'cymatics4') {
      const z = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - z * z);
      p[i * 3] = Math.cos(a) * s;
      p[i * 3 + 1] = Math.sin(a) * s;
      p[i * 3 + 2] = z;
    } else {
      const r = Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;
      p[i * 3] = Math.cos(a) * r;
      p[i * 3 + 1] = Math.sin(a) * r;
    }
  }
  return { p, v: new Float32Array(MAX_SAND * 3), clock: { phase: 0, last: null } };
}

/**
 * One step of sand physics: pulled down the slope of A² toward still lines,
 * shaken in proportion to how much the plate moves under it, damped.
 * Exported for tests.
 */
export function stepSand(
  sand: { p: Float32Array; v: Float32Array },
  count: number,
  s: FieldState,
  rand: () => number = Math.random,
): void {
  const { p, v } = sand;
  const sphere = s.mode === 'cymatics4';
  const PULL = 0.00011;
  const SHAKE = 0.0032;
  const DAMP = 0.78;
  for (let i = 0; i < count; i++) {
    const j = i * 3;
    const x = p[j];
    const y = p[j + 1];
    const z = p[j + 2];
    const a = field(s, x, y, z);
    const gx = (field(s, x + EPS, y, z) - field(s, x - EPS, y, z)) / (2 * EPS);
    const gy = (field(s, x, y + EPS, z) - field(s, x, y - EPS, z)) / (2 * EPS);
    const gz = sphere ? (field(s, x, y, z + EPS) - field(s, x, y, z - EPS)) / (2 * EPS) : 0;
    const shake = Math.abs(a) * SHAKE;
    let vx = v[j] * DAMP - PULL * 2 * a * gx + shake * (rand() - 0.5);
    let vy = v[j + 1] * DAMP - PULL * 2 * a * gy + shake * (rand() - 0.5);
    let vz = sphere ? v[j + 2] * DAMP - PULL * 2 * a * gz + shake * (rand() - 0.5) : 0;
    let nx = x + vx;
    let ny = y + vy;
    let nz = z + vz;
    if (sphere) {
      // Stay on the sphere and keep only tangential motion.
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const dot = vx * nx + vy * ny + vz * nz;
      vx -= dot * nx;
      vy -= dot * ny;
      vz -= dot * nz;
    } else {
      const r = Math.hypot(nx, ny);
      if (r > 1) {
        // The rim: sand slides back onto the plate.
        nx /= r;
        ny /= r;
        vx *= -0.3;
        vy *= -0.3;
      }
    }
    p[j] = nx;
    p[j + 1] = ny;
    p[j + 2] = nz;
    v[j] = vx;
    v[j + 1] = vy;
    v[j + 2] = vz;
  }
}

/* ── Rendering ──────────────────────────────────────────────── */

const SAND_VERTEX = /* glsl */ `
attribute vec3 aColor;
uniform float uSize;
varying vec3 vColor;
void main() {
  vColor = aColor;
  gl_PointSize = uSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SAND_FRAGMENT = /* glsl */ `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d);
  gl_FragColor = vec4(vColor * a, a);
}
`;

function devicePixels(): number {
  return typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
}

export function buildCymatics(cfg: CymaticsCfg): THREE.Group {
  const mode = cfg.mode as CymaticMode;
  const group = new THREE.Group();
  const geo = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(new Float32Array(MAX_SAND * 3), 3);
  const col = new THREE.BufferAttribute(new Float32Array(MAX_SAND * 3), 3);
  pos.setUsage(THREE.DynamicDrawUsage);
  col.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', pos);
  geo.setAttribute('aColor', col);
  const mat = new THREE.ShaderMaterial({
    vertexShader: SAND_VERTEX,
    fragmentShader: SAND_FRAGMENT,
    uniforms: { uSize: { value: 2 } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.userData.tag = 'cymaticSand';
  group.add(points);
  group.userData.sand = sandFor(mode);
  return group;
}

// Sand survives rebuilds (slider steps, journeys), so it never re-scatters.
const sands = new Map<CymaticMode, Sand>();
function sandFor(mode: CymaticMode): Sand {
  let s = sands.get(mode);
  if (!s) {
    s = seedSand(mode);
    sands.set(mode, s);
  }
  return s;
}

export function sandCount(particles: number): number {
  return Math.min(MAX_SAND, Math.round(1500 + Math.max(0, particles) * 550));
}

export function updateCymatics(
  group: THREE.Group,
  cfg: CymaticsCfg,
  pal: PaletteSource,
  t: number,
  R: number,
): void {
  const mode = cfg.mode as CymaticMode;
  const sand = group.userData.sand as Sand;
  const last = sand.clock.last;
  const phase = advancePhase(sand.clock, t, cfg.breathSpeed);
  const dt = last === null ? 16 : Math.min(50, Math.max(0, t - last));
  const count = sandCount(cfg.particles);
  const patterns =
    mode === 'cymatics2'
      ? SQUARE_PATTERNS.length
      : mode === 'cymatics4'
        ? SPHERE_PATTERNS.length
        : CIRCLE_PATTERNS.length;
  const { from, to, mix } = patternBlend(phase, patterns, HOLD, BLEND);
  const state: FieldState = {
    mode,
    from,
    to,
    mix,
    rot: phase * (mode === 'cymatics4' ? 0.05 : 0.07),
    freq: 0.6 + (Math.max(1, Math.min(10, cfg.complexity)) / 10) * 0.7,
  };

  const steps = Math.max(1, Math.min(3, Math.round(dt / 16.7)));
  if (dt > 0) for (let k = 0; k < steps; k++) stepSand(sand, count, state);

  const points = group.children[0] as THREE.Points;
  const geo = points.geometry;
  const out = geo.getAttribute('position').array as Float32Array;
  const col = geo.getAttribute('aColor').array as Float32Array;
  const light = (cfg.intensity / 10) * 1.6;
  const main: Rgb = [pal.rgb[0] / 255, pal.rgb[1] / 255, pal.rgb[2] / 255];
  const edge = shiftHue(main, (cfg.glow / 10) * 0.5);
  const scale = mode === 'cymatics4' ? R * 0.82 : R * 0.95;
  const lift = mode === 'cymatics3' ? R * 0.28 * (0.65 + 0.35 * Math.sin(phase * 1.3)) : 0;

  for (let i = 0; i < count; i++) {
    const j = i * 3;
    const x = sand.p[j];
    const y = sand.p[j + 1];
    const z = sand.p[j + 2];
    const a = field(state, x, y, z);
    // Sand at rest on a still line glows; sand still being shaken is dim.
    const rest = 1 - Math.min(1, Math.abs(a) * 2.6);
    const b = light * (0.18 + 0.82 * rest * rest);
    const k = mode === 'cymatics4' ? (z + 1) / 2 : Math.min(1, Math.hypot(x, y));
    col[j] = (main[0] * (1 - k) + edge[0] * k) * b;
    col[j + 1] = (main[1] * (1 - k) + edge[1] * k) * b;
    col[j + 2] = (main[2] * (1 - k) + edge[2] * k) * b;
    out[j] = x * scale;
    out[j + 1] = y * scale;
    out[j + 2] = mode === 'cymatics4' ? z * scale : a * lift;
  }
  geo.setDrawRange(0, count);
  geo.getAttribute('position').needsUpdate = true;
  geo.getAttribute('aColor').needsUpdate = true;
  (points.material as THREE.ShaderMaterial).uniforms.uSize.value =
    (1.4 + cfg.luminous * 0.25) * devicePixels();

  // 2D and 3D rotations: the plates turn, the 3D plate tilts and precesses,
  // the sphere spins on a slowly nodding axis.
  if (mode === 'cymatics3') {
    group.rotation.set(
      -0.95 + 0.22 * Math.sin(phase * 0.11),
      0.28 * Math.sin(phase * 0.07),
      phase * 0.05,
    );
  } else if (mode === 'cymatics4') {
    group.rotation.set(0.45 * Math.sin(phase * 0.09), phase * 0.12, 0.2 * Math.sin(phase * 0.05));
  } else {
    group.rotation.set(0, 0, mode === 'cymatics2' ? -phase * 0.03 : 0);
  }
}
