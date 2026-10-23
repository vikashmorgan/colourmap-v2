import { deleteNote, getNotesByUser, insertNotes, updateNote } from '@/lib/db/queries/health-notes';

import { notesService } from './notes-service';

/*
 * QUESTIONS, COMMENTS AND THINGS TO RESEARCH ON THE HEALTH PAGE, on an
 * exercise, a section or the whole routine. The rules live in notes-service.
 */

export const HEALTH_NOTE_KINDS = ['question', 'comment', 'research'] as const;

export class HealthNoteValidationError extends Error {}

export const { listNotes, addNotes, editNote, removeNote } = notesService(
  { getNotesByUser, insertNotes, updateNote, deleteNote },
  HEALTH_NOTE_KINDS,
  HealthNoteValidationError,
);
