/**
 * Integration tests for /api/v1/payees endpoints
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

describe('Payees - CRUD', () => {
  it('should create a payee', async () => {
    const res = await agent
      .post('/api/v1/payees')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Carrefour' })

    expect(res.status).toBe(201)
    // Payee controller returns { data: payee } (no success field)
    expect(res.body.data).toBeDefined()
    expect(res.body.data.name).toBe('Carrefour')
  })

  it('should list payees', async () => {
    await agent.post('/api/v1/payees').set('X-CSRF-Token', csrfToken).send({ name: 'Carrefour' })
    await agent.post('/api/v1/payees').set('X-CSRF-Token', csrfToken).send({ name: 'Leclerc' })

    const res = await agent.get('/api/v1/payees')
    expect(res.status).toBe(200)
    // data is a direct array
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(2)
  })

  it('should get a single payee', async () => {
    const createRes = await agent.post('/api/v1/payees').set('X-CSRF-Token', csrfToken).send({ name: 'Boulangerie' })
    const id = createRes.body.data.id

    const res = await agent.get(`/api/v1/payees/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(id)
  })

  it('should update a payee', async () => {
    const createRes = await agent.post('/api/v1/payees').set('X-CSRF-Token', csrfToken).send({ name: 'Old Name' })
    const id = createRes.body.data.id

    const res = await agent
      .put(`/api/v1/payees/${id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'New Name' })

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('New Name')
  })

  it('should delete a payee', async () => {
    const createRes = await agent.post('/api/v1/payees').set('X-CSRF-Token', csrfToken).send({ name: 'ToDelete' })
    const id = createRes.body.data.id

    const res = await agent.delete(`/api/v1/payees/${id}`).set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(200)
  })
})

describe('Payees - Transaction count', () => {
  it('should get transaction count for a payee', async () => {
    const createRes = await agent.post('/api/v1/payees').set('X-CSRF-Token', csrfToken).send({ name: 'Counter' })
    const id = createRes.body.data.id

    const res = await agent.get(`/api/v1/payees/${id}/transactions/count`)
    expect(res.status).toBe(200)
    expect(res.body.data.count).toBeDefined()
  })
})

describe('Payees - Reassign', () => {
  it('should reassign transactions to another payee', async () => {
    const p1 = await agent.post('/api/v1/payees').set('X-CSRF-Token', csrfToken).send({ name: 'Source Payee' })
    const p2 = await agent.post('/api/v1/payees').set('X-CSRF-Token', csrfToken).send({ name: 'Target Payee' })
    const sourceId = p1.body.data.id
    const targetId = p2.body.data.id

    const res = await agent
      .post(`/api/v1/payees/${sourceId}/transactions/reassign`)
      .set('X-CSRF-Token', csrfToken)
      .send({ toPayeeId: targetId })

    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
  })
})

describe('Payees - Validation', () => {
  it('should reject payee without name', async () => {
    const res = await agent
      .post('/api/v1/payees')
      .set('X-CSRF-Token', csrfToken)
      .send({})

    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
