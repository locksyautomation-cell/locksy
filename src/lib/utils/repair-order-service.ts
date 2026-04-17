import { generateRepairOrderPDF } from "./generate-repair-order-pdf";
import { sendRepairOrderEmail } from "./email";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function generateRepairOrderForAppointment(
  appointmentId: string,
  adminClient: AdminClient
): Promise<{ url: string; token: string } | { error: string }> {

  // Fetch appointment + related data
  const { data: aptRaw } = await adminClient
    .from("appointments")
    .select(`
      id, locator, key_code, scheduled_date, scheduled_time,
      description, dealer_observations, repair_acceptance_token,
      order_accepted_at, order_return_accepted_at, vehicle_km,
      dealership_id,
      client_id, vehicle_id,
      manual_first_name, manual_last_name, manual_nif_cif,
      manual_email, manual_phone, manual_address,
      manual_vehicle_brand, manual_vehicle_model, manual_vehicle_plate,
      client:users ( first_name, last_name, email, phone, dni, address ),
      vehicle:vehicles ( brand, model, plate, chassis_number )
    `)
    .eq("id", appointmentId)
    .single();

  if (!aptRaw) return { error: "Cita no encontrada" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apt = aptRaw as any;

  // Fetch dealership
  const { data: dealerRaw } = await adminClient
    .from("dealerships")
    .select("id, name, nif_cif, address, logo_url")
    .eq("id", apt.dealership_id)
    .single();

  if (!dealerRaw) return { error: "Concesionario no encontrado" };
  const dealer = dealerRaw as { id: string; name: string; nif_cif: string | null; address: string | null; logo_url: string | null };

  // Download logo
  let dealershipLogoBuffer: Buffer | null = null;
  if (dealer.logo_url) {
    try {
      const logoRes = await fetch(dealer.logo_url);
      if (logoRes.ok) dealershipLogoBuffer = Buffer.from(await logoRes.arrayBuffer());
    } catch { /* logo unavailable */ }
  }

  // Resolve client
  const clientName = apt.client_id && apt.client
    ? `${apt.client.first_name || ""} ${apt.client.last_name || ""}`.trim()
    : `${apt.manual_first_name || ""} ${apt.manual_last_name || ""}`.trim() || "—";
  const clientNif = (apt.client_id && apt.client ? apt.client.dni : apt.manual_nif_cif) || null;
  const clientPhone = (apt.client_id && apt.client ? apt.client.phone : apt.manual_phone) || null;
  const clientEmail = (apt.client_id && apt.client ? apt.client.email : apt.manual_email) || null;
  const clientAddress = (apt.client_id && apt.client ? apt.client.address : apt.manual_address) || null;

  // Resolve vehicle
  const vehicleBrand = (apt.vehicle_id && apt.vehicle ? apt.vehicle.brand : apt.manual_vehicle_brand) || "";
  const vehicleModel = (apt.vehicle_id && apt.vehicle ? apt.vehicle.model : apt.manual_vehicle_model) || "";
  const vehiclePlate = (apt.vehicle_id && apt.vehicle ? apt.vehicle.plate : apt.manual_vehicle_plate) || "—";
  const vehicleChassis = (apt.vehicle_id && apt.vehicle ? apt.vehicle.chassis_number : null) || null;

  const scheduledDate = apt.scheduled_date
    ? new Date(apt.scheduled_date + "T00:00:00").toLocaleDateString("es-ES")
    : "—";

  // Generate PDF
  const pdfBuffer = await generateRepairOrderPDF({
    dealershipName: dealer.name,
    dealershipNif: dealer.nif_cif || null,
    dealershipAddress: dealer.address || null,
    dealershipLogoBuffer,
    locator: apt.locator,
    keyCode: apt.key_code,
    scheduledDate,
    scheduledTime: apt.scheduled_time || "—",
    clientName,
    clientNif,
    clientPhone,
    clientEmail,
    clientAddress,
    vehicleBrand,
    vehicleModel,
    vehiclePlate,
    vehicleChassis,
    description: apt.description || null,
    observations: apt.dealer_observations || null,
    vehicleKm: apt.vehicle_km ?? null,
    pickupSignedAt: apt.order_accepted_at || null,
    returnSignedAt: apt.order_return_accepted_at || null,
  });

  // Upload to Storage
  const fileName = `${dealer.id}/${apt.locator}.pdf`;
  const { error: uploadError } = await adminClient.storage
    .from("repair-orders")
    .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) return { error: `Error al subir PDF: ${uploadError.message}` };

  const { data: urlData } = adminClient.storage.from("repair-orders").getPublicUrl(fileName);
  const fileUrl = urlData?.publicUrl ? `${urlData.publicUrl}?t=${Date.now()}` : null;
  if (!fileUrl) return { error: "No se pudo obtener la URL del PDF." };

  // Update appointment
  const { data: updated } = await adminClient
    .from("appointments")
    .update({ repair_order_url: fileUrl })
    .eq("id", appointmentId)
    .select("repair_acceptance_token")
    .single();

  const token = (updated as { repair_acceptance_token: string } | null)?.repair_acceptance_token
    ?? apt.repair_acceptance_token;

  // Notify registered client (fire-and-forget)
  if (apt.client_id && token) {
    const vehicleLabel = `${vehicleBrand} ${vehicleModel}`.trim() || vehiclePlate;
    const acceptanceUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/orden/${token}`;

    Promise.all([
      clientEmail
        ? sendRepairOrderEmail(clientEmail, apt.client?.first_name || "", apt.locator, dealer.name, vehicleLabel, acceptanceUrl).catch(() => {})
        : Promise.resolve(),
      adminClient.from("notifications").insert({
        user_id: apt.client_id,
        appointment_id: appointmentId,
        type: "repair_order_sent",
        title: "Orden de reparación disponible",
        message: `Tu concesionario ha generado la orden de reparación para la cita ${apt.locator}. Revísala y acepta para autorizar el trabajo.`,
      }).then(() => {}).catch(() => {}),
    ]);
  }

  return { url: fileUrl, token };
}
