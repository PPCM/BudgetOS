import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import knex from 'knex'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

/**
 * Clean SQLite E2E database by removing the file and associated WAL/SHM/journal files.
 */
function cleanSqlite() {
  const dbPath = path.join(projectRoot, 'data', 'budgetos-e2e-test.db')
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath)
    console.log('[E2E Setup] Removed stale SQLite E2E database')
  }
  for (const ext of ['-wal', '-shm', '-journal']) {
    const f = dbPath + ext
    if (fs.existsSync(f)) fs.unlinkSync(f)
  }
}

/**
 * Clean PostgreSQL E2E database by dropping and recreating the public schema.
 */
async function cleanPostgres() {
  const db = knex({
    client: 'pg',
    connection: {
      host:     process.env.POSTGRES_HOST     || 'localhost',
      port:     parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.E2E_POSTGRES_DB   || 'budgetos_e2e_test',
      user:     process.env.POSTGRES_USER     || 'budgetos',
      password: process.env.POSTGRES_PASSWORD || 'budgetos',
    },
  })
  try {
    await db.raw('DROP SCHEMA public CASCADE')
    await db.raw('CREATE SCHEMA public')
    console.log('[E2E Setup] Cleaned PostgreSQL E2E database (schema reset)')
  } finally {
    await db.destroy()
  }
}

/**
 * Clean MySQL/MariaDB E2E database by dropping all tables.
 */
async function cleanMysql() {
  const db = knex({
    client: 'mysql2',
    connection: {
      host:     process.env.MYSQL_HOST     || 'localhost',
      port:     parseInt(process.env.MYSQL_PORT || '3306', 10),
      database: process.env.E2E_MYSQL_DB   || 'budgetos_e2e_test',
      user:     process.env.MYSQL_USER     || 'budgetos',
      password: process.env.MYSQL_PASSWORD || 'budgetos',
    },
  })
  try {
    const result = await db.raw('SHOW TABLES')
    // mysql2 returns [rows, fields]; rows are objects with a single key
    const rows = result[0] || []
    const tables = rows.map((row) => Object.values(row)[0])
    if (tables.length > 0) {
      await db.raw('SET FOREIGN_KEY_CHECKS = 0')
      for (const table of tables) {
        await db.raw(`DROP TABLE IF EXISTS \`${table}\``)
      }
      await db.raw('SET FOREIGN_KEY_CHECKS = 1')
      console.log(`[E2E Setup] Cleaned MySQL E2E database (dropped ${tables.length} tables)`)
    } else {
      console.log('[E2E Setup] MySQL E2E database already clean')
    }
  } finally {
    await db.destroy()
  }
}

/**
 * Global setup for E2E tests.
 * - Cleans E2E test database based on E2E_DB_TYPE
 * - Verifies client/dist exists (required for full-stack E2E)
 */
export default async function globalSetup() {
  const dbType = process.env.E2E_DB_TYPE || 'sqlite'
  console.log(`[E2E Setup] Database type: ${dbType}`)

  switch (dbType) {
    case 'postgres':
      await cleanPostgres()
      break
    case 'mysql':
      await cleanMysql()
      break
    case 'sqlite':
    default:
      cleanSqlite()
      break
  }

  // Verify client/dist exists
  const clientDist = path.join(projectRoot, 'client', 'dist')
  if (!fs.existsSync(clientDist)) {
    console.warn('[E2E Setup] Warning: client/dist not found. E2E tests require the built frontend.')
    console.warn('[E2E Setup] Run "cd client && npm run build" first, or API-only tests will run.')
  }
}
