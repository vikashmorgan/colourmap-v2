import { isAuthSessionMissingError } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import ColourmapBrandButton from '@/components/ColourmapBrandButton';
import ConditionalTopNav from '@/components/ConditionalTopNav';
import DevBranchHud from '@/components/DevBranchHud';
import FeedbackOverlay from '@/components/FeedbackOverlay';
import MiniPlayer from '@/components/MiniPlayer';
import MobileViewportBoot from '@/components/MobileViewportBoot';
import PhoneFrame from '@/components/PhoneFrame';
import PresenceSheet from '@/components/PresenceSheet';
import { StyleProvider } from '@/components/StyleContext';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { ViewModeProvider } from '@/components/ViewModeContext';
import ViewModeSwitcher from '@/components/ViewModeSwitcher';
import { isVisitorPath } from '@/lib/auth/visitor';
import { SoundSessionProvider } from '@/lib/sound-session';
import { createClient } from '@/lib/supabase/server';

function deriveInitials(fullName: string | undefined, email: string): string {
  const source = fullName?.trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  const local = (email.split('@')[0] || '').trim();
  if (!local) return '';
  if (local.includes('.')) {
    const parts = local.split('.').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

import StarField from '@/components/StarField';
import AppShell from './AppShell';

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser().catch((error: unknown) => ({
    data: {
      user: null,
    },
    error,
  }));

  if (error && !isAuthSessionMissingError(error)) {
    throw error;
  }

  // Visitor mode: logged-out people may view the public visuals
  // (`/geometry-field`) without signing in. Every other route still requires a
  // session and redirects to /login.
  const pathname = (await headers()).get('x-pathname');
  const isVisitor = !user;
  if (isVisitor && !isVisitorPath(pathname)) {
    redirect('/login');
  }

  return (
    <StyleProvider>
      <ViewModeProvider>
        <SoundSessionProvider>
          <MobileViewportBoot />
          <PhoneFrame>
            <div className="min-h-svh bg-background" style={{ position: 'relative' }}>
              <StarField />
              <header style={{ borderBottom: 'none' }}>
                {/* Three-column grid so the Colourmap brand stays visually
                centered on every viewport — not just desktop. Left column
                is an empty spacer matching the width of the right column
                so the middle is truly centered even on phone. */}
                <div
                  className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2"
                  style={{ background: 'var(--header-bg, rgba(30,16,8,0.92))' }}
                >
                  <div />
                  {/* Brand button now also carries the user's initials —
                  tapping the title opens an About modal with the user
                  card + sign-out + vision + changelog. The right slot
                  used to hold a separate initials menu; freed for the
                  theme palette dot. (Per Martin 2026-04-26.) */}
                  <ColourmapBrandButton
                    initials={
                      user
                        ? deriveInitials(
                            user.user_metadata?.full_name as string | undefined,
                            user.email ?? '',
                          )
                        : ''
                    }
                    email={user?.email ?? ''}
                  />
                  <div className="flex items-center justify-end gap-2">
                    {/* Phone/Design viewport toggle stays desktop-only —
                    it's a dev-time helper. Theme switcher (paper /
                    golden / night) is the "design dot" on every
                    viewport. */}
                    <div className="hidden md:block">
                      <ViewModeSwitcher />
                    </div>
                    <ThemeSwitcher />
                    {isVisitor ? (
                      <a
                        href="/login"
                        className="rounded-full border border-foreground/20 px-3 py-1 text-xs font-medium whitespace-nowrap"
                      >
                        Sign in
                      </a>
                    ) : null}
                  </div>
                </div>
                <ConditionalTopNav />
              </header>
              <AppShell>{children}</AppShell>
            </div>
          </PhoneFrame>
          <MiniPlayer />
          <PresenceSheet />
          <FeedbackOverlay />
          <DevBranchHud />
        </SoundSessionProvider>
      </ViewModeProvider>
    </StyleProvider>
  );
}
