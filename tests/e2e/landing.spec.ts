import { test, expect } from '@playwright/test';

test.describe('Landing Page E2E', () => {
  test('should load the landing page and render the hero section', async ({ page }) => {
    await page.goto('/');

    // Check SEO Title
    await expect(page).toHaveTitle(/DevBrand/);

    // Verify main headline is visible
    await expect(page.locator('h1')).toContainText('Engineering');
    await expect(page.locator('h1')).toContainText('Judgment.');
    
    // Check if the "See How it Works" button is present and navigates correctly
    const demoButton = page.locator('a[href="#demo"]');
    await expect(demoButton).toBeVisible();
  });

  test('should render the 3D Topology background canvas', async ({ page }) => {
    await page.goto('/');
    // Check if the React Three Fiber canvas is mounted
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should render the Leaderboards correctly', async ({ page }) => {
    await page.goto('/leaderboards');
    await expect(page.locator('h1')).toHaveText('🏆 Global Leaderboard');
    // Ensure the table renders
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th').first()).toHaveText('Rank');
  });
});
