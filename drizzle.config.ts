import { defineConfig } from 'drizzle-kit';

import { getRequiredEnv } from './lib/env';

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle/migrations',
  dbCredentials: {
    url: getRequiredEnv('DATABASE_URL'),
  },
});
