/**
 * Magma Cores: five ways of drawing a glowing core of magma, in the Art builder's Experiment tab.
 * Spec: docs/specs/geometry-field.md, "Magma Cores" (2026-11-16).
 *
 * One mode, `magma`; the Method slider (the builder's `particles`) picks the piece, as the Scene
 * slider does for Speed:
 *   0 Boiling Magma  thousands of small dots churning in convection cells, bubbles bursting
 *   1 Molten Core    a ray-marched shader sphere: domain-warped flow under cracking crust plates
 *   2 Cracked Crust  a charcoal shell broken by glowing Voronoi veins that widen and heal
 *   3 Magma Currents streamlines of a convection field on and inside the sphere
 *   4 Eruptive Core  a breathing core throwing loops and plumes that fall back, embers drifting out
 *
 * Every method draws one full-screen shader (lib/art/magma-shaders.ts) for the background, the halo
 * and the core; the dots, plumes and currents are one more layer each, made when first shown.
 *
 * Sliders: Method, Heat (intensity), Turbulence (glow), Detail (complexity), Speed (breathSpeed),
 * Bloom (luminous).
 */

import * as THREE from 'three';

import {
  BOIL,
  BUBBLES,
  boilCount,
  bubbleAt,
  type Clock,
  CORE,
  CURRENTS,
  clamp,
  ERUPTIVE,
  eruptCount,
  type Lines,
  LOOPS,
  lineCount,
  loopAt,
  makeBoilDots,
  makeEruption,
  makeLines,
  methodOf,
  pulseAt,
  SPIN_AXIS,
  SPIN_RATE,
  swellOf,
  tick,
  traceLines,
  VENTS,
  ventAt,
} from '@/lib/art/magma';
import {
  BOIL_VERTEX,
  ERUPT_VERTEX,
  LINE_FRAGMENT,
  LINE_VERTEX,
  MAGMA_FLOATS,
  MAGMA_VERTEX,
  magmaFragment,
  POINT_FRAGMENT,
} from '@/lib/art/magma-shaders';

export const MAGMA_MODE = 'magma';

export function isMagmaMode(mode: string): boolean {
  return mode === MAGMA_MODE;
}

export interface MagmaCfg {
  mode: string;
  particles: number;
  breathSpeed: number;
  intensity: number;
  glow: number;
  complexity: number;
  luminous: number;
}

/** The method the Method slider points at. */
export function methodOfCfg(cfg: Pick<MagmaCfg, 'particles'>): number {
  return methodOf(cfg.particles);
}

/**
 * The bloom for the Bloom slider (0..4): a glow round the hot parts only. Stronger than the other
 * full-screen shaders get, since a core of magma is mostly light, but its threshold keeps the dark
 * crust and the room dark.
 */
export function magmaBloom(luminous: number): {
  strength: number;
  threshold: number;
  radius: number;
} {
  const l = clamp(luminous, 0, 4);
  return { strength: l * 0.16, threshold: 0.6, radius: 0.3 + l * 0.05 };
}

/* One clock for the core: it survives rebuilds, so a slider move never restarts the churn. */
const clock: Clock = { last: null, time: 0 };

const LAYER = 'magmaLayer';

/* ── Build ─────────────────────────────────────────────────── */

function coreUniforms(): Record<string, THREE.IUniform> {
  const u: Record<string, THREE.IUniform> = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uRotInv: { value: new THREE.Matrix3() },
    uHeat: { value: 0.7 },
  };
  for (const n of MAGMA_FLOATS) u[n] = { value: 0 };
  return u;
}

function coreMaterial(method: number, uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    vertexShader: MAGMA_VERTEX,
    fragmentShader: magmaFragment(method),
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
}

export function buildMagma(cfg: MagmaCfg): THREE.Group {
  const group = new THREE.Group();
  const uniforms = coreUniforms();
  const method = methodOfCfg(cfg);
  const geo = new THREE.BufferGeometry();
  // One big triangle over the frame; the vertex shader passes it straight through.
  geo.setAttribute('aPos', new THREE.Float32BufferAttribute([-1, -1, 3, -1, -1, 3], 2));
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
  );
  const quad = new THREE.Mesh(geo, coreMaterial(method, uniforms));
  quad.frustumCulled = false;
  quad.renderOrder = -10;
  quad.userData.tag = 'visualShader';
  quad.userData.method = method;
  quad.userData.uniforms = uniforms;
  const size = new THREE.Vector2();
  quad.onBeforeRender = (renderer) => {
    renderer.getDrawingBufferSize(size);
    const target = renderer.getRenderTarget();
    if (target) size.set(target.width, target.height);
    (uniforms.uRes.value as THREE.Vector2).copy(size);
  };
  group.add(quad);
  group.userData.complexity = cfg.complexity;
  return group;
}

