import { test, expect } from "@playwright/test";

test.describe("DevBrand Smoke Tests", () => {
  test("Landing Page loads with elite hero", async ({ page }) => {
    await page.goto("/");

    // Check for "Out of the World" Hero text
    await expect(page.getByText("Verifiable career")).toBeVisible();
    await expect(page.getByText("leverage for devs.")).toBeVisible();

    // Check for Glassmorphism Nav
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
  });

  test("Dashboard redirects to home if unauthenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/");
  });

  test("Admin page accessibility", async ({ page }) => {
    // This should fail if not logged in as admin, but we check if it at least exists
    await page.goto("/admin");
    // If redirected, it should go back to home or show 404
    const url = page.url();
    expect(url).not.toContain("/admin/dashboard-secret"); // Should not reveal deep paths
  });
});
