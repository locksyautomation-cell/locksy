import { test, expect } from "@playwright/test";

test("smoke: homepage loads correctly", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page).not.toHaveURL(/error|404|500/);
  await expect(page.locator("body")).toBeVisible();
});
