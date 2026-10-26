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
    expect(screen.getByRole('slider', { name: 'Embers' })).toBeTruthy();
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
    const glitch = screen.getByRole('slider', { name: 'Embers' }) as HTMLInputElement;
    fireEvent.change(glitch, { target: { value: '0.2' } });
    expect(glitch.value).toBe('0.2');
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(
      screen.getByRole('button', { name: 'Eclipse palette' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect((screen.getByRole('slider', { name: 'Embers' }) as HTMLInputElement).value).toBe('0.7');
  });

  it('hides and shows the controls', () => {
    render(<LiquidButterflies />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Neon Psyche' }));
    fireEvent.click(screen.getByRole('button', { name: 'Controls' }));
    expect(screen.queryByRole('region', { name: 'Controls' })).toBeNull();
  });
});

describe('designs and background', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the butterflies and the Liquid Forms in their own rows', () => {
    render(<LiquidButterflies />);
    expect(screen.getByRole('region', { name: 'Butterflies' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Liquid Forms' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Enlightenment' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Mountains' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open Thangka' })).toBeTruthy();
  });

  it('turns a butterfly into a flower, with petals only then', () => {
    render(<LiquidButterflies />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Thermal Monarch' }));
    expect(screen.getByRole('button', { name: 'Butterfly' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.queryByRole('slider', { name: 'Petals' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Flower' }));
    expect(screen.getByRole('button', { name: 'Flower' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('slider', { name: 'Petals' })).toBeTruthy();
  });

  it('picks a background on the wheel, saves it with the preset, and goes back to the palette', () => {
    render(<LiquidButterflies />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Thermal Monarch' }));
    expect(screen.queryByRole('slider', { name: 'Background top colour' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Background top colour' }));
    const wheel = screen.getByRole('slider', { name: 'Background top colour' });
    fireEvent.keyDown(wheel, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: "Palette's own" })).toBeTruthy();
    const picked = wheel.getAttribute('aria-valuetext');
    expect(picked).not.toBe('#f4b26a');
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    const stored = JSON.parse(window.localStorage.getItem(SAVED_BUTTERFLIES_KEY) ?? '[]');
    expect(stored[0].bg[0]).toBe(picked);
    expect(stored[0].bg[1]).toBe('#9c2f45');
    fireEvent.click(screen.getByRole('button', { name: "Palette's own" }));
    expect(screen.queryByRole('button', { name: "Palette's own" })).toBeNull();
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
    fireEvent.change(screen.getByRole('slider', { name: 'Embers' }), { target: { value: '0.3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    expect(screen.getByRole('button', { name: 'Saved · Eclipse 1' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.getByRole('region', { name: 'My butterflies' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open Eclipse 1' }));
    expect(screen.getByRole('dialog', { name: 'Eclipse 1' })).toBeTruthy();
    expect((screen.getByRole('slider', { name: 'Embers' }) as HTMLInputElement).value).toBe('0.3');
    expect(screen.getByRole('button', { name: 'Gold palette' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.keyDown(window, { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: 'Delete Eclipse 1' }));
    expect(screen.queryByRole('region', { name: 'My butterflies' })).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(SAVED_BUTTERFLIES_KEY) ?? '[]')).toEqual([]);
  });
});
