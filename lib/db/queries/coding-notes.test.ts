import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, calls, result } = vi.hoisted(() => {
  const calls: { method: string; args: unknown[] }[] = [];
  const result: { data: unknown; error: { message: string } | null } = { data: [], error: null };
  const chain: Record<string, unknown> = {};
  for (const method of ['from', 'select', 'eq', 'order', 'insert', 'update', 'delete']) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  // biome-ignore lint/suspicious/noThenProperty: stands in for Supabase's awaitable query builder
  chain.then = (resolve: (value: unknown) => void) => resolve({ ...result });
  // The client itself must not be awaitable, or awaiting createClient() would unwrap it.
  const createClient = vi.fn(async () => ({ from: chain.from }));
  return { createClient, calls, result };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { deleteNote, getNotesByUser, insertNotes, updateNote } from './coding-notes';

const ROW = {
  id: 'n1',
  item_key: 's3|while',
  kind: 'question',
  body: 'When does it stop?',
  created_at: '2026-10-04T10:00:00Z',
  updated_at: '2026-10-04T10:00:00Z',
  answer: null,
  answered_at: null,
  read_at: null,
};

describe('coding notes queries', () => {
  beforeEach(() => {
    calls.length = 0;
    result.data = [];
    result.error = null;
  });

  it('reads the user notes oldest first and maps them to camelCase', async () => {
    result.data = [ROW];
    const notes = await getNotesByUser('user-1');
    expect(notes[0]).toMatchObject({ id: 'n1', itemKey: 's3|while', kind: 'question' });
    expect(calls).toContainEqual({ method: 'eq', args: ['user_id', 'user-1'] });
    expect(calls).toContainEqual({ method: 'order', args: ['created_at', { ascending: true }] });
  });

  it('inserts notes for the user and returns the new rows', async () => {
    result.data = [ROW];
    const rows = await insertNotes('user-1', [
      { itemKey: 's3|while', kind: 'question', body: 'When does it stop?' },
    ]);
    expect(rows).toHaveLength(1);
    const insert = calls.find((c) => c.method === 'insert');
    expect(insert?.args[0]).toEqual([
      { user_id: 'user-1', item_key: 's3|while', kind: 'question', body: 'When does it stop?' },
    ]);
  });

  it('skips an empty insert', async () => {
    expect(await insertNotes('user-1', [])).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('updates only the fields given, scoped to the user and the note', async () => {
    result.data = [{ ...ROW, body: 'new' }];
    const row = await updateNote('user-1', 'n1', { body: 'new' });
    expect(row?.body).toBe('new');
    const update = calls.find((c) => c.method === 'update');
    expect(update?.args[0]).toMatchObject({ body: 'new' });
    expect(update?.args[0]).not.toHaveProperty('kind');
    expect(calls).toContainEqual({ method: 'eq', args: ['id', 'n1'] });
  });

  it('marks an answer read without touching the text', async () => {
    result.data = [{ ...ROW, read_at: '2026-10-04T11:00:00Z' }];
    await updateNote('user-1', 'n1', { readAt: '2026-10-04T11:00:00Z' });
    const update = calls.find((c) => c.method === 'update');
    expect(update?.args[0]).toEqual({ read_at: '2026-10-04T11:00:00Z' });
  });

  it('returns null when the note is not the user own', async () => {
    result.data = [];
    expect(await updateNote('user-1', 'other', { body: 'x' })).toBeNull();
  });

  it('deletes one note of one user', async () => {
    await deleteNote('user-1', 'n1');
    expect(calls.map((c) => c.method)).toEqual(['from', 'delete', 'eq', 'eq']);
  });

  it('throws when Supabase reports an error', async () => {
    result.error = { message: 'relation "coding_notes" does not exist' };
    await expect(getNotesByUser('user-1')).rejects.toThrow('coding_notes read failed');
    await expect(
      insertNotes('user-1', [{ itemKey: 'k', kind: 'question', body: 'b' }]),
    ).rejects.toThrow('coding_notes insert failed');
    await expect(updateNote('user-1', 'n1', { body: 'x' })).rejects.toThrow(
      'coding_notes update failed',
    );
    await expect(deleteNote('user-1', 'n1')).rejects.toThrow('coding_notes delete failed');
  });
});
