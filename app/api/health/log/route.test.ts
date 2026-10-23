import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

const { listLog, writeLog, HealthLogValidationError } = vi.hoisted(() => {
  class HealthLogValidationError extends Error {}
  return { listLog: vi.fn(), writeLog: vi.fn(), HealthLogValidationError };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/services/health-log', () => ({ listLog, writeLog, HealthLogValidationError }));

import { GET, PUT } from './route';

const put = (body: unknown) =>
  new Request('http://localhost/api/health/log', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('health log route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    listLog.mockResolvedValue([{ day: '2026-10-19', key: 'am|lift-sky', value: '1' }]);
    writeLog.mockResolvedValue(undefined);
  });

  it('lists the signed-in user log', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      entries: [{ day: '2026-10-19', key: 'am|lift-sky', value: '1' }],
    });
    expect(listLog).toHaveBeenCalledWith('user-1');
  });

  it('refuses without a session', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET()).status).toBe(401);
    expect((await PUT(put({ entries: [] }))).status).toBe(401);
    expect(writeLog).not.toHaveBeenCalled();
  });

  it('writes entries for the user', async () => {
    const entries = [{ day: '2026-10-19', key: 'pain|knee', value: '3' }];
    const res = await PUT(put({ entries }));
    expect(res.status).toBe(200);
    expect(writeLog).toHaveBeenCalledWith('user-1', entries);
  });

  it('answers 400 for invalid entries and for a body that is not JSON', async () => {
    writeLog.mockRejectedValue(new HealthLogValidationError('day must be YYYY-MM-DD'));
    expect((await PUT(put({ entries: [{}] }))).status).toBe(400);
    expect((await PUT(put('{nope'))).status).toBe(400);
  });

  it('lets unexpected errors through', async () => {
    writeLog.mockRejectedValue(new Error('database down'));
    await expect(PUT(put({ entries: [{}] }))).rejects.toThrow('database down');
  });
});
