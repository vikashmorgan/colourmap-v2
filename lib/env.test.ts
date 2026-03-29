import { afterEach, describe, expect, it } from 'vitest';

import { getRequiredEnv } from './env';

const ORIGINAL_ENV = process.env;

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('getRequiredEnv', () => {
  it('returns the configured value', () => {
    process.env.TEST_ENV_VALUE = 'configured';

    expect(getRequiredEnv('TEST_ENV_VALUE')).toBe('configured');
  });

  it('throws when the value is missing', () => {
    delete process.env.TEST_ENV_VALUE;

    expect(() => getRequiredEnv('TEST_ENV_VALUE')).toThrow(
      'Missing required environment variable: TEST_ENV_VALUE',
    );
  });
});
