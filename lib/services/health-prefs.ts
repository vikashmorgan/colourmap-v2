import { deletePref, getPrefsByUser, upsertPrefs } from '@/lib/db/queries/health-prefs';

/*
 * THE HEALTH PAGE'S STANDING CHOICES (2026-10-19: "allow me to move exercise
 * boxes above another so I can reorder them, to show which are my favourites
 * and which I don't do"). `order|{section}` holds a section's exercises in
 * the chosen order; `aside|{exercise}` = '1' sets one aside; `fav` holds the
 * Favourites pack (2026-10-23), the chosen exercise ids in order. A null value
 * clears the key. Checked, not trusted.
 */

export const MAX_KEY_LENGTH = 100;
export const MAX_VALUE_LENGTH = 2000;
export const MAX_PREFS = 200;

export class HealthPrefValidationError extends Error {}

function checkKey(key: unknown): string {
  if (typeof key !== 'string' || key.length === 0 || key.length > MAX_KEY_LENGTH) {
    throw new HealthPrefValidationError(`key must be 1-${MAX_KEY_LENGTH} characters`);
  }
  return key;
}

function checkValue(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw new HealthPrefValidationError('value must be text or null');
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_VALUE_LENGTH) {
    throw new HealthPrefValidationError(`value must be at most ${MAX_VALUE_LENGTH} characters`);
  }
  return trimmed;
}

export function listPrefs(userId: string) {
  return getPrefsByUser(userId);
}

export async function writePrefs(userId: string, prefs: unknown): Promise<void> {
  if (!Array.isArray(prefs) || prefs.length === 0) {
    throw new HealthPrefValidationError('prefs must be a non-empty list');
  }
  if (prefs.length > MAX_PREFS) {
    throw new HealthPrefValidationError(`at most ${MAX_PREFS} prefs at once`);
  }
  const clean = prefs.map((p) => {
    const { key, value } = (p ?? {}) as Record<string, unknown>;
    return { key: checkKey(key), value: checkValue(value) };
  });
  const last = new Map(clean.map((p) => [p.key, p]));
  const writes: { key: string; value: string }[] = [];
  for (const p of last.values()) {
    if (p.value === null) await deletePref(userId, p.key);
    else writes.push({ key: p.key, value: p.value });
  }
  await upsertPrefs(userId, writes);
}
