import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

const { updateChillMix, deleteChillMix } = vi.hoisted(() => ({
  updateChillMix: vi.fn(),
  deleteChillMix: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/services/chill-mixes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/chill-mixes')>();
  return { ...actual, updateChillMix, deleteChillMix };
});

import { DELETE, PATCH } from './route';

const user = { id: 'user-1', email: 'guest@example.com' };
const ID = '22222222-2222-4222-8222-222222222222';
const params = (id = ID) => ({ params: Promise.resolve({ id }) });

function patch(body: unknown) {
  return new Request(`http://localhost/api/chill/mixes/${ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('/api/chill/mixes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user } });
    updateChillMix.mockResolvedValue({ id: ID, title: 'New' });
    deleteChillMix.mockResolvedValue({ id: ID });
  });

  it('answers 401 to guests', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await PATCH(patch({ title: 'a' }), params())).status).toBe(401);
    expect((await DELETE(new Request('http://x'), params())).status).toBe(401);
  });

  it('renames a mix scoped to the user', async () => {
    const res = await PATCH(patch({ title: 'New' }), params());
    expect(res.status).toBe(200);
    expect(updateChillMix).toHaveBeenCalledWith('user-1', ID, { title: 'New' });
  });

  it('updates settings', async () => {
    await PATCH(patch({ settings: { palette: 'warm' } }), params());
    expect(updateChillMix).toHaveBeenCalledWith('user-1', ID, { settings: { palette: 'warm' } });
  });

  it('validates the patch', async () => {
    expect((await PATCH(patch({}), params())).status).toBe(400);
    expect((await PATCH(patch('{bad'), params())).status).toBe(400);
    expect((await PATCH(patch({ title: 'x'.repeat(121) }), params())).status).toBe(400);
    expect(updateChillMix).not.toHaveBeenCalled();
  });

  it('answers 404 for another user’s mix or a malformed id', async () => {
    updateChillMix.mockResolvedValue(null);
    deleteChillMix.mockResolvedValue(null);
    expect((await PATCH(patch({ title: 'a' }), params())).status).toBe(404);
    expect((await DELETE(new Request('http://x'), params())).status).toBe(404);
    expect((await DELETE(new Request('http://x'), params('nope'))).status).toBe(404);
    expect((await PATCH(patch({ title: 'a' }), params('nope'))).status).toBe(404);
  });

  it('deletes a mix', async () => {
    const res = await DELETE(new Request('http://x'), params());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ deleted: ID });
    expect(deleteChillMix).toHaveBeenCalledWith('user-1', ID);
  });
});
