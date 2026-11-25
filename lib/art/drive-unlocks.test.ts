import { describe, expect, it } from 'vitest';

import type { Store } from './drive-design';
import { loadFound, saveFound, shown, UNLOCK_KEY } from './drive-unlocks';

function memory(): Store & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('found tracks (2026-11-25: "THE MORE U KNOW THE MORE U DISCOVER")', () => {
  it('remembers Water City once found, and says when it is newly found', () => {
    const st = memory();
    expect(loadFound(st)).toEqual([]);
    expect(saveFound(st, 'water')).toBe(true);
    expect(saveFound(st, 'water')).toBe(false);
    expect(loadFound(st)).toEqual(['water']);
    expect(JSON.parse(st.data.get(UNLOCK_KEY) ?? '[]')).toEqual(['water']);
  });

  it('shows every track but the secret ones until found', () => {
    expect(shown('chinatown', [])).toBe(true);
    expect(shown('water', [])).toBe(false);
    expect(shown('water', ['water'])).toBe(true);
  });

  it('survives storage that throws or holds rubbish', () => {
    const broken: Store = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadFound(broken)).toEqual([]);
    expect(saveFound(broken, 'water')).toBe(true);
    expect(loadFound(null)).toEqual([]);
    const junk = memory();
    junk.setItem(UNLOCK_KEY, '{"not":"a list"}');
    expect(loadFound(junk)).toEqual([]);
    junk.setItem(UNLOCK_KEY, '["water", 3, "nope"]');
    expect(loadFound(junk)).toEqual(['water']);
  });
});
