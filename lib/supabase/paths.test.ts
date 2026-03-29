import { describe, expect, it } from 'vitest';

import { getSafeRedirectPath } from './paths';

describe('getSafeRedirectPath', () => {
  it('returns the requested in-app path', () => {
    expect(getSafeRedirectPath('/cockpit')).toBe('/cockpit');
  });

  it('falls back to the app root for empty values', () => {
    expect(getSafeRedirectPath(null)).toBe('/');
  });

  it('rejects external redirects', () => {
    expect(getSafeRedirectPath('https://example.com')).toBe('/');
    expect(getSafeRedirectPath('//example.com')).toBe('/');
  });
});
