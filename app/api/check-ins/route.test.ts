import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({
    auth: { getUser },
  }));
  return { createClient, getUser };
});

const { createCheckIn, CheckInValidationError } = vi.hoisted(() => {
  const createCheckIn = vi.fn();
  class CheckInValidationError extends Error {
    name = 'CheckInValidationError';
  }
  return { createCheckIn, CheckInValidationError };
});

const { getRecentCheckIns } = vi.hoisted(() => ({
  getRecentCheckIns: vi.fn(),
}));

const { getDb } = vi.hoisted(() => ({
  getDb: vi.fn(() => 'db-instance'),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/services/check-ins', () => ({ createCheckIn, CheckInValidationError }));
vi.mock('@/lib/db/queries/check-ins', () => ({ getRecentCheckIns }));
vi.mock('@/lib/db/client', () => ({ getDb }));

import { GET, POST } from './route';

function makeRequest(body?: unknown) {
  return new Request('http://localhost/api/check-ins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const fakeUser = { id: 'user-1', email: 'test@example.com' };
const fakeCheckIn = {
  id: '00000000-0000-0000-0000-000000000001',
  userId: 'user-1',
  sliderValue: 72,
  note: 'feeling good',
  tags: null,
  createdAt: '2026-03-29T10:00:00.000Z',
};

describe('POST /api/check-ins', () => {
  beforeEach(() => {
    createClient.mockClear();
    getUser.mockReset();
    createCheckIn.mockReset();
    getUser.mockResolvedValue({ data: { user: fakeUser } });
    createCheckIn.mockResolvedValue(fakeCheckIn);
  });

  it('returns 201 with the created check-in', async () => {
    const response = await POST(makeRequest({ sliderValue: 72, note: 'feeling good' }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(fakeCheckIn);
    expect(createCheckIn).toHaveBeenCalledWith('user-1', {
      sliderValue: 72,
      note: 'feeling good',
      tags: null,
    });
  });

  it('returns 201 when note is omitted', async () => {
    const response = await POST(makeRequest({ sliderValue: 50 }));

    expect(response.status).toBe(201);
    expect(createCheckIn).toHaveBeenCalledWith('user-1', {
      sliderValue: 50,
      note: null,
      tags: null,
    });
  });

  it('passes tags to service', async () => {
    const response = await POST(makeRequest({ sliderValue: 50, tags: ['Work', 'Body'] }));

    expect(response.status).toBe(201);
    expect(createCheckIn).toHaveBeenCalledWith('user-1', {
      sliderValue: 50,
      note: null,
      tags: ['Work', 'Body'],
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(makeRequest({ sliderValue: 50 }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(createCheckIn).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body', async () => {
    const request = new Request('http://localhost/api/check-ins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
  });

  it('returns 400 when sliderValue is missing', async () => {
    const response = await POST(makeRequest({ note: 'no slider' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'sliderValue is required' });
  });

  it('returns 400 when sliderValue is not a number', async () => {
    const response = await POST(makeRequest({ sliderValue: 'fifty' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'sliderValue must be a number' });
  });

  it('returns 400 when the service throws a validation error', async () => {
    createCheckIn.mockRejectedValue(
      new CheckInValidationError('sliderValue must be an integer between 0 and 100'),
    );

    const response = await POST(makeRequest({ sliderValue: 50.5 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'sliderValue must be an integer between 0 and 100',
    });
  });

  it('re-throws unexpected errors', async () => {
    createCheckIn.mockRejectedValue(new Error('unexpected'));

    await expect(POST(makeRequest({ sliderValue: 50 }))).rejects.toThrow('unexpected');
  });

  it('coerces non-string note to null', async () => {
    const response = await POST(makeRequest({ sliderValue: 50, note: 123 }));

    expect(response.status).toBe(201);
    expect(createCheckIn).toHaveBeenCalledWith('user-1', {
      sliderValue: 50,
      note: null,
      tags: null,
    });
  });
});

describe('GET /api/check-ins', () => {
  beforeEach(() => {
    createClient.mockClear();
    getUser.mockReset();
    getRecentCheckIns.mockReset();
    getDb.mockClear();
    getUser.mockResolvedValue({ data: { user: fakeUser } });
    getRecentCheckIns.mockResolvedValue([fakeCheckIn]);
  });

  it('returns recent check-ins for authenticated user', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([fakeCheckIn]);
    expect(getRecentCheckIns).toHaveBeenCalledWith('db-instance', 'user-1');
  });

  it('returns 401 when user is not authenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(getRecentCheckIns).not.toHaveBeenCalled();
  });

  it('returns empty array when no check-ins exist', async () => {
    getRecentCheckIns.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});
