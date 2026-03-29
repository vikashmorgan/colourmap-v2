import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    coverage: {
      exclude: ['app/globals.css'],
      provider: 'v8',
      reporter: ['text'],
    },
    environment: 'node',
  },
});
