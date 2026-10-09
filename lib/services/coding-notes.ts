import {
  type CodingNoteRow,
  deleteNote,
  getNotesByUser,
  insertNotes,
  updateNote,
} from '@/lib/db/queries/coding-notes';

/*
 * QUESTIONS AND COMMENTS ON THE CODING STUDY PAGE.
 *
 * A box can hold any number of notes; each is a question or a comment and is
 * edited or deleted on its own. A note may later carry an answer written from
 * the terminal; the user marks that answer read. The user's own text is never
 * rewritten by anything but the user.
 *
 * Everything here arrived in a request body, so it is checked, not trusted.
 */

export const NOTE_KINDS = ['question', 'comment'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

const MAX_KEY_LENGTH = 200;
export const MAX_BODY_LENGTH = 2000;
/** Notes brought up from a browser at once on first sync. A cap, not a quota. */
export const MAX_IMPORT = 500;

export class CodingNoteValidationError extends Error {}

function checkKey(key: unknown): string {
  if (typeof key !== 'string' || key.length === 0 || key.length > MAX_KEY_LENGTH) {
    throw new CodingNoteValidationError(`key must be 1-${MAX_KEY_LENGTH} characters`);
  }
  return key;
}

function checkKind(kind: unknown): NoteKind {
  if (typeof kind !== 'string' || !(NOTE_KINDS as readonly string[]).includes(kind)) {
    throw new CodingNoteValidationError('kind must be question or comment');
  }
  return kind as NoteKind;
}

function checkBody(body: unknown): string {
  if (typeof body !== 'string') throw new CodingNoteValidationError('body must be text');
  const trimmed = body.trim();
  if (!trimmed) throw new CodingNoteValidationError('body must not be empty');
  if (trimmed.length > MAX_BODY_LENGTH) {
    throw new CodingNoteValidationError(`body must be at most ${MAX_BODY_LENGTH} characters`);
  }
  return trimmed;
}

export function listNotes(userId: string): Promise<CodingNoteRow[]> {
  return getNotesByUser(userId);
}

/**
 * Add notes. One note from the page, or many when a browser's notes are
 * brought into the account on first sync.
 */
export async function addNotes(userId: string, notes: unknown): Promise<CodingNoteRow[]> {
  if (!Array.isArray(notes) || notes.length === 0) {
    throw new CodingNoteValidationError('notes must be a non-empty list');
  }
  if (notes.length > MAX_IMPORT) {
    throw new CodingNoteValidationError(`at most ${MAX_IMPORT} notes at once`);
  }
  const clean = notes.map((n) => {
    const { key, kind, body } = (n ?? {}) as Record<string, unknown>;
    return { itemKey: checkKey(key), kind: checkKind(kind), body: checkBody(body) };
  });
  return insertNotes(userId, clean);
}

/** Edit a note's text or kind, or mark its answer read (`read: true`). */
export async function editNote(userId: string, id: unknown, patch: unknown) {
  if (typeof id !== 'string' || !id) throw new CodingNoteValidationError('id required');
  const { kind, body, read } = (patch ?? {}) as Record<string, unknown>;
  const changes: { kind?: string; body?: string; readAt?: string | null } = {};
  if (kind !== undefined) changes.kind = checkKind(kind);
  if (body !== undefined) changes.body = checkBody(body);
  if (read !== undefined) {
    if (typeof read !== 'boolean')
      throw new CodingNoteValidationError('read must be true or false');
    changes.readAt = read ? new Date().toISOString() : null;
  }
  if (Object.keys(changes).length === 0) throw new CodingNoteValidationError('nothing to change');
  return updateNote(userId, id, changes);
}

export async function removeNote(userId: string, id: unknown) {
  if (typeof id !== 'string' || !id) throw new CodingNoteValidationError('id required');
  await deleteNote(userId, id);
}
