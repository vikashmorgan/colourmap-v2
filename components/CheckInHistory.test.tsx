// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/CheckInAnalysis', () => ({
  default: () => <div data-testid="analysis">Analysis</div>,
}));

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

  it('renders collapsed pill with title', async () => {
    render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Recent reflections')).toBeDefined();
      expect(screen.getByText('(3)')).toBeDefined();
    });
  });

  it('is collapsed by default', async () => {
    render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Recent reflections')).toBeDefined();
    });

    expect(screen.queryByText('Today')).toBeNull();
  });

  it('expands to show full log when clicked', async () => {
    const user = userEvent.setup();
    render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Recent reflections')).toBeDefined();
    });

    await user.click(screen.getByRole('button', { expanded: false }));

    expect(screen.getByText('Today')).toBeDefined();
    expect(screen.getByText('Yesterday')).toBeDefined();
    expect(screen.getByText('feeling great')).toBeDefined();
    expect(screen.getByText('rough day')).toBeDefined();
  });

  it('collapses when clicked again', async () => {
    const user = userEvent.setup();
    render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Recent reflections')).toBeDefined();
    });

    const pill = screen.getByRole('button', { expanded: false });
    await user.click(pill);
    expect(screen.getByText('Today')).toBeDefined();

    await user.click(screen.getByRole('button', { expanded: true }));
    expect(screen.queryByText('Today')).toBeNull();
  });

  it('shows tags in expanded entries', async () => {
    const user = userEvent.setup();
    render(<CheckInHistory refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Recent reflections')).toBeDefined();
    });

    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('Work')).toBeDefined();
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
});
