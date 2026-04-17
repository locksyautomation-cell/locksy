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

    const vehicleType = request.nextUrl.searchParams.get("vehicle_type");

    const adminClient = createAdminClient();
    let query = adminClient
      .from("vehicle_brands")
      .select("id, name, vehicle_type, vehicle_models(id, name)")
      .order("name", { ascending: true });

    if (vehicleType === "motos" || vehicleType === "coches") {
      query = query.eq("vehicle_type", vehicleType);
    }

    const { data: brands, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ brands: brands ?? [] });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
