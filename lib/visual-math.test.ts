import { describe, expect, it } from 'vitest';

import {
  advancePhase,
  flightOffset,
  fourierRadius,
  GOLDEN_ANGLE,
  goldenHue,
  hslToRgb,
  oilPaletteStops,
  parseCssColor,
  polygonRadius,
  recycledDepth,
  rgbToHsl,
  shiftHue,
  smoothstepEdge,
  superformula,
  tunnelFade,
  wrap,
} from './visual-math';

describe('wrap / recycledDepth', () => {
  it('wraps negative and overflowing values into [0, n)', () => {
    expect(wrap(-1, 10)).toBe(9);
    expect(wrap(23, 10)).toBe(3);
    expect(wrap(0, 10)).toBe(0);
  });

  it('moves elements toward the camera as travel grows, then recycles them far away', () => {
    expect(recycledDepth(5, 0, 40)).toBe(5);
    expect(recycledDepth(5, 2, 40)).toBe(3);
    expect(recycledDepth(5, 6, 40)).toBe(39);
  });
});

describe('smoothstepEdge', () => {
  it('clamps outside the edges and eases between them', () => {
    expect(smoothstepEdge(0, 1, -2)).toBe(0);
    expect(smoothstepEdge(0, 1, 3)).toBe(1);
    expect(smoothstepEdge(0, 1, 0.5)).toBeCloseTo(0.5);
  });

  it('treats equal edges as a hard step', () => {
    expect(smoothstepEdge(1, 1, 0.5)).toBe(0);
    expect(smoothstepEdge(1, 1, 1.5)).toBe(1);
  });
});

describe('tunnelFade', () => {
  it('is fully lit mid-tunnel, near the centre of the screen', () => {
    expect(tunnelFade(10, 40, 0.3)).toBe(1);
  });

  it('dissolves at the camera, at the vanishing point and at the rim', () => {
    expect(tunnelFade(0, 40, 0.3)).toBe(0);
    expect(tunnelFade(40, 40, 0.3)).toBe(0);
    expect(tunnelFade(10, 40, 1.2)).toBe(0);
  });

  it('fades smoothly, never jumping', () => {
    const a = tunnelFade(10, 40, 0.9);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
  });
});

describe('goldenHue', () => {
  it('stays in [0, 1) and never repeats across a long run', () => {
    const hues = Array.from({ length: 200 }, (_, k) => goldenHue(k));
    for (const h of hues) {
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
    }
    expect(new Set(hues.map((h) => h.toFixed(6))).size).toBe(200);
  });

  it('keeps neighbours far apart on the hue wheel', () => {
    const d = Math.abs(goldenHue(1) - goldenHue(0));
    expect(Math.min(d, 1 - d)).toBeGreaterThan(0.3);
  });

  it('exposes the golden angle (~137.5°)', () => {
    expect((GOLDEN_ANGLE * 180) / Math.PI).toBeCloseTo(137.508, 2);
  });
});

describe('superformula', () => {
  it('is a unit circle when m = 0 and exponents are equal', () => {
    for (const th of [0, 1, 2, 3]) expect(superformula(th, 0, 2, 2, 2)).toBeCloseTo(1);
  });

  it('has m-fold symmetry', () => {
    const m = 5;
    const th = 0.37;
    expect(superformula(th, m, 0.5, 2, 2)).toBeCloseTo(
      superformula(th + (Math.PI * 2) / m, m, 0.5, 2, 2),
    );
  });

  it('returns 0 for degenerate input instead of NaN or Infinity', () => {
    expect(superformula(1, 4, 0, 1, 1)).toBe(0);
  });
});

describe('polygonRadius', () => {
  it('touches 1 at the corners and the apothem mid-edge', () => {
    expect(polygonRadius(0, 6)).toBeCloseTo(1);
    expect(polygonRadius(Math.PI / 6, 6)).toBeCloseTo(Math.cos(Math.PI / 6));
  });

  it('never drops below three sides', () => {
    expect(polygonRadius(0, 1)).toBeCloseTo(polygonRadius(0, 3));
  });
});

