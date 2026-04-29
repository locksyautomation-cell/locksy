import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id, all } = await request.json();
    const adminClient = createAdminClient();

    if (all) {
      await adminClient
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .neq("type", "budget_sent")
        .eq("read", false);
    } else if (id) {
      await adminClient
        .from("notifications")
        .update({ read: true })
        .eq("id", id)
        .eq("user_id", user.id);
    } else {
      return NextResponse.json({ error: "id o all requerido" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
