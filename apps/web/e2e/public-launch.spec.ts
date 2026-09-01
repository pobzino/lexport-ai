import { expect, test } from "@playwright/test";

test.describe("Public launch smoke", () => {
  test("homepage, pricing, and login are reachable", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Lexport/i);
    await expect(page.locator("body")).toContainText(/contracts/i);

    await page.goto("/pricing");
    await expect(page.locator("body")).toContainText("$19.99");
    await expect(page.locator("body")).toContainText("$39.99");

    await page.goto("/login");
    await expect(page.getByPlaceholder("Email address")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
  });

  test("production dependencies report healthy", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBe(true);

    const health = await response.json();
    expect(health.status).toBe("healthy");
    expect(health.checks?.database?.status).toBe("healthy");
    expect(health.checks?.environment?.status).toBe("healthy");
    expect(health.checks?.stripe?.status).toBe("healthy");
  });

  test("generation reconciler fails closed without its secret", async ({
    request,
  }) => {
    const response = await request.post("/api/contracts/generate/reconcile", {
      data: {},
    });
    expect(response.status()).toBe(401);
  });
});
