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
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Colourmap</p>
            <h1 className="text-3xl font-semibold tracking-tight">Sign in with Google</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Use your Google account to unlock your Colourmap cockpit across devices.
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

          <p className="text-xs leading-5 text-muted-foreground">
            Google OAuth is handled by Supabase Auth. This app only receives the resulting session.
          </p>
        </div>
      </div>
    </main>
  );
}
