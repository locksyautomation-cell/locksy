/**
 * Global setup: authenticates as each role once and persists the browser
 * storage state so individual test files can start already logged in.
 */
import { test as setup, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import fs from "fs";

const ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL    ?? "admin@locksy.test";
const ADMIN_PASS     = process.env.TEST_ADMIN_PASSWORD ?? "Admin1234!";
const DEALER_EMAIL   = process.env.TEST_DEALER_EMAIL   ?? "dealer@locksy.test";
const DEALER_PASS    = process.env.TEST_DEALER_PASSWORD ?? "Dealer1234!";
const CLIENT_EMAIL   = process.env.TEST_CLIENT_EMAIL   ?? "client@locksy.test";
const CLIENT_PASS    = process.env.TEST_CLIENT_PASSWORD ?? "Client1234!";

// Ensure the output directory exists
fs.mkdirSync("tests/auth-state", { recursive: true });

setup("authenticate as admin", async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASS);
  await expect(page).toHaveURL(/\/admin/);
  await page.context().storageState({ path: "tests/auth-state/admin.json" });
});

setup("authenticate as dealer", async ({ page }) => {
  await loginAs(page, DEALER_EMAIL, DEALER_PASS);
  await expect(page).toHaveURL(/\/dealer/);
  await page.context().storageState({ path: "tests/auth-state/dealer.json" });
});

setup("authenticate as client", async ({ page }) => {
  await loginAs(page, CLIENT_EMAIL, CLIENT_PASS);
  await expect(page).toHaveURL(/\/client/);
  await page.context().storageState({ path: "tests/auth-state/client.json" });
});
