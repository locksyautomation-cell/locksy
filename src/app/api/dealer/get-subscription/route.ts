import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const adminClient = createAdminClient();

    const { data: dealer } = await adminClient
      .from("dealerships")
      .select("id, subscription_status, stripe_subscription_id, stripe_customer_id, subscription_period_end")
      .eq("user_id", user.id)
      .single();

    if (!dealer) return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });

    const { data: configs } = await adminClient
      .from("locksy_config")
      .select("key, value")
      .in("key", [`sub_price_cents_${dealer.id}`, `sub_price_change_pending_${dealer.id}`]);

    const configMap = Object.fromEntries((configs || []).map((c) => [c.key, c.value]));
    const amountCents = configMap[`sub_price_cents_${dealer.id}`]
      ? parseInt(configMap[`sub_price_cents_${dealer.id}`])
      : null;
    const pendingPriceCents = configMap[`sub_price_change_pending_${dealer.id}`]
      ? parseInt(configMap[`sub_price_change_pending_${dealer.id}`])
      : null;

    let daysRemaining: number | null = null;
    if (dealer.subscription_period_end) {
      const diff = new Date(dealer.subscription_period_end).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      subscription_status: dealer.subscription_status || "inactive",
      stripe_subscription_id: dealer.stripe_subscription_id || null,
      amount_eur: amountCents ? (amountCents / 100).toFixed(2) : null,
      period_end: dealer.subscription_period_end || null,
      days_remaining: daysRemaining,
      pending_price_eur: pendingPriceCents ? (pendingPriceCents / 100).toFixed(2) : null,
    });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
