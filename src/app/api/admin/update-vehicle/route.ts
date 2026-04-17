import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
  const role = userData?.role || (user.user_metadata?.role as string | undefined);
  return role === "admin" ? user : null;
}

// Update existing vehicle
export async function PUT(req: NextRequest) {
  try {
    const admin = await assertAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await req.json();
    const { vehicle_id, brand, model, plate, chassis_number, registration_date, tech_file_url } = body;
    if (!vehicle_id) return NextResponse.json({ error: "vehicle_id requerido" }, { status: 400 });

    const adminClient = createAdminClient();
    const { error } = await adminClient.from("vehicles").update({
      brand, model, plate,
      chassis_number: chassis_number || null,
      registration_date: registration_date || null,
      tech_file_url: tech_file_url !== undefined ? tech_file_url : undefined,
    }).eq("id", vehicle_id);

    if (error) return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// Create new vehicle (for registered client or manual contact)
export async function POST(req: NextRequest) {
  try {
    const admin = await assertAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await req.json();
    const { client_id, dealer_contact_id, brand, model, plate, chassis_number, registration_date, tech_file_url } = body;
    if (!client_id && !dealer_contact_id) return NextResponse.json({ error: "client_id o dealer_contact_id requerido" }, { status: 400 });

    const adminClient = createAdminClient();
    const { data, error } = await adminClient.from("vehicles").insert({
      client_id: client_id || null,
      dealer_contact_id: dealer_contact_id || null,
      brand, model, plate,
      chassis_number: chassis_number || null,
      registration_date: registration_date || null,
      tech_file_url: tech_file_url || null,
    }).select("id").single();

    if (error) return NextResponse.json({ error: "Error al crear" }, { status: 500 });
    return NextResponse.json({ success: true, vehicle_id: data.id });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
