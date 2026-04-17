import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: dealership } = await adminClient
    .from("dealerships")
    .select("id, repair_statuses")
    .eq("user_id", user.id)
    .single();

  if (!dealership) {
    return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });
  }

  const { data: appointment, error } = await adminClient
    .from("appointments")
    .select("*, vehicle:vehicles(*), client:users(first_name, last_name, email, phone, dni)")
    .eq("id", id)
    .eq("dealership_id", dealership.id)
    .single();

  if (error || !appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ appointment, dealership });
}
