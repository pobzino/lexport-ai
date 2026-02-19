import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("register page loads and shows form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByPlaceholder("Full name")).toBeVisible();
    await expect(page.getByPlaceholder("Email address")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("login page loads and shows form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByPlaceholder("Email address")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("register shows validation errors for empty form", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: "Create account" }).click();
    // Should show validation errors (form touched)
    await expect(page.locator("text=Name is required").or(page.locator("text=required"))).toBeVisible({ timeout: 3000 });
  });

  test("login redirects unauthenticated user from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
