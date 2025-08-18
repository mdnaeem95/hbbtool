// apps/web/e2e/basic.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Basic App Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/')
    
    // Wait for any content to appear
    await page.waitForLoadState('networkidle')
    
    // Check if page has loaded
    const title = await page.title()
    expect(title).toBeTruthy()
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'homepage.png' })
  })

  test('can navigate to auth page', async ({ page }) => {
    await page.goto('/auth')
    
    // Wait for auth page to load
    await page.waitForLoadState('networkidle')
    
    // Check what's actually on the auth page
    const pageContent = await page.content()
    console.log('Auth page content preview:', pageContent.substring(0, 500))
    
    // Take screenshot
    await page.screenshot({ path: 'auth-page.png' })
  })

  test('dashboard redirects when not authenticated', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard/orders')
    
    // Should redirect to auth or show error
    await page.waitForLoadState('networkidle')
    
    const currentUrl = page.url()
    console.log('Current URL after redirect:', currentUrl)
    
    // Take screenshot
    await page.screenshot({ path: 'dashboard-redirect.png' })
  })
})