/**
 * Transaction model tests
 * Tests sorting, filtering, NULLS LAST behavior, transfers, and reconciliation
 * Uses an in-memory Knex (better-sqlite3) instance
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import Knex from 'knex'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Create an in-memory Knex instance for testing
const testKnex = Knex({
  client: 'better-sqlite3',
  connection: { filename: ':memory:' },
  useNullAsDefault: true,
  pool: {
    afterCreate: (conn, cb) => {
      conn.pragma('foreign_keys = ON')
      cb()
    },
  },
  migrations: {
    directory: path.resolve(__dirname, '../../src/database/migrations'),
    sortDirsSeparately: true,
  },
})

// Mock the database connection module to return our test Knex instance
vi.mock('../../src/database/connection.js', () => {
  return {
    default: testKnex,
    knex: testKnex,
    initDatabase: async () => testKnex,
    closeDatabase: async () => {},
    transaction: async (fn) => testKnex.transaction(fn),
  }
})

// Import after mocking
const { Transaction } = await import('../../src/models/Transaction.js')
const { default: ImportService } = await import('../../src/services/importService.js')

// Helper functions
async function createTestUser(id = 'test-user-1', email = null) {
  const userEmail = email || `${id}@test.com`
  await testKnex('users').insert({
    id, email: userEmail, password_hash: 'hash',
    first_name: 'Test', last_name: 'User',
  })
  return id
}

async function createTestAccount(userId, id = 'test-account-1', name = 'Test Account') {
  await testKnex('accounts').insert({
    id, user_id: userId, name, type: 'checking',
    initial_balance: 1000, current_balance: 1000,
  })
  return id
}

async function createTestCategory(userId, id = 'test-category-1', name = 'Test Category') {
  await testKnex('categories').insert({
    id, user_id: userId, name, type: 'expense', icon: 'tag', color: '#000000',
  })
  return id
}

async function createTestPayee(userId, id = 'test-payee-1', name = 'Test Payee') {
  await testKnex('payees').insert({ id, user_id: userId, name })
  return id
}

async function createTestTransaction(userId, accountId, data = {}) {
  const id = data.id || `test-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const defaults = {
    categoryId: null, payeeId: null, amount: -100,
    description: 'Test Transaction', date: '2026-01-15',
    status: 'pending', type: 'expense', isReconciled: 0,
  }
  const tx = { ...defaults, ...data }

  await testKnex('transactions').insert({
    id, user_id: userId, account_id: accountId,
    category_id: tx.categoryId, payee_id: tx.payeeId,
    amount: tx.amount, description: tx.description,
    date: tx.date, status: tx.status, type: tx.type,
    is_reconciled: tx.isReconciled,
    check_number: tx.checkNumber || null,
  })

  return id
}

async function createTestTransfer(userId, sourceAccountId, destAccountId, data = {}) {
  const sourceId = data.sourceId || `test-tx-src-${Date.now()}`
  const destId = data.destId || `test-tx-dest-${Date.now()}`
  const defaults = {
    categoryId: null, payeeId: null, amount: 100,
    description: 'Test Transfer', date: '2026-01-15', status: 'pending',
  }
  const tx = { ...defaults, ...data }

  // Create source transaction (without link initially)
  await testKnex('transactions').insert({
    id: sourceId, user_id: userId, account_id: sourceAccountId,
    category_id: tx.categoryId, payee_id: tx.payeeId,
    amount: -Math.abs(tx.amount), description: tx.description,
    date: tx.date, status: tx.status, type: 'transfer',
  })

  // Create destination transaction (without link initially)
  await testKnex('transactions').insert({
    id: destId, user_id: userId, account_id: destAccountId,
    category_id: tx.categoryId, payee_id: tx.payeeId,
    amount: Math.abs(tx.amount), description: tx.description,
    date: tx.date, status: tx.status, type: 'transfer',
  })

  // Now update with the links
  await testKnex('transactions').where('id', sourceId).update({ linked_transaction_id: destId })
  await testKnex('transactions').where('id', destId).update({ linked_transaction_id: sourceId })

  return { sourceId, destId }
}

// Run migrations and setup
beforeAll(async () => {
  await testKnex.migrate.latest()
})

afterAll(async () => {
  await testKnex.destroy()
})

// Reset data before each test
beforeEach(async () => {
  const tables = [
    'transaction_splits', 'transactions', 'credit_card_cycles',
    'credit_cards', 'planned_transactions', 'categories',
    'payees', 'accounts', 'users',
  ]
  for (const table of tables) {
    try { await testKnex(table).del() } catch (e) { /* table may not exist */ }
  }
})

