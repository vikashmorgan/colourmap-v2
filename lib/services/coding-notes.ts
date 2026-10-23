import { deleteNote, getNotesByUser, insertNotes, updateNote } from '@/lib/db/queries/coding-notes';

import { notesService } from './notes-service';

/* QUESTIONS AND COMMENTS ON THE CODING STUDY PAGE. The rules live in notes-service. */

export { MAX_BODY_LENGTH, MAX_IMPORT } from './notes-service';

export const NOTE_KINDS = ['question', 'comment'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export class CodingNoteValidationError extends Error {}

export const { listNotes, addNotes, editNote, removeNote } = notesService(
  { getNotesByUser, insertNotes, updateNote, deleteNote },
  NOTE_KINDS,
  CodingNoteValidationError,
);
