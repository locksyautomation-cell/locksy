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

  const dealer_id = request.nextUrl.searchParams.get("dealer_id");
  if (!dealer_id) {
    return NextResponse.json({ error: "dealer_id es obligatorio" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("locksy_config")
    .select("value")
    .eq("key", `sub_price_cents_${dealer_id}`)
    .single();

  const amountCents = data?.value ? parseInt(data.value) : null;

  return NextResponse.json({
    amount_cents: amountCents,
    amount_eur: amountCents ? (amountCents / 100).toFixed(2) : null,
  });
}
