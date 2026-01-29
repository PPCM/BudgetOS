import { test, expect } from '@playwright/test'
import { registerViaApi } from './helpers/auth.js'

const BASE = 'http://localhost:3000'

test.describe('Validation errors — All endpoints', () => {
  let csrfToken
  let accountId

  test.beforeEach(async ({ page }) => {
    await registerViaApi(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
    csrfToken = (await csrfRes.json()).csrfToken

    // Create a base account for tests that need it
    const accRes = await page.request.post(`${BASE}/api/v1/accounts`, {
      data: { name: 'Test Account', type: 'checking', initialBalance: 1000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    accountId = (await accRes.json()).data.account.id
  })

  // ── Transaction validation ────────────────────────────────────────

  test.describe('Transaction validation', () => {
    test('should reject transaction without accountId (non-transfer)', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/transactions`, {
        data: { amount: -10, description: 'Test', date: '2026-01-15', type: 'expense' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject transaction without amount', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/transactions`, {
        data: { accountId, description: 'Test', date: '2026-01-15', type: 'expense' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject transaction without description', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/transactions`, {
        data: { accountId, amount: -10, date: '2026-01-15', type: 'expense' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject transaction without date', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/transactions`, {
        data: { accountId, amount: -10, description: 'Test', type: 'expense' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject transaction without type', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/transactions`, {
        data: { accountId, amount: -10, description: 'Test', date: '2026-01-15' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject transaction with amount=0', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/transactions`, {
        data: { accountId, amount: 0, description: 'Test', date: '2026-01-15', type: 'expense' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject transaction with invalid date format', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/transactions`, {
        data: { accountId, amount: -10, description: 'Test', date: '15-01-2026', type: 'expense' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject transaction with invalid type', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/transactions`, {
        data: { accountId, amount: -10, description: 'Test', date: '2026-01-15', type: 'debit' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject transaction with description >255 chars', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/transactions`, {
        data: { accountId, amount: -10, description: 'A'.repeat(256), date: '2026-01-15', type: 'expense' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject transfer without any account', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/transactions`, {
        data: { accountId: null, toAccountId: null, amount: -100, description: 'Test', date: '2026-01-15', type: 'transfer' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })
  })

  // ── Account validation ────────────────────────────────────────────

  test.describe('Account validation', () => {
    test('should reject account without name', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/accounts`, {
        data: { type: 'checking' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject account without type', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/accounts`, {
        data: { name: 'Test' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject account with invalid type', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/accounts`, {
        data: { name: 'Test', type: 'bitcoin' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })
  })

  // ── Category validation ───────────────────────────────────────────

  test.describe('Category validation', () => {
    test('should reject category without name', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/categories`, {
        data: { type: 'expense' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject category without type', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/categories`, {
        data: { name: 'Test' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject category with invalid type', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/categories`, {
        data: { name: 'Test', type: 'special' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })
  })

  // ── Credit card validation ────────────────────────────────────────

  test.describe('Credit card validation', () => {
    test('should reject credit card without name', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/credit-cards`, {
        data: { accountId, expirationDate: '12/26', debitType: 'immediate' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject credit card without accountId', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/credit-cards`, {
        data: { name: 'Visa', expirationDate: '12/26', debitType: 'immediate' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject credit card without expirationDate', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/credit-cards`, {
        data: { accountId, name: 'Visa', debitType: 'immediate' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject credit card without debitType', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/credit-cards`, {
        data: { accountId, name: 'Visa', expirationDate: '12/26' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject deferred card without debitDay nor debitDaysBeforeEnd', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/credit-cards`, {
        data: { accountId, name: 'Visa', expirationDate: '12/26', debitType: 'deferred' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })
  })

  // ── Payee validation ──────────────────────────────────────────────

  test.describe('Payee validation', () => {
    test('should reject payee without name', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/payees`, {
        data: { notes: 'test' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
    })

    test('should reject duplicate payee name', async ({ page }) => {
      // Create first payee
      await page.request.post(`${BASE}/api/v1/payees`, {
        data: { name: 'Unique Payee' },
        headers: { 'X-CSRF-Token': csrfToken },
      })

      // Try duplicate
      const res = await page.request.post(`${BASE}/api/v1/payees`, {
        data: { name: 'Unique Payee' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      // Duplicate payee name returns 409 or 422
      expect([409, 422]).toContain(res.status())
    })
  })

  // ── Rule validation ───────────────────────────────────────────────

  test.describe('Rule validation', () => {
    test('should reject rule without name', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/rules`, {
        data: {
          conditions: [{ field: 'description', operator: 'contains', value: 'test' }],
        },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject rule without conditions', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/rules`, {
        data: { name: 'Test Rule' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('should reject rule with invalid operator', async ({ page }) => {
      const res = await page.request.post(`${BASE}/api/v1/rules`, {
        data: {
          name: 'Bad Rule',
          conditions: [{ field: 'description', operator: 'fuzzy', value: 'test' }],
        },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })
  })

  // ── Auth validation ───────────────────────────────────────────────

  test.describe('Auth validation', () => {
    test('should reject registration with invalid email', async ({ page }) => {
      // Need a fresh CSRF for unauthenticated request
      const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
      const { csrfToken: freshToken } = await csrfRes.json()

      const res = await page.request.post(`${BASE}/api/v1/auth/register`, {
        data: {
          email: 'not-an-email',
          password: 'TestPass1234',
          passwordConfirm: 'TestPass1234',
        },
        headers: { 'X-CSRF-Token': freshToken },
      })
      expect(res.status()).toBe(422)
    })

    test('should reject registration with password <8 chars', async ({ page }) => {
      const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
      const { csrfToken: freshToken } = await csrfRes.json()

      const res = await page.request.post(`${BASE}/api/v1/auth/register`, {
        data: {
          email: `short-${Date.now()}@test.com`,
          password: 'Ab1',
          passwordConfirm: 'Ab1',
        },
        headers: { 'X-CSRF-Token': freshToken },
      })
      expect(res.status()).toBe(422)
    })

    test('should reject registration with password missing uppercase/digit', async ({ page }) => {
      const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
      const { csrfToken: freshToken } = await csrfRes.json()

      const res = await page.request.post(`${BASE}/api/v1/auth/register`, {
        data: {
          email: `weak-${Date.now()}@test.com`,
          password: 'alllowercase',
          passwordConfirm: 'alllowercase',
        },
        headers: { 'X-CSRF-Token': freshToken },
      })
      expect(res.status()).toBe(422)
    })

    test('should reject registration with passwordConfirm mismatch', async ({ page }) => {
      const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
      const { csrfToken: freshToken } = await csrfRes.json()

      const res = await page.request.post(`${BASE}/api/v1/auth/register`, {
        data: {
          email: `mismatch-${Date.now()}@test.com`,
          password: 'TestPass1234',
          passwordConfirm: 'Different1234',
        },
        headers: { 'X-CSRF-Token': freshToken },
      })
      expect(res.status()).toBe(422)
    })
  })

  // ── Settings validation ───────────────────────────────────────────

  test.describe('Settings validation', () => {
    test('should reject profile update with invalid locale', async ({ page }) => {
      const res = await page.request.put(`${BASE}/api/v1/auth/profile`, {
        data: { locale: 'jp' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(422)
      const body = await res.json()
      expect(body.success).toBe(false)
    })
  })
})