describe('Transaction.findByUser', () => {
  let userId
  let accountId
  let categoryId
  let payeeId

  beforeEach(async () => {
    userId = await createTestUser()
    accountId = await createTestAccount(userId)
    categoryId = await createTestCategory(userId, 'cat-1', 'Groceries')
    payeeId = await createTestPayee(userId, 'payee-1', 'Supermarket')
  })

  describe('basic filtering', () => {
    it('returns transactions for user', async () => {
      await createTestTransaction(userId, accountId, { id: 'tx-1', description: 'Transaction 1' })
      await createTestTransaction(userId, accountId, { id: 'tx-2', description: 'Transaction 2' })

      const result = await Transaction.findByUser(userId)

      expect(result.data).toHaveLength(2)
      expect(result.pagination.total).toBe(2)
    })

    it('filters by accountId', async () => {
      const account2 = await createTestAccount(userId, 'acc-2', 'Account 2')
      await createTestTransaction(userId, accountId, { id: 'tx-1' })
      await createTestTransaction(userId, account2, { id: 'tx-2' })

      const result = await Transaction.findByUser(userId, { accountId })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].accountId).toBe(accountId)
    })

    it('filters by isReconciled', async () => {
      await createTestTransaction(userId, accountId, { id: 'tx-1', isReconciled: 1 })
      await createTestTransaction(userId, accountId, { id: 'tx-2', isReconciled: 0 })

      const reconciledResult = await Transaction.findByUser(userId, { isReconciled: 'true' })
      expect(reconciledResult.data).toHaveLength(1)
      expect(reconciledResult.data[0].isReconciled).toBe(true)

      const notReconciledResult = await Transaction.findByUser(userId, { isReconciled: 'false' })
      expect(notReconciledResult.data).toHaveLength(1)
      expect(notReconciledResult.data[0].isReconciled).toBe(false)
    })

    it('filters by date range', async () => {
      await createTestTransaction(userId, accountId, { id: 'tx-1', date: '2026-01-10' })
      await createTestTransaction(userId, accountId, { id: 'tx-2', date: '2026-01-15' })
      await createTestTransaction(userId, accountId, { id: 'tx-3', date: '2026-01-20' })

      const result = await Transaction.findByUser(userId, {
        startDate: '2026-01-12',
        endDate: '2026-01-18',
      })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].date).toBe('2026-01-15')
    })

    it('searches in description and notes', async () => {
      await createTestTransaction(userId, accountId, { id: 'tx-1', description: 'Grocery shopping' })
      await createTestTransaction(userId, accountId, { id: 'tx-2', description: 'Restaurant' })

      const result = await Transaction.findByUser(userId, { search: 'grocery' })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].description).toBe('Grocery shopping')
    })

    it('searches by check number', async () => {
      await createTestTransaction(userId, accountId, { id: 'tx-1', description: 'Check payment', checkNumber: 'CHK-4567' })
      await createTestTransaction(userId, accountId, { id: 'tx-2', description: 'Card payment' })

      const result = await Transaction.findByUser(userId, { search: '4567' })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].description).toBe('Check payment')
    })
  })

  describe('sorting', () => {
    it('sorts by date descending by default', async () => {
      await createTestTransaction(userId, accountId, { id: 'tx-1', date: '2026-01-10' })
      await createTestTransaction(userId, accountId, { id: 'tx-2', date: '2026-01-20' })
      await createTestTransaction(userId, accountId, { id: 'tx-3', date: '2026-01-15' })

      const result = await Transaction.findByUser(userId)

      expect(result.data[0].date).toBe('2026-01-20')
      expect(result.data[1].date).toBe('2026-01-15')
      expect(result.data[2].date).toBe('2026-01-10')
    })

    it('sorts by date ascending', async () => {
      await createTestTransaction(userId, accountId, { id: 'tx-1', date: '2026-01-10' })
      await createTestTransaction(userId, accountId, { id: 'tx-2', date: '2026-01-20' })
      await createTestTransaction(userId, accountId, { id: 'tx-3', date: '2026-01-15' })

      const result = await Transaction.findByUser(userId, { sortBy: 'date', sortOrder: 'asc' })

      expect(result.data[0].date).toBe('2026-01-10')
      expect(result.data[1].date).toBe('2026-01-15')
      expect(result.data[2].date).toBe('2026-01-20')
    })

    it('sorts by amount', async () => {
      await createTestTransaction(userId, accountId, { id: 'tx-1', amount: -50 })
      await createTestTransaction(userId, accountId, { id: 'tx-2', amount: -200 })
      await createTestTransaction(userId, accountId, { id: 'tx-3', amount: -100 })

      const result = await Transaction.findByUser(userId, { sortBy: 'amount', sortOrder: 'desc' })

      expect(result.data[0].amount).toBe(-50)
      expect(result.data[1].amount).toBe(-100)
      expect(result.data[2].amount).toBe(-200)
    })

    it('sorts by description', async () => {
      await createTestTransaction(userId, accountId, { id: 'tx-1', description: 'Charlie' })
      await createTestTransaction(userId, accountId, { id: 'tx-2', description: 'Alice' })
      await createTestTransaction(userId, accountId, { id: 'tx-3', description: 'Bob' })

      const result = await Transaction.findByUser(userId, { sortBy: 'description', sortOrder: 'asc' })

      expect(result.data[0].description).toBe('Alice')
      expect(result.data[1].description).toBe('Bob')
      expect(result.data[2].description).toBe('Charlie')
    })
  })

  describe('NULLS LAST behavior for nullable fields', () => {
    it('sorts by payee with NULL values last (ascending)', async () => {
      await createTestTransaction(userId, accountId, { id: 'tx-1', payeeId: null, description: 'No payee' })
      await createTestTransaction(userId, accountId, { id: 'tx-2', payeeId, description: 'With payee' })

      const result = await Transaction.findByUser(userId, { sortBy: 'payee', sortOrder: 'asc' })

      // Non-null payee should come first
      expect(result.data[0].payeeName).toBe('Supermarket')
      expect(result.data[1].payeeName).toBeNull()
    })

    it('sorts by payee with NULL values last (descending)', async () => {
      await createTestTransaction(userId, accountId, { id: 'tx-1', payeeId: null, description: 'No payee' })
      await createTestTransaction(userId, accountId, { id: 'tx-2', payeeId, description: 'With payee' })

      const result = await Transaction.findByUser(userId, { sortBy: 'payee', sortOrder: 'desc' })

      // Non-null payee should come first even in descending
      expect(result.data[0].payeeName).toBe('Supermarket')
      expect(result.data[1].payeeName).toBeNull()
    })

    it('sorts by category with NULL values last', async () => {
      await createTestTransaction(userId, accountId, { id: 'tx-1', categoryId: null, description: 'No category' })
      await createTestTransaction(userId, accountId, { id: 'tx-2', categoryId, description: 'With category' })

      const result = await Transaction.findByUser(userId, { sortBy: 'category', sortOrder: 'asc' })

      expect(result.data[0].categoryName).toBe('Groceries')
      expect(result.data[1].categoryName).toBeNull()
    })

    it('handles multiple NULL values correctly', async () => {
      await createTestTransaction(userId, accountId, { id: 'tx-1', payeeId: null })
      await createTestTransaction(userId, accountId, { id: 'tx-2', payeeId: null })
      await createTestTransaction(userId, accountId, { id: 'tx-3', payeeId })

      const result = await Transaction.findByUser(userId, { sortBy: 'payee', sortOrder: 'asc' })

      expect(result.data[0].payeeName).toBe('Supermarket')
      expect(result.data[1].payeeName).toBeNull()
      expect(result.data[2].payeeName).toBeNull()
    })
  })

  describe('pagination', () => {
    it('paginates results', async () => {
      for (let i = 1; i <= 15; i++) {
        await createTestTransaction(userId, accountId, { id: `tx-${i}`, date: `2026-01-${String(i).padStart(2, '0')}` })
      }

      const page1 = await Transaction.findByUser(userId, { page: 1, limit: 10 })
      expect(page1.data).toHaveLength(10)
      expect(page1.pagination.page).toBe(1)
      expect(page1.pagination.total).toBe(15)
      expect(page1.pagination.totalPages).toBe(2)

      const page2 = await Transaction.findByUser(userId, { page: 2, limit: 10 })
      expect(page2.data).toHaveLength(5)
      expect(page2.pagination.page).toBe(2)
    })

    it('respects custom limit', async () => {
      for (let i = 1; i <= 5; i++) {
        await createTestTransaction(userId, accountId, { id: `tx-${i}` })
      }

      const result = await Transaction.findByUser(userId, { limit: 3 })

      expect(result.data).toHaveLength(3)
      expect(result.pagination.limit).toBe(3)
    })
  })
})

