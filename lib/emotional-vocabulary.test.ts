import { describe, expect, it } from 'vitest';

import { getEmotionalWord } from './emotional-vocabulary';

describe('getEmotionalWord', () => {
  it.each([
    [0, 'Crushed'],
    [12, 'Crushed'],
    [13, 'Heavy'],
    [25, 'Heavy'],
    [26, 'Stuck'],
    [37, 'Stuck'],
    [38, 'Still'],
    [50, 'Still'],
    [51, 'Steady'],
    [62, 'Steady'],
    [63, 'Open'],
    [75, 'Open'],
    [76, 'Alive'],
    [87, 'Alive'],
    [88, 'Expansive'],
    [100, 'Expansive'],
  ])('returns "%s" for value %i', (value, expected) => {
    expect(getEmotionalWord(value)).toBe(expected);
  });

  it('returns "Expansive" for values above 100', () => {
    expect(getEmotionalWord(150)).toBe('Expansive');
  });
});
