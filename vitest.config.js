import { defineConfig } from 'vitest/config'

// External databases (PG, MySQL) share a single DB across workers — must run sequentially
const externalDb = process.env.TEST_DB_CLIENT && process.env.TEST_DB_CLIENT !== 'better-sqlite3'

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.{test,spec}.js'],
    exclude: ['tests/integration/**', 'tests/ui/**'],
    testTimeout: externalDb ? 30000 : 10000,
    fileParallelism: !externalDb,
  },
})
