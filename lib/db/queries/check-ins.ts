import { desc, eq, type InferSelectModel } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/lib/db/schema';
import { checkIns } from '@/lib/db/schema';

export type CheckIn = InferSelectModel<typeof checkIns>;

export async function insertCheckIn(
  db: PostgresJsDatabase<typeof schema>,
  data: { userId: string; sliderValue: number; note: string | null; tags: string[] | null },
): Promise<CheckIn> {
  const [row] = await db.insert(checkIns).values(data).returning();
  return row;
}

export async function getRecentCheckIns(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  limit = 7,
): Promise<CheckIn[]> {
  return db
    .select()
    .from(checkIns)
    .where(eq(checkIns.userId, userId))
    .orderBy(desc(checkIns.createdAt))
    .limit(limit);
}
