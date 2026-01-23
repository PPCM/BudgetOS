/**
 * Transaction model tests
 * Tests sorting, filtering, and NULLS LAST behavior
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import {
  setupTestDb,
  closeTestDb,
  resetTestDb,
  getTestDb,
  createTestUser,
  createTestAccount,
  createTestCategory,
  createTestPayee,
  createTestTransaction,
  createTestTransfer,
} from '../setup.js'

// Mock the database connection module
vi.mock('../../src/database/connection.js', async () => {
  const actual = await vi.importActual('../setup.js')
  return {
    query: {
      all: (sql, params = []) => {
        const db = actual.getTestDb()
        const stmt = db.prepare(sql)
        stmt.bind(params.map(p => p === undefined ? null : p))
        const results = []
        const columns = stmt.getColumnNames()
        while (stmt.step()) {
          const row = stmt.get()
          const obj = {}
          columns.forEach((col, i) => { obj[col] = row[i] })
          results.push(obj)
        }
        stmt.free()
        return results
      },
      get: (sql, params = []) => {
        const db = actual.getTestDb()
        const stmt = db.prepare(sql)
        stmt.bind(params.map(p => p === undefined ? null : p))
        const results = []
        const columns = stmt.getColumnNames()
        while (stmt.step()) {
          const row = stmt.get()
          const obj = {}
          columns.forEach((col, i) => { obj[col] = row[i] })
          results.push(obj)
        }
        stmt.free()
        return results.length > 0 ? results[0] : null
      },
      run: (sql, params = []) => {
        const db = actual.getTestDb()
        db.run(sql, params.map(p => p === undefined ? null : p))
        return { changes: db.getRowsModified() }
      },
    },
    transaction: (fn) => fn(),
    getDatabase: () => actual.getTestDb(),
  }
})

// Import after mocking
const { Transaction } = await import('../../src/models/Transaction.js')

describe('Transaction.findByUser', () => {
  let userId
  let accountId
  let categoryId
  let payeeId

  beforeAll(async () => {
    await setupTestDb()
  })

  afterAll(() => {
    closeTestDb()
  })

  beforeEach(() => {
    resetTestDb()
    userId = createTestUser()
    accountId = createTestAccount(userId)
    categoryId = createTestCategory(userId, 'cat-1', 'Groceries')
    payeeId = createTestPayee(userId, 'payee-1', 'Supermarket')
  })

  describe('basic filtering', () => {
    it('returns transactions for user', () => {
      createTestTransaction(userId, accountId, { id: 'tx-1', description: 'Transaction 1' })
      createTestTransaction(userId, accountId, { id: 'tx-2', description: 'Transaction 2' })

      const result = Transaction.findByUser(userId)

      expect(result.data).toHaveLength(2)
      expect(result.pagination.total).toBe(2)
    })

    it('filters by accountId', () => {
      const account2 = createTestAccount(userId, 'acc-2', 'Account 2')
      createTestTransaction(userId, accountId, { id: 'tx-1' })
      createTestTransaction(userId, account2, { id: 'tx-2' })

      const result = Transaction.findByUser(userId, { accountId })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].accountId).toBe(accountId)
    })

    it('filters by isReconciled', () => {
      createTestTransaction(userId, accountId, { id: 'tx-1', isReconciled: 1 })
      createTestTransaction(userId, accountId, { id: 'tx-2', isReconciled: 0 })

      const reconciledResult = Transaction.findByUser(userId, { isReconciled: 'true' })
      expect(reconciledResult.data).toHaveLength(1)
      expect(reconciledResult.data[0].isReconciled).toBe(true)

      const notReconciledResult = Transaction.findByUser(userId, { isReconciled: 'false' })
      expect(notReconciledResult.data).toHaveLength(1)
      expect(notReconciledResult.data[0].isReconciled).toBe(false)
    })

    it('filters by date range', () => {
      createTestTransaction(userId, accountId, { id: 'tx-1', date: '2026-01-10' })
      createTestTransaction(userId, accountId, { id: 'tx-2', date: '2026-01-15' })
      createTestTransaction(userId, accountId, { id: 'tx-3', date: '2026-01-20' })

      const result = Transaction.findByUser(userId, {
        startDate: '2026-01-12',
        endDate: '2026-01-18',
      })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].date).toBe('2026-01-15')
    })

    it('searches in description and notes', () => {
      createTestTransaction(userId, accountId, { id: 'tx-1', description: 'Grocery shopping' })
      createTestTransaction(userId, accountId, { id: 'tx-2', description: 'Restaurant' })

      const result = Transaction.findByUser(userId, { search: 'grocery' })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].description).toBe('Grocery shopping')
    })
  })

  describe('sorting', () => {
    it('sorts by date descending by default', () => {
      createTestTransaction(userId, accountId, { id: 'tx-1', date: '2026-01-10' })
      createTestTransaction(userId, accountId, { id: 'tx-2', date: '2026-01-20' })
      createTestTransaction(userId, accountId, { id: 'tx-3', date: '2026-01-15' })

      const result = Transaction.findByUser(userId)

      expect(result.data[0].date).toBe('2026-01-20')
      expect(result.data[1].date).toBe('2026-01-15')
      expect(result.data[2].date).toBe('2026-01-10')
    })

    it('sorts by date ascending', () => {
      createTestTransaction(userId, accountId, { id: 'tx-1', date: '2026-01-10' })
      createTestTransaction(userId, accountId, { id: 'tx-2', date: '2026-01-20' })
      createTestTransaction(userId, accountId, { id: 'tx-3', date: '2026-01-15' })

      const result = Transaction.findByUser(userId, { sortBy: 'date', sortOrder: 'asc' })

      expect(result.data[0].date).toBe('2026-01-10')
      expect(result.data[1].date).toBe('2026-01-15')
      expect(result.data[2].date).toBe('2026-01-20')
    })

    it('sorts by amount', () => {
      createTestTransaction(userId, accountId, { id: 'tx-1', amount: -50 })
      createTestTransaction(userId, accountId, { id: 'tx-2', amount: -200 })
      createTestTransaction(userId, accountId, { id: 'tx-3', amount: -100 })

      const result = Transaction.findByUser(userId, { sortBy: 'amount', sortOrder: 'desc' })

      expect(result.data[0].amount).toBe(-50)
      expect(result.data[1].amount).toBe(-100)
      expect(result.data[2].amount).toBe(-200)
    })

    it('sorts by description', () => {
      createTestTransaction(userId, accountId, { id: 'tx-1', description: 'Charlie' })
      createTestTransaction(userId, accountId, { id: 'tx-2', description: 'Alice' })
      createTestTransaction(userId, accountId, { id: 'tx-3', description: 'Bob' })

      const result = Transaction.findByUser(userId, { sortBy: 'description', sortOrder: 'asc' })

      expect(result.data[0].description).toBe('Alice')
      expect(result.data[1].description).toBe('Bob')
      expect(result.data[2].description).toBe('Charlie')
    })
  })

  describe('NULLS LAST behavior for nullable fields', () => {
    it('sorts by payee with NULL values last (ascending)', () => {
      createTestTransaction(userId, accountId, { id: 'tx-1', payeeId: null, description: 'No payee' })
      createTestTransaction(userId, accountId, { id: 'tx-2', payeeId, description: 'With payee' })

      const result = Transaction.findByUser(userId, { sortBy: 'payee', sortOrder: 'asc' })

      // Non-null payee should come first
      expect(result.data[0].payeeName).toBe('Supermarket')
      expect(result.data[1].payeeName).toBeNull()
    })

    it('sorts by payee with NULL values last (descending)', () => {
      createTestTransaction(userId, accountId, { id: 'tx-1', payeeId: null, description: 'No payee' })
      createTestTransaction(userId, accountId, { id: 'tx-2', payeeId, description: 'With payee' })

      const result = Transaction.findByUser(userId, { sortBy: 'payee', sortOrder: 'desc' })

      // Non-null payee should come first even in descending
      expect(result.data[0].payeeName).toBe('Supermarket')
      expect(result.data[1].payeeName).toBeNull()
    })

    it('sorts by category with NULL values last', () => {
      createTestTransaction(userId, accountId, { id: 'tx-1', categoryId: null, description: 'No category' })
      createTestTransaction(userId, accountId, { id: 'tx-2', categoryId, description: 'With category' })

      const result = Transaction.findByUser(userId, { sortBy: 'category', sortOrder: 'asc' })

      expect(result.data[0].categoryName).toBe('Groceries')
      expect(result.data[1].categoryName).toBeNull()
    })

    it('handles multiple NULL values correctly', () => {
      createTestTransaction(userId, accountId, { id: 'tx-1', payeeId: null })
      createTestTransaction(userId, accountId, { id: 'tx-2', payeeId: null })
      createTestTransaction(userId, accountId, { id: 'tx-3', payeeId })

      const result = Transaction.findByUser(userId, { sortBy: 'payee', sortOrder: 'asc' })

      expect(result.data[0].payeeName).toBe('Supermarket')
      expect(result.data[1].payeeName).toBeNull()
      expect(result.data[2].payeeName).toBeNull()
    })
  })

  describe('pagination', () => {
    it('paginates results', () => {
      for (let i = 1; i <= 15; i++) {
        createTestTransaction(userId, accountId, { id: `tx-${i}`, date: `2026-01-${String(i).padStart(2, '0')}` })
      }

      const page1 = Transaction.findByUser(userId, { page: 1, limit: 10 })
      expect(page1.data).toHaveLength(10)
      expect(page1.pagination.page).toBe(1)
      expect(page1.pagination.total).toBe(15)
      expect(page1.pagination.totalPages).toBe(2)

      const page2 = Transaction.findByUser(userId, { page: 2, limit: 10 })
      expect(page2.data).toHaveLength(5)
      expect(page2.pagination.page).toBe(2)
    })

    it('respects custom limit', () => {
      for (let i = 1; i <= 5; i++) {
        createTestTransaction(userId, accountId, { id: `tx-${i}` })
      }

      const result = Transaction.findByUser(userId, { limit: 3 })

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

  beforeAll(async () => {
    await setupTestDb()
  })

  afterAll(() => {
    closeTestDb()
  })

  beforeEach(() => {
    resetTestDb()
    userId = createTestUser()
    sourceAccountId = createTestAccount(userId, 'source-account', 'Source Account')
    destAccountId = createTestAccount(userId, 'dest-account', 'Dest Account')
    account3Id = createTestAccount(userId, 'account-3', 'Account 3')
  })

  it('updates shared fields on both linked transactions', () => {
    const { sourceId, destId } = createTestTransfer(userId, sourceAccountId, destAccountId, {
      description: 'Original Transfer',
      amount: 100,
    })

    Transaction.update(sourceId, userId, {
      description: 'Updated Transfer',
      date: '2026-02-01',
    })

    const sourceTx = Transaction.findById(sourceId, userId)
    const destTx = Transaction.findById(destId, userId)

    expect(sourceTx.description).toBe('Updated Transfer')
    expect(sourceTx.date).toBe('2026-02-01')
    expect(destTx.description).toBe('Updated Transfer')
    expect(destTx.date).toBe('2026-02-01')
  })

  it('updates amount on both transactions with correct signs', () => {
    const { sourceId, destId } = createTestTransfer(userId, sourceAccountId, destAccountId, {
      amount: 100,
    })

    Transaction.update(sourceId, userId, { amount: 200 })

    const sourceTx = Transaction.findById(sourceId, userId)
    const destTx = Transaction.findById(destId, userId)

    expect(sourceTx.amount).toBe(-200) // Negative on source
    expect(destTx.amount).toBe(200)    // Positive on destination
  })

  it('changes destination account - deletes old linked tx and creates new one', () => {
    const { sourceId, destId } = createTestTransfer(userId, sourceAccountId, destAccountId, {
      description: 'Transfer to change',
      amount: 150,
    })

    Transaction.update(sourceId, userId, { toAccountId: account3Id })

    const sourceTx = Transaction.findById(sourceId, userId)
    const oldDestTx = Transaction.findById(destId, userId)
    const newDestTx = Transaction.findById(sourceTx.linkedTransactionId, userId)

    // Old destination should be deleted
    expect(oldDestTx).toBeNull()

    // New destination should exist on account 3
    expect(newDestTx).not.toBeNull()
    expect(newDestTx.accountId).toBe(account3Id)
    expect(newDestTx.amount).toBe(150)
    expect(newDestTx.description).toBe('Transfer to change')
  })

  it('removes destination account - deletes linked transaction', () => {
    const { sourceId, destId } = createTestTransfer(userId, sourceAccountId, destAccountId)

    Transaction.update(sourceId, userId, { toAccountId: null })

    const sourceTx = Transaction.findById(sourceId, userId)
    const destTx = Transaction.findById(destId, userId)

    expect(sourceTx.linkedTransactionId).toBeNull()
    expect(destTx).toBeNull()
  })

  it('adds destination account to transfer without linked transaction', () => {
    // Create a transfer without linked transaction (external transfer)
    const txId = createTestTransaction(userId, sourceAccountId, {
      type: 'transfer',
      amount: -100,
      description: 'External Transfer',
    })

    Transaction.update(txId, userId, { toAccountId: destAccountId })

    const sourceTx = Transaction.findById(txId, userId)
    const destTx = Transaction.findById(sourceTx.linkedTransactionId, userId)

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

  beforeAll(async () => {
    await setupTestDb()
  })

  afterAll(() => {
    closeTestDb()
  })

  beforeEach(() => {
    resetTestDb()
    userId = createTestUser()
    accountId = createTestAccount(userId)
  })

  it('toggles reconciliation status from false to true', () => {
    const txId = createTestTransaction(userId, accountId, { isReconciled: 0, status: 'pending' })

    const result = Transaction.toggleReconcile(userId, txId)

    expect(result.isReconciled).toBe(true)
    expect(result.status).toBe('reconciled')
    expect(result.reconciledAt).toBeTruthy()
  })

  it('toggles reconciliation status from true to false', () => {
    const txId = createTestTransaction(userId, accountId, { isReconciled: 1, status: 'reconciled' })

    const result = Transaction.toggleReconcile(userId, txId)

    expect(result.isReconciled).toBe(false)
    expect(result.status).toBe('cleared')
    expect(result.reconciledAt).toBeNull()
  })
})
