import { deleteLog, getLogByUser, upsertLog } from '@/lib/db/queries/health-log';

/*
 * THE HEALTH PAGE'S DAY LOG. A tick (`am|lift-sky` = 1), a pain number
 * (`pain|knee` = 0–10) or the day's note (`feel` = text), one per day and key.
 * A null value clears the key. Everything arrived in a request body, so it is
 * checked, not trusted.
 */

export const MAX_KEY_LENGTH = 100;
export const MAX_VALUE_LENGTH = 2000;
/** Entries written at once, enough for a browser's offline queue. */
export const MAX_ENTRIES = 500;

export class HealthLogValidationError extends Error {}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function checkDay(day: unknown): string {
  if (typeof day !== 'string' || !DAY.test(day)) {
    throw new HealthLogValidationError('day must be YYYY-MM-DD');
  }
  // A real calendar date: 2026-02-30 is refused, not rolled into March.
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== day) {
    throw new HealthLogValidationError('day must be a real date');
  }
  return day;
}

function checkKey(key: unknown): string {
  if (typeof key !== 'string' || key.length === 0 || key.length > MAX_KEY_LENGTH) {
    throw new HealthLogValidationError(`key must be 1-${MAX_KEY_LENGTH} characters`);
  }
  return key;
}

function checkValue(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw new HealthLogValidationError('value must be text or null');
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_VALUE_LENGTH) {
    throw new HealthLogValidationError(`value must be at most ${MAX_VALUE_LENGTH} characters`);
  }
  return trimmed;
}

export function listLog(userId: string) {
  return getLogByUser(userId);
}

/** Apply a list of changes: values are written, nulls (or empty text) clear the key. */
export async function writeLog(userId: string, entries: unknown): Promise<void> {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new HealthLogValidationError('entries must be a non-empty list');
  }
  if (entries.length > MAX_ENTRIES) {
    throw new HealthLogValidationError(`at most ${MAX_ENTRIES} entries at once`);
  }
  // Checked in full before anything is written, so a bad entry writes nothing.
  const clean = entries.map((e) => {
    const { day, key, value } = (e ?? {}) as Record<string, unknown>;
    return { day: checkDay(day), key: checkKey(key), value: checkValue(value) };
  });
  // The last change to a day and key wins, as it did in the browser.
  const last = new Map(clean.map((e) => [`${e.day}|${e.key}`, e]));
  const writes: { day: string; key: string; value: string }[] = [];
  for (const e of last.values()) {
    if (e.value === null) await deleteLog(userId, e.day, e.key);
    else writes.push({ day: e.day, key: e.key, value: e.value });
  }
  await upsertLog(userId, writes);
}
