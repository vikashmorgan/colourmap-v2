import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

const { editNote, removeNote, CodingNoteValidationError } = vi.hoisted(() => {
  class CodingNoteValidationError extends Error {}
  return { editNote: vi.fn(), removeNote: vi.fn(), CodingNoteValidationError };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/services/coding-notes', () => ({ editNote, removeNote, CodingNoteValidationError }));

import { DELETE, PATCH } from './route';

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const patch = (body: unknown) =>
  new Request('http://localhost/api/coding/notes/n1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('one coding note', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    editNote.mockResolvedValue({ id: 'n1', body: 'new' });
    removeNote.mockResolvedValue(undefined);
  });

  it('edits a note', async () => {
    const res = await PATCH(patch({ body: 'new' }), ctx('n1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ note: { id: 'n1', body: 'new' } });
    expect(editNote).toHaveBeenCalledWith('user-1', 'n1', { body: 'new' });
  });

  it('answers 404 when the note is not the user own', async () => {
    editNote.mockResolvedValue(null);
    expect((await PATCH(patch({ body: 'x' }), ctx('other'))).status).toBe(404);
  });

  it('answers 400 for an invalid edit', async () => {
    editNote.mockRejectedValue(new CodingNoteValidationError('nothing to change'));
    expect((await PATCH(patch({}), ctx('n1'))).status).toBe(400);
  });

  it('deletes a note', async () => {
    const res = await DELETE(new Request('http://localhost/api/coding/notes/n1'), ctx('n1'));
    expect(res.status).toBe(200);
    expect(removeNote).toHaveBeenCalledWith('user-1', 'n1');
  });

  it('refuses without a session', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await PATCH(patch({ body: 'x' }), ctx('n1'))).status).toBe(401);
    expect((await DELETE(new Request('http://localhost/x'), ctx('n1'))).status).toBe(401);
    expect(editNote).not.toHaveBeenCalled();
    expect(removeNote).not.toHaveBeenCalled();
  });
});
