import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * A stand-in for the Drizzle query builder.
 *
 * Every chained method returns the same object and .limit() resolves to the
 * next queued result, which is enough to exercise the four readers without a
 * database. They are the bulk of this file, and leaving them untested is what
 * kept policy-scripts under its threshold even after the parsing was extracted.
 */
const rows: unknown[][] = [];

vi.mock('@/lib/db/client', () => {
  const api: Record<string, unknown> = {};
  const self = () => api;
  api.select = self;
  api.from = self;
  api.where = self;
  api.orderBy = self;
  api.limit = () => Promise.resolve(rows.shift() ?? []);
  return { getDb: () => api };
});

import {
  assertNoBulkDump,
  COMMANDS,
  day,
  daysAgo,
  flag,
  has,
  isCommand,
  ReaderError,
  readLimit,
  run,
  USAGE,
  userIdFrom,
  windowStart,
  withWords,
} from './brain-read';

/*
 * Three layers, on purpose.
 *
 * The parsing and the refusals are pure and tested in process, because the
 * first version tested everything by spawning the CLI — those tests passed and
 * reported ZERO coverage, since a subprocess is invisible to the instrumenter.
 * That took policy-scripts under threshold and broke `main`.
 *
 * The readers are tested against the stub above, because they are most of the
 * file and extracting the parsing alone was not enough to clear the gate.
 *
 * The subprocess tests at the bottom stay anyway: a refusal that only works
 * when called as a function is not a refusal.
 */

const argv = (...args: string[]) => ['bun', 'brain-read.ts', ...args];

const WHO = { BRAIN_USER_ID: 'victor' };

function captured() {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  });
  return () => lines.join('\n');
}

beforeEach(() => {
  rows.length = 0;
  vi.restoreAllMocks();
});

describe('reading the arguments', () => {
  it('finds a flag and its value', () => {
    expect(flag('since', argv('notes', '--since', '2026-09-01'))).toBe('2026-09-01');
    expect(flag('missing', argv('notes'))).toBeUndefined();
  });

  it('treats a flag with nothing after it as absent rather than empty', () => {
    expect(flag('last', argv('notes', '--last'))).toBeUndefined();
  });

  it('recognises only the four commands it has', () => {
    for (const command of COMMANDS) expect(isCommand(command)).toBe(true);
    expect(isCommand('everything-about-me')).toBe(false);
    expect(isCommand(undefined)).toBe(false);
  });

  it('sees a bare switch', () => {
    expect(has('all', argv('missions', '--all'))).toBe(true);
    expect(has('all', argv('missions'))).toBe(false);
  });
});

describe('the window', () => {
  it('takes an explicit date', () => {
    expect(day(windowStart(argv('notes', '--since', '2026-09-01')))).toBe('2026-09-01');
  });

  it('defaults to a month, which is about as much as stays readable', () => {
    const now = Date.parse('2026-09-21T00:00:00Z');
    expect(day(windowStart(argv('notes'), now))).toBe('2026-08-22');
  });

  it('counts back the days it is given', () => {
    const now = Date.parse('2026-09-21T00:00:00Z');
    expect(day(windowStart(argv('notes', '--days', '7'), now))).toBe('2026-09-14');
  });

  it('refuses a date it cannot parse rather than quietly picking one', () => {
    expect(() => windowStart(argv('notes', '--since', 'last-tuesday'))).toThrow(ReaderError);
  });

  it('refuses a nonsense day count', () => {
    for (const bad of ['-5', '0', 'lots']) {
      expect(() => windowStart(argv('notes', '--days', bad)), bad).toThrow(ReaderError);
    }
  });
});

describe('the limit', () => {
  it('uses the fallback when nothing is asked for', () => {
    expect(readLimit(50, argv('notes'))).toBe(50);
  });

  it('takes a smaller number', () => {
    expect(readLimit(50, argv('notes', '--last', '5'))).toBe(5);
  });

  it('caps a large one, so no flag turns this into the bulk dump it refuses', () => {
    expect(readLimit(50, argv('notes', '--last', '99999'))).toBe(200);
  });

  it('refuses a nonsense count', () => {
    expect(() => readLimit(50, argv('notes', '--last', '-1'))).toThrow(ReaderError);
  });
});

