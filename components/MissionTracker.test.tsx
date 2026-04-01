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
    render(<MissionTracker refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Current Mission')).toBeDefined();
    });
  });

  it('shows active and completed missions', async () => {
    render(<MissionTracker refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
      expect(screen.getByText('Old task')).toBeDefined();
    });
  });

  it('shows preview text when collapsed', async () => {
    render(<MissionTracker refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Need to fix auth flow')).toBeDefined();
    });
  });

  it('expands card showing collapsible fields', async () => {
    const user = userEvent.setup();
    render(<MissionTracker refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });

    await user.click(screen.getByText('Ship V1'));

    expect(screen.getByText('Objective')).toBeDefined();
    expect(screen.getByText('Challenge')).toBeDefined();
    expect(screen.getByText('Notes')).toBeDefined();
  });

  it('opens Objective field to show input', async () => {
    const user = userEvent.setup();
    render(<MissionTracker refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });

    await user.click(screen.getByText('Ship V1'));
    await user.click(screen.getByText('Objective'));

    expect(screen.getByDisplayValue('Write the login test')).toBeDefined();
  });

  it('opens Challenge field to show input', async () => {
    const user = userEvent.setup();
    render(<MissionTracker refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });

    await user.click(screen.getByText('Ship V1'));
    await user.click(screen.getByText('Challenge'));

    expect(screen.getByDisplayValue('Need to fix auth flow')).toBeDefined();
  });

  it('adds a new mission and auto-expands', async () => {
    const user = userEvent.setup();
    render(<MissionTracker refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });

    await user.click(screen.getByLabelText('Add mission'));
    await user.type(screen.getByPlaceholderText("What's the mission?"), 'New mission');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByText('New mission')).toBeDefined();
      expect(screen.getByText('Objective')).toBeDefined();
    });
  });

  it('shows field preview when collapsed', async () => {
    const user = userEvent.setup();
    render(<MissionTracker refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Ship V1')).toBeDefined();
    });

    await user.click(screen.getByText('Ship V1'));

    // Objective and Challenge show truncated preview when closed
    expect(screen.getByText('Write the login test')).toBeDefined();
    expect(screen.getByText('Need to fix auth flow')).toBeDefined();
  });

  it('toggles mission completion', async () => {
    const user = userEvent.setup();
    render(<MissionTracker refreshKey={0} />);

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
    render(<MissionTracker refreshKey={0} />);

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

    render(<MissionTracker refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('No missions yet. What are you working toward?')).toBeDefined();
    });
  });
});