describe('Transaction.update for transfers', () => {
  let userId
  let sourceAccountId
  let destAccountId
  let account3Id

  beforeEach(async () => {
    userId = await createTestUser()
    sourceAccountId = await createTestAccount(userId, 'source-account', 'Source Account')
    destAccountId = await createTestAccount(userId, 'dest-account', 'Dest Account')
    account3Id = await createTestAccount(userId, 'account-3', 'Account 3')
  })

  it('updates shared fields on both linked transactions', async () => {
    const { sourceId, destId } = await createTestTransfer(userId, sourceAccountId, destAccountId, {
      description: 'Original Transfer',
      amount: 100,
    })

    await Transaction.update(sourceId, userId, {
      description: 'Updated Transfer',
      date: '2026-02-01',
    })

    const sourceTx = await Transaction.findById(sourceId, userId)
    const destTx = await Transaction.findById(destId, userId)

    expect(sourceTx.description).toBe('Updated Transfer')
    expect(sourceTx.date).toBe('2026-02-01')
    expect(destTx.description).toBe('Updated Transfer')
    expect(destTx.date).toBe('2026-02-01')
  })

  it('updates amount on both transactions with correct signs', async () => {
    const { sourceId, destId } = await createTestTransfer(userId, sourceAccountId, destAccountId, {
      amount: 100,
    })

    await Transaction.update(sourceId, userId, { amount: 200 })

    const sourceTx = await Transaction.findById(sourceId, userId)
    const destTx = await Transaction.findById(destId, userId)

    expect(sourceTx.amount).toBe(-200) // Negative on source
    expect(destTx.amount).toBe(200)    // Positive on destination
  })

  it('changes destination account - deletes old linked tx and creates new one', async () => {
    const { sourceId, destId } = await createTestTransfer(userId, sourceAccountId, destAccountId, {
      description: 'Transfer to change',
      amount: 150,
    })

    await Transaction.update(sourceId, userId, { toAccountId: account3Id })

    const sourceTx = await Transaction.findById(sourceId, userId)
    const oldDestTx = await Transaction.findById(destId, userId)
    const newDestTx = await Transaction.findById(sourceTx.linkedTransactionId, userId)

    // Old destination should be deleted
    expect(oldDestTx).toBeNull()

    // New destination should exist on account 3
    expect(newDestTx).not.toBeNull()
    expect(newDestTx.accountId).toBe(account3Id)
    expect(newDestTx.amount).toBe(150)
    expect(newDestTx.description).toBe('Transfer to change')
  })

  it('removes destination account - deletes linked transaction', async () => {
    const { sourceId, destId } = await createTestTransfer(userId, sourceAccountId, destAccountId)

    await Transaction.update(sourceId, userId, { toAccountId: null })

    const sourceTx = await Transaction.findById(sourceId, userId)
    const destTx = await Transaction.findById(destId, userId)

    expect(sourceTx.linkedTransactionId).toBeNull()
    expect(destTx).toBeNull()
  })

  it('adds destination account to transfer without linked transaction', async () => {
    // Create a transfer without linked transaction (external transfer)
    const txId = await createTestTransaction(userId, sourceAccountId, {
      type: 'transfer',
      amount: -100,
      description: 'External Transfer',
    })

    await Transaction.update(txId, userId, { toAccountId: destAccountId })

    const sourceTx = await Transaction.findById(txId, userId)
    const destTx = await Transaction.findById(sourceTx.linkedTransactionId, userId)

    expect(sourceTx.linkedTransactionId).not.toBeNull()
    expect(destTx).not.toBeNull()
    expect(destTx.accountId).toBe(destAccountId)
    expect(destTx.amount).toBe(100) // Positive on destination
    expect(destTx.description).toBe('External Transfer')
  })
})

