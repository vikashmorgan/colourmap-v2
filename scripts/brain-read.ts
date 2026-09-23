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
 *
 * WHY THE ARGUMENT LOGIC IS PURE AND EXPORTED.
 *
 * The first version parsed `process.argv` inside each function and was tested
 * by spawning the CLI. Those tests passed and reported ZERO coverage, because
 * a subprocess is invisible to the instrumenter — which took `policy-scripts`
 * under its threshold and broke the build on `main`.
 *
 * Parsing is now pure functions over an argv array, unit-tested in process,
 * and the CLI is a thin shell around them. The subprocess tests stay for the
 * refusals, because a refusal that only works when called as a function is not
 * a refusal.
 */

import { and, desc, eq, gte, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { checkIns, missions, notebookEntries, prompts } from '@/lib/db/schema';

export type Command = 'notes' | 'checkins' | 'missions' | 'prompts' | 'silence';

export const COMMANDS: Command[] = ['notes', 'checkins', 'missions', 'prompts', 'silence'];

export const USAGE = `
brain-read — read the record, so the terminal can think about it

  bun scripts/brain-read.ts notes    [--since YYYY-MM-DD | --days N] [--last N]
  bun scripts/brain-read.ts checkins [--since YYYY-MM-DD | --days N] [--last N]
  bun scripts/brain-read.ts missions [--all]
  bun scripts/brain-read.ts prompts [--all]
  bun scripts/brain-read.ts silence  [--days N]

Needs DATABASE_URL and BRAIN_USER_ID in .env.local.
There is no --everything, on purpose.
`;

/** Thrown for anything the caller got wrong. The CLI turns it into an exit. */
export class ReaderError extends Error {}

export function flag(name: string, argv: string[]): string | undefined {
  const at = argv.indexOf(`--${name}`);
  if (at === -1) return undefined;
  return argv[at + 1];
}

export function has(name: string, argv: string[]): boolean {
  return argv.includes(`--${name}`);
}

export function isCommand(value: string | undefined): value is Command {
  return value !== undefined && (COMMANDS as string[]).includes(value);
}

/**
 * Whose record this is.
 *
 * Required rather than inferred. Picking "the only user" works right up until
 * the database has two, and then it silently reads someone else's journal —
 * which is the one failure mode this script must never have.
 */
export function userIdFrom(env: { BRAIN_USER_ID?: string }): string {
  const id = env.BRAIN_USER_ID;
  if (!id) {
    throw new ReaderError(
      'BRAIN_USER_ID is not set.\n' +
        'Add it to .env.local. It is required rather than inferred: guessing the user\n' +
        'is fine until the database has two, and then it reads the wrong journal.',
    );
  }
  return id;
}

/** The window to read. A month by default, which is about as much as stays readable. */
export function windowStart(argv: string[], now: number = Date.now()): Date {
  const explicit = flag('since', argv);
  if (explicit) {
    const parsed = new Date(explicit);
    if (Number.isNaN(parsed.getTime())) {
      throw new ReaderError(`--since ${explicit} is not a date.`);
    }
    return parsed;
  }

  const days = Number(flag('days', argv) ?? 30);
  if (!Number.isFinite(days) || days <= 0) {
    throw new ReaderError('--days must be a positive number.');
  }
  return new Date(now - days * 24 * 60 * 60 * 1000);
}

/** Capped, so no flag turns a windowed read into the bulk dump this refuses. */
export function readLimit(fallback: number, argv: string[]): number {
  const raw = flag('last', argv);
  if (raw === undefined) return fallback;

  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new ReaderError('--last must be a positive number.');
  }
  return Math.min(n, 200);
}

export function assertNoBulkDump(argv: string[]): void {
  if (has('everything', argv)) {
    throw new ReaderError(
      'There is no --everything.\n' +
        'Each command answers one question and takes a window. A journal is the most\n' +
        'personal data you hold, and "it was easy" is not a reason to read all of it.',
    );
  }
}

export function day(at: Date): string {
  return at.toISOString().slice(0, 10);
}

export function daysAgo(at: Date, now: number = Date.now()): number {
  return Math.floor((now - at.getTime()) / (24 * 60 * 60 * 1000));
}

/** How many of a set of rows carried words rather than only a number. */
export function withWords(
  rows: { note?: string | null; challenge?: string | null; flow?: string | null }[],
): number {
  return rows.filter((row) => row.note || row.challenge || row.flow).length;
}

