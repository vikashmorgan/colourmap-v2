import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  stored: { segments: [], songs: [{ id: 's', name: 'Song', parts: [] }] } as unknown,
  failRead: false,
  saved: [] as unknown[],
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            db.failRead
              ? { data: null, error: new Error('down') }
              : { data: { value: db.stored }, error: null },
        }),
      }),
      upsert: async (row: { value: unknown }) => {
        db.saved.push(row.value);
        return { error: null };
      },
    }),
  }),
}));

import ChillSongs, { CHILL_URL } from './ChillSongs';

const origin = new URL(CHILL_URL).origin;

function setup() {
  const { container } = render(<ChillSongs />);
  const frame = container.querySelector('iframe') as HTMLIFrameElement;
  const child = frame.contentWindow as Window;
  const replies: unknown[] = [];
  child.postMessage = ((m: unknown) => replies.push(m)) as Window['postMessage'];
  const send = (data: unknown, from = origin, source: Window | null = child) =>
    window.dispatchEvent(new MessageEvent('message', { data, origin: from, source }));
  return { frame, replies, send };
}

describe('Songs in Music', () => {
  afterEach(() => {
    cleanup();
    db.failRead = false;
    db.saved = [];
  });

  it('opens the piano asking to keep songs here', () => {
    const { frame } = setup();
    const src = new URL(frame.src);
    expect(src.searchParams.get('store')).toBe('brain');
    expect(src.searchParams.get('mode')).toBe('piano');
    expect(src.searchParams.get('parent')).toBe(window.location.origin);
  });

  it('answers a load with the stored library and keeps a save', async () => {
    const { replies, send } = setup();
    send({ type: 'chill:load', id: '1' });
    await waitFor(() =>
      expect(replies).toContainEqual({ type: 'chill:library', id: '1', library: db.stored }),
    );
    send({ type: 'chill:save', id: '2', library: { songs: [] } });
    await waitFor(() => expect(replies).toContainEqual({ type: 'chill:saved', id: '2', ok: true }));
    expect(db.saved).toEqual([{ songs: [] }]);
  });

  it('says so when it cannot read, instead of answering an empty library', async () => {
    db.failRead = true;
    const { replies, send } = setup();
    send({ type: 'chill:load', id: '3' });
    await waitFor(() =>
      expect(replies).toContainEqual({ type: 'chill:library', id: '3', error: true }),
    );
  });

  it('ignores messages from any other origin or window', async () => {
    const { replies, send } = setup();
    send({ type: 'chill:save', id: '4', library: {} }, 'https://evil.example');
    send({ type: 'chill:save', id: '5', library: {} }, origin, window);
    await new Promise((r) => setTimeout(r, 20));
    expect(replies).toEqual([]);
    expect(db.saved).toEqual([]);
  });
});
