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
    const { data, error } = await adminClient
      .from("dealerships")
      .select("*, dealer_contacts(count)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Error al obtener concesionarios" }, { status: 500 });
    }

    const dealerships = (data || []).map((d) => ({
      ...d,
      client_count: (d.dealer_contacts as { count: number }[])?.[0]?.count ?? 0,
      dealer_contacts: undefined,
    }));

    return NextResponse.json({ dealerships });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
