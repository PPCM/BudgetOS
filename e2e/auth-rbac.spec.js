import { test, expect } from '@playwright/test'
import { loginAsSuperAdmin, createUserViaAdmin, registerViaApi, loginViaApi, getCsrfToken } from './helpers/auth.js'

const BASE = 'http://localhost:3000'

test.describe('Auth – RBAC behaviors', () => {
  test('should return groups in /me response', async ({ page }) => {
    await registerViaApi(page)
    const csrf = await getCsrfToken(page)

    const res = await page.request.get(`${BASE}/api/v1/auth/me`, {
      headers: { 'X-CSRF-Token': csrf },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data.groups)).toBe(true)
    // Regular user gets default group with memberRole
    if (body.data.groups.length > 0) {
      expect(body.data.groups[0].memberRole).toBeDefined()
    }
  })

  test('should return user role in /me response', async ({ page }) => {
    await registerViaApi(page)

    const res = await page.request.get(`${BASE}/api/v1/auth/me`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.user.role).toBe('user')
  })

  test('should return super_admin role for bootstrap user', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)

    const res = await page.request.get(`${BASE}/api/v1/auth/me`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.user.role).toBe('super_admin')
  })

  test('should block login for suspended user', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)

    // Create a user and suspend it
    const { user, email, password } = await createUserViaAdmin(page, sa.csrfToken)
    await page.request.put(`${BASE}/api/v1/admin/users/${user.id}/suspend`, {
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })

    // Try to login as the suspended user
    const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
    const { csrfToken } = await csrfRes.json()

    const loginRes = await page.request.post(`${BASE}/api/v1/auth/login`, {
      data: { email, password },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(loginRes.status()).toBe(403)
  })

  test('should allow login after reactivation', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)

    // Create, suspend, then reactivate
    const { user, email, password } = await createUserViaAdmin(page, sa.csrfToken)
    await page.request.put(`${BASE}/api/v1/admin/users/${user.id}/suspend`, {
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })
    await page.request.put(`${BASE}/api/v1/admin/users/${user.id}/reactivate`, {
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })

    // Login should succeed
    const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
    const { csrfToken } = await csrfRes.json()

    const loginRes = await page.request.post(`${BASE}/api/v1/auth/login`, {
      data: { email, password },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(loginRes.status()).toBe(200)
  })

  test('should block registration when disabled', async ({ page }) => {
    const sa = await loginAsSuperAdmin(page)

    // Disable public registration
    await page.request.put(`${BASE}/api/v1/admin/settings`, {
      data: { allowPublicRegistration: false },
      headers: { 'X-CSRF-Token': sa.csrfToken },
    })

    // Try to register a new user
    const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
    const { csrfToken } = await csrfRes.json()

    const registerRes = await page.request.post(`${BASE}/api/v1/auth/register`, {
      data: {
        email: `e2e-blocked-${Date.now()}@test.com`,
        password: 'TestPass1234',
        passwordConfirm: 'TestPass1234',
        firstName: 'Blocked',
        lastName: 'User',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(registerRes.status()).toBe(403)

    // Restore registration
    // Need to re-login as super_admin (session may have changed)
    const sa2 = await loginAsSuperAdmin(page)
    await page.request.put(`${BASE}/api/v1/admin/settings`, {
      data: { allowPublicRegistration: true },
      headers: { 'X-CSRF-Token': sa2.csrfToken },
    })
  })

  test('should allow registration when enabled', async ({ page }) => {
    // Registration is enabled by default via bootstrap
    const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
    const { csrfToken } = await csrfRes.json()

    const res = await page.request.post(`${BASE}/api/v1/auth/register`, {
      data: {
        email: `e2e-allowed-${Date.now()}@test.com`,
        password: 'TestPass1234',
        passwordConfirm: 'TestPass1234',
        firstName: 'Allowed',
        lastName: 'User',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
  })

  test('should assign default group to new registered user', async ({ page }) => {
    // Use registerViaApi which ensures bootstrap is done first
    await registerViaApi(page)

    // Check /me for groups
    const meRes = await page.request.get(`${BASE}/api/v1/auth/me`)
    expect(meRes.status()).toBe(200)
    const body = await meRes.json()
    expect(body.data.groups.length).toBeGreaterThan(0)
    // The user should have a memberRole in the default group
    expect(body.data.groups[0].memberRole).toBe('member')
  })
})
