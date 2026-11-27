/**
 * Mandala: five gold mandalas with light pulsing through them, in the Art builder's Experiment tab.
 * Spec: docs/specs/geometry-field.md, "Mandala" (2026-11-27).
 *
 * One mode, `mandala`; the Scene slider (the builder's `particles`) picks the piece. Each piece is
 * one full-screen shader (lib/art/mandala-shaders.ts). Two clocks: the pulses' time, and the loop
 * (0..1) the shape follows, so it drifts and comes back to the same shape every LOOP seconds.
 *
 * Sliders: Scene, Pulse (breathSpeed: both clocks), Light (intensity), Cracks (complexity),
 * Folds (symmetry), Gold Dust (glow), Bloom (luminous).
 *
 * The shader materials are made once per piece and kept, so a rebuild never recompiles mid-drag.
 */

import * as THREE from 'three';

import {
  LOOP,
  MANDALA_FLOATS,
  MANDALA_SCENES,
  MANDALA_VERTEX,
  mandalaFragment,
} from '@/lib/art/mandala-shaders';

export const MANDALA_MODE = 'mandala';

export function isMandalaMode(mode: string): boolean {
  return mode === MANDALA_MODE;
}

export interface MandalaCfg {
  mode: string;
  particles: number;
  breathSpeed: number;
  intensity: number;
  complexity: number;
  symmetry: number;
  glow: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The piece the Scene slider points at. */
export function mandalaSceneOf(cfg: Pick<MandalaCfg, 'particles'>): number {
  return clamp(Math.round(cfg.particles), 0, MANDALA_SCENES.length - 1);
}

/** The folds of the symmetry: an even number from 6 to 16. */
export function foldsOf(symmetry: number): number {
  return clamp(Math.round(symmetry / 2) * 2, 6, 16);
}

/* ── Uniforms and materials, made once ─────────────────────── */

let shared: Record<string, THREE.IUniform> | null = null;
function uniforms(): Record<string, THREE.IUniform> {
  if (shared) return shared;
  const u: Record<string, THREE.IUniform> = { uRes: { value: new THREE.Vector2(1, 1) } };
  for (const n of MANDALA_FLOATS) u[n] = { value: 0 };
  u.uExposure.value = 1;
  u.uFold.value = 12;
  shared = u;
  return u;
}

const materials = new Map<number, THREE.ShaderMaterial>();
/** The piece's material, kept for good: the builder's dispose leaves it alone. */
export function mandalaMaterial(scene: number): THREE.ShaderMaterial {
  let m = materials.get(scene);
  if (!m) {
    m = new THREE.ShaderMaterial({
      vertexShader: MANDALA_VERTEX,
      fragmentShader: mandalaFragment(scene),
      uniforms: uniforms(),
      depthTest: false,
      depthWrite: false,
    });
    m.dispose = () => {};
    materials.set(scene, m);
  }
  return m;
}

/* ── The clock: it survives rebuilds, so a slider move never restarts the pattern ── */

const clock = { last: null as number | null, time: 0 };

/** Advances the clock by the frame's time at the Pulse speed; returns the step in seconds. */
export function advanceMandala(t: number, speed: number): number {
  const dt = clock.last === null ? 0 : clamp((t - clock.last) / 1000, 0, 0.1) * Math.max(0, speed);
  clock.last = t;
  // Wrapped on a whole number of loops, so the shape never jumps.
  clock.time = (clock.time + dt) % (LOOP * 75);
  return dt;
}

export function mandalaTime(): number {
  return clock.time;
}

/** Where the shape is round its loop, 0..1. */
export function loopOf(time: number): number {
  return (((time % LOOP) + LOOP) % LOOP) / LOOP;
}

/* ── Build and update ──────────────────────────────────────── */

export function buildMandala(cfg: MandalaCfg): THREE.Group {
  const group = new THREE.Group();
  const scene = mandalaSceneOf(cfg);
  const geo = new THREE.BufferGeometry();
  // One big triangle over the frame; the vertex shader passes it straight through.
  geo.setAttribute('aPos', new THREE.Float32BufferAttribute([-1, -1, 3, -1, -1, 3], 2));
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
  );
  const quad = new THREE.Mesh(geo, mandalaMaterial(scene));
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

export function updateMandala(group: THREE.Group, cfg: MandalaCfg, t: number): void {
  const quad = group.children[0] as THREE.Mesh;
  const u = quad.userData.uniforms as Record<string, THREE.IUniform>;
  const scene = mandalaSceneOf(cfg);
  if (quad.userData.scene !== scene) {
    quad.material = mandalaMaterial(scene);
    quad.userData.scene = scene;
  }
  advanceMandala(t, cfg.breathSpeed);
  u.uTime.value = clock.time;
  u.uLoop.value = loopOf(clock.time);
  u.uLight.value = clamp(cfg.intensity / 10, 0, 1);
  u.uCrack.value = clamp(cfg.complexity / 10, 0, 1);
  u.uFold.value = foldsOf(cfg.symmetry);
  u.uSparks.value = clamp(cfg.glow / 10, 0, 1);
  u.uExposure.value = 1;
}
