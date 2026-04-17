import { test, expect } from "@playwright/test";
import { getDealershipSlug } from "../../helpers/supabase";

test.describe("Client registration flow", () => {
  test("happy path: valid slug shows the registration form", async ({ page }) => {
    const slug = await getDealershipSlug();
    await page.goto(`/register/${slug}`);

    // Page heading is "SIGN IN"
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByLabel(/correo electrónico/i)).toBeVisible();
    await expect(page.getByLabel(/^contraseña/i).first()).toBeVisible();
  });

  test("happy path: complete registration navigates to verify or complete-profile", async ({ page }) => {
    const slug = await getDealershipSlug();
    const uniqueEmail = `test+${Date.now()}@example.com`;

    await page.goto(`/register/${slug}`);
    await page.getByLabel(/correo electrónico/i).fill(uniqueEmail);

    const passwordFields = await page.getByLabel(/contraseña/i).all();
    await passwordFields[0].fill("Test1234!");
    if (passwordFields.length > 1) await passwordFields[1].fill("Test1234!");

    // Must accept terms before submitting
    const termsCheckbox = page.getByLabel(/términos/i);
    if (await termsCheckbox.isVisible()) await termsCheckbox.check();

    await page.getByRole("button", { name: /siguiente/i }).click();

    // Should land on verify or complete-profile
    await page.waitForURL(/verify|complete-profile/, { timeout: 15_000 });
    const url = page.url();
    expect(url.includes("verify") || url.includes("complete-profile")).toBe(true);
  });

  test("error: invalid slug shows not-found or error state", async ({ page }) => {
    await page.goto("/register/slug-que-no-existe-99999");
    // Either a 404-like message or redirect
    const hasError =
      (await page.getByText(/no encontrado|no existe|inválido|enlace/i).count()) > 0 ||
      page.url().endsWith("/") ||
      page.url().includes("/login");
    expect(hasError).toBe(true);
  });

  test("error: weak password shows validation error", async ({ page }) => {
    const slug = await getDealershipSlug();
    await page.goto(`/register/${slug}`);

    await page.getByLabel(/correo electrónico/i).fill("test@example.com");
    const passwordFields = await page.getByLabel(/contraseña/i).all();
    await passwordFields[0].fill("1234");
    if (passwordFields.length > 1) await passwordFields[1].fill("1234");
    await page.getByRole("button", { name: /siguiente/i }).click();

    // Password requirement checklist is shown
    await expect(page.getByText(/8 caracteres|mayúscula|número|carácter especial/i).first()).toBeVisible({ timeout: 6_000 });
  });

  test("error: mismatched passwords shows validation error", async ({ page }) => {
    const slug = await getDealershipSlug();
    await page.goto(`/register/${slug}`);

    await page.getByLabel(/correo electrónico/i).fill("test@example.com");
    const passwordFields = await page.getByLabel(/contraseña/i).all();
    if (passwordFields.length < 2) test.skip();
    await passwordFields[0].fill("StrongPass1!");
    await passwordFields[1].fill("DifferentPass1!");
    await page.getByRole("button", { name: /siguiente/i }).click();

    await expect(page.getByText(/coinciden|iguales|contraseña/i)).toBeVisible({ timeout: 6_000 });
  });

  test("error: duplicate email shows error", async ({ page }) => {
    const slug = await getDealershipSlug();
    const existingEmail = process.env.TEST_CLIENT_EMAIL ?? "client@locksy.test";

    await page.goto(`/register/${slug}`);
    await page.getByLabel(/correo electrónico/i).fill(existingEmail);
    const passwordFields = await page.getByLabel(/contraseña/i).all();
    await passwordFields[0].fill("Test1234!");
    if (passwordFields.length > 1) await passwordFields[1].fill("Test1234!");

    const termsCheckbox = page.getByLabel(/términos/i);
    if (await termsCheckbox.isVisible()) await termsCheckbox.check();

    await page.getByRole("button", { name: /siguiente/i }).click();

    await expect(page.getByText(/ya existe|registrado|en uso|error/i)).toBeVisible({ timeout: 8_000 });
  });

  test("complete-profile: unauthenticated redirects to login", async ({ page }) => {
    await page.goto("/complete-profile");
    await expect(page).toHaveURL(/\/login|\/register/);
  });
});
