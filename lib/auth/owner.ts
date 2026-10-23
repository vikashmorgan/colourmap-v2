/**
 * Cockpit owner — the account(s) allowed into Martin's private surfaces.
 *
 * Set `COCKPIT_OWNER_EMAILS` (comma-separated) in the hosting env. Compared in
 * lowercase, surrounding spaces ignored. When the variable is unset or empty,
 * nobody is the owner — private pages stay closed rather than open.
 */
export function ownerEmails(): string[] {
  return (process.env.COCKPIT_OWNER_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** True when this email belongs to the cockpit owner. */
export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const wanted = email.trim().toLowerCase();
  if (!wanted) return false;
  return ownerEmails().includes(wanted);
}
