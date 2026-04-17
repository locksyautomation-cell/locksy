import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fallback: try session if getUser fails (e.g. unconfirmed email)
    let userId = user?.id;
    let userEmail = user?.email;
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
      userEmail = session?.user?.email;
    }

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { first_name, last_name, dni, phone, address, photo_url, dealership_slug } = body;

    const adminClient = createAdminClient();

    // Update user profile
    const { error: updateError } = await adminClient.from("users").update({
      first_name,
      last_name,
      dni,
      phone,
      address,
      ...(photo_url && { profile_photo_url: photo_url }),
    }).eq("id", userId);

    if (updateError) {
      return NextResponse.json({ error: "Error al actualizar perfil", detail: updateError.message }, { status: 500 });
    }

    // Link client to dealership and create dealer_contact entry
    if (dealership_slug) {
      const { data: dealership } = await adminClient
        .from("dealerships")
        .select("id")
        .eq("slug", dealership_slug)
        .eq("active", true)
        .single();

      if (dealership) {
        // Link client to dealership
        const { data: existingDc } = await adminClient
          .from("dealership_clients")
          .select("id")
          .eq("dealership_id", dealership.id)
          .eq("client_id", userId)
          .maybeSingle();
        if (!existingDc) {
          await adminClient.from("dealership_clients").insert(
            { dealership_id: dealership.id, client_id: userId, active: true }
          );
        }

        // Create dealer_contact so the client appears in the dealer's client list
        // Use check-then-insert to avoid depending on a unique constraint
        const { data: existingContact } = await adminClient
          .from("dealer_contacts")
          .select("id")
          .eq("dealership_id", dealership.id)
          .eq("client_id", userId)
          .maybeSingle();

        if (!existingContact) {
          await adminClient.from("dealer_contacts").insert({
            dealership_id: dealership.id,
            client_id: userId,
            first_name: first_name || "",
            last_name: last_name || null,
            email: userEmail || null,
            phone: phone || null,
            nif_cif: dni || null,
            address: address || null,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
