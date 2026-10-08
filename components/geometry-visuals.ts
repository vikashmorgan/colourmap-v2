/**
 * Tunnels and Oils — two Geometry Field families built from math series.
 * Spec: docs/specs/math-tunnels-and-liquid-visuals.md
 *
 * - Line tunnels (drostezoom, twistgate, fouriertube, superrings) and the
 *   point tunnel (goldenseed): one draw call each, per-vertex colour carries
 *   the soft dive-in fade so bloom fades with it.
 * - Shader visuals (shader tunnels + oils): one full-screen quad running a
 *   fragment shader from lib/visual-shaders.ts.
 *
 * The camera is orthographic in pixels, centred; R is the field radius.
 */

import * as THREE from 'three';

import {
  advancePhase,
  flightOffset,
  fourierRadius,
  GOLDEN_ANGLE,
  goldenHue,
  oilPaletteStops,
  type PaletteSource,
  polygonRadius,
  type Rgb,
  recycledDepth,
  shiftHue,
  smoothstepEdge,
  superformula,
  tunnelFade,
} from '@/lib/visual-math';
import {
  isShaderVisualMode,
  SHADER_FRAGMENTS,
  SHADER_VERTEX,
  type ShaderVisualMode,
} from '@/lib/visual-shaders';

export interface VisualCfg {
  mode: string;
  symmetry: number;
  complexity: number;
  glow: number;
  breathSpeed: number;
  intensity: number;
  particles: number;
  /** Design seed for generated visuals (the Thangka). */
  seed?: number;
}

const LINE_TUNNELS = ['drostezoom', 'twistgate', 'fouriertube', 'superrings'] as const;
type LineTunnel = (typeof LINE_TUNNELS)[number];

export const TUNNEL_MODES = [...LINE_TUNNELS, 'goldenseed', 'shadertunnel', 'logspiral'] as const;

export function isGeometryVisualMode(mode: string): boolean {
  return (
    (LINE_TUNNELS as readonly string[]).includes(mode) ||
    mode === 'goldenseed' ||
    isShaderVisualMode(mode)
  );
}

/* ── Shared ─────────────────────────────────────────────────── */

const TAU = Math.PI * 2;
const RING_COUNT = 40;
const NEAR = 0.3;
const SPACING = 0.32;
const FOCAL = 0.55;
const DROSTE_MAX_RINGS = 46;
const SEED_COUNT = 2600;
const SEED_DEPTH = 40;
// Quad half-size in R units: covers ultra-wide screens (fragments outside
// the viewport cost nothing).
const SHADER_SPAN = 12;

// Per-mode phase clocks survive rebuilds (a journey easing complexity
// rebuilds the group at each integer step) so motion never resets.
const clocks = new Map<string, { phase: number; last: number | null }>();

function phaseFor(mode: string, t: number, speed: number): number {
  let clock = clocks.get(mode);
  if (!clock) {
    clock = { phase: 0, last: null };
    clocks.set(mode, clock);
  }
  return advancePhase(clock, t, speed);
}

function mainRgb(pal: PaletteSource): Rgb {
  return [pal.rgb[0] / 255, pal.rgb[1] / 255, pal.rgb[2] / 255];
}

/** Ring colour: the palette hue walked along the golden sequence. */
function ringRgb(pal: PaletteSource, id: number, rainbow: number, light: number): Rgb {
  const [r, g, b] = shiftHue(mainRgb(pal), (goldenHue(id) - 0.5) * rainbow);
  return [r * light, g * light, b * light];
}

function lineSegmentsFor(maxVerts: number): THREE.LineSegments {
  const geo = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(new Float32Array(maxVerts * 3), 3);
  const col = new THREE.BufferAttribute(new Float32Array(maxVerts * 3), 3);
  pos.setUsage(THREE.DynamicDrawUsage);
  col.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', pos);
  geo.setAttribute('color', col);
  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  return lines;
}

