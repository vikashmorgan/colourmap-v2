import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postgres, drizzle } = vi.hoisted(() => ({
  postgres: vi.fn(() => 'sql-client'),
  drizzle: vi.fn(() => 'db-client'),
}));

vi.mock('postgres', () => ({
  default: postgres,
}));

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle,
}));

import { getDb } from './client';

describe('getDb', () => {
  beforeEach(() => {
    delete globalThis.postgresClient;
    delete globalThis.drizzleClient;
    postgres.mockClear();
    drizzle.mockClear();
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/colourmap';
  });

  it('creates a singleton drizzle client with prepare disabled', () => {
    const first = getDb();
    const second = getDb();

    expect(first).toBe('db-client');
    expect(second).toBe(first);
    expect(postgres).toHaveBeenCalledWith(
      'postgresql://postgres:postgres@127.0.0.1:5432/colourmap',
      {
        prepare: false,
      },
    );
    expect(drizzle).toHaveBeenCalledTimes(1);
  });
});
