import { test, expect } from '@playwright/test';

test.describe('DevBrand PR Generator', () => {
  test('should load the homepage and render the form', async ({ page }) => {
    await page.goto('/');
    
    // Check main headings
    await expect(page.locator('h1')).toContainText('LinkedIn clout');
    
    // Check form elements
    const input = page.getByPlaceholder('https://github.com/owner/repo/pull/123');
    await expect(input).toBeVisible();
    
    const button = page.getByRole('button', { name: /Generate Post/i });
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
  });

  test('should mock the GitHub PR URL and show results', async ({ page }) => {
    // We will intercept the server function API calls or mock the API
    // TanStack Start server functions use `/_server/?_serverFnId=generatePost` or similar
    await page.route('**/_server/**', async route => {
      const request = route.request();
      if (request.method() === 'POST' && request.url().includes('generatePost')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            brutalTruth: "This PR is absolute garbage. You added 50 lines of React hooks to do what CSS does natively.",
            linkedInSpin: "🚀 Just shipped an incredible architectural refactor leveraging modern React paradigms to optimize our render cycle! Always be building. #react #growth #10x"
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');
    
    // Fill the form
    const input = page.getByPlaceholder('https://github.com/owner/repo/pull/123');
    await input.fill('https://github.com/facebook/react/pull/123');
    
    // Submit
    const button = page.getByRole('button', { name: /Generate Post/i });
    await expect(button).toBeEnabled();
    await button.click();

    // Verify Results
    await expect(page.locator('text=The Brutal Truth')).toBeVisible();
    await expect(page.locator('text=This PR is absolute garbage.')).toBeVisible();
    
    await expect(page.locator('text=The LinkedIn Spin')).toBeVisible();
    await expect(page.locator('text=Just shipped an incredible architectural refactor')).toBeVisible();
  });
});
