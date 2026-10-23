import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_BODY_LENGTH, MAX_IMPORT, MAX_KEY_LENGTH, notesService } from './notes-service';

class TestError extends Error {}

const queries = {
  getNotesByUser: vi.fn(),
  insertNotes: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
};

const service = notesService(queries, ['question', 'comment', 'research'] as const, TestError);

describe('notes service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queries.insertNotes.mockImplementation(async (_u, notes) => notes);
    queries.updateNote.mockResolvedValue({ id: 'n1' });
  });

  it('lists through the given table', async () => {
    queries.getNotesByUser.mockResolvedValue([{ id: 'n1' }]);
    expect(await service.listNotes('user-1')).toEqual([{ id: 'n1' }]);
    expect(queries.getNotesByUser).toHaveBeenCalledWith('user-1');
  });

  it('adds notes of its own kinds, trimmed', async () => {
    await service.addNotes('user-1', [{ key: 'a', kind: 'research', body: '  look into it ' }]);
    expect(queries.insertNotes).toHaveBeenCalledWith('user-1', [
      { itemKey: 'a', kind: 'research', body: 'look into it' },
    ]);
  });

  it('names every kind when one is refused, with its own error class', async () => {
    const add = () => service.addNotes('user-1', [{ key: 'a', kind: 'mood', body: 'x' }]);
    await expect(add()).rejects.toThrow('kind must be question, comment or research');
    await expect(add()).rejects.toBeInstanceOf(TestError);
  });

  it('refuses bad lists, keys and bodies before writing', async () => {
    const bad = [
      undefined,
      [],
      Array.from({ length: MAX_IMPORT + 1 }, () => ({ key: 'a', kind: 'comment', body: 'x' })),
      [{ key: '', kind: 'comment', body: 'x' }],
      [{ key: 'k'.repeat(MAX_KEY_LENGTH + 1), kind: 'comment', body: 'x' }],
      [{ key: 'a', kind: 'comment', body: 3 }],
      [{ key: 'a', kind: 'comment', body: '   ' }],
      [{ key: 'a', kind: 'comment', body: 'x'.repeat(MAX_BODY_LENGTH + 1) }],
      [null],
    ];
    for (const notes of bad) {
      await expect(service.addNotes('user-1', notes)).rejects.toBeInstanceOf(TestError);
    }
    expect(queries.insertNotes).not.toHaveBeenCalled();
  });

  it('edits text and kind, marks read and unread', async () => {
    await service.editNote('user-1', 'n1', { body: ' new ', kind: 'comment' });
    expect(queries.updateNote).toHaveBeenLastCalledWith('user-1', 'n1', {
      body: 'new',
      kind: 'comment',
    });
    await service.editNote('user-1', 'n1', { read: false });
    expect(queries.updateNote).toHaveBeenLastCalledWith('user-1', 'n1', { readAt: null });
    await service.editNote('user-1', 'n1', { read: true });
    expect(queries.updateNote.mock.lastCall?.[2].readAt).toEqual(expect.any(String));
  });

  it('refuses an empty edit, a bad read flag and a missing id', async () => {
    await expect(service.editNote('user-1', 'n1', {})).rejects.toThrow('nothing to change');
    await expect(service.editNote('user-1', 'n1', { read: 'yes' })).rejects.toBeInstanceOf(
      TestError,
    );
    await expect(service.editNote('user-1', '', { read: true })).rejects.toThrow('id required');
    await expect(service.removeNote('user-1', 7)).rejects.toThrow('id required');
  });

  it('removes a note', async () => {
    await service.removeNote('user-1', 'n1');
    expect(queries.deleteNote).toHaveBeenCalledWith('user-1', 'n1');
  });
});
