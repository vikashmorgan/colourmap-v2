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
    // The lessons' charts: one per card whose idea is a shape.
    expect(html).toContain('const VIZ = {');
    // The story: each session as one read, with its charts.
    expect(html).toContain('const STORY = {');
    expect(html).toContain('class="story-eye">Start here');
    // The story and the exercise at a glance take the highlighter.
    expect(html).toContain('data-hl="glance-pattern"');
    // Exercise cards: reading the result and the watch-out are closed pills too.
    expect(html).toContain('<summary>How to read your result</summary>');
    // The lines you write, in orange, and the twins card.
    expect(html).toContain('const EX_MINE = {');
    // The exercise at a glance: what they ask, what you fill, what to remember.
    expect(html).toContain('const GLANCE = {');
    // Exercise tasks: the gaps first, then the answer and its result as closed pills.
    expect(html).toContain('const EX_RUN = {');
    // The lecture notebooks' graphs, on their cards.
    expect(html).toContain('const LEC_FIGS = {');
    expect(html).toContain('<summary>In the notebook</summary>');
    expect(html).toContain('<summary>My answer</summary>');
    expect(html).toContain('<summary>The exercise at a glance</summary>');
    expect(html).toContain("id: 'twins'");
    expect(html).toContain('<span class="story-title">The story: the session as one read</span>');
    // Start or pause the Timer, today's sessions as a graph, and the formula blocks as closed pills.
    expect(html).toContain('class="tc-play"');
    expect(html).toContain('function tmDayGraph(day)');
    // Finish session: closes the session; the next Start opens a new one.
    expect(html).toContain('class="tc-finish">■ Finish session');
    expect(html).toContain(
      '<details class="pill-fold reads"><summary>What each piece means</summary>',
    );
    expect(html).toContain("'4|roc': () => plot(");
    expect(html).toContain('llms|');
    expect(html).not.toMatch(/pandas\|/);
  });
});