/** The uniforms every particle layer shares, plus its own. */
function particleUniforms(extra: Record<string, THREE.IUniform> = {}) {
  return {
    uTime: { value: 0 },
    uTurb: { value: 0.5 },
    uHeat: { value: 0.7 },
    uPx: { value: 1 },
    uScale: { value: 1 },
    uAlpha: { value: 1 },
    uSize: { value: 2 },
    ...extra,
  } as Record<string, THREE.IUniform>;
}

function additive(
  vertexShader: string,
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });
}

/** Keeps the device pixel ratio in uPx, so dots stay the same size on every screen. */
function trackPixelRatio(obj: THREE.Object3D, uniforms: Record<string, THREE.IUniform>): void {
  obj.onBeforeRender = (renderer) => {
    uniforms.uPx.value = renderer.getPixelRatio();
  };
}

const vec4s = (n: number) => Array.from({ length: n }, () => new THREE.Vector4());

function buildBoil(complexity: number): THREE.Points {
  const dots = makeBoilDots(boilCount(complexity));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(dots.position, 3));
  geo.setAttribute('aTan', new THREE.BufferAttribute(dots.tangent, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(dots.seed, 4));
  geo.setAttribute('aKind', new THREE.BufferAttribute(dots.kind, 1));
  const uniforms = particleUniforms({
    uBub: { value: vec4s(BUBBLES) },
    uBubB: { value: vec4s(BUBBLES) },
  });
  const pts = new THREE.Points(geo, additive(BOIL_VERTEX, POINT_FRAGMENT, uniforms));
  pts.frustumCulled = false;
  pts.userData.tag = LAYER;
  pts.userData.method = BOIL;
  pts.userData.uniforms = uniforms;
  pts.userData.count = dots.n;
  trackPixelRatio(pts, uniforms);
  return pts;
}

function buildEruption(complexity: number): THREE.Points {
  const e = makeEruption(eruptCount(complexity));
  const geo = new THREE.BufferGeometry();
  // Positions are worked out in the shader; this only sets the vertex count.
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(e.n * 3), 3));
  geo.setAttribute('aTan', new THREE.BufferAttribute(e.tangent, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(e.seed, 4));
  geo.setAttribute('aKind', new THREE.BufferAttribute(e.kind, 1));
  geo.setAttribute('aIdx', new THREE.BufferAttribute(e.index, 1));
  const uniforms = particleUniforms({
    uLoopA: { value: vec4s(LOOPS) },
    uLoopB: { value: vec4s(LOOPS) },
    uVent: { value: vec4s(VENTS) },
    uPulse: { value: 0 },
  });
  const pts = new THREE.Points(geo, additive(ERUPT_VERTEX, POINT_FRAGMENT, uniforms));
  pts.frustumCulled = false;
  pts.userData.tag = LAYER;
  pts.userData.method = ERUPTIVE;
  pts.userData.uniforms = uniforms;
  pts.userData.count = e.n;
  trackPixelRatio(pts, uniforms);
  return pts;
}

function buildCurrents(complexity: number): THREE.Group {
  const lines = makeLines(lineCount(complexity));
  const geo = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(lines.positions, 3);
  pos.setUsage(THREE.DynamicDrawUsage);
  const heat = new THREE.BufferAttribute(lines.heat, 1);
  heat.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', pos);
  geo.setAttribute('aAlong', new THREE.BufferAttribute(lines.along, 2));
  geo.setAttribute('aHeat', heat);
  const uniforms = particleUniforms();
  const wire = new THREE.LineSegments(geo, additive(LINE_VERTEX, LINE_FRAGMENT, uniforms));
  wire.frustumCulled = false;
  const g = new THREE.Group();
  g.add(wire);
  g.userData.tag = LAYER;
  g.userData.method = CURRENTS;
  g.userData.uniforms = uniforms;
  g.userData.lines = lines;
  g.userData.count = lines.n;
  return g;
}

