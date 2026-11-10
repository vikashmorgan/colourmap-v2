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

  it('serves the five lectures to a signed-in user, uncached', async () => {
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
    // Answers can be highlighted, kept by the note's id.
    expect(html).toContain('data-hl="stats|ans|${esc(n.id)}"');
    // A card's drawing sits under its formula, before the steps that point to it.
    expect(html).toContain("${x.html ? x.html() : ''}\n    ${r ? readsHtml(r) : ''}");
    expect(html).toContain(
      "const HL_COLOURS = [['yellow', '#f2c14e'], ['lime', '#b0c06e'], ['green', '#6fbf8e'], ['orange', '#f08a3c'], ['pink', '#e48fb4'], ['blue', '#7aa6e6']];",
    );
    // Where you are in the deck: slide n of the lecture's length.
    expect(html).toContain('{ n: 2, pages: 40, ');
    expect(html).toContain("const slide = card?.slide ? ` · Slide ${card.slide}/${s.pages}` : '';");
    // Practice: named numbers, the drawing, the rules used, and notes on each exercise.
    expect(html).toContain('const PRACTICE_PICS = {');
    expect(html).toContain('const PRACTICE_LAWS = {');
    expect(html).toContain('P(fake ∩ flag) = P(fake) × P(flag ∣ fake) = 0.05 × 0.8 = 0.04');
    expect(html).toContain('key: cardKey(s.n, `ex-${x.id}`), tag: `Ex ${i + 1}`');
    // Focus: a third dot, where my focus and my body are, kept as stats|focus notes.
    expect(html).toContain('id="fc-dot"');
    expect(html).toContain("const FOCUS_KEY = 'stats|focus';");
    // How clear each card is: a bar on the card, a coloured number in the map.
    expect(html).toContain('article.card[data-mark="got"]::after { background: var(--got); }');
    expect(html).toContain('paintBars(); renderMap();');
    // Reflections go to Dreams in Action, and a failed save keeps the words.
    expect(html).toContain('id="rf-dot"');
    expect(html).toContain("const RF_PREFIX = 'dreams|';");
    expect(html).toContain('Not saved. Your words are still here.');
    for (const n of [1, 2, 3, 4, 5]) expect(html).toContain(`{ n: ${n}, pages: `);
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
      "const DECK_FILES = ['Stats1.pdf', 'Stats2.pdf', 'Stats3.pdf', 'Stats4.pdf', 'Stats5.pdf'];",
    );
    // Nothing of the SQL course is carried over.
    expect(html).not.toContain('sql|');
    expect(html).not.toContain('Business case');
  });

  it('carries Lecture 5: two variables, correlation and maximum likelihood', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const html = await (await GET(request())).text();

    expect(html).toContain("{ n: 5, pages: 34, short: 'Correlation, likelihood'");
    // Dots for correlation, with r worked out from the dots drawn.
    expect(html).toContain('function scatter(groups');
    expect(html).toContain('rOf(deviations)');
    // Every formula explained piece by piece, the cheat sheet, practice and summary.
    expect(html).toContain("'5|likelihood': { parts:");
    expect(html).toContain("{ name: 'Maximum likelihood', items: [");
    expect(html).toContain("'l5-e6': [");
    expect(html).toContain('  5: [\n');
    expect(html).toContain("'Cov(': 'Cov(X, Y)'");
  });

  it('carries the Lecture 3 notes of 2026-11-08', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const html = await (await GET(request())).text();

    // Questions and comments fold under each box, closed unless an answer is new.
    expect(html).toContain('function notesFold(key, list)');
    // An edit the account refuses says so instead of vanishing on the next load.
    expect(html).toContain('Could not save the change to your account');
    // Yellow and green mixed sits between the two.
    expect(html).toContain("['yellow', '#f2c14e'], ['lime', '#b0c06e'], ['green', '#6fbf8e']");
    // The session clock: green to yellow to 45 minutes, orange to 60, red to 70.
    expect(html).toContain(
      "const TM_KEY = 'stats-timer', TM_IDLE = 3 * 60e3, TM_GAP = 30 * 60e3, TM_FULL = 70;",
    );
    // The case pad on the left, and a peek placed at the word.
    expect(html).toContain('id="case-pad"');
    expect(html).toContain('function caseOf(key)');
    expect(html).toContain('function placePeeks()');
    // New boxes: binomial or Poisson, the four properties, and Romeo and Juliet's square.
    expect(html).toContain("id: 'bin-or-pois'");
    expect(html).toContain("id: 'props'");
    expect(html).toContain('function romeoSquare()');
    expect(html).toContain('about 1 hour in 55 has no ticket at all');
  });
});