describe('what it will not do', () => {
  it('refuses --everything, and says why', () => {
    /*
     * Structured output, never a bulk dump. A journal is the most personal
     * data its owner holds, and the fact that reading all of it is easy is
     * not a reason to.
     */
    expect(() => assertNoBulkDump(argv('notes', '--everything'))).toThrow(/no --everything/);
  });

  it('allows a normal read straight through', () => {
    expect(() => assertNoBulkDump(argv('notes'))).not.toThrow();
  });

  it('will not guess whose record it is', () => {
    expect(() => userIdFrom({})).toThrow(/BRAIN_USER_ID is not set/);
    expect(userIdFrom({ BRAIN_USER_ID: 'abc' })).toBe('abc');
  });
});

describe('small readings', () => {
  it('counts days elapsed, floored', () => {
    const now = Date.parse('2026-09-21T12:00:00Z');
    expect(daysAgo(new Date('2026-09-18T00:00:00Z'), now)).toBe(3);
    expect(daysAgo(new Date('2026-09-21T00:00:00Z'), now)).toBe(0);
  });

  it('counts which check-ins carried words as well as a number', () => {
    expect(
      withWords([
        { note: 'tired' },
        { note: null, challenge: null, flow: null },
        { flow: 'writing' },
        {},
      ]),
    ).toBe(2);
  });

  it('names the four commands in its own usage text', () => {
    for (const command of COMMANDS) expect(USAGE).toContain(command);
    expect(USAGE).toContain('DATABASE_URL');
    expect(USAGE).toContain('BRAIN_USER_ID');
  });
});

describe('reading notes', () => {
  it('prints each entry with its date, category and title', async () => {
    rows.push([
      {
        createdAt: new Date('2026-09-18T09:00:00Z'),
        category: 'Admin',
        title: 'Sanitas',
        content: 'Corrected the departure.',
        tags: ['insurance', 'geneva'],
      },
    ]);
    const output = captured();

    await run(argv('notes'), WHO);

    const text = output();
    expect(text).toContain('# notes — 1 since');
    expect(text).toContain('2026-09-18 · Admin · Sanitas');
    expect(text).toContain('tags: insurance, geneva');
    expect(text).toContain('Corrected the departure.');
  });

  it('says an empty window is itself a fact', async () => {
    const output = captured();

    await run(argv('notes'), WHO);

    expect(output()).toContain('nothing written in this window');
  });

  it('marks an entry with no body rather than printing nothing', async () => {
    rows.push([
      {
        createdAt: new Date('2026-09-18T09:00:00Z'),
        category: 'Art',
        title: 'Untitled',
        content: null,
        tags: null,
      },
    ]);
    const output = captured();

    await run(argv('notes'), WHO);

    expect(output()).toContain('(no body)');
  });
});

describe('reading check-ins', () => {
  it('tabulates them and counts which carried words', async () => {
    /*
     * No average anywhere in the output, deliberately: one number across a
     * month of moods looks like insight and answers nothing.
     */
    rows.push([
      {
        createdAt: new Date('2026-09-20T08:00:00Z'),
        sliderValue: 7,
        emotionName: 'steady',
        note: 'slept well',
        challenge: null,
        flow: null,
      },
      {
        createdAt: new Date('2026-09-19T08:00:00Z'),
        sliderValue: 4,
        emotionName: null,
        note: null,
        challenge: null,
        flow: null,
      },
    ]);
    const output = captured();

    await run(argv('checkins'), WHO);

    const text = output();
    expect(text).toContain('# check-ins — 2 since');
    expect(text).toContain('steady');
    expect(text).toContain('1 of 2 carried words');
    expect(text).not.toMatch(/average/i);
  });
});

