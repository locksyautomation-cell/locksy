import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { dealership_id } = await req.json();
  if (!dealership_id) return NextResponse.json({ error: "dealership_id requerido" }, { status: 400 });

  const adminClient = createAdminClient();

  // Verify the dealership exists and is active
  const { data: dealership } = await adminClient
    .from("dealerships")
    .select("id, name")
    .eq("id", dealership_id)
    .single();

  if (!dealership) return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });

  const { error } = await adminClient
    .from("dealership_clients")
    .upsert(
      { dealership_id, client_id: user.id, active: true },
      { onConflict: "dealership_id,client_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
