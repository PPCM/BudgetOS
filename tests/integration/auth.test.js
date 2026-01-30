/**
 * Integration tests for /api/v1/auth endpoints
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import supertest from 'supertest'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { createTestApp, setupTestDb, getTestDb, closeTestDb, resetTestDb, seedSystemSettings } from './helpers.js'

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
  await seedSystemSettings()
})

// Helper to get a CSRF token
async function getCsrf(agent) {
  const res = await agent.get('/api/v1/csrf-token')
  return res.body.csrfToken
}

// Helper to create a user directly in DB for login tests
async function insertTestUser(email, password, role = 'user') {
  const db = getTestDb()
  const id = uuidv4()
  const passwordHash = await bcrypt.hash(password, 4)
  await db('users').insert({
    id, email, password_hash: passwordHash,
    first_name: 'Test', last_name: 'User', role,
  })
  await db('user_settings').insert({ id: uuidv4(), user_id: id })
  return id
}

describe('Auth - Register', () => {
  it('should register first user as super_admin', async () => {
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    const res = await agent
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({
        email: 'first@test.com',
        password: 'TestPass1234',
        passwordConfirm: 'TestPass1234',
        firstName: 'First',
        lastName: 'User',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user).toBeDefined()
    expect(res.body.data.user.email).toBe('first@test.com')
    expect(res.body.data.user.role).toBe('super_admin')
  })

  it('should reject second registration when public registration is disabled', async () => {
    // Register the first user (becomes super_admin)
    const agent1 = supertest.agent(app)
    const csrf1 = await getCsrf(agent1)
    await agent1.post('/api/v1/auth/register').set('X-CSRF-Token', csrf1).send({
      email: 'first@test.com',
      password: 'TestPass1234',
      passwordConfirm: 'TestPass1234',
    })

    // Try to register a second user
    const agent2 = supertest.agent(app)
    const csrf2 = await getCsrf(agent2)
    const res = await agent2
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf2)
      .send({
        email: 'second@test.com',
        password: 'TestPass1234',
        passwordConfirm: 'TestPass1234',
      })

    expect(res.status).toBe(403)
  })

  it('should allow second registration when public registration is enabled', async () => {
    const db = getTestDb()

    // Create first user as super_admin with a group
    await insertTestUser('first@test.com', 'TestPass1234', 'super_admin')
    const groupId = uuidv4()
    await db('groups').insert({
      id: groupId, name: 'Default', is_active: true,
      created_by: (await db('users').first()).id,
    })

    // Enable public registration
    await db('system_settings')
      .where('key', 'allow_public_registration')
      .update({ value: 'true' })
    await db('system_settings')
      .where('key', 'default_registration_group_id')
      .update({ value: groupId })

    // Now register a second user
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)
    const res = await agent
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({
        email: 'second@test.com',
        password: 'TestPass1234',
        passwordConfirm: 'TestPass1234',
        firstName: 'Second',
        lastName: 'User',
      })

    expect(res.status).toBe(201)
    expect(res.body.data.user.role).toBe('user')
  })

  it('should reject duplicate email', async () => {
    // Register first user
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)
    await agent.post('/api/v1/auth/register').set('X-CSRF-Token', csrf).send({
      email: 'duplicate@test.com',
      password: 'TestPass1234',
      passwordConfirm: 'TestPass1234',
    })

    // Enable registration and try duplicate
    const db = getTestDb()
    const groupId = uuidv4()
    const firstUser = await db('users').first()
    await db('groups').insert({ id: groupId, name: 'Default', is_active: true, created_by: firstUser.id })
    await db('system_settings').where('key', 'allow_public_registration').update({ value: 'true' })
    await db('system_settings').where('key', 'default_registration_group_id').update({ value: groupId })

    const agent2 = supertest.agent(app)
    const csrf2 = await getCsrf(agent2)
    const res = await agent2
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf2)
      .send({
        email: 'duplicate@test.com',
        password: 'TestPass1234',
        passwordConfirm: 'TestPass1234',
      })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('should reject weak password', async () => {
    // First user registration attempt with weak password
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
    await insertTestUser(email, password)
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

  it('should reject login for suspended user', async () => {
    const db = getTestDb()
    await db('users').where('email', email).update({ is_active: false })

    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email, password })

    expect(res.status).toBe(403)
  })
})

describe('Auth - Logout', () => {
  it('should logout an authenticated user', async () => {
    await insertTestUser('logout@test.com', 'TestPass1234')
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrf).send({
      email: 'logout@test.com',
      password: 'TestPass1234',
    })

    const res = await agent.post('/api/v1/auth/logout').set('X-CSRF-Token', csrf)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Auth - Me', () => {
  it('should return current user info with groups', async () => {
    await insertTestUser('me@test.com', 'TestPass1234')

    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrf).send({
      email: 'me@test.com',
      password: 'TestPass1234',
    })

    const res = await agent.get('/api/v1/auth/me')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user).toBeDefined()
    expect(res.body.data.groups).toBeDefined()
    expect(Array.isArray(res.body.data.groups)).toBe(true)
  })

  it('should return 401 when not authenticated', async () => {
    const res = await supertest(app).get('/api/v1/auth/me')
    expect(res.status).toBe(401)
  })
})

describe('Auth - Profile', () => {
  it('should update user profile', async () => {
    await insertTestUser('profile@test.com', 'TestPass1234')
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrf).send({
      email: 'profile@test.com',
      password: 'TestPass1234',
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
    await insertTestUser('pw@test.com', 'TestPass1234')
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrf).send({
      email: 'pw@test.com',
      password: 'TestPass1234',
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
    await insertTestUser('pw2@test.com', 'TestPass1234')
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrf).send({
      email: 'pw2@test.com',
      password: 'TestPass1234',
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
    await insertTestUser('settings@test.com', 'TestPass1234')
    const agent = supertest.agent(app)
    const csrf = await getCsrf(agent)

    await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrf).send({
      email: 'settings@test.com',
      password: 'TestPass1234',
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