describe('fourierRadius', () => {
  it('is a plain circle with no wobble', () => {
    expect(fourierRadius(1.2, 4, 7, 0)).toBe(1);
  });

  it('stays bounded by the harmonic sum', () => {
    const bound = 1 + 0.3 * (1 + 1 / 4 + 1 / 9);
    for (let i = 0; i < 50; i++) {
      const r = fourierRadius(i * 0.3, i * 0.7, i, 0.3);
      expect(r).toBeLessThanOrEqual(bound + 1e-9);
      expect(r).toBeGreaterThanOrEqual(2 - bound - 1e-9);
    }
  });
});

describe('flightOffset', () => {
  it('keeps the ring at the camera centred', () => {
    const [x, y] = flightOffset(0, 12.3, 1);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
  });

  it('is straight when the curve amount is zero', () => {
    const [x, y] = flightOffset(20, 5, 0);
    expect(Math.abs(x) + Math.abs(y)).toBe(0);
  });

  it('swings the far rings when curved', () => {
    const [x, y] = flightOffset(20, 5, 1);
    expect(Math.hypot(x, y)).toBeGreaterThan(0.1);
  });
});

describe('parseCssColor', () => {
  it('parses hex, short hex, rgb and rgba', () => {
    expect(parseCssColor('#ff0000')).toEqual([1, 0, 0]);
    expect(parseCssColor('#0f0')).toEqual([0, 1, 0]);
    expect(parseCssColor('rgb(0, 0, 255)')).toEqual([0, 0, 1]);
    expect(parseCssColor('rgba(255,255,255,0.5)')).toEqual([1, 1, 1]);
  });

  it('falls back to black on bad input', () => {
    expect(parseCssColor('teal')).toEqual([0, 0, 0]);
    expect(parseCssColor('#12')).toEqual([0, 0, 0]);
    expect(parseCssColor('rgb(a,b,c)')).toEqual([0, 0, 0]);
  });
});

describe('hsl conversions', () => {
  it('round-trips colours', () => {
    const c: [number, number, number] = [0.8, 0.3, 0.55];
    const back = hslToRgb(rgbToHsl(c));
    back.forEach((v, i) => expect(v).toBeCloseTo(c[i]));
  });

  it('handles greys', () => {
    expect(rgbToHsl([0.5, 0.5, 0.5])).toEqual([0, 0, 0.5]);
    expect(hslToRgb([0.3, 0, 0.5])).toEqual([0.5, 0.5, 0.5]);
  });

  it('shiftHue by a full turn is a no-op, by a half turn gives the complement', () => {
    shiftHue([1, 0, 0], 1).forEach((v, i) => expect(v).toBeCloseTo([1, 0, 0][i]));
    shiftHue([1, 0, 0], 0.5).forEach((v, i) => expect(v).toBeCloseTo([0, 1, 1][i]));
  });
});

describe('oilPaletteStops', () => {
  it('derives ground, main, light and neighbour stops from a palette', () => {
    const [ground, main, light, neighbour] = oilPaletteStops({
      bg0: '#000000',
      line: 'rgba(255,0,0,0.6)',
      dots: 'rgba(255,200,200,0.7)',
      rgb: [255, 0, 0],
    });
    expect(main).toEqual([1, 0, 0]);
    expect(light[0]).toBeCloseTo(1);
    // Ground is lifted off pure black by a hint of the main colour.
    expect(ground[0]).toBeGreaterThan(0);
    expect(ground[0]).toBeLessThan(0.2);
    expect(neighbour).not.toEqual(main);
  });
});

describe('advancePhase', () => {
  it('integrates elapsed time × speed', () => {
    const clock = { phase: 0, last: null as number | null };
    advancePhase(clock, 1000, 2);
    expect(clock.phase).toBe(0);
    advancePhase(clock, 1050, 2);
    expect(clock.phase).toBeCloseTo(0.1);
  });

  it('clamps long gaps and backwards time so motion never jumps', () => {
    const clock = { phase: 0, last: 0 as number | null };
    advancePhase(clock, 60_000, 1);
    expect(clock.phase).toBeCloseTo(0.1);
    advancePhase(clock, 0, 1);
    expect(clock.phase).toBeCloseTo(0.1);
  });
});
