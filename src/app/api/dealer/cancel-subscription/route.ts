import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendSubscriptionCancelledEmail } from "@/lib/utils/email";

function stripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return !!key && !key.startsWith("your_");
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const adminClient = createAdminClient();

    const { data: dealer } = await adminClient
      .from("dealerships")
      .select("id, name, email, stripe_subscription_id, subscription_status, subscription_period_end")
      .eq("user_id", user.id)
      .single();

    if (!dealer) return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });

    // Mock mode — mark as canceling, keep period_end so access continues until then
    if (!stripeConfigured() || !dealer.stripe_subscription_id) {
      await adminClient
        .from("dealerships")
        .update({ subscription_status: "canceling" })
        .eq("id", dealer.id);
      if (dealer.email) {
        sendSubscriptionCancelledEmail(dealer.email, dealer.name ?? "", dealer.subscription_period_end ?? null).catch(() => {});
      }
      return NextResponse.json({ success: true, period_end: dealer.subscription_period_end });
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
    });

    const sub = await stripe.subscriptions.update(dealer.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // current_period_end may be at root level or inside billing_cycle_anchor depending on API version
    const rawEnd =
      (sub as unknown as Record<string, unknown>).current_period_end ??
      (sub as unknown as Record<string, unknown>).billing_cycle_anchor;
    const periodEnd = rawEnd
      ? new Date((rawEnd as number) * 1000).toISOString()
      : dealer.subscription_period_end;

    await adminClient
      .from("dealerships")
      .update({ subscription_status: "canceling", ...(periodEnd ? { subscription_period_end: periodEnd } : {}) })
      .eq("id", dealer.id);

    if (dealer.email) {
      sendSubscriptionCancelledEmail(dealer.email, dealer.name ?? "", periodEnd ?? null).catch(() => {});
    }

    return NextResponse.json({ success: true, period_end: periodEnd });
  } catch (err) {
    console.error("cancel-subscription error:", err);
    return NextResponse.json({ error: "Error al cancelar la suscripción" }, { status: 500 });
  }
}
