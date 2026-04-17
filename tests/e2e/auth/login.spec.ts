import { test, expect } from "@playwright/test";
import { getVerificationCode } from "../../helpers/supabase";

const VALID_EMAIL    = process.env.TEST_CLIENT_EMAIL    ?? "client@locksy.test";
const VALID_PASSWORD = process.env.TEST_CLIENT_PASSWORD ?? "Client1234!";

test.describe("Login flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  // ── Happy path ──────────────────────────────────────────────────────────────
  test("happy path: login with valid credentials and verification code", async ({ page }) => {
    await page.getByLabel(/correo electrónico/i).fill(VALID_EMAIL);
    await page.getByLabel(/contraseña/i).fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Login" }).click();

    await page.waitForURL("**/verify**", { timeout: 15_000 });

    // The verify page has 6 individual character inputs
    await page.locator('input[maxlength="1"]').first().waitFor({ state: "visible", timeout: 8_000 });
    const code = await getVerificationCode(VALID_EMAIL);
    await page.locator('input[maxlength="1"]').first().click();
    await page.keyboard.type(code);
    await page.getByRole("button", { name: "Verificar" }).click();

    await page.waitForURL(/\/(client|dealer|admin)\//, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("happy path: shows the verification code screen after correct credentials", async ({ page }) => {
    await page.getByLabel(/correo electrónico/i).fill(VALID_EMAIL);
    await page.getByLabel(/contraseña/i).fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Login" }).click();

    await page.waitForURL("**/verify**", { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /verificación/i })).toBeVisible();
    await expect(page.locator('input[maxlength="1"]').first()).toBeVisible();
  });

  // ── Error cases ─────────────────────────────────────────────────────────────
  test("error: wrong password shows error message", async ({ page }) => {
    await page.getByLabel(/correo electrónico/i).fill(VALID_EMAIL);
    await page.getByLabel(/contraseña/i).fill("WrongPassword999!");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByText(/credenciales|contraseña|inválido/i)).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("error: non-existent email shows error message", async ({ page }) => {
    await page.getByLabel(/correo electrónico/i).fill("noexiste@example.com");
    await page.getByLabel(/contraseña/i).fill("SomePassword1!");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByText(/credenciales|usuario|inválido/i)).toBeVisible({ timeout: 8_000 });
  });

  test("error: wrong verification code shows error", async ({ page }) => {
    await page.getByLabel(/correo electrónico/i).fill(VALID_EMAIL);
    await page.getByLabel(/contraseña/i).fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Login" }).click();

    await page.waitForURL("**/verify**", { timeout: 15_000 });
    await page.locator('input[maxlength="1"]').first().click();
    await page.keyboard.type("XXXXXX");
    await page.getByRole("button", { name: "Verificar" }).click();

    await expect(page.getByText(/código|inválido|incorrecto/i)).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/\/verify/);
  });

  test("error: empty fields prevent form submission", async ({ page }) => {
    await page.getByRole("button", { name: "Login" }).click();
    // Browser native validation keeps the page on /login
    await expect(page).toHaveURL(/\/login/);
  });

  test("UI: verify page shows resend code countdown text", async ({ page }) => {
    await page.getByLabel(/correo electrónico/i).fill(VALID_EMAIL);
    await page.getByLabel(/contraseña/i).fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Login" }).click();

    await page.waitForURL("**/verify**", { timeout: 15_000 });
    // Shows countdown text initially (button only appears after timer expires)
    await expect(page.getByText(/reenviar código/i)).toBeVisible({ timeout: 8_000 });
  });

  // ── Redirects ────────────────────────────────────────────────────────────────
  test("redirect: unauthenticated access to /client/appointments goes to login", async ({ page }) => {
    await page.goto("/client/appointments");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirect: unauthenticated access to /admin goes to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirect: unauthenticated access to /dealer/citas goes to login", async ({ page }) => {
    await page.goto("/dealer/citas");
    await expect(page).toHaveURL(/\/login/);
  });
});
