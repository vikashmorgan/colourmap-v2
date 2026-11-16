import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { MAGMA_STOPS } from '@/lib/art/magma';
import {
  BOIL_VERTEX,
  ERUPT_VERTEX,
  LINE_VERTEX,
  magmaFragment,
  RAMP_GLSL,
} from '@/lib/art/magma-shaders';
import {
  buildMagma,
  isMagmaMode,
  type MagmaCfg,
  magmaBloom,
  methodOfCfg,
  updateMagma,
} from './geometry-magma';

function cfg(method: number, extra: Partial<MagmaCfg> = {}): MagmaCfg {
  return {
    mode: 'magma',
    particles: method,
    breathSpeed: 1,
    intensity: 7,
    glow: 5,
    complexity: 1,
    luminous: 2,
    ...extra,
  };
}

const quadOf = (g: THREE.Group) => g.children[0] as THREE.Mesh;
const layers = (g: THREE.Group) => g.children.filter((c) => c.userData.tag === 'magmaLayer');
const visibleLayer = (g: THREE.Group) => layers(g).find((c) => c.visible);

function run(g: THREE.Group, c: MagmaCfg, from: number, frames = 3) {
  for (let i = 0; i < frames; i++) updateMagma(g, c, from + i * 16, 300);
}

describe('Magma mode', () => {
  it('is its own mode, the Method slider picking the piece', () => {
    expect(isMagmaMode('magma')).toBe(true);
    expect(isMagmaMode('speed')).toBe(false);
    expect(methodOfCfg({ particles: 3.4 })).toBe(3);
    expect(methodOfCfg({ particles: 12 })).toBe(4);
  });

  it('builds one full-screen shader, drawn first, and swaps it when the method changes', () => {
    const g = buildMagma(cfg(1));
    const quad = quadOf(g);
    expect(quad.renderOrder).toBe(-10);
    const u = (quad.material as THREE.ShaderMaterial).uniforms;
    expect((quad.material as THREE.ShaderMaterial).fragmentShader).toContain('#define METHOD 1');
    updateMagma(g, cfg(2), 0);
    expect((quadOf(g).material as THREE.ShaderMaterial).fragmentShader).toContain(
      '#define METHOD 2',
    );
    expect((quadOf(g).material as THREE.ShaderMaterial).uniforms).toBe(u);
  });

  it('draws the shader-only methods with no extra layer', () => {
    for (const m of [1, 2]) {
      const g = buildMagma(cfg(m));
      run(g, cfg(m), 0);
      expect(visibleLayer(g)).toBeUndefined();
    }
  });

  it('adds the dots for Boiling Magma, scaled to the core and swelling bubbles', () => {
    const g = buildMagma(cfg(0));
    run(g, cfg(0), 0, 40);
    const pts = visibleLayer(g) as THREE.Points;
    expect(pts).toBeInstanceOf(THREE.Points);
    expect(pts.geometry.attributes.position.count).toBe(6000);
    expect(pts.scale.x).toBeCloseTo(300 * 0.6);
    const mat = pts.material as THREE.ShaderMaterial;
    expect(mat.blending).toBe(THREE.AdditiveBlending);
    const bub = mat.uniforms.uBub.value as THREE.Vector4[];
    expect(bub.some((b) => b.w > 0)).toBe(true);
    expect(mat.uniforms.uTime.value as number).toBeGreaterThan(0);
  });

  it('keeps each layer once and hides it when another method shows', () => {
    const g = buildMagma(cfg(0));
    run(g, cfg(0), 0);
    run(g, cfg(4), 100);
    run(g, cfg(0), 200);
    expect(layers(g)).toHaveLength(2);
    expect(visibleLayer(g)?.userData.method).toBe(0);
    run(g, cfg(1), 300);
    expect(visibleLayer(g)).toBeUndefined();
  });

  it('traces the currents each frame and draws them as filaments', () => {
    const g = buildMagma(cfg(3));
    run(g, cfg(3), 0);
    const layer = visibleLayer(g) as THREE.Group;
    const wire = layer.children[0] as THREE.LineSegments;
    expect(wire).toBeInstanceOf(THREE.LineSegments);
    const pos = wire.geometry.attributes.position.array as Float32Array;
    expect(Math.hypot(pos[0], pos[1], pos[2])).toBeGreaterThan(0.7);
  });

  it('feeds the Eruptive Core its loops, vents and breath', () => {
    const g = buildMagma(cfg(4));
    run(g, cfg(4), 0, 10);
    const pts = visibleLayer(g) as THREE.Points;
    const u = (pts.material as THREE.ShaderMaterial).uniforms;
    const loops = u.uLoopB.value as THREE.Vector4[];
    expect(loops.every((l) => l.w > 0.1)).toBe(true);
    expect(u.uPulse.value as number).toBeGreaterThan(0);
    expect((quadOf(g).material as THREE.ShaderMaterial).uniforms.uPulse.value).toBeGreaterThan(0);
  });

  it('turns the Heat, Turbulence and Detail sliders into uniforms', () => {
    const g = buildMagma(cfg(1));
    updateMagma(g, cfg(1, { intensity: 10, glow: 10, complexity: 10 }), 0);
    const u = (quadOf(g).material as THREE.ShaderMaterial).uniforms;
    expect(u.uHeat.value).toBe(1);
    expect(u.uTurb.value).toBe(1);
    expect(u.uDetail.value).toBe(1);
  });

  it('stands still at Speed 0', () => {
    const g = buildMagma(cfg(1));
    updateMagma(g, cfg(1), 1000);
    const u = (quadOf(g).material as THREE.ShaderMaterial).uniforms;
    const t0 = u.uTime.value as number;
    updateMagma(g, cfg(1, { breathSpeed: 0 }), 1016);
    updateMagma(g, cfg(1, { breathSpeed: 0 }), 1032);
    expect(u.uTime.value).toBe(t0);
  });

  it('blooms more with the Bloom slider, only the hot parts', () => {
    expect(magmaBloom(4).strength).toBeGreaterThan(magmaBloom(1).strength);
    expect(magmaBloom(9)).toEqual(magmaBloom(4));
    expect(magmaBloom(2).threshold).toBeGreaterThan(0.3);
  });
});

describe('Magma shaders', () => {
  it('build the ramp from the same stops as the TS ramp', () => {
    expect(RAMP_GLSL).toContain(`const vec3 S${MAGMA_STOPS.length - 1}`);
    expect(RAMP_GLSL).toContain('vec3 magma(float t)');
    for (const src of [BOIL_VERTEX, ERUPT_VERTEX, LINE_VERTEX, magmaFragment(0)]) {
      expect(src).toContain('vec3 ramp(float t)');
    }
  });

  it('specialise one source per method, clamped', () => {
    expect(magmaFragment(7)).toContain('#define METHOD 4');
    expect(magmaFragment(-3)).toContain('#define METHOD 0');
  });
});
