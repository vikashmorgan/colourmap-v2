/*
 * THE PULL REQUESTS, READ AND MERGED FROM THE PHONE.
 *
 * WHY THIS EXISTS WHEN THE GITHUB APP ALREADY MERGES
 *
 * Not for convenience. `rules/guardrails.md` records the real reason:
 *
 *   "Branch protection is not available on GitHub Free for private
 *    repositories."
 *
 * So nothing on GitHub's side stops a merge with red checks, or a merge of a
 * protected-path change that was supposed to get human review. In the GitHub
 * app both are one tap, and the tap looks identical to a safe one.
 *
 * This surface puts those rules back where the plan removed them: merge is
 * refused while checks are not green, and refused outright on a Lane B branch.
 * It is a narrower door than GitHub's, which is the entire point of building
 * it rather than using theirs.
 *
 * THE TOKEN NEVER REACHES THE BROWSER
 *
 * Everything here runs server-side and reads GITHUB_TOKEN from the
 * environment. A fine-grained token scoped to one repository is still a token
 * that can push; there is no version of this that is safe in a bundle.
 */

const API = 'https://api.github.com';

export type CheckState = 'passing' | 'failing' | 'running' | 'none';

export type PullRequest = {
  number: number;
  title: string;
  branch: string;
  url: string;
  draft: boolean;
  /** Head SHA, needed to ask about checks and to merge exactly what was read. */
  sha: string;
  checks: CheckState;
  /** True when this branch touches a protected path. Lane B, never auto. */
  laneB: boolean;
};

/*
 * Mirrors `scripts/check-protected-paths.sh`. Duplicated rather than imported
 * because that is a shell script, and a second copy that drifts is still
 * better than a surface that silently stops knowing what is protected —
 * `protectedPaths.test.ts` asserts the two lists agree.
 */
export const PROTECTED = [
  '.github/workflows/',
  'AGENTS.md',
  'rules/',
  'skills/',
  'docs/product.md',
  'docs/specs/',
  'docs/guardrails-plan.md',
  'package.json',
  'bun.lock',
  'biome.json',
  'lefthook.yml',
  'vitest.config.ts',
  'next.config.ts',
  'drizzle/migrations/',
  'lib/db/schema.ts',
];

export function touchesProtected(files: string[]): boolean {
  return files.some((file) => PROTECTED.some((path) => file === path || file.startsWith(path)));
}

/**
 * Turn a pile of check runs into one word.
 *
 * Anything unfinished wins over anything finished: a run still going means the
 * answer is not known yet, and showing 'passing' while a job is in flight is
 * how somebody merges thirty seconds before the failure lands.
 */
export function summarise(runs: { status: string; conclusion: string | null }[]): CheckState {
  if (runs.length === 0) return 'none';
  if (runs.some((run) => run.status !== 'completed')) return 'running';
  if (
    runs.some(
      (run) =>
        run.conclusion !== 'success' &&
        run.conclusion !== 'neutral' &&
        run.conclusion !== 'skipped',
    )
  ) {
    return 'failing';
  }
  return 'passing';
}

/** Why this pull request may not be merged from here, or null when it may. */
export function refusal(pr: PullRequest): string | null {
  if (pr.draft) return 'still a draft';
  if (pr.laneB) return 'touches a protected path — Lane B, review it properly';
  if (pr.checks === 'running') return 'checks are still running';
  if (pr.checks === 'failing') return 'checks are failing';
  if (pr.checks === 'none') return 'no checks ran';
  return null;
}

function token(): string {
  const value = process.env.GITHUB_TOKEN;
  if (!value) throw new Error('GITHUB_TOKEN is not set');
  return value;
}

export function repo(): string {
  return process.env.GITHUB_REPO ?? 'vikashmorgan/colourmap-v2';
}

async function call(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers,
    },
    /* Never a cached answer. A stale check state is the one thing that would
     * make this surface less safe than the GitHub app rather than more. */
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`GitHub ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  return response.json();
}

export async function listPullRequests(): Promise<PullRequest[]> {
  const open = (await call(`/repos/${repo()}/pulls?state=open&per_page=20`)) as Record<
    string,
    // biome-ignore lint/suspicious/noExplicitAny: GitHub's payload is wide and only a few fields are read.
    any
  >[];

  return Promise.all(
    open.map(async (pr) => {
      const sha = pr.head.sha as string;

      const [checks, files] = await Promise.all([
        call(`/repos/${repo()}/commits/${sha}/check-runs`).catch(() => ({ check_runs: [] })),
        call(`/repos/${repo()}/pulls/${pr.number}/files?per_page=100`).catch(() => []),
      ]);

      return {
        number: pr.number as number,
        title: pr.title as string,
        branch: pr.head.ref as string,
        url: pr.html_url as string,
        draft: Boolean(pr.draft),
        sha,
        checks: summarise(checks.check_runs ?? []),
        // biome-ignore lint/suspicious/noExplicitAny: same as above.
        laneB: touchesProtected((files as any[]).map((file) => file.filename as string)),
      };
    }),
  );
}

/**
 * Merge one pull request, if the rules allow it.
 *
 * `sha` is required and passed to GitHub, so this merges exactly the commit
 * that was read and judged. Without it a push landing between the read and the
 * tap would be merged unseen — which is the specific way a phone-sized review
 * goes wrong.
 */
export async function mergePullRequest(number: number, sha: string) {
  const pr = (await listPullRequests()).find((entry) => entry.number === number);
  if (!pr) throw new Error('no such open pull request');

  if (pr.sha !== sha) throw new Error('the branch moved since you read it — look again');

  const why = refusal(pr);
  if (why) throw new Error(why);

  return call(`/repos/${repo()}/pulls/${number}/merge`, {
    method: 'PUT',
    body: JSON.stringify({ sha, merge_method: 'squash' }),
  });
}
