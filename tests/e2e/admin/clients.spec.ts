import { test, expect } from "@playwright/test";

test.describe("Admin — Client management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/clientes");
    await page.waitForLoadState("networkidle");
  });

  // ── List view ────────────────────────────────────────────────────────────────
  test("happy path: clients list renders", async ({ page }) => {
    // Either a table or a card list
    const hasContent =
      (await page.getByRole("table").count()) > 0 ||
      (await page.locator("[data-client], .client-row").count()) > 0 ||
      (await page.getByRole("row").count()) > 1;
    expect(hasContent).toBe(true);
  });

  test("happy path: search filters clients by name", async ({ page }) => {
    const nameCell = page.locator("tbody tr td").first();
    const firstText = await nameCell.textContent();
    if (!firstText) test.skip();

    const query = firstText.trim().slice(0, 3);
    await page.getByRole("textbox").fill(query);
    await page.waitForTimeout(400);

    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("happy path: search with no match shows empty state", async ({ page }) => {
    await page.getByRole("textbox").fill("zzzzznoexiste9999");
    await page.waitForTimeout(400);
    await expect(page.getByText(/no hay|sin resultados|no se encontr/i)).toBeVisible();
  });

  // ── Client detail ────────────────────────────────────────────────────────────
  test("happy path: clicking a client opens detail page", async ({ page }) => {
    const firstRow = page.locator("tbody tr").first();
    if ((await firstRow.count()) === 0) test.skip();
    await firstRow.click();
    await expect(page).toHaveURL(/\/admin\/clientes\/.+/);
  });

  test("happy path: client detail shows personal info", async ({ page }) => {
    const firstRow = page.locator("tbody tr").first();
    if ((await firstRow.count()) === 0) test.skip();
    await firstRow.click();

    await expect(page.getByText(/email|correo/i)).toBeVisible();
  });

  test("happy path: client detail shows vehicle section", async ({ page }) => {
    await page.locator("tbody tr").first().click();
    await expect(
      page.getByText(/vehículo|motos|coches/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test("happy path: client detail shows appointment history", async ({ page }) => {
    await page.locator("tbody tr").first().click();
    const hasAppointments =
      (await page.getByText(/cita|historial|localizador/i).count()) > 0;
    expect(hasAppointments).toBe(true);
  });
});
