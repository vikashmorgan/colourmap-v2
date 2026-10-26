import { describe, expect, it } from 'vitest';

import { hexToHsl, hslToHex, hslToRgb, hueSatToPoint, pointToHueSat } from './colour-wheel';

describe('colour conversions', () => {
  it('turns hue, saturation and lightness into hex', () => {
    expect(hslToHex({ h: 0, s: 1, l: 0.5 })).toBe('#ff0000');
    expect(hslToHex({ h: 120, s: 1, l: 0.5 })).toBe('#00ff00');
    expect(hslToHex({ h: 240, s: 1, l: 0.5 })).toBe('#0000ff');
    expect(hslToHex({ h: 360 + 60, s: 1, l: 0.5 })).toBe('#ffff00');
    expect(hslToHex({ h: 0, s: 0, l: 1 })).toBe('#ffffff');
    expect(hslToRgb(300, 1, 0.5)).toEqual([255, 0, 255]);
  });

  it('round-trips through hex', () => {
    for (const hex of ['#f4b26a', '#9c2f45', '#2a6ac8', '#808080']) {
      expect(hslToHex(hexToHsl(hex))).toBe(hex);
    }
    expect(hexToHsl('nope')).toEqual({ h: 0, s: 0, l: 0 });
  });
});

describe('the wheel', () => {
  it('has red at the top, turning clockwise, grey at the centre', () => {
    expect(pointToHueSat(0, -100, 100)).toEqual({ h: 0, s: 1 });
    expect(pointToHueSat(100, 0, 100).h).toBeCloseTo(90);
    expect(pointToHueSat(0, 50, 100)).toEqual({ h: 180, s: 0.5 });
    expect(pointToHueSat(0, 0, 100).s).toBe(0);
  });

  it('keeps to the rim when dragged past it', () => {
    expect(pointToHueSat(0, -300, 100).s).toBe(1);
  });

  it('finds the point for a colour again', () => {
    const p = hueSatToPoint(225, 0.6, 100);
    const back = pointToHueSat(p.x, p.y, 100);
    expect(back.h).toBeCloseTo(225);
    expect(back.s).toBeCloseTo(0.6);
  });
});
