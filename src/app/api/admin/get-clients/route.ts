import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    const adminClient = createAdminClient();

    // 1. All registered clients from users table (survives dealership deletion)
    const { data: registeredUsers, error: usersError } = await adminClient
      .from("users")
      .select("id, first_name, last_name, email, phone, dni, created_at")
      .eq("role", "client")
      .order("created_at", { ascending: false });

    if (usersError) {
      return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
    }

    // 2. Current dealership links for registered clients (may be empty if dealership was deleted)
    const { data: dealerLinks } = await adminClient
      .from("dealership_clients")
      .select("client_id, dealership:dealerships ( name )");

    const dealerNamesByClient = new Map<string, string[]>();
    for (const link of (dealerLinks || []) as Record<string, unknown>[]) {
      const cid = link.client_id as string;
      const dealership = link.dealership as Record<string, string> | null;
      const name = dealership?.name || "—";
      if (!dealerNamesByClient.has(cid)) dealerNamesByClient.set(cid, []);
      dealerNamesByClient.get(cid)!.push(name);
    }

    const registeredClients = (registeredUsers || []).map((u) => ({
      id: u.id,
      client_id: u.id,
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      email: u.email || null,
      phone: u.phone || null,
      nif_cif: u.dni || null,
      created_at: u.created_at,
      dealer_names: dealerNamesByClient.get(u.id) || [],
      is_manual: false as const,
    }));

    // 3. Manual contacts (no user account, client_id is null)
    const { data: manualData, error: manualError } = await adminClient
      .from("dealer_contacts")
      .select(`
        id, first_name, last_name, email, phone, nif_cif, created_at,
        dealership:dealerships ( name )
      `)
      .is("client_id", null)
      .order("created_at", { ascending: false });

    if (manualError) {
      return NextResponse.json({ error: "Error al obtener clientes manuales" }, { status: 500 });
    }

    const manualContacts = (manualData || []).map((row) => {
      const dealership = row.dealership as Record<string, string> | null;
      return {
        id: row.id as string,
        client_id: null as null,
        first_name: (row.first_name as string) || "",
        last_name: (row.last_name as string) || "",
        email: (row.email as string | null) || null,
        phone: (row.phone as string | null) || null,
        nif_cif: (row.nif_cif as string | null) || null,
        created_at: row.created_at as string,
        dealer_names: dealership?.name ? [dealership.name] : [],
        is_manual: true as const,
      };
    });

    const clients = [...registeredClients, ...manualContacts]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ clients });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
