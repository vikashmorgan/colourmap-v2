import { and, desc, eq, type InferSelectModel } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/lib/db/schema';
import { backlog } from '@/lib/db/schema';

export type BacklogItem = InferSelectModel<typeof backlog>;

export async function insertBacklogItem(
  db: PostgresJsDatabase<typeof schema>,
  data: { userId: string; title: string },
): Promise<BacklogItem> {
  const [row] = await db.insert(backlog).values(data).returning();
  return row;
}

export async function getBacklogItems(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
): Promise<BacklogItem[]> {
  return db
    .select()
    .from(backlog)
    .where(eq(backlog.userId, userId))
    .orderBy(desc(backlog.createdAt));
}

export async function toggleBacklogItem(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  itemId: string,
  done: boolean,
): Promise<BacklogItem | null> {
  const [row] = await db
    .update(backlog)
    .set({ done })
    .where(and(eq(backlog.id, itemId), eq(backlog.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteBacklogItem(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  itemId: string,
): Promise<boolean> {
  const result = await db
    .delete(backlog)
    .where(and(eq(backlog.id, itemId), eq(backlog.userId, userId)))
    .returning();
  return result.length > 0;
}
