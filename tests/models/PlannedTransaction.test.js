/**
 * PlannedTransaction model tests
 * Uses an in-memory Knex (better-sqlite3) instance
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import {
  setupTestDb,
  closeTestDb,
  resetTestDb,
  getTestDb,
  createTestUser,
  createTestAccount,
} from '../setup.js'

// Mock the database connection module
vi.mock('../../src/database/connection.js', async () => {
  const setup = await vi.importActual('../setup.js')
  const knexInstance = await setup.setupTestDb()

  return {
    default: knexInstance,
    knex: knexInstance,
    initDatabase: async () => knexInstance,
    closeDatabase: async () => {},
    transaction: async (fn) => knexInstance.transaction(fn),
  }
})

// Mock Transaction.create to return a simple object
vi.mock('../../src/models/Transaction.js', () => {
  return {
    default: {
      create: vi.fn(async (userId, data) => ({
        id: 'tx-created',
        userId,
        ...data,
      })),
    },
  }
})

// Import after mocking
const { PlannedTransaction } = await import('../../src/models/PlannedTransaction.js')

// Single setup/teardown for all tests in this file
beforeAll(async () => {
  await setupTestDb()
})

afterAll(async () => {
  await closeTestDb()
})

describe('PlannedTransaction.calculateNextOccurrence', () => {
  it('returns start date when in the future', () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const startDate = futureDate.toISOString().split('T')[0]

    const result = PlannedTransaction.calculateNextOccurrence({
      startDate,
      frequency: 'monthly',
    })

    expect(result).toBe(startDate)
  })

  it('returns null for one-time past transaction', () => {
    const result = PlannedTransaction.calculateNextOccurrence({
      startDate: '2020-01-01',
      frequency: 'once',
    })

    expect(result).toBeNull()
  })

  it('advances monthly past today', () => {
    const result = PlannedTransaction.calculateNextOccurrence({
      startDate: '2020-01-15',
      frequency: 'monthly',
    })

    expect(result).not.toBeNull()
    const nextDate = new Date(result)
    expect(nextDate > new Date()).toBe(true)
  })

  it('returns null when next occurrence exceeds end date', () => {
    const result = PlannedTransaction.calculateNextOccurrence({
      startDate: '2020-01-01',
      endDate: '2020-02-01',
      frequency: 'annual',
    })

    expect(result).toBeNull()
  })

  it('advances weekly past today', () => {
    const result = PlannedTransaction.calculateNextOccurrence({
      startDate: '2020-01-01',
      frequency: 'weekly',
    })

    expect(result).not.toBeNull()
    const nextDate = new Date(result)
    expect(nextDate > new Date()).toBe(true)
    // Should be a Wednesday (2020-01-01 was Wednesday)
    expect(nextDate.getDay()).toBe(3)
  })

  it('advances daily past today', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 3)
    const result = PlannedTransaction.calculateNextOccurrence({
      startDate: yesterday.toISOString().split('T')[0],
      frequency: 'daily',
    })

    expect(result).not.toBeNull()
    const nextDate = new Date(result)
    expect(nextDate > new Date()).toBe(true)
  })
})

describe('PlannedTransaction.create', () => {
  let userId

  beforeEach(async () => {
    await resetTestDb()
    userId = await createTestUser()
    await createTestAccount(userId)
  })

  it('creates a planned transaction with required fields', async () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const startDate = futureDate.toISOString().split('T')[0]

    const pt = await PlannedTransaction.create(userId, {
      accountId: 'test-account-1',
      amount: 100,
      description: 'Monthly Rent',
      type: 'expense',
      frequency: 'monthly',
      startDate,
    })

    expect(pt).not.toBeNull()
    expect(pt.userId).toBe(userId)
    expect(pt.accountId).toBe('test-account-1')
    expect(pt.amount).toBe(100)
    expect(pt.description).toBe('Monthly Rent')
    expect(pt.type).toBe('expense')
    expect(pt.frequency).toBe('monthly')
    expect(pt.nextOccurrence).toBe(startDate)
  })

  it('creates a planned transaction with optional fields', async () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const startDate = futureDate.toISOString().split('T')[0]

    const pt = await PlannedTransaction.create(userId, {
      accountId: 'test-account-1',
      amount: 50,
      description: 'Subscription',
      type: 'expense',
      frequency: 'monthly',
      startDate,
      notes: 'Streaming service',
      executeBeforeHoliday: true,
      deleteOnEnd: true,
      daysBeforeCreate: 5,
      tags: ['streaming', 'entertainment'],
    })

    expect(pt).not.toBeNull()
    expect(pt.notes).toBe('Streaming service')
    expect(pt.executeBeforeHoliday).toBe(true)
    expect(pt.deleteOnEnd).toBe(true)
    expect(pt.daysBeforeCreate).toBe(5)
    expect(pt.tags).toEqual(['streaming', 'entertainment'])
  })
})

describe('PlannedTransaction.findById', () => {
  let userId

  beforeEach(async () => {
    await resetTestDb()
    userId = await createTestUser()
    await createTestAccount(userId)
  })

  it('returns planned transaction when found', async () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const startDate = futureDate.toISOString().split('T')[0]

    const created = await PlannedTransaction.create(userId, {
      accountId: 'test-account-1',
      amount: 100,
      description: 'Test PT',
      type: 'expense',
      frequency: 'monthly',
      startDate,
    })

    const found = await PlannedTransaction.findById(created.id, userId)
    expect(found).not.toBeNull()
    expect(found.id).toBe(created.id)
  })

  it('returns null when not found', async () => {
    const found = await PlannedTransaction.findById('non-existent', userId)
    expect(found).toBeNull()
  })

  it('returns null for wrong user', async () => {
    const otherUserId = await createTestUser('other-user')
    await createTestAccount(otherUserId, 'acc-other')

    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const startDate = futureDate.toISOString().split('T')[0]

    const created = await PlannedTransaction.create(otherUserId, {
      accountId: 'acc-other',
      amount: 100,
      description: 'Other PT',
      type: 'expense',
      frequency: 'monthly',
      startDate,
    })

    const found = await PlannedTransaction.findById(created.id, userId)
    expect(found).toBeNull()
  })
})

describe('PlannedTransaction.findByIdOrFail', () => {
  let userId

  beforeEach(async () => {
    await resetTestDb()
    userId = await createTestUser()
  })

  it('throws NotFoundError when not found', async () => {
    await expect(PlannedTransaction.findByIdOrFail('non-existent', userId))
      .rejects.toThrow('Transaction planifiée non trouvée')
  })
})

describe('PlannedTransaction.findByUser', () => {
  let userId

  beforeEach(async () => {
    await resetTestDb()
    userId = await createTestUser()
    await createTestAccount(userId)

    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const startDate = futureDate.toISOString().split('T')[0]

    await PlannedTransaction.create(userId, {
      accountId: 'test-account-1',
      amount: 100,
      description: 'PT 1',
      type: 'expense',
      frequency: 'monthly',
      startDate,
    })

    await PlannedTransaction.create(userId, {
      accountId: 'test-account-1',
      amount: 200,
      description: 'PT 2',
      type: 'income',
      frequency: 'weekly',
      startDate,
    })
  })

  it('returns all planned transactions for user', async () => {
    const result = await PlannedTransaction.findByUser(userId)

    expect(result.data).toHaveLength(2)
    expect(result.pagination.total).toBe(2)
  })

  it('filters by type', async () => {
    const result = await PlannedTransaction.findByUser(userId, { type: 'expense' })

    expect(result.data).toHaveLength(1)
    expect(result.data[0].type).toBe('expense')
  })

  it('filters by frequency', async () => {
    const result = await PlannedTransaction.findByUser(userId, { frequency: 'weekly' })

    expect(result.data).toHaveLength(1)
    expect(result.data[0].frequency).toBe('weekly')
  })

  it('paginates results', async () => {
    const result = await PlannedTransaction.findByUser(userId, { limit: 1, page: 1 })

    expect(result.data).toHaveLength(1)
    expect(result.pagination.total).toBe(2)
    expect(result.pagination.totalPages).toBe(2)
  })
})

describe('PlannedTransaction.update', () => {
  let userId

  beforeEach(async () => {
    await resetTestDb()
    userId = await createTestUser()
    await createTestAccount(userId)
  })

  it('updates allowed fields', async () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const startDate = futureDate.toISOString().split('T')[0]

    const created = await PlannedTransaction.create(userId, {
      accountId: 'test-account-1',
      amount: 100,
      description: 'Original',
      type: 'expense',
      frequency: 'monthly',
      startDate,
    })

    const updated = await PlannedTransaction.update(created.id, userId, {
      description: 'Updated',
      amount: 200,
    })

    expect(updated.description).toBe('Updated')
    expect(updated.amount).toBe(200)
  })

  it('recalculates next_occurrence when frequency changes', async () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const startDate = futureDate.toISOString().split('T')[0]

    const created = await PlannedTransaction.create(userId, {
      accountId: 'test-account-1',
      amount: 100,
      description: 'Test',
      type: 'expense',
      frequency: 'monthly',
      startDate,
    })

    const updated = await PlannedTransaction.update(created.id, userId, {
      frequency: 'weekly',
    })

    expect(updated.frequency).toBe('weekly')
    expect(updated.nextOccurrence).not.toBeNull()
  })

  it('throws NotFoundError for non-existent', async () => {
    await expect(PlannedTransaction.update('non-existent', userId, { description: 'Test' }))
      .rejects.toThrow('Transaction planifiée non trouvée')
  })
})

describe('PlannedTransaction.delete', () => {
  let userId

  beforeEach(async () => {
    await resetTestDb()
    userId = await createTestUser()
    await createTestAccount(userId)
  })

  it('deletes an existing planned transaction', async () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const startDate = futureDate.toISOString().split('T')[0]

    const created = await PlannedTransaction.create(userId, {
      accountId: 'test-account-1',
      amount: 100,
      description: 'To Delete',
      type: 'expense',
      frequency: 'monthly',
      startDate,
    })

    const result = await PlannedTransaction.delete(created.id, userId)
    expect(result.deleted).toBe(true)

    const found = await PlannedTransaction.findById(created.id, userId)
    expect(found).toBeNull()
  })

  it('throws NotFoundError for non-existent', async () => {
    await expect(PlannedTransaction.delete('non-existent', userId))
      .rejects.toThrow('Transaction planifiée non trouvée')
  })
})

describe('PlannedTransaction.format', () => {
  it('formats database row to API response', () => {
    const dbRow = {
      id: 'pt-1',
      user_id: 'user-1',
      account_id: 'acc-1',
      account_name: 'Checking',
      category_id: 'cat-1',
      category_name: 'Rent',
      category_icon: 'home',
      category_color: '#FF0000',
      payee_id: 'pay-1',
      payee_name: 'Landlord',
      payee_image_url: null,
      credit_card_id: null,
      to_account_id: null,
      to_account_name: null,
      amount: 1000,
      description: 'Monthly Rent',
      notes: 'Due on 1st',
      type: 'expense',
      frequency: 'monthly',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      next_occurrence: '2026-02-01',
      auto_create: 1,
      execute_before_holiday: 0,
      delete_on_end: 1,
      days_before_create: 3,
      is_active: 1,
      last_created_at: '2026-01-01',
      occurrences_created: 1,
      max_occurrences: 12,
      tags: '["rent","housing"]',
      created_at: '2026-01-01',
      updated_at: '2026-01-15',
    }

    const formatted = PlannedTransaction.format(dbRow)

    expect(formatted.id).toBe('pt-1')
    expect(formatted.userId).toBe('user-1')
    expect(formatted.accountId).toBe('acc-1')
    expect(formatted.accountName).toBe('Checking')
    expect(formatted.categoryId).toBe('cat-1')
    expect(formatted.categoryName).toBe('Rent')
    expect(formatted.payeeId).toBe('pay-1')
    expect(formatted.payeeName).toBe('Landlord')
    expect(formatted.amount).toBe(1000)
    expect(formatted.description).toBe('Monthly Rent')
    expect(formatted.frequency).toBe('monthly')
    expect(formatted.autoCreate).toBe(true)
    expect(formatted.executeBeforeHoliday).toBe(false)
    expect(formatted.deleteOnEnd).toBe(true)
    expect(formatted.isActive).toBe(true)
    expect(formatted.tags).toEqual(['rent', 'housing'])
    expect(formatted.maxOccurrences).toBe(12)
  })

  it('converts boolean fields correctly', () => {
    const dbRow = {
      id: 'pt-1',
      auto_create: 0,
      execute_before_holiday: 0,
      delete_on_end: 0,
      is_active: 0,
      tags: null,
    }

    const formatted = PlannedTransaction.format(dbRow)

    expect(formatted.autoCreate).toBe(false)
    expect(formatted.executeBeforeHoliday).toBe(false)
    expect(formatted.deleteOnEnd).toBe(false)
    expect(formatted.isActive).toBe(false)
    expect(formatted.tags).toEqual([])
  })
})
