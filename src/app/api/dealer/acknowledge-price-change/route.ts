import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const adminClient = createAdminClient();

  const { data: dealer } = await adminClient
    .from("dealerships")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!dealer) return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });

  await adminClient
    .from("locksy_config")
    .delete()
    .eq("key", `sub_price_change_pending_${dealer.id}`);

  return NextResponse.json({ success: true });
}
