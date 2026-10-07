'use client';

import { useCallback, useEffect, useState } from 'react';

/*
 * One spell-check switch for the whole app. Off by default: Victor writes in
 * Italian as well as English, and the browser underlines every Italian word.
 *
 * The choice is kept on the device and written to <html spellcheck>, which
 * every text field without its own spellCheck prop inherits, so notebooks,
 * Art ideas and the journal all follow it. Fields that pass spellCheck read
 * the same value through this hook. Every "abc" button flips it everywhere.
 */
export const SPELL_CHECK_KEY = 'cb-spellcheck';
const EVENT = 'cb-spellcheck';

export function readSpellCheck(): boolean {
  try {
    return localStorage.getItem(SPELL_CHECK_KEY) === 'on';
  } catch {
    return false;
  }
}

export function setSpellCheck(on: boolean) {
  try {
    localStorage.setItem(SPELL_CHECK_KEY, on ? 'on' : 'off');
  } catch {
    // Private mode: the switch still works for this visit.
  }
  document.documentElement.spellcheck = on;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

export function useSpellCheck(): [boolean, () => void] {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const initial = readSpellCheck();
    setOn(initial);
    document.documentElement.spellcheck = initial;
    const onChange = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SPELL_CHECK_KEY) return;
      const next = e.newValue === 'on';
      document.documentElement.spellcheck = next;
      setOn(next);
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggle = useCallback(() => setSpellCheck(!readSpellCheck()), []);
  return [on, toggle];
}
