import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendSubscriptionReactivatedEmail } from "@/lib/utils/email";

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
    if (dealer.subscription_status !== "canceling") {
      return NextResponse.json({ error: "La suscripción no está en proceso de cancelación" }, { status: 400 });
    }

    // Mock mode — restore active, extend period_end by 1 month
    if (!stripeConfigured() || !dealer.stripe_subscription_id) {
      const newPeriodEnd = new Date();
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      await adminClient
        .from("dealerships")
        .update({ subscription_status: "active", subscription_period_end: newPeriodEnd.toISOString() })
        .eq("id", dealer.id);
      if (dealer.email) {
        sendSubscriptionReactivatedEmail(dealer.email, dealer.name ?? "").catch(() => {});
      }
      return NextResponse.json({ success: true });
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
    });

    await stripe.subscriptions.update(dealer.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    await adminClient
      .from("dealerships")
      .update({ subscription_status: "active" })
      .eq("id", dealer.id);

    if (dealer.email) {
      sendSubscriptionReactivatedEmail(dealer.email, dealer.name ?? "").catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("reactivate-subscription error:", err);
    return NextResponse.json({ error: "Error al reactivar la suscripción" }, { status: 500 });
  }
}
