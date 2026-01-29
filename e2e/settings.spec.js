import { test, expect } from '@playwright/test'
import { registerViaApi, loginViaApi } from './helpers/auth.js'

const BASE = 'http://localhost:3000'

test.describe('Settings — Profile and user preferences', () => {
  let csrfToken

  test.beforeEach(async ({ page }) => {
    await registerViaApi(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
    csrfToken = (await csrfRes.json()).csrfToken
  })

  test('should get default settings', async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/v1/auth/settings`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('settings')
    const settings = body.data.settings
    expect(settings).toHaveProperty('dateFormat')
    expect(settings).toHaveProperty('numberFormat')
    expect(settings).toHaveProperty('weekStartDay')
    expect(settings).toHaveProperty('emailNotifications')
  })

  test('should update profile', async ({ page }) => {
    const res = await page.request.put(`${BASE}/api/v1/auth/profile`, {
      data: {
        firstName: 'Jean',
        lastName: 'Dupont',
        locale: 'en',
        currency: 'USD',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.user.firstName).toBe('Jean')
    expect(body.data.user.lastName).toBe('Dupont')
    expect(body.data.user.locale).toBe('en')
    expect(body.data.user.currency).toBe('USD')
  })

  test('should update display settings', async ({ page }) => {
    const res = await page.request.put(`${BASE}/api/v1/auth/settings`, {
      data: {
        theme: 'dark',
        dateFormat: 'MM/DD/YYYY',
        numberFormat: '1,234.56',
        weekStartDay: 1,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.settings.theme).toBe('dark')
    expect(body.data.settings.dateFormat).toBe('MM/DD/YYYY')
    expect(body.data.settings.numberFormat).toBe('1,234.56')
    expect(body.data.settings.weekStartDay).toBe(1)
  })

  test('should update notification settings', async ({ page }) => {
    const res = await page.request.put(`${BASE}/api/v1/auth/settings`, {
      data: {
        emailNotifications: false,
        notifyLowBalance: true,
        lowBalanceThreshold: 500,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.settings.emailNotifications).toBe(false)
    expect(body.data.settings.notifyLowBalance).toBe(true)
    expect(Number(body.data.settings.lowBalanceThreshold)).toBe(500)
  })

  test('should change password and login with new password', async ({ page }) => {
    const email = `pwd-change-${Date.now()}@test.com`
    const oldPassword = 'TestPass1234'
    const newPassword = 'NewPass5678'

    // Register with known credentials
    const csrfRes1 = await page.request.get(`${BASE}/api/v1/csrf-token`)
    const { csrfToken: token1 } = await csrfRes1.json()

    await page.request.post(`${BASE}/api/v1/auth/register`, {
      data: { email, password: oldPassword, passwordConfirm: oldPassword, firstName: 'Pwd', lastName: 'Test' },
      headers: { 'X-CSRF-Token': token1 },
    })

    // Get fresh CSRF after registration (new session)
    const csrfRes2 = await page.request.get(`${BASE}/api/v1/csrf-token`)
    const { csrfToken: token2 } = await csrfRes2.json()

    // Change password
    const changeRes = await page.request.put(`${BASE}/api/v1/auth/password`, {
      data: {
        currentPassword: oldPassword,
        newPassword,
        newPasswordConfirm: newPassword,
      },
      headers: { 'X-CSRF-Token': token2 },
    })
    expect(changeRes.status()).toBe(200)

    // Logout
    const csrfRes3 = await page.request.get(`${BASE}/api/v1/csrf-token`)
    const { csrfToken: token3 } = await csrfRes3.json()
    await page.request.post(`${BASE}/api/v1/auth/logout`, {
      headers: { 'X-CSRF-Token': token3 },
    })

    // Login with new password
    const csrfRes4 = await page.request.get(`${BASE}/api/v1/csrf-token`)
    const { csrfToken: token4 } = await csrfRes4.json()
    const loginRes = await page.request.post(`${BASE}/api/v1/auth/login`, {
      data: { email, password: newPassword },
      headers: { 'X-CSRF-Token': token4 },
    })
    expect(loginRes.status()).toBe(200)
    const loginBody = await loginRes.json()
    expect(loginBody.success).toBe(true)
    expect(loginBody.data.user.email).toBe(email)
  })

  test('should reject wrong current password', async ({ page }) => {
    const res = await page.request.put(`${BASE}/api/v1/auth/password`, {
      data: {
        currentPassword: 'WrongPassword999',
        newPassword: 'NewPass5678',
        newPasswordConfirm: 'NewPass5678',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  test('should get /me with user and settings', async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/v1/auth/me`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('user')
    expect(body.data.user).toHaveProperty('id')
    expect(body.data.user).toHaveProperty('email')
    expect(body.data).toHaveProperty('settings')
  })
})
