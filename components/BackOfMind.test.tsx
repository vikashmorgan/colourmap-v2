// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BackOfMind from './BackOfMind';

const fakeItems = [
  { id: '1', title: 'Call dentist', done: false, createdAt: '2026-03-31T10:00:00Z' },
  { id: '2', title: 'Return package', done: true, createdAt: '2026-03-30T10:00:00Z' },
];

describe('BackOfMind', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, opts?: RequestInit) => {
        if (opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: '3',
                title: 'New item',
                done: false,
                createdAt: '2026-03-31T14:00:00Z',
              }),
          });
        }
        if (opts?.method === 'PATCH' || opts?.method === 'DELETE') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fakeItems),
        });
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the heading', async () => {
    render(<BackOfMind />);

    await waitFor(() => {
      expect(screen.getByText('Back of my mind')).toBeDefined();
    });
  });

  it('shows pending and done items', async () => {
    render(<BackOfMind />);

    await waitFor(() => {
      expect(screen.getByText('Call dentist')).toBeDefined();
      expect(screen.getByText('Return package')).toBeDefined();
    });
  });

  it('adds a new item', async () => {
    const user = userEvent.setup();
    render(<BackOfMind />);

    await waitFor(() => {
      expect(screen.getByText('Call dentist')).toBeDefined();
    });

    await user.type(screen.getByPlaceholderText("What's lingering?"), 'New item');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByText('New item')).toBeDefined();
    });
  });

  it('toggles item done', async () => {
    const user = userEvent.setup();
    render(<BackOfMind />);

    await waitFor(() => {
      expect(screen.getByText('Call dentist')).toBeDefined();
    });

    await user.click(screen.getByLabelText('Mark "Call dentist" as done'));

    expect(fetch).toHaveBeenCalledWith(
      '/api/backlog/1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('shows empty state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })),
    );

    render(<BackOfMind />);

    await waitFor(() => {
      expect(screen.getByText('Mind is clear.')).toBeDefined();
    });
  });
});
