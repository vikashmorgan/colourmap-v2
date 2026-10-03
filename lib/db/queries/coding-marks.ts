import { createClient } from '@/lib/supabase/server';

/*
 * Coding marks go through the signed-in user's Supabase client, not the
 * Drizzle connection.
 *
 * Why: the live deployment's DATABASE_URL was unusable on 2026-10-03 (the
 * function logged "Missing required environment variable: DATABASE_URL")
 * while the Supabase URL and publishable key worked, as the slide uploads
 * proved. Going through the user's own session also means the table's RLS
 * policies are what stand between users, not only the `user_id` filter here.
 */

export type CodingBoxEntry = {
  itemKey: string;
  mark: string | null;
  note: string | null;
  noteKind: string | null;
};

type Row = { item_key: string; mark: string | null; note: string | null; note_kind: string | null };

const TABLE = 'coding_marks';

export async function getMarksByUser(userId: string): Promise<CodingBoxEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('item_key, mark, note, note_kind')
    .eq('user_id', userId);
  if (error) throw new Error(`coding_marks read failed: ${error.message}`);
  return ((data ?? []) as Row[]).map((r) => ({
    itemKey: r.item_key,
    mark: r.mark,
    note: r.note,
    noteKind: r.note_kind,
  }));
}

/** Save boxes in one statement. (user_id, item_key) is unique in the migration. */
export async function upsertBoxes(userId: string, entries: CodingBoxEntry[]) {
  if (entries.length === 0) return;
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from(TABLE).upsert(
    entries.map((e) => ({
      user_id: userId,
      item_key: e.itemKey,
      mark: e.mark,
      note: e.note,
      note_kind: e.noteKind,
      updated_at: now,
    })),
    { onConflict: 'user_id,item_key' },
  );
  if (error) throw new Error(`coding_marks write failed: ${error.message}`);
}

export async function deleteBox(userId: string, itemKey: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('item_key', itemKey);
  if (error) throw new Error(`coding_marks delete failed: ${error.message}`);
}
