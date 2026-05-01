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

  it('should refuse to delete an active account', async () => {
    const createRes = await agent.post('/api/v1/accounts').set('X-CSRF-Token', csrfToken).send(validAccount)
    const id = createRes.body.data.account.id

    const res = await agent.delete(`/api/v1/accounts/${id}`).set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('ACCOUNT_MUST_BE_DEACTIVATED')
  })

  it('should permanently delete a deactivated account', async () => {
    const createRes = await agent.post('/api/v1/accounts').set('X-CSRF-Token', csrfToken).send(validAccount)
    const id = createRes.body.data.account.id

    await agent.post(`/api/v1/accounts/${id}/deactivate`).set('X-CSRF-Token', csrfToken)

    const res = await agent.delete(`/api/v1/accounts/${id}`).set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(200)
    expect(res.body.deleted).toBe(true)

    // Subsequent fetches should not find the account anymore
    const list = await agent.get('/api/v1/accounts?includeInactive=true')
    expect(list.body.data.find(a => a.id === id)).toBeUndefined()
  })
})

describe('Accounts - Deactivate / Reactivate', () => {
  it('deactivates an active account', async () => {
    const createRes = await agent.post('/api/v1/accounts').set('X-CSRF-Token', csrfToken).send(validAccount)
    const id = createRes.body.data.account.id

    const res = await agent.post(`/api/v1/accounts/${id}/deactivate`).set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(200)
    expect(res.body.deactivated).toBe(true)
    expect(res.body.alreadyInactive).toBe(false)

    // Default list (active only) excludes the account
    const activeList = await agent.get('/api/v1/accounts')
    expect(activeList.body.data.find(a => a.id === id)).toBeUndefined()

    // includeInactive=true returns the account flagged as isActive=false
    const allList = await agent.get('/api/v1/accounts?includeInactive=true')
    const found = allList.body.data.find(a => a.id === id)
    expect(found).toBeDefined()
    expect(found.isActive).toBe(false)
  })

  it('reactivates a deactivated account', async () => {
    const createRes = await agent.post('/api/v1/accounts').set('X-CSRF-Token', csrfToken).send(validAccount)
    const id = createRes.body.data.account.id

    await agent.post(`/api/v1/accounts/${id}/deactivate`).set('X-CSRF-Token', csrfToken)
    const res = await agent.post(`/api/v1/accounts/${id}/reactivate`).set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(200)
    expect(res.body.reactivated).toBe(true)

    const list = await agent.get('/api/v1/accounts')
    const found = list.body.data.find(a => a.id === id)
    expect(found).toBeDefined()
    expect(found.isActive).toBe(true)
  })

  it('returns 404 when targeting another user\'s account', async () => {
    const createRes = await agent.post('/api/v1/accounts').set('X-CSRF-Token', csrfToken).send(validAccount)
    const id = createRes.body.data.account.id

    const other = await createAuthenticatedAgent(app)
    const res = await other.agent
      .post(`/api/v1/accounts/${id}/deactivate`)
      .set('X-CSRF-Token', other.csrfToken)
    expect(res.status).toBe(404)
  })

  it('rejects deactivate without CSRF token', async () => {
    const createRes = await agent.post('/api/v1/accounts').set('X-CSRF-Token', csrfToken).send(validAccount)
    const id = createRes.body.data.account.id

    const res = await agent.post(`/api/v1/accounts/${id}/deactivate`)
    expect(res.status).toBe(403)
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
