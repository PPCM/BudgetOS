import { test, expect } from '@playwright/test'
import { registerViaApi } from './helpers/auth.js'

const BASE = 'http://localhost:3000'

test.describe('Credit Cards — CRUD and cycles', () => {
  let csrfToken
  let accountId

  test.beforeEach(async ({ page }) => {
    await registerViaApi(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
    csrfToken = (await csrfRes.json()).csrfToken

    // Create base account
    const accRes = await page.request.post(`${BASE}/api/v1/accounts`, {
      data: { name: 'Checking Account', type: 'checking', initialBalance: 5000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    accountId = (await accRes.json()).data.account.id
  })

  test('should create immediate debit card', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/v1/credit-cards`, {
      data: {
        accountId,
        name: 'Visa Immediate',
        cardNumberLast4: '4567',
        expirationDate: '12/27',
        debitType: 'immediate',
        creditLimit: 3000,
        color: '#3B82F6',
        notes: 'Primary card',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.creditCard.name).toBe('Visa Immediate')
    expect(body.data.creditCard.debitType).toBe('immediate')
    expect(Number(body.data.creditCard.creditLimit)).toBe(3000)
    expect(body.data.creditCard.cardNumberLast4).toBe('4567')
  })

  test('should create deferred debit card with debitDay', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/v1/credit-cards`, {
      data: {
        accountId,
        name: 'Visa Deferred',
        expirationDate: '06/28',
        debitType: 'deferred',
        debitDay: 5,
        cycleStartDay: 1,
        creditLimit: 5000,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.data.creditCard.debitType).toBe('deferred')
    expect(body.data.creditCard.debitDay).toBe(5)
    expect(body.data.creditCard.cycleStartDay).toBe(1)
  })

  test('should list credit cards', async ({ page }) => {
    // Create 2 cards
    for (const name of ['Card A', 'Card B']) {
      await page.request.post(`${BASE}/api/v1/credit-cards`, {
        data: { accountId, name, expirationDate: '12/27', debitType: 'immediate' },
        headers: { 'X-CSRF-Token': csrfToken },
      })
    }

    const res = await page.request.get(`${BASE}/api/v1/credit-cards`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.creditCards.length).toBeGreaterThanOrEqual(2)
  })

  test('should get single immediate card', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/credit-cards`, {
      data: { accountId, name: 'Get Test', expirationDate: '12/27', debitType: 'immediate' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const cardId = (await createRes.json()).data.creditCard.id

    const res = await page.request.get(`${BASE}/api/v1/credit-cards/${cardId}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.creditCard.id).toBe(cardId)
    expect(body.data.creditCard.name).toBe('Get Test')
  })

  test('should get single deferred card with currentCycle', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/credit-cards`, {
      data: {
        accountId,
        name: 'Deferred Get',
        expirationDate: '12/27',
        debitType: 'deferred',
        debitDay: 10,
        cycleStartDay: 1,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const cardId = (await createRes.json()).data.creditCard.id

    const res = await page.request.get(`${BASE}/api/v1/credit-cards/${cardId}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.creditCard.id).toBe(cardId)
    // Deferred card should have currentCycle info
    expect(body.data).toHaveProperty('currentCycle')
  })

  test('should update credit card', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/credit-cards`, {
      data: { accountId, name: 'To Update', expirationDate: '12/27', debitType: 'immediate', creditLimit: 1000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const cardId = (await createRes.json()).data.creditCard.id

    const res = await page.request.put(`${BASE}/api/v1/credit-cards/${cardId}`, {
      data: { name: 'Updated Card', creditLimit: 5000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.creditCard.name).toBe('Updated Card')
    expect(Number(body.data.creditCard.creditLimit)).toBe(5000)
  })

  test('should delete credit card', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/credit-cards`, {
      data: { accountId, name: 'To Delete', expirationDate: '12/27', debitType: 'immediate' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const cardId = (await createRes.json()).data.creditCard.id

    const res = await page.request.delete(`${BASE}/api/v1/credit-cards/${cardId}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
  })

  test('should get cycles for deferred card', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/credit-cards`, {
      data: {
        accountId,
        name: 'Cycles Card',
        expirationDate: '12/27',
        debitType: 'deferred',
        debitDay: 5,
        cycleStartDay: 1,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const cardId = (await createRes.json()).data.creditCard.id

    const res = await page.request.get(`${BASE}/api/v1/credit-cards/${cardId}/cycles`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('cycles')
    expect(Array.isArray(body.data.cycles)).toBe(true)
  })

  test('should get current cycle', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/credit-cards`, {
      data: {
        accountId,
        name: 'Current Cycle Card',
        expirationDate: '12/27',
        debitType: 'deferred',
        debitDay: 5,
        cycleStartDay: 1,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const cardId = (await createRes.json()).data.creditCard.id

    const res = await page.request.get(`${BASE}/api/v1/credit-cards/${cardId}/cycles/current`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('cycle')
  })

  test('should create transaction with creditCardId', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/credit-cards`, {
      data: { accountId, name: 'Tx Card', expirationDate: '12/27', debitType: 'immediate' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const creditCardId = (await createRes.json()).data.creditCard.id

    const txRes = await page.request.post(`${BASE}/api/v1/transactions`, {
      data: {
        accountId,
        amount: -99.90,
        description: 'Card purchase',
        date: '2026-01-15',
        type: 'expense',
        creditCardId,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(txRes.status()).toBe(201)
    const txBody = await txRes.json()
    expect(txBody.data.transaction.creditCardId).toBe(creditCardId)
  })

  test('should generate cycle debit for deferred card', async ({ page }) => {
    // Create deferred card
    const createRes = await page.request.post(`${BASE}/api/v1/credit-cards`, {
      data: {
        accountId,
        name: 'Debit Generation Card',
        expirationDate: '12/27',
        debitType: 'deferred',
        debitDay: 5,
        cycleStartDay: 1,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const cardId = (await createRes.json()).data.creditCard.id

    // Create a transaction on this card to have some cycle amount
    await page.request.post(`${BASE}/api/v1/transactions`, {
      data: {
        accountId,
        amount: -50,
        description: 'Deferred purchase',
        date: '2026-01-15',
        type: 'expense',
        creditCardId: cardId,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })

    // Get current cycle
    const cycleRes = await page.request.get(`${BASE}/api/v1/credit-cards/${cardId}/cycles/current`)
    const cycleBody = await cycleRes.json()
    const cycleId = cycleBody.data.cycle?.id

    if (cycleId) {
      const debitRes = await page.request.post(`${BASE}/api/v1/credit-cards/${cardId}/cycles/${cycleId}/debit`, {
        headers: { 'X-CSRF-Token': csrfToken },
      })
      // Accept 200 or 201 for debit generation
      expect([200, 201]).toContain(debitRes.status())
      const debitBody = await debitRes.json()
      expect(debitBody.success).toBe(true)
      expect(debitBody.data).toHaveProperty('debitTransactionId')
    }
  })
})
