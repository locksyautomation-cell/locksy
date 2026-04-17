import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const adminClient = createAdminClient();
  const { data } = await adminClient.from("users").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

export async function PUT(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const id = formData.get("id") as string;
  const concept = formData.get("concept") as string;
  const amount = formData.get("amount") as string;
  const payment_url = (formData.get("payment_url") as string) || null;
  const file = formData.get("file") as File | null;

  if (!id || !concept) {
    return NextResponse.json({ error: "id y concepto son obligatorios" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const updates: Record<string, unknown> = {
    concept,
    amount: amount ? parseFloat(amount) : null,
    payment_url,
  };

  if (file && file.size > 0) {
    // Fetch current record to get dealer_id for path
    const { data: inv } = await adminClient
      .from("locksy_invoices")
      .select("dealer_id")
      .eq("id", id)
      .single();

    if (inv) {
      const ext = file.name.split(".").pop();
      const path = `${inv.dealer_id}/${Date.now()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await adminClient.storage
        .from("locksy-invoices")
        .upload(path, buffer, { contentType: file.type, upsert: false });

      if (!uploadError) {
        const { data: { publicUrl } } = adminClient.storage
          .from("locksy-invoices")
          .getPublicUrl(path);
        updates.file_url = publicUrl;
      }
    }
  }

  const { error } = await adminClient
    .from("locksy_invoices")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  return NextResponse.json({ success: true });
}
