/**
 * Integration tests for /api/v1/rules endpoints
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

let agent, csrfToken

beforeEach(async () => {
  await resetTestDb()
  const ctx = await createAuthenticatedAgent(app)
  agent = ctx.agent
  csrfToken = ctx.csrfToken
})

const makeRule = (overrides = {}) => ({
  name: 'Auto-categorize groceries',
  conditions: [
    { field: 'description', operator: 'contains', value: 'carrefour' },
  ],
  conditionLogic: 'and',
  isActive: true,
  priority: 10,
  ...overrides,
})

describe('Rules - CRUD', () => {
  it('should create a rule', async () => {
    const res = await agent
      .post('/api/v1/rules')
      .set('X-CSRF-Token', csrfToken)
      .send(makeRule())

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.rule.name).toBe('Auto-categorize groceries')
  })

  it('should list rules', async () => {
    await agent.post('/api/v1/rules').set('X-CSRF-Token', csrfToken).send(makeRule())
    await agent.post('/api/v1/rules').set('X-CSRF-Token', csrfToken).send(makeRule({ name: 'Transport rule' }))

    const res = await agent.get('/api/v1/rules')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.rules.length).toBeGreaterThanOrEqual(2)
  })

  it('should get a single rule', async () => {
    const createRes = await agent.post('/api/v1/rules').set('X-CSRF-Token', csrfToken).send(makeRule())
    const id = createRes.body.data.rule.id

    const res = await agent.get(`/api/v1/rules/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.rule.id).toBe(id)
  })

  it('should update a rule', async () => {
    const createRes = await agent.post('/api/v1/rules').set('X-CSRF-Token', csrfToken).send(makeRule())
    const id = createRes.body.data.rule.id

    const res = await agent
      .put(`/api/v1/rules/${id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Updated Rule' })

    expect(res.status).toBe(200)
    expect(res.body.data.rule.name).toBe('Updated Rule')
  })

  it('should delete a rule', async () => {
    const createRes = await agent.post('/api/v1/rules').set('X-CSRF-Token', csrfToken).send(makeRule())
    const id = createRes.body.data.rule.id

    const res = await agent.delete(`/api/v1/rules/${id}`).set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Rules - Test', () => {
  it('should test a rule against sample data', async () => {
    const createRes = await agent.post('/api/v1/rules').set('X-CSRF-Token', csrfToken).send(makeRule())
    const id = createRes.body.data.rule.id

    const res = await agent
      .post(`/api/v1/rules/${id}/test`)
      .set('X-CSRF-Token', csrfToken)
      .send({ description: 'Achat carrefour market', amount: -45.50 })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Rules - Apply', () => {
  it('should apply a rule to a transaction', async () => {
    const createRes = await agent.post('/api/v1/rules').set('X-CSRF-Token', csrfToken).send(makeRule())
    const ruleId = createRes.body.data.rule.id

    // Create an account and transaction to apply the rule to
    const accRes = await agent.post('/api/v1/accounts').set('X-CSRF-Token', csrfToken).send({ name: 'Rule Acc', type: 'checking', initialBalance: 1000 })
    const accountId = accRes.body.data.account.id

    const txRes = await agent.post('/api/v1/transactions').set('X-CSRF-Token', csrfToken).send({
      accountId, amount: -30, description: 'carrefour market', date: '2026-01-15', type: 'expense',
    })
    const transactionId = txRes.body.data.transaction.id

    const res = await agent
      .post(`/api/v1/rules/${ruleId}/apply`)
      .set('X-CSRF-Token', csrfToken)
      .send({ transactionId })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Rules - Validation', () => {
  it('should reject rule without conditions', async () => {
    const res = await agent
      .post('/api/v1/rules')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'No conditions' })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('should reject rule with empty conditions array', async () => {
    const res = await agent
      .post('/api/v1/rules')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Empty', conditions: [] })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
