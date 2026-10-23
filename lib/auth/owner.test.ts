import { afterEach, describe, expect, it, vi } from 'vitest';

import { isOwnerEmail } from './owner';

describe('isOwnerEmail', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('matches listed emails, trimmed and case-insensitive', () => {
    vi.stubEnv('COCKPIT_OWNER_EMAILS', ' Martin@Example.com , other@example.com ');
    expect(isOwnerEmail('martin@example.com')).toBe(true);
    expect(isOwnerEmail('  OTHER@example.com')).toBe(true);
  });

  it('rejects emails not on the list', () => {
    vi.stubEnv('COCKPIT_OWNER_EMAILS', 'martin@example.com');
    expect(isOwnerEmail('guest@example.com')).toBe(false);
    expect(isOwnerEmail('martin@example.com.evil')).toBe(false);
  });

  it('rejects empty emails', () => {
    vi.stubEnv('COCKPIT_OWNER_EMAILS', 'martin@example.com');
    expect(isOwnerEmail(null)).toBe(false);
    expect(isOwnerEmail(undefined)).toBe(false);
    expect(isOwnerEmail('')).toBe(false);
  });

  it('returns false when the allowlist is unset or empty', () => {
    vi.stubEnv('COCKPIT_OWNER_EMAILS', '');
    expect(isOwnerEmail('martin@example.com')).toBe(false);
    vi.stubEnv('COCKPIT_OWNER_EMAILS', ' , ');
    expect(isOwnerEmail('martin@example.com')).toBe(false);
  });
});
