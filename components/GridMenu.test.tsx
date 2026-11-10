// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { MENU_MODE_KEY } from '@/lib/grid';

import GridMenu from './GridMenu';

describe('GridMenu', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    push.mockClear();
  });

  it('opens from the header button as a wheel of the eight hubs, once the wheel is chosen', () => {
    window.localStorage.setItem(MENU_MODE_KEY, 'wheel');
    render(<GridMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open the network menu/i }));
    expect(screen.getByRole('dialog', { name: 'Network menu' })).toBeTruthy();
    // A brain: three hubs a side. Engine room and Play stay out of the wheel for now.
    for (const hub of ['You', 'Sound', 'Mind', 'Learn', 'Body', 'Art']) {
      expect(screen.getByRole('button', { name: `${hub} hub` })).toBeTruthy();
    }
    for (const hub of ['Engine room', 'Play']) {
      expect(screen.queryByRole('button', { name: `${hub} hub` })).toBeNull();
    }
    expect(screen.getByText('LEFT BRAIN')).toBeTruthy();
    expect(screen.getByText('RIGHT BRAIN')).toBeTruthy();
    expect(screen.getByRole('link', { name: /grid/i }).getAttribute('href')).toBe('/grid');
  });

  it('opens with the G key, but not while typing', () => {
    render(
      <>
        <input aria-label="note" />
        <GridMenu />
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'note' });
    input.focus();
    fireEvent.keyDown(window, { key: 'g' });
    expect(screen.queryByRole('dialog')).toBeNull();
    input.blur();
    fireEvent.keyDown(window, { key: 'g' });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('goes into a hub, opens a page, and closes', () => {
    window.localStorage.setItem(MENU_MODE_KEY, 'wheel');
    render(<GridMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open the network menu/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Mind hub' }));
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(push).toHaveBeenCalledWith('/notebook');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('moves round the wheel with arrows, Enter goes in, Esc comes back then closes', () => {
    window.localStorage.setItem(MENU_MODE_KEY, 'wheel');
    render(<GridMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open the network menu/i }));
    const dialog = screen.getByRole('dialog');
    // Clockwise from the top: You first, down the right brain, then up the left to Sound last.
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sound hub' }));
    fireEvent.click(document.activeElement as HTMLElement);
    expect(screen.getByRole('button', { name: 'Music' })).toBeTruthy();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sound hub' }));
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'You hub' }));
    // In the wheel, Mind keeps its notes only: AI, Sparks and Circles stay in the other looks.
    fireEvent.click(screen.getByRole('button', { name: 'Mind hub' }));
    expect(screen.getByRole('button', { name: 'Notes' })).toBeTruthy();
    for (const page of ['AI', 'Sparks', 'Circles'])
      expect(screen.queryByRole('button', { name: page })).toBeNull();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('switches to the terminal and remembers it', () => {
    render(<GridMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open the network menu/i }));
    fireEvent.click(screen.getByRole('button', { name: 'TERMINAL' }));
    expect(window.localStorage.getItem(MENU_MODE_KEY)).toBe('terminal');
    expect(screen.getByText(/LINK ESTABLISHED/)).toBeTruthy();
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Notes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(push).toHaveBeenCalledWith('/notebook');
  });

  it('opens on the life tree: three trees and you at the root', () => {
    render(<GridMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open the network menu/i }));
    expect(screen.getByRole('button', { name: 'TREE', pressed: true })).toBeTruthy();
    for (const name of ['Art', 'Admin', 'Energy', 'You']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  it('goes up a tree to an area and a page, and steps back out with Esc', () => {
    render(<GridMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open the network menu/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Admin' }));
    // An area with nothing built yet is shown, goes nowhere, and offers a spark instead.
    fireEvent.click(screen.getByRole('button', { name: 'Money' }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByText(/Money: nothing built here yet/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'PLANT A SPARK FOR IT' })).toBeTruthy();
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Art' }));
    fireEvent.click(screen.getByRole('button', { name: 'Music' }));
    expect(screen.getByRole('button', { name: 'Sounds' })).toBeTruthy();
    // The path line says where you stand, down to the page chosen.
    expect(screen.getByText(/^ART\s+›\s+MUSIC\s+›\s+/)).toBeTruthy();
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens a page about you from the root', () => {
    render(<GridMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open the network menu/i }));
    fireEvent.click(screen.getByRole('button', { name: 'You' }));
    fireEvent.click(screen.getByRole('button', { name: 'Focus' }));
    expect(push).toHaveBeenCalledWith('/day');
  });

  it('switches to design II, the 3D tree, after the stars come apart, and remembers it', () => {
    vi.useFakeTimers();
    try {
      render(<GridMenu />);
      fireEvent.click(screen.getByRole('button', { name: /open the network menu/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Design two' }));
      expect(window.localStorage.getItem('cb-life-tree-design-4')).toBe('2');
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole('button', { name: 'Design two', pressed: true })).toBeTruthy();
      // One view of a branch: every page of Art, from Visual and Music alike.
      fireEvent.click(screen.getByRole('button', { name: 'Art' }));
      expect(screen.getByRole('button', { name: 'Butterflies' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Chill Machine' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Butterflies' }));
      expect(push).toHaveBeenCalledWith('/art/butterflies');
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers four tree designs, and brings back an old willow or banyan as III or IV', () => {
    window.localStorage.setItem('cb-life-tree-design', '3');
    render(<GridMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open the network menu/i }));
    for (const n of ['one', 'two', 'three', 'four'])
      expect(screen.getByRole('button', { name: `Design ${n}` })).toBeTruthy();
    // The old III was the banyan, which is now IV.
    expect(screen.getByRole('button', { name: 'Design four', pressed: true })).toBeTruthy();
  });

  it('finds a page by typing, in design II', () => {
    window.localStorage.setItem('cb-life-tree-design-4', '2');
    render(<GridMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open the network menu/i }));
    for (const key of ['p', 'r', 'o'])
      fireEvent.keyDown(document.activeElement as HTMLElement, { key });
    fireEvent.click(screen.getByRole('button', { name: 'Programs' }));
    expect(push).toHaveBeenCalledWith('/programs');
  });

  it('keeps the wheel as it was as design II of the wheel', () => {
    window.localStorage.setItem(MENU_MODE_KEY, 'wheel');
    render(<GridMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open the network menu/i }));
    expect(screen.getByRole('button', { name: 'Design one', pressed: true })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Design two' }));
    expect(window.localStorage.getItem('cb-wheel-design')).toBe('2');
    expect(screen.getByRole('button', { name: 'Design two', pressed: true })).toBeTruthy();
    expect(screen.getByRole('link', { name: /grid/i }).getAttribute('href')).toBe('/grid');
    fireEvent.click(screen.getByRole('button', { name: 'Mind hub' }));
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(push).toHaveBeenCalledWith('/notebook');
  });

  it('plants a private spark for an empty area when asked, and says so', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    try {
      render(<GridMenu />);
      fireEvent.click(screen.getByRole('button', { name: /open the network menu/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Admin' }));
      fireEvent.click(screen.getByRole('button', { name: 'Papers' }));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'PLANT A SPARK FOR IT' }));
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/sparks');
      expect(JSON.parse(init.body as string)).toMatchObject({
        isOpen: false,
        timeWindow: 'no_rush',
      });
      expect(screen.getByText('A spark for Papers is planted, in Sparks')).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
