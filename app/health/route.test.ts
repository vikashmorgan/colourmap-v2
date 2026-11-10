import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { GET } from './route';

const request = () => new Request('http://localhost/health');

describe('/health page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a logged-out visitor to sign in and back to /health', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login?next=%2Fhealth');
  });

  it('serves the health page to a signed-in user, uncached', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const response = await GET(request());
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(html).toContain('<title>Health</title>');
    // On this origin the page syncs through this app's API.
    expect(html).toContain("const LOG_URL = '/api/health/log';");
    expect(html).toContain("const NOTES_URL = '/api/health/notes';");
  });
});

/*
 * The page itself, run in jsdom off the Colour Brain origin (so it keeps everything in this
 * browser): every exercise has its stick figure, and Favourites add, reorder and drop.
 */
describe('/health page content', () => {
  const PAGE = path.join(process.cwd(), 'content', 'health', 'index.html');
  let html = '';
  const favRows = () =>
    [...document.querySelectorAll<HTMLElement>('#favs .fav-row')].map((r) => r.dataset.id);
  const storedFav = () => JSON.parse(localStorage.getItem('health-prefs') ?? '{}').fav;
  const click = (selector: string) => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`missing ${selector}`);
    el.click();
  };

  beforeAll(async () => {
    html = await readFile(PAGE, 'utf8');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    document.head.innerHTML = doc.head.innerHTML;
    document.body.innerHTML = doc.body.innerHTML;
    // A favourite the library no longer has, saved before: it must be dropped.
    localStorage.setItem('health-prefs', JSON.stringify({ fav: 'no-such-exercise,clamshell' }));
    const script = doc.querySelector('body script')?.textContent ?? '';
    new Function(script)();
  });

  it('draws a stick figure for every exercise in the library', () => {
    const ids = [...html.matchAll(/\{ id: '([a-z-]+)', name: /g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(40);
    const cards = [...document.querySelectorAll<HTMLElement>('#library .ex')];
    expect(cards.map((c) => c.dataset.ex).sort()).toEqual([...ids].sort());
    for (const card of cards) {
      const fig = card.querySelector('.ex-body > svg.fig');
      expect(fig, card.dataset.ex).not.toBeNull();
      expect(fig?.getAttribute('role')).toBe('img');
      expect(fig?.getAttribute('aria-label')?.length).toBeGreaterThan(20);
      expect(fig?.innerHTML).not.toMatch(/NaN|undefined/);
      // Above "how to do it".
      expect(fig?.nextElementSibling?.textContent).toMatch(/^How/);
    }
    // Every id fits in the one favourites pref.
    expect(ids.join(',').length).toBeLessThanOrEqual(2000);
  });

  it('drops unknown favourites on load', () => {
    expect(favRows()).toEqual(['clamshell']);
    expect(storedFav()).toBe('clamshell');
    expect(document.querySelector('#favs .fav-row svg.fig')).not.toBeNull();
  });

  it('adds, reorders and removes favourites, kept as one ordered pref', () => {
    click('#library [data-fav="wall-slide"]');
    expect(favRows()).toEqual(['clamshell', 'wall-slide']);
    expect(storedFav()).toBe('clamshell,wall-slide');
    expect(
      document.querySelector('#library [data-fav="wall-slide"]')?.getAttribute('aria-pressed'),
    ).toBe('true');

    click('#favs .fav-row[data-id="wall-slide"] [data-fmove="up"]');
    expect(favRows()).toEqual(['wall-slide', 'clamshell']);
    expect(storedFav()).toBe('wall-slide,clamshell');

    click('#favs .fav-row[data-id="wall-slide"] [data-fav]');
    click('#favs .fav-row[data-id="clamshell"] [data-fav]');
    expect(favRows()).toEqual([]);
    expect(storedFav()).toBeUndefined();
    expect(document.querySelector('#favs .fav-empty')?.textContent).toContain('☆');
    expect(
      document.querySelector('#library [data-fav="clamshell"]')?.getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('opens on the Basic view: figures, a small tab per category, Full list on a key', () => {
    const page = document.getElementById('page-exercises') as HTMLElement;
    const tabs = () =>
      [...document.querySelectorAll<HTMLElement>('#cat-tabs .cat-tab')].map((t) => t.dataset.cat);
    expect(page.classList.contains('basic')).toBe(true);
    // No favourites left, so no Favourites tab: the sections, then Good to know.
    expect(tabs()).toEqual(['knee', 'shoulder', 'release', 'feet', 'flow', 'school', 'know']);
    // Each exercise shows its figure in the tile, and only the chosen category is shown.
    for (const card of document.querySelectorAll('#library .ex')) {
      expect(card.querySelector('summary > svg.tile-fig')).not.toBeNull();
    }
    const shown = () =>
      [...document.querySelectorAll<HTMLElement>('#library .sec.on')].map((s) => s.dataset.sec);
    expect(shown()).toEqual(['knee']);
    click('#cat-tabs [data-cat="feet"]');
    expect(shown()).toEqual(['feet']);
    expect((document.getElementById('sec-feet') as HTMLDetailsElement).open).toBe(true);
    expect(localStorage.getItem('health-cat')).toBe('feet');

    // A favourite brings its tab, first.
    click('#library [data-fav="clamshell"]');
    expect(tabs()[0]).toBe('favs');

    click('#view-btn');
    expect(page.classList.contains('basic')).toBe(false);
    expect(shown()).toEqual([]);
    expect(localStorage.getItem('health-ex-view')).toBe('full');
    click('#view-btn');
    expect(page.classList.contains('basic')).toBe(true);
  });
});