/** Writes line vertices + colours, then trims the draw range. */
class LineWriter {
  private n = 0;
  constructor(
    private pos: Float32Array,
    private col: Float32Array,
  ) {}
  seg(x0: number, y0: number, x1: number, y1: number, c: Rgb, f0: number, f1: number) {
    if (f0 < 0.002 && f1 < 0.002) return;
    const cap = this.pos.length / 3;
    if (this.n + 2 > cap) return;
    let i = this.n * 3;
    this.pos[i] = x0;
    this.pos[i + 1] = y0;
    this.pos[i + 2] = 0;
    this.col[i] = c[0] * f0;
    this.col[i + 1] = c[1] * f0;
    this.col[i + 2] = c[2] * f0;
    i += 3;
    this.pos[i] = x1;
    this.pos[i + 1] = y1;
    this.pos[i + 2] = 0;
    this.col[i] = c[0] * f1;
    this.col[i + 1] = c[1] * f1;
    this.col[i + 2] = c[2] * f1;
    this.n += 2;
  }
  finish(lines: THREE.LineSegments) {
    const geo = lines.geometry;
    geo.setDrawRange(0, this.n);
    geo.getAttribute('position').needsUpdate = true;
    geo.getAttribute('color').needsUpdate = true;
  }
}

function writerFor(lines: THREE.LineSegments): LineWriter {
  const geo = lines.geometry;
  return new LineWriter(
    geo.getAttribute('position').array as Float32Array,
    geo.getAttribute('color').array as Float32Array,
  );
}

function sidesOf(cfg: VisualCfg): number {
  return Math.max(3, Math.min(24, Math.round(cfg.symmetry)));
}

function segmentsFor(mode: LineTunnel, cfg: VisualCfg): number {
  if (mode === 'twistgate' || mode === 'drostezoom') return sidesOf(cfg) * 6;
  return 128;
}

/* ── Perspective ring tunnels ───────────────────────────────── */

function buildRingTunnel(mode: LineTunnel, cfg: VisualCfg): THREE.Group {
  const group = new THREE.Group();
  const seg = segmentsFor(mode, cfg);
  const rings = mode === 'drostezoom' ? DROSTE_MAX_RINGS : RING_COUNT;
  const spokes = sidesOf(cfg);
  const lines = lineSegmentsFor(rings * seg * 2 + rings * spokes * 2);
  lines.userData.tag = 'visualLines';
  group.add(lines);
  group.userData.ringPts = new Float32Array(rings * (seg + 1) * 3);
  return group;
}

function ringShape(
  mode: LineTunnel,
  theta: number,
  z: number,
  phase: number,
  cfg: VisualCfg,
): number {
  switch (mode) {
    case 'twistgate':
    case 'drostezoom':
      return polygonRadius(theta, sidesOf(cfg));
    case 'fouriertube':
      return fourierRadius(theta, z, phase, 0.04 + cfg.complexity * 0.035);
    default: {
      // superrings: spiky stars far away, soft polygons up close.
      const freq = 0.12 + cfg.complexity * 0.035;
      const morph = 0.5 + 0.5 * Math.sin(z * freq * 2.4 - phase * 0.6);
      const n1 = 0.35 + morph * 8;
      const n23 = 1.2 + morph * 7;
      return superformula(theta, sidesOf(cfg), n1, n23, n23);
    }
  }
}

