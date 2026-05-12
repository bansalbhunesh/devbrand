import { test, expect } from "@playwright/test";

/**
 * Admin command center tests require an authenticated admin session. Until
 * we have a fixture that signs a session cookie (HMAC over user id + nonce),
 * the only safe assertion is that the protected route redirects unauthed
 * visitors — i.e. it does NOT silently leak admin UI.
 */
test.describe("Operational guardrails", () => {
  test("admin route does not leak content to unauthenticated requests", async ({
    page,
  }) => {
    await page.goto("/admin");
    // Either redirected away from /admin, or the page renders the unauthed
    // landing/sign-in shell. Either way we must NOT see Command Center copy.
    await expect(page.getByText(/command center/i)).toHaveCount(0);
  });
});
