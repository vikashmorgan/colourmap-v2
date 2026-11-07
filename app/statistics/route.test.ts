import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { GET } from './route';

const request = () => new Request('http://localhost/statistics');

describe('/statistics class page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a logged-out visitor to sign in and back to /statistics', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login?next=%2Fstatistics');
  });

  it('serves the four lectures to a signed-in user, uncached', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const response = await GET(request());
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(html).toContain('<title>Statistics · School</title>');
    // Marks and notes share the coding API, kept apart by their stats| keys.
    expect(html).toContain("const MARKS_URL = '/api/coding/marks';");
    expect(html).toContain("const mine = k => k.startsWith('stats|');");
    expect(html).toContain('data-key="stats|notebook"');
    expect(html).toContain("['orange', '#f08a3c']");
    // A line between boxes leaves from the box's left edge, not from the clicked word.
    expect(html).toContain('const x1 = up.left,');
    // Older notes and unsorted reflections wait in closed pills; blocks can be made in the sheet.
    expect(html).toContain('<summary>Earlier</summary>');
    expect(html).toContain('id="rf-new">+ New block</button>');
    // Charts: scales on every chart, a tab with each graph and its formula, and four looks for the pill.
    expect(html).toContain('function niceTicks(top)');
    expect(html).toContain('data-s="charts"');
    expect(html).toContain('const CHARTS = [');
    expect(html).toContain("const PILL_LOOKS = ['bar', 'line', 'steps', 'gauge'];");
    // How clear each card is: a bar on the card, a coloured number in the map.
    expect(html).toContain('article.card[data-mark="got"]::after { background: var(--got); }');
    expect(html).toContain('paintBars(); renderMap();');
    // Reflections go to Dreams in Action, and a failed save keeps the words.
    expect(html).toContain('id="rf-dot"');
    expect(html).toContain("const RF_PREFIX = 'dreams|';");
    expect(html).toContain('Not saved. Your words are still here.');
    for (const n of [1, 2, 3]) expect(html).toContain(`{ n: ${n}, short:`);
    // The cheat sheet and the highlights, as on the SQL page.
    expect(html).toContain('const REF = [');
    expect(html).toContain('data-s="ref"');
    expect(html).toContain("const HL_KEY = 'stats-highlights';");
    // Every formula is explained on its card, and each segment has its own colour.
    expect(html).toContain('const READS = {');
    expect(html).toContain('What each piece means');
    expect(html).toContain('const segHue = ');
    expect(html).not.toContain('Explain more');
    // A worked example sets each piece of the formula beside its numbers.
    expect(html).toContain('class="steps"');
    expect(html).not.toContain('r.walk.lines');
    // A tab on the left of the boxes marks the part.
    expect(html).toContain('class="seg-tab"');
    // Letters such as X, x, n and p open the same side box as a term.
    expect(html).toContain('function letterBox(word, card)');
    // The notepad sets the text size, and a term inside a side box opens the next box, joined by a line.
    expect(html).toContain('id="size-up"');
    expect(html).toContain('function drawPeekLinks()');
    // Each segment ends with the user's own boxes, each with a title.
    expect(html).toContain('function paintBoxes()');
    // The pill on the left opens to stacks of segments: which lecture and segment you are in.
    expect(html).toContain('id="map-pill"');
    expect(html).toContain('data-seg-toggle=');
    expect(html).toContain(`Part \${i + 1} of \${num.length}`);
    // One ochre colour on every box, with the part in words.
    expect(html).toContain('const SEG_HUE = 95;');
    // Slides come from the user's private files, never from this public page.
    expect(html).toContain(
      "const DECK_FILES = ['Stats1.pdf', 'Stats2.pdf', 'Stats3.pdf', 'Stats4.pdf'];",
    );
    // Nothing of the SQL course is carried over.
    expect(html).not.toContain('sql|');
    expect(html).not.toContain('Business case');
  });
});
