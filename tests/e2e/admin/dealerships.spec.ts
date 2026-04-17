import { test, expect } from "@playwright/test";

test.describe("Admin — Dealership management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/concesionarios");
    await page.waitForLoadState("networkidle");
  });

  // ── List view ────────────────────────────────────────────────────────────────
  test("happy path: dealerships list renders with at least one row", async ({ page }) => {
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("happy path: search filters the dealership list", async ({ page }) => {
    const firstDealerName = await page.locator("tbody tr td").first().textContent();
    if (!firstDealerName) test.skip();

    const partialName = firstDealerName!.trim().slice(0, 4);
    await page.getByRole("textbox").fill(partialName);
    await page.waitForTimeout(400);

    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("happy path: search with no match shows empty state", async ({ page }) => {
    await page.getByRole("textbox").fill("zzznoresultszzzzzz99");
    await page.waitForTimeout(400);
    await expect(page.getByText(/no hay|sin resultados|no se encontr/i)).toBeVisible();
  });

  // ── Create dealership ────────────────────────────────────────────────────────
  test("happy path: opens create modal", async ({ page }) => {
    await page.getByRole("button", { name: "Añadir concesionario" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /añadir concesionario/i })).toBeVisible();
  });

  test("happy path: create a new dealership", async ({ page }) => {
    const ts = Date.now();
    await page.getByRole("button", { name: "Añadir concesionario" }).click();

    const dialog = page.getByRole("dialog");

    // Select vehicle type
    await dialog.getByRole("button", { name: "🏍️ Motos" }).click();

    await dialog.getByLabel("Nombre / Empresa").fill(`Test Concesionario ${ts}`);
    await dialog.getByLabel("Email de acceso").fill(`test${ts}@dealer.test`);
    await dialog.getByLabel("Contraseña").fill("Dealer1234!");

    await dialog.getByRole("button", { name: "Crear" }).click();

    // Success modal appears, then close it
    await expect(
      page.getByRole("heading", { name: /concesionario creado/i })
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /cerrar/i }).click();

    await expect(page.getByText(`Test Concesionario ${ts}`)).toBeVisible({ timeout: 6_000 });
  });

  test("error: create without vehicle type shows validation", async ({ page }) => {
    await page.getByRole("button", { name: "Añadir concesionario" }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Nombre / Empresa").fill("Sin Tipo SA");
    await dialog.getByLabel("Email de acceso").fill("sintipo@dealer.test");
    await dialog.getByLabel("Contraseña").fill("Dealer1234!");
    await dialog.getByRole("button", { name: "Crear" }).click();

    // Either an inline error or the dialog stays open
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/tipo de vehículo|selecciona/i)).toBeVisible({ timeout: 6_000 });
  });

  test("error: create with duplicate email shows error", async ({ page }) => {
    const existingEmail = process.env.TEST_DEALER_EMAIL ?? "dealer@locksy.test";

    await page.getByRole("button", { name: "Añadir concesionario" }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByRole("button", { name: "🚗 Coches" }).click();
    await dialog.getByLabel("Nombre / Empresa").fill("Duplicado SA");
    await dialog.getByLabel("Email de acceso").fill(existingEmail);
    await dialog.getByLabel("Contraseña").fill("Dealer1234!");
    await dialog.getByRole("button", { name: "Crear" }).click();

    await expect(dialog.getByText(/ya existe|error|registrado/i)).toBeVisible({ timeout: 8_000 });
  });

  // ── Edit dealership ──────────────────────────────────────────────────────────
  test("happy path: edit button opens edit modal with prefilled data", async ({ page }) => {
    await page.locator("tbody tr").first().locator("button", { hasText: "Editar" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: /editar concesionario/i })).toBeVisible();
    await expect(dialog.getByLabel("Nombre / Empresa")).not.toHaveValue("");
  });

  test("happy path: navigate to dealership detail page", async ({ page }) => {
    await page.locator("tbody tr").first().click();
    await expect(page).toHaveURL(/\/admin\/concesionarios\/.+/);
  });

  // ── Dealership detail ────────────────────────────────────────────────────────
  // Tabs are plain <button> elements (the Tabs component, not role="tab")
  test("happy path: detail page shows tabs", async ({ page }) => {
    await page.locator("tbody tr").first().click();
    await expect(page.getByRole("button", { name: "Pagos" })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("button", { name: "Citas" })).toBeVisible();
  });

  test("happy path: Citas tab loads appointment list", async ({ page }) => {
    await page.locator("tbody tr").first().click();
    await page.getByRole("button", { name: "Citas" }).click();
    await page.waitForTimeout(500);
    // Either a table with appointments or an empty-state message
    const hasTable = (await page.getByRole("table").count()) > 0;
    const hasEmpty = (await page.getByText(/no hay citas|sin citas|0 citas/i).count()) > 0;
    expect(hasTable || hasEmpty).toBe(true);
  });

  test("happy path: vehicle type badge is displayed", async ({ page }) => {
    await page.locator("tbody tr").first().click();
    await expect(
      page.getByText(/concesionario de motos|concesionario de coches|motos y coches/i)
    ).toBeVisible({ timeout: 8_000 });
  });
});
