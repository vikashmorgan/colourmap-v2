import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

const { createPrompt, listOpen, listPrompts } = vi.hoisted(() => ({
  createPrompt: vi.fn(),
  listOpen: vi.fn(),
  listPrompts: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/services/prompts', () => ({
  createPrompt,
  listOpen,
  listPrompts,
  MAX_BODY: 4000,
}));

import { GET, POST } from './route';

const user = { id: 'u1' };
const ROW = { id: 'p1', body: 'raise the smoke timeout', status: 'queued' };

function post(body: unknown) {
  return new Request('http://localhost/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('the prompts route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user } });
    listPrompts.mockResolvedValue([ROW]);
    listOpen.mockResolvedValue([ROW]);
    createPrompt.mockResolvedValue(ROW);
  });

  it('lists the history by default', async () => {
    const response = await GET(new Request('http://localhost/api/prompts'));

    expect(response.status).toBe(200);
    expect(listPrompts).toHaveBeenCalledWith('u1', 50);
    expect(listOpen).not.toHaveBeenCalled();
  });

  it('lists only the open queue when asked', async () => {
    await GET(new Request('http://localhost/api/prompts?open=1'));

    expect(listOpen).toHaveBeenCalledWith('u1', 50);
  });

  it('caps the limit whatever the caller asks for', async () => {
    await GET(new Request('http://localhost/api/prompts?limit=5000'));

    expect(listPrompts).toHaveBeenCalledWith('u1', 100);
  });

  it('refuses an anonymous caller', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    expect((await GET(new Request('http://localhost/api/prompts'))).status).toBe(401);
    expect(listPrompts).not.toHaveBeenCalled();
  });

  it('writes a prompt down', async () => {
    const response = await POST(post({ body: 'raise the smoke timeout' }));

    expect(response.status).toBe(201);
    expect(createPrompt).toHaveBeenCalledWith('u1', 'raise the smoke timeout');
  });

  it('refuses a prompt with no words in it', async () => {
    for (const body of ['', '   ', 42, null, undefined]) {
      const response = await POST(post({ body }));
      expect(response.status, String(body)).toBe(400);
    }
    expect(createPrompt).not.toHaveBeenCalled();
  });

  it('refuses a body that is not JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/prompts', { method: 'POST', body: 'nope' }),
    );

    expect(response.status).toBe(400);
    expect(createPrompt).not.toHaveBeenCalled();
  });

  it('does not let a caller pick the starting status', async () => {
    /*
     * A prompt that arrives already 'done' would never be worked on and would
     * silently inflate what shipped.
     */
    await POST(post({ body: 'do the thing', status: 'done' }));

    expect(createPrompt).toHaveBeenCalledWith('u1', 'do the thing');
    expect(createPrompt.mock.calls[0]).toHaveLength(2);
  });
});
