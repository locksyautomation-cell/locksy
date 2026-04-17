import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
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
    const { user_id, contact_id } = body;

    if (!user_id && !contact_id) {
      return NextResponse.json({ error: "user_id o contact_id requerido" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    if (contact_id) {
      // Manual contact — delete from dealer_contacts (cascades to vehicles and appointments)
      const { error } = await adminClient
        .from("dealer_contacts")
        .delete()
        .eq("id", contact_id)
        .is("client_id", null); // safety: never delete a contact linked to a real user

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Registered user — delete from Supabase Auth (cascades to public.users etc.)
      const { error } = await adminClient.auth.admin.deleteUser(user_id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
