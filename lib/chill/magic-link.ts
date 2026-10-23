import { createRateLimiter } from '@/lib/rate-limit';

/** Where a Chill Machine magic link lands after the callback. */
export const CHILL_HOME = '/chill';

/** 3 link requests per 10 minutes per IP. */
export const magicLinkLimiter = createRateLimiter({ limit: 3, windowMs: 10 * 60 * 1000 });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed, lowercased email when it looks valid; null otherwise. */
export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  return EMAIL_RE.test(email) ? email : null;
}

/** The callback URL a magic link should return to. */
export function magicLinkRedirect(origin: string): string {
  const url = new URL('/callback', origin);
  url.searchParams.set('next', CHILL_HOME);
  return url.toString();
}
