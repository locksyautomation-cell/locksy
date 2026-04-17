import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getDealer(userId: string) {
  const adminClient = createAdminClient();
  const { data } = await adminClient.from("dealerships").select("id").eq("user_id", userId).single();
  return { adminClient, dealership: data };
}

// Update existing vehicle
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { vehicle_id, brand, model, plate, chassis_number, registration_date, tech_file_url } = body;
    if (!vehicle_id) return NextResponse.json({ error: "vehicle_id requerido" }, { status: 400 });

    const { adminClient, dealership } = await getDealer(user.id);
    if (!dealership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { data: vehicle } = await adminClient
      .from("vehicles").select("client_id, dealer_contact_id").eq("id", vehicle_id).single();
    if (!vehicle) return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });

    // Verify ownership via client_id or dealer_contact_id
    if (vehicle.client_id) {
      const { data: dc } = await adminClient
        .from("dealership_clients").select("id")
        .eq("dealership_id", dealership.id).eq("client_id", vehicle.client_id).single();
      if (!dc) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    } else if (vehicle.dealer_contact_id) {
      const { data: dc } = await adminClient
        .from("dealer_contacts").select("id")
        .eq("id", vehicle.dealer_contact_id).eq("dealership_id", dealership.id).single();
      if (!dc) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    } else {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

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

// Create new vehicle record (for registered client or manual contact)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { client_id, dealer_contact_id, brand, model, plate, chassis_number, registration_date, tech_file_url } = body;
    if (!client_id && !dealer_contact_id) return NextResponse.json({ error: "client_id o dealer_contact_id requerido" }, { status: 400 });

    const { adminClient, dealership } = await getDealer(user.id);
    if (!dealership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    // Verify ownership
    if (client_id) {
      const { data: dc } = await adminClient
        .from("dealership_clients").select("id")
        .eq("dealership_id", dealership.id).eq("client_id", client_id).single();
      if (!dc) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    } else {
      const { data: dc } = await adminClient
        .from("dealer_contacts").select("id")
        .eq("id", dealer_contact_id).eq("dealership_id", dealership.id).single();
      if (!dc) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

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
