import { test, expect } from "@playwright/test";

test.describe("DevBrand smoke", () => {
  test("landing renders hero + primary CTA", async ({ page }) => {
    await page.goto("/");

    // Hero subhead is the most stable copy — character-by-character TextReveal
    // animations on the H1 ("SYSTEMS OF PROOF") would make literal headline
    // assertions racy.
    await expect(
      page.getByText(/verifiable, high-fidelity career leverage/i),
    ).toBeVisible();

    // Unauthed CTA. If a session cookie ever leaks into the test, the
    // alternative ("Open Workspace") is also accepted.
    const primaryCta = page.getByRole("button", {
      name: /initialize session/i,
    });
    const authedCta = page.getByRole("link", { name: /open workspace/i });
    await expect(primaryCta.or(authedCta)).toBeVisible();

    await expect(page.locator("nav").first()).toBeVisible();
  });

  test("dashboard redirects unauthenticated visitor to landing", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/");
    expect(page.url().replace(/\/$/, "")).toMatch(/^https?:\/\/[^/]+$/);
  });

  test("explore feed renders without auth", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByText(/engineering radar/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /evidence/i })).toBeVisible();
  });

  test("roast-friend page exposes username input + CTA", async ({ page }) => {
    await page.goto("/roast-friend");
    await expect(page.getByText(/roast a friend/i).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /roast their profile/i }),
    ).toBeVisible();
  });
});
