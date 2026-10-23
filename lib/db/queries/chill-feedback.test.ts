import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDb, insert, values, select, from, leftJoin, orderBy, limit } = vi.hoisted(() => {
  const values = vi.fn(async () => undefined);
  const insert = vi.fn(() => ({ values }));
  const limit = vi.fn(async () => [{ id: 'f1' }]);
  const orderBy = vi.fn(() => ({ limit }));
  const leftJoin = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ leftJoin }));
  const select = vi.fn(() => ({ from }));
  const getDb = vi.fn(() => ({ insert, select }));
  return { getDb, insert, values, select, from, leftJoin, orderBy, limit };
});

vi.mock('@/lib/db/client', () => ({ getDb }));

import { chillFeedback } from '@/lib/db/schema';
import { insertChillFeedback, listChillFeedback } from './chill-feedback';

describe('chill feedback queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts one note', async () => {
    const note = { userId: null, name: 'Ana', message: 'More rain', palette: 'dusk' };
    await insertChillFeedback(note);
    expect(insert).toHaveBeenCalledWith(chillFeedback);
    expect(values).toHaveBeenCalledWith(note);
  });

  it('lists the latest notes with the sender email, newest first', async () => {
    await expect(listChillFeedback()).resolves.toEqual([{ id: 'f1' }]);
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ email: expect.anything() }));
    expect(from).toHaveBeenCalledWith(chillFeedback);
    expect(leftJoin).toHaveBeenCalled();
    expect(orderBy).toHaveBeenCalled();
    expect(limit).toHaveBeenCalledWith(200);
  });
});
