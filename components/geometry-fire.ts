/**
 * Fire: five flames from a struck match to a wildfire, in the Art builder's Experiment tab.
 * Spec: docs/specs/geometry-field.md, "Fire" (2026-11-16).
 *
 * One mode, `flames` (the builder's older `fire` mode is a different piece); the Scene slider
 * (the builder's `particles`) picks the piece. Each piece is one full-screen shader (lib/art/fire-shaders.ts) built on the flame tool (lib/art/flame.ts and
 * lib/art/flame-shaders.ts), fed each frame from lib/art/fire.ts: the flames, embers, smoke and
 * the light they throw.
 *
 * Sliders: Scene, Flicker (breathSpeed: the fire's clock), Turbulence (complexity), Wind
 * (symmetry), Heat (intensity), Embers (glow), Bloom (luminous).
 *
 * The shader materials are made once per piece and kept, so a rebuild (the builder rebuilds when
 * Turbulence or Wind moves) never recompiles a shader mid-drag.
 */

import * as THREE from 'three';

import { controlsOf, FIRE_SCENES, fireFrame, fitOf } from '@/lib/art/fire';
import { FIRE_FLOATS, FIRE_VEC4S, FIRE_VERTEX, fireFragment } from '@/lib/art/fire-shaders';
import {
  blackbodyRamp,
  clamp,
  emptyPack,
  flameNoiseData,
  MAX_FLAMES,
  packFlames,
  RAMP_SIZE,
} from '@/lib/art/flame';
import { FLAME_FLOATS, FLAME_VEC4S } from '@/lib/art/flame-shaders';

export const FIRE_MODE = 'flames';

export function isFireMode(mode: string): boolean {
  return mode === FIRE_MODE;
}

export interface FireCfg {
  mode: string;
  particles: number;
  breathSpeed: number;
  intensity: number;
  glow: number;
  complexity: number;
  symmetry: number;
}

/** The piece the Scene slider points at. */
export function fireSceneOf(cfg: Pick<FireCfg, 'particles'>): number {
  return clamp(Math.round(cfg.particles), 0, FIRE_SCENES.length - 1);
}

/* ── Uniforms and materials, made once ─────────────────────── */

