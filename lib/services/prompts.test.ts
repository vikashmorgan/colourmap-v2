import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectLimit = vi.fn();
const selectOrderBy = vi.fn((_col: unknown) => ({ limit: selectLimit }));
const selectWhere = vi.fn(() => ({ orderBy: selectOrderBy }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const select = vi.fn(() => ({ from: selectFrom }));

const insertReturning = vi.fn();
const insertValues = vi.fn((_v: Record<string, unknown>) => ({ returning: insertReturning }));
const insert = vi.fn(() => ({ values: insertValues }));

const updateReturning = vi.fn();
const updateWhere = vi.fn(() => ({ returning: updateReturning }));
const updateSet = vi.fn((_s: Record<string, unknown>) => ({ where: updateWhere }));
const update = vi.fn(() => ({ set: updateSet }));

const deleteReturning = vi.fn();
const deleteWhere = vi.fn(() => ({ returning: deleteReturning }));
const deleteFn = vi.fn(() => ({ where: deleteWhere }));

const { getDb } = vi.hoisted(() => ({
  getDb: vi.fn(() => ({ select, insert, update, delete: deleteFn })),
}));

vi.mock('@/lib/db/client', () => ({ getDb }));

import {
  createPrompt,
  deletePrompt,
  isStatus,
  listOpen,
  listPrompts,
  MAX_BODY,
  OPEN,
  updatePrompt,
} from './prompts';

const ROW = { id: 'p1', userId: 'u1', body: 'raise the smoke timeout', status: 'queued' };

describe('the prompt queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectLimit.mockResolvedValue([ROW]);
    insertReturning.mockResolvedValue([ROW]);
    updateReturning.mockResolvedValue([ROW]);
    deleteReturning.mockResolvedValue([ROW]);
  });

  it('treats queued and taken as open', () => {
    expect([...OPEN].sort()).toEqual(['queued', 'taken']);
  });

  it('knows the four statuses and refuses anything else', () => {
    for (const s of ['queued', 'taken', 'done', 'parked']) expect(isStatus(s)).toBe(true);
    expect(isStatus('finished')).toBe(false);
    expect(isStatus(7)).toBe(false);
  });

  it('trims a prompt and caps runaway length', () => {
    /*
     * Capped rather than rejected. Somebody who dictated four thousand
     * characters into a phone should not lose all of it to a validation error.
     */
    return createPrompt('u1', `  ${'x'.repeat(MAX_BODY + 500)}  `).then(() => {
      const body = insertValues.mock.calls[0]?.[0].body as string;
      expect(body.length).toBe(MAX_BODY);
      expect(body.startsWith(' ')).toBe(false);
    });
  });

  it('creates a prompt without letting the caller set its status', async () => {
    await createPrompt('u1', 'do the thing');

    expect(insertValues.mock.calls[0]?.[0]).toEqual({ userId: 'u1', body: 'do the thing' });
  });

  it('reads the open queue oldest first', async () => {
    /*
     * The one list here that is not newest-first. A queue read newest-first
     * quietly becomes a stack, and the things written when you were most tired
     * sink and never resurface.
     */
    await listOpen('u1');

    expect(selectOrderBy).toHaveBeenCalled();
    const arg = selectOrderBy.mock.calls[0]?.[0];
    expect(String(arg)).not.toContain('desc');
  });

  it('reads the history newest first', async () => {
    await listPrompts('u1');

    expect(selectLimit).toHaveBeenCalledWith(50);
  });

  it('stamps doneAt when a prompt is finished', async () => {
    await updatePrompt('u1', 'p1', { status: 'done' });

    const patch = updateSet.mock.calls[0]?.[0];
    expect(patch.status).toBe('done');
    expect(patch.doneAt).toBeInstanceOf(Date);
  });

  it('clears doneAt when a prompt moves back out of done', async () => {
    /*
     * Otherwise a reopened prompt keeps a completion date, and "what shipped
     * this week" quietly counts something that did not.
     */
    await updatePrompt('u1', 'p1', { status: 'queued' });

    expect(updateSet.mock.calls[0]?.[0].doneAt).toBeNull();
  });

  it('never trusts a caller-supplied completion date', async () => {
    await updatePrompt('u1', 'p1', {
      status: 'done',
      // @ts-expect-error deliberately passing a field the type forbids
      doneAt: new Date('2020-01-01'),
    });

    const stamped = updateSet.mock.calls[0]?.[0].doneAt as Date;
    expect(stamped.getFullYear()).toBeGreaterThan(2020);
  });

  it('does nothing rather than writing an empty patch', async () => {
    const row = await updatePrompt('u1', 'p1', {});

    expect(row).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('can attach the pull request that answered it', async () => {
    await updatePrompt('u1', 'p1', { prUrl: 'https://github.com/x/y/pull/9' });

    expect(updateSet.mock.calls[0]?.[0].prUrl).toBe('https://github.com/x/y/pull/9');
  });

  it('returns null for a prompt that is not yours', async () => {
    updateReturning.mockResolvedValue([]);

    expect(await updatePrompt('u1', 'nope', { status: 'done' })).toBeNull();
  });

  it('returns the deleted row', async () => {
    expect(await deletePrompt('u1', 'p1')).toEqual(ROW);
  });
});
