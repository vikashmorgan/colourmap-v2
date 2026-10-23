import { describe, expect, it } from 'vitest';

import {
  applyFill,
  BEAT_ROWS,
  bassChoices,
  CORE_LOOPS,
  clonePattern,
  emptyPattern,
  getLoop,
  isBeatPattern,
  muteKick,
  patternLength,
  resizePattern,
  scaleBass,
} from './beat-loops';

const melodic = getLoop('melodic').pattern;

describe('core loops', () => {
  it('has six loops with unique ids and the spec tempos', () => {
    expect(CORE_LOOPS).toHaveLength(6);
    expect(new Set(CORE_LOOPS.map((l) => l.id)).size).toBe(6);
    expect(CORE_LOOPS.map((l) => [l.label, l.bpm])).toEqual([
      ['Melodic', 120],
      ['Minimal', 126],
      ['Deep House', 122],
      ['Tropical', 110],
      ['Organic / Afro', 118],
      ['Hypnotic Techno', 130],
    ]);
  });

  it.each(CORE_LOOPS.map((l) => [l.id, l] as const))('%s is a valid pattern', (_id, loop) => {
    expect(isBeatPattern(loop.pattern)).toBe(true);
    expect(loop.swing).toBeGreaterThanOrEqual(0);
    expect(loop.swing).toBeLessThanOrEqual(0.6);
    expect(loop.description.length).toBeGreaterThan(0);
    const len = patternLength(loop.pattern);
    // Every bass hit has a note and every note has a hit.
    for (let i = 0; i < len; i++) {
      expect(loop.pattern.steps.bass[i] > 0).toBe(loop.pattern.bassNotes[i] !== null);
    }
    // Every loop has a kick.
    expect(loop.pattern.steps.kick.some((v) => v > 0)).toBe(true);
    // Notes stay inside what the bass picker offers (an octave either side).
    for (const n of loop.pattern.bassNotes)
      if (n !== null) expect(Math.abs(n)).toBeLessThanOrEqual(12);
  });

  it('keeps the genre signatures', () => {
    expect(getLoop('hypnotic').pattern.steps.clap.every((v) => v === 0)).toBe(true);
    const house = getLoop('deep-house').pattern.steps.clap;
    expect(house[4]).toBe(1);
    expect(house[12]).toBeGreaterThan(0.9);
    expect(getLoop('tropical').swing).toBeGreaterThan(0);
    const minimalBass = getLoop('minimal').pattern.steps.bass.filter((v) => v > 0);
    expect(minimalBass.length).toBeLessThanOrEqual(1);
  });

  it('falls back to the first loop for an unknown id', () => {
    expect(getLoop('nope').id).toBe(CORE_LOOPS[0].id);
  });
});

describe('pattern helpers', () => {
  it('builds empty patterns of 1, 2 and 4 bars', () => {
    const p = emptyPattern(4);
    expect(patternLength(p)).toBe(64);
    expect(isBeatPattern(p)).toBe(true);
    expect(emptyPattern().bars).toBe(1);
  });

  it('clones deeply', () => {
    const c = clonePattern(melodic);
    c.steps.kick[0] = 0;
    expect(melodic.steps.kick[0]).toBe(1);
  });

  it('resizes by repeating bars and cuts when shrinking', () => {
    const two = resizePattern(melodic, 2);
    expect(two.bars).toBe(2);
    expect(two.steps.kick.slice(16)).toEqual(melodic.steps.kick);
    expect(two.bassNotes.slice(16)).toEqual(melodic.bassNotes);
    two.steps.kick[20] = 0.5;
    const one = resizePattern(two, 1);
    expect(one.steps.kick).toEqual(melodic.steps.kick);
  });

  it('rejects malformed patterns', () => {
    expect(isBeatPattern(null)).toBe(false);
    expect(isBeatPattern({ bars: 3 })).toBe(false);
    expect(isBeatPattern({ ...melodic, steps: null })).toBe(false);
    const bad = clonePattern(melodic);
    bad.steps.kick[0] = 2;
    expect(isBeatPattern(bad)).toBe(false);
    const short = clonePattern(melodic);
    short.steps.perc = [1];
    expect(isBeatPattern(short)).toBe(false);
    expect(isBeatPattern({ ...melodic, bassNotes: [] })).toBe(false);
    expect(isBeatPattern({ ...melodic, bassNotes: melodic.bassNotes.map(() => 0.5) })).toBe(false);
  });
});

