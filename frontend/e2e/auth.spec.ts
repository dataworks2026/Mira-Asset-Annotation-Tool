import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/inspections");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows login form", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.locator("text=Sign in to start annotating")
    ).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("does not navigate away with invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "wrong@example.com");
    await page.fill("#password", "wrongpassword");
    await page.click('button[type="submit"]');
    // The 401 response triggers the global interceptor which redirects
    // back to /login — user stays on the login page
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs in with valid credentials and redirects", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "admin@miraintel.com");
    await page.fill("#password", "admin123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/inspections/, { timeout: 10000 });
  });

  test("shows header after login", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "admin@miraintel.com");
    await page.fill("#password", "admin123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/inspections/, { timeout: 10000 });
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("text=Sign out")).toBeVisible();
  });

  test("sign out clears session and returns to login", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "admin@miraintel.com");
    await page.fill("#password", "admin123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/inspections/, { timeout: 10000 });

    await page.click("text=Sign out");
    await expect(page).toHaveURL(/\/login/);
  });
});
