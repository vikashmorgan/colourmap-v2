// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PIECES, SAVED_LIGHT_KEY } from '@/lib/art/light';

import LightBodies from './LightBodies';

describe('LightBodies', () => {
  beforeEach(() => {
    // No WebGL in jsdom: every piece shows its fallback.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows every piece, in a row per kind', () => {
    render(<LightBodies />);
    expect(screen.getByRole('heading', { name: 'Light Bodies' })).toBeTruthy();
    for (const name of ['Eclipse', 'Enlightenment', 'Light Bubble']) {
      expect(screen.getByRole('region', { name })).toBeTruthy();
    }
    for (const p of PIECES) {
      expect(screen.getByRole('button', { name: `Open ${p.title}` })).toBeTruthy();
    }
    expect(screen.getAllByText('This piece needs WebGL.').length).toBe(PIECES.length);
  });

  it('opens a piece with its own kind of sliders, and Esc closes it', () => {
    render(<LightBodies />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Burning Ring' }));
    expect(screen.getByRole('dialog', { name: 'Burning Ring' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Ring' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Embers' })).toBeTruthy();
    expect(screen.queryByRole('slider', { name: 'Pose' })).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('names the pose as it is moved', () => {
    render(<LightBodies />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Enlightenment' }));
    expect(screen.getByText('Meditating')).toBeTruthy();
    fireEvent.change(screen.getByRole('slider', { name: 'Pose' }), { target: { value: '2' } });
    expect(screen.getByText('Dancing')).toBeTruthy();
  });

  it('saves a tuning, reopens it from My light, and deletes it', () => {
    render(<LightBodies />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Night Bubble' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pearl palette' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Drops' }), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    expect(screen.getByRole('button', { name: 'Saved · Night Bubble 1' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: 'Open Night Bubble 1' }));
    expect((screen.getByRole('slider', { name: 'Drops' }) as HTMLInputElement).value).toBe('6');
    expect(screen.getByRole('button', { name: 'Pearl palette' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect((screen.getByRole('slider', { name: 'Drops' }) as HTMLInputElement).value).toBe('6');
    fireEvent.keyDown(window, { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: 'Delete Night Bubble 1' }));
    expect(screen.queryByRole('region', { name: 'My light' })).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(SAVED_LIGHT_KEY) ?? '[]')).toEqual([]);
  });
});
