import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { dealership_id, dealershipSlug } = body;
  if (!dealership_id && !dealershipSlug) return NextResponse.json({ error: "dealership_id o dealershipSlug requerido" }, { status: 400 });

  const adminClient = createAdminClient();

  // Verify the dealership exists and is active
  const query = adminClient.from("dealerships").select("id, name").eq("active", true);
  const { data: dealership } = await (dealership_id
    ? query.eq("id", dealership_id)
    : query.eq("slug", dealershipSlug)
  ).single();

  if (!dealership) return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });

  const { error } = await adminClient
    .from("dealership_clients")
    .upsert(
      { dealership_id: dealership.id, client_id: user.id, active: true },
      { onConflict: "dealership_id,client_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
