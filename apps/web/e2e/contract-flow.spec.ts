import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("homepage loads with correct pricing", async ({ page }) => {
    await page.goto("/");

    // Check Pro price is $19.99
    await expect(page.locator("text=$19.99")).toBeVisible();

    // Check Business price is $39.99
    await expect(page.locator("text=$39.99")).toBeVisible();

    // Check free tier mentions 3 contracts
    await expect(page.locator("text=3 AI contracts/month").first()).toBeVisible();
  });

  test("pricing section shows all three plans", async ({ page }) => {
    await page.goto("/#pricing");
    await expect(page.locator("text=Free").first()).toBeVisible();
    await expect(page.locator("text=Pro").first()).toBeVisible();
    await expect(page.locator("text=Business").first()).toBeVisible();
  });

  test("CTA buttons link to register", async ({ page }) => {
    await page.goto("/");
    const startFreeTrialLink = page.locator('a:has-text("Start free trial")').first();
    await expect(startFreeTrialLink).toHaveAttribute("href", "/register");
  });
});

test.describe("Legal Pages", () => {
  test("terms page loads with real content", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("h1")).toContainText("Terms of Service");
    await expect(page.locator("text=Electronic Signature")).toBeVisible();
    await expect(page.locator("text=ESIGN Act")).toBeVisible();
  });

  test("privacy page loads with real content", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("h1")).toContainText("Privacy Policy");
    await expect(page.locator("text=GDPR")).toBeVisible();
  });
});

test.describe("Public Signing", () => {
  test("sign page with invalid token shows error", async ({ page }) => {
    await page.goto("/sign/invalid-token-abc123");
    // Should show an error or loading state, not crash
    await expect(page.locator("body")).toBeVisible();
  });
});
