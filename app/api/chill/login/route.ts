import { NextResponse } from 'next/server';

import { jsonError, parseJsonBody } from '@/lib/api/route-helpers';
import { magicLinkLimiter, magicLinkRedirect, normaliseEmail } from '@/lib/chill/magic-link';
import { clientIp } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

/*
 * POST { email } → sends a Chill Machine magic link.
 *
 * The answer is the same whether or not the email already has an account
 * (shouldCreateUser: true), so nothing leaks about who is signed up.
 */
export async function POST(request: Request) {
  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const body = bodyResult.value as Record<string, unknown> | null;
  const email = normaliseEmail(body?.email);
  if (!email) return jsonError('Enter a valid email address', 400);

  if (!magicLinkLimiter.hit(clientIp(request))) {
    return jsonError('Too many links requested. Try again in a few minutes.', 429);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: magicLinkRedirect(new URL(request.url).origin),
        shouldCreateUser: true,
      },
    });
    if (error) {
      console.error('[chill/login] signInWithOtp failed:', error.message);
      return jsonError('The link could not be sent. Try again in a moment.', 502);
    }
  } catch (err) {
    console.error('[chill/login] signInWithOtp threw:', err);
    return jsonError('The link could not be sent. Try again in a moment.', 502);
  }

  return NextResponse.json({ ok: true });
}
