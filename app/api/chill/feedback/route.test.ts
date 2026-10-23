import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

const { insertChillFeedback, listChillFeedback } = vi.hoisted(() => ({
  insertChillFeedback: vi.fn(),
  listChillFeedback: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/db/queries/chill-feedback', () => ({ insertChillFeedback, listChillFeedback }));

import { GET, POST } from './route';

let ipSeq = 0;
function post(body: unknown, ip = `10.0.0.${++ipSeq}`) {
  return new Request('http://localhost/api/chill/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('chill feedback route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: null } });
    insertChillFeedback.mockResolvedValue(undefined);
    listChillFeedback.mockResolvedValue([{ id: 'f1' }]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stores a guest note with their name and no user id', async () => {
    const res = await POST(
      post({ message: '  More rain please ', name: ' Ana ', palette: 'dusk' }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(insertChillFeedback).toHaveBeenCalledWith({
      userId: null,
      name: 'Ana',
      message: 'More rain please',
      palette: 'dusk',
    });
  });

  it('stores a guest note without a name as null', async () => {
    await POST(post({ message: 'Hi' }));
    expect(insertChillFeedback).toHaveBeenCalledWith({
      userId: null,
      name: null,
      message: 'Hi',
      palette: null,
    });
  });

  it('stores a signed-in note with the user id and no name', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'u@example.com' } } });
    await POST(post({ message: 'Lovely', name: 'Ignored' }));
    expect(insertChillFeedback).toHaveBeenCalledWith({
      userId: 'user-1',
      name: null,
      message: 'Lovely',
      palette: null,
    });
  });

  it('answers 200 and stores nothing when the honeypot is filled', async () => {
    const res = await POST(post({ message: 'buy now', website: 'spam.example' }));
    expect(res.status).toBe(200);
    expect(insertChillFeedback).not.toHaveBeenCalled();
  });

  it('rejects empty, too long, and badly typed fields', async () => {
    expect((await POST(post({ message: '   ' }))).status).toBe(400);
    expect((await POST(post({}))).status).toBe(400);
    expect((await POST(post({ message: 'x'.repeat(2001) }))).status).toBe(400);
    expect((await POST(post({ message: 'ok', name: 'n'.repeat(81) }))).status).toBe(400);
    expect((await POST(post({ message: 'ok', name: 42 }))).status).toBe(400);
    expect((await POST(post('not json'))).status).toBe(400);
    expect(insertChillFeedback).not.toHaveBeenCalled();
  });

  it('accepts the limits exactly', async () => {
    const res = await POST(post({ message: 'x'.repeat(2000), name: 'n'.repeat(80) }));
    expect(res.status).toBe(200);
  });

  it('limits a guest IP to 5 notes per hour', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await POST(post({ message: `n${i}` }, '9.9.9.9'))).status).toBe(200);
    }
    const res = await POST(post({ message: 'one more' }, '9.9.9.9'));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/lot of notes/);
    expect((await POST(post({ message: 'other ip' }, '8.8.8.8'))).status).toBe(200);
  });

  it('limits a signed-in user to 30 notes per hour', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'busy-user', email: 'b@example.com' } } });
    for (let i = 0; i < 30; i++) {
      expect((await POST(post({ message: `n${i}` }))).status).toBe(200);
    }
    expect((await POST(post({ message: 'one more' }))).status).toBe(429);
  });

  it('lists notes for the owner only', async () => {
    vi.stubEnv('COCKPIT_OWNER_EMAILS', 'martin@example.com');
    getUser.mockResolvedValue({ data: { user: { id: 'm', email: 'Martin@Example.com' } } });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ notes: [{ id: 'f1' }] });
    expect(listChillFeedback).toHaveBeenCalledWith(200);
  });

  it('answers 404 to guests and to other users', async () => {
    vi.stubEnv('COCKPIT_OWNER_EMAILS', 'martin@example.com');
    expect((await GET()).status).toBe(404);
    getUser.mockResolvedValue({ data: { user: { id: 'x', email: 'x@example.com' } } });
    expect((await GET()).status).toBe(404);
    expect(listChillFeedback).not.toHaveBeenCalled();
  });
});
