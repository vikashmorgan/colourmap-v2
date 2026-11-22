import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TreeColumns } from './TreeColumns';

const data: Record<string, unknown> = {
  '/api/daily-objectives': [
    { id: '1', text: 'Write the pitch', done: false, list: 'today', position: 0 },
  ],
  '/api/missions': [
    { id: 'm', title: 'Colour Map', completed: false, dueOn: '2026-11-30', branch: 'art' },
  ],
  '/api/check-ins': [
    {
      sliderValue: 100,
      emotionName: 'Grateful',
      emotionColor: '#e2b04a',
      pulses: { body: 50 },
      feelingCompass: null,
      createdAt: '2026-11-22T10:00:00Z',
    },
  ],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the G tree’s columns', () => {
  it('lists your priorities on the left and your latest check-in on the right, each to Focus', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({ ok: true, json: async () => data[url] ?? [] })),
    );
    const go = vi.fn();
    render(<TreeColumns go={go} />);
    await waitFor(() => expect(screen.getByText('Write the pitch')).toBeTruthy());
    expect(screen.getByText('Colour Map')).toBeTruthy();
    expect(screen.getByText('30 Nov')).toBeTruthy();
    expect(screen.getByText('Radiant')).toBeTruthy();
    expect(screen.getByText('Grateful')).toBeTruthy();
    expect(screen.getByText('OK')).toBeTruthy();
    fireEvent.click(screen.getByText('Write the pitch'));
    expect(go).toHaveBeenCalledWith('/day');
  });

  it('invites a first priority and a first check-in when there are none, even offline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    render(<TreeColumns go={() => {}} />);
    await waitFor(() => expect(screen.getByText('Nothing set. Set one')).toBeTruthy());
    expect(screen.getByText('No check-in yet. Check in')).toBeTruthy();
  });
});
