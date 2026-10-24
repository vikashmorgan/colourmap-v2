import { describe, expect, it, vi } from 'vitest';

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock('next/navigation', () => ({ redirect }));

import { CHILL_URL } from '@/lib/chill/url';

import ChillPage from './page';

describe('Chill page', () => {
  it('sends people to the Chill Machine app', () => {
    ChillPage();
    expect(redirect).toHaveBeenCalledWith(CHILL_URL);
  });
});
