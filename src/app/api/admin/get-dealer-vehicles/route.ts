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
      .from("vehicles")
      .select(`
        id, brand, model, cc, plate, created_at,
        users!vehicles_client_id_fkey ( first_name, last_name )
      `)
      .eq("dealer_id", dealer_id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Error al obtener vehículos" }, { status: 500 });
    return NextResponse.json({ vehicles: data });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
