import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { appointment_id } = await req.json();
  if (!appointment_id) {
    return NextResponse.json({ error: "appointment_id requerido" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Verify the appointment belongs to this dealer
  const { data: dealership } = await adminClient
    .from("dealerships")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!dealership) {
    return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });
  }

  const { data: apt } = await adminClient
    .from("appointments")
    .select("id, dealership_id, client_id, locator, order_accepted_at")
    .eq("id", appointment_id)
    .eq("dealership_id", dealership.id)
    .single();

  if (!apt) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  const aptRow = apt as { id: string; dealership_id: string; client_id: string | null; locator: string; order_accepted_at: string | null };

  if (!aptRow.order_accepted_at) {
    return NextResponse.json(
      { error: "El cliente debe aceptar la orden de reparación antes de confirmar la recogida de llaves." },
      { status: 400 }
    );
  }

  const { error: updateError } = await adminClient
    .from("appointments")
    .update({
      status: "en_curso",
      key_picked_up_at: new Date().toISOString(),
      vehicle_in_dealership: true,
    })
    .eq("id", appointment_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Only send notification if there's a real registered client
  if (aptRow.client_id) {
    await adminClient.from("notifications").insert({
      user_id: aptRow.client_id,
      appointment_id: aptRow.id,
      type: "status_change",
      title: "Recogida confirmada",
      message: `La recogida de llaves para la cita ${aptRow.locator} ha sido confirmada. Su vehículo está en el taller.`,
    });
  }

  return NextResponse.json({ ok: true });
}
