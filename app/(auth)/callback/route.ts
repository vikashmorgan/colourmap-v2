import type { EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

import { getSafeRedirectPath } from '@/lib/supabase/paths';
import { createClient } from '@/lib/supabase/server';

/*
 * Auth callback for every sign-in method.
 *
 *   ?code=…                       Google OAuth, or an email magic link using the
 *                                 default PKCE template (same browser only)
 *   ?token_hash=…&type=email      email magic link using the token-hash template
 *                                 (works when the link opens on another device)
 *
 * `next` is always passed through getSafeRedirectPath, so only in-app paths
 * are ever redirected to.
 */
const EMAIL_OTP_TYPES: ReadonlySet<string> = new Set<EmailOtpType>([
  'email',
  'magiclink',
  'signup',
]);

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && EMAIL_OTP_TYPES.has(value);
}

function failureRedirect(next: string, request: NextRequest) {
  // Chill Machine sign-ins go back to the Chill login, not the cockpit login.
  if (next === '/chill' || next.startsWith('/chill/') || next.startsWith('/chill?')) {
    return NextResponse.redirect(new URL('/chill/login?error=link_failed', request.url));
  }
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url));
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = getSafeRedirectPath(requestUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  } else if (tokenHash && isEmailOtpType(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return failureRedirect(next, request);
}
