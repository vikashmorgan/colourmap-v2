import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { uploadToSignedUrl, from } = vi.hoisted(() => {
  const uploadToSignedUrl = vi.fn();
  const from = vi.fn(() => ({ uploadToSignedUrl }));
  return { uploadToSignedUrl, from };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from } }),
}));

import {
  ChillApiError,
  deleteMix,
  deleteRecording,
  listMixes,
  listRecordings,
  saveMix,
  updateMix,
  uploadRecording,
} from './account-api';

const fetchMock = vi.fn();

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('account-api', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    uploadToSignedUrl.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists, saves, updates and deletes mixes', async () => {
    fetchMock.mockResolvedValueOnce(ok([{ id: 'm1' }]));
    await expect(listMixes()).resolves.toEqual([{ id: 'm1' }]);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/chill/mixes', undefined);

    fetchMock.mockResolvedValueOnce(ok({ id: 'm1' }, 201));
    await saveMix('Night', { palette: 'night' });
    const [url, init] = fetchMock.mock.lastCall as [string, RequestInit];
    expect(url).toBe('/api/chill/mixes');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      title: 'Night',
      settings: { palette: 'night' },
    });

    fetchMock.mockResolvedValueOnce(ok({ id: 'm1', title: 'New' }));
    await updateMix('m1', { title: 'New' });
    expect(fetchMock.mock.lastCall?.[0]).toBe('/api/chill/mixes/m1');
    expect((fetchMock.mock.lastCall?.[1] as RequestInit).method).toBe('PATCH');

    fetchMock.mockResolvedValueOnce(ok({ deleted: 'm1' }));
    await deleteMix('m1');
    expect(fetchMock).toHaveBeenLastCalledWith('/api/chill/mixes/m1', { method: 'DELETE' });
  });

  it('throws the server message with its status', async () => {
    fetchMock.mockResolvedValueOnce(ok({ error: 'title required' }, 400));
    const err = await saveMix('', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChillApiError);
    expect((err as ChillApiError).message).toBe('title required');
    expect((err as ChillApiError).status).toBe(400);
  });

  it('falls back to a generic message for non-JSON errors', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }));
    await expect(listMixes()).rejects.toThrow('Request failed (500)');
  });

  it('lists and deletes recordings', async () => {
    fetchMock.mockResolvedValueOnce(ok([{ id: 'r1', url: 'https://signed' }]));
    await expect(listRecordings()).resolves.toEqual([{ id: 'r1', url: 'https://signed' }]);

    fetchMock.mockResolvedValueOnce(ok({ deleted: 'r1' }));
    await deleteRecording('r1');
    expect(fetchMock).toHaveBeenLastCalledWith('/api/chill/recordings/r1', { method: 'DELETE' });
  });

  it('uploads a take straight to storage, then registers it', async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ storagePath: 'u/chill/x.webm', token: 'tok' }))
      .mockResolvedValueOnce(ok({ id: 'r1', url: 'https://signed' }, 201));
    uploadToSignedUrl.mockResolvedValue({ data: {}, error: null });
    const blob = new Blob(['abc'], { type: 'audio/webm' });

    const saved = await uploadRecording(
      { blob, mimeType: 'audio/webm;codecs=opus', durationSecs: 12 },
      { title: 'Take', palette: 'warm', cues: [{ at: 0, label: 'Intro' }] },
    );

    expect(saved).toEqual({ id: 'r1', url: 'https://signed' });
    const [signUrl, signInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(signUrl).toBe('/api/chill/recordings/upload-url');
    expect(JSON.parse(signInit.body as string)).toEqual({
      mimeType: 'audio/webm;codecs=opus',
      size: 3,
    });
    expect(from).toHaveBeenCalledWith('recordings');
    expect(uploadToSignedUrl).toHaveBeenCalledWith('u/chill/x.webm', 'tok', blob, {
      contentType: 'audio/webm',
    });
    const [regUrl, regInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(regUrl).toBe('/api/chill/recordings');
    expect(JSON.parse(regInit.body as string)).toEqual({
      storagePath: 'u/chill/x.webm',
      mimeType: 'audio/webm;codecs=opus',
      durationSecs: 12,
      title: 'Take',
      palette: 'warm',
      cues: [{ at: 0, label: 'Intro' }],
    });
  });

  it('stops when the storage upload fails', async () => {
    fetchMock.mockResolvedValueOnce(ok({ storagePath: 'p', token: 't' }));
    uploadToSignedUrl.mockResolvedValue({ data: null, error: { message: 'too big' } });
    await expect(
      uploadRecording(
        { blob: new Blob(['a']), mimeType: 'audio/mp4', durationSecs: 1 },
        { title: 'T' },
      ),
    ).rejects.toThrow('too big');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces a 413 from the size check', async () => {
    fetchMock.mockResolvedValueOnce(ok({ error: 'Recording is larger than 200 MB' }, 413));
    const err = await uploadRecording(
      { blob: new Blob(['a']), mimeType: 'audio/mp4', durationSecs: 1 },
      { title: 'T' },
    ).catch((e: unknown) => e);
    expect((err as ChillApiError).status).toBe(413);
    expect(uploadToSignedUrl).not.toHaveBeenCalled();
  });
});
