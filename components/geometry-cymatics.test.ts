import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  buildCymatics,
  CYMATIC_MODES,
  type CymaticsCfg,
  isCymaticsMode,
  sandCount,
  updateCymatics,
} from './geometry-cymatics';

const PAL = {
  bg0: '#130900',
  line: 'rgba(255,195,35,0.65)',
  dots: 'rgba(255,215,85,0.7)',
  rgb: [255, 195, 35] as [number, number, number],
};

function cfg(mode: string): CymaticsCfg {
  return {
    mode,
    complexity: 5,
    glow: 0,
    breathSpeed: 0.3,
    intensity: 10,
    particles: 2,
    luminous: 2,
  };
}

describe('Magnetic Sands 1–4 (cymatics)', () => {
  it('recognises the four modes only', () => {
    for (const m of CYMATIC_MODES) expect(isCymaticsMode(m)).toBe(true);
    expect(isCymaticsMode('magneticsand')).toBe(false);
  });

  it('scales the sand with the slider and caps it', () => {
    expect(sandCount(0)).toBe(1500);
    expect(sandCount(10)).toBeGreaterThan(sandCount(5));
    expect(sandCount(100)).toBe(7000);
  });

  it.each(CYMATIC_MODES)('%s gathers its sand onto the still lines', (mode) => {
    const c = cfg(mode);
    const g = buildCymatics(c);
    const geo = (g.children[0] as THREE.Points).geometry;
    const brightShare = () => {
      const col = geo.getAttribute('aColor').array as Float32Array;
      const n = geo.drawRange.count;
      let on = 0;
      // Brightness = light·(0.18 + 0.82·rest²); rest > 0.8 means close to a still line.
      for (let i = 0; i < n; i++) if (col[i * 3] / (195 / 255) > 1.6 * (0.18 + 0.82 * 0.64)) on++;
      return on / n;
    };
    updateCymatics(g, c, PAL, 0, 300);
    const start = brightShare();
    for (let f = 1; f <= 400; f++) updateCymatics(g, c, PAL, f * 16.7, 300);
    expect(brightShare()).toBeGreaterThan(Math.max(0.4, start + 0.2));
  });

  it('keeps the plates round and the sphere a sphere', () => {
    for (const mode of CYMATIC_MODES) {
      const g = buildCymatics(cfg(mode));
      for (let f = 0; f < 30; f++) updateCymatics(g, cfg(mode), PAL, f * 16.7, 300);
      const geo = (g.children[0] as THREE.Points).geometry;
      const p = geo.getAttribute('position').array as Float32Array;
      for (let i = 0; i < geo.drawRange.count; i++) {
        const r = Math.hypot(p[i * 3], p[i * 3 + 1], mode === 'cymatics4' ? p[i * 3 + 2] : 0);
        if (mode === 'cymatics4') expect(r).toBeCloseTo(300 * 0.82, 0);
        else expect(Math.hypot(p[i * 3], p[i * 3 + 1])).toBeLessThanOrEqual(300 * 0.95 + 0.01);
        expect(Number.isFinite(r)).toBe(true);
      }
    }
  });

  it('tilts the 3D plate and spins the sphere, keeps the 2D circle flat', () => {
    const run = (mode: string) => {
      const g = buildCymatics(cfg(mode));
      for (let f = 0; f < 5; f++) updateCymatics(g, cfg(mode), PAL, f * 16.7, 300);
      return g.rotation;
    };
    expect(Math.abs(run('cymatics3').x)).toBeGreaterThan(0.5);
    expect(run('cymatics1').x).toBe(0);
  });
});
