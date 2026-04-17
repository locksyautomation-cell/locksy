import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    const role = userData?.role || (user.user_metadata?.role as string | undefined);
    if (role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { name, vehicle_type } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    if (!vehicle_type || !["motos", "coches"].includes(vehicle_type)) {
      return NextResponse.json({ error: "Tipo de vehículo requerido (motos o coches)" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("vehicle_brands")
      .insert({ name: name.trim(), vehicle_type })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Esa marca ya existe" }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ brand: data });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
