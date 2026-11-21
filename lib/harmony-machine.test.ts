import { describe, expect, it } from 'vitest';
import {
  crossed,
  melodyPool,
  mtof,
  NEEDLE,
  PROGRESSIONS,
  paletteBlend,
  progressionFor,
  ringNote,
  wrapAngle,
} from './harmony-machine';

describe('wrapAngle', () => {
  it('keeps angles inside (-π, π]', () => {
    expect(wrapAngle(0)).toBeCloseTo(0);
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(-Math.PI);
    expect(wrapAngle(-2.5 * Math.PI)).toBeCloseTo(-0.5 * Math.PI);
  });
});

describe('crossed', () => {
  it('fires when a light passes the needle turning forward', () => {
    expect(crossed(NEEDLE - 0.1, NEEDLE + 0.1)).toBe(true);
  });
  it('fires when a light passes the needle turning back', () => {
    expect(crossed(NEEDLE + 0.1, NEEDLE - 0.1)).toBe(true);
  });
  it('stays quiet when a light does not reach the needle', () => {
    expect(crossed(NEEDLE + 0.1, NEEDLE + 0.3)).toBe(false);
  });
  it('stays quiet on the far side of the ring', () => {
    expect(crossed(NEEDLE + Math.PI - 0.1, NEEDLE + Math.PI + 0.1)).toBe(false);
  });
  it('works after many turns', () => {
    expect(crossed(NEEDLE + 20 * Math.PI - 0.05, NEEDLE + 20 * Math.PI + 0.05)).toBe(true);
  });
});

describe('mtof', () => {
  it('maps A4 and A3', () => {
    expect(mtof(69)).toBeCloseTo(440);
    expect(mtof(57)).toBeCloseTo(220);
  });
});

describe('progressionFor', () => {
  it('walks dusk, day, dawn along the gradient', () => {
    expect(progressionFor(0).name).toBe('dusk');
    expect(progressionFor(0.5).name).toBe('day');
    expect(progressionFor(1).name).toBe('dawn');
    expect(progressionFor(-3).name).toBe('dusk');
  });
  it('gives every colour a loop of four chords', () => {
    for (const p of PROGRESSIONS) expect(p.chords).toHaveLength(4);
  });
});

describe('melodyPool', () => {
  it('keeps only chord tones in the singing range', () => {
    const pool = melodyPool([48, 52, 55]); // C major
    expect(pool[0]).toBe(64);
    expect(pool.every((m) => [0, 4, 7].includes(m % 12))).toBe(true);
    expect(Math.max(...pool)).toBeLessThanOrEqual(86);
  });
});

describe('ringNote', () => {
  it('returns null with nothing to sing', () => {
    expect(ringNote([], 0, 0, 0, 0)).toBeNull();
  });
  it('shifts by the ring octave and keeps the low ring above the floor', () => {
    expect(ringNote([64, 67], 0, 0, 0, 12)).toBe(76);
    expect(ringNote([50], 0, 0, 0, -12)).toBe(43);
  });
});

describe('paletteBlend', () => {
  it('blends dusk to day, then day to dawn', () => {
    expect(paletteBlend(0)).toEqual({ index: 0, t: 0 });
    expect(paletteBlend(0.75).index).toBe(1);
    expect(paletteBlend(0.75).t).toBeCloseTo(0.5);
    expect(paletteBlend(2).index).toBe(1);
  });
});
