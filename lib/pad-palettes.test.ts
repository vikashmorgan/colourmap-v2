import { describe, expect, it } from 'vitest';

import {
  contrastRatio,
  getPadPalette,
  PAD_PALETTES,
  padColor,
  paletteSwatch,
  readableInk,
} from './pad-palettes';

describe('pad palettes', () => {
  it('falls back to Earth for unknown ids', () => {
    expect(getPadPalette('nope').id).toBe('earth');
    expect(getPadPalette(null).id).toBe('earth');
    expect(getPadPalette('rainbow').id).toBe('rainbow');
  });

  it('keeps category colours for Earth', () => {
    expect(padColor(getPadPalette('earth'), 7, '#6890B0')).toBe('#6890B0');
  });

  it('walks palette colours by grid index and wraps', () => {
    const rainbow = getPadPalette('rainbow');
    expect(padColor(rainbow, 0, '#000000')).toBe(rainbow.colors[0]);
    expect(padColor(rainbow, 1, '#000000')).toBe(rainbow.colors[1]);
    expect(padColor(rainbow, rainbow.colors.length, '#000000')).toBe(rainbow.colors[0]);
  });

  it('swatches use category colours for Earth and up to four palette colours otherwise', () => {
    expect(paletteSwatch(getPadPalette('earth'), ['#111111', '#222222'])).toEqual([
      '#111111',
      '#222222',
    ]);
    expect(paletteSwatch(getPadPalette('warm'), [])).toHaveLength(4);
  });

  it('readableInk reaches AA contrast for every palette colour', () => {
    for (const p of PAD_PALETTES) {
      for (const c of p.colors) {
        expect(contrastRatio(readableInk(c), '#FBF6EC')).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('readableInk leaves already-dark colours alone', () => {
    expect(readableInk('#1F3A5F')).toBe('#1f3a5f');
  });

  it('night pads keep light text readable when on', () => {
    const night = getPadPalette('night');
    for (const c of night.colors) {
      expect(contrastRatio('#F5E8C8', c)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('solid palettes keep dark text readable on the full pad colour', () => {
    const pastel = getPadPalette('pastel');
    expect(pastel.solid).toBe(true);
    for (const c of pastel.colors) {
      expect(contrastRatio(readableInk(c, c), c)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
