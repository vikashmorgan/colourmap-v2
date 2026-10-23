// @ts-nocheck
import path from 'node:path';

import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    coverage: {
      exclude: [
        'app/globals.css',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'coverage/**',
        'e2e/**',
      ],
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'proxy.ts',
        'scripts/**/*.{js,cjs,mjs,ts}',
      ],
      provider: 'v8',
      reporter: ['text', 'json-summary'],
    },
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'e2e/**', '.claude/worktrees/**'],
  },
});