describe('reading missions', () => {
  it('leads with the blocker, because it is the most actionable line', async () => {
    rows.push([
      {
        createdAt: new Date('2026-09-14T08:00:00Z'),
        title: 'Codice fiscale',
        description: 'Consulate by email',
        blocking: 'waiting on the AA4/8',
        nextStep: 'attach the passport copy',
        completed: false,
      },
    ]);
    const output = captured();

    await run(argv('missions'), WHO);

    const text = output();
    expect(text).toContain('# missions — 1 open');
    expect(text).toContain('BLOCKED: waiting on the AA4/8');
    expect(text).toContain('next: attach the passport copy');
  });

  it('says so plainly when nothing is open', async () => {
    const output = captured();

    await run(argv('missions'), WHO);

    expect(output()).toContain('(nothing open)');
  });

  it('counts the total rather than the open ones when asked for all', async () => {
    rows.push([
      {
        createdAt: new Date('2026-09-14T08:00:00Z'),
        title: 'Deploy',
        description: null,
        blocking: null,
        nextStep: null,
        completed: true,
      },
    ]);
    const output = captured();

    await run(argv('missions', '--all'), WHO);

    const text = output();
    expect(text).toContain('# missions — 1 total');
    expect(text).toContain('Deploy (done)');
  });
});

describe('reading what went quiet', () => {
  it('reports the last of each, and never for what has none', async () => {
    rows.push([{ createdAt: new Date('2026-09-20T08:00:00Z') }]);
    rows.push([]);
    rows.push([{ createdAt: new Date('2026-09-10T08:00:00Z') }]);
    rows.push([{ category: 'Admin', createdAt: new Date('2026-09-20T08:00:00Z') }]);
    const output = captured();

    await run(argv('silence'), WHO);

    const text = output();
    expect(text).toContain('Notebook');
    expect(text).toContain('Check-in     never');
    expect(text).toContain('Notebook categories touched in this window:');
    expect(text).toContain('Admin');
  });

  it('admits the thing it cannot answer instead of faking it', async () => {
    /*
     * Nothing in this database records which part of a life was worked in, so
     * "Art has been silent for eleven days" is not a sentence it can honestly
     * say. Saying that out loud is the point.
     */
    rows.push([], [], [], []);
    const output = captured();

    await run(argv('silence'), WHO);

    const text = output();
    expect(text).toContain('WHAT THIS CANNOT TELL YOU');
    expect(text).toContain('No notebook entries in this window at all.');
  });
});

describe('the command shell', () => {
  it('prints usage and succeeds on no command', async () => {
    const output = captured();

    expect(await run(argv(), WHO)).toBe(0);
    expect(output()).toContain('brain-read');
  });

  it('exits non-zero on an unknown command', async () => {
    captured();

    expect(await run(argv('everything-about-me'), WHO)).toBe(1);
  });

  it('refuses the bulk dump before it reaches the database', async () => {
    await expect(run(argv('notes', '--everything'), WHO)).rejects.toThrow(/no --everything/);
  });

  it('refuses to guess the user before it reaches the database', async () => {
    await expect(run(argv('notes'), {})).rejects.toThrow(/BRAIN_USER_ID/);
  });
});

/* ── The CLI contract, exercised as a CLI ───────────────────────────────── */

const SCRIPT = path.join(process.cwd(), 'scripts', 'brain-read.ts');

function cli(args: string[], env: Record<string, string> = {}) {
  try {
    const stdout = execFileSync('bun', [SCRIPT, ...args], {
      encoding: 'utf8',
      env: { ...process.env, BRAIN_USER_ID: '', DATABASE_URL: '', ...env },
      timeout: 30_000,
    });
    return { code: 0, out: stdout };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

describe('run as a command', () => {
  it('prints usage and succeeds when asked for nothing', () => {
    const { code, out } = cli([]);

    expect(code).toBe(0);
    expect(out).toContain('brain-read');
  });

  it('fails on a command it does not have', () => {
    expect(cli(['everything-about-me']).code).toBe(1);
  });

  it('still refuses --everything from the shell', () => {
    const { code, out } = cli(['notes', '--everything']);

    expect(code).toBe(1);
    expect(out).toContain('There is no --everything');
  });

  it('still refuses to guess the user from the shell', () => {
    const { code, out } = cli(['missions']);

    expect(code).toBe(1);
    expect(out).toContain('BRAIN_USER_ID is not set');
  });
});
