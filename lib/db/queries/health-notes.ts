import { type NoteRow, notesTable } from './notes-table';

/* The /health page's questions, comments and things to research. */

export type HealthNoteRow = NoteRow;

export const { getNotesByUser, insertNotes, updateNote, deleteNote } = notesTable('health_notes');
