import { AuthSessionMissingError } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

import { getChillUser } from './current-user';

describe('getChillUser', () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it('returns id and email for a signed-in user', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.co' } }, error: null });
    await expect(getChillUser()).resolves.toEqual({ id: 'u1', email: 'a@b.co' });
  });

  it('returns null for a guest or a missing session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(getChillUser()).resolves.toBeNull();
    getUser.mockRejectedValue(new AuthSessionMissingError());
    await expect(getChillUser()).resolves.toBeNull();
  });

  it('rethrows unexpected auth errors', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('boom') });
    await expect(getChillUser()).rejects.toThrow('boom');
  });
});
