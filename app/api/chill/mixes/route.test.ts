import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

const { createChillMix, listChillMixes } = vi.hoisted(() => ({
  createChillMix: vi.fn(),
  listChillMixes: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/services/chill-mixes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/chill-mixes')>();
  return { ...actual, createChillMix, listChillMixes };
});

import { GET, POST } from './route';

const user = { id: 'user-1', email: 'guest@example.com' };
const MIX = { id: 'mix-1', title: 'Night', settings: { palette: 'night' } };

function post(body: unknown) {
  return new Request('http://localhost/api/chill/mixes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('/api/chill/mixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user } });
    listChillMixes.mockResolvedValue([MIX]);
    createChillMix.mockResolvedValue(MIX);
  });

  it('answers 401 to guests', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET()).status).toBe(401);
    expect((await POST(post({ title: 'a', settings: {} }))).status).toBe(401);
    expect(listChillMixes).not.toHaveBeenCalled();
    expect(createChillMix).not.toHaveBeenCalled();
  });

  it('lists only the user mixes', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([MIX]);
    expect(listChillMixes).toHaveBeenCalledWith('user-1');
  });

  it('creates a mix for the user', async () => {
    const res = await POST(post({ title: ' Night ', settings: { palette: 'night' } }));
    expect(res.status).toBe(201);
    expect(createChillMix).toHaveBeenCalledWith('user-1', {
      title: 'Night',
      settings: { palette: 'night' },
    });
  });

  it('validates the body', async () => {
    expect((await POST(post('{bad'))).status).toBe(400);
    expect((await POST(post({ title: '', settings: {} }))).status).toBe(400);
    expect((await POST(post({ title: 'a', settings: [] }))).status).toBe(400);
    expect((await POST(post({ title: 'a', settings: { x: 'y'.repeat(70_000) } }))).status).toBe(
      413,
    );
    expect(createChillMix).not.toHaveBeenCalled();
  });
});
