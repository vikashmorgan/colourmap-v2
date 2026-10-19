import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deleteNote, getNotesByUser, insertNotes, updateNote } = vi.hoisted(() => ({
  deleteNote: vi.fn(),
  getNotesByUser: vi.fn(),
  insertNotes: vi.fn(),
  updateNote: vi.fn(),
}));

vi.mock('@/lib/db/queries/health-notes', () => ({
  deleteNote,
  getNotesByUser,
  insertNotes,
  updateNote,
}));

import {
  addNotes,
  editNote,
  HealthNoteValidationError,
  listNotes,
  removeNote,
} from './health-notes';

describe('health notes service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertNotes.mockImplementation(async (_u, notes) => notes);
    updateNote.mockResolvedValue({ id: 'n1' });
  });

  it('lists the user notes', async () => {
    getNotesByUser.mockResolvedValue([{ id: 'n1' }]);
    expect(await listNotes('user-1')).toEqual([{ id: 'n1' }]);
  });

  it('takes questions, comments and things to research', async () => {
    await addNotes('user-1', [
      { key: 'ex|wall-sit', kind: 'question', body: 'How deep?' },
      { key: 'overall', kind: 'research', body: ' Isometrics and tendon pain ' },
      { key: 'sec|feet', kind: 'comment', body: 'Warmer today' },
    ]);
    expect(insertNotes).toHaveBeenCalledWith('user-1', [
      { itemKey: 'ex|wall-sit', kind: 'question', body: 'How deep?' },
      { itemKey: 'overall', kind: 'research', body: 'Isometrics and tendon pain' },
      { itemKey: 'sec|feet', kind: 'comment', body: 'Warmer today' },
    ]);
  });

  it('refuses an unknown kind with a message naming the three', async () => {
    const feeling = [{ key: 'overall', kind: 'feeling', body: 'x' }];
    await expect(addNotes('user-1', feeling)).rejects.toThrow(
      'kind must be question, comment or research',
    );
    await expect(addNotes('user-1', feeling)).rejects.toBeInstanceOf(HealthNoteValidationError);
  });

  it('edits a note into research and marks an answer read', async () => {
    await editNote('user-1', 'n1', { kind: 'research' });
    expect(updateNote).toHaveBeenCalledWith('user-1', 'n1', { kind: 'research' });
    await editNote('user-1', 'n1', { read: true });
    expect(updateNote.mock.calls[1][2].readAt).toEqual(expect.any(String));
  });

  it('removes a note, and refuses a missing id or an empty edit', async () => {
    await removeNote('user-1', 'n1');
    expect(deleteNote).toHaveBeenCalledWith('user-1', 'n1');
    await expect(removeNote('user-1', '')).rejects.toBeInstanceOf(HealthNoteValidationError);
    await expect(editNote('user-1', 'n1', {})).rejects.toThrow('nothing to change');
  });
});
