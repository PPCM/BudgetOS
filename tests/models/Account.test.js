/**
 * Account model tests
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import {
  setupTestDb,
  closeTestDb,
  resetTestDb,
  getTestDb,
  createTestUser,
  createTestAccount,
  createTestTransaction,
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
const { Account } = await import('../../src/models/Account.js')

describe('Account.create', () => {
  let userId

  beforeAll(async () => {
    await setupTestDb()
  })

  afterAll(() => {
    closeTestDb()
  })

  beforeEach(() => {
    resetTestDb()
    userId = createTestUser()
  })

  it('creates account with required fields', () => {
    const account = Account.create(userId, {
      name: 'Checking',
      type: 'checking',
    })

    expect(account).not.toBeNull()
    expect(account.name).toBe('Checking')
    expect(account.type).toBe('checking')
    expect(account.userId).toBe(userId)
  })

  it('creates account with default values', () => {
    const account = Account.create(userId, {
      name: 'Test',
      type: 'savings',
    })

    expect(account.initialBalance).toBe(0)
    expect(account.currentBalance).toBe(0)
    expect(account.currency).toBe('EUR')
    expect(account.color).toBe('#3B82F6')
    expect(account.icon).toBe('wallet')
    expect(account.isIncludedInTotal).toBe(true)
  })

  it('creates account with custom values', () => {
    const account = Account.create(userId, {
      name: 'Savings',
      type: 'savings',
      initialBalance: 1000,
      currency: 'USD',
      color: '#FF0000',
      icon: 'piggy-bank',
      isIncludedInTotal: false,
      institution: 'My Bank',
    })

    expect(account.initialBalance).toBe(1000)
    expect(account.currentBalance).toBe(1000)
    expect(account.currency).toBe('USD')
    expect(account.color).toBe('#FF0000')
    expect(account.icon).toBe('piggy-bank')
    expect(account.isIncludedInTotal).toBe(false)
    expect(account.institution).toBe('My Bank')
  })
})

describe('Account.findById', () => {
  let userId

  beforeAll(async () => {
    await setupTestDb()
  })

  afterAll(() => {
    closeTestDb()
  })

  beforeEach(() => {
    resetTestDb()
    userId = createTestUser()
  })

  it('returns account when found', () => {
    const accountId = createTestAccount(userId, 'acc-1', 'Test Account')
    const account = Account.findById(accountId, userId)

    expect(account).not.toBeNull()
    expect(account.id).toBe(accountId)
    expect(account.name).toBe('Test Account')
  })

  it('returns null when account not found', () => {
    const account = Account.findById('non-existent', userId)
    expect(account).toBeNull()
  })

  it('returns null when user does not own account', () => {
    const otherUserId = createTestUser('other-user')
    const accountId = createTestAccount(otherUserId, 'acc-1', 'Other Account')

    const account = Account.findById(accountId, userId)
    expect(account).toBeNull()
  })
})

describe('Account.findByIdOrFail', () => {
  let userId

  beforeAll(async () => {
    await setupTestDb()
  })

  afterAll(() => {
    closeTestDb()
  })

  beforeEach(() => {
    resetTestDb()
    userId = createTestUser()
  })

  it('returns account when found', () => {
    const accountId = createTestAccount(userId)
    const account = Account.findByIdOrFail(accountId, userId)
    expect(account).not.toBeNull()
  })

  it('throws NotFoundError when account not found', () => {
    expect(() => Account.findByIdOrFail('non-existent', userId))
      .toThrow('Compte non trouvé')
  })
})

describe('Account.findByUser', () => {
  let userId

  beforeAll(async () => {
    await setupTestDb()
  })

  afterAll(() => {
    closeTestDb()
  })

  beforeEach(() => {
    resetTestDb()
    userId = createTestUser()
  })

  it('returns all accounts for user', () => {
    createTestAccount(userId, 'acc-1', 'Account 1')
    createTestAccount(userId, 'acc-2', 'Account 2')

    const result = Account.findByUser(userId)

    expect(result.data).toHaveLength(2)
  })

  it('filters by account type', () => {
    // Using createTestAccount which creates 'checking' type
    createTestAccount(userId, 'acc-1', 'Checking')

    const result = Account.findByUser(userId, { type: 'checking' })

    expect(result.data).toHaveLength(1)
    expect(result.data[0].type).toBe('checking')
  })

  it('includes totals by default', () => {
    createTestAccount(userId, 'acc-1', 'Account 1')

    const result = Account.findByUser(userId)

    expect(result.totals).not.toBeNull()
    expect(result.totals.totalBalance).toBeDefined()
    expect(result.totals.accountCount).toBe(1)
  })

  it('excludes totals when requested', () => {
    createTestAccount(userId, 'acc-1', 'Account 1')

    const result = Account.findByUser(userId, { includeBalance: false })

    expect(result.totals).toBeNull()
  })

  it('orders by sort_order and name', () => {
    // Create accounts in reverse alphabetical order
    const db = getTestDb()
    db.run(`INSERT INTO accounts (id, user_id, name, type, initial_balance, current_balance, sort_order)
            VALUES ('acc-b', ?, 'B Account', 'checking', 0, 0, 2)`, [userId])
    db.run(`INSERT INTO accounts (id, user_id, name, type, initial_balance, current_balance, sort_order)
            VALUES ('acc-a', ?, 'A Account', 'checking', 0, 0, 1)`, [userId])

    const result = Account.findByUser(userId)

    expect(result.data[0].name).toBe('A Account')
    expect(result.data[1].name).toBe('B Account')
  })
})

describe('Account.update', () => {
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

  it('updates allowed fields', () => {
    const updated = Account.update(accountId, userId, {
      name: 'Updated Name',
      color: '#00FF00',
    })

    expect(updated.name).toBe('Updated Name')
    expect(updated.color).toBe('#00FF00')
  })

  it('converts camelCase to snake_case', () => {
    const updated = Account.update(accountId, userId, {
      isIncludedInTotal: false,
    })

    expect(updated.isIncludedInTotal).toBe(false)
  })

  it('throws NotFoundError for non-existent account', () => {
    expect(() => Account.update('non-existent', userId, { name: 'Test' }))
      .toThrow('Compte non trouvé')
  })
})

describe('Account.updateBalance', () => {
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
    // Create account with initial balance of 1000
    const db = getTestDb()
    db.run(`INSERT INTO accounts (id, user_id, name, type, initial_balance, current_balance)
            VALUES ('test-account', ?, 'Test Account', 'checking', 1000, 1000)`, [userId])
    accountId = 'test-account'
  })

  it('calculates balance from initial balance and transactions', () => {
    createTestTransaction(userId, accountId, { amount: -100 })
    createTestTransaction(userId, accountId, { amount: -50 })
    createTestTransaction(userId, accountId, { amount: 200 })

    const newBalance = Account.updateBalance(accountId, userId)

    // 1000 + (-100) + (-50) + 200 = 1050
    expect(newBalance).toBe(1050)
  })

  it('handles account with no transactions', () => {
    const newBalance = Account.updateBalance(accountId, userId)
    expect(newBalance).toBe(1000) // Just initial balance
  })
})

describe('Account.calculateTotals', () => {
  let userId

  beforeAll(async () => {
    await setupTestDb()
  })

  afterAll(() => {
    closeTestDb()
  })

  beforeEach(() => {
    resetTestDb()
    userId = createTestUser()
  })

  it('calculates total balance', () => {
    const db = getTestDb()
    db.run(`INSERT INTO accounts (id, user_id, name, type, current_balance, is_included_in_total)
            VALUES ('acc-1', ?, 'Account 1', 'checking', 1000, 1)`, [userId])
    db.run(`INSERT INTO accounts (id, user_id, name, type, current_balance, is_included_in_total)
            VALUES ('acc-2', ?, 'Account 2', 'savings', 2000, 1)`, [userId])

    const totals = Account.calculateTotals(userId)

    expect(totals.totalBalance).toBe(3000)
    expect(totals.accountCount).toBe(2)
  })

  it('excludes accounts not included in total', () => {
    const db = getTestDb()
    db.run(`INSERT INTO accounts (id, user_id, name, type, current_balance, is_included_in_total)
            VALUES ('acc-1', ?, 'Account 1', 'checking', 1000, 1)`, [userId])
    db.run(`INSERT INTO accounts (id, user_id, name, type, current_balance, is_included_in_total)
            VALUES ('acc-2', ?, 'Account 2', 'checking', 500, 0)`, [userId])

    const totals = Account.calculateTotals(userId)

    expect(totals.totalBalance).toBe(1000)
  })

  it('calculates available vs investment balance', () => {
    const db = getTestDb()
    db.run(`INSERT INTO accounts (id, user_id, name, type, current_balance, is_included_in_total)
            VALUES ('acc-1', ?, 'Checking', 'checking', 1000, 1)`, [userId])
    db.run(`INSERT INTO accounts (id, user_id, name, type, current_balance, is_included_in_total)
            VALUES ('acc-2', ?, 'Investment', 'investment', 5000, 1)`, [userId])

    const totals = Account.calculateTotals(userId)

    expect(totals.availableBalance).toBe(1000)
    expect(totals.investmentBalance).toBe(5000)
    expect(totals.totalBalance).toBe(6000)
  })
})

describe('Account.delete', () => {
  let userId

  beforeAll(async () => {
    await setupTestDb()
  })

  afterAll(() => {
    closeTestDb()
  })

  beforeEach(() => {
    resetTestDb()
    userId = createTestUser()
  })

  it('soft deletes account with transactions', () => {
    const accountId = createTestAccount(userId)
    createTestTransaction(userId, accountId)

    const result = Account.delete(accountId, userId)

    expect(result.deleted).toBe(true)
    expect(result.softDelete).toBe(true)

    // Account should be inactive
    const db = getTestDb()
    const stmt = db.prepare('SELECT is_active FROM accounts WHERE id = ?')
    stmt.bind([accountId])
    stmt.step()
    const isActive = stmt.get()[0]
    stmt.free()
    expect(isActive).toBe(0)
  })

  it('hard deletes account without transactions', () => {
    const accountId = createTestAccount(userId)

    const result = Account.delete(accountId, userId)

    expect(result.deleted).toBe(true)
    expect(result.softDelete).toBe(false)

    // Account should not exist
    const db = getTestDb()
    const stmt = db.prepare('SELECT COUNT(*) FROM accounts WHERE id = ?')
    stmt.bind([accountId])
    stmt.step()
    const count = stmt.get()[0]
    stmt.free()
    expect(count).toBe(0)
  })

  it('throws NotFoundError for non-existent account', () => {
    expect(() => Account.delete('non-existent', userId))
      .toThrow('Compte non trouvé')
  })
})

describe('Account.format', () => {
  it('formats database row to API response', () => {
    const dbRow = {
      id: 'test-id',
      user_id: 'user-id',
      name: 'Test Account',
      type: 'checking',
      institution: 'My Bank',
      account_number: '1234',
      initial_balance: 1000,
      current_balance: 1500,
      currency: 'EUR',
      color: '#3B82F6',
      icon: 'wallet',
      is_active: 1,
      is_included_in_total: 1,
      notes: 'Some notes',
      sort_order: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-15',
    }

    const formatted = Account.format(dbRow)

    expect(formatted.id).toBe('test-id')
    expect(formatted.userId).toBe('user-id')
    expect(formatted.name).toBe('Test Account')
    expect(formatted.type).toBe('checking')
    expect(formatted.institution).toBe('My Bank')
    expect(formatted.accountNumber).toBe('1234')
    expect(formatted.initialBalance).toBe(1000)
    expect(formatted.currentBalance).toBe(1500)
    expect(formatted.currency).toBe('EUR')
    expect(formatted.color).toBe('#3B82F6')
    expect(formatted.icon).toBe('wallet')
    expect(formatted.isActive).toBe(true)
    expect(formatted.isIncludedInTotal).toBe(true)
    expect(formatted.notes).toBe('Some notes')
    expect(formatted.sortOrder).toBe(0)
    expect(formatted.createdAt).toBe('2026-01-01')
    expect(formatted.updatedAt).toBe('2026-01-15')
  })

  it('converts boolean fields correctly', () => {
    const dbRow = {
      id: 'test',
      is_active: 0,
      is_included_in_total: 0,
    }

    const formatted = Account.format(dbRow)

    expect(formatted.isActive).toBe(false)
    expect(formatted.isIncludedInTotal).toBe(false)
  })
})
