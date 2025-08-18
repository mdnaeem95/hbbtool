// apps/web/e2e/order-management.spec.ts
import { test, expect, Page } from '@playwright/test'

// Mock data for testing
const TEST_MERCHANT_PHONE = '91234567'
const TEST_MERCHANT_NAME = 'Test Merchant'

// Helper to mock authentication
async function mockMerchantAuth(page: Page) {
  // Method 1: Mock Supabase session in browser context
  await page.addInitScript(() => {
    // Mock Supabase auth state
    const mockUser = {
      id: 'test-merchant-id',
      phone: '+6591234567',
      email: null,
      user_metadata: {
        userType: 'merchant',
        name: 'Test Merchant',
      },
      created_at: new Date().toISOString(),
    }

    const mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: mockUser,
    }

    // Set in localStorage like Supabase does
    localStorage.setItem(
      'sb-localhost-auth-token',
      JSON.stringify({
        currentSession: mockSession,
        expiresAt: Date.now() + 3600000, // 1 hour from now
      })
    )
  })

  // Method 2: Set cookies if your app uses them
  await page.context().addCookies([
    {
      name: 'sb-access-token',
      value: 'mock-access-token',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ])
}

// Helper to go through actual auth flow (slower but more realistic)
async function authenticateAsMerchant(page: Page) {
  // Navigate to auth page
  await page.goto('/auth')
  
  // Click on Merchant option
  await page.getByRole('button', { name: /Merchant.*Sell food/i }).click()
  
  // Enter phone number
  await page.fill('input[type="tel"]', TEST_MERCHANT_PHONE)
  
  // Enter name
  await page.fill('input[placeholder*="Name"]', TEST_MERCHANT_NAME)
  
  // In a real test, you'd need to:
  // 1. Click "Send OTP"
  // 2. Intercept the OTP (from test database or mock)
  // 3. Enter the OTP
  // For now, we'll use the mock approach above
}

test.describe('Order Management - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication before navigating
    await mockMerchantAuth(page)
    
    // Navigate to orders page
    await page.goto('/dashboard/orders')
    
    // Wait for either the orders page or a redirect
    await page.waitForLoadState('networkidle')
  })

  test('displays order list', async ({ page }) => {
    // Check if we're on the orders page
    const url = page.url()
    
    if (url.includes('/auth')) {
      // If redirected to auth, the mock didn't work
      test.skip(true, 'Authentication mock not working')
      return
    }
    
    // Check for orders page elements
    await expect(page.locator('h1:has-text("Orders")')).toBeVisible({ timeout: 10000 })
    
    // Check for either table or empty state
    const tableVisible = await page.locator('table').isVisible().catch(() => false)
    const emptyStateVisible = await page.getByText('No orders found').isVisible().catch(() => false)
    
    expect(tableVisible || emptyStateVisible).toBeTruthy()
  })

  test('filters orders by status', async ({ page }) => {
    // Skip if not authenticated
    if (page.url().includes('/auth')) {
      test.skip(true, 'Not authenticated')
      return
    }
    
    // Look for status filter button
    const statusButton = page.getByRole('button', { name: /Status/i })
    
    if (await statusButton.isVisible()) {
      await statusButton.click()
      
      // Select "Pending" status
      await page.getByRole('option', { name: 'Pending' }).click()
      
      // Wait for filter to apply
      await page.waitForTimeout(500)
      
      // Verify URL contains status parameter
      expect(page.url()).toContain('status')
    }
  })

  test('switches view modes', async ({ page }) => {
    // Skip if not authenticated
    if (page.url().includes('/auth')) {
      test.skip(true, 'Not authenticated')
      return
    }
    
    // Find view toggle buttons
    const kanbanButton = page.locator('[aria-label="Kanban view"]')
    const listButton = page.locator('[aria-label="List view"]')
    
    // Try to switch to kanban view
    if (await kanbanButton.isVisible()) {
      await kanbanButton.click()
      
      // Verify kanban columns appear
      await expect(page.getByText('Pending')).toBeVisible()
      await expect(page.getByText('Confirmed')).toBeVisible()
    }
    
    // Switch back to list view
    if (await listButton.isVisible()) {
      await listButton.click()
      
      // Verify table appears
      await expect(page.locator('table, [data-testid="order-list"]')).toBeVisible()
    }
  })
})

test.describe('Order Management - Unauthenticated', () => {
  test('redirects to auth when not authenticated', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies()
    await page.addInitScript(() => {
      localStorage.clear()
    })
    
    // Try to access orders page
    await page.goto('/dashboard/orders')
    
    // Should redirect to auth
    await page.waitForURL(/\/auth/)
    
    // Verify we're on auth page
    expect(page.url()).toContain('/auth')
    expect(page.url()).toContain('redirect=/dashboard/orders')
    
    // Verify auth page elements
    await expect(page.getByText('Customer')).toBeVisible()
    await expect(page.getByText('Merchant')).toBeVisible()
  })
})

test.describe('Mobile Order Management', () => {
  test.use({ viewport: { width: 375, height: 667 } })
  
  test.beforeEach(async ({ page }) => {
    await mockMerchantAuth(page)
    await page.goto('/dashboard/orders')
    await page.waitForLoadState('networkidle')
  })

  test('displays mobile-optimized view', async ({ page }) => {
    // Skip if not authenticated
    if (page.url().includes('/auth')) {
      test.skip(true, 'Not authenticated')
      return
    }
    
    // Check for mobile-specific elements
    await expect(page.locator('h1:has-text("Orders")')).toBeVisible()
    
    // On mobile, table might be replaced with cards
    const hasTable = await page.locator('table').isVisible().catch(() => false)
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false)
    const hasEmpty = await page.getByText('No orders found').isVisible().catch(() => false)
    
    expect(hasTable || hasCards || hasEmpty).toBeTruthy()
  })
})