import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill("#email", "admin@miraintel.com");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/inspections/, { timeout: 10000 });
}

async function createInspection(
  page: import("@playwright/test").Page,
  name: string
) {
  await page.click("text=New Inspection");
  await page.getByPlaceholder("Slip 1 North Bulkhead").fill(name);
  await page.locator("select").first().selectOption("bridge");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/inspections\/[a-f0-9-]+/, {
    timeout: 10000,
  });
}

test.describe("Inspection Completion", () => {
  test("shows completion modal when clicking Complete Inspection", async ({
    page,
  }) => {
    await login(page);
    await createInspection(page, "E2E Complete Test");

    await page.click("text=Complete Inspection");

    // Modal should appear with confirmation text
    await expect(
      page.locator("text=Are you sure you want to mark")
    ).toBeVisible();
    await expect(page.locator("text=Cancel")).toBeVisible();
  });

  test("cancel closes the modal without completing", async ({ page }) => {
    await login(page);
    await createInspection(page, "E2E Modal Dismiss Test");

    await page.click("text=Complete Inspection");
    await expect(
      page.locator("text=Are you sure you want to mark")
    ).toBeVisible();

    // Click the Cancel button inside the modal (not any other text containing "Cancel")
    await page.locator('button:has-text("Cancel")').click();

    // Modal should close, status should still be In Progress
    await expect(page.locator("text=In Progress")).toBeVisible();
  });
});
