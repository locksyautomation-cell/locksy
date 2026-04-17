import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const q = request.nextUrl.searchParams.get("q")?.toLowerCase() || "";
    if (q.length < 2) return NextResponse.json({ registered: [], manual: [] });

    const adminClient = createAdminClient();

    const { data: dealership } = await adminClient
      .from("dealerships")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!dealership) return NextResponse.json({ registered: [], manual: [] });

    // Registered clients linked to this dealership
    const { data: dcData } = await adminClient
      .from("dealership_clients")
      .select("client:users(id, first_name, last_name, email, phone, dni, address)")
      .eq("dealership_id", dealership.id)
      .eq("active", true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registered = ((dcData || []).map((dc: any) => dc.client).filter(Boolean) as any[])
      .filter((c) => `${c.first_name || ""} ${c.last_name || ""} ${c.email || ""}`.toLowerCase().includes(q));

    // Manual contacts (no registered account)
    const { data: manualData } = await adminClient
      .from("dealer_contacts")
      .select("id, first_name, last_name, email, phone, nif_cif, address")
      .eq("dealership_id", dealership.id)
      .is("client_id", null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const manual = ((manualData || []) as any[])
      .filter((c) => `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase().includes(q));

    return NextResponse.json({ registered, manual });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
