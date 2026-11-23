import { describe, expect, it } from 'vitest';

import { profileFrom, QUESTIONS, splitList } from './onboarding';

describe('onboarding', () => {
  it('asks one question per profile field', () => {
    expect(QUESTIONS.map((q) => q.field)).toEqual([
      'archetype',
      'style',
      'skills',
      'strengths',
      'places',
      'moments',
      'intentions',
    ]);
  });

  it('splits answers on commas, semicolons and lines, dropping blanks', () => {
    expect(splitList('code, design;\n photos ,, ')).toEqual(['code', 'design', 'photos']);
    expect(splitList(undefined)).toEqual([]);
    expect(splitList('a,b,c,d,e,f,g,h')).toHaveLength(6);
  });

  it('builds a profile from answers', () => {
    const me = profileFrom(
      {
        name: ' Ana Sol ',
        archetype: 'muse',
        skills: 'singing, writing',
        intentions: 'record an EP',
      },
      2,
    );
    expect(me).toMatchObject({
      id: 'me-ana-sol',
      name: 'Ana Sol',
      archetype: 'muse',
      skills: ['singing', 'writing'],
      intentions: ['record an EP'],
      places: [],
    });
    expect(me?.color).toMatch(/^#/);
  });

  it('needs a name and falls back to Maker for an unknown archetype', () => {
    expect(profileFrom({ name: '  ' }, 0)).toBeNull();
    expect(profileFrom({ name: 'Bo', archetype: 'wizard' }, 0)?.archetype).toBe('maker');
  });
});
