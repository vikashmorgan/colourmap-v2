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

  it('serves the six sessions to a signed-in user, uncached', async () => {
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
    expect(html).toContain("{ n: 4, pages: 63, short: 'Data cleaning'");
    expect(html).toContain("{ n: 5, pages: 24, short: 'Data aggregation'");
    // Session 6 has no deck yet: its cards carry no slide.
    expect(html).toContain("{ n: 6, pages: 0, short: 'Data fusion'");
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
      "const DECK_FILES = ['Pandas1.pdf', 'Pandas2.pdf', 'Pandas3.pdf', 'Pandas4.pdf', 'Pandas5.pdf', 'Pandas6.pdf'];",
    );
    expect(html).toContain("if (/dataframe/i.test(name)) return 'Pandas1.pdf';");
    expect(html).toContain("if (/selecting|filtering|slicing/i.test(name)) return 'Pandas2.pdf';");
    expect(html).toContain("if (/quality/i.test(name)) return 'Pandas3.pdf';");
    expect(html).toContain("if (/cleaning/i.test(name)) return 'Pandas4.pdf';");
    expect(html).toContain("if (/aggregat|groupby/i.test(name)) return 'Pandas5.pdf';");
    expect(html).toContain("if (/fusion|merg|join/i.test(name)) return 'Pandas6.pdf';");
    expect(html).toContain(`/api/coding/slides/Pandas\${s.n}.pdf#page=\${c.slide}`);
  });
  it('gives every session the notebook exercises with their solutions, folded until opened', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const html = await (await GET(request())).text();
    const sessions = [...html.matchAll(/^ {2}\{ n: (\d+), pages:/gm)].map((m) => Number(m[1]));
    expect(sessions).toEqual([1, 2, 3, 4, 5, 6]);

    const start = html.indexOf('const NOTEBOOKS = {');
    expect(start).toBeGreaterThan(0);
    const body = html.slice(start, html.indexOf('\n};\n', start));
    const sets = [...body.matchAll(/^ {2}(\d+): \{ about: /gm)];
    expect(sets.map((m) => Number(m[1]))).toEqual(sessions);
    // Each set: its questions, each with the task, the solution code, its pieces and the result.
    const counts = sets.map((m, i) => {
      const chunk = body.slice(m.index, sets[i + 1]?.index ?? body.length);
      const qs = [...chunk.matchAll(/\{ id: 'q\d+', title: '[^']+', task: '/g)].length;
      expect([...chunk.matchAll(/, parts: \[\[/g)].length).toBe(qs);
      expect([...chunk.matchAll(/\], out: '/g)].length).toBe(qs);
      return qs;
    });
    expect(counts).toEqual([12, 22, 10, 30, 10, 10]);

    // A Notebook part between Practice and Summary; the solution waits in a closed fold.
    expect(html).toContain('function notebookHtml(s)');
    expect(html).toContain('data-seg="notebook"');
    expect(html).toContain('<details class="pq sol"><summary><span>Solution</span></summary>');
    expect(html).toContain("{ key: 'notebook', name: 'Notebook'");
    // Notes and deep links reach each question.
    expect(html).toContain(`key: cardKey(s.n, \`nb-\${q.id}\`)`);
  });

  it('teaches data fusion in Session 6, with its calls in the cheat sheet and the hover glossary', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const html = await (await GET(request())).text();

    for (const id of [
      'merge',
      'how',
      'unmatched',
      'repeats',
      'two-keys6',
      'concat-rows',
      'concat-cols',
      'pivot',
      'melt',
    ])
      expect(html).toContain(`{ id: '${id}', name: `);
    expect(html).toContain("{ name: 'Fusion', items: [");
    expect(html).toContain("['pivot_table', 'Long to wide");
    expect(html).toContain('  6: () => `<p class="pic-lede"><b>One question, several tables.');
    for (const fn of ['merge', 'concat', 'pivot_table', 'melt', 'suffixes', 'ignore_index'])
      expect(html).toContain(`    ${fn}: ['`);
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
  });
});
