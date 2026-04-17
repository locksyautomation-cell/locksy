/**
 * Shared auth helper: performs the full login flow (email + password + code)
 * and leaves the browser on the post-login page.
 */
import { Page } from "@playwright/test";
import { getVerificationCode } from "./supabase";

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/correo electrónico/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole("button", { name: "Login" }).click();

  // Wait for the verify page
  await page.waitForURL("**/verify**", { timeout: 10_000 });

  // Wait until the 6-box code inputs are rendered
  await page.locator('input[maxlength="1"]').first().waitFor({ state: "visible", timeout: 8_000 });

  // Fetch the code directly from the DB and type it character by character.
  // The verify page auto-focuses the next input on each keystroke.
  const code = await getVerificationCode(email);
  await page.locator('input[maxlength="1"]').first().click();
  await page.keyboard.type(code);

  await page.getByRole("button", { name: "Verificar" }).click();

  // Wait until we land somewhere in the dashboard
  await page.waitForURL(/\/(client|dealer|admin)\//, { timeout: 15_000 });
}
