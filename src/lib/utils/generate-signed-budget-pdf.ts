import { generateBudgetPDF } from "./generate-budget-pdf";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function regenerateBudgetPdfWithSignature(
  appointmentId: string,
  signedAt: string,
  signedIp: string,
  adminClient: AdminClient
): Promise<void> {
  const { data: aptRaw } = await adminClient
    .from("appointments")
    .select(`
      id, locator, scheduled_date, description, budget_lines,
      dealership_id,
      client_id, vehicle_id,
      manual_first_name, manual_last_name, manual_nif_cif, manual_phone,
      manual_vehicle_brand, manual_vehicle_model, manual_vehicle_plate, manual_vehicle_chassis,
      client:users ( first_name, last_name, phone, dni ),
      vehicle:vehicles ( brand, model, plate, chassis_number )
    `)
    .eq("id", appointmentId)
    .single();

  if (!aptRaw) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apt = aptRaw as any;

  const { data: dealerRaw } = await adminClient
    .from("dealerships")
    .select("id, name, nif_cif, address, logo_url")
    .eq("id", apt.dealership_id)
    .single();

  if (!dealerRaw) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealer = dealerRaw as any;

  let logoBuffer: Buffer | null = null;
  if (dealer.logo_url) {
    try {
      const res = await fetch(dealer.logo_url);
      if (res.ok) logoBuffer = Buffer.from(await res.arrayBuffer());
    } catch { /* skip */ }
  }

  const clientName = apt.client_id && apt.client
    ? `${apt.client.first_name || ""} ${apt.client.last_name || ""}`.trim()
    : `${apt.manual_first_name || ""} ${apt.manual_last_name || ""}`.trim();
  const clientNif = (apt.client_id && apt.client ? apt.client.dni : apt.manual_nif_cif) || null;
  const clientPhone = (apt.client_id && apt.client ? apt.client.phone : apt.manual_phone) || null;

  const vehicle = (apt.vehicle_id && apt.vehicle) ? apt.vehicle : {
    brand: apt.manual_vehicle_brand || "",
    model: apt.manual_vehicle_model || "",
    plate: apt.manual_vehicle_plate || "",
    chassis_number: apt.manual_vehicle_chassis || null,
  };

  const scheduledDate = apt.scheduled_date
    ? new Date(apt.scheduled_date + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  const lines = apt.budget_lines || [];
  if (!lines.length) return;

  const pdfBuffer = await generateBudgetPDF({
    dealershipName: dealer.name,
    dealershipNif: dealer.nif_cif || null,
    dealershipAddress: dealer.address || null,
    dealershipLogoBuffer: logoBuffer,
    locator: apt.locator,
    scheduledDate,
    clientName,
    clientNif,
    clientPhone,
    vehicleBrand: vehicle.brand || "",
    vehicleModel: vehicle.model || "",
    vehiclePlate: vehicle.plate || "",
    vehicleChassis: vehicle.chassis_number || null,
    description: apt.description || null,
    lines,
    ivaPercent: 21,
    validityDays: 30,
    signedAt,
    signedIp,
  });

  const fileName = `${appointmentId}/budget-signed.pdf`;
  const { error: uploadError } = await adminClient.storage
    .from("budgets")
    .upload(fileName, pdfBuffer, { upsert: true, contentType: "application/pdf" });

  if (uploadError) return;

  const { data: { publicUrl } } = adminClient.storage.from("budgets").getPublicUrl(fileName);
  await adminClient
    .from("appointments")
    .update({ budget_url: publicUrl })
    .eq("id", appointmentId);
}
