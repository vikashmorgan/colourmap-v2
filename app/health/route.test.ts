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
});
