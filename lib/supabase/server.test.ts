import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cookieStore, cookies, createServerClient } = vi.hoisted(() => ({
  cookieStore: {
    getAll: vi.fn(() => [{ name: 'existing', value: 'cookie' }]),
    set: vi.fn(),
  },
  cookies: vi.fn(),
  createServerClient: vi.fn(() => 'server-client'),
}));

cookies.mockImplementation(async () => cookieStore);

vi.mock('next/headers', () => ({
  cookies,
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient,
}));

import { createClient } from './server';

describe('createClient', () => {
  beforeEach(() => {
    cookies.mockClear();
    createServerClient.mockClear();
    cookieStore.getAll.mockReturnValue([{ name: 'existing', value: 'cookie' }]);
    cookieStore.set.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  });

  it('wires the server client to the Next cookie store', async () => {
    expect(await createClient()).toBe('server-client');

    const options = createServerClient.mock.calls[0][2];

    expect(options.cookies.getAll()).toEqual([{ name: 'existing', value: 'cookie' }]);

    options.cookies.setAll([
      {
        name: 'sb-access-token',
        value: 'fresh-token',
        options: { path: '/' },
      },
    ]);

    expect(cookieStore.set).toHaveBeenCalledWith('sb-access-token', 'fresh-token', {
      path: '/',
    });
  });

  it('swallows cookie write errors inside server components', async () => {
    cookieStore.set.mockImplementation(() => {
      throw new Error('cannot write cookies');
    });

    await createClient();
    const options = createServerClient.mock.calls[0][2];

    expect(() =>
      options.cookies.setAll([
        {
          name: 'sb-access-token',
          value: 'fresh-token',
          options: { path: '/' },
        },
      ]),
    ).not.toThrow();
  });
});
