import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, calls, result } = vi.hoisted(() => {
  const calls: { method: string; args: unknown[] }[] = [];
  const result: { data: unknown; error: { message: string } | null } = { data: [], error: null };
  const chain: Record<string, unknown> = {};
  for (const method of ['from', 'select', 'eq', 'upsert', 'delete']) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  // Awaiting the chain resolves to the queued result, like a Supabase query.
  // biome-ignore lint/suspicious/noThenProperty: stands in for Supabase's awaitable query builder
  chain.then = (resolve: (value: unknown) => void) => resolve({ ...result });
  // The client itself must not be awaitable, or awaiting createClient() would unwrap it.
  const createClient = vi.fn(async () => ({ from: chain.from }));
  return { createClient, calls, result };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { deleteBox, getMarksByUser, upsertBoxes } from './coding-marks';

describe('coding marks queries', () => {
  beforeEach(() => {
    calls.length = 0;
    result.data = [];
    result.error = null;
  });

  it('reads the user rows and maps them to camelCase', async () => {
    result.data = [{ item_key: 's3|while', mark: 'mid', note: 'Why?', note_kind: 'question' }];
    expect(await getMarksByUser('user-1')).toEqual([
      { itemKey: 's3|while', mark: 'mid', note: 'Why?', noteKind: 'question' },
    ]);
    expect(calls).toContainEqual({ method: 'from', args: ['coding_marks'] });
    expect(calls).toContainEqual({ method: 'eq', args: ['user_id', 'user-1'] });
  });

  it('upserts on (user_id, item_key)', async () => {
    await upsertBoxes('user-1', [{ itemKey: 's3|if', mark: 'got', note: null, noteKind: null }]);
    const upsert = calls.find((c) => c.method === 'upsert');
    expect(upsert?.args[1]).toEqual({ onConflict: 'user_id,item_key' });
    expect(upsert?.args[0]).toEqual([
      expect.objectContaining({ user_id: 'user-1', item_key: 's3|if', mark: 'got', note: null }),
    ]);
  });

  it('does nothing for an empty upsert', async () => {
    await upsertBoxes('user-1', []);
    expect(calls).toEqual([]);
  });

  it('deletes one box of one user', async () => {
    await deleteBox('user-1', 's3|while');
    expect(calls.map((c) => c.method)).toEqual(['from', 'delete', 'eq', 'eq']);
  });

  it('throws when Supabase reports an error', async () => {
    result.error = { message: 'relation "coding_marks" does not exist' };
    await expect(getMarksByUser('user-1')).rejects.toThrow('coding_marks read failed');
    await expect(deleteBox('user-1', 'k')).rejects.toThrow('coding_marks delete failed');
    await expect(
      upsertBoxes('user-1', [{ itemKey: 'k', mark: 'got', note: null, noteKind: null }]),
    ).rejects.toThrow('coding_marks write failed');
  });
});
