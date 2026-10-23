import { createClient } from '@/lib/supabase/server';

/*
 * The health page's day log: one value per user, day and key (a tick, a pain
 * number, the day's note). Through the signed-in user's client, so RLS
 * confines every row to its owner; the user_id filters are a second fence.
 */

export type HealthLogRow = { day: string; key: string; value: string; updatedAt: string };

type Row = { day: string; item_key: string; value: string; updated_at: string };

const TABLE = 'health_log';
const COLUMNS = 'day, item_key, value, updated_at';

const toEntry = (r: Row): HealthLogRow => ({
  day: r.day,
  key: r.item_key,
  value: r.value,
  updatedAt: r.updated_at,
});

export async function getLogByUser(userId: string): Promise<HealthLogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('day', { ascending: true });
  if (error) throw new Error(`health_log read failed: ${error.message}`);
  return ((data ?? []) as Row[]).map(toEntry);
}

/** Write values, replacing what the same day and key held. */
export async function upsertLog(
  userId: string,
  entries: { day: string; key: string; value: string }[],
): Promise<void> {
  if (entries.length === 0) return;
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from(TABLE).upsert(
    entries.map((e) => ({
      user_id: userId,
      day: e.day,
      item_key: e.key,
      value: e.value,
      updated_at: now,
    })),
    { onConflict: 'user_id,day,item_key' },
  );
  if (error) throw new Error(`health_log write failed: ${error.message}`);
}

/** Clear one day's key (an unticked exercise, a removed number or note). */
export async function deleteLog(userId: string, day: string, key: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('day', day)
    .eq('item_key', key);
  if (error) throw new Error(`health_log delete failed: ${error.message}`);
}
