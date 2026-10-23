import { describe, expect, it } from 'vitest';

import { THEME } from './geopolitics-theme';

describe('geopolitics THEME', () => {
  it('exposes the warm World-mode palette tokens', () => {
    expect(THEME.ink).toBe('#2a1d0e');
    expect(THEME.accent).toBe('#b06b1c');
    for (const value of Object.values(THEME)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
