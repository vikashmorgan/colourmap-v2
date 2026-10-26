// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

  it('opens from the header button as a wheel of the eight hubs', () => {
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
    render(<GridMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open the network menu/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Mind hub' }));
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(push).toHaveBeenCalledWith('/notebook');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('moves round the wheel with arrows, Enter goes in, Esc comes back then closes', () => {
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
});
