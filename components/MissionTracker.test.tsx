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

  it('renders mission list', async () => {
    render(<MissionTracker refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });
  });

  it('shows active and completed missions', async () => {
    render(<MissionTracker refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });
    // Done missions are collapsed by default
    expect(screen.getByText(/Completed \(1\)/)).toBeDefined();
  });

  it('expands card showing sections', async () => {
    const user = userEvent.setup();
    render(<MissionTracker refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });
    await user.click(screen.getByText('Ship V1'));
    // Expanded card shows Objectives, Challenge, Categories sections
    expect(screen.getByText(/Objectives/)).toBeDefined();
    expect(screen.getByText(/Challenge/)).toBeDefined();
    expect(screen.getByText(/Categories/)).toBeDefined();
  });

  it('shows objectives when expanded', async () => {
    const user = userEvent.setup();
    render(<MissionTracker refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });
    await user.click(screen.getByText('Ship V1'));
    // Objectives are visible directly (not behind a toggle anymore)
    expect(screen.getByText('Write the login test')).toBeDefined();
  });

  it('shows challenge when expanded', async () => {
    const user = userEvent.setup();
    render(<MissionTracker refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });
    await user.click(screen.getByText('Ship V1'));
    expect(screen.getByDisplayValue('Need to fix auth flow')).toBeDefined();
  });

  it('adds a new mission and auto-expands', async () => {
    const user = userEvent.setup();
    render(<MissionTracker refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });
    await user.type(screen.getByPlaceholderText('New mission...'), 'New mission');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => {
      expect(screen.getByDisplayValue('New mission')).toBeDefined();
    });
  });

  it('toggles mission completion', async () => {
    const user = userEvent.setup();
    render(<MissionTracker refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });
    await user.click(screen.getByText('Ship V1'));
    await user.click(screen.getByText('Complete'));
    expect(fetch).toHaveBeenCalledWith(
      '/api/missions/1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('deletes a mission', async () => {
    const user = userEvent.setup();
    render(<MissionTracker refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });
    await user.click(screen.getByText('Ship V1'));
    await user.click(screen.getByText('Delete'));
    expect(fetch).toHaveBeenCalledWith(
      '/api/missions/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('shows empty state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })),
    );
    render(<MissionTracker refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByText('No missions yet. What are you working toward?')).toBeDefined();
    });
  });
});
