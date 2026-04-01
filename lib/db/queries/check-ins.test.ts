import { beforeEach, describe, expect, it, vi } from 'vitest';

const returning = vi.fn();
const values = vi.fn(() => ({ returning }));
const insert = vi.fn(() => ({ values }));

const limit = vi.fn();
const orderBy = vi.fn(() => ({ limit }));
const where = vi.fn(() => ({ orderBy }));
const from = vi.fn(() => ({ where }));
const select = vi.fn(() => ({ from }));

const db = { insert, select } as unknown as Parameters<typeof insertCheckIn>[0];

import { getRecentCheckIns, insertCheckIn } from './check-ins';

describe('insertCheckIn', () => {
  const fakeRow = {
    id: '00000000-0000-0000-0000-000000000001',
    userId: 'user-1',
    sliderValue: 72,
    note: 'feeling good',
    tags: ['Work'],
    createdAt: new Date('2026-03-29T10:00:00Z'),
  };

  beforeEach(() => {
    insert.mockClear();
    values.mockClear();
    returning.mockReset();
    returning.mockResolvedValue([fakeRow]);
  });

  it('inserts a check-in and returns the persisted row', async () => {
    const result = await insertCheckIn(db, {
      userId: 'user-1',
      sliderValue: 72,
      note: 'feeling good',
      tags: ['Work'],
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith({
      userId: 'user-1',
      sliderValue: 72,
      note: 'feeling good',
      tags: ['Work'],
    });
    expect(returning).toHaveBeenCalledTimes(1);
    expect(result).toEqual(fakeRow);
  });

  it('passes null note and tags through to the database', async () => {
    returning.mockResolvedValue([{ ...fakeRow, note: null, tags: null }]);

    const result = await insertCheckIn(db, {
      userId: 'user-1',
      sliderValue: 50,
      note: null,
      tags: null,
    });

    expect(values).toHaveBeenCalledWith({
      userId: 'user-1',
      sliderValue: 50,
      note: null,
      tags: null,
    });
    expect(result.note).toBeNull();
    expect(result.tags).toBeNull();
  });

  it('propagates database errors', async () => {
    returning.mockRejectedValue(new Error('connection failed'));

    await expect(
      insertCheckIn(db, { userId: 'user-1', sliderValue: 50, note: null, tags: null }),
    ).rejects.toThrow('connection failed');
  });
});

describe('getRecentCheckIns', () => {
  const fakeRows = [
    { id: '1', userId: 'user-1', sliderValue: 50, note: null, tags: null, createdAt: new Date() },
  ];

  beforeEach(() => {
    select.mockClear();
    from.mockClear();
    where.mockClear();
    orderBy.mockClear();
    limit.mockReset();
    limit.mockResolvedValue(fakeRows);
  });

  it('returns recent check-ins for a user', async () => {
    const result = await getRecentCheckIns(db, 'user-1');

    expect(select).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
    expect(orderBy).toHaveBeenCalledTimes(1);
    expect(limit).toHaveBeenCalledWith(7);
    expect(result).toEqual(fakeRows);
  });

  it('respects custom limit', async () => {
    await getRecentCheckIns(db, 'user-1', 3);

    expect(limit).toHaveBeenCalledWith(3);
  });
});
