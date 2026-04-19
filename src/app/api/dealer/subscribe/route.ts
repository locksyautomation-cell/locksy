import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateInvoicePDF } from "@/lib/utils/generate-invoice-pdf";

function stripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return !!key && !key.startsWith("your_");
}

function nextInvoiceNumber(counter: number): string {
  const year = new Date().getFullYear();
  return `LOCK-${year}-${String(counter).padStart(4, "0")}`;
}

async function buildAndSaveInvoice(
  adminClient: ReturnType<typeof createAdminClient>,
  dealerId: string,
  amountCents: number
): Promise<string> {
  // ── 1. Obtener datos de facturación del concesionario ──────────────────
  const { data: dealer } = await adminClient
    .from("dealerships")
    .select("billing_name, billing_nif_cif, billing_email, billing_address")
    .eq("id", dealerId)
    .single();

  // ── 2. Incrementar contador de facturas ────────────────────────────────
  const { data: counterRow } = await adminClient
    .from("locksy_config")
    .select("value")
    .eq("key", "invoice_counter")
    .single();

  const nextCounter = (parseInt(counterRow?.value ?? "0") || 0) + 1;
  await adminClient
    .from("locksy_config")
    .upsert({ key: "invoice_counter", value: String(nextCounter) });

  const invoiceNumber = nextInvoiceNumber(nextCounter);

  // ── 3. Datos del concepto ──────────────────────────────────────────────
  const now = new Date();
  const monthName = now.toLocaleString("es-ES", { month: "long", year: "numeric" });
  const concept = `Suscripción mensual LOCKSY — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;

  // ── 4. Generar PDF ─────────────────────────────────────────────────────
  const pdfBuffer = await generateInvoicePDF({
    issuerName: process.env.LOCKSY_ISSUER_NAME ?? "LOCKSY",
    issuerNif: process.env.LOCKSY_ISSUER_NIF ?? "",
    issuerAddress: process.env.LOCKSY_ISSUER_ADDRESS ?? "",
    issuerEmail: process.env.LOCKSY_ISSUER_EMAIL ?? "noreply@locksy-at.es",
    recipientName: dealer?.billing_name ?? "",
    recipientNif: dealer?.billing_nif_cif ?? "",
    recipientAddress: dealer?.billing_address ?? "",
    recipientEmail: dealer?.billing_email ?? "",
    invoiceNumber,
    date: now,
    concept,
    baseAmount: amountCents / 100,
    ivaPercent: 21,
  });

  // ── 5. Subir PDF a Supabase Storage ────────────────────────────────────
  const fileName = `${invoiceNumber}.pdf`;
  let fileUrl: string | null = null;

  const { error: uploadError } = await adminClient.storage
    .from("locksy-invoices")
    .upload(fileName, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (!uploadError) {
    const { data: urlData } = adminClient.storage
      .from("locksy-invoices")
      .getPublicUrl(fileName);
    fileUrl = urlData?.publicUrl ?? null;
  } else {
    console.warn("Storage upload error (locksy-invoices bucket may not exist):", uploadError.message);
  }

  // ── 6. Insertar registro en locksy_invoices ────────────────────────────
  await adminClient.from("locksy_invoices").insert({
    dealer_id: dealerId,
    invoice_number: invoiceNumber,
    concept,
    amount: amountCents / 100,
    file_url: fileUrl,
    sent_at: now.toISOString(),
  });

  return invoiceNumber;
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const adminClient = createAdminClient();

  const { data: dealerRaw, error: dealerError } = await adminClient
    .from("dealerships")
    .select(
      "id, name, email, stripe_customer_id, subscription_status, stripe_subscription_id, " +
      "billing_name, billing_nif_cif, billing_email, billing_phone, billing_address"
    )
    .eq("user_id", user.id)
    .single();

  const dealer = dealerRaw as {
    id: string; name: string; email: string;
    stripe_customer_id: string | null; subscription_status: string | null;
    stripe_subscription_id: string | null;
    billing_name: string | null; billing_nif_cif: string | null;
    billing_email: string | null; billing_phone: string | null;
    billing_address: string | null;
  } | null;

  if (dealerError || !dealer) {
    return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });
  }

  // ── Validar datos de facturación ───────────────────────────────────────
  const missingBilling =
    !dealer.billing_name ||
    !dealer.billing_nif_cif ||
    !dealer.billing_email ||
    !dealer.billing_phone ||
    !dealer.billing_address;

  if (missingBilling) {
    return NextResponse.json(
      { error: "Completa todos los datos de facturación antes de activar la suscripción." },
      { status: 400 }
    );
  }

  if (dealer.subscription_status === "active") {
    return NextResponse.json({ error: "La suscripción ya está activa" }, { status: 400 });
  }

  const { data: priceConfig, error: priceError } = await adminClient
    .from("locksy_config")
    .select("value")
    .eq("key", `sub_price_cents_${dealer.id}`)
    .single();

  if (priceError || !priceConfig?.value) {
    return NextResponse.json({
      error: priceError
        ? "Tabla locksy_config no encontrada. Ejecuta: CREATE TABLE IF NOT EXISTS public.locksy_config (key text PRIMARY KEY, value text);"
        : "El administrador aún no ha configurado el precio de suscripción",
    }, { status: 400 });
  }

  const amountCents = parseInt(priceConfig.value);
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // ── Mock mode ──────────────────────────────────────────────────────────
  if (!stripeConfigured()) {
    await adminClient
      .from("dealerships")
      .update({
        subscription_status: "active",
        subscription_period_end: periodEnd.toISOString(),
      })
      .eq("id", dealer.id);

    await buildAndSaveInvoice(adminClient, dealer.id, amountCents);

    return NextResponse.json({ mockMode: true });
  }

  // ── Stripe mode ────────────────────────────────────────────────────────
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
    });

    let customerId = dealer.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dealer.email,
        name: dealer.name,
        metadata: { dealership_id: dealer.id },
      });
      customerId = customer.id;
      await adminClient
        .from("dealerships")
        .update({ stripe_customer_id: customerId })
        .eq("id", dealer.id);
    }

    const products = await stripe.products.list({ limit: 100 });
    let product = products.data.find((p) => p.metadata?.locksy === "subscription");
    if (!product) {
      product = await stripe.products.create({
        name: "LOCKSY Suscripción Mensual",
        metadata: { locksy: "subscription" },
      });
    }

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amountCents,
      currency: "eur",
      recurring: { interval: "month" },
      metadata: { dealer_id: dealer.id },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: price.id, quantity: 1 }],
      mode: "subscription",
      success_url: `${appUrl}/dealer/perfil/pagos?subscription=success`,
      cancel_url: `${appUrl}/dealer/perfil/pagos`,
      automatic_tax: { enabled: true },
      customer_update: { address: "auto" },
      subscription_data: {
        metadata: { dealership_id: dealer.id },
      },
      metadata: { dealership_id: dealer.id },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("subscribe error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
