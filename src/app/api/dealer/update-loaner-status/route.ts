import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLoanerVehicleResponseEmail } from "@/lib/utils/email";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { appointment_id, status } = await request.json();
  if (!appointment_id || !["accepted", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: dealerRaw } = await adminClient
    .from("dealerships")
    .select("id, name")
    .eq("user_id", user.id)
    .single();

  if (!dealerRaw) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealer = dealerRaw as any;

  const { data: aptRaw, error } = await adminClient
    .from("appointments")
    .update({ loaner_vehicle_status: status })
    .eq("id", appointment_id)
    .eq("dealership_id", dealer.id)
    .select("locator, client_id, client:users(first_name, email)")
    .single();

  if (error || !aptRaw) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apt = aptRaw as any;

  if (apt.client_id && apt.client?.email) {
    sendLoanerVehicleResponseEmail(
      apt.client.email,
      apt.client.first_name || "",
      apt.locator,
      dealer.name,
      status === "accepted",
      appointment_id
    ).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
