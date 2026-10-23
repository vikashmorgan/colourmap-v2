// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PullRequests, { localRefusal } from './PullRequests';

const GREEN = {
  number: 12,
  title: 'A change worth merging',
  branch: 'feature/thing',
  url: 'https://github.com/x/y/pull/12',
  draft: false,
  sha: 'abc1234def',
  checks: 'passing' as const,
  laneB: false,
};

function respond(prs: unknown[]) {
  return vi.fn(async () => ({ ok: true, json: async () => prs }) as unknown as Response);
}

afterEach(cleanup);

describe('the pull requests on the phone', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('offers a merge on a green, reviewed, ordinary branch', async () => {
    vi.stubGlobal('fetch', respond([GREEN]));
    render(<PullRequests />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Merge' })).toBeTruthy());
    expect(screen.getByText(/checks passed/)).toBeTruthy();
  });

  it('offers no merge button at all when checks are failing', async () => {
    /*
     * Not a disabled button — no button. A disabled control invites a second
     * tap and a search for the way round it; a sentence where the button would
     * have been answers the question instead.
     */
    vi.stubGlobal('fetch', respond([{ ...GREEN, checks: 'failing' }]));
    render(<PullRequests />);

    await waitFor(() => expect(screen.getByText(/checks are failing/)).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Merge' })).toBeNull();
  });

  it('refuses a Lane B branch even when everything is green', async () => {
    /*
     * The rule GitHub Free cannot enforce on a private repo, which is the
     * whole reason this surface exists rather than a link to the GitHub app.
     */
    vi.stubGlobal('fetch', respond([{ ...GREEN, laneB: true }]));
    render(<PullRequests />);

    await waitFor(() => expect(screen.getByText(/protected path/)).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Merge' })).toBeNull();
    expect(screen.getByText('Lane B')).toBeTruthy();
  });

  it('will not merge a branch whose checks never ran', async () => {
    vi.stubGlobal('fetch', respond([{ ...GREEN, checks: 'none' }]));
    render(<PullRequests />);

    await waitFor(() => expect(screen.getByText(/no checks ran/)).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Merge' })).toBeNull();
  });

  it('says so plainly when there is no token yet', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: false,
            json: async () => ({ error: 'GITHUB_TOKEN is not set' }),
          }) as unknown as Response,
      ),
    );
    render(<PullRequests />);

    await waitFor(() => expect(screen.getByText(/GITHUB_TOKEN is not set/)).toBeTruthy());
  });

  it('reports an empty queue as a state rather than a blank screen', async () => {
    vi.stubGlobal('fetch', respond([]));
    render(<PullRequests />);

    await waitFor(() => expect(screen.getByText('nothing open')).toBeTruthy());
  });

  it('sends the sha it displayed, not just the number', async () => {
    /*
     * The guard against merging a commit nobody read. If the branch moves
     * between this list rendering and the thumb landing, the server sees a
     * stale sha and refuses.
     */
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/merge')) {
        expect(JSON.parse(String(init?.body))).toEqual({ sha: 'abc1234def' });
        return { ok: true, json: async () => ({ merged: true }) } as unknown as Response;
      }
      return { ok: true, json: async () => [GREEN] } as unknown as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<PullRequests />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Merge' })).toBeTruthy());
    screen.getByRole('button', { name: 'Merge' }).click();

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/merge'))).toBe(true),
    );
  });

  it('keeps the merge control above the touch floor', async () => {
    /*
     * A merge is the last control that should be easy to hit by accident.
     */
    vi.stubGlobal('fetch', respond([GREEN]));
    render(<PullRequests />);

    const button = await screen.findByRole('button', { name: 'Merge' });
    expect(button.style.minHeight).toBe('44px');
  });
});

describe('the reason a merge is not offered', () => {
  it('names each rule in words a phone can show', () => {
    expect(localRefusal(GREEN)).toBeNull();
    expect(localRefusal({ ...GREEN, draft: true })).toMatch(/draft/);
    expect(localRefusal({ ...GREEN, laneB: true })).toMatch(/protected path/);
    expect(localRefusal({ ...GREEN, checks: 'running' })).toMatch(/still running/);
    expect(localRefusal({ ...GREEN, checks: 'failing' })).toMatch(/failing/);
    expect(localRefusal({ ...GREEN, checks: 'none' })).toMatch(/no checks/);
  });
});
