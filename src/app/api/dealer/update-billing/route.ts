import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: ds } = await adminClient
    .from("dealerships")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!ds) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { iban, billing_name, billing_nif_cif, billing_email, billing_phone, billing_address } =
    await request.json();

  if (!iban || !String(iban).trim()) {
    return NextResponse.json({ error: "El IBAN es obligatorio" }, { status: 400 });
  }

  const { error } = await adminClient
    .from("dealerships")
    .update({ iban, billing_name, billing_nif_cif, billing_email, billing_phone, billing_address })
    .eq("id", ds.id);

  if (error) return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  return NextResponse.json({ success: true });
}
