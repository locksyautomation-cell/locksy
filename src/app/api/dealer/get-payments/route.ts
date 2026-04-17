import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const adminClient = createAdminClient();

    const { data: dealership } = await adminClient
      .from("dealerships")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!dealership) return NextResponse.json({ payments: [] });

    const { data } = await adminClient
      .from("appointments")
      .select("*, vehicle:vehicles(brand, model, plate), client:users(first_name, last_name)")
      .eq("dealership_id", dealership.id)
      .eq("payment_status", "paid")
      .order("completed_at", { ascending: false });

    return NextResponse.json({ payments: data || [] });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