describe('applyFill', () => {
  it('returns the pattern as written at 0.5', () => {
    expect(applyFill(melodic, 0.5)).toEqual(melodic);
  });

  it('strips everything but kick and hats at 0', () => {
    const p = applyFill(melodic, 0);
    expect(p.steps.kick).toEqual(melodic.steps.kick);
    expect(p.steps.closedHat).toEqual(melodic.steps.closedHat);
    expect(p.steps.openHat).toEqual(melodic.steps.openHat);
    for (const row of ['clap', 'perc', 'bass'] as const) {
      expect(p.steps[row].every((v) => v === 0)).toBe(true);
    }
    expect(p.bassNotes.every((n) => n === null)).toBe(true);
  });

  it('drops the softest hits first on the way down', () => {
    const p = applyFill(melodic, 0.2);
    const count = (row: number[]) => row.filter((v) => v > 0).length;
    expect(count(p.steps.bass)).toBeLessThan(count(melodic.steps.bass));
    expect(count(p.steps.bass)).toBeGreaterThan(0);
    // Remaining hits keep their velocity.
    for (let i = 0; i < 16; i++) {
      if (p.steps.bass[i] > 0) expect(p.steps.bass[i]).toBe(melodic.steps.bass[i]);
    }
  });

  it('adds ghost hats, perc and a kick ghost at 1', () => {
    const p = applyFill(melodic, 1);
    const count = (row: number[]) => row.filter((v) => v > 0).length;
    expect(count(p.steps.closedHat)).toBeGreaterThan(count(melodic.steps.closedHat));
    expect(count(p.steps.perc)).toBeGreaterThan(count(melodic.steps.perc));
    expect(p.steps.kick[14]).toBe(0.3);
    // Written hits are never changed by adding ghosts.
    for (const row of BEAT_ROWS) {
      melodic.steps[row].forEach((v, i) => {
        if (v > 0) expect(p.steps[row][i]).toBe(v);
      });
    }
  });

  it('clamps out-of-range fill and leaves the input untouched', () => {
    const before = clonePattern(melodic);
    expect(applyFill(melodic, -1)).toEqual(applyFill(melodic, 0));
    expect(applyFill(melodic, 5)).toEqual(applyFill(melodic, 1));
    expect(melodic).toEqual(before);
  });
});

describe('muteKick', () => {
  it('silences only the kick', () => {
    const p = muteKick(melodic);
    expect(p.steps.kick.every((v) => v === 0)).toBe(true);
    expect(p.steps.openHat).toEqual(melodic.steps.openHat);
    expect(melodic.steps.kick[0]).toBe(1);
  });
});

describe('scaleBass', () => {
  const minorPent = [0, 3, 5, 7, 10];

  it('snaps notes to the nearest scale degree, ties going down', () => {
    expect(scaleBass([0, 1, 2, 4, 6, 11, null], minorPent)).toEqual([0, 0, 3, 3, 5, 10, null]);
  });

  it('keeps the octave, including below the root', () => {
    expect(scaleBass([12, 14, -2, -1, -11], minorPent)).toEqual([12, 15, -2, -2, -12]);
  });

  it('accepts scales given past the octave and leaves notes alone for an empty scale', () => {
    expect(scaleBass([4], [12, 19])).toEqual([7]);
    expect(scaleBass([4, null], [])).toEqual([4, null]);
  });
});

describe('bassChoices', () => {
  it('spans an octave below to the octave above, sorted', () => {
    expect(bassChoices([7, 0, 3])).toEqual([-12, -9, -5, 0, 3, 7, 12]);
    expect(bassChoices([])).toEqual([-12, 0, 12]);
  });
});
