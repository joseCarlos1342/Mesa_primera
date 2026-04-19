import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 15_000,
    teardownTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: [
        'src/services/**/*.ts',
        'src/cron/**/*.ts',
        'src/rooms/**/*.ts',
        'src/workers/**/*.ts',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
      ],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
      },
    },
  },
});
