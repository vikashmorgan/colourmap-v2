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

  it('returns the user to a safe next path from the form', async () => {
    signOut.mockResolvedValue({ error: null });
    const body = new FormData();
    body.set('next', '/chill');

    const response = await POST(new Request('http://localhost/logout', { method: 'POST', body }));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost/chill');
  });

  it('accepts next as a query parameter and rejects off-site targets', async () => {
    signOut.mockResolvedValue({ error: null });

    const ok = await POST(new Request('http://localhost/logout?next=/chill', { method: 'POST' }));
    expect(ok.headers.get('location')).toBe('http://localhost/chill');

    const evil = await POST(
      new Request('http://localhost/logout?next=//evil.example', { method: 'POST' }),
    );
    expect(evil.headers.get('location')).toBe('http://localhost/');
  });

  it('falls back to the login page when the form has no next field', async () => {
    signOut.mockResolvedValue({ error: null });
    const body = new FormData();
    body.set('other', 'value');

    const response = await POST(new Request('http://localhost/logout', { method: 'POST', body }));

    expect(response.headers.get('location')).toBe('http://localhost/login');
  });
});
