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
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const adminClient = createAdminClient();

    // Join appointments to get budget_url for budget_sent notifications
    const { data: notifications } = await adminClient
      .from("notifications")
      .select("*, appointment:appointments(budget_url, budget_amount, locator, repair_acceptance_token, dealership:dealerships(name))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ notifications: notifications || [] });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
