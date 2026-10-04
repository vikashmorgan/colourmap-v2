/*
 * THE ANSWERER, for the coding study page only.
 *
 * `brain-read` reads and never writes, and that stays true. This is a separate,
 * deliberately narrow pipe for one job Victor asked for: answering the
 * questions and comments he leaves on /coding. `coding_notes.answer` exists for
 * exactly this (see `docs/specs/coding.md`).
 *
 * It writes ONE column family and nothing else: `answer` and `answered_at` on
 * notes that belong to BRAIN_USER_ID, matched by id. It cannot touch a note's
 * body, kind or key, cannot create or delete notes, and cannot reach any other
 * table. A re-answer clears `read_at`, so the page shows the new answer as
 * unread.
 *
 * Like brain-read, the credential is read by the script, never by the agent.
 *
 *   bun scripts/coding-answer.ts answers.json
 *
 * where answers.json is `[{ "id": "<note uuid>", "answer": "..." }, ...]`.
 */
import { readFile } from 'node:fs/promises';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { codingNotes } from '@/lib/db/schema';

export const MAX_ANSWER_LENGTH = 8000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AnswerError extends Error {}

export type Answer = { id: string; answer: string };

/* Parse and check the answers file. Throws on the first problem, naming it. */
export function parseAnswers(text: string): Answer[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new AnswerError('answers file is not valid JSON');
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new AnswerError('answers file must be a non-empty JSON array');
  }
  const seen = new Set<string>();
  return data.map((item, i) => {
    const { id, answer } = (item ?? {}) as Record<string, unknown>;
    if (typeof id !== 'string' || !UUID.test(id))
      throw new AnswerError(`entry ${i}: id must be a note uuid`);
    if (seen.has(id)) throw new AnswerError(`entry ${i}: id ${id} appears twice`);
    seen.add(id);
    if (typeof answer !== 'string' || answer.trim().length === 0) {
      throw new AnswerError(`entry ${i}: answer must be non-empty text`);
    }
    if (answer.length > MAX_ANSWER_LENGTH) {
      throw new AnswerError(`entry ${i}: answer is longer than ${MAX_ANSWER_LENGTH} characters`);
    }
    return { id, answer: answer.trim() };
  });
}

/* Writes one answer; resolves true when a note of this user was updated. */
export type WriteAnswer = (who: string, a: Answer, at: Date) => Promise<boolean>;

const writeAnswer: WriteAnswer = async (who, a, at) => {
  const rows = await getDb()
    .update(codingNotes)
    .set({ answer: a.answer, answeredAt: at, readAt: null })
    .where(and(eq(codingNotes.id, a.id), eq(codingNotes.userId, who)))
    .returning({ id: codingNotes.id });
  return rows.length > 0;
};

export async function run(
  argv: string[],
  env: { BRAIN_USER_ID?: string },
  deps: {
    read: (path: string) => Promise<string>;
    write: WriteAnswer;
    log: (line: string) => void;
  } = {
    read: (path) => readFile(path, 'utf8'),
    write: writeAnswer,
    log: (line) => console.log(line),
  },
): Promise<number> {
  const file = argv[2];
  if (!file) throw new AnswerError('usage: bun scripts/coding-answer.ts <answers.json>');
  const who = env.BRAIN_USER_ID;
  if (!who || !UUID.test(who)) throw new AnswerError('BRAIN_USER_ID must be set to a user uuid');

  const answers = parseAnswers(await deps.read(file));
  const at = new Date();
  let written = 0;
  const missing: string[] = [];
  for (const a of answers) {
    if (await deps.write(who, a, at)) written++;
    else missing.push(a.id);
  }
  deps.log(`${written} of ${answers.length} answers written.`);
  if (missing.length) deps.log(`Not found for this user: ${missing.join(', ')}`);
  return missing.length ? 1 : 0;
}

/* The CLI shell. Everything above is callable without it. */
if (process.argv[1]?.includes('coding-answer')) {
  run(process.argv, { BRAIN_USER_ID: process.env.BRAIN_USER_ID })
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      console.error(
        error instanceof AnswerError
          ? error.message
          : `coding-answer failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    });
}
