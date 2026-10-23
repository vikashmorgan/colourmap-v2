import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

const { listPrefs, writePrefs, HealthPrefValidationError } = vi.hoisted(() => {
  class HealthPrefValidationError extends Error {}
  return { listPrefs: vi.fn(), writePrefs: vi.fn(), HealthPrefValidationError };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/services/health-prefs', () => ({
  listPrefs,
  writePrefs,
  HealthPrefValidationError,
}));

import { GET, PUT } from './route';

const put = (body: unknown) =>
  new Request('http://localhost/api/health/prefs', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('health prefs route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    listPrefs.mockResolvedValue([{ key: 'order|knee', value: 'wall-sit,clamshell' }]);
    writePrefs.mockResolvedValue(undefined);
  });

  it('lists the signed-in user prefs', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      prefs: [{ key: 'order|knee', value: 'wall-sit,clamshell' }],
    });
    expect(listPrefs).toHaveBeenCalledWith('user-1');
  });

  it('refuses without a session', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET()).status).toBe(401);
    expect((await PUT(put({ prefs: [] }))).status).toBe(401);
    expect(writePrefs).not.toHaveBeenCalled();
  });

  it('writes prefs for the user', async () => {
    const entries = [{ key: 'aside|step-down', value: '1' }];
    const res = await PUT(put({ prefs: entries }));
    expect(res.status).toBe(200);
    expect(writePrefs).toHaveBeenCalledWith('user-1', entries);
  });

  it('writes the favourites pack', async () => {
    const entries = [{ key: 'fav', value: 'wall-slide,clamshell' }];
    const res = await PUT(put({ prefs: entries }));
    expect(res.status).toBe(200);
    expect(writePrefs).toHaveBeenCalledWith('user-1', entries);
  });

  it('answers 400 for invalid entries and for a body that is not JSON', async () => {
    writePrefs.mockRejectedValue(new HealthPrefValidationError('key must be 1-100 characters'));
    expect((await PUT(put({ prefs: [{}] }))).status).toBe(400);
    expect((await PUT(put('{nope'))).status).toBe(400);
  });

  it('lets unexpected errors through', async () => {
    writePrefs.mockRejectedValue(new Error('database down'));
    await expect(PUT(put({ prefs: [{}] }))).rejects.toThrow('database down');
  });
});
