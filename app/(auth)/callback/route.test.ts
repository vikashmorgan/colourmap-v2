import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, exchangeCodeForSession } = vi.hoisted(() => {
  const exchangeCodeForSession = vi.fn();
  const createClient = vi.fn(async () => ({
    auth: {
      exchangeCodeForSession,
    },
  }));

  return {
    createClient,
    exchangeCodeForSession,
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
});
