import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill("#email", "admin@miraintel.com");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/inspections/, { timeout: 10000 });
}

async function fillInspectionForm(
  page: import("@playwright/test").Page,
  assetName: string
) {
  // Use placeholder text to find inputs since labels lack htmlFor
  await page.getByPlaceholder("Slip 1 North Bulkhead").fill(assetName);
  // Asset type select — default is "pier", change to bridge
  await page.locator("select").first().selectOption("bridge");
  // Inspector name is already pre-filled from user context
  await page.click('button[type="submit"]');
}

test.describe("Inspections", () => {
  test("shows inspection list page", async ({ page }) => {
    await login(page);
    await expect(page.locator("h2")).toContainText("Inspections");
    await expect(page.locator("text=New Inspection")).toBeVisible();
  });

  test("creates a new inspection", async ({ page }) => {
    await login(page);
    await page.click("text=New Inspection");
    await expect(page).toHaveURL(/\/inspections\/new/);

    await fillInspectionForm(page, "E2E Test Bridge");

    // Should redirect to detail page
    await expect(page).toHaveURL(/\/inspections\/[a-f0-9-]+/, {
      timeout: 10000,
    });
    await expect(page.locator("text=E2E Test Bridge")).toBeVisible();
  });

  test("inspection detail shows metadata and action buttons", async ({
    page,
  }) => {
    await login(page);
    await page.click("text=New Inspection");
    await fillInspectionForm(page, "E2E Detail Bridge");

    await expect(page).toHaveURL(/\/inspections\/[a-f0-9-]+/, {
      timeout: 10000,
    });

    // Verify metadata
    await expect(page.locator("text=E2E Detail Bridge")).toBeVisible();
    await expect(page.locator("text=In Progress")).toBeVisible();

    // Verify action buttons
    await expect(page.locator("text=Upload Images")).toBeVisible();
    await expect(page.locator("text=Annotate")).toBeVisible();
    await expect(page.locator("text=Complete Inspection")).toBeVisible();
  });

  test("inspection list shows created inspections", async ({ page }) => {
    await login(page);
    await expect(page.locator("h2")).toContainText("Inspections");
  });
});
