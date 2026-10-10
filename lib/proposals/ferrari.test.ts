import { describe, expect, it } from 'vitest';

import { FERRARI_PROJECT, FERRARI_QUOTES, FERRARI_SECTIONS, FERRARI_WORDS } from './ferrari';

describe('Ferrari pitch content', () => {
  it('has six movements, numbered in order', () => {
    expect(FERRARI_SECTIONS.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(FERRARI_SECTIONS[2].title).toBe('Technique vs spirit');
  });

  it('keeps the three recurring words', () => {
    expect(FERRARI_WORDS).toEqual(['Roots', 'Technique', 'Spirit']);
  });

  it('keeps the engine quote short, as asked', () => {
    expect(FERRARI_QUOTES.find((q) => q.text.startsWith("I don't sell cars"))?.text).toBe(
      "I don't sell cars; I sell engines.",
    );
  });

  it('puts the Flow collection forward as the project, ending in the walkable gallery', () => {
    expect(FERRARI_PROJECT.steps.at(-1)).toBe('3D gallery to walk through');
    expect(FERRARI_PROJECT.link).toBe('/art/flow');
  });
});
