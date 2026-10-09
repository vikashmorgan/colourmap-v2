// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser, list, upload } = vi.hoisted(() => {
  const getUser = vi.fn();
  const list = vi.fn();
  const upload = vi.fn();
  const createClient = vi.fn(async () => ({
    auth: { getUser },
    storage: { from: vi.fn(() => ({ list, upload })) },
  }));
  return { createClient, getUser, list, upload };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { GET, POST } from './route';

const user = { id: 'user-1' };

function uploadRequest(file?: File) {
  const form = new FormData();
  if (file) form.set('file', file);
  return new Request('http://localhost/api/coding/slides', { method: 'POST', body: form });
}
const pdf = (name: string, bytes = 10) =>
  new File([new Uint8Array(bytes)], name, { type: 'application/pdf' });

describe('coding slides route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user } });
    list.mockResolvedValue({
      data: [{ name: 'Session1.pdf' }, { name: 'notes.txt' }, { name: 'Session3.pdf' }],
      error: null,
    });
    upload.mockResolvedValue({ data: {}, error: null });
  });

  it('lists the slide decks the user has uploaded, from their own folder', async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.uploaded).toEqual(['Session1.pdf', 'Session3.pdf']);
    expect(list).toHaveBeenCalledWith('user-1');
  });

  it('refuses without a session', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET()).status).toBe(401);
    expect((await POST(uploadRequest(pdf('Session1.pdf')))).status).toBe(401);
    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads a known slide deck into the user folder, replacing an old copy', async () => {
    const response = await POST(uploadRequest(pdf('Session3.pdf')));
    expect(response.status).toBe(201);
    expect(upload).toHaveBeenCalledWith('user-1/Session3.pdf', expect.any(File), {
      upsert: true,
      contentType: 'application/pdf',
    });
  });

  it('rejects a missing file, an unknown name, and a non-PDF', async () => {
    expect((await POST(uploadRequest())).status).toBe(400);
    expect((await POST(uploadRequest(pdf('Session5.pdf')))).status).toBe(400);
    expect((await POST(uploadRequest(pdf('../user-2/Session1.pdf')))).status).toBe(400);
    const text = new File(['hi'], 'Session1.pdf', { type: 'text/plain' });
    expect((await POST(uploadRequest(text))).status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it('reports a storage failure instead of claiming success', async () => {
    upload.mockResolvedValue({ data: null, error: { message: 'bucket missing' } });
    const response = await POST(uploadRequest(pdf('Session1.pdf')));
    expect(response.status).toBe(502);
  });
});
