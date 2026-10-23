import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser, remove } = vi.hoisted(() => {
  const getUser = vi.fn();
  const remove = vi.fn();
  const createClient = vi.fn(async () => ({
    auth: { getUser },
    storage: { from: vi.fn(() => ({ remove })) },
  }));
  return { createClient, getUser, remove };
});

const { getChillRecording, deleteChillRecording } = vi.hoisted(() => ({
  getChillRecording: vi.fn(),
  deleteChillRecording: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/services/chill-recordings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/chill-recordings')>();
  return { ...actual, getChillRecording, deleteChillRecording };
});

import { DELETE } from './route';

const ID = '22222222-2222-4222-8222-222222222222';
const ROW = { id: ID, storagePath: `user-1/chill/${ID}.m4a` };
const params = (id = ID) => ({ params: Promise.resolve({ id }) });
const req = () => new Request(`http://localhost/api/chill/recordings/${ID}`, { method: 'DELETE' });

describe('DELETE /api/chill/recordings/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    getChillRecording.mockResolvedValue(ROW);
    deleteChillRecording.mockResolvedValue(ROW);
    remove.mockResolvedValue({ data: [], error: null });
  });

  it('answers 401 to guests', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await DELETE(req(), params())).status).toBe(401);
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes the file and the row', async () => {
    const res = await DELETE(req(), params());
    expect(res.status).toBe(200);
    expect(getChillRecording).toHaveBeenCalledWith('user-1', ID);
    expect(remove).toHaveBeenCalledWith([ROW.storagePath]);
    expect(deleteChillRecording).toHaveBeenCalledWith('user-1', ID);
  });

  it('answers 404 for another user’s recording or a malformed id', async () => {
    getChillRecording.mockResolvedValue(null);
    expect((await DELETE(req(), params())).status).toBe(404);
    expect((await DELETE(req(), params('nope'))).status).toBe(404);
    expect(remove).not.toHaveBeenCalled();
  });

  it('keeps the row when the file cannot be removed', async () => {
    remove.mockResolvedValue({ data: null, error: { message: 'down' } });
    expect((await DELETE(req(), params())).status).toBe(502);
    expect(deleteChillRecording).not.toHaveBeenCalled();
  });
});
