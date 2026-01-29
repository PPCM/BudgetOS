/**
 * Integration tests for /api/v1/auth endpoints
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import supertest from 'supertest'
import { createTestApp, setupTestDb, closeTestDb, resetTestDb } from './helpers.js'

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

// Helper to get a CSRF token
async function getCsrf(agent) {
  const res = await agent.get('/api/v1/csrf-token')
  return res.body.csrfToken
}

describe('Auth - Register', () => {
  it('should register a new user', async () => {
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    const res = await agent
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({
        email: 'newuser@test.com',
        password: 'TestPass1234',
        passwordConfirm: 'TestPass1234',
        firstName: 'New',
        lastName: 'User',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user).toBeDefined()
    expect(res.body.data.user.email).toBe('newuser@test.com')
  })

  it('should reject duplicate email', async () => {
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    const userData = {
      email: 'duplicate@test.com',
      password: 'TestPass1234',
      passwordConfirm: 'TestPass1234',
      firstName: 'Test',
      lastName: 'User',
    }

    await agent.post('/api/v1/auth/register').set('X-CSRF-Token', csrf).send(userData)

    const res = await agent
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf)
      .send(userData)

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('should reject weak password', async () => {
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    const res = await agent
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({
        email: 'weak@test.com',
        password: 'weak',
        passwordConfirm: 'weak',
      })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('should reject mismatched passwords', async () => {
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    const res = await agent
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({
        email: 'mismatch@test.com',
        password: 'TestPass1234',
        passwordConfirm: 'DifferentPass1234',
      })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

describe('Auth - Login', () => {
  const email = 'login@test.com'
  const password = 'TestPass1234'

  beforeEach(async () => {
    // Register a user first
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)
    await agent.post('/api/v1/auth/register').set('X-CSRF-Token', csrf).send({
      email,
      password,
      passwordConfirm: password,
      firstName: 'Login',
      lastName: 'User',
    })
  })

  it('should login with valid credentials', async () => {
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email, password })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user).toBeDefined()
  })

  it('should reject invalid password', async () => {
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email, password: 'WrongPass1234' })

    expect(res.status).toBe(401)
  })

  it('should reject non-existent email', async () => {
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email: 'noone@test.com', password })

    expect(res.status).toBe(401)
  })
})

describe('Auth - Logout', () => {
  it('should logout an authenticated user', async () => {
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    await agent.post('/api/v1/auth/register').set('X-CSRF-Token', csrf).send({
      email: 'logout@test.com',
      password: 'TestPass1234',
      passwordConfirm: 'TestPass1234',
    })

    const res = await agent.post('/api/v1/auth/logout').set('X-CSRF-Token', csrf)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Auth - Me', () => {
  it('should return current user info', async () => {
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    await agent.post('/api/v1/auth/register').set('X-CSRF-Token', csrf).send({
      email: 'me@test.com',
      password: 'TestPass1234',
      passwordConfirm: 'TestPass1234',
      firstName: 'Me',
      lastName: 'Test',
    })

    const res = await agent.get('/api/v1/auth/me')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user).toBeDefined()
  })

  it('should return 401 when not authenticated', async () => {
    const res = await supertest(app).get('/api/v1/auth/me')
    expect(res.status).toBe(401)
  })
})

describe('Auth - Profile', () => {
  it('should update user profile', async () => {
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    await agent.post('/api/v1/auth/register').set('X-CSRF-Token', csrf).send({
      email: 'profile@test.com',
      password: 'TestPass1234',
      passwordConfirm: 'TestPass1234',
      firstName: 'Old',
      lastName: 'Name',
    })

    const res = await agent
      .put('/api/v1/auth/profile')
      .set('X-CSRF-Token', csrf)
      .send({ firstName: 'New', lastName: 'Updated' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Auth - Password', () => {
  it('should change password', async () => {
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    await agent.post('/api/v1/auth/register').set('X-CSRF-Token', csrf).send({
      email: 'pw@test.com',
      password: 'TestPass1234',
      passwordConfirm: 'TestPass1234',
    })

    const res = await agent
      .put('/api/v1/auth/password')
      .set('X-CSRF-Token', csrf)
      .send({
        currentPassword: 'TestPass1234',
        newPassword: 'NewPass5678',
        newPasswordConfirm: 'NewPass5678',
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('should reject wrong current password', async () => {
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    await agent.post('/api/v1/auth/register').set('X-CSRF-Token', csrf).send({
      email: 'pw2@test.com',
      password: 'TestPass1234',
      passwordConfirm: 'TestPass1234',
    })

    const res = await agent
      .put('/api/v1/auth/password')
      .set('X-CSRF-Token', csrf)
      .send({
        currentPassword: 'WrongPass9999',
        newPassword: 'NewPass5678',
        newPasswordConfirm: 'NewPass5678',
      })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

describe('Auth - Settings', () => {
  it('should get and update user settings', async () => {
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    await agent.post('/api/v1/auth/register').set('X-CSRF-Token', csrf).send({
      email: 'settings@test.com',
      password: 'TestPass1234',
      passwordConfirm: 'TestPass1234',
    })

    const getRes = await agent.get('/api/v1/auth/settings')
    expect(getRes.status).toBe(200)

    const putRes = await agent
      .put('/api/v1/auth/settings')
      .set('X-CSRF-Token', csrf)
      .send({ theme: 'dark' })

    expect(putRes.status).toBe(200)
    expect(putRes.body.success).toBe(true)
  })
})

describe('Auth - CSRF Token', () => {
  it('should return a CSRF token', async () => {
    const res = await supertest(app).get('/api/v1/csrf-token')
    expect(res.status).toBe(200)
    expect(res.body.csrfToken).toBeDefined()
    expect(typeof res.body.csrfToken).toBe('string')
    expect(res.body.csrfToken.length).toBeGreaterThan(0)
  })

  it('should expose CSRF token in response header', async () => {
    const res = await supertest(app).get('/api/v1/csrf-token')
    expect(res.headers['x-csrf-token']).toBeDefined()
  })
})
