import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, signInWithOtp } = vi.hoisted(() => {
  const signInWithOtp = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { signInWithOtp } }));
  return { createClient, signInWithOtp };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { magicLinkLimiter } from '@/lib/chill/magic-link';

import { POST } from './route';

function req(body: unknown, ip = '1.1.1.1') {
  return new Request('https://colourmap.app/api/chill/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/chill/login', () => {
  beforeEach(() => {
    magicLinkLimiter.reset();
    signInWithOtp.mockReset();
    signInWithOtp.mockResolvedValue({ data: {}, error: null });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('sends a magic link that returns to /chill through the callback', async () => {
    const res = await POST(req({ email: '  Guest@Example.com ' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'guest@example.com',
      options: {
        emailRedirectTo: 'https://colourmap.app/callback?next=%2Fchill',
        shouldCreateUser: true,
      },
    });
  });

  it('rejects an invalid email without calling Supabase', async () => {
    const res = await POST(req({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it('rejects a body that is not JSON', async () => {
    const res = await POST(req('{nope'));
    expect(res.status).toBe(400);
  });

  it('allows 3 requests per IP, then answers 429', async () => {
    for (let i = 0; i < 3; i++) {
      expect((await POST(req({ email: `a${i}@example.com` }))).status).toBe(200);
    }
    const blocked = await POST(req({ email: 'a4@example.com' }));
    expect(blocked.status).toBe(429);
    expect(signInWithOtp).toHaveBeenCalledTimes(3);

    // A different IP is unaffected.
    expect((await POST(req({ email: 'b@example.com' }, '2.2.2.2'))).status).toBe(200);
  });

  it('returns a generic error when Supabase fails', async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: { message: 'smtp down' } });
    const res = await POST(req({ email: 'guest@example.com' }));
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string };
    expect(body.error).not.toContain('smtp');
  });

  it('returns a generic error when Supabase throws', async () => {
    signInWithOtp.mockRejectedValue(new Error('network'));
    const res = await POST(req({ email: 'guest@example.com' }));
    expect(res.status).toBe(502);
  });
});
