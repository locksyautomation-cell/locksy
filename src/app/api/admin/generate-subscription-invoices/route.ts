/**
 * POST /api/admin/generate-subscription-invoices
 * Genera facturas PDF para todas las suscripciones activas que no tienen
 * factura con PDF en el mes en curso. Usar solo desde el panel admin.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvoicePDF } from "@/lib/utils/generate-invoice-pdf";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (userData?.role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const adminClient = createAdminClient();

    // 1. Todas las suscripciones activas
    const { data: dealers, error: dealersError } = await adminClient
      .from("dealerships")
      .select("id, billing_name, billing_nif_cif, billing_email, billing_address")
      .in("subscription_status", ["active", "canceling"]);

    if (dealersError) return NextResponse.json({ error: dealersError.message }, { status: 500 });
    if (!dealers || dealers.length === 0) return NextResponse.json({ generated: 0 });

    // 2. Obtener precio de cada concesionario desde locksy_config
    const { data: configs } = await adminClient
      .from("locksy_config")
      .select("key, value")
      .like("key", "sub_price_cents_%");

    const priceMap = new Map<string, number>();
    for (const c of configs || []) {
      const dealerId = c.key.replace("sub_price_cents_", "");
      priceMap.set(dealerId, parseInt(c.value) || 0);
    }

    // 3. Inicio del mes actual para detectar facturas existentes
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const now = new Date();
    const year = now.getFullYear();
    const monthName = now.toLocaleString("es-ES", { month: "long", year: "numeric" });
    const concept = `Suscripción mensual LOCKSY — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;

    let generated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const dealer of dealers) {
      try {
        // Comprobar si ya tiene factura con PDF este mes
        const { data: existing } = await adminClient
          .from("locksy_invoices")
          .select("id, file_url")
          .eq("dealer_id", dealer.id)
          .gte("sent_at", startOfMonth.toISOString())
          .order("sent_at", { ascending: false })
          .limit(1)
          .single();

        if (existing?.file_url) { skipped++; continue; }

        // Obtener siguiente número de factura
        const { data: counterRow } = await adminClient
          .from("locksy_config")
          .select("value")
          .eq("key", "invoice_counter")
          .single();
        const nextCounter = (parseInt(counterRow?.value ?? "0") || 0) + 1;
        await adminClient.from("locksy_config").upsert({ key: "invoice_counter", value: String(nextCounter) });
        const invoiceNumber = `LOCK-${year}-${String(nextCounter).padStart(4, "0")}`;

        const amountCents = priceMap.get(dealer.id) ?? 0;

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

        // Subir PDF
        let fileUrl: string | null = null;
        const fileName = `${invoiceNumber}.pdf`;
        const { error: uploadError } = await adminClient.storage
          .from("locksy-invoices")
          .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

        if (!uploadError) {
          const { data: urlData } = adminClient.storage.from("locksy-invoices").getPublicUrl(fileName);
          fileUrl = urlData?.publicUrl ?? null;
        }

        // Insertar o actualizar registro
        if (existing?.id) {
          await adminClient.from("locksy_invoices")
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

        generated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${dealer.id}: ${msg}`);
      }
    }

    return NextResponse.json({ generated, skipped, errors });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
