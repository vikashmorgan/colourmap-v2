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

const { getHeader } = vi.hoisted(() => ({
  getHeader: vi.fn<(name: string) => string | null>(() => null),
}));

vi.mock('next/navigation', () => ({
  redirect,
  usePathname: () => '/day',
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ get: getHeader })),
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

vi.mock('@/components/PresenceSheet', () => ({
  default: () => <div data-testid="presence-sheet">PresenceSheet</div>,
}));

vi.mock('@/components/ViewModeContext', () => ({
  ViewModeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useViewMode: () => ({ mode: 'desktop', navPosition: 'top' }),
}));

vi.mock('@/components/ViewModeSwitcher', () => ({
  default: () => <div data-testid="view-mode-switcher">ViewModeSwitcher</div>,
}));

// Mock the brand button so we can flatten the (otherwise modal-gated)
// user card into the static markup. The initials, email, and Sign out
// previously lived in a separate UserInitialsMenu in the right slot;
// they now live inside the brand-button modal, which only renders
// when opened. Flattening keeps the assertions meaningful.
vi.mock('@/components/ColourmapBrandButton', () => ({
  default: ({ initials, email }: { initials?: string; email?: string }) => (
    <div data-testid="brand-button">
      <p style={{ color: '#B33A2B' }} className="text-center">
        Colourmap
      </p>
      {initials && (
        <div data-testid="brand-user-card">
          <span>{initials}</span>
          {email && <span>{email}</span>}
          <form action="/logout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      )}
    </div>
  ),
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
    getHeader.mockReset();
    getHeader.mockReturnValue(null);
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
    /*
     * The dot is mounted in the shell so it is reachable from every surface.
     * It used to open an AI chat that billed per message; it now opens the
     * two-door capture sheet, which costs nothing. The mount point is the
     * same, which is the point — the dot was already muscle memory.
     */
    expect(html).toContain('PresenceSheet');
    expect(html).toContain('text-center');
    expect(html).toContain('color:#B33A2B');
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

  it('lets a logged-out visitor view the public visuals without redirecting', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    getHeader.mockReturnValue('/geometry-field');

    const layout = await AppLayout({ children: <div>Visuals</div> });
    const html = renderToStaticMarkup(layout);

    expect(redirect).not.toHaveBeenCalled();
    expect(html).toContain('Visuals');
    // Visitor shell shows a Sign in link and no user card.
    expect(html).toContain('Sign in');
    expect(html).not.toContain('Sign out');
  });
});
