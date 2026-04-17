import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    const role = userData?.role || (user.user_metadata?.role as string | undefined);
    if (role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const params = request.nextUrl.searchParams;
    const from = params.get("from");
    const to = params.get("to");

    const adminClient = createAdminClient();

    // Invoices in range, joined with dealership name
    let query = adminClient
      .from("locksy_invoices")
      .select("id, dealer_id, invoice_number, concept, amount, sent_at, created_at, file_url, dealerships(name)")
      .order("sent_at", { ascending: false });

    if (from) query = query.gte("sent_at", from);
    if (to) query = query.lte("sent_at", to);

    const { data: invoices, error } = await query;
    if (error) return NextResponse.json({ error: "Error al obtener facturas" }, { status: 500 });

    // Active subscriptions in period = unique dealers with a subscription invoice in that period
    const activeSubscriptions = new Set(
      (invoices || [])
        .filter((inv) => inv.concept?.toLowerCase().includes("suscripción"))
        .map((inv) => inv.dealer_id)
    ).size;

    const totalRevenue = (invoices || []).reduce((acc, inv) => acc + (inv.amount || 0), 0);

    return NextResponse.json({
      activeSubscriptions,
      invoices: invoices || [],
      totalRevenue,
    });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
