import { describe, expect, it, vi } from 'vitest';

import { askCollective } from './ask-client';
import { DEMO_MEMBERS } from './model';

const members = DEMO_MEMBERS.slice(0, 2);

function streamOf(...chunks: string[]) {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    },
  });
}

describe('askCollective', () => {
  it('posts the people and question, and streams the text as it arrives', async () => {
    const fetcher = vi.fn(async () => new Response(streamOf('Hello ', 'there')));
    const seen: string[] = [];

    const out = await askCollective(members, 'What now?', (t) => seen.push(t), fetcher);

    expect(out).toEqual({ kind: 'done', text: 'Hello there' });
    expect(seen).toEqual(['Hello ', 'Hello there']);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/collective/ask');
    expect(JSON.parse(String(init.body))).toEqual({ members, question: 'What now?' });
  });

  it('asks for sign-in on 401', async () => {
    const fetcher = vi.fn(async () => new Response('Unauthorized', { status: 401 }));
    await expect(askCollective(members, 'q', () => {}, fetcher)).resolves.toEqual({
      kind: 'signin',
    });
  });

  it('passes the server’s message through on other failures', async () => {
    const fetcher = vi.fn(async () => new Response('Too many people', { status: 400 }));
    await expect(askCollective(members, 'q', () => {}, fetcher)).resolves.toEqual({
      kind: 'error',
      message: 'Too many people',
    });
  });

  it('falls back to a plain message when the server says nothing', async () => {
    const fetcher = vi.fn(async () => new Response('', { status: 500 }));
    await expect(askCollective(members, 'q', () => {}, fetcher)).resolves.toEqual({
      kind: 'error',
      message: 'Claude could not answer right now.',
    });
  });

  it('reports a lost connection', async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError('offline');
    });
    await expect(askCollective(members, 'q', () => {}, fetcher)).resolves.toEqual({
      kind: 'error',
      message: 'No connection. Try again in a moment.',
    });
  });
});
