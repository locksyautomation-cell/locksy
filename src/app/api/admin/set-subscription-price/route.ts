import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPriceChangeEmail } from "@/lib/utils/email";

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const adminClient = createAdminClient();
  const { data } = await adminClient.from("users").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { dealer_id, amount_eur } = await request.json();
  if (!dealer_id) {
    return NextResponse.json({ error: "dealer_id es obligatorio" }, { status: 400 });
  }
  if (!amount_eur || isNaN(parseFloat(amount_eur)) || parseFloat(amount_eur) <= 0) {
    return NextResponse.json({ error: "Importe inválido" }, { status: 400 });
  }

  const amountCents = Math.round(parseFloat(amount_eur) * 100);
  const adminClient = createAdminClient();

  // 1. Guardar en Supabase
  const { error } = await adminClient.from("locksy_config").upsert(
    { key: `sub_price_cents_${dealer_id}`, value: String(amountCents) },
    { onConflict: "key" }
  );

  if (error) {
    console.error("set-subscription-price DB error:", error);
    return NextResponse.json({ error: "Error al guardar el precio." }, { status: 500 });
  }

  // 2. Obtener datos del concesionario para email + Stripe
  const { data: dealer } = await adminClient
    .from("dealerships")
    .select("name, email, stripe_subscription_id, subscription_status")
    .eq("id", dealer_id)
    .single();

  // 3. Guardar aviso de cambio pendiente de confirmación por el concesionario
  if (dealer?.subscription_status && ["active", "canceling", "past_due"].includes(dealer.subscription_status)) {
    await adminClient.from("locksy_config").upsert(
      { key: `sub_price_change_pending_${dealer_id}`, value: String(amountCents) },
      { onConflict: "key" }
    );
    // Enviar email al concesionario
    if (dealer.email) {
      await sendPriceChangeEmail(dealer.email, dealer.name ?? "", amountCents / 100).catch((e) =>
        console.warn("sendPriceChangeEmail error:", e)
      );
    }
  }

  // 4. Si hay suscripción activa en Stripe, actualizar el precio para el próximo ciclo
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && !stripeKey.startsWith("your_")) {
    try {

      if (dealer?.stripe_subscription_id) {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });

        const sub = await stripe.subscriptions.retrieve(dealer.stripe_subscription_id);
        const itemId = sub.items.data[0]?.id;

        if (itemId) {
          // Obtener o crear el producto de suscripción
          const products = await stripe.products.list({ limit: 100 });
          let product = products.data.find((p) => p.metadata?.locksy === "subscription");
          if (!product) {
            product = await stripe.products.create({
              name: "LOCKSY Suscripción Mensual",
              metadata: { locksy: "subscription" },
            });
          }

          // Crear nuevo precio con el importe actualizado
          const newPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: amountCents,
            currency: "eur",
            recurring: { interval: "month" },
          });

          // Actualizar el subscription item sin prorrateo (aplica desde el próximo ciclo)
          await stripe.subscriptions.update(dealer.stripe_subscription_id, {
            items: [{ id: itemId, price: newPrice.id }],
            proration_behavior: "none",
          });

          return NextResponse.json({ success: true, amount_cents: amountCents, stripe_updated: true });
        }
      }
    } catch (stripeErr) {
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      console.error("set-subscription-price Stripe error:", msg);
      // El precio en DB ya está guardado; devolver aviso pero no error fatal
      return NextResponse.json({ success: true, amount_cents: amountCents, stripe_warning: msg });
    }
  }

  return NextResponse.json({ success: true, amount_cents: amountCents });
}
