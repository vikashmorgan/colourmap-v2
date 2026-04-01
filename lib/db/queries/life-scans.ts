import { and, desc, eq, type InferSelectModel } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/lib/db/schema';
import { lifeScans, scanReflections } from '@/lib/db/schema';

export type LifeScan = InferSelectModel<typeof lifeScans>;
export type ScanReflection = InferSelectModel<typeof scanReflections>;

export async function insertLifeScan(
  db: PostgresJsDatabase<typeof schema>,
  data: { userId: string; door: string; sliders: Record<string, number> },
): Promise<LifeScan> {
  const [row] = await db.insert(lifeScans).values(data).returning();
  return row;
}

export async function getLatestScans(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
): Promise<LifeScan[]> {
  const allScans = await db
    .select()
    .from(lifeScans)
    .where(eq(lifeScans.userId, userId))
    .orderBy(desc(lifeScans.createdAt));

  const latest = new Map<string, LifeScan>();
  for (const scan of allScans) {
    if (!latest.has(scan.door)) {
      latest.set(scan.door, scan);
    }
  }
  return [...latest.values()];
}

export async function insertReflection(
  db: PostgresJsDatabase<typeof schema>,
  data: { userId: string; scanGroup: string; question: string; answer: string },
): Promise<ScanReflection> {
  const [row] = await db.insert(scanReflections).values(data).returning();
  return row;
}

export async function getReflections(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  scanGroup: string,
): Promise<ScanReflection[]> {
  return db
    .select()
    .from(scanReflections)
    .where(and(eq(scanReflections.userId, userId), eq(scanReflections.scanGroup, scanGroup)))
    .orderBy(scanReflections.createdAt);
}