describe('Transaction.toggleReconcile', () => {
  let userId
  let accountId

  beforeEach(async () => {
    userId = await createTestUser()
    accountId = await createTestAccount(userId)
  })

  it('toggles reconciliation status from false to true', async () => {
    const txId = await createTestTransaction(userId, accountId, { isReconciled: 0, status: 'pending' })

    const result = await Transaction.toggleReconcile(userId, txId)

    expect(result.isReconciled).toBe(true)
    expect(result.status).toBe('reconciled')
    expect(result.reconciledAt).toBeTruthy()
  })

  it('toggles reconciliation status from true to false', async () => {
    const txId = await createTestTransaction(userId, accountId, { isReconciled: 1, status: 'reconciled' })

    const result = await Transaction.toggleReconcile(userId, txId)

    expect(result.isReconciled).toBe(false)
    expect(result.status).toBe('cleared')
    expect(result.reconciledAt).toBeNull()
  })
})

describe('Transaction - check_number', () => {
  let userId
  let accountId

  beforeEach(async () => {
    userId = await createTestUser()
    accountId = await createTestAccount(userId)
  })

  it('creates expense with checkNumber', async () => {
    const tx = await Transaction.create(userId, {
      accountId,
      amount: -50,
      description: 'Check payment',
      date: '2026-01-15',
      type: 'expense',
      checkNumber: '001234',
    })

    expect(tx.checkNumber).toBe('001234')
  })

  it('creates income with checkNumber', async () => {
    const tx = await Transaction.create(userId, {
      accountId,
      amount: 200,
      description: 'Check received',
      date: '2026-01-15',
      type: 'income',
      checkNumber: '005678',
    })

    expect(tx.checkNumber).toBe('005678')
  })

  it('creates transaction without checkNumber defaults to null', async () => {
    const tx = await Transaction.create(userId, {
      accountId,
      amount: -30,
      description: 'No check',
      date: '2026-01-15',
      type: 'expense',
    })

    expect(tx.checkNumber).toBeNull()
  })

  it('updates checkNumber on existing transaction', async () => {
    const tx = await Transaction.create(userId, {
      accountId,
      amount: -50,
      description: 'To update',
      date: '2026-01-15',
      type: 'expense',
    })

    const updated = await Transaction.update(tx.id, userId, { checkNumber: '999' })
    expect(updated.checkNumber).toBe('999')
  })

  it('clears checkNumber by setting to null', async () => {
    const tx = await Transaction.create(userId, {
      accountId,
      amount: -50,
      description: 'Clear check',
      date: '2026-01-15',
      type: 'expense',
      checkNumber: '111',
    })

    const updated = await Transaction.update(tx.id, userId, { checkNumber: null })
    expect(updated.checkNumber).toBeNull()
  })
})

