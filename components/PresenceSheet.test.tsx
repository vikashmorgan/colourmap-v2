// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/MicDot', () => ({ default: () => null }));

import PresenceSheet, { titleFrom } from './PresenceSheet';

function jsonOk(rows: unknown = []) {
  return { ok: true, json: async () => rows } as unknown as Response;
}

afterEach(cleanup);

describe('the dot', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonOk()),
    );
  });

  it('shows nothing until it is opened', () => {
    render(<PresenceSheet />);

    expect(screen.getByRole('button', { name: 'Put something down' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Build' })).toBeNull();
  });

  it('opens two doors, not three', () => {
    /*
     * Three compartments was the earlier sketch and it asked you to decide
     * what KIND of thought you were having before you could write it. Two is a
     * fork — for the app, or for me — and that is answerable instantly.
     */
    render(<PresenceSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Put something down' }));

    expect(screen.getByRole('button', { name: 'Build' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Note' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /reflect/i })).toBeNull();
  });

  it('keeps the line this panel inherited', () => {
    /*
     * "Drop the fragment here" is the best copy in the product and it belongs
     * to Note. Losing it in the rebuild would have been a real loss.
     */
    render(<PresenceSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Put something down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Note' }));

    expect(screen.getByPlaceholderText(/drop the fragment here/i)).toBeTruthy();
  });

  it('will not put down an empty thought', () => {
    render(<PresenceSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Put something down' }));

    const put = screen.getByRole('button', { name: /put it down/i }) as HTMLButtonElement;
    expect(put.disabled).toBe(true);
  });

  it('sends a build entry to the prompt queue', async () => {
    const calls: [string, RequestInit | undefined][] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push([String(url), init]);
        return jsonOk();
      }),
    );

    render(<PresenceSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Put something down' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'raise the smoke timeout' } });
    fireEvent.click(screen.getByRole('button', { name: /put it down/i }));

    await waitFor(() => {
      const post = calls.find(([u, i]) => u.includes('/api/prompts') && i?.method === 'POST');
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({ body: 'raise the smoke timeout' });
    });
  });

  it('sends a note to the notebook that already exists', async () => {
    /*
     * The specific confusion this avoids: a second notes store. Notes from
     * here land in notebook_entries, behind the Notes page, with the 36
     * entries already there.
     */
    const calls: [string, RequestInit | undefined][] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push([String(url), init]);
        return jsonOk();
      }),
    );

    render(<PresenceSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Put something down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Note' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'felt scattered today' } });
    fireEvent.click(screen.getByRole('button', { name: /put it down/i }));

    await waitFor(() => {
      const post = calls.find(([u, i]) => u.includes('/api/notebook') && i?.method === 'POST');
      expect(post).toBeTruthy();
      const sent = JSON.parse(String(post?.[1]?.body));
      expect(sent.content).toBe('felt scattered today');
      expect(sent.title).toBe('felt scattered today');
      expect(sent.category).toBeTruthy();
    });
  });

  it('keeps the text when saving fails', async () => {
    /*
     * The same class of failure the voice rebuild existed to remove. Dictated
     * text must survive a bad request.
     */
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) =>
        init?.method === 'POST'
          ? ({ ok: false, json: async () => ({}) } as unknown as Response)
          : jsonOk(),
      ),
    );

    render(<PresenceSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Put something down' }));
    const field = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: 'something hard won' } });
    fireEvent.click(screen.getByRole('button', { name: /put it down/i }));

    await waitFor(() => expect(screen.getByText(/still here/i)).toBeTruthy());
    expect(field.value).toBe('something hard won');
  });

  it('closes on Escape', () => {
    render(<PresenceSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Put something down' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('button', { name: 'Build' })).toBeNull();
  });
});

describe('titling a fragment', () => {
  it('uses the first line as it stands when it is short', () => {
    expect(titleFrom('boxing Tue and Thu 19h')).toBe('boxing Tue and Thu 19h');
  });

  it('takes only the first line of something longer', () => {
    expect(titleFrom('the headline\nand the rest of it')).toBe('the headline');
  });

  it('cuts a long line at a word, not mid-word', () => {
    const long = 'a'.repeat(20) + ' ' + 'b'.repeat(70);
    const title = titleFrom(long);

    expect(title.length).toBeLessThanOrEqual(61);
    expect(title.endsWith('…')).toBe(true);
  });

  it('never asks the writer for a title', () => {
    /*
     * Being asked for a title is the moment somebody decides not to write the
     * note. So it is always derived, even from a single word.
     */
    expect(titleFrom('huh')).toBe('huh');
  });
});
