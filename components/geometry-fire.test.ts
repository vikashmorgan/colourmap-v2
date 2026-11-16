import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  advanceFire,
  buildFire,
  type FireCfg,
  fireMaterial,
  fireSceneOf,
  isFireMode,
  updateFire,
} from './geometry-fire';

function cfg(scene: number, extra: Partial<FireCfg> = {}): FireCfg {
  return {
    mode: 'flames',
    particles: scene,
    breathSpeed: 1,
    intensity: 5,
    glow: 5,
    complexity: 5.5,
    symmetry: 0,
    ...extra,
  };
}

const quadOf = (g: THREE.Group) => g.children[0] as THREE.Mesh;
const uniformsOf = (g: THREE.Group) =>
  quadOf(g).userData.uniforms as Record<string, THREE.IUniform>;

describe('Flames mode', () => {
  it('is its own mode, apart from the older fire mode, the Scene slider picking the piece', () => {
    expect(isFireMode('flames')).toBe(true);
    expect(isFireMode('fire')).toBe(false);
    expect(fireSceneOf({ particles: 2.4 })).toBe(2);
    expect(fireSceneOf({ particles: 12 })).toBe(4);
    expect(fireSceneOf({ particles: -1 })).toBe(0);
  });

  it('builds one full-screen shader, drawn first, with the noise and the blackbody ramp', () => {
    const g = buildFire(cfg(3));
    const quad = quadOf(g);
    expect(quad.renderOrder).toBe(-10);
    expect((quad.material as THREE.ShaderMaterial).fragmentShader).toContain('#define SCENE 3');
    expect(uniformsOf(g).uFNoise.value).toBeInstanceOf(THREE.DataTexture);
    expect(uniformsOf(g).uFRamp.value).toBeInstanceOf(THREE.DataTexture);
  });

  it('keeps each piece’s material through rebuilds, so a slider never recompiles a shader', () => {
    const m = fireMaterial(1);
    m.dispose();
    expect(fireMaterial(1)).toBe(m);
    expect(quadOf(buildFire(cfg(1))).material).toBe(m);
  });

  it('swaps the piece when the Scene slider moves and feeds the flames each frame', () => {
    const g = buildFire(cfg(0));
    updateFire(g, cfg(4), 0);
    updateFire(g, cfg(4), 16);
    expect((quadOf(g).material as THREE.ShaderMaterial).fragmentShader).toContain(
      '#define SCENE 4',
    );
    const u = uniformsOf(g);
    expect(u.uFN.value).toBeGreaterThan(5);
    expect((u.uFA.value as Float32Array).some((v) => v !== 0)).toBe(true);
    expect((u.uLight.value as THREE.Vector4).z).toBeGreaterThan(0);
    expect((u.uEB.value as THREE.Vector4).x).toBeGreaterThan(0);
  });

  it('runs its clock at the Flicker speed and stops it at 0', () => {
    advanceFire(1000, 1);
    expect(advanceFire(1050, 1)).toBeCloseTo(0.05, 5);
    expect(advanceFire(1100, 2)).toBeCloseTo(0.1, 5);
    expect(advanceFire(1150, 0)).toBe(0);
    // A long pause (a hidden tab) never jumps the fire forward.
    expect(advanceFire(60000, 1)).toBeLessThanOrEqual(0.1);
  });
});
