import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  advanceDrive,
  buildSpeed,
  isSpeedMode,
  type SpeedCfg,
  sceneOf,
  streamCount,
  TRIANGLE_STREAM,
  updateSpeed,
} from './geometry-speed';

function cfg(scene: number, extra: Partial<SpeedCfg> = {}): SpeedCfg {
  return {
    mode: 'speed',
    particles: scene,
    breathSpeed: 1,
    intensity: 8,
    glow: 6,
    complexity: 7,
    symmetry: 1,
    ...extra,
  };
}

const uniformsOf = (g: THREE.Group) =>
  (g.children[0] as THREE.Mesh).userData.uniforms as Record<string, THREE.IUniform>;

describe('Speed mode', () => {
  it('is its own mode, the Scene slider picking the piece', () => {
    expect(isSpeedMode('speed')).toBe(true);
    expect(isSpeedMode('windtunnel')).toBe(false);
    expect(sceneOf({ particles: 3.4 })).toBe(3);
    expect(sceneOf({ particles: 42 })).toBe(10);
    expect(sceneOf({ particles: -2 })).toBe(0);
  });

  it('builds one full-screen shader, drawn first', () => {
    const g = buildSpeed(cfg(2));
    const quad = g.children[0] as THREE.Mesh;
    expect(quad.renderOrder).toBe(-10);
    expect((quad.material as THREE.ShaderMaterial).fragmentShader).toContain('#define SCENE 2');
  });

  it('swaps the shader when the Scene slider moves, keeping the uniforms', () => {
    const g = buildSpeed(cfg(2));
    const u = uniformsOf(g);
    updateSpeed(g, cfg(5), 1000);
    const quad = g.children[0] as THREE.Mesh;
    expect((quad.material as THREE.ShaderMaterial).fragmentShader).toContain('#define SCENE 5');
    expect((quad.material as THREE.ShaderMaterial).uniforms).toBe(u);
  });

  it('drives forward: distance grows with time, faster at a higher Speed, and wraps', () => {
    advanceDrive(4, 0, 1);
    const a = advanceDrive(4, 50, 1).travel;
    const b = advanceDrive(4, 100, 1).travel;
    expect(b).toBeGreaterThan(a);
    const g = buildSpeed(cfg(9));
    updateSpeed(g, cfg(9), 0);
    updateSpeed(g, cfg(9), 16);
    const blur1 = uniformsOf(g).uBlur.value as number;
    updateSpeed(g, cfg(9, { breathSpeed: 2 }), 32);
    expect(uniformsOf(g).uBlur.value as number).toBeGreaterThan(blur1 * 1.5);
    for (let t = 48; t < 60000; t += 100) advanceDrive(9, t, 2);
    expect(advanceDrive(9, 60000, 2).travel).toBeLessThan(2048);
  });

  it('runs the lap for the Monza pieces, with the corner name showing', () => {
    const g = buildSpeed(cfg(1));
    for (let t = 0; t <= 4000; t += 16) updateSpeed(g, cfg(1), t);
    const u = uniformsOf(g);
    expect(u.uLabelA.value as number).toBeGreaterThan(0);
    const z = u.uRoadZ.value as Float32Array;
    for (let k = 1; k < z.length; k++) expect(z[k]).toBeGreaterThan(z[k - 1]);
    const top = buildSpeed(cfg(0));
    updateSpeed(top, cfg(0), 0);
    updateSpeed(top, cfg(0), 500);
    expect(uniformsOf(top).uField.value).toBeInstanceOf(THREE.DataTexture);
    expect(uniformsOf(top).uCar.value).toBe(0);
  });

  it('hides the car when the Car slider is at 0', () => {
    const g = buildSpeed(cfg(2, { symmetry: 0 }));
    updateSpeed(g, cfg(2, { symmetry: 0 }), 0);
    expect(uniformsOf(g).uCar.value).toBe(0);
  });

  it('streams the triangles only in the Triangle Stream, as many as Detail asks', () => {
    const g = buildSpeed(cfg(TRIANGLE_STREAM));
    updateSpeed(g, cfg(TRIANGLE_STREAM), 0, 300);
    updateSpeed(g, cfg(TRIANGLE_STREAM), 16, 300);
    const mesh = g.children.find((c) => c.userData.tag === 'speedStream') as THREE.InstancedMesh;
    expect(mesh.visible).toBe(true);
    expect(mesh.count).toBe(streamCount(7));
    expect(streamCount(10)).toBeGreaterThan(streamCount(1));
    updateSpeed(g, cfg(3), 32, 300);
    expect(mesh.visible).toBe(false);
  });
});
