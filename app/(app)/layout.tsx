import { isAuthSessionMissingError } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

import NavLinks from '@/components/NavLinks';
import StepBack from '@/components/StepBack';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { ViewModeProvider } from '@/components/ViewModeContext';
import ViewModeSwitcher from '@/components/ViewModeSwitcher';
import { createClient } from '@/lib/supabase/server';

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

  if (!user) {
    redirect('/login');
  }

  return (
    <ViewModeProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <p className="text-[15px] font-normal tracking-[0.08em] font-serif" style={{ color: '#5C3018' }}>Colourmap</p>
                  <StepBack />
                </div>
                <p className="text-[10px] text-muted-foreground/50">
                  {user.email ?? 'your Google account'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ViewModeSwitcher />
                <ThemeSwitcher />
                <form action="/logout" method="post">
                  <button className="text-[10px] text-muted-foreground transition-colors hover:text-foreground" type="submit">
                    Sign out
                  </button>
                </form>
              </div>
          </div>
          <NavLinks />
        </header>
        <AppShell>{children}</AppShell>
      </div>
    </ViewModeProvider>
  );
}
