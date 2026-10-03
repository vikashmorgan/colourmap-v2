import { and, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { codingMarks } from '@/lib/db/schema';

export type CodingMarkRow = typeof codingMarks.$inferSelect;

export type CodingBoxEntry = {
  itemKey: string;
  mark: string | null;
  note: string | null;
  noteKind: string | null;
};

export async function getMarksByUser(userId: string) {
  const db = getDb();
  return db
    .select({
      itemKey: codingMarks.itemKey,
      mark: codingMarks.mark,
      note: codingMarks.note,
      noteKind: codingMarks.noteKind,
    })
    .from(codingMarks)
    .where(eq(codingMarks.userId, userId));
}

/** Save boxes in one statement. (user_id, item_key) is unique in the migration. */
export async function upsertBoxes(userId: string, entries: CodingBoxEntry[]) {
  if (entries.length === 0) return;
  const db = getDb();
  await db
    .insert(codingMarks)
    .values(
      entries.map((e) => ({
        userId,
        itemKey: e.itemKey,
        mark: e.mark,
        note: e.note,
        noteKind: e.noteKind,
      })),
    )
    .onConflictDoUpdate({
      target: [codingMarks.userId, codingMarks.itemKey],
      set: {
        mark: sql`excluded.mark`,
        note: sql`excluded.note`,
        noteKind: sql`excluded.note_kind`,
        updatedAt: sql`now()`,
      },
    });
}

export async function deleteBox(userId: string, itemKey: string) {
  const db = getDb();
  await db
    .delete(codingMarks)
    .where(and(eq(codingMarks.userId, userId), eq(codingMarks.itemKey, itemKey)));
}
