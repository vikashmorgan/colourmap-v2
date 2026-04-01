// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReflectionMoment from './ReflectionMoment';

describe('ReflectionMoment', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders the emotional word and breath prompt', () => {
    render(<ReflectionMoment word="Steady" onDismiss={vi.fn()} />);

    expect(screen.getByText('Steady')).toBeDefined();
    expect(screen.getByText('Take one breath.')).toBeDefined();
  });

  it('has an accessible status role with aria-label', () => {
    render(<ReflectionMoment word="Open" onDismiss={vi.fn()} />);

    const el = screen.getByRole('status');
    expect(el.getAttribute('aria-label')).toBe("You're feeling Open. Take one breath.");
  });

  it('auto-dismisses after 6 seconds', () => {
    const onDismiss = vi.fn();
    render(<ReflectionMoment word="Alive" onDismiss={onDismiss} />);

    act(() => vi.advanceTimersByTime(6000));
    act(() => vi.advanceTimersByTime(400));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses on click before auto-dismiss', () => {
    const onDismiss = vi.fn();
    render(<ReflectionMoment word="Still" onDismiss={onDismiss} />);

    act(() => vi.advanceTimersByTime(16));
    screen.getByRole('status').click();
    act(() => vi.advanceTimersByTime(400));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses on Enter key', async () => {
    const onDismiss = vi.fn();
    render(<ReflectionMoment word="Heavy" onDismiss={onDismiss} />);

    const el = screen.getByRole('status');
    el.focus();
    await act(async () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    act(() => vi.advanceTimersByTime(400));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