describe('Transaction.format', () => {
  it('formats database row to API response', () => {
    const dbRow = {
      id: 'test-id', user_id: 'user-id', account_id: 'acc-id',
      account_name: 'My Account', category_id: 'cat-id',
      category_name: 'Food', category_icon: 'utensils', category_color: '#FF0000',
      payee_id: 'payee-id', payee_name: 'Store', payee_image_url: null,
      credit_card_id: null, credit_card_cycle_id: null,
      amount: -42.50, description: 'Groceries', notes: 'Weekly',
      date: '2026-01-15', value_date: null, purchase_date: null, accounting_date: null,
      status: 'cleared', type: 'expense',
      is_recurring: 0, recurring_id: null,
      import_id: null, import_hash: null, external_id: null,
      is_reconciled: 1, reconciled_at: '2026-01-20',
      is_split: 0, parent_transaction_id: null,
      linked_transaction_id: null, linked_account_id: null, linked_account_name: null,
      has_attachments: 0, tags: '["food","weekly"]',
      check_number: '001234',
      created_at: '2026-01-15', updated_at: '2026-01-15',
    }

    const formatted = Transaction.format(dbRow)

    expect(formatted.id).toBe('test-id')
    expect(formatted.userId).toBe('user-id')
    expect(formatted.accountId).toBe('acc-id')
    expect(formatted.accountName).toBe('My Account')
    expect(formatted.categoryName).toBe('Food')
    expect(formatted.amount).toBe(-42.50)
    expect(formatted.isReconciled).toBe(true)
    expect(formatted.isRecurring).toBe(false)
    expect(formatted.tags).toEqual(['food', 'weekly'])
    expect(formatted.checkNumber).toBe('001234')
  })

  it('formats check_number as null when not set', () => {
    const dbRow = {
      id: 'test-id', check_number: null, tags: null,
    }
    const formatted = Transaction.format(dbRow)
    expect(formatted.checkNumber).toBeNull()
  })

  it('handles null tags', () => {
    const dbRow = { tags: null }
    const formatted = Transaction.format(dbRow)
    expect(formatted.tags).toEqual([])
  })

  it('converts boolean fields correctly', () => {
    const dbRow = {
      is_recurring: 1, is_reconciled: 0, is_split: 1, has_attachments: 0,
    }
    const formatted = Transaction.format(dbRow)
    expect(formatted.isRecurring).toBe(true)
    expect(formatted.isReconciled).toBe(false)
    expect(formatted.isSplit).toBe(true)
    expect(formatted.hasAttachments).toBe(false)
  })
})

