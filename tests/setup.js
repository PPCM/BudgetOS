/**
 * Test setup for backend tests
 * Creates an in-memory Knex/better-sqlite3 database for testing
 */
import Knex from 'knex'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let knexInstance = null

/**
 * Initialize test database (in-memory better-sqlite3 via Knex)
 */
export async function setupTestDb() {
  if (knexInstance) {
    await resetTestDb()
    return knexInstance
  }

  const testClient = process.env.TEST_DB_CLIENT || 'better-sqlite3'

  let config
  switch (testClient) {
    case 'mysql2':
      config = {
        client: 'mysql2',
        connection: {
          host: process.env.MYSQL_HOST || 'localhost',
          port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
          database: process.env.MYSQL_DB || 'budgetos_test',
          user: process.env.MYSQL_USER || 'budgetos',
          password: process.env.MYSQL_PASSWORD || 'budgetos',
          charset: 'utf8mb4',
          dateStrings: ['DATE'],
        },
        // Single connection prevents FK_CHECKS from applying to wrong connection
        pool: { min: 1, max: 1 },
      }
      break
    case 'pg': {
      // Prevent pg from converting DATE columns to JS Date objects
      const pgMod = await import('pg')
      pgMod.default.types.setTypeParser(1082, (val) => val)
      config = {
        client: 'pg',
        connection: {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
          database: process.env.POSTGRES_DB || 'budgetos_test',
          user: process.env.POSTGRES_USER || 'budgetos',
          password: process.env.POSTGRES_PASSWORD || 'budgetos',
        },
        // Single connection prevents TRUNCATE deadlocks during test cleanup
        pool: { min: 1, max: 1 },
      }
      break
    }
    case 'better-sqlite3':
    default:
      config = {
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
        useNullAsDefault: true,
        pool: {
          afterCreate: (conn, cb) => {
            conn.pragma('foreign_keys = ON')
            cb()
          },
        },
      }
      break
  }

  config.migrations = {
    directory: path.resolve(__dirname, '../src/database/migrations'),
    sortDirsSeparately: true,
  }

  knexInstance = Knex(config)

  // Run all migrations to set up schema
  await knexInstance.migrate.latest()

  return knexInstance
}

/**
 * Get the test Knex instance
 */
export function getTestDb() {
  if (!knexInstance) throw new Error('Test database not initialized. Call setupTestDb() first.')
  return knexInstance
}

/**
 * Close test database
 */
export async function closeTestDb() {
  if (knexInstance) {
    await knexInstance.destroy()
    knexInstance = null
  }
}

/**
 * Reset test database (clear all data)
 */
export async function resetTestDb() {
  if (!knexInstance) return

  const tables = [
    'reconciliation_matches',
    'transaction_splits',
    'transactions',
    'credit_card_cycles',
    'credit_cards',
    'planned_transactions',
    'rules',
    'imports',
    'budgets',
    'category_learning',
    'attachments',
    'categories',
    'payees',
    'user_settings',
    'accounts',
    'users',
  ]

  // Disable FK checks for cleanup
  const dialect = knexInstance.client?.config?.client || ''
  if (dialect.includes('mysql')) {
    // Single-connection pool ensures FK_CHECKS applies to all queries
    await knexInstance.raw('SET FOREIGN_KEY_CHECKS = 0')
    for (const table of tables) {
      try { await knexInstance.raw(`TRUNCATE TABLE \`${table}\``) } catch (e) { /* table may not exist */ }
    }
    await knexInstance.raw('SET FOREIGN_KEY_CHECKS = 1')
    return
  } else if (dialect.includes('pg')) {
    // Truncate with cascade for PG
    for (const table of tables) {
      try { await knexInstance.raw(`TRUNCATE TABLE "${table}" CASCADE`) } catch (e) { /* ignore */ }
    }
    return
  } else {
    // SQLite: disable FK checks temporarily
    await knexInstance.raw('PRAGMA foreign_keys = OFF')
  }

  for (const table of tables) {
    try { await knexInstance(table).del() } catch (e) { /* table may not exist */ }
  }

  if (dialect.includes('sqlite') || dialect.includes('better-sqlite')) {
    await knexInstance.raw('PRAGMA foreign_keys = ON')
  }
}

/**
 * Create test user
 */
export async function createTestUser(id = 'test-user-1', email = null) {
  const userEmail = email || `${id}@test.com`
  await knexInstance('users').insert({
    id, email: userEmail, password_hash: 'hash',
    first_name: 'Test', last_name: 'User',
  })
  return id
}

/**
 * Create test account
 */
export async function createTestAccount(userId, id = 'test-account-1', name = 'Test Account') {
  await knexInstance('accounts').insert({
    id, user_id: userId, name, type: 'checking',
    initial_balance: 1000, current_balance: 1000,
  })
  return id
}

/**
 * Create test category
 */
export async function createTestCategory(userId, id = 'test-category-1', name = 'Test Category') {
  await knexInstance('categories').insert({
    id, user_id: userId, name, type: 'expense', icon: 'tag', color: '#000000',
  })
  return id
}

/**
 * Create test payee
 */
export async function createTestPayee(userId, id = 'test-payee-1', name = 'Test Payee') {
  await knexInstance('payees').insert({ id, user_id: userId, name })
  return id
}

/**
 * Create test transaction
 */
export async function createTestTransaction(userId, accountId, data = {}) {
  const id = data.id || `test-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const defaults = {
    categoryId: null,
    payeeId: null,
    amount: -100,
    description: 'Test Transaction',
    date: '2026-01-15',
    status: 'pending',
    type: 'expense',
    isReconciled: false,
  }
  const tx = { ...defaults, ...data }

  await knexInstance('transactions').insert({
    id, user_id: userId, account_id: accountId,
    category_id: tx.categoryId, payee_id: tx.payeeId,
    amount: tx.amount, description: tx.description,
    date: tx.date, status: tx.status, type: tx.type,
    is_reconciled: tx.isReconciled,
  })

  return id
}

/**
 * Create test transfer with linked transactions
 * @returns {Promise<{ sourceId: string, destId: string }>}
 */
export async function createTestTransfer(userId, sourceAccountId, destAccountId, data = {}) {
  const sourceId = data.sourceId || `test-tx-src-${Date.now()}`
  const destId = data.destId || `test-tx-dest-${Date.now()}`
  const defaults = {
    categoryId: null,
    payeeId: null,
    amount: 100,
    description: 'Test Transfer',
    date: '2026-01-15',
    status: 'pending',
  }
  const tx = { ...defaults, ...data }

  await knexInstance('transactions').insert({
    id: sourceId, user_id: userId, account_id: sourceAccountId,
    category_id: tx.categoryId, payee_id: tx.payeeId,
    amount: -Math.abs(tx.amount), description: tx.description,
    date: tx.date, status: tx.status, type: 'transfer',
  })

  await knexInstance('transactions').insert({
    id: destId, user_id: userId, account_id: destAccountId,
    category_id: tx.categoryId, payee_id: tx.payeeId,
    amount: Math.abs(tx.amount), description: tx.description,
    date: tx.date, status: tx.status, type: 'transfer',
  })

  await knexInstance('transactions').where('id', sourceId).update({ linked_transaction_id: destId })
  await knexInstance('transactions').where('id', destId).update({ linked_transaction_id: sourceId })

  return { sourceId, destId }
}
