import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, calls, result } = vi.hoisted(() => {
  const calls: { method: string; args: unknown[] }[] = [];
  const result: { data: unknown; error: { message: string } | null } = { data: [], error: null };
  const chain: Record<string, unknown> = {};
  for (const method of ['from', 'select', 'eq', 'order', 'upsert', 'delete']) {
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

import { deleteLog, getLogByUser, upsertLog } from './health-log';

describe('health log queries', () => {
  beforeEach(() => {
    calls.length = 0;
    result.data = [];
    result.error = null;
  });

  it('reads the user log by day and maps it', async () => {
    result.data = [{ day: '2026-10-19', item_key: 'pain|knee', value: '3', updated_at: 't' }];
    expect(await getLogByUser('user-1')).toEqual([
      { day: '2026-10-19', key: 'pain|knee', value: '3', updatedAt: 't' },
    ]);
    expect(calls).toContainEqual({ method: 'from', args: ['health_log'] });
    expect(calls).toContainEqual({ method: 'eq', args: ['user_id', 'user-1'] });
  });

  it('upserts on the day and key, and skips an empty write', async () => {
    await upsertLog('user-1', []);
    expect(calls).toHaveLength(0);
    await upsertLog('user-1', [{ day: '2026-10-19', key: 'am|lift-sky', value: '1' }]);
    const up = calls.find((c) => c.method === 'upsert');
    expect(up?.args[0]).toEqual([
      expect.objectContaining({
        user_id: 'user-1',
        day: '2026-10-19',
        item_key: 'am|lift-sky',
        value: '1',
      }),
    ]);
    expect(up?.args[1]).toEqual({ onConflict: 'user_id,day,item_key' });
  });

  it('deletes one day and key of the user', async () => {
    await deleteLog('user-1', '2026-10-19', 'feel');
    expect(calls).toContainEqual({ method: 'eq', args: ['user_id', 'user-1'] });
    expect(calls).toContainEqual({ method: 'eq', args: ['day', '2026-10-19'] });
    expect(calls).toContainEqual({ method: 'eq', args: ['item_key', 'feel'] });
  });

  it('names the table when the database refuses', async () => {
    result.error = { message: 'nope' };
    await expect(getLogByUser('user-1')).rejects.toThrow('health_log read failed');
    await expect(upsertLog('user-1', [{ day: 'd', key: 'k', value: 'v' }])).rejects.toThrow(
      'health_log write failed',
    );
    await expect(deleteLog('user-1', 'd', 'k')).rejects.toThrow('health_log delete failed');
  });
});
