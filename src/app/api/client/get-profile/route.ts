import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const [{ data: userData }, { data: vehicleData }, { data: dcData }] = await Promise.all([
      adminClient.from("users").select("*").eq("id", userId).single(),
      adminClient.from("vehicles").select("*").eq("client_id", userId).order("created_at", { ascending: false }),
      adminClient.from("dealership_clients").select("dealership:dealerships(*)").eq("client_id", userId).eq("active", true),
    ]);

    return NextResponse.json({ user: userData, vehicles: vehicleData || [], dealerships: dcData || [] });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
