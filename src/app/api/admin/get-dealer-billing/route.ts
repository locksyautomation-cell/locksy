import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    const role = userData?.role || (user.user_metadata?.role as string | undefined);
    if (role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const dealer_id = request.nextUrl.searchParams.get("dealer_id");
    if (!dealer_id) return NextResponse.json({ error: "dealer_id requerido" }, { status: 400 });

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("appointments")
      .select(`
        id, locator, scheduled_date, budget_amount, payment_status, completed_at,
        manual_first_name, manual_last_name, manual_vehicle_brand, manual_vehicle_model, manual_vehicle_plate,
        users!appointments_client_id_fkey ( first_name, last_name ),
        vehicles ( brand, model, plate )
      `)
      .eq("dealership_id", dealer_id)
      .eq("status", "finalizada")
      .not("budget_amount", "is", null)
      .order("completed_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Error al obtener facturación" }, { status: 500 });
    return NextResponse.json({ orders: data });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
