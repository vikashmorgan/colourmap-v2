import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { OIL_MODES } from '@/lib/visual-shaders';

import {
  buildGeometryVisual,
  isGeometryVisualMode,
  oilStopsFrom,
  shaderUniformValues,
  TUNNEL_MODES,
  updateGeometryVisual,
  type VisualCfg,
} from './geometry-visuals';

const PAL = {
  bg0: '#0a0412',
  line: 'rgba(175,90,255,0.65)',
  dots: 'rgba(200,140,255,0.7)',
  rgb: [175, 90, 255] as [number, number, number],
};

function cfg(mode: string, over: Partial<VisualCfg> = {}): VisualCfg {
  return {
    mode,
    symmetry: 6,
    complexity: 5,
    glow: 5,
    breathSpeed: 0.5,
    intensity: 8,
    particles: 5,
    ...over,
  };
}

function run(mode: string, frames = 30, over: Partial<VisualCfg> = {}) {
  const c = cfg(mode, over);
  const group = buildGeometryVisual(c, PAL);
  for (let i = 0; i < frames; i++) updateGeometryVisual(group, c, PAL, i * 16, 300);
  return group;
}

const LINE_MODES = ['drostezoom', 'twistgate', 'fouriertube', 'superrings'];

describe('geometry visuals', () => {
  it('recognises every tunnel and oil mode, and nothing else', () => {
    for (const mode of [...TUNNEL_MODES, ...OIL_MODES])
      expect(isGeometryVisualMode(mode)).toBe(true);
    expect(isGeometryVisualMode('tunnel')).toBe(false);
  });

  it.each(LINE_MODES)('%s draws finite, faded lines inside the field', (mode) => {
    const group = run(mode);
    const lines = group.children[0] as THREE.LineSegments;
    const count = lines.geometry.drawRange.count;
    expect(count).toBeGreaterThan(100);
    const pos = lines.geometry.getAttribute('position').array as Float32Array;
    const col = lines.geometry.getAttribute('color').array as Float32Array;
    let maxC = 0;
    for (let i = 0; i < count * 3; i++) {
      expect(Number.isFinite(pos[i])).toBe(true);
      expect(Number.isFinite(col[i])).toBe(true);
      maxC = Math.max(maxC, col[i]);
    }
    expect(maxC).toBeGreaterThan(0);
  });

  it.each(LINE_MODES)('%s fades to black before the rim', (mode) => {
    const group = run(mode, 30, { particles: 0 });
    const lines = group.children[0] as THREE.LineSegments;
    const count = lines.geometry.drawRange.count;
    const pos = lines.geometry.getAttribute('position').array as Float32Array;
    const col = lines.geometry.getAttribute('color').array as Float32Array;
    for (let v = 0; v < count; v++) {
      const r = Math.hypot(pos[v * 3], pos[v * 3 + 1]) / 300;
      if (r > 1.2) {
        expect(col[v * 3] + col[v * 3 + 1] + col[v * 3 + 2]).toBeLessThan(1e-6);
      }
    }
  });

  it('golden seed tunnel lights its points with depth-sized dots', () => {
    const group = run('goldenseed');
    const pts = group.children[0] as THREE.Points;
    const size = pts.geometry.getAttribute('aSize').array as Float32Array;
    expect(Math.max(...size)).toBeGreaterThan(Math.min(...size));
    const col = pts.geometry.getAttribute('aColor').array as Float32Array;
    expect(Math.max(...col)).toBeGreaterThan(0);
  });

  it.each([
    'shadertunnel',
    'logspiral',
    ...OIL_MODES,
  ])('%s is one full-screen quad driven by uniforms', (mode) => {
    const group = run(mode, 10);
    const quad = group.children[0] as THREE.Mesh;
    expect(quad.scale.x).toBe(3600);
    const u = (quad.material as THREE.ShaderMaterial).uniforms;
    expect(u.uTime.value).toBeGreaterThan(0);
    expect(u.uBright.value).toBeCloseTo(0.8);
  });

  it('keeps time running across rebuilds so journeys never reset motion', () => {
    const a = run('oilwarp', 5);
    const tA = ((a.children[0] as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.uTime
      .value;
    const b = buildGeometryVisual(cfg('oilwarp'), PAL);
    updateGeometryVisual(b, cfg('oilwarp'), PAL, 5 * 16, 300);
    const tB = ((b.children[0] as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.uTime
      .value;
    expect(tB).toBeGreaterThanOrEqual(tA);
  });

  it('maps sliders to clamped uniforms', () => {
    const u = shaderUniformValues(cfg('oilwarp', { glow: 20, particles: -3, symmetry: 0 }));
    expect(u.uRainbow).toBe(1);
    expect(u.uSwirl).toBe(0);
    expect(u.uSym).toBe(1);
  });

  it('paints an oil in the four chosen colours, and back in the palette when cleared', () => {
    const c = cfg('lavalamp');
    const g = buildGeometryVisual(c, PAL);
    const u = ((g.children[0] as THREE.Mesh).material as THREE.ShaderMaterial).uniforms;
    updateGeometryVisual(g, c, PAL, 16, 300);
    const paletteGround = (u.uC0.value as THREE.Color).getHex();
    const chosen = { ...c, oilColors: ['#000000', '#ff0000', '#ffffff', '#0000ff'] };
    updateGeometryVisual(g, chosen, PAL, 32, 300);
    expect((u.uC1.value as THREE.Color).getHexString(THREE.SRGBColorSpace)).toBe('ff0000');
    expect((u.uC3.value as THREE.Color).getHexString(THREE.SRGBColorSpace)).toBe('0000ff');
    updateGeometryVisual(g, c, PAL, 48, 300);
    expect((u.uC0.value as THREE.Color).getHex()).toBe(paletteGround);
  });

  it('only accepts four well-formed colours', () => {
    expect(oilStopsFrom(undefined)).toBeNull();
    expect(oilStopsFrom(['#000000'])).toBeNull();
    expect(oilStopsFrom(['#000000', '#fff', '#000000', '#000000'])).toBeNull();
    expect(oilStopsFrom(['#000000', '#ff0000', '#ffffff', '#0000ff'])?.[1]).toEqual([1, 0, 0]);
  });
});
