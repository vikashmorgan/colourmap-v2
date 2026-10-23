/*
 * THE DIGEST — the half of the loop that runs with the laptop closed.
 *
 * `scripts/brain-read.ts` reads the record for a person sitting at a terminal.
 * This reads the same record on a schedule, from a machine that is not yours,
 * and writes one short observation back so a phone can show it.
 *
 * WHAT IT IS NOT
 *
 * It is not an agent. It does not decide anything, change anything, or act on
 * a mission. It counts what is there and says so. That restraint is the point:
 * a thing that runs unattended in the cloud should do the smallest useful job,
 * and "read four tables and write one paragraph" is a job whose worst failure
 * is a wrong paragraph.
 *
 * WHY IT DOES NOT WRITE TO THE NOTEBOOK
 *
 * `docs/specs/integrated-system.md` is explicit: the notebook's entire value is
 * that nobody has edited it. So this writes to `digests`, its own table, and
 * the app shows it as generated rather than as something you wrote.
 *
 * MOVEMENT HAS TO BE A FACT
 *
 * "Actively growing" is only honest if it comes from a recorded event. This
 * reads `moved_at`, which is set when something happens to a mission — never
 * when one is merely looked at. Nothing here infers enthusiasm, and nothing
 * here ranks: a date is a fact, a league table of branches is not.
 */

import { and, desc, eq, isNotNull, lte } from 'drizzle-orm';

import { BRANCH_LABELS, BRANCHES, type Branch } from '@/lib/branches';
import { getDb } from '@/lib/db/client';
import { checkIns, digests, missions, notebookEntries } from '@/lib/db/schema';

/** A mission untouched for longer than this is stalled rather than in progress. */
export const STALLED_AFTER_DAYS = 10;

/** Anything due inside this window is worth saying out loud. */
export const SOON_WITHIN_DAYS = 14;

export type MissionRow = {
  title: string;
  branch: string | null;
  dueOn: string | null;
  movedAt: Date | null;
  movedNote: string | null;
  blocking: string | null;
  createdAt: Date;
};

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * When a mission last actually moved.
 *
 * Falls back to when it was opened, because a mission nobody has touched since
 * creating it has, factually, not moved since then.
 */
export function lastMovement(mission: MissionRow): Date {
  return mission.movedAt ?? mission.createdAt;
}

export function isStalled(mission: MissionRow, now: Date): boolean {
  return daysBetween(lastMovement(mission), now) >= STALLED_AFTER_DAYS;
}

export function isDueSoon(mission: MissionRow, now: Date): boolean {
  if (!mission.dueOn) return false;
  const days = daysBetween(now, new Date(`${mission.dueOn}T00:00:00Z`));
  return days <= SOON_WITHIN_DAYS;
}

/**
 * Count open missions per branch.
 *
 * Returned as counts, never as an ordering. The product does not rank, so this
 * says how many are in each branch and refuses to say which branch is winning.
 */
export function perBranch(rows: MissionRow[]): Record<Branch | 'none', number> {
  const counts = { art: 0, admin: 0, energy: 0, none: 0 } as Record<Branch | 'none', number>;
  for (const row of rows) {
    const key = (BRANCHES as readonly string[]).includes(row.branch ?? '')
      ? (row.branch as Branch)
      : 'none';
    counts[key] += 1;
  }
  return counts;
}

