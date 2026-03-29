import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from '@/lib/db/schema';
import { getRequiredEnv } from '@/lib/env';

type Database = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var postgresClient: Sql | undefined;
  var drizzleClient: Database | undefined;
}

function createQueryClient() {
  return postgres(getRequiredEnv('DATABASE_URL'), {
    prepare: false,
  });
}

export function getDb() {
  if (!globalThis.postgresClient) {
    globalThis.postgresClient = createQueryClient();
  }

  if (!globalThis.drizzleClient) {
    globalThis.drizzleClient = drizzle(globalThis.postgresClient, {
      schema,
    });
  }

  return globalThis.drizzleClient;
}
