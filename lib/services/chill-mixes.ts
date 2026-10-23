import { and, desc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { chillMixes } from '@/lib/db/schema';

/*
 * Saved Chill Machine mixes. A mix is a title plus an opaque settings object
 * (layers, palette, visuals, echo, beats, sections), owned by one user.
 * Spec: docs/specs/chill-machine-public.md ("Data model").
 */

export type ChillMixRow = typeof chillMixes.$inferSelect;

export const MIX_TITLE_MAX = 120;
export const MIX_SETTINGS_MAX_BYTES = 64 * 1024;

export type MixInput = { title: string; settings: Record<string, unknown> };
export type MixPatch = Partial<MixInput>;

/** Row ids are uuids; anything else can never match, so routes answer 404 early. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTitle(value: unknown): Parsed<string> {
  if (typeof value !== 'string') return { ok: false, error: 'title required', status: 400 };
  const title = value.trim();
  if (title.length < 1 || title.length > MIX_TITLE_MAX) {
    return { ok: false, error: `title must be 1–${MIX_TITLE_MAX} characters`, status: 400 };
  }
  return { ok: true, value: title };
}

function parseSettings(value: unknown): Parsed<Record<string, unknown>> {
  if (!isPlainObject(value)) {
    return { ok: false, error: 'settings must be an object', status: 400 };
  }
  const bytes = new TextEncoder().encode(JSON.stringify(value)).length;
  if (bytes > MIX_SETTINGS_MAX_BYTES) {
    return { ok: false, error: 'settings are larger than 64 KB', status: 413 };
  }
  return { ok: true, value };
}

export function parseMixInput(body: unknown): Parsed<MixInput> {
  if (!isPlainObject(body)) return { ok: false, error: 'Invalid body', status: 400 };
  const title = parseTitle(body.title);
  if (!title.ok) return title;
  const settings = parseSettings(body.settings);
  if (!settings.ok) return settings;
  return { ok: true, value: { title: title.value, settings: settings.value } };
}

export function parseMixPatch(body: unknown): Parsed<MixPatch> {
  if (!isPlainObject(body)) return { ok: false, error: 'Invalid body', status: 400 };
  const patch: MixPatch = {};
  if ('title' in body) {
    const title = parseTitle(body.title);
    if (!title.ok) return title;
    patch.title = title.value;
  }
  if ('settings' in body) {
    const settings = parseSettings(body.settings);
    if (!settings.ok) return settings;
    patch.settings = settings.value;
  }
  if (patch.title === undefined && patch.settings === undefined) {
    return { ok: false, error: 'No valid fields', status: 400 };
  }
  return { ok: true, value: patch };
}

export async function listChillMixes(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(chillMixes)
    .where(eq(chillMixes.userId, userId))
    .orderBy(desc(chillMixes.updatedAt));
}

export async function createChillMix(userId: string, input: MixInput) {
  const db = getDb();
  const [row] = await db
    .insert(chillMixes)
    .values({ userId, ...input })
    .returning();
  return row;
}

export async function updateChillMix(userId: string, mixId: string, patch: MixPatch) {
  const db = getDb();
  const [row] = await db
    .update(chillMixes)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(chillMixes.id, mixId), eq(chillMixes.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteChillMix(userId: string, mixId: string) {
  const db = getDb();
  const [row] = await db
    .delete(chillMixes)
    .where(and(eq(chillMixes.id, mixId), eq(chillMixes.userId, userId)))
    .returning();
  return row ?? null;
}
