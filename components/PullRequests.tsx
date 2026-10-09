'use client';

import { useCallback, useEffect, useState } from 'react';

import type { CheckState, PullRequest } from '@/lib/github';

/*
 * THE PULL REQUESTS, ON THE PHONE.
 *
 * This is the last step of the loop that has no other home. The app records,
 * the agent works, and then somebody has to look — and until now that somebody
 * had to be at a laptop, which is the exact dependency the rest of this was
 * built to remove.
 *
 * WHY NOT JUST LINK TO THE GITHUB APP
 *
 * Because `rules/guardrails.md` says branch protection is unavailable on
 * GitHub Free for private repositories. In the GitHub app, merging a red
 * branch and merging a green one are the same single tap and look identical.
 * Here the button is simply not offered, and the reason is written where the
 * button would have been.
 *
 * That makes this a NARROWER door than GitHub's, not a faster one. If it ever
 * becomes the faster one, it has stopped being worth having.
 */

const OCHRE = '#C4A060';

const CHECK_WORD: Record<CheckState, string> = {
  passing: 'checks passed',
  failing: 'checks failed',
  running: 'checks running',
  none: 'no checks',
};

/*
 * Warm, never a red badge — those are on the never list, and a failing check
 * is information rather than an alarm. Failure is browner and quieter than
 * success, which is the opposite of the usual instinct and correct here: the
 * one that wants your attention is the one you can act on.
 */
const CHECK_HUE: Record<CheckState, string> = {
  passing: '#5f8a6a',
  failing: '#9c5f4a',
  running: '#8a7a5a',
  none: '#6b5a44',
};

export default function PullRequests() {
  const [prs, setPrs] = useState<PullRequest[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError('');
    const response = await fetch('/api/prs');

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'could not reach GitHub');
      setPrs([]);
      return;
    }

    setPrs((await response.json()) as PullRequest[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function merge(pr: PullRequest) {
    setBusy(pr.number);
    setError('');

    /*
     * The sha travels with the request. It is what makes this a merge of the
     * thing that was read: if the branch moved between this list rendering and
     * the thumb landing, the server refuses rather than shipping a commit
     * nobody saw.
     */
    const response = await fetch(`/api/prs/${pr.number}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: pr.sha }),
    });

    setBusy(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(`#${pr.number}: ${body.error ?? 'merge failed'}`);
      return;
    }

    await load();
  }

  if (prs === null) {
    return (
      <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Reading the pull requests…</p>
    );
  }

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20 }}>
          Waiting for you
        </h2>
        <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
          {prs.length === 0 ? 'nothing open' : `${prs.length} open`}
        </span>
      </header>

      {error ? (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--muted-foreground)',
            padding: '10px 12px',
            borderRadius: 12,
            background: '#C4A06014',
          }}
        >
          {error}
        </p>
      ) : null}

      {prs.map((pr) => {
        /*
         * The refusal is recomputed here for the label, and enforced again on
         * the server. Two copies on purpose: this one explains, and the server
         * one decides. A disabled button is a hint, never a guarantee.
         */
        const why = localRefusal(pr);

        return (
          <article
            key={pr.number}
            style={{
              display: 'grid',
              gap: 8,
              padding: 14,
              borderRadius: 16,
              background: 'var(--card, #fdf7e9)',
              border: '1px solid #C4A06028',
            }}
          >
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 16,
                lineHeight: 1.35,
                color: 'var(--foreground)',
                textDecoration: 'none',
              }}
            >
              #{pr.number} {pr.title}
            </a>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  padding: '3px 9px',
                  borderRadius: 999,
                  color: '#fdf7e9',
                  background: CHECK_HUE[pr.checks],
                }}
              >
                {CHECK_WORD[pr.checks]}
              </span>

              {pr.laneB ? (
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: '3px 9px',
                    borderRadius: 999,
                    color: '#5C3018',
                    background: '#C4A06033',
                  }}
                >
                  Lane B
                </span>
              ) : null}

              <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{pr.branch}</span>
            </div>

            {why ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--muted-foreground)',
                }}
              >
                Not from here — {why}.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void merge(pr)}
                disabled={busy === pr.number}
                style={{
                  /* 44px floor. A merge button is the last control that should
                   * be easy to hit by accident and hard to hit on purpose. */
                  minHeight: 44,
                  borderRadius: 12,
                  border: 'none',
                  background: OCHRE,
                  color: '#2a1c08',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: busy === pr.number ? 'progress' : 'pointer',
                }}
              >
                {busy === pr.number ? 'Merging…' : 'Merge'}
              </button>
            )}
          </article>
        );
      })}
    </section>
  );
}

/** Mirrors `refusal()` in lib/github. Explains; the server decides. */
export function localRefusal(pr: PullRequest): string | null {
  if (pr.draft) return 'still a draft';
  if (pr.laneB) return 'it touches a protected path, so read it properly';
  if (pr.checks === 'running') return 'checks are still running';
  if (pr.checks === 'failing') return 'checks are failing';
  if (pr.checks === 'none') return 'no checks ran';
  return null;
}
