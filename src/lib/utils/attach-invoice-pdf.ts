/**
 * Genera el PDF de una factura ya existente en locksy_invoices y guarda
 * el resultado en Supabase Storage, actualizando file_url en el registro.
 * Devuelve la URL pública del PDF, o null si el upload falla.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvoicePDF } from "@/lib/utils/generate-invoice-pdf";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function attachInvoicePDF(
  adminClient: AdminClient,
  invoiceId: string
): Promise<string | null> {
  // ── 1. Obtener factura + datos de facturación del concesionario ──────────
  const { data: inv, error: invErr } = await adminClient
    .from("locksy_invoices")
    .select("id, dealer_id, invoice_number, concept, amount, sent_at, created_at")
    .eq("id", invoiceId)
    .single();

  if (invErr || !inv) throw new Error("Factura no encontrada");

  const invoiceRow = inv as {
    id: string; dealer_id: string; invoice_number: string | null;
    concept: string; amount: number | null;
    sent_at: string | null; created_at: string;
  };

  const { data: dealerRaw } = await adminClient
    .from("dealerships")
    .select("billing_name, billing_nif_cif, billing_email, billing_address")
    .eq("id", invoiceRow.dealer_id)
    .single();

  const dealer = dealerRaw as {
    billing_name: string | null; billing_nif_cif: string | null;
    billing_email: string | null; billing_address: string | null;
  } | null;

  // ── 2. Número de factura: usar el existente o generar uno temporal ───────
  const invoiceNumber =
    invoiceRow.invoice_number ??
    `LOCK-${new Date(invoiceRow.sent_at ?? invoiceRow.created_at).getFullYear()}-XXXX`;

  const baseAmount = invoiceRow.amount ?? 0;
  const invoiceDate = new Date(invoiceRow.sent_at ?? invoiceRow.created_at);

  // ── 3. Leer configuración del emisor desde BD ────────────────────────────
  const issuerKeys = ["issuer_name", "issuer_nif", "issuer_address", "issuer_email"];
  const { data: configRows } = await adminClient
    .from("locksy_config")
    .select("key, value")
    .in("key", issuerKeys);

  const cfg: Record<string, string> = {
    issuer_name: process.env.LOCKSY_ISSUER_NAME ?? "LOCKSY",
    issuer_nif: process.env.LOCKSY_ISSUER_NIF ?? "",
    issuer_address: process.env.LOCKSY_ISSUER_ADDRESS ?? "",
    issuer_email: process.env.LOCKSY_ISSUER_EMAIL ?? "noreply@locksy-at.es",
  };
  for (const row of configRows ?? []) {
    if (row.value) cfg[row.key] = row.value;
  }

  // ── 4. Generar PDF ─────────────────────────────────────────────────────
  const pdfBuffer = await generateInvoicePDF({
    issuerName: cfg.issuer_name,
    issuerNif: cfg.issuer_nif,
    issuerAddress: cfg.issuer_address,
    issuerEmail: cfg.issuer_email,
    recipientName: dealer?.billing_name ?? "",
    recipientNif: dealer?.billing_nif_cif ?? "",
    recipientAddress: dealer?.billing_address ?? "",
    recipientEmail: dealer?.billing_email ?? "",
    invoiceNumber,
    date: invoiceDate,
    concept: invoiceRow.concept,
    baseAmount,
    ivaPercent: 21,
  });

  // ── 5. Subir a Storage ──────────────────────────────────────────────────
  const fileName = `${invoiceNumber}.pdf`;
  const { error: uploadError } = await adminClient.storage
    .from("locksy-invoices")
    .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    console.error("Storage upload failed:", uploadError.message);
    return null;
  }

  const { data: urlData } = adminClient.storage
    .from("locksy-invoices")
    .getPublicUrl(fileName);

  // Append cache-bust param so browsers/CDN don't serve the stale version
  const fileUrl = urlData?.publicUrl
    ? `${urlData.publicUrl}?t=${Date.now()}`
    : null;

  // ── 5. Actualizar file_url en la BD ─────────────────────────────────────
  if (fileUrl) {
    await adminClient
      .from("locksy_invoices")
      .update({ file_url: fileUrl })
      .eq("id", invoiceId);
  }

  return fileUrl;
}
