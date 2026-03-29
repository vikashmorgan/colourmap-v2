import { NextResponse } from 'next/server';

import { getSafeRedirectPath } from '@/lib/supabase/paths';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const next = getSafeRedirectPath(formData.get('next')?.toString() ?? null);
  const callbackUrl = new URL('/callback', request.url);

  callbackUrl.searchParams.set('next', next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    const loginUrl = new URL('/login', request.url);

    if (next !== '/') {
      loginUrl.searchParams.set('next', next);
    }

    loginUrl.searchParams.set('error', 'oauth_start_failed');

    return NextResponse.redirect(loginUrl, 303);
  }

  return NextResponse.redirect(data.url, 303);
}