function updateRingTunnel(
  group: THREE.Group,
  mode: LineTunnel,
  cfg: VisualCfg,
  pal: PaletteSource,
  t: number,
  R: number,
): void {
  const lines = group.children[0] as THREE.LineSegments;
  const pts = group.userData.ringPts as Float32Array;
  const phase = phaseFor(mode, t, cfg.breathSpeed);
  const seg = segmentsFor(mode, cfg);
  const sides = sidesOf(cfg);
  const rainbow = cfg.glow / 10;
  const light = (cfg.intensity / 10) * 2.2;
  const w = writerFor(lines);

  if (mode === 'drostezoom') {
    updateDroste(w, pts, cfg, pal, phase, R, seg, sides, rainbow, light);
    w.finish(lines);
    return;
  }

  const travel = phase * 3;
  const spin = phase * 0.25;
  const curve = (cfg.particles / 10) * 1.1;
  const twist = mode === 'fouriertube' ? 0 : 0.02 + (cfg.complexity / 10) * 0.3;
  const fades = new Float32Array(RING_COUNT * (seg + 1));
  const depths = new Float32Array(RING_COUNT);

  // Superformula rings vary in size; normalise each to radius 1.
  const shapes = new Float32Array(seg + 1);
  for (let k = 0; k < RING_COUNT; k++) {
    const z = recycledDepth(k, travel, RING_COUNT);
    depths[k] = z;
    const scale = (R * FOCAL) / (NEAR + z * SPACING);
    const [ox, oy] = flightOffset(z, travel, curve);
    const rot = k * twist + spin * (mode === 'fouriertube' ? 0.3 : 1);
    let maxR = 0;
    for (let s = 0; s <= seg; s++) {
      const r = ringShape(mode, (s / seg) * TAU, z, phase, cfg);
      shapes[s] = r;
      if (r > maxR) maxR = r;
    }
    const norm = mode === 'superrings' && maxR > 0 ? 1 / maxR : 1;
    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * TAU + rot;
      const r = shapes[s] * norm;
      const x = (ox + Math.cos(a) * r) * scale;
      const y = (oy + Math.sin(a) * r) * scale;
      const idx = (k * (seg + 1) + s) * 3;
      pts[idx] = x;
      pts[idx + 1] = y;
      fades[k * (seg + 1) + s] = tunnelFade(z, RING_COUNT, Math.hypot(x, y) / R);
    }
  }

  for (let k = 0; k < RING_COUNT; k++) {
    const c = ringRgb(pal, k, rainbow, light);
    const base = k * (seg + 1);
    for (let s = 0; s < seg; s++) {
      const i0 = (base + s) * 3;
      const i1 = (base + s + 1) * 3;
      w.seg(pts[i0], pts[i0 + 1], pts[i1], pts[i1 + 1], c, fades[base + s], fades[base + s + 1]);
    }
    // Spokes run to the next ring in depth (skip the wrap seam).
    const next = (k + 1) % RING_COUNT;
    if (depths[next] < depths[k]) continue;
    const dim: Rgb = [c[0] * 0.5, c[1] * 0.5, c[2] * 0.5];
    const nBase = next * (seg + 1);
    for (let j = 0; j < sides; j++) {
      const s = Math.round((j / sides) * seg);
      const i0 = (base + s) * 3;
      const i1 = (nBase + s) * 3;
      w.seg(pts[i0], pts[i0 + 1], pts[i1], pts[i1 + 1], dim, fades[base + s], fades[nBase + s]);
    }
  }
  w.finish(lines);
}

/* ── Geometric zoom (Droste): r_k = r0 · b^(k + s) ──────────── */

function drosteBase(complexity: number): number {
  return 1.6 - (Math.max(1, Math.min(10, complexity)) / 10) * 0.46;
}

