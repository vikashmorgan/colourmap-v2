import { describe, expect, it } from 'vitest';

import { magicLinkRedirect, normaliseEmail } from './magic-link';

describe('normaliseEmail', () => {
  it('trims and lowercases a valid email', () => {
    expect(normaliseEmail('  Someone@Example.COM ')).toBe('someone@example.com');
  });

  it('rejects malformed values', () => {
    for (const bad of ['', 'no-at', 'a@b', 'a b@c.de', '@x.io', null, 42, undefined]) {
      expect(normaliseEmail(bad)).toBeNull();
    }
  });

  it('rejects overlong emails', () => {
    expect(normaliseEmail(`${'a'.repeat(250)}@x.io`)).toBeNull();
  });
});

describe('magicLinkRedirect', () => {
  it('points at the callback with next=/chill', () => {
    expect(magicLinkRedirect('https://colourmap.app')).toBe(
      'https://colourmap.app/callback?next=%2Fchill',
    );
  });
});
