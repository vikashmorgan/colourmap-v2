import { AuthSessionMissingError } from '@supabase/supabase-js';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({
    auth: {
      getUser,
    },
  }));

  return {
    createClient,
    getUser,
  };
});

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient,
}));

vi.mock('@/components/NavLinks', () => ({
  default: () => <nav data-testid="nav-links">NavLinks</nav>,
}));

vi.mock('@/components/StepBack', () => ({
  default: () => <span data-testid="step-back">StepBack</span>,
}));

vi.mock('@/components/ThemeSwitcher', () => ({
  default: () => <div data-testid="theme-switcher">ThemeSwitcher</div>,
}));

vi.mock('@/components/ViewModeContext', () => ({
  ViewModeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ViewModeSwitcher', () => ({
  default: () => <div data-testid="view-mode-switcher">ViewModeSwitcher</div>,
}));

vi.mock('./AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

import AppLayout from './layout';

describe('AppLayout', () => {
  beforeEach(() => {
    createClient.mockClear();
    getUser.mockReset();
    redirect.mockReset();
    getUser.mockResolvedValue({
      data: {
        user: {
          email: 'martin@example.com',
        },
      },
      error: null,
    });
  });

  it('renders the authenticated shell navigation and children', async () => {
    const layout = await AppLayout({
      children: <div>Child section</div>,
    });
    const html = renderToStaticMarkup(layout);

    expect(html).toContain('martin@example.com');
    expect(html).toContain('Colourmap');
    expect(html).toContain('Sign out');
    expect(html).toContain('Child section');
  });

  it('redirects unauthenticated visitors to the login page', async () => {
    getUser.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    });
    redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });

    await expect(
      AppLayout({
        children: <div>Child section</div>,
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects when Supabase reports a missing session', async () => {
    getUser.mockRejectedValue(new AuthSessionMissingError());
    redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });

    await expect(
      AppLayout({
        children: <div>Child section</div>,
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/login');
  });
});
