import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

const { addNotes, listNotes, CodingNoteValidationError } = vi.hoisted(() => {
  class CodingNoteValidationError extends Error {}
  return { addNotes: vi.fn(), listNotes: vi.fn(), CodingNoteValidationError };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/services/coding-notes', () => ({ addNotes, listNotes, CodingNoteValidationError }));

import { GET, POST } from './route';

const post = (body: unknown) =>
  new Request('http://localhost/api/coding/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('coding notes route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    listNotes.mockResolvedValue([{ id: 'n1' }]);
    addNotes.mockResolvedValue([{ id: 'n2' }]);
  });

  it('lists the signed-in user notes', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ notes: [{ id: 'n1' }] });
    expect(listNotes).toHaveBeenCalledWith('user-1');
  });

  it('refuses without a session', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET()).status).toBe(401);
    expect((await POST(post({ notes: [] }))).status).toBe(401);
    expect(addNotes).not.toHaveBeenCalled();
  });

  it('adds notes and answers 201 with the created rows', async () => {
    const notes = [{ key: 's3|while', kind: 'question', body: 'Why?' }];
    const res = await POST(post({ notes }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ notes: [{ id: 'n2' }] });
    expect(addNotes).toHaveBeenCalledWith('user-1', notes);
  });

  it('answers 400 for invalid notes and for a body that is not JSON', async () => {
    addNotes.mockRejectedValue(new CodingNoteValidationError('kind must be question or comment'));
    expect((await POST(post({ notes: [{}] }))).status).toBe(400);
    expect((await POST(post('{nope'))).status).toBe(400);
  });

  it('lets unexpected errors through', async () => {
    addNotes.mockRejectedValue(new Error('database down'));
    await expect(POST(post({ notes: [{}] }))).rejects.toThrow('database down');
  });
});
