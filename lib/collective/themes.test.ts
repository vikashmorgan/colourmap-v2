import { describe, expect, it } from 'vitest';

import { DEMO_MEMBERS, type Member } from './model';
import { linksBetween, sharedThemes, themesOf } from './themes';

const person = (id: string, over: Partial<Member>): Member => ({
  id,
  name: id,
  color: '#fff',
  archetype: 'maker',
  style: '',
  skills: [],
  strengths: [],
  places: [],
  moments: [],
  intentions: [],
  ...over,
});

describe('themesOf', () => {
  it('finds every theme a phrase touches', () => {
    expect(themesOf('Open a studio and build an app')).toEqual(['space', 'app']);
  });

  it('is case-insensitive and empty when nothing matches', () => {
    expect(themesOf('COOK for friends')).toEqual(['table', 'people']);
    expect(themesOf('sail around the world')).toEqual([]);
  });
});

describe('linksBetween', () => {
  it('links two people who want the same thing', () => {
    const a = person('a', { intentions: ['open a studio'] });
    const b = person('b', { intentions: ['find a workshop to share'] });
    expect(linksBetween([a, b])).toEqual([{ a: 'a', b: 'b', kind: 'shared', themes: ['space'] }]);
  });

  it('links someone who can help with what another wants', () => {
    const a = person('a', { skills: ['photography'] });
    const b = person('b', { intentions: ['make a book of the city'] });
    expect(linksBetween([a, b])).toEqual([
      { a: 'a', b: 'b', kind: 'complement', themes: ['image'] },
    ]);
  });

  it('does not repeat a shared theme as a complement', () => {
    const a = person('a', { skills: ['code'], intentions: ['build an app'] });
    const b = person('b', { intentions: ['an app for the group'] });
    const links = linksBetween([a, b]);
    expect(links.find((l) => l.kind === 'complement')?.themes ?? []).not.toContain('app');
  });

  it('finds nothing between strangers with nothing in common', () => {
    expect(linksBetween([person('a', {}), person('b', {})])).toEqual([]);
  });

  it('connects the demo group', () => {
    expect(linksBetween(DEMO_MEMBERS).length).toBeGreaterThan(3);
  });
});

describe('sharedThemes', () => {
  it('keeps only themes two or more people want, with who wants them', () => {
    const themes = sharedThemes(DEMO_MEMBERS);
    const app = themes.find((t) => t.id === 'app');
    expect(app?.who).toEqual(['vic', 'martin']);
    expect(themes.every((t) => t.who.length >= 2)).toBe(true);
  });
});
