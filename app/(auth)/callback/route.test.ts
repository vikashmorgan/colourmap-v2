import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, exchangeCodeForSession, verifyOtp } = vi.hoisted(() => {
  const exchangeCodeForSession = vi.fn();
  const verifyOtp = vi.fn();
  const createClient = vi.fn(async () => ({
    auth: {
      exchangeCodeForSession,
      verifyOtp,
    },
  }));

  return {
    createClient,
    exchangeCodeForSession,
    verifyOtp,
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient,
}));

import { GET } from './route';

describe('GET /callback', () => {
  beforeEach(() => {
    createClient.mockClear();
    exchangeCodeForSession.mockReset();
    verifyOtp.mockReset();
  });

  it('redirects to the requested in-app path after a successful exchange', async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: null,
    });

    const response = await GET(
      new NextRequest('http://localhost/callback?code=test-code&next=/cockpit'),
    );

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(exchangeCodeForSession).toHaveBeenCalledWith('test-code');
    expect(response.headers.get('location')).toBe('http://localhost/cockpit');
  });

  it('falls back to the app root for unsafe redirect targets', async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: null,
    });

    const response = await GET(
      new NextRequest('http://localhost/callback?code=test-code&next=https://evil.example'),
    );

    expect(response.headers.get('location')).toBe('http://localhost/');
  });

  it('redirects back to login when the auth exchange fails', async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: new Error('exchange failed'),
    });

    const response = await GET(
      new NextRequest('http://localhost/callback?code=test-code&next=/cockpit'),
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost/login?error=auth_callback_failed',
    );
  });

  it('redirects back to login when no auth code is present', async () => {
    const response = await GET(new NextRequest('http://localhost/callback?next=/cockpit'));

    expect(createClient).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe(
      'http://localhost/login?error=auth_callback_failed',
    );
  });

  it('signs in with a PKCE magic link and returns to /chill', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(
      new NextRequest('http://localhost/callback?code=magic-code&next=/chill'),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith('magic-code');
    expect(response.headers.get('location')).toBe('http://localhost/chill');
  });

  it('verifies a token-hash magic link and returns to next', async () => {
    verifyOtp.mockResolvedValue({ error: null });

    const response = await GET(
      new NextRequest('http://localhost/callback?token_hash=th-1&type=email&next=/chill'),
    );

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'th-1', type: 'email' });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe('http://localhost/chill');
  });

  it('ignores token hashes with an unsupported type', async () => {
    const response = await GET(
      new NextRequest('http://localhost/callback?token_hash=th-1&type=recovery&next=/day'),
    );

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe(
      'http://localhost/login?error=auth_callback_failed',
    );
  });

  it('sends a failed Chill link back to the Chill login', async () => {
    verifyOtp.mockResolvedValue({ error: new Error('expired') });

    const response = await GET(
      new NextRequest('http://localhost/callback?token_hash=th-1&type=email&next=/chill'),
    );

    expect(response.headers.get('location')).toBe('http://localhost/chill/login?error=link_failed');
  });

  it('never redirects off-site through backslash tricks', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(
      new NextRequest('http://localhost/callback?code=c&next=%2F%5Cevil.example'),
    );

    expect(response.headers.get('location')).toBe('http://localhost/');
  });
});
