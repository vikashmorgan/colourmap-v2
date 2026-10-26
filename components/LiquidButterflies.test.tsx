// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PIECES, SAVED_BUTTERFLIES_KEY } from '@/lib/art/butterflies';

import LiquidButterflies from './LiquidButterflies';

describe('LiquidButterflies', () => {
  beforeEach(() => {
    // No WebGL in jsdom: every piece shows its fallback.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows every piece in the collection', () => {
    render(<LiquidButterflies />);
    expect(screen.getByRole('heading', { name: 'Liquid Butterflies' })).toBeTruthy();
    for (const p of PIECES) {
      expect(screen.getByRole('button', { name: `Open ${p.title}` })).toBeTruthy();
    }
  });

  it('says so when WebGL is missing', () => {
    render(<LiquidButterflies />);
    expect(screen.getAllByText('This piece needs WebGL.').length).toBe(PIECES.length);
  });

  it('opens a piece full screen with its controls, and Esc closes it', () => {
    render(<LiquidButterflies />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Eclipse' }));
    const dialog = screen.getByRole('dialog', { name: 'Eclipse' });
    expect(dialog).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Glitch' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Eclipse palette' }).getAttribute('aria-pressed'),
    ).toBe('true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('changes the palette and resets to the piece', () => {
    render(<LiquidButterflies />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Eclipse' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gold palette' }));
    expect(screen.getByRole('button', { name: 'Gold palette' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    const glitch = screen.getByRole('slider', { name: 'Glitch' }) as HTMLInputElement;
    fireEvent.change(glitch, { target: { value: '0.2' } });
    expect(glitch.value).toBe('0.2');
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(
      screen.getByRole('button', { name: 'Eclipse palette' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect((screen.getByRole('slider', { name: 'Glitch' }) as HTMLInputElement).value).toBe('0.8');
  });

  it('hides and shows the controls', () => {
    render(<LiquidButterflies />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Neon Psyche' }));
    fireEvent.click(screen.getByRole('button', { name: 'Controls' }));
    expect(screen.queryByRole('region', { name: 'Controls' })).toBeNull();
  });
});

describe('saved butterflies', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('saves a tuning from the viewer, shows it under My butterflies, reopens it, and deletes it', () => {
    render(<LiquidButterflies />);
    expect(screen.queryByRole('region', { name: 'My butterflies' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open Eclipse' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gold palette' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Glitch' }), { target: { value: '0.3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    expect(screen.getByRole('button', { name: 'Saved · Eclipse 1' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.getByRole('region', { name: 'My butterflies' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open Eclipse 1' }));
    expect(screen.getByRole('dialog', { name: 'Eclipse 1' })).toBeTruthy();
    expect((screen.getByRole('slider', { name: 'Glitch' }) as HTMLInputElement).value).toBe('0.3');
    expect(screen.getByRole('button', { name: 'Gold palette' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.keyDown(window, { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: 'Delete Eclipse 1' }));
    expect(screen.queryByRole('region', { name: 'My butterflies' })).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(SAVED_BUTTERFLIES_KEY) ?? '[]')).toEqual([]);
  });
});
