import { describe, expect, it } from 'vitest';

import {
  allLooks,
  BUILT_IN_LOOKS,
  makeLook,
  nextName,
  parseSaved,
  removeLook,
  type SavedLook,
  VALUE_KEYS,
} from './geometry-saved';

const values = {
  symmetry: 6,
  complexity: 5,
  glow: 2,
  breathSpeed: 0.3,
  intensity: 7,
  particles: 4,
  luminous: 0.8,
  stars: 0,
};

describe('the first saved look', () => {
  it('is the Rorschach oil fractal Martin sent', () => {
    const first = BUILT_IN_LOOKS[0] as SavedLook;
    expect(first.mode).toBe('rorschach');
    expect(first.values).toEqual({
      breathSpeed: 0.25,
      symmetry: 10,
      complexity: 8,
      particles: 9.5,
      glow: 1.5,
      intensity: 6,
      luminous: 0.3,
      stars: 0,
    });
    expect(first.builtIn).toBe(true);
  });

  it('comes first, before the saved ones', () => {
    const mine = makeLook({ mode: 'oilwarp', values }, 'Oil Warp', [], 1);
    expect(allLooks([mine]).map((l) => l.id)).toEqual(['oil-fractal-1', mine.id]);
  });
});

describe('saving', () => {
  it('names a look after its mode with the next free number', () => {
    const a = makeLook({ mode: 'rorschach', values }, 'Rorschach Oils', [], 1);
    expect(a.name).toBe('Rorschach Oils 1');
    expect(nextName('Rorschach Oils', [a])).toBe('Rorschach Oils 2');
  });

  it('keeps the oil colours and palette when there are some', () => {
    const colours = ['#000000', '#111111', '#222222', '#333333'];
    const l = makeLook(
      { mode: 'rorschach', values, oilColors: colours, preset: 'Lava' },
      'R',
      [],
      1,
    );
    expect(l.oilColors).toEqual(colours);
    expect(l.preset).toBe('Lava');
    expect(makeLook({ mode: 'rorschach', values }, 'R', [], 1).oilColors).toBeUndefined();
  });

  it('deletes only the one asked', () => {
    const a = makeLook({ mode: 'x', values }, 'X', [], 1);
    const b = makeLook({ mode: 'x', values }, 'X', [a], 2);
    expect(removeLook([a, b], a.id)).toEqual([b]);
  });
});

describe('reading what was saved', () => {
  it('round-trips a saved list', () => {
    const a = makeLook(
      { mode: 'rorschach', values, oilColors: ['#000000', '#111111', '#222222', '#333333'] },
      'R',
      [],
      5,
    );
    expect(parseSaved(JSON.stringify([a]))).toEqual([a]);
  });

  it('drops junk and survives bad storage', () => {
    expect(parseSaved('not json')).toEqual([]);
    expect(parseSaved(null)).toEqual([]);
    expect(parseSaved('{"a":1}')).toEqual([]);
    const broken = { id: 'x', name: 'x', mode: 'rorschach', values: { ...values, glow: 'loud' } };
    expect(parseSaved(JSON.stringify([broken]))).toEqual([]);
    const badColours = { id: 'y', name: 'y', mode: 'rorschach', values, oilColors: ['red'] };
    expect(parseSaved(JSON.stringify([badColours]))[0]?.oilColors).toBeUndefined();
  });

  it('knows every slider value it keeps', () => {
    expect([...VALUE_KEYS].sort()).toEqual(Object.keys(values).sort());
  });
});
