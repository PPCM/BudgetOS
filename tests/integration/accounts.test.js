/**
 * Integration tests for /api/v1/accounts endpoints
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

const validAccount = {
  name: 'Compte Courant',
  type: 'checking',
  initialBalance: 1000,
  currency: 'EUR',
}

describe('Accounts - CRUD', () => {
  it('should create an account', async () => {
    const res = await agent
      .post('/api/v1/accounts')
      .set('X-CSRF-Token', csrfToken)
      .send(validAccount)

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.account.name).toBe('Compte Courant')
    expect(res.body.data.account.type).toBe('checking')
  })

  it('should list accounts', async () => {
    await agent.post('/api/v1/accounts').set('X-CSRF-Token', csrfToken).send(validAccount)
    await agent.post('/api/v1/accounts').set('X-CSRF-Token', csrfToken).send({ ...validAccount, name: 'Livret A', type: 'savings' })

    const res = await agent.get('/api/v1/accounts')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    // data is a direct array for list endpoints
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(2)
  })

  it('should get a single account', async () => {
    const createRes = await agent.post('/api/v1/accounts').set('X-CSRF-Token', csrfToken).send(validAccount)
    const id = createRes.body.data.account.id

    const res = await agent.get(`/api/v1/accounts/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.account.id).toBe(id)
  })

  it('should update an account', async () => {
    const createRes = await agent.post('/api/v1/accounts').set('X-CSRF-Token', csrfToken).send(validAccount)
    const id = createRes.body.data.account.id

    const res = await agent
      .put(`/api/v1/accounts/${id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Renamed Account' })

    expect(res.status).toBe(200)
    expect(res.body.data.account.name).toBe('Renamed Account')
  })

  it('should delete an account', async () => {
    const createRes = await agent.post('/api/v1/accounts').set('X-CSRF-Token', csrfToken).send(validAccount)
    const id = createRes.body.data.account.id

    const res = await agent.delete(`/api/v1/accounts/${id}`).set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Accounts - Recalculate', () => {
  it('should recalculate account balances', async () => {
    await agent.post('/api/v1/accounts').set('X-CSRF-Token', csrfToken).send(validAccount)

    const res = await agent.post('/api/v1/accounts/recalculate').set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Accounts - Stats', () => {
  it('should get account stats', async () => {
    const createRes = await agent.post('/api/v1/accounts').set('X-CSRF-Token', csrfToken).send(validAccount)
    const id = createRes.body.data.account.id

    const res = await agent.get(`/api/v1/accounts/${id}/stats`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.stats).toBeDefined()
  })
})

describe('Accounts - Validation', () => {
  it('should reject account without name', async () => {
    const res = await agent
      .post('/api/v1/accounts')
      .set('X-CSRF-Token', csrfToken)
      .send({ type: 'checking' })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('should reject account with invalid type', async () => {
    const res = await agent
      .post('/api/v1/accounts')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Bad Type', type: 'invalid_type' })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