function updateDroste(
  w: LineWriter,
  pts: Float32Array,
  cfg: VisualCfg,
  pal: PaletteSource,
  phase: number,
  R: number,
  seg: number,
  sides: number,
  rainbow: number,
  light: number,
): void {
  const b = drosteBase(cfg.complexity);
  const r0 = 0.012;
  const rings = Math.min(DROSTE_MAX_RINGS, Math.ceil(Math.log(1.4 / r0) / Math.log(b)) + 1);
  const u = phase * 0.6;
  const s = u - Math.floor(u);
  const twist = (cfg.particles / 10) * (TAU / sides);
  const fades = new Float32Array(rings * (seg + 1));

  for (let k = 0; k < rings; k++) {
    const pos = k + s;
    const rNorm = r0 * b ** pos;
    const rot = pos * twist + phase * 0.05;
    const fade = smoothstepEdge(0, 0.07, rNorm) * (1 - smoothstepEdge(0.72, 1.15, rNorm));
    for (let q = 0; q <= seg; q++) {
      const th = (q / seg) * TAU;
      const r = polygonRadius(th, sides) * rNorm * R;
      const idx = (k * (seg + 1) + q) * 3;
      pts[idx] = Math.cos(th + rot) * r;
      pts[idx + 1] = Math.sin(th + rot) * r;
      fades[k * (seg + 1) + q] = fade;
    }
  }

  const step = seg / sides;
  for (let k = 0; k < rings; k++) {
    // Colour travels with the ring through the seamless wrap.
    const c = ringRgb(pal, k - Math.floor(u), rainbow, light);
    const base = k * (seg + 1);
    for (let q = 0; q < seg; q++) {
      const i0 = (base + q) * 3;
      const i1 = (base + q + 1) * 3;
      w.seg(pts[i0], pts[i0 + 1], pts[i1], pts[i1 + 1], c, fades[base + q], fades[base + q + 1]);
    }
    if (k + 1 >= rings) continue;
    // Struts corner-to-corner into the next ring: the spiral web.
    const nBase = (k + 1) * (seg + 1);
    const dim: Rgb = [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55];
    for (let j = 0; j < sides; j++) {
      const q = Math.round(j * step);
      const i0 = (base + q) * 3;
      const i1 = (nBase + q) * 3;
      w.seg(pts[i0], pts[i0 + 1], pts[i1], pts[i1 + 1], dim, fades[base + q], fades[nBase + q]);
    }
  }
}

/* ── Golden seed point tunnel (phyllotaxis in depth) ────────── */

