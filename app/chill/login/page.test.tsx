import { describe, expect, it, vi } from 'vitest';

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock('next/navigation', () => ({ redirect }));

import { CHILL_URL } from '@/lib/chill/url';

import ChillLoginPage from './page';

describe('Chill login page', () => {
  it('sends people to the Chill Machine app to sign in', () => {
    ChillLoginPage();
    expect(redirect).toHaveBeenCalledWith(CHILL_URL);
  });
});
