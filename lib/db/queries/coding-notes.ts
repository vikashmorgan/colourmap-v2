import { createClient } from '@/lib/supabase/server';

/*
 * Coding notes go through the signed-in user's Supabase client, like the
 * marks: RLS on coding_notes confines every row to its owner, and the
 * user_id filters here are a second fence, not the only one.
 */

export type CodingNoteRow = {
  id: string;
  itemKey: string;
  kind: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  answer: string | null;
  answeredAt: string | null;
  readAt: string | null;
};

type Row = {
  id: string;
  item_key: string;
  kind: string;
  body: string;
  created_at: string;
  updated_at: string;
  answer: string | null;
  answered_at: string | null;
  read_at: string | null;
};

const TABLE = 'coding_notes';
const COLUMNS = 'id, item_key, kind, body, created_at, updated_at, answer, answered_at, read_at';

function toNote(r: Row): CodingNoteRow {
  return {
    id: r.id,
    itemKey: r.item_key,
    kind: r.kind,
    body: r.body,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    answer: r.answer,
    answeredAt: r.answered_at,
    readAt: r.read_at,
  };
}

export async function getNotesByUser(userId: string): Promise<CodingNoteRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`coding_notes read failed: ${error.message}`);
  return ((data ?? []) as Row[]).map(toNote);
}

export async function insertNotes(
  userId: string,
  notes: { itemKey: string; kind: string; body: string }[],
): Promise<CodingNoteRow[]> {
  if (notes.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert(
      notes.map((n) => ({ user_id: userId, item_key: n.itemKey, kind: n.kind, body: n.body })),
    )
    .select(COLUMNS);
  if (error) throw new Error(`coding_notes insert failed: ${error.message}`);
  return ((data ?? []) as Row[]).map(toNote);
}

/** Change a note's text and kind, or mark its answer read. Returns null when no such note. */
export async function updateNote(
  userId: string,
  id: string,
  patch: { kind?: string; body?: string; readAt?: string | null },
): Promise<CodingNoteRow | null> {
  const supabase = await createClient();
  const values: Record<string, unknown> = {};
  if (patch.kind !== undefined) values.kind = patch.kind;
  if (patch.body !== undefined) {
    values.body = patch.body;
    values.updated_at = new Date().toISOString();
  }
  if (patch.readAt !== undefined) values.read_at = patch.readAt;
  const { data, error } = await supabase
    .from(TABLE)
    .update(values)
    .eq('user_id', userId)
    .eq('id', id)
    .select(COLUMNS);
  if (error) throw new Error(`coding_notes update failed: ${error.message}`);
  const rows = (data ?? []) as Row[];
  return rows.length ? toNote(rows[0]) : null;
}

export async function deleteNote(userId: string, id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(`coding_notes delete failed: ${error.message}`);
}
