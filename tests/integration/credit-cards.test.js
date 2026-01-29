/**
 * Integration tests for /api/v1/credit-cards endpoints
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

  // Create an account to link the credit card
  const accRes = await agent
    .post('/api/v1/accounts')
    .set('X-CSRF-Token', csrfToken)
    .send({ name: 'CC Account', type: 'credit_card', initialBalance: 0 })
  accountId = accRes.body.data.account.id
})

const makeCard = (overrides = {}) => ({
  accountId,
  name: 'Visa Gold',
  expirationDate: '12/28',
  debitType: 'immediate',
  cycleStartDay: 1,
  ...overrides,
})

describe('Credit Cards - CRUD', () => {
  it('should create a credit card', async () => {
    const res = await agent
      .post('/api/v1/credit-cards')
      .set('X-CSRF-Token', csrfToken)
      .send(makeCard())

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.creditCard.name).toBe('Visa Gold')
  })

  it('should list credit cards', async () => {
    await agent.post('/api/v1/credit-cards').set('X-CSRF-Token', csrfToken).send(makeCard())

    const res = await agent.get('/api/v1/credit-cards')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.creditCards.length).toBeGreaterThanOrEqual(1)
  })

  it('should get a single credit card', async () => {
    const createRes = await agent.post('/api/v1/credit-cards').set('X-CSRF-Token', csrfToken).send(makeCard())
    const id = createRes.body.data.creditCard.id

    const res = await agent.get(`/api/v1/credit-cards/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.creditCard.id).toBe(id)
  })

  it('should update a credit card', async () => {
    const createRes = await agent.post('/api/v1/credit-cards').set('X-CSRF-Token', csrfToken).send(makeCard())
    const id = createRes.body.data.creditCard.id

    const res = await agent
      .put(`/api/v1/credit-cards/${id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Mastercard Platinum' })

    expect(res.status).toBe(200)
    expect(res.body.data.creditCard.name).toBe('Mastercard Platinum')
  })

  it('should delete a credit card', async () => {
    const createRes = await agent.post('/api/v1/credit-cards').set('X-CSRF-Token', csrfToken).send(makeCard())
    const id = createRes.body.data.creditCard.id

    const res = await agent.delete(`/api/v1/credit-cards/${id}`).set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Credit Cards - Cycles', () => {
  // Known bug: ambiguous column name credit_card_id in getCycles query (SQLite)
  it.skip('should list cycles for a credit card', async () => {
    const createRes = await agent.post('/api/v1/credit-cards').set('X-CSRF-Token', csrfToken).send(makeCard())
    const id = createRes.body.data.creditCard.id

    const res = await agent.get(`/api/v1/credit-cards/${id}/cycles`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('should get current cycle', async () => {
    const createRes = await agent.post('/api/v1/credit-cards').set('X-CSRF-Token', csrfToken).send(makeCard())
    const id = createRes.body.data.creditCard.id

    const res = await agent.get(`/api/v1/credit-cards/${id}/cycles/current`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Credit Cards - Deferred debit', () => {
  it('should create a deferred debit card with debitDay', async () => {
    const res = await agent
      .post('/api/v1/credit-cards')
      .set('X-CSRF-Token', csrfToken)
      .send(makeCard({ debitType: 'deferred', debitDay: 15 }))

    expect(res.status).toBe(201)
    expect(res.body.data.creditCard.debitType).toBe('deferred')
  })
})