describe('Transaction.findById', () => {
  let userId
  let accountId

  beforeEach(async () => {
    userId = await createTestUser()
    accountId = await createTestAccount(userId)
  })

  it('returns transaction when found', async () => {
    await createTestTransaction(userId, accountId, { id: 'tx-1', description: 'Found it' })

    const tx = await Transaction.findById('tx-1', userId)

    expect(tx).not.toBeNull()
    expect(tx.id).toBe('tx-1')
    expect(tx.description).toBe('Found it')
    expect(tx.accountName).toBe('Test Account')
  })

  it('returns null when transaction not found', async () => {
    const tx = await Transaction.findById('non-existent', userId)
    expect(tx).toBeNull()
  })

  it('returns null when user does not own transaction', async () => {
    const otherUser = await createTestUser('other-user')
    const otherAccount = await createTestAccount(otherUser, 'other-acc', 'Other Account')
    await createTestTransaction(otherUser, otherAccount, { id: 'tx-other' })

    const tx = await Transaction.findById('tx-other', userId)
    expect(tx).toBeNull()
  })
})

describe('Transaction.findByIdOrFail', () => {
  let userId
  let accountId

  beforeEach(async () => {
    userId = await createTestUser()
    accountId = await createTestAccount(userId)
  })

  it('returns transaction when found', async () => {
    await createTestTransaction(userId, accountId, { id: 'tx-1' })

    const tx = await Transaction.findByIdOrFail('tx-1', userId)
    expect(tx).not.toBeNull()
    expect(tx.id).toBe('tx-1')
  })

  it('throws NotFoundError when transaction not found', async () => {
    await expect(Transaction.findByIdOrFail('non-existent', userId))
      .rejects.toThrow('Transaction not found')
  })
})

