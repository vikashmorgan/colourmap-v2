// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser, list, upload, remove, createSignedUrls } = vi.hoisted(() => {
  const getUser = vi.fn();
  const list = vi.fn();
  const upload = vi.fn();
  const remove = vi.fn();
  const createSignedUrls = vi.fn();
  const createClient = vi.fn(async () => ({
    auth: { getUser },
    storage: { from: vi.fn(() => ({ list, upload, remove, createSignedUrls })) },
  }));
  return { createClient, getUser, list, upload, remove, createSignedUrls };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { DELETE, GET, POST } from './route';

const user = { id: 'user-1' };
const IDEA = '11111111-2222-4333-8444-555555555555';
const params = (ideaId = IDEA) => ({ params: Promise.resolve({ ideaId }) });
const url = (q = '') => `http://localhost/api/art/gallery/${IDEA}${q}`;

function uploadRequest(file?: File) {
  const form = new FormData();
  if (file) form.set('file', file);
  return new Request(url(), { method: 'POST', body: form });
}
const image = (name: string, type = 'image/jpeg', bytes = 10) =>
  new File([new Uint8Array(bytes)], name, { type });

describe('art gallery route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user } });
    list.mockResolvedValue({
      data: [{ name: '1000-thunder.jpg' }, { name: 'notes.txt' }, { name: '2000-steps.png' }],
      error: null,
    });
    createSignedUrls.mockResolvedValue({
      data: [{ signedUrl: 'https://signed/1' }, { signedUrl: 'https://signed/2' }],
      error: null,
    });
    upload.mockResolvedValue({ data: {}, error: null });
    remove.mockResolvedValue({ data: {}, error: null });
  });

  it('lists the pictures of an idea from the user folder, with signed links', async () => {
    const response = await GET(new Request(url()), params());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith(`user-1/${IDEA}`, expect.anything());
    expect(createSignedUrls).toHaveBeenCalledWith(
      [`user-1/${IDEA}/1000-thunder.jpg`, `user-1/${IDEA}/2000-steps.png`],
      3600,
    );
    expect(body.images).toEqual([
      { name: '1000-thunder.jpg', url: 'https://signed/1' },
      { name: '2000-steps.png', url: 'https://signed/2' },
    ]);
  });

  it('answers an empty gallery without signing anything', async () => {
    list.mockResolvedValue({ data: [], error: null });
    const body = await (await GET(new Request(url()), params())).json();
    expect(body.images).toEqual([]);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it('refuses without a session, and refuses an idea id that is not a uuid', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET(new Request(url()), params())).status).toBe(401);
    getUser.mockResolvedValue({ data: { user } });
    expect((await GET(new Request(url()), params('../user-2'))).status).toBe(400);
    expect((await POST(uploadRequest(image('a.jpg')), params('x'))).status).toBe(400);
    expect((await DELETE(new Request(url('?name=1000-a.jpg')), params('x'))).status).toBe(400);
    expect(list).not.toHaveBeenCalled();
  });

  it('adds a picture under a cleaned, timestamped name', async () => {
    const response = await POST(uploadRequest(image('Thunder Sketch.JPG')), params());
    expect(response.status).toBe(201);
    const { name } = await response.json();
    expect(name).toMatch(/^\d+-thunder-sketch\.jpg$/);
    expect(upload).toHaveBeenCalledWith(`user-1/${IDEA}/${name}`, expect.any(File), {
      contentType: 'image/jpeg',
    });
  });

  it('refuses a missing file, a non-image and a picture over 10 MB', async () => {
    expect((await POST(uploadRequest(), params())).status).toBe(400);
    expect((await POST(uploadRequest(image('a.pdf', 'application/pdf')), params())).status).toBe(
      400,
    );
    expect(
      (await POST(uploadRequest(image('big.jpg', 'image/jpeg', 10 * 1024 * 1024 + 1)), params()))
        .status,
    ).toBe(413);
    expect(upload).not.toHaveBeenCalled();
  });

  it('removes only a picture it could have stored', async () => {
    expect((await DELETE(new Request(url('?name=1000-thunder.jpg')), params())).status).toBe(200);
    expect(remove).toHaveBeenCalledWith([`user-1/${IDEA}/1000-thunder.jpg`]);
    expect((await DELETE(new Request(url('?name=../x.jpg')), params())).status).toBe(400);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('passes a storage failure on as a 502', async () => {
    upload.mockResolvedValue({ data: null, error: { message: 'storage down' } });
    expect((await POST(uploadRequest(image('a.jpg')), params())).status).toBe(502);
  });
});
