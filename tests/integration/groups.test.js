/**
 * Integration tests for /api/v1/groups endpoints
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

describe('Groups - CRUD', () => {
  it('should create a group (super_admin)', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)

    const res = await agent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Finance Team', description: 'Finance department' })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.group.name).toBe('Finance Team')
  })

  it('should reject group creation for non-super_admin', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent(app, { role: 'admin' })

    const res = await agent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Not Allowed' })

    expect(res.status).toBe(403)
  })

  it('should list groups (super_admin sees all)', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)

    await agent.post('/api/v1/groups').set('X-CSRF-Token', csrfToken).send({ name: 'Group A' })
    await agent.post('/api/v1/groups').set('X-CSRF-Token', csrfToken).send({ name: 'Group B' })

    const res = await agent.get('/api/v1/groups')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
  })

  it('should get group details', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)

    const createRes = await agent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Detail Group' })

    const groupId = createRes.body.data.group.id
    const res = await agent.get(`/api/v1/groups/${groupId}`)

    expect(res.status).toBe(200)
    expect(res.body.data.group.name).toBe('Detail Group')
    expect(res.body.data.group.memberCount).toBeDefined()
  })

  it('should update a group (super_admin)', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)

    const createRes = await agent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Old Name' })

    const groupId = createRes.body.data.group.id
    const res = await agent
      .put(`/api/v1/groups/${groupId}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'New Name', description: 'Updated' })

    expect(res.status).toBe(200)
    expect(res.body.data.group.name).toBe('New Name')
  })

  it('should deactivate a group (super_admin)', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)

    const createRes = await agent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'To Delete' })

    const groupId = createRes.body.data.group.id
    const res = await agent.delete(`/api/v1/groups/${groupId}`).set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(200)
    expect(res.body.data.group.isActive).toBe(false)
  })
})

describe('Groups - Members', () => {
  it('should add an existing user as member', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)
    const { user: regularUser } = await createAuthenticatedAgent(app)

    const createRes = await agent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Team' })

    const groupId = createRes.body.data.group.id
    const res = await agent
      .post(`/api/v1/groups/${groupId}/members`)
      .set('X-CSRF-Token', csrfToken)
      .send({ userId: regularUser.id, role: 'member' })

    expect(res.status).toBe(201)
    expect(res.body.data.member.userId).toBe(regularUser.id)
    expect(res.body.data.member.role).toBe('member')
  })

  it('should list group members', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)
    const { user: user1 } = await createAuthenticatedAgent(app, { email: 'member1@test.com' })
    const { user: user2 } = await createAuthenticatedAgent(app, { email: 'member2@test.com' })

    const createRes = await agent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Team' })

    const groupId = createRes.body.data.group.id
    await agent.post(`/api/v1/groups/${groupId}/members`).set('X-CSRF-Token', csrfToken).send({ userId: user1.id })
    await agent.post(`/api/v1/groups/${groupId}/members`).set('X-CSRF-Token', csrfToken).send({ userId: user2.id })

    const res = await agent.get(`/api/v1/groups/${groupId}/members`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
  })

  it('should update member role', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)
    const { user: regularUser } = await createAuthenticatedAgent(app)

    const createRes = await agent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Team' })

    const groupId = createRes.body.data.group.id
    await agent.post(`/api/v1/groups/${groupId}/members`).set('X-CSRF-Token', csrfToken).send({ userId: regularUser.id })

    const res = await agent
      .put(`/api/v1/groups/${groupId}/members/${regularUser.id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ role: 'admin' })

    expect(res.status).toBe(200)
    expect(res.body.data.member.role).toBe('admin')
  })

  it('should remove a member', async () => {
    const { agent, csrfToken } = await createAuthenticatedSuperAdmin(app)
    const { user: regularUser } = await createAuthenticatedAgent(app)

    const createRes = await agent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Team' })

    const groupId = createRes.body.data.group.id
    await agent.post(`/api/v1/groups/${groupId}/members`).set('X-CSRF-Token', csrfToken).send({ userId: regularUser.id })

    const res = await agent
      .delete(`/api/v1/groups/${groupId}/members/${regularUser.id}`)
      .set('X-CSRF-Token', csrfToken)

    expect(res.status).toBe(200)
  })
})

describe('Groups - My Groups', () => {
  it('should return groups for authenticated user', async () => {
    const { agent: adminAgent, csrfToken: adminCsrf, user: adminUser } = await createAuthenticatedSuperAdmin(app)
    const { agent: userAgent, csrfToken: userCsrf, user: regularUser } = await createAuthenticatedAgent(app)

    const createRes = await adminAgent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', adminCsrf)
      .send({ name: 'User Group' })

    const groupId = createRes.body.data.group.id
    await adminAgent
      .post(`/api/v1/groups/${groupId}/members`)
      .set('X-CSRF-Token', adminCsrf)
      .send({ userId: regularUser.id, role: 'member' })

    const res = await userAgent.get('/api/v1/groups/my')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].name).toBe('User Group')
  })
})

describe('Groups - Access Control', () => {
  it('should allow group admin to manage members', async () => {
    const { agent: superAgent, csrfToken: superCsrf } = await createAuthenticatedSuperAdmin(app)
    const { agent: adminAgent, csrfToken: adminCsrf, user: groupAdmin } = await createAuthenticatedAgent(app, { role: 'admin', email: 'gadmin@test.com' })
    const { user: regularUser } = await createAuthenticatedAgent(app, { email: 'regular@test.com' })

    // Super admin creates group
    const createRes = await superAgent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', superCsrf)
      .send({ name: 'Admin Group' })

    const groupId = createRes.body.data.group.id

    // Add group admin
    await superAgent
      .post(`/api/v1/groups/${groupId}/members`)
      .set('X-CSRF-Token', superCsrf)
      .send({ userId: groupAdmin.id, role: 'admin' })

    // Group admin should be able to add a member
    const res = await adminAgent
      .post(`/api/v1/groups/${groupId}/members`)
      .set('X-CSRF-Token', adminCsrf)
      .send({ userId: regularUser.id, role: 'member' })

    expect(res.status).toBe(201)
  })

  it('should reject regular user from managing groups', async () => {
    const { agent: superAgent, csrfToken: superCsrf } = await createAuthenticatedSuperAdmin(app)
    const { agent: userAgent, csrfToken: userCsrf } = await createAuthenticatedAgent(app)

    const createRes = await superAgent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', superCsrf)
      .send({ name: 'Protected Group' })

    const groupId = createRes.body.data.group.id
    const res = await userAgent.get(`/api/v1/groups/${groupId}`)
    expect(res.status).toBe(403)
  })

  it('should reject group listing for regular user', async () => {
    const { agent: userAgent } = await createAuthenticatedAgent(app)

    const res = await userAgent.get('/api/v1/groups')
    expect(res.status).toBe(403)
  })

  it('should reject group update for regular user', async () => {
    const { agent: superAgent, csrfToken: superCsrf } = await createAuthenticatedSuperAdmin(app)
    const { agent: userAgent, csrfToken: userCsrf } = await createAuthenticatedAgent(app)

    const createRes = await superAgent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', superCsrf)
      .send({ name: 'Update Protected' })

    const groupId = createRes.body.data.group.id

    const res = await userAgent
      .put(`/api/v1/groups/${groupId}`)
      .set('X-CSRF-Token', userCsrf)
      .send({ name: 'Hacked' })

    expect(res.status).toBe(403)
  })

  it('should reject group deletion for regular user', async () => {
    const { agent: superAgent, csrfToken: superCsrf } = await createAuthenticatedSuperAdmin(app)
    const { agent: userAgent, csrfToken: userCsrf } = await createAuthenticatedAgent(app)

    const createRes = await superAgent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', superCsrf)
      .send({ name: 'Delete Protected' })

    const groupId = createRes.body.data.group.id

    const res = await userAgent
      .delete(`/api/v1/groups/${groupId}`)
      .set('X-CSRF-Token', userCsrf)

    expect(res.status).toBe(403)
  })

  it('should reject member listing for regular user', async () => {
    const { agent: superAgent, csrfToken: superCsrf } = await createAuthenticatedSuperAdmin(app)
    const { agent: userAgent } = await createAuthenticatedAgent(app)

    const createRes = await superAgent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', superCsrf)
      .send({ name: 'Members Protected' })

    const groupId = createRes.body.data.group.id

    const res = await userAgent.get(`/api/v1/groups/${groupId}/members`)
    expect(res.status).toBe(403)
  })

  it('should reject member add for regular user', async () => {
    const { agent: superAgent, csrfToken: superCsrf } = await createAuthenticatedSuperAdmin(app)
    const { agent: userAgent, csrfToken: userCsrf, user: regularUser } = await createAuthenticatedAgent(app)
    const { user: targetUser } = await createAuthenticatedAgent(app, { email: 'target-add@test.com' })

    const createRes = await superAgent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', superCsrf)
      .send({ name: 'Add Protected' })

    const groupId = createRes.body.data.group.id

    const res = await userAgent
      .post(`/api/v1/groups/${groupId}/members`)
      .set('X-CSRF-Token', userCsrf)
      .send({ userId: targetUser.id, role: 'member' })

    expect(res.status).toBe(403)
  })

  it('should reject member role update for regular user', async () => {
    const { agent: superAgent, csrfToken: superCsrf } = await createAuthenticatedSuperAdmin(app)
    const { agent: userAgent, csrfToken: userCsrf } = await createAuthenticatedAgent(app)
    const { user: targetUser } = await createAuthenticatedAgent(app, { email: 'target-update@test.com' })

    const createRes = await superAgent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', superCsrf)
      .send({ name: 'Role Protected' })

    const groupId = createRes.body.data.group.id

    // Add target as member (via super admin)
    await superAgent
      .post(`/api/v1/groups/${groupId}/members`)
      .set('X-CSRF-Token', superCsrf)
      .send({ userId: targetUser.id, role: 'member' })

    // Regular user tries to update member role
    const res = await userAgent
      .put(`/api/v1/groups/${groupId}/members/${targetUser.id}`)
      .set('X-CSRF-Token', userCsrf)
      .send({ role: 'admin' })

    expect(res.status).toBe(403)
  })

  it('should reject member removal for regular user', async () => {
    const { agent: superAgent, csrfToken: superCsrf } = await createAuthenticatedSuperAdmin(app)
    const { agent: userAgent, csrfToken: userCsrf } = await createAuthenticatedAgent(app)
    const { user: targetUser } = await createAuthenticatedAgent(app, { email: 'target-remove@test.com' })

    const createRes = await superAgent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', superCsrf)
      .send({ name: 'Remove Protected' })

    const groupId = createRes.body.data.group.id

    // Add target as member (via super admin)
    await superAgent
      .post(`/api/v1/groups/${groupId}/members`)
      .set('X-CSRF-Token', superCsrf)
      .send({ userId: targetUser.id, role: 'member' })

    // Regular user tries to remove member
    const res = await userAgent
      .delete(`/api/v1/groups/${groupId}/members/${targetUser.id}`)
      .set('X-CSRF-Token', userCsrf)

    expect(res.status).toBe(403)
  })

  it('should reject group update for admin (non-super_admin)', async () => {
    const { agent: superAgent, csrfToken: superCsrf } = await createAuthenticatedSuperAdmin(app)
    const { agent: adminAgent, csrfToken: adminCsrf } = await createAuthenticatedAgent(app, { role: 'admin', email: 'admin-update@test.com' })

    const createRes = await superAgent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', superCsrf)
      .send({ name: 'Admin Update Protected' })

    const groupId = createRes.body.data.group.id

    const res = await adminAgent
      .put(`/api/v1/groups/${groupId}`)
      .set('X-CSRF-Token', adminCsrf)
      .send({ name: 'Admin Hacked' })

    expect(res.status).toBe(403)
  })

  it('should reject group deletion for admin (non-super_admin)', async () => {
    const { agent: superAgent, csrfToken: superCsrf } = await createAuthenticatedSuperAdmin(app)
    const { agent: adminAgent, csrfToken: adminCsrf } = await createAuthenticatedAgent(app, { role: 'admin', email: 'admin-delete@test.com' })

    const createRes = await superAgent
      .post('/api/v1/groups')
      .set('X-CSRF-Token', superCsrf)
      .send({ name: 'Admin Delete Protected' })

    const groupId = createRes.body.data.group.id

    const res = await adminAgent
      .delete(`/api/v1/groups/${groupId}`)
      .set('X-CSRF-Token', adminCsrf)

    expect(res.status).toBe(403)
  })

  it('should deny group admin cross-group member management', async () => {
    const { agent: superAgent, csrfToken: superCsrf } = await createAuthenticatedSuperAdmin(app)
    const { agent: adminAgent, csrfToken: adminCsrf, user: groupAdmin } = await createAuthenticatedAgent(app, { role: 'admin', email: 'cross-admin@test.com' })
    const { user: targetUser } = await createAuthenticatedAgent(app, { email: 'cross-target@test.com' })

    // Create two groups
    const groupARes = await superAgent.post('/api/v1/groups').set('X-CSRF-Token', superCsrf).send({ name: 'Cross A' })
    const groupAId = groupARes.body.data.group.id

    const groupBRes = await superAgent.post('/api/v1/groups').set('X-CSRF-Token', superCsrf).send({ name: 'Cross B' })
    const groupBId = groupBRes.body.data.group.id

    // Assign admin to group A only
    await superAgent
      .post(`/api/v1/groups/${groupAId}/members`)
      .set('X-CSRF-Token', superCsrf)
      .send({ userId: groupAdmin.id, role: 'admin' })

    // Add target to group B
    await superAgent
      .post(`/api/v1/groups/${groupBId}/members`)
      .set('X-CSRF-Token', superCsrf)
      .send({ userId: targetUser.id, role: 'member' })

    // Group A admin tries to list group B members
    const listRes = await adminAgent.get(`/api/v1/groups/${groupBId}/members`)
    expect(listRes.status).toBe(403)

    // Group A admin tries to update member in group B
    const updateRes = await adminAgent
      .put(`/api/v1/groups/${groupBId}/members/${targetUser.id}`)
      .set('X-CSRF-Token', adminCsrf)
      .send({ role: 'admin' })
    expect(updateRes.status).toBe(403)

    // Group A admin tries to remove member from group B
    const removeRes = await adminAgent
      .delete(`/api/v1/groups/${groupBId}/members/${targetUser.id}`)
      .set('X-CSRF-Token', adminCsrf)
    expect(removeRes.status).toBe(403)
  })
})
