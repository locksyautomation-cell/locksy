import { generateRepairInvoicePDF } from "./generate-repair-invoice-pdf";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function generateRepairInvoiceForAppointment(
  appointmentId: string,
  adminClient: AdminClient
): Promise<{ url: string } | { error: string }> {

  const { data: aptRaw } = await adminClient
    .from("appointments")
    .select(`
      id, locator, scheduled_date,
      dealer_observations, dealer_recommendations, budget_amount,
      dealership_id,
      client_id, vehicle_id,
      manual_first_name, manual_last_name, manual_nif_cif,
      manual_email, manual_address,
      manual_vehicle_brand, manual_vehicle_model, manual_vehicle_plate,
      client:users ( first_name, last_name, email, dni, address ),
      vehicle:vehicles ( brand, model, plate )
    `)
    .eq("id", appointmentId)
    .single();

  if (!aptRaw) return { error: "Cita no encontrada" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apt = aptRaw as any;

  if (!apt.budget_amount || apt.budget_amount <= 0) {
    return { error: "Sin importe definido para generar factura" };
  }

  const { data: dealerRaw } = await adminClient
    .from("dealerships")
    .select("id, name, nif_cif, address, email, billing_name, billing_nif_cif, billing_address, billing_email, logo_url")
    .eq("id", apt.dealership_id)
    .single();

  if (!dealerRaw) return { error: "Concesionario no encontrado" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealer = dealerRaw as any;

  // Prefer billing fields, fall back to general fields
  const dealerName = dealer.billing_name || dealer.name;
  const dealerNif = dealer.billing_nif_cif || dealer.nif_cif || null;
  const dealerAddress = dealer.billing_address || dealer.address || null;
  const dealerEmail = dealer.billing_email || dealer.email || null;

  // Download logo
  let dealerLogoBuffer: Buffer | null = null;
  if (dealer.logo_url) {
    try {
      const res = await fetch(dealer.logo_url);
      if (res.ok) dealerLogoBuffer = Buffer.from(await res.arrayBuffer());
    } catch { /* logo unavailable */ }
  }

  // Client data
  const clientName = apt.client_id && apt.client
    ? `${apt.client.first_name || ""} ${apt.client.last_name || ""}`.trim()
    : `${apt.manual_first_name || ""} ${apt.manual_last_name || ""}`.trim() || "—";
  const clientNif = (apt.client_id && apt.client ? apt.client.dni : apt.manual_nif_cif) || null;
  const clientAddress = (apt.client_id && apt.client ? apt.client.address : apt.manual_address) || null;
  const clientEmail = (apt.client_id && apt.client ? apt.client.email : apt.manual_email) || null;

  // Vehicle
  const vehicleBrand = (apt.vehicle_id && apt.vehicle ? apt.vehicle.brand : apt.manual_vehicle_brand) || "";
  const vehicleModel = (apt.vehicle_id && apt.vehicle ? apt.vehicle.model : apt.manual_vehicle_model) || "";
  const vehiclePlate = (apt.vehicle_id && apt.vehicle ? apt.vehicle.plate : apt.manual_vehicle_plate) || "—";

  const invoiceNumber = `FAC-${apt.locator}`;
  const invoiceDate = apt.scheduled_date
    ? new Date(apt.scheduled_date + "T00:00:00")
    : new Date();

  const pdfBuffer = await generateRepairInvoicePDF({
    dealerName,
    dealerNif,
    dealerAddress,
    dealerEmail,
    dealerLogoBuffer,
    clientName,
    clientNif,
    clientAddress,
    clientEmail,
    vehicleBrand,
    vehicleModel,
    vehiclePlate,
    invoiceNumber,
    date: invoiceDate,
    observations: apt.dealer_observations || null,
    recommendations: apt.dealer_recommendations || null,
    totalAmount: apt.budget_amount,
  });

  const fileName = `${dealer.id}/${apt.locator}-factura.pdf`;
  const { error: uploadError } = await adminClient.storage
    .from("repair-orders")
    .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) return { error: `Error al subir factura: ${uploadError.message}` };

  const { data: urlData } = adminClient.storage.from("repair-orders").getPublicUrl(fileName);
  const fileUrl = urlData?.publicUrl ? `${urlData.publicUrl}?t=${Date.now()}` : null;
  if (!fileUrl) return { error: "No se pudo obtener la URL de la factura." };

  await adminClient
    .from("appointments")
    .update({ invoice_url: fileUrl })
    .eq("id", appointmentId);

  return { url: fileUrl };
}
