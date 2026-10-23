import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { GET } from './route';

const request = () => new Request('http://localhost/git');

describe('/git study page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a logged-out visitor to sign in and back to /git', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login?next=%2Fgit');
  });

  it('serves the sober study page to a signed-in user, uncached', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const response = await GET(request());
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(html).toContain('<title>Git · MSE-DIM01-3</title>');
    for (const section of ['built', 'defence', 'concepts', 'terms', 'commands', 'check']) {
      expect(html).toContain(`id="${section}"`);
    }
  });
});
