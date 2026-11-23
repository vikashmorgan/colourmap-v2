import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEMO_MEMBERS } from './model';
import { loadMe, saveMe } from './storage';

describe('profile storage on this device', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('starts empty', () => {
    expect(loadMe()).toBeNull();
  });

  it('keeps a saved profile and forgets it again', () => {
    const me = { ...DEMO_MEMBERS[0], id: 'me-vic' };
    saveMe(me);
    expect(loadMe()).toEqual(me);
    saveMe(null);
    expect(loadMe()).toBeNull();
  });

  it('ignores a damaged or invalid saved profile', () => {
    localStorage.setItem('collective:me', '{broken');
    expect(loadMe()).toBeNull();
    localStorage.setItem('collective:me', JSON.stringify({ name: 42 }));
    expect(loadMe()).toBeNull();
  });

  it('carries on when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveMe(DEMO_MEMBERS[0])).not.toThrow();
    expect(loadMe()).toBeNull();
  });
});
