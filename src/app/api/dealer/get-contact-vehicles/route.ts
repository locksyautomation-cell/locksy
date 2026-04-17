import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const contact_id = req.nextUrl.searchParams.get("contact_id");
    const client_id = req.nextUrl.searchParams.get("client_id");
    if (!contact_id && !client_id) return NextResponse.json({ vehicles: [] });

    const adminClient = createAdminClient();

    const vehicle_type = req.nextUrl.searchParams.get("vehicle_type");

    const { data: dealership } = await adminClient
      .from("dealerships").select("id, vehicle_type").eq("user_id", user.id).single();
    if (!dealership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    // Use explicit vehicle_type param or fall back to dealer's own vehicle_type
    const typeFilter = vehicle_type || dealership.vehicle_type;

    // Registered client path: fetch by client_id from vehicles table
    if (client_id) {
      let q = adminClient
        .from("vehicles").select("id, brand, model, plate, vehicle_type")
        .eq("client_id", client_id);
      if (typeFilter === "motos" || typeFilter === "coches") {
        q = q.eq("vehicle_type", typeFilter);
      }
      const { data: tableVehicles } = await q;
      const vehicles = (tableVehicles || []).map((v) => ({
        id: v.id, brand: v.brand, model: v.model, plate: v.plate, vehicle_type: v.vehicle_type,
      }));
      return NextResponse.json({ vehicles });
    }

    // Manual contact path: verify contact belongs to this dealership
    const { data: contact } = await adminClient
      .from("dealer_contacts").select("id")
      .eq("id", contact_id!).eq("dealership_id", dealership.id).single();
    if (!contact) return NextResponse.json({ vehicles: [] });

    // Vehicles from vehicles table (dealer_contact_id)
    const { data: tableVehicles } = await adminClient
      .from("vehicles").select("brand, model, plate")
      .eq("dealer_contact_id", contact_id!);

    // Unique vehicles from appointment history (manual_vehicle_*)
    const { data: appointments } = await adminClient
      .from("appointments")
      .select("manual_vehicle_brand, manual_vehicle_model, manual_vehicle_plate")
      .eq("dealer_contact_id", contact_id!)
      .not("manual_vehicle_plate", "is", null);

    const vehicles: { brand: string; model: string; plate: string }[] = [...(tableVehicles || [])];
    const plates = new Set(vehicles.map((v) => v.plate.toLowerCase()));

    for (const apt of appointments || []) {
      if (apt.manual_vehicle_plate && !plates.has(apt.manual_vehicle_plate.toLowerCase())) {
        plates.add(apt.manual_vehicle_plate.toLowerCase());
        vehicles.push({
          brand: apt.manual_vehicle_brand || "",
          model: apt.manual_vehicle_model || "",
          plate: apt.manual_vehicle_plate,
        });
      }
    }

    return NextResponse.json({ vehicles });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
