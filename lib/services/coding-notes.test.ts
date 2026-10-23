import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deleteNote, getNotesByUser, insertNotes, updateNote } = vi.hoisted(() => ({
  deleteNote: vi.fn(),
  getNotesByUser: vi.fn(),
  insertNotes: vi.fn(),
  updateNote: vi.fn(),
}));

vi.mock('@/lib/db/queries/coding-notes', () => ({
  deleteNote,
  getNotesByUser,
  insertNotes,
  updateNote,
}));

import {
  addNotes,
  CodingNoteValidationError,
  editNote,
  listNotes,
  MAX_BODY_LENGTH,
  MAX_IMPORT,
  removeNote,
} from './coding-notes';

describe('coding notes service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertNotes.mockImplementation(async (_u, notes) =>
      notes.map((n: object, i: number) => ({ id: `n${i}`, ...n })),
    );
    updateNote.mockResolvedValue({ id: 'n1' });
  });

  it('lists the user notes', async () => {
    getNotesByUser.mockResolvedValue([{ id: 'n1' }]);
    expect(await listNotes('user-1')).toEqual([{ id: 'n1' }]);
  });

  it('adds several notes to the same box, trimmed', async () => {
    const rows = await addNotes('user-1', [
      { key: 's3|while', kind: 'question', body: '  When does it stop?  ' },
      { key: 's3|while', kind: 'comment', body: 'Like a repeating if' },
    ]);
    expect(rows).toHaveLength(2);
    expect(insertNotes).toHaveBeenCalledWith('user-1', [
      { itemKey: 's3|while', kind: 'question', body: 'When does it stop?' },
      { itemKey: 's3|while', kind: 'comment', body: 'Like a repeating if' },
    ]);
  });

  it('rejects bad notes before writing any', async () => {
    const bad = [
      addNotes('user-1', []),
      addNotes('user-1', 'nope'),
      addNotes('user-1', [{ key: '', kind: 'question', body: 'x' }]),
      addNotes('user-1', [{ key: 's1|x', kind: 'rant', body: 'x' }]),
      addNotes('user-1', [{ key: 's1|x', kind: 'question', body: '   ' }]),
      addNotes('user-1', [
        { key: 's1|x', kind: 'question', body: 'x'.repeat(MAX_BODY_LENGTH + 1) },
      ]),
      addNotes(
        'user-1',
        Array.from({ length: MAX_IMPORT + 1 }, () => ({ key: 'k', kind: 'comment', body: 'b' })),
      ),
    ];
    for (const attempt of bad) {
      await expect(attempt).rejects.toBeInstanceOf(CodingNoteValidationError);
    }
    expect(insertNotes).not.toHaveBeenCalled();
  });

  it('edits the text and the kind of one note', async () => {
    await editNote('user-1', 'n1', { body: ' new text ', kind: 'comment' });
    expect(updateNote).toHaveBeenCalledWith('user-1', 'n1', { body: 'new text', kind: 'comment' });
  });

  it('marks an answer read, and unread again', async () => {
    await editNote('user-1', 'n1', { read: true });
    expect(updateNote.mock.calls[0][2].readAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    await editNote('user-1', 'n1', { read: false });
    expect(updateNote.mock.calls[1][2]).toEqual({ readAt: null });
  });

  it('refuses an edit with nothing valid in it', async () => {
    await expect(editNote('user-1', 'n1', {})).rejects.toBeInstanceOf(CodingNoteValidationError);
    await expect(editNote('user-1', '', { body: 'x' })).rejects.toBeInstanceOf(
      CodingNoteValidationError,
    );
    await expect(editNote('user-1', 'n1', { read: 'yes' })).rejects.toBeInstanceOf(
      CodingNoteValidationError,
    );
    expect(updateNote).not.toHaveBeenCalled();
  });

  it('removes one note', async () => {
    await removeNote('user-1', 'n1');
    expect(deleteNote).toHaveBeenCalledWith('user-1', 'n1');
    await expect(removeNote('user-1', 42)).rejects.toBeInstanceOf(CodingNoteValidationError);
  });
});
