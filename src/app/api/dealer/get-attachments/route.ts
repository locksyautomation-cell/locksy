import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const appointment_id = searchParams.get("appointment_id");
    if (!appointment_id) return NextResponse.json({ error: "appointment_id requerido" }, { status: 400 });

    const adminClient = createAdminClient();

    // Verify the appointment belongs to this dealer
    const { data: dealership } = await adminClient
      .from("dealerships")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!dealership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { data: apt } = await adminClient
      .from("appointments")
      .select("id")
      .eq("id", appointment_id)
      .eq("dealership_id", dealership.id)
      .maybeSingle();

    if (!apt) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });

    const { data: attachments } = await adminClient
      .from("attachments")
      .select("*")
      .eq("appointment_id", appointment_id);

    return NextResponse.json({ attachments: attachments || [] });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