const SEED_VERTEX = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
varying vec3 vColor;
void main() {
  vColor = aColor;
  gl_PointSize = aSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SEED_FRAGMENT = /* glsl */ `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor * a, a);
}
`;

function devicePixels(): number {
  return typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
}

function buildGoldenSeed(): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.BufferGeometry();
  const attr = (n: number) => {
    const a = new THREE.BufferAttribute(new Float32Array(SEED_COUNT * n), n);
    a.setUsage(THREE.DynamicDrawUsage);
    return a;
  };
  geo.setAttribute('position', attr(3));
  geo.setAttribute('aColor', attr(3));
  geo.setAttribute('aSize', attr(1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: SEED_VERTEX,
    fragmentShader: SEED_FRAGMENT,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.userData.tag = 'visualSeeds';
  group.add(points);
  return group;
}

function updateGoldenSeed(
  group: THREE.Group,
  cfg: VisualCfg,
  pal: PaletteSource,
  t: number,
  R: number,
): void {
  const points = group.children[0] as THREE.Points;
  const geo = points.geometry;
  const pos = geo.getAttribute('position').array as Float32Array;
  const col = geo.getAttribute('aColor').array as Float32Array;
  const size = geo.getAttribute('aSize').array as Float32Array;
  const phase = phaseFor('goldenseed', t, cfg.breathSpeed);
  const travel = phase * 3;
  const spin = phase * 0.12;
  const curve = (cfg.particles / 10) * 1.1;
  const arms = sidesOf(cfg);
  const rainbow = cfg.glow / 10;
  const light = (cfg.intensity / 10) * 2.4;
  const px = devicePixels();
  // Complexity tightens the winding: more seeds per turn of depth.
  const perDepth = SEED_COUNT / SEED_DEPTH;
  const wind = 0.6 + cfg.complexity * 0.08;

  for (let i = 0; i < SEED_COUNT; i++) {
    const z = recycledDepth(i / perDepth, travel, SEED_DEPTH);
    const d = NEAR + z * SPACING;
    const scale = (R * FOCAL) / d;
    const [ox, oy] = flightOffset(z, travel, curve);
    const a = i * GOLDEN_ANGLE * wind + spin;
    const x = (ox + Math.cos(a)) * scale;
    const y = (oy + Math.sin(a)) * scale;
    const fade = tunnelFade(z, SEED_DEPTH, Math.hypot(x, y) / R);
    const c = ringRgb(pal, i % arms, rainbow, light * fade);
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = 0;
    col[i * 3] = c[0];
    col[i * 3 + 1] = c[1];
    col[i * 3 + 2] = c[2];
    size[i] = Math.min(16, Math.max(1.2, (FOCAL / d) * 7)) * px;
  }
  geo.getAttribute('position').needsUpdate = true;
  geo.getAttribute('aColor').needsUpdate = true;
  geo.getAttribute('aSize').needsUpdate = true;
}

/* ── Full-screen shader quad (shader tunnels + oils) ────────── */

function linear([r, g, b]: Rgb): THREE.Color {
  return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
}

function buildShaderQuad(mode: ShaderVisualMode, pal: PaletteSource): THREE.Group {
  const group = new THREE.Group();
  const [c0, c1, c2, c3] = oilPaletteStops(pal);
  const mat = new THREE.ShaderMaterial({
    vertexShader: SHADER_VERTEX,
    fragmentShader: SHADER_FRAGMENTS[mode],
    uniforms: {
      uSpan: { value: SHADER_SPAN },
      uTime: { value: 0 },
      uScale: { value: 1 },
      uSym: { value: 6 },
      uLayers: { value: 5 },
      uRainbow: { value: 0 },
      uSwirl: { value: 0.5 },
      uBright: { value: 0.7 },
      uSeed: { value: 1 },
      uC0: { value: linear(c0) },
      uC1: { value: linear(c1) },
      uC2: { value: linear(c2) },
      uC3: { value: linear(c3) },
    },
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  // Draw first so stars and other layers sit on top of the colour field.
  quad.renderOrder = -10;
  quad.userData.tag = 'visualShader';
  group.add(quad);
  return group;
}

/** Slider → uniform mapping, shared by build tests and the frame update. */
export function shaderUniformValues(cfg: VisualCfg) {
  return {
    uScale: 0.4 + Math.max(1, cfg.symmetry) * 0.25,
    uSym: Math.max(1, Math.round(cfg.symmetry)),
    uLayers: cfg.complexity,
    uRainbow: Math.min(1, Math.max(0, cfg.glow / 10)),
    uSwirl: Math.min(1, Math.max(0, cfg.particles / 10)),
    uBright: Math.min(1, Math.max(0, cfg.intensity / 10)),
    uSeed: cfg.seed ?? 1,
  };
}

function updateShaderQuad(group: THREE.Group, cfg: VisualCfg, t: number, R: number): void {
  const quad = group.children[0] as THREE.Mesh;
  quad.scale.set(R * SHADER_SPAN, R * SHADER_SPAN, 1);
  const u = (quad.material as THREE.ShaderMaterial).uniforms;
  u.uTime.value = phaseFor(cfg.mode, t, cfg.breathSpeed);
  for (const [name, value] of Object.entries(shaderUniformValues(cfg))) {
    u[name].value = value;
  }
}

/* ── Entry points ───────────────────────────────────────────── */

export function buildGeometryVisual(cfg: VisualCfg, pal: PaletteSource): THREE.Group {
  if (isShaderVisualMode(cfg.mode)) return buildShaderQuad(cfg.mode, pal);
  if (cfg.mode === 'goldenseed') return buildGoldenSeed();
  return buildRingTunnel(cfg.mode as LineTunnel, cfg);
}

export function updateGeometryVisual(
  group: THREE.Group,
  cfg: VisualCfg,
  pal: PaletteSource,
  t: number,
  R: number,
): void {
  if (isShaderVisualMode(cfg.mode)) updateShaderQuad(group, cfg, t, R);
  else if (cfg.mode === 'goldenseed') updateGoldenSeed(group, cfg, pal, t, R);
  else updateRingTunnel(group, cfg.mode as LineTunnel, cfg, pal, t, R);
}
