import { describe, expect, it, vi } from 'vitest';

const { getChillUser } = vi.hoisted(() => ({ getChillUser: vi.fn() }));

vi.mock('@/lib/chill/current-user', () => ({ getChillUser }));
vi.mock('@/components/ChillPublicApp', () => ({ default: () => null }));

import ChillPublicApp from '@/components/ChillPublicApp';

import ChillPage from './page';

describe('Chill page', () => {
  it('hands the current account to the public app', async () => {
    getChillUser.mockResolvedValue({ id: 'u1', email: 'a@b.co' });
    const element = await ChillPage();
    expect(element.type).toBe(ChillPublicApp);
    expect(element.props).toEqual({ user: { id: 'u1', email: 'a@b.co' } });
  });
});
