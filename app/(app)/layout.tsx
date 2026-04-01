import { isAuthSessionMissingError } from '@supabase/supabase-js';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import ThemeSwitcher from '@/components/ThemeSwitcher';
import { createClient } from '@/lib/supabase/server';

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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Colourmap</p>
            <p className="text-sm text-foreground">
              Signed in as {user.email ?? 'your Google account'}
            </p>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <ThemeSwitcher />
            <Link className="transition-colors hover:text-foreground" href="/">
              Cockpit
            </Link>
            <form action="/logout" method="post">
              <button className="transition-colors hover:text-foreground" type="submit">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl px-6 py-10">{children}</div>
    </div>
  );
}
