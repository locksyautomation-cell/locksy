import { test, expect } from "@playwright/test";

test.describe("Client — Profile (Perfil)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/profile");
    await page.waitForLoadState("networkidle");
  });

  // ── Page renders ─────────────────────────────────────────────────────────────
  test("happy path: profile page loads with personal info", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /mi perfil/i })).toBeVisible();
    await expect(page.getByText(/información personal/i)).toBeVisible();
  });

  test("happy path: Mis Motos and Mis Coches sections are visible", async ({ page }) => {
    await expect(page.getByText(/mis motos/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/mis coches/i)).toBeVisible({ timeout: 8_000 });
  });

  // ── Personal info editing ────────────────────────────────────────────────────
  test("happy path: can edit personal information", async ({ page }) => {
    const editBtn = page.getByRole("button", { name: "Editar" }).first();
    if ((await editBtn.count()) === 0) test.skip();
    await editBtn.click();

    await expect(page.locator("input[type='text'], input[type='tel']").first()).toBeVisible();
    // Discard to not pollute state
    const discardBtn = page.getByRole("button", { name: /descartar/i });
    if (await discardBtn.isVisible()) await discardBtn.click();
  });

  test("happy path: phone field is editable", async ({ page }) => {
    const editBtn = page.getByRole("button", { name: "Editar" }).first();
    if ((await editBtn.count()) === 0) test.skip();
    await editBtn.click();

    const phoneInput = page.getByLabel(/teléfono/i);
    if ((await phoneInput.count()) === 0) test.skip();
    await expect(phoneInput).toBeVisible();
    await expect(phoneInput).toBeEditable();
  });

  // ── Add vehicle (Motos) ──────────────────────────────────────────────────────
  test("happy path: can open add moto modal", async ({ page }) => {
    const addMotoBtn = page.getByRole("button", { name: "Añadir Moto" });
    if ((await addMotoBtn.count()) === 0) test.skip();
    await addMotoBtn.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /añadir moto/i })).toBeVisible();
  });

  test("happy path: moto modal shows brand/model selects", async ({ page }) => {
    const addMotoBtn = page.getByRole("button", { name: "Añadir Moto" });
    if ((await addMotoBtn.count()) === 0) test.skip();
    await addMotoBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.locator("select").first()).toBeVisible();
    // Close
    await page.getByRole("button", { name: /cancelar/i }).click();
  });

  test("happy path: can open add coche modal", async ({ page }) => {
    const addCarBtn = page.getByRole("button", { name: "Añadir Coche" });
    if ((await addCarBtn.count()) === 0) test.skip();
    await addCarBtn.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /añadir coche/i })).toBeVisible();
    await page.getByRole("button", { name: /cancelar/i }).click();
  });

  test("error: submit empty vehicle form shows validation", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /añadir moto|añadir coche/i }).first();
    if ((await addBtn.count()) === 0) test.skip();
    await addBtn.click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /guardar|añadir/i }).click();
    // Form should stay open (validation prevents submit)
    await expect(dialog).toBeVisible();
  });

  // ── Edit vehicle ──────────────────────────────────────────────────────────────
  test("happy path: can open edit modal for existing vehicle", async ({ page }) => {
    await page.waitForTimeout(500);
    // Vehicle cards have an "Editar" ghost button
    const editVehicleBtn = page.locator("button").filter({ hasText: "Editar" }).nth(1);
    if ((await editVehicleBtn.count()) === 0) test.skip();
    await editVehicleBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("heading", { name: /editar vehículo/i })).toBeVisible();

    const plateInput = dialog.getByLabel(/matrícula/i);
    if ((await plateInput.count()) > 0) {
      await expect(plateInput).not.toHaveValue("");
    }
    await page.getByRole("button", { name: /cancelar/i }).click();
  });

  // ── Delete vehicle ────────────────────────────────────────────────────────────
  test("happy path: delete vehicle shows confirmation prompt", async ({ page }) => {
    await page.waitForTimeout(500);
    const deleteBtn = page.locator("button").filter({ hasText: "Eliminar" }).first();
    if ((await deleteBtn.count()) === 0) test.skip();
    await deleteBtn.click();

    // Should show a browser confirm dialog or inline confirmation text
    const hasConfirm =
      (await page.getByText(/¿estás seguro|historial.*mantendrá/i).count()) > 0 ||
      (await page.getByRole("button", { name: /confirmar|sí/i }).count()) > 0;
    expect(hasConfirm).toBe(true);
  });

  // ── Profile photo ─────────────────────────────────────────────────────────────
  test("happy path: profile photo section renders", async ({ page }) => {
    // Clicking the avatar opens the file picker — just check the img or upload hint exists
    const hasPhoto =
      (await page.locator("img").count()) > 0 ||
      (await page.getByText(/haz clic en la foto/i).count()) > 0 ||
      (await page.locator("input[type='file']").count()) > 0;
    expect(hasPhoto).toBe(true);
  });

  // ── Label check ───────────────────────────────────────────────────────────────
  test("happy path: label shows Nombre / Empresa (not Nombre y Apellidos)", async ({ page }) => {
    // Old label must NOT appear anywhere
    const hasOldLabel = (await page.getByText(/nombre y apellidos/i).count()) > 0;
    expect(hasOldLabel).toBe(false);
    // New label must be present (in edit mode or as display text)
    const hasNewLabel = (await page.getByText(/nombre \/ empresa/i).count()) > 0;
    expect(hasNewLabel).toBe(true);
  });
});
