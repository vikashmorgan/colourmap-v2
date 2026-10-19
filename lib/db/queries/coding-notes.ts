import { type NoteRow, notesTable } from './notes-table';

/* The /coding page's questions and comments. Same shape as every notes table. */

export type CodingNoteRow = NoteRow;

export const { getNotesByUser, insertNotes, updateNote, deleteNote } = notesTable('coding_notes');
