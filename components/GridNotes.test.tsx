// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GridNotes } from './GridNotes';

describe('GridNotes', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('lists the notes for this place and files a new one under it', async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const { notes } = JSON.parse(String(init.body));
        return Response.json(
          {
            notes: [
              {
                id: 'n2',
                itemKey: notes[0].key,
                body: notes[0].body,
                createdAt: '2026-11-08T10:00:00Z',
              },
            ],
          },
          { status: 201 },
        );
      }
      return Response.json({
        notes: [
          {
            id: 'n1',
            itemKey: 'grid|wheel|mind',
            body: 'Mind could hold a map of ideas',
            createdAt: '2026-11-07T10:00:00Z',
          },
          { id: 'x', itemKey: 'grid|tree', body: 'Not here', createdAt: '2026-11-07T10:00:00Z' },
          { id: 'y', itemKey: 'stats|s1|set', body: 'Not grid', createdAt: '2026-11-07T10:00:00Z' },
        ],
      });
    });
    vi.stubGlobal('fetch', fetch);
    render(<GridNotes place={{ key: 'grid|wheel|mind', label: 'Wheel · Mind' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'NOTES' }));
    await screen.findByText('Mind could hold a map of ideas');
    expect(screen.queryByText('Not here')).toBeNull();
    expect(screen.queryByText('Not grid')).toBeNull();

    fireEvent.change(screen.getByRole('textbox', { name: 'A note on Wheel · Mind' }), {
      target: { value: 'Split Mind into notes and thinking' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));
    await screen.findByText('Split Mind into notes and thinking');
    const post = fetch.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      notes: [
        { key: 'grid|wheel|mind', kind: 'comment', body: 'Split Mind into notes and thinking' },
      ],
    });
  });

  it('keeps the words when the save fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === 'POST' ? new Response('', { status: 401 }) : Response.json({ notes: [] }),
      ),
    );
    render(<GridNotes place={{ key: 'grid|tree', label: 'Tree' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'NOTES' }));
    const box = screen.getByRole('textbox', { name: 'A note on Tree' }) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: 'Keep me' } });
    fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Not saved/));
    expect(box.value).toBe('Keep me');
  });
});
