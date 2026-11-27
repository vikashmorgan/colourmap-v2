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

  it('serves the three sessions to a signed-in user, uncached', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const response = await GET(request());
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(html).toContain('<title>Pandas · School</title>');
    expect(html).toContain("{ n: 1, pages: 37, short: 'DataFrames & loading'");
    expect(html).toContain("{ n: 2, pages: 51, short: 'Selecting, filtering & slicing'");
    expect(html).toContain("{ n: 3, pages: 42, short: 'Data quality'");
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
    // Session 3: every piece of code explained, the IQR rule worked out step by step.
    expect(html).toContain("'3|iqr': { parts:");
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

    expect(html).toContain(
      "const DECK_FILES = ['Pandas1.pdf', 'Pandas2.pdf', 'Pandas3.pdf', 'Pandas4.pdf', 'Pandas5.pdf'];",
    );
    expect(html).toContain("if (/dataframe/i.test(name)) return 'Pandas1.pdf';");
    expect(html).toContain("if (/selecting|filtering|slicing/i.test(name)) return 'Pandas2.pdf';");
    expect(html).toContain("if (/quality/i.test(name)) return 'Pandas3.pdf';");
    expect(html).toContain("if (/cleaning/i.test(name)) return 'Pandas4.pdf';");
    expect(html).toContain("if (/aggregat/i.test(name)) return 'Pandas5.pdf';");
    expect(html).toContain(`/api/coding/slides/Pandas\${s.n}.pdf#page=\${c.slide}`);
  });
  it('mirrors each summary at the start, and has the Timer window and the notes cahier', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const html = await (await GET(request())).text();

    // The summary pill at the start shares keys with the summary at the end: dots, notes and highlights follow.
    expect(html).toContain('+ summaryTopHtml(s)');
    expect(html).toContain(
      "const HL_HOST = '.card[data-key]:not(.overall), .ess-item[data-key], [data-hl]';",
    );
    expect(html).toContain(`\${marksHtml(m)}</div></article>`);
    // The Timer: a window with a title, moved and sized, with focus and how solid I feel in closed pills.
    expect(html).toContain('<span class="tw-title" id="tw-title">Timer</span>');
    expect(html).toContain("pill('focus', 'Focus'");
    expect(html).toContain("pill('solid', 'How solid I feel'");
    expect(html).toContain("pill('earlier', 'Earlier sessions'");
    // The notepad: notes apart from questions, and a rich write box saved as plain text.
    expect(html).toContain('data-view="notes">Notes</button>');
    expect(html).toContain("const KIND = { question: 'Question', comment: 'Note' };");
    expect(html).toContain('contenteditable="true" role="textbox"');
    // Beige lesson boxes.
    expect(html).toContain('const SEG_HUE = 70;');
    // Start or pause the Timer, today's sessions as a graph, and the formula blocks as closed pills.
    expect(html).toContain('class="tc-play"');
    expect(html).toContain('function tmDayGraph(day)');
    expect(html).toContain(
      '<details class="pill-fold reads"><summary>What each piece means</summary>',
    );
  });
});
