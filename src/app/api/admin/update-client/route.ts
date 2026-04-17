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
    const { user_id, dealer_contact_id, first_name, last_name, email, phone, dni, nif_cif, address } = body;

    if (!user_id && !dealer_contact_id) {
      return NextResponse.json({ error: "user_id o dealer_contact_id requerido" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    if (user_id) {
      // Registered user — update users table (nif_cif is stored as dni)
      const { error } = await adminClient
        .from("users")
        .update({ first_name, last_name, email, phone, dni: dni ?? nif_cif, address })
        .eq("id", user_id);

      if (error) {
        return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 });
      }
    } else {
      // Manual contact — update dealer_contacts table
      const { error } = await adminClient
        .from("dealer_contacts")
        .update({ first_name, last_name, email, phone, nif_cif, address })
        .eq("id", dealer_contact_id);

      if (error) {
        return NextResponse.json({ error: "Error al actualizar contacto" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
