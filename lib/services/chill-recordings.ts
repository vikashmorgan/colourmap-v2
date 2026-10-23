import { and, desc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { type ChillCue, chillRecordings } from '@/lib/db/schema';

/*
 * Saved Chill Machine recordings. Audio lives in the private `recordings`
 * Storage bucket; rows in `chill_recordings` point at it.
 * Spec: docs/specs/chill-machine-public.md ("Recording", "Data model").
 *
 * Path: {userId}/chill/{uuid}.{m4a|webm}. The user id comes first because the
 * bucket's storage policies (migration 0017) only let a user touch objects
 * whose first folder is their own id.
 */

export type ChillRecordingRow = typeof chillRecordings.$inferSelect;

export const RECORDINGS_BUCKET = 'recordings';
export const MAX_RECORDING_BYTES = 200 * 1024 * 1024;
export const SIGNED_URL_SECONDS = 60 * 60;
export const RECORDING_TITLE_MAX = 120;
const PALETTE_MAX = 40;
const CUES_MAX = 500;
const CUE_LABEL_MAX = 80;

const EXTENSIONS: Record<string, 'm4a' | 'webm'> = {
  'audio/mp4': 'm4a',
  'audio/webm': 'webm',
};

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

/** `audio/webm;codecs=opus` → `audio/webm`; null when not an accepted type. */
export function baseRecordingMime(mimeType: unknown): 'audio/mp4' | 'audio/webm' | null {
  if (typeof mimeType !== 'string') return null;
  const base = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  return base === 'audio/mp4' || base === 'audio/webm' ? base : null;
}

export function chillRecordingPath(userId: string, id: string, mime: 'audio/mp4' | 'audio/webm') {
  return `${userId}/chill/${id}.${EXTENSIONS[mime]}`;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** True when `path` is a chill recording path inside this user's folder. */
export function isOwnChillPath(
  userId: string,
  path: unknown,
  mime: 'audio/mp4' | 'audio/webm',
): path is string {
  if (typeof path !== 'string') return false;
  const ext = EXTENSIONS[mime];
  return (
    path.startsWith(`${userId}/chill/`) && new RegExp(`^[^/]+/chill/${UUID}\\.${ext}$`).test(path)
  );
}

export function checkRecordingSize(size: unknown): Parsed<number> {
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
    return { ok: false, error: 'size required', status: 400 };
  }
  if (size > MAX_RECORDING_BYTES) {
    return { ok: false, error: 'Recording is larger than 200 MB', status: 413 };
  }
  return { ok: true, value: size };
}

export type RecordingMeta = {
  title: string;
  durationSecs: number | null;
  palette: string | null;
  cues: ChillCue[] | null;
};

function parseCues(value: unknown): Parsed<ChillCue[] | null> {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  let raw: unknown = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return { ok: false, error: 'cues must be JSON', status: 400 };
    }
  }
  if (!Array.isArray(raw) || raw.length > CUES_MAX) {
    return { ok: false, error: 'cues must be a list', status: 400 };
  }
  const cues: ChillCue[] = [];
  for (const cue of raw) {
    if (
      typeof cue !== 'object' ||
      cue === null ||
      typeof (cue as ChillCue).at !== 'number' ||
      !Number.isFinite((cue as ChillCue).at) ||
      typeof (cue as ChillCue).label !== 'string'
    ) {
      return { ok: false, error: 'each cue needs at and label', status: 400 };
    }
    cues.push({
      at: Math.max(0, (cue as ChillCue).at),
      label: (cue as ChillCue).label.slice(0, CUE_LABEL_MAX),
    });
  }
  return { ok: true, value: cues };
}

/** Validates title, durationSecs, palette and cues (strings allowed, as from a form). */
export function parseRecordingMeta(fields: Record<string, unknown>): Parsed<RecordingMeta> {
  const title = typeof fields.title === 'string' ? fields.title.trim() : '';
  if (title.length < 1 || title.length > RECORDING_TITLE_MAX) {
    return { ok: false, error: `title must be 1–${RECORDING_TITLE_MAX} characters`, status: 400 };
  }

  let durationSecs: number | null = null;
  if (
    fields.durationSecs !== undefined &&
    fields.durationSecs !== null &&
    fields.durationSecs !== ''
  ) {
    const n = Number(fields.durationSecs);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: 'durationSecs must be a positive number', status: 400 };
    }
    durationSecs = Math.round(n);
  }

  let palette: string | null = null;
  if (typeof fields.palette === 'string' && fields.palette.trim()) {
    palette = fields.palette.trim().slice(0, PALETTE_MAX);
  }

  const cues = parseCues(fields.cues);
  if (!cues.ok) return cues;

  return { ok: true, value: { title, durationSecs, palette, cues: cues.value } };
}

export async function listChillRecordings(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(chillRecordings)
    .where(eq(chillRecordings.userId, userId))
    .orderBy(desc(chillRecordings.createdAt));
}

export async function getChillRecording(userId: string, recordingId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(chillRecordings)
    .where(and(eq(chillRecordings.id, recordingId), eq(chillRecordings.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function createChillRecording(
  userId: string,
  input: RecordingMeta & { storagePath: string; mimeType: string },
) {
  const db = getDb();
  const [row] = await db
    .insert(chillRecordings)
    .values({ userId, ...input })
    .returning();
  return row;
}

export async function deleteChillRecording(userId: string, recordingId: string) {
  const db = getDb();
  const [row] = await db
    .delete(chillRecordings)
    .where(and(eq(chillRecordings.id, recordingId), eq(chillRecordings.userId, userId)))
    .returning();
  return row ?? null;
}