describe('Transaction.delete', () => {
  let userId
  let accountId

  beforeEach(async () => {
    userId = await createTestUser()
    accountId = await createTestAccount(userId)
  })

  it('deletes a transaction', async () => {
    await createTestTransaction(userId, accountId, { id: 'tx-1' })

    const result = await Transaction.delete('tx-1', userId)
    expect(result.deleted).toBe(true)

    const tx = await Transaction.findById('tx-1', userId)
    expect(tx).toBeNull()
  })

  it('deletes linked transfer transactions', async () => {
    const destAccountId = await createTestAccount(userId, 'dest-acc', 'Dest Account')
    const { sourceId, destId } = await createTestTransfer(userId, accountId, destAccountId)

    await Transaction.delete(sourceId, userId)

    const sourceTx = await Transaction.findById(sourceId, userId)
    const destTx = await Transaction.findById(destId, userId)

    expect(sourceTx).toBeNull()
    expect(destTx).toBeNull()
  })

  it('throws NotFoundError for non-existent transaction', async () => {
    await expect(Transaction.delete('non-existent', userId))
      .rejects.toThrow('Transaction not found')
  })
})

describe('Transaction.reconcile', () => {
  let userId
  let accountId

  beforeEach(async () => {
    userId = await createTestUser()
    accountId = await createTestAccount(userId)
  })

  it('reconciles multiple transactions', async () => {
    await createTestTransaction(userId, accountId, { id: 'tx-1', status: 'cleared' })
    await createTestTransaction(userId, accountId, { id: 'tx-2', status: 'cleared' })

    const result = await Transaction.reconcile(userId, ['tx-1', 'tx-2'], '2026-01-20')

    expect(result.reconciled).toBe(2)

    const tx1 = await Transaction.findById('tx-1', userId)
    const tx2 = await Transaction.findById('tx-2', userId)

    expect(tx1.status).toBe('reconciled')
    expect(tx1.isReconciled).toBe(true)
    expect(tx2.status).toBe('reconciled')
    expect(tx2.isReconciled).toBe(true)
  })
})

describe('Transaction.findMatchCandidates', () => {
  let userId
  let accountId
  let payeeId

  beforeEach(async () => {
    userId = await createTestUser()
    accountId = await createTestAccount(userId)
    payeeId = await createTestPayee(userId, 'payee-match-1', 'Restaurant ABC')
  })

  it('returns candidates with exact same absolute amount', async () => {
    await createTestTransaction(userId, accountId, {
      id: 'cand-1', amount: -50, date: '2026-01-10', description: 'Payment',
    })
    await createTestTransaction(userId, accountId, {
      id: 'cand-2', amount: -75, date: '2026-01-10', description: 'Other',
    })

    const results = await Transaction.findMatchCandidates(userId, accountId, {
      amount: -50, date: '2026-01-15',
    })

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('cand-1')
  })

  it('sorts candidates by date proximity', async () => {
    await createTestTransaction(userId, accountId, {
      id: 'far', amount: -100, date: '2025-12-01', description: 'Far date',
    })
    await createTestTransaction(userId, accountId, {
      id: 'close', amount: -100, date: '2026-01-14', description: 'Close date',
    })

    const results = await Transaction.findMatchCandidates(userId, accountId, {
      amount: -100, date: '2026-01-15',
    })

    expect(results.length).toBe(2)
    expect(results[0].id).toBe('close')
    expect(results[1].id).toBe('far')
  })

  it('excludes reconciled transactions', async () => {
    await createTestTransaction(userId, accountId, {
      id: 'reconciled-tx', amount: -50, date: '2026-01-10',
      description: 'Reconciled', isReconciled: 1, status: 'reconciled',
    })
    await createTestTransaction(userId, accountId, {
      id: 'unreconciled-tx', amount: -50, date: '2026-01-10',
      description: 'Unreconciled',
    })

    const results = await Transaction.findMatchCandidates(userId, accountId, {
      amount: -50, date: '2026-01-15',
    })

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('unreconciled-tx')
  })

  it('includes payeeName in results', async () => {
    await createTestTransaction(userId, accountId, {
      id: 'with-payee', amount: -50, date: '2026-01-10',
      description: 'With Payee', payeeId,
    })

    const results = await Transaction.findMatchCandidates(userId, accountId, {
      amount: -50, date: '2026-01-15',
    })

    expect(results).toHaveLength(1)
    expect(results[0].payeeName).toBe('Restaurant ABC')
  })

  it('excludes void transactions', async () => {
    await createTestTransaction(userId, accountId, {
      id: 'void-tx', amount: -50, date: '2026-01-10',
      description: 'Void', status: 'void',
    })

    const results = await Transaction.findMatchCandidates(userId, accountId, {
      amount: -50, date: '2026-01-15',
    })

    expect(results).toHaveLength(0)
  })

  it('returns empty array when no candidates match', async () => {
    await createTestTransaction(userId, accountId, {
      id: 'no-match', amount: -999, date: '2026-01-10', description: 'Different amount',
    })

    const results = await Transaction.findMatchCandidates(userId, accountId, {
      amount: -50, date: '2026-01-15',
    })

    expect(results).toHaveLength(0)
  })
})

