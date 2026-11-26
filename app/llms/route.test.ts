import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { GET } from './route';

const request = () => new Request('http://localhost/llms');

describe('/llms class page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a logged-out visitor to sign in and back to /llms', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login?next=%2Fllms');
  });

  it('serves sessions 1 to 4 to a signed-in user, uncached', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const response = await GET(request());
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(html).toContain('<title>LLMs · School</title>');
    expect(html).toContain('{ n: 1,');
    expect(html).toContain('{ n: 2,');
    expect(html).toContain('{ n: 3,');
    // Session 3's exercise tasks link to the lecture cards they practise.
    expect(html).toContain("uses: ['one-split', 'kfold', 'cv-score', 'cv-code']");
    expect(html).toContain('{ n: 4,');
    // Session 4's exercise tasks link back to the lecture too.
    expect(html).toContain("uses: ['two-prices', 'cheapest']");
    expect(html).toContain('llms|');
    expect(html).not.toMatch(/pandas\|/);
  });
});
