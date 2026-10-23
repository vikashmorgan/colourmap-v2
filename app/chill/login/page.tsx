import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import ChillLoginForm from '@/components/ChillLoginForm';
import { getChillUser } from '@/lib/chill/current-user';

export const metadata: Metadata = {
  title: { absolute: 'Sign in · Chill Machine' },
};

type Props = { searchParams?: Promise<{ error?: string }> };

export default async function ChillLoginPage({ searchParams }: Props) {
  const [user, params] = await Promise.all([getChillUser(), searchParams ?? Promise.resolve({})]);
  if (user) redirect('/chill');

  const linkFailed = (params as { error?: string }).error === 'link_failed';

  return (
    <div className="mx-auto w-full max-w-sm pt-12">
      <h1 className="text-2xl font-semibold">Sign in with email</h1>
      <p className="mt-2 text-sm opacity-80">
        No password, nothing to remember. We email you a link, and it signs you in. Your account
        keeps your mixes and recordings across devices.
      </p>
      {linkFailed ? (
        <p role="alert" className="mt-4 text-sm" style={{ color: '#8A2E1C' }}>
          That link didn’t work: it may have expired or been opened in another browser. Send a new
          one below.
        </p>
      ) : null}
      <div className="mt-6">
        <ChillLoginForm />
      </div>
    </div>
  );
}
