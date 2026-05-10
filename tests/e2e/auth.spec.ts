import { test, expect } from '@playwright/test';

test.describe('Authentication & Routing', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check for main branding
    await expect(page.locator('text=DevBrand')).toBeVisible();
    await expect(page.locator('text=Turn invisible engineering work into verifiable career leverage')).toBeVisible();
    
    // Check for CTA
    await expect(page.locator('text=Continue with GitHub')).toBeVisible();
  });

  test('explore feed loads and shows roasts', async ({ page }) => {
    await page.goto('/explore');
    
    // Check header
    await expect(page.locator('text=Humiliation Registry')).toBeVisible();
    
    // Check that we have either roasts or the empty state
    const feed = page.locator('.space-y-4');
    await expect(feed).toBeVisible();
  });
});
