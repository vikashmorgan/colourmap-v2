// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NotebookPage from './page';

vi.mock('@/components/MicDot', () => ({ default: () => null }));
vi.mock('@/components/MusicRecordings', () => ({ default: () => null }));

const ENTRY = {
  id: 'n1',
  category: 'notes',
  title: 'Il cammino',
  content: 'Rosso come il fuoco',
  tags: [],
  createdAt: '2026-10-05T10:00:00.000Z',
  updatedAt: '2026-10-05T10:00:00.000Z',
};

describe('NotebookPage: closing an open note from its title bar', () => {
  beforeEach(() => {
    localStorage.clear();
    // The page loads its notes from /api/notebook; jsdom cannot fetch a
    // relative URL, so the network answers with the one note.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [ENTRY] })),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  async function openNote() {
    render(<NotebookPage />);
    fireEvent.click(await screen.findByText('Il cammino'));
    return screen.getByDisplayValue('Il cammino');
  }

  it('folds the note when the bar around the title is tapped', async () => {
    const title = await openNote();
    const bar = title.parentElement as HTMLElement;
    fireEvent.click(bar);
    expect(screen.queryByDisplayValue('Il cammino')).toBeNull();
    expect(screen.getByText('Il cammino')).toBeTruthy();
  });

  it('keeps the note open when the title itself is tapped, so it can be renamed', async () => {
    const title = await openNote();
    fireEvent.click(title);
    expect(screen.getByDisplayValue('Il cammino')).toBeTruthy();
  });

  it('keeps the note open when a button in the bar is tapped', async () => {
    await openNote();
    fireEvent.click(screen.getByText('abc'));
    expect(screen.getByDisplayValue('Il cammino')).toBeTruthy();
  });
});

describe('NotebookPage: notebooks that only exist in the account', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('lists a notebook that has notes even if this device never made it', async () => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => [{ ...ENTRY, id: 'n2', category: 'cammino_del_cuore' }],
      })),
    );
    render(<NotebookPage />);
    expect(await screen.findByText('Cammino del cuore')).toBeTruthy();
  });
});
