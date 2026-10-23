import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser, createSignedUploadUrl, from } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createSignedUploadUrl = vi.fn();
  const from = vi.fn(() => ({ createSignedUploadUrl }));
  const createClient = vi.fn(async () => ({ auth: { getUser }, storage: { from } }));
  return { createClient, getUser, createSignedUploadUrl, from };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { POST } from './route';

const USER = '11111111-1111-4111-8111-111111111111';

function json(body: unknown) {
  return new Request('http://localhost/api/chill/recordings/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/chill/recordings/upload-url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: USER } } });
    createSignedUploadUrl.mockImplementation(async (path: string) => ({
      data: { path, token: 'tok', signedUrl: 'https://upload' },
      error: null,
    }));
  });

  it('answers 401 to guests', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(json({ mimeType: 'audio/mp4', size: 10 }))).status).toBe(401);
  });

  it('signs an upload inside the user folder', async () => {
    const res = await POST(json({ mimeType: 'audio/webm;codecs=opus', size: 1000 }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { storagePath: string; token: string };
    expect(body.token).toBe('tok');
    expect(body.storagePath).toMatch(new RegExp(`^${USER}/chill/[0-9a-f-]{36}\\.webm$`));
    expect(from).toHaveBeenCalledWith('recordings');
  });

  it('refuses other types, oversize files and bad JSON', async () => {
    expect((await POST(json({ mimeType: 'audio/ogg', size: 10 }))).status).toBe(400);
    expect((await POST(json({ mimeType: 'audio/mp4', size: 201 * 1024 * 1024 }))).status).toBe(413);
    expect((await POST(json({ mimeType: 'audio/mp4' }))).status).toBe(400);
    expect((await POST(json('{bad'))).status).toBe(400);
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it('answers 502 when storage cannot sign', async () => {
    createSignedUploadUrl.mockResolvedValue({ data: null, error: { message: 'down' } });
    expect((await POST(json({ mimeType: 'audio/mp4', size: 10 }))).status).toBe(502);
  });
});
