import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { attachInvoicePDF } from "@/lib/utils/attach-invoice-pdf";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const adminClient = createAdminClient();

  // Verificar rol admin
  const { data: userData } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (userData as { role?: string } | null)?.role ?? user.user_metadata?.role;
  if (role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { invoice_id } = await request.json();
  if (!invoice_id) return NextResponse.json({ error: "invoice_id requerido" }, { status: 400 });

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
