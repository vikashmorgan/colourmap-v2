import { and, desc, eq, type InferSelectModel } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/lib/db/schema';
import { missions } from '@/lib/db/schema';

export type Mission = InferSelectModel<typeof missions>;

export async function insertMission(
  db: PostgresJsDatabase<typeof schema>,
  data: { userId: string; title: string },
): Promise<Mission> {
  const [row] = await db.insert(missions).values(data).returning();
  return row;
}

export async function getMissions(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
): Promise<Mission[]> {
  return db
    .select()
    .from(missions)
    .where(eq(missions.userId, userId))
    .orderBy(desc(missions.createdAt));
}

export async function updateMission(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  missionId: string,
  data: {
    completed?: boolean;
    description?: string | null;
    blocking?: string | null;
    nextStep?: string | null;
  },
): Promise<Mission | null> {
  const [row] = await db
    .update(missions)
    .set(data)
    .where(and(eq(missions.id, missionId), eq(missions.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteMission(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  missionId: string,
): Promise<boolean> {
  const result = await db
    .delete(missions)
    .where(and(eq(missions.id, missionId), eq(missions.userId, userId)))
    .returning();
  return result.length > 0;
}
