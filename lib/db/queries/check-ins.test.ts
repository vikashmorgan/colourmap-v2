import { beforeEach, describe, expect, it, vi } from 'vitest';

const returning = vi.fn();
const values = vi.fn(() => ({ returning }));
const insert = vi.fn(() => ({ values }));
const db = { insert } as unknown as Parameters<typeof insertCheckIn>[0];

import { insertCheckIn } from './check-ins';

describe('insertCheckIn', () => {
  const fakeRow = {
    id: '00000000-0000-0000-0000-000000000001',
    userId: 'user-1',
    sliderValue: 72,
    note: 'feeling good',
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
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith({
      userId: 'user-1',
      sliderValue: 72,
      note: 'feeling good',
    });
    expect(returning).toHaveBeenCalledTimes(1);
    expect(result).toEqual(fakeRow);
  });

  it('passes null note through to the database', async () => {
    returning.mockResolvedValue([{ ...fakeRow, note: null }]);

    const result = await insertCheckIn(db, {
      userId: 'user-1',
      sliderValue: 50,
      note: null,
    });

    expect(values).toHaveBeenCalledWith({
      userId: 'user-1',
      sliderValue: 50,
      note: null,
    });
    expect(result.note).toBeNull();
  });

  it('propagates database errors', async () => {
    returning.mockRejectedValue(new Error('connection failed'));

    await expect(
      insertCheckIn(db, { userId: 'user-1', sliderValue: 50, note: null }),
    ).rejects.toThrow('connection failed');
  });
});
