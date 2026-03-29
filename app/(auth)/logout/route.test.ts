import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, signOut } = vi.hoisted(() => {
  const signOut = vi.fn();
  const createClient = vi.fn(async () => ({
    auth: {
      signOut,
    },
  }));

  return {
    createClient,
    signOut,
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient,
}));

import { POST } from './route';

describe('POST /logout', () => {
  beforeEach(() => {
    createClient.mockClear();
    signOut.mockReset();
  });

  it('signs the user out and returns them to the login page', async () => {
    signOut.mockResolvedValue({
      error: null,
    });

    const response = await POST(
      new Request('http://localhost/logout', {
        method: 'POST',
      }),
    );

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(response.headers.get('location')).toBe('http://localhost/login');
  });

  it('throws when Supabase cannot clear the session', async () => {
    signOut.mockResolvedValue({
      error: new Error('sign out failed'),
    });

    await expect(
      POST(
        new Request('http://localhost/logout', {
          method: 'POST',
        }),
      ),
    ).rejects.toThrow('sign out failed');
  });
});
