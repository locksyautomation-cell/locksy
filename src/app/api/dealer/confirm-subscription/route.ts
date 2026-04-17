/**
 * Llamado desde la UI después de que Stripe confirma el pago.
 * Genera la factura PDF y la adjunta al registro de locksy_invoices.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateInvoicePDF } from "@/lib/utils/generate-invoice-pdf";

function nextInvoiceNumber(counter: number): string {
  const year = new Date().getFullYear();
  return `LOCK-${year}-${String(counter).padStart(4, "0")}`;
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const adminClient = createAdminClient();

  // Obtener concesionario y verificar que la suscripción está activa
  const { data: dealerRaw, error: dealerError } = await adminClient
    .from("dealerships")
    .select(
      "id, subscription_status, billing_name, billing_nif_cif, billing_email, billing_phone, billing_address"
    )
    .eq("user_id", user.id)
    .single();

  const dealer = dealerRaw as {
    id: string; subscription_status: string | null;
    billing_name: string | null; billing_nif_cif: string | null;
    billing_email: string | null; billing_phone: string | null;
    billing_address: string | null;
  } | null;

  if (dealerError || !dealer) {
    return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });
  }

  if (dealer.subscription_status !== "active") {
    return NextResponse.json({ error: "La suscripción no está activa" }, { status: 400 });
  }

  // Verificar si ya tiene factura este mes (evitar duplicados)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: existing } = await adminClient
    .from("locksy_invoices")
    .select("id, invoice_number, file_url")
    .eq("dealer_id", dealer.id)
    .gte("sent_at", startOfMonth.toISOString())
    .order("sent_at", { ascending: false })
    .limit(1)
    .single();

  // Si ya existe factura con PDF este mes, no duplicar
  if (existing?.file_url) {
    return NextResponse.json({ invoiceNumber: existing.invoice_number, alreadyExists: true });
  }

  // Obtener precio desde locksy_config
  const { data: priceConfig } = await adminClient
    .from("locksy_config")
    .select("value")
    .eq("key", `sub_price_cents_${dealer.id}`)
    .single();

  const amountCents = parseInt(priceConfig?.value ?? "0") || 0;

  // Incrementar contador
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

  const now = new Date();
  const monthName = now.toLocaleString("es-ES", { month: "long", year: "numeric" });
  const concept = `Suscripción mensual LOCKSY — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;

  // Generar PDF
  const pdfBuffer = await generateInvoicePDF({
    issuerName: process.env.LOCKSY_ISSUER_NAME ?? "LOCKSY",
    issuerNif: process.env.LOCKSY_ISSUER_NIF ?? "",
    issuerAddress: process.env.LOCKSY_ISSUER_ADDRESS ?? "",
    issuerEmail: process.env.LOCKSY_ISSUER_EMAIL ?? "noreply@locksy-at.es",
    recipientName: dealer.billing_name ?? "",
    recipientNif: dealer.billing_nif_cif ?? "",
    recipientAddress: dealer.billing_address ?? "",
    recipientEmail: dealer.billing_email ?? "",
    invoiceNumber,
    date: now,
    concept,
    baseAmount: amountCents / 100,
    ivaPercent: 21,
  });

  // Subir a Storage
  const fileName = `${invoiceNumber}.pdf`;
  let fileUrl: string | null = null;

  const { error: uploadError } = await adminClient.storage
    .from("locksy-invoices")
    .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

  if (!uploadError) {
    const { data: urlData } = adminClient.storage.from("locksy-invoices").getPublicUrl(fileName);
    fileUrl = urlData?.publicUrl ?? null;
  } else {
    console.warn("Storage upload error:", uploadError.message);
  }

  // Si ya existía el registro sin PDF, actualizarlo; si no, insertar
  if (existing?.id) {
    await adminClient
      .from("locksy_invoices")
      .update({ invoice_number: invoiceNumber, file_url: fileUrl })
      .eq("id", existing.id);
  } else {
    await adminClient.from("locksy_invoices").insert({
      dealer_id: dealer.id,
      invoice_number: invoiceNumber,
      concept,
      amount: amountCents / 100,
      file_url: fileUrl,
      sent_at: now.toISOString(),
    });
  }

  return NextResponse.json({ invoiceNumber, fileUrl });
}
