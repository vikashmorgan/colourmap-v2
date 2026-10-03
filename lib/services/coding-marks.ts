import { deleteBox, getMarksByUser, upsertBoxes } from '@/lib/db/queries/coding-marks';

/*
 * MARKS AND NOTES ON THE CODING STUDY PAGE.
 *
 * Each box on /coding can carry a mark — "solid" (owned), "got" (understood),
 * "mid" (confused), "late" (no time yet) — and a note: the user's own question or comment about
 * it. The page keeps its own copy in the browser; this is the copy that
 * follows the signed-in user between devices.
 *
 * The page always sends the whole state of one box: its mark and its note.
 * Both empty means the box is cleared and its row goes.
 *
 * Everything here arrived in a request body, so it is checked rather than
 * trusted: a key is a short string, a mark is one of three words, a note is
 * bounded text with a kind.
 */

export const MARKS = ['solid', 'got', 'mid', 'late'] as const;
export type Mark = (typeof MARKS)[number];
export const NOTE_KINDS = ['question', 'comment'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];
export type Note = { text: string; kind: NoteKind };

const MAX_KEY_LENGTH = 200;
export const MAX_NOTE_LENGTH = 2000;
/** More boxes than the page has, with room to grow; a cap, not a quota. */
export const MAX_MERGE = 1000;

export type CodingState = { marks: Record<string, Mark>; notes: Record<string, Note> };

export class CodingMarkValidationError extends Error {}

function isMark(value: unknown): value is Mark {
  return typeof value === 'string' && (MARKS as readonly string[]).includes(value);
}

function isNoteKind(value: unknown): value is NoteKind {
  return typeof value === 'string' && (NOTE_KINDS as readonly string[]).includes(value);
}

function checkKey(key: unknown): string {
  if (typeof key !== 'string' || key.length === 0 || key.length > MAX_KEY_LENGTH) {
    throw new CodingMarkValidationError(`key must be 1-${MAX_KEY_LENGTH} characters`);
  }
  return key;
}

function checkMark(mark: unknown): Mark | null {
  if (mark === null || mark === undefined) return null;
  if (!isMark(mark))
    throw new CodingMarkValidationError('mark must be solid, got, mid, late or null');
  return mark;
}

/** A note is { text, kind }. Its text is trimmed, and an empty note counts as none. */
function checkNote(note: unknown): Note | null {
  if (note === null || note === undefined) return null;
  if (typeof note !== 'object' || Array.isArray(note)) {
    throw new CodingMarkValidationError('note must be { text, kind } or null');
  }
  const { text, kind } = note as Record<string, unknown>;
  if (typeof text !== 'string') throw new CodingMarkValidationError('note text must be text');
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new CodingMarkValidationError(`note must be at most ${MAX_NOTE_LENGTH} characters`);
  }
  if (!isNoteKind(kind))
    throw new CodingMarkValidationError('note kind must be question or comment');
  return { text: trimmed, kind };
}

/** Everything the user has recorded, in the two shapes the page stores locally. */
export async function getState(userId: string): Promise<CodingState> {
  const rows = await getMarksByUser(userId);
  const state: CodingState = { marks: {}, notes: {} };
  for (const row of rows) {
    if (isMark(row.mark)) state.marks[row.itemKey] = row.mark;
    if (row.note && isNoteKind(row.noteKind)) {
      state.notes[row.itemKey] = { text: row.note, kind: row.noteKind };
    }
  }
  return state;
}

function toEntry(itemKey: string, mark: Mark | null, note: Note | null) {
  return { itemKey, mark, note: note?.text ?? null, noteKind: note?.kind ?? null };
}

/** Save one box: its mark and its note. Both empty clears it. */
export async function saveBox(userId: string, key: unknown, mark: unknown, note: unknown) {
  const itemKey = checkKey(key);
  const cleanMark = checkMark(mark);
  const cleanNote = checkNote(note);
  if (cleanMark === null && cleanNote === null) {
    await deleteBox(userId, itemKey);
    return;
  }
  await upsertBoxes(userId, [toEntry(itemKey, cleanMark, cleanNote)]);
}

/**
 * Bring what was recorded in a browser before signing in into the account.
 *
 * The page sends only boxes the account has nothing for yet, so this never
 * overwrites a choice made on another device; it adds them.
 */
export async function mergeState(userId: string, marks: unknown, notes: unknown) {
  const isRecord = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v);
  if ((marks !== undefined && !isRecord(marks)) || (notes !== undefined && !isRecord(notes))) {
    throw new CodingMarkValidationError('marks and notes must be objects keyed by box');
  }
  const markOf = new Map(Object.entries((marks ?? {}) as Record<string, unknown>));
  const noteOf = new Map(Object.entries((notes ?? {}) as Record<string, unknown>));
  const keys = new Set([...markOf.keys(), ...noteOf.keys()]);
  if (keys.size > MAX_MERGE) {
    throw new CodingMarkValidationError(`at most ${MAX_MERGE} boxes at once`);
  }
  const rows = [...keys]
    .map((key) => toEntry(checkKey(key), checkMark(markOf.get(key)), checkNote(noteOf.get(key))))
    .filter((row) => row.mark !== null || row.note !== null);
  await upsertBoxes(userId, rows);
  return rows.length;
}
