import type { NoteQueries, NoteRow } from '@/lib/db/queries/notes-table';

/*
 * QUESTIONS, COMMENTS AND THE LIKE, ON A PAGE OF PLACES.
 *
 * A place can hold any number of notes; each has a kind and is edited or
 * deleted on its own. A note may later carry an answer written from the
 * terminal; the user marks that answer read. The user's own text is never
 * rewritten by anything but the user.
 *
 * Everything here arrived in a request body, so it is checked, not trusted.
 * Each page brings its own table, its own kinds and its own error class.
 */

export const MAX_KEY_LENGTH = 200;
export const MAX_BODY_LENGTH = 2000;
/** Notes brought up from a browser at once on first sync. A cap, not a quota. */
export const MAX_IMPORT = 500;

export function notesService<K extends string>(
  queries: Pick<NoteQueries, 'getNotesByUser' | 'insertNotes' | 'updateNote' | 'deleteNote'>,
  kinds: readonly K[],
  ValidationError: new (message: string) => Error,
) {
  function checkKey(key: unknown): string {
    if (typeof key !== 'string' || key.length === 0 || key.length > MAX_KEY_LENGTH) {
      throw new ValidationError(`key must be 1-${MAX_KEY_LENGTH} characters`);
    }
    return key;
  }

  function checkKind(kind: unknown): K {
    if (typeof kind !== 'string' || !(kinds as readonly string[]).includes(kind)) {
      throw new ValidationError(
        `kind must be ${kinds.slice(0, -1).join(', ')} or ${kinds[kinds.length - 1]}`,
      );
    }
    return kind as K;
  }

  function checkBody(body: unknown): string {
    if (typeof body !== 'string') throw new ValidationError('body must be text');
    const trimmed = body.trim();
    if (!trimmed) throw new ValidationError('body must not be empty');
    if (trimmed.length > MAX_BODY_LENGTH) {
      throw new ValidationError(`body must be at most ${MAX_BODY_LENGTH} characters`);
    }
    return trimmed;
  }

  function listNotes(userId: string): Promise<NoteRow[]> {
    return queries.getNotesByUser(userId);
  }

  /** One note from the page, or many when a browser's notes are brought into the account. */
  async function addNotes(userId: string, notes: unknown): Promise<NoteRow[]> {
    if (!Array.isArray(notes) || notes.length === 0) {
      throw new ValidationError('notes must be a non-empty list');
    }
    if (notes.length > MAX_IMPORT) {
      throw new ValidationError(`at most ${MAX_IMPORT} notes at once`);
    }
    const clean = notes.map((n) => {
      const { key, kind, body } = (n ?? {}) as Record<string, unknown>;
      return { itemKey: checkKey(key), kind: checkKind(kind), body: checkBody(body) };
    });
    return queries.insertNotes(userId, clean);
  }

  /** Edit a note's text or kind, or mark its answer read (`read: true`). */
  async function editNote(userId: string, id: unknown, patch: unknown) {
    if (typeof id !== 'string' || !id) throw new ValidationError('id required');
    const { kind, body, read } = (patch ?? {}) as Record<string, unknown>;
    const changes: { kind?: string; body?: string; readAt?: string | null } = {};
    if (kind !== undefined) changes.kind = checkKind(kind);
    if (body !== undefined) changes.body = checkBody(body);
    if (read !== undefined) {
      if (typeof read !== 'boolean') throw new ValidationError('read must be true or false');
      changes.readAt = read ? new Date().toISOString() : null;
    }
    if (Object.keys(changes).length === 0) throw new ValidationError('nothing to change');
    return queries.updateNote(userId, id, changes);
  }

  async function removeNote(userId: string, id: unknown) {
    if (typeof id !== 'string' || !id) throw new ValidationError('id required');
    await queries.deleteNote(userId, id);
  }

  return { listNotes, addNotes, editNote, removeNote };
}
