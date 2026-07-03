import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/integration/**/*.{test,spec}.js'],
    testTimeout: 30000,
    // Integration tests share a single test database, so run files sequentially
    // (never in parallel) to avoid cross-test interference and DB deadlocks.
    pool: 'forks',
    fileParallelism: false,
  },
})
