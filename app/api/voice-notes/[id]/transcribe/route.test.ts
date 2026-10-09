import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser, download } = vi.hoisted(() => {
  const getUser = vi.fn();
  const download = vi.fn();
  const createClient = vi.fn(async () => ({
    auth: { getUser },
    storage: { from: () => ({ download }) },
  }));
  return { createClient, getUser, download };
});

const { attachReading, claimForTranscription, getVoiceNote, markFailed } = vi.hoisted(() => ({
  attachReading: vi.fn(),
  claimForTranscription: vi.fn(),
  getVoiceNote: vi.fn(),
  markFailed: vi.fn(),
}));

const { transcribe } = vi.hoisted(() => ({ transcribe: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/services/voice-notes', () => ({
  attachReading,
  claimForTranscription,
  getVoiceNote,
  markFailed,
}));
vi.mock('@/lib/transcribe', () => ({ transcribe }));

import { POST } from './route';

const user = { id: 'user-1' };
const CAPTURED = { id: 'note-1', status: 'captured', storagePath: 'user-1/voice/1.webm' };
const READING = { text: 'Rappeler la commune.', lang: 'fr', branch: 'admin', isIntention: true };

function audioBlob() {
  return { arrayBuffer: async () => new ArrayBuffer(8), type: 'audio/webm' };
}

function call() {
  return POST(new Request('http://localhost', { method: 'POST' }), {
    params: Promise.resolve({ id: 'note-1' }),
  });
}

describe('reading one voice note', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user } });
    getVoiceNote.mockResolvedValue(CAPTURED);
    claimForTranscription.mockResolvedValue({ ...CAPTURED, status: 'transcribing' });
    download.mockResolvedValue({ data: audioBlob(), error: null });
    transcribe.mockResolvedValue({ ok: true, reading: READING });
    attachReading.mockResolvedValue({
      ...CAPTURED,
      status: 'transcribed',
      transcript: READING.text,
    });
    markFailed.mockImplementation(async (_u, _i, error) => ({
      ...CAPTURED,
      status: 'failed',
      error,
    }));
  });

  it('reads the audio and attaches the words', async () => {
    const response = await call();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'transcribed' });
    expect(attachReading).toHaveBeenCalledWith('user-1', 'note-1', READING);
  });

  it('refuses an anonymous caller', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    expect((await call()).status).toBe(401);
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('404s a note that is not yours', async () => {
    /*
     * getVoiceNote scopes by user id, so somebody else's note is simply not
     * there. 404 rather than 403 — a 403 confirms the id exists.
     */
    getVoiceNote.mockResolvedValue(null);

    expect((await call()).status).toBe(404);
    expect(claimForTranscription).not.toHaveBeenCalled();
  });

  it('does not pay to read a note twice', async () => {
    getVoiceNote.mockResolvedValue({ ...CAPTURED, status: 'transcribed', transcript: 'déjà lu' });

    const response = await call();

    expect(response.status).toBe(200);
    expect(transcribe).not.toHaveBeenCalled();
    expect(claimForTranscription).not.toHaveBeenCalled();
  });

  it('claims the note before doing anything expensive', async () => {
    await call();

    expect(claimForTranscription).toHaveBeenCalledWith('user-1', 'note-1');
    expect(claimForTranscription.mock.invocationCallOrder[0]).toBeLessThan(
      transcribe.mock.invocationCallOrder[0] as number,
    );
  });

  it('conflicts rather than racing when the claim fails', async () => {
    /*
     * Somebody is already reading it, or it failed and has not been reopened.
     * Either way the right move is to leave it alone, not to read it again.
     */
    claimForTranscription.mockResolvedValue(null);

    expect((await call()).status).toBe(409);
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('records a missing object instead of leaving the note claimed', async () => {
    download.mockResolvedValue({ data: null, error: { message: 'Object not found' } });

    const response = await call();

    expect(response.status).toBe(502);
    expect(markFailed).toHaveBeenCalledWith('user-1', 'note-1', 'Object not found');
  });

  it('answers 200 with the failure written down when the model cannot read it', async () => {
    /*
     * The request did what it was asked: it tried, and the note now says why
     * it did not work. The audio is untouched and retryable, so an error
     * status would claim something worse happened than did.
     */
    transcribe.mockResolvedValue({ ok: false, error: 'nothing audible' });

    const response = await call();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'failed', error: 'nothing audible' });
    expect(attachReading).not.toHaveBeenCalled();
  });

  it('passes the stored content type through to the model', async () => {
    download.mockResolvedValue({
      data: { arrayBuffer: async () => new ArrayBuffer(8), type: 'audio/mp4' },
      error: null,
    });

    await call();

    expect(transcribe.mock.calls[0]?.[1]).toBe('audio/mp4');
  });

  it('falls back to webm when storage reports no type', async () => {
    download.mockResolvedValue({
      data: { arrayBuffer: async () => new ArrayBuffer(8), type: '' },
      error: null,
    });

    await call();

    expect(transcribe.mock.calls[0]?.[1]).toBe('audio/webm');
  });
});
