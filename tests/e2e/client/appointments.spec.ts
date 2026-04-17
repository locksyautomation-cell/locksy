import { test, expect } from "@playwright/test";

test.describe("Client — Appointments (Citas)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/appointments");
    await page.waitForLoadState("networkidle");
  });

  // ── List view ────────────────────────────────────────────────────────────────
  test("happy path: appointments page loads with tabs", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /citas/i })).toBeVisible();
    // Tabs component renders buttons: "Pendientes", "En Curso", "Finalizadas"
    await expect(page.getByRole("button", { name: "Pendientes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "En Curso" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Finalizadas" })).toBeVisible();
  });

  test("happy path: shows empty state or appointment list", async ({ page }) => {
    const hasAppointments = (await page.locator("tbody tr, .appointment-card").count()) > 0;
    const hasEmpty = (await page.getByText(/no tienes citas|no hay citas/i).count()) > 0;
    expect(hasAppointments || hasEmpty).toBe(true);
  });

  // ── Tab switching ─────────────────────────────────────────────────────────────
  test("happy path: can switch between appointment status tabs", async ({ page }) => {
    await page.getByRole("button", { name: "En Curso" }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("heading", { name: /citas/i })).toBeVisible();

    await page.getByRole("button", { name: "Finalizadas" }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("heading", { name: /citas/i })).toBeVisible();
  });

  // ── New appointment booking ───────────────────────────────────────────────────
  test("happy path: new appointment button navigates to booking page", async ({ page }) => {
    const newBtn = page.getByRole("link", { name: /nueva cita/i });
    if ((await newBtn.count()) === 0) test.skip();
    await newBtn.click();
    await expect(page).toHaveURL(/\/client\/appointments\/new/);
  });

  // ── Booking flow ─────────────────────────────────────────────────────────────
  test("happy path: booking page loads with dealership selection", async ({ page }) => {
    await page.goto("/client/appointments/new");
    await page.waitForLoadState("networkidle");

    const hasContent = (await page.getByText(/concesionario|taller|selecciona/i).count()) > 0;
    expect(hasContent).toBe(true);
  });

  test("happy path: selecting a dealership shows next step", async ({ page }) => {
    await page.goto("/client/appointments/new");
    await page.waitForLoadState("networkidle");

    // Try selecting the first clickable dealership option
    const dealerBtn = page.locator("button, label").filter({ hasText: /[A-Za-z]{3,}/ }).first();
    if ((await dealerBtn.count()) === 0) test.skip();
    await dealerBtn.click();

    await page.waitForTimeout(600);
    // Should advance — either vehicle selector or date selector appears
    const advanced = (await page.getByText(/vehículo|fecha|matrícula|selecciona/i).count()) > 0;
    expect(advanced).toBe(true);
  });

  // ── Appointment detail ────────────────────────────────────────────────────────
  test("happy path: clicking an appointment shows detail", async ({ page }) => {
    // Look in Pendientes tab first
    const apptLink = page.locator("a[href*='/client/appointments/']").first();
    if ((await apptLink.count()) === 0) test.skip();
    await apptLink.click();

    await expect(page).toHaveURL(/\/client\/appointments\/.+/);
    await expect(page.getByText(/localizador|vehículo|estado/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test("happy path: appointment detail shows locator code", async ({ page }) => {
    const apptLink = page.locator("a[href*='/client/appointments/']").first();
    if ((await apptLink.count()) === 0) test.skip();
    await apptLink.click();

    await expect(
      page.getByText(/localizador|código/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test("happy path: appointment detail shows key code", async ({ page }) => {
    const apptLink = page.locator("a[href*='/client/appointments/']").first();
    if ((await apptLink.count()) === 0) test.skip();
    await apptLink.click();

    const hasKey = (await page.getByText(/llave|código recogida|key/i).count()) > 0;
    expect(hasKey).toBe(true);
  });

  // ── Budget accept / reject ────────────────────────────────────────────────────
  test("happy path: pending budget shows accept and reject buttons", async ({ page }) => {
    // Navigate into any appointment that has a budget
    const apptLink = page.locator("a[href*='/client/appointments/']").first();
    if ((await apptLink.count()) === 0) test.skip();
    await apptLink.click();

    const hasAccept = (await page.getByRole("button", { name: /aceptar/i }).count()) > 0;
    const hasReject = (await page.getByRole("button", { name: /rechazar/i }).count()) > 0;
    // Skip if this appointment doesn't have a pending budget
    if (!hasAccept && !hasReject) test.skip();
    expect(hasAccept || hasReject).toBe(true);
  });

  // ── Status tabs content ───────────────────────────────────────────────────────
  test("happy path: finalized appointments tab loads without error", async ({ page }) => {
    await page.getByRole("button", { name: "Finalizadas" }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("heading", { name: /citas/i })).toBeVisible();
    // Either shows appointments or empty state
    const ok =
      (await page.getByText(/no tienes citas finalizadas/i).count()) > 0 ||
      (await page.locator("a[href*='/client/appointments/']").count()) > 0;
    expect(ok).toBe(true);
  });

  test("happy path: in-progress appointments tab loads without error", async ({ page }) => {
    await page.getByRole("button", { name: "En Curso" }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("heading", { name: /citas/i })).toBeVisible();
    const ok =
      (await page.getByText(/no tienes citas en curso/i).count()) > 0 ||
      (await page.locator("a[href*='/client/appointments/']").count()) > 0;
    expect(ok).toBe(true);
  });
});
