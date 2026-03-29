import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, signInWithOAuth } = vi.hoisted(() => {
  const signInWithOAuth = vi.fn();
  const createClient = vi.fn(async () => ({
    auth: {
      signInWithOAuth,
    },
  }));

  return {
    createClient,
    signInWithOAuth,
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient,
}));

import { POST } from './route';

describe('POST /login/google', () => {
  beforeEach(() => {
    createClient.mockClear();
    signInWithOAuth.mockReset();
  });

  it('starts the Google OAuth flow and points Supabase back to the callback route', async () => {
    signInWithOAuth.mockResolvedValue({
      data: {
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
      },
      error: null,
    });

    const response = await POST(
      new Request('http://localhost/login/google', {
        method: 'POST',
        body: new URLSearchParams({
          next: '/check-in',
        }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      }),
    );

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost/callback?next=%2Fcheck-in',
      },
    });
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://accounts.google.com/o/oauth2/v2/auth');
  });

  it('falls back to the login page when the OAuth flow cannot be started', async () => {
    signInWithOAuth.mockResolvedValue({
      data: {
        url: null,
      },
      error: new Error('provider misconfigured'),
    });

    const response = await POST(
      new Request('http://localhost/login/google', {
        method: 'POST',
        body: new URLSearchParams({
          next: '/cockpit',
        }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      }),
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost/login?next=%2Fcockpit&error=oauth_start_failed',
    );
    expect(response.status).toBe(303);
  });

  it('sanitizes unsafe redirect targets before storing them in the callback URL', async () => {
    signInWithOAuth.mockResolvedValue({
      data: {
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
      },
      error: null,
    });

    await POST(
      new Request('http://localhost/login/google', {
        method: 'POST',
        body: new URLSearchParams({
          next: 'https://evil.example',
        }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      }),
    );

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost/callback?next=%2F',
      },
    });
  });
});
