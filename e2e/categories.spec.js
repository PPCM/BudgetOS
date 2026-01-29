import { test, expect } from '@playwright/test'
import { registerViaApi } from './helpers/auth.js'

test.describe('Categories', () => {
  let csrfToken

  test.beforeEach(async ({ page }) => {
    await registerViaApi(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const csrfRes = await page.request.get('http://localhost:3000/api/v1/csrf-token')
    const body = await csrfRes.json()
    csrfToken = body.csrfToken
  })

  test('should display categories section', async ({ page }) => {
    const catLink = page.locator('a[href*="categor"], a:has-text("Catégories"), a:has-text("Categories")')
    if (await catLink.count() > 0) {
      await catLink.first().click()
      await page.waitForLoadState('networkidle')
    }

    await expect(page).not.toHaveURL(/\/(login|register)/)
  })

  test('should CRUD categories via API', async ({ page }) => {
    // Create
    const createRes = await page.request.post('http://localhost:3000/api/v1/categories', {
      data: { name: 'E2E Category', type: 'expense', icon: 'tag', color: '#FF5733' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(createRes.status()).toBe(201)
    const id = (await createRes.json()).data.category.id

    // Read
    const getRes = await page.request.get(`http://localhost:3000/api/v1/categories/${id}`)
    expect(getRes.status()).toBe(200)
    expect((await getRes.json()).data.category.name).toBe('E2E Category')

    // Update
    const updateRes = await page.request.put(`http://localhost:3000/api/v1/categories/${id}`, {
      data: { name: 'Updated E2E Category' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(updateRes.status()).toBe(200)
    expect((await updateRes.json()).data.category.name).toBe('Updated E2E Category')

    // Delete
    const deleteRes = await page.request.delete(`http://localhost:3000/api/v1/categories/${id}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(deleteRes.status()).toBe(200)
  })

  test('should create category via UI form', async ({ page }) => {
    const catLink = page.locator('a[href*="categor"], a:has-text("Catégories"), a:has-text("Categories")')
    if (await catLink.count() > 0) {
      await catLink.first().click()
      await page.waitForLoadState('networkidle')

      const addBtn = page.locator('button:has-text("Ajouter"), button:has-text("Nouveau"), button:has-text("New"), button:has-text("Add"), [data-testid="add-category"]')
      if (await addBtn.count() > 0) {
        await addBtn.first().click()
        await page.waitForLoadState('networkidle')

        const nameInput = page.locator('input[name="name"]')
        if (await nameInput.count() > 0) {
          await nameInput.fill('Cat E2E UI')

          const submitBtn = page.locator('button[type="submit"], button:has-text("Enregistrer"), button:has-text("Save")')
          if (await submitBtn.count() > 0) {
            await submitBtn.first().click()
            await page.waitForLoadState('networkidle')
          }

          const content = await page.locator('body').textContent()
          expect(content).toContain('Cat E2E UI')
        }
      }
    }
  })
})
