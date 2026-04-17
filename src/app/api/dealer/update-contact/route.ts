import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: dealership } = await adminClient
      .from("dealerships").select("id").eq("user_id", user.id).single();
    if (!dealership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { id, first_name, last_name, email, phone, nif_cif, address, notes } = await request.json();
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const { error } = await adminClient
      .from("dealer_contacts")
      .update({ first_name, last_name, email, phone, nif_cif, address, notes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("dealership_id", dealership.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
