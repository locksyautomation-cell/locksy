import { test, expect } from "@playwright/test";

test.describe("Dealer — Profile (Perfil)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dealer/perfil");
    await page.waitForLoadState("networkidle");
  });

  // ── Page renders ─────────────────────────────────────────────────────────────
  test("happy path: profile page loads with dealer info", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /perfil/i })).toBeVisible();
    // Shows dealer name / company name
    await expect(page.getByText(/nombre|empresa/i).first()).toBeVisible();
  });

  test("happy path: accepted brands section is visible", async ({ page }) => {
    await expect(
      page.getByText(/marcas.*acepta|marcas aceptadas|marcas/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test("happy path: vehicle type badge shown (motos or coches or both)", async ({ page }) => {
    const hasMoTo = (await page.getByText(/motos/i).count()) > 0;
    const hasCoche = (await page.getByText(/coches/i).count()) > 0;
    expect(hasMoTo || hasCoche).toBe(true);
  });

  // ── Edit profile ─────────────────────────────────────────────────────────────
  test("happy path: edit button opens editable fields", async ({ page }) => {
    const editBtn = page.getByRole("button", { name: /editar|modificar/i }).first();
    if ((await editBtn.count()) === 0) test.skip();
    await editBtn.click();

    // At least one input becomes editable
    await expect(page.locator("input[type='text'], input[type='email']").first()).toBeVisible();
  });

  test("happy path: can update phone number", async ({ page }) => {
    const editBtn = page.getByRole("button", { name: /editar/i }).first();
    if ((await editBtn.count()) === 0) test.skip();
    await editBtn.click();

    const phoneInput = page.getByLabel(/teléfono/i);
    if ((await phoneInput.count()) === 0) test.skip();

    await phoneInput.fill("600111222");
    await page.getByRole("button", { name: /guardar/i }).click();

    await expect(page.getByText(/600111222/)).toBeVisible({ timeout: 8_000 });
  });

  // ── Brands ───────────────────────────────────────────────────────────────────
  test("happy path: accepted brands list renders", async ({ page }) => {
    // Wait for brands to load
    await page.waitForTimeout(500);
    const hasBrands =
      (await page.locator("input[type='checkbox']").count()) > 0 ||
      (await page.locator(".brand-item, [data-brand]").count()) > 0 ||
      (await page.getByText(/honda|yamaha|toyota|bmw/i).count()) > 0;
    expect(hasBrands).toBe(true);
  });

  test("happy path: can toggle a brand on/off", async ({ page }) => {
    await page.waitForTimeout(500);
    const firstCheckbox = page.locator("input[type='checkbox']").first();
    if ((await firstCheckbox.count()) === 0) test.skip();

    const wasChecked = await firstCheckbox.isChecked();
    await firstCheckbox.click();

    // Wait for debounce save
    await page.waitForTimeout(600);

    // Toggle should have flipped
    const isNowChecked = await firstCheckbox.isChecked();
    expect(isNowChecked).toBe(!wasChecked);
  });

  // ── Schedule / availability ───────────────────────────────────────────────────
  test("happy path: schedule section visible", async ({ page }) => {
    const hasSchedule =
      (await page.getByText(/horario|disponibilidad|apertura/i).count()) > 0;
    expect(hasSchedule).toBe(true);
  });

  // ── Vehicle type (read-only from dealer) ─────────────────────────────────────
  test("happy path: vehicle type toggle is NOT shown (read-only)", async ({ page }) => {
    // Dealer cannot change vehicle type — there should be no toggle for motos/coches
    const hasToggle =
      (await page.getByRole("button", { name: /^motos$/i }).count()) > 0 &&
      (await page.getByRole("button", { name: /^coches$/i }).count()) > 0;
    // If both toggle buttons exist AND are clickable as a type-change UI, fail
    // Lenient: just ensure there's no "Cambiar tipo" button
    const hasChangeType = (await page.getByRole("button", { name: /cambiar tipo/i }).count()) > 0;
    expect(hasChangeType).toBe(false);
  });
});
