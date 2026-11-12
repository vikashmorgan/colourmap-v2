import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Lesson } from '@/lib/pandas-city';

const { createClient, getUser, redirect } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  const redirect = vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  });
  return { createClient, getUser, redirect };
});

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('next/navigation', () => ({ redirect }));
// The map itself is tested in components/PandasCity.test.tsx; here, only what the page hands it.
vi.mock('@/components/PandasCity', () => ({
  default: ({ lessons }: { lessons: Lesson[] }) => (
    <div data-testid="pandas-city">{lessons.map((l) => `${l.n}:${l.groups.length}`).join(' ')}</div>
  ),
}));

import PandasCityPage, { metadata } from './page';

describe('/pandas/city page', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends a logged-out visitor to sign in and back here', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(PandasCityPage()).rejects.toThrow('NEXT_REDIRECT /login?next=/pandas/city');
  });

  it('reads the lessons from the class page and hands them to the map', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    render(await PandasCityPage());
    expect(screen.getByTestId('pandas-city').textContent).toBe('1:4 2:6 3:6');
    expect(metadata.title).toBe('Pandas city');
  });
});
