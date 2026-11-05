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
    // One pair of colours; a tab on the left of the boxes marks the segment.
    expect(html).toContain('const segHue = i => i % 2 ? 300 : 250;');
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
    expect(html).toContain(`Segment \${i + 1} of \${num.length}`);
    // Slides come from the user's private files, never from this public page.
    expect(html).toContain(
      "const DECK_FILES = ['Stats1.pdf', 'Stats2.pdf', 'Stats3.pdf', 'Stats4.pdf'];",
    );
    // Nothing of the SQL course is carried over.
    expect(html).not.toContain('sql|');
    expect(html).not.toContain('Business case');
  });
});
