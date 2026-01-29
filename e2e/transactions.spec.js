import { test, expect } from '@playwright/test'
import { registerViaApi } from './helpers/auth.js'

test.describe('Transactions', () => {
  let csrfToken

  test.beforeEach(async ({ page }) => {
    await registerViaApi(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Get CSRF for API calls
    const csrfRes = await page.request.get('http://localhost:3000/api/v1/csrf-token')
    const body = await csrfRes.json()
    csrfToken = body.csrfToken
  })

  test('should display transactions section', async ({ page }) => {
    const txLink = page.locator('a[href*="transaction"], a:has-text("Transactions"), a:has-text("Opérations")')
    if (await txLink.count() > 0) {
      await txLink.first().click()
      await page.waitForLoadState('networkidle')
    }

    await expect(page).not.toHaveURL(/\/(login|register)/)
  })

  test('should create a transaction via API and see it in the list', async ({ page }) => {
    // Create an account first
    const accRes = await page.request.post('http://localhost:3000/api/v1/accounts', {
      data: { name: 'Tx Account', type: 'checking', initialBalance: 2000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const accountId = (await accRes.json()).data.account.id

    // Create a transaction
    const txRes = await page.request.post('http://localhost:3000/api/v1/transactions', {
      data: {
        accountId,
        amount: -42.50,
        description: 'E2E Test Transaction',
        date: '2026-01-15',
        type: 'expense',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(txRes.status()).toBe(201)

    // Navigate to transactions and wait for data to load
    const txLink = page.locator('a[href*="transaction"], a:has-text("Transactions")')
    if (await txLink.count() > 0) {
      await txLink.first().click()
      await page.waitForLoadState('networkidle')

      // Wait for the transaction description to appear (async data loading)
      await page.waitForSelector('text=E2E Test Transaction', { timeout: 10000 }).catch(() => {})
      const content = await page.locator('body').textContent()
      expect(content).toContain('E2E Test Transaction')
    }
  })

  test('should update a transaction via API', async ({ page }) => {
    // Create account
    const accRes = await page.request.post('http://localhost:3000/api/v1/accounts', {
      data: { name: 'Update Account', type: 'checking', initialBalance: 1000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const accountId = (await accRes.json()).data.account.id

    // Create transaction
    const txRes = await page.request.post('http://localhost:3000/api/v1/transactions', {
      data: { accountId, amount: -20, description: 'To Update', date: '2026-01-15', type: 'expense' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const txId = (await txRes.json()).data.transaction.id

    // Update
    const updateRes = await page.request.put(`http://localhost:3000/api/v1/transactions/${txId}`, {
      data: { description: 'Updated E2E' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(updateRes.status()).toBe(200)
    const updated = await updateRes.json()
    expect(updated.data.transaction.description).toBe('Updated E2E')
  })

  test('should delete a transaction via API', async ({ page }) => {
    // Create account
    const accRes = await page.request.post('http://localhost:3000/api/v1/accounts', {
      data: { name: 'Delete Account', type: 'checking', initialBalance: 1000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const accountId = (await accRes.json()).data.account.id

    // Create transaction
    const txRes = await page.request.post('http://localhost:3000/api/v1/transactions', {
      data: { accountId, amount: -15, description: 'To Delete', date: '2026-01-15', type: 'expense' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const txId = (await txRes.json()).data.transaction.id

    // Delete
    const deleteRes = await page.request.delete(`http://localhost:3000/api/v1/transactions/${txId}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(deleteRes.status()).toBe(200)
  })

  test('should filter transactions via API', async ({ page }) => {
    // Create account and transactions
    const accRes = await page.request.post('http://localhost:3000/api/v1/accounts', {
      data: { name: 'Filter Account', type: 'checking', initialBalance: 5000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const accountId = (await accRes.json()).data.account.id

    await page.request.post('http://localhost:3000/api/v1/transactions', {
      data: { accountId, amount: -10, description: 'Small', date: '2026-01-10', type: 'expense' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    await page.request.post('http://localhost:3000/api/v1/transactions', {
      data: { accountId, amount: -500, description: 'Big', date: '2026-01-20', type: 'expense' },
      headers: { 'X-CSRF-Token': csrfToken },
    })

    // Filter by account
    const filterRes = await page.request.get(`http://localhost:3000/api/v1/transactions?accountId=${accountId}`)
    expect(filterRes.status()).toBe(200)
    const body = await filterRes.json()
    // data is a direct array for list endpoints
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBe(2)
  })
})
