/**
 * Integration test helpers
 * Provides createTestApp() and createAuthenticatedAgent() for HTTP-level testing
 */
import { vi } from 'vitest'
import supertest from 'supertest'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
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
 * Creates a user directly in the DB and logs in via /login to avoid
 * registration restrictions (public registration is disabled by default).
 * @param {import('express').Express} app
 * @param {object} [opts]
 * @param {string} [opts.email] - Custom email
 * @param {string} [opts.password] - Custom password
 * @param {string} [opts.role] - User role (default: 'user')
 * @param {string} [opts.firstName] - First name
 * @param {string} [opts.lastName] - Last name
 * @returns {Promise<{ agent: import('supertest').SuperAgentTest, csrfToken: string, user: object }>}
 */
export async function createAuthenticatedAgent(app, opts = {}) {
  const email = (opts.email || `test-${Date.now()}@example.com`).toLowerCase()
  const password = opts.password || 'TestPass1234'
  const role = opts.role || 'user'
  const firstName = opts.firstName || 'Test'
  const lastName = opts.lastName || 'User'

  const db = getTestDb()
  const userId = uuidv4()
  const passwordHash = await bcrypt.hash(password, 4) // Low rounds for speed

  // Insert user directly in the database
  await db('users').insert({
    id: userId,
    email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    role,
  })

  // Insert user settings
  await db('user_settings').insert({
    id: uuidv4(),
    user_id: userId,
  })

  const agent = supertest.agent(app)

  // Get CSRF token
  const csrfRes = await agent.get('/api/v1/csrf-token')
  const csrfToken = csrfRes.body.csrfToken

  // Login (instead of register, since public registration is closed)
  const loginRes = await agent
    .post('/api/v1/auth/login')
    .set('X-CSRF-Token', csrfToken)
    .send({ email, password })

  return {
    agent,
    csrfToken,
    user: loginRes.body.data?.user || { id: userId, email, role },
  }
}

/**
 * Create an authenticated super admin agent.
 * @param {import('express').Express} app
 * @param {object} [opts]
 * @returns {Promise<{ agent: import('supertest').SuperAgentTest, csrfToken: string, user: object }>}
 */
export async function createAuthenticatedSuperAdmin(app, opts = {}) {
  return createAuthenticatedAgent(app, {
    ...opts,
    role: 'super_admin',
    email: opts.email || `super-admin-${Date.now()}@example.com`,
    firstName: opts.firstName || 'Super',
    lastName: opts.lastName || 'Admin',
  })
}

/**
 * Ensure system_settings exist in the test DB (needed after resetTestDb).
 * Call this in beforeEach when testing features that rely on system settings.
 */
export async function seedSystemSettings() {
  const db = getTestDb()
  const existing = await db('system_settings').where('key', 'allow_public_registration').first()
  if (!existing) {
    await db('system_settings').insert([
      { id: uuidv4(), key: 'allow_public_registration', value: 'false' },
      { id: uuidv4(), key: 'default_registration_group_id', value: null },
    ])
  }
}

export { setupTestDb, getTestDb, closeTestDb, resetTestDb }
