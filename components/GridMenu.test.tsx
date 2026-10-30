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
    for (const hub of ['You', 'Sound', 'Mind', 'Learn', 'Engine room', 'Play', 'Body', 'Art']) {
      expect(screen.getByRole('button', { name: `${hub} hub` })).toBeTruthy();
    }
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
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sound hub' }));
    fireEvent.click(document.activeElement as HTMLElement);
    expect(screen.getByRole('button', { name: 'Music' })).toBeTruthy();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Sound hub' })).toBeTruthy();
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
    // An area with nothing built yet is shown, but goes nowhere.
    const money = screen.getByRole('button', { name: 'Money' });
    expect(money.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(money);
    expect(push).not.toHaveBeenCalled();
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Art' }));
    fireEvent.click(screen.getByRole('button', { name: 'Music' }));
    expect(screen.getByRole('button', { name: 'Sounds' })).toBeTruthy();
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

  it('switches to design II with the design tab, after the stars come apart, and remembers it', () => {
    vi.useFakeTimers();
    try {
      render(<GridMenu />);
      fireEvent.click(screen.getByRole('button', { name: /open the network menu/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Design two' }));
      expect(window.localStorage.getItem('cb-life-tree-design')).toBe('2');
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

  it('finds a page by typing, in design II', () => {
    window.localStorage.setItem('cb-life-tree-design', '2');
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
});
