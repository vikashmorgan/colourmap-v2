import { and, asc, eq, type InferSelectModel } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/lib/db/schema';
import { cockpitSections, dailyTrackerEntries, sectionTrackers } from '@/lib/db/schema';

export type CockpitSection = InferSelectModel<typeof cockpitSections>;
export type SectionTracker = InferSelectModel<typeof sectionTrackers>;
export type DailyEntry = InferSelectModel<typeof dailyTrackerEntries>;

export async function getSectionsWithTrackers(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
): Promise<(CockpitSection & { trackers: SectionTracker[] })[]> {
  const sections = await db
    .select()
    .from(cockpitSections)
    .where(eq(cockpitSections.userId, userId))
    .orderBy(asc(cockpitSections.position));

  const result = [];
  for (const section of sections) {
    const trackers = await db
      .select()
      .from(sectionTrackers)
      .where(eq(sectionTrackers.sectionId, section.id))
      .orderBy(asc(sectionTrackers.position));
    result.push({ ...section, trackers });
  }
  return result;
}

export async function insertSection(
  db: PostgresJsDatabase<typeof schema>,
  data: { userId: string; name: string; position?: number },
): Promise<CockpitSection> {
  const [row] = await db.insert(cockpitSections).values(data).returning();
  return row;
}

export async function insertTracker(
  db: PostgresJsDatabase<typeof schema>,
  data: { sectionId: string; label: string; type: string; position?: number },
): Promise<SectionTracker> {
  const [row] = await db.insert(sectionTrackers).values(data).returning();
  return row;
}

export async function deleteSection(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  sectionId: string,
): Promise<boolean> {
  const result = await db
    .delete(cockpitSections)
    .where(and(eq(cockpitSections.id, sectionId), eq(cockpitSections.userId, userId)))
    .returning();
  return result.length > 0;
}

export async function deleteTracker(
  db: PostgresJsDatabase<typeof schema>,
  trackerId: string,
): Promise<boolean> {
  const result = await db
    .delete(sectionTrackers)
    .where(eq(sectionTrackers.id, trackerId))
    .returning();
  return result.length > 0;
}

export async function getEntriesForDate(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  date: string,
): Promise<DailyEntry[]> {
  return db
    .select()
    .from(dailyTrackerEntries)
    .where(and(eq(dailyTrackerEntries.userId, userId), eq(dailyTrackerEntries.date, date)));
}

export async function upsertEntry(
  db: PostgresJsDatabase<typeof schema>,
  data: { trackerId: string; userId: string; date: string; value: number },
): Promise<DailyEntry> {
  const existing = await db
    .select()
    .from(dailyTrackerEntries)
    .where(
      and(
        eq(dailyTrackerEntries.trackerId, data.trackerId),
        eq(dailyTrackerEntries.userId, data.userId),
        eq(dailyTrackerEntries.date, data.date),
      ),
    );

  if (existing.length > 0) {
    const [row] = await db
      .update(dailyTrackerEntries)
      .set({ value: data.value })
      .where(eq(dailyTrackerEntries.id, existing[0].id))
      .returning();
    return row;
  }

  const [row] = await db.insert(dailyTrackerEntries).values(data).returning();
  return row;
}
