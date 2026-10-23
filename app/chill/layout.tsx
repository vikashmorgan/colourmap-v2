import type { Metadata } from 'next';
import Link from 'next/link';

import { getChillUser } from '@/lib/chill/current-user';

/*
 * Light public shell for the Chill Machine: no cockpit nav, just the wordmark
 * and the account corner. Lives outside app/(app) on purpose, so neither the
 * login wall nor the owner lock applies here.
 */
export const metadata: Metadata = {
  title: { absolute: 'Chill Machine' },
  description: 'Play the Chill Machine: ambient pads, beats and visuals in your browser.',
};

const INK = '#5C3018';

export default async function ChillLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getChillUser();

  return (
    <div className="min-h-svh font-serif" style={{ background: '#F0E4CC', color: INK }}>
      <header className="flex items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/chill"
          className="text-base font-semibold tracking-wide"
          style={{ color: INK }}
        >
          Chill Machine
        </Link>
        {user ? (
          <div className="flex min-w-0 items-center gap-3 text-sm">
            <span className="truncate opacity-80">{user.email}</span>
            <form action="/logout" method="post">
              <input type="hidden" name="next" value="/chill" />
              <button type="submit" className="underline-offset-4 hover:underline">
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/chill/login"
            className="rounded-full border px-3 py-1 text-sm"
            style={{ borderColor: 'rgba(92,48,24,0.3)', color: INK }}
          >
            Sign in
          </Link>
        )}
      </header>
      <main className="px-4 pb-12">{children}</main>
    </div>
  );
}
