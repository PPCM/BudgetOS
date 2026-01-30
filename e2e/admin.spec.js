import { test, expect } from '@playwright/test'
import { loginAsSuperAdmin, createUserViaAdmin, registerViaApi, loginViaApi, getCsrfToken } from './helpers/auth.js'

const BASE = 'http://localhost:3000'

test.describe('Admin – User management', () => {
  let csrfToken

  test.beforeEach(async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    csrfToken = sa.csrfToken
  })

  test('should list users', async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/v1/admin/users`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.pagination).toBeDefined()
  })

  test('should list users with role filter', async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/v1/admin/users?role=super_admin`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBeGreaterThan(0)
    for (const user of body.data) {
      expect(user.role).toBe('super_admin')
    }
  })

  test('should list users with pagination', async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/v1/admin/users?page=1&limit=2`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBeLessThanOrEqual(2)
    expect(body.pagination.limit).toBe(2)
  })

  test('should create a user via admin API', async ({ page }) => {
    const { user, email, status } = await createUserViaAdmin(page, csrfToken)
    expect(status).toBe(201)
    expect(user).toBeDefined()
    expect(user.id).toBeDefined()
    expect(user.email).toBe(email)
    expect(user.role).toBeDefined()
  })

  test('should create admin user with group assignment', async ({ page }) => {
    // First create a group
    const groupRes = await page.request.post(`${BASE}/api/v1/groups`, {
      data: { name: `Admin Group ${Date.now()}`, description: 'Test group' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const groupBody = await groupRes.json()
    const groupId = groupBody.data.group.id

    // Create user with group assignment
    const { user, status } = await createUserViaAdmin(page, csrfToken, {
      role: 'admin',
      groupId,
    })
    expect(status).toBe(201)

    // Verify user details include the group
    const detailRes = await page.request.get(`${BASE}/api/v1/admin/users/${user.id}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(detailRes.status()).toBe(200)
    const detailBody = await detailRes.json()
    expect(detailBody.data.groups).toBeDefined()
    expect(detailBody.data.groups.some(g => g.id === groupId)).toBe(true)
  })

  test('should get user details by ID', async ({ page }) => {
    const { user } = await createUserViaAdmin(page, csrfToken)

    const res = await page.request.get(`${BASE}/api/v1/admin/users/${user.id}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.user).toBeDefined()
    expect(body.data.user.id).toBe(user.id)
    expect(body.data.groups).toBeDefined()
  })

  test('should suspend a user', async ({ page }) => {
    const { user, email, password } = await createUserViaAdmin(page, csrfToken)

    const suspendRes = await page.request.put(`${BASE}/api/v1/admin/users/${user.id}/suspend`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(suspendRes.status()).toBe(200)

    // Verify suspended user cannot login
    const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
    const { csrfToken: loginCsrf } = await csrfRes.json()
    const loginRes = await page.request.post(`${BASE}/api/v1/auth/login`, {
      data: { email, password },
      headers: { 'X-CSRF-Token': loginCsrf },
    })
    expect(loginRes.status()).toBe(403)
  })

  test('should reactivate a suspended user', async ({ page }) => {
    const { user } = await createUserViaAdmin(page, csrfToken)

    // Suspend first
    await page.request.put(`${BASE}/api/v1/admin/users/${user.id}/suspend`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })

    // Reactivate
    const reactivateRes = await page.request.put(`${BASE}/api/v1/admin/users/${user.id}/reactivate`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(reactivateRes.status()).toBe(200)

    // Verify
    const detailRes = await page.request.get(`${BASE}/api/v1/admin/users/${user.id}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const body = await detailRes.json()
    expect(body.data.user.isActive).toBe(true)
  })

  test('should prevent self-suspension', async ({ page }) => {
    // Get own user id
    const meRes = await page.request.get(`${BASE}/api/v1/auth/me`)
    const meBody = await meRes.json()
    const ownId = meBody.data.user.id

    const res = await page.request.put(`${BASE}/api/v1/admin/users/${ownId}/suspend`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(400)
  })

  test('should change user role', async ({ page }) => {
    const { user } = await createUserViaAdmin(page, csrfToken)

    const res = await page.request.put(`${BASE}/api/v1/admin/users/${user.id}/role`, {
      data: { role: 'admin' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.user.role).toBe('admin')
  })

  test('should prevent self-role-change', async ({ page }) => {
    const meRes = await page.request.get(`${BASE}/api/v1/auth/me`)
    const meBody = await meRes.json()
    const ownId = meBody.data.user.id

    const res = await page.request.put(`${BASE}/api/v1/admin/users/${ownId}/role`, {
      data: { role: 'admin' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(400)
  })

  test('should reject invalid role value', async ({ page }) => {
    const { user } = await createUserViaAdmin(page, csrfToken)

    const res = await page.request.put(`${BASE}/api/v1/admin/users/${user.id}/role`, {
      data: { role: 'invalid' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(422)
  })
})

test.describe('Admin – System settings', () => {
  let csrfToken

  test.beforeEach(async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    csrfToken = sa.csrfToken
  })

  test('should get system settings', async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/v1/admin/settings`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.settings).toBeDefined()
    expect(body.data.settings.allowPublicRegistration).toBeDefined()
    expect(body.data.settings.defaultRegistrationGroupId).toBeDefined()
  })

  test('should update system settings', async ({ page }) => {
    // Disable public registration
    const res = await page.request.put(`${BASE}/api/v1/admin/settings`, {
      data: { allowPublicRegistration: false },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.settings.allowPublicRegistration).toBe(false)

    // Restore
    await page.request.put(`${BASE}/api/v1/admin/settings`, {
      data: { allowPublicRegistration: true },
      headers: { 'X-CSRF-Token': csrfToken },
    })
  })

  test('should reject enabling registration without default group', async ({ page }) => {
    // Clear default group first
    await page.request.put(`${BASE}/api/v1/admin/settings`, {
      data: { defaultRegistrationGroupId: null },
      headers: { 'X-CSRF-Token': csrfToken },
    })

    // Try to enable registration without group
    const res = await page.request.put(`${BASE}/api/v1/admin/settings`, {
      data: { allowPublicRegistration: true },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(400)

    // Restore: get settings to find existing group id, or create one
    const settingsRes = await page.request.get(`${BASE}/api/v1/admin/settings`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const settingsBody = await settingsRes.json()
    let groupId = settingsBody.data.settings.defaultRegistrationGroupId

    if (!groupId) {
      // Find existing groups
      const groupsRes = await page.request.get(`${BASE}/api/v1/groups`, {
        headers: { 'X-CSRF-Token': csrfToken },
      })
      const groupsBody = await groupsRes.json()
      const activeGroup = groupsBody.data.find(g => g.isActive)
      groupId = activeGroup?.id

      if (!groupId) {
        const createRes = await page.request.post(`${BASE}/api/v1/groups`, {
          data: { name: 'Restore Default' },
          headers: { 'X-CSRF-Token': csrfToken },
        })
        const createBody = await createRes.json()
        groupId = createBody.data.group.id
      }
    }

    // Restore settings
    await page.request.put(`${BASE}/api/v1/admin/settings`, {
      data: { allowPublicRegistration: true, defaultRegistrationGroupId: groupId },
      headers: { 'X-CSRF-Token': csrfToken },
    })
  })
})

test.describe('Admin – Access control', () => {
  test('should deny access for regular user', async ({ page }) => {
    // Register a regular user
    const creds = await registerViaApi(page)

    const csrf = await getCsrfToken(page)

    const res = await page.request.get(`${BASE}/api/v1/admin/users`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(403)
  })

  test('should deny access for admin (non-super_admin)', async ({ page }) => {
    // Login as super_admin first to create an admin user
    const sa = await loginAsSuperAdmin(page)

    const { email, password } = await createUserViaAdmin(page, sa.csrfToken, {
      role: 'admin',
    })

    // Login as the admin user
    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    const res = await page.request.get(`${BASE}/api/v1/admin/users`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(403)
  })

  test('should deny user creation for admin', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    const { email, password } = await createUserViaAdmin(page, sa.csrfToken, { role: 'admin' })

    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    const res = await page.request.post(`${BASE}/api/v1/admin/users`, {
      data: {
        email: `e2e-denied-${Date.now()}@test.com`,
        password: 'TestPass1234',
        firstName: 'Denied',
        lastName: 'User',
        role: 'user',
      },
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(403)
  })

  test('should deny user suspension for admin', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    const { user: targetUser } = await createUserViaAdmin(page, sa.csrfToken)
    const { email, password } = await createUserViaAdmin(page, sa.csrfToken, { role: 'admin' })

    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    const res = await page.request.put(`${BASE}/api/v1/admin/users/${targetUser.id}/suspend`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(403)
  })

  test('should deny role change for admin', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    const { user: targetUser } = await createUserViaAdmin(page, sa.csrfToken)
    const { email, password } = await createUserViaAdmin(page, sa.csrfToken, { role: 'admin' })

    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    const res = await page.request.put(`${BASE}/api/v1/admin/users/${targetUser.id}/role`, {
      data: { role: 'admin' },
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(403)
  })

  test('should deny settings access for admin', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    const { email, password } = await createUserViaAdmin(page, sa.csrfToken, { role: 'admin' })

    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    const getRes = await page.request.get(`${BASE}/api/v1/admin/settings`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(getRes.status()).toBe(403)

    const putRes = await page.request.put(`${BASE}/api/v1/admin/settings`, {
      data: { allowPublicRegistration: false },
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(putRes.status()).toBe(403)
  })

  test('should deny user creation for regular user', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    const { email, password } = await createUserViaAdmin(page, sa.csrfToken, { role: 'user' })

    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    const res = await page.request.post(`${BASE}/api/v1/admin/users`, {
      data: {
        email: `e2e-denied-${Date.now()}@test.com`,
        password: 'TestPass1234',
        firstName: 'Denied',
        lastName: 'User',
        role: 'user',
      },
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(403)
  })

  test('should deny user suspension for regular user', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    const { user: targetUser } = await createUserViaAdmin(page, sa.csrfToken)
    const { email, password } = await createUserViaAdmin(page, sa.csrfToken, { role: 'user' })

    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    const res = await page.request.put(`${BASE}/api/v1/admin/users/${targetUser.id}/suspend`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(403)
  })

  test('should deny settings access for regular user', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)
    const { email, password } = await createUserViaAdmin(page, sa.csrfToken, { role: 'user' })

    await loginViaApi(page, email, password)
    const csrf = await getCsrfToken(page)

    const getRes = await page.request.get(`${BASE}/api/v1/admin/settings`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(getRes.status()).toBe(403)

    const putRes = await page.request.put(`${BASE}/api/v1/admin/settings`, {
      data: { allowPublicRegistration: false },
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(putRes.status()).toBe(403)
  })
})
