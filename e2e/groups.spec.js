import { test, expect } from '@playwright/test'
import { loginAsSuperAdmin, createUserViaAdmin, registerViaApi, loginViaApi, getCsrfToken } from './helpers/auth.js'

const BASE = 'http://localhost:3000'

test.describe('Groups – CRUD', () => {
  let csrfToken

  test.beforeEach(async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    csrfToken = sa.csrfToken
  })

  test('should create a group', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Test Group ${Date.now()}`, description: 'A test group' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.data.group.id).toBeDefined()
    expect(body.data.group.name).toContain('Test Group')
    expect(body.data.group.isActive).toBe(true)
  })

  test('should list groups', async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/v1/groups`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    // The "E2E Default" group should exist from bootstrap
    expect(body.data.some(g => g.name === 'E2E Default')).toBe(true)
  })

  test('should get group details with member count', async ({ page }) => {
    // Create a group
    const createRes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Detail Group ${Date.now()}` },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const groupId = (await createRes.json()).data.group.id

    const res = await page.request.get(`${BASE}/api/v1/groups/${groupId}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.group.id).toBe(groupId)
    expect(typeof body.data.group.memberCount).toBe('number')
  })

  test('should update a group', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Update Group ${Date.now()}` },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const groupId = (await createRes.json()).data.group.id

    const res = await page.request.put(`${BASE}/api/v1/groups/${groupId}`, {
      data: { name: 'Updated Group Name' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.group.name).toBe('Updated Group Name')
  })

  test('should deactivate a group', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Deactivate Group ${Date.now()}` },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const groupId = (await createRes.json()).data.group.id

    const res = await page.request.delete(`${BASE}/api/v1/groups/${groupId}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.group.isActive).toBe(false)
  })
})

test.describe('Groups – Members', () => {
  let csrfToken
  let groupId

  test.beforeEach(async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    csrfToken = sa.csrfToken

    // Create a fresh group for member tests
    const createRes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Members Group ${Date.now()}` },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    groupId = (await createRes.json()).data.group.id
  })

  test('should add existing user as member', async ({ page }) => {
    const { user } = await createUserViaAdmin(page, csrfToken)

    const res = await page.request.post(`${BASE}/api/v1/groups/${groupId}/members`, {
      data: { userId: user.id, role: 'member' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.data.member).toBeDefined()
    expect(body.data.member.userId).toBe(user.id)
  })

  test('should create new user as member', async ({ page }) => {
    const memberEmail = `e2e-newmember-${Date.now()}@test.com`

    const res = await page.request.post(`${BASE}/api/v1/groups/${groupId}/members`, {
      data: {
        email: memberEmail,
        password: 'TestPass1234',
        firstName: 'New',
        lastName: 'Member',
        role: 'member',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.data.member).toBeDefined()
    expect(body.data.member.email).toBe(memberEmail)
  })

  test('should list group members', async ({ page }) => {
    // Add a member first
    const { user } = await createUserViaAdmin(page, csrfToken)
    await page.request.post(`${BASE}/api/v1/groups/${groupId}/members`, {
      data: { userId: user.id, role: 'member' },
      headers: { 'X-CSRF-Token': csrfToken },
    })

    const res = await page.request.get(`${BASE}/api/v1/groups/${groupId}/members`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.pagination).toBeDefined()
  })

  test('should update member role', async ({ page }) => {
    const { user } = await createUserViaAdmin(page, csrfToken, { role: 'admin' })
    await page.request.post(`${BASE}/api/v1/groups/${groupId}/members`, {
      data: { userId: user.id, role: 'member' },
      headers: { 'X-CSRF-Token': csrfToken },
    })

    const res = await page.request.put(`${BASE}/api/v1/groups/${groupId}/members/${user.id}`, {
      data: { role: 'admin' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.member.role).toBe('admin')
  })

  test('should remove a member', async ({ page }) => {
    const { user } = await createUserViaAdmin(page, csrfToken)
    await page.request.post(`${BASE}/api/v1/groups/${groupId}/members`, {
      data: { userId: user.id, role: 'member' },
      headers: { 'X-CSRF-Token': csrfToken },
    })

    const res = await page.request.delete(`${BASE}/api/v1/groups/${groupId}/members/${user.id}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
  })
})

test.describe('Groups – Permissions', () => {
  test('should get my groups (regular user)', async ({ page }) => {
    // Register a regular user (auto-assigned to default group)
    const creds = await registerViaApi(page)
    const csrf = await getCsrfToken(page)

    const res = await page.request.get(`${BASE}/api/v1/groups/my`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    // Should contain default group with memberRole
    if (body.data.length > 0) {
      expect(body.data[0].memberRole).toBeDefined()
    }
  })

  test('should deny group creation for regular user', async ({ page }) => {
    const creds = await registerViaApi(page)
    const csrf = await getCsrfToken(page)

    const res = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: 'Should Fail' },
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(403)
  })

  test('should deny group listing for regular user', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    const { email, password } = await createUserViaAdmin(page, sa.csrfToken, { role: 'user' })

    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    const res = await page.request.get(`${BASE}/api/v1/groups`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(403)
  })

  test('should deny group update for regular user', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    const groupRes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Protected ${Date.now()}` },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    const groupId = (await groupRes.json()).data.group.id

    const { email, password } = await createUserViaAdmin(page, sa.csrfToken, { role: 'user' })
    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    const res = await page.request.put(`${BASE}/api/v1/groups/${groupId}`, {
      data: { name: 'Hacked' },
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(403)
  })

  test('should deny group deletion for regular user', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    const groupRes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Delete Protected ${Date.now()}` },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    const groupId = (await groupRes.json()).data.group.id

    const { email, password } = await createUserViaAdmin(page, sa.csrfToken, { role: 'user' })
    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    const res = await page.request.delete(`${BASE}/api/v1/groups/${groupId}`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(403)
  })

  test('should deny member management for regular user', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)

    const groupRes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Member Protected ${Date.now()}` },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    const groupId = (await groupRes.json()).data.group.id

    // Create a target user and add to group
    const { user: targetUser } = await createUserViaAdmin(page, sa.csrfToken)
    await page.request.post(`${BASE}/api/v1/groups/${groupId}/members`, {
      data: { userId: targetUser.id, role: 'member' },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })

    // Login as a regular user
    const { email, password } = await createUserViaAdmin(page, sa.csrfToken, { role: 'user' })
    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    // Try to list members
    const listRes = await page.request.get(`${BASE}/api/v1/groups/${groupId}/members`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(listRes.status()).toBe(403)

    // Try to add member
    const addRes = await page.request.post(`${BASE}/api/v1/groups/${groupId}/members`, {
      data: { userId: targetUser.id, role: 'member' },
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(addRes.status()).toBe(403)

    // Try to update member role
    const updateRes = await page.request.put(`${BASE}/api/v1/groups/${groupId}/members/${targetUser.id}`, {
      data: { role: 'admin' },
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(updateRes.status()).toBe(403)

    // Try to remove member
    const removeRes = await page.request.delete(`${BASE}/api/v1/groups/${groupId}/members/${targetUser.id}`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(removeRes.status()).toBe(403)
  })

  test('should deny group creation for admin (non-super_admin)', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    const { email, password } = await createUserViaAdmin(page, sa.csrfToken, { role: 'admin' })

    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    const res = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: 'Admin Should Fail' },
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(403)
  })

  test('should deny group update and deletion for admin (non-super_admin)', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    const groupRes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Admin Protected ${Date.now()}` },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    const groupId = (await groupRes.json()).data.group.id

    const { email, password } = await createUserViaAdmin(page, sa.csrfToken, { role: 'admin' })
    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    const updateRes = await page.request.put(`${BASE}/api/v1/groups/${groupId}`, {
      data: { name: 'Admin Hacked' },
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(updateRes.status()).toBe(403)

    const deleteRes = await page.request.delete(`${BASE}/api/v1/groups/${groupId}`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(deleteRes.status()).toBe(403)
  })

  test('should allow group admin to list members', async ({ page }) => {
    // Super admin creates a group and adds a user as group admin
    const sa = await loginAsSuperAdmin(page)

    const groupRes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Admin Access ${Date.now()}` },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    const groupId = (await groupRes.json()).data.group.id

    const { user, email, password } = await createUserViaAdmin(page, sa.csrfToken, {
      role: 'admin',
    })

    // Add user as group admin
    await page.request.post(`${BASE}/api/v1/groups/${groupId}/members`, {
      data: { userId: user.id, role: 'admin' },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })

    // Login as the group admin
    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    const res = await page.request.get(`${BASE}/api/v1/groups/${groupId}/members`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(200)
  })

  test('should deny group admin access to other groups', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)

    // Create two groups
    const groupARes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Group A ${Date.now()}` },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    const groupAId = (await groupARes.json()).data.group.id

    const groupBRes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Group B ${Date.now()}` },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    const groupBId = (await groupBRes.json()).data.group.id

    // Create admin user and assign to group A only
    const { user, email, password } = await createUserViaAdmin(page, sa.csrfToken, {
      role: 'admin',
    })
    await page.request.post(`${BASE}/api/v1/groups/${groupAId}/members`, {
      data: { userId: user.id, role: 'admin' },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })

    // Login as group A admin
    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    // Try to access group B members
    const res = await page.request.get(`${BASE}/api/v1/groups/${groupBId}/members`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(403)
  })

  test('should deny group admin from managing members in another group', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)

    // Create two groups
    const groupARes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Cross A ${Date.now()}` },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    const groupAId = (await groupARes.json()).data.group.id

    const groupBRes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Cross B ${Date.now()}` },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    const groupBId = (await groupBRes.json()).data.group.id

    // Create admin user assigned to group A
    const { user: adminUser, email, password } = await createUserViaAdmin(page, sa.csrfToken, { role: 'admin' })
    await page.request.post(`${BASE}/api/v1/groups/${groupAId}/members`, {
      data: { userId: adminUser.id, role: 'admin' },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })

    // Add a target user to group B
    const { user: targetUser } = await createUserViaAdmin(page, sa.csrfToken)
    await page.request.post(`${BASE}/api/v1/groups/${groupBId}/members`, {
      data: { userId: targetUser.id, role: 'member' },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })

    // Login as group A admin
    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    // Try to update member in group B
    const updateRes = await page.request.put(`${BASE}/api/v1/groups/${groupBId}/members/${targetUser.id}`, {
      data: { role: 'admin' },
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(updateRes.status()).toBe(403)

    // Try to remove member from group B
    const removeRes = await page.request.delete(`${BASE}/api/v1/groups/${groupBId}/members/${targetUser.id}`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(removeRes.status()).toBe(403)
  })

  test('should prevent duplicate membership', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)

    const groupRes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Dup Test ${Date.now()}` },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    const groupId = (await groupRes.json()).data.group.id

    const { user } = await createUserViaAdmin(page, sa.csrfToken)

    // Add once
    await page.request.post(`${BASE}/api/v1/groups/${groupId}/members`, {
      data: { userId: user.id, role: 'member' },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })

    // Add again – should fail
    const res = await page.request.post(`${BASE}/api/v1/groups/${groupId}/members`, {
      data: { userId: user.id, role: 'member' },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    expect(res.status()).toBe(409)
  })

  test('should prevent user from being member of multiple groups', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)

    // Create two groups
    const groupARes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Multi A ${Date.now()}` },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    const groupAId = (await groupARes.json()).data.group.id

    const groupBRes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Multi B ${Date.now()}` },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    const groupBId = (await groupBRes.json()).data.group.id

    // Create a regular user (role: user)
    const { user } = await createUserViaAdmin(page, sa.csrfToken, { role: 'user' })

    // Add to group A as member
    const addARes = await page.request.post(`${BASE}/api/v1/groups/${groupAId}/members`, {
      data: { userId: user.id, role: 'member' },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    expect(addARes.status()).toBe(201)

    // Try to add to group B as member – should fail
    const addBRes = await page.request.post(`${BASE}/api/v1/groups/${groupBId}/members`, {
      data: { userId: user.id, role: 'member' },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    expect(addBRes.status()).toBe(400)
  })
})
