/**
 * Test setup for backend tests
 * Creates an in-memory database for testing
 */
import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
let db = null
let SQL = null

/**
 * Initialize test database (in-memory)
 */
export async function setupTestDb() {
  SQL = await initSqlJs()
  db = new SQL.Database()
  db.run('PRAGMA foreign_keys = ON')

  // Load schema
  const schemaPath = path.join(__dirname, '../database/schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf8')
  db.exec(schema)

  // Apply migrations that are not in the schema
  db.run('ALTER TABLE transactions ADD COLUMN linked_transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL')
  db.run('ALTER TABLE planned_transactions ADD COLUMN payee_id TEXT REFERENCES payees(id) ON DELETE SET NULL')
  db.run('ALTER TABLE planned_transactions ADD COLUMN delete_on_end INTEGER DEFAULT 0')
  db.run('ALTER TABLE credit_cards ADD COLUMN expiration_date TEXT')

  return db
}

/**
 * Get the test database instance
 */
export function getTestDb() {
  if (!db) throw new Error('Test database not initialized. Call setupTestDb() first.')
  return db
}

/**
 * Close test database
 */
export function closeTestDb() {
  if (db) {
    db.close()
    db = null
  }
}

/**
 * Reset test database (clear all data)
 */
export function resetTestDb() {
  if (!db) return

  const tables = [
    'transaction_splits',
    'transactions',
    'credit_card_cycles',
    'credit_cards',
    'planned_transactions',
    'categories',
    'payees',
    'accounts',
    'users',
  ]

  for (const table of tables) {
    try {
      db.run(`DELETE FROM ${table}`)
    } catch (e) {
      // Table may not exist
    }
  }
}

/**
 * Create test user
 */
export function createTestUser(id = 'test-user-1') {
  db.run(`
    INSERT INTO users (id, email, password_hash, first_name, last_name)
    VALUES (?, 'test@test.com', 'hash', 'Test', 'User')
  `, [id])
  return id
}

/**
 * Create test account
 */
export function createTestAccount(userId, id = 'test-account-1', name = 'Test Account') {
  db.run(`
    INSERT INTO accounts (id, user_id, name, type, initial_balance, current_balance)
    VALUES (?, ?, ?, 'checking', 1000, 1000)
  `, [id, userId, name])
  return id
}

/**
 * Create test category
 */
export function createTestCategory(userId, id = 'test-category-1', name = 'Test Category') {
  db.run(`
    INSERT INTO categories (id, user_id, name, type, icon, color)
    VALUES (?, ?, ?, 'expense', 'tag', '#000000')
  `, [id, userId, name])
  return id
}

/**
 * Create test payee
 */
export function createTestPayee(userId, id = 'test-payee-1', name = 'Test Payee') {
  db.run(`
    INSERT INTO payees (id, user_id, name)
    VALUES (?, ?, ?)
  `, [id, userId, name])
  return id
}

/**
 * Create test transaction
 */
export function createTestTransaction(userId, accountId, data = {}) {
  const id = data.id || `test-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const defaults = {
    categoryId: null,
    payeeId: null,
    amount: -100,
    description: 'Test Transaction',
    date: '2026-01-15',
    status: 'pending',
    type: 'expense',
    isReconciled: 0,
  }
  const tx = { ...defaults, ...data }

  db.run(`
    INSERT INTO transactions (
      id, user_id, account_id, category_id, payee_id,
      amount, description, date, status, type, is_reconciled
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, userId, accountId, tx.categoryId, tx.payeeId,
    tx.amount, tx.description, tx.date, tx.status, tx.type, tx.isReconciled
  ])

  return id
}

/**
 * Create test transfer with linked transactions
 * @returns {{ sourceId: string, destId: string }} IDs of source and destination transactions
 */
export function createTestTransfer(userId, sourceAccountId, destAccountId, data = {}) {
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

  // Create source transaction first (without link)
  db.run(`
    INSERT INTO transactions (
      id, user_id, account_id, category_id, payee_id,
      amount, description, date, status, type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'transfer')
  `, [
    sourceId, userId, sourceAccountId, tx.categoryId, tx.payeeId,
    -Math.abs(tx.amount), tx.description, tx.date, tx.status
  ])

  // Create destination transaction (without link)
  db.run(`
    INSERT INTO transactions (
      id, user_id, account_id, category_id, payee_id,
      amount, description, date, status, type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'transfer')
  `, [
    destId, userId, destAccountId, tx.categoryId, tx.payeeId,
    Math.abs(tx.amount), tx.description, tx.date, tx.status
  ])

  // Now update with the links
  db.run('UPDATE transactions SET linked_transaction_id = ? WHERE id = ?', [destId, sourceId])
  db.run('UPDATE transactions SET linked_transaction_id = ? WHERE id = ?', [sourceId, destId])

  return { sourceId, destId }
}
