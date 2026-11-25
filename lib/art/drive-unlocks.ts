/**
 * Drive: the tracks found rather than given (docs/specs/drive-menus.md, "Found tracks"; 2026-11-25:
 * "THE MORE U KNOW THE MORE U DISCOVER"). A secret somewhere in one world unlocks another track:
 * the lake behind Chinatown Run's start finds Water City. Remembered on this device; storage is
 * handed in (and may fail: private windows, blocked storage), so it works and tests without it.
 * Pure: no three.js, no DOM.
 */

import type { Store } from '@/lib/art/drive-design';

export const UNLOCK_KEY = 'drive.found';

/** The tracks that are found, not given, and where each is found. */
export const SECRET_TRACKS = {
  water: 'Through the seven portals on the lake behind Chinatown Run’s start',
} as const;

export type SecretTrack = keyof typeof SECRET_TRACKS;

export function isSecret(id: string): id is SecretTrack {
  return id in SECRET_TRACKS;
}

/** The secret tracks found on this device. */
export function loadFound(store: Store | null): SecretTrack[] {
  try {
    const raw = store?.getItem(UNLOCK_KEY);
    if (!raw) return [];
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((x): x is SecretTrack => typeof x === 'string' && isSecret(x));
  } catch {
    return [];
  }
}

/** Remembers a track as found; returns whether it is newly found. */
export function saveFound(store: Store | null, id: SecretTrack): boolean {
  const found = loadFound(store);
  if (found.includes(id)) return false;
  try {
    store?.setItem(UNLOCK_KEY, JSON.stringify([...found, id]));
  } catch {
    // Not remembered (storage blocked): found for this session only.
  }
  return true;
}

/** Whether a track shows in the menus: every track does, the secret ones once found. */
export function shown(id: string, found: readonly string[]): boolean {
  return !isSecret(id) || found.includes(id);
}
