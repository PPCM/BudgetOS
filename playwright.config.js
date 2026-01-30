import { defineConfig } from '@playwright/test'

const DB_TYPE = process.env.E2E_DB_TYPE || 'sqlite'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  globalSetup: './e2e/global-setup.js',
  webServer: {
    command: 'npm start',
    port: 3000,
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DB_TYPE,
      // SQLite
      DB_PATH: './data/budgetos-e2e-test.db',
      // MySQL/MariaDB
      MYSQL_HOST:     process.env.MYSQL_HOST     || 'localhost',
      MYSQL_PORT:     process.env.MYSQL_PORT     || '3306',
      MYSQL_DB:       process.env.E2E_MYSQL_DB   || 'budgetos_e2e_test',
      MYSQL_USER:     process.env.MYSQL_USER     || 'budgetos',
      MYSQL_PASSWORD: process.env.MYSQL_PASSWORD || 'budgetos',
      // PostgreSQL
      POSTGRES_HOST:     process.env.POSTGRES_HOST     || 'localhost',
      POSTGRES_PORT:     process.env.POSTGRES_PORT     || '5432',
      POSTGRES_DB:       process.env.E2E_POSTGRES_DB   || 'budgetos_e2e_test',
      POSTGRES_USER:     process.env.POSTGRES_USER     || 'budgetos',
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || 'budgetos',
    },
  },
})
