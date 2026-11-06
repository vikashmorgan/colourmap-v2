import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { GET } from './route';

const request = () => new Request('http://localhost/dreams-in-action');

describe('/dreams-in-action page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a logged-out visitor to sign in and back to /dreams-in-action', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost/login?next=%2Fdreams-in-action',
    );
  });

  it('serves the blocks to a signed-in user, uncached', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const response = await GET(request());
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    for (const block of [
      'New ways of learning',
      'The future of education',
      'Places to build',
      'Logic and intuition',
      'The wider world',
    ]) {
      expect(html).toContain(`name: '${block}'`);
    }
    // Ideas share the notes API, kept apart by their dreams| keys.
    expect(html).toContain("const PREFIX = 'dreams|';");
    expect(html).toContain("const NOTES_URL = '/api/coding/notes';");
    // What is typed survives a failed save or a reload.
    expect(html).toContain("writeLocal('dreams-draft', textEl.value)");
  });
});
