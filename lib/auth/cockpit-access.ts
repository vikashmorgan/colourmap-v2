import { isOwnerEmail } from '@/lib/auth/owner';

let warnedUnset = false;

function isDevAuthBypassEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.DEV_BYPASS_AUTH === 'true';
}

/**
 * True when this signed-in user may enter the cockpit (the `(app)` routes).
 *
 * - DEV_BYPASS_AUTH (non-production only) → always allowed.
 * - `COCKPIT_OWNER_EMAILS` unset or empty → allowed (fail open, as before the
 *   allowlist existed), with a one-time server warning so it gets set.
 * - Otherwise only the listed emails are allowed. Everyone else is a Chill
 *   Machine account and belongs on /chill.
 */
export function canEnterCockpit(email: string | null | undefined): boolean {
  if (isDevAuthBypassEnabled()) return true;
  if (!process.env.COCKPIT_OWNER_EMAILS?.trim()) {
    if (!warnedUnset) {
      warnedUnset = true;
      console.warn(
        '[cockpit] COCKPIT_OWNER_EMAILS is not set: every signed-in account can open the cockpit. ' +
          'Set it to the owner email(s) to restrict access.',
      );
    }
    return true;
  }
  return isOwnerEmail(email);
}

/** Test-only: reset the one-time warning. */
export function resetCockpitAccessWarningForTests() {
  warnedUnset = false;
}
