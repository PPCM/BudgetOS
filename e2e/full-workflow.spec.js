import { test, expect } from '@playwright/test'
import { registerUser } from './helpers/auth.js'

test.describe('Full Workflow', () => {
  test('should complete a full user journey: register → account → transactions → reports → logout', async ({ page }) => {
    // Step 1: Register
    const { email } = await registerUser(page)
    await expect(page).not.toHaveURL(/\/(login|register)/)

    // Step 2: Get CSRF for API calls
    const csrfRes = await page.request.get('http://localhost:3000/api/v1/csrf-token')
    const { csrfToken } = await csrfRes.json()

    // Step 3: Create an account via API
    const accRes = await page.request.post('http://localhost:3000/api/v1/accounts', {
      data: { name: 'Workflow Account', type: 'checking', initialBalance: 3000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(accRes.status()).toBe(201)
    const accountId = (await accRes.json()).data.account.id

    // Step 4: Create a category
    const catRes = await page.request.post('http://localhost:3000/api/v1/categories', {
      data: { name: 'Groceries', type: 'expense', icon: 'shopping-cart', color: '#10B981' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(catRes.status()).toBe(201)
    const categoryId = (await catRes.json()).data.category.id

    // Step 5: Create transactions
    for (const tx of [
      { amount: -45.50, description: 'Weekly groceries', categoryId },
      { amount: -22.00, description: 'Gas station' },
      { amount: 2500, description: 'Salary', type: 'income' },
    ]) {
      const txRes = await page.request.post('http://localhost:3000/api/v1/transactions', {
        data: {
          accountId,
          date: '2026-01-15',
          type: tx.type || 'expense',
          ...tx,
        },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(txRes.status()).toBe(201)
    }

    // Step 6: Check reports - dashboard
    const dashRes = await page.request.get('http://localhost:3000/api/v1/reports/dashboard')
    expect(dashRes.status()).toBe(200)

    // Step 7: Check reports - monthly trend
    const trendRes = await page.request.get('http://localhost:3000/api/v1/reports/trend/monthly')
    expect(trendRes.status()).toBe(200)

    // Step 8: Navigate to dashboard in the browser
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/(login|register)/)

    // Step 9: Logout via API (more reliable than UI button)
    const logoutRes = await page.request.post('http://localhost:3000/api/v1/auth/logout', {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(logoutRes.status()).toBe(200)

    // Step 10: Verify logged out - protected page redirects to login
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/(login|register)/)
  })

  test('should handle multiple accounts and transfers', async ({ page }) => {
    await registerUser(page)

    const csrfRes = await page.request.get('http://localhost:3000/api/v1/csrf-token')
    const { csrfToken } = await csrfRes.json()

    // Create two accounts
    const acc1Res = await page.request.post('http://localhost:3000/api/v1/accounts', {
      data: { name: 'Checking', type: 'checking', initialBalance: 5000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(acc1Res.status()).toBe(201)
    const acc1Id = (await acc1Res.json()).data.account.id

    const acc2Res = await page.request.post('http://localhost:3000/api/v1/accounts', {
      data: { name: 'Savings', type: 'savings', initialBalance: 10000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(acc2Res.status()).toBe(201)
    const acc2Id = (await acc2Res.json()).data.account.id

    // Create a transfer between accounts
    const transferRes = await page.request.post('http://localhost:3000/api/v1/transactions', {
      data: {
        accountId: acc1Id,
        toAccountId: acc2Id,
        amount: -500,
        description: 'Monthly savings',
        date: '2026-01-15',
        type: 'transfer',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(transferRes.status()).toBe(201)

    // Verify both accounts exist (data is a direct array)
    const accountsRes = await page.request.get('http://localhost:3000/api/v1/accounts')
    expect(accountsRes.status()).toBe(200)
    const body = await accountsRes.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(2)
  })
})
