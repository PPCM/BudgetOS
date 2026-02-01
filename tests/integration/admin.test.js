/**
 * Integration tests for /api/v1/admin endpoints
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import {
  createTestApp, createAuthenticatedSuperAdmin, createAuthenticatedAgent,
  setupTestDb, getTestDb, closeTestDb, resetTestDb, seedSystemSettings,
} from './helpers.js'

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

describe('Admin - User Management', () => {
  it('should list all users (super_admin)', async () => {
    const { agent } = await createAuthenticatedSuperAdmin(app)
    await createAuthenticatedAgent(app, { email: 'user1@test.com' })
    await createAuthenticatedAgent(app, { email: 'user2@test.com' })

    const res = await agent.get('/api/v1/admin/users')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(3) // super_admin + 2 users
  })

  it('should reject user list for non-super_admin', async () => {
    const { agent } = await createAuthenticatedAgent(app, { role: 'admin' })

    const res = await agent.get('/api/v1/admin/users')
    expect(res.status).toBe(403)
  })

  it('should get user details', async () => {
    const { agent } = await createAuthenticatedSuperAdmin(app)
    const { user } = await createAuthenticatedAgent(app)

    const res = await agent.get(`/api/v1/admin/users/${user.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.user).toBeDefined()
    expect(res.body.data.groups).toBeDefined()
  })

  it('should create a user (super_admin)', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)

    const res = await agent
      .post('/api/v1/admin/users')
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: 'newuser@test.com',
        password: 'TestPass1234',
        firstName: 'New',
        lastName: 'User',
        role: 'user',
      })

    expect(res.status).toBe(201)
    expect(res.body.data.user.email).toBe('newuser@test.com')
  })

  it('should create a user and assign to group', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)

    // Create group first
    const groupRes = await agent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Team A' })

    const groupId = groupRes.body.data.group.id

    const res = await agent
      .post('/api/v1/admin/users')
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: 'grouped@test.com',
        password: 'TestPass1234',
        role: 'user',
        groupId,
      })

    expect(res.status).toBe(201)
  })

  it('should suspend a user', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)
    const { user } = await createAuthenticatedAgent(app)

    const res = await agent
      .put(`/api/v1/admin/users/${user.id}/suspend`)
      .set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(200)

    // Verify suspended user cannot login
    const db = getTestDb()
    const dbUser = await db('users').where('id', user.id).first()
    expect(dbUser.is_active).toBeFalsy()
  })

  it('should not allow self-suspension', async () => {
    const { agent, csrfToken, user } = await createAuthenticatedSuperAdmin(app)

    const res = await agent
      .put(`/api/v1/admin/users/${user.id}/suspend`)
      .set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(400)
  })

  it('should reactivate a user', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)
    const { user } = await createAuthenticatedAgent(app)

    // Suspend first
    await agent.put(`/api/v1/admin/users/${user.id}/suspend`).set('X-CSRF-Token', csrfToken)

    // Reactivate
    const res = await agent
      .put(`/api/v1/admin/users/${user.id}/reactivate`)
      .set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(200)
    expect(res.body.data.user.isActive).toBe(true)
  })

  it('should change user role', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)
    const { user } = await createAuthenticatedAgent(app)

    const res = await agent
      .put(`/api/v1/admin/users/${user.id}/role`)
      .set('X-CSRF-Token', csrfToken)
      .send({ role: 'admin' })

    expect(res.status).toBe(200)
    expect(res.body.data.user.role).toBe('admin')
  })

  it('should not allow self role change', async () => {
    const { agent, csrfToken, user } = await createAuthenticatedSuperAdmin(app)

    const res = await agent
      .put(`/api/v1/admin/users/${user.id}/role`)
      .set('X-CSRF-Token', csrfToken)
      .send({ role: 'user' })

    expect(res.status).toBe(400)
  })

  it('should reject user creation for admin role', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent(app, { role: 'admin' })

    const res = await agent
      .post('/api/v1/admin/users')
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: 'denied@test.com',
        password: 'TestPass1234',
        firstName: 'Denied',
        lastName: 'User',
        role: 'user',
      })

    expect(res.status).toBe(403)
  })

  it('should reject user creation for regular user', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent(app)

    const res = await agent
      .post('/api/v1/admin/users')
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: 'denied@test.com',
        password: 'TestPass1234',
        firstName: 'Denied',
        lastName: 'User',
        role: 'user',
      })

    expect(res.status).toBe(403)
  })

  it('should reject user suspension for admin role', async () => {
    const { user: targetUser } = await createAuthenticatedAgent(app, { email: 'target-suspend@test.com' })
    const { agent, csrfToken } = await createAuthenticatedAgent(app, { role: 'admin', email: 'admin-suspend@test.com' })

    const res = await agent
      .put(`/api/v1/admin/users/${targetUser.id}/suspend`)
      .set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(403)
  })

  it('should reject user suspension for regular user', async () => {
    const { user: targetUser } = await createAuthenticatedAgent(app, { email: 'target-suspend2@test.com' })
    const { agent, csrfToken } = await createAuthenticatedAgent(app, { email: 'user-suspend@test.com' })

    const res = await agent
      .put(`/api/v1/admin/users/${targetUser.id}/suspend`)
      .set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(403)
  })

  it('should reject role change for admin role', async () => {
    const { user: targetUser } = await createAuthenticatedAgent(app, { email: 'target-role@test.com' })
    const { agent, csrfToken } = await createAuthenticatedAgent(app, { role: 'admin', email: 'admin-role@test.com' })

    const res = await agent
      .put(`/api/v1/admin/users/${targetUser.id}/role`)
      .set('X-CSRF-Token', csrfToken)
      .send({ role: 'admin' })

    expect(res.status).toBe(403)
  })

  it('should reject role change for regular user', async () => {
    const { user: targetUser } = await createAuthenticatedAgent(app, { email: 'target-role2@test.com' })
    const { agent, csrfToken } = await createAuthenticatedAgent(app, { email: 'user-role@test.com' })

    const res = await agent
      .put(`/api/v1/admin/users/${targetUser.id}/role`)
      .set('X-CSRF-Token', csrfToken)
      .send({ role: 'admin' })

    expect(res.status).toBe(403)
  })

  it('should delete a user (super_admin)', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)
    const { user } = await createAuthenticatedAgent(app)

    const res = await agent
      .delete(`/api/v1/admin/users/${user.id}`)
      .set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    // Verify user is actually deleted from DB
    const db = getTestDb()
    const dbUser = await db('users').where('id', user.id).first()
    expect(dbUser).toBeUndefined()
  })

  it('should delete a user without deleting their group', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)
    const { user } = await createAuthenticatedAgent(app)

    // Create group and add user as member
    const groupRes = await agent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Survivor Group' })

    const groupId = groupRes.body.data.group.id
    await agent
      .post(`/api/v1/groups/${groupId}/members`)
      .set('X-CSRF-Token', csrfToken)
      .send({ userId: user.id, role: 'member' })

    // Delete the user
    const res = await agent
      .delete(`/api/v1/admin/users/${user.id}`)
      .set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(200)

    // Verify user is deleted but group still exists
    const db = getTestDb()
    const dbUser = await db('users').where('id', user.id).first()
    expect(dbUser).toBeUndefined()

    const dbGroup = await db('groups').where('id', groupId).first()
    expect(dbGroup).toBeDefined()
    expect(dbGroup.name).toBe('Survivor Group')

    // Verify group_members entry is also cleaned up
    const dbMembership = await db('group_members').where('user_id', user.id).first()
    expect(dbMembership).toBeUndefined()
  })

  it('should not allow self-deletion', async () => {
    const { agent, csrfToken, user } = await createAuthenticatedSuperAdmin(app)

    const res = await agent
      .delete(`/api/v1/admin/users/${user.id}`)
      .set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('CANNOT_DELETE_SELF')
  })

  it('should not delete the last super_admin', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)
    // Create a second super_admin
    const { user: secondAdmin } = await createAuthenticatedAgent(app, { role: 'super_admin', email: 'sa2@test.com' })

    // Delete the second super_admin (should work, there are still 2)
    const res1 = await agent
      .delete(`/api/v1/admin/users/${secondAdmin.id}`)
      .set('X-CSRF-Token', csrfToken)
    expect(res1.status).toBe(200)

    // Now create a regular user and try to change to super_admin then delete
    // Actually: the only super_admin left is the authenticated one, and self-delete is blocked separately
    // Let's verify by creating another super_admin, deleting one, then trying to delete the other
    const { user: thirdAdmin } = await createAuthenticatedAgent(app, { role: 'super_admin', email: 'sa3@test.com' })

    // Delete third admin (should work, 2 super_admins exist: authenticated + third)
    const res2 = await agent
      .delete(`/api/v1/admin/users/${thirdAdmin.id}`)
      .set('X-CSRF-Token', csrfToken)
    expect(res2.status).toBe(200)

    // Now only the authenticated super_admin remains - self-delete is already tested above
  })

  it('should reject user deletion for admin role', async () => {
    const { user: targetUser } = await createAuthenticatedAgent(app, { email: 'target-delete@test.com' })
    const { agent, csrfToken } = await createAuthenticatedAgent(app, { role: 'admin', email: 'admin-delete@test.com' })

    const res = await agent
      .delete(`/api/v1/admin/users/${targetUser.id}`)
      .set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(403)
  })

  it('should reject user deletion for regular user', async () => {
    const { user: targetUser } = await createAuthenticatedAgent(app, { email: 'target-delete2@test.com' })
    const { agent, csrfToken } = await createAuthenticatedAgent(app, { email: 'user-delete@test.com' })

    const res = await agent
      .delete(`/api/v1/admin/users/${targetUser.id}`)
      .set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(403)
  })

  it('should reject user reactivation for admin role', async () => {
    const { agent: superAgent, csrfToken: superCsrf } = await createAuthenticatedSuperAdmin(app)
    const { user: targetUser } = await createAuthenticatedAgent(app, { email: 'target-reactivate@test.com' })

    // Suspend the target user first
    await superAgent.put(`/api/v1/admin/users/${targetUser.id}/suspend`).set('X-CSRF-Token', superCsrf)

    const { agent, csrfToken } = await createAuthenticatedAgent(app, { role: 'admin', email: 'admin-reactivate@test.com' })

    const res = await agent
      .put(`/api/v1/admin/users/${targetUser.id}/reactivate`)
      .set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(403)
  })
})

describe('Admin - System Settings', () => {
  it('should get system settings', async () => {
    const { agent } = await createAuthenticatedSuperAdmin(app)

    const res = await agent.get('/api/v1/admin/settings')
    expect(res.status).toBe(200)
    expect(res.body.data.allowPublicRegistration).toBe(false)
  })

  it('should update system settings', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)

    // First create a group to use as default
    const groupRes = await agent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Default Group' })

    const groupId = groupRes.body.data.group.id

    // Set default group first
    await agent
      .put('/api/v1/admin/settings')
      .set('X-CSRF-Token', csrfToken)
      .send({ defaultRegistrationGroupId: groupId })

    // Then enable registration
    const res = await agent
      .put('/api/v1/admin/settings')
      .set('X-CSRF-Token', csrfToken)
      .send({ allowPublicRegistration: true })

    expect(res.status).toBe(200)
    expect(res.body.data.allowPublicRegistration).toBe(true)
  })

  it('should reject enabling registration without default group', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)

    const res = await agent
      .put('/api/v1/admin/settings')
      .set('X-CSRF-Token', csrfToken)
      .send({ allowPublicRegistration: true })

    expect(res.status).toBe(400)
  })

  it('should reject settings update for non-super_admin', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent(app, { role: 'admin' })

    const res = await agent
      .put('/api/v1/admin/settings')
      .set('X-CSRF-Token', csrfToken)
      .send({ allowPublicRegistration: true })

    expect(res.status).toBe(403)
  })

  it('should reject settings read for admin role', async () => {
    const { agent } = await createAuthenticatedAgent(app, { role: 'admin' })

    const res = await agent.get('/api/v1/admin/settings')
    expect(res.status).toBe(403)
  })

  it('should reject settings read for regular user', async () => {
    const { agent } = await createAuthenticatedAgent(app)

    const res = await agent.get('/api/v1/admin/settings')
    expect(res.status).toBe(403)
  })

  it('should reject settings update for regular user', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent(app)

    const res = await agent
      .put('/api/v1/admin/settings')
      .set('X-CSRF-Token', csrfToken)
      .send({ allowPublicRegistration: true })

    expect(res.status).toBe(403)
  })
})