describe('ImportService.findMatches - excludes reconciled transactions', () => {
  let userId
  let accountId

  beforeEach(async () => {
    userId = await createTestUser()
    accountId = await createTestAccount(userId)
  })

  it('excludes reconciled transactions from automatic matching', async () => {
    // Create a reconciled transaction
    await createTestTransaction(userId, accountId, {
      id: 'reconciled-match', amount: -50, date: '2026-01-15',
      description: 'Payment A', isReconciled: 1,
    })
    // Create an unreconciled transaction with same amount/date
    await createTestTransaction(userId, accountId, {
      id: 'unreconciled-match', amount: -50, date: '2026-01-15',
      description: 'Payment B', isReconciled: 0,
    })

    const imported = [{ date: '2026-01-15', amount: -50, description: 'Payment', hash: 'unique-hash-1' }]
    const results = await ImportService.findMatches(userId, accountId, imported)

    expect(results).toHaveLength(1)
    // Should match the unreconciled one, not the reconciled one
    expect(results[0].matchType).not.toBe('new')
    expect(results[0].matchedTransaction.id).toBe('unreconciled-match')
  })

  it('returns new when only reconciled transactions match', async () => {
    await createTestTransaction(userId, accountId, {
      id: 'only-reconciled', amount: -50, date: '2026-01-15',
      description: 'Payment', isReconciled: 1,
    })

    const imported = [{ date: '2026-01-15', amount: -50, description: 'Payment', hash: 'unique-hash-2' }]
    const results = await ImportService.findMatches(userId, accountId, imported)

    expect(results).toHaveLength(1)
    expect(results[0].matchType).toBe('new')
    expect(results[0].matchedTransaction).toBeNull()
  })

  it('detects duplicates by hash even on reconciled transactions', async () => {
    const hash = 'dup-hash-reconciled'
    await createTestTransaction(userId, accountId, {
      id: 'reconciled-dup', amount: -50, date: '2026-01-15',
      description: 'Payment', isReconciled: 1,
    })
    // Manually set import_hash on the reconciled tx
    await testKnex('transactions').where('id', 'reconciled-dup').update({ import_hash: hash })

    const imported = [{ date: '2026-01-15', amount: -50, description: 'Payment', hash }]
    const results = await ImportService.findMatches(userId, accountId, imported)

    expect(results).toHaveLength(1)
    // Hash-based duplicate detection works even on reconciled transactions
    expect(results[0].matchType).toBe('duplicate')
  })
})
