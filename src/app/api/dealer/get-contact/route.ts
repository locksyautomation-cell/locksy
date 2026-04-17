import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const adminClient = createAdminClient();
    const { data: dealership } = await adminClient
      .from("dealerships").select("id, vehicle_type").eq("user_id", user.id).single();
    if (!dealership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { data: contact, error } = await adminClient
      .from("dealer_contacts")
      .select("*")
      .eq("id", id)
      .eq("dealership_id", dealership.id)
      .single();

    if (error || !contact) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });

    // Fetch appointments: by dealer_contact_id OR by client_id
    const aptsQuery = adminClient
      .from("appointments")
      .select("*, vehicle:vehicles(brand, model, plate)")
      .eq("dealership_id", dealership.id)
      .order("scheduled_date", { ascending: false });

    let appointments: unknown[] = [];
    if (contact.client_id) {
      const { data: a1 } = await aptsQuery.eq("client_id", contact.client_id);
      const { data: a2 } = await adminClient
        .from("appointments")
        .select("*, vehicle:vehicles(brand, model, plate)")
        .eq("dealership_id", dealership.id)
        .eq("dealer_contact_id", id)
        .is("client_id", null)
        .order("scheduled_date", { ascending: false });
      const ids = new Set<string>();
      appointments = [...(a1 || []), ...(a2 || [])].filter((a) => {
        const apt = a as { id: string };
        if (ids.has(apt.id)) return false;
        ids.add(apt.id);
        return true;
      });
    } else {
      const { data } = await adminClient
        .from("appointments")
        .select("*, vehicle:vehicles(brand, model, plate)")
        .eq("dealership_id", dealership.id)
        .eq("dealer_contact_id", id)
        .order("scheduled_date", { ascending: false });
      appointments = data || [];
    }

    // Fetch registered user info and vehicles
    let registeredUser = null;
    let vehicles: unknown[] = [];
    const vtype = dealership.vehicle_type as "motos" | "coches" | null;

    if (contact.client_id) {
      let vehiclesQuery = adminClient
        .from("vehicles")
        .select("id, brand, model, plate, chassis_number, registration_date, tech_file_url, created_at, vehicle_type")
        .eq("client_id", contact.client_id)
        .order("created_at", { ascending: false });
      if (vtype === "motos" || vtype === "coches") {
        vehiclesQuery = vehiclesQuery.eq("vehicle_type", vtype);
      }
      const [userRes, vehiclesRes] = await Promise.all([
        adminClient
          .from("users")
          .select("id, first_name, last_name, email, phone, dni, address")
          .eq("id", contact.client_id)
          .single(),
        vehiclesQuery,
      ]);
      registeredUser = userRes.data;
      vehicles = vehiclesRes.data || [];
    } else {
      let vehiclesQuery = adminClient
        .from("vehicles")
        .select("id, brand, model, plate, chassis_number, registration_date, tech_file_url, created_at, vehicle_type")
        .eq("dealer_contact_id", id)
        .order("created_at", { ascending: false });
      if (vtype === "motos" || vtype === "coches") {
        vehiclesQuery = vehiclesQuery.eq("vehicle_type", vtype);
      }
      const { data: v } = await vehiclesQuery;
      vehicles = v || [];
    }

    return NextResponse.json({ contact, appointments, registeredUser, vehicles });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
