import { test, expect } from "@playwright/test";

test.describe("Operational Resilience", () => {
  test("Admin Command Center shows security signals", async ({ page }) => {
    // Note: This requires admin session. In real E2E we'd seed a session.
    await page.goto("/admin");

    // Check for "Command Center" header
    await expect(page.getByText("Command Center")).toBeVisible();

    // Check for Charts (Recharts renders SVG)
    const charts = page.locator("svg");
    await expect(charts.first()).toBeVisible();

    // Check for System Logs
    await expect(page.getByText("System Logs")).toBeVisible();
  });

  test("Background job state machine visualization", async ({ page }) => {
    // In a real test, we would trigger a job and watch it go from PROCESSING to COMPLETED
    await page.goto("/admin");
    await expect(page.getByText("Engine Velocity")).toBeVisible();
  });
});
