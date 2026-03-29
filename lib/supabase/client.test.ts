import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createBrowserClient } = vi.hoisted(() => ({
  createBrowserClient: vi.fn(() => 'browser-client'),
}));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient,
}));

import { createClient } from './client';

describe('createClient', () => {
  beforeEach(() => {
    createBrowserClient.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  });

  it('creates a browser client with the required env values', () => {
    expect(createClient()).toBe('browser-client');
    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'sb_publishable_test',
    );
  });
});
