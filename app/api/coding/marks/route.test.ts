import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

const { getState, mergeState, saveBox, CodingMarkValidationError } = vi.hoisted(() => {
  class CodingMarkValidationError extends Error {}
  return {
    getState: vi.fn(),
    mergeState: vi.fn(),
    saveBox: vi.fn(),
    CodingMarkValidationError,
  };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/services/coding-marks', () => ({
  CodingMarkValidationError,
  getState,
  mergeState,
  saveBox,
}));

import { GET, POST, PUT } from './route';

const user = { id: 'user-1', email: 'test@example.com' };
const STATE = {
  marks: { 's3|while': 'got' },
  notes: { 's3|if': { text: 'elif vs else?', kind: 'question' } },
};

function send(method: 'PUT' | 'POST', body: unknown) {
  return new Request('http://localhost/api/coding/marks', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('coding marks route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user } });
    getState.mockResolvedValue(STATE);
    mergeState.mockResolvedValue(2);
    saveBox.mockResolvedValue(undefined);
  });

  it('returns the signed-in user marks and notes', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(STATE);
    expect(getState).toHaveBeenCalledWith('user-1');
  });

  it('refuses every method without a session', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET()).status).toBe(401);
    expect((await PUT(send('PUT', { key: 'k', mark: 'got' }))).status).toBe(401);
    expect((await POST(send('POST', { marks: {} }))).status).toBe(401);
    expect(saveBox).not.toHaveBeenCalled();
    expect(mergeState).not.toHaveBeenCalled();
  });

  it('saves one box', async () => {
    const note = { text: 'When does it stop?', kind: 'question' };
    const response = await PUT(send('PUT', { key: 's3|while', mark: 'mid', note }));
    expect(response.status).toBe(200);
    expect(saveBox).toHaveBeenCalledWith('user-1', 's3|while', 'mid', note);
  });

  it('treats a missing mark or note as cleared', async () => {
    await PUT(send('PUT', { key: 's3|while' }));
    expect(saveBox).toHaveBeenCalledWith('user-1', 's3|while', null, null);
  });

  it('answers 400 for invalid input and for a body that is not JSON', async () => {
    saveBox.mockRejectedValue(new CodingMarkValidationError('mark must be got, mid, late or null'));
    const bad = await PUT(send('PUT', { key: 's3|while', mark: 'maybe' }));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: 'mark must be got, mid, late or null' });

    const notJson = await PUT(send('PUT', '{not json'));
    expect(notJson.status).toBe(400);
  });

  it('merges marks and notes from the browser', async () => {
    const body = {
      marks: { 's1|print()': 'got' },
      notes: { 's4|def': { text: 'Hm', kind: 'comment' } },
    };
    const response = await POST(send('POST', body));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ merged: 2 });
    expect(mergeState).toHaveBeenCalledWith('user-1', body.marks, body.notes);
  });

  it('answers 400 when a merge is invalid', async () => {
    mergeState.mockRejectedValue(new CodingMarkValidationError('at most 1000 boxes at once'));
    const response = await POST(send('POST', { marks: {} }));
    expect(response.status).toBe(400);
  });

  it('lets unexpected errors through instead of hiding them as 400', async () => {
    saveBox.mockRejectedValue(new Error('database down'));
    await expect(PUT(send('PUT', { key: 's3|while', mark: 'got' }))).rejects.toThrow(
      'database down',
    );
  });
});
