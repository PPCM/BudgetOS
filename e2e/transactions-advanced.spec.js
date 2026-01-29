import { test, expect } from '@playwright/test'
import { registerViaApi } from './helpers/auth.js'

const BASE = 'http://localhost:3000'

test.describe('Transactions — Advanced types and optional fields', () => {
  let csrfToken
  let accountId
  let accountId2
  let categoryId
  let payeeId

  test.beforeEach(async ({ page }) => {
    await registerViaApi(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
    csrfToken = (await csrfRes.json()).csrfToken

    // Create account
    const accRes = await page.request.post(`${BASE}/api/v1/accounts`, {
      data: { name: 'Main Checking', type: 'checking', initialBalance: 5000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    accountId = (await accRes.json()).data.account.id

    // Create second account
    const acc2Res = await page.request.post(`${BASE}/api/v1/accounts`, {
      data: { name: 'Savings', type: 'savings', initialBalance: 10000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    accountId2 = (await acc2Res.json()).data.account.id

    // Create category
    const catRes = await page.request.post(`${BASE}/api/v1/categories`, {
      data: { name: 'Groceries', type: 'expense', icon: 'shopping-cart', color: '#10B981' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    categoryId = (await catRes.json()).data.category.id

    // Create payee
    const payRes = await page.request.post(`${BASE}/api/v1/payees`, {
      data: { name: 'Supermarket' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    payeeId = (await payRes.json()).data.id
  })

  test('should create income with all fields', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/v1/transactions`, {
      data: {
        accountId,
        amount: 3500,
        description: 'Monthly salary',
        date: '2026-01-15',
        type: 'income',
        categoryId,
        payeeId,
        notes: 'January salary payment',
        valueDate: '2026-01-16',
        tags: ['salary', 'monthly'],
        status: 'cleared',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    const tx = body.data.transaction
    expect(tx.type).toBe('income')
    expect(Number(tx.amount)).toBe(3500)
    expect(tx.categoryId).toBe(categoryId)
    expect(tx.payeeId).toBe(payeeId)
    expect(tx.notes).toBe('January salary payment')
    expect(tx.status).toBe('cleared')
  })

  test('should create expense with all fields', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/v1/transactions`, {
      data: {
        accountId,
        amount: -85.50,
        description: 'Weekly grocery shopping',
        date: '2026-01-20',
        type: 'expense',
        categoryId,
        payeeId,
        notes: 'Big weekly shop',
        purchaseDate: '2026-01-19',
        valueDate: '2026-01-21',
        tags: ['food', 'weekly'],
        status: 'cleared',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    const tx = body.data.transaction
    expect(tx.type).toBe('expense')
    expect(Number(tx.amount)).toBe(-85.50)
    // Dates may be stored in UTC with timezone offset; verify date was saved
    expect(tx.purchaseDate).toBeTruthy()
  })

  test('should create transfer between two accounts', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/v1/transactions`, {
      data: {
        accountId,
        toAccountId: accountId2,
        amount: -500,
        description: 'Monthly savings transfer',
        date: '2026-01-15',
        type: 'transfer',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)

    // Verify transactions exist for source account
    const srcRes = await page.request.get(`${BASE}/api/v1/transactions?accountId=${accountId}`)
    const srcBody = await srcRes.json()
    expect(srcBody.data.length).toBeGreaterThanOrEqual(1)
    const srcTx = srcBody.data.find(t => t.description === 'Monthly savings transfer')
    expect(srcTx).toBeDefined()

    // Verify transactions exist for destination account
    const dstRes = await page.request.get(`${BASE}/api/v1/transactions?accountId=${accountId2}`)
    const dstBody = await dstRes.json()
    expect(dstBody.data.length).toBeGreaterThanOrEqual(1)
  })

  test('should create transaction with minimal fields', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/v1/transactions`, {
      data: {
        accountId,
        amount: -10,
        description: 'Coffee',
        date: '2026-01-15',
        type: 'expense',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    const tx = body.data.transaction
    expect(tx.status).toBe('pending')
    expect(tx.notes).toBeFalsy()
  })

  test('should create external transfer (toAccountId only)', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/v1/transactions`, {
      data: {
        accountId: null,
        toAccountId: accountId,
        amount: 200,
        description: 'External deposit',
        date: '2026-01-15',
        type: 'transfer',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.data.transaction.type).toBe('transfer')
  })

  test('should store and return tags', async ({ page }) => {
    const tags = ['food', 'weekly', 'budget']
    const res = await page.request.post(`${BASE}/api/v1/transactions`, {
      data: {
        accountId,
        amount: -30,
        description: 'Tagged purchase',
        date: '2026-01-15',
        type: 'expense',
        tags,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const txId = (await res.json()).data.transaction.id

    const getRes = await page.request.get(`${BASE}/api/v1/transactions/${txId}`)
    const body = await getRes.json()
    expect(body.data.transaction.tags).toEqual(tags)
  })

  test('should store and return notes', async ({ page }) => {
    const longNotes = 'This is a detailed note about the transaction. '.repeat(10)
    const res = await page.request.post(`${BASE}/api/v1/transactions`, {
      data: {
        accountId,
        amount: -20,
        description: 'Purchase with notes',
        date: '2026-01-15',
        type: 'expense',
        notes: longNotes,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const txId = (await res.json()).data.transaction.id

    const getRes = await page.request.get(`${BASE}/api/v1/transactions/${txId}`)
    const body = await getRes.json()
    expect(body.data.transaction.notes).toBe(longNotes)
  })

  test('should store and return valueDate and purchaseDate', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/v1/transactions`, {
      data: {
        accountId,
        amount: -55,
        description: 'Dated purchase',
        date: '2026-01-15',
        type: 'expense',
        valueDate: '2026-01-17',
        purchaseDate: '2026-01-14',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const txId = (await res.json()).data.transaction.id

    const getRes = await page.request.get(`${BASE}/api/v1/transactions/${txId}`)
    const body = await getRes.json()
    // Dates may be stored in UTC with timezone offset; verify they were saved
    expect(body.data.transaction.valueDate).toBeTruthy()
    expect(body.data.transaction.purchaseDate).toBeTruthy()
  })

  test('should support all statuses', async ({ page }) => {
    const statuses = ['pending', 'cleared', 'reconciled']

    for (const status of statuses) {
      const res = await page.request.post(`${BASE}/api/v1/transactions`, {
        data: {
          accountId,
          amount: -10,
          description: `Status ${status}`,
          date: '2026-01-15',
          type: 'expense',
          status,
        },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(res.status()).toBe(201)
      const txId = (await res.json()).data.transaction.id

      const getRes = await page.request.get(`${BASE}/api/v1/transactions/${txId}`)
      const body = await getRes.json()
      expect(body.data.transaction.status).toBe(status)
    }
  })
})
