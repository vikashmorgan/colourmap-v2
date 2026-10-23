import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { canEnterCockpit, resetCockpitAccessWarningForTests } from './cockpit-access';

describe('canEnterCockpit', () => {
  beforeEach(() => {
    resetCockpitAccessWarningForTests();
    vi.stubEnv('DEV_BYPASS_AUTH', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('allows only listed owners when the allowlist is set', () => {
    vi.stubEnv('COCKPIT_OWNER_EMAILS', 'martin@example.com');
    expect(canEnterCockpit('martin@example.com')).toBe(true);
    expect(canEnterCockpit('guest@example.com')).toBe(false);
    expect(canEnterCockpit(null)).toBe(false);
  });

  it('fails open with a single warning when the allowlist is unset', () => {
    vi.stubEnv('COCKPIT_OWNER_EMAILS', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(canEnterCockpit('guest@example.com')).toBe(true);
    expect(canEnterCockpit('someone@example.com')).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('COCKPIT_OWNER_EMAILS');
  });

  it('allows everyone under the dev auth bypass outside production', () => {
    vi.stubEnv('COCKPIT_OWNER_EMAILS', 'martin@example.com');
    vi.stubEnv('DEV_BYPASS_AUTH', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    expect(canEnterCockpit('dev@localhost')).toBe(true);
  });

  it('ignores the dev bypass in production', () => {
    vi.stubEnv('COCKPIT_OWNER_EMAILS', 'martin@example.com');
    vi.stubEnv('DEV_BYPASS_AUTH', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    expect(canEnterCockpit('dev@localhost')).toBe(false);
  });
});
