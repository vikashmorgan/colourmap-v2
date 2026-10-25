// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PIECES } from '@/lib/art/butterflies';

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