async function readNotes(argv: string[], who: string): Promise<void> {
  const from = windowStart(argv);
  const rows = await getDb()
    .select({
      createdAt: notebookEntries.createdAt,
      category: notebookEntries.category,
      title: notebookEntries.title,
      content: notebookEntries.content,
      tags: notebookEntries.tags,
    })
    .from(notebookEntries)
    .where(and(eq(notebookEntries.userId, who), gte(notebookEntries.createdAt, from)))
    .orderBy(desc(notebookEntries.createdAt))
    .limit(readLimit(50, argv));

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

async function readCheckins(argv: string[], who: string): Promise<void> {
  const from = windowStart(argv);
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
    .where(and(eq(checkIns.userId, who), gte(checkIns.createdAt, from)))
    .orderBy(desc(checkIns.createdAt))
    .limit(readLimit(60, argv));

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
   * No average, deliberately. One number across a month of moods looks like
   * insight and answers no question anybody standing in front of their own
   * record is actually asking.
   */
  console.log(`\n${withWords(rows)} of ${rows.length} carried words as well as a number.`);
}

async function readMissions(argv: string[], who: string): Promise<void> {
  const openOnly = !has('all', argv);
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
        ? and(eq(missions.userId, who), eq(missions.completed, false))
        : eq(missions.userId, who),
    )
    .orderBy(desc(missions.createdAt))
    .limit(readLimit(100, argv));

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

async function readPrompts(argv: string[], who: string): Promise<void> {
  const openOnly = !has('all', argv);
  const rows = await getDb()
    .select({
      createdAt: prompts.createdAt,
      body: prompts.body,
      status: prompts.status,
      prUrl: prompts.prUrl,
      note: prompts.note,
    })
    .from(prompts)
    .where(
      openOnly
        ? and(eq(prompts.userId, who), inArray(prompts.status, ['queued', 'taken']))
        : eq(prompts.userId, who),
    )
    /*
     * OLDEST FIRST, unlike everything else in this file.
     *
     * A queue read newest-first is a stack, and the thing written at midnight
     * when it mattered most sinks under everything written since. This is the
     * one list where the order is the point.
     */
    .orderBy(prompts.createdAt)
    .limit(readLimit(50, argv));

  console.log(`# prompts — ${rows.length} ${openOnly ? 'open' : 'total'}
`);

  for (const row of rows) {
    console.log(`## ${row.status}  ·  ${day(row.createdAt)} (${daysAgo(row.createdAt)}d ago)`);
    console.log(row.body);
    if (row.note) console.log(`note: ${row.note}`);
    if (row.prUrl) console.log(`shipped: ${row.prUrl}`);
    console.log('');
  }

  if (rows.length === 0) console.log('(nothing queued)');
}

/**
 * What has gone quiet.
 *
 * THIS REPORTS LESS THAN IT WANTS TO, AND SAYS SO.
 *
 * The first version asked which BRANCH had gone quiet, by reading a route off
 * `day_events`. That column does not exist — `day_events` carries a date, a
 * type and a payload, and nothing in this database records which part of a
 * life was worked in.
 *
 * That gap is the finding, not a reason to fake the answer. It is also exactly
 * what the missions work in `integrated-system.md` needs in order to show
 * "moving" and "stalled", so it is named here rather than papered over.
 */
async function readSilence(argv: string[], who: string): Promise<void> {
  const from = windowStart(argv);
  const db = getDb();

  const [lastNote] = await db
    .select({ createdAt: notebookEntries.createdAt })
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
    .select({ createdAt: missions.createdAt })
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

  /*
   * Categories are what the notebook actually files by, so they are what can
   * honestly be counted. They are not branches and are not pretended to be.
   */
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

export async function run(argv: string[], env: { BRAIN_USER_ID?: string }): Promise<number> {
  const command = argv[2];

  if (!isCommand(command)) {
    console.log(USAGE);
    return command === undefined ? 0 : 1;
  }

  assertNoBulkDump(argv);

  /*
   * Resolved here, before any reader touches getDb().
   *
   * Inside a query the database connection is built first, so a missing
   * DATABASE_URL used to mask a missing BRAIN_USER_ID — you were told to fix
   * the less important of the two problems. Whose record this is outranks
   * whether the database is reachable.
   */
  const who = userIdFrom(env);

  if (command === 'notes') await readNotes(argv, who);
  else if (command === 'checkins') await readCheckins(argv, who);
  else if (command === 'missions') await readMissions(argv, who);
  else await readSilence(argv, who);

  return 0;
}

/* The CLI shell. Everything above is callable without it. */
if (process.argv[1]?.includes('brain-read')) {
  run(process.argv, { BRAIN_USER_ID: process.env.BRAIN_USER_ID })
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      console.error(
        error instanceof ReaderError
          ? error.message
          : `brain-read failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    });
}
