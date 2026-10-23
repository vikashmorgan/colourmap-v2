import { afterEach, describe, expect, it, vi } from 'vitest';

import { isOwnerEmail, ownerEmails } from './owner';

describe('isOwnerEmail', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('matches an allowed email, ignoring case and spaces', () => {
    vi.stubEnv('COCKPIT_OWNER_EMAILS', ' Martin@Example.com , other@example.com ');
    expect(isOwnerEmail('martin@example.com')).toBe(true);
    expect(isOwnerEmail('  OTHER@example.com ')).toBe(true);
    expect(ownerEmails()).toEqual(['martin@example.com', 'other@example.com']);
  });

  it('refuses an email that is not listed', () => {
    vi.stubEnv('COCKPIT_OWNER_EMAILS', 'martin@example.com');
    expect(isOwnerEmail('guest@example.com')).toBe(false);
  });

  it('refuses missing or blank emails', () => {
    vi.stubEnv('COCKPIT_OWNER_EMAILS', 'martin@example.com');
    expect(isOwnerEmail(null)).toBe(false);
    expect(isOwnerEmail(undefined)).toBe(false);
    expect(isOwnerEmail('   ')).toBe(false);
  });

  it('refuses everyone when the variable is unset or empty', () => {
    vi.stubEnv('COCKPIT_OWNER_EMAILS', '');
    expect(isOwnerEmail('martin@example.com')).toBe(false);
    expect(ownerEmails()).toEqual([]);
  });
});
