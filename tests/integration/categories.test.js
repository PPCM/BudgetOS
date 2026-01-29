/**
 * Integration tests for /api/v1/categories endpoints
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

const validCategory = {
  name: 'Alimentation',
  type: 'expense',
  icon: 'shopping-cart',
  color: '#22C55E',
}

describe('Categories - CRUD', () => {
  it('should create a category', async () => {
    const res = await agent
      .post('/api/v1/categories')
      .set('X-CSRF-Token', csrfToken)
      .send(validCategory)

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.category.name).toBe('Alimentation')
  })

  it('should list categories', async () => {
    await agent.post('/api/v1/categories').set('X-CSRF-Token', csrfToken).send(validCategory)
    await agent.post('/api/v1/categories').set('X-CSRF-Token', csrfToken).send({ ...validCategory, name: 'Transport' })

    const res = await agent.get('/api/v1/categories')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.categories.length).toBeGreaterThanOrEqual(2)
  })

  it('should get a single category', async () => {
    const createRes = await agent.post('/api/v1/categories').set('X-CSRF-Token', csrfToken).send(validCategory)
    const id = createRes.body.data.category.id

    const res = await agent.get(`/api/v1/categories/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.category.id).toBe(id)
  })

  it('should update a category', async () => {
    const createRes = await agent.post('/api/v1/categories').set('X-CSRF-Token', csrfToken).send(validCategory)
    const id = createRes.body.data.category.id

    const res = await agent
      .put(`/api/v1/categories/${id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Nourriture' })

    expect(res.status).toBe(200)
    expect(res.body.data.category.name).toBe('Nourriture')
  })

  it('should delete a category', async () => {
    const createRes = await agent.post('/api/v1/categories').set('X-CSRF-Token', csrfToken).send(validCategory)
    const id = createRes.body.data.category.id

    const res = await agent.delete(`/api/v1/categories/${id}`).set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Categories - Filter by type', () => {
  it('should filter categories by type', async () => {
    await agent.post('/api/v1/categories').set('X-CSRF-Token', csrfToken).send(validCategory)
    await agent.post('/api/v1/categories').set('X-CSRF-Token', csrfToken).send({ name: 'Salaire', type: 'income', icon: 'wallet', color: '#3B82F6' })

    const res = await agent.get('/api/v1/categories?type=expense')
    expect(res.status).toBe(200)
    const expenseCategories = res.body.data.categories.filter(c => c.type === 'expense')
    expect(expenseCategories.length).toBeGreaterThanOrEqual(1)
  })
})

describe('Categories - Validation', () => {
  it('should reject category without name', async () => {
    const res = await agent
      .post('/api/v1/categories')
      .set('X-CSRF-Token', csrfToken)
      .send({ type: 'expense' })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('should reject category with invalid type', async () => {
    const res = await agent
      .post('/api/v1/categories')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Bad', type: 'invalid_type' })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
