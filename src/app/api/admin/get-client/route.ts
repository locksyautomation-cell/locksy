import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
  const role = userData?.role || (user.user_metadata?.role as string | undefined);
  return role === "admin" ? user : null;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await assertAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const id = req.nextUrl.searchParams.get("id");
    const type = req.nextUrl.searchParams.get("type"); // "registered" | "manual"
    if (!id || !type) return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 });

    const adminClient = createAdminClient();

    if (type === "registered") {
      // Fetch user info
      const { data: userRow } = await adminClient
        .from("users")
        .select("id, first_name, last_name, email, phone, dni, address, created_at")
        .eq("id", id)
        .single();

      if (!userRow) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

      // All dealer_contacts for this user (to get dealership names)
      const { data: contacts } = await adminClient
        .from("dealer_contacts")
        .select("id, dealership:dealerships(id, name)")
        .eq("client_id", id);

      const dealer_names = (contacts || [])
        .map((c: Record<string, unknown>) => (c.dealership as Record<string, string> | null)?.name)
        .filter(Boolean) as string[];

      // All appointments for this user across all dealerships
      const { data: appointments } = await adminClient
        .from("appointments")
        .select("*, vehicle:vehicles(brand, model, plate), dealership:dealerships(name)")
        .eq("client_id", id)
        .order("scheduled_date", { ascending: false });

      const { data: vehicles } = await adminClient
        .from("vehicles")
        .select("id, brand, model, plate, chassis_number, registration_date, tech_file_url, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false });

      return NextResponse.json({
        client: {
          id: userRow.id,
          client_id: userRow.id,
          first_name: userRow.first_name,
          last_name: userRow.last_name,
          email: userRow.email,
          phone: userRow.phone,
          nif_cif: userRow.dni || null,
          address: userRow.address || null,
          created_at: userRow.created_at,
          dealer_names,
          is_manual: false,
        },
        appointments: appointments || [],
        vehicles: vehicles || [],
      });
    }

    // Manual contact
    const { data: contact } = await adminClient
      .from("dealer_contacts")
      .select("*, dealership:dealerships(name)")
      .eq("id", id)
      .single();

    if (!contact) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    const dealerName = (contact.dealership as Record<string, string> | null)?.name || "—";

    const { data: appointments } = await adminClient
      .from("appointments")
      .select("*, vehicle:vehicles(brand, model, plate), dealership:dealerships(name)")
      .eq("dealer_contact_id", id)
      .order("scheduled_date", { ascending: false });

    const { data: vehicles } = await adminClient
      .from("vehicles")
      .select("id, brand, model, plate, chassis_number, registration_date, tech_file_url, created_at")
      .eq("dealer_contact_id", id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      client: {
        id: contact.id,
        client_id: null,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        nif_cif: contact.nif_cif,
        address: contact.address,
        created_at: contact.created_at,
        dealer_names: [dealerName],
        is_manual: true,
      },
      appointments: appointments || [],
      vehicles: vehicles || [],
    });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
