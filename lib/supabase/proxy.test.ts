import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerClient, getClaims } = vi.hoisted(() => {
  const getClaims = vi.fn();
  const createServerClient = vi.fn((_, __, options) => ({
    auth: {
      getClaims: async () => {
        await getClaims();
        options.cookies.setAll([
          {
            name: 'sb-access-token',
            value: 'fresh-token',
            options: { path: '/' },
          },
        ]);
      },
    },
  }));

  return {
    createServerClient,
    getClaims,
  };
});

vi.mock('@supabase/ssr', () => ({
  createServerClient,
}));

import { updateSession } from './proxy';

describe('updateSession', () => {
  beforeEach(() => {
    createServerClient.mockClear();
    getClaims.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  });

  it('refreshes auth claims and mirrors refreshed cookies to the response', async () => {
    const request = new NextRequest('http://localhost/');

    const response = await updateSession(request);
    const options = createServerClient.mock.calls[0][2];

    expect(createServerClient).toHaveBeenCalledTimes(1);
    expect(getClaims).toHaveBeenCalledTimes(1);
    expect(options.cookies.getAll()).toEqual([
      {
        name: 'sb-access-token',
        value: 'fresh-token',
      },
    ]);
    expect(request.cookies.get('sb-access-token')?.value).toBe('fresh-token');
    expect(response.cookies.get('sb-access-token')?.value).toBe('fresh-token');
  });
});
