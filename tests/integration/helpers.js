/**
 * Integration test helpers
 * Provides createTestApp() and createAuthenticatedAgent() for HTTP-level testing
 */
import { vi } from 'vitest'
import supertest from 'supertest'
import { setupTestDb, getTestDb, closeTestDb, resetTestDb } from '../setup.js'

/**
 * Create a test Express app with an in-memory database.
 * Mocks src/database/connection.js so all services use the test DB.
 * @returns {Promise<import('express').Express>}
 */
export async function createTestApp() {
  const knex = await setupTestDb()

  // Mock the database connection module so all imports resolve to the test DB
  vi.doMock('../../src/database/connection.js', () => ({
    default: knex,
    knex,
    initDatabase: vi.fn().mockResolvedValue(knex),
    closeDatabase: vi.fn().mockResolvedValue(undefined),
    transaction: (fn) => knex.transaction(fn),
  }))

  // Dynamic import so the mock is picked up
  const { default: createApp } = await import('../../src/app.js')
  const app = createApp()
  return app
}

/**
 * Create an authenticated supertest agent.
 * Registers a new user, fetches a CSRF token, and returns the agent ready to make authenticated requests.
 * @param {import('express').Express} app
 * @param {object} [opts]
 * @param {string} [opts.email] - Custom email
 * @param {string} [opts.password] - Custom password
 * @returns {Promise<{ agent: import('supertest').SuperAgentTest, csrfToken: string, user: object }>}
 */
export async function createAuthenticatedAgent(app, opts = {}) {
  const email = opts.email || `test-${Date.now()}@example.com`
  const password = opts.password || 'TestPass1234'

  const agent = supertest.agent(app)

  // Get CSRF token
  const csrfRes = await agent.get('/api/v1/csrf-token')
  const csrfToken = csrfRes.body.csrfToken

  // Register user
  const registerRes = await agent
    .post('/api/v1/auth/register')
    .set('X-CSRF-Token', csrfToken)
    .send({
      email,
      password,
      passwordConfirm: password,
      firstName: 'Test',
      lastName: 'User',
    })

  return {
    agent,
    csrfToken,
    user: registerRes.body.data?.user || registerRes.body.user || { email },
  }
}

export { setupTestDb, getTestDb, closeTestDb, resetTestDb }
