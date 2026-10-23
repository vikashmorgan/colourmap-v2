// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ArtIdeas, { type ArtEntry, htmlToText, isIdea, textToHtml, themeOf } from './ArtIdeas';

const THEME = '11111111-2222-4333-8444-555555555555';
const IDEA = '66666666-7777-4888-9999-aaaaaaaaaaaa';

const entries: ArtEntry[] = [
  {
    id: THEME,
    category: 'art_ideas',
    title: 'Theme 3 · Breaking through',
    content: '<div>A million tiny steps</div><div><br></div><div>and one wild moment</div>',
    tags: ['from-agent'],
    createdAt: '2026-10-07T10:00:00Z',
  },
  {
    id: IDEA,
    category: 'art_ideas',
    title: 'Cracked bronze egg',
    content: null,
    tags: ['idea', `theme:${THEME}`],
    createdAt: '2026-10-07T11:00:00Z',
  },
];

describe('Art ideas helpers', () => {
  it('tells ideas from themes and finds the theme of an idea', () => {
    expect(isIdea(entries[0])).toBe(false);
    expect(isIdea(entries[1])).toBe(true);
    expect(themeOf(entries[1])).toBe(THEME);
    expect(themeOf(entries[0])).toBe(null);
  });

  it('reads stored <div> lines as text and writes text back as lines', () => {
    expect(htmlToText(entries[0].content)).toBe('A million tiny steps\n\nand one wild moment');
    expect(textToHtml('a <b>\n\nc')).toBe('<div>a &lt;b&gt;</div><div><br></div><div>c</div>');
    expect(htmlToText(textToHtml('x & y'))).toBe('x & y');
  });
});

describe('ArtIdeas', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).startsWith('/api/art/gallery/')) {
        return {
          ok: true,
          json: async () => ({ images: [{ name: '1-egg.jpg', url: 'https://signed/egg' }] }),
        };
      }
      if (url === '/api/notebook' && init?.method === 'POST') {
        return { ok: true, json: async () => ({ id: 'new-id' }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows each theme with its text and the ideas under it', () => {
    render(<ArtIdeas entries={entries} onChanged={() => {}} color="#B05A8A" />);
    expect(screen.getByRole('heading', { name: 'Breaking through' })).toBeTruthy();
    expect(screen.getByText(/A million tiny steps/)).toBeTruthy();
    expect(screen.getByText('Cracked bronze egg')).toBeTruthy();
    expect(screen.getByText('1 idea')).toBeTruthy();
  });

  it('adds an idea under its theme, tagged so it stays there', async () => {
    const onChanged = vi.fn();
    render(<ArtIdeas entries={entries} onChanged={onChanged} color="#B05A8A" />);
    const input = screen.getByLabelText('An idea for a piece, from this theme…');
    fireEvent.change(input, { target: { value: 'Thunder in glass' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls.find(
      ([u, i]) => u === '/api/notebook' && i?.method === 'POST',
    ) as [string, { body: string }];
    expect(JSON.parse(init.body)).toEqual({
      category: 'art_ideas',
      title: 'Thunder in glass',
      content: '',
      tags: ['idea', `theme:${THEME}`],
    });
  });

  it('adds a theme', async () => {
    const onChanged = vi.fn();
    render(<ArtIdeas entries={entries} onChanged={onChanged} color="#B05A8A" />);
    const input = screen.getByLabelText('A new theme you are reflecting on…');
    fireEvent.change(input, { target: { value: 'Man vs robot' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls.find(
      ([u, i]) => u === '/api/notebook' && i?.method === 'POST',
    ) as [string, { body: string }];
    expect(JSON.parse(init.body).tags).toEqual(['theme']);
  });

  it('opens an idea to show its gallery from private storage', async () => {
    render(<ArtIdeas entries={entries} onChanged={() => {}} color="#B05A8A" />);
    fireEvent.click(screen.getByText('Cracked bronze egg'));
    await waitFor(() => expect(screen.getByText('Gallery · 1')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith(`/api/art/gallery/${IDEA}`);
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://signed/egg');
  });
});
