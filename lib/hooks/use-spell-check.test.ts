import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { readSpellCheck, SPELL_CHECK_KEY, setSpellCheck, useSpellCheck } from './use-spell-check';

describe('useSpellCheck', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.spellcheck = true;
  });

  it('is off by default and turns the page off', () => {
    const { result } = renderHook(() => useSpellCheck());
    expect(result.current[0]).toBe(false);
    expect(document.documentElement.spellcheck).toBe(false);
  });

  it('remembers the choice and applies it to the page', () => {
    const { result } = renderHook(() => useSpellCheck());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem(SPELL_CHECK_KEY)).toBe('on');
    expect(document.documentElement.spellcheck).toBe(true);
    act(() => result.current[1]());
    expect(readSpellCheck()).toBe(false);
  });

  it('keeps every switch on the page in step', () => {
    const a = renderHook(() => useSpellCheck());
    const b = renderHook(() => useSpellCheck());
    act(() => setSpellCheck(true));
    expect(a.result.current[0]).toBe(true);
    expect(b.result.current[0]).toBe(true);
  });

  it('starts from a saved choice', () => {
    localStorage.setItem(SPELL_CHECK_KEY, 'on');
    const { result } = renderHook(() => useSpellCheck());
    expect(result.current[0]).toBe(true);
  });

  it('follows a change made in another tab', () => {
    const { result } = renderHook(() => useSpellCheck());
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: SPELL_CHECK_KEY, newValue: 'on' }));
    });
    expect(result.current[0]).toBe(true);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: 'off' }));
    });
    expect(result.current[0]).toBe(true);
  });
});
