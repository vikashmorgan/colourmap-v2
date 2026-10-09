import { describe, expect, it } from 'vitest';

import { isSlideFile, SLIDE_FILES, slidePath } from './slides';

describe('coding slides', () => {
  it('accepts only the known slide files', () => {
    for (const name of SLIDE_FILES) expect(isSlideFile(name)).toBe(true);
    expect(isSlideFile('Session5.pdf')).toBe(false);
    expect(isSlideFile('../other-user/Session1.pdf')).toBe(false);
    expect(isSlideFile('session1.pdf')).toBe(false);
    expect(isSlideFile(42)).toBe(false);
  });

  it('keeps every file inside the user folder', () => {
    expect(slidePath('user-1', 'Session3.pdf')).toBe('user-1/Session3.pdf');
  });
});
