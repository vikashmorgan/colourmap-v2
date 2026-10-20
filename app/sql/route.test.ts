import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { GET } from './route';

const request = () => new Request('http://localhost/sql');

describe('/sql class page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a logged-out visitor to sign in and back to /sql', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login?next=%2Fsql');
  });

  it('serves the three sessions to a signed-in user, uncached', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const response = await GET(request());
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(html).toContain('<title>SQL · School</title>');
    // Marks and notes share the coding API, kept apart by their sql| keys.
    expect(html).toContain("const MARKS_URL = '/api/coding/marks';");
    expect(html).toContain("const mine = k => k.startsWith('sql|');");
    for (const n of [1, 2, 3, 4, 5]) expect(html).toContain(`{ n: ${n}, short:`);
    // Practice answers carry their real output from shopstream.db.
    expect(html).toContain('const PRACTICE = {');
    // The cheat sheet: every term from the sessions, searchable, as its own tab.
    expect(html).toContain('const REF = [');
    expect(html).toContain('data-s="ref"');
    // Overall notes above the sessions, and highlights on the lessons.
    expect(html).toContain('data-key="sql|notebook"');
    expect(html).toContain("const HL_KEY = 'sql-highlights';");
    // Sessions 4 and 5, and the keyword peek that opens a cheat-sheet line on hover.
    expect(html).toContain("{ id: 'top-n',");
    expect(html).toContain('const PEEK_TERM = {');
    // Slides per card and the business case, both read from the user's private files.
    expect(html).toContain('const SLIDE_OF = {');
    expect(html).toContain("const CASE_FILE = '/api/coding/slides/SQLBusinessCase.sql';");
  });
});
