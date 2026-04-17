import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatLocator } from "@/lib/utils/locator";
import { sendAppointmentConfirmationEmail } from "@/lib/utils/email";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();

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

  // Resolve dealership ID + locator info
  const { data: dealership } = await adminClient
    .from("dealerships")
    .select("id, name, address, locator_prefix, locator_sequence")
    .eq("user_id", user.id)
    .single();

  if (!dealership) {
    return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });
  }

  const seq: number = (dealership as unknown as { locator_sequence: number }).locator_sequence ?? 0;
  const prefix: string | null = (dealership as unknown as { locator_prefix: string | null }).locator_prefix;
  const locator = prefix ? formatLocator(prefix, seq) : `#${seq.toString().padStart(4, "0")}`;

  const insertData: Record<string, unknown> = {
    dealership_id: dealership.id,
    locator,
    key_code: body.key_code,
    scheduled_date: body.scheduled_date,
    scheduled_time: body.scheduled_time,
    description: body.description || null,
  };

  if (body.client_id) {
    insertData.client_id = body.client_id;
    insertData.vehicle_id = body.vehicle_id || null;
  } else {
    insertData.manual_first_name = body.manual_first_name || null;
    insertData.manual_last_name = body.manual_last_name || null;
    insertData.manual_nif_cif = body.manual_nif_cif || null;
    insertData.manual_email = body.manual_email || null;
    insertData.manual_phone = body.manual_phone || null;
    insertData.manual_address = body.manual_address || null;
    insertData.manual_vehicle_brand = body.manual_vehicle_brand || null;
    insertData.manual_vehicle_model = body.manual_vehicle_model || null;
    insertData.manual_vehicle_plate = body.manual_vehicle_plate || null;
  }

  const { data, error } = await adminClient.from("appointments").insert(insertData).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Increment dealership locator sequence
  await adminClient
    .from("dealerships")
    .update({ locator_sequence: seq + 1 })
    .eq("id", dealership.id);

  // Upsert dealer_contact and link it
  try {
    let contactId: string | null = null;

    if (body.client_id) {
      // Registered client: upsert by (dealership_id, client_id)
      const { data: existingContact } = await adminClient
        .from("dealer_contacts")
        .select("id")
        .eq("dealership_id", dealership.id)
        .eq("client_id", body.client_id)
        .single();

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const { data: u } = await adminClient
          .from("users")
          .select("first_name, last_name, email, phone, dni, address")
          .eq("id", body.client_id)
          .single();
        const { data: newContact } = await adminClient
          .from("dealer_contacts")
          .insert({
            dealership_id: dealership.id,
            client_id: body.client_id,
            first_name: u?.first_name || "",
            last_name: u?.last_name || "",
            email: u?.email || null,
            phone: u?.phone || null,
            nif_cif: u?.dni || null,
            address: u?.address || null,
          })
          .select("id")
          .single();
        contactId = newContact?.id || null;
      }
    } else if (body.existing_contact_id) {
      // Existing manual contact selected from search — reuse it, no duplicate
      contactId = body.existing_contact_id;
    } else if (body.manual_first_name || body.manual_email || body.manual_phone) {
      // Truly new manual client — create contact
      const { data: newContact } = await adminClient
        .from("dealer_contacts")
        .insert({
          dealership_id: dealership.id,
          client_id: null,
          first_name: body.manual_first_name || "",
          last_name: body.manual_last_name || "",
          email: body.manual_email || null,
          phone: body.manual_phone || null,
          nif_cif: body.manual_nif_cif || null,
          address: body.manual_address || null,
        })
        .select("id")
        .single();
      contactId = newContact?.id || null;
    }

    if (contactId) {
      await adminClient
        .from("appointments")
        .update({ dealer_contact_id: contactId })
        .eq("id", data.id);
    }
  } catch {
    // Non-fatal: appointment is created, contact linking failed
  }

  // Email de confirmación al cliente registrado (si existe)
  if (body.client_id) {
    try {
      const [clientData, vehicleData] = await Promise.all([
        adminClient.from("users").select("email, first_name, last_name").eq("id", body.client_id).single().then(r => r.data),
        body.vehicle_id
          ? adminClient.from("vehicles").select("brand, model, plate").eq("id", body.vehicle_id).single().then(r => r.data)
          : Promise.resolve(null),
      ]);
      const dealerName = (dealership as unknown as { name: string }).name ?? "";
      const dealerAddress = (dealership as unknown as { address: string | null }).address ?? "";
      const vehicleInfo = vehicleData
        ? [vehicleData.brand, vehicleData.model, vehicleData.plate].filter(Boolean).join(" · ")
        : body.manual_vehicle_brand
          ? [body.manual_vehicle_brand, body.manual_vehicle_model, body.manual_vehicle_plate].filter(Boolean).join(" · ")
          : "";
      const clientFullName = [clientData?.first_name, clientData?.last_name].filter(Boolean).join(" ");
      if (clientData?.email) {
        sendAppointmentConfirmationEmail(
          clientData.email, clientFullName, dealerName, dealerAddress,
          locator, body.scheduled_date, body.scheduled_time, vehicleInfo, data.id
        ).catch(() => {});
      }
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ appointment: data });
}
