import { AuthSessionMissingError } from '@supabase/supabase-js';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({
    auth: {
      getUser,
    },
  }));

  return {
    createClient,
    getUser,
  };
});

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient,
}));

import LoginPage from './page';

describe('LoginPage', () => {
  beforeEach(() => {
    createClient.mockClear();
    getUser.mockReset();
    redirect.mockReset();
    getUser.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    });
  });

  it('renders the Google sign-in flow', async () => {
    const page = await LoginPage({
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Sign in with Google');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('Google OAuth is handled by Supabase Auth.');
  });

  it('renders callback errors inline', async () => {
    const page = await LoginPage({
      searchParams: Promise.resolve({
        error: 'auth_callback_failed',
      }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Google sign-in did not complete. Try again.');
  });

  it('treats a missing session as a normal signed-out login state', async () => {
    getUser.mockRejectedValue(new AuthSessionMissingError());

    const page = await LoginPage({
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Continue with Google');
  });

  it('redirects authenticated users back into the app', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
        },
      },
      error: null,
    });
    redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });

    await expect(
      LoginPage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/');
  });
});
