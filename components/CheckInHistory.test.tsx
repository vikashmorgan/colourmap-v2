// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CheckInHistory from './CheckInHistory';

const now = new Date('2026-03-31T14:00:00Z');

const fakeEntries = [
  {
    id: '3',
    sliderValue: 80,
    note: 'feeling great',
    tags: ['Work'],
    createdAt: '2026-03-31T12:00:00Z',
  },
  { id: '2', sliderValue: 50, note: null, tags: null, createdAt: '2026-03-31T08:00:00Z' },
  { id: '1', sliderValue: 10, note: 'rough day', tags: null, createdAt: '2026-03-30T18:00:00Z' },
];

describe('CheckInHistory', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'Date',
      class extends Date {
        constructor(...args: ConstructorParameters<typeof Date>) {
          if (args.length === 0) {
            super(now.toISOString());
          } else {
            // @ts-expect-error -- spread into Date constructor
            super(...args);
          }
        }

        static override now() {
          return now.getTime();
        }
      },
    );
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

  it('renders the check-in log heading', async () => {
    render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Check-in log')).toBeDefined();
    });
  });

  it('shows emotional word and time for each entry', async () => {
    render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Alive')).toBeDefined();
      expect(screen.getByText('Still')).toBeDefined();
      expect(screen.getByText('Crushed')).toBeDefined();
    });
  });

  it('shows notes when present', async () => {
    render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('feeling great')).toBeDefined();
      expect(screen.getByText('rough day')).toBeDefined();
    });
  });

  it('shows tags when present', async () => {
    render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeDefined();
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
      expect(container.querySelector('[role="status"]')).toBeNull();
    });

    expect(container.children).toHaveLength(0);
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

  it('groups entries by date', async () => {
    render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeDefined();
      expect(screen.getByText('Yesterday')).toBeDefined();
    });
  });
});
