// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser, upload, remove, createSignedUrl, createSignedUrls, from } =
  vi.hoisted(() => {
    const getUser = vi.fn();
    const upload = vi.fn();
    const remove = vi.fn();
    const createSignedUrl = vi.fn();
    const createSignedUrls = vi.fn();
    const from = vi.fn(() => ({ upload, remove, createSignedUrl, createSignedUrls }));
    const createClient = vi.fn(async () => ({ auth: { getUser }, storage: { from } }));
    return { createClient, getUser, upload, remove, createSignedUrl, createSignedUrls, from };
  });

const { createChillRecording, listChillRecordings } = vi.hoisted(() => ({
  createChillRecording: vi.fn(),
  listChillRecordings: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/services/chill-recordings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/chill-recordings')>();
  return { ...actual, createChillRecording, listChillRecordings };
});

import { GET, POST } from './route';

const USER = '11111111-1111-4111-8111-111111111111';
const FILE_ID = '33333333-3333-4333-8333-333333333333';
const user = { id: USER, email: 'guest@example.com' };
const ROW = {
  id: 'rec-1',
  userId: USER,
  title: 'Take',
  storagePath: `${USER}/chill/${FILE_ID}.m4a`,
  mimeType: 'audio/mp4',
};

function multipart(fields: Record<string, string | Blob>, headers: Record<string, string> = {}) {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  return new Request('http://localhost/api/chill/recordings', { method: 'POST', body, headers });
}

function json(body: unknown) {
  return new Request('http://localhost/api/chill/recordings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const audio = (type = 'audio/mp4') => new Blob(['abc'], { type });

describe('/api/chill/recordings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user } });
    upload.mockResolvedValue({ data: {}, error: null });
    remove.mockResolvedValue({ data: [], error: null });
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed/one' }, error: null });
    createSignedUrls.mockResolvedValue({ data: [{ signedUrl: 'https://signed/a' }], error: null });
    createChillRecording.mockResolvedValue(ROW);
    listChillRecordings.mockResolvedValue([ROW]);
  });

  it('answers 401 to guests', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET()).status).toBe(401);
    expect((await POST(multipart({ file: audio(), title: 'a' }))).status).toBe(401);
    expect(upload).not.toHaveBeenCalled();
  });

  describe('GET', () => {
    it('lists the user recordings with fresh signed URLs', async () => {
      const res = await GET();
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual([{ ...ROW, url: 'https://signed/a' }]);
      expect(listChillRecordings).toHaveBeenCalledWith(USER);
      expect(from).toHaveBeenCalledWith('recordings');
      expect(createSignedUrls).toHaveBeenCalledWith([ROW.storagePath], 3600);
    });

    it('skips signing when there are none', async () => {
      listChillRecordings.mockResolvedValue([]);
      await expect((await GET()).json()).resolves.toEqual([]);
      expect(createSignedUrls).not.toHaveBeenCalled();
    });

    it('answers 502 when signing fails', async () => {
      createSignedUrls.mockResolvedValue({ data: null, error: { message: 'down' } });
      expect((await GET()).status).toBe(502);
    });
  });

  describe('POST multipart', () => {
    it('uploads into the user folder and saves the row', async () => {
      const res = await POST(
        multipart({
          file: audio(),
          title: 'Take',
          mimeType: 'audio/mp4',
          durationSecs: '42',
          palette: 'warm',
          cues: JSON.stringify([{ at: 0, label: 'Intro' }]),
        }),
      );

      expect(res.status).toBe(201);
      await expect(res.json()).resolves.toEqual({ ...ROW, url: 'https://signed/one' });
      const [path, , options] = upload.mock.calls[0];
      expect(path).toMatch(new RegExp(`^${USER}/chill/[0-9a-f-]{36}\\.m4a$`));
      expect(options).toEqual({ contentType: 'audio/mp4', upsert: false });
      expect(createChillRecording).toHaveBeenCalledWith(USER, {
        title: 'Take',
        durationSecs: 42,
        palette: 'warm',
        cues: [{ at: 0, label: 'Intro' }],
        storagePath: path,
        mimeType: 'audio/mp4',
      });
    });

    it('stores webm (with codec parameters) as .webm', async () => {
      await POST(multipart({ file: audio('audio/webm;codecs=opus'), title: 'Take' }));
      expect(upload.mock.calls[0][0]).toMatch(/\.webm$/);
      expect(upload.mock.calls[0][2]).toEqual({ contentType: 'audio/webm', upsert: false });
    });

    it('refuses other audio types', async () => {
      const res = await POST(multipart({ file: audio('audio/mpeg'), title: 'Take' }));
      expect(res.status).toBe(400);
      expect(upload).not.toHaveBeenCalled();
    });

    it('refuses bodies over 200 MB with 413', async () => {
      const res = await POST(
        multipart(
          { file: audio(), title: 'Take' },
          { 'content-length': String(201 * 1024 * 1024) },
        ),
      );
      expect(res.status).toBe(413);
      expect(upload).not.toHaveBeenCalled();
    });

    it('requires a file and a title', async () => {
      expect((await POST(multipart({ title: 'Take' }))).status).toBe(400);
      expect((await POST(multipart({ file: audio(), title: '' }))).status).toBe(400);
      expect(upload).not.toHaveBeenCalled();
    });

    it('answers 502 when storage refuses the upload', async () => {
      upload.mockResolvedValue({ data: null, error: { message: 'quota' } });
      expect((await POST(multipart({ file: audio(), title: 'Take' }))).status).toBe(502);
      expect(createChillRecording).not.toHaveBeenCalled();
    });

    it('removes the uploaded file when the row cannot be saved', async () => {
      createChillRecording.mockRejectedValue(new Error('db down'));
      await expect(POST(multipart({ file: audio(), title: 'Take' }))).rejects.toThrow('db down');
      expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]]);
    });
  });

  describe('POST JSON (register a direct upload)', () => {
    const body = { storagePath: ROW.storagePath, mimeType: 'audio/mp4', title: 'Take' };

    it('registers a file in the user folder', async () => {
      const res = await POST(json(body));
      expect(res.status).toBe(201);
      await expect(res.json()).resolves.toEqual({ ...ROW, url: 'https://signed/one' });
      expect(createSignedUrl).toHaveBeenCalledWith(ROW.storagePath, 3600);
      expect(createChillRecording).toHaveBeenCalledWith(USER, {
        title: 'Take',
        durationSecs: null,
        palette: null,
        cues: null,
        storagePath: ROW.storagePath,
        mimeType: 'audio/mp4',
      });
    });

    it('refuses paths outside the user folder', async () => {
      const other = `44444444-4444-4444-8444-444444444444/chill/${FILE_ID}.m4a`;
      expect((await POST(json({ ...body, storagePath: other }))).status).toBe(400);
      expect((await POST(json({ ...body, storagePath: 'x.m4a' }))).status).toBe(400);
      expect(createChillRecording).not.toHaveBeenCalled();
    });

    it('refuses a missing upload, a bad type and bad JSON', async () => {
      createSignedUrl.mockResolvedValue({ data: null, error: { message: 'not found' } });
      expect((await POST(json(body))).status).toBe(400);
      expect((await POST(json({ ...body, mimeType: 'audio/wav' }))).status).toBe(400);
      expect((await POST(json('{bad'))).status).toBe(400);
      expect((await POST(json({ ...body, title: '' }))).status).toBe(400);
      expect(createChillRecording).not.toHaveBeenCalled();
    });
  });
});
