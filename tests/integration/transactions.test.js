/**
 * Integration tests for /api/v1/transactions endpoints
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestApp, createAuthenticatedAgent, setupTestDb, closeTestDb, resetTestDb } from './helpers.js'

let app

beforeAll(async () => {
  await setupTestDb()
  app = await createTestApp()
})

afterAll(async () => {
  await closeTestDb()
})

let agent, csrfToken, accountId

beforeEach(async () => {
  await resetTestDb()
  const ctx = await createAuthenticatedAgent(app)
  agent = ctx.agent
  csrfToken = ctx.csrfToken

  // Create an account for transactions
  const accRes = await agent
    .post('/api/v1/accounts')
    .set('X-CSRF-Token', csrfToken)
    .send({ name: 'Main Account', type: 'checking', initialBalance: 5000 })
  accountId = accRes.body.data.account.id
})

const makeTx = (overrides = {}) => ({
  accountId,
  amount: -50,
  description: 'Test Transaction',
  date: '2026-01-15',
  type: 'expense',
  ...overrides,
})

describe('Transactions - CRUD', () => {
  it('should create a transaction', async () => {
    const res = await agent
      .post('/api/v1/transactions')
      .set('X-CSRF-Token', csrfToken)
      .send(makeTx())

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.transaction.description).toBe('Test Transaction')
  })

  it('should list transactions', async () => {
    await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken).send(makeTx())
    await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken).send(makeTx({ description: 'Second Tx', amount: -75 }))

    const res = await agent.get('/api/v1/transactions')
    expect(res.status).toBe(200)
    // data is a direct array for list endpoints
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(2)
  })

  it('should get a single transaction', async () => {
    const createRes = await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken).send(makeTx())
    const id = createRes.body.data.transaction.id

    const res = await agent.get(`/api/v1/transactions/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.transaction.id).toBe(id)
  })

  it('should update a transaction', async () => {
    const createRes = await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken).send(makeTx())
    const id = createRes.body.data.transaction.id

    const res = await agent
      .put(`/api/v1/transactions/${id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ description: 'Updated Transaction' })

    expect(res.status).toBe(200)
    expect(res.body.data.transaction.description).toBe('Updated Transaction')
  })

  it('should delete a transaction', async () => {
    const createRes = await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken).send(makeTx())
    const id = createRes.body.data.transaction.id

    const res = await agent.delete(`/api/v1/transactions/${id}`).set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Transactions - Split', () => {
  it('should create a split transaction', async () => {
    const res = await agent
      .post('/api/v1/transactions/split')
      .set('X-CSRF-Token', csrfToken)
      .send({
        accountId,
        amount: -100,
        description: 'Split Tx',
        date: '2026-01-15',
        type: 'expense',
        splits: [
          { categoryId: null, amount: -60, description: 'Part 1' },
          { categoryId: null, amount: -40, description: 'Part 2' },
        ],
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
  })
})

describe('Transactions - Reconcile', () => {
  it('should toggle reconcile on a transaction', async () => {
    const createRes = await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken).send(makeTx())
    const id = createRes.body.data.transaction.id

    const res = await agent
      .patch(`/api/v1/transactions/${id}/reconcile`)
      .set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('should reconcile multiple transactions', async () => {
    const tx1 = await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken).send(makeTx())
    const tx2 = await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken).send(makeTx({ description: 'Tx2', amount: -30 }))

    const res = await agent
      .post('/api/v1/transactions/reconcile')
      .set('X-CSRF-Token', csrfToken)
      .send({
        transactionIds: [tx1.body.data.transaction.id, tx2.body.data.transaction.id],
        reconcileDate: '2026-01-20',
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Transactions - Match', () => {
  it('should find matching transactions', async () => {
    await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken).send(makeTx({ amount: -123.45 }))

    // Match requires accountId and amount
    const res = await agent.get(`/api/v1/transactions/match?accountId=${accountId}&amount=-123.45&date=2026-01-15`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.matches).toBeDefined()
  })
})

describe('Transactions - Pagination', () => {
  it('should paginate results', async () => {
    // Create several transactions
    for (let i = 0; i < 5; i++) {
      await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken).send(makeTx({ description: `Tx ${i}`, amount: -(i + 1) * 10 }))
    }

    const res = await agent.get('/api/v1/transactions?page=1&limit=2')
    expect(res.status).toBe(200)
    // data is a direct array
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeLessThanOrEqual(2)
    expect(res.body.pagination).toBeDefined()
  })

  it('should filter by accountId', async () => {
    await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken).send(makeTx())

    const res = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('Transactions - Check Number', () => {
  it('should create a transaction with checkNumber', async () => {
    const res = await agent
      .post('/api/v1/transactions')
      .set('X-CSRF-Token', csrfToken)
      .send(makeTx({ checkNumber: 'CHK-001' }))

    expect(res.status).toBe(201)
    expect(res.body.data.transaction.checkNumber).toBe('CHK-001')
  })

  it('should update checkNumber on a transaction', async () => {
    const createRes = await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken).send(makeTx())
    const id = createRes.body.data.transaction.id

    const res = await agent
      .put(`/api/v1/transactions/${id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ checkNumber: 'CHK-UPD' })

    expect(res.status).toBe(200)
    expect(res.body.data.transaction.checkNumber).toBe('CHK-UPD')
  })

  it('should return checkNumber in GET response', async () => {
    const createRes = await agent
      .post('/api/v1/transactions')
      .set('X-CSRF-Token', csrfToken)
      .send(makeTx({ checkNumber: 'CHK-GET' }))
    const id = createRes.body.data.transaction.id

    const res = await agent.get(`/api/v1/transactions/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.transaction.checkNumber).toBe('CHK-GET')
  })

  it('should find transactions by searching checkNumber', async () => {
    await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken)
      .send(makeTx({ description: 'Check payment', checkNumber: 'CHK-9876' }))
    await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken)
      .send(makeTx({ description: 'Card payment' }))

    const res = await agent.get('/api/v1/transactions?search=9876')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].checkNumber).toBe('CHK-9876')
  })
})

describe('Transactions - Validation', () => {
  it('should reject transaction without description', async () => {
    const res = await agent
      .post('/api/v1/transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -10, date: '2026-01-15', type: 'expense' })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('should reject transaction with zero amount', async () => {
    const res = await agent
      .post('/api/v1/transactions')
      .set('X-CSRF-Token', csrfToken)
      .send(makeTx({ amount: 0 }))

    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
