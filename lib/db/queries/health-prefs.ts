import { createClient } from '@/lib/supabase/server';

/*
 * The health page's standing choices (exercise order, exercises set aside).
 * Through the signed-in user's client: RLS confines rows to their owner, and
 * the user_id filters are a second fence.
 */

export type HealthPrefRow = { key: string; value: string };

const TABLE = 'health_prefs';

export async function getPrefsByUser(userId: string): Promise<HealthPrefRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('item_key, value')
    .eq('user_id', userId);
  if (error) throw new Error(`health_prefs read failed: ${error.message}`);
  return ((data ?? []) as { item_key: string; value: string }[]).map((r) => ({
    key: r.item_key,
    value: r.value,
  }));
}

export async function upsertPrefs(
  userId: string,
  prefs: { key: string; value: string }[],
): Promise<void> {
  if (prefs.length === 0) return;
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from(TABLE).upsert(
    prefs.map((p) => ({ user_id: userId, item_key: p.key, value: p.value, updated_at: now })),
    { onConflict: 'user_id,item_key' },
  );
  if (error) throw new Error(`health_prefs write failed: ${error.message}`);
}

export async function deletePref(userId: string, key: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq('user_id', userId).eq('item_key', key);
  if (error) throw new Error(`health_prefs delete failed: ${error.message}`);
}
