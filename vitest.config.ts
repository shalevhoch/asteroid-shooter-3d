import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'istanbul',
      reporter: ['json', 'text-summary'],
      reportsDirectory: 'coverage',
      include: ['packages/sim/src/**/*.ts', 'packages/web/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/test/**', '**/*.d.ts', 'packages/web/src/main.ts'],
    },
  },
});
