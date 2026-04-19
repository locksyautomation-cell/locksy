import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRepairOrderForAppointment } from "@/lib/utils/repair-order-service";
import { sendSignatureConfirmationEmail } from "@/lib/utils/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 });

  const { type, km } = await request.json();
  if (type !== "key_pickup" && type !== "key_return") {
    return NextResponse.json({ error: "type debe ser 'key_pickup' o 'key_return'" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Capture client IP for legal evidence
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const { data: aptRaw, error: findError } = await adminClient
    .from("appointments")
    .select(`
      id, locator, order_accepted_at, order_return_accepted_at, payment_status,
      client_id,
      manual_first_name, manual_last_name, manual_email,
      client:users ( first_name, last_name, email ),
      dealership:dealerships ( name )
    `)
    .eq("repair_acceptance_token", token)
    .single();

  if (findError || !aptRaw) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apt = aptRaw as any;
  const now = new Date().toISOString();

  if (type === "key_pickup") {
    if (apt.order_accepted_at) return NextResponse.json({ ok: true, alreadyAccepted: true });

    // km is required for pickup signature
    if (!km || typeof km !== "number" || km <= 0) {
      return NextResponse.json({ error: "Los kilómetros del vehículo son obligatorios." }, { status: 400 });
    }

    const { error } = await adminClient
      .from("appointments")
      .update({ order_accepted_at: now, vehicle_km: km, order_accepted_ip: ip })
      .eq("id", apt.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    generateRepairOrderForAppointment(apt.id, adminClient).catch(() => {});

  } else {
    // key_return — requires pickup + payment
    if (!apt.order_accepted_at) {
      return NextResponse.json(
        { error: "Debes aceptar la entrega de llaves antes de confirmar la recogida." },
        { status: 400 }
      );
    }
    if (apt.payment_status !== "paid" && apt.payment_status !== "not_required") {
      return NextResponse.json(
        { error: "La recogida del vehículo solo puede confirmarse una vez que la reparación esté pagada." },
        { status: 400 }
      );
    }
    if (apt.order_return_accepted_at) return NextResponse.json({ ok: true, alreadyAccepted: true });

    const { error } = await adminClient
      .from("appointments")
      .update({ order_return_accepted_at: now, order_return_accepted_ip: ip })
      .eq("id", apt.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    generateRepairOrderForAppointment(apt.id, adminClient).catch(() => {});
  }

  // Send confirmation email (fire-and-forget)
  const clientEmail = apt.client?.email || apt.manual_email;
  const clientName = apt.client
    ? `${apt.client.first_name || ""} ${apt.client.last_name || ""}`.trim()
    : `${apt.manual_first_name || ""} ${apt.manual_last_name || ""}`.trim();
  const dealershipName = apt.dealership?.name || "";

  if (clientEmail) {
    sendSignatureConfirmationEmail(
      clientEmail,
      clientName,
      apt.locator,
      dealershipName,
      type,
      now,
      ip
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
