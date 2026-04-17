import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    const role = userData?.role || (user.user_metadata?.role as string | undefined);
    if (role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const formData = await request.formData();
    const dealer_id = formData.get("dealer_id") as string;
    const concept = formData.get("concept") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const payment_url = (formData.get("payment_url") as string) || null;
    const file = formData.get("file") as File | null;

    if (!dealer_id || !concept) {
      return NextResponse.json({ error: "dealer_id y concepto son obligatorios" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    let file_url: string | null = null;

    if (file && file.size > 0) {
      const ext = file.name.split(".").pop();
      const path = `${dealer_id}/${Date.now()}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await adminClient.storage
        .from("locksy-invoices")
        .upload(path, buffer, { contentType: file.type, upsert: false });

      if (!uploadError) {
        const { data: { publicUrl } } = adminClient.storage
          .from("locksy-invoices")
          .getPublicUrl(path);
        file_url = publicUrl;
      }
    }

    // Save invoice record
    const { error: insertError } = await adminClient
      .from("locksy_invoices")
      .insert({
        dealer_id,
        concept,
        amount: isNaN(amount) ? null : amount,
        file_url,
        payment_url,
        sent_at: new Date().toISOString(),
      });

    if (insertError) {
      return NextResponse.json({ error: "Error al guardar la factura" }, { status: 500 });
    }

    // Get dealer's user_id for notification
    const { data: dealer } = await adminClient
      .from("dealerships")
      .select("user_id")
      .eq("id", dealer_id)
      .single();

    if (dealer?.user_id) {
      await adminClient.from("notifications").insert({
        user_id: dealer.user_id,
        type: "invoice",
        title: "Nueva factura de LOCKSY",
        message: `LOCKSY ha emitido una nueva factura: ${concept}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
