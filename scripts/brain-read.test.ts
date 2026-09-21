import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * The reader is a CLI, so it is tested as one — by running it.
 *
 * Every case below reaches its verdict BEFORE touching the database, which is
 * what makes this fast and what makes it worth having: these are the refusals,
 * and a refusal that only works when the database happens to be up is not a
 * refusal.
 */

const SCRIPT = path.join(process.cwd(), 'scripts', 'brain-read.ts');

function run(args: string[], env: Record<string, string> = {}) {
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

describe('what the reader will not do', () => {
  it('refuses --everything, and says why', () => {
    /*
     * The rule from docs/specs/integrated-system.md: structured output, never a
     * bulk dump. A journal is the most personal data its owner holds, and the
     * fact that reading all of it is easy is not a reason to.
     */
    const { code, out } = run(['notes', '--everything']);

    expect(code).toBe(1);
    expect(out).toContain('There is no --everything');
  });

  it('will not guess whose record it is', () => {
    /*
     * Inferring "the only user" works until the database has two, and then it
     * silently reads someone else's journal. That is the one failure this
     * script must never have, so the id is required rather than derived.
     */
    const { code, out } = run(['missions']);

    expect(code).toBe(1);
    expect(out).toContain('BRAIN_USER_ID is not set');
  });

  it('rejects a window it cannot parse instead of quietly picking one', () => {
    const { code, out } = run(['notes', '--since', 'last-tuesday'], { BRAIN_USER_ID: 'x' });

    expect(code).toBe(1);
    expect(out).toContain('is not a date');
  });

  it('rejects a nonsense --days rather than reading everything', () => {
    const { code, out } = run(['notes', '--days', '-5'], { BRAIN_USER_ID: 'x' });

    expect(code).toBe(1);
    expect(out).toContain('--days must be a positive number');
  });
});

describe('finding your way in', () => {
  it('prints usage and succeeds when asked for nothing', () => {
    const { code, out } = run([]);

    expect(code).toBe(0);
    expect(out).toContain('brain-read');
    for (const command of ['notes', 'checkins', 'missions', 'silence']) {
      expect(out).toContain(command);
    }
  });

  it('fails on a command it does not have', () => {
    const { code } = run(['everything-about-me']);

    expect(code).toBe(1);
  });

  it('tells you what it needs before you can use it', () => {
    const { out } = run([]);

    expect(out).toContain('DATABASE_URL');
    expect(out).toContain('BRAIN_USER_ID');
  });
});
