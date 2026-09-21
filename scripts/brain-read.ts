/*
 * THE READER.
 *
 * Step seven of the build order in `docs/specs/colour-brain.md`, and the whole
 * of what `docs/specs/integrated-system.md` calls the first connection: the app
 * is the record, the terminal is the thinking, and this is the only pipe
 * between them.
 *
 * THE BOUNDARY THIS EXISTS TO HOLD.
 *
 * The repo's Claude settings hard-deny `Read(.env*)`. The first instinct is to
 * treat that as an obstacle and route around it. It is not an obstacle, it is
 * the design:
 *
 *   THIS SCRIPT READS THE CREDENTIAL. THE AGENT READS THIS SCRIPT'S OUTPUT.
 *
 * The secret gets used without ever being seen, and building to the constraint
 * produced a cleaner architecture than ignoring it would have.
 *
 * READING IS FREE. WRITING IS NOT.
 *
 * There is no write path here and there is not going to be one. Anything the
 * terminal produces belongs in a `proposals` table the app surfaces for
 * acceptance — because the notebook's entire value is that nobody has edited
 * it. Six months of uncontaminated notes is the asset; one round of helpful
 * rephrasing destroys the only thing that made them worth keeping.
 *
 * STRUCTURED OUTPUT, NEVER A BULK DUMP.
 *
 * Each command answers one question and takes a window. There is deliberately
 * no `--everything`: a journal is the most personal data its owner holds, and
 * "it was easy" is not a reason to read all of it.
 */

import { and, desc, eq, gte } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { checkIns, missions, notebookEntries } from '@/lib/db/schema';

type Command = 'notes' | 'checkins' | 'missions' | 'silence';

const COMMANDS: Command[] = ['notes', 'checkins', 'missions', 'silence'];

const USAGE = `
brain-read — read the record, so the terminal can think about it

  bun scripts/brain-read.ts notes    [--since YYYY-MM-DD | --days N] [--last N]
  bun scripts/brain-read.ts checkins [--since YYYY-MM-DD | --days N] [--last N]
  bun scripts/brain-read.ts missions [--all]
  bun scripts/brain-read.ts silence  [--days N]

Needs DATABASE_URL and BRAIN_USER_ID in .env.local.
There is no --everything, on purpose.
`;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/**
 * Whose record this is.
 *
 * Required rather than inferred. Picking "the only user" works right up until
 * the database has two, and then it silently reads somebody else's journal —
 * which is the one failure mode this script must never have.
 */
function userId(): string {
  const id = process.env.BRAIN_USER_ID;
  if (!id) {
    fail(
      'BRAIN_USER_ID is not set.\n' +
        'Add it to .env.local. It is required rather than inferred: guessing the user\n' +
        'is fine until the database has two, and then it reads the wrong journal.',
    );
  }
  return id;
}

function flag(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  if (at === -1) return undefined;
  return process.argv[at + 1];
}

