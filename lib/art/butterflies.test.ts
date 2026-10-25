import { describe, expect, it } from 'vitest';

import {
  clampSettings,
  frameName,
  hexToRgb,
  LIMITS,
  PALETTES,
  PIECES,
  paletteById,
  pieceBySlug,
  rampUniform,
  SLIDER_KEYS,
} from './butterflies';

const HEX = /^#[0-9a-f]{6}$/i;

describe('palettes', () => {
  it('each has two background colours and a six-stop ramp, all valid', () => {
    for (const p of PALETTES) {
      expect(p.bg.every((c) => HEX.test(c))).toBe(true);
      expect(p.ramp).toHaveLength(6);
      expect(p.ramp.every((c) => HEX.test(c))).toBe(true);
    }
  });

  it('packs the ramp as 18 numbers between 0 and 1', () => {
    const r = rampUniform(paletteById('thermal'));
    expect(r).toHaveLength(18);
    expect(r.every((v) => v >= 0 && v <= 1)).toBe(true);
  });

  it('falls back to the first palette for an unknown id', () => {
    expect(paletteById('nope')).toBe(PALETTES[0]);
  });
});

describe('pieces', () => {
  it('have unique slugs, real palettes and settings inside the limits', () => {
    expect(new Set(PIECES.map((p) => p.slug)).size).toBe(PIECES.length);
    for (const p of PIECES) {
      expect(PALETTES.some((pal) => pal.id === p.palette)).toBe(true);
      expect(clampSettings(p.settings)).toEqual(p.settings);
    }
  });

  it('includes the eclipse and the iridescent drop', () => {
    expect(pieceBySlug('eclipse')?.settings.streaks).toBeGreaterThan(0);
    expect(pieceBySlug('opal-drop')?.settings.iris).toBeGreaterThan(0);
  });

  it('has a slider for every setting', () => {
    expect([...SLIDER_KEYS].sort()).toEqual(Object.keys(PIECES[0]?.settings ?? {}).sort());
  });
});

describe('helpers', () => {
  it('clamps settings and rounds the counts', () => {
    const base = (PIECES[0] as (typeof PIECES)[number]).settings;
    const c = clampSettings({
      ...base,
      slices: 99,
      echoes: 2.6,
      fold: 0,
      flow: -1,
      speed: Number.NaN,
    });
    expect(c.slices).toBe(LIMITS.slices.max);
    expect(c.echoes).toBe(3);
    expect(c.fold).toBe(1);
    expect(c.flow).toBe(0);
    expect(Number.isFinite(c.speed)).toBe(true);
  });

  it('reads hex colours, short and long', () => {
    expect(hexToRgb('#ff0000')).toEqual([1, 0, 0]);
    expect(hexToRgb('#0f0')).toEqual([0, 1, 0]);
    expect(hexToRgb('nope')).toEqual([0, 0, 0]);
  });

  it('names a saved frame after the piece, and the palette when changed', () => {
    const p = pieceBySlug('eclipse') as (typeof PIECES)[number];
    expect(frameName(p, 'eclipse')).toBe('liquid-butterfly-eclipse.png');
    expect(frameName(p, 'gold')).toBe('liquid-butterfly-eclipse-gold.png');
  });
});
