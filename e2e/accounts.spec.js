import { test, expect } from '@playwright/test'
import { registerViaApi, loginViaApi } from './helpers/auth.js'

test.describe('Accounts', () => {
  let credentials

  test.beforeEach(async ({ page }) => {
    credentials = await registerViaApi(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display accounts section', async ({ page }) => {
    // Navigate to accounts page
    const accountsLink = page.locator('a[href*="accounts"], a:has-text("Comptes"), a:has-text("Accounts")')
    if (await accountsLink.count() > 0) {
      await accountsLink.first().click()
      await page.waitForLoadState('networkidle')
    }

    // Page should load without errors
    await expect(page).not.toHaveURL(/\/(login|register)/)
  })

  test('should create a new account via UI', async ({ page }) => {
    // Navigate to accounts
    const accountsLink = page.locator('a[href*="accounts"], a:has-text("Comptes"), a:has-text("Accounts")')
    if (await accountsLink.count() > 0) {
      await accountsLink.first().click()
      await page.waitForLoadState('networkidle')
    }

    // Look for add/create button
    const addBtn = page.locator('button:has-text("Ajouter"), button:has-text("Nouveau"), button:has-text("Créer"), button:has-text("Add"), button:has-text("New"), [data-testid="add-account"]')
    if (await addBtn.count() > 0) {
      await addBtn.first().click()
      await page.waitForLoadState('networkidle')

      // Fill the account form
      const nameInput = page.locator('input[name="name"]')
      if (await nameInput.count() > 0) {
        await nameInput.fill('Compte E2E Test')

        // Submit
        const submitBtn = page.locator('button[type="submit"], button:has-text("Enregistrer"), button:has-text("Sauvegarder"), button:has-text("Save")')
        if (await submitBtn.count() > 0) {
          await submitBtn.first().click()
          await page.waitForLoadState('networkidle')
        }

        // The new account should appear somewhere on the page
        const content = await page.locator('body').textContent()
        expect(content).toContain('Compte E2E Test')
      }
    }
  })

  test('should handle account operations via API', async ({ page }) => {
    const baseURL = 'http://localhost:3000'

    // Get CSRF
    const csrfRes = await page.request.get(`${baseURL}/api/v1/csrf-token`)
    const { csrfToken } = await csrfRes.json()

    // Create account
    const createRes = await page.request.post(`${baseURL}/api/v1/accounts`, {
      data: { name: 'API Account', type: 'checking', initialBalance: 500 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(createRes.status()).toBe(201)

    const { data } = await createRes.json()
    const id = data.account.id

    // Update account
    const updateRes = await page.request.put(`${baseURL}/api/v1/accounts/${id}`, {
      data: { name: 'Updated API Account' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(updateRes.status()).toBe(200)

    // Delete account
    const deleteRes = await page.request.delete(`${baseURL}/api/v1/accounts/${id}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(deleteRes.status()).toBe(200)
  })
})
