import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ZoneTitle, { SHOW_MS } from './ZoneTitle';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const fade = () =>
  act(() => {
    vi.advanceTimersByTime(SHOW_MS + 10);
  });

describe('ZoneTitle (Undertown, 2026-11-23)', () => {
  it('shows nothing until you ride into a named place', () => {
    render(<ZoneTitle zone={null} />);
    expect(screen.queryByTestId('zone-title')).toBeNull();
  });

  it('names Undertown as you go under, then fades away and stays gone while you are there', () => {
    const { rerender } = render(<ZoneTitle zone={null} />);
    rerender(<ZoneTitle zone="undertown" />);
    const card = screen.getByTestId('zone-title');
    expect(card.textContent).toContain('Undertown');
    expect(card.textContent).toContain('下町');
    fade();
    expect(screen.queryByTestId('zone-title')).toBeNull();
    rerender(<ZoneTitle zone="undertown" />);
    expect(screen.queryByTestId('zone-title')).toBeNull();
  });

  it('names it again the next time you go under', () => {
    const { rerender } = render(<ZoneTitle zone="undertown" />);
    fade();
    rerender(<ZoneTitle zone={null} />);
    rerender(<ZoneTitle zone="undertown" />);
    expect(screen.getByTestId('zone-title')).toBeTruthy();
  });

  it('names the lake, then Water City the moment it is found (2026-11-25)', () => {
    const { rerender } = render(<ZoneTitle zone={null} />);
    rerender(<ZoneTitle zone="lake" />);
    expect(screen.getByTestId('zone-title').textContent).toContain('The Lake');
    fade();
    rerender(<ZoneTitle zone="water-city" />);
    expect(screen.getByTestId('zone-title').textContent).toContain('Water City');
  });
});
