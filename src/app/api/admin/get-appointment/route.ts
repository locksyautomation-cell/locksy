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

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const adminClient = createAdminClient();

    const { data: apt, error } = await adminClient
      .from("appointments")
      .select(`
        *,
        client:users ( first_name, last_name, email, phone, dni, address ),
        vehicle:vehicles ( brand, model, plate )
      `)
      .eq("id", id)
      .single();

    if (error || !apt) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });

    const { data: dealership } = await adminClient
      .from("dealerships")
      .select("id, name, repair_statuses")
      .eq("id", apt.dealership_id)
      .single();

    return NextResponse.json({ appointment: apt, dealership });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
