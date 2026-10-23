import { isAuthSessionMissingError } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

type LoginPageProps = {
  searchParams?: Promise<LoginSearchParams>;
};

type LoginSearchParams = {
  error?: string;
  next?: string;
};

function getErrorCopy(error?: string) {
  if (error === 'auth_callback_failed') {
    return 'Google sign-in did not complete. Try again.';
  }

  if (error === 'oauth_start_failed') {
    return 'Google sign-in could not start. Check the provider configuration and try again.';
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const [authResult, resolvedSearchParams] = await Promise.all([
    supabase.auth.getUser().catch((error: unknown) => ({
      data: {
        user: null,
      },
      error,
    })),
    searchParams ?? Promise.resolve<LoginSearchParams>({}),
  ]);

  if (authResult.error && !isAuthSessionMissingError(authResult.error)) {
    throw authResult.error;
  }

  if (authResult.data.user) {
    redirect('/');
  }

  const next = resolvedSearchParams.next?.startsWith('/') ? resolvedSearchParams.next : '/';
  const errorCopy = getErrorCopy(resolvedSearchParams.error);

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at top, rgba(196, 160, 96, 0.2), transparent 42%), linear-gradient(180deg, rgba(255, 251, 240, 0.18), rgba(242, 232, 208, 0.02))',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-20 h-56 w-56 -translate-x-1/2 rotate-45 rounded-[2rem] border border-[rgba(196,160,96,0.16)]"
      />

      <div className="relative w-full max-w-md rounded-[2rem] border border-border bg-card/95 p-8 shadow-[0_24px_80px_rgba(94,58,20,0.12)] backdrop-blur-sm">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Colourmap</p>
            <h1 className="text-3xl font-semibold tracking-tight">Sign in with Google</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Use your Google account to unlock your Colourmap cockpit across devices.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/55 px-4 py-3">
            <div
              aria-hidden="true"
              className="h-2.5 w-2.5 rotate-45 rounded-[2px]"
              style={{ background: '#C4A060' }}
            />
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
              Calm setup. One account. Your full map.
            </p>
          </div>

          {errorCopy ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorCopy}
            </div>
          ) : null}

          <form action="/login/google" method="post" className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <button
              type="submit"
              className="flex w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Continue with Google
            </button>
          </form>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-foreground/10" />
            <span className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              or
            </span>
            <span className="h-px flex-1 bg-foreground/10" />
          </div>

          <a
            href="/geometry-field"
            className="flex w-full items-center justify-center rounded-2xl border border-foreground/20 px-4 py-3 text-sm font-medium transition-opacity hover:opacity-80"
          >
            Explore the visuals — no sign-in →
          </a>

          <p className="text-xs leading-5 text-muted-foreground">
            Google OAuth is handled by Supabase Auth. This app only receives the resulting session.
            Visitor mode opens the geometry visuals only; your full map needs an account.
          </p>
        </div>
      </div>
    </main>
  );
}
