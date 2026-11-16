import { describe, expect, it } from 'vitest';

import {
  blendWeather,
  gustAt,
  moteAmount,
  moteColour,
  newWeather,
  setWeather,
  stepWeather,
  WEATHER_BLEND,
  WEATHERS,
  WORLD_MOTES,
  weatherById,
  weatherNow,
} from './weather';

describe('weather presets', () => {
  it('runs from clear through sand and dust to rain and snow', () => {
    expect(WEATHERS.map((w) => w.name)).toEqual([
      'Clear',
      'Light sand',
      'Sandstorm',
      'Dust devils',
      'Rain',
      'Light snow',
      'Snowstorm',
    ]);
    expect(weatherById('nope').id).toBe('clear');
  });

  it('keeps the clear evening exactly as the pieces have it: no haze, no tint', () => {
    const c = weatherById('clear');
    expect(c.fogDensity).toBe(0);
    expect(c.tintAmount).toBe(0);
    expect(c.light).toBe(1);
  });

  it('makes the storms thick: low visibility, gusts, a dim sun', () => {
    for (const id of ['sandstorm', 'snowstorm']) {
      const w = weatherById(id);
      expect(w.fogDensity).toBeGreaterThan(weatherById('sand').fogDensity);
      expect(w.gust).toBeGreaterThan(2);
      expect(w.sun).toBeLessThan(0.5);
      expect(w.below).toBe(1);
    }
    expect(weatherById('snowstorm').snow).toBe(1);
    expect(weatherById('rain').wet).toBe(1);
    expect(weatherById('devils').devils).toBe(1);
  });

  it("uses each world's own motes in clear weather", () => {
    expect(moteColour(weatherById('clear'), 'salt')).toEqual(WORLD_MOTES.salt);
    expect(moteColour(weatherById('clear'), 'canyon')).toEqual(WORLD_MOTES.canyon);
    expect(moteColour(weatherById('snow'), 'canyon')).toEqual(weatherById('snow').mote);
    // Coast Road's are the piece's own warm white.
    expect(WORLD_MOTES.coast).toEqual([1, 0.95, 0.92]);
  });
});

describe('blending', () => {
  it('blends every number and colour, from a to b', () => {
    const a = weatherById('clear');
    const b = weatherById('sandstorm');
    const half = blendWeather(a, b, 0.5, 'salt');
    expect(half.fogDensity).toBeCloseTo(b.fogDensity / 2);
    expect(half.light).toBeCloseTo((a.light + b.light) / 2);
    expect(half.id).toBe('sandstorm');
    expect(blendWeather(a, b, 0, 'salt').fogDensity).toBe(0);
    expect(blendWeather(a, b, 2, 'salt').fogDensity).toBe(b.fogDensity);
  });

  it('takes two seconds to change, eased, and changes from wherever it had got to', () => {
    let s = newWeather('clear');
    s = setWeather(s, 'snowstorm', 'salt');
    expect(s.k).toBe(0);
    expect(weatherNow(s, 'salt').fogDensity).toBe(0);
    s = stepWeather(s, WEATHER_BLEND / 2);
    const mid = weatherNow(s, 'salt').fogDensity;
    expect(mid).toBeCloseTo(weatherById('snowstorm').fogDensity / 2);
    // Turned back half-way: it starts from the half-way weather, not from the storm.
    const back = setWeather(s, 'clear', 'salt');
    expect(weatherNow(back, 'salt').fogDensity).toBeCloseTo(mid);
    s = stepWeather(stepWeather(s, 5), 5);
    expect(s.k).toBe(1);
    expect(weatherNow(s, 'salt').fogDensity).toBe(weatherById('snowstorm').fogDensity);
    // Asking for the weather it already has changes nothing.
    expect(setWeather(s, 'snowstorm', 'salt')).toBe(s);
  });
});

describe('motes and gusts', () => {
  it('grows the motes with speed and the boost, within reason', () => {
    const c = weatherById('clear');
    expect(moteAmount(c, 1, 0)).toBeGreaterThan(moteAmount(c, 0, 0));
    expect(moteAmount(c, 1, 2)).toBeGreaterThan(moteAmount(c, 1, 0));
    expect(moteAmount(weatherById('snowstorm'), 1.5, 2)).toBeLessThanOrEqual(1.15);
    // The Coast Road piece at its glow of 5: 0.5 × (0.15 + 0.35 n).
    expect(moteAmount(c, 1, 0)).toBeCloseTo(0.25);
  });

  it('gusts only in windy weather, and never past its strength', () => {
    expect(gustAt(weatherById('clear'), 3)).toBe(0);
    const s = weatherById('sandstorm');
    for (let t = 0; t < 60; t += 0.7) expect(Math.abs(gustAt(s, t))).toBeLessThanOrEqual(s.gust);
  });
});
