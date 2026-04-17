import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST: merge a manual contact with a registered user
// body: { contact_id, client_id }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: dealership } = await adminClient
      .from("dealerships").select("id").eq("user_id", user.id).single();
    if (!dealership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { contact_id, client_id } = await request.json();
    if (!contact_id || !client_id) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    // Check the contact belongs to this dealership and is manual
    const { data: contact } = await adminClient
      .from("dealer_contacts")
      .select("id, client_id")
      .eq("id", contact_id)
      .eq("dealership_id", dealership.id)
      .single();
    if (!contact) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
    if (contact.client_id) return NextResponse.json({ error: "Este contacto ya tiene perfil vinculado" }, { status: 400 });

    // Check if there's already a registered contact for this client in this dealership
    const { data: existing } = await adminClient
      .from("dealer_contacts")
      .select("id")
      .eq("dealership_id", dealership.id)
      .eq("client_id", client_id)
      .single();

    if (existing) {
      // Reassign appointments from manual contact to the existing registered contact
      await adminClient
        .from("appointments")
        .update({ dealer_contact_id: existing.id })
        .eq("dealer_contact_id", contact_id);
      // Delete the manual contact
      await adminClient.from("dealer_contacts").delete().eq("id", contact_id);
      return NextResponse.json({ success: true, merged_into: existing.id });
    }

    // No existing registered contact — just set client_id on the manual one
    const { data: registeredUser } = await adminClient
      .from("users")
      .select("first_name, last_name, email, phone, dni, address")
      .eq("id", client_id)
      .single();

    await adminClient
      .from("dealer_contacts")
      .update({
        client_id,
        // Fill in registered user data where contact fields are empty
        first_name: registeredUser?.first_name || contact.client_id,
        last_name: registeredUser?.last_name || "",
        email: registeredUser?.email || null,
        phone: registeredUser?.phone || null,
        nif_cif: registeredUser?.dni || null,
        address: registeredUser?.address || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contact_id);

    // Also ensure they are in dealership_clients
    await adminClient
      .from("dealership_clients")
      .upsert({ dealership_id: dealership.id, client_id, active: true }, { onConflict: "dealership_id,client_id" });

    return NextResponse.json({ success: true, merged_into: contact_id });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// GET: search registered users linked to this dealership (for merge UI)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const q = request.nextUrl.searchParams.get("q") || "";
    if (q.length < 2) return NextResponse.json({ users: [] });

    const adminClient = createAdminClient();
    const { data: dealership } = await adminClient
      .from("dealerships").select("id").eq("user_id", user.id).single();
    if (!dealership) return NextResponse.json({ users: [] });

    const { data } = await adminClient
      .from("users")
      .select("id, first_name, last_name, email, phone")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
      .eq("role", "client")
      .limit(10);

    return NextResponse.json({ users: data || [] });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
