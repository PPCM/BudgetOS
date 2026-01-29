import { test, expect } from '@playwright/test'
import { registerViaApi } from './helpers/auth.js'

const BASE = 'http://localhost:3000'

test.describe('Payees — CRUD and advanced operations', () => {
  let csrfToken
  let accountId

  test.beforeEach(async ({ page }) => {
    await registerViaApi(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
    csrfToken = (await csrfRes.json()).csrfToken

    // Create account for transaction tests
    const accRes = await page.request.post(`${BASE}/api/v1/accounts`, {
      data: { name: 'Main Account', type: 'checking', initialBalance: 5000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    accountId = (await accRes.json()).data.account.id
  })

  test('should create payee with all fields', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/v1/payees`, {
      data: {
        name: 'Boulangerie du Coin',
        imageUrl: 'https://example.com/bakery.png',
        notes: 'My favorite bakery',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.data.name).toBe('Boulangerie du Coin')
    expect(body.data.imageUrl).toBe('https://example.com/bakery.png')
    expect(body.data.notes).toBe('My favorite bakery')
  })

  test('should list payees', async ({ page }) => {
    // Create 2 payees
    for (const name of ['Payee Alpha', 'Payee Beta']) {
      await page.request.post(`${BASE}/api/v1/payees`, {
        data: { name },
        headers: { 'X-CSRF-Token': csrfToken },
      })
    }

    const res = await page.request.get(`${BASE}/api/v1/payees`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(2)
  })

  test('should get single payee', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/payees`, {
      data: { name: 'Single Payee' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const payeeId = (await createRes.json()).data.id

    const res = await page.request.get(`${BASE}/api/v1/payees/${payeeId}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe(payeeId)
    expect(body.data.name).toBe('Single Payee')
  })

  test('should update payee', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/payees`, {
      data: { name: 'Old Name' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const payeeId = (await createRes.json()).data.id

    const res = await page.request.put(`${BASE}/api/v1/payees/${payeeId}`, {
      data: { name: 'New Name' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.name).toBe('New Name')
  })

  test('should delete payee', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/payees`, {
      data: { name: 'To Delete' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const payeeId = (await createRes.json()).data.id

    const res = await page.request.delete(`${BASE}/api/v1/payees/${payeeId}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
  })

  test('should get transaction count for payee', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/payees`, {
      data: { name: 'Counted Payee' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const payeeId = (await createRes.json()).data.id

    // Create 3 transactions with this payee
    for (let i = 0; i < 3; i++) {
      await page.request.post(`${BASE}/api/v1/transactions`, {
        data: {
          accountId,
          amount: -(10 + i),
          description: `Purchase ${i}`,
          date: '2026-01-15',
          type: 'expense',
          payeeId,
        },
        headers: { 'X-CSRF-Token': csrfToken },
      })
    }

    const res = await page.request.get(`${BASE}/api/v1/payees/${payeeId}/transactions/count`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Number(body.data.count)).toBe(3)
  })

  test('should reassign transactions between payees', async ({ page }) => {
    // Create source and target payees
    const srcRes = await page.request.post(`${BASE}/api/v1/payees`, {
      data: { name: 'Source Payee' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const srcId = (await srcRes.json()).data.id

    const tgtRes = await page.request.post(`${BASE}/api/v1/payees`, {
      data: { name: 'Target Payee' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const tgtId = (await tgtRes.json()).data.id

    // Create 2 transactions for source payee
    for (let i = 0; i < 2; i++) {
      await page.request.post(`${BASE}/api/v1/transactions`, {
        data: {
          accountId,
          amount: -20,
          description: `Reassign ${i}`,
          date: '2026-01-15',
          type: 'expense',
          payeeId: srcId,
        },
        headers: { 'X-CSRF-Token': csrfToken },
      })
    }

    // Reassign
    const reassignRes = await page.request.post(`${BASE}/api/v1/payees/${srcId}/transactions/reassign`, {
      data: { toPayeeId: tgtId },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(reassignRes.status()).toBe(200)

    // Verify source payee now has 0 transactions
    const srcCountRes = await page.request.get(`${BASE}/api/v1/payees/${srcId}/transactions/count`)
    const srcCount = Number((await srcCountRes.json()).data.count)
    expect(srcCount).toBe(0)

    // Verify target payee now has 2 transactions
    const tgtCountRes = await page.request.get(`${BASE}/api/v1/payees/${tgtId}/transactions/count`)
    const tgtCount = Number((await tgtCountRes.json()).data.count)
    expect(tgtCount).toBe(2)
  })

  test('should search payees by name', async ({ page }) => {
    await page.request.post(`${BASE}/api/v1/payees`, {
      data: { name: 'Boulangerie Martin' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    await page.request.post(`${BASE}/api/v1/payees`, {
      data: { name: 'Supermarche Leclerc' },
      headers: { 'X-CSRF-Token': csrfToken },
    })

    const res = await page.request.get(`${BASE}/api/v1/payees?search=Boulangerie`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)
    expect(body.data.some(p => p.name.includes('Boulangerie'))).toBe(true)
  })

  test('should reject duplicate payee name', async ({ page }) => {
    await page.request.post(`${BASE}/api/v1/payees`, {
      data: { name: 'Unique Shop' },
      headers: { 'X-CSRF-Token': csrfToken },
    })

    const res = await page.request.post(`${BASE}/api/v1/payees`, {
      data: { name: 'Unique Shop' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    // Duplicate returns 409 (Conflict) or 422 (ValidationError)
    expect([409, 422]).toContain(res.status())
  })
})
