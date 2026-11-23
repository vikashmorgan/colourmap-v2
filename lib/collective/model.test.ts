import { describe, expect, it } from 'vitest';

import { ARCHETYPES, DEMO_MEMBERS } from './model';

describe('collective model', () => {
  it('has eight archetype stars', () => {
    expect(ARCHETYPES.map((a) => a.name)).toEqual([
      'Seer',
      'Rebel',
      'Maker',
      'Architect',
      'Keeper',
      'Healer',
      'Wanderer',
      'Muse',
    ]);
  });

  it('gives every demo member a full profile with a known archetype', () => {
    const ids = new Set(ARCHETYPES.map((a) => a.id));
    for (const m of DEMO_MEMBERS) {
      expect(ids.has(m.archetype)).toBe(true);
      expect(
        m.skills.length && m.intentions.length && m.places.length && m.moments.length,
      ).toBeTruthy();
    }
    expect(new Set(DEMO_MEMBERS.map((m) => m.id)).size).toBe(DEMO_MEMBERS.length);
  });
});
