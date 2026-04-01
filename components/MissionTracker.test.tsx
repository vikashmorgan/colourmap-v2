// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MissionTracker from './MissionTracker';

const fakeMissions = [
  {
    id: '1',
    title: 'Ship V1',
    description: 'Launch the first version',
    blocking: 'Need to fix auth flow',
    nextStep: 'Write the login test',
    completed: false,
    createdAt: '2026-03-31T10:00:00Z',
  },
  {
    id: '2',
    title: 'Old task',
    description: null,
    blocking: null,
    nextStep: null,
    completed: true,
    createdAt: '2026-03-30T10:00:00Z',
  },
];

describe('MissionTracker', () => {
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
                title: 'New mission',
                description: null,
                blocking: null,
                nextStep: null,
                completed: false,
                createdAt: '2026-03-31T14:00:00Z',
              }),
          });
        }
        if (opts?.method === 'PATCH') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        if (opts?.method === 'DELETE') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fakeMissions),
        });
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders missions heading', async () => {
    render(<MissionTracker />);

    await waitFor(() => {
      expect(screen.getByText('Current Mission')).toBeDefined();
    });
  });

  it('shows active and completed missions', async () => {
    render(<MissionTracker />);

    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
      expect(screen.getByText('Old task')).toBeDefined();
    });
  });

  it('shows blocked badge when collapsed', async () => {
    render(<MissionTracker />);

    await waitFor(() => {
      expect(screen.getByText('blocked')).toBeDefined();
    });
  });

  it('expands card to show three sections', async () => {
    const user = userEvent.setup();
    render(<MissionTracker />);

    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });

    await user.click(screen.getByText('Ship V1'));

    expect(screen.getByText('Objective')).toBeDefined();
    expect(screen.getByText('Blocking')).toBeDefined();
    expect(screen.getByText('Next step')).toBeDefined();
    expect(screen.getByDisplayValue('Launch the first version')).toBeDefined();
    expect(screen.getByDisplayValue('Need to fix auth flow')).toBeDefined();
    expect(screen.getByDisplayValue('Write the login test')).toBeDefined();
  });

  it('adds a new mission and auto-expands it', async () => {
    const user = userEvent.setup();
    render(<MissionTracker />);

    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });

    const input = screen.getByPlaceholderText('Add a mission...');
    await user.type(input, 'New mission');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByText('New mission')).toBeDefined();
      expect(screen.getByText('Objective')).toBeDefined();
    });
  });

  it('toggles mission completion', async () => {
    const user = userEvent.setup();
    render(<MissionTracker />);

    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });

    await user.click(screen.getByLabelText('Mark "Ship V1" as complete'));

    expect(fetch).toHaveBeenCalledWith(
      '/api/missions/1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('deletes a mission', async () => {
    const user = userEvent.setup();
    render(<MissionTracker />);

    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });

    await user.click(screen.getByLabelText('Delete "Ship V1"'));

    expect(fetch).toHaveBeenCalledWith(
      '/api/missions/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('shows empty state when no missions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        }),
      ),
    );

    render(<MissionTracker />);

    await waitFor(() => {
      expect(screen.getByText('No missions yet. What are you working toward?')).toBeDefined();
    });
  });
});