function has(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

/** The window to read. A month by default, which is about as much as stays readable. */
function since(): Date {
  const explicit = flag('since');
  if (explicit) {
    const parsed = new Date(explicit);
    if (Number.isNaN(parsed.getTime())) fail(`--since ${explicit} is not a date.`);
    return parsed;
  }
  const days = Number(flag('days') ?? 30);
  if (!Number.isFinite(days) || days <= 0) fail('--days must be a positive number.');
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function limit(fallback: number): number {
  const raw = flag('last');
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) fail('--last must be a positive number.');
  return Math.min(n, 200);
}

function day(at: Date): string {
  return at.toISOString().slice(0, 10);
}

function daysAgo(at: Date): number {
  return Math.floor((Date.now() - at.getTime()) / (24 * 60 * 60 * 1000));
}

async function readNotes(): Promise<void> {
  const from = since();
  const rows = await getDb()
    .select({
      createdAt: notebookEntries.createdAt,
      category: notebookEntries.category,
      title: notebookEntries.title,
      content: notebookEntries.content,
      tags: notebookEntries.tags,
    })
    .from(notebookEntries)
    .where(and(eq(notebookEntries.userId, userId()), gte(notebookEntries.createdAt, from)))
    .orderBy(desc(notebookEntries.createdAt))
    .limit(limit(50));

  console.log(`# notes — ${rows.length} since ${day(from)}\n`);

  for (const row of rows) {
    console.log(`## ${day(row.createdAt)} · ${row.category} · ${row.title}`);
    if (row.tags?.length) console.log(`tags: ${row.tags.join(', ')}`);
    console.log(row.content ? `\n${row.content}\n` : '(no body)\n');
  }

  if (rows.length === 0) {
    console.log('(nothing written in this window — which is itself a fact worth noticing)');
  }
}

async function readCheckins(): Promise<void> {
  const from = since();
  const rows = await getDb()
    .select({
      createdAt: checkIns.createdAt,
      sliderValue: checkIns.sliderValue,
      emotionName: checkIns.emotionName,
      note: checkIns.note,
      challenge: checkIns.challenge,
      flow: checkIns.flow,
    })
    .from(checkIns)
    .where(and(eq(checkIns.userId, userId()), gte(checkIns.createdAt, from)))
    .orderBy(desc(checkIns.createdAt))
    .limit(limit(60));

  console.log(`# check-ins — ${rows.length} since ${day(from)}\n`);
  console.log('date       | val | emotion        | note');
  console.log('-----------|-----|----------------|-----');

  for (const row of rows) {
    const emotion = (row.emotionName ?? '').padEnd(14).slice(0, 14);
    console.log(
      `${day(row.createdAt)} | ${String(row.sliderValue).padStart(3)} | ${emotion} | ${row.note ?? ''}`,
    );
  }

  /*
   * No average, deliberately. One number over a month of moods looks like
   * insight and answers no question anybody standing in front of their own
   * record is actually asking.
   */
  const written = rows.filter((row) => row.note || row.challenge || row.flow).length;
  console.log(`\n${written} of ${rows.length} carried words as well as a number.`);
}

async function readMissions(): Promise<void> {
  const openOnly = !has('all');
  const rows = await getDb()
    .select({
      createdAt: missions.createdAt,
      title: missions.title,
      description: missions.description,
      blocking: missions.blocking,
      nextStep: missions.nextStep,
      completed: missions.completed,
    })
    .from(missions)
    .where(
      openOnly
        ? and(eq(missions.userId, userId()), eq(missions.completed, false))
        : eq(missions.userId, userId()),
    )
    .orderBy(desc(missions.createdAt))
    .limit(limit(100));

  console.log(`# missions — ${rows.length} ${openOnly ? 'open' : 'total'}\n`);

  for (const row of rows) {
    console.log(`## ${row.title}${row.completed ? ' (done)' : ''}`);
    console.log(`opened ${day(row.createdAt)} — ${daysAgo(row.createdAt)} days ago`);
    if (row.description) console.log(`what: ${row.description}`);
    if (row.nextStep) console.log(`next: ${row.nextStep}`);
    /* A stated blocker is the most actionable line in the entire record. */
    if (row.blocking) console.log(`BLOCKED: ${row.blocking}`);
    console.log('');
  }

  if (rows.length === 0) console.log('(nothing open)');
}

/**
 * What has gone quiet.
 *
 * The one thing a query sees that rereading cannot. Absence is invisible when
 * you scroll and obvious when you count, which is why
 * `docs/specs/integrated-system.md` names it as the reason the weekly session
 * is worth having at all.
 *
 * THIS REPORTS LESS THAN IT WANTS TO, AND SAYS SO.
 *
 * The first version asked which BRANCH had gone quiet, by reading a route off
 * `day_events`. That column does not exist — `day_events` carries a date, a
 * type and a payload, and nothing in this database records which part of a life
 * was worked in. The figure can colour a branch by how many surfaces it owns;
 * it cannot colour one by how recently it moved.
 *
 * That gap is the finding, not a reason to fake the answer. It is also exactly
 * what the missions work in `integrated-system.md` needs in order to show
 * "moving" and "stalled" — so it is named here rather than papered over.
 */
async function readSilence(): Promise<void> {
  const from = since();
  const db = getDb();
  const who = userId();

  const [lastNote] = await db
    .select({ createdAt: notebookEntries.createdAt, category: notebookEntries.category })
    .from(notebookEntries)
    .where(eq(notebookEntries.userId, who))
    .orderBy(desc(notebookEntries.createdAt))
    .limit(1);

  const [lastCheckIn] = await db
    .select({ createdAt: checkIns.createdAt })
    .from(checkIns)
    .where(eq(checkIns.userId, who))
    .orderBy(desc(checkIns.createdAt))
    .limit(1);

  const [lastMission] = await db
    .select({ createdAt: missions.createdAt, title: missions.title })
    .from(missions)
    .where(eq(missions.userId, who))
    .orderBy(desc(missions.createdAt))
    .limit(1);

  const recentNotes = await db
    .select({ category: notebookEntries.category, createdAt: notebookEntries.createdAt })
    .from(notebookEntries)
    .where(and(eq(notebookEntries.userId, who), gte(notebookEntries.createdAt, from)))
    .orderBy(desc(notebookEntries.createdAt))
    .limit(500);

  console.log(`# what moved, and what did not — window opens ${day(from)}\n`);

  const line = (label: string, at: Date | undefined) =>
    console.log(
      at ? `${label.padEnd(12)} ${day(at)} — ${daysAgo(at)} days ago` : `${label.padEnd(12)} never`,
    );

  line('Notebook', lastNote?.createdAt);
  line('Check-in', lastCheckIn?.createdAt);
  line('Mission', lastMission?.createdAt);

  /* Categories are what the notebook actually files by, so they are what can
   * honestly be counted. They are not branches and are not pretended to be. */
  const byCategory = new Map<string, Date>();
  for (const row of recentNotes) {
    if (!byCategory.has(row.category)) byCategory.set(row.category, row.createdAt);
  }

  if (byCategory.size > 0) {
    console.log('\nNotebook categories touched in this window:');
    for (const [category, at] of byCategory) {
      console.log(`  ${category.padEnd(20)} ${day(at)} — ${daysAgo(at)} days ago`);
    }
  } else {
    console.log('\nNo notebook entries in this window at all.');
  }

  console.log(
    '\nWHAT THIS CANNOT TELL YOU: which branch went quiet. Nothing in this\n' +
      'database records which part of a life was worked in — day_events carries a\n' +
      'date, a type and a payload, and no route. Until missions land on the tree\n' +
      'and write their movement back, "Art has been silent for eleven days" is not\n' +
      'a sentence this script can honestly say.',
  );
}

async function main(): Promise<void> {
  const command = process.argv[2] as Command | undefined;

  if (!command || !COMMANDS.includes(command)) {
    console.log(USAGE);
    process.exit(command ? 1 : 0);
  }

  if (has('everything')) {
    fail(
      'There is no --everything.\n' +
        'Each command answers one question and takes a window. A journal is the most\n' +
        'personal data you hold, and "it was easy" is not a reason to read all of it.',
    );
  }

  /*
   * Resolved here, before any reader touches getDb().
   *
   * Inside a query the database connection is built first, so a missing
   * DATABASE_URL used to mask a missing BRAIN_USER_ID — you were told to fix
   * the less important of the two problems. Whose record this is outranks
   * whether the database is reachable.
   */
  userId();

  if (command === 'notes') await readNotes();
  else if (command === 'checkins') await readCheckins();
  else if (command === 'missions') await readMissions();
  else await readSilence();

  process.exit(0);
}

main().catch((error: unknown) => {
  fail(`brain-read failed: ${error instanceof Error ? error.message : String(error)}`);
});
