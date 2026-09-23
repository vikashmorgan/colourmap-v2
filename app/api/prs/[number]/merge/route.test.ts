import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

const { mergePullRequest } = vi.hoisted(() => ({ mergePullRequest: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/github', () => ({ mergePullRequest }));

import { POST } from './route';

const user = { id: 'user-1' };
const SHA = 'abc1234def5678';

function call(number: string, body: unknown) {
  return POST(
    new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ number }) },
  );
}

describe('merging from the phone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user } });
    mergePullRequest.mockResolvedValue({ merged: true });
  });

  it('merges the commit that was read', async () => {
    const response = await call('12', { sha: SHA });

    expect(response.status).toBe(200);
    expect(mergePullRequest).toHaveBeenCalledWith(12, SHA);
  });

  it('refuses an anonymous caller', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    expect((await call('12', { sha: SHA })).status).toBe(401);
    expect(mergePullRequest).not.toHaveBeenCalled();
  });

  it('requires a sha rather than merging whatever is at the head', async () => {
    /*
     * The guard against merging a commit nobody read. Without it, a push
     * landing between the phone rendering the list and the thumb arriving
     * would be merged unseen.
     */
    const response = await call('12', {});

    expect(response.status).toBe(400);
    expect(mergePullRequest).not.toHaveBeenCalled();
  });

  it('rejects a pull request number that is not one', async () => {
    for (const bad of ['abc', '0', '-3', '1.5']) {
      const response = await call(bad, { sha: SHA });
      expect(response.status, bad).toBe(400);
    }
    expect(mergePullRequest).not.toHaveBeenCalled();
  });

  it('turns every rule refusal into a 409 with its reason', async () => {
    /*
     * Draft, Lane B, red checks, moved branch — none of these is a fault. The
     * state is wrong, which is what 409 means, and the sentence is written to
     * be read on a phone rather than parsed.
     */
    for (const reason of [
      'still a draft',
      'touches a protected path — Lane B, review it properly',
      'checks are failing',
      'the branch moved since you read it — look again',
    ]) {
      mergePullRequest.mockRejectedValueOnce(new Error(reason));

      const response = await call('12', { sha: SHA });

      expect(response.status).toBe(409);
      expect((await response.json()).error).toBe(reason);
    }
  });

  it('rejects a body that is not JSON', async () => {
    const response = await POST(new Request('http://localhost', { method: 'POST', body: 'nope' }), {
      params: Promise.resolve({ number: '12' }),
    });

    expect(response.status).toBe(400);
    expect(mergePullRequest).not.toHaveBeenCalled();
  });
});
