/*
 * THE ADDER, for the notebook only.
 *
 * `brain-read` reads and never writes, and that stays true. This is a second,
 * deliberately narrow pipe that Victor asked for on 5 Oct 2026: letting the
 * terminal put texts he hands over (poems, collected notes) into one of his
 * notebooks, so he does not have to paste them by hand.
 *
 * It keeps the reason the record was read-only. The notebook's value is that
 * nobody has rewritten it, so this script can only ADD a new entry. It cannot
 * update or delete an entry, touch any other table, or write for anyone but
 * BRAIN_USER_ID. Every entry it adds carries the tag `from-agent`, so an added
 * note is always told apart from one he typed.
 *
 * Like brain-read, the credential is read by the script, never by the agent.
 *
 *   bun scripts/brain-write.ts entries.json
 *
 * where entries.json is `[{ "notebook": "Cammino del cuore", "title": "...",
 * "text": "..." }, ...]`. The notebook is named as it appears in the app; its
 * id is made the way the app makes it (lower case, spaces to underscores).
 */
import { readFile } from 'node:fs/promises';
import { getDb } from '@/lib/db/client';
import { notebookEntries } from '@/lib/db/schema';

export const MAX_ENTRIES = 30;
export const MAX_TITLE_LENGTH = 200;
export const MAX_TEXT_LENGTH = 20000;
export const AGENT_TAG = 'from-agent';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class WriteError extends Error {}

export type NewEntry = { category: string; title: string; content: string };

/* The app's own rule for a notebook's id (see the notebook page's "add notebook"). */
export function notebookId(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/*
 * The notebook stores rich text as one <div> per line, an empty line as
 * <div><br></div> -- the shape its editor writes -- so an added entry reads
 * like one typed in the app.
 */
export function toNotebookHtml(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => (line.trim() ? `<div>${escapeHtml(line)}</div>` : '<div><br></div>'))
    .join('');
}

/* Parse and check the entries file. Throws on the first problem, naming it. */
export function parseEntries(text: string): NewEntry[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new WriteError('entries file is not valid JSON');
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new WriteError('entries file must be a non-empty JSON array');
  }
  if (data.length > MAX_ENTRIES) {
    throw new WriteError(`at most ${MAX_ENTRIES} entries per run`);
  }
  return data.map((item, i) => {
    const { notebook, title, text: body } = (item ?? {}) as Record<string, unknown>;
    if (typeof notebook !== 'string' || !notebook.trim()) {
      throw new WriteError(`entry ${i}: notebook must be its name, as in the app`);
    }
    if (typeof title !== 'string' || !title.trim()) {
      throw new WriteError(`entry ${i}: title must be non-empty text`);
    }
    if (title.trim().length > MAX_TITLE_LENGTH) {
      throw new WriteError(`entry ${i}: title is longer than ${MAX_TITLE_LENGTH} characters`);
    }
    if (typeof body !== 'string' || !body.trim()) {
      throw new WriteError(`entry ${i}: text must be non-empty`);
    }
    if (body.length > MAX_TEXT_LENGTH) {
      throw new WriteError(`entry ${i}: text is longer than ${MAX_TEXT_LENGTH} characters`);
    }
    return {
      category: notebookId(notebook),
      title: title.trim(),
      content: toNotebookHtml(body.trim()),
    };
  });
}

/* Adds one entry; never updates, never deletes. */
export type AddEntry = (who: string, entry: NewEntry) => Promise<void>;

export const addEntry: AddEntry = async (who, entry) => {
  await getDb()
    .insert(notebookEntries)
    .values({ userId: who, ...entry, tags: [AGENT_TAG] });
};

export async function run(
  argv: string[],
  env: { BRAIN_USER_ID?: string },
  deps: {
    read: (path: string) => Promise<string>;
    add: AddEntry;
    log: (line: string) => void;
  } = {
    read: (path) => readFile(path, 'utf8'),
    add: addEntry,
    log: (line) => console.log(line),
  },
): Promise<number> {
  const file = argv[2];
  if (!file) throw new WriteError('usage: bun scripts/brain-write.ts <entries.json>');
  const who = env.BRAIN_USER_ID;
  if (!who || !UUID.test(who)) throw new WriteError('BRAIN_USER_ID must be set to a user uuid');

  const entries = parseEntries(await deps.read(file));
  for (const entry of entries) {
    await deps.add(who, entry);
    deps.log(`added to ${entry.category}: ${entry.title}`);
  }
  deps.log(`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} added.`);
  return 0;
}

/* The CLI shell. Everything above is callable without it. */
if (process.argv[1]?.includes('brain-write')) {
  run(process.argv, { BRAIN_USER_ID: process.env.BRAIN_USER_ID })
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      console.error(
        error instanceof WriteError
          ? error.message
          : `brain-write failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    });
}
