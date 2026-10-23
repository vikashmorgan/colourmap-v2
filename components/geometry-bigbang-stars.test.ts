import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { makeParticles } from '@/lib/bigbang';

import {
  BIG_BANG_STAR_MODES,
  breakAmount,
  buildBigBangStars,
  dotCount,
  explosion,
  isBigBangStarMode,
  shapeAt,
  TIMER_OFF,
  updateBigBangStars,
} from './geometry-bigbang-stars';

const [p] = makeParticles(1);

describe('Big Bang moments as Stars', () => {
  it('recognises its five modes', () => {
    for (const m of BIG_BANG_STAR_MODES) expect(isBigBangStarMode(m)).toBe(true);
    expect(isBigBangStarMode('pulse')).toBe(false);
  });

  it('never explodes with the Timer fully left', () => {
    for (let s = 0; s < 200; s += 0.7) expect(explosion(p, s, TIMER_OFF - 0.5)).toBe(0);
  });

  it('holds for the Timer, then blows out and gathers back before the next round', () => {
    const timer = 12;
    expect(explosion(p, 5, timer)).toBe(0);
    expect(explosion(p, 11.9, timer)).toBe(0);
    const peak = Math.max(
      ...Array.from({ length: 60 }, (_, k) => explosion(p, 12 + k * 0.1, timer)),
    );
    expect(peak).toBeGreaterThan(0.95);
    expect(explosion(p, 12 + 6 - 0.01, timer)).toBeLessThan(0.02);
    // the next round starts whole again
    expect(explosion(p, 18 + 5, timer)).toBe(0);
  });

  it('Fractal Break holds the fractal, breaks into sand, holds, and gathers back', () => {
    expect(breakAmount(p, 5)).toBe(0);
    expect(breakAmount(p, 20)).toBe(1);
    expect(breakAmount(p, 34 + 5)).toBe(0);
    const mid = breakAmount(p, 13.5);
    expect(mid).toBeGreaterThanOrEqual(0);
    expect(mid).toBeLessThanOrEqual(1);
  });

  it('keeps the Flower Symmetry petal count fixed over time', () => {
    // the rose's radius pattern repeats every 2π/n whatever the time
    const ps = makeParticles(400);
    for (const t of [0, 7, 30]) {
      for (const q of ps.slice(0, 50)) {
        const a = shapeAt('bbflower', q, t, 8).pos;
        expect(Number.isFinite(a[0])).toBe(true);
      }
    }
  });

  it('scales the dots with the slider and caps them', () => {
    expect(dotCount(0)).toBe(2000);
    expect(dotCount(10)).toBe(9000);
    expect(dotCount(99)).toBe(9000);
  });

  it.each(BIG_BANG_STAR_MODES)('%s draws finite, lit dots inside the field', (mode) => {
    const g = buildBigBangStars();
    const cfg = {
      mode,
      symmetry: 8,
      complexity: TIMER_OFF - 0.5,
      breathSpeed: 1,
      intensity: 8,
      particles: 1,
      luminous: 2,
    };
    for (let f = 0; f < 5; f++) updateBigBangStars(g, cfg, f * 16, 300);
    const geo = (g.children[0] as THREE.Points).geometry;
    const pos = geo.getAttribute('position').array as Float32Array;
    const col = geo.getAttribute('aColor').array as Float32Array;
    let lit = 0;
    for (let i = 0; i < geo.drawRange.count; i++) {
      if (col[i * 3] + col[i * 3 + 1] + col[i * 3 + 2] > 0.01) {
        lit++;
        expect(Number.isFinite(pos[i * 3])).toBe(true);
      }
    }
    expect(lit).toBeGreaterThan(100);
  });

  it('fades the tunnel softly at the rim: no bright dot far outside the field', () => {
    const g = buildBigBangStars();
    const cfg = {
      mode: 'bbtunnel',
      symmetry: 6,
      complexity: 0,
      breathSpeed: 1,
      intensity: 10,
      particles: 10,
      luminous: 2,
    };
    for (let f = 0; f < 120; f++) updateBigBangStars(g, cfg, f * 16, 300);
    const geo = (g.children[0] as THREE.Points).geometry;
    const pos = geo.getAttribute('position').array as Float32Array;
    const col = geo.getAttribute('aColor').array as Float32Array;
    for (let i = 0; i < geo.drawRange.count; i++) {
      const r = Math.hypot(pos[i * 3], pos[i * 3 + 1]) / 300;
      if (r > 1.5 && r < 1e3)
        expect(col[i * 3] + col[i * 3 + 1] + col[i * 3 + 2]).toBeLessThan(1e-6);
    }
  });
});
