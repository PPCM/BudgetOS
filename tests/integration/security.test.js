/**
 * Integration tests for security: auth enforcement, CSRF protection, user isolation
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import supertest from 'supertest'
import { createTestApp, createAuthenticatedAgent, setupTestDb, closeTestDb, resetTestDb } from './helpers.js'

let app

beforeAll(async () => {
  await setupTestDb()
  app = await createTestApp()
})

afterAll(async () => {
  await closeTestDb()
})

beforeEach(async () => {
  await resetTestDb()
})

describe('Security - 401 without auth', () => {
  const protectedEndpoints = [
    ['GET', '/api/v1/accounts'],
    ['GET', '/api/v1/transactions'],
    ['GET', '/api/v1/categories'],
    ['GET', '/api/v1/payees'],
    ['GET', '/api/v1/credit-cards'],
    ['GET', '/api/v1/planned-transactions'],
    ['GET', '/api/v1/reports/dashboard'],
    ['GET', '/api/v1/rules'],
    ['GET', '/api/v1/auth/me'],
    ['GET', '/api/v1/auth/settings'],
  ]

  protectedEndpoints.forEach(([method, path]) => {
    it(`should return 401 for ${method} ${path} without auth`, async () => {
      const res = await supertest(app)[method.toLowerCase()](path)
      expect(res.status).toBe(401)
    })
  })
})

describe('Security - 403 without CSRF token', () => {
  it('should reject POST without CSRF token', async () => {
    const agent = supertest.agent(app)
    // Get a session by hitting csrf-token endpoint
    await agent.get('/api/v1/csrf-token')

    // Try POST without CSRF header
    const res = await agent
      .post('/api/v1/auth/register')
      .send({
        email: 'nocsrf@test.com',
        password: 'TestPass1234',
        passwordConfirm: 'TestPass1234',
      })

    expect(res.status).toBe(403)
  })

  it('should reject POST with wrong CSRF token', async () => {
    const agent = supertest.agent(app)
    await agent.get('/api/v1/csrf-token')

    const res = await agent
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', 'wrong-token-value')
      .send({
        email: 'badcsrf@test.com',
        password: 'TestPass1234',
        passwordConfirm: 'TestPass1234',
      })

    expect(res.status).toBe(403)
  })
})

describe('Security - User isolation', () => {
  it('should not allow user A to access user B accounts', async () => {
    // Create user A and an account
    const ctxA = await createAuthenticatedAgent(app, { email: 'userA@test.com' })
    const accRes = await ctxA.agent
      .post('/api/v1/accounts')
      .set('X-CSRF-Token', ctxA.csrfToken)
      .send({ name: 'A Account', type: 'checking', initialBalance: 100 })
    const accountIdA = accRes.body.data.account.id

    // Create user B
    const ctxB = await createAuthenticatedAgent(app, { email: 'userB@test.com' })

    // User B tries to access User A's account
    const res = await ctxB.agent.get(`/api/v1/accounts/${accountIdA}`)
    // Should return 404 (not found for this user) or 403
    expect([403, 404]).toContain(res.status)
  })

  it('should isolate transactions between users', async () => {
    // User A creates a transaction
    const ctxA = await createAuthenticatedAgent(app, { email: 'txA@test.com' })
    const accRes = await ctxA.agent
      .post('/api/v1/accounts')
      .set('X-CSRF-Token', ctxA.csrfToken)
      .send({ name: 'A Checking', type: 'checking', initialBalance: 500 })
    const accountIdA = accRes.body.data.account.id

    await ctxA.agent
      .post('/api/v1/transactions')
      .set('X-CSRF-Token', ctxA.csrfToken)
      .send({
        accountId: accountIdA,
        amount: -25,
        description: 'A transaction',
        date: '2026-01-15',
        type: 'expense',
      })

    // User B lists their transactions — should see none
    const ctxB = await createAuthenticatedAgent(app, { email: 'txB@test.com' })
    const res = await ctxB.agent.get('/api/v1/transactions')
    expect(res.status).toBe(200)
    // data is a direct array
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBe(0)
  })

  it('should isolate categories between users', async () => {
    const ctxA = await createAuthenticatedAgent(app, { email: 'catA@test.com' })
    await ctxA.agent
      .post('/api/v1/categories')
      .set('X-CSRF-Token', ctxA.csrfToken)
      .send({ name: 'A Category', type: 'expense', icon: 'tag', color: '#FF0000' })

    const ctxB = await createAuthenticatedAgent(app, { email: 'catB@test.com' })
    const res = await ctxB.agent.get('/api/v1/categories')
    expect(res.status).toBe(200)
    // User B should not see User A's categories
    const userCategories = res.body.data.categories.filter(c => c.name === 'A Category')
    expect(userCategories.length).toBe(0)
  })
})
