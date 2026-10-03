import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser, createSignedUrl } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createSignedUrl = vi.fn();
  const createClient = vi.fn(async () => ({
    auth: { getUser },
    storage: { from: vi.fn(() => ({ createSignedUrl })) },
  }));
  return { createClient, getUser, createSignedUrl };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));

import { GET } from './route';

const open = (file: string) =>
  GET(new Request(`http://localhost/api/coding/slides/${file}`), {
    params: Promise.resolve({ file }),
  });

describe('open a slide deck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example/user-1/Session3.pdf?token=abc' },
      error: null,
    });
  });

  it('redirects to a short-lived signed URL for the user own copy', async () => {
    const response = await open('Session3.pdf');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'https://storage.example/user-1/Session3.pdf?token=abc',
    );
    expect(createSignedUrl).toHaveBeenCalledWith('user-1/Session3.pdf', 3600);
  });

  it('refuses an unknown name before touching storage', async () => {
    const response = await open('..%2Fuser-2%2FSession3.pdf');
    expect(response.status).toBe(404);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('asks a logged-out visitor to sign in', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const response = await open('Session3.pdf');
    expect(response.status).toBe(401);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('explains how to upload when the deck is not there yet', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'Object not found' } });
    const response = await open('Session3.pdf');
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('Upload slides');
  });
});
