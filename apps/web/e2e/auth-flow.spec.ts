// apps/web/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('shows customer and merchant options', async ({ page }) => {
    await page.goto('/auth')
    
    // Check for auth options
    await expect(page.getByText('Customer')).toBeVisible()
    await expect(page.getByText('Order food')).toBeVisible()
    await expect(page.getByText('Merchant')).toBeVisible()
    await expect(page.getByText('Sell food')).toBeVisible()
  })

  test('can select merchant option', async ({ page }) => {
    await page.goto('/auth')
    
    // Click merchant option
    const merchantButton = page.locator('text=Merchant').locator('..')
    await merchantButton.click()
    
    // Verify merchant option is selected (probably has different styling)
    await expect(merchantButton).toHaveClass(/border-primary|selected|active/)
  })

  test('validates phone number input', async ({ page }) => {
    await page.goto('/auth')
    
    // Select merchant
    await page.locator('text=Merchant').locator('..').click()
    
    // Try to submit without phone number
    await page.getByRole('button', { name: 'Send OTP' }).click()
    
    // Should show validation error or button should be disabled
    const phoneInput = page.locator('input[type="tel"]')
    await expect(phoneInput).toBeFocused()
    
    // Enter invalid phone number
    await phoneInput.fill('123') // Too short
    
    // Enter valid Singapore phone number
    await phoneInput.fill('91234567')
    
    // Button should be enabled
    const sendOtpButton = page.getByRole('button', { name: 'Send OTP' })
    await expect(sendOtpButton).toBeEnabled()
  })

  test('protected routes redirect to auth', async ({ page }) => {
    // Clear any auth
    await page.context().clearCookies()
    
    // Try to access protected routes
    const protectedRoutes = [
      '/dashboard',
      '/dashboard/orders',
      '/dashboard/products',
      '/dashboard/settings',
    ]
    
    for (const route of protectedRoutes) {
      await page.goto(route)
      await expect(page).toHaveURL(/\/auth\?redirect=/)
      expect(page.url()).toContain(`redirect=${encodeURIComponent(route)}`)
    }
  })
})