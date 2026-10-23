import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectOrderBy = vi.fn();
const selectWhere = vi.fn(() => ({ orderBy: selectOrderBy }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const select = vi.fn(() => ({ from: selectFrom }));

const insertReturning = vi.fn();
const insertValues = vi.fn((_values: unknown) => ({ returning: insertReturning }));
const insert = vi.fn(() => ({ values: insertValues }));

const updateReturning = vi.fn();
const updateWhere = vi.fn(() => ({ returning: updateReturning }));
const updateSet = vi.fn((_values: unknown) => ({ where: updateWhere }));
const update = vi.fn(() => ({ set: updateSet }));

const deleteReturning = vi.fn();
const deleteWhere = vi.fn(() => ({ returning: deleteReturning }));
const deleteFn = vi.fn(() => ({ where: deleteWhere }));

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));

vi.mock('@/lib/db/client', () => ({ getDb }));

import {
  createChillMix,
  deleteChillMix,
  isUuid,
  listChillMixes,
  MIX_SETTINGS_MAX_BYTES,
  parseMixInput,
  parseMixPatch,
  updateChillMix,
} from './chill-mixes';

const MIX = { id: 'mix-1', userId: 'user-1', title: 'Night', settings: { palette: 'night' } };

describe('chill-mixes validation', () => {
  it('recognises uuids', () => {
    expect(isUuid('22222222-2222-4222-8222-222222222222')).toBe(true);
    expect(isUuid('nope')).toBe(false);
  });

  it('accepts a title and a settings object', () => {
    expect(parseMixInput({ title: '  Night  ', settings: { a: 1 } })).toEqual({
      ok: true,
      value: { title: 'Night', settings: { a: 1 } },
    });
  });

  it('rejects empty or overlong titles', () => {
    expect(parseMixInput({ title: '   ', settings: {} })).toMatchObject({ ok: false, status: 400 });
    expect(parseMixInput({ title: 'x'.repeat(121), settings: {} })).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(parseMixInput({ settings: {} })).toMatchObject({ ok: false, status: 400 });
  });

  it('rejects settings that are not a plain object', () => {
    for (const settings of [null, [], 'x', 3]) {
      expect(parseMixInput({ title: 'a', settings })).toMatchObject({ ok: false, status: 400 });
    }
    expect(parseMixInput(null)).toMatchObject({ ok: false, status: 400 });
  });

  it('rejects settings over 64 KB with 413', () => {
    const settings = { blob: 'x'.repeat(MIX_SETTINGS_MAX_BYTES) };
    expect(parseMixInput({ title: 'a', settings })).toMatchObject({ ok: false, status: 413 });
  });

  it('parses partial patches', () => {
    expect(parseMixPatch({ title: 'New' })).toEqual({ ok: true, value: { title: 'New' } });
    expect(parseMixPatch({ settings: { b: 2 } })).toEqual({
      ok: true,
      value: { settings: { b: 2 } },
    });
    expect(parseMixPatch({})).toMatchObject({ ok: false, status: 400 });
    expect(parseMixPatch({ title: '' })).toMatchObject({ ok: false, status: 400 });
    expect(parseMixPatch({ settings: [] })).toMatchObject({ ok: false, status: 400 });
    expect(parseMixPatch('x')).toMatchObject({ ok: false, status: 400 });
  });
});

describe('chill-mixes data access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDb.mockReturnValue({ select, insert, update, delete: deleteFn });
  });

  it('lists the user mixes', async () => {
    selectOrderBy.mockResolvedValue([MIX]);
    await expect(listChillMixes('user-1')).resolves.toEqual([MIX]);
    expect(selectWhere).toHaveBeenCalledTimes(1);
  });

  it('creates a mix owned by the user', async () => {
    insertReturning.mockResolvedValue([MIX]);
    await expect(createChillMix('user-1', { title: 'Night', settings: {} })).resolves.toEqual(MIX);
    expect(insertValues).toHaveBeenCalledWith({ userId: 'user-1', title: 'Night', settings: {} });
  });

  it('updates a mix and bumps updatedAt', async () => {
    updateReturning.mockResolvedValue([{ ...MIX, title: 'New' }]);
    await expect(updateChillMix('user-1', 'mix-1', { title: 'New' })).resolves.toMatchObject({
      title: 'New',
    });
    const set = updateSet.mock.calls[0][0] as { title: string; updatedAt: Date };
    expect(set.title).toBe('New');
    expect(set.updatedAt).toBeInstanceOf(Date);
  });

  it('returns null when the mix is missing or not the user’s', async () => {
    updateReturning.mockResolvedValue([]);
    deleteReturning.mockResolvedValue([]);
    await expect(updateChillMix('user-1', 'mix-x', { title: 'a' })).resolves.toBeNull();
    await expect(deleteChillMix('user-1', 'mix-x')).resolves.toBeNull();
  });

  it('deletes a mix', async () => {
    deleteReturning.mockResolvedValue([MIX]);
    await expect(deleteChillMix('user-1', 'mix-1')).resolves.toEqual(MIX);
  });
});
