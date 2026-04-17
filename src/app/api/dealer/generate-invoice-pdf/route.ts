import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { attachInvoicePDF } from "@/lib/utils/attach-invoice-pdf";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { invoice_id } = await request.json();
  if (!invoice_id) return NextResponse.json({ error: "invoice_id requerido" }, { status: 400 });

  const adminClient = createAdminClient();

  // Verificar que la factura pertenece al concesionario del usuario autenticado
  const { data: dealerRaw } = await adminClient
    .from("dealerships")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const dealer = dealerRaw as { id: string } | null;
  if (!dealer) return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });

  const { data: invCheck } = await adminClient
    .from("locksy_invoices")
    .select("id")
    .eq("id", invoice_id)
    .eq("dealer_id", dealer.id)
    .single();

  if (!invCheck) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });

  try {
    const fileUrl = await attachInvoicePDF(adminClient, invoice_id);
    if (!fileUrl) {
      return NextResponse.json(
        { error: "Error al subir el PDF. Verifica que el bucket 'locksy-invoices' existe en Supabase Storage." },
        { status: 500 }
      );
    }
    return NextResponse.json({ fileUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