export function renderDigest(
  now: Date,
  open: MissionRow[],
  lastNote: Date | null,
  lastCheckIn: Date | null,
): string {
  const lines: string[] = [];
  const stalled = open.filter((m) => isStalled(m, now));
  const soon = open.filter((m) => isDueSoon(m, now));
  const blocked = open.filter((m) => m.blocking);
  const moved = open.filter((m) => !isStalled(m, now));

  lines.push(`Digest — ${now.toISOString().slice(0, 10)}`);
  lines.push('');

  if (open.length === 0) {
    /* An empty list is a real answer, not a failure to find anything. */
    lines.push('Nothing open. Either it is all done or none of it was written down.');
    return lines.join('\n');
  }

  lines.push(`${open.length} open · ${moved.length} moved recently · ${stalled.length} stalled`);

  const counts = perBranch(open);
  const spread = BRANCHES.map((branch) => `${BRANCH_LABELS[branch]} ${counts[branch]}`).join(' · ');
  lines.push(counts.none > 0 ? `${spread} · unplaced ${counts.none}` : spread);
  lines.push('');

  if (soon.length > 0) {
    lines.push('DUE SOON');
    for (const m of soon) lines.push(`  ${m.dueOn}  ${m.title}`);
    lines.push('');
  }

  if (blocked.length > 0) {
    /* A stated blocker is the most actionable line in the whole record. */
    lines.push('BLOCKED');
    for (const m of blocked) lines.push(`  ${m.title} — ${m.blocking}`);
    lines.push('');
  }

  if (stalled.length > 0) {
    lines.push(`NOT MOVED IN ${STALLED_AFTER_DAYS}+ DAYS`);
    for (const m of stalled) {
      lines.push(`  ${daysBetween(lastMovement(m), now)}d  ${m.title}`);
    }
    lines.push('');
  }

  /*
   * Said last and said plainly. Silence in the record is the thing a query can
   * see that rereading cannot, and it is reported as an observation rather
   * than as a reproach.
   */
  const quiet: string[] = [];
  if (!lastNote) quiet.push('nothing in the notebook');
  else if (daysBetween(lastNote, now) >= 7)
    quiet.push(`notebook quiet ${daysBetween(lastNote, now)}d`);
  if (!lastCheckIn) quiet.push('no check-ins');
  else if (daysBetween(lastCheckIn, now) >= 7)
    quiet.push(`check-ins quiet ${daysBetween(lastCheckIn, now)}d`);

  if (quiet.length > 0) lines.push(`Quiet: ${quiet.join(', ')}.`);

  return lines.join('\n').trimEnd();
}

export function userIdFrom(env: { BRAIN_USER_ID?: string }): string {
  const id = env.BRAIN_USER_ID;
  if (!id) {
    throw new Error(
      'BRAIN_USER_ID is not set. Required rather than inferred — guessing the user\n' +
        'works until the database has two, and then it summarises the wrong life.',
    );
  }
  return id;
}

export async function buildDigest(who: string, now: Date): Promise<string> {
  const db = getDb();

  const open = await db
    .select({
      title: missions.title,
      branch: missions.branch,
      dueOn: missions.dueOn,
      movedAt: missions.movedAt,
      movedNote: missions.movedNote,
      blocking: missions.blocking,
      createdAt: missions.createdAt,
    })
    .from(missions)
    .where(and(eq(missions.userId, who), eq(missions.completed, false)))
    .orderBy(desc(missions.createdAt))
    .limit(200);

  const [note] = await db
    .select({ createdAt: notebookEntries.createdAt })
    .from(notebookEntries)
    .where(eq(notebookEntries.userId, who))
    .orderBy(desc(notebookEntries.createdAt))
    .limit(1);

  const [checkIn] = await db
    .select({ createdAt: checkIns.createdAt })
    .from(checkIns)
    .where(eq(checkIns.userId, who))
    .orderBy(desc(checkIns.createdAt))
    .limit(1);

  return renderDigest(now, open, note?.createdAt ?? null, checkIn?.createdAt ?? null);
}

export async function run(
  env: { BRAIN_USER_ID?: string; DIGEST_SOURCE?: string; DIGEST_DRY_RUN?: string },
  now: Date = new Date(),
): Promise<string> {
  const who = userIdFrom(env);
  const body = await buildDigest(who, now);

  console.log(body);

  /*
   * A dry run prints and stops. Useful from a laptop, and the only way to look
   * at what the scheduled job would say without adding a row nobody asked for.
   */
  if (env.DIGEST_DRY_RUN === 'true') {
    console.log('\n(dry run — nothing written)');
    return body;
  }

  await getDb()
    .insert(digests)
    .values({ userId: who, kind: 'weekly', body, source: env.DIGEST_SOURCE ?? 'github-actions' });

  console.log('\n(written to digests)');
  return body;
}

/** Older digests, so a schedule does not accumulate forever. */
export async function prune(who: string, keepDays: number): Promise<void> {
  const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
  await getDb()
    .delete(digests)
    .where(
      and(eq(digests.userId, who), isNotNull(digests.createdAt), lte(digests.createdAt, cutoff)),
    );
}

if (process.argv[1]?.includes('brain-digest')) {
  run({
    BRAIN_USER_ID: process.env.BRAIN_USER_ID,
    DIGEST_SOURCE: process.env.DIGEST_SOURCE,
    DIGEST_DRY_RUN: process.env.DIGEST_DRY_RUN,
  })
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      console.error(
        `brain-digest failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    });
}
