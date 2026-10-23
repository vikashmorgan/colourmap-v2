import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PROTECTED, type PullRequest, refusal, summarise, touchesProtected } from './github';

const GREEN: PullRequest = {
  number: 1,
  title: 'A change',
  branch: 'feature/thing',
  url: 'https://github.com/x/y/pull/1',
  draft: false,
  sha: 'abc1234',
  checks: 'passing',
  laneB: false,
};

describe('what the checks add up to', () => {
  it('is passing only when everything finished well', () => {
    expect(summarise([{ status: 'completed', conclusion: 'success' }])).toBe('passing');
  });

  it('counts neutral and skipped as fine', () => {
    /*
     * A skipped job is a job that correctly decided not to run — the browser
     * smoke suite on a docs-only change, for instance. Treating it as failure
     * would make the merge button useless on exactly the safe changes.
     */
    expect(
      summarise([
        { status: 'completed', conclusion: 'success' },
        { status: 'completed', conclusion: 'skipped' },
        { status: 'completed', conclusion: 'neutral' },
      ]),
    ).toBe('passing');
  });

  it('lets anything unfinished win over anything finished', () => {
    /*
     * The failure this prevents: showing green while a job is still in
     * flight, and somebody merging thirty seconds before the failure lands.
     */
    expect(
      summarise([
        { status: 'completed', conclusion: 'success' },
        { status: 'in_progress', conclusion: null },
      ]),
    ).toBe('running');
  });

  it('reports failure even when most jobs passed', () => {
    expect(
      summarise([
        { status: 'completed', conclusion: 'success' },
        { status: 'completed', conclusion: 'failure' },
      ]),
    ).toBe('failing');
  });

  it('distinguishes no checks from passing checks', () => {
    /*
     * An empty list is not success. A branch where CI never ran has told you
     * nothing, and merging it on a phone is the same gamble as merging red.
     */
    expect(summarise([])).toBe('none');
  });
});

describe('which changes are Lane B', () => {
  it('catches a file directly named in the protected list', () => {
    expect(touchesProtected(['AGENTS.md'])).toBe(true);
  });

  it('catches anything under a protected directory', () => {
    expect(touchesProtected(['docs/specs/missions.md'])).toBe(true);
    expect(touchesProtected(['.github/workflows/agent.yml'])).toBe(true);
    expect(touchesProtected(['drizzle/migrations/0022_voice_notes.sql'])).toBe(true);
  });

  it('leaves ordinary application code alone', () => {
    expect(touchesProtected(['components/MicDot.tsx', 'lib/transcribe.ts'])).toBe(false);
  });

  it('flags a mixed change, because one protected file is enough', () => {
    expect(touchesProtected(['components/MicDot.tsx', 'lib/db/schema.ts'])).toBe(true);
  });

  it('does not match a file that merely starts with a protected name', () => {
    /*
     * `packages/` is not `package.json`, and `docs/specs-old/` is not
     * `docs/specs/`. A prefix test without the trailing slash would flag both
     * and teach somebody to ignore the warning.
     */
    expect(touchesProtected(['packages/thing.ts'])).toBe(false);
    expect(touchesProtected(['docs/specs-old/note.md'])).toBe(false);
  });

  it('agrees exactly with the shell script it copies', () => {
    /*
     * ANTI-DRIFT, READ FROM THE SOURCE RATHER THAN PINNED TO A NUMBER.
     *
     * This list is a second copy of check-protected-paths.sh, and a copy that
     * drifts stops knowing what is protected — worse than useless, because the
     * merge button would then confidently offer Lane B changes.
     *
     * The first version of this test asserted a hard-coded length, and it was
     * wrong on the day it was written: the script carries fifteen patterns and
     * the copy had fourteen, missing docs/guardrails-plan.md. A count is not a
     * comparison. This reads the script.
     */
    const script = readFileSync(join(process.cwd(), 'scripts', 'check-protected-paths.sh'), 'utf8');
    const open = script.indexOf('protected_patterns=(');
    const block = script.slice(open, script.indexOf(')', open));
    const canonical = [...block.matchAll(/"([^"]+)"/g)]
      .map((match) => match[1].replace(/\*\*$/, ''))
      .sort();

    expect([...PROTECTED].sort()).toEqual(canonical);
  });
});

describe('when a merge is refused', () => {
  it('allows a green, reviewed, ordinary branch', () => {
    expect(refusal(GREEN)).toBeNull();
  });

  it('refuses a draft', () => {
    expect(refusal({ ...GREEN, draft: true })).toMatch(/draft/);
  });

  it('refuses failing checks', () => {
    expect(refusal({ ...GREEN, checks: 'failing' })).toMatch(/failing/);
  });

  it('refuses while checks are still running', () => {
    expect(refusal({ ...GREEN, checks: 'running' })).toMatch(/running/);
  });

  it('refuses when no checks ran at all', () => {
    expect(refusal({ ...GREEN, checks: 'none' })).toMatch(/no checks/);
  });

  it('refuses a protected-path change outright', () => {
    /*
     * This is the rule GitHub Free cannot enforce on a private repository, so
     * it is the reason this surface exists rather than a link to the GitHub
     * app. Lane B is refused even when everything else is green.
     */
    expect(refusal({ ...GREEN, laneB: true })).toMatch(/protected path/);
  });

  it('names the draft first when several rules apply', () => {
    /*
     * One sentence, on a phone. Listing every reason would be honest and
     * unreadable; the first blocking one is the one to act on.
     */
    expect(refusal({ ...GREEN, draft: true, laneB: true, checks: 'failing' })).toMatch(/draft/);
  });
});
