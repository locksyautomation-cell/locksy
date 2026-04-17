import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateRepairOrderForAppointment } from "@/lib/utils/repair-order-service";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { appointment_id } = await request.json();
    if (!appointment_id) return NextResponse.json({ error: "appointment_id requerido" }, { status: 400 });

    const adminClient = createAdminClient();

    // Verify appointment belongs to this dealer
    const { data: dealership } = await adminClient
      .from("dealerships")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!dealership) return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });

    const { data: apt } = await adminClient
      .from("appointments")
      .select("id, dealership_id")
      .eq("id", appointment_id)
      .eq("dealership_id", dealership.id)
      .single();

    if (!apt) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });

    const result = await generateRepairOrderForAppointment(appointment_id, adminClient);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
