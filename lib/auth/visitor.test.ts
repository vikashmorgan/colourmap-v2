import { describe, expect, it } from 'vitest';

import { isVisitorPath, VISITOR_PATHS } from './visitor';

describe('isVisitorPath', () => {
  it('allows the public visuals route and its sub-paths', () => {
    expect(isVisitorPath('/geometry-field')).toBe(true);
    expect(isVisitorPath('/geometry-field/')).toBe(true);
    expect(isVisitorPath('/geometry-field/anything')).toBe(true);
  });

  it('keeps every other app route behind the login wall', () => {
    for (const path of ['/day', '/circles', '/chat', '/education', '/', '/journal']) {
      expect(isVisitorPath(path)).toBe(false);
    }
  });

  it('does not allow lookalike prefixes', () => {
    // A path that merely starts with the same letters must not slip through.
    expect(isVisitorPath('/geometry-fields-secret')).toBe(false);
    expect(isVisitorPath('/geometry')).toBe(false);
  });

  it('treats missing/empty pathnames as not public', () => {
    expect(isVisitorPath(null)).toBe(false);
    expect(isVisitorPath(undefined)).toBe(false);
    expect(isVisitorPath('')).toBe(false);
  });

  it('exposes only the visuals route in the allowlist', () => {
    expect(VISITOR_PATHS).toEqual(['/geometry-field']);
  });
});
