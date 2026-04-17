import { test, expect } from "@playwright/test";

test.describe("Dealer — Appointments (Citas)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dealer/citas");
    await page.waitForLoadState("networkidle");
  });

  // ── Calendar renders ─────────────────────────────────────────────────────────
  test("happy path: calendar page loads with month view by default", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /citas/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Semana" })).toBeVisible();
  });

  test("happy path: switching to week view renders hourly grid", async ({ page }) => {
    await page.getByRole("button", { name: "Semana" }).click();
    // Hour labels like "08:00"
    await expect(page.getByText(/08:00|09:00/)).toBeVisible({ timeout: 6_000 });
  });

  test("happy path: navigate to next month", async ({ page }) => {
    // The navigation buttons are SVG icon-only buttons — use positional selector.
    // Layout: [← button] [month label + Mes/Semana toggles] [→ button]
    const navButtons = page.locator("button.rounded-lg.border.p-2");
    const currentLabel = await page.locator(".heading.text-navy").first().textContent();
    await navButtons.last().click(); // right arrow = next
    await page.waitForTimeout(200);
    const newLabel = await page.locator(".heading.text-navy").first().textContent();
    expect(newLabel).not.toBe(currentLabel);
  });

  // ── Add appointment modal ────────────────────────────────────────────────────
  test("happy path: opens add appointment modal", async ({ page }) => {
    await page.getByRole("button", { name: "Añadir Cita" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /añadir cita/i })).toBeVisible();
  });

  test("happy path: create a manual appointment without registered client", async ({ page }) => {
    await page.getByRole("button", { name: "Añadir Cita" }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Nombre / Empresa").fill("Cliente Manual Test");
    await dialog.getByLabel("Matrícula").fill("1234TST");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await dialog.getByLabel("Fecha").fill(tomorrow.toISOString().split("T")[0]);

    // Wait for time slots then pick first available
    const timeSelect = dialog.locator("select").last();
    await timeSelect.waitFor({ state: "visible" });
    await timeSelect.selectOption({ index: 1 });

    await dialog.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });
  });

  test("error: submit empty add-appointment form shows validation", async ({ page }) => {
    await page.getByRole("button", { name: "Añadir Cita" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Confirmar" }).click();
    // Form stays open — required fields not filled
    await expect(dialog).toBeVisible();
  });

  test("error: add appointment without date shows error", async ({ page }) => {
    await page.getByRole("button", { name: "Añadir Cita" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nombre / Empresa").fill("Sin Fecha SA");
    await dialog.getByRole("button", { name: "Confirmar" }).click();
    // Dialog stays visible — date is required
    await expect(dialog).toBeVisible();
  });

  // ── Appointment detail modal ─────────────────────────────────────────────────
  test("happy path: clicking an appointment chip opens detail modal", async ({ page }) => {
    // Chips have class "rounded border" among others
    const chip = page.locator("button.rounded.border").first();
    if ((await chip.count()) === 0) test.skip();
    await chip.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText(/cliente|vehículo|matrícula/i)).toBeVisible();
  });

  test("happy path: detail modal shows locator and key code", async ({ page }) => {
    const chip = page.locator("button.rounded.border").first();
    if ((await chip.count()) === 0) test.skip();
    await chip.click();
    await expect(page.getByText("Código de cita")).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText("Código recogida llaves")).toBeVisible();
  });

  test("happy path: detail modal has Edit button for non-final appointments", async ({ page }) => {
    const chip = page.locator("button.rounded.border").first();
    if ((await chip.count()) === 0) test.skip();
    await chip.click();
    const dialog = page.getByRole("dialog");
    const hasEdit = (await dialog.getByRole("button", { name: /editar/i }).count()) > 0;
    const isFinal = (await dialog.getByText(/reparación finalizada/i).count()) > 0;
    if (!isFinal) expect(hasEdit).toBe(true);
  });

  // ── Edit appointment modal ───────────────────────────────────────────────────
  test("happy path: edit modal prefills existing data", async ({ page }) => {
    const chip = page.locator("button.rounded.border").first();
    if ((await chip.count()) === 0) test.skip();
    await chip.click();

    const dialog = page.getByRole("dialog");
    const editBtn = dialog.getByRole("button", { name: /editar/i });
    if ((await editBtn.count()) === 0) test.skip();
    await editBtn.click();

    const editDialog = page.getByRole("dialog").last();
    await expect(editDialog.getByLabel("Fecha")).not.toHaveValue("");
  });

  // ── Availability / block ─────────────────────────────────────────────────────
  test("happy path: availability modal opens", async ({ page }) => {
    await page.getByRole("button", { name: /editar disponibilidad/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/bloquea franjas horarias|bloqueo|añadir bloqueo/i)).toBeVisible();
  });

  test("happy path: add a schedule block", async ({ page }) => {
    await page.getByRole("button", { name: /editar disponibilidad/i }).click();
    const dialog = page.getByRole("dialog");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = tomorrow.toISOString().split("T")[0];

    await dialog.getByLabel("Fecha").fill(dateStr);
    const selects = await dialog.locator("select").all();
    if (selects.length >= 2) {
      await selects[0].selectOption({ index: 2 }); // Hora inicio
      await selects[1].selectOption({ index: 4 }); // Hora fin
    }

    await dialog.getByRole("button", { name: "Bloquear franja" }).click();
    await expect(page.getByText(dateStr)).toBeVisible({ timeout: 8_000 });
  });

  test("error: block without time range shows validation", async ({ page }) => {
    await page.getByRole("button", { name: /editar disponibilidad/i }).click();
    const dialog = page.getByRole("dialog");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    await dialog.getByLabel("Fecha").fill(tomorrow.toISOString().split("T")[0]);
    // Don't select times — button should be disabled or ignore the click
    const blockBtn = dialog.getByRole("button", { name: "Bloquear franja" });
    await blockBtn.click();
    // Dialog stays open
    await expect(dialog).toBeVisible();
  });
});
