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

  it('renders heading', async () => {
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

  it('shows blocker preview when collapsed', async () => {
    render(<MissionTracker />);

    await waitFor(() => {
      expect(screen.getByText('Need to fix auth flow')).toBeDefined();
    });
  });

  it('expands card with next step and blocking fields', async () => {
    const user = userEvent.setup();
    render(<MissionTracker />);

    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });

    await user.click(screen.getByText('Ship V1'));

    expect(screen.getByText('Objective')).toBeDefined();
    expect(screen.getByText('Challenge')).toBeDefined();
    expect(screen.getByDisplayValue('Write the login test')).toBeDefined();
    expect(screen.getByDisplayValue('Need to fix auth flow')).toBeDefined();
  });

  it('shows More context toggle with description', async () => {
    const user = userEvent.setup();
    render(<MissionTracker />);

    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });

    await user.click(screen.getByText('Ship V1'));
    await user.click(screen.getByText('More context'));

    expect(screen.getByDisplayValue('Launch the first version')).toBeDefined();
  });

  it('adds a new mission and auto-expands', async () => {
    const user = userEvent.setup();
    render(<MissionTracker />);

    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });

    await user.type(screen.getByPlaceholderText('Add a mission...'), 'New mission');
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

  it('shows empty state', async () => {
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
