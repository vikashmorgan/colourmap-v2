import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

const { createVoiceNote, listPending, listVoiceNotes } = vi.hoisted(() => ({
  createVoiceNote: vi.fn(),
  listPending: vi.fn(),
  listVoiceNotes: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/services/voice-notes', () => ({ createVoiceNote, listPending, listVoiceNotes }));

import { GET, POST } from './route';

const user = { id: 'user-1', email: 'test@example.com' };
const NOTE = { id: 'note-1', storagePath: 'user-1/voice/1.webm', status: 'captured' };

function post(body: unknown) {
  return new Request('http://localhost/api/voice-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('voice notes route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user } });
    listVoiceNotes.mockResolvedValue([NOTE]);
    listPending.mockResolvedValue([NOTE]);
    createVoiceNote.mockResolvedValue(NOTE);
  });

  it('lists notes for the signed-in user', async () => {
    const response = await GET(new Request('http://localhost/api/voice-notes'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([NOTE]);
    expect(listVoiceNotes).toHaveBeenCalledWith('user-1', 50);
  });

  it('lists only the queue when asked', async () => {
    await GET(new Request('http://localhost/api/voice-notes?pending=1'));

    expect(listPending).toHaveBeenCalledWith('user-1', 50);
    expect(listVoiceNotes).not.toHaveBeenCalled();
  });

  it('caps the limit, whatever the caller asks for', async () => {
    await GET(new Request('http://localhost/api/voice-notes?limit=9999'));

    expect(listVoiceNotes).toHaveBeenCalledWith('user-1', 100);
  });

  it('refuses an anonymous caller', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(new Request('http://localhost/api/voice-notes'));

    expect(response.status).toBe(401);
    expect(listVoiceNotes).not.toHaveBeenCalled();
  });

  it('files a note once its audio is stored', async () => {
    const response = await POST(post({ storagePath: 'user-1/voice/1.webm', durationSecs: 12 }));

    expect(response.status).toBe(201);
    expect(createVoiceNote).toHaveBeenCalledWith('user-1', {
      storagePath: 'user-1/voice/1.webm',
      durationSecs: 12,
    });
  });

  it('requires a storage path', async () => {
    const response = await POST(post({ durationSecs: 12 }));

    expect(response.status).toBe(400);
    expect(createVoiceNote).not.toHaveBeenCalled();
  });

  it('refuses a path outside the caller own folder', async () => {
    /*
     * Without this a crafted path files a row pointing at somebody else's
     * object, and the signed URL the app later fetches hands it over. The
     * bucket is shared with music recordings, so this is not hypothetical.
     */
    const response = await POST(post({ storagePath: 'user-2/voice/1.webm' }));

    expect(response.status).toBe(400);
    expect(createVoiceNote).not.toHaveBeenCalled();
  });

  it('refuses a path that climbs out with dots', async () => {
    const response = await POST(post({ storagePath: 'user-1/../user-2/voice/1.webm' }));

    expect(response.status).toBe(400);
    expect(createVoiceNote).not.toHaveBeenCalled();
  });

  it('caps a duration that claims to be hours long', async () => {
    await POST(post({ storagePath: 'user-1/voice/1.webm', durationSecs: 99999 }));

    expect(createVoiceNote.mock.calls[0]?.[1].durationSecs).toBe(20 * 60);
  });

  it('treats a nonsense duration as unknown rather than zero', async () => {
    /*
     * null means "nobody knows". Zero means "it was instant", which is a
     * claim, and a wrong one.
     */
    await POST(post({ storagePath: 'user-1/voice/1.webm', durationSecs: 'ages' }));

    expect(createVoiceNote.mock.calls[0]?.[1].durationSecs).toBeNull();
  });

  it('rejects a body that is not JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/voice-notes', { method: 'POST', body: 'not json' }),
    );

    expect(response.status).toBe(400);
    expect(createVoiceNote).not.toHaveBeenCalled();
  });
});