function layerFor(group: THREE.Group, method: number, complexity: number): THREE.Object3D | null {
  let layer: THREE.Object3D | null = null;
  for (const c of group.children) {
    if (c.userData.tag !== LAYER) continue;
    c.visible = c.userData.method === method;
    if (c.visible) layer = c;
  }
  if (layer || (method !== BOIL && method !== CURRENTS && method !== ERUPTIVE)) return layer;
  layer =
    method === BOIL
      ? buildBoil(complexity)
      : method === ERUPTIVE
        ? buildEruption(complexity)
        : buildCurrents(complexity);
  group.add(layer);
  return layer;
}

/* ── Update ────────────────────────────────────────────────── */

const spin = new THREE.Quaternion();
const spinInv = new THREE.Matrix4();
const axis = new THREE.Vector3(...SPIN_AXIS);

export function updateMagma(group: THREE.Group, cfg: MagmaCfg, t: number, R = 300): void {
  const quad = group.children[0] as THREE.Mesh;
  const u = quad.userData.uniforms as Record<string, THREE.IUniform>;
  const method = methodOfCfg(cfg);
  if (quad.userData.method !== method) {
    (quad.material as THREE.Material).dispose();
    quad.material = coreMaterial(method, u);
    quad.userData.method = method;
  }
  tick(clock, t, cfg.breathSpeed);
  const time = clock.time;
  const heat = clamp(cfg.intensity / 10, 0, 1.5);
  const turb = clamp(cfg.glow / 10, 0, 1);
  const detail = clamp((cfg.complexity - 1) / 9, 0, 1);
  const pulse = pulseAt(time);

  spin.setFromAxisAngle(axis, time * SPIN_RATE);
  spinInv.makeRotationFromQuaternion(spin).invert();
  (u.uRotInv.value as THREE.Matrix3).setFromMatrix4(spinInv);
  u.uTime.value = time;
  u.uHeat.value = heat;
  u.uTurb.value = turb;
  u.uDetail.value = detail;
  u.uPulse.value = method === ERUPTIVE ? pulse : 0;
  u.uGlow.value = 0.7 + 0.6 * heat;

  const layer = layerFor(group, method, cfg.complexity);
  if (!layer) return;
  const scale = R * CORE;
  layer.scale.setScalar(scale);
  layer.quaternion.copy(spin);
  const lu = layer.userData.uniforms as Record<string, THREE.IUniform>;
  lu.uTime.value = time;
  lu.uTurb.value = turb;
  lu.uHeat.value = heat;
  lu.uScale.value = scale;
  // Fewer, brighter dots at low Detail; more and fainter at high, so the core keeps its light.
  const n = layer.userData.count as number;
  if (method === BOIL) {
    lu.uAlpha.value = 0.7 * clamp(Math.sqrt(12000 / n), 0.55, 1.3);
    lu.uSize.value = 2.0 * clamp(R / 300, 0.75, 1.4);
    const bub = lu.uBub.value as THREE.Vector4[];
    const bubB = lu.uBubB.value as THREE.Vector4[];
    for (let k = 0; k < BUBBLES; k++) {
      const b = bubbleAt(k, time);
      bub[k].set(b.dir[0], b.dir[1], b.dir[2], swellOf(b.phase));
      bubB[k].set(b.phase, b.size, 0, 0);
    }
  } else if (method === ERUPTIVE) {
    lu.uAlpha.value = clamp(Math.sqrt(8000 / n), 0.6, 1.3);
    lu.uSize.value = 2.2 * clamp(R / 300, 0.75, 1.4);
    lu.uPulse.value = pulse;
    const la = lu.uLoopA.value as THREE.Vector4[];
    const lb = lu.uLoopB.value as THREE.Vector4[];
    for (let k = 0; k < LOOPS; k++) {
      const l = loopAt(k, time);
      la[k].set(l.a[0], l.a[1], l.a[2], l.life);
      lb[k].set(l.b[0], l.b[1], l.b[2], l.height);
    }
    const vents = lu.uVent.value as THREE.Vector4[];
    for (let k = 0; k < VENTS; k++) {
      const v = ventAt(k, time);
      vents[k].set(v.dir[0], v.dir[1], v.dir[2], v.strength * (0.75 + 0.25 * pulse));
    }
  } else {
    lu.uAlpha.value = clamp(Math.sqrt(180 / n), 0.6, 1.3);
    const lines = layer.userData.lines as Lines;
    traceLines(lines, time * 0.6, turb);
    const geo = (layer.children[0] as THREE.LineSegments).geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aHeat.needsUpdate = true;
  }
}
