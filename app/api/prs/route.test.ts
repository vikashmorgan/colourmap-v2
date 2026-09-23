import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

const { listPullRequests } = vi.hoisted(() => ({ listPullRequests: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/github', () => ({ listPullRequests }));

import { GET } from './route';

const user = { id: 'user-1' };
const PR = { number: 12, title: 'A change', checks: 'passing', laneB: false };

describe('listing the pull requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user } });
    listPullRequests.mockResolvedValue([PR]);
  });

  it('returns the open pull requests', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([PR]);
  });

  it('refuses an anonymous caller', async () => {
    /*
     * This reads a private repository through a token the caller does not
     * hold. Without the auth gate the route is an open proxy to it.
     */
    getUser.mockResolvedValue({ data: { user: null } });

    expect((await GET()).status).toBe(401);
    expect(listPullRequests).not.toHaveBeenCalled();
  });

  it('answers 503 with a sentence when no token is configured', async () => {
    /*
     * The ordinary state until somebody adds one. 503 rather than 500 —
     * nothing is broken, a dependency simply is not set up, and the surface
     * says which.
     */
    listPullRequests.mockRejectedValue(new Error('GITHUB_TOKEN is not set'));

    const response = await GET();

    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/GITHUB_TOKEN/);
  });

  it('answers 502 when GitHub itself is the problem', async () => {
    listPullRequests.mockRejectedValue(new Error('GitHub 500: upstream'));

    expect((await GET()).status).toBe(502);
  });
});
