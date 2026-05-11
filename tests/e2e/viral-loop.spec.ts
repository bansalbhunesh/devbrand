import { test, expect } from "@playwright/test";

test.describe("Viral Loops", () => {
  test("roast-a-friend flow loads successfully", async ({ page }) => {
    await page.goto("/roast-friend");

    // Check main copy
    await expect(page.locator("text=Sacrifice a Friend")).toBeVisible();
    await expect(
      page.locator(
        "text=Enter their GitHub username to generate a mathematically accurate, brutally honest roast",
      ),
    ).toBeVisible();

    // Check input exists
    await expect(page.locator('input[placeholder="torvalds"]')).toBeVisible();
    await expect(
      page.locator('button:has-text("Initiate Roast")'),
    ).toBeVisible();
  });
});
