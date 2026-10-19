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
  // biome-ignore lint/suspicious/noThenProperty: stands in for Supabase's awaitable query builder
  chain.then = (resolve: (value: unknown) => void) => resolve({ ...result });
  // The client itself must not be awaitable, or awaiting createClient() would unwrap it.
  const createClient = vi.fn(async () => ({ from: chain.from }));
  return { createClient, calls, result };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { deletePref, getPrefsByUser, upsertPrefs } from './health-prefs';

describe('health prefs queries', () => {
  beforeEach(() => {
    calls.length = 0;
    result.data = [];
    result.error = null;
  });

  it('reads the user prefs and maps them', async () => {
    result.data = [{ item_key: 'order|knee', value: 'a,b' }];
    expect(await getPrefsByUser('user-1')).toEqual([{ key: 'order|knee', value: 'a,b' }]);
    expect(calls).toContainEqual({ method: 'from', args: ['health_prefs'] });
    expect(calls).toContainEqual({ method: 'eq', args: ['user_id', 'user-1'] });
  });

  it('upserts on the key, and skips an empty write', async () => {
    await upsertPrefs('user-1', []);
    expect(calls).toHaveLength(0);
    await upsertPrefs('user-1', [{ key: 'aside|step-down', value: '1' }]);
    const up = calls.find((c) => c.method === 'upsert');
    expect(up?.args[0]).toEqual([
      expect.objectContaining({ user_id: 'user-1', item_key: 'aside|step-down', value: '1' }),
    ]);
    expect(up?.args[1]).toEqual({ onConflict: 'user_id,item_key' });
  });

  it('deletes one key of the user', async () => {
    await deletePref('user-1', 'aside|step-down');
    expect(calls).toContainEqual({ method: 'eq', args: ['item_key', 'aside|step-down'] });
  });

  it('names the table when the database refuses', async () => {
    result.error = { message: 'nope' };
    await expect(getPrefsByUser('user-1')).rejects.toThrow('health_prefs read failed');
    await expect(upsertPrefs('user-1', [{ key: 'k', value: 'v' }])).rejects.toThrow(
      'health_prefs write failed',
    );
    await expect(deletePref('user-1', 'k')).rejects.toThrow('health_prefs delete failed');
  });
});
