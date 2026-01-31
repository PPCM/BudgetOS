/**
 * PayeeAlias model tests
 * Uses an in-memory Knex (better-sqlite3) instance
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import {
  setupTestDb,
  closeTestDb,
  resetTestDb,
  createTestUser,
  createTestPayee,
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

// Import after mocking
const PayeeAlias = (await import('../../src/models/PayeeAlias.js')).default

beforeAll(async () => {
  await setupTestDb()
})

afterAll(async () => {
  await closeTestDb()
})

describe('PayeeAlias.create', () => {
  let userId, payeeId

  beforeEach(async () => {
    await resetTestDb()
    userId = await createTestUser()
    payeeId = await createTestPayee(userId, 'payee-1', 'Amazon')
  })

  it('creates an alias with required fields', async () => {
    const alias = await PayeeAlias.create(userId, {
      payeeId,
      bankDescription: 'CARTE 28/12/25 AMAZON EU CB*7166',
      normalizedPattern: 'amazon eu',
    })

    expect(alias).toBeDefined()
    expect(alias.payeeId).toBe(payeeId)
    expect(alias.payeeName).toBe('Amazon')
    expect(alias.normalizedPattern).toBe('amazon eu')
    expect(alias.bankDescription).toBe('CARTE 28/12/25 AMAZON EU CB*7166')
    expect(alias.source).toBe('import_learn')
    expect(alias.timesMatched).toBe(1)
  })

  it('creates an alias with custom source', async () => {
    const alias = await PayeeAlias.create(userId, {
      payeeId,
      bankDescription: 'AMAZON',
      normalizedPattern: 'amazon',
      source: 'manual',
    })

    expect(alias.source).toBe('manual')
  })
})

describe('PayeeAlias.findByPattern', () => {
  let userId, payeeId

  beforeEach(async () => {
    await resetTestDb()
    userId = await createTestUser()
    payeeId = await createTestPayee(userId, 'payee-1', 'Amazon')
    await PayeeAlias.create(userId, {
      payeeId,
      bankDescription: 'AMAZON EU',
      normalizedPattern: 'amazon eu',
    })
  })

  it('finds an alias by exact pattern', async () => {
    const alias = await PayeeAlias.findByPattern(userId, 'amazon eu')
    expect(alias).toBeDefined()
    expect(alias.payeeName).toBe('Amazon')
  })

  it('returns null for non-existent pattern', async () => {
    const alias = await PayeeAlias.findByPattern(userId, 'fnac')
    expect(alias).toBeNull()
  })
})

describe('PayeeAlias.findBestMatch', () => {
  let userId, payeeId1, payeeId2

  beforeEach(async () => {
    await resetTestDb()
    userId = await createTestUser()
    payeeId1 = await createTestPayee(userId, 'payee-1', 'Amazon')
    payeeId2 = await createTestPayee(userId, 'payee-2', 'PayPal')

    await PayeeAlias.create(userId, {
      payeeId: payeeId1,
      bankDescription: 'AMAZON EU',
      normalizedPattern: 'amazon eu',
    })
    await PayeeAlias.create(userId, {
      payeeId: payeeId2,
      bankDescription: 'PAYPAL',
      normalizedPattern: 'paypal',
    })
  })

  it('returns exact match first', async () => {
    const match = await PayeeAlias.findBestMatch(userId, 'amazon eu')
    expect(match).toBeDefined()
    expect(match.payeeName).toBe('Amazon')
  })

  it('returns substring match (pattern in merchantPattern)', async () => {
    const match = await PayeeAlias.findBestMatch(userId, 'paypal alipay eu')
    expect(match).toBeDefined()
    expect(match.payeeName).toBe('PayPal')
  })

  it('returns substring match (merchantPattern in pattern)', async () => {
    // Create an alias with a longer pattern
    await PayeeAlias.create(userId, {
      payeeId: payeeId1,
      bankDescription: 'AMAZON EU MARKETPLACE',
      normalizedPattern: 'amazon eu marketplace',
    })

    const match = await PayeeAlias.findBestMatch(userId, 'amazon eu')
    // Exact match should take priority
    expect(match).toBeDefined()
    expect(match.payeeName).toBe('Amazon')
  })

  it('returns null when no match', async () => {
    const match = await PayeeAlias.findBestMatch(userId, 'fnac')
    expect(match).toBeNull()
  })

  it('returns null for empty pattern', async () => {
    const match = await PayeeAlias.findBestMatch(userId, '')
    expect(match).toBeNull()
  })
})

describe('PayeeAlias.learnAlias', () => {
  let userId, payeeId

  beforeEach(async () => {
    await resetTestDb()
    userId = await createTestUser()
    payeeId = await createTestPayee(userId, 'payee-1', 'Amazon')
  })

  it('creates a new alias when pattern is new', async () => {
    const alias = await PayeeAlias.learnAlias(
      userId, payeeId, 'CARTE 28/12/25 AMAZON', 'amazon'
    )

    expect(alias).toBeDefined()
    expect(alias.payeeId).toBe(payeeId)
    expect(alias.timesMatched).toBe(1)
  })

  it('increments times_matched for existing pattern', async () => {
    await PayeeAlias.learnAlias(userId, payeeId, 'AMAZON', 'amazon')
    const alias = await PayeeAlias.learnAlias(userId, payeeId, 'AMAZON', 'amazon')

    expect(alias.timesMatched).toBe(2)
  })

  it('updates payee for existing pattern with different payee', async () => {
    const payeeId2 = await createTestPayee(userId, 'payee-2', 'Amazon Prime')
    await PayeeAlias.learnAlias(userId, payeeId, 'AMAZON', 'amazon')
    const alias = await PayeeAlias.learnAlias(userId, payeeId2, 'AMAZON', 'amazon')

    expect(alias.payeeId).toBe(payeeId2)
    expect(alias.timesMatched).toBe(2)
  })

  it('returns null for empty pattern', async () => {
    const result = await PayeeAlias.learnAlias(userId, payeeId, 'AMAZON', '')
    expect(result).toBeNull()
  })
})

describe('PayeeAlias.findByPayee', () => {
  let userId, payeeId

  beforeEach(async () => {
    await resetTestDb()
    userId = await createTestUser()
    payeeId = await createTestPayee(userId, 'payee-1', 'Amazon')
    await PayeeAlias.create(userId, {
      payeeId,
      bankDescription: 'AMAZON EU',
      normalizedPattern: 'amazon eu',
    })
    await PayeeAlias.create(userId, {
      payeeId,
      bankDescription: 'AMAZON FR',
      normalizedPattern: 'amazon fr',
    })
  })

  it('returns all aliases for a payee', async () => {
    const aliases = await PayeeAlias.findByPayee(payeeId, userId)
    expect(aliases).toHaveLength(2)
  })
})

describe('PayeeAlias.delete', () => {
  let userId, payeeId

  beforeEach(async () => {
    await resetTestDb()
    userId = await createTestUser()
    payeeId = await createTestPayee(userId, 'payee-1', 'Amazon')
  })

  it('deletes an existing alias', async () => {
    const alias = await PayeeAlias.create(userId, {
      payeeId,
      bankDescription: 'AMAZON',
      normalizedPattern: 'amazon',
    })

    const result = await PayeeAlias.delete(alias.id, userId)
    expect(result.deleted).toBe(true)

    const found = await PayeeAlias.findById(alias.id, userId)
    expect(found).toBeNull()
  })

  it('returns deleted false for non-existent alias', async () => {
    const result = await PayeeAlias.delete('non-existent', userId)
    expect(result.deleted).toBe(false)
  })
})
