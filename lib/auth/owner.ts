/**
 * Cockpit owner allowlist. `COCKPIT_OWNER_EMAILS` is a comma-separated list of
 * the emails allowed into the personal cockpit. Spec:
 * docs/specs/chill-machine-public.md ("Account scope").
 *
 * Returns false when the variable is unset or empty; callers decide whether
 * an unset allowlist fails open (see lib/auth/cockpit-access.ts).
 */
export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const owners = (process.env.COCKPIT_OWNER_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return owners.includes(email.trim().toLowerCase());
}