function noiseTexture(): THREE.DataTexture {
  const tex = new THREE.DataTexture(flameNoiseData(256), 256, 256, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function rampTexture(): THREE.DataTexture {
  const tex = new THREE.DataTexture(blackbodyRamp(), RAMP_SIZE, 1, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

let shared: Record<string, THREE.IUniform> | null = null;
function uniforms(): Record<string, THREE.IUniform> {
  if (shared) return shared;
  const u: Record<string, THREE.IUniform> = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uLightC: { value: new THREE.Vector3(1, 0.5, 0.2) },
    uFA: { value: new Float32Array(MAX_FLAMES * 4) },
    uFB: { value: new Float32Array(MAX_FLAMES * 4) },
    uFC: { value: new Float32Array(MAX_FLAMES * 4) },
    uFD: { value: new Float32Array(MAX_FLAMES * 4) },
    uFN: { value: 0 },
    uFNoise: { value: noiseTexture() },
    uFRamp: { value: rampTexture() },
  };
  for (const n of [...FIRE_FLOATS, ...FLAME_FLOATS]) u[n] = { value: 0 };
  for (const n of [...FIRE_VEC4S, ...FLAME_VEC4S]) u[n] = { value: new THREE.Vector4() };
  u.uFit.value = 1;
  u.uExposure.value = 1;
  shared = u;
  return u;
}

const materials = new Map<number, THREE.ShaderMaterial>();
/** The piece's material, kept for good: the builder's dispose leaves it alone. */
export function fireMaterial(scene: number): THREE.ShaderMaterial {
  let m = materials.get(scene);
  if (!m) {
    m = new THREE.ShaderMaterial({
      vertexShader: FIRE_VERTEX,
      fragmentShader: fireFragment(scene),
      uniforms: uniforms(),
      depthTest: false,
      depthWrite: false,
    });
    m.dispose = () => {};
    materials.set(scene, m);
  }
  return m;
}

/* ── The clock: it survives rebuilds, so a slider move never restarts the fire ── */

const clock = { last: null as number | null, time: 0 };

/** Advances the fire's clock by the frame's time at the Flicker speed; returns the step. */
export function advanceFire(t: number, speed: number): number {
  const dt = clock.last === null ? 0 : clamp((t - clock.last) / 1000, 0, 0.1) * Math.max(0, speed);
  clock.last = t;
  // Wrapped hourly so the noise keeps its precision.
  clock.time = (clock.time + dt) % 3600;
  return dt;
}

export function fireTime(): number {
  return clock.time;
}

/* ── Build and update ──────────────────────────────────────── */

export function buildFire(cfg: FireCfg): THREE.Group {
  const group = new THREE.Group();
  const scene = fireSceneOf(cfg);
  const geo = new THREE.BufferGeometry();
  // One big triangle over the frame; the vertex shader passes it straight through.
  geo.setAttribute('aPos', new THREE.Float32BufferAttribute([-1, -1, 3, -1, -1, 3], 2));
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
  );
  const quad = new THREE.Mesh(geo, fireMaterial(scene));
  quad.frustumCulled = false;
  quad.renderOrder = -10;
  quad.userData.tag = 'visualShader';
  quad.userData.scene = scene;
  const u = uniforms();
  quad.userData.uniforms = u;
  const size = new THREE.Vector2();
  quad.onBeforeRender = (renderer) => {
    renderer.getDrawingBufferSize(size);
    const target = renderer.getRenderTarget();
    if (target) size.set(target.width, target.height);
    (u.uRes.value as THREE.Vector2).copy(size);
  };
  group.add(quad);
  return group;
}

const pack = emptyPack();

export function updateFire(group: THREE.Group, cfg: FireCfg, t: number): void {
  const quad = group.children[0] as THREE.Mesh;
  const u = quad.userData.uniforms as Record<string, THREE.IUniform>;
  const scene = fireSceneOf(cfg);
  if (quad.userData.scene !== scene) {
    quad.material = fireMaterial(scene);
    quad.userData.scene = scene;
  }
  advanceFire(t, cfg.breathSpeed);
  const time = clock.time;
  const res = u.uRes.value as THREE.Vector2;
  const aspect = res.y > 0 ? res.x / res.y : 16 / 9;
  const f = fireFrame(scene, time, controlsOf(cfg), aspect);

  packFlames(f.flames, pack);
  (u.uFA.value as Float32Array).set(pack.a);
  (u.uFB.value as Float32Array).set(pack.b);
  (u.uFC.value as Float32Array).set(pack.c);
  (u.uFD.value as Float32Array).set(pack.d);
  u.uFN.value = pack.count;
  u.uFT.value = time;
  u.uTime.value = time;
  u.uFit.value = fitOf(aspect);
  u.uShimmer.value = f.shimmer;
  u.uExposure.value = 1;

  const e = f.embers;
  (u.uEA.value as THREE.Vector4).set(e.x0, e.x1, e.y0, e.height);
  (u.uEB.value as THREE.Vector4).set(e.density, e.size, e.wind, e.rise);
  (u.uEC.value as THREE.Vector4).set(e.hotK, 0, 0, 0);
  const s = f.smoke;
  (u.uSA.value as THREE.Vector4).set(s.x, s.y, s.width, s.height);
  (u.uSB.value as THREE.Vector4).set(s.amount, s.wind, s.rise, s.curl);
  const L = f.light;
  (u.uLight.value as THREE.Vector4).set(L.x, L.y, L.intensity, L.radius);
  (u.uLightC.value as THREE.Vector3).set(...L.colour);
  (u.uObj.value as THREE.Vector4).set(...f.obj);
  (u.uObj2.value as THREE.Vector4).set(...f.obj2);
}
