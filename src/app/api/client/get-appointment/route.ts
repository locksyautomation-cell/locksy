import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    let userId: string | null = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id ?? null;
    }
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const adminClient = createAdminClient();

    const [{ data: appointment }, { data: attachments }] = await Promise.all([
      adminClient
        .from("appointments")
        .select("*, vehicle:vehicles(*), dealership:dealerships(name, address, phone, email), client:users(first_name, last_name, email, phone, dni, address)")
        .eq("id", id)
        .eq("client_id", userId)
        .single(),
      adminClient
        .from("attachments")
        .select("*")
        .eq("appointment_id", id)
        .order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({ appointment, attachments: attachments || [] });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
