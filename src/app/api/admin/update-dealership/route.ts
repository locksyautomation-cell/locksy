import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = userData?.role || (user.user_metadata?.role as string | undefined);

    if (role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, nif_cif, phone, address, city, postal_code, repair_statuses, vehicle_type } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const updatePayload: Record<string, unknown> = { name, nif_cif, phone, address, city, postal_code, repair_statuses };
    if (vehicle_type !== undefined) updatePayload.vehicle_type = vehicle_type;

    const { error } = await adminClient
      .from("dealerships")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Error al actualizar concesionario" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
