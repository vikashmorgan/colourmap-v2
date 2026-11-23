import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const streamedResponse = new Response('collective stream');

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});
const { anthropic } = vi.hoisted(() => ({ anthropic: vi.fn(() => 'model') }));
const { streamText } = vi.hoisted(() => ({
  streamText: vi.fn(() => ({ toTextStreamResponse: () => streamedResponse })),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@ai-sdk/anthropic', () => ({ anthropic }));
vi.mock('ai', () => ({ streamText }));

import { DEMO_MEMBERS } from '@/lib/collective/model';
import { COLLECTIVE_MODEL } from '@/lib/collective/prompt';

import { POST } from './route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/collective/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const valid = { members: DEMO_MEMBERS.slice(0, 2), question: 'What could we make?' };

describe('POST /api/collective/ask', () => {
  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    getUser.mockReset();
    anthropic.mockClear();
    streamText.mockClear();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('streams Claude’s answer about the chosen people', async () => {
    const response = await POST(makeRequest(valid));

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('collective stream');
    expect(anthropic).toHaveBeenCalledWith(COLLECTIVE_MODEL);
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'model',
        prompt: expect.stringContaining('What could we make?'),
        system: expect.stringContaining('Never rank people'),
      }),
    );
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining(DEMO_MEMBERS[1].name) }),
    );
  });

  it('asks people to sign in first', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(makeRequest(valid));

    expect(response.status).toBe(401);
    expect(streamText).not.toHaveBeenCalled();
  });

  it('says plainly when Claude is not connected', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    const response = await POST(makeRequest(valid));

    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toContain('ANTHROPIC_API_KEY');
  });

  it('rejects a request with nobody chosen', async () => {
    const response = await POST(makeRequest({ members: [], question: 'Hi' }));

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Pick at least one person');
    expect(streamText).not.toHaveBeenCalled();
  });

  it('rejects a body that is not JSON', async () => {
    const response = await POST(makeRequest('{nope'));

    expect(response.status).toBe(400);
    expect(streamText).not.toHaveBeenCalled();
  });
});
