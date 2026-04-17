import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const adminClient = createAdminClient();
  const { data } = await adminClient.from("users").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const adminClient = createAdminClient();

  const [dealershipRes, invoicesRes] = await Promise.all([
    adminClient.from("dealerships").select("*").eq("id", id).single(),
    adminClient.from("locksy_invoices").select("*").eq("dealer_id", id).order("created_at", { ascending: false }),
  ]);

  if (dealershipRes.error || !dealershipRes.data) {
    return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    dealership: dealershipRes.data,
    invoices: invoicesRes.data || [],
  });
}
