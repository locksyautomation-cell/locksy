import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateKeyCode } from "@/lib/utils/keycode";
import { formatLocator } from "@/lib/utils/locator";
import { sendAppointmentConfirmationEmail, sendDealerAppointmentNotificationEmail } from "@/lib/utils/email";

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await request.json();

    // Validar que la fecha/hora no sea pasada
    if (body.scheduled_date && body.scheduled_time) {
      const apptDateTime = new Date(`${body.scheduled_date}T${body.scheduled_time}:00`);
      if (apptDateTime < new Date()) {
        return NextResponse.json(
          { error: "No se pueden reservar citas para una fecha y hora pasadas." },
          { status: 400 }
        );
      }
    }

    const adminClient = createAdminClient();

    // Get dealership info
    const { data: dealershipInfo } = await adminClient
      .from("dealerships")
      .select("locator_prefix, locator_sequence, name, address, email")
      .eq("id", body.dealership_id)
      .single();

    const seq: number = (dealershipInfo as unknown as { locator_sequence: number } | null)?.locator_sequence ?? 0;
    const prefix: string | null = (dealershipInfo as unknown as { locator_prefix: string | null } | null)?.locator_prefix ?? null;
    const locator = prefix ? formatLocator(prefix, seq) : `#${seq.toString().padStart(4, "0")}`;
    const keyCode = generateKeyCode();

    const { data: appointment, error } = await adminClient
      .from("appointments")
      .insert({
        dealership_id: body.dealership_id,
        client_id: userId,
        vehicle_id: body.vehicle_id || null,
        locator,
        key_code: keyCode,
        scheduled_date: body.scheduled_date,
        scheduled_time: body.scheduled_time,
        description: body.description || null,
        status: body.requires_approval ? "pendiente_aprobacion" : "pendiente",
        loaner_vehicle_requested: body.loaner_vehicle_requested === true,
        loaner_vehicle_status: body.loaner_vehicle_requested === true ? "pending" : null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Increment dealership locator sequence
    await adminClient
      .from("dealerships")
      .update({ locator_sequence: seq + 1 })
      .eq("id", body.dealership_id);

    // Create/find dealer_contact and link it to the appointment
    try {
      const { data: existingContact } = await adminClient
        .from("dealer_contacts")
        .select("id")
        .eq("dealership_id", body.dealership_id)
        .eq("client_id", userId)
        .single();

      let contactId = existingContact?.id ?? null;

      if (!contactId) {
        const { data: userData } = await adminClient
          .from("users")
          .select("first_name, last_name, email, phone, dni, address")
          .eq("id", userId)
          .single();

        const { data: newContact } = await adminClient
          .from("dealer_contacts")
          .insert({
            dealership_id: body.dealership_id,
            client_id: userId,
            first_name: userData?.first_name || "",
            last_name: userData?.last_name || null,
            email: userData?.email || null,
            phone: userData?.phone || null,
            nif_cif: userData?.dni || null,
            address: userData?.address || null,
          })
          .select("id")
          .single();

        contactId = newContact?.id ?? null;
      }

      if (contactId) {
        await adminClient
          .from("appointments")
          .update({ dealer_contact_id: contactId })
          .eq("id", appointment.id);
      }
    } catch {
      // Non-fatal
    }

    // Upload attachments if any (base64 encoded)
    if (body.attachments?.length) {
      for (const att of body.attachments) {
        const buffer = Buffer.from(att.data, "base64");
        const path = `${appointment.id}/${crypto.randomUUID()}.${att.ext}`;
        const { error: uploadError } = await adminClient.storage
          .from("appointment-attachments")
          .upload(path, buffer, { contentType: att.mime_type, upsert: false });

        if (!uploadError) {
          const { data: { publicUrl } } = adminClient.storage
            .from("appointment-attachments")
            .getPublicUrl(path);

          let fileType = "other";
          if (att.mime_type.startsWith("image/")) fileType = "photo";
          else if (att.mime_type.startsWith("video/")) fileType = "video";
          else if (att.mime_type.startsWith("audio/")) fileType = "audio";

          await adminClient.from("attachments").insert({
            appointment_id: appointment.id,
            uploaded_by: userId,
            file_name: att.name,
            file_url: publicUrl,
            file_type: fileType,
            file_size: att.size,
            mime_type: att.mime_type,
          });
        }
      }
    }

    // Emails: confirmación al cliente + notificación al concesionario
    try {
      const [clientData, vehicleData] = await Promise.all([
        adminClient.from("users").select("email, first_name, last_name").eq("id", userId).single().then(r => r.data),
        body.vehicle_id
          ? adminClient.from("vehicles").select("brand, model, plate").eq("id", body.vehicle_id).single().then(r => r.data)
          : Promise.resolve(null),
      ]);

      const dealerName = (dealershipInfo as unknown as { name: string } | null)?.name ?? "";
      const dealerAddress = (dealershipInfo as unknown as { address: string | null } | null)?.address ?? "";
      const dealerEmail = (dealershipInfo as unknown as { email: string | null } | null)?.email ?? "";
      const vehicleInfo = vehicleData
        ? [vehicleData.brand, vehicleData.model, vehicleData.plate].filter(Boolean).join(" · ")
        : "";
      const clientFullName = [clientData?.first_name, clientData?.last_name].filter(Boolean).join(" ");
      const eventType = appointment.status === "pendiente_aprobacion" ? "solicitada" : "nueva";

      const loanerRequested = body.loaner_vehicle_requested === true;
      if (clientData?.email) {
        sendAppointmentConfirmationEmail(
          clientData.email, clientFullName, dealerName, dealerAddress,
          locator, appointment.scheduled_date, appointment.scheduled_time,
          vehicleInfo, appointment.id, loanerRequested
        ).catch(() => {});
      }
      if (dealerEmail) {
        sendDealerAppointmentNotificationEmail(
          dealerEmail, dealerName, eventType, locator, clientFullName,
          appointment.scheduled_date, appointment.scheduled_time, vehicleInfo, appointment.id, loanerRequested
        ).catch(() => {});
      }
    } catch { /* non-fatal */ }

    return NextResponse.json({ appointment });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-appointment]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
