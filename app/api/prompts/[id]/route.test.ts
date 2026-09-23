import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

const { deletePrompt, updatePrompt } = vi.hoisted(() => ({
  deletePrompt: vi.fn(),
  updatePrompt: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/services/prompts', () => ({
  deletePrompt,
  updatePrompt,
  isStatus: (v: unknown) =>
    typeof v === 'string' && ['queued', 'taken', 'done', 'parked'].includes(v),
}));

import { DELETE, PATCH } from './route';

const user = { id: 'u1' };
const ROW = { id: 'p1', status: 'done' };

function patch(body: unknown) {
  return PATCH(
    new Request('http://localhost', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: 'p1' }) },
  );
}

describe('moving a prompt along', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user } });
    updatePrompt.mockResolvedValue(ROW);
    deletePrompt.mockResolvedValue(ROW);
  });

  it('marks one done', async () => {
    const response = await patch({ status: 'done' });

    expect(response.status).toBe(200);
    expect(updatePrompt).toHaveBeenCalledWith('u1', 'p1', { status: 'done' });
  });

  it('attaches the pull request that answered it', async () => {
    await patch({ prUrl: 'https://github.com/x/y/pull/9' });

    expect(updatePrompt).toHaveBeenCalledWith('u1', 'p1', {
      prUrl: 'https://github.com/x/y/pull/9',
    });
  });

  it('refuses a status it does not know', async () => {
    /*
     * The database has the same constraint. This one exists so the answer is a
     * sentence rather than a 500 from Postgres.
     */
    const response = await patch({ status: 'finished' });

    expect(response.status).toBe(400);
    expect(updatePrompt).not.toHaveBeenCalled();
  });

  it('refuses an anonymous caller', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    expect((await patch({ status: 'done' })).status).toBe(401);
    expect(updatePrompt).not.toHaveBeenCalled();
  });

  it('404s a prompt that is not yours', async () => {
    /*
     * updatePrompt scopes by user id, so somebody else's prompt is simply not
     * there. 404 rather than 403 — a 403 would confirm the id exists.
     */
    updatePrompt.mockResolvedValue(null);

    expect((await patch({ status: 'done' })).status).toBe(404);
  });

  it('deletes one and hands the row back', async () => {
    const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'p1' }),
    });

    expect(response.status).toBe(200);
    expect(deletePrompt).toHaveBeenCalledWith('u1', 'p1');
  });

  it('lets a note be cleared, not only set', async () => {
    await patch({ note: null });

    expect(updatePrompt).toHaveBeenCalledWith('u1', 'p1', { note: null });
  });
});
