import { describe, expect, it } from 'vitest';

import {
  controlsOf,
  DEFAULT_CONTROLS,
  FIRE_SCENES,
  fireFrame,
  fitOf,
  MATCH_CYCLE,
  matchState,
} from './fire';
import { fireFragment } from './fire-shaders';
import { MAX_FLAMES } from './flame';

describe('Fire pieces', () => {
  it('has five pieces, small to big', () => {
    expect(FIRE_SCENES.map((s) => s.title)).toEqual([
      'Match',
      'Candle',
      'Gas Ring',
      'Campfire',
      'Wildfire',
    ]);
    const area = (s: number) => fireFrame(s, 5).flames.reduce((a, f) => a + f.width * f.height, 0);
    expect(area(0)).toBeLessThan(area(1));
    expect(area(1)).toBeLessThan(area(3));
    expect(area(3)).toBeLessThan(area(4));
  });

  it('fits every piece in what the shader holds', () => {
    for (let s = 0; s < FIRE_SCENES.length; s++) {
      expect(fireFrame(s, 3).flames.length).toBeLessThanOrEqual(MAX_FLAMES);
      expect(fireFragment(s)).toContain(`#define SCENE ${s}`);
    }
    expect(fireFragment(9)).toContain('#define SCENE 4');
  });

  it('burns each in its own colours: blue gas, a blue-rooted candle, red-orange wood', () => {
    const gas = fireFrame(2, 1).flames;
    expect(gas.every((f) => f.blue === 1 && f.luminous < 0.1)).toBe(true);
    const candle = fireFrame(1, 1).flames[0];
    expect(candle.blue).toBeGreaterThan(0.2);
    expect(candle.coreK).toBeGreaterThan(2800);
    const blaze = fireFrame(4, 1).flames;
    expect(blaze.every((f) => f.blue === 0)).toBe(true);
    expect(blaze.some((f) => f.shape === 'wall')).toBe(true);
    expect(blaze.some((f) => f.layer === 0) && blaze.some((f) => f.layer === 1)).toBe(true);
  });

  it('lives a match: swipe, strike with a flare and sparks, burn, go out, smoke, next', () => {
    const before = matchState(0.5);
    expect(before.size).toBe(0);
    expect(before.swipe).toBe(0);
    const strike = matchState(1.15);
    expect(strike.flare).toBeGreaterThan(0.6);
    expect(strike.burst).toBeGreaterThan(0.3);
    expect(strike.size).toBeGreaterThan(1.3);
    const burning = matchState(8);
    expect(burning.size).toBeGreaterThan(0.95);
    expect(burning.size).toBeLessThan(1.05);
    expect(burning.char).toBeGreaterThan(0.3);
    const out = matchState(17);
    expect(out.size).toBe(0);
    expect(out.smoke).toBeGreaterThan(0.5);
    expect(matchState(MATCH_CYCLE + 8).size).toBeCloseTo(burning.size, 6);
    // The flame never jumps between frames once lit.
    let prev = matchState(1.2).size;
    for (let t = 1.2; t < 18; t += 1 / 60) {
      const s = matchState(t).size;
      expect(Math.abs(s - prev)).toBeLessThan(0.1);
      prev = s;
    }
  });

  it('reads the builder sliders as controls', () => {
    const c = controlsOf({ complexity: 5.5, symmetry: 0, intensity: 5, glow: 5 });
    expect(c.turbulence).toBeCloseTo(1, 5);
    expect(c.wind).toBe(0);
    expect(c.heat).toBeCloseTo(1, 5);
    expect(c.embers).toBe(1);
    expect(controlsOf({ complexity: 1, symmetry: 9, intensity: 0, glow: 0 })).toMatchObject({
      wind: 1,
      embers: 0,
    });
  });

  it('leans the flames with the wind, makes them hotter with heat, and thins the smoke', () => {
    const calm = fireFrame(3, 4, DEFAULT_CONTROLS);
    const windy = fireFrame(3, 4, { ...DEFAULT_CONTROLS, wind: 1 });
    expect(windy.flames[1].lean).toBeGreaterThan(calm.flames[1].lean + 0.2);
    expect(windy.embers.wind).toBeGreaterThan(calm.embers.wind);
    const hot = fireFrame(3, 4, { ...DEFAULT_CONTROLS, heat: 1.25 });
    expect(hot.flames[1].coreK).toBeGreaterThan(calm.flames[1].coreK);
    expect(hot.smoke.amount).toBeLessThan(calm.smoke.amount);
    const noEmbers = fireFrame(4, 4, { ...DEFAULT_CONTROLS, embers: 0 });
    expect(noEmbers.embers.density).toBe(0);
  });

  it('spreads the wildfire across any screen and zooms out on narrow ones', () => {
    expect(fitOf(16 / 9)).toBe(1);
    expect(fitOf(0.5)).toBeLessThan(0.5);
    const wide = fireFrame(4, 2, DEFAULT_CONTROLS, 3);
    const wall = wide.flames.find((f) => f.shape === 'wall');
    expect(wall?.width).toBeGreaterThan(3);
  });

  it('flickers gently: light and size change little from frame to frame', () => {
    for (const s of [1, 3, 4]) {
      let prev = fireFrame(s, 2);
      for (let t = 2 + 1 / 60; t < 6; t += 1 / 60) {
        const f = fireFrame(s, t);
        expect(Math.abs(f.light.intensity - prev.light.intensity)).toBeLessThan(0.05);
        f.flames.forEach((fl, i) => {
          expect(Math.abs(fl.height - prev.flames[i].height)).toBeLessThan(0.02);
        });
        prev = f;
      }
    }
  });
});
