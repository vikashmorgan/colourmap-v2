import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { GET } from './route';

const request = () => new Request('http://localhost/pandas');

describe('/pandas class page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a logged-out visitor to sign in and back to /pandas', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login?next=%2Fpandas');
  });

  it('serves the two sessions to a signed-in user, uncached', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const response = await GET(request());
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(html).toContain('<title>Pandas · School</title>');
    expect(html).toContain("{ n: 1, pages: 37, short: 'DataFrames & loading'");
    expect(html).toContain("{ n: 2, pages: 51, short: 'Selecting, filtering & slicing'");
    // Marks and notes share the coding API, kept apart by their pandas| keys.
    expect(html).toContain("const MARKS_URL = '/api/coding/marks';");
    expect(html).toContain("const mine = k => k.startsWith('pandas|');");
    expect(html).toContain('data-key="pandas|notebook"');
    expect(html).toContain("const FOCUS_KEY = 'pandas|focus';");
    expect(html).toContain("const HL_KEY = 'pandas-highlights';");
    expect(html).not.toContain('stats|');
    expect(html).not.toContain("'stats-");
  });

  it('keeps the Statistics system: picture, cards piece by piece, practice, summary, cheat sheet', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const html = await (await GET(request())).text();

    expect(html).toContain('const PICTURES = {');
    expect(html).toContain("'2|mask': { parts:");
    expect(html).toContain('const PRACTICE_LAWS = {');
    expect(html).toContain('const PRACTICE_PICS = {');
    expect(html).toContain('const ESSENTIALS = {');
    expect(html).toContain('const REF = [');
    expect(html).toContain('id="map-pill"');
    expect(html).toContain('id="nb-dot"');
    expect(html).toContain('function caseOf(key)');
    // Code is the formula here: calls open their cheat-sheet line, and there are no letters or charts.
    expect(html).toContain('const CODE_TOKENS = ');
    expect(html).toContain('const LETTERS = {};');
    expect(html).not.toContain('data-s="charts"');
    expect(html).not.toContain('function markXx');
  });

  it('files the decks under their own names, never from this public page', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const html = await (await GET(request())).text();

    expect(html).toContain("const DECK_FILES = ['Pandas1.pdf', 'Pandas2.pdf'];");
    expect(html).toContain("if (/dataframe/i.test(name)) return 'Pandas1.pdf';");
    expect(html).toContain("if (/selecting|filtering|slicing/i.test(name)) return 'Pandas2.pdf';");
    expect(html).toContain(`/api/coding/slides/Pandas\${s.n}.pdf#page=\${c.slide}`);
  });
});
