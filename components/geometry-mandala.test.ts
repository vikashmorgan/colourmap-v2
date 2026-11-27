import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { LOOP, MANDALA_FLOATS, MANDALA_SCENES, mandalaFragment } from '@/lib/art/mandala-shaders';
import {
  advanceMandala,
  buildMandala,
  foldsOf,
  isMandalaMode,
  loopOf,
  type MandalaCfg,
  mandalaMaterial,
  mandalaSceneOf,
  mandalaTime,
  updateMandala,
} from './geometry-mandala';

function cfg(scene: number, extra: Partial<MandalaCfg> = {}): MandalaCfg {
  return {
    mode: 'mandala',
    particles: scene,
    breathSpeed: 1,
    intensity: 7,
    complexity: 4,
    symmetry: 12,
    glow: 5,
    ...extra,
  };
}

const quadOf = (g: THREE.Group) => g.children[0] as THREE.Mesh;
const uniformsOf = (g: THREE.Group) =>
  quadOf(g).userData.uniforms as Record<string, THREE.IUniform>;

describe('Mandala mode', () => {
  it('is one mode, the Scene slider picking one of five pieces', () => {
    expect(isMandalaMode('mandala')).toBe(true);
    expect(isMandalaMode('magma')).toBe(false);
    expect(MANDALA_SCENES).toHaveLength(5);
    expect(mandalaSceneOf({ particles: 2.4 })).toBe(2);
    expect(mandalaSceneOf({ particles: 9 })).toBe(4);
    expect(mandalaSceneOf({ particles: -3 })).toBe(0);
  });

  it('folds into an even number of wedges, 6 to 16', () => {
    expect(foldsOf(12)).toBe(12);
    expect(foldsOf(9)).toBe(10);
    expect(foldsOf(2)).toBe(6);
    expect(foldsOf(40)).toBe(16);
  });

  it('comes back to the same shape every loop', () => {
    expect(loopOf(0)).toBe(0);
    expect(loopOf(LOOP / 2)).toBeCloseTo(0.5);
    expect(loopOf(LOOP * 3 + 6)).toBeCloseTo(loopOf(6));
    expect(loopOf(-6)).toBeCloseTo(loopOf(LOOP - 6));
  });

  it('builds one full-screen shader per piece, drawn first, kept across rebuilds', () => {
    const g = buildMandala(cfg(1));
    const quad = quadOf(g);
    expect(quad.userData.tag).toBe('visualShader');
    expect(quad.renderOrder).toBe(-10);
    expect(quad.material).toBe(mandalaMaterial(1));
    expect((quad.material as THREE.ShaderMaterial).fragmentShader).toContain('#define SCENE 1');
    for (const n of MANDALA_FLOATS) expect(uniformsOf(g)[n]).toBeDefined();
    for (let s = 0; s < 5; s++)
      expect(mandalaFragment(s).startsWith(`#define SCENE ${s}`)).toBe(true);
  });

  it('feeds the sliders to the shader and swaps the piece when the Scene slider moves', () => {
    const g = buildMandala(cfg(0));
    updateMandala(g, cfg(3, { intensity: 5, complexity: 10, symmetry: 8, glow: 0 }), 1000);
    const u = uniformsOf(g);
    expect(u.uLight.value).toBeCloseTo(0.5);
    expect(u.uCrack.value).toBe(1);
    expect(u.uFold.value).toBe(8);
    expect(u.uSparks.value).toBe(0);
    expect(quadOf(g).material).toBe(mandalaMaterial(3));
    expect(u.uLoop.value).toBeGreaterThanOrEqual(0);
    expect(u.uLoop.value).toBeLessThan(1);
  });

  it('runs its clock at the Pulse speed, and stops at zero', () => {
    advanceMandala(0, 1);
    const before = mandalaTime();
    advanceMandala(50, 1);
    expect(mandalaTime() - before).toBeCloseTo(0.05);
    const still = mandalaTime();
    advanceMandala(100, 0);
    expect(mandalaTime()).toBe(still);
  });
});
