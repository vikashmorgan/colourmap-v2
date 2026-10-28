import { describe, expect, it } from 'vitest';

import { fillPercent, fillStyle, sliderClass } from './slider';

describe('art sliders', () => {
  it('fills the track as far as the value goes, never past the ends', () => {
    expect(fillPercent(5, 0, 10)).toBe(50);
    expect(fillPercent(-3, 0, 10)).toBe(0);
    expect(fillPercent(12, 0, 10)).toBe(100);
    expect(fillPercent(1, 1, 1)).toBe(0);
    expect(fillStyle(0.25, 0, 1)).toEqual({ '--fill': '25.0%' });
  });

  it('names the sand and magma skins', () => {
    expect(sliderClass('sand')).toBe('art-slider sand');
    expect(sliderClass('magma')).toBe('art-slider magma');
  });
});
