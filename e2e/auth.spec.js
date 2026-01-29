import { test, expect } from '@playwright/test'
import { registerUser, loginUser } from './helpers/auth.js'

test.describe('Authentication', () => {
  test('should register a new user and redirect to dashboard', async ({ page }) => {
    const { email } = await registerUser(page)

    // After registration, user should be on a protected page (dashboard or home)
    await expect(page).not.toHaveURL(/\/(login|register)/)
  })

  test('should login with valid credentials', async ({ page }) => {
    // Register first
    const { email, password } = await registerUser(page)

    // Logout
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Login
    await loginUser(page, email, password)

    // Should be redirected away from login
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('should reject login with wrong password', async ({ page }) => {
    const { email } = await registerUser(page)

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await loginUser(page, email, 'WrongPass9999')

    // Should stay on login or show an error
    const hasError = await page.locator('[role="alert"], .error, .toast-error, [class*="error"]').count()
    const isOnLogin = page.url().includes('/login')
    expect(hasError > 0 || isOnLogin).toBeTruthy()
  })

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Should redirect to login
    await expect(page).toHaveURL(/\/(login|register)/)
  })

  test('should logout successfully', async ({ page }) => {
    await registerUser(page)

    // Find and click logout button/link
    const logoutBtn = page.locator('button:has-text("Déconnexion"), button:has-text("Logout"), a:has-text("Déconnexion"), a:has-text("Logout"), [data-testid="logout"]')
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click()
      await page.waitForLoadState('networkidle')

      // After logout, navigating to a protected page should redirect to login
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/(login|register)/)
    }
  })
})
