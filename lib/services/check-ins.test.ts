import { beforeEach, describe, expect, it, vi } from 'vitest';

const { insertCheckIn } = vi.hoisted(() => ({
  insertCheckIn: vi.fn(),
}));

const { getDb } = vi.hoisted(() => ({
  getDb: vi.fn(() => 'db-instance'),
}));

vi.mock('@/lib/db/queries/check-ins', () => ({ insertCheckIn }));
vi.mock('@/lib/db/client', () => ({ getDb }));

import { CheckInValidationError, createCheckIn } from './check-ins';

describe('createCheckIn', () => {
  const fakeRow = {
    id: '00000000-0000-0000-0000-000000000001',
    userId: 'user-1',
    sliderValue: 72,
    note: 'feeling good',
    tags: null,
    createdAt: new Date('2026-03-29T10:00:00Z'),
  };

  beforeEach(() => {
    insertCheckIn.mockReset();
    getDb.mockClear();
    insertCheckIn.mockResolvedValue(fakeRow);
  });

  it('creates a check-in with a valid slider value and note', async () => {
    const result = await createCheckIn('user-1', { sliderValue: 72, note: 'feeling good' });

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(insertCheckIn).toHaveBeenCalledWith('db-instance', {
      userId: 'user-1',
      sliderValue: 72,
      note: 'feeling good',
      tags: null,
    });
    expect(result).toEqual(fakeRow);
  });

  it('converts undefined note to null', async () => {
    await createCheckIn('user-1', { sliderValue: 50 });

    expect(insertCheckIn).toHaveBeenCalledWith('db-instance', {
      userId: 'user-1',
      sliderValue: 50,
      note: null,
      tags: null,
    });
  });

  it('converts null note to null', async () => {
    await createCheckIn('user-1', { sliderValue: 50, note: null });

    expect(insertCheckIn).toHaveBeenCalledWith('db-instance', {
      userId: 'user-1',
      sliderValue: 50,
      note: null,
      tags: null,
    });
  });

  it('converts empty string note to null', async () => {
    await createCheckIn('user-1', { sliderValue: 50, note: '' });

    expect(insertCheckIn).toHaveBeenCalledWith('db-instance', {
      userId: 'user-1',
      sliderValue: 50,
      note: null,
      tags: null,
    });
  });

  it('converts whitespace-only note to null', async () => {
    await createCheckIn('user-1', { sliderValue: 50, note: '   ' });

    expect(insertCheckIn).toHaveBeenCalledWith('db-instance', {
      userId: 'user-1',
      sliderValue: 50,
      note: null,
      tags: null,
    });
  });

  it('trims whitespace from note', async () => {
    await createCheckIn('user-1', { sliderValue: 50, note: '  hello  ' });

    expect(insertCheckIn).toHaveBeenCalledWith('db-instance', {
      userId: 'user-1',
      sliderValue: 50,
      note: 'hello',
      tags: null,
    });
  });

  it('truncates note to 500 characters', async () => {
    const longNote = 'a'.repeat(600);

    await createCheckIn('user-1', { sliderValue: 50, note: longNote });

    expect(insertCheckIn).toHaveBeenCalledWith('db-instance', {
      userId: 'user-1',
      sliderValue: 50,
      note: 'a'.repeat(500),
      tags: null,
    });
  });

  it('throws CheckInValidationError for sliderValue below 0', async () => {
    await expect(createCheckIn('user-1', { sliderValue: -1 })).rejects.toThrow(
      CheckInValidationError,
    );
  });

  it('throws CheckInValidationError for sliderValue above 100', async () => {
    await expect(createCheckIn('user-1', { sliderValue: 101 })).rejects.toThrow(
      CheckInValidationError,
    );
  });

  it('throws CheckInValidationError for non-integer sliderValue', async () => {
    await expect(createCheckIn('user-1', { sliderValue: 50.5 })).rejects.toThrow(
      CheckInValidationError,
    );
  });

  it('throws CheckInValidationError for NaN sliderValue', async () => {
    await expect(createCheckIn('user-1', { sliderValue: Number.NaN })).rejects.toThrow(
      CheckInValidationError,
    );
  });

  it('accepts boundary value 0', async () => {
    await createCheckIn('user-1', { sliderValue: 0 });

    expect(insertCheckIn).toHaveBeenCalledWith('db-instance', {
      userId: 'user-1',
      sliderValue: 0,
      note: null,
      tags: null,
    });
  });

  it('accepts boundary value 100', async () => {
    await createCheckIn('user-1', { sliderValue: 100 });

    expect(insertCheckIn).toHaveBeenCalledWith('db-instance', {
      userId: 'user-1',
      sliderValue: 100,
      note: null,
      tags: null,
    });
  });

  it('propagates database errors from insertCheckIn', async () => {
    insertCheckIn.mockRejectedValue(new Error('db error'));

    await expect(createCheckIn('user-1', { sliderValue: 50 })).rejects.toThrow('db error');
  });

  // Tags tests
  it('passes valid tags through', async () => {
    await createCheckIn('user-1', { sliderValue: 50, tags: ['Work', 'Body'] });

    expect(insertCheckIn).toHaveBeenCalledWith('db-instance', {
      userId: 'user-1',
      sliderValue: 50,
      note: null,
      tags: ['Work', 'Body'],
    });
  });

  it('filters out invalid tags', async () => {
    await createCheckIn('user-1', { sliderValue: 50, tags: ['Work', 'InvalidTag'] });

    expect(insertCheckIn).toHaveBeenCalledWith('db-instance', {
      userId: 'user-1',
      sliderValue: 50,
      note: null,
      tags: ['Work'],
    });
  });

  it('converts empty tags array to null', async () => {
    await createCheckIn('user-1', { sliderValue: 50, tags: [] });

    expect(insertCheckIn).toHaveBeenCalledWith('db-instance', {
      userId: 'user-1',
      sliderValue: 50,
      note: null,
      tags: null,
    });
  });

  it('converts all-invalid tags to null', async () => {
    await createCheckIn('user-1', { sliderValue: 50, tags: ['Nope', 'Bad'] });

    expect(insertCheckIn).toHaveBeenCalledWith('db-instance', {
      userId: 'user-1',
      sliderValue: 50,
      note: null,
      tags: null,
    });
  });

  it('converts null tags to null', async () => {
    await createCheckIn('user-1', { sliderValue: 50, tags: null });

    expect(insertCheckIn).toHaveBeenCalledWith('db-instance', {
      userId: 'user-1',
      sliderValue: 50,
      note: null,
      tags: null,
    });
  });
});
