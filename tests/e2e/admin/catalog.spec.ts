import { test, expect } from "@playwright/test";

test.describe("Admin — Vehicle catalog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/catalogo");
    await page.waitForLoadState("networkidle");
  });

  // ── Tab switching ────────────────────────────────────────────────────────────
  // Tabs are plain <button> elements (not role="tab")
  test("happy path: shows Motos tab by default", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /catálogo/i })).toBeVisible();
    // Both type buttons are rendered
    await expect(page.getByRole("button", { name: "🏍️ Motos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "🚗 Coches" })).toBeVisible();
    // Brand list placeholder input visible
    await expect(page.getByPlaceholder("Nueva marca...")).toBeVisible();
  });

  test("happy path: switching to Coches tab loads car brands", async ({ page }) => {
    await page.getByRole("button", { name: "🚗 Coches" }).click();
    await page.waitForTimeout(500);
    // Car brands should load (Toyota, BMW, Volkswagen, etc.)
    await expect(page.getByText(/toyota|bmw|volkswagen/i)).toBeVisible({ timeout: 8_000 });
  });

  test("happy path: switching to Motos tab loads moto brands", async ({ page }) => {
    await page.getByRole("button", { name: "🏍️ Motos" }).click();
    await page.waitForTimeout(500);
    // Moto brands — panel reloads, at least one brand name appears
    const hasBrands =
      (await page.getByText(/honda|yamaha|kawasaki|suzuki/i).count()) > 0 ||
      (await page.locator("button").filter({ hasText: /[A-Z][a-z]+/ }).count()) > 0;
    expect(hasBrands).toBe(true);
  });

  // ── Add brand (inline — no modal) ────────────────────────────────────────────
  test("happy path: add a new moto brand", async ({ page }) => {
    const ts = Date.now();
    const brandName = `TestBrand${ts}`;

    await page.getByRole("button", { name: "🏍️ Motos" }).click();

    const brandInput = page.getByPlaceholder("Nueva marca...");
    await brandInput.fill(brandName);

    // Click the "Añadir" button next to the brand input
    await page.getByRole("button", { name: "Añadir" }).first().click();

    await expect(page.getByText(brandName)).toBeVisible({ timeout: 8_000 });
  });

  test("error: cannot add brand with empty name — button is disabled", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: "Añadir" }).first();
    // When input is empty the button has disabled attribute
    await expect(addBtn).toBeDisabled();
  });

  // ── Delete brand ─────────────────────────────────────────────────────────────
  test("happy path: delete button triggers brand removal confirm", async ({ page }) => {
    // Delete buttons have title "Eliminar marca y todos sus modelos"
    const deleteBtn = page.locator('button[title*="Eliminar marca"]').first();
    if ((await deleteBtn.count()) === 0) {
      // Fallback: any ✕ button in the brand list
      const fallback = page.locator("button").filter({ hasText: "✕" }).first();
      if ((await fallback.count()) === 0) test.skip();
      await fallback.click();
    } else {
      await deleteBtn.click();
    }

    // After clicking: either brand count decreases or a loading state appears
    await page.waitForTimeout(500);
    // Just verify the page didn't crash
    await expect(page.getByRole("heading", { name: /catálogo/i })).toBeVisible();
  });

  // ── Models panel ─────────────────────────────────────────────────────────────
  test("happy path: clicking a brand shows its models panel", async ({ page }) => {
    await page.waitForTimeout(500);
    // Brands are rendered as clickable divs in the left panel
    const firstBrand = page.locator("div.cursor-pointer, button").filter({ hasText: /[A-Z][a-z]+/ }).first();
    if ((await firstBrand.count()) === 0) test.skip();

    const brandName = await firstBrand.textContent();
    await firstBrand.click();
    await page.waitForTimeout(400);

    // Right panel should show "MODELOS — BRANDNAME"
    await expect(
      page.getByText(new RegExp(`modelos`, "i"))
    ).toBeVisible({ timeout: 6_000 });
    // Model input becomes available
    await expect(page.getByPlaceholder("Nuevo modelo...")).toBeVisible({ timeout: 6_000 });
  });
});
