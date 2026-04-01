// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CheckInHistory from './CheckInHistory';

const fakeEntries = [
  { id: '1', sliderValue: 10, note: 'rough day', createdAt: '2026-03-30T08:00:00Z' },
  { id: '2', sliderValue: 50, note: null, createdAt: '2026-03-30T12:00:00Z' },
  { id: '3', sliderValue: 80, note: 'feeling great', createdAt: '2026-03-30T18:00:00Z' },
];

describe('CheckInHistory', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fakeEntries),
        }),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders dots for each check-in', async () => {
    render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      const dots = screen.getAllByRole('button');
      expect(dots).toHaveLength(3);
    });
  });

  it('shows loading skeleton initially', () => {
    render(<CheckInHistory refreshKey={0} />);

    expect(screen.getByRole('status', { name: 'Loading history' })).toBeDefined();
  });

  it('hides when there are no check-ins', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        }),
      ),
    );

    const { container } = render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(container.querySelector('[aria-label="Loading history"]')).toBeNull();
    });

    expect(container.children).toHaveLength(0);
  });

  it('shows tooltip with word and note when dot is clicked', async () => {
    const user = userEvent.setup();
    render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    // Dots are rendered chronologically (oldest left, newest right)
    // fakeEntries[2] (sliderValue: 80, "Alive") is newest → rightmost dot
    const aliveDot = screen.getByLabelText('Check-in: Alive');
    await user.click(aliveDot);

    expect(screen.getByText('Alive')).toBeDefined();
    expect(screen.getByText('feeling great')).toBeDefined();
  });

  it('closes tooltip when clicking the same dot again', async () => {
    const user = userEvent.setup();
    render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    const aliveDot = screen.getByLabelText('Check-in: Alive');
    await user.click(aliveDot);
    expect(screen.getByText('Alive')).toBeDefined();

    await user.click(aliveDot);
    expect(screen.queryByText('Alive')).toBeNull();
  });

  it('truncates long notes to 100 characters', async () => {
    const longNote = 'a'.repeat(150);
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: '1', sliderValue: 50, note: longNote, createdAt: '2026-03-30T12:00:00Z' },
            ]),
        }),
      ),
    );

    const user = userEvent.setup();
    render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    await user.click(screen.getByRole('button'));

    const noteEl = screen.getByText(`${'a'.repeat(100)}…`);
    expect(noteEl).toBeDefined();
  });

  it('refetches when refreshKey changes', async () => {
    const { rerender } = render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    rerender(<CheckInHistory refreshKey={1} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});
