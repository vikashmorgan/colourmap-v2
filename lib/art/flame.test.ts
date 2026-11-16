import { describe, expect, it } from 'vitest';

import {
  blackbody,
  blackbodyRamp,
  emptyPack,
  FLAME_DEFAULTS,
  FLAME_PALETTES,
  flame,
  flameNoiseData,
  flicker,
  MAX_FLAMES,
  packFlames,
  RAMP_SIZE,
} from './flame';
import { FLAME_GLSL, FLAME_MAX } from './flame-shaders';

describe('flame tool', () => {
  it('fills a flame from the defaults and keeps every value in range', () => {
    expect(flame()).toEqual(FLAME_DEFAULTS);
    const f = flame({ width: -1, turbulence: 9, blue: 3, lean: -7, coreK: 50, tongues: 0 });
    expect(f.width).toBeGreaterThan(0);
    expect(f.turbulence).toBe(2);
    expect(f.blue).toBe(1);
    expect(f.lean).toBe(-1.5);
    expect(f.coreK).toBe(1000);
    expect(f.tongues).toBe(1);
  });

  it('has palettes from blue gas to white-hot', () => {
    expect(FLAME_PALETTES.gas.blue).toBe(1);
    expect(FLAME_PALETTES.gas.luminous).toBeLessThan(0.1);
    expect(FLAME_PALETTES.wood.blue).toBeLessThan(0.1);
    expect(FLAME_PALETTES.whiteHot.coreK).toBeGreaterThan(FLAME_PALETTES.candle.coreK);
    expect(FLAME_PALETTES.candle.coreK).toBeGreaterThan(FLAME_PALETTES.blaze.coreK);
  });

  it('packs flames into the four vec4 arrays the shader reads, skipping dark ones', () => {
    const pack = packFlames([
      flame({ x: 0.1, y: -0.2, width: 0.05, height: 0.2, seed: 3, layer: 0 }),
      flame({ brightness: 0 }),
      flame({ shape: 'wall', tongues: 7, halo: 0.4, coreK: 2000, blue: 0.5 }),
    ]);
    expect(pack.count).toBe(2);
    expect(Array.from(pack.a.slice(0, 4))).toEqual([0.1, -0.2, 0.05, 0.2].map(Math.fround));
    expect(pack.b[3]).toBe(3);
    expect(pack.d[2]).toBe(0);
    expect(Array.from(pack.d.slice(4, 8))).toEqual([1, 7, 1, Math.fround(0.4)]);
    expect(Array.from(pack.c.slice(4, 6))).toEqual([2000, 0.5]);
    // A shorter list leaves nothing behind.
    packFlames([flame()], pack);
    expect(pack.count).toBe(1);
    expect(pack.a[4]).toBe(0);
  });

  it('never packs more than the shader holds', () => {
    const many = Array.from({ length: MAX_FLAMES + 5 }, (_, i) => flame({ seed: i }));
    const pack = packFlames(many, emptyPack());
    expect(pack.count).toBe(MAX_FLAMES);
    expect(FLAME_MAX).toBe(MAX_FLAMES);
    expect(FLAME_GLSL).toContain(`#define FLAME_MAX ${MAX_FLAMES}`);
  });

  it('colours by blackbody: red when cool, toward white when hot', () => {
    const [r1, g1, b1] = blackbody(1200);
    expect(r1).toBe(1);
    expect(g1).toBeLessThan(0.5);
    expect(b1).toBe(0);
    const [, g3, b3] = blackbody(3400);
    expect(g3).toBeGreaterThan(g1);
    expect(b3).toBeGreaterThan(b1);
    const w = blackbody(6600);
    for (const c of w) expect(c).toBeGreaterThan(0.95);
  });

  it('bakes the ramp the shader reads: brighter green and blue as it heats', () => {
    const ramp = blackbodyRamp();
    expect(ramp.length).toBe(RAMP_SIZE * 4);
    const at = (i: number) => Array.from(ramp.slice(i * 4, i * 4 + 4));
    expect(at(0)[0]).toBe(255);
    expect(at(0)[2]).toBe(0);
    expect(at(RAMP_SIZE - 1)[2]).toBeGreaterThan(200);
    for (let i = 1; i < RAMP_SIZE; i++)
      expect(ramp[i * 4 + 1]).toBeGreaterThanOrEqual(ramp[(i - 1) * 4 + 1]);
  });

  it('makes the same noise texture every time, well spread', () => {
    const a = flameNoiseData(64);
    expect(a).toEqual(flameNoiseData(64));
    const mean = a.reduce((s, v) => s + v, 0) / a.length;
    expect(mean).toBeGreaterThan(120);
    expect(mean).toBeLessThan(135);
  });

  it('flickers smoothly within -1..1, never jumping between frames', () => {
    let prev = flicker(0, 1);
    let lo = 1;
    let hi = -1;
    for (let t = 1 / 60; t < 20; t += 1 / 60) {
      const v = flicker(t, 1);
      expect(Math.abs(v - prev)).toBeLessThan(0.25);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
      prev = v;
    }
    expect(lo).toBeGreaterThanOrEqual(-1);
    expect(hi).toBeLessThanOrEqual(1);
    expect(hi - lo).toBeGreaterThan(0.5);
    expect(flicker(3, 1)).not.toBe(flicker(3, 2));
  });
});
